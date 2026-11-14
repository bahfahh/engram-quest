"use strict";
// Lesson Academy data layer. Reads/writes courses under engram-quest/lessons/: each course is a
// folder holding a meta.json (title, tags, lesson list, completion map) plus one self-contained
// HTML file per lesson. Lessons come from two sources — the lesson-academy AI skill ("skill") and user
// imports of external HTML ("import") — and the lessons array's order IS the display order, so
// inserting/reordering is plain array surgery. Pure of Obsidian UI: every function takes a vault
// adapter so the logic is unit-testable (deleteCourse takes the app: it follows Obsidian's trash setting).

const { trashVaultPath } = require("../vault-trash");

const LESSONS_DIR = "engram-quest/lessons";

async function readJson(adapter, path) {
  // No exists() pre-check: read throws on a missing file and we return null either way,
  // so skipping it halves the adapter round-trips (one per course on every lessons render).
  try {
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/**
 * Fill in any missing meta fields so renderers never need null checks. meta.json is shared with the
 * lesson-academy skill, and every plugin write goes through here, so what the plugin doesn't own is
 * carried through unchanged: unknown fields (course and lesson level), a lesson's `type` and `title`
 * as the skill wrote them, and entries that aren't objects. Display fallbacks for a missing title
 * live in lessonTitle(); a `type` other than "canvas" is simply shown as HTML by the readers.
 */
const isLessonEntry = (entry) => !!entry && typeof entry === "object" && !Array.isArray(entry);

function normalizeMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  // Entries that aren't lesson objects can't be shown, but they aren't the plugin's to delete:
  // saveCourse() puts them back from the file on disk.
  const entries = Array.isArray(meta.lessons) ? meta.lessons : [];
  const normalized = {
    ...meta,
    title: String(meta.title || ""),
    topic: String(meta.topic || ""),
    icon: String(meta.icon || "📘"),
    description: String(meta.description || ""),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    colorScheme: String(meta.colorScheme || ""),
    starred: !!meta.starred,
    archived: !!meta.archived,
    createdAt: meta.createdAt || null,
    lessons: entries.filter(isLessonEntry).map((l, i) => ({
      ...l,
      // An entry without an id would have no place in the completion map; it gets one derived
      // from its file (or position) instead of being dropped.
      id: String(l.id || (l.file ? `file-${l.file}` : `entry-${i + 1}`)),
      // No file = a planned outline entry (user- or AI-authored) whose HTML the lesson-academy
      // skill hasn't generated yet. It still renders in the list as "pending".
      file: l.file ? String(l.file) : null,
      source: l.source === "import" ? "import" : "skill",
    })),
    completion: meta.completion && typeof meta.completion === "object" ? meta.completion : {},
  };
  return normalized;
}

/** What to show as a lesson's title: its own, else its file name. */
function lessonTitle(lesson) {
  return String((lesson && (lesson.title || lesson.file)) || "");
}

/** Completion state for one lesson — always a full object, never undefined. */
function lessonCompletion(meta, lessonId) {
  const c = (meta && meta.completion && meta.completion[lessonId]) || {};
  return {
    viewed: !!c.viewed,
    completed: !!c.completed,
    starred: !!c.starred,
    lastViewed: c.lastViewed || null,
  };
}

/** Derived status used by list rows and filters: "completed" | "viewed" | "new" | "planned". */
function lessonStatus(meta, lessonId) {
  const lesson = meta.lessons.find((l) => l.id === lessonId);
  if (lesson && !lesson.file) return "planned"; // outline-only — HTML not generated yet
  const c = lessonCompletion(meta, lessonId);
  if (c.completed) return "completed";
  if (c.viewed) return "viewed";
  return "new";
}

/** Count of completed lessons + percentage for the course card progress bar. */
function courseProgress(meta) {
  const total = meta.lessons.length;
  let completed = 0;
  for (const l of meta.lessons) {
    if (lessonCompletion(meta, l.id).completed) completed++;
  }
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

/**
 * Scan engram-quest/lessons/ for course folders that contain a meta.json.
 * Returns [{ slug, meta }] sorted by starred first, then createdAt desc.
 */
async function listCourses(adapter) {
  let listing = null;
  try {
    listing = await adapter.list(LESSONS_DIR);
  } catch {
    listing = null;
  }
  if (!listing || !Array.isArray(listing.folders)) return [];

  // All meta.json reads in parallel — course folders are independent.
  const loaded = await Promise.all(
    listing.folders.map(async (folderPath) => {
      const slug = String(folderPath).split("/").pop();
      if (!slug) return null;
      const meta = normalizeMeta(await readJson(adapter, `${LESSONS_DIR}/${slug}/meta.json`));
      return meta ? { slug, meta } : null;
    })
  );
  const courses = loaded.filter(Boolean);
  courses.sort((a, b) => {
    if (a.meta.starred !== b.meta.starred) return a.meta.starred ? -1 : 1;
    return String(b.meta.createdAt || "").localeCompare(String(a.meta.createdAt || ""));
  });
  return courses;
}

async function loadCourse(adapter, slug) {
  return normalizeMeta(await readJson(adapter, `${LESSONS_DIR}/${slug}/meta.json`));
}

/**
 * Write a course's meta.json. Entries in `lessons` that aren't lessons (strings, arrays, null…) are
 * taken from the file on disk and put back at their old index, so they survive whatever copy of the meta
 * the caller holds (their content is kept; after lessons are removed or reordered their place among the
 * lessons can shift); a `lessons` value that isn't a list is kept as is unless the caller has lessons.
 */
async function saveCourse(adapter, slug, meta) {
  const path = `${LESSONS_DIR}/${slug}/meta.json`;
  const disk = await readJson(adapter, path);
  const onDisk = disk && typeof disk === "object" ? disk.lessons : undefined;
  let lessons = (Array.isArray(meta.lessons) ? meta.lessons : []).filter(isLessonEntry);
  if (Array.isArray(onDisk)) {
    onDisk.forEach((entry, index) => { if (!isLessonEntry(entry)) lessons.splice(Math.min(index, lessons.length), 0, entry); });
  } else if (onDisk !== undefined && !lessons.length) {
    lessons = onDisk;
  }
  await adapter.mkdir(`${LESSONS_DIR}/${slug}`).catch(() => {});
  await adapter.write(path, JSON.stringify({ ...meta, lessons }, null, 2));
}

/**
 * Patch one lesson's completion fields (read → merge → write). Only the fields in `patch` change;
 * setting viewed:true also stamps lastViewed. Returns the updated meta, or null if no course.
 */
async function markLesson(adapter, slug, lessonId, patch = {}) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const current = lessonCompletion(meta, lessonId);
  const next = { ...current };
  for (const key of ["viewed", "completed", "starred"]) {
    if (patch[key] !== undefined) next[key] = !!patch[key];
  }
  if (patch.viewed) next.lastViewed = new Date().toISOString();
  meta.completion[lessonId] = next;
  await saveCourse(adapter, slug, meta);
  return meta;
}

/**
 * Create a new course shell from the plugin UI: course info + an outline of planned lessons
 * (titles only, no HTML — the lesson-academy skill generates content for them later). Slug is derived
 * from the title when ASCII, else falls back to a timestamp slug. Returns { slug, meta }.
 */
async function createCourse(adapter, { title, description = "", icon = "📘", outline = [] }) {
  let slug = safeSlugPart(title, `course-${Date.now()}`);
  // A new course never takes over an existing folder: that would replace the other course's
  // lessons, progress and plan with an empty shell.
  if (await adapter.exists(`${LESSONS_DIR}/${slug}/meta.json`)) slug = `${slug}-${Date.now()}`;
  const now = new Date();
  const meta = {
    title: String(title || slug),
    topic: String(title || slug),
    icon,
    description: String(description || ""),
    tags: [],
    colorScheme: SCHEME_NAMES[Math.abs(hashStr(slug)) % SCHEME_NAMES.length],
    starred: false,
    archived: false,
    createdAt: now.toISOString().slice(0, 10),
    lessons: [],
    completion: {},
  };
  outline.filter((s) => String(s || "").trim()).forEach((lineTitle, i) => {
    const id = `lsn-${Date.now() + i}`;
    meta.lessons.push({ id, title: String(lineTitle).trim(), file: null, source: "skill" });
    meta.completion[id] = { viewed: false, completed: false, starred: false };
  });
  await saveCourse(adapter, slug, meta);
  return { slug, meta };
}

const SCHEME_NAMES = [
  "indigo", "green", "amber", "rose", "cyan", "violet",
  "blue", "teal", "lime", "orange", "fuchsia", "slate",
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Append one planned (outline-only) lesson to an existing course. Returns the new entry. */
async function addPlannedLesson(adapter, slug, title, type) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const id = `lsn-${Date.now()}`;
  const lesson = {
    id,
    title: String(title || "").trim(),
    file: null,
    type: type === "canvas" ? "canvas" : "html",
    source: "skill",
  };
  meta.lessons.push(lesson);
  meta.completion[id] = { viewed: false, completed: false, starred: false };
  await saveCourse(adapter, slug, meta);
  return lesson;
}

/** Toggle the course-level star (shown on the course card). Returns the new starred value. */
async function toggleCourseStar(adapter, slug) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  meta.starred = !meta.starred;
  await saveCourse(adapter, slug, meta);
  return meta.starred;
}

/** Toggle course-level archive. Archived courses stay on disk and remain readable by skills. */
async function toggleCourseArchive(adapter, slug) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  meta.archived = !meta.archived;
  await saveCourse(adapter, slug, meta);
  return meta.archived;
}

/** Keep slugs filesystem- and vault-path-safe; non-latin titles collapse to the fallback. */
function safeSlugPart(text, fallback = "import") {
  const s = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || fallback;
}

/** Pull the <title> text out of an HTML document, if present. */
function extractHtmlTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ""));
  if (!m) return null;
  const title = m[1].replace(/\s+/g, " ").trim();
  return title || null;
}

/**
 * Import an external HTML file (e.g. generated elsewhere by another AI) into a course. Writes the
 * HTML under the course folder, appends a lesson entry (source:"import") to the end of the lessons
 * array, and persists meta. Title preference: <title> tag → suggestedTitle (usually the filename).
 * Returns the new lesson entry, or null if the course doesn't exist.
 */
async function importLesson(adapter, slug, htmlContent, suggestedTitle) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const id = `lsn-${Date.now()}`;
  const title = extractHtmlTitle(htmlContent) || String(suggestedTitle || "Imported lesson");
  const file = `${id}-${safeSlugPart(suggestedTitle || title)}.html`;
  await adapter.mkdir(`${LESSONS_DIR}/${slug}`).catch(() => {});
  await adapter.write(`${LESSONS_DIR}/${slug}/${file}`, String(htmlContent || ""));
  const lesson = { id, title, file, source: "import", importedAt: new Date().toISOString() };
  meta.lessons.push(lesson);
  meta.completion[id] = { viewed: false, completed: false, starred: false };
  await saveCourse(adapter, slug, meta);
  return lesson;
}

/**
 * Move a single file to trash: OS trash → vault-local .trash → permanent remove (same ladder as
 * the explainer data layer). True when the file is gone, false when every method failed.
 */
async function trashPath(adapter, path) {
  try {
    if (adapter.exists && !(await adapter.exists(path))) return true;
  } catch { /* can't check — try to trash anyway */ }
  try {
    if (typeof adapter.trashSystem === "function") {
      const ok = await adapter.trashSystem(path);
      if (ok) return true;
    }
  } catch (e) { console.warn("EngramQuest: lesson trashSystem failed", e); }
  try {
    if (typeof adapter.trashLocal === "function") { await adapter.trashLocal(path); return true; }
  } catch (e) { console.warn("EngramQuest: lesson trashLocal failed", e); }
  try {
    if (typeof adapter.remove === "function") { await adapter.remove(path); return true; }
  } catch (e) { console.warn("EngramQuest: lesson remove failed", e); }
  return false;
}

/**
 * Delete one lesson: trash its HTML and drop it from the lessons array. The completion key is
 * left behind on purpose — it's invisible once the lesson entry is gone and skipping the cleanup
 * keeps this a single read-modify-write. Returns the updated meta, or null if no course.
 */
async function deleteLesson(app, slug, lessonId) {
  const adapter = app.vault.adapter;
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const lesson = meta.lessons.find((l) => l.id === lessonId);
  if (lesson && lesson.file) {
    // The file name comes from AI-written meta.json: never let it point outside the course folder.
    if (String(lesson.file).split(/[\\/]/).some((part) => part === "..") || /^[\\/]|^[a-z]:/i.test(lesson.file) || String(slug).includes("..")) {
      throw new Error(`lesson file ${lesson.file} is outside the course folder`);
    }
    const path = `${LESSONS_DIR}/${slug}/${lesson.file}`;
    if (!(await trashVaultPath(app, path))) throw new Error(`could not move ${path} to the trash`);
  }
  meta.lessons = meta.lessons.filter((l) => l.id !== lessonId);
  await saveCourse(adapter, slug, meta);
  return meta;
}

/**
 * Delete a whole course: the course folder goes to the trash as one piece, so everything in it —
 * including files meta.json doesn't list (images, the skill's working files) — can be restored.
 * It follows the user's Obsidian "Deleted files" setting when the vault index knows the folder and
 * falls back to the adapter's trash when it doesn't (the skill writes courses outside Obsidian).
 * Throws when it could not be trashed; nothing is then removed.
 */
async function deleteCourse(app, slug) {
  const dir = `${LESSONS_DIR}/${slug}`;
  if (!(await trashVaultPath(app, dir))) throw new Error(`could not move ${dir} to the trash`);
}

/**
 * Reorder lessons to match newOrder (array of lesson ids). Ids missing from newOrder keep their
 * relative order and are appended after the reordered ones, so a stale UI can't drop lessons.
 */
async function reorderLessons(adapter, slug, newOrder) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const byId = new Map(meta.lessons.map((l) => [l.id, l]));
  const reordered = [];
  for (const id of newOrder || []) {
    if (byId.has(id)) {
      reordered.push(byId.get(id));
      byId.delete(id);
    }
  }
  meta.lessons = [...reordered, ...byId.values()];
  await saveCourse(adapter, slug, meta);
  return meta;
}

/**
 * Flatten all courses' viewed lessons into a recent-activity list for the sidebar.
 * Returns up to `limit` entries sorted by lastViewed desc:
 * [{ slug, courseTitle, lesson, status, lastViewed }]
 */
function recentLessons(courses, limit = 5) {
  const entries = [];
  for (const { slug, meta } of courses) {
    for (const lesson of meta.lessons) {
      const c = lessonCompletion(meta, lesson.id);
      if (!c.lastViewed) continue;
      entries.push({
        slug,
        courseTitle: meta.title,
        lesson,
        status: lessonStatus(meta, lesson.id),
        starred: c.starred,
        lastViewed: c.lastViewed,
      });
    }
  }
  entries.sort((a, b) => String(b.lastViewed).localeCompare(String(a.lastViewed)));
  return entries.slice(0, limit);
}

/** Aggregate stats for the sidebar donut + stat boxes. */
function overallStats(courses) {
  let totalLessons = 0;
  let completedLessons = 0;
  let coursesInProgress = 0;
  let coursesCompleted = 0;
  for (const { meta } of courses) {
    const p = courseProgress(meta);
    totalLessons += p.total;
    completedLessons += p.completed;
    if (p.total > 0 && p.completed === p.total) coursesCompleted++;
    else if (p.completed > 0 || meta.lessons.some((l) => lessonCompletion(meta, l.id).viewed)) coursesInProgress++;
  }
  return {
    pct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    coursesInProgress,
    coursesCompleted,
    // Rough study-time estimate the sidebar shows: ~30 min per completed lesson.
    estimatedHours: Math.round((completedLessons * 0.5) * 10) / 10,
  };
}

module.exports = {
  LESSONS_DIR,
  normalizeMeta,
  lessonTitle,
  lessonCompletion,
  lessonStatus,
  courseProgress,
  listCourses,
  loadCourse,
  saveCourse,
  markLesson,
  createCourse,
  addPlannedLesson,
  toggleCourseStar,
  toggleCourseArchive,
  safeSlugPart,
  extractHtmlTitle,
  importLesson,
  trashPath,
  deleteLesson,
  deleteCourse,
  reorderLessons,
  recentLessons,
  overallStats,
};
