// Hints files are named like sr/ files (full path), so same-name notes in different folders keep
// separate hints; files written under the old name-only scheme are still read, and follow renames.
import { describe, it, expect } from "vitest";
import { hintsPath, loadHints } from "../src/review/helpers.js";
import { followCardFilesRename } from "../src/review/rename-follow.js";
import { saveTagSourceCard, deleteDeckCards } from "../src/review/edit.js";

function makeAdapter(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async exists(p) { return p in files; },
    async read(p) { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
    async write(p, c) { files[p] = c; },
    async remove(p) { delete files[p]; },
  };
}
const hints = (note, cards) => JSON.stringify({ note, cards });

describe("hintsPath", () => {
  it("names a note's hints by its full path", () => {
    expect(hintsPath("A/筆記.md")).toBe("engram-review/hints/A__筆記.json");
    expect(hintsPath("B/筆記.md")).toBe("engram-review/hints/B__筆記.json");
    expect(hintsPath("筆記.md")).toBe("engram-review/hints/筆記.json");
  });

  it("names an AI card file's hints by the card file's own name", () => {
    expect(hintsPath("engram-review/ai-cards/A__筆記.md")).toBe("engram-review/hints/A__筆記.json");
    expect(hintsPath("engram-review/ai-cards/video-s1-01.md")).toBe("engram-review/hints/video-s1-01.json");
  });
});

describe("loadHints", () => {
  it("keeps two same-name notes apart once each has its own file", async () => {
    const adapter = makeAdapter({
      "engram-review/hints/A__筆記.json": hints("A/筆記.md", { Q: { l1: "from A" } }),
      "engram-review/hints/B__筆記.json": hints("B/筆記.md", { Q: { l1: "from B" } }),
    });
    expect((await loadHints(adapter, "A/筆記.md")).data.cards.Q.l1).toBe("from A");
    expect((await loadHints(adapter, "B/筆記.md")).data.cards.Q.l1).toBe("from B");
  });

  it("falls back to an old name-only file", async () => {
    const adapter = makeAdapter({ "engram-review/hints/筆記.json": hints("A/筆記.md", { Q: { l1: "old" } }) });
    const loaded = await loadHints(adapter, "A/筆記.md");
    expect(loaded.path).toBe("engram-review/hints/筆記.json");
    expect(loaded.data.cards.Q.l1).toBe("old");
  });

  it("does not fall back when the full-path file exists but is corrupt", async () => {
    const adapter = makeAdapter({
      "engram-review/hints/A__筆記.json": "{not json",
      "engram-review/hints/筆記.json": hints("B/筆記.md", { Q: { l1: "someone else's" } }),
    });
    expect(await loadHints(adapter, "A/筆記.md")).toBe(null);
  });
});

describe("saveTagSourceCard hints write", () => {
  it("writes under the full-path name and leaves the old shared file alone", async () => {
    const legacy = hints("A/筆記.md", { "Q": { l1: "old l1", l2: "", l3: "" } });
    const adapter = makeAdapter({ "engram-review/hints/筆記.json": legacy });
    const app = {
      vault: {
        getAbstractFileByPath: (p) => ({ path: p }),
        read: async () => "Q :: A\n",
        modify: async () => {},
        adapter,
      },
    };
    await saveTagSourceCard(app, { front: "Q", back: "A", notePath: "A/筆記.md" }, { front: "Q", back: "A2" });
    expect(JSON.parse(adapter.files["engram-review/hints/A__筆記.json"]).cards.Q.l1).toBe("old l1");
    expect(adapter.files["engram-review/hints/筆記.json"]).toBe(legacy);
  });
});

describe("hints files shared with another note", () => {
  const appFor = (adapter, trashed = []) => ({
    vault: {
      getAbstractFileByPath: (p) => (p in adapter.files ? { path: p } : null),
      read: async () => "Q :: A\n",
      modify: async () => {},
      adapter,
    },
    fileManager: { trashFile: async (f) => { trashed.push(f.path); delete adapter.files[f.path]; } },
  });

  it("deleting a deck removes only its own cards from a shared hints file", async () => {
    const adapter = makeAdapter({
      "engram-review/hints/A__筆記.json": hints("A/筆記.md", { Mine: { l1: "a" }, Theirs: { l1: "b" } }),
    });
    const trashed = [];
    await deleteDeckCards(appFor(adapter, trashed), { cards: [{ front: "Mine", back: "x", notePath: "engram-review/ai-cards/A__筆記.md" }] });
    expect(trashed).not.toContain("engram-review/hints/A__筆記.json");
    expect(Object.keys(JSON.parse(adapter.files["engram-review/hints/A__筆記.json"]).cards)).toEqual(["Theirs"]);
  });

  it("deleting a deck trashes the hints file once nothing is left in it", async () => {
    const adapter = makeAdapter({ "engram-review/hints/A__筆記.json": hints("A/筆記.md", { Mine: { l1: "a" } }) });
    const trashed = [];
    await deleteDeckCards(appFor(adapter, trashed), { cards: [{ front: "Mine", back: "x", notePath: "engram-review/ai-cards/A__筆記.md" }] });
    expect(trashed).toContain("engram-review/hints/A__筆記.json");
  });

  it("editing a card leaves an unreadable hints file alone", async () => {
    const adapter = makeAdapter({ "engram-review/hints/A__筆記.json": "{broken" });
    await saveTagSourceCard(appFor(adapter), { front: "Q", back: "A", notePath: "A/筆記.md" }, { front: "Q", back: "A2", hint_l1: "new" });
    expect(adapter.files["engram-review/hints/A__筆記.json"]).toBe("{broken");
  });
});

describe("followCardFilesRename", () => {
  it("moves full-path hints, the AI card file and its schedule with a moved note", async () => {
    const adapter = makeAdapter({
      "engram-review/hints/A__筆記.json": hints("A/筆記.md", { Q: { l1: "x", source: "A/筆記.md" } }),
      "engram-review/ai-cards/A__筆記.md": "Q :: A\n",
      "engram-review/sr/engram-review__ai-cards__A__筆記.json": "{\"Q\":{}}",
    });
    await followCardFilesRename(adapter, "A/筆記.md", "C/筆記.md");
    expect(Object.keys(adapter.files).sort()).toEqual([
      "engram-review/ai-cards/C__筆記.md",
      "engram-review/hints/C__筆記.json",
      "engram-review/sr/engram-review__ai-cards__C__筆記.json",
    ]);
    const moved = JSON.parse(adapter.files["engram-review/hints/C__筆記.json"]);
    expect(moved.note).toBe("C/筆記.md");
    expect(moved.cards.Q.source).toBe("C/筆記.md");
  });

  it("keeps old name-only files on the old scheme, renamed with the note", async () => {
    const adapter = makeAdapter({
      "engram-review/hints/筆記.json": hints("A/筆記.md", {}),
      "engram-review/ai-cards/筆記.md": "Q :: A\n",
    });
    await followCardFilesRename(adapter, "A/筆記.md", "A/新筆記.md");
    expect(Object.keys(adapter.files).sort()).toEqual([
      "engram-review/ai-cards/新筆記.md",
      "engram-review/hints/新筆記.json",
    ]);
    expect(JSON.parse(adapter.files["engram-review/hints/新筆記.json"]).note).toBe("A/新筆記.md");
  });

  it("a folder move rewrites an old name-only file in place", async () => {
    const adapter = makeAdapter({ "engram-review/hints/筆記.json": hints("A/筆記.md", {}) });
    await followCardFilesRename(adapter, "A/筆記.md", "B/筆記.md");
    expect(JSON.parse(adapter.files["engram-review/hints/筆記.json"]).note).toBe("B/筆記.md");
  });
});

describe("deleteDeckCards with files Obsidian has not indexed", () => {
  it("still trashes the AI card file, its schedule and an emptied hints file", async () => {
    const files = {
      "engram-review/ai-cards/A__筆記.md": "Mine :: x\n",
      "engram-review/sr/engram-review__ai-cards__A__筆記.json": "{\"Mine\":{}}",
      "engram-review/hints/A__筆記.json": hints("A/筆記.md", { Mine: { l1: "a" } }),
    };
    const trashedLocal = [];
    const adapter = {
      files,
      async exists(p) { return p in files; },
      async read(p) { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
      async write(p, c) { files[p] = c; },
      async remove(p) { delete files[p]; },
      async trashLocal(p) { trashedLocal.push(p); delete files[p]; },
    };
    const app = {
      vault: { getAbstractFileByPath: () => null, read: async () => "", modify: async () => {}, adapter },
      fileManager: { trashFile: async () => { throw new Error("not indexed"); } },
    };
    await deleteDeckCards(app, { cards: [{ front: "Mine", back: "x", notePath: "engram-review/ai-cards/A__筆記.md" }] });
    expect(Object.keys(files)).toEqual([]);
    expect(trashedLocal.sort()).toEqual([
      "engram-review/ai-cards/A__筆記.md",
      "engram-review/hints/A__筆記.json",
      "engram-review/sr/engram-review__ai-cards__A__筆記.json",
    ]);
  });
});

describe("deleteDeckCards when an AI card file cannot be trashed", () => {
  it("keeps that file's schedule and hints, finishes the other files, and reports the failure", async () => {
    const files = {
      "engram-review/ai-cards/Stuck.md": "S :: x\n",
      "engram-review/sr/engram-review__ai-cards__Stuck.json": "{\"S\":{}}",
      "engram-review/hints/engram-review__ai-cards__Stuck.json": hints("engram-review/ai-cards/Stuck.md", { S: { l1: "a" } }),
      "engram-review/ai-cards/Gone.md": "G :: y\n",
      "engram-review/sr/engram-review__ai-cards__Gone.json": "{\"G\":{}}",
    };
    const adapter = {
      async exists(p) { return p in files; },
      async read(p) { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
      async write(p, c) { files[p] = c; },
      async trashLocal(p) { if (p.includes("ai-cards/Stuck")) throw new Error("locked"); delete files[p]; },
    };
    const app = {
      vault: { getAbstractFileByPath: () => null, read: async () => "", modify: async () => {}, adapter },
      fileManager: { trashFile: async () => {} },
    };
    await expect(deleteDeckCards(app, { cards: [
      { front: "S", back: "x", notePath: "engram-review/ai-cards/Stuck.md" },
      { front: "G", back: "y", notePath: "engram-review/ai-cards/Gone.md" },
    ] })).rejects.toThrow("Stuck.md");
    expect(Object.keys(files).sort()).toEqual([
      "engram-review/ai-cards/Stuck.md",
      "engram-review/hints/engram-review__ai-cards__Stuck.json",
      "engram-review/sr/engram-review__ai-cards__Stuck.json",
    ]);
  });
});
