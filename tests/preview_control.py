"""Manual browser fixture: temporary data, fake credentials, no remote services.

Run from the repository: PYTHONPATH=. python tests/preview_control.py
This fixture intentionally replaces the pipeline and never imports API clients.
"""

from functools import partial
from pathlib import Path
from socketserver import ThreadingTCPServer
import tempfile
import time
from urllib.parse import urlsplit

from json_io import write_json_atomically
from local_control import LocalController
from serve import ControlHandler, PROJECT_ROOT


def main():
    with tempfile.TemporaryDirectory(prefix="szkg-browser-test-") as directory:
        root = Path(directory)

        def runner(operation, approve, progress):
            progress("Synthetic test: preparing a fake Zotero preview. No network requests.")
            approve(dict(papers_read=3, cached=0, new=3, edited=0, removed=0,
                         tokens=120, estimated_usd=0.0000024,
                         model="synthetic-test-model", missing_abstracts=1))
            progress("Synthetic test: simulating local processing.")
            time.sleep(1)
            write_json_atomically(root / "data/graph.json", {
                "nodes": [dict(id=f"P{i}", title=f"Synthetic paper {i}", cluster=0,
                               weak_assignment=False, x=i*30, y=i%2*30) for i in range(3)],
                "edges": [dict(source="P0", target="P1", weight=.8)],
                "status": dict(status_known=True, pending_paper_count=0),
            })
            write_json_atomically(root / "data/clusters.json", {"topics": [dict(id=0, label="Synthetic topic", paper_count=3)]})
            write_json_atomically(root / "data/metadata.json", {f"P{i}": dict(authors="Synthetic author", abstract="Synthetic abstract" if i else "") for i in range(3)})
            write_json_atomically(root / "data/viewer.json", {"library_id": "123", "library_type": "user"})

        class FixtureHandler(ControlHandler):
            def translate_path(self, path):
                # Never expose the real project's personal data through the fixture.
                clean = urlsplit(path).path
                if clean.startswith("/data/"):
                    return str(root / clean.lstrip("/"))
                return super().translate_path(path)

        server = ThreadingTCPServer(("127.0.0.1", 8784), partial(FixtureHandler, directory=str(PROJECT_ROOT)))
        server.controller = LocalController(root, runner=runner)
        print("Synthetic-only UI test: http://127.0.0.1:8784/web/index.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close(); server.controller.shutdown()


if __name__ == "__main__":
    main()
