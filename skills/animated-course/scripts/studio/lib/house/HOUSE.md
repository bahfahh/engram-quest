# The Engram studio (`lib/house/`) — an option, only when the user asks for it

> **Status (user, 2026-11-10): not the default.** Lessons keep the classroom skeleton (blackboard, 3D course map, blackboard mindmap — `reference/04-skeleton.md`, `lib/classroom/`) and show real pictures in their real look. Use this studio only when the user asks for it; the "when" table in §0 applies only inside such a film.


One studio, two lights. Every film of the series (classroom, course map, middle, key cards, mindmap) is shot in the
same seamless studio; only the lights change. Built in experiment 19 from experiment 18's S1 (light) and S2 (dark)

Demo: `projects/x19-house/` (`scene.html` 3D, `flat.html` DOM) — read it next to this file.

## 0. Choosing the lights (an adapter, chosen per lesson by content)

| mode | when | one line |
|---|---|---|
| **light** `light` (default) | processes, systems, software / AI / data, money, rules, comparisons — lessons with a lot to read and structure to see | a seamless soft-white studio, glossy white props, information on pale-blue holo panels (thin cyan rim) |
| **dark** `dark` | the core of the lesson is *seeing what is normally invisible*: inside an object or a body, particles, energy, signals, pressure, danger, failure; the middle is mostly see-through, cut-open or particles | the same studio with the lights off: deep navy, frosted-glass panels with edge light, cyan / magenta rim lights, floor reflections |
| **lights-off** (a moment) | a light lesson at its see-through / cut-open / particle moment | the room dims to dark over 1–1.5 s, the moment plays, the lights come back. **At most two per lesson, each fully dark ≥ 8 s, lights back on before the key card.** A dark lesson stays dark all the way. |

Classroom, course map, key cards and mindmap follow the lesson's mode (same room, lights on or off).
`lightsAt(t, spans)` gives the lights level; `lintLights(spans, {keycards})` checks the rules (tokens.js).

## 1. What never changes (both modes)

1. **One room shape**: floor → curve → wall seamless cyc, a faint floor reflection, cool contact shadows, a fine floor
   grid, the same light columns (white posts by day; cyan left / magenta right when dark). Camera language: wide ↔ push-in.
2. **One cast, one key light** (upper-left-front, `KEY_DIR`). Only the environment reflection, fill and rims change.
   The cast lives in the room: `room.dress(cast)` (3D) / `makeFlat` (flat) replace makeCast's warm reflection map and
   warm-brown contact shadow with this room's (they gave the cast away in a cool studio, experiment 18).
3. **One set of component shapes**: panel (rounded, 2 px rim, inner hairline, four corner brackets), station chip,
   "?", leader + anchor, selection box (four square handles), round stamp, key card (tab + picture + one sentence),
   mindmap (centre capsule + node cards + S links), progress capsule. Light and dark change only the surface
   (pale holo vs frosted glass). **"Now" is identical in both**: a solid cyan gradient with white text.
4. **One type**: Chinese Noto Sans TC 700 / 800 / 900; numbers and English Inter 700 / 800. No handwriting.
5. **One colour grammar** (each mode tunes lightness so text reads):
   **cyan** = now / normal / the system itself · **amber** = the student's (their question, what their hand touches;
   the only warm colour, small amounts) · **magenta** = stress / warning / broken · **grey** = not yet / unavailable /
   retired · everything else blue-grey.
6. **One prop material**: glossy white shell (rim-lit in the dark); every "machine that thinks" gets a black glossy
   visor with cyan glowing marks (Nico's relatives).

## 2. Tokens (`tokens.js` → `tokens.css`)

`tokens.css` is generated: `node -e "import('./lib/house/tokens.js').then(m => process.stdout.write(m.toCSS()))" > lib/house/tokens.css`.
CSS variables are `--h-<kebab-name>` on `:root` / `[data-house="light"]` and `[data-house="dark"]`.

| token | light | dark | use |
|---|---|---|---|
| wallTop / wallLow / horizon | `#F7F9FB` / `#E8EDF2` / `#DCE3EA` | `#0C1630` / `#1B2F57` / `#2C4A7E` | the cyc (dark is lifted: no black top of frame) |
| floorNear / floorFar / grid | `#DCE2E9` / `#E9EDF1` / `#9EAEC0` | `#0D172C` / `#14223E` / `#3E7FC0` | floor |
| bg | `#EEF2F6` | `#0A1222` | page background |
| shell / shadow | `#F7F9FC` / `#46566C` | `#F7F9FC` / `#01030A` | props / contact shadow |
| panelTop / panelBot | `rgba(246,252,255,.92)` / `rgba(224,243,253,.86)` | `rgba(46,70,118,.74)` / `rgba(14,24,48,.70)` | panel fill (dark is more see-through than S2's chips) |
| edge / edgeTop / hair / bracket | cyan .85 / .95 / .30 / `#16A6DE` | `rgba(120,214,255,.5)` / `rgba(221,246,255,.85)` / .20 / `#36E2FF` | panel rim (top brighter = edge light), hairline, brackets |
| glow / glowRing / drop | cyan .36 / .12 / navy .13 | cyan .24 / .08 / black .5 | outer glow, glow ring, drop shadow |
| tintA / tintB | — | cyan .16 / magenta .13 | dark glass corner tints (top-left / bottom-right) |
| ink / ink2 / ink3 / inkOn | `#14304A` / `#4A6680` / `#7D93A8` / `#FFF` | `#EEF4FF` / `#A9B8D0` / `#7F8DA6` / `#FFF` | text |
| cyan / line / cyanInk | `#46D4FF` / `#16A6DE` / `#0B79AE` | `#36E2FF` / `#5BE0FF` / `#6FEAFF` | glow / lines / cyan text |
| nowA / nowB | `#2FC2F4` / `#139FD8` | same | the "now" fill (identical) |
| amber / amberInk | `#FF9F1C` / `#B25E00` | `#FFB547` / `#FFC266` | the student's |
| magenta / magentaInk | `#E8389F` / `#B8177A` | `#FF4FD8` / `#FF7BE2` | warning |
| grey / greyInk | `#BCCBD8` / `#7D93A8` | `#4E5B72` / `#8A97AD` | not yet |

`SIZE` (px on 1080p): label 34, sub 28, number 36, big number 52, HUD number 76, title 62, key sentence 54,
mindmap centre 50 / node 38, footnote 26. `LINE`: panel 2, hairline 1.5, bracket 3 × 18, leader 3, anchor r 7 / 3.5,
selection 3, handle 14, mindmap link 3.5. `RADIUS`: chip 16, card 18, key 24, board 54 (2048 canvas).
`lerpLook(k)` interpolates every token (text colours switch faster around the middle so text never sits at mid-grey
for long); `applyVars(el, k)` writes them on an element. `loadFonts(text)` loads the house weights for canvas text.

## 3. API

### `room.js` (three.js)
```js
const room = makeRoom({ renderer, scene, camera, mode: 'light', columns /* [[x,z,'#36E2FF'|'#FF4FD8',h],…] | false */, cyc: { back: -17, R: 8 } });
room.dress(cast);            // makeCast() cast → this room's reflections + cool contact shadows (follow the lights)
const sh = room.shadow(w, d, 0.42); sh.position.set(x, 0.004, z);   // a contact shadow for any prop
room.noReflect(obj);         // keep thin lines / glows out of the floor mirror (layer NOREFL)
room.onLights(k => …);       // your own props follow the lights
// every frame (pure of t):
room.lights(k);              // 1 light … 0 dark; every value between looks like a blue-hour room, the lights go off top-down
room.focus(x, z);            // pool of light on the floor (usually the camera target)
room.glow(x, y, s);          // soft glow on the wall behind the subject
room.render();               // mirror pass FIRST, then the frame (never from onBeforeRender — its clip plane leaked, S1)
```
Also exported: `envTexture(k)` (analytic HDR equirect, 9 cached levels — the same map flat pages use), `rigAt(k)`,
`KEY_DIR`, `NOREFL`, `shadowTex()`, `ringTex()`, `haloTex()`. The room sets ACES tone mapping, sRGB output, local
clipping on, clear alpha 0 (needed by the mirror).

### `holo.js` (three.js)
```js
const H = makeHolo(room);
H.panel({ w, h, res: 1024 }).draw(key, (x, W, Hh, L) => …)  // canvas panel; frame drawn for you; redraws only when key or lights change
H.pedestal({ r: 0.8, h: 0.75 }).set('now'|'done'|'later', k) // station: foot, glowing groove, black projector top, floor ring when "now"
H.question({ size }).at(y).set(a, t)        // "?" holo cube (bobs 5 cm)
H.beam({ r0, r1, h }).set(a)                // projection column from a pedestal top
H.shellOf(geo, { tint, a0, a1 }); H.fresnelMat(...)  // Fresnel holo / glass body (supports clipping)
H.edges(geo); H.ring(r)                     // cyan edge lines; thin flat ring (kept out of the mirror)
H.tiles(n, { w, h, d, glow }).setAt(i, p, s, color).commit()   // InstancedMesh: one instance = one unit
H.flight({ from, to, start, dur, lift, size, color }).set(t, a, camera); .landed(t)   // GPU particles, count = arrivals
H.xray(target, { axis }).set(u)             // scan sheet sweeps; behind it solids → glass twins + cyan edges
H.shell(color) / H.SHELL / H.visor() / H.glowMat(c)   // materials: glossy white, black visor, unlit glow
drawFrame(ctx, w, h, look, opts)            // the panel frame on any canvas (boards, cards)
```
In the dark, glows (bands, rings, particles, beams) are boosted and particles switch to additive blending by themselves.
Mark inside parts `userData.xrayInner = true` (they stay solid); `userData.xrayIgnore = true` skips a mesh.

### `ui.js` + `house.css` (DOM, both 3D and flat pages)
```js
const ui = makeUI(rootEl, { mode, camera /* THREE camera or null */ });
ui.lights(k)                                // DOM follows the room
const L = ui.station(2, '投出光點', { sub: '<b>30,000</b>個' }); L.state('now'|'done'|'later');
const C = ui.label(html, { tone: ''|'now'|'done'|'later'|'student'|'warn', id, n });
ui.place(L, anchor /* Vector3 or [x,y] */, { dx, dy, a })   // label + leader + anchor; kept in y 130…930 (never the bottom 140 px)
ui.progress({ brand, title, steps }).set(cur, a)            // progress capsule (the course map in small), every shot
ui.foot(text).set(a)                                         // footnote (sources, "fiction"), never needed reading
ui.selection({tone}).set({x0,y0,x1,y1} | element, a)        // selection box with four square handles; tone 'warn' = magenta (a wrong word/value)
ui.stamp(html, { tone, parent }).set(x, y, k)                // round seal, pressed in from 1.6×
ui.readout({ title }).set({ value, rows, tone }, a, x, y)    // HUD read-out (count it from the particles)
ui.ratio({ title, rows: [{ label, n, tone, value }] }).set(a, fill, x, y)   // proportional card: one cell = one unit
ui.keycard({ fig: svg, say: html, at, until, selAt }).update(t)   // tab + one picture + one sentence (+ .h-sel selection)
ui.mindmap({ center: { text, t }, nodes: [{ text, icon, t }] }).update(t, a)
ui.veil().set(a); ui.wipe().update(t, tCut)                  // dim the room behind a card; scene-change wipe
window.TEXTS = () => ui.TEXTS();                             // readcheck
```
Helpers: `win, sm, prog, clamp, lerp, ease, vis, at, corners()`. CSS classes for your own DOM: `.h-panel` (+ `corners()`),
`.h-surface`, `.h-chip`, `.h-n`, `.h-sel`, `.h-selbox`, `.h-stamp`, `.h-hud`, `.h-ratio`, `.h-key`, `.h-tab`,
`.h-mm-c`, `.h-mm-n`, `.h-foot`, `.h-veil`, `.h-wipe`, `.h-reflect` (floor reflection for DOM blocks standing on the
floor). SVG icon classes that follow the lights: `.h-ic-line`, `.h-ic-fill`, `.h-ic-soft`, `.h-ic-ink`, `.h-ic-shell`,
`.h-ic-visor`, `.h-ic-amber`, `.h-ic-warn`, `.h-ic-grey`. Everything is driven by t (no CSS transitions/animations,
no `filter: blur()`, no `backdrop-filter`).

### `flat.js` (DOM / SVG middles)
```js
const st = await makeStage({ card: false, floor: null });               // lib/cast/stage.js, unchanged
const cast = await (await import('/lib/cast/skins/glossy-bot.js')).create(st.env, { variant: 'classic' }); st.adopt(cast);
const flat = await makeFlat(st, { mode: 'light', columns, focus, glow, camera: { y, z, lookY, fov } });
const ui = makeUI(flat.over, { mode: 'light' });                        // labels and cards above the cast
// your diagram goes in flat.content (below the cast); it gets the token variables too
window.renderAt = t => { flat.lights(k); ui.lights(k); flat.place(cast.student, x, feetY, px); cast.student.pose(s); flat.render(); };
```
The background **is** the 3D room (rendered from a fixed frontal camera into its own canvas, only when the lights
change), so a flat page and a 3D page are visibly the same studio. The cast gets the room's environment, fill and rims,
a cool DOM contact shadow and a faint floor reflection (a flipped, fading copy under the feet). `makeFlat(el)` without
`st` gives just the background and layers.

### `kit-house.css` (lib/kit and keypoint in the house look)
Only in a film the user asked to shoot in this studio. Load after `kit.css`, `keypoint.css`, `house.css`; set
`data-house` on `<html>` (or the element that holds the kit stage). Styles only (kit.js unchanged), and only the
annotation layer: the real-UI mocks (`K.phone`, `ig.*`, `am.*`, `K.toggle`, the Play Store page) keep kit.css's own
colours, shadows and fonts on a `data-house` page, because a real interface stays the real interface — the learner
will meet Meta blue and a white Ads Manager on their own screen, and the studio styles our notes about the thing, not
the thing (`reference/01-principles.md` §1). A mock you build yourself keeps its look as long as it does not sit
inside a callout, the recap or a key-point card. In the annotation layer:
cards and callouts become house panels / chips, `K.highlight` becomes the selection box, the chapter bar takes the
progress-capsule language, title card = studio wall, `K.recap` = a house panel (no note paper, no handwriting),
keypoint card = house panel with a cyan tab. Kit colours are re-mapped by hex: teal / green / blue → cyan line,
orange / amber → amber, red → magenta, neutral → ink. Over a flat background, also set `.k-frame { background: transparent }`.

## 4. Components: look and use

| component | look | use |
|---|---|---|
| panel | rounded, 2 px rim (top brighter), hairline 6 px inside, four corner brackets outside; light = pale holo + cyan glow, dark = navy glass + edge light + cyan/magenta corner tints | boards, cards, read-outs |
| station chip | number badge + name; **now** = solid cyan + sub line (identical in both); **done** = cyan ring badge; **later** = grey + "?" | stations, course map |
| "?" | holo cube, big Inter "?", bobs | a station not reached |
| pedestal | white shell on a foot, glowing groove band (cyan now / done, grey later), black glossy projector top with an emitter ring, floor ring when now | stations, course-map lessons |
| leader + anchor | 3 px line from the label edge, ring anchor r 7 (amber for the student's, magenta for warnings) | labels on 3D or 2D points |
| selection | 3 px line, 14 % cyan fill, four 14 px square handles | "this one" — a word in a sentence or a part on screen |
| stamp | 150 px round seal, dashed inner ring, −12°, pressed from 1.6× | the verdict |
| read-out | panel, small title, 76 px Inter number | a count taken from the particles |
| proportional card | one cell = one unit, cells light up in order | 20 vs 1, 3 of 240 |
| key card | 1440 × 540 panel, solid cyan tab, picture left (SVG with `.h-ic-*`), one sentence right (54 px) | end of a segment |
| mindmap | solid cyan centre capsule, 300 × 226 node cards with a 96 px icon and ≤ 8 characters, 3.5 px S links | end of a lesson |
| wipe | the studio wall slides over with a cyan scan band and brackets (covered ≤ 2 frames) | scene change (replaces S1's half-second white flash) |
| X-ray | a cyan scan sheet sweeps; solid shells turn into glass with cyan edges; the parts inside stay solid | see inside (dark / lights-off) |
| particles | instanced tiles (light) / GPU dots (dark glow), one per unit | flows and counts |

## 5. Camera and text

- Wide shot: fov 34–36, camera 2–2.4 m high, 6–7 m from the stations, stations around y 1.3. Push-in: fov 36–40,
  2–4 m from the subject. Move on a Catmull-Rom path; push in 1.2–1.5 s.
- Text ≥ 28 px when pushed in, key numbers ≥ 36 px; labels stay in y 130…930; the bottom 140 px is for subtitles.
- Reading time: every text block is in `TEXTS` (`ui.TEXTS()`), and the page passes `readcheck.cjs` (the demo
  `scene.html` passes; `flat.html` is a 10 s style sample and does not).

## 6. Render cost (measured 2026-11-05, 1920 × 1080, `RENDER_GPU=1`, 4-core cloud machine, otherwise idle)

| what | s / frame |
|---|---|
| room + Nico + student + 3 pedestals + floor mirror (bench) | 0.53 |
| demo wide shot (3 pedestals, phone, panels, DOM labels) | 0.63 |
| demo dark beat (X-ray glass, 30,000 GPU dots, read-out) | 0.83 (heaviest) |
| demo key card over the room | 0.70 |
| flat page + makeStage student (background re-rendered during a lights change) | ≈ 0.35 |
| **whole demo `sample.mp4`** (34.8 s, 1044 frames, 682 s; 0–10 s 0.63 · 10–20 s 0.70 · 20–30 s 0.67 · 30–34.8 s 0.57) | **0.65** |
| **whole `flat.mp4`** (10 s, 300 frames, 111 s) | **0.37** |
| for comparison: x18 S1 heaviest 2 s / S2 particles 2 s, same idle machine | 0.68 / 0.65 |

Targets were ≤ 1.2 (3D room + two characters) and ≤ 0.6 (flat + character). With other renders on the machine
expect 2–3× (experiment 18). Cheap by design: no shadow maps, no transmission, no clearcoat on large areas, a
512 × 288 mirror without MSAA, holo and glass unlit, canvases redraw only when their key changes, particles on the GPU.

## 7. Known limits

- Lights change continuously, but each environment level is cached (9 levels) and panels redraw on 12 levels:
  during the 1.2 s transition the cast's reflections step ~8 times (not visible in the demo).
- The X-ray sheet is a plane: sweep across the camera's view (e.g. top → bottom) — a sheet seen face-on reads as a slab.
- `xray()` clones the target's materials and adds glass twins: call it once, after the target is built.
- DOM key cards and mindmaps have no perspective (they float above the room); boards in 3D use `H.panel`.
- flat.js reflections copy the cast canvas each frame (cheap); DOM panels reflect only with `.h-reflect`.
- 30,000 dots on one head saturate into a glowing surface: good for "a mesh of light", not for counting by eye —
  the read-out carries the number.

## 8. Classroom, course map, mindmap (the head and tail of a lesson; experiment 19, K)

Example: `projects/x19-room/classroom.html` (lesson 6 of AI Engineering, `?mode=light|dark`; content and timing
unchanged from experiment 17). Four new files; nothing else in `lib/house/` was changed.

| file | what |
|---|---|
| `classroom.js` | `makeClassroom({ renderer, scene, camera, mode, skin, variant, teacherAt, studentAt, extraColumns })` → the studio (makeRoom + makeHolo), the **board** (4.6 × 2.4 m `H.panel`, canvas 2048 × 1069, light = holo / dark = frosted glass) floating over a white projector plinth with a light sheet and a halo, the cast (`makeCast` + `room.dress`), and the camera rig `cams` {W, CS, BC, BFULL, `boardAt(bx, by, dist)`, `push(from, to, k)`}. `board.toWorld / toScreen / boxToScreen` convert board px (for TEXTS and anchors). |
| `board.js` | `makeBoard(panel)`: typeset board content on the narration's words — `text`, `chip` (tones now / done / later / student / warn / accent), `sel` (selection box), `line` / `arrow`, `box`, `card`, `stamp`, `custom`, `phase(until, fn)`; each element `(…, t0)` with `o.dur`, `o.until`, `o.read` (readcheck id). `update(t)` redraws the panel only when a quantised state changed; `texts(t)` gives readable blocks in board px. Also exports the canvas drawing helpers (`drawChip`, `drawSel`, `textOn`, `strokeOn`, `arrowHead`, `fontOf`, `measure`). |
| `coursemap.js` | `makeCourseMap({ room, H, ui, camera, lessons, lesson, at, t0, times, question })`: one pedestal per lesson, a holo mini picture above it (`pic(c, L, u)` draws the lesson's mechanism; u = one run), a station chip (`ui.station`) per lesson; states done / now / later (later = the picture in grey + "?" on the chip). Two rows when > 5 lessons (1–4 front, 5–8 back, raised and 12 % bigger), chips of the back row above the pictures and of the front row below the pedestals. `times`: `review` (learned lessons light up and play once), `say` (each learned lesson's chip glows as the narration names it), `preview` ([t per lesson n, null to skip]: any lesson's chip glows and its grey picture brightens on its word — for lesson 1, whose map names lessons not learned yet), `arrive` (push 1.1 s to this lesson; the others dim to 22 %, their chips hide), `play` ([[t, u], …] this lesson's run keyed to the words), `ask` / `end` (question card: cyan tab 「第 N 課 · name」 + the question, warns if shorter than its reading time). `cam(t)`, `update(t)`, `on(t)`, `glyphs()`. Chips and the card are DOM with `data-read` (so `ui.TEXTS()` reports them). |
| `coursemap-ops.js` | Course data for the 8 lessons of `azure-ops-2026` (experiment 21; SERIES appendix) — two rows of four (coursemap.js does this for > 5 lessons). Pictures: 1 容量 (a crowd of 60 dots, a few light up and walk through the door; 30 worker cells fill, the overflow spills magenta) · 2 擴展與部署 (load rises, two machines grow; staging / prod swap) · 3 網域與憑證 (lock on the address bar; validity 200 → 100 → 47 days; the renew arrow refills it) · 4 身分與權限 (three keys — team amber, code cyan, users blue-grey — into three doors; Owner keys 4 → 3) · 5 網路與防護 (requests hit the shield, magenta bounce, cyan pass; the database moves inside the wall) · 6 看得見 (one request, a magnifier follows it, ×21 round trips to the database) · 7 告警與值班 (line over the threshold → bell → a cursor walks back the timeline to the ⇄ swap cell, magenta pin) · 8 SLO 與檢討 (the error-budget bar bitten magenta; a loop arrow back to a 「1」 chip). Name chips read at ≈ 34 px in the wide shot. Demo `projects/ops-map-demo/` (`scene.html?lesson=N`, `?gallery=1&lesson=8`; `pics.html?big=N` = one picture at u 0.2 / 0.45 / 0.7 / 1); stills `stills/part-1…8.jpg`, `overview-all-playing.jpg`, `l1-t6.1.jpg` (lesson 1 preview lighting lesson 4), `l1-t16.jpg`, `l3-` / `l6-close-question.jpg`; readcheck passes for lessons 1 and 6. Lesson 1 pattern: `times: { preview: [null, t2, …, t8], arrive, play, ask, end }`. |
| `coursemap-aieng.js` | Course data for the 8 AI Engineering lessons (names as `lib/classroom/coursemap-aieng.js`; pictures: code card vs learned curve, two targets, error bins, net and pool 3/4 3/5, eval booklet, the conveyor with dedup gate / piles levelled / v1.1 stamp, drifting hill and coins, error budget). Another course = another data file of the same shape. |
| `mindmap.js` | `makeMindmap(board, spec)`: **the same data format and layouts as `lib/classroom/mindmap.js`** (radial / tree / flow / compare; center, nodes with icon / photo / doodle, `pic`, `pos`, `edge` {label, style, from, t}, extra `edges`, `mm.add(el.…)`, `mm.point`, lint) drawn in the house look: centre = solid cyan capsule, nodes with a picture = small house panels, nodes without one = chips, links = smooth lines with an anchor dot (S-links from a radial centre), arrows for flow / tree, edge labels = small chips. New: `divider` (`true` = vertical, compare default; `{y}` / `{x}` / `{pts}`, plus `t`), node `tone`, `picScale`, `typeScale` (chalk sizes × 0.86). Chalk colour names map to the grammar: white → blue-grey, yellow / teal / blue / green → cyan, pink / red → magenta, orange → amber, grey → grey. Doodles use the same recorder API (`d.rect`, `d.line`, `d.arrow`, `d.text`, `d.hatch` …), drawn crisp. `mm.texts(t)` gives readable blocks (board px). |

How the lesson-6 page uses them (a recipe for any lesson):
- **Head**: W (teacher left, board, student right; name chips «Nico» / «AI 工程師» in amber) → CS on the student's wrong
  guess → push to BC; board elements appear on the words (task, grid of 50, tally with proportional bars, the zero row
  selected in magenta, the one-liner with its three properties as chips) → `ui.wipe` into the course map (it stands in
  the same studio at x = 24) → review, push to lesson 6, the conveyor plays on M03's words, question card → `ui.wipe`
  back to BC → one-liner → O10: everything but the stack fades, the stack is selected, the camera pushes into it
  (`cams.push(BC, cams.boardAt(…))`) → `ui.wipe` at tHand (the middle opens with the same wipe).
- **Tail**: `ui.wipe` opens at tOut onto the board (no text in the first 0.5 s), the mindmap builds on E01–E08
  (flow = the conveyor, properties as chips with brackets, a divider, «明天» chips in amber = the learner's action,
  «下一課» as a grey «later» chip), W for the student's question, back to BC; the last frame is the finished board.
- Modes: `?mode=light|dark` only changes `room.lights(k)` / `ui.lights(k)`; boards, pictures and chips redraw with
  `lerpLook(k)`. The wipes at tHand / tOut are `ui.wipe().update(t, tCut)` with the page's lights, so both sides of a
  seam are identical when the middle uses the same mode.
- Seams and TEXTS: report board blocks with `board.boxToScreen` while the board is in view; stop reporting them
  0.25 s before tHand. readcheck: head 0–49.43 and tail 254.93–282.47 pass.

Render cost (lesson 6, full resolution, three renders sharing the machine): head 1.13–1.20 s / frame, tail 1.05–1.29;
on a quieter machine the board close-up is 0.35 and the course-map review (five pictures playing) 1.43 (the heaviest).

Limits: the course-map panels redraw a 1024 canvas per playing lesson per frame (≈ 1 s extra per frame while five
play at once, ≈ 3 s of the review); the question card is placed from the close-up camera, so keep the camera still
while it shows; the board has no perspective-correct DOM (everything on it is canvas, so it is fine in W shots too).
- Shadows (contact discs) created after the first `room.lights(k)` call do not follow later light changes: build every
  object before the first frame, or call `room.lights(k)` again after adding one (experiment 19 B).
- `xray()` gives no clipping plane for the sweep; a page that needs a hard cut builds its own `clippingPlanes` (B did).
- Many category colours (six data types) conflict with "everything else is blue-grey": keep categories as tints of the
  cyan/blue-grey family plus at most one magenta, or label them; small particles cannot carry six hues (experiment 19 A, B).
- Candidates to move into `lib/house/` (written in the experiment 19 projects, `研究/實驗19-…/各片/`):
  `isostudio.js` (the studio as the backdrop of an isometric world, the cast on the same iso camera) and `iso.js`
  (white-shell and glass iso materials that follow the lights) from x19-a-light; card-face labels, a term strip, a
  key-sentence banner, fixed-position and multi-anchor `place`, a sized round stamp and an FXAA finish (≈ 20 % cheaper
  than MSAA) from x19-b-dark.

Note: `.h-chip` is `visibility: hidden` until `vis()` shows it (free-floating chips). A chip placed **inside** an `.h-panel` / `.h-surface` inherits the card's visibility instead (experiment 20: chips inside cards never showed).
