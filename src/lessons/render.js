"use strict";
// Hub "Lessons" (Lesson Academy) tab renderer. Lists courses under engram-quest/lessons/ as
// horizontally-scrolling color-themed cards; selecting a course shows its lesson list with
// status filters, HTML import, and per-lesson delete. A right-hand sidebar shows an overall
// progress donut, course stats, and recent activity. Both light and dark palettes are explicit
// (per-course color schemes can't ride on Obsidian CSS variables). modal.js holds only a thin
// _renderLessonTab delegate to renderLessonTab().

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const {
  listCourses, lessonCompletion, lessonStatus, courseProgress,
  toggleCourseStar, toggleCourseArchive, importLesson, deleteLesson, deleteCourse,
  createCourse, addPlannedLesson,
  recentLessons, overallStats,
} = require("./data");
const { LessonViewerModal } = require("./viewer-modal");
const { attachInfoButton: _attachGuideInfo } = require("../hub/feature-guide");

// Per-course color schemes (picked by meta.colorScheme, else hashed from the slug).
const SCHEMES = {
  indigo: { dark: { bg: "#1a1d2e", icon: "#3730a3", bar: "#6366f1", edge: "#6366f1" }, light: { bg: "#eef2ff", icon: "#4f46e5", bar: "#6366f1", edge: "#6366f1" } },
  green:  { dark: { bg: "#0d1f18", icon: "#065f46", bar: "#10b981", edge: "#10b981" }, light: { bg: "#ecfdf5", icon: "#059669", bar: "#10b981", edge: "#059669" } },
  amber:  { dark: { bg: "#1c1710", icon: "#92400e", bar: "#f59e0b", edge: "#f59e0b" }, light: { bg: "#fffbeb", icon: "#d97706", bar: "#f59e0b", edge: "#d97706" } },
  rose:   { dark: { bg: "#1f0d10", icon: "#9f1239", bar: "#f43f5e", edge: "#f43f5e" }, light: { bg: "#fff1f2", icon: "#e11d48", bar: "#f43f5e", edge: "#e11d48" } },
  cyan:   { dark: { bg: "#0a1a1f", icon: "#164e63", bar: "#06b6d4", edge: "#06b6d4" }, light: { bg: "#ecfeff", icon: "#0891b2", bar: "#06b6d4", edge: "#0891b2" } },
  violet: { dark: { bg: "#1b1430", icon: "#6d28d9", bar: "#8b5cf6", edge: "#8b5cf6" }, light: { bg: "#f5f3ff", icon: "#7c3aed", bar: "#8b5cf6", edge: "#7c3aed" } },
  blue:   { dark: { bg: "#0b1a31", icon: "#1d4ed8", bar: "#3b82f6", edge: "#3b82f6" }, light: { bg: "#eff6ff", icon: "#2563eb", bar: "#3b82f6", edge: "#2563eb" } },
  teal:   { dark: { bg: "#08201f", icon: "#0f766e", bar: "#14b8a6", edge: "#14b8a6" }, light: { bg: "#f0fdfa", icon: "#0f766e", bar: "#14b8a6", edge: "#0f766e" } },
  lime:   { dark: { bg: "#17200b", icon: "#4d7c0f", bar: "#84cc16", edge: "#84cc16" }, light: { bg: "#f7fee7", icon: "#65a30d", bar: "#84cc16", edge: "#65a30d" } },
  orange: { dark: { bg: "#241209", icon: "#c2410c", bar: "#f97316", edge: "#f97316" }, light: { bg: "#fff7ed", icon: "#ea580c", bar: "#f97316", edge: "#ea580c" } },
  fuchsia:{ dark: { bg: "#240f24", icon: "#a21caf", bar: "#d946ef", edge: "#d946ef" }, light: { bg: "#fdf4ff", icon: "#c026d3", bar: "#d946ef", edge: "#c026d3" } },
  slate:  { dark: { bg: "#111827", icon: "#334155", bar: "#94a3b8", edge: "#94a3b8" }, light: { bg: "#f8fafc", icon: "#475569", bar: "#64748b", edge: "#475569" } },
};
const SCHEME_KEYS = Object.keys(SCHEMES);

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function schemeFor(slug, meta, dark) {
  let key = meta.colorScheme;
  if (!SCHEMES[key]) {
    // Same hash formula as data.js createCourse so a missing colorScheme resolves to the same
    // scheme everywhere.
    key = SCHEME_KEYS[hashStr(slug) % SCHEME_KEYS.length];
  }
  return SCHEMES[key][dark ? "dark" : "light"];
}

function cardBackground(slug, sc, dark) {
  const seed = hashStr(slug);
  const x = 18 + (seed % 64);
  const y = 14 + ((seed >> 3) % 58);
  const angle = 120 + (seed % 90);
  const glow = dark ? "22" : "18";
  return [
    `radial-gradient(circle at ${x}% ${y}%, ${sc.edge}${glow} 0, transparent 34%)`,
    `linear-gradient(${angle}deg, ${sc.bg} 0%, ${sc.bg} 68%, ${sc.icon}${dark ? "38" : "20"} 100%)`,
    sc.bg,
  ].join(",");
}

function isDarkMode() {
  // activeDocument is Obsidian's popout-aware global document handle.
  return activeDocument.body.classList.contains("theme-dark");
}

// Theme tokens shared across the tab (course cards add their per-scheme colors on top).
function themeTokens(dark) {
  return dark ? {
    text: "#e2e8f0", muted: "#94a3b8", faint: "#475569",
    border: "#1e2640", panel: "#111827", row: "#13182a", rowHover: "#1a1d2e",
    badgeBg: "#1e2640", badgeText: "#94a3b8",
    pillIdleBg: "#1e2640", pillIdleText: "#94a3b8",
    track: "#1e2640",
  } : {
    text: "#1e293b", muted: "#64748b", faint: "#94a3b8",
    border: "#e2e8f0", panel: "#ffffff", row: "#ffffff", rowHover: "#f8fafc",
    badgeBg: "#e2e8f0", badgeText: "#64748b",
    pillIdleBg: "#f1f5f9", pillIdleText: "#64748b",
    track: "#e2e8f0",
  };
}

// Status icon + label for one lesson row (and the recent list).
function statusVisual(t, status, starred) {
  if (status === "planned") {
    return { icon: "📝", color: "#94a3b8", label: c(t, "LESSON_STATUS_PLANNED") };
  }
  if (status === "completed") {
    return starred
      ? { icon: "★", color: "#f59e0b", label: c(t, "LESSON_STATUS_DONE") }
      : { icon: "✓", color: "#22c55e", label: c(t, "LESSON_STATUS_DONE") };
  }
  if (status === "viewed") {
    return starred
      ? { icon: "☆", color: "#f59e0b", label: c(t, "LESSON_STATUS_VIEWED") }
      : { icon: "◑", color: "#94a3b8", label: c(t, "LESSON_STATUS_VIEWED") };
  }
  return starred
    ? { icon: "☆", color: "#f59e0b", label: c(t, "LESSON_STATUS_NEW") }
    : { icon: "○", color: "#64748b", label: c(t, "LESSON_STATUS_NEW") };
}

// ---------------------------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------------------------

async function renderLessonTab(content, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  const courses = await listCourses(adapter);

  // Tab-level UI state survives refreshes within the session (selected course + lesson filter +
  // course search query + expanded card grid). The course filter/sort choices additionally
  // persist across sessions via settings._lessonCourseView (same mechanism as _viewModes).
  if (!hub._lessonState) {
    const saved = hub.plugin.settings._lessonCourseView || {};
    hub._lessonState = {
      slug: null, filter: "all", courseQuery: "", expanded: false,
      courseTag: saved.tag || "all",
      courseProg: saved.prog || "all",
      courseSort: saved.sort || "recent",
      courseScope: saved.scope || "active",
    };
  }
  const state = hub._lessonState;
  if (state.courseScope === "archived" && !courses.some((cs) => cs.meta.archived)) {
    state.courseScope = "active";
  }
  const scopedCourses = courses.filter((cs) => matchesCourseScope(cs.meta, state.courseScope));
  if (!scopedCourses.some((cs) => cs.slug === state.slug)) {
    state.slug = scopedCourses.length ? scopedCourses[0].slug : null;
  }

  const refresh = () => { content.empty(); renderLessonTab(content, hub); };

  const dark = isDarkMode();
  const tk = themeTokens(dark);

  // The hub tab container is overflow:hidden (modal.js) — every tab provides its own scroller.
  // Without this, lesson lists longer than the modal get clipped with no way to reach them.
  const scroll = content.createEl("div", {
    attr: { style: "flex:1;min-height:0;overflow-y:auto;" },
  });

  if (courses.length === 0) {
    renderEmptyState(scroll, t, tk);
    return;
  }

  const layout = scroll.createEl("div", {
    attr: { style: "display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;" },
  });
  const main = layout.createEl("div", {
    attr: { style: state.expanded ? "width:100%;min-width:0;" : "flex:1 1 0;min-width:360px;" },
  });
  let sidebar = null;
  if (!state.expanded) {
    sidebar = layout.createEl("div", {
      attr: { style: `width:210px;flex-shrink:0;background:${tk.panel};border:1px solid ${tk.border};border-radius:14px;padding:16px;` },
    });
  }

  renderHeader(main, hub, t, tk, scopedCourses, state, refresh);
  renderCourseCards(main, hub, t, tk, dark, courses, state, refresh);
  // Only show the lesson list for a course whose card is actually visible under the current
  // search + tag filter. Expanded mode is a pure course picker — the grid gets the full height
  // and the lesson list stays hidden until a card is clicked (which auto-collapses).
  const selected = scopedCourses.find(
    (cs) => cs.slug === state.slug &&
      matchesCourseQuery(cs.meta, state.courseQuery) &&
      matchesCourseTag(cs.meta, state.courseTag) &&
      matchesCourseProg(cs.meta, state.courseProg)
  );
  if (selected && !state.expanded) renderLessonList(main, hub, t, tk, selected, state, refresh);
  if (sidebar) renderSidebar(sidebar, hub, t, tk, scopedCourses, refresh);
}

// ---------------------------------------------------------------------------------------------
// Empty state / header
// ---------------------------------------------------------------------------------------------

function renderEmptyState(content, t, tk) {
  const wrap = content.createEl("div", {
    attr: { style: "display:flex;flex-direction:column;align-items:center;gap:10px;padding:60px 24px;text-align:center;" },
  });
  wrap.createEl("div", { text: "🎓", attr: { style: "font-size:40px;" } });
  wrap.createEl("div", {
    text: c(t, "LESSON_NO_COURSES_TITLE"),
    attr: { style: `font-size:17px;font-weight:700;color:${tk.text};` },
  });
  wrap.createEl("div", {
    text: c(t, "LESSON_NO_COURSES_BODY"),
    attr: { style: `font-size:13px;color:${tk.muted};line-height:1.7;max-width:440px;` },
  });
}

function renderHeader(main, hub, t, tk, courses, state, refresh) {
  const head = main.createEl("div", { attr: { style: "margin-bottom:14px;" } });
  const row = head.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap;" } });
  row.createEl("span", { text: "🎓", attr: { style: "font-size:22px;" } });
  row.createEl("span", {
    text: c(t, "LESSON_ACADEMY_TITLE"),
    attr: { style: `min-width:0;font-size:19px;font-weight:800;color:${tk.text};letter-spacing:0.5px;` },
  });
  if (hub && hub.app && hub.plugin) _attachGuideInfo(row, hub.app, hub.plugin, "lesson");
  row.createEl("span", { attr: { style: "flex:1;min-width:0;" } });

  // Course search — only worth the chrome once the card strip stops fitting on screen.
  // Filters the cards (and the auto-selected course) by title / topic / tags.
  if (courses.length >= 6 || state.courseQuery) {
    const search = row.createEl("input", {
      attr: {
        type: "search",
        placeholder: c(t, "LESSON_SEARCH_PH"),
        value: state.courseQuery || "",
        style: `flex-shrink:0;width:180px;padding:6px 12px;border-radius:99px;border:1px solid ${tk.border};background:${tk.panel};color:${tk.text};font-size:12px;`,
      },
    });
    search.addEventListener("input", () => {
      state.courseQuery = search.value;
      state._searchFocus = true; // typing re-renders the tab — tell the next render to re-focus
      refresh();
    });
    if (state._searchFocus) {
      state._searchFocus = false;
      window.setTimeout(() => {
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      }, 0);
    }
  }

  // "+ new course" lives here (not at the end of the card strip) so it stays visible no matter
  // how many courses exist.
  const addBtn = row.createEl("button", {
    text: "＋ " + c(t, "LESSON_NEW_COURSE"),
    attr: {
      style: `flex-shrink:0;font-size:12px;padding:6px 14px;border-radius:99px;border:1px dashed ${tk.border};background:transparent;color:${tk.muted};cursor:pointer;`,
      title: c(t, "LESSON_NEW_COURSE_HINT"),
    },
  });
  addBtn.addEventListener("click", () => openCreateCourseModal(hub, t, state, refresh));

  // Expand toggle — switches the card strip between one scrolling row (default) and a wrapped
  // grid. Filtering/sorting lives in the always-visible filter row above the cards, so no
  // filter is ever silently active while its control is hidden.
  if (courses.length >= 2) {
    const expandBtn = row.createEl("button", {
      text: state.expanded ? "▔ " + c(t, "LESSON_COLLAPSE") : "⊞ " + c(t, "LESSON_EXPAND_ALL"),
      attr: {
        style:
          `flex-shrink:0;font-size:12px;padding:6px 12px;border-radius:99px;cursor:pointer;` +
          (state.expanded
            ? "border:1px solid #6366f1;background:#6366f1;color:#fff;"
            : `border:1px solid ${tk.border};background:transparent;color:${tk.muted};`),
      },
    });
    expandBtn.addEventListener("click", () => {
      state.expanded = !state.expanded;
      refresh();
    });
  }

  head.createEl("div", {
    text: c(t, "LESSON_ACADEMY_SUBTITLE"),
    attr: { style: `font-size:12px;color:${tk.muted};margin-top:2px;` },
  });
}

/** Case-insensitive course match on title / topic / tags. */
function matchesCourseQuery(meta, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    meta.title.toLowerCase().includes(q) ||
    meta.topic.toLowerCase().includes(q) ||
    meta.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------------------------
// Course cards (horizontal strip)
// ---------------------------------------------------------------------------------------------

/** Latest lastViewed across a course's lessons ("" when never opened) — used to sort cards. */
function courseRecency(meta) {
  let max = "";
  for (const id of Object.keys(meta.completion || {})) {
    const lv = meta.completion[id] && meta.completion[id].lastViewed;
    if (lv && lv > max) max = lv;
  }
  return max;
}

/** True when the course passes the tag filter ("all" | "starred" | a tag). */
function matchesCourseTag(meta, courseTag) {
  if (!courseTag || courseTag === "all") return true;
  if (courseTag === "starred") return !!meta.starred;
  return meta.tags.includes(courseTag);
}

/** Coarse course progress bucket for the 進度 filter. */
function courseProgBucket(meta) {
  const prog = courseProgress(meta);
  if (prog.total > 0 && prog.completed === prog.total) return "done";
  if (prog.completed > 0 || courseRecency(meta)) return "doing";
  return "new";
}

function matchesCourseProg(meta, courseProg) {
  if (!courseProg || courseProg === "all") return true;
  return courseProgBucket(meta) === courseProg;
}

function matchesCourseScope(meta, courseScope) {
  return courseScope === "archived" ? !!meta.archived : !meta.archived;
}

/** Persist the course filter/sort picks (settings._lessonCourseView) so they survive reopen. */
async function saveCourseView(hub, state) {
  hub.plugin.settings._lessonCourseView = {
    tag: state.courseTag, prog: state.courseProg, sort: state.courseSort, scope: state.courseScope,
  };
  try { await hub.plugin.saveData(hub.plugin.settings); }
  catch (e) { console.warn("EngramQuest: save course view failed", e); }
}

// Always-visible filter/sort row above the course cards: 類別 | 進度 | 排序 dropdowns.
function renderCourseFilterRow(main, hub, t, tk, courses, state, refresh) {
  const archivedCount = courses.filter(({ meta }) => meta.archived).length;
  if (state.courseScope === "archived" && archivedCount === 0) {
    state.courseScope = "active";
    saveCourseView(hub, state);
  }
  const scopedCourses = courses.filter(({ meta }) => matchesCourseScope(meta, state.courseScope));
  const counts = new Map();
  for (const { meta } of scopedCourses) {
    for (const tag of meta.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  // A persisted tag may no longer exist (course deleted / retagged) — fall back to "all"
  // instead of silently filtering every card out, and heal the persisted value.
  if (state.courseTag !== "all" && state.courseTag !== "starred" && !counts.has(state.courseTag)) {
    state.courseTag = "all";
    saveCourseView(hub, state);
  }

  const bar = main.createEl("div", {
    attr: { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:0 2px 8px;" },
  });
  const mkSelect = (options, current, isDefault, onPick) => {
    const sel = bar.createEl("select", {
      attr: {
        style:
          "font-size:11px;padding:4px 8px;border-radius:14px;cursor:pointer;max-width:140px;" +
          `background:${tk.panel};` +
          (isDefault ? `border:1px solid ${tk.border};color:${tk.muted};`
                     : "border:1px solid #6366f1;color:#6366f1;font-weight:600;"),
      },
    });
    for (const o of options) {
      sel.createEl("option", { text: o.label, attr: { value: o.id } });
    }
    sel.value = current;
    sel.addEventListener("change", async () => {
      onPick(sel.value);
      await saveCourseView(hub, state);
      refresh();
    });
  };

  mkSelect(
    [
      { id: "all", label: c(t, "LESSON_CFILTER_TAG_ALL") },
      { id: "starred", label: c(t, "LESSON_CFILTER_STARRED") },
      ...tags.map((tag) => ({ id: tag, label: tag })),
    ],
    state.courseTag, state.courseTag === "all",
    (v) => { state.courseTag = v; }
  );
  mkSelect(
    [
      { id: "all", label: c(t, "LESSON_CFILTER_PROG_ALL") },
      { id: "new", label: c(t, "LESSON_CFILTER_PROG_NEW") },
      { id: "doing", label: c(t, "LESSON_CFILTER_PROG_DOING") },
      { id: "done", label: c(t, "LESSON_CFILTER_PROG_DONE") },
    ],
    state.courseProg, state.courseProg === "all",
    (v) => { state.courseProg = v; }
  );
  mkSelect(
    [
      { id: "recent", label: c(t, "LESSON_CSORT_RECENT") },
      { id: "created", label: c(t, "LESSON_CSORT_CREATED") },
      { id: "progress", label: c(t, "LESSON_CSORT_PROGRESS") },
    ],
    state.courseSort, state.courseSort === "recent",
    (v) => { state.courseSort = v; }
  );
  if (archivedCount > 0 || state.courseScope === "archived") {
    mkSelect(
      [
        { id: "active", label: c(t, "LESSON_SCOPE_ACTIVE") },
        { id: "archived", label: c(t, "LESSON_SCOPE_ARCHIVED") },
      ],
      state.courseScope, state.courseScope === "active",
      (v) => {
        state.courseScope = v;
        state.courseTag = "all";
        state.courseProg = "all";
        state.slug = null;
      }
    );
  }
}

function renderCourseCards(main, hub, t, tk, dark, courses, state, refresh) {
  // Also shown below 2 courses whenever a filter is active — a persisted filter must never be
  // in effect while its only escape control is hidden.
  const scopedCourses = courses.filter(({ meta }) => matchesCourseScope(meta, state.courseScope));
  if (courses.length >= 2 || state.courseTag !== "all" || state.courseProg !== "all" || courses.some(({ meta }) => meta.archived)) {
    renderCourseFilterRow(main, hub, t, tk, courses, state, refresh);
  }

  const strip = main.createEl("div", {
    attr: {
      style: state.expanded
        ? "display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;align-items:stretch;padding:4px 2px 12px;"
        : "display:flex;gap:12px;padding:4px 2px 12px;overflow-x:auto;",
    },
  });

  // Sort means exactly what the selected control says. Starred is still available as a filter
  // and card marker, but it should not silently push newly-created courses behind old favorites.
  const recency = new Map(scopedCourses.map(({ slug, meta }) => [slug, courseRecency(meta)]));
  const sortFns = {
    recent: (a, b) =>
      recency.get(b.slug).localeCompare(recency.get(a.slug)) ||
      String(b.meta.createdAt || "").localeCompare(String(a.meta.createdAt || "")),
    created: (a, b) => String(b.meta.createdAt || "").localeCompare(String(a.meta.createdAt || "")),
    progress: (a, b) => courseProgress(b.meta).pct - courseProgress(a.meta).pct,
  };
  const sortFn = sortFns[state.courseSort] || sortFns.recent;
  const visibleCourses = scopedCourses
    .filter(({ meta }) =>
      matchesCourseQuery(meta, state.courseQuery) &&
      matchesCourseTag(meta, state.courseTag) &&
      matchesCourseProg(meta, state.courseProg))
    .sort(sortFn);
  // If the search hides the selected course, follow the first match so the lesson list below
  // always corresponds to a visible card.
  if (visibleCourses.length && !visibleCourses.some((cs) => cs.slug === state.slug)) {
    state.slug = visibleCourses[0].slug;
  }

  if (visibleCourses.length === 0) {
    strip.createEl("div", {
      text: state.courseScope === "archived" ? c(t, "LESSON_ARCHIVE_EMPTY") : "—",
      attr: { style: `padding:24px;color:${tk.faint};font-size:13px;` },
    });
  }

  for (const { slug, meta } of visibleCourses) {
    const sc = schemeFor(slug, meta, dark);
    const isActive = slug === state.slug;
    const prog = courseProgress(meta);
    const card = strip.createEl("div", {
      attr: {
        style:
          `${state.expanded ? "min-width:0;" : "flex-shrink:0;width:240px;"}border-radius:14px;padding:14px;cursor:pointer;position:relative;overflow:hidden;background:${cardBackground(slug, sc, dark)};` +
          `border:1px solid ${isActive ? sc.edge : tk.border};` +
          (isActive ? `box-shadow:0 0 0 1px ${sc.edge},0 4px 18px ${sc.edge}33;` : "") +
          "display:flex;flex-direction:column;gap:8px;transition:box-shadow .15s;",
      },
    });
    card.addEventListener("click", () => {
      state.slug = slug;
      // Picking a course from the expanded grid collapses back to the focused single-row view
      // so its lesson list shows immediately.
      if (state.expanded) state.expanded = false;
      refresh();
    });

    const top = card.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;position:relative;z-index:1;" } });
    top.createEl("div", {
      text: meta.icon,
      attr: {
        style:
          `width:42px;height:42px;border-radius:13px;background:${sc.icon};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;` +
          `box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 8px 18px ${sc.edge}22;`,
      },
    });
    const titleCol = top.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    titleCol.createEl("div", {
      text: meta.title,
      attr: {
        style:
          `min-height:36px;font-size:14px;font-weight:700;line-height:1.25;color:${tk.text};overflow:hidden;` +
          "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;",
        title: meta.title,
      },
    });
    titleCol.createEl("div", {
      text: K(c(t, "LESSON_COURSE_DONE"), { completed: prog.completed, total: prog.total }),
      attr: { style: `font-size:10px;color:${tk.muted};` },
    });
    const star = top.createEl("span", {
      text: meta.starred ? "★" : "☆",
      attr: { style: `flex-shrink:0;font-size:15px;cursor:pointer;color:${meta.starred ? "#f59e0b" : tk.faint};padding:2px;` },
    });
    star.addEventListener("click", async (e) => {
      e.stopPropagation();
      try { await toggleCourseStar(hub.app.vault.adapter, slug); refresh(); }
      catch (err) { console.error("EngramQuest: course star failed", err); }
    });

    if (meta.archived) {
      card.createEl("span", {
        text: c(t, "LESSON_ARCHIVED_BADGE"),
        attr: { style: `align-self:flex-start;font-size:9px;padding:2px 7px;border-radius:10px;background:${tk.pillIdleBg};color:${tk.pillIdleText};` },
      });
    }

    if (meta.tags.length) {
      const tagRow = card.createEl("div", { attr: { style: "display:flex;gap:4px;flex-wrap:wrap;" } });
      for (const tag of meta.tags.slice(0, 2)) {
        tagRow.createEl("span", {
          text: tag,
          attr: { style: `font-size:9px;padding:2px 7px;border-radius:10px;background:${tk.pillIdleBg};color:${tk.pillIdleText};` },
        });
      }
    }

    if (meta.description) {
      card.createEl("div", {
        text: meta.description,
        attr: { style: `font-size:11px;color:${tk.muted};line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;` },
      });
    }

    const barRow = card.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;margin-top:auto;" } });
    const track = barRow.createEl("div", {
      attr: { style: `flex:1;height:5px;border-radius:3px;background:${tk.track};overflow:hidden;` },
    });
    track.createEl("div", { attr: { style: `height:100%;width:${prog.pct}%;border-radius:3px;background:${sc.bar};` } });
    barRow.createEl("span", {
      text: prog.pct === 100 && prog.total > 0 ? "✓ 100%" : prog.pct + "%",
      attr: { style: prog.pct === 100 && prog.total > 0 ? "font-size:10px;color:#22c55e;font-weight:700;" : `font-size:10px;color:${tk.muted};` },
    });
  }

}

// Create-course form: name (required) + description + outline textarea (one lesson per line).
function openCreateCourseModal(hub, t, state, refresh) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.style.cssText = "width:min(94vw,480px);padding:0;border-radius:16px;overflow:hidden;";
  const wrap = modal.contentEl;
  wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:12px;";
  wrap.createEl("div", { text: c(t, "LESSON_CREATE_TITLE"), attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" } });

  const fieldStyle = "width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:13px;box-sizing:border-box;";
  const label = (txt) => wrap.createEl("div", { text: txt, attr: { style: "font-size:12px;color:var(--text-muted);margin-bottom:-6px;" } });

  label(c(t, "LESSON_CREATE_NAME_LABEL"));
  const nameInput = wrap.createEl("input", { attr: { type: "text", style: fieldStyle } });
  label(c(t, "LESSON_CREATE_DESC_LABEL"));
  const descInput = wrap.createEl("input", { attr: { type: "text", style: fieldStyle } });
  label(c(t, "LESSON_CREATE_OUTLINE_LABEL"));
  const outlineInput = wrap.createEl("textarea", {
    attr: { rows: "5", placeholder: c(t, "LESSON_CREATE_OUTLINE_PH"), style: fieldStyle + "resize:vertical;font-family:inherit;" },
  });

  const btnRow = wrap.createEl("div", { attr: { style: "display:flex;gap:8px;justify-content:flex-end;padding-top:4px;" } });
  btnRow.createEl("button", {
    text: c(t, "DELETE_CANCEL_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;font-size:13px;" },
  }).addEventListener("click", () => modal.close());
  const saveBtn = btnRow.createEl("button", {
    text: c(t, "LESSON_CREATE_SAVE"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:13px;font-weight:600;" },
  });
  saveBtn.addEventListener("click", async () => {
    const title = nameInput.value.trim();
    if (!title) { new I.Notice(c(t, "LESSON_CREATE_NAME_REQUIRED")); return; }
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    try {
      const { slug } = await createCourse(hub.app.vault.adapter, {
        title,
        description: descInput.value.trim(),
        outline: outlineInput.value.split("\n"),
      });
      state.slug = slug;
      modal.close();
      new I.Notice(c(t, "LESSON_CREATED"));
      refresh();
    } catch (e) {
      console.error("EngramQuest: course create failed", e);
      new I.Notice(c(t, "LESSON_CREATE_FAILED"));
      saveBtn.disabled = false;
    }
  });
  modal.open();
  nameInput.focus();
}

// ---------------------------------------------------------------------------------------------
// Lesson list (selected course)
// ---------------------------------------------------------------------------------------------

function renderLessonList(main, hub, t, tk, course, state, refresh) {
  const { slug, meta } = course;
  const adapter = hub.app.vault.adapter;

  const head = main.createEl("div", {
    attr: { style: "display:flex;align-items:center;gap:8px;margin:6px 0 10px;flex-wrap:wrap;" },
  });
  head.createEl("span", { text: "📖", attr: { style: "font-size:15px;" } });
  head.createEl("span", {
    text: K(c(t, "LESSON_CONTENT_OF"), { course: meta.title }),
    attr: {
      style:
        `flex:1 1 220px;min-width:220px;font-size:14px;font-weight:700;line-height:1.35;color:${tk.text};overflow:hidden;` +
        "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;",
      title: meta.title,
    },
  });

  // Status filter pills
  const filters = [
    { id: "all", label: c(t, "LESSON_FILTER_ALL") },
    { id: "todo", label: c(t, "LESSON_FILTER_TODO") },
    { id: "starred", label: "★" },
    { id: "done", label: c(t, "LESSON_FILTER_DONE") },
  ];
  const pillRow = head.createEl("div", { attr: { style: "display:flex;gap:4px;" } });
  for (const f of filters) {
    const on = state.filter === f.id;
    const pill = pillRow.createEl("button", {
      text: f.label,
      attr: {
        style:
          `font-size:11px;padding:4px 12px;border-radius:14px;border:none;cursor:pointer;` +
          (on ? "background:#6366f1;color:#fff;font-weight:600;" : `background:${tk.pillIdleBg};color:${tk.pillIdleText};`),
      },
    });
    pill.addEventListener("click", () => { state.filter = f.id; refresh(); });
  }

  // Import external HTML into this course
  const importBtn = head.createEl("button", {
    text: "📥 " + c(t, "LESSON_IMPORT"),
    attr: { style: `font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid ${tk.border};background:transparent;color:${tk.muted};cursor:pointer;` },
  });
  importBtn.addEventListener("click", () => pickAndImportHtml(hub, t, slug, refresh));

  const archiveBtn = head.createEl("button", {
    text: meta.archived ? c(t, "LESSON_UNARCHIVE") : c(t, "LESSON_ARCHIVE"),
    attr: {
      style: `font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid ${tk.border};background:transparent;color:${tk.muted};cursor:pointer;`,
      title: meta.archived ? c(t, "LESSON_UNARCHIVE_HINT") : c(t, "LESSON_ARCHIVE_HINT"),
    },
  });
  archiveBtn.addEventListener("click", async () => {
    try {
      const archived = await toggleCourseArchive(adapter, slug);
      new I.Notice(archived
        ? K(c(t, "LESSON_ARCHIVED_NOTICE"), { course: meta.title })
        : K(c(t, "LESSON_UNARCHIVED_NOTICE"), { course: meta.title }));
    } catch (e) {
      console.error("EngramQuest: course archive failed", e);
      new I.Notice(c(t, "LESSON_ARCHIVE_FAILED"));
    }
    refresh();
  });

  // Course delete (trash icon at far right of the header)
  const delCourse = head.createEl("button", {
    text: "🗑",
    attr: { style: `font-size:12px;padding:4px 8px;border-radius:8px;border:1px solid ${tk.border};background:transparent;color:${tk.muted};cursor:pointer;`, title: c(t, "DELETE") },
  });
  delCourse.addEventListener("click", () => confirmDeleteCourse(hub, t, slug, meta, refresh));

  // Rows
  const list = main.createEl("div", {
    attr: { style: `border:1px solid ${tk.border};border-radius:14px;overflow:hidden;background:${tk.row};` },
  });

  const visible = meta.lessons.filter((lesson) => {
    const status = lessonStatus(meta, lesson.id);
    const comp = lessonCompletion(meta, lesson.id);
    if (state.filter === "todo") return status !== "completed";
    if (state.filter === "done") return status === "completed";
    if (state.filter === "starred") return comp.starred;
    return true;
  });

  if (visible.length === 0) {
    list.createEl("div", {
      text: "—",
      attr: { style: `padding:20px;text-align:center;color:${tk.faint};font-size:13px;` },
    });
  }

  visible.forEach((lesson, vi) => {
    const idx = meta.lessons.indexOf(lesson);
    const status = lessonStatus(meta, lesson.id);
    const comp = lessonCompletion(meta, lesson.id);
    const sv = statusVisual(t, status, comp.starred);

    // Completed rows get a celebratory treatment (green edge + tint + badge) — a bare ✓ was
    // too easy to miss to feel like an accomplishment.
    const done = status === "completed";
    const baseBg = done ? "rgba(34,197,94,.07)" : "transparent";
    const row = list.createEl("div", {
      attr: {
        style:
          "display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;" +
          `border-left:3px solid ${done ? "#22c55e" : "transparent"};background:${baseBg};` +
          (vi > 0 ? `border-top:1px solid ${tk.border};` : ""),
      },
    });
    row.addEventListener("mouseenter", () => { row.style.background = tk.rowHover; });
    row.addEventListener("mouseleave", () => { row.style.background = baseBg; });
    row.addEventListener("click", () => {
      // Planned (outline-only) lessons have no HTML yet — explain instead of opening a viewer.
      if (!lesson.file) { new I.Notice(c(t, "LESSON_PLANNED_HINT")); return; }
      new LessonViewerModal(hub.app, hub.plugin, slug, meta, lesson, refresh).open();
    });

    row.createEl("span", {
      text: done ? "✓" : String(idx + 1).padStart(2, "0"),
      attr: {
        style:
          "flex-shrink:0;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;" +
          (done ? "background:#22c55e;color:#fff;font-size:14px;" : `background:${tk.badgeBg};color:${tk.badgeText};font-size:11px;`),
      },
    });

    const mid = row.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    const titleRow = mid.createEl("div", { attr: { style: "display:flex;align-items:center;gap:6px;" } });
    titleRow.createEl("span", {
      text: lesson.title,
      attr: {
        style:
          `flex:1;min-width:0;font-size:13px;font-weight:600;line-height:1.35;color:${tk.text};overflow:hidden;` +
          "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;",
        title: lesson.title,
      },
    });
    if (lesson.source === "import") {
      titleRow.createEl("span", {
        text: "📥 " + c(t, "LESSON_SOURCE_IMPORT"),
        attr: { style: `flex-shrink:0;font-size:9px;padding:1px 6px;border-radius:8px;background:${tk.pillIdleBg};color:${tk.pillIdleText};` },
      });
    }
    if (lesson.file) {
      mid.createEl("div", {
        text: lesson.file,
        attr: { style: `font-size:10px;color:${tk.faint};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` },
      });
    }

    if (done) {
      row.createEl("span", {
        text: (comp.starred ? "★ " : "✓ ") + sv.label,
        attr: { style: "flex-shrink:0;font-size:11px;font-weight:700;color:#22c55e;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.45);border-radius:99px;padding:3px 10px;" },
      });
    } else {
      row.createEl("span", { text: sv.icon, attr: { style: `flex-shrink:0;font-size:15px;color:${sv.color};` } });
      row.createEl("span", { text: sv.label, attr: { style: `flex-shrink:0;font-size:11px;color:${tk.muted};width:52px;` } });
    }

    const del = row.createEl("button", {
      text: "🗑",
      attr: { style: `flex-shrink:0;font-size:11px;padding:3px 6px;border-radius:6px;border:none;background:transparent;color:${tk.faint};cursor:pointer;`, title: c(t, "DELETE") },
    });
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDeleteLesson(hub, t, slug, lesson, refresh);
    });

    row.createEl("span", { text: "›", attr: { style: `flex-shrink:0;font-size:15px;color:${tk.faint};` } });
  });

  // "+ add outline item" — appends a planned lesson (title only) the Lesson Academy skill fills in later.
  const addRow = list.createEl("div", {
    attr: { style: `display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;color:${tk.muted};font-size:12px;border-top:1px solid ${tk.border};` },
  });
  addRow.createEl("span", { text: "＋" });
  addRow.createEl("span", { text: c(t, "LESSON_ADD_OUTLINE") });
  addRow.addEventListener("mouseenter", () => { addRow.style.background = tk.rowHover; });
  addRow.addEventListener("mouseleave", () => { addRow.style.background = "transparent"; });
  addRow.addEventListener("click", () => {
    if (addRow.querySelector("input")) return; // already editing — let clicks reach the input
    addRow.empty();
    const input = addRow.createEl("input", {
      attr: { type: "text", placeholder: c(t, "LESSON_ADD_OUTLINE_PH"), style: "flex:1;padding:5px 8px;border-radius:6px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal);font-size:12px;" },
    });
    input.focus();
    // Enter triggers keydown AND the subsequent blur — guard so the title is only committed once.
    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      const title = input.value.trim();
      if (!title) { refresh(); return; }
      try { await addPlannedLesson(adapter, slug, title); }
      catch (e) { console.error("EngramQuest: add outline failed", e); }
      refresh();
    };
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      if (ev.key === "Escape") { committed = true; refresh(); } // cancel — block the trailing blur-commit
    });
    input.addEventListener("blur", commit);
  });
}

// ---------------------------------------------------------------------------------------------
// Import flow — native file picker → read → importLesson
// ---------------------------------------------------------------------------------------------

function pickAndImportHtml(hub, t, slug, refresh) {
  const input = activeDocument.createElement("input");
  input.type = "file";
  input.accept = ".html,.htm";
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const name = file.name.replace(/\.html?$/i, "");
        const lesson = await importLesson(hub.app.vault.adapter, slug, String(reader.result || ""), name);
        if (lesson) {
          new I.Notice(K(c(t, "LESSON_IMPORTED"), { title: lesson.title }));
          refresh();
        } else {
          new I.Notice(c(t, "LESSON_IMPORT_FAILED"));
        }
      } catch (e) {
        console.error("EngramQuest: lesson import failed", e);
        new I.Notice(c(t, "LESSON_IMPORT_FAILED"));
      }
    };
    reader.onerror = () => new I.Notice(c(t, "LESSON_IMPORT_FAILED"));
    reader.readAsText(file);
  });
  input.click();
}

// ---------------------------------------------------------------------------------------------
// Delete confirmations (lesson / course) — same compact confirm modal as quadrant
// ---------------------------------------------------------------------------------------------

function confirmModal(hub, t, title, body, onConfirm) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.style.cssText = "width:min(92vw,420px);padding:0;border-radius:16px;overflow:hidden;";
  const wrap = modal.contentEl;
  wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:14px;";
  wrap.createEl("div", { text: title, attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" } });
  wrap.createEl("div", { text: body, attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;" } });
  const btnRow = wrap.createEl("div", { attr: { style: "display:flex;gap:8px;justify-content:flex-end;padding-top:4px;" } });
  btnRow.createEl("button", {
    text: c(t, "DELETE_CANCEL_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;font-size:13px;" },
  }).addEventListener("click", () => modal.close());
  const confirmBtn = btnRow.createEl("button", {
    text: c(t, "DELETE_CONFIRM_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:600;" },
  });
  confirmBtn.addEventListener("click", async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    modal.close();
    await onConfirm();
  });
  modal.open();
}

function confirmDeleteLesson(hub, t, slug, lesson, refresh) {
  confirmModal(hub, t,
    K(c(t, "DELETE_CONFIRM_TITLE"), { name: lesson.title }),
    c(t, "LESSON_DELETE_BODY"),
    async () => {
      try {
        await deleteLesson(hub.app.vault.adapter, slug, lesson.id);
        new I.Notice(c(t, "LESSON_DELETED"));
      } catch (e) {
        console.error("EngramQuest: lesson delete failed", e);
      }
      refresh();
    });
}

function confirmDeleteCourse(hub, t, slug, meta, refresh) {
  confirmModal(hub, t,
    K(c(t, "DELETE_CONFIRM_TITLE"), { name: meta.title }),
    K(c(t, "LESSON_DELETE_COURSE_BODY"), { count: meta.lessons.length }),
    async () => {
      try {
        await deleteCourse(hub.app.vault.adapter, slug);
        new I.Notice(c(t, "LESSON_COURSE_DELETED"));
      } catch (e) {
        console.error("EngramQuest: course delete failed", e);
      }
      refresh();
    });
}

// ---------------------------------------------------------------------------------------------
// Sidebar — donut, stat boxes, recent activity
// ---------------------------------------------------------------------------------------------

function renderSidebar(sidebar, hub, t, tk, courses, refresh) {
  const stats = overallStats(courses);

  sidebar.createEl("div", {
    text: c(t, "LESSON_PROGRESS_TITLE"),
    attr: { style: `font-size:13px;font-weight:700;color:${tk.text};margin-bottom:12px;` },
  });

  // Donut (SVG circle with stroke-dasharray)
  const R = 44, SW = 10, CIRC = 2 * Math.PI * R;
  const donutWrap = sidebar.createEl("div", {
    attr: { style: "position:relative;width:110px;height:110px;margin:0 auto 14px;" },
  });
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = donutWrap.ownerDocument.createElementNS(svgNs, "svg");
  svg.setAttribute("width", "110");
  svg.setAttribute("height", "110");
  svg.setAttribute("viewBox", "0 0 110 110");
  const mk = (stroke, dash) => {
    const ci = donutWrap.ownerDocument.createElementNS(svgNs, "circle");
    ci.setAttribute("cx", "55"); ci.setAttribute("cy", "55"); ci.setAttribute("r", String(R));
    ci.setAttribute("fill", "none"); ci.setAttribute("stroke", stroke);
    ci.setAttribute("stroke-width", String(SW)); ci.setAttribute("stroke-linecap", "round");
    if (dash != null) {
      ci.setAttribute("stroke-dasharray", `${dash} ${CIRC}`);
      ci.setAttribute("transform", "rotate(-90 55 55)");
    }
    svg.appendChild(ci);
    return ci;
  };
  mk(tk.track, null);
  mk("#6366f1", (stats.pct / 100) * CIRC);
  donutWrap.appendChild(svg);
  const center = donutWrap.createEl("div", {
    attr: { style: "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;" },
  });
  center.createEl("div", { text: stats.pct + "%", attr: { style: `font-size:20px;font-weight:800;color:${tk.text};` } });
  center.createEl("div", { text: c(t, "LESSON_PROGRESS_OVERALL"), attr: { style: `font-size:9px;color:${tk.muted};` } });

  // Stat boxes
  const statRow = sidebar.createEl("div", { attr: { style: "display:flex;gap:6px;margin-bottom:16px;" } });
  const statBox = (icon, num, label) => {
    const box = statRow.createEl("div", {
      attr: { style: `flex:1;text-align:center;padding:8px 2px;border-radius:10px;background:${tk.badgeBg};` },
    });
    box.createEl("div", { text: icon, attr: { style: "font-size:12px;" } });
    box.createEl("div", { text: String(num), attr: { style: `font-size:15px;font-weight:800;color:${tk.text};` } });
    box.createEl("div", { text: label, attr: { style: `font-size:8px;color:${tk.muted};line-height:1.3;` } });
  };
  statBox("📖", stats.coursesInProgress, c(t, "LESSON_STAT_IN_PROGRESS"));
  statBox("⭐", stats.coursesCompleted, c(t, "LESSON_STAT_COMPLETED"));
  statBox("🕐", stats.estimatedHours + "h", c(t, "LESSON_STAT_HOURS"));

  // Recent activity
  sidebar.createEl("div", {
    text: c(t, "LESSON_RECENT_TITLE"),
    attr: { style: `font-size:13px;font-weight:700;color:${tk.text};margin-bottom:8px;` },
  });
  const recents = recentLessons(courses, 5);
  if (recents.length === 0) {
    sidebar.createEl("div", {
      text: c(t, "LESSON_RECENT_EMPTY"),
      attr: { style: `font-size:11px;color:${tk.faint};line-height:1.5;` },
    });
    return;
  }
  for (const r of recents) {
    const sv = statusVisual(t, r.status, r.starred);
    const courseObj = courses.find((cs) => cs.slug === r.slug);
    const row = sidebar.createEl("div", {
      attr: { style: `display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:10px;cursor:pointer;margin-bottom:2px;` },
    });
    row.addEventListener("mouseenter", () => { row.style.background = tk.rowHover; });
    row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
    if (courseObj) {
      row.addEventListener("click", () => {
        new LessonViewerModal(hub.app, hub.plugin, r.slug, courseObj.meta, r.lesson, refresh).open();
      });
    }
    const col = row.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    col.createEl("div", {
      text: r.lesson.title,
      attr: { style: `font-size:11px;font-weight:600;color:${tk.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` },
    });
    col.createEl("div", {
      text: r.courseTitle,
      attr: { style: `font-size:9px;color:${tk.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` },
    });
    row.createEl("span", { text: sv.icon, attr: { style: `flex-shrink:0;font-size:12px;color:${sv.color};` } });
  }
}

module.exports = { renderLessonTab };
