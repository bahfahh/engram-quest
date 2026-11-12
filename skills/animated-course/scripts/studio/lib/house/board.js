// Engram studio — board content (the classroom board, any H.panel canvas). Typeset, never chalk: text, shapes,
// chips and selection boxes appear on the word the narration says them (times from timeline.json).
//
//   import { makeBoard } from '/lib/house/board.js';
//   const B = makeBoard(C.board.panel);                    // C = makeClassroom(); or any H.panel({…})
//   B.text('This month: replace the test set', 120, 150, { size: 72, weight: 900, read: 'title' }, T.word('O01', 'month'));
//   B.chip('50 drawn at random', 860, 210, { tone: 'student', read: 'rnd' }, tGrid);
//   B.sel(1560, 690, 1990, 770, { tone: 'warn' }, tZero);
//   window.renderAt = t => { B.update(t); … };   window.TEXTS = t => B.texts(t).map(b => ({ ...b, ...C.board.boxToScreen(b.x0, b.y0, b.x1, b.y1) }));
//
// Every element: (…, t0) appears from t0 over `dur` (o.dur), stays until `o.until` (then fades out over o.fo, 0.3 s).
// Colours are token names (ink, ink2, ink3, line, cyan, cyanInk, amber, amberInk, magenta, magentaInk, grey, greyInk,
// inkOn, shell) or any CSS colour; they follow the lights (light ⇄ dark) because the board is redrawn with lerpLook(k).
// update(t) is a pure function of t: it redraws only when an element's (quantised) state or the lights changed.
import { FONT, SIZE } from './tokens.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const out = k => 1 - Math.pow(1 - clamp(k), 3);
const outBack = k => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
export const TOKEN_COLORS = ['ink', 'ink2', 'ink3', 'line', 'cyan', 'cyanInk', 'amber', 'amberInk', 'magenta', 'magentaInk', 'grey', 'greyInk', 'inkOn', 'shell', 'hair', 'edge', 'bracket', 'nowA', 'nowB', 'anchorFill', 'panelTop', 'panelBot', 'doneFill', 'amberFill', 'magentaFill', 'greyFill'];
/** token name → colour at look L (anything else passes through) */
export const colOf = (c, L) => (c && L[c] !== undefined ? L[c] : c || L.ink);
/** canvas font: Chinese in Noto Sans TC, digits/Latin in Inter (Inter has no CJK glyphs, so the browser falls back per glyph) */
export const fontOf = (size, weight = 800, kind = 'mix') => kind === 'tc' ? `${weight} ${size}px "Noto Sans TC"` : `${Math.min(+weight, 800)} ${size}px Inter, "Noto Sans TC"`;
const _m = document.createElement('canvas').getContext('2d');
/** text width in board px */
export function measure(str, size, weight = 800, kind = 'mix') { _m.font = fontOf(size, weight, kind); return _m.measureText(str).width; }

/** rounded-rect path */
export const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
/** polyline length */
const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
/** draw a polyline revealed to fraction k (crisp, round caps) */
export function strokeOn(c, pts, k, { color, width = 6, dash = null, cap = 'round' } = {}) {
  if (k <= 0 || pts.length < 2) return;
  const L = plen(pts), stop = L * clamp(k); let acc = 0;
  c.save(); c.lineWidth = width; c.lineCap = cap; c.lineJoin = 'round'; c.strokeStyle = color; if (dash) c.setLineDash(dash);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0);
    if (acc + l >= stop) { const u = l ? (stop - acc) / l : 0; c.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); break; }
    c.lineTo(x1, y1); acc += l;
  }
  c.stroke(); c.restore();
}
/** arrow head (filled, house style: short and wide) at the end of pts */
export function arrowHead(c, pts, size, color) {
  const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2]; const a = Math.atan2(y1 - y0, x1 - x0);
  c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(x1 + Math.cos(a) * size * 0.35, y1 + Math.sin(a) * size * 0.35);
  c.lineTo(x1 - Math.cos(a - 0.55) * size, y1 - Math.sin(a - 0.55) * size); c.lineTo(x1 - Math.cos(a) * size * 0.55, y1 - Math.sin(a) * size * 0.55);
  c.lineTo(x1 - Math.cos(a + 0.55) * size, y1 - Math.sin(a + 0.55) * size); c.closePath(); c.fill(); c.restore();
}
/** typeset text revealed left → right (a soft wipe) with a 10-px rise; k 0..1 */
export function textOn(c, str, x, y, k, { size = 56, weight = 800, color, align = 'left', kind = 'mix', baseline = 'alphabetic', alpha = 1 } = {}) {
  if (k <= 0 || alpha <= 0.002) return;
  c.save(); c.font = fontOf(size, weight, kind); c.textAlign = align; c.textBaseline = baseline; c.fillStyle = color;
  const w = c.measureText(str).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const e = out(k); c.globalAlpha *= alpha * clamp(k * 2.2);
  if (e < 0.999) { const edge = x0 - 40 + (w + 80) * e; c.beginPath(); c.rect(x0 - 10, y - size * 1.4, edge - x0 + 10, size * 2.2); c.clip(); }
  c.fillText(str, x, y + 10 * (1 - e)); c.restore();
}

/** Selection box (house: 3 px line, 14 % fill, four square handles). tone: '' (cyan) | 'warn' | 'student'. */
export function drawSel(c, x0, y0, x1, y1, k, L, { tone = '', lw = 4, handle = 16 } = {}) {
  if (k <= 0) return;
  const col = tone === 'warn' ? L.magenta : tone === 'student' ? L.amber : L.line;
  c.save(); c.globalAlpha *= clamp(k * 1.5);
  const s = lerp(1.06, 1, out(k)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  c.fillStyle = col; c.globalAlpha *= 0.14; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.globalAlpha /= 0.14;
  c.lineWidth = lw; c.strokeStyle = col; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { c.fillStyle = L.anchorFill; c.fillRect(hx - handle / 2, hy - handle / 2, handle, handle); c.lineWidth = 3.5; c.strokeRect(hx - handle / 2, hy - handle / 2, handle, handle); }
  c.restore();
}
/**
 * Chip (house label) on a canvas: rounded pill; tone '' (plain holo), 'now' (solid cyan, white text — identical in both
 * studios), 'done' (cyan ring), 'later' (grey), 'student' (amber ring), 'warn' (magenta ring), 'accent' (cyan text).
 * Returns the chip box {x, y, w, h}. (x, y) = left / centre-y unless align 'center'.
 */
export function drawChip(c, str, x, y, L, { tone = '', size = 44, weight = 800, padX = 26, h, align = 'left', alpha = 1, num = null } = {}) {
  const w0 = measure(str, size, weight) + padX * 2 + (num != null ? size * 1.15 + 10 : 0), hh = h || Math.round(size * 1.62);
  const X = align === 'center' ? x - w0 / 2 : x, Y = y - hh / 2;
  if (alpha <= 0.002) return { x: X, y: Y, w: w0, h: hh };
  c.save(); c.globalAlpha *= alpha;
  const ring = tone === 'student' ? L.amber : tone === 'warn' ? L.magenta : tone === 'later' ? L.grey : L.edge;
  rr(c, X, Y, w0, hh, 16 * size / 34);
  if (tone === 'now') { const g = c.createLinearGradient(0, Y, 0, Y + hh); g.addColorStop(0, L.nowA); g.addColorStop(1, L.nowB); c.fillStyle = g; c.shadowColor = L.glow; c.shadowBlur = 18; c.fill(); c.shadowBlur = 0; }
  else { const g = c.createLinearGradient(0, Y, 0, Y + hh); g.addColorStop(0, tone === 'later' ? L.greyFill : L.panelTop); g.addColorStop(1, tone === 'later' ? L.greyFill : L.panelBot); c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = ring; c.shadowColor = tone === 'later' ? 'transparent' : tone === 'student' ? L.amberFill : L.glow; c.shadowBlur = 14; c.stroke(); c.shadowBlur = 0; }
  let tx = X + padX;
  if (num != null) {   // number badge
    const r = size * 0.58, bx = tx + r, by = y; c.beginPath(); c.arc(bx, by, r, 0, 7);
    c.fillStyle = tone === 'now' ? '#fff' : tone === 'later' ? 'rgba(0,0,0,0)' : L.anchorFill; c.fill(); c.lineWidth = 3; c.strokeStyle = tone === 'now' ? '#fff' : tone === 'later' ? L.grey : L.line; c.stroke();
    c.fillStyle = tone === 'now' ? L.nowB : tone === 'later' ? L.greyInk : L.cyanInk; c.font = `800 ${Math.round(size * 0.66)}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), bx, by + 1);
    tx += r * 2 + 10;
  }
  c.fillStyle = tone === 'now' ? '#fff' : tone === 'later' ? L.greyInk : tone === 'student' ? L.amberInk : tone === 'warn' ? L.magentaInk : tone === 'accent' ? L.cyanInk : L.ink;
  c.font = fontOf(size, weight); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(str, tx, y + size * 0.04);
  c.restore();
  return { x: X, y: Y, w: w0, h: hh };
}

/**
 * @param {object} panel  an H.panel (has draw(key, fn), W, H) — e.g. makeClassroom().board.panel
 * @param {object} [o] {owner: key prefix (so another drawer on the same panel forces a redraw), q: progress steps (30)}
 */
export function makeBoard(panel, { owner = 'board', q = 30 } = {}) {
  const els = [];
  const kOf = (e, t) => clamp((t - e.t0) / Math.max(1e-3, e.dur));
  const aOf = (e, t) => (e.until == null ? 1 : 1 - clamp((t - (e.until - e.fo)) / Math.max(1e-3, e.fo)));
  const add = e => { e.fo = e.fo ?? 0.3; els.push(e); return e; };
  const base = (o, t0, dur) => ({ t0, dur: o.dur ?? dur, until: o.until, fo: o.fo, read: o.read, from: o.from, layer: o.layer || 0 });
  const B = {
    els, panel, W: panel.W, H: panel.H,
    /** your own element: draw(c, k, L, t, a) — k = progress 0..1, a = 1 → 0 while it fades out */
    custom(t0, dur, draw, o = {}) { return add({ ...base(o, t0, dur), draw, keyFn: o.keyFn }); },
    /** typeset text. o: {size, weight, color, align, kind ('mix'|'tc'), dur, until, read: id (readcheck), readText} */
    text(str, x, y, o = {}, t0 = 0) {
      const size = o.size || 56, weight = o.weight || 800, w = measure(str, size, weight, o.kind), align = o.align || 'left';
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      const e = add({ ...base(o, t0, 0.35 + Math.min(0.5, [...str].length * 0.03)), box: [x0, y - size * 0.92, x0 + w, y + size * 0.26], str: o.readText || str,
        draw: (c, k, L, t, a) => textOn(c, str, x, y, k, { size, weight, color: colOf(o.color || 'ink', L), align, kind: o.kind, alpha: a }) });
      return e;
    },
    /** polyline drawn on. o: {color, width, dash, arrow (head size), dur, until} */
    line(pts, o = {}, t0 = 0) {
      return add({ ...base(o, t0, 0.4), draw: (c, k, L, t, a) => { c.save(); c.globalAlpha *= a; const col = colOf(o.color || 'ink3', L);
        strokeOn(c, pts, o.arrow ? clamp(k / 0.85) : k, { color: col, width: o.width || 6, dash: o.dash }); if (o.arrow && k > 0.85) arrowHead(c, pts, o.arrow, col); c.restore(); } });
    },
    arrow(x0, y0, x1, y1, o = {}, t0 = 0) { return B.line([[x0, y0], [x1, y1]], { arrow: 26, ...o }, t0); },
    /** rounded box: o {r, color (stroke), fill, width, dash}; appears scaling from 0.96 + fade */
    box(x, y, w, h, o = {}, t0 = 0) {
      return add({ ...base(o, t0, 0.3), draw: (c, k, L, t, a) => { const e = out(k); c.save(); c.globalAlpha *= a * clamp(k * 2);
        const s = lerp(0.96, 1, e); c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-x - w / 2, -y - h / 2);
        rr(c, x, y, w, h, o.r ?? 14); if (o.fill) { c.fillStyle = colOf(o.fill, L); if (o.fillAlpha != null) c.globalAlpha *= o.fillAlpha; c.fill(); if (o.fillAlpha != null) c.globalAlpha /= o.fillAlpha; }
        if (o.color !== null) { c.lineWidth = o.width || 4; c.strokeStyle = colOf(o.color || 'line', L); if (o.dash) c.setLineDash(o.dash); c.stroke(); } c.restore(); } });
    },
    /** chip (house label on the board): o {tone, size, num, align, until, read} — (x, y) = left, centre-y */
    chip(str, x, y, o = {}, t0 = 0) {
      const size = o.size || 44, w = measure(str, size, o.weight || 800) + (o.padX ?? 26) * 2 + (o.num != null ? size * 1.15 + 10 : 0), h = Math.round(size * 1.62);
      const X = o.align === 'center' ? x - w / 2 : x;
      return add({ ...base(o, t0, 0.35), str, box: [X, y - h / 2, X + w, y + h / 2], draw: (c, k, L, t, a) => { const e = outBack(k); c.save(); const s = lerp(0.82, 1, e), cx = X + w / 2;
        c.translate(cx, y); c.scale(s, s); c.translate(-cx, -y); drawChip(c, str, x, y, L, { ...o, alpha: a * clamp(k * 2.5) }); c.restore(); } });
    },
    /** selection box with four square handles: o {tone '' | 'warn' | 'student'} */
    sel(x0, y0, x1, y1, o = {}, t0 = 0) { return add({ ...base(o, t0, 0.3), draw: (c, k, L, t, a) => { c.save(); c.globalAlpha *= a; drawSel(c, x0, y0, x1, y1, k, L, o); c.restore(); } }); },
    /** a mini house panel (frame) on the board: o {r, pad} */
    card(x, y, w, h, o = {}, t0 = 0) {
      return add({ ...base(o, t0, 0.35), draw: (c, k, L, t, a) => { const e = out(k); c.save(); c.globalAlpha *= a * clamp(k * 2); c.translate(0, 16 * (1 - e));
        rr(c, x, y, w, h, o.r ?? 22); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, L.panelTop); g.addColorStop(1, L.panelBot); c.fillStyle = g; c.fill();
        c.lineWidth = 3; c.strokeStyle = L.edge; c.shadowColor = L.glow; c.shadowBlur = 16; c.stroke(); c.shadowBlur = 0;
        rr(c, x + 8, y + 8, w - 16, h - 16, Math.max(4, (o.r ?? 22) - 8)); c.lineWidth = 1.5; c.strokeStyle = L.hair; c.stroke(); c.restore(); } });
    },
    /** a round stamp (seal) pressed in from 1.6×: o {tone, size} */
    stamp(str, cx, cy, o = {}, t0 = 0) {
      const R = o.r || 70;
      return add({ ...base(o, t0, 0.35), str, box: [cx - R, cy - R, cx + R, cy + R], draw: (c, k, L, t, a) => { if (k <= 0) return; const s = lerp(1.6, 1, outBack(k)); const col = o.tone === 'warn' ? L.magenta : o.tone === 'student' ? L.amber : L.line;
        c.save(); c.globalAlpha *= a * clamp(k * 3); c.translate(cx, cy); c.rotate(-0.21); c.scale(s, s);
        c.beginPath(); c.arc(0, 0, R, 0, 7); c.fillStyle = L.anchorFill; c.fill(); c.lineWidth = 6; c.strokeStyle = col; c.stroke();
        c.setLineDash([9, 7]); c.beginPath(); c.arc(0, 0, R - 12, 0, 7); c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
        c.fillStyle = o.tone === 'warn' ? L.magentaInk : o.tone === 'student' ? L.amberInk : L.cyanInk; c.font = `800 ${o.size || 40}px Inter, "Noto Sans TC"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, 0, 2); c.restore(); } });
    },
    /** a whole phase: every element made inside fn gets `until` (fades out at `until`) unless it has its own */
    phase(until, fn, fo = 0.3) { const n0 = els.length; fn(); for (let i = n0; i < els.length; i++) if (els[i].until == null) { els[i].until = until; els[i].fo = fo; } return B; },
    /** state key at t (quantised) — update() redraws only when it changes */
    key(t) { let s = owner + ':'; for (const e of els) { const k = kOf(e, t), a = aOf(e, t); s += k <= 0 || a <= 0 ? '.' : (Math.round(k * q) + '/' + Math.round(a * q) + (e.keyFn ? e.keyFn(t) : '') + ','); } return s; },
    /** draw the board at t (frame by H.panel + elements). extra(c, L, t) draws after the elements. */
    update(t, extra) {
      panel.draw(B.key(t), (c, W, H, L) => { B.drawOn(c, t, L); if (extra) extra(c, L, t); });
      return B;
    },
    drawOn(c, t, L) {
      const list = els.map((e, i) => [e, i]).sort((a, b) => a[0].layer - b[0].layer || a[1] - b[1]);
      for (const [e] of list) { const k = kOf(e, t), a = aOf(e, t); if (k <= 0 || a <= 0) continue; c.save(); e.draw(c, k, L, t, a); c.restore(); }
    },
    /** readable blocks at t in board px: [{id, text, x0, y0, x1, y1}] — elements with o.read, fully drawn and not fading */
    texts(t, filter) {
      const r = [];
      for (const e of els) { if (!e.read || !e.box) continue; const k = kOf(e, t), a = aOf(e, t); if (k < 1 || a < 0.5) continue; if (filter && !filter(e)) continue;
        r.push({ id: e.read, text: e.str, x0: e.box[0], y0: e.box[1], x1: e.box[2], y1: e.box[3] }); }
      return r;
    },
    /** all glyphs used (load them with tokens.loadFonts before the first frame) */
    glyphs() { return els.map(e => e.str || '').join(''); },
  };
  return B;
}

export { SIZE, FONT };
