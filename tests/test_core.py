"""Fast tests for deterministic, network-free core behavior."""

from __future__ import annotations

import unittest

import numpy as np

from clustering import NOISE_CLUSTER, cluster_papers
from costs import estimate_cost, format_usd
from layout import calculate_positions


class CoreTests(unittest.TestCase):
    def test_small_library_is_left_unclassified(self) -> None:
        vectors = np.eye(3, dtype=np.float32)
        result = cluster_papers(vectors, ["one", "two", "three"])
        self.assertEqual(result.assignments, [NOISE_CLUSTER] * 3)
        self.assertEqual(result.weak_assignments, [False] * 3)

    def test_separable_groups_are_not_merged_into_one_topic(self) -> None:
        # Three tight, far-apart blobs must stay separate topics; a regression to
        # a conservative min_samples would collapse them into one giant cluster.
        rng = np.random.default_rng(0)
        centers = np.array([[20.0, 0.0], [0.0, 20.0], [-20.0, -20.0]])
        words = ["airway", "hemodynamic", "coagulation"]
        vectors_per_group = 12
        vectors = np.vstack(
            [center + rng.normal(scale=0.3, size=(vectors_per_group, 2)) for center in centers]
        ).astype(np.float32)
        texts = [word for word in words for _ in range(vectors_per_group)]
        result = cluster_papers(vectors, texts)
        topic_ids = {topic for topic in result.assignments if topic != NOISE_CLUSTER}
        self.assertGreaterEqual(len(topic_ids), 2)
        self.assertLess(max(result.assignments.count(t) for t in topic_ids), len(vectors))

    def test_small_layout_has_two_finite_coordinates(self) -> None:
        positions = calculate_positions(np.eye(3, dtype=np.float32))
        self.assertEqual(positions.shape, (3, 2))
        self.assertTrue(np.isfinite(positions).all())

    def test_cost_format_preserves_tiny_nonzero_amounts(self) -> None:
        amount = estimate_cost(1_000, "text-embedding-3-small")
        self.assertEqual(format_usd(amount), "$0.00002000")


if __name__ == "__main__":
    unittest.main()
