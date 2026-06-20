# HTML Mission Quality

Use this checklist for every v2 mission and boss HTML file.

## Hard CSP rules

The HTML runs inside an Obsidian sandboxed iframe.

Allowed:
- one `<!DOCTYPE html>` document
- inline `<style>`
- inline `<script>` at the end of `<body>`
- vanilla JavaScript
- inline SVG
- data URI images when truly useful

Forbidden:
- external CSS or fonts
- CDN scripts
- remote images
- `fetch`
- `eval` or `new Function`
- `alert`, `confirm`, or `prompt`
- top-level navigation

## Required skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mission Title</title>
<style>
:root {
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #dbe3ef;
  --accent: #2563eb;
  --good: #16a34a;
  --warn: #d97706;
  --bad: #dc2626;
}
body.dark {
  --bg: #0f172a;
  --card: #172033;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --border: #334155;
  --accent: #60a5fa;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 22px 18px 72px;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, "Segoe UI", "Noto Sans TC", system-ui, sans-serif;
  line-height: 1.6;
}
.wrap { max-width: 900px; margin: 0 auto; }
button { font: inherit; }
@media (max-width: 600px) {
  body { padding: 16px 12px 64px; }
}
</style>
</head>
<body>
<main class="wrap">
  <!-- mission UI -->
</main>
<script>
function resize() {
  window.parent.postMessage({ type: "engram-quest-resize", height: document.body.scrollHeight + 24 }, "*");
}
function solved(score) {
  window.parent.postMessage({ type: "engram-quest-solved", score }, "*");
}
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "engram-quest-theme") {
    document.body.classList.toggle("dark", Boolean(event.data.dark));
    resize();
  }
});
resize();
</script>
</body>
</html>
```

## Interaction quality

Every mission should include:
- a clear situation, not only a question
- visible state: metrics, code, diagram, patient chart, campaign table, equation, timeline, or inventory
- learner action: choose, arrange, calculate, inspect, match, debug, triage, or tune
- immediate feedback explaining why the answer is good or risky
- a **"完成關卡 / Finish" button** that the learner must click before `solved()` is called — this gives
  learners time to read per-item feedback explanations before the plugin advances the stage

**Never use `setTimeout(solved, N)`** for multi-item missions. No value of N is long enough
because readers go at different speeds. The only permitted exception is a single-choice
single-question mission where the feedback is one sentence and there is nothing else to read.

Avoid:
- one-screen trivia quizzes
- decorative graphics with no learning job
- options where one answer is obviously absurd
- locking the learner after one wrong click unless that is the explicit mechanic

## Nielsen Usability Checklist (required before writing any mission HTML)

### 1. Visibility of system status
- Every interactive element must show clearly different visual states for selected / completed /
  correct / wrong — color **plus** a text label, not only a CSS outline or opacity change.

### 2. Affordance — interactive elements must look interactive
- Clickable buttons: must have `border` + `hover` effect + `cursor:pointer`
- Input fields: must look like input fields
- Never design an area that looks like a display panel but is actually clickable
- Any interactive region that is not obviously a button must have a visible label or placeholder

### 3. Classification tasks — per-item inline buttons
- When the task is "assign N items to M buckets": give each item inline buttons for each bucket,
  one click completes the assignment, no hidden state required.
- Do **not** use drag-to-zone or two-step select-then-click: sandboxed iframes have no reliable
  drag feedback, and two-step flows depend on the learner remembering implicit selection state.

### 4. User controls reading pace
- After revealing final feedback, show a "完成關卡 / Finish" button — never auto-advance with
  `setTimeout`. The learner must click before the plugin shows the score overlay.

### 5. Error feedback quality
- Every wrong answer must show: ✗ what the learner chose + ✓ the correct answer + why it is correct
- Feedback text must remain visible until the learner clicks "完成關卡 / Finish"

## Theme and responsive rules

- Support both light and dark themes through CSS variables and the `engram-quest-theme` message.
- Use `auto-fit` grids or mobile media queries so CJK text does not collapse into one-character columns.
- Wrap wide tables in `overflow-x:auto`.
- Keep code blocks scrollable.
- Avoid fixed heights except for controlled panels; let the iframe resize.

## Example assets

Use `assets/examples/mission-basic.html` and `assets/examples/boss-cascade.html` as implementation references. They are intentionally small; real output should be more domain-specific.

