"use strict";
// Hub "Explainer" tab renderer (Pro). Same visual shell as the other Hub tabs — stats header with
// background art, toolbar (search / filter / list-grid-tree view toggle), deck cards — with
// explainer semantics: no schedules, so the numbers are pages / unread / decks, and clicking a
// deck drills into its page list (Lesson Academy navigation pattern) where each page shows its
// reading state (📄 unread, 📘 read, ✅ completed, ⭐ starred) and opens the reader. Reading state
// lives in the plugin-owned engram-quest/explainer/state.json (see data.js).
// Colours come from the shared st-* palette in styles/index.js: amber = unread/due, blue = read,
// indigo = starred, green = completed. Green is reserved for a state the user set by hand.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { scanExplainers, groupExplainersByDeck, readState, deleteExplainer } = require("./data");
const { ExplainerViewerModal } = require("./viewer-modal");
const { attachInfoButton } = require("../hub/feature-guide");

const DECK_EMOJIS = ["📖", "📘", "🧠", "💡", "🔍", "🗺️", "🌿", "🧩", "📝", "🌊", "⚡", "📚"];
const TRASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';

function recentCutoffStr(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------------------------------------
// View-mode persistence (same mechanism as the other tabs: settings._viewModes[tab])
// ---------------------------------------------------------------------------------------------

function getViewMode(hub) {
  const vm = hub.viewModes && hub.viewModes.explainer;
  return vm === "grid" || vm === "tree" ? vm : "list";
}

async function setViewMode(hub, mode) {
  hub.viewModes = hub.viewModes || {};
  hub.viewModes.explainer = mode;
  hub.plugin.settings._viewModes = hub.viewModes;
  try { await hub.plugin.saveData(hub.plugin.settings); } catch (e) { console.warn("EngramQuest: save view mode failed", e); }
}

// ---------------------------------------------------------------------------------------------
// Tab renderer
// ---------------------------------------------------------------------------------------------

async function renderExplainerTab(el, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  el.empty();
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
  // Attach reading state so every renderer below reads plain fields.
  for (const page of scan.pages) {
    const st = state[page.id] || {};
    page._viewed = !!st.viewed;
    page._starred = !!st.starred;
    page._completed = !!st.completed;
  }

  const allDecks = groupExplainersByDeck(scan.pages);

  // ----- Stats header (same background-art block as the other tabs) -----
  let bg = "";
  try {
    const dark = activeDocument.body.classList.contains("theme-dark");
    bg = adapter.getResourcePath(hub.app.vault.configDir + "/plugins/engram-quest/" + (dark ? "stats_bg_dark.webp" : "bg.png"));
  } catch { bg = ""; }
  // Wrapper exists for layout only (flex column that owns the tab's height) — the colours come from
  // the shared st-* palette this tab deliberately has in common with Review Deck.
  const root = el.createEl("div", { attr: { class: "lh-explainer-view" } });
  const header = root.createEl("div", { attr: { class: "lh-stats-header", style: bg ? `background-image:url('${bg}')` : "" } });
  const unreadTotal = scan.pages.filter((p) => !p._viewed).length;
  // cls keeps the shared font size; st-* carries the shared state colour.
  [
    { label: c(t, "EXPLAINER_STAT_PAGES"), val: scan.total, cls: "total st-total", left: "17%", top: "30%" },
    { label: c(t, "EXPLAINER_STAT_UNREAD"), val: unreadTotal, cls: "new st-todo", left: "50%", top: "26%" },
    { label: c(t, "EXPLAINER_STAT_DECKS"), val: allDecks.length, cls: "ready st-read", left: "79%", top: "30%" },
  ].forEach((p) => {
    const g = header.createEl("div", { attr: { class: "lh-stat-grp", style: `left:${p.left};top:${p.top}` } });
    g.createEl("span", { text: p.label, attr: { class: "lh-stat-label" } });
    g.createEl("span", { text: String(p.val), attr: { class: `lh-stat-num ${p.cls}` } });
  });
  header.createEl("div", { text: c(t, "EXPLAINER_STATS_HELP"), attr: { class: "lh-stats-helper" } });

  // ----- Empty state -----
  if (scan.total === 0) {
    const empty = root.createEl("div", { attr: { class: "lh-quadrant-empty" } });
    empty.createEl("div", { text: "📖", attr: { style: "font-size:40px;text-align:center;" } });
    empty.createEl("div", {
      text: c(t, "EXPLAINER_EMPTY_TITLE"),
      attr: { style: "font-size:15px;font-weight:700;text-align:center;margin-top:8px;color:var(--text-normal);" },
    });
    empty.createEl("div", {
      text: c(t, "EXPLAINER_EMPTY_BODY"),
      attr: { style: "font-size:13px;line-height:1.6;text-align:center;margin-top:8px;color:var(--text-muted);max-width:420px;margin-left:auto;margin-right:auto;" },
    });
    return;
  }

  // Guard: refresh only while the tab is still in the document.
  const refresh = () => { if (el.isConnected) renderExplainerTab(el, hub); };

  const card = root.createEl("div", { attr: { class: "lh-card" } });
  const head = card.createEl("div", { attr: { class: "lh-card-header" } });
  const headGrp = head.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px" } });
  headGrp.createEl("span", { text: c(t, "TAB_EXPLAINER"), attr: { class: "lh-card-title" } });
  attachInfoButton(headGrp, hub.app, hub.plugin, "explainer");

  const bar = card.createEl("div", { attr: { class: "lh-toolbar" } });
  const content = card.createEl("div", { attr: { style: "flex:1;overflow-y:auto" } });
  const rerender = () => renderContent(content, hub, t, scan.pages, refresh);
  fillToolbar(bar, hub, t, rerender);
  rerender();
}

function fillToolbar(bar, hub, t, rerenderContent) {
  const search = bar.createEl("div", { attr: { class: "lh-search" } });
  search.createEl("span", { text: "⌕", attr: { class: "lh-search-icon" } });
  const input = search.createEl("input", { attr: { type: "text", placeholder: c(t, "SEARCH_EXPLAINER"), value: hub._xSearch } });
  input.addEventListener("input", () => { hub._xSearch = input.value; rerenderContent(); });

  const filter = bar.createEl("select", { attr: { class: "lh-filter" } });
  [["all", "FILTER_ALL"], ["unread", "EXPLAINER_STAT_UNREAD"], ["read", "EXPLAINER_STAT_READ"], ["starred", "FILTER_STARRED"], ["completed", "FILTER_DONE"], ["recent", "FILTER_RECENT"]].forEach(([val, key]) => {
    const opt = filter.createEl("option", { text: c(t, key), attr: { value: val } });
    if (val === hub._xFilter) opt.selected = true;
  });
  filter.addEventListener("change", () => { hub._xFilter = filter.value; rerenderContent(); });

  const sort = bar.createEl("select", { attr: { class: "lh-filter" } });
  [["unread", "SORT_UNREAD_FIRST"], ["newest", "SORT_NEWEST"], ["oldest", "SORT_OLDEST"], ["name", "SORT_NAME"]].forEach(([val, key]) => {
    const opt = sort.createEl("option", { text: c(t, key), attr: { value: val } });
    if (val === hub._xSort) opt.selected = true;
  });
  sort.addEventListener("change", () => { hub._xSort = sort.value; rerenderContent(); });

  const toggle = bar.createEl("div", { attr: { class: "lh-view-toggle" } });
  const mode = getViewMode(hub);
  const btns = [];
  const mk = (text, m, style) => {
    const b = toggle.createEl("button", { text, attr: { class: "lh-view-btn" + (mode === m ? " active" : ""), style: style || "" } });
    b.addEventListener("click", async () => {
      await setViewMode(hub, m);
      btns.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      rerenderContent();
    });
    btns.push(b);
    return b;
  };
  mk("≣", "list");
  mk("⊞", "grid");
  mk("🗂️", "tree", "font-size:12px;");
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

  // Drill-in: a deck is open — show its page list. Fall back to the deck list when the open deck
  // no longer exists under the current filters (deleted its last page, or filtered out).
  if (hub._xDeck) {
    const deck = decks.find((d) => d.name === hub._xDeck);
    if (deck) { renderDeckPages(content, hub, t, deck, refresh); return; }
    hub._xDeck = null;
  }

  if (decks.length === 0) {
    content.createEl("div", { attr: { class: "lh-empty" } }).textContent = c(t, "EMPTY_FILTERED_DECKS");
    return;
  }
  const mode = getViewMode(hub);
  if (mode === "list") renderListView(content, hub, t, decks, refresh);
  else if (mode === "grid") renderGridView(content, hub, t, decks, refresh);
  else renderTreeView(content, hub, t, decks, refresh);
}

// ---------------------------------------------------------------------------------------------
// Deck-level metrics helpers
// ---------------------------------------------------------------------------------------------

// Deck state is three-way on purpose: "read" (everything opened) is NOT "done". Only pages the
// user ticked ✅ in the reader count as completed, and only "done" is allowed to look green.
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
    // `read` excludes completed so unread + read + completed === total and the two pills never show
    // the same number. Same definition as the "read" filter and the 📘 glyph.
    read: deck.pages.filter((p) => p._viewed && !p._completed).length,
    readPct: total ? Math.round((total - unread) / total * 100) : 0,
    donePct: total ? Math.round(completed / total * 100) : 0,
    state: deckState(total, unread, completed),
  };
}

// The big box reports the deck's state; the three pills report the counts behind it.
const STATE_BOX = {
  todo: { key: "EXPLAINER_STAT_UNREAD", num: (s) => String(s.unread) },
  read: { key: "EXPLAINER_ALL_READ", num: () => "✓" },
  done: { key: "EXPLAINER_ALL_DONE", num: () => "✓" },
};

function appendMetrics(rowEl, t, s) {
  const metrics = rowEl.createEl("div", { attr: { class: "lh-deck-metrics" } });
  const box = metrics.createEl("div", { attr: { class: `lh-deck-ready st-${s.state}` } });
  box.createEl("div", { text: c(t, STATE_BOX[s.state].key), attr: { class: "lh-deck-ready-label" } });
  box.createEl("div", { text: STATE_BOX[s.state].num(s), attr: { class: "lh-deck-ready-num" } });
  const breakdown = metrics.createEl("div", { attr: { class: "lh-deck-breakdown" } });
  [
    { key: "EXPLAINER_STAT_READ", cls: "st-read", value: s.read },
    { key: "FILTER_STARRED", cls: "st-star", value: s.starred },
    { key: "FILTER_DONE", cls: "st-done", value: s.completed },
  ].forEach((m) => {
    const g = breakdown.createEl("div", { attr: { class: `lh-deck-metric ${m.cls}` } });
    g.createEl("div", { text: c(t, m.key), attr: { class: "lh-deck-metric-label" } });
    g.createEl("div", { text: String(m.value), attr: { class: "lh-deck-metric-num" } });
  });
}

// ---------------------------------------------------------------------------------------------
// Deck deletion (deck row 🗑️) — trashes every explainer page grouped under the deck
// ---------------------------------------------------------------------------------------------

function confirmDeleteDeck(hub, t, deck, refresh) {
  const adapter = hub.app.vault.adapter;
  const modal = new I.Modal(hub.app);
  modal.modalEl.style.cssText = "width:min(92vw,420px);padding:0;border-radius:16px;overflow:hidden;";
  const wrap = modal.contentEl;
  wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:14px;";
  wrap.createEl("div", {
    text: K(c(t, "DELETE_CONFIRM_TITLE"), { name: deck.name }),
    attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" },
  });
  wrap.createEl("div", {
    text: K(c(t, "EXPLAINER_DELETE_DECK_BODY"), { count: deck.pages.length }),
    attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;" },
  });
  const btnRow = wrap.createEl("div", { attr: { style: "display:flex;gap:8px;justify-content:flex-end;padding-top:4px;" } });
  btnRow.createEl("button", {
    text: c(t, "DELETE_CANCEL_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;font-size:13px;" },
  }).addEventListener("click", () => modal.close());
  const delBtn = btnRow.createEl("button", {
    text: c(t, "DELETE_CONFIRM_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:600;" },
  });
  delBtn.addEventListener("click", async () => {
    if (delBtn.disabled) return;
    delBtn.disabled = true;
    modal.close();
    let deleted = 0;
    try {
      for (const page of deck.pages) { await deleteExplainer(adapter, page.id); deleted++; }
      new I.Notice(K(c(t, "EXPLAINER_DELETE_DECK_DONE"), { count: deleted }));
    } catch (err) {
      console.error("EngramQuest: explainer deck delete failed", err);
      new I.Notice(c(t, "EXPLAINER_DELETE_FAILED"));
    }
    refresh();
  });
  modal.open();
}

function appendTrashBtn(parentEl, t, onClick) {
  const btn = parentEl.createEl("button", { attr: { class: "lh-delete-btn", title: c(t, "DELETE") } });
  btn.appendChild(I.sanitizeHTMLToDom(TRASH_SVG));
  btn.addEventListener("click", (ev) => { ev.stopPropagation(); onClick(); });
  return btn;
}

// ---------------------------------------------------------------------------------------------
// Deck views (list / grid / tree)
// ---------------------------------------------------------------------------------------------

function openDeck(hub, deck, refresh) {
  hub._xDeck = deck.name;
  refresh();
}

function renderListView(content, hub, t, decks, refresh) {
  const list = content.createEl("div", { attr: { class: "lh-deck-list" } });
  decks.forEach((deck, o) => {
    const s = deckStats(deck);
    const row = list.createEl("div", { attr: { class: `lh-deck-row${s.state === "done" ? " is-emptyready" : ""}` } });
    row.createEl("span", { text: ">", attr: { class: "lh-deck-chevron" } });
    const main = row.createEl("div", { attr: { class: "lh-deck-main" } });
    const nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:8px;" } });
    nameRow.createEl("span", { text: DECK_EMOJIS[o % DECK_EMOJIS.length], attr: { style: "font-size:16px;line-height:1;" } });
    nameRow.createEl("span", { text: deck.name });
    main.createEl("div", {
      text: K(c(t, "EXPLAINER_DECK_SUB"), { count: s.total, date: s.latest || "—" }),
      attr: { class: "lh-deck-row-sub" },
    });
    appendMetrics(row, t, s);
    appendTrashBtn(row, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    row.addEventListener("click", () => openDeck(hub, deck, refresh));
  });
}

function renderGridView(content, hub, t, decks, refresh) {
  const grid = content.createEl("div", { attr: { class: "lh-deck-grid" } });
  decks.forEach((deck, o) => {
    const s = deckStats(deck);
    const gc = grid.createEl("div", {
      attr: { class: `lh-deck-gc st-${s.state}${s.state === "todo" ? " has-due" : ""}${s.state === "done" ? " is-emptyready" : ""}` },
    });
    gc.createEl("div", { attr: { class: "lh-deck-gc-emoji" } }).textContent = DECK_EMOJIS[o % DECK_EMOJIS.length];
    gc.createEl("div", { attr: { class: "lh-deck-gc-name" } }).textContent = deck.name;
    gc.createEl("div", {
      text: s.state === "todo" ? K(c(t, "EXPLAINER_UNREAD_COUNT"), { count: s.unread })
        : s.state === "read" ? c(t, "EXPLAINER_ALL_READ")
          : `✓ ${c(t, "EXPLAINER_ALL_DONE")}`,
      attr: { class: "lh-deck-gc-status" },
    });
    const r = gc.createEl("div", { attr: { class: "lh-deck-gc-ready" } });
    r.createEl("div", { text: String(s.total), attr: { class: "lh-deck-gc-ready-num" } });
    r.createEl("div", { text: c(t, "EXPLAINER_STAT_PAGES"), attr: { class: "lh-deck-gc-ready-label" } });
    // The bar tracks completion, not reading — reading alone must never look like a finished deck.
    gc.createEl("div", { attr: { class: "lh-deck-gc-bar-bg" } }).createEl("div", { attr: { class: "lh-deck-gc-bar", style: `width:${s.donePct}%` } });
    gc.createEl("div", { attr: { class: "lh-deck-gc-sub" } }).textContent =
      `${K(c(t, "EXPLAINER_READ_RATE"), { percent: s.readPct })} · ${K(c(t, "EXPLAINER_DONE_RATE"), { percent: s.donePct })}`;
    const metrics = gc.createEl("div", { attr: { class: "lh-deck-gc-metrics" } });
    [
      { key: "EXPLAINER_STAT_UNREAD", cls: "st-todo", value: s.unread },
      { key: "FILTER_STARRED", cls: "st-star", value: s.starred },
      { key: "FILTER_DONE", cls: "st-done", value: s.completed },
    ].forEach((m) => {
      const e = metrics.createEl("div", { attr: { class: `lh-deck-gc-metric ${m.cls}` } });
      e.createEl("div", { text: c(t, m.key), attr: { class: "lh-deck-gc-metric-label" } });
      e.createEl("div", { text: String(m.value), attr: { class: "lh-deck-gc-metric-num" } });
    });
    appendTrashBtn(gc, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    gc.addEventListener("click", () => openDeck(hub, deck, refresh));
  });
}

function renderTreeView(content, hub, t, decks, refresh) {
  const container = content.createEl("div", { attr: { class: "lh-tree-container" } });
  const tree = hub._buildTree(decks, (d) => d.name.replace(/^#/, ""));
  let count = 0;
  hub._renderTreeRecursive(container, tree, (parentEl, deck) => {
    const s = deckStats(deck);
    const row = parentEl.createEl("div", { attr: { class: `lh-deck-row lh-tree-item-row${s.state === "done" ? " is-emptyready" : ""}` } });
    const main = row.createEl("div", { attr: { class: "lh-deck-main" } });
    const nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:8px;" } });
    nameRow.createEl("span", { text: DECK_EMOJIS[count % DECK_EMOJIS.length], attr: { style: "font-size:16px;line-height:1;" } });
    nameRow.createEl("span", { text: deck.name.split("/").pop() });
    main.createEl("div", {
      text: K(c(t, "EXPLAINER_DECK_SUB"), { count: s.total, date: s.latest || "—" }),
      attr: { class: "lh-deck-row-sub" },
    });
    appendMetrics(row, t, s);
    appendTrashBtn(row, t, () => confirmDeleteDeck(hub, t, deck, refresh));
    row.addEventListener("click", () => openDeck(hub, deck, refresh));
    count++;
  });
}

// ---------------------------------------------------------------------------------------------
// Drill-in: one deck's page list
// ---------------------------------------------------------------------------------------------

function renderDeckPages(content, hub, t, deck, refresh) {
  const s = deckStats(deck);

  // Header row: ← back + deck name + read progress.
  const headRow = content.createEl("div", {
    attr: { style: "display:flex;align-items:center;gap:10px;padding:10px 4px 6px;" },
  });
  const backBtn = headRow.createEl("button", {
    text: "← " + c(t, "BACK"),
    attr: { style: "font-size:12px;padding:4px 12px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;flex-shrink:0;" },
  });
  backBtn.addEventListener("click", () => { hub._xDeck = null; refresh(); });
  headRow.createEl("span", { text: `📖 ${deck.name}`, attr: { style: "font-size:14px;font-weight:700;color:var(--text-normal);" } });
  headRow.createEl("span", {
    text: `${K(c(t, "EXPLAINER_READ_RATE"), { percent: s.readPct })} · ${K(c(t, "EXPLAINER_DONE_RATE"), { percent: s.donePct })}`,
    attr: { style: "font-size:12px;color:var(--text-muted);margin-left:auto;" },
  });

  const list = content.createEl("div", { attr: { class: "lh-deck-list" } });
  sortPages(deck.pages, hub._xSort).forEach((page) => {
    const row = list.createEl("div", { attr: { class: "lh-deck-row" } });

    // Status glyph mirrors the deck-level three states: ✅ completed / 📘 read / 📄 unread.
    row.createEl("span", {
      text: page._completed ? "✅" : page._viewed ? "📘" : "📄",
      attr: { style: "font-size:16px;line-height:1;flex-shrink:0;" },
    });

    const main = row.createEl("div", { attr: { class: "lh-deck-main" } });
    const nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:6px;flex-wrap:wrap;" } });
    if (!page._viewed) {
      nameRow.createEl("span", {
        text: "●",
        attr: { style: "color:var(--interactive-accent,#6366f1);font-size:10px;line-height:1;", title: c(t, "EXPLAINER_STAT_UNREAD") },
      });
    }
    nameRow.createEl("span", { text: page.title || page.id });
    if (page._starred) nameRow.createEl("span", { text: "⭐", attr: { style: "font-size:12px;line-height:1;" } });
    if (Number(page.rewriteCount) > 0) {
      nameRow.createEl("span", {
        text: K(c(t, "EXPLAINER_REWRITTEN"), { count: page.rewriteCount }),
        attr: { style: "font-size:10.5px;color:var(--text-muted);border:1px solid var(--background-modifier-border);border-radius:10px;padding:0 7px;" },
      });
    }
    const subParts = [];
    if (page.sourceCard && page.sourceCard.front) subParts.push(page.sourceCard.front);
    if (page.created) subParts.push(page.created);
    main.createEl("div", { text: subParts.join(" · "), attr: { class: "lh-deck-row-sub" } });

    appendTrashBtn(row, t, () => confirmDeletePage(hub, t, page, refresh));
    row.addEventListener("click", () => {
      new ExplainerViewerModal(hub.app, hub.plugin, page, refresh).open();
    });
  });
}

function confirmDeletePage(hub, t, page, refresh) {
  const modal = new I.Modal(hub.app);
  modal.modalEl.style.cssText = "width:min(92vw,420px);padding:0;border-radius:16px;overflow:hidden;";
  const wrap = modal.contentEl;
  wrap.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:14px;";
  wrap.createEl("div", {
    text: K(c(t, "DELETE_CONFIRM_TITLE"), { name: page.title || page.id }),
    attr: { style: "font-size:16px;font-weight:700;color:var(--text-normal);" },
  });
  wrap.createEl("div", {
    text: c(t, "EXPLAINER_DELETE_BODY"),
    attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;" },
  });
  const btnRow = wrap.createEl("div", { attr: { style: "display:flex;gap:8px;justify-content:flex-end;padding-top:4px;" } });
  btnRow.createEl("button", {
    text: c(t, "DELETE_CANCEL_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal);cursor:pointer;font-size:13px;" },
  }).addEventListener("click", () => modal.close());
  const confirmBtn = btnRow.createEl("button", {
    text: c(t, "DELETE_CONFIRM_BTN"),
    attr: { style: "padding:7px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:600;" },
  });
  confirmBtn.addEventListener("click", async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    modal.close();
    try {
      await deleteExplainer(hub.app.vault.adapter, page.id);
    } catch (err) {
      console.error("EngramQuest: explainer delete failed", err);
      new I.Notice(c(t, "EXPLAINER_DELETE_FAILED"));
      return;
    }
    new I.Notice(c(t, "EXPLAINER_DELETED"));
    refresh();
  });
  modal.open();
}

// deckState / deckStats are pure and are the heart of the read-vs-completed distinction, so they
// are exported for unit tests even though the rest of this file is render-layer.
module.exports = { renderExplainerTab, deckState, deckStats };
