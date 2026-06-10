"use strict";
// Lesson viewer modal. Embeds a course lesson's self-contained HTML in a sandboxed iframe
// (same srcdoc + postMessage embed as the quadrant review modal, minus the FSRS rating flow).
// Opening auto-marks the lesson as viewed; the footer lets the user toggle done / star, which
// patch the course's meta.json via the lessons data layer.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale: _getLocale } = require("../i18n");
const { LESSONS_DIR, markLesson, lessonCompletion } = require("./data");

const W = I.moment;
function L(s) { return _getLocale(s, W && W.locale && W.locale()); }

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
    modalEl.style.cssText = "width:min(96vw,900px);max-height:96vh;padding:0;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;";
    contentEl.style.cssText = "padding:12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex:1;min-height:0;";

    // Title row (padding-right clears Obsidian's absolute-positioned modal close X).
    const titleRow = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;gap:8px;padding-right:36px;" },
    });
    titleRow.createEl("div", {
      text: this.lesson.title,
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
    const completion = lessonCompletion(this.meta, this.lesson.id);
    const footer = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;gap:8px;padding:0 2px;" },
    });
    footer.createEl("span", {
      text: this.meta.title + " · " + this.lesson.title,
      attr: { style: "flex:1;min-width:0;font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" },
    });

    const btnStyle = "flex-shrink:0;font-size:12px;padding:5px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;white-space:nowrap;";

    const starBtn = footer.createEl("button", { attr: { style: btnStyle } });
    const paintStar = (on) => {
      starBtn.textContent = (on ? "★ " : "☆ ") + c(t, "LESSON_MARK_STAR");
      starBtn.style.color = on ? "#f59e0b" : "var(--text-normal)";
    };
    paintStar(completion.starred);
    let starred = completion.starred;
    starBtn.addEventListener("click", () => {
      starred = !starred;
      paintStar(starred);
      this._mark({ starred });
    });

    const doneBtn = footer.createEl("button", { attr: { style: btnStyle } });
    const paintDone = (on) => {
      doneBtn.textContent = on ? "✓ " + c(t, "LESSON_MARKED_DONE") : c(t, "LESSON_MARK_DONE");
      doneBtn.style.background = on ? "#22c55e" : "var(--background-secondary)";
      doneBtn.style.color = on ? "#fff" : "var(--text-normal)";
      doneBtn.style.borderColor = on ? "#22c55e" : "var(--background-modifier-border)";
    };
    paintDone(completion.completed);
    let completed = completion.completed;
    doneBtn.addEventListener("click", () => {
      completed = !completed;
      paintDone(completed);
      this._mark({ completed });
    });

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
            sandbox: "allow-scripts",
            srcdoc: html,
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

module.exports = { LessonViewerModal };
