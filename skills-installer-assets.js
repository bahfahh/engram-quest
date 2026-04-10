'use strict';

const INSTALLER_VERSION = '2026-04-07';

const MODULES = [
  {
    id: 'quest-map',
    title: 'Quest Map',
    summary: 'Generate staged quest-map markdown for the EngramQuest plugin.',
    statusLabel: 'quest-map skill',
  },
  {
    id: 'review-deck',
    title: 'Review Deck',
    summary: 'Generate and update review-deck hints for flashcard notes.',
    statusLabel: 'review-deck skill',
  },
  {
    id: 'memory-map',
    title: 'Memory Map',
    summary: 'Generate memory-map canvas files for the EngramQuest plugin.',
    statusLabel: 'memory-map skill',
  },
];

const TOOL_TARGETS = {
  claude: {
    id: 'claude',
    label: 'Claude Code',
    kind: 'skills',
    baseDir: '.claude/skills',
    summary: 'Project-local Claude Code skills.',
  },
  codex: {
    id: 'codex',
    label: 'Codex',
    kind: 'skills',
    baseDir: '.agents/skills',
    summary: 'Project-local Codex skills.',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini CLI',
    kind: 'skills',
    baseDir: '.gemini/skills',
    summary: 'Project-local Gemini CLI skills.',
  },
  cursor: {
    id: 'cursor',
    label: 'Cursor',
    kind: 'rules',
    baseDir: '.cursor/skills',
    summary: 'Project-local Cursor skills.',
  },
};

function joinPath() {
  return Array.from(arguments).filter(Boolean).join('/').replace(/\/+/g, '/');
}

function skillHeader(module, tool) {
  return [
    '---',
    `name: engram-quest-${module.id}`,
    `description: ${module.summary}`,
    '---',
    `<!-- engram-quest-installer:${INSTALLER_VERSION};tool:${tool.id};module:${module.id} -->`,
    '',
    `# EngramQuest ${module.title} Skill`,
    '',
    `This skill is installed by the EngramQuest Obsidian plugin for ${tool.label}.`,
    'Use it only inside the current vault. Do not rely on any user-scope folders.',
    '',
  ].join('\n');
}

function commonRules() {
  return [
    '## Shared rules',
    '- Work only with files in the current Obsidian vault.',
    '- Keep outputs compatible with the EngramQuest plugin.',
    '- Preserve the language of the source note unless the user explicitly asks for another language.',
    '- If the plugin format is unclear, inspect existing EngramQuest files in this vault before inventing fields.',
    '',
  ].join('\n');
}

function questSkill(tool) {
  return [
    skillHeader(MODULES[0], tool),
    '## When to use',
    '- The user asks to create or update a quest-map for a note or topic.',
    '- The request clearly refers to the EngramQuest plugin.',
    '',
    '## Steps',
    '1. Read the source note or topic content.',
    '2. Split the material into 3 to 5 chapters.',
    '3. Produce a complete ```quest-map code block with a valid style and difficulty.',
    '4. Save the result as <source-note-name>-quest.md.',
    '5. If you need icon names, run `bash scripts/list_quest_icons.sh`.',
    '',
    '## Output requirements',
    '- Include frontmatter tags when the source note has clear topic tags.',
    '- Use valid challenge types: quiz, truefalse, order, match, input.',
    '- Hard mode should feel stricter than medium mode.',
    '',
    commonRules(),
    '## References',
    '- Read `references/user-guide.md` when the user asks how quest maps work.',
    '',
  ].join('\n');
}

function reviewSkill(tool) {
  return [
    skillHeader(MODULES[1], tool),
    '## When to use',
    '- The user asks to create, update, or explain a review deck for EngramQuest.',
    '- The task is about `question :: answer` notes, `.review-deck/hints`, or flashcard tags.',
    '',
    '## Steps',
    '1. Find the relevant note or topic inside the vault.',
    '2. Ensure card fronts match the exact text before `::`.',
    '3. Generate or update `.review-deck/hints/<note-name>.json`.',
    '4. Use `bash scripts/search_vault.sh "<query>"` to gather real vault context for L2 hints.',
    '',
    '## Output requirements',
    '- Keys inside the JSON must exactly match the flashcard front text.',
    '- Keep `l1`, `l2`, and `l3` concise and usable during recall.',
    '- Never invent personal context that does not exist in the vault.',
    '',
    commonRules(),
    '## References',
    '- Read `references/user-guide.md` when the user asks how review decks work.',
    '',
  ].join('\n');
}

function memorySkill(tool) {
  return [
    skillHeader(MODULES[2], tool),
    '## When to use',
    '- The user asks to create, update, or explain a memory-map for EngramQuest.',
    '- The request clearly targets an Obsidian Canvas output.',
    '',
    '## Steps',
    '1. Read the source note.',
    '2. Use `bash scripts/search_vault.sh "<query>"` to discover real related notes.',
    '3. Build a `<source-note-name>-memory.canvas` file in valid JSON Canvas format.',
    '4. Use the references folder to choose between create, update, and explain flows.',
    '',
    '## Output requirements',
    '- Prefer a clear central concept, strong associations, and compact chunks.',
    '- Keep the canvas readable on desktop.',
    '- Do not hard-code any personal vault path examples.',
    '',
    commonRules(),
    '## References',
    '- `references/create.md` for new maps.',
    '- `references/update.md` for edits.',
    '- `references/explain.md` for walkthrough requests.',
    '- `references/user-guide.md` for end-user explanations.',
    '',
  ].join('\n');
}

function userGuide(module) {
  return [
    `# ${module.title} User Guide`,
    '',
    `Installed by EngramQuest on ${INSTALLER_VERSION}.`,
    '',
    'Use this guide when the user asks how this module works inside the plugin.',
    'Keep the explanation short and product-focused.',
    '',
  ].join('\n');
}

function createReference() {
  return [
    '# Create Flow',
    '',
    'Build a new memory map from one source note.',
    'Prefer 1 central concept, 3 to 6 major branches, and concise node text.',
    '',
  ].join('\n');
}

function updateReference() {
  return [
    '# Update Flow',
    '',
    'Modify an existing memory map without discarding useful structure.',
    'Preserve node ids when practical so the canvas remains stable.',
    '',
  ].join('\n');
}

function explainReference() {
  return [
    '# Explain Flow',
    '',
    'Explain what an existing memory map is doing and why the layout helps memory.',
    '',
  ].join('\n');
}

function searchScript() {
  return [
    '#!/bin/bash',
    'QUERY="${1:?Usage: bash search_vault.sh <query> [limit]}"',
    'LIMIT="${2:-5}"',
    'if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then',
    '  powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & obsidian \'search:context\' \'query=$QUERY\' \'limit=$LIMIT\'"',
    'else',
    '  obsidian search:context query="$QUERY" limit="$LIMIT"',
    'fi',
    '',
  ].join('\n');
}

function listQuestIconsScript() {
  return [
    '#!/bin/bash',
    'echo "book-open"',
    'echo "graduation-cap"',
    'echo "brain"',
    'echo "compass"',
    'echo "map"',
    '',
  ].join('\n');
}

function buildSkillEntries(tool) {
  const entries = [];

  for (const module of MODULES) {
    const dir = joinPath(tool.baseDir, `engram-quest-${module.id}`);
    if (module.id === 'quest-map') {
      entries.push({ path: joinPath(dir, 'SKILL.md'), content: questSkill(tool) });
      entries.push({ path: joinPath(dir, 'references/user-guide.md'), content: userGuide(module) });
      entries.push({ path: joinPath(dir, 'scripts/list_quest_icons.sh'), content: listQuestIconsScript() });
    }
    if (module.id === 'review-deck') {
      entries.push({ path: joinPath(dir, 'SKILL.md'), content: reviewSkill(tool) });
      entries.push({ path: joinPath(dir, 'references/user-guide.md'), content: userGuide(module) });
      entries.push({ path: joinPath(dir, 'scripts/search_vault.sh'), content: searchScript() });
    }
    if (module.id === 'memory-map') {
      entries.push({ path: joinPath(dir, 'SKILL.md'), content: memorySkill(tool) });
      entries.push({ path: joinPath(dir, 'references/create.md'), content: createReference() });
      entries.push({ path: joinPath(dir, 'references/update.md'), content: updateReference() });
      entries.push({ path: joinPath(dir, 'references/explain.md'), content: explainReference() });
      entries.push({ path: joinPath(dir, 'references/user-guide.md'), content: userGuide(module) });
      entries.push({ path: joinPath(dir, 'scripts/search_vault.sh'), content: searchScript() });
    }
  }

  return entries;
}

function cursorRule(module) {
  const descriptions = {
    'quest-map': 'Use when the user asks to create or update an EngramQuest quest-map.',
    'review-deck': 'Use when the user asks to create or update an EngramQuest review-deck or hints JSON.',
    'memory-map': 'Use when the user asks to create or update an EngramQuest memory-map canvas.',
  };

  const bodies = {
    'quest-map': [
      'Generate output for the EngramQuest Obsidian plugin.',
      'Read the source note, split it into 3 to 5 chapters, and write a valid `quest-map` code block.',
      'Save to `<source-note-name>-quest.md` inside the vault.',
      'If icon names are needed, prefer a small generic set such as `book-open`, `graduation-cap`, `brain`, `compass`, or `map`.',
    ],
    'review-deck': [
      'Generate or update `.review-deck/hints/<note-name>.json` for the EngramQuest plugin.',
      'Card keys must exactly match the text before `::` in the source note.',
      'Use real vault context for L2 hints. Do not invent personal scenes.',
    ],
    'memory-map': [
      'Generate or update `<source-note-name>-memory.canvas` in JSON Canvas format for the EngramQuest plugin.',
      'Use real related notes from the vault when building associations.',
      'Favor readable desktop layouts and concise node text.',
    ],
  };

  return [
    '---',
    `description: ${descriptions[module.id]}`,
    'globs:',
    'alwaysApply: false',
    '---',
    `<!-- engram-quest-installer:${INSTALLER_VERSION};tool:cursor;module:${module.id} -->`,
    '',
    `# EngramQuest ${module.title}`,
    '',
    ...bodies[module.id],
    '',
    'Only operate inside the current vault.',
    '',
  ].join('\n');
}

function buildCursorEntries(tool) {
  return MODULES.map((module) => ({
    path: joinPath(tool.baseDir, `engram-quest-${module.id}.mdc`),
    content: cursorRule(module),
  }));
}

function getInstallEntries(toolId) {
  const tool = TOOL_TARGETS[toolId];
  if (!tool) return [];
  return tool.kind === 'rules' ? buildCursorEntries(tool) : buildSkillEntries(tool);
}

module.exports = {
  INSTALLER_VERSION,
  MODULES,
  TOOL_TARGETS,
  getInstallEntries,
};
