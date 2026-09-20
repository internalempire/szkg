"""Serve the viewer and generated data on a loopback-only HTTP server."""

from __future__ import annotations

import http.server
import json
import secrets
import socketserver
import webbrowser
from functools import partial
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs

from data_migration import migrate_local_data
from local_control import LocalController, ConfigurationError
from work_lock import exclusive_work, WorkBusyError
from profiles import select_profile, use_profile


PROJECT_ROOT = Path(__file__).parent
DEFAULT_PORT = 8000

_PUBLIC_PATHS = {
    "/assets/logo.png",
    "/data/clusters.json",
    "/data/graph.json",
    "/data/metadata.json",
    "/data/viewer.json",
    "/web/app-cytoscape.js",
    "/web/dist/app-sigma.bundle.js",
    "/web/index.html",
    "/web/loader.js",
    "/web/map-status.js",
    "/web/explorer.js",
    "/web/saved-views.js",
    "/web/library.js",
    "/web/semantic-overlays.js",
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
            "base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        ))
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


class ControlHandler(NoCacheHandler):
    """Strict same-origin JSON API; static files retain the existing allowlist."""

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def translate_path(self, path):
        clean = unquote(urlsplit(path).path)
        if clean.startswith("/data/") and clean in _PUBLIC_PATHS:
            return str(self._data_profile.data_dir / Path(clean).name)
        return super().translate_path(path)

    def send_head(self):
        # Stale tabs cannot silently read a newly selected connector's map.
        query = parse_qs(urlsplit(self.path).query)
        if urlsplit(self.path).path.startswith("/data/"):
            self._data_profile = self.server.controller.profile()
            if query.get("profile", [self._data_profile.identity])[0] != self._data_profile.identity:
                self.send_error(409, "Profile changed; reload the page")
                return None
        return super().send_head()

    def _trusted_request(self, mutation=False):
        expected = f"127.0.0.1:{self.server.server_address[1]}"
        origin = self.headers.get("Origin")
        if self.headers.get("Host") != expected:
            return False
        if self.headers.get("Sec-Fetch-Site") not in (None, "same-origin", "none"):
            return False
        if mutation and origin != f"http://{expected}":
            return False
        return origin is None or origin == f"http://{expected}"

    def _json(self, status, value):
        body = json.dumps(value).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._trusted_request():
            self._json(403, {"error": "Open SZKG through its local 127.0.0.1 address."})
        elif self.path == "/api/status":
            self._json(200, self.server.controller.status())
        else:
            super().do_GET()

    def do_HEAD(self):
        if not self._trusted_request():
            self.send_error(403)
        else:
            super().do_HEAD()

    def do_POST(self):
        controller = self.server.controller
        token = self.headers.get("X-SZKG-Token", "")
        if not self._trusted_request(mutation=True) or not secrets.compare_digest(token.encode(), controller.token.encode()):
            self._json(403, {"error": "Request rejected. Reload the local page and try again."})
            return
        if self.headers.get_content_type() != "application/json" or self.headers.get("Transfer-Encoding"):
            self._json(415, {"error": "Use a JSON request."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16384:
                raise ValueError()
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            self._json(400, {"error": "Invalid or oversized JSON request."})
            return
        try:
            with controller.profile_request(self.headers.get("X-SZKG-Profile", "")):
                if self.path == "/api/config":
                    result = controller.configure(value)
                elif self.path == "/api/papers/connect":
                    result = controller.connect_papers(value)
                elif self.path == "/api/papers/disconnect" and not value:
                    result = controller.disconnect_papers()
                elif self.path == "/api/jobs" and set(value) == {"operation"}:
                    result = controller.start(value["operation"])
                elif self.path in {"/api/jobs/confirm", "/api/jobs/cancel"} and set(value) == {"id"}:
                    result = controller.decide(value["id"], self.path.endswith("confirm"))
                else:
                    self._json(404, {"error": "Unknown local action."})
                    return
            self._json(200, result)
        except ConfigurationError as error:
            self._json(400, {"error": str(error)})
        except WorkBusyError as error:
            self._json(409, {"error": str(error)})
        except Exception:
            self._json(500, {"error": "Local action failed. Check file permissions and restart SZKG."})

    def log_message(self, _format, *_args):
        # Do not retain request URLs, configuration bodies or credentials.
        pass


def main() -> None:
    # Upgrading old JSON here makes migration automatic even when users only
    # open an existing map and do not run sync or refresh first.
    try:
        with exclusive_work(), use_profile(select_profile(PROJECT_ROOT)):
            migrate_local_data(verbose=True)
    except WorkBusyError:
        print("An update is active; opening the viewer without migrating files.")
    handler = partial(ControlHandler, directory=str(PROJECT_ROOT))
    port = DEFAULT_PORT
    for _attempt in range(20):
        try:
            server = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            port += 1
    else:
        raise SystemExit("No free port found between 8000 and 8019.")

    server.controller = LocalController(PROJECT_ROOT)

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
        print("Waiting for any confirmed local job to finish safely...")
        server.controller.shutdown()


if __name__ == "__main__":
    main()
