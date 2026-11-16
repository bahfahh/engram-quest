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
const { periodOf, cardPeriod, groupByPeriod, sortFilms, watchState } = require("./episodic-order");
const ui = require("../hub/ui");

const LENGTH_KEY = { short: "EPISODIC_LEN_SHORT", medium: "EPISODIC_LEN_MEDIUM", long: "EPISODIC_LEN_LONG" };
const MODULE = "episodic-review";

const periodText = (period) => String(period || "").replace("..", " – ");

// Watch state buckets, the same words as the Video Academy shelf.
const FILTERS = [["all", "VIDEO_F_ALL"], ["watching", "VIDEO_F_WATCHING"], ["new", "VIDEO_F_NEW"], ["done", "VIDEO_F_DONE"], ["starred", "FILTER_STARRED"]];
// A recall film is about a period, so the default (first) order groups films by it.
const SORTS = [["period", "EPISODIC_SORT_PERIOD"], ["newest", "SORT_NEWEST"], ["oldest", "SORT_OLDEST"], ["watched", "EPISODIC_SORT_WATCHED"]];

function promptFor(t, request) {
  return K(c(t, "EPISODIC_PROMPT"), { period: periodText(request.period), length: c(t, LENGTH_KEY[request.length]), id: request.id });
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
  if (!SORTS.some(([id]) => id === hub._eSort)) hub._eSort = SORTS[0][0];
  if (open) {
    // The player's film list keeps the order the learner picked on the list page.
    renderTopic(body, hub, t, { slug: series.slug, meta: { ...series.meta, videos: sortFilms(films, series.meta, hub._eSort) }, othersOnPhone: true }, refresh);
    return;
  }
  if (phone && (isPro || films.length)) newButton(body);
  renderRequests(body, hub, t, series, refresh);
  if (!films.length) {
    const empty = body.createDiv({ cls: "lh-vid-empty" });
    ui.icon(empty.createDiv({ cls: "lh-vid-empty-icon" }), "recall");
    empty.createDiv({ cls: "lh-vid-empty-title", text: c(t, "EPISODIC_EMPTY_TITLE") });
    empty.createDiv({ cls: "lh-vid-empty-body", text: c(t, "EPISODIC_EMPTY_BODY") });
    if (phone && !isPro) newButton(body);
    return;
  }
  renderFilmList(body, hub, t, series, films, refresh);
}

/**
 * Toolbar (watch state chips, sort, length) and the films under it. Chips and list redraw from what is
 * in memory; a star press updates the counts without a re-read.
 */
function renderFilmList(body, hub, t, series, films, refresh) {
  const meta = series.meta;
  // Starred films are the learner's keepers; the set follows each click.
  const stars = new Set(films.filter((f) => data.videoProgress(meta, f.id).starred).map((f) => f.id));
  const states = new Map(films.map((f) => [f.id, watchState(meta, f)]));
  const inFilter = (id, f) => id === "all" || (id === "starred" ? stars.has(f.id) : states.get(f.id) === id);
  const lengths = data.EPISODIC_LENGTHS.filter((id) => films.some((f) => f.length === id));
  // The length menu only when picking one would leave some films out.
  const lengthNarrows = lengths.length > 1 || (lengths.length === 1 && films.some((f) => !f.length));
  if (!FILTERS.some(([id]) => id === hub._eFilter)) hub._eFilter = "all";
  if (!lengthNarrows || !lengths.includes(hub._eLength)) hub._eLength = "all";

  const bar = body.createDiv({ cls: "lh-vid-filters lh-vid-ep-tools" });
  const chips = bar.createDiv({ cls: "lh-seg", attr: { role: "group" } });
  bar.createDiv({ cls: "lh-vid-spacer" });
  const list = body.createDiv({ cls: "lh-vid-ep-list" });
  const byLength = () => films.filter((f) => hub._eLength === "all" || f.length === hub._eLength);
  const drawChips = () => {
    const pool = byLength();
    chips.empty();
    for (const [id, key] of FILTERS) {
      const n = pool.filter((f) => inFilter(id, f)).length;
      // Empty buckets hide, except the one in use, so the learner can always see where they are.
      if (id !== "all" && n === 0 && hub._eFilter !== id) continue;
      chips.createEl("button", { cls: hub._eFilter === id ? "on" : "", text: `${c(t, key)} ${n}`, attr: { "aria-pressed": String(hub._eFilter === id) } })
        .addEventListener("click", () => { hub._eFilter = id; draw(); });
    }
  };
  const drawList = () => {
    const shown = sortFilms(byLength().filter((f) => inFilter(hub._eFilter, f)), meta, hub._eSort);
    // "No starred films yet" only when there are none at all, not when the length filter hides them.
    const noStars = hub._eFilter === "starred" && stars.size === 0;
    renderFilms(list, hub, t, series, shown, stars, { noStars, onStar: () => (hub._eFilter === "starred" ? draw() : drawChips()), refresh });
  };
  const draw = () => { drawChips(); drawList(); };
  ui.sortSelect(bar, t, SORTS, hub._eSort, (v) => { hub._eSort = v; drawList(); }).classList.add("lh-vid-ep-sort");
  if (lengthNarrows) {
    const options = [["all", c(t, "EPISODIC_LEN_ALL")], ...lengths.map((id) => [id, c(t, LENGTH_KEY[id])])];
    ui.filterSelect(bar, options, hub._eLength, (v) => { hub._eLength = v; draw(); }, { label: c(t, "EPISODIC_LENGTH") });
  }
  draw();
}

/** One card per film; grouped under period headings only when sorted by period. */
function renderFilms(list, hub, t, series, shown, stars, { noStars, onStar, refresh }) {
  list.empty();
  if (!shown.length) {
    const starred = noStars;
    const empty = list.createDiv({ cls: "lh-vid-empty" });
    ui.icon(empty.createDiv({ cls: "lh-vid-empty-icon" }), starred ? "star" : "recall");
    empty.createDiv({ cls: "lh-vid-empty-title", text: c(t, starred ? "EPISODIC_STARRED_EMPTY_TITLE" : "EPISODIC_NO_MATCH") });
    if (starred) empty.createDiv({ cls: "lh-vid-empty-body", text: c(t, "EPISODIC_STARRED_EMPTY_BODY") });
    empty.createEl("button", { cls: "lh-vid-btn lh-vid-ep-empty-btn", text: c(t, "EPISODIC_SHOW_ALL") })
      .addEventListener("click", () => { hub._eFilter = "all"; hub._eLength = "all"; refresh(); });
    return;
  }
  const grouped = hub._eSort === "period";
  const groups = grouped ? groupByPeriod(shown) : [{ period: null, films: shown }];
  for (const group of groups) {
    if (grouped) list.createDiv({ cls: "lh-vid-ep-period", text: periodText(group.period) || c(t, "EPISODIC_NO_PERIOD") });
    const grid = list.createDiv({ cls: "lh-vid-grid" });
    group.films.forEach((film, index) => {
      const card = asButton(grid.createDiv({ cls: "lh-vid-ep-film" }));
      renderThumb(card, hub, series.slug, series.meta, film, "");
      card.createDiv({ cls: "lh-vid-scard-title", text: film.title });
      // Without a heading the card names its own period; under one, it says which of the period's films it is.
      const bits = grouped ? [] : [cardPeriod(periodOf(film)) || c(t, "EPISODIC_NO_PERIOD")];
      if (film.length) bits.push(c(t, LENGTH_KEY[film.length]));
      if (grouped && group.films.length > 1) bits.push(c(t, index === 0 ? "EPISODIC_NEWER" : "EPISODIC_OLDER"));
      const foot = card.createDiv({ cls: "lh-vid-ep-foot" });
      foot.createDiv({ cls: "lh-vid-scard-meta", text: bits.join(" · ") });
      starToggle(foot, hub, t, series.slug, film, stars.has(film.id), (on) => {
        if (on) stars.add(film.id); else stars.delete(film.id);
        onStar();
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

/**
 * The length picked for a request becomes the default (settings.json episodicLength), which the next
 * request opens with and the skill falls back on when it has no request to read. Merged into the file.
 */
async function rememberLength(hub, length) {
  const isPro = !!hub.plugin.settings.licenseValid;
  const adapter = hub.app.vault.adapter;
  const current = await data.readSettings(adapter, isPro);
  if (current.episodicLength !== length) await data.saveSettings(adapter, { ...current, episodicLength: length }, isPro);
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
      await rememberLength(hub, length).catch((e) => console.warn("EngramQuest: episodic default length save failed", e));
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
