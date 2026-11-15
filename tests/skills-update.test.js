// Tests for skill auto-update at plugin load and the Hub outdated-skills detection.
// Regression focus: auto-update must work for claude/codex/gemini installs, which
// carry no "engram-quest-installer:" marker (the old guard only ever matched Cursor).
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { autoUpdateSkills, checkSkillsUpdates, getInstallPreview, doInstall } from "../src/hub/skills.js";
import createInstaller from "../src/skills/installer.js";

// Same installer + embedded skills that hub/skills.js uses internally, so we can
// derive the expected install entries instead of hardcoding skill content.
const G = createInstaller();

function makePlugin(files) {
  const writes = {};
  const adapter = {
    exists: async (p) => Object.prototype.hasOwnProperty.call(files, p),
    read: async (p) => files[p],
    write: async (p, content) => { files[p] = content; writes[p] = content; },
    remove: async (p) => { delete files[p]; adapter.removed.push(p); },
    removed: [],
  };
  return {
    settings: {},
    writes,
    saveData: async () => {},
    app: {
      vault: {
        adapter,
        configDir: ".obsidian",
        getAbstractFileByPath: () => ({}),
        createFolder: async () => {},
      },
    },
  };
}

async function claudeEntries() {
  const plugin = makePlugin({});
  return G.getInstallEntries("claude", plugin.app.vault.adapter, ".obsidian", { isPro: false });
}

// A video skill as a finished install leaves it: the files it needs, then the marker naming its pack.
const installedVideo = (entries) => Object.fromEntries(entries.filter((e) => e.pack)
  .flatMap((e) => [...e.required.map((p) => [p, "x"]), [e.path, e.content]]));

describe("autoUpdateSkills", () => {
  it("updates outdated claude skills even though SKILL.md has no installer marker", async () => {
    const entries = await claudeEntries();
    const skillMd = entries.find((e) => e.path === ".claude/skills/engram-quest-review-deck/SKILL.md");
    const plugin = makePlugin({ [skillMd.path]: "OLD CONTENT, no marker" });

    await autoUpdateSkills(plugin);

    expect(plugin.writes[skillMd.path]).toBe(skillMd.content);
    for (const entry of entries.filter((e) => !e.pack)) expect(plugin.writes[entry.path]).toBe(entry.content);
  });

  it("leaves video assets for the user to install: no download, no marker", async () => {
    const entries = await claudeEntries();
    const packs = entries.filter((e) => e.pack);
    const plugin = makePlugin({ [entries[0].path]: "OLD" });

    await autoUpdateSkills(plugin);

    expect(packs.length).toBeGreaterThan(0);
    for (const entry of packs) expect(plugin.writes[entry.path]).toBeUndefined();
  });

  it("never removes Pro content on its own", async () => {
    const proFile = ".claude/skills/engram-quest-animated-course/scripts/studio/lib/cast/skins/glass.js";
    const plugin = makePlugin({ [proFile]: "x" });
    plugin.license = { state: { status: "inactive" } };

    await autoUpdateSkills(plugin);

    expect(plugin.app.vault.adapter.removed).toEqual([]);
  });

  it("does not touch tools that were never installed", async () => {
    const entries = await claudeEntries();
    const plugin = makePlugin({ [entries[0].path]: "OLD" });

    await autoUpdateSkills(plugin);

    const otherToolWrites = Object.keys(plugin.writes).filter((p) => !p.startsWith(".claude/"));
    expect(otherToolWrites).toEqual([]);
  });

  it("leaves up-to-date installs untouched", async () => {
    const entries = await claudeEntries();
    const files = installedVideo(entries);
    for (const entry of entries.filter((e) => !e.pack)) files[entry.path] = entry.content;
    const plugin = makePlugin(files);

    await autoUpdateSkills(plugin);

    expect(Object.keys(plugin.writes)).toEqual([]);
  });
});

describe("getInstallPreview status", () => {
  it("reports update_available for a partial install (files missing or stale)", async () => {
    const entries = await claudeEntries();
    const plugin = makePlugin({ [entries[0].path]: entries[0].content });
    const preview = await getInstallPreview(plugin, "claude");
    expect(preview.status).toBe("update_available");
  });

  it("reports not_installed when no expected file exists", async () => {
    const plugin = makePlugin({});
    const preview = await getInstallPreview(plugin, "claude");
    expect(preview.status).toBe("not_installed");
  });
});

describe("Pro video content after a licence ends", () => {
  const proFile = ".claude/skills/engram-quest-animated-course/scripts/studio/lib/cast/skins/glass.js";
  const removals = async (status) => {
    const plugin = makePlugin({ [proFile]: "x" });
    plugin.license = { state: { status } };
    const preview = await getInstallPreview(plugin, "claude");
    return preview.items.filter((i) => i.action === "remove").map((i) => i.path);
  };

  it("is offered for removal when the licence has definitely ended", async () => {
    expect(await removals("inactive")).toContain(proFile);
    expect(await removals("invalid")).toContain(proFile);
  });

  it("stays when the check merely failed", async () => {
    expect(await removals("unavailable")).toEqual([]);
    expect(await removals("offline")).toEqual([]);
  });
});

// The content skills run Synapse whenever its skill is installed, and Deep Dive pages are a Pro
// feature the plugin no longer shows, so a lapsed licence takes both installed skill copies away.
describe.each([["synapse", "Synapse"], ["explainer", "Deep Dive"]])("%s skill (%s) after a licence ends", (module) => {
  const preview = async (tool, status) => {
    const root = { claude: ".claude/skills", codex: ".agents/skills", gemini: ".gemini/skills", cursor: ".cursor/skills" }[tool];
    const folder = `${root}/engram-quest-${module}`;
    const plugin = makePlugin({ [folder]: "folder" });
    plugin.license = { state: { status } };
    const result = await getInstallPreview(plugin, tool);
    return { folder, removed: result.items.filter((i) => i.action === "remove").map((i) => i.path) };
  };

  for (const tool of ["claude", "codex", "gemini", "cursor"]) {
    it(`is offered for removal in ${tool} when the licence has definitely ended`, async () => {
      const { folder, removed } = await preview(tool, "inactive");
      expect(removed).toContain(folder);
    });
  }

  it("stays when the check merely failed, and for a licence that is valid", async () => {
    expect((await preview("claude", "offline")).removed).toEqual([]);
    expect((await preview("claude", "unavailable")).removed).toEqual([]);
    const plugin = makePlugin({ [`.claude/skills/engram-quest-${module}`]: "folder" });
    plugin.settings = { licenseValid: true };
    plugin.license = { state: { status: "active" } };
    expect((await getInstallPreview(plugin, "claude")).items.filter((i) => i.action === "remove")).toEqual([]);
  });
});

describe("skills removed with the licence", () => {
  it("only installed skill copies are listed; Deep Dive data under engram-quest/ is not", () => {
    for (const tool of ["claude", "codex", "gemini", "cursor"]) {
      const paths = G.getProPaths(tool);
      expect(paths.some((p) => p.endsWith("/engram-quest-explainer"))).toBe(true);
      expect(paths.some((p) => p.startsWith("engram-quest/"))).toBe(false);
    }
  });

  it("does not offer to remove the free skills", async () => {
    const plugin = makePlugin({ ".claude/skills/engram-quest-review-deck": "folder" });
    plugin.license = { state: { status: "inactive" } };
    expect((await getInstallPreview(plugin, "claude")).items.filter((i) => i.action === "remove")).toEqual([]);
  });
});

describe("checkSkillsUpdates", () => {
  it("returns only installed-but-outdated toolIds and caches the result", async () => {
    const entries = await claudeEntries();
    const plugin = makePlugin({ [entries[0].path]: "OLD" });

    const first = await checkSkillsUpdates(plugin);

    expect(first).toEqual(["claude"]);
    expect(checkSkillsUpdates(plugin)).toBe(plugin._skillsUpdateStatus);
  });

  it("recomputes after an install clears the cache", async () => {
    const entries = await claudeEntries();
    const plugin = makePlugin({ [entries[0].path]: "OLD", ...installedVideo(entries) });

    expect(await checkSkillsUpdates(plugin)).toEqual(["claude"]);
    await autoUpdateSkills(plugin); // doInstall runs and clears the cache
    expect(plugin._skillsUpdateStatus).toBe(null);
    expect(await checkSkillsUpdates(plugin)).toEqual([]);
  });
});

describe("an outdated video skill", () => {
  const root = ".claude/skills/engram-quest-animated-course";
  const outdated = async (files, settings = {}) => {
    const entries = await claudeEntries();
    const plugin = makePlugin({ ...installedVideo(entries), ...files });
    plugin.settings = settings;
    const preview = await getInstallPreview(plugin, "claude");
    return preview.items.find((i) => i.path === `${root}/.engram-pack`).action;
  };

  it("is found from disk alone: an older pack, a missing SKILL.md, or Pro files a licence adds", async () => {
    expect(await outdated({})).toBe("unchanged");
    expect(await outdated({ [`${root}/.engram-pack`]: "0".repeat(64) })).toBe("replace");
    const noSkill = makePlugin({});
    expect((await getInstallPreview(noSkill, "claude")).items.find((i) => i.pack).action).toBe("create");
    expect(await outdated({}, { licenseValid: true })).toBe("replace");
  });

  it("writes nothing at plugin load when it is the only thing out of date", async () => {
    const entries = await claudeEntries();
    const files = { ...installedVideo(entries), [`${root}/.engram-pack`]: "0".repeat(64) };
    for (const entry of entries.filter((e) => !e.pack)) files[entry.path] = entry.content;
    const plugin = makePlugin(files);
    await autoUpdateSkills(plugin);
    expect(plugin.writes).toEqual({});
  });

  it("is written from its pack without the Pro files a missing licence leaves out, and SKILL.md finds its scripts", async () => {
    const plugin = makePlugin({});
    const enc = (s) => new TextEncoder().encode(s).buffer;
    for (const isPro of [false, true]) {
      const entry = (await G.getInstallEntries("claude", plugin.app.vault.adapter, ".obsidian", { isPro })).find((e) => e.path === `${root}/.engram-pack`);
      const proFile = "scripts/studio/lib/cast/skins/glass.js";
      const writes = G.packWrites(entry, [
        { path: "SKILL.md", data: enc("# Course\nRun `python3 scripts/doctor.py` first.\n") },
        { path: proFile, data: enc("pro") },
        { path: "assets/a.png", data: enc("png") },
      ]);
      const byPath = Object.fromEntries(writes.map((w) => [w.path, new TextDecoder().decode(w.data)]));
      expect(byPath[`${root}/SKILL.md`]).toBe(`# Course\nRun \`python3 ${root}/scripts/doctor.py\` first.\n`);
      expect(byPath[`${root}/assets/a.png`]).toBe("png");
      expect(`${root}/${proFile}` in byPath).toBe(isPro);
    }
  });

  it("reaches the user through the update check, and nothing is downloaded until they install", async () => {
    const obsidian = createRequire(import.meta.url)("obsidian");
    const had = obsidian.requestUrl;
    let asked = 0;
    obsidian.requestUrl = async () => { asked++; throw new Error("no network in this test"); };
    try {
      const entries = await claudeEntries();
      const plugin = makePlugin({ ...installedVideo(entries), [`${root}/.engram-pack`]: "0".repeat(64) });
      for (const entry of entries.filter((e) => !e.pack)) plugin.app.vault.adapter.write(entry.path, entry.content);
      await autoUpdateSkills(plugin);
      expect(asked).toBe(0);
      expect(await checkSkillsUpdates(plugin)).toEqual(["claude"]);
    } finally { obsidian.requestUrl = had; }
  });
});

describe("a failed video asset download", () => {
  it("still writes the text files, and the error says why the download failed", async () => {
    const plugin = makePlugin({});
    plugin.settings = { licenseValid: true };
    plugin.manifest = { version: "0.0.0-test" };
    const preview = await getInstallPreview(plugin, "claude");
    expect(preview.items.some((i) => i.pack)).toBe(true);

    const obsidian = createRequire(import.meta.url)("obsidian");
    const had = obsidian.requestUrl;
    obsidian.requestUrl = async () => { throw new Error("Request failed, status 404"); };
    const failure = await doInstall(plugin, preview).then(() => null, (e) => e).finally(() => { obsidian.requestUrl = had; });

    // The modal shows this message and stays open; it has to say what went wrong, not only that something did.
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toMatch(/^Couldn.t download the video skill./);
    expect(failure.message.endsWith(" (Request failed, status 404)")).toBe(true);
    for (const entry of preview.items.filter((i) => !i.pack && i.action !== "remove")) expect(plugin.writes[entry.path]).toBe(entry.content);
    for (const entry of preview.items.filter((i) => i.pack)) expect(plugin.writes[entry.path]).toBeUndefined();
  });
});
