// trashVaultPath follows the user's Obsidian "Deleted files" setting for files the vault has not indexed,
// and never deletes permanently.
import { describe, it, expect } from "vitest";
import { trashVaultPath, trashAdapterPath } from "../src/vault-trash.js";

function appWith(trashOption, { systemWorks = true } = {}) {
  const files = { "engram-quest/x.json": "{}" };
  const used = [];
  const adapter = {
    async exists(p) { return p in files; },
    async trashSystem(p) { used.push("system"); if (!systemWorks) return false; delete files[p]; return true; },
    async trashLocal(p) { used.push("local"); delete files[p]; },
    async remove() { throw new Error("must not delete permanently"); },
  };
  return {
    files, used,
    vault: { adapter, getAbstractFileByPath: () => null, getConfig: (k) => (k === "trashOption" ? trashOption : undefined) },
    fileManager: { trashFile: async () => { throw new Error("not indexed"); } },
  };
}

describe("trashVaultPath and the Deleted files setting", () => {
  it("'local' uses the vault's .trash first", async () => {
    const app = appWith("local");
    expect(await trashVaultPath(app, "engram-quest/x.json")).toBe(true);
    expect(app.used).toEqual(["local"]);
  });

  it("'system' uses the system trash first", async () => {
    const app = appWith("system");
    expect(await trashVaultPath(app, "engram-quest/x.json")).toBe(true);
    expect(app.used).toEqual(["system"]);
  });

  it("'none' still moves an unindexed file to a trash rather than deleting it", async () => {
    const app = appWith("none");
    expect(await trashVaultPath(app, "engram-quest/x.json")).toBe(true);
    expect(app.used).toEqual(["system"]);
  });

  it("falls back to the other trash when the first one refuses", async () => {
    const app = appWith("system", { systemWorks: false });
    expect(await trashVaultPath(app, "engram-quest/x.json")).toBe(true);
    expect(app.used).toEqual(["system", "local"]);
    expect(app.files).toEqual({});
  });
});

describe("trashAdapterPath (callers without the app)", () => {
  it("never deletes permanently: with no trash that works, the file stays and the call says so", async () => {
    const files = { "engram-quest/videos/t/a.mp4": "bin" };
    const adapter = {
      exists: async (p) => p in files,
      remove: async (p) => { delete files[p]; },
      trashSystem: async () => false,
      trashLocal: async () => { throw new Error("locked"); },
    };
    expect(await trashAdapterPath(adapter, "engram-quest/videos/t/a.mp4")).toBe(false);
    expect(files).toEqual({ "engram-quest/videos/t/a.mp4": "bin" });
  });

  it("uses the system trash first, then the Obsidian trash folder", async () => {
    const used = [];
    const adapter = { exists: async () => true, trashSystem: async () => { used.push("system"); return false; }, trashLocal: async () => { used.push("local"); } };
    expect(await trashAdapterPath(adapter, "x.json")).toBe(true);
    expect(used).toEqual(["system", "local"]);
  });
});
