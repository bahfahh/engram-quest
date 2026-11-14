// Renaming a note so that only its letter case changes (Foo.md -> foo.md). On Windows and macOS the
// old and new file names of its schedule, hints and AI cards are one file, so "write the new name,
// then remove the old one" deleted the data it had just written (ticket-068).
import { describe, it, expect } from "vitest";
import { followCardFilesRename, followNoteRenames, replaceFile, recoverMovingFiles } from "../src/review/rename-follow.js";

// A disk that ignores case (and Unicode form), like NTFS: one entry per folded path, shown under the
// last name written. A rename takes the new spelling, and refuses a destination that is another file.
function caseInsensitiveAdapter(initial = {}, key = (p) => p.toLowerCase()) {
  const store = new Map();
  for (const [p, c] of Object.entries(initial)) store.set(key(p), { name: p, data: c });
  return {
    get files() { return Object.fromEntries([...store.values()].map((e) => [e.name, e.data])); },
    async exists(p) { return store.has(key(p)) || [...store.keys()].some((k) => k.startsWith(key(p) + "/")); },
    async read(p) { const e = store.get(key(p)); if (!e) throw new Error("ENOENT " + p); return e.data; },
    async write(p, c) { const e = store.get(key(p)); store.set(key(p), { name: e ? e.name : p, data: c }); },
    async remove(p) { store.delete(key(p)); },
    async rename(from, to) {
      const e = store.get(key(from));
      if (!e) throw new Error("ENOENT " + from);
      if (key(from) !== key(to) && store.has(key(to))) throw new Error("EEXIST " + to);
      store.delete(key(from));
      store.set(key(to), { name: to, data: e.data });
    },
    async list(dir) { return { files: [...store.values()].map((e) => e.name).filter((n) => n.startsWith(dir + "/")), folders: [] }; },
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

// Records every rename; `failAt` makes chosen renames throw, as a locked file would.
function renamingAdapter(initial = {}, failAt = null) {
  const a = caseInsensitiveAdapter(initial);
  const rename = a.rename;
  const calls = [];
  a.rename = async (from, to) => {
    calls.push(`${from} -> ${to}`);
    if (failAt && failAt(from, to)) throw new Error("rename failed");
    return rename(from, to);
  };
  a.calls = calls;
  return a;
}

describe("replaceFile when a step fails", () => {
  it("renames through a temporary name", async () => {
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

  it("when the undo fails too, the data waits in the temporary file and the next start puts it back", async () => {
    const adapter = renamingAdapter({ "engram-review/sr/Foo.json": "1" }, (from) => from.endsWith(".moving"));
    await expect(replaceFile(adapter, "engram-review/sr/Foo.json", "engram-review/sr/foo.json", "1")).rejects.toThrow("rename failed");
    expect(adapter.files).toEqual({ "engram-review/sr/foo.json.moving": "1" });
    // After a restart the file is no longer locked.
    const restarted = caseInsensitiveAdapter(adapter.files);
    await recoverMovingFiles(restarted);
    expect(restarted.files).toEqual({ "engram-review/sr/foo.json": "1" });
  });

  it("the start-up sweep keeps both files when the name is taken again", async () => {
    const files = { "engram-review/hints/A__foo.json.moving": "old", "engram-review/hints/A__foo.json": "new" };
    const adapter = caseInsensitiveAdapter(files);
    await recoverMovingFiles(adapter);
    expect(adapter.files).toEqual(files);
  });

  it("treats names that differ only in Unicode form as one file", async () => {
    const nfd = "sr/Café.json";
    const nfc = "sr/café.json";
    const adapter = caseInsensitiveAdapter({ [nfd]: "1" }, (p) => p.normalize("NFC").toLowerCase());
    await replaceFile(adapter, nfd, nfc, "1");
    expect(adapter.files).toEqual({ [nfc]: "1" });
  });
});

describe("one failed move does not stop the others", () => {
  it("an AI card that cannot move still lets both of the note's hints files follow", async () => {
    const adapter = caseInsensitiveAdapter({
      "engram-review/hints/A__Foo.json": JSON.stringify({ note: "A/Foo.md", cards: {} }),
      "engram-review/ai-cards/A__Foo.md": "Q :: A\n",
      "engram-review/hints/Foo.json": JSON.stringify({ note: "A/Foo.md", cards: {} }),
    });
    const write = adapter.write;
    adapter.write = async (p, c) => { if (p.includes("ai-cards")) throw new Error("locked"); return write(p, c); };
    await followCardFilesRename(adapter, "A/Foo.md", "A/Bar.md");
    expect(Object.keys(adapter.files).sort()).toEqual([
      "engram-review/ai-cards/A__Foo.md",
      "engram-review/hints/A__Bar.json",
      "engram-review/hints/Bar.json",
    ]);
  });
});

describe("Synapse anchors on a case-only rename", () => {
  it("the note's own anchors file takes the new name", async () => {
    const adapter = caseInsensitiveAdapter({ "engram-review/synapse/A__Foo.json": JSON.stringify({ note: "A/Foo.md" }) });
    await followNoteRenames(adapter, new Map([["A/Foo.md", "A/foo.md"]]));
    expect(Object.keys(adapter.files)).toEqual(["engram-review/synapse/A__foo.json"]);
    expect(JSON.parse(adapter.files["engram-review/synapse/A__foo.json"]).note).toBe("A/foo.md");
  });
});

describe("start-up recovery", () => {
  it("the plugin sweeps interrupted renames once the vault is ready", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/main.js", "utf8")).toContain("onLayoutReady(()=>renameFollow.recoverMovingFiles(this.app.vault.adapter))");
  });
});

describe("start-up recovery, harder cases", () => {
  it("one temporary file that cannot be restored does not stop the others", async () => {
    const adapter = caseInsensitiveAdapter({ "engram-review/sr/a.json.moving": "1", "engram-review/sr/b.json.moving": "2", "engram-review/sr/c.json.moving": "3" });
    const rename = adapter.rename;
    adapter.rename = async (from, to) => { if (from.endsWith("a.json.moving")) throw new Error("locked"); return rename(from, to); };
    await recoverMovingFiles(adapter);
    expect(Object.keys(adapter.files).sort()).toEqual(["engram-review/sr/a.json.moving", "engram-review/sr/b.json", "engram-review/sr/c.json"]);
  });

  it("a folder that cannot be listed does not stop the other folders", async () => {
    const adapter = caseInsensitiveAdapter({ "engram-review/sr/x.json": "0", "engram-review/hints/h.json.moving": "1" });
    const list = adapter.list;
    adapter.list = async (dir) => { if (dir === "engram-review/sr") throw new Error("EIO"); return list(dir); };
    await recoverMovingFiles(adapter);
    expect(adapter.files["engram-review/hints/h.json"]).toBe("1");
  });

  it("a recovered AI card brings its schedule and anchors file to the new spelling", async () => {
    const adapter = caseInsensitiveAdapter({
      "engram-review/ai-cards/A__foo.md.moving": "Q :: A\n",
      "engram-review/sr/engram-review__ai-cards__A__Foo.json": "{\"Q\":{}}",
      "engram-review/synapse/engram-review__ai-cards__A__Foo.json": "{}",
    });
    await recoverMovingFiles(adapter);
    expect(Object.keys(adapter.files).sort()).toEqual([
      "engram-review/ai-cards/A__foo.md",
      "engram-review/sr/engram-review__ai-cards__A__foo.json",
      "engram-review/synapse/engram-review__ai-cards__A__foo.json",
    ]);
  });

  it("replaceFile never renames over a temporary file still waiting to be restored", async () => {
    const adapter = caseInsensitiveAdapter({ "sr/Foo.json": "new", "sr/foo.json.moving": "old" });
    await expect(replaceFile(adapter, "sr/Foo.json", "sr/foo.json", "new")).rejects.toThrow("in the way");
    expect(adapter.files).toEqual({ "sr/Foo.json": "new", "sr/foo.json.moving": "old" });
  });
});
