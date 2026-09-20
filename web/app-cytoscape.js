const GRAPH_DATA_URL = "../data/graph.json";
const CLUSTER_DATA_URL = "../data/clusters.json";
const VIEWER_CONFIG_URL = "../data/viewer.json";
cytoscape.use(window.cytoscapeFcose);
/* Legacy CPU renderer kept as a safety fallback for the WebGL implementation. */
let topicColors = new Map();
let topicRgbColors = new Map();
let topicLabels = new Map();
let positionsById = new Map();
let cy = null;
let currentTopics = [];
let activeTopic = null;
let selectedNode = null;
let hiddenTopics = new Set();
let showWeakAssignments = true;
let previewTopic = null;
let topicLabelEntries = [];
let topicOverlayFrame = null;
let overlayGeometry = null;
let isMoving = false;
let movementTimer = null;
let viewerConfig = { library_type: "user", library_id: "" };
let paperMeta = {}, explorer = null, refreshInProgress = false;
const NODE_PX = 12;
const WEAK_NODE_PX = 9;
const SELECTED_NODE_PX = 20;
const HIGHLIGHTED_EDGE_PX = 2.2;
const SELECTED_EDGE_PX = 3.5;

async function readJson(path) {
  const separator = path.includes("?") ? "&" : "?";
  const profile = window.LibraryControl?.profileId;
  const response = await fetch(`${path}${separator}t=${Date.now()}${profile ? `&profile=${encodeURIComponent(profile)}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read ${path}`);
  return response.json();
}
async function readMapSnapshot() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [graphData, topics] = await Promise.all([
      readJson(GRAPH_DATA_URL),
      readJson(CLUSTER_DATA_URL),
    ]);
    if ((graphData.revision || null) === (topics.revision || null)) return [graphData, topics];
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Map files are being updated. Please try again.");
}
async function loadViewerConfig() {
  try { viewerConfig = await readJson(VIEWER_CONFIG_URL); }
  catch { viewerConfig = window.LibraryControl?.viewerIdentity || { source: "unknown" }; }
}
async function loadMetadata() {
  try { paperMeta = await readJson("../data/metadata.json"); }
  catch { paperMeta = {}; }
}
function zoteroSelectUri(id) {
  if (["papers", "unknown"].includes(viewerConfig.source)) return null;
  const key = encodeURIComponent(id);
  if (viewerConfig.library_type === "group" && viewerConfig.library_id)
    return `zotero://select/groups/${encodeURIComponent(viewerConfig.library_id)}/items/${key}`;
  return `zotero://select/library/items/${key}`;
}
function hslToRgb(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
function generateColors(topics) {
  const classifiedTopics = topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count);
  classifiedTopics.forEach((t, i) => {
    const colorIndex = Number.isInteger(t.color_index) && t.color_index >= 0 ? t.color_index : i;
    const hue = (colorIndex * 137.5) % 360;
    const rgb = hslToRgb(hue, 0.72, 0.58);
    topicRgbColors.set(t.id, rgb);
    topicColors.set(t.id, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    topicLabels.set(t.id, t.label);
  });
  topicRgbColors.set(-1, [110, 120, 140]);
  topicColors.set(-1, "rgb(110, 120, 140)");
  topicLabels.set(-1, "unclassified");
}

function topicColor(topic) {
  return topicColors.get(topic) || "rgb(110, 120, 140)";
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
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function edgeCurvature(id) {
  const h = hashString(id);
  const direction = h < 0.5 ? -1 : 1;
  const intensity = 4 + Math.floor(h * 1000) % 8;
  return direction * intensity;
}

function buildElements(graphData) {
  positionsById = new Map();
  for (const n of graphData.nodes) {
    if (typeof n.x === "number" && typeof n.y === "number") {
      positionsById.set(n.id, { x: n.x, y: n.y });
    }
  }
  const topicById = new Map(graphData.nodes.map((n) => [n.id, n.cluster]));
  const nodes = graphData.nodes.map((n) => ({
    group: "nodes",
    data: {
      id: n.id,
      title: n.title,
      cluster: n.cluster,
      label: n.cluster_label,
      weak_assignment: !!n.weak_assignment,
      color: topicColor(n.cluster),
    },
  }));
  const edges = graphData.edges.map((e) => {
    const eid = `${e.source}__${e.target}`;
    const topicA = topicById.get(e.source), topicB = topicById.get(e.target);
    return {
      group: "edges",
      data: {
        id: eid,
        source: e.source,
        target: e.target,
        weight: e.weight,
        color: topicA === topicB ? mutedTopicEdge(topicA) : "rgb(40, 48, 66)",
        sameTopic: topicA === topicB,
        curv: edgeCurvature(eid),
      },
    };
  });
  return [...nodes, ...edges];
}

function cytoscapeStyles() {
  return [
    {
      selector: "node",
      style: {
        "background-color": (ele) => ele.data("weak_assignment") ? "#0a0e1a" : ele.data("color"),
        opacity: (ele) => (ele.data("weak_assignment") ? 0.88 : 1),
        width: (ele) => (ele.data("weak_assignment") ? WEAK_NODE_PX : NODE_PX),
        height: (ele) => (ele.data("weak_assignment") ? WEAK_NODE_PX : NODE_PX),
        "border-width": (ele) => ele.data("weak_assignment") ? 1.4 : 0,
        "border-color": (ele) => ele.data("color"),
        "overlay-opacity": 0,
      },
    },
    {
      selector: "edge",
      style: {
        width: (ele) => 0.3 + (ele.data("weight") || 0.5) * 0.7,
        "line-color": (ele) => ele.data("color"),
        opacity: 1,
        "curve-style": "unbundled-bezier",
        "control-point-distance": (ele) => ele.data("curv"),
        "control-point-weight": 0.5,
        "overlay-opacity": 0,
      },
    },
    { selector: "node:active", style: { "overlay-opacity": 0 } },
    { selector: "edge:active", style: { "overlay-opacity": 0 } },
    { selector: "node.dim", style: { opacity: 0.08 } },
    { selector: "edge.dim", style: { opacity: 0.02 } },
    { selector: "node.highlighted", style: { opacity: 1, "z-index": 50 } },
    {
      selector: "edge.edge-highlighted",
      style: { "line-color": "#ffb020", opacity: 0.95, "z-index": 20 },
    },
    {
      selector: "edge.edge-selected",
      style: { "line-color": "#ffffff", opacity: 1, "z-index": 70 },
    },
    { selector: "edge.motion-hide", style: { display: "none" } },
    { selector: "edge.background-hidden", style: { display: "none" } },
    {
      selector: "node.selected",
      style: {
        "border-color": "#ffffff",
        "border-opacity": 1,
        "overlay-color": "#ffffff",
        "overlay-opacity": 0.2,
        "overlay-padding": 8,
        opacity: 1,
        "z-index": 9999,
      },
    },
    { selector: ".graph-hidden", style: { display: "none" } },
  ];
}

function applyLayout() {
  if (positionsById.size > 0) {
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const p = positionsById.get(n.id());
        if (p) n.position(p);
      });
    });
    requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 30);
      applyZoomScale(); // nodes at the correct size from the very start
      document.getElementById("loading").classList.add("hidden");
    });
    return;
  }
  const layout = cy.layout({
    name: "fcose",
    quality: "default",
    animate: false,
    randomize: true,
    packComponents: true,
    nodeRepulsion: 4500,
    idealEdgeLength: (edge) => 55 * (1.15 - (edge.data("weight") || 0.5)),
    nodeSeparation: 75,
    padding: 30,
    fit: true,
  });
  layout.one("layoutstop", () => document.getElementById("loading").classList.add("hidden"));
  layout.run();
}
function applyZoomScale() {
  const z = cy.zoom();
  cy.batch(() => {
    cy.nodes().style("width", (e) => nodeSize(e) / z);
    cy.nodes().style("height", (e) => nodeSize(e) / z);
    cy.nodes().style("border-width", (e) =>
      e.hasClass("selected") ? 3 / z : (e.data("weak_assignment") ? 1.4 / z : 0));
    cy.nodes(".selected").style("overlay-padding", 8 / z);
  });
}
function endMovement() {
  isMoving = false;
  cy.edges().removeClass("motion-hide");
  applyZoomScale();
  resizeHighlightedEdges();
}
function resizeNode(node) {
  const z = cy.zoom();
  const s = nodeSize(node) / z;
  const sel = node.hasClass("selected");
  node.style({ width: s, height: s,
    "border-width": sel ? 3 / z : (node.data("weak_assignment") ? 1.4 / z : 0) });
  if (sel) node.style("overlay-padding", 8 / z);
}
function resizeHighlightedEdges() {
  const z = cy.zoom();
  cy.edges(".edge-highlighted").style("width", HIGHLIGHTED_EDGE_PX / z);
  cy.edges(".edge-selected").style("width", SELECTED_EDGE_PX / z);
}
function deselectNode() {
  const sel = cy.nodes(".selected");
  sel.removeClass("selected");
  sel.forEach(resizeNode);
  selectedNode = null;
}

function nodeSize(e) {
  const degree = e.data("degree") || 0;
  let px = 3 + degree * 0.55; // Isolated ~3, common ~6-16, hub up to 22.
  if (px > 22) px = 22;
  if (e.data("weak_assignment")) px *= 0.82;
  if (e.hasClass("selected")) px = Math.max(18, px) + 6;
  return px;
}
function calculateDegrees() {
  cy.batch(() => cy.nodes().forEach((n) => n.data("degree", n.degree())));
}
function overlayFocusTopic() {
  if (previewTopic !== null) return previewTopic;
  if (activeTopic !== null) return activeTopic;
  if (selectedNode) {
    const node = cy.getElementById(selectedNode);
    if (node.nonempty()) return node.data("cluster");
  }
  return null;
}

function topicOverlayDetail() {
  const zoom = cy.zoom();
  return zoom > 1.7 ? 2 : zoom > 0.9 ? 1 : 0;
}

function updateTopicOverlay() {
  topicOverlayFrame = null;
  if (!cy || !window.SemanticOverlays) return;
  const zoom = cy.zoom(), pan = cy.pan();
  const project = (point) => ({ x: point.x * zoom + pan.x, y: point.y * zoom + pan.y });
  if (!overlayGeometry) {
    const nodes = cy.nodes().map((node) => ({ id: node.id(), ...node.position(),
      cluster: node.data("cluster"), weak: node.data("weak_assignment"), hidden: node.hasClass("graph-hidden") }));
    overlayGeometry = window.SemanticOverlays.prepareGeometry(nodes, project);
  }
  const topics = currentTopics.map((topic) => ({ ...topic, color: topicColor(topic.id) }));
  window.SemanticOverlays.update({
    canvas: document.getElementById("topic-islands"), labels: topicLabelEntries,
    topics, geometry: overlayGeometry, project, hiddenTopics,
    focusTopic: overlayFocusTopic(), detailLevel: topicOverlayDetail(),
  });
}

function scheduleTopicOverlay() {
  if (topicOverlayFrame !== null) return;
  topicOverlayFrame = requestAnimationFrame(updateTopicOverlay);
}

function createTopicLabels(topics) {
  overlayGeometry = null;
  topicLabelEntries = window.SemanticOverlays.buildLabels(
    document.getElementById("topic-labels"), topics, topicColor,
  );
  window.SemanticOverlays.bindPointerReveal(
    document.getElementById("canvas-wrap"), () => topicLabelEntries,
  );
  scheduleTopicOverlay();
}

function zoomBy(factor) {
  const z = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
  cy.zoom({ level: z, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  applyZoomScale(); // Update immediately instead of waiting for the next frame.
}
function updateVisibility() {
  overlayGeometry = null;
  cy.batch(() => {
    cy.elements().removeClass("graph-hidden");
    const toHide = cy.nodes().filter(
      (n) => hiddenTopics.has(n.data("cluster")) || (!showWeakAssignments && n.data("weak_assignment"))
    );
    toHide.addClass("graph-hidden");
    toHide.connectedEdges().addClass("graph-hidden");
  });
  scheduleTopicOverlay();
}
function applyHighlight(nodes) {
  cy.batch(() => {
    cy.nodes().addClass("dim");
    nodes.removeClass("dim").addClass("highlighted");
    const edges = nodes.edgesWith(nodes);
    cy.edges().addClass("background-hidden");
    edges.removeClass("background-hidden motion-hide").addClass("edge-highlighted");
  });
  resizeHighlightedEdges();
}
function clearHighlight() {
  cy.nodes().removeClass("dim highlighted");
  cy.batch(() => {
    cy.edges(".edge-highlighted, .edge-selected").removeStyle("width");
    cy.edges().removeClass("edge-highlighted edge-selected background-hidden");
  });
}
function restoreHighlight() {
  clearHighlight();
  if (selectedNode) {
    const n = cy.getElementById(selectedNode);
    if (n.nonempty()) applyHighlight(n.closedNeighborhood().nodes());
  } else if (activeTopic !== null) {
    applyHighlight(cy.nodes().filter((x) => x.data("cluster") === activeTopic));
  } else if (explorer?.hasSearch()) {
    const matches = new Set(explorer.matchingIds());
    applyHighlight(cy.nodes().filter((node) => matches.has(node.id())));
  }
}
function resetSelection() {
  activeTopic = null; previewTopic = null;
  deselectNode();
  clearHighlight();
  hidePanels();
  document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
  restoreHighlight(); scheduleTopicOverlay(); explorer?.update();
}
function showInfo(node, boxId) { explorer.showInfo(node.id(), boxId); }

function selectPaper(id) {
  const node = cy.getElementById(id);
  if (node.empty()) return;
  activeTopic = null; previewTopic = null; deselectNode();
  node.addClass("selected"); selectedNode = id; resizeNode(node);
  cy.edges().removeClass("edge-selected");
  document.getElementById("info2").classList.add("hidden");
  clearHighlight(); applyHighlight(node.closedNeighborhood().nodes());
  showInfo(node, "info"); scheduleTopicOverlay(); explorer.update();
}

function createExplorer(data) {
  explorer = window.PaperExplorer.create({
    state: () => ({ hiddenTopics, showWeakAssignments, activeTopic, selectedNode }),
    renderer: "cytoscape",
    select: selectPaper,
    camera: () => ({ zoom: cy.zoom(), ...cy.pan() }),
    restoreCamera(camera) { cy.stop(); cy.viewport({ zoom: camera.zoom, pan: { x: camera.x, y: camera.y } }); applyZoomScale(); },
    restoreFilters(state) {
      hiddenTopics = new Set(state.hiddenTopics); showWeakAssignments = state.showWeakAssignments;
      activeTopic = state.activeTopic; previewTopic = null; updateVisibility(); restoreHighlight();
    },
    color: topicColor, ink: topicInk, zoteroUri: zoteroSelectUri,
    resize() { cy.resize(); scheduleTopicOverlay(); },
    search(ids) {
      activeTopic = null; previewTopic = null; deselectNode(); hidePanels(); clearHighlight();
      if (ids !== null) {
        const matches = new Set(ids);
        applyHighlight(cy.nodes().filter((node) => matches.has(node.id())));
      }
      scheduleTopicOverlay();
    },
    open(id) {
      selectPaper(id);
      cy.center(cy.getElementById(id)); applyZoomScale();
    },
    compare(id, edgeId) {
      const edge = cy.getElementById(edgeId);
      if (!selectedNode || edge.empty()) return;
      cy.edges().removeClass("edge-selected"); edge.addClass("edge-selected");
      resizeHighlightedEdges(); showInfo(cy.getElementById(id), "info2");
    },
    reveal(id) {
      const node = cy.getElementById(id);
      hiddenTopics.delete(node.data("cluster"));
      if (node.data("weak_assignment")) showWeakAssignments = true;
      updateVisibility();
    },
    setTopicVisible(id, visible) {
      visible ? hiddenTopics.delete(id) : hiddenTopics.add(id);
      if (!visible && (activeTopic === id ||
          (selectedNode && cy.getElementById(selectedNode).data("cluster") === id))) resetSelection();
      updateVisibility(); restoreHighlight();
    },
    setWeak(visible) {
      showWeakAssignments = visible;
      if (!visible && selectedNode && cy.getElementById(selectedNode).data("weak_assignment")) resetSelection();
      updateVisibility(); restoreHighlight();
    },
    selectTopic(id) {
      activeTopic = activeTopic === id ? null : id; previewTopic = null;
      deselectNode(); hidePanels(); restoreHighlight(); scheduleTopicOverlay();
    },
    preview(id) {
      previewTopic = id; clearHighlight();
      if (id === null) restoreHighlight();
      else applyHighlight(cy.nodes().filter((node) => node.data("cluster") === id));
      scheduleTopicOverlay();
    },
    clearFilters() { hiddenTopics.clear(); showWeakAssignments = true; resetSelection(); updateVisibility(); },
    fit() { cy.fit(undefined, 30); applyZoomScale(); },
    closePanel(box) {
      if (box === "info") resetSelection();
      else { document.getElementById("info2").classList.add("hidden"); cy.edges().removeClass("edge-selected"); resizeHighlightedEdges(); }
    },
  });
  explorer.setData(data, currentTopics, paperMeta);
  document.getElementById("saved-view-fields").disabled = false;
  document.getElementById("saved-view-message").textContent = "Views are saved only when you choose Save current view.";
  window.SavedViews.create({ library: () => viewerConfig,
    capture: explorer.captureView, restore: explorer.restoreView });
}
function hidePanels() {
  document.getElementById("info").classList.add("hidden");
  document.getElementById("info2").classList.add("hidden");
  cy.edges().removeClass("edge-selected");
}

function bindGraphEvents() {
  cy.on("position data add remove", "node", () => { overlayGeometry = null; scheduleTopicOverlay(); });
  const tooltip = document.getElementById("tooltip");
  cy.on("mouseover", "node", (ev) => {
    tooltip.textContent = ev.target.data("title");
    tooltip.classList.remove("hidden");
  });
  cy.on("mousemove", "node", (ev) => {
    const e = ev.originalEvent;
    tooltip.style.left = e.offsetX + 14 + "px";
    tooltip.style.top = e.offsetY + 14 + "px";
  });
  cy.on("mouseout", "node", () => tooltip.classList.add("hidden"));
  cy.on("tap", "node", (ev) => {
    selectPaper(ev.target.id());
  });
  cy.on("tap", "edge", (ev) => {
    if (!selectedNode) return;
    const edge = ev.target;
    const a = cy.getElementById(selectedNode);
    if (!edge.connectedNodes().anySame(a)) return;
    const otherNode = edge.connectedNodes().not(a);
    if (otherNode.empty()) return;

    cy.edges().removeClass("edge-selected");
    edge.addClass("edge-selected");
    resizeHighlightedEdges();
    showInfo(otherNode, "info2");
  });
  let lastStageTap = 0;
  cy.on("tap", (ev) => {
    if (ev.target !== cy) return;
    const now = Date.now();
    const isDoubleClick = now - lastStageTap < 400;
    lastStageTap = isDoubleClick ? 0 : now;

    if (isDoubleClick && ev.position) {
      const p = ev.position;
      const z = Math.min(cy.maxZoom(), cy.zoom() * 1.8);
      cy.animate(
        { zoom: z, pan: { x: cy.width() / 2 - p.x * z, y: cy.height() / 2 - p.y * z } },
        { duration: 250 }
      );
      return;
    }
    resetSelection();
  });
  cy.on("viewport", () => {
    if (!isMoving) {
      isMoving = true;
      cy.edges().not(".edge-highlighted").not(".edge-selected").addClass("motion-hide");
    }
    scheduleTopicOverlay();
    clearTimeout(movementTimer);
    movementTimer = setTimeout(endMovement, 160);
  });
}

function updateStatistics() {
  const nodeCount = cy.nodes().length;
  const edgeCount = cy.edges().length;
  const topicCount = new Set(cy.nodes().map((n) => n.data("cluster")).filter((c) => c !== -1)).size;
  document.getElementById("stats").textContent =
    `${nodeCount} papers · ${topicCount} topics · ${edgeCount} links`;
}

function bindControls() {
  document.getElementById("btn-refresh").addEventListener("click", refreshData);
  document.getElementById("btn-zoom-in").addEventListener("click", () => zoomBy(1.5));
  document.getElementById("btn-zoom-out").addEventListener("click", () => zoomBy(1 / 1.5));
  document.getElementById("btn-zoom-fit").addEventListener("click", () => {
    cy.fit(undefined, 30); applyZoomScale();
  });
}

async function refreshData() {
  if (refreshInProgress) return;
  refreshInProgress = true; explorer.refreshBusy(true);
  explorer.notice("Reading the local map. Zotero is not being synchronized.");
  try {
    const [[graphData, topics]] = await Promise.all([
      readMapSnapshot(), loadViewerConfig(), loadMetadata(),
    ]);
    topicColors = new Map(); topicRgbColors = new Map(); topicLabels = new Map();
    currentTopics = topics.topics; generateColors(currentTopics);
    const changes = reconcileGraphData(graphData);
    window.MapStatus.render(graphData.status);
    if (selectedNode && cy.getElementById(selectedNode).empty()) { selectedNode = null; hidePanels(); }
    document.getElementById("info2").classList.add("hidden"); cy.edges().removeClass("edge-selected");
    explorer.setData(graphData, currentTopics, paperMeta);
    calculateDegrees();
    if (selectedNode) showInfo(cy.getElementById(selectedNode), "info");
    updateStatistics(); updateVisibility(); applyZoomScale(); createTopicLabels(currentTopics); restoreHighlight();
    explorer.notice(`Local map reloaded: +${changes.addedNodes}/−${changes.removedNodes} papers, ` +
      `+${changes.addedEdges}/−${changes.removedEdges} links.`);
  } catch (err) {
    explorer.notice(`Could not reload the local map: ${err.message} Try Reload local map again.`, true);
  } finally { refreshInProgress = false; explorer.refreshBusy(false); }
}

function reconcileGraphData(graphData) {
  const desiredNodes = new Map(graphData.nodes.map((n) => [n.id, n]));
  const desiredEdges = new Map(graphData.edges.map((e) => [`${e.source}__${e.target}`, e]));
  const previousNodes = new Set(cy.nodes().map((n) => n.id()));
  const previousEdges = new Set(cy.edges().map((e) => e.id()));
  cy.batch(() => {
    cy.edges().forEach((edge) => { if (!desiredEdges.has(edge.id())) edge.remove(); });
    cy.nodes().forEach((node) => { if (!desiredNodes.has(node.id())) node.remove(); });
    graphData.nodes.forEach((n) => {
      let node = cy.getElementById(n.id);
      if (node.empty()) node = cy.add({ group: "nodes", data: { id: n.id } });
      node.data({ title: n.title, cluster: n.cluster, label: n.cluster_label,
        weak_assignment: !!n.weak_assignment, color: topicColor(n.cluster) });
      node.position({ x: n.x, y: n.y });
    });
    graphData.edges.forEach((e) => {
      const source = cy.getElementById(e.source);
      const target = cy.getElementById(e.target);
      if (source.empty() || target.empty()) return;
      const id = `${e.source}__${e.target}`;
      let edge = cy.getElementById(id);
      const topicA = source.data("cluster"), topicB = target.data("cluster");
      const data = { id, source: e.source, target: e.target, weight: e.weight,
        color: topicA === topicB ? mutedTopicEdge(topicA) : "rgb(40, 48, 66)",
        sameTopic: topicA === topicB, curv: edgeCurvature(id) };
      if (edge.empty()) edge = cy.add({ group: "edges", data });
      else edge.data({ weight: e.weight, color: data.color, sameTopic: data.sameTopic, curv: data.curv });
    });
  });
  return {
    addedNodes: graphData.nodes.filter((n) => !previousNodes.has(n.id)).length,
    removedNodes: [...previousNodes].filter((id) => !desiredNodes.has(id)).length,
    addedEdges: graphData.edges.filter((e) => !previousEdges.has(`${e.source}__${e.target}`)).length,
    removedEdges: [...previousEdges].filter((id) => !desiredEdges.has(id)).length,
  };
}

async function start() {
  try {
    const [[graphData, topics]] = await Promise.all([
      readMapSnapshot(), loadViewerConfig(), loadMetadata(),
    ]);
    currentTopics = topics.topics;
    generateColors(currentTopics);

    window.MapStatus.render(graphData.status);

    cy = cytoscape({
      container: document.getElementById("cy"),
      elements: buildElements(graphData),
      style: cytoscapeStyles(),
      layout: { name: "preset" },
      minZoom: 0.03,
      maxZoom: 200,
      textureOnViewport: true,
      pixelRatio: 1,
    });

    calculateDegrees();
    createExplorer(graphData);
    window.LibraryControl?.rendererReady();
    bindGraphEvents();
    bindControls();
    updateStatistics();
    applyLayout();
    createTopicLabels(topics.topics);
  } catch (err) {
    document.getElementById("loading").textContent =
      "Could not load map data. Run 'python app.py refresh' first. (" + err.message + ")";
  }
}

start();
