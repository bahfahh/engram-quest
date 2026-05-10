# Synapse Plugin Architecture Reference

## Data Locations

| File | Purpose |
|---|---|
| `engram-review/synapse/_status.json` | Global feature flag + last-run metadata |
| `engram-review/synapse/{srFileName}.json` | Per-note anchor recommendations |
| `engram-review/sr/{srFileName}.json` | SR schedules (read-only input for this skill) |
| `engram-review/ai-cards/{name}.md` | AI-generated cards (read-only input) |

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
| `generatedAt` | ISO8601 | Plugin uses this to detect staleness (> 7 days → banner) |
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
          "notePath": "engram-review/ai-cards/Event_Storming_02_Strategic_Design.md",
          "stability": 17.108,
          "score": 9,
          "reason": "Both define DDD strategic boundaries"
        }
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
| `anchors[].notePath` | string | Anchor's full vault-relative path |
| `anchors[].stability` | number | Anchor's FSRS stability at the time of generation |
| `anchors[].score` | number 7-10 | AI's self-rating |
| `anchors[].reason` | string | One short sentence shown in the UI |
| `userRejected[]` | string[] | Reserved for v2 — entries are `"<notePath>|<front>"` keys |

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
SR file:   engram-review/sr/3.專案__BanquetAIQA__sql server資料庫.json
strip:     3.專案__BanquetAIQA__sql server資料庫
replace:   3.專案/BanquetAIQA/sql server資料庫
append:    3.專案/BanquetAIQA/sql server資料庫.md
```

Edge cases:
- File names that legitimately contain `__` (rare but possible) cannot be perfectly
  inverted. Synapse must use the SR file ↔ Synapse file naming as the source of truth,
  and look up the actual notePath from the file's metadata if needed.
- Use `obsidian search` or `app.vault.getAbstractFileByPath` to verify a note exists
  before recording its path in anchors.

## Pool-Change Detection (informational)

The plugin uses `shouldShowRefreshBanner` (in `src/review/synapse.js`) with these defaults:

- `POOL_DELTA_THRESHOLD = 5` — pool size diff that triggers refresh banner
- `POOL_AGE_DAYS_THRESHOLD = 7` — age in days before staleness banner

These are runtime-only; the skill doesn't need them. The skill simply writes accurate
`masteredPoolSize` and `generatedAt` so the runtime can compute drift.

## Read-Only Invariant

Source notes (`*.md` outside `engram-review/`) are NEVER modified by the plugin or AI.
The `migrateSrCommentsToJson` migration (in `src/review/decks.js`) actively moves any
inline `<!--SR:-->` comments out of source notes into `engram-review/sr/*.json`.

This means: any data the plugin or AI generates lives exclusively under `engram-review/`.
Synapse output follows the same rule — no `<!--SY:-->` comments anywhere.
