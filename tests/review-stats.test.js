// Every rated card is counted into the achievement stats in data.json: totals, the per-day log and
// the day streak. The longest streak is what the streak achievements show and unlock on.
import { describe, it, expect } from "vitest";
import { recordReviewDay } from "../src/review/helpers.js";

const at = (y, m, d) => new Date(y, m - 1, d, 21, 30);

describe("recordReviewDay", () => {
  it("counts the first day of a streak into the longest streak", () => {
    const st = recordReviewDay(undefined, at(2026, 11, 13));
    expect(st.currentStreak).toBe(1);
    expect(st.longestStreak).toBe(1);
    expect(st.lastReviewDate).toBe("2026-11-13");
    expect(st.totalCardsReviewed).toBe(1);
    expect(st.dailyReviewLog).toEqual({ "2026-11-13": 1 });
  });

  it("does not grow the streak for more cards on the same day", () => {
    let st = recordReviewDay({}, at(2026, 11, 13));
    st = recordReviewDay(st, at(2026, 11, 13));
    st = recordReviewDay(st, at(2026, 11, 13));
    expect(st.currentStreak).toBe(1);
    expect(st.longestStreak).toBe(1);
    expect(st.totalCardsReviewed).toBe(3);
    expect(st.dailyReviewLog).toEqual({ "2026-11-13": 3 });
  });

  it("grows both streaks on consecutive days, across a month end", () => {
    let st = recordReviewDay({}, at(2026, 2, 27));
    st = recordReviewDay(st, at(2026, 2, 28));
    st = recordReviewDay(st, at(2026, 3, 1));
    expect(st.currentStreak).toBe(3);
    expect(st.longestStreak).toBe(3);
  });

  it("starts again at one after a missed day and keeps the longest streak", () => {
    let st = recordReviewDay({}, at(2026, 11, 1));
    st = recordReviewDay(st, at(2026, 11, 2));
    st = recordReviewDay(st, at(2026, 11, 5));
    expect(st.currentStreak).toBe(1);
    expect(st.longestStreak).toBe(2);
  });

  it("counts a one-day streak that follows a gap when nothing longer was recorded", () => {
    const st = recordReviewDay({ currentStreak: 1, longestStreak: 0, lastReviewDate: "2026-11-01" }, at(2026, 11, 13));
    expect(st.currentStreak).toBe(1);
    expect(st.longestStreak).toBe(1);
  });

  it("catches up stats an earlier version left at zero on the first day", () => {
    // Written before the first day counted: reviewed today already, longest streak still 0.
    const old = { totalCardsReviewed: 4, dailyReviewLog: { "2026-11-13": 4 }, currentStreak: 1, longestStreak: 0, lastReviewDate: "2026-11-13" };
    const st = recordReviewDay(old, at(2026, 11, 13));
    expect(st.currentStreak).toBe(1);
    expect(st.longestStreak).toBe(1);
  });

  it("continues stats that have no longest streak yet", () => {
    const st = recordReviewDay({ currentStreak: 1, lastReviewDate: "2026-11-12" }, at(2026, 11, 13));
    expect(st.currentStreak).toBe(2);
    expect(st.longestStreak).toBe(2);
  });

  it("leaves the other stats as they are", () => {
    const st = recordReviewDay({ perfectSessions: 2, totalAgainCount: 7, longestStreak: 9 }, at(2026, 11, 13));
    expect(st.perfectSessions).toBe(2);
    expect(st.totalAgainCount).toBe(7);
    expect(st.longestStreak).toBe(9);
  });
});
