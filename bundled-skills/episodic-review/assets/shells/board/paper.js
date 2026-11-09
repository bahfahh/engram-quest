// paper.js — canvas helpers: Chinese-aware wrapping, paper surfaces, stamps. (Adapted from the board shell.)
import * as THREE from 'three';
import { rng } from './stage.js';
import { LANG } from './content.js';

// Languages written with spaces break only at spaces, and punctuation stays on its word.
const SPACED = !/^(zh|ja)/i.test(LANG);

export const NOTEXT = new URLSearchParams(location.search).has('notext');
export const F = {
  sans: '"Noto Sans TC", Inter, sans-serif',
  hand: '"LXGW WenKai TC", "Noto Sans TC", sans-serif',
  mono: '"JB Mono", "Noto Sans TC", monospace',
  inter: 'Inter, "Noto Sans TC", sans-serif',
};

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = opts.aniso || 4;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...opts.repeat); }
  if (opts.nomip) { tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; }
  tex.userData = { canvas: c, ctx };
  return tex;
}
export function noise(ctx, w, h, base, amp, seed) {
  const r = rng(seed), img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const n = (r() - 0.5) * amp; img.data[i * 4] = base[0] + n; img.data[i * 4 + 1] = base[1] + n * 0.95; img.data[i * 4 + 2] = base[2] + n * 0.85; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}

const CLOSE = '，。、；：？！」』）)》〉…→';
const isCJK = ch => /[㐀-鿿]/u.test(ch);
function tokens(text) { return text.match(SPACED ? /[^\s㐀-鿿]+|\s+|./gu : /[A-Za-z0-9.+#\-_/'’<>()\[\]=:"]+|\s+|./gu) || []; }
export function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const lines = []; let line = '';
    for (const tk of tokens(para)) {
      const test = line + tk;
      if (ctx.measureText(test).width > maxW && line.trim() && !CLOSE.includes(tk)) { lines.push(line.trimEnd()); line = tk.trimStart(); }
      else line = test;
    }
    lines.push(line);
    const L = lines.length;   // no widow: a one-character last line borrows from the line above
    if (L > 1) {
      const last = [...lines[L - 1].replace(/[，。、；：？！」』）)》〉…\s]/gu, '')];
      if (!SPACED && last.length <= 1) {
        const prev = [...lines[L - 2]];
        let k = prev.length - 1; while (k > 0 && !isCJK(prev[k])) k--;
        const take = Math.max(1, Math.min(2, prev.length - k));
        lines[L - 1] = prev.slice(-take - (prev.length - 1 - k)).join('') + lines[L - 1];
        lines[L - 2] = prev.slice(0, prev.length - take - (prev.length - 1 - k)).join('');
        if (!lines[L - 2]) lines.splice(L - 2, 1);
      }
    }
    out.push(...lines);
  }
  return out;
}
export function font(f) { return `${f.weight || 400} ${f.size}px ${f.family || F.sans}`; }
// draw wrapped text; returns height used. f: {size, weight, family, color, lh, align}
export function block(ctx, text, x, y, maxW, f) {
  if (!text) return 0;
  ctx.font = font(f);
  const lines = wrap(ctx, text, maxW), lh = f.size * (f.lh || 1.34);
  if (NOTEXT && !f.keep) return lines.length * lh;
  ctx.fillStyle = f.color || '#1d1a16'; ctx.textBaseline = 'top'; ctx.textAlign = f.align || 'left';
  const ax = f.align === 'center' ? x + maxW / 2 : f.align === 'right' ? x + maxW : x;
  lines.forEach((l, i) => ctx.fillText(l, ax, y + i * lh));
  return lines.length * lh;
}
export function measure(ctx, text, maxW, f) { ctx.font = font(f); return wrap(ctx, text, maxW).length * f.size * (f.lh || 1.34); }
export function fit(ctx, text, maxW, maxH, f, min = 0.6) {
  let s = f.size; const s0 = s;
  const wide = sz => { ctx.font = font({ ...f, size: sz }); return Math.max(...wrap(ctx, text, maxW).map(l => ctx.measureText(l).width)) > maxW * 1.01; };
  while ((measure(ctx, text, maxW, { ...f, size: s }) > maxH || wide(s)) && s > s0 * min) s *= 0.96;
  return { ...f, size: s };
}
export function text1(ctx, s, x, y, f) {   // single line, baseline top
  if (NOTEXT && !f.keep) return;
  ctx.textRendering = f.family === F.mono ? 'optimizeSpeed' : 'auto';
  ctx.font = font(f); ctx.fillStyle = f.color || '#1d1a16'; ctx.textBaseline = f.base || 'top'; ctx.textAlign = f.align || 'left'; ctx.fillText(s, x, y);
}
export function paper(ctx, w, h, base, seed, opts = {}) {
  const r = rng(seed);
  ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 700; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '90,70,40' : '255,255,245'},${0.025 + r() * 0.045})`; ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(70,45,15,${opts.edge ?? 0.13})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (opts.ruled) {
    ctx.strokeStyle = 'rgba(200,70,60,.45)'; ctx.lineWidth = Math.max(2, h * 0.006); ctx.beginPath(); ctx.moveTo(0, opts.ruled.top); ctx.lineTo(w, opts.ruled.top); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,130,190,.16)'; ctx.lineWidth = 2;
    for (let y = opts.ruled.top + opts.ruled.step; y < h - 6; y += opts.ruled.step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
}
export function stamp(ctx, s, cx, cy, size, rot, color = 'rgba(178,34,28,.85)') {
  if (NOTEXT) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.strokeStyle = color; ctx.lineWidth = size * 0.09; ctx.strokeRect(-size * 1.6, -size * 0.7, size * 3.2, size * 1.4); ctx.restore(); return; }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.font = `700 ${size}px ${F.sans}`; const tw = ctx.measureText(s).width;
  ctx.strokeStyle = color; ctx.lineWidth = size * 0.09; ctx.strokeRect(-tw / 2 - size * 0.35, -size * 0.72, tw + size * 0.7, size * 1.44);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, size * 0.04);
  // ink wear
  const r = rng(Math.floor(cx + cy));
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.4})`; ctx.fillRect((r() - 0.5) * (tw + size), (r() - 0.5) * size * 1.4, 2 + r() * 5, 1 + r() * 3); }
  ctx.restore();
}
export function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// svg file -> Image (optionally with all <text> removed for the no-text stills)
export async function loadSvg(url) {
  let s = await (await fetch(url)).text();
  if (NOTEXT) s = s.replace(/<text[\s\S]*?<\/text>/g, '');
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
  await img.decode();
  return img;
}
