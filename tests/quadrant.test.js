import { describe, it, expect } from "vitest";
import {
  scoreToRating,
  isCardDue,
  isCardNew,
  isCardMastered,
  groupQuadrantDecks,
  scanQuadrantCards,
  applyQuadrantRating,
  addToUpgradeQueue,
  readUpgradeQueue,
  deleteQuadrantCard,
  updateCardContent,
  enqueueRegenerate,
  SR_DIR,
  QUADRANT_DIR,
  QUEUE_PATH,
} from "../src/quadrant/cards.js";

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
    // Obsidian DataAdapter exposes remove() (permanent) plus trashSystem/trashLocal; the data layer
    // prefers trash and falls back to remove. The mock provides remove only, exercising the fallback.
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

function srFile(cardId, body) {
  return [`${SR_DIR}/${cardId}.json`, JSON.stringify(body)];
}

describe("quadrant scoreToRating", () => {
  it("maps the iframe's three scores to FSRS ratings", () => {
    expect(scoreToRating(100)).toBe(3); // correct → Good
    expect(scoreToRating(60)).toBe(2);  // wrong → Hard
    expect(scoreToRating(25)).toBe(1);  // blank → Again
  });

  it("uses thresholds, not exact equality", () => {
    expect(scoreToRating(85)).toBe(3);
    expect(scoreToRating(84)).toBe(2);
    expect(scoreToRating(40)).toBe(2);
    expect(scoreToRating(39)).toBe(1);
    expect(scoreToRating(0)).toBe(1);
  });
});

describe("quadrant due / new detection", () => {
  it("treats a card with no fsrs as new and due now", () => {
    const card = { cardId: "x" };
    expect(isCardNew(card)).toBe(true);
    expect(isCardDue(card, "2026-05-26")).toBe(true);
  });

  it("compares the fsrs due date against today", () => {
    expect(isCardDue({ fsrs: { due: "2026-05-20" } }, "2026-05-26")).toBe(true);  // overdue
    expect(isCardDue({ fsrs: { due: "2026-05-26" } }, "2026-05-26")).toBe(true);  // today
    expect(isCardDue({ fsrs: { due: "2026-06-01" } }, "2026-05-26")).toBe(false); // future
    expect(isCardNew({ fsrs: { due: "2026-06-01" } })).toBe(false);
  });
});

describe("quadrant scanQuadrantCards", () => {
  it("returns empty counts when the folder is missing", async () => {
    const scan = await scanQuadrantCards(makeAdapter());
    expect(scan).toEqual({ cards: [], due: 0, new: 0, total: 0 });
  });

  it("counts due/new/total and sorts due cards first", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      srFile("a", { cardId: "a", title: "Alpha" }), // new → due
      srFile("b", { cardId: "b", title: "Beta", fsrs: { due: "2026-06-01", state: 2, repetitions: 1 } }), // future
      srFile("c", { cardId: "c", title: "Gamma", fsrs: { due: "2026-05-01", state: 2, repetitions: 2 } }), // overdue
    ]));
    const scan = await scanQuadrantCards(adapter, "2026-05-26");
    expect(scan.total).toBe(3);
    expect(scan.due).toBe(2);  // a (new) + c (overdue)
    expect(scan.new).toBe(1);  // a only
    expect(scan.cards[0]._due).toBe(true);
    expect(scan.cards[scan.cards.length - 1].cardId).toBe("b"); // future card sorts last
  });

  it("skips malformed json files", async () => {
    const adapter = makeAdapter({
      [`${SR_DIR}/broken.json`]: "{ not json",
      ...Object.fromEntries([srFile("ok", { cardId: "ok", title: "OK" })]),
    });
    const scan = await scanQuadrantCards(adapter, "2026-05-26");
    expect(scan.total).toBe(1);
    expect(scan.cards[0].cardId).toBe("ok");
  });
});

describe("quadrant isCardMastered", () => {
  it("only counts reviewed cards whose stability passed ~3 weeks", () => {
    expect(isCardMastered({ cardId: "n" })).toBe(false); // new
    expect(isCardMastered({ fsrs: { state: 2, stability: 30 } })).toBe(true);
    expect(isCardMastered({ fsrs: { state: 2, stability: 10 } })).toBe(false); // not stable enough
    expect(isCardMastered({ fsrs: { state: 3, stability: 30 } })).toBe(false); // relearning
  });
});

describe("quadrant groupQuadrantDecks", () => {
  it("groups by deckOf, computes due/new/total, sorts ready-first", () => {
    const cards = [
      { cardId: "a", deck: "azure" },                                                  // new
      { cardId: "b", deck: "azure", fsrs: { due: "2026-05-01", state: 2 } },           // due
      { cardId: "c", deck: "aws", fsrs: { due: "2026-06-01", state: 2 } },             // future (not ready)
    ];
    const decks = groupQuadrantDecks(cards, (card) => card.deck, "2026-05-26");
    expect(decks.map((d) => d.name)).toEqual(["azure", "aws"]); // azure has 2 ready, sorts first
    const azure = decks.find((d) => d.name === "azure");
    expect(azure.total).toBe(2);
    expect(azure.unseen).toBe(1); // a
    expect(azure.due).toBe(1);    // b
    const aws = decks.find((d) => d.name === "aws");
    expect(aws.due).toBe(0);
    expect(aws.unseen).toBe(0);
  });

  it("falls back to 'Quadrant' when deckOf yields nothing", () => {
    const decks = groupQuadrantDecks([{ cardId: "x" }], () => null, "2026-05-26");
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe("Quadrant");
  });
});

describe("quadrant applyQuadrantRating", () => {
  it("initializes FSRS on a new card and persists it", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      srFile("new1", { cardId: "new1", title: "New", fsrs: null }),
    ]));
    const updated = await applyQuadrantRating(adapter, "new1", 100, {});
    expect(updated.fsrs).toBeTruthy();
    expect(updated.fsrs.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(updated.lastScore).toBe(100);
    // persisted back to the same sr file
    const saved = JSON.parse(adapter.files[`${SR_DIR}/new1.json`]);
    expect(saved.fsrs.state).toBe(2);
  });

  it("a blank (Again) keeps the next interval short", async () => {
    const adapter = makeAdapter(Object.fromEntries([srFile("c", { cardId: "c", fsrs: null })]));
    const again = await applyQuadrantRating(adapter, "c", 25, {});
    expect(again.fsrs.interval).toBe(1);
  });
});

describe("quadrant upgrade queue", () => {
  it("appends a pending entry and de-duplicates by source+question", async () => {
    const adapter = makeAdapter();
    const first = await addToUpgradeQueue(adapter, { source: "Notes/A.md", q: "What is X?", a: "X is Y" });
    expect(first.added).toBe(true);
    expect(first.pending).toBe(1);

    // same source + question → not added again
    const dup = await addToUpgradeQueue(adapter, { source: "Notes/A.md", q: "What is X?", a: "X is Y (edited)" });
    expect(dup.added).toBe(false);
    expect(dup.pending).toBe(1);

    // different question → added
    const second = await addToUpgradeQueue(adapter, { source: "Notes/A.md", q: "What is Z?", a: "Z is W" });
    expect(second.added).toBe(true);
    expect(second.pending).toBe(2);

    const queue = await readUpgradeQueue(adapter);
    expect(queue.entries).toHaveLength(2);
    expect(queue.entries.every((e) => e.status === "pending")).toBe(true);
    expect(adapter.files[QUEUE_PATH]).toBeTruthy();
  });

  it("does not re-add a question already marked done", async () => {
    const adapter = makeAdapter({
      [QUEUE_PATH]: JSON.stringify({
        entries: [{ source: "N.md", q: "done one?", a: "", status: "done", cardId: "n-1" }],
      }),
    });
    // pending count excludes done; a new question is still appended
    const res = await addToUpgradeQueue(adapter, { source: "N.md", q: "fresh?", a: "" });
    expect(res.added).toBe(true);
    expect(res.pending).toBe(1);
  });
});

describe("quadrant updateCardContent", () => {
  it("merges only the given fields and preserves fsrs / source / created", async () => {
    const adapter = makeAdapter(Object.fromEntries([
      srFile("e1", {
        cardId: "e1", title: "Old", source: "Notes/A.md", deck: "azure", recipe: "A",
        q1: "Q1 old", q2: "Q2 old", q3: "Q3 old", q4: "Q4 old",
        created: "2026-05-01", fsrs: { due: "2026-06-01", state: 2, stability: 30 },
      }),
    ]));
    const updated = await updateCardContent(adapter, "e1", { title: "New", q1: "Q1 new" });
    expect(updated.title).toBe("New");
    expect(updated.q1).toBe("Q1 new");
    // untouched fields stay as they were
    expect(updated.q2).toBe("Q2 old");
    expect(updated.source).toBe("Notes/A.md");
    expect(updated.created).toBe("2026-05-01");
    expect(updated.fsrs.stability).toBe(30);
    // persisted to the same sr file
    const saved = JSON.parse(adapter.files[`${SR_DIR}/e1.json`]);
    expect(saved.title).toBe("New");
    expect(saved.fsrs.due).toBe("2026-06-01");
  });

  it("returns null when the card no longer exists", async () => {
    const updated = await updateCardContent(makeAdapter(), "ghost", { title: "X" });
    expect(updated).toBeNull();
  });
});

describe("quadrant enqueueRegenerate", () => {
  it("creates a regenerate:true pending entry keyed by cardId", async () => {
    const adapter = makeAdapter();
    const res = await enqueueRegenerate(adapter, {
      cardId: "card-1", source: "Notes/A.md", title: "T",
      q1: "q1", q2: "q2", q3: "q3", q4: "q4",
    });
    expect(res.added).toBe(true);
    expect(res.pending).toBe(1);
    const queue = await readUpgradeQueue(adapter);
    expect(queue.entries).toHaveLength(1);
    const entry = queue.entries[0];
    expect(entry.regenerate).toBe(true);
    expect(entry.status).toBe("pending");
    expect(entry.cardId).toBe("card-1");
    expect(entry.q1).toBe("q1");
    // q/a mirror q1/q2 so the existing skill plumbing still reads them
    expect(entry.q).toBe("q1");
    expect(entry.a).toBe("q2");
  });

  it("overwrites an existing pending regenerate entry for the same cardId (latest edit wins)", async () => {
    const adapter = makeAdapter();
    await enqueueRegenerate(adapter, { cardId: "card-1", q1: "first" });
    const second = await enqueueRegenerate(adapter, { cardId: "card-1", q1: "second", title: "T2" });
    expect(second.added).toBe(false);   // not stacked
    expect(second.pending).toBe(1);
    const queue = await readUpgradeQueue(adapter);
    expect(queue.entries).toHaveLength(1);
    expect(queue.entries[0].q1).toBe("second");
    expect(queue.entries[0].title).toBe("T2");
  });

  it("does not collide with a different card's pending entry", async () => {
    const adapter = makeAdapter();
    await enqueueRegenerate(adapter, { cardId: "card-1", q1: "a" });
    await enqueueRegenerate(adapter, { cardId: "card-2", q1: "b" });
    const queue = await readUpgradeQueue(adapter);
    expect(queue.entries.map((e) => e.cardId)).toEqual(["card-1", "card-2"]);
  });

  it("ignores a falsy cardId", async () => {
    const res = await enqueueRegenerate(makeAdapter(), { cardId: "", q1: "x" });
    expect(res.added).toBe(false);
  });
});

describe("quadrant deleteQuadrantCard", () => {
  it("removes the card's sr json and html, so the next scan drops it", async () => {
    const adapter = makeAdapter({
      ...Object.fromEntries([
        srFile("keep", { cardId: "keep", title: "Keep" }),
        srFile("gone", { cardId: "gone", title: "Gone" }),
      ]),
      [`${QUADRANT_DIR}/gone.html`]: "<html>gone</html>",
      [`${QUADRANT_DIR}/keep.html`]: "<html>keep</html>",
    });

    await deleteQuadrantCard(adapter, "gone");

    expect(adapter.files[`${SR_DIR}/gone.json`]).toBeUndefined();
    expect(adapter.files[`${QUADRANT_DIR}/gone.html`]).toBeUndefined();
    // the other card is untouched
    expect(adapter.files[`${SR_DIR}/keep.json`]).toBeTruthy();
    expect(adapter.files[`${QUADRANT_DIR}/keep.html`]).toBeTruthy();

    const scan = await scanQuadrantCards(adapter, "2026-05-26");
    expect(scan.total).toBe(1);
    expect(scan.cards[0].cardId).toBe("keep");
  });

  it("drops upgrade-queue entries that produced the deleted card, keeping the rest", async () => {
    const adapter = makeAdapter({
      ...Object.fromEntries([srFile("gone", { cardId: "gone" })]),
      [QUEUE_PATH]: JSON.stringify({
        entries: [
          { source: "A.md", q: "q1", a: "", status: "done", cardId: "gone" },
          { source: "A.md", q: "q2", a: "", status: "done", cardId: "other" },
          { source: "B.md", q: "q3", a: "", status: "pending", cardId: null },
        ],
      }),
    });

    await deleteQuadrantCard(adapter, "gone");

    const queue = await readUpgradeQueue(adapter);
    expect(queue.entries.map((e) => e.cardId)).toEqual(["other", null]);
  });

  it("is a no-op (never throws) when the card files are already absent", async () => {
    const adapter = makeAdapter();
    await expect(deleteQuadrantCard(adapter, "missing")).resolves.toBeUndefined();
    // a falsy cardId is ignored too
    await expect(deleteQuadrantCard(adapter, "")).resolves.toBeUndefined();
  });

  it("prefers trashSystem when the adapter supports it", async () => {
    const trashed = [];
    const adapter = makeAdapter(Object.fromEntries([srFile("t", { cardId: "t" })]));
    adapter.trashSystem = async (p) => { trashed.push(p); delete adapter.files[p]; return true; };
    // make remove throw so a fallback would be detectable
    adapter.remove = async () => { throw new Error("should not reach remove"); };

    await deleteQuadrantCard(adapter, "t");
    expect(trashed).toContain(`${SR_DIR}/t.json`);
    expect(adapter.files[`${SR_DIR}/t.json`]).toBeUndefined();
  });

  it("falls back to trashLocal when trashSystem declines (returns false)", async () => {
    const local = [];
    const adapter = makeAdapter(Object.fromEntries([srFile("t", { cardId: "t" })]));
    adapter.trashSystem = async () => false; // OS trash unavailable
    adapter.trashLocal = async (p) => { local.push(p); delete adapter.files[p]; };
    adapter.remove = async () => { throw new Error("should not reach remove"); };

    await deleteQuadrantCard(adapter, "t");
    expect(local).toContain(`${SR_DIR}/t.json`);
    expect(adapter.files[`${SR_DIR}/t.json`]).toBeUndefined();
  });

  it("throws (and leaves html/queue untouched) when the sr file cannot be trashed", async () => {
    const adapter = makeAdapter({
      ...Object.fromEntries([srFile("stuck", { cardId: "stuck" })]),
      [`${QUADRANT_DIR}/stuck.html`]: "<html>stuck</html>",
      [QUEUE_PATH]: JSON.stringify({ entries: [{ source: "A.md", q: "q", a: "", status: "done", cardId: "stuck" }] }),
    });
    // every removal method fails → trashPath returns false → deleteQuadrantCard throws
    adapter.remove = async () => { throw new Error("disk error"); };

    await expect(deleteQuadrantCard(adapter, "stuck")).rejects.toThrow(/could not delete/);
    // the sr gate failed, so nothing downstream was mutated
    expect(adapter.files[`${SR_DIR}/stuck.json`]).toBeTruthy();
    expect(adapter.files[`${QUADRANT_DIR}/stuck.html`]).toBeTruthy();
    const queue = JSON.parse(adapter.files[QUEUE_PATH]);
    expect(queue.entries).toHaveLength(1);
  });
});
