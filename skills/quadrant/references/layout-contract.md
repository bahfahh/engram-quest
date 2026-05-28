# A4 Layout & iframe Contract

The recipe templates in `assets/` already implement everything in this file. You normally only
edit content fields. This guide explains the framework so you understand what must **not** change
and how the card talks to the plugin.

## Visual skeleton

```
┌──────────────────────────────────────────┐
│ [badge card X]  [phase text]              │  Header
├──────────────────────────────────────────┤
│ [Reveal all → 自評]                       │  Single control (top — reachable without scrolling)
├────────────────────┬─────────────────────┤
│ Q1 · Question   ⤢ │ Q2 · Answer       ⤢ │
│ (shown by default) │ ┌──────────────┐    │
│                    │ │ 🔒 reveal     │    │  Q1 open; Q2/Q3/Q4 covered (locked)
│                    │ └──────────────┘    │
├────────────────────┼─────────────────────┤
│ Q3 · Verbal IP  ⤢ │ Q4 · Visual IP    ⤢ │
│ ┌──────────────┐  │ ┌──────────────┐    │
│ │ 🔒 reveal     │  │ │ 🔒 reveal     │    │
│ └──────────────┘  │ └──────────────┘    │
└────────────────────┴─────────────────────┘
[💡 tip bar]
```

The `⤢` in each opened quadrant's top-right is the **focus / zoom** button (see "Focus / zoom"
below). It surfaces only after a quadrant is opened, so it never lets the learner peek at a
covered answer.

Q1 (the question) is the entry point, so it starts **open** — like a flashcard's front. The
single "Reveal all → 自評" control sits **above** the page so it's reachable without scrolling a
tall A4 card. You can recall straight from Q1 then hit it to grade yourself; opening Q2–Q4 covers
one at a time first is an optional study peek that **does not** trigger self-rating — only the
"Reveal all" button does.

The cross fold is two 1px lines via `.paper::before` / `.paper::after` (opacity 0.5). Each
quadrant has a `.cover` (dashed, 45° striped, 🔒) hiding its `.content` until clicked.

**Responsive (mobile).** Below a 520px viewport the template auto-collapses the 2×2 into a single
full-width column (Q1→Q2→Q3→Q4) and hides the cross fold — at phone widths a half-cell is only
~160px, too narrow to hold the content without it overflowing and being clipped. You don't author
this; it's a `@media` rule in every recipe. But it does shape how you write: the four-at-a-glance
comparison won't be visible at once on a phone, so each cell must stand on its own as a terse
hook, and any side-by-side contrast (e.g. the comic's two panels) should live *inside one
quadrant* rather than relying on Q-to-Q adjacency.

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

## Focus / zoom — when a quadrant needs more room

Each opened quadrant has a `⤢` button (`.zoomBtn`). Tapping it promotes that quadrant to a
full-screen overlay (`.quadrant.focused` → `position:fixed; inset:0`) with its content scaled up
(`zoom: 1.45`); the button turns into `✕`, and Esc or tapping it again returns to the 2×2 grid.
On entering focus the card posts `{ type:"engram-quest-resize", height: 99999 }` so the iframe
grows to its height cap (~78vh) and the overlay fills the visible area; on exit it reports the
real `scrollHeight` again. This is purely presentational — phase, scoring, and the postMessage
contract are untouched — so all of it already lives in the recipe templates and you don't author
it per card.

**This is a relief valve, not a license to write more.** The whole power of the four-quadrant
card is *one A4 page, four cells seen at a glance* — a memory palace. The grid is the home base;
focus is a temporary detail view, most useful for a genuinely dense quadrant (often Q4's visual
or a layered diagram). So keep authoring each cell as a terse, vivid **memory hook**, sized to
read fine in its half-cell. Focus should make an already-good cell *more comfortable to study*,
never rescue a cell you crammed full of prose.

If a topic honestly carries too much to fit — e.g. a whole system architecture — the right move
is **not** to stuff one card and lean on zoom. Either split it into 2–3 quadrant cards (each a
clean sub-question), or let the quadrant hold the hook and keep the full detail in the source
note. A card that only makes sense zoomed in is a card that lost the method.

## Three phases (state machine)

The card has one review entry — clicking **"Reveal all → 自評"** jumps straight from `learn` into
`review-revealed`. There is no intermediate "re-lock to force recall" phase: recall happens in
the learner's head while looking at Q1, then they click the button and grade themselves. Removing
that middle phase keeps the flow short — the user complained the prior re-lock step felt cumbersome.

| Phase | Shows | Interaction |
|---|---|---|
| `learn` | Q1 open; Q2/Q3/Q4 covered "🔒 reveal" | Click a covered quadrant for an optional peek (stays in `learn`, no self-rating). When ready to grade yourself, click **"Reveal all → 自評"** |
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

The target origin is `"*"` on purpose: the iframe is sandboxed with `allow-scripts` only (no
`allow-same-origin`), so it has a null origin and literally cannot name a specific `targetOrigin`.
Don't "tighten" it to a fixed origin — that silently breaks resize and scoring.

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

### Three color pairs only

Each recipe ships **three** semantic color pairs, all with `:root` and `body.dark` values defined:

| Semantic | Background | Border / accent | Text on background |
|---|---|---|---|
| `bad` (error / wrong answer / pitfall) | `var(--bad-soft)` | `var(--bad)` | `var(--ink)` |
| `good` (correct / permanent fix) | `var(--good-soft)` | `var(--good)` | `var(--ink)` |
| `warn` (temporary fix / caveat / amber notice) | `var(--warn-soft)` | `var(--warn)` | `var(--warn-text)` |

`--warn` uses a dedicated `--warn-text` (deep brown in light, pale amber in dark) instead of
`--ink`, because `--warn-soft` is light amber in light mode and dark amber in dark — `--ink`
flips the wrong way against it.

**Hard rule for any colored box:**

- Use one of these three pairs. Don't write `background:#fef3c7` or any other hardcoded hex on a
  `.q*-trap` / `.q*-side` / similar element — hardcoded hex does **not** flip with `body.dark`,
  so the text inside (which uses a `var(--…)` that *does* flip) ends up invisible in one theme.
  This is the most common dark-mode bug in AI-generated quadrant cards.
- Don't put `color: var(--muted)` inside a colored-pair box. `--muted` is tuned for the *paper*
  background, not for `--*-soft`. Use the pair's matching text color (or `var(--ink)` for
  bad/good, `var(--warn-text)` for warn).
- If a recipe genuinely needs a fourth accent (e.g. Recipe C's `--bird` for the bird metaphor),
  define **both** `:root` and `body.dark` values for it in that recipe's `<style>`. Never write
  the accent inline on an element.
