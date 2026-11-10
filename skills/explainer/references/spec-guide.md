# Spec guide

A page gives its owner the understanding a flashcard or a pile of notes could not, using what only this
vault knows: their notes, their neighbouring cards, their review history.

The spec holds words and structure. A renderer computes the layout and injects live facts from the vault.

## Step 1: choose the form from what the answer is made of

Start at `reading`. Leave it only when another form's test produces the evidence it asks for. Being able
to imagine a diagram proves nothing: almost any idea can be given parts and a way to misuse it.

First ask what kind of statement does the work in the card's answer, or in the claim an Insight makes:

| The answer mainly says | Candidate |
|---|---|
| what happens over time, or what one step causes later | `machine` |
| how two or three named options behave differently | `contrast` |
| why a claim holds given other ideas, and what follows from it | `map` |
| a rule, definition, list, or recommendation | `reading` |

Then write the evidence for every candidate the answer could support, not only the first that fits. A
test whose evidence you cannot write has failed. If none passes, stay at `reading`. A card with no usable
answer of its own is judged from its source note.

**`machine`** needs motion to be understood. Evidence: in a failure, name the step where the mistake
happens and the later step or other part where it shows up. They must be different places, so that
someone looking only at the symptom could not locate the cause. The failure must be true of how this
mechanism really works, whether or not the card mentions it; a misuse you had to invent does not count.
If one sentence ("skip X and X doesn't work") already says everything, there is nothing for motion to
reveal.

**`contrast`** needs the options side by side. Evidence: name the options, then give at least two concrete
situations where they produce different outcomes. Different names for the same outcome do not count. If
the difference only appears through a chain of events over time, that is a `machine`.

**`map`** needs the claim's surroundings. Evidence: at least 4 links from the claim to ideas outside the
card's own parts, each written as "get this wrong and you would believe ___". A card enumerating its own
parts is a list, and a list is `reading`.

**`reading`** covers judgement calls, advice, rules of thumb, definitions, and checklists. It is a
correct outcome, and a forced diagram is worse than none.

When two forms both produce evidence, take the one that answers the question the card literally asks.
Put the evidence in `formReason`.

Choosing `machine`, pick the layout by the question it answers:

| Question | layout |
|---|---|
| Who passes what to whom, in what order? | `sequence` |
| How does a search or authority narrow level by level? | `tree` |
| What does it go through, in order, and where can it drop out? | `pipeline` |
| What condition is it in, and what moves it to another? | `states` |

## Step 2: write the spec

### Common fields

```jsonc
{
  "id": "slug",
  "form": "machine | contrast | map | reading",
  "formReason": "why this form's test passed, one sentence, not shown to the reader",
  "title": "the question this page answers, at most 26 characters",
  "hook": "one line that makes the reader want the answer, at most 30 characters",
  "origin": "why this page exists, a natural observation about the card, at most 50 characters",
  "points": [ { "lead": "a claim, at most 12 characters", "body": "the reason, at most 70 characters", "note": "optional note name" } ],
  "anchor": { "line": "one concrete image, at most 20 characters", "note": "ground it in daily life, at most 60 characters" },
  "card": { "q": "the card front", "a": "the card back" }  // omit when the page has no flashcard behind it
}
```

`points` has 2 to 4 items. Together with the figure they must let the reader rebuild the card's answer.

The anchor must be a picture the reader can replay with eyes closed: an everyday object or process.
A shorter restatement of the definition is not an anchor.

### `machine`

```jsonc
"machine": {
  "layout": "tree | sequence | pipeline | states",
  "counter": { "label": "讀了", "unit": "頁" },     // optional; only if a number makes the point
  "assumption": "the made-up numbers or simplifications, at most 60 characters", // optional
  // layout-specific parts, see below
  "scenarios": [
    { "id": "ok", "label": "button text, at most 10 characters",
      "prompt": "the situation before anything happens, at most 44 characters",
      "steps": [ { "lit": ["partId"], "bad": [], "dim": [], "value": 1, "say": "what just happened and why, at most 44 characters", "note": "optional note name" } ] }
  ]
}
"relations": [ { "note": "note name", "relation": "how it connects, at most 16 characters" } ]  // up to 4, only real connections
```

Parts by layout. Every `id` is unique. Labels at most 10 characters, except where noted.

- `tree`: `"parts": [{ "id", "label", "parent" }]`. One root without `parent`, at most 4 levels, at most 10 leaves.
- `sequence`: `"actors": [{ "id", "label" }]` (2 to 5; labels at most 7), `"messages": [{ "id", "from", "to", "label" }]` (3 to 10, in time order; labels at most 14).
- `pipeline`: `"stations": [{ "id", "label", "sub" }]` (3 to 8, in order; `sub` at most 12 characters), optional `"exits": [{ "id", "from", "label" }]`, a place it can drop out, at most one per station; labels at most 14.
- `states`: `"states": [{ "id", "label" }]` (3 to 6), `"transitions": [{ "id", "from", "to", "label" }]` (at most 20,
  labels at most 10, each moving to a different state).

Scenarios: 2 to 4, each 2 to 6 steps. In `steps`, `lit` names only what this step newly activates, and
earlier ones stay lit, except in `states`, where `lit` holds just the id of the current state and the
transition into it lights by itself. `bad` marks what
breaks. `dim` marks what stops being useful in this step.

Each `say` explains the reason for the step. A narration of the visible motion wastes it.

### `contrast`

```jsonc
"contrast": {
  "options": [ { "id": "fake", "label": "the option's name, at most 12 characters", "sub": "what it is, at most 14 characters" } ],
  "situations": [
    { "id": "s1", "label": "one concrete situation, at most 20 characters",
      "outcomes": { "fake": { "text": "what happens, at most 26 characters", "tone": "good | bad | plain" } },
      "why": "the reason the outcomes differ, at most 60 characters", "note": "optional note name" }
  ],
  "verdict": "how to decide between them, at most 24 characters"
}
"relations": [ { "note": "note name", "relation": "how it connects, at most 16 characters" } ]  // up to 4, only real connections
```

2 or 3 options, 2 to 4 situations, and every situation gives every option an outcome. Each outcome states
what actually happens in that situation; restating the option's definition wastes it. Use `good` and
`bad` only when the situation clearly favours one side, and `plain` when neither loses. If the usually
better option has a situation where it loses, include it.

### `reading`

```jsonc
"edges": {
  "holds": ["a concrete case where this applies, at most 30 characters"],
  "breaks": ["a concrete case where it stops applying or gets mistaken for it, at most 30 characters"]
}
"relations": [ { "note": "note name", "relation": "at most 16 characters" } ]  // optional, up to 4
```

1 to 3 items on each side. A rule is understood by knowing where it stops; a definition, by knowing what
looks like it and isn't. Omit `edges` only for a plain fact with nothing to confuse it with.

### `map`

```jsonc
"map": {
  "center": { "label": "the concept, at most 12 characters", "sub": "at most 10 characters" },
  "nodes": [
    { "id": "io", "note": "exact note name, or a title worth writing", "short": "the name shown in the node", "band": "foundation | neighbor | consequence",
      "kind": "the type of relationship, at most 16 characters", "relation": "edge label, at most 6 characters",
      "why": "why this connection changes the reader's thinking, at most 80 characters",
      "quote": "optional: a sentence copied exactly from that note" }
  ]
}
```

`foundation` is what it rests on (at most 3). `neighbor` is what it gets confused or paired with (at most
2). `consequence` is what follows from it, including where it fails (at most 3). 4 to 8 nodes in total.

`short` is required: the name shown inside the node, at most 8 characters, counting two Latin
letters as one. It is the idea's everyday name, not a truncated note title. `note` stays the exact name.

### `shapes` (optional, on any form)

A picture of what the thing physically becomes. It earns its place only when the understanding lives in
a change of form: the same data rearranged, one layer stacked on another, one shared object against many
copies, two environments side by side. If the picture would only repeat the parts of the machine, or the
idea has no physical form, omit `shapes`. A decorative picture is worse than none.

```jsonc
"shapes": {
  "title": "states what changes, at most 18 characters",
  "text": "one or two sentences, at most 90 characters. {2|a phrase} links that phrase to panel 2 (panels count from 1)",
  "panels": [
    { "caption": "what this panel is, at most 12 characters",
      "tight": false,    // true: plates are one bundle of sheets; false: separate tiers
      "route": false,    // true: a dotted path descends through every plate in the panel
      "plates": [ { "size": "s | m | l", "marks": "none | dots | rows | grid", "hot": false, "ghost": false, "column": "left | center | right", "tag": "a name under the column, at most 4 characters" } ] }
  ],
  "steps": ["what happens between two panels, at most 8 characters"],
  "hand": "a margin note, the one thing to notice, at most 22 characters"
}
```

A plate is a flat sheet: a table, a layer, an object, a scope. List plates bottom to top, at most 4 in a
panel. `size` is how much it holds relative to the others. `marks`: `dots` is unordered records, `rows` is
ordered entries, `grid` is cells, `none` is a plain container. `hot` is what to look at, at most one per
panel, and a panel may have none. `ghost` is missing, empty, or thrown away, and is never `hot`. `column`
defaults to `center`; each column is its own stack, side by side, and nothing spans two columns. When a
panel has more than one column, give each column a `tag` so the reader can tell them apart. Plates carry
no other text, so the caption says what the panel shows.

2 or 3 panels. `steps` has one entry fewer than `panels`.

## Conventions

- An `id` is a short name without spaces or quotation marks, and cannot be a built-in word such as `constructor`.
- Character limits count two Latin letters or digits as one character, everywhere in the spec. Labels drawn
  inside a figure have no room to spare: `label`, `sub` on stations and the map centre, `short`, `relation`,
  `caption`, `steps`, and `tag` must stay within their limits.
- A `note` is the file name without `.md`. If that name exists in more than one folder, use the path from
  the vault root.
- For `reading`, `formReason` says which test failed and why.
- In `contrast`, every option must answer the same decision. An option on a different axis belongs in
  `points`.
- If the source note no longer holds the card, work from the card itself and do not cite the note for it.
- An anchor must be a new image, unless the card's own analogy already works and only needs grounding.

## Truth rules

- Never write the owner's numbers: no Again counts, stability, review dates. The renderer computes those
  live. Words such as "you failed this" are also out.
- `note` must be a real note name from the vault, unless you are proposing a note that is genuinely
  missing. Never invent a name to fill a slot.
- `quote` is copied character for character. The renderer verifies it and drops mismatches. Omit it when
  there is nothing worth quoting.
- Technical claims must be correct. Label invented numbers in `assumption`.
- A claim on the page that you cannot support from the notes or a reliable source stays off the page, even when
  the original card makes it.
