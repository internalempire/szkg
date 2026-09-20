import unittest
from contextlib import nullcontext, redirect_stdout
import io
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

import numpy as np

from map_quality import projection_quality


class ProjectionQualityTests(unittest.TestCase):
    def test_identical_geometry_retains_neighbors(self):
        angles = np.linspace(0, 2 * np.pi, 23, endpoint=False) + .01
        positions = np.column_stack((np.cos(angles), np.sin(angles)))
        report = projection_quality([str(i) for i in range(23)], positions, positions, neighbors=2)
        self.assertAlmostEqual(report["trustworthiness"], 1)
        self.assertAlmostEqual(report["neighbor_overlap"], 1)

    def test_sample_is_stable_under_storage_order_changes(self):
        vectors = np.random.default_rng(7).normal(size=(60, 10))
        keys = [str(i) for i in range(60)]
        a = projection_quality(keys, vectors, vectors[:, :2], sample_size=30)
        b = projection_quality(keys[::-1], vectors[::-1], vectors[::-1, :2], sample_size=30)
        self.assertEqual(a, b)

    def test_small_inputs_and_neighbor_bound(self):
        for count in (0, 1, 2):
            report = projection_quality([str(i) for i in range(count)], np.zeros((count, 3)), np.zeros((count, 2)))
            self.assertIsNone(report["trustworthiness"])
        report = projection_quality(["a", "b", "c"], np.eye(3), np.array([[0, 0], [1, 0], [0, 1]]))
        self.assertEqual(report["neighbors"], 1)

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            projection_quality(["a"], [[1, 2]], [[np.nan, 0]])
        with self.assertRaises(ValueError):
            projection_quality([], np.empty((0, 2)), np.empty((0, 2)), sample_size=2001)

    def test_offline_command_compares_in_memory_without_publishing(self):
        import map_quality
        import work_lock
        from json_io import write_json_atomically
        from store import PaperStore
        from zotero_source import Paper

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = PaperStore(4, root / "data/lancedb")
            store.add([Paper(str(i), "Private synthetic title", "Private synthetic abstract", "book", 1)
                       for i in range(4)], np.eye(4).tolist(), [1]*4, "synthetic")
            path = root / "data/graph.json"
            write_json_atomically(path, {"nodes": [dict(id=str(i), x=i, y=i%2, cluster=0) for i in range(4)]})
            original = path.read_bytes()
            output = io.StringIO()
            with (patch.object(map_quality, "__file__", str(root / "map_quality.py")),
                  patch.object(work_lock, "exclusive_work", return_value=nullcontext()),
                  patch("sys.argv", ["map_quality.py", "--compare-compaction"]), redirect_stdout(output)):
                map_quality.main()
            report = json.loads(output.getvalue())
            self.assertIn("recomputed_after_compaction", report)
            self.assertEqual(report["published_layout"]["sample_papers"], 4)
            self.assertNotIn("Private synthetic", output.getvalue())
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(store.count(), 4)


if __name__ == "__main__":
    unittest.main()
