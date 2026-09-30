// Tests buildSrRecord: the SR record written per rating, including the capped review log.
import { describe, it, expect } from "vitest";
import { buildSrRecord } from "../src/review/helpers.js";

const result = { due: "2026-10-01", interval: 1, stability: 0.4, difficulty: 9, state: 2, repetitions: 4 };

describe("buildSrRecord", () => {
  it("keeps FSRS fields and starts a log for a card without one", () => {
    const rec = buildSrRecord({ due: "2026-09-01", stability: 3 }, result, 1, "2026-09-30");
    expect(rec).toEqual({ ...result, log: [{ d: "2026-09-30", r: 1 }] });
  });

  it("handles a card with no prior SR record", () => {
    expect(buildSrRecord(undefined, result, 3, "2026-09-30").log).toEqual([{ d: "2026-09-30", r: 3 }]);
  });

  it("appends to the existing log and keeps only the latest 20", () => {
    const prev = { log: Array.from({ length: 20 }, (_, i) => ({ d: `d${i}`, r: 3 })) };
    const rec = buildSrRecord(prev, result, 1, "2026-09-30");
    expect(rec.log).toHaveLength(20);
    expect(rec.log[0]).toEqual({ d: "d1", r: 3 });
    expect(rec.log[19]).toEqual({ d: "2026-09-30", r: 1 });
  });

  it("does not carry unrelated fields from the previous record", () => {
    const rec = buildSrRecord({ stability: 5, _migratedFromSM2: true }, result, 2, "2026-09-30");
    expect(rec).not.toHaveProperty("_migratedFromSM2");
  });
});
