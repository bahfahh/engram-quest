# Lesson HTML Recipe — hard rules & visual guide

Lessons render inside Obsidian in a sandboxed iframe (`sandbox="allow-scripts"`, loaded via
`srcdoc`). Obsidian is an Electron app with a strict Content-Security-Policy: **any externally
loaded resource silently fails** — no error, just missing fonts/styles/scripts. These rules
exist because violations look fine in a normal browser but break inside Obsidian.

## Hard rules (CSP compatibility)

1. **One file, fully self-contained.** All CSS in one `<style>` block, all JS in one
   `<script>` block at the end of `<body>`.
2. **No external loads of any kind**:
   - ❌ `<link rel="stylesheet" href="https://…">` (no Google Fonts, no CDN CSS)
   - ❌ `<script src="https://…">` (no CDN libraries — write vanilla JS)
   - ❌ `@import`, `url(https://…)` in CSS
   - ❌ `<img src="https://…">` (use emoji, styled divs, or inline SVG instead)
3. **Citations are fine** — `<a href="https://…" target="_blank">` only *navigates* on click,
   it doesn't load anything. Cite sources freely.
4. **System font stack only**:
   `font-family: -apple-system, 'Segoe UI', 'Noto Sans TC', sans-serif;`
   (`'Noto Sans TC'` helps zh rendering; monospace: `'Consolas', 'JetBrains Mono', monospace`)
5. **No `eval()` / `new Function()`** — Electron CSP blocks them.
6. **`<title>` is required** — set it to the lesson title (the plugin's import flow and tab
   tooling read it).
7. Start with `<!DOCTYPE html>` and `<meta charset="UTF-8">`.

## Theme

Lessons may optionally listen for the plugin's theme message:

```js
window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "engram-quest-theme") {
    document.body.classList.toggle("light", !e.data.dark);
  }
});
```

This is optional — a well-designed dark theme with sufficient contrast reads fine in both
Obsidian themes. If you skip theme handling, design dark-first (the reference palette below).

## Reference palette (dark)

```css
:root {
  --bg: #0f1117;       /* page background */
  --surface: #1a1d27;  /* cards, callouts */
  --surface2: #242736; /* nested surfaces, table headers */
  --border: #2e3248;
  --accent: #6c8fff;   /* h2, links, primary highlights */
  --accent2: #a78bfa;  /* h3, secondary highlights */
  --green: #34d399;  --yellow: #fbbf24;  --red: #f87171;
  --text: #e2e8f0;   --muted: #94a3b8;
  --code-bg: #0d1117;
}
body { max-width: 860px; margin: 0 auto; padding: 48px 24px 80px;
       background: var(--bg); color: var(--text); line-height: 1.7; font-size: 16px; }
```

## Responsive / mobile (hard rules)

Lessons are read on phones inside a ~380–500px-wide iframe as often as on desktop. A fixed
multi-column layout at that width squeezes each column to ~120px, and CJK text then wraps
**one character per line** — unreadable. Every layout must survive a 400px viewport:

1. **Every multi-column grid collapses on narrow screens.** Either add a media query:
   ```css
   .concept-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
   @media (max-width: 600px) { .concept-cards { grid-template-columns: 1fr; } }
   ```
   or make it intrinsically responsive (no media query needed):
   ```css
   grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
   ```
2. **Fixed-width label columns** (e.g. timeline `grid-template-columns: 100px 1fr`) — stack
   them on mobile (`@media (max-width:600px){ grid-template-columns: 1fr; }` puts the label
   above the content).
3. **Horizontal flow diagrams** (pipelines, step arrows built from flex divs): give the
   container `overflow-x: auto` and each stage a `min-width` — on phones it scrolls
   horizontally instead of crushing the stages.
4. **Wide tables**: wrap in `<div style="overflow-x:auto">` so the page never overflows.
5. Sanity check before finishing: imagine the lesson at 400px wide — no column should force
   text below ~8 characters per line, and nothing should overflow the viewport.

- **Header**: lesson number tag pill → `<h1>` title → one-line subtitle in `--muted`.
- **Callout boxes** for key points / warnings / pitfalls: left-border colored box with an
  uppercase label (`KEY INSIGHT` / `PITFALL` / `WHY THIS MATTERS`).
- **Tables** for comparisons; **styled div diagrams** for architecture/flows (boxes + arrows
  built from flex divs — never external images).
- **Code blocks**: `<pre><code>` with `--code-bg`, syntax-color important tokens manually
  with spans (`.keyword`, `.string`, `.fn`).
- **Footer**: citation links + "ask your AI teacher follow-up questions" reminder.

## Interactive quiz (end of every lesson)

3–5 questions, vanilla JS, immediate visual feedback. Minimal working pattern:

```html
<div class="quiz">
  <h3>✅ 自我檢測</h3>
  <p class="quiz-q">1. Which layer does X belong to?</p>
  <div class="quiz-options" data-answer="1">
    <div class="quiz-opt">Option A</div>
    <div class="quiz-opt">Option B (correct)</div>
  </div>
  <div class="quiz-feedback"></div>
</div>
<script>
document.querySelectorAll(".quiz-options").forEach(group => {
  const fb = group.parentElement.querySelector(".quiz-feedback");
  group.querySelectorAll(".quiz-opt").forEach((opt, i) => {
    opt.addEventListener("click", () => {
      const ok = i === Number(group.dataset.answer);
      opt.classList.add(ok ? "correct" : "wrong");
      fb.textContent = ok ? "✓ 正確！<short why>" : "✗ 再想想 — <hint>";
      fb.className = "quiz-feedback show " + (ok ? "correct" : "wrong");
    });
  });
});
</script>
```

Give correct/wrong states distinct colors (green/red backgrounds at low opacity) and always
explain *why* in the feedback text — the explanation is where the learning happens.

## Length & density

A lesson is 10–20 minutes of reading + the quiz. As HTML that's typically 300–600 lines.
If a topic needs more, that's a signal to split it into two lessons in the outline.
