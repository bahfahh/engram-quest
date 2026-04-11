---
name: review-deck
description: 
  Manage review-deck data for the Obsidian EngramQuest plugin.
  Trigger when the user asks to create, update, or explain a review deck,
  flashcard hints, or review-deck setup.

  User guide trigger:
  If the user asks how review-deck works in EngramQuest, read references/user-guide.md and answer.
---

# Review Deck Skill

## Output Language Rule

CRITICAL: Generate user-facing output in the language that best matches the user's prompt or the source note.

- If the prompt explicitly asks for a language, follow the prompt.
- Otherwise, match the source note language.
- Keep JSON keys and structural fields in English.

This rule applies to:
`l1`, `l2`, `l3`, generated card text, explanations, and any inline deck titles or labels.

## How the Plugin Works

1. The plugin scans vault notes.
2. Any line with `question :: answer` is a flashcard.
3. The plugin scans notes whose tags match the user-configured flashcard tag prefix (default: `flashcards`). This prefix is user-configurable in plugin settings.
4. If the user enables legacy `::` note scanning in plugin settings, untagged flashcard notes can also be included for migration.
5. Hints are loaded from `.review-deck/hints/{note-name}.json`.
6. SR progress is stored as `<!--SR:!YYYY-MM-DD,interval,stability,difficulty,state-->` (FSRS-4 format). Legacy SM-2 format (`<!--SR:!YYYY-MM-DD,interval,ease-->`) is read and auto-migrated on next rating. Do not manually insert SR comments.

## Data Locations

| Data | Path |
|---|---|
| Plugin settings | `.obsidian/plugins/engram-quest/data.json` |
| Plugin config | `.review-deck/config.json` |
| Hints | `.review-deck/hints/{note-name}.json` |
| Cards | Any markdown note with `question :: answer` |
| SR metadata | HTML comment after each card |

## Output Scope

CRITICAL: When completing any Setup Flow or Single Note Flow, strictly limit your output to:
- Inserting card content into source notes
- Generating hint JSON files

PROHIBITED — do not create any of the following unless the user explicitly requests it:
- Navigation pages
- Dashboard files
- Index files
- Any file beyond card notes and hint JSON

Code block examples in this document are syntax references only. Do not treat them as deliverables to create.

Task is complete when cards and JSON hints are generated. Stop there.

## Trigger Mapping

| User asks | Action |
|---|---|
| Build a review deck for a topic | Setup Flow |
| Update hints for a topic | Update Flow |
| Add cards to a topic | Edit note content + update hints |
| Make a review-deck from a note | Single Note Flow |

## Scan Record

The file `.review-deck/scan-record.json` tracks which notes have already been processed by AI to avoid duplicate card creation.

Schema:
```json
{
  "lastScan": "2026-04-10T10:00:00.000Z",
  "notes": {
    "Folder/Note.md": {
      "processedAt": "2026-04-10T10:00:00.000Z",
      "mtime": 1712750400000,
      "cards": 12
    }
  }
}
```

- `lastScan`: ISO 8601 timestamp of last completed AI processing session
- `notes[path].mtime`: file mtime in milliseconds at time of processing
- `notes[path].cards`: number of cards found in that note at time of processing

To get a file's current mtime in milliseconds: `bash scripts/get_mtime.sh "path/to/note.md"`

## Setup Flow

CRITICAL: Follow these steps in order. Do not skip any step.

0. Load scan record: read `.review-deck/scan-record.json` if it exists. If missing, treat as `{ "lastScan": null, "notes": {} }`.
1. Read `.obsidian/plugins/engram-quest/data.json` and extract the `flashcardTags` field. This is the user's configured tag prefix (e.g., `mycard`, `flashcards`, or multiple space-separated values). If the file does not exist or the field is empty, default to `flashcards`. Use this value — not a hardcoded string — for all tag operations in this session.
2. Ensure `.review-deck/config.json` exists.
3. Check for a pre-existing knowledge index or graph in the vault (e.g. `graphify-out/GRAPH_REPORT.md`, `graph.json`). If found, use its key concepts and community structure to prioritize which notes to process first and to identify high-value card candidates. This supplements — not replaces — the tag-based note discovery below.
4. Find notes relevant to the topic across the vault.
5. CRITICAL: Notes **must** have YAML tags matching the prefix from step 1 to be detected by the plugin (e.g., `{prefix}/azure`). Do not process untagged notes unless the user explicitly requests legacy migration.
6. Only use untagged `question :: answer` notes when the user explicitly wants legacy flashcard migration.
7. For each note found: run `bash scripts/get_mtime.sh "<note-path>"` to get current mtime. If the note is already in scan-record AND mtime matches, skip it — it has not changed since last processing. Only read and process notes that are new or have a changed mtime.
8. Read each non-skipped note and collect exact front text from `question :: answer`.
9. CRITICAL: For each card in non-skipped notes, run `bash scripts/search_vault.sh "<card-keyword>" 20` to gather real vault context **before** writing any L2. Do not skip this search.
10. Generate `.review-deck/hints/{note-name}.json`.
    CRITICAL: `cards` MUST be an object (dict/map), NOT an array.
    Keys are the exact `front` text of each card (must match `question :: answer` verbatim).
    Required format:
    ```json
    {
      "note": "path/to/source.md",
      "generated": "YYYY-MM-DD",
      "cards": {
        "Exact front text of card 1": { "l1": "...", "l2": "...", "l3": "..." },
        "Exact front text of card 2": { "l1": "...", "l2": "", "l3": "..." }
      }
    }
    ```
    WRONG — do NOT use array format:
    ```json
    { "cards": [{ "front": "...", "l1": "..." }] }
    ```
11. CRITICAL: Before finishing, verify that every processed note has at least one tag matching the prefix from step 1. If missing, add it to the note's YAML frontmatter.
12. Update `.review-deck/scan-record.json`: set `lastScan` to current ISO timestamp; for each processed note set `processedAt`, `mtime`, and `cards`; preserve all existing entries for skipped notes; write the file back.
13. Report: how many notes were skipped (already up-to-date), how many were processed, how many cards total, how many L2 hints were left empty, and how many notes had the tag prefix added.

## Update Flow

1. Read `.obsidian/plugins/engram-quest/data.json` to get the `flashcardTags` prefix (same as Setup Flow step 1).
2. Load scan record: read `.review-deck/scan-record.json` if it exists.
3. Find relevant notes again.
4. For each note: run `bash scripts/get_mtime.sh "<note-path>"` and compare to scan-record. Skip notes whose mtime has not changed since last processing.
5. Read existing hints JSON if present for non-skipped notes.
6. Add hints only for new cards in non-skipped notes.
7. Preserve existing hints when possible.
8. Update `.review-deck/scan-record.json` with processed notes (same as Setup Flow step 11).

## Single Note Flow

### Mode A: source note
````markdown
```review-deck
source: path/to/note.md
style: ocean
title: Review Deck
```
````

### Mode B: inline cards
````markdown
```review-deck
style: ocean
title: Review Deck
cards:
  - front: Question
    back: Answer
    emoji: brain
    hint_l1: Recall trigger
    hint_l2: Context anchor
    hint_l3: Narrowing hint
```
````

### Mode C: tag-based
````markdown
```review-deck
tag: flashcards/azure
style: ocean
title: Azure Review
```
````

## L1 / L2 / L3 Design

### L1
CRITICAL: Force active recall through **strategic inquiry**. Do not write simple "what is" questions.

Preferred patterns:
- Consequences of getting it wrong: "If you use X instead of Y, what breaks?"
- Application scenarios: "When would you reach for this in practice?"
- Trade-off framing: "Why choose this over the alternative?"

PROHIBITED in L1:
- Questions that simply rephrase the answer
- Pure definition questions ("What is X?")
- Trivia questions ("Which color / name / number is X?")

### L2
CRITICAL: You **must** run `bash scripts/search_vault.sh "<card-keyword>" 20` before writing any L2. Do not skip this step.

- L2 must come from actual vault results: first-person notes, diary entries, timestamps, expressed confusions, or past learning scenes.
- Use personalized language: "On 2025/3/3 you noted...", "You once struggled with...", "You compared this to..."
- If search returns no personal context, set `l2` to empty string.

PROHIBITED in L2:
- Generic textbook descriptions
- Content invented without vault search results

### L3
- Give 1 or 2 structural narrowing keywords that point to the knowledge domain, not the answer.

PROHIBITED in L3:
- The answer itself or its spelling
- Synonyms or direct definitions of the answer (e.g., if answer is "Orange", do not write "Fruit color" or "Red-yellow color")
- Any keyword that makes the answer immediately obvious

## Card Quality Rules

- Test understanding, not trivia
- Prefer consequences, contrasts, and common confusions
- Avoid duplicate cards for the same idea
- Keep answers short enough to verify recall quickly

## Style Selection

- `ocean`: tech, engineering, AI
- `forest`: strategy, business
- `galaxy`: language, creative topics
