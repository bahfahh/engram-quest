// Renaming a note so that only its letter case changes (Foo.md -> foo.md). On Windows and macOS the
// old and new file names of its schedule, hints and AI cards are one file, so "write the new name,
// then remove the old one" deleted the data it had just written (ticket-068).
import { describe, it, expect } from "vitest";
import { followCardFilesRename, replaceFile } from "../src/review/rename-follow.js";

// A disk that ignores case, like NTFS: one entry per lower-cased path, shown under the last name written.
function caseInsensitiveAdapter(initial = {}) {
  const store = new Map();
  for (const [p, c] of Object.entries(initial)) store.set(p.toLowerCase(), { name: p, data: c });
  return {
    get files() { return Object.fromEntries([...store.values()].map((e) => [e.name, e.data])); },
    async exists(p) { return store.has(p.toLowerCase()); },
    async read(p) { const e = store.get(p.toLowerCase()); if (!e) throw new Error("ENOENT " + p); return e.data; },
    async write(p, c) { const e = store.get(p.toLowerCase()); store.set(p.toLowerCase(), { name: e ? e.name : p, data: c }); },
    async remove(p) { store.delete(p.toLowerCase()); },
  };
}

describe("case-only renames on a case-insensitive disk", () => {
  it("replaceFile keeps the data when the names differ only in case, and takes the new name", async () => {
    const adapter = caseInsensitiveAdapter({ "engram-review/sr/Foo.json": "{\"Q\":{}}" });
    await replaceFile(adapter, "engram-review/sr/Foo.json", "engram-review/sr/foo.json", "{\"Q\":{}}");
    expect(adapter.files).toEqual({ "engram-review/sr/foo.json": "{\"Q\":{}}" });
  });

  it("replaceFile still moves between different names", async () => {
    const adapter = caseInsensitiveAdapter({ "a/Old.json": "1" });
    await replaceFile(adapter, "a/Old.json", "a/New.json", "1");
    expect(adapter.files).toEqual({ "a/New.json": "1" });
  });

  it("a note's hints, AI cards and their schedule survive a case-only rename", async () => {
    const adapter = caseInsensitiveAdapter({
      "engram-review/hints/A__Foo.json": JSON.stringify({ note: "A/Foo.md", cards: {} }),
      "engram-review/ai-cards/A__Foo.md": "Q :: A\n",
      "engram-review/sr/engram-review__ai-cards__A__Foo.json": "{\"Q\":{}}",
    });
    await followCardFilesRename(adapter, "A/Foo.md", "A/foo.md");
    expect(Object.keys(adapter.files).sort()).toEqual([
      "engram-review/ai-cards/A__foo.md",
      "engram-review/hints/A__foo.json",
      "engram-review/sr/engram-review__ai-cards__A__foo.json",
    ]);
    expect(JSON.parse(adapter.files["engram-review/hints/A__foo.json"]).note).toBe("A/foo.md");
  });
});
