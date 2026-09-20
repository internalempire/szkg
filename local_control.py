"""Bounded local jobs and secret-safe configuration for the browser controller.

The worker keeps the exact Zotero read in memory until the user approves it.
No shell commands, arbitrary paths or exception payloads enter the HTTP API.
"""

from __future__ import annotations

import copy
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import threading

from config import SETTING_NAMES, read_settings
from work_lock import exclusive_work, WorkBusyError
from profiles import select_profile, use_profile
from papers_source import PapersClient, PapersError

ACTIVE_STATES = {"preparing", "awaiting_confirmation", "running"}


class ConfigurationError(ValueError):
    pass


class PreviewCancelled(Exception):
    pass


def read_object(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_settings(values: dict, root: Path) -> None:
    """Preserve unrelated .env lines; never return stored secret values."""
    path = root / ".env"
    current = read_settings(path)
    if set(values) - set(SETTING_NAMES):
        raise ConfigurationError("Unsupported configuration field.")
    if any(not isinstance(value, str) for value in values.values()):
        raise ConfigurationError("Configuration values must be text.")
    updates = {name: value.strip() for name, value in values.items()}
    # Empty password fields mean 'keep saved key', never silently erase it.
    for name in ("ZOTERO_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        if not updates.get(name):
            updates.pop(name, None)
    merged = {**current, **updates}
    source = merged["LIBRARY_SOURCE"] or "zotero"
    service = merged["EMBEDDING_SERVICE"] or "openai"
    if source not in {"zotero", "papers"} or service not in {"openai", "openrouter"}:
        raise ConfigurationError("Choose Zotero or Papers, and OpenAI or OpenRouter.")
    if any(len(value) > 4096 or any(char in value for char in "\r\n\x00'") for value in updates.values()):
        raise ConfigurationError("A setting contains unsupported characters or is too long.")
    merged["ZOTERO_LIBRARY_TYPE"] = merged["ZOTERO_LIBRARY_TYPE"] or "user"
    if source == "zotero" and not re.fullmatch(r"[0-9]+", merged["ZOTERO_LIBRARY_ID"]):
        raise ConfigurationError("Enter the numeric Zotero library ID.")
    if merged["ZOTERO_LIBRARY_TYPE"] not in {"user", "group"}:
        raise ConfigurationError("Choose a personal or group library.")
    for name in ("ZOTERO_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        if merged[name] and not re.fullmatch(r"[A-Za-z0-9_.:-]+", merged[name]):
            raise ConfigurationError("An API key contains unsupported characters. Paste the key only.")
    if source == "zotero" and not merged["ZOTERO_API_KEY"]:
        raise ConfigurationError("Enter a read-only Zotero API key.")
    if source == "papers" and ("@" not in merged["PAPERS_EMAIL"] or not merged["PAPERS_COLLECTION_ID"]):
        raise ConfigurationError("Enter your Papers email and choose a collection after connecting.")
    for name, value in updates.items():
        if name in os.environ and os.environ[name].strip() != value:
            raise ConfigurationError("A process environment setting overrides this field. Change it before restarting SZKG.")
    state = read_object(root / "data/state.json")
    viewer = read_object(root / "data/viewer.json")
    stored_id = state.get("zotero_library_id", viewer.get("library_id"))
    stored_type = state.get("zotero_library_type", viewer.get("library_type"))
    legacy = source == "zotero" and service == "openai"
    if legacy and not stored_id and (root / "data/lancedb").exists():
        stored_id, stored_type = current["ZOTERO_LIBRARY_ID"], current["ZOTERO_LIBRARY_TYPE"] or "user"
        if not stored_id:
            raise ConfigurationError("This cache has no recorded library identity. Verify its original configuration before connecting a library.")
    if legacy and stored_id and (str(stored_id), stored_type) != (merged["ZOTERO_LIBRARY_ID"], merged["ZOTERO_LIBRARY_TYPE"]):
        raise ConfigurationError("This data folder belongs to a different library. Use its original ID or a separate project folder.")
    updates["ZOTERO_LIBRARY_TYPE"] = merged["ZOTERO_LIBRARY_TYPE"]
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    kept = [line for line in lines if not any(
        re.match(rf"\s*(?:export\s+)?{name}\s*=", line) for name in updates)]
    text = "\n".join(kept + [f"{name}='{value}'" for name, value in updates.items()]) + "\n"
    temporary = None
    try:
        # A crash may leave the temporary file behind: .env.* is also Git-ignored.
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=root,
                                         prefix=".env.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            os.chmod(temporary, 0o600)
            stream.write(text); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)


def run_pipeline(operation, approve, progress):
    # Import scientific dependencies only for a job, not to open an offline map.
    from pipeline import sync_library, sync_embeddings, rebuild_map, commit_sync_state
    if operation == "sync":
        sync_library(verbose=False, before_apply=approve, progress=progress)
    else:
        store, result = sync_embeddings(verbose=False, force_full=True, before_apply=approve, progress=progress)
        rebuild_map(store, verbose=False, progress=progress)
        commit_sync_state(result)


class LocalController:
    def __init__(self, root: Path, runner=run_pipeline, confirmation_timeout=1800):
        self.root = root
        self.runner = runner
        self.confirmation_timeout = confirmation_timeout
        self.token = secrets.token_urlsafe(32)
        self._mutex = threading.RLock()
        self._decision = threading.Event()
        self._approved = False
        self._cancelled = False
        self._job = {"state": "idle", "message": "Ready. Opening this app does not contact external services."}
        self._worker = None
        self._papers_client = None
        self._papers_email = ""
        self._papers_collections = []
        self._profile = None

    def profile(self):
        return select_profile(self.root, papers_client=self._papers_client)

    @contextmanager
    def profile_request(self, expected):
        # Check and dispatch under one lock: two tabs cannot cross-confirm profiles.
        with self._mutex:
            if not expected or not secrets.compare_digest(expected, self.profile().identity):
                raise WorkBusyError("The selected profile changed. Reload this tab before making changes.")
            yield

    def connect_papers(self, values):
        if set(values) != {"email", "password"} or any(not isinstance(v, str) or len(v) > 4096 for v in values.values()):
            raise ConfigurationError("Enter the Papers email and password locally.")
        with self._mutex:
            if self._job["state"] in ACTIVE_STATES:
                raise WorkBusyError("Finish or cancel the active preview before connecting Papers.")
            self._papers_client = None
            self._papers_collections = []
            client = PapersClient()
            try:
                collections = client.login(values["email"], values["password"])
            except PapersError as error:
                raise ConfigurationError(str(error)) from None
            self._papers_client = client
            self._papers_email = values["email"].strip().lower()
            self._papers_collections = collections
            return self.status()

    def disconnect_papers(self):
        with self._mutex:
            if self._job["state"] in ACTIVE_STATES:
                raise WorkBusyError("Finish or cancel the active preview before disconnecting.")
            self._papers_client = None
            self._papers_email = ""
            self._papers_collections = []
            return self.status()

    def status(self):
        with self._mutex:
            values = read_settings(self.root / ".env")
            profile = select_profile(self.root, values)
            graph = read_object(profile.data_dir / "graph.json")
            metadata = read_object(profile.data_dir / "metadata.json")
            connected = bool(self._papers_client and self._papers_client.authenticated)
            papers_ready = bool(connected and self._papers_email == values["PAPERS_EMAIL"].strip().lower()
                                and profile.library_id in {c["id"] for c in self._papers_collections})
            return {"token": self.token, "job": copy.deepcopy(self._job),
                    "configuration": {
                        "library_id": values["ZOTERO_LIBRARY_ID"],
                        "library_type": values["ZOTERO_LIBRARY_TYPE"] or "user",
                        "zotero_key_saved": bool(values["ZOTERO_API_KEY"]),
                        "openai_key_saved": bool(values["OPENAI_API_KEY"]),
                        "openrouter_key_saved": bool(values["OPENROUTER_API_KEY"]),
                        "embedding_key_saved": bool(profile.api_key),
                        "source": profile.source, "service": profile.service,
                        "source_name": profile.source_name, "service_name": profile.service_name,
                        "profile_id": profile.identity, "model": profile.model, "dimensions": 1536,
                        "papers_email": values["PAPERS_EMAIL"],
                        "papers_collection_id": values["PAPERS_COLLECTION_ID"],
                        "viewer_identity": profile.viewer(),
                        "papers_connected": connected,
                        "papers_session_email": self._papers_email,
                        "papers_collections": list(self._papers_collections),
                        "ready": papers_ready if profile.source == "papers" else bool(values["ZOTERO_LIBRARY_ID"] and values["ZOTERO_API_KEY"]),
                    },
                    "map_available": bool("nodes" in graph and (profile.data_dir / "clusters.json").exists()),
                    "health": {"mapped_papers": len(graph.get("nodes", [])),
                               "metadata_records": len(metadata),
                               "missing_abstracts": sum(not str(item.get("abstract", "")).strip() for item in metadata.values() if isinstance(item, dict))}}

    def configure(self, values):
        with self._mutex:
            if self._job["state"] in ACTIVE_STATES:
                raise WorkBusyError("Finish or cancel the current preview before changing settings.")
            with exclusive_work(self.root / "data/.writer.lock"):
                save_settings(values, self.root)
            self._job = {"state": "idle", "message": "Settings saved. Preview reads metadata; embeddings require confirmation."}
            return self.status()

    def start(self, operation):
        if not isinstance(operation, str) or operation not in {"sync", "rebuild"}:
            raise ConfigurationError("Choose Sync library or Rebuild map.")
        with self._mutex:
            if self._job["state"] in ACTIVE_STATES:
                raise WorkBusyError("A job is already active. Its progress is shown below.")
            if not self.status()["configuration"]["ready"]:
                raise ConfigurationError("Save connection settings first. Papers also requires a connected session and selected collection.")
            self._profile = self.profile()
            self._decision = threading.Event()
            self._approved = self._cancelled = False
            self._job = {"id": secrets.token_hex(12), "operation": operation, "state": "preparing",
                         "message": f"Reading {self._profile.source_name} for a preview. No embedding request yet."}
            self._worker = threading.Thread(target=self._run, daemon=False)
            self._worker.start()
            return self.status()

    def decide(self, job_id, approve):
        with self._mutex:
            if job_id != self._job.get("id"):
                raise ConfigurationError("This preview is no longer current. Reload the job status.")
            allowed = {"awaiting_confirmation"} if approve else {"preparing", "awaiting_confirmation"}
            if self._job["state"] not in allowed or self._decision.is_set():
                raise WorkBusyError("This job can no longer accept that action.")
            preview = self._job.get("preview", {})
            if approve and preview.get("new", 0) + preview.get("edited", 0) and not self._profile.api_key:
                raise ConfigurationError(f"An {self._profile.service_name} key is required. Cancel this preview, save the key in Connection settings, then preview again.")
            self._approved = approve
            self._cancelled = not approve
            if approve:
                self._job.update(state="running", message="Applying the confirmed changes. Keep SZKG running.")
            else:
                self._job.update(cancel_requested=True, message="Cancellation requested. Waiting for the metadata read to finish; no changes will be applied.")
            self._decision.set()
            return self.status()

    def _approve(self, preview):
        with self._mutex:
            if self._cancelled:
                raise PreviewCancelled()
            self._job.update(state="awaiting_confirmation", preview=preview,
                             message="Library read complete. Review the changes before applying them.")
        if not self._decision.wait(self.confirmation_timeout):
            raise PreviewCancelled()
        if not self._approved:
            raise PreviewCancelled()

    def _progress(self, message):
        with self._mutex:
            self._job["message"] = message

    def _run(self):
        try:
            with exclusive_work(self.root / "data/.writer.lock"), use_profile(self._profile):
                self.runner(self._job["operation"], self._approve, self._progress)
            with self._mutex:
                self._job.update(state="succeeded", message="Local map updated. Open or reload the map to see the result.")
        except PreviewCancelled:
            with self._mutex:
                self._job.update(state="cancelled", message="Preview cancelled or expired. No embedding request or library changes were applied.")
        except (Exception, SystemExit) as error:
            # Provider exceptions can contain request bodies or keys. Never send
            # arbitrary exception text to the browser or a persistent log.
            if isinstance(error, (ConfigurationError, WorkBusyError, PapersError)):
                message = str(error)
            elif isinstance(error, SystemExit):
                message = "Configuration or cache compatibility check failed. Check the library identity and saved keys; use a separate folder for a different library."
            else:
                message = "The operation failed. Check your connection, API permissions and account quota, then prepare a new preview. Completed embedding batches remain cached."
            with self._mutex:
                self._job.update(state="failed", message=message)

    def shutdown(self):
        with self._mutex:
            if self._job["state"] in {"preparing", "awaiting_confirmation"}:
                self._cancelled = True
                self._decision.set()
        if self._worker:
            # Do not tear down a confirmed writer in the middle of publication.
            self._worker.join()
