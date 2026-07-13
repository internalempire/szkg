"""Manual smoke test for Zotero credentials, titles, and abstracts."""

from __future__ import annotations

from config import load_zotero_config
from zotero_source import PyzoteroSource


SAMPLE_SIZE = 8


def _shorten(text: str, maximum: int = 280) -> str:
    normalized = " ".join(text.split())
    return normalized if len(normalized) <= maximum else normalized[:maximum].rstrip() + "..."


def main() -> None:
    print("-> Loading .env configuration...")
    config = load_zotero_config()
    print(f"  Library type: {config.library_type}; ID: {config.library_id}")
    papers, version = PyzoteroSource(config).fetch_all(limit=SAMPLE_SIZE)
    print(f"  Zotero version: {version}; papers returned: {len(papers)}\n")
    if not papers:
        print("No papers returned. Check cloud sync, library ID, and API key permissions.")
        return
    for index, paper in enumerate(papers, start=1):
        print("-" * 72)
        print(f"[{index}] {paper.title}")
        print(f"    type: {paper.item_type} | key: {paper.key} | version: {paper.version}")
        print(f"    abstract: {_shorten(paper.abstract) if paper.has_abstract else '(missing)'}")
    with_abstract = sum(paper.has_abstract for paper in papers)
    print(f"\nSummary: {len(papers)} shown; {with_abstract} with abstracts.")


if __name__ == "__main__":
    main()
