"use strict";
// Hub "Video Academy" tab (影片學院). Two views (ADR-12): the shelf — a continue-watching hero plus
// one row per topic — and the topic view — inline player + that topic's playlist. Watching writes
// position / completed back into the topic's meta.json. The plugin never generates videos: "+ New"
// only records a pending topic for the video skill (doc/開發計劃/影片學院/skills.md).
// View state lives on the hub: hub._vTopic = { slug, videoId, autoplay } | null.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const data = require("./data");
const { openNewVideoModal } = require("./new-modal");
const { openVideoSettingsModal } = require("./settings-modal");
const { attachInfoButton } = require("../hub/feature-guide");

const STYLE_KEYS = { auto: "VIDEO_STYLE_AUTO", fast: "VIDEO_STYLE_FAST", system: "VIDEO_STYLE_SYSTEM", visual: "VIDEO_STYLE_VISUAL", drawn: "VIDEO_STYLE_DRAWN" };
const MODE_KEYS = { basic: "VIDEO_MODE_BASIC", polished: "VIDEO_MODE_POLISHED", principle: "VIDEO_MODE_PRINCIPLE", auto: "VIDEO_MODE_AUTO" };

function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Display name for a style/mode id; unknown ids (future skill values) show as-is. */
function labelOf(t, keys, id) {
  return keys[id] ? c(t, keys[id]) : id;
}

function fileUrl(hub, slug, name) {
  return hub.app.vault.adapter.getResourcePath(I.normalizePath(`${data.VIDEOS_DIR}/${slug}/${name}`));
}

function statusOf(t, meta, video) {
  const p = data.videoProgress(meta, video.id);
  if (p.completed) return { text: c(t, "VIDEO_WATCHED"), cls: "is-done" };
  if (p.position > 0) return { text: K(c(t, "VIDEO_STOPPED_AT"), { time: fmtTime(p.position) }), cls: "is-progress" };
  return { text: c(t, "VIDEO_NOT_STARTED"), cls: "" };
}

/** Thumbnail: the skill's poster when present, otherwise a flat tile; progress bar on the bottom edge. */
function renderThumb(parent, hub, slug, meta, video, cls) {
  const thumb = parent.createDiv({ cls: `lh-vid-thumb ${cls || ""}` });
  thumb.dataset.style = video.style || "none";
  if (video.poster) thumb.createEl("img", { attr: { src: fileUrl(hub, slug, video.poster), alt: "", loading: "lazy" } });
  thumb.createSpan({ cls: "lh-vid-thumb-play", text: "▶" });
  if (video.duration) thumb.createSpan({ cls: "lh-vid-thumb-dur", text: fmtTime(video.duration) });
  const p = data.videoProgress(meta, video.id);
  const pct = p.completed ? 100 : video.duration ? Math.min(100, Math.round((p.position / video.duration) * 100)) : 0;
  thumb.createDiv({ cls: "lh-vid-thumb-bar" }).createDiv({ cls: "lh-vid-thumb-fill", attr: { style: `width:${pct}%` } });
  return thumb;
}

async function renderVideoTab(el, hub) {
  const t = hub.plugin.settings;
  let topics = [];
  try {
    topics = await data.listTopics(hub.app.vault.adapter);
  } catch (err) {
    console.error("EngramQuest: video topic scan failed", err);
  }
  el.empty();
  const refresh = () => { if (el.isConnected) renderVideoTab(el, hub); };
  const root = el.createDiv({ cls: "lh-vid" });
  const sel = hub._vTopic;
  const open = sel && topics.find((x) => x.slug === sel.slug && x.meta.status === "ready");
  if (!open) hub._vTopic = null;

  const head = root.createDiv({ cls: "lh-vid-head" });
  const left = head.createDiv({ cls: "lh-vid-head-left" });
  if (open) {
    left.createEl("button", { cls: "lh-vid-back", text: c(t, "VIDEO_BACK") })
      .addEventListener("click", () => { hub._vTopic = null; refresh(); });
    left.createSpan({ cls: "lh-vid-head-title", text: open.meta.title });
  } else {
    left.createSpan({ cls: "lh-vid-head-title", text: c(t, "TAB_VIDEO") });
    attachInfoButton(left, hub.app, hub.plugin, "video");
  }
  head.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "VIDEO_NEW") })
    .addEventListener("click", () => openNewVideoModal(hub, t, (slug) => { hub._vTopic = null; hub._vFlash = slug; refresh(); }));
  head.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_SETTINGS") })
    .addEventListener("click", () => openVideoSettingsModal(hub, t));

  const body = root.createDiv({ cls: "lh-vid-body" });
  if (open) renderTopic(body, hub, t, open, refresh);
  else renderShelf(body, hub, t, topics, refresh);
}

// ---------------------------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------------------------

function renderShelf(body, hub, t, topics, refresh) {
  if (!topics.length) {
    const empty = body.createDiv({ cls: "lh-vid-empty" });
    empty.createDiv({ cls: "lh-vid-empty-title", text: c(t, "VIDEO_EMPTY_TITLE") });
    empty.createDiv({ cls: "lh-vid-empty-body", text: c(t, "VIDEO_EMPTY_BODY") });
    return;
  }
  const openVideo = (slug, videoId, autoplay) => { hub._vTopic = { slug, videoId, autoplay }; refresh(); };

  const cw = data.continueWatching(topics);
  if (cw) {
    const hero = body.createDiv({ cls: "lh-vid-hero" });
    renderThumb(hero, hub, cw.slug, cw.meta, cw.video, "is-hero").addEventListener("click", () => openVideo(cw.slug, cw.video.id, true));
    const info = hero.createDiv({ cls: "lh-vid-hero-info" });
    info.createSpan({ cls: "lh-vid-kicker", text: c(t, "VIDEO_CONTINUE") });
    info.createDiv({ cls: "lh-vid-hero-topic", text: cw.meta.title });
    info.createDiv({ cls: "lh-vid-hero-title", text: cw.video.title });
    info.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: `▶ ${K(c(t, "VIDEO_RESUME_AT"), { time: fmtTime(cw.progress.position) })}` })
      .addEventListener("click", () => openVideo(cw.slug, cw.video.id, true));
  }

  for (const { slug, meta } of topics) {
    const sec = body.createDiv({ cls: "lh-vid-shelf" + (hub._vFlash === slug ? " is-new" : "") });
    const sh = sec.createDiv({ cls: "lh-vid-shelf-head" });
    sh.createSpan({ cls: "lh-vid-shelf-title", text: meta.title });
    if (meta.status === "pending") {
      renderPending(sec, sh, hub, t, slug, meta, refresh);
      continue;
    }
    const prog = data.topicProgress(meta);
    sh.createSpan({ cls: "lh-vid-shelf-meta", text: K(c(t, "VIDEO_TOPIC_META"), { count: prog.total, done: prog.completed }) });
    sh.createDiv({ cls: "lh-vid-spacer" });
    sh.createEl("button", { cls: "lh-vid-link", text: c(t, "VIDEO_OPEN_TOPIC") })
      .addEventListener("click", () => openVideo(slug, null, false));
    const row = sec.createDiv({ cls: "lh-vid-row" });
    for (const video of meta.videos.filter((v) => v.file)) {
      const card = row.createDiv({ cls: "lh-vid-card" });
      renderThumb(card, hub, slug, meta, video);
      card.createDiv({ cls: "lh-vid-card-title", text: video.title });
      const st = statusOf(t, meta, video);
      card.createDiv({ cls: `lh-vid-status ${st.cls}`, text: st.text });
      card.addEventListener("click", () => openVideo(slug, video.id, true));
    }
  }
  hub._vFlash = null;
}

function renderPending(sec, sh, hub, t, slug, meta, refresh) {
  sh.createSpan({ cls: "lh-vid-badge-pending", text: c(t, "VIDEO_PENDING") });
  sh.createDiv({ cls: "lh-vid-spacer" });
  sh.createEl("button", { cls: "lh-vid-link is-danger", text: c(t, "DELETE") })
    .addEventListener("click", () => confirmDelete(hub, t, slug, meta, refresh));
  const box = sec.createDiv({ cls: "lh-vid-pending" });
  const req = meta.request;
  if (req) {
    const src = req.source === "general" ? "VIDEO_SOURCE_GENERAL" : "VIDEO_SOURCE_NOTES";
    const line = box.createDiv({ cls: "lh-vid-pending-src" });
    line.createSpan({ text: c(t, src) });
    for (const ref of req.refs) line.createSpan({ cls: "lh-vid-chip", text: ref.split("/").pop() || ref });
  }
  if (meta.note) box.createDiv({ cls: "lh-vid-pending-note", text: meta.note });
  box.createDiv({ cls: "lh-vid-pending-hint", text: c(t, "VIDEO_PENDING_HINT") });
}

function confirmDelete(hub, t, slug, meta, refresh) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-confirm");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: K(c(t, "DELETE_CONFIRM_TITLE"), { name: meta.title }) });
  wrap.createDiv({ cls: "lh-vid-modal-desc", text: c(t, "VIDEO_DELETE_BODY") });
  const row = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  row.createEl("button", { cls: "lh-vid-btn", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const ok = row.createEl("button", { cls: "lh-vid-btn lh-vid-btn-danger", text: c(t, "DELETE_CONFIRM_BTN") });
  ok.addEventListener("click", async () => {
    if (ok.disabled) return;
    ok.disabled = true;
    modal.close();
    try {
      await data.deleteTopic(hub.app.vault.adapter, slug);
    } catch (e) {
      console.error("EngramQuest: video topic delete failed", e);
    }
    refresh();
  });
  modal.open();
}

// ---------------------------------------------------------------------------------------------
// Topic view: inline player + playlist
// ---------------------------------------------------------------------------------------------

/** Which video to show when a topic opens without an explicit pick: last unfinished, else first unwatched. */
function defaultVideo(meta, playable) {
  let best = null;
  for (const v of playable) {
    const p = data.videoProgress(meta, v.id);
    if (p.lastViewed && !p.completed && (!best || p.lastViewed > best.p.lastViewed)) best = { v, p };
  }
  if (best) return best.v;
  return playable.find((v) => !data.videoProgress(meta, v.id).completed) || playable[0];
}

function renderTopic(body, hub, t, topic, refresh) {
  const { slug, meta } = topic;
  const adapter = hub.app.vault.adapter;
  const playable = meta.videos.filter((v) => v.file);
  const sel = hub._vTopic || {};
  const video = playable.find((v) => v.id === sel.videoId) || defaultVideo(meta, playable);
  const autoplay = !!sel.autoplay;
  hub._vTopic = { slug, videoId: video.id, autoplay: false };

  const layout = body.createDiv({ cls: "lh-vid-topic" });
  const main = layout.createDiv({ cls: "lh-vid-main" });
  const stage = main.createDiv({ cls: "lh-vid-stage" });

  // Progress writes are serialised so read-merge-write calls never interleave.
  let chain = Promise.resolve();
  const save = (patch) => {
    chain = chain.then(() => data.saveProgress(adapter, slug, video.id, patch)).catch((e) => console.warn("EngramQuest: video progress save failed", e));
    return chain;
  };
  let player = null;
  const leave = (next) => {
    if (player && !player.ended && player.currentTime > 0) save({ position: player.currentTime });
    chain.then(() => { hub._vTopic = next; refresh(); });
  };

  mountPlayer(stage, hub, t, slug, meta, video, autoplay, save, playable, (p) => { player = p; }, (next) => leave(next));

  const info = main.createDiv({ cls: "lh-vid-info" });
  const titleRow = info.createDiv({ cls: "lh-vid-info-row" });
  const titles = titleRow.createDiv({ cls: "lh-vid-info-titles" });
  titles.createDiv({ cls: "lh-vid-info-title", text: video.title });
  const metaBits = [labelOf(t, STYLE_KEYS, video.style), labelOf(t, MODE_KEYS, video.mode), video.duration ? fmtTime(video.duration) : ""].filter(Boolean);
  titles.createDiv({ cls: "lh-vid-info-meta", text: metaBits.join(" · ") });
  const done = data.videoProgress(meta, video.id).completed;
  const doneBtn = titleRow.createEl("button", { cls: "lh-vid-btn" + (done ? " is-done" : " lh-vid-btn-primary"), text: c(t, done ? "VIDEO_MARKED_DONE" : "VIDEO_MARK_DONE") });
  doneBtn.addEventListener("click", () => { save({ completed: !done }); leave({ slug, videoId: video.id, autoplay: false }); });

  if (meta.sources.length) {
    const src = info.createDiv({ cls: "lh-vid-sources" });
    src.createSpan({ text: `${c(t, "VIDEO_SOURCES")}：` });
    for (const path of meta.sources) {
      const a = src.createEl("a", { cls: "lh-vid-source", text: path.split("/").pop().replace(/\.md$/, "") });
      a.addEventListener("click", (e) => { e.preventDefault(); hub.app.workspace.openLinkText(path, "", true); });
    }
  }

  const side = layout.createDiv({ cls: "lh-vid-side" });
  const prog = data.topicProgress(meta);
  side.createDiv({ cls: "lh-vid-side-head", text: `${c(t, "VIDEO_PLAYLIST")} · ${K(c(t, "VIDEO_TOPIC_META"), { count: prog.total, done: prog.completed })}` });
  for (const v of playable) {
    const item = side.createDiv({ cls: "lh-vid-item" + (v.id === video.id ? " is-current" : "") });
    renderThumb(item, hub, slug, meta, v, "is-small");
    const txt = item.createDiv({ cls: "lh-vid-item-text" });
    txt.createDiv({ cls: "lh-vid-item-title", text: v.title });
    const st = v.id === video.id ? { text: c(t, "VIDEO_PLAYING"), cls: "is-progress" } : statusOf(t, meta, v);
    txt.createDiv({ cls: `lh-vid-status ${st.cls}`, text: st.text });
    if (v.id !== video.id) item.addEventListener("click", () => leave({ slug, videoId: v.id, autoplay: true }));
  }
}

function mountPlayer(stage, hub, t, slug, meta, video, autoplay, save, playable, setPlayer, leave) {
  const src = `${data.VIDEOS_DIR}/${slug}/${video.file}`;
  const vid = stage.createEl("video", { cls: "lh-vid-player", attr: { controls: "", preload: "metadata", playsinline: "" } });
  vid.src = fileUrl(hub, slug, video.file);
  if (video.subtitles) {
    vid.createEl("track", { attr: { kind: "subtitles", src: fileUrl(hub, slug, video.subtitles), srclang: "und", label: c(t, "VIDEO_SET_SUBS"), default: "" } });
  }
  setPlayer(vid);
  // A synced vault can carry meta.json without the (git-ignored / unsynced) mp4.
  hub.app.vault.adapter.exists(src).then((ok) => {
    if (ok) return;
    vid.remove();
    stage.createDiv({ cls: "lh-vid-missing", text: c(t, "VIDEO_MISSING_FILE") });
  }).catch(() => {});

  const start = data.videoProgress(meta, video.id);
  let lastSaved = start.position;
  vid.addEventListener("loadedmetadata", () => {
    if (!start.completed && start.position > 3 && start.position < vid.duration - 3) vid.currentTime = start.position;
    if (autoplay) vid.play().catch(() => { /* autoplay blocked — the user presses play */ });
  });
  vid.addEventListener("play", () => save({ position: vid.currentTime }));
  vid.addEventListener("timeupdate", () => {
    if (Math.abs(vid.currentTime - lastSaved) < 5) return;
    lastSaved = vid.currentTime;
    save({ position: vid.currentTime });
  });
  vid.addEventListener("pause", () => { if (!vid.ended) save({ position: vid.currentTime }); });
  vid.addEventListener("ended", () => {
    save({ position: 0, completed: true });
    // Continuous watching: move on to the next unwatched video of this topic, if any.
    const idx = playable.findIndex((v) => v.id === video.id);
    const next = playable.slice(idx + 1).find((v) => !data.videoProgress(meta, v.id).completed);
    leave(next ? { slug, videoId: next.id, autoplay: true } : { slug, videoId: video.id, autoplay: false });
  });
}

module.exports = { renderVideoTab, fmtTime };
