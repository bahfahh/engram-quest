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
6. Add frontmatter tags when the topic has clear semantic tags.
7. Save as `<source-note-name>-quest.md`.

## Difficulty Rules

### easy
- Prefer `truefalse`, then `quiz`
- May use `cloze` when the blank is obvious and teachable
- Include a hint
- Keep distractors clearly teachable, not tricky

### medium
- Prefer `quiz`, then `order`
- May use `cloze` or `image-occlusion` when the source strongly supports them
- Usually omit hints
- Use plausible distractors

### hard
- Prefer `match`, `cloze`, `image-occlusion`, then strict `input`
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
Pixel coords (`region_x`, `region_y`, `region_width`, `region_height`) are legacy-compatible but not preferred — they break when Obsidian CSS scales the image.

Correct:
```yaml
region_left_pct: 20
region_top_pct: 22
region_width_pct: 32
region_height_pct: 28
```

Legacy-compatible but not preferred:
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

### image-occlusion
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
- `image` may be either a vault-relative path or a note-relative path that resolves from the current note.
- Prefer the path style that already matches the source note's embedded image usage.
- Do not use plugin asset paths or OS absolute paths.
- `answer` is the canonical label.
- `answers` holds acceptable user inputs.
- `mode` should be `hide_all_guess_one` for v1.
- Always use `region_left_pct`, `region_top_pct`, `region_width_pct`, `region_height_pct` (0–100). Estimate visually — "the Executor box is roughly 20% from the left, 22% from the top, spans about 32% wide and 28% tall".
- Legacy `region_x`, `region_y`, `region_width`, `region_height` (pixel) remain supported as fallback but are not preferred — pixel coords break when Obsidian CSS scales the image.
- The bbox must cover the meaningful target, not the whole slide.

## Image-Occlusion Selection Rules

Before generating image-occlusion, apply this filter in order. All three steps must pass.

**Step 1 — Memory value test (mandatory)**

Ask: "Is this something the learner must memorize — something that would appear on a test or is a core concept they need to retain?"

- PASS: specific architecture node names, organ labels, protocol names, algorithm names, values the learner would be tested on
- FAIL: generic labels like "Input" / "Output" / "Model", model names that appear everywhere in the note, arrows, connectors, decorative icons, anything obvious from context

**Step 2 — Recall test (mandatory)**

Ask: "If this region is hidden, must the learner retrieve the answer from memory — or can they just guess it from the surrounding image?"

- If the answer is obvious from the rest of the visible image → FAIL
- Only PASS if hiding the region creates genuine retrieval demand

**Step 3 — Question design**

The `prompt` must test understanding, not just label recognition. "這是什麼？" alone is not enough.

Good: "What is the responsibility of this component?" / "Why is X used here instead of Y?" / "What is the output of this step?"
Bad: "What is this hidden node?"

**Fallback rule (mandatory)**

If no target in the image passes Step 1 AND Step 2, do NOT generate image-occlusion for that chapter.
Use `cloze` or `quiz` instead. Never force image-occlusion just because an image exists in the note.

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
