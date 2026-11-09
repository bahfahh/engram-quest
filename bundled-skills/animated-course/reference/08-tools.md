# 08 Tools

## 1. Set up a studio

```bash
STUDIO=<scratchpad>/studio
cp -r .claude/skills/engram-quest-animated-course/scripts/studio "$STUDIO"
cd "$STUDIO" && npm install          # three, gsap, lucide-static, fonts (Inter, Noto Sans TC, Kalam, Nunito, …)
pip install edge-tts numpy           # if missing; ASR, and AI voice engines (07 §1c), additionally need: faster-whisper opencc-python-reimplemented pypinyin
```
Cloud sessions go through a TLS-intercepting proxy: edge-tts then fails with `CERTIFICATE_VERIFY_FAILED`. Fix once per container: `cat /root/.ccr/ca-bundle.crt >> "$(python3 -c 'import certifi;print(certifi.where())')"` (experiments 15 and 16).
Headless Chromium comes from Playwright (already installed in cloud sessions). On a machine that has not made a film yet, run `python3 scripts/doctor.py --studio "$STUDIO"` from the skill folder; it lists what is missing and how to install it. Projects live in `$STUDIO/projects/<id>/`; `render.cjs` refuses projects elsewhere.

## 2. Commands (run in `$STUDIO`)

```bash
python3 voice.py projects/<id>                    # script.json -> narration.wav + timeline.json + subtitles.vtt (cached; editing one line re-voices only that line)
node render.cjs projects/<id> --stills 2,15,40    # stills at those seconds -> projects/<id>/stills/t-2.jpg … (look at them with Read)
node render.cjs projects/<id> --preview           # half-res 12 fps preview -> preview.mp4 (max 3 at once machine-wide; queues)
node render.cjs projects/<id> --preview --from 30 --to 45
node render.cjs projects/<id> --scene classroom.html --stills 5   # a specific page
python3 compose.py projects/<id> [--preview] [--from A --to B]    # multi-page film from segments.json -> final.mp4 / preview.mp4
python3 asr.py projects/<id>/narration.wav        # pronunciation spot-check (ASR_LANG=en for English; ASR_PROMPT to override the neutral prompt); slow
node readcheck.cjs projects/<id> [--scene classroom.html --from 0 --to 52]   # reading time of every on-screen text (needs window.TEXTS)
python3 sfx.py projects/<id>/sfx                  # the standard quiet foley set (chalk, tap, pop, card, whoosh, thump, ding, wrong, tick, heartbeat, bubble)
python3 pacecheck.py projects/<id>                 # middle rhythm: speech share, silences, longest stretch without a pause (targets: 04-skeleton.md §2)
python3 remiddle.py projects/<id> --delivered <old.mp4> --orig-tout <s>   # remake only the middle of a delivered lesson: renders the new middle, splices the old film's head and tail (see its docstring)
```
- `RENDER_SLOTS=<n>` raises the number of render slots a job may take; full and range renders queue first-come-first-served, so a short extra job behind a big render needs a higher value (`09-pitfalls.md`).
- Three.js pages need `RENDER_GPU=1` for stills (`compose.py` sets it per segment from `"gpu": true`). DOM pages render in software (`--disable-gpu`): GPU compositing leaves ghosting when the camera moves.
- Motion check: `ffmpeg -v error -y -i projects/<id>/preview.mp4 -vf "fps=1,scale=480:-1,tile=4x3" projects/<id>/sheet_%02d.jpg`, then Read the sheets. Contact sheets are for motion only — judge text size on full-resolution stills.
- Speed: DOM ≈ 70–300 ms per frame, three.js ≈ 2.5–3 s per frame. Iterate with stills and short previews; full renders go to the cloud (`06-workflow.md`).

## 3. `script.json`

```json
{
  "voices": {"teacher": {"voice": "en-US-AndrewMultilingualNeural", "rate": "+0%", "pitch": "+0Hz"},
             "student": {"voice": "en-US-AvaMultilingualNeural", "rate": "+6%", "pitch": "+10Hz"}},
  "leadIn": 0.6, "tail": 1.5, "defaultPause": 0.35,
  "lines": [
    {"id": "O01", "speaker": "student", "text": "…", "pauseAfter": 0.2},
    {"id": "O02", "speaker": "teacher", "text": "…", "rate": "-8%", "pitch": "-4Hz"},
    {"id": "think-1", "silence": 3.0},
    {"id": "A03", "speaker": "teacher", "text": "how it should be read", "sub": "how it should be written"}
  ],
  "sfx": [{"file": "sfx/pop.wav", "line": "A03", "offset": 0.3, "gain": 0.5}]
}
```
- Silence around each synthesised line is trimmed, so `pauseAfter` / `defaultPause` are the real pauses.
- edge-tts sometimes returns a **partial clip** without an error; voice.py now rejects a clip whose word boundaries cover < 90% of the text, retries, and re-synthesizes such clips found in the cache. Still run ASR on each line before stage 2: a missing sentence is easier to hear per line than in the whole file.
- `{"id": …, "silence": s}`: a beat with no voice — a thinking pause, a picture speaking for itself.
- Per-line `rate` / `pitch` override the voice's base.
- Sound effects: `python3 sfx.py projects/<id>/sfx` writes the standard set; anchor each to the word the action happens on (`{"file": "sfx/card.wav", "line": "A12", "word": "glucagon", "offset": 0.1, "gain": 0.25}`), gain 0.15–0.35 (`04-skeleton.md` §6). When `sfx` is used, voice.py also writes `narration_dry.wav` (voice only) for the A/B version. No background music here (music is added at delivery).
- `timeline.json`: each line's `start` / `end` and per-word times `words`. Make things appear on the word: `T.word('A05', 'budget')`, `T.line('A05')`.

## 4. Page contract (`scene.html`, `classroom.html`)

- Set `window.DURATION` (usually `T.duration`), `window.renderAt(t)` (draws second t, **returns nothing**), `window.studioReady` (a Promise resolved after fonts, data and images are loaded — wait for `document.fonts.ready` and `document.fonts.load(...)` the glyphs you use).
- **`renderAt` must be a pure function of t**: no `Date.now()`, no CSS transitions or animations, no state accumulated over `requestAnimationFrame`, no unseeded `Math.random` (use `S.rng(seed)`). Frames are rendered out of order.
- The whole 1920×1080 page is captured (HTML, CSS, SVG, canvas). WebGL needs `preserveDrawingBuffer: true`.
- Animation: GSAP — `import { gsap } from '/node_modules/gsap/index.js'`, a paused timeline, `window.renderAt = t => { tl.seek(t, false); }`; times from `T.word()` / `T.line()`.
- Helpers: `import * as S from '/lib/stage.js'` (loadTimeline, prog, ease, rng, writeOn, drawStroke …). Icons: `/node_modules/lucide-static/icons/*.svg`.
- Fonts: Inter (English UI), Noto Sans TC (Chinese), LXGW WenKai TC (handwritten, recap/crib notes only), Chiron GoRound TC (rounded), Kalam and Nunito (English chalk and props).
- **`window.TEXTS(t)`** → `[{id, text, x0, y0, x1, y1}]`: every block of text the viewer must read at time t, with its box in page pixels — for `readcheck.cjs`. DOM pages: mark elements `data-read` and return `S.textsOf()`; canvas / three.js labels (chalk, map name tags): report them from the same world → screen function the drawing uses.
- `readcheck.cjs` calls `renderAt(t)` at every 0.04 s step. It turns WebGL draw calls into no-ops itself, so a three.js page needs no change (experiment 13 scene: 30 s checked in 8 s; with real drawing, 3 s took 31 s). `--draw` keeps real drawing. A page may still skip its own heavy CPU work while `window.READCHECK` is true. A live counter (a clock, a running total) gets no `data-read`; mark only its fixed caption.
- Quantitative lessons: put every number in a `model.js` of pure functions (narration lines quote it, the page imports it) and a `checks.mjs` that re-derives each number (formula, numeric integration, stepped simulation) and exits 1 on failure; run `node checks.mjs` in stage 1 and after every change.
- Never burn subtitles in; keep the bottom 140 px free.
- Performance: avoid large `filter: blur()` and `backdrop-filter`; animate transform/opacity; don't relayout lots of DOM per frame.

### Multi-page films (`segments.json`)
```json
[{"scene": "classroom.html", "from": 0, "gpu": true},
 {"scene": "scene.html", "from": 52.4},
 {"scene": "classroom.html", "from": 343.8, "gpu": true}]
```
Each segment runs until the next starts, beginning on the first frame at or after its `from`. All pages read the same `timeline.json`. **The handover frame must be identical on both pages** (use the other page's still as a texture/image) — otherwise one frame flashes.

## 5. Components (`scripts/studio/lib/`, each with its own doc)

| Component | Doc | What |
|---|---|---|
| `house/room.js`, `holo.js`, `ui.js`, `flat.js`, `tokens.js`, `house.css`, `kit-house.css` | `house/HOUSE.md` | **The house style (use for every new film)**: the Engram studio, light or dark (`01-principles.md` §1). `makeRoom` (seamless studio, lights, floor mirror, `room.lights(k)` for lights down, `room.dress(cast)` puts any `makeCast` skin into the room's light), `makeHolo` (panels, pedestals, "?", X-ray, particles), `makeUI` (labels + leaders, station chips, progress capsule, selection, stamp, read-out, proportional card, key card, mindmap, wipe), `makeFlat` (the same studio for DOM/SVG middles), `kit-house.css` (kit and keypoint in the house look), `lightsAt`/`lintLights`. ≈ 0.65 s/frame 3D, 0.37 flat (experiment 19) |
| `classroom/cast.js` | (code comments) | *Old look (clay classroom); new films use `house/`.* 3D clay classroom, Professor Bao, Taro, clay props (flags, tags, boxes); `C.loadEnFont()` for English props |
| `cast/classroom.js`, `cast/resolve.cjs`, `cast/teachers.json`, `cast/skins/` | `cast/CAST.md`, `reference/11-teachers.md` | The learner's teacher: `resolve.cjs` picks the teacher (finds the vault above the cwd or above itself; a studio copy outside the vault needs `--vault` or `$VAULT`) and prints skin, voices and beats; `makeCast(skinId, {renderer, variant})` puts any 3D skin (in the learner's colour set) into the classroom with the clay API (`pose`) plus `poseNative`; `cast/stage.js` places skins on a flat real-UI floor |
| `cast/cue.js` | `cast/CAST.md` → Cues | Hands and eyes go where the words go: on the word that names a thing, the teacher turns, looks and points at it and the student looks too (`cueTrack(T, list)` → `apply(role, pose, t, at)`); warns when the teacher stands on the wrong side; works for skins and the clay cast; test page `cast/cue-lab.html` |
| `classroom/board.js` | (code comments) | The classroom blackboard: chalk writing and drawing in the 3D scene |
| `classroom/mindmap.js` | `classroom/MINDMAP.md` | Ending mindmap on the blackboard: centre, branches with small redrawn recap images, labelled arrows; lints node length |
| `classroom/coursemap4.js` | `classroom/COURSEMAP4.md` | AdsDemo tabletop course map (needs rework — `04-skeleton.md` §5). For another course build a new model with the same API shape |
| `kit/kit.js`, `kit.css` | `kit/README.md` | DOM kit: world + camera, phone, callout, connector, cursor, counter, chapter bar, title card; Meta-ads real-UI pieces (IG feed, Ads Manager) |
| `kit/keypoint.js` | `kit/KEYPOINT.md` | Recap card: one diagram + one sentence |
| English mode | `classroom/EN.md` | `lang: 'en'` switches for map, mindmap, recap card, kit, props |
| `atlas/render.js`, `atlas/parts.js` | `atlas/ATLAS.md` | Atlas diagram world (MIT, from Atlas of Physics): paper solids + ink edges, one lit assembly, solid arrows, camera by target/azimuth/elevation/distance; camera-beat and lit tables; pause-able simulation clocks |
| `stage.js` | (code comments) | Timeline loading, easing, seeded random, write-on and stroke helpers |

Extend in your project folder; don't change shared components during a round (report what is missing).

## 6. Delivery and screening room

- `scripts/deliver.py` — see its docstring. It follows `settings.json` → `quality` (`compact` delivers 720p). The delivered film is already in the vault's commit spec (`bgm2.py`: H.264 CRF 26, maxrate 1800k, AAC 128k; over 95 MB → two-pass, `--max-mb`), so commit it as is — no second compression pass. On the cloud farm, `farm.sh` pushes a part over 90 MB as 45 MB chunks and `land.sh` joins them back (GitHub refuses 100 MB files). `--dry` delivers the B version without sound effects (for A/B listening; give it a review folder as `--series`, not the library). With `projects/<id>/cards.json` and the `cards` module on, it also writes the EngramQuest review-card deck (`12-modules.md` §3; `--no-cards` skips it, `--vault` if the vault is not above `--series`). Re-delivering keeps the entry's other fields and takes `cast` from `projects/<id>/cast.json`. Music file: `assets/music/Morning.mp3` (Kevin MacLeod, CC BY 4.0; the credit is written into `meta.json`). Music only at opening and ending; the plugin may later offer a few tracks to choose from — until then always "Morning".
- `scripts/farm/room-build.py` — builds a screening-room Artifact page from a small JSON spec.
