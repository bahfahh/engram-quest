// film.js — timeline, camera, light states, surfaces, captions. renderAt(t) is a pure function of t.
import * as THREE from 'three';
import { clamp, lerp, prog, sm, ease, fio, wobble, QS, NOTEXT, loadFonts, ndcToPx } from './lib.js';
import { R, FH, NF, NC, slotPos, buildWorld, furnishStation, framedPicture, canvasTex, skyTex, M, makeDust, makeShaft, glowSprite, build } from './world.js';
import { Surface } from './surfaces.js';
import { makePost } from './post.js';
import { TL, B, T, TEXT, UI, DURATION, warp } from './content.js';
import * as D from './demos.js';

window.DURATION = DURATION;
if (NOTEXT) document.body.classList.add('notext');

/* =================================================================== renderer */
const canvas = document.getElementById('gl');
const OPT = { aa: QS.get('aa') === '1', smap: Number(QS.get('smap') || 2048), shadows: QS.get('sh') !== '0' };
const renderer = new THREE.WebGLRenderer({ canvas, antialias: OPT.aa, preserveDrawingBuffer: true });
const GLW = Number(QS.get('w') || 1600), GLH = Math.round(GLW * 9 / 16);
renderer.setPixelRatio(1); renderer.setSize(GLW, GLH, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = OPT.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const post = makePost(renderer, GLW, GLH);
renderer.shadowMap.autoUpdate = false;
let shadowKey = '';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
scene.fog = new THREE.FogExp2(0x070a12, 0.010);
const camera = new THREE.PerspectiveCamera(50, 1920 / 1080, 0.03, 300);

/* =================================================================== lights */
const hemi = new THREE.HemisphereLight(0x8899bb, 0x221a14, 0.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(sun); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(OPT.smap, OPT.smap); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
const P = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 9, 2); scene.add(l); return l; });

/* =================================================================== world */
const W = buildWorld(scene);
const rooms = W.rooms;
const RK = { r1: 0, r2: 1, r3: 3 };
const ST = { r1: { room: rooms[0] }, r2: { room: rooms[1] }, r3: { room: rooms[3] } };
const L = (key, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(ST[key].room.g.matrixWorld);

// images (note figures)
const IMGS = {};
const imgList = { perf: 'img/perf-tools.png', on2: 'img/on2-curve.png', axes: 'img/two-axes.png', biz: 'img/biz-models.png', scale: 'img/scale-arch.png', layers: 'img/ddd-layers.png' };
const loadImg = (src) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

// surfaces
const overlayLayer = document.getElementById('screens');
const SURF = [];
const mk = (o) => { const s = new Surface(o); SURF.push(s); return s; };
const static_ = (w, h, draw) => canvasTex(w, h, draw);
const MON = { r1: D.drawMon1, r2: D.drawMon2, r3: D.drawMon3 };
const BOARD = { r1: D.drawBoard1, r2: D.drawBoard2, r3: D.drawBoard3 };
const PLATE = { r1: '1F', r2: '1F', r3: '2F' };
for (const key of ['r1', 'r2', 'r3']) {
  const s = ST[key];
  s.mon = mk({ w: 1600, h: 922, draw: MON[key], overlay: true, layer: overlayLayer, name: key + '.mon' });
  s.board = mk({ w: 2560, h: 1448, draw: BOARD[key], name: key + '.board' });
  s.note = mk({ w: 1024, h: 675, draw: D.drawNotebook(key + '.ctx'), name: key + '.note' });
  s.lap = static_(512, 320, D.drawLaptopIdle(key.length * 7 + RK[key]));
  s.cal = static_(360, 480, D.drawCalendar);
  s.plate = static_(310, 150, D.drawPlate(PLATE[key]));
  Object.assign(s, furnishStation(s.room, { monitorTex: s.mon.tex, laptopTex: s.lap.tex, notebookTex: s.note.tex, boardTex: s.board.tex, calTex: s.cal.tex, plateTex: s.plate.tex, wbZ: key === 'r1' ? -0.85 : -0.7 }));
  s.mon.mesh = s.monitor.userData.screen;
  s.monitor.rotation.y = 0.3; s.monitor.position.set(0.42, 0, -0.1);
  // glow sprites (lamp bulb bloom, screen halo)
  s.bulbGlow = glowSprite(0xffd39a, 0.55); s.lamp.userData.bulb.add(s.bulbGlow);
  s.scrGlow = glowSprite(0x8fb6ff, 1.6); s.scrGlow.position.set(0, 0, -0.05); s.mon.mesh.add(s.scrGlow);
}
// room 1 extras: the note's two-layer DDD picture on the left wall; the scaling diagram next to the side door + a paper slip
{
  const r = ST.r1.room.g;
  const lay = static_(1920, 991, () => {}); ST.r1.layerTex = lay;
  ST.r1.layers = framedPicture(r, lay.tex, 1.25, 0.645); ST.r1.layers.position.set(-R.W / 2 + 0.07, 1.95, -1.25); ST.r1.layers.rotation.y = Math.PI / 2;
  const sc = static_(1920, 960, () => {}); ST.r1.scaleTex = sc;
  ST.r1.scale = framedPicture(r, sc.tex, 0.66, 0.33); ST.r1.scale.position.set(R.W / 2 - 0.08, 1.85, 1.8); ST.r1.scale.rotation.y = -Math.PI / 2;
  ST.r1.slip = mk({ w: 700, h: 300, draw: D.drawSlip('r1.door', { bg: '#f4efe2', px: 46 }), name: 'r1.slip' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.266), new THREE.MeshStandardMaterial({ map: ST.r1.slip.tex, roughness: 0.9 }));
  m.position.set(R.W / 2 - 0.068, 1.42, 1.8); m.rotation.y = -Math.PI / 2; m.rotation.x = 0; r.add(m); ST.r1.slipMesh = m; ST.r1.slip.mesh = m;
}
// room 3 extras: two sticky notes left of the window (the note's own correction)
{
  const r = ST.r3.room.g;
  ST.r3.fixOld = mk({ w: 600, h: 600, draw: D.drawSlip('r3.fix.old', { px: 54, strike: T['r3.fix.new'].t0 - 1.6 }), name: 'r3.fixOld' });
  ST.r3.fixNew = mk({ w: 600, h: 600, draw: D.drawSlip('r3.fix.new', { bg: '#f2b8a0', px: 46 }), name: 'r3.fixNew' });
  const mo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: ST.r3.fixOld.tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: ST.r3.fixOld.tex, emissiveIntensity: 0.32 })); mo.position.set(-1.62, 1.78, -R.D / 2 + 0.004); mo.rotation.z = 0.03; r.add(mo);
  const mn = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: ST.r3.fixNew.tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: ST.r3.fixNew.tex, emissiveIntensity: 0.32 })); mn.position.set(-1.2, 1.7, -R.D / 2 + 0.006); mn.rotation.z = -0.04; r.add(mn);
  ST.r3.fixOldMesh = mo; ST.r3.fixNewMesh = mn; ST.r3.fixOld.mesh = mo; ST.r3.fixNew.mesh = mn;
}
const dust = makeDust(1500); scene.add(dust.pts);
const shaft = makeShaft(); scene.add(shaft.mesh);
scene.updateMatrixWorld(true);

/* =================================================================== camera keyframes */
// helper: a camera pose that faces a plane mesh at distance d, aiming at local (u,v) of the plane (0..1)
function faceOf(key, mesh, d, u = 0.5, v = 0.5, up = 0.0, side = 0) {
  scene.updateMatrixWorld(true);
  const g = mesh.geometry.parameters; const tgt = new THREE.Vector3((u - 0.5) * g.width, (0.5 - v) * g.height, 0); mesh.localToWorld(tgt);
  const n = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n).normalize().multiplyScalar(-1);
  const pos = tgt.clone().addScaledVector(n, d).add(new THREE.Vector3(0, up, 0)).addScaledVector(right, side);
  const inv = new THREE.Matrix4().copy(ST[key].room.g.matrixWorld).invert();
  return { p: pos.applyMatrix4(inv).toArray(), l: tgt.applyMatrix4(inv).toArray() };
}
// seated view of the notebook's left page (text up = towards the window)
function deskView(key) { scene.updateMatrixWorld(true); const m = ST[key].notebookPage; const c = new THREE.Vector3(-0.105, 0.035, 0).applyMatrix4(m.matrixWorld);
  const inv = new THREE.Matrix4().copy(ST[key].room.g.matrixWorld).invert(); const cl = c.clone().applyMatrix4(inv);
  return { p: [cl.x + 0.01, cl.y + 0.25, cl.z + 0.16], l: [cl.x, cl.y, cl.z - 0.01] }; }
const KF = [];
const k = (t, room, pose, fov = 50, e = 'io') => KF.push({ t, room, p: pose.p, l: pose.l, fov, e });
const P_ = (p, l) => ({ p, l });
const orbit = (deg, rad, h, look = [0, 6.0, 0]) => { const a = deg * Math.PI / 180; return [Math.sin(a) * rad + look[0], h, Math.cos(a) * rad + look[2]]; };

const S1 = ST.r1, S2 = ST.r2, S3 = ST.r3;
const boardFace = (s) => s.boardFace;
// --- opening + overview (world space)
// the house sits right of centre so the floor labels can live in the left third
const OV = (u) => { const lx = lerp(-5.0, -4.6, u), ly = lerp(6.2, 5.5, u); return P_(orbit(lerp(-26, 14, u), lerp(34, 31, u), lerp(9.0, 7.2, u), [lx, ly, 0]), [lx, ly, 0]); };
k(0, null, OV(0), 38, 'lin');
for (let i = 0; i <= 15; i++) k(8 + i * 2, null, OV(sm(i / 15)), 38, 'lin');
// --- dive into room 1 (1F left)
k(39.6, 'r1', P_([3.6, 2.4, 9.5], [1.4, 1.4, 1.0]), 44, 'io');
k(41.4, 'r1', P_([1.45, 1.7, 3.6], [1.2, 1.55, 0.0]), 50, 'lin');
k(42.6, 'r1', P_([1.05, 1.6, 1.2], [0.0, 1.45, -2.2]), 52, 'out');
k(44.2, 'r1', P_([0.75, 1.56, 0.45], [-0.05, 1.3, -2.2]), 52, 'io');
// --- room 1 beats
const nb1 = deskView('r1');
k(45.6, 'r1', nb1); k(52.0, 'r1', { p: [nb1.p[0], nb1.p[1] + 0.01, nb1.p[2] + 0.02], l: nb1.l });
const wbAll1 = faceOf('r1', S1.boardFace, 1.62, 0.5, 0.5);
const wbTop1 = faceOf('r1', S1.boardFace, 1.1, 0.4, 0.28);
const wbFlow = (u, v, d = 1.0) => faceOf('r1', S1.boardFace, d, u, v);
const mon1 = faceOf('r1', S1.mon.mesh, 0.64, 0.5, 0.5, 0.03);
k(53.6, 'r1', wbTop1); k(60.6, 'r1', wbTop1);
k(62.0, 'r1', wbFlow(0.6, 0.35, 1.12)); k(65.6, 'r1', wbFlow(0.6, 0.36, 1.12));
k(67.0, 'r1', mon1); k(76.0, 'r1', mon1);
k(77.2, 'r1', wbFlow(0.42, 0.38, 1.2)); k(81.6, 'r1', wbFlow(0.42, 0.42, 1.2));
k(83.0, 'r1', wbFlow(0.55, 0.47, 1.2)); k(88.2, 'r1', wbFlow(0.55, 0.5, 1.2));
k(89.4, 'r1', mon1); k(97.0, 'r1', mon1);
k(98.2, 'r1', wbFlow(0.4, 0.52, 1.25)); k(103.0, 'r1', wbFlow(0.45, 0.6, 1.25));
k(104.4, 'r1', wbFlow(0.58, 0.66, 1.2)); k(108.6, 'r1', wbFlow(0.58, 0.68, 1.2));
k(109.8, 'r1', mon1); k(127.0, 'r1', mon1);
k(128.2, 'r1', wbFlow(0.5, 0.74, 1.3)); k(132.6, 'r1', wbFlow(0.5, 0.74, 1.3));
k(134.2, 'r1', wbAll1); k(142.4, 'r1', { p: [wbAll1.p[0] + 0.05, wbAll1.p[1], wbAll1.p[2]], l: wbAll1.l });
k(144.0, 'r1', faceOf('r1', S1.boardFace, 1.5, 0.5, 0.5)); k(170.4, 'r1', faceOf('r1', S1.boardFace, 1.47, 0.5, 0.5));
k(172.4, 'r1', wbAll1); k(177.6, 'r1', faceOf('r1', S1.boardFace, 1.7, 0.52, 0.5));
// to the side door: the scaling diagram + slip, then walk through into room 2
k(179.6, 'r1', P_([1.3, 1.62, 1.7], [2.44, 1.6, 1.8]), 50); k(183.6, 'r1', P_([1.32, 1.6, 1.68], [2.44, 1.58, 1.8]), 50);
k(185.0, 'r1', P_([1.6, 1.6, 0.95], [3.4, 1.55, 0.85]), 54, 'in');
k(186.6, 'r2', P_([-1.7, 1.6, 0.9], [0.0, 1.45, -1.0]), 54, 'lin');
k(188.0, 'r2', P_([-0.6, 1.58, 0.45], [0.0, 1.3, -2.2]), 52, 'out');
// --- room 2
const nb2 = deskView('r2');
const wbTop2 = faceOf('r2', S2.boardFace, 1.1, 0.4, 0.28); const wbAll2 = faceOf('r2', S2.boardFace, 1.62, 0.5, 0.5);
const mon2 = faceOf('r2', S2.mon.mesh, 0.64, 0.5, 0.5, 0.03);
k(189.6, 'r2', nb2); k(196.0, 'r2', nb2);
k(197.6, 'r2', wbTop2); k(202.2, 'r2', wbTop2);
k(203.6, 'r2', mon2); k(238.6, 'r2', mon2);
k(239.8, 'r2', wbAll2); k(241.6, 'r2', wbAll2);
k(243.0, 'r2', mon2); k(262.6, 'r2', mon2);
k(263.8, 'r2', wbAll2); k(265.6, 'r2', wbAll2);
k(267.0, 'r2', mon2); k(276.6, 'r2', mon2);
k(277.8, 'r2', wbAll2); k(280.6, 'r2', faceOf('r2', S2.boardFace, 1.52, 0.42, 0.42)); k(308.4, 'r2', faceOf('r2', S2.boardFace, 1.49, 0.42, 0.42));
k(310.0, 'r2', faceOf('r2', S2.boardFace, 1.55, 0.53, 0.5)); k(316.0, 'r2', faceOf('r2', S2.boardFace, 1.52, 0.53, 0.5));
k(318.0, 'r2', P_([0.2, 1.55, 0.6], [0.9, 1.2, -1.9]), 50); k(320.6, 'r2', P_([0.1, 1.55, 0.7], [0.9, 1.2, -1.9]), 50);
// out to the house, rise to 2F left (room 3)
k(322.4, 'r2', P_([1.3, 1.7, 3.0], [0.4, 1.4, -1.6]), 52);
k(324.4, null, P_([-3.0, 4.5, 15.0], [-3.5, 4.6, 0]), 44, 'lin');
k(326.4, 'r3', P_([1.6, 1.8, 4.4], [1.3, 1.6, 0]), 48, 'lin');
k(328.0, 'r3', P_([1.25, 1.62, 1.4], [0.3, 1.4, -2.2]), 52, 'out');
k(330.0, 'r3', P_([0.5, 1.56, 0.35], [-0.05, 1.3, -2.2]), 52);
// --- room 3
const nb3 = deskView('r3');
const wbTop3 = faceOf('r3', S3.boardFace, 1.1, 0.4, 0.28); const wbAll3 = faceOf('r3', S3.boardFace, 1.62, 0.5, 0.5);
const mon3 = faceOf('r3', S3.mon.mesh, 0.64, 0.5, 0.5, 0.03);
k(331.6, 'r3', nb3); k(338.0, 'r3', nb3);
k(339.6, 'r3', wbTop3); k(343.6, 'r3', wbTop3);
k(345.0, 'r3', mon3); k(399.0, 'r3', mon3);
k(400.6, 'r3', faceOf('r3', S3.boardFace, 1.52, 0.5, 0.48)); k(417.4, 'r3', faceOf('r3', S3.boardFace, 1.5, 0.5, 0.5));
k(418.6, 'r3', faceOf('r3', S3.boardFace, 1.5, 0.5, 0.26)); k(443.4, 'r3', faceOf('r3', S3.boardFace, 1.48, 0.5, 0.26));
k(445.0, 'r3', mon3); k(455.4, 'r3', mon3);
k(457.2, 'r3', P_([-1.38, 1.73, -1.5], [-1.41, 1.74, -2.2]), 48); k(470.0, 'r3', P_([-1.38, 1.73, -1.56], [-1.41, 1.74, -2.2]), 48);
k(472.2, 'r3', P_([-0.6, 1.62, 1.35], [1.5, 1.35, -1.2]), 54); k(478.4, 'r3', P_([-0.75, 1.65, 1.5], [1.5, 1.35, -1.2]), 54);
// --- quiz: out, the shuffle, then into rooms (they moved)
k(480.4, 'r3', P_([1.35, 1.75, 4.2], [0.6, 1.5, -0.5]), 52, 'in');
k(482.0, null, P_([0.8, 7.0, 34.0], [0, 6.2, 2.5]), 42, 'lin');
k(486.0, null, P_([-0.4, 6.8, 31.0], [0, 6.0, 2.0]), 42, 'io');
k(488.6, 'r1', faceOf('r1', S1.boardFace, 1.5, 0.48, 0.5)); k(506.2, 'r1', faceOf('r1', S1.boardFace, 1.47, 0.48, 0.5));
k(508.6, 'r3', mon3); k(526.2, 'r3', mon3);
// --- ending
k(528.4, 'r3', P_([1.35, 1.75, 4.5], [0.5, 1.6, 0.0]), 50, 'in');
k(530.4, null, P_(orbit(-8, 31, 7.0, [-1.6, 5.0, 0]), [-1.6, 5.0, 0]), 38, 'lin');
k(541.0, null, P_(orbit(6, 33, 7.4, [-1.6, 5.2, 0]), [-1.6, 5.2, 0]), 38, 'lin');
KF.sort((a, b) => a.t - b.t);

const kp = (f, which) => { const v = f[which]; return f.room ? new THREE.Vector3(...v).applyMatrix4(ST[f.room].room.g.matrixWorld) : new THREE.Vector3(...v); };
function tangent(prev, a, b, next, which, side) {
  const Pp = (f) => kp(f, which); const pa = Pp(a), pb = Pp(b), seg = pb.distanceTo(pa);
  const m = side === 0 ? Pp(b).sub(Pp(prev)).multiplyScalar((b.t - a.t) / Math.max(1e-6, b.t - prev.t)) : Pp(next).sub(Pp(a)).multiplyScalar((b.t - a.t) / Math.max(1e-6, next.t - a.t));
  if (m.length() > seg) m.setLength(seg); return m;
}
function hermite(p0, m0, p1, m1, u) { const u2 = u * u, u3 = u2 * u; return new THREE.Vector3().addScaledVector(p0, 2 * u3 - 3 * u2 + 1).addScaledVector(m0, u3 - 2 * u2 + u).addScaledVector(p1, -2 * u3 + 3 * u2).addScaledVector(m1, u3 - u2); }
const EZ = { io: ease.inOut, lin: x => x, in: x => x * x, out: x => 1 - (1 - x) * (1 - x) };
function camAt(t) {
  let i = 0; while (i < KF.length - 2 && KF[i + 1].t <= t) i++;
  const a = KF[i], b = KF[i + 1]; const u = EZ[b.e](clamp((t - a.t) / Math.max(1e-6, b.t - a.t)));
  const g = (j) => KF[clamp(j, 0, KF.length - 1)]; const prev = g(i - 1), next = g(i + 2);
  const path = (w) => { const pa = kp(a, w), pb = kp(b, w); if (pa.distanceTo(pb) < 1e-4) return pa;
    const ma = (prev === a || kp(prev, w).distanceTo(pa) < 1e-4) ? new THREE.Vector3() : tangent(prev, a, b, next, w, 0);
    const mb = (next === b || kp(next, w).distanceTo(pb) < 1e-4) ? new THREE.Vector3() : tangent(prev, a, b, next, w, 1);
    return hermite(pa, ma, pb, mb, u); };
  return { pos: path('p'), look: path('l'), fov: lerp(a.fov, b.fov, u) };
}

/* =================================================================== which room are we in */
const INSIDE = [['r1', 41.6, 185.4], ['r2', 185.4, 322.0], ['r3', 327.2, 480.0], ['r1', 488.0, 507.0], ['r3', 507.6, 528.0]];
function activeAt(t) { for (const [key, a, b] of INSIDE) if (t >= a && t < b) return { key, inside: Math.min(prog(t, a, a + 0.9), 1 - prog(t, b - 0.9, b)) }; return { key: null, inside: 0 }; }
const RECALLS = { r1: B.r1.recall, r2: B.r2.recall, r3: B.r3.recall, q1: B.quiz.q1, q2: B.quiz.q2 };
const darkAt = t => { let d = 0; for (const k2 of ['r1', 'r2', 'r3']) { const r = RECALLS[k2]; d = Math.max(d, Math.min(prog(t, r.q - 0.6, r.q + 0.4), 1 - prog(t, r.end - 1.0, r.end + 0.3))); } return d; };
const quickAt = t => Math.min(prog(t, 486.6, 487.6), 1 - prog(t, 527.0, 528.2));

/* =================================================================== light presets */
const C3 = (h) => new THREE.Color(h); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const LIT_ROOMS = [0, 1, 3];
// overview: a light line runs from each highlighted topic to its room; the room lights when the line arrives
const PILL = { 'over.n1': { floor: 0, room: 0, dur: 1.2 }, 'over.n2': { floor: 0, room: 1, dur: 1.6 }, 'over.n3': { floor: 1, room: 3, dur: 1.2 } };
const lineT = (id) => [T[id].t0 + 0.3, T[id].t0 + 0.3 + PILL[id].dur];
const ARRIVE = Object.fromEntries(Object.entries(PILL).map(([id, p]) => [p.room, lineT(id)[1]]));
function floorGlow(id, t) {
  const f = Math.floor(id / NC); const ft = [11.0, 14.0, 17.0, 20.0][f];
  let g = 0.14 * sm(prog(t, ft, ft + 1.2));
  if (LIT_ROOMS.includes(id)) g = Math.max(g, sm(prog(t, ARRIVE[id], ARRIVE[id] + 0.7)));
  if (t > 38.5 && t < 527) g = LIT_ROOMS.includes(id) ? 1 : 0.14;
  if (t >= 527) g = LIT_ROOMS.includes(id) ? 1 : lerp(0.14, 0.03, sm(prog(t, 530.6, 532)));
  return g;
}
function preset(name, t) {
  const base = { hemiSky: C3(0x8090b0), hemiGround: C3(0x1a140f), hemiI: 0.3, sunColor: C3(0xffffff), sunI: 0, sunDir: V3(-0.4, 0.75, 0.55), sunCenter: V3(0, 4.5, 0), shadowHalf: 16,
    P0: [V3(0, 0, 0), C3(0xffd7a0), 0], P1: [V3(0, 0, 0), C3(0x9cc0ff), 0], P2: [V3(0, 0, 0), C3(0xffcfa0), 0], fog: C3(0x070a12), fogD: 0.010, exposure: 1.0, shaftI: 0, shaftColor: C3(0xffd59a), dustI: 0, sunKey: null };
  const lamp = (key) => ST[key].lamp.userData.bulb.getWorldPosition(new THREE.Vector3());
  const scr = (key) => ST[key].mon.mesh.localToWorld(new THREE.Vector3(0, 0, 0.35));
  const ctr = (key) => L(key, 0, 1.5, 0);
  const s = { ...base };
  switch (name) {
    case 'black': Object.assign(s, { hemiI: 0, exposure: 0.6 }); break;
    case 'over': Object.assign(s, { hemiSky: C3(0x5a6c94), hemiGround: C3(0x1b130c), hemiI: 0.14, sunColor: C3(0xaec4ff), sunI: 0.75, sunDir: V3(-0.45, 0.8, 0.45), sunCenter: V3(0, 6.5, 0),
      P0: [L('r1', 0.6, 2.2, 0.6), C3(0xffcf96), 7 * floorGlow(0, t)], P1: [L('r2', 0.0, 2.2, 0.6), C3(0xffd2a0), 7 * floorGlow(1, t)], P2: [L('r3', 0.4, 2.2, 0.6), C3(0xffd0a0), 7 * floorGlow(3, t)], exposure: 1.1 }); break;
    case 'r1': Object.assign(s, { hemiSky: C3(0xf0dcc0), hemiGround: C3(0x7a5034), hemiI: 0.6, sunColor: C3(0xffc47e), sunI: 6.2, sunDir: V3(-0.42, 0.5, -0.76), sunCenter: ctr('r1'), shadowHalf: 4.6, sunKey: 'r1',
      P1: [scr('r1'), C3(0xbcd2ff), 0.35], P2: [L('r1', 1.0, 1.0, 0.6), C3(0xffc48a), 1.6], fogD: 0, exposure: 1.16, shaftI: 1.0, shaftColor: C3(0xffdfae), dustI: 1.6 }); break;
    case 'r2dusk': Object.assign(s, { hemiSky: C3(0x6a5a8a), hemiGround: C3(0x231a1c), hemiI: 0.28, sunColor: C3(0xff9a5a), sunI: 1.1, sunDir: V3(0.3, 0.17, -0.94), sunCenter: ctr('r2'), shadowHalf: 4.6, sunKey: 'r2',
      P0: [lamp('r2'), C3(0xffc888), 1.1], P1: [scr('r2'), C3(0xa8c4ff), 0.5], P2: [L('r2', -0.6, 2.2, -0.4), C3(0xffb878), 0.8], fogD: 0, exposure: 1.05, dustI: 1.0, shaftI: 0.6, shaftColor: C3(0xffa868) }); break;
    case 'r2night': Object.assign(s, { hemiSky: C3(0x26305a), hemiGround: C3(0x120c0a), hemiI: 0.12, sunColor: C3(0x9db4ff), sunI: 0.35, sunDir: V3(0.25, 0.55, -0.8), sunCenter: ctr('r2'), shadowHalf: 4.6, sunKey: 'r2',
      P0: [lamp('r2'), C3(0xffc07a), 1.25], P1: [scr('r2'), C3(0x9cbcff), 0.75], P2: [L('r2', -0.4, 2.3, -0.5), C3(0xffa868), 0.5], fogD: 0, exposure: 1.1, dustI: 0.6, shaftI: 0.18, shaftColor: C3(0x8fa8e8) }); break;
    case 'r3': Object.assign(s, { hemiSky: C3(0x1d2747), hemiGround: C3(0x0a0806), hemiI: 0.1, sunColor: C3(0x9fb6ff), sunI: 0.75, sunDir: V3(-0.3, 0.55, -0.78), sunCenter: ctr('r3'), shadowHalf: 4.6, sunKey: 'r3',
      P0: [lamp('r3'), C3(0xffc07a), 1.2], P1: [scr('r3'), C3(0x8fb4ff), 0.95], P2: [L('r3', 1.4, 2.0, -0.6), C3(0x7088c4), 0.55], fogD: 0, exposure: 1.15, dustI: 0.8, shaftI: 0.32, shaftColor: C3(0x9fb6ff) }); break;
    case 'dark': Object.assign(s, { hemiSky: C3(0x223355), hemiGround: C3(0x050505), hemiI: 0.05, sunI: 0, fogD: 0, exposure: 1.0, dustI: 0.25, shaftI: 0 }); break;
    case 'shuffle': Object.assign(s, { hemiSky: C3(0x8a94a8), hemiGround: C3(0x262626), hemiI: 0.8, sunColor: C3(0xd0d8e4), sunI: 1.2, sunDir: V3(-0.3, 0.7, 0.65), sunCenter: V3(0, 6.5, 3), exposure: 1.05 }); break;
    case 'quick': Object.assign(s, { hemiSky: C3(0xc8c2b6), hemiGround: C3(0x3a322a), hemiI: 0.62, sunI: 0, fogD: 0, exposure: 1.12, dustI: 0.4, shaftColor: C3(0xfff2dc) }); break;
    case 'end': Object.assign(s, { hemiSky: C3(0x6a7ea8), hemiGround: C3(0x1b130c), hemiI: 0.08, sunColor: C3(0xaec4ff), sunI: 0.14, sunDir: V3(-0.45, 0.8, 0.45), sunCenter: V3(0, 6.5, 0),
      P0: [L('r1', 0.6, 2.2, 0.6), C3(0xffcf96), 7], P1: [L('r2', 0.0, 2.2, 0.6), C3(0xffd2a0), 7], P2: [L('r3', 0.4, 2.2, 0.6), C3(0xffd0a0), 7], exposure: 1.15 }); break;
  }
  return s;
}
function blend(a, b, u) { const o = {}; for (const key in a) { const x = a[key], y = b[key];
  if (typeof x === 'number') o[key] = lerp(x, y, u); else if (x instanceof THREE.Color) o[key] = new THREE.Color().lerpColors(x, y, u); else if (x instanceof THREE.Vector3) o[key] = new THREE.Vector3().lerpVectors(x, y, u);
  else if (Array.isArray(x)) o[key] = [new THREE.Vector3().lerpVectors(x[0], y[0], u), new THREE.Color().lerpColors(x[1], y[1], u), lerp(x[2], y[2], u)]; else o[key] = u < 0.5 ? x : y; } return o; }
const ENV = [
  [0, 'black'], [7.6, 'black'], [9.4, 'over'], [40.6, 'over'], [42.4, 'r1'], [185.2, 'r1'], [186.8, 'r2dusk'], [240, 'r2dusk'], [300, 'r2night'], [321.6, 'r2night'], [323.6, 'over'], [325.6, 'over'], [327.6, 'r3'],
  [479.6, 'r3'], [481.4, 'shuffle'], [486.4, 'shuffle'], [487.4, 'quick'], [527.4, 'quick'], [529.4, 'end'], [541, 'end'],
];
function envAt(t) {
  let i = 0; while (i < ENV.length - 2 && ENV[i + 1][0] <= t) i++;
  const [ta, na] = ENV[i], [tb, nb] = ENV[i + 1]; const u = sm(clamp((t - ta) / Math.max(1e-6, tb - ta)));
  let s = na === nb ? preset(na, t) : blend(preset(na, t), preset(nb, t), u);
  const d = darkAt(t);
  if (d > 0) { const act = activeAt(t).key; const gp = act === 'r2' ? null : null; void gp;
    s = blend(s, { ...s, ...preset('dark', t), P0: [s.P0[0], s.P0[1], 0], P1: [s.P1[0], s.P1[1], 0], P2: s.P2, sunCenter: s.sunCenter, sunKey: s.sunKey }, d); }
  // recall + quick: the object that holds the answer keeps a warm glow light
  const gk = glowKey(t);
  if (gk) { const [key, pos, I] = GLOWPOS[gk]; const a = glowAmt(t); const gp = pos();
    s.P2 = [a > 0 ? gp : s.P2[0], new THREE.Color().lerpColors(s.P2[1], C3(0xffd8a8), a), lerp(s.P2[2], I, a)];
    if (gk.startsWith('q')) { const q = quickAt(t); s.P0 = [gp.clone().add(V3(-0.6, 0.6, 0.7)), C3(0xffdcb4), 1.4 * q * a + s.P0[2] * (1 - q)]; s.P1 = [gp.clone().add(V3(0.6, 0.3, -0.2)), C3(0xa8c4ff), 0.8 * q * a + s.P1[2] * (1 - q)]; }
    void key; }
  return s;
}
const boardPt = (key, u, v, out = 0.35) => () => { const m = ST[key].boardFace; const g = m.geometry.parameters; const p = new THREE.Vector3((u - 0.5) * g.width, (0.5 - v) * g.height, out); return m.localToWorld(p); };
const GLOWPOS = { r1: ['r1', boardPt('r1', 0.5, 0.5, 1.1), 0.3], r2: ['r2', boardPt('r2', 0.45, 0.5, 1.1), 0.3], r3: ['r3', boardPt('r3', 0.5, 0.45, 1.1), 0.3], q1: ['r1', boardPt('r1', 0.5, 0.5, 1.1), 0.45], q2: ['r3', () => ST.r3.mon.mesh.localToWorld(new THREE.Vector3(0, 0, 0.4)), 0.8] };
function glowKey(t) { for (const key in RECALLS) { const r = RECALLS[key]; if (t >= r.q - 0.8 && t < r.end + 0.4) return key; } return null; }
function glowAmt(t) { const key = glowKey(t); if (!key) return 0; const r = RECALLS[key]; return Math.min(prog(t, r.q - 0.8, r.q + 0.4), 1 - prog(t, r.end - 0.6, r.end + 0.4)); }

/* =================================================================== skies */
const ROOMSKY = { 0: 'lateAft', 1: 'dusk', 2: 'morning', 3: 'night', 4: 'autumn', 5: 'night', 6: 'dusk', 7: 'deep', 8: 'morning', 9: 'night', 10: 'autumn', 11: 'deep' };
function skyFor(id, t) {
  const shuffleN = clamp(Math.min(prog(t, 480.6, 482.6), 1 - prog(t, 527.5, 529.5)));
  let a = ROOMSKY[id], b = a, mix = 0;
  if (id === 0 && t >= 39 && t < 44) { a = 'autumn'; b = 'lateAft'; mix = sm(prog(t, 40.2, 43.4)); }   // late October outside -> back to September
  if (id === 0 && t < 40.2 && t >= 38) { a = 'autumn'; }
  if (id === 1) { a = 'dusk'; b = 'night'; mix = sm(prog(t, 240, 300)); }
  if (shuffleN > 0) { b = 'neutral'; mix = Math.max(mix, shuffleN); if (shuffleN >= 1) a = 'neutral'; }
  let bright = lerp(0.3, 1, floorGlow(id, t)); bright *= 1 - 0.85 * darkAt(t); if (!LIT_ROOMS.includes(id)) bright *= 1 - 0.7 * sm(prog(t, 530.6, 532)); if (t < 8.6) bright *= prog(t, 7.6, 8.6);
  return [a, b, mix, bright];
}

/* =================================================================== shuffle (quick quiz) */
const ORDER = [3, 7, 0, 10, 5, 1, 8, 4, 11, 2, 9, 6];
const NEW_SLOT = { 0: [3, 2], 1: [2, 0], 2: [0, 1], 3: [0, 2], 4: [3, 0], 5: [1, 1], 6: [2, 2], 7: [1, 0], 8: [3, 1], 9: [0, 0], 10: [2, 1], 11: [1, 2] };
const LIFT_T = (i) => 481.6 + i * 0.22, LAND_T = (i) => 483.8 + i * 0.22;
const stagePos = (f, c) => new THREE.Vector3((c - 1) * 5.75, f * FH * 1.12 + 0.3, 6.4);
function placeRooms(t) {
  for (const room of rooms) {
    const [f0, c0] = room.slot, [f1, c1] = NEW_SLOT[room.id];
    const A = slotPos(f0, c0), Bp = slotPos(f1, c1), Sg = stagePos(f0, c0); const i = ORDER.indexOf(room.id);
    const u1 = ease.inOut(prog(t, LIFT_T(i), LIFT_T(i) + 0.9)); const u2 = prog(t, LAND_T(i), LAND_T(i) + 0.95);
    let p, rot = 0;
    if (u2 <= 0) { p = new THREE.Vector3().lerpVectors(A, Sg, u1); p.y += Math.sin(Math.PI * u1) * 0.8; rot = Math.sin(Math.PI * u1) * 0.1 * (room.id % 2 ? 1 : -1); }
    else { const lane = new THREE.Vector3(Bp.x, Bp.y, 4.9); if (u2 < 0.68) { const v = ease.inOut(u2 / 0.68); p = new THREE.Vector3().lerpVectors(Sg, lane, v); p.y += Math.sin(Math.PI * v) * 0.9; rot = Math.sin(Math.PI * v) * 0.14 * (room.id % 2 ? -1 : 1); } else { const v = (u2 - 0.68) / 0.32; p = new THREE.Vector3().lerpVectors(lane, Bp, v * v); } }
    const ub = sm(clamp((prog(t, 527.6, 530.6) - (room.id % 4) * 0.06) / 0.82));
    if (ub > 0) { p = new THREE.Vector3().lerpVectors(Bp, A, ub); p.z += Math.sin(Math.PI * ub) * (2.2 + (room.id % 3) * 0.6); p.y += Math.sin(Math.PI * ub) * 0.4; rot = Math.sin(Math.PI * ub) * 0.12 * (room.id % 2 ? 1 : -1); }
    room.g.position.copy(p); room.g.rotation.y = rot;
  }
  const sh = sm(prog(t, 480.8, 482.2)) * (1 - sm(prog(t, 529.0, 531.0)));
  W.shell.position.y = sh * 28;
  for (const key of ['r1', 'r2', 'r3']) {
    const i = ORDER.indexOf(RK[key]); const pl = ST[key].plate; const f = prog(t, LIFT_T(i) + 0.15, LIFT_T(i) + 1.2); const back2 = sm(prog(t, 530.0, 531.2));
    pl.visible = f < 1 || back2 > 0;
    if (back2 > 0) { pl.position.set(0, 2.45, 0.075); pl.rotation.set(0, 0, 0); pl.scale.setScalar(back2); }
    else { pl.position.set(0, 2.45 - 2.4 * f * f, 0.075 + f * 0.6); pl.rotation.set(f * 1.4, 0, f * (RK[key] % 2 ? 0.9 : -0.9)); pl.scale.setScalar(1); }
  }
}

/* =================================================================== apply env */
const _sd = new THREE.Vector3();
function applyEnv(s, t, act) {
  hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemiI;
  sun.color.copy(s.sunColor); sun.intensity = s.sunI; _sd.copy(s.sunDir).normalize();
  sun.target.position.copy(s.sunCenter); sun.position.copy(s.sunCenter).addScaledVector(_sd, 30);
  const cam = sun.shadow.camera; const h = s.shadowHalf; if (cam.right !== h) { cam.left = -h; cam.right = h; cam.top = h; cam.bottom = -h; cam.near = 1; cam.far = 70; cam.updateProjectionMatrix(); }
  ['P0', 'P1', 'P2'].forEach((kk, i) => { P[i].position.copy(s[kk][0]); P[i].color.copy(s[kk][1]); P[i].intensity = s[kk][2]; });
  scene.fog.color.copy(s.fog); scene.fog.density = s.fogD; scene.background.copy(s.fog);
  renderer.toneMappingExposure = s.exposure;
  const d = darkAt(t);
  for (const key of ['r1', 'r2', 'r3']) {
    const S = ST[key]; const lampOn = key === 'r1' ? 0 : (act.key === key ? clamp(s.P0[2] / 1.0) : floorGlow(RK[key], t) * 0.6);
    S.lamp.userData.bulb.material.color.setRGB(0.15 + 0.85 * lampOn, 0.13 + 0.8 * lampOn, 0.1 + 0.65 * lampOn);
    S.bulbGlow.material.opacity = 0.75 * lampOn; S.bulbGlow.visible = lampOn > 0.02;
    const scrOn = 1 - 0.85 * Math.max(d, quickAt(t) * 0.6);
    S.mon.mesh.material.color.setScalar(scrOn); S.boardFace.material.emissiveIntensity = 0.16 + 0.16 * d; S.scrGlow.material.opacity = 0.12 * scrOn * (key === 'r1' ? 0.4 : 1);
  }
  // window light (volumetric) in the active room
  const key = s.sunKey; shaft.mesh.visible = !QS.get('noshaft') && s.shaftI > 0.01 && key && ST[key] && act.key === key;
  if (shaft.mesh.visible) {
    const room = ST[key].room; shaft.mesh.matrix.copy(room.g.matrixWorld); const inv = new THREE.Matrix4().copy(room.g.matrixWorld).invert();
    const U = shaft.mat.uniforms; U.uCam.value.copy(camera.position).applyMatrix4(inv); U.uDir.value.copy(_sd).multiplyScalar(-1).transformDirection(inv);
    if (U.uDir.value.z < 0.05) U.uDir.value.z = 0.05;
    U.uI.value = s.shaftI * (1 - d); U.uColor.value.copy(s.shaftColor);
  }
  dust.pts.visible = !!act.key && s.dustI > 0.01 && act.inside > 0.05;
  if (dust.pts.visible) {
    const room = ST[act.key].room; const pos = dust.geo.attributes.position, col = dust.geo.attributes.color; const inBeam = _sd.clone().multiplyScalar(-1);
    for (let i = 0; i < dust.n; i++) {
      const [a, b, c, d2, e, f] = dust.seeds[i];
      const x = -2.3 + a * 4.6 + Math.sin(t * 0.21 * (0.5 + e) + f * 9) * 0.15;
      const y = ((b * 2.8 - t * (0.012 + c * 0.02)) % 2.8 + 2.8) % 2.8 + 0.1;
      const z = -2.1 + d2 * 4.2 + Math.cos(t * 0.17 * (0.5 + f) + e * 7) * 0.15;
      const w = new THREE.Vector3(x, y, z).applyMatrix4(room.g.matrixWorld); pos.setXYZ(i, w.x, w.y, w.z);
      let br = 0.14;
      if (s.shaftI > 0.01) { const py = y - 1.6, pz = z + R.D / 2; const tt = pz / Math.max(0.05, inBeam.z); const bx = x - inBeam.x * tt, by = py - inBeam.y * tt; if (tt > 0 && Math.abs(bx) < 0.85 && Math.abs(by) < 0.78) br = Math.max(0, 1 - tt / 5); }
      br *= s.dustI * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 0.8 * (0.3 + a)) ** 2);
      col.setXYZ(i, br * s.shaftColor.r, br * s.shaftColor.g, br * s.shaftColor.b);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }
}
function applyRooms(t, act) {
  for (const room of rooms) {
    const [a, b, mix, bright] = skyFor(room.id, t);
    room.skyA.map = skyTex[a].tex; room.skyB.map = skyTex[b].tex; room.skyB.opacity = mix; room.skyB.visible = mix > 0.001;
    room.skyA.color.setScalar(bright); room.skyB.color.setScalar(bright);
    const lit = floorGlow(room.id, t); const inside = act.key && ST[act.key].room === room ? act.inside : 0;
    const outside = 1 - act.inside;
    const g = lit * (1 - inside) * lerp(0.25, 1, outside) * (t < 8.6 ? prog(t, 7.6, 8.6) : 1);
    const warm = room.id === 3 ? new THREE.Color(0xffc080) : new THREE.Color(0xffd6a0);
    room.wallMat.emissive.copy(warm).multiplyScalar(0.34 * g); room.floorMat.emissive.copy(warm).multiplyScalar(0.24 * g); room.ceilMat.emissive.copy(warm).multiplyScalar(0.2 * g);
    for (const m of room.glowBulbs) m.emissiveIntensity = 1.3 * g;
    // only draw the room we stand in (and its neighbour during the side-door walk)
    const cull = act.inside > 0.98 && act.key && ST[act.key].room !== room && !(t > 170 && t < 192 && (room.id === 0 || room.id === 1));
    room.g.visible = !cull;
  }
  W.shell.visible = !(act.inside > 0.98); W.turntable.visible = !(act.inside > 0.98);
}

/* =================================================================== surfaces per frame */
function updateSurfaces(t, act) {
  // redraw (and re-upload) a surface only when it is inside the camera frustum; content is a pure function of t
  const q = (x, step = 1 / 24) => Math.round(x / step) * step;
  _frm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frus.setFromProjectionMatrix(_frm);
  const seen = (m) => m && m.visible !== false && _frus.intersectsObject(m);
  for (const key of ['r1', 'r2', 'r3']) {
    const S = ST[key]; const room = S.room.g.visible;
    const near = (act.key === key && act.inside > 0) || (t > 182 && t < 190 && key !== 'r3');
    if (!near) { // seen from outside the room: a fixed picture (blank before the visit, finished after)
      const [a, b] = TL[key]; const ft = t < a ? a : b - 1; const fk = t < a ? 'pre' : 'post';
      S.mon.update(ft, fk); S.board.update(ft, fk); S.note.update(ft, fk); continue; }
    if (room && seen(S.mon.mesh)) S.mon.update(t, q(t));
    if (room && seen(S.boardFace)) S.board.update(t, q(t));
    if (room && seen(S.notebookPage)) S.note.update(t, Math.min(q(t), T[key + '.ctx'].t0 + 1.3));
  }
  if (seen(ST.r1.slipMesh)) ST.r1.slip.update(t, t > 178 ? 'on' : 'off');
  if (seen(ST.r3.fixOldMesh)) ST.r3.fixOld.update(t, q(Math.min(t, T['r3.fix.new'].t0 + 1)));
  if (seen(ST.r3.fixNewMesh)) ST.r3.fixNew.update(t, 'x');
}
const _frm = new THREE.Matrix4(), _frus = new THREE.Frustum();

/* =================================================================== DOM layers */
const capsEl = document.getElementById('caps'); const anchorsEl = document.getElementById('anchors'); const svg = document.getElementById('leaders');
const CAPS = [];
function cap(id, cls, place) { const e = T[id]; const el = document.createElement('div'); el.className = 'cap ' + cls; el.innerHTML = place(e); capsEl.appendChild(el); CAPS.push({ e, el, last: -1 }); return el; }
cap('open.1', 'open k', e => `<div class="txt">${e.text}</div>`);
cap('open.2', 'open s', e => `<div class="txt">${e.text}</div>`);
cap('over.title', 'title', e => `<div class="txt">${e.text}</div>`);
cap('quiz.title', 'center', e => `<div class="txt">${e.text}</div>`);
cap('end.title', 'title end', e => `<div class="txt">${e.text}</div>`);
cap('end.bye', 'bye', e => `<div class="txt">${e.text}</div>`);
cap('over.lit', 'lit', e => `<div class="txt">${e.text}</div>`);
// floor labels (left column, follow each floor's projected height)
const FLOORS = ['over.f1', 'over.f2', 'over.f3', 'over.f4'].map((id, i) => {
  const e = T[id]; const el = document.createElement('div'); el.className = 'floor';
  const sub = e.sub.split('・').map(s => `<span class="it">${s}</span>`).join('<span class="sep">・</span>');
  el.innerHTML = `<div class="fn">${e.text}</div><div class="fl">${sub}</div><div class="pills"></div>`; anchorsEl.appendChild(el); return { e, el, i };
});
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, cls) => { const p = document.createElementNS(SVGNS, tag); p.setAttribute('class', cls); svg.appendChild(p); return p; };
const PILLS = Object.entries(PILL).map(([id, pp]) => {
  const e = T[id]; const el = document.createElement('div'); el.className = 'pill';
  el.innerHTML = `<span class="pn"><span class="pd"></span>${e.text}</span>${e.sub ? `<span class="ps">${e.sub}</span>` : ''}`;
  FLOORS[pp.floor].el.querySelector('.pills').appendChild(el);
  return { id, e, el, ...pp, path: svgEl('path', 'ovl'), dot: svgEl('circle', 'ovd') };
});
// ending: one relation (room 1 -> room 2) drawn under the house with something flowing on it; a faint hop from room 3 to where it leads
const RELL = { el: (() => { const el = document.createElement('div'); el.className = 'rel'; el.textContent = T['end.l1'].text; anchorsEl.appendChild(el); return el; })(), path: svgEl('path', 'relp'), dot: svgEl('circle', 'ovd') };
const HOP = { el: (() => { const el = document.createElement('div'); el.className = 'tg'; el.textContent = T['end.tg'].text; anchorsEl.appendChild(el); return el; })(), path: svgEl('path', 'hopp'), dot: svgEl('circle', 'hopd') };
// recall UI
const rq = document.getElementById('rq'), rring = document.getElementById('ring'), rnum = document.getElementById('rnum'), rcount = document.getElementById('rcount'), ra = document.getElementById('ra'), recallEl = document.getElementById('recall');
const RQA = { r1: ['r1.recall.q', 'r1.recall.a'], r2: ['r2.recall.q', 'r2.recall.a'], r3: ['r3.recall.q', 'r3.recall.a'], q1: ['quiz.q1', 'quiz.a1'], q2: ['quiz.q2', 'quiz.a2'] };
let lastRecall = null;
function recallUI(t) {
  let cur = null; for (const key in RECALLS) { const r = RECALLS[key]; if (t >= r.q - 0.1 && t < r.end + 0.1) cur = key; }
  if (!cur) { recallEl.style.opacity = 0; return 0; }
  const r = RECALLS[cur]; const [qi, ai] = RQA[cur];
  if (lastRecall !== cur) { rq.innerHTML = T[qi].text; ra.innerHTML = `<div class="ans">${T[ai].text}</div><div class="src">${UI.srcOpen}${T[ai].src}${UI.srcClose}</div>`; lastRecall = cur; }
  const vis = fio(t, r.q, r.end, 0.5); recallEl.style.opacity = vis.toFixed(3);
  const rev = sm(prog(t, r.c1, r.c1 + 0.7));
  rq.style.transform = `translateY(${lerp(0, -40, rev)}px) scale(${lerp(1, 0.66, rev)})`; rq.style.opacity = lerp(1, 0.72, rev).toFixed(3);
  const cdur = r.c1 - r.c0, left = clamp(r.c1 - t, 0, cdur);
  rcount.style.opacity = Math.min(prog(t, r.c0 - 0.2, r.c0 + 0.3), 1 - prog(t, r.c1, r.c1 + 0.4)).toFixed(3);
  rring.style.strokeDashoffset = (2 * Math.PI * 44 * (1 - left / cdur)).toFixed(1); rnum.textContent = String(Math.ceil(left - 1e-6) || '');
  ra.style.opacity = rev.toFixed(3); ra.style.transform = `translateY(${lerp(16, 0, rev)}px)`;
  return vis;
}

/* =================================================================== render */
const vproj = new THREE.Vector3();
function project(v) { vproj.copy(v).project(camera); return [...ndcToPx(vproj.x, vproj.y), vproj.z]; }
const grain = document.getElementById('grain'), black = document.getElementById('black'), glEl = document.getElementById('gl'), scrim = document.getElementById('scrim'), scrimT = document.getElementById('scrimT');
function renderAt(t) {
  t = clamp(t, 0, 541 - 1e-4);
  placeRooms(t); scene.updateMatrixWorld(true);
  const act = activeAt(t); const cam = camAt(t);
  const breath = act.inside * 0.003;
  camera.position.copy(cam.pos).add(new THREE.Vector3(wobble(t, 0.11, 1) * breath, wobble(t, 0.09, 2) * breath, 0));
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.lookAt(cam.look.clone().add(new THREE.Vector3(wobble(t, 0.07, 3) * breath * 2, wobble(t, 0.05, 4) * breath * 2, 0)));
  camera.updateMatrixWorld(true);
  const env = envAt(t); applyEnv(env, t, act); applyRooms(t, act);
  updateSurfaces(t, act);
  { const sk = [sun.position.x, sun.position.y, sun.position.z, sun.target.position.x, sun.target.position.z, sun.shadow.camera.right, ...rooms.map(r => r.g.position.x + r.g.position.y * 7 + r.g.position.z * 13 + r.g.rotation.y * 17), W.shell.position.y, act.key, act.inside > 0.98].map(v => typeof v === 'number' ? v.toFixed(3) : String(v)).join(',');
    if (sk !== shadowKey) { renderer.shadowMap.needsUpdate = true; shadowKey = sk; } }
  renderer.render(scene, camera);
  // crisp screen overlays + shallow depth of field when the screen fills the frame
  let focus = 0; const d = darkAt(t);
  for (const key of ['r1', 'r2', 'r3']) { const S = ST[key]; const vis = S.mon.place(camera, { minFrac: 0.42, dim: 0.85 * Math.max(d, quickAt(t) * 0.6), show: act.key === key && act.inside > 0.5 }); if (vis) { const g = S.mon.mesh.geometry.parameters; const a = new THREE.Vector3(-g.width / 2, 0, 0), b = new THREE.Vector3(g.width / 2, 0, 0); S.mon.mesh.localToWorld(a); S.mon.mesh.localToWorld(b); const wpx = Math.abs(project(b)[0] - project(a)[0]); focus = Math.max(focus, clamp((wpx / 1920 - 0.5) / 0.3)); } }
  // soft focus behind the screen we read; lamps and windows bloom a little everywhere
  const bloom = QS.get('nobloom') ? 0 : (act.inside > 0.5 ? 0.42 : 0.4);
  post(QS.get('nodof') ? 0 : focus, bloom);
  // DOM text
  const rv = recallUI(t);
  for (const c of CAPS) { const o = fio(t, c.e.t0, c.e.t1, 0.6); const q = Math.round(o * 1000) / 1000; if (q !== c.last) { c.el.style.opacity = q; c.el.style.visibility = q > 0 ? 'visible' : 'hidden'; c.last = q; } }
  // floor labels next to the house (overview only): the other topics are texture; the three visited ones get a light line
  FLOORS.forEach(({ e, el, i }) => {
    const o = fio(t, e.t0, e.t1, 0.6); el.style.opacity = o.toFixed(3); el.style.visibility = o > 0 ? 'visible' : 'hidden'; if (o <= 0) return;
    const [x, y] = project(new THREE.Vector3(-1.5 * R.W - 0.4, i * FH + 1.5, R.D / 2).add(W.world.position));
    el.style.transform = `translate(${Math.max(60, x - 660)}px, ${y - 40}px)`;
  });
  const roomPt = (id, x, y, z) => project(new THREE.Vector3(x, y, z).applyMatrix4(rooms[id].g.matrixWorld));
  for (const p of PILLS) {
    const o = fio(t, p.e.t0, p.e.t1, 0.5); p.el.style.opacity = o.toFixed(3); p.path.style.opacity = o.toFixed(3); p.dot.style.opacity = o.toFixed(3);
    if (o <= 0) { p.path.setAttribute('d', ''); continue; }
    const bb = p.el.querySelector('.pn').getBoundingClientRect(); const ax = bb.right + 12, ay = bb.top + bb.height / 2;
    let d;
    if (p.room === 1) { // under room 1's neighbour, then up into room 1: never across another room
      const [bx, by] = roomPt(0, -R.W / 2 - 0.35, -0.75, R.D / 2), [cx, cy] = roomPt(1, 0, -0.75, R.D / 2), [ex, ey] = roomPt(1, 0, 0.5, R.D / 2 - 0.4);
      d = `M ${ax} ${ay} L ${bx - 40} ${ay} Q ${bx} ${ay} ${bx} ${ay + 40} L ${bx} ${by - 30} Q ${bx} ${by} ${bx + 30} ${by} L ${cx - 30} ${cy} Q ${cx} ${cy} ${cx} ${cy - 30} L ${ex} ${ey}`;
    } else { const [ex, ey] = roomPt(p.room, -R.W / 2 + 0.7, 1.1, R.D / 2 - 0.4); d = `M ${ax} ${ay} C ${ax + 140} ${ay}, ${ex - 160} ${ey}, ${ex} ${ey}`; }
    p.path.setAttribute('d', d); const len = p.path.getTotalLength(); const [l0, l1] = lineT(p.id); const u = sm(prog(t, l0, l1));
    p.path.style.strokeDasharray = `${len.toFixed(1)} ${len.toFixed(1)}`; p.path.style.strokeDashoffset = (len * (1 - u)).toFixed(1);
    const v = u < 1 ? u : ((t - l1) * 0.45) % 1; const pt = p.path.getPointAtLength(len * v); p.dot.setAttribute('cx', pt.x.toFixed(1)); p.dot.setAttribute('cy', pt.y.toFixed(1)); p.dot.setAttribute('r', u > 0 ? 7 : 0);
    p.el.classList.toggle('on', t >= l1);
  }
  scrimT.style.opacity = (rv * 0.9).toFixed(3);
  scrim.style.opacity = Math.max(fio(t, 9, 37.4, 0.8) * 0.85, fio(t, 529, 541, 0.8) * 0.6, rv * 0.55).toFixed(3);
  // ending: room 1 -> room 2 (scale needs performance first), drawn below the house; a faint hop from room 3 to the next topic
  { const e = T['end.l1']; const o = fio(t, e.t0, e.t1, 0.6); RELL.el.style.opacity = o.toFixed(3); RELL.path.style.opacity = o.toFixed(3); RELL.dot.style.opacity = o.toFixed(3);
    if (o > 0) { const [ax, ay] = roomPt(0, 0.6, 0.3, R.D / 2), [bx, by] = roomPt(0, 0.6, -1.3, R.D / 2), [cx, cy] = roomPt(1, -0.6, -1.3, R.D / 2), [ex, ey] = roomPt(1, -0.6, 0.3, R.D / 2);
      const dd = `M ${ax} ${ay} L ${bx} ${by - 40} Q ${bx} ${by} ${bx + 40} ${by} L ${cx - 40} ${cy} Q ${cx} ${cy} ${cx} ${cy - 40} L ${ex} ${ey}`; RELL.path.setAttribute('d', dd);
      const len = RELL.path.getTotalLength(); const u = sm(prog(t, e.t0, e.t0 + 1.2)); RELL.path.style.strokeDasharray = `${len.toFixed(1)} ${len.toFixed(1)}`; RELL.path.style.strokeDashoffset = (len * (1 - u)).toFixed(1);
      const v = u < 1 ? u : ((t - e.t0 - 1.2) * 0.5) % 1; const pt = RELL.path.getPointAtLength(len * v); RELL.dot.setAttribute('cx', pt.x.toFixed(1)); RELL.dot.setAttribute('cy', pt.y.toFixed(1)); RELL.dot.setAttribute('r', 8);
      RELL.el.style.transform = `translate(${((bx + cx) / 2).toFixed(1)}px, ${(by + 22).toFixed(1)}px) translateX(-50%)`; } }
  { const e = T['end.tg']; const o = fio(t, e.t0, e.t1, 0.6) * 0.8; HOP.el.style.opacity = o.toFixed(3); HOP.path.style.opacity = o.toFixed(3); HOP.dot.style.opacity = o.toFixed(3);
    if (o > 0) { const [ax, ay] = roomPt(3, 1.2, 1.9, R.D / 2), [ex, ey] = roomPt(4, -1.2, 1.9, R.D / 2); const my = Math.min(ay, ey) - 70;
      HOP.path.setAttribute('d', `M ${ax} ${ay} Q ${(ax + ex) / 2} ${my} ${ex} ${ey}`); const len = HOP.path.getTotalLength(); const v = ((t - e.t0) * 0.4) % 1; const pt = HOP.path.getPointAtLength(len * v);
      HOP.dot.setAttribute('cx', pt.x.toFixed(1)); HOP.dot.setAttribute('cy', pt.y.toFixed(1)); HOP.dot.setAttribute('r', 5); HOP.el.style.transform = `translate(${(ex + 10).toFixed(1)}px, ${(ey - 24).toFixed(1)}px)`; } }
  grain.style.backgroundPosition = `${Math.floor((t * 24 * 37) % 256)}px ${Math.floor((t * 24 * 91) % 256)}px`;
  black.style.opacity = (t < 7.6 ? 1 : Math.max(0, 1 - prog(t, 7.6, 9.2))).toFixed(3);
  if (t >= 539.6) black.style.opacity = prog(t, 539.6, 541).toFixed(3);
}

/* =================================================================== ready */
const ALLTXT = TEXT.map(e => e.text + (e.sub || '') + (e.src || '')).join('') + Object.values(UI).join('') + '+,.0123456789ABCDEJLMNPUacdefghiklmnoprstuvyz↑→〈〉一下不世二人件份便個備內全兩准出分別功包去品哪單在型多失好字存安定宜客容實審寫度庫建式引待很快您意愛態慢成戶批擎支改整數料新方是時會月有果核模樣次款歸每求決法流測狀界略的短示程種第筆策算箱結維置群者行要親計講議讀貨貴迴途進都配量錢長間降需預類';
window.studioReady = (async () => {
  await document.fonts.ready;
  await loadFonts(['Noto Sans TC'], ALLTXT, ['400', '500', '700']);
  await loadFonts(['LXGW WenKai TC'], ALLTXT, ['400']);
  await loadFonts(['Inter'], 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:·.,-/&?=()[]<>{};"\'', ['400', '500', '600', '700']);
  await loadFonts(['JetBrains Mono'], 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:·.,-/&?=()[]<>{};"\'+=…', ['500', '700']);
  for (const [k2, src] of Object.entries(imgList)) IMGS[k2] = await loadImg(src);
  D.setImages(IMGS);
  ST.r1.layerTex.set('img', (ctx, w, h) => { if (IMGS.layers) ctx.drawImage(IMGS.layers, 0, 0, w, h); });
  ST.r1.scaleTex.set('img', (ctx, w, h) => { if (IMGS.scale) ctx.drawImage(IMGS.scale, 0, 0, w, h); });
  for (const s of SURF) s.key = null;
  renderAt(0); renderAt(60); renderAt(220); renderAt(360); renderAt(0);
})();
window.renderAt = (t) => { renderAt(warp(t)); };
window.__glTime = (t) => { const gl = renderer.getContext(); const px = new Uint8Array(4); const a = performance.now(); renderAt(warp(t)); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - a; };
