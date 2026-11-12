"use strict";
// Explainer data layer (Pro). Reads/writes the plain-language explainer pages that live under
// engram-quest/explainer/. An explainer is a support artifact for a review-deck flashcard — it has
// NO spaced-repetition schedule of its own (the original card keeps its FSRS in engram-review/);
// the AI skill measures an explainer's success by the original card's later reviews. Pure of
// Obsidian UI — every function takes a vault adapter so the logic is unit-testable. See
// debug/newissue/explainer-feature/DESIGN-explainer.md for the architecture.

const EXPLAINER_DIR = "engram-quest/explainer";
const META_DIR = "engram-quest/explainer/meta";
const QUEUE_PATH = "engram-quest/explainer/queue.json";
// Plugin-owned reading state (viewed/starred/completed per page id). Kept OUT of meta/*.json on
// purpose — the skill rewrites meta files on regeneration, and a separate plugin-owned file means
// no read-merge-write contract is needed (same split as Quest Map's engram-quest/state/).
const STATE_PATH = "engram-quest/explainer/state.json";

async function readJson(adapter, path) {
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/**
 * Scan all explainer pages from engram-quest/explainer/meta/*.json.
 * Returns { pages, total }. `pages` is sorted newest-first (created desc), then by title, so the
 * Hub list surfaces what the user just generated.
 */
async function scanExplainers(adapter) {
  const result = { pages: [], total: 0 };
  let listing = null;
  try {
    listing = await adapter.list(META_DIR);
  } catch {
    listing = null;
  }
  if (!listing || !Array.isArray(listing.files)) return result;

  const jsonFiles = listing.files.filter((f) => f.endsWith(".json"));
  const loaded = await Promise.all(jsonFiles.map((f) => readJson(adapter, f)));
  for (const page of loaded) {
    if (!page || !page.id) continue;
    result.pages.push(page);
    result.total++;
  }
  result.pages.sort((a, b) => {
    const byDate = String(b.created || "").localeCompare(String(a.created || ""));
    return byDate || String(a.title || a.id).localeCompare(String(b.title || b.id));
  });
  return result;
}

/** Group scanned pages by deck for the Hub list. Returns [{ name, pages }] sorted by name. */
function groupExplainersByDeck(pages) {
  const map = {};
  for (const page of pages) {
    const name = String(page.deck || "Explainer");
    if (!map[name]) map[name] = { name, pages: [] };
    map[name].pages.push(page);
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

/** Read the plugin-owned reading state map: { [id]: { viewed, lastViewed, starred, completed } }. */
async function readState(adapter) {
  const data = await readJson(adapter, STATE_PATH);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

/**
 * Put a page's saved reading state on the page itself (`_viewed`, `_starred`, `_completed`), the
 * form the viewer reads. Every place that opens the viewer does this first: without it the viewer
 * shows a starred, finished page as neither, and its toggles then flip the saved values the wrong way.
 */
function applyReadingState(page, state) {
  const saved = (state && state[page.id]) || {};
  page._viewed = !!saved.viewed;
  page._starred = !!saved.starred;
  page._completed = !!saved.completed;
  return page;
}

async function writeState(adapter, state) {
  await adapter.mkdir(EXPLAINER_DIR).catch(() => {});
  await adapter.write(STATE_PATH, JSON.stringify(state, null, 2));
}

/** Auto-mark a page as viewed (called by the viewer on open). Returns the page's state entry. */
async function markViewed(adapter, id) {
  if (!id) return null;
  const state = await readState(adapter);
  const entry = state[id] || (state[id] = {});
  entry.viewed = true;
  entry.lastViewed = new Date().toISOString().slice(0, 10);
  await writeState(adapter, state);
  return entry;
}

/** Toggle a manual flag ("starred" | "completed"). Returns the new boolean value. */
async function toggleStateFlag(adapter, id, flag) {
  if (!id || (flag !== "starred" && flag !== "completed")) return false;
  const state = await readState(adapter);
  const entry = state[id] || (state[id] = {});
  entry[flag] = !entry[flag];
  await writeState(adapter, state);
  return entry[flag];
}

async function readQueue(adapter) {
  const data = await readJson(adapter, QUEUE_PATH);
  if (data && Array.isArray(data.entries)) return data;
  return { entries: [] };
}

async function writeQueue(adapter, queue) {
  await adapter.mkdir(EXPLAINER_DIR).catch(() => {});
  await adapter.write(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

/**
 * Mark a flashcard for explanation. Appends a pending entry to the queue, de-duplicated by
 * source+question. This only records intent — the AI Explainer skill reads the queue later,
 * diagnoses why the card failed, and generates the page. Returns { added, pending }.
 */
async function addToQueue(adapter, { source, q, a, deck }) {
  const queue = await readQueue(adapter);
  const exists = queue.entries.some(
    (e) => e.source === source && String(e.q || "") === String(q || "")
  );
  if (!exists) {
    queue.entries.push({
      status: "pending",
      source: source || null,
      q: q || "",
      a: a || "",
      deck: deck || null,
      markedAt: new Date().toISOString(),
      regenerate: false,
      explainerId: null,
    });
    await writeQueue(adapter, queue);
  }
  const pending = queue.entries.filter((e) => e.status === "pending").length;
  return { added: !exists, pending };
}

/**
 * Ask the skill to rewrite an existing page, keeping its id. `card` is the spec's own card when it
 * could be read; otherwise the skill falls back to the page's meta and source note.
 */
async function queueRegenerate(adapter, page, card) {
  const queue = await readQueue(adapter);
  if (queue.entries.some((e) => e.status === "pending" && e.explainerId === page.id)) return;
  const source = page.sourceCard || {};
  queue.entries.push({
    status: "pending",
    source: source.note || null,
    q: (card && card.q) || source.front || "",
    a: (card && card.a) || "",
    deck: page.deck || null,
    markedAt: new Date().toISOString(),
    regenerate: true,
    explainerId: page.id,
  });
  await writeQueue(adapter, queue);
}

/** True if a given source+question is already queued (pending) — for UI state. */
function isQueued(queue, source, q) {
  if (!queue || !Array.isArray(queue.entries)) return false;
  return queue.entries.some(
    (e) => e.source === source && String(e.q || "") === String(q || "") && e.status === "pending"
  );
}

/**
 * Move a single file to trash. Prefers the OS trash (trashSystem), falls back to the vault-local
 * .trash (trashLocal), then to a permanent remove — mirroring Obsidian's own trashFile order.
 * Returns true when the file is gone (including already-absent), false when every method failed.
 */
async function trashPath(adapter, path) {
  try {
    if (adapter.exists && !(await adapter.exists(path))) return true;
  } catch { /* can't check existence — try to trash anyway */ }
  try {
    if (typeof adapter.trashSystem === "function") {
      const ok = await adapter.trashSystem(path);
      if (ok) return true;
    }
  } catch (e) { console.warn("EngramQuest: explainer trashSystem failed", e); }
  try {
    if (typeof adapter.trashLocal === "function") { await adapter.trashLocal(path); return true; }
  } catch (e) { console.warn("EngramQuest: explainer trashLocal failed", e); }
  try {
    if (typeof adapter.remove === "function") { await adapter.remove(path); return true; }
  } catch (e) { console.warn("EngramQuest: explainer remove failed", e); }
  return false;
}

/**
 * Delete an explainer: trash its metadata (meta/{id}.json) and its page ({id}.html and/or
 * {id}.spec.json), then drop any queue entry that produced it. The meta file is the canonical record, so its removal gates the
 * rest — if it can't be trashed we throw before touching anything else, leaving a consistent
 * on-disk state. An orphaned html with no meta is invisible to the scan and harmless.
 */
async function deleteExplainer(adapter, id) {
  if (!id) return;
  const metaRemoved = await trashPath(adapter, `${META_DIR}/${id}.json`);
  if (!metaRemoved) throw new Error(`EngramQuest: could not delete explainer "${id}"`);
  await trashPath(adapter, `${EXPLAINER_DIR}/${id}.html`);
  await trashPath(adapter, `${EXPLAINER_DIR}/${id}.spec.json`);
  try {
    const queue = await readQueue(adapter);
    const before = queue.entries.length;
    queue.entries = queue.entries.filter((e) => e.explainerId !== id);
    if (queue.entries.length !== before) await writeQueue(adapter, queue);
  } catch (e) { console.warn("EngramQuest: explainer queue cleanup failed", e); }
  try {
    const state = await readState(adapter);
    if (state[id]) { delete state[id]; await writeState(adapter, state); }
  } catch (e) { console.warn("EngramQuest: explainer state cleanup failed", e); }
}

module.exports = {
  EXPLAINER_DIR,
  META_DIR,
  QUEUE_PATH,
  STATE_PATH,
  scanExplainers,
  groupExplainersByDeck,
  readState,
  applyReadingState,
  writeState,
  markViewed,
  toggleStateFlag,
  readQueue,
  writeQueue,
  addToQueue,
  queueRegenerate,
  isQueued,
  trashPath,
  deleteExplainer,
};
