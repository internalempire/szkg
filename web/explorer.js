/* Shared search, filters, accessible paper details and comparison controls. */
(function () {
  const PAGE_SIZE = 20;
  const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().trim();
  const ISSUE_LABELS = { missing_abstract: "Missing abstract", filename_title: "Filename-like title",
    metadata_unavailable: "Abstract metadata unavailable locally" };

  function looksLikeFilename(title) {
    const value = String(title || "").trim().toLowerCase();
    // Match data_quality.py, including its intentionally broad filename heuristic.
    return /\.(pdf|doc|docx|epub|txt|rtf)$/.test(value) || /^\S+\.[\p{L}\p{N}_]{2,4}$/u.test(value);
  }

  function paperIssues(node, metadata) {
    const issues = [];
    if (looksLikeFilename(node.title)) issues.push("filename_title");
    if (!metadata || typeof metadata.abstract !== "string") issues.push("metadata_unavailable");
    else if (!metadata.abstract.trim()) issues.push("missing_abstract");
    return issues;
  }

  function searchPapers(nodes, query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return nodes.filter((node) => words.every((word) => normalize(node.title).includes(word)))
      .sort((a, b) => String(a.title).localeCompare(String(b.title)) || String(a.id).localeCompare(String(b.id)));
  }

  function relatedPapers(data, id) {
    const records = new Map(data.nodes.map((node) => [node.id, node]));
    return data.edges.filter((edge) => edge.source === id || edge.target === id)
      .map((edge) => ({ node: records.get(edge.source === id ? edge.target : edge.source),
        weight: edge.weight, edge: `${edge.source}__${edge.target}` }))
      .filter((item) => item.node)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0) || String(a.node.title).localeCompare(String(b.node.title)));
  }

  function create(adapter) {
    const $ = (id) => document.getElementById(id);
    let data = { nodes: [], edges: [] }, metadata = {}, topics = [];
    let records = new Map(), issuesById = new Map(), page = 0, browsing = false, qualityOnly = false;
    const returnFocus = new Map();
    const element = (tag, text, className) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const action = (text, callback) => {
      const button = element("button", text);
      button.type = "button";
      button.addEventListener("click", callback);
      return button;
    };
    const hidden = (id) => {
      const node = records.get(id), state = adapter.state();
      return !!node && (state.hiddenTopics.has(node.cluster) || (!state.showWeakAssignments && node.weak_assignment));
    };
    const matchingPapers = () => searchPapers(data.nodes, $("search").value)
      .filter((node) => !qualityOnly || issuesById.get(node.id)?.length);
    const matchingIds = () => matchingPapers().map((node) => node.id);
    const hasSearch = () => qualityOnly || !!$("search").value.trim();

    function notice(message, error = false) {
      $("view-restore-message").classList.add("hidden");
      $("viewer-message").textContent = message;
      $("viewer-message").classList.toggle("error", error);
    }

    function focusPanel(boxId, opener) {
      // Result rows are rebuilt on selection; keep identity as well as the DOM node.
      returnFocus.set(boxId, { element: opener, paperId: opener?.dataset.paperId,
        listId: opener?.dataset.returnList });
      $(boxId).querySelector(".paper-title")?.focus();
    }

    function closePanel(boxId) {
      adapter.closePanel(boxId);
      const origin = returnFocus.get(boxId);
      const currentRow = origin?.listId && [...$(origin.listId).querySelectorAll("button")]
        .find((button) => button.dataset.paperId === origin.paperId);
      const previous = currentRow || origin?.element;
      if (previous?.isConnected && !previous.closest(".hidden, [hidden]")) previous.focus();
      else if (boxId === "info2" && !$("info").classList.contains("hidden"))
        $("info").querySelector(".paper-title")?.focus();
      else if ($("sidebar").hidden) $("sidebar-toggle").focus();
      else $("search").focus();
    }

    function activate(id, comparison = null) {
      if (!records.has(id)) return;
      const opener = document.activeElement;
      if (hidden(id)) {
        adapter.reveal(id);
        notice("Visibility filters adjusted to show this paper.");
        update();
      }
      if (matchMedia("(max-width: 700px)").matches) setSidebar(false);
      if (comparison) adapter.compare(id, comparison);
      else adapter.open(id);
      focusPanel(comparison ? "info2" : "info", opener);
    }

    function renderResults() {
      const query = $("search").value.trim();
      const enabled = !!query || browsing || qualityOnly;
      $("search-results").classList.toggle("hidden", !enabled);
      $("btn-browse").textContent = enabled ? "Hide paper list" : "Browse all papers";
      $("btn-browse").setAttribute("aria-expanded", String(enabled));
      const matches = matchingPapers();
      const flagged = [...issuesById.values()].filter((issues) => issues.length).length;
      $("btn-incomplete").textContent = `Review incomplete papers (${flagged})`;
      $("btn-incomplete").setAttribute("aria-pressed", String(qualityOnly));
      $("quality-help").hidden = !qualityOnly;
      const issueCount = (code) => [...issuesById.values()].filter((issues) => issues.includes(code)).length;
      $("quality-counts").textContent = `${issueCount("missing_abstract")} missing abstracts · ` +
        `${issueCount("filename_title")} filename-like titles · ${issueCount("metadata_unavailable")} unavailable locally. ` +
        "Counts cover this map and may overlap.";
      const hiddenCount = matches.filter((node) => hidden(node.id)).length;
      $("search-status").textContent = !enabled ? "" : !matches.length
        ? qualityOnly ? (query ? "No flagged papers match this title. Clear the search or turn off Review incomplete papers."
          : "No missing abstracts or filename-like titles found in the loaded map metadata.")
          : "No results. Try another title or clear the search."
        : `${matches.length} ${matches.length === 1 ? "paper" : "papers"}${hiddenCount ? ` · ${hiddenCount} hidden by filters` : ""}`;
      page = Math.min(page, Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1));
      const list = $("paper-results"); list.replaceChildren();
      if (enabled) matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((node) => {
        const item = element("li");
        const button = action("", () => activate(node.id));
        button.dataset.paperId = node.id;
        button.dataset.returnList = "paper-results";
        button.append(element("span", node.title || "Untitled paper", "result-title"));
        const meta = metadata[node.id] || {};
        const description = [meta.authors, meta.year].filter(Boolean).join(" · ");
        if (description) button.append(element("span", description, "result-meta"));
        if (qualityOnly) button.append(element("span", issuesById.get(node.id).map((code) => ISSUE_LABELS[code]).join(" · "), "result-issue"));
        button.append(element("span", hidden(node.id) ? "Hidden by filters · Show & open" : "Open on map", "result-action"));
        item.append(button);
        if (qualityOnly && adapter.zoteroUri(node.id)) {
          const link = element("a", "Open in Zotero ↗", "result-zotero");
          link.href = adapter.zoteroUri(node.id);
          link.setAttribute("aria-label", `Open in Zotero: ${node.title || "Untitled paper"}`);
          item.append(link);
        }
        list.append(item);
      });
      $("results-page").textContent = matches.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, matches.length)} of ${matches.length}` : "";
      $("results-prev").disabled = page === 0;
      $("results-next").disabled = (page + 1) * PAGE_SIZE >= matches.length;
      $("results-pagination").classList.toggle("hidden", matches.length <= PAGE_SIZE);
      $("btn-clear-search").hidden = !query;
    }

    function update() {
      const state = adapter.state();
      const validHidden = topics.filter((topic) => state.hiddenTopics.has(topic.id)).length;
      const parts = [];
      if ($("search").value.trim()) parts.push("Title search active");
      if (qualityOnly) parts.push("Metadata review active");
      if (validHidden) parts.push(`${validHidden} ${validHidden === 1 ? "topic" : "topics"} hidden`);
      if (!state.showWeakAssignments) parts.push("Weak assignments hidden");
      if (state.activeTopic !== null) parts.push("One topic highlighted");
      if ($("topic-search").value.trim()) parts.push("Topic list filtered");
      $("filter-summary").textContent = parts.join(" · ") || "All topics and assignments visible";
      $("toggle-weak").checked = state.showWeakAssignments;
      document.querySelectorAll(".related-papers button").forEach((button) => {
        button.querySelector(".result-action").textContent =
          `Similarity ${button.dataset.score} · ${hidden(button.dataset.paperId) ? "Show & compare" : "Compare"}`;
      });
      document.querySelectorAll("#legend li").forEach((li) => {
        const id = Number(li.dataset.topicId), isHidden = state.hiddenTopics.has(id);
        li.classList.toggle("topic-hidden", isHidden);
        li.classList.toggle("active", state.activeTopic === id);
        li.querySelector("input").checked = !isHidden;
        const button = li.querySelector("button");
        button.disabled = isHidden;
        button.setAttribute("aria-pressed", String(state.activeTopic === id));
      });
      renderResults();
    }

    function filterTopics() {
      const query = normalize($("topic-search").value);
      let count = 0;
      document.querySelectorAll("#legend li").forEach((li) => {
        const visible = !query || li.dataset.search.includes(query);
        li.hidden = !visible;
        if (visible) count++;
      });
      $("topic-empty").hidden = count > 0;
      update();
    }

    function legend() {
      const tracked = topics.filter((topic) => topic.stable_id);
      $("topic-continuity").hidden = !tracked.length;
      const continued = tracked.filter((topic) => topic.continuity === "continued").length;
      const branched = tracked.filter((topic) => ["split", "merged", "reorganized"].includes(topic.continuity)).length;
      $("topic-continuity-summary").textContent = `${tracked.length} topic identities tracked. ` +
        `${continued} continued; ${branched} originated from splits, merges or reorganization at the last full rebuild. ` +
        "The remainder are baseline or new topics.";
      const list = $("legend"); list.replaceChildren();
      [...topics].sort((a, b) => (a.id === -1) - (b.id === -1) || b.paper_count - a.paper_count)
        .forEach((topic) => {
          const item = element("li");
          item.dataset.topicId = topic.id;
          item.dataset.search = normalize(topic.label);
          const checkbox = element("input"); checkbox.type = "checkbox"; checkbox.className = "vis";
          checkbox.setAttribute("aria-label", `Show topic: ${topic.label}`);
          checkbox.addEventListener("change", () => { adapter.setTopicVisible(topic.id, checkbox.checked); update(); });
          const button = action("", () => {
            $("search").value = ""; browsing = false; page = 0;
            adapter.selectTopic(topic.id); update();
          });
          button.className = "topic-select";
          button.setAttribute("aria-label", `Highlight topic: ${topic.label}`);
          const swatch = element("span", undefined, "swatch"); swatch.style.background = adapter.color(topic.id);
          button.append(swatch, element("span", topic.label, "name"), element("span", topic.paper_count, "count"));
          button.addEventListener("mouseenter", () => { if (!hiddenTopic(topic.id)) adapter.preview(topic.id); });
          button.addEventListener("mouseleave", () => adapter.preview(null));
          button.addEventListener("focus", () => { if (!hiddenTopic(topic.id)) adapter.preview(topic.id); });
          button.addEventListener("blur", () => adapter.preview(null));
          item.append(checkbox, button); list.append(item);
        });
      filterTopics();
    }
    const hiddenTopic = (id) => adapter.state().hiddenTopics.has(id);

    function showInfo(id, boxId) {
      $("view-restore-message").classList.add("hidden");
      const node = records.get(id);
      if (!node) return;
      const box = $(boxId), body = box.querySelector(".panel-body"), meta = metadata[id] || {};
      const wasFocused = body.contains(document.activeElement);
      body.replaceChildren();
      const title = element("h2", node.title || "Untitled paper", "paper-title");
      title.id = `${boxId}-title`; title.tabIndex = -1;
      box.setAttribute("aria-labelledby", title.id); body.append(title);
      if (meta.authors) body.append(element("p", meta.authors, "authors"));
      const venue = [meta.journal, meta.year].filter(Boolean).join(" · ");
      if (venue) body.append(element("p", venue, "journal"));
      const row = element("div", undefined, "meta-row");
      const chip = element("span", topics.find((topic) => topic.id === node.cluster)?.label || "unclassified", "topic-chip");
      chip.style.background = adapter.color(node.cluster); chip.style.color = adapter.ink(node.cluster);
      row.append(chip);
      if (node.weak_assignment) row.append(element("span", "Uncertain topic membership", "weak-badge"));
      body.append(row);
      const related = relatedPapers(data, id);
      row.append(element("span", `${related.length} ${related.length === 1 ? "link" : "links"}`, "link-count"));
      if (boxId === "info") {
        body.append(element("h3", `Related papers (${related.length})`));
        body.append(element("p", "Sorted by cosine similarity, not a probability or citation count.", "muted"));
        const list = element("ul", undefined, "related-papers");
        related.forEach((item) => {
          const entry = element("li");
          const button = action("", () => activate(item.node.id, item.edge));
          button.append(element("span", item.node.title, "result-title"));
          const score = Number.isFinite(item.weight) ? item.weight.toFixed(3) : "unavailable";
          button.dataset.paperId = item.node.id;
          button.dataset.score = score;
          button.append(element("span", `Similarity ${score} · ${hidden(item.node.id) ? "Show & compare" : "Compare"}`, "result-action"));
          entry.append(button); list.append(entry);
        });
        if (!related.length) body.append(element("p", "No semantic links in this map.", "muted"));
        body.append(list);
      }
      body.append(element("h3", "Abstract"));
      body.append(element("div", meta.abstract || "No abstract available.", "abstract"));
      const uri = adapter.zoteroUri(id);
      if (uri) {
        const linkRow = element("p", undefined, "zotero-link");
        const link = element("a", "Open in Zotero ↗"); link.href = uri;
        linkRow.append(link); body.append(linkRow);
      } else {
        body.append(element("p", "Direct item links are not yet verified for this source. To edit this record, search its title in your reference manager.", "muted"));
      }
      box.classList.remove("hidden");
      if (wasFocused) title.focus();
    }

    function runSearch() {
      $("view-restore-message").classList.add("hidden");
      page = 0;
      adapter.search(hasSearch() ? matchingIds() : null);
      update();
    }

    function captureView() {
      const state = adapter.state();
      const reference = (id) => {
        const topic = topics.find((item) => item.id === id);
        return topic ? window.SavedViews.topicRef(topic, data.revision) : null;
      };
      return { hiddenTopics: [...state.hiddenTopics].map(reference).filter(Boolean),
        activeTopic: reference(state.activeTopic), showWeakAssignments: state.showWeakAssignments,
        selectedNode: state.selectedNode, query: $("search").value,
        topicQuery: $("topic-search").value, browsing, qualityOnly, renderer: adapter.renderer,
        camera: adapter.camera(), layout: window.SavedViews.layoutSignature(data) };
    }

    function restoreView(saved) {
      notice("");
      const opener = document.activeElement;
      const narrow = matchMedia("(max-width: 700px)").matches;
      if (narrow) setSidebar(false);
      const view = window.SavedViews.cleanView(saved);
      const resolved = window.SavedViews.resolveTopics(view, topics, data.revision);
      $("search").value = view.query; $("topic-search").value = view.topicQuery;
      browsing = view.browsing; qualityOnly = view.qualityOnly; page = 0;
      adapter.clearFilters();
      adapter.restoreFilters({ ...resolved, showWeakAssignments: view.showWeakAssignments });
      adapter.search(hasSearch() ? matchingIds() : null);
      // Searching clears selection and topic focus, so apply saved focus afterward.
      adapter.restoreFilters({ ...resolved, showWeakAssignments: view.showWeakAssignments });
      const selected = view.selectedNode && records.has(view.selectedNode) && !hidden(view.selectedNode);
      const sameLayout = view.layout === window.SavedViews.layoutSignature(data);
      const sameRenderer = view.renderer === adapter.renderer;
      if (selected) {
        if (sameLayout && sameRenderer && view.camera) adapter.select(view.selectedNode);
        else adapter.open(view.selectedNode);
      }
      if (sameLayout && sameRenderer && view.camera) adapter.restoreCamera(view.camera);
      else if (!selected) adapter.fit();
      filterTopics();
      const notes = [];
      if (resolved.missing) notes.push(`${resolved.missing} changed or missing topic filters were not restored.`);
      if (view.selectedNode && !selected) notes.push("The selected paper is missing or hidden by current filters.");
      if (!sameLayout || !sameRenderer || !view.camera)
        notes.push("The map or renderer changed; the camera was fitted or centered on the selected paper.");
      if (selected) focusPanel("info", opener);
      else if (narrow) $("sidebar-toggle").focus();
      if (narrow) {
        $("view-restore-message").textContent = `Saved view opened. ${notes.join(" ")}`;
        $("view-restore-message").classList.remove("hidden");
      }
      return notes.join(" ");
    }
    function setSidebar(visible) {
      $("sidebar").hidden = !visible;
      $("sidebar-toggle").setAttribute("aria-expanded", String(visible));
      $("sidebar-toggle").textContent = visible ? "Hide search & filters" : "Show search & filters";
      adapter.resize();
    }
    $("sidebar-toggle").addEventListener("click", () => {
      const visible = $("sidebar").hidden;
      setSidebar(visible);
      if (visible) $("search").focus();
    });
    setSidebar(!matchMedia("(max-width: 700px)").matches);
    $("search").addEventListener("input", runSearch);
    $("search").addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        const first = $("paper-results").querySelector("button");
        if (first) { event.preventDefault(); event.key === "Enter" ? first.click() : first.focus(); }
      }
    });
    $("paper-results").addEventListener("keydown", (event) => {
      const buttons = [...$("paper-results").querySelectorAll("button")];
      const index = buttons.indexOf(document.activeElement);
      if (index >= 0 && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
        buttons[next]?.focus();
      }
    });
    $("btn-clear-search").addEventListener("click", () => { $("search").value = ""; runSearch(); $("search").focus(); });
    $("btn-incomplete").addEventListener("click", () => { qualityOnly = !qualityOnly; runSearch(); });
    $("btn-browse").addEventListener("click", () => {
      const enabled = browsing || hasSearch();
      browsing = !enabled;
      if (enabled) { $("search").value = ""; qualityOnly = false; adapter.search(null); }
      page = 0; update();
    });
    $("results-prev").addEventListener("click", () => { page--; renderResults(); $("paper-results").querySelector("button")?.focus(); });
    $("results-next").addEventListener("click", () => { page++; renderResults(); $("paper-results").querySelector("button")?.focus(); });
    $("topic-search").addEventListener("input", filterTopics);
    $("toggle-weak").addEventListener("change", (event) => { adapter.setWeak(event.target.checked); update(); });
    $("btn-clear-filters").addEventListener("click", () => {
      $("search").value = ""; $("topic-search").value = ""; qualityOnly = false; page = 0;
      adapter.clearFilters(); filterTopics(); notice("All visibility filters and selections cleared. Camera unchanged.");
    });
    $("btn-reset").addEventListener("click", adapter.fit);
    document.querySelectorAll(".panel-close").forEach((button) =>
      button.addEventListener("click", () => closePanel(button.dataset.box)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!$("info2").classList.contains("hidden")) { event.preventDefault(); closePanel("info2"); }
        else if (!$("info").classList.contains("hidden")) { event.preventDefault(); closePanel("info"); }
        else if (document.activeElement === $("search")) { $("search").value = ""; runSearch(); }
        else if (matchMedia("(max-width: 700px)").matches && !$("sidebar").hidden) {
          setSidebar(false); $("sidebar-toggle").focus();
        }
      }
    });

    return { matchingIds, hasSearch, update, legend, showInfo, notice, captureView, restoreView,
      setData(snapshot, newTopics, newMetadata) {
        const previousView = topics.length && window.SavedViews ? captureView() : null;
        data = snapshot; topics = newTopics; metadata = newMetadata || {};
        records = new Map(data.nodes.map((node) => [node.id, node]));
        issuesById = new Map(data.nodes.map((node) => [node.id, paperIssues(node, metadata[node.id])]));
        $("btn-incomplete").disabled = false;
        // Numeric cluster IDs may be recycled. Match display identity, not numbers.
        if (previousView) adapter.restoreFilters({
          ...window.SavedViews.resolveTopics(previousView, topics, data.revision),
          showWeakAssignments: previousView.showWeakAssignments,
        });
        const validTopics = new Set(topics.map((topic) => topic.id));
        for (const id of adapter.state().hiddenTopics) if (!validTopics.has(id)) adapter.state().hiddenTopics.delete(id);
        legend();
      },
      refreshBusy(busy) {
        $("btn-refresh").disabled = busy;
        $("btn-refresh").textContent = busy ? "Reloading local map…" : "Reload local map";
      } };
  }
  window.PaperExplorer = { create, searchPapers, relatedPapers, looksLikeFilename, paperIssues };
})();
