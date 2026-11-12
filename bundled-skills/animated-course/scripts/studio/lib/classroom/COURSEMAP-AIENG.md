# Classroom course map — example course `coursemap-aieng.js`

> The course map for an example eight-lesson course (AI Engineering: learned programs, bias / variance, error analysis, metrics, eval sets, data processing, drift and cost, SLOs and incidents). Copy it as the starting point for a new course's map: keep the API and the staging, replace the eight parts with your course's mechanisms.
> It implements `reference/04-skeleton.md` §5 and §5b: in the wide shot all eight parts and all eight name plates are in frame; looking at one lesson pushes in on its part while the other parts dim and their text and plates hide; one group is lit at a time; on the first full look (lesson 1) each part holds 3.6 s; the question card stays up until it has been read (computed automatically, including its "Lesson N · plate name" tag).

## What is on the table

**A two-step display stand that reads like two lines of text**: lessons 1–4 on the front step, 5–8 on the back step (raised 0.23), both left to right.
- **Front-row plates hang on the front step's edge** (below their parts); **back-row plates stand on small signs behind their parts** (above them). In the wide shot the plates form two bands (top: 5 6 7 8, bottom: 1 2 3 4), so **a plate never covers a part and a part never covers a plate**.
- Plates are full billboards (they face the camera on every axis), so plates near the frame edge never look skewed. In the wide shot their text is about 50 px high (front row) / 46 px (back row).
- Back-row parts are drawn 12 % larger (they are further away), so both rows look the same size.

Each part is a small working model of that lesson's core mechanism and really plays it out:

| Lesson | Plate (on screen) | What it plays (one run, speed 1) | One run |
|---|---|---|---|
| 1 | 學來的程式 (learned program) | Left: a dark code card whose bug line lights red (written code has *the line* you can fix). Right: blue data points grow a blue curve (the learned tendency); the same "?" question card goes in twice and comes out once ✓ green, once ✗ red; finally a magnifier sweeps the curve (push-in caption: no such line can be found) | 5.0 s |
| 2 | 偏差／變異 (bias / variance) | Two targets, blue darts one by one: left they cluster off-centre, right they scatter round the centre. Then a red arrow grows on the left (centre → cluster = bias) and a red ring on the right (scatter = variance); push-in shows red "bias" / "variance" labels | 4.4 s |
| 3 | 錯誤分類 (error analysis) | 10 red error cards fall into 4 yellow bins; the bars behind grow to 4 / 3 / 2 / 1 cards (= 40 / 30 / 20 / 10 %), and the tallest turns full red and bumps. Push-in shows the four category names with their shares | 4.2 s |
| 4 | 指標 (metrics) | A pool of 5 green balls (should catch) and 4 grey (should not). A yellow net lifts 3 green + 1 grey into the basket → "3/4" stands behind it (precision); the 2 green balls left get green rings → "3/5" behind the pool (recall). Push-in shows "precision" / "recall" labels | 4.4 s |
| 5 | 考題集 (eval set) | A stack of chat logs at the back → 3 picked to the front → marked ✓ / ✗ / ✓ → filed one by one into a dark-blue eval booklet that closes. Right: a brass balance (the judge): left pan human ✓, right pan judge ✗, it wobbles → the right pan flips to ✓ → level (calibration). Push-in labels: booklet, human, judge | 5.0 s |
| 6 | 資料處理 (data processing) | A conveyor carries 7 data cards (three categories in neutral colours). The duplicate drops at the yellow gate into a grey tray (dedup); the rest sort into piles 3 / 2 / 1 → the tall pile loses one, the short pile gains a glowing synthetic card → a line levels them at 2 / 2 / 2 → a stamp lands and "v1.1" appears. Push-in labels: dedup, quota | 4.6 s |
| 7 | 漂移與成本 (drift and cost) | On a whiteboard a blue hill (the question distribution) slides right, leaving a dashed outline where it was, a red arrow marks the shift; beside it 3 of 5 silver coins (cost per answer) fly off. Push-in labels: the distribution, "when the eval was built", "now", cost per answer | 4.4 s |
| 8 | 約定與事故 (SLOs and incidents) | A green error-budget battery (10 cells); a red lamp flashes (incident) → the 3 right cells turn red and burn off → a yellow review note flies onto the battery (push-in: "review / blameless") → the purple standard line on the left ruler moves up and a purple loop arrow turns once. Push-in labels: error budget, SLO | 4.4 s |

**Colours (the course's `SERIES.md` §5: one colour = one quantity, the same on the whole map)**:

| Colour | Means only | Where |
|---|---|---|
| Blue `#2F6FD6` (concept) | Data and learned model behaviour | 1 data points and learned curve, 2 dart hits, 7 question distribution |
| Yellow `#E9B320` (method) | Methods and tools | 3 bins, 4 net, 5 balance, 6 dedup gate, 8 review note |
| Green `#1F9D55` (ready to use) | Right / usable as is | 1 ✓, 4 should-catch balls and recall rings, 5 ✓, 8 remaining error budget |
| Red `#E5484D` (diagnosis) | Wrong / a diagnosed problem | 1 bug line and ✗, 2 bias arrow and variance ring, 3 error cards and tallest bar, 5 ✗, 7 drift arrow, 8 incident lamp and burned budget |
| Purple `#7C5CD6` (loop) | A loop | 8 incident → review → raise the standard |
| Grey | Irrelevant | 4 should-not-catch balls, 6 the duplicate's tray |

Data categories (part 6) use three neutral colours (cream, wood, slate) that carry no meaning. The yellow of the name plates and the question card is the map's own "lit" state colour (the same look as `coursemap4.js`); it is a different shape (a long plate, not a part) and is not the parts' "yellow = method".

**Small text appears only on a push-in**: captions on parts, the code card's text, the whiteboard's text. In the wide shot the code card is drawn as grey bars and captions are hidden entirely (not drawn as tiny boxes, which would read as noise). The wide shot asks the viewer to read **only the name plates**, plus two large figures that are part of a mechanism: "3/4" "3/5" and "v1.1" (about 18–22 px in the wide shot, 60 px or more pushed in). Pushed-in captions are about 32–40 px high.

Each part has three states: **lit** (coloured, playing, plate turns yellow, a soft yellow glow underneath) / **learned** (coloured, resting in its finished pose) / **not yet learned, or another part is lit** (dimmed). On a push-in the other parts dim further (0.9) and their text and plates hide; only this lesson's part shows its small text.

Course closing (`shot: 'chain'`): a wooden walkway with arrows appears in front of the front step and in front of the back-step parts (1 → 2 → 3 → 4, 5 → 6 → 7 → 8). A chat-log card (with a yellow glow) walks from 1 to 4, **jumps to 5 on the back step like a line break** (a parabola of about 1 s), and walks on to 8. **The path already walked turns gold** (you can see how many lessons have been covered); each part replays from the start and its plate turns yellow as the card reaches it; parts already played stay coloured (slightly dimmed), parts not reached yet stay faint; finally all eight light together and hold.

## 1. Usage

```js
import { makeCourseMapAIEng } from '/lib/classroom/coursemap-aieng.js';   // also: import { makeCourseMap } or default
const map = await makeCourseMapAIEng({ lesson: 3, t0: Ls('O05'), question: '該先修哪個錯？', camFrom: CAMS.W, camBlend: 1.0 });   // question: "Which error do we fix first?"
scene.add(map.root);

window.renderAt = (t) => {
  const onMap = t >= map.times.start && t < map.times.end;
  map.root.visible = onMap;                     // or keep it visible throughout (the table belongs in the classroom): map.update also works outside the map segment
  if (onMap) { map.applyCam(cam, t); map.update(t, cam); }    // call update after the camera is set (plates and question card turn to the camera and check the frame)
  else { /* your own camera */ }
  renderer.render(scene, cam);
};
window.TEXTS = (t) => [...myOtherTexts(t), ...(map.root.visible ? map.texts(cam) : [])];   // readcheck.cjs
```
Exports: `makeCourseMapAIEng` (main), `makeCourseMap` (alias), `default`, `COL` (colour meanings), `PARTS_AIENG` (the eight plate names), `readNeed(text)` (the §5b reading-time formula, the same as readcheck).

`update(t, cam)`, `cam(t)` and `applyCam(cam, t)` are all **pure functions of t** (any order, any time, the same frame; no `Date`, no `Math.random`; scatter uses seeded `S.rng`). Pages need `RENDER_GPU=1`. Fonts: the component loads Chiron GoRound TC 700 and Inter 800 itself.

### Parameters `makeCourseMapAIEng(o)`

| Parameter | Default | Description |
|---|---|---|
| `lesson` | required | This lesson, 1–8 |
| `t0` | `0` | Second at which the map segment starts |
| `shot` | `'ride'` | `'ride'` opening (wide → learned parts light in turn → push in on this lesson's part + question card) / `'chain'` course closing (lesson 8) / `'finale'` pull back from this lesson's close-up to the wide shot / `'overview'` hold the wide shot. `shot: 'overview', allLit: true` on `lesson: 8` equals `'chain'` |
| `question` | `''` | Question-card text (`ride` only). Keep a line to about 12 CJK characters; use `'\n'` for two lines. A tag "Lesson N · plate name" (drawn as `第 N 課 · <plate>`) is added above it. The card stands **beside this lesson's part, on the same step** (right of lessons 1, 2, 5, 6; left of 3, 4, 7, 8, covering a dimmed neighbour), its pointer aimed at the part |
| `questionTag` | `第 N 課 · <plate>` | Replaces the tag above the question, e.g. for an extra lesson that sits next to a numbered one (see §2) |
| `times` | auto | Sync to narration, **absolute seconds**; see §3 |
| `stops` | lesson 1: `[1..8]`; lesson N: `[1..N−1]` | Parts lit in the wide shot before a `ride` pushes in. **May be grouped**: `[[1],[2,3],[4,5,6],[7,8]]` — parts in one group light and play together in one window (1 part 4.0 s, 2 parts 4.6 s, 3 or more 5.2 s), groups take turns |
| `review` | lessons 1–4 `'wide'`; 5–8 `'group'` | `'wide'`: each stop lights in turn in the wide shot. `'group'`: all learned parts **light and play together** in one window (= `stops` as a single group; 5.2 s for 4 or more). `'push'`: the camera pushes in on each stop (slow; give each stop at least 3 s). With grouped `stops`, `review` does not change the grouping |
| `camFrom` | none | `{pos, look, fov}` (world `THREE.Vector3`): blend smoothly from your camera into the map camera, starting at `t0` |
| `camBlend` | `1.2` | Length of that blend in seconds (1.0 recommended) |
| `allLit` | `false` | `overview` with all eight lit (on lesson 8 it becomes `chain`) |
| `place` | `{x:0.2, y:0, z:-0.95, rotY:0, scale:0.6}` | Where the map table stands (in front of the blackboard, between teacher and student; do not also add `C.makeLowTable()`). The table's world extent is about x −0.87…1.27, z −1.53…−0.37 (`map.tableBox()`). Scale does not change its size on screen (the camera frames it), only whether it collides with people in the classroom |
| `table` | `true` | `false`: no display-table legs; the stand sits directly at `place.y` |
| `parts` | `{}` | Rename plates: `{n: {name}}` |
| `times.hold` | none | `ride` only. Per group of stops, a second or `null`. For a group with a second, the camera stops on that group at that second (1.1 s push, elevation 0.9, plates included); the group lights up but **rests at the start of its run** until its play time `times.parts[i]`; the previous group's window ends at the hold; while the camera is stopped, the other parts' small text, captions and plates hide until the camera reaches this lesson's part. Use it when narration asks about a learned lesson before naming it: `stops: [[1,2,3,4],[5]], times: { parts: [Wd('M01r','課') - 0.05, Wd('M01a','真實')], hold: [null, Wd('M01q','第五') - 0.1], … }`. Without it the camera stays wide while stops play |
| `groupTags` | none | `ride` only. Per group of stops, a string or `null`: while that group is lit, a small dark tag (the question card's tag look) shows above it, e.g. `['複習']` ("Review"), so a group lit together reads as a review and not as the wrong part lighting up. Front-row groups get the tag on the back step's riser, centred on the group; back-row groups above their plates. Reported to readcheck as `map-tag-i` |

### Return value

| Name | Description |
|---|---|
| `root` | The Group to add to the scene |
| `update(t, cam)` | Poses everything for second t (pass `cam`: plates turn to it, frame checks, push-in text) |
| `cam(t)` / `applyCam(cam, t)` | The map camera (world `{pos, look, fov}`) / apply it directly to a `PerspectiveCamera` |
| `texts(cam)` | `[{id, text, x0, y0, x1, y1}]`: the plates on screen (`map-plate-n`), group tags (`map-tag-i`) and the question card (`map-question`, tag included), in page pixels. Put it into `window.TEXTS`. Only plates fully inside the frame are reported; the question card counts once it has grown to 90 % |
| `times` | `ride`: `{ start, overview, groups:[{parts, t, end, hold?}], stops:[{n, t, end, rate}], push, arrive, colorIn, ask, readQ, end, lit }`; `chain`: `{ start, join:[a,b], flow:[f1..f8], per?, allOn, end, lit }`. `console.log(JSON.stringify(map.times))` shows the actual numbers |
| `review` | The review mode actually used |
| `cams.overview()`, `cams.part(n)`, `cams.group(ns)`, `cams.chain()` | Fixed cameras: wide / close-up of part n (this lesson's includes the question card; back-row close-ups look from higher up so the front row does not block them) / a held group with its plates / closing wide shot (walkway included) |
| `partWorld(n)` / `itemWorld(n)` | World position of part n / of its moving item (curve board, target, tallest bar, basket, balance beam, v1.1 caption, whiteboard, battery), as last posed by `update` |
| `inShot(obj, cam)` | Is a character (any Object3D) `'in'` / `'part'` (cut by the frame edge) / `'out'` of this camera. Every map camera should see each character as `'out'` or `'in'`, never `'part'` |
| `clearX(obj, side)` | Moves a character outward (side −1 left, +1 right) until every map camera sees it as `'out'`; returns the new x (§5) |
| `tableBox()` | World-space Box3 of the table (for staging) |
| `parts`, `land`, `stops`, `duration` | Internals / `end − t0` |

## 2. Calling it per lesson (recommended values)

The seconds below are **defaults** (`t0 = 0`, `camBlend: 1.0`, only `question` given); in practice set `t0` to the start of your narration line, or sync with `times.parts` / `arrive`. The questions are the example course's "question this lesson answers"; keep yours to about 12 characters per line.

### Lesson 1: the first full look, all eight play in turn, then push in on part 1 + question card
```js
makeCourseMapAIEng({ lesson: 1, t0: Ls('O0x'), question: 'AI 答錯了，為什麼\n找不到錯的那一行？', camFrom: CAMS.W, camBlend: 1.0 })   // "The AI got it wrong — why can't we find the wrong line?"
// sync to narration: times: { parts: [Ls('a'), … 8 of them], arrive: Ls('mapbeat') + 0.2 } (≥ 3.0 s between stops)
```
| Beat | Seconds (from t0) | Hold | Picture |
|---|---|---|---|
| Blend in + wide | 0–2.6 | 2.6 s (incl. 1.0 s blend) | All eight dim, the whole stand in frame |
| Parts 1–8 light in turn | 2.6 / 6.2 / 9.8 / 13.4 / 17.0 / 20.6 / 24.2 / 27.8 | **3.6 s** each (one run at 1.35–1.6×, then rest) | Wide; only one part coloured at a time, its plate yellow |
| Push in on part 1 | 31.4–32.5 | 1.1 s | Others dim further, their text and plates hide; part 1 replays from 31.55 (1×) |
| Question card | 32.5–39.5 | **7.0 s** (two lines, 18 characters + tag: 6.6 s to read) | Card right of the part (covering part 2) |
| **Total** | | **39.5 s** | To shorten: `times.parts` at 3.0 s per stop (about 34 s), or the grouped version below |

### Lesson 1, grouped (recommended when the opening must stay under 60 s): eight parts in four groups, then push in on part 1 + question card
```js
makeCourseMapAIEng({ lesson: 1, t0: Ls('O0x'), question: '為什麼找不到錯的那一行？', camFrom: CAMS.W, camBlend: 1.0,   // "Why can't we find the wrong line?"
  stops: [[1], [2, 3], [4, 5, 6], [7, 8]] })   // grouped along the course's causal line: why it is unpredictable | diagnose + classify | measure + eval set + data | operate in production
// sync to narration: times: { parts: [Ls('a'), Ls('b'), Ls('c'), Ls('d')] } (one second per group)
```
| Beat | Seconds (from t0) | Hold | Picture |
|---|---|---|---|
| Blend in + wide | 0–2.6 | 2.6 s | All eight dim |
| Group 1: part 1 | 2.6–6.6 | 4.0 s (1.43×) | Only this group coloured, plate yellow |
| Group 2: parts 2, 3 | 6.6–11.2 | 4.6 s (about 1.1×) | Both play together |
| Group 3: parts 4, 5, 6 | 11.2–16.4 | 5.2 s (1×) | Right of the front step + the two left back-step parts |
| Group 4: parts 7, 8 | 16.4–21.0 | 4.6 s (1×) | The two right back-step parts |
| Push in on part 1 | 21.0–22.1 | 1.1 s | Part 1 replays from 21.15 |
| Question card | 22.1–28.2 | **6.1 s** (tag + question: 5.7 s to read) | Card right of part 1 |
| **Total** | | **28.2 s** | |

### Lessons 2–4: learned parts reviewed one by one in the wide shot (2×), push in on this lesson's part + question card
```js
makeCourseMapAIEng({ lesson: 4, t0: Ls('O0x'), question: '「答得好」怎麼量？', camFrom: CAMS.W, camBlend: 1.0 })   // "How do you measure 'a good answer'?"
```
| Lesson | Wide | Review (2.7 s each) | Push in | Question card (example) | Total |
|---|---|---|---|---|---|
| 2 | 0–1.8 | 1.8 | 4.5–5.6 | from 5.6, read time + 0.4 | about 10.5–11 s |
| 3 | 0–1.8 | 1.8 / 4.5 | 7.2–8.3 | from 8.3 | about 13 s |
| 4 | 0–1.8 | 1.8 / 4.5 / 7.2 | 9.9–11.0 | 11.0–15.5 (4.1 s to read) | **15.5 s** |

### Lessons 5–8: learned parts reviewed **together** (`review: 'group'` is the default), push in on this lesson's part + question card
```js
makeCourseMapAIEng({ lesson: 5, t0: Ls('O0x'), question: '一份考題集怎麼建？', camFrom: CAMS.W, camBlend: 1.0 })   // "How is an eval set built?"
// to review one by one: review: 'wide' (lesson 8 then takes 1.8 + 7 × 2.7 + 1.1 + card ≈ 27 s)
```
| Beat | Seconds | Hold |
|---|---|---|
| Blend in + wide | 0–1.8 | 1.8 s |
| Learned parts light and play together | 1.8–7.0 | **5.2 s** (4 or more parts; about 1×) |
| Push in on this lesson's part (back row: the camera looks from higher up) | 7.0–8.1 | 1.1 s (plays from 7.5) |
| Question card | from 8.1 | read time + 0.4 (about 4.8 s for this question) |
| **Total** | | **about 13–14 s** (lesson 5: 13.4 s) |

**An extra lesson next to a numbered lesson** (e.g. a single-concept lesson that fills a gap next to lesson 7): ride to that lesson's part and replace the tag above the question: `makeCourseMapAIEng({ lesson: 7, …, question: '客人等 8 秒，先快哪段？', questionTag: '補一課 · 第 7 課旁' })` (question: "The customer waits 8 s — which step do we speed up first?"; tag: "Extra lesson · next to lesson 7").

### Lesson 8 closing: `chain` (the whole course as one line), then turn to the blackboard for the mindmap
```js
const mapEnd = await makeCourseMapAIEng({ lesson: 8, t0: Ls('E01'), shot: 'chain', camFrom: CAMS.BFULL, camBlend: 1.0,
  times: { flow: ['E02','E03','E04','E05','E06','E07','E08','E09'].map(Ls), end: Le('E10') } });   // one narration line per lesson; the parts light with it
```
Defaults (only `t0` given):

| Beat | Seconds | Hold |
|---|---|---|
| Wide (all eight coloured) → walkways and arrows appear | 0–2.4 | 2.4 s |
| The card reaches parts 1–8, each plays once | 3.0 / 6.6 / 10.2 / 13.8 / 17.4 / 21.0 / 24.6 / 28.2 | **3.6 s** each (the 4 → 5 line-break jump, about 1 s, is inside 5's window) |
| All eight light together and hold | 31.5–34.9 | 3.4 s |
| **Total** | | **34.9 s** |

With `end` but no `flow`: the eight beats share the time evenly (2.4–4.5 s each) and the last 3 s are all lit. Beats under 3 s feel rushed (closing the whole course needs more time, not less), so give the segment ≥ 30 s.

## 3. Syncing to narration (`times`, all absolute seconds)

`ride`:

| Key | Default | Description |
|---|---|---|
| `overview` | `t0` | Wide shot starts |
| `parts` (or `stops`) | auto | The second each stop lights, one per stop — or **one per group** when `stops` is grouped or `review` is `'group'`. With `arrive` but no `parts`: spread evenly between the end of the wide hold and the push. Without either: the wide shot holds 2.6 s (lesson 1) / 1.8 s (with `camBlend: 1.0`), then each stop gets 3.6 s (lesson 1) / 2.7 s (review); a group window is 4.0 s (1 part), 4.6 s (2), 5.2 s (3 or more) |
| `hold` | none | Per group, where the camera stops on that group before it plays (§1) |
| `arrive` | last stop's end + 1.1 s | The camera has pushed in on this lesson's part; the question card appears here by default |
| `push` | `arrive − 1.1` | Push-in starts; the last stop stays lit until here. 0.55 s into the push, the other parts' text and plates hide |
| `colorIn` (or `play`) | lesson 1: `push + 0.15`; others: `arrive − 0.6` | This lesson's part colours in and plays from the start |
| `rate` | `1` | Playback speed of this lesson's part |
| `ask` | `arrive` | Question card pops up |
| `end` | `max(ask + max(2.8, readQ + 0.4), colorIn + one run + 0.4)` | Map segment ends; the camera stops moving after `end − 0.5`. **If you give `end` yourself, keep `end − ask` ≥ `times.readQ`** (otherwise readcheck reports the question card as too short) |

- A stop's window runs from its lighting to the next stop (or to `push`). Playback speed is automatic: `rate = clamp(one run / (window − 0.5), 1, cap)`, cap 1.8 on lesson 1 and 2.0 for reviews. **Give each window ≥ 2.5 s**; ≥ 3.0 s on the first full look (lesson 1).
- Learned parts rest in their finished pose before their stop and play from the start when lit; parts not yet learned rest in their starting pose.

`chain`:

| Key | Default | Description |
|---|---|---|
| `join` | `t0 + 0.5 + camBlend × 0.5` | Walkways start to appear (1.4 s to finish; arrows pop in one after another) |
| `flow` | auto | `[f1, …, f8]`: the second the card reaches part n and it starts playing. Each beat's speed follows from the gap to the next (1–2×) |
| `end` | `allOn + 3.4` | End. With `end` but no `flow`: eight even beats (2.4–4.5 s each), the last 3 s all lit |

`finale` / `overview`: only `end` (default `t0 + 4.0`).

## 4. How long each beat holds (quick reference)

| Situation | Hold |
|---|---|
| Wide (first full look) | ≥ 2.5 s (default 2.6 s incl. 1.0 s blend) |
| Wide (lessons 2–8) | ≥ 1.5 s (default 1.8 s) |
| One part lit (first look) | ≥ 3.0 s (default 3.6 s) |
| One part lit (wide review) | ≥ 2.5 s (default 2.7 s, about 2×) |
| A group playing together (grouped `stops` or `'group'`) | 4.0 s (1 part) / 4.6 s (2) / 5.2 s (3 or more) |
| Push in | 1.1 s |
| Question card | read time + 0.4 s (`times.readQ`) |
| Closing chain | walkways 1.4 s + ≥ 3.0 s per beat (default 3.6 s) + ≥ 3 s all lit; whole segment ≥ 30 s |

## 5. Staging the cast (the classroom with each lesson's teacher)

- The table occupies about x −0.87…1.27, z −1.53…−0.37 (`map.tableBox()`). The classroom's default spots (teacher `(-2.25, 0, -0.7)`, student `(2.1, 0, 0.05)`) do not collide with it.
- **The wide shot of an eight-part stand is wide**, so a broad character at the default spot can be cut by the frame edge during the map. Character widths differ a lot between skins (a round glass student is about twice as wide as a narrow one); measured moves stay within about 0.25 m, but they depend on each lesson's camera timing, so **call `clearX` per lesson** instead of reusing someone else's numbers.
- **How: after building the map, call `map.clearX(teacher.root, -1)` and `map.clearX(student.root, 1)` once.** Each moves the character outward from where it stands until every map camera (sampled every 0.25 s, from the end of the `camFrom` blend to `times.end`) sees it as `'out'`, and returns the new x (moves at most 1.6 m).
- After that move, a broad character may be cut slightly in the classroom wide shot: either use two spots (the `clearX` spot during the map segment, the usual spot elsewhere), or hide the cast during the map segment (`teacher.root.visible = !onMap`). Some large teachers are already slightly cut at the default spot in the classroom wide shot (`inShot = 'part'`), independent of the map.
- To check by hand: `map.applyCam(probeCam, t)` at a few key seconds, then `map.inShot(teacher.root, probeCam)`. Only visible meshes count (glass shells included; flat contact-shadow planes and hidden state marks do not).
- The teacher can `point` at the stand during the map; when the teacher is out of frame the pose does not matter.

## 6. Handoff and camera

- From the classroom: `camFrom` + `camBlend` (1.0 s recommended). Back to your camera: lerp yourself after `times.end` (e.g. 1.2 s back to the classroom wide shot).
- Handoff to a DOM page: the camera settles at `end − 0.5`; render the last frame with `RENDER_GPU=1 node render.cjs <project> --scene classroom.html --stills <end>` and use it as the texture.
- On a push-in, this lesson's plate gives way to the question card; the card is a full billboard. The bottom 140 px stay empty (the wide-shot plates end at about 925 px).
- Back-row close-ups use a higher elevation (0.62 rad; front row 0.42), looking over the front-row parts.

## 7. Render cost

1920×1080, SwiftShader, classroom + map + cast: about 4–6 s per frame (stills including start-up about 3 s or more each); the first frame adds about 10 s (fonts, canvas textures, shaders). Canvases that change (code card, curve board, drift whiteboard) redraw only when their content changes. Set `map.root.visible = false` when the map is off screen. `readcheck.cjs` over a 43 s map segment takes about a minute.

## 8. Known limitations

- On-screen text is Chinese in this example. Plate names can be overridden with `parts`; the other labels (captions, the code card, the whiteboard) live in the part builders, and the font preload string in `makeCourseMapAIEng` must cover any new characters.
- Numbers inside the parts are illustrative: part 3's 40 / 30 / 20 / 10 are the example course's shared figures; part 4's 3/4 and 3/5 are ball counts on screen, not real metrics; part 7's coins only mean "cost per answer goes down" and show no amount (real prices belong in the lesson's own scenes).
- Part 6's synthetic card only shows "the short category gains a card", not the limits of synthetic data (taught in the lesson).
- Part 8's rising standard line stands for "raise the SLO standard after the review"; alerting and on-call roles are not in the part.
- Plates and the question card are billboards; front-row plates hang on the step's edge, so from a very low angle (elevation < 0.3 rad) they look like they float in front of it.
- No sound: if wanted, add a small "pop" when each stop lights, at `times.ask`, at each chain `flow`, and at the line-break jump (`flow[4] − 1`); part 3's falling cards can take a "tick".
- The API only grows: published parameters and return values do not change.

## 9. Design decisions

The principles behind this map, to keep when building a map for another course:

1. **More than five parts: two rows, plates in two bands.** Plates stand above the back row and below the front row instead of in front of the parts. Plates in front of the parts would cover the back-row mechanisms and be covered by the front row; two bands keep "in the wide shot the viewer reads only the plates" literally true — one glance reads like two lines of a table of contents, and no mechanism is blocked.
2. **Plates are full billboards.** A plate that turns only about the vertical axis looks skewed near the frame edges when the camera is high, and slanted text is harder to read.
3. **Both rows read left to right, like lines of text.** A U-shaped order would make the top band read 8 7 6 5. In the closing, the card "line-breaks" from the end of the first row to the start of the second, and the gold trail makes "how far through the course" visible; at the end the whole course reads as one line.
4. **Later lessons review learned parts together; the first full look can be grouped.** Reviewing one by one grows with every lesson (lesson 8 would spend about 19 s); by then the viewer has seen each part several times and recognizes them lit together. Lesson 1's full look can be grouped along the course's causal line (about 28 s instead of 39 s).
5. **Back-row parts are drawn larger and seen from higher up**, so both rows read at the same size and the front row never blocks a back-row close-up.
6. **Staging is checked, not assumed.** Characters differ a lot in width, so a fixed spot that clears one cast cuts another in half at the frame edge; `inShot` / `clearX` measure it against the map's own cameras.
