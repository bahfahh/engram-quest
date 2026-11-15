"use strict";
// Hub "Recall Films" tab in the Memory category (ADR-27): films the episodic-review skill made from a
// period of the learner's notes. Watching is always free; asking for a new film needs Pro. The plugin
// only records the request. View state is shared with the Video Academy (hub._vTopic).

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { ProUpgradeModal } = require("../license/upgrade");
const { estimate } = require("./episodic-length");
const data = require("./data");
const { renderTopic, renderThumb, queueWrite, asButton, starToggle } = require("./render");
const { openPromptModal } = require("./request-ui");
const ui = require("../hub/ui");

const LENGTH_KEY = { short: "EPISODIC_LEN_SHORT", medium: "EPISODIC_LEN_MEDIUM", long: "EPISODIC_LEN_LONG" };
const MODULE = "episodic-review";

const periodText = (period) => String(period || "").replace("..", " – ");
const periodOf = (video) => video.period || String(video.createdAt || "").slice(0, 7);
const byNewest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));

function promptFor(t, request) {
  return K(c(t, "EPISODIC_PROMPT"), { period: periodText(request.period), length: c(t, LENGTH_KEY[request.length]), id: request.id });
}

/** Films newest period first; one period can hold several films. */
function groupByPeriod(films) {
  const groups = new Map();
  for (const film of films) {
    const key = periodOf(film);
    groups.set(key, [...(groups.get(key) || []), film]);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([period, list]) => ({ period, films: list.sort(byNewest) }));
}

function lengthButtons(parent, t, value, onPick) {
  const row = parent.createDiv({ cls: "lh-vid-lens" });
  for (const id of data.EPISODIC_LENGTHS) {
    row.createEl("button", { cls: "lh-vid-len" + (id === value ? " is-on" : ""), text: c(t, LENGTH_KEY[id]) })
      .addEventListener("click", () => onPick(id));
  }
}

async function renderEpisodicTab(el, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  const isPro = !!t.licenseValid;
  const gen = hub._tabGen;
  let series = null;
  let settings = data.normalizeSettings(null, isPro);
  try {
    await data.syncSettingsLicense(adapter, isPro).catch((e) => console.warn("EngramQuest: video licence sync failed", e));
    [series, settings] = await Promise.all([data.readEpisodic(adapter), data.readSettings(adapter, isPro)]);
  } catch (err) {
    console.error("EngramQuest: episodic scan failed", err);
  }
  if (hub._tabGen !== gen || !el.isConnected) return;
  el.empty();
  const refresh = () => { if (el.isConnected && hub._tabGen === gen) renderEpisodicTab(el, hub); };
  const films = series ? series.meta.videos.filter((v) => v.file) : [];
  const sel = hub._vTopic;
  const open = !!(sel && sel.slug === data.EPISODIC_SLUG && films.length);

  const root = el.createDiv({ cls: "lh-vid" });
  hub.setHero(!open);
  hub.setWatching(open);
  hub._entryHints = { ...hub._entryHints, episodic: K(c(t, "VIDEO_COUNT"), { count: films.length }) };
  // Wait for this series' pending writes (a star just pressed on the player page) before re-reading it.
  const toList = () => queueWrite(data.EPISODIC_SLUG, () => null).then(() => { hub._vTopic = null; refresh(); });
  ui.setPhoneNav(hub, open ? { label: c(t, "EPISODIC_BACK"), title: "", onBack: toList } : null);
  const phone = ui.isPhone();
  const addNew = () => {
    if (isPro) openNewFilmModal(hub, t, settings.episodicLength, refresh);
    else new ProUpgradeModal(hub.app, hub.plugin).open();
  };
  const newButton = (parent) => {
    const btn = ui.primaryButton(parent, c(t, "EPISODIC_NEW"), addNew, { alt: !isPro, icon: "plus" });
    if (!isPro) btn.createSpan({ cls: "lh-vid-pro-tag", text: "Pro" });
    return btn;
  };
  if (open && !phone) {
    root.createDiv({ cls: "lh-vid-head-row" }).createEl("button", { cls: "lh-vid-back", text: c(t, "EPISODIC_BACK") }).addEventListener("click", toList);
  } else if (!open && !phone) {
    const { right } = ui.pageHeader(root, hub, { titleKey: "TAB_EPISODIC", guide: "episodic", subtitle: c(t, "EPISODIC_DESC") });
    newButton(right());
  }

  const body = root.createDiv({ cls: "lh-scroll" }).createDiv({ cls: "lh-vid-body" });
  if (open) {
    const sorted = groupByPeriod(films).flatMap((group) => group.films);
    renderTopic(body, hub, t, { slug: series.slug, meta: { ...series.meta, videos: sorted }, othersOnPhone: true }, refresh);
    return;
  }
  if (phone && (isPro || films.length)) newButton(body);
  // Starred films are the learner's keepers; the set follows each click so the list redraws without a re-read.
  const stars = new Set(films.filter((f) => data.videoProgress(series.meta, f.id).starred).map((f) => f.id));
  let list = null;
  const drawFilms = () => renderFilms(list, hub, t, series, films, stars, drawFilms, refresh);
  if (isPro || films.length) {
    const bar = body.createDiv({ cls: "lh-vid-ep-bar" });
    const addFilter = () => {
      if (!films.length) return;
      const options = [{ value: "all", label: c(t, "FILTER_ALL") }, { value: "starred", label: c(t, "FILTER_STARRED") }];
      ui.segmented(bar, options, starredOnly(hub) ? "starred" : "all", (v) => { hub._eFilter = v; drawFilms(); }, "lh-vid-ep-filter");
    };
    // Phone: the filter, which everyone uses, above the Pro-only length setting.
    if (phone) addFilter();
    if (isPro) renderLengthSetting(bar, hub, t, settings.episodicLength, refresh);
    if (!phone) addFilter();
  }
  renderRequests(body, hub, t, series, refresh);
  if (!films.length) {
    const empty = body.createDiv({ cls: "lh-vid-empty" });
    ui.icon(empty.createDiv({ cls: "lh-vid-empty-icon" }), "recall");
    empty.createDiv({ cls: "lh-vid-empty-title", text: c(t, "EPISODIC_EMPTY_TITLE") });
    empty.createDiv({ cls: "lh-vid-empty-body", text: c(t, "EPISODIC_EMPTY_BODY") });
    if (phone && !isPro) newButton(body);
    return;
  }
  list = body.createDiv({ cls: "lh-vid-ep-list" });
  drawFilms();
}

const starredOnly = (hub) => hub._eFilter === "starred";

/** The films grouped by period, only the starred ones under the "Starred" filter. */
function renderFilms(list, hub, t, series, films, stars, redraw, refresh) {
  list.empty();
  const shown = starredOnly(hub) ? films.filter((f) => stars.has(f.id)) : films;
  if (!shown.length) {
    const empty = list.createDiv({ cls: "lh-vid-empty" });
    ui.icon(empty.createDiv({ cls: "lh-vid-empty-icon" }), "star");
    empty.createDiv({ cls: "lh-vid-empty-title", text: c(t, "EPISODIC_STARRED_EMPTY_TITLE") });
    empty.createDiv({ cls: "lh-vid-empty-body", text: c(t, "EPISODIC_STARRED_EMPTY_BODY") });
    empty.createEl("button", { cls: "lh-vid-btn lh-vid-ep-empty-btn", text: c(t, "EPISODIC_SHOW_ALL") })
      .addEventListener("click", () => { hub._eFilter = "all"; refresh(); });
    return;
  }
  for (const group of groupByPeriod(shown)) {
    list.createDiv({ cls: "lh-vid-ep-period", text: periodText(group.period) || c(t, "EPISODIC_NO_PERIOD") });
    const grid = list.createDiv({ cls: "lh-vid-grid" });
    group.films.forEach((film, index) => {
      const card = asButton(grid.createDiv({ cls: "lh-vid-ep-film" }));
      renderThumb(card, hub, series.slug, series.meta, film, "");
      card.createDiv({ cls: "lh-vid-scard-title", text: film.title });
      const bits = [];
      if (film.length) bits.push(c(t, LENGTH_KEY[film.length]));
      if (group.films.length > 1) bits.push(c(t, index === 0 ? "EPISODIC_NEWER" : "EPISODIC_OLDER"));
      const foot = card.createDiv({ cls: "lh-vid-ep-foot" });
      foot.createDiv({ cls: "lh-vid-scard-meta", text: bits.join(" · ") });
      starToggle(foot, hub, t, series.slug, film, stars.has(film.id), (on) => {
        if (on) stars.add(film.id); else stars.delete(film.id);
        if (starredOnly(hub)) redraw();
      });
      // First child: the card keeps its last line's bottom spacing.
      card.prepend(ui.rowActions(card, [{ name: "trash", label: c(t, "DELETE"), run: () => confirmDeleteFilm(hub, t, film, refresh) }]));
      card.addEventListener("click", () => { hub._vTopic = { slug: series.slug, videoId: film.id, autoplay: true }; refresh(); });
    });
  }
}

function confirmDeleteFilm(hub, t, film, refresh) {
  ui.confirmDialog(hub.app, t, {
    title: K(c(t, "DELETE_CONFIRM_TITLE"), { name: film.title }),
    body: c(t, "EPISODIC_DELETE_BODY"),
    onConfirm: async () => {
      try {
        const slug = data.EPISODIC_SLUG;
        if (!(await queueWrite(slug, () => data.deleteVideo(hub.app.vault.adapter, slug, film.id)))) new I.Notice(c(t, "EPISODIC_DELETE_PARTIAL"));
      } catch (e) {
        console.error("EngramQuest: recall film delete failed", e);
        new I.Notice(c(t, "DELETE_FAILED"));
      }
      refresh();
    },
  });
}

/** The one setting for recall films: saved on click, merged into whatever else is in the file. */
function renderLengthSetting(parent, hub, t, current, refresh) {
  const row = parent.createDiv({ cls: "lh-vid-ep-setting" });
  row.createSpan({ cls: "lh-vid-set-label", text: c(t, "EPISODIC_DEFAULT_LEN") });
  lengthButtons(row, t, current, async (id) => {
    const isPro = !!t.licenseValid;
    const adapter = hub.app.vault.adapter;
    try {
      await data.saveSettings(adapter, { ...(await data.readSettings(adapter, isPro)), episodicLength: id }, isPro);
    } catch (e) {
      console.error("EngramQuest: episodic length save failed", e);
    }
    refresh();
  });
  row.createSpan({ cls: "lh-vid-set-hint", text: estimate(t, current) });
}

function renderRequests(body, hub, t, series, refresh) {
  const open = series ? series.meta.requests.filter((r) => r.status !== "done") : [];
  if (!open.length) return;
  const list = body.createDiv({ cls: "lh-vid-ep-requests" });
  list.createDiv({ cls: "lh-vid-ep-requests-head", text: c(t, "EPISODIC_PENDING_HEAD") });
  for (const request of open) {
    const row = list.createDiv({ cls: "lh-vid-ep-request" });
    const failed = request.status === "failed";
    ui.icon(row.createSpan({ cls: "lh-vid-ep-request-ic" }), "recall");
    const label = row.createSpan({ cls: "lh-vid-ep-request-text", text: `${periodText(request.period)} · ${c(t, LENGTH_KEY[request.length])}` });
    if (failed) { label.appendText(" · "); label.createSpan({ cls: "tn", text: `${c(t, "VIDEO_STATUS_FAILED")}${request.note ? `：${request.note}` : ""}` }); }
    const copy = row.createEl("button", { cls: "lh-vid-btn" });
    ui.icon(copy, "copy");
    copy.createSpan({ text: c(t, "VIDEO_COPY_PROMPT") });
    copy.addEventListener("click", () => openPromptModal(hub, t, { prompt: promptFor(t, request), module: MODULE }));
    const cancel = row.createEl("button", { cls: "lh-vid-btn" });
    ui.icon(cancel, "close");
    cancel.createSpan({ text: c(t, "EPISODIC_CANCEL") });
    cancel.addEventListener("click", () => {
        queueWrite(data.EPISODIC_SLUG, () => data.cancelEpisodicRequest(hub.app.vault.adapter, request.id))
          .catch((e) => console.error("EngramQuest: cancel recall request failed", e))
          .then(refresh);
      });
  }
}

const monthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function openNewFilmModal(hub, t, defaultLength, refresh) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.addClass("lh-vid-modal", "lh-vid-recall-new");
  const wrap = modal.contentEl;
  wrap.createDiv({ cls: "lh-vid-modal-title", text: c(t, "EPISODIC_NEW_TITLE") });

  const now = new Date();
  const periods = wrap.createDiv({ cls: "lh-vid-field-two" });
  const monthField = (labelKey, value) => {
    const field = periods.createDiv({ cls: "lh-vid-field" });
    field.createEl("label", { cls: "lh-vid-label", text: c(t, labelKey) });
    const input = field.createEl("input", { cls: "lh-vid-select", attr: { type: "month", max: monthValue(now) } });
    input.value = value;
    return input;
  };
  const from = monthField("EPISODIC_PERIOD_FROM", monthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const to = monthField("EPISODIC_PERIOD_TO", "");

  let length = defaultLength;
  const lengthField = wrap.createDiv({ cls: "lh-vid-field" });
  lengthField.createDiv({ cls: "lh-vid-label", text: c(t, "EPISODIC_LENGTH") });
  const lengths = lengthField.createDiv();
  const drawLengths = () => {
    lengths.empty();
    lengthButtons(lengths, t, length, (id) => { length = id; drawLengths(); });
    lengths.createDiv({ cls: "lh-vid-modal-desc", text: estimate(t, length) });
  };
  drawLengths();

  const actions = wrap.createDiv({ cls: "lh-vid-modal-actions" });
  actions.createEl("button", { cls: "lh-vid-btn", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const submit = actions.createEl("button", { cls: "lh-vid-btn lh-vid-btn-primary", text: c(t, "EPISODIC_SUBMIT") });
  submit.addEventListener("click", async () => {
    if (submit.disabled || !from.value) return;
    submit.disabled = true;
    const [start, end] = [from.value, to.value || from.value].sort();
    const period = start === end ? start : `${start}..${end}`;
    try {
      const request = await queueWrite(data.EPISODIC_SLUG, () => data.addEpisodicRequest(hub.app.vault.adapter, { period, length }));
      modal.close();
      refresh();
      openPromptModal(hub, t, { prompt: promptFor(t, request), module: MODULE });
    } catch (e) {
      console.error("EngramQuest: recall request failed", e);
      new I.Notice(c(t, "EPISODIC_NEW_FAILED"));
      submit.disabled = false;
    }
  });
  modal.open();
}

module.exports = { renderEpisodicTab };
