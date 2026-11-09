// Engram studio — the ending mindmap on the classroom board (any H.panel canvas). Same data format and layouts as
// lib/classroom/mindmap.js (radial, tree, flow, compare; nodes with icon / photo / doodle; edges with labels;
// mm.add, mm.point, mm.update), drawn in the house look instead of chalk: the centre is the solid cyan capsule,
// nodes with a picture are small house panels (picture + ≤ 8 characters), nodes without one are chips, links are
// smooth lines with an anchor dot, edge labels are small chips. New: `divider` (a hairline that splits the board,
// e.g. the map above and "tomorrow / next lesson" below) and `tone` on a node (chip colour by meaning).
//
//   import { makeMindmap, el } from '/lib/house/mindmap.js';
//   const mm = await makeMindmap(C.board, { layout: 'flow', center: { text, t }, nodes: [...], divider: { y: 790 } });
//   window.renderAt = t => { mm.update(t); … };      // pure of t; redraws the panel only when something changed
//   window.TEXTS = t => mm.texts(t).map(b => ({ ...b, ...C.board.boxToScreen(b.x0, b.y0, b.x1, b.y1) }));
//
// Colour names of the chalk format map to the house grammar: white → blue-grey (neutral), yellow / teal / blue /
// green → cyan (the accent), pink / red → magenta, orange → amber (the student's), grey → grey (not yet).
import { loadFonts } from './tokens.js';
import { measure, fontOf, strokeOn, arrowHead, textOn, drawChip, rr, colOf } from './board.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const out = k => 1 - Math.pow(1 - clamp(k), 3);
const sm = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

/** chalk colour names → house token names: [stroke, text] */
const CMAP = {
  white: ['ink3', 'ink'], yellow: ['line', 'cyanInk'], teal: ['line', 'cyanInk'], a: ['line', 'cyanInk'], blue: ['line', 'cyanInk'], green: ['line', 'cyanInk'],
  pink: ['magenta', 'magentaInk'], red: ['magenta', 'magentaInk'], orange: ['amber', 'amberInk'], b: ['amber', 'amberInk'], purple: ['ink2', 'ink2'], grey: ['grey', 'greyInk'],
};
const sCol = (c, L) => colOf(CMAP[c] ? CMAP[c][0] : c || 'ink3', L);
const tCol = (c, L) => colOf(CMAP[c] ? CMAP[c][1] : c || 'ink', L);
const TONE_OF = { white: '', yellow: 'accent', teal: 'accent', a: 'accent', blue: 'accent', green: 'accent', pink: 'warn', red: 'warn', orange: 'student', b: 'student', grey: 'later', purple: '' };

// ================================================================ timed elements (same idea as the chalk version)
/** your own timed elements: mm.add(el.stroke(pts, {color, width}, t0, dur), el.text(str, x, y, {size, color}, t0), el.custom(t0, dur, (c, k, L) => …)) */
export const el = {
  stroke: (pts, { color = 'white', width = 6, dash } = {}, t0 = 0, dur = 0.4) => ({ t0, dur, draw: (c, k, L) => strokeOn(c, pts, k, { color: sCol(color, L), width, dash }) }),
  text: (str, x, y, { size = 52, color = 'white', align = 'center', weight = 800 } = {}, t0 = 0, dur = 0.4) => ({ t0, dur, str, draw: (c, k, L) => textOn(c, str, x, y + size * 0.36, k, { size, weight, color: tCol(color, L), align }) }),
  custom: (t0, dur, draw) => ({ t0, dur, draw }),
};

// ================================================================ doodles: the chalk recorder API, drawn crisp
const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const ellipsePts = (cx, cy, rx, ry, n = 48) => { const p = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
function curvePts(a, b, bend = 0, n = 28) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx + dy * bend, cy = my - dx * bend, p = [];
  for (let i = 0; i <= n; i++) { const u = i / n; p.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1]]); }
  return p;
}
/** S-link (vertical tangents) from a to b */
function sPts(a, b, n = 32) { const p = [], my = (a[1] + b[1]) / 2; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; p.push([v * v * v * a[0] + 3 * v * v * u * a[0] + 3 * v * u * u * b[0] + u * u * u * b[0], v * v * v * a[1] + 3 * v * v * u * my + 3 * v * u * u * my + u * u * u * b[1]]); } return p; }
const roundRectPts = (x, y, w, h, r = 14) => { const p = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + i / 5 * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }; arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); p.push(p[0]); return p; };

const ICONS = {};
/** lucide icons as Path2D (crisp strokes). Loaded once by makeMindmap for every icon name it finds. */
export async function loadIcons(names) {
  for (const name of [...new Set(names)]) {
    if (ICONS[name]) continue;
    const r = await fetch(`/node_modules/lucide-static/icons/${name}.svg`); if (!r.ok) { console.error('[mindmap] no lucide icon ' + name); ICONS[name] = []; continue; }
    const doc = new DOMParser().parseFromString(await r.text(), 'image/svg+xml'), ps = [];
    for (const g of doc.querySelectorAll('path,circle,ellipse,rect,line,polyline,polygon')) {
      const a = n => +g.getAttribute(n) || 0; let d = '';
      switch (g.tagName) {
        case 'path': d = g.getAttribute('d'); break;
        case 'circle': d = `M${a('cx') - a('r')},${a('cy')} a${a('r')},${a('r')} 0 1,0 ${2 * a('r')},0 a${a('r')},${a('r')} 0 1,0 ${-2 * a('r')},0`; break;
        case 'ellipse': d = `M${a('cx') - a('rx')},${a('cy')} a${a('rx')},${a('ry')} 0 1,0 ${2 * a('rx')},0 a${a('rx')},${a('ry')} 0 1,0 ${-2 * a('rx')},0`; break;
        case 'rect': { const x = a('x'), y = a('y'), w = a('width'), h = a('height'), rx = Math.min(a('rx') || a('ry'), w / 2, h / 2); d = `M${x + rx},${y} h${w - 2 * rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${h - 2 * rx} a${rx},${rx} 0 0 1 ${-rx},${rx} h${-(w - 2 * rx)} a${rx},${rx} 0 0 1 ${-rx},${-rx} v${-(h - 2 * rx)} a${rx},${rx} 0 0 1 ${rx},${-rx} z`; break; }
        case 'line': d = `M${a('x1')},${a('y1')} L${a('x2')},${a('y2')}`; break;
        default: d = 'M' + g.getAttribute('points').trim().replace(/\s+/g, ' L') + (g.tagName === 'polygon' ? ' Z' : '');
      }
      ps.push(new Path2D(d));
    }
    ICONS[name] = ps;
  }
}
/** draw a lucide icon centred at (cx, cy), `size` px, k = reveal (fade + scale) */
export function drawIcon(c, name, cx, cy, size, k, color, width) {
  const ps = ICONS[name]; if (!ps || !ps.length || k <= 0) return;
  const s = size / 24 * lerp(0.9, 1, out(k)); c.save(); c.globalAlpha *= clamp(k * 1.6); c.translate(cx, cy); c.scale(s, s); c.translate(-12, -12);
  c.lineWidth = (width ?? Math.max(4, size * 0.055)) / s; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color; for (const p of ps) c.stroke(p); c.restore();
}

function recordDoodle(spec) {
  const ops = [], texts = [], icons = [];
  const push = (w, draw) => ops.push({ w, draw });
  const L = pts => Math.max(20, polyLen(pts));
  const d = {
    line(a, b, c2, d2, o = {}) { let pts; if (Array.isArray(a)) { pts = a; o = b || {}; } else pts = [[a, b], [c2, d2]]; if (o.bend) pts = curvePts(pts[0], pts[pts.length - 1], o.bend);
      push(L(pts), (c, k, X, Y, LL) => strokeOn(c, pts.map(([x, y]) => [X + x, Y + y]), k, { color: sCol(o.color, LL), width: o.width || 6 })); },
    rect(x, y, w, h, o = {}) { if (o.fill) push(w + h, (c, k, X, Y, LL) => { c.save(); c.globalAlpha *= 0.22 * k; rr(c, X + x, Y + y, w, h, o.r || 0); c.fillStyle = sCol(o.fill, LL); c.fill(); c.restore(); }); d.line(o.r ? roundRectPts(x, y, w, h, o.r) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], o); },
    ellipse(cx, cy, rx, ry, o = {}) { d.line(ellipsePts(cx, cy, rx, ry), o); },
    circle(cx, cy, r, o = {}) { d.ellipse(cx, cy, r, r, o); },
    arrow(x0, y0, x1, y1, o = {}) { const pts = o.bend ? curvePts([x0, y0], [x1, y1], o.bend) : [[x0, y0], [x1, y1]];
      push(L(pts) + 40, (c, k, X, Y, LL) => { const p = pts.map(([x, y]) => [X + x, Y + y]), col = sCol(o.color, LL); strokeOn(c, p, clamp(k / 0.85), { color: col, width: o.width || 6 }); if (k > 0.85) arrowHead(c, p, o.head || Math.max(18, (o.width || 6) * 3.4), col); }); },
    dashed(pts, o = {}) { push(L(pts), (c, k, X, Y, LL) => strokeOn(c, pts.map(([x, y]) => [X + x, Y + y]), k, { color: sCol(o.color, LL), width: o.width || 5, dash: [16, 11], cap: 'butt' })); },
    hatch(x, y, w, h, o = {}) { push(w + h, (c, k, X, Y, LL) => { c.save(); c.globalAlpha *= 0.32 * k; c.fillStyle = sCol(o.color, LL); c.fillRect(X + x, Y + y, w * k, h); c.restore(); }); },
    text(str, x, y, o = {}) { texts.push(str); const size = (o.size || 44) * 0.86; push(160, (c, k, X, Y, LL) => textOn(c, str, X + x, Y + y + size * 0.36, k, { size, weight: 800, color: tCol(o.color || 'white', LL), align: o.align || 'center' })); },
    icon(name, cx, cy, size, o = {}) { icons.push(name); push(size * 2, (c, k, X, Y, LL) => drawIcon(c, name, X + cx, Y + cy, size, k, sCol(o.color, LL), o.width)); },
    dot(x, y, r = 8, o = {}) { push(15, (c, k, X, Y, LL) => { c.fillStyle = sCol(o.color, LL); c.beginPath(); c.arc(X + x, Y + y, r * k, 0, 7); c.fill(); }); },
    cross(cx, cy, r = 30, o = {}) { d.line(cx - r, cy - r, cx + r, cy + r, o); d.line(cx + r, cy - r, cx - r, cy + r, o); },
    check(cx, cy, r = 30, o = {}) { d.line([[cx - r, cy], [cx - r * 0.3, cy + r * 0.7], [cx + r, cy - r * 0.8]], o); },
  };
  spec.draw(d);
  const tot = ops.reduce((a, o) => a + o.w, 0) || 1;
  return { texts: texts.join(''), icons, draw(c, k, X, Y, LL) { let acc = 0; for (const o of ops) { const kk = clamp((k * tot - acc) / o.w); acc += o.w; if (kk > 0) o.draw(c, kk, X, Y, LL); } } };
}
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { console.error('[mindmap] photo did not load: ' + src); res(null); }; im.src = src; });

// ================================================================ layouts (board px; fractions of `area`)
const AREA = { x: 80, y: 60, w: 1888, h: 950 };
const RADIAL = {
  1: { c: [0.3, 0.5], b: [[0.74, 0.5]] }, 2: { c: [0.5, 0.5], b: [[0.15, 0.5], [0.85, 0.5]] },
  3: { c: [0.5, 0.14], b: [[0.15, 0.66], [0.5, 0.8], [0.85, 0.66]] }, 4: { c: [0.5, 0.5], b: [[0.15, 0.22], [0.85, 0.22], [0.15, 0.8], [0.85, 0.8]] },
  5: { c: [0.5, 0.44], b: [[0.14, 0.2], [0.86, 0.2], [0.14, 0.8], [0.5, 0.86], [0.86, 0.8]] }, 6: { c: [0.5, 0.48], b: [[0.14, 0.18], [0.5, 0.1], [0.86, 0.18], [0.14, 0.8], [0.5, 0.88], [0.86, 0.8]] },
};
const DEF = { center: 66, node: 52, leaf: 46, label: 40 };

/**
 * const mm = await makeMindmap(target, spec)
 *   target : makeClassroom().board, an H.panel, or null (then use mm.drawOn(ctx, t, L))
 *   spec.layout  'radial' | 'tree' | 'flow' | 'compare'            (as lib/classroom/mindmap.js)
 *   spec.center  {text, t, color, size, frame: 'capsule' (default) | 'none' | 'underline', icon|photo|doodle, pos}
 *   spec.nodes   [{id, text, t, parent, color, tone, size, icon, iconSize, photo, doodle, pic: 'top'|'left', pos, dx, dy, side, edge: {label, style, color, t, bend, from}}]
 *   spec.edges   extra links [{from, to, label, style, color, t, bend, fromSide, toSide}]
 *   spec.area    {x, y, w, h}   spec.screenScale  board px → screen px (lint: text ≥ 28 px on screen)
 *   spec.divider true (vertical, the compare default) | false | {x} | {y} | {pts: [[x,y],[x,y]]}, plus {t, label}
 *   spec.picScale   doodles drawn at this scale (1); a doodle may set its own `scale`
 *   spec.typeScale  sizes given in the chalk format are multiplied by this (0.86: typeset text reads bigger than chalk)
 *   spec.wipe    {at, dur, prev(c, L, t)}: your board before `at`, a scan band wipes it into the mindmap
 */
export async function makeMindmap(target, spec = {}) {
  const panel = target && (target.panel || target);
  const area = { ...AREA, ...(spec.area || {}) };
  const layout = spec.layout || 'radial';
  const screenScale = spec.screenScale ?? 0.84, ts = spec.typeScale ?? 0.86;
  const center = spec.center ? { id: 'center', isCenter: true, ...spec.center } : null;
  const nodes = (spec.nodes || []).map((n, i) => ({ id: n.id || 'n' + i, ...n }));
  const all = center ? [center, ...nodes] : nodes;
  const byId = Object.fromEntries(all.map(n => [n.id, n]));
  for (const n of nodes) if (n.parent === undefined && center && layout !== 'compare' && layout !== 'flow') n.parent = 'center';

  // ---------- assets
  for (const n of all) if (n.doodle) n._doodle = recordDoodle(n.doodle);
  const glyphs = all.map(n => n.text || '').join('') + nodes.map(n => (n.edge && n.edge.label) || '').join('') + (spec.edges || []).map(e => e.label || '').join('') + all.map(n => n._doodle ? n._doodle.texts : '').join('') + (spec.extraGlyphs || '') + '0123456789？！，、：＝→·';
  await loadFonts(glyphs);
  await loadIcons([...all.filter(n => n.icon).map(n => n.icon), ...all.flatMap(n => n._doodle ? n._doodle.icons : [])]);
  for (const n of all) if (n.photo) { const p = n.photo; p.img = p.img || (p.src ? await loadImg(p.src) : null); if (p.img) { const [, , sw, sh] = p.crop || [0, 0, p.img.width, p.img.height]; p.w = p.w || 320; p.h = p.h || Math.round((p.w - 20) * sh / sw + 20); } }

  // ---------- node boxes (card: picture + text inside a panel; chip: text only; capsule: the centre)
  for (const n of all) {
    n.size = Math.round((n.size || (n.isCenter ? DEF.center / ts : (n.parent && n.parent !== 'center' && layout === 'radial') ? DEF.leaf / ts : DEF.node / ts)) * ts);
    n.color = n.color || (n.isCenter ? 'yellow' : 'white');
    n.kind = n.isCenter ? (n.frame === 'none' || n.frame === 'underline' ? 'plain' : 'capsule') : (n.photo || n.doodle || n.icon) ? 'card' : 'chip';
    if (n.isCenter && (n.photo || n.doodle || n.icon)) n.kind = 'card';
    n.tone = n.tone ?? TONE_OF[n.color] ?? '';
    const lines = String(n.text || '').split('\n'), tw = n.text ? Math.max(...lines.map(l => measure(l, n.size, 800))) : 0, th = n.text ? lines.length * n.size * 1.22 : 0;
    n._ps = n.doodle ? (n.doodle.scale ?? spec.picScale ?? 1) : 1;
    const pw = n.photo ? n.photo.w : n.doodle ? n.doodle.w * n._ps : n.icon ? (n.iconSize || 104) : 0, ph = n.photo ? n.photo.h : n.doodle ? n.doodle.h * n._ps : n.icon ? (n.iconSize || 104) : 0;
    n._tw = tw; n._th = th; n._pw = pw; n._ph = ph; n._lines = lines;
    if (n.kind === 'card') { const gap = pw && tw ? 16 : 0, pad = 26; n._gap = gap; n._pad = pad;
      if (n.pic === 'left') { n.w = pw + gap + tw + pad * 2; n.h = Math.max(ph, th) + pad * 2; } else { n.w = Math.max(pw, tw) + pad * 2; n.h = ph + gap + th + pad * 2 - 6; } }
    else if (n.kind === 'capsule') { n.w = tw + 84; n.h = th + 44; }
    else if (n.kind === 'chip') { n.w = tw + 52; n.h = Math.round(n.size * 1.62); }
    else { n.w = tw; n.h = th + 14; }
  }
  const A = (fx, fy) => [area.x + area.w * fx, area.y + area.h * fy];
  const kids = id => nodes.filter(n => n.parent === id);
  function placeKids(p) { const k = kids(p.id); let y = p.pos[1] + p.h / 2 + 64; for (const n of k) { if (!n.pos) n.pos = [p.pos[0], y + n.h / 2]; y += n.h + 40; placeKids(n); } }
  let divider = spec.divider ?? (layout === 'compare');
  if (layout === 'radial') {
    const br = center ? kids('center') : nodes, slots = RADIAL[br.length], cpos = slots ? A(...slots.c) : A(0.5, 0.5);
    if (center && !center.pos) center.pos = cpos;
    br.forEach((n, i) => { if (!n.pos) n.pos = slots ? A(...slots.b[i]) : (() => { const a = -2.6 + i / br.length * 6.283; return [cpos[0] + Math.cos(a) * area.w * 0.36, cpos[1] + Math.sin(a) * area.h * 0.38]; })(); placeKids(n); });
  } else if (layout === 'tree') {
    const root = center || nodes.find(n => !n.parent);
    const depthOf = n => (n === root ? 0 : 1 + depthOf(byId[n.parent] || root));
    const maxD = Math.max(0, ...all.map(depthOf));
    const leaves = n => { const k = all.filter(m => m.parent === n.id); return k.length ? k.reduce((a, m) => a + leaves(m), 0) : 1; };
    const rowY = d => area.y + root.h / 2 + 10 + (maxD ? d / maxD : 0) * (area.h - root.h / 2 - 10 - Math.max(...all.filter(n => depthOf(n) === maxD).map(n => n.h)) / 2 - 10);
    const place = (n, x0, x1, d) => { if (!n.pos) n.pos = [(x0 + x1) / 2, rowY(d)]; const k = all.filter(m => m.parent === n.id), tot = k.reduce((a, m) => a + leaves(m), 0); let x = x0; for (const m of k) { const w = (x1 - x0) * leaves(m) / tot; place(m, x, x + w, d + 1); x += w; } };
    place(root, area.x, area.x + area.w, 0);
    for (const n of nodes) if (n.parent && byId[n.parent]) n.edge = { style: 'arrow', bend: 0, ...(n.edge || {}) };
  } else if (layout === 'flow') {
    const seq = nodes.filter(n => !n.parent || n.parent === 'center');
    const top = center ? area.y + center.h / 2 + 6 : area.y;
    if (center && !center.pos) center.pos = [area.x + area.w / 2, top];
    const cy = center ? (top + center.h / 2 + area.y + area.h) / 2 - 20 : area.y + area.h / 2;
    seq.forEach((n, i) => { if (!n.pos) n.pos = [area.x + area.w * (i + 0.5) / seq.length, cy]; if (i > 0 && n.edge?.style !== 'none') n.edge = { from: seq[i - 1].id, style: 'arrow', bend: 0, ...(n.edge || {}) }; else if (i === 0 && !n.edge) n.edge = { style: 'none' }; placeKids(n); });
  } else if (layout === 'compare') {
    const top = center ? area.y + center.h / 2 + 6 : area.y;
    if (center && !center.pos) center.pos = [area.x + area.w / 2, top];
    const y0 = center ? top + center.h / 2 + 50 : area.y + 20; let yMax = y0;
    for (const side of ['left', 'right']) {
      const col = nodes.filter(n => (n.side || 'left') === side && !(n.parent && n.parent !== 'center'));
      const avail = area.y + area.h - y0, totalH = col.reduce((a, n) => a + n.h, 0), gap = col.length > 1 ? Math.min(90, (avail - totalH) / (col.length - 1)) : 0;
      let y = y0 + Math.max(0, (avail - totalH - gap * (col.length - 1)) * 0.3); yMax = Math.max(yMax, y + totalH + gap * (col.length - 1));
      const x = area.x + area.w * (side === 'left' ? 0.25 : 0.75);
      for (const n of col) { if (!n.pos) n.pos = [x, y + n.h / 2]; y += n.h + gap; if (!n.edge) n.edge = { style: 'none' }; }
    }
    if (divider === true) divider = { pts: [[area.x + area.w / 2, y0 - 10], [area.x + area.w / 2, Math.min(area.y + area.h - 10, yMax + 60)]] };
  }
  for (const n of all) {
    if (!n.pos) n.pos = A(0.5, 0.5);
    n.pos = [n.pos[0] + (n.dx || 0), n.pos[1] + (n.dy || 0)];
    n.box = { x: n.pos[0] - n.w / 2, y: n.pos[1] - n.h / 2, w: n.w, h: n.h, cx: n.pos[0], cy: n.pos[1] };
  }
  if (divider && !divider.pts) divider = divider === true ? { pts: [[area.x + area.w / 2, area.y], [area.x + area.w / 2, area.y + area.h]] } : divider.y != null ? { ...divider, pts: [[area.x + 20, divider.y], [area.x + area.w - 20, divider.y]] } : divider.x != null ? { ...divider, pts: [[divider.x, area.y], [divider.x, area.y + area.h]] } : null;

  // ---------- times (auto when missing: one after another)
  { let tt = 0; for (const n of all) { if (n.t == null) n.t = tt; tt = n.t + 1.4; } }

  // ---------- elements {t0, dur, draw(c, k, L), read?, box?}
  const els = [], edgeList = [];
  for (const n of nodes) { const e = n.edge || {}; const from = e.from || n.parent; if (!from || !byId[from] || e.style === 'none') continue; edgeList.push({ from, to: n.id, ...e, t: e.t ?? n.t - 0.4 }); }
  for (const e of spec.edges || []) edgeList.push({ ...e, t: e.t ?? Math.max(byId[e.from]?.tEnd ?? byId[e.from]?.t ?? 0, byId[e.to]?.t ?? 0) });
  const anchorOf = (n, to, side, gap) => {
    const b = n.box; if (side === 'left') return [b.x - gap, b.cy]; if (side === 'right') return [b.x + b.w + gap, b.cy]; if (side === 'top') return [b.cx, b.y - gap]; if (side === 'bottom') return [b.cx, b.y + b.h + gap];
    const dx = to[0] - b.cx, dy = to[1] - b.cy, L = Math.hypot(dx, dy) || 1, s = Math.min(Math.abs(dx) > 1e-6 ? b.w / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? b.h / 2 / Math.abs(dy) : Infinity);
    return [b.cx + dx * s + dx / L * gap, b.cy + dy * s + dy / L * gap];
  };
  const labels = [];
  edgeList.forEach(e => {
    const a = byId[e.from], b = byId[e.to]; if (!a || !b) { console.error('[mindmap] link to a missing node: ' + e.from + ' → ' + e.to); return; }
    const style = e.style || (layout === 'radial' ? 'line' : 'arrow'), arrowed = style.includes('rrow'), dashed = style.startsWith('dashed');
    let pts;
    const below = b.box.y > a.box.y + a.box.h - 4;
    if (layout === 'radial' && a.isCenter && below && e.bend == null) pts = sPts([a.box.cx, a.box.y + a.box.h + 4], [b.box.cx, b.box.y - 10]);
    else { const pa = anchorOf(a, b.pos, e.fromSide, 12), pb = anchorOf(b, a.pos, e.toSide, arrowed ? 14 : 10); pts = curvePts(pa, pb, e.bend ?? (layout === 'radial' && a.isCenter ? (b.pos[0] < a.pos[0] ? -0.08 : b.pos[0] > a.pos[0] ? 0.08 : 0) : 0)); }
    const width = e.width || 5, dur = e.dur ?? Math.min(0.55, 0.25 + polyLen(pts) / 2400);
    els.push({ t0: e.t, dur, draw: (c, k, L) => { const col = sCol(e.color || (arrowed ? 'white' : 'yellow'), L); strokeOn(c, pts, arrowed ? clamp(k / 0.85) : k, { color: col, width, dash: dashed ? [18, 12] : null });
      if (arrowed && k > 0.85) arrowHead(c, pts, 24, col);
      if (!arrowed && k >= 1) { const [x, y] = pts[pts.length - 1]; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fillStyle = L.anchorFill; c.fill(); c.lineWidth = 4; c.strokeStyle = col; c.stroke(); } } });
    if (e.label) {
      const mid = pts[Math.floor(pts.length / 2)], size = Math.round((e.labelSize || DEF.label / ts) * ts), x = mid[0] + (e.labelDx || 0), y = mid[1] + (e.labelDy || 0);
      const w = measure(e.label, size) + 40, h = Math.round(size * 1.5); labels.push({ n: '連線字「' + e.label + '」', x: x - w / 2, y: y - h / 2, w, h });
      els.push({ t0: e.labelT ?? e.t + dur * 0.6, dur: 0.35, str: e.label, read: 'mm-edge-' + e.from + '-' + e.to, box: [x - w / 2, y - h / 2, x + w / 2, y + h / 2],
        draw: (c, k, L) => drawChip(c, e.label, x, y, L, { tone: TONE_OF[e.labelColor || e.color || 'yellow'] ?? 'accent', size, align: 'center', alpha: clamp(k * 2) }) });
    }
  });
  if (divider) { const d = divider; els.push({ t0: d.t ?? (center ? center.t + 0.6 : 0), dur: 0.5, draw: (c, k, L) => { strokeOn(c, d.pts, k, { color: L.edge, width: 3 }); for (const p of [d.pts[0], d.pts[d.pts.length - 1]]) { c.save(); c.globalAlpha *= clamp(k * 3); c.fillStyle = L.bracket; c.fillRect(p[0] - 5, p[1] - 5, 10, 10); c.restore(); } } }); }

  // nodes
  all.forEach(n => {
    const { x, y, w, h, cx, cy } = n.box; let t = n.t;
    const pic = n.photo || n._doodle || n.icon;
    if (n.kind === 'card') {
      els.push({ t0: t, dur: 0.4, draw: (c, k, L) => { const e = out(k); c.save(); c.globalAlpha *= clamp(k * 2); c.translate(0, 18 * (1 - e));
        rr(c, x, y, w, h, 22); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, L.panelTop); g.addColorStop(1, L.panelBot); c.fillStyle = g; c.shadowColor = L.drop; c.shadowBlur = 22; c.shadowOffsetY = 8; c.fill(); c.shadowColor = 'transparent';
        const eg = c.createLinearGradient(0, y, 0, y + h); eg.addColorStop(0, L.edgeTop); eg.addColorStop(0.35, L.edge); eg.addColorStop(1, L.edge); c.lineWidth = 3; c.strokeStyle = eg; c.shadowColor = L.glow; c.shadowBlur = 16; c.stroke(); c.shadowBlur = 0;
        rr(c, x + 8, y + 8, w - 16, h - 16, 15); c.lineWidth = 1.5; c.strokeStyle = L.hair; c.stroke();
        const B = 26, b = -9; c.lineWidth = 4; c.strokeStyle = L.bracket; c.lineCap = 'round';
        for (const [px, py, sx, sy] of [[x + b, y + b, 1, 1], [x + w - b, y + b, -1, 1], [x + b, y + h - b, 1, -1], [x + w - b, y + h - b, -1, -1]]) { c.beginPath(); c.moveTo(px, py + sy * B); c.lineTo(px, py); c.lineTo(px + sx * B, py); c.stroke(); }
        c.restore(); } });
      t += 0.2;
      let px, py, tx, ty;
      if (n.pic === 'left') { px = x + n._pad + n._pw / 2; py = cy; tx = x + n._pad + n._pw + n._gap + n._tw / 2; ty = cy; }
      else { px = cx; py = y + n._pad + n._ph / 2; tx = cx; ty = y + n._pad + n._ph + n._gap + n._th / 2; }
      n._pic = [px, py]; n._txt = [tx, ty];
      if (n.photo) { const p = n.photo; els.push({ t0: t, dur: 0.4, draw: (c, k, L) => { if (!p.img) return; c.save(); c.globalAlpha *= clamp(k * 2); const s = lerp(1.06, 1, out(k)); c.translate(px, py); c.scale(s, s); rr(c, -p.w / 2, -p.h / 2, p.w, p.h, 12); c.fillStyle = L.shell; c.fill(); c.lineWidth = 2; c.strokeStyle = L.edge; c.stroke();
        const [sx, sy, sw, sh] = p.crop || [0, 0, p.img.width, p.img.height]; c.save(); rr(c, -p.w / 2 + 10, -p.h / 2 + 10, p.w - 20, p.h - 20, 8); c.clip(); c.drawImage(p.img, sx, sy, sw, sh, -p.w / 2 + 10, -p.h / 2 + 10, p.w - 20, p.h - 20); c.restore(); c.restore(); } }); t += 0.35; }
      else if (n._doodle) { const dd = n._doodle, dur = (n.doodle.dur ?? 1.0) * 0.85, ps = n._ps; els.push({ t0: t, dur, draw: (c, k, L) => { c.save(); c.translate(px - n._pw / 2, py - n._ph / 2); c.scale(ps, ps); dd.draw(c, k, 0, 0, L); c.restore(); } }); t += dur * 0.7; }
      else if (n.icon) { els.push({ t0: t, dur: 0.5, draw: (c, k, L) => drawIcon(c, n.icon, px, py, n._pw, k, sCol(n.iconColor || (n.color === 'white' ? 'yellow' : n.color), L)) }); t += 0.4; }
      if (n.text) { const tt0 = t; els.push({ t0: tt0, dur: 0.35, str: n.text.replace(/\n/g, ''), read: 'mm-' + n.id, box: [tx - n._tw / 2, ty - n._th / 2, tx + n._tw / 2, ty + n._th / 2],
        draw: (c, k, L) => n._lines.forEach((l, i) => textOn(c, l, tx, ty - n._th / 2 + (i + 0.5) * n.size * 1.22 + n.size * 0.36, k, { size: n.size, weight: 800, color: tCol(n.isCenter ? 'white' : n.color === 'white' ? 'white' : n.color, L), align: 'center' })) }); t += 0.35; }
    } else if (n.kind === 'capsule') {
      els.push({ t0: t, dur: 0.45, str: (n.text || '').replace(/\n/g, ''), read: 'mm-' + n.id, box: [x, y, x + w, y + h], draw: (c, k, L) => { const e = out(k), s = lerp(0.9, 1, e); c.save(); c.globalAlpha *= clamp(k * 2); c.translate(cx, cy + 16 * (1 - e)); c.scale(s, s); c.translate(-cx, -cy);
        rr(c, x, y, w, h, 26); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, L.nowA); g.addColorStop(1, L.nowB); c.fillStyle = g; c.shadowColor = L.glow; c.shadowBlur = 34; c.fill(); c.shadowBlur = 0; c.lineWidth = 3; c.strokeStyle = L.nowEdge || L.nowB; c.stroke();
        rr(c, x - 14, y - 14, w + 28, h + 28, 36); c.lineWidth = 12; c.strokeStyle = L.glowRing; c.stroke();
        n._lines.forEach((l, i) => { c.font = fontOf(n.size, 800); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(l, cx, y + 22 + (i + 0.5) * n.size * 1.22 + 2); });
        c.restore(); } });
      t += 0.45;
    } else if (n.kind === 'chip') {
      els.push({ t0: t, dur: 0.35, str: (n.text || '').replace(/\n/g, ''), read: 'mm-' + n.id, box: [x, y, x + w, y + h], draw: (c, k, L) => { const e = 1 + (1.70158 + 1) * Math.pow(clamp(k) - 1, 3) + 1.70158 * Math.pow(clamp(k) - 1, 2), s = lerp(0.82, 1, e); c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
        drawChip(c, n.text, cx, cy, L, { tone: n.tone, size: n.size, align: 'center', alpha: clamp(k * 2.5) }); c.restore(); } });
      t += 0.35;
    } else {   // plain (centre without a capsule)
      els.push({ t0: t, dur: 0.4, str: n.text, read: 'mm-' + n.id, box: [x, y, x + w, y + h], draw: (c, k, L) => { n._lines.forEach((l, i) => textOn(c, l, cx, y + (i + 0.5) * n.size * 1.22 + n.size * 0.36, k, { size: n.size, weight: 900, color: tCol(n.color, L), align: 'center' }));
        if (n.frame === 'underline') strokeOn(c, [[x - 10, y + h - 2], [x + w + 10, y + h - 2]], clamp(k * 1.4 - 0.4), { color: L.line, width: 6 }); } });
      t += 0.4;
    }
    n.tEnd = t + 0.3;
  });
  const extra = [];

  // ---------- lint (console.error so render.cjs lists it; nothing breaks)
  const warnings = [];
  const units = s => (String(s).match(/[㐀-鿿]|[A-Za-z0-9$+.,%]+/g) || []).length;
  let total = 0;
  for (const n of all) { if (!n.text) continue; const u = units(n.text); total += (String(n.text).match(/[㐀-鿿]|[A-Za-z]+/g) || []).length;
    if (!n.isCenter && u > 8) warnings.push(`節點「${n.text}」${u} 個字，建議 8 字以內`); if (n.isCenter && u > 12) warnings.push(`中心「${n.text}」${u} 個字，建議 12 字以內`);
    if (n.size * screenScale < 28) warnings.push(`節點「${n.text}」字只有 ${(n.size * screenScale).toFixed(0)}px（螢幕上），至少 28px`); }
  if (total > 60) warnings.push(`整塊板 ${total} 個字（不算數字），建議 60 字以內`);
  const BW = panel ? panel.W : 2048, BH = panel ? panel.H : 1069;
  const boxes = [...all.map(n => ({ n: n.text || n.id, x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h })), ...labels];
  for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; if (a.x < 10 || a.y < 10 || a.x + a.w > BW - 10 || a.y + a.h > BH - 10) warnings.push(`「${a.n}」超出板子`);
    for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; if (a.x < b.x + b.w - 4 && b.x < a.x + a.w - 4 && a.y < b.y + b.h - 4 && b.y < a.y + a.h - 4) warnings.push(`「${a.n}」和「${b.n}」重疊`); } }
  for (const w of warnings) console.error('[mindmap 警告] ' + w);

  // ---------- drawing
  const kOf = (e, t) => clamp((t - e.t0) / Math.max(1e-3, e.dur));
  const wipe = spec.wipe ? { dur: 0.6, ...spec.wipe } : null;
  function drawOn(c, t, L) {
    if (wipe && t < wipe.at) { wipe.prev && wipe.prev(c, L, t); return; }
    const wk = wipe ? sm((t - wipe.at) / wipe.dur) : 1, X = wk * (BW + 120) - 60;
    if (wk < 1) { c.save(); c.beginPath(); c.rect(X, 0, BW, BH); c.clip(); wipe.prev && wipe.prev(c, L, wipe.at); c.restore(); c.save(); c.beginPath(); c.rect(0, 0, X, BH); c.clip(); }
    for (const e of [...els, ...extra]) { const k = kOf(e, t); if (k > 0) { c.save(); e.draw(c, k, L, t); c.restore(); } }
    if (wk < 1) { c.restore(); const g = c.createLinearGradient(X - 70, 0, X, 0); g.addColorStop(0, 'rgba(70,212,255,0)'); g.addColorStop(1, L.cyan); c.fillStyle = g; c.globalAlpha = 0.5; c.fillRect(X - 70, 0, 70, BH); c.globalAlpha = 1; c.fillStyle = L.cyan; c.fillRect(X - 2, 0, 4, BH); }
  }
  const qk = k => Math.round(clamp(k) * 30);
  function key(t) { return 'mm:' + (wipe ? (t < wipe.at ? 'p' : qk((t - wipe.at) / wipe.dur)) : '') + '|' + [...els, ...extra].map(e => qk(kOf(e, t))).join('.'); }
  const lastT = Math.max(...els.map(e => e.t0 + e.dur));
  const mm = {
    warnings, nodes: byId, start: Math.min(...els.map(e => e.t0)), end: lastT, key,
    update(t) { if (!panel) return false; panel.draw(key(t), (c, W, H, L) => drawOn(c, t, L)); return true; },
    drawOn,
    /** add your own timed elements (el.stroke / el.text / el.custom, or {t0, dur, draw(c, k, L)}; give str + read + box to report text) */
    add(...e) { extra.push(...e.flat()); return mm; },
    /** board-canvas point of a node: mm.point('n1', 'top') → [x, y] (side: 'top'|'bottom'|'left'|'right') */
    point(id, side) { const b = byId[id].box; return side === 'top' ? [b.cx, b.y] : side === 'bottom' ? [b.cx, b.y + b.h] : side === 'left' ? [b.x, b.cy] : side === 'right' ? [b.x + b.w, b.cy] : [b.cx, b.cy]; },
    /** readable blocks at t in board px (fully drawn): [{id, text, x0, y0, x1, y1}] */
    texts(t) { const r = []; for (const e of [...els, ...extra]) { if (!e.read || !e.box || kOf(e, t) < 1) continue; r.push({ id: e.read, text: e.str, x0: e.box[0], y0: e.box[1], x1: e.box[2], y1: e.box[3] }); } return r; },
  };
  return mm;
}
