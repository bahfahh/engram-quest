"use strict";
// A4 Quadrant Card review modal (Pro). Embeds the card's generated HTML in a sandboxed iframe
// and speaks the same postMessage contract as quest iframe challenges (theme in; resize + solved
// out). On a self-assessment the score is mapped to an FSRS rating and the card's own schedule is
// advanced via the quadrant data layer. Mirrors the iframe embed in src/quest/modal.js.

const I = require("obsidian");
const { t: c, getLocale: _getLocale } = require("../i18n");
const { applyQuadrantRating, QUADRANT_DIR } = require("./cards");

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

    contentEl.createEl("div", {
      text: this.card.title || this.card.cardId,
      attr: { style: "font-size:15px;font-weight:700;color:var(--text-normal);" },
    });

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
