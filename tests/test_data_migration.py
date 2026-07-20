"""Regression tests for the one-time legacy-to-English data migration."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import data_migration


class DataMigrationTests(unittest.TestCase):
    def test_migrates_legacy_files_once_without_touching_vectors(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            graph_file = root / "graph.json"
            clusters_file = root / "clusters.json"
            state_file = root / "state.json"
            graph_file.write_text(
                json.dumps(
                    {
                        "nodes": [
                            {
                                "id": "A",
                                "cluster": -1,
                                "cluster_label": "non classificati",
                                "debole": False,
                            }
                        ],
                        "edges": [],
                    }
                ),
                encoding="utf-8",
            )
            clusters_file.write_text(
                json.dumps(
                    {
                        "temi": [
                            {
                                "id": -1,
                                "etichetta": "non classificati",
                                "parole_chiave": [],
                                "numero_paper": 1,
                            }
                        ],
                        "assegnazioni": {"A": -1},
                    }
                ),
                encoding="utf-8",
            )
            state_file.write_text(json.dumps({"ultima_versione": 42}), encoding="utf-8")

            with patch.multiple(
                data_migration,
                GRAPH_FILE=graph_file,
                CLUSTERS_FILE=clusters_file,
                STATE_FILE=state_file,
            ):
                self.assertEqual(
                    data_migration.migrate_local_data(),
                    ["graph.json", "clusters.json", "state.json"],
                )
                self.assertEqual(data_migration.migrate_local_data(), [])

            graph = json.loads(graph_file.read_text(encoding="utf-8"))
            clusters = json.loads(clusters_file.read_text(encoding="utf-8"))
            state = json.loads(state_file.read_text(encoding="utf-8"))
            self.assertFalse(graph["nodes"][0]["weak_assignment"])
            self.assertNotIn("debole", graph["nodes"][0])
            self.assertEqual(clusters["topics"][0]["label"], "unclassified")
            self.assertEqual(clusters["assignments"], {"A": -1})
            self.assertEqual(state, {"last_zotero_version": 42})


if __name__ == "__main__":
    unittest.main()
