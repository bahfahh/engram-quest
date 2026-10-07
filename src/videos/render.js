"use strict";
// Hub "Video Academy" tab (影片學院). Two views (ADR-12): the shelf — a continue-watching bar, filter
// chips and a card grid of every series (ADR-20) — and the topic view — inline player + playlist. Watching writes
// position / completed back into the topic's meta.json. The plugin never generates videos: "+ New series"
// only records a pending topic for the video skill (doc/開發計劃/影片學院/skills.md).
// View state lives on the hub: hub._vTopic = { slug, videoId, autoplay } | null.

const I = require("obsidian");
const { t: c, interpolate: K, getLocale } = require("../i18n");
const data = require("./data");
const looks = require("./looks");
const { openNewVideoModal, styleSelect } = require("./new-modal");
const { openVideoSettingsModal } = require("./settings-modal");
const { attachInfoButton } = require("../hub/feature-guide");

// One progress-write chain per topic, shared across re-renders: the old player's final "pause"
// save and the new player's first save must not interleave their read-merge-write of meta.json.
const saveChains = new Map();

/** Serialise the plugin's read-merge-writes of one topic's meta.json (progress saves, style changes). */
function queueWrite(slug, fn) {
  const chain = (saveChains.get(slug) || Promise.resolve()).then(fn);
  saveChains.set(slug, chain.catch(() => {}));
  return chain;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Display name of the look a video was made in; ids no registry knows (legacy values) show nothing. */
function lookLabel(hub, t, id) {
  const look = looks.findLook(id, hub._vLooks || []);
  return look ? looks.localText(look.name, getLocale(t), id) : "";
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
  const adapter = hub.app.vault.adapter;
  // The Hub renders every tab into the same container; if the user switched tabs while we were
  // scanning, drop this render instead of overwriting the tab now on screen.
  const gen = hub._tabGen;
  let topics = [];
  try {
    // Keep the two files the skill reads in step with the licence and the bundled look registry.
    await Promise.all([data.syncSettingsLicense(adapter, !!t.licenseValid), looks.syncCatalog(adapter)]);
    [topics, hub._vLooks] = await Promise.all([data.listTopics(adapter), looks.listUserLooks(adapter)]);
  } catch (err) {
    console.error("EngramQuest: video topic scan failed", err);
  }
  if (hub._tabGen !== gen || !el.isConnected) return;
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
    renderStylePicker(left, hub, t, open, refresh);
  } else {
    left.createSpan({ cls: "lh-vid-head-title", text: c(t, "TAB_VIDEO") });
    attachInfoButton(left, hub.app, hub.plugin, "video");
  }
  head.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "VIDEO_NEW") })
    .addEventListener("click", () => openNewVideoModal(hub, t, (slug) => {
      hub._vTopic = null; hub._vFlash = slug; hub._vFilter = "all"; hub._vQuery = ""; hub._vTag = "";
      refresh();
    }));
  head.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_SETTINGS") })
    .addEventListener("click", () => openVideoSettingsModal(hub, t));

  const body = root.createDiv({ cls: "lh-vid-body" });
  if (open) renderTopic(body, hub, t, open, refresh);
  else renderShelf(body, hub, t, topics, refresh);
}

// ---------------------------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------------------------

const FILTERS = [["all", "VIDEO_F_ALL"], ["watching", "VIDEO_F_WATCHING"], ["new", "VIDEO_F_NEW"], ["done", "VIDEO_F_DONE"], ["pending", "VIDEO_PENDING"]];
// Search only earns its space once the grid stops fitting on one screen (same rule as Lessons).
const SEARCH_MIN_TOPICS = 6;

function matchesQuery(meta, q) {
  if (!q) return true;
  const hay = [meta.title, meta.request ? meta.request.detail : "", ...meta.tags].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

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
    const bar = body.createDiv({ cls: "lh-vid-continue" });
    renderThumb(bar, hub, cw.slug, cw.meta, cw.video, "is-continue").addEventListener("click", () => openVideo(cw.slug, cw.video.id, true));
    const info = bar.createDiv({ cls: "lh-vid-continue-info" });
    info.createDiv({ cls: "lh-vid-kicker", text: `${c(t, "VIDEO_CONTINUE")} · ${cw.meta.title}` });
    info.createDiv({ cls: "lh-vid-continue-title", text: cw.video.title });
    bar.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: `▶ ${K(c(t, "VIDEO_RESUME_AT"), { time: fmtTime(cw.progress.position) })}` })
      .addEventListener("click", () => openVideo(cw.slug, cw.video.id, true));
  }

  const states = new Map(topics.map(({ slug, meta }) => [slug, data.topicState(meta)]));
  // A remembered filter whose bucket has emptied (e.g. the last pending series was deleted) resets.
  if (!FILTERS.some(([id]) => id === hub._vFilter) || (hub._vFilter !== "all" && ![...states.values()].includes(hub._vFilter))) hub._vFilter = "all";
  const flash = hub._vFlash;
  hub._vFlash = null;

  // Tags come from the skill (ADR-23); a remembered tag no series carries any more resets.
  const tags = data.collectTags(topics);
  // "" = all tags (not a word, so a skill-written tag can never collide with it).
  if (hub._vTag && !tags.some((x) => x.tag === hub._vTag)) hub._vTag = "";

  const bar = body.createDiv({ cls: "lh-vid-filters" });
  const chips = bar.createDiv({ cls: "lh-vid-chips" });
  bar.createDiv({ cls: "lh-vid-spacer" });
  const results = body.createDiv();
  // Chips and grid redraw from the topics already in memory: typing in the search box must never
  // rebuild the tab, which would drop the input mid-IME composition and rescan every meta.json.
  const draw = () => {
    const matching = topics.filter(({ meta }) => matchesQuery(meta, hub._vQuery || "") && (!hub._vTag || meta.tags.includes(hub._vTag)));
    const count = (id) => (id === "all" ? matching.length : matching.filter(({ slug }) => states.get(slug) === id).length);
    chips.empty();
    for (const [id, key] of FILTERS) {
      const n = count(id);
      if (id !== "all" && n === 0 && hub._vFilter !== id) continue;
      chips.createEl("button", { cls: "lh-vid-chip-btn" + (hub._vFilter === id ? " is-on" : ""), text: `${c(t, key)} ${n}` })
        .addEventListener("click", () => { hub._vFilter = id; draw(); });
    }
    results.empty();
    const shown = matching.filter(({ slug }) => hub._vFilter === "all" || states.get(slug) === hub._vFilter);
    if (!shown.length) {
      results.createDiv({ cls: "lh-vid-empty-body", text: c(t, "VIDEO_NO_MATCH") });
      return;
    }
    const grid = results.createDiv({ cls: "lh-vid-grid" });
    for (const topic of shown) {
      const card = grid.createEl("button", { cls: "lh-vid-scard" + (flash === topic.slug ? " is-new" : "") });
      if (topic.meta.status === "pending") renderPendingCard(card, hub, t, topic, refresh);
      else renderSeriesCard(card, hub, t, topic, () => openVideo(topic.slug, null, false));
    }
  };
  if (tags.length) {
    const sel = bar.createEl("select", { cls: "lh-vid-select lh-vid-tag-select", attr: { "aria-label": c(t, "VIDEO_TAG_FILTER") } });
    sel.createEl("option", { text: c(t, "VIDEO_TAG_ALL"), attr: { value: "" } });
    for (const { tag, count } of tags) sel.createEl("option", { text: `${tag} (${count})`, attr: { value: tag } });
    sel.value = hub._vTag || "";
    sel.toggleClass("is-on", !!hub._vTag);
    sel.addEventListener("change", () => { hub._vTag = sel.value; sel.toggleClass("is-on", !!sel.value); draw(); });
  }
  if (topics.length >= SEARCH_MIN_TOPICS || hub._vQuery) {
    const search = bar.createEl("input", { cls: "lh-vid-search", attr: { type: "search", placeholder: c(t, "VIDEO_SEARCH_PH"), "aria-label": c(t, "VIDEO_SEARCH_PH") } });
    search.value = hub._vQuery || "";
    const apply = () => { hub._vQuery = search.value; draw(); };
    search.addEventListener("input", (e) => { if (!e.isComposing) apply(); });
    search.addEventListener("compositionend", apply);
  }
  draw();
}

/** Ready series: cover (first poster), video count, overall progress, name. */
function renderSeriesCard(card, hub, t, { slug, meta }, open) {
  const prog = data.topicProgress(meta);
  const cover = card.createSpan({ cls: "lh-vid-scard-cover" });
  const poster = meta.videos.find((v) => v.file && v.poster);
  if (poster) cover.createEl("img", { attr: { src: fileUrl(hub, slug, poster.poster), alt: "", loading: "lazy" } });
  cover.createSpan({ cls: "lh-vid-thumb-dur", text: K(c(t, "VIDEO_COUNT"), { count: prog.total }) });
  const pct = prog.total ? Math.round((prog.completed / prog.total) * 100) : 0;
  cover.createSpan({ cls: "lh-vid-thumb-bar" }).createSpan({ cls: "lh-vid-thumb-fill", attr: { style: `width:${pct}%` } });
  card.createSpan({ cls: "lh-vid-scard-title", text: meta.title });
  card.createSpan({ cls: "lh-vid-scard-meta", text: K(c(t, "VIDEO_TOPIC_META"), { count: prog.total, done: prog.completed }) });
  card.addEventListener("click", open);
}

/** Pending series: what the learner asked for; clicking opens the same form to edit or delete it. */
function renderPendingCard(card, hub, t, { slug, meta }, refresh) {
  card.addClass("is-pending");
  const box = card.createSpan({ cls: "lh-vid-scard-cover is-pending" });
  box.createSpan({ cls: "lh-vid-badge-pending", text: c(t, "VIDEO_PENDING") });
  const req = meta.request;
  box.createSpan({ cls: "lh-vid-scard-goal", text: meta.note || (req && req.detail) || c(t, "VIDEO_PENDING_HINT") });
  card.createSpan({ cls: "lh-vid-scard-title", text: meta.title });
  const bits = [req && req.source === "general" ? c(t, "VIDEO_SOURCE_GENERAL") : c(t, "VIDEO_SOURCE_NOTES")];
  if (req && req.refs.length) bits.push(K(c(t, "VIDEO_REFS_COUNT"), { count: req.refs.length }));
  card.createSpan({ cls: "lh-vid-scard-meta", text: bits.join(" · ") });
  card.setAttr("title", c(t, "VIDEO_PENDING_EDIT"));
  card.addEventListener("click", () => openNewVideoModal(hub, t, () => refresh(), { slug, meta }, () => confirmDelete(hub, t, slug, meta, refresh)));
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
      if (!(await data.deleteTopic(hub.app.vault.adapter, slug))) new I.Notice(c(t, "VIDEO_DELETE_PARTIAL"));
    } catch (e) {
      console.error("EngramQuest: video topic delete failed", e);
    }
    refresh();
  });
  modal.open();
}

/** The series' video style (ADR-22): the skill uses it for this series' next videos. */
function renderStylePicker(parent, hub, t, { slug, meta }, refresh) {
  const wrap = parent.createDiv({ cls: "lh-vid-style-pick" });
  wrap.createEl("label", { text: c(t, "VIDEO_SERIES_STYLE"), attr: { for: "lh-vid-series-style" } });
  const sel = styleSelect(wrap, t, "lh-vid-series-style", meta.style, { isPro: !!t.licenseValid, userLooks: hub._vLooks || [] });
  sel.addEventListener("change", () => {
    const style = sel.value;
    queueWrite(slug, () => data.setTopicStyle(hub.app.vault.adapter, slug, style))
      .then((ok) => { if (ok) new I.Notice(c(t, "VIDEO_STYLE_SAVED")); else refresh(); })
      .catch((e) => { console.error("EngramQuest: video series style save failed", e); refresh(); });
  });
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

  const save = (patch) => queueWrite(slug, () => data.saveProgress(adapter, slug, video.id, patch))
    .catch((e) => console.warn("EngramQuest: video progress save failed", e));
  let player = null;
  const leave = (next) => {
    const pending = player && !player.ended && player.currentTime > 0 ? save({ position: player.currentTime }) : saveChains.get(slug) || Promise.resolve();
    pending.then(() => { hub._vTopic = next; refresh(); });
  };

  mountPlayer(stage, hub, t, slug, meta, video, autoplay, save, playable, (p) => { player = p; }, (next) => leave(next));

  const info = main.createDiv({ cls: "lh-vid-info" });
  const titleRow = info.createDiv({ cls: "lh-vid-info-row" });
  const titles = titleRow.createDiv({ cls: "lh-vid-info-titles" });
  titles.createDiv({ cls: "lh-vid-info-title", text: video.title });
  const metaBits = [lookLabel(hub, t, video.style), video.duration ? fmtTime(video.duration) : ""].filter(Boolean);
  titles.createDiv({ cls: "lh-vid-info-meta", text: metaBits.join(" · ") });
  // Desktop only: open the OS file manager at this video's mp4 (or its folder if the file isn't on this device).
  if (I.Platform.isDesktopApp && typeof hub.app.showInFolder === "function") {
    const label = c(t, "VIDEO_SHOW_IN_FOLDER");
    const reveal = titleRow.createEl("button", { cls: "lh-vid-btn lh-vid-icon-btn", attr: { "aria-label": label, title: label } });
    I.setIcon(reveal, "folder-open");
    reveal.addEventListener("click", async () => {
      const dir = I.normalizePath(`${data.VIDEOS_DIR}/${slug}`);
      const file = I.normalizePath(`${dir}/${video.file}`);
      try { await hub.app.showInFolder((await adapter.exists(file)) ? file : dir); }
      catch (e) { console.warn("EngramQuest: show video in folder failed", e); }
    });
  }
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
  // A synced vault can carry meta.json without the unsynced mp4, and a file can exist yet fail to
  // decode on this device — each gets its own message instead of a black player, so the learner
  // knows whether to fix their sync or the file.
  const showProblem = (key) => {
    if (!vid.isConnected) return;
    vid.remove();
    stage.createDiv({ cls: "lh-vid-missing", text: c(t, key) });
  };
  const fileExists = hub.app.vault.adapter.exists(src).catch(() => true);
  fileExists.then((ok) => { if (!ok) showProblem("VIDEO_MISSING_FILE"); });
  vid.addEventListener("error", () => { fileExists.then((ok) => showProblem(ok ? "VIDEO_PLAY_FAILED" : "VIDEO_MISSING_FILE")); });

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
