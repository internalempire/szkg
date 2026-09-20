"""Coordinate Zotero, embeddings, storage, graph, topics, and map output.

The guiding strategy is "fast now, precise later": ``sync_library`` appends new
papers without moving the existing map, while ``rebuild_map`` periodically
recomputes the globally optimized graph, topics, and layout.
"""

from __future__ import annotations

import hashlib
import json
import random
import uuid
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

from clustering import ClusteringResult, cluster_papers
from config import ZoteroConfig, load_openai_api_key, load_zotero_config
from costs import CostTracker, count_tokens, estimate_cost, format_usd
from data_migration import CLUSTERS_FILE, GRAPH_FILE, STATE_FILE, migrate_local_data
from embeddings import (
    DEFAULT_EMBEDDING_DIMENSIONS,
    DEFAULT_EMBEDDING_MODEL,
    OpenAIEmbeddingProvider,
    OpenRouterEmbeddingProvider,
)
from graph import build_graph
from json_io import write_json_atomically
from layout import calculate_positions
from store import PaperStore
from topic_identity import initialize_identities, reconcile_topics
from zotero_source import PyzoteroSource
from profiles import CURRENT, profile_path
from papers_source import PapersSource, PapersError


# Display-only metadata (title, authors, abstract) for the viewer's detail panel.
# Kept separate from the embedding cache and graph.json so the vector store and
# the renderer-neutral graph contract stay untouched.
METADATA_FILE = GRAPH_FILE.parent / "metadata.json"
VIEWER_CONFIG_FILE = GRAPH_FILE.parent / "viewer.json"
_PROGRESS_BATCH_SIZE = 200


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def content_fingerprint(title: str, abstract: str) -> str:
    """Identify exact semantic input without copying abstracts into the graph."""
    encoded = json.dumps([title, abstract], ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _full_rebuild_status() -> dict:
    return {
        "status_known": True,
        "last_full_rebuild_at": _utc_now(),
        "last_sync_at": None,
    }


def _load_state() -> dict:
    migrate_local_data()
    path = profile_path(STATE_FILE)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def _save_state(state: dict) -> None:
    write_json_atomically(profile_path(STATE_FILE), state)


def _update_metadata_file(papers: list) -> None:
    """Merge display metadata for the given papers into ``data/metadata.json``.

    The viewer reads this file to show authors and the full abstract in the paper
    detail panel. A full Zotero read covers every paper; an incremental read only
    refreshes the papers it returned, leaving the rest untouched.
    """
    metadata: dict = {}
    if profile_path(METADATA_FILE).exists():
        try:
            metadata = json.loads(profile_path(METADATA_FILE).read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            metadata = {}
    for paper in papers:
        metadata[paper.key] = {
            "title": paper.title,
            "authors": paper.authors,
            "journal": paper.journal,
            "year": paper.year,
            "abstract": paper.abstract,
        }
    write_json_atomically(profile_path(METADATA_FILE), metadata, indent=None)


def _remove_metadata_keys(keys: set[str]) -> None:
    """Remove display metadata for papers no longer present in the local cache."""
    if not keys or not profile_path(METADATA_FILE).exists():
        return
    try:
        metadata = json.loads(profile_path(METADATA_FILE).read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return
    changed = False
    for key in keys:
        if key in metadata:
            del metadata[key]
            changed = True
    if changed:
        write_json_atomically(profile_path(METADATA_FILE), metadata, indent=None)


def _update_viewer_config(config: ZoteroConfig) -> None:
    """Publish non-secret library identity used to build Zotero desktop links."""
    write_json_atomically(
        profile_path(VIEWER_CONFIG_FILE),
        CURRENT.get().viewer() if CURRENT.get() else {"library_id": config.library_id, "library_type": config.library_type},
    )


@dataclass
class SyncResult:
    """Observable outcome of one embedding synchronization."""

    total_in_zotero: int
    already_present: int
    newly_embedded: int
    tokens_used: int
    cost: float
    current_version: int
    new_keys: list[str] = field(default_factory=list)
    updated_keys: list[str] = field(default_factory=list)
    removed_keys: list[str] = field(default_factory=list)
    library_id: str = ""
    library_type: str = ""
    source: str = "zotero"


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


def _validate_library_identity(state: dict, config: ZoteroConfig) -> None:
    """Prevent one library's incremental state from pruning another library."""
    stored_id = state.get("zotero_library_id")
    stored_type = state.get("zotero_library_type")
    if stored_id is None and stored_type is None:
        return
    if stored_id != config.library_id or stored_type != config.library_type:
        raise SystemExit(
            "The configured Zotero library does not match the local cache state.\n"
            "Use the original library configuration or move the current data directory "
            "before starting a separate library."
        )


def sync_embeddings(
    limit: int | None = None, verbose: bool = True, force_full: bool = False,
    before_apply: Callable[[dict], None] | None = None,
    progress: Callable[[str], None] | None = None,
) -> tuple[PaperStore, SyncResult]:
    """Fetch and embed only papers that are not already cached locally.

    ``force_full`` fetches the whole library instead of only the changes since the
    saved version, so display metadata for every paper is refreshed (used by
    ``refresh``). It does not change what is embedded: cached papers are skipped.
    """
    migrate_local_data(verbose=verbose)
    profile = CURRENT.get()
    source_name = profile.source_name if profile else "Zotero"
    service_name = profile.service_name if profile else "OpenAI"
    model = profile.model if profile else DEFAULT_EMBEDDING_MODEL
    state = _load_state()
    if profile and profile.source == "papers":
        if not profile.papers_client or not profile.library_id:
            raise PapersError("Connect Papers and choose a collection before previewing.")
        zotero_config = ZoteroConfig(profile.library_id, "collection", "")
        source = PapersSource(profile.papers_client, profile.library_id)
        if state.get("profile_id") not in (None, profile.identity):
            raise PapersError("This cache belongs to another connector profile.")
    else:
        zotero_config = (ZoteroConfig(profile.library_id, profile.library_type, profile.settings["ZOTERO_API_KEY"])
                         if profile else load_zotero_config())
        _validate_library_identity(state, zotero_config)
        source = PyzoteroSource(zotero_config)
    known_version = state.get("last_zotero_version")

    incremental = known_version is not None and limit is None and not force_full and not (profile and profile.source == "papers")
    source_removed_keys: set[str] = set()
    if progress:
        progress(f"Reading {source_name} metadata. No texts have been sent to {service_name}.")
    if incremental:
        if verbose:
            print(f"-> Asking Zotero for changes since version {known_version}...")
        changes = source.fetch_changes_since(known_version)
        papers = changes.papers
        current_version = changes.current_version
        source_removed_keys = changes.removed_keys
    else:
        if verbose:
            print(f"-> Downloading the paper list from {source_name}...")
        papers, current_version = source.fetch_all(limit=limit)

    store = PaperStore(
        vector_dimensions=DEFAULT_EMBEDDING_DIMENSIONS,
        expected_model=model,
    )
    cached_text = {key: (title, abstract) for key, title, abstract in store.list_metadata()}
    cached_keys = set(cached_text)
    if incremental:
        keys_to_prune = cached_keys.intersection(source_removed_keys)
    elif limit is None:
        keys_to_prune = cached_keys - {paper.key for paper in papers}
    else:
        keys_to_prune = set()

    new_papers, changed_papers = _partition_by_change(papers, cached_text)
    pending = new_papers + changed_papers
    # The browser confirms this exact in-memory input, not a second remote read.
    # Pause before deleting cached records or publishing display metadata.
    if before_apply:
        token_total = sum(count_tokens(p.combined_text(), model) for p in pending)
        before_apply({
            "papers_read": len(papers), "cached": len(cached_text),
            "new": len(new_papers), "edited": len(changed_papers),
            "removed": len(keys_to_prune), "tokens": token_total,
            "estimated_usd": estimate_cost(token_total, model),
            "model": model, "source": source_name, "service": service_name,
            "missing_abstracts": sum(not p.abstract.strip() for p in papers),
        })
    _update_metadata_file(papers)
    _update_viewer_config(zotero_config)
    if keys_to_prune:
        store.delete_keys(keys_to_prune)
        _remove_metadata_keys(keys_to_prune)
        cached_text = {
            key: value for key, value in cached_text.items() if key not in keys_to_prune
        }

    if verbose:
        print(
            f"  {len(papers)} papers returned by {source_name}, {len(cached_text)} cached, "
            f"{len(new_papers)} new, {len(changed_papers)} with edited text to re-embed, "
            f"{len(keys_to_prune)} removed locally."
        )

    tracker = CostTracker(model=model)
    if pending:
        # Loading the key and constructing the client are unnecessary when the
        # cache is already current. This keeps zero-cost syncs independent from
        # OpenAI configuration.
        if profile and not profile.api_key:
            raise SystemExit(f"Add a {service_name} API key before applying new embeddings.")
        provider = (OpenRouterEmbeddingProvider(profile.api_key) if profile and profile.service == "openrouter"
                    else OpenAIEmbeddingProvider(api_key=profile.api_key if profile else load_openai_api_key()))
        all_texts = [paper.combined_text() for paper in pending]
        estimated_tokens = [count_tokens(text, provider.model_name) for text in all_texts]
        if verbose:
            token_total = sum(estimated_tokens)
            print(
                f"  Estimate: ~{token_total:,} tokens, expected cost "
                f"~{format_usd(estimate_cost(token_total, provider.model_name))}."
            )

        for start in range(0, len(pending), _PROGRESS_BATCH_SIZE):
            if progress:
                progress(f"Embedding papers: {start}/{len(pending)} complete.")
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
        if progress:
            progress(f"Embedding complete: {len(pending)} papers, {tracker.total_tokens:,} tokens used.")
        if verbose:
            print("\n" + tracker.summary())
    elif verbose:
        print("  No new papers: no API request and zero cost.")

    return store, SyncResult(
        total_in_zotero=len(papers),
        already_present=len(cached_text),
        newly_embedded=len(pending),
        tokens_used=tracker.total_tokens,
        cost=tracker.total_cost,
        current_version=current_version,
        new_keys=[paper.key for paper in new_papers],
        updated_keys=[paper.key for paper in changed_papers],
        removed_keys=sorted(keys_to_prune),
        library_id=zotero_config.library_id,
        library_type=zotero_config.library_type,
        source=profile.source if profile else "zotero",
    )


def commit_sync_state(result: SyncResult) -> None:
    """Advance Zotero state only after all requested local outputs succeeded."""
    # Publish the visible completion time before advancing the source cursor.
    # If either write fails, the next sync can safely repeat reconciliation.
    graph_data, clusters_data = _load_map_snapshot()
    completed_at = _utc_now()
    graph_data.setdefault("status", {})["last_sync_at"] = completed_at
    _publish_map(graph_data, clusters_data)
    state = _load_state()
    if result.source == "zotero":
        state["last_zotero_version"] = result.current_version
    state["last_sync_at"] = completed_at
    if result.library_id and result.source == "zotero":
        state["zotero_library_id"] = result.library_id
    if result.library_type and result.source == "zotero":
        state["zotero_library_type"] = result.library_type
    if CURRENT.get():
        state.update(CURRENT.get().viewer())
    _save_state(state)


def _publish_map(graph_data: dict, clusters_data: dict) -> None:
    """Publish a matching pair of atomically written map documents."""
    initialize_identities(clusters_data)
    revision = uuid.uuid4().hex
    status = graph_data.setdefault("status", {})
    # Legacy maps cannot prove whether old abstract edits were incorporated.
    status.setdefault("status_known", False)
    status.setdefault("last_full_rebuild_at", None)
    status.setdefault("last_sync_at", None)
    status["pending_paper_count"] = sum(
        bool(node.get("needs_rebuild", False)) for node in graph_data["nodes"]
    )
    graph_data["revision"] = revision
    clusters_data["revision"] = revision
    # Readers reject mismatched revisions. Publishing the graph last makes it
    # the effective commit marker for a complete map snapshot.
    if CURRENT.get():
        graph_data["profile_id"] = clusters_data["profile_id"] = CURRENT.get().identity
    write_json_atomically(profile_path(CLUSTERS_FILE), clusters_data)
    write_json_atomically(profile_path(GRAPH_FILE), graph_data)


def _load_map_snapshot() -> tuple[dict, dict]:
    """Load a graph/topic pair only when both belong to one publication."""
    graph_data = json.loads(profile_path(GRAPH_FILE).read_text(encoding="utf-8"))
    clusters_data = json.loads(profile_path(CLUSTERS_FILE).read_text(encoding="utf-8"))
    graph_revision = graph_data.get("revision")
    clusters_revision = clusters_data.get("revision")
    if graph_revision != clusters_revision:
        raise ValueError("graph.json and clusters.json belong to different revisions")
    return graph_data, clusters_data


def rebuild_map(
    store: PaperStore,
    k: int = 8,
    threshold: float = 0.5,
    minimum_topic_size: int = 5,
    min_samples: int = 1,  # see cluster_papers: keeps dense topics from merging
    assign_outliers: bool = True,
    verbose: bool = True,
    progress: Callable[[str], None] | None = None,
) -> ClusteringResult:
    """Recompute graph, topics, and positions for the complete local library."""
    migrate_local_data(verbose=verbose)
    dataset = store.read_all()
    try:
        previous_graph, previous_clusters = _load_map_snapshot()
    except (OSError, ValueError, KeyError, TypeError):
        previous_graph, previous_clusters = {}, {"topics": []}
    if not dataset.keys:
        _publish_map({"nodes": [], "edges": [], "status": _full_rebuild_status()},
                     {"topics": [], "assignments": {},
                      "next_color_index": previous_clusters.get("next_color_index", 0)})
        if verbose:
            print("-> The local store is empty; published an empty map.")
        return ClusteringResult(assignments=[], topics=[], weak_assignments=[])

    if verbose:
        print(f"-> Building the graph (k={k}, threshold={threshold}) for {len(dataset.keys)} papers...")
    if progress:
        progress("Building semantic links from cached vectors.")
    edges = build_graph(store, k=k, threshold=threshold)
    if verbose:
        print(f"-> Grouping papers into topics (minimum size {minimum_topic_size})...")
    if progress:
        progress("Discovering topics. This local calculation can take a while.")
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
    if progress:
        progress("Calculating the new layout locally. Papers may move.")
    positions = calculate_positions(
        dataset.vectors,
        assignments=result.assignments,
        weak_assignments=result.weak_assignments,
    )

    key_to_topic = dict(zip(dataset.keys, result.assignments))
    key_to_weak = dict(zip(dataset.keys, result.weak_assignments))
    topic_to_label = {topic.id: topic.label for topic in result.topics}
    fingerprints = {
        key: content_fingerprint(title, abstract)
        for key, title, abstract in store.list_metadata()
    }
    nodes = [
        {
            "id": key,
            "title": title,
            "cluster": int(key_to_topic[key]),
            "cluster_label": topic_to_label.get(key_to_topic[key], ""),
            "weak_assignment": bool(key_to_weak[key]),
            "content_fingerprint": fingerprints[key],
            "needs_rebuild": False,
            "x": float(positions[index][0]),
            "y": float(positions[index][1]),
        }
        for index, (key, title) in enumerate(zip(dataset.keys, dataset.titles))
    ]
    edge_data = [
        {"source": edge.source, "target": edge.target, "weight": edge.weight}
        for edge in edges
    ]
    topic_data = [
        {
            "id": topic.id,
            "label": topic.label,
            "keywords": topic.keywords,
            "paper_count": topic.paper_count,
        }
        for topic in result.topics
    ]
    clusters_data = {"topics": topic_data, "assignments": {k: int(v) for k, v in key_to_topic.items()}}
    reconcile_topics(nodes, clusters_data, previous_graph, previous_clusters)
    _publish_map(
        {"nodes": nodes, "edges": edge_data, "status": _full_rebuild_status()},
        clusters_data,
    )
    if verbose:
        print(f"  Saved {GRAPH_FILE.name} ({len(edge_data)} edges) and {CLUSTERS_FILE.name}.")
    return result


def add_to_map_incrementally(
    store: PaperStore,
    new_keys: list[str],
    updated_keys: list[str] | None = None,
    removed_keys: list[str] | None = None,
    k: int = 8,
    threshold: float = 0.5,
    verbose: bool = True,
) -> None:
    """Attach new papers without moving or reclustering existing papers.

    Papers in ``updated_keys`` were re-embedded because their text changed. Only
    their displayed title is corrected in place here; their position, links, and
    topic depend on the fresh vector and are recomputed by a full ``refresh``.
    ``removed_keys`` are pruned from nodes, edges, and topic assignments.
    """
    migrate_local_data(verbose=verbose)
    if not profile_path(GRAPH_FILE).exists() or not profile_path(CLUSTERS_FILE).exists():
        if verbose:
            print("-> No existing map; performing a full rebuild.")
        rebuild_map(store, k=k, threshold=threshold, verbose=verbose)
        return

    try:
        graph_data, clusters_data = _load_map_snapshot()
    except (OSError, json.JSONDecodeError, ValueError) as error:
        if verbose:
            print(f"-> Existing map is incomplete ({error}); performing a full rebuild.")
        rebuild_map(store, k=k, threshold=threshold, verbose=verbose)
        return
    assignments = {key: int(value) for key, value in clusters_data.get("assignments", {}).items()}
    initialize_identities(clusters_data)
    label_by_id = {topic["id"]: topic["label"] for topic in clusters_data.get("topics", [])}
    positions = {node["id"]: (node.get("x", 0.0), node.get("y", 0.0)) for node in graph_data["nodes"]}
    node_ids = set(positions)
    edge_ids = {(edge["source"], edge["target"]) for edge in graph_data["edges"]}

    to_remove = node_ids.intersection(removed_keys or ())
    if to_remove:
        graph_data["nodes"] = [
            node for node in graph_data["nodes"] if node["id"] not in to_remove
        ]
        graph_data["edges"] = [
            edge
            for edge in graph_data["edges"]
            if edge["source"] not in to_remove and edge["target"] not in to_remove
        ]
        for key in to_remove:
            positions.pop(key, None)
            assignments.pop(key, None)
        node_ids.difference_update(to_remove)
        edge_ids = {(edge["source"], edge["target"]) for edge in graph_data["edges"]}

    metadata = store.list_metadata()
    title_by_key = {key: title for key, title, _abstract in metadata}
    fingerprints = {key: content_fingerprint(title, abstract) for key, title, abstract in metadata}
    to_add = [key for key in new_keys if key not in node_ids and key in fingerprints]
    vector_by_key = {}
    if to_add:
        dataset = store.read_all()
        vector_by_key = dict(zip(dataset.keys, dataset.vectors))

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
            key_random = random.Random(key)
            x += (key_random.random() - 0.5) * 30
            y += (key_random.random() - 0.5) * 30
        else:
            x, y = 0.0, 0.0

        graph_data["nodes"].append(
            {
                "id": key,
                "title": title_by_key.get(key, ""),
                "cluster": int(topic),
                "cluster_label": label_by_id.get(topic, "unclassified" if topic == -1 else ""),
                "weak_assignment": topic != -1,
                "content_fingerprint": fingerprints[key],
                "needs_rebuild": True,
                "x": float(x),
                "y": float(y),
            }
        )
        positions[key] = (x, y)
        assignments[key] = int(topic)

    # Reconcile content, not just IDs: a previous run may have saved vectors and
    # crashed before publishing the map. No new embedding request is necessary.
    updated_titles = 0
    updated_content = 0
    content_changed = False
    edited_keys = set(updated_keys or ())
    for node in graph_data["nodes"]:
        key = node["id"]
        if key not in node_ids or key not in fingerprints:
            continue
        previous = node.get("content_fingerprint")
        title_changed = node.get("title") != title_by_key[key]
        edited = key in edited_keys or title_changed or (
            previous is not None and previous != fingerprints[key]
        )
        if previous != fingerprints[key] or (edited and not node.get("needs_rebuild")):
            content_changed = True
        if title_changed:
            node["title"] = title_by_key[key]
            updated_titles += 1
        node["content_fingerprint"] = fingerprints[key]
        if edited:
            node["needs_rebuild"] = True
            updated_content += 1

    if not to_add and not content_changed and not to_remove:
        if verbose:
            pending = sum(bool(node.get("needs_rebuild")) for node in graph_data["nodes"])
            print(f"  No new content changes; {pending} papers still await a full rebuild.")
        return

    counts = Counter(assignments.values())
    known_topic_ids = {topic_data["id"] for topic_data in clusters_data["topics"]}
    if -1 in counts and -1 not in known_topic_ids:
        clusters_data["topics"].append(
            {"id": -1, "label": "unclassified", "keywords": [], "paper_count": 0}
        )
    for topic_data in clusters_data["topics"]:
        topic_data["paper_count"] = int(counts.get(topic_data["id"], 0))
    clusters_data["topics"] = [
        topic_data for topic_data in clusters_data["topics"] if topic_data["paper_count"] > 0
    ]
    clusters_data["assignments"] = assignments
    _publish_map(graph_data, clusters_data)
    if verbose:
        summary = []
        if to_add:
            summary.append(f"added {len(to_add)} new papers")
        if updated_titles:
            summary.append(f"refreshed {updated_titles} edited titles (run refresh to reposition)")
        if updated_content:
            summary.append(f"marked {updated_content} edited papers for a full rebuild")
        if to_remove:
            summary.append(f"removed {len(to_remove)} deleted papers")
        print(f"  Map updated: {', '.join(summary) or 'recorded content fingerprints'}.")


def sync_library(k: int = 8, threshold: float = 0.5, verbose: bool = True,
                 before_apply: Callable[[dict], None] | None = None,
                 progress: Callable[[str], None] | None = None) -> None:
    """Run the fast daily workflow: embed and attach new or edited papers."""
    options = {"verbose": verbose}
    if before_apply is not None:
        options["before_apply"] = before_apply
    if progress is not None:
        options["progress"] = progress
    store, result = sync_embeddings(**options)
    map_needs_rebuild = False
    try:
        graph_data, _clusters_data = _load_map_snapshot()
        mapped_keys = {node["id"] for node in graph_data.get("nodes", [])}
        stored_keys = store.existing_keys()
        missing_keys = sorted(stored_keys - mapped_keys)
        stale_map_keys = sorted(mapped_keys - stored_keys)
    except (OSError, json.JSONDecodeError, ValueError, KeyError, TypeError):
        # A missing, corrupt, or half-published map is recovered from the durable
        # vector cache even when Zotero reports no new changes on this run.
        map_needs_rebuild = True
        missing_keys = sorted(store.existing_keys())
        stale_map_keys = []

    if map_needs_rebuild:
        if progress:
            progress("No complete map is available. Building the first map locally.")
        rebuild_map(store, k=k, threshold=threshold, verbose=verbose)
        commit_sync_state(result)
        return

    keys_to_add = list(dict.fromkeys([*result.new_keys, *missing_keys]))
    if progress:
        progress("Updating the local map while preserving existing positions.")
    keys_to_remove = list(dict.fromkeys([*result.removed_keys, *stale_map_keys]))
    # Always compare cached content with the published fingerprints, even when
    # Zotero reports no changes and every key already exists on the map.
    if verbose:
        print("\n-> Updating the map...")
    add_to_map_incrementally(
        store,
        keys_to_add,
        updated_keys=result.updated_keys,
        removed_keys=keys_to_remove,
        k=k,
        threshold=threshold,
        verbose=verbose,
    )
    commit_sync_state(result)
