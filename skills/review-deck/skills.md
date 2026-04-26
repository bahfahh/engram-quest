---
name: review-deck
description: 
  Manage review-deck data for the EngramQuest plugin.
  Trigger when the user asks to create, update, explain, edit, or delete a review deck,
  flashcard hints, or review-deck setup, or asks how review-deck works.
  Use this skill whenever the user wants to build or manage flashcard decks in EngramQuest — even if they do not use the exact term "review-deck".
---

# Review Deck Skill

## Reference Routing

| Goal | Action |
|---|---|
| User asks how review-deck works | Read `references/user-guide.md` and answer |
| All other tasks | Follow the flows below |

## Terminology

- **source note**: the user's original note in the vault — content source, read-only for AI
- **ai-cards file**: a card file AI creates at `engram-review/ai-cards/{note-name}.md`

For full plugin architecture details (scanning logic, tag matching, data paths), read `references/plugin-architecture.md`.

## Output Language Rule

CRITICAL: Generate user-facing output in the language that best matches the user's prompt or the source note.

- If the prompt explicitly asks for a language, follow the prompt.
- Otherwise, match the source note language.
- Keep JSON keys and structural fields in English.

This rule applies to:
`l1`, `l2`, `l3`, generated card text, explanations, and any inline deck titles or labels.

## How the Plugin Works

The plugin scans every `.md` file in the vault (including `engram-review/ai-cards/`).
A file becomes a deck when it has **both**: `question :: answer` lines **and** a tag matching the configured prefix.
For full scanning logic, see `references/plugin-architecture.md`.

## Data Locations

| Data | Path |
|---|---|
| Plugin settings | `.obsidian/plugins/engram-quest/data.json` |
| Hints | `engram-review/hints/{note-name}.json` |
| Scan record | `engram-review/scan-record.json` |
| AI-generated cards | `engram-review/ai-cards/{note-name}.md` |
| SR schedules | `engram-review/sr/{note-name}.json` |

## Output Scope

CRITICAL: When completing any Setup Flow or Single Note Flow, strictly limit your output to:
- Generating AI card files at `engram-review/ai-cards/{note-name}.md`
- Generating hint JSON files at `engram-review/hints/{note-name}.json`

PROHIBITED — do not do any of the following:
- Modifying source notes to insert card content
- Adding flashcard tags to source notes without user confirmation
- Writing <!--SR:!...--> comments anywhere
- Creating navigation pages, dashboard files, or index files

Code block examples in this document are syntax references only. Do not treat them as deliverables to create.

Task is complete when AI card files and JSON hints are generated. Stop there.

## Trigger Mapping

| User asks | Action |
|---|---|
| Build a review deck for a topic | Setup Flow |
| Update hints for a topic | Update Flow |
| Add cards to a topic | Edit note content + update hints |
| Make a review-deck from a note | Single Note Flow |
| Fix / correct a card | Edit Flow |
| Change a card's question or answer | Edit Flow |
| Delete a card | Delete Flow |
| Remove hints for a note | Delete Flow |

## Scan Record

The file `engram-review/scan-record.json` tracks which source notes have already been read by AI to avoid duplicate card creation.

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

0. Load scan record: read `engram-review/scan-record.json` if it exists. If missing, treat as `{ "lastScan": null, "notes": {} }`.
1. Read `.obsidian/plugins/engram-quest/data.json` using:
   `obsidian read path=".obsidian/plugins/engram-quest/data.json"`
   Extract the `flashcardTags` field. This is the user's configured tag prefix (e.g., `mycard`, `flashcards`, or multiple space-separated values). If the file does not exist or the field is empty, default to `flashcards`. Use this value — not a hardcoded string — for all tag operations in this session.
2. Ensure `engram-review/config.json` exists.
3. Check for a pre-existing knowledge index or graph in the vault (e.g. `graphify-out/GRAPH_REPORT.md`, `graph.json`). If found, use its key concepts and community structure to prioritize which notes to process first and to identify high-value card candidates. This supplements — not replaces — the tag-based note discovery below.
4. Determine scope and choose the appropriate discovery path:
   IMPORTANT: When vault search is needed, use Obsidian CLI (`obsidian search`). For full syntax, query operators, and fallback rules, see `references/obsidian-cli.md`.
   - If the user specifies a single note → read it directly. Skip discovery entirely.
   - Otherwise:
     a. Check for a graph index (`graphify-out/GRAPH_REPORT.md` or `graph.json`). If found, read it — use its note paths and key concepts directly. No further search needed.
     b. If no graph index → `obsidian search query="path:<topic> OR tag:#<topic>" format=json`
     c. If `obsidian search` fails (CLI not available) → `bash scripts/search_vault.sh "<topic>" 30`
        WARNING (Windows): always invoke as `bash scripts/search_vault.sh ...`. Running the `.sh` file directly on Windows opens it in an editor instead of executing it. If `bash` is not in PATH, use the full path to Git Bash or WSL bash (e.g. `"C:\Program Files\Git\bin\bash.exe" scripts/search_vault.sh ...`).
5. Note discovery does NOT require source notes to have flashcard tags. AI can read any source note as content input. The flashcard tag is only required on the **file the plugin will scan** (see Terminology). For AI-generated cards, AI sets the tag on the ai-cards output file.
6. Only use untagged `question :: answer` notes when the user explicitly wants legacy flashcard migration.
7. For each note found: run `bash scripts/get_mtime.sh "<note-path>"` to get current mtime. If the note is already in scan-record AND mtime matches, skip it — it has not changed since last processing. Only read and process notes that are new or have a changed mtime.
8. Read each non-skipped note and identify:
   a. Key concepts/topics covered in the note
   b. Existing user-written `question :: answer` cards (read-only — do NOT modify the source note)
   c. Whether AI needs to generate new cards (note has no cards)

   - If the note already has user-written cards → only read them, proceed to generate hints
   - If the note has no cards → AI generates cards, saves to `engram-review/ai-cards/{note-name}.md`
     - frontmatter must include a tag matching the prefix from step 1 (e.g. `flashcards/topic`)
     - frontmatter must also include `TARGET DECK: {topic}` where `{topic}` is the sub-path after the prefix (e.g. tag `flashcards/backend/architecture` → `TARGET DECK: backend/architecture`). This enables Obsidian_to_Anki compatibility.
     - do NOT insert cards into the source note
     - **Card format rules:**
       - Default format: `question :: answer` (single line, plain text)
       - If the question OR answer contains code snippets, use `Q:/A:` multi-line format and wrap code in fenced code blocks with the appropriate language tag. Example:
         ```
         Q: Which approach is truly parallel?
         A: Approach B is parallel because both tasks start simultaneously:
         ```csharp
         var sqlTask = RunSql(...);
         var vectorTask = context.CallActivity(...);
         var sqlRows = await sqlTask;
         var vectorRows = await vectorTask;
         ```
         ```
       - Never inline code directly into a `question :: answer` single-line card — it will not render correctly.

9. Before generating cards, collect all L2 search keywords from every card to be generated across all non-skipped notes.
   Combine into a single call:
   `bash scripts/search_vault.sh "<kw1 kw2 kw3 ...>" 50`
   One call covers all cards. Split into 2–3 batches only if keywords exceed 15.
   Match results back to each card's concept before writing L2.
10. Generate `engram-review/hints/{note-name}.json`.
    If the file already exists (re-run), overwrite it entirely with fresh hints based on current cards.
    Do NOT merge with old hints — the card set may have changed.
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
    **Card-level `source` field (use when a card comes from a different note than the file-level `note`):**
    ```json
    {
      "note": "Study/Azure.md",
      "generated": "YYYY-MM-DD",
      "cards": {
        "What is VNet?":   { "l1": "...", "l2": "...", "l3": "...", "source": "Study/Azure.md" },
        "What is subnet?": { "l1": "...", "l2": "...", "l3": "...", "source": ["Study/Azure.md", "Study/Network.md"] }
      }
    }
    ```
    - `source`: card-level override for the source note button. String or array of vault-relative paths.
    - If card is derived from a note, set `source` to that note's path. If card is AI-creative (no specific source), omit `source` or set `null` to suppress the button.
    CRITICAL: `"note"` (file-level) MUST be the full vault-relative path of the **primary source note** (e.g. `"Study/Azure Notes.md"`), NOT the ai-cards file path. The plugin uses this field to resolve the source note for Memory Map linking. Writing the ai-cards path here breaks that resolution.
    WRONG — do NOT use array format:
    ```json
    { "cards": [{ "front": "...", "l1": "..." }] }
    ```
11. CRITICAL: Before finishing, verify tag coverage based on card flow:
    - **User-written cards** (cards live in the source note): verify the **source note** has at least one tag matching the prefix from step 1. If missing, report to user and ask before adding — do NOT add silently.
    - **AI-generated cards** (cards live in `engram-review/ai-cards/`): verify the **ai-cards file** has the tag in its frontmatter. This should already be set at creation time (step 8). No user confirmation needed. Do NOT check or modify source notes for tags in this flow.
12. Update `engram-review/scan-record.json`: set `lastScan` to current ISO timestamp; for each note that was read and processed, set `processedAt`, `mtime`, and `cards`; preserve all existing entries for skipped notes; write the file back.
13. Report: how many notes were skipped (already up-to-date), how many were processed, how many cards total, how many L2 hints were left empty, and how many notes had the tag prefix added.

## Update Flow

1. Read `.obsidian/plugins/engram-quest/data.json` to get the `flashcardTags` prefix (same as Setup Flow step 1).
2. Load scan record: read `engram-review/scan-record.json` if it exists.
3. Find relevant notes again.
4. For each note: run `bash scripts/get_mtime.sh "<note-path>"` and compare to scan-record. Skip notes whose mtime has not changed since last processing.
5. Read existing hints JSON if present for non-skipped notes.
6. Add hints only for new cards in non-skipped notes.
7. Preserve existing hints when possible.
8. Update `engram-review/scan-record.json` with processed notes (same as Setup Flow step 11).

## Edit Flow

Use when the user wants to fix or change an existing card's front text, back text, or hints.

1. Identify the target card. If the user doesn't specify, ask which note/deck the card is in.
2. Determine card type:
   - **User-written card**: the `question :: answer` line lives in the source note.
   - **AI-generated card**: the `question :: answer` line lives in `engram-review/ai-cards/{note-name}.md`.
   Check `engram-review/ai-cards/` first; if the card is found there, it is AI-generated.
3. Find and update the `question :: answer` line in the correct file (ai-cards file or source note):
   - If editing front text: replace the text before `::`.
   - If editing back text: replace the text after `::`.
   - SR scheduling data is stored in `engram-review/sr/` — do NOT look for or modify SR comments in the markdown file.
4. Read `engram-review/hints/{note-name}.json`.
   - If the front text changed: rename the key in `cards` to match the new front text exactly.
   - Update `l1`, `l2`, `l3` values if the user requested hint changes, or if the front change makes existing hints inaccurate.
5. Write both the updated card file and the updated hints JSON.
6. If the front text changed: read `engram-review/sr/{note-name}.json`, rename the key matching the old front text to the new front text, and write the file back. Skip if the file does not exist or the key is not present.
   CRITICAL: card front text may contain `"`, `\`, newlines, or other special characters. Always use a proper JSON library to parse and serialize — never construct the JSON string manually. Python: `json.loads` / `json.dumps(data, ensure_ascii=False, indent=2)`. Node.js: `JSON.parse` / `JSON.stringify(data, null, 2)`.
7. Update `engram-review/scan-record.json`: update `mtime` for the affected note.
8. Report: which card was changed, what changed (front / back / hints), and confirm all files were updated.

CRITICAL: The key in `engram-review/hints/{note-name}.json` must always exactly match the front text in the card file. If they diverge, the plugin cannot load the hint.

## Delete Flow

Use when the user wants to remove one or more cards entirely, or remove hints for a note.

### Delete a card

1. Identify the target card(s) to delete.
2. Determine card type (same as Edit Flow step 2): check `engram-review/ai-cards/` first.
3. Remove the `question :: answer` line from the correct file:
   - **AI-generated card**: remove the line from `engram-review/ai-cards/{note-name}.md`. If the file becomes empty (no cards left), delete the entire ai-cards file.
   - **User-written card**: remove the line from the source note. There are no SR comments in markdown files — do NOT look for them.
4. Write the updated file.
5. Read `engram-review/hints/{note-name}.json`. Remove the key matching the deleted card's front text. If no keys remain in `cards`, delete the entire hint file.
   CRITICAL: Always use a proper JSON library to parse and serialize — never construct JSON strings manually. Python: `json.loads` / `json.dumps(data, ensure_ascii=False, indent=2)`. Node.js: `JSON.parse` / `JSON.stringify(data, null, 2)`.
6. Read `engram-review/sr/{note-name}.json`. Remove the key matching the deleted card's front text. If the file exists and the key is present, write it back without that key.
   CRITICAL: Same serialization rule — use a JSON library, not string manipulation.
7. Update `engram-review/scan-record.json`: update `mtime` and `cards` count for the affected note. If the note now has 0 cards, remove its entry from `notes`.
8. Report: which card(s) were deleted, whether the hint file was updated or removed.

### Remove all hints for a note

1. Delete `engram-review/hints/{note-name}.json`.
2. Remove the note's entry from `engram-review/scan-record.json`.
3. Report: hint file removed, scan-record updated.

CRITICAL: Never delete the source note itself unless the user explicitly asks to delete the note file.

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
- Questions that give away the answer

### L2
CRITICAL: L2 must come from a vault search. Use the batched search from Step 9 — do NOT run a separate `search_vault.sh` call per card. Match each card's keyword against the already-collected batch results before writing L2.

- L2 must come from actual vault results: first-person notes, diary entries, timestamps, expressed confusions, or past learning scenes.
- Use personalized language: "On 2025/3/3 you noted...", "You once struggled with...", "You compared this to..."
- If search returns no personal context, set `l2` to empty string.

PROHIBITED in L2:
- Generic textbook descriptions
- Content invented without vault search results
- Inference expansion: if vault uses a vague term (e.g. "a plugin", "a website", "a project"), keep it vague — do not replace it with a specific name or inferred identity. Only use words that literally appear in the vault search results.

### L3
- Give 1 or 2 structural narrowing keywords that point to the knowledge domain, not the answer.

PROHIBITED in L3:
- The answer itself or its spelling
- Synonyms or direct definitions of the answer (e.g., if answer is "Orange", do not write "Fruit color" or "Red-yellow color")
- Any keyword that makes the answer immediately obvious

## Card Quality Rules

### Card Front Requirements

**Self-contained**: the question must be understandable without reading the source note.
- Must include the framework/concept name and enough context.
- PROHIBITED: questions lacking a clear subject ("What are the four AI workflow stages in order?" → which workflow?)
- Good example: "In the Skill standardization workflow, how do you decide whether to upgrade to a zero-token script?"

**Test understanding, not trivia**:
- PROHIBITED: asking for a count ("How many?"), list order, or bare names.
- Correct approach: give the known number/structure in the question; test the substance in the answer.
- Bad example: "How many atomic operations does Text-to-MAM consolidate memory operations into?"
- Good example: "Text-to-MAM consolidates memory operations into 12 atomic operations across three phases — what is the responsibility of each phase?"

### Card Back Requirements

- Must be substantive content, not just a number or a name.
- A correct answer should demonstrate genuine understanding, not just recent exposure.

## Style Selection

- `ocean`: tech, engineering, AI
- `forest`: strategy, business
- `galaxy`: language, creative topics
