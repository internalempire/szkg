/* A same-origin control panel shared by both renderers; never stores API keys. */
(function () {
  const $ = (id) => document.getElementById(id);
  const active = new Set(["preparing", "awaiting_confirmation", "running"]);
  let snapshot = null, timer = null, lastPreview = null, hasMap = true;
  let online = true, rendererStarted = false;
  let formInitialized = false, sending = false;
  let loadedProfile = null, collectionSignature = "";

  function connectorFields() {
    const papers = $("library-source").value === "papers";
    $("zotero-fields").hidden = papers; $("zotero-fields").disabled = papers;
    $("papers-fields").hidden = !papers; $("papers-fields").disabled = !papers;
    const router = $("embedding-service").value === "openrouter";
    $("openai-fields").hidden = router; $("openrouter-fields").hidden = !router;
  }

  function unsavedSettings(config) {
    const papers = $("library-source").value === "papers";
    return $("library-source").value !== (config.source || "zotero") ||
      $("embedding-service").value !== (config.service || "openai") ||
      (papers ? $("papers-email").value !== (config.papers_email || "") || $("papers-collection").value !== (config.papers_collection_id || "")
        : $("library-id").value !== config.library_id || $("library-type").value !== config.library_type) ||
      ["zotero-key", "openai-key", "openrouter-key"].some((id) => $(id).value);
  }

  function feedback(text, error = false) {
    $("library-feedback").textContent = text;
    $("library-feedback").classList.toggle("error", error);
  }
  function papersFeedback(text, error = false) {
    // Keep authentication feedback beside the action, not below the whole form.
    $("papers-feedback").textContent = text;
    $("papers-feedback").classList.toggle("error", error);
  }
  async function request(path, body) {
    const response = await fetch(path, body === undefined ? { cache: "no-store" } : {
      method: "POST", headers: { "Content-Type": "application/json", "X-SZKG-Token": snapshot?.token || "",
        "X-SZKG-Profile": loadedProfile || "" },
      body: JSON.stringify(body),
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error(`The local server returned an unexpected response (HTTP ${response.status}). Restart SZKG and reload this page.`); }
    if (!response.ok) throw new Error(result.error || "Local service request failed.");
    return result;
  }
  function render(value) {
    const focused = document.activeElement;
    snapshot = value;
    const config = value.configuration, job = value.job, busy = active.has(job.state);
    const source = config.source_name || "Zotero", service = config.service_name || "OpenAI";
    const keySaved = config.embedding_key_saved ?? config.openai_key_saved;
    $("library-summary").textContent = config.ready
      ? `${source} configured · ${service} key ${keySaved ? "saved" : "not saved"}`
      : config.source === "papers" && !config.papers_connected
        ? "Reconnect Papers to preview changes. Your existing local map remains available offline."
        : "Complete your connection settings to preview changes. Existing local maps remain available offline.";
    if (!formInitialized) {
      $("library-id").value = config.library_id;
      $("library-type").value = config.library_type;
      $("library-source").value = config.source || "zotero";
      $("embedding-service").value = config.service || "openai";
      $("papers-email").value = config.papers_email || "";
      loadedProfile = config.profile_id;
      connectorFields();
      $("library-settings").open = !config.ready;
      formInitialized = true;
      if (!config.ready || !value.map_available || busy) $("library-controls").open = true;
    }
    const signature = JSON.stringify([config.papers_collections, config.papers_collection_id]);
    if (signature !== collectionSignature) {
      collectionSignature = signature;
      const select = $("papers-collection"), selected = select.value || config.papers_collection_id || "";
      select.replaceChildren(new Option("Choose a collection", ""));
      const collections = config.papers_collections || [];
      collections.forEach((item) => select.add(new Option(item.name, item.id)));
      if (selected && !collections.some((item) => item.id === selected))
        select.add(new Option(`${selected} (saved; reconnect to verify)`, selected));
      select.value = selected;
    }
    $("papers-session").textContent = config.papers_connected
      ? `Connected for this server session as ${config.papers_session_email}. Choose a collection and save settings.`
      : "Not connected. Existing local maps remain available offline.";
    $("papers-disconnect").hidden = !config.papers_connected;
    $("library-privacy").textContent = `Preview reads ${source}, without changing it. New or edited titles and abstracts go to ${service === "OpenRouter" ? "OpenRouter and the model provider" : service} only after confirmation. Rebuild reorganizes topics and positions.`;
    const dirty = unsavedSettings(config);
    $("library-unsaved").hidden = !dirty;
    $("library-fields").disabled = busy || sending || !online;
    $("library-sync").disabled = dirty || !config.ready || busy || sending || !online;
    $("library-rebuild").disabled = dirty || !config.ready || busy || sending || !online;
    $("library-job").textContent = job.message;
    $("library-job").classList.toggle("error", job.state === "failed");
    $("library-preview").hidden = job.state !== "awaiting_confirmation";
    $("library-cancel").hidden = !["preparing", "awaiting_confirmation"].includes(job.state);
    $("library-cancel").disabled = sending || !online || !!job.cancel_requested;
    const needsKey = job.preview && job.preview.new + job.preview.edited > 0 && !keySaved;
    $("library-confirm").disabled = sending || !online || !!needsKey;
    $("library-key-warning").hidden = !needsKey || job.state !== "awaiting_confirmation";
    $("library-open").hidden = job.state !== "succeeded";
    $("library-reconnect").hidden = online;
    if (focused?.closest("#library-controls") && focused.closest("[hidden]")) $("library-job").focus();
    const health = value.health;
    $("library-health").textContent = `Local library health: ${health.mapped_papers} mapped papers. ` +
      `${health.missing_abstracts} missing abstracts among ${health.metadata_records} saved metadata records.`;
    if (job.state === "awaiting_confirmation" && job.id !== lastPreview) {
      lastPreview = job.id;
      const preview = job.preview, list = $("library-estimate"); list.replaceChildren();
      const rows = [
        [`Papers read from ${source}`, preview.papers_read], ["New / edited texts", `${preview.new} / ${preview.edited}`],
        ["Removed from the local cache", preview.removed], [`Tokens to send to ${service}`, preview.tokens],
        ["Estimated embedding cost (USD)", Number.isFinite(preview.estimated_usd) ? `$${preview.estimated_usd.toFixed(8)}` : "Unavailable — not free"], ["Embedding model", preview.model],
      ];
      rows.forEach(([label, content]) => {
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = label; dd.textContent = content; list.append(dt, dd);
      });
      $("library-rebuild-warning").textContent = job.operation === "rebuild" || !value.map_available
        ? "This builds a complete layout. Existing papers and topic islands may move."
        : "Existing positions stay fixed. Changed semantic relationships wait for a full rebuild.";
      $("library-controls").open = true;
      // Announce the preview without stealing focus from ongoing map exploration.
    }
    clearTimeout(timer);
    if (busy) timer = setTimeout(refresh, 1000);
  }
  async function refresh() {
    try {
      const value = await request("/api/status");
      if (loadedProfile && value.configuration.profile_id !== loadedProfile) { location.reload(); return; }
      if (!online) feedback("Local service reconnected. Current job status restored.");
      online = true; render(value);
    }
    catch {
      online = false;
      feedback("Cannot reach the local service. Keep or restart SZKG, then reconnect. A confirmed job may still be running; do not start a second process.", true);
      $("library-reconnect").hidden = false;
      if (snapshot) render(snapshot);
    }
  }
  async function post(path, body) {
    if (sending) return;
    const opener = document.activeElement;
    const papersAction = path.startsWith("/api/papers/");
    const connecting = path === "/api/papers/connect";
    sending = true;
    if (papersAction) {
      papersFeedback(connecting ? "Connecting to Papers and checking your collections. This may take up to a minute…" : "Disconnecting the local Papers session…");
      $("papers-feedback").setAttribute("aria-busy", "true");
      $("papers-connect").textContent = connecting ? "Connecting…" : "Connect & list collections";
    }
    if (snapshot) render(snapshot);
    feedback("");
    try {
      render(await request(path, body));
      if (papersAction) {
        const count = snapshot.configuration.papers_collections.length;
        papersFeedback(!connecting ? "Papers disconnected. Your local map is unchanged."
          : count ? `Connected. ${count} collection${count === 1 ? "" : "s"} available. Choose one below, then save settings.`
            : "Login succeeded, but Papers returned no collections. Check that this account has a synchronized library.");
      }
      if (path === "/api/config") {
        if (snapshot.configuration.profile_id !== loadedProfile) { location.reload(); return; }
        $("library-settings").open = false;
        feedback("Settings saved locally. Preview sync to verify library access.");
        $("library-settings").querySelector("summary").focus();
      }
    }
    catch (error) {
      const message = error instanceof TypeError
        ? "Cannot reach the local SZKG server. Keep its Terminal window open, then reload this page and try again."
        : error.message;
      feedback(message, true);
      if (papersAction) papersFeedback(message, true);
      await refresh();
    }
    finally {
      if (papersAction) {
        $("papers-feedback").setAttribute("aria-busy", "false");
        $("papers-connect").textContent = "Connect & list collections";
      }
      sending = false; if (snapshot) render(snapshot);
      if (path.startsWith("/api/jobs") && (document.activeElement === opener || document.activeElement === document.body))
        $("library-job").focus();
    }
  }
  $("library-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = { LIBRARY_SOURCE: $("library-source").value, EMBEDDING_SERVICE: $("embedding-service").value,
      ZOTERO_LIBRARY_ID: $("library-id").value, ZOTERO_LIBRARY_TYPE: $("library-type").value,
      ZOTERO_API_KEY: $("zotero-key").value, OPENAI_API_KEY: $("openai-key").value,
      OPENROUTER_API_KEY: $("openrouter-key").value, PAPERS_EMAIL: $("papers-email").value,
      PAPERS_COLLECTION_ID: $("papers-collection").value };
    // Clear password fields even if the request fails; no browser persistence.
    $("zotero-key").value = ""; $("openai-key").value = ""; $("openrouter-key").value = "";
    await post("/api/config", values);
  });
  $("library-source").addEventListener("change", connectorFields);
  $("embedding-service").addEventListener("change", connectorFields);
  $("library-form").addEventListener("input", () => { if (snapshot) render(snapshot); });
  $("library-form").addEventListener("change", () => { if (snapshot) render(snapshot); });
  $("papers-connect").addEventListener("click", async () => {
    if (sending) return;
    if (!$("papers-email").reportValidity()) return;
    if (!$("papers-password").value) {
      papersFeedback("Enter your Papers password to connect. It is not saved.", true);
      $("papers-password").focus(); return;
    }
    const credentials = { email: $("papers-email").value, password: $("papers-password").value };
    $("papers-password").value = "";
    await post("/api/papers/connect", credentials);
    credentials.password = "";
  });
  $("papers-disconnect").addEventListener("click", () => post("/api/papers/disconnect", {}));
  $("library-sync").addEventListener("click", () => post("/api/jobs", { operation: "sync" }));
  $("library-rebuild").addEventListener("click", () => post("/api/jobs", { operation: "rebuild" }));
  $("library-confirm").addEventListener("click", () => post("/api/jobs/confirm", { id: snapshot.job.id }));
  $("library-cancel").addEventListener("click", () => post("/api/jobs/cancel", { id: snapshot.job.id }));
  $("library-reconnect").addEventListener("click", refresh);
  $("library-open").addEventListener("click", () => {
    if (!rendererStarted) location.reload();
    else { $("btn-refresh").click(); feedback("Local reload requested. See the map status below."); }
  });
  window.LibraryControl = { get profileId() { return loadedProfile; },
    get viewerIdentity() { return snapshot?.configuration?.viewer_identity; },
    rendererReady() { rendererStarted = true; }, ready: (async () => {
    try {
      const value = await request("/api/status"); hasMap = value.map_available; render(value);
      if (!hasMap) {
        $("stats").textContent = "No local map yet";
        $("map-status").querySelector(".status-headline").textContent = "No map built yet";
        $("loading").textContent = "Connect your library in Library setup & sync to build your first map.";
        document.querySelectorAll(".controls button, .search-actions button, #search, #topic-search, #toggle-weak, #zoom-controls button")
          .forEach((control) => { control.disabled = true; });
        $("sidebar-toggle").addEventListener("click", () => {
          const sidebar = $("sidebar"); sidebar.hidden = !sidebar.hidden;
          $("sidebar-toggle").setAttribute("aria-expanded", String(!sidebar.hidden));
          $("sidebar-toggle").textContent = sidebar.hidden ? "Show search & filters" : "Hide search & filters";
        });
      }
      return hasMap;
    } catch {
      online = false;
      $("library-summary").textContent = "Library controls need the current local server. Restart with python app.py serve. Existing maps can still be explored.";
      $("library-fields").disabled = true; $("library-reconnect").hidden = false;
      return true;
    }
  })() };
})();
