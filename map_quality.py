"""Offline projection diagnostics. Never fetch, embed, or publish a map."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from sklearn.manifold import trustworthiness
from sklearn.metrics import pairwise_distances


def projection_quality(keys, vectors, positions, sample_size=500, neighbors=8):
    """Measure local structure on a deterministic, bounded sample.

    Both input and output neighborhoods are restricted to the same sample.
    These scores are not estimates of semantic correctness or full-library kNN.
    """
    if not 3 <= sample_size <= 2000 or neighbors < 1:
        raise ValueError("Use a sample size from 3 to 2000 and at least one neighbor.")
    vectors, positions = np.asarray(vectors), np.asarray(positions)
    if vectors.ndim != 2 or positions.shape != (len(keys), 2) or len(vectors) != len(keys):
        raise ValueError("Keys, vectors and 2D positions must have matching rows.")
    if not np.isfinite(vectors).all() or not np.isfinite(positions).all():
        raise ValueError("Vectors and positions must be finite.")
    indices = sorted(range(len(keys)), key=lambda i: hashlib.sha256(keys[i].encode()).digest())[:sample_size]
    count = len(indices)
    report = {"total_papers": len(keys), "sample_papers": count,
              "sample_digest": hashlib.sha256("\n".join(keys[i] for i in indices).encode()).hexdigest(),
              "input_metric": "cosine", "output_metric": "euclidean"}
    if count < 3:
        return {**report, "neighbors": 0, "trustworthiness": None,
                "neighbor_overlap": None, "reason": "At least three papers are required."}
    k = min(neighbors, (count - 1) // 2)
    high, low = vectors[indices], positions[indices]
    high_distances = pairwise_distances(high, metric="cosine")
    low_distances = pairwise_distances(low, metric="euclidean")
    np.fill_diagonal(high_distances, np.inf)
    np.fill_diagonal(low_distances, np.inf)
    high_neighbors = np.argsort(high_distances, axis=1, kind="stable")[:, :k]
    low_neighbors = np.argsort(low_distances, axis=1, kind="stable")[:, :k]
    overlap = np.mean([len(set(a) & set(b)) / k for a, b in zip(high_neighbors, low_neighbors)])
    return {**report, "neighbors": k,
            "trustworthiness": float(trustworthiness(high, low, n_neighbors=k, metric="cosine")),
            "neighbor_overlap": float(overlap)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample-size", type=int, default=500, help="3–2000; default 500")
    parser.add_argument("--neighbors", type=int, default=8)
    parser.add_argument("--compare-compaction", action="store_true",
                        help="Recompute a layout in memory; may take minutes. Does not publish it.")
    args = parser.parse_args()
    if not 3 <= args.sample_size <= 2000 or args.neighbors < 1:
        parser.error("Use --sample-size 3–2000 and --neighbors >= 1.")

    # Opening an existing table explicitly avoids PaperStore's create-if-missing path.
    import lancedb
    from work_lock import exclusive_work
    from profiles import select_profile
    root = select_profile(Path(__file__).parent).data_dir
    if not (root / "lancedb").is_dir() or not (root / "graph.json").is_file():
        parser.error("An existing local cache and map are required. Nothing was created.")
    with exclusive_work():
        graph = json.loads((root / "graph.json").read_text(encoding="utf-8"))
        table = lancedb.connect(str(root / "lancedb")).open_table("papers")
        rows = table.to_arrow().to_pylist()
        by_key = {row["key"]: row for row in rows}
        nodes = sorted((n for n in graph["nodes"] if n["id"] in by_key), key=lambda n: n["id"])
        keys = [n["id"] for n in nodes]
        dimensions = table.schema.field("vector").type.list_size
        vectors = np.array([by_key[key]["vector"] for key in keys]).reshape(len(keys), dimensions)
        positions = np.array([[n["x"], n["y"]] for n in nodes]).reshape(len(keys), 2)
        def text_changed(node):
            row = by_key[node["id"]]
            digest = hashlib.sha256(json.dumps([row["title"], row["abstract"]], ensure_ascii=False).encode()).hexdigest()
            return node.get("content_fingerprint") is not None and node["content_fingerprint"] != digest
        report = {
            "warning": "Projection fidelity is not scientific validity. Scores compare neighbors within the sample only.",
            "map_revision": graph.get("revision"),
            "pending_rebuild": sum(bool(n.get("needs_rebuild")) for n in nodes),
            "history_known": bool(graph.get("status", {}).get("status_known")),
            "unreconciled_text_changes": sum(text_changed(n) for n in nodes),
            "unknown_fingerprints": sum(n.get("content_fingerprint") is None for n in nodes),
            "embedding_dimensions": dimensions,
            "embedding_models": sorted({row["model"] or "unknown" for row in rows}),
            "cached_without_map_position": len(set(by_key) - set(keys)),
            "mapped_without_cached_vector": len(graph["nodes"]) - len(nodes),
            "missing_abstracts": sum(not by_key[key].get("abstract", "").strip() for key in keys),
            "unclassified": sum(n["cluster"] == -1 for n in nodes),
            "weak_assignments": sum(bool(n.get("weak_assignment")) for n in nodes),
            "published_layout": projection_quality(keys, vectors, positions, args.sample_size, args.neighbors),
        }
        if args.compare_compaction:
            from layout import calculate_positions, _compact_topic_positions
            raw = calculate_positions(vectors)
            compacted = _compact_topic_positions(raw, [n["cluster"] for n in nodes],
                                                 [n.get("weak_assignment", False) for n in nodes])
            report["comparison_note"] = "Fresh layout using current vectors and published topic assignments, not historical pre-compaction coordinates."
            report["recomputed_before_compaction"] = projection_quality(keys, vectors, raw, args.sample_size, args.neighbors)
            report["recomputed_after_compaction"] = projection_quality(keys, vectors, compacted, args.sample_size, args.neighbors)
        print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
