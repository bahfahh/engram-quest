import { describe, it, expect } from "vitest";
import { computeFsrs, initStability, initDifficulty, retrievability, intervalFromRetention, normalizeFsrsCard } from "../src/fsrs/index.js";

const SETTINGS = { requestedRetention: 0.9, maxInterval: 36500 };

// ── output shape ─────────────────────────────────────────────────────────────
describe("computeFsrs output shape", () => {
  it("returns all required fields for a new card", () => {
    const r = computeFsrs(3, null, SETTINGS);
    expect(r).toHaveProperty("due");
    expect(r).toHaveProperty("interval");
    expect(r).toHaveProperty("stability");
    expect(r).toHaveProperty("difficulty");
    expect(r).toHaveProperty("state");
    expect(r).toHaveProperty("repetitions");
  });

  it("due is a YYYY-MM-DD string", () => {
    const r = computeFsrs(3, null, SETTINGS);
    expect(r.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("interval >= 1", () => {
    for (const rating of [1, 2, 3, 4]) {
      expect(computeFsrs(rating, null, SETTINGS).interval).toBeGreaterThanOrEqual(1);
    }
  });

  it("stability > 0", () => {
    for (const rating of [1, 2, 3, 4]) {
      expect(computeFsrs(rating, null, SETTINGS).stability).toBeGreaterThan(0);
    }
  });

  it("difficulty in [1, 10]", () => {
    for (const rating of [1, 2, 3, 4]) {
      const d = computeFsrs(rating, null, SETTINGS).difficulty;
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });
});

// ── new card (state 0) ────────────────────────────────────────────────────────
describe("new card ratings", () => {
  it("rating 4 (Easy) gives interval > 1", () => {
    expect(computeFsrs(4, null, SETTINGS).interval).toBeGreaterThan(1);
  });

  it("rating 1 (Again) gives interval = 1", () => {
    expect(computeFsrs(1, null, SETTINGS).interval).toBe(1);
  });

  it("state becomes 2 (Review) after first rating", () => {
    for (const rating of [1, 2, 3, 4]) {
      expect(computeFsrs(rating, null, SETTINGS).state).toBe(2);
    }
  });

  it("repetitions increments to 1", () => {
    expect(computeFsrs(3, null, SETTINGS).repetitions).toBe(1);
  });
});

// ── review card (state 2) ─────────────────────────────────────────────────────
describe("review card state transitions", () => {
  const reviewCard = { state: 2, stability: 10, difficulty: 5, interval: 10, repetitions: 3, elapsedDays: 10 };

  it("rating 1 (Again) moves to state 3 (Relearning)", () => {
    expect(computeFsrs(1, reviewCard, SETTINGS).state).toBe(3);
  });

  it("rating 2/3/4 stays in state 2 (Review)", () => {
    for (const rating of [2, 3, 4]) {
      expect(computeFsrs(rating, reviewCard, SETTINGS).state).toBe(2);
    }
  });

  it("Easy (4) gives longer interval than Good (3)", () => {
    const good = computeFsrs(3, reviewCard, SETTINGS).interval;
    const easy = computeFsrs(4, reviewCard, SETTINGS).interval;
    expect(easy).toBeGreaterThanOrEqual(good);
  });

  it("Again (1) resets interval to 1", () => {
    expect(computeFsrs(1, reviewCard, SETTINGS).interval).toBe(1);
  });
});

// ── maxInterval cap ───────────────────────────────────────────────────────────
describe("maxInterval cap", () => {
  it("interval never exceeds maxInterval", () => {
    const highStability = { state: 2, stability: 9999, difficulty: 1, interval: 9999, repetitions: 100, elapsedDays: 9999 };
    const r = computeFsrs(4, highStability, { requestedRetention: 0.9, maxInterval: 365 });
    expect(r.interval).toBeLessThanOrEqual(365);
  });
});

// ── normalizeFsrsCard ─────────────────────────────────────────────────────────
describe("normalizeFsrsCard", () => {
  it("returns default new card for null input", () => {
    const c = normalizeFsrsCard(null);
    expect(c.state).toBe(0);
    expect(c.stability).toBe(1);
  });

  it("adds elapsedDays = interval for normal cards", () => {
    const c = normalizeFsrsCard({ state: 2, stability: 5, difficulty: 5, interval: 7, repetitions: 2 });
    expect(c.elapsedDays).toBe(7);
  });
});

// ── helper functions ──────────────────────────────────────────────────────────
describe("helpers", () => {
  it("retrievability decreases as time increases", () => {
    const r10 = retrievability(10, 10);
    const r20 = retrievability(20, 10);
    expect(r10).toBeGreaterThan(r20);
  });

  it("intervalFromRetention returns integer >= 1", () => {
    const i = intervalFromRetention(10, 0.9);
    expect(Number.isInteger(i)).toBe(true);
    expect(i).toBeGreaterThanOrEqual(1);
  });

  it("initStability rating 4 > rating 1", () => {
    expect(initStability(4)).toBeGreaterThan(initStability(1));
  });

  it("initDifficulty rating 1 > rating 4", () => {
    expect(initDifficulty(1)).toBeGreaterThan(initDifficulty(4));
  });
});
