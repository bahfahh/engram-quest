# End-of-lesson blackboard mindmap `lib/classroom/mindmap.js`

The lesson in one picture (`04-skeleton.md` §3; the tail the user values). Draws a **structured diagram** in chalk on the classroom blackboard canvas (`makeBoard()` from `cast.js`, 2048×1068): a center node, branches, edges (straight / curved / arrow / dashed), small labels on edges, lucide icons traced as chalk lines, your own chalk doodles (redraw the lesson's key-point figures small), and small stills of real UI pasted on like photos (white border, shadow, tape).

Every node and edge has its own start time and is **written and drawn** in chalk (letter by letter, stroke by stroke), not popped in. Positions are computed or given; it warns when text is long, small, overlapping or off the board.

The original demo project (`projects/_mindmap-demo/`, a lesson-4 ending with three branches = three decisions) isn't shipped with this skill.

## Minimal usage (inside classroom.html)

```js
import * as C from '/lib/classroom/cast.js';
import { makeMindmap } from '/lib/classroom/mindmap.js';

const board = C.makeBoard(); board.g.position.set(0, 1.85, -2.36); scene.add(board.g);
const mm = await makeMindmap(board, {
  layout: 'radial',
  lang: 'en',                                                         // omit for a Chinese board
  center: { text: 'Change one thing, then measure', t: W('E02', 'change') },
  nodes: [
    { id: 'goal',   text: 'Pick one goal', t: W('E03', 'goal'), photo: { src: 'snaps/objective.jpg', crop: [395, 515, 455, 300], w: 340 }, edge: { label: 'Measure what?' } },
    { id: 'budget', text: 'Fix the budget', t: W('E04', 'budget'), doodle: cboDoodle, edge: { label: 'How much?' } },
    { id: 'test',   text: 'Differ by one change', t: W('E05', 'one'), doodle: oneVarDoodle, edge: { label: 'How to compare?' } },
    { id: 'wait',   text: 'Run 7 days untouched', parent: 'test', t: W('E05', '7 days'), icon: 'lock', pic: 'left', color: 'yellow' },
  ],
});
window.renderAt = t => {
  /* camera, characters… */
  if (t >= mm.start - 1) mm.update(t); else myBoard.update(t);   // your own board for the opening, the mindmap for the ending (or use wipe below)
  renderer.render(scene, cam);
};
```
- `makeMindmap` is **async** (fonts, icons, photos); `await` it before `studioReady`.
- `mm.update(t)` is a pure function of `t`: it redraws the whole board (background + chalk + photos). Unchanged → no redraw or texture upload; returns `true` when it drew.
- Connecting to your own board:
  - **Wipe and redraw**: `wipe: { at: seconds, dur: 0.6, prev: (ctx, t) => myBoardDraw(ctx, t) }`. Before `at` it draws your `prev`; from `at` an eraser wipes left to right, then the mindmap is drawn. `prev` only needs to draw your board onto `ctx` (no background).
  - **Compose yourself**: `mm.drawOn(ctx, t)` draws only the mindmap's chalk and photos (no background, does not set `needsUpdate`); you decide what to draw when.
- When two things take turns drawing the same board, `mm.update` detects that someone else drew (via `board.tex.version`) and redraws itself. If your own board caches with a `lastKey` like `board.js` does, switching back to it may look "unchanged" and skip the redraw (only when stills render out of order, e.g. ending before opening). Add a `board.tex.version` check to your update, or use `wipe` (then only the mindmap draws).
- Pointing the teacher's chopstick at a node: `mm.point('budget', 'top')` returns board px; convert to 3D with your own `boardPt()`.

## Layouts `layout`
| Layout | Use for | How positions are computed |
|---|---|---|
| `radial` mindmap | Center = the lesson's question or its one-liner; branches = the segment key points | 2–6 branches at fixed, balanced positions (3 = center on top, branches left / bottom / right, reading order left → right); a branch's children stack below it. With 3 branches the edge labels are staggered (middle label further down its line, side labels higher) so they do not form one crowded row. A center longer than one line's limit (below) wraps onto two balanced lines by itself |
| `tree` decision tree (top-down) | "Ask A first? yes → … no → …" | Root on top, each level split evenly, subtree width proportional to leaf count; edges default to arrows |
| `flow` process (left → right) | first… then… next… (steps, decision sequence) | `center` becomes a title on top; `nodes` in order in one row, each auto-linked to the next by an arrow (`edge.label` e.g. "then") |
| `compare` side by side | this vs that, before vs after | `center` is the title; nodes split into two columns by `side: 'left'\|'right'`, a chalk divider in between (`divider`, below) |

`divider` (any layout): `true` = a vertical line down the middle (the `compare` default, sized to the columns there), `false` = none, `{ x }` = vertical at x, `{ y }` = horizontal at y, `{ pts: [[x, y], [x, y]] }` = your own line; add `t` to set when it is drawn (default: 0.6 s after the center). Board px.

Give any node `pos: [x, y]` (board px, node center) to use your coordinates; `dx/dy` nudge an auto position. `area: {x, y, w, h}` (default `{x:80, y:56, w:1888, h:956}`) restricts the usable region, e.g. to keep the top-left free.

## Nodes
```js
{ id, text, t,                         // t = start time in seconds (picture first, then text, then frame)
  parent: 'center' | 'id',             // parent for radial/tree (default center); not used by flow/compare
  color: 'white',                      // text colour: white yellow pink orange teal(=a) blue green purple, or any colour
  size: 64,                            // font size (board px). Defaults: center 84, branch 64, child 56, edge label 56
  icon: 'lock', iconSize: 104,         // lucide icon traced in chalk (names as in /node_modules/lucide-static/icons/)
  photo: { src, img, crop: [sx,sy,sw,sh], w: 320, h, rot: -0.03, tape: true },   // small still of real UI, white border + shadow + tape
  doodle: { w, h, dur: 1.0, draw: d => {…} },    // your own chalk doodle (below)
  pic: 'top' | 'left',                 // picture above the text (default) or to its left
  frame: 'none' | 'ellipse' | 'box' | 'underline',  // center default: ellipse (radial) / underline (other layouts)
  frameColor, pos: [x, y], dx, dy, side: 'left'|'right',
  edge: { label, style, color, t, bend, from, labelDx, labelDy, labelMode: 'on'|'beside', width } }   // the edge from the parent
```
- **Photos**: render a still from a DOM scene (`node render.cjs projects/<yours> --stills 82` → `stills/t-82.jpg`), copy it into your folder, and cut the region with `crop` (source px). At 300–360px wide on the board, UI text inside is only recognizable, not readable; put the point in the chalk text.
- **Edges**: `style` = `line` (radial default), `arrow` (tree / flow default), `dashed`, `dashedArrow`, `none`. Radial edges from the center curve slightly. `label` sits at the middle of the edge and the line breaks around it (`labelMode: 'beside'` puts it next to the line). An edge starts drawing 0.5 s before its node by default; change with `edge.t`.
- **Extra edges** (cross-branch cause, contrast): `edges: [{ from: 'budget', to: 'test', label: 'so', style: 'dashedArrow', bend: 0.2, t }]`.
- **Which side an edge leaves / enters**: `fromSide` / `toSide` = `'top' | 'bottom' | 'left' | 'right'` (on an extra edge, or in a node's `edge`) pins the end to the middle of that side of the node's frame or box. Without them the end sits where the straight line between the two centers crosses the frame. Use them when two links would leave a node at the same point, or a link should enter a column from above.
- **Label position**: `labelDx` / `labelDy` (board px) nudge the label from the middle of the edge; setting either one also turns off the automatic 3-branch stagger for that edge. `labelMode: 'beside'` keeps the line whole and moves the label off it, perpendicular to the straight line from start to end, always to the right-hand side of the travel direction (a left → right edge gets its label below, a top → bottom edge to its left). The side is not chosen for free space, and on a strongly bent edge the label may land on or across the curve: check the still, then swap `from` / `to`, change `bend`, or nudge with `labelDx` / `labelDy` (applied before the sideways move).

## Chalk doodles `doodle` (redraw a key-point figure small)
`draw` runs once at build time and records every stroke; playback draws them in order (finished in `dur` seconds). Coordinates are the doodle's own `0..w, 0..h`.
```js
const oneVarDoodle = { w: 300, h: 180, dur: 1.3, draw: d => {        // two groups that differ by one change
  for (const [x, c] of [[10, 'teal'], [170, 'orange']]) {
    d.rect(x, 4, 120, 172, { r: 12 });
    for (let i = 1; i < 5; i++) d.line(x + 8, 4 + i * 34, x + 112, 4 + i * 34, { width: 5, color: 'grey' });
    d.hatch(x + 6, 142, 108, 28, { color: c });                       // only the changed cell is coloured
  }
  d.text('≠', 150, 158, { size: 50, color: 'yellow' });
} };
```
| Stroke | |
|---|---|
| `d.line([[x,y],…] or x0,y0,x1,y1, o)` | polyline; `o.bend` makes an arc |
| `d.arrow(x0,y0,x1,y1, o)` | arrow (`o.width` thickness can show quantity, `o.head` head size, `o.bend`) |
| `d.rect(x,y,w,h, o)` (`o.r` corner radius), `d.circle(cx,cy,r)`, `d.ellipse(cx,cy,rx,ry)` | frames |
| `d.hatch(x,y,w,h, o)` | chalk hatching fill ("this cell is different") |
| `d.dashed(pts, o)` | dashed line (group box, dashed circle) |
| `d.text(str, x, y, o)` | small text (`o.size` default 52, centred); numbers are fine, keep words minimal |
| `d.icon(name, cx, cy, size, o)` | lucide icon traced in chalk |
| `d.dot(x,y,r)`, `d.cross(cx,cy,r)`, `d.check(cx,cy,r)` | dot, cross (not this one), check |

`o = { color, width, … }`; colours as above, plus `grey` (faint white).

## Text size and warnings
- Chalk text reads well from **50px on screen**. The component converts with `screenScale` (board px → screen px, default 0.9):
  - The usual ending **BC shot** (`P([0, 1.652, BZ + 4.703], [0, 1.652, BZ], 32)`, board y 40–1050 → screen 16–925): 1 board px ≈ 0.9 screen px → text ≥ 56. Default sizes (84 / 64 / 56) pass.
  - The B shot (upper half of the board, about 0.8): `screenScale: 0.8`, text ≥ 64.
  - The BFULL shot (whole board fills the frame, about 1.07): `screenScale: 1.07`.
- Warnings are printed as `console.error('[mindmap 警告] …')` (警告 = "warning"); `render.cjs` lists them at the end, and they do **not** fail the render. Triggers: node over 8 characters (center: 12 per line, at most two lines, so up to 24 in all; one per Chinese character, one per English word — in `lang: 'en'` see EN.md for word limits), whole board over 60 (numbers not counted), text under 50px, overlapping nodes / edge labels, anything off the board. Length counts are references — judge whether the board reads at a glance; the rest are real faults. Shorten the text or move it with `pos`.

## Timing
- All times are absolute seconds; get them from `T.word()` / `T.line()`. Nodes without `t` start at 0 and follow every 1.4 s (drafting only).
- One node: picture (photo 0.4 s, icon 0.7 s, doodle `dur`) → text (0.075 s per Chinese character) → frame. `mm.start` / `mm.end` are the times of the first and last stroke. The last frame, held 5 s at delivery, is the finished clean board.
- `mm.add(...els)` adds your own timed elements: `import { el } from '/lib/classroom/mindmap.js'`, then `el.text('Right!', x, y, {size: 64, color: 'yellow'}, t)`, `el.stroke(pts, {color}, t, dur)`, `el.custom(t, dur, (c, k) => …)`; elements with `layer: 'paper'` draw on the photo layer.

## Render cost
- Classroom pages use `RENDER_GPU=1` as usual.
- The component caches what is already finished (background + chalk + photos) and per frame only redoes chalk grain inside the region of strokes being written, then uploads the board texture once; unchanged frames are not redrawn. A frame where a stroke just finished rebuilds the cache once (whole board chalk, about +0.3–0.5 s).
- Measured (demo classroom, BC shot, machine under load): about **3.5 s/frame, of which the mindmap adds only about 0.1 s/frame**. On an idle machine the classroom is about 2.5 s/frame.
- Endings worked with the camera fixed on BC: only the board changes, so the eye follows the chalk.

## Known limitations
- Child nodes auto-stack below their parent; when there is no room below (e.g. the radial branch at the bottom), give `pos` yourself.
- Edge labels sit at the exact middle of the edge; on a very short edge the label covers the whole line (an overlap warning is printed). Spread the nodes or use `labelDx/labelDy`.
- `tree` splits width by leaf count and does not shrink text; more than 4 nodes on one level tend to overlap.
- Text is written line by line (`\n` breaks). Only a `radial` center wraps by itself (to two lines, when it is over one line's limit and has no `\n` of its own); every other text needs your `\n`.
- lucide icons are stroke outlines; rare filled parts are not traced.

## English mode

For English courses use `lang: 'en'` (DOM pages: `K.setLang('en')`). Usage, fonts, caveats: `/lib/classroom/EN.md`. Without it the component stays in Chinese mode, pixel for pixel unchanged.
