"""Single command-line entry point for the application.

``sync`` is the fast daily update, ``refresh`` rebuilds the global map, and
``serve`` opens the local interactive viewer.
"""

from __future__ import annotations

import argparse

import serve
from pipeline import commit_sync_state, rebuild_map, sync_embeddings, sync_library


def command_sync(_args: argparse.Namespace) -> None:
    sync_library(verbose=True)
    print("\nDone. Run 'python app.py serve', or click Refresh data in the open viewer.")


def command_refresh(_args: argparse.Namespace) -> None:
    store, result = sync_embeddings(verbose=True, force_full=True)
    rebuild_map(store, verbose=True)
    commit_sync_state(result)
    print("\nDone. Reload the browser page to see the rebuilt layout.")


def command_serve(_args: argparse.Namespace) -> None:
    serve.main()


def main() -> None:
    parser = argparse.ArgumentParser(description="Semantic map of a Zotero library.")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("sync", help="Add new Zotero papers without rebuilding.").set_defaults(
        func=command_sync
    )
    subcommands.add_parser("refresh", help="Rebuild topics, graph, and layout.").set_defaults(
        func=command_refresh
    )
    subcommands.add_parser("serve", help="Open the local map viewer.").set_defaults(
        func=command_serve
    )
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
