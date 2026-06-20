# EngramQuest Data Layout — where the plugin's own content lives

EngramQuest generates and stores its own study artifacts in fixed folders at the **vault root**
(the directory your commands run from). These are a first-class source of material — when the
user refers to "my course", "the deck", "the quest I made", they mean content in these folders,
**not** a raw vault note. Searching the vault notes for it (`obsidian search`) will find nothing
and you will wrongly conclude it does not exist.

So: before falling back to vault-note discovery, check whether the user is pointing at an
EngramQuest artifact and read it directly from the folder below.

## Vocabulary → location

| The user says… | They mean | Read from |
|---|---|---|
| "course", "課程", "教材", "lesson", "the X course" | A Lesson Academy course | `engram-quest/lessons/{courseSlug}/` |
| "deck", "review deck", "卡片", "flashcards", "複習卡" | A Review Deck | `engram-review/` |
| "quest", "quest map", "關卡", "the quest I made" | A Quest Map | a `*-quest.md` note **or** `engram-quest/state/` for progress |
| "quadrant card", "四象限卡" | A Quadrant Card (Pro) | `engram-quest/quadrant/` |

## Folder reference

```
engram-quest/
├── lessons/{courseSlug}/
│   ├── meta.json          ← course info + lessons array + completion (the index)
│   └── lsn-*.html         ← one self-contained HTML per lesson (the actual content)
├── state/{quest}.json     ← Quest Map progress / scores (not source content)
└── quadrant/{cardId}.html ← four-quadrant cards (Pro)

engram-review/
├── ai-cards/{note}.md     ← AI-generated flashcards (`question :: answer` lines)
└── hints/{note}.json      ← L1/L2/L3 hints
```

## Reading a Lesson Academy course as source material

This is the common case (a user asks to build a quest/deck/map from a course they already made):

1. **List courses** — every course is one folder:
   ```bash
   ls engram-quest/lessons/
   ```
2. **Match by title, not folder name.** The folder (`courseSlug`) is ASCII kebab-case
   (`event-storming`), but the human title the user typed ("AI 時代 Event Storming") lives
   inside `meta.json` as `title` / `topic`. Read each candidate `meta.json` and match the
   user's phrase against `title` and `topic`. Do not assume the folder name contains the title.
   ```bash
   cat engram-quest/lessons/*/meta.json
   ```
3. **Read the lesson content.** `meta.json`'s `lessons[]` array lists each lesson's `title`
   and `file`. The teaching content is in those HTML files — read them for the concepts to
   build from:
   ```bash
   cat "engram-quest/lessons/{courseSlug}/{file}.html"
   ```
   A lesson with `"file": null` is a planned outline entry with no content yet — use its title
   only, and tell the user that lesson hasn't been generated.

Once you have the course's lesson content, treat it as your source material and proceed with
the normal generation flow. You do **not** need a matching vault note — the course content
itself is enough.

## When nothing matches

If `ls engram-quest/lessons/` shows no folder whose `meta.json` title/topic matches what the
user described, say so plainly and offer to either (a) search the vault notes instead, or
(b) point them to the Lesson Academy tab to confirm the course name. Do not silently invent
content or quest from a topic the user did not actually have.
