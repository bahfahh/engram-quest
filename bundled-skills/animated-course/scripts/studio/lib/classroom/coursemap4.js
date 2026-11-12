// Course map, version 4 (shared component): a clay model on a table showing "the path one ad and NT$3,000 actually travel".
// 13 lessons = 13 parts arranged in a loop. Learned parts are coloured and act out their own mechanism; this lesson's part starts
// grey, the question sign appears, then it colours in; not-yet-learned parts are grey and still.
// Docs: /lib/classroom/COURSEMAP4.md
//
//   import { makeCourseMap4 } from '/lib/classroom/coursemap4.js';
//   const map = await makeCourseMap4({ lesson: 10, t0: 2, shot: 'ride', question: '每天要看哪幾格？' });   // question drawn on screen ("Which cells do I check daily?")
//   scene.add(map.root);
//   window.renderAt = t => { map.applyCam(cam, t); map.update(t, cam); renderer.render(scene, cam); };
//
// update(t) / cam(t) are pure functions of t: every call resets every moving property, no state accumulates.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as S from '/lib/stage.js';
import * as C from '/lib/classroom/cast.js';

const { clamp, lerp, prog, ease } = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FONT_ZH = 'Chiron GoRound TC', FONT_EN = 'Nunito';
// lang: set by makeCourseMap4({ lang }) right before the (synchronous) build; zh values are the originals, untouched.
let FONT = FONT_ZH, FW = '700', EN = false;
const TEAL = '#0F9D8F', ORANGE = '#F2780C', META = '#1877F2', RED = '#E5484D', GREEN = '#2EA44F';

// ---------------------------------------------------------------- data
// n = lesson; pos = where the part stands (land-local, metres; +z = toward the default camera); side = where its name plate goes
export const PARTS4 = [
  null,
  { n: 1, name: '拍賣台', short: '拍賣台', x: 1.03, z: -0.25, s: 1.35, side: 'back', ry: -0.15, px: 0.04 },
  { n: 2, name: '數據回流管', short: '回流管', x: 0.66, z: 0.47, s: 0.8, side: 'front' },
  { n: 3, name: '岔路', short: '岔路', x: 1.15, z: 0.17, s: 1.3, side: 'front', px: 0.08, pz: 0.31 },
  { n: 4, name: 'Campaign 水龍頭', short: '水龍頭', x: 0.012, z: -0.62, s: 1.2, side: 'back', px: -0.22, pz: 0.03 },
  { n: 5, name: 'Ad set 圍欄', short: '圍欄', x: 0.12, z: -0.41, s: 1.3, side: 'back', px: -0.3, pz: -0.06 },
  { n: 6, name: 'Ad 卡片', short: '廣告卡', x: 0.12, z: -0.41, s: 1.3, side: 'back', px: 0.31, pz: -0.06 },
  { n: 7, name: '政策關卡', short: '政策關卡', x: 0.63, z: -0.25, s: 1.3, side: 'back', ry: 0.75, px: -0.05, pz: -0.2 },
  { n: 8, name: '素材工作台', short: '工作台', x: -1.05, z: -0.38, s: 1.4, side: 'back' },
  { n: 9, name: '測試台', short: '測試台', x: -0.6, z: -0.43, s: 1.35, side: 'back' },
  { n: 10, name: '儀表板', short: '儀表板', x: 0.03, z: 0.40, s: 1.2, side: 'front' },
  { n: 11, name: '決策桿', short: '決策桿', x: -0.5, z: 0.41, s: 1.35, side: 'front' },
  { n: 12, name: '回頭池', short: '回頭池', x: 0.64, z: 0.02, s: 1.3, side: 'in' },
  { n: 13, name: '放大閥', short: '放大閥', x: -1.0, z: 0.37, s: 1.4, side: 'front' },
];
// the loop the ad card travels, in order (12 hangs off the viewer, see ROAD)
export const LOOP4 = [8, 9, 4, 5, 6, 7, 1, 3, 2, 10, 11, 13];
const BOARD_W = 2.74, BOARD_D = 1.46, TABLE_H = 0.40, G = 0.475;

// ---------------------------------------------------------------- materials (share cast.js clay)
let _tpl = null;
function M(color, { rough = 0.82, emissive = null, ei = 1, flat = false, keep = false } = {}) {
  if (!_tpl) _tpl = C.clayMat('#ffffff', { bump: 1.1 });
  const m = _tpl.clone();
  m.color = new THREE.Color(color); m.roughness = rough;
  if (flat) m.map = null;
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
  m.userData.base = new THREE.Color(color);
  if (keep) m.userData.keep = true;          // stays this colour even on a grey (not yet learned) part
  return m;
}
const grayOf = (c) => { const l = c.r * 0.3 + c.g * 0.55 + c.b * 0.15; const v = 0.5 + l * 0.32; return new THREE.Color(v * 1.02, v * 1.0, v * 0.96); };
const lumpy = (geo, amp, freq, seed) => C.clayify(geo, { amp, freq, seed });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; return m; };
const rbox = (w, h, d, r, seed = 1, amp = 0.0015) => lumpy(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), amp, 18, seed);
const cyl = (rt, rb, h, seg = 18, seed = 1, amp = 0.001) => lumpy(new THREE.CylinderGeometry(rt, rb, h, seg, 1), amp, 22, seed);
const sph = (r, seed = 1, amp = 0.0015, seg = 14) => lumpy(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), amp, 20, seed);
const ANIM = (o) => { o.userData.anim = true; return o; };
const pm = (x, m) => ((x % m) + m) % m;   // positive modulo (local times can be negative before the card passes)

/** merge the static clay of a group: one mesh per colour (software rendering pays per draw call) */
function bake(g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const buckets = new Map(), victims = [];
  g.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.userData || !o.material.userData.base || o.material.transparent || o.material.side !== THREE.FrontSide || o.material.userData.tex) return;
    for (let p = o; p && p !== g; p = p.parent) if (p.userData.anim) return;
    const key = o.material.userData.base.getHexString() + (o.material.map ? 'm' : 'f') + (o.material.userData.keep ? 'k' : '') + (o.material.emissiveIntensity > 0 && o.material.emissive.getHex() ? o.material.emissive.getHexString() : '');
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.morphAttributes = {}; geo.clearGroups();
    geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    buckets.get(key).geos.push(geo); victims.push(o);
  });
  victims.forEach(o => o.parent.remove(o));
  for (const { mat, geos } of buckets.values()) g.add(mesh(mergeGeometries(geos, false), mat));
}

function canvasTexture(cv) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t;
}
/** a canvas drawn once, in colour and in grey clay (for parts not learned yet) */
function dualTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); draw(c, w, h);
  const gv = document.createElement('canvas'); gv.width = w; gv.height = h; const g = gv.getContext('2d'); g.drawImage(cv, 0, 0);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255; const v = 255 * (0.52 + l * 0.34); d[i] = v * 1.02; d[i + 1] = v; d[i + 2] = v * 0.95; }
  g.putImageData(id, 0, 0);
  return { color: canvasTexture(cv), gray: canvasTexture(gv) };
}
/** a flat printed face (screen, label) that follows its part's colour state */
function face(w, h, tex, { basic = false } = {}) {
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex.color, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex.color, roughness: 0.75 });
  mat.userData.tex = tex;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); return m;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fitFont(c, text, maxW, size, weight = FW) { let s = size; c.font = `${weight} ${s}px "${FONT}"`; while (c.measureText(text).width > maxW && s > 12) { s -= 2; c.font = `${weight} ${s}px "${FONT}"`; } return s; }

// ---------------------------------------------------------------- shared little things
/** a person dot: clay pawn (body + head), 1 = ~7 cm */
function person(col, s = 1, seed = 1) {
  const g = new THREE.Group(), m = typeof col === 'string' ? M(col) : col;
  g.add(mesh(lumpy(new THREE.CapsuleGeometry(0.013 * s, 0.018 * s, 3, 10), 0.001, 30, seed), m, 0, 0.022 * s, 0));
  g.add(mesh(sph(0.0125 * s, seed + 1, 0.0008, 12), m, 0, 0.052 * s, 0));
  return g;
}
/** a 9:16 ad card on a little stand (front = +z) */
function adCard(tex, { w = 0.042, stand = true, frame = '#3b3540' } = {}) {
  const g = new THREE.Group(), h = w * 16 / 9;
  g.add(mesh(rbox(w + 0.006, h + 0.006, 0.006, 0.004, 3), M(frame), 0, h / 2 + 0.004, 0));
  const f = face(w, h, tex); f.position.set(0, h / 2 + 0.004, 0.0048); g.add(f);
  if (stand) g.add(mesh(rbox(w * 0.7, 0.006, 0.02, 0.002, 4), M(frame), 0, 0.003, 0));
  g.userData.h = h; return g;
}
function cardTex(kind) {
  return dualTex(108, 192, (c, w, h) => {
    const col = { A: TEAL, B: ORANGE, X: '#c86fa0', Y: '#d9a52b', R: RED, OK: GREEN }[kind] || '#888';
    c.fillStyle = '#fbf7ef'; c.fillRect(0, 0, w, h);
    c.fillStyle = col; c.fillRect(0, 0, w, 62);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(54, 31, 17, 0, 7); c.fill();
    c.fillStyle = '#5b5560'; for (let i = 0; i < 4; i++) { c.fillRect(12, 80 + i * 20, i === 3 ? 50 : 84, 9); }
    c.fillStyle = col; rr(c, 14, 160, 80, 22, 11); c.fill();
    if (kind === 'R') { c.strokeStyle = RED; c.lineWidth = 9; c.beginPath(); c.moveTo(20, 76); c.lineTo(88, 146); c.moveTo(88, 76); c.lineTo(20, 146); c.stroke(); }
    if (kind === 'OK') { c.strokeStyle = GREEN; c.lineWidth = 10; c.beginPath(); c.moveTo(24, 112); c.lineTo(46, 136); c.lineTo(88, 84); c.stroke(); }
  });
}
function coinStack(n, m, r = 0.012, seed = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(mesh(cyl(r, r, 0.0045, 16, seed + i, 0.0003), m, ((i * 37) % 5 - 2) * 0.0006, 0.0025 + i * 0.0048, ((i * 53) % 5 - 2) * 0.0006));
  return g;
}
/** an open half-pipe (trough) along a curve, open side up */
function trough(points, r, mat, seg = 40) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, seg, r, 10, false);
  // keep only the lower half of the ring so the dots inside stay visible
  const p = geo.attributes.position, idx = geo.index.array, keep = [];
  const center = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    let up = 0; for (let k = 0; k < 3; k++) { v.fromBufferAttribute(p, idx[i + k]); const u = Math.floor(idx[i + k] / 11) / seg; curve.getPointAt(Math.min(1, u), center); up += v.y - center.y; }
    if (up < r * 0.4) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(keep);
  const m = mesh(geo, mat); m.material.side = THREE.DoubleSide; return { m, curve };
}
function tube(points, r, mat, seg = 40) { const curve = new THREE.CatmullRomCurve3(points); return { m: mesh(new THREE.TubeGeometry(curve, seg, r, 10, false), mat), curve }; }

// ---------------------------------------------------------------- the 13 parts
// each builder returns { g, h, key, act(k, t, alive) }; static clay is baked afterwards. key = seconds into its loop where the
// key moment starts (it plays when the card passes); t is the part's local time (may be negative before the pass)
// k: 0..1 "switched on" (the colour-in moment of this lesson), alive: true when learned (moving)

// 1 Auction: a viewer with a phone; three ad cards compete for one slot in his feed. Next to each card a column:
// coins (bid) + blue (estimated action rate) + green (ad quality). The tallest column wins — not the one with the most coins.
const AUCTION = [ // [kind, coins, rate, quality]
  ['X', 13, 0.012, 0.012], ['A', 5, 0.056, 0.036], ['Y', 8, 0.016, 0.012]];
function p1() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.18, 0.19, 0.025, 28, 11), M('#d9b98a'), 0, 0.0125, 0));
  g.add(mesh(cyl(0.175, 0.175, 0.004, 28, 12, 0), M('#efe0c4'), 0, 0.027, 0));
  // viewer + phone (right), the phone turned so we can see its feed
  const viewer = person('#8f7cc8', 2.2, 13); viewer.position.set(0.14, 0.027, -0.02); viewer.rotation.y = -Math.PI / 2; g.add(viewer);
  const phone = new THREE.Group(); phone.position.set(0.105, 0.105, 0.035); phone.rotation.y = -0.55; g.add(phone);
  phone.add(mesh(rbox(0.046, 0.08, 0.008, 0.006, 14), M('#2f2a33')));
  const feedTex = dualTex(92, 160, (c, w, h) => { c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#d6d0c6'; c.fillRect(8, 8, 76, 36); c.fillRect(8, 116, 76, 36); c.strokeStyle = '#f5b400'; c.lineWidth = 6; c.setLineDash([8, 6]); c.strokeRect(8, 54, 76, 52); });
  const scr = face(0.039, 0.069, feedTex); scr.position.z = 0.0058; phone.add(scr);
  const slotCard = ANIM(new THREE.Group()); phone.add(slotCard);           // the winner lands in the empty slot
  slotCard.add(mesh(rbox(0.032, 0.021, 0.003, 0.002, 15, 0), M(TEAL), 0, 0.0005, 0.0068));
  const coin = M('#e8b84a', { emissive: '#7a5a10', ei: 0.12 }), blue = M('#6aa6d9'), green = M('#7cb46b');
  const cards = AUCTION.map(([kind, nc, rate, q], i) => {
    const cg = ANIM(new THREE.Group()); cg.position.set(-0.13 + i * 0.075, 0.027, -0.02 + (i === 1 ? 0.012 : 0)); g.add(cg);
    const card = adCard(cardTex(kind), { w: 0.04, frame: kind === 'A' ? '#2c4f4b' : '#3b3540' }); card.position.x = -0.014; cg.add(card);
    const col = new THREE.Group(); col.position.set(0.024, 0, 0.004); cg.add(col);
    col.add(coinStack(nc, coin, 0.011, 20 + i * 20));
    const hc = nc * 0.0048;
    col.add(mesh(rbox(0.02, rate, 0.02, 0.004, 60 + i), blue, 0, hc + rate / 2 + 0.001, 0));
    col.add(mesh(rbox(0.02, q, 0.02, 0.004, 70 + i), green, 0, hc + rate + q / 2 + 0.002, 0));
    col.userData.top = hc + rate + q + 0.004;
    return { cg, card, col, kind };
  });
  const crown = mesh(cyl(0.014, 0.01, 0.014, 6, 90, 0), M('#f5d76e', { emissive: '#8a6a10', ei: 0.35 })); cards[1].col.add(ANIM(crown)); crown.position.y = cards[1].col.userData.top + 0.01;
  // where the winning card flies to, in its own group's frame
  g.updateMatrixWorld(true);
  const flyTo = cards[1].cg.worldToLocal(phone.localToWorld(V(0, 0, 0.01)));
  return { g, h: 0.2, key: 0.0, act(k, t, alive) {
    // loop 3.2 s: columns grow (0–0.45 s), crown pops (0.5 s), the winning card flies into the phone (0.6–1.0 s), hold
    const ph = alive ? (((t % 3.2) + 3.2) % 3.2) : 2.0;
    const grow = alive ? ease.out(prog(ph, 0.0, 0.45)) : 1;
    cards.forEach((c, i) => { c.col.scale.y = Math.max(0.04, grow); });
    crown.visible = !alive || ph > 0.5; crown.scale.setScalar(alive ? Math.max(0.001, ease.outBack(prog(ph, 0.5, 0.62))) : 1);
    const fly = alive ? ease.inOut(prog(ph, 0.6, 1.0)) : 0;
    const w = cards[1].card; w.position.set(lerp(-0.014, flyTo.x, fly), lerp(0, flyTo.y - 0.03, fly) + 0.04 * Math.sin(fly * Math.PI), lerp(0, flyTo.z, fly)); w.scale.setScalar(lerp(1, 0.5, fly)); w.visible = fly < 0.97;
    slotCard.visible = !alive ? true : ph > 0.98;
  } };
}

// 2 Return pipes: two troughs from the app store back to the dashboard. Android: clear single dots, on time.
// iOS: an ATT gate at the entrance blocks part of the dots; what passes merges into one blurry lump that arrives late (SKAN).
function p2() {
  const g = new THREE.Group();
  const aM = M('#8fc47a'), iM = M('#c9d2dc');
  const ta = trough([V(0.42, 0.035, -0.06), V(0.1, 0.03, -0.06), V(-0.2, 0.03, -0.06), V(-0.42, 0.035, -0.06)], 0.022, aM);
  const ti = trough([V(0.42, 0.035, 0.035), V(0.1, 0.03, 0.035), V(-0.2, 0.03, 0.035), V(-0.42, 0.035, 0.035)], 0.022, iM);
  g.add(ta.m, ti.m);
  for (let i = 0; i < 4; i++) for (const z of [-0.06, 0.035]) g.add(mesh(rbox(0.012, 0.012, 0.03, 0.003, 100 + i), M('#b08a62'), -0.35 + i * 0.24, 0.006, z));
  const tagTex = (txt, bg) => dualTex(220, 80, (c, w, h) => { c.fillStyle = bg; rr(c, 4, 4, w - 8, h - 8, 30); c.fill(); c.fillStyle = '#fff'; fitFont(c, txt, w - 30, 50); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2 + 2); });
  const ta1 = face(0.1, 0.036, tagTex('Android', '#5e9e4c')); ta1.position.set(0.44, 0.08, -0.06); g.add(ta1);
  const ti1 = face(0.07, 0.036, tagTex('iOS', '#7d8794')); ti1.position.set(0.46, 0.08, 0.04); g.add(ti1);
  // ATT gate across the iOS trough entrance
  const post = M('#efe3cf');
  for (const dz of [-0.03, 0.03]) g.add(mesh(rbox(0.012, 0.08, 0.012, 0.004, 104), post, 0.3, 0.04, 0.035 + dz));
  const bar = mesh(rbox(0.012, 0.014, 0.075, 0.004, 105), M(RED), 0.3, 0.05, 0.035); g.add(bar);
  const att = face(0.07, 0.03, dualTex(180, 76, (c, w, h) => { c.fillStyle = RED; rr(c, 3, 3, w - 6, h - 6, 20); c.fill(); c.fillStyle = '#fff'; c.font = `${FW} 50px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ATT', w / 2, h / 2 + 2); }));
  att.position.set(0.3, 0.1, 0.04); g.add(att);
  const clock = new THREE.Group(); clock.position.set(-0.2, 0.09, 0.035); g.add(clock);
  const cf = mesh(cyl(0.024, 0.024, 0.008, 20, 110, 0), M('#fbf3e6')); cf.rotation.x = Math.PI / 2; clock.add(cf);
  const hand = ANIM(new THREE.Group()); hand.position.z = 0.005; clock.add(hand);
  hand.add(mesh(rbox(0.004, 0.02, 0.003, 0.001, 111, 0), M('#3b2a20'), 0, 0.009, 0));
  const dotM = M('#ffffff', { emissive: '#ffffff', ei: 0.25 });
  const dots = Array.from({ length: 8 }, (_, i) => { const d = ANIM(mesh(sph(0.009, 120 + i, 0.0004, 10), dotM)); g.add(d); return d; });
  // iOS dots arriving at the gate: 2 of 3 are stopped (they fall off), the rest join the lump
  const idots = Array.from({ length: 6 }, (_, i) => { const d = ANIM(mesh(sph(0.009, 140 + i, 0.0004, 10), dotM)); g.add(d); return d; });
  const lumpM = new THREE.MeshStandardMaterial({ color: '#e9eef4', roughness: 0.9, transparent: true, opacity: 0.75 });
  const lump = ANIM(new THREE.Group()); g.add(lump);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.014 + i * 0.002, 10, 8), lumpM); s.position.set((i - 2) * 0.012, 0.004 * Math.sin(i * 2), 0.004 * Math.cos(i * 3)); lump.add(s); }
  return { g, h: 0.12, key: 0, act(k, t, alive) {
    const tt = alive ? t : 0.9;
    dots.forEach((d, i) => { const u = (((tt * 0.3 + i / dots.length) % 1) + 1) % 1; const p = ta.curve.getPointAt(u); d.position.set(p.x, p.y + 0.004, p.z); d.visible = alive || i % 2 === 0; });
    idots.forEach((d, i) => {
      const ph = (((tt * 0.6 + i / idots.length) % 1) + 1) % 1, blocked = i % 3 !== 2;
      let x = lerp(0.5, 0.3, Math.min(1, ph / 0.5)), y = 0.04, z = 0.035, s = 1;
      if (ph > 0.5) { const f = (ph - 0.5) / 0.5; if (blocked) { x = 0.31 + 0.03 * f; y = 0.04 - 0.05 * f * f; z = 0.035 + 0.05 * f; s = 1 - f; } else { x = lerp(0.3, 0.18, f); s = 1 - f; } }
      d.position.set(x, y, z); d.scale.setScalar(Math.max(0.01, s)); d.visible = alive;
    });
    const ul = alive ? ((((tt * 0.08) % 1) + 1) % 1) * 0.85 + 0.12 : 0.45; const p = ti.curve.getPointAt(ul); lump.position.set(p.x, p.y + 0.008, p.z);
    hand.rotation.z = -tt * 3;
  } };
}

// 3 Fork: after the click the road splits — to the App store (lit; the course's advertiser takes it) or to a web sign-up page (grey: only before launch)
function p3() {
  const g = new THREE.Group();
  const road = M('#f4dfae'), dim = M('#c9c2b4', { keep: true });
  const seg = (a, b, m, w = 0.05) => { const d = b.clone().sub(a); const s = mesh(rbox(d.length(), 0.006, w, 0.003, 130), m); s.position.copy(a.clone().add(b).multiplyScalar(0.5)); s.rotation.y = -Math.atan2(d.z, d.x); g.add(s); };
  seg(V(-0.02, 0.004, -0.2), V(0, 0.004, -0.02), road);
  seg(V(0, 0.004, -0.02), V(-0.13, 0.004, 0.12), road);
  seg(V(0, 0.004, -0.02), V(0.1, 0.004, 0.11), dim);
  // App store: blue tile with a download arrow
  const app = new THREE.Group(); app.position.set(-0.16, 0, 0.15); app.rotation.y = 0.3; g.add(app);
  app.add(mesh(rbox(0.012, 0.06, 0.012, 0.003, 131), M('#b08a62'), 0, 0.03, -0.008));
  const appTex = dualTex(128, 128, (c, w, h) => { c.fillStyle = META; rr(c, 4, 4, 120, 120, 28); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 26); c.lineTo(64, 84); c.moveTo(40, 62); c.lineTo(64, 86); c.lineTo(88, 62); c.moveTo(34, 102); c.lineTo(94, 102); c.stroke(); });
  app.add(mesh(rbox(0.074, 0.074, 0.014, 0.014, 132), M('#1460c8'), 0, 0.1, 0));
  const af = face(0.068, 0.068, appTex); af.position.set(0, 0.1, 0.0095); app.add(af);
  // web page with a form (grey for good)
  const web = new THREE.Group(); web.position.set(0.13, 0, 0.14); web.rotation.y = -0.4; g.add(web);
  const webTex = dualTex(128, 100, (c, w, h) => { c.fillStyle = '#d5d0c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8a196'; c.fillRect(0, 0, w, 16); c.fillStyle = '#efebe4'; c.fillRect(14, 30, 100, 14); c.fillRect(14, 52, 100, 14); c.fillStyle = '#9b948a'; rr(c, 34, 74, 60, 16, 8); c.fill(); });
  web.add(mesh(rbox(0.012, 0.05, 0.012, 0.003, 133), M('#a39c92', { keep: true }), 0, 0.025, -0.008));
  web.add(mesh(rbox(0.078, 0.062, 0.01, 0.006, 134), M('#a39c92', { keep: true }), 0, 0.08, 0));
  const wf = face(0.07, 0.054, webTex); wf.position.set(0, 0.08, 0.0075); web.add(wf);
  const walker = ANIM(person('#8f7cc8', 1.1, 135)); g.add(walker);
  return { g, h: 0.14, key: 0, act(k, t, alive) {
    const ph = alive ? pm(t, 2.0) / 2.0 : 0.4;
    const a = V(-0.01, 0.006, -0.18), b = V(0, 0.006, -0.02), c = V(-0.13, 0.006, 0.11);
    const p = ph < 0.5 ? a.clone().lerp(b, ph / 0.5) : b.clone().lerp(c, (ph - 0.5) / 0.5);
    walker.position.copy(p); walker.position.y += alive ? 0.006 * Math.abs(Math.sin(ph * 18)) : 0;
    walker.scale.setScalar(ph > 0.9 && alive ? Math.max(0.01, 1 - (ph - 0.9) * 10) : 1);
  } };
}

// 4 Campaign budget tap: NT$3,000 in coins feeds a tap labelled 「買：安裝」 ("Buy: Installs"); the water splits into two equally thick streams (A, B)
function p4() {
  const g = new THREE.Group();
  const coin = M('#e8b84a', { emissive: '#7a5a10', ei: 0.12 });
  [[-0.1, 0, 0, 9], [-0.07, 0, 0.035, 7], [-0.13, 0, 0.04, 6], [-0.045, 0, -0.02, 8], [-0.11, 0, -0.04, 10]].forEach(([x, y, z, n], i) => { const s = coinStack(n, coin, 0.016, 140 + i * 13); s.position.set(x, y, z); g.add(s); });
  const sign = face(0.12, 0.04, dualTex(300, 100, (c, w, h) => { c.fillStyle = '#fff6e3'; rr(c, 4, 4, w - 8, h - 8, 22); c.fill(); c.strokeStyle = '#c98f5c'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#7a5a10'; c.font = `${FW} 56px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('NT$3,000', w / 2, h / 2 + 3); }));
  sign.position.set(-0.09, 0.07, 0.075); sign.rotation.x = -0.2; g.add(sign);
  // pipe up from the coins and over to the tap
  const pipeM = M('#9aa7b4');
  g.add(mesh(cyl(0.012, 0.012, 0.17, 14, 150), pipeM, -0.02, 0.085, -0.03));
  const elbow = mesh(sph(0.016, 151, 0.0005), pipeM, -0.02, 0.17, -0.03); g.add(elbow);
  const arm = mesh(cyl(0.012, 0.012, 0.11, 14, 152), pipeM, 0.035, 0.17, -0.03); arm.rotation.z = Math.PI / 2; g.add(arm);
  const head = mesh(cyl(0.017, 0.014, 0.04, 14, 153), pipeM, 0.09, 0.155, -0.03); g.add(head);
  const handle = ANIM(new THREE.Group()); handle.position.set(0.09, 0.19, -0.03); g.add(handle);
  handle.add(mesh(cyl(0.004, 0.004, 0.02, 8, 154, 0), M('#7a8794'), 0, -0.01, 0));
  const hb = mesh(rbox(0.06, 0.012, 0.012, 0.005, 155), M(RED)); handle.add(hb);
  // the "Buy: Installs" tag hanging from the arm
  const tag = EN
    ? face(0.13, 0.04, dualTex(340, 104, (c, w, h) => { c.fillStyle = '#ffffff'; rr(c, 4, 4, w - 8, h - 8, 18); c.fill(); c.strokeStyle = META; c.lineWidth = 8; c.stroke(); c.fillStyle = '#1a3d7a'; fitFont(c, 'Buy: Installs', w - 34, 54); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Buy: Installs', w / 2, h / 2 + 3); }))
    : face(0.1, 0.04, dualTex(260, 104, (c, w, h) => { c.fillStyle = '#ffffff'; rr(c, 4, 4, w - 8, h - 8, 18); c.fill(); c.strokeStyle = META; c.lineWidth = 8; c.stroke(); c.fillStyle = '#1a3d7a'; c.font = `${FW} 54px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('買：安裝', w / 2, h / 2 + 3); }));
  tag.position.set(0.04, 0.215, -0.01); g.add(tag);
  return { g, h: 0.24, key: 0, act(k, t, alive) {
    handle.rotation.y = alive ? 0.9 : 0;
  } };
}

// 5 Ad set fences: two fenced crowds (A teal, B orange). Solid fence = hard limit; dashed start ring = a soft suggestion the system searches out from
function pen(col, seed) {
  const g = new THREE.Group(), post = M(col), rail = M(col);
  const W = 0.22, D = 0.17;
  g.add(mesh(rbox(W, 0.006, D, 0.003, seed), M('#cfe3b4'), 0, 0.003, 0));
  const pts = [];
  for (let i = 0; i <= 5; i++) pts.push([-W / 2 + i * W / 5, -D / 2], [-W / 2 + i * W / 5, D / 2]);
  for (let i = 1; i < 4; i++) pts.push([-W / 2, -D / 2 + i * D / 4], [W / 2, -D / 2 + i * D / 4]);
  pts.forEach(([x, z], i) => g.add(mesh(cyl(0.0045, 0.005, 0.045, 8, seed + i, 0.0003), post, x, 0.0225, z)));
  for (const y of [0.018, 0.036]) {
    g.add(mesh(rbox(W, 0.005, 0.005, 0.002, seed + 30), rail, 0, y, -D / 2)); g.add(mesh(rbox(W, 0.005, 0.005, 0.002, seed + 31), rail, 0, y, D / 2));
    g.add(mesh(rbox(0.005, 0.005, D, 0.002, seed + 32), rail, -W / 2, y, 0)); g.add(mesh(rbox(0.005, 0.005, D, 0.002, seed + 33), rail, W / 2, y, 0));
  }
  // dashed start ring
  const ring = new THREE.Group(); ring.position.set(-0.03, 0.007, 0.01); g.add(ring);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const d = mesh(rbox(0.012, 0.004, 0.005, 0.002, seed + 40 + i, 0), M('#ffffff', { keep: false }), Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04); d.rotation.y = -a + Math.PI / 2; ring.add(d); }
  // people: grey outside the found circle, coloured inside it (the search spreads)
  const r = S.rng(seed), crowd = [];
  for (let i = 0; i < 14; i++) {
    let x, z; do { x = (r() - 0.5) * (W - 0.03); z = (r() - 0.5) * (D - 0.03); } while (Math.hypot(x - 0.06, z + 0.04) < 0.035);   // leave room for the cards (back right)
    const d = Math.hypot(x + 0.03, z - 0.01);
    const p = ANIM(person(M(col), 0.8, seed + 50 + i)); p.position.set(x, 0.006, z); p.userData.d = d; g.add(p); crowd.push(p);
  }
  return { g, crowd, ring };
}
function p5() {
  const g = new THREE.Group();
  const A = pen(TEAL, 200), B = pen(ORANGE, 260);
  A.g.position.set(-0.13, 0, 0); B.g.position.set(0.13, 0, 0); g.add(A.g, B.g);
  const lab = (txt, col) => face(0.05, 0.05, dualTex(96, 96, (c, w, h) => { c.fillStyle = col; c.beginPath(); c.arc(48, 48, 44, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `${FW} 62px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 48, 52); }));
  const la = lab('A', TEAL), lb = lab('B', ORANGE); la.position.set(-0.22, 0.07, 0.09); lb.position.set(0.04, 0.07, 0.09); g.add(la, lb);
  const greyP = M('#b9b2a8', { keep: true });
  return { g, h: 0.1, focus: V(0, 0.03, 0), act(k, t, alive) {
    for (const P of [A, B]) {
      const reach = alive ? 0.045 + 0.1 * (pm(t * 0.35, 1.3)) : 0.13;
      P.crowd.forEach(p => { const on = p.userData.d < reach; p.scale.setScalar(on ? 1 : 0.85); p.traverse(m => { if (m.isMesh) { if (!m.userData.own) m.userData.own = m.material; m.material = on ? m.userData.own : greyP; } }); });
    }
  } };
}

// 6 Ad cards: 2–3 9:16 cards planted in each pen; A and B differ only in the sentence
function p6() {
  const g = new THREE.Group();
  const tA = cardTex('A'), tB = cardTex('B');
  const cards = [];
  [[-0.13, tA], [0.13, tB]].forEach(([x, tx], j) => {
    for (let i = 0; i < 3; i++) { const c = adCard(tx, { w: 0.036 }); c.position.set(x + 0.035 + i * 0.03, 0.006, -0.055 + i * 0.006); c.rotation.y = -0.15; g.add(ANIM(c)); cards.push(c); }
  });
  return { g, h: 0.1, focus: V(0, 0.04, -0.03), act(k, t, alive) {
    cards.forEach((c, i) => { c.rotation.z = alive ? 0.06 * Math.sin(t * 2.2 + i) : 0; });
  } };
}

// 7 Policy gate: a gate in front of the auction. A "you + attribute" card bounces back (red); the rewrite with a new subject passes (green)
function p7(opt = {}) {
  const g = new THREE.Group(), stone = M('#efe3cf'), cap = M('#d9c6a8');
  for (const sx of [-1, 1]) { g.add(mesh(rbox(0.035, 0.15, 0.035, 0.008, 300 + sx), stone, sx * 0.065, 0.075, 0)); g.add(mesh(rbox(0.045, 0.018, 0.045, 0.006, 302 + sx), cap, sx * 0.065, 0.158, 0)); }
  g.add(mesh(rbox(0.17, 0.025, 0.035, 0.008, 305), stone, 0, 0.175, 0));
  const lamp = mesh(sph(0.016, 306, 0.0005), M('#bbb', { keep: true }), 0, 0.2, 0.0); g.add(ANIM(lamp));
  const lampM = new THREE.MeshStandardMaterial({ color: '#888', emissive: '#000', roughness: 0.5 }); lamp.material = lampM;
  const bad = ANIM(adCard(cardTex('R'), { w: 0.034 })); g.add(bad);
  const good = ANIM(adCard(cardTex('OK'), { w: 0.034 })); g.add(good);
  bad.rotation.y = good.rotation.y = -Math.PI / 2;
  return { g, h: 0.22, key: 0.8, act(k, t, alive) {
    // loop 3 s: the "you + attribute" card runs into the gate, the lamp turns red, it bounces back and tips over;
    // the rewritten card (a new subject) passes, the lamp turns green
    if (opt.settled && alive) {     // after the lesson: the rewrite passes, green; the "you + attribute" card stays tipped over outside the gate
      const c2 = pm(t, 2.4) / 2.4;
      bad.visible = true; bad.position.set(0.02, 0, -0.16); bad.rotation.x = -0.6;
      good.visible = true; good.position.set(-0.02, 0, lerp(-0.22, 0.24, c2));
      lampM.color.set(GREEN); lampM.emissive.set('#0f5a20'); lampM.emissiveIntensity = 0.9; return;
    }
    const ph = alive ? pm(t, 3.0) / 3.0 : 0.3;
    const a = ph < 0.35 ? ph / 0.35 : 1, b = prog(ph, 0.35, 0.55);
    bad.position.set(0.02, 0, lerp(-0.22, -0.05, ease.in(a)) - 0.09 * ease.out(b)); bad.rotation.x = -0.6 * ease.out(b);
    bad.visible = !alive || ph < 0.9;
    const c = prog(ph, 0.5, 1.0); good.position.set(-0.02, 0, alive ? lerp(-0.22, 0.24, c) : 0.12); good.visible = !alive || ph > 0.5;
    const red = alive && ph > 0.33 && ph < 0.58, green = alive && ph >= 0.6;
    lampM.color.set(!alive ? '#a9a39a' : red ? RED : green ? GREEN : '#c8c0b4');
    lampM.emissive.set(red ? '#8a1010' : green ? '#0f5a20' : '#000'); lampM.emissiveIntensity = 0.9;
  } };
}

// 8 Creative workbench (lesson 8's review desk, seen from afar): Hook / Body / CTA blocks snap into one little film strip; beside it a grid of
// viewers — as the playhead runs along the strip, the ones who swipe away go dark (most of them during the Hook)
function blockTex(txt, bg, ink = '#fff') { return dualTex(220, 90, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = ink; fitFont(c, txt, w - 20, 58); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2 + 3); }); }
const STRIP = [['Hook', '#7C5CD6', 0.05, '#ffffff'], ['Body', '#2B8FD6', 0.1, '#ffffff'], ['CTA', '#C2338A', 0.045, '#ffffff']];   // the same colours as lesson 8's own scene
function filmStrip(hookCol, seed, { H = 0.045, D = 0.022 } = {}) {
  const g = new THREE.Group(), blocks = []; let x = 0;
  const total = STRIP.reduce((a, s) => a + s[2], 0);
  STRIP.forEach(([txt, col, w, ink], i) => {
    const c = i === 0 ? hookCol : col;
    const b = ANIM(new THREE.Group()); g.add(b);
    b.add(mesh(rbox(w - 0.003, H, D, 0.005, seed + i), M(c)));
    const f = face((w - 0.003) * 0.88, H * 0.62, blockTex(txt, c, ink)); f.position.z = D / 2 + 0.0026; b.add(f);
    b.userData.x = x + w / 2 - total / 2; b.userData.w = w; x += w; blocks.push(b);
  });
  // sprocket rails (film) above and below
  const filmM = M('#3b3540');
  for (const y of [H / 2 + 0.006, -H / 2 - 0.006]) g.add(mesh(rbox(total + 0.012, 0.01, D * 0.6, 0.003, seed + 9), filmM, 0, y, -0.002));
  g.userData.blocks = blocks; g.userData.total = total; g.userData.H = H;
  return g;
}
// opts.parts[8] = { viewers: 100, keep: [1, 0.30, 0.14, 0.10] (share still watching at start / after Hook / Body / CTA), counts: 'left' | 'none', on: '#F2780C', off: '#CBCFD5' }
function p8(opt = {}) {
  const g = new THREE.Group(), wood = M('#c98f5c'), leg = M('#a96d42');
  g.add(mesh(rbox(0.3, 0.016, 0.16, 0.006, 400), wood, 0, 0.062, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.007, 0.008, 0.056, 8, 401 + sx + sz * 2), leg, sx * 0.13, 0.028, sz * 0.06));
  const strip = filmStrip(STRIP[0][1], 410, { H: 0.058, D: 0.024 }); strip.scale.set(1.25, 1, 1); strip.position.set(0, 0.07 + 0.04, 0.035); strip.rotation.x = -0.2; g.add(strip);
  const bl = strip.userData.blocks, total = strip.userData.total;
  const head = ANIM(mesh(rbox(0.005, 0.075, 0.03, 0.002, 430), M(RED))); strip.add(head);
  // the audience: 10 x 6 viewers on a board right above the strip, as wide as the strip.
  // lit = still watching, dark = swiped away. Under it, one count per block: how many left during that block.
  const N = opt.viewers ?? 100, GW = Math.max(5, Math.ceil(Math.sqrt(N * 1.8))), GH = Math.ceil(N / GW), CW = 480, CS = CW / GW, CH = Math.round(CS * 0.8 * GH + 96);
  const ON = opt.on || ORANGE, OFF = opt.off || LEFT_GRAY;
  const F8 = FONT, W8 = FW, EN8 = EN;      // drawn at update time: keep this map's language
  const gcv = document.createElement('canvas'); gcv.width = CW; gcv.height = CH; const gc = gcv.getContext('2d');
  const gtex = canvasTexture(gcv);
  const gboard = new THREE.Group(); gboard.position.set(0, 0.07, -0.035); gboard.rotation.x = -0.2; g.add(gboard);
  const BW = total * 1.25 + 0.012, BH = BW * CH / CW;
  gboard.add(mesh(rbox(BW + 0.01, BH + 0.01, 0.008, 0.005, 431), M('#4a4250'), 0, 0.075 + BH / 2, 0));
  for (const sx of [-1, 1]) gboard.add(mesh(rbox(0.008, 0.08, 0.008, 0.003, 432), M('#4a4250'), sx * BW * 0.42, 0.04, 0));
  const gf = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.8 })); gf.position.set(0, 0.075 + BH / 2, 0.0062); gboard.add(gf);
  const r = S.rng(77), quit = Array.from({ length: N }, () => r());
  const KEEP = opt.keep || [1, 0.30, 0.14, 0.10];       // share still watching at the start / after Hook / after Body / after CTA
  const segEnd = []; { let x = 0; STRIP.forEach(s => { x += s[2]; segEnd.push(x / total); }); }
  const keep = (p) => { // p 0..1 along the strip
    let a = 0; for (let i = 0; i < 3; i++) { const b = segEnd[i]; if (p <= b) return lerp(KEEP[i], KEEP[i + 1], (p - a) / (b - a)); a = b; } return KEEP[3]; };
  let lastKey = '';
  const drawGrid = (p, alive) => {
    const key = alive ? Math.round(p * 80) : 'gray'; if (key === lastKey) return; lastKey = key;
    gc.fillStyle = alive ? '#f4f2ee' : '#d8d2c8'; gc.fillRect(0, 0, CW, CH);
    const kp = alive ? keep(p) : 1;
    const cs = CW / GW;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (j * GW + i >= N) continue;
      const on = quit[j * GW + i] < kp; gc.fillStyle = !alive ? '#a39b8f' : on ? ON : OFF;
      gc.beginPath(); gc.arc(cs / 2 + i * cs, cs * 0.45 + j * cs * 0.8, cs * 0.31, 0, 7); gc.fill();
    }
    // how many are still watching, under the grid (lesson 8's numbers: 100 → 30 after the 3-second Hook → 10 at the end);
    // shown when the playhead has passed the end of the Hook and the end of the clip. counts: 'none' = lights only
    if (opt.counts !== 'none' && alive) {
      gc.textAlign = 'center'; gc.textBaseline = 'middle';
      if (EN8) {   // "30 left" is wider than the Chinese label: keep it inside the board
        const put = (txt, x) => { const hw = gc.measureText(txt).width / 2 + 10; gc.fillText(txt, clamp(x, hw, CW - hw), CH - 44); };
        if (p >= segEnd[0] - 0.001) { gc.fillStyle = RED; gc.font = `${W8} 56px "${F8}"`; put(`${Math.round(N * KEEP[1])} left`, segEnd[0] / 2 * CW); }
        if (p >= 0.999) { gc.fillStyle = '#5b5560'; gc.font = `${W8} 48px "${F8}"`; put(`${Math.round(N * KEEP[3])} left`, (segEnd[1] + 1) / 2 * CW); }
      } else {
      if (p >= segEnd[0] - 0.001) { gc.fillStyle = RED; gc.font = `${W8} 56px "${F8}"`; gc.fillText(`剩 ${Math.round(N * KEEP[1])}`, segEnd[0] / 2 * CW, CH - 44); }
      if (p >= 0.999) { gc.fillStyle = '#5b5560'; gc.font = `${W8} 48px "${F8}"`; gc.fillText(`剩 ${Math.round(N * KEEP[3])}`, (segEnd[1] + 1) / 2 * CW, CH - 44); }
      }
    }
    gtex.needsUpdate = true;
  };
  return { g, h: 0.3, key: 0.6, act(k, t, alive) {
    // loop 4.4 s: the blocks fly in and snap (0–0.55), the playhead runs the strip (0.7–2.6: Hook 0.7–1.2), hold
    const ph = alive ? (((t % 4.4) + 4.4) % 4.4) : 0;
    const starts = [V(-0.06, -0.03, 0.07), V(0.0, 0.07, 0.06), V(0.07, -0.03, 0.07)];
    bl.forEach((b, i) => {
      const s = alive ? ease.inOut(prog(ph, i * 0.12, 0.3 + i * 0.12)) : 0;
      const to = V(b.userData.x, 0, 0);
      const from = alive ? to.clone().add(starts[i]) : V(b.userData.x * 1.3, -0.012, 0.03 * (i - 1));
      b.position.copy(from.lerp(to, s)); b.position.y += 0.03 * Math.sin(s * Math.PI);
    });
    // playhead: slower over the Hook so the drop can be seen
    const hookEnd = segEnd[0];
    const pp = !alive ? 0 : ph < 0.7 ? 0 : ph < 1.3 ? hookEnd * prog(ph, 0.7, 1.3) : lerp(hookEnd, 1, prog(ph, 1.3, 2.6));
    head.visible = alive && ph > 0.65; head.position.set(-total / 2 + total * pp, 0, 0.015); head.scale.set(0.8, 1.25, 1);
    drawGrid(pp, alive);
  } };
}

// 9 Test bench (lesson 9's season fast-forward, seen from afar; drawn like that lesson's test bench): two phones side by side — Hook on top,
// the message (the sentence) in the middle, CTA at the bottom; only the middle block differs (A teal / B orange).
// They are pushed into the system together; a small tracking sheet grows one row per round.
// opts.parts[9] = { labels: ['Hook', '訊息 A', '訊息 B', 'CTA'] }   (zh defaults; 訊息 = "Message")
function p9(opt = {}) {
  const lb = opt.labels || (EN ? ['Hook', 'Message A', 'Message B', 'CTA'] : ['Hook', '訊息 A', '訊息 B', 'CTA']);
  const g = new THREE.Group();
  g.add(mesh(rbox(0.26, 0.02, 0.15, 0.008, 500), M('#b9a58a'), 0, 0.01, 0));
  const phoneOf = (msgCol, msgTxt, seed) => {
    const p = new THREE.Group();
    p.add(mesh(rbox(0.066, 0.122, 0.01, 0.01, seed), M('#24222a'), 0, 0.061, 0));
    const blk = (txt, col, ink, y, h) => {
      const b = new THREE.Group(); b.position.set(0, y, 0.005); p.add(b);
      b.add(mesh(rbox(0.054, h, 0.008, 0.004, seed + y * 1000), M(col)));
      const f = face(0.05, h * 0.8, dualTex(240, Math.round(240 * h * 0.8 / 0.05), (c, w, hh) => { c.fillStyle = col; c.fillRect(0, 0, w, hh); c.fillStyle = ink; fitFont(c, txt, w - 20, Math.min(56, hh * 0.6)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, hh / 2 + 2); }));
      f.position.z = 0.0062; b.add(f); return b;
    };
    blk(lb[0], '#e8e4dc', '#6b6460', 0.104, 0.02);
    const msg = blk(msgTxt, msgCol, '#ffffff', 0.064, 0.05);
    blk(lb[3], '#e8e4dc', '#6b6460', 0.022, 0.024);
    p.userData.msg = msg;
    return p;
  };
  const a = phoneOf(TEAL, lb[1], 510), b = phoneOf(ORANGE, lb[2], 520);
  a.position.set(-0.075, 0.02, 0.0); b.position.set(0.005, 0.02, 0.0); a.rotation.x = b.rotation.x = -0.22; g.add(a, b);
  // "only this block differs": a red ≠ between the two message blocks
  const ne = face(0.026, 0.026, dualTex(64, 64, (c) => { c.fillStyle = RED; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `${FW} 48px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('≠', 32, 35); }));
  ne.position.set(-0.035, 0.085, 0.03); ne.rotation.x = -0.22; g.add(ne);
  // tracking sheet: rows grow (round counter)
  const scv = document.createElement('canvas'); scv.width = 120; scv.height = 150; const sc = scv.getContext('2d'); const stex = canvasTexture(scv);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.075), new THREE.MeshStandardMaterial({ map: stex, roughness: 0.8 }));
  sheet.position.set(0.09, 0.06, 0.0); sheet.rotation.set(-0.5, -0.3, 0); g.add(sheet);
  g.add(mesh(rbox(0.066, 0.081, 0.006, 0.003, 530), M('#c98f5c'), 0.09, 0.058, -0.004)); g.children[g.children.length - 1].rotation.set(-0.5, -0.3, 0);
  let last = '';
  const drawSheet = (rows, alive) => {
    const key = alive + ':' + rows; if (key === last) return; last = key;
    sc.fillStyle = alive ? '#fbf7ef' : '#d8d2c8'; sc.fillRect(0, 0, 120, 150);
    sc.fillStyle = alive ? '#6b5a48' : '#9b948a'; sc.fillRect(0, 0, 120, 26);
    for (let i = 0; i < rows; i++) { sc.fillStyle = !alive ? '#aaa397' : TEAL; sc.fillRect(10, 34 + i * 22, 44, 14); sc.fillStyle = !alive ? '#aaa397' : ORANGE; sc.fillRect(64, 34 + i * 22, 44, 14); }
    stex.needsUpdate = true;
  };
  return { g, h: 0.15, key: 2.2, act(k, t, alive) {
    // loop 4 s: the two message blocks pulse (the only difference), then both phones slide into the system together
    const ph = alive ? pm(t, 4.0) / 4.0 : 0;
    const pulse = alive ? 1 + 0.08 * Math.sin(Math.PI * clamp(ph / 0.3)) : 1;
    a.userData.msg.scale.setScalar(pulse); b.userData.msg.scale.setScalar(pulse);
    const push = alive ? ease.in(prog(ph, 0.65, 0.95)) : 0;
    a.position.x = -0.075 + 0.05 * push; b.position.x = 0.005 + 0.05 * push;
    drawSheet(alive ? 1 + Math.floor(ph * 5) : 2, alive);
  } };
}

// 10 Dashboard (lesson 10's report development, seen from afar; drawn like that lesson's funnel): B-group dots stream out of a phone feed
// through five gates; at each gate some stop and pile up grey under it (pile size = how many left); fewer walk on.
// Gate state colours: green = normal, red = the first abnormal gate (read left to right, fix only the first red), grey = right of it (not read yet).
// opts.parts[10] = { redGate: 1..5 | 0 (none), labels: [[line1, line2?], ×5] }
const GATES10 = [['3 秒', '觀看率'], ['連結', '點擊率'], ['安裝率'], ['啟用率'], ['D7', '留存']];
const GATES10_EN = [['3-sec', 'view rate'], ['Link', 'CTR'], ['Install', 'rate'], ['Activation', 'rate'], ['D7', 'retention']];
const GATE_COL = { ok: GREEN, bad: RED, later: '#B8BDC4' }, LEFT_GRAY = '#CBCFD5';
function p10(opt = {}) {
  const red = opt.redGate ?? (opt.settled ? 0 : 1), labels = opt.labels || (EN ? GATES10_EN : GATES10);
  let gateFs = 60; if (EN) { const mc = document.createElement('canvas').getContext('2d'); for (const l of labels.flat()) gateFs = Math.min(gateFs, fitFont(mc, l, 260 - 44, 60)); }   // EN: one size for all five gates   // overview / finale: all green unless asked
  const g = new THREE.Group();
  const L = 0.46, x0 = -L / 2;
  g.add(mesh(rbox(L + 0.04, 0.008, 0.08, 0.003, 600), M('#efe0c4'), 0, 0.004, 0));
  const ph = new THREE.Group(); ph.position.set(x0 - 0.03, 0, 0); g.add(ph);
  ph.add(mesh(rbox(0.035, 0.06, 0.007, 0.005, 601), M('#2f2a33'), 0, 0.035, 0));
  const fs = face(0.029, 0.05, dualTex(58, 100, (c, w, h) => { c.fillStyle = '#fbf7ef'; c.fillRect(0, 0, w, h); c.fillStyle = ORANGE; c.fillRect(5, 22, 48, 54); c.fillStyle = '#d6d0c6'; c.fillRect(5, 5, 48, 12); c.fillRect(5, 82, 48, 12); }));
  fs.position.set(0, 0.035, 0.0055); ph.add(fs); ph.rotation.y = 0.5;
  const gateX = labels.map((_, i) => x0 + 0.065 + i * 0.09);
  const state = (i) => !red ? 'ok' : i < red - 1 ? 'ok' : i === red - 1 ? 'bad' : 'later';
  labels.forEach((lines, i) => {
    const gx = gateX[i], st = state(i), gm = M(GATE_COL[st]);
    for (const sz of [-1, 1]) g.add(mesh(rbox(0.012, 0.07, 0.012, 0.004, 610 + i * 3 + sz), gm, gx, 0.035, sz * 0.035));
    g.add(mesh(rbox(0.016, 0.012, 0.086, 0.004, 620 + i), gm, gx, 0.074, 0));
    const hf = face(0.084, 0.05, dualTex(260, 156, (c, w, h) => {
      c.fillStyle = GATE_COL[st]; rr(c, 3, 3, w - 6, h - 6, 22); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const s = EN ? gateFs : Math.min(...lines.map(l => fitFont(c, l, w - 26, 60))); c.font = `${FW} ${s}px "${FONT}"`;
      if (lines.length > 1) { c.fillText(lines[0], w / 2, h * 0.3 + 2); c.fillText(lines[1], w / 2, h * 0.7 + 2); } else c.fillText(lines[0], w / 2, h / 2 + 2);
    }));
    hf.position.set(gx, 0.112, 0.0); hf.rotation.x = -0.35; g.add(hf);
  });
  // survival: most dots stop at the red gate
  const pass = labels.map((_, i) => (state(i) === 'bad' ? 0.3 : 0.74));
  const N = 30, r = S.rng(640), dots = [];
  const walkM = M(ORANGE), leftM = M(LEFT_GRAY, { keep: true });
  const pileN = labels.map(() => 0);
  for (let i = 0; i < N; i++) {
    let stop = labels.length; for (let k = 0; k < labels.length; k++) if (r() > pass[k]) { stop = k; break; }
    const d = ANIM(person(walkM, 0.6, 650 + i)); g.add(d);
    const slot = stop < labels.length ? pileN[stop]++ : 0;
    dots.push({ d, stop, slot, off: i / N, lane: (r() - 0.5) * 0.045 });
  }
  const setMat = (d, m) => d.traverse(o => { if (o.isMesh && o.material !== m) o.material = m; });
  return { g, h: 0.17, key: 0, act(k, t, alive) {
    dots.forEach(({ d, stop, slot, off, lane }) => {
      const u = alive ? pm(t * 0.14 + off, 1) : off;
      let x = x0 - 0.01 + u * (L + 0.02), z = lane, y = 0.008;
      const stopX = stop >= labels.length ? 1e9 : gateX[stop] - 0.014;
      const left = x > stopX;
      if (left) { // piled grey just before the gate, toward the front (bigger pile = more people left here)
        x = stopX - 0.008 - (slot % 5) * 0.011; z = 0.046 + (Math.floor(slot / 5) % 2) * 0.014; y = 0.008 + Math.floor(slot / 10) * 0.016;
      }
      setMat(d, left && alive ? leftM : walkM);
      d.position.set(x, y + (alive && !left ? 0.004 * Math.abs(Math.sin((t + off * 7) * 12)) : 0), z);
      d.visible = alive || stop >= 1 || off < 0.6;
    });
  } };
}

// 11 Decision lever (lesson 11's shape of the red, seen from afar): a small grid — rows = the sentence (A, B), columns = traffic sources, a little
// funnel in every cell. How big the red patch is decides the level you stop: one cell → creative, one column → channel,
// the D7 step everywhere → product, the whole grid → positioning. The matching word lights up and the lever goes to Stop.
const LEVELS = ['素材', '渠道', '產品', '定位'];
const LEVELS_EN = ['Creative', 'Channel', 'Product', 'Positioning'];
// opts.parts[11] = { levels: ['素材', '渠道', '產品', '定位'] (zh defaults: creative, channel, product, positioning),
//                    lever: null (cycle the four red shapes, lever to Stop) | '停' (Stop) | '續' (Keep) | '加碼' (Scale) (hold that) }
function p11(opt = {}) {
  const LV = opt.levels || (EN ? LEVELS_EN : LEVELS);
  const F11 = FONT, W11 = FW, EN11 = EN;      // the board is redrawn at update time: keep this map's language
  let lvFs = 42; if (EN) { const mc = document.createElement('canvas').getContext('2d'); for (const l of LV) lvFs = Math.min(lvFs, fitFont(mc, l, 184, 42)); }
  // state: 'cycle' = the four red shapes in turn (lever to Stop); 'scale' = the verdict after lesson 11: row B all green, lever on Scale, no loop
  const state = opt.state ?? (opt.lever === '加碼' ? 'scale' : opt.lever ? 'hold' : (opt.settled || (opt.lesson ?? 0) >= 12) ? 'scale' : 'cycle');
  const hold = state === 'hold' ? opt.lever : null;
  const g = new THREE.Group();
  g.add(mesh(rbox(0.09, 0.03, 0.08, 0.01, 700), M('#8a5634'), 0.115, 0.015, 0.0));
  const arcTex = dualTex(300, 150, (c, w, h) => {
    const cx = 150, cy = 140; const zones = EN ? [[RED, 'Stop'], ['#e0a400', 'Keep'], [GREEN, 'Scale']] : [[RED, '停'], ['#e0a400', '續'], [GREEN, '加碼']];
    zones.forEach(([col], i) => { c.fillStyle = col; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 136, Math.PI + i * Math.PI / 3, Math.PI + (i + 1) * Math.PI / 3); c.closePath(); c.fill(); });
    c.fillStyle = '#fbf3e6'; c.beginPath(); c.arc(cx, cy, 44, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; c.font = `${FW} ${EN ? 30 : 40}px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle';
    zones.forEach(([, txt], i) => { const a = Math.PI + (i + 0.5) * Math.PI / 3; c.fillText(txt, cx + Math.cos(a) * 92, cy + Math.sin(a) * 92); });
  });
  const arc = face(0.11, 0.055, arcTex); arc.position.set(0.115, 0.09, -0.012); g.add(arc);
  g.add(mesh(rbox(0.115, 0.06, 0.008, 0.004, 701), M('#5b3a26'), 0.115, 0.09, -0.018));
  const lever = ANIM(new THREE.Group()); lever.position.set(0.115, 0.035, 0.0); g.add(lever);
  lever.add(mesh(cyl(0.005, 0.006, 0.09, 8, 702, 0.0003), M('#d9b98a'), 0, 0.045, 0));
  lever.add(mesh(sph(0.012, 703, 0.0005), M(RED), 0, 0.09, 0));
  // the board: grid (left) + the four levels (right)
  const CW = 620, CH = 300;
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const c = cv.getContext('2d'); const tex = canvasTexture(cv);
  const gb = new THREE.Group(); gb.position.set(-0.055, 0.0, 0); gb.rotation.x = -0.25; g.add(gb);
  const BW = 0.2, BH = BW * CH / CW;
  for (const sx of [-1, 1]) gb.add(mesh(rbox(0.01, 0.05, 0.01, 0.003, 704), M('#8a5634'), sx * 0.07, 0.025, -0.006));
  gb.add(mesh(rbox(BW + 0.01, BH + 0.01, 0.008, 0.005, 705), M('#4a4250'), 0, 0.045 + BH / 2, -0.006));
  const gf = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); gf.position.set(0, 0.045 + BH / 2, 0.0); gb.add(gf);
  let last = '';
  const draw = (mode, alive) => {
    const key = alive + ':' + mode; if (key === last) return; last = key;
    c.fillStyle = alive ? '#fbf7ef' : '#d8d2c8'; c.fillRect(0, 0, CW, CH);
    c.font = `${W11} 44px "${F11}"`; c.textAlign = 'center'; c.textBaseline = 'middle';
    ['A', 'B'].forEach((rw, j) => { c.fillStyle = !alive ? '#9b948a' : j ? ORANGE : TEAL; c.fillText(rw, 30, 84 + j * 128); });
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
      const x = 62 + i * 116, y = 22 + j * 128, cellBad = alive && (mode === 0 ? (j === 1 && i === 2) : mode === 1 ? i === 1 : mode === 3);
      const muted = alive && mode === -2 && j === 0;          // 'scale': row A set aside, row B (the winner) all green
      c.fillStyle = !alive ? '#c4bdb2' : muted ? '#ebe7e0' : cellBad ? '#f6c9c9' : '#e4efd6'; rr(c, x, y, 106, 118, 12); c.fill();
      // a five-step funnel: bars shrinking downward; the bottom one is D7
      for (let s = 0; s < 5; s++) {
        const bw = 84 - s * 15, bx = x + 53 - bw / 2, by = y + 10 + s * 21;
        const bad = alive && (cellBad || (mode === 2 && s === 4));
        c.fillStyle = !alive ? '#a39b8f' : bad ? RED : muted ? '#c9c3b8' : '#7cb46b'; rr(c, bx, by, bw, 16, 5); c.fill();
      }
    }
    // the four levels
    LV.forEach((lv, i) => {
      const y = 22 + i * 66, on = alive && mode === i;
      if (EN11) {   // English words are longer: wider boxes (the grid ends at x 400), one size for all four
        c.fillStyle = !alive ? '#c4bdb2' : on ? RED : '#ece5d8'; rr(c, 412, y, 200, 56, 16); c.fill();
        c.fillStyle = !alive ? '#8f877c' : on ? '#fff' : '#8f877c'; c.font = `${W11} ${lvFs}px "${F11}"`; c.fillText(lv, 512, y + 30);
      } else {
      c.fillStyle = !alive ? '#c4bdb2' : on ? RED : '#ece5d8'; rr(c, 432, y, 170, 56, 16); c.fill();
      c.fillStyle = !alive ? '#8f877c' : on ? '#fff' : '#8f877c'; c.font = `${W11} 42px "${F11}"`; c.fillText(lv, 517, y + 30);
      }
    });
    tex.needsUpdate = true;
  };
  return { g, h: 0.15, key: 0.2, act(k, t, alive) {
    // loop 8 s: one cell → one column → the D7 step everywhere → the whole grid (2 s each); the lever snaps to Stop each time
    const ph = alive ? (((t % 8.0) + 8.0) % 8.0) : 0;
    if (state === 'scale' && alive) { draw(-2, alive); lever.rotation.z = -0.85; return; }   // settled on Scale
    if (hold && alive) {        // a fixed decision: Scale / Keep = the grid is all green; Stop = one red cell
      draw(hold === '停' ? 0 : -1, alive);
      const e = ease.outBack(clamp(pm(t, 4) / 0.35)), to = hold === '停' ? 0.85 : hold === '續' ? 0 : -0.85;
      lever.rotation.z = lerp(0, to, e); return;
    }
    const mode = alive ? Math.min(3, Math.floor(ph / 2)) : 0;
    draw(mode, alive);
    const e = alive ? ease.outBack(clamp((ph % 2) / 0.35)) : 0;
    lever.rotation.z = alive ? lerp(-0.1, 0.85, e) : 0;        // + = toward Stop (left)
  } };
}

// 12 Retargeting pools (lesson 12's system sandbox, seen from afar): the people the ads reached drop into three pools
// (Meta on-platform engagement, Pixel website visitors, SDK app installers); the pools fill over time and the oldest fade out; a pipe goes back to the pens
const POOLS = [['互動受眾', '#8f7cc8'], ['網頁訪客', '#6aa6d9'], ['App 安裝者', '#7cb46b']];
const POOLS_EN = ['Engaged\naudience', 'Website\nvisitors', 'App\ninstallers'];   // EN: two lines ('\n'), the label is taller   // names as in lesson 12
// opts.parts[12] = { pools: ['互動受眾', '網頁訪客', 'App 安裝者'] }   (zh defaults; English: POOLS_EN)
function p12(opt = {}) {
  const g = new THREE.Group();
  const rimM = M('#d9c6a8');
  const NP = 12, LIFE = 4.4, EVERY = 0.5;
  const pools = POOLS.map(([name0, col], i) => {
    const name = opt.pools?.[i] ?? (EN ? POOLS_EN[i] : name0);
    const x = -0.11 + i * 0.11;
    const rim = mesh(new THREE.TorusGeometry(0.046, 0.009, 8, 30), rimM, x, 0.01, 0.02); rim.rotation.x = Math.PI / 2; g.add(rim);
    g.add(mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.008, 28), M('#8fd0f0', { rough: 0.4, emissive: '#3a8fc0', ei: 0.1 }), x, 0.006, 0.02));
    const nl = EN ? String(name).split('\n') : null;
    const lab = !EN ? face(0.09, 0.026, dualTex(300, 86, (c, w, h) => { c.fillStyle = col; rr(c, 3, 3, w - 6, h - 6, 24); c.fill(); c.fillStyle = '#fff'; fitFont(c, name, w - 24, 52); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2 + 2); }))
      : face(0.094, 0.04, dualTex(300, 128, (c, w, h) => { c.fillStyle = col; rr(c, 3, 3, w - 6, h - 6, 24); c.fill(); c.fillStyle = '#fff'; const fs = Math.min(...nl.map(l => fitFont(c, l, w - 28, nl.length > 1 ? 50 : 56))); c.font = `${FW} ${fs}px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; nl.forEach((l, j) => c.fillText(l, w / 2, h / 2 + (j - (nl.length - 1) / 2) * fs * 1.08 + 3)); }));
    lab.position.set(x, 0.022, EN ? 0.094 : 0.088); lab.rotation.x = -0.9; g.add(lab);
    const r = S.rng(800 + i * 31), crowd = [];
    for (let j = 0; j < NP; j++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.032; const p = ANIM(person(M(col), 0.55, 810 + i * 20 + j)); p.position.set(x + Math.cos(a) * d, 0.008, 0.02 + Math.sin(a) * d); p.userData.j = j; g.add(p); crowd.push(p); }
    return { x, crowd };
  });
  return { g, h: 0.1, key: 0, act(k, t, alive) {
    pools.forEach((p, i) => p.crowd.forEach(c => {
      if (!alive) { c.visible = c.userData.j < NP * 0.5; c.scale.setScalar(1); return; }
      // slot j is refilled every NP*EVERY s; it drops in, lives LIFE s, then shrinks away (old audiences fade)
      const per = NP * EVERY, born = t + i * 0.37 - c.userData.j * EVERY;
      if (born < 0) { c.visible = false; return; }                 // the pools start empty and grow
      const age = born % per;
      const inK = ease.out(clamp(age / 0.3)), outK = 1 - clamp((age - LIFE + 0.8) / 0.8);
      c.visible = age < LIFE; c.scale.setScalar(Math.max(0.01, Math.min(inK, outK)));
      c.position.y = 0.008 + 0.05 * (1 - inK);
    }));
  } };
}

// 13 Scaling valve (lesson 13's scaling sandbox, seen from afar): the valve on the money pipe opens the tap one notch at a time (vertical);
// a new pen grows beside the old ones (horizontal; built in the main map); a little staircase: each step = what one more
// impression costs, the budget line climbs and the higher steps are pricier; a bid knob
// opts.parts[13] = { steps: 6, color: '#F2780C' }
function p13(opt = {}) {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.09, 0.03, 0.09, 0.01, 900), M('#9aa7b4'), -0.05, 0.015, 0));
  g.add(mesh(cyl(0.013, 0.013, 0.08, 12, 901), M('#9aa7b4'), -0.05, 0.07, 0));
  const dialTex = dualTex(200, 200, (c, w, h) => { c.fillStyle = '#fbf3e6'; c.beginPath(); c.arc(100, 100, 96, 0, 7); c.fill(); c.strokeStyle = '#3b2a20'; c.lineWidth = 10; for (let i = 0; i < 5; i++) { const a = Math.PI * (0.75 + i * 0.375); c.beginPath(); c.moveTo(100 + Math.cos(a) * 66, 100 + Math.sin(a) * 66); c.lineTo(100 + Math.cos(a) * 92, 100 + Math.sin(a) * 92); c.stroke(); } });
  const dial = face(0.1, 0.1, dialTex); dial.position.set(-0.05, 0.11, 0.016); g.add(dial);
  const wheel = ANIM(new THREE.Group()); wheel.position.set(-0.05, 0.11, 0.03); g.add(wheel);
  const wm = M(RED);
  wheel.add(mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 30), wm));
  for (let i = 0; i < 3; i++) { const s = mesh(rbox(0.08, 0.008, 0.008, 0.003, 902 + i), wm); s.rotation.z = i * Math.PI / 3; wheel.add(s); }
  // the price staircase (lesson 13): the B pen's people sorted by what one more install costs — 6 steps, steeper to the right;
  // the budget line climbs one step per notch of the valve: more money buys the pricier steps
  const NS = opt.steps ?? 6, stepM = M('#e9dcc6'), pM = M(opt.color || ORANGE), hiM = M('#c4561a');
  const stair = new THREE.Group(); stair.position.set(0.055, 0, 0.0); g.add(stair);
  const SW = 0.02, hs = []; let hh = 0.008;
  for (let i = 0; i < NS; i++) { hh += 0.004 + i * i * 0.0012; hs.push(hh); stair.add(mesh(rbox(SW - 0.001, hh, 0.05, 0.003, 920 + i), stepM, i * SW, hh / 2, 0));
    const cnt = Math.max(1, 4 - Math.floor(i * 0.6)); for (let j = 0; j < cnt; j++) { const p = person(i >= NS - 2 ? hiM : pM, 0.42, 930 + i * 5 + j); p.position.set(i * SW + (j % 2 - 0.5) * 0.008, hh, (j - (cnt - 1) / 2) * 0.012); stair.add(p); } }
  const fill = ANIM(mesh(rbox(NS * SW + 0.01, 0.004, 0.058, 0.002, 940), M(GREEN))); stair.add(fill);
  const knob = ANIM(new THREE.Group()); knob.position.set(-0.05, 0.0, 0.07); g.add(knob);
  knob.add(mesh(cyl(0.016, 0.018, 0.02, 16, 910), M('#3b3540'), 0, 0.01, 0));
  knob.add(mesh(rbox(0.004, 0.005, 0.014, 0.002, 911), M('#f5d76e'), 0, 0.022, 0.005));
  return { g, h: 0.17, focus: V(0.0, 0.08, 0), act(k, t, alive) {
    const step = alive ? Math.floor(pm(t * 0.5, 4)) : 0, frac = alive ? pm(t * 0.5, 1) : 0;
    const open = step + ease.outBack(clamp(frac / 0.3));
    wheel.rotation.z = -open * 0.7;
    const lvl = alive ? lerp(hs[0], hs[NS - 1] + 0.004, open / 4) : hs[0] * 0.6;
    fill.position.set((NS - 1) * SW / 2, lvl, 0.0);
    knob.rotation.y = alive ? 0.4 * Math.sin(t * 1.3) : 0;
  } };
}
// English mode (lang: 'en'): name = question-sign tag, short = name plate; maxW = widest plate (world m) before the font shrinks;
// px/pz = plate offset in EN only (longer plates); Meta Ads standard terms.
export const PARTS4_EN = [
  null,
  { name: 'Auction', short: 'Auction' },
  { name: 'Measurement return pipes', short: 'Return pipes', maxW: 0.46, px: -0.14 },
  { name: 'Landing page vs App', short: 'Web page vs App', maxW: 0.34, px: -0.05, pz: 0.47 },
  { name: 'Campaign budget tap', short: 'Budget tap', maxW: 0.46, px: -0.15 },
  { name: 'Ad set fences', short: 'Ad sets', maxW: 0.4 },
  { name: 'Ads', short: 'Ads' },
  { name: 'Policy gate', short: 'Policy gate', maxW: 0.5 },
  { name: 'Hook / Body / CTA workbench', short: 'Workbench', maxW: 0.46 },
  { name: 'Test bench', short: 'Test bench', maxW: 0.46, px: -0.04 },
  { name: 'Dashboard', short: 'Dashboard', maxW: 0.46 },
  { name: 'Decision lever', short: 'Decision lever', maxW: 0.46 },
  { name: 'Retargeting pools', short: 'Retargeting', maxW: 0.44, pz: -0.1 },
  { name: 'Scaling valve', short: 'Scaling valve', maxW: 0.46 },
];
const BUILD = { 1: p1, 2: p2, 3: p3, 4: p4, 5: p5, 6: p6, 7: p7, 8: p8, 9: p9, 10: p10, 11: p11, 12: p12, 13: p13 };

// ---------------------------------------------------------------- name plates & question sign
const PL_ALIVE = { bg: '#fffaf0', ink: '#4a3a2c', border: '#e2c6a2', badge: '#c98f5c', badgeInk: '#fff' };
const PL_CUR = { bg: '#f8d867', ink: '#3b2a20', border: '#d79a2b', badge: '#3b2a20', badgeInk: '#f8d867' };
const PL_GRAY = { bg: '#e6e1d8', ink: '#7a7266', border: '#cfc8bc', badge: '#b2aa9e', badgeInk: '#fff' };
const PLATE_FONT = 108, PLATE_CH = 160;
function plateCanvas(n, name, st, cw, fs = PLATE_FONT) {
  const h = PLATE_CH, cv = document.createElement('canvas'); cv.width = cw; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = st.bg; rr(c, 5, 5, cw - 10, h - 10, 40); c.fill(); c.lineWidth = 7; c.strokeStyle = st.border; c.stroke();
  c.fillStyle = st.badge; c.beginPath(); c.arc(76, h / 2, 54, 0, 7); c.fill();
  c.fillStyle = st.badgeInk; c.font = `${FW} ${n >= 10 ? 64 : 76}px "${FONT}"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 76, h / 2 + 4);
  c.fillStyle = st.ink; c.font = `${FW} ${fs}px "${FONT}"`; c.textAlign = 'left'; c.fillText(name, 148, h / 2 + (EN ? 2 + fs * 0.04 : 6));
  return cv;
}
/** a name plate: world height h (text ≈ 0.6 h); width follows the text */
function makePlate(n, name, h, lift = 0, maxW = Infinity) {
  const mc = document.createElement('canvas').getContext('2d'); mc.font = `${FW} ${PLATE_FONT}px "${FONT}"`;
  let fs = PLATE_FONT, cw = Math.ceil(148 + mc.measureText(name).width + 50), w = h * cw / PLATE_CH;
  // EN: a plate wider than maxW (world m) gets a smaller font, down to 84 px (≈ 78 % of the Chinese size)
  if (EN) while (w > maxW && fs > 84) { fs -= 4; mc.font = `${FW} ${fs}px "${FONT}"`; cw = Math.ceil(148 + mc.measureText(name).width + 50); w = h * cw / PLATE_CH; }
  const g = new THREE.Group();
  if (lift > 0) g.add(mesh(cyl(0.005, 0.006, lift + 0.03, 8, 940 + n, 0.0003), M('#c98f5c'), 0, (lift + 0.03) / 2, -0.01));
  const texs = { alive: canvasTexture(plateCanvas(n, name, PL_ALIVE, cw, fs)), cur: canvasTexture(plateCanvas(n, name, PL_CUR, cw, fs)), gray: canvasTexture(plateCanvas(n, name, PL_GRAY, cw, fs)) };
  const board = new THREE.Group(); g.add(board);
  board.add(mesh(rbox(w + 0.008, h + 0.008, 0.01, 0.008, 950 + n, 0.0003), M('#d9b48a')));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texs.alive, roughness: 0.85 })); f.position.z = 0.0075; board.add(f);
  g.userData.setStyle = (k) => { const t = texs[k]; if (f.material.map !== t) { f.material.map = t; f.material.needsUpdate = true; } };
  board.position.y = h / 2 + 0.02 + lift; board.rotation.x = lift ? -0.12 : -0.4;
  g.userData.board = board; g.userData.w = w;
  return g;
}
const SIGN_W = 0.46;
/** EN: a long one-line question is split at the space nearest the middle when it would print smaller than 120 px */
function wrapEN(text) {
  const s = String(text); if (s.includes('\n')) return s;
  const c = document.createElement('canvas').getContext('2d'); if (fitFont(c, s, 1400 - 120, 150) >= 120) return s;
  const sp = [...s.matchAll(/ /g)].map(m => m.index); if (!sp.length) return s;
  const mid = sp.reduce((a, b) => Math.abs(b - s.length / 2) < Math.abs(a - s.length / 2) ? b : a);
  return s.slice(0, mid) + '\n' + s.slice(mid + 1);
}
function questionSign(text, tagText) {
  const lines = String(EN ? wrapEN(text) : text).split('\n');
  const w = 1400, lh = lines.length > 1 ? (EN ? 158 : 140) : 190, h = 100 + 80 + lh * lines.length, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#f8d867'; rr(c, 8, 92, w - 16, h - 100, 70); c.fill(); c.lineWidth = 14; c.strokeStyle = '#ffffff'; c.stroke();
  if (EN) fitFont(c, tagText, w - 200, 64); else c.font = `${FW} 64px "${FONT}"`; const tw = c.measureText(tagText).width + 80;
  c.fillStyle = '#3b2a20'; rr(c, 60, 14, tw, 96, 40); c.fill();
  c.fillStyle = '#f8d867'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(tagText, 100, 64);
  c.fillStyle = '#3b2a20'; c.textAlign = 'center';
  const size = Math.min(...lines.map(l => fitFont(c, l, w - 120, lines.length > 1 ? (EN ? 138 : 120) : 150)));
  c.font = `${FW} ${size}px "${FONT}"`;
  lines.forEach((l, i) => c.fillText(l, w / 2, 92 + 40 + lh * (i + 0.5) + size * 0.04));
  const g = new THREE.Group(), H = SIGN_W * h / w;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W, H), new THREE.MeshBasicMaterial({ map: canvasTexture(cv), transparent: true, toneMapped: false, depthTest: false }));
  m.renderOrder = 10; g.add(m);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.035, 3), new THREE.MeshBasicMaterial({ color: '#f8d867', toneMapped: false, depthTest: false })); tip.rotation.z = Math.PI; tip.position.y = -H / 2 - 0.012; tip.renderOrder = 10; g.add(tip);
  g.userData.H = H;
  return g;
}

// ---------------------------------------------------------------- main
const ASPECT = 16 / 9;
/**
 * @param o.lesson    this lesson 1..13 (required)
 * @param o.t0        when the map sequence starts (s, default 0)
 * @param o.shot      'ride' (default, the opening) | 'finale' (closing pull-out) | 'overview' (whole table; with allLit the 13th-lesson lap)
 * @param o.question  the big question on this lesson's part ('\n' for two lines)
 * @param o.times     absolute overrides: { arrive, colorIn, end } (ride) / { end } (finale, overview); see COURSEMAP4.md
 * @param o.stops     ride: the learned parts to stop at, in order (default: the last 3–4 learned parts before this one, always the auction)
 * @param o.allLit    every part coloured and running (default true for shot 'overview' on lesson 13)
 * @param o.loopDur   overview lap: seconds for the ad card to go round once (default 10)
 * @param o.camFrom   {pos, look, fov} (THREE.Vector3, world): blend from your own shot into the map's camera, starting at t0
 * @param o.camBlend  seconds for that blend (default 1.2)
 * @param o.place     { x, y, z, rotY, scale } where the map table stands (default: replaces the low table)
 * @param o.table     false: no display table, the board sits at place.y
 */
export async function makeCourseMap4(o = {}) {
  const lesson = clamp(Math.round(o.lesson || 1), 1, 13);
  const t0 = o.t0 ?? 0;
  const shot = o.shot || 'ride';
  const allLit = o.allLit ?? (shot === 'overview' && lesson === 13);
  const lap = shot === 'overview' && allLit;
  const place = Object.assign({ x: 0.1, y: 0, z: -0.55, rotY: 0, scale: 1 }, o.place || {});
  const question = o.question || '';
  const lang = o.lang === 'en' ? 'en' : 'zh';
  if (lang === 'en' && ![...document.styleSheets].some(s => (s.href || '').includes('@fontsource/nunito/'))) {
    for (const wt of ['800']) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `/node_modules/@fontsource/nunito/${wt}.css`; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; }); }
  }
  if (![...document.styleSheets].some(s => (s.href || '').includes('chiron-goround-tc'))) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/node_modules/@fontsource/chiron-goround-tc/700.css'; document.head.appendChild(l);
    await new Promise(r => { l.onload = r; l.onerror = r; });
  }
  const allText = PARTS4.filter(Boolean).map(p => p.name + p.short).join('') + question + LEVELS.join('') + POOLS.map(p => p[0]).join('') + GATES10.flat().join('') + JSON.stringify(o.parts || {}) +
    '第課·0123456789NT$,：買安裝停續加碼出價AndroidiOSATTHookBodyCTAInstallActivationD7AB≠−訊息剩';
  if (lang === 'en') await document.fonts.load(`800 120px "${FONT_EN}"`, PARTS4_EN.filter(Boolean).map(p => p.name + p.short).join('') + question + LEVELS_EN.join('') + POOLS_EN.join('') + GATES10_EN.flat().join('') + 'Lesson·0123456789NT$,:BuyInstallsStopKeepScaleMessageleft≠AB');
  await document.fonts.load(`700 120px "${FONT_ZH}"`, allText);
  await document.fonts.ready;
  // from here the build is synchronous: switch the module's language for it (parts that redraw later captured it)
  EN = lang === 'en'; FONT = EN ? FONT_EN : FONT_ZH; FW = EN ? '800' : '700';

  const root = new THREE.Group(); root.position.set(place.x, place.y, place.z); root.rotation.y = place.rotY; root.scale.setScalar(place.scale);
  const withTable = o.table !== false;
  const land = new THREE.Group(); land.position.y = withTable ? G : place.y; root.add(land);
  if (!withTable) land.position.y = 0.04;

  // ---- display table (frame only; the clay board covers the middle)
  if (withTable) {
    const top = M('#c88a56'), legM = M('#a96d42');
    const frame = new THREE.Group(); root.add(frame);
    const FW = BOARD_W + 0.14, FD = BOARD_D + 0.14, FB = 0.16;
    frame.add(mesh(lumpy(new RoundedBoxGeometry(FW, 0.07, FB, 3, 0.03), 0.003, 3, 101), top, 0, TABLE_H - 0.035, FD / 2 - FB / 2));
    frame.add(mesh(lumpy(new RoundedBoxGeometry(FW, 0.07, FB, 3, 0.03), 0.003, 3, 102), top, 0, TABLE_H - 0.035, -FD / 2 + FB / 2));
    for (const sx of [-1, 1]) frame.add(mesh(lumpy(new RoundedBoxGeometry(FB, 0.07, FD - 2 * FB + 0.04, 3, 0.03), 0.003, 3, 103 + sx), top, sx * (FW / 2 - FB / 2), TABLE_H - 0.035, 0));
    bake(frame);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(mesh(cyl(0.05, 0.065, TABLE_H - 0.06, 14, 102 + sx + sz * 3, 0.004), legM, sx * (BOARD_W / 2 - 0.1), (TABLE_H - 0.06) / 2, sz * (BOARD_D / 2 - 0.1)));
    const sh = C.contactShadow(BOARD_W * 1.3, BOARD_D * 1.6, 0.4); sh.position.y = 0.004; root.add(sh);
  }
  const boardGeo = lumpy(new RoundedBoxGeometry(BOARD_W, 0.075, BOARD_D, 6, 0.03), 0.004, 4, 112); boardGeo.translate(0, -0.0375, 0);
  { const p = boardGeo.attributes.position, n = boardGeo.attributes.normal, col = new Float32Array(p.count * 3), gC = new THREE.Color('#b7d69a'), sC = new THREE.Color('#b07a50'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const k = clamp((p.getY(i) + 0.03) / 0.022) * clamp(n.getY(i) * 1.6 + 0.35); c.copy(sC).lerp(gC, k); col.set([c.r, c.g, c.b], i * 3); }
    boardGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const boardM = M('#ffffff'); boardM.vertexColors = true;
  const grass = mesh(boardGeo, boardM); grass.receiveShadow = true; land.add(grass);

  // ---- the road the ad card travels (closed loop, LOOP4 order)
  const RP = [
    [-1.05, -0.17], [-0.6, -0.23], [-0.3, -0.22], [0.02, -0.2], [0.36, -0.2], [0.5, -0.29], [0.63, -0.25], [0.77, -0.2],
    [0.94, -0.18], [1.12, -0.06], [1.16, 0.1], [1.0, 0.33], [0.5, 0.3], [0.03, 0.24], [-0.5, 0.26], [-0.98, 0.2], [-1.24, 0.02],
  ];
  const curve = new THREE.CatmullRomCurve3(RP.map(([x, z]) => V(x, 0, z)), true, 'centripetal');
  const NS = 800, samples = []; for (let i = 0; i <= NS; i++) samples.push(curve.getPointAt(i / NS));
  const uOf = (x, z) => { let bi = 0, bd = 1e9; samples.forEach((q, i) => { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi / NS; };
  const LEN = curve.getLength();
  const ptU = (u) => curve.getPointAt(((u % 1) + 1) % 1), tanU = (u) => curve.getTangentAt(((u % 1) + 1) % 1);
  const RW = 0.07, NR = 320; const rpos = [], ridx = [], ruv = [];
  for (let i = 0; i <= NR; i++) {
    const u = i / NR, p = ptU(u), tg = tanU(u), nx = -tg.z, nz = tg.x, nl = Math.hypot(nx, nz) || 1;
    rpos.push(p.x + nx / nl * RW / 2, 0.007, p.z + nz / nl * RW / 2, p.x - nx / nl * RW / 2, 0.007, p.z - nz / nl * RW / 2); ruv.push(u * LEN / 0.09, 0, u * LEN / 0.09, 1);
    if (i < NR) { const a = i * 2; ridx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const roadGeo = new THREE.BufferGeometry(); roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); roadGeo.setIndex(ridx);
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2)); roadGeo.computeVertexNormals();
  const roadCol = new Float32Array(rpos.length); roadGeo.setAttribute('color', new THREE.BufferAttribute(roadCol, 3));
  const chev = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = 'rgba(150,110,70,0.5)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(22, 18); c.lineTo(38, 32); c.lineTo(22, 46); c.stroke(); const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ map: chev, vertexColors: true, roughness: 0.9 })); road.receiveShadow = true; land.add(road);
  const ROAD_LIT = new THREE.Color('#f4dfae'), ROAD_DIM = new THREE.Color('#d3cdc0');

  // ---- the 13 parts
  const isDone = (n) => allLit || (shot === 'finale' ? n <= lesson : n < lesson);
  const parts = [null];
  const _b = new THREE.Box3(), _v = new THREE.Vector3();
  for (let n = 1; n <= 13; n++) {
    const P = PARTS4[n], b = BUILD[n]({ lesson, settled: shot !== 'ride', ...(o.parts?.[n] || {}) });   // settled: overview / finale show each part's state after it was learned
    b.g.position.set(P.x, 0, P.z); b.g.scale.setScalar(P.s || 1); if (P.ry) b.g.rotation.y = P.ry;
    const mats = [], texMats = [];
    b.g.traverse(m => { if (m.isMesh && m.material) { if (m.material.userData.tex && !texMats.includes(m.material)) texMats.push(m.material); else if (m.material.userData.base && !m.material.userData.keep && !mats.includes(m.material)) mats.push(m.material); } });
    mats.forEach(m => { m.userData.gray = grayOf(m.userData.base); });
    bake(b.g);
    land.add(b.g);
    const sh = C.contactShadow(0.36, 0.28, 0.3); sh.position.set(P.x, 0.003, P.z); land.add(sh);
    const back = P.side === 'back';
    const PE = EN ? PARTS4_EN[n] : null;
    const plate = makePlate(n, PE ? PE.short : P.short, back ? 0.12 : 0.09, back ? b.h * (P.s || 1) + 0.03 : 0, PE?.maxW ?? Infinity); land.add(plate);
    const off = { back: [0, -0.13], front: [0, 0.2], in: [0, 0.19] }[P.side];
    plate.position.set(P.x + (PE?.px ?? P.px ?? off[0]), 0, P.z + (PE?.pz ?? P.pz ?? off[1]));
    // land-local bounding box of the part (for the cameras)
    root.updateMatrixWorld(true); _b.setFromObject(b.g); const box = new THREE.Box3();
    for (const cx of [_b.min.x, _b.max.x]) for (const cy of [_b.min.y, _b.max.y]) for (const cz of [_b.min.z, _b.max.z]) box.expandByPoint(land.worldToLocal(_v.set(cx, cy, cz)));
    parts.push({ ...b, n, P, mats, texMats, plate, box, u: n === 12 ? uOf(PARTS4[1].x, PARTS4[1].z) + 0.035 : uOf(P.x, P.z) });
  }
  // shared boxes: the pens and their cards are one place
  { const u = parts[5].box.clone().union(parts[6].box); parts[5].box = u; parts[6].box = u.clone(); }

  // ---- connectors: the faucet's Y (two equal streams), valve → faucet, pool → pens, the new pen of lesson 13
  const P4 = PARTS4[4], P5 = PARTS4[5], P12 = PARTS4[12], P13 = PARTS4[13];
  const waterM = M('#6cb8e6', { rough: 0.35, emissive: '#2f7fb0', ei: 0.18 });
  const spout = V(P4.x + 0.09 * P4.s, 0.135 * P4.s, P4.z - 0.03 * P4.s);
  const J = V(spout.x, 0.085, spout.z + 0.07);
  const penA = V(P5.x - 0.13 * P5.s, 0.03, P5.z - 0.0), penB = V(P5.x + 0.13 * P5.s, 0.03, P5.z - 0.0);
  const fall = tube([spout, V(spout.x, 0.13, spout.z + 0.02), V(spout.x, 0.1, spout.z + 0.055), J], 0.01, waterM, 16);
  const sA = tube([J, V(J.x - 0.07, 0.09, J.z + 0.02), V(penA.x + 0.03, 0.075, penA.z - 0.07), penA], 0.01, waterM, 30);
  const sB = tube([J, V(J.x + 0.07, 0.09, J.z + 0.02), V(penB.x - 0.03, 0.075, penB.z - 0.07), penB], 0.01, waterM, 30);
  const jBall = mesh(sph(0.013, 170, 0.0004), waterM, J.x, J.y, J.z);
  land.add(fall.m, sA.m, sB.m, jBall);
  const dropM = M('#ffffff', { emissive: '#d8f0ff', ei: 0.5 });
  const SP = 0.055;            // the same spacing and speed in both branches = the same flow
  const nA = Math.round(sA.curve.getLength() / SP), nB = Math.round(sB.curve.getLength() / SP), nF = 3;
  const drops = []; for (let i = 0; i < nF + nA + nB; i++) { const d = mesh(sph(0.0065, 160 + i, 0.0002, 8), dropM); d.castShadow = false; land.add(d); drops.push(d); }
  const flowSpeed = 0.16;      // m/s
  parts[4].extra = (t, alive) => {
    let k = 0;
    const run = (c, n) => { const L = c.getLength(); for (let i = 0; i < n; i++, k++) { const s = ((t * flowSpeed + i * SP) % (n * SP) + n * SP) % (n * SP); const u = Math.min(1, s / L); const p = c.getPointAt(u); drops[k].position.set(p.x, p.y + 0.007, p.z); drops[k].visible = alive; } };
    run(fall.curve, nF); run(sA.curve, nA); run(sB.curve, nB);
  };
  const conM = M('#b9c3cb'), poolPipeM = M('#a493d0');
  const vf = tube([V(P13.x - 0.07, 0.012, P13.z - 0.03), V(P13.x + 0.05, 0.012, P13.z - 0.17), V(-1.0, 0.012, 0.0), V(-0.9, 0.012, -0.08), V(-0.5, 0.012, -0.17), V(-0.24, 0.012, -0.5), V(P4.x - 0.14, 0.012, P4.z + 0.02)], 0.0065, conM, 60); land.add(vf.m);
  const pp = tube([V(P12.x - 0.1, 0.012, P12.z - 0.05), V(P12.x - 0.22, 0.012, P12.z - 0.13), V(0.36, 0.012, -0.24), V(0.33, 0.012, -0.3)], 0.0065, poolPipeM, 30); land.add(pp.m);
  for (const [n, m] of [[13, conM], [12, poolPipeM], [4, waterM], [4, dropM]]) { m.userData.gray = grayOf(m.userData.base); parts[n].mats.push(m); }
  const penC = pen('#7a5bc4', 330); penC.g.position.set(-0.8, 0, 0.06); penC.g.rotation.y = 0.1; penC.g.scale.setScalar(1.05); land.add(penC.g);   // next to the valve: the new ad set it opens
  { const mm = []; penC.g.traverse(m => { if (m.isMesh && m.material.userData.base && !mm.includes(m.material)) mm.push(m.material); }); mm.forEach(m => { m.userData.gray = grayOf(m.userData.base); parts[13].mats.push(m); }); }

  { root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(penC.g); for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) parts[13].box.expandByPoint(land.worldToLocal(_v.set(cx, cy, cz))); }

  // ---- Taro (the small student) pushing an ad card
  const rider = new THREE.Group(); land.add(rider);
  const rideCard = adCard(cardTex(o.card === 'B' ? 'B' : 'A'), { w: 0.05, stand: false, frame: o.card === 'B' ? '#6b3a12' : '#2c4f4b' }); rideCard.rotation.x = -0.55; rideCard.position.set(0, 0.012, 0.07); rider.add(rideCard);
  rider.add(mesh(rbox(0.07, 0.012, 0.15, 0.005, 990), M('#d9b98a'), 0, 0.006, 0.02));
  const yuan = C.makeStudent(); yuan.root.scale.setScalar(0.12); yuan.root.position.set(0, 0.012, -0.03); rider.add(yuan.root);

  // ---- question sign + glow ring under this lesson's part
  const cur = parts[lesson];
  const qs = question && shot !== 'finale' && !allLit ? questionSign(question, EN ? `Lesson ${lesson} · ${PARTS4_EN[lesson].name}` : `第 ${lesson} 課 · ${PARTS4[lesson].name}`) : null; if (qs) land.add(qs);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.19, 48), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2; halo.renderOrder = 2; land.add(halo);
  const boxC = (b) => b.getCenter(new THREE.Vector3());
  const curC = boxC(cur.box);
  const signPos = V(curC.x, cur.box.max.y + 0.06 + (qs ? qs.userData.H / 2 : 0.09), curC.z + (cur.P.side === 'back' ? 0.05 : -0.04));

  // ---- the ride: stops (learned parts, in loop order) and the timing
  const uEndBase = cur.u - (cur.P.side === 'back' ? 0.06 : cur.P.side === 'in' ? 0.0 : 0.2) / LEN;
  // default stops: where the previous lesson's part is (if it is not too far back), the auction (the core of the course),
  // and the last learned part before this one; the card passes everything in between
  let stops = o.stops ? o.stops.slice() : (() => {
    const bd = (n) => { let d = pm(uEndBase - parts[n].u, 1); if (d < 1e-4) d += 1; return d * LEN; };
    const cands = []; for (let n = 1; n <= 13; n++) if (n !== lesson && isDone(n) && !(n === 5 && isDone(6))) cands.push(n);
    if (!cands.length) return [];
    cands.sort((x, y) => bd(x) - bd(y));
    const prev = lesson - 1 === 5 ? 6 : lesson - 1;
    let start = (cands.includes(prev) && prev !== cands[0] && bd(prev) <= 3.7) ? prev : cands[Math.min(3, cands.length - 1)];
    if (cands.includes(1) && bd(1) > bd(start) && bd(1) - bd(start) < 0.7) start = 1;
    return [...new Set([start, 1, prev, cands[0]])].filter(n => cands.includes(n) && bd(n) <= bd(start) + 1e-6).sort((x, y) => bd(y) - bd(x));
  })();
  const unwrap = (u, prev) => { while (u < prev - 1e-6) u += 1; return u; };
  // rider keyframes: [time offset, u]; holds at each stop
  const segT = (du) => { const d = du * LEN; return d < 0.8 ? clamp(d / 0.95, 0.35, 0.85) : 0.85 + (d - 0.8) / 2.6; };
  const DWELL = (n) => (n === 1 ? 0.6 : 0.15);
  let keys = [], tt = 0, uPrev;
  if (stops.length) {
    uPrev = parts[stops[0]].u - (stops[0] === 1 ? 0.5 : 0.1) / LEN; keys.push([0, uPrev]);
    for (const n of stops) { const base = unwrap(parts[n].u, uPrev - 0.6 / LEN); const u = Math.max(base + (n === 1 ? -0.34 : 0.12) / LEN, uPrev + 0.03 / LEN); tt += segT(u - uPrev); keys.push([tt, u, n]); tt += DWELL(n); keys.push([tt, u]); uPrev = u; }
  } else { uPrev = uEndBase - 0.35 / LEN; keys.push([0, uPrev]); }
  const uEnd = unwrap(uEndBase, uPrev); tt += segT(uEnd - uPrev); keys.push([tt, uEnd, -1]);
  const rideDur = tt;
  const tm = { start: t0 };
  const blendIn = o.camFrom ? (o.camBlend ?? 1.2) : 0;
  if (shot === 'ride') {
    let arrive = o.times?.arrive ?? t0 + Math.max(1.4, blendIn + 0.5, Math.min(2.0, 8.0 - rideDur - 3.4)) + rideDur;
    let scale = 1, ride0 = arrive - rideDur;
    const minHold = Math.max(0.7, blendIn + 0.3);
    if (ride0 - t0 < minHold) { scale = Math.max(0.45, (arrive - t0 - minHold) / rideDur); ride0 = arrive - rideDur * scale; }
    else if (ride0 - t0 > 2.2) { scale = Math.min(1.8, (arrive - t0 - 2.0) / rideDur); ride0 = arrive - rideDur * scale; }   // a late arrival: ride slower rather than hold the overview for long
    keys = keys.map(([a, u, n]) => [ride0 + a * scale, u, n]);
    tm.ride = [ride0, arrive];
    tm.stops = keys.filter(k => k[2] > 0).map(k => ({ n: k[2], t: k[0] }));
    tm.arrive = arrive;
    tm.colorIn = o.times?.colorIn ?? arrive + 1.3;
    tm.end = o.times?.end ?? tm.colorIn + 2.1;
  } else if (lap) {
    const LD = o.loopDur ?? 10;
    const u0 = parts[8].u - 0.06 / LEN, u1 = unwrap(parts[13].u + 0.04 / LEN, u0);
    keys = [[t0 + 0.8, u0], [t0 + 0.8 + LD, u1]];
    tm.ride = [t0 + 0.8, t0 + 0.8 + LD]; tm.arrive = tm.colorIn = t0; tm.end = o.times?.end ?? tm.ride[1] + 1.0;
  } else {
    keys = [[t0, uEnd]]; tm.ride = [t0, t0]; tm.arrive = tm.colorIn = t0; tm.end = o.times?.end ?? t0 + (shot === 'finale' ? 4.0 : 4.0);
  }
  const riderU = (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, ua] = keys[i - 1], [b, ub] = keys[i]; return lerp(ua, ub, lap ? (t - a) / (b - a) : ease.inOut(prog(t, a, b))); }
    return keys[keys.length - 1][1];
  };
  // when the card passes each part (its mechanism is timed so the key moment plays while we look at it)
  const passT = {};
  if (shot === 'ride' || lap) {
    for (let n = 1; n <= 13; n++) {
      if (n === lesson && !lap) continue;
      let u = parts[n].u; const ua = keys[0][1], ub = keys[keys.length - 1][1];
      while (u < ua) u += 1; if (u > ub) continue;
      let lo = keys[0][0], hi = keys[keys.length - 1][0];
      for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (riderU(mid) < u) lo = mid; else hi = mid; }
      passT[n] = hi;
    }
  }
  tm.pass = passT;

  // ---- cameras (computed land-local, returned in world space)
  const W = (v) => land.localToWorld(v.clone());
  const fit = (pts, { elev = 0.55, yaw = 0, fov = 30, margin = 0.84, lift = 0.07 } = {}) => {
    const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(new THREE.Vector3());
    const dir = V(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
    const right = V(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right).normalize();
    const tv = Math.tan(fov / 2 * Math.PI / 180), th = tv * ASPECT;
    let D = 0.3;
    for (const p of pts) { const d = p.clone().sub(c); const z = d.dot(dir); D = Math.max(D, Math.abs(d.dot(right)) / (th * margin) + z, Math.abs(d.dot(up)) / (tv * margin) + z); }
    const s = up.clone().multiplyScalar(lift * 2 * D * tv);
    return { pos: c.clone().add(dir.multiplyScalar(D)).sub(s), look: c.clone().sub(s), fov };
  };
  const corners = (b) => { const r = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) r.push(V(x, y, z)); return r; };
  const L2W = (c) => ({ pos: W(c.pos), look: W(c.look), fov: c.fov });
  const OV = { pos: V(0.0, 2.0, 2.36), look: V(0.0, 0.0, -0.03), fov: 33.5 };
  const shotCache = {};
  const cams = {
    overview: () => L2W(OV),
    /** a medium shot of part n as the card passes (the auction: close enough to read the three columns) */
    pass: (n) => shotCache['p' + n] || (shotCache['p' + n] = L2W(n === 1
      ? fit([[-0.17, 0.03, -0.03], [0.17, 0.03, -0.03], [-0.17, 0.17, -0.03], [0.17, 0.17, -0.03], [0.13, 0.17, 0.05], [0.13, 0.03, 0.05]].map(([x, y, z]) => land.worldToLocal(parts[1].g.localToWorld(V(x, y, z)))), { elev: 0.3, margin: 0.92, lift: 0.03 })
      : fit(corners(parts[n].box), { elev: 0.62, margin: 0.62, lift: 0.04 }))),
    /** a travelling shot that follows the card (looks a little toward the row of parts it is passing) */
    track: (u) => { const p = ptU(u); const look = V(p.x, 0.09, p.z + (p.z < 0.02 ? -0.12 : 0.1)); return L2W({ pos: look.clone().add(V(0, 0.72, 1.12)), look, fov: 32 }); },
    /** this lesson's part with the question sign and Taro */
    part: (n = lesson) => shotCache['c' + n] || (shotCache['c' + n] = L2W(fit([...corners(parts[n].box),
      ...(n === lesson && qs ? [signPos.clone().add(V(-SIGN_W / 2, qs.userData.H * 1.25, 0)), signPos.clone().add(V(SIGN_W / 2, qs.userData.H * 1.25, 0))] : []),
      ...(n === lesson ? [ptU(uEnd).add(V(0, 0.09, 0)), ptU(uEnd)] : [])], { elev: 0.5, margin: 0.9, lift: 0.06 }))),
  };
  const mixC = (a, b, e) => ({ pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), fov: lerp(a.fov, b.fov, e) });
  function cam(t) {
    root.updateMatrixWorld(true);
    let c;
    if (shot === 'finale') c = mixC(cams.part(lesson), cams.overview(), ease.inOut(prog(t, t0 + 0.4, tm.end - 0.4)));
    else if (shot === 'overview') { c = cams.overview(); if (lap) c = mixC(c, { pos: W(V(0, 1.75, 2.05)), look: W(V(0, 0.02, -0.03)), fov: 33.5 }, 0.5 - 0.5 * Math.cos(prog(t, tm.ride[0], tm.end) * Math.PI)); }
    else {
      // overview → each stop → this part; between keys the camera eases from shot to shot
      // the camera leaves the overview a little before the card starts, and settles on the first stop just after it arrives
      const ovEnd = Math.max(t0 + Math.min(0.8, (tm.ride[0] - t0) * 0.6), tm.ride[0] - 0.45);
      const ks = [[t0, cams.overview()], [ovEnd, cams.overview()]];
      let first = true;
      keys.forEach(([a, , n], i) => { if (n > 0) { const nx = keys[i + 1]; ks.push([first ? Math.min(a + 0.15, nx ? nx[0] : a + 0.15) : a, cams.pass(n)]); first = false; if (nx) ks.push([nx[0], cams.pass(n)]); } });
      ks.push([tm.arrive + 0.15, cams.part(lesson)]);
      ks.sort((x, y) => x[0] - y[0]);
      c = ks[0][1];
      for (let i = 1; i < ks.length; i++) {
        if (t <= ks[i][0]) {
          const k = prog(t, ks[i - 1][0], ks[i][0]); c = mixC(ks[i - 1][1], ks[i][1], ease.inOut(k));
          const long = ks[i - 1][0] >= tm.ride[0] && ks[i][0] - ks[i - 1][0] > 0.75;      // a long hop: follow the card past the parts in between
          if (long) c = mixC(c, cams.track(riderU(t)), 0.85 * Math.sin(Math.PI * k));
          break;
        }
        c = ks[i][1];
      }
      // a slow push during the final hold so the frame is never frozen
      // a slow push during the hold, finished 0.5 s before the end: the last 0.5 s is a still camera (the DOM page takes over from the last frame)
      const hold = ease.inOut(prog(t, tm.arrive + 0.2, Math.max(tm.arrive + 0.6, tm.end - 0.5))); if (hold > 0) { const d = c.pos.clone().sub(c.look); c = { ...c, pos: c.look.clone().add(d.multiplyScalar(1 - 0.04 * hold)) }; }
    }
    if (o.camFrom) { const e = ease.inOut(prog(t, t0, t0 + blendIn)); c = mixC({ pos: o.camFrom.pos.clone(), look: o.camFrom.look.clone(), fov: o.camFrom.fov ?? 32 }, c, e); }
    return c;
  }
  function applyCam(camera, t) { const c = cam(t); camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.look); return c; }

  // ---- per-frame pose (pure in t)
  const tmpC = new THREE.Color(), camLocal = new THREE.Vector3();
  function update(t, camera = null) {
    root.updateMatrixWorld(true);
    const isCurOn = shot === 'finale' || allLit ? 1 : ease.inOut(prog(t, tm.colorIn, tm.colorIn + 0.5));
    const uR = riderU(t), uA = keys[0][1];
    for (let i = 0; i <= NR; i++) {
      let u = i / NR; while (u < uA) u += 1;
      const lit = allLit || shot === 'finale' ? 1 : (u <= uR + 0.002 ? 1 : 0);
      tmpC.copy(ROAD_DIM).lerp(ROAD_LIT, lit); roadCol.set([tmpC.r, tmpC.g, tmpC.b, tmpC.r, tmpC.g, tmpC.b], i * 6);
    }
    roadGeo.attributes.color.needsUpdate = true;
    for (let n = 1; n <= 13; n++) {
      const p = parts[n], isCur = n === lesson && !allLit;
      const col = isDone(n) ? 1 : isCur ? isCurOn : 0;
      p.mats.forEach(m => m.color.copy(m.userData.gray).lerp(m.userData.base, col));
      p.texMats.forEach(m => { const want = col > 0.5 ? m.userData.tex.color : m.userData.tex.gray; if (m.map !== want) { m.map = want; m.needsUpdate = true; } });
      // local animation time: the current part starts at its colour-in; passed parts are keyed to the card going by
      const ta = isCur ? (shot === 'finale' ? t - t0 + 3 : t - tm.colorIn) : passT[n] != null ? t - passT[n] + (p.key || 0) : t + n * 0.77 + 20;
      p.act(isCur ? isCurOn : 1, ta, col > 0.5); if (p.extra) p.extra(ta, col > 0.5);
      p.plate.userData.setStyle(isCur ? 'cur' : isDone(n) ? 'alive' : 'gray');
    }
    // lesson 13's horizontal scaling: a new pen grows beside the old ones (once on the colour-in; on a lap, as the card reaches the valve)
    const penK = lesson === 13 && !allLit && shot === 'ride' ? prog(t, tm.colorIn + 0.9, tm.colorIn + 1.5) : lap ? prog(t, (passT[13] ?? t0) + 0.3, (passT[13] ?? t0) + 0.9) : 1;
    penC.g.visible = (isDone(13) || lesson === 13) && penK > 0.001; penC.g.scale.set(1.05, 1.05 * Math.max(0.001, ease.outBack(penK)), 1.05);
    // rider
    rider.visible = shot === 'ride' || lap || shot === 'finale';
    const pr = ptU(uR), tg = tanU(uR);
    const moving = shot === 'ride' || lap ? (t > keys[0][0] && t < keys[keys.length - 1][0]) : false;
    rider.position.set(pr.x, 0.008 + (moving ? 0.01 * Math.abs(Math.sin(t * 10)) : 0), pr.z);
    rider.rotation.y = Math.atan2(tg.x, tg.z);
    const joy = prog(t, tm.colorIn, tm.colorIn + 0.3) * (shot === 'ride' ? 1 : 0);
    yuan.pose({ blink: (t % 3.3) < 0.13 ? Math.sin((t % 3.3) / 0.13 * Math.PI) : 0, smile: 1, lookY: 0.1, armL: lerp(0.9, 2.3, joy), armR: lerp(0.9, 2.3, joy) + 0.2 * joy * Math.sin(t * 9), grin: joy > 0.5 ? 1 : 0, mouth: joy > 0.5 ? 0.6 : 0, squash: moving ? 0.05 * Math.sin(t * 20) : 0 });
    // question sign (on the grey part from the arrival, stays through the colour-in)
    if (qs) {
      const qk = ease.outBack(prog(t, tm.arrive - 0.05, tm.arrive + 0.4));
      // keep the question about the same size on screen (≥ 60px text) however wide the part's close shot is
      if (qs.userData.k == null) { const c = cams.part(lesson); const D = c.pos.distanceTo(W(signPos)); qs.userData.k = clamp(0.5 * 2 * D * Math.tan(c.fov / 2 * Math.PI / 180) * ASPECT / SIGN_W, 0.85, 1.5); }
      const sk = qs.userData.k;
      qs.visible = qk > 0.01; qs.position.copy(signPos); qs.position.y += (sk - 1) * qs.userData.H / 2 + 0.006 * Math.sin(t * 2.2); qs.scale.setScalar(Math.max(0.001, qk * sk));
      cur.plate.visible = !qs.visible;
    }
    halo.visible = !allLit; halo.position.set(cur.P.x, 0.01, cur.P.z); halo.material.opacity = 0.35 + 0.25 * Math.sin(t * 4);
    if (camera) {
      land.worldToLocal(camLocal.copy(camera.position));
      const faceCam = (obj) => { obj.rotation.y = Math.atan2(camLocal.x - obj.position.x, camLocal.z - obj.position.z); };
      parts.forEach(p => { if (!p) return; faceCam(p.plate); const d = camLocal.distanceTo(p.plate.position); p.plate.userData.board.scale.setScalar(lerp(0.62, 1, prog(d, 0.9, 1.9))); });
      if (qs) faceCam(qs);
    }
  }
  root.traverse(m => { if (m.isMesh && m !== grass && m !== road) m.receiveShadow = false; });
  update(t0);

  return {
    root, land, yuan, times: tm, stops, cams, cam, applyCam, update, parts, duration: tm.end - t0,
    /** world position of a part (its footprint centre, on the board) */
    partWorld: (n) => { root.updateMatrixWorld(true); const c = boxC(parts[n].box); return land.localToWorld(V(c.x, 0, c.z)); },
  };
}
