"""Read-only, experimental ReadCube source based on readcube-papers-skill.

Protocol reference: https://github.com/YusukeKimata-Moo/readcube-papers-skill
The independent implementation fails closed on incomplete snapshots. Passwords
are used only for login; session cookies stay in memory and never enter JSON.
"""

import json
import socket
import ssl
import urllib.error
import urllib.parse
import urllib.request

from zotero_source import Paper


class PapersError(RuntimeError):
    """Fixed, safe-to-display failure; never includes remote response bodies."""


def _response_shape(value):
    """Describe only known field types, never arbitrary keys or private values."""
    names = {dict: "object", list: "array", str: "string", int: "number",
             float: "number", bool: "boolean", type(None): "null"}
    kind = names.get(type(value), "unknown")
    if not isinstance(value, dict):
        return kind
    fields = [f"{key}={names.get(type(value[key]), 'unknown')}"
              for key in ("status", "success", "error", "errors", "collections", "items", "total") if key in value]
    return kind + " (" + (", ".join(fields) or "no recognized fields") + ")"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Preserve the original response for inspection, without requesting Location.
        return None


class PapersClient:
    LOGIN = "https://services.readcube.com/authentication/login"
    # ReadCube's old sync /collections/ route now redirects here (verified
    # without credentials). Item reads still use the existing sync endpoint.
    COLLECTIONS = "https://services.readcube.com/collections"
    BASE = "https://sync.readcube.com"
    MAX_BYTES = 16 * 1024 * 1024

    def __init__(self):
        self._cookie = ""
        self._opener = urllib.request.build_opener(_NoRedirect())

    def __repr__(self):
        return "PapersClient(session=<redacted>)"

    @property
    def authenticated(self):
        return bool(self._cookie)

    def _open(self, url, data=None):
        # No caller-provided host, redirects, credential-bearing URLs or logging.
        if url != self.LOGIN and url != self.COLLECTIONS and not url.startswith(self.BASE + "/collections/"):
            raise PapersError("Unsupported Papers endpoint.")
        if data is not None and url != self.LOGIN:
            raise PapersError("Papers metadata requests must be read-only.")
        headers = {"Accept": "application/json"}
        if self._cookie and data is None:
            headers["Cookie"] = self._cookie
        request = urllib.request.Request(url, data=data, headers=headers)
        try:
            with self._opener.open(request, timeout=30) as response:
                body = response.read(self.MAX_BYTES + 1)
                if len(body) > self.MAX_BYTES:
                    raise PapersError("Papers response exceeded the safe size limit.")
                return response.headers, body
        except urllib.error.HTTPError as error:
            code = error.code
            response_headers = error.headers
            error.close()
            if code in (301, 302, 303, 307, 308):
                if url == self.LOGIN and data is not None and response_headers.get_all("Set-Cookie", []):
                    # Login can establish its session on a redirect response. Do not
                    # follow it or replay credentials: collections() verifies access
                    # independently on the fixed ReadCube collection endpoint.
                    return response_headers, b""
                stage = "Login returned no session cookie" if url == self.LOGIN else "The collection API redirected access"
                raise PapersError(f"[REDIRECT_HTTP_{code}] {stage}. The redirect was not followed; no credentials were forwarded. The unofficial API flow needs verification.") from None
            if code in (401, 403):
                self._cookie = ""
                raise PapersError(f"ReadCube refused access (HTTP {code}). This can mean invalid credentials, an expired session or an unsupported login requirement.") from None
            if code == 429:
                raise PapersError("Papers rate limit reached. Wait before trying again; no partial snapshot will be applied.") from None
            raise PapersError(f"ReadCube returned HTTP {code}. No partial snapshot will be applied.") from None
        except urllib.error.URLError as error:
            reason = error.reason
            if isinstance(reason, ssl.SSLCertVerificationError):
                message = "[TLS_CERTIFICATE] Python could not verify ReadCube's HTTPS certificate. Keep certificate verification enabled; check the local Python certificate setup."
            elif isinstance(reason, (TimeoutError, socket.timeout)):
                message = "[TIMEOUT] ReadCube did not respond within 30 seconds. Try again later."
            elif isinstance(reason, socket.gaierror):
                message = "[DNS] Python could not find the ReadCube server. Check your network or VPN."
            else:
                message = "[NETWORK] Python could not connect to ReadCube. Check your network or VPN."
            raise PapersError(message) from None
        except TimeoutError:
            raise PapersError("[TIMEOUT] ReadCube did not respond within 30 seconds. Try again later.") from None
        except (OSError, ValueError):
            raise PapersError("Could not read Papers. Check the connection and try again.") from None

    def login(self, email, password):
        if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password:
            raise PapersError("Enter your Papers email and password locally.")
        self._cookie = ""
        try:
            headers, _ = self._open(self.LOGIN, urllib.parse.urlencode(dict(
                client="webapp", api="", client_version="", email=email.strip(), password=password)).encode())
        except PapersError as error:
            raise PapersError("[PAPERS_LOGIN] " + str(error)) from None
        cookies = [value.split(";", 1)[0].strip() for value in headers.get_all("Set-Cookie", [])]
        self._cookie = "; ".join(cookies)
        if not self._cookie:
            raise PapersError("[PAPERS_SESSION] ReadCube returned no session cookie. The unofficial login method may not be supported.")
        # A cookie alone is not proof of authentication.
        try:
            return self.collections()
        except PapersError as error:
            self._cookie = ""
            raise PapersError("[PAPERS_COLLECTIONS] Login returned a cookie, but collection access failed. " + str(error)) from None

    def _get(self, path, params=None):
        if not self._cookie:
            raise PapersError("Connect Papers for this server session before reading the library.")
        url = self.COLLECTIONS if path == "/collections" else self.BASE + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        _, body = self._open(url)
        try:
            value = json.loads(body)
        except (ValueError, UnicodeError):
            raise PapersError("Papers returned an unreadable response. No data will be replaced.") from None
        # The current ReadCube web client consumes collections/items directly;
        # status='ok' belongs to the older API and is not always returned now.
        # Positive payload validation replaces that legacy marker, not safety.
        failure = not isinstance(value, dict)
        if not failure:
            failure = (bool(value.get("error")) or bool(value.get("errors")) or value.get("success") is False
                       or ("status" in value and value["status"] != "ok"))
        if failure:
            raise PapersError("[PAPERS_RESPONSE] ReadCube returned an error or unsupported response. No data will be replaced. Shape: " + _response_shape(value))
        if path == "/collections":
            valid = isinstance(value.get("collections"), list)
        else:
            valid = isinstance(value.get("items"), list) and type(value.get("total")) is int and value["total"] >= 0
        if not valid:
            raise PapersError("[PAPERS_SCHEMA] ReadCube response is missing the required data fields. No data will be replaced. Shape: " + _response_shape(value))
        return value

    def collections(self):
        items = self._get("/collections").get("collections")
        if not isinstance(items, list):
            raise PapersError("Papers collection response is incomplete.")
        result, seen = [], set()
        for item in items:
            if not isinstance(item, dict):
                raise PapersError("Papers collection response contains an unsupported record.")
            key = item.get("id") or item.get("collection_id")
            if type(key) not in (str, int) or not str(key).strip():
                raise PapersError("Papers collection response contains no stable identity.")
            key = str(key)
            name = item.get("name")
            if name is not None and not isinstance(name, str):
                raise PapersError("Papers collection name has an unsupported format.")
            if key in seen:
                raise PapersError("Papers collection response repeats an identity.")
            seen.add(key)
            result.append(dict(id=key, name=name or "Unnamed collection"))
        return result

    def read_collection(self, collection_id):
        if not collection_id:
            raise PapersError("Choose a Papers collection explicitly.")
        path = "/collections/" + urllib.parse.quote(collection_id, safe="") + "/items"
        records, seen_ids, seen_cursors = [], set(), set()
        cursor, expected_total = None, None
        for _ in range(10000):
            params = {"size": 50}
            if cursor:
                params.update({"scroll_id": cursor, "sort[]": "title,asc"})
            page = self._get(path, params)
            items, total = page.get("items"), page.get("total")
            if not isinstance(items, list) or type(total) is not int or total < 0:
                raise PapersError("Papers did not provide a verifiable page and total count.")
            if expected_total is not None and total != expected_total:
                raise PapersError("The Papers collection changed while reading. Retry the complete preview.")
            expected_total = total
            for item in items:
                if not isinstance(item, dict) or not item.get("id"):
                    raise PapersError("Papers returned a record without a stable identity.")
                key = str(item["id"])
                if key in seen_ids:
                    raise PapersError("Papers pagination repeated a record. Retry the complete preview.")
                seen_ids.add(key)
                records.append(item)
            if len(records) == total:
                return records
            cursor = page.get("scroll_id")
            if len(records) > total or not items or not isinstance(cursor, str) or not cursor or cursor in seen_cursors:
                raise PapersError("Papers pagination is incomplete. No local removals or embedding requests will be applied.")
            seen_cursors.add(cursor)
        raise PapersError("Papers exceeded the safe pagination limit.")


class PapersSource:
    """Complete snapshots only: no invented Zotero-style incremental cursor."""

    supports_incremental = False

    def __init__(self, client, collection_id):
        self.client, self.collection_id = client, collection_id

    def fetch_all(self, limit=None):
        raw = self.client.read_collection(self.collection_id)
        papers = []
        for item in raw:
            article = item.get("article")
            if not isinstance(article, dict):
                raise PapersError("Papers metadata format is unsupported. No snapshot will be applied.")
            title, abstract = article.get("title", ""), article.get("abstract", "")
            if title is None: title = ""
            if abstract is None: abstract = ""
            if not isinstance(title, str) or not isinstance(abstract, str):
                raise PapersError("Papers title or abstract has an unsupported format.")
            if not title.strip():
                continue
            authors = article.get("authors") or []
            if not isinstance(authors, list) or any(not isinstance(author, str) for author in authors):
                raise PapersError("Papers author format is unsupported; inspect the connector before retrying.")
            # Same whitespace and title/abstract boundary as the Zotero connector.
            papers.append(Paper(str(item["id"]), title.strip(), abstract.strip(), "article", 0,
                                ", ".join(authors), str(article.get("journal") or ""), str(article.get("year") or "")))
        return (papers[:limit] if limit is not None else papers), 0
