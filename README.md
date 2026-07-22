# Semantic Zotero Knowledge Graph

[![100% Vibe Coded](https://img.shields.io/badge/100%25-Vibe_Coded-ff69b4?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/ai-ecoverse/vibe-coded-badge-action)

A local-first application that turns a Zotero research library into an
interactive semantic map. Papers with similar titles and abstracts appear near
one another, form automatically labeled topics, and are connected by semantic
similarity links.

The data pipeline runs in Python. The map is rendered in the browser with
[Sigma.js](https://www.sigmajs.org/) and WebGL, so thousands of nodes and links
remain responsive on ordinary laptop GPUs. A legacy Cytoscape.js renderer is
kept as a safety fallback.

> The project reads Zotero metadata but never modifies the Zotero library.
> Titles and abstracts are sent to the configured embedding API. Vectors,
> topics, graph files, and application state remain in the local `data/`
> directory, which is excluded from Git.

## What users can do

- Build a semantic overview of a personal or group Zotero library.
- Explore automatically discovered topic islands.
- Search paper titles and hide individual topics.
- Distinguish dense topic members from weaker neighbor-based assignments.
- Select a paper to highlight its semantic neighborhood.
- Select a highlighted link to inspect the paper at its other endpoint.
- Open a selected item directly in Zotero.
- Open items correctly from either a personal or group Zotero library.
- Add new papers incrementally without paying to embed cached papers again.
- Re-embed a paper automatically when you edit its title or abstract in Zotero,
  while unchanged papers are never re-embedded.
- Remove papers locally when they are trashed, deleted, or become ineligible in
  Zotero, without ever writing back to the Zotero library.
- Periodically rebuild the complete map for a more globally accurate layout.
- See token usage and estimated embedding cost on every synchronization.

## How it works

```text
┌──────────────────────────────────────────────┐
│                Zotero Web API                │
│                                              │
│  Incremental retrieval of titles and         │
│  abstracts based on the Zotero library       │
│  version                                     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              OpenAI Embeddings               │
│                                              │
│  Generation of one 1,536-dimensional vector  │
│  for each paper not already stored in cache  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          LanceDB Local Vector Store          │
│                                              │
│  Persistent embedding cache and cosine       │
│  similarity neighbor search                  │
└───────────────┬──────────────────┬───────────┘
                │                  │
                ▼                  ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│ k-Nearest-Neighbor Graph │  │ Topic Analysis and Clustering│
│                          │  │                              │
│ Semantic similarity      │  │ PCA                          │
│ relationships between    │  │   ↓                          │
│ papers                   │  │ HDBSCAN                      │
└─────────────┬────────────┘  │   ↓                          │
              │               │ c-TF-IDF                     │
              │               │                              │
              │               │ Produces topic groups and    │
              │               │ descriptive keyword labels   │
              │               └──────────────┬───────────────┘
              │                              │
              └───────────────┬──────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────┐
│           Two-Dimensional Projection         │
│                                              │
│                 PCA → t-SNE                  │
│                                              │
│  Generation of 2D coordinates for graph      │
│  visualization                               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                Output Files                  │
│                                              │
│        graph.json and clusters.json          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│               Visualization                  │
│                                              │
│      Graphology + Sigma.js + WebGL           │
└──────────────────────────────────────────────┘
```

The pipeline deliberately separates responsibilities:

- `zotero_source.py` reads Zotero items behind a replaceable source interface.
- `embeddings.py` defines a provider interface and the OpenAI implementation.
- `store.py` caches paper metadata and vectors in local LanceDB files.
- `graph.py` creates an undirected k-nearest-neighbor similarity graph.
- `clustering.py` discovers topics and derives keyword-based labels.
- `layout.py` calculates deterministic two-dimensional positions in Python.
- `pipeline.py` coordinates full and incremental workflows.
- `data_migration.py` upgrades metadata written by pre-English releases.
- `web/app-sigma.js` implements the default WebGL map.
- `web/app-cytoscape.js` preserves the legacy CPU renderer as a fallback.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data contracts and design
details.

## Commands at a glance

Everything runs through `app.py` with one of three verbs:

| Command | When to use it | Network and cost |
| --- | --- | --- |
| `python app.py sync` | Everyday update after adding or editing papers in Zotero. Embeds only new or edited papers and attaches them near their neighbors without moving the existing map. | Reads Zotero; embeds only new/edited papers (a fraction of a cent). |
| `python app.py refresh` | Occasional full rebuild after substantial changes. Recomputes topics, graph, and layout for the whole library. | Same Zotero/embedding step as `sync`, then a free local rebuild that reuses cached vectors. |
| `python app.py serve` | Open the interactive map in your browser. | Local only: no external network and no cost. |

`sync` is fast and stable; `refresh` is slower and reorganizes the topic islands
for a cleaner global picture. Both skip papers whose title and abstract are
unchanged, so they are never re-embedded or paid for twice.

## Results depend on metadata quality

The map is built only from each paper's **title and abstract** — not the PDF full
text, authors, tags, or notes. A paper is therefore placed only as well as its
metadata describes it, and the **abstract matters most**:

- A missing or very short abstract leaves the model little to work with, so the
  paper gets a weak position and often lands in a loose or `unclassified` area.
- A title that is actually a filename (for example `Larson2019.pdf`) carries no
  meaning and causes the same problem.

For the best map, keep titles and abstracts complete in Zotero. Run
`python data_quality.py` to list papers with missing abstracts or filename-like
titles; after you fix them in Zotero, `python app.py sync` re-embeds those papers
and `python app.py refresh` repositions them.

## Requirements

### Required for normal use

- Python 3.12 or newer. Development is currently tested with Python 3.14.
- A Zotero account whose desktop library has completed cloud synchronization.
- A dedicated read-only Zotero API key.
- An OpenAI API key with billing or credits enabled.
- Internet access while synchronizing Zotero and generating new embeddings.
- A browser with WebGL support.

Python dependencies are listed in `requirements.txt`:

| Dependency | Purpose |
| --- | --- |
| `pyzotero` | Zotero Web API access and pagination |
| `openai` | embedding requests |
| `tiktoken` | pre-request token and cost estimation |
| `lancedb` + `pyarrow` | local vector storage |
| `numpy` + `scikit-learn` | graph preparation, PCA, HDBSCAN, and t-SNE |
| `python-dotenv` | local `.env` configuration |

### Required only for frontend development

- Node.js 20 or newer
- npm

The compiled WebGL bundle is committed under `web/dist/`, so end users do not
need Node.js or npm.

## Installation

Clone the repository and enter it:

```bash
git clone https://github.com/internalempire/szkg.git
cd szkg
```

Create an isolated Python environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

On Windows PowerShell, activate it with:

```powershell
.venv\Scripts\Activate.ps1
```

Create the local configuration file:

```bash
cp .env.example .env
```

Then fill in:

```dotenv
ZOTERO_LIBRARY_ID=1234567
ZOTERO_LIBRARY_TYPE=user
ZOTERO_API_KEY=your_read_only_zotero_key
OPENAI_API_KEY=your_openai_key
```

`ZOTERO_LIBRARY_TYPE` can be `user` for a personal library or `group` for a
shared group library. Zotero documents API authentication and version-based
incremental reads in its
[Web API documentation](https://www.zotero.org/support/dev/web_api/v3/basics).

## First run

Build the complete map:

```bash
python app.py refresh
```

This command:

1. downloads eligible top-level Zotero items;
2. embeds only papers that are not already cached;
3. stores vectors locally;
4. rebuilds the similarity graph and topics;
5. recalculates the complete two-dimensional layout;
6. writes browser-ready JSON files under `data/`.

Open the viewer:

```bash
python app.py serve
```

The server listens only on `127.0.0.1`, chooses a free port between 8000 and
8019, and opens the browser automatically. It serves only viewer assets and
generated JSON files; credentials, Git metadata, and the vector database are
not part of its HTTP surface. Stop it with `Ctrl+C`.

## Everyday workflow

After adding and synchronizing papers in Zotero, run:

```bash
python app.py sync
```

`sync` asks Zotero only for items modified after the stored library version.
It embeds papers that are new or whose title or abstract you edited, then places
each new paper near its existing semantic neighbors. It also removes locally
cached papers reported as trashed or deleted by Zotero. Existing topic assignments
and positions remain stable; an edited paper keeps its place until the next
`refresh` moves it to match its new text.

Synchronization is resumable. The saved Zotero version advances only after the
map update succeeds, and a later `sync` reconciles any cached paper missing from
the browser map after an interrupted run.

Occasionally run:

```bash
python app.py refresh
```

`refresh` reuses cached embeddings, but recomputes the graph, topics, labels,
and layout for the complete collection. It is slower and moves topic islands,
but provides a cleaner global organization after substantial library growth.

For a full rebuild that also prints a textual report of the discovered topics and
graph shape, the legacy `python build_map.py` entry point remains available. New
users should prefer `python app.py refresh`.

## Viewer controls

- Hover over a node to see its title.
- Click a node to show its metadata and semantic neighborhood.
- Click an amber link to inspect the connected paper in a second panel.
- Use the topic legend to preview, lock, show, or hide topic islands.
- Use the search box to highlight matching titles.
- Toggle weak assignments on or off.
- Use the wheel, double-click, or `+` / `-` controls to zoom.
- Use the fit button to restore the complete view.
- Use **Refresh data** after a background `sync` or `refresh` to reconcile nodes,
  links, topics, and coordinates without reloading the whole page.

### Renderer diagnostics

Sigma.js/WebGL is the default. To load the legacy Cytoscape renderer:

```text
http://127.0.0.1:8000/web/index.html?renderer=cytoscape
```

To compare Sigma curved edges with straight edges:

```text
http://127.0.0.1:8000/web/index.html?edges=straight
```

## Cost behavior

Only new or edited papers incur an OpenAI API cost. Before sending text, the app
estimates tokens and price; after the request it records the API-reported token
usage. Cached papers whose title and abstract are unchanged are skipped through
the LanceDB cache, so an unrelated change such as a tag never costs anything.

Prices can change. The local pricing table used for estimates is intentionally
centralized in `costs.py`; verify it against current provider pricing when exact
cost forecasting matters.

## Privacy and repository safety

The public repository intentionally excludes:

- `.env` and all real API keys;
- `data/lancedb/` embedding vectors;
- `graph.json`, `clusters.json`, and `state.json`;
- `metadata.json` and the non-secret local viewer configuration;
- Zotero titles and abstracts;
- local Python and Node dependency folders.

Do not remove these entries from `.gitignore`. Use a Zotero API key with library
read access only. The application does not contain Zotero write operations.

## Diagnostics

These optional scripts help isolate problems without rebuilding the complete
map:

| Script | What it checks | Network and data effects |
| --- | --- | --- |
| `python diagnose_zotero.py` | Counts everything visible to the configured Zotero key, lists up to 20 collections, and shows five raw items including attachments. Use it when the normal importer reports an empty library or when you suspect the wrong library ID, type, synchronization state, or key permissions. | Reads the Zotero Web API. It never modifies the library and makes no OpenAI request. |
| `python data_quality.py` | Inspects the local LanceDB cache for titles that look like filenames and papers without abstracts. These records can produce weak semantic positions because the embedding has little useful text. | Local and read-only; no network or API cost. |
| `python neighbors.py "part of a paper title"` | Finds matching cached papers and explains each paper's topic, weak-assignment status, graph-link count, and eight closest semantic neighbors with similarity percentages. A `+` marks neighbors above the graph threshold. Use it to understand why a paper appears in a particular area or topic. | Local and read-only; no network or API cost. |
| `python test_zotero.py` | Downloads a sample of eight eligible papers and prints their type, key, version, title, and a shortened abstract. Use it to verify that credentials work and that the normal importer receives useful metadata. | Reads the Zotero Web API. It does not write to Zotero, call OpenAI, or alter the local map. |
| `python test_embedding.py` | Exercises the complete small-sample path: fetches five Zotero papers, skips cached keys, estimates token cost, embeds only uncached samples, verifies vector dimensions, and stores the new vectors in LanceDB. | Reads Zotero and can make a paid OpenAI request. It adds uncached sample papers to the local embedding cache, but does not rebuild the map or modify Zotero. |

Run them from the project directory with the Python environment active:

```bash
python diagnose_zotero.py
python data_quality.py
python neighbors.py "part of a paper title"
python test_zotero.py
python test_embedding.py
```

Start with `diagnose_zotero.py` or `test_zotero.py` for connection problems,
`data_quality.py` for suspicious map content, and `neighbors.py` for a single
paper that appears misplaced. Run `test_embedding.py` only when you explicitly
want to test the paid embedding path.

## Frontend development

Install pinned JavaScript dependencies and rebuild the offline bundle:

```bash
npm install
npm run build:web
```

Run static frontend checks:

```bash
npm test
```

## Tests

With the Python environment active:

```bash
python -m unittest discover -s tests -v
```

The automated suite is network-free and never reads `.env` or personal `data/`.
Manual API smoke tests remain separate so CI cannot spend money or access a
private Zotero library.

## Project status

The local pipeline, incremental synchronization, topic generation, t-SNE layout,
WebGL viewer, legacy renderer fallback, and English-schema migration are
implemented. Contributions and issue reports are welcome.

## License

Distributed under the [MIT License](LICENSE).
