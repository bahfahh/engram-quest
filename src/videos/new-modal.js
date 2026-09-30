"use strict";
// "+ New" pop-up for the Video Academy (ADR-14/15): one sentence of what to learn plus a source
// menu — auto-pick relevant notes (default; notes/folders can be dropped in to narrow it down) or
// don't use notes. Submitting only records a pending topic; the video skill generates it later.

const I = require("obsidian");
const { t: c } = require("../i18n");
const { createRequest } = require("./data");

/** Resolve an obsidian://open URL, [[wikilink]] or bare path to an existing vault file/folder path. */
function resolveRef(app, raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("obsidian://")) {
    try { s = new URL(s).searchParams.get("file") || ""; } catch { return null; }
  }
  s = s.replace(/^\[\[|\]\]$/g, "").split("|")[0];
  const hit = app.vault.getAbstractFileByPath(s) || app.vault.getAbstractFileByPath(`${s}.md`) || app.metadataCache.getFirstLinkpathDest(s, "");
  return hit ? hit.path : null;
}

/** Paths carried by a drop from Obsidian's file explorer (drag manager first, text payload as fallback). */
function refsFromDrop(app, evt) {
  const dragged = app.dragManager && app.dragManager.draggable;
  if (dragged) {
    if (dragged.file) return [dragged.file.path];
    if (Array.isArray(dragged.files)) return dragged.files.map((f) => f.path);
  }
  const text = (evt.dataTransfer && evt.dataTransfer.getData("text/plain")) || "";
  return text.split(/\r?\n/).map((line) => resolveRef(app, line)).filter(Boolean);
}

function openNewVideoModal(hub, t, onCreated) {
  const app = hub.app;
  const modal = new I.Modal(app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-new");
  const wrap = modal.contentEl;
  let refs = [];

  const label = wrap.createEl("label", { cls: "lh-vid-modal-title", text: c(t, "VIDEO_NEW_TITLE"), attr: { for: "lh-vid-new-text" } });
  const input = wrap.createEl("textarea", { cls: "lh-vid-input", attr: { id: "lh-vid-new-text", rows: "2", placeholder: c(t, "VIDEO_NEW_PH") } });

  const srcRow = wrap.createDiv({ cls: "lh-vid-src-row" });
  const select = srcRow.createEl("select", { cls: "lh-vid-select", attr: { "aria-label": label.textContent } });
  select.createEl("option", { text: c(t, "VIDEO_SOURCE_NOTES"), attr: { value: "notes" } });
  select.createEl("option", { text: c(t, "VIDEO_SOURCE_GENERAL"), attr: { value: "general" } });
  const desc = wrap.createDiv({ cls: "lh-vid-modal-desc" });
  const drop = wrap.createDiv({ cls: "lh-vid-drop" });

  const renderSource = () => {
    const useNotes = select.value === "notes";
    desc.setText(c(t, useNotes ? "VIDEO_SOURCE_NOTES_DESC" : "VIDEO_SOURCE_GENERAL_DESC"));
    drop.toggleClass("is-hidden", !useNotes);
    drop.empty();
    if (!refs.length) drop.createSpan({ cls: "lh-vid-drop-hint", text: c(t, "VIDEO_NEW_DROP") });
    for (const ref of refs) {
      const chip = drop.createSpan({ cls: "lh-vid-chip", text: ref.split("/").pop() || ref, attr: { title: ref } });
      chip.createEl("button", { cls: "lh-vid-chip-x", text: "×", attr: { "aria-label": c(t, "DELETE") } })
        .addEventListener("click", () => { refs = refs.filter((r) => r !== ref); renderSource(); });
    }
  };
  select.addEventListener("change", renderSource);
  renderSource();

  // The whole pop-up is the drop target so users don't have to aim for a small zone.
  modal.modalEl.addEventListener("dragover", (e) => { if (select.value === "notes") { e.preventDefault(); drop.addClass("is-over"); } });
  modal.modalEl.addEventListener("dragleave", () => drop.removeClass("is-over"));
  modal.modalEl.addEventListener("drop", (e) => {
    drop.removeClass("is-over");
    if (select.value !== "notes") return;
    e.preventDefault();
    refs = [...new Set([...refs, ...refsFromDrop(app, e)])];
    renderSource();
  });

  const actions = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const submit = actions.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "VIDEO_NEW_SUBMIT") });
  const syncSubmit = () => { submit.disabled = !input.value.trim(); };
  input.addEventListener("input", syncSubmit);
  syncSubmit();
  submit.addEventListener("click", async () => {
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const { slug } = await createRequest(app.vault.adapter, { text: input.value, source: select.value, refs });
      modal.close();
      new I.Notice(c(t, "VIDEO_NEW_DONE"));
      onCreated(slug);
    } catch (e) {
      console.error("EngramQuest: video request failed", e);
      new I.Notice(c(t, "VIDEO_NEW_FAILED"));
      submit.disabled = false;
    }
  });

  modal.open();
  input.focus();
}

module.exports = { openNewVideoModal };
