"""Single command-line entry point for the application.

``sync`` is the fast daily update, ``refresh`` rebuilds the global map, and
``serve`` opens the local interactive viewer.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import serve
from work_lock import exclusive_work, WorkBusyError
from profiles import select_profile, use_profile


def command_sync(_args: argparse.Namespace) -> None:
    from pipeline import sync_library
    sync_library(verbose=True)
    print("\nDone. Run 'python app.py serve', or click Reload local map in the open viewer.")


def command_refresh(_args: argparse.Namespace) -> None:
    from pipeline import commit_sync_state, rebuild_map, sync_embeddings
    store, result = sync_embeddings(verbose=True, force_full=True)
    rebuild_map(store, verbose=True)
    commit_sync_state(result)
    print("\nDone. Click Reload local map in the open viewer to see the rebuilt layout.")


def command_serve(_args: argparse.Namespace) -> None:
    serve.main()


def main() -> None:
    parser = argparse.ArgumentParser(description="Semantic map of a Zotero or Papers library.")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("sync", help="Apply selected library changes without rebuilding.").set_defaults(
        func=command_sync
    )
    subcommands.add_parser("refresh", help="Rebuild topics, graph, and layout.").set_defaults(
        func=command_refresh
    )
    subcommands.add_parser("serve", help="Open the local map viewer.").set_defaults(
        func=command_serve
    )
    args = parser.parse_args()
    try:
        if args.command == "serve":
            args.func(args)
        else:
            profile = select_profile(Path(__file__).parent)
            if profile.source == "papers":
                from papers_source import PapersClient, PapersError
                from getpass import getpass
                from dataclasses import replace
                if not profile.settings["PAPERS_EMAIL"] or not profile.library_id:
                    raise SystemExit("Configure the Papers email and collection in the local UI before running sync/refresh.")
                client = PapersClient()
                try:
                    client.login(profile.settings["PAPERS_EMAIL"], getpass("Papers password (not saved): "))
                except PapersError as error:
                    raise SystemExit(str(error)) from None
                profile = replace(profile, papers_client=client)
            with exclusive_work(), use_profile(profile):
                args.func(args)
    except WorkBusyError as error:
        raise SystemExit(str(error)) from None


if __name__ == "__main__":
    main()
