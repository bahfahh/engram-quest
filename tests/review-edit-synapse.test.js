// A card's memory anchors are stored under its front text, like its schedule and hints. Editing the
// front in the review screen has to take that entry along, or the anchors vanish from the next
// session until the synapse skill runs again.
import { describe, it, expect } from "vitest";
import { saveTagSourceCard } from "../src/review/edit.js";
import { moveSynapseCardEntry, loadSynapseBatch, attachSynapseToCards } from "../src/review/synapse.js";

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
  };
}

const entry = () => ({
  anchors: [{ front: "What is a VNet?", back: "A private network", notePath: "Study/Network.md", stability: 30, score: 9, reason: "Same building block" }],
  relations: [{ type: "note", ref: "Study/Network.md", score: 8, reason: "Explains the term" }],
  userRejected: ["note|Study/Old.md", "Study/Network.md|What is a subnet?"],
});

const synapseDoc = (cards) => JSON.stringify({ _meta: { skillVersion: "2.1", generatedAt: "2026-11-01T00:00:00Z" }, cards }, null, 2);

function makeApp(adapter, noteText) {
  const notes = { text: noteText };
  return {
    notes,
    vault: {
      getAbstractFileByPath: (p) => ({ path: p }),
      read: async () => notes.text,
      modify: async (_file, text) => { notes.text = text; },
      adapter,
    },
  };
}

describe("moveSynapseCardEntry", () => {
  const path = "engram-review/synapse/Study__Azure.json";

  it("moves the entry to the new front and changes nothing else in the file", async () => {
    const before = { "First card": { anchors: [], relations: [], userRejected: [] }, "Old front": entry(), "Last card": { anchors: [] } };
    const adapter = makeAdapter({ [path]: synapseDoc(before) });

    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front");

    const after = JSON.parse(adapter.files[path]);
    expect(after._meta).toEqual({ skillVersion: "2.1", generatedAt: "2026-11-01T00:00:00Z" });
    expect(after.cards["New front"]).toEqual(entry());
    expect(after.cards["Old front"]).toBeUndefined();
    // The other cards are untouched and the moved entry keeps its place.
    expect(Object.keys(after.cards)).toEqual(["First card", "New front", "Last card"]);
    expect(after.cards["First card"]).toEqual(before["First card"]);
    expect(after.cards["Last card"]).toEqual(before["Last card"]);
  });

  it("moves an entry from an older file that has no relations", async () => {
    const old = { anchors: entry().anchors };
    const adapter = makeAdapter({ [path]: JSON.stringify({ cards: { "Old front": old } }) });
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front");
    expect(JSON.parse(adapter.files[path]).cards).toEqual({ "New front": old });
  });

  it("writes nothing when the note has no anchors file", async () => {
    const adapter = makeAdapter();
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front");
    expect(adapter.writes).toEqual([]);
    expect(Object.keys(adapter.files)).toEqual([]);
  });

  it("writes nothing when the file has no entry for the card", async () => {
    const raw = synapseDoc({ "Another card": entry() });
    const adapter = makeAdapter({ [path]: raw });
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front");
    expect(adapter.writes).toEqual([]);
    expect(adapter.files[path]).toBe(raw);
  });

  it("leaves a file it cannot read as it is", async () => {
    const adapter = makeAdapter({ [path]: "{not json" });
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front");
    expect(adapter.writes).toEqual([]);
    expect(adapter.files[path]).toBe("{not json");
  });

  it("writes nothing when the front did not change", async () => {
    const adapter = makeAdapter({ [path]: synapseDoc({ "Old front": entry() }) });
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "Old front");
    expect(adapter.writes).toEqual([]);
  });

  it("leaves both entries alone when the new front already has one", async () => {
    // The entry under the new front may hold links the user rejected; the file is the skill's to sort out.
    const raw = synapseDoc({ "New front": { anchors: [], relations: [], userRejected: ["note|Study/Rejected.md"] }, "Old front": entry() });
    const adapter = makeAdapter({ [path]: raw });
    expect(await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "New front")).toBe(false);
    expect(adapter.writes).toEqual([]);
    expect(adapter.files[path]).toBe(raw);
  });

  it("treats a front as plain text, whatever it says", async () => {
    const adapter = makeAdapter({ [path]: synapseDoc({ "Old front": entry(), "Other card": { anchors: [] } }) });
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "Old front", "__proto__");
    await moveSynapseCardEntry(adapter, "Study/Azure.md", "constructor", "Never there");
    const cards = JSON.parse(adapter.files[path]).cards;
    expect(Object.keys(cards)).toEqual(["__proto__", "Other card"]);
    expect(Object.getOwnPropertyDescriptor(cards, "__proto__").value).toEqual(entry());
    expect(adapter.writes).toHaveLength(1);
  });
});

describe("editing a card's front in the review screen", () => {
  // The three kinds of deck a card can come from; each is found by the path of the file the card is in.
  const decks = [
    { kind: "a card the user wrote in a note", notePath: "Study/Azure.md", synapse: "engram-review/synapse/Study__Azure.json" },
    { kind: "a card the AI made", notePath: "engram-review/ai-cards/Study__Azure.md", synapse: "engram-review/synapse/engram-review__ai-cards__Study__Azure.json" },
    { kind: "a card added with the Hub's + button", notePath: "engram-review/ai-cards/flashcards__azure-manual.md", synapse: "engram-review/synapse/engram-review__ai-cards__flashcards__azure-manual.json" },
  ];

  for (const deck of decks) {
    it(`keeps the memory anchors of ${deck.kind}`, async () => {
      const schedule = deck.synapse.replace("/synapse/", "/sr/");
      const adapter = makeAdapter({
        [deck.synapse]: synapseDoc({ "Old front": entry(), "Other card": { anchors: [], relations: [], userRejected: [] } }),
        [schedule]: JSON.stringify({ "Old front": { due: "2026-12-01", stability: 3 } }),
      });
      const app = makeApp(adapter, "Old front :: The answer\nOther card :: Other answer\n");
      const card = { front: "Old front", back: "The answer", notePath: deck.notePath };

      expect(await saveTagSourceCard(app, card, { front: "New front", back: "The answer" })).toBe(true);
      expect(app.notes.text).toBe("New front :: The answer\nOther card :: Other answer\n");
      // The schedule moves in the same edit, so the card and its anchors stay together.
      expect(JSON.parse(adapter.files[schedule])).toEqual({ "New front": { due: "2026-12-01", stability: 3 } });

      // The next session reads the file again and finds the card by its new front.
      const next = [{ front: "New front", back: "The answer", notePath: deck.notePath }];
      attachSynapseToCards(next, await loadSynapseBatch(adapter, [deck.notePath]));
      expect(next[0].synapseAnchors).toEqual(entry().anchors);
      expect(next[0].synapseRelations).toEqual(entry().relations);
      expect(next[0].synapseRejected).toEqual(entry().userRejected);
    });
  }

  it("moves the anchors when the edit also changes the answer and the hints", async () => {
    const adapter = makeAdapter({ "engram-review/synapse/Study__Azure.json": synapseDoc({ "Old front": entry() }) });
    const app = makeApp(adapter, "Q: Old front\nA: The answer\n");
    const card = { front: "Old front", back: "The answer", notePath: "Study/Azure.md" };
    await saveTagSourceCard(app, card, { front: "New front", back: "A better answer", hint_l1: "a hint", hint_l2: "", hint_l3: "" });
    expect(JSON.parse(adapter.files["engram-review/synapse/Study__Azure.json"]).cards).toEqual({ "New front": entry() });
  });

  it("does not write the anchors file when only the answer changes", async () => {
    const raw = synapseDoc({ "Old front": entry() });
    const adapter = makeAdapter({ "engram-review/synapse/Study__Azure.json": raw });
    const app = makeApp(adapter, "Old front :: The answer\n");
    await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: "Study/Azure.md" }, { front: "Old front", back: "A better answer" });
    expect(adapter.writes.filter((p) => p.startsWith("engram-review/synapse/"))).toEqual([]);
    expect(adapter.files["engram-review/synapse/Study__Azure.json"]).toBe(raw);
  });

  it("does not create an anchors file for a note that has none", async () => {
    const adapter = makeAdapter();
    const app = makeApp(adapter, "Old front :: The answer\n");
    await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: "Study/Azure.md" }, { front: "New front", back: "The answer" });
    expect(Object.keys(adapter.files).filter((p) => p.startsWith("engram-review/synapse/"))).toEqual([]);
  });

  it("leaves the anchors alone when the card is not found in its note", async () => {
    const raw = synapseDoc({ "Old front": entry() });
    const adapter = makeAdapter({ "engram-review/synapse/Study__Azure.json": raw });
    const app = makeApp(adapter, "Something else :: entirely\n");
    expect(await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: "Study/Azure.md" }, { front: "New front", back: "The answer" })).toBe(false);
    expect(adapter.files["engram-review/synapse/Study__Azure.json"]).toBe(raw);
  });

  it("still saves the card when the anchors file cannot be written", async () => {
    const adapter = makeAdapter({ "engram-review/synapse/Study__Azure.json": synapseDoc({ "Old front": entry() }) });
    const write = adapter.write.bind(adapter);
    adapter.write = async (p, c) => { if (p.startsWith("engram-review/synapse/")) throw new Error("EIO"); return write(p, c); };
    const app = makeApp(adapter, "Old front :: The answer\n");
    expect(await saveTagSourceCard(app, { front: "Old front", back: "The answer", notePath: "Study/Azure.md" }, { front: "New front", back: "The answer" })).toBe(true);
    expect(app.notes.text).toBe("New front :: The answer\n");
  });
});
