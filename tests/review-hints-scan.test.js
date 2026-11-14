// The Hub scan lists engram-review/hints/ once; a deck note without a hints file must not cost
// per-note read attempts, and hints named under either scheme are still found.
import { describe, it, expect, vi } from "vitest";
import { scanReviewDecks } from "../src/review/decks.js";
import * as reviewHelpers from "../src/review/helpers.js";

function setup(vaultFiles, hintFiles) {
  const files = { ...hintFiles };
  const reads = [];
  const adapter = {
    list: vi.fn(async (dir) => {
      if (dir !== "engram-review/hints") throw new Error("ENOENT " + dir);
      return { files: Object.keys(files).filter((p) => p.startsWith(dir + "/")), folders: [] };
    }),
    exists: vi.fn(async () => true),
    read: vi.fn(async (p) => { reads.push(p); if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; }),
  };
  const notes = vaultFiles.map((path) => ({ path, name: path.split("/").pop(), parent: { path: path.split("/").slice(0, -1).join("/") } }));
  const app = {
    vault: { getMarkdownFiles: () => notes, read: async () => "#flashcards\n\nQ :: A\n", adapter },
    metadataCache: { getFileCache: () => ({ tags: [{ tag: "#flashcards" }] }) },
  };
  return { app, adapter, reads };
}
const hintsOf = (note) => JSON.stringify({ note, cards: { Q: { l1: "hint" } } });
const settings = { enableSRScan: false, flashcardTags: "flashcards" };
const hintReads = (reads) => reads.filter((p) => p.startsWith("engram-review/hints/"));

describe("scanReviewDecks hints lookup", () => {
  it("makes no hints read for deck notes that have no hints file", async () => {
    const { app, adapter, reads } = setup(["A/one.md", "B/two.md", "C/three.md"], {});
    const decks = await scanReviewDecks(app, settings, reviewHelpers);
    expect(decks[0].total).toBe(3);
    expect(hintReads(reads)).toEqual([]);
    expect(adapter.list).toHaveBeenCalledTimes(1);
  });

  it("reads only the hints file that exists, under the full-path name or the legacy name", async () => {
    const { app, reads } = setup(["A/one.md", "B/two.md"], {
      "engram-review/hints/A__one.json": hintsOf("A/one.md"),
      "engram-review/hints/two.json": hintsOf("B/two.md"),
    });
    const decks = await scanReviewDecks(app, settings, reviewHelpers);
    expect(decks[0].cards.map((c) => c.hint_l1)).toEqual(["hint", "hint"]);
    expect(hintReads(reads).sort()).toEqual(["engram-review/hints/A__one.json", "engram-review/hints/two.json"]);
  });

  it("falls back to probing by read when the folder cannot be listed", async () => {
    const { app, adapter } = setup(["A/one.md"], { "engram-review/hints/A__one.json": hintsOf("A/one.md") });
    adapter.list.mockRejectedValue(new Error("no such folder"));
    const decks = await scanReviewDecks(app, settings, reviewHelpers);
    expect(decks[0].cards[0].hint_l1).toBe("hint");
  });
});

describe("listHintFiles / loadHints on real disks", () => {
  it("finds a hints file whose name differs only in letter case (Windows and macOS read it)", async () => {
    const disk = { "engram-review/hints/study__azure notes.json": JSON.stringify({ note: "Study/Azure Notes.md", cards: {} }) };
    const adapter = {
      list: async () => ({ files: Object.keys(disk), folders: [] }),
      exists: async () => true,
      read: async (p) => { const hit = Object.keys(disk).find((k) => k.toLowerCase() === p.toLowerCase()); if (!hit) throw new Error("ENOENT"); return disk[hit]; },
    };
    const known = await reviewHelpers.listHintFiles(adapter);
    const found = await reviewHelpers.loadHints(adapter, "Study/Azure Notes.md", known);
    expect(found && found.data.note).toBe("Study/Azure Notes.md");
  });

  it("treats a missing hints folder as no hints files instead of probing every note", async () => {
    const adapter = { list: async () => { throw new Error("ENOENT"); }, exists: async () => false, read: vi.fn(async () => { throw new Error("ENOENT"); }) };
    const known = await reviewHelpers.listHintFiles(adapter);
    expect(known && known.size).toBe(0);
    expect(await reviewHelpers.loadHints(adapter, "A/one.md", known)).toBe(null);
    expect(adapter.read).not.toHaveBeenCalled();
  });
});
