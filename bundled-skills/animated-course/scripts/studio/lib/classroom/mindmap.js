// The ending blackboard's mindmap / diagram. Doc: /lib/classroom/MINDMAP.md
//   import { makeMindmap } from '/lib/classroom/mindmap.js';
//   const mm = await makeMindmap(board, { layout: 'radial', center: {text, t}, nodes: [{id, text, t, icon|photo|doodle, edge:{label}}] });
//   window.renderAt = t => { ...; mm.update(t); renderer.render(scene, cam); }     // mm.update(t) is a pure function of t
// All coordinates are blackboard-canvas px (2048×1068, cast.js's BOARD). Chalk uses cast.js's chalk() (grainy); photos are
// "paper" and get no grain.
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';

export const BW = C.BOARD.cw, BH = C.BOARD.ch;
export const COLORS = {
  white: C.CHALK.white, yellow: C.CHALK.yellow, pink: C.CHALK.pink, orange: C.CHALK.orange,
  teal: '#7fd6c9', blue: '#8fc2ff', green: '#9fe0a8', purple: '#cdb8f0', grey: 'rgba(244,241,230,0.55)',
  a: '#7fd6c9', b: C.CHALK.orange, red: C.CHALK.pink,          // Concept A = teal, Concept B = orange (same meaning as the DOM kit)
};
const col = c => COLORS[c] || c || COLORS.white;
const FONT = 'LXGW WenKai TC';   // its variant-shaped characters come from /lib/kit/tc-variants.css (S.loadFonts adds it)
// English chalk (spec.lang: 'en'): a handwriting font with big, open letters; see /lib/classroom/EN.md
export const CHALK_EN = { family: 'Kalam', weight: '700', css: '/node_modules/@fontsource/kalam/700.css' };
const clamp = S.clamp, lerp = S.lerp;

// ================================================================ chalk primitives (timed elements)
// An element: {t0, dur, draw(c, k), layer?: 'paper'}. k = 0..1 progress. All drawing is in board px.
export const el = {
  stroke: (pts, { color = 'white', width = 8, seed = 1, jitter } = {}, t0 = 0, dur = 0.4) => ({ t0, dur, draw: (c, k) => S.drawStroke(c, pts, k, { color: col(color), width, seed, jitter }) }),
  text: (str, x, y, { size = 64, color = 'white', align = 'center', font = FONT } = {}, t0 = 0, dur) => ({ t0, dur: dur ?? textDur(str), draw: (c, k) => writeLines(c, str, x, y, k, { size, color: col(color), align, font }) }),
  custom: (t0, dur, draw, layer) => ({ t0, dur, draw, layer }),
};
const textDur = str => Math.max(0.35, [...String(str)].filter(ch => /\S/.test(ch)).length * 0.075);
/** multi-line writeOn, (x, y) = centre of the text block */
function writeLines(c, str, x, y, k, { size, color, align, font, weight = '700' }) {
  const lines = String(str).split('\n'), n = lines.length, lh = size * 1.18;
  const lens = lines.map(l => [...l].length), tot = lens.reduce((a, b) => a + b, 0) || 1;
  let done = 0;
  lines.forEach((l, i) => {
    const kk = clamp((k * tot - done) / Math.max(1, lens[i])); done += lens[i];
    if (kk <= 0) return;
    const by = y - (n - 1) * lh / 2 + i * lh + size * 0.36;
    S.writeOn(c, l, x, by, kk, { font: `${weight} ${size}px "${font}"`, color, align });
  });
}
const measureCtx = document.createElement('canvas').getContext('2d');
function textSize(str, size, font = FONT, weight = '700') {
  measureCtx.font = `${weight} ${size}px "${font}"`;
  const lines = String(str).split('\n');
  const w = Math.max(...lines.map(l => [...l].reduce((a, ch) => a + measureCtx.measureText(ch).width, 0)));
  return { w, h: lines.length * size * 1.18 };
}
export const ellipsePts = (cx, cy, rx, ry, n = 48, a0 = -1.9, turns = 1.06) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * 6.283 * turns; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
export function roundRectPts(x, y, w, h, r = 18) {
  const p = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + i / 5 * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); p.push(p[0]);
  return p;
}
const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
/** dashed polyline revealed by k */
export function dashedStroke(c, pts, k, { color = 'white', width = 7, dash = 24, gap = 18, seed = 40 } = {}) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const L = Math.hypot(x1 - x0, y1 - y0); let d = 0;
    while (d < L) { const e = Math.min(L, d + dash); segs.push([[x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L], [x0 + (x1 - x0) * e / L, y0 + (y1 - y0) * e / L]]); d = e + gap; }
  }
  const n = segs.length * clamp(k);
  for (let i = 0; i < n; i++) S.drawStroke(c, segs[i], Math.min(1, n - i), { color: col(color), width, seed: seed + i, jitter: 0.8 });
}
/** arrow head (two short strokes) at the end of pts */
function headPts(pts, size) {
  const [x1, y1] = pts[pts.length - 1]; let j = pts.length - 2;
  while (j > 0 && Math.hypot(pts[j][0] - x1, pts[j][1] - y1) < size * 0.8) j--;
  const a = Math.atan2(y1 - pts[j][1], x1 - pts[j][0]);
  return [[[x1 - size * Math.cos(a - 0.5), y1 - size * Math.sin(a - 0.5)], [x1, y1]], [[x1, y1], [x1 - size * Math.cos(a + 0.5), y1 - size * Math.sin(a + 0.5)]]];
}
/** quadratic curve points from a to b, bulging by `bend` (fraction of the length, + = left of the direction) */
function curvePts(a, b, bend = 0, n = 28) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx + dy * bend, cy = my - dx * bend, p = [];
  for (let i = 0; i <= n; i++) { const u = i / n; p.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1]]); }
  return p;
}

// ================================================================ lucide icons traced as chalk
const ICON_CACHE = {};
let _svgHost = null;
/** Load + trace lucide icons (24-unit polylines). Called by makeMindmap for every icon it finds; call yourself for doodle icons. */
export async function loadChalkIcons(names) {
  if (!_svgHost) { _svgHost = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); _svgHost.setAttribute('width', '24'); _svgHost.setAttribute('height', '24'); _svgHost.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden'; document.body.append(_svgHost); }
  for (const name of [...new Set(names)]) {
    if (ICON_CACHE[name]) continue;
    const r = await fetch(`/node_modules/lucide-static/icons/${name}.svg`);
    if (!r.ok) { console.error('[mindmap] 找不到 lucide 圖示：' + name); ICON_CACHE[name] = []; continue; }
    const txt = await r.text();
    const inner = txt.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    _svgHost.innerHTML = inner;
    const polys = [];
    for (const g of _svgHost.querySelectorAll('path,circle,ellipse,rect,line,polyline,polygon')) {
      const L = g.getTotalLength(); if (!(L > 0)) continue;
      const n = Math.max(6, Math.ceil(L / 0.5)), step = L / n;
      let cur = [], prev = null;
      for (let i = 0; i <= n; i++) {
        const p = g.getPointAtLength(Math.min(L, i * step)), q = [p.x, p.y];
        if (prev && Math.hypot(q[0] - prev[0], q[1] - prev[1]) > step * 2.5) { if (cur.length > 1) polys.push(cur); cur = []; }
        cur.push(q); prev = q;
      }
      if (cur.length > 1) polys.push(cur);
    }
    ICON_CACHE[name] = polys;
  }
  _svgHost.innerHTML = '';
}
/** draw a traced icon centred at (cx, cy), `size` px wide, progress k (strokes one after another) */
export function drawIcon(c, name, cx, cy, size, k, { color = 'white', width, seed = 300 } = {}) {
  const polys = ICON_CACHE[name]; if (!polys || !polys.length) return;
  const s = size / 24, lens = polys.map(polyLen), tot = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  polys.forEach((p, i) => {
    const kk = clamp((k * tot - acc) / lens[i]); acc += lens[i];
    if (kk > 0) S.drawStroke(c, p.map(([x, y]) => [cx + (x - 12) * s, cy + (y - 12) * s]), kk, { color: col(color), width: width ?? Math.max(5, size * 0.07), seed: seed + i * 7, jitter: 0.7 });
  });
}

// ================================================================ doodles: record chalk ops in local coords, play them back in order
/**
 * A doodle is your own small chalk drawing (e.g. the keypoint figure redrawn small). doodle: {w, h, draw: d => {...}, dur}
 *   d.line([[x,y],...] | x0,y0,x1,y1, o)   d.rect(x,y,w,h,o)   d.circle(cx,cy,r,o)   d.ellipse(cx,cy,rx,ry,o)
 *   d.arrow(x0,y0,x1,y1,o)   d.dashed(pts,o)   d.hatch(x,y,w,h,o)   d.text(str,x,y,o)   d.icon(name,cx,cy,size,o)   d.dot(x,y,r,o)   d.cross(cx,cy,r,o)   d.check(cx,cy,r,o)
 *   o = {color:'white'|'yellow'|'teal'|…, width, size (text), bend (arrow/line), seed}
 */
function recordDoodle(spec, F = { family: FONT, weight: '700' }) {
  const ops = [];
  let seed = 500;
  const push = (w, draw) => ops.push({ w, draw });
  const L = pts => Math.max(20, polyLen(pts));
  const d = {
    line(a, b, c2, d2, o = {}) {
      let pts; if (Array.isArray(a)) { pts = a; o = b || {}; } else pts = [[a, b], [c2, d2]];
      if (o.bend) pts = curvePts(pts[0], pts[pts.length - 1], o.bend);
      const sd = seed++; push(L(pts), (c, k, X, Y) => S.drawStroke(c, pts.map(([x, y]) => [X + x, Y + y]), k, { color: col(o.color), width: o.width || 7, seed: sd }));
    },
    rect(x, y, w, h, o = {}) { const pts = o.r ? roundRectPts(x, y, w, h, o.r) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]; d.line(pts, o); },
    ellipse(cx, cy, rx, ry, o = {}) { d.line(ellipsePts(cx, cy, rx, ry, 40), o); },
    circle(cx, cy, r, o = {}) { d.ellipse(cx, cy, r, r, o); },
    arrow(x0, y0, x1, y1, o = {}) {
      const pts = o.bend ? curvePts([x0, y0], [x1, y1], o.bend) : [[x0, y0], [x1, y1]];
      const hs = headPts(pts, o.head || Math.max(22, (o.width || 7) * 3)), sd = seed++;
      push(L(pts) + 40, (c, k, X, Y) => {
        const off = p => p.map(([x, y]) => [X + x, Y + y]);
        S.drawStroke(c, off(pts), clamp(k / 0.82), { color: col(o.color), width: o.width || 7, seed: sd });
        if (k > 0.82) for (const h of hs) S.drawStroke(c, off(h), clamp((k - 0.82) / 0.18), { color: col(o.color), width: o.width || 7, seed: sd + 1 });
      });
    },
    dashed(pts, o = {}) { const sd = seed++; push(L(pts), (c, k, X, Y) => dashedStroke(c, pts.map(([x, y]) => [X + x, Y + y]), k, { color: o.color, width: o.width || 6, seed: sd })); },
    hatch(x, y, w, h, o = {}) {   // chalk shading: diagonal strokes clipped to the box
      const gap = o.gap || 13, sd = seed++, lines = [];
      for (let s = -h + gap / 2; s < w; s += gap) { const u0 = Math.max(0, -s), u1 = Math.min(h, w - s); if (u1 > u0) lines.push([[x + s + u0, y + h - u0], [x + s + u1, y + h - u1]]); }
      push(w + h, (c, k, X, Y) => { const n = lines.length * k; for (let i = 0; i < n; i++) S.drawStroke(c, lines[i].map(([px, py]) => [X + px, Y + py]), Math.min(1, n - i), { color: col(o.color), width: o.width || 5, seed: sd + i, jitter: 0.6 }); });
    },
    text(str, x, y, o = {}) { d._texts.push(str); push(textDur(str) * 400, (c, k, X, Y) => writeLines(c, str, X + x, Y + y, k, { size: o.size || 52, color: col(o.color), align: o.align || 'center', font: o.font || F.family, weight: o.font ? '700' : F.weight })); },
    icon(name, cx, cy, size, o = {}) { const sd = seed++; d._icons.push(name); push(size * 2.5, (c, k, X, Y) => drawIcon(c, name, X + cx, Y + cy, size, k, { color: o.color, width: o.width, seed: sd * 3 })); },
    dot(x, y, r = 8, o = {}) { push(15, (c, k, X, Y) => { c.fillStyle = col(o.color); c.beginPath(); c.arc(X + x, Y + y, r * k, 0, 7); c.fill(); }); },
    cross(cx, cy, r = 30, o = {}) { d.line(cx - r, cy - r, cx + r, cy + r, o); d.line(cx + r, cy - r, cx - r, cy + r, o); },
    check(cx, cy, r = 30, o = {}) { d.line([[cx - r, cy], [cx - r * 0.3, cy + r * 0.7], [cx + r, cy - r * 0.8]], o); },
    _icons: [], _texts: [],
  };
  spec.draw(d);
  const tot = ops.reduce((a, o) => a + o.w, 0) || 1;
  return {
    icons: d._icons, texts: d._texts.join(''), ops,
    draw(c, k, X, Y) { let acc = 0; for (const o of ops) { const kk = clamp((k * tot - acc) / o.w); acc += o.w; if (kk > 0) o.draw(c, kk, X, Y); } },
  };
}

// ================================================================ photos (paper on the board, white border + shadow + tape)
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { console.error('[mindmap] 照片載不到：' + src); res(null); }; im.src = src; });
function drawPhoto(c, ph, cx, cy, k) {
  if (k <= 0 || !ph.img) return;
  const { w, h, rot = 0, border = 12 } = ph;
  const s = 1.08 - 0.08 * S.ease.out(k);
  c.save(); c.globalAlpha *= Math.min(1, k * 2.5); c.translate(cx, cy); c.rotate(rot); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 16; c.shadowOffsetY = 7;
  c.fillStyle = '#fbfaf6'; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
  const [sx, sy, sw, sh] = ph.crop || [0, 0, ph.img.width, ph.img.height];
  c.drawImage(ph.img, sx, sy, sw, sh, -w / 2 + border, -h / 2 + border, w - 2 * border, h - 2 * border);
  if (ph.tape !== false) {
    c.fillStyle = 'rgba(240,228,190,0.86)';
    c.save(); c.translate(-w / 2 + 14, -h / 2 + 6); c.rotate(-0.62); c.fillRect(-32, -11, 64, 22); c.restore();
    c.save(); c.translate(w / 2 - 14, -h / 2 + 6); c.rotate(0.62); c.fillRect(-32, -11, 64, 22); c.restore();
  }
  c.restore();
}

// ================================================================ the mind map
const DEF = { center: 84, node: 64, leaf: 56, label: 56 };
const AREA = { x: 80, y: 56, w: 1888, h: 956 };
// radial branch slots (fractions of the area), in reading order
const RADIAL = {
  1: { c: [0.3, 0.5], b: [[0.74, 0.5]] },
  2: { c: [0.5, 0.5], b: [[0.15, 0.5], [0.85, 0.5]] },
  3: { c: [0.5, 0.14], b: [[0.15, 0.66], [0.5, 0.8], [0.85, 0.66]] },
  4: { c: [0.5, 0.5], b: [[0.15, 0.22], [0.85, 0.22], [0.15, 0.8], [0.85, 0.8]] },
  5: { c: [0.5, 0.44], b: [[0.14, 0.2], [0.86, 0.2], [0.14, 0.8], [0.5, 0.86], [0.86, 0.8]] },
  6: { c: [0.5, 0.48], b: [[0.14, 0.18], [0.5, 0.1], [0.86, 0.18], [0.14, 0.8], [0.5, 0.88], [0.86, 0.8]] },
};

/**
 * const mm = await makeMindmap(board, spec)
 *   board : the return value of C.makeBoard() ({cv, ctx, tex}); or null, then draw with mm.drawOn(ctx, t)
 *   spec.layout  'radial' (radial mindmap) | 'tree' (decision tree, top down) | 'flow' (process, left to right) | 'compare' (side by side)
 *   spec.center  {text, t, color:'yellow', size:84, frame:'ellipse'|'box'|'underline'|'none', icon, photo, doodle, pos:[x,y]}
 *   spec.nodes   [{id, text, t, parent:'center'|id, color, size, icon, iconSize, photo:{src|img, w, h, crop, rot}, doodle:{w,h,draw}, pic:'top'|'left', frame, pos:[x,y], dx, dy, side:'left'|'right', head,
 *                 edge:{label, style:'line'|'arrow'|'dashed'|'dashedArrow'|'none', color, t, bend, from}}]
 *   spec.edges   extra links [{from, to, label, style, color, t, bend, fromSide, toSide}]
 *   spec.divider true (vertical, the compare default) | false | {x} | {y} | {pts: [[x,y],[x,y]]}, plus {t}
 *   spec.area    {x,y,w,h} the usable area of the board; spec.screenScale board px → screen px (BC shot = 0.9), to check text reaches 50 px
 *   spec.wipe    {at, dur:0.6, prev:(ctx)=>{…}}: before at, draw prev (your own board); at at, the eraser wipes it, then the mindmap draws
 *   spec.lang    'en': English chalk (CHALK_EN = Kalam 700); writing speed and lint count English words; spec.font / spec.fontWeight set any font
 */
export async function makeMindmap(board, spec = {}) {
  const area = { ...AREA, ...(spec.area || {}) };
  const layout = spec.layout || 'radial';
  const screenScale = spec.screenScale ?? 0.9;
  const center = spec.center ? { id: 'center', isCenter: true, ...spec.center } : null;
  const nodes = (spec.nodes || []).map((n, i) => ({ id: n.id || 'n' + i, ...n }));
  const all = center ? [center, ...nodes] : nodes;
  const byId = Object.fromEntries(all.map(n => [n.id, n]));
  for (const n of nodes) if (n.parent === undefined && center && layout !== 'compare' && layout !== 'flow') n.parent = 'center';
  let divider = spec.divider ?? (layout === 'compare');

  // ---------- assets: fonts, icons, photos, doodles
  const EN = spec.lang === 'en';
  const F = { family: spec.font || (EN ? CHALK_EN.family : FONT), weight: String(spec.fontWeight || (EN ? CHALK_EN.weight : '700')) };
  if (EN && !spec.font && ![...document.styleSheets].some(s => (s.href || '').includes('@fontsource/kalam/'))) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CHALK_EN.css; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; });
  }
  // English writes ~2.5 letters per Chinese character: a faster pen per letter
  const tDur = str => EN ? Math.max(0.35, [...String(str)].filter(ch => /\S/.test(ch)).length * 0.042) : textDur(str);
  const glyphs = all.map(n => n.text || '').join('') + nodes.map(n => (n.edge && n.edge.label) || '').join('') + (spec.edges || []).map(e => e.label || '').join('') + '0123456789？！，、：＝→';
  const doodles = [];
  for (const n of all) if (n.doodle) { n._doodle = recordDoodle(n.doodle, F); doodles.push(n._doodle); }
  const dText = doodles.map(d => d.texts).join('');
  await S.loadFonts([F.family], glyphs + dText + (spec.extraGlyphs || ''), [F.weight]);
  await loadChalkIcons([...all.filter(n => n.icon).map(n => n.icon), ...doodles.flatMap(d => d.icons)]);
  for (const n of all) if (n.photo) {
    const p = n.photo; p.img = p.img || (p.src ? await loadImg(p.src) : null);
    if (p.img) { const [, , sw, sh] = p.crop || [0, 0, p.img.width, p.img.height]; p.w = p.w || 320; p.h = p.h || Math.round((p.w - 24) * sh / sw + 24); }
  }

  // radial centre over the one-line limit (CENTER_MAX) and without its own '\n': wrap it onto two balanced lines
  if (layout === 'radial' && center && center.text && !String(center.text).includes('\n') && units(center.text) > CENTER_MAX[EN ? 'en' : 'zh'])
    center.text = wrapTwo(String(center.text), center.size || DEF.center, F);

  // ---------- node boxes
  for (const n of all) {
    n.size = n.size || (n.isCenter ? DEF.center : (n.parent && n.parent !== 'center' && layout === 'radial') ? DEF.leaf : DEF.node);
    n.color = n.color || (n.isCenter ? 'yellow' : 'white');
    n.frame = n.frame || (n.isCenter ? (layout === 'radial' ? 'ellipse' : 'underline') : 'none');
    const ts = n.text ? textSize(n.text, n.size, F.family, F.weight) : { w: 0, h: 0 };
    const pw = n.photo ? n.photo.w : n.doodle ? n.doodle.w : n.icon ? (n.iconSize || 104) : 0;
    const ph = n.photo ? n.photo.h : n.doodle ? n.doodle.h : n.icon ? (n.iconSize || 104) : 0;
    n._ts = ts; n._pw = pw; n._ph = ph;
    const gap = pw && ts.w ? 22 : 0;
    if (n.pic === 'left') { n.w = pw + gap + ts.w; n.h = Math.max(ph, ts.h); }
    else { n.w = Math.max(pw, ts.w); n.h = ph + gap + ts.h; }
    n._gap = gap;
  }
  const A = (fx, fy) => [area.x + area.w * fx, area.y + area.h * fy];
  const kids = id => nodes.filter(n => n.parent === id);

  // ---------- layouts (positions = node centres); manual pos always wins
  if (layout === 'radial') {
    const br = center ? kids('center') : nodes;
    const slots = RADIAL[br.length];
    const cpos = slots ? A(...slots.c) : A(0.5, 0.5);
    if (center && !center.pos) center.pos = cpos;
    br.forEach((n, i) => {
      // three branches under a high centre: the three label midpoints sit almost on one row, so slide the middle label
      // down its line and the side labels up theirs (only for slot positions; labelDx / labelDy turn this off)
      if (!n.pos && center && br.length === 3) n._labelAt = i === 1 ? 0.7 : 0.4;
      if (!n.pos) n.pos = slots ? A(...slots.b[i]) : (() => { const a = -2.6 + i / br.length * 6.283; return [cpos[0] + Math.cos(a) * area.w * 0.36, cpos[1] + Math.sin(a) * area.h * 0.38]; })();
      placeKids(n);
    });
  } else if (layout === 'tree') {
    const root = center || nodes.find(n => !n.parent);
    const depthOf = n => (n === root ? 0 : 1 + depthOf(byId[n.parent] || root));
    const maxD = Math.max(0, ...all.map(depthOf));
    const leaves = n => { const k = all.filter(m => m.parent === n.id); return k.length ? k.reduce((a, m) => a + leaves(m), 0) : 1; };
    const rowY = d => area.y + root.h / 2 + 10 + (maxD ? d / maxD : 0) * (area.h - root.h / 2 - 10 - Math.max(...all.filter(n => depthOf(n) === maxD).map(n => n.h)) / 2 - 10);
    const place = (n, x0, x1, d) => {
      if (!n.pos) n.pos = [(x0 + x1) / 2, rowY(d)];
      const k = all.filter(m => m.parent === n.id), tot = k.reduce((a, m) => a + leaves(m), 0); let x = x0;
      for (const m of k) { const w = (x1 - x0) * leaves(m) / tot; place(m, x, x + w, d + 1); x += w; }
    };
    place(root, area.x, area.x + area.w, 0);
    for (const n of nodes) if (n.parent && byId[n.parent]) n.edge = { style: 'arrow', bend: 0, ...(n.edge || {}) };
  } else if (layout === 'flow') {
    const seq = nodes.filter(n => !n.parent || n.parent === 'center');
    const top = center ? area.y + center.h / 2 + 6 : area.y;
    if (center && !center.pos) center.pos = [area.x + area.w / 2, top];
    const cy = center ? (top + center.h / 2 + area.y + area.h) / 2 - 20 : area.y + area.h / 2;
    seq.forEach((n, i) => {
      if (!n.pos) n.pos = [area.x + area.w * (i + 0.5) / seq.length, cy];
      if (i > 0 && n.edge?.style !== 'none') n.edge = { from: seq[i - 1].id, style: 'arrow', bend: 0, ...(n.edge || {}) };
      else if (i === 0 && !n.edge) n.edge = { style: 'none' };
      placeKids(n);
    });
  } else if (layout === 'compare') {
    const top = center ? area.y + center.h / 2 + 6 : area.y;
    if (center && !center.pos) center.pos = [area.x + area.w / 2, top];
    const y0 = center ? top + center.h / 2 + 50 : area.y + 20;
    let yMax = y0;
    for (const side of ['left', 'right']) {
      const col = nodes.filter(n => (n.side || 'left') === side && !(n.parent && n.parent !== 'center'));
      const avail = area.y + area.h - y0, totalH = col.reduce((a, n) => a + n.h, 0), gap = col.length > 1 ? Math.min(90, (avail - totalH) / (col.length - 1)) : 0;
      let y = y0 + Math.max(0, (avail - totalH - gap * (col.length - 1)) * 0.3);
      yMax = Math.max(yMax, y + totalH + gap * (col.length - 1));
      const x = area.x + area.w * (side === 'left' ? 0.25 : 0.75);
      for (const n of col) { if (!n.pos) n.pos = [x, y + n.h / 2]; y += n.h + gap; if (!n.edge) n.edge = { style: 'none' }; }
    }
    if (divider === true) divider = { pts: [[area.x + area.w / 2, y0 - 10], [area.x + area.w / 2, Math.min(area.y + area.h - 10, yMax + 60)]] };
  }
  function placeKids(p) {   // children of a branch: stacked under it (or set pos yourself)
    const k = kids(p.id); let y = p.pos[1] + p.h / 2 + 64;
    for (const n of k) { if (!n.pos) n.pos = [p.pos[0], y + n.h / 2]; y += n.h + 40; placeKids(n); }
  }
  for (const n of all) {
    if (!n.pos) n.pos = A(0.5, 0.5);
    n.pos = [n.pos[0] + (n.dx || 0), n.pos[1] + (n.dy || 0)];
    n.box = { x: n.pos[0] - n.w / 2, y: n.pos[1] - n.h / 2, w: n.w, h: n.h, cx: n.pos[0], cy: n.pos[1] };
    if (n.frame === 'ellipse') { n.rx = n.w / 2 + 56; n.ry = n.h / 2 + 40; }
    else if (n.frame === 'box') { n.rx = n.w / 2 + 34; n.ry = n.h / 2 + 24; }
  }
  if (divider && !divider.pts) divider = divider === true ? { pts: [[area.x + area.w / 2, area.y], [area.x + area.w / 2, area.y + area.h]] }
    : divider.y != null ? { ...divider, pts: [[area.x + 20, divider.y], [area.x + area.w - 20, divider.y]] }
    : divider.x != null ? { ...divider, pts: [[divider.x, area.y], [divider.x, area.y + area.h]] } : null;

  // ---------- times (auto when missing: one after another)
  {
    let tt = 0;
    for (const n of all) { if (n.t == null) n.t = tt; tt = n.t + 1.4; }
  }

  // ---------- elements
  const els = [];
  const paper = [];
  const edgeList = [];
  for (const n of nodes) {
    const e = n.edge || {};
    const from = e.from || n.parent;
    if (!from || !byId[from] || e.style === 'none') continue;
    edgeList.push({ from, to: n.id, ...e, t: e.t ?? n.t - 0.5, _auto: true });
  }
  for (const e of spec.edges || []) edgeList.push({ ...e, t: e.t ?? Math.max(byId[e.from]?.tEnd ?? byId[e.from]?.t ?? 0, byId[e.to]?.t ?? 0) });
  // edges first (so a node's text sits on top of its line)
  edgeList.forEach((e, i) => {
    const a = byId[e.from], b = byId[e.to]; if (!a || !b) { console.error('[mindmap] 連線找不到節點：' + e.from + ' → ' + e.to); return; }
    const style = e.style || (layout === 'radial' ? 'line' : 'arrow');
    const bend = e.bend ?? (layout === 'radial' && a.isCenter ? (b.pos[0] < a.pos[0] ? -0.1 : b.pos[0] > a.pos[0] ? 0.1 : 0) : 0);
    const near = Math.hypot(b.pos[0] - a.pos[0], b.pos[1] - a.pos[1]) - (a.h + b.h) / 2 < 110;
    const pa = anchor(a, b.pos, e.fromSide, near ? 10 : 22), pb = anchor(b, a.pos, e.toSide, near ? 10 : style.includes('rrow') ? 16 : 22);
    let pts = curvePts(pa, pb, bend);
    const color = e.color || (b.isCenter ? 'white' : b.edgeColor || 'white');
    const width = e.width || 7, dur = e.dur ?? Math.min(0.6, 0.25 + polyLen(pts) / 2200);
    // label: written in a gap in the middle of the line
    let parts = [pts], lab = null;
    if (e.label) {
      const size = e.labelSize || DEF.label, ts = textSize(e.label, size, F.family, F.weight);
      const at = e._auto && e.labelDx == null && e.labelDy == null && e.from === 'center' ? b._labelAt : null;
      const mid = pts[at != null ? Math.round(at * (pts.length - 1)) : Math.floor(pts.length / 2)];
      lab = { x: mid[0] + (e.labelDx || 0), y: mid[1] + (e.labelDy || 0), size, ts };
      const inGap = ([x, y]) => Math.abs(x - lab.x) < ts.w / 2 + 12 && Math.abs(y - lab.y) < ts.h / 2 + 4;
      if (e.labelMode !== 'beside') {
        parts = []; let cur = [];
        for (const p of pts) { if (inGap(p)) { if (cur.length > 1) parts.push(cur); cur = []; } else cur.push(p); }
        if (cur.length > 1) parts.push(cur);
      }
      if (e.labelMode === 'beside') { const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L = Math.hypot(dx, dy) || 1, off = (Math.abs(dx) > Math.abs(dy) ? ts.h : ts.w) / 2 + 16; lab.x += -dy / L * off; lab.y += dx / L * off; }
      a._labels = (a._labels || []).concat([{ x: lab.x - ts.w / 2, y: lab.y - ts.h / 2, w: ts.w, h: ts.h, txt: e.label }]);
    }
    const lens = parts.map(polyLen), tot = lens.reduce((x, y) => x + y, 0) || 1;
    const heads = style.includes('rrow') ? headPts(pts, 30) : [];
    const dashed = style.startsWith('dashed');
    els.push({ t0: e.t, dur, bb: bbOf([...pts, ...heads.flat()], 30), draw: (c, k) => {
      let acc = 0; const kk = heads.length ? clamp(k / 0.85) : k;
      parts.forEach((p, j) => { const kj = clamp((kk * tot - acc) / lens[j]); acc += lens[j]; if (kj > 0) dashed ? dashedStroke(c, p, kj, { color, width: width - 1, seed: 700 + i * 13 + j }) : S.drawStroke(c, p, kj, { color: col(color), width, seed: 700 + i * 13 + j }); });
      if (heads.length && k > 0.85) for (const h of heads) S.drawStroke(c, h, clamp((k - 0.85) / 0.15), { color: col(color), width, seed: 790 + i });
    } });
    if (lab) els.push({ t0: e.labelT ?? e.t + dur * 0.6, dur: tDur(e.label), bb: { x: lab.x - lab.ts.w / 2 - 30, y: lab.y - lab.ts.h / 2 - 30, w: lab.ts.w + 60, h: lab.ts.h + 60 }, draw: (c, k) => writeLines(c, e.label, lab.x, lab.y, k, { size: lab.size, color: col(e.labelColor || e.color || 'yellow'), align: 'center', font: F.family, weight: F.weight }) });
  });
  if (divider) { const d = divider; els.push({ t0: d.t ?? (center ? center.t + 0.6 : 0), dur: 0.5, bb: bbOf(d.pts, 30), draw: (c, k) => S.drawStroke(c, d.pts, k, { color: COLORS.grey, width: 6, seed: 33 }) }); }
  // nodes
  all.forEach((n, i) => {
    const { cx, cy } = n.box;
    let px, py, tx, ty;
    if (n.pic === 'left') { px = n.box.x + n._pw / 2; py = cy; tx = n.box.x + n._pw + n._gap + n._ts.w / 2; ty = cy; }
    else { px = cx; py = n.box.y + n._ph / 2; tx = cx; ty = n.box.y + n._ph + n._gap + n._ts.h / 2; }
    let t = n.t;
    const picBB = { x: px - n._pw / 2 - 40, y: py - n._ph / 2 - 40, w: n._pw + 80, h: n._ph + 80 };
    const txtBB = { x: tx - n._ts.w / 2 - 30, y: ty - n._ts.h / 2 - 30, w: n._ts.w + 60, h: n._ts.h + 60 };
    const frBB = { x: cx - (n.rx || n.w / 2) - 40, y: cy - (n.ry || n.h / 2) - 40, w: (n.rx || n.w / 2) * 2 + 80, h: (n.ry || n.h / 2) * 2 + 80 };
    if (n.photo) { const ph = n.photo; paper.push({ t0: t, dur: 0.4, layer: 'paper', bb: picBB, draw: (c, k) => drawPhoto(c, ph, px, py, k) }); t += 0.35; }
    else if (n._doodle) { const dd = n._doodle, dur = n.doodle.dur ?? 1.0; els.push({ t0: t, dur, bb: picBB, draw: (c, k) => dd.draw(c, k, px - n._pw / 2, py - n._ph / 2) }); t += dur * 0.85; }
    else if (n.icon) { const dur = 0.7; els.push({ t0: t, dur, bb: picBB, draw: (c, k) => drawIcon(c, n.icon, px, py, n._pw, k, { color: n.iconColor || n.color, seed: 300 + i * 17 }) }); t += dur * 0.8; }
    if (n.text) { const d = n.textDur ?? tDur(n.text); els.push({ t0: t, dur: d, bb: txtBB, draw: (c, k) => writeLines(c, n.text, tx, ty, k, { size: n.size, color: col(n.color), align: 'center', font: F.family, weight: F.weight }) }); t += d; }
    if (n.frame === 'ellipse') els.push({ t0: t - 0.1, dur: 0.55, bb: frBB, draw: (c, k) => S.drawStroke(c, ellipsePts(cx, cy, n.rx, n.ry), k, { color: col(n.frameColor || 'white'), width: 9, seed: 900 + i }) });
    else if (n.frame === 'box') els.push({ t0: t - 0.1, dur: 0.6, bb: frBB, draw: (c, k) => S.drawStroke(c, roundRectPts(cx - n.rx, cy - n.ry, n.rx * 2, n.ry * 2, 26), k, { color: col(n.frameColor || n.color), width: 8, seed: 900 + i }) });
    else if (n.frame === 'underline') els.push({ t0: t - 0.1, dur: 0.35, bb: { ...txtBB, h: txtBB.h + 40 }, draw: (c, k) => S.drawStroke(c, [[tx - n._ts.w / 2 - 10, ty + n._ts.h / 2 + 12], [tx + n._ts.w / 2 + 10, ty + n._ts.h / 2 + 16]], k, { color: col(n.frameColor || n.color), width: 8, seed: 900 + i }) });
    n.tEnd = t + 0.3;
  });
  const chalkEls = els, paperEls = paper, extra = [];

  // ---------- lint (printed as console.error so render.cjs shows it; nothing breaks)
  const warnings = [];
  let total = 0;
  for (const n of all) {
    if (!n.text) continue;
    const u = units(n.text); total += (String(n.text).match(/[㐀-鿿]|[A-Za-z]+/g) || []).length;
    // the centre may take two lines; the one-line limit applies to each line
    const cMax = CENTER_MAX[EN ? 'en' : 'zh'], cLines = String(n.text).split('\n'), cOver = n.isCenter && (cLines.length > 2 || cLines.some(l => units(l) > cMax));
    if (EN) {   // English: count words
      if (!n.isCenter && u > 5) warnings.push(`node "${n.text}": ${u} words, keep it to 5`);
      if (cOver) warnings.push(`centre "${n.text}": ${u} words, keep it to ${cMax} per line, two lines at most`);
    } else {
    if (!n.isCenter && u > 8) warnings.push(`節點「${n.text}」${u} 個字，建議 8 字以內`);
    if (cOver) warnings.push(`中心「${n.text}」${u} 個字，建議每行 ${cMax} 字以內、最多兩行`);
    }
    if (n.size * screenScale < 50) warnings.push(`節點「${n.text}」字只有 ${(n.size * screenScale).toFixed(0)}px（螢幕上），至少 50px`);
  }
  for (const e of edgeList) if (e.label) { total += (String(e.label).match(/[㐀-鿿]|[A-Za-z]+/g) || []).length; if ((e.labelSize || DEF.label) * screenScale < 50) warnings.push(`連線字「${e.label}」不到 50px`); }
  if (EN ? total > 36 : total > 60) warnings.push(EN ? `the whole board has ${total} words, keep it to 36` : `整塊黑板 ${total} 個字（不算數字），建議 60 字以內`);
  const boxes = all.map(n => ({ n: n.text || n.id, x: n.box.x - (n.rx ? n.rx - n.w / 2 : 0), y: n.box.y - (n.ry ? n.ry - n.h / 2 : 0), w: n.rx ? n.rx * 2 : n.w, h: n.ry ? n.ry * 2 : n.h }));
  for (const n of all) for (const l of n._labels || []) boxes.push({ n: '連線字「' + l.txt + '」', ...l });
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (a.x < 10 || a.y < 10 || a.x + a.w > BW - 10 || a.y + a.h > BH - 10) warnings.push(`「${a.n}」超出黑板`);
    for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; if (a.x < b.x + b.w - 4 && b.x < a.x + a.w - 4 && a.y < b.y + b.h - 4 && b.y < a.y + a.h - 4) warnings.push(`「${a.n}」和「${b.n}」重疊`); }
  }
  for (const w of warnings) console.error('[mindmap 警告] ' + w);

  // ---------- drawing
  const q = k => Math.round(clamp(k) * 40);
  const kOf = (e, t) => clamp((t - e.t0) / Math.max(1e-3, e.dur));
  const wipe = spec.wipe ? { dur: 0.6, ...spec.wipe } : null;
  function drawOn(ctx, t) {
    C.chalk(ctx, c => { for (const e of chalkEls) { const k = kOf(e, t); if (k > 0) e.draw(c, k); } for (const e of extra) if (e.layer !== 'paper') { const k = kOf(e, t); if (k > 0) e.draw(c, k); } });
    for (const e of [...paperEls, ...extra.filter(e => e.layer === 'paper')]) { const k = kOf(e, t); if (k > 0) e.draw(ctx, k); }
  }
  let lastKey = '', myVersion = -1;
  function update(t) {
    if (!board) return false;
    const wk = wipe ? clamp((t - wipe.at) / wipe.dur) : 1;
    const key = (wipe && t < wipe.at ? 'prev' : q(wk)) + '|' + [...chalkEls, ...paperEls, ...extra].map(e => q(kOf(e, t))).join('');
    // skip only if nothing changed AND nobody else drew on the board since (three.js bumps tex.version on needsUpdate)
    if (key === lastKey && board.tex.version === myVersion && !(wipe && t < wipe.at)) return false;
    lastKey = key;
    const ctx = board.ctx;
    C.boardBase(ctx);
    if (wipe && t < wipe.at) { wipe.prev && wipe.prev(ctx, t); board.tex.needsUpdate = true; myVersion = board.tex.version; return true; }
    if (wipe && wk < 1) {
      wipe.prev && wipe.prev(ctx, wipe.at);
      const x = wk * BW * 1.06;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, BH); ctx.clip(); C.boardBase(ctx); ctx.restore();
      const g = ctx.createLinearGradient(x - 140, 0, x, 0); g.addColorStop(0, 'rgba(230,240,230,0)'); g.addColorStop(1, 'rgba(230,240,230,0.12)');
      ctx.fillStyle = g; ctx.fillRect(x - 140, 0, 140, BH);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x - 60, BH); ctx.clip(); drawOn(ctx, t); ctx.restore();
    } else drawFast(ctx, t);
    board.tex.needsUpdate = true; myVersion = board.tex.version;
    return true;
  }
  // Fast path: everything already finished is cached (base + chalk + photos) and only re-chalked when that set changes;
  // each frame then chalks just the bounding box of the elements being written right now.
  let cacheCv = null, cacheKey = null;
  function drawFast(ctx, t) {
    const chalkList = [...chalkEls, ...extra.filter(e => e.layer !== 'paper')], paperList = [...paperEls, ...extra.filter(e => e.layer === 'paper')];
    const ks = chalkList.map(e => kOf(e, t)), kp = paperList.map(e => kOf(e, t));
    const dkey = ks.map(k => (k >= 1 ? 1 : 0)).join('') + '|' + kp.map(k => (k >= 1 ? 1 : 0)).join('');
    if (!cacheCv) { cacheCv = document.createElement('canvas'); cacheCv.width = BW; cacheCv.height = BH; }
    if (dkey !== cacheKey) {
      const cc = cacheCv.getContext('2d');
      C.boardBase(cc);
      C.chalk(cc, c => chalkList.forEach((e, i) => { if (ks[i] >= 1) e.draw(c, 1); }));
      paperList.forEach((e, i) => { if (kp[i] >= 1) e.draw(cc, 1); });
      cacheKey = dkey;
    }
    ctx.drawImage(cacheCv, 0, 0);
    const live = chalkList.filter((e, i) => ks[i] > 0 && ks[i] < 1);
    if (live.length) {
      let r = null;
      for (const e of live) { const b = e.bb || { x: 0, y: 0, w: BW, h: BH }; r = r ? union(r, b) : { ...b }; }
      chalkRect(ctx, c => { for (const e of live) e.draw(c, kOf(e, t)); }, r);
    }
    paperList.forEach((e, i) => { if (kp[i] > 0 && kp[i] < 1) e.draw(ctx, kp[i]); });
  }
  const lastT = Math.max(...[...chalkEls, ...paperEls].map(e => e.t0 + e.dur));
  return {
    update, drawOn, warnings, nodes: byId, font: F, start: Math.min(...[...chalkEls, ...paperEls].map(e => e.t0)), end: lastT,
    /** add your own timed chalk elements (el.stroke / el.text / el.custom, or {t0,dur,draw(c,k),layer:'paper'}) */
    add(...e) { extra.push(...e.flat()); return this; },
    /** board-canvas point of a node (for the chopstick): mm.point('goal') -> [x, y] (side: 'top'|'bottom'|'left'|'right') */
    point(id, side) { const n = byId[id]; const b = n.box; return side === 'top' ? [b.cx, b.y] : side === 'bottom' ? [b.cx, b.y + b.h] : side === 'left' ? [b.x, b.cy] : side === 'right' ? [b.x + b.w, b.cy] : [b.cx, b.cy]; },
  };
}

/** one-line length limit of the centre text (Chinese characters / English words); a radial centre over it wraps to two lines */
const CENTER_MAX = { zh: 12, en: 7 };
/** length units the lint counts: one per CJK character, one per run of Latin letters / digits (an English word) */
const units = s => (String(s).match(/[㐀-鿿]|[A-Za-z0-9$+.,%]+/g) || []).length;
/** split one line into two of about equal width; prefers a break after punctuation or at a space, never inside a Latin word */
function wrapTwo(str, size, F) {
  const ch = [...str], w = s => textSize(s, size, F.family, F.weight).w;
  let best = null;
  for (let i = 1; i < ch.length; i++) {
    if (/[A-Za-z0-9]/.test(ch[i - 1]) && /[A-Za-z0-9'’]/.test(ch[i])) continue;
    const a = ch.slice(0, i).join('').trim(), b = ch.slice(i).join('').trim(); if (!a || !b) continue;
    const score = Math.abs(w(a) - w(b)) - (/[，、：；。！？,;:!?—]/.test(ch[i - 1]) ? size * 4 : /[\s\u3000]/.test(ch[i - 1] + ch[i]) ? size * 1.5 : 0);
    if (!best || score < best.score) best = { score, text: a + '\n' + b };
  }
  return best ? best.text : str;
}

/** point where a line from node n towards `to` leaves its frame / box, plus a gap */
function anchor(n, to, side, gap) {
  const b = n.box;
  if (side === 'left') return [b.x - gap, b.cy]; if (side === 'right') return [b.x + b.w + gap, b.cy];
  if (side === 'top') return [b.cx, b.y - gap]; if (side === 'bottom') return [b.cx, b.y + b.h + gap];
  const dx = to[0] - b.cx, dy = to[1] - b.cy, L = Math.hypot(dx, dy) || 1;
  if (n.rx && n.frame === 'ellipse') { const s = 1 / Math.sqrt((dx * dx) / (n.rx * n.rx) + (dy * dy) / (n.ry * n.ry)); return [b.cx + dx * s + dx / L * gap, b.cy + dy * s + dy / L * gap]; }
  const hw = (n.rx || b.w / 2), hh = (n.ry || b.h / 2);
  const s = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity);
  return [b.cx + dx * s + dx / L * gap, b.cy + dy * s + dy / L * gap];
}

const bbOf = (pts, pad = 20) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad; return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }; };
const union = (a, b) => { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
// Same chalk look as cast.js chalk() (same grain, same glow), but only inside rect r — so a frame costs what the new strokes cost.
let _grain = null, _layer = null;
function grainCanvas() {   // identical to cast.js grainCanvas() (seed 99), so cached and live strokes match exactly
  if (_grain) return _grain;
  const cv = document.createElement('canvas'); cv.width = BW; cv.height = BH; const c = cv.getContext('2d');
  const r = S.rng(99); const img = c.createImageData(cv.width, cv.height);
  for (let i = 0; i < img.data.length; i += 4) { const v = r(); img.data[i + 3] = v < 0.22 ? 255 * (0.35 + r() * 0.5) : (v < 0.3 ? 90 : 0); }
  c.putImageData(img, 0, 0);
  c.globalAlpha = 0.5; c.strokeStyle = '#000';
  for (let i = 0; i < 1600; i++) { c.lineWidth = 1 + r() * 1.5; const x = r() * cv.width, y = r() * cv.height; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 3); c.stroke(); }
  return (_grain = cv);
}
function chalkRect(boardCtx, fn, r) {
  const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y)), w = Math.min(BW, Math.ceil(r.x + r.w)) - x, h = Math.min(BH, Math.ceil(r.y + r.h)) - y;
  if (w <= 0 || h <= 0) return;
  if (!_layer) { _layer = document.createElement('canvas'); _layer.width = BW; _layer.height = BH; }
  const c = _layer.getContext('2d');
  c.clearRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); fn(c); c.restore();
  c.globalCompositeOperation = 'destination-out'; c.drawImage(grainCanvas(), x, y, w, h, x, y, w, h); c.globalCompositeOperation = 'source-over';
  boardCtx.save(); boardCtx.beginPath(); boardCtx.rect(x, y, w, h); boardCtx.clip();
  boardCtx.shadowColor = 'rgba(255,255,240,0.18)'; boardCtx.shadowBlur = 6; boardCtx.drawImage(_layer, x, y, w, h, x, y, w, h); boardCtx.restore();
}
