"""Read papers from Zotero through a replaceable source interface."""

from __future__ import annotations

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
    # Author names and publication venue for display only; never embedded.
    authors: str = ""
    journal: str = ""

    @property
    def has_abstract(self) -> bool:
        return bool(self.abstract.strip())

    def combined_text(self) -> str:
        """Join title and abstract while preserving their semantic boundary."""
        return f"{self.title}\n\n{self.abstract}".strip()


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
    def fetch_since(self, since_version: int) -> tuple[list[Paper], int]:
        """Return items changed after a known Zotero library version."""
        raise NotImplementedError


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
        return self._transform(raw_items), self._current_version()

    def fetch_since(self, since_version: int) -> tuple[list[Paper], int]:
        raw_items = self._zotero.everything(self._zotero.top(since=since_version))
        return self._transform(raw_items), self._current_version()

    def _current_version(self) -> int:
        return int(self._zotero.last_modified_version())

    def _transform(self, raw_items: list[dict]) -> list[Paper]:
        papers: list[Paper] = []
        for entry in raw_items:
            data = entry.get("data", {})
            item_type = data.get("itemType", "")
            if item_type in _EXCLUDED_ITEM_TYPES:
                continue
            title = (data.get("title") or "").strip()
            if not title:
                continue
            papers.append(
                Paper(
                    key=data.get("key", ""),
                    title=title,
                    abstract=(data.get("abstractNote") or "").strip(),
                    item_type=item_type,
                    version=int(data.get("version", 0)),
                    authors=format_authors(data.get("creators", [])),
                    journal=extract_publication(data),
                )
            )
        return papers
