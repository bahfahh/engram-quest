// Classroom course map: the example eight-lesson course (AI Engineering). Shared component; API: times, cam(t), applyCam,
// update(t, cam), texts(cam), readNeed, inShot, clearX, tableBox.
// The table is a two-step display stand that reads like two lines of text: lessons 1–4 on the front step, 5–8 on the raised
// back step, both left to right. Front-row name plates hang on the front step's edge (below their parts); back-row plates stand
// on small signs behind their parts (above them): a plate never covers a part.
// Each part is a small working model of that lesson's core mechanism:
//   1 Learned program: left, a code card with one line lit red (the line you could fix); right, blue data points grow a curve, the
//                      same question card goes in twice and comes out once ✓ green, once ✗ red; a magnifier sweeps the curve and finds no such line
//   2 Bias / variance: two targets; blue hits cluster off-centre on the left (red arrow = bias), scatter round the centre on the right (red ring = variance)
//   3 Error analysis : red error cards drop one by one into 4 yellow bins; the bars behind grow to 40 / 30 / 20 / 10 and the tallest turns full red
//   4 Metrics        : a yellow net scoops a pool of green balls (should catch) and grey balls (should not); 3 green + 1 grey in the
//                      basket = precision 3/4, 2 green left in the pool = recall 3/5
//   5 Eval set       : a pile of chat logs → 3 picked → marked ✓ / ✗ → filed into the eval booklet; beside it a brass balance (the judge)
//                      whose right pan flips from ✗ to ✓, agrees with the left pan (human) and levels
//   6 Data processing: a conveyor; the duplicate drops at the yellow gate → three category piles → the tall pile loses one, the short
//                      one gains a synthetic card → the v1.1 version stamp lands
//   7 Drift and cost : a blue hill (the question distribution) slides right, leaving its dashed outline, a red arrow marks the shift;
//                      beside it a stack of silver coins (cost per answer) flies off coin by coin
//   8 SLOs and incidents: a green error-budget battery; a red lamp flashes (incident) and burns a chunk; a yellow review note sticks
//                      on; beside it a purple standard line moves up (purple loop arrow)
// Closing shot 'chain': two walkways light up (in front of the front step, in front of the back-step parts); a conversation card walks
// 1 → 4, jumps to 5 on the back step like a line break, walks on to 8; the path it has walked turns gold, each part replays as the card
// reaches it, and finally all eight light together.
// Colours (the course's SERIES.md §5, one colour = one quantity): blue = data and learned model behaviour (concept), yellow = method /
// tool, green = right / ready to use, red = wrong / diagnosis, purple = loop; grey = irrelevant.
// Docs: /lib/classroom/COURSEMAP-AIENG.md
//
//   import { makeCourseMapAIEng } from '/lib/classroom/coursemap-aieng.js';
//   const map = await makeCourseMapAIEng({ lesson: 4, t0: 21.3, question: '「答得好」怎麼量？' });   // question drawn on screen ("How do you measure 'a good answer'?")
//   scene.add(map.root);
//   window.renderAt = t => { map.applyCam(cam, t); map.update(t, cam); renderer.render(scene, cam); };
//   window.TEXTS = t => map.texts(cam);      // name plates, question card → readcheck.cjs
//
// update(t) / cam(t) are pure functions of t: every frame resets every moving property, no state accumulates; no Date, no
// Math.random (seeded S.rng only).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';

const { clamp, lerp, prog, ease } = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ZH = 'Chiron GoRound TC', EN = 'Inter';
const ASPECT = 16 / 9, DEG = Math.PI / 180;

/** colour meanings (the course's SERIES.md §5): one colour = one quantity */
export const COL = {
  concept: '#2F6FD6',      // blue: data and learned model behaviour (data points, learned curve, prediction hits, question distribution)
  method: '#E9B320',       // yellow: methods and tools (bins, net, balance, gate, review note)
  methodDk: '#B8860B',
  ok: '#1F9D55',           // green: right / ready to use (correct answer, should-catch, ✓, remaining error budget)
  diag: '#E5484D',         // red: wrong / diagnosis (the bug line, wrong answer, error cards, bias arrow, drift shift, incident)
  diagLt: '#F2A7A7',
  loop: '#7C5CD6',         // purple: loop (incident → review → raise the standard)
  gray: '#A3A8B0',         // grey: irrelevant
  paper: '#fffaf0', ink: '#3b2a20', slab: '#f6ecda', wood: '#c98f5c', woodDk: '#8a5a36', navy: '#34405a', cash: '#C9CED6',
  catA: '#EAD9B6', catB: '#B98256', catC: '#7B8794',   // data categories (neutral colours, no meaning)
};
export const PARTS_AIENG = [null,
  { n: 1, name: '學來的程式' },
  { n: 2, name: '偏差／變異' },
  { n: 3, name: '錯誤分類' },
  { n: 4, name: '指標' },
  { n: 5, name: '考題集' },
  { n: 6, name: '資料處理' },
  { n: 7, name: '漂移與成本' },
  { n: 8, name: '約定與事故' },
];
const NP = 8;
const L_PART = [0, 5.0, 4.4, 4.2, 4.4, 5.0, 4.6, 4.4, 4.4];   // one play of each mechanism at speed 1 (s)
const SP = 0.8;                                  // column spacing
const COLX = [-1.5 * SP, -0.5 * SP, 0.5 * SP, 1.5 * SP];
const ROW_F = 0.42, ROW_B = -0.5;               // front row z, back row z
const H1 = 0.17, H2 = 0.40;                      // a two-step stand: front step top, back step top
const ZF1 = ROW_F + 0.28, ZB1 = ROW_B + 0.45;    // front edge of the front step / of the back step
const BASE_W = 0.7, BASE_D = 0.5, BH = 0.03;     // each part stands on its own slab
const PLATE_H = 0.15;
const BACK_S = 1.12;                             // back-row parts are drawn 12 % bigger (perspective)                            // name plate height
const SIGN_UP = 0.44, SIGN_Z = -0.22;            // back row: the name sign stands on two posts behind the part, this high above the step
const Z_LF = ZF1 + 0.17;                         // chain: front walkway (on the board, below the hanging name plates)
const Z_LB = ZB1 - 0.09;                         // chain: back walkway (on the back step, in front of the back parts)
const X_START = COLX[0] - 0.4, X_STOP = COLX[3] + 0.4;
const BOARD_W = 2 * (X_STOP + 0.12), BOARD_Z0 = ROW_B - BASE_D / 2 - 0.1, BOARD_Z1 = Z_LF + 0.12;
const BOARD_D = BOARD_Z1 - BOARD_Z0, BOARD_ZC = (BOARD_Z0 + BOARD_Z1) / 2;
const TABLE_H = 0.40, G = 0.475;
/** where part n stands (land-local): front step 1→4 and back step 5→8, both left to right (read like two lines of text) */
const SLOT = (n) => n <= 4 ? { x: COLX[n - 1], y: H1, z: ROW_F, row: 'f', col: n - 1 } : { x: COLX[n - 5], y: H2, z: ROW_B, row: 'b', col: n - 5 };
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
  mat.customProgramCacheKey = () => 'aedim';
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
function coinGeo(r, h, seed) { return lumpy(new THREE.CylinderGeometry(r, r, h, 28, 1), 0.0006, 30, seed); }
/** a thin rod between two points (string, rope, link) */
function rod(r, mat) { const m = mesh(new THREE.CylinderGeometry(r, r, 1, 8, 1), mat); m.castShadow = false; m.userData.set = (a, b) => { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, Math.max(1e-4, L), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }; return m; }

// ---------------------------------------------------------------- small shared pieces
/** a plane carrying a canvas that is redrawn only when its key changes */
function canvasPlane(w, h, cw, chh, { emissive = 0.3 } = {}) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh; const c = cv.getContext('2d');
  const tex = canvasTexture(cv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: emissive }));
  let key = null;
  return { m, c, cv, tex, redraw(k, fn) { if (k === key) return; key = k; c.clearRect(0, 0, cw, chh); fn(c, cw, chh); tex.needsUpdate = true; } };
}
/** a framed board standing on the slab, leaning back a little; returns { g, plane } (plane = canvasPlane) */
function easel(w, h, cw, chh, { frame = COL.wood, tilt = 0.2, seed = 1, emissive = 0.3 } = {}) {
  const g = new THREE.Group(); g.rotation.x = -tilt;
  g.add(mesh(rbox(w + 0.018, h + 0.018, 0.016, 0.012, seed), M(frame), 0, h / 2 + 0.004, -0.0095));
  const p = canvasPlane(w, h, cw, chh, { emissive }); p.m.position.set(0, h / 2 + 0.004, 0.0004); g.add(p.m);
  return { g, p };
}
const _chip = {};
function chipTex(kind) {
  if (!_chip[kind]) _chip[kind] = textTex([kind === 'ok' ? '✓' : '✗'], { ch: 0.03, bg: kind === 'ok' ? COL.ok : COL.diag, ink: '#ffffff', padX: 0.28, padY: 0.24, radius: 0.3, minW: 0.036, minH: 0.036 });
  return _chip[kind];
}
/** a ✓ (green) or ✗ (red) tile, anchored bottom centre, facing +z */
function chip(kind, s = 0.045) {
  const g = new THREE.Group(); const back = mesh(rbox(s + 0.008, s + 0.008, 0.008, 0.006, kind === 'ok' ? 71 : 72), M(kind === 'ok' ? '#167a42' : '#b8363a'), 0, s / 2, -0.005); g.add(back);
  const mk = (k) => { const tt = chipTex(k); const f = face(tt, { emissive: 0.3 }); f.scale.set(s / tt.w, s / tt.h, 1); f.position.y = s / 2; return f; };
  const f = mk(kind); g.add(f);
  /** swap ✓ / ✗ */
  g.userData.set = (k) => { f.userData.setTex(chipTex(k)); back.material.color.set(k === 'ok' ? '#167a42' : '#b8363a'); };
  return g;
}
/** a small label lying in front of something; its text only shows when pushed in (bars in the wide shot) */
let LABELS = null;   // labels collected while a part is being built: hidden in the wide shot (bars there are only clutter)
function label(lines, { bg = COL.paper, ink = COL.ink, ch = 0.025, tilt = 0.55, border = null } = {}) {
  const s = sign(dual([].concat(lines), { ch, bg, ink, padX: 0.32, padY: 0.2, border, bw: 5 }), { board: null, tilt });
  if (LABELS) LABELS.push(s);
  return s;
}
/** flat arrow head + shaft as a rod between two points (a, b), for the red diagnosis marks */
function arrowRod(r, mat) {
  const g = new THREE.Group(); const sh = rod(r, mat); g.add(sh);
  const head = mesh(new THREE.ConeGeometry(r * 3.2, r * 7, 12), mat); head.castShadow = false; g.add(head);
  g.userData.set = (a, b) => { const d = b.clone().sub(a), L = d.length(); if (L < 1e-4) { g.visible = false; return; } g.visible = true; const dn = d.clone().normalize(); const hb = b.clone().addScaledVector(dn, -r * 3.5); sh.userData.set(a, hb); head.position.copy(hb).addScaledVector(dn, r * 3.5 * 0.5); head.quaternion.setFromUnitVectors(V(0, 1, 0), dn); };
  return g;
}
/** a conversation-log card texture (two chat bubbles, neutral colours) */
let _chatTT = null;
function chatTT() {
  if (_chatTT) return _chatTT;
  const cv = document.createElement('canvas'); cv.width = 220; cv.height = 166; const c = cv.getContext('2d');
  c.fillStyle = COL.paper; c.beginPath(); c.roundRect(2, 2, 216, 162, 20); c.fill(); c.strokeStyle = '#d9cbb3'; c.lineWidth = 6; c.stroke();
  c.fillStyle = '#d7d2c8'; c.beginPath(); c.roundRect(18, 20, 140, 46, 16); c.fill();
  c.fillStyle = '#e8cfa8'; c.beginPath(); c.roundRect(62, 80, 140, 66, 16); c.fill();
  c.fillStyle = '#8f8678'; for (const [x, y, w] of [[34, 38, 96], [78, 100, 104], [78, 120, 70]]) { c.fillRect(x, y, w, 9); }
  _chatTT = { tex: canvasTexture(cv), w: 0.09, h: 0.068 };
  return _chatTT;
}
const SLAB = COL.slab;

// ---------------------------------------------------------------- part 1: a written program has a line to fix; a learned one has none
function buildP1() {
  const g = new THREE.Group(); slab(g, SLAB, 101);
  // left: the code card; the bug line (LINES[HI]) lights red: that line can be fixed
  const code = easel(0.28, 0.3, 500, 540, { frame: '#5b4636', seed: 110, emissive: 0.4 }); code.g.position.set(-0.18, BH, -0.1); g.add(code.g);
  const LINES = ['def 維修費(機型, 保固):', '  if 保固內:', '    費用 = 600', '  else:', '    費用 = 價目表[機型]', '  return 費用'];
  const HI = 2;
  function drawCode(hiK) {
    code.p.redraw(`${hiK.toFixed(2)}|${DETAIL}`, (c, W, H) => {
      c.fillStyle = '#273041'; c.beginPath(); c.roundRect(0, 0, W, H, 26); c.fill();
      for (let i = 0; i < 3; i++) { c.fillStyle = ['#8a93a3', '#a6aebb', '#c2c8d1'][i]; c.beginPath(); c.arc(34 + i * 30, 30, 9, 0, 7); c.fill(); }
      LINES.forEach((s, i) => {
        const y = 108 + i * 72, ind = s.match(/^ */)[0].length * 15;
        if (i === HI && hiK > 0) { c.save(); c.globalAlpha = hiK; c.fillStyle = COL.diag; c.beginPath(); c.roundRect(12, y - 50, W - 24, 68, 14); c.fill(); c.restore(); }
        const col = i === HI && hiK > 0.5 ? '#ffffff' : '#c9d3e3';
        if (DETAIL) drawText(c, s.trim(), 26 + ind, y, 36, col, 'left');
        else { c.save(); c.globalAlpha = 0.85; c.fillStyle = col; c.beginPath(); c.roundRect(28 + ind, y - 30, Math.min(W - 70 - ind, 17 * s.trim().length + 24), 22, 11); c.fill(); c.restore(); }
      });
    });
  }
  // right: data points grow a learned curve (blue)
  const pnl = easel(0.3, 0.245, 540, 440, { seed: 112 }); pnl.g.position.set(0.17, BH, -0.1); g.add(pnl.g);
  const rr = S.rng(1788), cy = (u) => 0.72 - 0.48 * u + 0.16 * Math.sin(u * 5.2);
  const DOTS = Array.from({ length: 16 }, () => { const u = 0.04 + rr() * 0.92; return { u, v: cy(u) + (rr() - 0.5) * 0.22 }; });
  function drawPanel(k, msg) {
    pnl.p.redraw(`${k.toFixed(3)}|${DETAIL}|${msg}`, (c, W, H) => {
      c.fillStyle = COL.paper; c.fillRect(0, 0, W, H);
      const X = (u) => 46 + u * (W - 84), Y = (v) => 24 + v * (H - 84);
      c.strokeStyle = '#d6c9b1'; c.lineWidth = 5; c.beginPath(); c.moveTo(46, 24); c.lineTo(46, H - 56); c.lineTo(W - 26, H - 56); c.stroke();
      c.fillStyle = COL.concept; c.globalAlpha = 0.5; for (const d of DOTS) { c.beginPath(); c.arc(X(d.u), Y(d.v), 12, 0, 7); c.fill(); } c.globalAlpha = 1;
      if (k > 0.001) { c.strokeStyle = COL.concept; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 60; i++) { const u = k * i / 60; const x = X(u), y = Y(cy(u)); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
      if (DETAIL) drawText(c, '學來的傾向', 66, 68, 42, COL.concept, 'left');
      if (DETAIL && msg) { c.fillStyle = 'rgba(255,250,240,0.92)'; c.beginPath(); c.roundRect(W / 2 - 200, H - 158, 400, 76, 18); c.fill(); drawText(c, '找不到「那一行」', W / 2 + 20, H - 105, 42, '#5d544a'); }
    });
  }
  // the same question card goes in twice; out come ✓ (green) and ✗ (red)
  const qT = textTex(['?'], { ch: 0.042, bg: COL.paper, ink: COL.ink, minW: 0.07, minH: 0.055, padX: 0.2, padY: 0.1, border: '#c9b48f', bw: 6 });
  const q = card(qT, { w: 0.07, h: 0.055, sled: null, lean: 0.45 }); g.add(q);
  const outs = [chip('ok', 0.06), chip('bad', 0.06)]; outs.forEach(o => g.add(o));
  // a magnifier looks for "the line" in the curve and finds none
  const lens = new THREE.Group(); g.add(lens);
  const ring = mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 32), M('#3b3f47', { rough: 0.4 })); lens.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.045, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false })); lens.add(glass);
  const hdl = mesh(rbox(0.014, 0.075, 0.014, 0.006, 115), M('#3b3f47')); hdl.position.set(0.045, -0.07, 0); hdl.rotation.z = 0.6; lens.add(hdl);
  lens.rotation.x = -0.2;
  const L = L_PART[1], IN = [2.0, 2.9], LAND = [V(0.1, BH, 0.09), V(0.24, BH, 0.09)];
  function act(lt) {
    drawCode(ease.out(prog(lt, 0.25, 0.6)));
    code.g.scale.setScalar(1 + 0.05 * bump(lt, 0.25, 0.8));
    drawPanel(ease.inOut(prog(lt, 0.6, 1.8)), lt > 4.25);
    let qv = false;
    IN.forEach((a, i) => {
      if (lt >= a - 0.02 && lt < a + 0.46) {
        qv = true; const u = ease.inOut(prog(lt, a, a + 0.45));
        q.position.set(lerp(-0.03, 0.17, u), BH + lerp(0, 0.09, u) + 0.07 * Math.sin(Math.PI * u), lerp(0.12, -0.06, u));
        q.scale.setScalar(Math.max(0.001, 1 - 0.85 * ease.in(prog(lt, a + 0.28, a + 0.45))));
      }
      const o = outs[i], b = a + 0.45, k = ease.inOut(prog(lt, b, b + 0.35));
      o.visible = lt >= b;
      const p = V(0.17, BH + 0.05, -0.05).lerp(LAND[i], k); p.y += 0.08 * Math.sin(Math.PI * k);
      o.position.copy(p); o.rotation.x = -0.5; o.scale.setScalar(Math.max(0.001, 0.5 + 0.5 * k + 0.15 * bump(lt, b + 0.3, b + 0.55)));
    });
    q.visible = qv;
    const lk = prog(lt, 3.85, 4.75);
    lens.visible = lt > 3.8 && lt < 4.95;
    lens.position.set(lerp(0.06, 0.29, ease.inOut(lk)), BH + 0.14 + 0.02 * Math.sin(lk * 9), -0.05);
    lens.scale.setScalar(Math.max(0.001, Math.min(pop(lt, 3.8, 0.25), 1 - prog(lt, 4.75, 4.95))));
  }
  return { g, L, act, item: pnl.g };
}

// ---------------------------------------------------------------- part 2: two targets — bias (tight but off-centre) vs variance (spread around the centre)
let _tgtTex = null;
function targetTex() {
  if (_tgtTex) return _tgtTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d');
  const R = [1, 0.8, 0.6, 0.4, 0.2], colr = ['#f3ead8', '#d9c4a0', '#f3ead8', '#d9c4a0', '#2d3748'];
  R.forEach((r, i) => { c.fillStyle = colr[i]; c.beginPath(); c.arc(256, 256, 254 * r, 0, 7); c.fill(); });
  c.strokeStyle = '#b89c74'; c.lineWidth = 4; for (const r of R) { c.beginPath(); c.arc(256, 256, 254 * r, 0, 7); c.stroke(); }
  return (_tgtTex = canvasTexture(cv));
}
function buildP2() {
  const g = new THREE.Group(); slab(g, SLAB, 201);
  const R = 0.14, CY = 0.18, TILT = -0.28;
  const rr = S.rng(2002);
  const sides = [-0.165, 0.165].map((x, i) => {
    const tg = new THREE.Group(); tg.position.set(x, BH, -0.06); g.add(tg);
    tg.add(mesh(cyl(0.009, 0.011, CY, 8, 210 + i), M(COL.woodDk), 0, CY / 2, -0.035));
    tg.add(mesh(rbox(0.09, 0.012, 0.07, 0.005, 214 + i), M(COL.woodDk), 0, 0.006, -0.035));
    const disc = new THREE.Group(); disc.position.set(0, CY, 0); disc.rotation.x = TILT; tg.add(disc);
    const back = mesh(cyl(R + 0.012, R + 0.012, 0.018, 40, 216 + i), M(COL.wood)); back.rotation.x = Math.PI / 2; back.position.z = -0.011; disc.add(back);
    const tex = targetTex();
    disc.add(new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.2 })));
    // hits (disc-local): left = a tight cluster off the centre (bias); right = spread around the centre (variance)
    const hits = i === 0
      ? Array.from({ length: 5 }, (_, k) => V(-0.06 + (rr() - 0.5) * 0.032, 0.055 + (rr() - 0.5) * 0.032, 0.012))
      : Array.from({ length: 5 }, (_, k) => { const a = k * 2 * Math.PI / 5 + 0.5 + (rr() - 0.5) * 0.5, r = 0.07 + rr() * 0.035; return V(Math.cos(a) * r, Math.sin(a) * r, 0.012); });
    const darts = hits.map((h, k) => {
      const d = new THREE.Group(); d.add(mesh(sph(0.02, 220 + k), M(COL.concept, { rough: 0.45 })));
      const tail = mesh(cyl(0.004, 0.004, 0.03, 6, 230 + k), M('#e9eef7')); tail.rotation.x = Math.PI / 2; tail.position.z = 0.02; d.add(tail);
      disc.add(d); return d;
    });
    const mark = arrowRod(0.0085, M(COL.diag, { rough: 0.5 })); disc.add(mark);
    const ring = mesh(new THREE.TorusGeometry(0.11, 0.008, 8, 48), M(COL.diag, { rough: 0.5 })); ring.position.z = 0.016; disc.add(ring);
    const cen = hits.reduce((a, b) => a.clone().add(b), V(0, 0, 0)).multiplyScalar(1 / hits.length);
    const lab = label(i === 0 ? '偏差' : '變異', { bg: COL.diag, ink: '#ffffff', ch: 0.028 }); lab.position.set(x, BH, 0.17); g.add(lab);
    return { tg, disc, hits, darts, mark, ring, cen, lab };
  });
  const L = L_PART[2];
  const SHOT = [[0.3, 0.9, 1.5, 2.1, 2.7], [0.6, 1.2, 1.8, 2.4, 3.0]];
  const START = V(0, -0.22, 0.42);
  function act(lt) {
    sides.forEach((s, i) => {
      s.darts.forEach((d, k) => {
        const a = SHOT[i][k], u = ease.out(prog(lt, a, a + 0.28));
        d.visible = lt >= a; const p = START.clone().lerp(s.hits[k], u); p.y += 0.06 * Math.sin(Math.PI * u); d.position.copy(p);
        d.scale.setScalar(1 + 0.25 * bump(lt, a + 0.24, a + 0.42));
      });
      if (i === 0) { const k = ease.inOut(prog(lt, 3.3, 3.75)); s.mark.userData.set(V(0, 0, 0.02), V(0, 0, 0.02).lerp(V(s.cen.x, s.cen.y, 0.02), k)); s.mark.visible = k > 0.03; s.ring.visible = false; }
      else { s.mark.visible = false; const k = pop(lt, 3.45, 0.35); s.ring.visible = lt > 3.45; s.ring.scale.setScalar(k); }
      s.lab.visible = lt > 3.35; s.lab.scale.setScalar(pop(lt, 3.35 + i * 0.12, 0.3)); s.lab.userData.sync();
    });
  }
  return { g, L, act, item: sides[0].disc };
}

// ---------------------------------------------------------------- part 3: error analysis — red error cards drop into four bins; bars grow to 40/30/20/10
function buildP3() {
  const g = new THREE.Group(); slab(g, SLAB, 301);
  const BX = [-0.24, -0.08, 0.08, 0.24], BZ = 0.08, UNIT = 0.05, BW = 0.13;
  const NAMES = [['沒撈到', '40'], ['沒用上', '30'], ['問題模糊', '20'], ['其他', '10']];
  const bars = BX.map((x, i) => {
    const tray = new THREE.Group(); tray.position.set(x, BH, BZ); g.add(tray);
    tray.add(mesh(rbox(BW, 0.05, 0.1, 0.01, 310 + i), M(COL.method), 0, 0.025, 0));
    tray.add(mesh(rbox(BW - 0.024, 0.008, 0.074, 0.003, 314 + i), M(COL.methodDk), 0, 0.049, 0));
    const bar = mesh(rbox(0.09, 1, 0.06, 0.004, 318 + i, 0.0004), M(COL.diagLt)); bar.position.set(x, BH, -0.1); g.add(bar);
    const lab = label([{ s: NAMES[i][0] }, { s: NAMES[i][1] + '%', k: 1.15 }], { ch: 0.021, tilt: 0.55 }); lab.position.set(x, BH, 0.17); g.add(lab);
    return { bar, lab };
  });
  const SEQ = [0, 1, 0, 2, 1, 0, 3, 2, 1, 0], AT = (i) => 0.3 + 0.27 * i, rr = S.rng(303);
  const cards = SEQ.map((b, i) => { const m = mesh(rbox(0.08, 0.009, 0.058, 0.003, 330 + i), M(COL.diag, { rough: 0.6 })); m.userData.ry = (rr() - 0.5) * 0.8; g.add(m); return m; });
  const L = L_PART[3];
  function act(lt) {
    const h = [0, 0, 0, 0];
    SEQ.forEach((b, i) => {
      const a = AT(i), k = prog(lt, a, a + 0.3), c = cards[i];
      c.visible = lt >= a && lt < a + 0.32;
      c.position.set(BX[b], lerp(0.44, BH + 0.06, ease.in(k)), BZ); c.rotation.set(0.25 * (1 - k), c.userData.ry, 0.5 * (1 - k));
      h[b] += ease.out(prog(lt, a + 0.26, a + 0.42));
    });
    const hk = ease.inOut(prog(lt, 3.3, 3.7));
    bars.forEach((B, i) => {
      const H = Math.max(0.002, h[i] * UNIT); B.bar.scale.set(1, H, 1); B.bar.position.y = BH + H / 2;
      if (i === 0) { B.bar.material.color.set(COL.diagLt).lerp(new THREE.Color(COL.diag), hk); const s = 1 + 0.14 * bump(lt, 3.3, 3.9); B.bar.scale.x = s; B.bar.scale.z = s; }
      B.lab.userData.sync();
    });
  }
  return { g, L, act, item: bars[0].bar };
}

// ---------------------------------------------------------------- part 4: precision / recall — a net scoops green (should catch) and grey (should not)
function buildP4() {
  const g = new THREE.Group(); slab(g, SLAB, 401);
  const PC = V(-0.1, 0, 0.0), RX = 0.165, RZ = 0.13, WY = BH + 0.048;
  const tub = mesh(new THREE.CylinderGeometry(1, 0.94, 0.05, 40, 1), M('#b3a089')); tub.scale.set(RX + 0.018, 1, RZ + 0.018); tub.position.set(PC.x, BH + 0.025, PC.z); g.add(tub);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M('#bcd8d4', { rough: 0.3 })); water.rotation.x = -Math.PI / 2; water.scale.set(RX, RZ, 1); water.position.set(PC.x, WY, PC.z); g.add(water);
  const BALLS = [
    { x: 0.02, z: -0.02, ok: 1, c: 0 }, { x: 0.068, z: 0.028, ok: 1, c: 1 }, { x: -0.005, z: 0.05, ok: 1, c: 2 }, { x: 0.06, z: -0.045, ok: 0, c: 3 },
    { x: -0.11, z: -0.035, ok: 1 }, { x: -0.095, z: 0.06, ok: 1 }, { x: -0.045, z: -0.08, ok: 0 }, { x: -0.135, z: 0.012, ok: 0 }, { x: 0.112, z: 0.07, ok: 0 }];
  const BR = 0.025;
  BALLS.forEach((b, i) => { b.m = mesh(sph(BR, 410 + i), M(b.ok ? COL.ok : COL.gray, { rough: 0.5 })); g.add(b.m); b.w = V(PC.x + b.x, WY + BR * 0.55, PC.z + b.z); });
  const missed = BALLS.filter(b => b.ok && b.c == null);
  const rings = missed.map((b, i) => { const r = mesh(new THREE.TorusGeometry(0.036, 0.005, 8, 32), new THREE.MeshBasicMaterial({ color: COL.ok })); r.rotation.x = -Math.PI / 2; r.position.set(b.w.x, WY + 0.004, b.w.z); r.castShadow = false; g.add(r); return r; });
  // net (method: yellow)
  const net = new THREE.Group(); g.add(net);
  const hoop = mesh(new THREE.TorusGeometry(0.078, 0.007, 8, 40), M(COL.method, { rough: 0.5 })); hoop.rotation.x = Math.PI / 2; net.add(hoop);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.076, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })); bag.scale.y = 0.75; net.add(bag);
  const hd = rod(0.006, M(COL.methodDk)); hd.userData.set(V(0.078, 0, 0), V(0.2, 0.09, -0.03)); net.add(hd);
  // basket
  const BK = V(0.205, BH, 0.07);
  const basket = new THREE.Group(); basket.position.copy(BK); g.add(basket);
  basket.add(mesh(new THREE.CylinderGeometry(0.075, 0.064, 0.07, 24, 1, true), M('#a87a4c'), 0, 0.035, 0));
  basket.children[0].material.side = THREE.DoubleSide;
  basket.add(mesh(cyl(0.064, 0.064, 0.008, 24, 431), M('#8a5f38'), 0, 0.004, 0));
  basket.add(mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 32), M('#8a5f38'), 0, 0.07, 0)); basket.children[2].rotation.x = Math.PI / 2;
  const SLOTP = [V(-0.024, 0, -0.022), V(0.024, 0, -0.022), V(-0.024, 0, 0.024), V(0.024, 0, 0.024)];
  // fraction signs: precision 3/4 behind the basket, recall 3/5 behind the pond
  const fT = (s) => textTex([s], { ch: 0.042, bg: COL.paper, ink: COL.ink, border: COL.ink, bw: 6, padX: 0.3, padY: 0.18, radius: 0.25 });
  const pS = sign(fT('3/4'), { board: '#8a5a36', post: 0.12, tilt: 0.2 }); pS.position.set(BK.x, BH, -0.1); g.add(pS);
  const rS = sign(fT('3/5'), { board: '#8a5a36', post: 0.12, tilt: 0.2 }); rS.position.set(PC.x - 0.14, BH, -0.19); g.add(rS);
  const pL = label('精確率'); pL.position.set(BK.x, BH, 0.185); g.add(pL);
  const rL = label('召回率'); rL.position.set(PC.x - 0.05, BH, 0.185); g.add(rL);
  const NC = V(PC.x + 0.034, 0, PC.z + 0.004);
  const L = L_PART[4];
  function act(lt) {
    const y = track([[0, 0.25], [0.3, 0.25], [0.75, WY + 0.03], [0.95, WY + 0.03], [1.35, 0.25], [2.75, 0.25], [3.1, 0.3]], lt);
    const x = track([[1.35, NC.x], [1.9, BK.x], [2.75, BK.x], [3.1, 0.03]], lt), z = track([[1.35, NC.z], [1.9, BK.z], [2.75, BK.z], [3.1, -0.17]], lt);
    const tilt = track([[1.9, 0], [2.15, 1.0], [2.45, 1.0], [2.75, 0]], lt);
    net.position.set(x, y, z); net.rotation.z = tilt;
    BALLS.forEach((b, i) => {
      const bob = 0.004 * Math.sin(lt * 3 + i);
      if (b.c == null) { b.m.position.copy(b.w); b.m.position.y += bob; return; }
      const held = V(x + (b.w.x - NC.x) * 0.45, y - 0.035, z + (b.w.z - NC.z) * 0.45);
      const inB = BK.clone().add(SLOTP[b.c]); inB.y = BH + 0.03 + (b.c >= 2 ? 0.006 : 0);
      let p;
      if (lt < 0.72) { p = b.w.clone(); p.y += bob; }
      else if (lt < 0.98) p = b.w.clone().lerp(held, ease.inOut(prog(lt, 0.72, 0.98)));
      else if (lt < 2.12 + b.c * 0.05) p = held;
      else { const k = prog(lt, 2.12 + b.c * 0.05, 2.42 + b.c * 0.05); p = held.lerp(inB, ease.in(k)); }
      b.m.position.copy(p);
    });
    const pk = pop(lt, 2.6, 0.3), rk = pop(lt, 2.95, 0.3);
    pS.visible = lt > 2.6; pS.scale.setScalar(pk); rS.visible = lt > 2.95; rS.scale.setScalar(rk);
    pS.userData.sync(); rS.userData.sync(); pL.userData.sync(); rL.userData.sync();
    pL.visible = lt > 2.6; rL.visible = lt > 2.95;
    rings.forEach((r, i) => { const k = prog(lt, 3.0, 3.25); r.visible = k > 0; r.scale.setScalar(Math.max(0.001, k * (1 + 0.15 * Math.sin((lt - 3.0) * 9)))); });
  }
  return { g, L, act, item: basket };
}

// ---------------------------------------------------------------- part 5: an eval set — pick logs, label ✓/✗, bind into a book; the judge (scale) aligns with the human label
function buildP5() {
  const g = new THREE.Group(); slab(g, SLAB, 501);
  const ST = V(-0.245, BH, -0.05);
  const rr = S.rng(505);
  for (let i = 0; i < 6; i++) { const m = mesh(rbox(0.1, 0.009, 0.076, 0.003, 510 + i), M(COL.paper)); m.position.set(ST.x + (rr() - 0.5) * 0.01, BH + 0.0045 + i * 0.01, ST.z); m.rotation.y = (rr() - 0.5) * 0.25; g.add(m); }
  { const tt = chatTT(); const top = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.068), new THREE.MeshStandardMaterial({ map: tt.tex, roughness: 0.9 })); top.rotation.x = -Math.PI / 2; top.position.set(ST.x, BH + 0.061, ST.z); g.add(top); }
  const picked = [0, 1, 2].map(i => { const c = card(chatTT(), { w: 0.1, h: 0.076, sled: null, lean: 0.5 }); g.add(c); return c; });
  const KIND = ['ok', 'bad', 'ok'];
  const tags = KIND.map(k => { const c = chip(k, 0.046); c.rotation.x = -0.45; g.add(c); return c; });
  const ROW = (i) => V(-0.25 + i * 0.105, BH, 0.11);
  const PICK = [0.3, 0.65, 1.0], TAG = [1.45, 1.65, 1.85], BIND = [2.3, 2.5, 2.7];
  // the book (eval set)
  const BKp = V(0.035, BH, -0.045);
  const book = new THREE.Group(); book.position.copy(BKp); g.add(book);
  book.add(mesh(rbox(0.11, 0.012, 0.14, 0.004, 520), M(COL.navy), 0, 0.006, 0));
  book.add(mesh(rbox(0.1, 0.024, 0.13, 0.003, 521), M('#f7f2e6'), 0, 0.024, 0));
  const hinge = new THREE.Group(); hinge.position.set(-0.055, 0.037, 0); book.add(hinge);
  hinge.add(mesh(rbox(0.11, 0.008, 0.14, 0.004, 522), M(COL.navy), 0.055, 0.004, 0));
  const bookL = label('考題冊'); bookL.position.set(BKp.x, BH, 0.06); g.add(bookL);
  // the judge: a brass scale; left pan = human label, right pan = the judge's label
  const SC = V(0.205, BH, 0.0), PIV = 0.25, ARM = 0.105;
  g.add(mesh(rbox(0.12, 0.02, 0.08, 0.008, 530), M(COL.methodDk), SC.x, BH + 0.01, SC.z));
  g.add(mesh(cyl(0.008, 0.011, PIV - 0.02, 10, 531), M(COL.method), SC.x, BH + 0.02 + (PIV - 0.02) / 2, SC.z));
  const beam = mesh(rbox(2 * ARM + 0.03, 0.012, 0.016, 0.005, 532), M(COL.method, { rough: 0.45 })); g.add(beam);
  g.add(mesh(sph(0.013, 533), M(COL.methodDk), SC.x, BH + PIV + 0.012, SC.z));
  const pans = [-1, 1].map((s, i) => {
    const p = new THREE.Group(); g.add(p);
    p.add(mesh(cyl(0.045, 0.034, 0.012, 20, 534 + i), M(COL.methodDk), 0, 0.006, 0));
    const ch = chip(i === 0 ? 'ok' : 'bad', 0.036); ch.position.set(0, 0.012, 0); ch.rotation.x = -0.35; p.add(ch);
    const strings = [rod(0.0018, M('#6b5a3a')), rod(0.0018, M('#6b5a3a'))]; strings.forEach(r => g.add(r));
    return { p, ch, s, strings };
  });
  const panL = [label('人工'), label('評審')];
  panL[0].position.set(SC.x - ARM, BH, 0.17); panL[1].position.set(SC.x + ARM, BH, 0.17); panL.forEach(l => g.add(l));
  const L = L_PART[5];
  function act(lt) {
    picked.forEach((c, i) => {
      const a = PICK[i], k = ease.inOut(prog(lt, a, a + 0.4)), b = BIND[i], kb = ease.inOut(prog(lt, b, b + 0.4));
      const from = V(ST.x, BH + 0.06, ST.z), to = ROW(i);
      const p = from.clone().lerp(to, k); p.y += 0.08 * Math.sin(Math.PI * k);
      const q = p.clone().lerp(V(BKp.x, BH + 0.04, BKp.z), kb); q.y += 0.06 * Math.sin(Math.PI * kb);
      c.visible = lt >= a && kb < 0.98; c.position.copy(q); const s = 1 - 0.65 * kb; c.scale.setScalar(Math.max(0.001, s));
      const tg = tags[i], tk = pop(lt, TAG[i], 0.25);
      tg.visible = lt >= TAG[i] && kb < 0.98; tg.position.copy(q).add(V(0.034 * s, 0.05 * s, -0.012 * s)); tg.scale.setScalar(Math.max(0.001, tk * s));
    });
    hinge.rotation.z = track([[0, 2.3], [3.05, 2.3], [3.35, 0]], lt);
    book.scale.setScalar(1 + 0.05 * bump(lt, 3.3, 3.6));
    // the judge disagrees (✗), gets calibrated, then agrees (✓): the beam levels
    const ang = track([[0, -0.2], [3.35, -0.2], [3.65, 0.16], [4.0, -0.1], [4.3, 0.04], [4.6, 0]], lt);
    beam.position.set(SC.x, BH + PIV, SC.z + 0.012); beam.rotation.z = ang;
    pans.forEach((P, i) => {
      const end = V(SC.x + P.s * ARM * Math.cos(ang), BH + PIV + P.s * ARM * Math.sin(ang), SC.z + 0.012);
      P.p.position.set(end.x, end.y - 0.13, end.z);
      P.strings[0].userData.set(end, V(end.x - 0.03, end.y - 0.124, end.z)); P.strings[1].userData.set(end, V(end.x + 0.03, end.y - 0.124, end.z));
      if (i === 1) { P.ch.userData.set(lt >= 3.95 ? 'ok' : 'bad'); P.ch.scale.setScalar(1 + 0.3 * bump(lt, 3.9, 4.2)); }
    });
    bookL.userData.sync(); panL.forEach(l => l.userData.sync());
  }
  return { g, L, act, item: beam };
}

// ---------------------------------------------------------------- part 6: data processing — dedupe at the gate, balance the categories, stamp a version
function buildP6() {
  const g = new THREE.Group(); slab(g, SLAB, 601);
  const X0 = -0.31, X1 = 0.03, BZ = -0.04, TOP = BH + 0.075, CT = 0.022;
  g.add(mesh(rbox(X1 - X0 + 0.06, 0.05, 0.12, 0.02, 610), M('#4a4f5c', { rough: 0.6 }), (X0 + X1) / 2, BH + 0.045, BZ));
  for (const x of [X0 + 0.02, X1 - 0.02]) g.add(mesh(rbox(0.03, 0.025, 0.1, 0.006, 611), M('#3b3f47'), x, BH + 0.012, BZ));
  const stripes = Array.from({ length: 6 }, (_, i) => { const m = mesh(rbox(0.01, 0.004, 0.11, 0.002, 612 + i), M('#6b7280')); g.add(m); return m; });
  // the dedupe gate (method: yellow)
  const GX = -0.15;
  for (const s of [-1, 1]) g.add(mesh(cyl(0.008, 0.009, 0.16, 8, 620 + s), M(COL.method), GX, BH + 0.08, BZ + s * 0.072));
  g.add(mesh(rbox(0.024, 0.022, 0.17, 0.008, 622), M(COL.method), GX, BH + 0.165, BZ));
  const tray = new THREE.Group(); tray.position.set(GX, BH, 0.165); g.add(tray);
  tray.add(mesh(rbox(0.1, 0.03, 0.075, 0.008, 623), M('#9aa0a8'), 0, 0.015, 0)); tray.add(mesh(rbox(0.08, 0.006, 0.055, 0.003, 624), M('#7d838c'), 0, 0.03, 0));
  const CATS = ['A', 'A', 'B', 'A', 'C', 'B', 'A'], DUP = 1, AT = (i) => 0.2 + 0.26 * i, RIDE = 0.8;
  const CC = { A: COL.catA, B: COL.catB, C: COL.catC }, SX = { A: 0.115, B: 0.2, C: 0.285 }, SZ = -0.02;
  const idx = {}; const cnt = { A: 0, B: 0, C: 0 };
  CATS.forEach((c, i) => { if (i !== DUP) idx[i] = cnt[c]++; });
  const cards = CATS.map((c, i) => { const m = mesh(rbox(0.07, CT, 0.056, 0.005, 630 + i), M(CC[c])); g.add(m); return m; });
  const syn = mesh(rbox(0.07, CT, 0.056, 0.005, 640), M('#aab3c0')); g.add(syn);
  const spark = new THREE.Group(); g.add(spark);
  for (const r of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.006, 0.003), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); s.rotation.z = r; spark.add(s); }
  const level = rod(0.0035, M(COL.ink)); g.add(level);
  // version stamp and its tag
  const TG = V(0.205, BH, 0.165);
  const blank = textTex([' '], { ch: 0.04, bg: COL.paper, minW: 0.09, minH: 0.06, padX: 0, padY: 0 });
  const v2 = textTex(['v1.1'], { ch: 0.042, bg: COL.paper, ink: COL.navy, minW: 0.09, minH: 0.06, padX: 0.1, padY: 0.05, border: COL.navy, bw: 6 });
  const tag = card(blank, { w: 0.09, h: 0.06, sled: null, lean: 0.9 }); tag.position.copy(TG); g.add(tag);
  const stamp = new THREE.Group(); g.add(stamp);
  stamp.add(mesh(rbox(0.08, 0.026, 0.06, 0.008, 650), M(COL.navy), 0, 0.013, 0));
  stamp.add(mesh(cyl(0.012, 0.015, 0.06, 10, 651), M(COL.wood), 0, 0.056, 0));
  stamp.add(mesh(sph(0.02, 652), M(COL.wood), 0, 0.09, 0));
  const dL = label('去重'); dL.position.set(-0.275, BH, 0.17); g.add(dL);
  const bL = label('配額'); bL.position.set(0.205, BH, 0.055); g.add(bL);
  const L = L_PART[6];
  function act(lt) {
    stripes.forEach((m, i) => { const x = X0 + ((i * 0.057 + lt * 0.3) % 0.34); m.position.set(x, BH + 0.071, BZ); });
    CATS.forEach((c, i) => {
      const m = cards[i], a = AT(i), u = prog(lt, a, a + RIDE);
      m.visible = lt >= a; m.rotation.set(0, 0, 0); m.scale.setScalar(1);
      if (i === DUP) {
        const at = a + RIDE * (GX - X0) / (X1 - X0);
        if (lt < at) m.position.set(lerp(X0, X1, u), TOP + CT / 2, BZ);
        else { const k = ease.inOut(prog(lt, at, at + 0.35)); const p = V(GX, TOP + CT / 2, BZ).lerp(V(GX, BH + 0.04, 0.165), k); p.y += 0.05 * Math.sin(Math.PI * k); m.position.copy(p); m.rotation.x = 1.6 * k; m.rotation.x = k > 0.98 ? 0 : m.rotation.x; }
        return;
      }
      if (lt < a + RIDE) { m.position.set(lerp(X0, X1, u), TOP + CT / 2, BZ); return; }
      const k = ease.inOut(prog(lt, a + RIDE, a + RIDE + 0.25));
      const dst = V(SX[c], BH + CT / 2 + idx[i] * CT, SZ);
      const p = V(X1, TOP + CT / 2, BZ).lerp(dst, k); p.y += 0.04 * Math.sin(Math.PI * k); m.position.copy(p);
      if (i === 6) {   // the extra A leaves (balance)
        const kr = ease.inOut(prog(lt, 3.15, 3.5)); m.position.lerp(V(SX.A + 0.02, BH + CT / 2 + idx[i] * CT + 0.03, 0.2), kr); m.scale.setScalar(Math.max(0.001, 1 - kr)); m.visible = kr < 0.99 && lt >= a;
      }
    });
    const sk = pop(lt, 3.3, 0.3); syn.visible = lt > 3.3; syn.position.set(SX.C, BH + CT / 2 + 1 * CT, SZ); syn.scale.setScalar(sk);
    spark.visible = lt > 3.3 && lt < 4.0; spark.position.set(SX.C + 0.02, BH + 2 * CT + 0.025, SZ + 0.03); spark.rotation.z = lt * 4; spark.scale.setScalar(Math.max(0.001, 1 - prog(lt, 3.7, 4.0)));
    const lk = ease.inOut(prog(lt, 3.55, 3.85)); level.visible = lk > 0.02;
    level.userData.set(V(SX.A - 0.045, BH + 2 * CT + 0.003, SZ + 0.03), V(lerp(SX.A - 0.045, SX.C + 0.045, lk), BH + 2 * CT + 0.003, SZ + 0.03));
    const sy = track([[3.6, 0.34], [3.85, 0.055], [4.05, 0.06], [4.3, 0.3]], lt);
    stamp.visible = lt > 3.55 && lt < 4.45; stamp.position.set(TG.x, sy, TG.z - 0.015); stamp.scale.setScalar(Math.max(0.001, Math.min(prog(lt, 3.55, 3.7), 1 - prog(lt, 4.3, 4.45))));
    tag.userData.face.userData.setTex(lt >= 3.86 ? v2 : blank); tag.scale.setScalar(1 + 0.12 * bump(lt, 3.86, 4.2));
    dL.userData.sync(); bL.userData.sync();
  }
  return { g, L, act, item: tag };
}

// ---------------------------------------------------------------- part 7: drift (the input distribution slides away from its old outline) and cost (coins leave)
function buildP7() {
  const g = new THREE.Group(); slab(g, SLAB, 701);
  const ch = easel(0.42, 0.26, 640, 400, { seed: 710 }); ch.g.position.set(-0.085, BH, -0.07); g.add(ch.g);
  const M0 = 0.33, M1 = 0.63, SD = 0.1;
  function draw(k, ak) {
    ch.p.redraw(`${k.toFixed(3)}|${ak.toFixed(2)}|${DETAIL}`, (c, W, H) => {
      c.fillStyle = COL.paper; c.fillRect(0, 0, W, H);
      const B = H - 70, X = (u) => 30 + u * (W - 60), PK = (B - 70);
      const hill = (m) => { c.beginPath(); c.moveTo(X(0), B); for (let i = 0; i <= 80; i++) { const u = i / 80; c.lineTo(X(u), B - PK * Math.exp(-0.5 * ((u - m) / SD) ** 2)); } c.lineTo(X(1), B); };
      c.strokeStyle = '#c9bea9'; c.lineWidth = 6; c.beginPath(); c.moveTo(24, B); c.lineTo(W - 24, B); c.stroke();
      const m = lerp(M0, M1, k);
      hill(m); c.fillStyle = 'rgba(47,111,214,0.78)'; c.fill(); c.strokeStyle = '#1f55ad'; c.lineWidth = 6; c.stroke();
      c.setLineDash([18, 12]); hill(M0); c.strokeStyle = '#857b6e'; c.lineWidth = 7; c.stroke(); c.setLineDash([]);
      if (ak > 0.01) {
        const y = B - PK - 34, xa = X(M0), xb = lerp(xa, X(m), ak);
        c.strokeStyle = COL.diag; c.fillStyle = COL.diag; c.lineWidth = 10; c.lineCap = 'round';
        c.beginPath(); c.moveTo(xa, y); c.lineTo(xb - 14, y); c.stroke();
        c.beginPath(); c.moveTo(xb + 4, y); c.lineTo(xb - 26, y - 18); c.lineTo(xb - 26, y + 18); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(xa, y - 18); c.lineTo(xa, y + 18); c.stroke();
      }
      if (DETAIL) {
        drawText(c, '提問分布', 36, 50, 34, COL.ink, 'left');
        drawText(c, '建 eval 時', X(M0), H - 22, 30, '#6d655a');
        if (k > 0.6) drawText(c, '現在', X(m) + 30, H - 22, 30, '#1f55ad');
      }
    });
  }
  const CH = 0.022, CX = 0.255, CZ = 0.06;
  const cashM = M(COL.cash, { rough: 0.4 }), rimM = M('#9aa2ad', { rough: 0.45 });
  const coins = Array.from({ length: 5 }, (_, i) => { const c = new THREE.Group(); c.add(mesh(coinGeo(0.056, CH * 0.9, 720 + i), cashM)); const r = mesh(new THREE.TorusGeometry(0.039, 0.0035, 6, 28), rimM); r.rotation.x = Math.PI / 2; r.position.y = CH * 0.46; c.add(r); g.add(c); return c; });
  const cL = label('每則成本'); cL.position.set(CX, BH, 0.17); g.add(cL);
  const OFF = [2.6, 3.0, 3.4];
  const L = L_PART[7];
  function act(lt) {
    draw(ease.inOut(prog(lt, 0.3, 2.0)), ease.inOut(prog(lt, 2.0, 2.45)));
    coins.forEach((c, i) => {
      const home = V(CX, BH + CH / 2 + i * CH, CZ);
      const j = 4 - i, a = OFF[j];
      if (a == null) { c.position.copy(home); c.visible = true; c.scale.setScalar(1); c.rotation.set(0, 0, 0); return; }
      const k = ease.inOut(prog(lt, a, a + 0.5));
      const p = home.clone().lerp(V(CX + 0.15, home.y + 0.22, CZ - 0.12), k); c.position.copy(p); c.rotation.set(k * 2.5, 0, k * 1.2);
      c.scale.setScalar(Math.max(0.001, 1 - ease.in(prog(lt, a + 0.25, a + 0.5)))); c.visible = k < 0.99;
    });
    cL.userData.sync();
  }
  return { g, L, act, item: ch.g };
}

// ---------------------------------------------------------------- part 8: SLO & incident — error budget battery, red lamp, postmortem sheet, the standard line goes up (purple loop)
function buildP8() {
  const g = new THREE.Group(); slab(g, SLAB, 801);
  const BC = V(0.03, BH + 0.12, 0.02);
  g.add(mesh(rbox(0.2, 0.045, 0.09, 0.012, 810), M(COL.woodDk), BC.x, BH + 0.0225, BC.z));
  g.add(mesh(rbox(0.4, 0.155, 0.115, 0.035, 811), M('#efe9de', { rough: 0.5 }), BC.x, BC.y, BC.z));
  g.add(mesh(rbox(0.025, 0.07, 0.07, 0.009, 812), M('#cfc6b6'), BC.x + 0.212, BC.y, BC.z));
  g.add(mesh(rbox(0.368, 0.115, 0.004, 0.004, 813), M('#3b3f47'), BC.x, BC.y, BC.z + 0.0575));
  const segs = Array.from({ length: 10 }, (_, i) => { const m = mesh(rbox(0.029, 0.097, 0.013, 0.004, 820 + i, 0.0003), M(COL.ok, { rough: 0.5 })); m.position.set(BC.x - 0.16 + i * 0.0355, BC.y, BC.z + 0.063); g.add(m); return m; });
  // the red lamp (incident)
  const LP = V(0.3, BH, 0.15);
  g.add(mesh(cyl(0.036, 0.042, 0.03, 16, 830), M('#3b3f47'), LP.x, BH + 0.015, LP.z));
  const domeM = new THREE.MeshStandardMaterial({ color: COL.diag, roughness: 0.35, emissive: COL.diag, emissiveIntensity: 0.2 });
  const dome = mesh(new THREE.SphereGeometry(0.034, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.position.set(LP.x, BH + 0.03, LP.z); g.add(dome);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), new THREE.MeshBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); halo.position.set(LP.x, BH + 0.045, LP.z); halo.castShadow = false; g.add(halo);
  // the postmortem sheet (method: yellow)
  const pmT = dual([{ s: '檢討', k: 1.2 }, { s: '不責備' }], { ch: 0.019, bg: '#F7D774', ink: COL.ink, padX: 0.3, padY: 0.25, minW: 0.088, minH: 0.1, lh: 1.3 });
  const pm = card(pmT, { w: 0.092, h: 0.104, sled: null, lean: 0.1, paper: '#F7D774' }); g.add(pm);
  // the standard line (SLO target) and the loop arrow (purple)
  const RXp = -0.275, RZ = -0.03;
  g.add(mesh(cyl(0.009, 0.011, 0.3, 8, 840), M(COL.woodDk), RXp, BH + 0.15, RZ));
  for (let i = 1; i <= 5; i++) g.add(mesh(rbox(0.026, 0.005, 0.012, 0.002, 841 + i), M('#6b5a3a'), RXp, BH + i * 0.05, RZ));
  const mark = mesh(rbox(0.075, 0.016, 0.03, 0.006, 848), M(COL.loop, { rough: 0.45 })); g.add(mark);
  const loop = new THREE.Group(); g.add(loop);
  const arc = mesh(new THREE.TorusGeometry(0.042, 0.0075, 8, 32, Math.PI * 1.55), M(COL.loop, { rough: 0.45 })); loop.add(arc);
  const head = mesh(new THREE.ConeGeometry(0.016, 0.032, 10), M(COL.loop, { rough: 0.45 })); head.position.set(0.042 * Math.cos(Math.PI * 1.55), 0.042 * Math.sin(Math.PI * 1.55), 0); head.rotation.z = Math.PI * 1.55; loop.add(head);
  const sL = label('SLO'); sL.position.set(RXp, BH, 0.16); g.add(sL);
  const bL = label('錯誤預算'); bL.position.set(BC.x, BH, 0.17); g.add(bL);
  const L = L_PART[8];
  function act(lt) {
    const fl = lt > 0.5 && lt < 1.8 ? Math.max(0, Math.sin((lt - 0.5) * Math.PI * 2 * 2.3)) : 0;
    domeM.emissiveIntensity = 0.25 + 1.8 * fl; halo.material.opacity = 0.45 * fl;
    segs.forEach((m, i) => {
      const lost = i >= 7;
      m.material.color.set(lost && lt >= 0.95 ? COL.diag : COL.ok);
      const k = lost ? ease.inOut(prog(lt, 1.25 + (9 - i) * 0.12, 1.55 + (9 - i) * 0.12)) : 0;
      m.scale.set(1, Math.max(0.001, 1 - k), 1); m.visible = k < 0.99;
      m.position.y = BC.y - 0.048 * k;
      if (lost) m.scale.x = 1 + 0.2 * bump(lt, 0.95, 1.2);
    });
    // the sheet flies in and sticks on the battery's left end
    const k = ease.inOut(prog(lt, 1.9, 2.4));
    const p = V(-0.2, 0.42, 0.22).lerp(V(BC.x - 0.14, BC.y - 0.06, BC.z + 0.068), k); p.y += 0.04 * Math.sin(Math.PI * k);
    pm.visible = lt > 1.9; pm.position.copy(p); pm.rotation.set(0, (1 - k) * 1.2, 0.12 * k); pm.scale.setScalar(Math.max(0.001, 0.6 + 0.4 * k + 0.08 * bump(lt, 2.35, 2.6)));
    pm.userData.face.userData.setTex(pmT);
    // the standard line rises; the loop arrow turns while it does
    const mk = ease.inOut(prog(lt, 2.85, 3.45));
    mark.position.set(RXp + 0.03, BH + lerp(0.12, 0.21, mk), RZ);
    mark.scale.setScalar(1 + 0.15 * bump(lt, 3.35, 3.7));
    loop.visible = lt > 2.6; loop.scale.setScalar(pop(lt, 2.6, 0.3)); loop.position.set(RXp, BH + 0.36, RZ); loop.rotation.set(-0.2, 0, -2.2 * ease.inOut(prog(lt, 2.6, 3.6)));
    sL.userData.sync(); bL.userData.sync();
  }
  return { g, L, act, item: segs[8] };
}
const BUILD = [null, buildP1, buildP2, buildP3, buildP4, buildP5, buildP6, buildP7, buildP8];
// ---------------------------------------------------------------- name plates & question sign (same look as coursemap4.js)
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
function makePlate(n, name, h = PLATE_H, hang = false) {
  const tex = {}; for (const k of Object.keys(PL)) tex[k] = canvasTexture(plateCanvas(n, name, PL[k]));
  const cv = tex.alive.image, w = h * cv.width / cv.height;
  const g = new THREE.Group(), board = new THREE.Group(); g.add(board);
  board.add(mesh(rbox(w + 0.008, h + 0.008, 0.012, 0.008, 950 + n, 0.0003), M('#d9b48a')));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex.alive, roughness: 0.85, emissive: '#ffffff', emissiveMap: tex.alive, emissiveIntensity: 0.18 }));
  f.position.z = 0.0068; board.add(f);
  board.position.y = hang ? -(h / 2 + 0.006) : h / 2 + 0.012;   // hang: pivot at the top edge (front-row plates hang on the step's edge). Billboarded in update()
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

/** a small dark tag (the question card's tag look) shown over a group of stops while it is lit, e.g. 「複習」 ("Review"), so a group
 *  lit together reads as a review rather than as a wrong part lighting up */
const TAG_H = 0.15;
function tagSign(text) {
  const mc = document.createElement('canvas').getContext('2d'), h = 120, fs = 80, w = Math.ceil(measure(mc, text, fs) + 96);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#3b2a20'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, (h - 8) / 2); c.fill();
  drawText(c, text, w / 2, h / 2 + fs * 0.36, fs, '#f8d867', 'center');
  const W = TAG_H * w / h, g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, TAG_H), new THREE.MeshBasicMaterial({ map: canvasTexture(cv), transparent: true, toneMapped: false, depthTest: false }));
  m.renderOrder = 10; g.add(m); g.userData.W = W; g.userData.H = TAG_H; g.userData.faceMesh = m;
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

// ---------------------------------------------------------------- the chain walkway: front walkway → line-break jump → back walkway
const HOP = 0.55;                                // chain: how high the card jumps from the end of line 1 to the start of line 2
const PATH = [V(X_START, 0, Z_LF), V(X_STOP, 0, Z_LF), V(X_START, H2, Z_LB), V(X_STOP, H2, Z_LB)];
const SEG = PATH.slice(1).map((b, i) => ({ a: PATH[i], b, len: b.distanceTo(PATH[i]) }));
const CUM = SEG.reduce((acc, s) => { acc.push(acc[acc.length - 1] + s.len); return acc; }, [0]);
const PATH_LEN = CUM[CUM.length - 1];
function pathAt(s) {
  s = clamp(s, 0, PATH_LEN);
  for (let i = 0; i < SEG.length; i++) if (s <= CUM[i + 1] + 1e-9) { const u = (s - CUM[i]) / SEG[i].len, p = SEG[i].a.clone().lerp(SEG[i].b, i === 1 ? ease.inOut(u) : u); if (i === 1) p.y += HOP * Math.sin(Math.PI * u); return p; }
  return PATH[PATH.length - 1].clone();
}
/** walkway position (arc length) in front of part n */
const sOf = (n) => { const sl = SLOT(n); return (sl.row === 'f' ? 0 : CUM[2]) + sl.x - X_START; };
/** a strip lying along segment i; scale.x = length used, scale.z = width factor */
function stripAlong(i, w, h, mat) {
  const geo = new THREE.BoxGeometry(1, h, w); geo.translate(0.5, h / 2, 0);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true;
  const d = SEG[i].b.clone().sub(SEG[i].a);
  m.position.copy(SEG[i].a);
  m.rotation.order = 'YZX'; m.rotation.y = Math.atan2(-d.z, d.x); m.rotation.z = Math.atan2(d.y, Math.hypot(d.x, d.z));
  return m;
}

// ---------------------------------------------------------------- main
/**
 * @param o.lesson    this lesson, 1..8 (required)
 * @param o.t0        when the map sequence starts (s)
 * @param o.shot      'ride' (opening, default) | 'finale' (pull back from this lesson's part to the whole table)
 *                    | 'overview' (still wide shot) | 'chain' (course closing: a conversation card walks 1 → 8 along the walkways, line-breaking from 4 to 5)
 *                    'overview' with allLit on lesson 8 = 'chain'
 * @param o.question  question card text beside this lesson's part ('\n' for two lines)
 * @param o.questionTag  the small tag above the question (default '第 N 課 · <part name>', i.e. "Lesson N · <part name>";
 *                    e.g. '補一課 · 第 7 課旁' ("Extra lesson · next to lesson 7") for an extra lesson)
 * @param o.times     absolute seconds; see COURSEMAP-AIENG.md
 * @param o.stops     ride: parts lit in the wide shot before the push (default lesson 1: [1..8] = first look; else the learned parts);
 *                    nested = groups lit and played together: [[1],[2,3],[4,5,6],[7,8]]
 * @param o.review    'wide' (default for lessons 1–4) | 'group' (default for 5–8: all learned parts lit and playing together) | 'push'
 * @param o.camFrom   {pos, look, fov} world: blend from your camera, starting at t0 (o.camBlend s, default 1.2)
 * @param o.place     { x, y, z, rotY, scale } where the table stands (default: in front of the blackboard, between teacher and student)
 * @param o.parts     per-part name overrides {n: {name}}
 * @param o.times.hold  ride, optional: per group of stops, the time the camera stops on that group (pushes in, 1.1 s);
 *                    from then it is lit but still (its mechanism rests at the start) until its play time times.parts[i]. The group before
 *                    it ends its window at the hold. null/omitted = no camera stop (lit = play time, camera stays wide). E.g. [null, Ls('M01q')]
 * @param o.groupTags ride, optional: per group of stops, a small dark tag over the group while it is lit, e.g. ['複習'] ("Review")
 */
export async function makeCourseMapAIEng(o = {}) {
  const lesson = clamp(Math.round(o.lesson || 1), 1, NP);
  const t0 = o.t0 ?? 0;
  let shot = o.shot || 'ride';
  if (shot === 'overview' && (o.allLit ?? false) && lesson === NP) shot = 'chain';
  const chain = shot === 'chain';
  const place = Object.assign({ x: 0.2, y: 0, z: -0.95, rotY: 0, scale: 0.6 }, o.place || {});
  const question = o.question || '';
  const names = [null, ...Array.from({ length: NP }, (_, i) => o.parts?.[i + 1]?.name || PARTS_AIENG[i + 1].name)];
  // fonts
  for (const href of ['/node_modules/@fontsource/chiron-goround-tc/700.css', '/node_modules/@fontsource/inter/800.css']) {
    if (![...document.styleSheets].some(s => (s.href || '').includes(href.split('/')[3]) && (s.href || '').includes(href.split('/').pop()))) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; });
    }
  }
  const allText = names.join('') + question + (o.questionTag || '') + (o.groupTags || []).join('') + JSON.stringify(o.parts || {}) + '第課·維修費機型保固內費用價目表學來的傾向找不到「那一行」偏差變異沒撈到沒用上問題模糊其他精確率召回率考題冊人工評審去重配額提問分布建時現在每則成本檢討不責備錯誤預算';
  await document.fonts.load(`700 120px "${ZH}"`, allText);
  await document.fonts.load(`800 120px "${EN}"`, 'defifelsereturn(),:=[]?v1.1 eval SLO 0123456789/%');
  await document.fonts.ready;

  const root = new THREE.Group(); root.position.set(place.x, place.y, place.z); root.rotation.y = place.rotY; root.scale.setScalar(place.scale);
  const withTable = o.table !== false;
  const land = new THREE.Group(); land.position.set(0, withTable ? G : 0.04, -BOARD_ZC); root.add(land);
  if (withTable) {
    const top = M('#c88a56'), legM = M('#a96d42');
    const FW = BOARD_W + 0.14, FD = BOARD_D + 0.14, FB = 0.16;
    for (const sz of [-1, 1]) root.add(mesh(lumpy(new RoundedBoxGeometry(FW, 0.07, FB, 3, 0.03), 0.003, 3, 101 + sz), top, 0, TABLE_H - 0.035, sz * (FD / 2 - FB / 2)));
    for (const sx of [-1, 1]) root.add(mesh(lumpy(new RoundedBoxGeometry(FB, 0.07, FD - 2 * FB + 0.04, 3, 0.03), 0.003, 3, 104 + sx), top, sx * (FW / 2 - FB / 2), TABLE_H - 0.035, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(mesh(cyl(0.05, 0.065, TABLE_H - 0.06, 14, 107 + sx + sz * 3), legM, sx * (BOARD_W / 2 - 0.1), (TABLE_H - 0.06) / 2, sz * (BOARD_D / 2 - 0.1)));
    const sh = C.contactShadow(BOARD_W * 1.3, BOARD_D * 1.5, 0.4); sh.position.y = 0.004; root.add(sh);
  }
  { const b = mesh(lumpy(new RoundedBoxGeometry(BOARD_W, 0.075, BOARD_D, 6, 0.03), 0.003, 4, 112), M('#d8c39f'), 0, -0.0375, BOARD_ZC); b.receiveShadow = true; land.add(b); }
  // the two steps (front step for lessons 1–4, back step for 5–8)
  { const d = ZF1 - ZB1, r = mesh(lumpy(new RoundedBoxGeometry(BOARD_W - 0.06, H1, d, 4, 0.02), 0.002, 4, 113), M('#d2b98f'), 0, H1 / 2, ZB1 + d / 2); r.receiveShadow = true; land.add(r); }
  { const d = ZB1 - BOARD_Z0 - 0.02, r = mesh(lumpy(new RoundedBoxGeometry(BOARD_W - 0.06, H2, d, 4, 0.02), 0.002, 4, 114), M('#c7ac80'), 0, H2 / 2, BOARD_Z0 + 0.02 + d / 2); r.receiveShadow = true; land.add(r); }

  // ---- the eight parts
  const parts = [null];
  for (let n = 1; n <= NP; n++) {
    const sl = SLOT(n);
    const holder = new THREE.Group(); land.add(holder);
    FACES = []; LABELS = []; const b = BUILD[n](o.parts?.[n] || {}); holder.add(b.g); b.faces = FACES; b.labels = LABELS; FACES = null; LABELS = null;
    const dimU = { value: 0 };
    b.g.traverse(m => { if (m.isMesh && m.material && m.material.depthWrite !== false) dimPatch(m.material, dimU); });
    const front = sl.row === 'f';
    const plate = makePlate(n, names[n], PLATE_H, front); holder.add(plate);
    if (front) plate.position.set(0, -0.004, ZF1 - sl.z + 0.012);            // hangs on the front step's edge, under the part
    else {                                                                    // stands on two posts behind the part, above it
      plate.position.set(0, SIGN_UP, SIGN_Z);
      plate.userData.posts = [-1, 1].map(sx => { const p = mesh(cyl(0.006, 0.008, SIGN_UP + 0.02, 8, 960 + n + sx), M('#a5774e'), sx * 0.16, SIGN_UP / 2, SIGN_Z - 0.012); holder.add(p); return p; });
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(BASE_W + 0.07, BASE_D + 0.07), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; glow.renderOrder = 1; holder.add(glow);
    const sh = C.contactShadow(BASE_W * 1.25, BASE_D * 1.3, 0.3); sh.position.y = 0.0015; holder.add(sh);
    holder.position.set(sl.x, sl.y, sl.z); holder.scale.setScalar(front ? 1 : BACK_S);   // the back row is a little bigger: it is farther from the camera
    holder.updateMatrixWorld(true);
    b.act(L_PART[n]);                         // measure the finished pose
    const box = new THREE.Box3(); b.g.updateMatrixWorld(true);
    const inv = holder.matrixWorld.clone().invert(); const tmpB = new THREE.Box3();
    b.g.traverse(m => { if (m.isMesh && m.geometry && m.visible) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); tmpB.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv); box.union(tmpB); } });
    parts.push({ ...b, n, sl, holder, plate, glow, dimU, box });
  }
  // ---- chain: walkway strips, the gold trail behind the runner, arrows, the runner (a conversation card)
  const laneM = M('#b98256'), trailM = new THREE.MeshBasicMaterial({ color: '#ffd45a', toneMapped: false });
  const WALK = [0, 2];                          // the hop (segment 1) has no walkway
  const lanes = SEG.map((s, i) => { const m = stripAlong(i, 0.13, 0.012, laneM); m.scale.x = s.len; m.userData.on = WALK.includes(i); land.add(m); return m; });
  const trails = SEG.map((s, i) => { const m = stripAlong(i, 0.06, 0.016, trailM); m.userData.on = WALK.includes(i); land.add(m); return m; });
  const arrowM = M('#8a5a36');
  const arrows = [1, 2, 3, 5, 6, 7].map((n0, i) => {
    const sm = (sOf(n0) + sOf(n0 + 1)) / 2;
    const shp = new THREE.Shape(); shp.moveTo(-0.07, -0.016); shp.lineTo(0.01, -0.016); shp.lineTo(0.01, -0.036); shp.lineTo(0.07, 0); shp.lineTo(0.01, 0.036); shp.lineTo(0.01, 0.016); shp.lineTo(-0.07, 0.016); shp.closePath();
    const a = mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.01, bevelEnabled: false }), arrowM); a.rotation.x = -Math.PI / 2;
    const gA = new THREE.Group(); gA.add(a);
    const p = pathAt(sm), d = pathAt(sm + 0.02).sub(pathAt(sm - 0.02));
    gA.position.copy(p).add(V(0, 0.017, 0)); gA.rotation.order = 'YZX'; gA.rotation.y = Math.atan2(-d.z, d.x); gA.rotation.z = Math.atan2(d.y, Math.hypot(d.x, d.z));
    land.add(gA); return gA;
  });
  const runner = card(chatTT(), { w: 0.09, h: 0.068, sled: '#c98f5c', lean: 1.0 }); land.add(runner);
  const runGlow = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), new THREE.MeshBasicMaterial({ color: '#ffe17a', transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
  runGlow.rotation.x = -Math.PI / 2; runGlow.renderOrder = 2; land.add(runGlow);

  // ---- question sign
  const cur = parts[lesson];
  const qTag = o.questionTag || `第 ${lesson} 課 · ${names[lesson]}`;
  const qs = question && (shot === 'ride') ? questionSign(question, qTag) : null; if (qs) land.add(qs);
  // the card stands beside this lesson's part (over the dimmed neighbour in the same row), on the side with more table
  const qSide = cur.sl.col <= 1 ? 1 : -1;
  if (qs) qs.userData.setSide(-qSide);
  const signPos = () => V(cur.sl.x + qSide * ((cur.sl.row === 'f' ? 1 : BACK_S) * BASE_W / 2 + SIGN_W / 2 + 0.03), cur.sl.y + Math.max(0.06, cur.box.max.y * (cur.sl.row === 'f' ? 1 : BACK_S) * 0.5 - qs.userData.H * 0.4), cur.sl.z + 0.06);

  // ---- timing
  const tm = { start: t0 };
  const T = o.times || {};
  const blendIn = o.camFrom ? (o.camBlend ?? 1.2) : 0;
  const PUSH = 1.1;
  const L = (n) => L_PART[n];
  const review = o.review || (lesson >= 5 ? 'group' : 'wide');
  let stops = [], plays = [], held = [];      // plays: { n, a (start), b (window end), rate }; held: [{ parts, hold }]
  if (shot === 'ride') {
    stops = (o.stops ? o.stops.slice() : lesson === 1 ? Array.from({ length: NP }, (_, i) => i + 1) : Array.from({ length: lesson - 1 }, (_, i) => i + 1));
    // groups: stops may be nested ([[1],[2,3],[4,5,6],[7,8]]): each inner list is lit and played together in one window.
    // review 'group' with a flat list = one group of all of them.
    let groups = (o.stops || []).some(Array.isArray) ? stops.map(s => [].concat(s)) : (review === 'group' && stops.length > 1 ? [stops.slice()] : stops.map(n => [n]));
    groups = groups.filter(g => g.length);
    const nested = (o.stops || []).some(Array.isArray);
    stops = groups.flat();
    const ovStart = T.overview ?? t0;
    const ovHold = Math.max(lesson === 1 ? 2.6 : 1.6, blendIn + 0.8);
    const per = lesson === 1 ? 3.6 : 2.7, maxRate = lesson === 1 ? 1.8 : 2.0;
    /** default window of a group: one part = 3.6 s (first look) / 2.7 s (review); several = 4.0 s + 0.6 s per extra part, at most 5.2 s */
    const winOf = (g) => g.length === 1 ? (nested || (groups.length === 1 && review === 'group') ? 4.0 : per) : Math.min(5.2, 4.0 + 0.6 * (g.length - 1));
    const slots = groups.length;
    const given = T.parts || T.stops;
    let arrive = T.arrive;
    let starts;
    if (given) starts = given.slice(0, slots);
    else {
      const s0 = Math.max(ovStart, t0) + ovHold;
      if (arrive != null && slots) { const span = Math.max(0.1, arrive - PUSH - s0), tot = groups.reduce((s, g) => s + winOf(g), 0); let acc = 0; starts = groups.map(g => { const v = s0 + span * acc / tot; acc += winOf(g); return v; }); }
      else { let acc = s0; starts = groups.map(g => { const v = acc; acc += winOf(g); return v; }); }
    }
    const lastLen = slots ? winOf(groups[slots - 1]) : per;
    const lastEnd = slots ? starts[slots - 1] + (given ? Math.max(2.6, lastLen * 0.85) : lastLen) : t0 + Math.max(1.6, blendIn + 0.8);
    if (arrive == null) arrive = lastEnd + PUSH;
    const pushStart = T.push ?? arrive - PUSH;
    // times.hold[i] = the camera stops on group i and it is lit but still until its play time (default: none)
    const holds = Array.isArray(T.hold) ? T.hold.slice(0, slots) : [];
    const litAt = (i) => holds[i] != null ? Math.min(holds[i], starts[i]) : starts[i];
    held = groups.map((g, i) => holds[i] != null ? { parts: g, hold: litAt(i) } : null).filter(Boolean);
    groups.forEach((g, i) => {
      const a = starts[i], b = i + 1 < slots ? litAt(i + 1) : Math.max(pushStart, a + 1.0);
      for (const n of g) plays.push({ n, a, b, rate: clamp(L(n) / Math.max(0.6, b - a - 0.5), 1, maxRate), ...(holds[i] != null ? { hold: litAt(i) } : {}) });
    });
    tm.groups = groups.map((g, i) => ({ parts: g, t: +starts[i].toFixed(2), end: +(i + 1 < slots ? litAt(i + 1) : pushStart).toFixed(2), ...(holds[i] != null ? { hold: +litAt(i).toFixed(2) } : {}) }));
    const colorIn = T.colorIn ?? T.play ?? (lesson === 1 ? pushStart + 0.15 : arrive - 0.6);
    plays.push({ n: lesson, a: colorIn, b: 1e9, rate: T.rate ?? 1, current: true });
    tm.overview = ovStart; tm.stops = plays.filter(p => !p.current).map(p => ({ n: p.n, t: p.a, end: p.b, rate: +p.rate.toFixed(2) }));
    tm.push = pushStart; tm.arrive = arrive; tm.colorIn = colorIn;
    tm.ask = T.ask ?? arrive;
    tm.readQ = qs ? +readNeed(`${qTag} ` + question.replace(/\n/g, '')).toFixed(2) : 0;
    tm.end = T.end ?? Math.max(tm.ask + Math.max(2.8, tm.readQ + 0.4), colorIn + L(lesson) / (T.rate ?? 1) + 0.4);
  } else if (chain) {
    const join = T.join ?? t0 + 0.5 + blendIn * 0.5, joinEnd = join + 1.4;
    let flow = T.flow;
    if (!flow) {
      const a = joinEnd + 0.6;
      const per = T.end != null ? clamp((T.end - 3.0 - a) / NP, 2.4, 4.5) : 3.6;
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
  // ---- o.groupTags[i] over group i while it is lit (none by default)
  const gtags = [];
  if (shot === 'ride' && Array.isArray(o.groupTags)) (tm.groups || []).forEach((g, i) => {
    const text = o.groupTags[i]; if (!text) return;
    const play = plays.find(p => p.n === g.parts[0] && !p.current); if (!play) return;
    const sg = tagSign(text); land.add(sg);
    const xs = g.parts.map(n => SLOT(n).x), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    if (g.parts.every(n => SLOT(n).row === 'f')) sg.position.set(cx, H2 - 0.05, ZB1 + 0.01);                  // on the back step's riser, over the front row
    else sg.position.set(cx, H2 + BACK_S * (SIGN_UP + PLATE_H) + 0.07, ROW_B + BACK_S * SIGN_Z);          // above the back row's signs
    Object.assign(sg.userData, { play, text, i, k: 0 }); gtags.push(sg);
  });

  // ---- cameras (land-local, returned in world space)
  const W = (v) => land.localToWorld(v.clone());
  const L2W = (c) => ({ pos: W(c.pos), look: W(c.look), fov: c.fov });
  const corners = (b, off, k = 1) => { const r = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) r.push(V(x, y, z).multiplyScalar(k).add(off)); return r; };
  const scl = (n) => parts[n].sl.row === 'f' ? 1 : BACK_S;
  const offOf = (n) => V(parts[n].sl.x, parts[n].sl.y, parts[n].sl.z);
  const platePts = (n) => { const k = scl(n), p = parts[n].plate, w = k * p.userData.w / 2 + 0.01, h = k * p.userData.h, s = parts[n].sl;
    if (s.row === 'f') return [V(s.x - w, H1, ZF1 + 0.01), V(s.x + w, H1, ZF1 + 0.01), V(s.x - w, H1 - h - 0.01, ZF1 + 0.04), V(s.x + w, H1 - h - 0.01, ZF1 + 0.04)];
    const y = s.y + k * SIGN_UP, z = s.z + k * SIGN_Z; return [V(s.x - w, y, z), V(s.x + w, y, z), V(s.x - w, y + h + 0.02, z - 0.03), V(s.x + w, y + h + 0.02, z - 0.03)]; };
  const partPts = (n) => corners(parts[n].box, offOf(n), scl(n));
  const boardPts = [V(-BOARD_W / 2, 0, BOARD_Z0), V(BOARD_W / 2, 0, BOARD_Z0), V(-BOARD_W / 2, 0, BOARD_Z1), V(BOARD_W / 2, 0, BOARD_Z1)];
  const cache = {};
  const allParts = () => Array.from({ length: NP }, (_, i) => [...partPts(i + 1), ...platePts(i + 1)]).flat();
  const ELEV = { ov: 0.6, f: 0.42, b: 0.62 };
  const cams = {
    overview: () => cache.ov || (cache.ov = L2W(fitCam(allParts(), { elev: ELEV.ov, fov: 30, xm: 0.95, yTop: 0.88, yBot: -0.72 }))),
    chain: () => cache.ch || (cache.ch = L2W(fitCam([...allParts(), ...PATH.map(p => p.clone().add(V(0, 0.02, 0.05)))], { elev: ELEV.ov, fov: 30, xm: 0.96, yTop: 0.9, yBot: -0.64 }))),
    /** the camera stop of a held group: its parts and name plates, from higher up than a push-in (a back-row plate stands
     *  high on its posts; at the push-in angle the part came out small under a band of empty wall) */
    group: (ns) => cache['g' + ns.join('_')] || (cache['g' + ns.join('_')] = L2W(fitCam(ns.flatMap(n => [...partPts(n), ...platePts(n)]), { elev: 0.9, fov: 30, xm: 0.95, yTop: 0.9, yBot: -0.72 }))),
    part: (n = lesson) => cache['p' + n] || (cache['p' + n] = L2W(fitCam([...partPts(n),
      ...(n === lesson && qs ? (() => { const s = signPos(); return [s.clone().add(V(-SIGN_W / 2, qs.userData.H * 1.02, 0)), s.clone().add(V(SIGN_W / 2, qs.userData.H * 1.02, 0)), s.clone().add(V(-SIGN_W / 2, 0, 0)), s.clone().add(V(SIGN_W / 2, 0, 0))]; })() : platePts(n))],
    { elev: parts[n].sl.row === 'b' ? ELEV.b : ELEV.f, fov: 30, xm: 0.92, yTop: 0.8, yBot: -0.7 }))),
  };
  const mixC = (a, b, e) => ({ pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), fov: lerp(a.fov, b.fov, e) });
  function cam(t) {
    root.updateMatrixWorld(true);
    let c;
    if (shot === 'ride') {
      const ks = [[t0, cams.overview()]];
      if (review === 'push') for (const p of plays) { if (p.current) continue; ks.push([p.a - 0.5, ks[ks.length - 1][1]]); ks.push([p.a + 0.3, cams.part(p.n)]); }
      for (const g of held) { ks.push([g.hold, ks[ks.length - 1][1]]); ks.push([g.hold + PUSH, cams.group(g.parts)]); }   // camera stops on a held group
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
  // small text shows only when the camera is pushed in on that part: closer than halfway between the wide and that part's push-in distance
  const _dd = {};
  const detailD = (n) => _dd[n] ?? (_dd[n] = (() => { root.updateMatrixWorld(true); const c = parts[n].holder.getWorldPosition(new THREE.Vector3()); return (cams.overview().pos.distanceTo(c) + cams.part(n).pos.distanceTo(c)) / 2; })());
  const winK = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ease.inOut(clamp((t - a) / fi)), ease.inOut(clamp((b - t) / fo)));
  // the runner's arc length along the walkway (chain)
  const runS = (t) => {
    const ks = [[tm.join[1], sOf(1) - 0.3]];
    const row = (n) => SLOT(n).row;
    plays.forEach((p, i) => {
      const s = sOf(p.n), hopIn = i > 0 && row(plays[i - 1].n) !== row(p.n), hopOut = i + 1 < plays.length && row(plays[i + 1].n) !== row(p.n);
      ks.push([p.a - (i ? (hopIn ? 0.05 : 0.5) : 0.2), s - 0.2]); ks.push([p.a + 0.1, s - 0.12]); ks.push([p.b - (hopOut ? 1.1 : 0.6), s + 0.18]);   // the jump to the next line gets ≈ 1 s
    });
    ks.push([tm.allOn + 0.6, sOf(NP) + 0.24]);
    return track(ks, t);
  };
  let lastT = t0;
  function update(t, camera = null) {
    lastT = t;
    root.updateMatrixWorld(true);
    // chain layout: the walkway appears, arrows pop, the runner walks and leaves a gold trail
    const jk = chain ? ease.inOut(prog(t, tm.join[0], tm.join[1])) : 0;
    lanes.forEach(m => { m.visible = m.userData.on && jk > 0.001; m.scale.z = Math.max(0.001, jk); });
    arrows.forEach((a, i) => { const k = chain ? ease.outBack(prog(t, tm.join[1] - 0.1 + i * 0.06, tm.join[1] + 0.3 + i * 0.06)) : 0; a.visible = k > 0.01; a.scale.setScalar(Math.max(0.001, k)); });
    const running = chain && t >= tm.join[1] - 0.05;
    const sR = running ? runS(t) : 0;
    trails.forEach((m, i) => { const used = clamp(sR - CUM[i], 0, SEG[i].len); m.visible = m.userData.on && running && used > 0.005; m.scale.x = Math.max(0.001, used); });
    if (running) {
      const p = pathAt(sR), hop = Math.abs(Math.sin(t * 6.0)) * 0.02 * (t < tm.allOn + 0.6 ? 1 : 0);
      runner.visible = true; runner.position.set(p.x, p.y + 0.016 + hop, p.z); runner.scale.setScalar(1.2 * pop(t, tm.join[1] - 0.05, 0.3));
      runGlow.position.set(p.x, p.y + 0.019, p.z); runGlow.material.opacity = 0.7 * prog(t, tm.join[1], tm.join[1] + 0.3);
    } else { runner.visible = false; runGlow.material.opacity = 0; }
    // which part is in focus
    const focus = new Array(NP + 1).fill(0);
    for (const p of plays) focus[p.n] = Math.max(focus[p.n], winK(t, (p.hold ?? p.a) - 0.15, p.b));
    const allK = chain ? ease.inOut(prog(t, tm.allOn, tm.allOn + 0.6)) : 0;
    const stopNow = held.find(g => t >= g.hold && t < tm.push) || null;   // the held group the camera is stopped on
    const stopPl = t < tm.arrive ? held.filter(g => t >= g.hold).pop() || null : null;   // from a stop until the camera reaches this lesson's part
    for (let n = 1; n <= NP; n++) {
      const P = parts[n];
      let dim;
      if (chain) {
        const p = plays[n - 1];
        const before = t < tm.join[0] ? 0 : t < p.a - 0.15 ? 0.76 * ease.inOut(prog(t, tm.join[0], tm.join[1])) : 0;
        const after = t > p.b ? 0.3 * ease.inOut(prog(t, p.b, p.b + 0.4)) : 0;
        dim = lerp(Math.max(before, after) * (1 - focus[n]), 0, allK);
      } else {
        let others = 0; for (let m = 1; m <= NP; m++) if (m !== n) others = Math.max(others, focus[m]);
        const rest = learned(n) ? 0 : 0.74;
        dim = lerp(lerp(rest, Math.max(rest, 0.72), others), 0, focus[n]);
        if (shot === 'ride' && n !== lesson) dim = Math.max(dim, 0.9 * ease.inOut(prog(t, tm.push, tm.arrive)));
      }
      P.dimU.value = dim;
      // local mechanism time
      let lt;
      let mine = null; for (const p of plays) if (p.n === n && t >= p.a - 1e-6) mine = p;
      if (mine) lt = (t - mine.a) * mine.rate;
      else lt = learned(n) && !plays.some(p => p.n === n && p.hold != null && t < p.a) ? 99 : 0;   // a held part waits at its start
      if (shot === 'overview' || shot === 'finale') { const per = L(n) + 2.2; lt = learned(n) ? ((t - t0 + n * 1.3) % per + per) % per : 0; if (shot === 'finale' && n !== lesson) lt = 99; }
      if (chain && t < plays[n - 1].a) lt = t < tm.join[0] ? 99 : 0;
      const offStop = stopNow && !stopNow.parts.includes(n);   // the camera has stopped on another (held) group
      DETAIL = !!camera && !offStop && (shot !== 'ride' || n === lesson || t < tm.push) && camera.position.distanceTo(P.holder.getWorldPosition(tmp)) < detailD(n);
      for (const l of P.labels) l.visible = true;
      P.act(clamp(lt, 0, L(n)));
      if (!DETAIL) for (const l of P.labels) l.visible = false;
      DETAIL = true;
      // pushed in on another part: this one's text is hidden (no half-cut labels at the frame edge)
      const away = (shot === 'ride' && n !== lesson && t > tm.push + 0.55) || (offStop && t > stopNow.hold + 0.55);
      for (const f of P.faces) f.visible = !away;
      const curK = chain ? (focus[n] > 0.5 && allK < 0.5) || allK > 0.5 : focus[n] > 0.5 || (shot === 'finale' && n === lesson);
      const pushedAway = shot === 'ride' && n !== lesson && t > tm.push + 0.3;
      P.plate.userData.setStyle(curK ? 'cur' : !pushedAway && (learned(n) || (shot === 'ride' && lesson === 1 && plays.some(p => p.n === n && t > p.b))) ? 'alive' : 'gray');
      P.glow.material.opacity = 0.75 * Math.max(focus[n], allK);
      P.plate.visible = !(shot === 'ride' && n !== lesson && t > tm.push + 0.55) && !(stopPl && !stopPl.parts.includes(n) && t > stopPl.hold + 0.55);   // only the stopped group's plates (no plate flashing past in the move on)
    }
    for (const sg of gtags) {   // group tags
      const p = sg.userData.play, k = winK(t, (p.hold ?? p.a) - 0.15, p.b);
      sg.userData.k = k; sg.visible = k > 0.01; sg.scale.setScalar(Math.max(0.001, 0.85 + 0.15 * k)); sg.userData.faceMesh.material.opacity = k;
    }
    if (qs) {
      const qk = ease.outBack(prog(t, tm.ask - 0.05, tm.ask + 0.4));
      qs.visible = qk > 0.01; qs.position.copy(signPos()); qs.position.y += 0.006 * Math.sin(t * 2.2); qs.scale.setScalar(Math.max(0.001, qk));
      cur.plate.visible = cur.plate.visible && !qs.visible;   // && keeps a plate that a stop hid hidden; without stops this is just !qs.visible
    }
    if (camera) {
      land.worldToLocal(camLocal.copy(camera.position));
      land.getWorldQuaternion(qInv).invert();
      for (let n = 1; n <= NP; n++) parts[n].plate.quaternion.copy(qInv).multiply(camera.quaternion);   // full billboard: name plates never look rolled at the frame edges
      if (qs) qs.quaternion.copy(qInv).multiply(camera.quaternion);
      for (const sg of gtags) sg.quaternion.copy(qInv).multiply(camera.quaternion);   // group tags face the camera too
      camera.updateMatrixWorld(true);
      for (let n = 1; n <= NP; n++) { const p = parts[n].plate; if (!p.visible) continue; const b = screenBox(p.userData.faceMesh, p.userData.w, p.userData.h, camera); p.visible = !!b && b.x0 >= 0 && b.y0 >= 0 && b.x1 <= window.innerWidth && b.y1 <= window.innerHeight; }
    }
    // a back-row sign's posts go with its sign (no bare poles when the sign is hidden)
    for (let n = 1; n <= NP; n++) { const pp = parts[n].plate; if (pp.userData.posts) for (const q of pp.userData.posts) q.visible = pp.visible; }
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
    for (const sg of gtags) if (sg.visible && sg.userData.k > 0.95) { const b = screenBox(sg.userData.faceMesh, sg.userData.W, sg.userData.H, camera); if (b && b.x0 >= 0 && b.y0 >= 0 && b.x1 <= window.innerWidth && b.y1 <= window.innerHeight) out.push({ id: 'map-tag-' + sg.userData.i, text: sg.userData.text, ...b }); }   // group tags (map-tag-i)
    if (qs && qs.visible && qs.scale.x > 0.9) { const b = screenBox(qs.userData.faceMesh, SIGN_W, qs.userData.H, camera); if (b) out.push({ id: 'map-question', text: `第 ${lesson} 課 · ${names[lesson]} ` + question.replace(/\n/g, ''), ...b }); }
    return out;
  }

  const api = {
    root, land, times: tm, stops, review, cams, cam, applyCam, update, texts, parts, duration: tm.end - t0,
    /** world position of part n's footprint centre (on the board / riser) */
    partWorld: (n) => { root.updateMatrixWorld(true); return parts[n].holder.localToWorld(V(0, 0, 0)); },
    /** world position of part n's moving item as last posed by update() */
    itemWorld: (n) => { root.updateMatrixWorld(true); return parts[n].item.localToWorld(V(0, 0.03, 0)); },
    /** is obj (a character root, any Object3D) in this camera's frame? 'out' | 'part' | 'in' — keep the cast at spots that read 'out' (or 'in') during the map shots, never 'part' */
    inShot: (obj, camera) => {
      obj.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      // only what is drawn: visible meshes (glass shells included), not the flat contact-shadow planes or hidden state marks
      const b = new THREE.Box3(), tb = new THREE.Box3();
      const walk = (o) => { if (!o.visible) return; if ((o.isMesh || o.isSkinnedMesh) && o.geometry) { const mt = [].concat(o.material)[0]; if (mt && mt.visible !== false && mt.opacity > 0.02 && !(o.geometry.type === 'PlaneGeometry' && mt.isMeshBasicMaterial && mt.depthWrite === false)) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } } for (const c of o.children) walk(c); };
      walk(obj); if (b.isEmpty()) return 'out';
      let inside = 0, n = 0, x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = V(x, y, z).project(camera); n++; if (p.z >= 1) continue;
        if (Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1) inside++; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      if (inside === n) return 'in';
      return (x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1) ? 'out' : 'part';
    },
    /** move obj (a character root) outward along x (side −1 = left, +1 = right) from its current x until it is 'out' of every map camera
     *  between times.start + camBlend and times.end (sampled every 0.25 s); returns the x it settled on (obj is left there). max: how far it may move (m). */
    clearX: (obj, side, { step = 0.05, max = 1.6 } = {}) => {
      const probe = new THREE.PerspectiveCamera(32, ASPECT, 0.01, 60), x0 = obj.position.x, ts = [];
      for (let t = tm.start + blendIn; t <= tm.end; t += 0.25) ts.push(t);   // not during the blend from your camera (people leave the frame while it moves)
      const cams_ = ts.map(t => { applyCam(probe, t); probe.updateMatrixWorld(true); return probe.clone(); });
      let dx = 0;
      for (; dx <= max; dx += step) { obj.position.x = x0 + side * dx; if (cams_.every(c => api.inShot(obj, c) === 'out')) break; }
      return obj.position.x;
    },
    /** world-space box of the whole table (to keep the cast clear of it) */
    tableBox: () => { root.updateMatrixWorld(true); const b = new THREE.Box3(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, G + 0.5]) b.expandByPoint(root.localToWorld(V(sx * (BOARD_W / 2 + 0.07), y, sz * (BOARD_D / 2 + 0.07)))); return b; },
  };
  return api;
}
export { makeCourseMapAIEng as makeCourseMap };
export default makeCourseMapAIEng;
