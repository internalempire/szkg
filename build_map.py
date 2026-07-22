"""Legacy verbose entry point for a full map build and textual report.

New users should prefer ``python app.py refresh``. This script remains useful
for inspecting discovered topics and graph shape from the terminal.
"""

from __future__ import annotations

import json

from data_migration import GRAPH_FILE
from pipeline import commit_sync_state, rebuild_map, sync_embeddings


def main() -> None:
    print("=" * 72, "STEP 1 - Synchronize embeddings", "=" * 72, sep="\n")
    store, sync_result = sync_embeddings(limit=None, verbose=True)
    print("\n" + "=" * 72, "STEP 2 - Build graph and topics", "=" * 72, sep="\n")
    result = rebuild_map(store, k=8, threshold=0.5, minimum_topic_size=5, verbose=True)
    commit_sync_state(sync_result)

    dataset = store.read_all()
    examples: dict[int, list[str]] = {}
    for title, topic in zip(dataset.titles, result.assignments):
        examples.setdefault(topic, [])
        if len(examples[topic]) < 3:
            examples[topic].append(title)

    print("\n" + "=" * 72, "TOPICS FOUND", "=" * 72, sep="\n")
    for topic in sorted(result.topics, key=lambda value: (value.id == -1, -value.paper_count)):
        print(f"\n[{topic.id}] {topic.label} - {topic.paper_count} papers")
        for title in examples.get(topic.id, []):
            print(f"  - {title}")

    graph = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
    connected = {endpoint for edge in graph["edges"] for endpoint in (edge["source"], edge["target"])}
    node_count, edge_count = len(graph["nodes"]), len(graph["edges"])
    weak_count = sum(result.weak_assignments)
    unclassified_count = sum(value == -1 for value in result.assignments)
    print("\n" + "=" * 72, "MAP SHAPE", "=" * 72, sep="\n")
    print(f"  Papers:              {node_count}")
    print(f"  Similarity links:    {edge_count}")
    print(f"  Isolated papers:     {node_count - len(connected)}")
    print(f"  Core topic members:  {node_count - weak_count - unclassified_count}")
    print(f"  Weak assignments:    {weak_count}")
    print(f"  Unclassified:        {unclassified_count}")


if __name__ == "__main__":
    main()
