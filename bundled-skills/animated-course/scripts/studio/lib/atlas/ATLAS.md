# Atlas diagram world `lib/atlas/` (approved, experiment 13)

A 3D world drawn like a textbook figure: pale paper solids, ink edges from a normal + depth pass, one lit thing. `render.js` and `parts.js` are copied unchanged from [Atlas of Physics](https://github.com/nathanliow/atlas-of-physics) (MIT, © Nathan Liow — `LICENSE-ATLAS`; keep the header line). Use it when the real thing *is* a geometry or a motion: velocities, forces, fields, mechanisms, a structure seen from a few angles. It is one way of showing, not a default look (`05-presentation-methods.md`).

The reference film: experiment 13, `phys-river` (crossing a river, adding two velocities). Its sources are in the vault lab notebook: `研究/實驗13-Atlas式物理（渡河）/各片/phys-river/src/scene.html` — copy that page as the starting point.

## Setup (scene.html)

```js
import { createEngine } from '/lib/atlas/render.js';
import { part, box, cyl, arrow, setArrow, shadeMat, PALETTE, V, TONE } from '/lib/atlas/parts.js';
PALETTE.water = ['#f2f7fd', '#e7eff9', '#d2deee'];          // add palettes BEFORE creating any material ([top, light, dark])
const E = createEngine(document.getElementById('gl'), { fov: 24, bg: '#fbfbfa' });
E.setDprCap(1); E.resize(1920, 1080);
const g = E.asm('boat', E.scene, {});                        // an assembly = one thing that can be lit
part(g, box(0.3, 0.1, 0.6), { pal: 'paper', tone: 'hi', name: 'hull' });   // name is required, or setLit ignores the part
const a = arrow(E.asm('vBoat', E.scene, {}), 'ink', { r: 0.045, head: 0.24, headR: 0.11, name: 'arrow' });
window.renderAt = t => { E.placeCamera(camAt(t)); E.setLit(litAt(t)); /* place things */ if (!window.READCHECK) E.render(); };
```
- Importmap `three` → `/node_modules/three/build/three.module.js`, `three/addons/` → `/node_modules/three/examples/jsm/`. Render with `RENDER_GPU=1` (segments.json `"gpu": true`).
- Palettes: `paper`, `base`, `dark`, `ink`, `red`, `blue`, `board` + your own. Tones: `faint lo mid hi lit` (ink edge darkness).
- Arrows draw over solids (`depthTest: false`). `setArrow(a, from, vec)` each frame; set `a.visible = false` to hide.
- Flat strips (paths, dimension lines, a dashed reference): a thin `box(1, 0.012, 1)` scaled and rotated between two points (see `setRibbon` in the reference page). Keep them above any land they cross (the 36 m line first hid under the bank).
- Labels are DOM (`Noto Sans TC`, ≥ 34 px), placed every frame with `E.toScreen(p, 1920, 1080)` from the same world point the drawing uses; mark them `data-read` so `readcheck` sees them.
- Speed: a simple scene is well under 1 s per still; the full 5-minute film rendered in about 1.5 h on 4 cores (three pages in parallel).

## The three tables that drive a page (all pure functions of t)

1. **Camera beats** `CAM = [{t, target, az, el, dist, move}]`: one world for the whole middle; each beat only moves the camera (eased over `move` s). Name shared shots (`WIDE`, `CLOSE`) and reuse them, so the viewer recognises places. A `move` of 0.01 is a cut — only under a key-point card.
2. **What is lit** `LIT = [[t, key]]`: one assembly per narration phrase (`E.setLit(key)`), timed with `T.word()`. Labels of other things drop to ~40 % opacity.
3. **What is shown**: windows `win(t, a, b)` per arrow or label, plus the "explode" moments (one vector sliding tip-to-tail, a vector splitting into components).

## Clocks

- The simulation clock is a function of t: run at a stated rate ("畫面 4 倍速" on screen), **stop while the narration explains a moving thing** (with a "⏸ 時間暫停" badge), then continue.
- Background motion (water chips, particles) uses a clock **integrated** from that rate (sample the rate every 0.01 s, accumulate) so pausing and speeding up never make anything jump.

## Rules learned in experiment 13

- One colour = one quantity for the whole film. A component of the boat's own velocity must not take the water's colour (the silent reviewer read a blue "upstream 1.5" as a second current). Parts of a vector: darker/greyer of the same family, labelled "（船自己的）".
- When a vector is split, hide the whole one (or grey it) — two red arrows on screen cannot be told apart.
- Show cancelling as two equal arrows **side by side, pointing opposite**, labelled "抵掉"; show adding as tip-to-tail. Do them as separate steps.
- Measure a length with a drawn dimension line and ticks, never a floating label; an angle needs its reference line drawn.
- Arrows ride on the moving thing; hide them when it lands, or they leave the frame.
- `readcheck` skips WebGL drawing by itself (no page change needed); give a live counter no `data-read` (only its fixed caption), or every frame counts as a new text.
- Numbers: `model.js` (pure functions) is the only source; `checks.mjs` re-derives every number (formulae, numeric integration, stepped simulation) and exits 1 on failure.
