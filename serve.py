"""Serve the viewer and generated data on a loopback-only HTTP server."""

from __future__ import annotations

import http.server
import socketserver
import webbrowser
from functools import partial
from pathlib import Path

from data_migration import migrate_local_data


PROJECT_ROOT = Path(__file__).parent
DEFAULT_PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Prevent stale graph or frontend files from being reused by the browser."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


def main() -> None:
    # Upgrading old JSON here makes migration automatic even when users only
    # open an existing map and do not run sync or refresh first.
    migrate_local_data(verbose=True)
    handler = partial(NoCacheHandler, directory=str(PROJECT_ROOT))
    port = DEFAULT_PORT
    for _attempt in range(20):
        try:
            server = socketserver.TCPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            port += 1
    else:
        raise SystemExit("No free port found between 8000 and 8019.")

    url = f"http://127.0.0.1:{port}/web/index.html"
    print(f"Server started. The map is available at:\n    {url}")
    print("Opening the browser. Press Ctrl+C here to stop the server.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
