# Visual & Interactive Challenge Authoring

This file is legacy v1 guidance for `image-quiz`, `image-occlusion`, and `iframe` challenge types.
For new HTML-first quests, use `html-quality.md`, `domain-patterns.md`, and `boss-design.md` instead.

Read this when SKILL.md's Challenge Type Selection routes you to `image-quiz`, `image-occlusion`, or `iframe`. The Type Selection table already decides **which** to use; this file is **how** to author each well.

## Default expectation

Every medium or hard quest should include at least one visual or interactive challenge — `image-quiz`, `image-occlusion`, or `iframe`. The source note having no existing image or HTML is **not** a reason to skip; the spatial or temporal structure described in text is what you make visible. Skip visual only when the content is genuinely text-only (vocabulary, plain definitions, factual statements).

## image-quiz vs image-occlusion: model gate

- Gemini → may use `image-occlusion` or `image-quiz`.
- Claude / Cursor / other models → **must** use `image-quiz`. Do not generate `image-occlusion` (the bbox coordinates require native vision capabilities to be accurate).

## Image quality gate — when an existing image deserves a challenge

When the source note already contains an image, run this three-step gate before turning it into a challenge. If it fails, use a text mechanic for that chapter — never force an image challenge just because an image exists.

**Step 1 — Memory value**: is this a target the learner would be tested on?
- PASS: specific architecture node names, organ labels, protocol names, algorithm names.
- FAIL: generic labels (Input / Output / Model), arrows, connectors, decorative icons, anything obvious from context.

**Step 2 — Recall**: with the image shown, does the question still demand retrieval from memory?
- If the answer is visible in the image without prior study → FAIL.
- PASS only if the question creates genuine retrieval demand.

**Step 3 — Question framing**: test understanding, not label recognition.
- Good: "What is the responsibility of this component?" / "Why is X used here instead of Y?" / "What is the output of this step?"
- Bad: "What is this?" (the image carries the answer).

If no target in the image passes Step 1 AND Step 2, fall back to `cloze` or `quiz` for that chapter.

## Self-authored SVG for `image-quiz`

When the source note has no existing image and the content has spatial structure, author a static SVG yourself.

Use SVG when the diagram adds information text cannot express well:

| Content trait | Why SVG helps | Typical examples |
|---|---|---|
| Flow or architecture structure | Spatial relationships are the recall target | Fan-out/Fan-in, layered defense stacks |
| Color or status systems | The color/status mapping is the memory target | Event Storming sticky colors, OFFLINE defense layers |
| Gap or error diagnosis | Learner inspects the whole diagram to find what is missing or broken | `???` missing layer, warning-marked failure point |
| Parallel vs sequential contrast | Branching is clearer visually than in prose | Chaining vs Fan-out |
| Geometric tradeoffs | Position represents meaning | CAP triangle, risk matrix, spectrum placement |

Do not draw an SVG when text would be just as clear:

| Content trait | Use instead |
|---|---|
| Math formulas | `cloze` |
| Plain definitions or text lists | `quiz` / `truefalse` |
| Simple linear steps with no branching | `order` / `chain` |
| Comparison tables | `match` / `auction` |
| Abstract concepts with no spatial relationship | `cloze` / `quiz` |

Decision test: **does the picture add information text alone does not?** If yes, draw it. If no, use a text mechanic.

SVG requirements:

1. Store under `assets/svg-quiz/` (or alongside the source note).
2. Reference with a vault-relative path: `image: assets/svg-quiz/topic-diagram.svg`.
3. Canvas ~460–500px wide × 260–330px tall — reads well in the modal.
4. Static SVG only — no `<script>`, animation, external URLs, remote fonts, or external resources.
5. Use built-in fonts: `font-family="sans-serif"` or `"monospace"`.
6. UTF-8 (including Chinese) is fine as long as labels stay readable at modal size.
7. Optional small caption like `Q: Which defense layer is offline?` only when it helps the image stand alone.

Example:

```yaml
challenge:
  type: image-quiz
  image: assets/svg-quiz/chatbot-defense-audit.svg
  question: According to this security architecture audit, why can indirect prompt injection reach the LLM?
  options: [The CDN DDoS rule is disabled, The model guardrail is offline so injected instructions enter the LLM, The API gateway rate limit is too high, The token budget is missing]
  answer: 1
  explanation: The diagram marks the model guardrail layer as offline, which leaves the LLM exposed to injected instructions.
```

## Self-authored HTML for `iframe`

When the content describes time-based or rate-controlled behavior, author the HTML yourself. The learner needs to manipulate the system to internalize it.

Use `iframe` when the learner must operate something over time:

| Content trait | Why `iframe` helps | Typical examples |
|---|---|---|
| Rate / throttle / burst behavior | Slider + live counter shows what rules allow / reject | Token bucket, leaky bucket, sliding window |
| Timed lifecycle / TTL | Learner watches keys expire on a clock they control | Redis TTL, session timeout, cache eviction |
| Step-driven state machine | Each click advances; missing one breaks understanding | SAGA compensation, two-phase commit, transactions |
| Algorithm step-through | Learner watches the algorithm progress over data | Binary search, BFS/DFS, scheduling |
| Multi-stage request flow with timing | Send a request, watch each hop's latency | CDN → Gateway → Lambda → DB, retry/backoff |

Do not use `iframe` for content better served by text or a static SVG:

| Content trait | Use instead |
|---|---|
| Plain definitions or factual lists | `quiz` / `truefalse` / `cloze` |
| Static architecture diagram (no time dimension) | `image-quiz` with self-authored SVG |
| Memorization of fixed labels | `image-quiz` or `image-occlusion` |

Decision test: **must the learner manipulate the system over time to understand it?** If yes, `iframe`. If structure is static, `image-quiz` with SVG. If neither, text.

HTML requirements (also see `references/challenge-formats.md` → `iframe`):

1. Store at `engram-quest/html/{quest-base}/{nodeId}.html`. Keep `{nodeId}` stable across quest updates so progress survives the next regeneration.
2. Reference from YAML: `html: engram-quest/html/{quest-base}/{nodeId}.html` plus initial `height:` in pixels.
3. Fully self-contained — inline CSS and JS only. No external `fetch`, CDN scripts, remote fonts, `alert()` / `confirm()` / `prompt()`, popups, or top-level navigation.
4. On completion, call `window.parent.postMessage({ type: "engram-quest-solved", score: 0–100 }, "*")`.
5. To resize, call `window.parent.postMessage({ type: "engram-quest-resize", height: <px> }, "*")`.
6. Listen for `engram-quest-theme` messages and adapt colors when `event.data.dark` is true. Do not hardcode backgrounds that break dark mode.
7. Initial canvas ~480–520px tall; the resize message can grow it up to ~900px.

Example reference:

```yaml
challenge:
  type: iframe
  html: engram-quest/html/token-bucket-quest/sim-burst.html
  height: 480
```
