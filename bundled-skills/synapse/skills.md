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
1. Scans every `engram-review/sr/*.json` file ONCE to extract both the mastered pool
   (stability ≥ 7) and the target list (stability < 7) from the same data
2. For each target, asks the AI to recommend up to 3 anchors from the mastered pool
3. Writes results to `engram-review/synapse/{srFileName}.json` with a `_status.json` header

After running, the user opens the EngramQuest Review Deck and sees a ⚡ button on cards
that have anchors. Clicking it reveals the anchor recommendations before answering.

## Performance Contract — ONE-SHOT design

This skill MUST run as a single-shot pipeline, not as a per-card loop:

1. **One bash command** dumps every `sr/*.json` into a single stdout stream
2. **One mental step** parses the dump into mastered pool + target list (in-memory)
3. **One LLM call** receives the FULL mastered pool + FULL target list and returns
   all pairings in one JSON response. Modern context windows easily fit 500+ cards;
   batching is unnecessary and costs round-trip latency.
4. **Parallel file writes** for `synapse/{srFileName}.json` outputs and `_status.json`

Expected runtime on a 200-card vault: **~30 seconds**, dominated by the single LLM
inference. If your run takes longer than 2 minutes, you are doing it wrong — re-read
this section and switch to one-shot.

**Anti-patterns that destroyed the previous design (do not do these)**:
- Reading sr/*.json files one-at-a-time with N separate bash/read tool calls
- Scanning `engram-review/ai-cards/*.md` or running `obsidian search`
- Splitting targets into batches of 30 and making N sequential LLM calls
- Re-reading files that were already in the dump

**Cards without SR records (never reviewed) are intentionally invisible to this skill.**
They will be picked up automatically the next time Synapse runs after the user reviews
them once. Trade-off: new cards don't get anchors until first review — acceptable because
new cards already feel interesting and rarely need anchoring.

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

## Step 1: ONE script call → ready-to-feed JSON

Run the bundled dumper. It reads every `engram-review/sr/*.json`, splits by stability,
and emits a single JSON document containing both pools. **Do NOT iterate sr/ with
individual Read calls — it will be 10× slower.**

```bash
bash scripts/dump_sr_pool.sh
```

Output schema (parse this directly into the Step 3 prompt):

```json
{
  "mastered": [
    { "id": "m1", "front": "<card front>", "notePath": "engram-review/ai-cards/Foo.md", "stability": 17.108 }
  ],
  "targets": [
    { "id": "t1", "front": "<card front>", "notePath": "Study/Bar.md", "stability": 0.5 }
  ],
  "stats": {
    "masteredCount": 23,
    "targetCount": 87,
    "threshold": 7,
    "filesScanned": 50,
    "fileErrors": 0
  }
}
```

Pool semantics:

| Set | Condition | Role |
|---|---|---|
| **Mastered pool** | `stability ≥ 7` | Stable memory hooks — eligible to be recommended as anchors |
| **Targets** | `stability < 7` (or missing) | Cards that need help — we generate anchor recommendations for these |

Mastered cards do NOT become targets. They already remember themselves; recommending
anchors for them adds runtime cost without user value.

**Do NOT scan `engram-review/ai-cards/*.md`. Do NOT run `obsidian search`.** Cards
without an sr/ entry are intentionally skipped (see "Performance Contract" above).

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

## Step 3: ONE LLM call — full pool × full targets, no batching

Send a SINGLE prompt to the AI with the entire mastered pool and the entire target list.
Do NOT split into batches. Modern models (Claude Sonnet 4+, Gemini 2.5+, GPT-5) handle
hundreds of cards in one prompt without issue.

```
You are a memory aid system. The user has flashcards under spaced repetition.

MASTERED POOL (FSRS stability ≥ 7, eligible to be anchors):
[id=1] {front of mastered card 1}
[id=2] {front of mastered card 2}
[id=3] {front of mastered card 3}
... (full list — every mastered card)

TARGETS (FSRS stability < 7 or unseen, need anchors):
[t1] {front of target 1}
[t2] {front of target 2}
[t3] {front of target 3}
... (full list — every target)

For each target, pick up to 3 cards from the MASTERED POOL whose recall would
help the user remember the target. Score each candidate 0-10:

  10 = same conceptual system, mutually defining (e.g. Aggregate ↔ Bounded Context)
  7-9 = same domain, related but not interdefined
  4-6 = domains overlap but the link is weak
  0-3 = unrelated; cross-domain noise

RULES:
- Return at most 3 anchors per target, ALL with score ≥ 7
- If no anchor scores ≥ 7 for a target, return [] for it. NEVER pad with weak links.
- Cross-domain pairings (e.g. DDD card ↔ SEO card) are 0-3 by definition.
- `reason` is one short sentence (≤ 20 words / ≤ 20 漢字), explaining the link.
- Match reason language to the source notes' language.

OUTPUT — single JSON array, one entry per target, in target order:
[
  { "target": "<exact target front string>",
    "anchors": [{ "id": 1, "score": 9, "reason": "Both define DDD strategic boundaries" }] },
  { "target": "<another front>", "anchors": [] },
  ...
]

Do not output anything except the JSON array.
```

For full prompt rationale and the four "correct linking" defenses (self-rating, pool gate,
reason transparency, future user-feedback hook), see `references/scoring-guide.md`.

### Why one shot, not batches

The previous design batched targets into groups of 30 and made N sequential LLM calls.
This was wrong because:
- Each call has 5–30s of round-trip + thinking overhead. N calls × overhead dominates.
- The mastered pool was repeated in every call (wasted tokens).
- The model can cross-analyze ALL targets against ALL anchors more accurately when it
  sees the full picture in one context.

A 200-target / 50-anchor vault produces a prompt around 10k input tokens. Trivial.

### Optional: parallel subagents (Claude Code only — skip otherwise)

If your IDE has parallel subagent dispatch (Claude Code's Agent tool), and you have
**> 80 targets**, you can convert one long call into N short parallel calls:

1. Split `targets[]` evenly into K = 3–4 groups (≈ 25–30 per group).
2. Dispatch K subagents **in a single message** so they fire concurrently.
3. Each subagent receives the **full mastered pool** + its slice of targets +
   the same scoring rubric. (Splitting the pool would cause weak-link hallucinations —
   subagents need every anchor candidate to pick from.)
4. Main agent merges the K JSON arrays in target order.

Wall time drops ~K× because Claude API parallelizes well. Skip this if:
- Target count < 80 (subagent overhead exceeds savings)
- IDE is Gemini CLI / Cursor / anything without first-class parallel agents
- Cost > latency (parallel dispatch = K × cost of one call)

This is an OPTIONAL optimization — the single-shot path is the canonical flow.

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
