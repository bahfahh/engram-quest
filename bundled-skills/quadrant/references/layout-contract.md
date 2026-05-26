# A4 Layout & iframe Contract

The recipe templates in `assets/` already implement everything in this file. You normally only
edit content fields. This guide explains the framework so you understand what must **not** change
and how the card talks to the plugin.

## Visual skeleton

```
┌──────────────────────────────────────────┐
│ [badge card X]  [phase text]              │  Header
├──────────────────────────────────────────┤
│ [Reveal all] [Enter review →]             │  Controls (top — reachable without scrolling)
├────────────────────┬─────────────────────┤
│ Q1 · Question      │ Q2 · Answer          │
│ (shown by default) │ ┌──────────────┐    │
│                    │ │ 🔒 reveal     │    │  Q1 open; Q2/Q3/Q4 covered (locked)
│                    │ └──────────────┘    │
├────────────────────┼─────────────────────┤
│ Q3 · Verbal IP     │ Q4 · Visual IP       │
│ ┌──────────────┐  │ ┌──────────────┐    │
│ │ 🔒 reveal     │  │ │ 🔒 reveal     │    │
│ └──────────────┘  │ └──────────────┘    │
└────────────────────┴─────────────────────┘
[💡 tip bar]
```

Q1 (the question) is the entry point, so it starts **open** — like a flashcard's front. The two
controls sit **above** the page so they're reachable without scrolling a tall A4 card, and
"Enter review →" is enabled immediately (you can recall straight from Q1; opening Q2–Q4 first is
optional study).

The cross fold is two 1px lines via `.paper::before` / `.paper::after` (opacity 0.5). Each
quadrant has a `.cover` (dashed, 45° striped, 🔒) hiding its `.content` until clicked.

## Filling the quadrant text (especially Q1)

Q1 should read as one natural question — the way you'd say it aloud. Two habits keep it clean:

- **The `.vs` highlight pill is for the term the question hinges on, not an arbitrary phrase.** In
  the two-panel recipe that is usually the compared options
  (`<span class="vs">Bedrock</span> 還是 <span class="vs">SageMaker</span>？`) or the single
  subject under scrutiny (`<span class="vs">Serverless</span> 為何…？`). Wrapping a stray verb
  phrase like "白白燒錢" in a pill drops a coloured box into the middle of the sentence and reads
  as noise — highlight the noun the learner is being asked about instead.
- **Let the text wrap; use `<br>` only at a real clause boundary.** The Q1 cell is centered and
  fairly narrow, so forcing a break every few words collapses it into a cramped vertical stack.
  One deliberate break at a natural pause is plenty; the parenthetical hint goes in `.small`,
  which already renders on its own line.

Same spirit for Q2–Q4: highlight the one thing that matters and keep the rest as readable prose.

## Four phases (state machine)

| Phase | Shows | Interaction |
|---|---|---|
| `learn` | Q1 open; Q2/Q3/Q4 covered "🔒 reveal" | Click a covered quadrant → it pops open. "Enter review →" is available from the start |
| `learn` (study) | Optionally open Q2/Q3/Q4 to study before recalling | "Reveal all" opens the remaining three at once |
| `review-thinking` | Q1 open; Q2/Q3/Q4 re-locked, covers become "🚫 no peeking" (`pointer-events:none`) | User recalls the answer mentally, clicks "Reveal answer →" |
| `review-revealed` | All 4 open | Shows 3 self-assessment buttons (✅ correct / ❌ wrong / 😵 blank) |
| `done` | Shows the matching prescription | Posts the score back to the parent |

## postMessage contract (DO NOT CHANGE)

The plugin embeds the HTML in a sandboxed iframe and communicates only through these messages.
Changing them breaks scheduling.

**Incoming** (plugin → card):
```js
window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "engram-quest-theme") {
    document.body.classList.toggle("dark", !!e.data.dark);   // dark-mode sync
  }
});
```

**Outgoing** (card → plugin):
```js
// after any layout change, report height so the iframe can resize
window.parent.postMessage({ type: "engram-quest-resize", height: document.documentElement.scrollHeight + 8 }, "*");

// on self-assessment, report the score (0–100)
window.parent.postMessage({ type: "engram-quest-solved", score: p.score }, "*");
```

The plugin clamps the score to 0–100 and maps it to an FSRS rating, then schedules the next
review. The card itself does no scheduling.

## Scoring → prescription → FSRS rating

| Self-assessment | score | Book prescription | Plugin FSRS rating |
|---|---|---|---|
| ✅ correct | 100 | Remembered; push next review further out (1wk → 2wk → 4wk) | Good |
| ❌ wrong | 60 | Review again soon; strengthen Q3 | Hard |
| 😵 blank | 25 | Redraw Q3/Q4 more absurd/vivid | Again |

Keep these three score values exactly (100 / 60 / 25) — the plugin relies on them to derive the
rating. The book's base cadence is next-day → 1 week → 2 weeks → 4 weeks; FSRS adapts from there.

## Dark mode

Every recipe defines a `body.dark { --var: ... }` palette and toggles it on the
`engram-quest-theme` message. When you add new colored elements, define both light and dark
values as CSS variables — never hardcode a single color that only works in one theme.
