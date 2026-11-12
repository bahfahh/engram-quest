// Synapse runtime data layer.
// Loads the links the synapse skill wrote under engram-review/synapse/ (mastered-card anchors and
// relations to other content), plus the content the relation graph resolves them against.
// Pure functions + thin adapter wrappers; runtime has zero AI dependency and writes nothing.

"use strict";

const { srFileName, mapLimit, loadSrData, AI_CARDS_DIR } = require("./helpers");
const { LESSONS_DIR, normalizeMeta } = require("../lessons/data");
const { VIDEOS_DIR, normalizeTopic } = require("../videos/data");
const { META_DIR: EXPLAINER_META_DIR, readState } = require("../explainer/data");

const SYNAPSE_DIR = "engram-review/synapse";
const RECALL_TOPICS_DIR = "engram-quest/episodic-review/topics";
const READS = 8; // content files read at once while the index is built
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
 * their reading state, and recall topics with the schedule of the cards made from them (a topic's
 * learning state). Everything goes through the adapter: these files are written outside Obsidian
 * and the vault index can lag behind them. A missing folder is an empty list.
 * The result feeds buildContentIndex in synapse-graph.js.
 */
async function loadSynapseSources(adapter) {
  const folderName = (path) => String(path).split("/").pop();
  const metas = async (dir, normalise) => {
    const found = await mapLimit((await listDir(adapter, dir)).folders, READS, async (folder) => {
      const meta = normalise(await readJson(adapter, `${folder}/meta.json`));
      return meta ? { slug: folderName(folder), meta } : null;
    });
    return found.filter(Boolean);
  };
  // One kind of content after another, each with a few reads in flight: on a phone every read is a
  // native-bridge hop, and this runs while the user is looking at the card.
  const courses = await metas(LESSONS_DIR, normalizeMeta);
  const series = await metas(VIDEOS_DIR, normalizeTopic);
  const pageFiles = (await listDir(adapter, EXPLAINER_META_DIR)).files.filter((file) => file.endsWith(".json"));
  const explainers = (await mapLimit(pageFiles, READS, (file) => readJson(adapter, file))).filter((page) => page && page.id);
  const explainerState = await readState(adapter);
  // A relation names a recall topic by its folder, so that is the id used here.
  const recallTopics = (await mapLimit((await listDir(adapter, RECALL_TOPICS_DIR)).folders, READS, async (folder) => {
    const topic = await readJson(adapter, `${folder}/topic.json`);
    return topic && typeof topic === "object" && !Array.isArray(topic) ? { ...topic, id: folderName(folder) } : null;
  })).filter(Boolean);

  // The cards made from a topic live in `ai-cards/<prefix>-<title>.md` (the episodic-review skill's
  // build_pack.py); the file list is enough to find them, and their schedule is keyed by card front.
  const decks = recallTopics.length ? (await listDir(adapter, AI_CARDS_DIR)).files : [];
  const topicSr = {};
  await mapLimit(recallTopics, READS, async (topic) => {
    const deck = topic.title ? decks.find((path) => path.endsWith(`-${String(topic.title).replace(/[\\/:*?"<>|]/g, " ")}.md`)) : null;
    if (!deck) return;
    const sr = await loadSrData(adapter, deck);
    const fronts = new Set((Array.isArray(topic.cards) ? topic.cards : []).map((card) => card && card.q).filter(Boolean));
    topicSr[topic.id] = Object.entries(sr && typeof sr === "object" ? sr : {})
      .filter(([front, record]) => (!fronts.size || fronts.has(front)) && record && typeof record.stability === "number")
      .map(([, record]) => record.stability);
  });
  return { courses, series, explainers, explainerState, recallTopics, topicSr };
}

// What is directly under `dir`. A folder that is not there holds nothing; one that exists but cannot
// be listed is a real failure and is left to throw, so the caller does not mistake it for "no content".
async function listDir(adapter, dir) {
  if (!(await adapter.exists(dir))) return { files: [], folders: [] };
  const listing = await adapter.list(dir);
  return { files: listing.files || [], folders: listing.folders || [] };
}

// One unreadable or malformed file is skipped; it never takes the rest of the content with it.
async function readJson(adapter, path) {
  try { return JSON.parse(await adapter.read(path)); } catch { return null; }
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
