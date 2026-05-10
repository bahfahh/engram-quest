// Synapse runtime data layer.
// Loads AI-precomputed anchor recommendations from engram-review/synapse/.
// Pure functions + thin adapter wrappers; runtime has zero AI dependency.

"use strict";

const { srFileName } = require("./helpers");

const SYNAPSE_DIR = "engram-review/synapse";
const STATUS_FILE = `${SYNAPSE_DIR}/_status.json`;
const POOL_DELTA_THRESHOLD = 5;
const POOL_AGE_DAYS_THRESHOLD = 7;
const MASTERED_STABILITY_THRESHOLD = 7;

function defaultStatus() {
  return { enabled: false, reason: "not-generated", masteredPoolSize: 0, generatedAt: null };
}

async function loadSynapseStatus(adapter) {
  try {
    if (!(await adapter.exists(STATUS_FILE))) return defaultStatus();
    const raw = await adapter.read(STATUS_FILE);
    const parsed = JSON.parse(raw);
    return { ...defaultStatus(), ...parsed };
  } catch {
    return defaultStatus();
  }
}

async function loadSynapseForNote(adapter, notePath) {
  if (!notePath) return null;
  const path = `${SYNAPSE_DIR}/${srFileName(notePath)}.json`;
  try {
    if (!(await adapter.exists(path))) return null;
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

// Returns Map<notePath, synapseDoc | null> — null for missing files so callers
// can distinguish "no synapse data for this note" from "feature not loaded".
async function loadSynapseBatch(adapter, notePaths) {
  const result = new Map();
  const unique = [...new Set((notePaths || []).filter(Boolean))];
  await Promise.all(unique.map(async (p) => {
    result.set(p, await loadSynapseForNote(adapter, p));
  }));
  return result;
}

// Anchors listed in userRejected are dropped — the v2 feedback hook reserves
// "<notePath>|<front>" keys; bare "<front>" also matches for legacy entries.
function attachSynapseToCards(cards, synapseByPath) {
  cards.forEach((card) => {
    if (!card || !card.notePath) { if (card) card.synapseAnchors = []; return; }
    const doc = synapseByPath.get(card.notePath);
    if (!doc || !doc.cards) { card.synapseAnchors = []; return; }
    const entry = doc.cards[card.front];
    if (!entry) { card.synapseAnchors = []; return; }
    const rejected = new Set(entry.userRejected || []);
    const anchors = (entry.anchors || []).filter((a) => {
      if (!a || !a.front) return false;
      const key = a.notePath ? `${a.notePath}|${a.front}` : a.front;
      return !rejected.has(key) && !rejected.has(a.front);
    });
    card.synapseAnchors = anchors;
  });
}

async function countMasteredFromSr(adapter) {
  const dir = "engram-review/sr";
  if (!(await adapter.exists(dir))) return 0;
  let listing;
  try { listing = await adapter.list(dir); } catch { return 0; }
  let count = 0;
  for (const file of listing.files || []) {
    if (!file.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await adapter.read(file));
      for (const front of Object.keys(data)) {
        const meta = data[front];
        if (meta && typeof meta.stability === "number" && meta.stability >= MASTERED_STABILITY_THRESHOLD) {
          count++;
        }
      }
    } catch {}
  }
  return count;
}

// Returns { show, reason } so the UI can decide which banner copy to render.
// Reason is also used in dogfood debug logs.
function shouldShowRefreshBanner({ status, currentMastered, now = Date.now(), dismissedAt = 0 }) {
  if (!status || status.enabled !== true) return { show: false, reason: "not-enabled" };
  if (dismissedAt && now - dismissedAt < 24 * 60 * 60 * 1000) return { show: false, reason: "dismissed-recently" };

  const last = status.masteredPoolSize || 0;
  const delta = Math.abs((currentMastered || 0) - last);
  if (delta >= POOL_DELTA_THRESHOLD) return { show: true, reason: "pool-changed", delta };

  const generatedAt = status.generatedAt ? Date.parse(status.generatedAt) : NaN;
  if (Number.isFinite(generatedAt)) {
    const ageDays = (now - generatedAt) / (24 * 60 * 60 * 1000);
    if (ageDays >= POOL_AGE_DAYS_THRESHOLD) return { show: true, reason: "stale", ageDays };
  }
  return { show: false, reason: "fresh" };
}

// Driven by the status.enabled flag written by the AI skill — runtime never
// recomputes the pool gate, so the user must rerun the skill to flip this.
function isSynapseEnabled(status) {
  return !!(status && status.enabled === true);
}

module.exports = {
  SYNAPSE_DIR,
  STATUS_FILE,
  POOL_DELTA_THRESHOLD,
  POOL_AGE_DAYS_THRESHOLD,
  MASTERED_STABILITY_THRESHOLD,
  defaultStatus,
  loadSynapseStatus,
  loadSynapseForNote,
  loadSynapseBatch,
  attachSynapseToCards,
  countMasteredFromSr,
  shouldShowRefreshBanner,
  isSynapseEnabled
};
