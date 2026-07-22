"""Project high-dimensional embeddings into stable two-dimensional positions."""

from __future__ import annotations

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE


_SCALE_FACTOR = 14.0
_TSNE_MAX_PERPLEXITY = 35
_TSNE_EARLY_EXAGGERATION = 8.0
_STRONG_TOPIC_COMPACTION = 0.85
_WEAK_TOPIC_COMPACTION = 0.95


def _compact_topic_positions(
    positions: np.ndarray,
    assignments: list[int] | np.ndarray,
    weak_assignments: list[bool] | np.ndarray | None = None,
) -> np.ndarray:
    """Tighten topic islands without hiding uncertain boundary papers.

    The median of the strong members is a robust island center. Dense members
    move modestly toward it, while weak neighbor-assigned papers move less so
    the map continues to communicate their uncertain membership.
    """
    topics = np.asarray(assignments)
    if len(topics) != len(positions):
        raise ValueError("Topic assignments must match the number of positions.")
    weak = (
        np.zeros(len(positions), dtype=bool)
        if weak_assignments is None
        else np.asarray(weak_assignments, dtype=bool)
    )
    if len(weak) != len(positions):
        raise ValueError("Weak assignments must match the number of positions.")

    compacted = positions.copy()
    for topic in np.unique(topics):
        if topic == -1:
            continue
        members = topics == topic
        strong_members = members & ~weak
        center_members = strong_members if strong_members.any() else members
        center = np.median(positions[center_members], axis=0)
        factors = np.where(
            weak[members], _WEAK_TOPIC_COMPACTION, _STRONG_TOPIC_COMPACTION
        )[:, None]
        compacted[members] = center + (positions[members] - center) * factors
    return compacted


def calculate_positions(
    vectors: np.ndarray,
    assignments: list[int] | np.ndarray | None = None,
    weak_assignments: list[bool] | np.ndarray | None = None,
) -> np.ndarray:
    """Return one ``(x, y)`` position per vector using PCA followed by t-SNE.

    Layout runs in Python once, rather than blocking the browser on every page
    load. Fixed random seeds make full refreshes reproducible for the same data.
    When topic assignments are supplied, a conservative final compaction makes
    dense topic islands easier to read while keeping weak members peripheral.
    """
    paper_count, dimensions = vectors.shape
    if paper_count == 0:
        return np.empty((0, 2), dtype=float)
    if paper_count < 5:
        components = min(2, paper_count, dimensions)
        base = PCA(n_components=components, random_state=0).fit_transform(vectors)
        positions = np.zeros((paper_count, 2))
        positions[:, :components] = base
    else:
        reduced_dimensions = min(50, paper_count - 1, dimensions)
        reduced = PCA(n_components=reduced_dimensions, random_state=0).fit_transform(vectors)
        perplexity = min(_TSNE_MAX_PERPLEXITY, max(5, (paper_count - 1) // 3))
        positions = TSNE(
            n_components=2,
            random_state=0,
            init="pca",
            perplexity=perplexity,
            early_exaggeration=_TSNE_EARLY_EXAGGERATION,
        ).fit_transform(reduced)

    if assignments is not None:
        positions = _compact_topic_positions(positions, assignments, weak_assignments)
    return positions * _SCALE_FACTOR
