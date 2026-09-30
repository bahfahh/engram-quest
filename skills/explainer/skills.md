---
name: engram-explainer
description: >
  Generate "Deep Dive" (深入解析) pages for the EngramQuest plugin (Pro feature).
  A Deep Dive is a single-concept, plain-language, visual HTML explanation page created when a
  flashcard fails the user — too hard, badly worded, or missing context. It replaces the former
  Quadrant Card feature. Trigger this skill whenever the user says "deep dive", "深入解析",
  "解析", "詳解", "explainer", asks to "process the deep dive queue" / "處理解析" / "處理詳解" /
  "生成解析", wants a concept "explained properly" / "解釋清楚" / "白話解釋" / "圖解" a topic or
  card, says a flashcard is too hard to understand ("這張卡看不懂"), or has queued cards for
  deep dives in the plugin and asks to handle them. Also trigger for "make a deep dive about X" /
  "幫我做一份 X 的深入解析" style direct requests with no queue involved.
---

# Explainer Skill (Pro)

Generate **Explainer pages** — one self-contained HTML page that explains a single concept in
plain language with visual diagrams and a memory anchor. An Explainer exists because a flashcard
failed the user: the card alone was too hard, too terse, or too isolated to learn from. Your job
is to give the learner the understanding scaffold the card could not.

An Explainer is **not** a quiz, not a quest, and has **no spaced-repetition schedule of its own**.
The original flashcard keeps its FSRS schedule in review-deck; the Explainer is a support artifact
attached to it. Success is measured by the original card's future reviews, not by the page itself.

## Output Language Rule

Generate all user-facing page content in the language that best matches the source card or the
user's prompt. Keep JSON keys, file names, and structural fields in English.

CRITICAL: authoring vocabulary must never appear in the generated page. Words like "由淺入深",
"淺/中/深", "diagnosis", "shallow to deep" are production concepts for you, not content for the
learner. Depth-layer labels on the page must be content-meaningful (e.g. "地基", "核心原則",
"完整五步"), never abstraction-level names.

## The two modes

### Mode A — Direct creation
Trigger: "幫我做一份 HTTPS 的詳解", "make an explainer about X", "把這個筆記做成詳解".

1. Read the source (a note, a card, or a bare topic).
2. Run the diagnosis (below) — for a bare topic with no failing card, default to the
   **too-hard** treatment (build from the ground up).
3. Generate the page and metadata (see Output contract). `sourceCard` is `null` for bare topics.

### Mode B — Drain the queue
Trigger: "處理詳解", "process the explainer queue", "把我標記的卡片做成詳解".

The plugin's review session has a「詳解」button. Each press appends a `pending` entry to
`engram-quest/explainer/queue.json`. This mode drains that queue:

1. Read `engram-quest/explainer/queue.json`. If missing or no `pending` entries, tell the user
   there is nothing queued and offer Mode A instead.
2. For each `pending` entry: run the diagnosis, generate the page and metadata, then update the
   entry in place — set `status` to `"done"` and fill `explainerId`.
3. Write the queue back. Report how many pages were created (and how many were rewrites).

A user may also point at one specific card ("explain this card properly") without the queue —
handle it like a single Mode B entry; there is no queue to update.

## The diagnosis (run before writing anything)

Pressing「詳解」means "this card's presentation failed me". Different failures need different
pages, so first read the evidence and pick the failure type:

| Diagnosis | Evidence | Page emphasis |
|---|---|---|
| **too-hard** — the card assumes background the user lacks | jargon-dense card, dense source note, repeated Again in SR history | Build from the ground up: identify the missing prerequisites and teach those first, then climb to the card's concept |
| **poor-description** — the card is too terse or ambiguous | one-line front/back, hints don't rescue it | Re-explain in plain words: new angle, concrete examples, everyday language |
| **no-context** — the concept is isolated, memorized without a map | card unrelated to deck siblings, note lacks surrounding context, user memorized steps but not why | Build the map first: where the concept lives, why it exists, who its neighbors are — then the details |

Evidence sources (all available at batch time, no user interaction needed):
- The card itself (`q`/`a` from the queue entry).
- The original card's SR history: `engram-review/sr/{srFileName}.json` (srFileName = notePath with `/` → `__`).
  Each card's `log` lists its most recent reviews (up to 20) as `{ "d": "YYYY-MM-DD", "r": 1–4 }`, where
  `r: 1` is Again. Cards last reviewed before the plugin started logging have no `log`; fall back to
  low `stability` / high `difficulty` as the signal.
- Hints: `engram-review/hints/{note-name}.json`.
- The source note (read it — it feeds sections ②④⑤).
- Deck siblings: other cards in the same deck are natural candidates for the "common confusions"
  section — the user grouped them together precisely because they live in the same confusion zone.
- When vault search is needed, use Obsidian CLI — see `references/obsidian-cli.md`.

State the diagnosis in the page's origin banner in natural language (e.g. "原卡一行帶過 B-tree，
但它預設你知道磁碟讀取為什麼慢") — never as a bare category label.

## Page structure (①–⑥)

The full skeleton, design system, and section-by-section guidance are in
`references/html-recipe.md` — **read it before writing any HTML**. Read
`references/visual-ip.md` before writing the memory anchor or any diagram.
Structural examples (one per diagnosis type) live in `assets/examples/` — use them as structural
references, not copy-paste content.

1. **Origin banner** — how this page came to be + the diagnosis in natural language.
2. **① The problem it solves** — what breaks without this concept. Hook first, definition later.
3. **② The map** — where the concept lives (layer diagram, journey, or cast of roles).
4. **③ Memory anchor** — one main visual metaphor per page (see `references/visual-ip.md`).
5. **④ Layered deep-dive** — climb from foundations to full mechanism. Write the layers so each
   one stands on the previous; label them by content, never by depth level.
6. **⑤ Common confusions** — 2–3 traps, sourced from deck siblings and classic misconceptions.
7. **⑥ Back to the original card** — quote the original Q/A (answer collapsed behind a button).
   The closing line tells the user the real test is the card's next review. No quiz, no scoring.

## Output contract

Each Explainer produces two files plus a queue update (Mode B only).

### 1. The page → `engram-quest/explainer/{id}.html`
Self-contained HTML per `references/html-recipe.md`. postMessage contract: only
`engram-quest-resize` (outgoing) and `engram-quest-theme` (incoming). **No
`engram-quest-solved`, no self-assessment, no scoring.**

### 2. The metadata → `engram-quest/explainer/meta/{id}.json`
```jsonc
{
  "id": "<slug>-<timestamp>",
  "title": "詳解：HTTPS 到底是什麼",
  "sourceCard": { "note": "path/to/note.md", "front": "HTTPS 是什麼？" },  // null for bare topics
  "deck": "network",
  "diagnosis": "too-hard | poor-description | no-context",
  "created": "YYYY-MM-DD",
  "rewriteCount": 0
}
```
Resolve `deck` like review-deck does: the source note's flashcard tag's deck segment, else the
note's folder name, else a short topic label.

The plugin owns `engram-quest/explainer/state.json` (per-page viewed/starred/completed flags).
Never write, rewrite, or delete that file — a rewrite of a page keeps its `id`, so the user's
reading state survives automatically.

### `id` rules
- Filesystem-safe slug of the concept plus a timestamp suffix, e.g. `https-basics-1785489701`.
- On rewrite of the same card, **reuse the existing `id`** and bump `rewriteCount` — the page URL
  stays stable for anything that links to it.

### Queue entry shape (`engram-quest/explainer/queue.json`)
```jsonc
{
  "entries": [
    {
      "status": "pending",              // → "done" after processing
      "source": "path/to/note.md",       // source note of the card
      "q": "card front", "a": "card back",
      "deck": "network",                 // may be null — resolve it yourself then
      "markedAt": "ISO timestamp",
      "regenerate": false,               // true = rewrite of an existing explainer
      "explainerId": null                // filled by skill when done (or pre-filled on regenerate)
    }
  ]
}
```

## The rewrite loop

An Explainer that didn't help must get simpler, not stay stale. During every Mode B run, after
draining the queue:

1. List existing `meta/*.json` entries with a non-null `sourceCard`.
2. For each, read the original card's SR `log`. If it has ≥2 entries with `r: 1` (Again) dated
   **after** the Explainer's `created`/last rewrite date, the page failed — rewrite it. No `log`,
   or no such entries → leave the page alone.
3. Rewrite = same `id`, `rewriteCount + 1`, and a genuinely different approach: shallower entry
   point, different metaphor, more prerequisite coverage. Do not lightly rephrase the old page.

## Suitability

Good fits: one concept the user is struggling to understand; anything with a "why" behind it.
Poor fits:
- A topic needing many missing prerequisites (a whole course's worth) → say so and suggest
  Lesson Academy instead. An Explainer is one page, not a curriculum.
- Pure enumeration/lookup content with no mechanism to explain → the flashcard was already the
  right tool; say so honestly.

## References

- `references/html-recipe.md` — page skeleton, design system, section guidance, dark mode, postMessage
- `references/visual-ip.md` — memory anchor rules, diagram vocabulary, emoji-first constraints
- `references/obsidian-cli.md` — vault search syntax and fallback rules
- `assets/examples/` — one finished page per diagnosis type (structure reference)
