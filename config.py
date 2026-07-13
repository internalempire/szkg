"""Load credentials and configuration from the local ``.env`` file.

Secrets never belong in source code. Keeping all configuration access here
also means a future change in secret storage affects only this module.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass
class ZoteroConfig:
    """The three values required to access a Zotero library."""

    library_id: str
    library_type: str  # Either "user" or "group".
    api_key: str


def load_zotero_config() -> ZoteroConfig:
    """Return a validated Zotero configuration or stop with clear guidance."""
    load_dotenv()
    library_id = os.getenv("ZOTERO_LIBRARY_ID", "").strip()
    library_type = os.getenv("ZOTERO_LIBRARY_TYPE", "user").strip() or "user"
    api_key = os.getenv("ZOTERO_API_KEY", "").strip()

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
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit(
            "OPENAI_API_KEY is missing from .env.\n"
            "Create one at https://platform.openai.com/api-keys and add it as:\n"
            "  OPENAI_API_KEY=..."
        )
    return api_key
