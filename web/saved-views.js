/* Local bookmarks, never credentials or copies of paper metadata. */
(function () {
  const VERSION = 1, LIMIT = 20;
  const text = (value, limit = 2000) => typeof value === "string" ? value.slice(0, limit) : "";
  const topicRef = (topic, revision) => topic.id === -1 ? "unclassified"
    : topic.stable_id ? `stable:${topic.stable_id}` : `legacy:${revision || "unknown"}:${topic.id}`;

  function layoutSignature(data) {
    let hash = 2166136261;
    for (const node of [...data.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const char of JSON.stringify([node.id, node.x, node.y])) {
        hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619);
      }
    }
    return `${data.nodes.length}:${hash >>> 0}`;
  }

  function cleanView(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.hiddenTopics))
      throw new Error("The saved view is invalid.");
    let camera = null;
    const c = value.camera;
    if (value.renderer === "sigma" && c && [c.x, c.y, c.ratio, c.angle].every(Number.isFinite)
        && c.ratio >= .005 && c.ratio <= 33.333 && Math.abs(c.x) < 1e6 && Math.abs(c.y) < 1e6)
      camera = { x: c.x, y: c.y, ratio: c.ratio, angle: c.angle };
    if (value.renderer === "cytoscape" && c && [c.zoom, c.x, c.y].every(Number.isFinite)
        && c.zoom >= .03 && c.zoom <= 200 && Math.abs(c.x) < 1e8 && Math.abs(c.y) < 1e8)
      camera = { zoom: c.zoom, x: c.x, y: c.y };
    return { hiddenTopics: value.hiddenTopics.slice(0, 5000).filter((v) => typeof v === "string").map((v) => text(v, 200)),
      activeTopic: text(value.activeTopic, 200) || null,
      showWeakAssignments: value.showWeakAssignments !== false,
      selectedNode: text(value.selectedNode, 200) || null,
      query: text(value.query), topicQuery: text(value.topicQuery), browsing: !!value.browsing,
      qualityOnly: value.qualityOnly === true,
      renderer: text(value.renderer, 20), layout: text(value.layout, 100), camera };
  }

  function resolveTopics(view, topics, revision) {
    const ids = new Map(topics.map((topic) => [topicRef(topic, revision), topic.id]));
    const missing = view.hiddenTopics.filter((ref) => !ids.has(ref)).length +
      (view.activeTopic && !ids.has(view.activeTopic) ? 1 : 0);
    return { hiddenTopics: new Set(view.hiddenTopics.filter((ref) => ids.has(ref)).map((ref) => ids.get(ref))),
      activeTopic: ids.has(view.activeTopic) ? ids.get(view.activeTopic) : null, missing };
  }

  function create({ library, capture, restore }) {
    const $ = (id) => document.getElementById(id);
    let removed = null;
    const message = (value, error = false) => {
      $("saved-view-message").textContent = value;
      $("saved-view-message").classList.toggle("error", error);
    };
    function key() {
      const config = library();
      if (config.profile_id && (config.source === "papers" || config.embedding_service === "openrouter"))
        return `szkg:views:v${VERSION}:profile:${config.profile_id}`;
      if (!config.library_id || !["user", "group"].includes(config.library_type))
        throw new Error("Library identity is unavailable. Reload the local map after a completed sync.");
      return `szkg:views:v${VERSION}:${config.library_type}:${config.library_id}`;
    }
    function read() {
      const raw = localStorage.getItem(key());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION || !Array.isArray(parsed.views) || parsed.views.length > LIMIT)
        throw new Error("Unsupported saved-view data. Existing data has not been replaced.");
      return parsed.views.map((entry) => {
        if (!entry.id || typeof entry.name !== "string") throw new Error("Invalid saved-view data.");
        return { id: text(entry.id, 100), name: text(entry.name, 80), view: cleanView(entry.view) };
      });
    }
    function write(views) { localStorage.setItem(key(), JSON.stringify({ version: VERSION, views })); }
    function refresh(selected = $("saved-view-select").value) {
      const views = read(), select = $("saved-view-select");
      select.replaceChildren();
      const empty = document.createElement("option"); empty.value = "";
      empty.textContent = views.length ? "Choose a saved view" : "No saved views yet";
      select.append(empty);
      views.forEach((entry) => {
        const option = document.createElement("option"); option.value = entry.id;
        option.textContent = entry.name; select.append(option);
      });
      select.value = views.some((entry) => entry.id === selected) ? selected : "";
      $("saved-view-restore").disabled = !select.value;
      $("saved-view-delete").disabled = !select.value;
      $("saved-view-undo").hidden = !removed;
    }
    const attempt = (callback) => {
      try { callback(); }
      catch (error) { message(`Could not access saved views. ${error.message} Browser storage may be disabled or full.`, true); }
    };
    $("saved-view-form").addEventListener("submit", (event) => {
      event.preventDefault();
      attempt(() => {
        const name = $("saved-view-name").value.trim(), views = read();
        if (!name) { message("Enter a name for this view.", true); $("saved-view-name").focus(); return; }
        if (views.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
          message("That name is already in use. Choose a different name or delete the old view.", true); return;
        }
        if (views.length >= LIMIT) { message("Twenty views are saved. Delete one before saving another.", true); return; }
        const entry = { id: crypto.randomUUID(), name: name.slice(0, 80), view: cleanView(capture()) };
        write([...views, entry]); refresh(entry.id); $("saved-view-name").value = "";
        message(`Saved “${entry.name}” in this browser.`);
      });
    });
    $("saved-view-select").addEventListener("change", () => attempt(() => refresh()));
    $("saved-view-restore").addEventListener("click", () => attempt(() => {
      const entry = read().find((item) => item.id === $("saved-view-select").value);
      if (!entry) { refresh(); message("That view no longer exists.", true); return; }
      message(`Opened “${entry.name}”. ${restore(entry.view)}`);
    }));
    $("saved-view-delete").addEventListener("click", () => attempt(() => {
      const views = read(), id = $("saved-view-select").value;
      const entry = views.find((item) => item.id === id);
      write(views.filter((item) => item.id !== id)); removed = entry ? { key: key(), entry } : null;
      refresh(); $("saved-view-select").focus(); message("Saved view deleted. You can undo this deletion.");
    }));
    $("saved-view-undo").addEventListener("click", () => attempt(() => {
      if (!removed || removed.key !== key()) return;
      const views = read();
      if (views.length >= LIMIT || views.some((entry) => entry.name.toLowerCase() === removed.entry.name.toLowerCase())) {
        message("Cannot undo: the name is in use or twenty views are already saved.", true); return;
      }
      write([...views, removed.entry]); const id = removed.entry.id; removed = null;
      refresh(id); $("saved-view-select").focus(); message("Deletion undone.");
    }));
    $("saved-views").addEventListener("toggle", () => { if ($("saved-views").open) attempt(() => refresh()); });
    window.addEventListener("storage", () => attempt(() => refresh()));
    attempt(() => refresh());
  }

  window.SavedViews = { create, cleanView, resolveTopics, topicRef, layoutSignature };
})();
