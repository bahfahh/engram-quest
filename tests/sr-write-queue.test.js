// A rating moves straight to the next card and its schedule is written in the background
// (src/review/helpers.js updateSrData). These pin what keeps that safe.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { updateSrData, loadSrData, srWritesSettled } = require("../src/review/helpers.js");

// An adapter whose every call takes a while, like the native bridge on a phone.
function slowAdapter(delay = 5) {
  const files = new Map();
  const log = [];
  const wait = () => new Promise((r) => setTimeout(r, delay));
  return {
    files, log,
    async read(p) { await wait(); log.push(["read", p]); if (!files.has(p)) throw new Error("ENOENT"); return files.get(p); },
    async write(p, d) { await wait(); log.push(["write", p]); files.set(p, d); },
    async mkdir() { await wait(); log.push(["mkdir"]); },
  };
}

describe("background schedule writes", () => {
  it("keeps both of two quick ratings of cards in the same note", async () => {
    const a = slowAdapter();
    const one = updateSrData(a, "deck/note.md", (d) => ({ ...d, Q1: { due: "2026-12-01" } }));
    const two = updateSrData(a, "deck/note.md", (d) => ({ ...d, Q2: { due: "2027-01-01" } }));
    await Promise.all([one, two]);
    const saved = JSON.parse(a.files.get("engram-review/sr/deck__note.json"));
    expect(Object.keys(saved).sort()).toEqual(["Q1", "Q2"]);
  });

  it("makes a read of the file wait for the writes already queued for it", async () => {
    const a = slowAdapter();
    updateSrData(a, "n.md", () => ({ Q: { due: "x" } }));
    expect(await loadSrData(a, "n.md")).toEqual({ Q: { due: "x" } });
  });

  it("returns at once to the caller, before anything is written", () => {
    const a = slowAdapter();
    const pending = updateSrData(a, "m.md", () => ({ Q: 1 }));
    expect(a.log).toEqual([]);
    return pending;
  });

  it("writes nothing when the change has nothing to do", async () => {
    const a = slowAdapter();
    await updateSrData(a, "k.md", () => null);
    expect(a.log.some(([op]) => op === "write")).toBe(false);
  });

  it("goes on with the next write after one fails, and reports the failure to its caller", async () => {
    const a = slowAdapter();
    const bad = updateSrData(a, "f.md", () => { throw new Error("boom"); });
    const good = updateSrData(a, "f.md", () => ({ Q: 2 }));
    await expect(bad).rejects.toThrow("boom");
    await good;
    await srWritesSettled();
    expect(JSON.parse(a.files.get("engram-review/sr/f.json"))).toEqual({ Q: 2 });
  });

  it("makes the sr folder once, not on every rating", async () => {
    const a = slowAdapter(1);
    for (let i = 0; i < 4; i++) await updateSrData(a, `n${i}.md`, () => ({ i }));
    expect(a.log.filter(([op]) => op === "mkdir").length).toBe(1);
  });
});
