# English mode (EN) for the shared components

Switches that make the shared components render English text. **If you do not turn it on, every component stays in its original Chinese mode, pixel for pixel unchanged.**

| Component | How to turn it on | English font |
|---|---|---|
| Course map `coursemap4.js` | `makeCourseMap4({ ..., lang: 'en' })` | Nunito 800 (rounded, same feel as Chiron GoRound TC), loaded automatically |
| Blackboard mindmap `mindmap.js` | `makeMindmap(board, { ..., lang: 'en' })` | Kalam 700 (handwritten chalk), loaded automatically; override with `font` / `fontWeight` |
| Key-point card `keypoint.js` | `KP.keypoint(st, { ..., lang: 'en' })`, or for the whole page `K.setLang('en')` | Inter (uppercase label; key sentence auto-shrinks to fit) |
| DOM kit `kit.js` / `kit.css` | `K.setLang('en')` at page start (before building any component) | `--font-tc` becomes Inter-first, `--font-hand` becomes Kalam |
| Clay props `cast.js` | `makeFlag(text, { lang: 'en' })`, `makeTag(text, { lang: 'en' })`, `makeBox({ lang: 'en', ... })`; call `await C.loadEnFont()` first | Nunito 800 |
| `board.js` | No change (see section 6) | — |

Fonts live in `node_modules/@fontsource/`: `nunito`, `kalam`, `caveat`, `patrick-hand`.

---

## 1. Course map `coursemap4.js`: `lang: 'en'`

```js
const map = await makeCourseMap4({ lesson: 10, lang: 'en', t0: Ls('O02'),
  question: 'Which number do I fix first?',
  times: { arrive: T.word('O03', 'today'), end: Le('O03') + 0.4 } });
```
All other parameters, return values, timing and camera behave exactly as in `COURSEMAP4.md`.

### 1.1 Text on the model — the ads course's example (replace for your course)

The built-in English labels use standard Meta Ads terms, because the 13-part model belongs to one ads course.

| Lesson | Name plate (`PARTS4_EN[n].short`) | Question-sign tag (`.name`) | Text on the part |
|---|---|---|---|
| 1 | Auction | Auction | — |
| 2 | Return pipes | Measurement return pipes | Android / iOS / ATT (already English in zh mode) |
| 3 | LP vs App | Landing page vs App | — |
| 4 | Budget tap | Campaign budget tap | NT$3,000, `Buy: Installs` (zh: 買：安裝) |
| 5 | Ad sets | Ad set fences | A / B |
| 6 | Ads | Ads | — |
| 7 | Policy gate | Policy gate | — |
| 8 | Workbench | Hook / Body / CTA workbench | Hook / Body / CTA, `30 left`, `10 left` (zh: 剩 30, 剩 10) |
| 9 | Test bench | Test bench | Hook / Message A / Message B / CTA |
| 10 | Dashboard | Dashboard | Five gates: 3-sec view rate → Link CTR → Install rate → Activation rate → D7 retention |
| 11 | Decision lever | Decision lever | Creative / Channel / Product / Positioning; on the arc Stop / Keep / Scale (zh: 停 / 續 / 加碼) |
| 12 | Retargeting | Retargeting pools | Engaged audience / Website visitors / App installers (two lines) |
| 13 | Scaling valve | Scaling valve | — |

Small tag above the question sign: `Lesson 10 · Dashboard` (zh: 第 10 課 · 儀表板).

The `parts` parameter works the same (same keys); in English mode its defaults become the values above. Text you pass is used as-is:
`parts: { 10: { labels: [['3-sec', 'view rate'], ['Link', 'CTR'], ...] }, 12: { pools: ['Engaged\naudience', ...] } }` (English pool names may use `'\n'` to break into two lines).

### 1.2 Automatic layout adjustments (English is longer than Chinese)

- **Name plates**: font starts at 108px (texture px), same as Chinese; if a plate is wider than the part's `maxW` (world width, metres) the font shrinks, minimum 84px. In the overview shot uppercase cap height is about 32–40px on screen (Chinese glyphs are about 45px). English mode has its own plate positions (`PARTS4_EN[n].px/pz`): 2 moved left, 3 moved to the right front edge of the table (stays in frame, does not cover the iOS slot), 4 moved right, 9 moved left, 12 placed **behind** the three pools (does not block the pool labels).
- **Question sign**: if one line does not fit at 120px, it breaks into two lines at the space nearest the middle (e.g. `More money, / more of what?`); two-line signs go up to 138px. Pass `'\n'` to choose the break yourself. At the ride stop, the L08 / L10 / L13 questions have an uppercase cap height of about 60–70px.
- **Dashboard's five gates**: all five headers use one font size (set by the longest word, `Activation`), with equal side margins.
- **Decision lever's four levels**: English box is wider (200px); all four words share one font size.
- **`30 left`**: wider than 剩 30; it is clamped inside the viewer board and never clipped.

### 1.3 Caveats

- Each `makeCourseMap4` call switches the module language before building the model; textures redrawn later (workbench viewer counts, decision grid) remember their language at build time, so one page can hold a Chinese map and an English map.
- On part 11, `Keep` on the arc is half hidden by the lever (the Chinese 續 is too).
- In the overview shot, small text on parts (pools, gates, levels) is only 15–25px, same as Chinese; push in to make it readable.
- With English plates, plate 3 sits further from the fork than in Chinese (on the table's right front edge); viewers match it by number.

---

## 2. Blackboard mindmap `mindmap.js`: `lang: 'en'`

```js
const mm = await makeMindmap(board, { layout: 'radial', lang: 'en',
  center: { text: 'Fix the first red gate', t: 1.6 },
  nodes: [{ id: 'read', text: 'Read left to right', t: 3.9, doodle: gatesDoodle, edge: { label: 'How?' } }, ...] });
```
- Font: `CHALK_EN = Kalam 700` (exported, usable in your page). Candidates compared on the same board at the same size:
  - **Kalam 700 (default)**: most like chalk handwriting, heavy strokes, large x-height; 64px (about 58px on screen) reads well.
  - Patrick Hand 400: neatest and most legible, but thinner and only weight 400. To use it: `font: 'Patrick Hand', fontWeight: '400'`, and put `<link rel="stylesheet" href="/node_modules/@fontsource/patrick-hand/400.css">` in `<head>` (when you set `font` yourself the component does not load the CSS for you).
  - Caveat 700: most cursive, but small x-height, looks one size smaller at the same px; not recommended.
- Nodes, edge labels and `d.text()` inside doodles all use this font. Your own `el.text()` must pass it explicitly: `el.text('...', x, y, { font: mm.font.family })` (`mm.font = {family, weight}`).
- Writing speed: 0.042 s per English letter (Chinese: 0.075 s per character).
- Lint counts **words** instead of characters: node ≤ 5 words, center ≤ 7 words, whole board ≤ 36 words; the 50px size check is unchanged.
- `S.writeOn` draws letter by letter (no kerning). Kalam's `?` has a wide left side bearing, so `How?` looks like `How ?`; switch to Patrick Hand if that matters.
- For your own English text in the wipe callback (`spec.wipe.prev`), use `S.writeOn(c, '...', x, y, 1, { font: '700 110px "Kalam"', color: C.CHALK.white })`.

---

## 3. Key-point card `keypoint.js`: `lang: 'en'`

```js
K.setLang('en');                     // or pass lang: 'en' to each card
const kp = KP.keypoint(st, { at, until, index: 1, total: 2, key: 'Fix only the **first red gate**', figure: f => { ... } });
```
- Label: `KEY POINT 1 / 2` (Inter, uppercase; change with `label`, e.g. `label: 'Recap'`).
- Key sentence: Inter 76px; if it does not fit the card (1520px) it shrinks automatically, minimum 54px (measured on the first `update`; fonts must be loaded first, which `K.ready()` handles). Warns above 7 words.
- Text inside the figure (`f.node` labels, `f.text`, `f.card`, `f.compare`) is Inter-first already. English labels are roughly twice as wide as Chinese; with five nodes in a row, space them at least 280px apart.
- `f.group` labels get tighter letter spacing in English mode.

## 4. DOM kit `kit.js`: `K.setLang('en')`

- Call it before building any component (anywhere after `await K.init()` and before `K.stage()`). It adds `.k-en` to `<html>`: `--font-tc` becomes `Inter, "Noto Sans TC"`, `--font-hand` becomes `Kalam` (the handwritten recap note paper). The IG wordmark keeps its own font.
- Default sample text switches to English: `titleCard` `lesson` (`Lesson 1`), `recap` title (`Recap`), `creative` headline/subline, IG post caption, Reels primary text, safe-zone note (`Top 14% covered by the app UI`), Play Store listing name, description and screenshot taglines.
- `chapterBar` has no default text; pass `lesson: 'Lesson 10'` and English chapter names yourself.
- In English mode `K.ready()` also loads Kalam.

## 5. Clay props `cast.js`

```js
await C.loadEnFont();                                 // Nunito 800
C.makeFlag('Website', { lang: 'en' }); C.makeTag('No. 1', { lang: 'en' });
C.makeBox({ lang: 'en', label: 'Container', stickers: [['Creative', 'Website']] });
```
- `{ font, fontWeight }` selects any font. Long English text shrinks automatically (flags already did).
- The cast (Professor Bao, Taro), the classroom and the blackboard itself carry no text.

## 6. `board.js` (unchanged)

`board.js` is the blackboard director from an earlier course; every board's content and timing is hard-coded to its Chinese narration. For English blackboards use `mindmap.js` (`lang: 'en'`), or write with `S.writeOn` and Kalam yourself.

## 7. Rendering an English map still

`RENDER_GPU=1 node render.cjs <project> --scene 'classroom.html?lesson=10' --stills 5.9`

Default ride timing in English mode (question sign appears / part colours in): lesson 8 5.41 / 6.71; lesson 10 5.08 / 6.38; lesson 13 4.97 / 6.27.
