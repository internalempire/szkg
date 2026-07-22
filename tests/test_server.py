"""Loopback-only tests for the local viewer server's public surface."""

from __future__ import annotations

import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from functools import partial
from pathlib import Path

from serve import NoCacheHandler, is_public_path
from socketserver import ThreadingTCPServer


class _QuietHandler(NoCacheHandler):
    def log_message(self, _format: str, *_args) -> None:
        pass


class ServerSecurityTests(unittest.TestCase):
    def test_viewer_configuration_is_public_but_other_data_is_not(self) -> None:
        self.assertTrue(is_public_path("/data/viewer.json"))
        self.assertTrue(is_public_path("/web/semantic-overlays.js"))
        self.assertFalse(is_public_path("/data/state.json"))

    def test_serves_viewer_but_denies_secrets_and_traversal(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "web").mkdir()
            (root / "web" / "index.html").write_text("viewer", encoding="utf-8")
            (root / ".env").write_text("secret", encoding="utf-8")
            handler = partial(_QuietHandler, directory=str(root))
            server = ThreadingTCPServer(("127.0.0.1", 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_address[1]}"
            try:
                with urllib.request.urlopen(base + "/web/index.html") as response:
                    self.assertEqual(response.read(), b"viewer")
                    self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
                    self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])
                for path in ("/.env", "/data/../.env", "/web/"):
                    with self.subTest(path=path):
                        with self.assertRaises(urllib.error.HTTPError) as caught:
                            urllib.request.urlopen(base + path)
                        self.assertEqual(caught.exception.code, 404)
                        caught.exception.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)
