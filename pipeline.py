"""Coordinate Zotero, embeddings, storage, graph, topics, and map output.

The guiding strategy is "fast now, precise later": ``sync_library`` appends new
papers without moving the existing map, while ``rebuild_map`` periodically
recomputes the globally optimized graph, topics, and layout.
"""

from __future__ import annotations

import json
import random
from collections import Counter
from dataclasses import dataclass, field

from clustering import ClusteringResult, cluster_papers
from config import load_openai_api_key, load_zotero_config
from costs import CostTracker, count_tokens, estimate_cost, format_usd
from data_migration import CLUSTERS_FILE, GRAPH_FILE, STATE_FILE, migrate_local_data
from embeddings import OpenAIEmbeddingProvider
from graph import build_graph
from layout import calculate_positions
from store import PaperStore
from zotero_source import PyzoteroSource


_PROGRESS_BATCH_SIZE = 200


def _load_state() -> dict:
    migrate_local_data()
    return json.loads(STATE_FILE.read_text(encoding="utf-8")) if STATE_FILE.exists() else {}


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


@dataclass
class SyncResult:
    """Observable outcome of one embedding synchronization."""

    total_in_zotero: int
    already_present: int
    newly_embedded: int
    tokens_used: int
    cost: float
    new_keys: list[str] = field(default_factory=list)
    updated_keys: list[str] = field(default_factory=list)


def _partition_by_change(
    papers: list, cached_text: dict[str, tuple[str, str]]
) -> tuple[list, list]:
    """Split incoming Zotero papers into never-seen and text-changed groups.

    ``cached_text`` maps a Zotero key to its cached ``(title, abstract)``. A paper
    is "new" when its key is absent and "changed" when the key exists but the
    title or abstract differs; an unchanged paper is returned in neither list.
    Comparing the semantic text rather than the Zotero version avoids paying to
    re-embed papers whose only change was an unrelated field such as a tag or a
    collection membership.
    """
    new_papers: list = []
    changed_papers: list = []
    for paper in papers:
        cached = cached_text.get(paper.key)
        if cached is None:
            new_papers.append(paper)
        elif (paper.title, paper.abstract) != cached:
            changed_papers.append(paper)
    return new_papers, changed_papers


def sync_embeddings(
    limit: int | None = None, verbose: bool = True
) -> tuple[PaperStore, SyncResult]:
    """Fetch and embed only papers that are not already cached locally."""
    migrate_local_data(verbose=verbose)
    source = PyzoteroSource(load_zotero_config())
    state = _load_state()
    known_version = state.get("last_zotero_version")

    if known_version is not None and limit is None:
        if verbose:
            print(f"-> Asking Zotero for changes since version {known_version}...")
        papers, current_version = source.fetch_since(known_version)
    else:
        if verbose:
            print("-> Downloading the paper list from Zotero...")
        papers, current_version = source.fetch_all(limit=limit)

    provider = OpenAIEmbeddingProvider(api_key=load_openai_api_key())
    store = PaperStore(vector_dimensions=provider.dimensions)
    cached_text = {key: (title, abstract) for key, title, abstract in store.list_metadata()}
    new_papers, changed_papers = _partition_by_change(papers, cached_text)
    pending = new_papers + changed_papers

    if verbose:
        print(
            f"  {len(papers)} papers returned by Zotero, {len(cached_text)} cached, "
            f"{len(new_papers)} new, {len(changed_papers)} with edited text to re-embed."
        )

    tracker = CostTracker(model=provider.model_name)
    if pending:
        all_texts = [paper.combined_text() for paper in pending]
        estimated_tokens = [count_tokens(text, provider.model_name) for text in all_texts]
        if verbose:
            token_total = sum(estimated_tokens)
            print(
                f"  Estimate: ~{token_total:,} tokens, expected cost "
                f"~{format_usd(estimate_cost(token_total, provider.model_name))}."
            )

        for start in range(0, len(pending), _PROGRESS_BATCH_SIZE):
            batch = pending[start : start + _PROGRESS_BATCH_SIZE]
            texts = [paper.combined_text() for paper in batch]
            per_paper_tokens = [count_tokens(text, provider.model_name) for text in texts]
            result = provider.embed_batch(texts)
            tracker.record(tokens=result.tokens_used, paper_count=len(batch))
            # ``upsert`` appends brand-new keys and replaces the row of any paper
            # whose text changed, so a re-embedded paper never duplicates a row.
            store.upsert(
                papers=batch,
                vectors=result.vectors,
                token_per_paper=per_paper_tokens,
                model=provider.model_name,
            )
            if verbose:
                processed = min(start + len(batch), len(pending))
                print(f"  ...embedded {processed}/{len(pending)}")
        if verbose:
            print("\n" + tracker.summary())
    elif verbose:
        print("  No new papers: no API request and zero cost.")

    if limit is None:
        state["last_zotero_version"] = current_version
        _save_state(state)

    return store, SyncResult(
        total_in_zotero=len(papers),
        already_present=len(cached_text),
        newly_embedded=len(pending),
        tokens_used=tracker.total_tokens,
        cost=tracker.total_cost,
        new_keys=[paper.key for paper in new_papers],
        updated_keys=[paper.key for paper in changed_papers],
    )


def rebuild_map(
    store: PaperStore,
    k: int = 8,
    threshold: float = 0.5,
    minimum_topic_size: int = 5,
    min_samples: int = 3,
    assign_outliers: bool = True,
    verbose: bool = True,
) -> ClusteringResult:
    """Recompute graph, topics, and positions for the complete local library."""
    migrate_local_data(verbose=verbose)
    dataset = store.read_all()
    if not dataset.keys:
        raise SystemExit("The local store is empty. Run embedding synchronization first.")

    if verbose:
        print(f"-> Building the graph (k={k}, threshold={threshold}) for {len(dataset.keys)} papers...")
    edges = build_graph(store, k=k, threshold=threshold)
    if verbose:
        print(f"-> Grouping papers into topics (minimum size {minimum_topic_size})...")
    result = cluster_papers(
        dataset.vectors,
        dataset.texts,
        minimum_topic_size=minimum_topic_size,
        min_samples=min_samples,
        assign_outliers=assign_outliers,
        assignment_threshold=threshold,
    )
    if verbose:
        print("-> Calculating map positions (PCA + t-SNE)...")
    positions = calculate_positions(dataset.vectors)

    key_to_topic = dict(zip(dataset.keys, result.assignments))
    key_to_weak = dict(zip(dataset.keys, result.weak_assignments))
    topic_to_label = {topic.id: topic.label for topic in result.topics}
    nodes = [
        {
            "id": key,
            "title": title,
            "cluster": int(key_to_topic[key]),
            "cluster_label": topic_to_label.get(key_to_topic[key], ""),
            "weak_assignment": bool(key_to_weak[key]),
            "x": float(positions[index][0]),
            "y": float(positions[index][1]),
        }
        for index, (key, title) in enumerate(zip(dataset.keys, dataset.titles))
    ]
    edge_data = [
        {"source": edge.source, "target": edge.target, "weight": edge.weight}
        for edge in edges
    ]
    GRAPH_FILE.parent.mkdir(parents=True, exist_ok=True)
    GRAPH_FILE.write_text(
        json.dumps({"nodes": nodes, "edges": edge_data}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    topic_data = [
        {
            "id": topic.id,
            "label": topic.label,
            "keywords": topic.keywords,
            "paper_count": topic.paper_count,
        }
        for topic in result.topics
    ]
    CLUSTERS_FILE.write_text(
        json.dumps(
            {"topics": topic_data, "assignments": {k: int(v) for k, v in key_to_topic.items()}},
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    if verbose:
        print(f"  Saved {GRAPH_FILE.name} ({len(edge_data)} edges) and {CLUSTERS_FILE.name}.")
    return result


def add_to_map_incrementally(
    store: PaperStore,
    new_keys: list[str],
    updated_keys: list[str] | None = None,
    k: int = 8,
    threshold: float = 0.5,
    verbose: bool = True,
) -> None:
    """Attach new papers without moving or reclustering existing papers.

    Papers in ``updated_keys`` were re-embedded because their text changed. Only
    their displayed title is corrected in place here; their position, links, and
    topic depend on the fresh vector and are recomputed by a full ``refresh``.
    """
    migrate_local_data(verbose=verbose)
    if not GRAPH_FILE.exists() or not CLUSTERS_FILE.exists():
        if verbose:
            print("-> No existing map; performing a full rebuild.")
        rebuild_map(store, k=k, threshold=threshold, verbose=verbose)
        return

    graph_data = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
    clusters_data = json.loads(CLUSTERS_FILE.read_text(encoding="utf-8"))
    assignments = {key: int(value) for key, value in clusters_data.get("assignments", {}).items()}
    label_by_id = {topic["id"]: topic["label"] for topic in clusters_data.get("topics", [])}
    positions = {node["id"]: (node.get("x", 0.0), node.get("y", 0.0)) for node in graph_data["nodes"]}
    node_ids = set(positions)
    edge_ids = {(edge["source"], edge["target"]) for edge in graph_data["edges"]}

    dataset = store.read_all()
    vector_by_key = dict(zip(dataset.keys, dataset.vectors))
    title_by_key = dict(zip(dataset.keys, dataset.titles))
    to_add = [key for key in new_keys if key not in node_ids and key in vector_by_key]

    for key in to_add:
        neighbors = [
            (neighbor, similarity)
            for neighbor, similarity in store.search_neighbors(vector_by_key[key], k=k + 1)
            if neighbor != key
        ]
        for neighbor, similarity in neighbors:
            if similarity < threshold:
                continue
            pair = tuple(sorted((key, neighbor)))
            if pair not in edge_ids:
                graph_data["edges"].append(
                    {"source": pair[0], "target": pair[1], "weight": round(similarity, 4)}
                )
                edge_ids.add(pair)

        votes: dict[int, float] = {}
        for neighbor, similarity in neighbors:
            neighbor_topic = assignments.get(neighbor)
            if similarity >= threshold and neighbor_topic not in (None, -1):
                votes[neighbor_topic] = votes.get(neighbor_topic, 0.0) + similarity
        topic = max(votes, key=votes.get) if votes else -1

        neighbor_positions = [positions[n] for n, _ in neighbors if n in positions]
        if neighbor_positions:
            x = sum(point[0] for point in neighbor_positions) / len(neighbor_positions)
            y = sum(point[1] for point in neighbor_positions) / len(neighbor_positions)
            x += (random.random() - 0.5) * 30
            y += (random.random() - 0.5) * 30
        else:
            x, y = 0.0, 0.0

        graph_data["nodes"].append(
            {
                "id": key,
                "title": title_by_key.get(key, ""),
                "cluster": int(topic),
                "cluster_label": label_by_id.get(topic, "unclassified" if topic == -1 else ""),
                "weak_assignment": topic != -1,
                "x": float(x),
                "y": float(y),
            }
        )
        positions[key] = (x, y)
        assignments[key] = int(topic)

    # Correct the displayed title of re-embedded papers already on the map. Their
    # cached vector is fresh, but repositioning them waits for a full ``refresh``.
    updated_titles = 0
    for key in set(updated_keys or ()):
        if key not in node_ids or key not in title_by_key:
            continue
        fresh_title = title_by_key[key]
        for node in graph_data["nodes"]:
            if node["id"] == key and node.get("title") != fresh_title:
                node["title"] = fresh_title
                updated_titles += 1
                break

    if not to_add and not updated_titles:
        if verbose:
            print("  No new or edited papers to apply to the map.")
        return

    counts = Counter(assignments.values())
    for topic_data in clusters_data["topics"]:
        topic_data["paper_count"] = int(counts.get(topic_data["id"], 0))
    clusters_data["assignments"] = assignments
    GRAPH_FILE.write_text(json.dumps(graph_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CLUSTERS_FILE.write_text(
        json.dumps(clusters_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if verbose:
        summary = []
        if to_add:
            summary.append(f"added {len(to_add)} new papers")
        if updated_titles:
            summary.append(f"refreshed {updated_titles} edited titles (run refresh to reposition)")
        print(f"  Map updated: {', '.join(summary)}.")


def sync_library(k: int = 8, threshold: float = 0.5, verbose: bool = True) -> None:
    """Run the fast daily workflow: embed and attach new or edited papers."""
    store, result = sync_embeddings(verbose=verbose)
    if not result.new_keys and not result.updated_keys and GRAPH_FILE.exists():
        if verbose:
            print("\nNothing new: the map is already up to date.")
        return
    if verbose:
        print("\n-> Updating the map...")
    add_to_map_incrementally(
        store,
        result.new_keys,
        updated_keys=result.updated_keys,
        k=k,
        threshold=threshold,
        verbose=verbose,
    )
