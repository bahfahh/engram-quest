"use strict";
// Video Academy data layer. Topics live under engram-quest/videos/{slug}/: a meta.json (title,
// status, the learner's request, the skill-written video list, the plugin-owned progress map)
// plus the mp4 / vtt / poster files the video skill renders. settings.json in the same root holds
// the generation settings the skill reads. The plugin never runs AI: "new topic" only writes a
// pending topic the skill picks up later. Pure of Obsidian UI — every function takes a vault
// adapter so the logic is unit-testable. Contract: doc/開發計劃/影片學院/skills.md §4.

const { safeSlugPart, trashPath } = require("../lessons/data");

const VIDEOS_DIR = "engram-quest/videos";
const SETTINGS_PATH = `${VIDEOS_DIR}/settings.json`;

const MODES = ["basic", "polished", "principle", "auto"];
const PRO_MODES = new Set(["polished", "principle", "auto"]);
const LENGTHS = [30, 60, 90];
const STYLES = ["auto", "fast", "system", "visual", "drawn"];
const NARRATION_LANGS = ["follow", "zh-tw", "en"];
const DEFAULT_SETTINGS = { mode: "basic", length: 60, style: "auto", narrationLang: "follow", subtitles: true };

async function readJson(adapter, path) {
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/**
 * Clamp raw settings to valid values. Free users can't hold a Pro mode (a lapsed licence falls
 * back to "basic"); "polished" is fixed at 60 s and "auto" leaves length to the AI (null).
 */
function normalizeSettings(raw, isPro) {
  const s = raw && typeof raw === "object" ? raw : {};
  let mode = MODES.includes(s.mode) ? s.mode : DEFAULT_SETTINGS.mode;
  if (!isPro && PRO_MODES.has(mode)) mode = "basic";
  let length = LENGTHS.includes(Number(s.length)) ? Number(s.length) : DEFAULT_SETTINGS.length;
  if (mode === "polished") length = 60;
  if (mode === "auto") length = null;
  return {
    mode,
    length,
    style: STYLES.includes(s.style) ? s.style : DEFAULT_SETTINGS.style,
    narrationLang: NARRATION_LANGS.includes(s.narrationLang) ? s.narrationLang : DEFAULT_SETTINGS.narrationLang,
    subtitles: s.subtitles === undefined ? DEFAULT_SETTINGS.subtitles : !!s.subtitles,
  };
}

async function readSettings(adapter, isPro) {
  return normalizeSettings(await readJson(adapter, SETTINGS_PATH), isPro);
}

/**
 * Keep settings.json honest for the video skill, which reads the raw file: once the licence has
 * lapsed, a stored Pro mode is rewritten to basic (ADR-04). No-op for Pro users or no file.
 */
async function enforceSettingsTier(adapter, isPro) {
  if (isPro) return false;
  const raw = await readJson(adapter, SETTINGS_PATH);
  if (!raw || !PRO_MODES.has(raw.mode)) return false;
  await saveSettings(adapter, raw, false);
  return true;
}

async function saveSettings(adapter, settings, isPro) {
  const next = normalizeSettings(settings, isPro);
  await adapter.mkdir(VIDEOS_DIR).catch(() => {});
  await adapter.write(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}

/** Fill in missing meta fields so renderers never need null checks. */
function normalizeTopic(meta) {
  if (!meta || typeof meta !== "object") return null;
  const videos = Array.isArray(meta.videos)
    ? meta.videos.filter((v) => v && v.id).map((v) => ({
        id: String(v.id),
        title: String(v.title || v.file || ""),
        file: v.file ? String(v.file) : null,
        subtitles: v.subtitles ? String(v.subtitles) : null,
        poster: v.poster ? String(v.poster) : null,
        duration: Number(v.duration) > 0 ? Number(v.duration) : null,
        style: String(v.style || ""),
        mode: String(v.mode || ""),
        source: v.source === "import" ? "import" : "skill",
      }))
    : [];
  const req = meta.request && typeof meta.request === "object" ? meta.request : null;
  return {
    title: String(meta.title || (req && req.text) || ""),
    // A topic with no playable video yet is pending no matter what the file claims.
    status: meta.status === "pending" || !videos.some((v) => v.file) ? "pending" : "ready",
    request: req
      ? {
          text: String(req.text || ""),
          source: req.source === "general" ? "general" : "notes",
          refs: Array.isArray(req.refs) ? req.refs.map(String) : [],
          createdAt: req.createdAt || null,
        }
      : null,
    note: String(meta.note || ""),
    sources: Array.isArray(meta.sources) ? meta.sources.map(String) : [],
    starred: !!meta.starred,
    createdAt: meta.createdAt || (req && req.createdAt) || null,
    videos,
    progress: meta.progress && typeof meta.progress === "object" ? meta.progress : {},
  };
}

/** Progress for one video — always a full object. */
function videoProgress(meta, videoId) {
  const p = (meta && meta.progress && meta.progress[videoId]) || {};
  return {
    position: Number(p.position) > 0 ? Number(p.position) : 0,
    completed: !!p.completed,
    lastViewed: p.lastViewed || null,
  };
}

function topicProgress(meta) {
  const playable = meta.videos.filter((v) => v.file);
  const completed = playable.filter((v) => videoProgress(meta, v.id).completed).length;
  return { completed, total: playable.length };
}

/** Latest activity timestamp of a topic: newest lastViewed, else creation time. */
function topicActivity(meta) {
  let latest = String(meta.createdAt || "");
  for (const v of meta.videos) {
    const seen = String(videoProgress(meta, v.id).lastViewed || "");
    if (seen > latest) latest = seen;
  }
  return latest;
}

/** Scan topic folders. Returns [{ slug, meta }]: starred first, then most recent activity. */
async function listTopics(adapter) {
  let listing = null;
  try {
    listing = await adapter.list(VIDEOS_DIR);
  } catch {
    listing = null;
  }
  if (!listing || !Array.isArray(listing.folders)) return [];
  const loaded = await Promise.all(
    listing.folders.map(async (folderPath) => {
      const slug = String(folderPath).split("/").pop();
      if (!slug) return null;
      const meta = normalizeTopic(await readJson(adapter, `${VIDEOS_DIR}/${slug}/meta.json`));
      return meta ? { slug, meta } : null;
    })
  );
  const topics = loaded.filter(Boolean);
  topics.sort((a, b) => {
    if (a.meta.starred !== b.meta.starred) return a.meta.starred ? -1 : 1;
    return topicActivity(b.meta).localeCompare(topicActivity(a.meta));
  });
  return topics;
}

/**
 * The most recently watched, unfinished, playable video across all topics — the shelf's
 * "continue watching" hero. A video only opened (position 0) doesn't count. Null when none.
 */
function continueWatching(topics) {
  let best = null;
  for (const { slug, meta } of topics) {
    for (const video of meta.videos) {
      if (!video.file) continue;
      const p = videoProgress(meta, video.id);
      if (!p.lastViewed || p.completed || p.position <= 0) continue;
      if (!best || String(p.lastViewed) > String(best.progress.lastViewed)) best = { slug, meta, video, progress: p };
    }
  }
  return best;
}

/**
 * Patch one video's progress (read → merge → write) without touching skill-owned fields.
 * Always stamps lastViewed. Returns the updated progress entry, or null if the topic is gone.
 */
async function saveProgress(adapter, slug, videoId, patch = {}) {
  const path = `${VIDEOS_DIR}/${slug}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!raw || typeof raw !== "object") return null;
  const progress = raw.progress && typeof raw.progress === "object" ? raw.progress : {};
  const next = { ...videoProgress(raw, videoId) };
  if (patch.position !== undefined) next.position = Math.max(0, Math.round(Number(patch.position) || 0));
  if (patch.completed !== undefined) next.completed = !!patch.completed;
  next.lastViewed = new Date().toISOString();
  progress[videoId] = next;
  raw.progress = progress;
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return next;
}

/**
 * Record a learner's request as a pending topic the video skill picks up on its next run.
 * `source` is "notes" (AI picks relevant notes, optionally narrowed to `refs`) or "general".
 */
async function createRequest(adapter, { text, source = "notes", refs = [] }) {
  const clean = String(text || "").trim();
  if (!clean) throw new Error("empty request");
  let slug = safeSlugPart(clean, `topic-${Date.now()}`);
  if (await adapter.exists(`${VIDEOS_DIR}/${slug}/meta.json`)) slug = `${slug}-${Date.now()}`;
  const now = new Date().toISOString();
  const useNotes = source !== "general";
  const meta = {
    title: clean,
    status: "pending",
    request: { text: clean, source: useNotes ? "notes" : "general", refs: useNotes ? [...new Set(refs.map(String))] : [], createdAt: now },
    starred: false,
    createdAt: now,
    videos: [],
    progress: {},
  };
  await adapter.mkdir(`${VIDEOS_DIR}/${slug}`).catch(() => {});
  await adapter.write(`${VIDEOS_DIR}/${slug}/meta.json`, JSON.stringify(meta, null, 2));
  return { slug, meta: normalizeTopic(meta) };
}

/** Trash every file under dir (subfolders included) except `skip`. True only if all were trashed. */
async function trashTree(adapter, dir, skip) {
  let listing = null;
  try { listing = await adapter.list(dir); } catch { return true; }
  let ok = true;
  for (const file of listing.files || []) if (file !== skip) ok = (await trashPath(adapter, file)) && ok;
  for (const sub of listing.folders || []) ok = (await trashTree(adapter, sub, skip)) && ok;
  return ok;
}

/**
 * Delete a topic: trash every file (subfolders included), meta.json last, then drop the now-empty
 * folders. On any trash failure it stops with meta.json still in place, so the topic stays visible
 * and nothing is removed without going to the trash. Returns whether the topic is fully gone.
 */
async function deleteTopic(adapter, slug) {
  if (!slug || /[\\/]|^\.+$/.test(slug)) throw new Error(`invalid topic slug: ${slug}`);
  const dir = `${VIDEOS_DIR}/${slug}`;
  const metaFile = `${dir}/meta.json`;
  if (!(await trashTree(adapter, dir, metaFile)) || !(await trashPath(adapter, metaFile))) return false;
  try {
    if (typeof adapter.rmdir === "function") await adapter.rmdir(dir, true);
  } catch (e) { console.warn("EngramQuest: video topic folder cleanup failed", e); }
  return true;
}

module.exports = {
  VIDEOS_DIR,
  SETTINGS_PATH,
  MODES,
  PRO_MODES,
  LENGTHS,
  STYLES,
  NARRATION_LANGS,
  DEFAULT_SETTINGS,
  normalizeSettings,
  readSettings,
  saveSettings,
  enforceSettingsTier,
  normalizeTopic,
  videoProgress,
  topicProgress,
  listTopics,
  continueWatching,
  saveProgress,
  createRequest,
  deleteTopic,
};
