"use strict";

function createInstaller() {
  const INSTALLER_VERSION = "2026-04-07";
  const MODULES = [
    {
      id: "quest-map",
      title: "Quest Map",
      summary: "Generate staged quest-map markdown for the EngramQuest plugin."
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
      label: "Codex",
      kind: "skills",
      baseDir: ".agents/skills",
      summary: "Project-local Codex skills."
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
  const BUNDLED_SKILLS_ROOT = ".obsidian/plugins/engram-quest/bundled-skills";
  const MODULE_ASSETS = {
    "quest-map": [
      { source: "quest-map/skills.md", target: "SKILL.md" },
      { source: "quest-map/references/user-guide.md", target: "references/user-guide.md" },
      { source: "quest-map/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "quest-map/scripts/list_quest_icons.sh", target: "scripts/list_quest_icons.sh" }
    ],
    "review-deck": [
      { source: "review-deck/skills.md", target: "SKILL.md" },
      { source: "review-deck/references/user-guide.md", target: "references/user-guide.md" },
      { source: "review-deck/references/plugin-architecture.md", target: "references/plugin-architecture.md" },
      { source: "review-deck/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
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
      { source: "memory-map/scripts/search_vault.sh", target: "scripts/search_vault.sh" }
    ]
  };

  function joinPath() {
    return Array.from(arguments).filter(Boolean).join("/").replace(/\/+/g, "/");
  }

  async function readBundledSkill(adapter, relativePath) {
    return adapter.read(joinPath(BUNDLED_SKILLS_ROOT, relativePath));
  }

  async function buildSkillEntries(toolTarget, adapter) {
    const entries = [];
    for (const moduleDefinition of MODULES) {
      const targetRoot = joinPath(toolTarget.baseDir, `engram-quest-${moduleDefinition.id}`);
      for (const asset of MODULE_ASSETS[moduleDefinition.id] || []) {
        let content = await readBundledSkill(adapter, asset.source);
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

  async function buildCursorRuleEntries(toolTarget, adapter) {
    const entries = [];
    for (const moduleDefinition of MODULES) {
      const source = await readBundledSkill(adapter, `${moduleDefinition.id}/skills.md`);
      entries.push({
        path: joinPath(toolTarget.baseDir, `engram-quest-${moduleDefinition.id}.mdc`),
        content: [
          "---",
          `description: Use when the user asks to create or update an EngramQuest ${moduleDefinition.id}.`,
          "globs:",
          "alwaysApply: false",
          "---",
          `<!-- engram-quest-installer:${INSTALLER_VERSION};tool:cursor;module:${moduleDefinition.id};source:${BUNDLED_SKILLS_ROOT}/${moduleDefinition.id}/skills.md -->`,
          "",
          source.trim(),
          ""
        ].join("\n")
      });
    }
    return entries;
  }

  async function getInstallEntries(toolId, adapter) {
    const toolTarget = TOOL_TARGETS[toolId];
    if (!toolTarget || !adapter) return [];
    return toolTarget.kind === "rules"
      ? buildCursorRuleEntries(toolTarget, adapter)
      : buildSkillEntries(toolTarget, adapter);
  }

  return {
    INSTALLER_VERSION,
    MODULES,
    TOOL_TARGETS,
    getInstallEntries
  };
}

module.exports = createInstaller;
