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
  toggleCourseStar, importLesson, deleteLesson, deleteCourse,
  createCourse, addPlannedLesson,
  recentLessons, overallStats,
} = require("./data");
const { LessonViewerModal } = require("./viewer-modal");

// Per-course color schemes (picked by meta.colorScheme, else hashed from the slug).
const SCHEMES = {
  indigo: { dark: { bg: "#1a1d2e", icon: "#3730a3", bar: "#6366f1", edge: "#6366f1" }, light: { bg: "#eef2ff", icon: "#4f46e5", bar: "#6366f1", edge: "#6366f1" } },
  green:  { dark: { bg: "#0d1f18", icon: "#065f46", bar: "#10b981", edge: "#10b981" }, light: { bg: "#ecfdf5", icon: "#059669", bar: "#10b981", edge: "#059669" } },
  amber:  { dark: { bg: "#1c1710", icon: "#92400e", bar: "#f59e0b", edge: "#f59e0b" }, light: { bg: "#fffbeb", icon: "#d97706", bar: "#f59e0b", edge: "#d97706" } },
  rose:   { dark: { bg: "#1f0d10", icon: "#9f1239", bar: "#f43f5e", edge: "#f43f5e" }, light: { bg: "#fff1f2", icon: "#e11d48", bar: "#f43f5e", edge: "#e11d48" } },
  cyan:   { dark: { bg: "#0a1a1f", icon: "#164e63", bar: "#06b6d4", edge: "#06b6d4" }, light: { bg: "#ecfeff", icon: "#0891b2", bar: "#06b6d4", edge: "#0891b2" } },
};
const SCHEME_KEYS = Object.keys(SCHEMES);

function schemeFor(slug, meta, dark) {
  let key = meta.colorScheme;
  if (!SCHEMES[key]) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    key = SCHEME_KEYS[h % SCHEME_KEYS.length];
  }
  return SCHEMES[key][dark ? "dark" : "light"];
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

  // Tab-level UI state survives refreshes within the session (selected course + lesson filter).
  hub._lessonState = hub._lessonState || { slug: null, filter: "all" };
  const state = hub._lessonState;
  if (!courses.some((cs) => cs.slug === state.slug)) {
    state.slug = courses.length ? courses[0].slug : null;
  }

  const refresh = () => { content.empty(); renderLessonTab(content, hub); };

  const dark = isDarkMode();
  const tk = themeTokens(dark);

  if (courses.length === 0) {
    renderEmptyState(content, t, tk);
    return;
  }

  const layout = content.createEl("div", {
    attr: { style: "display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;" },
  });
  const main = layout.createEl("div", { attr: { style: "flex:1;min-width:320px;" } });
  const sidebar = layout.createEl("div", {
    attr: { style: `width:210px;flex-shrink:0;background:${tk.panel};border:1px solid ${tk.border};border-radius:14px;padding:16px;` },
  });

  renderHeader(main, t, tk);
  renderCourseCards(main, hub, t, tk, dark, courses, state, refresh);
  const selected = courses.find((cs) => cs.slug === state.slug);
  if (selected) renderLessonList(main, hub, t, tk, selected, state, refresh);
  renderSidebar(sidebar, hub, t, tk, courses, refresh);
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

function renderHeader(main, t, tk) {
  const head = main.createEl("div", { attr: { style: "margin-bottom:14px;" } });
  const row = head.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;" } });
  row.createEl("span", { text: "🎓", attr: { style: "font-size:22px;" } });
  row.createEl("span", {
    text: c(t, "LESSON_ACADEMY_TITLE"),
    attr: { style: `font-size:19px;font-weight:800;color:${tk.text};letter-spacing:0.5px;` },
  });
  head.createEl("div", {
    text: c(t, "LESSON_ACADEMY_SUBTITLE"),
    attr: { style: `font-size:12px;color:${tk.muted};margin-top:2px;` },
  });
}

// ---------------------------------------------------------------------------------------------
// Course cards (horizontal strip)
// ---------------------------------------------------------------------------------------------

function renderCourseCards(main, hub, t, tk, dark, courses, state, refresh) {
  const strip = main.createEl("div", {
    attr: { style: "display:flex;gap:12px;overflow-x:auto;padding:4px 2px 12px;" },
  });

  for (const { slug, meta } of courses) {
    const sc = schemeFor(slug, meta, dark);
    const isActive = slug === state.slug;
    const prog = courseProgress(meta);
    const card = strip.createEl("div", {
      attr: {
        style:
          `flex-shrink:0;width:200px;border-radius:14px;padding:14px;cursor:pointer;background:${sc.bg};` +
          `border:1px solid ${isActive ? sc.edge : tk.border};` +
          (isActive ? `box-shadow:0 0 0 1px ${sc.edge},0 4px 18px ${sc.edge}33;` : "") +
          "display:flex;flex-direction:column;gap:8px;transition:box-shadow .15s;",
      },
    });
    card.addEventListener("click", () => { state.slug = slug; refresh(); });

    const top = card.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;" } });
    top.createEl("div", {
      text: meta.icon,
      attr: { style: `width:34px;height:34px;border-radius:10px;background:${sc.icon};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;` },
    });
    const titleCol = top.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    titleCol.createEl("div", {
      text: meta.title,
      attr: { style: `font-size:14px;font-weight:700;color:${tk.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`, title: meta.title },
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
    barRow.createEl("span", { text: prog.pct + "%", attr: { style: `font-size:10px;color:${tk.muted};` } });
  }

  // "+ new course" — opens the create-course form (title + optional outline). The course shell
  // and its planned lessons are written immediately; the Teach skill fills in content later.
  const add = strip.createEl("div", {
    attr: {
      style: `flex-shrink:0;width:140px;border-radius:14px;border:1px dashed ${tk.border};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:${tk.muted};padding:14px;`,
      title: c(t, "LESSON_NEW_COURSE_HINT"),
    },
  });
  add.createEl("div", { text: "＋", attr: { style: "font-size:22px;" } });
  add.createEl("div", { text: c(t, "LESSON_NEW_COURSE"), attr: { style: "font-size:11px;" } });
  add.addEventListener("click", () => openCreateCourseModal(hub, t, state, refresh));
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
    attr: { style: `flex:1;min-width:0;font-size:14px;font-weight:700;color:${tk.text};` },
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

    const row = list.createEl("div", {
      attr: {
        style:
          "display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;" +
          (vi > 0 ? `border-top:1px solid ${tk.border};` : ""),
      },
    });
    row.addEventListener("mouseenter", () => { row.style.background = tk.rowHover; });
    row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
    row.addEventListener("click", () => {
      // Planned (outline-only) lessons have no HTML yet — explain instead of opening a viewer.
      if (!lesson.file) { new I.Notice(c(t, "LESSON_PLANNED_HINT")); return; }
      new LessonViewerModal(hub.app, hub.plugin, slug, meta, lesson, refresh).open();
    });

    row.createEl("span", {
      text: String(idx + 1).padStart(2, "0"),
      attr: { style: `flex-shrink:0;width:30px;height:30px;border-radius:8px;background:${tk.badgeBg};color:${tk.badgeText};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;` },
    });

    const mid = row.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    const titleRow = mid.createEl("div", { attr: { style: "display:flex;align-items:center;gap:6px;" } });
    titleRow.createEl("span", {
      text: lesson.title,
      attr: { style: `font-size:13px;font-weight:600;color:${tk.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` },
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

    row.createEl("span", { text: sv.icon, attr: { style: `flex-shrink:0;font-size:15px;color:${sv.color};` } });
    row.createEl("span", { text: sv.label, attr: { style: `flex-shrink:0;font-size:11px;color:${tk.muted};width:52px;` } });

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

  // "+ add outline item" — appends a planned lesson (title only) the Teach skill fills in later.
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
    const commit = async () => {
      const title = input.value.trim();
      if (!title) { refresh(); return; }
      try { await addPlannedLesson(adapter, slug, title); }
      catch (e) { console.error("EngramQuest: add outline failed", e); }
      refresh();
    };
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      if (ev.key === "Escape") refresh();
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
