import { describe, it, expect } from "vitest";
import createInstaller from "../src/skills/installer.js";

const installer = createInstaller({});

function makeAdapter(files) {
  return { read: async (path) => files[path] ?? "" };
}

function makeAllBundledFiles(overrides = {}) {
  return {
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/skills.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/user-guide.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/plugin-architecture.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/references/obsidian-cli.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/search_vault.sh": "",
    ".obsidian/plugins/engram-quest/bundled-skills/review-deck/scripts/get_mtime.sh": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/skills.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/user-guide.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/obsidian-cli.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/engram-data-layout.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/html-first-contract.md": "html first docs",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/html-quality.md": "html quality docs",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/boss-design.md": "boss docs",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/domain-patterns.md": "domain docs",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/challenge-formats.md": "iframe docs",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/visual-challenges.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/parser-constraints.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/references/yaml-template.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/scripts/list_quest_icons.sh": "",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/assets/examples/mission-basic.html": "<html>mission</html>",
    ".obsidian/plugins/engram-quest/bundled-skills/quest-map/assets/examples/boss-cascade.html": "<html>boss</html>",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/skills.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/create.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/update.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/explain.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/user-guide.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/references/obsidian-cli.md": "",
    ".obsidian/plugins/engram-quest/bundled-skills/memory-map/scripts/search_vault.sh": "",
    ...overrides,
  };
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

    const entries = await installer.getInstallEntries("claude", adapter, ".obsidian");
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

    const entries = await installer.getInstallEntries("gemini", makeAdapter(files), ".obsidian");
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

    const entries = await installer.getInstallEntries("claude", makeAdapter(files), ".obsidian");
    const sh = entries.find(e => e.path === ".claude/skills/engram-quest-review-deck/scripts/get_mtime.sh");

    expect(sh.content).toBe(shContent); // untouched
  });
});

describe("installer quest-map reference assets", () => {
  it("installs challenge-formats.md with the quest-map skill", async () => {
    const entries = await installer.getInstallEntries(
      "claude",
      makeAdapter(makeAllBundledFiles()),
      ".obsidian",
    );

    const challengeFormats = entries.find(
      (entry) => entry.path === ".claude/skills/engram-quest-quest-map/references/challenge-formats.md",
    );

    expect(challengeFormats).toBeDefined();
    expect(challengeFormats.content).toBe("iframe docs");
  });

  it("installs HTML-first references and example assets with the quest-map skill", async () => {
    const entries = await installer.getInstallEntries(
      "claude",
      makeAdapter(makeAllBundledFiles()),
      ".obsidian",
    );

    const expected = [
      ["references/html-first-contract.md", "html first docs"],
      ["references/html-quality.md", "html quality docs"],
      ["references/boss-design.md", "boss docs"],
      ["references/domain-patterns.md", "domain docs"],
      ["assets/examples/mission-basic.html", "<html>mission</html>"],
      ["assets/examples/boss-cascade.html", "<html>boss</html>"],
    ];

    for (const [relativePath, content] of expected) {
      const entry = entries.find((item) => item.path === `.claude/skills/engram-quest-quest-map/${relativePath}`);
      expect(entry).toBeDefined();
      expect(entry.content).toBe(content);
    }
  });
});

describe("installer explainer (Pro)", () => {
  function withExplainer(overrides = {}) {
    const base = "bundled-skills/explainer";
    const root = ".obsidian/plugins/engram-quest/" + base;
    return makeAllBundledFiles({
      [`${root}/skills.md`]: "explainer skill",
      [`${root}/references/html-recipe.md`]: "recipe",
      [`${root}/references/visual-ip.md`]: "visual",
      [`${root}/references/obsidian-cli.md`]: "cli",
      [`${root}/assets/examples/explainer-too-hard.html`]: "<html>hard</html>",
      [`${root}/assets/examples/explainer-no-context.html`]: "<html>ctx</html>",
      [`${root}/assets/examples/explainer-poor-description.html`]: "<html>desc</html>",
      ...overrides,
    });
  }

  it("is a Pro module — excluded when isPro is false", async () => {
    const entries = await installer.getInstallEntries(
      "claude",
      makeAdapter(withExplainer()),
      ".obsidian",
      { isPro: false },
    );
    expect(entries.some((e) => e.path.includes("engram-quest-explainer"))).toBe(false);
  });

  it("installs the skill + example assets when isPro is true", async () => {
    const entries = await installer.getInstallEntries(
      "claude",
      makeAdapter(withExplainer()),
      ".obsidian",
      { isPro: true },
    );

    const skillMd = entries.find((e) => e.path === ".claude/skills/engram-quest-explainer/SKILL.md");
    expect(skillMd).toBeDefined();
    expect(skillMd.content).toBe("explainer skill");

    // one example page per diagnosis type
    for (const ex of ["explainer-too-hard.html", "explainer-no-context.html", "explainer-poor-description.html"]) {
      expect(
        entries.some((e) => e.path === `.claude/skills/engram-quest-explainer/assets/examples/${ex}`),
      ).toBe(true);
    }

    // all three references present
    for (const ref of ["html-recipe.md", "visual-ip.md", "obsidian-cli.md"]) {
      expect(
        entries.some((e) => e.path === `.claude/skills/engram-quest-explainer/references/${ref}`),
      ).toBe(true);
    }
  });
});
