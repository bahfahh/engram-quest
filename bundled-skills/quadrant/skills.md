---
name: quadrant
description: >
  Generate "Quadrant Card" A4 super-memory cards for the EngramQuest plugin (Pro feature).
  A Quadrant Card turns a single Q/A flashcard into a four-quadrant A4 memory sheet
  (Q1 question, Q2 answer, Q3 verbal IP / metaphor, Q4 visual IP / image) rendered as an
  interactive HTML iframe with its own spaced-repetition schedule.
  Trigger this skill whenever the user wants to "upgrade" a flashcard or note Q/A into a
  quadrant card, says "升級" / "upgrade" near flashcards, asks to build an A4 super-memory
  card, mentions the 四象限 / 一枚超記憶法 method, or wants a single concept turned into a
  memorable visual memory sheet — even if they do not say "quadrant" explicitly. Also trigger
  when the user has marked cards for upgrade in the plugin and asks to process them.
---

# Quadrant Card Skill (Pro)

Generate **Quadrant Cards** — single-concept A4 "super memory" sheets based on the
*A4 一枚超記憶法* method. Each card is a self-contained interactive HTML iframe with four
quadrants and its own review lifecycle inside the EngramQuest plugin.

## What a Quadrant Card is

Fold one A4 sheet into a cross of four quadrants, each with a strict role:

```
┌─────────────┬─────────────┐
│  Q1 Question │  Q2 Answer  │
├─────────────┼─────────────┤
│ Q3 Verbal IP │ Q4 Visual IP│
└─────────────┴─────────────┘
```

The core principle is **"IP-ification"**: each quadrant holds only keywords + imagery, never
prose notes. The whole sheet is memorized as one *impression unit* — recalling the look of the
sheet pulls all four quadrants back together. This is for content the user wants to remember for
a long time, not one-off lookups.

A Quadrant Card is **not** a quest map (no nodes, no map). It is a single reviewable card that
happens to render as an A4 iframe. Do not write it as a `*-quest.md` file.

## Output Language Rule

Generate all user-facing card text in the language that best matches the source note or the
user's prompt. If the prompt names a language, follow it; otherwise match the source. Keep JSON
keys and structural fields in English.

## The two modes

### Mode A — Create a new card
Trigger: "make a quadrant card about X", "/quadrant <note>", "build an A4 memory card for this".

1. Read the source note or topic.
2. Decompose into Q1–Q4 (see "The four quadrants").
3. Pick a recipe for Q4 (see decision tree → `references/recipes.md`).
4. Run the quality gate (`references/q3-q4-quality.md`).
5. Write the card artifacts (see "Output contract"). `source` = the note path, or `null` for a
   topic with no backing note.

### Mode B — Batch upgrade from the queue
Trigger: "upgrade", "升級", "process the cards I marked", "turn the marked flashcards into quadrant cards".

The plugin lets the user mark flashcards for upgrade from its UI. Each mark appends an entry to
`engram-quest/quadrant/upgrade-queue.json`. This mode drains that queue:

1. Read `engram-quest/quadrant/upgrade-queue.json` (Obsidian CLI: `obsidian read`, or read the
   file directly). If it is missing or has no `pending` entries, tell the user there is nothing
   to upgrade and offer Mode A instead.
2. For **each** entry whose `status` is `"pending"`:
   - Use the entry's `source`, `q`, and `a`. Read the `source` note when you need more context
     to write a good Q3 metaphor / Q4 visual.
   - Decompose into Q1–Q4, pick a recipe, run the quality gate.
   - Write the card artifacts. Set `source` to the entry's `source`.
   - Update that queue entry in place: set `status` to `"done"` and fill `cardId`.
3. Write the updated queue back. Report how many cards were upgraded.

A user may also upgrade a single specific flashcard directly ("upgrade this card") without the
queue — handle it like one Mode B entry, then there is no queue to update.

## The four quadrants

Brief definitions here; the hard parts (Q3 metaphor and Q4 visual) have a dedicated guide.

- **Q1 — Question** (most simplified): one clear, single question. A word, a formula, or one
  sentence. 1–2 lines, ≤ ~30 chars. Not a paragraph, not a broad topic.
- **Q2 — Answer** (heavily simplified): the answer with all filler stripped — keywords only, or a
  small structured diagram (e.g. `A → B → C`). ≤ 3 lines, scannable at a glance.
- **Q3 — Verbal IP** (metaphor / analogy, **NOT a forced mnemonic**): turn Q1/Q2 into a vivid
  mental picture. This is the quadrant the AI most often does badly. **Read
  `references/q3-q4-quality.md` before writing Q3.** The test: when the Q3 text surfaces in your
  mind, you must *see a concrete picture*. If not, rewrite it.
- **Q4 — Visual IP** (draw Q3's metaphor): carry Q3's metaphor into one concrete image. Prefer
  emoji over AI-drawn geometry. Pick the recipe from the decision tree below.

## Q4 recipe decision tree

```
What is Q3's metaphor shaped like?
  ├─ a cycle / process / flywheel        → Recipe A (CSS spinning flywheel)
  ├─ a binary / either-or / decision     → Recipe B (two-panel contrast comic)
  ├─ one strong single metaphor object   → Recipe C (one big emoji)
  └─ none of these →
        has genuine spatial structure (architecture / hierarchy)?
          ├─ yes → Recipe D (hand-drawn SVG — high risk, last resort)
          └─ no  → rewrite Q3 (the metaphor is not concrete enough)
```

Recipes A/B/C are proven and ship as copy-and-edit templates in `assets/`. **Copy the matching
template and change only the content fields — never rewrite the framework** (A4 layout, phase
switching, postMessage, dark mode, self-assessment are all already correct). Full HTML/CSS for
each recipe, the fields to change, and Recipe D's anti-pitfall rules are in
`references/recipes.md`.

## Output contract

Each card produces two files plus a queue update (Mode B only).

### 1. The iframe HTML → `engram-quest/quadrant/{cardId}.html`
Start from `assets/recipe-{A,B,C}-*.html` and edit only the content. The file already implements
the A4 layout, the four phases (learn → review-thinking → review-revealed → done), dark-mode
theming, and the postMessage contract. **Do not change the postMessage protocol** — the plugin
depends on it. Full layout + phase + postMessage contract: `references/layout-contract.md`.

### 2. The schedule + metadata → `engram-quest/quadrant/sr/{cardId}.json`
```jsonc
{
  "cardId": "<slug>-<timestamp>",
  "title": "<short human title for the card list>",
  "source": "<source note path, or null>",
  "deck": "<deck name>",         // group the card under this deck in the Hub tab (see below)
  "recipe": "A",                 // A | B | C | D
  "q1": "...", "q2": "...", "q3": "...", "q4": "...",   // plaintext, for list preview / search
  "created": "YYYY-MM-DD",
  "fsrs": null                   // leave null — the plugin initializes FSRS on first review
}
```
Set `deck` so the Hub tab can group cards by tag, exactly like Review Deck. Resolve it in this
order: the source note's flashcard tag's deck segment (e.g. tag `flashcards/azure` → deck `azure`),
else the source note's folder name, else a short topic label for an AI-created card. If you genuinely
cannot determine one, omit `deck` — the plugin falls back to the source note's tag/folder at render
time. Leave `fsrs` as `null`. The plugin owns scheduling; it initializes the FSRS state when the card
is first reviewed and maps the card's self-assessment (correct / wrong / blank) to a rating.

### `cardId` rules
- Stable, filesystem-safe slug of the source/title plus a timestamp suffix, e.g.
  `bedrock-vs-sagemaker-1748252400`. Used to key both the `.html` and the `sr/*.json`.
- On re-upgrade of the same source, reuse the existing `cardId` so review progress carries over.

## Generation flow

1. Determine the mode (A create / B upgrade-queue) from the user's request.
2. Gather content: read the source note; use the cheapest discovery path. When vault search is
   needed use Obsidian CLI — see `references/obsidian-cli.md`.
3. Decompose into Q1–Q4. Q1/Q2 are usually quick; spend the effort on Q3 (metaphor) and Q4.
4. Read `references/q3-q4-quality.md` and write Q3 + Q4 to pass its checklist.
5. Pick the recipe; copy the template from `assets/`; fill the content fields only.
6. Write `{cardId}.html` and `sr/{cardId}.json` under `engram-quest/quadrant/`.
7. Mode B: flip the queue entry to `done` with its `cardId`, then write the queue back.
8. Run the quality gate one final time before reporting done.

## Suitability — when to make a Quadrant Card

Good fits: a single clear Q/A, a concrete answer, room for a metaphor, content worth remembering
long-term. Poor fits: multi-part notes (split first), code/config snippets (no metaphor room),
pure enumeration lists (use review-deck instead), answers that change over time (metaphors expire).
If asked to upgrade a poor fit, say so honestly and suggest the better tool.

## References

- `references/recipes.md` — full HTML/CSS for Recipe A/B/C/D, fields to change, anti-pitfalls
- `references/q3-q4-quality.md` — Q3 metaphor rules, Q4 visual strategy, quality checklist, failure cases
- `references/layout-contract.md` — A4 skeleton, four phases, postMessage contract, scoring
- `references/obsidian-cli.md` — vault search syntax and fallback rules
