// Small helpers shared by scenes. Import with: import * as S from '/lib/stage.js';
// Everything is time-based (pure functions of t) so frames render deterministically.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 before a, 1 after b, linear in between. */
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const ease = {
  linear: k => k,
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  outBack: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  outElastic: k => (k === 0 || k === 1) ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
/** Seeded RNG (mulberry32). Use instead of Math.random. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth deterministic wobble in [-1,1] for idle motion (breathing, bobbing). */
export const wobble = (t, freq = 1, seed = 0) => Math.sin(t * freq * 6.283 + seed) * 0.6 + Math.sin(t * freq * 2.71 * 6.283 + seed * 1.7) * 0.4;

/**
 * Load timeline.json (made by voice.py) and return helpers:
 *   T.duration, T.lines
 *   T.line(id)            -> {start, end, text, speaker, words}
 *   T.word(id, needle, {nth, exact}) -> time (s) when the word where `needle` begins starts in line `id` (nth: which occurrence,
 *                         exact: whole words only — 「五」 otherwise also hits 「十五」; falls back to proportional position)
 *   T.speaking(t)         -> the spoken line at time t (or null) — for mouth flaps / who is talking
 */
export async function loadTimeline(url = 'timeline.json') {
  const tl = await (await fetch(url)).json();
  const byId = Object.fromEntries(tl.lines.map(l => [l.id, l]));
  const line = id => { const l = byId[id]; if (!l) throw new Error('no line ' + id); return l; };
  // word(id, needle, {nth = 0, exact = false}): start of the word where the nth occurrence of `needle` begins.
  // A short needle can sit inside a longer word (「五」 in 「十五」): pass exact: true to match only a whole word, or nth to skip earlier hits.
  const word = (id, needle, { nth = 0, exact = false } = {}) => {
    const l = line(id), ws = l.words || [];
    if (exact) { const hit = ws.filter(w => w.text === needle)[nth]; if (hit) return hit.start; }
    else if (ws.length) {
      const all = ws.map(w => w.text).join(''); let i = -1;
      for (let k = 0; k <= nth; k++) { i = all.indexOf(needle, i + 1); if (i < 0) break; }
      if (i >= 0) { let c = 0; for (const w of ws) { if (i < c + w.text.length) return w.start; c += w.text.length; } }
    }
    let i = -1; for (let k = 0; k <= nth; k++) { i = l.text.indexOf(needle, i + 1); if (i < 0) break; }
    return i < 0 ? l.start : l.start + (l.end - l.start) * (i / Math.max(1, l.text.length));
  };
  const speaking = t => tl.lines.find(l => l.speaker && t >= l.start && t < l.end) || null;
  return { ...tl, line, word, speaking };
}

/** Mouth openness 0..1 for `speaker` at time t, driven by word timings (cheap lip flap). */
export function mouth(T, speaker, t) {
  const l = T.speaking(t);
  if (!l || l.speaker !== speaker) return 0;
  const w = (l.words || []).find(w => t >= w.start && t < w.end + 0.05);
  if (!w) return 0.15;
  const k = prog(t, w.start, w.end);
  return 0.25 + 0.75 * Math.abs(Math.sin(k * Math.PI * Math.max(1, w.text.length)));
}

/** Wait until the given font families have the glyphs for `text` loaded (needed before drawing on a canvas). */
export async function loadFonts(families, text, weights = ['400', '700']) {
  await document.fonts.ready;
  for (const f of families) for (const w of weights) await document.fonts.load(`${w} 64px "${f}"`, text);
  await document.fonts.ready;
}

/**
 * Hand-written reveal of `text` on a 2D canvas: characters appear one by one with
 * a short pen-stroke wipe on the current character. k = 0..1 progress.
 * opts: {font, color, align:'left'|'center', letterSpacing}
 */
export function writeOn(ctx, text, x, y, k, opts = {}) {
  const chars = [...text];
  const n = chars.length;
  const shown = k * n;
  ctx.save();
  ctx.font = opts.font || '64px "LXGW WenKai TC"';
  ctx.fillStyle = opts.color || '#2b2b2b';
  ctx.textBaseline = 'alphabetic';
  const ls = opts.letterSpacing || 0;
  const widths = chars.map(c => ctx.measureText(c).width + ls);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = opts.align === 'center' ? x - total / 2 : x;
  const size = parseFloat(ctx.font) || 64;
  for (let i = 0; i < n && i < shown; i++) {
    const part = Math.min(1, shown - i);
    ctx.save();
    if (part < 1) { ctx.beginPath(); ctx.rect(cx - 2, y - size * 1.1, widths[i] * part + 2, size * 1.5); ctx.clip(); }
    ctx.fillText(chars[i], cx, y);
    ctx.restore();
    cx += widths[i];
  }
  ctx.restore();
  return total;
}

/**
 * Draw a hand-drawn looking stroke along points [[x,y],...] revealed by k (0..1).
 * Slight jitter (seeded) makes it feel drawn rather than vector-perfect.
 */
export function drawStroke(ctx, pts, k, opts = {}) {
  if (k <= 0 || pts.length < 2) return;
  const r = rng(opts.seed || 7);
  const j = opts.jitter ?? 1.2;
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0); const steps = Math.max(2, Math.ceil(len / 12));
    for (let s = 0; s < steps; s++) { const u = s / steps; seg.push([lerp(x0, x1, u) + (r() - 0.5) * j, lerp(y0, y1, u) + (r() - 0.5) * j]); }
  }
  seg.push(pts[pts.length - 1]);
  const upto = Math.max(1, Math.floor(seg.length * clamp(k)));
  ctx.save();
  ctx.strokeStyle = opts.color || '#2b2b2b'; ctx.lineWidth = opts.width || 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]);
  for (let i = 1; i <= upto && i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
  ctx.stroke(); ctx.restore();
}

/**
 * Reading-time check helper (readcheck.cjs). Collects every visible DOM element marked `data-read`
 * (optionally `data-read="<id>"`) as {id, text, x0, y0, x1, y1} in page pixels. Hidden elements
 * (opacity < 0.5, display:none, visibility:hidden, zero size) are skipped.
 *   window.TEXTS = t => S.textsOf();                       // DOM pages
 *   window.TEXTS = t => [...S.textsOf(), ...myCanvasLabels(t)];   // add canvas/WebGL labels by hand
 * For text drawn in canvas or three.js (chalk, map name tags), report {id, text, x0..y1} yourself from the
 * same world->screen function the drawing uses.
 */
export function textsOf(selector = '[data-read]', root = document) {
  const out = [];
  for (const el of root.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let e = el, op = 1, hidden = false;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; }
      op *= parseFloat(cs.opacity); e = e.parentElement;
    }
    if (hidden || op < 0.5) continue;
    out.push({ id: el.dataset.read || el.id || el.textContent.trim().slice(0, 20), text: el.textContent.trim(), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
  }
  return out;
}
