"use strict";
// Hub "Video Academy" tab (影片學院). Two views (ADR-12): the shelf — a continue-watching bar, filter
// chips and a card grid of every series (ADR-20) — and the topic view — inline player + playlist. Watching writes
// position / completed back into the topic's meta.json. The plugin never generates videos: "+ New series"
// only records a pending topic for the video skill (doc/features/video-academy/contract.md).
// View state lives on the hub: hub._vTopic = { slug, videoId, autoplay } | null.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const data = require("./data");
const { openNewVideoModal } = require("./new-modal");
const { openVideoSettingsModal } = require("./settings-modal");
const { teacherOfVideo } = require("./teachers");
const { teacherTag } = require("./teacher-picker");
const { seriesBadge, statusText, openSeriesStatusModal } = require("./request-ui");
const { fmtTime, rowStatus } = require("./playlist");
const { attachInfoButton } = require("../hub/feature-guide");
const ui = require("../hub/ui");

// One progress-write chain per topic, shared across re-renders: the old player's final "pause"
// save and the new player's first save must not interleave their read-merge-write of meta.json.
const saveChains = new Map();

/** Serialise the plugin's read-merge-writes of one topic's meta.json. */
function queueWrite(slug, fn) {
  const chain = (saveChains.get(slug) || Promise.resolve()).then(fn);
  saveChains.set(slug, chain.catch(() => {}));
  return chain;
}

function fileUrl(hub, slug, name) {
  return hub.app.vault.adapter.getResourcePath(I.normalizePath(`${data.VIDEOS_DIR}/${slug}/${name}`));
}

/** Thumbnail: the skill's poster when present, otherwise a flat tile; progress bar on the bottom edge. */
function renderThumb(parent, hub, slug, meta, video, cls) {
  const thumb = parent.createDiv({ cls: `lh-vid-thumb ${cls || ""}` });
  if (video.poster) thumb.createEl("img", { attr: { src: fileUrl(hub, slug, video.poster), alt: "", loading: "lazy" } });
  ui.rawIcon(thumb.createSpan({ cls: "lh-vid-thumb-play" }), ui.PLAY);
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
    // The skill reads the licence state from settings.json.
    await data.syncSettingsLicense(adapter, !!t.licenseValid).catch((e) => console.warn("EngramQuest: video licence sync failed", e));
    topics = await data.listTopics(adapter);
  } catch (err) {
    console.error("EngramQuest: video topic scan failed", err);
  }
  if (hub._tabGen !== gen || !el.isConnected) return;
  el.empty();
  const refresh = () => { if (el.isConnected && hub._tabGen === gen) renderVideoTab(el, hub); };
  const root = el.createDiv({ cls: "lh-vid" });
  const sel = hub._vTopic;
  const open = sel && topics.find((x) => x.slug === sel.slug && data.hasPlayable(x.meta));
  if (!open) hub._vTopic = null;
  hub._entryHints = { ...hub._entryHints, video: K(c(t, "VIDEO_ENTRY_WATCHING"), { count: topics.filter(({ meta }) => data.topicState(meta) === "watching").length }) };

  hub.setHero(!open);
  hub.setWatching(!!open);
  const toShelf = () => { hub._vTopic = null; refresh(); };
  ui.setPhoneNav(hub, open ? { label: c(t, "VIDEO_BACK"), title: "", onBack: toShelf } : null);
  const actions = (parent) => {
    const settings = parent.createEl("button", { cls: "lh-vid-btn" });
    ui.icon(settings, "gear");
    settings.createEl("span", { text: c(t, "VIDEO_SETTINGS") });
    settings.addEventListener("click", () => openVideoSettingsModal(hub, t));
    const add = parent.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary" });
    ui.icon(add, "plus");
    add.createEl("span", { text: c(t, "VIDEO_NEW") });
    add.addEventListener("click", () => openNewVideoModal(hub, t, (slug) => {
        hub._vTopic = null; hub._vFlash = slug; hub._vFilter = "all"; hub._vQuery = ""; hub._vTag = "";
        refresh();
      }));
  };
  if (open && !ui.isPhone()) {
    const head = root.createDiv({ cls: "lh-vid-head-row" });
    head.createEl("button", { cls: "lh-vid-back", text: c(t, "VIDEO_BACK") }).addEventListener("click", toShelf);
    head.createSpan({ cls: "lh-vid-head-title", text: open.meta.title });
    head.createDiv({ cls: "lh-vid-spacer" });
    actions(head);
  } else if (!open) {
    const { right } = ui.pageHeader(root, hub, { titleKey: "TAB_VIDEO", guide: "video" });
    actions(right());
  }

  const body = root.createDiv({ cls: "lh-scroll" }).createDiv({ cls: "lh-vid-body" });
  if (open) renderTopic(body, hub, t, open, refresh);
  else renderShelf(body, hub, t, topics, refresh);
}

// ---------------------------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------------------------

const FILTERS = [["all", "VIDEO_F_ALL"], ["watching", "VIDEO_F_WATCHING"], ["new", "VIDEO_F_NEW"], ["done", "VIDEO_F_DONE"], ["pending", "VIDEO_F_QUEUE"]];
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
    ui.icon(empty.createDiv({ cls: "lh-vid-empty-icon" }), "video");
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
    const resume = bar.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary" });
    ui.rawIcon(resume, ui.PLAY);
    resume.createSpan({ text: K(c(t, "VIDEO_RESUME_AT"), { time: fmtTime(cw.progress.position) }) });
    resume.addEventListener("click", () => openVideo(cw.slug, cw.video.id, true));
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
  const chips = bar.createDiv({ cls: "lh-seg", attr: { role: "group" } });
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
      chips.createEl("button", { cls: hub._vFilter === id ? "on" : "", text: `${c(t, key)} ${n}`, attr: { "aria-pressed": String(hub._vFilter === id) } })
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
      if (data.hasPlayable(topic.meta)) renderSeriesCard(card, hub, t, topic, () => openVideo(topic.slug, null, false));
      else renderQueueCard(card, hub, t, topic, refresh);
    }
  };
  if (tags.length) {
    const sel = bar.createEl("select", { cls: "lh-fp dropdown", attr: { "aria-label": c(t, "VIDEO_TAG_FILTER") } });
    sel.createEl("option", { text: c(t, "VIDEO_TAG_ALL"), attr: { value: "" } });
    for (const { tag, count } of tags) sel.createEl("option", { text: `${tag} (${count})`, attr: { value: tag } });
    sel.value = hub._vTag || "";
    sel.toggleClass("is-set", !!hub._vTag);
    sel.addEventListener("change", () => { hub._vTag = sel.value; sel.toggleClass("is-set", !!sel.value); draw(); });
  }
  if (topics.length >= SEARCH_MIN_TOPICS || hub._vQuery) {
    const searchBox = bar.createDiv({ cls: "lh-sf", attr: { style: "width:200px" } });
    ui.icon(searchBox, "search");
    const search = searchBox.createEl("input", { attr: { type: "text", placeholder: c(t, "VIDEO_SEARCH_PH"), "aria-label": c(t, "VIDEO_SEARCH_PH") } });
    search.value = hub._vQuery || "";
    const apply = () => { hub._vQuery = search.value; draw(); };
    search.addEventListener("input", (e) => { if (!e.isComposing) apply(); });
    search.addEventListener("compositionend", apply);
  }
  draw();
}

const badgeTone = (meta) => (meta.status === "failed" ? " is-failed" : meta.status === "making" ? " is-making" : "");

/** Ready series: cover (first poster), video count, overall progress, name. */
function renderSeriesCard(card, hub, t, { slug, meta }, open) {
  const prog = data.topicProgress(meta);
  const cover = card.createSpan({ cls: "lh-vid-scard-cover" });
  const poster = meta.videos.find((v) => v.file && v.poster);
  if (poster) cover.createEl("img", { attr: { src: fileUrl(hub, slug, poster.poster), alt: "", loading: "lazy" } });
  ui.rawIcon(cover.createSpan({ cls: "lh-vid-thumb-play" }), ui.PLAY);
  cover.createSpan({ cls: "lh-vid-thumb-dur", text: K(c(t, "VIDEO_COUNT"), { count: prog.total }) });
  const pct = prog.total ? Math.round((prog.completed / prog.total) * 100) : 0;
  cover.createSpan({ cls: "lh-vid-thumb-bar" }).createSpan({ cls: "lh-vid-thumb-fill", attr: { style: `width:${pct}%` } });
  const badge = seriesBadge(t, meta);
  if (badge) cover.createSpan({ cls: "lh-vid-badge-pending lh-vid-cover-badge" + badgeTone(meta), text: badge });
  card.createSpan({ cls: "lh-vid-scard-title", text: meta.title });
  card.createSpan({ cls: "lh-vid-scard-meta", text: K(c(t, "VIDEO_TOPIC_META"), { count: prog.total, done: prog.completed }) });
  const taught = meta.videos.find((v) => v.cast);
  if (taught) teacherTag(card, t, teacherOfVideo(taught.cast.teacher), taught.cast.variant);
  card.addEventListener("click", open);
}

/** A series with nothing to play yet. Waiting ones open the form to edit; the others show their status. */
function renderQueueCard(card, hub, t, { slug, meta }, refresh) {
  card.addClass("is-pending");
  const failed = meta.status === "failed";
  const box = card.createSpan({ cls: "lh-vid-scard-cover is-pending" });
  box.createSpan({ cls: "lh-vid-badge-pending" + badgeTone(meta), text: statusText(t, meta) });
  const req = meta.request;
  box.createSpan({ cls: "lh-vid-scard-goal", text: (failed && meta.error) || meta.note || (req && req.detail) || c(t, "VIDEO_PENDING_HINT") });
  card.createSpan({ cls: "lh-vid-scard-title", text: meta.title });
  const bits = [req && req.source === "general" ? c(t, "VIDEO_SOURCE_GENERAL") : c(t, "VIDEO_SOURCE_NOTES")];
  if (req && req.refs.length) bits.push(K(c(t, "VIDEO_REFS_COUNT"), { count: req.refs.length }));
  card.createSpan({ cls: "lh-vid-scard-meta", text: bits.join(" · ") });
  const onDelete = () => confirmDelete(hub, t, slug, meta, refresh);
  if (meta.status === "pending") {
    card.setAttr("title", c(t, "VIDEO_PENDING_EDIT"));
    card.addEventListener("click", () => openNewVideoModal(hub, t, () => refresh(), { slug, meta }, onDelete));
  } else {
    card.addEventListener("click", () => showStatus(hub, t, { slug, meta }, refresh, onDelete));
  }
}

function showStatus(hub, t, topic, refresh, onDelete) {
  openSeriesStatusModal(hub, t, topic, {
    onDelete,
    onRequeue: () => queueWrite(topic.slug, () => data.requeueSeries(hub.app.vault.adapter, topic.slug))
      .then((ok) => { if (ok) new I.Notice(c(t, "VIDEO_REQUEUED")); })
      .catch((e) => console.error("EngramQuest: video requeue failed", e))
      .then(refresh),
  });
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

// ---------------------------------------------------------------------------------------------
// Topic view: inline player + playlist. On a desktop everything about the video on screen sits in
// `.lh-vid-main` and the playlist is its sibling, so a wide window can put the list beside the player;
// a narrow window stacks them in the phone's order (styles.js). A phone has no wrapper: one column.
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

  const phone = ui.isPhone();
  const layout = body.createDiv({ cls: "lh-vid-topic" });
  const main = phone ? layout : layout.createDiv({ cls: "lh-vid-main" });
  const badge = seriesBadge(t, meta);
  if (badge) {
    const banner = main.createDiv({ cls: "lh-vid-banner" + (meta.status === "failed" ? " is-failed" : "") });
    banner.createSpan({ cls: "lh-vid-banner-text", text: badge });
    banner.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_STATUS_DETAILS") })
      .addEventListener("click", () => showStatus(hub, t, topic, refresh, null));
  }

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
  const infoMeta = titles.createDiv({ cls: "lh-vid-info-meta" });
  if (video.duration) infoMeta.createSpan({ text: fmtTime(video.duration) });
  if (video.cast) teacherTag(infoMeta, t, teacherOfVideo(video.cast.teacher), video.cast.variant);
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
  const doneBtn = titleRow.createEl("button", { cls: phone ? "lh-pbtn" + (done ? " alt" : "") : "lh-vid-btn" + (done ? " is-done" : " lh-vid-btn-primary"), text: c(t, done ? "VIDEO_MARKED_DONE" : "VIDEO_MARK_DONE") });
  doneBtn.addEventListener("click", () => { save({ completed: !done }); leave({ slug, videoId: video.id, autoplay: false }); });

  if (meta.sources.length) {
    const src = (phone ? info : infoMeta).createDiv({ cls: "lh-vid-sources" });
    src.createSpan({ text: `${c(t, "VIDEO_SOURCES")}：` });
    for (const path of meta.sources) {
      const a = src.createEl("a", { cls: "lh-vid-source", text: path.split("/").pop().replace(/\.md$/, "") });
      a.addEventListener("click", (e) => { e.preventDefault(); hub.app.workspace.openLinkText(path, "", true); });
    }
  }

  const side = layout.createDiv({ cls: "lh-vid-side" });
  const prog = data.topicProgress(meta);
  const others = topic.othersOnPhone && phone;
  side.createDiv({ cls: "lh-vid-side-head", text: others ? c(t, "EPISODIC_OTHERS") : `${c(t, "VIDEO_PLAYLIST")} · ${K(c(t, "VIDEO_TOPIC_META"), { count: prog.total, done: prog.completed })}` });
  const shelf = side.createDiv({ cls: "lh-vid-side-list" });
  let current = null;
  for (const v of playable) {
    if (others && v.id === video.id) continue;
    const st = rowStatus(t, meta, v, video.id);
    const item = shelf.createDiv({ cls: "lh-vid-item" + (st.kind === "playing" ? " is-current" : "") });
    renderThumb(item, hub, slug, meta, v, "is-small");
    const txt = item.createDiv({ cls: "lh-vid-item-text" });
    txt.createDiv({ cls: "lh-vid-item-title", text: v.title });
    const line = txt.createDiv({ cls: `lh-vid-status is-${st.kind}` });
    // A phone row shows the length on its thumbnail; a desktop row adds a mark that reads without the words.
    if (!phone && st.kind === "playing") ui.rawIcon(line, ui.PLAY);
    if (!phone && st.kind === "done") ui.icon(line, "check");
    line.createSpan({ text: (v.duration && !phone ? `${fmtTime(v.duration)} · ` : "") + st.text });
    if (st.kind === "playing") current = item;
    else item.addEventListener("click", () => leave({ slug, videoId: v.id, autoplay: true }));
  }
  // Beside the player the list scrolls on its own. It stays at the top while the video on screen is
  // visible there; otherwise that row goes to the middle — also when resizing the window or folding
  // the sidebar moves the list beside the player.
  if (current && !phone) {
    const centre = () => {
      const row = current.getBoundingClientRect(), box = shelf.getBoundingClientRect();
      if (row.top < box.top || row.bottom > box.bottom) shelf.scrollTop += row.top - box.top - (box.height - row.height) / 2;
    };
    centre();
    const watch = new ResizeObserver(() => { if (shelf.isConnected) centre(); else watch.disconnect(); });
    watch.observe(shelf);
  }

  if (video.cards) {
    const cardsRow = main.createDiv({ cls: "lh-vid-cards-row lh-vid-below" });
    Promise.resolve(hub._decksReady).then(() => {
      const deck = (hub.decks || []).find((d) => d.cards.some((x) => x.notePath === video.cards));
      if (!deck || !cardsRow.isConnected) return;
      cardsRow.createEl("button", { cls: "lh-vid-btn", text: c(t, "VIDEO_TO_CARDS") }).addEventListener("click", () => {
        if (player) player.pause();
        hub._startDeckReview({ ...deck, name: video.title, noResume: true, cards: deck.cards.filter((x) => x.notePath === video.cards) });
      });
    });
  }

  if (video.topics.length) {
    const chapters = main.createDiv({ cls: "lh-vid-chapters lh-vid-below" });
    chapters.createDiv({ cls: "lh-vid-side-head", text: c(t, "VIDEO_CHAPTERS") });
    for (const chapter of video.topics) {
      const row = chapters.createEl("button", { cls: "lh-vid-chapter" });
      row.createSpan({ cls: "lh-vid-chapter-time", text: fmtTime(chapter.from) });
      row.createSpan({ text: chapter.title });
      row.addEventListener("click", () => {
        if (!player) return;
        player.currentTime = chapter.from;
        player.play().catch(() => { /* autoplay blocked — the user presses play */ });
      });
    }
  }
  if (video.notTaken.length) main.createDiv({ cls: "lh-vid-sources lh-vid-below", text: `${c(t, "VIDEO_NOT_TAKEN")}：${video.notTaken.join("、")}` });
  if (video.credits) main.createDiv({ cls: "lh-vid-credits lh-vid-below", text: `${c(t, "VIDEO_CREDITS")}：${video.credits}` });
}

function mountPlayer(stage, hub, t, slug, meta, video, autoplay, save, playable, setPlayer, leave) {
  const src = `${data.VIDEOS_DIR}/${slug}/${video.file}`;
  const vid = stage.createEl("video", { cls: "lh-vid-player", attr: { controls: "", preload: "metadata", playsinline: "" } });
  vid.src = fileUrl(hub, slug, video.file);
  if (video.subtitles) {
    const track = vid.createEl("track", { attr: { kind: "subtitles", src: fileUrl(hub, slug, video.subtitles), srclang: "und", label: c(t, "VIDEO_SET_SUBS"), default: "" } });
    // Subtitles start on unless Video settings turn them off; the player's own menu can still switch them.
    data.readSettings(hub.app.vault.adapter, !!hub.plugin.settings.licenseValid)
      .then((s) => { if (!s.subtitles && track.track) track.track.mode = "hidden"; })
      .catch((e) => console.warn("EngramQuest: video settings unreadable, subtitles left on", e));
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

// Phone Learn home: the same continue-watching card, shown once the (small) series scan has answered.
async function renderPhoneContinue(parent, hub) {
  const t = hub.plugin.settings;
  let topics = [];
  try { topics = await data.listTopics(hub.app.vault.adapter); } catch (e) { console.warn("EngramQuest: continue card scan failed", e); }
  if (!parent.isConnected) return;
  const cw = data.continueWatching(topics);
  if (!cw) return;
  const row = parent.createDiv({ cls: "lh-vid-continue" });
  renderThumb(row, hub, cw.slug, cw.meta, cw.video, "is-continue");
  const info = row.createDiv({ cls: "lh-vid-continue-info" });
  info.createDiv({ cls: "lh-vid-continue-title", text: c(t, "VIDEO_CONTINUE") });
  info.createDiv({ cls: "lh-vid-kicker", text: cw.video.title });
  row.createSpan({ cls: "lh-chev", text: "›", attr: { "aria-hidden": "true" } });
  row.addEventListener("click", () => { hub._vTopic = { slug: cw.slug, videoId: cw.video.id, autoplay: true }; hub._openPhonePage("video"); });
}

module.exports = { renderVideoTab, renderTopic, renderThumb, queueWrite, renderPhoneContinue };
