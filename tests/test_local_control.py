"""Exercise local setup, confirmation gates and HTTP security without real APIs."""

import http.client
import http.server
import json
import os
from pathlib import Path
import stat
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from functools import partial
from socketserver import ThreadingTCPServer
from unittest.mock import Mock, patch

import config
import pipeline
from local_control import LocalController, ConfigurationError, PreviewCancelled, save_settings
from serve import ControlHandler
from work_lock import exclusive_work, WorkBusyError
from zotero_source import Paper
from papers_source import PapersClient

PREVIEW = dict(papers_read=1, cached=0, new=1, edited=0, removed=0, tokens=10,
               estimated_usd=0.0000002, model="test-model", missing_abstracts=0)


class LocalControlTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.enterContext(patch.dict(os.environ, {}, clear=True))
        save_settings(dict(ZOTERO_LIBRARY_ID="123", ZOTERO_LIBRARY_TYPE="user",
                           ZOTERO_API_KEY="zotero-secret", OPENAI_API_KEY="openai-secret"), self.root)

    def controller(self, runner, **kwargs):
        manager = LocalController(self.root, runner=runner, **kwargs)
        self.addCleanup(manager.shutdown)
        return manager

    def wait_state(self, manager, target):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            state = manager.status()["job"]["state"]
            if state == target:
                return manager.status()["job"]
            time.sleep(0.005)
        self.fail(f"Expected {target}, got {state}")

    def test_status_never_returns_keys(self):
        manager = self.controller(lambda *_: None)
        payload = json.dumps(manager.status())
        self.assertNotIn("zotero-secret", payload)
        self.assertNotIn("openai-secret", payload)
        self.assertTrue(manager.status()["configuration"]["openai_key_saved"])

    def test_settings_preserve_keys_and_unrelated_lines(self):
        path = self.root / ".env"
        with path.open("a") as stream:
            stream.write("# Keep this note\nUNRELATED=value\n")
        save_settings({"ZOTERO_API_KEY": "", "OPENAI_API_KEY": ""}, self.root)
        self.assertEqual(config.read_settings(path)["OPENAI_API_KEY"], "openai-secret")
        self.assertIn("UNRELATED=value", path.read_text())
        if os.name != "nt":
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_configuration_is_reread_without_process_cache(self):
        self.enterContext(patch.object(config, "ENV_FILE", self.root / ".env"))
        self.assertEqual(config.load_openai_api_key(), "openai-secret")
        save_settings({"OPENAI_API_KEY": "replacement-key"}, self.root)
        self.assertEqual(config.load_openai_api_key(), "replacement-key")

    def test_configuration_rejects_injection_and_library_switch(self):
        for values in ({"OPENAI_API_KEY": "a\nINJECTED=x"}, {"ZOTERO_LIBRARY_ID": "abc"}, {"arbitrary": "x"}):
            with self.subTest(values=list(values)):
                with self.assertRaises(ConfigurationError):
                    save_settings(values, self.root)
        (self.root / "data").mkdir()
        (self.root / "data/state.json").write_text(json.dumps({"zotero_library_id": "123", "zotero_library_type": "user"}))
        with self.assertRaisesRegex(ConfigurationError, "different library"):
            save_settings({"ZOTERO_LIBRARY_ID": "456"}, self.root)

    def test_confirm_is_required_and_only_consumed_once(self):
        applied = threading.Event()
        finish = threading.Event()
        def runner(operation, approve, progress):
            approve(PREVIEW)
            applied.set()
            finish.wait(3)
        self.addCleanup(finish.set)
        manager = self.controller(runner)
        manager.start("sync")
        job = self.wait_state(manager, "awaiting_confirmation")
        self.assertFalse(applied.is_set())
        with self.assertRaises(WorkBusyError):
            manager.start("rebuild")
        with self.assertRaises(WorkBusyError):
            manager.configure({})
        with self.assertRaises(ConfigurationError):
            manager.decide("stale-id", True)
        manager.decide(job["id"], True)
        self.assertTrue(applied.wait(1))
        with self.assertRaises(WorkBusyError):
            manager.decide(job["id"], True)
        finish.set()
        self.wait_state(manager, "succeeded")

    def test_cancel_and_expiry_do_not_apply_changes(self):
        for timeout in (3, 0.01):
            applied = Mock()
            def runner(operation, approve, progress):
                approve(PREVIEW)
                applied()
            manager = self.controller(runner, confirmation_timeout=timeout)
            manager.start("sync")
            if timeout == 3:
                job = self.wait_state(manager, "awaiting_confirmation")
                manager.decide(job["id"], False)
            self.wait_state(manager, "cancelled")
            applied.assert_not_called()

    def test_worker_errors_do_not_echo_secrets(self):
        def runner(*_):
            raise RuntimeError("request contained openai-secret and private title")
        manager = self.controller(runner)
        manager.start("sync")
        job = self.wait_state(manager, "failed")
        self.assertNotIn("openai-secret", json.dumps(job))
        self.assertNotIn("private title", json.dumps(job))

    def test_lock_rejects_overlap_and_releases_after_failure(self):
        path = self.root / "lock"
        with self.assertRaisesRegex(RuntimeError, "simulated"):
            with exclusive_work(path):
                with self.assertRaises(WorkBusyError):
                    with exclusive_work(path):
                        pass
                raise RuntimeError("simulated")
        with exclusive_work(path):
            pass

    def test_os_lock_blocks_a_second_process(self):
        path = self.root / "lock"
        code = (
            "from pathlib import Path\n"
            "from work_lock import exclusive_work, WorkBusyError\n"
            "import sys\n"
            "try:\n"
            " with exclusive_work(Path(sys.argv[1])): pass\n"
            "except WorkBusyError: sys.exit(7)\n"
        )
        with exclusive_work(path):
            result = subprocess.run([sys.executable, "-c", code, str(path)], capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 7)

    @unittest.skipUnless(shutil.which("zsh"), "macOS launcher requires zsh")
    def test_macos_launcher_uses_its_own_environment_with_spaces_in_path(self):
        folder = self.root / "Project with spaces"
        python = folder / ".venv/bin/python"
        python.parent.mkdir(parents=True)
        python.write_text("#!/bin/sh\nprintf '%s\\n' \"$PWD\" \"$@\"\n")
        python.chmod(0o755)
        launcher = folder / "Launch SZKG.command"
        shutil.copy(Path(__file__).resolve().parents[1] / launcher.name, launcher)
        result = subprocess.run([shutil.which("zsh"), str(launcher)], cwd=self.root,
                                capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.splitlines(), [str(folder.resolve()), "app.py", "serve"])

    def test_missing_openai_key_allows_preview_but_blocks_confirmation(self):
        (self.root / ".env").write_text("ZOTERO_LIBRARY_ID=123\nZOTERO_API_KEY=fake\n")
        applied = Mock()
        def runner(operation, approve, progress):
            approve(PREVIEW)
            applied()
        manager = self.controller(runner)
        manager.start("sync")
        job = self.wait_state(manager, "awaiting_confirmation")
        with self.assertRaisesRegex(ConfigurationError, "OpenAI key"):
            manager.decide(job["id"], True)
        manager.decide(job["id"], False)
        self.wait_state(manager, "cancelled")
        applied.assert_not_called()

    def test_cancel_while_reading_is_observed_before_apply(self):
        reading = threading.Event()
        continue_read = threading.Event()
        applied = Mock()
        def runner(operation, approve, progress):
            reading.set(); continue_read.wait(3)
            approve(PREVIEW); applied()
        manager = self.controller(runner)
        manager.start("sync")
        self.assertTrue(reading.wait(1))
        manager.decide(manager.status()["job"]["id"], False)
        continue_read.set()
        self.wait_state(manager, "cancelled")
        applied.assert_not_called()

    def test_cancel_gate_precedes_cache_deletion_metadata_and_embedding(self):
        source = Mock()
        source.fetch_all.return_value = ([Paper("new", "Synthetic title", "Text", "book", 1)], 42)
        store = Mock()
        store.list_metadata.return_value = [("deleted", "Old", "Text")]
        with (
            patch.object(pipeline, "migrate_local_data"),
            patch.object(pipeline, "_load_state", return_value={}),
            patch.object(pipeline, "load_zotero_config", return_value=config.ZoteroConfig("123", "user", "unused")),
            patch.object(pipeline, "PyzoteroSource", return_value=source),
            patch.object(pipeline, "PaperStore", return_value=store),
            patch.object(pipeline, "count_tokens", return_value=10),
            patch.object(pipeline, "_update_metadata_file") as metadata,
            patch.object(pipeline, "_update_viewer_config") as viewer,
            patch.object(pipeline, "OpenAIEmbeddingProvider") as provider,
        ):
            captured = []
            def cancel(preview):
                captured.append(preview)
                raise PreviewCancelled()
            with self.assertRaises(PreviewCancelled):
                pipeline.sync_embeddings(verbose=False, before_apply=cancel)
            self.assertEqual(captured[0]["new"], 1)
            self.assertEqual(captured[0]["removed"], 1)
            metadata.assert_not_called(); viewer.assert_not_called(); provider.assert_not_called()
            store.delete_keys.assert_not_called(); store.upsert.assert_not_called()


class LocalHTTPTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.enterContext(patch.dict(os.environ, {}, clear=True))
        manager = LocalController(self.root, runner=lambda *_: None)
        self.server = ThreadingTCPServer(("127.0.0.1", 0), partial(ControlHandler, directory=str(self.root)))
        self.server.controller = manager
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)
        self.port = self.server.server_address[1]
        self.origin = f"http://127.0.0.1:{self.port}"

    def stop(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.server.controller.shutdown()

    def request(self, path, body=None, **headers):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        if body is not None:
            headers.setdefault("Content-Type", "application/json")
        connection.request("POST" if body is not None else "GET", path,
                           json.dumps(body) if body is not None else None, headers)
        response = connection.getresponse()
        status, data = response.status, response.read()
        connection.close()
        return status, data

    def test_get_rejects_dns_rebinding_and_cross_site(self):
        self.assertEqual(self.request("/api/status")[0], 200)
        self.assertEqual(self.request("/api/status", Host="evil.example")[0], 403)
        self.assertEqual(self.request("/api/status", Origin="https://evil.example")[0], 403)
        self.assertEqual(self.request("/api/status", **{"Sec-Fetch-Site": "cross-site"})[0], 403)

    def test_post_requires_origin_and_unpredictable_token(self):
        token = self.server.controller.token
        body = {"ZOTERO_LIBRARY_ID": "123", "ZOTERO_API_KEY": "synthetic-key"}
        self.assertEqual(self.request("/api/config", body, Origin=self.origin)[0], 403)
        self.assertEqual(self.request("/api/config", body, **{"X-SZKG-Token": token})[0], 403)
        self.assertEqual(self.request("/api/config", body, Origin="https://evil.example", **{"X-SZKG-Token": token})[0], 403)
        status, result = self.request("/api/config", body, Origin=self.origin, **{"X-SZKG-Token": token,
            "X-SZKG-Profile": self.server.controller.profile().identity})
        self.assertEqual(status, 200)
        self.assertNotIn(b"synthetic-key", result)
        self.assertEqual(self.request("/.env")[0], 404)

    def test_only_fixed_actions_are_supported(self):
        headers = {"Origin": self.origin, "X-SZKG-Token": self.server.controller.token,
                   "X-SZKG-Profile": self.server.controller.profile().identity}
        self.assertEqual(self.request("/api/execute", {"command": "echo test"}, **headers)[0], 404)
        self.assertEqual(self.request("/api/jobs", {"operation": "shell"}, **headers)[0], 400)
        self.assertEqual(self.request("/api/jobs", {"operation": []}, **headers)[0], 400)

    def test_posts_require_the_current_profile(self):
        manager = self.server.controller
        headers = {"Origin": self.origin, "X-SZKG-Token": manager.token}
        with patch.object(manager, "start") as start:
            self.assertEqual(self.request("/api/jobs", {"operation": "sync"}, **headers)[0], 409)
            headers["X-SZKG-Profile"] = "stale-profile"
            self.assertEqual(self.request("/api/jobs", {"operation": "sync"}, **headers)[0], 409)
            start.assert_not_called()

    def test_data_is_bound_to_one_profile_and_private_paths_are_not_served(self):
        manager = self.server.controller
        original = manager.profile()
        original.data_dir.mkdir(parents=True)
        (original.data_dir / "graph.json").write_text('{"source":"original"}')
        self.assertEqual(self.request("/data/graph.json?profile=" + original.identity)[0], 200)
        save_settings({"ZOTERO_LIBRARY_ID": "123", "ZOTERO_API_KEY": "synthetic",
                       "EMBEDDING_SERVICE": "openrouter"}, self.root)
        selected = manager.profile()
        selected.data_dir.mkdir(parents=True)
        (selected.data_dir / "graph.json").write_text('{"source":"selected"}')
        self.assertEqual(self.request("/data/graph.json?profile=" + original.identity)[0], 409)
        with patch.object(manager, "profile", side_effect=[selected, original]) as profile:
            status, body = self.request("/data/graph.json?profile=" + selected.identity)
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body)["source"], "selected")
            self.assertEqual(profile.call_count, 1)
        self.assertEqual(self.request("/data/profiles/" + selected.identity + "/graph.json")[0], 404)
        self.assertEqual(self.request("/data/state.json")[0], 404)


class PapersRedirectHTTPTests(unittest.TestCase):
    def test_real_http_redirect_preserves_cookie_without_followup_request(self):
        requested = []

        class LoginHandler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                requested.append(self.path)
                self.rfile.read(int(self.headers.get("Content-Length", 0)))
                self.send_response(302)
                self.send_header("Location", "/must-not-be-requested")
                self.send_header("Set-Cookie", "session=synthetic-cookie; HttpOnly")
                self.send_header("Content-Length", "0")
                self.end_headers()

            def do_GET(self):
                requested.append(self.path)
                self.send_error(500)

            def log_message(self, *_args):
                pass

        server = ThreadingTCPServer(("127.0.0.1", 0), LoginHandler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            client = PapersClient()
            client.LOGIN = f"http://127.0.0.1:{server.server_address[1]}/login"
            client.collections = Mock(return_value=[])
            self.assertEqual(client.login("synthetic@example.invalid", "synthetic-password"), [])
            self.assertEqual(client._cookie, "session=synthetic-cookie")
            client.collections.assert_called_once()
            self.assertEqual(requested, ["/login"])
        finally:
            server.shutdown(); server.server_close(); worker.join()
