# Visual Teaching Guide

Use this when a Lesson Academy lesson would be easier to understand with a visual. A visual is
optional, not a requirement. Add one only when it performs a learning job that text alone does
poorly.

## Contents

1. When to add a visual
2. Choose the visual type
3. Choose the production method
4. Prompt patterns
5. Quality gate
6. HTML integration

## 1. When to add a visual

Add a visual when at least one is true:

- The learner must understand spatial structure, hierarchy, or layout.
- The learner must track steps, branches, or multiple actors.
- The topic is abstract and needs a concrete scene or analogy.
- The lesson compares similar ideas that are easy to confuse.
- The learner needs a decision aid for choosing a method.

Skip visuals when the concept is already simple in prose, when the image would only decorate the
page, or when a short table or code snippet is clearer.

Default visual budget:

- 0 visuals: simple lessons.
- 1 visual: normal target for hard concepts.
- 2 visuals: only when one visual gives real-world context and another explains the mechanism.
- More than 2: split the lesson unless the user explicitly asks for visual experimentation.

## 2. Choose the visual type

Pick by the shape of the knowledge:

Always classify the knowledge shape before choosing the production method. Complex concepts with
multiple actors, layers, or steps are strong candidates for a teaching image — a well-crafted
visual makes an abstract mechanism immediately graspable. The goal is an image that explains
itself: a learner should be able to look at it and understand the key idea without reading a
paragraph first. Avoid generic atmospheric scenes that look good but teach nothing.

| Knowledge shape | Best visual type | Use for |
|---|---|---|
| Concepts and relationships | Concept map | Terms, dependencies, mental models |
| Steps and branches | Flowchart | Procedures, debugging, conditional logic |
| Actor-to-actor messages | Sequence or swimlane | OAuth, API calls, frontend/backend flows |
| System parts and data movement | System diagram | Architecture, modules, infrastructure |
| Similar ideas and tradeoffs | Comparison | Tool choice, confusing pairs |
| Choosing what to do | Decision tree | Selection rules, troubleshooting |
| Change over time | Timeline | Lifecycles, history, release flow |
| Feedback dynamics | Causal loop | Reinforcing loops, product/system behavior |

Mind maps are good for brainstorming or course planning, but less precise for final teaching than
concept maps or decision trees.

## 3. Choose the production method

Use **AI image generation capability** when the learning value comes from realism, immersion, or a
polished teaching image that compresses a complex concept into one memorable visual:

- Product-like screens, real-world UI states, login pages, dashboards, broken layouts.
- Physical scenes, real workplace contexts, everyday analogies.
- A single focused moment that helps the learner feel the problem.
- Educational infographics for complex mechanisms — e.g. a numbered step-by-step flow with
  clearly labelled actors and arrows, a layered system diagram, or an authentication sequence.
  The image must show the mechanism, not just the setting. If a learner can glance at it and
  understand the key idea, it passes; if it only sets a mood, it fails.

Actively consider using a teaching image for any lesson where the concept involves multiple
moving parts, layers, or actors. A great teaching image is often more effective than three
paragraphs of prose.

Use **SVG/HTML diagrams** when the learning value comes from precision:

- Exact text labels, arrows, numbered steps, tables, decision trees.
- Flows that must be correct.
- Interactive controls, overlays, or mobile-responsive diagrams.
- Repairing or supplementing an AI-generated image whose labels, arrows, or details are not exact
  enough.

Use **hybrid** when both matter:

- Generate the scene as a bitmap, then add exact HTML/SVG labels, arrows, legends, or captions.
- Prefer hybrid when generated text may be unreliable but the scene itself is valuable.

Do not interpret "generate an image" as "ask for a PNG filename in the prompt." It means use AI
image generation capability when that medium is appropriate, then save/embed the resulting raster
asset.

## 4. Prompt patterns

Keep each generated image focused on one teaching point. Ask for readable text only when needed;
if exact text is critical, use SVG/HTML or hybrid overlays instead.

### Immersive real-world case

Use for: "why should I care?" openings.

```text
Create a high-quality Traditional Chinese educational image for <topic>.
Show a realistic product/work scenario where <problem> is visible.
The image should teach one point: <single learning point>.
Include clear title text: "<short title>".
Show before/after or problem/cause/result if useful.
Style: polished online course slide, realistic UI/product context, clean hierarchy.
Avoid: decorative-only imagery, clutter, tiny text, fake glyphs, logos, watermarks.
```

### What / Why / How explainer

Use for: concept summaries.

```text
Create a Traditional Chinese educational infographic for <topic> using three columns:
WHAT: <what it is>
WHY: <why it matters>
HOW: <how to use or reason about it>
Use clear arrows, simple examples, and one-sentence takeaway.
Style: clean course slide, high information clarity.
Avoid tiny text and garbled labels.
```

### Top-down mental model

Use for: hierarchy from big picture to details.

```text
Create a Traditional Chinese top-down mental model diagram for <topic>.
Show levels from high-level goal to low-level mechanism:
1. <level>
2. <level>
3. <level>
Include a side example that decomposes one concrete case through those levels.
Style: precise educational infographic, clear hierarchy, readable labels.
```

### Flow / sequence

Use for: processes and actor interactions.

```text
Create a Traditional Chinese educational flow diagram for <topic>.
Actors: <actor list>.
Steps: <numbered steps>.
Visually distinguish browser/user actions from backend/server actions.
Emphasize the key boundary: <boundary>.
Style: clean technical infographic, clear arrows, readable labels.
```

### Comparison

Use for: confusing pairs and tradeoffs.

```text
Create a Traditional Chinese comparison infographic: <A> vs <B>.
Compare by these dimensions: <dimension list>.
End with a clear rule of thumb: <decision rule>.
Style: two-column course slide, crisp labels, strong contrast.
```

### Decision tree

Use for: turning knowledge into action.

```text
Create a Traditional Chinese decision tree for choosing <method/tool>.
Start question: <question>.
Branches: <conditions>.
Leaves: <recommendations>.
Style: clean teaching diagram, minimal text, clear decision path.
```

## 5. Quality gate

Before embedding a visual, check:

- It has one clear teaching focus.
- It helps explain something that prose alone would make harder.
- Text in the image is readable, accurate, and not garbled.
- The visual is understandable at lesson width; captions can carry detail, not rescue a bad image.
- A generated image with unreliable text is either regenerated or converted to hybrid/SVG.
- The image does not contain irrelevant logos, fake UI noise, watermarks, or hallucinated claims.
- The lesson still works without the visual if the learner is on a small screen.

If a visual fails the gate, do not keep it just because it looks good.

## 6. HTML integration

Lesson HTML is loaded through a sandboxed `srcdoc` iframe. Keep resources self-contained.

For generated raster assets:

1. Copy the selected generated image into the course folder, usually
   `engram-quest/lessons/{courseSlug}/assets/`.
2. Embed it as a data URI in the HTML, or use another plugin-supported local resource mechanism
   if one exists.
3. Add `alt` text and a caption explaining the learning job of the image.
4. Keep image dimensions responsive: `width:100%; height:auto; object-fit:contain`.
5. Watch file size. If one lesson becomes heavy, reduce image dimensions or split the lesson.

For SVG/HTML diagrams:

- Inline the SVG or build the diagram from styled HTML.
- Keep text selectable/readable where possible.
- Use system fonts only.
- Avoid external assets, scripts, fonts, and CSS imports.

For hybrid visuals:

- Use the generated raster image for the scene.
- Add exact labels, arrows, or callouts in HTML/SVG adjacent to or over the image.
- Keep overlays responsive and test narrow widths.
