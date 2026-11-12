# 05 What is shared with the EngramQuest plugin

The plugin shows, plays and schedules; it never makes content and never calls a model. Everything passes through files. Read-modify-write the JSON files: change your fields, leave the rest.

## Files

| What | Path | Written by | Read by |
|---|---|---|---|
| Film series | `engram-quest/videos/episodic-recall/meta.json` | skill: `videos[]`, `kind`, `requests[].status`. Plugin: `requests[]` (new, removed), `progress` | both |
| Films, posters | `engram-quest/videos/episodic-recall/<id>.mp4`, `<id>.jpg` | skill | plugin |
| Default length | `engram-quest/videos/settings.json` -> `episodicLength` (`short` / `medium` / `long`) | plugin | skill, read only |
| Pack | `engram-quest/episodic-review/packs/<period>/pack.json` (+ overview page, `chapters.json`) | skill | plugin, pages built from it |
| Topic cache | `engram-quest/episodic-review/topics/<id>/topic.json` | skill | skill next period |
| Cards and hints | `engram-review/ai-cards/*.md`, `engram-review/hints/*.json` | skill (`build_pack.py`) | the Review Deck |

## `meta.json`

```json
{
  "title": "...", "status": "ready", "kind": "episodic",
  "requests": [{"id": "req-1730000000000", "period": "2026-11", "length": "medium", "status": "pending", "createdAt": "..."}],
  "videos": [{
    "id": "topic-example", "title": "...", "file": "topic-example.mp4", "poster": "topic-example.jpg",
    "duration": 593, "style": "episodic-map", "mode": "basic", "source": "skill",
    "period": "2026-10", "length": "long", "createdAt": "2026-11-11T10:00:00Z",
    "topics": [{"title": "...", "topicId": "t-example", "from": 68.8, "to": 146.2}],
    "notTaken": ["Topic X"], "credits": "Music: ..."
  }],
  "progress": {"topic-example": {"position": 120, "completed": false, "lastViewed": "..."}}
}
```

- `kind: "episodic"` is how the plugin recognises the series.
- `requests[]`: a `pending` entry is the user asking for a film from the plugin. Use its period and length; pass `--request-id` to `deliver.py` to mark it `done`.
- `period`: `"2026-10"` or `"2026-08..2026-09"`. `length`: the tier. `createdAt` orders several films for one period.
- `topics[]`: chapters in seconds. `topicId` is optional and links a chapter to a pack topic.
- `style` is a free string: `episodic-map` for the films this skill makes. Entries made earlier keep the style they have.
- `credits`: required when the score uses the bundled samples.
- A missing field means "none". Never rename a field.

## Pack and topic files

`pack.json`: `{period, builtAt, topics: [{id, title, domain, question, answer, context, depth, quick, filmed, filmScore, sr}], filmOrder}`.

`topic.json`: the full entry of `02-content.md` §5, plus `cachedAt`, `periods`, `noteMtime`.

Cards are ordinary Review Deck files with two extra front-matter keys, `topic` and `period`, in a deck named after the period. Hints never contain the answer.

`chapters.json` maps a topic id to the film passages that cover it: `{"<topic id>": [{"film": "<video id>", "label": "...", "from": 0, "to": 0}]}`.
