// engine.js — a tiny timeline: elements declare when they are on screen; renderAt(t) writes inline styles only.
// Rule for the frame cache: a frame is exactly what the HTML says after renderAt(t).
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = u => { u = clamp(u); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
const NS = 'http://www.w3.org/2000/svg';
export const V = document.getElementById('v');
const REG = [], FN = [], TEXT = [], BY = new Map(); let WN = 0;
export let T = 0;                                   // the cursor: where "now" is while the film is being declared
export const at = (t) => { T = t; return T; };
export const wait = (d) => { T += d; return T; };
export function el(parent, cls, html = '', css = '') { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; if (css) e.style.cssText = css; (parent || V).appendChild(e); return e; }
// on(e, {t, out, dy, dx, fi, fo, max, sc}): visible from t (default: the cursor) to out (default: forever)
export function on(e, o = {}) {
  const r = { e, t: o.t ?? T, out: o.out ?? 1e9, fi: o.fi ?? 0.55, fo: o.fo ?? 0.45, dy: o.dy ?? 18, dx: o.dx ?? 0, max: o.max ?? 1, sc: o.sc ?? 0, dim: o.dim || [] , tf: o.tf || '' };
  REG.push(r); BY.set(e, r);
  const txt = (o.text ?? e.textContent).replace(/\s/g, '');
  if (txt && o.read !== false) TEXT.push({ r, n: txt.length, wide: (txt.match(/[\u2e80-\uffef]/g) || []).length, s: txt.slice(0, 14) });
  return r;
}
export const off = (r, t = T) => { r.out = t; return r; };
// a text leaves when it is switched off, or when anything that contains it (a card, its chapter) is
const leaves = (r) => { let out = r.out; for (let p = r.e.parentElement; p && p !== V; p = p.parentElement) { const q = BY.get(p); if (q) out = Math.min(out, q.out); } return out; };
export const dim = (r, a, b, level = 0.28) => { r.dim.push([a, b, level]); return r; };          // step back between a and b
export const fn = (f) => FN.push(f);                 // custom per-frame work: f(t)
// ---- svg wires
export function wire(parent, w = 1920, h = 1080) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'wire'); s.setAttribute('width', w); s.setAttribute('height', h); (parent || V).appendChild(s);
  s.dataset.ah = 'ah' + (WN++);                      // one marker id per svg: url(#id) resolves to the first match in the page, which may be hidden
  s.innerHTML = '<defs><marker id="' + s.dataset.ah + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.8 L9 5 L0 9.2 Z" fill="context-stroke"/></marker></defs>'; return s; }
// line(svg, d, {t, dur, out, color, w, arrow, dash}): a path that draws itself
export function line(svg, d, o = {}) {
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', o.color || 'rgba(255,255,255,.4)');
  p.setAttribute('stroke-width', o.w || 2); p.setAttribute('stroke-linecap', 'round'); svg.appendChild(p);
  const L = p.getTotalLength(), r = { p, L, t: o.t ?? T, dur: o.dur ?? 0.9, out: o.out ?? 1e9, arrow: !!o.arrow, dash: o.dash, dim: [] };
  if (!o.dash) p.setAttribute('stroke-dasharray', `${L.toFixed(1)} ${L.toFixed(1)}`); else p.setAttribute('stroke-dasharray', o.dash);
  LINES.push(r); return r;
}
const LINES = [];
export const midOf = (r, u = 0.5) => { const q = r.p.getPointAtLength(r.L * u); return [q.x, q.y]; };
function alpha(r, t) {
  if (t < r.t || t > r.out + r.fo) return 0;
  let a = Math.min(ease((t - r.t) / r.fi), r.out > 1e8 ? 1 : 1 - ease((t - r.out) / r.fo));
  for (const [x, y, lv] of r.dim) if (t > x - 0.4 && t < y + 0.4) a *= lerp(1, lv, Math.min(ease((t - (x - 0.4)) / 0.4), 1 - ease((t - y) / 0.4)));
  return a;
}
export function render(t) {
  for (const r of REG) {
    const a = alpha(r, t) * r.max, s = r.e.style;
    if (a <= 0.001) { s.visibility = 'hidden'; s.opacity = '0'; continue; }
    s.visibility = 'visible'; s.opacity = a.toFixed(3);
    const k = 1 - ease(clamp((t - r.t) / r.fi));
    const tr = (r.dy || r.dx ? `translate(${(k * r.dx).toFixed(1)}px,${(k * r.dy).toFixed(1)}px)` : '') + (r.sc ? ` scale(${(1 - k * r.sc).toFixed(4)})` : '') + r.tf;
    s.transform = tr || 'none';
  }
  for (const r of LINES) {
    const u = ease(clamp((t - r.t) / r.dur));
    let a = t < r.t ? 0 : (r.out > 1e8 ? 1 : 1 - ease((t - r.out) / 0.4));
    for (const [x, y, lv] of r.dim) if (t > x - 0.4 && t < y + 0.4) a *= lerp(1, lv, Math.min(ease((t - (x - 0.4)) / 0.4), 1 - ease((t - y) / 0.4)));
    r.p.setAttribute('opacity', Math.max(0, a).toFixed(3));
    if (!r.dash) r.p.setAttribute('stroke-dashoffset', (r.L * (1 - u)).toFixed(1));
    if (r.arrow) { if (u > 0.96) r.p.setAttribute('marker-end', `url(#${r.p.ownerSVGElement.dataset.ah})`); else r.p.removeAttribute('marker-end'); }
  }
  for (const f of FN) f(t);
}
// reading check: every text needs (characters / 5) seconds on screen; reported, not enforced
// (wide scripts such as Chinese and Japanese: 5 characters per second; the rest: 14 letters per second; plus a moment to find the text)
const need = (x) => x.wide / 5 + (x.n - x.wide) / 14 + 0.8;
export const onscreen = () => TEXT.map(x => ({ t: x.r.t, out: Math.min(leaves(x.r), window.DURATION ?? 1e9), n: x.n, wide: x.wide, s: x.s }));
export const readingReport = () => onscreen().map(x => ({ t: +x.t.toFixed(1), have: +(x.out - x.t).toFixed(1), need: +need(x).toFixed(1), s: x.s })).filter(x => x.have < x.need);
// moments worth a still: just before several things leave together (a beat is cleared, a chapter ends), when the frame is fullest
export const peaks = () => { const n = new Map(); REG.forEach(r => { if (r.out < 1e8) { const k = r.out.toFixed(1); n.set(k, (n.get(k) || 0) + (r.e.classList.contains('ch') ? 2 : 1)); } });
  const ts = [...n].filter(([, c]) => c >= 2).map(([k]) => +(k - 0.4).toFixed(1)).sort((a, b) => a - b); return ts.filter((t, i) => i === ts.length - 1 || ts[i + 1] - t > 2); };
// images must be decoded before frames are captured
export const imagesReady = () => Promise.all([...document.images].map(i => i.decode().catch(() => {})));
const ICON = {};
export async function icons(names) { await Promise.all(names.map(async n => { ICON[n] = (await (await fetch(`/node_modules/lucide-static/icons/${n}.svg`)).text()).replace(/<!--[\s\S]*?-->/, '').replace(/width="24"|height="24"/g, ''); })); }
export const ico = (n, size = 44, color = 'currentColor') => `<span class="ico" style="display:inline-block;width:${size}px;height:${size}px;color:${color};vertical-align:middle">${ICON[n] || ''}</span>`;
export async function fontsReady() {
  await document.fonts.ready; const used = document.body.textContent + '0123456789／・：？，。「」→↔';
  await Promise.all(['300', '400', '500', '700'].map(w => document.fonts.load(`${w} 40px "Noto Sans TC"`, used)));
  await Promise.all([document.fonts.load('600 40px Inter', used), document.fonts.load('400 40px "LXGW WenKai TC"', used)]); await document.fonts.ready;
}
