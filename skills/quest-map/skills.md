---
name: quest-map
description: 
  Generate quest-map YAML for the EngramQuest plugin.
  Trigger when the user asks to create a quest map from a note or topic, or asks how quest-map works.
  Use this skill whenever the user wants to gamify notes into interactive challenges, create a quest from study material, or turn any topic into an easy/medium/hard quest — even if they do not say "quest-map" explicitly.
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

## Challenge Quality Rules

### Challenge Question Requirements

**Self-contained**: the question must be understandable without reading the source note.
- Must include the framework/concept name and enough context.
- PROHIBITED: questions lacking a clear subject ("What are the four stages in order?" → which framework's four stages?)
- Good example: "In the FSRS algorithm, what does the stability parameter represent?"

**Test understanding, not trivia**:
- PROHIBITED: asking for a count ("How many?"), list order, or bare names.
- Cloze: do not blank numbers or names — only blank substantive concepts.
- Bad example: `sentence: FSRS has {{c1::17}} parameters`
- Good example: `sentence: FSRS's stability parameter represents {{c1::how long a memory can be retained before forgetting}}`

## User Prompt Priority

Default behavior is AI-guided selection.

- If the user says only one topic, only one image, or only one mode, obey that restriction.
- If the user specifies a concrete image, use that image.
- If the user does not specify, AI should decide which content is best turned into regular questions, cloze, or image-occlusion.

## CRITICAL MANDATE: Filename

- Standalone quest file **MUST** be named `<source-note-name>-quest.md`. No exceptions.
- **NEVER** use descriptive titles (e.g., `Azure_Full_Ecosystem_Map.md`).
- The plugin detects quest maps by `-quest.md` suffix OR `` ```quest-map `` code block. A wrong filename with no code block = invisible to the plugin.

## Generation Flow

0. Check for a pre-existing knowledge index or graph in the vault (e.g. `graphify-out/GRAPH_REPORT.md`, `graph.json`). If found, read it first — use its key concepts as boss-challenge candidates, community groupings to inform chapter splits, and relationship edges to shape challenge content. Skip raw-file discovery for anything the index already covers.
1. Read the source note or user-provided topic.
2. Use the cheapest discovery path first:
   - obvious topic folders
   - frontmatter tags
   - note links
   - embedded vault images
   - targeted Obsidian CLI search only when needed.
       IMPORTANT: When vault search is needed, use Obsidian CLI (`obsidian search`). For full syntax, query operators, and fallback rules, see `references/obsidian-cli.md`.
       `obsidian search query="<topic> <key concept>" format=json`
       Use this when the source note lacks enough context or related notes are expected. Skip if the note is self-contained or the graph index already covers the topic.
   - run `scripts/list_quest_icons.sh` to discover available named icon files when the topic's icon is non-obvious; fall back to emoji if the script returns nothing
3. Split the material into 3 to 5 chapters.
4. For each chapter generate:
   - title
   - icon or fallback emoji
   - summary
   - 2 to 4 points
   - optional insight
   - one challenge
5. Choose challenge type based on difficulty, source material, and the Challenge Type Selection table below.
6. **Image challenges**: when a note image is worth testing, use `image-quiz` (all models). Only Gemini may use `image-occlusion` — and if doing so, run `scripts/occlusion_measure.py <image_path>` first to get accurate text bbox coordinates. If the script is unavailable (no Python/pytesseract), fall back to `image-quiz`.
7. Add frontmatter tags when the topic has clear semantic tags.
8. Save the output using the appropriate method:
   - **Embedding in an existing note**: append the `quest-map` code block directly into that note. The plugin detects any `.md` file containing a ` ```quest-map ` block — no filename constraint applies.
   - **Creating a standalone file**: name it `<source-note-name>-quest.md` (see CRITICAL MANDATE above).

## Difficulty Rules

### easy
- Prefer `truefalse`, then `quiz`
- May use `cloze` when the blank is obvious and teachable
- May use `countdown` for fluency drill (use generous timer, e.g. 20s)
- May use `image-quiz` when a note image supports a good question
- Include a hint
- Keep distractors clearly teachable, not tricky

### medium
- Prefer `quiz`, then `order`
- May use `cloze`, `snapshot`, `auction`, `image-quiz`, or `image-occlusion` (Gemini only) when the source strongly supports them
- `snapshot` works well for dense structured info (tables, layered architectures)
- `auction` works well for easily confused concepts
- Usually omit hints
- Use plausible distractors

### hard
- Prefer `match`, `cloze`, `countdown` (short timer), `auction`, `image-quiz`, `image-occlusion` (Gemini only), then strict `input`
- No hint unless absolutely necessary
- The challenge should require stronger recall than medium
- **Scenario over trivia**: instead of "What is X?", ask "Why choose X over Y given constraint Z?" or "What breaks if you use X instead of Y?"
- **Traceability**: all hard challenges **MUST** include the `link` field pointing back to the source note. This lets the learner self-verify when recall fails.
- Include a `link` field when the format expects one

## Challenge Type Selection

AI must analyze the source note content before choosing challenge types. Do NOT default to `quiz` for every chapter.

| Content characteristic | Best challenge types |
|---|---|
| Dense structured info (tables, layers, pipelines) | `snapshot` |
| Easily confused concepts, multiple plausible answers | `auction` |
| Fluency / basic recall drill | `countdown` |
| Step-by-step process, causal flow | `order` |
| Terminology, fill-in-the-blank | `cloze` |
| Diagram or architecture image | `image-quiz`, `image-occlusion` |
| True/false factual statement | `truefalse` |
| Concept pairing | `match` |
| Free recall, precise term | `input` |

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

### Cloze: one blank per challenge

Each cloze challenge **MUST** contain exactly ONE `{{c1::...}}` blank.
Multiple blanks (`{{c1::...}}` + `{{c2::...}}`) are NOT supported — the UI reveals all blanks simultaneously, destroying the recall test.

Wrong:
```yaml
sentence: "{{c1::Azure}} uses {{c2::RBAC}} for access control"
```

Correct:
```yaml
sentence: "Azure uses {{c1::RBAC}} for access control"
```

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

`pairs` defines both the prompts and their correct answers. No separate `answer` field is needed.

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

### countdown
```yaml
challenge:
  type: countdown
  timer: 15
  question: Question text
  options: [A, B, C, D]
  answer: 1
  hint: Optional hint
```

Rules:
- A quiz with a countdown timer. When time expires, the correct answer is revealed and the challenge auto-advances.
- `timer` is seconds (default 15). Use 10–20 for most questions.
- Best for: fluency testing, basic recall under pressure.

### snapshot
```yaml
challenge:
  type: snapshot
  snapshot_items: [UseExceptionHandler, UseHttpsRedirection, UseAuthentication, UseAuthorization]
  snapshot_labels: [Layer 1, Layer 2, Layer 3, Layer 4]
  snapshot_time: 4
  question: Which middleware is at Layer 3?
  options: [UseRouting, UseAuthentication, UseAuthorization, UseHttpsRedirection]
  answer: 1
  hint: Optional hint
```

Rules:
- Shows `snapshot_items` in a grid for `snapshot_time` seconds, then hides them and presents a quiz question.
- `snapshot_labels` is optional (defaults to 1, 2, 3...).
- `snapshot_time` is seconds (default 4). Use 3–6.
- Best for: dense information, visual memory, detail extraction.

### auction
```yaml
challenge:
  type: auction
  coins: 100
  question: Question text
  options: [A, B, C, D]
  answer: 1
```

Rules:
- User selects an option and bets coins. Correct = gain bet, wrong = lose bet. Auto-advances after result.
- `coins` is the starting balance (default 100).
- No hint — the bet mechanic itself forces confidence calibration.
- Best for: fuzzy knowledge, easily confused concepts, confidence assessment.

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

Choose the style that fits the topic's mood. When in doubt, `cyber` is a safe default for technical content.

| Style | Best fit |
|---|---|
| `sky-island` | airy, philosophical, or conceptual topics |
| `ocean` | flow-based, layered, or biological systems |
| `forest` | organic, ecological, or living systems |
| `galaxy` | abstract, large-scale, or cosmological ideas |
| `dungeon` | gamified, challenge-heavy, or narrative content |
| `space` | technology, science, or futurism |
| `cyber` | programming, AI, architecture, or data systems |

Write `style` inside the code block, not only in frontmatter.
