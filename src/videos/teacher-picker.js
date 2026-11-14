"use strict";
// Teacher picker, used by Video settings and by the New series form. Every teacher can be seen and
// heard; choosing a Pro teacher without a licence opens the upgrade page instead.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale } = require("../i18n");
const { ProUpgradeModal } = require("../license/upgrade");
const { checkSkillsUpdates, SkillsInstallModal } = require("../hub/skills");
const { PORTRAITS, SAMPLES } = require("./teacher-media");
const { TEACHERS, localText, canUse, variantsOf, variantOf, portraitKey } = require("./teachers");
const { loadCustomTeachers } = require("./custom-teachers");

function localeOf(t) {
  return getLocale(t, I.moment && I.moment.locale && I.moment.locale());
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
 * selection, passing "" as the id. The user's own teachers (custom:<id>) follow in a section of their own.
 */
async function openTeacherPicker(hub, t, { selected, variants = {}, pickVariants = true, inherit = null, onPick }) {
  const locale = localeOf(t);
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
    playing.audio.pause();
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
    const sample = SAMPLES[teacher.id];
    if (sample) {
      const listen = actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_TEACHER_LISTEN") });
      listen.addEventListener("click", () => {
        const same = playing && playing.button === listen;
        stop();
        if (same) return;
        const audio = new Audio(sample);
        audio.addEventListener("ended", stop);
        playing = { audio, button: listen };
        listen.setText(c(t, "VIDEO_TEACHER_STOP"));
        audio.play().catch(stop);
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
