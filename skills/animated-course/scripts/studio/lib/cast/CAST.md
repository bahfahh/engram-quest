# Cast skins: the contract

A **skin** is the look of one character family: a **cast of three** (teacher, student, embodiment) in one visual language. Teachers (`reference/11-teachers.md`, `teachers.json`) point to a skin by id; swapping a skin changes no script.

**Quality bar**: rounded, refined, friendly; the teacher must look like someone who knows a lot. Rejected looks: boxy glass with a screen face, a flat ink figure with a tiny face, a teacher and student who are the same robot in two sizes (too little difference, too little finish). Teacher and student must differ at a glance by **silhouette + colour identity + role props**. When there is a design image, follow it closely (a version that deliberately departed from its design was rejected); design images live in `assets/cast-designs/` of this skill.

Studio: `scripts/studio` of this skill (Node + headless Chromium + three.js r170).

## What you write
One ES module per skin: `lib/cast/skins/<id>.js`. Write only your own skin file (plus scratch files in your project folder). Never edit `stage.js`, `lab.html`, `hero.html`, this file, or other skins.

```js
export const meta = { id: '<id>', no: '<number>', name: '<Chinese name>', kind: '3d' | '2d', note: '<one line: what the signature does>' };
export async function create(env) { return { teacher, student, embodiment }; }
```
`env = { THREE, K, rng, layer2d }`. You may `import * as THREE from 'three'` and from `'three/addons/...'` (examples/jsm), and `import * as S from '/lib/stage.js'`. No network, no external files: build every texture in code (canvas) and every shape from geometry.

### The three roles (distinct silhouettes, same family)
| role | job in a lesson | size on screen |
|---|---|---|
| `teacher` | explains, points at the real interface | ~400 px tall |
| `student` | owns the project, guesses wrong, reacts | ~300 px |
| `embodiment` | the system or thing being taught, acting it out (e.g. a small drone, a data spark, a coin sprite) — floats or hops | ~180 px |
Each must read clearly at those sizes, on a light blurred UI background, and be told apart by silhouette alone, not only colour.

### Character object
- **3D**: `{ root: THREE.Object3D, height: Number, pose(s), classroomScale? }`. Optional `classroomScale` (default 1): the classroom (`classroom.js`) scales each role to the clay cast's height; a role that is as wide as it is tall (the ink ball) looked bigger than its teacher there, so it can ask for e.g. 0.74. Feet at y = 0, centred on x = 0, facing +z (the camera). `height` = model height at scale 1 (top of head, including antenna etc.). The stage scales and places it, and provides the lights (hemisphere + key from upper-left + fill + rim) and a soft studio `scene.environment` for glossy / metal reflections. Do not add scene lights; emissive materials and additive sprites are fine.
- **2D**: `{ el: HTMLElement, w: Number, height: Number, pose(s) }`. `el` is a box `w × height` px at scale 1 (set its CSS width/height); the feet are at its bottom-centre. Draw with SVG or a `<canvas>` inside it (canvas: size it ~2× for crispness and draw in `pose`). The stage positions `el` with a CSS transform; do not set `el.style.transform` yourself (transform an inner element instead). Anything may overflow the box (arms, effects).

### `pose(s)` — must be a pure function of `s`
Rendering is frame-by-frame and out of order: no `Math.random()` (use `env.rng(seed)` once at creation), no `Date.now()`, no state carried between calls, no CSS transitions/animations, no requestAnimationFrame. **Tolerate missing fields**: start with `s = { t: 0, blink: 0, …all fields below…, state: 'idle', stateK: 0, ...s }` — `stage.js` `adopt()` and `classroom.js` `poseNative` fill missing fields from the same defaults (`POSE_DEFAULTS` in `stage.js`), but other code may call `pose()` directly, and one `undefined` turns a transform into NaN and the character silently vanishes (`debug/issue-2026-11-02-animated-course-skin-pose-partial-fields.md`). A canvas you redraw every pose (an LED face, a painted texture) gets `getContext('2d', { willReadFrequently: true })`: in headless Chromium the GPU canvas sometimes kept only a dirty rectangle of the redraw, leaving a pale blob on the face.
| field | range | meaning |
|---|---|---|
| `t` | seconds | for idle life (breathing, flicker, wave cycle) |
| `blink` | 0–1 | eyes closed amount |
| `lookX`, `lookY` | −1…1 | gaze (+x = viewer's right, +y = up) |
| `talk` | 0–1 | mouth open (or the style's speaking cue) |
| `armL`, `armR` | 0–1 | arm raised (0 down, 1 straight up) |
| `point` | 0–1 | right arm reaches out to the **viewer's right** (towards the UI card) |
| `wave` | 0–1 | right hand waves (use `t` for the cycle) |
| `hop` | 0–1 | body lifted off the ground |
| `squash` | −1…1 | squash (+) / stretch (−) |
| `tilt` | −1…1 | lean (+ = viewer's left) |
| `turn` | −1…1 | yaw (+ = towards viewer's right); 2D may skew/flip or ignore |
| `state`, `stateK` | `'idle'|'think'|'aha'|'doubt'`, 0–1 | drives the face and the **signature** |

### Colour sets (optional: only a change of colours, so it has to look good and actually work)
A skin may offer a few **colour sets** of the same characters, so the learner can pick a colour they like. Same shapes, props, faces and signature; only colours change, and the three roles change **together** (a designed set, not a free colour picker).
```js
export const variants = [ { id: 'classic', name: { 'zh-tw': '…', en: '…' }, swatch: ['#teacher', '#trim', '#student'], col: { /* palette overrides */ } }, … ];  // first = default
export async function create(env, opts = {}) { /* opts.variant = id; unknown or absent → variants[0]; return { …, variant: id } */ }
```
- Keep each set readable: the teacher keeps a **deep** colour block with a trim, the student a **bright warm** accent (they must still differ at a glance); never use the state colours (bright blue think / green aha / orange-red doubt) for a big area; check it against the classroom's green blackboard (a green vest disappeared there, so the robot has grape instead).
- Check every set: hero portrait teacher + student, `lab.html?style=<id>&variant=<set>` (6 poses), one classroom still. Mirror the list in `teachers.json` → `skins[].variants` (`id`, `name`, `swatch`, `portrait`), portraits as `assets/portraits/<teacher>-<set>.jpg`.
- Colour only: render time does not change.
- Example: `skins/glossy-bot.js` (classic navy & gold / wine with a mustard student / grape with a pink student). Palette applied only while building (`Object.assign(COL, set.col)` then restore), because every colour is read at build time.

### The signature is a state light
Every style has one signature element that also shows the state (think / aha / doubt), readable with the sound off — e.g. an antenna lamp changing colour, a wind-up key spinning faster, an ink blot bursting. The face must also change per state (think: eyes up/aside; aha: eyes wide or happy, mouth open; doubt: one brow up / squint).

### Rules
- Not claymation (we already have a clay cast). Faithful to the style named in your brief; polished at 1080p.
- Faces need eyes; talking must be visible; arms or an equivalent must be able to point and wave.
- No professor clichés (round glasses, bow ties, mortarboards, beards). No look-alikes of trademarked characters (LEGO minifigures or studs, Grok's black ball bot, Mario, Pac-Man, Mickey, Pokémon, etc.).
- Performance: 3D — no shadow maps, no transmission/refraction (fake glass with opacity + fresnel/rim), keep each cast under ~40k triangles; 2D — fine to rebuild paths every pose.
  - Measured 2026-11-02 (`lab.html`, 6 s = 180 frames at 1080p30, `RENDER_GPU=1`, 4-core cloud container; old → current look): robot 57 s → 74 s (+30 %, 31.8k → 73.8k triangles, over budget), glass 65 s → 91 s (+40 %, 42.2k → 42.1k), ink 77 s → 91 s (+19 %, 42.5k → 43.4k), capsule 60 s → 68 s (+14 %, 21.7k → 39.6k); owl 59 s; nova (2026-11-03, replaced the capsule) 63 s, 43.0k. **Layers of see-through glass and glow cost more than triangles** (glass v3 has the same triangle count as v2 and is the slowest). In a real lesson the room costs more than the cast: one lesson's classroom opening (2–8 s, same 180 frames) took 300 s with the old robot and 326 s with the current one (+8 %), about 6–7 extra minutes for a lesson with ~98 s of classroom. Modelling is a one-time cost; render cost is paid in every frame a character is on screen.
- Keep the characters' inner proportions stable under `pose` (no stretching faces when arms move).

## How to test (do it; look at the pictures)
```bash
cd scripts/studio
mkdir -p projects/<lab> && cp lib/cast/lab.html lib/cast/hero.html projects/<lab>/
node render.cjs projects/<lab> --scene "lab.html?style=<id>" --stills 0.5,1.5,2.5,3.5,4.5,5.5
# -> projects/<lab>/stills/t-0.5.jpg … (full 1920x1080). Look at them with the Read tool.
# tile the six into one sheet:
ffmpeg -v error -y $(for t in 0.5 1.5 2.5 3.5 4.5 5.5; do echo -n "-i projects/<lab>/stills/t-$t.jpg "; done) \
  -filter_complex "xstack=inputs=6:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0,scale=1920:-1" projects/<lab>/<id>-sheet.jpg
# portrait for the picker card (role=teacher|student|embodiment, pose=idle|think|point|wave|aha|doubt):
node render.cjs projects/<lab> --scene "hero.html?style=<id>&role=teacher&pose=idle&turn=0.35&px=760" --stills 0.5
```
The 6-second lab sequence (`labPoses` in `stage.js`): 0–1 idle · 1–2 teacher talks and points right, others look at the teacher · 2–3 student thinks · 3–4 student aha (arms up, hop) · 4–5 student doubts, embodiment thinks then aha · 5–6 everyone waves, teacher aha. Check every state reads, then do **at least two improvement rounds** on what looks off (proportions, face, materials, silhouette, pointing). Also crop/zoom a full-res still to judge detail. Examples of a good look: `skins/glossy-owl.js` (3D, the user's favourite); built from the user's design images (2026-11-02/03) and accepted as the current looks: `glossy-bot.js` (v2), `glass.js` (v3), `ink.js` (v3), `glossy-nova.js` (v1; it replaced the candy capsule that was designed without an image and called ugly), `porcelain.js` (v3, approved 2026-11-04; teacher ≈ 40.5k triangles, whole cast ≈ 76k — over the budget, render time not yet measured; it replaced the retired ink scholar: the teacher is a hooded cloth spirit built from `shellGeo` (a lathe with a front opening that changes with height), `bandGeo` (cloth bands on a surface), gold `edgeTube` piping, a felt texture with sheen and a canvas face with almond eyes; the embodiment is the porcelain tutor-bot with the LED face `makeWiseFace`). **A look made without a design image has been rejected every time; when there is none, show the user a few directions to pick from before polishing one.** Their helpers are worth copying: `superGeo` with taper, `onSurf`, `holdProp` (a held prop keeps a readable body-relative angle), a canvas LED face, `makeMarks` for "?" / "!" sprites.

## Deliver
- `lib/cast/skins/<id>.js`, its 6-frame sheet and teacher portrait (keep a copy with your experiment records), and a line in `teachers.json` → `skins` (`version`, `look`, `design`, `portrait`). A skin that a registry teacher uses also replaces `assets/portraits/<teacher>.jpg` (hero.html, teacher, idle, `turn=0.3&px=800`, crop x 490–1430, y 75–1015, 640 px). Keep a previous version only with your experiment records, never next to the live skin.
- Report: what the three characters are, what the signature does per state, known weaknesses.

## Using a skin in a scene
`import { makeStage } from '/lib/cast/stage.js'` → `st = await makeStage({ floor: null | '<image>' })` (or `{ transparent: true }` to float the characters over your own DOM page: no background colour, floor or wash); `cast = await (await import('/lib/cast/skins/<id>.js')).create(st.env, { variant: castJson.skin.variant })`; `st.adopt(cast)`; per frame `st.place(cast.teacher, x, y, px, { visible })`, `cast.teacher.pose(s)` (after `adopt`, `s` may leave fields out), then `st.render()`. `card: true` adds a demo UI panel used by the skin test page only; by default there is none. `labPoses(t)` in `stage.js` shows how a pose object is filled.

## Idle life and reactions inside a scene (experiment 20, approved)
Rules: `reference/04-skeleton.md` §2 (Only the change moves; The student reacts at a reveal). How the approved films did it, from the scene, without editing a skin:
- **An idle clock.** Pass the skin a slowed clock instead of `t`: `s.t = TAU(t)`, where `TAU` is a pure, continuous function of `t` that eases to a stop (≈ 0.3 s) inside the windows where the thing to learn changes and runs on outside them. Breathing, antenna sway, lamp flicker and floating marks all read `s.t`, so they hold together. Fade blinks out in the same windows (`blink *= 1 − focus(t)`) so no one freezes half-blinked. Station glows and pulses on the page use the same clock.
- **A take.** Compute the pose the scene would otherwise give at `t`, then blend toward the take: eyes first (0–0.12 s), a small crouch (`squash` +0.2 over 0–0.1 s), then the body snaps into the pose with a slight overshoot (`backOut`) by 0.3 s — turn toward the revealed thing, `lookX`/`lookY` at it, a recoil `tilt`, arms half up, mouth open. Hold with the idle clock stopped and `blink` 0 until the next line, then ease (≈ 0.7 s) into the next state and let the idle clock catch up (≈ 1.5 s) so nothing jumps.
- **Known gaps:** no skin has a `surprise` state yet; the approved take used the `doubt` face with `talk` 0.75 for an open mouth (glossy-bot). A student whose base facing is front-left needed `turn` 1.6 to read as looking at a thing on its right — outside the documented −1…1, accepted by `pose()` on that page; check the stills.

## Cues: hands and eyes go where the words go (`lib/cast/cue.js`)
Rule: `reference/01-principles.md` §2. When the narration names a thing on screen that the viewer must find, the teacher turns, looks and points at it on that word, the student looks too, and the thing lights up (your own highlight, on the same word). Do not hand-code a fixed `lookX` / `point` "while the teacher talks" (that was the old habit, e.g. `point: speaking ? 0.75 : 0.15`): it points at nothing.
```js
import { cueTrack, headOf } from '/lib/cast/cue.js';
const cues = cueTrack(T, [
  { line: 'A05', word: 'budget', target: () => budgetRow },        // DOM element, {x0,y0,x1,y1}, {x,y} or [x,y]; a function is read at t
  { line: 'A07', word: 'learning', target: [1320, 420], point: false },  // look only
]);
cues.check('teacher', { x: 150, y: 930, px: 390, skin: 'glossy-bot' });   // once after building the page: prints placement warnings
window.CUES = cues.report;
// per frame, after the scene has laid out time t and filled its own pose objects (keep their point at 0):
cues.apply('teacher', tp, t, { x: 150, y: 930, px: 390, skin: 'glossy-bot' });   // the same x, y, px as st.place(); skin → arm height
cues.apply('student', sp, t, { x: 1745, y: 940, px: 330 });
// 3D classroom: cues.apply('teacher', tp, t, headOf(cast.teacher, cam, { skin: 'glossy-bot' })); cast.teacher.poseNative(tp)
```
- Timing: the hand lifts ~0.2 s before the word (`lead`), holds to the end of that line (at least 1.2 s; `hold`), eases back. A later cue takes over from an earlier one.
- One cue per thing the viewer must find, not one per sentence. Things that are only mentioned get none.
- **Placement**: every skin's `point` arm goes out horizontally to the viewer's right, so a pointing teacher stands **left of the target**, with the target at arm height. The arm height differs per skin (`ARM` in `cue.js`, measured: glossy-bot 0.43, glossy-owl 0.42, porcelain 0.57, glass 0.48, glossy-nova 0.53, clay 0.26 of the on-screen height): pass `skin: cast.skin.id` in `at` (flat stage) or to `headOf(…, { skin })`. A target to the teacher's left, or whose box the arm's horizontal line does not cross (±12 px; a bare point ±40 px — rows of a list sit 40–80 px apart, so a looser rule lands on the neighbouring row), turns the cue into a look and records a warning (`cues.check`, `cues.warnings`, printed with `console.error` so `render.cjs` shows it). Move the teacher or the target rather than accept it. On flat stages the tip must also land **inside** the target: `REACH` in `cue.js` (glossy-bot 0.63, glass 0.70 of the on-screen height right of the feet x) gives where the stick or hand ends; a target the tip stops short of or passes over turns the cue into a look with a warning. Put what the teacher points at so its left edge sits just left of the tip (≈ 40 px), and draw it below the character (`flat.content`, not `flat.over`) so the tip is visible on it (experiment 21: lessons 2, 3, 6, 7 pointed at blank space with 0 warnings before this check).
- Followers: the student follows the teacher's cues with the eyes and body (`follow`, default `['student']`); a cue with `who: 'student'` moves the student only.
- The clay cast: `makeCast('clay-snackshop')` characters now have `poseNative` (skin fields → clay, `skinToClay` in `classroom.js`; `point` lifts the chopstick arm to the viewer's right) and `height`, so the same cues work for Professor Bao and Taro.
- Test page: `cue-lab.html?style=<skin id | clay-snackshop>` (copy it into a project folder like `lab.html`): four targets — high, low, look-only and one on the wrong side, which must show a warning. Verified with every registry skin and the clay cast.
