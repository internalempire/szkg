"""Network-free tests for atomic map publication and interrupted-sync recovery."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import pipeline
from config import ZoteroConfig
from embeddings import DEFAULT_EMBEDDING_MODEL
from store import PaperStore
from zotero_source import Paper, SourceChanges


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
    def test_empty_rebuild_publishes_an_empty_map(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            graph_file = root / "graph.json"
            clusters_file = root / "clusters.json"
            store = PaperStore(vector_dimensions=3, data_directory=root / "lancedb")
            with (
                patch.multiple(
                    pipeline, GRAPH_FILE=graph_file, CLUSTERS_FILE=clusters_file
                ),
                patch.object(pipeline, "migrate_local_data"),
            ):
                result = pipeline.rebuild_map(store, verbose=False)
                graph, clusters = pipeline._load_map_snapshot()
            self.assertEqual(result.assignments, [])
            self.assertEqual(graph["nodes"], [])
            self.assertEqual(graph["edges"], [])
            self.assertEqual(clusters["topics"], [])
            self.assertEqual(clusters["assignments"], {})

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

    def test_incremental_map_removes_node_edges_and_assignment(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            graph_file = root / "graph.json"
            clusters_file = root / "clusters.json"
            revision = "same"
            graph_file.write_text(
                json.dumps(
                    {
                        "revision": revision,
                        "nodes": [
                            {"id": "A", "title": "A", "cluster": 0, "x": 0, "y": 0},
                            {"id": "B", "title": "B", "cluster": 0, "x": 1, "y": 1},
                        ],
                        "edges": [{"source": "A", "target": "B", "weight": 0.8}],
                    }
                ),
                encoding="utf-8",
            )
            clusters_file.write_text(
                json.dumps(
                    {
                        "revision": revision,
                        "topics": [{"id": 0, "label": "topic", "keywords": [], "paper_count": 2}],
                        "assignments": {"A": 0, "B": 0},
                    }
                ),
                encoding="utf-8",
            )
            store = PaperStore(vector_dimensions=3, data_directory=root / "lancedb")
            store.add([Paper("A", "A", "", "book", 1)], [[1.0, 0.0, 0.0]], [1], "test")
            with (
                patch.multiple(pipeline, GRAPH_FILE=graph_file, CLUSTERS_FILE=clusters_file),
                patch.object(pipeline, "migrate_local_data"),
            ):
                pipeline.add_to_map_incrementally(
                    store, new_keys=[], removed_keys=["B"], verbose=False
                )
                graph, clusters = pipeline._load_map_snapshot()
            self.assertEqual([node["id"] for node in graph["nodes"]], ["A"])
            self.assertEqual(graph["edges"], [])
            self.assertEqual(clusters["assignments"], {"A": 0})
            self.assertEqual(clusters["topics"][0]["paper_count"], 1)


class SyncRecoveryTests(unittest.TestCase):
    def test_rejects_state_from_a_different_zotero_library(self) -> None:
        state = {
            "zotero_library_id": "111",
            "zotero_library_type": "user",
        }
        with self.assertRaisesRegex(SystemExit, "does not match the local cache"):
            pipeline._validate_library_identity(
                state, ZoteroConfig("222", "group", "not-used")
            )

    def test_current_cache_does_not_require_openai_configuration(self) -> None:
        paper = Paper("A", "Title", "Abstract", "journalArticle", 7)
        source = Mock()
        source.fetch_all.return_value = ([paper], 42)
        store = Mock()
        store.list_metadata.return_value = [("A", "Title", "Abstract")]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = ZoteroConfig("111", "user", "not-used")
            with (
                patch.multiple(
                    pipeline,
                    METADATA_FILE=root / "metadata.json",
                    STATE_FILE=root / "state.json",
                    VIEWER_CONFIG_FILE=root / "viewer.json",
                ),
                patch.object(pipeline, "migrate_local_data"),
                patch.object(pipeline, "load_zotero_config", return_value=config),
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

    def test_full_read_prunes_cache_keys_missing_from_zotero(self) -> None:
        active = Paper("A", "Active", "Text", "journalArticle", 7)
        source = Mock()
        source.fetch_all.return_value = ([active], 42)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = ZoteroConfig("111", "user", "not-used")
            store = PaperStore(vector_dimensions=3, data_directory=root / "lancedb")
            store.add(
                [active, Paper("B", "Deleted", "Text", "journalArticle", 6)],
                [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]],
                [1, 1],
                DEFAULT_EMBEDDING_MODEL,
            )
            with (
                patch.multiple(
                    pipeline,
                    METADATA_FILE=root / "metadata.json",
                    STATE_FILE=root / "state.json",
                    VIEWER_CONFIG_FILE=root / "viewer.json",
                ),
                patch.object(pipeline, "migrate_local_data"),
                patch.object(pipeline, "load_zotero_config", return_value=config),
                patch.object(pipeline, "PyzoteroSource", return_value=source),
                patch.object(pipeline, "PaperStore", return_value=store),
                patch.object(pipeline, "load_openai_api_key", side_effect=AssertionError),
            ):
                returned_store, result = pipeline.sync_embeddings(
                    force_full=True, verbose=False
                )
            self.assertIs(returned_store, store)
            self.assertEqual(result.removed_keys, ["B"])
            self.assertEqual(store.existing_keys(), {"A"})

    def test_incremental_deleted_log_prunes_cache_and_metadata(self) -> None:
        config = ZoteroConfig("111", "user", "not-used")
        source = Mock()
        source.fetch_changes_since.return_value = SourceChanges([], {"B"}, 15)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = PaperStore(vector_dimensions=3, data_directory=root / "lancedb")
            store.add(
                [Paper("A", "Active", "", "book", 1), Paper("B", "Deleted", "", "book", 1)],
                [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]],
                [1, 1],
                DEFAULT_EMBEDDING_MODEL,
            )
            state_file = root / "state.json"
            state_file.write_text(
                json.dumps(
                    {
                        "last_zotero_version": 10,
                        "zotero_library_id": "111",
                        "zotero_library_type": "user",
                    }
                ),
                encoding="utf-8",
            )
            metadata_file = root / "metadata.json"
            metadata_file.write_text(
                json.dumps({"A": {"title": "Active"}, "B": {"title": "Deleted"}}),
                encoding="utf-8",
            )
            with (
                patch.multiple(
                    pipeline,
                    METADATA_FILE=metadata_file,
                    STATE_FILE=state_file,
                    VIEWER_CONFIG_FILE=root / "viewer.json",
                ),
                patch.object(pipeline, "migrate_local_data"),
                patch.object(pipeline, "load_zotero_config", return_value=config),
                patch.object(pipeline, "PyzoteroSource", return_value=source),
                patch.object(pipeline, "PaperStore", return_value=store),
                patch.object(pipeline, "load_openai_api_key", side_effect=AssertionError),
            ):
                returned_store, result = pipeline.sync_embeddings(verbose=False)
            self.assertIs(returned_store, store)
            self.assertEqual(result.removed_keys, ["B"])
            self.assertEqual(store.existing_keys(), {"A"})
            metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
            self.assertEqual(set(metadata), {"A"})

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
            patch.object(pipeline, "rebuild_map", side_effect=RuntimeError("disk full")),
            patch.object(pipeline, "commit_sync_state") as commit_state,
        ):
            with self.assertRaisesRegex(RuntimeError, "disk full"):
                pipeline.sync_library(verbose=False)
        commit_state.assert_not_called()
