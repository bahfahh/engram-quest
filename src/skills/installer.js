"use strict";
let EMBEDDED = {};
try { EMBEDDED = require("./embedded-skills"); } catch (_) { /* generated file missing in test */ }
const VIDEO_MODULES = require("./video-modules.json");

function createInstaller(embeddedOverride) {
  const embedded = embeddedOverride !== undefined ? embeddedOverride : EMBEDDED;
  const INSTALLER_VERSION = "2026-06-10";
  const PACK_MARKER = ".engram-pack";
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
      pro: true,
      // The content skills run Synapse after their own work whenever it is installed, so a copy left
      // behind after the licence ended would keep refreshing a feature the plugin no longer shows.
      removedWithLicence: true
    },
    {
      id: "explainer",
      title: "Deep Dive (Pro)",
      summary: "Generate plain-language visual deep-dive pages for flashcards that are too hard, badly worded, or missing context. Pro feature.",
      pro: true,
      // Deep Dive pages and their queue are the user's data and stay under engram-quest/explainer/;
      // only the installed skill copy goes, since the plugin no longer shows the feature.
      removedWithLicence: true
    },
    {
      id: "animated-course",
      title: "Animated Course",
      summary: "Make animated teaching videos for the Video Academy. Claude Code only.",
      claudeOnly: true
    },
    {
      id: "episodic-review",
      title: "Episodic Review (Pro)",
      summary: "Turn a period of your notes into a recall film for the Memory tab. Claude Code only. Pro feature.",
      pro: true,
      claudeOnly: true
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
      kind: "skills",
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
      { source: "quest-map/references/mission-design.md", target: "references/mission-design.md" },
      { source: "quest-map/references/challenge-formats.md", target: "references/challenge-formats.md" },
      { source: "quest-map/references/visual-challenges.md", target: "references/visual-challenges.md" },
      { source: "quest-map/references/parser-constraints.md", target: "references/parser-constraints.md" },
      { source: "quest-map/scripts/list_quest_icons.sh", target: "scripts/list_quest_icons.sh" },
      { source: "quest-map/scripts/build_quest.py", target: "scripts/build_quest.py" },
      { source: "quest-map/assets/quest-base.css", target: "assets/quest-base.css" },
      { source: "quest-map/assets/quest-base.js", target: "assets/quest-base.js" }
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
      { source: "lesson-academy/references/canvas-recipe.md", target: "references/canvas-recipe.md" },
      { source: "lesson-academy/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      { source: "lesson-academy/references/visual-teaching.md", target: "references/visual-teaching.md" },
      { source: "lesson-academy/assets/lesson-base.css", target: "assets/lesson-base.css" },
      { source: "lesson-academy/assets/lesson-base.js", target: "assets/lesson-base.js" },
      { source: "lesson-academy/scripts/build_lesson.py", target: "scripts/build_lesson.py" }
    ],
    "synapse": [
      { source: "synapse/skills.md", target: "SKILL.md" },
      { source: "synapse/references/scoring-guide.md", target: "references/scoring-guide.md" },
      { source: "synapse/references/plugin-architecture.md", target: "references/plugin-architecture.md" },
      { source: "synapse/scripts/dump_sr_pool.sh", target: "scripts/dump_sr_pool.sh" },
      { source: "synapse/scripts/dump_sr_pool.js", target: "scripts/dump_sr_pool.js" }
    ],
    "explainer": [
      { source: "explainer/skills.md", target: "SKILL.md" },
      { source: "explainer/references/spec-guide.md", target: "references/spec-guide.md" },
      { source: "explainer/references/picture.md", target: "references/picture.md" },
      { source: "explainer/references/obsidian-cli.md", target: "references/obsidian-cli.md" },
      // obsidian-cli.md falls back to this grep search when the Obsidian CLI is unavailable.
      { source: "review-deck/scripts/search_vault.sh", target: "scripts/search_vault.sh" },
      { source: "explainer/assets/examples/machine.spec.json", target: "assets/examples/machine.spec.json" },
      { source: "explainer/assets/examples/contrast.spec.json", target: "assets/examples/contrast.spec.json" },
      { source: "explainer/assets/examples/map.spec.json", target: "assets/examples/map.spec.json" },
      { source: "explainer/assets/examples/reading.spec.json", target: "assets/examples/reading.spec.json" }
    ]
  };

  // Files earlier versions installed and the current skill no longer ships, by module.
  const RETIRED_ASSETS = {
    "explainer": [
      "references/html-recipe.md",
      "references/visual-ip.md",
      "references/examples.md",
      "references/insight-composition.md",
      "references/review-examples.md",
      "references/examples",
      "assets/examples/explainer-too-hard.html",
      "assets/examples/explainer-no-context.html",
      "assets/examples/explainer-poor-description.html"
    ]
  };

  // Every skill carries the same custom-area guide (skills/shared/); the sync step points SKILL.md at it.
  // The video skills are not in MODULE_ASSETS: their pack holds every file they install, guide included.
  for (const assets of Object.values(MODULE_ASSETS)) assets.push({ source: "shared/custom-area.md", target: "custom-area.md" });

  function joinPath() {
    return Array.from(arguments).filter(Boolean).join("/").replace(/\/+/g, "/");
  }

  function readBundledSkill(adapter, bundledSkillsRoot, relativePath) {
    if (embedded[relativePath]) return Promise.resolve(embedded[relativePath]);
    return adapter.read(joinPath(bundledSkillsRoot, relativePath));
  }

  // Rewrite `bash scripts/` → `bash {targetRoot}/scripts/` so the path resolves
  // correctly when CWD is the vault root (not the skill directory).
  function rewriteSkillPaths(content, targetRoot) {
    return content.replace(/\b(bash|node|python3) scripts\//g, `$1 ${targetRoot}/scripts/`);
  }

  async function buildSkillEntries(toolTarget, adapter, bundledSkillsRoot, modules, isPro) {
    const entries = [];
    for (const moduleDefinition of modules) {
      const targetRoot = joinPath(toolTarget.baseDir, `engram-quest-${moduleDefinition.id}`);
      // A video skill is one entry: its pack, downloaded only when the user installs. The marker holds
      // the pack's hash, so comparing it tells whether the copy is current without reading the files,
      // and it is written only after every file has landed.
      const video = VIDEO_MODULES[moduleDefinition.id];
      if (video) {
        entries.push({
          path: joinPath(targetRoot, PACK_MARKER),
          content: video.pack.sha256,
          pack: video.pack,
          root: targetRoot,
          // Files whose absence means the copy is incomplete: the skill itself, and the Pro files a licence adds.
          required: ["SKILL.md", ...(isPro ? video.pro : [])].map((file) => joinPath(targetRoot, file)),
          skip: isPro ? [] : video.pro
        });
        continue;
      }
      for (const asset of MODULE_ASSETS[moduleDefinition.id] || []) {
        let content = await readBundledSkill(adapter, bundledSkillsRoot, asset.source);
        if (asset.target === "SKILL.md") content = rewriteSkillPaths(content, targetRoot);
        entries.push({ path: joinPath(targetRoot, asset.target), content });
      }
    }
    return entries;
  }

  /** What to write from a downloaded pack: every file except the Pro ones a missing licence leaves out. */
  function packWrites(entry, files) {
    return files.filter((file) => !entry.skip.includes(file.path)).map((file) => ({
      path: joinPath(entry.root, file.path),
      data: file.path === "SKILL.md"
        ? new TextEncoder().encode(rewriteSkillPaths(new TextDecoder().decode(file.data), entry.root)).buffer
        : file.data
    }));
  }

  async function getInstallEntries(toolId, adapter, configDir, { isPro = false } = {}) {
    const toolTarget = TOOL_TARGETS[toolId];
    if (!toolTarget || !adapter) return [];
    const bundledSkillsRoot = configDir + "/plugins/engram-quest/bundled-skills";
    const modules = MODULES.filter(m => (isPro || !m.pro) && (toolId === "claude" || !m.claudeOnly));
    return buildSkillEntries(toolTarget, adapter, bundledSkillsRoot, modules, isPro);
  }

  /**
   * Paths that must not stay on disk once a licence has ended: the Pro video content (ADR-30) and the
   * skills marked `removedWithLicence`. Only installed copies are listed; the user's own data stays.
   */
  function getProPaths(toolId) {
    const toolTarget = TOOL_TARGETS[toolId];
    if (!toolTarget) return [];
    const paths = MODULES
      .filter(m => m.removedWithLicence && (toolId === "claude" || !m.claudeOnly))
      .map(m => joinPath(toolTarget.baseDir, `engram-quest-${m.id}`));
    if (toolId !== "claude") return paths;
    for (const [id, video] of Object.entries(VIDEO_MODULES)) {
      const root = joinPath(toolTarget.baseDir, `engram-quest-${id}`);
      if (MODULES.find(m => m.id === id).pro) paths.push(root);
      else paths.push(...video.pro.map(file => joinPath(root, file)));
    }
    return paths;
  }

  /**
   * Files an older installer wrote that the current one no longer uses. Cursor once got a single
   * `.mdc` rule per module, which Cursor never reads from `.cursor/skills/` and which carried no
   * scripts; it now gets the same skill folders as the other tools.
   */
  function getLegacyPaths(toolId) {
    const toolTarget = TOOL_TARGETS[toolId];
    if (!toolTarget) return [];
    // A skill folder is read as a whole, so a guide an earlier version shipped keeps steering the AI
    // after the skill stopped pointing at it.
    const retired = Object.entries(RETIRED_ASSETS).flatMap(([id, files]) =>
      files.map(file => joinPath(toolTarget.baseDir, `engram-quest-${id}`, file)));
    if (toolId !== "cursor") return retired;
    return retired.concat(MODULES.map(m => joinPath(TOOL_TARGETS.cursor.baseDir, `engram-quest-${m.id}.mdc`)));
  }

  return {
    INSTALLER_VERSION,
    MODULES,
    TOOL_TARGETS,
    getInstallEntries,
    packWrites,
    getProPaths,
    getLegacyPaths
  };
}

module.exports = createInstaller;
