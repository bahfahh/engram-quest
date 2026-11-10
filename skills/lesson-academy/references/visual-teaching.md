# Showing the subject

Read this before planning a lesson's figures. It is about deciding what the learner should
*see* at each step and how to make it. It gives no catalogue of figure types, because the
right figure comes from the subject, and subjects differ.

## Contents

1. What a figure is for
2. Find the real thing
3. One running example
4. When the thing changes, let the figure change
5. Drawn, generated, or both
6. Asking for a generated image
7. Before a figure stays
8. Prose around figures

## 1. What a figure is for

A figure carries part of the explanation that prose carries badly: what something looks like,
how parts connect, how a quantity changes, what happens in what order. Two tests:

- Cover the paragraph. Does the figure still say something? If it only decorates, remove it.
- Ask where its layout came from. If you invented the boxes, cards or matrix to hold
  sentences, it is prose with borders: redraw it as the thing itself, or return it to a
  sentence or a plain table. A thing that really is made of words — a report, a receipt, a
  log — is the thing itself and passes.

A lesson has as many figures as it has ideas that can be shown. There is no number to aim for
and none to stay under.

## 2. Find the real thing

For each step of the lesson, ask: if the learner were standing where this happens, what would
be in front of them? That is what the figure shows.

The answer differs by subject. A few illustrations of the question, to show its range and not
to be picked from:

- Software: the code, the terminal output, the screen, the request and its response.
- A business idea: the actual numbers in the funnel, the invoice, the dashboard row.
- A body or a physical skill: the organ, the joint, the posture at the moment that matters.
- History or geography: the map, the document, the sequence of dated events.
- Mathematics: the quantity itself, drawn to scale — areas, counts, positions on a line.
- A judgement or habit: one concrete situation in which it is exercised.

When the subject is abstract, the real thing is usually an instance: not "overfitting" but one
prompt file growing patch by patch while two scores drift apart.

Draw with the fidelity that makes it recognisable — a window looks like a window, a receipt
like a receipt, a ruler like a ruler — and no more. Mark invented content as an illustration.

## 3. One running example

Choose one concrete case in the opening and keep it to the end. The same names and the same
numbers reappear in every figure, so each figure adds to a picture the learner already holds
instead of starting a new one. Use real-looking numbers and work them through; a learner can
check `2,000 × 5% × 20% = 20`, and cannot check "conversion improves".

## 4. When the thing changes, let the figure change

The page is live, so a figure can do what a printed one cannot. Use that where the subject
itself moves or varies:

- A process happens in steps → let it play, or be stepped through.
- The same thing can be looked at two ways → let the view switch.
- An outcome depends on a value → let the learner change the value and watch. When the point
  is the comparison between a few states, show those states side by side instead; a control
  suits exploring what lies between and beyond them.
- A sentence names a part → let the word light that part.

Movement earns its place by showing a change in the subject. It is never there to make the
page feel interactive, and it never tests the learner. The figure's resting state must already
make the main point, for the reader who touches nothing.

## 5. Drawn, generated, or both

Choose by what the real thing is made of.

- **Draw it in HTML, CSS or SVG** when it consists of exact text, numbers, code, or
  relationships, or when it has to respond. Screens, records, charts, timelines and mechanisms
  are drawn. Drawn figures stay sharp, follow the theme, and can be corrected.
- **Generate an image**, when the tool you are running in can generate images, when the real
  thing has shape and texture that drawing would flatten: anatomy, a posture, a physical
  object, a place, a scene from working life. A generated picture of the thing is better than
  boxes standing in for it.
- **Combine them** when a picture needs exact labels: the generated image shows the thing, and
  the names, numbers and arrows are HTML or SVG placed on or beside it. Text inside a generated
  image is unreliable; anything the learner must read correctly belongs in the page.

Without image generation, draw a simplified version in SVG and let labels and prose do more.
Never leave a placeholder where an image was meant to go.

## 6. Asking for a generated image

Tell the image model the one thing the picture must show, from what viewpoint, and what the
learner should notice. Ask for a look that sits on the lesson's page: a plain light
background, restrained colour that agrees with the course's accent, no decoration. Leave out
anything that must be exact (labels, numbers, interface text) and add it in the page. One
picture makes one point; a second point is a second picture.

## 7. Before a figure stays

- It shows something real from the running example, and passes both tests in section 1.
- Its caption states what to take from it, as a sentence.
- Everything in it is correct: labels, numbers, order. A generated image with garbled or wrong
  detail is regenerated, relabelled in HTML, or replaced by a drawing.
- It reads at phone width and in both themes (`html-recipe.md`).
- Nothing in it is there for atmosphere: no logos, stock scenery, or interface noise.

A figure that fails is not kept because it looks good.

## 8. Prose around figures

Prose is the thread that makes separate figures one lesson. Write connected paragraphs of a
few sentences: say what the learner is about to look at and why, show it, then say what it
means and what question it raises next. Headings state points, not topics. Mark the few terms
and the one sentence per section the learner must keep. When a detail matters but would
interrupt the thread — a term's formal name, something to watch for, a further question — put
it beside the text as a note.
