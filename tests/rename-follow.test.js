import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { followNoteRenames, queueNoteRename, replacePaths } from "../src/review/rename-follow.js";

function memoryAdapter(files) {
  const store = { ...files };
  const under = (dir) => Object.keys(store).filter((p) => p.startsWith(dir + "/"));
  const reads = [];
  return {
    store,
    reads,
    exists: async (p) => p in store || under(p).length > 0,
    read: async (p) => { reads.push(p); if (!(p in store)) throw new Error("missing " + p); return store[p]; },
    write: async (p, text) => { store[p] = text; },
    remove: async (p) => { delete store[p]; },
    list: async (dir) => {
      const rest = under(dir).map((p) => p.slice(dir.length + 1));
      return {
        files: rest.filter((r) => !r.includes("/")).map((r) => `${dir}/${r}`),
        folders: [...new Set(rest.filter((r) => r.includes("/")).map((r) => `${dir}/${r.split("/")[0]}`))],
      };
    },
  };
}

const json = (v) => JSON.stringify(v);
const OLD = "Study/Old Name.md";
const NEW = "Archive/New Name.md";
const one = (from, to) => new Map([[from, to]]);

describe("followNoteRenames", () => {
  it("keeps a rejected anchor hidden after the mastered card's note is renamed", async () => {
    const a = memoryAdapter({
      "engram-review/synapse/Other.json": json({ cards: { q: { anchors: [{ notePath: OLD, front: "F" }], userRejected: [OLD + "|F"] } } }),
    });
    await followNoteRenames(a, one(OLD, NEW));
    const q = JSON.parse(a.store["engram-review/synapse/Other.json"]).cards.q;
    expect(q.anchors[0].notePath).toBe(NEW);
    expect(q.userRejected).toEqual([NEW + "|F"]);
  });

  it("moves the note's anchors file and rewrites paths that cite the note everywhere", async () => {
    const a = memoryAdapter({
      "engram-review/synapse/Study__Old Name.json": json({ _meta: { sourceNotePath: OLD }, cards: {} }),
      "engram-review/synapse/Other.json": json({ cards: { q: { anchors: [{ notePath: OLD }, { notePath: "Keep.md" }] } } }),
      "engram-quest/explainer/meta/p1.json": json({ sourceCard: { note: OLD, front: "Q" } }),
      "engram-quest/explainer/queue.json": json({ entries: [{ source: OLD }, { source: "Keep.md" }] }),
      "engram-quest/videos/topic-a/meta.json": json({ sources: [OLD], request: { refs: [OLD, "Keep.md"] } }),
      "engram-quest/videos/topic-b/meta.json": json({ sources: ["Keep.md"] }),
    });
    const untouched = a.store["engram-quest/videos/topic-b/meta.json"];

    await followNoteRenames(a, one(OLD, NEW));

    expect(a.store["engram-review/synapse/Study__Old Name.json"]).toBeUndefined();
    expect(JSON.parse(a.store["engram-review/synapse/Archive__New Name.json"])._meta.sourceNotePath).toBe(NEW);
    expect(JSON.parse(a.store["engram-review/synapse/Other.json"]).cards.q.anchors.map((x) => x.notePath)).toEqual([NEW, "Keep.md"]);
    expect(JSON.parse(a.store["engram-quest/explainer/meta/p1.json"]).sourceCard).toEqual({ note: NEW, front: "Q" });
    expect(JSON.parse(a.store["engram-quest/explainer/queue.json"]).entries.map((x) => x.source)).toEqual([NEW, "Keep.md"]);
    expect(JSON.parse(a.store["engram-quest/videos/topic-a/meta.json"])).toEqual({ sources: [NEW], request: { refs: [NEW, "Keep.md"] } });
    expect(a.store["engram-quest/videos/topic-b/meta.json"]).toBe(untouched);
  });

  it("keeps a synapse relation to a renamed note, and a rejected one, pointing at the note", async () => {
    const entry = {
      anchors: [{ front: "A", notePath: OLD, stability: 9, score: 9, reason: "r" }],
      relations: [
        { type: "note", ref: OLD, score: 8, reason: "同一個做法" },
        { type: "note", ref: "Keep.md", score: 7, reason: "r" },
        { type: "lesson", ref: "course/lsn-1", score: 7, reason: "r" },
      ],
      userRejected: [`note|${OLD}`, "note|Keep.md", "lesson|course/lsn-1"],
    };
    const a = memoryAdapter({ "engram-review/synapse/Other.json": json({ cards: { q: entry } }) });

    await followNoteRenames(a, one(OLD, NEW));

    const after = JSON.parse(a.store["engram-review/synapse/Other.json"]).cards.q;
    expect(after.relations).toEqual([
      { type: "note", ref: NEW, score: 8, reason: "同一個做法" },
      { type: "note", ref: "Keep.md", score: 7, reason: "r" },
      { type: "lesson", ref: "course/lsn-1", score: 7, reason: "r" },
    ]);
    expect(after.userRejected).toEqual([`note|${NEW}`, "note|Keep.md", "lesson|course/lsn-1"]);
    expect(after.anchors[0].notePath).toBe(NEW);
  });

  it("never overwrites an anchors file that already exists under the new name", async () => {
    const a = memoryAdapter({
      "engram-review/synapse/Study__Old Name.json": json({ _meta: { sourceNotePath: OLD } }),
      "engram-review/synapse/Archive__New Name.json": json({ _meta: { sourceNotePath: NEW }, mine: true }),
    });
    await followNoteRenames(a, one(OLD, NEW));
    expect(JSON.parse(a.store["engram-review/synapse/Archive__New Name.json"]).mine).toBe(true);
  });

  it("does nothing when no data exists", async () => {
    const a = memoryAdapter({});
    await followNoteRenames(a, one(OLD, NEW));
    expect(a.store).toEqual({});
  });
});

describe("queueNoteRename", () => {
  beforeAll(() => { vi.useFakeTimers(); globalThis.window = globalThis; });
  afterAll(() => { vi.useRealTimers(); delete globalThis.window; });

  it("applies a folder move as one batch: every note updated, each shared file read once", async () => {
    const a = memoryAdapter({
      "engram-quest/explainer/queue.json": json({ entries: [{ source: "F/a.md" }, { source: "F/b.md" }] }),
    });
    queueNoteRename(a, "F/a.md", "G/a.md");
    queueNoteRename(a, "F/b.md", "G/b.md");
    await vi.runAllTimersAsync();

    expect(JSON.parse(a.store["engram-quest/explainer/queue.json"]).entries.map((x) => x.source)).toEqual(["G/a.md", "G/b.md"]);
    expect(a.reads.filter((p) => p === "engram-quest/explainer/queue.json")).toHaveLength(1);
  });

  it("follows a chain of renames inside one batch to the final name", async () => {
    const a = memoryAdapter({ "engram-quest/explainer/queue.json": json({ entries: [{ source: "A.md" }] }) });
    queueNoteRename(a, "A.md", "B.md");
    queueNoteRename(a, "B.md", "C.md");
    await vi.runAllTimersAsync();
    expect(JSON.parse(a.store["engram-quest/explainer/queue.json"]).entries[0].source).toBe("C.md");
  });
});

describe("replacePaths", () => {
  it("follows a rejected mastered-card anchor key (<path>|<front>) inside userRejected", () => {
    const doc = { cards: { q: { userRejected: [OLD + "|What is idempotency?", OLD + "|a | b", "note|" + OLD, "lesson|" + OLD, "Keep.md|Front"] } } };
    expect(replacePaths(doc, one(OLD, NEW)).value.cards.q.userRejected).toEqual([
      NEW + "|What is idempotency?", NEW + "|a | b", "note|" + NEW, "lesson|" + OLD, "Keep.md|Front",
    ]);
  });

  it("leaves a string that only starts with a path alone outside userRejected", () => {
    const doc = { cards: { q: { anchors: [{ front: OLD + "|x", notePath: OLD }] } } };
    expect(replacePaths(doc, one(OLD, NEW)).value.cards.q.anchors).toEqual([{ front: OLD + "|x", notePath: NEW }]);
  });

  it("replaces exact matches only, not substrings", () => {
    expect(replacePaths({ a: OLD, b: OLD + " copy", c: [OLD] }, one(OLD, NEW)).value).toEqual({ a: NEW, b: OLD + " copy", c: [NEW] });
  });
});
