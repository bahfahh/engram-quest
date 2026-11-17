// perf(hub-open 2/3): the Hub's scans reuse what they read while a file is unchanged
// (src/review/scan-cache.js). Speed is only worth it if nothing shown is older than the files.
import { beforeEach, describe, expect, it } from "vitest";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const scanCache = require("../src/review/scan-cache.js");
const helpers = require("../src/review/helpers.js");
const { scanReviewDecks } = require("../src/review/decks.js");
const { HubModal } = require("../src/hub/modal.js");

// A vault whose index stamps follow each write made through it, and that counts disk reads.
function fakeVault() {
  const notes = new Map(), meta = new Map(), raw = new Map(), stamps = new Map(), frozen = new Map();
  let tick = 1, reads = 0;
  const bump = (p) => stamps.set(p, ++tick);
  const file = (path) => ({ path, name: path.split("/").pop(), basename: path.split("/").pop().replace(/\.md$/, ""), extension: "md", parent: { path: path.split("/").slice(0, -1).join("/") }, stat: { mtime: stamps.get(path) || 1, size: frozen.has(path) ? frozen.get(path) : (notes.get(path) || "").length } });
  const adapter = {
    async exists(p) { return raw.has(p) || [...raw.keys()].some((k) => k.startsWith(p + "/")); },
    async read(p) { reads++; if (!raw.has(p)) throw new Error("ENOENT"); return raw.get(p); },
    async write(p, d) { raw.set(p, d); bump(p); },
    async mkdir() {},
    async list(p) { return { files: [...raw.keys()].filter((k) => k.startsWith(p + "/")), folders: [] }; },
  };
  const app = {
    vault: {
      adapter,
      getMarkdownFiles: () => [...notes.keys()].map(file),
      getFiles: () => [...notes.keys()].map(file),
      cachedRead: async (f) => { reads++; return notes.get(f.path); },
      read: async (f) => { reads++; return notes.get(f.path); },
      getAbstractFileByPath: (p) => (raw.has(p) || notes.has(p)) ? { stat: { mtime: stamps.get(p) || 1, size: (raw.get(p) || notes.get(p)).length } } : null,
    },
    metadataCache: { getFileCache: (f) => meta.get(f.path) },
  };
  return {
    app, adapter,
    reads: () => reads, resetReads: () => { reads = 0; },
    note(path, text, tag) { notes.set(path, text); bump(path); meta.set(path, tag ? { tags: [{ tag: `#${tag}` }], sections: [{ type: "paragraph" }] } : { sections: [{ type: "code" }] }); },
    removeNote(path) { notes.delete(path); },
    // A note rewritten past the vault: the index keeps its old stamp.
    silentNote(path, text) { frozen.set(path, (notes.get(path) || "").length); notes.set(path, text); },
    // A change from outside the plugin (sync, another device): the index sees it.
    external(path, text) { raw.set(path, text); bump(path); },
    // A write that the index does not see (a phone, adapter write).
    silent(path, text) { raw.set(path, text); },
  };
}

const settings = { flashcardTags: "flashcards" };
const cards = async (app) => (await scanReviewDecks(app, settings, helpers)).flatMap((d) => d.cards);

let v;
beforeEach(() => {
  scanCache.clear();
  v = fakeVault();
  scanCache.setStamper((p) => { const f = v.app.vault.getAbstractFileByPath(p); return f ? `${f.stat.mtime}:${f.stat.size}` : "none"; });
  v.note("deck/a.md", "#flashcards/az\nQ: one\nA: 1\n", "flashcards/az");
  v.adapter.write("engram-review/sr/deck__a.json", JSON.stringify({ one: { due: "2099-01-01", interval: 5, state: 2 } }));
});

describe("deck scan", () => {
  it("does not read an unchanged note or schedule again", async () => {
    await cards(v.app);
    v.resetReads();
    await cards(v.app);
    expect(v.reads()).toBe(0);
  });

  it("reads a note again once it changes, and shows its new card", async () => {
    await cards(v.app);
    v.note("deck/a.md", "#flashcards/az\nQ: one\nA: 1\n\n\nQ: two\nA: 2\n", "flashcards/az");
    expect((await cards(v.app)).map((c) => c.front)).toEqual(["one", "two"]);
  });

  it("shows a schedule changed from outside (sync)", async () => {
    await cards(v.app);
    v.external("engram-review/sr/deck__a.json", JSON.stringify({ one: { due: "2000-01-01", interval: 1, state: 2 } }));
    expect((await cards(v.app))[0].srMeta.due).toBe("2000-01-01");
  });

  it("shows a rating at once, without reading the schedule again", async () => {
    await cards(v.app);
    await helpers.updateSrData(v.adapter, "deck/a.md", (d) => ({ ...d, one: { due: "2031-03-03", interval: 9, state: 2 } }));
    v.resetReads();
    expect((await cards(v.app))[0].srMeta.due).toBe("2031-03-03");
    expect(v.reads()).toBe(0);
  });

  it("hands out copies: changing a card does not change what the next scan returns", async () => {
    const first = await cards(v.app);
    first[0].front = "changed"; first[0].srMeta.due = "1999-01-01";
    const again = await cards(v.app);
    expect(again[0].front).toBe("one");
    expect(again[0].srMeta.due).toBe("2099-01-01");
  });

  it("forgets a note that is gone", async () => {
    await cards(v.app);
    v.removeNote("deck/a.md");
    expect(await cards(v.app)).toEqual([]);
    expect(scanCache.exportAll().notes).toEqual([]);
  });
});

describe("plugin writes the index may not see", () => {
  it("re-reads hints after the plugin rewrites them", async () => {
    v.adapter.write("engram-review/hints/deck__a.json", JSON.stringify({ cards: { one: { l1: "old" } } }));
    expect((await cards(v.app))[0].hint_l1).toBe("old");
    v.silent("engram-review/hints/deck__a.json", JSON.stringify({ cards: { one: { l1: "new" } } }));
    helpers.forgetHints("engram-review/hints/deck__a.json");
    expect((await cards(v.app))[0].hint_l1).toBe("new");
  });

  it("re-reads a card note the create-card dialog appended to", async () => {
    await cards(v.app);
    // The text changes but the index stamp does not, as with an adapter write on a phone.
    const before = v.app.vault.getMarkdownFiles()[0].stat;
    v.silentNote("deck/a.md", "#flashcards/az\nQ: one\nA: 1\n\n\nQ: new\nA: n\n");
    expect(v.app.vault.getMarkdownFiles()[0].stat).toEqual(before);
    expect((await cards(v.app)).map((c) => c.front)).not.toContain("new");
    // create.js drops the entry after its write:
    scanCache.drop("notes", "deck/a.md");
    expect((await cards(v.app)).map((c) => c.front)).toContain("new");
  });
});

describe("quest scan", () => {
  function hub() {
    const h = Object.create(HubModal.prototype);
    h.app = v.app; h.plugin = { settings };
    return h;
  }

  it("reads a note with a code block once, then only after it changes", async () => {
    v.note("tech/bash.md", "```bash\nls\n```", null);
    const h = hub();
    await h._loadLibrary();
    v.resetReads();
    await h._loadLibrary();
    expect(v.reads()).toBe(0);
    v.note("tech/bash.md", "```quest-map\nnodes:\n  - id: a\n    title: A\n    challenge:\n      type: quiz\n```", null);
    await h._loadLibrary();
    expect(h.quests.map((q) => q.sourcePath)).toContain("tech/bash.md");
  });
});

describe("saved between launches", () => {
  it("restores entries without overwriting newer ones", () => {
    scanCache.put("sr", "a", "1:1", { x: 1 });
    const saved = scanCache.exportAll();
    scanCache.clear();
    scanCache.put("sr", "a", "2:2", { x: 2 });
    scanCache.importAll(saved);
    expect(scanCache.get("sr", "a", "2:2")).toEqual({ x: 2 });
    expect(scanCache.get("sr", "a", "1:1")).toBeUndefined();
  });

  it("ignores data that is not a saved cache", () => {
    scanCache.importAll({ sr: [["k", { value: 1 }]], nope: [["k", { stamp: "1", value: 1 }]] });
    scanCache.importAll("garbage");
    expect(scanCache.exportAll().sr).toEqual([]);
  });
});

// ticket-078: on a phone the index may not see the plugin's own adapter writes, so a stale entry kept
// under an unchanged stamp would be shown until the next write or restart.
describe("entries the index cannot correct", () => {
  it("does not let a read started before a rating put the old schedule back", async () => {
    scanCache.setStamper(() => "same"); // the index never sees these writes
    const path = "engram-review/sr/race.json";
    const files = new Map([[path, JSON.stringify({ Q: { due: "old" } })]]);
    let gate = null;
    const adapter = {
      async read(p) { if (!files.has(p)) throw new Error("ENOENT"); const d = files.get(p); if (gate) await gate; return d; },
      async write(p, d) { files.set(p, d); },
      async mkdir() {},
    };
    let release;
    gate = new Promise((r) => { release = r; });
    const slowRead = helpers.loadSrData(adapter, "race.md"); // has read the old file, held at the gate
    gate = null;
    await helpers.updateSrData(adapter, "race.md", (d) => ({ ...d, Q: { due: "new" } }));
    release();
    expect((await slowRead).Q.due).toBe("old");
    expect((await helpers.loadSrData(adapter, "race.md")).Q.due).toBe("new");
  });

  it("forgets both paths of a file moved after a note rename", async () => {
    const { replaceFile } = require("../src/review/rename-follow.js");
    const files = new Map([["engram-review/sr/x.json", "{}"]]);
    const adapter = {
      async exists(p) { return files.has(p); },
      async write(p, d) { files.set(p, d); },
      async remove(p) { files.delete(p); },
    };
    scanCache.put("sr", "engram-review/sr/x.json", "s", { a: 1 });
    scanCache.put("sr", "engram-review/sr/y.json", "s", { b: 1 });
    await replaceFile(adapter, "engram-review/sr/x.json", "engram-review/sr/y.json", "{}");
    expect(scanCache.get("sr", "engram-review/sr/x.json", "s")).toBeUndefined();
    expect(scanCache.get("sr", "engram-review/sr/y.json", "s")).toBeUndefined();
  });
});
