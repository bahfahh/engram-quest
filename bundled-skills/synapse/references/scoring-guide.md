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

5. **Three is the max.** Even when 5 anchors all score ≥ 7, return only the top 3 (highest
   score wins; ties broken by AI judgment).

6. **Reason must be specific.** "Both are technical" is not a valid reason. "同屬 DDD
   戰略設計" or "Both define cache eviction policies" are valid reasons.

## Why these rules exist (the four defenses)

Synapse's "correct linking" guarantee rests on four mechanisms:

### 1. AI self-rating with cutoff (this rubric)
The 7+ cutoff is the primary filter. It runs inside the AI prompt — no post-processing
needed.

### 2. Pool size gate (in skills.md, Step 2)
If the user's mastered pool is < 10 cards, the entire feature is disabled. Prevents AI
from straining to find anchors when the pool is too small.

### 3. Reason transparency (rendered by plugin)
Each anchor displays its reason next to the card front in the UI. Users see exactly why
a link was suggested, and can spot AI hallucinations immediately.

### 4. User feedback hook (v2, schema reserved)
The `userRejected` array in each `cards.{front}` entry is reserved for a future "X this
anchor" UI. Skill should preserve this list across runs.

## Failure modes to avoid

❌ "The user has 3 mastered cards in DDD and 2 in SEO. The 6 unmasted DDD cards have no
strong DDD anchor." → Don't fall back to SEO anchors. Return [] for those cards.

❌ "Two cards both contain the word 'pattern'." → Coincidence. Score 0-3.

❌ "The user might find this distantly related." → If the link is "distant", it doesn't help
memory. Score 0-3.

✅ "I cannot find a 7+ anchor for this card. Return []." → Correct.

## Future: User feedback loop (v2)

When the runtime adds a "✕ this anchor" button, rejected (notePath, front) pairs go into
`userRejected: [...]`. The skill must:

1. Read the existing per-note synapse file (if any)
2. Preserve `userRejected` arrays when overwriting
3. **Exclude rejected anchors from new recommendations** — even if they would otherwise
   score 9, the user has explicitly said no

This rule is not yet implemented in the runtime, but the schema and AI prompt already
support it. When v2 ships, only the prompt needs updating to add an "EXCLUDED ANCHORS"
section per-target.
