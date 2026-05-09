# Image Cards — AI Pedagogy

Read this when generating cards for a source note that contains images,
or when the user explicitly requests image-based cards.

## 1. Mandatory image-reading step (do not skip)

Before designing any question for an image, USE the Read tool with the
image's vault path to bring the image into context as visual content.

Why: vision-capable models can describe spatial relationships, labels,
and arrows only after seeing the image. Without this step, questions
degenerate to "what is this diagram called?" — trivia, not learning.

What to extract from each image:

- Visible labels, headings, axis names, legend text
- Spatial layout (what is top/bottom/left/right, what arrows point where)
- Distinctive tokens the answer can quote (so the user can self-verify)
- The pedagogical purpose (does the image show a trade-off? a flow?
  a comparison? a structure?)

Examples of how this changes question quality:

WITHOUT looking at the image:
> "What does this cache architecture diagram show?"
> → user can answer "it shows cache architecture" and feel correct.

AFTER looking at the image:
> "From the diagram, the bottom row labelled 'cheap & safe' sits below
> the row labelled 'fast but risky'. What constraint does this stacking
> encode about layer-add ordering?"
> → forces actual recall about the concept the diagram teaches.

If the runtime model is not vision-capable and cannot read the image,
stop and tell the user — do NOT fabricate image content.

## 2. When to make a card from an image

- Visual structures: architecture diagrams, flowcharts, infographics,
  relation graphs.
- Default: 1 image = 1 card (avoid diluting active recall).
- Skip: decorative images, screenshots that text alone could fully
  describe, branding/UI screenshots without conceptual content.
- Multi-image exception: only when two images MUST be cross-referenced
  to answer a single question (rare).

## 3. Format choice — always use `%%card%%`

Use `%%card%%`. Do NOT use `::` single-line. Do NOT use `Q:/A:` two-blank-line.

Reasons:

- `::` makes the question line uncomfortably long once `![[...]]` is
  embedded.
- `Q:/A:` two-blank-line termination is fragile when answers contain
  extra blank lines around image embeds.
- `%%card%%` only ends on the closing `%%card%%` marker — safest for
  any multi-line content (verified at `src/review/helpers.js:133-160`).

Two valid embedding placements:

**Image on its own line under Q:** (visually clear, but front becomes
multi-line)

````
%%card%%
Q: From the diagram, what trade-off is being made?
![[Study/cache-layers.png]]
A:
The diagram shows ...
%%card%%
````

**Image inline on Q: line** (shorter front, easier to copy as JSON key)

````
%%card%%
Q: ![[Study/cache-layers.png]] What trade-off does this diagram show?
A:
The diagram shows ...
%%card%%
````

Pick one style per ai-cards file for consistency.

## 4. Embed syntax & path rules

- Prefer `![[full/vault/path/file.png]]` wikilink (cross-folder safe).
- Chinese characters, full-width colons, spaces → DO NOT URL-encode.
  Obsidian wikilinks accept them raw.
- Avoid `![](relative-path.png)` — breaks if the ai-cards file lives in
  a different folder from the image.

## 5. Question & answer design

### Question — anti-cheat patterns

PROHIBITED (user can answer by glancing at the image):

- "What is this image called?"
- "What does L1 stand for in this diagram?"
- "Name the components shown."

REQUIRED — pick one of three patterns per question:

- **Cross-reference**: "From X, Y, and Z markings on the diagram, infer
  the underlying constraint."
- **Reasoning**: "Why is the order on the right ranked above the left?
  What trade-off does this encode?"
- **Comparison**: "The diagram splits into two outcomes. From this
  diagram alone, answer (a)(b)(c)."

### Answer — must quote image elements for verifiability

REQUIRED:

- Quote a recognizable element from the image so the user can
  self-verify:
  > "The top line of the diagram says: 'cheap & safe layers first' ..."
  > "Bottom-right has the MVP-start arrow pointing to ..."

PROHIBITED:

- Pure paraphrase that does not reference any visible image token —
  the user cannot tell if they really got it right.

## 6. Hints — image-card-only L2 trick & key-matching trap

### L1 / L2 / L3 design adapted for image cards

- **L1**: standard active-recall trigger. Do NOT mention any image
  element (would defeat recall).
- **L2**: image-card unique technique — L2 may anchor to an in-image
  position (e.g., "look at the bottom-right corner of the diagram, the
  line labelled 'MVP start'"). This is the one place L2 may reference
  image content directly, because the user is allowed to look at the
  image; the recall target is still the answer.
- **L3**: same as text cards — structural narrowing keyword, no spoiler.

### Hint-key matching trap (CRITICAL — silent failure if violated)

The plugin matches hints by exact string against the parsed `front`
field (`src/review/helpers.js:435`, `hintsDict[card.front]`). When the
front is multi-line (image on a separate line under Q:), the JSON key
MUST contain both the question line AND the `![[...]]` line, joined
by `\n`.

Safest workflow after writing cards:

1. Open the ai-cards `.md` file.
2. For each card, copy the EXACT text between the `Q:` line content
   and the `A:` line (preserving newlines and the full `![[path]]`).
3. Paste as the JSON key — DO NOT retype, DO NOT URL-encode, DO NOT
   remove the wikilink.

Common silent failures:

- Retyping the wikilink and missing one character → hint never displays.
- Replacing `![[path]]` with `![](path)` in the JSON key only → mismatch.
- Trimming trailing whitespace differently from the parser → mismatch.
  The parser trims trailing blank lines but not trailing spaces on
  content lines.
