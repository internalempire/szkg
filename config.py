"""Load credentials and configuration from the local ``.env`` file.

Secrets never belong in source code. Keeping all configuration access here
also means a future change in secret storage affects only this module.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

ENV_FILE = Path(__file__).parent / ".env"
SETTING_NAMES = ("ZOTERO_LIBRARY_ID", "ZOTERO_LIBRARY_TYPE", "ZOTERO_API_KEY", "OPENAI_API_KEY",
                 "LIBRARY_SOURCE", "EMBEDDING_SERVICE", "OPENROUTER_API_KEY",
                 "PAPERS_EMAIL", "PAPERS_COLLECTION_ID")


def read_settings(path: Path | None = None) -> dict[str, str]:
    """Read fresh values without leaking file settings into process environment."""
    values = dotenv_values(path or ENV_FILE, interpolate=False)
    return {name: str(os.environ.get(name, values.get(name) or "")).strip() for name in SETTING_NAMES}


@dataclass
class ZoteroConfig:
    """The three values required to access a Zotero library."""

    library_id: str
    library_type: str  # Either "user" or "group".
    api_key: str


def load_zotero_config() -> ZoteroConfig:
    """Return a validated Zotero configuration or stop with clear guidance."""
    values = read_settings()
    library_id = values["ZOTERO_LIBRARY_ID"]
    library_type = values["ZOTERO_LIBRARY_TYPE"] or "user"
    api_key = values["ZOTERO_API_KEY"]

    problems: list[str] = []
    if not library_id:
        problems.append(
            "- ZOTERO_LIBRARY_ID is missing (your numeric Zotero user ID). "
            "Find it at https://www.zotero.org/settings/keys"
        )
    if not api_key:
        problems.append(
            "- ZOTERO_API_KEY is missing. Create a read-only key at "
            "https://www.zotero.org/settings/keys/new"
        )
    if library_type not in ("user", "group"):
        problems.append(
            f"- ZOTERO_LIBRARY_TYPE must be 'user' or 'group', not '{library_type}'."
        )
    if problems:
        raise SystemExit(
            "Incomplete configuration in .env:\n"
            + "\n".join(problems)
            + "\n\nCopy .env.example to .env, then fill in the values:\n"
            "  cp .env.example .env"
        )
    return ZoteroConfig(library_id, library_type, api_key)


def load_openai_api_key() -> str:
    """Return the OpenAI API key without coupling it to Zotero settings."""
    api_key = read_settings()["OPENAI_API_KEY"]
    if not api_key:
        raise SystemExit(
            "OPENAI_API_KEY is missing from .env.\n"
            "Create one at https://platform.openai.com/api-keys and add it as:\n"
            "  OPENAI_API_KEY=..."
        )
    return api_key
