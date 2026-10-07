"use strict";
// "+ New series" pop-up for the Video Academy, also used to edit a series that is still pending.
// The learner only says what they want to learn (the goal, which becomes the series name) plus
// optional detail, the series' video style and the source — auto-pick relevant notes (default;
// notes/folders can be dropped in to narrow it down) or don't use notes. How many videos and what
// each covers is the video skill's call. Saving only writes a pending series; nothing is generated here.

const I = require("obsidian");
const { t: c, getLocale } = require("../i18n");
const { createRequest, updateRequest, GOAL_MAX } = require("./data");
const { AUTO, LOOKS, localText, findLook } = require("./looks");

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

/**
 * Note/folder paths carried by a drop from Obsidian's file explorer (drag manager first, text
 * payload as fallback). Only markdown notes and folders count as reading material.
 */
function refsFromDrop(app, evt) {
  const dragged = app.dragManager && app.dragManager.draggable;
  let paths;
  if (dragged && dragged.file) paths = [dragged.file.path];
  else if (dragged && Array.isArray(dragged.files)) paths = dragged.files.map((f) => f.path);
  else {
    const text = (evt.dataTransfer && evt.dataTransfer.getData("text/plain")) || "";
    paths = text.split(/\r?\n/).map((line) => resolveRef(app, line)).filter(Boolean);
  }
  return paths.filter((p) => {
    const f = app.vault.getAbstractFileByPath(p);
    return f && (f instanceof I.TFolder || f.extension === "md");
  });
}

/**
 * Build a look <select> (ADR-26): "Let AI decide", then free, Pro and the learner's own looks.
 * Pro and own looks are visible but disabled without Pro. An unknown value shows as "Let AI decide".
 */
function styleSelect(parent, t, id, value, { isPro = false, userLooks = [] } = {}) {
  const locale = getLocale(t);
  const sel = parent.createEl("select", { cls: "lh-vid-select", attr: { id } });
  sel.createEl("option", { text: c(t, "VIDEO_STYLE_AUTO"), attr: { value: AUTO } });
  const group = (labelKey, looks, locked) => {
    if (!looks.length) return;
    const g = sel.createEl("optgroup", { attr: { label: c(t, labelKey) } });
    for (const look of looks) {
      const opt = g.createEl("option", { text: localText(look.name, locale, look.id), attr: { value: look.id, title: localText(look.suits, locale) } });
      opt.disabled = locked;
    }
  };
  group("VIDEO_LOOKS_FREE", LOOKS.filter((l) => l.tier === "free"), false);
  group("VIDEO_LOOKS_PRO", LOOKS.filter((l) => l.tier === "pro"), !isPro);
  group("VIDEO_LOOKS_MINE", userLooks, !isPro);
  sel.value = findLook(value, userLooks) ? value : AUTO;
  return sel;
}

/**
 * Open the form. With `edit` = { slug, meta } it edits that pending series and shows a delete
 * button (`onDelete`); otherwise it creates one. `onSaved(slug)` runs after a successful save.
 */
function openNewVideoModal(hub, t, onSaved, edit = null, onDelete = null) {
  const app = hub.app;
  const req = edit && edit.meta.request;
  const modal = new I.Modal(app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-new");
  const wrap = modal.contentEl;
  let refs = req ? [...req.refs] : [];

  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, edit ? "VIDEO_EDIT_TITLE" : "VIDEO_NEW_TITLE") });

  const field = (labelKey, forId, optional) => {
    const f = wrap.createDiv({ cls: "lh-vid-field" });
    const label = f.createEl("label", { cls: "lh-vid-label", text: c(t, labelKey), attr: { for: forId } });
    if (optional) label.createSpan({ cls: "lh-vid-optional", text: c(t, "VIDEO_OPTIONAL") });
    return f;
  };

  const goalField = field("VIDEO_NEW_GOAL", "lh-vid-new-goal");
  const goal = goalField.createEl("input", {
    cls: "lh-vid-input",
    attr: { id: "lh-vid-new-goal", type: "text", maxlength: String(GOAL_MAX), placeholder: c(t, "VIDEO_NEW_PH") },
  });
  // A series named before the name limit existed may be longer; keep the full text as detail.
  const oldTitle = edit ? edit.meta.title : "";
  const titleTooLong = Array.from(oldTitle).length > GOAL_MAX;
  goal.value = Array.from(oldTitle).slice(0, GOAL_MAX).join("");

  const detailField = field("VIDEO_NEW_DETAIL", "lh-vid-new-detail", true);
  const detail = detailField.createEl("textarea", {
    cls: "lh-vid-input",
    attr: { id: "lh-vid-new-detail", rows: "3", placeholder: c(t, "VIDEO_NEW_DETAIL_PH") },
  });
  detail.value = (req && req.detail) || (titleTooLong ? oldTitle : "");
  detailField.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_NEW_DETAIL_HINT") });

  const styleField = field("VIDEO_SERIES_STYLE", "lh-vid-new-style");
  const style = styleSelect(styleField, t, "lh-vid-new-style", edit ? edit.meta.style : AUTO, { isPro: !!t.licenseValid, userLooks: hub._vLooks || [] });
  const shownStyle = style.value;

  const srcField = field("VIDEO_NEW_SOURCE", "lh-vid-new-src");
  const select = srcField.createEl("select", { cls: "lh-vid-select", attr: { id: "lh-vid-new-src" } });
  select.createEl("option", { text: c(t, "VIDEO_SOURCE_NOTES"), attr: { value: "notes" } });
  select.createEl("option", { text: c(t, "VIDEO_SOURCE_GENERAL"), attr: { value: "general" } });
  select.value = req && req.source === "general" ? "general" : "notes";
  const desc = srcField.createDiv({ cls: "lh-vid-modal-desc" });
  const drop = srcField.createDiv({ cls: "lh-vid-drop" });

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
  if (edit && onDelete) {
    actions.createEl("button", { cls: "lh-vid-btn lh-vid-btn-danger-text", text: c(t, "DELETE") })
      .addEventListener("click", () => { modal.close(); onDelete(); });
    actions.createDiv({ cls: "lh-vid-spacer" });
  }
  actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const submit = actions.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, edit ? "VIDEO_SET_SAVE" : "VIDEO_NEW_SUBMIT") });
  const syncSubmit = () => { submit.disabled = !goal.value.trim(); };
  goal.addEventListener("input", syncSubmit);
  syncSubmit();
  submit.addEventListener("click", async () => {
    if (submit.disabled) return;
    submit.disabled = true;
    // Send the style only when changed: a look this device doesn't know is shown as "Let AI decide".
    const input = { text: goal.value, detail: detail.value, source: select.value, refs, style: style.value !== shownStyle ? style.value : undefined };
    try {
      const adapter = app.vault.adapter;
      if (edit) {
        if (!(await updateRequest(adapter, edit.slug, input, edit.meta))) throw new Error("series changed or is no longer pending");
      }
      const slug = edit ? edit.slug : (await createRequest(adapter, input)).slug;
      modal.close();
      new I.Notice(c(t, edit ? "VIDEO_EDIT_DONE" : "VIDEO_NEW_DONE"));
      onSaved(slug);
    } catch (e) {
      console.error("EngramQuest: video request save failed", e);
      new I.Notice(c(t, edit ? "VIDEO_EDIT_FAILED" : "VIDEO_NEW_FAILED"));
      submit.disabled = false;
    }
  });

  modal.open();
  goal.focus();
}

module.exports = { openNewVideoModal, styleSelect };
