// Time-boxed Review — pure card-picking logic.
// "1 card ≈ 1 minute": user picks N minutes → take N cards by priority.
// Priority decides which cards are eligible (unseen > overdue > due-soon); topic closeness
// decides which of those make the session and in what order, so related cards stay together.
// No AI, no file access: deck names and note links are passed in by the caller.

"use strict";

const { getLocalDateStr, getReviewStatus, AI_CARDS_DIR } = require("./helpers");

const UNSEEN_BASE = 1000;
const OVERDUE_BASE = 500;
// Every card that is reviewable now (unseen or due) is a candidate: the session always starts
// from the most urgent card, and all due cards are due, so taking a less overdue card of the
// same topic first costs nothing. Not-yet-due cards only fill a short session, so only the
// POOL_FACTOR × N nearest to their due date are considered.
const POOL_FACTOR = 3;
// Deck paths count as related only when they share at least this many segments: a lone root
// such as the flashcard tag prefix or a top-level vault folder is shared by unrelated topics.
const MIN_SHARED_SEGMENTS = 2;

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
// "Unseen" is the same test the normal review uses (getReviewStatus).
function computeCardPriority(card, today = new Date()) {
  if (!card || getReviewStatus(card.srMeta) === "unseen" || !card.srMeta.due) return UNSEEN_BASE;
  const days = diffDays(card.srMeta.due, today);
  if (days >= 0) return OVERDUE_BASE + days;
  return days;
}

function tierOf(priority) {
  if (priority >= UNSEEN_BASE) return 0;
  if (priority >= OVERDUE_BASE) return 1;
  return 2;
}

// What a card is about: the notes it comes from and a slash path to compare by prefix.
// Untagged AI cards all land in the AI_CARDS_DIR folder deck, which says nothing about
// their topic, so they use the folder of the note they were made from instead.
function cardTopic(card, deckName) {
  const notes = [card.notePath, ...(card.sourceNotePaths || [])].filter(Boolean);
  let path = deckName || "";
  if (path === AI_CARDS_DIR) {
    const src = card.primarySourceNotePath || "";
    const folder = src.includes("/") ? src.slice(0, src.lastIndexOf("/")) : "";
    path = folder === AI_CARDS_DIR ? "" : folder;
  }
  return { notes, path, segs: path.split("/").filter(Boolean) };
}

function notesLinked(a, b, links) {
  if (!links) return false;
  return a.notes.some((x) => b.notes.some((y) => (links[x] && links[x][y]) || (links[y] && links[y][x])));
}

// Smaller = closer: 0 same note, 1 same deck, 2–2.5 shared deck path (longer = closer),
// 3 notes link to each other, 4 unrelated. A one-segment deck (the bare tag root, a top-level
// folder) is a catch-all, not a topic, so sharing it does not count.
function topicDistance(a, b, links) {
  if (a.notes.some((n) => b.notes.includes(n))) return 0;
  if (a.path === b.path && a.segs.length >= MIN_SHARED_SEGMENTS) return 1;
  let shared = 0;
  while (shared < a.segs.length && shared < b.segs.length && a.segs[shared] === b.segs[shared]) shared++;
  if (shared >= MIN_SHARED_SEGMENTS) return 2 + 1 / shared;
  if (notesLinked(a, b, links)) return 3;
  return 4;
}

// `ranked` is in priority order. Tiers are taken strictly in order (a new card is never
// displaced by a due one); inside a tier the next card is the one closest to any card
// already chosen, ties going to the higher priority. The pick order is the play order.
function pickCoherent(ranked, n, deckOf, links) {
  let rest = ranked.map((e) => ({ ...e, tier: tierOf(e.p), topic: cardTopic(e.card, deckOf && deckOf.get(e.card)), d: Infinity }));
  const picked = [];
  while (picked.length < n && rest.length) {
    let best = rest[0];
    for (const e of rest) {
      if (e.tier !== best.tier) break;
      if (e.d < best.d) best = e;
    }
    picked.push(best.card);
    rest = rest.filter((e) => e !== best);
    rest.forEach((e) => { e.d = Math.min(e.d, topicDistance(e.topic, best.topic, links)); });
  }
  return picked;
}

// Stable: ties keep input order so deck/card order is preserved when priorities match.
// With `topics` ({ deckOf: Map<card, deckName>, links: resolvedLinks }) related cards are grouped.
function pickTopN(cards, n, priorityFn, topics) {
  const fn = priorityFn || ((c) => computeCardPriority(c));
  const enriched = cards.map((card, idx) => ({ card, idx, p: fn(card) }));
  enriched.sort((a, b) => b.p - a.p || a.idx - b.idx);
  const count = Math.max(0, n);
  if (!topics) return enriched.slice(0, count).map((e) => e.card);
  const pool = enriched.filter((e, i) => i < count * POOL_FACTOR || e.p >= OVERDUE_BASE);
  return pickCoherent(pool, count, topics.deckOf, topics.links);
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

// The time-boxed session for `minutes`: one card per minute, related cards together.
// `links` is Obsidian's metadataCache.resolvedLinks (optional).
function pickTimeboxCards(decks, minutes, { today = new Date(), links = null } = {}) {
  const deckOf = new Map();
  (decks || []).forEach((deck) => {
    if (deck && Array.isArray(deck.cards)) deck.cards.forEach((card) => { if (card) deckOf.set(card, deck.name); });
  });
  return pickTopN(collectAllCards(decks), minutes, (card) => computeCardPriority(card, today), { deckOf, links });
}

module.exports = {
  UNSEEN_BASE,
  OVERDUE_BASE,
  POOL_FACTOR,
  computeCardPriority,
  cardTopic,
  topicDistance,
  pickTopN,
  pickTimeboxCards,
  collectAllCards,
  diffDays,
  getLocalDateStr
};
