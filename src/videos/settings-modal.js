"use strict";
// Video Academy settings (ADR-05, ADR-25, ADR-26): quality, preferred look, narration language and
// subtitles — saved to engram-quest/videos/settings.json for the video skill to read. Pro looks are
// visible to free users but disabled; the file's `pro` flag tells the skill which looks it may use.

const I = require("obsidian");
const { t: c } = require("../i18n");
const data = require("./data");
const { styleSelect } = require("./new-modal");

const QUALITY_TEXT = { high: ["VIDEO_Q_HIGH", "VIDEO_Q_HIGH_DESC"], compact: ["VIDEO_Q_COMPACT", "VIDEO_Q_COMPACT_DESC"] };
const LANG_TEXT = { follow: "VIDEO_LANG_FOLLOW", "zh-tw": "VIDEO_LANG_ZH", en: "VIDEO_LANG_EN" };

async function openVideoSettingsModal(hub, t) {
  const adapter = hub.app.vault.adapter;
  const isPro = !!hub.plugin.settings.licenseValid;
  let s = await data.readSettings(adapter, isPro);

  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-settings");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "VIDEO_SETTINGS") });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_SET_SUB") });
  const form = wrap.createDiv({ cls: "lh-vid-set-form" });

  const render = () => {
    s = data.normalizeSettings(s, isPro);
    form.empty();

    const qHead = form.createDiv({ cls: "lh-vid-set-label" });
    qHead.createSpan({ text: c(t, "VIDEO_SET_QUALITY") });
    qHead.createSpan({ cls: "lh-vid-set-hint", text: c(t, QUALITY_TEXT[s.quality][1]) });
    const qs = form.createDiv({ cls: "lh-vid-lens" });
    for (const id of data.QUALITIES) {
      const btn = qs.createEl("button", { cls: "lh-vid-len" + (s.quality === id ? " is-on" : ""), text: c(t, QUALITY_TEXT[id][0]) });
      btn.addEventListener("click", () => { s.quality = id; render(); });
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
    const styleRow = form.createDiv({ cls: "lh-vid-set-row" });
    styleRow.createEl("label", { cls: "lh-vid-set-label", text: c(t, "VIDEO_SET_STYLE"), attr: { for: "lh-vid-set-style" } });
    const style = styleSelect(styleRow, t, "lh-vid-set-style", s.style, { isPro, userLooks: hub._vLooks || [] });
    style.addEventListener("change", () => { s.style = style.value; });
    form.createDiv({ cls: "lh-vid-set-note", text: c(t, "VIDEO_SET_STYLE_HINT") + (isPro ? "" : c(t, "VIDEO_LOOKS_PRO_HINT")) });
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
      await data.saveSettings(adapter, s, isPro);
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
