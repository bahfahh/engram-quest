"use strict";
// Review Deck page: desktop grid, table and folder views, plus the phone deck list.

const I = require("obsidian");
const { t: c, interpolate } = require("../i18n");
const { getReviewStatus } = require("../review/helpers");
const { renderSynapseProBanner, renderTimeboxRow } = require("../review/pro-ui");
const { openCreateCardModal } = require("../review/create");
const { renderSkillsUpdateBanner } = require("./skills");
const ui = require("./ui");

function deckName(deck) {
  const parts = deck.name.split("/");
  const name = parts.pop();
  let path = parts.join("/");
  if (!path) {
    const note = deck.cards[0] && deck.cards[0].notePath;
    path = note && note.includes("/") ? note.slice(0, note.lastIndexOf("/")) : "";
  }
  return { name, path };
}

function deckStats(deck) {
  const ready = deck.due + deck.unseen;
  const mastered = deck.cards.filter(card => getReviewStatus(card.srMeta) === "mastered").length;
  const pct = n => (deck.total > 0 ? n / deck.total * 100 : 0);
  return { ready, mastered, masteryPct: deck.total > 0 ? Math.round(mastered / deck.total * 100) : 0, parts: [{ pct: pct(mastered), color: "mst" }, { pct: pct(deck.due), color: "due" }, { pct: pct(deck.unseen), color: "new" }] };
}

function deckActions(parent, hub, deck, refresh) {
  const t = hub.plugin.settings;
  return ui.rowActions(parent, [
    { name: "plus", label: c(t, "CREATE_CARD"), run: () => openCreateCardModal(hub.app, deck, t, async () => { await hub.loadData(); refresh(); }) },
    { name: "trash", label: c(t, "DELETE"), run: () => hub._confirmDelete(deck, "deck") },
  ]);
}

function idleHint(deck, t) { return interpolate(c(t, "NO_READY_IN_DECK"), { deck: deck.name, total: deck.total }); }

function renderGrid(parent, hub, decks, refresh) {
  const t = hub.plugin.settings;
  const grid = parent.createEl("div", { cls: "lh-deck-cards" });
  decks.forEach((deck) => {
    const s = deckStats(deck), { name, path } = deckName(deck);
    const card = grid.createEl("div", { cls: "lh-dc" + (s.ready === 0 ? " is-idle" : ""), attr: { title: s.ready === 0 ? idleHint(deck, t) : deck.name } });
    deckActions(card, hub, deck, refresh);
    const head = card.createEl("div", { attr: { style: "min-width:0" } });
    head.createEl("div", { cls: "lh-nm", text: name });
    head.createEl("div", { cls: "lh-pth", text: path });
    const nr = card.createEl("div", { cls: "lh-nr" });
    nr.createEl("b", { text: String(s.ready) });
    nr.createEl("span", { text: s.ready > 0 ? c(t, "READY_NOW") : interpolate(c(t, "ALL_SCHEDULED"), { total: deck.total }) });
    nr.createEl("i", { text: c(t, "MASTERY_RATE", { percent: s.masteryPct }) });
    ui.segBar(card, s.parts);
    const meta = card.createEl("div", { cls: "lh-dmeta" });
    meta.createEl("span", { text: `${c(t, "FILTER_DUE")} ${deck.due}`, cls: deck.due ? "td" : "" });
    meta.createEl("span", { text: `${c(t, "FILTER_NEW")} ${deck.unseen}`, cls: deck.unseen ? "tn" : "" });
    meta.createEl("span", { text: `${c(t, "TOTAL")} ${deck.total}` });
    card.addEventListener("click", () => hub._startDeckReview(deck));
  });
}

const TABLE_COLUMNS = "grid-template-columns:minmax(0,1fr) 92px 60px 60px 60px 180px 64px";

function renderTable(parent, hub, decks, refresh) {
  const t = hub.plugin.settings;
  const table = parent.createEl("div", { cls: "lh-tbl" });
  const head = table.createEl("div", { cls: "lh-th", attr: { style: TABLE_COLUMNS } });
  head.createEl("span", { text: c(t, "DECK_COLUMN") });
  head.createEl("span", { cls: "lh-r", text: c(t, "READY_NOW") });
  head.createEl("span", { cls: "lh-r td", text: c(t, "FILTER_DUE") });
  head.createEl("span", { cls: "lh-r tn", text: c(t, "FILTER_NEW") });
  head.createEl("span", { cls: "lh-r", text: c(t, "TOTAL") });
  head.createEl("span", { cls: "tm", text: c(t, "MASTERED_COLUMN") });
  head.createEl("span");
  decks.forEach((deck) => {
    const s = deckStats(deck), { name, path } = deckName(deck);
    const row = table.createEl("div", { cls: "lh-tr", attr: { style: TABLE_COLUMNS, title: s.ready === 0 ? idleHint(deck, t) : deck.name } });
    const cell = row.createEl("div", { attr: { style: "min-width:0" } });
    cell.createEl("div", { cls: "lh-nm", text: name });
    cell.createEl("div", { cls: "lh-pth", text: s.ready > 0 ? path : interpolate(c(t, "ALL_SCHEDULED"), { total: deck.total }) });
    row.createEl("span", { cls: "lh-r lh-strong" + (s.ready ? "" : " dim"), text: String(s.ready) });
    row.createEl("span", { cls: "lh-r" + (deck.due ? "" : " dim"), text: String(deck.due) });
    row.createEl("span", { cls: "lh-r" + (deck.unseen ? "" : " dim"), text: String(deck.unseen) });
    row.createEl("span", { cls: "lh-r", text: String(deck.total) });
    const mini = row.createEl("div", { cls: "lh-mini" });
    ui.track(mini, s.masteryPct, true);
    mini.createEl("span", { text: `${s.masteryPct}%`, attr: { style: "min-width:30px;text-align:right" } });
    deckActions(row, hub, deck, refresh);
    row.addEventListener("click", () => hub._startDeckReview(deck));
  });
}

function renderTreeRow(parent, hub, deck, refresh) {
  const t = hub.plugin.settings;
  const s = deckStats(deck);
  const row = parent.createEl("div", { cls: "lh-trow", attr: { title: s.ready === 0 ? idleHint(deck, t) : deck.name } });
  const main = row.createEl("div", { cls: "lh-trow-main" });
  main.createEl("div", { cls: "lh-nm", text: deck.name.split("/").pop() });
  main.createEl("div", { cls: "lh-pth", text: s.ready > 0 ? `${c(t, "READY_NOW")}: ${s.ready}` : interpolate(c(t, "ALL_SCHEDULED"), { total: deck.total }) });
  const m = row.createEl("div", { cls: "lh-trow-metrics" });
  m.createEl("b", { text: String(s.ready), cls: s.ready ? "" : "dim" });
  m.createEl("span", { text: `${c(t, "FILTER_DUE")} ${deck.due}`, cls: deck.due ? "td" : "" });
  m.createEl("span", { text: `${c(t, "FILTER_NEW")} ${deck.unseen}`, cls: deck.unseen ? "tn" : "" });
  m.createEl("span", { text: `${c(t, "TOTAL")} ${deck.total}` });
  deckActions(row, hub, deck, refresh);
  row.addEventListener("click", () => hub._startDeckReview(deck));
}

function renderTree(parent, hub, decks, refresh) {
  const wrap = parent.createEl("div", { cls: "lh-tree-container" });
  hub._renderTreeRecursive(wrap, hub._buildTree(decks, d => d.name.replace(/^#/, "")), (el, deck) => renderTreeRow(el, hub, deck, refresh));
}

function renderPhoneList(parent, hub, decks, refresh) {
  const t = hub.plugin.settings;
  const list = parent.createEl("div", { cls: "lh-pl" });
  decks.forEach((deck) => {
    const s = deckStats(deck), { name } = deckName(deck);
    const row = list.createEl("div", { cls: "lh-prd", attr: { title: s.ready === 0 ? idleHint(deck, t) : deck.name } });
    const main = row.createEl("div", { cls: "lh-grow" });
    main.createEl("div", { cls: "lh-nm", text: name });
    const meta = main.createEl("div", { cls: "lh-pth" });
    meta.createEl("span", { text: `${c(t, "FILTER_DUE")} ${deck.due}`, cls: deck.due ? "td" : "" });
    meta.appendText(" · ");
    meta.createEl("span", { text: `${c(t, "FILTER_NEW")} ${deck.unseen}`, cls: deck.unseen ? "tn" : "" });
    meta.appendText(` · ${c(t, "TOTAL")} ${deck.total}`);
    ui.segBar(main, s.parts);
    const cnt = row.createEl("div", { cls: "lh-pcnt" });
    cnt.createEl("b", { text: String(s.ready), cls: s.ready ? "" : "dim" });
    cnt.createEl("span", { text: c(t, "READY") });
    ui.iconButton(row, "plus", c(t, "CREATE_CARD"), (ev) => { ev.stopPropagation(); openCreateCardModal(hub.app, deck, t, async () => { await hub.loadData(); refresh(); }); }, "lh-pact");
    ui.iconButton(row, "trash", c(t, "DELETE"), (ev) => { ev.stopPropagation(); hub._confirmDelete(deck, "deck"); }, "lh-pact");
    row.addEventListener("click", () => hub._startDeckReview(deck));
  });
}

function renderDecks(el, hub) {
  const t = hub.plugin.settings;
  el.empty();
  const refresh = () => renderDecks(el, hub);
  if (hub.decks.length === 0) {
    el.createEl("div", { cls: "lh-empty2" }).appendChild(I.sanitizeHTMLToDom(c(t, "EMPTY_DECKS").replace(/\n/g, "<br>")));
    return;
  }
  const query = hub.searchQuery.toLowerCase();
  let decks = hub.decks;
  if (query) decks = decks.filter(d => d.name.toLowerCase().includes(query));
  if (hub.filterStatus === "due") decks = decks.filter(d => d.due > 0);
  if (hub.filterStatus === "new") decks = decks.filter(d => d.unseen > 0);
  if (hub.filterStatus === "done") decks = decks.filter(d => d.due === 0 && d.unseen === 0);
  if (decks.length === 0) { el.createEl("div", { cls: "lh-empty2", text: c(t, "EMPTY_FILTERED_DECKS") }); return; }
  if (hub.viewMode === "tree") renderTree(el, hub, decks, refresh);
  else if (hub.viewMode === "grid") renderGrid(el, hub, decks, refresh);
  else if (ui.isPhone()) renderPhoneList(el, hub, decks, refresh);
  else renderTable(el, hub, decks, refresh);
}

function renderToolbar(parent, hub, refresh) {
  const t = hub.plugin.settings;
  const filters = [["all", "FILTER_ALL"], ["due", "FILTER_DUE"], ["new", "FILTER_NEW"], ["done", "FILTER_DONE"]].map(([value, key]) => ({ value, label: c(t, key) }));
  const search = { placeholder: c(t, "SEARCH_REVIEW"), value: hub.searchQuery, onInput: (v) => { hub.searchQuery = v; refresh(); } };
  const onFilter = (v) => { hub.filterStatus = v; refresh(); };
  if (ui.isPhone()) {
    ui.searchBox(parent, search);
    const row = parent.createEl("div", { cls: "lh-tb", attr: { style: "flex-wrap:nowrap" } });
    ui.segmented(row, filters, hub.filterStatus, onFilter).style.flex = "1";
    ui.viewToggle(row, hub, refresh);
    return;
  }
  const bar = parent.createEl("div", { cls: "lh-tb" });
  ui.segmented(bar, filters, hub.filterStatus, onFilter);
  bar.createEl("span", { cls: "lh-grow" });
  ui.searchBox(bar, { ...search, width: 220 });
  ui.viewToggle(bar, hub, refresh);
}

function renderReviewTab(e, hub) {
  const t = hub.plugin.settings;
  const due = hub.decks.reduce((n, d) => n + d.due, 0);
  const unseen = hub.decks.reduce((n, d) => n + d.unseen, 0);
  const total = hub.decks.reduce((n, d) => n + d.total, 0);
  const phone = ui.isPhone();

  if (phone) {
    ui.primaryButton(e, c(t, "STUDY_ALL"), () => hub._studyAll(), { play: true });
    hub._resumeLink(e);
  } else {
    const { hd } = ui.pageHeader(e, hub, { titleKey: "TAB_REVIEW", guide: "review", subtitle: c(t, "READY_HELP") });
    const right = hd.createEl("div", { cls: "lh-hd-right" });
    renderTimeboxRow(right, hub.plugin, hub.app, hub.decks, hub._openTimebox, hub._backToHub);
    ui.primaryButton(right, c(t, "STUDY_ALL"), () => hub._studyAll(), { play: true });
    const sum = e.createEl("div", { cls: "lh-sumr" });
    const mets = ui.metrics(sum, [{ value: due + unseen, label: c(t, "READY"), tone: "td" }, { value: unseen, label: c(t, "FILTER_NEW"), tone: "tn" }, { value: total, label: c(t, "TOTAL") }]);
    hub._resumeLink(mets);
    if (total) ui.segBar(sum, [{ pct: due / total * 100, color: "due" }, { pct: unseen / total * 100, color: "new" }]);
  }

  let decksEl;
  renderToolbar(e, hub, () => renderDecks(decksEl, hub));
  if (phone && t.licenseValid) renderTimeboxRow(e.createEl("div", { cls: "lh-tb lh-tbx" }), hub.plugin, hub.app, hub.decks, hub._openTimebox, hub._backToHub);
  const scroll = e.createEl("div", { cls: "lh-scroll" });
  decksEl = scroll.createEl("div");
  renderDecks(decksEl, hub);

  const banners = scroll.createEl("div", { cls: "lh-banners" });
  renderSynapseProBanner(banners, hub.plugin, hub.app).catch(err => console.warn("synapse banner failed", err));
  const gen = hub._tabGen;
  renderSkillsUpdateBanner(banners, hub.plugin, () => hub._tabGen === gen).catch(err => console.warn("skills update banner failed", err));
}

module.exports = { renderReviewTab, deckStats };
