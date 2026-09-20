"""Synthetic-only browser fixture for saved views, topics and metadata review.

Run: PYTHONPATH=. python tests/preview_refinement.py
Preview rebuild simulates topic renumbering, a split and moved coordinates.
It also fills 25 empty abstracts; one filename title and one unknown abstract remain.
No external API clients or personal data are used.
"""

from functools import partial
import math
from pathlib import Path
from socketserver import ThreadingTCPServer
import tempfile
from urllib.parse import urlsplit

from json_io import write_json_atomically
from local_control import LocalController, save_settings
from serve import ControlHandler, PROJECT_ROOT


def publish(root, changed=False):
    nodes = []
    for i in range(60):
        group = i // 20
        topic = (9 if group == 0 else 10 + (i % 2) if group == 1 else 2) if changed else group
        title = "Synthetic-file.pdf" if i == 0 else f"Synthetic paper {i:02}"
        nodes.append(dict(id=f"P{i:02}", title=title, cluster=topic,
                          weak_assignment=i % 7 == 0, x=group * 300 + math.sin(i * 13.1) * 80,
                          y=math.cos(i * 7.3) * 100 + (180 if changed else 0)))
    topics = [dict(id=9 if changed else 0, label="Synthetic airway topic", paper_count=20,
                   stable_id="airway", color_index=0),
              dict(id=2, label="Synthetic circulation topic", paper_count=20,
                   stable_id="circulation", color_index=2)]
    topics += ([dict(id=10+i, label=f"Synthetic split topic {i}", paper_count=10,
                     stable_id=f"split-{i}", color_index=3+i) for i in range(2)] if changed
               else [dict(id=1, label="Synthetic ventilation topic", paper_count=20,
                          stable_id="ventilation", color_index=1)])
    for topic in topics:
        topic["continuity"] = ("split" if topic["id"] in (10, 11) else "continued") if changed else "baseline"
    revision = "synthetic-changed" if changed else "synthetic-baseline"
    write_json_atomically(root / "data/graph.json", {"revision": revision, "nodes": nodes,
        "edges": [dict(source=f"P{i:02}", target=f"P{i+1:02}", weight=.8) for i in range(59)],
        "status": dict(status_known=True, pending_paper_count=0)})
    write_json_atomically(root / "data/clusters.json", {"revision": revision, "topics": topics})
    write_json_atomically(root / "data/metadata.json", {n["id"]: dict(authors="Synthetic author",
        abstract="" if int(n["id"][1:]) < 25 and not changed else "Synthetic test text, not research evidence.")
        for n in nodes if n["id"] != "P59"})
    write_json_atomically(root / "data/viewer.json", dict(library_id="99999999", library_type="user"))


def main():
    with tempfile.TemporaryDirectory(prefix="szkg-refinement-test-") as directory:
        root = Path(directory)
        save_settings(dict(ZOTERO_LIBRARY_ID="99999999", ZOTERO_LIBRARY_TYPE="user",
                           ZOTERO_API_KEY="synthetic-only", OPENAI_API_KEY="synthetic-only"), root)
        publish(root)

        def runner(operation, approve, progress):
            approve(dict(papers_read=60, cached=60, new=0, edited=0, removed=0,
                         tokens=0, estimated_usd=0, model="synthetic-test", missing_abstracts=0))
            progress("Synthetic-only topic and camera change. No network requests.")
            publish(root, changed=True)

        class Handler(ControlHandler):
            def translate_path(self, path):
                clean = urlsplit(path).path
                if clean.startswith("/data/"):
                    return str(root / clean.lstrip("/"))
                return super().translate_path(path)

        server = ThreadingTCPServer(("127.0.0.1", 8785), partial(Handler, directory=str(PROJECT_ROOT)))
        server.controller = LocalController(root, runner=runner)
        print("Synthetic-only refinement test: http://127.0.0.1:8785/web/index.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
            server.controller.shutdown()


if __name__ == "__main__":
    main()
