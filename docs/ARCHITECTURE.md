# Architecture and data contracts

This document is the technical companion to the main README. It describes the
boundaries between components, the files they exchange, and the decisions that
should remain stable when the project evolves.

## Design goals

- Keep the research library read-only: the application reads Zotero metadata
  and never edits Zotero items.
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
  run, removes stale map nodes and incident edges, and advances `state.json` only
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

- `web/index.html` contains the shared controls, loading state, information
  panels, and renderer-neutral page structure.
- `web/style.css` contains the shared visual design.
- `web/loader.js` selects a renderer from the URL.
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
The Refresh data control performs an exact reconciliation: it adds, updates, and
removes nodes and edges and applies current coordinates while preserving the
camera and valid selections.

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
