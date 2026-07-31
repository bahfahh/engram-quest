"use strict";
// Explainer viewer modal (Pro). Embeds a generated explainer page in a sandboxed iframe with the
// same srcdoc + postMessage embed as the lesson viewer: theme in, resize out. There is no scoring
// and no schedule — an explainer is reading material attached to a flashcard, so the modal is a
// plain reader with a source-note shortcut and delete.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { deleteExplainer, markViewed, toggleStateFlag, EXPLAINER_DIR } = require("./data");

const TRASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';

class ExplainerViewerModal extends I.Modal {
  constructor(app, plugin, page, onChanged) {
    super(app);
    this.plugin = plugin;
    this.page = page;          // meta json object ({ id, title, sourceCard, deck, ... })
    this.onChanged = onChanged; // called on close when state changed (viewed/star/complete/delete)
    this._handler = null;
    this._isOpen = false;
    this._iframe = null;
    this._dirty = false;        // reading state changed → refresh the list on close
  }

  onOpen() {
    const t = this.plugin.settings;
    const { contentEl, modalEl } = this;
    this._isOpen = true;
    modalEl.style.cssText = "width:min(96vw,760px);max-height:95vh;padding:0;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;";
    contentEl.style.cssText = "padding:12px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;flex:1;min-height:0;";

    // Title row — right padding reserves space for Obsidian's built-in close (X) button.
    const titleRow = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-right:36px;" },
    });
    const titleText = this.page.title || this.page.id;
    titleRow.createEl("div", {
      text: titleText,
      attr: { style: "flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--text-normal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", title: titleText },
    });

    const headerBtnStyle = "flex-shrink:0;font-size:12px;padding:3px 8px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-muted);cursor:pointer;white-space:nowrap;";

    // Source-note link — opens the flashcard's note this page explains.
    const srcPath = this.page.sourceCard && this.page.sourceCard.note;
    if (srcPath) {
      const name = String(srcPath).split("/").pop().replace(/\.md$/i, "");
      const srcBtn = titleRow.createEl("button", {
        attr: { style: headerBtnStyle + "max-width:130px;overflow:hidden;text-overflow:ellipsis;color:#6366f1;", title: srcPath },
      });
      srcBtn.textContent = "📄 " + name;
      srcBtn.addEventListener("click", () => {
        const file = this.app.vault.getAbstractFileByPath(srcPath);
        if (file) {
          this.app.workspace.openLinkText(file.path, "", false);
        } else {
          const fb = this.app.metadataCache.getFirstLinkpathDest(name, "");
          if (fb) this.app.workspace.openLinkText(fb.path, "", false);
          else new I.Notice(K(c(t, "EXPLAINER_SOURCE_NOT_FOUND"), { name }));
        }
      });
    }

    // ⭐ star + ✓ complete toggles (Lesson Academy pattern). Fire-and-forget persistence; the
    // list refreshes on close via _dirty → onChanged.
    const mkToggle = (flag, onGlyph, offGlyph, onTip, offTip) => {
      const btn = titleRow.createEl("button", { attr: { style: headerBtnStyle } });
      const paint = () => {
        const active = !!this.page["_" + flag];
        btn.textContent = active ? onGlyph : offGlyph;
        btn.title = active ? offTip : onTip;
        btn.setAttribute("aria-label", btn.title);
        btn.style.opacity = active ? "1" : "0.65";
      };
      paint();
      btn.addEventListener("click", async () => {
        try {
          const next = await toggleStateFlag(this.app.vault.adapter, this.page.id, flag);
          this.page["_" + flag] = next;
          this._dirty = true;
          paint();
        } catch (err) { console.warn("EngramQuest: explainer state toggle failed", err); }
      });
    };
    mkToggle("starred", "⭐", "☆", c(t, "EXPLAINER_STAR_TIP"), c(t, "EXPLAINER_UNSTAR_TIP"));
    mkToggle("completed", "✅", "✓", c(t, "EXPLAINER_COMPLETE_TIP"), c(t, "EXPLAINER_UNCOMPLETE_TIP"));

    const delBtn = titleRow.createEl("button", {
      attr: { class: "lh-delete-btn", title: c(t, "DELETE"), "aria-label": c(t, "DELETE"), style: "opacity:1;flex-shrink:0;" },
    });
    delBtn.appendChild(I.sanitizeHTMLToDom(TRASH_SVG));
    delBtn.addEventListener("click", () => this._confirmDelete());

    // Auto-mark viewed on open (Lesson Academy behavior). Only dirties the list the first time.
    if (!this.page._viewed) {
      this.page._viewed = true;
      this._dirty = true;
      markViewed(this.app.vault.adapter, this.page.id).catch((err) =>
        console.warn("EngramQuest: explainer markViewed failed", err));
    }

    const box = contentEl.createEl("div", {
      attr: { style: "border:1px solid var(--background-modifier-border);border-radius:14px;overflow:hidden;background:var(--background-secondary)" },
    });
    const showError = (message) => {
      box.empty();
      box.createEl("div", {
        text: message,
        attr: { style: "padding:14px 16px;color:var(--text-error);background:var(--background-modifier-error);border:1px solid var(--background-modifier-error);border-radius:10px;font-size:13px;line-height:1.5" },
      });
    };

    // Resize listener registered before the async load; onClose removes it. Only resize + theme —
    // explainer pages never post engram-quest-solved.
    this._handler = (event) => {
      if (!this._isOpen) return;
      const frame = this._iframe;
      if (frame && event.source && event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (data && data.type === "engram-quest-resize" && frame) {
        // Cap to the viewport minus the modal chrome; when capped the page's own document scrolls.
        const win = (typeof activeWindow !== "undefined" && activeWindow) || window;
        const cap = Math.max(360, Math.floor((win.innerHeight || 900) * 0.86));
        const next = Math.max(180, Math.min(cap, Math.round(Number(data.height) || 520)));
        frame.style.height = next + "px";
      }
    };
    window.addEventListener("message", this._handler);

    const htmlPath = `${EXPLAINER_DIR}/${this.page.id}.html`;
    const adapter = this.app.vault.adapter;
    (async () => {
      try {
        if (adapter.exists && !(await adapter.exists(htmlPath))) {
          showError(K(c(t, "EXPLAINER_FILE_NOT_FOUND"), { path: htmlPath }));
          return;
        }
        const html = await adapter.read(htmlPath);
        if (!this._isOpen) return;
        const iframe = box.createEl("iframe", {
          attr: {
            sandbox: "allow-scripts",
            srcdoc: html,
            style: "display:block;width:100%;height:520px;border:0;background:white;",
          },
        });
        this._iframe = iframe;
        iframe.addEventListener("load", () => {
          iframe.contentWindow?.postMessage({
            type: "engram-quest-theme",
            dark: activeDocument.body.classList.contains("theme-dark"),
          }, "*");
        });
      } catch (error) {
        showError(String(error && error.message || error));
      }
    })();
  }

  _confirmDelete() {
    const t = this.plugin.settings;
    const modal = new I.Modal(this.app);
    modal.modalEl.style.cssText = "width:min(92vw,420px);padding:0;border-radius:16px;overflow:hidden;";
    const wrap = modal.contentEl;
    wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div", {
      text: K(c(t, "DELETE_CONFIRM_TITLE"), { name: this.page.title || this.page.id }),
      attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" },
    });
    wrap.createEl("div", {
      text: c(t, "EXPLAINER_DELETE_BODY"),
      attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;" },
    });
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
      if (confirmBtn.disabled) return; // single-flight: avoid double delete on rapid clicks
      confirmBtn.disabled = true;
      modal.close();
      try {
        await deleteExplainer(this.app.vault.adapter, this.page.id);
      } catch (err) {
        console.error("EngramQuest: explainer delete failed", err);
        new I.Notice(c(t, "EXPLAINER_DELETE_FAILED"));
        return;
      }
      new I.Notice(c(t, "EXPLAINER_DELETED"));
      this._dirty = false; // onChanged fires here; avoid a second refresh from onClose
      this.close();
      if (this.onChanged) this.onChanged();
    });
    modal.open();
  }

  onClose() {
    this._isOpen = false;
    if (this._handler) {
      window.removeEventListener("message", this._handler);
      this._handler = null;
    }
    this._iframe = null;
    this.contentEl.empty();
    if (this._dirty && this.onChanged) {
      this._dirty = false;
      this.onChanged();
    }
  }
}

module.exports = { ExplainerViewerModal };
