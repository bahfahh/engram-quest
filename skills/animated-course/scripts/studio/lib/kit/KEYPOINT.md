# Key-point card `lib/kit/keypoint.js`

The "key point" beat at the end of each middle segment (4–6 s) consolidates its one point: the real-UI background pushes back and fades, and a white card appears. Top: label "重點 2／3" (Key point 2/3) + progress dots; middle: **your concept figure** (elements appear one by one with the narration); bottom: one bold key sentence (76px; text inside `**…**` gets a highlighter underline).

The original demo project (`projects/_keypoint-demo/`, three cards from lesson 4) isn't shipped with this skill.

## Minimal usage

```html
<link rel="stylesheet" href="/lib/kit/kit.css">
<link rel="stylesheet" href="/lib/kit/keypoint.css">     <!-- in head, after kit.css -->
<script type="module">
import * as K from '/lib/kit/kit.js';
import * as KP from '/lib/kit/keypoint.js';
import * as S from '/lib/stage.js';
await K.init(['layout-grid', 'wallet', 'image']);       // preload every lucide icon used in figures
const T = await S.loadTimeline();
const st = K.stage({ ... });  /* …your real-UI scene… */

const kp1 = KP.keypoint(st, {
  ...KP.beat(T, 'K1', '一個變因'),        // = {at: 0.4 s before K1 starts, keyAt: when "一個變因" ("one variable") is spoken, until: K1 end + hold + exit}
  index: 1, total: 3,
  key: '兩組只差**一個變因**',            // "The two groups differ by **one variable**". ≈ 12 characters; longer warns
  figure: f => {
    const A = f.card({ x: 410, y: 240, title: 'Ad set A', icon: 'layout-grid', rows: [...], t: T.word('K1', '兩組') });
    f.badge('≠', { on: A.rows[4], x: 720, t: T.word('K1', '素材') });
  },
});
window.renderAt = K.render(tl, cam, bar, kp1, kp2, kp3);   // kp.update(t) is a pure function of t; pass it with cam and bar
window.studioReady = K.ready();                            // still last
</script>
```

- First argument: the return value of `K.stage()`. The card sits above the world and below the chapter bar; the background (`.k-viewport`) scales to 95% under an 80% overlay of the background colour. Pages without `K.stage`: pass any 1920×1080 parent element and set `backdrop` to what to push back (or `false`).
- One page can have several cards (one per segment), each with its own `update(t)`. The background push-back follows whichever card is strongest at the moment, so cards don't fight.
- **All times are absolute seconds** (like `T.word()` / `T.line()`). A string `'+1.2'` = 1.2 s after the card starts. Elements without a time are spread evenly, in creation order, between the entrance (at + 0.4) and the key sentence.

## Recommended rhythm

What worked: each segment ends on the teacher's key-point line (e.g. `K1`), then 2.5–3 s of silence (`{"id":"K1-hold","silence":2.8}`; experiment 16's bored middles had 1 s, `04-skeleton.md` §2); set `hold` to match.
`KP.beat(T, 'K1', 'keyword', {lead:0.4, hold:1.0})` returns `{at, keyAt, until}`: the card enters 0.4 s before that line, figure elements appear on words in the line, the key sentence writes out when the keyword is spoken, and after the line ends it holds `hold` s before leaving (exit 0.45 s): about 4–6 s in all.
Figure before sentence worked: picture first, then words (one idea at a time).

## `KP.keypoint(st, opts)` parameters
| Parameter | Default | Description |
|---|---|---|
| `at` | 0 | Card starts entering (entrance 0.5 s) |
| `dur` / `until` | 5 / — | Total length (incl. enter/exit) or end second |
| `index`, `total` | 1, 3 | "label index／total" and progress dots (done = grey, current = black bar, upcoming = light grey) |
| `label` | `'重點'` ("Key point") | Label text |
| `key` | — | Key sentence; `**…**` gets a highlighter underline (brushed on 0.45 s after the sentence is written) |
| `keyAt` | at + min(2.6, dur × 0.5) | When the key sentence writes out left to right |
| `figure` | — | `f => {…}` (drawing helpers, below) / SVG or HTML string / DOM node |
| `size` | `[1440, 480]` | Figure area (card is 1640×800; this is its middle). Origin = top-left of this area |
| `sub` | — | Small line under the label (seldom needed: fewer words) |
| `backdrop` | st's `.k-viewport` | Background to push back; `false` = leave it |
| `out` | true | `false` = no exit (you cut to another view yourself) |
| `mark` | `#FFE27A` | Highlighter colour |
| `lang` | — | `'en'` for English mode (see `EN.md`) |

Returns `kp`: `update(t)` (= `render(t)`), `card`, `fig` (figure container), `key`, `at`, `end`, `keyAt`, `f` (the helpers; add more elements later).

## Drawing helpers (`figure: f => {…}`)
Coordinates are figure-area px (default 1440×480, top-left 0,0); `x, y` is the element's **center**. Every helper accepts `t` (appear time) and `anim` (`pop`, `up` float up, `fade`, `wipe` left to right, `draw` line draws on). Colours use kit names: `a` (teal = Concept A), `b` (orange = Concept B), `red`, `green`, `blue`, `amber`, `neutral`, or hex.

| Helper | Use |
|---|---|
| `f.node({x, y, icon, label, sub, color, size:'s'\|'m'\|'l', shape:'tile'\|'circle', solid, t})` | Icon + label node (a lucide icon in a pale rounded tile, 36px bold label and 26px subtext below). Returns `{el, wrap, tile}`; arrows can attach to `tile` |
| `f.arrow({from, to, label, color, width:5, dashed, bend:0, head:true, fromSide, toSide, gap:14, t, dur:0.55})` | Arrow / line. `from/to` = `[x,y]`, a helper's return value, or any element in the figure (attaches to its border). `bend` curvature (±0.1–0.3). `width` can show quantity (thickness of a money flow). `label` = small pill at the middle, appears when the line is 60% drawn |
| `f.group({x, y, w, h, label, color, dashed:true, t})` | Dashed group box (x,y = top-left), small label on its border. The box draws along its edges |
| `f.card({x, y, w:520, title, icon, rows:[{icon, label, value, color, t}], t})` | Mini UI card (e.g. an ad set). Rows with `color` are tinted; a row with `t` lights up at t. Returns `{el, rows}`; use `rows[i]` for arrows or badges |
| `f.badge('=' \| '≠' \| '✓' \| 'x' \| iconName, {on, side:'right', x, y, dx, dy, color, ghost, size:64, t})` | Round badge. `on` = stick next to that element; with `x` or `y` it uses your coordinates (e.g. between two cards `x: 720`, `y` following the row) |
| `f.compare({x, y, left:{title, sub, icon, color, items:[{icon,label}], node, t}, right:{…}, vs:'VS', colW:560, t})` | Two-column comparison: big icon tile + title + (two or three) small items, a line and VS in the middle. Right column defaults to 0.9 s after the left |
| `f.text(str, {x, y, size:40, color, weight, t, anim:'fade'})` | Free text (`**bold**`) |
| `f.put(node, {x, y, t, anim})` | Place your own DOM (e.g. scaled-down `K.crowd()`, `K.counter()`, `K.creative()`) |
| `f.reveal(el, t, anim)` | Make any element you placed yourself appear at t |

**Your own SVG / HTML**: pass a string or node as `figure`; any element with `data-t="62.4"` (or `data-t="+1.2"`) appears at that second; `data-anim="draw"` draws `<path>/<line>/<rect>/<circle>` along their outline (SVG geometry elements default to draw); `data-dur` sets the duration.
```js
figure: `<svg width="1440" height="480">
  <rect x="200" y="100" width="300" height="200" rx="24" fill="#E7F6F4" data-t="+0.6"/>
  <path d="M520 200 L900 200" stroke="#0F9D8F" stroke-width="8" fill="none" data-t="+1.2"/>
</svg>`
```

## Style rules
- **One idea per card**, to land at a glance: one figure + one sentence. A figure in the *shape* of the idea (two identical cards differing in one cell, a thick vs thin money flow, two columns compared) teaches; a bullet list doesn't. Reference: ≈ 15 characters besides the key sentence (it can be a short anchor).
- White card, generous whitespace, icons + bold text, same palette as `lib/kit` (teal = A, orange = B, red = problem, green = good), to sit naturally next to the real UI.
- Card spans y 112–912; the bottom 140px stays empty (plugin subtitles); the top-left chapter bar stays visible.
- The ending mindmap redraws it small in chalk, to be recognised; one that reduces to ≈ 4–6 chalk strokes (`mindmap.js` `doodle`) makes that easy.

## Rendering
- DOM page: no `RENDER_GPU=1` (`--disable-gpu`), as usual. The card uses no blur and no backdrop-filter, only opacity / transform / clip-path, so cost equals a normal kit scene (about 0.08 s/frame at half resolution).
- Layout is measured once, on the first frame the card appears, then fixed; `renderAt` can be called in any order.

## Known limitations
- Arrows and badges attached to elements use the element's layout position *before it appears*; if you later move the element yourself (tween x/y), the arrow does not follow.
- `f.card` rows are a fixed 62px high; for more fields, place your own DOM with `f.put`.
- The key sentence is one line (`white-space: nowrap`); 12 Chinese characters fit; longer overflows the card (and warns). In English mode it auto-shrinks instead (see `EN.md`).
- `color-mix()` needs a recent Chromium (the studio's Playwright has it).

## English mode

For English courses use `lang: 'en'` (DOM pages: `K.setLang('en')`). Usage, fonts, caveats: `/lib/classroom/EN.md`. Without it the component stays in Chinese mode, pixel for pixel unchanged.
