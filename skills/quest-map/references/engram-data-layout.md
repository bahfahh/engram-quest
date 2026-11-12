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
| "quest", "quest map", "關卡", "the quest I made" | A Quest Map | `engram-quest/quests/{questSlug}/` (an older quest is a `*-quest.md` note); progress is in `engram-quest/state/` |
| "explainer", "詳解" | An Explainer page (Pro) | `engram-quest/explainer/` |

## Folder reference

```
engram-quest/
├── lessons/{courseSlug}/
│   ├── meta.json          ← course info + lessons array + completion (the index)
│   └── lsn-*.html         ← one self-contained HTML per lesson (the actual content)
├── quests/{questSlug}/
│   ├── meta.json          ← the map and its nodes
│   └── nodes/*.html       ← one self-contained HTML per mission
├── state/{quest}.json     ← Quest Map progress / scores (not source content)
└── explainer/{id}.html ← explainer pages (Pro; metadata in explainer/meta/)

engram-review/
├── ai-cards/{note-key}.md ← AI-generated flashcards (`question :: answer` lines)
└── hints/{note-key}.json  ← L1/L2/L3 hints
```

`{note-key}` = the source note's path with `/` replaced by `__`, no `.md`. Older files are named by the note name alone and are still read.

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
   and `file`. The teaching content is in those HTML files — use the **Read tool** (not `cat`)
   to open them. `cat` has Windows encoding failures on CJK content; Read handles UTF-8 natively.

   ```
   Read: engram-quest/lessons/{courseSlug}/{file}
   ```

   Each lesson may carry a `goal` (what the learner can do after it) and the course a `mission`
   (who is learning and why). When present, these say what the course set out to build; read
   them before the HTML. Read as much of the lessons as it takes to know what was actually
   taught and with which examples; in a long course the goals and titles show which lessons to
   read in full.

   A lesson with `"file": null` is a planned outline entry: nothing has been taught yet, so
   there is nothing to practise from it. Leave it out, and tell the user which lessons the
   result does not cover.

Once you have the course's lesson content, treat it as your source material and proceed with
the normal generation flow. You do **not** need a matching vault note — the course content
itself is enough.

## When nothing matches

If `ls engram-quest/lessons/` shows no folder whose `meta.json` title/topic matches what the
user described, say so plainly and offer to either (a) search the vault notes instead, or
(b) point them to the Lesson Academy tab to confirm the course name. Do not silently invent
content or quest from a topic the user did not actually have.
