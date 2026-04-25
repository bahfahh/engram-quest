import { describe, it, expect } from "vitest";
import createInstaller from "../src/skills/installer.js";

const installer = createInstaller();

function makeAdapter(files) {
  return { read: async (path) => files[path] ?? "" };
}

describe("installer script path rewriting", () => {
  it("rewrites bash scripts/ to skill-relative path in SKILL.md for claude", async () => {
    const fakeSkillMd = [
      "Run `bash scripts/get_mtime.sh \"note.md\"`",
      "Also `bash scripts/search_vault.sh \"topic\" 30`",
    ].join("\n");

    const adapter = makeAdapter({
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/skills.md": fakeSkillMd,
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/plugin-architecture.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/search_vault.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/get_mtime.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/scripts/list_quest_icons.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/create.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/update.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/explain.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/scripts/search_vault.sh": "",
    });

    const entries = await installer.getInstallEntries("claude", adapter);
    const skillMd = entries.find(e => e.path === ".claude/skills/engram-quest-review-deck/SKILL.md");

    expect(skillMd).toBeDefined();
    expect(skillMd.content).toContain("bash .claude/skills/engram-quest-review-deck/scripts/get_mtime.sh");
    expect(skillMd.content).toContain("bash .claude/skills/engram-quest-review-deck/scripts/search_vault.sh");
    expect(skillMd.content).not.toContain("bash scripts/");
  });

  it("rewrites to correct path for gemini", async () => {
    const fakeSkillMd = "Run `bash scripts/get_mtime.sh \"note.md\"`";
    const files = {
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/skills.md": fakeSkillMd,
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/plugin-architecture.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/search_vault.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/get_mtime.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/scripts/list_quest_icons.sh": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/create.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/update.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/explain.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/scripts/search_vault.sh": "",
    };

    const entries = await installer.getInstallEntries("gemini", makeAdapter(files));
    const skillMd = entries.find(e => e.path === ".gemini/skills/engram-quest-review-deck/SKILL.md");

    expect(skillMd.content).toContain("bash .gemini/skills/engram-quest-review-deck/scripts/get_mtime.sh");
    expect(skillMd.content).not.toContain("bash scripts/");
  });

  it("does not rewrite scripts/ in non-SKILL.md assets", async () => {
    const shContent = "#!/bin/bash\necho scripts/something";
    const files = {
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/plugin-architecture.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/search_vault.sh": shContent,
      ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/get_mtime.sh": shContent,
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/quest-map/scripts/list_quest_icons.sh": shContent,
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/skills.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/create.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/update.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/explain.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/user-guide.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/obsidian-cli.md": "",
      ".obsidian/plugins/engram-quest/bundled-skills/memory-map/scripts/search_vault.sh": shContent,
    };

    const entries = await installer.getInstallEntries("claude", makeAdapter(files));
    const sh = entries.find(e => e.path === ".claude/skills/engram-quest-review-deck/scripts/get_mtime.sh");

    expect(sh.content).toBe(shContent); // untouched
  });
});
