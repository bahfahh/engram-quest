"use strict";
// A4 Quadrant Card review modal (Pro). Embeds the card's generated HTML in a sandboxed iframe
// and speaks the same postMessage contract as quest iframe challenges (theme in; resize + solved
// out). On a self-assessment the score is mapped to an FSRS rating and the card's own schedule is
// advanced via the quadrant data layer. Mirrors the iframe embed in src/quest/modal.js.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale: _getLocale } = require("../i18n");
const { applyQuadrantRating, deleteQuadrantCard, QUADRANT_DIR } = require("./cards");

const TRASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';

const W = I.moment;
function L(s) { return _getLocale(s, W && W.locale && W.locale()); }

const CLOSE_DELAY_MS = 600;

class QuadrantReviewModal extends I.Modal {
  constructor(app, plugin, card, onDone) {
    super(app);
    this.plugin = plugin;
    this.card = card;
    this.onDone = onDone;
    this._handler = null;
    this._isOpen = false;
    this._iframe = null;
  }

  onOpen() {
    const t = this.plugin.settings;
    const zh = L(t) === "zh-tw";
    const { contentEl, modalEl } = this;
    this._isOpen = true;
    // Cap the modal at the viewport and let the content scroll: the A4 card iframe is a tall
    // portrait page, so without this the bottom (phase controls / self-assessment buttons) gets
    // clipped by overflow:hidden with no way to reach it.
    modalEl.style.cssText = "width:min(96vw,620px);max-height:90vh;padding:0;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;";
    contentEl.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;min-height:0;";

    // Reserve right-side space for Obsidian's built-in modal close (X) button, which is absolutely
    // positioned at the modal's top-right. Without this, the trash button (pinned right by the
    // title's flex:1) sits crammed directly under the X.
    const titleRow = contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:center;gap:8px;padding-right:36px;" },
    });
    titleRow.createEl("div", {
      text: this.card.title || this.card.cardId,
      attr: { style: "flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--text-normal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" },
    });
    const delBtn = titleRow.createEl("button", {
      attr: { class: "lh-delete-btn", title: c(t, "DELETE"), style: "opacity:1;flex-shrink:0;" },
    });
    delBtn.appendChild(I.sanitizeHTMLToDom(TRASH_SVG));
    delBtn.addEventListener("click", () => this._confirmDelete(zh));

    const box = contentEl.createEl("div", {
      attr: { style: "border:1px solid var(--background-modifier-border);border-radius:14px;overflow:hidden;background:var(--background-secondary)" },
    });
    const status = contentEl.createEl("div", {
      attr: { style: "font-size:12px;color:var(--text-muted);line-height:1.5" },
    });

    const showError = (message) => {
      box.empty();
      box.createEl("div", {
        text: message,
        attr: { style: "padding:14px 16px;color:var(--text-error);background:var(--background-modifier-error);border:1px solid var(--background-modifier-error);border-radius:10px;font-size:13px;line-height:1.5" },
      });
    };

    // Register the message listener synchronously, before the async load below. If the modal is
    // closed during the awaits, onClose() removes this handler — attaching it here (not inside the
    // async IIFE) avoids the orphaned-listener race. The handler self-guards on this._isOpen.
    this._handler = async (event) => {
      if (!this._isOpen) return;
      const frame = this._iframe;
      if (frame && event.source && event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (!data || typeof data !== "object") return;
      if (data.type === "engram-quest-resize" && frame) {
        // A full A4 quadrant card is taller than the window. Cap the iframe to a fraction of the
        // viewport instead of growing it to the card's full height: a too-tall iframe gets clipped
        // by the modal (and fighting the modal's flex/scroll is fragile). When capped, the card's
        // own document scrolls (default iframe behaviour) so the bottom — tip bar, reveal/review
        // buttons, self-assessment row — is always reachable. Short cards still fit exactly.
        const win = (typeof activeWindow !== "undefined" && activeWindow) || window;
        const cap = Math.max(360, Math.floor((win.innerHeight || 900) * 0.78));
        const next = Math.max(180, Math.min(cap, Math.round(Number(data.height) || 520)));
        frame.style.height = next + "px";
      }
      if (data.type === "engram-quest-solved") {
        const scorePct = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
        try {
          await applyQuadrantRating(this.app.vault.adapter, this.card.cardId, scorePct, t);
        } catch (err) {
          console.error("EngramQuest: quadrant rating failed", err);
          status.textContent = zh ? "排程更新失敗，請再複習一次。" : "Schedule update failed — please review again.";
          new I.Notice(zh ? "四象限卡排程更新失敗" : "Failed to update quadrant card schedule");
          return; // keep the modal open so the user can retry
        }
        status.textContent = zh ? `已更新排程（${scorePct}%）` : `Schedule updated (${scorePct}%)`;
        window.setTimeout(() => {
          this.close();
          if (this.onDone) this.onDone();
        }, CLOSE_DELAY_MS);
      }
    };
    window.addEventListener("message", this._handler);

    const htmlPath = `${QUADRANT_DIR}/${this.card.cardId}.html`;
    const adapter = this.app.vault.adapter;

    (async () => {
      try {
        if (adapter.exists && !(await adapter.exists(htmlPath))) {
          showError(zh ? `找不到卡片檔案：${htmlPath}` : `Card file not found: ${htmlPath}`);
          return;
        }
        const html = await adapter.read(htmlPath);
        if (!this._isOpen) return; // modal was closed during the read
        const iframe = box.createEl("iframe", {
          attr: {
            sandbox: "allow-scripts",
            srcdoc: html,
            style: "display:block;width:100%;height:520px;border:0;background:white;",
          },
        });
        this._iframe = iframe;
        status.textContent = zh ? "完成自評後會自動更新排程。" : "Your self-assessment updates the schedule automatically.";
        iframe.addEventListener("load", () => {
          iframe.contentWindow?.postMessage({
            type: "engram-quest-theme",
            dark: activeDocument.body.classList.contains("theme-dark"),
          }, "*");
        });
      } catch (error) {
        showError((zh ? "卡片載入失敗：" : "Failed to load card: ") + String(error && error.message || error));
      }
    })();
  }

  // Confirm-then-delete the single card on screen. On success: trash the card's files, close this
  // modal and call onDone() so a deck run advances to the next card (and the Hub tab re-renders).
  _confirmDelete(zh) {
    const t = this.plugin.settings;
    const modal = new I.Modal(this.app);
    modal.modalEl.style.cssText = "width:min(92vw,420px);padding:0;border-radius:16px;overflow:hidden;";
    const wrap = modal.contentEl;
    wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div", {
      text: K(c(t, "DELETE_CONFIRM_TITLE"), { name: this.card.title || this.card.cardId }),
      attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" },
    });
    wrap.createEl("div", {
      text: c(t, "QUADRANT_DELETE_CARD_BODY"),
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
      modal.close();
      try {
        await deleteQuadrantCard(this.app.vault.adapter, this.card.cardId);
      } catch (err) {
        console.error("EngramQuest: quadrant card delete failed", err);
        new I.Notice(zh ? "刪除失敗，請重試" : "Delete failed — please try again");
        return; // keep the review modal open so the user can retry
      }
      new I.Notice(zh ? "四象限卡已刪除" : "Quadrant card deleted");
      this.close();
      if (this.onDone) this.onDone();
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
  }
}

module.exports = { QuadrantReviewModal };
