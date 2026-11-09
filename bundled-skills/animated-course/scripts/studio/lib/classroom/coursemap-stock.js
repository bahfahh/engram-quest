// 課程地圖：股市入門（七課）。共用元件，API 形狀照 coursemap-pstack.js。
// 桌上黏土零件左到右＝第 1～7 課（第 1～5 課的呼叫仍是五個零件的桌子；第 6、7 課是七個零件的桌子），各是那一課核心機制的小模型、真的在動：
//   1 獲利 × 倍數：金色硬幣堆（EPS）× 紫色氣球（本益比）撐起「股價」牌：硬幣變高 → 牌穩穩上升；氣球忽大忽小 → 牌上下晃
//   2 看懂報價  ：一支黏土手機，螢幕上成交點一點一點跑，旁邊一根 K 線跟著長（開 → 高 → 低 → 收），收紅（台股紅漲綠跌）
//   3 誰在買賣  ：櫃台兩邊站著外資（藍）、自營商（灰綠）｜投信（橘）、其他（灰），股票積木從賣方滑到買方，每一塊都有一個賣方和一個買方
//   4 開戶下單  ：證券戶（木盒）和交割戶（存錢筒）用繩子連著；下單卡進盒子 → T+0、T+1、T+2 → 錢從存錢筒出去、股票積木進盒子
//   5 十年計畫  ：一條往右上的金色曲線（複利），中間兩次下凹（回撤）又爬回來，盡頭插「10 年」旗
//   6 業務      ：石墨藍營收圓餅切成幾塊（HPC 最大）；三條「100 元」長條各被灰色成本吃掉一段，剩下金色 60／25／6，金色一起閃一下
//   7 財報      ：三張紙卡（損益表瀑布、資產負債表左右對稱積木、現金流量表銀色進赭土色出剩自由現金流）＋上方「預期（虛線）vs 實際（實心）」天秤，往實際傾
// 收尾 shot: 'chain'：全部零件（5 或 7 個）站上同一條長台、中間接上箭頭，一塊股票積木從第 1 個跑到最後一個，到哪個就亮哪個，最後全部亮著停住。
// 說明：/lib/classroom/COURSEMAP-STOCK.md
//
//   import { makeCourseMapStock } from '/lib/classroom/coursemap-stock.js';
//   const map = await makeCourseMapStock({ lesson: 2, t0: 28.9, question: 'App 上這些數字在說什麼？' });
//   scene.add(map.root);
//   window.renderAt = t => { map.applyCam(cam, t); map.update(t, cam); renderer.render(scene, cam); };
//   window.TEXTS = t => map.texts(cam);      // 名牌、問題卡 → readcheck.cjs
//
// update(t) / cam(t) 是 t 的純函數：每一格把每個會動的屬性重設一次，不累積狀態；沒有 Date、沒有 Math.random（只用 S.rng 種子）。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';

const { clamp, lerp, prog, ease } = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ZH = 'Chiron GoRound TC', EN = 'Inter';
const ASPECT = 16 / 9, DEG = Math.PI / 180;

/** colour meanings (SERIES §5): one colour = one quantity */
export const COL = {
  up: '#E5484D', down: '#1F9D55',                    // Taiwan convention: red up, green down
  eps: '#E0A526', pe: '#7C5CD6',                     // earnings (gold), multiple / sentiment (purple)
  foreign: '#2B6CD6', trust: '#F2780C', dealer: '#5B8C7A', other: '#8A8F98',
  share: '#F3E3C3', shareInk: '#6b4a2b',             // a share block (neutral cream)
  cash: '#C9CED6',                                   // money (silver coins; gold is reserved for EPS)
  piggy: '#F2B3C0', box: '#C98F5C', ink: '#3b2a20',
  rev: '#3D5A80', cost: '#B8BDC7',                    // lessons 6–7: revenue (graphite blue), costs (light grey); what is left = gold (= eps)
  capex: '#A0673A', expect: '#9A8FC4',                  // capital expenditure (ochre); market expectation (lilac-grey, dashed) — actual = the same colour, solid
};
export const PARTS_STOCK = [null,
  { n: 1, name: '獲利 × 倍數' },
  { n: 2, name: '看懂報價' },
  { n: 3, name: '誰在買賣' },
  { n: 4, name: '開戶下單' },
  { n: 5, name: '十年計畫' },
  { n: 6, name: '業務' },
  { n: 7, name: '財報' },
];
const NP_MAX = 7;                              // parts that exist
const L_PART = [0, 4.4, 4.4, 4.6, 4.8, 4.6, 4.5, 4.8];   // one play of each mechanism at speed 1 (s)
const SP = 0.72;                               // slot spacing, 5-part table (lessons 1–5: unchanged)
const SP7 = 0.78;                              // slot spacing, 7-part table (a little wider so the bigger name plates do not touch)
const PART_Z = -0.07;
const BOARD_D = 1.14, TABLE_H = 0.40, G = 0.475;
const BASE_W = 0.62, BASE_D = 0.5, BH = 0.03;  // each part stands on its own slab
const PLATE_H = 0.14;                          // name plate height, 5-part table (wide shot ≈ 44–50 px glyphs)
const PLATE_H7 = 0.19;                         // 7-part table: plates scaled up so the wide-shot glyphs stay ≥ 40 px
const STRIP_H = 0.03;                          // chain: the long strip under all parts
/** table layout for `count` parts (5 = the original table, 7 = the extended one) */
function layout(count) {
  const sp = count > 5 ? SP7 : SP;
  const slotX = [0]; for (let i = 1; i <= count; i++) slotX.push((i - (count + 1) / 2) * sp);
  // plateDx: the long name 獲利 × 倍數 (1) and its neighbour (2) lean away from each other on the 7-part table
  return { count, sp, slotX, boardW: count * sp + 0.2, plateH: count > 5 ? PLATE_H7 : PLATE_H, tight: count > 5, plateDx: count > 5 ? { 1: -0.035, 2: 0.02 } : {} };
}

// ---------------------------------------------------------------- materials
let _tpl = null;
function M(color, { rough = 0.8, flat = false } = {}) {
  if (!_tpl) _tpl = C.clayMat('#ffffff', { bump: 1.0 });
  const m = _tpl.clone(); m.color = new THREE.Color(color); m.roughness = rough; if (flat) m.map = null;
  m.userData.base = new THREE.Color(color);
  return m;
}
/** "dim" = desaturate and wash toward the table's pale tone, per part (one uniform per part) */
function dimPatch(mat, u) {
  if (mat.userData.dimmed) return; mat.userData.dimmed = true;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDim = u;
    sh.fragmentShader = 'uniform float uDim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      'float psL = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));\n' +
      'gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(psL), vec3(0.95, 0.92, 0.86), 0.55), uDim);\n#include <dithering_fragment>');
  };
  mat.customProgramCacheKey = () => 'stdim';
}
const lumpy = (geo, amp, freq, seed) => C.clayify(geo, { amp, freq, seed });
const rbox = (w, h, d, r = 0.008, seed = 1, amp = 0.0012) => lumpy(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), amp, 18, seed);
const cyl = (rt, rb, h, seg = 18, seed = 1) => lumpy(new THREE.CylinderGeometry(rt, rb, h, seg, 1), 0.001, 22, seed);
const sph = (r, seed = 1, amp = 0.002) => lumpy(new THREE.SphereGeometry(r, 24, 18), amp, 9, seed);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function canvasTexture(cv) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------------------------------------------------------------- text on canvas (mixed Chinese / Latin, vector icons)
const PXM = 2200;                                   // canvas px per world metre
const ICON = new Set(['✓', '✗', '☐', '▶', '→', '▲', '▼']);
const isEn = (ch) => /[\x20-\x7E×]/.test(ch);
function runs(s) { const r = []; for (const ch of s) { const k = ICON.has(ch) ? 'i' : isEn(ch) ? 'e' : 'z'; if (r.length && r[r.length - 1].k === k && k !== 'i') r[r.length - 1].s += ch; else r.push({ k, s: ch }); } return r; }
const fontOf = (k, px) => k === 'e' ? `800 ${px}px "${EN}"` : `700 ${px}px "${ZH}"`;
function measure(c, s, px) { let w = 0; for (const r of runs(s)) { if (r.k === 'i') { w += px * 0.92; continue; } c.font = fontOf(r.k, px); w += c.measureText(r.s).width; } return w; }
function icon(c, ch, x, y, px, col) {        // x = left, y = baseline
  const s = px * 0.78, cx = x + px * 0.46, cy = y - px * 0.36;
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = Math.max(3, px * 0.14);
  if (ch === '✓') { c.beginPath(); c.moveTo(cx - s * 0.4, cy + s * 0.02); c.lineTo(cx - s * 0.1, cy + s * 0.32); c.lineTo(cx + s * 0.45, cy - s * 0.35); c.stroke(); }
  else if (ch === '✗') { c.beginPath(); c.moveTo(cx - s * 0.34, cy - s * 0.34); c.lineTo(cx + s * 0.34, cy + s * 0.34); c.moveTo(cx + s * 0.34, cy - s * 0.34); c.lineTo(cx - s * 0.34, cy + s * 0.34); c.stroke(); }
  else if (ch === '☐') { c.lineWidth = Math.max(3, px * 0.1); c.beginPath(); c.roundRect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, s * 0.12); c.stroke(); }
  else if (ch === '▶') { c.beginPath(); c.moveTo(cx - s * 0.3, cy - s * 0.38); c.lineTo(cx + s * 0.42, cy); c.lineTo(cx - s * 0.3, cy + s * 0.38); c.closePath(); c.fill(); }
  else if (ch === '▲') { c.beginPath(); c.moveTo(cx - s * 0.42, cy + s * 0.32); c.lineTo(cx, cy - s * 0.4); c.lineTo(cx + s * 0.42, cy + s * 0.32); c.closePath(); c.fill(); }
  else if (ch === '▼') { c.beginPath(); c.moveTo(cx - s * 0.42, cy - s * 0.32); c.lineTo(cx, cy + s * 0.4); c.lineTo(cx + s * 0.42, cy - s * 0.32); c.closePath(); c.fill(); }
  else if (ch === '→') { c.beginPath(); c.moveTo(cx - s * 0.45, cy); c.lineTo(cx + s * 0.42, cy); c.moveTo(cx + s * 0.12, cy - s * 0.3); c.lineTo(cx + s * 0.45, cy); c.lineTo(cx + s * 0.12, cy + s * 0.3); c.stroke(); }
  c.restore();
}
let BARS = false, DETAIL = true, FACES = null;   // FACES: text faces collected while a part is being built              // BARS: textTex is drawing the wide-shot twin; DETAIL: the part being posed is pushed in
function drawText(c, s, x, y, px, col, align = 'center') {
  const w = measure(c, s, px); let xx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  for (const r of runs(s)) {
    if (r.k === 'i') { icon(c, r.s, xx, y, px, col); xx += px * 0.92; continue; }
    if (BARS) { c.font = fontOf(r.k, px); const rw = c.measureText(r.s).width; if (r.s.trim()) { c.save(); c.globalAlpha = 0.4; c.fillStyle = col; c.beginPath(); c.roundRect(xx + px * 0.05, y - px * 0.62, rw - px * 0.1, px * 0.48, px * 0.24); c.fill(); c.restore(); } xx += rw; continue; }
    c.font = fontOf(r.k, px); c.fillStyle = col; c.fillText(r.s, xx, y + (r.k === 'e' ? px * 0.02 : px * 0.06)); xx += c.measureText(r.s).width;
  }
}
/**
 * A text card. lines: [string | {s, k (size factor), ink}]; o.ch = world cap height of k=1 text (m).
 * Returns { tex, w, h } (world metres). o: ink, bg (null = transparent), border, bw (px), radius (× px), padX/padY (× px), lh, minW (m), extra(c, W, H, px)
 */
function textTex(lines, o = {}) {
  const ch = o.ch || 0.04, px = Math.round(ch * PXM), lh = o.lh || 1.28;
  const L = lines.map(l => typeof l === 'string' ? { s: l } : l);
  const mc = document.createElement('canvas').getContext('2d');
  const padX = (o.padX ?? 0.55) * px, padY = (o.padY ?? 0.38) * px;
  let W = Math.max(...L.map(l => measure(mc, l.s, Math.round(px * (l.k || 1))))) + padX * 2;
  if (o.minW) W = Math.max(W, o.minW * PXM);
  const lineH = L.map(l => px * (l.k || 1) * lh);
  const H = Math.max(lineH.reduce((a, b) => a + b, 0) + padY * 2, (o.minH || 0) * PXM);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); const c = cv.getContext('2d');
  const R = (o.radius ?? 0.32) * px; const prevBars = BARS; BARS = !!o.bars;
  if (o.bg) { c.fillStyle = o.bg; c.beginPath(); c.roundRect(2, 2, W - 4, H - 4, R); c.fill(); }
  if (o.border) { c.strokeStyle = o.border; c.lineWidth = o.bw || px * 0.12; c.beginPath(); c.roundRect(c.lineWidth / 2 + 2, c.lineWidth / 2 + 2, W - c.lineWidth - 4, H - c.lineWidth - 4, R); c.stroke(); }
  let y = (H - lineH.reduce((a, b) => a + b, 0)) / 2;
  L.forEach((l, i) => { const p = Math.round(px * (l.k || 1)); y += lineH[i]; drawText(c, l.s, o.align === 'left' ? padX : W / 2, y - (lineH[i] - p) / 2 - p * 0.1, p, l.ink || o.ink || '#2b2622', o.align || 'center'); });
  if (o.extra) o.extra(c, W, H, px);
  BARS = prevBars;
  return { tex: canvasTexture(cv), w: W / PXM, h: H / PXM, cv };
}
/** a text card with a wide-shot twin (text drawn as bars); faces pick one by DETAIL */
function dual(lines, o = {}) { const d = textTex(lines, o), w = textTex(lines, { ...o, bars: true }); return { d, w, tex: d.tex, w_: w, h: d.h, wd: d.w, isDual: true }; }
const pickT = (t) => t.isDual ? (DETAIL ? t.d : t.w_) : t;
/** a face plane carrying a text texture; anchored at its bottom centre */
function face(tt0, { emissive = 0.25, transparent = false } = {}) {
  const tt = tt0.isDual ? tt0.d : tt0;
  const m = new THREE.MeshStandardMaterial({ map: tt.tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tt.tex, emissiveIntensity: emissive, transparent, alphaTest: transparent ? 0.02 : 0 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(tt.w, tt.h), m); f.position.y = tt.h / 2; if (FACES) FACES.push(f);
  f.userData.setTex = (t0) => { const t = pickT(t0); if (m.map !== t.tex) { m.map = t.tex; m.emissiveMap = t.tex; m.needsUpdate = true; } };
  f.userData.tt = tt0;
  return f;
}
/** an upright sign on a clay board (anchored bottom centre, tilted back a little toward an elevated camera) */
function sign(tt0, { board = '#d9b48a', depth = 0.012, tilt = 0.3, post = 0 } = {}) {
  const tt = tt0.isDual ? tt0.d : tt0;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  if (post > 0) for (const sx of [-1, 1]) g.add(mesh(cyl(0.006, 0.007, post + 0.01, 8, 7 + sx), M('#a96d42'), sx * tt.w * 0.32, post / 2, -0.004));
  inner.position.y = post; inner.rotation.x = -tilt;
  if (board) inner.add(mesh(rbox(tt.w + 0.012, tt.h + 0.012, depth, 0.008, 3), M(board), 0, tt.h / 2, -depth / 2 - 0.0015));
  const f = face(tt0); inner.add(f);
  g.userData.face = f; g.userData.inner = inner; g.userData.w = tt.w; g.userData.h = tt.h + post;
  /** keep DETAIL / wide twin in sync (call every frame) */
  g.userData.sync = () => f.userData.setTex(tt0);
  return g;
}
/** a paper card standing on a little sled, leaning back toward the camera. Origin = sled bottom centre. */
function card(tt0, { w = 0.105, h = 0.075, lean = 0.58, sled = '#c98f5c', paper = '#fffaf0' } = {}) {
  const tt = tt0.isDual ? tt0.d : tt0;
  const g = new THREE.Group();
  if (sled) g.add(mesh(rbox(w * 0.9, 0.012, 0.06, 0.004, 21), M(sled), 0, 0.006, 0));
  const pg = new THREE.Group(); pg.position.set(0, sled ? 0.012 : 0, 0.022); pg.rotation.x = -lean; g.add(pg);
  pg.add(mesh(rbox(w, h, 0.005, 0.003, 22, 0.0004), M(paper), 0, h / 2, -0.003));
  const f = face(tt0, { emissive: 0.18 }); f.scale.set(w / tt.w, h / tt.h, 1); f.position.y = h / 2; pg.add(f);
  g.userData.pg = pg; g.userData.face = f; g.userData.w = w; g.userData.h = h;
  return g;
}
function slab(g, col, seed) { const m = mesh(rbox(BASE_W, BH, BASE_D, 0.02, seed, 0.002), M(col), 0, BH / 2, 0); m.receiveShadow = true; g.add(m); return m; }
/** keyframed 1-D motion: keys [[time, value], …], eased between keys */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, ease.inOut(prog(t, a, b))); }
  return keys[keys.length - 1][1];
}
/** reading time of a text block (04-skeleton §5b) */
export function readNeed(str) { let cjk = 0, other = 0; for (const ch of String(str)) { if (/\s/.test(ch)) continue; if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch)) cjk++; else other++; } return Math.max(1.5, cjk / 4.5 + other / 15 + 1.5); }
const pop = (t, a, d = 0.25) => Math.max(0.001, ease.outBack(prog(t, a, a + d)));
const bump = (t, a, b) => Math.sin(Math.PI * prog(t, a, b));
/** a share block: a cream clay cube with 股 on its front and top */
let _shareTex = null;
function shareBlock(s = 0.042, seed = 1) {
  if (!_shareTex) _shareTex = textTex(['股'], { ch: 0.03, bg: COL.share, ink: COL.shareInk, minW: 0.042, minH: 0.042, padX: 0, padY: 0, radius: 0.15 });
  const g = new THREE.Group();
  g.add(mesh(rbox(s, s, s, 0.006, 700 + seed, 0.0006), M(COL.share), 0, s / 2, 0));
  const m = new THREE.MeshStandardMaterial({ map: _shareTex.tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: _shareTex.tex, emissiveIntensity: 0.15 });
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.86, s * 0.86), m); f1.position.set(0, s / 2, s / 2 + 0.0008); g.add(f1);
  const f2 = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.86, s * 0.86), m); f2.rotation.x = -Math.PI / 2; f2.position.set(0, s + 0.0008, 0); g.add(f2);
  g.userData.s = s;
  return g;
}
function coinGeo(r, h, seed) { return lumpy(new THREE.CylinderGeometry(r, r, h, 28, 1), 0.0006, 30, seed); }
/** a thin rod between two points (string, rope, link) */
function rod(r, mat) { const m = mesh(new THREE.CylinderGeometry(r, r, 1, 8, 1), mat); m.castShadow = false; m.userData.set = (a, b) => { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, Math.max(1e-4, L), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }; return m; }

// ---------------------------------------------------------------- part 1: EPS coins × P/E balloon hold up the price tag
function buildP1(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 101);
  const PX = 0.0, PZ = -0.08, CX = -0.17, CZ = -0.01, CH = 0.034, CR = 0.068;
  // the price post (a wooden ruler)
  g.add(mesh(rbox(0.026, 0.56, 0.026, 0.006, 110), M('#b98256'), PX, BH + 0.28, PZ));
  for (let i = 1; i <= 9; i++) g.add(mesh(rbox(0.036, 0.006, 0.03, 0.002, 111 + i), M('#8a5a36'), PX, BH + i * 0.056, PZ));
  // the coin stack (EPS)
  const coinM = M(COL.eps, { rough: 0.55 }), coinEdge = M('#b9831a', { rough: 0.6 });
  const coins = [];
  for (let i = 0; i < 8; i++) { const c = new THREE.Group(); c.add(mesh(coinGeo(CR, CH * 0.92, 120 + i), coinM)); const rim = mesh(new THREE.TorusGeometry(CR * 0.72, 0.003, 6, 28), coinEdge); rim.rotation.x = Math.PI / 2; rim.position.y = CH * 0.47; c.add(rim); g.add(c); coins.push(c); }
  // the earnings level: a gold arm from the stack top to the post
  const arm = mesh(rbox(0.12, 0.01, 0.018, 0.003, 130), M(COL.eps)); g.add(arm);
  // the price tag on the post
  const tagT = textTex(['股價'], { ch: 0.06, bg: '#fffaf0', ink: COL.ink, border: COL.ink, bw: 8, padX: 0.4, padY: 0.28, radius: 0.35 });
  const tag = sign(tagT, { board: '#8a5a36', tilt: 0.12, depth: 0.01 }); g.add(tag);
  const sleeve = mesh(rbox(0.038, 0.03, 0.038, 0.008, 131), M('#8a5a36')); g.add(sleeve);
  // the balloon (P/E)
  const balloon = new THREE.Group(); g.add(balloon);
  const bm = M(COL.pe, { rough: 0.45 });
  const bb = mesh(sph(0.088, 140, 0.0015), bm); bb.scale.set(1, 1.15, 1); bb.position.y = 0.1; balloon.add(bb);
  const knot = mesh(new THREE.ConeGeometry(0.012, 0.018, 10), bm); knot.position.y = 0.002; balloon.add(knot);
  const hl = mesh(sph(0.016, 141), new THREE.MeshBasicMaterial({ color: '#d9cdfa', transparent: true, opacity: 0.8, depthWrite: false })); hl.position.set(-0.032, 0.14, 0.062); hl.castShadow = false; balloon.add(hl);
  const string = rod(0.0018, M('#5a4b7a')); g.add(string);
  // small labels in front (wide shot: bars)
  const epsS = sign(dual(['EPS'], { ch: 0.03, bg: COL.eps, ink: '#ffffff', padX: 0.4, padY: 0.25 }), { board: '#b9831a', tilt: 0.7, depth: 0.008 });
  epsS.position.set(CX, BH, 0.15); g.add(epsS);
  const peS = sign(dual(['本益比'], { ch: 0.03, bg: COL.pe, ink: '#ffffff', padX: 0.35, padY: 0.25 }), { board: '#553a9e', tilt: 0.7, depth: 0.008 });
  peS.position.set(0.17, BH, 0.15); g.add(peS);
  const xS = sign(textTex(['×'], { ch: 0.045, bg: '#f6ecda', ink: COL.ink, padX: 0.2, padY: 0.1 }), { board: null, tilt: 0.7 });
  xS.position.set(0.0, BH, 0.16); g.add(xS);

  const L = L_PART[1];
  const coinT = [0.35, 0.7, 1.05, 1.4, 1.75];     // five coins land (earnings grow)
  const balloonS = (lt) => track([[0, 1], [2.3, 1], [2.75, 1.4], [3.05, 1.4], [3.5, 0.68], [3.75, 0.68], [4.25, 1]], lt);
  function act(lt) {
    // coins: two to begin with, five more drop in
    let top = BH + 2 * CH;
    coins.forEach((c, i) => {
      if (i < 2) { c.visible = true; c.position.set(CX, BH + i * CH, CZ); return; }
      const a = coinT[i - 2]; if (a == null) { c.visible = false; return; }
      const k = prog(lt, a, a + 0.22); c.visible = lt >= a - 0.05;
      c.position.set(CX, BH + i * CH + 0.12 * (1 - ease.in(k)), CZ); c.rotation.z = 0.25 * (1 - k);
      top += CH * ease.out(prog(lt, a + 0.15, a + 0.3));
    });
    const s = balloonS(lt), bob = (s - 1) * 0.14;
    const ty = top + 0.03 + bob;                  // price tag bottom
    arm.position.set((CX + CR * 0.6 + PX) / 2, top + 0.004, PZ + 0.02);
    tag.position.set(PX + tagT.w / 2 + 0.014, ty, PZ + 0.016); tag.userData.sync();
    sleeve.position.set(PX, ty + tagT.h / 2, PZ);
    const sway = 0.012 * Math.sin(lt * 2.1);
    const bx = PX + 0.19 + sway, by = ty + tagT.h + 0.08;
    balloon.position.set(bx, by, PZ + 0.0); balloon.scale.setScalar(s);
    string.userData.set(V(PX + tagT.w + 0.01, ty + tagT.h * 0.9, PZ + 0.02), V(bx, by, PZ));
    epsS.userData.sync(); peS.userData.sync();
    epsS.scale.setScalar(1 + 0.08 * bump(lt, 0.35, 1.95));
    peS.scale.setScalar(1 + 0.08 * bump(lt, 2.3, 4.25));
  }
  return { g, L, act, item: tag };
}

// ---------------------------------------------------------------- part 2: a clay phone; one candlestick grows from trade ticks
function buildP2(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 201);
  const PW = 0.32, PH = 0.54, TILT = 0.26, PZ = -0.04;
  const phone = new THREE.Group(); phone.position.set(0, BH + 0.012, PZ); phone.rotation.x = -TILT; g.add(phone);
  phone.add(mesh(rbox(PW, PH, 0.03, 0.035, 210), M('#2b2f3a', { rough: 0.5 }), 0, PH / 2, 0));
  g.add(mesh(rbox(PW * 0.8, 0.02, 0.05, 0.008, 212), M('#4a4f5c'), 0, BH + 0.01, PZ + 0.015));
  // screen canvas, redrawn when (lt, DETAIL) changes
  const SW = 480, SHp = 780, cv = document.createElement('canvas'); cv.width = SW; cv.height = SHp;
  const sc = cv.getContext('2d'), stex = canvasTexture(cv);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PW * 0.86, PH * 0.88), new THREE.MeshStandardMaterial({ map: stex, roughness: 0.6, emissive: '#ffffff', emissiveMap: stex, emissiveIntensity: 0.55 }));
  scr.position.set(0, PH / 2, 0.0158); phone.add(scr);
  // price path (open 50 → high 58 → low 46 → close 55): close > open → a red candle
  const KEYP = [[0, 50], [0.14, 53.5], [0.33, 58], [0.5, 52.5], [0.68, 46], [0.84, 51], [1, 55]];
  const pathAt = (u) => { for (let i = 1; i < KEYP.length; i++) if (u <= KEYP[i][0]) { const [a, va] = KEYP[i - 1], [b, vb] = KEYP[i]; return lerp(va, vb, ease.inOut(prog(u, a, b))); } return 55; };
  const NT = 30, rr = S.rng(2330);
  const ticks = Array.from({ length: NT }, (_, i) => { const u = i / (NT - 1); const j = (i === 0 || i === NT - 1 || [0.33, 0.68].some(x => Math.abs(u - x) < 0.02)) ? 0 : (rr() - 0.5) * 1.4; return { u, p: pathAt(u) + j, v: 0.3 + rr() * 0.7 }; });
  ticks.forEach(k => { if (Math.abs(k.u - 0.33) < 0.02) k.p = 58; if (Math.abs(k.u - 0.68) < 0.02) k.p = 46; });
  const T0 = 0.3, T1 = 3.6;
  let key = '';
  function draw(lt) {
    const u = prog(lt, T0, T1), k2 = `${u.toFixed(4)}|${DETAIL}|${lt >= T1 ? Math.min(1, (lt - T1) / 0.4).toFixed(2) : 0}`;
    if (k2 === key) return; key = k2;
    const c = sc; c.fillStyle = '#fbfaf7'; c.fillRect(0, 0, SW, SHp);
    const shown = ticks.filter(k => k.u <= u + 1e-6);
    const last = shown[shown.length - 1] || ticks[0];
    const open = ticks[0].p, cur = last.p;
    const hi = Math.max(...shown.map(k => k.p)), lo = Math.min(...shown.map(k => k.p));
    const colr = cur >= open ? COL.up : COL.down;
    // top: last trade price, big
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = `800 120px "${EN}"`; c.fillStyle = colr; c.fillText(cur.toFixed(1), SW / 2, 140);
    c.fillStyle = '#e6e2da'; c.fillRect(24, 170, SW - 48, 4);
    // chart area
    const Y0 = 210, Y1 = 640, PMIN = 44, PMAX = 60, py = (p) => Y1 - (p - PMIN) / (PMAX - PMIN) * (Y1 - Y0);
    const AX0 = 26, AX1 = 214, CXc = 318, CW = 140;
    // open line
    c.setLineDash([12, 10]); c.strokeStyle = '#b8b2a6'; c.lineWidth = 4; c.beginPath(); c.moveTo(AX0, py(open)); c.lineTo(SW - 24, py(open)); c.stroke(); c.setLineDash([]);
    // ticks path
    c.strokeStyle = '#8f96a3'; c.lineWidth = 5; c.beginPath();
    shown.forEach((k, i) => { const x = lerp(AX0, AX1, k.u), y = py(k.p); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
    shown.forEach((k) => { c.fillStyle = '#5d6470'; c.beginPath(); c.arc(lerp(AX0, AX1, k.u), py(k.p), 6, 0, 7); c.fill(); });
    if (u < 1 && u > 0) { const x = lerp(AX0, AX1, last.u), y = py(cur); c.fillStyle = colr; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill();
      c.strokeStyle = colr; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(x + 16, y); c.lineTo(CXc - CW / 2 - 6, y); c.stroke(); c.setLineDash([]); }
    // the candle
    if (shown.length) {
      c.strokeStyle = '#3b3f47'; c.lineWidth = 12; c.beginPath(); c.moveTo(CXc, py(hi)); c.lineTo(CXc, py(lo)); c.stroke();
      const yA = py(Math.max(open, cur)), yB = py(Math.min(open, cur));
      c.fillStyle = colr; c.beginPath(); c.roundRect(CXc - CW / 2, yA, CW, Math.max(8, yB - yA), 8); c.fill();
    }
    // labels (only when pushed in)
    if (DETAIL) {
      c.font = `700 58px "${ZH}"`; c.textAlign = 'left';
      const lab = (s, p, col) => { c.fillStyle = col; c.fillText(s, CXc + CW / 2 + 4, py(p) + 20); };
      lab('開', open, '#6d675d');
      if (u >= 0.33) lab('高', 58, '#3b3f47');
      if (u >= 0.68) lab('低', 46, '#3b3f47');
      if (u >= 1) lab('收', 55, COL.up);
    }
    // volume bars
    shown.forEach((k) => { c.fillStyle = '#c9c3b8'; const x = lerp(AX0, AX1, k.u); c.fillRect(x - 3.5, 740 - k.v * 70, 7, k.v * 70); });
    c.fillStyle = '#e6e2da'; c.fillRect(24, 742, SW - 48, 3);
    stex.needsUpdate = true;
  }
  const L = L_PART[2];
  function act(lt) {
    draw(lt);
    phone.scale.setScalar(1 + 0.04 * bump(lt, T1, T1 + 0.45));
  }
  return { g, L, act, item: scr };
}

// ---------------------------------------------------------------- part 3: the counter; every block has a seller and a buyer
function buildP3(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 301);
  const CTH = 0.1;
  g.add(mesh(rbox(0.17, CTH, 0.4, 0.012, 310), M('#c98f5c'), 0, BH + CTH / 2, -0.02));
  g.add(mesh(rbox(0.18, 0.012, 0.41, 0.006, 311), M('#a96d42'), 0, BH + CTH + 0.006, -0.02));
  const TOP = BH + CTH + 0.012;
  const who = [
    { k: 'foreign', side: -1, z: -0.12, name: '外資' },
    { k: 'dealer', side: -1, z: 0.09, name: '自營商' },
    { k: 'trust', side: 1, z: -0.12, name: '投信' },
    { k: 'other', side: 1, z: 0.09, name: '其他' },
  ];
  const BX = 0.215;
  who.forEach((w, i) => {
    w.bean = C.makeBean(COL[w.k], 31 + i, { arms: true }); w.bean.scale.setScalar(0.85);
    w.bean.position.set(w.side * BX, BH, w.z); w.bean.rotation.y = -w.side * 0.75; g.add(w.bean);
    const back = w.z < 0;                                  // back row: the tag floats over the head (the front figure would hide it)
    w.tag = sign(dual([w.name], { ch: 0.026, bg: COL[w.k], ink: '#ffffff', padX: 0.35, padY: 0.2 }), { board: null, tilt: back ? 0.3 : 0.8 });
    w.tag.position.set(w.side * (BX + (back ? 0.04 : 0)), back ? BH + 0.2 : BH, w.z + (back ? 0.03 : 0.1)); g.add(w.tag);
  });
  // side signs
  const sellS = sign(dual(['賣方'], { ch: 0.034, bg: '#fffaf0', ink: COL.ink, padX: 0.35, padY: 0.22 }), { board: '#a96d42', post: 0.27 });
  sellS.position.set(-BX, BH, -0.2); g.add(sellS);
  const buyS = sign(dual(['買方'], { ch: 0.034, bg: '#fffaf0', ink: COL.ink, padX: 0.35, padY: 0.22 }), { board: '#a96d42', post: 0.27 });
  buyS.position.set(BX, BH, -0.2); g.add(buyS);
  // share blocks on the counter: sellers' stacks at x −0.03, buyers' at +0.03
  const blocks = [shareBlock(0.05, 1), shareBlock(0.05, 2), shareBlock(0.05, 3)]; blocks.forEach(b => g.add(b));
  const link = rod(0.004, new THREE.MeshBasicMaterial({ color: '#f5c542', toneMapped: false })); g.add(link);
  const BS = 0.05, SXs = -0.05, SXb = 0.05;
  // trades: [block, from(seller idx), to(buyer idx), start]
  const TR = [[0, 0, 3, 0.35], [1, 0, 2, 1.75], [2, 1, 3, 3.1]];
  const zOf = (i) => who[i].z + 0.02;
  // initial stacks: blue holds 0,1 (1 on top of… we take the top first: block 0 sits on top), dealer holds 2
  const startPos = [V(SXs, TOP + BS, zOf(0)), V(SXs, TOP, zOf(0)), V(SXs, TOP, zOf(1))];
  const L = L_PART[3], DUR = 1.0;
  function act(lt) {
    const recv = [0, 0, 0, 0];
    who.forEach(w => { w.tag.userData.sync(); });
    sellS.userData.sync(); buyS.userData.sync();
    let linkOn = false;
    for (const [bi, from, to, a] of TR) {
      const b = blocks[bi], u = ease.inOut(prog(lt, a + 0.25, a + DUR));
      const end = V(SXb, TOP + recv[to] * BS, zOf(to));
      if (lt >= a + DUR) recv[to]++;
      const p = startPos[bi].clone().lerp(end, u); p.y += 0.09 * Math.sin(Math.PI * u);
      b.position.copy(p); b.rotation.y = 0.0;
      b.scale.setScalar(1 + 0.12 * bump(lt, a, a + 0.25));
      // the match: seller and buyer are linked while the block moves
      const on = lt >= a && lt < a + DUR + 0.15;
      if (on) {
        linkOn = true;
        const s = who[from].bean.position, d = who[to].bean.position;
        link.userData.set(V(s.x * 0.85, BH + 0.23, s.z), V(d.x * 0.85, BH + 0.23, d.z));
        link.scale.x = link.scale.z = 1 + 0.6 * bump(lt, a, a + 0.3);
      }
    }
    link.visible = linkOn;
    who.forEach((w, i) => {
      let sq = 0, hold = 0, look = 0;
      for (const [, from, to, a] of TR) {
        if (i === from) { hold = Math.max(hold, bump(lt, a, a + 0.6)); sq = Math.max(sq, 0.1 * bump(lt, a, a + 0.3)); }
        if (i === to) { hold = Math.max(hold, bump(lt, a + 0.6, a + 1.2)); sq = Math.max(sq, 0.14 * bump(lt, a + DUR - 0.05, a + DUR + 0.25)); }
      }
      w.bean.userData.pose({ t: lt, hold, squash: sq, look });
    });
  }
  return { g, L, act, item: blocks[0] };
}

// ---------------------------------------------------------------- part 4: broker account (box) + settlement account (piggy bank); T+2
function buildP4(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 401);
  // piggy bank (交割戶)
  const PXp = -0.16, PZp = -0.06;
  const pig = new THREE.Group(); pig.position.set(PXp, BH, PZp); pig.rotation.y = 0.35; g.add(pig); const PIGS = 1.3;
  const pm = M(COL.piggy, { rough: 0.6 });
  const body = mesh(sph(0.1, 410, 0.002), pm); body.scale.set(1.0, 0.8, 0.82); body.position.y = 0.11; pig.add(body);
  const snout = mesh(cyl(0.032, 0.036, 0.03, 18, 411), pm); snout.rotation.z = Math.PI / 2; snout.position.set(0.1, 0.11, 0); pig.add(snout);
  for (const sz of [-1, 1]) { const n = mesh(sph(0.006, 412), M('#b06a7a')); n.position.set(0.116, 0.112, sz * 0.012); pig.add(n); }
  for (const sz of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.024, 0.04, 10), pm); e.position.set(0.045, 0.19, sz * 0.045); e.rotation.x = sz * 0.3; pig.add(e); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pig.add(mesh(cyl(0.017, 0.019, 0.05, 10, 413 + sx + sz), pm, sx * 0.055, 0.025, sz * 0.045));
  for (const sz of [-1, 1]) { const e = mesh(sph(0.009, 415), M('#2a1a14')); e.position.set(0.075, 0.14, sz * 0.032); pig.add(e); }
  pig.add(mesh(rbox(0.05, 0.008, 0.012, 0.003, 416), M('#7a3d4c'), -0.005, 0.19, 0));
  // broker account (open box)
  const BXb = 0.17, BZb = -0.05, BW = 0.2, BHh = 0.13, BD = 0.17;
  const boxM = M(COL.box);
  const boxG = new THREE.Group(); boxG.position.set(BXb, BH, BZb); g.add(boxG);
  boxG.add(mesh(rbox(BW, 0.014, BD, 0.005, 420), boxM, 0, 0.007, 0));
  boxG.add(mesh(rbox(BW, BHh, 0.014, 0.005, 421), boxM, 0, BHh / 2, -BD / 2 + 0.007));
  boxG.add(mesh(rbox(BW, BHh * 0.75, 0.014, 0.005, 422), boxM, 0, BHh * 0.375, BD / 2 - 0.007));
  for (const sx of [-1, 1]) boxG.add(mesh(rbox(0.014, BHh, BD, 0.005, 423 + sx), boxM, sx * (BW / 2 - 0.007), BHh / 2, 0));
  // labels on the box front and in front of the piggy
  const boxL = sign(dual(['證券戶'], { ch: 0.03, bg: '#fffaf0', ink: COL.ink, padX: 0.3, padY: 0.2 }), { board: null, tilt: 0 });
  boxL.position.set(0, 0.022, BD / 2 + 0.004); boxG.add(boxL);
  const pigL = sign(dual(['交割戶'], { ch: 0.03, bg: '#fffaf0', ink: COL.ink, padX: 0.3, padY: 0.2 }), { board: '#b06a7a', tilt: 0.7, depth: 0.008 });
  pigL.position.set(PXp - 0.01, BH, 0.12); g.add(pigL);
  // the rope linking them
  const rope = rod(0.005, M('#8a6a4a')); g.add(rope);
  rope.userData.set(V(PXp + 0.11, BH + 0.13, PZp + 0.02), V(BXb - BW / 2, BH + 0.1, BZb));
  // T counter between them, on a post
  const tT = ['T+0', 'T+1', 'T+2'].map(s => textTex([s], { ch: 0.058, bg: '#fffaf0', ink: COL.ink, border: COL.ink, bw: 8, padX: 0.32, padY: 0.22 }));
  const tS = sign(tT[0], { board: '#8a5a36', post: 0.3, tilt: 0.25 }); tS.position.set(0.005, BH, -0.19); g.add(tS);
  // order card
  const ordT = dual([{ s: '下單', k: 1.1 }, { s: '買 1 張', k: 0.85 }], { ch: 0.026, bg: '#fffaf0', ink: COL.ink, padX: 0.35, padY: 0.2, lh: 1.25, minW: 0.1 });
  const ord = card(ordT, { w: 0.1, h: 0.075, sled: null }); g.add(ord);
  // money: silver coins on top of the piggy (they leave at T+2)
  const cashM = M(COL.cash, { rough: 0.45 });
  const coins = [0, 1, 2].map(i => { const c = mesh(coinGeo(0.03, 0.012, 430 + i), cashM); g.add(c); return c; });
  const coinHome = (i) => V(PXp - 0.035 + i * 0.035, BH + 0.265 + (i === 1 ? 0.005 : 0), PZp + (i - 1) * 0.01);
  const OUT = V(-0.02, BH + 0.3, -0.3);           // the market: out over the back edge
  const blk = shareBlock(0.06, 9); g.add(blk);
  const glow = mesh(new THREE.RingGeometry(0.1, 0.125, 40), new THREE.MeshBasicMaterial({ color: '#ffe17a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(BXb, BH + 0.002, BZb); glow.castShadow = false; g.add(glow);

  const L = L_PART[4];
  const TT = [1.15, 1.85, 2.55];                   // T+0 shown from the start; T+1, T+2
  function act(lt) {
    // order card goes into the box
    const u = ease.inOut(prog(lt, 0.15, 0.95));
    ord.visible = lt < 1.2; ord.userData.face.userData.setTex(ordT);
    ord.position.set(lerp(-0.02, BXb, u), BH + lerp(0, BHh + 0.02, u) + 0.05 * Math.sin(Math.PI * u), lerp(0.17, BZb, u));
    ord.scale.setScalar(Math.max(0.001, 1 - ease.in(prog(lt, 0.95, 1.2))));
    // T counter
    const step = lt >= TT[2] ? 2 : lt >= TT[1] ? 1 : 0;
    tS.userData.face.userData.setTex(tT[step]);
    tS.scale.setScalar(1 + 0.16 * Math.max(bump(lt, TT[1], TT[1] + 0.3), bump(lt, TT[2], TT[2] + 0.3)));
    // T+2: coins leave the piggy for the market, a share block comes in
    coins.forEach((c, i) => {
      const a = 2.75 + i * 0.12, k = ease.inOut(prog(lt, a, a + 0.6));
      const p = coinHome(i).lerp(OUT, k); p.y += 0.08 * Math.sin(Math.PI * k);
      c.position.copy(p); c.rotation.x = k * 3; c.visible = k < 0.98; c.scale.setScalar(Math.max(0.001, 1 - 0.6 * ease.in(prog(lt, a + 0.35, a + 0.6))));
    });
    const kb = ease.inOut(prog(lt, 3.35, 4.05));
    const pb = OUT.clone().lerp(V(BXb, BH + 0.016, BZb), kb); pb.y += 0.1 * Math.sin(Math.PI * kb);
    blk.position.copy(pb); blk.visible = lt >= 3.3; blk.scale.setScalar(Math.max(0.001, Math.min(1, prog(lt, 3.3, 3.55) * 1.0 + 0.3)));
    glow.material.opacity = 0.85 * prog(lt, 4.05, 4.25);
    boxG.scale.setScalar(1 + 0.06 * bump(lt, 4.05, 4.4));
    pig.scale.setScalar(PIGS * (1 - 0.05 * bump(lt, 2.75, 3.3)));
    boxL.userData.sync(); pigL.userData.sync();
  }
  return { g, L, act, item: ord };
}

// ---------------------------------------------------------------- part 5: ten-year plan, a compounding curve with two drawdowns
function buildP5(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 501);
  // backboard with a baseline and faint year ticks
  const BW = 0.56, BHt = 0.46, BZ = -0.15;
  const cv = document.createElement('canvas'); cv.width = 560; cv.height = 460; const c = cv.getContext('2d');
  c.fillStyle = '#fffaf0'; c.beginPath(); c.roundRect(0, 0, 560, 460, 22); c.fill();
  c.strokeStyle = '#e8dfcf'; c.lineWidth = 3; for (let i = 1; i <= 5; i++) { c.beginPath(); c.moveTo(30, 410 - i * 70); c.lineTo(530, 410 - i * 70); c.stroke(); }
  c.strokeStyle = '#b8ad9c'; c.lineWidth = 6; c.beginPath(); c.moveTo(30, 410); c.lineTo(530, 410); c.stroke();
  for (let i = 0; i <= 10; i++) { const x = 46 + i * 44; c.beginPath(); c.moveTo(x, 410); c.lineTo(x, 426); c.stroke(); }
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(BW, BHt), new THREE.MeshStandardMaterial({ map: canvasTexture(cv), roughness: 0.9, emissive: '#ffffff', emissiveMap: canvasTexture(cv), emissiveIntensity: 0.15 }));
  const bg = new THREE.Group(); bg.position.set(0, BH + 0.01, BZ); bg.rotation.x = -0.12; g.add(bg);
  bg.add(mesh(rbox(BW + 0.02, BHt + 0.02, 0.014, 0.01, 510), M('#c98f5c'), 0, BHt / 2, -0.009));
  bd.position.set(0, BHt / 2, 0.0); bg.add(bd);
  // the curve: compound growth with two drawdowns (−30 %, −22 %) that recover
  const K = 1.7, gr = (u) => (Math.exp(K * u) - 1) / (Math.exp(K) - 1);
  const dip = (u, c0, w1, w2, d) => u < c0 - w1 || u > c0 + w2 ? 0 : u < c0 ? d * ease.inOut((u - (c0 - w1)) / w1) : d * (1 - ease.inOut((u - c0) / w2));
  const val = (u) => (0.12 + 0.88 * gr(u)) * (1 - dip(u, 0.3, 0.05, 0.11, 0.3) - dip(u, 0.64, 0.04, 0.1, 0.22));
  const X0 = -0.22, X1 = 0.17, Y0 = BH + 0.07, YS = 0.34, CZ = BZ + 0.035;
  const ptAt = (u) => V(lerp(X0, X1, u), Y0 + val(u) * YS, CZ - 0.04 * (1 - u) * 0);
  const NS = 160, pts = Array.from({ length: NS + 1 }, (_, i) => ptAt(i / NS));
  const curve = new THREE.CatmullRomCurve3(pts);
  const RAD = 10, tube = new THREE.TubeGeometry(curve, NS, 0.013, RAD, false);
  const tubeM = M(COL.eps, { rough: 0.5 });
  const tm = mesh(tube, tubeM); g.add(tm);
  const tip = mesh(sph(0.02, 520), tubeM); g.add(tip);
  // the start dot
  const st = mesh(sph(0.016, 521), M('#b9831a')); st.position.copy(pts[0]); g.add(st);
  // the flag at the end
  const fT = textTex(['10 年'], { ch: 0.06, bg: '#fffaf0', ink: COL.ink, border: COL.ink, bw: 7, padX: 0.32, padY: 0.2, radius: 0.2 });
  const flag = new THREE.Group(); g.add(flag);
  const pole = mesh(cyl(0.006, 0.007, 0.24, 8, 530), M('#8a5a36')); pole.position.y = 0.12; flag.add(pole);
  const fl = face(fT, { emissive: 0.25 }); fl.position.set(-fT.w / 2 - 0.004, 0.24 - fT.h, 0.004); flag.add(fl);
  const end = ptAt(1);
  const L = L_PART[5], A = 0.25, B = 3.7;
  function act(lt) {
    const u = ease.inOut(prog(lt, A, B)) * 0.6 + prog(lt, A, B) * 0.4;
    const n = Math.max(1, Math.round(u * NS));
    tube.setDrawRange(0, n * RAD * 6);
    tip.position.copy(curve.getPointAt(Math.min(1, n / NS))); tip.visible = lt > A;
    tip.scale.setScalar(1 + 0.25 * bump(lt, B, B + 0.35));
    const fk = pop(lt, B, 0.35);
    flag.visible = lt >= B - 0.02; flag.scale.setScalar(fk);
    flag.position.set(end.x + 0.03, end.y - 0.06, end.z + 0.01);
  }
  return { g, L, act, item: tip };
}
// ---------------------------------------------------------------- part 6: 業務 — "of every 100 NT$ sold, how much is left?"
// a graphite-blue revenue pie cut into product slices (the biggest = HPC); three "100" bars, each eaten by a grey cost block, the rest turns gold (60 / 25 / 6)
function buildP6(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 601);
  const R = 0.118, PH = 0.028, TILT = 0.95, PCX = -0.178, PCZ = -0.035, PCY = BH + 0.125;
  const pie = new THREE.Group(); pie.position.set(PCX, PCY, PCZ); pie.rotation.x = TILT; g.add(pie);
  const FR = [0.46, 0.27, 0.17, 0.10], SC = [COL.rev, '#52709A', '#6A86AE', '#8AA2C4'];
  let ph = -Math.PI * FR[0];
  const secs = FR.map((f, i) => {
    const a = ph, b = ph + f * Math.PI * 2; ph = b;
    const rr = R - 0.005, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(rr * Math.cos(a + 0.015), rr * Math.sin(a + 0.015)); sh.absarc(0, 0, rr, a + 0.015, b - 0.015, false); sh.closePath();   // a wedge (lineTo: absarc alone would start at the arc, not the centre)
    const geo = new THREE.ExtrudeGeometry(sh, { depth: PH, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 20 });
    geo.rotateX(-Math.PI / 2);                                  // shape (x, y) → ground (x, −y); extrusion → +y
    const grp = new THREE.Group(); grp.add(mesh(geo, M(SC[i], { rough: 0.7 }))); pie.add(grp);
    const mid = (a + b) / 2; return { grp, dx: Math.cos(mid), dz: -Math.sin(mid) };
  });
  // a little leg behind the pie, and the label in front
  const leg = rod(0.009, M('#a96d42')); g.add(leg); leg.userData.set(V(PCX, PCY + 0.05, PCZ - 0.06), V(PCX, BH, PCZ - 0.17));
  const pieS = sign(dual(['營收'], { ch: 0.03, bg: COL.rev, ink: '#ffffff', padX: 0.35, padY: 0.22 }), { board: null, tilt: 0.7 });
  pieS.position.set(PCX, BH, 0.13); g.add(pieS);
  const hpcS = sign(dual(['HPC'], { ch: 0.03, bg: '#fffaf0', ink: COL.rev, padX: 0.3, padY: 0.2 }), { board: null, tilt: 0 });
  hpcS.rotation.x = -Math.PI / 2; hpcS.position.set(R * 0.42, PH + 0.0075, 0); secs[0].grp.add(hpcS);
  // the three bars: common baseline on the left; the length is 100 (NT$); gold = what is left
  const BX0 = 0.0, BL = 0.28, MH = 0.04, GH = 0.026, BD = 0.062, Y0 = BH + 0.008;
  const ROWS = [{ z: -0.13, keep: 0.60, c0: 1.85, cd: 0.45, label: '60' }, { z: -0.005, keep: 0.25, c0: 2.15, cd: 0.55, label: '25' }, { z: 0.12, keep: 0.06, c0: 2.45, cd: 0.65, label: '6' }];
  const gold = new THREE.Color(COL.eps), blue = new THREE.Color(COL.rev), hot = new THREE.Color('#FFE08A');
  ROWS.forEach((r, i) => {
    g.add(mesh(rbox(BL + 0.012, 0.006, BD + 0.012, 0.003, 620 + i, 0.0004), M('#e9dcc0'), BX0 + BL / 2, BH + 0.003, r.z));   // the empty 100 rail
    r.main = mesh(rbox(1, MH, BD, 0.008, 630 + i, 0.0004), M(COL.rev, { rough: 0.55 })); g.add(r.main);
    r.gray = mesh(rbox(1, GH, BD, 0.006, 640 + i, 0.0004), M(COL.cost)); g.add(r.gray);
    r.tag = sign(dual([r.label], { ch: 0.024, bg: COL.eps, ink: '#3b2a20', padX: 0.4, padY: 0.18, minW: 0.036 }), { board: null, tilt: 0.8 });
    r.tag.position.set(BX0 + 0.028, Y0 + MH + 0.002, r.z); g.add(r.tag);
  });
  const L = L_PART[6];
  function act(lt) {
    // the pie is cut: slices move apart a little, the biggest (HPC) lifts
    const ex = ease.inOut(prog(lt, 0.25, 0.95)), lift = ease.out(prog(lt, 0.6, 1.05));
    secs.forEach((s, i) => { const e = 0.006 * ex + (i === 0 ? 0.008 * lift : 0); s.grp.position.set(s.dx * e, i === 0 ? 0.022 * lift : 0, s.dz * e); s.grp.scale.setScalar(i === 0 ? 1 + 0.05 * bump(lt, 0.6, 1.2) : 1); });
    pieS.userData.sync(); hpcS.userData.sync(); hpcS.visible = lt >= 0.9;
    const blink = bump(lt, 3.85, 4.4);
    ROWS.forEach((r, i) => {
      const grow = ease.out(prog(lt, 1.0 + 0.18 * i, 1.45 + 0.18 * i));
      const ck = ease.inOut(prog(lt, r.c0, r.c0 + r.cd));
      const mf = lerp(1, r.keep, ck);                                   // share of the 100 that is still "ours"
      const mw = Math.max(1e-4, BL * grow * mf);
      r.main.visible = grow > 0.001;
      const sy = 1 + 0.45 * blink;
      r.main.scale.set(mw, sy, 1); r.main.position.set(BX0 + mw / 2, Y0 + MH * sy / 2, r.z);
      const gw = Math.max(1e-4, BL * (1 - mf));
      r.gray.visible = ck > 0.001; r.gray.scale.set(gw, 1, 1);
      r.gray.position.set(BX0 + BL - gw / 2, Y0 + GH / 2 + 0.025 * (1 - Math.min(1, ck * 3)), r.z);
      const gk = ease.inOut(prog(lt, 3.15 + 0.12 * i, 3.33 + 0.12 * i));
      r.main.material.color.copy(blue).lerp(gold, gk).lerp(hot, 0.7 * blink);
      r.tag.userData.sync(); const tk = pop(lt, 3.5 + 0.1 * i, 0.3); r.tag.visible = lt >= 3.5 + 0.1 * i - 0.02; r.tag.scale.setScalar(tk);
    });
  }
  return { g, L, act, item: pie };
}

// ---------------------------------------------------------------- part 7: 財報 — three statements + the expectation balance
// three paper cards (income statement waterfall / balance sheet two equal blocks / cash-flow: silver in, ochre capex out, the silver left = free cash flow),
// above them a balance: "預期" (dashed lilac-grey block) on the left pan, "實際" (solid, a bit bigger) on the right pan → tips toward 實際
function buildP7(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 701);
  const CW = 0.19, CH = 0.215, LEAN = 0.34, CZ = 0.075, CXS = [-0.208, 0, 0.208], INK = COL.ink, TK = 0.0215;   // TK: label cap height — ≥ 28 px when pushed in
  const heads = ['損益表', '資產負債表', '現金流量表'].map(s => dual([s], { ch: TK, bg: '#efe6d2', ink: INK, padX: 0.4, padY: 0.2, radius: 0.3 }));
  const cards = CXS.map((cx, i) => {
    const grp = new THREE.Group(); grp.position.set(cx, BH, CZ); g.add(grp);
    grp.add(mesh(rbox(CW * 0.9, 0.012, 0.06, 0.004, 710 + i), M('#c98f5c'), 0, 0.006, 0));
    const pg = new THREE.Group(); pg.position.set(0, 0.012, 0.022); pg.rotation.x = -LEAN; grp.add(pg);
    pg.add(mesh(rbox(CW, CH, 0.008, 0.004, 715 + i, 0.0004), M('#fffaf0'), 0, CH / 2, -0.004));
    const f = face(heads[i], { emissive: 0.18 }); f.position.set(0, CH - heads[i].h / 2 - 0.01, 0.0012); pg.add(f);
    const cg = new THREE.Group(); pg.add(cg);
    return { grp, pg, cg, head: f };
  });
  const FZ = 0.0075;                                            // content stands this far off the paper
  const U = 0.12, WY0 = 0.02;
  // card 1: waterfall — revenue (blue) → costs (grey) → what is left (gold)
  const WX = [-0.06, -0.02, 0.02, 0.06];
  const WF = [{ lo: 0, hi: 1, c: COL.rev, a: 0.3 }, { lo: 0.62, hi: 1, c: COL.cost, a: 0.5 }, { lo: 0.3, hi: 0.62, c: COL.cost, a: 0.7 }, { lo: 0, hi: 0.3, c: COL.eps, a: 0.95 }];
  WF.forEach((s, i) => { const h = (s.hi - s.lo) * U; s.h = h; s.y = WY0 + s.lo * U + h / 2; s.m = mesh(rbox(0.031, h, 0.009, 0.004, 720 + i, 0.0003), M(s.c, { rough: i === 3 ? 0.55 : 0.8 }), WX[i], s.y, FZ); cards[0].cg.add(s.m); });
  // card 2: balance sheet — a left block (assets) = a right block of two pieces (liabilities + equity); the labels sit on the blocks
  const BSc = ['#C9B48C', '#A8946B', '#DCCDAB'], BY = 0.035, BWd = 0.068;
  const bsL = mesh(rbox(BWd, 0.105, 0.009, 0.005, 730, 0.0003), M(BSc[0]), -0.042, BY + 0.0525, FZ);
  const bsR1 = mesh(rbox(BWd, 0.045, 0.009, 0.005, 731, 0.0003), M(BSc[1]), 0.042, BY + 0.0225, FZ);
  const bsR2 = mesh(rbox(BWd, 0.06, 0.009, 0.005, 732, 0.0003), M(BSc[2]), 0.042, BY + 0.045 + 0.03 + 0.002, FZ);
  const eq1 = mesh(rbox(0.02, 0.006, 0.008, 0.002, 733, 0.0002), M(INK), 0, BY + 0.066, FZ), eq2 = mesh(rbox(0.02, 0.006, 0.008, 0.002, 734, 0.0002), M(INK), 0, BY + 0.04, FZ);
  [bsL, bsR1, bsR2, eq1, eq2].forEach(m => cards[1].cg.add(m));
  const bFaces = [];
  const onBlock = (m, s) => { const t = dual([s], { ch: TK, bg: null, ink: INK, padX: 0.25, padY: 0.15 }); const f = face(t, { emissive: 0.2, transparent: true }); f.position.set(0, 0, 0.0049); m.add(f); bFaces.push(f); return f; };
  onBlock(bsL, '資產'); onBlock(bsR1, '負債'); onBlock(bsR2, '權益');   // face children follow their block (they appear / settle with it)
  // card 3: cash flow — silver in (thick), ochre capex leaves downward, the silver that stays on = free cash flow
  const dark = '#454b57', CY = 0.14;
  const cfG1 = mesh(rbox(0.076, 0.044, 0.004, 0.003, 740, 0.0002), M(dark), -0.047, CY, 0.0035), cfG2 = mesh(rbox(0.118, 0.026, 0.004, 0.003, 741, 0.0002), M(dark), 0.027, CY + 0.0075, 0.0035);
  cards[2].cg.add(cfG1, cfG2);
  const cfIn = mesh(rbox(1, 0.03, 0.009, 0.004, 742, 0.0003), M(COL.cash, { rough: 0.4 }), 0, CY, FZ);
  const cfOut = mesh(rbox(0.018, 1, 0.009, 0.004, 743, 0.0003), M(COL.capex), -0.05, CY - 0.015, FZ);
  const cfFac = mesh(rbox(0.05, 0.028, 0.009, 0.005, 744, 0.0003), M(COL.capex), -0.05, 0.062, FZ);
  const cfFcf = mesh(rbox(1, 0.015, 0.009, 0.004, 745, 0.0003), M(COL.cash, { rough: 0.4 }), 0, CY + 0.0075, FZ);
  cards[2].cg.add(cfIn, cfOut, cfFac, cfFcf);
  const lbl = (s, bg, ink, x, y) => { const t = dual([s], { ch: TK, bg, ink, padX: 0.4, padY: 0.2 }); const f = face(t, { emissive: 0.2 }); f.position.set(x, y, 0.0012); return f; };
  const lCapex = lbl('資本支出', COL.capex, '#ffffff', -0.04, 0.024), lFcf = lbl('自由現金流', COL.cash, INK, 0.03, 0.093);
  cards[2].cg.add(lCapex, lFcf);
  // the balance above the cards
  const SZ = -0.15, PYV = BH + 0.345, BL2 = 0.2, HANG = 0.15;
  g.add(mesh(rbox(0.14, 0.02, 0.1, 0.008, 750), M('#a96d42'), 0, BH + 0.01, SZ));
  g.add(mesh(cyl(0.011, 0.014, PYV - BH, 12, 751), M('#c98f5c'), 0, (PYV + BH) / 2, SZ));
  const beam = mesh(rbox(BL2 * 2 + 0.03, 0.013, 0.016, 0.005, 752), M('#8a5a36'), 0, 0, 0); beam.position.set(0, PYV, SZ); g.add(beam);
  g.add(mesh(sph(0.017, 753), M('#8a5a36'), 0, PYV, SZ + 0.004));
  const panM = M('#c98f5c'), strM = M('#5a4b3a');
  const panL = new THREE.Group(), panR = new THREE.Group(); g.add(panL, panR);
  [panL, panR].forEach((p, i) => p.add(mesh(cyl(0.085, 0.08, 0.012, 24, 754 + i), panM)));
  const strs = [0, 1, 2, 3].map(() => { const r = rod(0.0015, strM); g.add(r); return r; });
  const lab1 = sign(dual(['預期'], { ch: 0.028, bg: '#f1eef9', ink: '#5a4f93', padX: 0.35, padY: 0.2 }), { board: null, tilt: 0.7 });
  const lab2 = sign(dual(['實際'], { ch: 0.028, bg: COL.expect, ink: '#241e45', padX: 0.35, padY: 0.2 }), { board: null, tilt: 0.7 });
  lab1.position.set(0, 0.022, 0.075); panL.add(lab1); lab2.position.set(0, 0.022, 0.075); panR.add(lab2);   // up a little so the front card does not cut them
  // expected = dashed outline block; actual = solid block, a bit bigger
  const SE = 0.062, SA = 0.08, expect = new THREE.Group(), actual = mesh(rbox(SA, SA, SA, 0.01, 756, 0.0008), M(COL.expect, { rough: 0.6 })); g.add(expect, actual);
  const dm = M(COL.expect, { rough: 0.6 }), tdash = 0.0065;
  for (const ax of [0, 1, 2]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (const dd of [-0.22, 0.22]) {
    const dims = [tdash, tdash, tdash]; dims[ax] = SE * 0.3;
    const p = [0, 0, 0]; p[ax] = dd * SE; p[(ax + 1) % 3] = sa * SE / 2; p[(ax + 2) % 3] = sb * SE / 2;
    const d = mesh(rbox(dims[0], dims[1], dims[2], 0.002, 760, 0.0001), dm, p[0], p[1], p[2]); d.castShadow = false; expect.add(d);
  }
  const L = L_PART[7];
  function act(lt) {
    // cards come up one after another, their content plays
    cards.forEach((c, i) => { const a = [0.15, 1.3, 2.3][i]; const k = ease.out(prog(lt, a, a + 0.3)); c.grp.scale.setScalar(1); c.pg.scale.y = 1 + 0.045 * bump(lt, a, a + 0.5); c.head.userData.setTex(heads[i]); });
    WF.forEach(s => { const k = pop(lt, s.a, 0.25), dr = 0.035 * (1 - ease.out(prog(lt, s.a, s.a + 0.25))); s.m.visible = lt >= s.a - 0.02; s.m.scale.setScalar(k); s.m.position.y = s.y + dr; });
    { const b = bump(lt, 1.1, 1.55); WF[3].m.material.color.set(COL.eps).lerp(new THREE.Color('#FFE08A'), 0.7 * b); WF[3].m.scale.setScalar(pop(lt, WF[3].a, 0.25) * (1 + 0.12 * b)); }
    bFaces.forEach(f => f.userData.setTex(f.userData.tt));
    const s1 = (a, dx) => { const e = 1 - ease.out(prog(lt, a, a + 0.35)); return dx * e; };
    bsL.visible = lt >= 1.45; bsL.position.x = -0.042 + s1(1.5, -0.07);
    bsR1.visible = lt >= 1.65; bsR1.position.x = 0.042 + s1(1.7, 0.07);
    bsR2.visible = lt >= 1.85; bsR2.position.y = BY + 0.045 + 0.03 + 0.002 + 0.05 * (1 - ease.out(prog(lt, 1.9, 2.15))); bsR2.scale.setScalar(Math.max(0.001, pop(lt, 1.9, 0.25)));
    { const k = pop(lt, 2.1, 0.25); eq1.visible = eq2.visible = lt >= 2.08; eq1.scale.setScalar(k); eq2.scale.setScalar(k); }
        // cash flow
    const vis = (f, on) => { f.scale.setScalar(on ? 1 : 0.001); f.userData.setTex(f.userData.tt); };   // (face visibility is owned by the part-away rule, so hide by scale)
    const kin = ease.out(prog(lt, 2.45, 2.85)), kout = ease.inOut(prog(lt, 2.9, 3.25)), kf = ease.out(prog(lt, 3.2, 3.55));
    cfG1.visible = lt >= 2.4; cfG2.visible = lt >= 3.15; cfG1.scale.setScalar(Math.max(0.001, pop(lt, 2.4, 0.25))); cfG2.scale.set(Math.max(0.001, pop(lt, 3.15, 0.2)), 1, 1);
    const w1 = Math.max(1e-4, 0.065 * kin); cfIn.visible = kin > 0.001; cfIn.scale.set(w1, 1, 1); cfIn.position.x = -0.085 + w1 / 2;
    const hh = Math.max(1e-4, 0.052 * kout); cfOut.visible = kout > 0.001; cfOut.scale.y = hh; cfOut.position.set(-0.05, CY - 0.015 - hh / 2, FZ);
    cfFac.visible = kout > 0.9; cfFac.scale.setScalar(Math.max(0.001, pop(lt, 3.1, 0.25)));
    const fw = Math.max(1e-4, 0.105 * kf), fb = bump(lt, 3.65, 4.1); cfFcf.visible = kf > 0.001; cfFcf.scale.set(fw, 1 + 0.5 * fb, 1); cfFcf.position.set(-0.02 + fw / 2, CY + 0.0075, FZ);
    cfFcf.material.color.set(COL.cash).lerp(new THREE.Color('#ffffff'), 0.6 * fb);
    vis(lCapex, kout > 0.9); vis(lFcf, kf > 0.9);
    // the balance: expected (dashed) lands on the left pan, actual (solid, bigger) on the right → tips toward 實際
    const ka = pop(lt, 3.5, 0.3), drop = ease.in(prog(lt, 3.85, 4.1));
    const ang = -0.17 * ease.outBack(prog(lt, 4.05, 4.6));
    beam.rotation.z = ang;
    const eL = V(-BL2 * Math.cos(ang), -BL2 * Math.sin(ang), 0), eR = V(BL2 * Math.cos(ang), BL2 * Math.sin(ang), 0);
    const cL = V(eL.x, PYV + eL.y - HANG, SZ), cR = V(eR.x, PYV + eR.y - HANG, SZ);
    panL.position.copy(cL); panR.position.copy(cR);
    [[0, eL, cL, -1], [1, eL, cL, 1], [2, eR, cR, -1], [3, eR, cR, 1]].forEach(([i, e, c, sx]) => strs[i].userData.set(V(e.x, PYV + e.y, SZ), V(c.x + sx * 0.065, c.y + 0.007, SZ)));
    lab1.userData.sync(); lab2.userData.sync();
    expect.visible = lt >= 3.48; expect.position.set(cL.x, cL.y + 0.006 + SE / 2, cL.z); expect.scale.setScalar(Math.max(0.001, ka));
    actual.visible = lt >= 3.83; actual.position.set(cR.x, cR.y + 0.006 + SA / 2 + 0.14 * (1 - drop), cR.z); actual.scale.setScalar(Math.max(0.001, Math.min(1, prog(lt, 3.83, 3.98) + 0.001)));
  }
  return { g, L, act, item: beam };
}
const BUILD = [null, buildP1, buildP2, buildP3, buildP4, buildP5, buildP6, buildP7];

// ---------------------------------------------------------------- name plates & question sign (coursemap4 look)
const PL = {
  alive: { bg: '#fffaf0', ink: '#4a3a2c', border: '#e2c6a2', badge: '#c98f5c', badgeInk: '#fff' },
  cur: { bg: '#f8d867', ink: '#3b2a20', border: '#d79a2b', badge: '#3b2a20', badgeInk: '#f8d867' },
  gray: { bg: '#e6e1d8', ink: '#8a8174', border: '#cfc8bc', badge: '#b2aa9e', badgeInk: '#fff' },
};
function plateCanvas(n, name0, st, tight = false) {
  const name = tight ? name0.replace(' × ', '×') : name0;   // 7-part table: no room for the spaces around ×
  const h = 160, mc = document.createElement('canvas').getContext('2d'), fs = 104, tx = tight ? 142 : 150;   // tight: the 7-part table has less room per name
  const cw = Math.ceil(tx + measure(mc, name, fs) + (tight ? 36 : 52));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = st.bg; c.beginPath(); c.roundRect(5, 5, cw - 10, h - 10, 40); c.fill(); c.lineWidth = 7; c.strokeStyle = st.border; c.stroke();
  c.fillStyle = st.badge; c.beginPath(); c.arc(76, h / 2, 54, 0, 7); c.fill();
  c.fillStyle = st.badgeInk; c.font = `700 76px "${ZH}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 76, h / 2 + 4);
  drawText(c, name, tx, h / 2 + fs * 0.36, fs, st.ink, 'left');
  return cv;
}
function makePlate(n, name, h = PLATE_H, tight = false) {
  const tex = {}; for (const k of Object.keys(PL)) tex[k] = canvasTexture(plateCanvas(n, name, PL[k], tight));
  const cv = tex.alive.image, w = h * cv.width / cv.height;
  const g = new THREE.Group(), board = new THREE.Group(); g.add(board);
  board.add(mesh(rbox(w + 0.008, h + 0.008, 0.012, 0.008, 950 + n, 0.0003), M('#d9b48a')));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex.alive, roughness: 0.85, emissive: '#ffffff', emissiveMap: tex.alive, emissiveIntensity: 0.18 }));
  f.position.z = 0.0068; board.add(f);
  board.position.y = h / 2 + 0.012; board.rotation.x = -0.42;
  g.userData.setStyle = (k) => { const t = tex[k]; if (f.material.map !== t) { f.material.map = t; f.material.emissiveMap = t; f.material.needsUpdate = true; } };
  g.userData.w = w; g.userData.h = h; g.userData.faceMesh = f;
  return g;
}
const SIGN_W = 0.6;
function questionSign(text, tagText) {
  const lines = String(text).split('\n');
  const w = 1400, lh = lines.length > 1 ? 140 : 190, h = 100 + 80 + lh * lines.length, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#f8d867'; c.beginPath(); c.roundRect(8, 92, w - 16, h - 100, 70); c.fill(); c.lineWidth = 14; c.strokeStyle = '#ffffff'; c.stroke();
  const tw = measure(c, tagText, 64) + 80;
  c.fillStyle = '#3b2a20'; c.beginPath(); c.roundRect(60, 14, tw, 96, 40); c.fill();
  drawText(c, tagText, 100, 64 + 22, 64, '#f8d867', 'left');
  let size = lines.length > 1 ? 120 : 150;
  for (const l of lines) while (measure(c, l, size) > w - 120 && size > 60) size -= 4;
  lines.forEach((l, i) => drawText(c, l, w / 2, 92 + 40 + lh * (i + 0.5) + size * 0.36, size, '#3b2a20'));
  const g = new THREE.Group(), H = SIGN_W * h / w;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W, H), new THREE.MeshBasicMaterial({ map: canvasTexture(cv), transparent: true, toneMapped: false, depthTest: false }));
  m.renderOrder = 10; m.position.y = H / 2; g.add(m);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.04, 3), new THREE.MeshBasicMaterial({ color: '#f8d867', toneMapped: false, depthTest: false })); tip.renderOrder = 10; g.add(tip);
  g.userData.H = H; g.userData.faceMesh = m;
  /** side = -1: the part is to the left of the card (tip on the card's left edge); +1: to the right */
  g.userData.setSide = (side) => { tip.rotation.z = side < 0 ? Math.PI / 2 : -Math.PI / 2; tip.position.set(side * (SIGN_W / 2 + 0.012), H * 0.42, 0); };
  return g;
}

// ---------------------------------------------------------------- camera fit (whole points set inside the frame, bottom 140 px kept free)
function fitCam(pts, { elev = 0.5, yaw = 0, fov = 30, xm = 0.9, yTop = 0.86, yBot = -0.68 } = {}) {
  const dir = V(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
  const fwd = dir.clone().negate(), right = fwd.clone().cross(V(0, 1, 0)).normalize(), up = right.clone().cross(fwd).normalize();
  const tv = Math.tan(fov / 2 * DEG), th = tv * ASPECT;
  const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(V(0, 0, 0));
  let D = box.getSize(V(0, 0, 0)).length() * 1.4 + 0.3, sx = 0, sy = 0, pos = null;
  for (let it = 0; it < 60; it++) {
    pos = c.clone().addScaledVector(dir, D).addScaledVector(right, sx).addScaledVector(up, sy);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ds = 0;
    for (const p of pts) { const r = p.clone().sub(pos), d = r.dot(fwd), x = r.dot(right) / (d * th), y = r.dot(up) / (d * tv); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); ds += d; }
    const dm = ds / pts.length;
    sx += (x0 + x1) / 2 * dm * th * 0.8; sy += ((y0 + y1) / 2 - (yTop + yBot) / 2) * dm * tv * 0.8;
    const k = Math.max((x1 - x0) / (2 * xm), (y1 - y0) / (yTop - yBot));
    D *= 1 + (k - 1) * 0.6;
  }
  return { pos, look: c.clone().addScaledVector(right, sx).addScaledVector(up, sy), fov };
}

// ---------------------------------------------------------------- main
/**
 * @param o.lesson    this lesson, 1..7 (required)
 * @param o.count     parts on the table: 5 (default for lessons 1–5: the original table) | 6 | 7 (default for lessons 6–7: the extended table). Never fewer than the lesson number.
 * @param o.t0        when the map sequence starts (s)
 * @param o.shot      'ride' (opening, default) | 'finale' (pull back from this lesson's part to the whole table)
 *                    | 'overview' (still wide shot) | 'chain' (course closing: all parts stand on one strip, a share block runs 1 → last)
 *                    'overview' with allLit on the last lesson of the table (lesson === count) = 'chain'
 * @param o.question  question card text over this lesson's part ('\n' for two lines)
 * @param o.times     absolute seconds; see COURSEMAP-STOCK.md
 * @param o.stops     ride: parts lit in the wide shot before the push (default lesson 1: [1..5] = first look; else [1..lesson−1], the learned parts)
 * @param o.review    'wide' (default) | 'push' (the camera goes to each stop) | 'group' (all learned parts lit and playing together, one window)
 * @param o.camFrom   {pos, look, fov} world: blend from your camera, starting at t0 (o.camBlend s, default 1.2)
 * @param o.place     { x, y, z, rotY, scale } where the table stands (default: in front of the blackboard, between teacher and student)
 * @param o.parts     per-part name overrides {n: {name}}
 */
export async function makeCourseMapStock(o = {}) {
  const lesson = clamp(Math.round(o.lesson || 1), 1, NP_MAX);
  const NP = clamp(Math.round(o.count || (lesson <= 5 ? 5 : NP_MAX)), Math.max(5, lesson), NP_MAX);   // parts on the table (lessons 1–5 keep the original 5-part table)
  const LY = layout(NP), SLOT_X = LY.slotX, BOARD_W = LY.boardW;
  const t0 = o.t0 ?? 0;
  let shot = o.shot || 'ride';
  if (shot === 'overview' && (o.allLit ?? false) && lesson === NP) shot = 'chain';
  const chain = shot === 'chain';
  const place = Object.assign({ x: 0.22, y: 0, z: -0.8, rotY: 0, scale: NP > 5 ? 0.56 : 0.62 }, o.place || {});
  const question = o.question || '';
  const names = [null, ...[1, 2, 3, 4, 5, 6, 7].map(n => o.parts?.[n]?.name || PARTS_STOCK[n].name)];
  // fonts
  for (const href of ['/node_modules/@fontsource/chiron-goround-tc/700.css', '/node_modules/@fontsource/inter/800.css']) {
    if (![...document.styleSheets].some(s => (s.href || '').includes(href.split('/')[3]) && (s.href || '').includes(href.split('/').pop()))) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; });
    }
  }
  const allText = names.join('') + question + JSON.stringify(o.parts || {}) + '第課·獲利倍數看懂報價誰在買賣開戶下單十年計畫股價本益比開高低收外資投信自營商其他賣方買方股證券戶交割戶下單買張年×業務財報營收預期實際損益表資產負債現金流量自由資本支出＋';
  await document.fonts.load(`700 120px "${ZH}"`, allText);
  await document.fonts.load(`800 120px "${EN}"`, 'EPST+0123456789.×HPC');
  await document.fonts.ready;

  const root = new THREE.Group(); root.position.set(place.x, place.y, place.z); root.rotation.y = place.rotY; root.scale.setScalar(place.scale);
  const withTable = o.table !== false;
  const land = new THREE.Group(); land.position.y = withTable ? G : 0.04; root.add(land);
  if (withTable) {
    const top = M('#c88a56'), legM = M('#a96d42');
    const FW = BOARD_W + 0.14, FD = BOARD_D + 0.14, FB = 0.16;
    for (const sz of [-1, 1]) root.add(mesh(lumpy(new RoundedBoxGeometry(FW, 0.07, FB, 3, 0.03), 0.003, 3, 101 + sz), top, 0, TABLE_H - 0.035, sz * (FD / 2 - FB / 2)));
    for (const sx of [-1, 1]) root.add(mesh(lumpy(new RoundedBoxGeometry(FB, 0.07, FD - 2 * FB + 0.04, 3, 0.03), 0.003, 3, 104 + sx), top, sx * (FW / 2 - FB / 2), TABLE_H - 0.035, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(mesh(cyl(0.05, 0.065, TABLE_H - 0.06, 14, 107 + sx + sz * 3), legM, sx * (BOARD_W / 2 - 0.1), (TABLE_H - 0.06) / 2, sz * (BOARD_D / 2 - 0.1)));
    const sh = C.contactShadow(BOARD_W * 1.3, BOARD_D * 1.6, 0.4); sh.position.y = 0.004; root.add(sh);
  }
  { const b = mesh(lumpy(new RoundedBoxGeometry(BOARD_W, 0.075, BOARD_D, 6, 0.03), 0.003, 4, 112), M('#d8c39f'), 0, -0.0375, 0); b.receiveShadow = true; land.add(b); }

  // ---- the parts (5, or 7 on the extended table)
  const parts = [null];
  for (let n = 1; n <= NP; n++) {
    const holder = new THREE.Group(); land.add(holder);
    FACES = []; const b = BUILD[n](o.parts?.[n] || {}); holder.add(b.g); b.faces = FACES; FACES = null;
    const dimU = { value: 0 };
    b.g.traverse(m => { if (m.isMesh && m.material && m.material.depthWrite !== false) dimPatch(m.material, dimU); });
    const plate = makePlate(n, names[n], LY.plateH, LY.tight); plate.position.set(LY.plateDx[n] || 0, 0, BASE_D / 2 + 0.06); holder.add(plate);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(BASE_W + 0.07, BASE_D + 0.07), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; glow.renderOrder = 1; holder.add(glow);
    const sh = C.contactShadow(BASE_W * 1.25, BASE_D * 1.3, 0.3); sh.position.y = 0.0015; holder.add(sh);
    holder.position.set(SLOT_X[n], 0, PART_Z);
    holder.updateMatrixWorld(true);
    b.act(L_PART[n]);                         // measure the finished pose (tallest)
    const box = new THREE.Box3(); b.g.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert(); const tmp = new THREE.Box3();
    b.g.traverse(m => { if (m.isMesh && m.geometry && m.visible) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv); box.union(tmp); } });
    parts.push({ ...b, n, holder, plate, glow, dimU, box });
  }
  // ---- chain: a long strip under all parts, arrows between, a share block that runs 1 → last
  const LANE_Z = PART_Z + BASE_D / 2 + 0.2;          // runner lane in front of the name plates
  const strip = mesh(rbox(NP * LY.sp + 0.06, STRIP_H, BASE_D + 0.3, 0.012, 610, 0.0015), M('#b98256'), 0, -STRIP_H / 2, PART_Z + 0.125); strip.receiveShadow = true; land.add(strip);
  const arrowM = M('#8a5a36');
  const arrows = Array.from({ length: NP - 1 }, (_, k) => k + 1).map(i => {
    const sh = new THREE.Shape(); sh.moveTo(-0.07, -0.016); sh.lineTo(0.01, -0.016); sh.lineTo(0.01, -0.036); sh.lineTo(0.07, 0); sh.lineTo(0.01, 0.036); sh.lineTo(0.01, 0.016); sh.lineTo(-0.07, 0.016); sh.closePath();
    const a = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }), arrowM); a.rotation.x = -Math.PI / 2;
    const gA = new THREE.Group(); gA.add(a); gA.position.set((SLOT_X[i] + SLOT_X[i + 1]) / 2, STRIP_H + 0.001, LANE_Z); land.add(gA); return gA;
  });
  const runner = shareBlock(0.05, 77); land.add(runner);
  const runGlow = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshBasicMaterial({ color: '#ffe17a', transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
  runGlow.rotation.x = -Math.PI / 2; runGlow.renderOrder = 2; land.add(runGlow);

  // ---- question sign
  const cur = parts[lesson];
  const qs = question && (shot === 'ride') ? questionSign(question, `第 ${lesson} 課 · ${names[lesson]}`) : null; if (qs) land.add(qs);
  // the card stands beside this lesson's part (over the dimmed neighbour), on the side with more table; the tip points at the part
  const qSide = lesson >= 4 ? -1 : 1;                 // lessons 4–7: the card goes to the left of the part (over the dimmed neighbour), 1–3: to the right
  if (qs) qs.userData.setSide(-qSide);
  const signPos = () => V(SLOT_X[lesson] + qSide * (BASE_W / 2 + SIGN_W / 2 + 0.03), Math.max(0.06, cur.box.max.y * 0.5 - qs.userData.H * 0.4), PART_Z + 0.06);

  // ---- timing
  const tm = { start: t0 };
  const T = o.times || {};
  const blendIn = o.camFrom ? (o.camBlend ?? 1.2) : 0;
  const PUSH = 1.1;
  const L = (n) => L_PART[n];
  const review = o.review || 'wide';
  let stops = [], plays = [];                  // plays: { n, a (start), b (window end), rate }
  if (shot === 'ride') {
    stops = (o.stops ? o.stops.slice() : lesson === 1 ? Array.from({ length: NP }, (_, i) => i + 1) : Array.from({ length: lesson - 1 }, (_, i) => i + 1));
    const group = review === 'group' && stops.length > 1;
    const ovStart = T.overview ?? t0;
    const ovHold = Math.max(lesson === 1 ? 2.6 : 1.6, blendIn + 0.8);
    const per = lesson === 1 ? 3.8 : 2.7, maxRate = lesson === 1 ? 1.8 : 2.0;
    const slots = group ? 1 : stops.length;
    const given = T.parts || T.stops;
    let arrive = T.arrive;
    let starts;
    if (given) starts = given.slice(0, slots);
    else {
      const s0 = Math.max(ovStart, t0) + ovHold, perS = group ? 3.6 : per;
      if (arrive != null && slots) { const span = Math.max(0.1, arrive - PUSH - s0); starts = Array.from({ length: slots }, (_, i) => s0 + span * i / slots); }
      else starts = Array.from({ length: slots }, (_, i) => s0 + perS * i);
    }
    const lastLen = group ? 3.6 : per;
    const lastEnd = slots ? starts[slots - 1] + (given ? Math.max(2.6, lastLen * 0.85) : lastLen) : t0 + Math.max(1.6, blendIn + 0.8);
    if (arrive == null) arrive = lastEnd + PUSH;
    const pushStart = T.push ?? arrive - PUSH;
    if (group) {
      const a = starts[0], b = Math.max(pushStart, a + 1.0);
      for (const n of stops) plays.push({ n, a, b, rate: clamp(L(n) / Math.max(0.6, b - a - 0.5), 1, maxRate) });
    } else stops.forEach((n, i) => {
      const a = starts[i], b = i + 1 < stops.length ? starts[i + 1] : Math.max(pushStart, a + 1.0);
      plays.push({ n, a, b, rate: clamp(L(n) / Math.max(0.6, b - a - 0.5), 1, maxRate) });
    });
    const colorIn = T.colorIn ?? T.play ?? (lesson === 1 ? pushStart + 0.15 : arrive - 0.6);
    plays.push({ n: lesson, a: colorIn, b: 1e9, rate: T.rate ?? 1, current: true });
    tm.overview = ovStart; tm.stops = plays.filter(p => !p.current).map(p => ({ n: p.n, t: p.a, end: p.b, rate: +p.rate.toFixed(2) }));
    tm.push = pushStart; tm.arrive = arrive; tm.colorIn = colorIn;
    tm.ask = T.ask ?? arrive;
    // the question card stays up at least its reading time (04-skeleton §5b: CJK ÷ 4.5 + other ÷ 15 + 1.5 s), tag included
    tm.readQ = qs ? +readNeed(`第 ${lesson} 課 · ${names[lesson]} ` + question.replace(/\n/g, '')).toFixed(2) : 0;
    tm.end = T.end ?? Math.max(tm.ask + Math.max(2.8, tm.readQ + 0.4), colorIn + L(lesson) / (T.rate ?? 1) + 0.4);
  } else if (chain) {
    const join = T.join ?? t0 + 0.5 + blendIn * 0.5, joinEnd = join + 1.4;
    let flow = T.flow;
    if (!flow) {
      const a = joinEnd + 0.6;
      const per = T.end != null ? clamp((T.end - 3.0 - a) / NP, NP > 5 ? 3.5 : 2.4, 4.5) : 4.0;
      flow = Array.from({ length: NP }, (_, i) => a + per * i);
      tm.per = +per.toFixed(2);
    }
    flow = flow.slice(0, NP);
    const lastPer = flow.length > 1 ? (flow[NP - 1] - flow[0]) / (NP - 1) : 3.4;
    plays = flow.map((a, i) => { const b = i + 1 < NP ? flow[i + 1] : a + Math.max(2.4, lastPer); return { n: i + 1, a, b, rate: clamp(L(i + 1) / Math.max(0.6, b - a - 0.5), 1, 2.0) }; });
    const lp = plays[NP - 1];
    tm.allOn = Math.min(lp.b, lp.a + L(NP) / lp.rate + 0.2);
    tm.join = [join, joinEnd]; tm.flow = flow;
    tm.end = T.end ?? (tm.allOn + 3.4);
  } else {
    tm.end = T.end ?? t0 + 4.0;
  }
  tm.lit = plays.map(p => ({ n: p.n, t: p.a }));
  const learned = (n) => shot === 'overview' ? (o.allLit || n <= lesson) : shot === 'finale' ? n <= lesson : chain ? true : n < lesson;

  // ---- cameras (land-local, returned in world space)
  const W = (v) => land.localToWorld(v.clone());
  const L2W = (c) => ({ pos: W(c.pos), look: W(c.look), fov: c.fov });
  const corners = (b, dx = 0) => { const r = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) r.push(V(x + dx, y, z)); return r; };
  const platePts = (n, x0) => { const x = x0 + (LY.plateDx[n] || 0), p = parts[n].plate, w = p.userData.w / 2, h = p.userData.h; const z = PART_Z + BASE_D / 2 + 0.06; return [V(x - w, 0, z + 0.02), V(x + w, 0, z + 0.02), V(x - w, h * 0.95, z - h * 0.35), V(x + w, h * 0.95, z - h * 0.35)]; };
  const partPts = (n, x) => corners(parts[n].box, x).map(p => p.add(V(0, 0, PART_Z)));
  const boardPts = [V(-BOARD_W / 2, 0, -BOARD_D / 2), V(BOARD_W / 2, 0, -BOARD_D / 2), V(-BOARD_W / 2, 0, BOARD_D / 2), V(BOARD_W / 2, 0, BOARD_D / 2)];
  const cache = {};
  const allN = (lift = 0) => Array.from({ length: NP }, (_, i) => i + 1).flatMap(n => [...partPts(n, SLOT_X[n]), ...platePts(n, SLOT_X[n])].map(p => p.add(V(0, lift, 0))));
  const cams = {
    overview: () => cache.ov || (cache.ov = L2W(fitCam([...allN(), ...boardPts], { elev: 0.6, fov: 30, xm: 0.96, yTop: 0.9 }))),
    chain: () => cache.ch || (cache.ch = L2W(fitCam([...allN(STRIP_H), V(SLOT_X[1] - 0.3, STRIP_H, LANE_Z + 0.06), V(SLOT_X[NP] + 0.3, STRIP_H, LANE_Z + 0.06)], { elev: 0.58, fov: 30, xm: 0.95, yTop: 0.88 }))),
    part: (n = lesson) => cache['p' + n] || (cache['p' + n] = L2W(fitCam([...partPts(n, SLOT_X[n]),
      ...(n === lesson && qs ? (() => { const s = signPos(); return [s.clone().add(V(-SIGN_W / 2, qs.userData.H * 1.02, 0)), s.clone().add(V(SIGN_W / 2, qs.userData.H * 1.02, 0)), s.clone().add(V(-SIGN_W / 2, 0, 0)), s.clone().add(V(SIGN_W / 2, 0, 0))]; })() : platePts(n, SLOT_X[n]))],
    { elev: 0.5, fov: 30, xm: 0.92, yBot: -0.62 }))),
  };
  const mixC = (a, b, e) => ({ pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), fov: lerp(a.fov, b.fov, e) });
  function cam(t) {
    root.updateMatrixWorld(true);
    let c;
    if (shot === 'ride') {
      const ks = [[t0, cams.overview()]];
      if (review === 'push') for (const p of plays) { if (p.current) continue; ks.push([p.a - 0.5, ks[ks.length - 1][1]]); ks.push([p.a + 0.3, cams.part(p.n)]); }
      ks.push([tm.push, ks[ks.length - 1][1]]);
      ks.push([tm.arrive, cams.part(lesson)]);
      c = ks[0][1];
      for (let i = 1; i < ks.length; i++) { if (t <= ks[i][0]) { c = mixC(ks[i - 1][1], ks[i][1], ease.inOut(prog(t, ks[i - 1][0], ks[i][0]))); break; } c = ks[i][1]; }
      const hold = ease.inOut(prog(t, tm.arrive + 0.1, Math.max(tm.arrive + 0.6, tm.end - 0.5)));
      if (hold > 0) { const d = c.pos.clone().sub(c.look); c = { ...c, pos: c.look.clone().add(d.multiplyScalar(1 - 0.03 * hold)) }; }
    } else if (shot === 'finale') {
      c = mixC(cams.part(lesson), cams.overview(), ease.inOut(prog(t, t0 + 0.4, tm.end - 0.4)));
    } else if (chain) {
      c = mixC(cams.overview(), cams.chain(), ease.inOut(prog(t, tm.join[0], tm.join[1])));
    } else c = cams.overview();
    if (o.camFrom && blendIn > 0) { const e = ease.inOut(prog(t, t0, t0 + blendIn)); c = mixC({ pos: o.camFrom.pos.clone(), look: o.camFrom.look.clone(), fov: o.camFrom.fov ?? 32 }, c, e); }
    return c;
  }
  function applyCam(camera, t) { const c = cam(t); camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.look); return c; }

  // ---- per-frame pose (pure in t)
  const camLocal = new THREE.Vector3(), tmp = new THREE.Vector3(), qInv = new THREE.Quaternion();
  // small text shows only when the camera is pushed in on that part: halfway between the wide and the push-in distance
  let _dd = null; const MIDP = Math.ceil(NP / 2);   // the middle part (3 of 5, 4 of 7): distance reference
  const detailD = () => _dd ?? (_dd = (() => { root.updateMatrixWorld(true); const c = parts[MIDP].holder.getWorldPosition(new THREE.Vector3()); return (cams.overview().pos.distanceTo(c) + cams.part(MIDP).pos.distanceTo(c)) / 2; })());
  const winK = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ease.inOut(clamp((t - a) / fi)), ease.inOut(clamp((b - t) / fo)));
  // the runner's x along the strip (chain)
  const runX = (t) => {
    const ks = [[tm.join[1], SLOT_X[1] - 0.26]];
    plays.forEach((p, i) => { const x = SLOT_X[p.n]; ks.push([p.a - (i ? 0.5 : 0.2), x - 0.2]); ks.push([p.a + 0.1, x - 0.12]); ks.push([p.b - 0.6, x + 0.18]); });
    ks.push([tm.allOn + 0.6, SLOT_X[NP] + 0.24]);
    return track(ks, t);
  };
  let lastT = t0;
  function update(t, camera = null) {
    lastT = t;
    root.updateMatrixWorld(true);
    // chain layout: the strip rises under the five, arrows pop between them
    const jk = chain ? ease.inOut(prog(t, tm.join[0], tm.join[1])) : 0;
    strip.visible = jk > 0.001; strip.position.y = -STRIP_H / 2 - 0.004 + (STRIP_H + 0.004) * jk;
    for (let n = 1; n <= NP; n++) parts[n].holder.position.set(SLOT_X[n], STRIP_H * jk, PART_Z);
    arrows.forEach((a, i) => { const k = chain ? ease.outBack(prog(t, tm.join[1] - 0.1 + i * 0.08, tm.join[1] + 0.3 + i * 0.08)) : 0; a.visible = k > 0.01; a.scale.setScalar(Math.max(0.001, k)); });
    // runner
    if (chain && t >= tm.join[1] - 0.05) {
      const x = runX(t), hop = Math.abs(Math.sin(t * 6.0)) * 0.02 * (t < tm.allOn + 0.6 ? 1 : 0);
      runner.visible = true; runner.position.set(x, STRIP_H + 0.012 + hop, LANE_Z); runner.scale.setScalar(1.3 * pop(t, tm.join[1] - 0.05, 0.3));
      runGlow.position.set(x, STRIP_H + 0.013, LANE_Z); runGlow.material.opacity = 0.7 * prog(t, tm.join[1], tm.join[1] + 0.3);
    } else { runner.visible = false; runGlow.material.opacity = 0; }
    // which part is in focus
    const focus = new Array(NP + 1).fill(0);
    for (const p of plays) focus[p.n] = Math.max(focus[p.n], winK(t, p.a - 0.15, p.b));
    const allK = chain ? ease.inOut(prog(t, tm.allOn, tm.allOn + 0.6)) : 0;
    for (let n = 1; n <= NP; n++) {
      const P = parts[n];
      let dim;
      if (chain) {
        const p = plays[n - 1];
        const before = t < tm.join[0] ? 0 : t < p.a - 0.15 ? 0.76 * ease.inOut(prog(t, tm.join[0], tm.join[1])) : 0;
        const after = t > p.b ? 0.3 * ease.inOut(prog(t, p.b, p.b + 0.4)) : 0;
        dim = lerp(Math.max(before, after) * (1 - focus[n]), 0, allK);
      } else {
        const others = Math.max(...Array.from({ length: NP }, (_, i) => i + 1).filter(m => m !== n).map(m => focus[m]));
        const rest = learned(n) ? 0 : 0.74;
        dim = lerp(lerp(rest, Math.max(rest, 0.72), others), 0, focus[n]);
        if (shot === 'ride' && n !== lesson) dim = Math.max(dim, 0.9 * ease.inOut(prog(t, tm.push, tm.arrive)));
      }
      P.dimU.value = dim;
      // local mechanism time
      let lt;
      const mine = plays.filter(p => p.n === n && t >= p.a - 1e-6);
      if (mine.length) { const p = mine[mine.length - 1]; lt = (t - p.a) * p.rate; }
      else lt = learned(n) ? 99 : 0;
      if (shot === 'overview' || shot === 'finale') { const per = L(n) + 2.2; lt = learned(n) ? ((t - t0 + n * 1.3) % per + per) % per : 0; if (shot === 'finale' && n !== lesson) lt = 99; }
      if (chain && t < plays[n - 1].a) lt = t < tm.join[0] ? 99 : 0;
      DETAIL = !!camera && camera.position.distanceTo(P.holder.getWorldPosition(tmp)) < detailD();
      P.act(clamp(lt, 0, L(n)));
      DETAIL = true;
      // pushed in on another part: this one's text is hidden (no half-cut labels at the frame edge)
      const away = shot === 'ride' && n !== lesson && t > tm.push + 0.55;
      for (const f of P.faces) f.visible = !away;
      const curK = chain ? (focus[n] > 0.5 && allK < 0.5) || allK > 0.5 : focus[n] > 0.5 || (shot === 'finale' && n === lesson);
      const pushedAway = shot === 'ride' && n !== lesson && t > tm.push + 0.3;
      P.plate.userData.setStyle(curK ? 'cur' : !pushedAway && (learned(n) || (shot === 'ride' && lesson === 1 && plays.some(p => p.n === n && t > p.b))) ? 'alive' : 'gray');
      P.glow.material.opacity = 0.75 * Math.max(focus[n], allK);
      P.plate.visible = !(shot === 'ride' && n !== lesson && t > tm.push + 0.55);
    }
    if (qs) {
      const qk = ease.outBack(prog(t, tm.ask - 0.05, tm.ask + 0.4));
      qs.visible = qk > 0.01; qs.position.copy(signPos()); qs.position.y += 0.006 * Math.sin(t * 2.2); qs.scale.setScalar(Math.max(0.001, qk));
      cur.plate.visible = !qs.visible;
    }
    if (camera) {
      land.worldToLocal(camLocal.copy(camera.position));
      for (let n = 1; n <= NP; n++) { const p = parts[n].plate; p.getWorldPosition(tmp); land.worldToLocal(tmp); p.rotation.y = Math.atan2(camLocal.x - tmp.x, camLocal.z - tmp.z); }
      if (qs) { land.getWorldQuaternion(qInv).invert(); qs.quaternion.copy(qInv).multiply(camera.quaternion); }   // full billboard: no perspective skew
      camera.updateMatrixWorld(true);
      for (let n = 1; n <= NP; n++) { const p = parts[n].plate; if (!p.visible) continue; const b = screenBox(p.userData.faceMesh, p.userData.w, p.userData.h, camera); p.visible = !!b && b.x0 >= 0 && b.y0 >= 0 && b.x1 <= window.innerWidth && b.y1 <= window.innerHeight; }
    }
  }
  update(t0);

  // ---- reading-time report (readcheck.cjs): name plates + question card, boxes in page pixels
  function screenBox(m, w, h, camera) {
    m.updateMatrixWorld(true);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const W2 = window.innerWidth, H2 = window.innerHeight;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = V(sx * w / 2, sy * h / 2, 0).applyMatrix4(m.matrixWorld).project(camera);
      if (p.z > 1) return null;
      const X = (p.x + 1) / 2 * W2, Y = (1 - p.y) / 2 * H2;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    return { x0, y0, x1, y1 };
  }
  /** [{id, text, x0, y0, x1, y1}] for window.TEXTS — call after update(t, cam) */
  function texts(camera) {
    if (!root.visible || !camera) return [];
    camera.updateMatrixWorld(true);
    const out = [];
    for (let n = 1; n <= NP; n++) {
      const p = parts[n].plate; if (!p.visible) continue;
      const b = screenBox(p.userData.faceMesh, p.userData.w, p.userData.h, camera); if (b) out.push({ id: 'map-plate-' + n, text: names[n], ...b });
    }
    if (qs && qs.visible && qs.scale.x > 0.9) { const b = screenBox(qs.userData.faceMesh, SIGN_W, qs.userData.H, camera); if (b) out.push({ id: 'map-question', text: `第 ${lesson} 課 · ${names[lesson]} ` + question.replace(/\n/g, ''), ...b }); }
    return out;
  }

  return {
    root, land, times: tm, stops, cams, cam, applyCam, update, texts, parts, duration: tm.end - t0,
    /** world position of part n's footprint centre (on the board) */
    partWorld: (n) => { root.updateMatrixWorld(true); return parts[n].holder.localToWorld(V(0, 0, 0)); },
    /** world position of part n's moving item (price tag / phone screen / share block / order card / curve tip) as last posed by update() */
    itemWorld: (n) => { root.updateMatrixWorld(true); return parts[n].item.localToWorld(V(0, 0.03, 0)); },
  };
}
export { makeCourseMapStock as makeCourseMap };
export default makeCourseMapStock;
