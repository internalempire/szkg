/* CPU-only synthetic overlay benchmark, not a browser frame-rate measurement. */
const fs = require("node:fs");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");
const context = { window: {}, Math, Map, Set };
vm.runInNewContext(fs.readFileSync("web/semantic-overlays.js", "utf8"), context);
const overlay = context.window.SemanticOverlays;
const noop = () => {};
const drawing = new Proxy({}, { get: () => noop, set: () => true });
const canvas = { clientWidth: 1200, clientHeight: 800, getContext: () => drawing };
const topics = Array.from({ length: 70 }, (_, id) => ({ id, color: "rgb(50, 160, 220)" }));
const nodes = Array.from({ length: 2500 }, (_, id) => ({ id: String(id), cluster: id % 70,
  weak: id % 5 === 0, x: Math.sin(id * 12.3) * 350 + 600, y: Math.cos(id * 4.7) * 250 + 400 }));
const labels = topics.map(({ id }) => ({ id, paperCount: 35,
  element: { style: {}, classList: { toggle: noop }, offsetWidth: 120, offsetHeight: 24 } }));
const options = { canvas, topics, nodes, labels, hiddenTopics: new Set(), focusTopic: null, detailLevel: 1 };
const project = (point) => ({ x: point.x, y: point.y });
function measure(cached) {
  const geometry = cached && overlay.prepareGeometry ? overlay.prepareGeometry(nodes, project) : null;
  const run = () => overlay.update({ ...options, ...(geometry ? { geometry, project } : {}) });
  for (let i = 0; i < 40; i++) run();
  const times = [];
  for (let i = 0; i < 300; i++) { const start = performance.now(); run(); times.push(performance.now() - start); }
  times.sort((a, b) => a - b);
  return { median_ms: +times[150].toFixed(3), p95_ms: +times[285].toFixed(3) };
}
console.log(JSON.stringify({ synthetic_nodes: nodes.length, topics: topics.length,
  note: "JavaScript CPU only; mock canvas and DOM; excludes GPU, paint and real layout.",
  uncached: measure(false), ...(overlay.prepareGeometry ? { cached: measure(true) } : {}) }, null, 2));
