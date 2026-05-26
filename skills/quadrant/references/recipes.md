# Q4 Visual Recipes

Q4 turns Q3's metaphor into one concrete image. The reliable strategy is **emoji as the visual
subject** — system emoji are professionally drawn, render consistently, and are immune to the
AI's weak geometry instincts. Recipes A/B/C ship as ready templates in `assets/`; copy the match
and change only the listed content fields. Recipe D is a last resort with strict guardrails.

## Recipe selection (recap)

| Q3 metaphor shape | Recipe | Template |
|---|---|---|
| Cycle / process / self-reinforcing flywheel / PDCA | **A** spinning flywheel | `assets/recipe-A-flywheel.html` |
| Binary / either-or / before-after / pitfall-vs-fix | **B** two-panel comic | `assets/recipe-B-comic.html` |
| One strong single metaphor object | **C** one big emoji | `assets/recipe-C-emoji.html` |
| Genuine spatial structure, no emoji fits | **D** hand-drawn SVG (high risk) | none — follow rules below |
| Pure node-edge structure | (Mermaid) | not recommended — CDN conflict with iframe sandbox |

---

## Recipe A — CSS spinning flywheel (cycle / process)

For 4-step cycles, self-reinforcing flywheels, loops. The whole ring rotates; the four nodes
stay upright. **Change only:** 4 node emoji + 4 node labels + center emoji (5 values), plus the
Q1/Q2/Q3 text. Everything else (rotation, arc arrows, dark mode) is already correct.

Node HTML (inside the rotating ring is the SVG arc; the four nodes sit outside it so text stays
upright):
```html
<div class="flywheel-node n-top"><div class="em">👤</div><div>User</div></div>
<div class="flywheel-node n-right"><div class="em">📊</div><div>Data</div></div>
<div class="flywheel-node n-bottom"><div class="em">🤖</div><div>Model</div></div>
<div class="flywheel-node n-left"><div class="em">✨</div><div>Experience</div></div>
<div class="flywheel-center">🌀</div>
```
Key CSS already in template: `.flywheel-ring { animation: spin 14s linear infinite; }`, the four
`.n-*` position rules, and `.flywheel-center { animation: pulse 2s ...; }`. Do not touch them.

---

## Recipe B — Two-panel contrast comic (binary / decision)

For A-vs-B choices, before/after, pitfall vs fix. Two panels with a big emoji each, red (bad) /
green (good), and a central **VS** badge. **Change only:** 2 titles, 2 main emoji, 2 corner-tags,
2 captions, 2 cost lines (10 values), plus Q1/Q2/Q3.

```html
<div class="comic" style="position:relative">
  <div class="panel bad">
    <div class="panel-title">SageMaker</div>
    <div class="panel-scene">🚚<span class="corner-tag">💸</span></div>
    <div class="panel-caption">Truck to deliver one letter</div>
    <div class="panel-cost">$$$ always-on</div>
  </div>
  <div class="comic-vs">VS</div>
  <div class="panel good">
    <div class="panel-title">Bedrock</div>
    <div class="panel-scene">📞<span class="corner-tag">⚡</span></div>
    <div class="panel-caption">Just make a phone call</div>
    <div class="panel-cost">$ pay per call</div>
  </div>
</div>
```
`.panel-scene` is the big emoji (the visual subject). The red/green + VS framing carries the
decision; pick emoji that dramatize each side.

---

## Recipe C — One big emoji (single metaphor object)

The most underrated option. When the metaphor object itself is memorable (the book's "stunned
little bird" for *tremendous*), one large emoji + a label is enough.

```html
<div class="metaphor-stage">
  <div class="metaphor-emoji">🐦‍⬛</div>
  <div class="metaphor-label">A stunned little bird</div>
  <div class="metaphor-sub">tre(bird) + men(eyes) + dous(out)</div>
</div>
```
Why it wins: no geometry to draw (AI can't draw it badly), system emoji guarantee visual quality,
an 80–100px emoji + one label already looks like a book illustration, the template's `bob`
animation makes it feel alive. **Choosing the emoji:** prefer expressive faces (🤯 🥵 😵‍💫 over
⚙️ 🔧), animals tend to stick better than objects (🐢 🦅 🦔), and two combined emoji are fine
(🚚📨, 🤖🧠).

---

## Recipe D — Hand-drawn SVG (last resort, AI easily fails this)

Use only when **all three** hold: the content has genuine spatial structure, no emoji can express
it, and neither CSS animation nor the contrast comic fits. The Azure-robot failure case (AI
stacking `<rect>` + `<circle>` + `<line>` into a figure) came from ignoring this.

Anti-pitfall rules if you must draw:

| Rule | Why |
|---|---|
| ❌ Don't stack `<rect>`/`<circle>`/`<line>` to build a figure/object | Proportions always come out wrong |
| ✅ Use a single `<path>` for a meaningful shape | Path curves look more organic than primitives |
| ✅ Use only 2–3 colors total | More colors read as amateur |
| ✅ Label every element with text | If the drawing fails, the label still reads |
| ✅ Use emoji as the "subject", SVG only for connectors/lines | Outsource the hard part to emoji |
| ❌ No shadows / gradients / highlights | AI color taste is weak; they make it worse |

Embed emoji as nodes via `<foreignObject>` so the AI only handles deterministic line positions:
```html
<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
  <line x1="140" y1="40" x2="60"  y2="120" stroke="#6366f1" stroke-width="2" stroke-dasharray="4,2"/>
  <line x1="140" y1="40" x2="140" y2="120" stroke="#6366f1" stroke-width="2" stroke-dasharray="4,2"/>
  <line x1="140" y1="40" x2="220" y2="120" stroke="#6366f1" stroke-width="2" stroke-dasharray="4,2"/>
  <foreignObject x="115" y="15" width="50" height="40">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:30px;text-align:center">🌳</div>
  </foreignObject>
  <!-- child nodes as more foreignObject emoji at the line endpoints -->
</svg>
```
When even Recipe D feels forced, the real problem is Q3 — go back and make the metaphor concrete.
