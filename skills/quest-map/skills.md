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

## Learning Experience Rule

Quest Map is a playable learning map, not a fixed quiz template.

- Pick mechanics because they help the learner remember, distinguish, sequence, diagnose, or apply an idea.
- Preserve novelty and rhythm: short lesson -> focused challenge -> short lesson -> transformed challenge -> recap -> boss.
- Use deterministic interactions for grading. Do not ask open essay questions unless the runtime has AI grading or explicit self-check mode.
- Every question that could reveal an answer should include `explanation` or `explain` so wrong answers become learning feedback.
- Fun is valid only when it improves recall or understanding. Do not add game mechanics as decoration.

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

## Quest Structure

### Node count — scale to source material

| Source material size | Total nodes | Challenge rounds | Lesson nodes |
|---|---|---|---|
| Small (1 short note, < 500 words) | 3–4 | 2 | 1–2 |
| Medium (1–2 notes, 500–2000 words) | 5–6 | 3 | 2–3 |
| Large (3+ notes or > 2000 words) | 7–9 | 4–5 | 2–4 |

**Do NOT pad with extra lesson nodes to reach a higher count. Fewer nodes with richer challenges beats many thin nodes.**

### Two node types

- **Lesson node**: has `summary` + `points` + optional `insight`. No challenge. User reads and clicks Next.
- **Challenge node**: has `challenge`. It can be a multi-question round with `questions_json`, or one inherently multi-step mechanic such as `order`, `match`, `chain`, `timeline`, `image-quiz`, or `image-occlusion`. No points. User plays the challenge, sees feedback, then proceeds.

### CRITICAL rules

1. **Basic recall challenge rounds MUST use `questions_json` with at least 3 questions.** This applies to `quiz`, `truefalse`, `cloze`, `input`, `countdown`, and `auction`.
2. **Inherently multi-step mechanics do NOT use `questions_json`.** Use `order`, `match`, `chain`, `timeline`, `image-quiz`, and `image-occlusion` as standalone challenge nodes when they are the best learning mechanic.
3. **Boss must test integrated judgment with deterministic grading.** It may be one rich mechanic or a multi-question round, but each answer must be plugin-gradable.
4. **Boss must not be all cloze or all input.** If the boss uses a single outer `challenge.type`, choose a mechanic that tests synthesis (for example `match`, `chain`, `auction`, or scenario-based `quiz`) and include at most one free-recall item elsewhere in the final section.
5. The quest must feel like a game, not a reading exercise. Aim for at least 60% challenge nodes vs lesson nodes when the source material is large enough.
6. **Learning loop rule**: Every challenge node MUST be immediately preceded by its own dedicated lesson node. That lesson must contain the content being tested in the challenge. One lesson -> one challenge. Do NOT reuse a single lesson to support multiple challenge nodes.
7. **Boss recap rule**: The node immediately before the boss challenge MUST be a recap/synthesis lesson that summarizes the key concepts from the entire quest. Do not place the boss directly after a regular challenge.

CORRECT structure for a medium quest (5 nodes):
```
lesson -> round (3q) -> lesson -> match/order/auction challenge -> recap lesson -> boss challenge
```

WRONG — forbidden:
```
lesson+1question → lesson+1question → lesson+1question → lesson+1question → lesson+1question
```

WRONG — no dedicated lesson per round:
```
lesson → lesson → round → round → boss
```

### Multi-question rounds (`questions_json`)

Challenge types that support multi-question rounds: `countdown`, `auction`, `snapshot`, `memory-palace`, `quiz`, `truefalse`, `cloze`, `input`.

Use `questions_json` — an inline JSON array on one line:
```yaml
challenge:
  type: auction
  coins: 100
  questions_json: [{"q":"Q1","opts":["A","B","C","D"],"ans":1,"explanation":"Why B is correct."},{"q":"Q2","opts":["A","B"],"ans":0,"explanation":"Why A is correct."}]
```

Each object in the array: `q` (question text), `opts` (options array), `ans` (answer index).
For cloze: `{"q":"","sentence":"... {{c1::term}} ...","answers":["term"]}`.
For input: `{"q":"What is X?","keywords":["answer1","answer2"]}`.
Use `explanation` or `explain` on every question where a wrong answer should teach a misconception.

### Per-question type override

Each item may declare its own `type` to override the round's outer `challenge.type` for that single question. The runtime maps these fields per-item — `question / sentence / answers / keywords / options / answer / statement` — so any combination of `quiz / truefalse / cloze / input / auction / countdown` works inside one round.

Use this only when the round genuinely benefits from mixing recall and recognition. The default is to keep one type per round.

```yaml
challenge:
  type: auction              # round flavor: coins + bet UI
  coins: 100
  questions_json: [
    {"q":"Which is fastest?","opts":["Edge","Regional","Origin"],"ans":0},
    {"type":"cloze","sentence":"Vercel deploys to the {{c1::edge}}.","answers":["edge"]},
    {"type":"input","q":"Define ISR in one phrase.","keywords":["incremental","static","regeneration"]}
  ]
```

**Do NOT mix in** `order`, `match`, `chain`, `timeline`, `image-quiz`, `image-occlusion`, `memory-palace`, `snapshot`, or `iframe` — they are inherently single-question mechanics and own their whole node (see next section).

Minimum questions per round by type:

| Type | Min questions | Why |
|---|---|---|
| `auction` | 3–4 | Coins must accumulate/deplete to create stakes |
| `countdown` | 4–5 | Lives (3) create tension only with enough questions |
| `snapshot` | 2–3 | Memorize once, test multiple details |
| `memory-palace` | 2–3 | Memorize map once, recall multiple components |
| `quiz` / `cloze` / `input` / `truefalse` | 3+ | Basic mechanics need multiple questions to feel like a round |

### Types that are inherently single-question

`order`, `match`, `chain`, `timeline`, `image-quiz`, `image-occlusion` — these are already multi-step interactions within one question. Do NOT use `questions_json` with them.

## Update Mode

When a matching `<source-note-name>-quest.md` already exists, update the quest instead of replacing it wholesale.

- Read the existing quest-map YAML and the updated source note before writing.
- Preserve existing node `id` values when the learning objective and tested content are materially the same.
- Assign a new stable `id` when a node is genuinely new or the old node changed enough that the learner should replay it.
- Append new nodes in a coherent learning order without reshuffling unchanged nodes.
- Do not write progress fields such as `completed:` into YAML. Runtime progress lives in `engram-quest/state/`, keyed by node `id`.
- If using iframe challenges, store generated HTML under `engram-quest/html/{quest-base}/{nodeId}.html` and reference it with `html:`.

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
   - run `scripts/list_quest_icons.sh` to discover available named icon files when the topic's icon is non-obvious; fall back to emoji if the script returns nothing
3. Analyze the source material and identify content characteristics (see Challenge Type Selection table).
4. Design the quest structure:
   - Scale total node count to source material size (see Node count table above).
   - Basic challenge rounds MUST use `questions_json` with **at least 3 questions**.
   - Inherently multi-step mechanics should be standalone challenge nodes.
   - Boss must be deterministic and plugin-gradable, not a free-form essay.
   - **Each challenge node must be immediately preceded by its own lesson node** — one lesson per challenge, no sharing.
   - **The node before the boss round must be a recap lesson** summarizing the whole quest.
   - CRITICAL: at least 2 different challenge types across the quest. Do NOT use quiz for everything.
5. Choose challenge type based on difficulty, source material, and the Challenge Type Selection table.
6. **Image challenges** — follow this workflow whenever the source note may contain images:
   1. **Find images**: scan the source note content for `![[...]]` or `![](...)` embeds. Also check linked notes discovered in step 2.
   2. **Read each image**: use your vision capability to read and understand the image content — identify what the diagram shows, what labels are present, what relationships are depicted.
   3. **Apply the Image Challenge Selection Rules** (see below) to decide if the image is worth testing.
   4. **Generate the challenge**: use `type: image-quiz` with the vault-relative image path. Write a question that requires having seen the image — not answerable from text alone.
      - If the image has clear labeled components → use `options` mode (quiz buttons)
      - If the answer is a specific term to recall → use `keywords` mode (text input)
   5. **Model gate**: all models use `image-quiz`. Only Gemini may use `image-occlusion` — and only after running `scripts/occlusion_measure.py <image_path>` for accurate bbox. If unavailable, fall back to `image-quiz`.

   Example: source note has `![[azure-architecture.png]]` → read the image → identify key components → generate:
   ```yaml
   challenge:
     type: image-quiz
     image: azure-architecture.png
     question: Which component in this diagram acts as the entry point for all client requests?
     options: [Azure SQL, API Management, Service Bus, Cosmos DB]
     answer: 1
   ```
7. Add frontmatter tags when the topic has clear semantic tags.
8. Save the output using the appropriate method:
   - **Embedding in an existing note**: append the `quest-map` code block directly into that note. The plugin detects any `.md` file containing a ` ```quest-map ` block — no filename constraint applies.
   - **Creating a standalone file**: name it `<source-note-name>-quest.md` (see CRITICAL MANDATE above).

## Difficulty Rules

### Progressive difficulty within a quest (applies to ALL difficulty settings)

Every quest MUST follow a difficulty ramp — regardless of the user-requested difficulty level:

| Round position | Cognitive demand | Allowed question types | Question style |
|---|---|---|---|
| Round 1 (first challenge) | Recognition — can the learner identify the concept? | `truefalse`, `quiz` | Direct recall: "What is X?" |
| Round 2 | Application — can the learner use the concept? | `quiz`, `cloze`, `order`, `countdown` | Applied: "Which approach fits scenario Y?" |
| Round 3+ (mid rounds) | Analysis — can the learner compare and reason? | `auction`, `snapshot`, `match`, `chain`, `timeline` | Comparative: "Why X over Y?" or "What breaks if Z?" |
| Boss round | Synthesis — can the learner integrate everything? | `match`, `cloze` (hard blanks), `input`, `auction`, `countdown` (short timer) | Scenario-based: multi-step reasoning, cross-concept integration |

**Boss round MUST:**
- Test integrated judgment: diagnosis, tradeoff, sequence, concept pairing, or decision rule.
- Stay deterministic: every answer must be checkable by index, pair, order, or keywords.
- Avoid all-cloze or all-input bosses. They are usually boring and weak at synthesis.
- Ask questions that require connecting concepts from different lessons, not just recalling one fact.
- Use scenario framing with gradable answers: "Given X constraint, which option is safest?" not open-ended "What would you do and why?"
- Include `explanation` / `explain` for every boss question.

### easy
- Round 1: `truefalse` — simple true/false statements
- Round 2: `quiz` with obvious distractors, include `hint`
- Boss: `quiz` + `cloze` (obvious blanks), include hints
- Keep distractors clearly teachable, not tricky

### medium
- Round 1: `quiz` — direct recall
- Round 2: `cloze`, `order`, or `countdown` — applied recall
- Round 3+: `auction`, `snapshot`, or `memory-palace` — comparative reasoning
- Boss: if the topic has spatial structure (architecture / pipeline / dataflow) or time-based behavior (timer / rate / state), default to `image-quiz` with a self-authored SVG, or `iframe` with a self-authored HTML simulation. Otherwise `match` + `cloze` (non-obvious blanks) + 1 `input` (mixed via per-question type override) — no hints.
- Use plausible distractors that test real confusion points

### hard
- Round 1: `quiz` or `cloze` — no hints, plausible distractors
- Round 2: `countdown` (15s timer), `chain`, or `timeline` — pressure + sequence
- Round 3+: `auction` (easily confused concepts), `match` (cross-concept pairing)
- Boss: if the topic has spatial structure or time-based behavior, default to `image-quiz` with a self-authored SVG, or `iframe` with a self-authored HTML simulation; scenario framing, no hints. Otherwise scenario-based `input` + `cloze` (hard blanks) + `countdown` (10s timer) (mixed via per-question type override).
- **Scenario over trivia**: "Why choose X over Y given constraint Z?" not "What is X?"
- **Traceability**: all hard challenges **MUST** include the `link` field pointing back to the source note

## Challenge Type Selection

AI must analyze the source note content before choosing challenge types. Do NOT default to `quiz` for every chapter.

| Content characteristic | Best challenge types |
|---|---|
| Dense structured info (tables, layers, pipelines) | `snapshot`, `memory-palace` |
| Easily confused concepts, multiple plausible answers | `auction` |
| Fluency / basic recall drill | `countdown` |
| Discrete labeled steps the learner must recall in order (no spatial branching) | `order`, `chain` |
| Historical evolution, version timeline | `timeline` |
| Terminology, fill-in-the-blank | `cloze` |
| **Spatial structure**: architecture, pipeline, dataflow, layered stack, fan-out / fan-in, tradeoff axis (CAP, latency vs cost) | `image-quiz` — use existing image when present, otherwise author an SVG. See `references/visual-challenges.md`. |
| **Time- or rate-based behavior**: timer, throttle, TTL, retry / backoff, rate limit, state machine, scheduler, queue dynamics | `iframe` — author a self-contained HTML simulation. See `references/visual-challenges.md`. |
| True/false factual statement | `truefalse` |
| Concept pairing | `match` |
| Free recall, precise term | `input` |

The two visual / interactive rows are triggered by **content signals in the source note**, not by whether an asset already exists. When the note describes a pipeline or a rate limit but has no diagram, that is still a match — author the SVG or HTML.

## Parser Constraints

The plugin uses a lightweight line-oriented parser. Arrays must be inline, cloze allows exactly one `{{c1::...}}` blank per challenge, image-occlusion uses flat `region_*_pct` fields, and option/answer text must not contain ASCII commas. See `references/parser-constraints.md` for the full rules with examples.

## Challenge Formats

For the full list of all 15 challenge types with YAML syntax, fields, behavior, and design guidance, read `references/challenge-formats.md`.

Supported types: `quiz`, `truefalse`, `order`, `match`, `input`, `cloze`, `countdown`, `snapshot`, `auction`, `timeline`, `chain`, `memory-palace`, `image-quiz`, `image-occlusion`, `iframe`.

## Visual & Interactive Challenges

Every medium or hard quest should include at least one visual or interactive challenge — `image-quiz` (existing image OR self-authored SVG), `image-occlusion` (Gemini only), or `iframe` (self-authored HTML). The absence of an existing asset is not a reason to skip: when the source note describes spatial structure or time-based behavior, author the SVG or HTML yourself.

For the image-quality gate (Step 1–3), the model-capability gate (Gemini-only `image-occlusion`), the SVG decision test + canvas requirements, the iframe decision test + HTML contract, and worked examples — see `references/visual-challenges.md`.

## Chapter Design

- **Lesson nodes**: `summary` (1–3 sentences), `points` (short, concrete), optional `insight`. No challenge.
- **Challenge nodes**: `challenge` only. Basic rounds use `questions_json`; inherently multi-step mechanics stand alone. No points or summary needed (title + emoji only).
- A challenge must test content from the preceding lesson nodes.

## Output Template & Style

For the full output skeleton (frontmatter + quest-map block with multi-chapter example) and the style guide that maps topic mood → style name, see `references/yaml-template.md`.
