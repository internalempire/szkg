"""Isolate connector combinations without moving the existing Zotero cache.

The context is local to a worker thread. No process-wide paths or credentials
are swapped while HTTP requests are serving another profile.
"""

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path

from config import read_settings

MODEL = "text-embedding-3-small"
DIMENSIONS = 1536
CURRENT = ContextVar("szkg_profile", default=None)


@dataclass(frozen=True)
class Profile:
    root: Path
    settings: dict = field(repr=False)
    source: str
    service: str
    library_id: str
    library_type: str
    identity: str
    data_dir: Path
    papers_client: object = field(default=None, repr=False)

    @property
    def model(self):
        return "openai/" + MODEL if self.service == "openrouter" else MODEL

    @property
    def source_name(self):
        return "Papers" if self.source == "papers" else "Zotero"

    @property
    def service_name(self):
        return "OpenRouter" if self.service == "openrouter" else "OpenAI"

    @property
    def api_key(self):
        return self.settings["OPENROUTER_API_KEY" if self.service == "openrouter" else "OPENAI_API_KEY"]

    def viewer(self):
        return dict(source=self.source, library_id=self.library_id, library_type=self.library_type,
                    profile_id=self.identity, embedding_service=self.service,
                    embedding_model=self.model, embedding_dimensions=DIMENSIONS)


def select_profile(root: Path, settings=None, papers_client=None) -> Profile:
    values = dict(read_settings(root / ".env") if settings is None else settings)
    source = values.get("LIBRARY_SOURCE") or "zotero"
    service = values.get("EMBEDDING_SERVICE") or "openai"
    if source not in {"zotero", "papers"} or service not in {"openai", "openrouter"}:
        raise ValueError("Unsupported library source or embedding service.")
    library_id = values.get("PAPERS_COLLECTION_ID", "") if source == "papers" else values.get("ZOTERO_LIBRARY_ID", "")
    library_type = "collection" if source == "papers" else values.get("ZOTERO_LIBRARY_TYPE") or "user"
    account = values.get("PAPERS_EMAIL", "").strip().lower() if source == "papers" else ""
    encoded = json.dumps([source, account, library_type, library_id, service, MODEL, DIMENSIONS, "title-abstract-v1"])
    identity = hashlib.sha256(encoded.encode()).hexdigest()[:24]
    # The original connector keeps its original directory and bookmark identity.
    # Existing library identity guards still prevent replacing another Zotero library.
    data_dir = root / "data" if (source, service) == ("zotero", "openai") else root / "data/profiles" / identity
    return Profile(root, values, source, service, library_id, library_type, identity, data_dir, papers_client)


def profile_path(legacy_path: Path) -> Path:
    profile = CURRENT.get()
    return profile.data_dir / legacy_path.name if profile else legacy_path


@contextmanager
def use_profile(profile):
    token = CURRENT.set(profile)
    try:
        yield profile
    finally:
        CURRENT.reset(token)
