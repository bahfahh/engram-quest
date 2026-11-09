// draw.js — Canvas2D helpers shared by every in-world surface (screens, whiteboards, paper).
// With ?notext=1 every glyph run becomes a grey bar of the same width (layout and motion stay).
import { NOTEXT } from './lib.js';
import { LANG } from './content.js';

// Languages written with spaces break only at spaces, and punctuation stays on its word.
const SPACED = !/^(zh|ja)/i.test(LANG);

export const F = {
  ui: '"Noto Sans TC", Inter, sans-serif',
  en: 'Inter, "Noto Sans TC", sans-serif',
  code: '"JetBrains Mono", "Noto Sans TC", monospace',
  hand: '"LXGW WenKai TC", "Noto Sans TC", serif',
};
// one palette for the whole film
export const C = {
  paper: '#f4f0e6', ink: '#25303d', inkDim: '#5d6672', red: '#c2453a', green: '#2e8656', blue: '#2c67a3', amber: '#c98a22',
  scr: '#14171c', panel: '#1c2027', panel2: '#232831', line: '#2f3540', txt: '#ece7dc', dim: '#9aa1aa', faint: '#5e6570',
  sAmber: '#f2b65c', sGreen: '#62c98e', sRed: '#f2695a', sBlue: '#6fa9f2', sViolet: '#b39cf5',
};

export function font(px, w = 400, fam = F.ui) { return `${w} ${px}px ${fam}`; }

// draw a run of text (or its grey bar in notext mode). returns width.
export function text(ctx, s, x, y, o = {}) {
  const px = o.px || 40;
  ctx.font = o.font || font(px, o.w || 400, o.fam || F.ui);
  ctx.textAlign = o.align || 'left';
  ctx.textRendering = (o.fam === F.code) ? 'optimizeSpeed' : 'auto';
  ctx.textBaseline = o.base || 'alphabetic';
  const w = ctx.measureText(s).width;
  if (NOTEXT && !o.keep) {
    if (!s.trim()) return w;
    const x0 = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'right' ? x - w : x;
    const yMid = ctx.textBaseline === 'middle' ? y : ctx.textBaseline === 'top' ? y + px * 0.55 : y - px * 0.36;
    ctx.save(); ctx.globalAlpha *= 0.42; ctx.fillStyle = o.color || '#888';
    rr(ctx, x0, yMid - px * 0.26, w, px * 0.52, px * 0.26); ctx.fill(); ctx.restore();
    return w;
  }
  ctx.fillStyle = o.color || '#000';
  ctx.fillText(s, x, y);
  return w;
}

// wrap by characters (CJK friendly). returns number of lines.
export function wrap(ctx, s, x, y, maxW, lh, o = {}) {
  const px = o.px || 40; ctx.font = o.font || font(px, o.w || 400, o.fam || F.ui);
  const lines = []; let line = '';
  const toks = s.match(SPACED ? /[^\s㐀-鿿]+|\n|[\s\S]/gu : /[A-Za-z0-9][A-Za-z0-9.,#+_\-/<>()]*[A-Za-z0-9>)]|[A-Za-z0-9]|\n|[\s\S]/gu) || [];
  for (const ch of toks) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    if (ctx.measureText(line + ch).width > maxW && line) {
      // keep closing punctuation on the line
      if ('，。、；：？！」）'.includes(ch)) { line += ch; continue; }
      lines.push(line.replace(/ +$/, '')); line = ch === ' ' ? '' : ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  // no orphan: a last line of 1-2 characters borrows from the line above
  const vis = (l) => [...l].filter(c => !'，。、；：？！」）「（ '.includes(c)).length;
  if (!SPACED && lines.length > 1 && vis(lines[lines.length - 1]) <= 2 && !s.includes('\n')) {
    const prev = [...lines[lines.length - 2]]; const take = prev.length > 6 && !/[A-Za-z0-9]/.test(prev.slice(-4).join('')) ? 3 : 0;
    if (take) { lines[lines.length - 2] = prev.slice(0, prev.length - take).join(''); lines[lines.length - 1] = prev.slice(prev.length - take).join('') + lines[lines.length - 1]; }
  }
  lines.forEach((l, i) => text(ctx, l, x, y + i * lh, o));
  return lines.length;
}

export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function box(ctx, x, y, w, h, r, fill, stroke, lw = 2) { rr(ctx, x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }

export function arrow(ctx, x1, y1, x2, y2, color, lw = 4, head = 16, u = 1) {
  const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
  if (u > 0.95) { const a = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45)); ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); }
}
// polyline arrow drawn progressively (u = 0..1 of the length)
export function pathArrow(ctx, pts, color, lw = 4, u = 1, head = 16) {
  if (u <= 0) return;
  const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let rem = L * Math.min(1, u);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(...pts[0]); let end = pts[0], dir = [1, 0];
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const d = seg[i - 1], k = Math.min(1, rem / d); const p = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    ctx.lineTo(...p); dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; end = p; rem -= d;
  }
  ctx.stroke();
  if (u >= 0.98) { const a = Math.atan2(dir[1], dir[0]); ctx.beginPath(); ctx.moveTo(...end); ctx.lineTo(end[0] - head * Math.cos(a - 0.45), end[1] - head * Math.sin(a - 0.45)); ctx.lineTo(end[0] - head * Math.cos(a + 0.45), end[1] - head * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); }
}

// code block on a dark panel: lines = [[text, color?], ...]; returns height
export function code(ctx, lines, x, y, o = {}) {
  const px = o.px || 34, lh = o.lh || px * 1.42;
  lines.forEach((ln, i) => {
    const [s, col, hi] = Array.isArray(ln) ? ln : [ln];
    if (hi) { ctx.save(); ctx.globalAlpha = hi; box(ctx, x - 14, y + i * lh - px * 1.02, (o.w || 1200), lh, 6, o.hiColor || 'rgba(242,182,92,.18)'); ctx.restore(); }
    text(ctx, s, x, y + i * lh, { px, fam: F.code, w: 500, color: col || o.color || C.txt });
  });
  return lines.length * lh;
}

// small check / cross marks
export function check(ctx, x, y, s, color, lw = 6) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.38); ctx.lineTo(x + s * 0.55, y - s * 0.42); ctx.stroke(); }
export function cross(ctx, x, y, s, color, lw = 6) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.stroke(); }

// a screen frame: dark UI with a title bar
export function screenBase(ctx, w, h, title) {
  ctx.fillStyle = C.scr; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1b1f26'; ctx.fillRect(0, 0, w, 54);
  ['#e0675f', '#e8b85c', '#7fbf72'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 28, 27, 9, 0, 7); ctx.fill(); });
  if (title) text(ctx, title, w / 2, 37, { px: 26, color: C.dim, align: 'center', fam: F.en, w: 500 });
}

// whiteboard surface (with faint ghosting of old erased marker)
export function boardBase(ctx, w, h, seed = 1) {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f7f6f2'); g.addColorStop(1, '#ecebe6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#334'; ctx.lineWidth = 10;
  let s = seed * 97; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); const x = r() * w, y = r() * h; ctx.moveTo(x, y); ctx.bezierCurveTo(x + 120, y - 40, x + 220, y + 60, x + 340 * r(), y + 30); ctx.stroke(); }
  ctx.restore();
}

// index card (paper) drawn on a 2D surface; returns nothing
export function card(ctx, x, y, w, h, title, sub, o = {}) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot || 0); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  box(ctx, 0, 0, w, h, 6, o.fill || '#fffdf6');
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = o.band || C.amber; ctx.fillRect(0, 0, w, 10);
  if (o.glow) { ctx.save(); ctx.globalAlpha = o.glow; ctx.strokeStyle = '#ffcf7a'; ctx.lineWidth = 8; rr(ctx, -4, -4, w + 8, h + 8, 10); ctx.stroke(); ctx.restore(); }
  const px = o.px || 40;
  const n = wrap(ctx, title, 22, 26 + px, w - 44, px * 1.25, { px, w: 700, color: C.ink });
  if (sub) text(ctx, sub, 22, h - 22, { px: Math.round(px * 0.72), color: C.inkDim });
  ctx.restore();
  return n;
}
