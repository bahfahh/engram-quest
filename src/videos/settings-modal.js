"use strict";
// Video Academy settings (ADR-05): production mode, length, preferred style, narration language,
// subtitles — saved to engram-quest/videos/settings.json for the video skill to read. Pro modes are
// visible to free users but disabled (ADR-04); data.normalizeSettings enforces the same rules.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const data = require("./data");

const MODE_TEXT = {
  basic: ["VIDEO_MODE_BASIC", "VIDEO_MODE_BASIC_DESC"],
  polished: ["VIDEO_MODE_POLISHED", "VIDEO_MODE_POLISHED_DESC"],
  principle: ["VIDEO_MODE_PRINCIPLE", "VIDEO_MODE_PRINCIPLE_DESC"],
  auto: ["VIDEO_MODE_AUTO", "VIDEO_MODE_AUTO_DESC"],
};
const STYLE_TEXT = { auto: "VIDEO_STYLE_AUTO", fast: "VIDEO_STYLE_FAST", system: "VIDEO_STYLE_SYSTEM", visual: "VIDEO_STYLE_VISUAL", drawn: "VIDEO_STYLE_DRAWN" };
const LANG_TEXT = { follow: "VIDEO_LANG_FOLLOW", "zh-tw": "VIDEO_LANG_ZH", en: "VIDEO_LANG_EN" };

async function openVideoSettingsModal(hub, t) {
  const adapter = hub.app.vault.adapter;
  const isPro = !!hub.plugin.settings.licenseValid;
  let s = await data.readSettings(adapter, isPro);
  // Remember the free-choice length so switching into and back out of polished/auto keeps it.
  let chosenLength = s.length || 60;

  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-settings");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "VIDEO_SETTINGS") });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_SET_SUB") });
  const form = wrap.createDiv({ cls: "lh-vid-set-form" });

  const render = () => {
    s = data.normalizeSettings({ ...s, length: chosenLength }, isPro);
    form.empty();

    form.createDiv({ cls: "lh-vid-set-label", text: c(t, "VIDEO_SET_MODE") });
    const modes = form.createDiv({ cls: "lh-vid-modes" });
    for (const id of data.MODES) {
      const locked = data.PRO_MODES.has(id) && !isPro;
      const card = modes.createEl("button", { cls: "lh-vid-mode" + (s.mode === id ? " is-on" : "") + (locked ? " is-locked" : "") });
      if (locked) card.disabled = true;
      const top = card.createDiv({ cls: "lh-vid-mode-top" });
      top.createSpan({ cls: "lh-vid-mode-name", text: c(t, MODE_TEXT[id][0]) });
      if (data.PRO_MODES.has(id)) top.createSpan({ cls: "lh-vid-pro", text: "PRO" });
      card.createDiv({ cls: "lh-vid-mode-desc", text: c(t, MODE_TEXT[id][1]) });
      card.addEventListener("click", () => { s.mode = id; render(); });
    }

    const lenHead = form.createDiv({ cls: "lh-vid-set-label" });
    lenHead.createSpan({ text: c(t, "VIDEO_SET_LENGTH") });
    const lenHint = s.mode === "polished" ? "VIDEO_LEN_FIXED" : s.mode === "auto" ? "VIDEO_LEN_AUTO" : "VIDEO_LEN_HINT";
    lenHead.createSpan({ cls: "lh-vid-set-hint", text: c(t, lenHint) });
    const lens = form.createDiv({ cls: "lh-vid-lens" });
    for (const n of data.LENGTHS) {
      const fixed = s.mode === "polished" || s.mode === "auto";
      const btn = lens.createEl("button", { cls: "lh-vid-len" + (s.length === n ? " is-on" : ""), text: K(c(t, "VIDEO_LEN_SEC"), { n }) });
      if (fixed) btn.disabled = true;
      btn.addEventListener("click", () => { chosenLength = n; render(); });
    }

    const selectRow = (labelKey, keys, value, onChange) => {
      const row = form.createDiv({ cls: "lh-vid-set-row" });
      row.createSpan({ cls: "lh-vid-set-label", text: c(t, labelKey) });
      const sel = row.createEl("select", { cls: "lh-vid-select" });
      for (const [id, key] of Object.entries(keys)) {
        const opt = sel.createEl("option", { text: c(t, key), attr: { value: id } });
        if (id === value) opt.selected = true;
      }
      sel.addEventListener("change", () => onChange(sel.value));
    };
    selectRow("VIDEO_SET_STYLE", STYLE_TEXT, s.style, (v) => { s.style = v; });
    selectRow("VIDEO_SET_LANG", LANG_TEXT, s.narrationLang, (v) => { s.narrationLang = v; });

    const subRow = form.createDiv({ cls: "lh-vid-set-row" });
    subRow.createSpan({ cls: "lh-vid-set-label", text: c(t, "VIDEO_SET_SUBS") });
    const subLabel = subRow.createEl("label", { cls: "lh-vid-check" });
    const box = subLabel.createEl("input", { attr: { type: "checkbox" } });
    box.checked = s.subtitles;
    subLabel.createSpan({ text: c(t, "VIDEO_SET_SUBS_DESC") });
    box.addEventListener("change", () => { s.subtitles = box.checked; });
  };
  render();

  const actions = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const save = actions.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "VIDEO_SET_SAVE") });
  save.addEventListener("click", async () => {
    if (save.disabled) return;
    save.disabled = true;
    try {
      await data.saveSettings(adapter, { ...s, length: chosenLength }, isPro);
      modal.close();
      new I.Notice(c(t, "VIDEO_SET_SAVED"));
    } catch (e) {
      console.error("EngramQuest: video settings save failed", e);
      save.disabled = false;
    }
  });
  modal.open();
}

module.exports = { openVideoSettingsModal };
