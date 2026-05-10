---
name: engram-quest-synapse
description:
  Build memory anchor recommendations (Synapse) for EngramQuest review cards (Pro feature).
  Trigger when the user invokes /engram-quest-synapse, asks to "build synapse",
  "update synapse anchors", "refresh synapse", or wants AI-suggested cross-card connections
  to help memorize difficult flashcards. Always run after the user has accumulated enough
  mastered cards (FSRS stability ≥ 7) — the skill will gracefully no-op when the pool is too small.
---

# EngramQuest Synapse Skill (Pro)

## What This Skill Does

Synapse helps users memorize difficult cards by linking them to cards they have **already mastered**.
The plugin then shows these "anchor cards" during review, triggering elaborative encoding,
active recall, and contextual anchoring — three core memory-science principles.

This skill:
1. Scans every `engram-review/sr/*.json` file to find mastered cards (FSRS stability ≥ 7)
2. Collects all candidate target cards from the vault (ai-cards + tagged source notes)
3. For each target, asks the AI to recommend up to 3 anchors from the mastered pool
4. Writes results to `engram-review/synapse/{srFileName}.json` with a `_status.json` header

After running, the user opens the EngramQuest Review Deck and sees a ⚡ button on cards
that have anchors. Clicking it reveals the anchor recommendations before answering.

## Output Language Rule

Reasons (one-line explanation per anchor) must match the language of the source notes.
If the user's vault is in Traditional Chinese, write reasons in Traditional Chinese.
JSON keys and structural fields stay in English.

## CRITICAL Output Scope

- Write ONLY to `engram-review/synapse/*.json` and `engram-review/synapse/_status.json`
- Do NOT modify source notes, ai-cards, sr/, hints/, or any other vault file
- Do NOT write `<!--SY:-->` comments into markdown — those are not used by the runtime

Source notes are read-only. AI artifacts live exclusively in `engram-review/`.

---

## Step 1: Compute the Mastered Pool

For each file in `engram-review/sr/`:

```bash
# List all SR files
ls engram-review/sr/*.json
```

Parse each JSON. The structure is:
```json
{
  "card front text": {
    "due": "2026-05-19",
    "interval": 26,
    "stability": 17.108,
    "difficulty": 5.759,
    "state": 2,
    "repetitions": 4
  }
}
```

Build the **mastered pool**: every card whose `stability` is a number ≥ 7. Track each entry as
`{ front, notePath, stability }` where `notePath` is derived from the SR filename
(e.g. `engram-review__ai-cards__Foo.json` → `engram-review/ai-cards/Foo.md`).

**The notePath inversion rule**: `srFileName(notePath)` replaces `/` with `__` and strips `.md`.
To reverse: replace `__` with `/` and append `.md`.

## Step 2: Pool Size Gate

If `masteredPool.length < 10` → write status as disabled and stop:

```json
// engram-review/synapse/_status.json
{
  "enabled": false,
  "reason": "pool-too-small",
  "masteredPoolSize": 4,
  "threshold": 10,
  "generatedAt": "2026-05-10T10:00:00Z"
}
```

Tell the user: "Synapse needs at least 10 mastered cards (FSRS stability ≥ 7).
You currently have N. Keep reviewing — the plugin will prompt you again."

## Step 3: Collect Target Cards

Targets are **all cards in the vault**, not just non-mastered ones (a mastered card can still
benefit from being linked to other mastered cards — strengthens the network).

For each candidate file:

a) **AI-generated card files**: every file in `engram-review/ai-cards/*.md`.
   Parse with the same rules as the plugin (`::`, `Q:/A:`, `%%card%%` blocks, `--- Q:/A: ---` fenced).

b) **Source notes with the flashcard tag**: use Obsidian CLI to find them.
   ```bash
   obsidian search query="tag:#flashcards" format=json
   ```
   For each, read content and parse cards. See `references/obsidian-cli.md` for full search syntax.

For each target card, record:
```
{ front, notePath, stability (if in SR), back (for AI context only — do NOT write to JSON output) }
```

## Step 4: Batch AI Pairing

Group targets into batches of ~30 cards. For each batch, send a single prompt to the AI:

```
You are a memory aid system. Below is the user's pool of mastered flashcards
(cards they have stably memorized — FSRS stability ≥ 7).

MASTERED POOL:
[id=1] {front of mastered card 1}
[id=2] {front of mastered card 2}
... (full list of every mastered card's front)

For each target card below, find up to 3 cards from the mastered pool that
serve as the strongest "memory anchors" — cards conceptually adjacent enough
that recalling them helps cement the target.

SCORING (0-10):
  10 = same conceptual system, mutually defining (e.g. Aggregate ↔ Bounded Context)
  7-9 = same domain, related but not interdefined
  4-6 = domains overlap but the link is weak
  0-3 = unrelated; cross-domain noise

RULES:
- Return at most 3 anchors per target, ALL with score ≥ 7
- If no anchor scores ≥ 7, return [] for that target. Do NOT pad with weak links.
- Cross-domain pairings (e.g. DDD card ↔ SEO card) are 0-3 by definition.
- `reason` is one short sentence (≤ 20 words / ≤ 20 漢字), explaining the link.

TARGETS:
[t1] {target front 1}
[t2] {target front 2}
...

OUTPUT JSON ONLY:
[
  { "target": "<exact target front string>",
    "anchors": [{ "id": 1, "score": 9, "reason": "Both define DDD strategic boundaries" }] },
  { "target": "<another front>", "anchors": [] }
]
```

For full prompt rationale and the four "correct linking" defenses (self-rating, pool gate,
reason transparency, future user-feedback hook), see `references/scoring-guide.md`.

## Step 5: Write Per-Note Synapse Files

Group results by the target card's `notePath`. For each notePath, write
`engram-review/synapse/{srFileName(notePath)}.json`:

```json
{
  "_meta": {
    "generatedAt": "2026-05-10T10:00:00Z",
    "skillVersion": "1.0",
    "masteredPoolSize": 23,
    "sourceNotePath": "engram-review/ai-cards/Event_Storming_01_Fundamentals.md"
  },
  "cards": {
    "<target card front>": {
      "anchors": [
        {
          "front": "Aggregate 劃分應該基於什麼需求？",
          "notePath": "engram-review/ai-cards/Event_Storming_01_Fundamentals.md",
          "stability": 17.108,
          "score": 9,
          "reason": "同屬 DDD 戰略設計"
        }
      ],
      "userRejected": []
    }
  }
}
```

For full schema reference, see `references/plugin-architecture.md`.

**Skip targets with empty anchors** — do not write empty `cards.{front}` entries unless
preserving previous `userRejected` lists. (See incremental update below.)

**Resolve anchor `notePath`**: look up the mastered card's notePath from the pool entry.
If a mastered card's source SR file maps to a real file in the vault, use that path.

## Step 6: Write Status File

```json
// engram-review/synapse/_status.json
{
  "enabled": true,
  "masteredPoolSize": 23,
  "generatedAt": "2026-05-10T10:00:00Z",
  "skillVersion": "1.0"
}
```

The plugin reads this on load. `enabled: true` activates the ⚡ feature globally.

## Step 7: Final Report

Report to the user:

```
✅ Synapse build complete

  Mastered pool: 23 cards (stability ≥ 7)
  Target cards scanned: 198
  Targets with ≥1 anchor: 87 (44%)
  Targets with 0 anchors: 111 (algorithm chose not to pad weak links)
  Files written: 34 in engram-review/synapse/

Open the EngramQuest Review Deck — cards with anchors now show a ⚡ button.
```

---

## Incremental Update (subsequent runs)

When `engram-review/synapse/_status.json` already exists:

1. Compare `currentMastered` vs `_status.json.masteredPoolSize`
2. If `abs(diff) ≥ max(5, last × 0.10)` → **full rebuild** (pool structure changed enough that
   anchors based on the old pool may not be valid). Run Steps 1-6 from scratch.
3. Otherwise → **partial rebuild**:
   - Re-scan only notes whose mtime > `_status.generatedAt`
   - Plus any note whose existing synapse file references anchors that are no longer
     in the current mastered pool
   - Preserve `userRejected` lists when overwriting per-note files

Pure mtime-only incremental misses "note unchanged but new mastered card should anchor it"
cases, so the pool-change check is the primary trigger.

---

## Important Rules

- **Never pad weak links.** If AI cannot find ≥7-score anchors, return `[]`. The plugin's
  ⚡ button will simply be dimmed for that card. Better dim than misleading.
- **Same-card pairing**: a card cannot anchor itself. Filter out target == anchor.front.
- **Failed file writes**: report the error, continue with the next file. Don't abort the whole run.
- **Gemini / Claude / Cursor parity**: this skill should run identically across all three.
  Avoid IDE-specific syntax. Use plain Obsidian CLI + bash where vault operations are needed.
- **Read-only invariant**: never touch source notes, ai-cards markdown, hints, or sr files.
  Synapse output is exclusively under `engram-review/synapse/`.
