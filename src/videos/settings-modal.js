"use strict";
// Video Academy settings: only what the video skill actually uses, saved to
// engram-quest/videos/settings.json (contract.md). Recall film length lives on its own tab.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const data = require("./data");
const { canUse, localText } = require("./teachers");
const { loadCustomTeachers, findTeacherIn } = require("./custom-teachers");
const { openTeacherPicker, teacherAvatar, localeOf } = require("./teacher-picker");

const QUALITY_TEXT = { high: ["VIDEO_Q_HIGH", "VIDEO_Q_HIGH_DESC"], compact: ["VIDEO_Q_COMPACT", "VIDEO_Q_COMPACT_DESC"] };
const LANG_TEXT = { follow: "VIDEO_LANG_FOLLOW", "zh-tw": "VIDEO_LANG_ZH", en: "VIDEO_LANG_EN" };
const VOICE_TEXT = { auto: "VIDEO_VOICE_AUTO", edge: "VIDEO_VOICE_EDGE", gemini: "VIDEO_VOICE_GEMINI", azure: "VIDEO_VOICE_AZURE", custom: "VIDEO_VOICE_CUSTOM" };
const CARDS_MODULE = "cards";

async function openVideoSettingsModal(hub, t) {
  const adapter = hub.app.vault.adapter;
  const isPro = !!hub.plugin.settings.licenseValid;
  const locale = localeOf(t);
  let s = await data.readSettings(adapter, isPro);
  const custom = await loadCustomTeachers(adapter).catch(() => []);

  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-settings");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "VIDEO_SETTINGS") });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_SET_SUB") });
  const form = wrap.createDiv({ cls: "lh-vid-set-form" });

  const render = () => {
    s = data.normalizeSettings(s, isPro);
    form.empty();

    const teacher = findTeacherIn(custom, s.cast.teacher);
    const teacherRow = form.createDiv({ cls: "lh-vid-set-row" });
    teacherRow.createSpan({ cls: "lh-vid-set-label", text: c(t, "VIDEO_TEACHER") });
    teacherAvatar(teacherRow, t, teacher, s.cast.variants[teacher.id]);
    const who = teacherRow.createDiv({ cls: "lh-vid-teacher-who" });
    who.createDiv({ cls: "lh-vid-tcard-name", text: localText(teacher.name, locale) });
    who.createDiv({ cls: "lh-vid-tcard-title", text: localText(teacher.title, locale) });
    teacherRow.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_TEACHER_CHANGE") }).addEventListener("click", () => {
      openTeacherPicker(hub, t, {
        selected: teacher.id,
        variants: s.cast.variants,
        onPick: (id, variant) => {
          s.cast.teacher = id;
          if (variant) s.cast.variants[id] = variant;
          render();
        },
      });
    });
    // A saved custom:<id> whose file is gone, or whose name the picker cannot list, would otherwise read as Nico.
    if (String(s.cast.teacher).startsWith("custom:") && teacher.id !== s.cast.teacher) form.createDiv({ cls: "lh-vid-set-note", text: K(c(t, "VIDEO_TEACHER_CUSTOM_MISSING"), { id: s.cast.teacher.slice(7) }) });
    if (!canUse(teacher, isPro)) form.createDiv({ cls: "lh-vid-set-note", text: K(c(t, "VIDEO_TEACHER_NEEDS_PRO"), { name: localText(teacher.name, locale) }) });
    form.createDiv({ cls: "lh-vid-set-note", text: c(t, "VIDEO_SET_STUDIO") });

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
    selectRow("VIDEO_SET_LANG", LANG_TEXT, s.narrationLang, (v) => { s.narrationLang = v; });
    selectRow("VIDEO_SET_VOICE", VOICE_TEXT, s.voice.engine, (v) => { s.voice.engine = v; });
    form.createDiv({ cls: "lh-vid-set-note", text: c(t, "VIDEO_SET_VOICE_NOTE") });

    const checkRow = (labelKey, descKey, checked, onChange) => {
      const row = form.createDiv({ cls: "lh-vid-set-row" });
      row.createSpan({ cls: "lh-vid-set-label", text: c(t, labelKey) });
      const label = row.createEl("label", { cls: "lh-vid-check" });
      const box = label.createEl("input", { attr: { type: "checkbox" } });
      box.checked = checked;
      label.createSpan({ text: c(t, descKey) });
      box.addEventListener("change", () => onChange(box.checked));
    };
    checkRow("VIDEO_SET_SUBS", "VIDEO_SET_SUBS_DESC", s.subtitles, (on) => { s.subtitles = on; });
    checkRow("VIDEO_SET_CARDS", "VIDEO_SET_CARDS_DESC", !s.course.off.includes(CARDS_MODULE), (on) => {
      s.course.off = on ? s.course.off.filter((x) => x !== CARDS_MODULE) : [...s.course.off, CARDS_MODULE];
    });
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
      new I.Notice(c(t, "VIDEO_SET_SAVE_FAILED"));
      save.disabled = false;
    }
  });
  modal.open();
}

module.exports = { openVideoSettingsModal };
