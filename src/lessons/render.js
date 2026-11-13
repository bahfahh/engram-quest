"use strict";
// Hub "Lessons" page: course cards, the selected course's lessons, and a progress side panel.
// modal.js holds only a thin _renderLessonTab delegate to renderLessonTab().

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const {
  listCourses, lessonCompletion, lessonStatus, courseProgress,
  toggleCourseStar, toggleCourseArchive, importLesson, deleteLesson, deleteCourse,
  createCourse, addPlannedLesson,
  recentLessons, overallStats,
} = require("./data");
const { LessonViewerModal, CanvasLessonModal } = require("./viewer-modal");
const ui = require("../hub/ui");

// How a lesson's status reads on its row. Planned lessons have no content yet.
function statusVisual(t, status) {
  if (status === "planned") return { icon: "circle-dash", tone: "", label: c(t, "LESSON_STATUS_PLANNED") };
  if (status === "completed") return { icon: "circle-check", tone: "tm", label: c(t, "LESSON_STATUS_DONE") };
  if (status === "viewed") return { icon: "circle", tone: "tl", label: c(t, "LESSON_STATUS_VIEWED") };
  return { icon: "circle", tone: "", label: c(t, "LESSON_STATUS_NEW") };
}

async function renderLessonTab(content, hub) {
  const t = hub.plugin.settings;
  const gen = hub._tabGen;
  const courses = await listCourses(hub.app.vault.adapter);
  if (hub._tabGen !== gen) return;
  content.empty();
  ui.clearCapsuleActions(hub);

  // Selection, lesson filter, search and panel state last for this Hub session. The course
  // filter and sort choices also persist via settings._lessonCourseView.
  if (!hub._lessonState) {
    const saved = hub.plugin.settings._lessonCourseView || {};
    hub._lessonState = {
      slug: null, filter: "all", courseQuery: "", expanded: false,
      sideOpen: activeDocument.defaultView.innerWidth >= 1040,
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

  const stats = overallStats(scopedCourses);
  (hub._entryHints = hub._entryHints || {}).lesson = courses.length ? `${stats.pct}%` : "";
  hub._learnSummary = courses.length ? K(c(t, "LEARN_SUMMARY"), { count: stats.coursesInProgress, percent: stats.pct }) : "";

  const refresh = () => renderLessonTab(content, hub);

  if (courses.length === 0) {
    ui.pageHeader(content, hub, { titleKey: "TAB_LESSON", guide: "lesson" });
    ui.emptyState(content, { iconName: "book", title: c(t, "LESSON_NO_COURSES_TITLE"), body: c(t, "LESSON_NO_COURSES_BODY") });
    return;
  }

  renderHeader(content, hub, t, scopedCourses, state, refresh);
  const showSide = !state.expanded && (state.sideOpen || ui.isPhone());
  addSideToggle(hub, t, state, refresh);

  const layout = content.createEl("div", { cls: "lh-lwrap" });
  const main = layout.createEl("div", { cls: "lh-scroll lh-lmain" });
  renderCourseCards(main, hub, t, courses, scopedCourses, state, refresh);
  // Only list lessons for a course whose card is visible. "Show all" is a pure course picker.
  const selected = scopedCourses.find(
    (cs) => cs.slug === state.slug &&
      matchesCourseQuery(cs.meta, state.courseQuery) &&
      matchesCourseTag(cs.meta, state.courseTag) &&
      matchesCourseProg(cs.meta, state.courseProg)
  );
  if (selected && !state.expanded) renderLessonList(main, hub, t, selected, state, refresh);
  if (showSide) renderSidebar(layout.createEl("div", { cls: "lh-lside" }), hub, t, scopedCourses, stats, refresh);
}

function addSideToggle(hub, t, state, refresh) {
  if (ui.isPhone() || state.expanded || !hub.capsuleEl) return;
  const label = c(t, state.sideOpen ? "LESSON_HIDE_PROGRESS" : "LESSON_SHOW_PROGRESS");
  const btn = ui.iconButton(hub.capsuleEl, "sidebar", label, () => { state.sideOpen = !state.sideOpen; refresh(); }, "lh-ib lh-cap-x");
  btn.setAttribute("aria-pressed", String(state.sideOpen));
  hub.capsuleEl.prepend(btn);
}

function renderHeader(parent, hub, t, courses, state, refresh) {
  const { right } = ui.pageHeader(parent, hub, { titleKey: "TAB_LESSON", guide: "lesson" });
  const actions = right();
  if (courses.length >= 2) {
    ui.primaryButton(actions, c(t, state.expanded ? "LESSON_COLLAPSE" : "LESSON_EXPAND_ALL"), () => {
      state.expanded = !state.expanded;
      refresh();
    }, { alt: true, small: true });
  }
  const add = ui.primaryButton(actions, c(t, "LESSON_NEW_COURSE"), () => openCreateCourseModal(hub, t, state, refresh), { small: true, icon: "plus" });
  add.title = c(t, "LESSON_NEW_COURSE_HINT");
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

// Search, category, progress, sort and scope above the course cards.
function renderCourseFilterRow(main, hub, t, courses, state, refresh) {
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
  // A persisted tag may no longer exist; fall back to "all" instead of hiding every card.
  if (state.courseTag !== "all" && state.courseTag !== "starred" && !counts.has(state.courseTag)) {
    state.courseTag = "all";
    saveCourseView(hub, state);
  }

  const bar = main.createEl("div", { cls: "lh-tb lh-lfilters" });
  if (scopedCourses.length >= 6 || state.courseQuery) {
    const search = ui.searchBox(bar, {
      placeholder: c(t, "LESSON_SEARCH_PH"), value: state.courseQuery || "", width: ui.isPhone() ? null : 130,
      onInput: (v) => { state.courseQuery = v; state._searchFocus = true; refresh(); },
    });
    if (state._searchFocus) {
      state._searchFocus = false; // typing re-renders the page, so the new input takes the focus
      window.setTimeout(() => { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }, 0);
    }
  }
  const persist = async () => { await saveCourseView(hub, state); refresh(); };
  ui.filterSelect(bar, [["all", c(t, "LESSON_CFILTER_TAG_ALL")], ["starred", c(t, "LESSON_CFILTER_STARRED")], ...tags.map(tag => [tag, tag])], state.courseTag, (v) => { state.courseTag = v; persist(); });
  ui.filterSelect(bar, [["all", c(t, "LESSON_CFILTER_PROG_ALL")], ["new", c(t, "LESSON_CFILTER_PROG_NEW")], ["doing", c(t, "LESSON_CFILTER_PROG_DOING")], ["done", c(t, "LESSON_CFILTER_PROG_DONE")]], state.courseProg, (v) => { state.courseProg = v; persist(); });
  ui.filterSelect(bar, [["recent", c(t, "LESSON_CSORT_RECENT")], ["created", c(t, "LESSON_CSORT_CREATED")], ["progress", c(t, "LESSON_CSORT_PROGRESS")]], state.courseSort, (v) => { state.courseSort = v; persist(); }, { sort: true });
  if (archivedCount > 0 || state.courseScope === "archived") {
    ui.filterSelect(bar, [["active", c(t, "LESSON_SCOPE_ACTIVE")], ["archived", c(t, "LESSON_SCOPE_ARCHIVED")]], state.courseScope, (v) => {
      state.courseScope = v;
      state.courseTag = "all";
      state.courseProg = "all";
      state.slug = null;
      persist();
    });
  }
  if (state.courseTag !== "all" || state.courseProg !== "all" || state.courseQuery) {
    bar.createEl("button", { cls: "lh-link", text: c(t, "LESSON_CLEAR_FILTERS") }).addEventListener("click", () => {
      state.courseTag = "all";
      state.courseProg = "all";
      state.courseQuery = "";
      persist();
    });
  }
}

function renderCourseCard(strip, hub, t, course, state, refresh) {
  const { slug, meta } = course;
  const prog = courseProgress(meta);
  const card = strip.createEl("div", { cls: "lh-cc" + (slug === state.slug ? " sel" : "") });
  card.addEventListener("click", () => {
    state.slug = slug;
    // Picking from the expanded grid collapses it so the lesson list shows immediately.
    state.expanded = false;
    refresh();
  });
  card.createEl("div", { cls: "lh-cc-em", text: meta.icon });
  const star = card.createEl("button", { cls: "lh-cc-st", text: meta.starred ? "★" : "☆", attr: { "aria-label": c(t, "FILTER_STARRED"), "aria-pressed": String(!!meta.starred) } });
  star.classList.toggle("on", !!meta.starred);
  star.addEventListener("click", async (e) => {
    e.stopPropagation();
    try { await toggleCourseStar(hub.app.vault.adapter, slug); refresh(); }
    catch (err) { console.error("EngramQuest: course star failed", err); }
  });
  card.createEl("div", { cls: "lh-cc-nm", text: meta.title, attr: { title: meta.title } });
  if (meta.archived) card.createEl("span", { cls: "lh-xbadge lh-cc-tag", text: c(t, "LESSON_ARCHIVED_BADGE") });
  if (state.expanded && meta.tags.length) {
    const tags = card.createEl("div", { cls: "lh-cc-tags" });
    meta.tags.slice(0, 2).forEach(tag => tags.createEl("span", { cls: "lh-xbadge", text: tag }));
  }
  if (state.expanded && meta.description) card.createEl("div", { cls: "lh-cc-desc", text: meta.description });
  card.createEl("div", { cls: "lh-cc-done", text: K(c(t, "LESSON_COURSE_DONE"), { completed: prog.completed, total: prog.total }) });
  ui.track(card, prog.pct, prog.pct === 100 && prog.total > 0);
}

function renderCourseCards(main, hub, t, courses, scopedCourses, state, refresh) {
  // Also shown below 2 courses whenever a filter is active: a saved filter must never be in
  // effect while its only escape control is hidden.
  if (courses.length >= 2 || state.courseTag !== "all" || state.courseProg !== "all" || state.courseQuery || courses.some(({ meta }) => meta.archived)) {
    renderCourseFilterRow(main, hub, t, courses, state, refresh);
  }
  const strip = main.createEl("div", { cls: state.expanded ? "lh-cgrid" : "lh-cstrip" });

  // Sort means exactly what the control says; starred is a filter and a card marker only.
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
  // If the filters hide the selected course, follow the first match so the list below matches.
  if (visibleCourses.length && !visibleCourses.some((cs) => cs.slug === state.slug)) {
    state.slug = visibleCourses[0].slug;
  }
  if (visibleCourses.length === 0) {
    strip.createEl("div", { cls: "lh-pth lh-cempty", text: state.courseScope === "archived" ? c(t, "LESSON_ARCHIVE_EMPTY") : c(t, "EMPTY_FILTERED_DECKS") });
  }
  visibleCourses.forEach(course => renderCourseCard(strip, hub, t, course, state, refresh));
  // Every refresh rebuilds the strip, so bring the selected card back into view.
  const selectedCard = strip.querySelector(".sel");
  if (selectedCard && !state.expanded) strip.scrollLeft = Math.max(0, selectedCard.offsetLeft - strip.offsetLeft - 24);
}

function openCreateCourseModal(hub, t, state, refresh) {
  const modal = ui.themedModal(new I.Modal(hub.app));
  modal.modalEl.addClass("lh-confirm");
  const wrap = modal.contentEl;
  wrap.addClass("lh-lform");
  wrap.createEl("div", { cls: "lh-confirm-title", text: c(t, "LESSON_CREATE_TITLE") });
  const field = (key, tag, attr) => {
    const box = wrap.createEl("label");
    box.createEl("span", { text: c(t, key) });
    return box.createEl(tag, { attr });
  };
  const nameInput = field("LESSON_CREATE_NAME_LABEL", "input", { type: "text" });
  const descInput = field("LESSON_CREATE_DESC_LABEL", "input", { type: "text" });
  const outlineInput = field("LESSON_CREATE_OUTLINE_LABEL", "textarea", { rows: "5", placeholder: c(t, "LESSON_CREATE_OUTLINE_PH") });

  const row = wrap.createEl("div", { cls: "lh-confirm-acts" });
  row.createEl("button", { cls: "lh-btn alt", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const saveBtn = row.createEl("button", { cls: "lh-btn", text: c(t, "LESSON_CREATE_SAVE") });
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

function openLesson(hub, slug, meta, lesson, refresh) {
  // The iframe viewer can't render .canvas, so canvas lessons get the thin jump modal.
  if (lesson.type === "canvas") {
    new CanvasLessonModal(hub.app, hub.plugin, slug, meta, lesson, refresh, hub).open();
    return;
  }
  new LessonViewerModal(hub.app, hub.plugin, slug, meta, lesson, refresh).open();
}

function renderCourseHead(main, hub, t, course, state, refresh) {
  const { slug, meta } = course;
  const head = main.createEl("div", { cls: "lh-chead" });
  head.createEl("div", { cls: "lh-ct", text: meta.title, attr: { title: meta.title } });
  ui.segmented(head, [
    { value: "all", label: c(t, "LESSON_FILTER_ALL") },
    { value: "todo", label: c(t, "LESSON_FILTER_TODO") },
    { value: "starred", label: "★", title: c(t, "FILTER_STARRED") },
    { value: "done", label: c(t, "LESSON_FILTER_DONE") },
  ], state.filter, (v) => { state.filter = v; refresh(); });
  ui.primaryButton(head, c(t, "LESSON_IMPORT"), () => pickAndImportHtml(hub, t, slug, refresh), { alt: true, small: true, icon: "upload" });
  const archive = ui.primaryButton(head, meta.archived ? c(t, "LESSON_UNARCHIVE") : c(t, "LESSON_ARCHIVE"), async () => {
    try {
      const archived = await toggleCourseArchive(hub.app.vault.adapter, slug);
      new I.Notice(K(c(t, archived ? "LESSON_ARCHIVED_NOTICE" : "LESSON_UNARCHIVED_NOTICE"), { course: meta.title }));
    } catch (e) {
      console.error("EngramQuest: course archive failed", e);
      new I.Notice(c(t, "LESSON_ARCHIVE_FAILED"));
    }
    refresh();
  }, { alt: true, small: true, icon: "archive" });
  archive.title = c(t, meta.archived ? "LESSON_UNARCHIVE_HINT" : "LESSON_ARCHIVE_HINT");
  ui.iconButton(head, "trash", c(t, "DELETE"), () => confirmDeleteCourse(hub, t, slug, meta, refresh), "lh-ib lh-ib-sm");
}

function renderLessonRow(list, hub, t, course, lesson, refresh) {
  const { slug, meta } = course;
  const comp = lessonCompletion(meta, lesson.id);
  const visual = statusVisual(t, lessonStatus(meta, lesson.id));
  const row = list.createEl("div", { cls: "lh-ls", attr: lesson.file ? { title: lesson.file } : {} });
  row.addEventListener("click", () => {
    // Planned (outline-only) lessons have no content yet.
    if (!lesson.file) { new I.Notice(c(t, "LESSON_PLANNED_HINT")); return; }
    openLesson(hub, slug, meta, lesson, refresh);
  });
  ui.icon(row.createEl("span", { cls: `lh-lic ${visual.tone}` }), visual.icon);
  const mid = row.createEl("div", { cls: "lh-grow" });
  const title = mid.createEl("div", { cls: "lh-xpt" });
  title.createEl("span", { cls: "lh-ls-t", text: lesson.title, attr: { title: lesson.title } });
  if (lesson.type === "canvas") title.createEl("span", { cls: "lh-xbadge", text: c(t, "LESSON_TYPE_CANVAS") });
  if (lesson.source === "import") title.createEl("span", { cls: "lh-xbadge", text: c(t, "LESSON_SOURCE_IMPORT") });
  if (typeof lesson.goal === "string" && lesson.goal.trim()) {
    mid.createEl("div", { cls: "lh-ls-goal", text: lesson.goal, attr: { title: lesson.goal } });
  }
  if (comp.starred) ui.icon(row.createEl("span", { cls: "lh-xstar", attr: { "aria-label": c(t, "FILTER_STARRED") } }), "star");
  row.createEl("span", { cls: "lh-st " + (visual.tone || (lesson.file ? "td" : "")), text: visual.label });
  ui.rowActions(row, [{ name: "trash", label: c(t, "DELETE"), run: () => confirmDeleteLesson(hub, t, slug, lesson, refresh) }]);
  // A planned lesson has nothing to open yet, so it gets no "open" chevron.
  const chev = row.createEl("span", { cls: "lh-ls-chev" });
  if (lesson.file) ui.icon(chev, "chevron");
}

// Appends a planned lesson (title only) that the Lesson Academy skill fills in later.
function renderAddOutline(list, hub, t, slug, refresh) {
  const row = list.createEl("div", { cls: "lh-ls lh-ladd" });
  ui.icon(row.createEl("span", { cls: "lh-lic" }), "plus");
  row.createEl("span", { cls: "lh-ls-t", text: c(t, "LESSON_ADD_OUTLINE") });
  row.addEventListener("click", () => {
    if (row.querySelector("input")) return; // already editing
    row.empty();
    const input = row.createEl("input", { attr: { type: "text", placeholder: c(t, "LESSON_ADD_OUTLINE_PH") } });
    // Off: an HTML lesson (default). On: a canvas concept-map step the skill generates as .canvas.
    // mousedown + preventDefault so clicking it doesn't blur-commit the title.
    let asCanvas = false;
    const typeBtn = ui.iconButton(row, "map", c(t, "LESSON_TYPE_CANVAS"), () => {}, "lh-ib lh-ib-sm");
    typeBtn.setAttribute("aria-pressed", "false");
    typeBtn.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      asCanvas = !asCanvas;
      typeBtn.classList.toggle("on", asCanvas);
      typeBtn.setAttribute("aria-pressed", String(asCanvas));
    });
    input.focus();
    // Enter triggers keydown AND the subsequent blur; commit the title only once.
    let committed = false;
    const commit = async () => {
      if (committed) return;
      committed = true;
      const title = input.value.trim();
      if (!title) { refresh(); return; }
      try { await addPlannedLesson(hub.app.vault.adapter, slug, title, asCanvas ? "canvas" : "html"); }
      catch (e) { console.error("EngramQuest: add outline failed", e); }
      refresh();
    };
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      if (ev.key === "Escape") { committed = true; refresh(); }
    });
    input.addEventListener("blur", commit);
  });
}

function renderLessonList(main, hub, t, course, state, refresh) {
  const { slug, meta } = course;
  renderCourseHead(main, hub, t, course, state, refresh);
  const list = main.createEl("div", { cls: "lh-tbl lh-lslist" });
  const visible = meta.lessons.filter((lesson) => {
    const status = lessonStatus(meta, lesson.id);
    if (state.filter === "todo") return status !== "completed";
    if (state.filter === "done") return status === "completed";
    if (state.filter === "starred") return lessonCompletion(meta, lesson.id).starred;
    return true;
  });
  if (visible.length === 0) list.createEl("div", { cls: "lh-empty2", text: "—" });
  visible.forEach(lesson => renderLessonRow(list, hub, t, course, lesson, refresh));
  renderAddOutline(list, hub, t, slug, refresh);
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

function confirmDeleteLesson(hub, t, slug, lesson, refresh) {
  ui.confirmDialog(hub.app, t, {
    title: K(c(t, "DELETE_CONFIRM_TITLE"), { name: lesson.title }),
    body: c(t, "LESSON_DELETE_BODY"),
    onConfirm: async () => {
      try {
        await deleteLesson(hub.app.vault.adapter, slug, lesson.id);
        new I.Notice(c(t, "LESSON_DELETED"));
      } catch (e) {
        console.error("EngramQuest: lesson delete failed", e);
      }
      refresh();
    },
  });
}

function confirmDeleteCourse(hub, t, slug, meta, refresh) {
  ui.confirmDialog(hub.app, t, {
    title: K(c(t, "DELETE_CONFIRM_TITLE"), { name: meta.title }),
    body: K(c(t, "LESSON_DELETE_COURSE_BODY"), { count: meta.lessons.length }),
    onConfirm: async () => {
      try {
        await deleteCourse(hub.app.vault.adapter, slug);
        new I.Notice(c(t, "LESSON_COURSE_DELETED"));
      } catch (e) {
        console.error("EngramQuest: course delete failed", e);
      }
      refresh();
    },
  });
}

function renderSidebar(side, hub, t, courses, stats, refresh) {
  const panel = side.createEl("div", { cls: "lh-pnl" });
  panel.createEl("div", { cls: "lh-pnl-t", text: c(t, "LESSON_PROGRESS_TITLE") });
  const center = ui.donut(panel, [{ pct: stats.pct, color: "bar" }], { size: 110, stroke: 20 });
  center.createEl("b", { text: `${stats.pct}%` });
  const rows = panel.createEl("div", { cls: "lh-rws" });
  [
    { label: c(t, "LESSON_STAT_IN_PROGRESS"), value: stats.coursesInProgress, tone: "tl" },
    { label: c(t, "LESSON_STAT_COMPLETED"), value: stats.coursesCompleted, tone: "tm" },
    { label: c(t, "LESSON_STAT_HOURS"), value: `${stats.estimatedHours}h` },
  ].forEach(({ label, value, tone }) => {
    const row = rows.createEl("div", { cls: "lh-rw" });
    row.createEl("span", { text: label, cls: tone && Number(value) > 0 ? tone : "" });
    row.createEl("b", { text: String(value) });
  });

  const recent = side.createEl("div", { cls: "lh-pnl lh-pnl-fill" });
  recent.createEl("div", { cls: "lh-pnl-t", text: c(t, "LESSON_RECENT_TITLE") });
  const items = recentLessons(courses, 5);
  if (items.length === 0) {
    recent.createEl("div", { cls: "lh-pth", text: c(t, "LESSON_RECENT_EMPTY") });
    return;
  }
  items.forEach((item) => {
    const course = courses.find((cs) => cs.slug === item.slug);
    const row = recent.createEl("div", { cls: "lh-rec" });
    row.createEl("b", { text: item.lesson.title, attr: { title: item.lesson.title } });
    row.createEl("span", { text: item.courseTitle });
    if (course) row.addEventListener("click", () => openLesson(hub, item.slug, course.meta, item.lesson, refresh));
  });
}

module.exports = { renderLessonTab };
