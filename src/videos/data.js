"use strict";
// Video Academy data layer. Topics live under engram-quest/videos/{slug}/: a meta.json (title,
// status, the learner's request, the skill-written video list, the plugin-owned progress map)
// plus the mp4 / vtt / poster files the video skill renders. settings.json in the same root holds
// the generation settings the skill reads. The plugin never runs AI: "new topic" only writes a
// pending topic the skill picks up later. Pure of Obsidian UI — every function takes a vault
// adapter so the logic is unit-testable. Contract: doc/開發計劃/影片學院/skills.md §4.

const { safeSlugPart, trashPath } = require("../lessons/data");
const { isLookId, AUTO } = require("./looks");

const VIDEOS_DIR = "engram-quest/videos";
const SETTINGS_PATH = `${VIDEOS_DIR}/settings.json`;

// Encode quality the skill reads (ADR-25): "high" keeps a fixed visual quality and lets the file size
// follow the content; "compact" squeezes each video under 5 MB (Obsidian Sync Standard per-file cap).
// Length is not a setting: the skill sizes each video to its learning objectives.
const QUALITIES = ["high", "compact"];
const NARRATION_LANGS = ["follow", "zh-tw", "en"];
const DEFAULT_SETTINGS = { quality: "high", style: AUTO, narrationLang: "follow", subtitles: true };
// `style` (global preference) and a series' `style` hold a look id from looks.js, or "auto" to let
// the skill match a look to the content. Unknown ids read as "auto" — the skill does the same.
const GOAL_MAX = 40;

async function readJson(adapter, path) {
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/**
 * Clamp raw settings to valid values and stamp the licence state: `pro` tells the skill whether
 * Pro looks may be used (ADR-26). Fields the plugin no longer offers (`length`, `mode`) are dropped.
 */
function normalizeSettings(raw, isPro) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    quality: QUALITIES.includes(s.quality) ? s.quality : DEFAULT_SETTINGS.quality,
    style: isLookId(s.style) ? s.style : DEFAULT_SETTINGS.style,
    narrationLang: NARRATION_LANGS.includes(s.narrationLang) ? s.narrationLang : DEFAULT_SETTINGS.narrationLang,
    subtitles: s.subtitles === undefined ? DEFAULT_SETTINGS.subtitles : !!s.subtitles,
    pro: !!isPro,
  };
}

async function readSettings(adapter, isPro) {
  return normalizeSettings(await readJson(adapter, SETTINGS_PATH), isPro);
}

/**
 * Keep settings.json's `pro` flag in step with the licence, since the skill reads the raw file to
 * decide whether Pro looks may be used. Writes only on a change; a free user with no file needs
 * none (the skill's defaults are already free).
 */
async function syncSettingsLicense(adapter, isPro) {
  const raw = await readJson(adapter, SETTINGS_PATH);
  if (!raw ? !isPro : raw.pro === !!isPro) return false;
  await saveSettings(adapter, raw, isPro);
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
        source: v.source === "import" ? "import" : "skill",
      }))
    : [];
  const req = meta.request && typeof meta.request === "object" ? meta.request : null;
  return {
    title: String(meta.title || (req && req.text) || ""),
    // A topic with no playable video yet is pending no matter what the file claims.
    status: meta.status === "pending" || !videos.some((v) => v.file) ? "pending" : "ready",
    style: isLookId(meta.style) ? meta.style : AUTO,
    request: req
      ? {
          text: String(req.text || ""),
          detail: String(req.detail || ""),
          source: req.source === "general" ? "general" : "notes",
          refs: Array.isArray(req.refs) ? req.refs.map(String) : [],
          createdAt: req.createdAt || null,
        }
      : null,
    note: String(meta.note || ""),
    // Written by the skill (broad subject areas such as "軟體"); drives the shelf's tag filter.
    tags: Array.isArray(meta.tags) ? [...new Set(meta.tags.map((x) => String(x).trim()).filter(Boolean))] : [],
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

/** Shelf filter bucket: "pending" | "new" (nothing watched) | "watching" | "done" (all watched). */
function topicState(meta) {
  if (meta.status === "pending") return "pending";
  const { completed, total } = topicProgress(meta);
  if (total && completed === total) return "done";
  const touched = meta.videos.some((v) => {
    const p = videoProgress(meta, v.id);
    return p.completed || p.position > 0;
  });
  return touched ? "watching" : "new";
}

/** Every tag used across the series, most used first (ties by name): [{ tag, count }]. */
function collectTags(topics) {
  const counts = new Map();
  for (const { meta } of topics) for (const tag of meta.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
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
 * Clean a learner's request. `text` is the goal ("架設網站") and doubles as the series name;
 * `detail` is optional extra context. How to split it into videos is the skill's call.
 * `source` is "notes" (AI picks relevant notes, optionally narrowed to `refs`) or "general".
 */
function cleanRequest({ text, detail = "", source = "notes", refs = [], style = AUTO }) {
  // Cut by code point so an emoji is never split in half.
  const goal = Array.from(String(text || "").trim().replace(/\s+/g, " ")).slice(0, GOAL_MAX).join("");
  if (!goal) throw new Error("empty request");
  const useNotes = source !== "general";
  return {
    goal,
    style: isLookId(style) ? style : AUTO,
    request: {
      text: goal,
      detail: String(detail || "").trim(),
      source: useNotes ? "notes" : "general",
      refs: useNotes ? [...new Set(refs.map(String))] : [],
    },
  };
}

/** Record a learner's request as a pending series the video skill picks up on its next run. */
async function createRequest(adapter, input) {
  const { goal, style, request } = cleanRequest(input);
  let slug = safeSlugPart(goal, `topic-${Date.now()}`);
  if (await adapter.exists(`${VIDEOS_DIR}/${slug}/meta.json`)) slug = `${slug}-${Date.now()}`;
  const now = new Date().toISOString();
  const meta = {
    title: goal,
    status: "pending",
    style,
    request: { ...request, createdAt: now },
    starred: false,
    createdAt: now,
    videos: [],
    progress: {},
  };
  await adapter.mkdir(`${VIDEOS_DIR}/${slug}`).catch(() => {});
  await adapter.write(`${VIDEOS_DIR}/${slug}/meta.json`, JSON.stringify(meta, null, 2));
  return { slug, meta: normalizeTopic(meta) };
}

/**
 * Edit a still-pending series (read-merge-write; the slug stays). `base` is the normalised meta the
 * form was opened with: if the file's title or style has changed since (the skill got there first),
 * nothing is written. The style is only written when the user changed it, so a skill-set value the
 * form can't show survives. Returns the normalised meta, or null when the series is gone, no
 * longer pending, or changed underneath the form.
 */
async function updateRequest(adapter, slug, input, base) {
  const path = `${VIDEOS_DIR}/${slug}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!raw || typeof raw !== "object" || raw.status !== "pending") return null;
  const now = normalizeTopic(raw);
  if (now.status !== "pending" || (base && (now.title !== base.title || now.style !== base.style))) return null;
  const { goal, style, request } = cleanRequest(input);
  const prev = raw.request && typeof raw.request === "object" ? raw.request : {};
  raw.title = goal;
  // `style` absent = the learner didn't touch the menu; keep whatever the series holds.
  if (input.style !== undefined && (!base || style !== base.style)) raw.style = style;
  raw.request = { ...prev, ...request };
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return normalizeTopic(raw);
}

/** Set a series' style for the videos the skill makes next ("auto" = let the skill decide). */
async function setTopicStyle(adapter, slug, style) {
  if (!isLookId(style)) throw new Error(`invalid style: ${style}`);
  const path = `${VIDEOS_DIR}/${slug}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!raw || typeof raw !== "object") return false;
  raw.style = style;
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return true;
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
  QUALITIES,
  NARRATION_LANGS,
  DEFAULT_SETTINGS,
  GOAL_MAX,
  normalizeSettings,
  readSettings,
  saveSettings,
  syncSettingsLicense,
  normalizeTopic,
  videoProgress,
  topicProgress,
  topicState,
  collectTags,
  listTopics,
  continueWatching,
  saveProgress,
  createRequest,
  updateRequest,
  setTopicStyle,
  deleteTopic,
};
