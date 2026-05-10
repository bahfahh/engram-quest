// Tests for time-boxed card picker (Pro feature).

import { describe, it, expect } from "vitest";
import {
  computeCardPriority,
  pickTopN,
  collectAllCards,
  UNSEEN_BASE,
  OVERDUE_BASE
} from "../src/review/timebox.js";

const today = new Date("2026-05-10T08:00:00");

function unseen(name) { return { front: name, srMeta: null }; }
function withDue(name, due) { return { front: name, srMeta: { due, interval: 1, stability: 5, difficulty: 5, state: 2 } }; }

describe("computeCardPriority", () => {
  it("unseen cards get UNSEEN_BASE (highest tier)", () => {
    expect(computeCardPriority(unseen("Q"), today)).toBe(UNSEEN_BASE);
  });

  it("overdue cards: OVERDUE_BASE + days_overdue", () => {
    expect(computeCardPriority(withDue("Q", "2026-05-08"), today)).toBe(OVERDUE_BASE + 2);
    expect(computeCardPriority(withDue("Q", "2026-05-10"), today)).toBe(OVERDUE_BASE + 0);
  });

  it("future cards: negative, closer to today = higher", () => {
    expect(computeCardPriority(withDue("Q", "2026-05-11"), today)).toBe(-1);
    expect(computeCardPriority(withDue("Q", "2026-05-15"), today)).toBe(-5);
  });

  it("ordering: unseen > overdue > due-today > future", () => {
    const cards = [
      withDue("future", "2026-05-15"),
      withDue("today", "2026-05-10"),
      unseen("new"),
      withDue("overdue", "2026-05-05")
    ];
    const sorted = [...cards].sort((a, b) => computeCardPriority(b, today) - computeCardPriority(a, today));
    expect(sorted.map(c => c.front)).toEqual(["new", "overdue", "today", "future"]);
  });
});

describe("pickTopN", () => {
  const cards = [
    withDue("future-far", "2026-05-15"),
    withDue("today", "2026-05-10"),
    unseen("new-1"),
    withDue("overdue-2d", "2026-05-08"),
    unseen("new-2"),
    withDue("future-near", "2026-05-11")
  ];

  it("picks the n highest-priority cards", () => {
    const top3 = pickTopN(cards, 3).map(c => c.front);
    expect(top3).toContain("new-1");
    expect(top3).toContain("new-2");
    // 3rd slot is overdue (priority 502 > today 500)
    expect(top3).toContain("overdue-2d");
  });

  it("returns ≤ available cards when n > total", () => {
    expect(pickTopN(cards, 100).length).toBe(cards.length);
  });

  it("handles n = 0", () => {
    expect(pickTopN(cards, 0)).toEqual([]);
  });

  it("preserves stable order on ties", () => {
    const first = unseen("first");
    const second = unseen("second");
    const result = pickTopN([first, second], 2, () => 5);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });
});

describe("collectAllCards", () => {
  it("flattens cards across decks, skipping falsy", () => {
    const decks = [
      { name: "A", cards: [unseen("a1"), unseen("a2")] },
      { name: "B", cards: [unseen("b1"), null] },
      null
    ];
    const all = collectAllCards(decks);
    expect(all.map(c => c.front)).toEqual(["a1", "a2", "b1"]);
  });

  it("returns [] for empty input", () => {
    expect(collectAllCards([])).toEqual([]);
    expect(collectAllCards(null)).toEqual([]);
  });
});
