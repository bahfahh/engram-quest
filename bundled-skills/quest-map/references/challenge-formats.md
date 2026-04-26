# Challenge Formats Reference

This document defines every challenge type supported by the quest-map parser and renderer.
Read this before generating any challenge YAML.

---

## Quick Reference Table

| Type | Interaction | Best for | Difficulty fit |
|---|---|---|---|
| `quiz` | Pick one option | General knowledge | easy–medium |
| `truefalse` | True / False | Factual statements | easy |
| `order` | Click items in sequence | Step-by-step processes | easy–medium |
| `match` | Pair left ↔ right | Concept–definition pairing | medium |
| `input` | Free text entry | Precise term recall | medium–hard |
| `cloze` | Fill the blank | Key term memorization | easy–hard |
| `countdown` | Pick one option under timer | Fluency / speed drill | easy–hard |
| `snapshot` | Memorize grid → quiz | Dense info, visual memory | medium |
| `auction` | Pick + bet coins | Confidence calibration | medium–hard |
| `timeline` | Place events in time slots | Historical evolution | medium–hard |
| `chain` | Click nodes in order under timer | Causal flow under pressure | medium–hard |
| `memory-palace` | Memorize knowledge map → recall | Architecture, component relationships | medium–hard |
| `image-quiz` | Look at image → pick/type answer | Diagram comprehension | easy–hard |
| `image-occlusion` | Guess occluded region (Gemini only) | Label memorization | medium–hard |

---

## Multi-Question Rounds (`questions_json`)

Challenge types that benefit from multiple questions should use `questions_json` — an inline JSON array. The renderer loops through questions, tracks score/lives/coins, and shows a round summary at the end.

### Syntax

```yaml
challenge:
  type: auction
  coins: 100
  questions_json: [{"q":"Question 1","opts":["A","B","C","D"],"ans":1},{"q":"Question 2","opts":["X","Y"],"ans":0}]
```

### Round UX behavior

Every multi-question round displays:
1. A **game rules banner** at the top explaining the mechanic (auto-generated, not in YAML)
2. **Progress pips** showing current question / total
3. **Stats bar** showing lives (countdown) or coins (auction)
4. A **round summary** at the end with correct count, and a **📖 Review panel** if failed or < 50% correct

Type-specific behavior:
- `countdown`: each question has its own timer. Wrong = lose a life. ♥ 0 = round ends with failure.
- `auction`: coins persist across questions. Wrong = lose bet. ◈ 0 = round ends with failure.
- `snapshot`: shows items grid for N seconds with a countdown bar and "📖 Study Phase" tag. After hiding, switches to "🎯 Quiz Phase" and presents questions as standard quiz.
- `memory-palace`: shows knowledge map for N seconds with "📖 Study Phase" tag. After hiding, switches to "🎯 Quiz Phase" and presents questions as standard quiz. The hidden map stays visible as a blurred placeholder.

### JSON object fields per question

| Field | Used by | Description |
|---|---|---|
| `q` | all | Question text |
| `opts` | quiz/countdown/auction/snapshot | Options array |
| `ans` | quiz/countdown/auction/snapshot | Correct answer (zero-based index) |
| `sentence` | cloze | Cloze sentence with `{{c1::...}}` |
| `answers` | cloze/input | Acceptable answers array |
| `keywords` | input | Acceptable keywords array |
| `statement` | truefalse | Statement text (ans = true/false) |

### Examples by type

**Auction round (3 questions, coins persist):**
```yaml
challenge:
  type: auction
  coins: 100
  questions_json: [{"q":"Which hosting plan for budget + unpredictable traffic?","opts":["Consumption","App Service","Premium"],"ans":0},{"q":"Which eliminates cold start?","opts":["Consumption","App Service","Premium"],"ans":2},{"q":"Which charges even when idle?","opts":["Consumption","App Service","Premium"],"ans":1}]
```

**Countdown round (4 questions, lives deplete):**
```yaml
challenge:
  type: countdown
  timer: 12
  questions_json: [{"q":"[FromBody] reads from?","opts":["Query String","Request Body","Header","Cookie"],"ans":1},{"q":"201 status means?","opts":["OK","Created","No Content","Bad Request"],"ans":1},{"q":"Correct middleware order?","opts":["Auth→Route→Authz","Route→Auth→Authz","Authz→Auth→Route","Route→Authz→Auth"],"ans":1},{"q":"[ApiController] auto-returns on validation fail?","opts":["500","404","400","200"],"ans":2}]
```

**Snapshot round (memorize once, answer 2 questions):**
```yaml
challenge:
  type: snapshot
  snapshot_items: [UseExceptionHandler, UseHttpsRedirection, UseAuthentication, UseAuthorization]
  snapshot_labels: [Layer 1, Layer 2, Layer 3, Layer 4]
  snapshot_time: 5
  questions_json: [{"q":"Which middleware is at Layer 3?","opts":["UseRouting","UseAuthentication","UseAuthorization","UseHttpsRedirection"],"ans":1},{"q":"Which is at Layer 1?","opts":["UseHttpsRedirection","UseAuthorization","UseExceptionHandler","UseAuthentication"],"ans":2}]
```

**Memory-palace round (memorize map, answer 3 questions):**
```yaml
challenge:
  type: memory-palace
  palace_items: [Pipeline, Controller, Service, DbContext, Middleware]
  palace_descs: [HTTP flow, Handles requests, Business logic, ORM layer, Auth and logging]
  palace_time: 15
  questions_json: [{"q":"Which handles ORM?","opts":["Pipeline","Controller","Service","DbContext","Middleware"],"ans":3},{"q":"Which handles auth and logging?","opts":["Pipeline","Controller","Service","DbContext","Middleware"],"ans":4},{"q":"Which is decoupled via DI?","opts":["Pipeline","Controller","Service","DbContext","Middleware"],"ans":2}]
```

### Types that do NOT use `questions_json`

`order`, `match`, `chain`, `timeline`, `image-quiz`, `image-occlusion` — these are already multi-step within one question. Use them as single-question challenges.

---

## Format Details

### quiz

Standard multiple-choice. User picks one option.

```yaml
challenge:
  type: quiz
  question: Question text
  options: [A, B, C, D]
  answer: 1
  hint: Optional hint
```

Fields:
- `question` (required): the question text.
- `options` (required): inline array of 2–4 choices.
- `answer` (required): zero-based index of the correct option.
- `hint` (optional): shown after first wrong attempt on easy difficulty.

Design guidance:
- Use when the question has one clear correct answer and plausible distractors.
- Avoid when all options are obviously wrong except one — that's trivia, not learning.

---

### truefalse

A single statement the user judges as true or false.

```yaml
challenge:
  type: truefalse
  statement: One statement
  answer: true
  hint: Optional hint
```

Fields:
- `statement` (required): a declarative sentence.
- `answer` (required): `true` or `false`.
- `hint` (optional).

Design guidance:
- The statement must be unambiguous. Avoid "sometimes true" situations.
- Best for easy difficulty — it's a 50/50 guess, so pair with a good hint or explanation.

---

### order

User clicks items in the correct sequence. Each click is validated immediately — correct locks green, wrong shakes.

```yaml
challenge:
  type: order
  question: Put these in order
  items: [Item A, Item B, Item C]
  answer: [1, 0, 2]
```

Fields:
- `question` (optional): instruction text.
- `items` (required): inline array of items to order.
- `answer` (required): array of indices representing the correct sequence. `answer[step]` = index of the item that should be clicked at that step.

Design guidance:
- Use for processes, pipelines, or causal chains where order matters.
- 3–5 items is ideal. More than 6 becomes tedious.

---

### match

User pairs left-side concepts with right-side descriptions by clicking left then right.

```yaml
challenge:
  type: match
  pairs:
    - [Concept A, Description A]
    - [Concept B, Description B]
```

Fields:
- `pairs` (required): each pair is `[left, right]`. Right side is shuffled in the UI.

Design guidance:
- Use for concept ↔ definition, term ↔ example, or cause ↔ effect pairing.
- 3–5 pairs is ideal.
- No separate `answer` field needed — pairs define the mapping.

---

### input

Free text input. User types the answer.

```yaml
challenge:
  type: input
  question: Fill in the missing term
  keywords: [keyword1, keyword2]
  hint: Optional hint
  link: relative/path/to/source.md
```

Fields:
- `question` (required): the prompt.
- `keywords` (required): inline array of acceptable answers. Matching is case-insensitive and substring-tolerant.
- `hint` (optional).
- `link` (optional): source note for self-verification.

Design guidance:
- Use when the answer is a specific term the learner must recall without options.
- Include multiple acceptable forms in `keywords` (e.g., `[RBAC, role-based access control]`).

---

### cloze

Fill-in-the-blank within a sentence.

```yaml
challenge:
  type: cloze
  sentence: Azure data is never used for {{c1::training}}
  answers: [training]
  reveal_answer: true
  hint: Optional hint
  link: relative/path/to/source.md
```

Fields:
- `sentence` (required): text with exactly ONE `{{c1::answer}}` blank.
- `answers` (required): inline array of acceptable inputs.
- `reveal_answer` (optional, default true): show a "reveal" button after wrong attempts.
- `hint`, `link` (optional).

CRITICAL constraints:
- **ONE blank per challenge.** Multiple `{{c1::}}` + `{{c2::}}` are NOT supported — the UI reveals all blanks simultaneously.
- The sentence must read naturally with `____` replacing the blank.
- Only blank high-value terms, not numbers or trivial words.

---

### countdown

A quiz with a countdown timer. Tests speed and fluency.

```yaml
challenge:
  type: countdown
  timer: 15
  question: Question text
  options: [A, B, C, D]
  answer: 1
  hint: Optional hint
```

Fields:
- `timer` (optional, default 15): seconds. Use 10–20.
- All other fields same as `quiz`.

Behavior:
- Timer bar counts down visually. Color shifts green → amber → red.
- On timeout: correct answer is revealed, challenge auto-advances after 1.2s. User is never stuck.
- On correct click: timer stops, solved immediately.

Design guidance:
- Use for fluency testing — questions the learner should answer quickly if they know the material.
- Easy difficulty: generous timer (20s). Hard difficulty: tight timer (10s).
- Avoid for questions requiring deep thought — use `quiz` or `auction` instead.

---

### snapshot

Flash information for a few seconds, hide it, then quiz from memory.

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

Fields:
- `snapshot_items` (required): inline array of items to display in a grid.
- `snapshot_labels` (optional): inline array of labels for each item. Defaults to 1, 2, 3...
- `snapshot_time` (optional, default 4): seconds to display. Use 3–6.
- `question`, `options`, `answer`, `hint`: same as `quiz` — shown after items are hidden.

Behavior:
- Items shown in a 2-column grid with labels for `snapshot_time` seconds.
- Grid is replaced with a "?" overlay, then quiz options appear.

Design guidance:
- Use for dense structured info: middleware layers, status code tables, config mappings.
- The question must test a detail that requires having memorized the grid — not something guessable.
- Keep items to 3–6. More than 6 is too much to memorize in a few seconds.

---

### auction

Confidence-based betting. User picks an answer and wagers coins.

```yaml
challenge:
  type: auction
  coins: 100
  question: Question text
  options: [A, B, C, D]
  answer: 1
```

Fields:
- `coins` (optional, default 100): starting coin balance.
- `question`, `options`, `answer`: same as `quiz`.
- No `hint` — the bet mechanic itself forces confidence calibration.

Behavior:
- User clicks an option to select it, adjusts bet with a slider (5–80 coins), then confirms.
- Correct: gain bet amount. Wrong: lose bet amount. Balance updates visually.
- Auto-advances after 1.2s.

Design guidance:
- Use for easily confused concepts where the learner might be "pretty sure but not certain."
- The bet mechanic trains metacognition — "how confident am I really?"
- Avoid for trivial questions (no point betting on something obvious).

---

### timeline

Place events into time slots. Tests chronological understanding.

```yaml
challenge:
  type: timeline
  question: Place these events in the correct era
  slots: [2002, 2009, 2016, 2021]
  events: [ASP.NET 1.0, ASP.NET MVC 1.0, ASP.NET Core 1.0, .NET 6 Minimal API]
  answer: [0, 1, 2, 3]
```

Fields:
- `question` (optional): instruction text.
- `slots` (required): inline array of time labels (left column).
- `events` (required): inline array of events (shuffled as clickable chips).
- `answer` (required): array where `answer[i]` = index of the event that belongs in `slots[i]`.

Behavior:
- User clicks an event chip to select it, then clicks a time slot to place it.
- Check button reveals correct (green) / wrong (red) with correct answers shown.
- Auto-advances after check.

Design guidance:
- Use for historical evolution, version history, technology timelines.
- 4–7 slots is ideal. Fewer is too easy, more is tedious.
- Events should be distinct enough to be placeable — avoid vague labels.

---

### chain

Click nodes in the correct sequence under time pressure.

```yaml
challenge:
  type: chain
  timer: 20
  question: Click the steps in the correct order
  chain_items: [Create project, Configure services, Build controllers, Map endpoints, Run app]
  answer: [0, 1, 2, 3, 4]
```

Fields:
- `timer` (optional, default 20): seconds.
- `question` (optional): instruction text.
- `chain_items` (required): inline array of nodes (displayed shuffled).
- `answer` (required): correct click order as indices into `chain_items`.

Behavior:
- Nodes displayed in random order with a timer bar.
- Correct click: node locks green with step number. Wrong click: shake + red flash.
- 3 wrong clicks or timeout = fail. Correct order is revealed in amber, then auto-advances.

Design guidance:
- Use for step-by-step processes where order is critical and speed matters.
- Difference from `order`: chain has time pressure and a mistake limit. Use `order` for relaxed sequencing, `chain` for pressure testing.
- 4–6 items is ideal.

---

### memory-palace

Memorize a knowledge map, then recall from it.

```yaml
challenge:
  type: memory-palace
  palace_items: [Request Pipeline, Controller, Service Layer, DbContext, Middleware]
  palace_descs: [HTTP request flows through layers, Receives requests and returns results, Business logic decoupled via DI, ORM abstraction for database, Handles auth and logging]
  palace_time: 15
  question: Which component handles ORM database operations?
  answer: DbContext
```

Fields:
- `palace_items` (required): inline array of node titles (3–5 items).
- `palace_descs` (optional but recommended): inline array of descriptions for each node.
- `palace_time` (optional, default 15): seconds to study. Use 10–20.
- `question` (required): recall question shown after hiding.
- `answer` (required): string matching one of `palace_items` (case-insensitive).

Behavior:
- Nodes displayed as a vertical list with letter icons (A, B, C...) + title + description.
- After `palace_time` seconds, list is hidden and replaced with a brain emoji.
- User picks the correct title from a shuffled 2-column grid.
- Wrong pick: red highlight + correct answer revealed, auto-advances.

Design guidance:
- Use for architecture overviews, component relationships, system structures.
- The question should test understanding of what a component does, not just its name.
- Descriptions are key — they give the memorization meaning. Without them it's just a name list.

---

### image-quiz

Show an image and ask a question about it. **This is the recommended type for any note that contains diagrams, architecture images, or visual content — use it aggressively.**

`type: image-quiz` is supported by all AI models (Claude, Gemini, Cursor, Codex). Prefer it over text-only quiz whenever the source note has images.

Three interaction modes — the renderer auto-selects based on which fields are present:

**Mode A — options (quiz style, recommended)**
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

**Mode B — keywords (input style)**
```yaml
challenge:
  type: image-quiz
  image: path/to/image.png
  question: What valve sits between the left atrium and left ventricle?
  keywords: [Mitral valve, mitral]
  hint: Optional hint
  link: relative/path/to/source.md
```

**Mode C — click-region (legacy, use `type: image`)**
```yaml
challenge:
  type: image
  image: path/to/image.png
  question: Click the correct region
  region_x: 0.3
  region_y: 0.2
  region_width: 0.4
  region_height: 0.3
```

Fields:
- `image` (required): vault-relative or note-relative path. No OS absolute paths.
- `question` (required): must require understanding the image.
- `options` + `answer` → Mode A (quiz style). `answer` is zero-based index.
- `keywords` → Mode B (input style). Matching is case-insensitive.
- `hint`, `link` (optional).

Design guidance:
- **All AI models can and should generate this type** whenever the source note has images.
- The question MUST require seeing the image. If answerable without the image, use `quiz` instead.
- Use for architecture diagrams, biological diagrams, flowcharts, UI screenshots, data flow diagrams.
- Mode A (options) is preferred — it gives the learner clear choices and is easier to answer on mobile.
- Mode B (keywords) is better for precise term recall (e.g., anatomy labels, protocol names).
- When in doubt between `image-quiz` and `quiz`: if the note has an image that illustrates the concept, use `image-quiz`. Visual context strengthens memory encoding.

---

### image-occlusion (Gemini only)

Mask a region of an image and ask the user to identify what's hidden.

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

Fields:
- `image` (required): same path rules as image-quiz.
- `mode`: `hide_all_guess_one` for v1.
- `prompt` (required): what to guess about the hidden region.
- `answer` (required): canonical label. `answers`: acceptable user inputs.
- `reveal_answer` (optional, default true).
- Coordinates: use `region_left_pct`, `region_top_pct`, `region_width_pct`, `region_height_pct` (0–100). Legacy pixel coords (`region_x`, `region_y`, `region_width`, `region_height`) also supported.
- `hint`, `link` (optional).

CRITICAL constraints:
- **Only Gemini should generate this type** — it has native bounding-box detection.
- Claude, Cursor, and other models MUST use `image-quiz` instead.
- **Coordinate workflow**: run `scripts/occlusion_measure.py <image_path>` for OCR-detected bbox. If unavailable, Gemini may use native detection; all others fall back to `image-quiz`.
- The bbox must cover the meaningful target, not the whole slide.
