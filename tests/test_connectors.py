"""Synthetic, network-free connector/profile and incomplete-snapshot tests."""

import json
from email.message import Message
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from urllib.error import HTTPError, URLError
import socket
import ssl
from unittest.mock import Mock, patch

from config import SETTING_NAMES
from costs import count_tokens, estimate_cost
from embeddings import OpenRouterEmbeddingProvider
from embeddings import EmbeddingResult
from local_control import LocalController, save_settings, ConfigurationError
from papers_source import PapersClient, PapersSource, PapersError, _NoRedirect
from profiles import select_profile, use_profile, profile_path, CURRENT
import pipeline


def settings(**overrides):
    return {**dict.fromkeys(SETTING_NAMES, ""), "ZOTERO_LIBRARY_ID": "123",
            "ZOTERO_LIBRARY_TYPE": "user", "ZOTERO_API_KEY": "synthetic-zotero",
            "PAPERS_EMAIL": "synthetic@example.invalid", "PAPERS_COLLECTION_ID": "collection-a", **overrides}


def item(key, title="Synthetic title", abstract="Synthetic abstract"):
    return dict(id=key, article=dict(title=title, abstract=abstract, authors=["Synthetic author"], year=2026))


class PapersTests(unittest.TestCase):
    def client(self, *pages):
        client = PapersClient()
        client._get = Mock(side_effect=pages)
        return client

    def test_complete_pagination_and_encoded_cursor(self):
        client = self.client(dict(status="ok", total=2, items=[item("1")], scroll_id="opaque&cursor"),
                             dict(status="ok", total=2, items=[item("2")]))
        self.assertEqual([r["id"] for r in client.read_collection("c/1")], ["1", "2"])
        self.assertEqual(client._get.call_args.args[0], "/collections/c%2F1/items")
        self.assertEqual(client._get.call_args.args[1]["scroll_id"], "opaque&cursor")

    def test_incomplete_or_changing_snapshots_fail_closed(self):
        cases = [
            [dict(total=2, items=[item("1")])],
            [dict(total=1, items=[])],
            [dict(items=[item("1")])],
            [dict(total=1, items=[{}])],
            [dict(total=2, items=[item("1")], scroll_id="x"), dict(total=3, items=[item("2")])],
            [dict(total=2, items=[item("1")], scroll_id="x"), dict(total=2, items=[item("1")])],
            [dict(total=3, items=[item("1")], scroll_id="x"), dict(total=3, items=[item("2")], scroll_id="x")],
        ]
        for pages in cases:
            with self.subTest(pages=pages), self.assertRaises(PapersError):
                self.client(*pages).read_collection("c")

    def test_verified_empty_collection_is_not_an_error(self):
        self.assertEqual(self.client(dict(total=0, items=[])).read_collection("c"), [])

    def test_normalization_matches_zotero_semantic_text(self):
        client = Mock()
        client.read_collection.return_value = [item("a", " Title ", " Abstract "), item("b", "  "), item("c", "Only title", None)]
        papers, version = PapersSource(client, "c").fetch_all()
        self.assertEqual([p.key for p in papers], ["a", "c"])
        self.assertEqual(papers[0].combined_text(), "Title\n\nAbstract")
        self.assertEqual(papers[1].combined_text(), "Only title")
        self.assertEqual(version, 0)

    def test_application_error_does_not_become_empty_library(self):
        client = PapersClient(); client._cookie = "synthetic"
        client._open = Mock(return_value=({}, b'{"status":"error","message":"private response"}'))
        with self.assertRaises(PapersError) as caught:
            client.collections()
        self.assertNotIn("private response", str(caught.exception))

    def test_collection_list_uses_verified_services_endpoint_without_redirect(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        response = Mock()
        response.read.return_value = b'{"status":"ok","collections":[{"id":"a","name":"Synthetic"}]}'
        response.headers = Message()
        client._opener = Mock()
        client._opener.open.return_value.__enter__ = Mock(return_value=response)
        client._opener.open.return_value.__exit__ = Mock(return_value=False)
        self.assertEqual(client.collections(), [dict(id="a", name="Synthetic")])
        request = client._opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "https://services.readcube.com/collections")
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.get_header("Cookie"), "synthetic-cookie")
        self.assertEqual(client._opener.open.call_count, 1)

    def test_current_collection_contract_needs_no_legacy_status_marker(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        client._open = Mock(return_value=(Message(), json.dumps({"collections": [
            {"id": "a", "name": "Synthetic A"}, {"collection_id": "b", "name": "Synthetic B"}]}).encode()))
        self.assertEqual(client.collections(), [dict(id="a", name="Synthetic A"), dict(id="b", name="Synthetic B")])

    def test_current_item_pages_need_no_legacy_status_marker(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        client._open = Mock(side_effect=[
            (Message(), json.dumps(dict(total=2, items=[item("a")], scroll_id="next")).encode()),
            (Message(), json.dumps(dict(total=2, items=[item("b")])).encode()),
        ])
        self.assertEqual([record["id"] for record in client.read_collection("c")], ["a", "b"])

    def test_error_flags_or_missing_data_never_become_empty_collections(self):
        for value in ({}, [], {"status": "error", "collections": []},
                      {"error": "private error text", "collections": []},
                      {"errors": ["private error text"], "collections": []},
                      {"success": False, "collections": []},
                      {"private arbitrary key": "private value", "status": "private status"},
                      {"collections": None}):
            with self.subTest(value=value):
                client = PapersClient(); client._cookie = "synthetic-cookie"
                client._open = Mock(return_value=(Message(), json.dumps(value).encode()))
                with self.assertRaises(PapersError) as caught:
                    client.collections()
                self.assertNotIn("private", str(caught.exception))

    def test_valid_empty_collections_are_explicit_not_defaulted(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        client._open = Mock(return_value=(Message(), b'{"collections":[]}'))
        self.assertEqual(client.collections(), [])

    def test_invalid_collection_identities_and_names_are_rejected(self):
        for rows in ([{}], [{"id": {"private": "value"}}], [{"id": True}],
                     [{"id": "a", "name": ["private title"]}], [{"id": "a"}, {"collection_id": "a"}]):
            with self.subTest(rows=rows):
                client = PapersClient(); client._cookie = "synthetic-cookie"
                client._open = Mock(return_value=(Message(), json.dumps({"collections": rows}).encode()))
                with self.assertRaises(PapersError) as caught:
                    client.collections()
                self.assertNotIn("private", str(caught.exception))

    def test_statusless_item_page_still_requires_a_verified_total(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        client._open = Mock(return_value=(Message(), b'{"items":[]}'))
        with self.assertRaisesRegex(PapersError, "PAPERS_SCHEMA"):
            client.read_collection("c")

    def test_item_reads_keep_the_existing_sync_endpoint(self):
        client = PapersClient(); client._cookie = "synthetic-cookie"
        client._open = Mock(return_value=(Message(), b'{"status":"ok","total":0,"items":[]}'))
        self.assertEqual(client.read_collection("synthetic-collection"), [])
        self.assertEqual(client._open.call_args.args[0],
                         "https://sync.readcube.com/collections/synthetic-collection/items?size=50")

    def test_metadata_posts_and_unapproved_hosts_are_rejected(self):
        client = PapersClient(); client._opener = Mock()
        for url, data in [(client.COLLECTIONS, b"must-not-be-sent"),
                          (client.BASE + "/collections/a/items", b"must-not-be-sent"),
                          ("https://services.readcube.com.untrusted.invalid/collections", None),
                          ("http://services.readcube.com/collections", None)]:
            with self.subTest(url=url), self.assertRaises(PapersError):
                client._open(url, data)
        client._opener.open.assert_not_called()

    def test_http_authentication_failure_clears_the_session(self):
        client = PapersClient(); client._cookie = "synthetic"
        client._opener = Mock()
        client._opener.open.side_effect = HTTPError(client.BASE + "/collections/", 401, "private response", {}, None)
        with self.assertRaises(PapersError) as caught:
            client.collections()
        self.assertFalse(client.authenticated)
        self.assertNotIn("private response", str(caught.exception))

    def test_login_verifies_authenticated_collection_read_and_keeps_no_password(self):
        headers = Mock(); headers.get_all.return_value = ["session=synthetic-cookie; Secure; HttpOnly"]
        client = PapersClient()
        client._open = Mock(return_value=(headers, b"{}"))
        client.collections = Mock(return_value=[dict(id="a", name="Synthetic")])
        self.assertEqual(client.login("test@example.invalid", "synthetic-password")[0]["id"], "a")
        client.collections.assert_called_once()
        self.assertNotIn("synthetic-cookie", repr(client))
        self.assertFalse(hasattr(client, "password"))

    def test_login_failure_identifies_stage_without_private_response(self):
        client = PapersClient()
        client._opener = Mock()
        client._opener.open.side_effect = HTTPError(client.LOGIN, 403, "private response", {}, None)
        with self.assertRaisesRegex(PapersError, r"\[PAPERS_LOGIN\].*HTTP 403") as caught:
            client.login("synthetic@example.invalid", "synthetic-password")
        self.assertNotIn("private response", str(caught.exception))
        self.assertNotIn("synthetic-password", str(caught.exception))

    def test_login_redirect_cookie_is_verified_without_following_location(self):
        for code in (301, 302, 303, 307, 308):
            with self.subTest(code=code):
                headers = Message()
                headers.add_header("Set-Cookie", "session=synthetic-cookie; Secure; HttpOnly")
                headers.add_header("Location", "https://untrusted.invalid/private?token=secret")
                client = PapersClient(); client._opener = Mock()
                client._opener.open.side_effect = HTTPError(client.LOGIN, code, "Redirect", headers, None)
                client.collections = Mock(return_value=[dict(id="a", name="Synthetic")])
                self.assertEqual(client.login("synthetic@example.invalid", "synthetic-password")[0]["id"], "a")
                client.collections.assert_called_once()
                self.assertEqual(client._cookie, "session=synthetic-cookie")
                self.assertEqual(client._opener.open.call_count, 1)
                self.assertEqual(client._opener.open.call_args.args[0].full_url, client.LOGIN)

    def test_login_redirect_cookie_does_not_prove_authenticated_access(self):
        headers = Message(); headers.add_header("Set-Cookie", "session=synthetic-cookie")
        client = PapersClient(); client._opener = Mock()
        client._opener.open.side_effect = HTTPError(client.LOGIN, 302, "Redirect", headers, None)
        client.collections = Mock(side_effect=PapersError("Access refused."))
        with self.assertRaisesRegex(PapersError, r"\[PAPERS_COLLECTIONS\]"):
            client.login("synthetic@example.invalid", "synthetic-password")
        self.assertFalse(client.authenticated)

    def test_redirect_without_cookie_is_actionable_and_redacts_location(self):
        headers = Message(); headers.add_header("Location", "https://untrusted.invalid/private?token=secret")
        client = PapersClient(); client._opener = Mock()
        client._opener.open.side_effect = HTTPError(client.LOGIN, 302, "Redirect", headers, None)
        with self.assertRaisesRegex(PapersError, r"\[PAPERS_LOGIN\].*\[REDIRECT_HTTP_302\]") as caught:
            client.login("synthetic@example.invalid", "synthetic-password")
        self.assertNotIn("untrusted", str(caught.exception))
        self.assertNotIn("secret", str(caught.exception))
        self.assertFalse(client.authenticated)

    def test_collection_redirect_is_never_followed_even_with_cookie(self):
        headers = Message(); headers.add_header("Set-Cookie", "session=synthetic-cookie")
        client = PapersClient(); client._cookie = "existing-cookie"; client._opener = Mock()
        client._opener.open.side_effect = HTTPError(client.BASE + "/collections/", 302, "Redirect", headers, None)
        with self.assertRaisesRegex(PapersError, r"\[REDIRECT_HTTP_302\]"):
            client.collections()
        self.assertEqual(client._opener.open.call_count, 1)

    def test_redirect_handler_never_constructs_a_followup_request(self):
        for code in (301, 302, 303, 307, 308):
            self.assertIsNone(_NoRedirect().redirect_request(None, None, code, "Redirect", {}, "https://untrusted.invalid"))

    def test_collection_failure_is_not_reported_as_bad_password(self):
        headers = Mock(); headers.get_all.return_value = ["session=synthetic-cookie"]
        client = PapersClient()
        client._open = Mock(return_value=(headers, b"{}"))
        client.collections = Mock(side_effect=PapersError("Unsupported collection response."))
        with self.assertRaisesRegex(PapersError, r"\[PAPERS_COLLECTIONS\]"):
            client.login("synthetic@example.invalid", "synthetic-password")
        self.assertFalse(client.authenticated)

    def test_transport_failures_have_safe_distinct_codes(self):
        for reason, code in [(socket.gaierror("private DNS detail"), "DNS"),
                             (TimeoutError("private timeout detail"), "TIMEOUT"),
                             (ssl.SSLCertVerificationError("private TLS detail"), "TLS_CERTIFICATE")]:
            with self.subTest(code=code):
                client = PapersClient(); client._opener = Mock()
                client._opener.open.side_effect = URLError(reason)
                with self.assertRaises(PapersError) as caught:
                    client.login("synthetic@example.invalid", "synthetic-password")
                self.assertIn("[" + code + "]", str(caught.exception))
                self.assertNotIn("private", str(caught.exception))

    def test_read_failure_precedes_local_cache_or_embedding_creation(self):
        profile = select_profile(Path("/tmp/synthetic"), settings(LIBRARY_SOURCE="papers"), Mock())
        profile.papers_client.read_collection.side_effect = PapersError("Incomplete snapshot")
        with use_profile(profile), patch.object(pipeline, "migrate_local_data"), patch.object(pipeline, "_load_state", return_value={}), \
             patch.object(pipeline, "PaperStore") as store, patch.object(pipeline, "OpenAIEmbeddingProvider") as embedding:
            with self.assertRaises(PapersError): pipeline.sync_embeddings(verbose=False)
            store.assert_not_called(); embedding.assert_not_called()


class ProfileTests(unittest.TestCase):
    def test_legacy_is_untouched_and_other_combinations_are_isolated(self):
        root = Path("/tmp/synthetic")
        legacy = select_profile(root, settings())
        router = select_profile(root, settings(EMBEDDING_SERVICE="openrouter"))
        papers = select_profile(root, settings(LIBRARY_SOURCE="papers"))
        other = select_profile(root, settings(LIBRARY_SOURCE="papers", PAPERS_EMAIL="another@example.invalid"))
        self.assertEqual(legacy.data_dir, root / "data")
        self.assertEqual(len({p.data_dir for p in [legacy, router, papers, other]}), 4)
        with use_profile(papers):
            self.assertEqual(profile_path(root / "data/graph.json"), papers.data_dir / "graph.json")
        self.assertIsNone(CURRENT.get())

    def test_router_is_same_model_dimensions_and_semantic_tokenizer(self):
        with patch("embeddings.OpenAI") as constructor:
            constructor.return_value.embeddings.create.return_value = SimpleNamespace(
                data=[SimpleNamespace(index=0, embedding=[1.0] * 1536)], usage=SimpleNamespace(total_tokens=4))
            provider = OpenRouterEmbeddingProvider("synthetic-router-key")
            provider.embed_batch(["Title\n\nAbstract"])
        constructor.assert_called_once_with(api_key="synthetic-router-key", max_retries=6, base_url="https://openrouter.ai/api/v1")
        constructor.return_value.embeddings.create.assert_called_once_with(
            model="openai/text-embedding-3-small", input=["Title\n\nAbstract"], dimensions=1536)
        self.assertEqual(count_tokens("Title\n\nAbstract", provider.model_name), count_tokens("Title\n\nAbstract", "text-embedding-3-small"))
        self.assertIsNone(estimate_cost(10, "unknown-model"))

    def test_papers_session_and_router_keys_never_return_in_status_or_password_file(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            root = Path(directory)
            save_settings(settings(LIBRARY_SOURCE="papers", EMBEDDING_SERVICE="openrouter", OPENROUTER_API_KEY="synthetic-router-secret"), root)
            controller = LocalController(root)
            with patch("local_control.PapersClient") as constructor:
                constructor.return_value.login.return_value = [dict(id="collection-a", name="Synthetic")]
                response = controller.connect_papers(dict(email="synthetic@example.invalid", password="synthetic-password"))
            rendered = json.dumps(response)
            self.assertTrue(response["configuration"]["ready"])
            self.assertTrue(response["configuration"]["embedding_key_saved"])
            self.assertNotIn("synthetic-router-secret", rendered)
            self.assertNotIn("synthetic-password", rendered + (root / ".env").read_text())
            controller.disconnect_papers()
            self.assertFalse(controller.status()["configuration"]["ready"])
            with self.assertRaises(ConfigurationError):
                save_settings({"PAPERS_PASSWORD": "never-store"}, root)

    def test_papers_router_sync_reuses_cache_and_keeps_legacy_files_untouched(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            root = Path(directory)
            (root / "data").mkdir()
            sentinel = root / "data/graph.json"
            sentinel.write_text('{"legacy":"unchanged"}')
            client = Mock()
            client.read_collection.return_value = [item("a"), item("b")]
            profile = select_profile(root, settings(LIBRARY_SOURCE="papers", EMBEDDING_SERVICE="openrouter",
                OPENROUTER_API_KEY="synthetic"), client)
            provider = Mock(model_name="openai/text-embedding-3-small")
            provider.embed_batch.return_value = EmbeddingResult([[1.] + [0.] * 1535] * 2, 10)
            previews = []
            with use_profile(profile), patch.object(pipeline, "OpenRouterEmbeddingProvider", return_value=provider):
                store, first = pipeline.sync_embeddings(verbose=False, before_apply=previews.append)
                self.assertEqual(store.count(), 2)
                self.assertEqual(first.newly_embedded, 2)
                client.read_collection.return_value = [item("a")]
                second_store, second = pipeline.sync_embeddings(verbose=False, before_apply=previews.append)
                self.assertEqual(second.newly_embedded, 0)
                self.assertEqual(second.removed_keys, ["b"])
                self.assertEqual(second_store.existing_keys(), {"a"})
            self.assertEqual(provider.embed_batch.call_count, 1)
            self.assertEqual(previews[1]["removed"], 1)
            self.assertEqual(sentinel.read_text(), '{"legacy":"unchanged"}')
            viewer = json.loads((profile.data_dir / "viewer.json").read_text())
            self.assertEqual(viewer["source"], "papers")
            self.assertEqual(viewer["embedding_dimensions"], 1536)

    def test_expired_session_is_reported_disconnected(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            root = Path(directory)
            save_settings(settings(LIBRARY_SOURCE="papers"), root)
            controller = LocalController(root)
            client = PapersClient(); client._cookie = "synthetic"
            controller._papers_client = client
            controller._papers_email = "synthetic@example.invalid"
            controller._papers_collections = [dict(id="collection-a", name="Synthetic")]
            self.assertTrue(controller.status()["configuration"]["ready"])
            client._cookie = ""
            state = controller.status()["configuration"]
            self.assertFalse(state["papers_connected"])
            self.assertFalse(state["ready"])

    def test_stale_profile_cannot_dispatch_mutation(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            root = Path(directory)
            save_settings(settings(), root)
            controller = LocalController(root)
            identity = controller.profile().identity
            save_settings({"EMBEDDING_SERVICE": "openrouter"}, root)
            from work_lock import WorkBusyError
            with self.assertRaises(WorkBusyError):
                with controller.profile_request(identity): self.fail("Stale request dispatched")
