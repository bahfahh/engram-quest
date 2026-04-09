# EngramQuest Skills Index

These are the source AI skills for the `engram-quest` Obsidian plugin.
Each module has its own skill file and optional references/scripts.

| Module | Skill file | Purpose |
|---|---|---|
| Quest Map | `quest-map/skills.md` | Generate `quest-map` markdown files |
| Review Deck | `review-deck/skills.md` | Generate or update review-deck hints |
| Memory Map | `memory-map/skills.md` | Generate `.canvas` memory maps |

## Usage Rules

1. Read the relevant module skill first.
2. Follow the skill exactly before asking the user for missing details.
3. If the skill is unclear, fix the skill instead of inventing a new workflow.

## Portability Rules

These skills are shipped to end users. They must stay generic.

- Do not hard-code personal vault paths.
- Do not rely on personal note names or examples.
- Do not write instructions that only work on one operating system.
- Put cross-platform CLI helpers in `scripts/*.sh`.
- Keep examples understandable for users who know nothing about this vault.
