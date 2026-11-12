# Synapse Plugin Architecture Reference

## Data Locations

| File | Purpose |
|---|---|
| `engram-review/synapse/_status.json` | Global feature flag + last-run metadata |
| `engram-review/synapse/{srFileName}.json` | Per-note anchor and relation recommendations |
| `engram-review/synapse/_catalog.json` | The catalog entries the last run considered: `{ "markedAt", "seen": ["<type>\|<ref>", …] }`. Written only by `dump_sr_pool --mark-seen <catalogToken>`, read only by the dumper; the plugin ignores it |
| `engram-review/sr/{srFileName}.json` | SR schedules (read-only input for this skill) |
| `engram-review/ai-cards/{name}.md` | AI-generated cards (read-only input) |
| `engram-review/hints/*.json` | The note(s) a card was made from (read-only; used to find links the plugin already draws) |
| `engram-quest/…` | Lessons, videos, explainer pages, recall topics (read-only; see "Content Catalog") |

`srFileName(notePath)` = replace `/` with `__` and strip `.md`.

Example: `engram-review/ai-cards/Foo.md` → SR file `engram-review__ai-cards__Foo.json`
→ Synapse file `engram-review__ai-cards__Foo.json` (parallel naming).

## _status.json Schema

```json
{
  "enabled": true,
  "reason": "ok",
  "masteredPoolSize": 23,
  "threshold": 10,
  "generatedAt": "2026-05-10T10:00:00Z",
  "skillVersion": "1.0"
}
```

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | The plugin shows ⚡ buttons only when this is `true` |
| `reason` | string | `"ok"`, `"pool-too-small"`, `"not-generated"` |
| `masteredPoolSize` | number | Count of cards with stability ≥ 7 at last run. The plugin compares this against current pool to decide refresh banner. |
| `threshold` | number | The pool-size gate threshold (currently 10) |
| `generatedAt` | ISO8601 | Plugin uses this to detect staleness (≥ 28 days → banner) |
| `skillVersion` | string | Reserved for forward compatibility |

## Per-Note JSON Schema

```json
{
  "_meta": {
    "generatedAt": "2026-05-10T10:00:00Z",
    "skillVersion": "1.0",
    "masteredPoolSize": 23,
    "sourceNotePath": "engram-review/ai-cards/Event_Storming_01_Fundamentals.md"
  },
  "cards": {
    "<exact card front text>": {
      "anchors": [
        {
          "front": "<anchor card front text>",
          "back": "<anchor card back text, copied from the dump>",
          "notePath": "engram-review/ai-cards/Event_Storming_02_Strategic_Design.md",
          "stability": 17.108,
          "score": 9,
          "reason": "Both define DDD strategic boundaries"
        }
      ],
      "relations": [
        { "type": "lesson", "ref": "ddd-strategic-design/lsn-1751299200003", "score": 8, "reason": "This lesson draws the same kind of boundary" }
      ],
      "userRejected": []
    }
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `_meta.sourceNotePath` | string | The note this synapse file is for; helpful for debugging |
| `cards.{front}` | object | Key is the **exact card front string** (whitespace-trimmed) |
| `anchors[].front` | string | Anchor's front text (used by the plugin for lookup) |
| `anchors[].back` | string | Anchor's back text; the plugin shows it when the anchor is opened |
| `anchors[].notePath` | string | Anchor's full vault-relative path |
| `anchors[].stability` | number | Anchor's FSRS stability at the time of generation |
| `anchors[].score` | number 7-10 | AI's self-rating |
| `anchors[].reason` | string | One short sentence shown in the UI, before the answer is revealed |
| `relations[]` | array | Optional. Entries written before relations existed have no such key and stay valid |
| `relations[].type` | string | `lesson`, `video`, `explainer` or `topic`. `note` (ref = vault path) is valid in the file, but the catalog lists no notes, so this skill never writes one and a re-pair does not keep one |
| `relations[].ref` | string | The catalog entry's `ref` (formats under "Content Catalog") |
| `relations[].score` | number 7-10 | AI's self-rating, same scale as anchors |
| `relations[].reason` | string | Same rules as an anchor's reason |
| `userRejected[]` | string[] | Picks the user rejected; the plugin hides them. An anchor is `"<notePath>|<front>"` (or the bare front in older entries), a relation is `"<type>|<ref>"` |

## Content Catalog

The dumper lists the user's other content by title so targets can pick relations from it.
It reads the same index files the plugin does and never opens a lesson page, a video, its
subtitles or an explainer page; from a `topic.json` it uses only the title and `notes`.

| `type` | Read from | `ref` | Listed when |
|---|---|---|---|
| `lesson` | `engram-quest/lessons/<slug>/meta.json` → `lessons[]` | `<slug>/<lesson id>` (`file-<file>` stands in for a missing id, as in the plugin) | The lesson has a `file` (a planned outline entry has no page yet) |
| `video` | `engram-quest/videos/<slug>/meta.json` → `videos[]` | `<slug>/<video id>` | The video has an `id` and a `file`, and the series is not `kind: "episodic"` (a recall film replays many topics; its topics are listed instead) |
| `explainer` | `engram-quest/explainer/meta/<id>.json` | `<id>` | The meta file has an `id` |
| `topic` | `engram-quest/episodic-review/topics/<id>/topic.json` | `<id>` (the folder name) | The topic file parses |

A missing folder or an unreadable file contributes nothing; with no content at all the
catalog is `[]` and the run pairs anchors only.

### Links the plugin already draws

These come from data in the vault, so the plugin shows them without this skill. The dumper
puts the matching catalog ids in a target's `skip` list so they are not written again as
relations:

| Link | Evidence |
|---|---|
| Explainer page → the card it was written for | `sourceCard.note` + `sourceCard.front` in the page's meta |
| Video → the cards made from it | `videos[].cards` names the card file |
| Recall topic → its notes and its own cards | `notes[]` in `topic.json`; a card's source notes are its own file plus what its hints file records (the card's `source`, else the file-level `note`), which for recall-topic cards is the `topic.json` path |

`skip` also holds the ids of anything in the target's `userRejected`.

## How the dumper sorts targets

When `_status.json` exists and the pool change is below the `full` threshold, the run is
incremental and each target lands in exactly one bucket, checked in this order:

| `reason` | Condition | Pairing |
|---|---|---|
| `new-target` | No entry in the synapse file named after its note (never paired, its front text changed, or the entry was left under an old note path, where the plugin does not read it) | From scratch |
| `stale-anchor` | At least one anchor is no longer in the mastered pool | From scratch |
| `stale-relation` | At least one relation points at content that is no longer in the catalog | From scratch |
| `empty-retry` | Paired last time with no anchor, and the mastered pool has grown since | From scratch |
| `new-content` | None of the above, and the catalog holds entries that are not in `_catalog.json` | Relations only, from the `new` entries |
| (preserved) | Everything else | None — listed in `preservedFronts` |

Consequences worth knowing:
- With no `_catalog.json` yet (synapse files that predate relations), every catalog entry
  counts as new, so already-paired targets get their relations in one incremental run
  without their anchors being redone.
- `_catalog.json` changes only when `--mark-seen <catalogToken>` runs, and only if the
  catalog still matches the dump that token came from. A run that stops before that step,
  or whose catalog changed while it was pairing, loses nothing: the same entries are
  offered as new again next time.
- One new catalog entry queues every already-paired target as `new-content`, since any of
  them might relate to it. The pass is cheap: most targets return no relation and are
  left untouched.
- Editing only a card's back does not re-pair it.
- Targets that already have anchors never pick up newly mastered cards in incremental
  mode, and their stored reasons are never rewritten. They are re-paired only by a `full`
  run, which happens automatically once the pool drifts past the threshold, or on demand
  with `--full`.
- A relation of a type the catalog does not list is never judged stale.

## Plugin Runtime Behavior

The plugin reads this data via `src/review/synapse.js`:

1. **`loadSynapseStatus(adapter)`** — reads `_status.json` once per session
2. **`isSynapseEnabled(status)`** — returns `status.enabled === true`
3. **`loadSynapseBatch(adapter, notePaths)`** — batch-reads per-note files for all
   notes in the current session
4. **`attachSynapseToCards(cards, batch)`** — sets `card.synapseAnchors = [...]` on
   each card by matching `card.notePath + card.front`
5. **Pro gate**: `plugin.settings.licenseValid` is checked inline in session.js. False →
   the ⚡ button never renders, and `_loadSynapseAsync` returns early.

## Reverse-engineering notePath from SR filename

```
SR file:   engram-review/sr/3.專案__SampleProject__sql server資料庫.json
strip:     3.專案__SampleProject__sql server資料庫
replace:   3.專案/SampleProject/sql server資料庫
append:    3.專案/SampleProject/sql server資料庫.md
```

Edge cases:
- File names that legitimately contain `__` (rare but possible) cannot be perfectly
  inverted. Synapse must use the SR file ↔ Synapse file naming as the source of truth,
  and look up the actual notePath from the file's metadata if needed.
- Use `obsidian search` or `app.vault.getAbstractFileByPath` to verify a note exists
  before recording its path in anchors.

## Pool-Change Detection (informational)

The plugin uses `shouldShowRefreshBanner` (in `src/review/synapse.js`) with these defaults:

- `POOL_DELTA_THRESHOLD = 15` — pool size diff that triggers refresh banner
- `POOL_AGE_DAYS_THRESHOLD = 28` — age in days before staleness banner

These are runtime-only; the skill doesn't need them. The skill simply writes accurate
`masteredPoolSize` and `generatedAt` so the runtime can compute drift.

## Read-Only Invariant

Source notes (`*.md` outside `engram-review/`) are NEVER modified by the plugin or AI.
The `migrateSrCommentsToJson` migration (in `src/review/decks.js`) actively moves any
inline `<!--SR:-->` comments out of source notes into `engram-review/sr/*.json`.

This means: any data the plugin or AI generates lives exclusively under `engram-review/`.
Synapse output follows the same rule — no `<!--SY:-->` comments anywhere.
