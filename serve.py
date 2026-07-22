"""Serve the viewer and generated data on a loopback-only HTTP server."""

from __future__ import annotations

import http.server
import socketserver
import webbrowser
from functools import partial
from pathlib import Path
from urllib.parse import unquote, urlsplit

from data_migration import migrate_local_data


PROJECT_ROOT = Path(__file__).parent
DEFAULT_PORT = 8000

_PUBLIC_PATHS = {
    "/assets/logo.png",
    "/data/clusters.json",
    "/data/graph.json",
    "/data/metadata.json",
    "/web/app-cytoscape.js",
    "/web/dist/app-sigma.bundle.js",
    "/web/index.html",
    "/web/loader.js",
    "/web/style.css",
    "/web/vendor/cose-base.js",
    "/web/vendor/cytoscape-fcose.js",
    "/web/vendor/cytoscape.min.js",
    "/web/vendor/layout-base.js",
}


def is_public_path(raw_path: str) -> bool:
    """Return whether an HTTP path belongs to the viewer's explicit allowlist."""
    path = unquote(urlsplit(raw_path).path)
    return path in _PUBLIC_PATHS


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Serve only viewer assets and prevent stale or unsafe browser behavior."""

    def send_head(self):
        if not is_public_path(self.path):
            self.send_error(http.HTTPStatus.NOT_FOUND, "Not found")
            return None
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Content-Security-Policy", (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'"
        ))
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


def main() -> None:
    # Upgrading old JSON here makes migration automatic even when users only
    # open an existing map and do not run sync or refresh first.
    migrate_local_data(verbose=True)
    handler = partial(NoCacheHandler, directory=str(PROJECT_ROOT))
    port = DEFAULT_PORT
    for _attempt in range(20):
        try:
            server = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler)
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
