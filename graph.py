"""Build an undirected k-nearest-neighbor semantic similarity graph."""

from __future__ import annotations

from dataclasses import dataclass

from store import PaperStore


@dataclass
class Edge:
    """A similarity link between two Zotero items."""

    source: str
    target: str
    weight: float  # Cosine similarity from 0 to 1.


def build_graph(store: PaperStore, k: int = 8, threshold: float = 0.5) -> list[Edge]:
    """Connect each paper to at most ``k`` sufficiently similar neighbors.

    k-NN is asymmetric, but the visualization does not need two lines between
    A and B. Sorted endpoint pairs deduplicate both directions, retaining the
    strongest similarity observed.
    """
    dataset = store.read_all()
    if not dataset.keys:
        return []

    links: dict[tuple[str, str], float] = {}
    for key, vector in zip(dataset.keys, dataset.vectors):
        for neighbor_key, similarity in store.search_neighbors(vector, k=k + 1):
            if neighbor_key == key or similarity < threshold:
                continue
            pair = tuple(sorted((key, neighbor_key)))
            links[pair] = max(similarity, links.get(pair, 0.0))

    return [
        Edge(source=a, target=b, weight=round(weight, 4))
        for (a, b), weight in links.items()
    ]
