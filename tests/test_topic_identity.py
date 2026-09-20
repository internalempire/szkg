import copy
import unittest
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np

from topic_identity import initialize_identities, reconcile_topics


def snapshot(groups, weak=()):
    nodes = [dict(id=key, cluster=topic, weak_assignment=key in weak)
             for topic, keys in groups.items() for key in keys]
    clusters = {"topics": [dict(id=topic, label=f"Topic {topic}", paper_count=len(keys))
                            for topic, keys in groups.items()]}
    return {"nodes": nodes}, clusters


class TopicIdentityTests(unittest.TestCase):
    def test_baseline_keeps_rank_colors_and_is_idempotent(self):
        _, clusters = snapshot({4: "abcd", 7: "ef", -1: "g"})
        initialize_identities(clusters)
        before = copy.deepcopy(clusters)
        initialize_identities(clusters)
        self.assertEqual(before, clusters)
        self.assertEqual([0, 1], [t["color_index"] for t in clusters["topics"] if t["id"] != -1])
        self.assertNotIn("stable_id", clusters["topics"][-1])

    def test_reordered_cluster_numbers_keep_identity_and_color(self):
        graph, old = snapshot({0: "abcd", 1: "efgh"})
        initialize_identities(old)
        new_graph, new = snapshot({8: "abcdef"[:4], 2: "efghi"})
        reconcile_topics(new_graph["nodes"], new, graph, old)
        for topic, previous in zip(new["topics"], old["topics"]):
            self.assertEqual(topic["stable_id"], previous["stable_id"])
            self.assertEqual(topic["color_index"], previous["color_index"])
            self.assertEqual(topic["continuity"], "continued")

    def test_split_and_merge_do_not_reuse_identity(self):
        graph, old = snapshot({0: "abcdefghij"})
        new_graph, new = snapshot({0: "abcdefgh", 1: "ij"})
        reconcile_topics(new_graph["nodes"], new, graph, old)
        self.assertEqual([t["continuity"] for t in new["topics"]], ["split", "split"])
        self.assertNotIn(old["topics"][0]["stable_id"], [t["stable_id"] for t in new["topics"]])
        merged_graph, merged = snapshot({2: "abcdefghij"})
        reconcile_topics(merged_graph["nodes"], merged, new_graph, new)
        self.assertEqual(merged["topics"][0]["continuity"], "merged")
        self.assertEqual(len(merged["topics"][0]["previous_ids"]), 2)

    def test_weak_members_do_not_establish_continuity(self):
        graph, old = snapshot({0: "abcdef"}, weak="abcdef")
        new_graph, new = snapshot({0: "abcdef"})
        reconcile_topics(new_graph["nodes"], new, graph, old)
        self.assertEqual(new["topics"][0]["continuity"], "new")

    def test_color_cursor_survives_retired_topics(self):
        graph, old = snapshot({0: "abcd"})
        old["next_color_index"] = 20
        new_graph, new = snapshot({1: "efgh"})
        reconcile_topics(new_graph["nodes"], new, graph, old)
        self.assertGreaterEqual(new["topics"][0]["color_index"], 20)

    def test_pipeline_rebuild_and_incremental_count_preserve_identity(self):
        import pipeline
        from clustering import ClusteringResult, Topic
        from store import CompleteDataset

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = Mock()
            keys = list("abcd")
            store.read_all.return_value = CompleteDataset(keys, keys, keys, np.eye(4))
            store.list_metadata.return_value = [(key, key, "") for key in keys]
            graph, clusters = snapshot({0: "abcd"})
            graph.update(edges=[])
            for node in graph["nodes"]:
                node.update(x=0, y=0, title=node["id"])
            clusters["assignments"] = {key: 0 for key in keys}
            with (patch.multiple(pipeline, GRAPH_FILE=root / "graph.json", CLUSTERS_FILE=root / "clusters.json"),
                  patch.object(pipeline, "migrate_local_data"),
                  patch.object(pipeline, "build_graph", return_value=[]),
                  patch.object(pipeline, "calculate_positions", return_value=np.zeros((4, 2))),
                  patch.object(pipeline, "cluster_papers", return_value=ClusteringResult(
                      [9] * 4, [Topic(9, "Changed keywords", [], 4)], [False] * 4))):
                pipeline._publish_map(graph, clusters)
                original = clusters["topics"][0]["stable_id"]
                pipeline.rebuild_map(store, verbose=False)
                published, rebuilt = pipeline._load_map_snapshot()
                self.assertEqual(rebuilt["topics"][0]["stable_id"], original)
                self.assertEqual(rebuilt["topics"][0]["id"], 9)
                self.assertEqual([n["cluster"] for n in published["nodes"]], [9] * 4)
                store.list_metadata.return_value = [(key, key, "") for key in keys[:-1]]
                pipeline.add_to_map_incrementally(store, [], removed_keys=["d"], verbose=False)
                _, pruned = pipeline._load_map_snapshot()
                self.assertEqual(pruned["topics"][0]["stable_id"], original)
                self.assertEqual(pruned["topics"][0]["paper_count"], 3)


if __name__ == "__main__":
    unittest.main()
