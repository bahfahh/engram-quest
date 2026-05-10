// Time-boxed Review — pure card-picking logic.
// "1 card ≈ 1 minute": user picks N minutes → take N cards by priority.
// Priority order: unseen > overdue > due-soon. No AI, no graph.

"use strict";

const { getLocalDateStr } = require("./helpers");

const UNSEEN_BASE = 1000;
const OVERDUE_BASE = 500;

function diffDays(dueStr, today) {
  if (!dueStr) return 0;
  const a = Date.parse(getLocalDateStr(today) + "T00:00:00Z");
  const b = Date.parse(dueStr + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

// Priority policy: unseen > overdue > due-soon > future. New cards float first
// because they have nothing in SR yet; overdue gets +days bonus so the most
// neglected cards win; future cards get negative days so closer-to-due ranks higher.
function computeCardPriority(card, today = new Date()) {
  if (!card || !card.srMeta || !card.srMeta.due) return UNSEEN_BASE;
  const days = diffDays(card.srMeta.due, today);
  if (days >= 0) return OVERDUE_BASE + days;
  return days;
}

// Stable: ties keep input order so deck/card order is preserved when priorities match.
function pickTopN(cards, n, priorityFn) {
  const fn = priorityFn || ((c) => computeCardPriority(c));
  const enriched = cards.map((card, idx) => ({ card, idx, p: fn(card) }));
  enriched.sort((a, b) => b.p - a.p || a.idx - b.idx);
  return enriched.slice(0, Math.max(0, n)).map((e) => e.card);
}

function collectAllCards(decks) {
  const out = [];
  (decks || []).forEach((deck) => {
    if (deck && Array.isArray(deck.cards)) {
      deck.cards.forEach((card) => { if (card) out.push(card); });
    }
  });
  return out;
}

module.exports = {
  UNSEEN_BASE,
  OVERDUE_BASE,
  computeCardPriority,
  pickTopN,
  collectAllCards,
  diffDays,
  getLocalDateStr
};
