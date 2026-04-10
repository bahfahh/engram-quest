---
name: quest-map
description: >
  Generate quest-map YAML markdown for the Obsidian EngramQuest plugin.
  Trigger when the user asks to make a quest-map from a note or topic.
  Supports easy, medium, and hard difficulty.
  Save the result as <source-note-name>-quest.md.

  User guide trigger:
  If the user asks how quest-map works in EngramQuest, read references/user-guide.md and answer.
---

# Quest Map Skill

## Output Language Rule

Important: generate user-facing output in the language that best matches the user's prompt or the source note.

- If the prompt explicitly asks for a language, follow the prompt.
- Otherwise, match the source note language.
- Keep parser keys and structural fields in English.

This rule applies to:
`title`, `summary`, `points.body`, `insight`, `challenge.question`, `challenge.prompt`, `challenge.sentence`, `options`, `items`, `pairs`, `keywords`, `answers`, `hint`.

## Core Memory Rule

Quest Map challenges must serve active recall.

- Do not create cloze just because a sentence can be blanked.
- Only blank high-value memory targets: core terms, critical differences, required steps, easy-to-confuse concepts, and architecture nodes.
- For image occlusion, only mask meaningful labeled targets or meaningful visual regions. Do not mask decorative areas, whitespace, or low-value text.

## User Prompt Priority

Default behavior is AI-guided selection.

- If the user says only one topic, only one image, or only one mode, obey that restriction.
- If the user specifies a concrete image, use that image.
- If the user does not specify, AI should decide which content is best turned into regular questions, cloze, or image-occlusion.

## Generation Flow

1. Read the source note or user-provided topic.
2. Use the cheapest discovery path first:
   - obvious topic folders
   - frontmatter tags
   - note links
   - embedded vault images
   - targeted Obsidian CLI search only when needed
3. Split the material into 3 to 5 chapters.
4. For each chapter generate:
   - title
   - icon or fallback emoji
   - summary
   - 2 to 4 points
   - optional insight
   - one challenge
5. Choose challenge type based on difficulty and source material.
6. **Image challenges**: when a note image is worth testing, use `image-quiz` (all models). Only Gemini may use `image-occlusion` — and if doing so, run `scripts/occlusion_measure.py <image_path>` first to get accurate text bbox coordinates. If the script is unavailable (no Python/pytesseract), fall back to `image-quiz`.
7. Add frontmatter tags when the topic has clear semantic tags.
8. Save as `<source-note-name>-quest.md`.

## Difficulty Rules

### easy
- Prefer `truefalse`, then `quiz`
- May use `cloze` when the blank is obvious and teachable
- May use `image-quiz` when a note image supports a good question
- Include a hint
- Keep distractors clearly teachable, not tricky

### medium
- Prefer `quiz`, then `order`
- May use `cloze`, `image-quiz`, or `image-occlusion` (Gemini only) when the source strongly supports them
- Usually omit hints
- Use plausible distractors

### hard
- Prefer `match`, `cloze`, `image-quiz`, `image-occlusion` (Gemini only), then strict `input`
- No hint unless absolutely necessary
- The challenge should require stronger recall than medium
- Include a `link` field when the format expects one

## Parser Constraints

The plugin uses a lightweight parser. Keep these rules strict.

### Arrays must be inline

Correct:
```yaml
options: [A, B, C, D]
answers: [CloudFront CDN, CDN]
```

Wrong:
```yaml
options:
  - A
  - B
```

### Avoid ASCII commas inside array values

The parser splits on commas. Rephrase option text or accepted answers to avoid accidental splits.

### Use flat fields for image-occlusion bbox

Canonical format: use percentage-based coordinates with `region_left_pct`, `region_top_pct`, `region_width_pct`, `region_height_pct` (0–100, relative to image width/height).
Pixel coords (`region_x`, `region_y`, `region_width`, `region_height`) are legacy-compatible.

Only Gemini should produce these coordinates (it has native bounding-box detection). Other models should use `image-quiz` instead.

Correct:
```yaml
region_left_pct: 20
region_top_pct: 22
region_width_pct: 32
region_height_pct: 28
```

Legacy-compatible:
```yaml
region_x: 295
region_y: 292
region_width: 640
region_height: 86
```

Wrong:
```yaml
region:
  x: 295
```

## Challenge Formats

### quiz
```yaml
challenge:
  type: quiz
  question: Question text
  options: [A, B, C, D]
  answer: 1
  hint: Optional hint
```

### truefalse
```yaml
challenge:
  type: truefalse
  statement: One statement
  answer: true
  hint: Optional hint
```

### order
```yaml
challenge:
  type: order
  question: Put these in order
  items: [Item A, Item B, Item C]
  answer: [1, 0, 2]
```

### match
```yaml
challenge:
  type: match
  pairs:
    - [Concept A, Description A]
    - [Concept B, Description B]
```

### input
```yaml
challenge:
  type: input
  question: Fill in the missing term
  keywords: [keyword]
  hint: Optional hint
  link: relative/path/to/source.md
```

### cloze
```yaml
challenge:
  type: cloze
  sentence: Azure 版資料不會用於 {{c1::訓練}}
  answers: [訓練]
  reveal_answer: true
  hint: Optional hint
  link: relative/path/to/source.md
```

Rules:
- Keep one main blank per challenge.
- `sentence` should still read naturally after replacing the blank with `____`.
- `answers` should contain acceptable user inputs.

### image-quiz
```yaml
challenge:
  type: image-quiz
  image: path/to/image.png
  question: What role does the highlighted component play in this architecture?
  options: [Load balancer, CDN, API gateway, Database proxy]
  answer: 1
  hint: Optional hint
  link: relative/path/to/source.md
```

Rules:
- Use `image-quiz` when a note image supports a good question. The image is displayed as visual context; no occlusion or bbox is needed.
- All AI models (Claude, Gemini, Cursor, etc.) can generate this type.
- `image` path rules: vault-relative or note-relative, matching the source note's embedded image usage. No plugin asset paths or OS absolute paths.
- The question must require understanding the image — not something answerable without seeing it.
- Supports `quiz` style (options + answer index) or `input` style (keywords).

Input variant:
```yaml
challenge:
  type: image-quiz
  image: path/to/image.png
  question: What valve sits between the left atrium and left ventricle?
  keywords: [Mitral valve, mitral]
  hint: Optional hint
  link: relative/path/to/source.md
```

### image-occlusion (Gemini only)
```yaml
challenge:
  type: image-occlusion
  image: path/to/image.png
  mode: hide_all_guess_one
  prompt: What is the responsibility of this component?
  answer: CloudFront CDN
  answers: [CloudFront CDN, CDN]
  reveal_answer: true
  region_left_pct: 20
  region_top_pct: 22
  region_width_pct: 32
  region_height_pct: 28
  hint: Optional hint
  link: relative/path/to/source.md
```

Rules:
- **image-occlusion requires accurate bbox coordinates. Only Gemini (which has native bounding-box detection) should generate this type.** Claude, Cursor, and other models that cannot reliably produce pixel-accurate coordinates must use `image-quiz` instead.
- **Coordinate workflow**: run `scripts/occlusion_measure.py <image_path>` to get OCR-detected text labels with pixel + pct coords. Pick the target label's bbox from the output. If the script is unavailable, Gemini may use its native bounding-box detection; all other models must fall back to `image-quiz`.
- `image` path rules: same as image-quiz.
- `answer` is the canonical label. `answers` holds acceptable user inputs.
- `mode` should be `hide_all_guess_one` for v1.
- Use `region_left_pct`, `region_top_pct`, `region_width_pct`, `region_height_pct` (0–100).
- Legacy `region_x`, `region_y`, `region_width`, `region_height` (pixel) remain supported.
- The bbox must cover the meaningful target, not the whole slide.

## Image Challenge Selection Rules

When a note contains images, decide between `image-quiz` and `image-occlusion`:

**Model capability gate (mandatory)**

- Gemini → may use `image-occlusion` or `image-quiz`
- All other models (Claude, Cursor, etc.) → must use `image-quiz`. Do NOT generate `image-occlusion`.

**Step 1 — Memory value test (mandatory)**

Ask: "Is this something the learner must memorize — something that would appear on a test or is a core concept they need to retain?"

- PASS: specific architecture node names, organ labels, protocol names, algorithm names, values the learner would be tested on
- FAIL: generic labels like "Input" / "Output" / "Model", model names that appear everywhere in the note, arrows, connectors, decorative icons, anything obvious from context

**Step 2 — Recall test (mandatory)**

Ask: "If this image is shown, does the question require the learner to retrieve knowledge from memory?"

- If the answer is obvious from the image alone without prior study → FAIL
- Only PASS if the question creates genuine retrieval demand

**Step 3 — Question design**

The question must test understanding, not just label recognition. "這是什麼？" alone is not enough.

Good: "What is the responsibility of this component?" / "Why is X used here instead of Y?" / "What is the output of this step?"
Bad: "What is this hidden node?"

**Fallback rule (mandatory)**

If no target in the image passes Step 1 AND Step 2, do NOT generate image-quiz or image-occlusion for that chapter.
Use `cloze` or `quiz` instead. Never force an image challenge just because an image exists in the note.

## Chapter Design

- `summary`: 1 to 3 sentences with the chapter's core insight
- `points`: short, concrete, and useful
- `insight`: optional real-world implication or counterintuitive point
- `challenge`: must test something taught in the same chapter

## Output Skeleton

````markdown
---
tags: [topic-tag]
---

# Title

```quest-map
version: 1
style: cyber
difficulty: hard
nodes:
  - id: ch1
    title: Chapter title
    emoji: 🧠
    summary: Core insight.
    points:
      - title: Point one
        body: Why it matters.
    challenge:
      type: cloze
      sentence: Azure 版資料不會用於 {{c1::訓練}}
      answers: [訓練]
      reveal_answer: true
```
````

## Style Guide

Supported styles:

- `sky-island`
- `ocean`
- `forest`
- `galaxy`
- `dungeon`
- `space`
- `cyber`

Write `style` inside the code block, not only in frontmatter.
