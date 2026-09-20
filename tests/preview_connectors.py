"""Disposable browser fixture for connector switching; no real login or paid API.

Run: PYTHONPATH=. python tests/preview_connectors.py
Use any nonempty synthetic password. All files are temporary.
"""

from functools import partial
from pathlib import Path
from socketserver import ThreadingTCPServer
import tempfile

import local_control
from local_control import LocalController, save_settings
from json_io import write_json_atomically
from profiles import CURRENT, select_profile
from papers_source import PapersError
from serve import ControlHandler, PROJECT_ROOT


class FakePapersClient:
    authenticated = True
    def login(self, email, password):
        if password == "fail":
            raise PapersError("Synthetic login refused. Use another dummy password.")
        return [dict(id="synthetic-collection", name="Synthetic Papers collection"),
                dict(id="broken", name="Synthetic incomplete read")]


def publish(profile):
    title = profile.source_name
    revision = "synthetic-" + profile.identity
    nodes = [dict(id=f"P{i}", title=f"Synthetic {title} paper {i}", cluster=0,
                  weak_assignment=False, x=(i % 4)*45, y=(i // 4)*45) for i in range(8)]
    write_json_atomically(profile.data_dir / "graph.json", dict(revision=revision, profile_id=profile.identity,
        nodes=nodes, edges=[dict(source="P0", target="P1", weight=.8)],
        status=dict(status_known=True, pending_paper_count=0)))
    write_json_atomically(profile.data_dir / "clusters.json", dict(revision=revision, profile_id=profile.identity,
        topics=[dict(id=0, label=f"Synthetic {title} topic", paper_count=8)]))
    write_json_atomically(profile.data_dir / "metadata.json", {n["id"]: dict(abstract="" if i == 0 else "Synthetic abstract") for i, n in enumerate(nodes)})
    write_json_atomically(profile.data_dir / "viewer.json", profile.viewer())


def main():
    local_control.PapersClient = FakePapersClient
    with tempfile.TemporaryDirectory(prefix="szkg-connectors-test-") as directory:
        root = Path(directory)
        save_settings(dict(ZOTERO_LIBRARY_ID="99999999", ZOTERO_API_KEY="synthetic-key",
                           OPENAI_API_KEY="synthetic-key"), root)
        publish(select_profile(root))

        def runner(operation, approve, progress):
            profile = CURRENT.get()
            if profile.library_id == "broken":
                raise PapersError("Synthetic incomplete read. No local changes or embeddings applied.")
            approve(dict(papers_read=8, cached=0, new=8, edited=0, removed=0, tokens=80,
                         estimated_usd=.0000016, model=profile.model, missing_abstracts=1))
            publish(profile)

        server = ThreadingTCPServer(("127.0.0.1", 8786), partial(ControlHandler, directory=str(PROJECT_ROOT)))
        server.controller = LocalController(root, runner=runner)
        print("Synthetic-only connectors: http://127.0.0.1:8786/web/index.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close(); server.controller.shutdown()


if __name__ == "__main__":
    main()
