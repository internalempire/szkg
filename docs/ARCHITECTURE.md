# Architecture and data contracts

This document is the technical companion to the main README. It describes the
boundaries between components, the files they exchange, and the decisions that
should remain stable when the project evolves.

## Design goals

- Keep the research library read-only: the application reads Zotero or Papers
  metadata and never edits remote items.
- Keep personal derived data local and outside version control.
- Pay for an embedding only when a paper's title or abstract is new or edited.
- Make daily updates fast without moving the existing map.
- Allow a periodic full rebuild for better global grouping.
- Render thousands of nodes and edges on the GPU, while retaining a proven CPU
  fallback.
- Keep external services replaceable behind small Python interfaces.

## End-to-end flow

```text
Zotero Web API
  -> zotero_source.py: normalized Paper records
  -> embeddings.py: 1,536-dimensional semantic vectors
  -> store.py: persistent LanceDB cache
       -> graph.py: cosine k-nearest-neighbor links
       -> clustering.py: PCA, HDBSCAN, and c-TF-IDF topics
       -> layout.py: PCA and t-SNE coordinates
  -> pipeline.py: graph.json, clusters.json, metadata.json, viewer.json, and state.json
  -> web/: Graphology model and Sigma.js/WebGL renderer
```

`app.py` exposes the three workflows: `sync`, `refresh`, and `serve`.

## Selectable connectors and profile isolation

`LIBRARY_SOURCE=zotero|papers` and `EMBEDDING_SERVICE=openai|openrouter` are
independent settings; old installations default to Zotero/OpenAI. `profiles.py`
resolves them to an immutable profile. Its hash includes source, Papers account
where applicable, library/collection identity, embedding service, fixed model,
dimensions and input-preparation version. The legacy Zotero/OpenAI profile keeps
`data/` and its existing library-identity guard. All other combinations use
`data/profiles/<hash>/`; there is no automatic cache copying, deduplication or
cross-provider vector reuse.

`use_profile()` binds paths through a `ContextVar`, not process-global mutable
constants. A worker captures its profile before it starts. Store, migrations,
pipeline output and local diagnostics resolve paths in that context. All
profiles share the root `data/.writer.lock`, preventing simultaneous writers.

`papers_source.py` implements the read-only protocol documented by the external
[ReadCube skill](https://github.com/YusukeKimata-Moo/readcube-papers-skill), without
running its script or installing it. Login uses the fixed ReadCube authentication
host. Collection listing uses `https://services.readcube.com/collections`:
the original `https://sync.readcube.com/collections/` was verified to return a
301 to that exact URL without credentials. Item pagination still uses the
original fixed sync host; its unauthenticated probe did not show that redirect.
Redirects are never followed.
The current public ReadCube web client (v5.4.21, inspected at
`https://app.readcube.com/chunk-YHBK2SZJ.js`) reads `collections` directly and
uses `id || collection_id`. Its item client consumes `items`/`total` directly.
The connector therefore does not require the older top-level `status: "ok"`
when that field is absent. Explicit failure markers still reject the response;
collection arrays/identities and item arrays/nonnegative integer totals are
mandatory. Unknown shapes produce only a bounded summary of known field types,
never arbitrary keys, field values, raw response bodies or credentials.
A login redirect carrying `Set-Cookie` is consumed as a response, without
requesting its destination or replaying credentials; the subsequent collection
read must independently verify access. Redirects without a login cookie and
all collection redirects fail with a safe HTTP diagnostic code. Requests
have a 30-second timeout and bounded responses. Passwords are used transiently;
cookies and the verified collection list remain in server memory. HTTP 401/403
clears the session. SSO/MFA and verified direct item links are not implemented.

Papers has no supported version cursor here: every preview reads a complete
explicitly selected collection. Pagination requires a stable total count, unique
item IDs and nonrepeating cursors, and rejects incomplete/error responses before
opening the cache or applying removals. A valid zero-item response is distinct
from a failed read and still goes through confirmation. Records normalize to the
existing `Paper` model; blank titles are skipped, unsupported formats stop the
snapshot. An unchanged total cannot prove transactional consistency during
concurrent remote edits: the API's snapshot guarantees remain unverified.

OpenRouter uses the existing OpenAI-compatible SDK with base URL
`https://openrouter.ai/api/v1`, model `openai/text-embedding-3-small` and explicit
1,536 dimensions. Direct OpenAI uses `text-embedding-3-small`; neither path
configures model fallback. Both use the same title/abstract preparation,
tokenizer and downstream algorithms. Response indices, dimensions and finite,
nonzero vectors are checked. Model choice is intentionally not exposed yet.
The pricing table is an estimate; unknown prices remain unavailable, not zero.

`viewer.json` and state add source, profile ID, library identity, embedding
service/model/dimensions; published graph and cluster files also carry the profile
ID. Passwords, cookies and API keys never enter these files. Papers and
OpenRouter bookmarks are profile-scoped; the original Zotero/OpenAI bookmark key
is preserved. Both renderers suppress Zotero links for Papers and fall back only
to the verified control API identity if viewer metadata is missing.

Validation covers synthetic API responses, an end-to-end local cache test and
both browser renderers. A user has confirmed live Papers connection and collection
discovery after the endpoint/schema fixes. This does not verify every account or
authentication method. A separate authenticated OpenRouter billing test is not
recorded; model/dimension consistency and request construction are tested locally.

## Python components

### Configuration and sources

- `config.py` reads `.env`, validates Zotero and OpenAI settings, and returns
  typed configuration objects. Secret values are never committed.
- `zotero_source.py` defines the `Paper` data model and the Zotero source
  interface. `PyzoteroSource` fetches eligible top-level library items, using a
  stored Zotero library version for incremental reads. It combines changed
  top-level items, trashed items, and the read-only Zotero deleted-object log.
- `embeddings.py` defines an embedding-provider interface. The current
  implementation uses OpenAI `text-embedding-3-small` and returns vectors plus
  provider-reported token usage.
- `costs.py` counts tokens and centralizes the local price estimate. It is an
  estimate only; provider pricing remains the authoritative source.

### Storage and analysis

- `store.py` stores item key, title, abstract, source version, vector metadata,
  and embedding vector in `data/lancedb/`. Zotero item keys are the cache
  identity: an existing key is re-embedded only when its title or abstract
  changed, and `upsert` then replaces the row in place instead of duplicating it.
  Opening an existing cache validates its vector dimension and embedding model
  before any data can be mixed. Deleted Zotero keys are removed locally.
- `graph.py` connects each paper to up to eight neighbors whose cosine
  similarity is at least `0.5`. Endpoint pairs are sorted to turn asymmetric
  k-nearest-neighbor results into deduplicated undirected edges.
- `clustering.py` reduces vectors to at most 50 PCA dimensions, discovers dense
  groups with HDBSCAN, and labels them with class-based TF-IDF keywords. An
  HDBSCAN outlier receives a weak topic assignment only when sufficiently
  similar classified neighbors can support it.
- `layout.py` calculates two-dimensional positions with PCA followed by t-SNE,
  then gently pulls dense topic members toward their topic's robust median.
  Weak neighbor-assigned members move less, preserving their visual uncertainty.
  The random seeds are fixed, and layout runs in Python so page loading does not
  block on a browser-side force simulation.

### Orchestration

- `sync_embeddings()` reads only Zotero changes when a saved version is
  available, embeds papers that are new or whose title/abstract changed, skips
  cached papers whose text is unchanged, prunes remotely removed keys, and
  returns the safely covered Zotero version.
- `rebuild_map()` recalculates graph, topics, labels, and positions for every
  cached paper. It does not re-embed existing keys.
- `add_to_map_incrementally()` gives each new paper neighbor links, a
  similarity-weighted topic, and a position near its neighbors. Existing nodes
  do not move, so this is fast but less globally accurate than a rebuild. For a
  re-embedded paper it corrects only the displayed title; its links, topic, and
  position are recomputed by the next `rebuild_map()`.
- `sync_library()` combines embedding synchronization and incremental map
  insertion. It reconciles cache keys missing from the map after an interrupted
  run, compares published content fingerprints with cached titles/abstracts,
  removes stale map nodes and incident edges, and advances `state.json` only
  after map publication succeeds. Stored library identity prevents one Zotero
  library's state from pruning another library's cache.
- `data_migration.py` upgrades JSON metadata from the original legacy schema
  before any workflow reads it.

## Generated data contracts

All generated files live under `data/` and are excluded from Git.

### `graph.json`

```json
{
  "revision": "matching-snapshot-id",
  "nodes": [
    {
      "id": "ZOTERO_KEY",
      "title": "Paper title",
      "cluster": 3,
      "cluster_label": "airway, ventilation, pressure",
      "weak_assignment": false,
      "x": 12.34,
      "y": -56.78
    }
  ],
  "edges": [
    {
      "source": "ZOTERO_KEY",
      "target": "OTHER_KEY",
      "weight": 0.7342
    }
  ]
}
```

Edges are undirected. `weight` is cosine similarity. Cluster `-1` means
unclassified.

### `clusters.json`

```json
{
  "revision": "matching-snapshot-id",
  "topics": [
    {
      "id": 3,
      "label": "airway, ventilation, pressure",
      "keywords": ["airway", "ventilation", "pressure"],
      "paper_count": 42
    }
  ],
  "assignments": {
    "ZOTERO_KEY": 3
  }
}
```

### `state.json`

```json
{
  "last_zotero_version": 12345,
  "zotero_library_id": "1234567",
  "zotero_library_type": "user"
}
```

The version is Zotero's library version, not an application release number.

### `viewer.json`

```json
{
  "library_id": "1234567",
  "library_type": "group"
}
```

This non-secret local file lets both renderers build the correct Zotero desktop
URI. Personal items use `zotero://select/library/items/<key>`; group items use
`zotero://select/groups/<groupID>/items/<key>`.

`graph.json` and `clusters.json` carry the same publication revision. Every JSON
file is first written to a temporary sibling and atomically replaced. Readers
reject a graph/topic pair with different revisions; the next `sync` rebuilds an
incomplete pair from the durable vector cache. `state.json` is committed last.

## Content recovery and semantic freshness

Each newly published node carries `content_fingerprint`, a SHA-256 digest of the
JSON-encoded `[title, abstract]` pair last applied to the map, and `needs_rebuild`.
The digest is a recovery marker, not a vector or a security boundary. It does not
change the LanceDB schema or embedding inputs. A sync checks cached content even
if Zotero returns no new changes: interrupted cache-to-map updates are therefore
recovered without re-embedding already saved content.

New incremental nodes and edited existing nodes have `needs_rebuild: true`.
Existing positions, links and topics are retained until a successful full rebuild.
The graph's additive `status` object contains:

```json
{
  "status_known": true,
  "pending_paper_count": 2,
  "last_full_rebuild_at": "2026-09-20T10:00:00+00:00",
  "last_sync_at": "2026-09-20T11:00:00+00:00"
}
```

Counts are derived from the current nodes, so deleted papers no longer count.
Timestamps use UTC and the browser displays them in local time. The completion
timestamp is published with matching graph/cluster revisions before the Zotero
cursor advances. `last_sync_at` is also stored in private `state.json`.

Legacy snapshots have unknown semantic history, not an assumed clean state.
Sync adds missing fingerprints without claiming that earlier abstract edits were
applied; a successful full rebuild establishes `status_known: true`. Existing
renderers that ignore these additive fields continue to read the same contracts.

This recovery mechanism does not introduce multi-file transactions. Supported
writer entry points now share an OS-backed lock (see below). Metadata and viewer
configuration still have their existing separate publication lifecycle.

## Local application controller

`serve.py` binds only to `127.0.0.1`. `ControlHandler` retains the static asset
allowlist and adds these fixed JSON actions:

- `GET /api/status`: non-secret configuration flags, aggregate health, job status
  and an unpredictable per-server request token.
- `POST /api/config`: validate and atomically save allowed connection settings.
- `POST /api/papers/connect`: authenticate and list collections for this server
  session only. `POST /api/papers/disconnect` clears that local session.
- `POST /api/jobs`: prepare either `sync` or `rebuild`; no arbitrary commands.
- `POST /api/jobs/confirm` and `/api/jobs/cancel`: act on the current job ID.

Requests must use the exact bound loopback Host. Cross-origin and cross-site
requests are rejected. POST requires a matching Origin, a custom token header,
JSON content type and a body of at most 16 KiB. `X-SZKG-Profile` must match the
selected profile; comparison and action dispatch share the controller lock, so
a stale tab cannot modify the new profile. Data requests pin their profile ID
in the query string; the server selects the corresponding current directory
once per request and rejects stale IDs. Direct profile subdirectory URLs are
not public resources. No CORS access is granted. Tokens
are not included in URLs or stored in browser storage. This boundary protects
against other websites, not malicious software already running as the local user.

`local_control.py` holds one in-memory background job and its confirmation event.
`sync_embeddings(before_apply=..., progress=...)` pauses after reading the selected source and
comparing cached text, but before metadata publication, removals or embedding
requests. The preview and the confirmed run use the same in-memory paper list.
The preview can initialize an empty cache or migrate legacy JSON; it does not
apply library changes or pay for embeddings. Confirmation expires after 30 minutes.
Only aggregate counts and fixed progress messages cross the control API, never
paper text, keys or raw provider exceptions.

The worker is a thread in the local server, not a shell/subprocess command
executor. Confirmed jobs are not forcibly cancelled; server shutdown waits for
completion. Jobs do not survive process crashes and are never automatically
restarted. The existing cache/fingerprint recovery applies on the next preview.

`work_lock.py` combines a nonblocking in-process mutex with an OS file lock at
`data/.writer.lock`. Browser jobs hold it from preview through publication;
`app.py sync/refresh`, the legacy build and embedding diagnostic hold it for their
whole writer workflow. Startup migrations and settings saves also acquire it.
The lock is released by the OS after a crash. Direct calls to low-level pipeline
functions must acquire the same lock; it is not a database transaction.

Configuration is freshly read from the project `.env`, with environment
variables taking precedence and no process-global dotenv caching. Secrets are
never returned by the API. Saves preserve unrelated lines, use owner-only files
on POSIX and a Git-ignored `.env.*.tmp` sibling before atomic replacement. This
is plaintext storage, not a keychain. Papers passwords/cookies are excluded.
Switching library identity is refused when legacy Zotero/OpenAI data identifies
another library; other connector combinations use isolated profile directories.

`web/library.js` extends the shared sidebar: first-run connection form, explicit
read-only preview, cost/layout confirmation, progress, reconnect and local map
reload. It works before graph files exist and tracks renderer readiness so the
first successful build can open correctly. Scientific algorithms and data
contracts are unchanged. `Launch SZKG.command` is a macOS convenience launcher
for an already-installed Python environment, not a standalone installer.

## Automatic schema migration

`migrate_local_data()` recognizes the legacy field names and upgrades them to
their current equivalents. It transforms only parsed JSON metadata, writes a
temporary sibling file, and then replaces the original atomically. It does not
open LanceDB or call Zotero/OpenAI. The current key is always preferred if both
old and new keys exist, and a second run is a no-op.

This automatic approach avoids forcing existing users to run a one-time manual
command. The trade-off is that the application retains a small compatibility
layer containing the historical field names; tests protect that layer from
accidental removal.

## Browser architecture

### Topic identity and color continuity

`topic_identity.py` is a display-metadata layer after clustering, not a change to
HDBSCAN, c-TF-IDF, graph construction or layout. Numeric `id` and assignments keep
their original meaning. Classified topics gain `stable_id` (UUID), `color_index`,
`continuity` and `previous_ids`; the cluster document gains `next_color_index`.
`-1` remains unclassified with its fixed gray color and no tracked identity.

On the first publication, legacy topics receive the existing size-ranked palette
indices. On rebuild, core membership is compared with the previous consistent
graph/cluster snapshot. A substantial overlap contains at least two shared core
papers and at least 20% of the smaller core. Continuation requires exactly one
substantial parent and child, with at least 60% of the larger core shared. Weak
assignments never supply evidence for identity. Ambiguous overlaps, splits and
merges receive new UUIDs and monotonically allocated palette indices; only the
immediate parent identities are retained. These thresholds are conservative
display policy, not validated semantic classifiers. Palette colors can become
similar as the topic count grows; persistent color does not guarantee uniqueness.

Reconciliation preserves all numerical cluster results. Incremental publications
preserve identity/color while updating counts. The first normal publication adds
fields without migrating LanceDB or rewriting data merely to open the viewer.
An incomplete previous snapshot cannot establish continuity, so recovery starts
new identities rather than guessing. Both renderers fall back to legacy rank
colors when fields are absent.

### Saved exploration views

`web/saved-views.js` owns bounded, versioned `localStorage` records under a key
including the library type and ID. It stores only explicit bookmarks (20 maximum),
never tokens, credentials, metadata or vectors. Names/search text and Zotero keys
are still local user data. Browser profile, origin/port, quota and storage policy
apply. There is no server endpoint or automatic cross-browser synchronization.

`web/explorer.js` captures/restores query text, list visibility, metadata-review
mode (`qualityOnly`, false for older bookmarks), visibility filters,
active topic and selected paper. Adapters capture/restore renderer-specific camera
state. Topic references use persistent identities; legacy references include the
publication revision and never match a different revision by recycled numeric ID.
A lightweight geometry signature checks IDs and coordinates before reusing a
camera; changes or a different renderer trigger fit/selected-paper centering.
Missing/hidden selected papers are not silently revealed. The compared paper is
not persisted. Restore supersedes an active camera animation and returns focus
to the selected paper; narrow screens close the sidebar and show restoration notes
over the map. Native controls, plain text insertion, storage-error feedback and
undo deletion are shared between renderers.

### Overlay geometry cache

`SemanticOverlays.prepareGeometry()` calculates the existing robust core,
two-stage trimmed convex hull and nearest-paper label anchor once. It retains
world-coordinate point references, while `update()` projects hull vertices and
anchors and applies the original pixel padding. Sigma invalidates on data/visibility
changes and camera rotation; Cytoscape also invalidates on node position/data
events, including dragging. Pan/zoom/resize keep the geometry. Collision avoidance,
focus emphasis, label limits, weak-member policy and edge rendering are unchanged.

`tests/benchmark-overlays.cjs` is an isolated CPU comparison with a mocked canvas
and DOM. It does not measure GPU drawing, real DOM layout, browser interaction or
frames per second. `map_quality.py` separately measures projection fidelity offline
using existing scientific dependencies; see `docs/QUALITY.md` for its limits.

### Shared modules and renderer adapters

- `web/index.html` contains the shared controls, loading state, information
  panels, and renderer-neutral page structure.
- `web/style.css` contains the shared visual design.
- `web/map-status.js` explains synchronization and pending reorganization in both
  renderers, including a truthful unknown state for legacy maps.
- `web/loader.js` selects a renderer from the URL.
- `web/explorer.js` owns the shared, renderer-neutral search, paginated paper
  list, topic controls, detail/comparison panels, keyboard focus, and sidebar
  disclosure. Small adapters in each renderer handle graph selection, camera
  movement and visibility. Display text is inserted with `textContent`.
  Its incomplete-paper review joins graph nodes with loaded metadata, flags blank
  abstracts and filename-like titles using the diagnostic script's heuristic, and
  distinguishes unavailable local abstracts from confirmed blank ones. It does
  not query LanceDB, Zotero, or OpenAI. Flags refresh when local map data reloads;
  search, pagination, reveal-hidden actions and saved views share the same path.
- `web/semantic-overlays.js` is renderer-neutral browser code for translucent
  topic islands and adaptive topic labels. Islands use strong topic members so
  weak assignments do not imply falsely precise semantic boundaries. A shared
  pointer-proximity lens fades labels while preserving click-through behavior.
- `web/app-sigma.js` is the source for the default renderer. It loads generated
  JSON, creates a Graphology graph, assigns colors and display attributes, and
  lets Sigma draw the map through WebGL.
- `web/dist/app-sigma.bundle.js` is the browser-ready offline bundle committed
  for users who do not have Node.js.
- `web/app-cytoscape.js` is the legacy renderer. Its vendor scripts remain under
  `web/vendor/` and are loaded only with `?renderer=cytoscape`.

The Python output contract is renderer-independent. Both renderers read the
same JSON and reuse the same HTML controls, so retaining the fallback does not
duplicate the analysis pipeline.

Both renderers retry briefly when the two JSON documents expose different
revisions, preventing a browser refresh from combining files across a publish.
The Reload local map control performs an exact reconciliation: it adds, updates, and
removes nodes and edges and applies current coordinates while preserving the
camera and valid selections.

Title search matches all query words, irrespective of order or case, after
Unicode normalization. Results include hidden papers, with an explicit action
that reveals their topic and weak-assignment category if needed. Only 20 result
buttons are rendered per page. Related-paper comparisons use existing edges;
the browser does not calculate new semantic relationships. Fit map affects only
the camera, while Clear filters affects only exploration state. Local reload
uses a busy guard and inline feedback and never triggers Python or API calls.

### Sigma interaction state

The Sigma implementation keeps topic visibility, the active topic, selected
nodes, search results, and weak-assignment visibility in JavaScript state.
Node and edge reducers translate that state into WebGL display attributes.
Topic labels are regular HTML elements positioned over the canvas, making them
readable without adding label work to every rendered node.

Curved edges use `@sigma/edge-curve`; `?edges=straight` provides a diagnostic
comparison. Node borders use `@sigma/node-border`. Graphology supplies graph
queries such as neighborhoods and endpoints but does not calculate positions.

## Renderer trade-off

Sigma/WebGL is the default because the GPU can redraw a large graph much more
smoothly during pan and zoom. The main cost is a build step and more specialized
rendering code. Cytoscape is easier to inspect as a single browser script and
acts as a compatibility fallback, but its CPU/canvas rendering becomes less
responsive as the graph grows.

Use:

```text
/web/index.html                       default Sigma renderer
/web/index.html?renderer=cytoscape   legacy Cytoscape renderer
/web/index.html?edges=straight       Sigma diagnostic edge style
```

## Testing and release checks

```bash
python -m unittest discover -s tests -v
npm test
npm run build:web
git diff --exit-code -- web/dist/app-sigma.bundle.js
```

The unit suite is network-free. API diagnostics are deliberately separate to
avoid exposing private libraries or spending money in CI. GitHub Actions runs
the network-free Python and frontend checks and verifies that the committed
bundle matches its source.

Before a public release, also confirm that `.env`, `data/`, `.venv/`, and
`node_modules/` are ignored and that no generated personal metadata is staged.

## Safe extension points

- Implement the embedding-provider protocol to use another vector service.
- Implement the paper-source protocol to ingest another reference manager.
- Change clustering or layout inside Python while preserving the JSON contracts.
- Add another browser renderer through `loader.js` without changing the data
  pipeline.

Changes to embedding dimensions require a new compatible LanceDB table or an
explicit database migration. Changes to Zotero item identity should be treated
with similar care because the item key currently guarantees cache reuse.
