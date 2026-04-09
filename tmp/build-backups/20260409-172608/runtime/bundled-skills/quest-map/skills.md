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

Correct:
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
  prompt: 這個被遮住的節點是什麼
  answer: CloudFront CDN
  answers: [CloudFront CDN, CDN]
  reveal_answer: true
  region_x: 295
  region_y: 292
  region_width: 640
  region_height: 86
  hint: Optional hint
  link: relative/path/to/source.md
```

Rules:
- `image` must be a vault-relative path to an existing image.
- `answer` is the canonical label.
- `answers` holds acceptable user inputs.
- `mode` should be `hide_all_guess_one` for v1.
- The bbox must cover the meaningful target, not the whole slide.
- Prefer labeled targets, organ names, architecture nodes, or comparison cells.

## Image-Occlusion Selection Rules

Good candidates:
- labeled organs
- architecture nodes
- flowchart boxes
- AWS/Azure comparison cells
- map labels
- diagram callouts

Bad candidates:
- decorative icons
- long paragraphs
- empty space
- whole sections when a smaller target exists
- images the model cannot confidently understand

If image understanding is weak, do not force image-occlusion. Fall back to another challenge type.

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
