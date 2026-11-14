"use strict";
// Lesson viewer modal. Embeds a course lesson's self-contained HTML in a sandboxed iframe
// (same srcdoc + postMessage embed as the explainer viewer modal).
// Opening auto-marks the lesson as viewed; the footer lets the user toggle done / star, which
// patch the course's meta.json via the lessons data layer.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale: _getLocale } = require("../i18n");
const { LESSONS_DIR, markLesson, lessonCompletion, lessonTitle } = require("./data");

// Hub UI helpers, loaded lazily: hub/ui pulls in the feature guide, which pulls in this file's callers.
function hubUi() { return require("../hub/ui"); }

const W = I.moment;
function L(s) { return _getLocale(s, W && W.locale && W.locale()); }

// Render-time mobile rescue appended to the lesson srcdoc: most generated/imported lessons use
// fixed multi-column grids with no @media query, so on narrow viewports CJK text wraps one
// character per line. When the viewport is ≤600px, any grid whose columns would be thinner than
// 180px is collapsed to a single column (and restored when widened). Display-only — the lesson
// file on disk is never modified, and natively responsive lessons (already 1 column) are untouched.
// A lesson built on the house style (body.lz, skills/lesson-academy/assets/lesson-base.css) lays out
// its own narrow grids on purpose — a row of dots, a three-part figure — so it is left alone.
const MOBILE_GRID_FIX = `
<script>
(function () {
  var NARROW = 600, MIN_COL = 180, touched = [];
  function fix() {
    if (document.body && document.body.classList.contains("lz")) return;
    if ((window.innerWidth || 0) > NARROW) {
      touched.forEach(function (el) { el.style.gridTemplateColumns = ""; });
      touched = [];
      return;
    }
    var all = document.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i], s = getComputedStyle(el);
      if (s.display !== "grid") continue;
      var cols = (s.gridTemplateColumns || "").split(" ").filter(Boolean).length;
      if (cols > 1 && el.clientWidth / cols < MIN_COL) {
        el.style.gridTemplateColumns = "1fr";
        if (touched.indexOf(el) < 0) touched.push(el);
      }
    }
  }
  window.addEventListener("resize", fix);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fix);
  else fix();
})();
<\/script>`;

// Shared modal footer: "course · lesson" label + star/done toggles that flip in place.
// `mark` persists the completion patch (both modals route it through their serialized _mark).
function buildCompletionFooter(parentEl, t, meta, lesson, mark) {
  const completion = lessonCompletion(meta, lesson.id);
  const footer = parentEl.createEl("div", {
    attr: { style: "display:flex;align-items:center;gap:8px;padding:0 2px;" },
  });
  footer.createEl("span", {
    text: meta.title + " · " + lessonTitle(lesson),
    attr: { style: "flex:1;min-width:0;font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" },
  });

  // Two toggles. The pressed state is a tinted face plus aria-pressed, not a full colour fill.
  const toggle = () => footer.createEl("button", { cls: "lh-btn alt lh-vtog", attr: { "aria-pressed": "false" } });
  const paintToggle = (btn, on, glyph, label) => {
    btn.empty();
    hubUi().icon(btn, glyph);
    btn.createSpan({ text: label });
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
  };

  const starBtn = toggle();
  starBtn.classList.add("is-star");
  const paintStar = (on) => paintToggle(starBtn, on, "star", c(t, "LESSON_MARK_STAR"));
  paintStar(completion.starred);
  let starred = completion.starred;
  starBtn.addEventListener("click", () => {
    starred = !starred;
    paintStar(starred);
    mark({ starred });
  });

  const doneBtn = toggle();
  const paintDone = (on) => paintToggle(doneBtn, on, on ? "circle-check" : "circle", c(t, on ? "LESSON_MARKED_DONE" : "LESSON_MARK_DONE"));
  paintDone(completion.completed);
  let completed = completion.completed;
  doneBtn.addEventListener("click", () => {
    completed = !completed;
    paintDone(completed);
    mark({ completed });
  });
  return footer;
}

class LessonViewerModal extends I.Modal {
  constructor(app, plugin, slug, meta, lesson, onDone) {
    super(app);
    this.plugin = plugin;
    this.slug = slug;
    this.meta = meta;
    this.lesson = lesson;
    this.onDone = onDone;
    this._handler = null;
    this._isOpen = false;
    this._iframe = null;
    this._changed = false;
    // Serializes meta.json writes: markLesson is read-modify-write, so two quick clicks
    // (e.g. star then done) racing each other would drop the first patch.
    this._saving = Promise.resolve();
  }

  _mark(patch) {
    this._changed = true;
    this._saving = this._saving.then(
      () => markLesson(this.app.vault.adapter, this.slug, this.lesson.id, patch)
    ).catch((e) => console.error("EngramQuest: lesson mark failed", e));
    return this._saving;
  }

  onOpen() {
    const t = this.plugin.settings;
    const zh = L(t) === "zh-tw";
    const { contentEl, modalEl } = this;
    this._isOpen = true;
    // A lesson is a long-form portrait document — give the modal nearly the whole viewport and
    // keep the chrome (title + footer) tight so the iframe gets the rest.
    hubUi().themedModal(this);
    modalEl.style.cssText = "width:min(96vw,900px);max-height:96vh;padding:0;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;";
    contentEl.style.cssText = "padding:12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex:1;min-height:0;";

    // Title row (padding-right clears Obsidian's absolute-positioned modal close X).
    const titleRow = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;gap:8px;padding-right:36px;" },
    });
    titleRow.createEl("div", {
      text: lessonTitle(this.lesson),
      attr: { style: "flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--text-normal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", title: this.lesson.title },
    });
    titleRow.createEl("span", {
      text: this.meta.title,
      attr: { style: "flex-shrink:0;font-size:11px;color:var(--text-muted);" },
    });

    const box = contentEl.createEl("div", {
      attr: { style: "flex:1;min-height:0;border:1px solid var(--background-modifier-border);border-radius:14px;overflow:hidden;background:var(--background-secondary)" },
    });

    // Footer: done + star toggles. State reflects the current completion and flips in place.
    buildCompletionFooter(contentEl, t, this.meta, this.lesson, (patch) => this._mark(patch));

    const showError = (message) => {
      box.empty();
      box.createEl("div", {
        text: message,
        attr: { style: "padding:14px 16px;color:var(--text-error);background:var(--background-modifier-error);border:1px solid var(--background-modifier-error);border-radius:10px;font-size:13px;line-height:1.5" },
      });
    };

    // Resize listener (registered before the async load; removed in onClose). Lessons usually
    // exceed the viewport, so cap the iframe and let its own document scroll.
    this._handler = (event) => {
      if (!this._isOpen) return;
      const frame = this._iframe;
      if (frame && event.source && event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (data && data.type === "engram-quest-resize" && frame) {
        const win = (typeof activeWindow !== "undefined" && activeWindow) || window;
        const cap = Math.max(360, Math.floor((win.innerHeight || 900) * 0.86));
        const next = Math.max(240, Math.min(cap, Math.round(Number(data.height) || 600)));
        frame.style.height = next + "px";
      }
    };
    // Register on the popout-aware window: in an Obsidian pop-out the iframe posts to that
    // window, not the main one — a main-`window` listener would never see the resize events.
    this._win = (typeof activeWindow !== "undefined" && activeWindow) || window;
    this._win.addEventListener("message", this._handler);

    const htmlPath = `${LESSONS_DIR}/${this.slug}/${this.lesson.file}`;
    const adapter = this.app.vault.adapter;

    (async () => {
      try {
        if (adapter.exists && !(await adapter.exists(htmlPath))) {
          showError(K(c(t, "LESSON_NOT_FOUND"), { file: this.lesson.file }));
          return;
        }
        const html = await adapter.read(htmlPath);
        if (!this._isOpen) return;
        // Default the iframe to the available height immediately — most lesson HTML has no
        // postMessage resize script (imported pages especially), so we can't rely on it.
        const win = (typeof activeWindow !== "undefined" && activeWindow) || window;
        const h = Math.max(360, Math.floor((win.innerHeight || 900) * 0.82));
        const iframe = box.createEl("iframe", {
          attr: {
            sandbox: "allow-scripts allow-same-origin allow-popups",
            srcdoc: html + MOBILE_GRID_FIX,
            style: `display:block;width:100%;height:${h}px;border:0;background:white;`,
          },
        });
        this._iframe = iframe;
        iframe.addEventListener("load", () => {
          iframe.contentWindow?.postMessage({
            type: "engram-quest-theme",
            dark: activeDocument.body.classList.contains("theme-dark"),
          }, "*");
        });
        // Auto-mark viewed once the lesson actually renders (also stamps lastViewed).
        this._mark({ viewed: true });
      } catch (error) {
        showError((zh ? "課時載入失敗：" : "Failed to load lesson: ") + String(error && error.message || error));
      }
    })();
  }

  onClose() {
    this._isOpen = false;
    if (this._handler) {
      (this._win || window).removeEventListener("message", this._handler);
      this._handler = null;
      this._win = null;
    }
    this._iframe = null;
    this.contentEl.empty();
    if (this._changed && this.onDone) this.onDone();
  }
}

// Thin modal for a canvas lesson (type:"canvas"): title + "open canvas" button + the same
// done/star footer as the HTML viewer. The canvas itself opens in a native Obsidian tab —
// an iframe can't host the canvas renderer, and native editing (drag, annotate) is the point.
class CanvasLessonModal extends I.Modal {
  constructor(app, plugin, slug, meta, lesson, onDone, hub) {
    super(app);
    this.plugin = plugin;
    this.slug = slug;
    this.meta = meta;
    this.lesson = lesson;
    this.onDone = onDone;
    this.hub = hub || null; // hub modal — minimized on jump so the canvas tab is actually visible
    this._changed = false;
    // Same write serialization as LessonViewerModal: markLesson is read-modify-write.
    this._saving = Promise.resolve();
  }

  _mark(patch) {
    this._changed = true;
    this._saving = this._saving.then(
      () => markLesson(this.app.vault.adapter, this.slug, this.lesson.id, patch)
    ).catch((e) => console.error("EngramQuest: lesson mark failed", e));
    return this._saving;
  }

  onOpen() {
    const t = this.plugin.settings;
    const { contentEl, modalEl } = this;
    hubUi().themedModal(this);
    modalEl.style.cssText = "width:min(94vw,440px);padding:0;border-radius:18px;overflow:hidden;";
    contentEl.style.cssText = "padding:20px;display:flex;flex-direction:column;gap:14px;";

    const titleRow = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;gap:10px;padding-right:28px;" },
    });
    titleRow.createEl("span", { text: "🗺️", attr: { style: "font-size:24px;flex-shrink:0;" } });
    const col = titleRow.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    col.createEl("div", {
      text: lessonTitle(this.lesson),
      attr: { style: "font-size:15px;font-weight:700;color:var(--text-normal);line-height:1.35;word-break:break-word;" },
    });
    col.createEl("div", { text: this.meta.title, attr: { style: "font-size:11px;color:var(--text-muted);" } });

    contentEl.createEl("div", {
      text: c(t, "LESSON_CANVAS_HINT"),
      attr: { style: "font-size:12px;color:var(--text-muted);line-height:1.6;" },
    });

    const openBtn = contentEl.createEl("button", {
      cls: "lh-btn-primary",
      text: c(t, "LESSON_OPEN_CANVAS") + " →",
      attr: { style: "padding:10px 16px;border-radius:10px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600;" },
    });
    openBtn.addEventListener("click", async () => {
      const path = `${LESSONS_DIR}/${this.slug}/${this.lesson.file}`;
      const adapter = this.app.vault.adapter;
      try {
        if (adapter.exists && !(await adapter.exists(path))) {
          new I.Notice(K(c(t, "LESSON_NOT_FOUND"), { file: this.lesson.file }));
          return;
        }
      } catch { /* can't check — try to open anyway */ }
      // Opening the map counts as viewed — parity with the HTML viewer's iframe-load mark.
      // Await it so the refresh triggered by onClose reads the already-persisted state.
      await this._mark({ viewed: true });
      this.close();
      if (this.hub && typeof this.hub._minimize === "function") this.hub._minimize();
      this.app.workspace.openLinkText(path, "", false);
    });

    buildCompletionFooter(contentEl, t, this.meta, this.lesson, (patch) => this._mark(patch));
  }

  onClose() {
    this.contentEl.empty();
    if (this._changed && this.onDone) this.onDone();
  }
}

module.exports = { LessonViewerModal, CanvasLessonModal, MOBILE_GRID_FIX };
