"""Track display identity across rebuilds without changing scientific clusters."""

from __future__ import annotations

from collections import defaultdict
import uuid


def initialize_identities(clusters: dict) -> None:
    """Add identities in place, preserving the legacy size-ranked palette once."""
    topics = sorted((t for t in clusters.get("topics", []) if t["id"] != -1),
                    key=lambda t: -t["paper_count"])
    next_color = max([clusters.get("next_color_index", 0),
                      *(t.get("color_index", -1) + 1 for t in topics)])
    for index, topic in enumerate(topics):
        topic.setdefault("stable_id", uuid.uuid4().hex)
        if "color_index" not in topic:
            # A wholly legacy snapshot keeps the colors it had in both viewers.
            topic["color_index"] = index if next_color == 0 else next_color
            if next_color:
                next_color += 1
        topic.setdefault("continuity", "baseline")
        topic.setdefault("previous_ids", [])
    clusters["next_color_index"] = max([next_color, *(t["color_index"] + 1 for t in topics)])


def _core_members(nodes: list[dict]) -> dict[int, set[str]]:
    members = defaultdict(set)
    for node in nodes:
        if node["cluster"] != -1 and not node.get("weak_assignment", False):
            members[node["cluster"]].add(node["id"])
    return dict(members)


def reconcile_topics(nodes: list[dict], clusters: dict,
                     previous_graph: dict, previous_clusters: dict) -> None:
    """Conservatively continue one-to-one topics; splits/merges get fresh IDs.

    Identity is a display heuristic, not a scientific claim. At least 60% of
    both old and new core membership must overlap. Another substantial branch
    (at least two members and 20% of either core) makes the match ambiguous.
    Weak assignments never establish continuity. Only the previous snapshot is
    retained; this is not an unbounded topic-history database.
    """
    initialize_identities(previous_clusters)
    old = _core_members(previous_graph.get("nodes", []))
    new = _core_members(nodes)
    old_topics = {t["id"]: t for t in previous_clusters.get("topics", []) if t["id"] != -1}
    parents = defaultdict(list)
    children = defaultdict(list)
    for new_id, new_members in new.items():
        for old_id, old_members in old.items():
            if old_id not in old_topics:
                continue
            shared = len(new_members & old_members)
            if shared >= 2 and shared / min(len(old_members), len(new_members)) >= .2:
                parents[new_id].append(old_id)
                children[old_id].append(new_id)

    next_color = previous_clusters["next_color_index"]
    for topic in sorted(clusters["topics"], key=lambda t: -t["paper_count"]):
        new_id = topic["id"]
        if new_id == -1:
            continue
        sources = parents[new_id]
        continued = None
        if len(sources) == 1 and len(children[sources[0]]) == 1:
            old_id = sources[0]
            shared = len(new[new_id] & old[old_id])
            if shared / max(len(new[new_id]), len(old[old_id])) >= .6:
                continued = old_topics[old_id]
        topic["previous_ids"] = [old_topics[i]["stable_id"] for i in sorted(sources)]
        if continued:
            topic.update(stable_id=continued["stable_id"], color_index=continued["color_index"],
                         continuity="continued")
        else:
            split = any(len(children[i]) > 1 for i in sources)
            merged = len(sources) > 1
            status = "reorganized" if split and merged else "split" if split else "merged" if merged else "new"
            topic.update(stable_id=uuid.uuid4().hex, color_index=next_color, continuity=status)
            next_color += 1
    clusters["next_color_index"] = next_color
