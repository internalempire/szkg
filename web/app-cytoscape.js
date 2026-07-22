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
let isMoving = false;
let movementTimer = null;
let viewerConfig = { library_type: "user", library_id: "" };
const NODE_PX = 12;
const WEAK_NODE_PX = 9;
const SELECTED_NODE_PX = 20;
const HIGHLIGHTED_EDGE_PX = 2.2;
const SELECTED_EDGE_PX = 3.5;

async function readJson(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}t=${Date.now()}`, { cache: "no-store" });
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
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
function generateColors(topics) {
  const classifiedTopics = topics.filter((t) => t.id !== -1).sort((a, b) => b.paper_count - a.paper_count);
  classifiedTopics.forEach((t, i) => {
    const hue = (i * 137.5) % 360;
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
  const nodes = cy.nodes().map((node) => {
    const point = node.renderedPosition();
    return { id: node.id(), x: point.x, y: point.y, cluster: node.data("cluster"),
      weak: node.data("weak_assignment"), hidden: node.hasClass("graph-hidden") };
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

function zoomBy(factor) {
  const z = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
  cy.zoom({ level: z, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  applyZoomScale(); // Update immediately instead of waiting for the next frame.
}
function updateVisibility() {
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
  }
}
function resetSelection() {
  activeTopic = null;
  deselectNode();
  clearHighlight();
  hidePanels();
  document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
  scheduleTopicOverlay();
}
function showInfo(node, idBox) {
  const box = document.getElementById(idBox);
  const body = box.querySelector(".panel-body");
  const topic = node.data("cluster");
  const key = node.id();
  const weakAssignment = node.data("weak_assignment");

  body.innerHTML = `
    <p class="paper-title">${escape(node.data("title"))}</p>
    <p class="detail-row">
      <span class="topic-chip" style="background:${topicColor(topic)};color:${topicInk(topic)}">${escape(topicLabels.get(topic) || "—")}</span>
      ${weakAssignment ? '<span class="weak-badge">weak assignment</span>' : ""}
    </p>
    <p class="detail-row">Links: ${node.degree()}</p>
    <p class="detail-row"><a href="${zoteroSelectUri(key)}">Open in Zotero</a></p>
  `;
  box.classList.remove("hidden");
}
function hidePanels() {
  document.getElementById("info").classList.add("hidden");
  document.getElementById("info2").classList.add("hidden");
  cy.edges().removeClass("edge-selected");
}

function bindGraphEvents() {
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
    const node = ev.target;
    activeTopic = null;
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));

    deselectNode();
    node.addClass("selected");
    selectedNode = node.id();
    resizeNode(node); // enlarge ONLY the selected node (fast path)
    cy.edges().removeClass("edge-selected");
    document.getElementById("info2").classList.add("hidden");
    clearHighlight();
    applyHighlight(node.closedNeighborhood().nodes());
    showInfo(node, "info");
    scheduleTopicOverlay();
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

function escape(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function updateStatistics() {
  const nodeCount = cy.nodes().length;
  const edgeCount = cy.edges().length;
  const topicCount = new Set(cy.nodes().map((n) => n.data("cluster")).filter((c) => c !== -1)).size;
  document.getElementById("stats").textContent =
    `${nodeCount} papers · ${topicCount} topics · ${edgeCount} links`;
}

function applyTopicFilter() {
  const query = document.getElementById("topic-search").value.trim().toLowerCase();
  document.querySelectorAll("#legend li").forEach((li) => {
    li.style.display = !query || li.dataset.search.includes(query) ? "flex" : "none";
  });
}

function buildLegend(topics) {
  const ul = document.getElementById("legend");
  ul.innerHTML = "";
  const sortedTopics = [...topics].sort((a, b) => (a.id === -1) - (b.id === -1) || b.paper_count - a.paper_count);
  for (const t of sortedTopics) {
    const li = document.createElement("li");
    li.dataset.search = t.label.toLowerCase();
    if (hiddenTopics.has(t.id)) li.classList.add("topic-hidden");
    li.innerHTML = `
      <input type="checkbox" class="vis" ${hiddenTopics.has(t.id) ? "" : "checked"}
             title="Show or hide this topic on the map" />
      <span class="swatch" style="background:${topicColor(t.id)}"></span>
      <span class="name">${escape(t.label)}</span>
      <span class="count">${t.paper_count}</span>`;
    const checkbox = li.querySelector(".vis");
    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) hiddenTopics.delete(t.id);
      else hiddenTopics.add(t.id);
      li.classList.toggle("topic-hidden", !e.target.checked);
      updateVisibility();
    });
    li.addEventListener("mouseenter", () => {
      if (hiddenTopics.has(t.id)) return;
      previewTopic = t.id; scheduleTopicOverlay();
      clearHighlight();
      applyHighlight(cy.nodes().filter((n) => n.data("cluster") === t.id));
    });
    li.addEventListener("mouseleave", () => {
      previewTopic = null; restoreHighlight(); scheduleTopicOverlay();
    });
    li.addEventListener("click", () => {
      const wasActive = activeTopic === t.id;
      deselectNode();
      document.querySelectorAll("#legend li").forEach((x) => x.classList.remove("active"));
      hidePanels();

      activeTopic = wasActive ? null : t.id;
      if (activeTopic !== null) li.classList.add("active");
      restoreHighlight(); scheduleTopicOverlay();
    });
    ul.appendChild(li);
  }
  applyTopicFilter();
}

function bindControls() {
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    activeTopic = null;
    deselectNode();
    document.querySelectorAll("#legend li").forEach((li) => li.classList.remove("active"));
    hidePanels();

    if (!q) {
      document.getElementById("search-status").textContent = "";
      clearHighlight();
      scheduleTopicOverlay();
      return;
    }
    const matches = cy.nodes().filter((n) => (n.data("title") || "").toLowerCase().includes(q));
    document.getElementById("search-status").textContent = matches.length ? `${matches.length} found` : "No results";
    clearHighlight();
    if (matches.length) applyHighlight(matches);
    scheduleTopicOverlay();
  });
  document.getElementById("topic-search").addEventListener("input", applyTopicFilter);
  document.getElementById("toggle-weak").addEventListener("change", (e) => {
    showWeakAssignments = e.target.checked;
    updateVisibility();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    resetSelection();
    document.getElementById("search").value = "";
    document.getElementById("search-status").textContent = "";
    cy.fit(undefined, 30);
    applyZoomScale();
  });
  document.querySelectorAll(".panel-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.getAttribute("data-box") === "info") {
        hidePanels();
      } else {
        document.getElementById("info2").classList.add("hidden");
        cy.edges().removeClass("edge-selected");
      }
    });
  });

  document.getElementById("btn-refresh").addEventListener("click", refreshData);
  document.getElementById("btn-zoom-in").addEventListener("click", () => zoomBy(1.5));
  document.getElementById("btn-zoom-out").addEventListener("click", () => zoomBy(1 / 1.5));
  document.getElementById("btn-zoom-fit").addEventListener("click", () => {
    cy.fit(undefined, 30);
    applyZoomScale();
  });
}

async function refreshData() {
  try {
    const [[graphData, topics]] = await Promise.all([
      readMapSnapshot(), loadViewerConfig(),
    ]);
    topicColors = new Map();
    topicRgbColors = new Map();
    topicLabels = new Map();
    currentTopics = topics.topics;
    generateColors(topics.topics);
    const changes = reconcileGraphData(graphData);
    if (selectedNode && cy.getElementById(selectedNode).empty()) {
      selectedNode = null;
      hidePanels();
    }
    document.getElementById("info2").classList.add("hidden");
    cy.edges().removeClass("edge-selected");
    if (selectedNode) showInfo(cy.getElementById(selectedNode), "info");
    if (activeTopic !== null && !topics.topics.some((topic) => topic.id === activeTopic))
      activeTopic = null;
    buildLegend(topics.topics);
    updateStatistics();
    updateVisibility();
    calculateDegrees();
    applyZoomScale();
    createTopicLabels(topics.topics);
    const query = document.getElementById("search").value.trim().toLowerCase();
    if (query) {
      const matches = cy.nodes().filter((n) =>
        (n.data("title") || "").toLowerCase().includes(query));
      clearHighlight();
      if (matches.length) applyHighlight(matches);
    } else restoreHighlight();
    alert(`Map refreshed: +${changes.addedNodes}/−${changes.removedNodes} papers, ` +
      `+${changes.addedEdges}/−${changes.removedEdges} links.`);
  } catch (err) {
    alert(`Refresh failed: ${err.message}`);
  }
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
      readMapSnapshot(), loadViewerConfig(),
    ]);
    currentTopics = topics.topics;
    generateColors(currentTopics);

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
    bindGraphEvents();
    bindControls();
    buildLegend(topics.topics);
    updateStatistics();
    applyLayout();
    createTopicLabels(topics.topics);
  } catch (err) {
    document.getElementById("loading").textContent =
      "Could not load map data. Run 'python app.py refresh' first. (" + err.message + ")";
  }
}

start();
