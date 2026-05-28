"use strict";
// Quadrant Card edit modal (Pro). Lets the user edit a card's title + Q1-Q4 plaintext, mirroring
// the review-deck edit form's layout/CSS. Title saves to sr/{cardId}.json instantly; Q1-Q4 edits
// are also persisted to the JSON metadata (so the Hub list/search and the Copy button reflect them)
// and queued for regeneration — the AI skill rebuilds the A4 html faithfully from its templates,
// reusing the same cardId so the FSRS schedule carries over. The plugin never hand-edits the html.

const I = require("obsidian");
const { t: c } = require("../i18n");
const { loadCardSr, updateCardContent, enqueueRegenerate } = require("./cards");

class QuadrantEditModal extends I.Modal {
  constructor(app, plugin, card, onSaved) {
    super(app);
    this.plugin = plugin;
    this.card = card;
    this.onSaved = onSaved;
  }

  onOpen() {
    const t = this.plugin.settings;
    const { contentEl, modalEl } = this;
    modalEl.style.cssText = "width:min(96vw,620px);max-height:90vh;border-radius:16px;";

    // Obsidian's onOpen() is a synchronous lifecycle hook — the framework never awaits it. Do the
    // async load in an IIFE with its own catch so a read failure shows an error state instead of
    // leaving the modal blank (mirrors the pattern in review-modal.js).
    (async () => {
      try {
        await this._render(t, contentEl);
      } catch (err) {
        console.error("EngramQuest: quadrant edit modal failed to open", err);
        contentEl.empty();
        contentEl.createEl("div", {
          text: c(t, "QUADRANT_SAVE_FAILED"),
          attr: { style: "padding:14px 16px;color:var(--text-error);" },
        });
      }
    })();
  }

  async _render(t, contentEl) {
    // Reload the card from disk so we edit the latest persisted content, not a stale scan snapshot.
    const adapter = this.app.vault.adapter;
    const fresh = (await loadCardSr(adapter, this.card.cardId)) || this.card;

    contentEl.empty();
    contentEl.createEl("div", {
      text: c(t, "QUADRANT_EDIT_TITLE"),
      attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);margin-bottom:12px;" },
    });

    const body = contentEl.createEl("div", { attr: { class: "lh-edit-form" } });

    // Title — single-line input.
    const titleField = body.createEl("div", { attr: { class: "lh-edit-field" } });
    titleField.createEl("label", { text: c(t, "QUADRANT_EDIT_TITLE_LABEL"), attr: { class: "lh-edit-label" } });
    const titleInput = titleField.createEl("input", { attr: { type: "text", class: "lh-edit-textarea" } });
    titleInput.value = fresh.title || "";

    // Q1-Q4 — textareas.
    const field = (labelKey, value) => {
      const wrap = body.createEl("div", { attr: { class: "lh-edit-field" } });
      wrap.createEl("label", { text: c(t, labelKey), attr: { class: "lh-edit-label" } });
      const ta = wrap.createEl("textarea", { attr: { class: "lh-edit-textarea" } });
      ta.value = value || "";
      return ta;
    };
    const taQ1 = field("QUADRANT_EDIT_Q1", fresh.q1);
    const taQ2 = field("QUADRANT_EDIT_Q2", fresh.q2);
    const taQ3 = field("QUADRANT_EDIT_Q3", fresh.q3);
    const taQ4 = field("QUADRANT_EDIT_Q4", fresh.q4);

    body.createEl("div", {
      text: c(t, "QUADRANT_EDIT_HINT"),
      attr: { style: "font-size:12px;color:var(--text-muted);line-height:1.5;margin:4px 0 12px;" },
    });

    const btnRow = body.createEl("div", { attr: { class: "lh-edit-btn-row" } });
    const saveBtn = btnRow.createEl("button", { attr: { class: "lh-edit-save-btn" } });
    saveBtn.textContent = c(t, "EDIT_SAVE");
    const cancelBtn = btnRow.createEl("button", { attr: { class: "lh-edit-cancel-btn" } });
    cancelBtn.textContent = c(t, "EDIT_CANCEL");
    cancelBtn.addEventListener("click", () => this.close());

    saveBtn.addEventListener("click", async () => {
      const next = {
        title: titleInput.value.trim(),
        q1: taQ1.value.trim(),
        q2: taQ2.value.trim(),
        q3: taQ3.value.trim(),
        q4: taQ4.value.trim(),
      };
      const contentChanged =
        next.q1 !== (fresh.q1 || "") || next.q2 !== (fresh.q2 || "") ||
        next.q3 !== (fresh.q3 || "") || next.q4 !== (fresh.q4 || "");
      saveBtn.disabled = true;
      try {
        const updated = await updateCardContent(adapter, this.card.cardId, next);
        if (!updated) { new I.Notice(c(t, "QUADRANT_CARD_NOT_FOUND")); saveBtn.disabled = false; return; }
        if (contentChanged) {
          await enqueueRegenerate(adapter, {
            cardId: this.card.cardId,
            source: updated.source,
            title: next.title,
            q1: next.q1, q2: next.q2, q3: next.q3, q4: next.q4,
          });
        }
        // Reflect the saved fields back onto the in-memory card the review modal holds.
        Object.assign(this.card, next);
        new I.Notice(c(t, contentChanged ? "QUADRANT_REGEN_QUEUED" : "QUADRANT_SAVED"));
        if (this.onSaved) this.onSaved(this.card);
        this.close();
      } catch (err) {
        console.error("EngramQuest: quadrant edit save failed", err);
        new I.Notice(c(t, "QUADRANT_SAVE_FAILED"));
        saveBtn.disabled = false;
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = { QuadrantEditModal };
