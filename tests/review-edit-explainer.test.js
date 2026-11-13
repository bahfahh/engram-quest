// A Deep Dive page and a queued request name their card by note + front (ticket-047, item 2). Editing the
// front in the review screen has to take both along, like the schedule, hints and memory anchors.
import { describe, it, expect } from "vitest";
import { saveTagSourceCard } from "../src/review/edit.js";
import { moveExplainerCardLinks } from "../src/explainer/data.js";

const META = "engram-quest/explainer/meta";
const QUEUE = "engram-quest/explainer/queue.json";
const NOTE = "Study/Azure.md";

function makeAdapter(initial = {}) {
  const files = { ...initial };
  const writes = [];
  return {
    files,
    writes,
    async exists(p) { return p in files; },
    async read(p) { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
    async write(p, c) { writes.push(p); files[p] = c; },
    async remove(p) { delete files[p]; },
    async mkdir() {},
    async list(dir) { return { files: Object.keys(files).filter((p) => p.startsWith(dir + "/") && !p.slice(dir.length + 1).includes("/")), folders: [] }; },
  };
}

const page = (id, note, front, extra = {}) => ({ id, title: `Why ${id}`, sourceCard: { note, front }, deck: "Azure", created: "2026-11-01", ...extra });
const json = (v) => JSON.stringify(v, null, 2);

function makeApp(adapter, text) {
  const notes = { text };
  return { notes, vault: { getAbstractFileByPath: (p) => ({ path: p }), read: async () => notes.text, modify: async (_f, t) => { notes.text = t; }, adapter } };
}

describe("moveExplainerCardLinks", () => {
  it("moves the page's sourceCard and every queue entry for the card, and nothing else", async () => {
    const adapter = makeAdapter({
      [`${META}/a.json`]: json(page("a", NOTE, "Old front", { custom: { keep: true } })),
      [`${META}/b.json`]: json(page("b", NOTE, "Another card")),
      [`${META}/c.json`]: json(page("c", "Study/Other.md", "Old front")),
      [QUEUE]: json({ entries: [
        { status: "pending", source: NOTE, q: "Old front", a: "x", explainerId: null },
        { status: "done", source: NOTE, q: "Old front", a: "x", explainerId: "a" },
        { status: "pending", source: NOTE, q: "Another card", a: "y", explainerId: null },
        { status: "pending", source: "Study/Other.md", q: "Old front", a: "z", explainerId: null },
      ] }),
    });

    expect(await moveExplainerCardLinks(adapter, NOTE, "Old front", "New front")).toBe(true);

    expect(JSON.parse(adapter.files[`${META}/a.json`])).toEqual(page("a", NOTE, "New front", { custom: { keep: true } }));
    expect(JSON.parse(adapter.files[`${META}/b.json`]).sourceCard.front).toBe("Another card");
    expect(JSON.parse(adapter.files[`${META}/c.json`]).sourceCard.front).toBe("Old front");
    expect(JSON.parse(adapter.files[QUEUE]).entries.map((e) => [e.source, e.q])).toEqual([
      [NOTE, "New front"], [NOTE, "New front"], [NOTE, "Another card"], ["Study/Other.md", "Old front"],
    ]);
    expect(adapter.writes.sort()).toEqual([`${META}/a.json`, QUEUE]);
  });

  it("writes nothing when no page or request is about the card, or the front did not change", async () => {
    const adapter = makeAdapter({ [`${META}/b.json`]: json(page("b", NOTE, "Another card")), [QUEUE]: json({ entries: [] }) });
    expect(await moveExplainerCardLinks(adapter, NOTE, "Old front", "New front")).toBe(false);
    expect(await moveExplainerCardLinks(adapter, NOTE, "Another card", "Another card")).toBe(false);
    expect(adapter.writes).toEqual([]);
  });

  it("does not create the queue or the meta folder, and leaves unreadable files alone", async () => {
    const empty = makeAdapter();
    expect(await moveExplainerCardLinks(empty, NOTE, "Old front", "New front")).toBe(false);
    expect(Object.keys(empty.files)).toEqual([]);

    const broken = makeAdapter({ [`${META}/x.json`]: "{not json", [QUEUE]: "{not json" });
    expect(await moveExplainerCardLinks(broken, NOTE, "Old front", "New front")).toBe(false);
    expect(broken.files[QUEUE]).toBe("{not json");
    expect(broken.files[`${META}/x.json`]).toBe("{not json");
  });
});

describe("editing a card's front in the review screen", () => {
  it("keeps its Deep Dive page and queued request pointing at the card", async () => {
    const adapter = makeAdapter({
      [`${META}/a.json`]: json(page("a", NOTE, "Old front")),
      [QUEUE]: json({ entries: [{ status: "pending", source: NOTE, q: "Old front", a: "The answer", explainerId: null }] }),
    });
    const app = makeApp(adapter, "Old front :: The answer\n");

    expect(await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: NOTE }, { front: "New front", back: "The answer" })).toBe(true);

    expect(JSON.parse(adapter.files[`${META}/a.json`]).sourceCard).toEqual({ note: NOTE, front: "New front" });
    expect(JSON.parse(adapter.files[QUEUE]).entries[0].q).toBe("New front");
  });

  it("leaves them alone when only the answer changes", async () => {
    const adapter = makeAdapter({ [`${META}/a.json`]: json(page("a", NOTE, "Old front")) });
    const app = makeApp(adapter, "Old front :: The answer\n");
    await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: NOTE }, { front: "Old front", back: "Better" });
    expect(adapter.writes.filter((p) => p.startsWith("engram-quest/"))).toEqual([]);
  });

  it("still saves the card when the page cannot be rewritten", async () => {
    const adapter = makeAdapter({ [`${META}/a.json`]: json(page("a", NOTE, "Old front")) });
    const write = adapter.write.bind(adapter);
    adapter.write = async (p, c) => { if (p.startsWith("engram-quest/")) throw new Error("EIO"); return write(p, c); };
    const app = makeApp(adapter, "Old front :: The answer\n");
    expect(await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: NOTE }, { front: "New front", back: "The answer" })).toBe(true);
    expect(app.notes.text).toBe("New front :: The answer\n");
  });
});
