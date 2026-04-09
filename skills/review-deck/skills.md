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

Important: generate user-facing output in the language that best matches the user's prompt or the source note.

- If the prompt explicitly asks for a language, follow the prompt.
- Otherwise, match the source note language.
- Keep JSON keys and structural fields in English.

This rule applies to:
`l1`, `l2`, `l3`, generated card text, explanations, and any inline deck titles or labels.

## How the Plugin Works

1. The plugin scans vault notes.
2. Any line with `question :: answer` is a flashcard.
3. By default, the plugin scans notes with matching flashcard tag prefixes, default `flashcards`.
4. If the user enables legacy `::` note scanning in plugin settings, untagged flashcard notes can also be included for migration.
5. Hints are loaded from `.review-deck/hints/{note-name}.json`.
6. SR progress is stored as `<!--SR:!YYYY-MM-DD,interval,stability,difficulty,state-->` (FSRS-4 format). Legacy SM-2 format (`<!--SR:!YYYY-MM-DD,interval,ease-->`) is read and auto-migrated on next rating. Do not manually insert SR comments.

## Data Locations

| Data | Path |
|---|---|
| Plugin config | `.review-deck/config.json` |
| Hints | `.review-deck/hints/{note-name}.json` |
| Cards | Any markdown note with `question :: answer` |
| SR metadata | HTML comment after each card |

## Trigger Mapping

| User asks | Action |
|---|---|
| Build a review deck for a topic | Setup Flow |
| Update hints for a topic | Update Flow |
| Add cards to a topic | Edit note content + update hints |
| Make a review-deck from a note | Single Note Flow |

## Setup Flow

1. Ensure `.review-deck/config.json` exists.
2. Find notes relevant to the topic across the vault.
3. Prefer notes with matching flashcard tags such as `flashcards/<topic>`.
4. Only use untagged `question :: answer` notes when the user explicitly wants legacy flashcard migration.
5. Read each note and collect exact front text from `question :: answer`.
6. Use `bash scripts/search_vault.sh "<query>" 20` when you need real vault context for L2.
7. Generate `.review-deck/hints/{note-name}.json`.
8. Report how many notes/cards were processed and how many L2 hints were left empty.

## Update Flow

1. Find relevant notes again.
2. Read existing hints JSON if present.
3. Add hints only for new cards.
4. Preserve existing hints when possible.

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
- Force active recall
- Ask about a scenario, consequence, or tradeoff
- Do not paraphrase the answer too directly

### L2
- Must come from real vault context
- Prefer first-person notes, diary context, frustrations, or learning scenes
- If no real context exists, set `l2` to an empty string

### L3
- Give 1 or 2 narrowing keywords
- Do not reveal the answer directly

## Card Quality Rules

- Test understanding, not trivia
- Prefer consequences, contrasts, and common confusions
- Avoid duplicate cards for the same idea
- Keep answers short enough to verify recall quickly

## Style Selection

- `ocean`: tech, engineering, AI
- `forest`: strategy, business
- `galaxy`: language, creative topics
