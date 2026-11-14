// Renaming a note so that only its letter case changes (Foo.md -> foo.md). On Windows and macOS the
// old and new file names of its schedule, hints and AI cards are one file, so "write the new name,
// then remove the old one" deleted the data it had just written (ticket-068).
import { describe, it, expect } from "vitest";
import { followCardFilesRename, followNoteRenames, replaceFile } from "../src/review/rename-follow.js";

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

// Obsidian's adapter can rename; a case-insensitive rename keeps one entry and takes the new spelling.
function renamingAdapter(initial = {}, failAt = null) {
  const a = caseInsensitiveAdapter(initial);
  const calls = [];
  a.rename = async (from, to) => {
    calls.push(`${from} -> ${to}`);
    if (failAt && failAt(from, to)) throw new Error("rename failed");
    const data = await a.read(from);
    await a.remove(from);
    await a.write(to, data);
  };
  a.calls = calls;
  return a;
}

describe("replaceFile when a step fails", () => {
  it("renames through a temporary name when the adapter can rename", async () => {
    const adapter = renamingAdapter({ "sr/Foo.json": "1" });
    await replaceFile(adapter, "sr/Foo.json", "sr/foo.json", "1");
    expect(adapter.files).toEqual({ "sr/foo.json": "1" });
    expect(adapter.calls).toEqual(["sr/Foo.json -> sr/foo.json.moving", "sr/foo.json.moving -> sr/foo.json"]);
  });

  it("puts the file back under its old name when the second rename fails", async () => {
    const adapter = renamingAdapter({ "sr/Foo.json": "1" }, (from, to) => to === "sr/foo.json");
    await expect(replaceFile(adapter, "sr/Foo.json", "sr/foo.json", "1")).rejects.toThrow("rename failed");
    expect(adapter.files).toEqual({ "sr/Foo.json": "1" });
  });

  it("without rename, a failed final write leaves the data under the old name and no temporary file", async () => {
    const adapter = caseInsensitiveAdapter({ "sr/Foo.json": "1" });
    const write = adapter.write;
    let writes = 0;
    adapter.write = async (p, c) => { writes += 1; if (writes === 2) throw new Error("disk full"); return write(p, c); };
    await expect(replaceFile(adapter, "sr/Foo.json", "sr/foo.json", "1")).rejects.toThrow("disk full");
    expect(Object.values(adapter.files)).toEqual(["1"]);
    expect(Object.keys(adapter.files).some((p) => p.endsWith(".moving"))).toBe(false);
  });

  it("treats names that differ only in Unicode form as one file", async () => {
    const nfd = "sr/Café.json";
    const nfc = "sr/café.json";
    const key = (p) => p.normalize("NFC").toLowerCase();
    const store = new Map([[key(nfd), { name: nfd, data: "1" }]]);
    const adapter = {
      get files() { return Object.fromEntries([...store.values()].map((e) => [e.name, e.data])); },
      async exists(p) { return store.has(key(p)); },
      async read(p) { return store.get(key(p)).data; },
      async write(p, c) { const e = store.get(key(p)); store.set(key(p), { name: e ? e.name : p, data: c }); },
      async remove(p) { store.delete(key(p)); },
    };
    await replaceFile(adapter, nfd, nfc, "1");
    expect(adapter.files).toEqual({ [nfc]: "1" });
  });
});

describe("Synapse anchors on a case-only rename", () => {
  it("the note's own anchors file takes the new name", async () => {
    const adapter = caseInsensitiveAdapter({ "engram-review/synapse/A__Foo.json": JSON.stringify({ note: "A/Foo.md" }) });
    adapter.list = async () => ({ files: Object.keys(adapter.files).filter((p) => p.startsWith("engram-review/synapse/")), folders: [] });
    await followNoteRenames(adapter, new Map([["A/Foo.md", "A/foo.md"]]));
    expect(Object.keys(adapter.files)).toEqual(["engram-review/synapse/A__foo.json"]);
    expect(JSON.parse(adapter.files["engram-review/synapse/A__foo.json"]).note).toBe("A/foo.md");
  });
});
