/* Shared semantic-island and topic-label layer for both graph renderers. */
(function () {
  const OVERVIEW_LABELS = 14;
  const MID_ZOOM_LABELS = 28;
  const REVEAL_DISTANCE = 52;
  let pointer = null;
  let pointerContainer = null;
  let labelProvider = () => [];
  let revealFrame = null;

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function rgb(color) {
    const values = String(color).match(/[\d.]+/g) || [110, 120, 140];
    return values.slice(0, 3).map(Number);
  }

  function rgba(color, alpha) {
    const [r, g, b] = rgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function shortLabel(label) {
    return String(label || "topic").split(",").map((part) => part.trim()).filter(Boolean)
      .slice(0, 2).join(" · ");
  }

  function convexHull(points) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    if (sorted.length <= 2) return sorted;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
      lower.push(point);
    }
    const upper = [];
    for (const point of sorted.reverse()) {
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function topicCore(points) {
    const strong = points.filter((point) => !point.weak);
    const candidates = strong.length ? strong : points;
    if (candidates.length < 8) return candidates;
    const cx = median(candidates.map((point) => point.x));
    const cy = median(candidates.map((point) => point.y));
    const ranked = candidates.map((point) => ({
      point,
      distance: Math.hypot(point.x - cx, point.y - cy),
    })).sort((a, b) => a.distance - b.distance);
    return ranked.slice(0, Math.max(3, Math.ceil(ranked.length * 0.9))).map((item) => item.point);
  }

  function topicAnchor(points) {
    const core = topicCore(points);
    if (!core.length) return null;
    const cx = median(core.map((point) => point.x));
    const cy = median(core.map((point) => point.y));
    return core.reduce((best, point) => (
      Math.hypot(point.x - cx, point.y - cy) < Math.hypot(best.x - cx, best.y - cy)
        ? point : best
    ), core[0]);
  }

  function expandedHull(points, padding) {
    const hull = convexHull(topicCore(points));
    const cx = median(hull.map((point) => point.x));
    const cy = median(hull.map((point) => point.y));
    return hull.map((point) => {
      const dx = point.x - cx, dy = point.y - cy;
      const distance = Math.max(1, Math.hypot(dx, dy));
      return { x: point.x + dx / distance * padding, y: point.y + dy / distance * padding };
    });
  }

  function prepareCanvas(canvas) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.round(width * pixelRatio), targetHeight = Math.round(height * pixelRatio);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth; canvas.height = targetHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  function drawIsland(context, points, color, emphasis) {
    if (!points.length) return;
    const fillAlpha = emphasis > 0 ? 0.15 : emphasis < 0 ? 0.025 : 0.075;
    const lineAlpha = emphasis > 0 ? 0.42 : emphasis < 0 ? 0.06 : 0.2;
    context.save();
    context.fillStyle = rgba(color, fillAlpha);
    context.strokeStyle = rgba(color, lineAlpha);
    context.lineWidth = emphasis > 0 ? 1.8 : 1.1;
    context.shadowColor = rgba(color, emphasis > 0 ? 0.28 : 0.14);
    context.shadowBlur = emphasis > 0 ? 28 : 20;
    context.beginPath();
    if (points.length === 1) {
      context.arc(points[0].x, points[0].y, 24, 0, Math.PI * 2);
    } else if (points.length === 2) {
      context.moveTo(points[0].x, points[0].y);
      context.lineTo(points[1].x, points[1].y);
      context.lineCap = "round";
      context.lineWidth = 34;
      context.strokeStyle = rgba(color, fillAlpha);
      context.stroke();
      context.restore();
      return;
    } else {
      const hull = expandedHull(points, 18);
      context.moveTo(hull[0].x, hull[0].y);
      hull.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.closePath();
    }
    context.fill(); context.shadowBlur = 0; context.stroke(); context.restore();
  }

  function buildLabels(container, topics, colorForTopic) {
    container.innerHTML = "";
    return topics.filter((topic) => topic.id !== -1).map((topic) => {
      const element = document.createElement("div");
      element.className = "topic-label";
      element.style.setProperty("--topic-color", colorForTopic(topic.id));
      element.innerHTML = `<span class="topic-label-name"></span><span class="count"></span>`;
      element.querySelector(".topic-label-name").textContent = shortLabel(topic.label);
      element.querySelector(".count").textContent = topic.paper_count;
      container.appendChild(element);
      return { id: topic.id, paperCount: topic.paper_count, element };
    });
  }

  function intersects(a, b) {
    const gap = 6;
    return !(a.right + gap < b.left || b.right + gap < a.left ||
      a.bottom + gap < b.top || b.bottom + gap < a.top);
  }

  function distanceFromRect(point, rectangle) {
    const dx = Math.max(rectangle.left - point.x, 0, point.x - rectangle.right);
    const dy = Math.max(rectangle.top - point.y, 0, point.y - rectangle.bottom);
    return Math.hypot(dx, dy);
  }

  function applyPointerReveal(labels = labelProvider()) {
    labels.forEach((entry) => {
      const visible = entry.element.style.display !== "none";
      const near = visible && pointer !== null &&
        distanceFromRect(pointer, entry.element.getBoundingClientRect()) <= REVEAL_DISTANCE;
      entry.element.classList.toggle("cursor-near", near);
    });
  }

  function schedulePointerReveal() {
    if (revealFrame !== null) return;
    revealFrame = requestAnimationFrame(() => {
      revealFrame = null;
      applyPointerReveal();
    });
  }

  function bindPointerReveal(container, getLabels) {
    labelProvider = getLabels;
    if (pointerContainer === container) return;
    pointerContainer = container;
    container.addEventListener("pointermove", (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedulePointerReveal();
    });
    container.addEventListener("pointerleave", () => {
      pointer = null;
      schedulePointerReveal();
    });
  }

  function update(options) {
    const { canvas, labels, topics, nodes, hiddenTopics, focusTopic, detailLevel } = options;
    const { context, width, height } = prepareCanvas(canvas);
    const topicById = new Map(topics.map((topic) => [topic.id, topic]));
    const pointsByTopic = new Map();
    nodes.forEach((node) => {
      if (node.cluster === -1 || node.hidden || hiddenTopics.has(node.cluster)) return;
      if (!pointsByTopic.has(node.cluster)) pointsByTopic.set(node.cluster, []);
      pointsByTopic.get(node.cluster).push(node);
    });

    [...pointsByTopic.entries()].sort((a, b) => a[1].length - b[1].length).forEach(([id, points]) => {
      const topic = topicById.get(id);
      if (!topic) return;
      const emphasis = focusTopic === null ? 0 : (focusTopic === id ? 1 : -1);
      drawIsland(context, topicCore(points), topic.color, emphasis);
    });

    const labelLimit = detailLevel >= 2 ? Infinity : detailLevel === 1 ? MID_ZOOM_LABELS : OVERVIEW_LABELS;
    const ordered = [...labels].sort((a, b) =>
      (b.id === focusTopic) - (a.id === focusTopic) || b.paperCount - a.paperCount);
    const accepted = [];
    let visibleCount = 0;
    ordered.forEach((entry) => {
      const points = pointsByTopic.get(entry.id) || [];
      const anchor = topicAnchor(points);
      const permitted = entry.id === focusTopic || visibleCount < labelLimit;
      if (!anchor || hiddenTopics.has(entry.id) || !permitted ||
          anchor.x < 20 || anchor.y < 18 || anchor.x > width - 20 || anchor.y > height - 18) {
        entry.element.style.display = "none";
        return;
      }
      entry.element.style.display = "block";
      entry.element.classList.toggle("focused", entry.id === focusTopic);
      const box = {
        left: anchor.x - entry.element.offsetWidth / 2,
        right: anchor.x + entry.element.offsetWidth / 2,
        top: anchor.y - entry.element.offsetHeight / 2,
        bottom: anchor.y + entry.element.offsetHeight / 2,
      };
      if (accepted.some((other) => intersects(box, other)) && entry.id !== focusTopic) {
        entry.element.style.display = "none";
        return;
      }
      entry.element.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -50%)`;
      accepted.push(box); visibleCount += 1;
    });
    applyPointerReveal(labels);
  }

  window.SemanticOverlays = { bindPointerReveal, buildLabels, update };
})();
