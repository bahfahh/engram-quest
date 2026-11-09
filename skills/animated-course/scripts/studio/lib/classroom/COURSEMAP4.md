# Course map, version 4 `coursemap4.js`

> **Scope.** The course map's job — recall what was already learned, show where this lesson sits in the whole course, and raise this lesson's question — is part of every course's skeleton. This particular 13-part tabletop model is **AdsDemo-specific** (AdsDemo Meta Ads Playbook). For another course, build a new model with the same API shape (`makeCourseMap4`-style options, `update(t, cam)` / `cam(t)` / `applyCam`, `times`, `shot: 'ride' | 'finale' | 'overview'`). Older map versions are not included.
>
> **Status: needs rework.** User feedback 2026-11-01: map shots are too fast, the camera is too close, and overall recognizability is too low. Visibility rules for any map (this one or a new one):
> - Each part / group the viewer must look at holds **2–3 s** on screen.
> - Either the **whole table is in frame**, or the camera **pushes in on one part with the others dimmed** — nothing in between.
> - Light **one group at a time**.
> - Simple silhouettes; drop details that are unreadable when small.
> - Labels must be readable **at the current camera distance**.
>
> The current defaults break some of these (e.g. the ride stops about 1 s at the auction, overview text on parts is 15–25px). Treat the timings below as the current behaviour, not as recommendations.

## What it shows

A display table stands where the classroom's lectern table is; on it sits a clay model. Each lesson = one part. A part in motion acts out the mechanism that lesson teaches ("standee test": with narration muted you can still see the mechanism, not just recognize the topic).

- **Learned parts**: coloured, looping their own mechanism.
- **This lesson's part**: grey clay at first, with a large question sign above it (cap height ≥ 100px); at `colorIn` it colours in and starts acting from the beginning.
- **Not-yet-learned parts**: grey, still, silhouette recognizable, grey name plate.
- Taro (the student) pushes a card along the path and stops beside this lesson's part.

## 1. Usage

```js
import { makeCourseMap4 } from '/lib/classroom/coursemap4.js';

const map = await makeCourseMap4({ lesson: 10, t0: 2.0, question: '每天要看哪幾格？' });   // async: waits for the rounded font. "Which cells do I check daily?"
scene.add(map.root);

window.renderAt = (t) => {
  const onMap = t >= map.times.start && t < map.times.end + 0.5;
  map.root.visible = onMap;                       // skip work when off screen
  if (onMap) { map.applyCam(cam, t); map.update(t, cam); }   // update must come after the camera is set (name plates face the camera)
  else { /* your own camera */ }
  renderer.render(scene, cam);
};
```
`map.update(t, cam)`, `map.cam(t)` and `map.applyCam(cam, t)` are all **pure functions of t**: any time, any order, same frame.

### Parameters `makeCourseMap4(o)`

| Parameter | Default | Description |
|---|---|---|
| `lesson` | required | This lesson, 1–13 |
| `t0` | `0` | Second at which the map segment starts |
| `shot` | `'ride'` | `'ride'` opening / `'finale'` ending pull-back / `'overview'` wide (section 2) |
| `question` | `''` | Question-sign text (`ride`). About 12 Chinese characters per line max; separate two lines with `'\n'`, e.g. `'A 和 B 怎麼比\n才說得出原因？'`. A tag "第 N 課 · part name" (Lesson N · part name) is added above the sign automatically |
| `times` | auto | Sync to narration, **absolute seconds**: `ride` uses `{ arrive, colorIn, end }`; `finale` / `overview` use `{ end }`. See section 3 |
| `stops` | auto | Learned parts the `ride` stops at (array of lesson numbers, in path order), e.g. `[9, 1, 2]`. Defaults in section 2 |
| `card` | `'A'` | The card Taro pushes: `'A'` teal / `'B'` orange |
| `parts` | `{}` | Per-part text and state (AdsDemo section) |
| `allLit` | `true` for `overview` on lesson 13 | All parts coloured and moving |
| `loopDur` | `10` | `overview` + `allLit`: seconds for the card to run one loop |
| `camFrom` | none | `{pos, look, fov}` (world `THREE.Vector3`): blend smoothly from your camera (e.g. the classroom wide shot) into the map camera starting at `t0` |
| `camBlend` | `1.2` | Duration of that blend, seconds |
| `place` | `{x:0.1, y:0, z:-0.55, rotY:0, scale:1}` | Where the map table goes (replaces the low table by default) |
| `table` | `true` | `false`: no display table, the clay board sits directly at `place.y` |
| `lang` | `'zh'` | `'en'` for English labels; see `EN.md` |

**In `overview` / `finale` every part rests in its "after you learned it" correct state**, never in a bad state of its loop (see the AdsDemo section for what that means per part). Parts that act out facts (viewers dropping off, data being blocked) play as usual.

### Return value

| Name | Description |
|---|---|
| `root` | Group to add to the scene |
| `update(t, cam)` | Poses everything for second t |
| `cam(t)` / `applyCam(cam, t)` | Default camera (world `{pos, look, fov}`) / apply it directly to your `PerspectiveCamera` |
| `times` | `{ start, ride:[run start, arrival], stops:[{n, t}], arrive, colorIn, end, pass:{lesson: second the card passes it} }` |
| `stops` | The parts actually stopped at |
| `cams.overview()`, `cams.part(n)`, `cams.pass(n)`, `cams.track(u)` | Fixed setups: wide; close-up of part n (for this lesson includes the question sign and Taro); medium shot as the card passes (for the auction, a close-up where the three columns are readable); tracking along the path |
| `partWorld(n)` | World position of part n on the table (add your own effects, have Professor Bao point at it) |
| `yuan`, `parts`, `land` | Small Taro, the parts, the clay board (normally leave alone) |

## 2. Default camera and duration

| `shot` | Camera | Length |
|---|---|---|
| `'ride'` (opening) | Wide (whole loop visible, which parts are lit) → follow Taro's card past learned parts, pausing at `stops` to watch them act (auction pause about 1 s, close enough to see three columns) → stop at this lesson's part: question sign pops up (part still grey) → `colorIn`: colour in, act from the start → slow push-in | 8–9 s (AdsDemo table below) |
| `'finale'` (ending) | This lesson's part already coloured and running; camera pulls back from its close-up to the wide shot | 4 s default (change with `times.end`; 3–5 s recommended) |
| `'overview'` | Wide. With `allLit` (lesson 13): the whole system runs, one card leaves the first part and runs a full loop, each part acts once as the card passes; camera slowly pushes in and back out | Lesson 13: `loopDur` + 1.8 s (default 11.8 s); other lessons 4 s |

**Default stops**: the previous lesson's part (if no more than 3.7 m back along the path), the auction (the core of the whole course, always stopped at), and the nearest learned part before this lesson's part. Parts in between are not stopped at but act once as the card passes.

Exact numbers: `console.log(JSON.stringify(map.times))`.

## 3. Syncing to narration

```js
const tQ = T.word('O03', '今天');                       // the moment the question sign appears ("today")
const map = await makeCourseMap4({ lesson: 10, t0: Ls('O02'), question: '每天要看哪幾格？',
  times: { arrive: tQ, colorIn: T.word('O04', '漏斗'), end: Le('O04') + 0.4 } });   // '漏斗' = "funnel"
```
- With `arrive` given, the run is scheduled backwards so the card stops exactly at `arrive`. The wide shot keeps at least 0.7 s; if time is short the whole run speeds up (down to 0.45× duration).
- If `arrive` is much later than the default, the wide shot holds at most about 2 s and the card runs slower for the rest (up to 1.8× duration).
- `colorIn` defaults to `arrive + 1.3` (the question sits on the grey part for 1.3 s); `end` defaults to `colorIn + 2.1`.

### 3.1 Handoff to a DOM page

The course switches to the DOM page at the map's `times.end`, and **the DOM page's first frame is a texture of the map's last frame**. So:
- Set `times.end` to the handoff second.
- The map camera settles 0.5 s before `end` (the push-in ends at `end − 0.5`; the last 0.5 s the camera does not move), so the texture matches. Parts keep acting; to freeze the frame entirely, use a still at about `end − 0.25` as the texture.
- Render the handoff frame as a full-resolution still: `RENDER_GPU=1 node render.cjs <project> --scene classroom.html --stills <end>`.

## 4. Blending in from the classroom and back out

```js
const WIDE = { pos: new THREE.Vector3(0.1, 1.62, 6.3), look: new THREE.Vector3(0, 1.0, -1.0), fov: 32 };
const map = await makeCourseMap4({ lesson: 8, t0: 0.6, camFrom: WIDE, camBlend: 1.2, question: '這支片拍得好不好？' });  // "Is this clip well made?"
// blend back to your camera:
const k = S.ease.inOut(S.prog(t, map.times.end, map.times.end + 1.0));
const a = map.cam(t), b = myCam(t);
cam.position.copy(a.pos).lerp(b.pos, k); cam.fov = S.lerp(a.fov, b.fov, k); cam.updateProjectionMatrix(); cam.lookAt(a.look.clone().lerp(b.look, k));
```
- The map table is 2.74 × 1.46 m and replaces the low table (do not add `C.makeLowTable()` when the opening uses the map). Professor Bao at `(-2.25, 0, -0.7)` and Taro at `(2.1, 0, 0.05)` do not collide with it.
- After the camera pushes in on the map, hide the full-size Professor Bao and Taro (the example below hides them from `map.times.start + 0.7`).

## 5. Render cost (seconds per frame)

Classroom pages always use `RENDER_GPU=1`. 1920×1080, SwiftShader, classroom + map (full-size cast hidden), machine load about 4:

| | per frame |
|---|---|
| `ride` tracking, close-ups | about 1.7 s |
| Wide (all 13 parts in frame) | about 1.9 s |
| First frame (browser start, shader compile, name-plate textures) | about 7 s extra |

Already optimized: each part's static clay is merged by colour into a few meshes; only the clay board and path receive key-light shadows; the viewer grid and decision grid textures redraw only when their content changes. Set `map.root.visible = false` when the map is off screen.

## 6. Complete classroom.html example (lesson 10 opening)

```html
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/node_modules/@fontsource/chiron-goround-tc/700.css">
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';
import { makeCourseMap4 } from '/lib/classroom/coursemap4.js';

const T = await S.loadTimeline(); window.DURATION = T.duration;
const Ls = id => T.line(id).start, Le = id => T.line(id).end;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9c9a6');
const cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 60); scene.add(cam);
const vignette = C.makeVignette(cam, 0.3);
scene.add(new THREE.HemisphereLight('#fff1dc', '#b9825a', 1.25));
const key = new THREE.DirectionalLight('#ffe0b8', 2.4); key.position.set(-4.5, 7, 6.5); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 4.5, bottom: -2.5, near: 1, far: 25 });
key.shadow.bias = -0.0012; key.shadow.normalBias = 0.045; key.target.position.set(0, 0.6, -0.8); scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#d6e4ff', 0.45); fill.position.set(6, 3, 3); scene.add(fill);
const rim = new THREE.DirectionalLight('#ffd2a0', 0.7); rim.position.set(2, 5, -6); scene.add(rim);

scene.add(C.makeClassroom());
const board = C.makeBoard(); board.g.position.set(0, 1.85, -2.36); scene.add(board.g);
const teacher = C.makeTeacher(); teacher.root.position.set(-2.25, 0, -0.7); scene.add(teacher.root);
const student = C.makeStudent(); student.root.position.set(2.1, 0, 0.05); scene.add(student.root);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WIDE = { pos: V(0.1, 1.62, 6.3), look: V(0, 1.0, -1.0), fov: 32 };
const map = await makeCourseMap4({ lesson: 10, t0: Ls('O02'), camFrom: WIDE, camBlend: 1.2,
  question: '每天要看哪幾格？',
  times: { arrive: T.word('O03', '今天'), end: Le('O03') + 0.4 } });          // your narration
scene.add(map.root);

window.renderAt = (t) => {
  const onMap = t >= map.times.start && t < map.times.end;
  map.root.visible = onMap;
  if (onMap) { map.applyCam(cam, t); map.update(t, cam); }
  else { cam.position.copy(WIDE.pos); cam.fov = WIDE.fov; cam.updateProjectionMatrix(); cam.lookAt(WIDE.look); }
  vignette.userData.fit(cam);
  teacher.root.visible = student.root.visible = !onMap || t < map.times.start + 0.7;   // hide the full-size cast after the push-in
  teacher.pose({ t, mouth: S.mouth(T, 'teacher', t), turn: 0.5, stick: !onMap });
  student.pose({ mouth: S.mouth(T, 'student', t), turn: -0.6 });
  renderer.render(scene, cam);
};
window.studioReady = Promise.resolve();
</script></body></html>
```

## 7. Known limitations

- The first frame costs about 7 s extra (in chunked cloud rendering, every chunk pays it once).
- In the wide shot, small text on parts is only about 15–25px and needs a push-in to read; the wide shot only conveys "which parts are lit, what connects to what". (Conflicts with the visibility rules above.)
- When `ride` starts from the previous lesson's part (lessons 8 and 12), it quickly passes a few still-grey parts (about 1 s), meaning "loop back to the front of the course". Give `stops` yourself to avoid it.
- The question sign fits about 12 Chinese characters per line and shrinks beyond that; for longer text split into two lines with `'\n'`.
- Name plates rotate only about the vertical axis to face the camera; seen from directly above they flatten.
- Small Taro does not talk (no lip sync); he only pushes the card and raises a hand on arrival.
- No sound effects: if wanted, add a small "pop" at `times.arrive` (question sign) and `times.colorIn` (colour-in).
- The API only grows; published parameters and return values do not change.

---

## AdsDemo course example (replace for your course)

Everything in this section is specific to the AdsDemo Meta Ads Playbook model: **the path one ad and NT$3,000 actually travel**. 13 lessons = 13 parts arranged in a loop. Taro pushes an AdsDemo ad card (default teal A, `card: 'B'` for orange).

### Layout: what connects to what

```
 Back row (left → right):  8 Workbench → 9 Test bench → (4 Tap behind the 5 Fences, Y-split into two streams into A and B) → 6 Ad cards inside the fences → 7 Policy gate → 1 Auction (audience + phone)
 Right end:                3 Fork (lit path to the app store, grey path to a web form)
 Front row (right → left): 2 Return pipes (Android / iOS; ATT gate at the iOS inlet) → 10 Dashboard (five gates) → 11 Decision lever → 13 Scaling valve → back to 8
 Inside the loop:          12 Retargeting pools (beside the audience, thin purple pipe back to the fences), 13's newly grown fence (purple)
 13 → 4:                   a faint grey thin pipe along the table surface back to the tap
```
Arrows on the path (clockwise). Name plates always sit outside the loop: back row on poles behind the parts, front row in front of them. In the wide shot plate text is about 36–44px high; when the camera pushes in, other parts' plates shrink.

### What each part acts out

Zh name plates are listed with an English gloss; English mode labels are in `EN.md`.

| Lesson | Part (plate) | What it acts out (one loop) |
|---|---|---|
| 1 | 拍賣台 Auction | In front of an audience (adult dots + phone), three cards each with a column: gold coin stack (bid) + blue (estimated action rate) + green (creative quality). Columns grow → the pink card has the most gold but the lowest total; the AdsDemo teal card is tallest, a crown pops up → the teal card flies into the empty feed slot on the phone. 3.2 s |
| 2 | 回流管 Return pipes | Two open channels from the app store back to the dashboard. Android: white dots flow on time. iOS: a red ATT gate at the inlet blocks two of three dots (they fall out); those that pass merge into a blurry cloud that moves slowly, with a small clock beside it (late) |
| 3 | 岔路 Fork | Person dots walk to the fork and into the lit app-download icon; the web-form path stays grey |
| 4 | 水龍頭 Budget tap | NT$3,000 coin pile → tap (hanging sign 「買：安裝」 "Buy: Installs") → water Y-splits into two equally thick streams, one into fence A, one into fence B; droplets flow on both at equal spacing and speed |
| 5 | 圍欄 Ad set fences | A teal, B orange; solid fence = hard limit; white dashed circle in the middle = starting point. Person dots colour in from the circle outward, ring by ring (the system searches outward from the seed) |
| 6 | 廣告卡 Ads | Three 9:16 cards per fence; A and B differ only in the card's line (colour); cards sway gently |
| 7 | 政策關卡 Policy gate | A red "you + attribute" card hits the gate → light red → bounces back and falls; the rewritten green card passes → light green. 3 s |
| 8 | 工作台 Workbench (= lesson 8 review desk) | Hook (purple #7C5CD6) / Body (blue #2B8FD6) / CTA (magenta #C2338A) blocks fly in and join into a film strip → red playhead runs across (slower over Hook) → 100 viewer cells above go dark accordingly (orange = still watching, light grey #CBCFD5 = scrolled away). Counts follow lesson 8: 100 → at 3 s (end of Hook) 30 left → at 15 s 10 left. After the playhead passes Hook, red 「剩 30」 ("30 left") appears below Hook; at the end 「剩 10」 ("10 left") (`parts[8].counts: 'none'` darkens only, no numbers). 4.4 s |
| 9 | 測試台 Test bench (= season fast-forward) | Two phones side by side: top Hook, middle "Message" (A teal / B orange), bottom CTA; only the middle block differs, a red "≠" between. The message block pulses, both phones slide right into the system; the tracking sheet beside grows a row per round. 4 s |
| 10 | 儀表板 Dashboard (= report development) | Orange B-group person dots leave the phone feed and pass five gates: 3-sec view rate → link CTR → install rate → activation rate → D7 retention (header plates on the gates). Where a dot drops off, it turns light grey in front of that gate and piles up (bigger pile = bigger leak); fewer dots further right. Gate colours: green = normal, red = first abnormal gate (read left to right, fix only the first red one), grey = right of the red gate, ignored for now. Default: gate 1 (3-sec view rate) red; change with `parts[10].redGate` |
| 11 | 決策桿 Decision lever (= shape of the red) | Small grid: rows = A, B; columns = three traffic sources; each cell a five-segment mini funnel. The red area goes one cell → one column → the D7 segment of every cell → whole grid, and the matching one of four level words 「素材／渠道／產品／定位」 (Creative / Channel / Product / Positioning) lights red; the lever moves to 「停」 (Stop). Changes every 2 s. After it is learned (lessons 12, 13, and all `overview` / `finale`) it rests on the verdict: row B all green, lever on 「加碼」 (Scale) (`parts[11].state`) |
| 12 | 回頭池 Retargeting pools (= system sandbox) | Three pools: 互動受眾 (engaged audience), 網頁訪客 (website visitors), App 安裝者 (app installers). Person dots drop in one by one and the pools fill; each dot stays about 4 s then shrinks away (old ones fade). Thin purple pipe from the pools back to the fences |
| 13 | 放大閥 Scaling valve | Red handwheel turns notch by notch along a scale (opening the tap = vertical scaling); a third purple fence grows beside the valve (horizontal scaling); a 6-step price staircase, steeper to the right: B-group people line up by "cost per install", a green budget line climbs step by step, the top two steps are dark orange (pricier people); a bid knob |

Correct resting state in `overview` / `finale` (also lesson 13's full-course `overview`): decision lever = row B all green, lever on Scale; dashboard = all five gates green; policy gate = the rewritten card keeps passing (green light), the "you + attribute" card lies outside and no longer hits the gate.

### Part text and state `parts`

| Key | Default | Description |
|---|---|---|
| `parts[8].viewers` | `100` | Number of viewer cells |
| `parts[8].keep` | `[1, 0.30, 0.14, 0.10]` | Share still watching at start / after Hook / after Body / after CTA ("30 left", "10 left" come from the 2nd and 4th values) |
| `parts[8].counts` | `'left'` | `'left'` = write "剩 N" (N left); `'none'` = no numbers, darken only |
| `parts[8].on`, `.off` | `'#F2780C'`, `'#CBCFD5'` | Still-watching / scrolled-away colours |
| `parts[9].labels` | `['Hook', '訊息 A', '訊息 B', 'CTA']` | Text on the two test-bench phones (top, A middle, B middle, bottom); 訊息 = "Message" |
| `parts[10].redGate` | `1` for `ride`; `0` for `overview` / `finale` | Which gate is red (1–5; `0` = all green). Left of it green, right of it grey (ignored); most dots drop at the red gate. For a `finale` that keeps the red gate, pass `redGate: 1` |
| `parts[10].labels` | `[['3 秒','觀看率'], ['連結','點擊率'], ['安裝率'], ['啟用率'], ['D7','留存']]` | Five gate headers, one or two lines each (3-sec view rate, link CTR, install rate, activation rate, D7 retention) |
| `parts[11].levels` | `['素材', '渠道', '產品', '定位']` | Four level words (Creative, Channel, Product, Positioning) |
| `parts[11].state` | `'cycle'` for `ride`; `'scale'` for `overview` / `finale` and lessons 12, 13 | `'cycle'` = loop through the four red shapes (cell → column → D7 row → whole grid), lever to Stop; `'scale'` = verdict after learning: row A fades, **row B all green, lever resting on Scale**, no loop. Lesson 11's `finale` uses `'scale'` (the default) |
| `parts[11].lever` | none | Legacy, still works: `'停'` (Stop) / `'續'` (Keep) = fixed on that slot; `'加碼'` (Scale) = same as `state: 'scale'` |
| `parts[12].pools` | `['互動受眾', '網頁訪客', 'App 安裝者']` | The three pool names |
| `parts[13].steps` | `6` | Number of price-staircase steps |

Example: `makeCourseMap4({ lesson: 13, card: 'B', parts: { 10: { redGate: 0 } } })`.

### Per-lesson default ride timing

`t0 = 0`, no `camFrom` (with `camFrom` everything shifts about 0.9 s later). Defaults are documented for lessons 8–13 only.

| Lesson | Stops | Wide | `arrive` | `colorIn` | `end` |
|---|---|---|---|---|---|
| 8 | 7 Policy → 1 Auction → 2 Return pipes (then quickly past the still-grey 10, 11, 13 back to the workbench) | 0–1.4 | 5.41 | 6.71 | 8.81 |
| 9 | 1 Auction → 8 Workbench | 0–1.4 | 4.83 | 6.13 | 8.23 |
| 10 | 9 Test bench → 1 Auction → 2 Return pipes | 0–1.4 | 5.08 | 6.38 | 8.48 |
| 11 | 1 Auction → 10 Dashboard | 0–1.8 | 4.60 | 5.90 | 8.00 |
| 12 | 11 Decision lever → 1 Auction (passing workbench, test bench, tap, fences) | 0–1.4 | 4.65 | 5.95 | 8.05 |
| 13 | 1 Auction → 12 Retargeting pools → 11 Decision lever | 0–1.4 | 4.97 | 6.27 | 8.37 |

Timing notes:
- Lesson 8's darkening needs about 1.3 s after `colorIn` to reach "30 left", so give `end` at least `colorIn + 1.6` ("10 left" appears at `colorIn + 2.6`).
- Lesson 13's ending: `shot: 'overview'` (automatically `allLit`) runs one loop; or `shot: 'finale'` pulls back.
- Handoff examples used: lesson 10 `end` 10.0, lesson 12 `end` 10.5.

## English mode

For English courses use `lang: 'en'` (DOM pages: `K.setLang('en')`). Usage, fonts, caveats: `/lib/classroom/EN.md`. Without it the component stays in Chinese mode, pixel for pixel unchanged.
