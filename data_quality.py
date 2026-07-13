"""Report Zotero records whose text may produce unreliable embeddings."""

from __future__ import annotations

import re

from store import PaperStore


_EXTENSIONS = (".pdf", ".doc", ".docx", ".epub", ".txt", ".rtf")
_FILENAME_ONLY = re.compile(r"^\S+\.\w{2,4}$")


def looks_like_filename(title: str) -> bool:
    normalized = title.strip().lower()
    return normalized.endswith(_EXTENSIONS) or bool(_FILENAME_ONLY.match(normalized))


def main() -> None:
    metadata = PaperStore(vector_dimensions=1536).list_metadata()
    if not metadata:
        print("The local store is empty. Run 'python app.py refresh' first.")
        return
    filename_titles = [(key, title) for key, title, _ in metadata if looks_like_filename(title)]
    missing_abstract = [(key, title) for key, title, abstract in metadata if not abstract.strip()]

    print("=" * 72, "DATA QUALITY REPORT", "=" * 72, sep="\n")
    print(f"Total papers: {len(metadata)}\n")
    print(f"Titles that look like filenames ({len(filename_titles)})")
    for key, title in filename_titles[:40]:
        print(f"  [{key}] {title}")
    if len(filename_titles) > 40:
        print(f"  ...and {len(filename_titles) - 40} more")
    print(f"\nPapers without an abstract ({len(missing_abstract)})")
    for key, title in missing_abstract[:40]:
        print(f"  [{key}] {title[:80]}")
    if len(missing_abstract) > 40:
        print(f"  ...and {len(missing_abstract) - 40} more")
    print("\nFixing these records is optional, but richer metadata improves the map.")


if __name__ == "__main__":
    main()
