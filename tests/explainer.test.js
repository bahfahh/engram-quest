// Explainer data layer tests: meta scan / deck grouping / mark-queue / delete. The explainer has
// no FSRS of its own, so unlike the old quadrant tests there is no rating/schedule surface.
import { describe, it, expect } from "vitest";
import {
  scanExplainers,
  groupExplainersByDeck,
  readQueue,
  addToQueue,
  isQueued,
  deleteExplainer,
  readState,
  markViewed,
  toggleStateFlag,
  META_DIR,
  EXPLAINER_DIR,
  QUEUE_PATH,
  STATE_PATH,
} from "../src/explainer/data.js";
import { deckState, deckStats } from "../src/explainer/render.js";

// In-memory vault adapter mimicking the Obsidian adapter surface the data layer uses.
function makeAdapter(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async exists(p) { return Object.prototype.hasOwnProperty.call(files, p); },
    async read(p) {
      if (!(p in files)) throw new Error("ENOENT " + p);
      return files[p];
    },
    async write(p, content) { files[p] = content; },
    async mkdir() {},
    // remove() only — exercises the trash fallback chain's last step.
    async remove(p) { delete files[p]; },
    async list(dir) {
      const prefix = dir.replace(/\/$/, "") + "/";
      return {
        files: Object.keys(files).filter((k) => k.startsWith(prefix)),
        folders: [],
      };
    },
  };
}

function metaFile(id, body) {
  return [`${META_DIR}/${id}.json`, JSON.stringify({ id, ...body })];
}

describe("explainer scanExplainers", () => {
  it("returns empty result when the meta folder does not exist", async () => {
    const adapter = makeAdapter();
    adapter.list = async () => { throw new Error("no folder"); };
    const scan = await scanExplainers(adapter);
    expect(scan.total).toBe(0);
    expect(scan.pages).toEqual([]);
  });

  it("scans meta jsons, skips invalid ones, sorts newest-first", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      metaFile("old-1", { title: "Old", created: "2026-01-01", deck: "a" }),
      metaFile("new-1", { title: "New", created: "2026-07-31", deck: "a" }),
      [`${META_DIR}/broken.json`, "{not json"],
      [`${META_DIR}/no-id.json`, JSON.stringify({ title: "no id" })],
    ]));
    const scan = await scanExplainers(adapter);
    expect(scan.total).toBe(2);
    expect(scan.pages.map((p) => p.id)).toEqual(["new-1", "old-1"]);
  });
});

describe("explainer groupExplainersByDeck", () => {
  it("groups by deck with a fallback name and sorts groups alphabetically", () => {
    const groups = groupExplainersByDeck([
      { id: "1", deck: "network" },
      { id: "2", deck: "azure" },
      { id: "3" },
      { id: "4", deck: "azure" },
    ]);
    // localeCompare orders case-insensitively: "azure" < "Explainer" < "network"
    expect(groups.map((g) => g.name)).toEqual(["azure", "Explainer", "network"]);
    expect(groups.find((g) => g.name === "azure").pages).toHaveLength(2);
  });
});

describe("explainer queue", () => {
  it("appends a pending entry with the mark metadata", async () => {
    const adapter = makeAdapter();
    const r = await addToQueue(adapter, { source: "Study/Net.md", q: "HTTPS 是什麼？", a: "HTTP over TLS", deck: "network" });
    expect(r.added).toBe(true);
    expect(r.pending).toBe(1);
    const queue = await readQueue(adapter);
    expect(queue.entries).toHaveLength(1);
    const e = queue.entries[0];
    expect(e.status).toBe("pending");
    expect(e.source).toBe("Study/Net.md");
    expect(e.deck).toBe("network");
    expect(e.regenerate).toBe(false);
    expect(e.explainerId).toBeNull();
    expect(e.markedAt).toBeTruthy();
  });

  it("de-duplicates by source + question", async () => {
    const adapter = makeAdapter();
    await addToQueue(adapter, { source: "n.md", q: "Q1", a: "A" });
    const again = await addToQueue(adapter, { source: "n.md", q: "Q1", a: "A different" });
    expect(again.added).toBe(false);
    expect(again.pending).toBe(1);
    const other = await addToQueue(adapter, { source: "n.md", q: "Q2", a: "A" });
    expect(other.added).toBe(true);
    expect(other.pending).toBe(2);
  });

  it("isQueued only matches pending entries", async () => {
    const adapter = makeAdapter();
    await addToQueue(adapter, { source: "n.md", q: "Q1", a: "A" });
    let queue = await readQueue(adapter);
    expect(isQueued(queue, "n.md", "Q1")).toBe(true);
    expect(isQueued(queue, "n.md", "Q2")).toBe(false);
    // Simulate the skill marking the entry done.
    queue.entries[0].status = "done";
    expect(isQueued(queue, "n.md", "Q1")).toBe(false);
  });

  it("tolerates a malformed queue file", async () => {
    const adapter = makeAdapter({ [QUEUE_PATH]: "{oops" });
    const queue = await readQueue(adapter);
    expect(queue.entries).toEqual([]);
  });
});

describe("explainer reading state", () => {
  it("markViewed creates an entry with viewed + lastViewed", async () => {
    const adapter = makeAdapter();
    const entry = await markViewed(adapter, "https-1");
    expect(entry.viewed).toBe(true);
    expect(entry.lastViewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const state = await readState(adapter);
    expect(state["https-1"].viewed).toBe(true);
  });

  it("toggleStateFlag flips starred/completed independently and preserves viewed", async () => {
    const adapter = makeAdapter();
    await markViewed(adapter, "p1");
    expect(await toggleStateFlag(adapter, "p1", "starred")).toBe(true);
    expect(await toggleStateFlag(adapter, "p1", "completed")).toBe(true);
    expect(await toggleStateFlag(adapter, "p1", "starred")).toBe(false);
    const state = await readState(adapter);
    expect(state["p1"]).toMatchObject({ viewed: true, starred: false, completed: true });
  });

  it("rejects unknown flags and tolerates a malformed state file", async () => {
    const adapter = makeAdapter({ [STATE_PATH]: "[not an object]" });
    expect(await toggleStateFlag(adapter, "p1", "deleted")).toBe(false);
    expect(await readState(adapter)).toEqual({});
  });
});

describe("explainer deleteExplainer", () => {
  it("removes meta + html and drops the producing queue entry", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      metaFile("https-1", { title: "詳解", created: "2026-07-31" }),
      [`${EXPLAINER_DIR}/https-1.html`, "<html></html>"],
      [QUEUE_PATH, JSON.stringify({ entries: [
        { status: "done", source: "n.md", q: "Q", explainerId: "https-1" },
        { status: "pending", source: "n.md", q: "Other", explainerId: null },
      ] })],
    ]));
    await markViewed(adapter, "https-1");
    await deleteExplainer(adapter, "https-1");
    expect(adapter.files[`${META_DIR}/https-1.json`]).toBeUndefined();
    expect(adapter.files[`${EXPLAINER_DIR}/https-1.html`]).toBeUndefined();
    const queue = await readQueue(adapter);
    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0].q).toBe("Other");
    expect((await readState(adapter))["https-1"]).toBeUndefined(); // state entry cleaned too
  });

  it("throws when the meta file cannot be removed, leaving the html untouched", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      metaFile("stuck-1", { title: "x" }),
      [`${EXPLAINER_DIR}/stuck-1.html`, "<html></html>"],
    ]));
    adapter.remove = async () => { throw new Error("locked"); };
    await expect(deleteExplainer(adapter, "stuck-1")).rejects.toThrow(/stuck-1/);
    expect(adapter.files[`${EXPLAINER_DIR}/stuck-1.html`]).toBeDefined();
  });

  it("succeeds when the files are already gone", async () => {
    const adapter = makeAdapter();
    await expect(deleteExplainer(adapter, "ghost-1")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// Deck state machine (render layer, but pure): reading a page must never be mistaken for completing
// it — only a manual ✅ puts a deck into "done", the one state allowed to look green.
// ---------------------------------------------------------------------------------------------

describe("deckState / deckStats", () => {
  const deck = (...pages) => ({ pages: pages.map((p, i) => ({ id: `p${i}`, created: "2026-01-0" + (i + 1), ...p })) });
  const page = (viewed, completed = false, starred = false) => ({ _viewed: viewed, _completed: completed, _starred: starred });

  it("is todo while any page is unread, even when others are completed", () => {
    expect(deckState(3, 1, 2)).toBe("todo");
    expect(deckStats(deck(page(false), page(true, true), page(true, true))).state).toBe("todo");
  });

  it("is read when everything is opened but not everything is marked done", () => {
    expect(deckState(3, 0, 0)).toBe("read");
    expect(deckState(3, 0, 2)).toBe("read");
    expect(deckStats(deck(page(true), page(true), page(true, true))).state).toBe("read");
  });

  it("is done only when every page is marked completed", () => {
    expect(deckState(2, 0, 2)).toBe("done");
    expect(deckStats(deck(page(true, true), page(true, true))).state).toBe("done");
  });

  it("splits unread / read / completed so the three counts sum to the total", () => {
    const s = deckStats(deck(page(false), page(true), page(true), page(true, true)));
    expect([s.unread, s.read, s.completed]).toEqual([1, 2, 1]);
    expect(s.unread + s.read + s.completed).toBe(s.total);
  });

  it("reports read rate and completion rate separately", () => {
    const s = deckStats(deck(page(true), page(true), page(true, true), page(true, true)));
    expect(s.readPct).toBe(100);
    expect(s.donePct).toBe(50);
  });

  it("never divides by zero on an empty deck", () => {
    const s = deckStats(deck());
    expect([s.total, s.readPct, s.donePct]).toEqual([0, 0, 0]);
  });
});
