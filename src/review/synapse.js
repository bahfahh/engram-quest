// Synapse runtime data layer.
// Loads the links the synapse skill wrote under engram-review/synapse/ (mastered-card anchors and
// relations to other content), plus the content the relation graph resolves them against.
// Pure functions + thin adapter wrappers; runtime has zero AI dependency and writes nothing.

"use strict";

const { srFileName, mapLimit, loadSrData } = require("./helpers");
const { listCourses } = require("../lessons/data");
const { listTopics, readEpisodic } = require("../videos/data");
const { scanExplainers, readState } = require("../explainer/data");

const SYNAPSE_DIR = "engram-review/synapse";
const RECALL_TOPICS_DIR = "engram-quest/episodic-review/topics";
const STATUS_FILE = `${SYNAPSE_DIR}/_status.json`;
const POOL_DELTA_THRESHOLD = 15;
const POOL_AGE_DAYS_THRESHOLD = 28;
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

// Puts each card's entry on the card: synapseAnchors (mastered cards), synapseRelations (other
// content; optional in the file) and synapseRejected. Links listed in userRejected are dropped:
// an anchor by "<notePath>|<front>" (bare "<front>" also matches for legacy entries), a relation
// by "<type>|<ref>".
function attachSynapseToCards(cards, synapseByPath) {
  cards.forEach((card) => {
    if (!card) return;
    card.synapseAnchors = [];
    card.synapseRelations = [];
    card.synapseRejected = [];
    const doc = card.notePath ? synapseByPath.get(card.notePath) : null;
    const entry = doc && doc.cards ? doc.cards[card.front] : null;
    if (!entry) return;
    const rejected = new Set(Array.isArray(entry.userRejected) ? entry.userRejected : []);
    card.synapseRejected = [...rejected];
    card.synapseAnchors = (Array.isArray(entry.anchors) ? entry.anchors : []).filter((a) => {
      if (!a || !a.front) return false;
      const key = a.notePath ? `${a.notePath}|${a.front}` : a.front;
      return !rejected.has(key) && !rejected.has(a.front);
    });
    card.synapseRelations = (Array.isArray(entry.relations) ? entry.relations : []).filter((r) =>
      r && typeof r.type === "string" && typeof r.ref === "string" && r.ref && !rejected.has(`${r.type}|${r.ref}`));
  });
}

/**
 * Everything the relation graph resolves a card's links against, read once per review session and
 * only when the user first opens ⚡: lessons, videos (recall films included), Deep Dive pages with
 * their reading state, and recall topics. `topicDecks` maps a recall topic id to the card files made
 * from it; their schedules give the topic its learning state. A missing folder is an empty list.
 * The result feeds buildContentIndex in synapse-graph.js.
 */
async function loadSynapseSources(adapter, topicDecks = new Map()) {
  const or = (promise, fallback) => promise.catch((e) => { console.warn("synapse: content load failed", e); return fallback; });
  const [courses, teaching, episodic, scan, explainerState, recallTopics] = await Promise.all([
    or(listCourses(adapter), []),
    or(listTopics(adapter), []),
    or(readEpisodic(adapter), null),
    or(scanExplainers(adapter), { pages: [] }),
    or(readState(adapter), {}),
    or(loadRecallTopics(adapter), []),
  ]);
  const topicSr = {};
  await mapLimit(recallTopics.filter((topic) => topicDecks.has(topic.id)), 4, async (topic) => {
    const stabilities = [];
    for (const deck of topicDecks.get(topic.id)) {
      const sr = await loadSrData(adapter, deck);
      for (const record of Object.values(sr)) if (record && typeof record.stability === "number") stabilities.push(record.stability);
    }
    topicSr[topic.id] = stabilities;
  });
  return { courses, series: episodic ? [...teaching, episodic] : teaching, explainers: scan.pages, explainerState, recallTopics, topicSr };
}

async function loadRecallTopics(adapter) {
  let listing;
  try { listing = await adapter.list(RECALL_TOPICS_DIR); } catch { return []; }
  const topics = await mapLimit((listing && listing.folders) || [], 8, async (folder) => {
    try { return JSON.parse(await adapter.read(`${folder}/topic.json`)); } catch { return null; }
  });
  return topics.filter((topic) => topic && topic.id);
}

async function countMasteredFromSr(adapter) {
  const dir = "engram-review/sr";
  if (!(await adapter.exists(dir))) return 0;
  let listing;
  try { listing = await adapter.list(dir); } catch { return 0; }
  // Parallel reads (bounded) — this runs on every Review tab render for Pro users, and the
  // sr/ folder holds one JSON per note, so sequential reads got slow on mobile as decks grew.
  const jsonFiles = (listing.files || []).filter((f) => f.endsWith(".json"));
  const counts = await mapLimit(jsonFiles, 8, async (file) => {
    try {
      const data = JSON.parse(await adapter.read(file));
      let n = 0;
      for (const front of Object.keys(data)) {
        const meta = data[front];
        if (meta && typeof meta.stability === "number" && meta.stability >= MASTERED_STABILITY_THRESHOLD) {
          n++;
        }
      }
      return n;
    } catch { return 0; }
  });
  return counts.reduce((a, b) => a + b, 0);
}

// Returns { show, reason } so the UI can decide which banner copy to render.
// Reason is also used in dogfood debug logs.
function shouldShowRefreshBanner({ status, currentMastered, now = Date.now(), dismissedAt = 0 }) {
  if (!status || status.enabled !== true) return { show: false, reason: "not-enabled" };
  if (dismissedAt && now - dismissedAt < 120 * 60 * 60 * 1000) return { show: false, reason: "dismissed-recently" };

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
  loadSynapseSources,
  countMasteredFromSr,
  shouldShowRefreshBanner,
  isSynapseEnabled
};
