"""Network-free tests for atomic map publication and interrupted-sync recovery."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import pipeline
from zotero_source import Paper


def _result() -> pipeline.SyncResult:
    return pipeline.SyncResult(
        total_in_zotero=0,
        already_present=2,
        newly_embedded=0,
        tokens_used=0,
        cost=0.0,
        current_version=42,
    )


class MapPublicationTests(unittest.TestCase):
    def test_publication_writes_matching_revisions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.multiple(
                pipeline,
                GRAPH_FILE=root / "graph.json",
                CLUSTERS_FILE=root / "clusters.json",
            ):
                pipeline._publish_map({"nodes": [], "edges": []}, {"topics": [], "assignments": {}})
                graph, clusters = pipeline._load_map_snapshot()
                self.assertTrue(graph["revision"])
                self.assertEqual(graph["revision"], clusters["revision"])

    def test_mismatched_revisions_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            graph_file = root / "graph.json"
            clusters_file = root / "clusters.json"
            graph_file.write_text(json.dumps({"revision": "new"}), encoding="utf-8")
            clusters_file.write_text(json.dumps({"revision": "old"}), encoding="utf-8")
            with patch.multiple(pipeline, GRAPH_FILE=graph_file, CLUSTERS_FILE=clusters_file):
                with self.assertRaisesRegex(ValueError, "different revisions"):
                    pipeline._load_map_snapshot()


class SyncRecoveryTests(unittest.TestCase):
    def test_current_cache_does_not_require_openai_configuration(self) -> None:
        paper = Paper("A", "Title", "Abstract", "journalArticle", 7)
        source = Mock()
        source.fetch_all.return_value = ([paper], 42)
        store = Mock()
        store.list_metadata.return_value = [("A", "Title", "Abstract")]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with (
                patch.multiple(
                    pipeline,
                    METADATA_FILE=root / "metadata.json",
                    STATE_FILE=root / "state.json",
                ),
                patch.object(pipeline, "migrate_local_data"),
                patch.object(pipeline, "load_zotero_config", return_value=Mock()),
                patch.object(pipeline, "PyzoteroSource", return_value=source),
                patch.object(pipeline, "PaperStore", return_value=store),
                patch.object(
                    pipeline,
                    "load_openai_api_key",
                    side_effect=AssertionError("OpenAI key should not be loaded"),
                ),
            ):
                returned_store, result = pipeline.sync_embeddings(
                    force_full=True, verbose=False
                )
        self.assertIs(returned_store, store)
        self.assertEqual(result.newly_embedded, 0)

    def test_cache_only_paper_is_reconciled_into_existing_map(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            graph_file = root / "graph.json"
            clusters_file = root / "clusters.json"
            revision = "same"
            graph_file.write_text(
                json.dumps({"revision": revision, "nodes": [{"id": "A"}], "edges": []}),
                encoding="utf-8",
            )
            clusters_file.write_text(
                json.dumps({"revision": revision, "topics": [], "assignments": {}}),
                encoding="utf-8",
            )
            store = Mock()
            store.existing_keys.return_value = {"A", "B"}
            with (
                patch.multiple(pipeline, GRAPH_FILE=graph_file, CLUSTERS_FILE=clusters_file),
                patch.object(pipeline, "sync_embeddings", return_value=(store, _result())),
                patch.object(pipeline, "add_to_map_incrementally") as add_to_map,
                patch.object(pipeline, "commit_sync_state") as commit_state,
            ):
                pipeline.sync_library(verbose=False)
            self.assertEqual(add_to_map.call_args.args[1], ["B"])
            commit_state.assert_called_once()

    def test_state_is_not_committed_when_map_update_fails(self) -> None:
        store = Mock()
        store.existing_keys.return_value = {"A"}
        with (
            patch.object(pipeline, "sync_embeddings", return_value=(store, _result())),
            patch.object(pipeline, "_load_map_snapshot", side_effect=FileNotFoundError),
            patch.object(pipeline, "add_to_map_incrementally", side_effect=RuntimeError("disk full")),
            patch.object(pipeline, "commit_sync_state") as commit_state,
        ):
            with self.assertRaisesRegex(RuntimeError, "disk full"):
                pipeline.sync_library(verbose=False)
        commit_state.assert_not_called()
