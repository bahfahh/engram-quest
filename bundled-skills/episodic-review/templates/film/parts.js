// parts.js — reusable pieces: chapter header, caption line, italic line labels, small illustrated cards.
import { el, on, off, T, ico, line, fn, clamp, ease } from './engine.js';
export const COL = { blue: '#6ea8ff', amber: '#f2b84b', violet: '#b69cff', teal: '#57d3c0', coral: '#ff8e72', green: '#6fdc9b', ink: '#f3f3f5', dim: '#b9bac2', mute: '#7d7f8a' };
export function chapter(t0) { const c = el(null, 'ch'); const r = on(c, { t: t0, dy: 0, fi: 0.7, fo: 0.6, read: false }); return { c, r, end: (t) => off(r, t) }; }
export function header(c, no, title, color, t) { const a = el(c, 'a s', no, `left:100px;top:118px;color:${color};letter-spacing:.2em`), b = el(c, 'a h1', title, 'left:98px;top:150px');
  on(a, { t, dy: 0 }); on(b, { t: t + 0.15 }); return b; }
export function caption(c, html, t, out, y = 936) { const e = el(c, 'a h2 c', html, `left:120px;right:120px;top:${y}px`); return on(e, { t, out }); }
export function label(c, x, y, text, t, o = {}) { const e = el(c, 'a s it nw', text, `left:${x}px;top:${y}px;transform-origin:0 0;color:${o.color || '#b9bac2'};font-size:${o.fs || 27}px;letter-spacing:.04em`);
  if (o.center) e.style.cssText += `;width:${o.center}px;margin-left:${-o.center / 2}px;text-align:center`;
  if (o.bg) e.style.cssText += ';background:#0f0f15;padding:2px 12px;border-radius:10px'; return on(e, { t, out: o.out, dy: 0 }); }
export function dot(c, x, y, r = 8, color = '#fff') { return el(c, 'dot', '', `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;background:${color}`); }
// a node on a map: dot + name (+ small line under it)
export function node(c, x, y, name, sub, o = {}) { const g = el(c, 'a', '', `left:${x}px;top:${y}px`);
  el(g, 'dot', '', `left:${-(o.r || 8)}px;top:${-(o.r || 8)}px;width:${2 * (o.r || 8)}px;height:${2 * (o.r || 8)}px;background:${o.color || '#fff'}`);
  const side = o.side || 'right', fs = o.fs || 34;
  const css = side === 'right' ? `left:${(o.r || 8) + 18}px;top:${-fs * 0.72}px` : side === 'below' ? `left:-300px;width:600px;text-align:center;top:${(o.r || 8) + 14}px` : side === 'above' ? `left:-300px;width:600px;text-align:center;bottom:${(o.r || 8) + 12}px` : `right:${(o.r || 8) + 18}px;top:${-fs * 0.72}px;text-align:right`;
  el(g, 'a nw', `<div style="font-size:${fs}px;font-weight:${o.fw || 500};letter-spacing:.03em;color:${o.ink || '#f3f3f5'}">${name}</div>` + (sub ? `<div class="s" style="margin-top:6px;font-size:${o.sfs || 25}px">${sub}</div>` : ''), css);
  return g; }
// illustrated cards
export const chat = (c, x, y, w, h, title) => { const k = el(c, 'card', `<div class="s" style="position:absolute;left:28px;top:20px;font-size:25px">${title}</div><div class="body" style="position:absolute;left:28px;right:28px;top:76px"></div>`, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`); k.body = k.querySelector('.body'); return k; };
export const bubble = (k, text, me = true) => el(k.body, 'bub' + (me ? ' me' : ''), text);
export const box = (c, x, y, w, h, title, color) => { const k = el(c, 'card', (title ? `<div style="position:absolute;left:26px;top:18px;font-size:27px;font-weight:500;letter-spacing:.06em;color:${color || '#b9bac2'}">${title}</div>` : '') + `<div class="body" style="position:absolute;left:24px;right:24px;top:${title ? 70 : 22}px"></div>`, `left:${x}px;top:${y}px;width:${w}px;height:${h}px` + (color ? `;border-color:${color}55` : '')); k.body = k.querySelector('.body'); return k; };
export const row = (k, a, b, color) => el(k.body, 'row', `<span${color ? ` style="color:${color}"` : ''}>${a}</span><span>${b || ''}</span>`);
export const note = (c, x, y, text, color, rot = 0, fs = 30) => el(c, 'a nw', text, `left:${x}px;top:${y}px;padding:12px 22px;border-radius:14px;border:1.5px dashed ${color};color:${color};font-size:${fs}px;background:rgba(255,255,255,.03);transform-origin:50% 50%;rotate:${rot}deg`);
export const paper = (c, x, y, w, h, html, rot = 0) => el(c, 'paper', html, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;rotate:${rot}deg;padding:24px 28px;font-size:28px;line-height:1.5`);
export const tag = (c, x, y, text, color) => el(c, 'a tag', text, `left:${x}px;top:${y}px;color:${color}`);
export const icon = (c, x, y, name, size, color) => el(c, 'a', ico(name, size, color), `left:${x}px;top:${y}px;width:${size}px;height:${size}px`);

// a countdown ring: full at t0, empty at t1
export function ring(c, x, y, t0, t1, size = 76) { const r = size / 2 - 6, L = 2 * Math.PI * r;
  const e = el(c, 'a', `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/><circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#f2b84b" stroke-width="6" stroke-linecap="round" stroke-dasharray="${L.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`, `left:${x - size / 2}px;top:${y - size / 2}px`);
  const arc = e.querySelector('.arc');
  fn((t) => { const on2 = t > t0 - 0.4 && t < t1 + 0.3; e.style.opacity = on2 ? Math.min(ease((t - t0 + 0.4) / 0.4), 1 - ease((t - t1) / 0.3)).toFixed(3) : '0'; arc.setAttribute('stroke-dashoffset', (L * clamp((t - t0) / (t1 - t0))).toFixed(1)); });
  return e; }
