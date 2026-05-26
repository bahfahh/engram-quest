"use strict";
// Quadrant Card data layer (Pro). Reads/writes the four-quadrant "super memory" cards that
// live under engram-quest/quadrant/. Each card is a single reviewable item with its own FSRS
// schedule (separate from review-deck), rendered as an A4 iframe. Pure of Obsidian UI — every
// function takes a vault adapter so the logic is unit-testable. See
// debug/newissue/A4-feature/DESIGN-quadrant-card.md for the architecture.

const { computeFsrs, getLocalDateStr } = require("../fsrs");

const QUADRANT_DIR = "engram-quest/quadrant";
const SR_DIR = "engram-quest/quadrant/sr";
const QUEUE_PATH = "engram-quest/quadrant/upgrade-queue.json";

// Reuse FSRS's date formatter so the "today" we compare against is byte-identical to the `due`
// dates computeFsrs writes — otherwise due-detection could drift if the two ever diverged.
const todayStr = getLocalDateStr;

/** A card with no FSRS state is brand new (due now); otherwise compare its due date. */
function isCardDue(card, today = todayStr()) {
  if (!card || !card.fsrs) return true;
  return String(card.fsrs.due || "") <= today;
}

function isCardNew(card) {
  // A card is "new" until its first review writes an FSRS state.
  return !card || !card.fsrs;
}

/** Mastered = a reviewed card whose FSRS stability has grown past ~3 weeks (matches review-deck). */
function isCardMastered(card) {
  if (!card || !card.fsrs || card.fsrs.state !== 2) return false;
  const stability = card.fsrs.stability ?? card.fsrs.interval ?? 0;
  return stability >= 21;
}

/**
 * Group flat scanned cards into decks for the Hub tab, mirroring review-deck's deck shape so the
 * same list/grid/tree renderers and CSS apply. `deckOf(card)` returns the deck name (the caller
 * resolves it from card.deck → source-note tag → folder). Returns an array of
 * { name, cards, due, unseen, total } sorted by ready (due+new) desc, matching review-deck order.
 */
function groupQuadrantDecks(cards, deckOf, today = todayStr()) {
  const map = {};
  for (const card of cards) {
    const name = (deckOf ? deckOf(card) : null) || "Quadrant";
    if (!map[name]) map[name] = { name, cards: [], due: 0, unseen: 0, total: 0 };
    const deck = map[name];
    deck.cards.push(card);
    deck.total++;
    if (isCardNew(card)) deck.unseen++;
    else if (isCardDue(card, today)) deck.due++;
  }
  return Object.values(map).sort((a, b) => {
    const ar = a.due + a.unseen;
    const br = b.due + b.unseen;
    return br - ar || b.total - a.total || String(a.name).localeCompare(String(b.name));
  });
}

/** Map a self-assessment score (the iframe posts 100 / 60 / 25) to an FSRS rating. */
function scoreToRating(score) {
  const s = Number(score);
  if (s >= 85) return 3; // correct → Good
  if (s >= 40) return 2; // wrong → Hard
  return 1;              // blank → Again
}

async function readJson(adapter, path) {
  try {
    if (adapter.exists && !(await adapter.exists(path))) return null;
    return JSON.parse(await adapter.read(path));
  } catch {
    return null;
  }
}

async function loadCardSr(adapter, cardId) {
  return readJson(adapter, `${SR_DIR}/${cardId}.json`);
}

async function saveCardSr(adapter, cardId, data) {
  await adapter.mkdir(SR_DIR).catch(() => {});
  await adapter.write(`${SR_DIR}/${cardId}.json`, JSON.stringify(data, null, 2));
}

/**
 * Scan all quadrant cards from engram-quest/quadrant/sr/*.json.
 * Returns { cards, due, new: newCount, total }. `cards` is sorted: due first, then by title.
 */
async function scanQuadrantCards(adapter, today = todayStr()) {
  const result = { cards: [], due: 0, new: 0, total: 0 };
  let listing = null;
  try {
    // list() throws (or returns nothing) when the folder does not exist yet — treat as empty.
    listing = await adapter.list(SR_DIR);
  } catch {
    listing = null;
  }
  if (!listing || !Array.isArray(listing.files)) return result;

  for (const filePath of listing.files) {
    if (!filePath.endsWith(".json")) continue;
    const card = await readJson(adapter, filePath);
    if (!card || !card.cardId) continue;
    const due = isCardDue(card, today);
    const isNew = isCardNew(card);
    result.cards.push({ ...card, _due: due, _new: isNew });
    result.total++;
    if (due) result.due++;
    if (isNew) result.new++;
  }

  result.cards.sort((a, b) => {
    if (a._due !== b._due) return a._due ? -1 : 1;
    return String(a.title || a.cardId).localeCompare(String(b.title || b.cardId));
  });
  return result;
}

/**
 * Apply a review result to a card: map the score to an FSRS rating, advance the schedule with
 * computeFsrs, persist, and return the updated card. The card's own FSRS state is the only thing
 * touched — nothing is written back to any original review-deck flashcard.
 */
async function applyQuadrantRating(adapter, cardId, score, settings = {}) {
  const card = (await loadCardSr(adapter, cardId)) || { cardId };
  const rating = scoreToRating(score);
  const next = computeFsrs(rating, card.fsrs || null, settings);
  card.fsrs = next;
  card.lastReview = todayStr();
  card.lastScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  await saveCardSr(adapter, cardId, card);
  return card;
}

async function readUpgradeQueue(adapter) {
  const data = await readJson(adapter, QUEUE_PATH);
  if (data && Array.isArray(data.entries)) return data;
  return { entries: [] };
}

async function writeUpgradeQueue(adapter, queue) {
  await adapter.mkdir(QUADRANT_DIR).catch(() => {});
  await adapter.write(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

/**
 * Mark a flashcard for upgrade. Appends a pending entry to the upgrade queue, de-duplicated by
 * source+question (an already-pending or already-done card is not added again). This only records
 * intent — the AI Quadrant Card skill reads the queue later and does the actual generation.
 * Returns { added: boolean, pending: number }.
 */
async function addToUpgradeQueue(adapter, { source, q, a }) {
  const queue = await readUpgradeQueue(adapter);
  const exists = queue.entries.some(
    (e) => e.source === source && String(e.q || "") === String(q || "")
  );
  if (!exists) {
    queue.entries.push({
      source: source || null,
      q: q || "",
      a: a || "",
      status: "pending",
      cardId: null,
      markedAt: new Date().toISOString(),
    });
    await writeUpgradeQueue(adapter, queue);
  }
  const pending = queue.entries.filter((e) => e.status === "pending").length;
  return { added: !exists, pending };
}

/** True if a given source+question is already queued (pending) — for UI state. */
function isQueued(queue, source, q) {
  if (!queue || !Array.isArray(queue.entries)) return false;
  return queue.entries.some(
    (e) => e.source === source && String(e.q || "") === String(q || "") && e.status === "pending"
  );
}

module.exports = {
  QUADRANT_DIR,
  SR_DIR,
  QUEUE_PATH,
  todayStr,
  isCardDue,
  isCardNew,
  isCardMastered,
  groupQuadrantDecks,
  scoreToRating,
  loadCardSr,
  saveCardSr,
  scanQuadrantCards,
  applyQuadrantRating,
  readUpgradeQueue,
  writeUpgradeQueue,
  addToUpgradeQueue,
  isQueued,
};
