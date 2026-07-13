/* WebGL renderer. Python owns semantics; Graphology stores links; Sigma draws. */
import Graph from "graphology";
import Sigma from "sigma";
import { createEdgeCurveProgram } from "@sigma/edge-curve";
import { createNodeBorderProgram } from "@sigma/node-border";

const GRAPH_DATA_URL = "../data/graph.json";
const CLUSTER_DATA_URL = "../data/clusters.json";
const USE_CURVED_EDGES = new URLSearchParams(location.search).get("edges") !== "straight";
const MAX_TOPIC_LABELS = 14;

let topicColors = new Map(), topicRgbColors = new Map(), topicLabels = new Map();
let graph, renderer, currentTopics = [];
let activeTopic = null, selectedNode = null, selectedEdge = null;
let highlightedNodes = null, highlightedEdges = null;
let hiddenTopics = new Set(), showWeakAssignments = true, topicLabelElements = [];

async function readJson(path) {
  const sep = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${sep}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read ${path}`);
  return response.json();
}

function hslToRgb(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function generateColors(topics) {
  topicColors = new Map(); topicRgbColors = new Map(); topicLabels = new Map();
  topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count)
    .forEach((t, i) => {
      const rgb = hslToRgb((i * 137.5) % 360, 0.72, 0.58);
      topicRgbColors.set(t.id, rgb);
      topicColors.set(t.id, `rgb(${rgb.join(", ")})`);
      topicLabels.set(t.id, t.label);
    });
  topicRgbColors.set(-1, [110, 120, 140]);
  topicColors.set(-1, "rgb(110, 120, 140)");
  topicLabels.set(-1, "unclassified");
}

function topicColor(topic, alpha = 1) {
  const [r, g, b] = topicRgbColors.get(topic) || [110, 120, 140];
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function edgeColor(a, b, alpha = 1) {
  const x = topicRgbColors.get(a) || [110, 120, 140], y = topicRgbColors.get(b) || [110, 120, 140];
  const rgb = [(x[0] + y[0]) >> 1, (x[1] + y[1]) >> 1, (x[2] + y[2]) >> 1];
  return alpha === 1 ? `rgb(${rgb.join(", ")})` : `rgba(${rgb.join(", ")}, ${alpha})`;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function edgeId(e) { return `${e.source}__${e.target}`; }
function edgeCurvature(id) {
  const h = hashString(id);
  return (h < 0.5 ? -1 : 1) * (0.055 + (Math.floor(h * 1000) % 8) * 0.012);
}

function validateCoordinates(nodes) {
  const n = nodes.find((x) => !Number.isFinite(x.x) || !Number.isFinite(x.y));
  if (n) throw new Error(`Paper "${n.title || n.id}" has no position. Run 'python app.py refresh'.`);
}
function nodeSize(degree, weak_assignment, selected = false) {
  let diameter = Math.min(30, 3 + degree * 0.85);
  if (weak_assignment) diameter *= 0.85;
  if (selected) diameter = Math.max(18, diameter) + 6;
  return diameter / 2;
}

function nodeAttributes(n, degree = 0) {
  const color = topicColor(n.cluster, n.weak_assignment ? 0.5 : 1);
  return { x: n.x, y: n.y, label: n.title, title: n.title, cluster: n.cluster,
    clusterLabel: n.cluster_label, weak_assignment: !!n.weak_assignment, degree, size: nodeSize(degree, !!n.weak_assignment),
    color: color, baseColor: color, borderColor: color, haloColor: color,
    type: "border", hidden: false, zIndex: 1 };
}

function edgeAttributes(e, topicA, topicB) {
  const color = edgeColor(topicA, topicB, 0.28);
  return { weight: e.weight, size: 0.3 + (e.weight || 0.5) * 0.7,
    color: color, baseColor: color, curvature: edgeCurvature(edgeId(e)),
    type: USE_CURVED_EDGES ? "curve" : "line", hidden: false, zIndex: 1 };
}

function buildGraph(data) {
  validateCoordinates(data.nodes);
  const g = new Graph({ type: "undirected", multi: false, allowSelfLoops: false });
  data.nodes.forEach((n) => g.addNode(n.id, nodeAttributes(n)));
  data.edges.forEach((e) => {
    const id = edgeId(e);
    if (!g.hasNode(e.source) || !g.hasNode(e.target) || g.hasEdge(id)) return;
    g.addUndirectedEdgeWithKey(id, e.source, e.target,
      edgeAttributes(e, g.getNodeAttribute(e.source, "cluster"), g.getNodeAttribute(e.target, "cluster")));
  });
  g.forEachNode((id, a) => g.mergeNodeAttributes(id,
    { degree: g.degree(id), size: nodeSize(g.degree(id), a.weak_assignment) }));
  return g;
}
function reduceNode(id, a) {
  const sel = id === selectedNode;
  const evid = highlightedNodes === null || highlightedNodes.has(id);
  const color = evid ? a.baseColor : "rgba(110, 120, 140, 0.08)";
  return { ...a, color: color, size: nodeSize(a.degree || 0, a.weak_assignment, sel),
    borderColor: sel ? "#ffffff" : color,
    haloColor: sel ? "rgba(255, 255, 255, 0.22)" : color,
    zIndex: sel ? 100 : (evid ? 20 : 1) };
}

function reduceEdge(id, a) {
  if (a.hidden) return { ...a, hidden: true };
  if (id === selectedEdge)
    return { ...a, hidden: false, color: "#ffffff", size: 3.5, zIndex: 90 };
  if (highlightedEdges !== null) {
    if (!highlightedEdges.has(id)) return { ...a, hidden: true };
    return { ...a, hidden: false, color: "#ffb020", size: 2.2, zIndex: 40 };
  }
  return { ...a, color: a.baseColor, zIndex: 1 };
}

const BorderNodeProgram = createNodeBorderProgram({
  borders: [
    { size: { value: 4, mode: "pixels" }, color: { attribute: "haloColor" } },
    { size: { value: 2, mode: "pixels" }, color: { attribute: "borderColor" } },
    { size: { fill: true }, color: { attribute: "color" } },
  ],
});
const CurvedEdgeProgram = createEdgeCurveProgram({ curvatureAttribute: "curvature", defaultCurvature: 0.08 });

function createRenderer() {
  renderer = new Sigma(graph, document.getElementById("cy"), {
    renderLabels: false, renderEdgeLabels: false, enableEdgeEvents: true,
    hideEdgesOnMove: false, hideLabelsOnMove: false, zIndex: true, stagePadding: 30,
    minCameraRatio: 0.005, maxCameraRatio: 33.333,
    doubleClickZoomingRatio: 1.8, doubleClickZoomingDuration: 250,
    zoomToSizeRatioFunction: () => 1, itemSizesReference: "screen", minEdgeThickness: 0.3,
    defaultNodeType: "border", defaultEdgeType: USE_CURVED_EDGES ? "curve" : "line",
    nodeProgramClasses: { border: BorderNodeProgram },
    edgeProgramClasses: USE_CURVED_EDGES ? { curve: CurvedEdgeProgram } : {},
    nodeReducer: reduceNode, edgeReducer: reduceEdge,
  });
}

function refreshRenderer() { if (renderer) renderer.refresh(); }
function internalEdges(ids) {
  const result = new Set();
  graph.forEachEdge((id, _a, s, t) => { if (ids.has(s) && ids.has(t)) result.add(id); });
  return result;
}
function applyHighlight(ids) {
  highlightedNodes = ids instanceof Set ? ids : new Set(ids);
  highlightedEdges = internalEdges(highlightedNodes);
  refreshRenderer();
}
function clearHighlight(render = true) {
  highlightedNodes = null; highlightedEdges = null; selectedEdge = null;
  if (render) refreshRenderer();
}
function restoreHighlight() {
  clearHighlight(false);
  if (selectedNode && graph.hasNode(selectedNode))
    applyHighlight(new Set([selectedNode, ...graph.neighbors(selectedNode)]));
  else if (activeTopic !== null)
    applyHighlight(new Set(graph.filterNodes((_id, a) => a.cluster === activeTopic)));
  else refreshRenderer();
}
function deselectNode() { selectedNode = null; selectedEdge = null; }
function resetSelection() {
  activeTopic = null; deselectNode(); clearHighlight(false); hidePanels();
  document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
  refreshRenderer();
}

function escapeHtml(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function showInfo(id, boxId) {
  if (!graph.hasNode(id)) return;
  const n = graph.getNodeAttributes(id), box = document.getElementById(boxId);
  box.querySelector(".panel-body").innerHTML = `
    <p class="paper-title">${escapeHtml(n.title)}</p><p class="detail-row">
    <span class="topic-chip" style="background:${topicColor(n.cluster)}">${escapeHtml(topicLabels.get(n.cluster) || "—")}</span>
    ${n.weak_assignment ? '<span class="weak-badge">weak assignment</span>' : ""}</p>
    <p class="detail-row">Links: ${graph.degree(id)}</p>
    <p class="detail-row"><a href="zotero://select/library/items/${encodeURIComponent(id)}">Open in Zotero</a></p>`;
  box.classList.remove("hidden");
}
function hidePanels() {
  document.getElementById("info").classList.add("hidden");
  document.getElementById("info2").classList.add("hidden");
  selectedEdge = null;
}

function bindRendererEvents() {
  const tooltip = document.getElementById("tooltip");
  renderer.on("enterNode", ({ node, event }) => {
    tooltip.textContent = graph.getNodeAttribute(node, "title");
    tooltip.style.left = `${event.x + 14}px`; tooltip.style.top = `${event.y + 14}px`;
    tooltip.classList.remove("hidden");
  });
  renderer.on("leaveNode", () => tooltip.classList.add("hidden"));

  renderer.on("clickNode", ({ node }) => {
    activeTopic = null;
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
    selectedNode = node; selectedEdge = null;
    document.getElementById("info2").classList.add("hidden");
    applyHighlight(new Set([node, ...graph.neighbors(node)]));
    showInfo(node, "info");
  });

  renderer.on("clickEdge", ({ edge }) => {
    if (!selectedNode || !graph.hasEdge(edge)) return;
    const [a, b] = graph.extremities(edge);
    if (a !== selectedNode && b !== selectedNode) return;
    selectedEdge = edge; refreshRenderer();
    showInfo(a === selectedNode ? b : a, "info2");
  });

  renderer.on("clickStage", resetSelection);
  renderer.getCamera().on("updated", updateTopicLabelPositions);
  renderer.on("resize", updateTopicLabelPositions);
  document.getElementById("cy").addEventListener("mousemove", (e) => {
    if (tooltip.classList.contains("hidden")) return;
    tooltip.style.left = `${e.offsetX + 14}px`; tooltip.style.top = `${e.offsetY + 14}px`;
  });
}

function updateVisibility() {
  graph.forEachNode((id, a) => {
    const hidden = hiddenTopics.has(a.cluster) || (!showWeakAssignments && a.weak_assignment);
    if (a.hidden !== hidden) graph.setNodeAttribute(id, "hidden", hidden);
  });
  graph.forEachEdge((id, a, s, t) => {
    const hidden = graph.getNodeAttribute(s, "hidden") || graph.getNodeAttribute(t, "hidden");
    if (a.hidden !== hidden) graph.setEdgeAttribute(id, "hidden", hidden);
  });
  refreshRenderer();
}

function updateStatistics() {
  const topicCount = new Set(graph.mapNodes((_id, a) => a.cluster).filter((x) => x !== -1)).size;
  document.getElementById("stats").textContent = `${graph.order} papers · ${topicCount} topics · ${graph.size} links`;
}

function buildLegend(topics) {
  const ul = document.getElementById("legend"); ul.innerHTML = "";
  const sortedTopics = [...topics].sort((a, b) => (a.id === -1) - (b.id === -1) || b.paper_count - a.paper_count);
  sortedTopics.forEach((t) => {
    const li = document.createElement("li");
    if (hiddenTopics.has(t.id)) li.classList.add("topic-hidden");
    li.innerHTML = `<input type="checkbox" class="vis" ${hiddenTopics.has(t.id) ? "" : "checked"}
      title="Show or hide this topic on the map" />
      <span class="swatch" style="background:${topicColor(t.id)}"></span>
      <span class="name">${escapeHtml(t.label)}</span><span class="count">${t.paper_count}</span>`;
    const checkbox = li.querySelector(".vis");
    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) hiddenTopics.delete(t.id); else hiddenTopics.add(t.id);
      li.classList.toggle("topic-hidden", !e.target.checked);
      updateVisibility(); updateTopicLabelPositions();
    });
    li.addEventListener("mouseenter", () => {
      if (!hiddenTopics.has(t.id))
        applyHighlight(new Set(graph.filterNodes((_id, a) => a.cluster === t.id)));
    });
    li.addEventListener("mouseleave", restoreHighlight);
    li.addEventListener("click", () => {
      const wasActive = activeTopic === t.id;
      deselectNode(); hidePanels();
      document.querySelectorAll("#legend li").forEach((x) => x.classList.remove("active"));
      activeTopic = wasActive ? null : t.id;
      if (activeTopic !== null) li.classList.add("active");
      restoreHighlight();
    });
    ul.appendChild(li);
  });
}

function createTopicLabels(topics) {
  const container = document.getElementById("topic-labels"); container.innerHTML = ""; topicLabelElements = [];
  topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count).slice(0, MAX_TOPIC_LABELS)
    .forEach((t) => {
      const nodes = graph.filterNodes((_id, a) => a.cluster === t.id);
      if (!nodes.length) return;
      let sx = 0, sy = 0;
      nodes.forEach((id) => { sx += graph.getNodeAttribute(id, "x"); sy += graph.getNodeAttribute(id, "y"); });
      const el = document.createElement("div"); el.className = "topic-label"; el.style.color = topicColor(t.id);
      el.innerHTML = `${escapeHtml((t.label.split(",")[0] || "").trim())}<span class="count">${t.paper_count}</span>`;
      container.appendChild(el); topicLabelElements.push({ id: t.id, el, x: sx / nodes.length, y: sy / nodes.length });
    });
  updateTopicLabelPositions();
}

function updateTopicLabelPositions() {
  if (!renderer) return;
  topicLabelElements.forEach((e) => {
    const hidden = hiddenTopics.has(e.id); e.el.style.display = hidden ? "none" : "block";
    if (!hidden) {
      const p = renderer.graphToViewport({ x: e.x, y: e.y });
      e.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    }
  });
}

function bindControls() {
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    activeTopic = null; deselectNode(); hidePanels();
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
    if (!q) return clearHighlight();
    const matches = new Set(graph.filterNodes((_id, a) => (a.title || "").toLowerCase().includes(q)));
    matches.size ? applyHighlight(matches) : clearHighlight();
  });
  document.getElementById("toggle-weak").addEventListener("change", (e) => {
    showWeakAssignments = e.target.checked; updateVisibility();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetSelection(); document.getElementById("search").value = "";
    renderer.getCamera().animatedReset({ duration: 250 });
  });
  document.querySelectorAll(".panel-close").forEach((btn) => btn.addEventListener("click", () => {
    if (btn.dataset.box === "info") hidePanels();
    else { document.getElementById("info2").classList.add("hidden"); selectedEdge = null; }
    refreshRenderer();
  }));
  document.getElementById("btn-refresh").addEventListener("click", refreshData);
  document.getElementById("btn-zoom-in").addEventListener("click", () =>
    renderer.getCamera().animatedZoom({ factor: 1.5, duration: 200 }));
  document.getElementById("btn-zoom-out").addEventListener("click", () =>
    renderer.getCamera().animatedUnzoom({ factor: 1.5, duration: 200 }));
  document.getElementById("btn-zoom-fit").addEventListener("click", () =>
    renderer.getCamera().animatedReset({ duration: 250 }));
}

function updateExistingColors(data) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  graph.forEachNode((id) => {
    const n = byId.get(id); if (!n) return;
    const c = topicColor(n.cluster, n.weak_assignment ? 0.5 : 1);
    graph.mergeNodeAttributes(id, { title: n.title, label: n.title, cluster: n.cluster,
      clusterLabel: n.cluster_label, weak_assignment: !!n.weak_assignment, baseColor: c, color: c,
      borderColor: c, haloColor: c });
  });
  graph.forEachEdge((id, _a, s, t) => {
    const c = edgeColor(graph.getNodeAttribute(s, "cluster"), graph.getNodeAttribute(t, "cluster"), 0.28);
    graph.mergeEdgeAttributes(id, { baseColor: c, color: c });
  });
}

async function refreshData() {
  try {
    const [data, topics] = await Promise.all([readJson(GRAPH_DATA_URL), readJson(CLUSTER_DATA_URL)]);
    validateCoordinates(data.nodes); currentTopics = topics.topics; generateColors(currentTopics);
    const existing = new Set(graph.nodes());
    const newNodes = data.nodes.filter((n) => !existing.has(n.id)), newNodeIds = new Set(newNodes.map((n) => n.id));
    newNodes.forEach((n) => graph.addNode(n.id, nodeAttributes(n)));
    data.edges.forEach((e) => {
      if (!newNodeIds.has(e.source) && !newNodeIds.has(e.target)) return;
      const id = edgeId(e);
      if (graph.hasEdge(id) || !graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
      graph.addUndirectedEdgeWithKey(id, e.source, e.target,
        edgeAttributes(e, graph.getNodeAttribute(e.source, "cluster"), graph.getNodeAttribute(e.target, "cluster")));
    });
    updateExistingColors(data);
    graph.forEachNode((id, a) => graph.mergeNodeAttributes(id,
      { degree: graph.degree(id), size: nodeSize(graph.degree(id), a.weak_assignment) }));
    buildLegend(currentTopics); updateStatistics(); updateVisibility(); createTopicLabels(currentTopics);
    alert(newNodes.length ? `Added ${newNodes.length} new papers to the map.` :
      "No new papers to add. Colors and legend were refreshed.");
  } catch (err) { alert(`Refresh failed: ${err.message}`); }
}

async function start() {
  try {
    const [data, topics] = await Promise.all([readJson(GRAPH_DATA_URL), readJson(CLUSTER_DATA_URL)]);
    currentTopics = topics.topics; generateColors(currentTopics); graph = buildGraph(data);
    createRenderer(); bindRendererEvents(); bindControls(); buildLegend(currentTopics);
    updateStatistics(); createTopicLabels(currentTopics);
    requestAnimationFrame(() => {
      renderer.resize(); renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
      updateTopicLabelPositions(); document.getElementById("loading").classList.add("hidden");
    });
  } catch (err) {
    document.getElementById("loading").textContent = `Could not load the map: ${err.message}`;
  }
}

start();
