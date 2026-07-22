/* WebGL renderer. Python owns semantics; Graphology stores links; Sigma draws. */
import Graph from "graphology";
import Sigma from "sigma";
import { createEdgeCurveProgram } from "@sigma/edge-curve";
import { createNodeBorderProgram } from "@sigma/node-border";

const GRAPH_DATA_URL = "../data/graph.json";
const CLUSTER_DATA_URL = "../data/clusters.json";
const USE_CURVED_EDGES = new URLSearchParams(location.search).get("edges") !== "straight";
const METADATA_URL = "../data/metadata.json";
const VIEWER_CONFIG_URL = "../data/viewer.json";

let topicColors = new Map(), topicRgbColors = new Map(), topicLabels = new Map();
let graph, renderer, currentTopics = [];
let activeTopic = null, selectedNode = null, selectedEdge = null;
let highlightedNodes = null, highlightedEdges = null;
let hiddenTopics = new Set(), showWeakAssignments = true, topicLabelEntries = [];
let previewTopic = null, topicOverlayFrame = null;
let paperMeta = {};
let viewerConfig = { library_type: "user", library_id: "" };

async function readJson(path) {
  const sep = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${sep}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read ${path}`);
  return response.json();
}

async function readMapSnapshot() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [data, topics] = await Promise.all([
      readJson(GRAPH_DATA_URL),
      readJson(CLUSTER_DATA_URL),
    ]);
    if ((data.revision || null) === (topics.revision || null)) return [data, topics];
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Map files are being updated. Please try again.");
}

// Display metadata (authors, abstract) is optional: an older map without the
// file simply shows the panel without those fields.
async function loadMetadata() {
  try { paperMeta = await readJson(METADATA_URL); }
  catch { paperMeta = {}; }
}

async function loadViewerConfig() {
  try { viewerConfig = await readJson(VIEWER_CONFIG_URL); }
  catch { viewerConfig = { library_type: "user", library_id: "" }; }
}

function zoteroSelectUri(id) {
  const key = encodeURIComponent(id);
  if (viewerConfig.library_type === "group" && viewerConfig.library_id)
    return `zotero://select/groups/${encodeURIComponent(viewerConfig.library_id)}/items/${key}`;
  return `zotero://select/library/items/${key}`;
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
function topicInk(topic) {
  const [r, g, b] = topicRgbColors.get(topic) || [110, 120, 140];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? "#08101c" : "#ffffff";
}

function mutedTopicEdge(topic) {
  const color = topicRgbColors.get(topic) || [110, 120, 140];
  const background = [10, 14, 26], strength = 0.14;
  return `rgb(${color.map((value, index) =>
    Math.round(background[index] + (value - background[index]) * strength)).join(", ")})`;
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
  let diameter = Math.min(22, 3 + degree * 0.55);
  if (weak_assignment) diameter *= 0.82;
  if (selected) diameter = Math.max(18, diameter) + 6;
  return diameter / 2;
}

function nodeAttributes(n, degree = 0) {
  const topic = topicColor(n.cluster);
  const color = n.weak_assignment ? "rgba(10, 14, 26, 0.86)" : topic;
  const border = n.weak_assignment ? topicColor(n.cluster, 0.82) : topic;
  return { x: n.x, y: n.y, label: n.title, title: n.title, cluster: n.cluster,
    clusterLabel: n.cluster_label, weak_assignment: !!n.weak_assignment, degree, size: nodeSize(degree, !!n.weak_assignment),
    color: color, baseColor: color, borderColor: border, baseBorderColor: border,
    haloColor: color, baseHaloColor: n.weak_assignment ? "rgba(110, 120, 140, 0.08)" : color,
    type: "border", hidden: false, zIndex: 1 };
}

function edgeAttributes(e, topicA, topicB) {
  const sameTopic = topicA === topicB;
  const color = sameTopic ? mutedTopicEdge(topicA) : "rgb(40, 48, 66)";
  // Thicker than a hairline so the shader's edge anti-aliasing has room to work;
  // sub-pixel edges cannot be smoothed and look jagged.
  return { weight: e.weight, size: 0.8 + (e.weight || 0.5) * 0.9,
    color: color, baseColor: color, sameTopic, curvature: edgeCurvature(edgeId(e)),
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
  const color = evid ? a.baseColor : "rgba(110, 120, 140, 0.06)";
  const border = evid ? a.baseBorderColor : "rgba(110, 120, 140, 0.08)";
  return { ...a, color: color, size: nodeSize(a.degree || 0, a.weak_assignment, sel),
    borderColor: sel ? "#ffffff" : border,
    haloColor: sel ? "rgba(255, 255, 255, 0.22)" : (evid ? a.baseHaloColor : color),
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

// Sigma creates its WebGL contexts with antialias:false, which leaves thin edges
// jagged. We force hardware MSAA only while the layers are being created. It
// smooths the visible (default framebuffer) rendering; Sigma reads picking colors
// from separate framebuffers that MSAA does not touch, so hover/click detection
// is unaffected.
function withMultisampledContexts(build) {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attributes) {
    if (type === "webgl2" || type === "webgl" || type === "experimental-webgl") {
      attributes = Object.assign({}, attributes, { antialias: true });
    }
    return original.call(this, type, attributes);
  };
  try { build(); } finally { HTMLCanvasElement.prototype.getContext = original; }
}

function createRenderer() {
  withMultisampledContexts(() => {
    renderer = new Sigma(graph, document.getElementById("cy"), {
      renderLabels: false, renderEdgeLabels: false, enableEdgeEvents: true,
      hideEdgesOnMove: false, hideLabelsOnMove: false, zIndex: true, stagePadding: 30,
      minCameraRatio: 0.005, maxCameraRatio: 33.333,
      doubleClickZoomingRatio: 1.8, doubleClickZoomingDuration: 250,
      zoomToSizeRatioFunction: () => 1, itemSizesReference: "screen", minEdgeThickness: 1.1,
      defaultNodeType: "border", defaultEdgeType: USE_CURVED_EDGES ? "curve" : "line",
      nodeProgramClasses: { border: BorderNodeProgram },
      edgeProgramClasses: USE_CURVED_EDGES ? { curve: CurvedEdgeProgram } : {},
      nodeReducer: reduceNode, edgeReducer: reduceEdge,
    });
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
  refreshRenderer(); scheduleTopicOverlay();
}

function escapeHtml(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function showInfo(id, boxId) {
  if (!graph.hasNode(id)) return;
  const n = graph.getNodeAttributes(id), box = document.getElementById(boxId);
  const meta = paperMeta[id] || {};
  const authors = (meta.authors || "").trim();
  const journal = (meta.journal || "").trim();
  const year = (meta.year || "").trim();
  const venue = [journal, year].filter(Boolean).join(" · ");
  const abstract = (meta.abstract || "").trim();
  box.querySelector(".panel-body").innerHTML = `
    <p class="paper-title">${escapeHtml(n.title)}</p>
    ${authors ? `<p class="authors">${escapeHtml(authors)}</p>` : ""}
    ${venue ? `<p class="journal">${escapeHtml(venue)}</p>` : ""}
    <div class="meta-row">
      <span class="topic-chip" style="background:${topicColor(n.cluster)};color:${topicInk(n.cluster)}">${escapeHtml(topicLabels.get(n.cluster) || "—")}</span>
      ${n.weak_assignment ? '<span class="weak-badge">weak assignment</span>' : ""}
      <span class="link-count">${graph.degree(id)} links</span>
    </div>
    <div class="abstract">${abstract ? escapeHtml(abstract) : '<span class="empty">No abstract available.</span>'}</div>
    <p class="zotero-link"><a href="${zoteroSelectUri(id)}">Open in Zotero ↗</a></p>`;
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
    scheduleTopicOverlay();
  });

  renderer.on("clickEdge", ({ edge }) => {
    if (!selectedNode || !graph.hasEdge(edge)) return;
    const [a, b] = graph.extremities(edge);
    if (a !== selectedNode && b !== selectedNode) return;
    selectedEdge = edge; refreshRenderer();
    showInfo(a === selectedNode ? b : a, "info2");
  });

  renderer.on("clickStage", resetSelection);
  renderer.getCamera().on("updated", scheduleTopicOverlay);
  renderer.on("resize", scheduleTopicOverlay);
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
  refreshRenderer(); scheduleTopicOverlay();
}

function updateStatistics() {
  const topicCount = new Set(graph.mapNodes((_id, a) => a.cluster).filter((x) => x !== -1)).size;
  document.getElementById("stats").textContent = `${graph.order} papers · ${topicCount} topics · ${graph.size} links`;
}

function applyTopicFilter() {
  const query = document.getElementById("topic-search").value.trim().toLowerCase();
  document.querySelectorAll("#legend li").forEach((li) => {
    li.style.display = !query || li.dataset.search.includes(query) ? "flex" : "none";
  });
}

function buildLegend(topics) {
  const ul = document.getElementById("legend"); ul.innerHTML = "";
  const sortedTopics = [...topics].sort((a, b) => (a.id === -1) - (b.id === -1) || b.paper_count - a.paper_count);
  sortedTopics.forEach((t) => {
    const li = document.createElement("li");
    li.dataset.search = t.label.toLowerCase();
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
      updateVisibility();
    });
    li.addEventListener("mouseenter", () => {
      if (!hiddenTopics.has(t.id)) {
        previewTopic = t.id; scheduleTopicOverlay();
        applyHighlight(new Set(graph.filterNodes((_id, a) => a.cluster === t.id)));
      }
    });
    li.addEventListener("mouseleave", () => {
      previewTopic = null; restoreHighlight(); scheduleTopicOverlay();
    });
    li.addEventListener("click", () => {
      const wasActive = activeTopic === t.id;
      deselectNode(); hidePanels();
      document.querySelectorAll("#legend li").forEach((x) => x.classList.remove("active"));
      activeTopic = wasActive ? null : t.id;
      if (activeTopic !== null) li.classList.add("active");
      restoreHighlight(); scheduleTopicOverlay();
    });
    ul.appendChild(li);
  });
  applyTopicFilter();
}

function overlayFocusTopic() {
  if (previewTopic !== null) return previewTopic;
  if (activeTopic !== null) return activeTopic;
  if (selectedNode && graph.hasNode(selectedNode)) return graph.getNodeAttribute(selectedNode, "cluster");
  return null;
}

function topicOverlayDetail() {
  const ratio = renderer.getCamera().getState().ratio;
  return ratio < 0.42 ? 2 : ratio < 0.78 ? 1 : 0;
}

function updateTopicOverlay() {
  topicOverlayFrame = null;
  if (!renderer || !window.SemanticOverlays) return;
  const nodes = graph.mapNodes((id, attributes) => {
    const point = renderer.graphToViewport({ x: attributes.x, y: attributes.y });
    return { id, x: point.x, y: point.y, cluster: attributes.cluster,
      weak: attributes.weak_assignment, hidden: attributes.hidden };
  });
  const topics = currentTopics.map((topic) => ({ ...topic, color: topicColor(topic.id) }));
  window.SemanticOverlays.update({
    canvas: document.getElementById("topic-islands"), labels: topicLabelEntries,
    topics, nodes, hiddenTopics, focusTopic: overlayFocusTopic(), detailLevel: topicOverlayDetail(),
  });
}

function scheduleTopicOverlay() {
  if (topicOverlayFrame !== null) return;
  topicOverlayFrame = requestAnimationFrame(updateTopicOverlay);
}

function createTopicLabels(topics) {
  topicLabelEntries = window.SemanticOverlays.buildLabels(
    document.getElementById("topic-labels"), topics, topicColor,
  );
  window.SemanticOverlays.bindPointerReveal(
    document.getElementById("canvas-wrap"), () => topicLabelEntries,
  );
  scheduleTopicOverlay();
}

function bindControls() {
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    activeTopic = null; deselectNode(); hidePanels();
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
    if (!q) {
      document.getElementById("search-status").textContent = "";
      clearHighlight(); scheduleTopicOverlay(); return;
    }
    const matches = new Set(graph.filterNodes((_id, a) => (a.title || "").toLowerCase().includes(q)));
    document.getElementById("search-status").textContent = matches.size ? `${matches.size} found` : "No results";
    matches.size ? applyHighlight(matches) : clearHighlight();
    scheduleTopicOverlay();
  });
  document.getElementById("topic-search").addEventListener("input", applyTopicFilter);
  document.getElementById("toggle-weak").addEventListener("change", (e) => {
    showWeakAssignments = e.target.checked; updateVisibility();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    resetSelection(); document.getElementById("search").value = "";
    document.getElementById("search-status").textContent = "";
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

function reconcileGraph(data) {
  validateCoordinates(data.nodes);
  const desiredNodes = new Map(data.nodes.map((n) => [n.id, n]));
  const desiredEdges = new Map(data.edges.map((e) => [edgeId(e), e]));
  const previousNodes = new Set(graph.nodes()), previousEdges = new Set(graph.edges());

  graph.edges().forEach((id) => { if (!desiredEdges.has(id)) graph.dropEdge(id); });
  graph.nodes().forEach((id) => { if (!desiredNodes.has(id)) graph.dropNode(id); });

  data.nodes.forEach((n) => {
    if (graph.hasNode(n.id)) graph.mergeNodeAttributes(n.id, nodeAttributes(n));
    else graph.addNode(n.id, nodeAttributes(n));
  });
  data.edges.forEach((e) => {
    const id = edgeId(e);
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) return;
    const attributes = edgeAttributes(
      e,
      graph.getNodeAttribute(e.source, "cluster"),
      graph.getNodeAttribute(e.target, "cluster"),
    );
    if (graph.hasEdge(id)) graph.mergeEdgeAttributes(id, attributes);
    else graph.addUndirectedEdgeWithKey(id, e.source, e.target, attributes);
  });
  graph.forEachNode((id, a) => graph.mergeNodeAttributes(id,
    { degree: graph.degree(id), size: nodeSize(graph.degree(id), a.weak_assignment) }));

  return {
    addedNodes: data.nodes.filter((n) => !previousNodes.has(n.id)).length,
    removedNodes: [...previousNodes].filter((id) => !desiredNodes.has(id)).length,
    addedEdges: data.edges.filter((e) => !previousEdges.has(edgeId(e))).length,
    removedEdges: [...previousEdges].filter((id) => !desiredEdges.has(id)).length,
  };
}

async function refreshData() {
  try {
    const [[data, topics]] = await Promise.all([
      readMapSnapshot(), loadMetadata(), loadViewerConfig(),
    ]);
    currentTopics = topics.topics; generateColors(currentTopics);
    const changes = reconcileGraph(data);
    if (selectedNode && !graph.hasNode(selectedNode)) resetSelection();
    document.getElementById("info2").classList.add("hidden");
    selectedEdge = null;
    if (selectedNode && graph.hasNode(selectedNode)) showInfo(selectedNode, "info");
    if (activeTopic !== null && !currentTopics.some((topic) => topic.id === activeTopic))
      activeTopic = null;
    buildLegend(currentTopics); updateStatistics(); updateVisibility(); createTopicLabels(currentTopics);
    const query = document.getElementById("search").value.trim().toLowerCase();
    if (query) {
      const matches = new Set(graph.filterNodes((_id, a) =>
        (a.title || "").toLowerCase().includes(query)));
      matches.size ? applyHighlight(matches) : clearHighlight();
    } else restoreHighlight();
    alert(`Map refreshed: +${changes.addedNodes}/−${changes.removedNodes} papers, ` +
      `+${changes.addedEdges}/−${changes.removedEdges} links.`);
  } catch (err) { alert(`Refresh failed: ${err.message}`); }
}

async function start() {
  try {
    const [[data, topics]] = await Promise.all([
      readMapSnapshot(), loadMetadata(), loadViewerConfig(),
    ]);
    currentTopics = topics.topics; generateColors(currentTopics); graph = buildGraph(data);
    createRenderer(); bindRendererEvents(); bindControls(); buildLegend(currentTopics);
    updateStatistics(); createTopicLabels(currentTopics);
    requestAnimationFrame(() => {
      renderer.resize(); renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
      scheduleTopicOverlay(); document.getElementById("loading").classList.add("hidden");
    });
  } catch (err) {
    document.getElementById("loading").textContent = `Could not load the map: ${err.message}`;
  }
}

start();
