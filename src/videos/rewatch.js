"use strict";
// Review cards made from a video say where it explains them: the deck's frontmatter holds `video` (vault
// path) and each answer ends with `影片：<title>（m:ss）`. The time is read from the card itself because
// `video_times` is positional and goes wrong once a card is deleted. A pop-up keeps the session going.

const I = require("obsidian");
const { t: c } = require("../i18n");

function rewatchTarget(app, card) {
  const file = card.notePath && app.vault.getAbstractFileByPath(card.notePath);
  const frontmatter = file && (app.metadataCache.getFileCache(file) || {}).frontmatter;
  if (!frontmatter || typeof frontmatter.video !== "string") return null;
  const stamp = String(card.back || "").match(/^影片：.*（(\d+):(\d{2})）\s*$/m);
  return stamp ? { path: I.normalizePath(frontmatter.video), at: Number(stamp[1]) * 60 + Number(stamp[2]) } : null;
}

function openRewatch(app, { path, at }) {
  const modal = new I.Modal(app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-rewatch");
  const player = modal.contentEl.createEl("video", { cls: "lh-vid-player", attr: { controls: "", playsinline: "", preload: "metadata" } });
  player.src = app.vault.adapter.getResourcePath(path);
  player.addEventListener("loadedmetadata", () => {
    player.currentTime = at;
    player.play().catch(() => { /* autoplay blocked — the user presses play */ });
  });
  modal.onClose = () => player.pause();
  modal.open();
}

/** Adds the entry only when the card has a time and the video is on this device. */
function addRewatchButton(parent, app, t, card) {
  const target = rewatchTarget(app, card);
  if (!target) return;
  const row = parent.createDiv({ cls: "lh-rewatch-row" });
  app.vault.adapter.exists(target.path).catch(() => false).then((found) => {
    if (!found) { row.remove(); return; }
    row.createEl("button", { cls: "lh-vid-btn", text: `▶ ${c(t, "CARD_REWATCH")}` })
      .addEventListener("click", () => openRewatch(app, target));
  });
}

module.exports = { rewatchTarget, openRewatch, addRewatchButton };
