---
name: engram-quest-map
description:
  Generate HTML-first Quest Maps for the EngramQuest plugin from notes, topics, Lesson Academy courses, or other EngramQuest artifacts.
  Trigger when the user asks to create, update, redesign, or explain a quest map; turn study material into practice missions; build easy/medium/hard quests; or create Boss Battle style applied challenges.
---

# Quest Map Skill

## Default Output

Generate plugin-native HTML-first Quest packages by default.

A plugin-native quest has:
- one folder under `engram-quest/quests/{questSlug}/`
- one `meta.json` file with map metadata and node pointers
- one self-contained HTML file per mission or boss node in the same quest folder
- runtime progress stored by the plugin in `engram-quest/state/`, never in the source note

Use legacy markdown quest-map blocks only when updating existing legacy content or when the user explicitly asks for an embeddable note block. For legacy syntax, read `references/challenge-formats.md`.

## Output Language Rule

Generate user-facing quest titles, node text, HTML copy, hints, feedback, and explanations in the language that best matches the source note or user prompt. Keep structural keys in English.

Skills documents and references are execution instructions and must stay in English.

## Hard Runtime Rules

- Do not modify source notes unless the user explicitly asks to embed a quest block in that note.
- Node `id` is the progress contract. Preserve existing IDs when updating equivalent content.
- New quest packages go under `engram-quest/quests/{questSlug}/`.
- New HTML files stay inside the quest package folder, commonly `nodes/{nodeId}.html` or `{nodeId}.html`.
- Quest HTML must be self-contained: inline CSS and vanilla JS only, no external scripts, fonts, images, fetches, popups, or top-level navigation.
- HTML completes by posting `engram-quest-solved`; it resizes by posting `engram-quest-resize`.
- Every mission must be deterministic enough to emit a numeric score from 0 to 100.

## Required References

Read these before generating files:

- `references/html-first-contract.md` for package shape, path rules, and postMessage contract.
- `references/html-quality.md` before writing any HTML.
- `references/boss-design.md` before writing a boss node.
- `references/domain-patterns.md` when choosing a mission format for the source domain.

Read conditionally:

- `references/engram-data-layout.md` when the user names an EngramQuest course, lesson, review deck, or generated artifact.
- `references/obsidian-cli.md` when vault search or note discovery is needed.
- `references/parser-constraints.md` and `references/challenge-formats.md` only for legacy v1 quests.

Example assets:
- `assets/examples/mission-basic.html` demonstrates a compact normal mission.
- `assets/examples/boss-cascade.html` demonstrates a small cascade boss. Use these as structural examples, not copy-paste templates.

## Generation Flow

1. Resolve the source **and** read all required references in parallel (no dependencies between them).
   Start these simultaneously:
   - `references/html-first-contract.md`
   - `references/html-quality.md`
   - `references/boss-design.md`
   - `references/domain-patterns.md`
   - Source course `meta.json` if applicable (read `references/engram-data-layout.md` first if needed)

   Other source resolution rules:
   - If the user names an EngramQuest artifact, read the plugin data folder directly before vault search.
   - If vault discovery is needed, use Obsidian CLI (`obsidian search`), not grep scripts.
   - Use `scripts/list_quest_icons.sh` only when a quest icon filename is needed.
2. Analyze the source for applied practice opportunities.
   - Extract realistic cases, operating constraints, failure modes, calculations, tradeoffs, and common confusions.
   - Do not turn the source into another flashcard deck.
3. Design the v2 quest.
   - Small source: 3-4 nodes including boss.
   - Medium source: 4-6 nodes including boss.
   - Large source: 6-8 nodes including boss.
   - Prefer fewer rich missions over many thin nodes.
   - Use `difficulty: easy | medium | hard`; runtime maps this to the correct background.
4. Write the quest package.
   - Create `engram-quest/quests/{questSlug}/meta.json`.
   - Use node `type: briefing | mission | boss`.
   - Use `html:` or `file:` on mission and boss nodes.
   - Keep HTML paths relative to the package folder, such as `nodes/{nodeId}.html`.
5. Write every HTML mission file.
   - Match the domain and language.
   - Include clear feedback and a completion action.
   - Send score with `window.parent.postMessage({ type: "engram-quest-solved", score }, "*")`.
6. Update mode.
   - Read existing `meta.json` and existing HTML before editing.
   - Preserve node IDs and filenames for unchanged learning objectives.
   - Replace only the HTML files whose mission content materially changed.
   - Never write progress into `meta.json`.

## Quality Bar

The quest should feel like applied practice:
- Briefing frames context or teaches the minimum needed concept.
- Mission asks the learner to operate, diagnose, calculate, sequence, compare, or decide.
- Boss integrates multiple earlier concepts with visible consequences.
- Distractors are plausible and teach why the best answer is best.
- Visuals are inspectable and content-specific, not decorative.
