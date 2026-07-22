"""Network-free tests for changed, trashed, and permanently deleted Zotero items."""

from __future__ import annotations

import unittest
from types import SimpleNamespace

from zotero_source import PyzoteroSource


class _FakeZotero:
    def __init__(self) -> None:
        self.request = None

    def top(self, **kwargs):
        self.top_arguments = kwargs
        self.request = SimpleNamespace(headers={"last-modified-version": "15"})
        return [
            {"data": {"key": "ACTIVE", "title": "Active", "abstractNote": "Text",
                       "itemType": "journalArticle", "version": 12}},
            {"data": {"key": "TRASHED", "title": "Trashed", "itemType": "book",
                       "version": 13, "deleted": 1}},
            {"data": {"key": "UNTITLED", "title": "", "itemType": "book", "version": 14}},
        ]

    def everything(self, query):
        return query

    def deleted(self, **kwargs):
        self.deleted_arguments = kwargs
        self.request = SimpleNamespace(headers={"last-modified-version": "17"})
        return {"items": ["PERMANENT"]}


class ZoteroChangeTests(unittest.TestCase):
    def test_incremental_read_combines_trash_and_deleted_log(self) -> None:
        source = object.__new__(PyzoteroSource)
        source._zotero = _FakeZotero()

        changes = source.fetch_changes_since(10)

        self.assertEqual([paper.key for paper in changes.papers], ["ACTIVE"])
        self.assertEqual(changes.removed_keys, {"TRASHED", "UNTITLED", "PERMANENT"})
        self.assertEqual(changes.current_version, 15)
        self.assertEqual(source._zotero.top_arguments, {"since": 10, "includeTrashed": 1})
        self.assertEqual(source._zotero.deleted_arguments, {"since": 10})
