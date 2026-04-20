"use strict";

const obsidian = require("obsidian");
const { t, interpolate } = require("../i18n");

/**
 * Append a card line to the manual cards file for a deck.
 * File: engram-review/ai-cards/{deckName}-manual.md
 * Format: front :: back
 */
async function appendManualCard(adapter, deckName, front, back) {
  const dir = "engram-review/ai-cards";
  const filePath = `${dir}/${deckName}-manual.md`;
  await adapter.mkdir(dir).catch(() => {});

  const line = `${front} :: ${back}`;
  if (await adapter.exists(filePath)) {
    const existing = await adapter.read(filePath);
    const sep = existing.endsWith("\n") ? "" : "\n";
    await adapter.write(filePath, existing + sep + line + "\n");
  } else {
    // New file: add flashcard tag so it gets picked up by scanReviewDecks
    const prefix = `#flashcards/${deckName}\n\n`;
    await adapter.write(filePath, prefix + line + "\n");
  }
}

/**
 * Open a modal to create a new card in the given deck.
 * @param {object} app
 * @param {object} deck  - { name, cards, ... }
 * @param {object} settings
 * @param {function} onSaved - called after card is saved
 */
function openCreateCardModal(app, deck, settings, onSaved) {
  const modal = new obsidian.Modal(app);
  modal.modalEl.style.cssText = "width:min(92vw,480px);max-width:none;padding:0;border-radius:16px;overflow:hidden;";

  const wrap = modal.contentEl;
  wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:16px;";

  // Title
  wrap.createEl("div", {
    text: interpolate(t(settings, "CREATE_CARD_TITLE"), { deck: deck.name }),
    attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal,#111);" }
  });

  // Front field
  const frontLabel = wrap.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;" } });
  frontLabel.createEl("label", {
    text: t(settings, "CREATE_CARD_FRONT"),
    attr: { style: "font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:.06em;" }
  });
  const frontInput = frontLabel.createEl("input", {
    attr: {
      type: "text",
      placeholder: t(settings, "CREATE_CARD_FRONT_PLACEHOLDER"),
      style: "width:100%;padding:9px 12px;border:1.5px solid var(--background-modifier-border, #e5e7eb);border-radius:8px;font-size:14px;outline:none;background:var(--background-secondary, #f9fafb);color:var(--text-normal, #374151);box-sizing:border-box;"
    }
  });

  // Back field
  const backLabel = wrap.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;" } });
  backLabel.createEl("label", {
    text: t(settings, "CREATE_CARD_BACK"),
    attr: { style: "font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:.06em;" }
  });
  const backInput = backLabel.createEl("textarea", {
    attr: {
      placeholder: t(settings, "CREATE_CARD_BACK_PLACEHOLDER"),
      rows: "4",
      style: "width:100%;padding:9px 12px;border:1.5px solid var(--background-modifier-border, #e5e7eb);border-radius:8px;font-size:14px;outline:none;background:var(--background-secondary, #f9fafb);color:var(--text-normal, #374151);resize:vertical;box-sizing:border-box;font-family:inherit;"
    }
  });

  // Buttons
  const btnRow = wrap.createEl("div", { attr: { style: "display:flex;gap:8px;justify-content:flex-end;padding-top:4px;" } });
  btnRow.createEl("button", {
    text: t(settings, "CREATE_CARD_CANCEL"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border, #d1d5db);background:var(--background-secondary, #fff);color:var(--text-muted, inherit);cursor:pointer;font-size:13px;" }
  }).addEventListener("click", () => modal.close());

  const saveBtn = btnRow.createEl("button", {
    text: t(settings, "CREATE_CARD_SAVE"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:13px;font-weight:600;" }
  });

  saveBtn.addEventListener("click", async () => {
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    if (!front || !back) return;

    saveBtn.disabled = true;
    try {
      await appendManualCard(app.vault.adapter, deck.name, front, back);
      modal.close();
      new obsidian.Notice(interpolate(t(settings, "CREATE_CARD_SUCCESS"), { deck: deck.name }));
      if (onSaved) onSaved();
    } catch (e) {
      console.error("create-card: failed to save", e);
      saveBtn.disabled = false;
    }
  });

  // Allow Ctrl+Enter / Cmd+Enter to save
  [frontInput, backInput].forEach(el => {
    el.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") saveBtn.click();
    });
  });

  modal.open();
  setTimeout(() => frontInput.focus(), 50);
}

module.exports = { openCreateCardModal };
