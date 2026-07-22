"""Persist papers and embedding vectors in a local LanceDB database."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import lancedb
import numpy as np
import pyarrow as pa

from zotero_source import Paper


DATA_DIRECTORY = Path(__file__).parent / "data" / "lancedb"
TABLE_NAME = "papers"


@dataclass
class CompleteDataset:
    """Parallel arrays used to build topics, graph links, and map positions."""

    keys: list[str]
    titles: list[str]
    texts: list[str]
    vectors: np.ndarray


def _schema(vector_dimensions: int) -> pa.Schema:
    """Define a stable database schema, including fixed-length vectors."""
    return pa.schema(
        [
            ("key", pa.string()),
            ("title", pa.string()),
            ("abstract", pa.string()),
            ("item_type", pa.string()),
            ("zotero_version", pa.int64()),
            ("vector", pa.list_(pa.float32(), vector_dimensions)),
            ("model", pa.string()),
            ("token_count", pa.int64()),
            ("embedded_at", pa.string()),
            ("cluster_id", pa.int64()),
        ]
    )


class PaperStore:
    """Open or create the local vector store and expose pipeline operations."""

    def __init__(
        self,
        vector_dimensions: int,
        data_directory: Path | None = None,
        expected_model: str | None = None,
    ) -> None:
        self._dimensions = vector_dimensions
        directory = data_directory or DATA_DIRECTORY
        directory.mkdir(parents=True, exist_ok=True)
        self._database = lancedb.connect(str(directory))
        if hasattr(self._database, "list_tables"):
            listed_tables = self._database.list_tables()
            table_names = getattr(listed_tables, "tables", listed_tables)
        else:  # Compatibility with older supported LanceDB releases.
            table_names = self._database.table_names()
        if TABLE_NAME in table_names:
            self._table = self._database.open_table(TABLE_NAME)
            self._validate_compatibility(vector_dimensions, expected_model)
        else:
            self._table = self._database.create_table(
                TABLE_NAME, schema=_schema(vector_dimensions)
            )

    def _validate_compatibility(
        self, vector_dimensions: int, expected_model: str | None
    ) -> None:
        """Reject an existing cache that cannot safely accept new vectors."""
        vector_type = self._table.schema.field("vector").type
        stored_dimensions = getattr(vector_type, "list_size", None)
        if stored_dimensions != vector_dimensions:
            raise SystemExit(
                "The local embedding cache is incompatible with this configuration:\n"
                f"  stored vector dimensions: {stored_dimensions}\n"
                f"  requested dimensions:     {vector_dimensions}\n"
                "Keep the current embedding settings or rebuild the local cache explicitly."
            )
        if expected_model is None or self.count() == 0:
            return
        models = {row["model"] for row in self._select_rows(["model"])}
        if models != {expected_model}:
            rendered = ", ".join(sorted(model or "<missing>" for model in models))
            raise SystemExit(
                "The local embedding cache was created with an incompatible model:\n"
                f"  stored model(s): {rendered}\n"
                f"  requested model: {expected_model}\n"
                "Do not mix embedding models in one cache; use an explicit migration or rebuild."
            )

    def count(self) -> int:
        return self._table.count_rows()

    def _select_rows(self, columns: list[str]) -> list[dict]:
        """Scan selected scalar columns without materializing embedding vectors."""
        row_count = self.count()
        if row_count == 0:
            return []
        return self._table.search().select(columns).limit(row_count).to_list()

    def existing_keys(self) -> set[str]:
        """Read only IDs, avoiding heavy vector data during cache checks."""
        rows = self._select_rows(["key"])
        return {row["key"] for row in rows}

    def delete_keys(self, keys: set[str] | list[str]) -> int:
        """Remove Zotero keys from the local cache and return the removed count."""
        existing = self.existing_keys()
        to_delete = sorted(existing.intersection(keys))
        for start in range(0, len(to_delete), 100):
            batch = to_delete[start : start + 100]
            quoted = ", ".join("'" + key.replace("'", "''") + "'" for key in batch)
            self._table.delete(f"key IN ({quoted})")
        return len(to_delete)

    def _build_rows(
        self,
        papers: list[Paper],
        vectors: list[list[float]],
        token_per_paper: list[int],
        model: str,
    ) -> list[dict]:
        """Shape papers and vectors into database rows shared by add and upsert."""
        embedded_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        return [
            {
                "key": paper.key,
                "title": paper.title,
                "abstract": paper.abstract,
                "item_type": paper.item_type,
                "zotero_version": paper.version,
                "vector": vector,
                "model": model,
                "token_count": tokens,
                "embedded_at": embedded_at,
                "cluster_id": -1,
            }
            for paper, vector, tokens in zip(papers, vectors, token_per_paper)
        ]

    def add(
        self,
        papers: list[Paper],
        vectors: list[list[float]],
        token_per_paper: list[int],
        model: str,
    ) -> None:
        """Append newly embedded papers without rebuilding existing records."""
        if not papers:
            return
        self._table.add(self._build_rows(papers, vectors, token_per_paper, model))

    def upsert(
        self,
        papers: list[Paper],
        vectors: list[list[float]],
        token_per_paper: list[int],
        model: str,
    ) -> None:
        """Insert new papers and update rows whose Zotero key already exists.

        Used when a paper's title or abstract was edited in Zotero: the item key
        is unchanged, so a plain append would create a duplicate. ``merge_insert``
        replaces the matching row in a single operation, keeping one row per key.
        """
        if not papers:
            return
        rows = self._build_rows(papers, vectors, token_per_paper, model)
        (
            self._table.merge_insert("key")
            .when_matched_update_all()
            .when_not_matched_insert_all()
            .execute(rows)
        )

    def read_all(self) -> CompleteDataset:
        """Load the complete small-to-medium library into NumPy-friendly data."""
        if self.count() == 0:
            return CompleteDataset(
                keys=[],
                titles=[],
                texts=[],
                vectors=np.empty((0, self._dimensions), dtype=np.float32),
            )
        table = self._table.to_arrow()
        keys = table.column("key").to_pylist()
        titles = table.column("title").to_pylist()
        abstracts = table.column("abstract").to_pylist()
        texts = [f"{title}\n\n{abstract}".strip() for title, abstract in zip(titles, abstracts)]
        vectors = np.array(table.column("vector").to_pylist(), dtype=np.float32)
        return CompleteDataset(keys, titles, texts, vectors)

    def list_metadata(self) -> list[tuple[str, str, str]]:
        """Return key, title, and abstract without loading vectors."""
        rows = self._select_rows(["key", "title", "abstract"])
        return [(row["key"], row["title"], row["abstract"]) for row in rows]

    def search_neighbors(self, vector, k: int) -> list[tuple[str, float]]:
        """Return the ``k`` nearest keys with cosine similarity, where 1 is equal."""
        results = self._table.search(list(vector)).metric("cosine").limit(k).to_list()
        return [(row["key"], 1.0 - float(row["_distance"])) for row in results]
