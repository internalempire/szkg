"""Project high-dimensional embeddings into stable two-dimensional positions."""

from __future__ import annotations

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE


_SCALE_FACTOR = 14.0


def calculate_positions(vectors: np.ndarray) -> np.ndarray:
    """Return one ``(x, y)`` position per vector using PCA followed by t-SNE.

    Layout runs in Python once, rather than blocking the browser on every page
    load. Fixed random seeds make full refreshes reproducible for the same data.
    """
    paper_count, dimensions = vectors.shape
    if paper_count == 0:
        return np.empty((0, 2), dtype=float)
    if paper_count < 5:
        components = min(2, paper_count, dimensions)
        base = PCA(n_components=components, random_state=0).fit_transform(vectors)
        positions = np.zeros((paper_count, 2))
        positions[:, :components] = base
        return positions * _SCALE_FACTOR

    reduced_dimensions = min(50, paper_count - 1, dimensions)
    reduced = PCA(n_components=reduced_dimensions, random_state=0).fit_transform(vectors)
    perplexity = min(30, max(5, (paper_count - 1) // 3))
    positions = TSNE(
        n_components=2,
        random_state=0,
        init="pca",
        perplexity=perplexity,
    ).fit_transform(reduced)
    return positions * _SCALE_FACTOR
