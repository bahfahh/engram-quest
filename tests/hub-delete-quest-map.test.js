// Hub "delete quest map": the package folder and its progress file both go to the trash, whether or
// not Obsidian's index knows them (AI-written files under engram-quest/ often are not indexed yet).
import { describe, it, expect, vi } from "vitest";
import Module, { createRequire } from "node:module";
import { deleteQuestPackage } from "../src/quest/delete.js";

const require = createRequire(import.meta.url);
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const { HubModal } = require("../src/hub/modal.js");
const ui = require("../src/hub/ui.js");

const PKG = "engram-quest/quests/map-a";
const ITEM = { slug: "map-a", stateKey: `${PKG}/meta.json` };
const STATE = "engram-quest/state/engram-quest__quests__map-a__meta.json.json";

// `indexed` = paths Obsidian's vault index knows; the adapter sees every file on disk.
function makeApp(disk, indexed) {
  const files = { ...disk };
  const trashed = [];
  const adapterTrashed = [];
  const under = (p) => Object.keys(files).filter((k) => k === p || k.startsWith(p + "/"));
  const app = {
    vault: {
      getAbstractFileByPath: (p) => (indexed.includes(p) ? { path: p } : null),
      adapter: {
        exists: async (p) => under(p).length > 0,
        trashSystem: async (p) => { adapterTrashed.push(p); under(p).forEach((k) => delete files[k]); return true; },
      },
    },
    fileManager: { trashFile: async (f) => { trashed.push(f.path); under(f.path).forEach((k) => delete files[k]); } },
  };
  return { app, files, trashed, adapterTrashed };
}
const disk = () => ({ [`${PKG}/meta.json`]: "{}", [`${PKG}/n1.html`]: "<p/>", [STATE]: "{\"nodes\":{}}" });

describe("deleteQuestPackage", () => {
  it("trashes the package and its progress file through fileManager when both are indexed", async () => {
    const t = makeApp(disk(), [PKG, STATE]);
    await deleteQuestPackage(t.app, ITEM);
    expect(t.trashed).toEqual([PKG, STATE]);
    expect(t.adapterTrashed).toEqual([]);
    expect(Object.keys(t.files)).toEqual([]);
  });

  it("still removes the progress file when the vault index does not know it", async () => {
    const t = makeApp(disk(), [PKG]); // progress file on disk, not indexed
    await deleteQuestPackage(t.app, ITEM);
    expect(t.trashed).toEqual([PKG]);
    expect(t.adapterTrashed).toEqual([STATE]);
    expect(t.files[STATE]).toBeUndefined();
  });

  it("removes the package folder too when the index does not know it", async () => {
    const t = makeApp(disk(), []);
    await deleteQuestPackage(t.app, ITEM);
    expect(t.adapterTrashed).toEqual([PKG, STATE]);
    expect(Object.keys(t.files)).toEqual([]);
  });

  it("is fine when a map never had a progress file", async () => {
    const d = disk(); delete d[STATE];
    const t = makeApp(d, [PKG]);
    await deleteQuestPackage(t.app, ITEM);
    expect(t.trashed).toEqual([PKG]);
    expect(t.adapterTrashed).toEqual([]);
  });

  it("throws, rather than reporting success, when the progress file cannot be trashed", async () => {
    const t = makeApp(disk(), [PKG]);
    delete t.app.vault.adapter.trashSystem; // no trash method on this adapter
    await expect(deleteQuestPackage(t.app, ITEM)).rejects.toThrow();
    expect(t.files[STATE]).toBeDefined();
  });
});

describe("Hub delete button on a quest map", () => {
  // Runs the real HubModal._confirmDelete, answering its confirm dialog with "yes".
  async function confirmDelete(app, item, type) {
    let confirmed;
    const spy = vi.spyOn(ui, "confirmDialog").mockImplementation((_app, _t, opts) => { confirmed = opts.onConfirm(); });
    const hub = { app, plugin: { settings: {} }, loadData: vi.fn(async () => {}), render: vi.fn() };
    try { HubModal.prototype._confirmDelete.call(hub, item, type); await confirmed; } finally { spy.mockRestore(); }
    return hub;
  }

  it("leaves no progress file behind when the index lacks it", async () => {
    const t = makeApp(disk(), [PKG]);
    const hub = await confirmDelete(t.app, { ...ITEM, title: "Map A" }, "quest-package");
    expect(t.files[STATE]).toBeUndefined();
    expect(Object.keys(t.files)).toEqual([]);
    expect(hub.render).toHaveBeenCalled();
  });

  it("trashes the progress file through fileManager when the index has it", async () => {
    const t = makeApp(disk(), [PKG, STATE]);
    await confirmDelete(t.app, { ...ITEM, title: "Map A" }, "quest-package");
    expect(t.trashed).toEqual([PKG, STATE]);
  });
});
