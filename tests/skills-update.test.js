// Tests for skill auto-update at plugin load and the Hub outdated-skills detection.
// Regression focus: auto-update must work for claude/codex/gemini installs, which
// carry no "engram-quest-installer:" marker (the old guard only ever matched Cursor).
import { describe, it, expect } from "vitest";
import { autoUpdateSkills, checkSkillsUpdates, getInstallPreview } from "../src/hub/skills.js";
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

describe("autoUpdateSkills", () => {
  it("updates outdated claude skills even though SKILL.md has no installer marker", async () => {
    const entries = await claudeEntries();
    const skillMd = entries.find((e) => e.path === ".claude/skills/engram-quest-review-deck/SKILL.md");
    const plugin = makePlugin({ [skillMd.path]: "OLD CONTENT, no marker" });

    await autoUpdateSkills(plugin);

    expect(plugin.writes[skillMd.path]).toBe(skillMd.content);
    for (const entry of entries) expect(plugin.writes[entry.path]).toBe(entry.content);
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
    const files = {};
    for (const entry of entries) files[entry.path] = entry.content;
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
    const plugin = makePlugin({ [entries[0].path]: "OLD" });

    expect(await checkSkillsUpdates(plugin)).toEqual(["claude"]);
    await autoUpdateSkills(plugin); // doInstall runs and clears the cache
    expect(plugin._skillsUpdateStatus).toBe(null);
    expect(await checkSkillsUpdates(plugin)).toEqual([]);
  });
});
