import { describe, expect, it } from "vitest";

const { readingParts, deckStats } = require("../src/explainer/render");
const { deckStats: reviewDeckStats } = require("../src/hub/review-tab");
const { questStatus, questCounts, questBarParts, starCount, CTA_LABEL } = require("../src/hub/quest-tab");
const { buildAchievementEvalCtx, periodStats } = require("../src/hub/achievement");

const sum = (parts) => parts.reduce((n, p) => n + p.pct, 0);

describe("deep dive numbers", () => {
  it("keeps completed, read and unread mutually exclusive", () => {
    const pages = [
      { _viewed: true, _completed: true },
      { _viewed: false, _completed: true },
      { _viewed: true, _completed: false },
      { _viewed: false, _completed: false },
    ];
    const parts = readingParts(pages);
    expect(parts.map(p => p.pct)).toEqual([50, 25, 25]);
    expect(sum(parts)).toBe(100);
  });

  it("draws nothing for an empty list", () => {
    expect(sum(readingParts([]))).toBe(0);
  });

  it("only calls a deck done when every page is completed", () => {
    const read = deckStats({ pages: [{ _viewed: true }, { _viewed: true, _completed: true }] });
    expect(read.state).toBe("read");
    expect(read.read + read.completed + read.unread).toBe(read.total);
    expect(deckStats({ pages: [{ _viewed: true, _completed: true }] }).state).toBe("done");
    expect(deckStats({ pages: [{ _viewed: false }] }).state).toBe("todo");
  });
});

describe("review deck numbers", () => {
  const mastered = { stability: 40, due: new Date(Date.now() + 864e5 * 30).toISOString(), last_review: new Date().toISOString() };

  it("draws mastered, due and new, leaving learning cards as track", () => {
    const deck = { total: 4, due: 1, unseen: 1, cards: [{ srMeta: mastered }, { srMeta: null }, {}, {}] };
    const stats = reviewDeckStats(deck);
    expect(stats.ready).toBe(2);
    expect(stats.parts.map(p => [p.color, p.pct])).toEqual([["mst", 25], ["due", 25], ["new", 25]]);
    expect(stats.masteryPct).toBe(25);
  });

  it("reports zero mastery for an empty deck", () => {
    expect(reviewDeckStats({ total: 0, due: 0, unseen: 0, cards: [] }).masteryPct).toBe(0);
  });
});

describe("quest numbers", () => {
  const quests = [
    { completed: true, bossReady: false, progressPct: 100 },
    { completed: false, bossReady: true, progressPct: 80 },
    { completed: false, bossReady: false, progressPct: 40 },
    { completed: false, bossReady: false, progressPct: 0 },
  ];

  it("keeps the header counts on their original overlapping definitions", () => {
    expect(questCounts(quests)).toEqual({ total: 4, inProgress: 2, bossReady: 1, cleared: 1 });
  });

  it("gives each quest one status so the bar stays within 100%", () => {
    expect(quests.map(questStatus)).toEqual(["cleared", "boss", "progress", "idle"]);
    expect(questBarParts(quests).map(p => p.pct)).toEqual([25, 25, 25]);
    const allBoss = [{ completed: false, bossReady: true, progressPct: 50 }];
    expect(sum(questBarParts(allBoss))).toBe(100);
  });

  it("maps every status to its button label", () => {
    expect(quests.map(q => CTA_LABEL[questStatus(q)])).toEqual(["QUEST_REVIEW_CLEAR", "QUEST_CHALLENGE_BOSS", "QUEST_CONTINUE_MISSION", "OPEN_QUEST"]);
  });

  it("rates stars from the best score, then progress", () => {
    expect([{ bestScorePct: 95 }, { bestScorePct: 60 }, { bestScorePct: 10 }, { progressPct: 0 }, {}].map(starCount)).toEqual([3, 2, 1, 0, 0]);
  });
});

describe("achievement numbers", () => {
  it("counts each card in exactly one familiarity state", () => {
    const now = new Date().toISOString();
    const deck = { cards: [
      { srMeta: null },
      { srMeta: { stability: 40, due: new Date(Date.now() + 864e5 * 30).toISOString(), last_review: now } },
    ] };
    const { counts } = buildAchievementEvalCtx({}, [deck], [], [], []);
    expect(counts.total).toBe(2);
    expect(counts.mastered + counts.learning + counts.due + counts.unseen).toBe(2);
  });

  it("averages only over the days actually studied", () => {
    const today = new Date(2026, 10, 10);
    const stats = periodStats({ "2026-11-10": 30, "2026-11-08": 10, "2026-10-01": 99 }, 7, today);
    expect(stats.dates).toHaveLength(7);
    expect(stats.dates[6]).toBe("2026-11-10");
    expect(stats.total).toBe(40);
    expect(stats.studyDays).toBe(2);
    expect(stats.avgActive).toBe("20.0");
  });

  it("reports zeroes for an empty period", () => {
    expect(periodStats({}, 30, new Date(2026, 10, 10))).toMatchObject({ total: 0, studyDays: 0, avgActive: "0" });
  });
});
