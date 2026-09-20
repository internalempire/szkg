const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("web/saved-views.js", "utf8"), context);
const views = context.window.SavedViews;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("saved views sanitize content and never carry unknown secrets or metadata", () => {
  const clean = views.cleanView({ hiddenTopics: ["stable:a", 1], query: "hello", apiKey: "secret",
    abstract: "private", renderer: "sigma", camera: { x: .5, y: .5, ratio: 1, angle: 0, secret: "bad" } });
  assert.equal(clean.query, "hello");
  assert.equal(clean.apiKey, undefined); assert.equal(clean.abstract, undefined);
  assert.equal(clean.camera.secret, undefined);
  assert.deepEqual(plain(clean.hiddenTopics), ["stable:a"]);
});

test("metadata review is saved explicitly and older bookmarks default to all papers", () => {
  assert.equal(views.cleanView({ hiddenTopics: [] }).qualityOnly, false);
  assert.equal(views.cleanView({ hiddenTopics: [], qualityOnly: true }).qualityOnly, true);
  assert.equal(views.cleanView({ hiddenTopics: [], qualityOnly: "true" }).qualityOnly, false);
});

test("invalid cameras are discarded rather than crashing a renderer", () => {
  for (const ratio of [0, -1, Infinity, NaN, 1e20])
    assert.equal(views.cleanView({ hiddenTopics: [], renderer: "sigma", camera: { x: 0, y: 0, ratio, angle: 0 } }).camera, null);
  assert.throws(() => views.cleanView(null));
  assert.throws(() => views.cleanView({ hiddenTopics: "wrong" }));
});

test("stable identities survive renumbering but not a recycled numeric ID", () => {
  const view = { hiddenTopics: ["stable:a", "stable:retired"], activeTopic: "stable:b" };
  const resolved = views.resolveTopics(view, [{ id: 9, stable_id: "a" }, { id: 1, stable_id: "b" }], "new");
  assert.deepEqual([...resolved.hiddenTopics], [9]); assert.equal(resolved.activeTopic, 1);
  assert.equal(resolved.missing, 1);
});

test("legacy topic filters only restore against the same publication", () => {
  const reference = views.topicRef({ id: 0 }, "old");
  assert.equal(views.resolveTopics({ hiddenTopics: [reference] }, [{ id: 0 }], "new").missing, 1);
  assert.equal(views.resolveTopics({ hiddenTopics: [reference] }, [{ id: 0 }], "old").missing, 0);
  assert.equal(views.topicRef({ id: -1 }), "unclassified");
});

test("layout signature ignores titles and order, but detects position changes", () => {
  const nodes = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 3, y: 4 }];
  const signature = views.layoutSignature({ nodes });
  assert.equal(views.layoutSignature({ nodes: [...nodes].reverse().map((n) => ({ ...n, title: "Changed" })) }), signature);
  assert.notEqual(views.layoutSignature({ nodes: [{ ...nodes[0], x: 5 }, nodes[1]] }), signature);
});

function mount(storage, library = { library_type: "user", library_id: "123" }) {
  const elements = new Map();
  const element = () => ({ value: "", textContent: "", handlers: {}, children: [], classList: { toggle() {} },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    append(child) { this.children.push(child); }, replaceChildren() { this.children = []; this.value = ""; }, focus() {} });
  const document = { createElement: element, getElementById(id) {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  } };
  let counter = 0;
  const scope = { window: { addEventListener() {} }, document, localStorage: storage,
    crypto: { randomUUID: () => `view-${++counter}` } };
  vm.runInNewContext(fs.readFileSync("web/saved-views.js", "utf8"), scope);
  scope.window.SavedViews.create({ library: () => library,
    capture: () => ({ hiddenTopics: [], query: "test" }), restore: () => "" });
  const $ = (id) => document.getElementById(id);
  return { $, save(name) { $("saved-view-name").value = name;
    $("saved-view-form").handlers.submit({ preventDefault() {} }); } };
}

test("denied and corrupt storage report errors without overwriting existing data", () => {
  let writes = 0;
  for (const storage of [
    { getItem() { throw new Error("Storage denied"); }, setItem() { writes++; } },
    { getItem: () => "{invalid", setItem() { writes++; } },
  ]) {
    const ui = mount(storage); ui.save("Test");
    assert.match(ui.$("saved-view-message").textContent, /Could not access saved views/);
  }
  assert.equal(writes, 0);
});

test("save, duplicate names, delete and undo are bounded and library-scoped", () => {
  const records = new Map();
  const storage = { getItem: (key) => records.get(key), setItem: (key, value) => records.set(key, value) };
  const ui = mount(storage); ui.save("Review"); ui.save("review");
  assert.match(ui.$("saved-view-message").textContent, /already in use/);
  assert.equal(JSON.parse([...records.values()][0]).views.length, 1);
  ui.$("saved-view-delete").handlers.click();
  assert.equal(JSON.parse([...records.values()][0]).views.length, 0);
  ui.$("saved-view-undo").handlers.click();
  assert.equal(JSON.parse([...records.values()][0]).views.length, 1);
  const other = mount(storage, { library_type: "group", library_id: "123" });
  assert.equal(other.$("saved-view-select").children.length, 1);
  for (let i = 1; i < 21; i++) ui.save(`View ${i}`);
  assert.equal(JSON.parse([...records.values()][0]).views.length, 20);
  assert.match(ui.$("saved-view-message").textContent, /Twenty views/);
});

test("connector profiles isolate bookmarks while legacy Zotero keeps its key", () => {
  const records = new Map();
  const storage = { getItem: (key) => records.get(key), setItem: (key, value) => records.set(key, value) };
  mount(storage, { library_type: "user", library_id: "123", source: "zotero", embedding_service: "openai", profile_id: "legacy" }).save("Legacy");
  mount(storage, { library_type: "collection", library_id: "123", source: "papers", profile_id: "papers" }).save("Papers");
  mount(storage, { library_type: "user", library_id: "123", source: "zotero", embedding_service: "openrouter", profile_id: "router" }).save("Router");
  assert.equal(records.size, 3);
  assert.ok([...records.keys()].some((key) => key.endsWith(":user:123")));
  assert.ok([...records.keys()].some((key) => key.endsWith(":profile:papers")));
  assert.ok([...records.keys()].some((key) => key.endsWith(":profile:router")));
});
