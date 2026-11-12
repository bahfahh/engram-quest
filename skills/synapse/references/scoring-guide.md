# Synapse Scoring Guide

## Why scoring matters

Synapse must work across vault types: domain-rich (well-clustered), domain-sparse (a few cards
per topic), single-domain (one focus area), and beginner (very few mastered cards). The
scoring rubric is the load-bearing rule that prevents AI from inventing weak cross-domain links
when no real anchor exists.

## The 0–10 scale

| Score | Meaning | Example |
|---|---|---|
| 10 | Same conceptual system, mutually defining | Aggregate ↔ Bounded Context (both DDD strategic) |
| 9 | Same conceptual system, one defines the other | Saga Pattern ↔ Long-running Transaction |
| 8 | Same domain, parallel concepts | Backlink Quality ↔ Domain Authority (SEO) |
| 7 | Same domain, useful but not essential link | Azure SQL Pricing ↔ Azure Functions Pricing |
| 4-6 | Overlapping domain, link too weak to help memory | Saga Pattern ↔ Database Indexing |
| 0-3 | Cross-domain or coincidental similarity | DDD Aggregate ↔ Marketing Funnel |

## Hard rules for the AI

1. **Return only ≥ 7 scores.** Lower scores are not "weak recommendations" — they are
   "do not show this".

2. **Empty array is a valid answer.** If the AI cannot find ≥ 7 anchors, return `[]`. The
   plugin shows a dimmed ⚡ button for cards with no anchors. **Padding is forbidden.**

3. **Cross-domain pairs are 0-3.** Even if both cards mention "system" or "design" in their
   front text, that is a coincidence, not a memory anchor.

4. **Self-pairing is invalid.** A card cannot anchor itself. The AI should never return an
   anchor whose front equals the target front.

5. **Three anchors, four relations.** Even when 5 anchors all score ≥ 7, return only the
   top 3 (highest score wins; ties broken by AI judgment). Relations stop at 4, with at most
   2 of one type, so one long course cannot crowd out a video or an explainer page that
   covers the same idea from another angle.

6. **Reason must be specific.** "Both are technical" is not a valid reason. "同屬 DDD
   戰略設計" or "Both define cache eviction policies" are valid reasons.

7. **Reason must not give the answer away.** See "Reasons the user reads before answering".

## Scoring a catalog entry

Relations use the same 0–10 scale and the same ≥ 7 cutoff, but the evidence is thinner:
a catalog entry is a title (plus its course or series title), never the content.

| Score | Meaning | Example (target: "What decides whether a CI test gate is worth having?") |
|---|---|---|
| 10 | The entry teaches exactly what the card asks | lesson "Turning tests into a CI gate" |
| 8-9 | Same topic, a neighbouring step or a worked case of it | lesson "The test pyramid and what CI automates" in the same course |
| 7 | Same domain, and seeing it would plausibly bring the card's idea back | video "Deploying to Azure with GitHub Actions" |
| 4-6 | Same broad field only | lesson "Git branching basics" |
| 0-3 | Different field, or a shared word only | lesson "Excel pivot tables" |

- **Judge from the title, never beyond it.** "Lesson 3" or "Overview" says nothing; even
  inside a course that fits, such an entry scores below 7 unless its title names the idea.
  The course or series title tells you the domain, not what one lesson covers.
- **A relation is something the user studied, not a definition.** Prefer the entry whose
  recall brings back the setting in which the idea was learned ("the lesson where I set up
  that gate") over one that merely shares vocabulary.
- **One entry per piece of content.** When several entries are versions of the same thing
  (a re-cut video, a translated twin), pick the one whose title fits best, not all of them.
- **A title can be a spoiler too.** The plugin shows a relation's title beside the
  unanswered card. If the title alone answers the card, leave the entry out, however
  closely it matches.
- **Do not repeat what the plugin already shows.** Ids in a target's `skip` list are links
  the plugin draws itself or picks the user rejected; they are never valid answers.

## Reasons the user reads before answering

The ⚡ panel can be opened while the card's answer is still hidden, and every reason is
visible there. A reason that contains the answer turns the review into reading.

Write what the two items have in common, or what the other item is about. Leave out what
the target's answer is.

| Target front | Leaks the answer ❌ | Safe ✅ |
|---|---|---|
| What decides whether a CI test gate is worth having? | "The lesson shows a gate is only as good as the tests behind it" | "The lesson where this gate gets set up" |
| Which cache layer answers a repeated question fastest? | "Both say exact-match cache comes first" | "Both compare the layers of an AI cache" |
| 為什麼評測要接進 CI？ | 「影片示範分數掉了就擋合併」 | 「影片示範同一個評測流程」 |

The check: could someone answer the card from the reason alone? If yes, rewrite it around
the shared topic.

## Why these rules exist (the four defenses)

Synapse's "correct linking" guarantee rests on four mechanisms:

### 1. AI self-rating with cutoff (this rubric)
The 7+ cutoff is the primary filter. It runs inside the AI prompt — no post-processing
needed.

### 2. Pool size gate (in skills.md, Step 2)
If the user's mastered pool is < 10 cards, the entire feature is disabled. Prevents AI
from straining to find anchors when the pool is too small.

### 3. Reason transparency (rendered by plugin)
Each anchor and relation displays its reason in the UI. Users see exactly why a link was
suggested, and can spot AI hallucinations immediately.

### 4. User rejections
The `userRejected` array in each `cards.{front}` entry lists the anchors and relations the
user turned down. The skill preserves it across runs and never recommends them again.

## Failure modes to avoid

❌ "The user has 3 mastered cards in DDD and 2 in SEO. The 6 unmasted DDD cards have no
strong DDD anchor." → Don't fall back to SEO anchors. Return [] for those cards.

❌ "Two cards both contain the word 'pattern'." → Coincidence. Score 0-3.

❌ "The user might find this distantly related." → If the link is "distant", it doesn't help
memory. Score 0-3.

✅ "I cannot find a 7+ anchor for this card. Return []." → Correct.

## User rejections

`userRejected: [...]` holds what the user turned down for a card: an anchor as
`"<notePath>|<front>"` (or the bare front in older entries), a relation as `"<type>|<ref>"`.
The dumper does the bookkeeping, so the skill never has to search old synapse files for it:

1. Each target in the dump carries its stored `userRejected` — copy it into the entry you
   write, on every write.
2. The ids of the rejected candidates are already in the target's `skip` list — **never
   recommend them again**, even if they would otherwise score 9. The user has said no.
3. A full run lists in `keepEntries` the entries that hold rejections but belong to cards
   that are not targets right now — carry those entries over as they are.
