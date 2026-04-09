---
name: memory-map
description: >
  Generate or update memory-map canvas files for the Obsidian EngramQuest plugin.
  Trigger when the user asks to create, update, or explain a memory map in EngramQuest.

  User guide trigger:
  If the user asks how memory-map works in EngramQuest, read references/user-guide.md and answer.
---

# Memory Map Skill

## Output Language Rule

Important: generate user-facing output in the language that best matches the user's prompt or the source note.

- If the prompt explicitly asks for a language, follow the prompt.
- Otherwise, match the source note language.
- Keep JSON structure and machine-facing fields in English.

This rule applies to:
node text, explanations, analogies, labels, and any generated contextual content inside the map.

## Reference Routing

Choose the right reference before writing:

| Goal | Reference |
|---|---|
| Create a new map | `references/create.md` |
| Update an existing map | `references/update.md` |
| Explain an existing map | `references/explain.md` |
| Answer user-facing questions | `references/user-guide.md` |

## Core Memory Principles

- **Novelty**: emphasize what is surprising or counterintuitive
- **Association**: connect to real notes already in the vault
- **Contextual anchoring**: use real learning situations when available
- **Elaborative encoding**: use analogy, imagery, and explanation
- **Chunking**: keep the map broken into small useful groups

## Workflow

1. Read the source note.
2. Search the vault for related notes or context.
3. Choose the best reference flow.
4. Generate or update `<source-note-name>-memory.canvas`.
5. Keep the canvas readable and stable.

## Output Rules

- Use valid JSON Canvas format.
- Prefer one clear central idea with supporting branches.
- Keep node text concise.
- Use real associations when possible.
- Do not invent fake personal memories or fake vault references.

## If Context Is Missing

- Use analogy, chunking, and concept structure anyway.
- Leave contextual anchoring lighter rather than fabricating evidence.
- Prefer honest gaps over fake confidence.
