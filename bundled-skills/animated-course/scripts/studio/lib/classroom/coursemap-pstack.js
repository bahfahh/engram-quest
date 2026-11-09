// 課程地圖：pstack 拆解課（三課）。共用元件，API 形狀照 coursemap4.js。
// 桌上三個黏土零件，各是那一課核心機制的小模型、真的在動：
//   1 劇本軌道  ：一個入口（/poteto-mode）把工作單送上其中一條軌道（劇本），步驟一格一格亮，終點蓋綠色「證據」章
//   2 三道關    ：一份報告過三道關：貼標籤（量到／推論／猜）→ 另一家重跑（說法被丟、重跑出 FAIL 的留下）→ 錯誤變成擋板；放行到四條平行的線
//   3 兩條流水線：上游紫色 SDD（人拍板）→ decision table 的一列滑下去 → 下游藍色 pstack 的完成檢查，跑過亮綠
// 說明：/lib/classroom/COURSEMAP-PSTACK.md
//
//   import { makeCourseMapPstack } from '/lib/classroom/coursemap-pstack.js';
//   const map = await makeCourseMapPstack({ lesson: 2, t0: 28.9, question: '憑什麼敢放手讓它跑？' });
//   scene.add(map.root);
//   window.renderAt = t => { map.applyCam(cam, t); map.update(t, cam); renderer.render(scene, cam); };
//
// update(t) / cam(t) 是 t 的純函數：每一格把每個會動的屬性重設一次，不累積狀態。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';

const { clamp, lerp, prog, ease } = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ZH = 'Chiron GoRound TC', EN = 'Inter';
const ASPECT = 16 / 9, DEG = Math.PI / 180;

/** colour meanings (SERIES §5) + the four pstack layers (lesson 1 CARD §7) */
export const COL = {
  evidence: '#2EA44F', claim: '#A3A7B0', inconclusive: '#E8A317', human: '#7C5CD6', runnable: '#2B8FD6', fail: '#E5484D',
  entry: '#1C2340', playbook: '#F2780C', skill: '#0F9D8F', model: '#C2378A',
};
export const PARTS_PSTACK = [null,
  { n: 1, name: '劇本軌道' },
  { n: 2, name: '三道關' },
  { n: 3, name: '兩條流水線' },
];
const L_PART = [0, 3.6, 4.4, 4.6];            // one play of each mechanism at speed 1 (s)
const SLOT_X = [0, -0.9, 0, 0.9];             // course order, left → right
const CHAIN_X = [0, 0, 0.9, -0.9];            // the course closing: 3 → 1 → 2 is one line
const PART_Z = -0.04;
const BOARD_W = 2.74, BOARD_D = 1.46, TABLE_H = 0.40, G = 0.475;
const BASE_W = 0.84, BASE_D = 0.56, BH = 0.03;  // each part stands on its own slab

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
  mat.customProgramCacheKey = () => 'psdim';
}
const lumpy = (geo, amp, freq, seed) => C.clayify(geo, { amp, freq, seed });
const rbox = (w, h, d, r = 0.008, seed = 1, amp = 0.0012) => lumpy(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), amp, 18, seed);
const cyl = (rt, rb, h, seg = 18, seed = 1) => lumpy(new THREE.CylinderGeometry(rt, rb, h, seg, 1), 0.001, 22, seed);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function canvasTexture(cv) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------------------------------------------------------------- text on canvas (mixed Chinese / Latin, vector icons)
const PXM = 2200;                                   // canvas px per world metre
const ICON = new Set(['✓', '✗', '☐', '▶', '→']);
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
  else if (ch === '→') { c.beginPath(); c.moveTo(cx - s * 0.45, cy); c.lineTo(cx + s * 0.42, cy); c.moveTo(cx + s * 0.12, cy - s * 0.3); c.lineTo(cx + s * 0.45, cy); c.lineTo(cx + s * 0.12, cy + s * 0.3); c.stroke(); }
  c.restore();
}
let BARS = false, DETAIL = true;              // BARS: textTex is drawing the wide-shot twin; DETAIL: the part being posed is pushed in
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
function dual(lines, o = {}) { const d = textTex(lines, o), w = textTex(lines, { ...o, bars: true }); return { d, w, tex: d.tex, w_: w, h: d.h, wd: d.w, isDual: true };
}
/** a face plane carrying a text texture; anchored at its bottom centre */
const pickT = (t) => t.isDual ? (DETAIL ? t.d : t.w_) : t;
function face(tt0, { emissive = 0.25, transparent = false } = {}) {
  const tt = tt0.isDual ? tt0.d : tt0;
  const m = new THREE.MeshStandardMaterial({ map: tt.tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tt.tex, emissiveIntensity: emissive, transparent, alphaTest: transparent ? 0.02 : 0 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(tt.w, tt.h), m); f.position.y = tt.h / 2;
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
function chevTex(ink, bg) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 64, 64); c.strokeStyle = ink; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(20, 14); c.lineTo(40, 32); c.lineTo(20, 50); c.stroke();
  const t = canvasTexture(cv); t.wrapS = THREE.RepeatWrapping; return t;
}
/** a conveyor belt along +x (origin = its left end, on the surface it stands on). move(d) slides the chevrons by d metres */
function belt(len, w, h, body, top, ink) {
  const g = new THREE.Group();
  g.add(mesh(rbox(len, h, w, 0.006, 31), M(body), len / 2, h / 2, 0));
  const tex = chevTex(ink, top); tex.repeat.set(len / 0.05, 1);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.01, w * 0.78), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  p.rotation.x = -Math.PI / 2; p.position.set(len / 2, h + 0.0012, 0); p.receiveShadow = true; g.add(p);
  g.userData.move = (d) => { tex.offset.x = -d / 0.05; };
  g.userData.h = h;
  return g;
}
function slab(g, col, seed) { const m = mesh(rbox(BASE_W, BH, BASE_D, 0.02, seed, 0.002), M(col), 0, BH / 2, 0); m.receiveShadow = true; g.add(m); return m; }
/** keyframed 1-D motion: keys [[time, value], …], eased between keys */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, ease.inOut(prog(t, a, b))); }
  return keys[keys.length - 1][1];
}
const pop = (t, a, d = 0.25) => Math.max(0.001, ease.outBack(prog(t, a, a + d)));

// ---------------------------------------------------------------- part 1: entry → one rail of a playbook → evidence stamp
function buildP1(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 101);
  const GX = -0.27, SX = 0.315, RX0 = -0.19, RX1 = 0.25;
  // entry gate
  const navy = M(COL.entry);
  g.add(mesh(rbox(0.05, 0.19, 0.05, 0.012, 110), navy, GX, BH + 0.095, -0.13));
  g.add(mesh(rbox(0.07, 0.04, 0.2, 0.014, 112), navy, GX, BH + 0.19, -0.05));
  const entry = sign(textTex([o.entry || '/poteto-mode'], { ch: 0.046, bg: COL.entry, ink: '#ffffff', padX: 0.45, padY: 0.32 }), { board: '#141a33' });
  entry.position.set(GX - 0.005, BH + 0.21, 0); g.add(entry);
  // three rails (three playbooks); the middle one is picked
  const pale = '#e4d9c7';
  const railM = [M(pale), M(pale), M(pale)], RZ = [-0.17, 0, 0.17], RH = [0.012, 0.026, 0.012];
  RZ.forEach((z, i) => {
    g.add(mesh(rbox(RX1 - RX0, RH[i], 0.05, 0.006, 120 + i), railM[i], (RX0 + RX1) / 2, BH + RH[i] / 2, z));
    const dx = RX0 - (GX + 0.03), L = Math.hypot(dx, z), seg = mesh(rbox(L + 0.02, RH[i], 0.05, 0.006, 125 + i), railM[i], (GX + 0.03 + RX0) / 2, BH + RH[i] / 2, z / 2);
    seg.rotation.y = -Math.atan2(z, dx); g.add(seg);
  });
  // the switch: an arrow on the junction that swings to the picked rail
  const arrow = new THREE.Group(); arrow.position.set(GX + 0.045, BH + 0.03, 0); g.add(arrow);
  { const sh = new THREE.Shape(); sh.moveTo(0, -0.012); sh.lineTo(0.035, -0.012); sh.lineTo(0.035, -0.024); sh.lineTo(0.062, 0); sh.lineTo(0.035, 0.024); sh.lineTo(0.035, 0.012); sh.lineTo(0, 0.012); sh.closePath();
    const a = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }), M(COL.playbook)); a.rotation.x = Math.PI / 2; a.position.y = 0.008; arrow.add(a); }
  // playbook sign behind the rails
  const pbOff = textTex([o.playbook || '劇本 Bug fix'], { ch: 0.046, bg: '#e9e1d3', ink: '#9b9184', padX: 0.45, padY: 0.3 });
  const pbOn = textTex([o.playbook || '劇本 Bug fix'], { ch: 0.046, bg: COL.playbook, ink: '#ffffff', padX: 0.45, padY: 0.3 });
  const pb = sign(pbOff, { board: '#c98f5c' }); pb.position.set(0.035, BH, -0.255); g.add(pb);
  // six steps of the picked playbook: low tabs in front of the rail
  const steps = [];
  for (let i = 0; i < 6; i++) {
    const x = -0.125 + i * 0.07;
    const off = dual([String(i + 1)], { ch: 0.036, bg: '#ece5d8', ink: '#a39a8c', minW: 0.056, padY: 0.22, radius: 0.25 });
    const on = dual([String(i + 1)], { ch: 0.036, bg: COL.playbook, ink: '#ffffff', minW: 0.056, padY: 0.22, radius: 0.25 });
    const tab = sign(off, { board: '#c98f5c', tilt: 0.3, depth: 0.01 }); tab.position.set(x, BH, -0.075); g.add(tab);
    steps.push({ x, tab, off, on });
  }
  // the evidence press
  const green = M('#24863f');
  g.add(mesh(rbox(0.035, 0.21, 0.035, 0.01, 130), green, SX, BH + 0.105, -0.13));
  g.add(mesh(rbox(0.05, 0.03, 0.17, 0.01, 133), green, SX, BH + 0.2, -0.06));
  const pressSign = sign(textTex([o.evidence || '交證據'], { ch: 0.046, bg: COL.evidence, ink: '#ffffff', padX: 0.4, padY: 0.3 }), { board: '#1d6b33' });
  pressSign.position.set(SX + 0.035, BH + 0.215, -0.02); g.add(pressSign);
  // the work order
  const woLines = (box) => [{ s: o.goal || '目標', k: 1.15 }, { s: (o.done || '完成檢查') + ' ' + box, k: 0.9 }, { s: ' ', k: 1.5 }];
  const cardT = dual(woLines('☐'), { ch: 0.025, bg: '#fffaf0', ink: '#3b342c', padX: 0.4, padY: 0.25, lh: 1.3, minW: 0.125 });
  const cardT2 = dual(woLines('✓'), { ch: 0.025, bg: '#fffaf0', ink: '#3b342c', padX: 0.4, padY: 0.25, lh: 1.3, minW: 0.125 });
  const wo = card(cardT, { w: 0.128, h: 0.118 }); g.add(wo);
  const stampT = dual(['證據'], { ch: 0.036, bg: 'rgba(255,255,255,0.9)', border: COL.evidence, bw: 9, ink: COL.evidence, padX: 0.32, padY: 0.16, radius: 0.2 });
  const stamp = face(stampT, { emissive: 0.35, transparent: true }); stamp.position.set(0.012, 0.006, 0.004); stamp.rotation.z = 0.08; wo.userData.pg.add(stamp);
  const head = new THREE.Group(); g.add(head);       // the stamp head moves along the card's normal
  const headM = mesh(rbox(0.09, 0.06, 0.03, 0.01, 135), M(COL.evidence)); head.add(headM);
  const LEAN = 0.58, nrm = V(0, Math.sin(LEAN), Math.cos(LEAN));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.105, 40), new THREE.MeshBasicMaterial({ color: '#7be08f', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(SX, BH + 0.002, 0.02); g.add(halo);

  const L = L_PART[1];
  const cardX = (lt) => track([[0, -0.44], [0.5, GX], [0.75, RX0 + 0.02], [2.55, RX1 - 0.02], [2.85, SX]], lt);
  function act(lt, k = {}) {
    const x = cardX(lt); wo.position.set(x, BH + 0.026, 0); wo.visible = !k.hideItem;
    const pick = ease.inOut(prog(lt, 0.42, 0.72));
    railM.forEach((m, i) => m.color.copy(m.userData.base).lerp(new THREE.Color(i === 1 ? COL.playbook : '#d8cdbb'), i === 1 ? pick : 0));
    arrow.rotation.y = lerp(0.5, 0, pick);
    pb.userData.face.userData.setTex(pick > 0.5 ? pbOn : pbOff); pb.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * prog(lt, 0.5, 0.85)));
    entry.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * prog(lt, 0.25, 0.65)));
    for (const s of steps) { const on = x > s.x + 0.07 && pick > 0.5; s.tab.userData.face.userData.setTex(on ? s.on : s.off); const tOn = (s.x + 0.07 - (RX0 + 0.02)) / (RX1 - RX0 - 0.04) * 1.8 + 0.75; s.tab.scale.setScalar(on ? 1 + 0.18 * Math.sin(Math.PI * prog(lt, tOn, tOn + 0.25)) : 1); }
    const down = lt < 2.97 ? ease.in(prog(lt, 2.8, 2.97)) : 1 - ease.out(prog(lt, 3.02, 3.25));
    const pc = V(SX, BH + 0.038, 0.022).add(V(0, Math.cos(LEAN) * 0.03, -Math.sin(LEAN) * 0.03));   // paper centre
    const hit = pc.clone().addScaledVector(nrm, 0.022), rest = V(SX, BH + 0.165, -0.075);
    head.position.copy(rest).lerp(hit, down); head.rotation.x = -LEAN * down;
    wo.userData.face.userData.setTex(lt >= 2.97 ? cardT2 : cardT);
    stamp.userData.setTex(stampT);
    const st = lt >= 2.97 ? pop(lt, 2.97, 0.3) : 0.001; stamp.scale.setScalar(st); stamp.visible = lt >= 2.97;
    halo.material.opacity = 0.75 * prog(lt, 2.97, 3.15);
    pressSign.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * prog(lt, 2.97, 3.35)));
  }
  return { g, L, act, item: wo, itemOut: V(SX, BH, 0), itemIn: V(-0.44, BH, 0) };
}

// ---------------------------------------------------------------- part 2: three gates, then parallel lines
function buildP2(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 201);
  const G1 = -0.28, G2 = -0.07, G3 = 0.125, BX0 = -0.42, BX1 = 0.22;
  const bl = belt(BX1 - BX0, 0.085, 0.02, '#5a6170', '#6c7482', '#8e96a3'); bl.position.set(BX0, BH, 0); g.add(bl);
  const wood = M('#c98f5c');
  const gate = (x, lines, seed) => {
    g.add(mesh(rbox(0.032, 0.17, 0.032, 0.01, seed), wood, x, BH + 0.085, -0.075));
    g.add(mesh(rbox(0.045, 0.028, 0.13, 0.01, seed + 3), wood, x, BH + 0.16, -0.03));
    const s = sign(textTex(lines, { ch: 0.044, bg: '#fffaf0', ink: '#3b2a20', padX: 0.35, padY: 0.28, lh: 1.18 }), { board: '#a96d42' });
    s.position.set(x, BH + 0.175, 0); g.add(s); return s;
  };
  const s1 = gate(G1, o.gate1 || ['貼標籤'], 210), s2 = gate(G2, o.gate2 || ['另一家', '重跑'], 220), s3 = gate(G3, o.gate3 || ['擋板'], 230);
  // the report
  const repT = dual([{ s: o.report || '報告', k: 1.1 }, { s: '— — —', k: 0.7, ink: '#b8ada0' }], { ch: 0.028, bg: '#fffaf0', ink: '#3b342c', padX: 0.4, padY: 0.25, minW: 0.12 });
  const rep = card(repT, { w: 0.12, h: 0.085 });
  g.add(rep);
  const TAGS = o.tags || [['量到', COL.evidence], ['推論', COL.runnable], ['猜', COL.claim]];
  const tags = TAGS.map(([s, c], i) => { const f = face(dual([s], { ch: 0.021, bg: c, ink: '#ffffff', padX: 0.32, padY: 0.2, radius: 0.35 }), { emissive: 0.3 }); f.position.set((i - 1) * 0.05, 0.086, 0.004); rep.userData.pg.add(f); return f; });
  // gate 2: two findings stand behind the belt; the claim is dropped, the rerun that fails is kept
  const fA0 = dual([o.claim || '說法'], { ch: 0.03, bg: '#dfe1e5', ink: '#6b7078', border: '#b9bdc4', bw: 6, minW: 0.1, padY: 0.42 });
  const fA1 = dual([(o.claim || '說法') + ' ✗'], { ch: 0.03, bg: '#dfe1e5', ink: '#6b7078', border: '#b9bdc4', bw: 6, minW: 0.1, padY: 0.42 });
  const fB0 = dual(['▶ 重跑'], { ch: 0.03, bg: '#ffffff', ink: '#3b342c', border: '#b9bdc4', bw: 6, minW: 0.1, padY: 0.42 });
  const fB1 = dual(['FAIL'], { ch: 0.034, bg: COL.fail, ink: '#ffffff', border: COL.fail, bw: 6, minW: 0.1, padY: 0.36 });
  const fB2 = dual(['FAIL ✓'], { ch: 0.034, bg: COL.fail, ink: '#ffffff', border: COL.evidence, bw: 14, minW: 0.1, padY: 0.36 });
  const fa = sign(fA0, { board: null, tilt: 0.35 }), fb = sign(fB0, { board: null, tilt: 0.35 }); g.add(fa, fb);
  const binX = G2 - 0.12, binZ = -0.27;            // the dropped claim falls off the back edge and is gone
  // gate 3: the kept failure becomes a barrier plate hanging in the gate
  const barrier = sign(textTex(['✗'], { ch: 0.04, bg: COL.fail, ink: '#ffffff', minW: 0.11, padY: 0.2, radius: 0.2 }), { board: '#a8323a', tilt: 0.3, depth: 0.012 });
  barrier.position.set(G3 + 0.07, BH + 0.004, -0.12); g.add(barrier);
  // fan-out to four parallel lines
  const LZ = [-0.165, -0.055, 0.055, 0.165], LX0 = 0.275, LX1 = 0.42;
  const laneM = M('#bfe3c6');
  LZ.forEach((z, i) => {
    g.add(mesh(rbox(LX1 - LX0, 0.012, 0.04, 0.005, 250 + i), laneM, (LX0 + LX1) / 2, BH + 0.006, z));
    const dx = LX0 - BX1 + 0.01, L = Math.hypot(dx, z), seg = mesh(rbox(L + 0.012, 0.012, 0.04, 0.005, 255 + i), laneM, (BX1 - 0.01 + LX0) / 2, BH + 0.006, z / 2); seg.rotation.y = -Math.atan2(z, dx); g.add(seg);
  });
  const copyT = textTex(['✓'], { ch: 0.03, bg: '#ffffff', ink: COL.evidence, border: COL.evidence, bw: 6, minW: 0.05, padY: 0.25 });
  const copies = LZ.map((z) => { const c = card(copyT, { w: 0.05, h: 0.04, sled: null }); g.add(c); return c; });
  // the exit: a green arrow tag lying in front of the fan-out (not a fourth gate)
  const par = sign(textTex([(o.parallel || '放行') + ' →'], { ch: 0.046, bg: COL.evidence, ink: '#ffffff', padX: 0.5, padY: 0.26, radius: 0.6 }), { board: null, tilt: 1.0 });
  par.position.set(0.3, BH + 0.004, 0.235); g.add(par);

  const L = L_PART[2];
  const repX = (lt) => track([[0, -0.40], [0.35, G1], [1.15, G1], [1.45, G2], [2.7, G2], [3.0, G3], [3.25, G3], [3.6, BX1 + 0.02]], lt);
  function act(lt, k = {}) {
    rep.userData.face.userData.setTex(repT); tags.forEach(f => f.userData.setTex(f.userData.tt));
    const x = repX(lt); rep.position.set(x, BH + 0.02, 0); rep.visible = !k.hideItem && lt < 3.62;
    bl.userData.move(Math.min(lt, 3.6) * 0.17);
    tags.forEach((f, i) => { const a = 0.45 + i * 0.25; f.visible = lt >= a; f.scale.setScalar(pop(lt, a)); });
    s1.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * prog(lt, 0.35, 1.15)));
    s2.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * prog(lt, 1.45, 2.7)));
    s3.scale.setScalar(1 + 0.07 * Math.sin(Math.PI * prog(lt, 2.95, 3.4)));
    // findings
    const rise = ease.outBack(prog(lt, 1.5, 1.8));
    fa.visible = lt >= 1.5 && lt < 2.62; fb.visible = lt >= 1.5 && lt < 3.0;
    const fall = ease.in(prog(lt, 2.25, 2.6));
    fa.position.set(lerp(G2 - 0.08, binX, fall), BH + lerp(0.01 - 0.05 * (1 - rise), 0.03, fall) + 0.05 * Math.sin(Math.PI * fall), lerp(-0.165, binZ, fall));
    fa.rotation.z = 0.9 * fall; fa.scale.setScalar(Math.max(0.001, rise * (1 - fall)));
    fa.userData.face.userData.setTex(lt >= 2.05 ? fA1 : fA0);
    const fly = ease.inOut(prog(lt, 2.72, 3.0));
    fb.position.set(lerp(G2 + 0.08, G3 + 0.07, fly), BH + lerp(0.01 - 0.05 * (1 - rise), 0.004, fly) + 0.05 * Math.sin(Math.PI * fly), lerp(-0.165, -0.12, fly));
    fb.scale.setScalar(Math.max(0.001, rise * (1 + 0.15 * Math.sin(Math.PI * prog(lt, 1.95, 2.2)))));
    fb.userData.face.userData.setTex(lt >= 2.45 ? fB2 : lt >= 1.95 ? fB1 : fB0);
    barrier.visible = lt >= 2.96; barrier.scale.setScalar(pop(lt, 2.96, 0.25));
    // release: four copies run down the parallel lines
    copies.forEach((c, i) => { const a = 3.6 + i * 0.07, u = ease.out(prog(lt, a, a + 0.55)); c.visible = lt >= a; c.position.set(lerp(BX1 + 0.02, LX1 - 0.03, u), BH + 0.012, LZ[i] * Math.min(1, u * 2.2)); c.scale.setScalar(Math.max(0.001, Math.min(1, u * 3))); });
    laneM.color.copy(laneM.userData.base).lerp(new THREE.Color(COL.evidence), 0.75 * prog(lt, 3.6, 3.9));
    par.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * prog(lt, 3.7, 4.2)));
  }
  return { g, L, act, item: rep, itemIn: V(-0.40, BH, 0), itemOut: V(0.42, BH, 0) };
}

// ---------------------------------------------------------------- part 3: SDD upstream (purple) → a decision-table row → pstack downstream (blue)
function buildP3(o) {
  const g = new THREE.Group(); slab(g, '#f6ecda', 301);
  // upstream platform + belt
  const PX0 = -0.42, PX1 = -0.07, PZ = -0.17, PH = 0.07;
  g.add(mesh(rbox(PX1 - PX0 + 0.02, PH, 0.2, 0.012, 310), M('#c9b8f0'), (PX0 + PX1) / 2, BH + PH / 2, PZ));
  const ub = belt(PX1 - PX0, 0.07, 0.014, '#6a4cc2', '#8a70d8', '#b9a8ee'); ub.position.set(PX0, BH + PH, PZ + 0.02); g.add(ub);
  const sdd = sign(textTex([o.upstream || 'SDD｜人拍板'], { ch: 0.044, bg: COL.human, ink: '#ffffff', padX: 0.4, padY: 0.28 }), { board: '#553a9e', post: 0.13 });
  sdd.position.set(-0.235, BH + PH, PZ - 0.085); g.add(sdd);
  // the person who decides
  const who = C.makeBean('#a58fe6', 17, { arms: true }); who.scale.setScalar(0.5); who.position.set(-0.235, BH + PH, PZ - 0.045); g.add(who);
  const qT0 = textTex([{ s: '?', k: 1.5 }], { ch: 0.034, bg: '#f1ebff', ink: COL.human, border: COL.human, bw: 7, minW: 0.08, padY: 0.2 });
  const qT1 = dual(['✓ 拍板'], { ch: 0.028, bg: COL.human, ink: '#ffffff', border: COL.human, bw: 7, minW: 0.08, padY: 0.55 });
  const q = card(qT0, { w: 0.1, h: 0.07, sled: null }); g.add(q);
  // decision table board
  const ROWS = o.rows || ['×1.2 係數 → 不套', '送兩次 → 只算一次', '…'];
  const DT_W = 0.38, DT_H = 0.25, dtX = 0.14, dtZ = -0.2, RI = 1;
  const dtTex = (state, wide) => textTex([' '], { ch: 0.03, bg: '#fffdf7', minW: DT_W, minH: DT_H, padX: 0, padY: 0, bars: wide, extra: (c, W, H, px) => {
    const m = PXM; c.fillStyle = '#e9e2f7'; c.fillRect(0, 0, W, 0.05 * m);
    if (wide) { BARS = false; drawText(c, o.tableShort || '決策表', W / 2, 0.044 * m, Math.round(0.042 * m), '#553a9e'); BARS = true; } else drawText(c, o.table || 'decision table', W / 2, 0.037 * m, Math.round(0.03 * m), '#553a9e');
    ROWS.forEach((r, i) => {
      const y0 = (0.05 + 0.006 + i * 0.058) * m, hh = 0.05 * m;
      if (i === RI && state === 0) { c.strokeStyle = '#cfc6e6'; c.setLineDash([10, 8]); c.lineWidth = 4; c.strokeRect(10, y0, W - 20, hh); c.setLineDash([]); return; }
      if (i === RI && state === 1) { c.fillStyle = COL.human; c.fillRect(6, y0, W - 12, hh); drawText(c, r, W / 2, y0 + hh * 0.72, Math.round(0.03 * m), '#ffffff'); return; }
      c.fillStyle = i % 2 ? '#f6f2fd' : '#ffffff'; c.fillRect(6, y0, W - 12, hh); drawText(c, r, W / 2, y0 + hh * 0.72, Math.round(0.03 * m), i === RI ? '#553a9e' : '#7d7590');
    });
    c.strokeStyle = '#b9a8ee'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
  } });
  const dtD = (s) => { const d = dtTex(s, false), w = dtTex(s, true); return { d, w_: w, tex: d.tex, isDual: true }; };
  const dt0 = dtD(0), dt1 = dtD(1), dt2 = dtD(2);
  const dt = sign(dt0.d, { board: '#8a70d8', tilt: 0.25, post: 0.0 }); dt.position.set(dtX, BH + 0.004, dtZ); g.add(dt);
  // the row that slides down: a strip, then it becomes a done check on the blue belt
  const rowT = dual([ROWS[RI]], { ch: 0.03, bg: COL.human, ink: '#ffffff', minW: DT_W - 0.012, padY: 0.42, radius: 0.15 });
  const strip = face(rowT, { emissive: 0.3 }); const stripG = new THREE.Group(); stripG.add(strip); strip.position.y = 0; g.add(stripG);
  // chute
  { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, COL.human); gr.addColorStop(1, COL.runnable); c.fillStyle = gr;
    c.beginPath(); c.moveTo(44, 0); c.lineTo(84, 0); c.lineTo(84, 170); c.lineTo(118, 170); c.lineTo(64, 250); c.lineTo(10, 170); c.lineTo(44, 170); c.closePath(); c.fill();
    const ar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshStandardMaterial({ map: canvasTexture(cv), transparent: true, roughness: 0.9 }));
    ar.rotation.x = -Math.PI / 2; ar.position.set(0.07, BH + 0.002, -0.015); g.add(ar); }
  // downstream belt
  const DX0 = -0.03, DX1 = 0.31, DZ = 0.115;
  const db = belt(DX1 - DX0, 0.075, 0.016, '#1f6fb0', '#3d9be0', '#a9d3f5'); db.position.set(DX0, BH, DZ); g.add(db);
  const ps = sign(textTex([{ s: o.downstream?.[0] || 'pstack', k: 1 }, { s: o.downstream?.[1] || '跑得出答案', k: 0.95 }], { ch: 0.044, bg: COL.runnable, ink: '#ffffff', padX: 0.35, padY: 0.25, lh: 1.15 }), { board: '#1c5d93' });
  ps.position.set(-0.25, BH, 0.11); g.add(ps);
  // run box
  const RXb = 0.12;
  g.add(mesh(rbox(0.11, 0.085, 0.105, 0.016, 330), M('#2b7fc2'), RXb, BH + 0.0425 + 0.004, DZ));
  const runL = sign(dual(['▶ 跑'], { ch: 0.03, bg: '#1c5d93', ink: '#ffffff', padX: 0.3, padY: 0.2 }), { board: null, tilt: 0 }); runL.position.set(RXb, BH + 0.024, DZ + 0.054); g.add(runL);
  // the done check
  const dT0 = dual([{ s: o.doneLabel || '完成檢查', k: 1 }, { s: '☐', k: 1.15, ink: '#9a9a9a' }], { ch: 0.024, bg: '#ffffff', ink: '#2b2622', border: COL.evidence, bw: 7, minW: 0.11, padY: 0.25, lh: 1.25 });
  const dT1 = dual([{ s: o.doneLabel || '完成檢查', k: 1 }, { s: '✓', k: 1.15, ink: COL.evidence }], { ch: 0.024, bg: '#ffffff', ink: '#2b2622', border: COL.evidence, bw: 7, minW: 0.11, padY: 0.25, lh: 1.25 });
  const dc = card(dT0, { w: 0.11, h: 0.082, sled: null }); g.add(dc);
  // end light
  // the end of the line: a plug goes into your own flow (install the plugin)
  const lampM = M('#d9b48a');
  const SKX = 0.375;
  g.add(mesh(rbox(0.075, 0.085, 0.1, 0.014, 340), lampM, SKX, BH + 0.0425, DZ));
  const plug = new THREE.Group(); g.add(plug);
  plug.add(mesh(rbox(0.04, 0.032, 0.045, 0.01, 341), M('#1f6fb0'), 0, 0, 0));
  for (const sz of [-1, 1]) { const pin = mesh(cyl(0.004, 0.004, 0.022, 8, 342 + sz), M('#d8dde3')); pin.rotation.z = Math.PI / 2; pin.position.set(0.03, 0, sz * 0.011); plug.add(pin); }
  const cable = mesh(cyl(0.006, 0.006, 1, 8, 345), M('#1f6fb0')); cable.rotation.z = Math.PI / 2; g.add(cable);
  const sockL = sign(textTex([o.plugin?.[0] || '插上', o.plugin?.[1] || 'plugin'], { ch: 0.04, bg: '#fffaf0', ink: '#3b2a20', padX: 0.3, padY: 0.2, lh: 1.12 }), { board: '#a96d42', tilt: 0.3 });
  sockL.position.set(SKX + 0.005, BH + 0.088, DZ - 0.02); g.add(sockL);

  const L = L_PART[3];
  function act(lt, k = {}) {
    ub.userData.move(Math.min(lt, 1.4) * 0.2); db.userData.move(clamp(lt - 2.4, 0, 1.3) * 0.25);
    // question card → the person → the table
    const qx = track([[0, -0.42], [0.6, -0.235], [1.05, -0.235], [1.4, -0.08]], lt);
    q.position.set(qx, BH + PH + 0.014, PZ + 0.02); q.visible = lt < 1.4;
    q.scale.setScalar(1 + 0.18 * Math.sin(Math.PI * prog(lt, 0.78, 1.0)));
    const st = Math.sin(Math.PI * prog(lt, 0.6, 1.0));
    who.userData.pose({ t: lt, hold: st, squash: 0.12 * Math.sin(Math.PI * prog(lt, 0.72, 0.92)), look: -0.2 + 0.2 * st });
    // the row fills, lights, and a copy slides down
    dt.userData.face.userData.setTex(lt < 1.38 ? dt0 : lt < 2.4 ? dt1 : dt2);
    dt.scale.setScalar(1 + 0.04 * Math.sin(Math.PI * prog(lt, 1.38, 1.7)));
    const sl = ease.inOut(prog(lt, 1.7, 2.35));
    const a = V(dtX, BH + 0.004 + DT_H - (0.05 + 0.006 + RI * 0.058 + 0.025), dtZ + 0.03), b = V(0.07, BH + 0.06, DZ - 0.01);
    stripG.position.copy(a).lerp(b, sl); stripG.position.y += 0.03 * Math.sin(Math.PI * sl); stripG.rotation.x = -0.25 - 0.3 * Math.sin(Math.PI * sl);
    stripG.scale.setScalar(lerp(1, 0.32, sl)); stripG.visible = lt >= 1.7 && lt < 2.45;
    // done check rides the blue belt through the run box
    const dx = track([[2.4, 0.06], [2.9, RXb], [3.25, RXb], [3.55, 0.228]], lt);
    dc.position.set(dx, BH + 0.017, DZ - 0.01); dc.visible = lt >= 2.38 && !(lt > 2.85 && lt < 3.3) && !k.hideItem;
    dc.scale.setScalar(lt < 2.6 ? pop(lt, 2.38, 0.22) : 1 + 0.15 * Math.sin(Math.PI * prog(lt, 3.3, 3.6)));
    dc.userData.face.userData.setTex(lt >= 3.3 ? dT1 : dT0);
    q.userData.face.userData.setTex(lt >= 0.82 ? qT1 : qT0); strip.userData.setTex(rowT); runL.userData.face.userData.setTex(runL.userData.face.userData.tt);
    const pk = ease.inOut(prog(lt, 3.7, 4.05)), px = lerp(0.262, SKX - 0.072, pk), PZp = DZ - 0.035, c0 = RXb + 0.055;
    plug.position.set(px, BH + 0.03, PZp); cable.position.set((c0 + px - 0.02) / 2, BH + 0.03, PZp); cable.scale.set(1, Math.max(0.001, px - 0.02 - c0), 1);
    const on = prog(lt, 4.05, 4.25);
    lampM.color.copy(lampM.userData.base).lerp(new THREE.Color('#5fd17f'), on);
    sockL.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * prog(lt, 4.05, 4.5)));
    ps.scale.setScalar(1 + 0.06 * Math.sin(Math.PI * prog(lt, 2.4, 2.9)));
    sdd.scale.setScalar(1 + 0.06 * Math.sin(Math.PI * prog(lt, 0.6, 1.1)));
  }
  return { g, L, act, item: dc, itemIn: V(-0.42, BH, PZ), itemOut: V(0.4, BH, DZ) };
}
const BUILD = [null, buildP1, buildP2, buildP3];

// ---------------------------------------------------------------- name plates & question sign (coursemap4 look)
const PL = {
  alive: { bg: '#fffaf0', ink: '#4a3a2c', border: '#e2c6a2', badge: '#c98f5c', badgeInk: '#fff' },
  cur: { bg: '#f8d867', ink: '#3b2a20', border: '#d79a2b', badge: '#3b2a20', badgeInk: '#f8d867' },
  gray: { bg: '#e6e1d8', ink: '#8a8174', border: '#cfc8bc', badge: '#b2aa9e', badgeInk: '#fff' },
};
function plateCanvas(n, name, st) {
  const h = 160, mc = document.createElement('canvas').getContext('2d'), fs = 104;
  const cw = Math.ceil(150 + measure(mc, name, fs) + 52);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = st.bg; c.beginPath(); c.roundRect(5, 5, cw - 10, h - 10, 40); c.fill(); c.lineWidth = 7; c.strokeStyle = st.border; c.stroke();
  c.fillStyle = st.badge; c.beginPath(); c.arc(76, h / 2, 54, 0, 7); c.fill();
  c.fillStyle = st.badgeInk; c.font = `700 76px "${ZH}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 76, h / 2 + 4);
  drawText(c, name, 150, h / 2 + fs * 0.36, fs, st.ink, 'left');
  return cv;
}
function makePlate(n, name, h = 0.1) {
  const tex = {}; for (const k of Object.keys(PL)) tex[k] = canvasTexture(plateCanvas(n, name, PL[k]));
  const cv = tex.alive.image, w = h * cv.width / cv.height;
  const g = new THREE.Group(), board = new THREE.Group(); g.add(board);
  board.add(mesh(rbox(w + 0.008, h + 0.008, 0.012, 0.008, 950 + n, 0.0003), M('#d9b48a')));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex.alive, roughness: 0.85, emissive: '#ffffff', emissiveMap: tex.alive, emissiveIntensity: 0.18 }));
  f.position.z = 0.0068; board.add(f);
  board.position.y = h / 2 + 0.012; board.rotation.x = -0.42;
  g.userData.setStyle = (k) => { const t = tex[k]; if (f.material.map !== t) { f.material.map = t; f.material.emissiveMap = t; f.material.needsUpdate = true; } };
  g.userData.w = w; g.userData.h = h;
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
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.035, 3), new THREE.MeshBasicMaterial({ color: '#f8d867', toneMapped: false, depthTest: false })); tip.rotation.z = Math.PI; tip.position.y = -0.012; tip.renderOrder = 10; g.add(tip);
  g.userData.H = H;
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
 * @param o.lesson    this lesson, 1..3 (required)
 * @param o.t0        when the map sequence starts (s)
 * @param o.shot      'ride' (opening, default) | 'finale' (pull back from this lesson's part to the whole table)
 *                    | 'overview' (still wide shot) | 'chain' (course closing: the three parts join into one line and one item runs through)
 *                    'overview' with allLit on lesson 3 = 'chain' (same as coursemap4's lap on its last lesson)
 * @param o.question  question card text over this lesson's part ('\n' for two lines)
 * @param o.times     absolute seconds; see COURSEMAP-PSTACK.md
 * @param o.stops     ride: parts lit in the wide shot before the push (default lesson 1: [1,2,3] = first look; else the learned parts)
 * @param o.review    'wide' (default: the stops play in the wide shot) | 'push' (the camera goes to each stop)
 * @param o.camFrom   {pos, look, fov} world: blend from your camera, starting at t0 (o.camBlend s, default 1.2)
 * @param o.place     { x, y, z, rotY, scale } where the table stands (default: where the low table is)
 * @param o.parts     per-part text overrides (see doc)
 */
export async function makeCourseMapPstack(o = {}) {
  const lesson = clamp(Math.round(o.lesson || 1), 1, 3);
  const t0 = o.t0 ?? 0;
  let shot = o.shot || 'ride';
  if (shot === 'overview' && (o.allLit ?? false) && lesson === 3) shot = 'chain';
  const chain = shot === 'chain';
  const place = Object.assign({ x: 0.1, y: 0, z: -0.55, rotY: 0, scale: 1 }, o.place || {});
  const question = o.question || '';
  const names = [null, ...[1, 2, 3].map(n => o.parts?.[n]?.name || PARTS_PSTACK[n].name)];
  // fonts
  for (const href of ['/node_modules/@fontsource/chiron-goround-tc/700.css', '/node_modules/@fontsource/inter/800.css']) {
    if (![...document.styleSheets].some(s => (s.href || '').includes(href.split('/')[3]) && (s.href || '').includes(href.split('/').pop()))) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; });
    }
  }
  const allText = names.join('') + question + JSON.stringify(o.parts || {}) + '第課·劇本軌道三道關兩條流水線交證據目標完成檢查報告貼標籤另一家重跑擋板平行量到推論猜說法丟掉人拍板跑得出答案係數不套送兩次只算一次…—';
  await document.fonts.load(`700 120px "${ZH}"`, allText);
  await document.fonts.load(`800 120px "${EN}"`, '/poteto-modeBugfixFAILSDDpstackdecisiontable×1.20123456789?');
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

  // ---- the three parts
  const parts = [null];
  for (let n = 1; n <= 3; n++) {
    const holder = new THREE.Group(); land.add(holder);
    const b = BUILD[n](o.parts?.[n] || {}); holder.add(b.g);
    const dimU = { value: 0 };
    b.g.traverse(m => { if (m.isMesh && m.material && m.material.depthWrite !== false) dimPatch(m.material, dimU); });
    const plate = makePlate(n, names[n]); plate.position.set(0, 0, BASE_D / 2 + 0.06); holder.add(plate);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(BASE_W + 0.09, BASE_D + 0.09), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; glow.renderOrder = 1; holder.add(glow);
    const sh = C.contactShadow(BASE_W * 1.25, BASE_D * 1.3, 0.3); sh.position.y = 0.0015; holder.add(sh);
    holder.position.set(SLOT_X[n], 0, PART_Z);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3(); b.g.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert(); const tmp = new THREE.Box3();
    b.g.traverse(m => { if (m.isMesh && m.geometry) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv); box.union(tmp); } });
    parts.push({ ...b, n, holder, plate, glow, dimU, box });
  }
  // chain connectors (blue: everything downstream of the decision row is pstack)
  const conM = M(COL.runnable);
  const con = [[-0.9 + 0.40, 0.115, -0.44, 0], [0.33, 0, 0.9 - 0.40, 0]].map(([x0, z0, x1, z1], i) => {
    const L = Math.hypot(x1 - x0, z1 - z0), m = mesh(rbox(L + 0.04, 0.016, 0.05, 0.006, 600 + i), conM, (x0 + x1) / 2, BH + 0.008, PART_Z + (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); land.add(m); return m;
  });

  // ---- question sign
  const cur = parts[lesson];
  const qs = question && (shot === 'ride') ? questionSign(question, `第 ${lesson} 課 · ${names[lesson]}`) : null; if (qs) land.add(qs);
  const signPos = () => V(SLOT_X[lesson], cur.box.max.y + 0.035, PART_Z + cur.box.min.z + 0.12);

  // ---- timing
  const tm = { start: t0 };
  const T = o.times || {};
  const blendIn = o.camFrom ? (o.camBlend ?? 1.2) : 0;
  const PUSH = 1.1;
  const L = (n) => L_PART[n];
  let stops = [], plays = [];                  // plays: { n, a (start), b (window end), rate }
  if (shot === 'ride') {
    stops = (o.stops ? o.stops.slice() : lesson === 1 ? [1, 2, 3] : [1, 2].filter(n => n < lesson));
    const ovStart = T.overview ?? t0;
    const ovHold = Math.max(lesson === 1 ? 2.6 : 1.6, blendIn + 0.8);
    const given = T.parts || T.stops;
    let arrive = T.arrive;
    let starts;
    if (given) starts = given.slice(0, stops.length);
    else {
      const s0 = Math.max(ovStart, t0) + ovHold, per = lesson === 1 ? 3.0 : 2.9;
      if (arrive != null && stops.length) { const span = Math.max(0.1, arrive - PUSH - s0); starts = stops.map((_, i) => s0 + span * i / stops.length); }
      else starts = stops.map((_, i) => s0 + per * i);
    }
    const lastEnd = stops.length ? (starts[stops.length - 1] + (given ? Math.max(2.6, L(stops[stops.length - 1]) * 0.85) : lesson === 1 ? 3.0 : 2.9)) : t0 + Math.max(1.6, blendIn + 0.8);
    if (arrive == null) arrive = lastEnd + PUSH;
    const pushStart = T.push ?? arrive - PUSH;
    stops.forEach((n, i) => {
      const a = starts[i], b = i + 1 < stops.length ? starts[i + 1] : Math.max(pushStart, a + 1.0);
      plays.push({ n, a, b, rate: clamp(L(n) / Math.max(0.6, b - a - 0.5), 1, 1.8) });
    });
    const colorIn = T.colorIn ?? T.play ?? (lesson === 1 ? pushStart + 0.15 : arrive - 0.6);
    plays.push({ n: lesson, a: colorIn, b: 1e9, rate: T.rate ?? 1, current: true });
    tm.overview = ovStart; tm.stops = plays.filter(p => !p.current).map(p => ({ n: p.n, t: p.a, end: p.b, rate: +p.rate.toFixed(2) }));
    tm.push = pushStart; tm.arrive = arrive; tm.colorIn = colorIn;
    tm.ask = T.ask ?? arrive;
    tm.end = T.end ?? Math.max(tm.ask + 2.6, colorIn + L(lesson) + 0.4);
  } else if (chain) {
    const join = T.join ?? t0 + 0.5 + blendIn * 0.5, joinEnd = join + 1.6;
    let flow = T.flow;
    if (!flow) {
      const a = joinEnd + 0.4, endGiven = T.end;
      const total = L(3) + L(1) + L(2) + 0.6;
      const rate = endGiven != null ? clamp(total / Math.max(1, endGiven - 1.4 - a), 1, 2.2) : 1;
      flow = [a, a + (L(3) + 0.3) / rate, a + (L(3) + L(1) + 0.6) / rate];
      tm.rate = +rate.toFixed(2);
    }
    const [f3, f1, f2] = flow;
    const r = (n, nextA) => nextA != null ? clamp(L(n) / Math.max(0.6, nextA - (n === 3 ? f3 : f1) - 0.3), 1, 2.2) : null;
    const r3 = r(3, f1), r1 = r(1, f2);
    let r2 = T.end != null ? clamp(L(2) / Math.max(0.6, T.end - f2 - 1.2), 1, 2.2) : (tm.rate || 1);
    plays = [{ n: 3, a: f3, b: f1, rate: r3 }, { n: 1, a: f1, b: f2, rate: r1 }, { n: 2, a: f2, b: f2 + L(2) / r2 + 0.3, rate: r2 }];
    tm.join = [join, joinEnd]; tm.flow = [f3, f1, f2];
    tm.end = T.end ?? (f2 + L(2) / r2 + 1.6);
  } else {
    tm.end = T.end ?? t0 + 4.0;
  }
  tm.lit = plays.map(p => ({ n: p.n, t: p.a }));
  const learned = (n) => shot === 'overview' ? (o.allLit || n <= lesson) : shot === 'finale' ? n <= lesson : chain ? true : n < lesson;

  // ---- cameras (land-local, returned in world space)
  const W = (v) => land.localToWorld(v.clone());
  const L2W = (c) => ({ pos: W(c.pos), look: W(c.look), fov: c.fov });
  const corners = (b, dx = 0) => { const r = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) r.push(V(x + dx, y, z)); return r; };
  const platePts = (n, x) => { const p = parts[n].plate, w = p.userData.w / 2, h = p.userData.h; const z = PART_Z + BASE_D / 2 + 0.06; return [V(x - w, 0, z + 0.02), V(x + w, 0, z + 0.02), V(x - w, h * 0.95, z - h * 0.35), V(x + w, h * 0.95, z - h * 0.35)]; };
  const partPts = (n, x) => corners(parts[n].box, x).map(p => p.add(V(0, 0, PART_Z)));
  const cache = {};
  const cams = {
    overview: () => cache.ov || (cache.ov = L2W(fitCam([1, 2, 3].flatMap(n => [...partPts(n, SLOT_X[n]), ...platePts(n, SLOT_X[n])]), { elev: 0.6, fov: 30, xm: 0.95 }))),
    chain: () => cache.ch || (cache.ch = L2W(fitCam([1, 2, 3].flatMap(n => [...partPts(n, CHAIN_X[n]), ...platePts(n, CHAIN_X[n])]), { elev: 0.6, fov: 30, xm: 0.95 }))),
    part: (n = lesson) => cache['p' + n] || (cache['p' + n] = L2W(fitCam([...partPts(n, SLOT_X[n]),
      ...(n === lesson && qs ? (() => { const s = signPos(); return [s.clone().add(V(-SIGN_W / 2, qs.userData.H * 1.02, 0)), s.clone().add(V(SIGN_W / 2, qs.userData.H * 1.02, 0)), s]; })() : platePts(n, SLOT_X[n]))],
    { elev: 0.5, fov: 30, xm: 0.9, yBot: -0.6 }))),
  };
  const mixC = (a, b, e) => ({ pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), fov: lerp(a.fov, b.fov, e) });
  const review = o.review || 'wide';
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
      if (hold > 0) { const d = c.pos.clone().sub(c.look); c = { ...c, pos: c.look.clone().add(d.multiplyScalar(1 - 0.035 * hold)) }; }
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
  const camLocal = new THREE.Vector3(), tmp = new THREE.Vector3();
  // small text shows only when the camera is pushed in on that part: halfway between the wide and the push-in distance
  let _dd = null; const detailD = () => _dd ?? (_dd = (() => { root.updateMatrixWorld(true); const c = parts[2].holder.getWorldPosition(new THREE.Vector3()); return (cams.overview().pos.distanceTo(c) + cams.part(2).pos.distanceTo(c)) / 2; })());
  const winK = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ease.inOut(clamp((t - a) / fi)), ease.inOut(clamp((b - t) / fo)));
  function update(t, camera = null) {
    root.updateMatrixWorld(true);
    // layout (chain: 3 hops over the back to the left, 1 and 2 slide right)
    const jk = chain ? ease.inOut(prog(t, tm.join[0], tm.join[1])) : 0;
    for (let n = 1; n <= 3; n++) {
      const h = parts[n].holder, x = lerp(SLOT_X[n], CHAIN_X[n], jk);
      h.position.set(x, n === 3 ? 0.28 * Math.sin(Math.PI * jk) : 0, PART_Z + (n === 3 ? -0.5 * Math.sin(Math.PI * jk) : 0));
    }
    con.forEach((m, i) => { const k = chain ? ease.outBack(prog(t, tm.join[1] - 0.1, tm.join[1] + 0.3 + i * 0.1)) : 0; m.visible = k > 0.01; m.scale.set(Math.max(0.001, k), 1, 1); });
    // which part is in focus
    const focus = [0, 0, 0, 0];
    for (const p of plays) focus[p.n] = Math.max(focus[p.n], winK(t, p.a - 0.15, p.b));
    if (chain && t > tm.flow[2] + L(2) / plays[2].rate + 0.2) for (let n = 1; n <= 3; n++) focus[n] = Math.max(focus[n], ease.inOut(prog(t, tm.flow[2] + L(2) / plays[2].rate + 0.2, tm.flow[2] + L(2) / plays[2].rate + 0.8)));
    for (let n = 1; n <= 3; n++) {
      const P = parts[n];
      const others = Math.max(...[1, 2, 3].filter(m => m !== n).map(m => focus[m]));
      const rest = learned(n) ? 0 : 0.86;
      const dim = lerp(lerp(rest, Math.max(rest, chain ? 0.55 : 0.72), others), 0, focus[n]);
      P.dimU.value = dim;
      // local mechanism time
      let lt;
      const mine = plays.filter(p => p.n === n && t >= p.a - 1e-6);
      if (mine.length) { const p = mine[mine.length - 1]; lt = (t - p.a) * p.rate; }
      else lt = learned(n) ? 99 : 0;
      if (shot === 'overview' || shot === 'finale') { const per = L(n) + 2.2; lt = learned(n) ? ((t - t0 + n * 1.3) % per + per) % per : 0; if (shot === 'finale' && n !== lesson) lt = 99; }
      const hideItem = chain && ((n === 3 && t >= tm.flow[1]) || (n === 1 && t >= tm.flow[2]) || (n === 1 && t < tm.flow[1] && t >= tm.join[0]) || (n === 2 && t < tm.flow[2] && t >= tm.join[0]) || (n === 3 && t < tm.flow[0] && t >= tm.join[0]));
      if (chain && ((n === 3 && t < tm.flow[0]) || (n === 1 && t < tm.flow[1]) || (n === 2 && t < tm.flow[2]))) lt = t < tm.join[0] ? 99 : 0;
      DETAIL = !!camera && camera.position.distanceTo(P.holder.getWorldPosition(tmp)) < detailD();
      P.act(clamp(lt, 0, L(n)), { hideItem });
      DETAIL = true;
      P.plate.userData.setStyle(focus[n] > 0.5 || (shot === 'finale' && n === lesson) ? 'cur' : learned(n) || (shot === 'ride' && lesson === 1 && plays.some(p => p.n === n && t > p.b)) ? 'alive' : 'gray');
      P.glow.material.opacity = 0.75 * focus[n];
    }
    if (qs) {
      const qk = ease.outBack(prog(t, tm.ask - 0.05, tm.ask + 0.4));
      qs.visible = qk > 0.01; qs.position.copy(signPos()); qs.position.y += 0.006 * Math.sin(t * 2.2); qs.scale.setScalar(Math.max(0.001, qk));
      cur.plate.visible = !qs.visible;
    }
    if (camera) {
      land.worldToLocal(camLocal.copy(camera.position));
      for (let n = 1; n <= 3; n++) { const p = parts[n].plate; p.getWorldPosition(tmp); land.worldToLocal(tmp); p.rotation.y = Math.atan2(camLocal.x - tmp.x, camLocal.z - tmp.z); }
      if (qs) { qs.rotation.y = Math.atan2(camLocal.x - qs.position.x, camLocal.z - qs.position.z); }
    }
  }
  update(t0);

  return {
    root, land, times: tm, stops, cams, cam, applyCam, update, parts, duration: tm.end - t0,
    /** world position of part n's footprint centre (on the board) */
    partWorld: (n) => { root.updateMatrixWorld(true); return parts[n].holder.localToWorld(V(0, 0, 0)); },
    /** world position of part n's moving item (work order / report / done check) as last posed by update() */
    itemWorld: (n) => { root.updateMatrixWorld(true); return parts[n].item.localToWorld(V(0, 0.04, 0)); },
  };
}
export { makeCourseMapPstack as makeCourseMap };
export default makeCourseMapPstack;
