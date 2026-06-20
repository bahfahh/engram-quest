"use strict";

function createInstaller() {
  const INSTALLER_VERSION = "2026-06-10";
  const MODULES = [
    {
      id: "quest-map",
      title: "Quest Map",
      summary: "Generate plugin-native HTML Quest Map packages for the EngramQuest Hub."
    },
    {
      id: "review-deck",
      title: "Review Deck",
      summary: "Generate and update review-deck hints for flashcard notes."
    },
    {
      id: "memory-map",
      title: "Memory Map",
      summary: "Generate memory-map canvas files for the EngramQuest plugin."
    },
    {
      id: "lesson-academy",
      title: "Lesson Academy",
      summary: "Build interactive HTML lesson courses tailored to what the user wants to learn."
    },
    {
      id: "synapse",
      title: "Synapse (Pro)",
      summary: "Pre-compute memory anchors that link difficult cards to mastered ones. Pro feature.",
      pro: true
    },
    {
      id: "quadrant",
      title: "Quadrant Card (Pro)",
      summary: "Upgrade a flashcard into an A4 four-quadrant super-memory card (question, answer, verbal metaphor, visual image). Pro feature.",
      pro: true
    }
  ];
  const TOOL_TARGETS = {
    claude: {
      id: "claude",
      label: "Claude Code",
      kind: "skills",
      baseDir: ".claude/skills",
      summary: "Project-local Claude Code skills."
    },
    codex: {
      id: "codex",
      label: "Codex / Antigravity",
      kind: "skills",
      baseDir: ".agents/skills",
      summary: "Project-local skills for Codex and Antigravity (shared .agents/skills)."
    },
    gemini: {
      id: "gemini",
      label: "Gemini CLI",
      kind: "skills",
      baseDir: ".gemini/skills",
      summary: "Project-local Gemini CLI skills."
    },
    cursor: {
      id: "cursor",
      label: "Cursor",
      kind: "rules",
      baseDir: ".cursor/skills",
      summary: "Project-local Cursor skills."
    }
  };
  const MODULE_ASSETS = {
    "quest-map": [
      { source: "quest-map/skills.md", target: "SKILL.md" },
      { source: "quest-map/references/user-guide.md", target: "references/user-guide.md" },
      { source: "quest-map/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "quest-map/references/engram-data-layout.md", target: "references/engram-data-layout.md" },
      { source: "quest-map/references/html-first-contract.md", target: "references/html-first-contract.md" },
      { source: "quest-map/references/html-quality.md", target: "references/html-quality.md" },
      { source: "quest-map/references/boss-design.md", target: "references/boss-design.md" },
      { source: "quest-map/references/domain-patterns.md", target: "references/domain-patterns.md" },
      { source: "quest-map/references/challenge-formats.md", target: "references/challenge-formats.md" },
      { source: "quest-map/references/visual-challenges.md", target: "references/visual-challenges.md" },
      { source: "quest-map/references/parser-constraints.md", target: "references/parser-constraints.md" },
      { source: "quest-map/references/yaml-template.md", target: "references/yaml-template.md" },
      { source: "quest-map/scripts/list_quest_icons.sh", target: "scripts/list_quest_icons.sh" },
      { source: "quest-map/assets/examples/mission-basic.html", target: "assets/examples/mission-basic.html" },
      { source: "quest-map/assets/examples/boss-cascade.html", target: "assets/examples/boss-cascade.html" }
    ],
    "review-deck": [
      { source: "review-deck/skills.md", target: "SKILL.md" },
      { source: "review-deck/references/user-guide.md", target: "references/user-guide.md" },
      { source: "review-deck/references/plugin-architecture.md", target: "references/plugin-architecture.md" },
      { source: "review-deck/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "review-deck/references/engram-data-layout.md", target: "references/engram-data-layout.md" },
      { source: "review-deck/references/image-cards.md", target: "references/image-cards.md" },
      { source: "review-deck/scripts/search_vault.sh", target: "scripts/search_vault.sh" },
      { source: "review-deck/scripts/get_mtime.sh", target: "scripts/get_mtime.sh" }
    ],
    "memory-map": [
      { source: "memory-map/skills.md", target: "SKILL.md" },
      { source: "memory-map/references/create.md", target: "references/create.md" },
      { source: "memory-map/references/update.md", target: "references/update.md" },
      { source: "memory-map/references/explain.md", target: "references/explain.md" },
      { source: "memory-map/references/user-guide.md", target: "references/user-guide.md" },
      { source: "memory-map/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "memory-map/references/engram-data-layout.md", target: "references/engram-data-layout.md" },
      { source: "memory-map/scripts/search_vault.sh", target: "scripts/search_vault.sh" }
    ],
    "lesson-academy": [
      { source: "lesson-academy/skills.md", target: "SKILL.md" },
      { source: "lesson-academy/references/html-recipe.md", target: "references/html-recipe.md" },
      { source: "lesson-academy/references/lesson-format.md", target: "references/lesson-format.md" },
      { source: "lesson-academy/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "lesson-academy/references/visual-teaching.md", target: "references/visual-teaching.md" }
    ],
    "synapse": [
      { source: "synapse/skills.md", target: "SKILL.md" },
      { source: "synapse/references/scoring-guide.md", target: "references/scoring-guide.md" },
      { source: "synapse/references/plugin-architecture.md", target: "references/plugin-architecture.md" },
      { source: "synapse/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "synapse/scripts/dump_sr_pool.sh", target: "scripts/dump_sr_pool.sh" },
      { source: "synapse/scripts/dump_sr_pool.js", target: "scripts/dump_sr_pool.js" }
    ],
    "quadrant": [
      { source: "quadrant/skills.md", target: "SKILL.md" },
      { source: "quadrant/references/recipes.md", target: "references/recipes.md" },
      { source: "quadrant/references/q3-q4-quality.md", target: "references/q3-q4-quality.md" },
      { source: "quadrant/references/layout-contract.md", target: "references/layout-contract.md" },
      { source: "quadrant/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "quadrant/assets/recipe-A-flywheel.html", target: "assets/recipe-A-flywheel.html" },
      { source: "quadrant/assets/recipe-B-comic.html", target: "assets/recipe-B-comic.html" },
      { source: "quadrant/assets/recipe-C-emoji.html", target: "assets/recipe-C-emoji.html" }
    ]
  };

  function joinPath() {
    return Array.from(arguments).filter(Boolean).join("/").replace(/\/+/g, "/");
  }

  async function readBundledSkill(adapter, bundledSkillsRoot, relativePath) {
    return adapter.read(joinPath(bundledSkillsRoot, relativePath));
  }

  async function buildSkillEntries(toolTarget, adapter, bundledSkillsRoot, modules) {
    const entries = [];
    for (const moduleDefinition of modules) {
      const targetRoot = joinPath(toolTarget.baseDir, `engram-quest-${moduleDefinition.id}`);
      for (const asset of MODULE_ASSETS[moduleDefinition.id] || []) {
        let content = await readBundledSkill(adapter, bundledSkillsRoot, asset.source);
        if (asset.target === "SKILL.md") {
          // Rewrite `bash scripts/` → `bash {targetRoot}/scripts/` so the path resolves
          // correctly when CWD is the vault root (not the skill directory).
          content = content.replace(/\bbash scripts\//g, `bash ${targetRoot}/scripts/`);
        }
        entries.push({ path: joinPath(targetRoot, asset.target), content });
      }
    }
    return entries;
  }

  async function buildCursorRuleEntries(toolTarget, adapter, bundledSkillsRoot, modules) {
    const entries = [];
    for (const moduleDefinition of modules) {
      const source = await readBundledSkill(adapter, bundledSkillsRoot, `${moduleDefinition.id}/skills.md`);
      entries.push({
        path: joinPath(toolTarget.baseDir, `engram-quest-${moduleDefinition.id}.mdc`),
        content: [
          "---",
          `description: Use when the user asks to create or update an EngramQuest ${moduleDefinition.id}.`,
          "globs:",
          "alwaysApply: false",
          "---",
          `<!-- engram-quest-installer:${INSTALLER_VERSION};tool:cursor;module:${moduleDefinition.id};source:${bundledSkillsRoot}/${moduleDefinition.id}/skills.md -->`,
          "",
          source.trim(),
          ""
        ].join("\n")
      });
    }
    return entries;
  }

  async function getInstallEntries(toolId, adapter, configDir, { isPro = false } = {}) {
    const toolTarget = TOOL_TARGETS[toolId];
    if (!toolTarget || !adapter) return [];
    const bundledSkillsRoot = configDir + "/plugins/engram-quest/bundled-skills";
    const modules = isPro ? MODULES : MODULES.filter(m => !m.pro);
    return toolTarget.kind === "rules"
      ? buildCursorRuleEntries(toolTarget, adapter, bundledSkillsRoot, modules)
      : buildSkillEntries(toolTarget, adapter, bundledSkillsRoot, modules);
  }

  return {
    INSTALLER_VERSION,
    MODULES,
    TOOL_TARGETS,
    getInstallEntries
  };
}

module.exports = createInstaller;
