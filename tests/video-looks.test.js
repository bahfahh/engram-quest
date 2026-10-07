// Tests for the Video Academy look registry (src/videos/looks.js + looks.json): registry shape,
// free/Pro gating, the learner's own looks, and the registry copy written for the video skill.
import { describe, it, expect } from "vitest";
import { LOOKS, CATALOG_PATH, USER_LOOKS_DIR, isLookId, localText, listUserLooks, canUseLook, syncCatalog } from "../src/videos/looks.js";

function makeAdapter(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async read(p) { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]; },
    async write(p, content) { files[p] = content; },
    async mkdir() {},
    async list(dir) {
      const prefix = dir.replace(/\/$/, "") + "/";
      const folders = new Set();
      for (const k of Object.keys(files)) {
        if (!k.startsWith(prefix)) continue;
        const rest = k.slice(prefix.length);
        if (rest.includes("/")) folders.add(prefix + rest.slice(0, rest.indexOf("/")));
      }
      if (!folders.size && !Object.keys(files).some((k) => k.startsWith(prefix))) throw new Error("ENOENT " + dir);
      return { files: [], folders: [...folders] };
    },
  };
}

describe("look registry", () => {
  it("has unique kebab-case ids, a tier and a name in both languages", () => {
    const ids = LOOKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LOOKS) {
      expect(isLookId(l.id)).toBe(true);
      expect(["free", "pro"]).toContain(l.tier);
      expect(l.name["zh-tw"] && l.name.en).toBeTruthy();
    }
  });

  it("ships editorial and isometric as the free looks", () => {
    expect(LOOKS.filter((l) => l.tier === "free").map((l) => l.id).sort()).toEqual(["editorial", "isometric"]);
  });

  it("localises names with an English fallback", () => {
    expect(localText({ "zh-tw": "黑板", en: "Chalkboard" }, "zh-tw")).toBe("黑板");
    expect(localText({ en: "Chalkboard" }, "zh-tw")).toBe("Chalkboard");
    expect(localText("My look", "en")).toBe("My look");
    expect(localText(null, "en", "fallback")).toBe("fallback");
  });
});

describe("canUseLook", () => {
  const mine = [{ id: "my-neon", tier: "mine", name: "Neon" }];
  it("lets everyone use auto and free looks, and gates Pro and own looks on Pro", () => {
    expect(canUseLook("auto", false)).toBe(true);
    expect(canUseLook("editorial", false)).toBe(true);
    expect(canUseLook("chalk", false)).toBe(false);
    expect(canUseLook("chalk", true)).toBe(true);
    expect(canUseLook("my-neon", false, mine)).toBe(false);
    expect(canUseLook("my-neon", true, mine)).toBe(true);
  });

  it("refuses ids no registry knows", () => {
    expect(canUseLook("fast", true)).toBe(false);
  });
});

describe("listUserLooks", () => {
  it("reads look.json per folder and skips invalid or built-in ids", async () => {
    const a = makeAdapter({
      [`${USER_LOOKS_DIR}/my-neon/look.json`]: JSON.stringify({ name: { "zh-tw": "霓虹", en: "Neon" } }),
      [`${USER_LOOKS_DIR}/chalk/look.json`]: JSON.stringify({ name: "Copy of chalk" }),
      [`${USER_LOOKS_DIR}/Bad Name/look.json`]: JSON.stringify({ name: "x" }),
      [`${USER_LOOKS_DIR}/no-manifest/NOTES.md`]: "draft",
    });
    const looks = await listUserLooks(a);
    expect(looks.map((l) => l.id)).toEqual(["my-neon"]);
    expect(looks[0]).toMatchObject({ tier: "mine", name: { en: "Neon" } });
  });

  it("returns nothing when the folder doesn't exist", async () => {
    expect(await listUserLooks(makeAdapter())).toEqual([]);
  });
});

describe("syncCatalog", () => {
  it("writes the registry copy for the skill once, then only when it changes", async () => {
    const a = makeAdapter();
    expect(await syncCatalog(a)).toBe(true);
    const copy = JSON.parse(a.files[CATALOG_PATH]);
    expect(copy.looks.map((l) => l.id)).toEqual(LOOKS.map((l) => l.id));
    expect(await syncCatalog(a)).toBe(false);
    a.files[CATALOG_PATH] = "{}";
    expect(await syncCatalog(a)).toBe(true);
  });
});
