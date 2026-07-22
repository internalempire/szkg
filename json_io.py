"""Small helpers for publishing local JSON files without partial writes."""

from __future__ import annotations

import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile


def write_json_atomically(path: Path, data: object, *, indent: int | None = 2) -> None:
    """Replace ``path`` only after a complete JSON document is on disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with NamedTemporaryFile(
            "w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp"
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(data, temporary, ensure_ascii=False, indent=indent)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
