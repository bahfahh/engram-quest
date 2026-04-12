"use strict";

function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// FSRS-5 weights
const W = [.4072,1.1829,3.1262,15.4722,7.2102,.5316,1.0651,.0589,1.533,.1544,1.004,1.9813,.0953,.2975,2.2042,.2407,2.9466];

const DECAY  = -.5;
const FACTOR = 19 / 81;

/** Retrievability after `t` days with stability `s` */
function retrievability(t, s) {
  return Math.pow(1 + FACTOR * t / s, DECAY);
}

/** Interval (days) that achieves target retention `r` given stability `s` */
function intervalFromRetention(s, r) {
  const t = s / FACTOR * (Math.pow(r, 1 / DECAY) - 1);
  return Math.max(1, Math.round(t));
}

/** Initial stability for rating 1-4 */
function initStability(rating) {
  return Math.max(.1, W[rating - 1]);
}

/** Initial difficulty for rating 1-4 */
function initDifficulty(rating) {
  return Math.min(10, Math.max(1, W[4] - Math.exp(W[5] * (rating - 1)) + 1));
}

/** Clamp difficulty to [1, 10] */
function clampDifficulty(d) {
  return Math.min(10, Math.max(1, d));
}

/** Next difficulty after a review */
function nextDifficulty(d, rating) {
  const target = initDifficulty(4);
  const raw = d - W[6] * (rating - 3);
  return clampDifficulty(W[7] * target + (1 - W[7]) * raw);
}

/** Next stability after a successful review */
function nextStabilityReview(d, s, r, rating) {
  const hard = rating === 2 ? W[15] : 1;
  const easy = rating === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
}

/** Next stability after a lapse (rating = 1) */
function nextStabilityForgot(d, s, r) {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
}

/**
 * Normalize a raw card record into a consistent FSRS card shape.
 * Handles legacy SM-2 migration and missing fields.
 */
function normalizeFsrsCard(card) {
  if (!card) return { state: 0, stability: 1, difficulty: 5, interval: 0, repetitions: 0, elapsedDays: 0 };
  if (card._migratedFromSM2) return { state: card.state, stability: card.stability, difficulty: card.difficulty, interval: card.interval, repetitions: card.repetitions, elapsedDays: card.interval };
  return { ...card, elapsedDays: card.interval };
}

/**
 * Compute the next FSRS card state after a review.
 * @param {1|2|3|4} rating  - Again=1, Hard=2, Good=3, Easy=4
 * @param {object|null} card - current card state (null = new card)
 * @param {object} settings  - { requestedRetention?, maxInterval? }
 * @returns {{ due, interval, stability, difficulty, state, repetitions }}
 */
function computeFsrs(rating, card, settings) {
  const retention   = settings?.requestedRetention ?? .9;
  const maxInterval = settings?.maxInterval ?? 36500;
  const c = normalizeFsrsCard(card);
  const reps = (c.repetitions || 0) + 1;

  let state, stability, difficulty, interval;

  if (c.state === 0) {
    // New card
    stability  = initStability(rating);
    difficulty = initDifficulty(rating);
    state      = 2;
    interval   = rating === 4 ? Math.min(4, maxInterval) : 1;
  } else if (c.state === 1) {
    // Learning
    stability  = initStability(rating);
    difficulty = c.difficulty;
    state      = 2;
    interval   = Math.min(intervalFromRetention(stability, retention), maxInterval);
  } else if (c.state === 2) {
    // Review
    const r = retrievability(c.elapsedDays || c.interval || 1, c.stability);
    if (rating === 1) {
      state      = 3;
      stability  = Math.max(.1, nextStabilityForgot(c.difficulty, c.stability, r));
      difficulty = nextDifficulty(c.difficulty, rating);
      interval   = 1;
    } else {
      state      = 2;
      stability  = Math.max(.1, nextStabilityReview(c.difficulty, c.stability, r, rating));
      difficulty = nextDifficulty(c.difficulty, rating);
      interval   = Math.min(intervalFromRetention(stability, retention), maxInterval);
    }
  } else {
    // Relearning (state 3)
    const r = retrievability(c.elapsedDays || 1, c.stability);
    stability  = Math.max(.1, nextStabilityForgot(c.difficulty, c.stability, r));
    difficulty = c.difficulty;
    state      = 2;
    interval   = Math.min(intervalFromRetention(stability, retention), maxInterval);
  }

  stability  = Math.round(Math.max(.1, stability)  * 1000) / 1000;
  difficulty = Math.round(clampDifficulty(difficulty) * 1000) / 1000;
  interval   = Math.max(1, Math.round(interval));

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return { due: getLocalDateStr(due), interval, stability, difficulty, state, repetitions: reps };
}

module.exports = { W, DECAY, FACTOR, retrievability, intervalFromRetention, initStability, initDifficulty, clampDifficulty, nextDifficulty, nextStabilityReview, nextStabilityForgot, normalizeFsrsCard, computeFsrs };
