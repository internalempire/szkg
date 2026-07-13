"""Inspect Zotero API visibility when the normal reader returns no papers."""

from __future__ import annotations

from pyzotero import zotero

from config import load_zotero_config


def main() -> None:
    config = load_zotero_config()
    client = zotero.Zotero(config.library_id, config.library_type, config.api_key)
    print("-> Counting every item visible to this Zotero API key...")
    total = client.count_items()
    print(f"  Total cloud items: {total}")

    print("\n-> Listing cloud collections...")
    collections = client.collections()
    if collections:
        for collection in collections[:20]:
            print(f"  - {collection.get('data', {}).get('name', '(unnamed)')}")
    else:
        print("  No collections found.")

    print("\n-> Showing the first raw items, including attachments...")
    items = client.items(limit=5)
    for item in items:
        data = item.get("data", {})
        print(f"  - type={data.get('itemType', '?'):15} title={(data.get('title') or '(untitled)')[:60]}")
    if not items:
        print("  No items returned.")

    print("\nCONCLUSION")
    if total == 0:
        print("The Zotero cloud is empty for this key. Complete Zotero synchronization first.")
    else:
        print("The cloud contains items; inspect their types and the configured library.")


if __name__ == "__main__":
    main()
