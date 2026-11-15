"use strict";
// Teacher picker, used by Video settings and by the New series form. Every teacher can be seen and
// heard; choosing a Pro teacher without a licence opens the upgrade page instead.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale } = require("../i18n");
const { ProUpgradeModal } = require("../license/upgrade");
const { checkSkillsUpdates, SkillsInstallModal } = require("../hub/skills");
const { PORTRAITS, SAMPLES, SAMPLE_PACK } = require("./teacher-media");
const { loadPack } = require("../skills/video-pack");
const { TEACHERS, localText, canUse, variantsOf, variantOf, portraitKey } = require("./teachers");
const { loadCustomTeachers } = require("./custom-teachers");
const { readSettings } = require("./data");

function localeOf(t) {
  return getLocale(t, I.moment && I.moment.locale && I.moment.locale());
}

// The Pro teachers' samples come in one download the first time any of them is played, kept for the session.
let samplePack = null;
function packedSample(app, id) {
  if (!samplePack) {
    const pending = loadPack({ adapter: app.vault.adapter, configDir: app.vault.configDir, pack: SAMPLE_PACK, fetchUrl: async (url) => (await I.requestUrl({ url })).arrayBuffer })
      .then((files) => new Map(files.map((f) => [f.path.replace(/\.mp3$/, ""), URL.createObjectURL(new Blob([f.data], { type: "audio/mpeg" }))])));
    // A failed download is tried again on the next play.
    pending.catch(() => { if (samplePack === pending) samplePack = null; });
    samplePack = pending;
  }
  return samplePack.then((urls) => urls.get(id));
}

/** Portrait in a round frame; the name's first letter when the image isn't available. */
function teacherAvatar(parent, t, teacher, variant, cls = "") {
  const box = parent.createSpan({ cls: `lh-vid-avatar ${cls}` });
  const src = teacher.portrait || PORTRAITS[portraitKey(teacher, variant)];
  if (src) box.createEl("img", { attr: { src, alt: "" } });
  else box.setText(Array.from(localText(teacher.name, localeOf(t)))[0] || "");
  return box;
}

/** After buying Pro the installed skills still lack the Pro teachers until they are reinstalled. */
async function offerSkillUpdate(row, hub, t) {
  hub.plugin._skillsUpdateStatus = null;
  const outdated = await checkSkillsUpdates(hub.plugin).catch(() => []);
  if (!outdated.includes("claude") || !row.isConnected) return;
  row.createSpan({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_TEACHER_INSTALL") });
  row.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_INSTALL_SKILL") })
    .addEventListener("click", () => new SkillsInstallModal(hub.app, hub.plugin).open());
}

/**
 * `onPick(teacherId, variantId)` runs when a usable teacher is chosen. `pickVariants: false` hides the
 * colour sets (they are a global choice, not a series one). `inherit` adds a choice that clears the
 * selection, passing "" as the id. `speed` is the narration speed the samples play at (default: the
 * saved one). The user's own teachers (custom:<id>) follow in a section of their own.
 */
async function openTeacherPicker(hub, t, { selected, variants = {}, pickVariants = true, inherit = null, speed, onPick }) {
  const locale = localeOf(t);
  // Samples are recorded at speed 1; they play at the narration speed videos will use.
  const rate = speed ?? (await readSettings(hub.app.vault.adapter, !!t.licenseValid).catch(() => null))?.voice.speed ?? 1;
  const custom = await loadCustomTeachers(hub.app.vault.adapter).catch((e) => { console.warn("EngramQuest: custom teachers unreadable", e); return []; });
  const licensed = !!t.licenseValid;
  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-picker");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "VIDEO_TEACHER_TITLE") });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, licensed ? "VIDEO_TEACHER_SUB_PRO" : "VIDEO_TEACHER_SUB") });

  const installRow = wrap.createDiv({ cls: "lh-vid-picker-install" });
  if (licensed) offerSkillUpdate(installRow, hub, t);

  // One voice at a time: starting a sample ends whichever one was playing.
  let playing = null;
  const stop = () => {
    if (!playing) return;
    if (playing.audio) playing.audio.pause();
    playing.button.setText(c(t, "VIDEO_TEACHER_LISTEN"));
    playing = null;
  };
  modal.onClose = stop;

  const choose = (id, variant) => { modal.close(); onPick(id, variant); };

  if (inherit) {
    wrap.createEl("button", { cls: "lh-vid-btn lh-vid-picker-inherit" + (selected ? "" : " is-selected"), text: inherit })
      .addEventListener("click", () => choose("", null));
  }

  const drawCard = (grid, teacher) => {
    const usable = canUse(teacher, licensed);
    const isSelected = teacher.id === selected;
    let variant = variantOf(teacher, variants[teacher.id]);
    const card = grid.createDiv({ cls: "lh-vid-tcard" + (isSelected ? " is-selected" : "") });

    const photo = card.createDiv({ cls: "lh-vid-tcard-photo" });
    const drawPhoto = () => {
      photo.empty();
      const src = teacher.portrait || PORTRAITS[portraitKey(teacher, variant && variant.id)];
      if (src) photo.createEl("img", { attr: { src, alt: localText(teacher.name, locale) } });
      else photo.createSpan({ cls: "lh-vid-tcard-initial", text: Array.from(localText(teacher.name, locale))[0] || "" });
      if (!usable) photo.createSpan({ cls: "lh-vid-tcard-lock", text: "Pro" });
    };
    drawPhoto();

    const body = card.createDiv({ cls: "lh-vid-tcard-body" });
    const head = body.createDiv({ cls: "lh-vid-tcard-head" });
    head.createSpan({ cls: "lh-vid-tcard-name", text: localText(teacher.name, locale) });
    head.createSpan({ cls: "lh-vid-tcard-title", text: localText(teacher.title, locale) });
    body.createDiv({ cls: "lh-vid-tcard-fits", text: localText(teacher.fitsIf, locale) });
    body.createDiv({ cls: "lh-vid-tcard-effect", text: localText(teacher.effect, locale) });

    const options = variantsOf(teacher);
    if (pickVariants && options.length > 1) {
      const row = body.createDiv({ cls: "lh-vid-swatches" });
      const draw = () => {
        row.empty();
        for (const option of options) {
          const [a, b, d] = option.swatch;
          const swatch = row.createEl("button", {
            cls: "lh-vid-swatch" + (variant && option.id === variant.id ? " is-on" : ""),
            attr: { "aria-label": localText(option.name, locale), style: `background:linear-gradient(135deg,${a} 0 50%,${b} 50% 75%,${d} 75%)` },
          });
          swatch.addEventListener("click", () => { variant = option; draw(); drawPhoto(); });
        }
      };
      draw();
    }

    const actions = body.createDiv({ cls: "lh-vid-tcard-actions" });
    const inline = SAMPLES[teacher.id];
    if (inline || SAMPLE_PACK.ids.includes(teacher.id)) {
      const listen = actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_TEACHER_LISTEN") });
      listen.addEventListener("click", async () => {
        const same = playing && playing.button === listen;
        stop();
        if (same) return;
        // The element is made inside the click, so a sample that first has to download still belongs to the press.
        const audio = new Audio();
        const current = { audio, button: listen };
        playing = current;
        listen.setText(c(t, inline ? "VIDEO_TEACHER_STOP" : "VIDEO_TEACHER_LOADING"));
        let src = inline;
        if (!src) {
          try { src = await packedSample(hub.app, teacher.id); }
          catch (e) {
            console.warn("EngramQuest: teacher voice samples could not be downloaded", e);
            if (playing !== current) return;
            stop();
            new I.Notice(c(t, "VIDEO_TEACHER_SAMPLE_FAILED"));
            return;
          }
          // Stopped, or another sample started, while this one was downloading.
          if (playing !== current) return;
          listen.setText(c(t, "VIDEO_TEACHER_STOP"));
        }
        audio.src = src;
        audio.playbackRate = rate;
        audio.addEventListener("ended", stop);
        audio.play().catch((e) => {
          console.warn("EngramQuest: teacher voice sample did not play", e);
          if (playing === current) stop();
        });
      });
    }
    actions.createDiv({ cls: "lh-vid-spacer" });
    const pick = actions.createEl("button", {
      cls: "lh-vid-btn" + (usable ? " lh-vid-btn-primary" : ""),
      text: c(t, !usable ? "VIDEO_TEACHER_UNLOCK" : isSelected ? "VIDEO_TEACHER_CURRENT" : "VIDEO_TEACHER_CHOOSE"),
    });
    pick.addEventListener("click", () => {
      if (usable) choose(teacher.id, variant && variant.id);
      else new ProUpgradeModal(hub.app, hub.plugin).open();
    });
  };

  const grid = wrap.createDiv({ cls: "lh-vid-picker-grid" });
  for (const teacher of TEACHERS) drawCard(grid, teacher);
  if (custom.length) {
    wrap.createDiv({ cls: "lh-vid-picker-section", text: c(t, "VIDEO_TEACHER_CUSTOM") });
    wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, licensed ? "VIDEO_TEACHER_CUSTOM_SUB" : "VIDEO_TEACHER_CUSTOM_SUB_FREE") });
    const own = wrap.createDiv({ cls: "lh-vid-picker-grid" });
    for (const teacher of custom) drawCard(own, teacher);
  }
  modal.open();
}

/** "Taught by X" with a small portrait; nothing for videos that don't record their teacher. */
function teacherTag(parent, t, teacher, variant) {
  if (!teacher) return;
  const tag = parent.createSpan({ cls: "lh-vid-teacher-tag" });
  teacherAvatar(tag, t, teacher, variant, "is-tiny");
  tag.createSpan({ text: K(c(t, "VIDEO_TEACHER_BY"), { name: localText(teacher.name, localeOf(t)) }) });
}

module.exports = { openTeacherPicker, teacherAvatar, teacherTag, localeOf };
