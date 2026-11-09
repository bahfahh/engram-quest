# DOM explainer kit (`/lib/kit/`)

Realistic UI mocks placed on a big **world** canvas, a deterministic **camera**, annotation primitives (callouts, curved connectors, highlight rings, cursor, counters) and the screen chrome (chapter bar, title card, recap). The built-in UI mocks (Instagram, Ads Manager, Play Store) come from the AdsDemo Meta Ads course; the stage, camera, annotations and chrome are subject-neutral. The original demo project (`projects/_kit-demo/`) is not included with this skill; start from the skeleton below.

## Skeleton

```html
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/lib/kit/kit.css">   <!-- imports Inter / Noto Sans TC / LXGW WenKai TC -->
</head><body>
<script type="module">
import * as K from '/lib/kit/kit.js';
import * as S from '/lib/stage.js';
const { gsap } = K;
await K.init(['rocket']);                 // loads the default lucide icon set + any extra icon names you use
const T = await S.loadTimeline();
const tl = gsap.timeline({ paused: true });
const st = K.stage({ width: 4000, height: 2400 });   // {world, cam, screen, frame}
const W = st.world, cam = st.cam;

const ph = K.phone({ os: 'ios' });
const feed = K.ig.feed(ph.body);
const post = K.ig.post({ user: 'lingoleaf.app', media: K.creative({ color: 'a' }) });
feed.scroll.append(post.el);
W.add(ph.el, 600, 700);                                       // world coords, anchor = centre by default

// rendered text: "No conversion event set" / "The system doesn't know who installed the app"
const warn = W.add(K.callout('沒設定轉換事件', { sub: '系統不知道誰裝了 App', tone: 'red', icon: 'triangle-alert' }), 1100, 500, { anchor: 'left' });
const line = K.connector(W, { from: warn, to: post.cta, color: 'red', dashed: true, progress: 0 });

// "Lesson 3"; chapters "What an ad looks like", "Reports"
const bar = K.chapterBar(st.screen, { lesson: '第 3 課', duration: T.duration, chapters: [{ name: '廣告長什麼樣', start: 0 }, { name: '報表', start: 40 }] });
cam.set(ph.el);                                   // first shot
cam.to(T.word('L03', '安裝'), [ph.el, warn], 1.4); // pan/zoom to fit both, starting on the narration word 安裝 ("install")
tl.from(warn, { opacity: 0, x: -30, duration: .5 }, T.word('L03', '安裝') + .6);
tl.to(line, { progress: 1, duration: .8 }, T.word('L03', '安裝') + .8);

window.DURATION = T.duration;
window.renderAt = K.render(tl, cam, bar);         // = t => { tl.seek(t,false); cam.update(t); bar.update(t) }
window.studioReady = K.ready();                   // MUST be last: loads every glyph used, then resolves connectors/highlights
</script></body></html>
```

## Determinism rules (the renderer screenshots `renderAt(t)` frame by frame, possibly out of order)
- Everything visible must be a pure function of `t`: use the paused GSAP timeline (`tl.seek`) plus `update(t)` objects passed to `K.render`.
- No `Date.now()`, no CSS `transition`/`animation`, no `requestAnimationFrame`, no `Math.random()` (use `K.rng(seed)`, `crowd.pick(frac, seed)`).
  Do not use GSAP `stagger: {from: 'random'}` or `gsap.utils.random`.
- `tl.call()` callbacks do not undo when seeking backwards — toggle state with tweens/`tl.set` instead (they revert).
- **CSS variables: never `tl.from(el, {'--k': 0})`** (GSAP fails to read the end value) — use `tl.to` or `tl.fromTo`.
- **Never give an object you tween a `length` field** (GSAP treats it as an array).
- Call `K.ready()` after the whole scene is built (it measures layout after fonts load). The camera resolves element targets on the first frame.

## Layout & camera
- `K.stage({width, height, grid:true, bg})` → `{world, cam, screen}`. World is a big canvas (default 3840×2160, dotted grid). `screen` is a fixed 1920×1080 overlay (chapter bar, title, recap).
- `W.add(el, x, y, {anchor:'center'|'left'|'right'|'top'|'bottom'|'tl'|'tr'|'bl'|'br', scale:1, z:10})` → el. Accepts a component object too (uses `.el`).
- `W.rect(elOrObj)` → world `{x,y,w,h,cx,cy,r,b}` (placed elements: layout box; nested elements: live box).
- Camera: `(x,y)` = world point at the centre of the **safe area** (between the top chapter bar, y ≥ 96, and the subtitle band, bottom 150px).
  - `cam.set(target)` initial shot · `cam.to(at, target, dur=1.4, ease='inOut')` move · `cam.cut(at, target)`.
  - `target` = `{x,y,zoom}` | element | component | `[el, el2, …]` (fit all) | `{el: target, pad: 80, zoom: maxZoom, dx, dy}`.
  - `cam.frame(target, pad)` → `{x,y,zoom}` (after ready). `cam.maxZoom = 3` default. Zoom is interpolated geometrically so zooms feel even.
  - Text stays crisp at zoom > 1 (no `will-change`), so zoom in on table rows / captions freely (2–2.5× is fine).
- Tips: lay the lesson out like a map — one "station" per idea, 1000–1800px apart; move the camera on narration words (`T.word(lineId, 'word')`); keep 0.6–1.5 s per move; at most one zoom-out overview per video.
  Put a station label above each station, VibeAcademy-style, e.g. `K.label('使用者在 IG 看到的', {icon:'smartphone'})` ("What the user sees on IG").

## Components (all return DOM elements or `{el, …parts}`)

### General
| | usage |
|---|---|
| `K.phone({os:'ios'|'android', w:390, h:844, dark, overlayStatus, time})` | `{el, screen, body, status}` — build app UI into `body` (below status bar) or `screen` (full bleed; use `overlayStatus:true`). Scale via `W.add(ph.el, x, y, {scale:.8})`. |
| `K.avatar(name, {color, size})` | round initial avatar. |
| `K.toggle(on)` | standalone switch (`--k` 0..1). |
| `K.callout(text, {sub, tone:'red'|'green'|'blue'|'amber'|'teal'|'orange'|'neutral', icon, solid, pill, size})` | VibeAcademy-style label box. |
| `K.tag(text, {color, icon})` / `K.label(text, {icon})` / `K.card({w, pad, title}, ...kids)` | dark/coloured pill, grey station label, plain white card. |
| `K.connector(W, {from, to, fromSide, toSide:'auto'|'left'|'right'|'top'|'bottom'|'center', color, width:3, dashed, arrow, dot, bend:.5, progress:1, over:false})` | curved SVG line between elements/points → `{progress, pointAt(k), len}`; draw-on: `progress:0` then `tl.to(c, {progress:1})`. `over:true` draws above cards. |
| `K.highlight(W, el, {pad:10, color:'red', radius:16, width:4})` | ring around any element, measured once at `K.ready()` (it does not follow content you later move — e.g. a scrolled feed). Starts visible: `gsap.set(hl,{opacity:0}); tl.to(hl,{opacity:1},at)`. |
| `K.cursor(W, {x,y})` | `cur.moveTo(tl, target, at, dur, {dx,dy}).click(tl, at)`; hide via `cur.el` opacity. |
| `K.counter({value, prefix:'NT$', suffix:'%', decimals})` | `tl.to(c, {value: 12000, duration: 1.5})`; put `c.el` anywhere. `K.fmt(v, opts)` formats once. |
| `K.chapterBar(st.screen, {lesson, chapters:[{name,start}], duration})` | top progress bar (80px; bottom stays clear for subtitles); pass to `K.render`. |
| `K.titleCard(st.screen, {lesson:'第 3 課', title, question, deco})` | full-bleed opening (`'第 3 課'` = "Lesson 3") → `.intro(tl, at)`, `.hide(tl, at)`. |
| `K.recap(st.screen, {title, points:['…**key**…']})` | note-paper ending (LXGW WenKai, numbered circles, `**marker**`) → `.show(tl, at, gap)`. |
| `K.barChart({w, h, data:[{label, value, color}], format:{prefix:'NT$'}, grid:4})` | `{el, bars, values, grow(tl, at, dur, stagger)}`. |
| `K.funnel({w, stages:[{label, value, color, text}]})` | stages shrink (log scale, min 42%) → `{el, stages}`. |
| `K.crowd({n, cols, size, gap, color, person:true})` | grid of people → `{el, dots, pick(frac, seed), paint(els, color)}`; e.g. `tl.to(cr.pick(.7, 3), {y:160, opacity:0, stagger:.01})`. |
| `K.coinFlow(W, connector, {n, start, dur, spacing, label:'$'})` | coins moving along a connector; pass to `K.render`. |
| `K.icon(name, {size, color, stroke, fill})` | inline lucide icon (preload names via `K.init([...])`). |
| helpers | `K.h('div.cls', {style}, ...kids)`, `K.tone('a')`, `K.rng`, `K.prog`, `K.ease`, `K.clamp`, `K.lerp`. |

### AdsDemo course example (replace for your course): Meta / app-install UI pieces
| | usage |
|---|---|
| `K.ig.feed(ph.body, {stories:true})` | IG home: wordmark bar, stories row, tab bar → `{el, scroll, tabbar}`; append posts to `scroll`, tween `scroll` `y` to scroll. |
| `K.ig.post({user, avatarColor, sponsored:true, media, ratio:1|0.8, cta:'Install now', ctaBlue:true, likes, caption, moreAt:46})` | `{el, media, cta, ctaFill, actions, caption}`. `media` = element (e.g. `K.creative`) or CSS background. CTA turns blue: `ctaBlue:false` then `tl.to(post.ctaFill, {'--k':1})` + `tl.set(post.cta, {className:'ig-cta blue'})`. |
| `K.ig.reel({kind:'reels'|'stories', media, user, primaryText, cta, safeZones:false, safeTop:.14, safeBottom:.20})` | full-screen 9:16 ad filling its parent (put in `phone({dark:true, overlayStatus:true}).screen`, set `reel.el.style.position='absolute'; inset=0`, or in any 9:16 box). Show safe zones: `tl.to([r.safeTop, r.safeBottom], {'--k':1})`. CTA highlight: `r.ctaFill` `--k`. |
| `K.ig.glyph(size)` | IG-style gradient camera glyph. |
| `K.creative({headline, sub, color:'a'|'b'|hex, app, look:'phone'|'bold', glyph})` | believable app-install creative (gradient, headline, app mock, app badge); fills its container. Concept A = teal, B = orange. |
| `K.am.shell({account, w:1640, h, tab:'campaigns'|'adsets'|'ads', title, selected:{campaigns:1}})` | Ads Manager app frame (rail, top bar, Campaigns/Ad sets/Ads tabs, toolbar with green **Create**) → `{el, tablewrap, tabs, toolbar, createBtn}`; append a table to `tablewrap`. |
| `K.am.table({columns, rows, footer})` | `columns` presets `K.am.cols.adsets` / `.campaigns` or custom `{key,label,w,num,prefix,suffix,decimals,type:'toggle'|'name'|'delivery'}`. Delivery values: `Active`, `Learning`, `Learning limited`, `Off`, `In review`, `Not delivering`. → `{el, rows, cell(i,key), switches, highlight(i, color, k)}`. Row highlight anim: `const tr = t.highlight(2,'amber',0); tl.to(tr, {'--k':1})`. |
| `K.am.objectives({selected})` | "Create new campaign" modal, six objectives with icon + radio, description pane → `{el, items:{Awareness,…,'App promotion',Sales}, select(tl, name, at, prev)}`. |
| `K.am.panel({w:640, sections:[{title, icon, rows:[{label, sub, toggle:bool, input:'NT$215', suffix:'TWD', select:'App installs', value:'On', adv:true}]}]})` | settings editor → `{el, rows[label], switches[label], inputs[label]}`. Flip a switch: `tl.to(p.switches['Advantage campaign budget'], {'--k':1, duration:.25})`. |
| `K.playStore(ph.body, {name, dev, color, rating, reviews, downloads, shots, about})` | Google Play listing → `{el, install}` (pulse/highlight `install`). |

## Tokens (`K.tokens`, CSS vars on `:root`)
`--bg #F4F2EE` · `--card #FFFFFF` · `--ink #1C1E21` · `--muted #65676B` · `--blue #1877F2` (Meta UI) ·
`--teal #0F9D8F` = **Concept A** · `--orange #F2780C` = **Concept B** (fixed meaning across all videos) ·
`--red #E5484D` danger · `--green #2EA44F` success · `--amber #F5A524` warning.
Fonts: `--font` (Inter + Noto Sans TC), `--font-tc`, `--font-hand` (LXGW WenKai TC — recap/notes only). Tone names for `color`/`tone` options: `red green blue amber teal orange neutral a b` or any hex.

## Size guide at zoom 1 (1080p)
Phone 416×870 (fills the safe height; frame one phone + callouts at zoom ≈ 0.8–1). Ads Manager shell 1640 wide (zoom ~1.1 shows the full table; zoom 1.6–2 on one row).
Callout text 26px, station labels 22px. Body text inside IG is real-size (14px) — zoom ≥ 1.4 when the caption itself is the point.

## Performance
~4 cores, software rendering. Avoid big `filter: blur()`/`backdrop-filter`; shadows are fine. Many hundreds of crowd dots are OK.

## English mode

For English courses call `K.setLang('en')` before building any component (3D pages: `lang: 'en'` per component). Usage, fonts, caveats: `/lib/classroom/EN.md`. Without it the kit stays in Chinese mode, pixel for pixel unchanged.
