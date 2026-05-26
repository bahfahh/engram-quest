"use strict";
// Hub "Quadrant Card" tab renderer (Pro). Scans engram-quest/quadrant/sr/*.json, shows a
// due/new/total header, lists the cards, and opens the A4 review modal on click. Kept out of the
// fragile hub/modal.js: modal.js only holds a thin _renderQuadrantTab delegate to this function.

const I = require("obsidian");
const { t: c } = require("../i18n");
const { scanQuadrantCards } = require("./cards");
const { QuadrantReviewModal } = require("./review-modal");

const RECIPE_BADGE = { A: "🌀", B: "⚔️", C: "🎯", D: "🗺️" };

async function renderQuadrantTab(el, hub) {
  const t = hub.plugin.settings;
  const adapter = hub.app.vault.adapter;
  el.empty();

  let scan;
  try {
    scan = await scanQuadrantCards(adapter);
  } catch (err) {
    console.error("EngramQuest: quadrant scan failed", err);
    scan = { cards: [], due: 0, new: 0, total: 0 };
  }

  // Stats header (mirrors the Review tab's three-number summary)
  const header = el.createEl("div", { attr: { class: "lh-quadrant-stats" } });
  [
    { label: c(t, "READY"), val: scan.due },
    { label: c(t, "FILTER_NEW"), val: scan.new },
    { label: c(t, "TOTAL"), val: scan.total },
  ].forEach((s) => {
    const g = header.createEl("div", { attr: { class: "lh-quadrant-stat" } });
    g.createEl("span", { text: String(s.val), attr: { class: "lh-quadrant-stat-num" } });
    g.createEl("span", { text: s.label, attr: { class: "lh-quadrant-stat-label" } });
  });

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

  const list = el.createEl("div", { attr: { style: "flex:1;overflow-y:auto;padding:8px 0;" } });
  scan.cards.forEach((card) => {
    const row = list.createEl("div", { attr: { class: "lh-tab-list-item lh-tree-item-row" } });
    const left = row.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;flex:1;min-width:0;" } });
    left.createEl("div", {
      text: RECIPE_BADGE[card.recipe] || "🎴",
      attr: { style: "font-size:22px;flex-shrink:0;" },
    });
    const textCol = left.createEl("div", { attr: { style: "min-width:0;" } });
    textCol.createEl("div", { text: card.title || card.cardId, attr: { class: "lh-tab-list-title" } });
    const sub = card._due
      ? c(t, "QUADRANT_DUE_NOW")
      : (card.fsrs && card.fsrs.due ? c(t, "QUADRANT_NEXT", { date: card.fsrs.due }) : "");
    if (sub) textCol.createEl("div", { text: sub, attr: { class: "lh-tab-list-sub" } });

    const btn = row.createEl("button", {
      text: card._due ? c(t, "QUADRANT_REVIEW_BTN") : c(t, "QUADRANT_PREVIEW_BTN"),
      attr: { class: "lh-mm-open" },
    });
    btn.addEventListener("click", () => {
      new QuadrantReviewModal(hub.app, hub.plugin, card, () => renderQuadrantTab(el, hub)).open();
    });
  });
}

module.exports = { renderQuadrantTab };
