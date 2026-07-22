"""Network-free tests for author formatting and display-metadata writing."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import pipeline
from zotero_source import Paper, extract_publication, extract_year, format_authors


class AuthorFormattingTests(unittest.TestCase):
    def test_uses_author_creators_only(self) -> None:
        creators = [
            {"creatorType": "author", "firstName": "Jane", "lastName": "Smith"},
            {"creatorType": "editor", "firstName": "Ed", "lastName": "Itor"},
            {"creatorType": "author", "name": "World Health Organization"},
        ]
        self.assertEqual(format_authors(creators), "Jane Smith, World Health Organization")

    def test_no_authors_returns_empty(self) -> None:
        self.assertEqual(format_authors([]), "")
        self.assertEqual(format_authors([{"creatorType": "editor", "lastName": "Only"}]), "")


class PublicationTests(unittest.TestCase):
    def test_prefers_journal_then_falls_back(self) -> None:
        self.assertEqual(extract_publication({"publicationTitle": "The Lancet"}), "The Lancet")
        self.assertEqual(extract_publication({"bookTitle": "A Handbook"}), "A Handbook")
        self.assertEqual(extract_publication({"publisher": "MIT Press"}), "MIT Press")
        self.assertEqual(extract_publication({}), "")


class YearTests(unittest.TestCase):
    def test_extracts_four_digit_year_from_various_formats(self) -> None:
        self.assertEqual(extract_year("2019-05-12"), "2019")
        self.assertEqual(extract_year("May 2019"), "2019")
        self.assertEqual(extract_year("c1998"), "1998")
        self.assertEqual(extract_year(""), "")
        self.assertEqual(extract_year("in press"), "")


class MetadataFileTests(unittest.TestCase):
    def test_merge_writes_and_preserves_existing_entries(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            original = pipeline.METADATA_FILE
            pipeline.METADATA_FILE = Path(directory) / "metadata.json"
            try:
                pipeline._update_metadata_file(
                    [Paper("AAAAAAAA", "First title", "abstract one", "journalArticle", 1, "Jane Smith")]
                )
                pipeline._update_metadata_file(
                    [Paper("BBBBBBBB", "Second title", "abstract two", "journalArticle", 1, "John Doe")]
                )
                data = json.loads(pipeline.METADATA_FILE.read_text(encoding="utf-8"))
                self.assertEqual(set(data), {"AAAAAAAA", "BBBBBBBB"})
                self.assertEqual(
                    data["AAAAAAAA"],
                    {"title": "First title", "authors": "Jane Smith", "journal": "",
                     "year": "", "abstract": "abstract one"},
                )
                self.assertEqual(data["BBBBBBBB"]["authors"], "John Doe")
            finally:
                pipeline.METADATA_FILE = original

if __name__ == "__main__":
    unittest.main()
