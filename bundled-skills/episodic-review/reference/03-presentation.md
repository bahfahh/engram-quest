# 03 Presentation: choosing how each part is shown

Read the content first, then choose. A presentation is chosen because of the shape of what it shows, never because it is available.

## 1. Shapes and what suits them

| The content is... | Presentations that fit | Why it helps |
|---|---|---|
| several things that relate to each other | **concept map grown step by step**: nodes appear one at a time, each line carries its relation | relations are easier to keep than names; watching it grow retraces the reasoning |
| a choice ("which one, when") | **decision ladder or tree**: questions in order, each with where a yes leads; then new cases to route | turns a rule into something the viewer operates |
| two or more alternatives | **side-by-side cards** with the same facets in the same places; or a spectrum | differences are remembered through contrast; edge cases test understanding |
| a process | **one case walking the steps**; then remove a step and show what breaks | concrete and causal; removing a step asks why it is there |
| a mistake or an incident | **show it failing first**, pause, then the fix | surprise is kept better than a correct answer |
| something that changed | **the same picture, before and after**, with what was crossed out and why | the author's own history is the cue nobody else has |
| layers or parts of a whole | **zoom**: whole, one layer, one part, a real fragment, and back out | detail stays attached to its place |
| quantities | **bars or a scale** with the numbers from the notes | size is seen, not read |
| how the topic's notes fit together | **relation map**: sources on the outside, the skeleton in the middle, one question lit at a time | the summary of the topic, shown last |
| how topics of the period fit together | **tidy link map**: areas as groups, only real links, one relation read at a time | what a graph view shows, without the noise |
| anything already shown | **cover and fill**: the same picture with parts hidden, a pause, then filled | retrieval with the structure as the cue |

Mix them inside one film. `templates/film/patterns.js` has a working version of most; write a new one with `engine.js` when none fits.

## 2. Illustrate, do not caption

If a concept has a form, draw the form: a conversation as bubbles, a record as a row in a table, a document as a sheet, similarity as points that sit close, a relation as a line between two things, time as a bar with a marker. Words then name the parts.

Tests:

- Hide the text. Does the picture still show what happens?
- Could this screen be replaced by one sentence without loss? Then it is a caption, and the picture is missing.

Put the real thing on screen when the notes have it: the actual numbers, the actual rule, a few lines of the actual code, the person's own figure.

## 3. Structure of a topic film

A structure that has worked; adapt it to the topic.

| Part | Purpose | Notes |
|---|---|---|
| Opening | place the topic without load | a few points only: the period, the areas, this topic, how long it has been going. End on the one question the topic answers |
| Skeleton | give the map | the 3-5 questions, in order, each with a colour it keeps |
| One chapter per question | the content | each chapter: the picture first, then its facets, then one line that states the point. A small marker shows which question is active |
| Relation map | summary | which notes answered which question; then the links out to other topics. This is the first time a dense map appears |
| Recall | retrieval | cover the key words of each question, wait, fill; then one or two new cases |
| Close | the author's own judgement | what they concluded for themselves, what the notes leave open; where the questions now live |

A month overview film uses the same ideas at one level up: a few points, then areas, then the real links one at a time, then the topics that stand alone.

## 4. Time on screen

- Text needs time: about 5 characters per second for Chinese or Japanese, about 2.9 words per second for English, plus a moment to find it. `engine.js` reports any text that is on screen for less than it needs.
- A table is scanned, not read; give it time to be scanned before something moves.
- Recall: time to read the question, then about 6 seconds of quiet. Reveal: hold at least as long as the answer takes to read.
- Movement costs attention. When something must be read, everything else is still.

## 5. The look

The approved look is in `templates/film/look.css`. What it is for:

- **A near-black canvas, light type, thin lines**: nothing competes with the content.
- **Points for nodes, hairlines for links, italics for the relation on a link.**
- **Colour carries meaning only.** One colour per skeleton question, kept for the whole film; green and coral for good and cost. No colour for decoration.
- **Persistent orientation**: a path at top left (period / area / topic), the chapter at top right, the skeleton as a small strip at the bottom left with the active question lit.
- **Cards for pictured objects**: dark cards for interface-like things, a light sheet for documents.
- Type no smaller than about 26 px at 1920x1080; body text 30-40 px.

A different look is fine when the content calls for it. The fixed points stay: content fills the frame, colour means something, orientation is always visible.

## 6. Language

Changing the language is a new layout, not a substitution: alphabetic languages need roughly twice the width for the same sentence. Shorten the cards, re-check the stills for overflow and recompute the timing.
