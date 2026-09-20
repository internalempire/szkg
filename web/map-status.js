/* Shared, renderer-independent explanation of the map's semantic freshness. */
(function () {
  function formatTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not recorded" :
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function describe(status = {}) {
    status = status || {};
    const count = Number.isSafeInteger(status.pending_paper_count) && status.pending_paper_count > 0
      ? status.pending_paper_count : 0;
    const known = status.status_known === true;
    const headline = count
      ? `${count} ${count === 1 ? "paper needs" : "papers need"} reorganization`
      : known ? "No pending paper changes" : "Rebuild status unknown";
    const explanation = count
      ? "Added or edited papers are saved, but their topics, links and positions await a full rebuild."
      : known ? "No added or edited papers are waiting for a full rebuild."
        : "This older map has no rebuild history. Rebuild once to establish its status.";
    return { headline, explanation: explanation + (count && !known
      ? " Earlier changes in this older map cannot be verified." : ""),
      needsAttention: count > 0 || !known,
      synced: formatTime(status.last_sync_at), rebuilt: formatTime(status.last_full_rebuild_at) };
  }

  function render(status) {
    const element = document.getElementById("map-status");
    if (!element) return;
    const message = describe(status);
    element.classList.toggle("needs-attention", message.needsAttention);
    element.querySelector(".status-headline").textContent = message.headline;
    element.querySelector(".status-explanation").textContent = message.explanation;
    element.querySelector(".last-sync").textContent = message.synced;
    element.querySelector(".last-rebuild").textContent = message.rebuilt;
  }

  window.MapStatus = { describe, render };
})();
