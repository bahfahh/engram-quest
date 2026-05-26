"use strict";
// Hub "Quadrant Card" tab renderer (Pro). Scans engram-quest/quadrant/sr/*.json, groups the cards
// into decks by tag (card.deck → source-note flashcard tag → source folder), and renders the same
// stats-header + toolbar (search / status filter / list-grid-tree view toggle) + deck cards UI as
// the Review Deck tab — reusing its CSS classes for visual parity. Clicking a deck runs its ready
// A4 cards through the review modal in sequence. Kept out of the fragile hub/modal.js: modal.js
// only holds a thin _renderQuadrantTab delegate to renderQuadrantTab().

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { matchFlashcardTagPrefix } = require("../review/helpers");
const { scanQuadrantCards, groupQuadrantDecks, isCardMastered } = require("./cards");
const { QuadrantReviewModal } = require("./review-modal");

const DECK_EMOJIS = ["🗂️", "📘", "🧠", "⭐", "⚡", "🔗", "🌿", "🧩", "📝", "🌊", "💡", "📚"];

// ---------------------------------------------------------------------------------------------
// Deck (tag) resolution
// ---------------------------------------------------------------------------------------------

function collectNoteTags(cache) {
  const tags = [];
  if (!cache) return tags;
  if (Array.isArray(cache.tags)) {
    tags.push(...cache.tags.map((tg) => String(tg.tag).replace(/^#/, "")));
  }
  if (cache.frontmatter && cache.frontmatter.tags) {
    const fm = cache.frontmatter.tags;
    if (typeof fm === "string") tags.push(...fm.split(",").map((tg) => tg.trim().replace(/^#/, "")));
    else if (Array.isArray(fm)) tags.push(...fm.map((tg) => String(tg).replace(/^#/, "")));
    else tags.push(String(fm).replace(/^#/, ""));
  }
  return [...new Set(tags.filter(Boolean))];
}

/**
 * Resolve a card's deck name. Precedence: explicit card.deck (written by the skill) → the source
 * note's matched flashcard tag (same matcher as Review Deck) → the source note's folder name →
 * "Quadrant". Lets legacy cards (no deck field) still group sensibly.
 */
function makeDeckResolver(hub) {
  const settings = hub.plugin.settings;
  return (card) => {
    if (card.deck) return String(card.deck);
    const src = card.source;
    if (src && typeof src === "string") {
      const file = hub.app.vault.getAbstractFileByPath(src);
      if (file) {
        const cache = hub.app.metadataCache.getFileCache(file);
        const matched = matchFlashcardTagPrefix(collectNoteTags(cache), settings.flashcardTags);
        if (matched) return matched;
        if (file.parent && file.parent.path && file.parent.path !== "/") return file.parent.name;
      }
      const parts = src.split("/");
      if (parts.length > 1) return parts[parts.length - 2];
    }
    return "Quadrant";
  };
}

// ---------------------------------------------------------------------------------------------
// Sequential review of a deck's ready cards
// ---------------------------------------------------------------------------------------------

function startDeckReview(hub, deck, refresh) {
  let queue = deck.cards.filter((card) => card._due || card._new);
  if (queue.length === 0) queue = deck.cards.slice(); // nothing ready → browse all as preview
  let idx = 0;
  const openNext = () => {
    if (idx >= queue.length) { refresh(); return; }
    const card = queue[idx++];
    new QuadrantReviewModal(hub.app, hub.plugin, card, openNext).open();
  };
  openNext();
}

// ---------------------------------------------------------------------------------------------
// View-mode persistence (shared mechanism with Review Deck: settings._viewModes[tab])
// ---------------------------------------------------------------------------------------------

function getViewMode(hub) {
  const vm = hub.viewModes && hub.viewModes.quadrant;
  return vm === "grid" || vm === "tree" ? vm : "list";
}

async function setViewMode(hub, mode) {
  hub.viewModes = hub.viewModes || {};
  hub.viewModes.quadrant = mode;
  hub.plugin.settings._viewModes = hub.viewModes;
  try { await hub.plugin.saveData(hub.plugin.settings); } catch (e) { console.warn("EngramQuest: save view mode failed", e); }
}

// ---------------------------------------------------------------------------------------------
// Tab renderer
// ---------------------------------------------------------------------------------------------

async function renderQuadrantTab(el, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  el.empty();
  hub._qSearch = hub._qSearch || "";
  hub._qFilter = hub._qFilter || "all";

  let scan;
  try {
    scan = await scanQuadrantCards(adapter);
  } catch (err) {
    console.error("EngramQuest: quadrant scan failed", err);
    scan = { cards: [], due: 0, new: 0, total: 0 };
  }

  const deckOf = makeDeckResolver(hub);
  const decks = groupQuadrantDecks(scan.cards, deckOf);

  // ----- Stats header (mirrors Review tab: background art with three positioned numbers) -----
  let bg = "";
  try {
    const dark = activeDocument.body.classList.contains("theme-dark");
    bg = adapter.getResourcePath(hub.app.vault.configDir + "/plugins/engram-quest/" + (dark ? "stats_bg_dark.webp" : "bg.png"));
  } catch { bg = ""; }
  const header = el.createEl("div", { attr: { class: "lh-stats-header", style: bg ? `background-image:url('${bg}')` : "" } });
  const totDue = decks.reduce((p, d) => p + d.due, 0);
  const totNew = decks.reduce((p, d) => p + d.unseen, 0);
  const totAll = decks.reduce((p, d) => p + d.total, 0);
  [
    { label: c(t, "READY"), val: totDue + totNew, cls: "ready", left: "17%", top: "30%" },
    { label: c(t, "FILTER_NEW"), val: totNew, cls: "new", left: "50%", top: "26%" },
    { label: c(t, "TOTAL"), val: totAll, cls: "total", left: "79%", top: "30%" },
  ].forEach((p) => {
    const g = header.createEl("div", { attr: { class: "lh-stat-grp", style: `left:${p.left};top:${p.top}` } });
    g.createEl("span", { text: p.label, attr: { class: "lh-stat-label" } });
    g.createEl("span", { text: String(p.val), attr: { class: `lh-stat-num ${p.cls}` } });
  });
  header.createEl("div", { text: c(t, "READY_HELP"), attr: { class: "lh-stats-helper" } });

  // ----- Empty state -----
  if (scan.total === 0) {
    const empty = el.createEl("div", { attr: { class: "lh-quadrant-empty" } });
    empty.createEl("div", { text: "🎴", attr: { style: "font-size:40px;text-align:center;" } });
    empty.createEl("div", {
      text: c(t, "QUADRANT_EMPTY_TITLE"),
      attr: { style: "font-size:15px;font-weight:700;text-align:center;margin-top:8px;color:var(--text-normal);" },
    });
    empty.createEl("div", {
      text: c(t, "QUADRANT_EMPTY_BODY"),
      attr: { style: "font-size:13px;line-height:1.6;text-align:center;margin-top:8px;color:var(--text-muted);max-width:420px;margin-left:auto;margin-right:auto;" },
    });
    return;
  }

  // ----- Card shell + toolbar + scrollable content (same DOM order as Review tab) -----
  // Guard: a deck review keeps the hub open behind the card modals, so by the time the run
  // finishes the user may have closed the hub — re-rendering a detached node wastes a full
  // re-scan and mutates a stale hub. Only refresh while the tab is still in the document.
  const refresh = () => { if (el.isConnected) renderQuadrantTab(el, hub); };

  const card = el.createEl("div", { attr: { class: "lh-card" } });
  const head = card.createEl("div", { attr: { class: "lh-card-header" } });
  head.createEl("span", { text: c(t, "TAB_QUADRANT"), attr: { class: "lh-card-title" } });

  // "▶ Review ready cards" — same entry point as the Review Deck tab: run every ready (due + new)
  // card across all decks through the A4 review modal in sequence.
  const allReady = decks.flatMap((d) => d.cards).filter((cd) => cd._due || cd._new);
  const studyBtn = head.createEl("button", { attr: { class: "lh-study-all" } });
  studyBtn.textContent = `▶ ${c(t, "STUDY_ALL")}`;
  studyBtn.addEventListener("click", () => {
    if (allReady.length === 0) { new I.Notice(c(t, "NOTHING_READY")); return; }
    startDeckReview(hub, { cards: allReady }, refresh);
  });

  const bar = card.createEl("div", { attr: { class: "lh-toolbar" } });    // toolbar before content
  const content = card.createEl("div", { attr: { style: "flex:1;overflow-y:auto" } });
  const rerender = () => renderContent(content, hub, t, decks, refresh);
  fillToolbar(bar, hub, t, rerender);
  rerender();
}

function fillToolbar(bar, hub, t, rerenderContent) {
  const search = bar.createEl("div", { attr: { class: "lh-search" } });
  search.createEl("span", { text: "⌕", attr: { class: "lh-search-icon" } });
  const input = search.createEl("input", { attr: { type: "text", placeholder: c(t, "SEARCH_QUADRANT"), value: hub._qSearch } });
  input.addEventListener("input", () => { hub._qSearch = input.value; rerenderContent(); });

  const filter = bar.createEl("select", { attr: { class: "lh-filter" } });
  [["all", "FILTER_ALL"], ["due", "FILTER_DUE"], ["new", "FILTER_NEW"], ["done", "FILTER_DONE"]].forEach(([val, key]) => {
    const opt = filter.createEl("option", { text: c(t, key), attr: { value: val } });
    if (val === hub._qFilter) opt.selected = true;
  });
  filter.addEventListener("change", () => { hub._qFilter = filter.value; rerenderContent(); });

  const toggle = bar.createEl("div", { attr: { class: "lh-view-toggle" } });
  const mode = getViewMode(hub);
  const btns = [];
  const mk = (text, m, style) => {
    const b = toggle.createEl("button", { text, attr: { class: "lh-view-btn" + (mode === m ? " active" : ""), style: style || "" } });
    b.addEventListener("click", async () => {
      await setViewMode(hub, m);
      btns.forEach((x) => x.classList.remove("active")); // toolbar isn't rebuilt, so toggle here
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

function filterDecks(hub, decks) {
  let r = decks;
  const q = (hub._qSearch || "").toLowerCase();
  if (q) r = r.filter((d) => d.name.toLowerCase().includes(q));
  const f = hub._qFilter || "all";
  if (f === "due") r = r.filter((d) => d.due > 0);
  else if (f === "new") r = r.filter((d) => d.unseen > 0);
  else if (f === "done") r = r.filter((d) => d.due === 0 && d.unseen === 0);
  return r;
}

function renderContent(content, hub, t, decks, refresh) {
  content.empty();
  const visible = filterDecks(hub, decks);
  if (visible.length === 0) {
    content.createEl("div", { attr: { class: "lh-empty" } }).textContent = c(t, "EMPTY_FILTERED_DECKS");
    return;
  }
  const mode = getViewMode(hub);
  if (mode === "list") renderListView(content, hub, t, visible, refresh);
  else if (mode === "grid") renderGridView(content, hub, t, visible, refresh);
  else renderTreeView(content, hub, t, visible, refresh);
}

function renderListView(content, hub, t, decks, refresh) {
  const list = content.createEl("div", { attr: { class: "lh-deck-list" } });
  decks.forEach((deck, o) => {
    const ready = deck.due + deck.unseen;
    const row = list.createEl("div", { attr: { class: `lh-deck-row${ready === 0 ? " is-emptyready" : ""}` } });
    row.createEl("span", { text: ">", attr: { class: "lh-deck-chevron" } });
    const main = row.createEl("div", { attr: { class: "lh-deck-main" } });
    const nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:8px;" } });
    nameRow.createEl("span", { text: DECK_EMOJIS[o % DECK_EMOJIS.length], attr: { style: "font-size:16px;line-height:1;" } });
    nameRow.createEl("span", { text: deck.name });
    main.createEl("div", {
      text: ready > 0 ? `${c(t, "READY_NOW")}: ${ready}` : K(c(t, "ALL_SCHEDULED"), { total: deck.total }),
      attr: { class: "lh-deck-row-sub" },
    });
    appendMetrics(row, t, deck, ready);
    row.title = ready === 0 ? K(c(t, "NO_READY_IN_DECK"), { deck: deck.name, total: deck.total }) : "";
    row.addEventListener("click", () => startDeckReview(hub, deck, refresh));
  });
}

function appendMetrics(rowEl, t, deck, ready) {
  const metrics = rowEl.createEl("div", { attr: { class: "lh-deck-metrics" } });
  const readyBox = metrics.createEl("div", { attr: { class: `lh-deck-ready${ready === 0 ? " is-zero" : ""}` } });
  readyBox.createEl("div", { text: c(t, "READY"), attr: { class: "lh-deck-ready-label" } });
  readyBox.createEl("div", { text: String(ready), attr: { class: "lh-deck-ready-num" } });
  const breakdown = metrics.createEl("div", { attr: { class: "lh-deck-breakdown" } });
  [
    { key: "FILTER_DUE", cls: "due", value: deck.due },
    { key: "FILTER_NEW", cls: "new", value: deck.unseen },
    { key: "TOTAL", cls: "total", value: deck.total },
  ].forEach((m) => {
    const g = breakdown.createEl("div", { attr: { class: `lh-deck-metric ${m.cls}` } });
    g.createEl("div", { text: c(t, m.key), attr: { class: "lh-deck-metric-label" } });
    g.createEl("div", { text: String(m.value), attr: { class: "lh-deck-metric-num" } });
  });
}

function renderGridView(content, hub, t, decks, refresh) {
  const grid = content.createEl("div", { attr: { class: "lh-deck-grid" } });
  decks.forEach((deck, o) => {
    const ready = deck.due + deck.unseen;
    const mastered = deck.cards.filter(isCardMastered).length;
    const pct = deck.total > 0 ? Math.round(mastered / deck.total * 100) : 0;
    const gc = grid.createEl("div", { attr: { class: `lh-deck-gc${deck.due > 0 ? " has-due" : ""}${ready === 0 ? " is-emptyready" : ""}` } });
    gc.createEl("div", { attr: { class: "lh-deck-gc-emoji" } }).textContent = DECK_EMOJIS[o % DECK_EMOJIS.length];
    gc.createEl("div", { attr: { class: "lh-deck-gc-name" } }).textContent = deck.name;
    gc.createEl("div", { text: ready > 0 ? c(t, "READY_NOW") : c(t, "NOTHING_READY"), attr: { class: "lh-deck-gc-status" } });
    const r = gc.createEl("div", { attr: { class: "lh-deck-gc-ready" } });
    r.createEl("div", { text: String(ready), attr: { class: "lh-deck-gc-ready-num" } });
    r.createEl("div", { text: c(t, "READY"), attr: { class: "lh-deck-gc-ready-label" } });
    gc.createEl("div", { attr: { class: "lh-deck-gc-bar-bg" } }).createEl("div", { attr: { class: "lh-deck-gc-bar", style: `width:${pct}%` } });
    gc.createEl("div", { attr: { class: "lh-deck-gc-sub" } }).textContent = c(t, "MASTERY_RATE", { percent: pct });
    const metrics = gc.createEl("div", { attr: { class: "lh-deck-gc-metrics" } });
    [
      { key: "FILTER_DUE", cls: "due", value: deck.due },
      { key: "FILTER_NEW", cls: "new", value: deck.unseen },
      { key: "TOTAL", cls: "total", value: deck.total },
    ].forEach((m) => {
      const e = metrics.createEl("div", { attr: { class: `lh-deck-gc-metric ${m.cls}` } });
      e.createEl("div", { text: c(t, m.key), attr: { class: "lh-deck-gc-metric-label" } });
      e.createEl("div", { text: String(m.value), attr: { class: "lh-deck-gc-metric-num" } });
    });
    gc.title = ready === 0 ? K(c(t, "NO_READY_IN_DECK"), { deck: deck.name, total: deck.total }) : "";
    gc.addEventListener("click", () => startDeckReview(hub, deck, refresh));
  });
}

function renderTreeView(content, hub, t, decks, refresh) {
  const container = content.createEl("div", { attr: { class: "lh-tree-container" } });
  // Reuse the hub's generic tree builder/renderer (keyed by deck name) with a quadrant item row.
  const tree = hub._buildTree(decks, (d) => d.name.replace(/^#/, ""));
  let count = 0;
  hub._renderTreeRecursive(container, tree, (parentEl, deck) => {
    const ready = deck.due + deck.unseen;
    const row = parentEl.createEl("div", { attr: { class: `lh-deck-row lh-tree-item-row${ready === 0 ? " is-emptyready" : ""}` } });
    const main = row.createEl("div", { attr: { class: "lh-deck-main" } });
    const nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:8px;" } });
    nameRow.createEl("span", { text: DECK_EMOJIS[count % DECK_EMOJIS.length], attr: { style: "font-size:16px;line-height:1;" } });
    nameRow.createEl("span", { text: deck.name.split("/").pop() });
    main.createEl("div", {
      text: ready > 0 ? `${c(t, "READY_NOW")}: ${ready}` : K(c(t, "ALL_SCHEDULED"), { total: deck.total }),
      attr: { class: "lh-deck-row-sub" },
    });
    appendMetrics(row, t, deck, ready);
    row.title = ready === 0 ? K(c(t, "NO_READY_IN_DECK"), { deck: deck.name, total: deck.total }) : "";
    row.addEventListener("click", () => startDeckReview(hub, deck, refresh));
    count++;
  });
}

module.exports = { renderQuadrantTab };
