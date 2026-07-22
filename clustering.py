"""Group papers into topics and derive readable keyword labels.

PCA first removes redundant embedding dimensions. HDBSCAN then finds dense
groups without requiring a topic count in advance. Finally, class-based TF-IDF
selects words that are common inside one topic and uncommon across the others.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import CountVectorizer


NOISE_CLUSTER = -1

# English and Italian stop words are intentional: libraries can contain papers
# and metadata in both languages even though the application code is English.
STOPWORDS = {
    "the", "of", "and", "to", "in", "a", "is", "for", "on", "with", "as", "by",
    "an", "be", "are", "this", "that", "we", "our", "from", "at", "or", "it",
    "which", "these", "using", "based", "can", "was", "were", "has", "have",
    "been", "such", "their", "its", "also", "may", "more", "than", "between",
    "study", "paper", "results", "show", "propose", "present", "method", "methods",
    "approach", "model", "models", "data", "used", "use", "new", "two", "one",
    "both", "however", "here", "into", "not", "but", "all", "each",
    "il", "lo", "la", "i", "gli", "le", "di", "del", "della", "dei", "delle",
    "e", "ed", "che", "un", "una", "uno", "per", "con", "su", "in", "da", "come",
    "questo", "questa", "questi", "queste", "non", "si", "al", "alla", "nel",
    "nella", "sono", "stato", "essere", "abbiamo", "loro", "più", "anche", "tra",
    "studio", "articolo", "risultati", "metodo", "metodi", "modello", "dati",
}


@dataclass
class Topic:
    id: int
    label: str
    keywords: list[str]
    paper_count: int


@dataclass
class ClusteringResult:
    assignments: list[int]
    topics: list[Topic]
    # True when HDBSCAN considered a paper noise but neighbors supplied a topic.
    weak_assignments: list[bool]


def _reduce_dimensions(vectors: np.ndarray) -> np.ndarray:
    paper_count, dimensions = vectors.shape
    component_count = min(50, paper_count - 1, dimensions)
    return PCA(n_components=component_count, random_state=0, copy=True).fit_transform(vectors)


def _extract_labels(texts: list[str], assignments: np.ndarray) -> dict[int, list[str]]:
    """Calculate the five strongest class-based TF-IDF words per topic."""
    topic_ids = sorted(topic for topic in set(assignments.tolist()) if topic != NOISE_CLUSTER)
    if not topic_ids:
        return {}
    vectorizer = CountVectorizer(
        stop_words=list(STOPWORDS),
        token_pattern=r"(?u)\b[a-zA-Zàèéìòù][a-zA-Zàèéìòù]{2,}\b",
        min_df=1,
    )
    try:
        counts = vectorizer.fit_transform(texts)
    except ValueError:
        # A library made only of stop words or scripts outside the tokenizer's
        # current alphabet can still be clustered; it simply receives fallback
        # topic names instead of aborting the complete refresh.
        return {topic: [] for topic in topic_ids}
    vocabulary = np.array(vectorizer.get_feature_names_out())

    counts_by_topic = [
        np.asarray(counts[assignments == topic].sum(axis=0)).ravel()
        for topic in topic_ids
    ]
    matrix = np.vstack(counts_by_topic).astype(float)
    totals = matrix.sum(axis=1, keepdims=True)
    totals[totals == 0] = 1
    term_frequency = matrix / totals

    average_words_per_topic = matrix.sum() / len(topic_ids)
    frequency_by_word = matrix.sum(axis=0)
    frequency_by_word[frequency_by_word == 0] = 1
    inverse_frequency = np.log(1.0 + average_words_per_topic / frequency_by_word)
    scores = term_frequency * inverse_frequency

    labels: dict[int, list[str]] = {}
    for row, topic in enumerate(topic_ids):
        best = np.argsort(scores[row])[::-1][:5]
        labels[topic] = [vocabulary[i] for i in best if scores[row][i] > 0]
    return labels


def _assign_outliers_to_neighbors(
    vectors: np.ndarray,
    labels: np.ndarray,
    assignment_threshold: float,
    neighbor_count: int = 10,
) -> np.ndarray:
    """Assign noise points by a similarity-weighted vote from strong neighbors."""
    labels = labels.copy()
    outlier_indices = np.where(labels == NOISE_CLUSTER)[0]
    topic_indices = np.where(labels != NOISE_CLUSTER)[0]
    if len(topic_indices) == 0 or len(outlier_indices) == 0:
        return labels

    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = vectors / norms
    neighbor_topics = labels[topic_indices]
    k = min(neighbor_count, len(topic_indices))

    for index in outlier_indices:
        similarities = normalized[topic_indices] @ normalized[index]
        best = np.argpartition(similarities, -k)[-k:]
        votes: dict[int, float] = {}
        for neighbor_index in best:
            similarity = float(similarities[neighbor_index])
            if similarity < assignment_threshold:
                continue
            topic = int(neighbor_topics[neighbor_index])
            votes[topic] = votes.get(topic, 0.0) + similarity
        if votes:
            labels[index] = max(votes, key=votes.get)
    return labels


def cluster_papers(
    vectors: np.ndarray,
    texts: list[str],
    minimum_topic_size: int = 5,
    # ``min_samples`` controls how conservative HDBSCAN is about density. On a
    # large, topically homogeneous corpus (e.g. a single-field library) a higher
    # value lets mutual-reachability chaining merge every paper into one giant
    # cluster. ``1`` keeps the many genuine dense topics separated.
    min_samples: int = 1,
    assign_outliers: bool = True,
    assignment_threshold: float = 0.5,
) -> ClusteringResult:
    """Find dense topics, label them, and optionally attach credible outliers."""
    paper_count = len(texts)
    if paper_count < minimum_topic_size * 2:
        topics = (
            [Topic(NOISE_CLUSTER, "unclassified (too few papers)", [], paper_count)]
            if paper_count else []
        )
        return ClusteringResult(
            assignments=[NOISE_CLUSTER] * paper_count,
            topics=topics,
            weak_assignments=[False] * paper_count,
        )

    reduced = _reduce_dimensions(vectors)
    core_labels = HDBSCAN(
        min_cluster_size=minimum_topic_size,
        min_samples=min_samples,
        metric="euclidean",
        copy=True,
    ).fit_predict(reduced)

    # Labels use only dense core members, so attached outliers cannot dilute a topic.
    keywords_by_topic = _extract_labels(texts, core_labels)
    final_labels = (
        _assign_outliers_to_neighbors(vectors, core_labels, assignment_threshold)
        if assign_outliers else core_labels
    )
    weak_assignments = [
        bool(core_labels[i] == NOISE_CLUSTER and final_labels[i] != NOISE_CLUSTER)
        for i in range(paper_count)
    ]

    topics: list[Topic] = []
    for topic_id in sorted(set(final_labels.tolist())):
        count = int((final_labels == topic_id).sum())
        if topic_id == NOISE_CLUSTER:
            topics.append(Topic(NOISE_CLUSTER, "unclassified", [], count))
        else:
            keywords = keywords_by_topic.get(topic_id, [])
            label = ", ".join(keywords[:3]) if keywords else f"topic {topic_id}"
            topics.append(Topic(int(topic_id), label, keywords, count))

    return ClusteringResult(final_labels.tolist(), topics, weak_assignments)
