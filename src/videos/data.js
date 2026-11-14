"use strict";
// Video Academy data layer. Topics live under engram-quest/videos/{slug}/: a meta.json (title,
// status, the learner's request, the skill-written video list, the plugin-owned progress map)
// plus the mp4 / vtt / poster files the video skill renders. settings.json in the same root holds
// the generation settings the skill reads. The plugin never runs AI: "new topic" only writes a
// pending topic the skill picks up later. Pure of Obsidian UI — every function takes a vault
// adapter so the logic is unit-testable. Contract: doc/features/video-academy/contract.md.

const { safeSlugPart, trashPath } = require("../lessons/data");

const VIDEOS_DIR = "engram-quest/videos";
const SETTINGS_PATH = `${VIDEOS_DIR}/settings.json`;
const EPISODIC_SLUG = "episodic-recall";

// Delivery quality the skill reads (ADR-32): "high" is 1080p, "compact" a 720p copy.
// Teaching-video length is not a setting: the skill sizes each video to its learning objectives.
const QUALITIES = ["high", "compact"];
const NARRATION_LANGS = ["follow", "zh-tw", "en"];
const VOICE_ENGINES = ["auto", "edge", "gemini", "azure", "custom"];
const EPISODIC_LENGTHS = ["short", "medium", "long"];
const SERIES_STATUSES = ["pending", "making", "ready", "failed"];
const DEFAULT_TEACHER = "nico";
const DEFAULT_SETTINGS = { quality: "high", narrationLang: "follow", subtitles: true, episodicLength: "medium" };
const GOAL_MAX = 40;
const PERIOD_RE = /^\d{4}-\d{2}(\.\.\d{4}-\d{2})?$/;
const isObject = (x) => !!x && typeof x === "object" && !Array.isArray(x);

async function readJson(adapter, path) {
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/**
 * A file's JSON, or null when it doesn't exist. Throws when it exists but can't be read, so a write
 * built on the result never replaces data that merely failed to load (a sync conflict, a locked file).
 */
async function readExisting(adapter, path) {
  if (!(await adapter.exists(path))) return null;
  return JSON.parse(await adapter.read(path));
}

/**
 * Clamp raw settings to valid values and stamp the licence state: `pro` tells the skill which
 * teachers it may use. Fields the plugin doesn't know are kept, so a save never wipes what the skill
 * or a newer version added; only retired fields (`style`, `length`, `mode`) are dropped.
 */
function normalizeSettings(raw, isPro) {
  const { style: _style, length: _length, mode: _mode, ...rest } = isObject(raw) ? raw : {};
  const cast = isObject(rest.cast) ? rest.cast : {};
  const course = isObject(rest.course) ? rest.course : {};
  const voice = isObject(rest.voice) ? rest.voice : {};
  return {
    ...rest,
    quality: QUALITIES.includes(rest.quality) ? rest.quality : DEFAULT_SETTINGS.quality,
    narrationLang: NARRATION_LANGS.includes(rest.narrationLang) ? rest.narrationLang : DEFAULT_SETTINGS.narrationLang,
    subtitles: rest.subtitles === undefined ? DEFAULT_SETTINGS.subtitles : !!rest.subtitles,
    episodicLength: EPISODIC_LENGTHS.includes(rest.episodicLength) ? rest.episodicLength : DEFAULT_SETTINGS.episodicLength,
    cast: { ...cast, teacher: typeof cast.teacher === "string" && cast.teacher ? cast.teacher : DEFAULT_TEACHER, variants: isObject(cast.variants) ? cast.variants : {} },
    course: { ...course, off: Array.isArray(course.off) ? [...new Set(course.off.map(String))] : [] },
    voice: { ...voice, engine: VOICE_ENGINES.includes(voice.engine) ? voice.engine : "auto" },
    pro: !!isPro,
  };
}

async function readSettings(adapter, isPro) {
  return normalizeSettings(await readJson(adapter, SETTINGS_PATH), isPro);
}

/**
 * Keep settings.json's `pro` flag in step with the licence, since the skill reads the raw file to
 * decide which teachers it may use. Writes only on a change; a free user with no file needs
 * none (the skill's defaults are already free).
 */
async function syncSettingsLicense(adapter, isPro) {
  const raw = await readExisting(adapter, SETTINGS_PATH);
  if (!raw ? !isPro : raw.pro === !!isPro) return false;
  await saveSettings(adapter, raw, isPro);
  return true;
}

async function saveSettings(adapter, settings, isPro) {
  await readExisting(adapter, SETTINGS_PATH);
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
        cast: isObject(v.cast) && v.cast.teacher ? { teacher: String(v.cast.teacher), skin: v.cast.skin ? String(v.cast.skin) : null, variant: v.cast.variant ? String(v.cast.variant) : null } : null,
        cards: typeof v.cards === "string" && v.cards ? v.cards : null,
        credits: String(v.credits || ""),
        period: v.period ? String(v.period) : null,
        length: EPISODIC_LENGTHS.includes(v.length) ? v.length : null,
        createdAt: v.createdAt || null,
        topics: Array.isArray(v.topics) ? v.topics.filter((x) => x && x.title && Number.isFinite(Number(x.from))).map((x) => ({ title: String(x.title), from: Number(x.from), to: Number.isFinite(Number(x.to)) ? Number(x.to) : null })) : [],
        notTaken: Array.isArray(v.notTaken) ? v.notTaken.map(String).filter(Boolean) : [],
      }))
    : [];
  const req = meta.request && typeof meta.request === "object" ? meta.request : null;
  return {
    title: String(meta.title || (req && req.text) || ""),
    status: seriesStatus(meta.status, videos),
    error: String(meta.error || ""),
    kind: String(meta.kind || ""),
    cast: isObject(meta.cast) && meta.cast.teacher ? { teacher: String(meta.cast.teacher) } : null,
    request: req
      ? {
          text: String(req.text || ""),
          detail: String(req.detail || ""),
          source: req.source === "general" ? "general" : "notes",
          refs: Array.isArray(req.refs) ? req.refs.map(String) : [],
          createdAt: req.createdAt || null,
        }
      : null,
    // Written by the skill (broad subject areas such as "軟體"); drives the shelf's tag filter.
    tags: Array.isArray(meta.tags) ? [...new Set(meta.tags.map((x) => String(x).trim()).filter(Boolean))] : [],
    sources: Array.isArray(meta.sources) ? meta.sources.map(String) : [],
    starred: !!meta.starred,
    createdAt: meta.createdAt || (req && req.createdAt) || null,
    videos,
    requests: Array.isArray(meta.requests) ? meta.requests.filter((r) => r && r.id).map(normalizeEpisodicRequest) : [],
    progress: meta.progress && typeof meta.progress === "object" ? meta.progress : {},
  };
}

/** A "ready" (or unrecognised) status with no playable video yet still reads as pending. */
function seriesStatus(status, videos) {
  if (SERIES_STATUSES.includes(status) && status !== "ready") return status;
  return videos.some((v) => v.file) ? "ready" : "pending";
}

function normalizeEpisodicRequest(r) {
  return {
    id: String(r.id),
    period: String(r.period || ""),
    length: EPISODIC_LENGTHS.includes(r.length) ? r.length : "medium",
    status: String(r.status || "pending"),
    createdAt: r.createdAt || null,
    videoId: r.videoId ? String(r.videoId) : null,
    doneAt: r.doneAt || null,
    note: String(r.note || ""),
  };
}

/** Whether the series has something to play: an unfinished, failed or requeued series may already have videos. */
function hasPlayable(meta) {
  return meta.videos.some((v) => v.file);
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
  if (!hasPlayable(meta)) return "pending";
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

/**
 * Scan the teaching-video series. Returns [{ slug, meta }]: starred first, then most recent activity.
 * Episodic recall films live in the Memory category (ADR-27) and are read with readEpisodic.
 */
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
  const topics = loaded.filter((x) => x && x.meta.kind !== "episodic");
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
function cleanRequest({ text, detail = "", source = "notes", refs = [] }) {
  // Cut by code point so an emoji is never split in half.
  const goal = Array.from(String(text || "").trim().replace(/\s+/g, " ")).slice(0, GOAL_MAX).join("");
  if (!goal) throw new Error("empty request");
  const useNotes = source !== "general";
  return {
    goal,
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
  const { goal, request } = cleanRequest(input);
  let slug = safeSlugPart(goal, `topic-${Date.now()}`);
  if (await adapter.exists(`${VIDEOS_DIR}/${slug}/meta.json`)) slug = `${slug}-${Date.now()}`;
  const now = new Date().toISOString();
  const meta = {
    title: goal,
    status: "pending",
    request: { ...request, createdAt: now },
    starred: false,
    createdAt: now,
    videos: [],
    progress: {},
  };
  if (input.teacher) meta.cast = { teacher: String(input.teacher) };
  await adapter.mkdir(`${VIDEOS_DIR}/${slug}`).catch(() => {});
  await adapter.write(`${VIDEOS_DIR}/${slug}/meta.json`, JSON.stringify(meta, null, 2));
  return { slug, meta: normalizeTopic(meta) };
}

/**
 * Edit a still-pending series (read-merge-write; the slug stays). `base` is the normalised meta the
 * form was opened with: if the file's title has changed since (the skill got there first), nothing
 * is written. `input.teacher` is only applied when present ("" clears the series' own teacher).
 * Returns the normalised meta, or null when the series is gone, no longer pending, or changed
 * underneath the form.
 */
async function updateRequest(adapter, slug, input, base) {
  const path = `${VIDEOS_DIR}/${slug}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!raw || typeof raw !== "object" || raw.status !== "pending") return null;
  const now = normalizeTopic(raw);
  if (now.status !== "pending" || (base && now.title !== base.title)) return null;
  const { goal, request } = cleanRequest(input);
  const prev = raw.request && typeof raw.request === "object" ? raw.request : {};
  raw.title = goal;
  raw.request = { ...prev, ...request };
  if (input.teacher === "") delete raw.cast;
  else if (input.teacher) raw.cast = { ...(isObject(raw.cast) ? raw.cast : {}), teacher: String(input.teacher) };
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return normalizeTopic(raw);
}

/** Put a failed or stuck series back in the queue so the next skill run picks it up. */
async function requeueSeries(adapter, slug) {
  const path = `${VIDEOS_DIR}/${slug}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!isObject(raw) || (raw.status !== "failed" && raw.status !== "making")) return false;
  raw.status = "pending";
  delete raw.error;
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return true;
}

/** The one episodic recall series, or null when none has been made or requested yet. */
async function readEpisodic(adapter) {
  const meta = normalizeTopic(await readJson(adapter, `${VIDEOS_DIR}/${EPISODIC_SLUG}/meta.json`));
  return meta ? { slug: EPISODIC_SLUG, meta } : null;
}

/** Record a pending "make a new recall film" request; the skill marks it done when delivering. */
async function addEpisodicRequest(adapter, { period, length }) {
  if (!PERIOD_RE.test(String(period || ""))) throw new Error(`invalid period: ${period}`);
  const path = `${VIDEOS_DIR}/${EPISODIC_SLUG}/meta.json`;
  const found = await readExisting(adapter, path);
  const raw = isObject(found) ? found : { title: "Episodic Recall", status: "ready", kind: "episodic", videos: [], progress: {} };
  const now = new Date();
  const request = { id: `req-${now.getTime()}`, period, length: EPISODIC_LENGTHS.includes(length) ? length : DEFAULT_SETTINGS.episodicLength, status: "pending", createdAt: now.toISOString() };
  raw.requests = [...(Array.isArray(raw.requests) ? raw.requests : []), request];
  await adapter.mkdir(`${VIDEOS_DIR}/${EPISODIC_SLUG}`).catch(() => {});
  await adapter.write(path, JSON.stringify(raw, null, 2));
  return normalizeEpisodicRequest(request);
}

/** Remove one request, leaving every other field of the series as it was. */
async function cancelEpisodicRequest(adapter, id) {
  const path = `${VIDEOS_DIR}/${EPISODIC_SLUG}/meta.json`;
  const raw = await readJson(adapter, path);
  if (!isObject(raw) || !Array.isArray(raw.requests) || !raw.requests.some((r) => r && r.id === id)) return false;
  raw.requests = raw.requests.filter((r) => !r || r.id !== id);
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
  EPISODIC_SLUG,
  QUALITIES,
  NARRATION_LANGS,
  VOICE_ENGINES,
  EPISODIC_LENGTHS,
  DEFAULT_TEACHER,
  DEFAULT_SETTINGS,
  GOAL_MAX,
  normalizeSettings,
  readSettings,
  saveSettings,
  syncSettingsLicense,
  normalizeTopic,
  hasPlayable,
  videoProgress,
  topicProgress,
  topicState,
  collectTags,
  listTopics,
  continueWatching,
  saveProgress,
  createRequest,
  updateRequest,
  requeueSeries,
  readEpisodic,
  addEpisodicRequest,
  cancelEpisodicRequest,
  deleteTopic,
};
