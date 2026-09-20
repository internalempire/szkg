/* Network-free tests for the shared status UI used by both renderers. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("web/map-status.js", "utf8"), context);
const { describe } = context.window.MapStatus;

test("legacy maps are unknown, not falsely marked current", () => {
  assert.equal(describe().headline, "Rebuild status unknown");
  assert.equal(describe(null).needsAttention, true);
});
test("pending singular and plural counts are explicit", () => {
  assert.equal(describe({ pending_paper_count: 1 }).headline, "1 paper needs reorganization");
  assert.equal(describe({ pending_paper_count: 12 }).headline, "12 papers need reorganization");
});
test("a successful full rebuild has no pending changes", () => {
  const message = describe({ status_known: true, pending_paper_count: 0 });
  assert.equal(message.headline, "No pending paper changes");
  assert.equal(message.needsAttention, false);
});
test("unknown older history remains explicit even with known pending changes", () => {
  assert.match(describe({ pending_paper_count: 2 }).explanation, /cannot be verified/);
});
test("absent or invalid dates and counts do not break the UI", () => {
  const message = describe({ last_sync_at: "invalid", pending_paper_count: -2 });
  assert.equal(message.synced, "Not recorded");
  assert.equal(message.rebuilt, "Not recorded");
  assert.equal(message.headline, "Rebuild status unknown");
});
test("render replaces stale text with plain text and preserves disclosure", () => {
  const nodes = {};
  let attention;
  context.document = { getElementById: () => ({
    classList: { toggle: (_name, value) => { attention = value; } },
    querySelector: (selector) => nodes[selector] ||= { textContent: "old" },
  }) };
  context.window.MapStatus.render({ status_known: true, pending_paper_count: 1 });
  assert.equal(nodes[".status-headline"].textContent, "1 paper needs reorganization");
  assert.equal(attention, true);
  context.window.MapStatus.render({ status_known: true });
  assert.equal(nodes[".status-headline"].textContent, "No pending paper changes");
  assert.equal(attention, false);
});
