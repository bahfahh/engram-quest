"use strict";
// Lesson Academy data layer. Reads/writes courses under engram-quest/lessons/: each course is a
// folder holding a meta.json (title, tags, lesson list, completion map) plus one self-contained
// HTML file per lesson. Lessons come from two sources — the teach AI skill ("skill") and user
// imports of external HTML ("import") — and the lessons array's order IS the display order, so
// inserting/reordering is plain array surgery. Pure of Obsidian UI: every function takes a vault
// adapter so the logic is unit-testable.

const LESSONS_DIR = "engram-quest/lessons";

async function readJson(adapter, path) {
  try {
    if (adapter.exists && !(await adapter.exists(path))) return null;
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

/** Fill in any missing meta fields so renderers never need null checks. */
function normalizeMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  return {
    title: String(meta.title || ""),
    topic: String(meta.topic || ""),
    icon: String(meta.icon || "📘"),
    description: String(meta.description || ""),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    colorScheme: String(meta.colorScheme || ""),
    starred: !!meta.starred,
    createdAt: meta.createdAt || null,
    lessons: Array.isArray(meta.lessons)
      ? meta.lessons.filter((l) => l && l.id).map((l) => ({
          id: String(l.id),
          title: String(l.title || l.file || ""),
          // No file = a planned outline entry (user- or AI-authored) whose HTML the teach
          // skill hasn't generated yet. It still renders in the list as "pending".
          file: l.file ? String(l.file) : null,
          source: l.source === "import" ? "import" : "skill",
          ...(l.importedAt ? { importedAt: l.importedAt } : {}),
        }))
      : [],
    completion: meta.completion && typeof meta.completion === "object" ? meta.completion : {},
  };
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

  const courses = [];
  for (const folderPath of listing.folders) {
    const slug = String(folderPath).split("/").pop();
    if (!slug) continue;
    const meta = normalizeMeta(await readJson(adapter, `${LESSONS_DIR}/${slug}/meta.json`));
    if (meta) courses.push({ slug, meta });
  }
  courses.sort((a, b) => {
    if (a.meta.starred !== b.meta.starred) return a.meta.starred ? -1 : 1;
    return String(b.meta.createdAt || "").localeCompare(String(a.meta.createdAt || ""));
  });
  return courses;
}

async function loadCourse(adapter, slug) {
  return normalizeMeta(await readJson(adapter, `${LESSONS_DIR}/${slug}/meta.json`));
}

async function saveCourse(adapter, slug, meta) {
  await adapter.mkdir(`${LESSONS_DIR}/${slug}`).catch(() => {});
  await adapter.write(`${LESSONS_DIR}/${slug}/meta.json`, JSON.stringify(meta, null, 2));
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
 * (titles only, no HTML — the teach skill generates content for them later). Slug is derived
 * from the title when ASCII, else falls back to a timestamp slug. Returns { slug, meta }.
 */
async function createCourse(adapter, { title, description = "", icon = "📘", outline = [] }) {
  const slug = safeSlugPart(title, `course-${Date.now()}`);
  const now = new Date();
  const meta = {
    title: String(title || slug),
    topic: String(title || slug),
    icon,
    description: String(description || ""),
    tags: [],
    colorScheme: SCHEME_NAMES[Math.abs(hashStr(slug)) % SCHEME_NAMES.length],
    starred: false,
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

const SCHEME_NAMES = ["indigo", "green", "amber", "rose", "cyan"];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Append one planned (outline-only) lesson to an existing course. Returns the new entry. */
async function addPlannedLesson(adapter, slug, title) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const id = `lsn-${Date.now()}`;
  const lesson = { id, title: String(title || "").trim(), file: null, source: "skill" };
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
 * the quadrant data layer). True when the file is gone, false when every method failed.
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
async function deleteLesson(adapter, slug, lessonId) {
  const meta = await loadCourse(adapter, slug);
  if (!meta) return null;
  const lesson = meta.lessons.find((l) => l.id === lessonId);
  if (lesson && lesson.file) await trashPath(adapter, `${LESSONS_DIR}/${slug}/${lesson.file}`);
  meta.lessons = meta.lessons.filter((l) => l.id !== lessonId);
  await saveCourse(adapter, slug, meta);
  return meta;
}

/**
 * Delete a whole course: trash every lesson HTML, the meta.json, then the folder itself.
 * Best-effort per file — a failed HTML trash doesn't block removing the rest.
 */
async function deleteCourse(adapter, slug) {
  const meta = await loadCourse(adapter, slug);
  if (meta) {
    for (const lesson of meta.lessons) {
      if (lesson.file) await trashPath(adapter, `${LESSONS_DIR}/${slug}/${lesson.file}`);
    }
  }
  await trashPath(adapter, `${LESSONS_DIR}/${slug}/meta.json`);
  try {
    if (typeof adapter.rmdir === "function") await adapter.rmdir(`${LESSONS_DIR}/${slug}`, true);
  } catch (e) { console.warn("EngramQuest: course folder cleanup failed", e); }
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
