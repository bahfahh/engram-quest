# 03 Presentation: choosing how each part is shown

Read the content first, then choose. A presentation is chosen because of the shape of what it shows, never because it is available.

## 1. Shapes and what suits them

| The content is... | Presentations that fit | Why it helps | In `patterns.js` |
|---|---|---|---|
| several things that relate to each other | **concept map grown step by step**: nodes appear one at a time, each line carries its relation | relations are easier to keep than names; watching it grow retraces the reasoning | `relationMap` (for sources and questions); otherwise your own |
| one source and what is taken from it | **sorting**: the source on one side, what it yields grouped on the other | shows where each idea came from | `sortInto` |
| a choice ("which one, when") | **decision ladder or tree**: questions in order, each with where a yes leads; then new cases to route | turns a rule into something the viewer operates | `ladder`, then cases in `recall` |
| two or more alternatives | **side-by-side cards** with the same facets in the same places | differences are remembered through contrast | `facets`, `optionCards`, `table` |
| things that differ along two qualities | **a map with two axes**: each thing at its place, then where the author stands and is heading | position is a cue; a trade-off becomes visible | `axisMap` |
| a process | **one case walking the steps**; then remove a step and show what breaks | concrete and causal; removing a step asks why it is there | `lanes` |
| something spread over time | **spans on a time axis**, with a marker at the moment that decides something | duration and overlap are seen, not read | `spans` |
| a mistake or an incident | **show it failing first**, pause, then the fix | surprise is kept better than a correct answer | your own |
| something that changed | **the same picture, before and after**, with what was crossed out and why | the author's own history is the cue nobody else has | `lanes` with two lanes |
| layers or parts of a whole | **zoom**: whole, one layer, one part, a real fragment, and back out | detail stays attached to its place | your own |
| quantities | **bars or a scale** with the numbers from the notes | size is seen, not read | `bars` |
| a figure the author already drew | **the figure itself**, with the places worth looking at pointed out one at a time | their own picture is the strongest cue they have | `figure` |
| how the topic's notes fit together | **relation map**: sources on the outside, the skeleton in the middle, one question lit at a time | the summary of the topic, shown last | `relationMap` |
| how topics of the period fit together | **tidy link map**: topics on two arcs with names outside, areas by colour, only real links, one relation read at a time, then the topics that stand alone | what a graph view shows, without the noise | `monthMap` (a month film); `relationMap` `outs` (inside a topic film) |
| anything already shown | **cover and fill**: the same picture with parts hidden, a pause, then filled | retrieval with the structure as the cue | `recall` |

Mix them inside one film. `film.example.js` uses eight of the patterns in a complete film; `film.gallery.js` shows the rest (`--film gallery --stills auto` renders one still of each). Look before choosing.

**When none fits, write a beat.** That is expected, not a failure of the template: two of the patterns above began as beats written for one film. A beat is a function `(c, W, q) => { ... }` of about ten lines: create elements with `el`, give each a moment with `on`, wait with `hold`, and end with `clear` (all exported; `spans` in `patterns.js` is a short one to read). Keep it in the film file; move it into `patterns.js` once a second film wants it.

## 2. Illustrate, do not caption

If a concept has a form, draw the form: a conversation as bubbles, a record as a row in a table, a document as a sheet, similarity as points that sit close, a relation as a line between two things, time as a bar with a marker. Words then name the parts.

Tests:

- Hide the text. Does the picture still show what happens?
- Could this screen be replaced by one sentence without loss? Then it is a caption, and the picture is missing.

Put the real thing on screen when the notes have it: the actual numbers, the actual rule, a few lines of the actual code, the person's own figure.

`facets`, `table` and `optionCards` are words laid out in order: with the text hidden they are empty boxes. They work after a picture has shown the thing (they then name its sides), not in place of one. A chapter made only of them is a slide deck.

## 3. Structure of a topic film

A structure that has worked; adapt it to the topic.

| Part | Purpose | Notes |
|---|---|---|
| Opening | place the topic without load | a few points only: the period, the areas, this topic, how long it has been going. End on the one question the topic answers |
| Skeleton | give the map | the 3-5 questions, in order, each with a colour it keeps. Always the whole skeleton; questions this film does not walk are dimmed (`taken`) |
| One chapter per question | the content | each chapter: the picture first, then its facets, then one line that states the point. A small marker shows which question is active |
| Relation map | summary | which notes answered which question; then the links out to other topics. This is the first time a dense map appears |
| Recall | retrieval | cover the key words of each question, wait, fill; then one or two new cases |
| Close | the author's own judgement | what they concluded for themselves, what the notes leave open; where the questions now live. A topic with no stated judgement skips that part rather than inventing one |

A month overview film uses the same ideas at one level up: a few points, then areas, then the real links one at a time, then the topics that stand alone, then one quick question per topic. `scripts/month_film.py` writes that film from the pack and the links (`04-production.md` §2); the only thing written by hand is the sentence for each link.

## 4. Time on screen

- Text needs time: about 5 characters per second for Chinese or Japanese, about 2.9 words per second for English, plus a moment to find it. `engine.js` reports any text that is on screen for less than it needs.
- A table is scanned, not read; give it time to be scanned before something moves.
- Recall: time to read the question, then about 6 seconds of quiet. Reveal: hold at least as long as the answer takes to read.
- Movement costs attention. When something must be read, everything else is still.

## 5. The look

The approved look is in `templates/film/look.css`. What it is for:

- **A near-black canvas, light type, thin lines**: nothing competes with the content.
- **Points for nodes, hairlines for links, italics for the relation on a link.**
- **Colour carries meaning only.** One colour per skeleton question, kept for the whole film (blue, teal, violet, rose, lime, assigned in order). Green and coral mean good and cost. Amber is the viewer's turn: the blanks and the countdown in recall. Sand and slate are spare, for categories inside a chapter. A category does not borrow a skeleton colour unless it is that question. "Written in this period" is a halo around a dot and "older" an outline, so it costs no colour. No colour for decoration.
- **Persistent orientation**: a path at top left (period / area / topic), the chapter at top right, the skeleton as a small strip at the bottom left with the active question lit.
- **Cards for pictured objects**: dark cards for interface-like things, a light sheet for documents.
- Type no smaller than about 26 px at 1920x1080; body text 30-40 px.

A different look is fine when the content calls for it. The fixed points stay: content fills the frame, colour means something, orientation is always visible.

## 6. Language

Changing the language is a new layout, not a substitution: alphabetic languages need roughly twice the width for the same sentence. Shorten the cards, re-check the stills for overflow and recompute the timing.
