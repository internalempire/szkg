"""Recover cache-to-map content updates without network calls or private data."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import pipeline
from config import ZoteroConfig
from embeddings import DEFAULT_EMBEDDING_MODEL
from store import PaperStore
from zotero_source import Paper, SourceChanges


class SemanticRecoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        root = Path(self.directory.name)
        self.paths = {
            "GRAPH_FILE": root / "graph.json", "CLUSTERS_FILE": root / "clusters.json",
            "STATE_FILE": root / "state.json", "METADATA_FILE": root / "metadata.json",
            "VIEWER_CONFIG_FILE": root / "viewer.json",
        }
        self.enterContext(patch.multiple(pipeline, **self.paths))
        self.enterContext(patch.object(pipeline, "migrate_local_data"))
        self.store = PaperStore(vector_dimensions=3, data_directory=root / "lancedb")
        self.original = Paper("A", "Original title", "Original abstract", "book", 1)
        self.save_paper(self.original)
        self.source = Mock()
        self.source.fetch_changes_since.return_value = SourceChanges([], set(), 2)
        self.enterContext(patch.object(pipeline, "PyzoteroSource", return_value=self.source))
        self.enterContext(patch.object(pipeline, "PaperStore", return_value=self.store))
        self.enterContext(patch.object(pipeline, "load_zotero_config", return_value=ZoteroConfig("1", "user", "unused")))
        self.enterContext(patch.object(pipeline, "load_openai_api_key", side_effect=AssertionError("No API request is allowed")))
        pipeline._save_state({"last_zotero_version": 1, "zotero_library_id": "1", "zotero_library_type": "user"})
        pipeline._publish_map(
            {"nodes": [{"id": "A", "title": self.original.title, "cluster": -1,
                         "x": 17.0, "y": 23.0, "needs_rebuild": False,
                         "content_fingerprint": pipeline.content_fingerprint(self.original.title, self.original.abstract)}],
             "edges": [], "status": {"status_known": True, "last_full_rebuild_at": "2026-01-01T00:00:00+00:00"}},
            {"topics": [{"id": -1, "label": "unclassified", "paper_count": 1}], "assignments": {"A": -1}},
        )

    def save_paper(self, paper: Paper) -> None:
        self.store.upsert([paper], [[1.0, 0.0, 0.0]], [1], DEFAULT_EMBEDDING_MODEL)

    def snapshot(self) -> dict:
        return pipeline._load_map_snapshot()[0]

    def test_interrupted_title_update_is_recovered_without_reembedding(self) -> None:
        changed = Paper("A", "Edited title", "Edited abstract", "book", 2)
        self.save_paper(changed)  # Simulate a crash after the successful cache write.
        self.source.fetch_changes_since.return_value = SourceChanges([changed], set(), 2)
        pipeline.sync_library(verbose=False)
        graph = self.snapshot()
        node = graph["nodes"][0]
        self.assertEqual(node["title"], changed.title)
        self.assertEqual((node["x"], node["y"]), (17.0, 23.0))
        self.assertEqual(node["cluster"], -1)
        self.assertTrue(node["needs_rebuild"])
        self.assertEqual(graph["status"]["pending_paper_count"], 1)
        self.assertEqual(pipeline._load_state()["last_zotero_version"], 2)
        self.assertEqual(graph["status"]["last_sync_at"], pipeline._load_state()["last_sync_at"])

    def test_abstract_only_edit_is_detected_even_without_source_changes(self) -> None:
        self.save_paper(Paper("A", self.original.title, "Edited abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        self.assertTrue(self.snapshot()["nodes"][0]["needs_rebuild"])

    def test_unchanged_retry_preserves_pending_status_and_rebuild_time(self) -> None:
        self.save_paper(Paper("A", self.original.title, "Edited abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        first = self.snapshot()
        pipeline.sync_library(verbose=False)
        second = self.snapshot()
        self.assertEqual(second["status"]["pending_paper_count"], 1)
        self.assertEqual(first["status"]["last_full_rebuild_at"], second["status"]["last_full_rebuild_at"])

    def test_failed_publication_does_not_advance_state_and_can_be_retried(self) -> None:
        self.save_paper(Paper("A", "Edited title", "Edited abstract", "book", 2))
        with patch.object(pipeline, "_publish_map", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                pipeline.sync_library(verbose=False)
        self.assertEqual(pipeline._load_state()["last_zotero_version"], 1)
        pipeline.sync_library(verbose=False)
        self.assertEqual(self.snapshot()["nodes"][0]["title"], "Edited title")

    def test_failure_after_map_before_state_is_safe_to_retry(self) -> None:
        self.save_paper(Paper("A", "Edited title", "Edited abstract", "book", 2))
        with patch.object(pipeline, "_save_state", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                pipeline.sync_library(verbose=False)
        self.assertEqual(pipeline._load_state()["last_zotero_version"], 1)
        pipeline.sync_library(verbose=False)
        self.assertEqual(self.snapshot()["status"]["pending_paper_count"], 1)
        self.assertEqual(pipeline._load_state()["last_zotero_version"], 2)

    def test_full_rebuild_clears_pending_status(self) -> None:
        self.save_paper(Paper("A", "Edited title", "Edited abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        pipeline.rebuild_map(self.store, verbose=False)
        graph = self.snapshot()
        self.assertFalse(graph["nodes"][0]["needs_rebuild"])
        self.assertEqual(graph["status"]["pending_paper_count"], 0)
        self.assertTrue(graph["status"]["status_known"])
        self.assertTrue(graph["status"]["last_full_rebuild_at"])

    def test_failed_full_rebuild_keeps_pending_status(self) -> None:
        self.save_paper(Paper("A", "Edited title", "Edited abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        before = self.snapshot()
        with patch.object(pipeline, "calculate_positions", side_effect=RuntimeError("layout failed")):
            with self.assertRaises(RuntimeError):
                pipeline.rebuild_map(self.store, verbose=False)
        self.assertEqual(self.snapshot(), before)

    def test_deleted_pending_paper_no_longer_counts(self) -> None:
        self.save_paper(Paper("A", "Edited title", "Edited abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        self.source.fetch_changes_since.return_value = SourceChanges([], {"A"}, 3)
        pipeline.sync_library(verbose=False)
        self.assertEqual(self.snapshot()["status"]["pending_paper_count"], 0)
        self.assertEqual(self.snapshot()["nodes"], [])

    def test_legacy_map_remains_unknown_until_rebuilt(self) -> None:
        graph, clusters = pipeline._load_map_snapshot()
        graph.pop("status")
        graph["nodes"][0].pop("content_fingerprint")
        pipeline._publish_map(graph, clusters)
        pipeline.sync_library(verbose=False)
        self.assertFalse(self.snapshot()["status"]["status_known"])
        self.assertEqual(self.snapshot()["status"]["pending_paper_count"], 0)
        self.assertIn("content_fingerprint", self.snapshot()["nodes"][0])
        pipeline.rebuild_map(self.store, verbose=False)
        self.assertTrue(self.snapshot()["status"]["status_known"])

    def test_cache_only_new_paper_is_marked_for_reorganization(self) -> None:
        self.save_paper(Paper("B", "New paper", "Abstract", "book", 2))
        pipeline.sync_library(verbose=False)
        graph = self.snapshot()
        self.assertEqual(len(graph["nodes"]), 2)
        self.assertEqual(graph["status"]["pending_paper_count"], 1)
        original = next(node for node in graph["nodes"] if node["id"] == "A")
        self.assertEqual((original["x"], original["y"]), (17.0, 23.0))

    def test_metadata_only_change_does_not_require_rebuild(self) -> None:
        paper = Paper("A", self.original.title, self.original.abstract, "book", 2, "New author")
        self.source.fetch_changes_since.return_value = SourceChanges([paper], set(), 2)
        pipeline.sync_library(verbose=False)
        self.assertEqual(self.snapshot()["status"]["pending_paper_count"], 0)

    def test_empty_full_rebuild_has_known_clean_status(self) -> None:
        self.store.delete_keys(["A"])
        pipeline.rebuild_map(self.store, verbose=False)
        self.assertTrue(self.snapshot()["status"]["status_known"])
        self.assertEqual(self.snapshot()["status"]["pending_paper_count"], 0)

    def test_fingerprint_preserves_field_boundaries_and_unicode(self) -> None:
        self.assertNotEqual(pipeline.content_fingerprint("a", "b\nc"), pipeline.content_fingerprint("a\nb", "c"))
        self.assertEqual(pipeline.content_fingerprint("Titolo è", "的"), pipeline.content_fingerprint("Titolo è", "的"))
