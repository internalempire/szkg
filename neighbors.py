"""Explain the semantic neighborhood and topic assignment of one paper."""

from __future__ import annotations

import json
import sys

from data_migration import CLUSTERS_FILE, GRAPH_FILE, migrate_local_data
from store import PaperStore


NEIGHBOR_COUNT = 8
GRAPH_THRESHOLD = 0.5


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python neighbors.py "part of a title"')
        return
    migrate_local_data()
    query = " ".join(sys.argv[1:]).lower()
    store = PaperStore(vector_dimensions=1536)
    dataset = store.read_all()
    if not dataset.keys:
        print("The local store is empty. Run 'python app.py refresh' first.")
        return

    title_by_key = dict(zip(dataset.keys, dataset.titles))
    vector_by_key = dict(zip(dataset.keys, dataset.vectors))
    abstract_by_key = {key: abstract for key, _title, abstract in store.list_metadata()}
    label_by_id: dict[int, str] = {}
    topic_by_key: dict[str, int] = {}
    weak_by_key: dict[str, bool] = {}
    links_by_key: dict[str, int] = {}
    if CLUSTERS_FILE.exists():
        clusters = json.loads(CLUSTERS_FILE.read_text(encoding="utf-8"))
        label_by_id = {topic["id"]: topic["label"] for topic in clusters.get("topics", [])}
        topic_by_key = {key: int(value) for key, value in clusters.get("assignments", {}).items()}
    if GRAPH_FILE.exists():
        graph = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
        weak_by_key = {node["id"]: bool(node.get("weak_assignment", False)) for node in graph["nodes"]}
        for edge in graph["edges"]:
            for endpoint in (edge["source"], edge["target"]):
                links_by_key[endpoint] = links_by_key.get(endpoint, 0) + 1

    def readable_topic(key: str) -> str:
        topic = topic_by_key.get(key)
        return "unclassified" if topic in (None, -1) else f"[{topic}] {label_by_id.get(topic, '?')}"

    matches = [key for key in dataset.keys if query in title_by_key.get(key, "").lower()]
    if not matches:
        print(f"No paper title contains '{query}'.")
        return
    if len(matches) > 5:
        print(f"{len(matches)} papers match; showing the first 5.\n")
        matches = matches[:5]

    for key in matches:
        print("=" * 76, title_by_key[key], f"  key: {key}", sep="\n")
        abstract = abstract_by_key.get(key, "").strip()
        print(
            f"  abstract: {len(abstract.split())} words - {abstract[:180]}"
            if abstract else "  abstract: MISSING (the embedding uses only the title)"
        )
        weak = " (weak assignment)" if weak_by_key.get(key) else ""
        print(f"  topic: {readable_topic(key)}{weak}")
        print(f"  graph links: {links_by_key.get(key, 0)}\n")
        for neighbor, similarity in store.search_neighbors(vector_by_key[key], NEIGHBOR_COUNT + 1):
            if neighbor == key:
                continue
            mark = "+" if similarity >= GRAPH_THRESHOLD else " "
            print(f" {mark} {similarity * 100:5.1f}%  {readable_topic(neighbor):34.34}  {title_by_key.get(neighbor, '')[:46]}")


if __name__ == "__main__":
    main()
