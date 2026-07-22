"""Read papers from Zotero through a replaceable source interface."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass

from pyzotero import zotero

from config import ZoteroConfig


@dataclass
class Paper:
    """The subset of a Zotero item needed by the semantic pipeline."""

    key: str
    title: str
    abstract: str
    item_type: str
    version: int
    # Author names, publication venue, and year for display only; never embedded.
    authors: str = ""
    journal: str = ""
    year: str = ""

    @property
    def has_abstract(self) -> bool:
        return bool(self.abstract.strip())

    def combined_text(self) -> str:
        """Join title and abstract while preserving their semantic boundary."""
        return f"{self.title}\n\n{self.abstract}".strip()


@dataclass
class SourceChanges:
    """Incremental Zotero data plus keys that must disappear locally."""

    papers: list[Paper]
    removed_keys: set[str]
    current_version: int


class ZoteroSource(ABC):
    """Contract for any component capable of supplying Zotero papers.

    A future local SQLite reader can implement this interface without changing
    embedding, storage, clustering, or visualization code.
    """

    @abstractmethod
    def fetch_all(self, limit: int | None = None) -> tuple[list[Paper], int]:
        """Return all papers (or a sample) and the current library version."""
        raise NotImplementedError

    @abstractmethod
    def fetch_changes_since(self, since_version: int) -> SourceChanges:
        """Return changed papers and remotely removed keys after a version."""
        raise NotImplementedError

    def fetch_since(self, since_version: int) -> tuple[list[Paper], int]:
        """Compatibility wrapper returning only changed eligible papers."""
        changes = self.fetch_changes_since(since_version)
        return changes.papers, changes.current_version


_EXCLUDED_ITEM_TYPES = {"attachment", "note", "annotation"}


def format_authors(creators: list[dict]) -> str:
    """Join a Zotero item's author names into a single display string.

    Only ``author`` creators are used; editors and other roles are ignored. A
    creator may carry ``firstName``/``lastName`` or a single ``name`` field.
    """
    names: list[str] = []
    for creator in creators or []:
        if creator.get("creatorType") != "author":
            continue
        name = (creator.get("name") or "").strip()
        if not name:
            parts = [creator.get("firstName", ""), creator.get("lastName", "")]
            name = " ".join(part.strip() for part in parts if part and part.strip())
        if name:
            names.append(name)
    return ", ".join(names)


# Zotero stores the publication venue under different fields per item type.
_PUBLICATION_FIELDS = (
    "publicationTitle", "proceedingsTitle", "conferenceName", "bookTitle",
    "websiteTitle", "blogTitle", "encyclopediaTitle", "dictionaryTitle",
    "repository", "publisher", "institution", "university",
)


def extract_publication(data: dict) -> str:
    """Return the first available publication/venue name for a Zotero item."""
    for field in _PUBLICATION_FIELDS:
        value = (data.get(field) or "").strip()
        if value:
            return value
    return ""


_YEAR_PATTERN = re.compile(r"(1[5-9]\d{2}|20\d{2})")


def extract_year(date: str) -> str:
    """Pull a four-digit publication year out of Zotero's free-form date field."""
    match = _YEAR_PATTERN.search(date or "")
    return match.group(0) if match else ""


class PyzoteroSource(ZoteroSource):
    """Read a user or group library through Zotero's Web API."""

    def __init__(self, config: ZoteroConfig) -> None:
        self._zotero = zotero.Zotero(
            library_id=config.library_id,
            library_type=config.library_type,
            api_key=config.api_key,
        )

    def fetch_all(self, limit: int | None = None) -> tuple[list[Paper], int]:
        if limit is not None:
            raw_items = self._zotero.top(limit=limit)
        else:
            # ``everything`` follows Zotero's paginated responses.
            raw_items = self._zotero.everything(self._zotero.top())
        return self._transform(raw_items), self._response_version()

    def fetch_changes_since(self, since_version: int) -> SourceChanges:
        # Trashed top-level items are requested explicitly so they can be removed
        # from the local cache immediately instead of waiting for the trash to be
        # emptied. The separate deleted endpoint covers permanent deletions.
        raw_items = self._zotero.everything(
            self._zotero.top(since=since_version, includeTrashed=1)
        )
        papers, ineligible_keys = self._transform_with_removals(raw_items)
        items_version = self._response_version()

        deleted_data = self._zotero.deleted(since=since_version)
        deleted_version = self._response_version()
        deleted_keys = set((deleted_data or {}).get("items", []))

        # If the library changes between the two reads, the lower response
        # version is the safe high-water mark covered by both requests.
        versions = [version for version in (items_version, deleted_version) if version]
        current_version = min(versions) if versions else since_version
        removed_keys = ineligible_keys | deleted_keys
        papers = [paper for paper in papers if paper.key not in removed_keys]
        return SourceChanges(papers, removed_keys, current_version)

    def _response_version(self) -> int:
        request = getattr(self._zotero, "request", None)
        value = request.headers.get("last-modified-version") if request is not None else None
        return int(value) if value is not None else self._current_version()

    def _current_version(self) -> int:
        return int(self._zotero.last_modified_version())

    def _transform(self, raw_items: list[dict]) -> list[Paper]:
        papers, _removed_keys = self._transform_with_removals(raw_items)
        return papers

    def _transform_with_removals(
        self, raw_items: list[dict]
    ) -> tuple[list[Paper], set[str]]:
        papers: list[Paper] = []
        removed_keys: set[str] = set()
        for entry in raw_items:
            data = entry.get("data", {})
            key = data.get("key", "")
            item_type = data.get("itemType", "")
            title = (data.get("title") or "").strip()
            if data.get("deleted") or item_type in _EXCLUDED_ITEM_TYPES or not title:
                if key:
                    removed_keys.add(key)
                continue
            papers.append(
                Paper(
                    key=key,
                    title=title,
                    abstract=(data.get("abstractNote") or "").strip(),
                    item_type=item_type,
                    version=int(data.get("version", 0)),
                    authors=format_authors(data.get("creators", [])),
                    journal=extract_publication(data),
                    year=extract_year(data.get("date", "")),
                )
            )
        return papers, removed_keys
