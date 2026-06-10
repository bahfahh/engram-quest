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
    └── lsn-1717977700000-linq.html
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
  "lessons": [
    {
      "id": "lsn-1717977600000",
      "title": "型別系統基礎",
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
| `tags` | string[] | 2–3 short tags, user's language |
| `colorScheme` | string | Exactly one of: `indigo` `green` `amber` `rose` `cyan` |
| `starred` | bool | Course-level star — plugin-owned, initialize `false`, never reset on update |
| `createdAt` | string | `YYYY-MM-DD`, set once at course creation |
| `lessons` | array | **Array order = display order.** No order field exists. |
| `lessons[].id` | string | `lsn-<unix-ms>`. Unique forever; never reuse or renumber |
| `lessons[].title` | string | Lesson title, user's language |
| `lessons[].file` | string \| null | Filename (not path) of the HTML inside the course folder. **`null` = planned** (outline entry without content yet — see below) |
| `lessons[].source` | string | `"skill"` for generated lessons. (`"import"` is written by the plugin's import button — never set it yourself) |
| `completion` | object | Keyed by lesson id — **plugin-owned progress state** |

### Ownership rules (read carefully)

The skill and the plugin share this file, so writes must merge, not replace:

- **Skill owns**: `title`, `topic`, `icon`, `description`, `tags`, `colorScheme`,
  `createdAt`, and `lessons[]` entries with `source:"skill"`.
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

## Planned lessons (outline entries, `file: null`)

The plugin's "Create course" form (and the skill itself, when the user only wants an outline)
can write lesson entries with `"file": null` — a title-only placeholder shown as "待生成 /
Planned" in the UI:

```json
{ "id": "lsn-1718000000000", "title": "REST API 設計", "file": null, "source": "skill" }
```

When the user asks to "generate my course" / "把課綱生成內容" / "fill in the lessons":
1. Read meta.json, find every entry with `file: null`.
2. Generate HTML for each, **keeping the entry's existing `id`** (progress and order depend
   on it). Filename = `<existing-id>-<short-ascii-slug>.html`.
3. Set the entry's `file` to the new filename. Touch nothing else in the entry.

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
