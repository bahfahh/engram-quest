// demos: DOM surfaces that sit on the 3D screens, paper and boards (mapped with a homography in scene.html).
// Every update(t) is a pure function of t. All times are relative to the beats in content.js.
import { TXT, tx, SEG, B1, B2, B3 } from './content.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const fade = (t, t0, t1, fi = 0.45, fo = 0.45) => Math.min(sstep(t0, t0 + fi, t), 1 - sstep(t1 - fo, t1, t));
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ek = (t, a, b) => ease(clamp((t - a) / (b - a)));

const NOTEXT = new URLSearchParams(location.search).get('notext') === '1';
if (NOTEXT) document.documentElement.classList.add('notext');
const h = (tag, cls = '', css = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (html) e.innerHTML = html; return e; };
const BOUND = [];
const br = s => s.replace(/\n/g, '<br>');
function T(parent, id, cls, css, html) { const o = tx(id); const e = h('div', 'tx ' + (cls || ''), css, html ?? br(o.text)); parent.appendChild(e); BOUND.push({ e, o }); return e; }
export function updateTexts(t) { for (const b of BOUND) { if (!b.e.dataset.tid) b.e.dataset.tid = b.o.id; /* for tools/clarity.cjs */ const v = NOTEXT ? 0 : fade(t, b.o.t0, b.o.t1, 0.4, 0.35); b.e.style.opacity = v; b.e.style.visibility = v > 0.002 ? 'visible' : 'hidden'; } }
const show = (e, v) => { if (e.dataset.d === undefined) e.dataset.d = e.style.display || ''; e.style.opacity = v; e.style.display = v > 0.002 ? e.dataset.d : 'none'; };
const pos = (e, x, y, s = 1, r = 0) => { e.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`; };
const svgNS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs, parent) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const img = (parent, src, css) => { const i = h('img', 'ab', css + ';object-fit:cover'); i.src = src; parent.appendChild(i); return i; };

export const CSS = `
.sf { position:absolute; left:0; top:0; transform-origin:0 0; overflow:hidden; }
.scr { background:#0c0f15; color:#e9eef6; font-family:"Noto Sans TC",sans-serif; }
.scr .glass { position:absolute; inset:0; pointer-events:none; background:linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%), radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.35), rgba(0,0,0,0) 60%); }
.scr .bar { position:absolute; left:0; right:0; top:0; height:34px; background:#171b23; border-bottom:1px solid #232835; }
.scr .bar i { position:absolute; top:12px; width:11px; height:11px; border-radius:50%; background:#3a4150; }
.ab { position:absolute; left:0; top:0; }
.tx { position:absolute; left:0; top:0; white-space:nowrap; }
.lab { font-size:40px; font-weight:700; color:#f3c57a; letter-spacing:0.02em; line-height:1.3; }
.lab2 { font-size:32px; font-weight:500; color:#cfd6e2; line-height:1.35; }
.ttl { font-size:44px; font-weight:700; color:#f6f1e6; }
.ok { color:#5cc28a; } .ng { color:#ec5b4f; }
.stick { background:#f6dd7c; color:#2b2416; font-family:"LXGW WenKai TC",serif; font-weight:700; padding:16px 22px 18px; box-shadow:0 6px 14px rgba(0,0,0,0.35); line-height:1.35; white-space:normal; }
.cap { background:rgba(244,239,228,0.97); color:#231d16; padding:14px 24px 16px; border-radius:4px; box-shadow:0 8px 22px rgba(0,0,0,0.45); white-space:normal; line-height:1.4; }
.cap .src { display:block; font-size:28px; color:#6a5d4a; margin-top:6px; font-weight:500; }
.rec { color:#fff7e8; font-weight:700; white-space:normal; line-height:1.4; text-align:center; text-shadow:0 2px 12px rgba(0,0,0,0.6); }
.pin { position:absolute; width:18px; height:18px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #ff8a7a, #b8281e 70%); box-shadow:0 3px 4px rgba(0,0,0,0.45); }
.card { position:absolute; background:#fbf8f1; box-shadow:0 8px 18px rgba(0,0,0,0.4); }
.s3 .ttl { font-size:52px !important; } .s3 .lab { font-size:44px !important; } .s3 .stick { font-size:38px !important; }
/* notext: pictures are blurred on a canvas in scene.html (studioReady), not with a CSS filter */
`;
const chrome = (root) => { const b = h('div', 'bar'); [16, 34, 52].forEach(x => b.appendChild(h('i', '', `left:${x}px`))); root.appendChild(b); };
const glass = (root) => root.appendChild(h('div', 'glass'));
const pinAt = (p, x, y) => p.appendChild(h('div', 'pin', `left:${x - 9}px;top:${y - 9}px`));

/* ============================================================== little animated pictograms (reused by the board, the cork boards and the rack) ============================================================== */
// each returns { el, update(k) } where k is a 0..1 loop phase
function picSideBySide(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  const A = h('div', 'ab', `left:${w * 0.06}px;top:${hh * 0.2}px;width:${w * 0.4}px;height:${hh * 0.6}px;background:#e9eef6;border-radius:6px`), B = h('div', 'ab', `left:${w * 0.54}px;top:${hh * 0.2}px;width:${w * 0.4}px;height:${hh * 0.6}px;background:#e9eef6;border-radius:6px`);
  [A, B].forEach(x => { x.appendChild(h('div', 'ab', 'left:12%;top:22%;width:60%;height:14%;border-radius:4px;background:#9aa6ba')); x.appendChild(h('div', 'ab', 'left:12%;top:55%;width:76%;height:14%;border-radius:4px;background:#3aa38a')); el.appendChild(x); });
  const bad = h('div', 'ab', 'left:62%;top:-12%;width:52%;height:32%;border-radius:4px;background:#3b6fd8'); B.appendChild(bad);
  const ring = h('div', 'ab', `left:${w * 0.72}px;top:${hh * 0.06}px;width:${w * 0.26}px;height:${hh * 0.36}px;border:3px dashed #ec5b4f;border-radius:50%;box-sizing:border-box`); el.appendChild(ring);
  return { el, update(k) { const fix = k > 0.55; bad.style.left = fix ? '30%' : '62%'; bad.style.top = fix ? '78%' : '-12%'; bad.style.height = fix ? '12%' : '32%'; ring.style.borderColor = fix ? '#5cc28a' : '#ec5b4f'; ring.style.borderStyle = fix ? 'solid' : 'dashed'; ring.style.opacity = k > 0.15 ? 1 : 0; } }; }
function picScore(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  const rows = [0, 1, 2, 3].map(i => { const r = h('div', 'ab', `left:${w * 0.06}px;top:${hh * (0.08 + i * 0.16)}px;width:${w * 0.5}px;height:${hh * 0.11}px;border-radius:3px;background:#2a3142`); const m = h('div', 'ab', `left:${-w * 0.0}px;top:-2px;font:700 ${hh * 0.12}px Inter;color:${i === 3 ? '#ec5b4f' : '#5cc28a'}`, i === 3 ? '✗' : '✓'); r.appendChild(m); el.appendChild(r); return { r, m }; });
  const bg = h('div', 'ab', `left:${w * 0.06}px;top:${hh * 0.76}px;width:${w * 0.88}px;height:${hh * 0.13}px;border-radius:4px;background:#2a3142`); el.appendChild(bg);
  const fill = h('div', 'ab', `left:${w * 0.06}px;top:${hh * 0.76}px;height:${hh * 0.13}px;border-radius:4px;background:#5cc28a`); el.appendChild(fill);
  el.appendChild(h('div', 'ab', `left:${w * 0.06 + w * 0.88 * 0.5}px;top:${hh * 0.7}px;width:3px;height:${hh * 0.25}px;background:#f6f1e6`));
  const gate = h('div', 'ab', `left:${w * 0.62}px;top:${hh * 0.06}px;width:${w * 0.32}px;height:${hh * 0.6}px;border:3px solid #ec5b4f;border-radius:6px;box-sizing:border-box`); el.appendChild(gate);
  return { el, update(k) { const v = 0.66 * ek(k, 0.05, 0.4); fill.style.width = (w * 0.88 * v) + 'px'; const g = k > 0.6; fill.style.background = g ? '#555c68' : '#5cc28a'; gate.style.opacity = g ? 1 : 0; rows.forEach((o, i) => o.m.style.opacity = k > 0.04 * i ? 1 : 0); } }; }
function picSkeleton(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  const y = hh * 0.3, H2 = hh * 0.4;
  const head = h('div', 'ab', `left:${w * 0.04}px;top:${y}px;width:${w * 0.16}px;height:${H2}px;border-radius:4px;background:#e8d4a8`), tail = h('div', 'ab', `left:${w * 0.8}px;top:${y}px;width:${w * 0.16}px;height:${H2}px;border-radius:4px;background:#2f5a44`);
  el.appendChild(head); el.appendChild(tail);
  const cl = [w * 0.2, w * 0.78].map(x => { const c = h('div', 'ab', `left:${x - 4}px;top:${y - 6}px;width:8px;height:${H2 + 12}px;border-radius:3px;background:#e0b85a`); el.appendChild(c); return c; });
  const mid = h('div', 'ab', `left:${w * 0.23}px;top:${y + 4}px;width:${w * 0.54}px;height:${H2 - 8}px;border-radius:4px`); el.appendChild(mid);
  const cols = ['#cfe3f7', '#f2f2ee', '#7fb6e8', '#e2843c'];
  return { el, update(k) { const i = Math.floor(k * 4) % 4; mid.style.background = cols[i]; mid.style.transform = `translateY(${-(1 - ek((k * 4) % 1, 0, 0.25)) * hh * 0.3}px)`; mid.style.opacity = ek((k * 4) % 1, 0, 0.2); } }; }
function picClay(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  for (let i = 0; i < 3; i++) { const x = w * (0.08 + i * 0.3); const c = ['#c98a5a', '#7a8aa0', '#8aa06a'][i];
    el.appendChild(h('div', 'ab', `left:${x}px;top:${hh * 0.55}px;width:${w * 0.24}px;height:${hh * 0.3}px;border-radius:10px;background:${c};box-shadow:inset -4px -5px 0 rgba(0,0,0,0.2)`));
    el.appendChild(h('div', 'ab', `left:${x + w * 0.04}px;top:${hh * 0.3}px;width:${w * 0.16}px;height:${hh * 0.28}px;border-radius:10px;background:${c};filter:brightness(1.15);box-shadow:inset -4px -5px 0 rgba(0,0,0,0.2)`)); }
  return { el, update() {} }; }
function picRows13(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  for (let i = 0; i < 9; i++) { const y = hh * 0.06 + i * hh * 0.1; el.appendChild(h('div', 'ab', `left:${w * 0.06}px;top:${y}px;width:${w * 0.18}px;height:${hh * 0.07}px;background:#5a6a86`)); el.appendChild(h('div', 'ab', `left:${w * 0.26}px;top:${y}px;width:${w * 0.5}px;height:${hh * 0.07}px;background:#d9dee8`)); el.appendChild(h('div', 'ab', `left:${w * 0.78}px;top:${y}px;width:${w * 0.16}px;height:${hh * 0.07}px;background:#e8d9b4`)); }
  return { el, update() {} }; }
function picSegments(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  const y = hh * 0.55; let x = w * 0.04; [0.14, 0.13, 0.13, 0.24, 0.22, 0.1].forEach((f, i) => { el.appendChild(h('div', 'ab', `left:${x}px;top:${y}px;width:${w * f - 3}px;height:${hh * 0.3}px;border-radius:3px;background:${['#e8d4a8', '#cfe3f7', '#d8ecd9', '#f3e1c7', '#e6d9f3', '#2f5a44'][i]}`));
    if (i >= 1 && i <= 4) el.appendChild(h('div', 'ab', `left:${x + w * f - 22}px;top:${hh * 0.12}px;width:18px;height:${hh * 0.3}px;background:#fbf8f1;border-radius:2px`)); x += w * f; });
  return { el, update() {} }; }
function picPriceTable(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px;background:#f4f6fa;border-radius:6px`);
  [0.36, 0.5, 0.62, 0.55].forEach((f, i) => { const y = hh * (0.12 + i * 0.2); el.appendChild(h('div', 'ab', `left:${w * 0.06}px;top:${y}px;width:${w * (0.08 + i * 0.03)}px;height:${w * (0.08 + i * 0.03)}px;background:#9aa6ba;border-radius:2px`));
    el.appendChild(h('div', 'ab', `left:${w * 0.3}px;top:${y + 4}px;width:${w * f}px;height:${hh * 0.1}px;border-radius:3px;background:${i === 3 ? '#ec5b4f' : '#3b6fd8'}`)); });
  return { el, update() {} }; }
function picBars13(w, hh) { const el = h('div', 'ab', `width:${w}px;height:${hh}px`);
  const AI = [0.770, 0.715, 0.746, 0.723, 0.793, 0.770, 0.746, 0.730, 0.723, 0.707, 0.730, 0.711, 0.777]; const base = hh * 0.9, y = v => base - (v - 0.5) / 0.4 * hh * 0.8;
  AI.forEach((v, i) => el.appendChild(h('div', 'ab', `left:${w * 0.05 + i * w * 0.07}px;top:${y(v)}px;width:${w * 0.05}px;height:${base - y(v)}px;background:#7fb6e8`)));
  el.appendChild(h('div', 'ab', `left:${w * 0.07}px;top:${y(0.67)}px;width:${w * 0.03}px;height:${base - y(0.67)}px;background:#f3c57a`));
  el.appendChild(h('div', 'ab', `left:${w * 0.03}px;top:${y(0.7)}px;width:${w * 0.94}px;height:0;border-top:3px dashed #f6f1e6`));
  return { el, update() {} }; }

/* ============================================================== signs, notes, timetable ============================================================== */
export function buildSign(key) {
  const w = 1080, hh = 484; const el = h('div', 'sf', `width:${w}px;height:${hh}px;background:linear-gradient(180deg,#22324c,#1a273b);border:10px solid #e9e1cf;box-sizing:border-box;color:#f4efe4;font-family:"Noto Sans TC"`);
  const n = { s1: 1, s2: 2, s3: 3 }[key];
  T(el, key + '_date', '', 'left:44px;top:26px;font-size:112px;font-weight:700;letter-spacing:0.02em');
  T(el, key + '_name', '', 'left:48px;top:186px;font-size:56px;font-weight:700;color:#ffd9a0');
  T(el, key + '_ctx', '', 'left:48px;top:284px;width:980px;font-size:48px;font-weight:500;white-space:normal;line-height:1.32;color:#e8edf5');
  el.appendChild(h('div', '', 'position:absolute;right:40px;top:44px;width:120px;height:120px;border-radius:50%;border:6px solid #ffd9a0;color:#ffd9a0;font:700 70px Inter,sans-serif;display:flex;align-items:center;justify-content:center', String(n)));
  return { el, w, h: hh, update() {} };
}
export function buildNote(key) {
  const w = 500, hh = 350; const el = h('div', 'sf', `width:${w}px;height:${hh}px;background:#f6dd7c;box-shadow:inset 0 -20px 30px rgba(120,90,20,0.12)`);
  el.appendChild(h('div', '', 'position:absolute;left:170px;top:-6px;width:160px;height:34px;background:rgba(240,235,220,0.75);transform:rotate(-2deg)'));
  T(el, key + '_q', '', 'left:34px;top:44px;width:432px;font-size:50px;font-weight:700;color:#2b2416;white-space:normal;line-height:1.38;font-family:"Noto Sans TC"');
  return { el, w, h: hh, update() {} };
}
export const BOARD_W = 1600, BOARD_H = 760;
export function buildBoard() {
  const w = BOARD_W, hh = BOARD_H; const el = h('div', 'sf', `width:${w}px;height:${hh}px;background:radial-gradient(ellipse at 50% 0%, #1c2a40, #0f1724 70%);color:#f4efe4;font-family:"Noto Sans TC"`);
  el.appendChild(h('div', '', 'position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% -12%, rgba(255,214,150,0.22), rgba(0,0,0,0) 70%)'));
  el.appendChild(h('div', '', 'position:absolute;left:40px;right:40px;top:112px;height:4px;background:#d9b46a;opacity:0.8'));
  T(el, 'tt_head', '', 'left:56px;top:34px;font-size:50px;font-weight:700');
  T(el, 'tt_stop', '', 'left:1290px;top:40px;font-size:40px;font-weight:700;color:#0f1724;background:#ffcf7a;padding:2px 18px;border-radius:6px');
  const rows = [['tt_r1', picSideBySide], ['tt_r2', picScore], ['tt_r3', picSkeleton]];
  const R = rows.map(([id, pic], i) => { const y = 136 + i * 150; const o = tx(id); const [d, name, q] = o.text.split('｜');
    const lamp = h('div', '', `position:absolute;left:58px;top:${y + 46}px;width:26px;height:26px;border-radius:50%;background:#ffcf7a;box-shadow:0 0 22px 6px rgba(255,190,90,0.7)`); el.appendChild(lamp);
    const row = h('div', 'tx', `left:108px;top:${y + 26}px`, `<span style="display:inline-block;width:160px;font-size:40px;font-weight:700;color:#ffcf7a">${d}</span><span style="display:inline-block;width:410px;font-size:50px;font-weight:700">${name}</span><span style="font-size:35px;font-weight:500;color:#cfd8e6">${q}</span>`); el.appendChild(row); BOUND.push({ e: row, o });
    const box = h('div', 'ab', `left:1258px;top:${y + 4}px;width:300px;height:128px;border-radius:10px;background:#0c111a;border:3px solid #33405a;overflow:hidden`); el.appendChild(box);
    const p = pic(300, 128); box.appendChild(p.el); return { lamp, box, p, t0: o.t0 }; });
  el.appendChild(h('div', '', 'position:absolute;left:40px;right:40px;top:592px;height:2px;background:#5a6478'));
  T(el, 'tt_other', '', 'left:56px;top:612px;width:1490px;font-size:35px;font-weight:500;color:#cfd6e2;white-space:normal;line-height:1.4');
  return { el, w, h: hh, update(t) { for (const r of R) { const on = sstep(r.t0, r.t0 + 0.6, t); show(r.lamp, on * (0.85 + 0.15 * Math.sin(t * 3)));
    const flash = fade(t, r.t0, r.t0 + 5.2, 0.5, 0.8); r.box.style.borderColor = flash > 0.05 ? `rgba(255,207,122,${0.4 + 0.6 * flash})` : '#33405a'; r.box.style.boxShadow = `0 0 ${24 * flash}px rgba(255,190,90,${0.6 * flash})`;
    show(r.box, on); r.box.style.transform = `scale(${1 + 0.06 * flash})`; r.p.update(((t - r.t0) / 4.6) % 1); } } };
}

/* ============================================================== cork boards: three sources → strings → the big card grows a small mind map → the empty slot gets pinned ============================================================== */
export function buildCork(key) {
  const w = 1100, hh = 933; const el = h('div', 'sf', `width:${w}px;height:${hh}px;background:transparent`);
  const B = { s1: B1, s2: B2, s3: B3 }[key]; const W0 = B.wrap;
  const items = [];
  const add = (node, t0, x, y, rot) => { el.appendChild(node); node.style.left = x + 'px'; node.style.top = y + 'px'; node.style.transform = `rotate(${rot}deg)`; items.push([node, t0]); return node; };
  const SRC = {
    s1: [['img', 'assets/basic-table.jpg', W0 + 0.2], ['pic', picClay, W0 + 0.4], ['img', 'assets/sim-ui.jpg', W0 + 0.6]],
    s2: [['img', 'assets/rubric-flow.svg', W0 + 0.2], ['pic', picPriceTable, W0 + 0.4], ['pic', picBars13, W0 + 0.6]],
    s3: [['img', 'assets/v1-open.jpg', B.v1 + 3], ['img', 'assets/v2-class.jpg', B.v2 + 2], ['img', 'assets/v3-kp4.jpg', B.v3 + 8]],
  }[key];
  const NODE = { s1: [picSideBySide, picClay, picSideBySide], s2: [picScore, picPriceTable, picBars13], s3: [picRows13, picSegments, picSkeleton] }[key];
  const srcX = [30, 390, 750];
  const srcs = SRC.map(([kind, what, t0], i) => { const d = h('div', 'card', 'width:320px;height:200px;padding:8px;background:#fbf8f1;box-sizing:border-box;overflow:hidden');
    if (kind === 'img') img(d, what, 'left:8px;top:8px;width:304px;height:184px'); else { const inner = h('div', 'ab', 'left:8px;top:8px;width:304px;height:184px;background:#141a26;border-radius:4px'); d.appendChild(inner); inner.appendChild(what(304, 184).el); }
    pinAt(d, 160, 6); return add(d, t0, srcX[i], 26 + (i % 2) * 10, [-1.4, 1.1, -0.6][i]); });
  let bigPrint = null;
  if (key === 's1') { bigPrint = h('div', 'card', 'width:1000px;padding:10px;background:#fbf8f1'); img(bigPrint, 'assets/basic-table.jpg', 'position:relative;display:block;width:1000px;height:349px;left:0;top:0');
    bigPrint.appendChild(h('div', '', 'position:absolute;left:4px;top:158px;width:1008px;height:82px;border:7px solid #e0322a;border-radius:6px;box-sizing:border-box')); pinAt(bigPrint, 500, 4);
    el.appendChild(bigPrint); bigPrint.style.left = '40px'; bigPrint.style.top = '40px'; bigPrint.style.transform = 'rotate(-0.6deg)';
    T(el, 's1_tbl', '', 'left:60px;top:430px;font-size:40px;font-weight:700;color:#fff6e6;background:rgba(30,20,10,0.75);padding:4px 16px;border-radius:4px'); }
  const big = h('div', 'card', 'width:840px;height:420px;background:#fffdf6;border-top:10px solid #c0392b;box-sizing:border-box'); add(big, W0 + 0.3, 130, 300, -0.6); pinAt(big, 420, 4);
  const mapSvg = S('svg', { width: 840, height: 420, style: 'position:absolute;left:0;top:0' }, big);
  const nodeX = [100, 420, 740], nodes = NODE.map((pic, i) => { const n = h('div', 'ab', `left:${nodeX[i] - 70}px;top:26px;width:140px;height:84px;border-radius:8px;background:#141a26;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.3)`); const p = pic(140, 84); n.appendChild(p.el); big.appendChild(n); return { n, p }; });
  const chalk = nodeX.map(x => S('path', { d: `M${x},110 C ${x},170 420,170 420,210`, fill: 'none', stroke: '#b8a98a', 'stroke-width': 3, 'stroke-dasharray': '7 6' }, mapSvg));
  T(big, key + '_rule', '', 'left:0;top:196px;width:840px;text-align:center;font-size:48px;font-weight:700;color:#221c14;white-space:normal;line-height:1.35');
  const strings = S('svg', { width: w, height: hh, style: 'position:absolute;left:0;top:0;overflow:visible' }, el);
  const yarn = srcX.map((x, i) => S('path', { d: `M${x + 160},${230} C ${x + 160},280 ${130 + nodeX[i]},270 ${130 + nodeX[i]},${326}`, fill: 'none', stroke: '#c0392b', 'stroke-width': 3.5 }, strings));
  const slot = h('div', 'ab', 'width:570px;height:150px;border:4px dashed rgba(240,230,210,0.85);border-radius:6px;box-sizing:border-box'); add(slot, W0 + 0.3, 506, 752, 0);
  const open = h('div', 'card', 'padding:20px 24px 22px;background:#1b1d22;border:3px solid #cfc6b2;box-sizing:border-box;width:570px;height:150px');
  T(open, key + '_open', '', 'position:relative;font-size:28px;font-weight:500;color:#efe7d6;white-space:nowrap;line-height:1.45'); add(open, tx(key + '_open').t0, 506, 752, 1.2); pinAt(open, 285, 6);
  return { el, w, h: hh, update(t) {
    for (const [n, t0] of items) show(n, sstep(t0, t0 + 0.35, t));
    if (bigPrint) show(bigPrint, fade(t, B.cork + 0.6, W0 + 0.3, 0.35, 0.4));
    srcs.forEach((d, i) => { const k = ek(t, W0 + 1.0 + i * 0.5, W0 + 1.9 + i * 0.5); yarn[i].style.strokeDasharray = '400'; yarn[i].style.strokeDashoffset = String(400 * (1 - k)); yarn[i].style.opacity = k > 0 ? 1 : 0;
      const nk = sstep(W0 + 1.7 + i * 0.5, W0 + 2.1 + i * 0.5, t); show(nodes[i].n, nk); nodes[i].n.style.transform = `scale(${0.6 + 0.4 * nk})`; nodes[i].p.update(((t - W0) / 3) % 1);
      chalk[i].style.opacity = sstep(W0 + 2.2 + i * 0.4, W0 + 2.6 + i * 0.4, t); });
    const o0 = tx(key + '_open').t0; open.style.transform = `translateY(${-30 * (1 - ek(t, o0, o0 + 0.5))}px) rotate(1.2deg)`;
    slot.style.opacity = String(1 - sstep(o0 + 0.2, o0 + 0.5, t));
  } };
}

/* ============================================================== station 1: two monitors ============================================================== */
const W1 = 900, H1 = 506;
function uglyFrame(w, hh, seed = 1) {
  const f = h('div', 'ab', `width:${w}px;height:${hh}px;background:#cdd2d8;overflow:hidden`);
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const cards = [];
  for (let i = 0; i < 14; i++) { const cw = w * (0.13 + rnd() * 0.06), ch = hh * (0.14 + rnd() * 0.06); const x = rnd() * (w - cw), y = rnd() * (hh - ch);
    const c = h('div', 'ab', `width:${cw}px;height:${ch}px;background:${['#ffffff', '#e9eef5', '#f6f1e4'][i % 3]};border:2px solid #9aa4b2;box-sizing:border-box`);
    c.appendChild(h('div', 'ab', `left:8%;top:18%;width:60%;height:12%;background:${['#3b6fd8', '#e2643c', '#1f2a44', '#3aa38a'][i % 4]}`)); c.appendChild(h('div', 'ab', 'left:8%;top:45%;width:80%;height:8%;background:#b9c0cb')); c.appendChild(h('div', 'ab', 'left:8%;top:63%;width:70%;height:8%;background:#b9c0cb'));
    pos(c, x, y); f.appendChild(c); cards.push({ c, x, y, cw, ch }); }
  return { f, cards };
}
// a small "real interface": the reference is clean; our version has three visible defects (cut edge, a misplaced text bar, a stuttering cursor)
function mockUI(parent, flawed, x0, y0) {
  const box = h('div', 'ab', `left:${x0}px;top:${y0}px;width:600px;height:210px;background:#f4f6fa;border-radius:12px;color:#1f2a44;overflow:hidden`); parent.appendChild(box);
  box.appendChild(h('div', 'ab', 'left:0;top:0;width:600px;height:36px;background:#e3e8f0'));
  const rows = [0, 1, 2].map(i => { const r = h('div', 'ab', `left:24px;top:${50 + i * 52}px;width:552px;height:42px;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.08)`); box.appendChild(r);
    const tbar = h('div', 'ab', `left:16px;top:14px;width:${[190, 150, 220][i]}px;height:14px;border-radius:7px;background:#9aa6ba`); r.appendChild(tbar); return { r, tbar }; });
  const card = h('div', 'ab', 'top:48px;width:190px;height:46px;border-radius:8px;background:#3b6fd8;box-shadow:0 3px 8px rgba(0,0,0,0.25)'); box.appendChild(card);
  const fillBg = h('div', 'ab', 'left:300px;top:118px;width:240px;height:16px;border-radius:8px;background:#dde3ec'); box.appendChild(fillBg);
  const fill = h('div', 'ab', 'left:0;top:0;height:16px;border-radius:8px;background:#3aa38a'); fillBg.appendChild(fill);
  const curs = [0, 1, 2].map(i => { const c = h('div', 'ab', `width:0;height:0;border-left:16px solid rgba(17,17,17,${i === 0 ? 1 : 0.35});border-top:10px solid transparent;border-bottom:10px solid transparent;transform-origin:0 0`); box.appendChild(c); return c; });
  return { box, update(t, fixAt) {
    const k = (t * 0.3) % 1; fill.style.width = (40 + 190 * k) + 'px';
    const cx = 380 + 60 * Math.sin(t * 1.1), cy = 150 + 14 * Math.cos(t * 1.4);
    const stutter = flawed && t < fixAt[2];
    curs.forEach((c, i) => { c.style.transform = `translate(${cx - (stutter ? i * 26 : 0)}px,${cy - (stutter ? i * 6 : 0)}px) rotate(-28deg)`; c.style.display = i === 0 || stutter ? '' : 'none'; });
    const cut = flawed && t < fixAt[0]; card.style.left = cut ? '492px' : '384px';
    const mis = flawed && t < fixAt[1]; rows[1].tbar.style.transform = mis ? 'translate(-6px,30px)' : 'none'; rows[1].tbar.style.background = mis ? '#7f8aa0' : '#9aa6ba';
  } };
}
function waveform(parent, x, y, w, hh) {
  const sv = S('svg', { width: w, height: hh, style: `position:absolute;left:${x}px;top:${y}px` }, parent);
  S('rect', { x: 0, y: 0, width: w, height: hh, fill: '#141821' }, sv);
  let d = ''; for (let i = 0; i < 180; i++) { const xx = 12 + i * (w - 24) / 180; const a = (Math.sin(i * 0.37) * 0.5 + Math.sin(i * 0.11 + 1) * 0.35 + 0.25) * (hh * 0.38); d += `M${xx},${hh / 2 - Math.abs(a)}L${xx},${hh / 2 + Math.abs(a)}`; }
  S('path', { d, stroke: '#7fb6e8', 'stroke-width': 2.4 }, sv);
  const head = S('line', { x1: 0, y1: 4, x2: 0, y2: hh - 4, stroke: '#ffcf7a', 'stroke-width': 3 }, sv);
  return { update(t) { const k = ((t - B1.ab) / 12) % 1; head.setAttribute('x1', 12 + k * (w - 24)); head.setAttribute('x2', 12 + k * (w - 24)); } };
}
const UIX = 150, UIY = 128;
export function buildS1R() {
  const el = h('div', 'sf scr', `width:${W1}px;height:${H1}px`); chrome(el);
  // --- pipeline (five layers, one gate each) ---
  const pipe = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(pipe);
  const gx = [92, 232, 372, 512, 652], laneY = 250;
  T(pipe, 's1_pl', 'lab2', 'left:30px;top:46px;font-size:34px;color:#e9eef6;font-weight:700');
  const lane = S('svg', { width: W1, height: H1, style: 'position:absolute;left:0;top:0' }, pipe);
  S('line', { x1: 20, y1: laneY + 30, x2: 860, y2: laneY + 30, stroke: '#2c3342', 'stroke-width': 8, 'stroke-linecap': 'round' }, lane);
  const gates = gx.map((x, i) => { const g = h('div', 'ab', ''); pipe.appendChild(g); pos(g, x - 36, laneY - 70);
    g.appendChild(h('div', 'ab', 'left:0;top:0;width:8px;height:104px;background:#5a6272;border-radius:3px')); g.appendChild(h('div', 'ab', 'left:64px;top:0;width:8px;height:104px;background:#5a6272;border-radius:3px'));
    const arm = h('div', 'ab', `left:4px;top:6px;width:66px;height:12px;border-radius:6px;background:${i < 3 ? 'repeating-linear-gradient(90deg,#e8e2d2 0 12px,#c0392b 12px 24px)' : 'transparent'};border:${i < 3 ? 'none' : '3px dashed #5a6272'};transform-origin:6px 6px`); g.appendChild(arm);
    const light = h('div', 'ab', 'left:24px;top:-34px;width:24px;height:24px;border-radius:50%;background:#2a3040'); g.appendChild(light);
    return { g, arm, light }; });
  ['s1_g1', 's1_g2', 's1_g3', 's1_g4', 's1_g5'].forEach((id, i) => T(pipe, id, 'lab', `left:${gx[i] - 40}px;top:${laneY + 50}px;width:80px;text-align:center;font-size:38px`));
  const tray = h('div', 'ab', 'left:770px;top:196px;width:110px;height:110px;border:4px solid #5a6272;border-radius:10px;box-sizing:border-box'); pipe.appendChild(tray);
  tray.appendChild(h('div', 'ab', 'left:26px;top:30px;width:50px;height:42px;border:4px solid #5a6272;border-radius:6px;box-sizing:border-box'));
  tray.appendChild(h('div', 'ab', 'left:44px;top:42px;width:0;height:0;border-left:16px solid #5a6272;border-top:10px solid transparent;border-bottom:10px solid transparent'));
  const mini = uglyFrame(96, 60, 3); const frame = h('div', 'ab', 'width:96px;height:60px;box-shadow:0 4px 10px rgba(0,0,0,0.5)'); frame.appendChild(mini.f); pipe.appendChild(frame);
  const stamps = [0, 1].map(i => { const s = h('div', 'ab', 'width:56px;height:56px;border-radius:50%;border:5px solid #5cc28a;color:#5cc28a;font:700 34px Inter;display:flex;align-items:center;justify-content:center;box-sizing:border-box', '✓'); pipe.appendChild(s); pos(s, gx[i] - 28, 96); return s; });
  const chips = ['#1f2a44', '#e2643c', '#f3efe6', '#7b8aa6', '#3aa38a'].map((c, i) => { const s = h('div', 'ab', `width:26px;height:26px;background:${c};border:2px solid #0c0f15;box-shadow:0 0 0 2px #5a6272`); pipe.appendChild(s); pos(s, gx[2] - 74 + i * 30, 132); return s; });
  const chipOk = h('div', 'ab ok', 'font:700 34px Inter', '✓'); pipe.appendChild(chipOk); pos(chipOk, gx[2] + 82, 124);
  T(pipe, 's1_sw', 'lab', 'left:30px;top:380px;font-size:36px;white-space:normal;width:840px');
  const newGate = h('div', 'ab', 'left:0;top:0'); pipe.appendChild(newGate);
  newGate.appendChild(h('div', 'ab', `left:${gx[2] - 52}px;top:${laneY - 84}px;width:104px;height:120px;border:5px dashed #f3c57a;border-radius:10px;box-sizing:border-box;background:rgba(243,197,122,0.08)`));
  newGate.appendChild(h('div', 'ab', `left:${gx[2] - 24}px;top:${laneY - 56}px;width:48px;height:36px;border:5px solid #f3c57a;border-radius:6px;box-sizing:border-box`));
  newGate.appendChild(h('div', 'ab', `left:${gx[2] - 9}px;top:${laneY - 47}px;width:18px;height:18px;border:4px solid #f3c57a;border-radius:50%;box-sizing:border-box`));
  const stillSlot = h('div', 'ab', `left:${gx[2] - 96}px;top:${laneY - 180}px;width:150px;height:88px;border:4px solid #f3c57a;border-radius:6px;box-sizing:border-box;background:#22283a`); newGate.appendChild(stillSlot);
  const refSlot = h('div', 'ab', `left:${gx[2] + 80}px;top:${laneY - 180}px;width:150px;height:88px;border:4px dashed #9fd0ff;border-radius:6px;box-sizing:border-box`); newGate.appendChild(refSlot);
  newGate.appendChild(h('div', 'ab', `left:${gx[2] + 64}px;top:${laneY - 162}px;font:700 40px Inter;color:#9fd0ff;width:0;overflow:visible`, '⇄'));
  T(newGate, 's1_ref', 'lab', `left:${gx[2] + 110}px;top:${laneY - 226}px;font-size:34px;color:#9fd0ff`);
  T(newGate, 's1_gate', 'lab', 'left:30px;top:380px;font-size:36px;white-space:normal;width:840px');
  // --- ugly → good (one condition) ---
  const ug = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(ug);
  const big = uglyFrame(560, 315, 7); const bigWrap = h('div', 'ab', 'left:170px;top:52px;width:560px;height:315px;box-shadow:0 10px 26px rgba(0,0,0,0.55);overflow:hidden'); bigWrap.appendChild(big.f); ug.appendChild(bigWrap);
  const tex = h('div', 'ab', 'left:0;top:0;width:560px;height:315px;background:radial-gradient(ellipse at 55% 40%, rgba(255,226,170,0.85), rgba(255,226,170,0) 55%), repeating-linear-gradient(17deg, rgba(120,90,60,0.05) 0 3px, rgba(255,255,255,0.04) 3px 7px), linear-gradient(160deg,#f3e6cc,#d9c09a)'); bigWrap.appendChild(tex);
  const hero = h('div', 'ab', 'left:140px;top:58px;width:280px;height:200px;background:#fffaf0;border-radius:14px;box-shadow:0 18px 30px rgba(90,60,20,0.35)'); bigWrap.appendChild(hero);
  hero.appendChild(h('div', 'ab', 'left:90px;top:30px;width:100px;height:100px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffb36b,#e2643c)'));
  hero.appendChild(h('div', 'ab', 'left:56px;top:150px;width:168px;height:16px;border-radius:8px;background:#1f2a44'));
  T(ug, 's1_ug1', 'lab', 'left:0;top:392px;width:900px;text-align:center;font-size:38px;color:#ff9a8e');
  T(ug, 's1_ug2', 'lab', 'left:0;top:392px;width:900px;text-align:center;font-size:38px');
  // --- round 1: five clay tiles, each with its own tick ---
  const r1 = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(r1);
  const clayCols = [['#c98a5a', '#8a6a4a', '#d9b48a'], ['#7a8aa0', '#5a6a80', '#a8b4c4'], ['#b07a8a', '#8a5a6a', '#d0a0b0'], ['#8aa06a', '#6a804a', '#b0c490'], ['#c0a060', '#907040', '#e0c890']];
  const tiles = clayCols.map((cc, i) => { const tl = h('div', 'ab', 'width:160px;height:170px;background:#2a2f3a;border-radius:8px;overflow:hidden'); r1.appendChild(tl);
    const rr = (x, y, w, hh, c, rad = 18) => tl.appendChild(h('div', 'ab', `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;background:${c};border-radius:${rad}px;box-shadow:inset -6px -8px 0 rgba(0,0,0,0.18)`));
    rr(20, 104, 120, 50, cc[1]); rr(36, 62, 86, 48, cc[0]); rr(56, 30, 50, 38, cc[2], 14); rr(100 - (i % 3) * 20, 82, 30, 30, cc[2], 10);
    const chk = h('div', 'ab ok', 'left:122px;top:4px;font:700 34px Inter', '✓'); tl.appendChild(chk); return { tl, chk }; });
  T(r1, 's1_r1b', 'lab', 'left:22px;top:48px;font-size:40px');
  T(r1, 's1_r1c', 'lab2', 'left:22px;top:392px;width:860px;font-size:34px;color:#f6f1e6;white-space:normal');
  T(r1, 's1_rec', 'rec', 'left:30px;top:44px;width:840px;font-size:46px');
  // --- round 2 (evidence) and reveal: our version, defects circled then fixed ---
  const rv = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(rv);
  const ui = mockUI(rv, true, UIX, UIY);
  T(rv, 's1_r2b', 'lab', 'left:26px;top:46px;font-size:36px;color:#ffb0a6');
  const CIRC = [[UIX + 600, UIY + 72], [UIX + 120, UIY + 132], [UIX + 360, UIY + 158]];
  const circles = CIRC.map(([x, y]) => { const c = h('div', 'ab', 'width:170px;height:100px;border:5px dashed #ec5b4f;border-radius:50%;box-sizing:border-box'); rv.appendChild(c); pos(c, x - 85, y - 50); return c; });
  const r2cap = h('div', 'ab', 'left:24px;top:372px;width:852px'); rv.appendChild(r2cap); T(r2cap, 's1_r2c', 'cap', 'position:relative;display:block;font-size:34px;font-weight:700;width:800px');
  const ans = h('div', 'ab', 'left:22px;top:262px;width:856px'); el.appendChild(ans);
  T(ans, 's1_ans', 'cap', 'position:relative;display:block;font-size:34px;font-weight:700;width:806px', `${br(tx('s1_ans').text)}<span class="src">${tx('s1_ansrc').text}</span>`);
  // --- A/B ---
  const ab = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(ab);
  img(ab, 'assets/sim-ui.jpg', `left:0;top:34px;width:${W1}px;height:${H1 - 34 - 70}px`);
  const wave = waveform(ab, 0, H1 - 70, W1, 70);
  T(ab, 's1_ab3', 'lab2', 'left:24px;top:46px;font-size:32px;color:#fff;background:rgba(12,15,21,0.78);padding:4px 12px');
  T(ab, 's1_ab4', 'stick', 'left:290px;top:262px;width:auto;white-space:nowrap;font-size:32px;transform:rotate(2deg)');
  glass(el);
  return { el, w: W1, h: H1, update(t) {
    const b = B1;
    const mode = t < b.ugly ? 'pipe' : t < b.gate ? 'ugly' : t < b.r1 ? 'gate' : t < b.r2 ? 'r1' : t < b.rec ? 'r2' : t < b.rev ? 'rec' : t < b.ab ? 'rev' : t < b.wrap ? 'ab' : 'wrap';
    show(pipe, (mode === 'pipe' || mode === 'gate' || mode === 'wrap') ? 1 : 0); show(ug, mode === 'ugly' ? 1 : 0); show(r1, (mode === 'r1' || mode === 'rec') ? 1 : 0); show(rv, (mode === 'r2' || mode === 'rev') ? 1 : 0); show(ab, mode === 'ab' ? 1 : 0);
    // pipeline: the frame stops at each gate
    const f0 = b.five; const stops = [[f0 + 0.8, 20], [f0 + 2.0, gx[0] - 48], [f0 + 3.0, gx[0] - 48], [f0 + 3.8, gx[1] - 48], [f0 + 4.6, gx[1] - 48], [f0 + 5.4, gx[2] - 48], [f0 + 7.2, gx[2] - 48], [f0 + 8.8, 776]];
    let fx = 20; for (let i = 0; i < stops.length - 1; i++) { const [ta, xa] = stops[i], [tb, xb] = stops[i + 1]; if (t >= ta) fx = lerp(xa, xb, ek(t, ta, tb)); }
    const wrapMode = mode === 'wrap', gateMode = mode === 'gate' || wrapMode;
    pos(frame, wrapMode ? 776 : fx, laneY - 30); show(frame, gateMode && !wrapMode ? 0 : 1);
    mini.f.style.background = wrapMode ? '#f0e2c4' : '#cdd2d8'; for (const c of mini.cards) show(c.c, wrapMode ? 0 : 1); frame.style.background = wrapMode ? 'radial-gradient(circle at 50% 45%,#e2643c 0 22%,#fff6e6 23% 40%,#ead6b0 41%)' : '';
    const armK = [ek(t, f0 + 2.4, f0 + 2.9), ek(t, f0 + 4.0, f0 + 4.5), ek(t, f0 + 6.9, f0 + 7.3)];
    gates.forEach((g, i) => { if (i < 3) { g.arm.style.transform = `rotate(${-80 * armK[i]}deg)`; g.light.style.background = armK[i] > 0.1 ? '#5cc28a' : '#2a3040'; } });
    show(gates[2].g, gateMode ? 0 : 1); show(newGate, gateMode ? 1 : 0);
    stamps.forEach((s, i) => { const a = [f0 + 2.1, f0 + 3.9][i]; show(s, gateMode ? 0 : sstep(a, a + 0.3, t)); pos(s, gx[i] - 28, 96, 1 + 0.4 * (1 - sstep(a, a + 0.3, t))); });
    chips.forEach((c, i) => { const a = f0 + 5.5 + i * 0.25; show(c, gateMode ? 0 : 1); c.style.boxShadow = t > a ? '0 0 0 3px #5cc28a' : '0 0 0 2px #5a6272'; });
    show(chipOk, gateMode ? 0 : sstep(f0 + 6.7, f0 + 6.9, t));
    stillSlot.style.background = wrapMode ? 'radial-gradient(circle at 50% 45%,#e2643c 0 18%,#fff6e6 19% 36%,#ead6b0 37%)' : '#22283a';
    refSlot.style.background = wrapMode ? 'linear-gradient(135deg,#dfe8f5,#9fb8d8)' : 'transparent'; refSlot.style.borderStyle = wrapMode ? 'solid' : 'dashed';
    // ugly → good
    const m = ek(t, b.ugly + 7.0, b.ugly + 10.0);
    for (const c of big.cards) { pos(c.c, lerp(c.x, 280 - c.cw / 2, m), lerp(c.y, 157 - c.ch / 2, m), lerp(1, 0.5, m)); show(c.c, 1 - sstep(0.55, 0.9, m)); }
    show(tex, m); show(hero, sstep(0.45, 1, m)); hero.style.transform = `scale(${lerp(0.6, 1, ek(t, b.ugly + 8.4, b.ugly + 10.2))})`;
    // round 1 tiles; in the recall they dim and drop below the question
    const dimR = mode === 'rec' ? sstep(b.rec, b.rec + 0.8, t) : 0;
    tiles.forEach((o, i) => { const a = b.r1 + 2.5 + i * 0.35; o.tl.style.opacity = String(sstep(a, a + 0.4, t) * (1 - 0.6 * dimR)); show(o.chk, sstep(b.r1 + 4.2 + i * 0.4, b.r1 + 4.5 + i * 0.4, t)); o.tl.style.transform = `translate(${22 + i * 174}px,${lerp(140, 230, dimR)}px)`; });
    // our version: circles appear, then each defect is fixed
    const rr2 = b.r2; const circAt = [rr2 + 5.0, rr2 + 5.6, rr2 + 6.2], fixAt = [rr2 + 11.6, rr2 + 12.4, rr2 + 13.2];
    ui.update(t, fixAt);
    circles.forEach((c, i) => { show(c, mode === 'r2' ? sstep(circAt[i], circAt[i] + 0.3, t) : 0); const fixed = t > fixAt[i]; c.style.borderColor = fixed ? '#5cc28a' : '#ec5b4f'; c.style.borderStyle = fixed ? 'solid' : 'dashed'; });
    show(r2cap, mode === 'r2' ? 1 : 0);
    wave.update(t);
  } };
}
export function buildS1L() {
  const el = h('div', 'sf scr', `width:${W1}px;height:${H1}px`); chrome(el);
  const idle = h('div', 'ab', `left:0;top:34px;width:${W1}px;height:${H1 - 34}px;background:radial-gradient(ellipse at 30% 40%,#2a3a5a,#141a26 70%)`); el.appendChild(idle);
  const tgt = h('div', 'ab', `left:0;top:34px;width:${W1}px;height:${H1 - 34}px;overflow:hidden;background:linear-gradient(180deg,#f7c38a 0%,#e88a6a 38%,#7a4a7a 70%,#2a2040 100%)`); el.appendChild(tgt);
  tgt.appendChild(h('div', 'ab', 'left:560px;top:60px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,#fff3c8 0 40%,rgba(255,220,150,0) 70%);filter:blur(2px)'));
  tgt.appendChild(h('div', 'ab', `left:-40px;top:220px;width:${W1 + 80}px;height:260px;background:linear-gradient(180deg,#5a3a6a,#2a1f3a);clip-path:polygon(0 60%,12% 30%,24% 52%,38% 18%,52% 46%,66% 22%,80% 50%,92% 28%,100% 45%,100% 100%,0 100%)`));
  tgt.appendChild(h('div', 'ab', `left:-40px;top:300px;width:${W1 + 80}px;height:200px;background:linear-gradient(180deg,#3a2a4a,#1a1428);clip-path:polygon(0 50%,18% 30%,34% 55%,50% 25%,70% 52%,86% 30%,100% 48%,100% 100%,0 100%)`));
  tgt.appendChild(h('div', 'ab', 'left:340px;top:226px;width:90px;height:150px;border-radius:45px 45px 10px 10px;background:linear-gradient(180deg,#2a1830,#120a18);filter:blur(0.6px)'));
  for (let i = 0; i < 40; i++) tgt.appendChild(h('div', 'ab', `left:${(i * 97) % W1}px;top:${40 + ((i * 53) % 180)}px;width:3px;height:3px;border-radius:50%;background:rgba(255,240,210,${0.3 + (i % 5) / 10})`));
  T(el, 's1_r1a', 'lab', 'left:24px;top:46px;font-size:38px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.8)');
  const rv = h('div', 'ab', `left:0;top:0;width:${W1}px;height:${H1}px;background:#0c0f15`); el.appendChild(rv);
  const ui = mockUI(rv, false, UIX, UIY);
  T(rv, 's1_r2a', 'lab', 'left:26px;top:40px;font-size:34px;color:#9fd0ff');
  const ab = h('div', 'ab', `width:${W1}px;height:${H1}px`); el.appendChild(ab);
  img(ab, 'assets/iso-l1.jpg', `left:0;top:34px;width:${W1}px;height:${H1 - 34 - 70}px`);
  ab.appendChild(h('div', 'ab', `left:0;top:34px;width:${W1}px;height:150px;background:linear-gradient(rgba(12,15,21,0.96) 55%,rgba(12,15,21,0))`));
  const wave = waveform(ab, 0, H1 - 70, W1, 70);
  T(ab, 's1_ab1', 'lab', 'left:24px;top:46px;font-size:36px;color:#fff;background:rgba(12,15,21,0.78);padding:4px 12px');
  T(ab, 's1_ab2', 'lab2', 'left:24px;top:112px;font-size:32px;color:#fff;background:rgba(12,15,21,0.78);padding:4px 12px');
  glass(el);
  return { el, w: W1, h: H1, update(t) {
    const b = B1;
    const mode = t < b.r1 ? 'idle' : t < b.r2 ? 'r1' : t < b.rec ? 'r2' : t < b.rev ? 'rec' : t < b.ab ? 'rev' : t < b.wrap ? 'ab' : 'wrap';
    show(tgt, (mode === 'r1' || mode === 'rec') ? 1 : 0); show(rv, (mode === 'r2' || mode === 'rev' || mode === 'wrap') ? 1 : 0); show(ab, mode === 'ab' ? 1 : 0);
    this.bright = 1 - 0.7 * fade(t, b.rec, b.rev, 0.6, 0.3);
    ui.update(t, [0, 0, 0]); wave.update(t);
  } };
}

/* ============================================================== station 2: one monitor ============================================================== */
const W2 = 1280, H2 = 720;
// price table (示意): squares sized by 坪數 and price bars make the wrong row visible even without numbers
function priceTable(parent) {
  const pt = h('div', 'ab', 'width:760px;height:470px;background:#f4f6fa;border-radius:12px;color:#1f2a44;font-family:Inter,"Noto Sans TC";box-shadow:0 10px 30px rgba(0,0,0,0.45);transform-origin:0 0'); parent.appendChild(pt);
  pt.appendChild(h('div', 'ab', 'left:0;top:0;width:760px;height:48px;background:#e3e8f0;border-radius:12px 12px 0 0'));
  const head = h('div', 'tx0 ab', 'left:30px;top:62px;width:700px;font-size:28px;font-weight:700;color:#5a6478'); pt.appendChild(head);
  if (!NOTEXT) head.innerHTML = '<span style="position:absolute;left:0">{{FILL:demo.table.col1}}</span><span style="position:absolute;left:140px">{{FILL:demo.table.col2}}</span><span style="position:absolute;left:300px">{{FILL:demo.table.col3}}</span>';
  const ROWS = [['{{FILL:demo.table.row1}}', 18, 980], ['{{FILL:demo.table.row2}}', 26, 1380], ['{{FILL:demo.table.row3}}', 32, 1720], ['{{FILL:demo.table.row4}}', 40, 1560]];
  const rows = ROWS.map(([n, ping, price], j) => { const y = 108 + j * 72; const row = h('div', 'ab', `left:16px;top:${y}px;width:728px;height:64px;border-radius:8px;background:${j % 2 ? '#ffffff' : '#eef2f8'}`); pt.appendChild(row);
    const name = h('div', 'ab', 'left:14px;top:12px;font-size:30px;font-weight:500', NOTEXT ? '' : n); row.appendChild(name);
    const sq = Math.sqrt(ping) * 7.4; row.appendChild(h('div', 'ab', `left:${150 - sq / 2}px;top:${32 - sq / 2}px;width:${sq}px;height:${sq}px;background:#9aa6ba;border-radius:3px`));
    const pn = h('div', 'ab', 'left:186px;top:12px;font-size:28px;color:#5a6478', NOTEXT ? '' : String(ping)); row.appendChild(pn);
    const bar = h('div', 'ab', 'left:300px;top:20px;height:24px;border-radius:5px;background:#3b6fd8'); row.appendChild(bar);
    const num = h('div', 'ab', 'top:12px;font-size:30px;font-weight:700'); row.appendChild(num);
    return { row, bar, num, price }; });
  const leak = h('div', 'ab', 'left:16px;top:400px;width:728px;height:56px;border-radius:8px;background:#fff1ef;border:3px solid #ec5b4f;box-sizing:border-box'); pt.appendChild(leak);
  leak.appendChild(h('div', 'ab', 'left:14px;top:10px;width:30px;height:30px;border-radius:50%;background:#c0392b')); leak.appendChild(h('div', 'ab', 'left:8px;top:34px;width:42px;height:16px;border-radius:12px 12px 0 0;background:#c0392b'));
  const leakT = T(leak, 's2_leak', '', 'left:60px;top:8px;font-size:28px;color:#c0392b;font-weight:700');
  const setPrice = (j, p) => { const r = rows[j]; const w = (p / 2000) * 330; r.bar.style.width = w + 'px'; r.num.style.left = (310 + w) + 'px'; r.num.textContent = NOTEXT ? '' : p.toLocaleString('en-US'); };
  rows.forEach((r, j) => setPrice(j, r.price));
  return { pt, rows, leak, setPrice };
}
export function buildS2() {
  const el = h('div', 'sf scr', `width:${W2}px;height:${H2}px`); chrome(el);
  const b = B2;
  T(el, 's2_c0', 'lab2', 'left:30px;top:46px;font-size:34px;color:#f3c57a;font-weight:700');
  T(el, 's2_c1', 'lab2', 'left:1080px;top:50px;font-size:28px;color:#8a93a3');
  const P = priceTable(el);
  const stamp = h('div', 'ab', 'left:300px;top:150px;padding:10px 26px;border:8px solid #2d9a64;border-radius:12px;color:#2d9a64;font-size:64px;font-weight:700;transform-origin:50% 50%;background:rgba(240,255,245,0.7)'); P.pt.appendChild(stamp);
  T(stamp, 's2_c3', '', 'position:relative');
  T(P.pt, 's2_c2', '', 'left:520px;top:8px;font-size:28px;color:#2d8f5f;font-weight:700');
  const ring = h('div', 'ab', 'left:6px;top:316px;width:748px;height:76px;border:6px solid #ec5b4f;border-radius:38px;box-sizing:border-box'); P.pt.appendChild(ring);
  T(el, 's2_c4', 'lab', 'left:280px;top:620px;font-size:42px;color:#ff8a7e');
  // rubric rows
  const rt = h('div', 'ab', 'left:30px;top:0;width:720px;height:720px'); el.appendChild(rt);
  T(rt, 's2_rh', 'ttl', 'left:0;top:48px;font-size:36px;color:#f3c57a');
  const RR = [['s2_row1', 9, true], ['s2_row2', 6, true], ['s2_row3', 4, false]];
  const mkRow = (id, wgt, bad) => { const r = h('div', 'ab', `left:0;top:0;width:700px;height:86px;background:${bad ? '#2a1618' : '#161b25'};border:${bad ? 3 : 2}px solid ${bad ? '#ec5b4f' : '#2a3142'};border-radius:8px;box-sizing:border-box`);
    const [txt, lvl] = tx(id).text.split('｜');
    const t1 = h('div', 'tx', 'left:62px;top:8px;width:470px;font-size:29px;font-weight:500;white-space:normal;line-height:1.3', txt); r.appendChild(t1); BOUND.push({ e: t1, o: tx(id) });
    const t2 = h('div', 'tx', 'left:540px;top:26px;font-size:26px;color:#9aa6ba', lvl); r.appendChild(t2); BOUND.push({ e: t2, o: tx(id) });
    r.appendChild(h('div', 'ab', `left:636px;top:18px;font:700 38px Inter;color:#f6f1e6`, String(wgt)));
    const mk = h('div', 'ab', 'left:14px;top:16px;font:700 44px Inter', ''); r.appendChild(mk); return { r, mk, t2 }; };
  const rubRows = RR.map(([id, wgt, ok]) => { const o = mkRow(id, wgt, false); rt.appendChild(o.r); o.ok = ok; return o; });
  const row5 = mkRow('s2_rc1', 10, true); el.appendChild(row5.r); row5.mk.textContent = '✗'; row5.mk.style.color = '#ec5b4f';
  const gateLab = T(row5.r, 's2_rv2', 'lab', 'left:-3px;top:-48px;font-size:32px;color:#fff;background:#c0392b;padding:0 14px;border-radius:6px 6px 0 0');
  T(el, 's2_rc0', 'lab2', 'left:30px;top:44px;font-size:32px;color:#ff8a7e;font-weight:700');
  const lines = S('svg', { width: W2, height: H2, style: 'position:absolute;left:0;top:0;overflow:visible' }, el);
  const L = [0, 1, 2, 3].map(() => S('path', { fill: 'none', stroke: '#f3c57a', 'stroke-width': 3, 'stroke-dasharray': '8 7' }, lines));
  // score bar
  const sb = h('div', 'ab', 'left:40px;top:560px;width:1200px;height:150px'); el.appendChild(sb);
  T(sb, 's2_cp1', 'lab2', 'left:0;top:0;font-size:32px;color:#cfd6e2');
  const barBg = h('div', 'ab', 'left:0;top:50px;width:1200px;height:46px;border-radius:8px;background:#1b212d;border:2px solid #2f3747;box-sizing:border-box'); sb.appendChild(barBg);
  const barFill = h('div', 'ab', 'left:0;top:50px;height:46px;border-radius:8px;background:linear-gradient(90deg,#3aa38a,#5cc28a)'); sb.appendChild(barFill);
  sb.appendChild(h('div', 'ab', 'left:598px;top:38px;width:5px;height:70px;background:#f6f1e6'));
  T(sb, 's2_cp2', 'lab2', 'left:560px;top:106px;font-size:30px;color:#f6f1e6;font-weight:700');
  const res1 = T(sb, 's2_cp3', 'lab', 'left:0;top:0;width:420px;text-align:right;font-size:36px;color:#5cc28a');
  const res2 = T(sb, 's2_rv1', 'lab', 'left:0;top:0;width:640px;text-align:right;font-size:34px;color:#5cc28a');
  T(el, 's2_cp4', 'lab2', 'left:770px;top:452px;width:480px;font-size:30px;color:#ff8a7e;font-weight:700;white-space:normal');
  const fail = h('div', 'ab', 'left:880px;top:240px;padding:8px 26px;border:8px solid #ec5b4f;border-radius:12px;color:#ec5b4f;font-size:72px;font-weight:800;background:rgba(40,10,10,0.8)'); el.appendChild(fail); T(fail, 's2_rv3', '', 'position:relative');
  const alarm = h('div', 'ab', 'left:30px;top:600px;width:1220px;height:66px;border:6px solid #ec5b4f;border-radius:12px;box-sizing:border-box'); el.appendChild(alarm);
  const recBand = h('div', 'ab', 'left:0;top:34px;width:1280px;height:190px;background:linear-gradient(180deg,rgba(8,10,14,0.94),rgba(8,10,14,0.78))'); el.appendChild(recBand);
  T(el, 's2_rec', 'rec', 'left:60px;top:46px;width:1160px;font-size:56px');
  const ans = h('div', 'ab', 'left:40px;top:540px;width:1200px'); el.appendChild(ans);
  T(ans, 's2_ans', 'cap', 'position:relative;display:block;font-size:42px;font-weight:700;width:1150px', `${br(tx('s2_ans').text)}<span class="src">${tx('s2_ansrc').text}</span>`);
  // own case
  const own = h('div', 'ab', `width:${W2}px;height:${H2}px;background:#0c0f15`); el.appendChild(own);
  T(own, 's2_o1', 'ttl', 'left:40px;top:46px;width:740px;font-size:36px;color:#f3c57a;white-space:normal;line-height:1.3');
  T(own, 's2_o2', 'lab2', 'left:40px;top:150px;width:740px;font-size:30px;color:#9fd0ff;font-weight:700;white-space:normal');
  const AI = [0.770, 0.715, 0.746, 0.723, 0.793, 0.770, 0.746, 0.730, 0.723, 0.707, 0.730, 0.711, 0.777];
  const base = 620, top = 230, yv = v => base - (v - 0.5) / 0.4 * (base - top);
  const ax = S('svg', { width: 780, height: H2, style: 'position:absolute;left:0;top:0;overflow:visible' }, own);
  S('line', { x1: 90, y1: base, x2: 760, y2: base, stroke: '#3a4252', 'stroke-width': 3 }, ax);
  const thrY = yv(0.70); S('line', { x1: 90, y1: thrY, x2: 760, y2: thrY, stroke: '#f6f1e6', 'stroke-width': 4, 'stroke-dasharray': '12 8' }, ax);
  own.appendChild(h('div', 'ab', `left:6px;top:${thrY - 20}px;font:700 30px Inter;color:#f6f1e6`, '0.70'));
  const bars = AI.map((v) => ({ v, b: null })); bars.forEach((o, i) => { o.b = h('div', 'ab', `left:${106 + i * 48 + (i ? 24 : 0)}px;width:34px;background:#7fb6e8;border-radius:4px 4px 0 0`); own.appendChild(o.b); });
  const you = h('div', 'ab', 'left:143px;width:22px;background:repeating-linear-gradient(45deg,#f3c57a 0 6px,#c8963a 6px 12px);border-radius:4px 4px 0 0'); own.appendChild(you);
  const stk = h('div', 'ab stick', 'left:790px;top:50px;width:auto;font-size:30px;transform:rotate(1.2deg)'); own.appendChild(stk);
  T(stk, 's2_o4', '', 'position:relative;display:block;font-size:27px;margin-bottom:6px;font-family:"Noto Sans TC";white-space:nowrap');
  const items = tx('s2_o5').text.split('／').map((s) => { const d = h('div', 'tx', 'position:relative;display:block;font-size:28px;line-height:1.45;white-space:nowrap', s); stk.appendChild(d); BOUND.push({ e: d, o: tx('s2_o5') }); return d; });
  const empty = h('div', 'ab', 'left:830px;top:452px;width:380px;height:96px;border:5px dashed #ec5b4f;border-radius:10px;box-sizing:border-box'); own.appendChild(empty);
  for (let i = 0; i < 3; i++) empty.appendChild(h('div', 'ab', `left:20px;top:${18 + i * 22}px;width:${[240, 200, 260][i]}px;height:10px;border-radius:5px;background:rgba(236,91,79,0.35)`));
  const doc = h('div', 'ab', 'left:830px;top:572px;width:380px;height:80px;background:#e9e1cf;border-radius:6px;color:#2a241c'); own.appendChild(doc);
  doc.appendChild(h('div', 'ab', 'left:16px;top:12px;width:46px;height:56px;background:#fff;border:3px solid #8a7a5a;box-sizing:border-box'));
  const docT = h('div', 'tx', 'left:80px;top:18px;font-size:32px;font-weight:700', '{{FILL:demo.doc.title}}'); doc.appendChild(docT); BOUND.push({ e: docT, o: tx('s2_o7') });
  T(own, 's2_o7', 'lab2', 'left:40px;top:640px;width:760px;font-size:28px;color:#f3c57a;font-weight:700;white-space:normal');
  const ownLines = S('svg', { width: W2, height: H2, style: 'position:absolute;left:0;top:0;overflow:visible' }, own);
  const oL = [0, 1, 2, 3, 4].map(() => S('path', { fill: 'none', stroke: '#ec5b4f', 'stroke-width': 3, 'stroke-dasharray': '7 6' }, ownLines));
  const back = S('path', { fill: 'none', stroke: '#f3c57a', 'stroke-width': 4 }, ownLines);
  glass(el);
  return { el, w: W2, h: H2, update(t) {
    const ownOn = t >= b.own + 2.0; show(own, ownOn ? 1 : 0);
    const rowsK = ek(t, b.rows, b.rows + 1.4); const recK = t >= b.rset;
    const dimK = fade(t, b.rec, b.rev + 0.2, 0.6, 0.6);
    // price table placement: big for the interview example, then aside
    const ptX = lerp(260, 762, rowsK), ptY = lerp(110, 116, rowsK), ptS = lerp(1.0, 0.66, rowsK);
    P.pt.style.transform = `translate(${ptX}px,${ptY}px) scale(${ptS})`; show(P.pt, (t >= b.cse && !ownOn) ? 1 : 0);
    P.pt.style.opacity = String((1 - 0.7 * dimK) * (t > b.rev + 6.4 ? 0.55 : 1));
    show(stamp, t < b.rows ? sstep(b.cse + 5.0, b.cse + 5.3, t) : 0); stamp.style.transform = `rotate(-8deg) scale(${lerp(1.6, 1, ek(t, b.cse + 5, b.cse + 5.35))})`;
    show(ring, t < b.rows ? sstep(b.cse + 8.6, b.cse + 9.2, t) : (t < b.rset && t > b.rows + 15) ? 1 : 0);
    P.setPrice(3, recK ? 1880 : 1560); show(P.leak, recK ? sstep(b.rset + 0.4, b.rset + 0.9, t) : 0);
    P.rows[3].row.style.background = (!recK && t > b.cse + 8.6) ? '#ffe3df' : '#ffffff';
    // rubric rows: one by one, each checks the table
    show(rt, t >= b.rows && !ownOn ? 1 : 0);
    const gateK = ek(t, b.rev + 3.4, b.rev + 4.6);
    rubRows.forEach((o, j) => { const a = b.rows + [3.0, 8.0, 13.0][j]; const on = sstep(a - 0.2, a + 0.4, t); const yy = 120 + (j + (recK ? gateK : 0)) * 96;
      o.r.style.top = yy + 'px'; o.r.style.opacity = String(on * (1 - 0.7 * dimK)); o.r.style.transform = `translateY(${(1 - on) * 20}px)`;
      const res = sstep(a + 2.0, a + 2.4, t); const okNow = recK ? true : o.ok; o.mk.style.opacity = res; o.mk.textContent = okNow ? '✓' : '✗'; o.mk.style.color = okNow ? '#5cc28a' : '#ec5b4f';
      o.r.style.borderColor = (!okNow && t > a + 2) ? '#ec5b4f' : '#2a3142';
      const lk = sstep(a + 0.6, a + 1.8, t) * ((t < b.comp) ? 1 : 0); const y0 = yy + 43; const ty = j === 2 ? 116 + (108 + 2 * 72 + 36) * 0.66 : 116 + (108 + 36 + j * 72) * 0.66;
      L[j].setAttribute('d', `M730,${y0} C 748,${y0} 748,${ty} 772,${ty}`); L[j].style.opacity = lk; L[j].setAttribute('stroke', okNow ? '#f3c57a' : '#ec5b4f'); });
    // row 5 (recall): slides in under the rows; at the reveal it moves to the front as the hard gate
    const r5in = sstep(b.rset + 3.8, b.rset + 4.4, t); const r5y = lerp(120 + 3 * 96, 120, gateK);
    row5.r.style.transform = `translate(30px,${r5y}px)`; show(row5.r, recK && !ownOn ? r5in : 0); row5.mk.style.opacity = sstep(b.rset + 5.4, b.rset + 5.8, t);
    row5.r.style.boxShadow = gateK > 0.5 ? '0 0 0 4px rgba(236,91,79,0.5), 0 0 24px rgba(236,91,79,0.6)' : 'none';
    L[3].setAttribute('d', `M730,${r5y + 43} C 750,${r5y + 43} 748,${116 + 428 * 0.66} 772,${116 + 428 * 0.66}`); L[3].style.opacity = recK && t < b.rev + 3.4 ? sstep(b.rset + 5.0, b.rset + 5.6, t) : 0; L[3].setAttribute('stroke', '#ec5b4f');
    // score bar
    const sbOn = t >= b.comp && !ownOn; show(sb, sbOn ? sstep(b.comp, b.comp + 0.4, t) : 0);
    let v = 0; if (!recK) v = 15 / 19 * ek(t, b.comp + 2.4, b.comp + 4.6); else v = 0.42 * ek(t, b.rset + 7.0, b.rset + 8.6) + (19 / 29 - 0.42) * ek(t, b.rev + 0.2, b.rev + 1.0);
    const gateOn = gateK > 0.5; barFill.style.width = (1200 * v) + 'px'; barFill.style.filter = gateOn ? 'grayscale(1) brightness(0.5)' : 'none';
    res1.style.transform = `translate(${1200 * (15 / 19) - 420}px,2px)`; res2.style.transform = `translate(${1200 * (19 / 29) - 640}px,2px)`;
    show(alarm, recK ? fade(t, b.rev + 1.6, b.rev + 3.8, 0.15, 0.5) * (0.6 + 0.4 * Math.sin(t * 18)) : 0);
    show(fail, t > b.rev + 6.4 && t < b.own + 2 ? 1 : 0); fail.style.transform = `rotate(-6deg) scale(${lerp(1.5, 1, ek(t, b.rev + 6.4, b.rev + 6.8))})`;
    show(recBand, dimK);
    // own case
    if (ownOn) { const o0 = b.own; bars.forEach((o, i) => { const hh = (base - yv(o.v)) * ek(t, o0 + 4.0 + i * 0.12, o0 + 5.2 + i * 0.12); o.b.style.top = (base - hh) + 'px'; o.b.style.height = hh + 'px'; });
      const yh = (base - yv(0.67)) * ek(t, o0 + 7.2, o0 + 8.2); you.style.top = (base - yh) + 'px'; you.style.height = yh + 'px';
      show(stk, sstep(o0 + 10.8, o0 + 11.3, t)); show(empty, sstep(o0 + 16.0, o0 + 16.5, t)); show(doc, sstep(o0 + 19.4, o0 + 19.8, t));
      const xr = stk.offsetLeft + stk.offsetWidth - 6; items.forEach((d, i) => { const a = o0 + 16.4 + i * 0.4; const yc = stk.offsetTop + d.offsetTop + d.offsetHeight / 2; oL[i].setAttribute('d', `M${xr},${yc} C ${xr + 40},${yc + 60} ${1262},470 1210,490`); oL[i].style.opacity = sstep(a, a + 0.5, t); });
      back.setAttribute('d', 'M830,612 C 700,612 700,320 560,320'); back.style.opacity = sstep(o0 + 20.0, o0 + 20.6, t); }
  } };
}

/* ============================================================== station 3: ultra-wide monitor, an editing timeline ============================================================== */
const W3 = 1560, H3 = 667;
export function buildS3() {
  const el = h('div', 'sf scr s3', `width:${W3}px;height:${H3}px`); chrome(el);
  const b = B3;
  const add = (p, css, html = '') => { const e = h('div', 'ab', css, html); p.appendChild(e); return e; };
  // v1
  const v1 = add(el, `width:${W3}px;height:${H3}px`);
  T(v1, 's3_v1a', 'ttl', 'left:40px;top:48px');
  const v1rows = []; for (let i = 0; i < 13; i++) { const y = 136 + i * 36; const g = add(v1, `left:40px;top:${y}px;width:790px;height:28px`); add(g, 'left:0;top:0;width:130px;height:28px;background:#5a6a86;border-radius:4px'); add(g, 'left:136px;top:0;width:520px;height:28px;background:#d9dee8;border-radius:4px'); add(g, 'left:662px;top:0;width:120px;height:28px;background:#e8d9b4;border-radius:4px'); v1rows.push(g); }
  img(v1, 'assets/v1-open.jpg', 'left:870px;top:124px;width:650px;height:219px;border:3px solid #3a4252');
  T(v1, 's3_v1b', 'lab2', 'left:870px;top:350px;font-size:30px;color:#9aa6ba');
  T(v1, 's3_v1c', 'stick', 'left:860px;top:386px;width:auto;white-space:nowrap;transform:rotate(-1.5deg)');
  T(v1, 's3_v1d', 'stick', 'left:900px;top:566px;width:auto;transform:rotate(1.2deg);white-space:nowrap');
  // the timeline (v2 → v3 → v4 → skeleton)
  const tl = add(el, `width:${W3}px;height:${H3}px`);
  const X0 = 60, X1 = 1500, TY = 300, TH = 120;
  const ruler = add(tl, `left:${X0}px;top:${TY - 46}px;width:${X1 - X0}px;height:30px;border-bottom:2px solid #3a4252`);
  for (let s = 0; s <= 6; s++) ruler.appendChild(h('div', 'ab', `left:${s * (X1 - X0) / 6 - 30}px;top:-6px;width:60px;text-align:center;font:500 26px Inter;color:#8a93a3`, `${s}:00`));
  const head = add(tl, `left:${X0}px;top:${TY}px;height:${TH}px;border-radius:8px;overflow:hidden;background:#2a3346`); img(head, 'assets/v2-class.jpg', 'left:0;top:0;width:100%;height:100%');
  const tail = add(tl, `top:${TY}px;height:${TH}px;border-radius:8px;overflow:hidden;background:#24402e`); img(tail, 'assets/v2-board.jpg', 'left:0;top:0;width:100%;height:100%');
  const mid = add(tl, `top:${TY}px;height:${TH}px;border-radius:8px;overflow:hidden;background:repeating-linear-gradient(90deg,#d9dee8 0 38px,#cfd5e0 38px 40px)`);
  const dim = add(mid, 'left:0;top:0;width:100%;height:100%;background:linear-gradient(90deg,rgba(12,15,21,0) 0%,rgba(12,15,21,0.85) 100%)');
  const play = add(tl, `top:${TY - 20}px;width:4px;height:${TH + 40}px;background:#ffcf7a;box-shadow:0 0 12px rgba(255,207,122,0.8)`);
  T(tl, 's3_v2a', 'ttl', 'left:40px;top:48px');
  T(tl, 's3_v2b', 'lab', 'left:1140px;top:52px;color:#5cc28a;border:4px solid #5cc28a;padding:0 14px;border-radius:8px;font-family:"LXGW WenKai TC"');
  T(tl, 's3_v2c', 'stick', 'left:600px;top:452px;width:620px;transform:rotate(-1.2deg)');
  const segs = [51, 48, 92, 86].map((d, i) => add(tl, `top:${TY}px;height:${TH}px;border-radius:6px;background:${['#cfe3f7', '#d8ecd9', '#f3e1c7', '#e6d9f3'][i]};box-shadow:inset 0 0 0 2px rgba(12,15,21,0.3)`));
  T(tl, 's3_v3a', 'ttl', 'left:40px;top:48px');
  T(tl, 's3_v3s', 'lab2', 'left:60px;top:450px;font-size:36px;color:#f3c57a;font-weight:700');
  const conn = S('svg', { width: W3, height: H3, style: 'position:absolute;left:0;top:0;overflow:visible' }, tl); const connL = [0, 1, 2, 3].map(() => S('path', { fill: 'none', stroke: '#f3c57a', 'stroke-width': 3, 'stroke-dasharray': '6 6' }, conn));
  const kps = ['s3_kp1', 's3_kp2', 's3_kp3', 's3_kp4'].map((id, i) => { const c = add(tl, 'width:290px;height:120px;background:#fbf8f1;border-radius:8px;box-shadow:0 8px 18px rgba(0,0,0,0.5);color:#1f2a44;overflow:hidden;transform-origin:50% 50%');
    if (i === 3) img(c, 'assets/v3-kp4.jpg', 'left:0;top:0;width:290px;height:52px'); else add(c, 'left:124px;top:10px;width:42px;height:34px;border-radius:10px;background:' + ['#3b6fd8', '#3aa38a', '#e2643c'][i]);
    const e = h('div', 'tx', 'left:4px;top:62px;width:282px;text-align:center;font-size:26px;font-weight:700;white-space:nowrap;line-height:1.3', tx(id).text); c.appendChild(e); BOUND.push({ e, o: tx(id) });
    add(c, 'left:8px;top:6px;font:700 22px Inter;color:#6a7486', `${i + 1}/4`); return c; });
  const boardEl = add(tl, 'left:700px;top:44px;width:800px;height:560px;background:radial-gradient(ellipse at 50% 45%,#2f5a44,#1c3a2a);border:12px solid #7a5232;border-radius:8px;box-sizing:border-box;box-shadow:0 12px 30px rgba(0,0,0,0.6)');
  const chalk = S('svg', { width: 776, height: 536, style: 'position:absolute;left:0;top:0' }, boardEl);
  const chalkLines = [[388, 268, 150, 110], [388, 268, 626, 110], [388, 268, 150, 430], [388, 268, 626, 430]].map(([x1, y1, x2, y2]) => S('line', { x1, y1, x2, y2, stroke: '#e9efe2', 'stroke-width': 4, 'stroke-dasharray': '7 7' }, chalk));
  T(boardEl, 's3_v3c', '', 'left:0;top:236px;width:776px;text-align:center;font-size:48px;font-weight:700;color:#fff6c8;font-family:"LXGW WenKai TC"');
  T(tl, 's3_v3d', 'lab', 'left:40px;top:606px;font-size:38px !important');
  // 立牌 (third version's map) vs a demo that shows a mechanism
  const std = add(el, `width:${W3}px;height:${H3}px;background:#0c0f15`);
  T(std, 's3_st0', 'lab', 'left:40px;top:44px;color:#f6f1e6;font-family:"LXGW WenKai TC"');
  add(std, 'left:1460px;top:50px;width:56px;height:56px', '<svg width="56" height="56" viewBox="0 0 56 56"><path d="M8 20h10l14-10v36L18 36H8z" fill="#e9eef6"/><path d="M40 20l12 16M52 20L40 36" stroke="#ec5b4f" stroke-width="5"/></svg>');
  const lp = add(std, 'left:40px;top:172px;width:700px;height:380px;background:#151a24;border-radius:12px;overflow:hidden');
  add(lp, 'left:0;top:270px;width:700px;height:110px;background:#3a5a3a'); add(lp, 'left:250px;top:150px;width:200px;height:130px;background:#8a6a4a;border-radius:10px 10px 0 0;box-shadow:inset -10px -10px 0 rgba(0,0,0,0.2)');
  add(lp, 'left:300px;top:110px;width:100px;height:44px;background:#a07a52;border-radius:8px'); add(lp, 'left:420px;top:92px;width:110px;height:26px;background:#5a3a24;border-radius:10px;transform:rotate(-25deg)');
  add(lp, 'left:140px;top:196px;width:130px;height:66px;background:#e9e1cf;border-radius:4px;box-shadow:0 4px 8px rgba(0,0,0,0.4)');
  T(std, 's3_st2', 'lab', 'left:40px;top:568px;color:#ff8a7e;font-size:38px !important');
  const rp = add(std, 'left:800px;top:172px;width:720px;height:380px;background:#151a24;border-radius:12px;overflow:hidden');
  const flow = S('svg', { width: 720, height: 380, style: 'position:absolute;left:0;top:0' }, rp);
  const pA = S('path', { fill: 'none', stroke: '#3aa38a', 'stroke-linecap': 'round' }, flow), pB = S('path', { fill: 'none', stroke: '#e2843c', 'stroke-linecap': 'round' }, flow);
  add(rp, 'left:30px;top:150px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffe08a,#c8962a)');
  add(rp, 'left:600px;top:50px;width:90px;height:90px;border-radius:12px;background:#3aa38a;font:700 50px Inter;color:#fff;text-align:center;line-height:90px', 'A'); add(rp, 'left:600px;top:240px;width:90px;height:90px;border-radius:12px;background:#e2843c;font:700 50px Inter;color:#fff;text-align:center;line-height:90px', 'B');
  const dots = [0, 1].map(() => add(rp, 'width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff'));
  T(std, 's3_st3', 'lab', 'left:800px;top:568px;color:#5cc28a;font-size:38px !important');
  // v4: new middles, and the head and tail are replaced too
  const v4m = [0, 1, 2].map(() => add(tl, `top:${TY + 10}px;height:${TH - 20}px;border-radius:6px;overflow:hidden;background:#1b2130;border:2px solid #3a4252`));
  const drawMini = (box, kind) => { box.innerHTML = ''; box.style.background = '#1b2130';
    if (kind === 0) { for (let i = 0; i < 6; i++) box.appendChild(h('div', 'ab', `left:${10 + i * 34}px;top:16px;width:26px;height:68px;background:#d8cdb5;border-radius:3px`)); for (let i = 0; i < 12; i++) box.appendChild(h('div', 'ab', `left:${230 + (i % 4) * 14}px;top:${20 + Math.floor(i / 4) * 22}px;width:10px;height:10px;border-radius:50%;background:${i % 5 ? '#ffcf7a' : '#3a4252'}`)); }
    if (kind === 1) { for (let i = 0; i < 5; i++) box.appendChild(h('div', 'ab', `left:${20 + i * 50}px;top:${16 + i * 6}px;width:30px;height:${68 - i * 12}px;background:#7fb6e8;border-radius:3px`)); }
    if (kind === 2) { for (let i = 0; i < 6; i++) box.appendChild(h('div', 'ab', `left:${16 + i * 42}px;top:${70 - i * 10}px;width:40px;height:${16 + i * 10}px;background:#e2843c;opacity:${0.5 + i * 0.08}`)); }
    if (kind === 3) { box.appendChild(h('div', 'ab', 'left:14px;top:14px;width:240px;height:72px;background:#f4f6fa;border-radius:6px')); box.appendChild(h('div', 'ab', 'left:28px;top:32px;width:120px;height:12px;background:#9aa6ba;border-radius:6px')); box.appendChild(h('div', 'ab', 'left:28px;top:56px;width:180px;height:12px;background:#3b6fd8;border-radius:6px')); }
    if (kind === 4) { box.style.background = '#f2f2ee'; for (let i = 0; i < 3; i++) box.appendChild(h('div', 'ab', `left:${18 + i * 84}px;top:20px;width:70px;height:58px;border:3px dashed #3a4252;border-radius:6px`)); } };
  v4m.forEach((bx, i) => drawMini(bx, i));
  const newHead = add(tl, `left:${X0}px;top:${TY}px;width:200px;height:${TH}px;border-radius:8px;background:linear-gradient(135deg,#6a3a8a,#3a2a5a)`), newTail = add(tl, `top:${TY}px;width:200px;height:${TH}px;border-radius:8px;background:linear-gradient(135deg,#3a5a8a,#2a3a5a)`);
  T(tl, 's3_v4a', 'ttl', 'left:40px;top:44px;font-size:44px !important;line-height:1.3');
  T(tl, 's3_v4b', 'lab', 'left:60px;top:446px;color:#ff8a7e');
  T(tl, 's3_v4c', 'stick', 'left:60px;top:530px;width:auto;transform:rotate(-1.2deg);white-space:nowrap');
  T(tl, 's3_v4d', 'stick', 'left:860px;top:536px;width:auto;transform:rotate(1.2deg);white-space:nowrap');
  // recall
  const badge3 = T(tl, 's3_rc1', '', 'padding:2px 14px;border:4px solid #5cc28a;border-radius:8px;font-size:32px;font-weight:700;color:#5cc28a;font-family:"LXGW WenKai TC"');
  const stampNo = T(tl, 's3_rc2', '', 'padding:2px 14px;border:5px solid #ec5b4f;border-radius:8px;font-size:34px;font-weight:700;color:#ec5b4f;font-family:"LXGW WenKai TC"');
  T(tl, 's3_rec', 'rec', 'left:60px;top:42px;width:1440px;font-size:48px');
  // reveal: a rack of approved middles, clamps on the head and tail, the middle swaps like a cartridge
  const clamps = [0, 1].map(() => add(tl, `top:${TY - 18}px;width:36px;height:${TH + 36}px;border-radius:8px;background:linear-gradient(90deg,#8a6a2a,#e0b85a 45%,#8a6a2a);box-shadow:0 0 0 3px rgba(0,0,0,0.4)`));
  const rack = [3, 4, 1, 2].map((kind, i) => { const bx = add(tl, `left:${250 + i * 280}px;top:96px;width:240px;height:110px;border-radius:8px;overflow:hidden;background:#1b2130;border:3px solid #3a4252;box-sizing:border-box`); drawMini(bx, kind); return bx; });
  const cart = add(tl, `top:${TY + 6}px;height:${TH - 12}px;border-radius:8px;overflow:hidden;background:#1b2130;border:3px solid #f3c57a;box-sizing:border-box`);
  const cartIn = add(cart, 'left:0;top:0;width:100%;height:100%');
  T(tl, 's3_rv1', 'lab', 'left:60px;top:440px;font-size:38px !important');
  T(tl, 's3_rv2', 'lab', 'left:760px;top:440px;font-size:38px !important');
  const ans = add(el, 'left:60px;top:500px;width:1440px'); T(ans, 's3_ans', 'cap', 'position:relative;display:block;font-size:38px;font-weight:700;width:1390px', `${br(tx('s3_ans').text)}<span class="src">${tx('s3_ansrc').text}</span>`);
  glass(el);
  let lastKind = -1;
  return { el, w: W3, h: H3, update(t) {
    const mode = t < b.v2 ? 'v1' : t < b.v3 ? 'v2' : t < b.std ? 'v3' : t < b.v4 ? 'std' : t < b.rec ? 'v4' : t < b.rev ? 'rec' : 'rev';
    show(v1, mode === 'v1' ? 1 : 0); show(tl, mode !== 'v1' && mode !== 'std' ? 1 : 0); show(std, mode === 'std' ? 1 : 0);
    v1rows.forEach((g, i) => { g.style.opacity = String(sstep(b.v1 + 0.8 + i * 0.12, b.v1 + 1.1 + i * 0.12, t)); });
    const px = s => (X1 - X0) * s / 376;
    const v3k = ek(t, b.v3 + 1.0, b.v3 + 2.6);
    const headW = lerp(px(55), px(57), v3k), tailW = lerp(px(40), px(42), v3k);
    head.style.width = headW + 'px'; tail.style.left = (X1 - tailW) + 'px'; tail.style.width = tailW + 'px';
    mid.style.left = (X0 + headW + 6) + 'px'; mid.style.width = (X1 - tailW - X0 - headW - 12) + 'px';
    const inV2 = mode === 'v2'; show(mid, inV2 ? 1 : 0);
    const pk = ek(t, b.v2 + 3.0, b.v2 + 9.0); show(play, inV2 ? 1 : 0); play.style.left = (X0 + headW + 6 + pk * (X1 - tailW - X0 - headW - 12)) + 'px';
    dim.style.opacity = inV2 ? 0.9 * pk : 0;
    const segOn = (mode === 'v3' || mode === 'rec');
    let x = X0 + headW + 6; const durs = [51, 48, 92, 86]; const segEnds = [];
    segs.forEach((s, i) => { const w = px(durs[i]) - 6; s.style.left = x + 'px'; s.style.width = w + 'px'; const on = mode === 'v3' ? sstep(b.v3 + 1.4 + i * 0.3, b.v3 + 1.8 + i * 0.3, t) : segOn ? 1 : 0; show(s, on); x += w + 6; segEnds.push(x - 6); });
    const fly = ek(t, b.v3 + 17.0, b.v3 + 19.0); const phB = sstep(b.v3 + 16.2, b.v3 + 17.0, t);
    const boardPos = [[724, 74], [1206, 74], [724, 410], [1206, 410]];
    kps.forEach((c, i) => { const a = b.v3 + [4.5, 6.5, 8.5, 10.5][i]; const pop = sstep(a - 0.1, a + 0.35, t); const hx = 140 + i * 330, hy = 120;
      const cx = lerp(hx, boardPos[i][0], fly), cy = lerp(hy, boardPos[i][1], fly);
      c.style.transform = `translate(${cx}px,${cy}px) scale(${pop * lerp(1, 0.94, fly)})`; show(c, mode === 'v3' ? pop : 0); c.style.zIndex = 5;
      connL[i].setAttribute('d', `M${hx + 145},${hy + 120} L${segEnds[i] - 4},${TY - 2}`); connL[i].style.opacity = mode === 'v3' ? pop * (1 - phB) : 0; });
    show(boardEl, mode === 'v3' ? phB : 0); boardEl.style.zIndex = 4; chalkLines.forEach((l, i) => l.style.opacity = sstep(b.v3 + 19.2 + i * 0.25, b.v3 + 19.6 + i * 0.25, t));
    const dimTL = mode === 'v3' ? 1 - 0.8 * phB : 1; [head, tail, ...segs].forEach(e => { if (e.style.display !== 'none') e.style.opacity = String(Math.min(+e.style.opacity || 1, dimTL)); }); ruler.style.opacity = mode === 'rec' ? 0 : dimTL;
    if (mode === 'std') { const k = ek(t, b.std + 8.0, b.std + 10.0); pA.setAttribute('d', 'M110,190 C 300,190 420,95 600,95'); pB.setAttribute('d', 'M110,190 C 300,190 420,285 600,285'); pA.setAttribute('stroke-width', lerp(16, 4, k)); pB.setAttribute('stroke-width', lerp(16, 30, k));
      dots.forEach((dd, i) => { const u = clamp((t - (b.std + 7.0 + i * 0.4)) / 1.6); dd.style.transform = `translate(${lerp(300, 600, u) - 11}px,${lerp(140, 285, u) - 11}px)`; show(dd, u > 0 && u < 1 ? 1 : 0); }); }
    // v4 and the recall: the head and tail are replaced
    const isV4 = mode === 'v4', isRec = mode === 'rec';
    show(head, isV4 ? 0 : 1); show(tail, isV4 ? 0 : 1); show(newHead, isV4 ? sstep(b.v4 + 4.0, b.v4 + 4.6, t) : isRec ? 1 : 0); show(newTail, isV4 ? sstep(b.v4 + 4.0, b.v4 + 4.6, t) : isRec ? 1 : 0);
    newTail.style.left = (X1 - 200) + 'px';
    const mx0 = X0 + 206, mx1 = X1 - 206; const rowY = isRec ? TY + 170 : TY; newHead.style.top = rowY + 'px'; newTail.style.top = rowY + 'px';
    v4m.forEach((bx, i) => { const w = (mx1 - mx0) / 3 - 8; bx.style.left = (mx0 + i * (w + 12)) + 'px'; bx.style.width = w + 'px'; bx.style.top = (rowY + 10) + 'px'; show(bx, isV4 ? sstep(b.v4 + 4.4 + i * 0.4, b.v4 + 4.9 + i * 0.4, t) : isRec ? 1 : 0); });
    badge3.style.transform = `translate(${X1 - 470}px,${TY - 62}px)`; stampNo.style.transform = `translate(${X1 - 400}px,${TY + 300}px) rotate(-4deg)`;
    const isRev = mode === 'rev';
    clamps.forEach((c, i) => { c.style.left = (i === 0 ? X0 + headW - 14 : X1 - tailW - 22) + 'px'; show(c, isRev ? sstep(b.rev + 1.2, b.rev + 1.7, t) : 0); });
    show(cart, isRev ? 1 : 0); cart.style.left = (X0 + headW + 26) + 'px'; cart.style.width = (X1 - tailW - X0 - headW - 52) + 'px';
    const swaps = [b.rev + 3.0, b.rev + 5.4, b.rev + 7.8, b.rev + 10.2], order = [3, 4, 1, 2];
    let activeI = -1, kind = 3, k2 = 0; swaps.forEach((s, i) => { if (t >= s) { kind = order[i]; k2 = ek(t, s, s + 0.7); activeI = i; } });
    rack.forEach((bx, i) => { show(bx, isRev ? sstep(b.rev + 2.2, b.rev + 2.8, t) : 0); bx.style.borderColor = i === activeI ? '#f3c57a' : '#3a4252'; if (isRev) bx.style.opacity = String((i === activeI ? 1 : 0.45) * sstep(b.rev + 2.2, b.rev + 2.8, t)); });
    if (isRev) { if (kind !== lastKind) { drawMini(cartIn, kind); lastKind = kind; } cartIn.style.transform = `translateY(${(1 - k2) * -130}px)`; cartIn.style.opacity = k2; }
  } };
}
