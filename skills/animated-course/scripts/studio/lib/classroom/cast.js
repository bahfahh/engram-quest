// docker-a 黏土班底：包老師（小籠包）、芋圓（學生）、教室、黑板、這一集的道具（程式豆、倒扣紙箱）
// 全部用幾何體＋程式貼圖組成。外觀語言：霧面、手捏的不平整、暖色柔光、接觸陰影。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as S from '/lib/stage.js';

// ---------------------------------------------------------------- noise
function hash3(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s | 0, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
const sm = f => f * f * (3 - 2 * f);
export function vnoise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
  const L = (a, b, k) => a + (b - a) * k;
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
           L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export function fbm(x, y, z, s = 0, oct = 3) {
  let a = 0, amp = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { a += amp * vnoise(x * f, y * f, z * f, s + o * 17); n += amp; amp *= 0.5; f *= 2.03; }
  return a / n;
}

// ---------------------------------------------------------------- geometry helpers
/** Smooth vertex normals that ignore UV seams (vertices at the same position share one normal). */
export function smoothNormals(geo) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const key = i => `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
  const keys = new Array(n); for (let i = 0; i < n; i++) keys[i] = key(i);
  const acc = new Map();
  const idx = geo.index ? geo.index.array : null;
  const tri = idx ? idx.length / 3 : n / 3;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
    for (const i of [i0, i1, i2]) { const k = keys[i]; const v = acc.get(k); if (v) v.add(ab); else acc.set(k, ab.clone()); }
  }
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = acc.get(keys[i]).clone().normalize(); nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return geo;
}
/** Hand-pressed unevenness: push vertices along their normal by low-frequency noise. */
export function clayify(geo, { amp = 0.012, freq = 3, seed = 1, oct = 2 } = {}) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const d = amp * (fbm(x * freq + 11, y * freq + 7, z * freq + 3, seed, oct) - 0.5) * 2;
    pos.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d);
  }
  pos.needsUpdate = true;
  return smoothNormals(geo);
}

// ---------------------------------------------------------------- textures
// Static textures (uploaded once) get mipmaps so the clay grain does not alias into stripes;
// textures redrawn every frame (the board) pass dynamic: true and skip them, as the README asks.
function canvasTex(cv, { repeat = 1, srgb = true, dynamic = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (!dynamic) { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]); else t.repeat.set(repeat, repeat); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; return t; }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]); else t.repeat.set(repeat, repeat);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}
/** Tileable clay bump: soft lumps + thumb dents + faint fingerprint arcs. */
function makeClayBumpCanvas(size = 1024, seed = 3) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const P = 8;  // lattice period for tiling
  const wrapNoise = (x, y, per, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
    const h = (i, j) => hash3(((xi + i) % per + per) % per, ((yi + j) % per + per) % per, 0, s);
    return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size, fy = y / size;
    // only fine grain here (big lumps live in the geometry); dither so 8-bit steps never form contour stripes
    const n = 0.45 * wrapNoise(fx * P * 4, fy * P * 4, P * 4, seed + 1) + 0.55 * wrapNoise(fx * P * 12, fy * P * 12, P * 12, seed + 2);
    const v = Math.max(0, Math.min(255, 128 + (n - 0.5) * 70 + (hash3(x, y, 7, seed) - 0.5) * 10));
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const r = S.rng(seed);
  // thumb dents (drawn wrapped so the texture still tiles)
  for (let k = 0; k < 18; k++) {
    const x = r() * size, y = r() * size, rad = 44 + r() * 100;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + ox, y + oy, rad, rad * 0.7, r() * 3, 0, 7); ctx.fill();
    }
  }
  // fingerprint arcs
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 2; k++) {
    const x = r() * size, y = r() * size;
    for (let j = 0; j < 7; j++) {
      ctx.strokeStyle = `rgba(${j % 2 ? 255 : 0},${j % 2 ? 255 : 0},${j % 2 ? 255 : 0},0.035)`;
      ctx.beginPath(); ctx.ellipse(x, y, 6 + j * 4, 4 + j * 3, k, 0.3, 2.6); ctx.stroke();
    }
  }
  return cv;
}
let _bumpCanvas = null;
function clayBump(repeat = 1) {
  if (!_bumpCanvas) _bumpCanvas = makeClayBumpCanvas();
  return canvasTex(_bumpCanvas, { repeat, srgb: false });
}
let _mottle = null;
function mottleCanvas() {
  if (_mottle) return _mottle;
  const size = 256, cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
  const img = c.createImageData(size, size); const P = 6;
  const wn = (x, y, per, s) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi); const h = (i, j) => hash3(((xi + i) % per + per) % per, ((yi + j) % per + per) % per, 0, s); return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = 0.65 * wn(x / size * P, y / size * P, P, 71) + 0.35 * wn(x / size * P * 3, y / size * P * 3, P * 3, 72);
    const v = 234 + (n - 0.5) * 52; const i = (y * size + x) * 4;
    img.data[i] = Math.min(255, v + 3); img.data[i + 1] = Math.min(255, v); img.data[i + 2] = Math.min(255, v - 3); img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return (_mottle = cv);
}
export function clayMat(color, { rough = 0.86, bump = 1.2, repeat = 1, map = null, emissive = null, mottle = true } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, bumpMap: clayBump(repeat), bumpScale: bump });
  if (map) m.map = map;
  else if (mottle) m.map = canvasTex(mottleCanvas(), { repeat });
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 1; }
  return m;
}
/** Soft round contact shadow texture (shared). */
let _shadowTex = null;
export function contactShadow(w, d, opacity = 0.45) {
  if (!_shadowTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(60,30,15,1)'); g.addColorStop(0.45, 'rgba(60,30,15,0.55)'); g.addColorStop(1, 'rgba(60,30,15,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    _shadowTex = new THREE.CanvasTexture(cv); _shadowTex.generateMipmaps = false; _shadowTex.minFilter = THREE.LinearFilter;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: _shadowTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  return m;
}

const ball = (r, mat, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
function clayBall(r, mat, { seg = 28, amp = 0.006, seed = 2, freq = 9 } = {}) {
  return new THREE.Mesh(clayify(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), { amp, seed, freq }), mat);
}
function shadowy(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
/** Orient an object so its local +z points away from `center` (sits on a roundish surface). */
function faceOut(obj, center) { const d = obj.position.clone().sub(center).normalize(); obj.lookAt(obj.position.clone().add(d)); }

// ---------------------------------------------------------------- shared face kit
const INK = '#2a1a14';
function makeEye(scale, mats) {
  const g = new THREE.Group();
  const white = ball(1, mats.eyeWhite, 20); white.scale.set(scale[0] * 1.38, scale[1] * 1.32, scale[2] * 0.6); white.position.z = -scale[2] * 0.25;
  const pupil = clayBall(1, mats.ink, { amp: 0.0 }); pupil.scale.set(...scale);
  const hi = ball(1, mats.shine, 12); hi.scale.setScalar(scale[0] * 0.3); hi.position.set(-scale[0] * 0.32, scale[1] * 0.38, scale[2] * 0.8);
  const hi2 = ball(1, mats.shine, 10); hi2.scale.setScalar(scale[0] * 0.14); hi2.position.set(scale[0] * 0.3, -scale[1] * 0.3, scale[2] * 0.85);
  const pupilG = new THREE.Group(); pupilG.add(pupil, hi, hi2);
  g.add(white, pupilG);
  // eyelid: a skin-colored cap that slides down to blink
  return { g, pupilG, white, base: scale };
}
function makeBrow(len, r, mat) {
  const m = new THREE.Mesh(clayify(new THREE.CapsuleGeometry(r, len, 6, 12), { amp: 0.002, freq: 30, seed: 5 }), mat);
  m.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(m); return g;
}
function makeMouth(mats, w) {
  const g = new THREE.Group();
  // closed smile: a torus arc
  const smile = new THREE.Mesh(new THREE.TorusGeometry(w * 0.5, w * 0.09, 8, 20, Math.PI * 0.8), mats.ink);
  smile.rotation.z = Math.PI + Math.PI * 0.1; smile.position.y = w * 0.25;
  // open mouth: dark oval + tongue
  const open = new THREE.Group();
  const hole = ball(1, mats.mouth, 20); hole.scale.set(w * 0.55, w * 0.5, w * 0.18);
  const tongue = ball(1, mats.tongue, 16); tongue.scale.set(w * 0.34, w * 0.2, w * 0.12); tongue.position.set(0, -w * 0.22, w * 0.06);
  open.add(hole, tongue);
  // open grin: a "D" lying on its back (flat top, round bottom)
  const grin = new THREE.Group();
  const d = new THREE.Shape(); d.moveTo(-w * 0.62, 0); d.lineTo(w * 0.62, 0); d.absarc(0, 0, w * 0.62, 0, -Math.PI, true);
  const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(d, { depth: w * 0.08, bevelEnabled: true, bevelThickness: w * 0.04, bevelSize: w * 0.05, bevelSegments: 2, curveSegments: 18 }), mats.mouth);
  gm.position.z = -w * 0.06; grin.add(gm);
  const gt = ball(1, mats.tongue, 16); gt.scale.set(w * 0.36, w * 0.2, w * 0.1); gt.position.set(0, -w * 0.4, w * 0.07); grin.add(gt);
  grin.position.y = w * 0.2;
  g.add(smile, open, grin);
  return { g, smile, open, grin };
}

// ---------------------------------------------------------------- 包老師（小籠包）
export function makeTeacher() {
  const dough = clayMat('#fbeed8', { rough: 0.74, bump: 1.3, repeat: [6, 3] });
  const doughLimb = clayMat('#fbeed8', { rough: 0.74, bump: 1.8, repeat: 1.2 });
  const doughDark = clayMat('#ecd5b3', { rough: 0.78, bump: 1.4, repeat: 1.2 });
  const mats = {
    ink: clayMat(INK, { rough: 0.55, bump: 0.3 }), shine: new THREE.MeshBasicMaterial({ color: '#fffaf0' }),
    eyeWhite: clayMat('#fffaf2', { rough: 0.7, bump: 0.3 }),
    mouth: clayMat('#5e2420', { rough: 0.8, bump: 0.4 }), tongue: clayMat('#ef8b80', { bump: 0.6 }),
    cheek: clayMat('#f4a493', { bump: 1.0 }), glasses: clayMat('#6b4026', { rough: 0.55, bump: 0.4 }), stick: clayMat('#b5844f', { rough: 0.7, bump: 1 }), stickTip: clayMat('#e2574a', { rough: 0.7, bump: 1 }),
    bow: clayMat('#e2574a', { bump: 1.2 }), chalk: clayMat('#fbf7ec', { bump: 2 }),
  };
  const root = new THREE.Group();      // placed in the world
  const squash = new THREE.Group();    // squash & stretch around the feet
  const body = new THREE.Group();      // lean / bob
  root.add(squash); squash.add(body);

  // bun profile (r, y)
  const prof = new THREE.SplineCurve([[0, 0], [0.40, 0.012], [0.555, 0.06], [0.625, 0.17], [0.615, 0.31], [0.56, 0.45], [0.45, 0.585], [0.31, 0.7], [0.17, 0.79], [0.07, 0.85], [0.0, 0.875]].map(p => new THREE.Vector2(p[0], p[1])));
  const pts = prof.getPoints(48);
  const R = y => { for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const a = pts[i - 1], b = pts[i]; return a.x + (b.x - a.x) * ((y - a.y) / Math.max(1e-6, b.y - a.y)); } return 0; };
  const geo = new THREE.LatheGeometry(pts, 96);
  { // pleats that swirl toward the top knot
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const r = Math.hypot(x, z); if (r < 1e-5) continue;
      const th = Math.atan2(z, x);
      const k = S.clamp((y - 0.4) / 0.42); const pf = k * k * (3 - 2 * k) * (1 - S.clamp((y - 0.84) / 0.04));
      const s = 1 + pf * (0.055 * Math.cos(16 * th + y * 7.0) - 0.02);
      p.setXYZ(i, x * s, y, z * s);
    }
    smoothNormals(geo);
  }
  clayify(geo, { amp: 0.017, freq: 2.6, seed: 4 });
  { // thumb dimples (away from the face)
    const p = geo.attributes.position, nr = geo.attributes.normal, rr = S.rng(13);
    const dents = []; for (let k = 0; k < 9; k++) { const th = rr() * 6.283, y = 0.1 + rr() * 0.6; if (Math.cos(th - Math.PI / 2) > 0.55 && y < 0.55) continue; dents.push([Math.cos(th), y, Math.sin(th), 0.07 + rr() * 0.06]); }
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) || 1;
      let d = 0; for (const [dx, dy, dz, rad] of dents) { const R0 = R(dy) || 0.3; const q = Math.hypot(x - dx * R0, y - dy, z - dz * R0); d += 0.012 * Math.exp(-(q * q) / (rad * rad)); }
      p.setXYZ(i, x - nr.getX(i) * d, y - nr.getY(i) * d, z - nr.getZ(i) * d);
    }
    smoothNormals(geo);
  }
  const bun = new THREE.Mesh(geo, dough);
  body.add(bun);
  // top knot: a little twisted pinch
  const knotGeo = clayify(new THREE.SphereGeometry(0.075, 24, 18), { amp: 0.012, freq: 14, seed: 9 });
  const knot = new THREE.Mesh(knotGeo, dough); knot.scale.set(1, 0.8, 1); knot.position.set(0, 0.885, 0); body.add(knot);
  const knot2 = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 12), dough); knot2.position.set(0.01, 0.95, 0); knot2.rotation.z = -0.4; body.add(knot2);

  const C = new THREE.Vector3(0, 0.33, 0);
  const onSurf = (x, y, out = 0) => { const r = R(y); const z = Math.sqrt(Math.max(0, r * r - x * x)); const v = new THREE.Vector3(x, y, z); const n = v.clone().sub(C).normalize(); return v.add(n.multiplyScalar(out)); };

  // face
  const face = new THREE.Group(); body.add(face);
  const eyes = [-1, 1].map(sx => { const e = makeEye([0.068, 0.088, 0.032], mats); e.g.position.copy(onSurf(sx * 0.175, 0.37, 0.004)); faceOut(e.g, C); face.add(e.g); return e; });
  const lids = eyes.map(e => { const lid = ball(1, dough, 20); lid.scale.set(0.1, 0.1, 0.028); lid.position.set(0, 0.17, 0.008); e.g.add(lid); return lid; });
  const brows = [-1, 1].map(sx => { const b = makeBrow(0.055, 0.012, mats.ink); b.position.copy(onSurf(sx * 0.18, 0.485, 0.012)); faceOut(b, C); face.add(b); return b; });
  // signature: three little steam puffs curling up from the top knot (they puff up when he gets excited)
  const steamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.82, bumpMap: clayBump(1), bumpScale: 0.6 });
  const steam = new THREE.Group(); steam.position.set(0, 0.99, 0); body.add(steam);
  const puffs = [[0.0, 0.0, 0.045], [0.05, 0.075, 0.036], [-0.01, 0.14, 0.028]].map(([x, y, r], i) => { const p = clayBall(r, steamMat, { amp: r * 0.12, seed: 70 + i }); p.position.set(x, y, 0); p.userData.base = [x, y, r]; steam.add(p); return p; });
  const cheeks = [-1, 1].map(sx => { const c = clayBall(0.052, mats.cheek, { amp: 0.002 }); c.scale.set(1.15, 0.75, 0.32); c.position.copy(onSurf(sx * 0.32, 0.27, 0.0)); faceOut(c, C); face.add(c); return c; });
  const mouth = makeMouth(mats, 0.1); mouth.g.position.copy(onSurf(0, 0.255, 0.006)); faceOut(mouth.g, C); face.add(mouth.g);
  // bow tie on the "chin"
  const bow = new THREE.Group();
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(clayify(new THREE.ConeGeometry(0.06, 0.1, 14), { amp: 0.004, freq: 20, seed: 3 }), mats.bow); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * 0.05; w.scale.set(1, 1, 0.55); bow.add(w); }
  const bk = clayBall(0.03, mats.bow, { amp: 0.002 }); bk.scale.z = 0.7; bow.add(bk);
  bow.position.copy(onSurf(0, 0.12, 0.03)); faceOut(bow, C); body.add(bow);

  // arms (pivot at shoulder) with mitten hands
  const arms = [-1, 1].map(sx => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.57, 0.3, 0.06);
    const arm = new THREE.Mesh(clayify(new THREE.CapsuleGeometry(0.058, 0.22, 8, 14), { amp: 0.004, freq: 12, seed: 6 + sx }), doughLimb);
    arm.position.y = -0.13; pivot.add(arm);
    const hand = clayBall(0.078, doughLimb, { amp: 0.005, seed: 8 + sx }); hand.position.y = -0.27; hand.scale.set(1, 0.92, 0.95); pivot.add(hand);
    const thumb = clayBall(0.032, doughLimb, { amp: 0.002, seed: 10 + sx }); thumb.position.set(-sx * 0.06, 0.02, 0.04); hand.add(thumb);
    pivot.userData.hand = hand;
    body.add(pivot); return pivot;
  });
  // a single chopstick as the pointer (the world is a snack shop, after all)
  const stick = new THREE.Group();
  const stickBody = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.009, 0.016, 0.62, 10), { amp: 0.002, freq: 20, seed: 4 }), mats.stick); stickBody.position.y = 0.26; stick.add(stickBody);
  const tip = clayBall(0.016, mats.stickTip, { amp: 0.001 }); tip.position.y = 0.57; stick.add(tip);
  stick.rotation.x = Math.PI / 2 + 0.15; stick.position.set(0, -0.01, 0.02); arms[1].userData.hand.add(stick);

  // feet
  const feet = [-1, 1].map(sx => { const f = clayBall(0.105, doughDark, { amp: 0.004, seed: 12 + sx }); f.scale.set(1.1, 0.55, 1.3); f.position.set(sx * 0.2, 0.035, 0.33); root.add(f); return f; });
  squash.position.y = 0.03;
  const shadow = contactShadow(1.7, 1.45, 0.5); shadow.position.y = 0.004; root.add(shadow);
  shadowy(root); shadow.castShadow = false; shadow.receiveShadow = false;
  root.scale.setScalar(1.75);

  /** state: {blink, mouth, brow, browTilt, lookX, lookY, smile, armL, armR, armLz, armRz, lean, tilt, squash, turn} */
  function pose(s = {}) {
    const blink = s.blink || 0;
    eyes.forEach((e, i) => { e.pupilG.scale.y = 1 - 0.92 * blink; e.white.scale.y = e.base[1] * 1.32 * (1 - 0.9 * blink); e.pupilG.position.set((s.lookX || 0) * 0.018, (s.lookY || 0) * 0.016, 0); });
    lids.forEach(l => { l.visible = false; });
    const m = s.mouth || 0; const smile = s.smile ?? 1;
    const grin = s.grin || 0;
    mouth.open.scale.set(1 - 0.25 * m * (s.oShape || 0), Math.max(0.02, m), 1); mouth.open.visible = m > 0.04 && grin < 0.5;
    mouth.grin.visible = grin >= 0.5; mouth.grin.scale.set(1, 0.6 + 0.5 * Math.max(m, 0.4), 1);
    mouth.smile.visible = m <= 0.04 && grin < 0.5; mouth.smile.scale.set(1, smile, 1);
    brows.forEach((b, i) => { const sx = i ? 1 : -1; b.position.y = onSurf(0, 0.485).y + (s.brow || 0) * 0.035; b.rotation.z = sx * ((s.browTilt || 0) * 0.35); });
    arms[0].rotation.set(s.armLx || 0, 0, -(s.armL ?? 0.35));
    arms[1].rotation.set(s.armRx || 0, 0, (s.armR ?? 0.35));
    body.rotation.z = s.tilt || 0; body.rotation.x = s.lean || 0;
    const sq = s.squash || 0; squash.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    root.rotation.y = s.turn ?? root.rotation.y;
    // steam: gentle drift; `steam` (0..1) makes the puffs bigger and higher
    const st = s.steam || 0, tt = s.t || 0;
    puffs.forEach((p, i) => { const [x, y, r] = p.userData.base; p.position.set(x + Math.sin(tt * 1.3 + i * 1.7) * 0.012, y * (1 + 0.5 * st) + Math.sin(tt * 0.9 + i) * 0.006, 0); p.scale.setScalar(1 + 0.45 * st + 0.06 * Math.sin(tt * 2 + i * 2.1)); });
    stick.visible = s.stick ?? true;
  }
  pose({});
  return { root, pose, eyes, mouth, stick, headY: 0.37 * 1.75 };
}

// ---------------------------------------------------------------- 芋圓（學生）
export function makeStudent() {
  // taro: lavender with darker specks
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const cx = cv.getContext('2d');
  cx.fillStyle = '#b8a0d6'; cx.fillRect(0, 0, 256, 256);
  const r = S.rng(21);
  for (let i = 0; i < 260; i++) { cx.fillStyle = r() < 0.6 ? 'rgba(112,78,150,0.55)' : 'rgba(235,222,245,0.6)'; const s = 1 + r() * 2.4; cx.beginPath(); cx.ellipse(r() * 256, r() * 256, s, s * (0.5 + r() * 0.6), r() * 3, 0, 7); cx.fill(); }
  const taro = clayMat('#ffffff', { rough: 0.76, bump: 1.4, repeat: 1.5, map: canvasTex(cv, { repeat: 1.6 }) });
  const taroPlain = clayMat('#ad94cd', { bump: 1.5 });
  const mats = {
    ink: clayMat(INK, { rough: 0.55, bump: 0.3 }), shine: new THREE.MeshBasicMaterial({ color: '#fffaf0' }),
    eyeWhite: clayMat('#fffaf2', { rough: 0.7, bump: 0.3 }),
    mouth: clayMat('#5a2030', { rough: 0.8, bump: 0.4 }), tongue: clayMat('#f08f96', { bump: 0.6 }),
    cheek: clayMat('#f29fb6', { bump: 1.0 }), leaf: clayMat('#7cb46b', { bump: 1.2 }), leafVein: clayMat('#a9d38d', { bump: 0.6 }),
    stem: clayMat('#5f9a52', { bump: 0.8 }),
  };
  const root = new THREE.Group(), squash = new THREE.Group(), body = new THREE.Group();
  root.add(squash); squash.add(body);
  const W = 0.6, H = 0.54, D = 0.52;
  const geo = clayify(new RoundedBoxGeometry(W, H, D, 7, 0.19), { amp: 0.014, freq: 3.5, seed: 31 });
  const blob = new THREE.Mesh(geo, taro); blob.position.y = H / 2 + 0.04; body.add(blob);
  const fz = D / 2 + 0.003, fy = H / 2 + 0.04;
  const face = new THREE.Group(); face.position.set(0, fy, fz); body.add(face);
  const eyes = [-1, 1].map(sx => { const e = makeEye([0.06, 0.078, 0.03], mats); e.g.position.set(sx * 0.13, 0.03, 0.0); face.add(e.g); return e; });
  const lids = eyes.map(e => { const lid = ball(1, taroPlain, 20); lid.scale.set(0.092, 0.095, 0.026); lid.position.set(0, 0.17, 0.008); e.g.add(lid); return lid; });
  const brows = [-1, 1].map(sx => { const b = makeBrow(0.06, 0.015, mats.ink); b.position.set(sx * 0.13, 0.15, 0.01); face.add(b); return b; });
  const cheeks = [-1, 1].map(sx => { const c = clayBall(0.045, mats.cheek, { amp: 0.002 }); c.scale.set(1.2, 0.75, 0.3); c.position.set(sx * 0.215, -0.05, 0.0); face.add(c); return c; });
  const mouth = makeMouth(mats, 0.085); mouth.g.position.set(0, -0.08, 0.005); face.add(mouth.g);
  // taro leaf sprout
  const sprout = new THREE.Group(); sprout.position.set(0.04, H + 0.04 + 0.02, 0); body.add(sprout);
  const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.03, 0), new THREE.Vector3(0.0, 0.1, 0), new THREE.Vector3(0.05, 0.16, 0.02));
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 12, 0.014, 8), mats.stem); sprout.add(stem);
  const heart = new THREE.Shape(); heart.moveTo(0, 0); heart.bezierCurveTo(0.07, 0.05, 0.11, 0.13, 0.06, 0.19); heart.bezierCurveTo(0.03, 0.22, 0.0, 0.2, 0.0, 0.17); heart.bezierCurveTo(0.0, 0.2, -0.03, 0.22, -0.06, 0.19); heart.bezierCurveTo(-0.11, 0.13, -0.07, 0.05, 0, 0);
  const leafGeo = clayify(new THREE.ExtrudeGeometry(heart, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 14 }), { amp: 0.004, freq: 20, seed: 7 });
  const leaf = new THREE.Mesh(leafGeo, mats.leaf); leaf.position.set(0.05, 0.155, 0.02); leaf.rotation.set(-0.5, 0.3, -0.7); sprout.add(leaf);
  // arms & feet
  const arms = [-1, 1].map(sx => {
    const pivot = new THREE.Group(); pivot.position.set(sx * (W / 2 - 0.01), 0.22, 0.03);
    const arm = new THREE.Mesh(clayify(new THREE.CapsuleGeometry(0.045, 0.1, 6, 12), { amp: 0.003, freq: 14, seed: 40 + sx }), taroPlain); arm.position.y = -0.065; pivot.add(arm);
    const hand = clayBall(0.055, taroPlain, { amp: 0.003, seed: 44 + sx }); hand.position.y = -0.14; pivot.add(hand);
    body.add(pivot); return pivot;
  });
  const feet = [-1, 1].map(sx => { const f = clayBall(0.075, taroPlain, { amp: 0.003, seed: 50 + sx }); f.scale.set(1.1, 0.55, 1.35); f.position.set(sx * 0.15, 0.03, 0.17); root.add(f); return f; });
  squash.position.y = 0.02;
  const shadow = contactShadow(1.0, 0.9, 0.5); shadow.position.y = 0.004; root.add(shadow);
  shadowy(root); shadow.castShadow = false;
  root.scale.setScalar(1.4);

  function pose(s = {}) {
    const blink = s.blink || 0;
    eyes.forEach(e => { e.pupilG.scale.y = 1 - 0.92 * blink; e.white.scale.y = e.base[1] * 1.32 * (1 - 0.9 * blink); e.pupilG.position.set((s.lookX || 0) * 0.02, (s.lookY || 0) * 0.018, 0); });
    lids.forEach(l => { l.visible = false; });
    const m = s.mouth || 0; const smile = s.smile ?? 1;
    const grin = s.grin || 0;
    mouth.open.scale.set(1 - 0.25 * m * (s.oShape || 0), Math.max(0.02, m), 1); mouth.open.visible = m > 0.04 && grin < 0.5;
    mouth.grin.visible = grin >= 0.5; mouth.grin.scale.set(1, 0.6 + 0.5 * Math.max(m, 0.4), 1);
    mouth.smile.visible = m <= 0.04 && grin < 0.5; mouth.smile.scale.set(1, smile, 1);
    brows.forEach((b, i) => { const sx = i ? 1 : -1; b.position.y = 0.15 + (s.brow || 0) * 0.035; b.rotation.z = sx * (s.browTilt || 0) * 0.4; });
    arms[0].rotation.set(s.armLx || 0, 0, -(s.armL ?? 0.3));
    arms[1].rotation.set(s.armRx || 0, 0, (s.armR ?? 0.3));
    sprout.rotation.z = (s.leaf || 0) * 0.5; sprout.rotation.x = (s.leafDroop || 0) * 0.8; sprout.rotation.y = s.leafSpin || 0;
    body.rotation.z = s.tilt || 0; body.rotation.x = s.lean || 0;
    const sq = s.squash || 0; squash.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    if (s.turn !== undefined) root.rotation.y = s.turn;
  }
  pose({});
  return { root, pose };
}

// ---------------------------------------------------------------- 程式豆（這集的道具）
export function makeBean(color, seed = 1, { arms = false } = {}) {
  const g = new THREE.Group();
  const sq = new THREE.Group(); g.add(sq);               // squash around the feet
  const mat = clayMat(color, { bump: 1.2 });
  const geo = clayify(new THREE.CapsuleGeometry(0.075, 0.07, 10, 18), { amp: 0.006, freq: 10, seed });
  const m = new THREE.Mesh(geo, mat); m.position.y = 0.11; m.scale.set(1, 1, 0.9); sq.add(m);
  const ink = clayMat(INK, { rough: 0.55, bump: 0.2 });
  const eyes = [-1, 1].map(sx => { const e = ball(0.015, ink, 12); e.scale.y = 1.35; e.position.set(sx * 0.03, 0.135, 0.067); sq.add(e); return e; });
  const armP = [];
  if (arms) for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sx * 0.07, 0.1, 0.0);
    const a = new THREE.Mesh(clayify(new THREE.CapsuleGeometry(0.018, 0.04, 4, 8), { amp: 0.002, freq: 30, seed: seed + sx }), mat); a.position.y = -0.03; p.add(a);
    p.rotation.z = sx * 0.5; sq.add(p); armP.push(p);
  }
  const sh = contactShadow(0.26, 0.22, 0.45); sh.position.y = 0.003; g.add(sh);
  shadowy(g); sh.castShadow = false;
  /** s: {squash, blink, look (rad, turn head), wave (0..1 right arm up & waving), hold (right arm forward), t} */
  g.userData.pose = (s = {}) => {
    const k = s.squash || 0; sq.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
    eyes.forEach(e => { e.scale.y = 1.35 * (1 - 0.9 * (s.blink || 0)); });
    sq.rotation.y = s.look || 0;
    if (armP.length) {
      const w = s.wave || 0, h = s.hold || 0;
      armP[1].rotation.set(-h * 1.2, 0, 0.5 + w * (2.2 + 0.4 * Math.sin((s.t || 0) * 16)) + h * 0.3);
      armP[0].rotation.set(0, 0, -0.5 - (s.armL || 0));
    }
  };
  g.userData.hand = armP[1] || null;
  return g;
}

// ---------------------------------------------------------------- English labels
// The clay-world labels (makeFlag, makeTag, makeBox) default to Chiron GoRound TC 700. { lang: 'en' } switches them to
// Nunito 800 (rounded like Chiron); { font, fontWeight } sets any family. Load it first: await C.loadEnFont() (coursemap4 lang 'en' also does).
export const FONT_EN = { family: 'Nunito', weight: '800', css: '/node_modules/@fontsource/nunito/800.css' };
const fontOf = (o = {}) => o.font ? { family: o.font, weight: String(o.fontWeight || '700') } : o.lang === 'en' ? { family: FONT_EN.family, weight: FONT_EN.weight } : { family: 'Chiron GoRound TC', weight: '700' };
export async function loadEnFont(text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$%,.:?!+-') {
  if (![...document.styleSheets].some(s => (s.href || '').includes('@fontsource/nunito/'))) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT_EN.css; document.head.appendChild(l); await new Promise(r => { l.onload = r; l.onerror = r; });
  }
  await document.fonts.load(`${FONT_EN.weight} 64px "${FONT_EN.family}"`, text); await document.fonts.ready;
}

// ---------------------------------------------------------------- 倒扣的紙箱
function cardboardCanvas(label, F = fontOf()) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = '#c99a63'; c.fillRect(0, 0, 512, 512);
  const r = S.rng(77);
  for (let i = 0; i < 512; i += 7) { c.fillStyle = `rgba(120,80,40,${0.04 + r() * 0.04})`; c.fillRect(i, 0, 3, 512); }
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(90,55,25,${r() * 0.06})`; c.beginPath(); c.ellipse(r() * 512, r() * 512, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); c.fill(); }
  if (label) { c.fillStyle = '#3b2a20'; c.font = `${F.weight} 150px "${F.family}"`; if (F.family !== 'Chiron GoRound TC') { let s = 150; while (c.measureText(label).width > 470 && s > 60) { s -= 6; c.font = `${F.weight} ${s}px "${F.family}"`; } } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 256, 270); }
  return cv;
}
function insideCanvas(stickers, F = fontOf()) {
  const cv = cardboardCanvas(null); const c = cv.getContext('2d');
  const r = S.rng(stickers.length * 13 + 5);
  stickers.forEach((label, i) => {
    const n = stickers.length, x = 512 * (i + 0.5) / n, y = 230 + (r() - 0.5) * 40, rot = (r() - 0.5) * 0.25;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#fbf3e2'; c.strokeStyle = '#7a5a3a'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-70, -95); c.lineTo(40, -95); c.lineTo(70, -65); c.lineTo(70, 95); c.lineTo(-70, 95); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(40, -95); c.lineTo(40, -65); c.lineTo(70, -65); c.stroke();
    c.strokeStyle = '#b9a07e'; c.lineWidth = 5; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-45, -40 + k * 28); c.lineTo(45, -40 + k * 28); c.stroke(); }
    c.fillStyle = '#3b2a20'; c.font = `${F.weight} 40px "${F.family}"`; if (F.family !== 'Chiron GoRound TC') { let s = 40; while (c.measureText(label).width > 128 && s > 20) { s -= 2; c.font = `${F.weight} ${s}px "${F.family}"`; } } c.textAlign = 'center'; c.fillText(label, 0, 70);
    c.restore();
  });
  return cv;
}
export function makeBox({ w = 0.46, h = 0.4, d = 0.42, lang, font, fontWeight, label = lang === 'en' ? 'Container' : '容器', stickers = null } = {}) {
  const F = fontOf({ lang, font, fontWeight });
  const g = new THREE.Group();
  const plain = clayMat('#ffffff', { bump: 0.8, map: canvasTex(cardboardCanvas(null)) });
  const front = clayMat('#ffffff', { bump: 0.8, map: canvasTex(cardboardCanvas(label, F)) });
  front.map.wrapS = front.map.wrapT = THREE.ClampToEdgeWrapping;
  const inner = (list) => { if (!list) return plain; const m = clayMat('#ffffff', { bump: 0.6, map: canvasTex(insideCanvas(list, F)) }); m.map.wrapS = m.map.wrapT = THREE.ClampToEdgeWrapping; return m; };
  const st = stickers || [];
  const inF = inner(st[0]), inB = inner(st[1]), inL = inner(st[2]), inR = inner(st[3]);
  const t = 0.018;
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z. Each wall's inward face gets the stickers.
  const fw = new THREE.Mesh(new RoundedBoxGeometry(w, h, t, 2, 0.008), [plain, plain, plain, plain, front, inF]);
  fw.position.set(0, h / 2, d / 2); g.add(fw);
  const bw = new THREE.Mesh(new RoundedBoxGeometry(w, h, t, 2, 0.008), [plain, plain, plain, plain, inB, plain]); bw.position.set(0, h / 2, -d / 2); g.add(bw);
  const lw = new THREE.Mesh(new RoundedBoxGeometry(d, h, t, 2, 0.008), [plain, plain, plain, plain, inL, plain]); lw.rotation.y = Math.PI / 2; lw.position.set(-w / 2, h / 2, 0); g.add(lw);
  const rw = new THREE.Mesh(new RoundedBoxGeometry(d, h, t, 2, 0.008), [plain, plain, plain, plain, plain, inR]); rw.rotation.y = Math.PI / 2; rw.position.set(w / 2, h / 2, 0); g.add(rw);
  const top = new THREE.Mesh(new RoundedBoxGeometry(w + t, t, d + t, 2, 0.008), plain); top.position.y = h; g.add(top);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, d + t + 0.002), clayMat('#e8d2a4', { rough: 0.5, bump: 0.3 })); tape.position.y = h + 0.011; g.add(tape);
  // splayed flaps at the bottom (it is an upside-down box)
  // hinge at the bottom edge, flap reaches outward along the hinge's local +z, outer end lifted a little
  const flap = (W, D, x, z, ry, lift) => {
    const p = new THREE.Group(); p.position.set(x, 0.012, z); p.rotation.y = ry;
    const hinge = new THREE.Group(); hinge.rotation.x = -lift; p.add(hinge);
    const f = new THREE.Mesh(new RoundedBoxGeometry(W, t * 0.8, D, 2, 0.006), plain); f.position.z = D / 2; hinge.add(f);
    g.add(p); return p;
  };
  flap(w, d * 0.42, 0, d / 2, 0, 0.16); flap(w, d * 0.42, 0, -d / 2, Math.PI, 0.1);
  flap(d, w * 0.4, w / 2, 0, Math.PI / 2, 0.2); flap(d, w * 0.4, -w / 2, 0, -Math.PI / 2, 0.12);
  const sh = contactShadow(w * 2.2, d * 2.2, 0.35); sh.position.y = 0.002; g.add(sh);
  shadowy(g); sh.castShadow = false;
  return g;
}

// ---------------------------------------------------------------- 矮桌（示範桌）
export function makeLowTable({ w = 1.8, d = 0.95, h = 0.36 } = {}) {
  const g = new THREE.Group();
  const top = clayMat('#c88a56', { bump: 1.4, repeat: 2 });
  const legM = clayMat('#a96d42', { bump: 1.2 });
  const slab = new THREE.Mesh(clayify(new RoundedBoxGeometry(w, 0.1, d, 4, 0.045), { amp: 0.01, freq: 2, seed: 61 }), top); slab.position.y = h - 0.05; g.add(slab);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.06, 0.075, h - 0.08, 14), { amp: 0.006, freq: 6, seed: 62 + sx + sz * 3 }), legM);
    leg.position.set(sx * (w / 2 - 0.14), (h - 0.08) / 2, sz * (d / 2 - 0.13)); g.add(leg);
  }
  const sh = contactShadow(w * 1.35, d * 1.5, 0.4); sh.position.y = 0.004; g.add(sh);
  shadowy(g); sh.castShadow = false;
  g.userData.topY = h;
  return g;
}

// ---------------------------------------------------------------- 教室
function plankCanvas() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; const c = cv.getContext('2d');
  const r = S.rng(5);
  const rows = 8;
  for (let i = 0; i < rows; i++) {
    const y = i * 1024 / rows;
    let x = -r() * 300;
    while (x < 1024) {
      const len = 300 + r() * 380;
      const l = 0.9 + r() * 0.16;
      c.fillStyle = `rgb(${Math.round(205 * l)},${Math.round(146 * l)},${Math.round(92 * l)})`;
      c.fillRect(x, y, len, 1024 / rows);
      for (let k = 0; k < 6; k++) { c.strokeStyle = `rgba(120,70,30,${0.05 + r() * 0.06})`; c.lineWidth = 1 + r() * 2; c.beginPath(); const yy = y + 10 + r() * (1024 / rows - 20); c.moveTo(x + 5, yy); c.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 10, x + len * 0.6, yy + (r() - 0.5) * 10, x + len - 5, yy); c.stroke(); }
      c.fillStyle = 'rgba(90,50,20,0.55)'; c.fillRect(x + len - 3, y, 3, 1024 / rows);
      x += len;
    }
    c.fillStyle = 'rgba(90,50,20,0.6)'; c.fillRect(0, y, 1024, 4);
  }
  return cv;
}
function plasterCanvas(base, seed) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, 512, 512);
  const r = S.rng(seed);
  for (let i = 0; i < 70; i++) { c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.07})` : `rgba(120,60,30,${r() * 0.05})`; c.beginPath(); c.ellipse(r() * 512, r() * 512, 30 + r() * 90, 15 + r() * 40, r() * 3, 0, 7); c.fill(); }
  return cv;
}
export function makeClassroom() {
  const g = new THREE.Group();
  const wallMat = clayMat('#ffffff', { bump: 1.4, repeat: 3, map: canvasTex(plasterCanvas('#f2d9bb', 8), { repeat: 3 }) });
  const wainMat = clayMat('#d58c6c', { bump: 1.4, repeat: 4 });
  const railMat = clayMat('#b8704f', { bump: 1.0 });
  const floorMat = clayMat('#ffffff', { bump: 1.0, repeat: 2, map: canvasTex(plankCanvas(), { repeat: 2.2 }) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), wallMat); back.position.set(0, 3.5, -2.6); back.receiveShadow = true; g.add(back);
  const wain = new THREE.Mesh(new RoundedBoxGeometry(16, 0.95, 0.08, 2, 0.03), wainMat); wain.position.set(0, 0.475, -2.56); wain.receiveShadow = true; g.add(wain);
  const rail = new THREE.Mesh(new RoundedBoxGeometry(16, 0.08, 0.14, 2, 0.035), railMat); rail.position.set(0, 0.96, -2.54); rail.receiveShadow = true; rail.castShadow = true; g.add(rail);
  for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), wallMat); side.rotation.y = -sx * Math.PI / 2; side.position.set(sx * 6.5, 3.5, 2); side.receiveShadow = true; g.add(side); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2); floor.receiveShadow = true; g.add(floor);
  // a rug under the teaching area
  const rug = new THREE.Mesh(clayify(new THREE.CylinderGeometry(1, 1, 0.025, 64, 1), { amp: 0.01, freq: 2, seed: 3 }), clayMat('#e7b95a', { bump: 2, repeat: 3 }));
  rug.scale.set(3.6, 1, 1.5); rug.position.set(0, 0.012, 0.25); rug.receiveShadow = true; g.add(rug);
  const rugEdge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 80), clayMat('#d9774f', { bump: 1 })); rugEdge.rotation.x = Math.PI / 2; rugEdge.scale.set(3.52, 1.46, 1); rugEdge.position.set(0, 0.03, 0.25); g.add(rugEdge);

  // bunting across the wall
  const pennant = ['#e2574a', '#e8b84a', '#7cb46b', '#6aa6d9', '#b8a0d6'];
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-5.8, 3.85, -2.5), new THREE.Vector3(-2.9, 3.6, -2.5), new THREE.Vector3(0, 3.82, -2.5), new THREE.Vector3(2.9, 3.6, -2.5), new THREE.Vector3(5.8, 3.85, -2.5)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.008, 6), clayMat('#7a5a40')));
  for (let i = 0; i < 24; i++) {
    const p = curve.getPointAt((i + 0.5) / 24);
    const tri = new THREE.Shape(); tri.moveTo(-0.13, 0); tri.lineTo(0.13, 0); tri.lineTo(0, -0.26); tri.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 2 }), clayMat(pennant[i % 5], { bump: 1.2 }));
    m.position.set(p.x, p.y, p.z + 0.02); m.rotation.z = (S.rng(i + 3)() - 0.5) * 0.15; m.castShadow = true; g.add(m);
  }
  // clock
  const clock = new THREE.Group();
  const faceM = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 40), { amp: 0.004, freq: 6 }), clayMat('#fff4df', { bump: 1 })); faceM.rotation.x = Math.PI / 2; clock.add(faceM);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 12, 40), clayMat('#e8b84a', { bump: 1.2 })); clock.add(rim);
  const hand1 = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.22, 0.02, 2, 0.01), clayMat(INK)); hand1.position.set(0, 0.09, 0.045); clock.add(hand1);
  const hand2 = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.28, 0.02, 2, 0.01), clayMat(INK)); hand2.rotation.z = -2.1; hand2.position.set(0.12, -0.065, 0.05); clock.add(hand2);
  for (let i = 0; i < 12; i++) { const d = ball(0.018, clayMat('#c98a5a'), 8); d.position.set(Math.sin(i / 12 * 6.283) * 0.28, Math.cos(i / 12 * 6.283) * 0.28, 0.035); clock.add(d); }
  clock.position.set(-3.6, 2.75, -2.52); shadowy(clock); g.add(clock);
  // window (right)
  const win = new THREE.Group();
  const skyCv = document.createElement('canvas'); skyCv.width = 256; skyCv.height = 256; const sc = skyCv.getContext('2d');
  const sg = sc.createLinearGradient(0, 0, 0, 256); sg.addColorStop(0, '#9fd0ea'); sg.addColorStop(0.75, '#d9eef2'); sg.addColorStop(1, '#f6e8c8'); sc.fillStyle = sg; sc.fillRect(0, 0, 256, 256);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.7), new THREE.MeshBasicMaterial({ map: canvasTex(skyCv) })); win.add(sky);
  for (const [x, y, s] of [[-0.25, 0.35, 0.16], [-0.08, 0.38, 0.2], [0.1, 0.34, 0.15], [0.32, -0.15, 0.1], [0.44, -0.13, 0.13]]) { const cl = clayBall(s, new THREE.MeshBasicMaterial({ color: '#ffffff' }), { amp: 0.01 }); cl.scale.z = 0.3; cl.position.set(x, y, 0.02); win.add(cl); }
  const hill = clayBall(0.9, new THREE.MeshBasicMaterial({ color: '#9cc98a' }), { amp: 0.02 }); hill.scale.set(1.2, 0.45, 0.1); hill.position.set(0.2, -0.95, 0.01); win.add(hill);
  const frameM = clayMat('#f7efe2', { bump: 1.2 });
  const fr = (w, h, x, y) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.12, 3, 0.04), frameM); m.position.set(x, y, 0.04); m.castShadow = true; m.receiveShadow = true; win.add(m); };
  fr(1.75, 0.13, 0, 0.91); fr(1.75, 0.13, 0, -0.91); fr(0.13, 1.95, -0.81, 0); fr(0.13, 1.95, 0.81, 0); fr(0.07, 1.75, 0, 0); fr(1.6, 0.07, 0, 0.1);
  const sill = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.08, 0.32, 3, 0.035), frameM); sill.position.set(0, -1.0, 0.14); sill.castShadow = sill.receiveShadow = true; win.add(sill);
  win.position.set(4.05, 2.45, -2.58); g.add(win);
  // succulent on the sill
  const pot = potPlant(0.16, 2); pot.position.set(4.4, 1.49, -2.38); g.add(pot);
  // floor plant (left)
  const big = potPlant(0.42, 7); big.position.set(-4.6, 0, -1.9); g.add(big);
  return g;
}
function potPlant(size, seed) {
  const g = new THREE.Group();
  const prof = [[0.0, 0], [0.7, 0], [0.78, 0.08], [0.9, 0.85], [1.0, 0.9], [1.0, 1.0], [0.85, 1.0], [0.0, 0.98]].map(p => new THREE.Vector2(p[0] * size, p[1] * size * 1.1));
  const pot = new THREE.Mesh(clayify(new THREE.LatheGeometry(prof, 40), { amp: size * 0.02, freq: 6 / size * 0.3, seed }), clayMat('#cf7a52', { bump: 1.3 }));
  g.add(pot);
  const r = S.rng(seed);
  const n = size > 0.3 ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + r() * 0.4;
    const leaf = clayBall(size * 0.35, clayMat(i % 2 ? '#6faa62' : '#5f9a58', { bump: 1.2 }), { amp: size * 0.015, seed: seed + i });
    const tall = size > 0.3 ? 2.6 : 1.4;
    leaf.scale.set(0.45, tall, 0.25);
    const tilt = 0.35 + r() * 0.35;
    const pivot = new THREE.Group(); pivot.position.y = size * 1.05; pivot.rotation.y = a; leaf.position.set(0, size * 0.35 * tall * 0.8, 0); const t2 = new THREE.Group(); t2.rotation.z = tilt; t2.add(leaf); pivot.add(t2); g.add(pivot);
  }
  const sh = contactShadow(size * 3.2, size * 3.2, 0.45); sh.position.y = 0.003; g.add(sh);
  shadowy(g); sh.castShadow = false;
  return g;
}

// ---------------------------------------------------------------- 黑板
export const BOARD = { w: 4.6, h: 2.4, cw: 2048, ch: 1068 };
export function makeBoard() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = BOARD.cw; cv.height = BOARD.ch;
  const tex = canvasTex(cv, { dynamic: true }); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
  surf.receiveShadow = true; g.add(surf);
  const wood = clayMat('#93603e', { bump: 1.4, repeat: 2 });
  const fz = 0.07, ft = 0.17;
  const bar = (w, h, x, y) => { const m = new THREE.Mesh(clayify(new RoundedBoxGeometry(w, h, 0.16, 4, 0.06), { amp: 0.008, freq: 2.5, seed: Math.round(x * 10 + y * 7 + 20) }), wood); m.position.set(x, y, fz - 0.02); g.add(m); };
  bar(BOARD.w + ft * 2, ft, 0, BOARD.h / 2 + ft / 2); bar(BOARD.w + ft * 2, ft, 0, -BOARD.h / 2 - ft / 2);
  bar(ft, BOARD.h, -BOARD.w / 2 - ft / 2, 0); bar(ft, BOARD.h, BOARD.w / 2 + ft / 2, 0);
  // chalk tray + chalk + eraser
  const tray = new THREE.Mesh(clayify(new RoundedBoxGeometry(BOARD.w + 0.1, 0.07, 0.3, 3, 0.03), { amp: 0.005, freq: 3, seed: 2 }), wood); tray.position.set(0, -BOARD.h / 2 - ft - 0.02, 0.18); g.add(tray);
  const lip = new THREE.Mesh(new RoundedBoxGeometry(BOARD.w + 0.1, 0.07, 0.04, 2, 0.015), wood); lip.position.set(0, -BOARD.h / 2 - ft + 0.03, 0.31); g.add(lip);
  const chalkCols = ['#fbf7ec', '#f3d36b', '#f2a3b3', '#fbf7ec'];
  chalkCols.forEach((c, i) => { const ch = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.03, 0.032, 0.2 - i * 0.03, 10), { amp: 0.003, freq: 20, seed: i }), clayMat(c, { bump: 2 })); ch.rotation.z = Math.PI / 2; ch.rotation.y = 0.15 * (i - 1.5); ch.position.set(1.0 + i * 0.26, -BOARD.h / 2 - ft + 0.03, 0.2); g.add(ch); });
  const eraser = new THREE.Group();
  const eb = new THREE.Mesh(clayify(new RoundedBoxGeometry(0.42, 0.1, 0.17, 3, 0.035), { amp: 0.004, freq: 8 }), clayMat('#c98f5c', { bump: 1.2 })); eraser.add(eb);
  const ef = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.06, 0.16, 3, 0.025), clayMat('#6f7a86', { bump: 2.5, repeat: 3 })); ef.position.y = -0.065; eraser.add(ef);
  eraser.position.set(-1.3, -BOARD.h / 2 - ft + 0.075, 0.19); g.add(eraser);
  shadowy(g); surf.castShadow = false;
  return { g, cv, ctx: cv.getContext('2d'), tex };
}

// chalk rendering on the board canvas ------------------------------------------------------
let _grain = null;
function grainCanvas() {
  if (_grain) return _grain;
  const cv = document.createElement('canvas'); cv.width = BOARD.cw; cv.height = BOARD.ch; const c = cv.getContext('2d');
  const r = S.rng(99); const img = c.createImageData(cv.width, cv.height);
  for (let i = 0; i < img.data.length; i += 4) { const v = r(); img.data[i + 3] = v < 0.22 ? 255 * (0.35 + r() * 0.5) : (v < 0.3 ? 90 : 0); }
  c.putImageData(img, 0, 0);
  // occasional streaks (side of the chalk skipping)
  c.globalAlpha = 0.5; c.strokeStyle = '#000';
  for (let i = 0; i < 1600; i++) { c.lineWidth = 1 + r() * 1.5; const x = r() * cv.width, y = r() * cv.height; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 3); c.stroke(); }
  return (_grain = cv);
}
let _layer = null;
/** Draw onto a scratch layer with `fn(ctx)`, then roughen it like chalk and stamp onto the board. */
export function chalk(boardCtx, fn) {
  if (!_layer) { _layer = document.createElement('canvas'); _layer.width = BOARD.cw; _layer.height = BOARD.ch; }
  const c = _layer.getContext('2d');
  c.clearRect(0, 0, BOARD.cw, BOARD.ch);
  c.save(); fn(c); c.restore();
  c.globalCompositeOperation = 'destination-out'; c.drawImage(grainCanvas(), 0, 0); c.globalCompositeOperation = 'source-over';
  boardCtx.save(); boardCtx.shadowColor = 'rgba(255,255,240,0.18)'; boardCtx.shadowBlur = 6; boardCtx.drawImage(_layer, 0, 0); boardCtx.restore();
}
let _base = null;
/** Dark green slate with old erased-chalk clouds (static, cached). */
export function boardBase(ctx) {
  if (!_base) {
    _base = document.createElement('canvas'); _base.width = BOARD.cw; _base.height = BOARD.ch; const c = _base.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, BOARD.ch); gr.addColorStop(0, '#2f5547'); gr.addColorStop(1, '#284a3e'); c.fillStyle = gr; c.fillRect(0, 0, BOARD.cw, BOARD.ch);
    const r = S.rng(4);
    for (let i = 0; i < 26; i++) { const x = r() * BOARD.cw, y = r() * BOARD.ch, rx = 120 + r() * 380, ry = 50 + r() * 150; const g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(230,240,230,${0.03 + r() * 0.04})`); g.addColorStop(1, 'rgba(230,240,230,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, (r() - 0.5) * 0.4, 0, 7); c.fill(); }
    // eraser swipes
    c.globalAlpha = 0.035; c.fillStyle = '#e8efe6';
    for (let i = 0; i < 14; i++) { const x = r() * BOARD.cw, y = r() * BOARD.ch; c.save(); c.translate(x, y); c.rotate((r() - 0.5) * 0.3); c.fillRect(-200, -30, 400 + r() * 300, 60); c.restore(); }
    c.globalAlpha = 1;
    const img = c.getImageData(0, 0, BOARD.cw, BOARD.ch);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 9; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    c.putImageData(img, 0, 0);
  }
  ctx.drawImage(_base, 0, 0);
}
export const CHALK = { white: '#f4f1e6', yellow: '#f5d76e', pink: '#f4a7b9', orange: '#f6a46a' };

// ---------------------------------------------------------------- vignette (attached to camera)
export function makeVignette(camera, strength = 0.38) {
  // multiply-blended warm vignette: white centre leaves the image untouched, edges darken a little
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  const k = 1 - strength;
  const g = c.createRadialGradient(128, 128, 70, 128, 128, 182); g.addColorStop(0, '#ffffff'); g.addColorStop(1, `rgb(${Math.round(255 * (k + 0.1))},${Math.round(255 * k)},${Math.round(255 * (k - 0.05))})`);
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.renderOrder = 999; m.frustumCulled = false;
  const d = 0.004;
  m.userData.fit = (cam) => { const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); m.scale.set(h * cam.aspect / 2 * 1.03, h / 2 * 1.03, 1); };
  m.position.z = -d; m.userData.fit(camera);
  camera.add(m);
  return m;
}


// ================================================================ phase-2 props
/** Toothpick flag: the snack-world way to label things. setText() redraws only when the text changes. */
export function makeFlag(text, { w = 0.19, h = 0.1, pole = 0.26, bg = '#fff6e3', ink = '#3b2a20', lang, font, fontWeight } = {}) {
  const F = fontOf({ lang, font, fontWeight });
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, pole, 8), clayMat('#e3c58f', { bump: 0.5 })); stick.position.y = pole / 2; g.add(stick);
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 200; const c = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  let cur = null;
  const draw = (txt) => {
    if (txt === cur) return; cur = txt;
    c.fillStyle = bg; c.fillRect(0, 0, 384, 200);
    c.strokeStyle = 'rgba(120,80,40,0.35)'; c.lineWidth = 8; c.strokeRect(4, 4, 376, 192);
    c.fillStyle = ink; let size = 120; c.font = `${F.weight} ${size}px "${F.family}"`;
    while (c.measureText(txt).width > 340 && size > 40) { size -= 6; c.font = `${F.weight} ${size}px "${F.family}"`; }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 192, 106);
    tex.needsUpdate = true;
  };
  draw(text);
  const flagMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const flag = new THREE.Group(); flag.position.set(w / 2 + 0.004, pole - h / 2 - 0.005, 0); g.add(flag);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), flagMat); front.position.z = 0.002; flag.add(front);
  const backMat = new THREE.MeshStandardMaterial({ color: bg, roughness: 0.9 }); const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat); back.rotation.y = Math.PI; back.position.z = -0.002; flag.add(back);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  g.userData.setText = draw; g.userData.flag = flag;
  return g;
}

/** A mitten + long forearm reaching in from off screen (stop-motion style "insert" hand). */
export function makeInsertHand() {
  const g = new THREE.Group();
  const dough = clayMat('#fbeed8', { rough: 0.74, bump: 1.6, repeat: 1.5 });
  const arm = new THREE.Mesh(clayify(new THREE.CapsuleGeometry(0.075, 1.6, 8, 16), { amp: 0.006, freq: 6, seed: 81 }), dough); arm.position.y = 0.85; g.add(arm);
  const hand = clayBall(0.1, dough, { amp: 0.006, seed: 82 }); hand.scale.set(1, 0.85, 0.95); g.add(hand);
  const thumb = clayBall(0.04, dough, { amp: 0.003, seed: 83 }); thumb.position.set(0.075, 0.03, 0.05); hand.add(thumb);
  shadowy(g);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  /** Put the mitten at `at`, forearm pointing back toward `from` (an off-screen shoulder). */
  g.userData.place = (at, from) => { g.position.copy(at); dir.copy(from).sub(at).normalize(); g.quaternion.setFromUnitVectors(up, dir); };
  return g;
}

/** A loose chopstick (the teacher's pointer) for insert shots. Its tip is the group origin; it extends along +y. */
export function makeChopstick() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.016, 0.026, 1.05, 10), { amp: 0.002, freq: 18, seed: 4 }), clayMat('#b5844f', { rough: 0.7, bump: 1 })); body.position.y = 0.55; g.add(body);
  const tip = clayBall(0.024, clayMat('#e2574a', { rough: 0.7, bump: 1 }), { amp: 0.001 }); g.add(tip);
  shadowy(g);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  g.userData.place = (tipAt, toward) => { g.position.copy(tipAt); dir.copy(toward).sub(tipAt).normalize(); g.quaternion.setFromUnitVectors(up, dir); };
  return g;
}

/** The little Linux bench (the hidden VM) that boxes stand on. */
export function makeBench({ w = 1.3, d = 0.5, h = 0.2 } = {}) {
  const g = new THREE.Group();
  const wood = clayMat('#8fcab2', { bump: 1.4, repeat: 1.5 });
  const seat = new THREE.Mesh(clayify(new RoundedBoxGeometry(w, 0.055, d, 3, 0.025), { amp: 0.006, freq: 3, seed: 91 }), wood); seat.position.y = h - 0.0275; g.add(seat);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(clayify(new THREE.CylinderGeometry(0.03, 0.038, h - 0.05, 10), { amp: 0.003, freq: 10, seed: 92 + sx + sz * 2 }), wood);
    leg.position.set(sx * (w / 2 - 0.09), (h - 0.05) / 2, sz * (d / 2 - 0.08)); g.add(leg);
  }
  const sh = contactShadow(w * 1.25, d * 1.6, 0.35); sh.position.y = 0.003; g.add(sh);
  shadowy(g); sh.castShadow = false;
  g.userData.topY = h;
  return g;
}

/** A small clay puff (the program "poofs" when it clocks out). progress(k): 0 hidden, 0..1 burst and fade. */
export function makePuff(color = '#fff4e0') {
  const g = new THREE.Group(); const r = S.rng(55);
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: 1 }));
    const a = i / 8 * 6.283 + r() * 0.5; m.userData.dir = new THREE.Vector3(Math.cos(a), 0.4 + r() * 0.8, Math.sin(a)).normalize(); m.userData.size = 0.025 + r() * 0.02;
    g.add(m); parts.push(m);
  }
  g.userData.progress = (k) => {
    g.visible = k > 0 && k < 1;
    const e = S.ease.out(k);
    parts.forEach(m => { m.position.copy(m.userData.dir).multiplyScalar(0.03 + 0.09 * e); m.position.y += 0.08; m.scale.setScalar(m.userData.size * (0.6 + 1.2 * e)); m.material.opacity = 1 - k * k; });
  };
  g.userData.progress(0);
  return g;
}

/** A hand-held sign on a stick ("1號"). */
export function makeTag(text, { lang, font, fontWeight } = {}) {
  const F = fontOf({ lang, font, fontWeight });
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), clayMat('#e3c58f', { bump: 0.4 })); stick.position.y = 0.06; g.add(stick);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const c = cv.getContext('2d');
  c.fillStyle = '#fff6e3'; c.beginPath(); c.roundRect(6, 6, 244, 148, 30); c.fill(); c.strokeStyle = '#f08a4b'; c.lineWidth = 10; c.stroke();
  c.fillStyle = '#d4602a'; c.font = `${F.weight} 100px "${F.family}"`; if (F.family !== 'Chiron GoRound TC') { let s = 100; while (c.measureText(text).width > 220 && s > 40) { s -= 4; c.font = `${F.weight} ${s}px "${F.family}"`; } } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 128, 86);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.0625), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })); sign.position.y = 0.14; g.add(sign);
  return g;
}

/** A hole torn in the tabletop with a couple of cracks. progress(k) 0..1 opens it. */
export function makeHole() {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); const r = S.rng(31); const n = 18;
  for (let i = 0; i <= n; i++) { const a = i / n * 6.283; const rr = 0.09 * (0.8 + r() * 0.35); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.8; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
  const hole = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#1e120c' })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.002; g.add(hole);
  const crackM = new THREE.MeshBasicMaterial({ color: '#3a2416' });
  const cracks = [[0.0, 0.12, -0.6], [0.0, 0.1, 2.3], [0.0, 0.11, 3.6]].map(([x, len, ang]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.008), crackM); m.rotation.x = -Math.PI / 2; m.rotation.z = ang; m.position.set(Math.cos(ang) * (0.08 + len / 2), 0.0021, -Math.sin(ang) * (0.08 + len / 2)); g.add(m); return m; });
  g.userData.progress = (k) => { g.visible = k > 0.001; const e = S.ease.outBack(Math.min(1, k)); hole.scale.setScalar(Math.max(0.001, e)); cracks.forEach(m => m.scale.set(Math.max(0.001, S.clamp(k * 1.5 - 0.3)), 1, 1)); };
  g.userData.progress(0);
  return g;
}
