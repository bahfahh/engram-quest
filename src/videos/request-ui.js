"use strict";
// What happens after a video is requested: the plugin never makes videos itself, so the learner gets a
// prompt to paste into Claude Code, and a way to see how a series is getting on.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { SkillsInstallModal } = require("../hub/skills");

function seriesPrompt(t, slug, title) {
  return K(c(t, "VIDEO_PROMPT_SERIES"), { title, slug });
}

function statusText(t, meta) {
  if (meta.status === "failed") return c(t, "VIDEO_STATUS_FAILED");
  if (meta.status === "pending") return c(t, "VIDEO_PENDING");
  const done = meta.videos.filter((v) => v.file).length;
  return done ? K(c(t, "VIDEO_STATUS_MAKING_N"), { count: done }) : c(t, "VIDEO_STATUS_MAKING");
}

function appendPrompt(wrap, prompt) {
  wrap.createEl("textarea", { cls: "lh-vid-prompt", attr: { readonly: "", rows: "3" } }).value = prompt;
}

function copyButton(row, t, prompt) {
  const btn = row.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "VIDEO_COPY_PROMPT") });
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(prompt)
      .then(() => new I.Notice(c(t, "VIDEO_PROMPT_COPIED")))
      .catch((e) => console.warn("EngramQuest: copy prompt failed", e));
  });
}

/** Shown right after a request is saved. `module` names the skill the prompt needs. */
async function openPromptModal(hub, t, { prompt, module }) {
  // The marker, not SKILL.md: silent updates bring the text without the images, audio and fonts.
  const installed = await hub.app.vault.adapter.exists(`.claude/skills/engram-quest-${module}/.engram-pack`).catch(() => true);
  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "VIDEO_PROMPT_TITLE") });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_PROMPT_BODY") });
  appendPrompt(wrap, prompt);
  if (!installed) {
    const missing = wrap.createDiv({ cls: "lh-vid-banner" });
    missing.createSpan({ cls: "lh-vid-banner-text", text: c(t, "VIDEO_SKILL_MISSING") });
    missing.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_INSTALL_SKILL") })
      .addEventListener("click", () => { modal.close(); new SkillsInstallModal(hub.app, hub.plugin).open(); });
  }
  const row = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  row.createEl("button", { cls: "lh-vid-btn", text: c(t, "HUB_CLOSE") }).addEventListener("click", () => modal.close());
  copyButton(row, t, prompt);
  modal.open();
}

/** Where a series stands, why it failed, and what can be done about it. */
function openSeriesStatusModal(hub, t, { slug, meta }, { onRequeue, onDelete }) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal");
  const wrap = modal.contentEl;
  const prompt = seriesPrompt(t, slug, meta.title);
  wrap.createDiv({ cls: "lh-vid-modal-title", text: meta.title });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: `${statusText(t, meta)}\u3000${c(t, meta.status === "failed" ? "VIDEO_STATUS_FAILED_BODY" : meta.status === "making" ? "VIDEO_STATUS_MAKING_BODY" : "VIDEO_PENDING_HINT")}` });
  if (meta.status === "failed" && meta.error) wrap.createDiv({ cls: "lh-vid-error", text: K(c(t, "VIDEO_STATUS_ERROR"), { error: meta.error }) });
  appendPrompt(wrap, prompt);
  const row = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  if (onDelete) {
    row.createEl("button", { cls: "lh-vid-btn lh-vid-btn-danger-text", text: c(t, "DELETE") })
      .addEventListener("click", () => { modal.close(); onDelete(); });
    row.createDiv({ cls: "lh-vid-spacer" });
  }
  if (meta.status === "failed" || meta.status === "making") {
    row.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_REQUEUE") })
      .addEventListener("click", () => { modal.close(); onRequeue(); });
  }
  copyButton(row, t, prompt);
  modal.open();
}

/** Status label for a badge, or "" for a series with nothing to report. */
function seriesBadge(t, meta) {
  return meta.status === "ready" ? "" : statusText(t, meta);
}

module.exports = { seriesPrompt, seriesBadge, statusText, openPromptModal, openSeriesStatusModal };
