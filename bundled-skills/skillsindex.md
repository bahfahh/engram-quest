# EngramQuest Skills Index

Skills are execution instructions for AI agents (Claude Code, Gemini CLI, Cursor, etc.).
Each skill is installed as an independent module with its own `references/` and `scripts/`.

| Module | Skill file | Purpose |
|---|---|---|
| quest-map | `quest-map/skills.md` | Generate `quest-map` markdown files |
| review-deck | `review-deck/skills.md` | Generate or update review-deck cards and hints |
| memory-map | `memory-map/skills.md` | Generate `.canvas` memory maps |
| macro-review | `macro-review/skills.md` | Batch-learn flashcard groups with FSRS scheduling |

---

## Core Principles

### Skills are agent instructions, not human docs
- Must be written entirely in English — unambiguous, no mixed language.
- Generated output (cards, hints, quest content, map nodes) must match the user's language.

### Skills describe goals and decision logic, not rigid steps
- Write what information is needed and how to get it.
- The AI decides which steps to run based on the user's actual request.
- A single-note request must not trigger a full topic-wide discovery flow.

### Each skill is installed independently
- `references/` and `scripts/` inside each skill folder must be self-contained.
- Do not reference files from another skill's folder.
- `references/obsidian-cli.md` must exist in every skill that uses vault search.

### Script paths must match the installed location
- Skills are installed to `.claude/skills/engram-quest-<module>/` (or equivalent for other tools).
- Scripts live at `.claude/skills/engram-quest-<module>/scripts/<script>.sh`.
- VAULT_ROOT from script location = 5 levels up (`../../../../..`).

---

## Vault Search Strategy

When a skill needs to search the vault, use this priority order — stop as soon as you have enough information:

1. **Graph index** (`graphify-out/GRAPH_REPORT.md` or `graph.json`) — read directly if it exists. Usually covers key concepts and note paths without any search.
2. **Obsidian CLI** (`obsidian search query="..." format=json`) — uses Obsidian's built-in index. Fast, accurate, supports tag/path/frontmatter syntax. See `references/obsidian-cli.md` for full syntax.
3. **grep fallback** (`bash scripts/search_vault.sh`) — only when Obsidian CLI is unavailable, or for L2 hint personal context search.

**`scripts/search_vault.sh` permitted uses:**
- L2 hint generation: find personal vault context (diary, learning notes). Batch all keywords into one call.
- Fallback for note discovery when Obsidian CLI is unavailable.

---

## Knowledge Index Awareness

Before reading raw vault files, check if `graphify-out/GRAPH_REPORT.md` or `graph.json` exists.
If found, use its key concepts, relationships, and community groupings to accelerate content generation.
Only fall back to raw note reading for details the index does not cover.

---

## Portability Rules

- Do not hard-code personal vault paths or note names.
- Do not write instructions that only work on one OS.
- Keep cross-platform helpers in `scripts/*.sh`.
