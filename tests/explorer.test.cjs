/* Network-free tests for both renderers' shared paper discovery logic. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("web/explorer.js", "utf8"), context);
const { searchPapers, relatedPapers } = context.window.PaperExplorer;
const { looksLikeFilename, paperIssues } = context.window.PaperExplorer;
const ids = (items) => Array.from(items, (item) => item.id);

test("title search matches every word regardless of case or order", () => {
  const nodes = [{ id: "a", title: "Neural Semantic Maps" }, { id: "b", title: "Neural models" }];
  assert.deepEqual(ids(searchPapers(nodes, " MAPS  neural ")), ["a"]);
  assert.equal(nodes[0].id, "a");
});
test("Unicode normalization handles composed accents and full-width letters", () => {
  assert.equal(searchPapers([{ title: "Café ＭＡＰ" }], "cafe\u0301 map").length, 1);
});
test("empty queries browse all papers in stable title and ID order", () => {
  const nodes = [{ id: "z", title: "Beta" }, { id: "b", title: "Alpha" }, { id: "a", title: "Alpha" }];
  assert.deepEqual(ids(searchPapers(nodes, "")), ["a", "b", "z"]);
  assert.deepEqual(ids(nodes), ["z", "b", "a"]);
});
test("missing titles and unmatched searches are safe", () => {
  assert.equal(searchPapers([{ id: "a" }], "anything").length, 0);
  assert.equal(searchPapers([], "").length, 0);
});
test("related papers include both edge directions sorted by similarity", () => {
  const data = { nodes: [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }],
    edges: [{ source: "a", target: "b", weight: 0 }, { source: "c", target: "a", weight: 0.9 },
      { source: "a", target: "missing", weight: 1 }] };
  const related = relatedPapers(data, "a");
  assert.deepEqual(Array.from(related, (item) => item.node.id), ["c", "b"]);
  assert.equal(related[0].edge, "c__a");
  assert.equal(related[1].weight, 0);
  assert.equal(relatedPapers(data, "absent").length, 0);
});

test("filename heuristic mirrors the diagnostic script for supported names", () => {
  for (const title of ["Smith2019.pdf", " report.DOCX ", "Notes on research.txt", "paper.xyz", "résumé.été", "file.123"])
    assert.equal(looksLikeFilename(title), true, title);
  for (const title of ["A study of ventilation", "example.longextension", "A study.v2", "", null])
    assert.equal(looksLikeFilename(title), false, String(title));
});

test("empty abstracts are distinguished from unavailable local metadata", () => {
  const node = { id: "A", title: "A research paper" };
  for (const abstract of ["", "  \n\t", "\u00a0"])
    assert.deepEqual(Array.from(paperIssues(node, { abstract })), ["missing_abstract"]);
  for (const metadata of [undefined, null, {}, { abstract: null }, { abstract: 42 }])
    assert.deepEqual(Array.from(paperIssues(node, metadata)), ["metadata_unavailable"]);
  assert.deepEqual(Array.from(paperIssues(node, { abstract: "Valid abstract" })), []);
});

test("flags can overlap, while weak topic membership is not a metadata defect", () => {
  assert.deepEqual(Array.from(paperIssues({ title: "Paper.pdf" }, { abstract: "" })), ["filename_title", "missing_abstract"]);
  assert.deepEqual(Array.from(paperIssues({ title: "Complete paper", weak_assignment: true }, { abstract: "Valid" })), []);
});
