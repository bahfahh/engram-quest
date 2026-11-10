# Lesson Format — directory layout & meta.json contract

This file defines the exact on-disk format the EngramQuest plugin reads. The plugin's data
layer (`src/lessons/data.js`) parses these files; deviating from this shape makes courses
invisible or breaks progress tracking.

## Directory layout

```
engram-quest/lessons/
└── {courseSlug}/                      ← short kebab-case ASCII, one folder per course
    ├── meta.json                      ← course contract (below)
    ├── lsn-1717977600000-types.html   ← one self-contained HTML per lesson
    ├── lsn-1717977700000-linq.html
    └── lsn-1717977800000-map.canvas   ← canvas lesson step (type:"canvas" — see canvas-recipe.md)
```

`courseSlug` rules: lowercase ASCII letters, digits, hyphens. No spaces, no CJK (the slug is a
folder name; the human-readable title lives in meta.json).

## meta.json schema

```json
{
  "title": "dotnet 入門",
  "topic": "dotnet",
  "icon": "🔷",
  "description": "從型別系統到 LINQ，給後端新手的 .NET 基礎課。",
  "tags": ["programming", ".NET"],
  "colorScheme": "indigo",
  "starred": false,
  "createdAt": "2026-06-10",
  "mission": "下個月接手公司的 .NET 後端專案；寫過 Python，沒碰過靜態型別；只在通勤時用手機讀。",
  "lessons": [
    {
      "id": "lsn-1717977600000",
      "title": "型別系統基礎",
      "goal": "看到一段 C# 宣告，能說出每個變數的型別，以及編譯器會擋下哪些賦值",
      "file": "lsn-1717977600000-types.html",
      "source": "skill"
    }
  ],
  "completion": {
    "lsn-1717977600000": { "viewed": false, "completed": false, "starred": false }
  }
}
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `title` | string | Human-readable course name, user's language |
| `topic` | string | Short topic keyword (used for matching later requests to this course) |
| `icon` | string | One emoji, shown on the course card |
| `description` | string | One sentence for the course card (2-line clamp in UI) |
| `tags` | string[] | 1–2 short tags, user's language |
| `colorScheme` | string | One of: `indigo` `green` `amber` `rose` `cyan` `violet` `blue` `teal` `lime` `orange` `fuchsia` `slate`. The plugin sets it when the user creates a course there; keep an existing value |
| `starred` | bool | Course-level star — plugin-owned, initialize `false`, never reset on update |
| `createdAt` | string | `YYYY-MM-DD`, set once at course creation |
| `mission` | string | Optional. What the course is for, in the learner's words and language: why they are learning this, where they start from, and whatever in their situation changes how a lesson should be built. See "The plan" below |
| `lessons` | array | **Array order = display order.** No order field exists. |
| `lessons[].id` | string | `lsn-<unix-ms>`. Unique forever; never reuse or renumber |
| `lessons[].title` | string | Lesson title, user's language |
| `lessons[].goal` | string | Optional. What the learner can do after this lesson, user's language. The plugin shows it under the title. See "The plan" below |
| `lessons[].file` | string \| null | Filename (not path) inside the course folder. **`null` = planned** (outline entry without content yet — see below) |
| `lessons[].type` | string | `"html"` (default — may be omitted) or `"canvas"`. Canvas lessons open in a native Obsidian Canvas tab; their `file` is a `.canvas` (never ending `-memory.canvas`). Generation rules: `canvas-recipe.md` |
| `lessons[].source` | string | `"skill"` for generated lessons. (`"import"` is written by the plugin's import button — never set it yourself) |
| `completion` | object | Keyed by lesson id — **plugin-owned progress state** |

### Ownership rules (read carefully)

The skill and the plugin share this file, so writes must merge, not replace:

- **Skill owns**: `title`, `topic`, `icon`, `description`, `tags`, `colorScheme`,
  `createdAt`, `mission`, and `lessons[]` entries with `source:"skill"` (their `goal` included).
- **Plugin owns**: `starred`, the entire `completion` map, and `lessons[]` entries with
  `source:"import"` (user-imported HTML).

When updating an existing course:
1. Read the current meta.json.
2. Apply your changes (append lessons, fix a title, …).
3. Preserve everything else byte-for-byte semantically — especially `completion`,
   `starred`, and any `source:"import"` lesson entries.
4. For each lesson you add, also add
   `completion[id] = { "viewed": false, "completed": false, "starred": false }`.

When regenerating one lesson's HTML (user asked for a redo): keep the same `id` and `file`,
overwrite only the HTML file. The completion state then carries over automatically.

## The plan (`mission` and `goal`)

A course is designed once and generated over many conversations. `mission` and each lesson's
`goal` are the part of that design the next conversation cannot work out again: a title names a
subject, and only the goal says what the lesson has to make the learner able to do, for whom.

- Write both whenever an outline is written, whether its lessons are generated now or left
  planned.
- Read both before generating or extending anything in an existing course, and build from them.
- Both are optional in the file. A course or entry made in the plugin has none, and neither does
  a course older than these fields. Settle what is missing before generating from it and write
  it back, so the plan is settled once.
- A goal changes when the user changes the plan, not when a lesson is generated or redone.

The plugin never sets or edits either field and keeps them through every change it makes to a
course.

## Planned lessons (outline entries, `file: null`)

The plugin's "Create course" form (and the skill itself, when the user only wants an outline)
can write lesson entries with `"file": null` — a placeholder without content, shown as "待生成 /
Planned" in the UI. One written by the skill carries its `goal`; one the user typed in the
plugin is a title only:

```json
{ "id": "lsn-1718000000000", "title": "REST API 設計", "goal": "能為一個資源設計出一致的路徑與狀態碼", "file": null, "source": "skill" }
```

A planned entry may also carry `"type": "canvas"` — the outline already commits that step to
being a concept map, and the UI shows it with a 🗺️ badge. The plugin's outline row has a 🗺️
toggle too, so user-added planned canvas entries look the same.

When the user asks to "generate my course" / "把課綱生成內容" / "fill in the lessons":
1. Read meta.json: the `mission`, and every entry with `file: null`.
2. Generate each entry toward its `goal` for the learner the `mission` describes (settling
   either first if it is missing — see "The plan"), **keeping the entry's existing `id`**
   (progress and order depend on it). Filename = `<existing-id>-<short-ascii-slug>.html` — or
   `.canvas` when the entry has `"type": "canvas"` (follow `canvas-recipe.md`).
3. Set the entry's `file` to the new filename. Leave the rest of the entry as it was.

The skill may also create outline-only courses (all `file: null`) when the user wants to
review/edit the plan in the plugin UI before committing to generation.

## Completion map (plugin-written, for your reference)

The plugin writes these as the user studies — you may read them to decide what to teach next:

```json
"completion": {
  "lsn-1717977600000": {
    "viewed": true,            ← opened at least once
    "completed": true,         ← user pressed "mark done"
    "starred": false,          ← user starred this lesson
    "lastViewed": "2026-06-10T10:00:00.000Z"
  }
}
```

"Continue my course" = generate/point to the first lesson whose `completed` is false.
