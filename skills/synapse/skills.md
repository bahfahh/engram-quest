---
name: engram-synapse
description: >
  Build and refresh Synapse links for EngramQuest review cards (Pro feature) — for each card
  the user still struggles with, pick mastered cards as memory anchors plus the lessons,
  videos, explainer pages and recall topics they already studied that relate to it.
  Trigger when the user invokes /engram-quest-synapse, says "build synapse", "update synapse",
  "refresh synapse anchors", or asks in their own words to have cards connected to what they know —
  "link my hard cards to things I already learned", "my cards show no links yet, build
  them", "幫卡片建立關聯", "更新記憶錨點". Also trigger when another
  EngramQuest skill (review-deck, lesson-academy, explainer, animated-course,
  episodic-review) hands over to it after making content, so cards pick up the new material.
  Safe to run at any time — one script call decides what needs doing, and the run ends
  without an AI pass when nothing changed or fewer than 10 cards are mastered.
---

# EngramQuest Synapse Skill (Pro)

## What This Skill Does

Synapse helps users memorize difficult cards by linking them to what they have **already
learned**: cards they have mastered (anchors) and the lessons, videos, explainer pages and
recall topics they studied in EngramQuest (relations). The plugin shows both around the card
during review, triggering elaborative encoding, active recall, and contextual anchoring —
three core memory-science principles.

This skill:
1. Runs ONE script that reads every `engram-review/sr/*.json` file to extract the mastered
   pool (stability ≥ 7) and the target list (stability < 7), and lists the user's other
   content as a title-only catalog
2. For each target, picks up to 3 anchors from the mastered pool and up to 4 relations from
   the catalog, each with a score and a one-line reason
3. Writes results to `engram-review/synapse/{srFileName}.json` with a `_status.json` header

After running, the user opens the EngramQuest Review Deck and sees a ⚡ button on cards
that have links. Clicking it shows them around the card, before the answer is revealed.

The plugin draws some links by itself from data already in the vault: a card's source note,
the explainer page written for a card, the cards file attached to a video, the notes behind
a recall topic. This skill adds only what takes judgment — links between items that do not
reference each other.

## Performance Contract — ONE-SHOT design

This skill MUST run as a single-shot pipeline, not as a per-card loop:

1. **One bash command** dumps every `sr/*.json` and the content catalog into a single
   stdout stream
2. **One mental step** parses the dump into mastered pool + catalog + target list (in-memory)
3. **One LLM call** receives the FULL mastered pool + FULL catalog + FULL target list and
   returns all pairings in one JSON response. Modern context windows easily fit 500+ cards
   and as many catalog titles; batching is unnecessary and costs round-trip latency.
4. **Parallel file writes** for `synapse/{srFileName}.json` outputs and `_status.json`

Expected runtime on a 200-card vault: **~30 seconds**, dominated by the single LLM
inference. A catalog of several hundred entries, or the first run that gives every
already-paired card its relations, takes a few minutes for the same reason. If your time
goes anywhere else — extra script calls, per-file reads, batches — you are doing it wrong:
re-read this section and switch to one-shot.

**Anti-patterns that destroyed the previous design (do not do these)**:
- Reading sr/*.json files one-at-a-time with N separate bash/read tool calls
- Scanning `engram-review/ai-cards/*.md` or running `obsidian search`
- Opening lesson pages, video subtitles, explainer pages or topic files — the catalog's
  titles are all this skill reads about them
- Splitting targets into batches of 30 and making N sequential LLM calls
- Re-reading files that were already in the dump

**Cards without SR records (never reviewed) are intentionally invisible to this skill.**
They will be picked up automatically the next time Synapse runs after the user reviews
them once. Trade-off: new cards don't get anchors until first review — acceptable because
new cards already feel interesting and rarely need anchoring.

## Reason Rules

Every anchor and relation carries a `reason`: one short sentence (≤ 20 words / ≤ 20 漢字).

- **Language** — match the source notes. If the user's vault is in Traditional Chinese,
  write reasons in Traditional Chinese. JSON keys and structural fields stay in English.
- **No spoilers** — the plugin shows reasons while the target card is still unanswered.
  A reason says what the two items share or what the other item covers; it never states,
  paraphrases or narrows down the target card's answer. Check: if someone could answer the
  card from the reason alone, rewrite it.

## CRITICAL Output Scope

- Write ONLY to `engram-review/synapse/*.json` and `engram-review/synapse/_status.json`
  (`_catalog.json` in the same folder is written by the script in Step 5, never by hand)
- Do NOT modify source notes, ai-cards, sr/, hints/, anything under `engram-quest/`, or any
  other vault file
- Do NOT write `<!--SY:-->` comments into markdown — those are not used by the runtime

Source notes are read-only. AI artifacts live exclusively in `engram-review/`.

---

## Step 1: ONE script call → mode + ready-to-feed JSON

Run the bundled dumper. It reads `engram-review/sr/*.json`, any existing
`engram-review/synapse/*.json`, and the titles of the user's lessons, videos, explainer
pages and recall topics under `engram-quest/`. It decides whether this run should be full /
incremental / no-op, and emits a single JSON document with everything needed for the next
steps. These two calls write nothing.

```bash
# Default: auto-detect mode based on _status.json + pool drift
bash scripts/dump_sr_pool.sh

# Force a full rebuild (re-pair every target against the current pool)
bash scripts/dump_sr_pool.sh --full
```

### If `node` is not available

The dumper requires Node.js (≥ 18). If the script exits with `node-not-found` or
the shell reports `command not found: node`, you have two options:

1. **Recommended** — install Node.js and re-run. The script is < 1 second; nothing
   else in this skill substitutes for the diff logic it implements.
2. **Last-resort fallback** — if node truly cannot be installed in this environment,
   read every `engram-review/sr/*.json` with one Read call per file, in-memory filter
   `stability >= 7` for the mastered pool and `< 7` for targets, and skip incremental
   mode entirely (treat every run as `full`, no `_status.json` diffing). There is no
   catalog on this path: read each existing synapse file before rewriting it, write
   anchors only, and carry every entry's `relations` and `userRejected` over unchanged.
   This is intentionally slow — only acceptable on environments without node.

Do NOT silently fall through. If you choose option 2, tell the user: "node not
available, running in fallback mode (full rebuild every run)."

### Output `mode` field — five possible values

| `mode` | When | What the skill should do next |
|---|---|---|
| `full` | First run, no `_status.json`, mastered pool size changed by ≥ `max(10, last × 0.2)`, or `--full` | Run the full LLM prompt over `targets[]` (Step 2 onward) |
| `incremental` | `_status.json` exists, pool change below that threshold, and `workQueue[]` is non-empty | Run the LLM prompt only over `workQueue[]`. **Do NOT touch `synapse/*.json` files for fronts in `preservedFronts[]`.** |
| `noop` | `_status.json` exists and `workQueue[]` would be empty | Skip the LLM. Just bump `_status.json.generatedAt` to now and report "nothing to update" |
| `pool-too-small` | Mastered pool < 10 cards | Write `_status.json` with `enabled: false, reason: "pool-too-small"` and tell the user to keep reviewing |
| `error` | sr/ folder missing | Tell the user no SR data exists yet |

### Output schema (`full` and `incremental`)

```json
{
  "mode": "full" | "incremental",
  "catalogToken": "3f9a1c0b7d2e",
  "stats": { "masteredCount": 164, "targetCount": 89, "catalogCount": 120, "newCatalog": 6,
             "newTargets": 5, "staleTargets": 1, "staleRelationTargets": 0, "emptyRetryTargets": 0,
             "newContentTargets": 80, "preservedTargets": 3, "threshold": 7,
             "filesScanned": 96, "fileErrors": 0 },
  "mastered": [
    { "id": "m1", "front": "<front>", "back": "<back>", "notePath": "engram-review/ai-cards/Foo.md", "stability": 17.108 }
  ],
  "targets":   [ /* full mode only — full target list */ ],
  "workQueue": [ /* incremental mode only — only these need LLM work */
    { "id": "t1", "front": "<front>", "notePath": "Study/Bar.md", "stability": 2.3,
      "reason": "new-target", "skip": ["c3"] },
    { "id": "t7", "front": "<front>", "notePath": "Study/Baz.md", "stability": 4.1,
      "reason": "stale-anchor", "staleAnchors": ["<old anchor front>"] },
    { "id": "t8", "front": "<front>", "notePath": "Study/Baz.md", "stability": 3.0,
      "reason": "stale-relation", "staleRelations": ["lesson|cicd/lsn-9"] },
    { "id": "t9", "front": "<front>", "notePath": "Study/Qux.md", "stability": 1.2,
      "reason": "empty-retry" },
    { "id": "t11", "front": "<front>", "notePath": "Study/Qux.md", "stability": 5.5,
      "reason": "new-content", "skip": ["c2", "m12"], "userRejected": ["video|azure-ai/az-l04-eval", "Study/Bar.md|<front>"] }
  ],
  "preservedFronts": [ "<front>", "<front>", ... ],
  "keepEntries": [ /* full mode only, when present */ { "file": "Study__Bar.json", "front": "<front>" } ],
  "catalog": [
    {"id":"c1","type":"lesson","ref":"cicd/lsn-2","title":"<lesson title>","group":"<course title>"},
    {"id":"c2","type":"video","ref":"azure-ai/az-l04-eval","title":"<video title>","group":"<series title>","new":true},
    {"id":"c3","type":"explainer","ref":"ci-gate-value-1785501573","title":"<page title>"},
    {"id":"c4","type":"topic","ref":"t13-llm-testing","title":"<topic title>"}
  ]
}
```

- `catalog` — titles only; `group` is the course or series a lesson or video belongs to.
  `new: true` appears in incremental mode on entries added since the last run. It is `[]`
  when the vault has no such content; then only anchors are paired.
- `skip` (on a target, when present) — ids this target must not be paired with: links the
  plugin already draws for it, and picks the user rejected.
- `userRejected` (on a target, when present) — its stored rejections, to carry into the
  entry you write.
- `keepEntries` (full mode, when present) — entries of cards that are not targets in this
  run but hold user rejections; Step 4 carries them over.
- `catalogToken` — fingerprint of this catalog; Step 5 hands it back to the script.

### Pool semantics (same in all modes)

| Set | Condition | Role |
|---|---|---|
| **Mastered pool** | `stability ≥ 7` | Stable memory hooks — eligible to be recommended as anchors |
| **Catalog** | every lesson that has a page, playable video, explainer page and recall topic | Content already studied — eligible to be recommended as relations |
| **Targets** | `stability < 7` (or missing) | Cards that need help — anchors and relations are generated for these |

Mastered cards do NOT become targets. They already remember themselves; recommending
anchors for them adds runtime cost without user value.

## Step 2: Pool Size Gate

If the dump's `mode` is `pool-too-small` (`stats.masteredCount` < 10) → write status as disabled and stop:

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

## Step 3: ONE LLM call — full pool + catalog × the work queue

Send a SINGLE prompt to the AI with the entire mastered pool, the entire catalog and
**only the cards that need pairing this run**:

- `mode === "full"`: send `mastered` + `catalog` + the full `targets` list
- `mode === "incremental"`: send `mastered` + `catalog` + the `workQueue` list (subset of targets)
- `mode === "noop"`: skip Steps 3–4 entirely; jump to Step 5 to bump `generatedAt`

Work-queue targets whose `reason` is `new-content` already have their links. They go in
their own block and are checked only against catalog entries marked `new`; every other
target is paired from scratch.

Do NOT split into batches. Modern models (Claude Sonnet 4+, Gemini 2.5+, GPT-5) handle
hundreds of cards in one prompt without issue.

```
You are a memory aid system. The user has flashcards under spaced repetition.

MASTERED POOL (cards the user already remembers — anchor candidates):
[m1] {front of mastered card}
[m2] {front of mastered card}
... (full list — every mastered card)

CATALOG (other things the user studied — relation candidates; the title is all you get):
[c1] lesson · {course title} › {lesson title}
[c2] NEW video · {series title} › {video title}
[c3] explainer · {page title}
[c4] topic · {topic title}
... (full list — every catalog entry; NEW marks entries with "new": true)

TARGETS (cards the user struggles with):
[t1] {front of target}
[t2] {front of target}   skip: c3, m12
... (every target except new-content ones; "skip" repeats the target's `skip` ids)

TARGETS — NEW CONTENT ONLY (already paired; pick relations only, from NEW entries only):
[t11] {front of target}   skip: c2
... (targets with reason "new-content", same "skip" notation; leave this block out when
     there are none)

For each target pick:
- up to 3 anchors from the MASTERED POOL: cards whose recall would help the user
  remember the target
- up to 4 relations from the CATALOG, at most 2 of the same type: content that taught
  or applied the same idea

Score each candidate 0-10:

  10 = same conceptual system, mutually defining (e.g. Aggregate ↔ Bounded Context);
       for a catalog entry, it teaches exactly what the card asks
  7-9 = same domain, related but not interdefined
  4-6 = domains overlap but the link is weak
  0-3 = unrelated; cross-domain noise

RULES:
- Return only picks with score ≥ 7. If nothing scores ≥ 7, return [] for that list.
  NEVER pad with weak links.
- Cross-domain pairings (e.g. DDD card ↔ SEO card) are 0-3 by definition.
- A title too vague to judge is not a match. Do not guess what the content covers.
- Never pick an id in the target's skip list.
- Never pick a catalog entry whose title already gives the target's answer away: the
  title is shown next to the unanswered card.
- `reason` is one short sentence (≤ 20 words / ≤ 20 漢字) in the language of the cards.
  It says what the two share or what the other item covers. It must NOT state or hint
  at the target's answer: the user reads it before answering.

OUTPUT — single JSON array, one entry per target, in target order:
[
  { "target": "t1",
    "anchors":   [{ "id": "m3",  "score": 9, "reason": "Both define DDD strategic boundaries" }],
    "relations": [{ "id": "c12", "score": 8, "reason": "This lesson draws the same kind of boundary" }] },
  { "target": "t2", "anchors": [], "relations": [] },
  ...
]

Do not output anything except the JSON array.
```

For the rubric's rationale, how to judge a catalog entry from its title, reason examples and
the "correct linking" defenses (self-rating, pool gate, reason transparency, user rejections),
see `references/scoring-guide.md`.

### Why one shot, not batches

Batching targets into sequential calls is slower and less accurate: every call pays 5–30s
of round-trip + thinking overhead, repeats the pool and the catalog, and hides part of the
picture from a model that pairs best when it sees everything at once. A 200-target /
50-anchor vault is around 10k input tokens, and a 500-entry catalog adds about as much
again. Trivial.

### Optional: parallel subagents (Claude Code only — skip otherwise)

If your IDE has parallel subagent dispatch (Claude Code's Agent tool), and you have
**> 80 targets**, you can convert one long call into K = 3–4 short parallel calls: split
`targets[]` evenly, dispatch the K subagents **in a single message**, and merge their JSON
arrays in target order. Each subagent receives the **full mastered pool** + the **full
catalog** + its slice of targets + the same scoring rubric — splitting the pool or the
catalog would cause weak-link hallucinations, because subagents need every candidate to
pick from.

Wall time drops ~K× at K× the cost of one call. Skip it below 80 targets, on IDEs without
first-class parallel agents (Gemini CLI, Cursor), or when cost matters more than latency.
The single-shot path is the canonical flow.

## Step 4: Write Per-Note Synapse Files

Turn each pick's id back into its record: an anchor copies `front`, `back`, `notePath` and
`stability` from `mastered[]`; a relation copies `type` and `ref` from `catalog[]`. Drop any
pick whose id is in the target's `skip` list, in case one slipped through.

How an entry is written depends on why its target was in the run:

| Target | What to write |
|---|---|
| `full` mode, or `reason` is `new-target`, `stale-anchor`, `stale-relation` or `empty-retry` | Replace the entry's `anchors` and `relations` with this run's picks |
| `reason` is `new-content` | Keep `anchors` and the existing `relations`; append the new relations, skipping a `type` + `ref` that is already there. If the merged list exceeds 4, or 2 of one type, drop the lowest scores. No new relation → leave the entry untouched |

`userRejected` survives every write, because it is the user's own decision: copy it from
the target's `userRejected` in the dump (absent there means `[]`). The plugin hides every
anchor and relation listed in it.

**In `incremental` mode**: read the existing `engram-review/synapse/{srFileName}.json`
first (if it exists) and **merge** into it. Entries outside the work queue — those in
`preservedFronts` and any other entry in the file — stay exactly as they were, including
entries written before relations existed, which simply have no `relations` key.

**In `full` mode**: regenerate each file from this run's targets. The only entries to carry
over are the ones in `keepEntries`: when you regenerate a file named there, copy that
entry from the existing file unchanged, so its rejections are still there if the card
becomes a target again.

For each affected notePath, write `engram-review/synapse/{srFileName(notePath)}.json`:

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
          "back": "<back text copied from mastered pool entry — do NOT pass to LLM; copy from mastered[].back after LLM returns>",
          "notePath": "engram-review/ai-cards/Event_Storming_01_Fundamentals.md",
          "stability": 17.108,
          "score": 9,
          "reason": "同屬 DDD 戰略設計"
        }
      ],
      "relations": [
        { "type": "lesson", "ref": "ddd-strategic-design/lsn-1751299200003", "score": 8, "reason": "這一課示範怎麼畫同一種邊界" }
      ],
      "userRejected": []
    }
  }
}
```

For full schema reference, see `references/plugin-architecture.md`.

**Targets with no pick still get an entry**: write
`{ "anchors": [], "relations": [], "userRejected": [] }`. The dumper treats "has an entry"
as "already paired"; omitting it re-queues the target as `new-target` on every run and
`noop` never happens. The runtime shows nothing for an empty entry.

**Resolve anchor `notePath`**: look up the mastered card's notePath from the pool entry.
If a mastered card's source SR file maps to a real file in the vault, use that path.

## Step 5: Write Status File, Then Mark the Catalog Seen

Always write this, including in `noop` mode (just bumps `generatedAt`):

```json
// engram-review/synapse/_status.json
{
  "enabled": true,
  "masteredPoolSize": 164,
  "generatedAt": "2026-05-10T10:00:00Z",
  "skillVersion": "1.0",
  "lastMode": "incremental"
}
```

The plugin reads this on load. `enabled: true` activates the ⚡ feature globally.

After a `full` or `incremental` run, once every synapse file is written, record the
catalog as seen, passing the `catalogToken` from the dump this run worked from:

```bash
bash scripts/dump_sr_pool.sh --mark-seen 3f9a1c0b7d2e
```

It writes `engram-review/synapse/_catalog.json`, which is how the next run tells content
added later from content this run already weighed. Skip it and every later run treats the
whole catalog as new. Run it last: content marked seen before its pairings are written
stays invisible to already-paired cards until the next full rebuild.

If it answers `"mode": "not-marked"`, content was added or removed while you were pairing
and nothing was written. That is fine — the next run offers those entries again. Do not
re-run the dump just to get a matching token.

## Step 6: Final Report

Report tailored to `mode`:

```
[full mode]
✅ Synapse rebuilt
  Mastered pool: 164 cards (stability ≥ 7) · Catalog: 120 items
  Targets paired: 89 (76 found anchors, 41 found relations, 9 left empty — no strong link)
  Files written: 41 in engram-review/synapse/

[incremental mode]
✅ Synapse updated (incremental)
  New targets paired: 5 (4 found anchors, 1 empty)
  Stale targets re-paired: 1
  Empty targets retried: 0
  New content: 6 items checked against 80 cards, 9 relations added
  Preserved (no change): 3
  Total runtime: 12s

[noop mode]
ℹ️  Synapse already up to date — nothing to do.
  Mastered pool: 164 (unchanged)
  Last update: 2026-05-09 23:00 (less than a day ago)
```

---

## Mode flow summary (the contract this skill implements)

```
[Step 1] bash scripts/dump_sr_pool.sh
   └→ mode in JSON output

mode === "pool-too-small"  → Step 2 (write disabled status), tell user
mode === "noop"            → Step 5 status only (bump generatedAt), Step 6 ℹ
mode === "incremental"     → Steps 3-4 over workQueue + preserve preservedFronts → Step 5 (status, --mark-seen), 6
mode === "full"            → Steps 3-4 over targets → Step 5 (status, --mark-seen), 6
mode === "error"           → Tell user, exit
```

The skill is invoked by:
- The user: `/engram-quest-synapse` or a request in their own words (auto mode-detect)
- The user: `/engram-quest-synapse --full` (force full)
- A content skill (review-deck, lesson-academy, explainer, animated-course, episodic-review)
  that just made or changed content while Synapse was already enabled. Run auto mode-detect.
  The user asked for content, not for Synapse, so instead of the Step 6 block hand back one
  line from this run's own numbers (`Synapse: 5 cards paired, 3 relations added`,
  `Synapse: already up to date`). `pool-too-small` writes the disabled status and hands
  back nothing; without node, hand back `Synapse: not updated (Node.js not available)`
  rather than running the fallback.

The dumper alone decides which targets are queued and why; do not re-derive it. What each
`reason` means, and what an incremental run deliberately leaves alone, is in
`references/plugin-architecture.md` → "How the dumper sorts targets".

---

## Important Rules

- **Never pad weak links.** If AI cannot find ≥7-score anchors or relations, return `[]`.
  The plugin's ⚡ button will simply be dimmed for that card. Better dim than misleading.
- **Same-card pairing**: a card cannot anchor itself. Filter out target == anchor.front.
- **Failed file writes**: report the error, continue with the next file. Don't abort the whole run.
- **Gemini / Claude / Cursor parity**: this skill should run identically across all three.
  Avoid IDE-specific syntax; the bundled script and plain file reads and writes are all it needs.
- **Read-only invariant**: never touch source notes, ai-cards markdown, hints, sr files, or
  the lessons, videos, explainer pages and recall topics under `engram-quest/`.
  Synapse output is exclusively under `engram-review/synapse/`.
