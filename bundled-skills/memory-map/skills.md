---
name: memory-map
description: |
  Generate or update memory-map Canvas files for the EngramQuest plugin.
  Trigger when the user asks to create, update, or explain a memory map, or asks how memory-map works.
  Use this skill whenever the user mentions memory maps, visual knowledge maps, or wants to build a Canvas map for retention — even if they do not use the exact term "memory-map".
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

0. Check for a pre-existing knowledge index or graph in the vault (e.g. `graphify-out/graph.json`, `GRAPH_REPORT.md`). If found, use its concept relationships as association edges and community structure as chunk groupings — this replaces or reduces the vault search in step 2.
1. Read the source note.
2. Search the vault for related notes or context using this priority:
   a. Step 0 already found a graph index → use it directly. Skip this step.
   b. No index: `obsidian search query="<key concepts from source note>" format=json`
   c. Obsidian CLI not available: `bash scripts/search_vault.sh "<key concepts>" 30`
   d. Source note is self-contained and no associations are needed → skip this step.
3. Choose the best reference flow.
4. Read `.memory-map/config.json` — this is a **config file only**, not an output folder. Extract the `memoryMapFolder` value, then follow `references/create.md` → Output section for the exact save location. Never save canvas files inside `.memory-map/`.
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
