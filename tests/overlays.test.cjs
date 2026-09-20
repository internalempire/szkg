const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("web/semantic-overlays.js", "utf8"), context);
const overlay = context.window.SemanticOverlays;
const nodes = Array.from({ length: 120 }, (_, id) => ({ id: String(id), cluster: id % 3,
  weak: id % 4 === 0, x: Math.sin(id * 12.3) * 200, y: Math.cos(id * 4.7) * 200 }));

function draw(geometry, project, points = nodes, hiddenTopics = new Set()) {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args.map((a) =>
    typeof a === "number" ? Math.round(a * 1e6) / 1e6 : a)]), set: () => true });
  overlay.update({ canvas: { clientWidth: 1200, clientHeight: 800, getContext: () => ctx },
    topics: [0, 1, 2].map((id) => ({ id, color: "rgb(50, 160, 220)" })),
    labels: [], nodes: points, geometry, project, hiddenTopics, focusTopic: null, detailLevel: 0 });
  return calls;
}

test("cached hulls match fresh geometry after pan, zoom and vertical reflection", () => {
  const initial = (p) => ({ x: p.x + 300, y: -p.y + 300 });
  const geometry = overlay.prepareGeometry(nodes, initial);
  for (const scale of [.05, .5, 1, 4, 20]) {
    const project = (p) => ({ x: p.x * scale + 500, y: -p.y * scale + 240 });
    assert.deepEqual(draw(geometry, project), draw(null, project));
  }
});

test("visibility and weak membership invalidate safely and unclassified stays unoutlined", () => {
  const points = [{ id: "a", cluster: 0, x: 0, y: 0 }, { id: "b", cluster: 0, x: 100, y: 100, weak: true },
    { id: "c", cluster: 1, x: 10, y: 10, hidden: true }, { id: "d", cluster: -1, x: 20, y: 20 }];
  const geometry = overlay.prepareGeometry(points);
  assert.equal(geometry.size, 1); assert.equal(geometry.get(0).anchor.id, "a");
  assert.equal(geometry.get(0).kind, 1);
  const hidden = draw(geometry, (p) => p, points, new Set([0]));
  assert.equal(hidden.some((call) => call[0] === "arc"), false);
});

test("one, two and collinear multi-point islands keep their original drawing branches", () => {
  for (const count of [1, 2, 3]) {
    const points = Array.from({ length: count }, (_, id) => ({ id, cluster: 0, x: id * 10, y: 0 }));
    const geometry = overlay.prepareGeometry(points);
    assert.equal(geometry.get(0).kind, count);
    assert.deepEqual(draw(geometry, (p) => p, points), draw(null, (p) => p, points));
  }
});
