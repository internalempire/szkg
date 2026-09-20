# Measuring map quality without confusing it with scientific truth

The map expresses similarity of titles and abstracts. It is not a citation graph,
a systematic-review screening decision, or a ranking of research quality.
The current HDBSCAN, c-TF-IDF, t-SNE and compaction parameters are unchanged.

## Offline projection report

With an existing local cache and map:

```bash
python map_quality.py
python map_quality.py --sample-size 1000 --neighbors 8
python map_quality.py --compare-compaction
```

The script reads the selected connector profile and prints aggregate JSON to the
terminal. It never contacts Zotero, Papers, OpenAI or OpenRouter,
creates embeddings or publishes a new map. It opens an existing LanceDB table
without creating one. It holds the same local writer lock as sync/rebuild; the
lock file is the only bookkeeping write. Wait for an active job to finish first.
No API key or paper title/abstract/vector is printed.

The report contains:

- Metadata coverage and counts of weak, unclassified and pending papers, plus
  text changes not yet reconciled with the map and missing legacy fingerprints.
- Embedding model/dimensions, so different vector spaces are not compared silently.
- **Trustworthiness**, from 0 to 1: penalizes neighbors appearing close in 2D
  despite being more distant in embedding space. Higher indicates better local
  projection fidelity, not better research or correct topic labels.
- **Neighbor overlap**, from 0 to 1: the fraction of the selected nearest
  neighbors shared by the vector and 2D spaces.
- Sample size, effective neighbor count, map revision and sample digest, to
  identify what was measured without printing paper keys.

The implementation follows the official
[scikit-learn trustworthiness definition](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.trustworthiness.html).
It uses cosine distances for vectors and Euclidean distances for 2D positions.
Neighbor count is capped below half the sample size; fewer than three papers
produce unavailable scores, not a misleading perfect result.

Sampling is deterministic by a hash of paper IDs and capped at 2,000 rows (500 by
default), limiting the quadratic distance calculations. Both sets of neighbors
are computed **within that same sample**, not against the full library. Scores
from different sample digests, models, neighbor counts or datasets are not directly
comparable. Equal-distance ties can also affect overlap. Zero or duplicate vectors
make geometric scores less informative; investigate the source metadata first.

`--compare-compaction` recomputes the un-compacted layout **in memory**, applies
the existing compaction to that same layout using the published topic assignments,
and reports both scores on the same sample. It may take minutes and still loads
all mapped vectors. It does not reconstruct historical pre-compaction coordinates,
recluster papers or change the saved positions. Pending sync changes and unknown
legacy history are reported: a stale published layout should not be compared as
though it were a completed rebuild.

## Human-reviewed evaluation set

This step needs a researcher who knows the papers; automated scores cannot
replace that judgment. No personal evaluation set is bundled or invented.

1. Choose 15–30 familiar papers spanning major topics, boundary topics and papers
   with missing abstracts. Include difficult examples, not only obvious matches.
2. Keep a private table under ignored `data/`, with paper key, expected related
   paper keys, expected distinction from unrelated topics, and a brief reason.
   Record judgments **before** comparing candidate algorithm settings.
3. For each paper, inspect the top eight cached-vector neighbors with
   `python neighbors.py "part of a title"`. Record how many are useful, which
   expected relations are missing, and whether misleading matches recur.
4. Inspect the viewer separately: are those useful neighbors spatially close,
   do topic labels describe core papers, and are uncertain boundary papers clear?
5. Record topic split/merge behavior after additions on a disposable copy, and
   distinguish improved grouping from mere color/camera familiarity.
6. Compare one change at a time on identical inputs. Retain hard examples and
   regressions even if an aggregate score improves. Do not regenerate paid
   embeddings merely to evaluate display changes.

Changing model, clustering or projection requires a separate decision and a
documented before/after result. This release adds measurement tools, not evidence
that one replacement algorithm is better on the user's library.

## Overlay performance check

```bash
npm run benchmark:overlays
```

This runs 40 warmups and 300 measured updates on 2,500 synthetic nodes / 70 topics,
reporting median and p95 JavaScript CPU times for uncached/cached geometry.
Canvas drawing and DOM layout are mocked. It is not an FPS claim and cannot
substitute for browser checks of pan/zoom, labels, selection and edge picking.

Development observation on the local machine, 20 September 2026: the pre-change
baseline median was 3.549 ms; the first post-change run measured 3.749 ms uncached
and 0.318 ms cached. Timing varies by machine and load. The isolated geometric
work improved; whole-app frame-rate improvement has not been quantified.

For visual and interaction checks without personal data:

```bash
PYTHONPATH=. python tests/preview_refinement.py
```

Test both Sigma and `?renderer=cytoscape`, desktop and narrow viewports: save/open,
page reload, delete/undo, searches/filters/selection, pan/zoom, and the simulated
rebuild. A continuing topic keeps its color despite renumbering; a split topic's
saved filter is skipped with feedback. These are manual browser tests, not an
automated end-to-end suite or a broad device-performance certification.
