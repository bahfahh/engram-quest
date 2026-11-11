"use strict";
// Hub "Deep Dive" page (Pro). No schedules here, so the numbers are pages / unread / decks. Clicking
// a deck drills into its page list, and each page opens the reader. Reading state lives in the
// plugin-owned engram-quest/explainer/state.json (see data.js).

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { scanExplainers, groupExplainersByDeck, readState, deleteExplainer } = require("./data");
const { ExplainerViewerModal } = require("./viewer-modal");
const ui = require("../hub/ui");

const FILTERS = [["all", "FILTER_ALL"], ["unread", "EXPLAINER_STAT_UNREAD"], ["read", "EXPLAINER_STAT_READ"], ["starred", "FILTER_STARRED"], ["completed", "FILTER_DONE"], ["recent", "FILTER_RECENT"]];
const SORTS = [["unread", "SORT_UNREAD_FIRST"], ["newest", "SORT_NEWEST"], ["oldest", "SORT_OLDEST"], ["name", "SORT_NAME"]];
const TABLE_COLUMNS = "grid-template-columns:minmax(0,1fr) 110px 70px 70px 70px 40px";

function recentCutoffStr(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Completed, read and unread as mutually exclusive bar segments.
function readingParts(pages) {
  const pct = (test) => (pages.length ? pages.filter(test).length / pages.length * 100 : 0);
  return [
    { pct: pct(p => p._completed), color: "mst" },
    { pct: pct(p => p._viewed && !p._completed), color: "lrn" },
    { pct: pct(p => !p._viewed && !p._completed), color: "due" },
  ];
}

async function renderExplainerTab(el, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  const gen = hub._tabGen;
  hub._xSearch = hub._xSearch || "";
  hub._xFilter = hub._xFilter || "all";
  hub._xSort = hub._xSort || "unread";

  let scan, state;
  try {
    [scan, state] = await Promise.all([scanExplainers(adapter), readState(adapter)]);
  } catch (err) {
    console.error("EngramQuest: explainer scan failed", err);
    scan = { pages: [], total: 0 };
    state = {};
  }
  if (hub._tabGen !== gen) return;
  el.empty();
  for (const page of scan.pages) {
    const st = state[page.id] || {};
    page._viewed = !!st.viewed;
    page._starred = !!st.starred;
    page._completed = !!st.completed;
  }

  const unreadTotal = scan.pages.filter(p => !p._viewed).length;
  (hub._entryHints = hub._entryHints || {}).explainer = unreadTotal ? `${unreadTotal} ${c(t, "EXPLAINER_STAT_UNREAD")}` : "";

  ui.pageHeader(el, hub, { titleKey: "TAB_EXPLAINER", guide: "explainer", subtitle: c(t, "EXPLAINER_STATS_HELP") });
  if (scan.total === 0) {
    ui.emptyState(el, { iconName: "doc", title: c(t, "EXPLAINER_EMPTY_TITLE"), body: c(t, "EXPLAINER_EMPTY_BODY") });
    return;
  }

  const sum = el.createEl("div", { cls: "lh-sumr" });
  ui.metrics(sum, [
    { value: scan.total, label: c(t, "EXPLAINER_STAT_PAGES") },
    { value: unreadTotal, label: c(t, "EXPLAINER_STAT_UNREAD"), tone: "td" },
    { value: groupExplainersByDeck(scan.pages).length, label: c(t, "EXPLAINER_STAT_DECKS") },
  ]);
  ui.segBar(sum, readingParts(scan.pages));

  const refresh = () => { if (el.isConnected) renderExplainerTab(el, hub); };
  let content;
  const rerender = () => renderContent(content, hub, t, scan.pages, refresh);
  renderToolbar(el, hub, t, rerender);
  content = el.createEl("div", { cls: "lh-scroll" });
  rerender();
}

function renderToolbar(parent, hub, t, rerender) {
  const filters = FILTERS.map(([value, key]) => ({ value, label: c(t, key) }));
  const search = { placeholder: c(t, "SEARCH_EXPLAINER"), value: hub._xSearch, onInput: (v) => { hub._xSearch = v; rerender(); } };
  const onFilter = (v) => { hub._xFilter = v; rerender(); };
  const addSort = (row) => ui.sortSelect(row, t, SORTS, hub._xSort, (v) => { hub._xSort = v; rerender(); });
  if (ui.isPhone()) {
    ui.searchBox(parent, search);
    ui.segmented(parent.createEl("div", { cls: "lh-tb lh-tbx" }), filters, hub._xFilter, onFilter);
    const row = parent.createEl("div", { cls: "lh-tb lh-tbx" });
    addSort(row);
    row.createEl("span", { cls: "lh-grow" });
    ui.viewToggle(row, hub, rerender);
    return;
  }
  const bar = parent.createEl("div", { cls: "lh-tb" });
  ui.segmented(bar, filters, hub._xFilter, onFilter);
  addSort(bar);
  bar.createEl("span", { cls: "lh-grow" });
  ui.searchBox(bar, { ...search, width: 180 });
  ui.viewToggle(bar, hub, rerender);
}

function filterPages(hub, pages) {
  let r = pages;
  const q = (hub._xSearch || "").toLowerCase();
  if (q) {
    r = r.filter((p) =>
      String(p.title || "").toLowerCase().includes(q) ||
      String(p.deck || "").toLowerCase().includes(q) ||
      String((p.sourceCard && p.sourceCard.front) || "").toLowerCase().includes(q));
  }
  const f = hub._xFilter || "all";
  if (f === "unread") r = r.filter((p) => !p._viewed);
  else if (f === "read") r = r.filter((p) => p._viewed && !p._completed);
  else if (f === "starred") r = r.filter((p) => p._starred);
  else if (f === "completed") r = r.filter((p) => p._completed);
  else if (f === "recent") { const cut = recentCutoffStr(7); r = r.filter((p) => String(p.created || "") >= cut); }
  return r;
}

// Sort pages inside a deck. Default "unread" ranks unread → viewed → completed (newest within
// each rank) so the next thing to read is always on top.
function sortPages(pages, mode) {
  const r = pages.slice();
  const created = (p) => String(p.created || "");
  if (mode === "newest") r.sort((a, b) => created(b).localeCompare(created(a)));
  else if (mode === "oldest") r.sort((a, b) => created(a).localeCompare(created(b)));
  else if (mode === "name") r.sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
  else {
    const rank = (p) => (p._completed ? 2 : p._viewed ? 1 : 0);
    r.sort((a, b) => rank(a) - rank(b) || created(b).localeCompare(created(a)));
  }
  return r;
}

// Order decks to match: with "unread first" the deck holding the most unread floats to the top.
function sortDecks(decks, mode) {
  const r = decks.slice();
  const latest = (d) => d.pages.reduce((m, p) => (String(p.created || "") > m ? String(p.created) : m), "");
  const unread = (d) => d.pages.filter((p) => !p._viewed).length;
  if (mode === "newest") r.sort((a, b) => latest(b).localeCompare(latest(a)));
  else if (mode === "oldest") r.sort((a, b) => latest(a).localeCompare(latest(b)));
  else if (mode !== "name") r.sort((a, b) => unread(b) - unread(a) || a.name.localeCompare(b.name));
  return r; // "name": groupExplainersByDeck already sorts alphabetically
}

function renderContent(content, hub, t, pages, refresh) {
  content.empty();
  const visible = filterPages(hub, pages);
  const decks = sortDecks(groupExplainersByDeck(visible), hub._xSort);

  // A deck is open: show its pages. Fall back to the deck list when the open deck no longer exists
  // under the current filters.
  if (hub._xDeck) {
    const deck = decks.find((d) => d.name === hub._xDeck);
    if (deck) { renderDeckPages(content, hub, t, deck, refresh); return; }
    hub._xDeck = null;
  }
  if (decks.length === 0) {
    content.createEl("div", { cls: "lh-empty2", text: c(t, "EMPTY_FILTERED_DECKS") });
    return;
  }
  if (hub.viewMode === "tree") renderTreeView(content, hub, t, decks, refresh);
  else if (hub.viewMode === "grid") renderGridView(content, hub, t, decks, refresh);
  else if (ui.isPhone()) renderPhoneList(content, hub, t, decks, refresh);
  else renderTableView(content, hub, t, decks, refresh);
}

// Deck state is three-way on purpose: "read" (everything opened) is NOT "done". Only pages the
// user ticked in the reader count as completed.
function deckState(total, unread, completed) {
  if (unread > 0) return "todo";
  return total > 0 && completed === total ? "done" : "read";
}

function deckStats(deck) {
  const total = deck.pages.length;
  const unread = deck.pages.filter((p) => !p._viewed).length;
  const starred = deck.pages.filter((p) => p._starred).length;
  const completed = deck.pages.filter((p) => p._completed).length;
  const latest = deck.pages.reduce((m, p) => (String(p.created || "") > m ? String(p.created) : m), "");
  return {
    total, unread, starred, completed, latest,
    // `read` excludes completed so unread + read + completed === total.
    read: deck.pages.filter((p) => p._viewed && !p._completed).length,
    readPct: total ? Math.round((total - unread) / total * 100) : 0,
    donePct: total ? Math.round(completed / total * 100) : 0,
    state: deckState(total, unread, completed),
  };
}

function allClearLabel(t, s) { return c(t, s.state === "done" ? "EXPLAINER_ALL_DONE" : "EXPLAINER_ALL_READ"); }
function deckSub(t, s) { return K(c(t, "EXPLAINER_DECK_SUB"), { count: s.total, date: s.latest || "—" }); }

function confirmDeleteDeck(hub, t, deck, refresh) {
  ui.confirmDialog(hub.app, t, {
    title: K(c(t, "DELETE_CONFIRM_TITLE"), { name: deck.name }),
    body: K(c(t, "EXPLAINER_DELETE_DECK_BODY"), { count: deck.pages.length }),
    onConfirm: async () => {
      let deleted = 0;
      try {
        for (const page of deck.pages) { await deleteExplainer(hub.app.vault.adapter, page.id); deleted++; }
        new I.Notice(K(c(t, "EXPLAINER_DELETE_DECK_DONE"), { count: deleted }));
      } catch (err) {
        console.error("EngramQuest: explainer deck delete failed", err);
        new I.Notice(c(t, "EXPLAINER_DELETE_FAILED"));
      }
      refresh();
    },
  });
}

function confirmDeletePage(hub, t, page, refresh) {
  ui.confirmDialog(hub.app, t, {
    title: K(c(t, "DELETE_CONFIRM_TITLE"), { name: page.title || page.id }),
    body: c(t, "EXPLAINER_DELETE_BODY"),
    onConfirm: async () => {
      try {
        await deleteExplainer(hub.app.vault.adapter, page.id);
      } catch (err) {
        console.error("EngramQuest: explainer delete failed", err);
        new I.Notice(c(t, "EXPLAINER_DELETE_FAILED"));
        return;
      }
      new I.Notice(c(t, "EXPLAINER_DELETED"));
      refresh();
    },
  });
}

function trashAction(parent, t, run) { return ui.rowActions(parent, [{ name: "trash", label: c(t, "DELETE"), run }]); }

function openDeck(row, hub, deck, refresh) {
  row.addEventListener("click", () => { hub._xDeck = deck.name; refresh(); });
}

function renderTableView(content, hub, t, decks, refresh) {
  const table = content.createEl("div", { cls: "lh-tbl lh-ra-on" });
  const head = table.createEl("div", { cls: "lh-th", attr: { style: TABLE_COLUMNS } });
  head.createEl("span", { text: c(t, "EXPLAINER_DECK_COLUMN") });
  head.createEl("span", { cls: "lh-r td", text: c(t, "EXPLAINER_STAT_UNREAD") });
  head.createEl("span", { cls: "lh-r tl", text: c(t, "EXPLAINER_STAT_READ") });
  head.createEl("span", { cls: "lh-r", text: c(t, "FILTER_STARRED") });
  head.createEl("span", { cls: "lh-r tm", text: c(t, "FILTER_DONE") });
  head.createEl("span");
  decks.forEach((deck) => {
    const s = deckStats(deck);
    const row = table.createEl("div", { cls: "lh-tr", attr: { style: TABLE_COLUMNS, title: deckSub(t, s) } });
    const cell = row.createEl("div", { attr: { style: "min-width:0" } });
    cell.createEl("div", { cls: "lh-nm", text: deck.name });
    cell.createEl("div", { cls: "lh-pth", text: K(c(t, "EXPLAINER_DECK_PAGES"), { count: s.total }) });
    const unread = row.createEl("span", { cls: "lh-r" });
    if (s.unread) unread.createEl("span", { cls: "lh-unread", text: String(s.unread) });
    else unread.createEl("span", { cls: "lh-pth", text: allClearLabel(t, s) });
    [s.read, s.starred, s.completed].forEach(n => row.createEl("span", { cls: "lh-r" + (n ? "" : " dim"), text: String(n) }));
    trashAction(row, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    openDeck(row, hub, deck, refresh);
  });
}

function renderPhoneList(content, hub, t, decks, refresh) {
  const list = content.createEl("div", { cls: "lh-pl" });
  decks.forEach((deck) => {
    const s = deckStats(deck);
    const row = list.createEl("div", { cls: "lh-prd", attr: { title: deckSub(t, s) } });
    const main = row.createEl("div", { cls: "lh-grow" });
    main.createEl("div", { cls: "lh-nm", text: deck.name });
    main.createEl("div", { cls: "lh-pth", text: `${c(t, "EXPLAINER_STAT_READ")} ${s.read} · ${c(t, "FILTER_STARRED")} ${s.starred} · ${c(t, "FILTER_DONE")} ${s.completed}` });
    ui.segBar(main, readingParts(deck.pages));
    const count = row.createEl("div", { cls: "lh-pcnt" });
    count.createEl("b", { text: String(s.unread), cls: s.unread ? "" : "dim" });
    count.createEl("span", { text: s.unread ? c(t, "EXPLAINER_STAT_UNREAD") : allClearLabel(t, s) });
    ui.iconButton(row, "trash", c(t, "DELETE"), (ev) => { ev.stopPropagation(); confirmDeleteDeck(hub, t, deck, refresh); }, "lh-pact");
    openDeck(row, hub, deck, refresh);
  });
}

function renderGridView(content, hub, t, decks, refresh) {
  const grid = content.createEl("div", { cls: "lh-deck-cards" });
  decks.forEach((deck) => {
    const s = deckStats(deck);
    const card = grid.createEl("div", { cls: "lh-dc" + (s.unread ? "" : " is-idle") });
    trashAction(card, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    const head = card.createEl("div", { attr: { style: "min-width:0" } });
    head.createEl("div", { cls: "lh-nm", text: deck.name });
    head.createEl("div", { cls: "lh-pth", text: deckSub(t, s) });
    const nr = card.createEl("div", { cls: "lh-nr" });
    nr.createEl("b", { text: String(s.unread) });
    nr.createEl("span", { text: s.unread ? c(t, "EXPLAINER_STAT_UNREAD") : allClearLabel(t, s) });
    nr.createEl("i", { text: K(c(t, "EXPLAINER_DONE_RATE"), { percent: s.donePct }) });
    ui.segBar(card, readingParts(deck.pages));
    const meta = card.createEl("div", { cls: "lh-dmeta" });
    meta.createEl("span", { text: `${c(t, "EXPLAINER_STAT_READ")} ${s.read}`, cls: s.read ? "tl" : "" });
    meta.createEl("span", { text: `${c(t, "FILTER_STARRED")} ${s.starred}` });
    meta.createEl("span", { text: `${c(t, "FILTER_DONE")} ${s.completed}`, cls: s.completed ? "tm" : "" });
    openDeck(card, hub, deck, refresh);
  });
}

function renderTreeView(content, hub, t, decks, refresh) {
  const wrap = content.createEl("div", { cls: "lh-tree-container" });
  hub._renderTreeRecursive(wrap, hub._buildTree(decks, d => d.name.replace(/^#/, "")), (parentEl, deck) => {
    const s = deckStats(deck);
    const row = parentEl.createEl("div", { cls: "lh-trow" });
    const main = row.createEl("div", { cls: "lh-trow-main" });
    main.createEl("div", { cls: "lh-nm", text: deck.name.split("/").pop() });
    main.createEl("div", { cls: "lh-pth", text: deckSub(t, s) });
    const m = row.createEl("div", { cls: "lh-trow-metrics" });
    m.createEl("b", { text: String(s.unread), cls: s.unread ? "" : "dim" });
    m.createEl("span", { text: s.unread ? c(t, "EXPLAINER_STAT_UNREAD") : allClearLabel(t, s) });
    if (!ui.isPhone()) {
      m.createEl("span", { text: `${c(t, "EXPLAINER_STAT_READ")} ${s.read}`, cls: s.read ? "tl" : "" });
      m.createEl("span", { text: `${c(t, "FILTER_STARRED")} ${s.starred}` });
      m.createEl("span", { text: `${c(t, "FILTER_DONE")} ${s.completed}`, cls: s.completed ? "tm" : "" });
    }
    trashAction(row, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    openDeck(row, hub, deck, refresh);
  });
}

function pageStatus(page) {
  if (page._completed) return { name: "check", tone: "tm", key: "FILTER_DONE" };
  if (page._viewed) return { name: "book", tone: "tl", key: "EXPLAINER_STAT_READ" };
  return { name: "doc", tone: "td", key: "EXPLAINER_STAT_UNREAD" };
}

function renderDeckPages(content, hub, t, deck, refresh) {
  const s = deckStats(deck);
  const head = content.createEl("div", { cls: "lh-xhead" });
  const back = head.createEl("button", { cls: "lh-btn alt lh-back" });
  ui.icon(back, "back");
  back.createEl("span", { text: c(t, "BACK") });
  back.addEventListener("click", () => { hub._xDeck = null; refresh(); });
  ui.icon(head.createEl("span", { cls: "lh-dc-ic" }), "layers");
  const title = head.createEl("div", { cls: "lh-grow" });
  title.createEl("div", { cls: "lh-xdeck", text: deck.name });
  title.createEl("div", { cls: "lh-pth", text: `${K(c(t, "EXPLAINER_READ_RATE"), { percent: s.readPct })} · ${K(c(t, "EXPLAINER_DONE_RATE"), { percent: s.donePct })}` });

  const list = content.createEl("div", { cls: "lh-tbl" });
  sortPages(deck.pages, hub._xSort).forEach((page) => {
    const row = list.createEl("div", { cls: "lh-trow" });
    const status = pageStatus(page);
    ui.icon(row.createEl("span", { cls: `lh-gi ${status.tone}` }), status.name);
    const main = row.createEl("div", { cls: "lh-trow-main" });
    const title = main.createEl("div", { cls: "lh-xpt" });
    title.createEl("span", { cls: "lh-nm", text: page.title || page.id });
    if (page._starred) ui.icon(title.createEl("span", { cls: "lh-xstar", attr: { title: c(t, "FILTER_STARRED"), "aria-label": c(t, "FILTER_STARRED") } }), "star");
    if (Number(page.rewriteCount) > 0) title.createEl("span", { cls: "lh-xbadge", text: K(c(t, "EXPLAINER_REWRITTEN"), { count: page.rewriteCount }) });
    const sub = [page.sourceCard && page.sourceCard.front, page.created].filter(Boolean).join(" · ");
    main.createEl("div", { cls: "lh-pth", text: sub, attr: { title: sub } });
    row.createEl("span", { cls: `lh-st ${status.tone}`, text: c(t, status.key) });
    trashAction(row, t, () => confirmDeletePage(hub, t, page, refresh));
    ui.icon(row.createEl("span", { cls: "lh-dc-go" }), "chevron");
    row.addEventListener("click", () => new ExplainerViewerModal(hub.app, hub.plugin, page, refresh, hub).open());
  });
}

module.exports = { renderExplainerTab, deckState, deckStats, readingParts };
