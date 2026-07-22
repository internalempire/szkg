"""Network-free tests for re-embedding papers whose metadata changed."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from pipeline import _partition_by_change
from store import PaperStore
from zotero_source import Paper


def _paper(key: str, title: str, abstract: str, version: int) -> Paper:
    return Paper(
        key=key,
        title=title,
        abstract=abstract,
        item_type="journalArticle",
        version=version,
    )


class PartitionTests(unittest.TestCase):
    def test_partition_detects_new_and_changed_only(self) -> None:
        cached = {"A": ("Title A", "abstract a"), "B": ("Title B", "abstract b")}
        papers = [
            _paper("A", "Title A", "abstract a", version=5),  # unchanged, even if version rose
            _paper("B", "Title B (revised)", "abstract b", version=6),  # edited title
            _paper("C", "Title C", "abstract c", version=1),  # never seen
        ]
        new_papers, changed_papers = _partition_by_change(papers, cached)
        self.assertEqual([paper.key for paper in new_papers], ["C"])
        self.assertEqual([paper.key for paper in changed_papers], ["B"])

    def test_edited_abstract_counts_as_changed(self) -> None:
        cached = {"A": ("Title A", "old abstract")}
        _, changed_papers = _partition_by_change(
            [_paper("A", "Title A", "new abstract", version=2)], cached
        )
        self.assertEqual([paper.key for paper in changed_papers], ["A"])


class StoreUpsertTests(unittest.TestCase):
    def test_upsert_replaces_row_in_place_without_duplicating(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = PaperStore(vector_dimensions=3, data_directory=Path(directory))
            store.add([_paper("ABC123", "Old title", "old", 1)], [[0.0, 0.0, 1.0]], [5], "test-model")
            self.assertEqual(store.count(), 1)

            store.upsert(
                [_paper("ABC123", "New title", "new", 2)], [[1.0, 0.0, 0.0]], [7], "test-model"
            )

            # The key is updated, not duplicated.
            self.assertEqual(store.count(), 1)
            metadata = {key: (title, abstract) for key, title, abstract in store.list_metadata()}
            self.assertEqual(metadata["ABC123"], ("New title", "new"))

            # The stored vector was replaced, so neighbor search reflects the new text.
            key, similarity = store.search_neighbors([1.0, 0.0, 0.0], k=1)[0]
            self.assertEqual(key, "ABC123")
            self.assertAlmostEqual(similarity, 1.0, places=5)

    def test_upsert_inserts_unseen_key(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = PaperStore(vector_dimensions=3, data_directory=Path(directory))
            store.upsert([_paper("NEWKEY01", "Fresh", "text", 1)], [[0.0, 1.0, 0.0]], [4], "test-model")
            self.assertEqual(store.count(), 1)

    def test_rejects_incompatible_vector_dimensions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            PaperStore(vector_dimensions=3, data_directory=path)
            with self.assertRaisesRegex(SystemExit, "stored vector dimensions: 3"):
                PaperStore(vector_dimensions=4, data_directory=path)

    def test_rejects_mixed_embedding_models(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            store = PaperStore(vector_dimensions=3, data_directory=path)
            store.add([_paper("ABC123", "Title", "text", 1)], [[1.0, 0.0, 0.0]], [5], "model-a")
            with self.assertRaisesRegex(SystemExit, r"stored model\(s\): model-a"):
                PaperStore(vector_dimensions=3, data_directory=path, expected_model="model-b")

    def test_delete_keys_removes_only_requested_rows(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = PaperStore(vector_dimensions=3, data_directory=Path(directory))
            store.add(
                [_paper("A", "First", "", 1), _paper("B", "Second", "", 1)],
                [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]],
                [1, 1],
                "test-model",
            )
            self.assertEqual(store.delete_keys({"B", "MISSING"}), 1)
            self.assertEqual(store.existing_keys(), {"A"})


if __name__ == "__main__":
    unittest.main()
