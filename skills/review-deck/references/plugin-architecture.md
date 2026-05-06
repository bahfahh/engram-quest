# Plugin Architecture — Review Deck

Read this file when you need to understand how the plugin scans and displays cards.
This is reference material; the execution steps are in `skills.md`.

## Terminology

- **source note**: the user's original note in the vault (read-only for AI)
- **ai-cards file**: a card file AI creates at `engram-review/ai-cards/{note-name}.md`

## How the Plugin Scans Cards

The plugin calls `scanReviewDecks()` which iterates over **every** `.md` file in the vault (including `engram-review/ai-cards/`). For each file it:

1. Parses supported card formats (`question :: answer`, `Q:/A:`, `---` fenced Q/A, `%%card%%`, and Cloze) → cards
2. Reads the file's tags (YAML frontmatter + inline `#tags`)
3. Checks if any tag matches the user-configured `flashcardTags` prefix (default `flashcards`)
4. If no tag matches **and** legacy `enableSRScan` is off → file is skipped entirely

Both conditions must be true for a file to appear as a deck:
- The file contains at least one supported card
- The file has a tag matching the configured prefix (e.g. `#flashcards/math`)

## Two Card Flows

| Flow | Who writes cards | Where cards live | Who must set the tag |
|---|---|---|---|
| User-written | User | source note | User (in the source note) |
| AI-generated | AI | `engram-review/ai-cards/{note-name}.md` | AI (in the ai-cards file frontmatter) |

In both flows the plugin scans the **file that contains the cards**. The tag must be on that same file.

### User-written cards flow
The user writes supported card formats directly in their source note and adds a `#flashcards/...` tag. `Q:/A:` remains the everyday multi-line format; `%%card%%` is only for long pasted answers where `---` must stay inside the answer. The plugin scans the source note.

Cards support embedded images using `![[image.png]]` (wiki-link) or `![](path/to/image.png)` (standard markdown). The plugin post-processes `MarkdownRenderer` output to resolve `.internal-embed` elements into actual `<img>` tags via `vault.getResourcePath()`.

### AI-generated cards flow
AI reads the source note for content, then creates a separate file under `engram-review/ai-cards/`. That ai-cards file must contain:
- YAML frontmatter with a `tags:` field matching the configured prefix
- supported card formats

The source note is never modified. The plugin scans the ai-cards file, not the source note.

When the plugin detects a card from `engram-review/ai-cards/`, it builds a related-note context from the corresponding hints JSON:
- `cards[front].source` is the preferred per-card relation signal
- file-level `note` is the fallback primary source signal

Memory Map discovery for review cards is folder-first:
1. same folder as the related note(s)
2. same topic / deck context
3. canvas file-node relations

This means aggregated AI decks remain supported as long as the hints and deck naming preserve useful topic/source context.

## Data Locations

| Data | Path |
|---|---|
| Plugin settings | `.obsidian/plugins/engram-quest/data.json` |
| Plugin config | `engram-review/config.json` |
| Hints | `engram-review/hints/{note-name}.json` |
| Scan record | `engram-review/scan-record.json` |
| User-written cards | source notes (any `.md` with supported cards + matching tag) |
| AI-generated cards | `engram-review/ai-cards/{note-name}.md` |
| SR schedules | `engram-review/sr/{srFileName}.json` |

### SR file naming

`srFileName(notePath)`: replace `/` with `__`, strip `.md`.
- `Study/Azure Notes.md` → `Study__Azure Notes.json`
- Prevents collision between same-name notes in different folders.
- `loadSrData` checks new format first, falls back to legacy `{noteName}.json`.

## Tag Prefix Matching

`matchFlashcardTagPrefix(tags, flashcardTags)`:
- Splits `flashcardTags` setting by whitespace/comma
- For each tag on the file, checks if it equals or starts with any prefix + `/`
- Returns the first sub-topic segment as the deck name (e.g. `flashcards/math` → `math`)
- Returns `null` if no match

## Legacy Mode

When `enableSRScan` is on, files with `question :: answer` but no matching tag are also included. The deck name falls back to the parent folder name. This is a migration feature, not the default.
