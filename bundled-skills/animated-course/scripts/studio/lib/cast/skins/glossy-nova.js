// 1f Glossy figure: Nova (built to match its design image).
// Teacher Nova: a one-piece gumdrop / egg body in pearl white (head and body one piece, widest at the bottom), a big black
//   glossy visor on the front with a thick lilac bezel; a cyan glowing smug face (flat-topped half-moon eyes, brows pressed
//   inward, a lilac D-shaped mouth); a white round knob with a magenta four-point star on top; a lilac + pink swoosh panel on
//   the upper left and a curved lilac + pink band on the lower left; a glowing lilac capsule light on the belly; short arms
//   with lilac cuffs and white cartoon gloves (points, thumbs-up, open hand); a lilac wand with a glowing ball in the left
//   hand; stubby feet with thick lilac soles. A small lilac holo card (a flow diagram) floats up beside her when she points.
// Student: the same language, rounder, smaller, with a larger visor; sunny yellow + peach (instead of lilac + pink), two
//   round bud lights on top, a notebook in the left hand.
// Embodiment: a tiny magenta four-point-star drone with a small visor in the middle; its left and right points are hands.
// State light = the star on top (the student: the two bud lights) + the belly capsule: magenta at rest (student warm
//   yellow), think = blue pulse, aha = green burst with a ring, doubt = orange-red flicker with a "?".
import * as THREE from 'three';

export const meta = {
  id: 'glossy-nova', no: '1f', name: '亮面公仔・Nova', kind: '3d',
  note: 'The star on top and the belly capsule are the state lights: magenta / lilac at rest; think = blue pulse, the star turning slowly; aha = green burst, a ring and small stars, a wink and a thumbs-up; doubt = orange-red flicker, the star tilting with a "?". The student has two bud lights; the embodiment is the whole star',
};

const COL = {
  pearl: '#eddde5', lilac: '#8f6fa6', lilacDeep: '#71537f', pink: '#df8fb2', magenta: '#b93d93', visor: '#121019',
  cyan: '#6ad8ff', cyanCore: '#e8fcff', mouth: '#b48cff', mouthCore: '#f0e4ff', slot: '#e2d4ff', tick: '#ec8db1',
  sun: '#ffc531', sunDeep: '#efa21a', peach: '#ffad8c', warm: '#ffb36b', warmCore: '#fff0dc', bud: '#ffd257',
};
const STATE = { think: '#2f86ff', aha: '#22dd74', doubt: '#ff5626' };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const DEF = { t: 0, blink: 0, lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0 };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y_UP = V3(0, 1, 0), Z_AX = V3(0, 0, 1);

// ---------- textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const TEX = {};
function texes() {
  if (TEX.halo) return TEX;
  TEX.halo = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.ring = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.star = canvasTex(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; x.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } x.closePath(); x.shadowColor = '#fff'; x.shadowBlur = 6; x.fill(); });
  TEX.shadow = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(70,50,90,.42)'); g.addColorStop(0.5, 'rgba(70,50,90,.2)'); g.addColorStop(1, 'rgba(70,50,90,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.qmark = canvasTex(128, 128, (x) => { x.font = '900 104px "Noto Sans TC", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#ffffff'; x.lineJoin = 'round'; x.strokeText('?', 64, 70); x.fillStyle = '#ffffff'; x.fillText('?', 64, 70); });
  // three short tick marks (the design's "!" lines beside the head)
  TEX.burst = canvasTex(128, 128, (x) => { x.lineCap = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 15; [[-1.0, 24, 52], [-0.35, 28, 60], [0.3, 24, 52]].forEach(([a, r0, r1]) => { x.beginPath(); x.moveTo(24 + Math.cos(a) * r0, 72 + Math.sin(a) * r0); x.lineTo(24 + Math.cos(a) * r1, 72 + Math.sin(a) * r1); x.stroke(); }); });
  return TEX;
}
function makeShadow(w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texes().shadow, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = -1; return m;
}

// ---------- materials ----------
const vinyl = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.r ?? 0.36, metalness: 0, clearcoat: o.cc ?? 0.75, clearcoatRoughness: o.cr ?? 0.16, envMapIntensity: o.env ?? 1.05, ...(o.extra || {}) });
const glossy = (color, o = {}) => vinyl(color, { r: 0.2, cc: 1, cr: 0.05, env: 1.25, ...o });

// ---------- geometry ----------
/** superellipsoid (|x/rx|^n+|y/ry|^n+|z/rz|^n=1, n=2/e) with analytic normals; taper > 0 widens the bottom. Optional patch + planar UV. */
function superGeo(rx, ry, rz, e, o = {}) {
  const { ws = 48, hs = 32, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI, offset = 0, planar = null, taper = 0 } = o;
  const g = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLength, thetaStart, thetaLength);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = sePoint({ rx, ry, rz, e, taper }, pos.getX(i), pos.getY(i), pos.getZ(i), offset);
    pos.setXYZ(i, r.p.x, r.p.y, r.p.z); nor.setXYZ(i, r.n.x, r.n.y, r.n.z);
    if (planar) uv.setXY(i, (r.p.x - planar.cx) / planar.w + 0.5, (r.p.y - planar.cy) / planar.h + 0.5);
  }
  g.computeBoundingSphere();
  return g;
}
/** unit-sphere direction → point + normal on the (tapered) superellipsoid R = {rx, ry, rz, e, taper} */
function sePoint(R, x, y, z, off = 0) {
  const e = R.e, n = 2 / e, t = R.taper || 0;
  let X = spow(x, e) * R.rx, Y = spow(y, e) * R.ry, Z = spow(z, e) * R.rz;
  let nx = Math.sign(X) * Math.pow(Math.abs(X / R.rx), n - 1) / R.rx;
  let ny = Math.sign(Y) * Math.pow(Math.abs(Y / R.ry), n - 1) / R.ry;
  let nz = Math.sign(Z) * Math.pow(Math.abs(Z / R.rz), n - 1) / R.rz;
  if (t) { const s = 1 - t * Y / R.ry; ny = ny + (t / R.ry) / s * (nx * X + nz * Z); nx /= s; nz /= s; X *= s; Z *= s; }
  const N = V3(nx, ny, nz).normalize();
  return { p: V3(X, Y, Z).addScaledVector(N, off), n: N };
}
/** nearest-ish surface point to Q (shell space) */
function project(R, Q, off = 0) {
  const e = R.e, s = 1 - (R.taper || 0) * clamp(Q.y / R.ry, -1, 1);
  const x = spow(Q.x / (R.rx * s), 1 / e), y = spow(clamp(Q.y / R.ry, -1, 1), 1 / e), z = spow(Q.z / (R.rz * s), 1 / e);
  const l = Math.hypot(x, y, z) || 1;
  return sePoint(R, x / l, y / l, z / l, off);
}
/** sphere angles (deg): theta from the top, phi: 0 = viewer's left, 90 = front, 180 = viewer's right */
const angDir = (th, ph) => { th *= Math.PI / 180; ph *= Math.PI / 180; return [-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)]; };
const surfAng = (R, th, ph, off = 0) => sePoint(R, ...angDir(th, ph), off);
/** front surface point by local (x, y) */
function onSurf(R, x, y, off = 0) {
  const n = 2 / R.e, t = R.taper || 0, s = 1 - t * y / R.ry, xb = x / s;
  const a = 1 - Math.pow(Math.abs(xb / R.rx), n) - Math.pow(Math.abs(y / R.ry), n);
  const zb = R.rz * Math.pow(Math.max(a, 1e-4), 1 / n);
  let nx = Math.sign(xb) * Math.pow(Math.abs(xb / R.rx), n - 1) / R.rx, ny = Math.sign(y) * Math.pow(Math.abs(y / R.ry), n - 1) / R.ry, nz = Math.pow(zb / R.rz, n - 1) / R.rz;
  if (t) { ny = ny + (t / R.ry) / s * (nx * xb + nz * zb); nx /= s; nz /= s; }
  const N = V3(nx, ny, nz).normalize();
  return { p: V3(x, y, zb * s).addScaledVector(N, off), n: N };
}
/** a raised panel that lies on the shell: centre line through surface points, half-width w(u), thickness th(u);
 *  the top is sampled evenly across the width so it follows the curved shell, edges round down to the surface */
function surfPanel(R, ctrl, wFn, thFn, o = {}) {
  const { N = 24, M = 8, shift = 0, sink = 0.5, edge = 5 } = o, K = 2 * M;
  const curve = new THREE.CatmullRomCurve3(ctrl.map(c => c.p || c), false, 'centripetal');
  const P = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = project(R, curve.getPointAt(u));
    const t = curve.getTangentAt(u); const B = V3().crossVectors(c.n, t).normalize();
    const w = wFn(u), th = thFn(u);
    const base = [];
    for (let j = 0; j < M; j++) { const v = -1 + 2 * j / (M - 1); base.push([project(R, V3().copy(c.p).addScaledVector(B, w * (v + shift))), v]); }
    for (const [b, v] of base) { const h = th * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), edge)), 0.45); P.push(b.p.x + b.n.x * h, b.p.y + b.n.y * h, b.p.z + b.n.z * h); }
    for (let j = M - 1; j >= 0; j--) { const b = base[j][0], h = -th * sink; P.push(b.p.x + b.n.x * h, b.p.y + b.n.y * h, b.p.z + b.n.z * h); }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) { const a = i * K + k, b2 = i * K + (k + 1) % K; idx.push(a, b2 + K, b2, a, a + K, b2 + K); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** flattened tube along a closed front outline (the visor bezel) */
function bezelGeo(R, outline, bw, bh, lift = 0) {
  const N = outline.length, K = 8, P = [], idx = [];
  const pts = outline.map(([x, y]) => onSurf(R, x, y));
  for (let i = 0; i < N; i++) {
    const c = pts[i], t = V3().subVectors(pts[(i + 1) % N].p, pts[(i - 1 + N) % N].p).normalize();
    const B = V3().crossVectors(c.n, t).normalize();
    for (let k = 0; k < K; k++) {
      const a = (k / K) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
      const h = lift + bh * (cy > 0 ? cy : cy * 0.6);
      P.push(c.p.x + B.x * bw * cx + c.n.x * h, c.p.y + B.y * bw * cx + c.n.y * h, c.p.z + B.z * bw * cx + c.n.z * h);
    }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) { const i2 = (i + 1) % N, a = i * K + k, b2 = i * K + (k + 1) % K, c = i2 * K + k, d = i2 * K + (k + 1) % K; idx.push(a, b2, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** closed smooth outline through control points (x, y) → N samples */
function outlinePts(ctrl, N = 96) {
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => V3(x, y, 0)), true, 'centripetal');
  return c.getSpacedPoints(N).slice(0, N).map(v => [v.x, v.y]);
}
/** puffy 4-point sparkle star (lies in xy, faces +z): tips top / right / bottom / left, concave sides (astroid-like) */
function sparkleGeo(rTop, rSide, rBot, depth, o = {}) {
  const { NA = 48, NR = 5, p = 4, bc = 0.05, puff = 0.5 } = o;
  const P = [], idx = [];
  const out = t => { const c = Math.cos(t), s = Math.sin(t), ry = s > 0 ? rTop : rBot; return [rSide * (spow(c, p) * (1 - bc) + c * bc), ry * (spow(s, p) * (1 - bc) + s * bc)]; };
  for (const side of [1, -1]) {
    const off = P.length / 3;
    for (let j = 0; j <= NR; j++) {
      const r = Math.pow(j / NR, 0.85);
      for (let i = 0; i < NA; i++) {
        const [ox, oy] = out((i / NA) * Math.PI * 2);
        const z = side * depth * Math.pow(Math.max(0, 1 - Math.pow(r, 2)), puff);
        P.push(ox * r, oy * r, z);
      }
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
      const a = off + j * NA + i, b = off + j * NA + (i + 1) % NA, c = a + NA, d = b + NA;
      if (side > 0) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);

// ---------- LED face on the visor (colour map = the black glass, emissive map redrawn every pose) ----------
// cfg: outline (local x,y), planar {cx, cy, w, h}, ppu (canvas px per unit), eyes [{x,y}], ew, eh, mouth {x,y,w,h}, style 'smug' | 'cute', mouthCol
function makeLedFace(cfg) {
  const { outline, planar, ppu, style } = cfg;
  const W = Math.round(planar.w * ppu), H = Math.round(planar.h * ppu);
  const toPx = (x, y) => [(x - planar.cx + planar.w / 2) * ppu, (planar.cy + planar.h / 2 - y) * ppu];
  const shape = (x, grow = 0) => {
    x.beginPath();
    let cx = 0, cy = 0; outline.forEach(([ox, oy]) => { cx += ox; cy += oy; }); cx /= outline.length; cy /= outline.length;
    outline.forEach(([ox, oy], i) => { const d = Math.hypot(ox - cx, oy - cy) || 1, k = 1 + grow / (d * ppu); const [px, py] = toPx(cx + (ox - cx) * k, cy + (oy - cy) * k); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.closePath();
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, metalness: 0, specularIntensity: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.42, transparent: true, emissive: '#ffffff', emissiveIntensity: 1.55, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  mat.map = canvasTex(W, H, (x) => {
    x.clearRect(0, 0, W, H);
    shape(x, 6); const g = x.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#1d1a24'); g.addColorStop(0.45, '#0b0a10'); g.addColorStop(1, '#040306'); x.fillStyle = g; x.fill();
    x.save(); shape(x, 6); x.clip();
    const s = x.createLinearGradient(0, 0, W * 0.5, H * 0.9); s.addColorStop(0, 'rgba(235,225,255,.16)'); s.addColorStop(0.3, 'rgba(235,225,255,.05)'); s.addColorStop(0.5, 'rgba(235,225,255,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.restore();
  });
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H;
  const x = ec.getContext('2d', { willReadFrequently: true });   // CPU canvas: the GPU canvas sometimes kept only a dirty rectangle of the redraw
  const emTex = new THREE.CanvasTexture(ec); emTex.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap = emTex;
  const LED = cfg.led || COL.cyan, CORE = cfg.ledCore || COL.cyanCore, MC = cfg.mouthCol || COL.mouth, MCORE = cfg.mouthCore || COL.mouthCore;
  const U = ppu;   // world unit → px
  const glowFill = (alpha, blur, col, core, path, coreGrad) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = col; path(); x.fill(); x.shadowBlur = 0;
    if (coreGrad) { x.fillStyle = coreGrad; path(); x.fill(); }
    x.restore();
  };
  const glowStroke = (alpha, blur, col, core, lw, path) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.lineCap = 'round'; x.lineJoin = 'round';
    x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; path(); x.stroke(); x.shadowBlur = 0;
    x.strokeStyle = core; x.globalAlpha = alpha * 0.85; x.lineWidth = lw * 0.5; path(); x.stroke();
    x.restore();
  };
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const r2 = i % 2 ? r * 0.28 : r, a = i * Math.PI / 4; x.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); } x.closePath(); x.fill(); };
  // eye / brow parameter sets, for the eye on the viewer's left (dir -1); the right eye has its own set (the smug face is asymmetric)
  // eye: cut = flat top line height (eh units above the centre; >= 1 = no cut), slope (canvas dy per dx, + = inner end lower), px/py pupil offset (ew/eh units, + = inner / up), pr pupil radius (ew), sz size
  // brow: ox, oy outer end; ix, iy inner end (ew / eh units, y up); arch (eh units, + = bulges up)
  const SMUG = {
    L: { cut: 0.36, slope: 0.12, px: 0.34, py: 0.2, pr: 0.72, sz: 1, brow: [-1.35, 1.0, 1.05, 0.6, 0.08] },
    R: { cut: 0.26, slope: 0.32, px: 0.38, py: 0.2, pr: 0.72, sz: 1, brow: [1.25, 1.42, -0.95, 0.6, 0.16] },
  };
  const TH = {
    L: { cut: 0.6, slope: 0, px: 0, py: 0.3, pr: 0.6, sz: 1, brow: [-1.2, 1.45, 1.0, 1.35, 0.32] },
    R: { cut: 0.3, slope: 0.15, px: 0, py: 0.3, pr: 0.6, sz: 0.95, brow: [1.2, 0.95, -0.95, 0.8, 0.04] },
  };
  const AHA = {
    L: { cut: 0.4, slope: 0.04, px: 0.3, py: 0.15, pr: 0.66, sz: 1.06, brow: [-1.3, 1.3, 1.0, 1.12, 0.3] },
    R: { cut: 0.4, slope: 0.04, px: 0.3, py: 0.15, pr: 0.66, sz: 1.06, brow: [1.3, 1.35, -1.0, 1.15, 0.3] },
  };
  const DOUBT = {
    L: { cut: 0.9, slope: 0, px: 0.05, py: -0.1, pr: 0.55, sz: 0.88, brow: [-1.2, 0.95, 0.95, 1.4, 0.1] },
    R: { cut: 0.9, slope: 0, px: 0.05, py: -0.1, pr: 0.55, sz: 0.88, brow: [1.2, 0.95, -0.95, 1.4, 0.1] },
  };
  const CUTE_I = { cut: 2, slope: 0, px: 0, py: 0, pr: 0, sz: 1, brow: [-0.7, 1.55, 0.55, 1.62, 0.25] };
  const CUTE = {
    I: { L: CUTE_I, R: { ...CUTE_I, brow: [0.7, 1.55, -0.55, 1.62, 0.25] } },
    T: { L: { ...CUTE_I, sz: 0.92, brow: [-0.7, 1.9, 0.55, 1.95, 0.35] }, R: { ...CUTE_I, sz: 0.92, brow: [0.7, 1.45, -0.55, 1.4, 0.0] } },
    A: { L: CUTE_I, R: { ...CUTE_I, brow: [0.7, 1.55, -0.55, 1.62, 0.25] } },
    D: { L: { ...CUTE_I, sz: 0.85, brow: [-0.7, 1.3, 0.55, 1.75, 0.1] }, R: { ...CUTE_I, sz: 0.85, brow: [0.7, 1.3, -0.55, 1.75, 0.1] } },
  };
  const SETS = style === 'smug' ? { I: SMUG, T: TH, A: AHA, D: DOUBT } : CUTE;
  const blendP = (w, side) => {
    const o = { cut: 0, slope: 0, px: 0, py: 0, pr: 0, sz: 0, brow: [0, 0, 0, 0, 0] };
    for (const k of ['I', 'T', 'A', 'D']) { const p = SETS[k][side], wk = w[k]; if (!wk) continue; for (const key of ['cut', 'slope', 'px', 'py', 'pr', 'sz']) o[key] += p[key] * wk; p.brow.forEach((v, j) => { o.brow[j] += v * wk; }); }
    return o;
  };
  function draw(s) {
    const k = sm(s.stateK || 0), st = s.state;
    const kT = st === 'think' ? k : 0, kA = st === 'aha' ? k : 0, kD = st === 'doubt' ? k : 0, kI = 1 - kT - kA - kD;
    const w = { I: kI, T: kT, A: kA, D: kD };
    const bl = clamp(s.blink);
    x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); shape(x); x.clip();
    // faint inner glow of the screen
    const [ccx, ccy] = toPx(cfg.eyes[0].x * 0.5 + cfg.eyes[1].x * 0.5, cfg.eyes[0].y);
    const amb = x.createRadialGradient(ccx, ccy, 0, ccx, ccy, W * 0.5); amb.addColorStop(0, 'rgba(70,170,255,.10)'); amb.addColorStop(1, 'rgba(70,170,255,0)'); x.fillStyle = amb; x.fillRect(0, 0, W, H);
    const lx = clamp(s.lookX + kT * 0.35, -1, 1), ly = clamp(s.lookY + kT * 0.3, -1, 1);
    const ew = cfg.ew * U, eh = cfg.eh * U;
    const gx = lx * ew * 0.5, gy = -ly * eh * 0.35;
    cfg.eyes.forEach((e, i) => {
      const dir = i ? 1 : -1, P = blendP(w, i ? 'R' : 'L');
      let [cx, cy] = toPx(e.x, e.y); cx += gx * 0.6; cy += gy * 0.6;
      const rx = ew * P.sz, ry = eh * P.sz;
      // wink (aha, the eye on the viewer's right for the teacher) / excited chevrons (aha, student)
      const wWink = style === 'smug' && i === 1 ? kA : 0, wChev = style === 'cute' ? kA : 0;
      const wOpen = 1 - wWink - wChev;
      const open = 1 - 0.9 * bl;
      if (wOpen > 0.01) {
        const ryo = ry * open, inner = -dir;                         // inner: +1 = towards the centre of the face
        const yAt = dx => cy - P.cut * ryo + P.slope * dx * inner;   // flat top line (inner end lower)
        const path = () => { x.beginPath(); x.ellipse(cx, cy, rx, ryo, 0, 0, Math.PI * 2); };
        x.save();
        x.beginPath(); x.moveTo(cx - rx * 1.6, yAt(-rx * 1.6)); x.lineTo(cx + rx * 1.6, yAt(rx * 1.6)); x.lineTo(cx + rx * 1.6, cy + ry * 2); x.lineTo(cx - rx * 1.6, cy + ry * 2); x.closePath(); x.clip();
        const g = x.createRadialGradient(cx - inner * rx * 0.3, cy + ryo * 0.15, 0, cx, cy, rx * 1.15); g.addColorStop(0, '#bff3ff'); g.addColorStop(0.45, LED); g.addColorStop(1, LED);
        glowFill(wOpen, 26, LED, CORE, path, g);
        x.restore(); x.save();
        // pupil: a dark disc that leaves a crescent of light (smug face); clipped by the eye only, so the flat top has no seam
        if (P.pr > 0.02 && open > 0.3) {
          path(); x.clip();
          const pcx = cx + P.px * inner * rx + gx * 0.8, pcy = cy - P.py * ryo + gy * 0.8;
          x.globalAlpha = wOpen; x.fillStyle = '#000'; x.beginPath(); x.ellipse(pcx, pcy, P.pr * rx, P.pr * rx * open, 0, 0, Math.PI * 2); x.fill();
        }
        if (style === 'cute' && open > 0.4) { x.globalAlpha = wOpen * 0.95; x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx + rx * 0.28, cy - ry * 0.3, rx * 0.2, ry * 0.24, 0, 0, Math.PI * 2); x.fill(); }
        x.restore();
      }
      if (wWink > 0.01) glowStroke(wWink, 22, LED, CORE, ew * 0.42, () => { x.beginPath(); x.arc(cx, cy + ry * 0.55, rx * 1.0, Math.PI * 1.15, Math.PI * 1.85); });
      if (wChev > 0.01) glowStroke(wChev, 22, LED, CORE, ew * 0.38, () => { const a = rx * 0.75, b = ry * 0.6; x.beginPath(); x.moveTo(cx + dir * a, cy - b); x.lineTo(cx - dir * a * 0.75, cy); x.lineTo(cx + dir * a, cy + b); });
      // brow
      const [ox, oy, ix, iy, arch] = P.brow;
      const bx0 = cx + ox * ew, by0 = cy - oy * eh, bx1 = cx + ix * ew, by1 = cy - iy * eh;
      const mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2 - arch * eh;
      const bAlpha = style === 'smug' ? 1 : 0.9;
      glowStroke(bAlpha, 18, LED, CORE, ew * (style === 'smug' ? 0.34 : 0.24), () => { x.beginPath(); x.moveTo(bx0, by0); x.quadraticCurveTo(2 * mx - (bx0 + bx1) / 2, 2 * my - (by0 + by1) / 2, bx1, by1); });
    });
    // aha sparkles on the glass
    if (kA > 0.02) {
      const tw = 0.6 + 0.4 * Math.sin(s.t * 9);
      x.save(); x.globalAlpha = kA; x.shadowColor = LED; x.shadowBlur = 10; x.fillStyle = CORE;
      const [ax, ay] = toPx(cfg.eyes[0].x - cfg.ew * 2.0, cfg.eyes[0].y + cfg.eh * 1.6); star(ax, ay, eh * 0.45 * tw);
      const [bx, by] = toPx(cfg.eyes[1].x + cfg.ew * 2.0, cfg.eyes[1].y + cfg.eh * 1.9); star(bx, by, eh * 0.35 * (1.6 - tw));
      x.restore();
    }
    // ---- mouth ----
    const m = cfg.mouth; let [mx, my] = toPx(m.x, m.y); mx += gx * 0.4; my += gy * 0.3;
    const mw = m.w * U, mh = m.h * U;
    const talk = clamp(s.talk);
    const openAmt = clamp(Math.max(kA * 0.95, (cfg.idleOpen || 0) * kI) + talk * 0.75);
    const wD = clamp(openAmt * 3), closed = 1 - wD;
    const tilt = style === 'smug' ? 0.12 : 0;
    // smile (closed): a crooked smirk for the teacher, a round smile for the student
    if (closed * (kI + kA) > 0.01) glowStroke(closed * clamp(kI + kA), 14, MC, MCORE, ew * 0.2, () => { x.beginPath(); x.moveTo(mx - mw * 0.46, my - mh * 0.1); x.quadraticCurveTo(mx + mw * 0.02, my + mh * 0.42, mx + mw * 0.48, my - mh * (0.1 + tilt * 1.2)); });
    // think: a short flat "hmm" line, pushed to one side
    if (closed * kT > 0.01) glowStroke(closed * kT, 12, MC, MCORE, ew * 0.2, () => { x.beginPath(); x.moveTo(mx - mw * 0.12, my + mh * 0.1); x.quadraticCurveTo(mx + mw * 0.15, my + mh * 0.18, mx + mw * 0.42, my - mh * 0.06); });
    // doubt: small wobbly line
    if (closed * kD > 0.01) glowStroke(closed * kD, 12, MC, MCORE, ew * 0.18, () => { x.beginPath(); for (let j = 0; j <= 16; j++) { const u = j / 16; x.lineTo(mx - mw * 0.36 + mw * 0.72 * u, my + mh * 0.12 + Math.sin(u * Math.PI * 3) * mh * 0.1); } });
    // open "D": flat top (a little tilted on the teacher), round bottom
    if (wD > 0.01) {
      const h = mh * (0.4 + 0.7 * openAmt), ww = mw * (0.4 + 0.12 * openAmt);
      const yl = my - h * 0.28 + ww * tilt, yr = my - h * 0.28 - ww * tilt, bot = my + h * 0.72;
      const path = () => { x.beginPath(); x.moveTo(mx - ww, yl); x.lineTo(mx + ww, yr); x.bezierCurveTo(mx + ww * 1.02, bot, mx + ww * 0.5, bot + h * 0.06, mx, bot + h * 0.06); x.bezierCurveTo(mx - ww * 0.5, bot + h * 0.06, mx - ww * 1.02, bot, mx - ww, yl); x.closePath(); };
      const g = x.createLinearGradient(0, yr, 0, bot); g.addColorStop(0, MCORE); g.addColorStop(0.45, MC); g.addColorStop(1, MC);
      glowFill(wD, 22, MC, MCORE, path, g);
    }
    x.restore();
    emTex.needsUpdate = true;
  }
  return { mat, draw, W, H };
}

// ---------- signature: state colour + level ----------
function stateColor(s, out, idle) { return out.set(idle).lerp(new THREE.Color(STATE[s.state] || idle), s.state === 'idle' || !STATE[s.state] ? 0 : sm(s.stateK || 0)); }
function stateLevel(s) {
  const k = sm(s.stateK || 0), t = s.t;
  const idle = 0.55 + 0.1 * Math.sin(t * 2.1);
  if (s.state === 'think') return lerp(idle, 0.5 + 0.7 * (0.5 + 0.5 * Math.sin(t * 8)), k);
  if (s.state === 'aha') return lerp(idle, 1.35 + 0.25 * Math.sin(t * 13), k);
  if (s.state === 'doubt') return lerp(idle, (Math.sin(t * 23) * Math.sin(t * 9.3) > 0.35) ? 0.3 : 1.1, k);
  return idle;
}
/** halo, aha rings and sparkles around a state light */
function makeGlow(r, fx = true) {
  const T = texes(), g = new THREE.Group();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.halo, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.3 }));
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  const burst2 = new THREE.Sprite(burst.material.clone());
  halo.renderOrder = 5; burst.renderOrder = 6; burst2.renderOrder = 6;
  g.add(halo, burst, burst2);
  const stars = [];
  for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star, color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); sp.renderOrder = 7; g.add(sp); stars.push(sp); }
  return {
    group: g, halo,
    set(s, col, lv, haloK = 1) {
      const k = sm(s.stateK || 0), kA = s.state === 'aha' ? k : 0, active = s.state !== 'idle' && STATE[s.state] ? k : 0;
      halo.material.color.copy(col); halo.material.opacity = clamp((0.12 + 0.5 * active) * lv * haloK); halo.scale.setScalar(r * (4 + 3 * lv));
      if (!fx) { burst.visible = burst2.visible = false; stars.forEach(sp => { sp.visible = false; }); return; }
      [burst, burst2].forEach((b, j) => { const ph = ((s.t * 1.6 + j * 0.5) % 1); b.material.color.copy(col); b.material.opacity = kA * (1 - ph) * 0.85; b.scale.setScalar(r * (3 + 9 * ph)); b.visible = kA > 0.01; });
      stars.forEach((sp, j) => { const a = j * Math.PI / 2 + 0.6, ph = ((s.t * 1.3 + j * 0.27) % 1); const d = r * (1.8 + 3.5 * ph); sp.position.set(Math.cos(a) * d, Math.sin(a) * d, 0.02); sp.material.opacity = kA * Math.sin(ph * Math.PI); sp.scale.setScalar(r * (1.3 + 1.0 * Math.sin(ph * Math.PI))); sp.visible = kA > 0.01; });
    },
  };
}
/** "?" (doubt) and tick lines (aha) beside the head */
function makeMarks(qCol, tickCol) {
  const T = texes();
  const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.qmark, color: qCol, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.burst, color: tickCol, transparent: true, depthWrite: false, opacity: 0 }));
  q.renderOrder = 8; b.renderOrder = 8;
  return {
    q, b,
    set(s, size) {
      const k = sm(s.stateK || 0), kD = s.state === 'doubt' ? k : 0, kA = s.state === 'aha' ? k : 0;
      q.material.opacity = kD; q.scale.setScalar(size * (0.7 + 0.3 * kD)); q.material.rotation = 0.18 * Math.sin(s.t * 3); q.visible = kD > 0.01;
      q.position.y = q.userData.y + 0.03 * Math.sin(s.t * 4);
      b.material.opacity = kA * (0.8 + 0.2 * Math.sin(s.t * 11)); b.scale.setScalar(size * (0.8 + 0.25 * kA)); b.visible = kA > 0.01;
    },
  };
}

// ---------- hands, arms (2-bone IK), props ----------
const _a = V3(), _b = V3(), _c = V3(), _m = new THREE.Matrix4();
function between(mesh, A, B) { mesh.position.copy(A).add(B).multiplyScalar(0.5); _a.copy(B).sub(A).normalize(); mesh.quaternion.setFromUnitVectors(Y_UP, _a); }
/** hand frame from an exact local +y and an approximate local +z */
function basisYZ(q, Y, Z) {
  _b.copy(Y).normalize(); const d = Z.dot(_b); _c.copy(Z).addScaledVector(_b, -d);
  if (_c.lengthSq() < 1e-8) _c.set(0, 0, 1).addScaledVector(_b, -_b.z);
  _c.normalize(); _a.crossVectors(_b, _c); _m.makeBasis(_a, _b, _c); q.setFromRotationMatrix(_m);
}
/** hand frame from an exact local +x and an approximate local +y */
function basisXY(q, X, Y) {
  _a.copy(X).normalize(); const d = Y.dot(_a); _b.copy(Y).addScaledVector(_a, -d);
  if (_b.lengthSq() < 1e-8) _b.set(0, 1, 0).addScaledVector(_a, -_a.y);
  _b.normalize(); _c.crossVectors(_a, _b); _m.makeBasis(_a, _b, _c); q.setFromRotationMatrix(_m);
}
function ik(S, T, a, b, pole, E, Wr) {
  const dir = V3().subVectors(T, S); let d = dir.length(); dir.divideScalar(d || 1);
  d = clamp(d, Math.abs(a - b) + 1e-3, a + b - 1e-4);
  const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (perp.lengthSq() < 1e-8) perp.set(0, -1, 0); perp.normalize();
  E.copy(S).addScaledVector(dir, a * ca).addScaledVector(perp, a * sa);
  Wr.copy(S).addScaledVector(dir, d);
}
/** a cartoon glove: plump palm + 3 two-part fingers + thumb. Local -y = fingers, +z = palm side, thumb at local x = +side. */
function makeHand(r, mat, side) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(superGeo(r * 0.98, r * 0.86, r * 0.66, 0.7, { ws: 16, hs: 10 }), mat); palm.position.y = -r * 0.8; g.add(palm);
  const fingers = [0.6, 0, -0.6].map((fx, i) => {
    const base = new THREE.Group(); base.position.set(side * fx * r, -r * 1.42, r * 0.05); g.add(base);
    const fr = r * (i === 2 ? 0.31 : 0.34), l1 = r * 0.42, l2 = r * (i === 0 ? 0.5 : 0.4);
    const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(fr, l1, 3, 8), mat); p1.position.y = -l1 / 2; base.add(p1);
    const j = new THREE.Group(); j.position.y = -l1; base.add(j);
    const p2 = new THREE.Mesh(new THREE.CapsuleGeometry(fr * 0.97, l2, 3, 8), mat); p2.position.y = -l2 / 2; j.add(p2);
    return { base, j };
  });
  const tb = new THREE.Group(); tb.position.set(side * r * 0.74, -r * 0.6, r * 0.24); g.add(tb);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.34, r * 0.52, 3, 8), mat); t1.position.y = -r * 0.36; tb.add(t1);
  return {
    group: g,
    set(curl, idx = curl, up = 0) {
      fingers.forEach((f, i) => { const c = i === 0 ? idx : curl; f.base.rotation.x = -c * 1.5; f.j.rotation.x = -c * 1.6; });
      tb.rotation.set(lerp(-0.25 - curl * 0.85, -0.05, up), 0, side * lerp(0.6 - curl * 0.35, 2.2, up));
    },
  };
}
function makeArm(side, o) {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(o.r * 1.3, 14, 10), o.mat);
  const up = new THREE.Mesh(new THREE.CapsuleGeometry(o.r * 1.06, o.a, 3, 12), o.mat);
  const el = new THREE.Mesh(new THREE.SphereGeometry(o.r * 1.02, 12, 8), o.mat);
  const fo = new THREE.Mesh(new THREE.CapsuleGeometry(o.r, o.b - o.r * 0.6, 3, 12), o.mat);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 1.36, o.r * 1.3, o.r * 1.15, 24), o.cuff);
  const glove = new THREE.Mesh(new THREE.CylinderGeometry(o.hr * 0.66, o.r * 1.05, o.hr * 0.55, 20), o.handMat);   // flared glove top
  const hand = makeHand(o.hr, o.handMat, side);
  g.add(sh, up, el, fo, cuff, glove, hand.group);
  const E = V3(), W = V3(), fd = V3();
  return {
    group: g, hand, W, q: hand.group.quaternion,
    /** P: { T, pole, f, n, p, curl, idx, up } in body space; fist = hold a stick along P.p */
    set(S, P, fist) {
      ik(S, P.T, o.a, o.b, P.pole, E, W);
      sh.position.copy(S); el.position.copy(E);
      between(up, S, E); between(fo, E, W);
      fd.subVectors(W, E).normalize();
      cuff.position.copy(E).addScaledVector(fd, o.b * o.cuffAt); cuff.quaternion.setFromUnitVectors(Y_UP, fd);
      glove.position.copy(W).addScaledVector(fd, -o.hr * 0.12); glove.quaternion.setFromUnitVectors(Y_UP, fd);
      hand.group.position.copy(W);
      if (fist) basisXY(hand.group.quaternion, P.p.clone().multiplyScalar(side), P.f.clone().negate());
      else basisYZ(hand.group.quaternion, P.f.clone().negate(), P.n);
      hand.set(P.curl, P.idx, P.up);
    },
  };
}
const AK = ['T', 'pole', 'f', 'n', 'p'];
function mixPose(A, B, k) {
  if (k <= 0 || !B) return A;
  const o = { curl: lerp(A.curl, B.curl ?? A.curl, k), idx: lerp(A.idx ?? A.curl, B.idx ?? B.curl ?? A.curl, k), up: lerp(A.up || 0, B.up || 0, k) };
  for (const key of AK) o[key] = A[key].map((v, i) => lerp(v, (B[key] || A[key])[i], k));
  return o;
}
const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
/** arm pose from the CAST fields; tables are written for the arm on the viewer's right (+x) and mirrored */
function armPose(s, side, P) {
  let a = { idx: P.rest.curl, up: 0, p: [0, 1, 0], ...P.rest };
  a = mixPose(a, P.raise, sm(side > 0 ? s.armR : s.armL));
  if (side > 0) {
    const free = 1 - clamp(Math.max(s.armR, s.point, s.wave));
    if (P.thumb) a = mixPose(a, P.thumb, (s.state === 'aha' ? sm(s.stateK) : 0) * sm(free));
    const think = s.state === 'think' ? sm(s.stateK) : 0;
    a = mixPose(a, P.think, think * sm(clamp(s.armR / 0.45)));
    a = mixPose(a, P.point, sm(s.point));
    const w = sm(s.wave);
    if (w > 0 && P.wave) {
      const ph = Math.sin(s.t * 12), ph2 = Math.sin(s.t * 12 + 0.8), W0 = P.wave;
      a = mixPose(a, { ...W0, T: [W0.T[0] + 0.06 * ph, W0.T[1] + 0.015 * Math.abs(ph), W0.T[2]], f: rotZ(W0.f, -0.35 * ph2) }, w);
    }
  }
  const M = v => V3(side * v[0], v[1], v[2]);
  return { T: M(a.T), pole: M(a.pole), f: M(a.f), n: M(a.n), p: M(a.p), curl: a.curl, idx: a.idx, up: a.up };
}
/** the wand: lilac rod, darker grip, glowing ball tip (built along +y from the butt) */
function makeWand(len, M) {
  const g = new THREE.Group();
  const butt = new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 8), M.lilacDeep); g.add(butt);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.13, 16), M.lilacDeep); grip.position.y = 0.065; g.add(grip);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.02, 16), M.lilacDeep); collar.position.y = 0.14; g.add(collar);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.012, len, 12), M.lilac); rod.position.y = 0.15 + len / 2; g.add(rod);
  const tipMat = new THREE.MeshBasicMaterial({ color: '#f4eeff', toneMapped: false });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), tipMat); tip.position.y = 0.16 + len; g.add(tip);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texes().halo, color: '#c9a8ff', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.75 })); halo.scale.setScalar(0.17); halo.position.copy(tip.position); halo.renderOrder = 5; g.add(halo);
  return { group: g, tipMat, halo };
}
/** the translucent holo card with a little flow diagram (one plane) */
function makeHolo(w, h) {
  const tex = canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
    const r = 46;
    x.clearRect(0, 0, W, H);
    x.save(); x.shadowColor = 'rgba(205,170,255,.95)'; x.shadowBlur = 24;
    x.beginPath(); x.roundRect(18, 18, W - 36, H - 36, r); x.fillStyle = 'rgba(243,236,255,.8)'; x.fill(); x.restore();
    x.lineWidth = 5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect(18, 18, W - 36, H - 36, r); x.stroke();
    const box = (bx, by, s, fill, stroke) => { x.beginPath(); x.roundRect(bx, by, s, s, 16); x.fillStyle = fill; x.fill(); x.lineWidth = 4; x.strokeStyle = stroke; x.stroke(); };
    const s = H * 0.27;
    box(60, H * 0.17, s, '#d9c8ff', '#b79cf0'); box(60, H * 0.56, s, '#f8cfe2', '#e9a4c6');
    x.strokeStyle = '#a58ad8'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(60 + s, H * 0.17 + s / 2); x.lineTo(60 + s + 40, H * 0.17 + s / 2); x.lineTo(60 + s + 40, H * 0.56 + s / 2); x.lineTo(60 + s, H * 0.56 + s / 2); x.stroke();
    x.beginPath(); x.moveTo(60 + s + 40, H * 0.5); x.lineTo(W * 0.62, H * 0.5); x.stroke();
    x.beginPath(); x.moveTo(W * 0.62 - 18, H * 0.5 - 16); x.lineTo(W * 0.62, H * 0.5); x.lineTo(W * 0.62 - 18, H * 0.5 + 16); x.stroke();
    const cs = H * 0.42; x.beginPath(); x.roundRect(W * 0.66, H * 0.5 - cs / 2, cs, cs, 20); x.fillStyle = '#7a619c'; x.fill();
    x.strokeStyle = '#ffffff'; x.lineWidth = 12; x.beginPath(); x.moveTo(W * 0.66 + cs * 0.24, H * 0.5 + cs * 0.02); x.lineTo(W * 0.66 + cs * 0.43, H * 0.5 + cs * 0.2); x.lineTo(W * 0.66 + cs * 0.77, H * 0.5 - cs * 0.2); x.stroke();
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.renderOrder = 9;
  return { mesh: m, mat };
}
/** a little notebook (student) */
function makeNotebook(w, h, M) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(superGeo(w / 2, h / 2, 0.008, 0.2, { ws: 12, hs: 8 }), M.peach); back.position.z = -0.024; g.add(back);
  const pages = new THREE.Mesh(superGeo(w / 2 - 0.008, h / 2 - 0.012, 0.019, 0.16, { ws: 12, hs: 8 }), vinyl('#fffaf2', { r: 0.5 })); pages.position.x = 0.006; g.add(pages);
  const front = new THREE.Mesh(superGeo(w / 2, h / 2, 0.008, 0.2, { ws: 12, hs: 8 }), M.peach); front.position.z = 0.024; g.add(front);
  const band = new THREE.Mesh(superGeo(0.014, h / 2 + 0.004, 0.034, 0.3, { ws: 8, hs: 8 }), M.sun); band.position.x = w * 0.3; g.add(band);
  const st = new THREE.Mesh(sparkleGeo(0.04, 0.034, 0.036, 0.008, { NA: 32, NR: 3 }), M.sun); st.position.set(-0.02, 0.02, 0.034); g.add(st);
  return g;
}

// ---------- shared figure: one-piece shell + visor + bezel + feet + arms ----------
function makeFigure(cfg, M) {
  const { R, yb, outline } = cfg;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.add(makeShadow(cfg.shadow[0], cfg.shadow[1]));
  const shell = new THREE.Group(); body.add(shell);
  shell.add(new THREE.Mesh(superGeo(R.rx, R.ry, R.rz, R.e, { ws: (cfg.shellSeg || [48])[0], hs: (cfg.shellSeg || [0, 34])[1], taper: R.taper }), M.pearl));
  // visor glass (front patch with the LED face) + raised bezel
  const face = makeLedFace({ ...cfg.face, outline });
  const pl = cfg.face.planar;
  const visor = new THREE.Mesh(superGeo(R.rx, R.ry, R.rz, R.e, { ws: 28, hs: 18, taper: R.taper, offset: 0.005, planar: pl, ...cfg.visorPatch }), face.mat);
  visor.renderOrder = 2; shell.add(visor);
  shell.add(new THREE.Mesh(bezelGeo(R, outline, cfg.bezel[0], cfg.bezel[1], cfg.bezel[2] || 0), cfg.bezelMat));
  // belly slot
  const slot = new THREE.Group();
  { const o = onSurf(R, 0, cfg.slot.y); slot.position.copy(o.p); slot.quaternion.setFromUnitVectors(Z_AX, o.n); shell.add(slot); }
  const sw = cfg.slot.w, shh = cfg.slot.h;
  const slotRim = new THREE.Mesh(superGeo(sw / 2 + 0.014, shh / 2 + 0.012, 0.016, 0.3, { ws: 24, hs: 10 }), cfg.slotRimMat); slot.add(slotRim);
  const slotMat = new THREE.MeshBasicMaterial({ color: cfg.slot.col, toneMapped: false });
  const slotCore = new THREE.Mesh(superGeo(sw / 2, shh / 2, 0.012, 0.3, { ws: 24, hs: 10 }), slotMat); slotCore.position.z = 0.008; slot.add(slotCore);
  const slotGlow = makeGlow(shh * 0.7, false); slotGlow.group.position.z = 0.03; slotGlow.group.scale.set(2.2, 1, 1); slot.add(slotGlow.group);
  // feet: short stubby buns with thick soles
  const F = cfg.feet;
  const feet = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * F.x, 0, F.z); g.rotation.y = sx * F.out; body.add(g);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(F.rx * 0.55, F.rx * 0.62, 0.16, 20), M.pearl); leg.position.y = F.sole + F.ry + 0.04; g.add(leg);
    const foot = new THREE.Mesh(superGeo(F.rx, F.ry, F.rz, 0.78, { ws: 20, hs: 11, taper: 0.18 }), M.pearl); foot.position.set(0, F.sole + F.ry * 0.62, F.rz * 0.22); g.add(foot);
    const sole = new THREE.Mesh(superGeo(F.rx * 1.03, F.sole / 2 + 0.006, F.rz * 1.03, 0.42, { ws: 22, hs: 6 }), cfg.soleMat); sole.position.set(0, F.sole / 2, F.rz * 0.22); g.add(sole);
    return g;
  });
  const marks = makeMarks(cfg.markCol, COL.tick);
  marks.q.position.set(cfg.marks[0], cfg.marks[1], 0.15); marks.q.userData.y = cfg.marks[1];
  marks.b.position.set(cfg.marks[0] + 0.03, cfg.marks[1] - 0.05, 0.15); body.add(marks.q, marks.b);
  const col = new THREE.Color(), idleCol = new THREE.Color(cfg.lightIdle), slotCol = new THREE.Color(), slotIdle = new THREE.Color(cfg.slot.col);
  return {
    root, body, shell, face, feet, col, slotMat, slotGlow, marks,
    /** shared part of pose(): body, squash, look, face, state colour; returns the squash factor */
    set(s) {
      const t = s.t, hop = clamp(s.hop);
      root.rotation.y = s.turn * 0.5;
      body.position.y = hop * cfg.lift; body.rotation.z = s.tilt * cfg.tiltK;
      const breath = Math.sin(t * 2.2 + cfg.seed) * 0.01, sq = s.squash * 0.3;
      const sy = 1 - sq + breath;
      shell.scale.set(1 + sq * 0.5 - breath * 0.3, sy, 1 + sq * 0.5 - breath * 0.3);
      shell.position.y = yb + R.ry * sy;
      shell.rotation.set(-s.lookY * 0.06 + (s.state === 'think' ? -0.03 * sm(s.stateK) : 0), s.lookX * 0.13, (s.state === 'doubt' ? 0.05 * sm(s.stateK) : 0));
      face.draw(s);
      stateColor(s, col, idleCol); const lv = stateLevel(s);
      stateColor(s, slotCol, slotIdle);
      slotMat.color.copy(slotCol).multiplyScalar(0.8 + 0.4 * lv);
      slotGlow.set(s, slotCol, lv, 1); slotGlow.halo.material.opacity = Math.max(slotGlow.halo.material.opacity, 0.32 * lv);
      marks.set(s, cfg.markSize);
      feet.forEach((g, i) => { g.rotation.x = hop * (i ? 0.3 : -0.18); });
      return { sy, hop, lv };
    },
  };
}

function mats() {
  return {
    pearl: vinyl(COL.pearl, { r: 0.34, cc: 0.8, cr: 0.14 }),
    lilac: vinyl(COL.lilac, { r: 0.34, cc: 0.7, cr: 0.16 }),
    lilacDeep: vinyl(COL.lilacDeep, { r: 0.32, cc: 0.8, cr: 0.12 }),
    pink: vinyl(COL.pink, { r: 0.34, cc: 0.7, cr: 0.16 }),
    sun: vinyl(COL.sun, { r: 0.32, cc: 0.8, cr: 0.12 }),
    sunDeep: vinyl(COL.sunDeep, { r: 0.32, cc: 0.8, cr: 0.12 }),
    peach: vinyl(COL.peach, { r: 0.34, cc: 0.7, cr: 0.16 }),
  };
}

// ---------- teacher Nova ----------
const SWS = 0.4, LBS = 2.9;   // pink inset offsets (towards the front edge)
function makeTeacher(rng) {
  const M = mats();
  const R = { rx: 0.6, ry: 0.5, rz: 0.52, e: 0.82, taper: 0.27 }, yb = 0.13;
  // visor outline (local to the shell centre): the top edge slopes down to the left, small round left end, tall right end
  const VS = 1.14, vpt = ([x, y]) => [x * VS - (x < 0 ? 0.02 : 0), 0.125 + (y - 0.115) * VS];
  const outline = outlinePts([[0.29, 0.355], [0.375, 0.29], [0.4, 0.13], [0.375, -0.03], [0.29, -0.105], [0.08, -0.125], [-0.14, -0.115], [-0.3, -0.07], [-0.385, 0.03], [-0.37, 0.14], [-0.28, 0.205], [-0.1, 0.27], [0.12, 0.33]].map(vpt));
  const planar = { cx: -0.005, cy: 0.125, w: 0.98, h: 0.6 };
  const F = makeFigure({
    R, yb, outline, shadow: [1.7, 1.25], lift: 0.5, tiltK: 0.18, seed: 11,
    face: { planar, ppu: 1000, style: 'smug', eyes: [{ x: -0.185, y: 0.085 }, { x: 0.205, y: 0.1 }], ew: 0.06, eh: 0.073, mouth: { x: 0.045, y: -0.04, w: 0.14, h: 0.11 }, idleOpen: 0 },
    visorPatch: { phiStart: Math.PI / 2 - 1.3, phiLength: 2.6, thetaStart: 0.4, thetaLength: 1.4 },
    bezel: [0.034, 0.024, 0.004], bezelMat: M.lilac,
    slot: { y: -0.3, w: 0.19, h: 0.05, col: COL.slot }, slotRimMat: M.lilac,
    feet: { x: 0.31, z: 0.07, out: 0.24, rx: 0.17, ry: 0.088, rz: 0.2, sole: 0.045 }, soleMat: M.lilacDeep,
    markCol: COL.magenta, marks: [0.74, 1.12], markSize: 0.3, lightIdle: COL.magenta,
  }, M);
  const { body, shell } = F;
  // knob + magenta sparkle star (the state light)
  const top = R.ry - 0.004;
  const knob = new THREE.Mesh(lathe([[0, 0], [0.085, 0], [0.083, 0.012], [0.07, 0.03], [0.045, 0.043], [0.02, 0.048], [0, 0.049]], 28), M.pearl); knob.position.y = top - 0.008; shell.add(knob);
  const cap = new THREE.Mesh(lathe([[0, 0], [0.034, 0], [0.033, 0.012], [0.026, 0.026], [0.012, 0.033], [0, 0.034]], 24), M.lilac); cap.position.y = top + 0.036; shell.add(cap);
  const starG = new THREE.Group(); starG.position.y = top + 0.062; shell.add(starG);
  const starMat = glossy(COL.magenta, { r: 0.22, extra: { emissive: COL.magenta, emissiveIntensity: 0.05 } });
  const star = new THREE.Mesh(sparkleGeo(0.115, 0.095, 0.095, 0.04, { p: 3.3, bc: 0.07 }), starMat); star.position.y = 0.085; starG.add(star);
  const glow = makeGlow(0.07); glow.group.position.y = 0.085; starG.add(glow.group);
  // the lilac + pink swoosh over the upper left of the head
  const sw = [[11, 82], [23, 44], [39, 21], [55, 9], [69, 3]].map(([th, ph]) => surfAng(R, th, ph));
  const swW = u => 0.14 * (0.1 + 0.9 * Math.pow(u, 0.7)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (u - 0.66) / 0.34), 2)));
  const swT = u => 0.066 * (0.25 + 0.75 * u * u) * clamp(swW(u) / 0.02, 0.15, 1);
  shell.add(new THREE.Mesh(surfPanel(R, sw, swW, swT, { N: 26 }), M.lilac));
  shell.add(new THREE.Mesh(surfPanel(R, sw, u => swW(u) * 0.3, u => swT(u) + 0.02, { N: 26, M: 7, shift: -2.25 }), M.lilac));
  shell.add(new THREE.Mesh(surfPanel(R, sw, u => swW(u) * 0.66, u => swT(u) + 0.006, { N: 26, shift: SWS }), M.pink));
  // the lilac + pink bands on the lower left of the body
  const lb = [[106, -4], [125, 0], [144, 8], [161, 26]].map(([th, ph]) => surfAng(R, th, ph));
  const lbW = u => 0.27 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 4))) * (0.6 + 0.4 * Math.sin(Math.PI * u));
  shell.add(new THREE.Mesh(surfPanel(R, lb, lbW, u => 0.012, { N: 22, M: 11 }), M.lilac));
  shell.add(new THREE.Mesh(surfPanel(R, lb, u => lbW(u) * 0.24, u => 0.018, { N: 22, M: 6, shift: LBS }), M.pink));
  // arms: white, lilac cuff, white glove hands
  const armO = { a: 0.14, b: 0.15, r: 0.06, hr: 0.094, cuffAt: 0.1, mat: M.pearl, cuff: M.lilac, handMat: vinyl('#fbf6f6', { r: 0.4, cc: 0.6, cr: 0.2 }) };
  const arms = [-1, 1].map(sx => { const a = makeArm(sx, armO); body.add(a.group); return a; });
  const SH = [0.54, 0.52, 0.1];
  const wand = makeWand(0.3, M); body.add(wand.group);
  const holo = makeHolo(0.42, 0.26); body.add(holo.mesh);
  const ARMS = {
    [-1]: {   // the wand arm (viewer's left), written mirrored
      rest: { T: [0.72, 0.52, 0.26], pole: [0.6, -0.3, -1], f: [0, -0.15, 1], n: [0, 0, 1], p: [0.62, 1, 0.12], curl: 1 },
      raise: { T: [0.66, 0.92, 0.14], pole: [1, -0.4, -0.2], f: [0, -0.1, 1], n: [0, 0, 1], p: [0.3, 1, 0.1], curl: 1 },
    },
    [1]: {    // the free hand (viewer's right): points with the index finger, waves, thinks, thumbs-up on aha
      rest: { T: [0.71, 0.38, 0.2], pole: [0.6, 0, -1], f: [0.12, -1, 0.3], n: [-1, 0, 0.25], curl: 0.42 },
      raise: { T: [0.66, 0.95, 0.12], pole: [1, -0.4, -0.2], f: [0.1, 1, 0.05], n: [0, 0, 1], curl: 0.12 },
      point: { T: [0.76, 0.68, 0.24], pole: [0.2, -1, -0.5], f: [0.72, 0.68, 0.12], n: [-0.1, -0.35, 1], curl: 1, idx: 0 },
      wave: { T: [0.74, 0.88, 0.22], pole: [1, -1, 0], f: [0.12, 1, 0.05], n: [0, 0, 1], curl: 0.06 },
      think: { T: [0.56, 0.6, 0.4], pole: [0.6, -1, 0], f: [-0.45, 1, 0.1], n: [-0.2, 0, -1], curl: 0.7, idx: 0.35 },
      thumb: { T: [0.7, 0.62, 0.3], pole: [0.6, -0.6, -0.6], f: [0.15, -0.05, 1], n: [-1, 0, 0], curl: 1, idx: 1, up: 1 },
    },
  };
  const height = yb + R.ry + top + 0.062 + 0.085 + 0.115;   // star tip
  const col = F.col;
  return {
    root: F.root, height, classroomScale: 0.58,   // wider than tall, and the wand hand reaches outward: sized so the studio frame keeps a margin on that side
    pose(s) {
      s = { ...DEF, ...s };
      const { sy, lv } = F.set(s);
      const t = s.t, k = sm(s.stateK), kT = s.state === 'think' ? k : 0, kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0;
      // star: idle sway; think = slow turn; aha = pop + spin; doubt = tilt and wobble
      starG.rotation.set(0, kT * 0.6 * Math.sin(t * 2.5) + kA * (t * 6), 0.05 * Math.sin(t * 1.7) + kD * (0.35 + 0.08 * Math.sin(t * 7)));
      star.scale.setScalar(1 + kA * (0.18 + 0.06 * Math.sin(t * 11)) + kT * 0.05 * Math.sin(t * 8));
      starMat.color.set(COL.magenta).lerp(col, s.state === 'idle' ? 0 : 0.85 * k);
      starMat.emissive.copy(col); starMat.emissiveIntensity = 0.06 + (s.state === 'idle' ? 0 : 0.75 * k * lv);
      glow.set(s, col, lv);
      arms.forEach((a, i) => {
        const side = i ? 1 : -1, P = armPose(s, side, ARMS[side]);
        a.set(V3(side * SH[0], SH[1] * (0.6 + 0.4 * sy), SH[2]), P, side < 0);
        if (side < 0) {   // the wand sits in the fist
          _a.set(0, -armO.hr * 1.2, armO.hr * 0.42).applyQuaternion(a.q).add(a.W);
          _b.copy(P.p).normalize(); wand.group.quaternion.setFromUnitVectors(Y_UP, _b); wand.group.position.copy(_a).addScaledVector(_b, -0.075);
        } else {
          // the holo card floats above-right of the pointing finger
          const kp = sm(clamp((s.point - 0.6) / 0.4));
          holo.mat.opacity = kp * 0.95; holo.mesh.visible = kp > 0.01;
          holo.mesh.position.set(a.W.x + 0.2, a.W.y + 0.36 + 0.015 * Math.sin(t * 2), a.W.z - 0.05);
          holo.mesh.rotation.set(0, -s.turn * 0.35 - 0.1, 0.02);
          holo.mesh.scale.setScalar(0.85 + 0.15 * kp);
        }
      });
      wand.halo.material.opacity = 0.65 + 0.15 * Math.sin(t * 3);
    },
  };
}

// ---------- student: rounder and smaller, sunny yellow + peach, two bud lights on top, notebook ----------
function makeStudent(rng) {
  const M = mats();
  const R = { rx: 0.5, ry: 0.47, rz: 0.47, e: 0.92, taper: 0.1 }, yb = 0.12;
  const outline = outlinePts([[0.3, 0.3], [0.37, 0.24], [0.385, 0.1], [0.36, -0.04], [0.26, -0.115], [0, -0.13], [-0.26, -0.115], [-0.36, -0.04], [-0.385, 0.1], [-0.37, 0.24], [-0.3, 0.3], [0, 0.325]]);
  const planar = { cx: 0, cy: 0.1, w: 0.84, h: 0.52 };
  const F = makeFigure({
    shellSeg: [44, 30], R, yb, outline, shadow: [1.55, 1.15], lift: 0.55, tiltK: 0.26, seed: 23,
    face: { planar, ppu: 1000, style: 'cute', eyes: [{ x: -0.15, y: 0.1 }, { x: 0.15, y: 0.1 }], ew: 0.06, eh: 0.072, mouth: { x: 0, y: -0.035, w: 0.1, h: 0.075 }, idleOpen: 0.35,
      mouthCol: COL.warm, mouthCore: COL.warmCore },
    visorPatch: { phiStart: Math.PI / 2 - 1.2, phiLength: 2.4, thetaStart: 0.6, thetaLength: 1.3 },
    bezel: [0.03, 0.022, 0.004], bezelMat: M.sun,
    slot: { y: -0.26, w: 0.12, h: 0.042, col: COL.bud }, slotRimMat: M.sun,
    feet: { x: 0.24, z: 0.05, out: 0.2, rx: 0.13, ry: 0.068, rz: 0.16, sole: 0.036 }, soleMat: M.sunDeep,
    markCol: COL.sunDeep, marks: [0.66, 1.0], markSize: 0.28, lightIdle: COL.bud,
  }, M);
  const { body, shell } = F;
  // two little bud lights on short stems (the state light)
  const top = R.ry;
  const buds = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.1, top - 0.03, 0); g.rotation.z = -sx * 0.42; shell.add(g);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.11, 12), M.pearl); stem.position.y = 0.055; g.add(stem);
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 10), M.sun); base.scale.y = 0.6; g.add(base);
    const mat = glossy(COL.bud, { r: 0.18, extra: { emissive: COL.bud, emissiveIntensity: 0.25 } });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), mat); ball.position.y = 0.14; g.add(ball);
    const glow = makeGlow(0.034); glow.group.position.y = 0.14; g.add(glow.group);
    return { g, mat, glow, ball };
  });
  // two short sunny fins on the upper sides (the teacher's swoosh, made symmetric and small: they read as pigtails)
  [-1, 1].forEach(sx => {
    const ph0 = sx < 0 ? 0 : 180, d = sx < 0 ? 1 : -1;
    const pts = [[22, ph0 + d * 62], [36, ph0 + d * 30], [52, ph0 + d * 12], [66, ph0 + d * 4]].map(([th, ph]) => surfAng(R, th, ph));
    const fw = u => 0.075 * (0.15 + 0.85 * Math.pow(u, 0.7)) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (u - 0.62) / 0.38), 2)));
    const ft = u => 0.05 * (0.3 + 0.7 * u * u);
    shell.add(new THREE.Mesh(surfPanel(R, pts, fw, ft, { N: 18, M: 7 }), M.sun));
    shell.add(new THREE.Mesh(surfPanel(R, pts, u => fw(u) * 0.6, u => ft(u) + 0.006, { N: 18, M: 6, shift: 0.42 * d * -1 }), M.peach));
  });
  const armO = { a: 0.12, b: 0.12, r: 0.046, hr: 0.07, cuffAt: 0.12, mat: M.pearl, cuff: M.sun, handMat: vinyl('#fbf6f6', { r: 0.4, cc: 0.6, cr: 0.2 }) };
  const arms = [-1, 1].map(sx => { const a = makeArm(sx, armO); body.add(a.group); return a; });
  const SH = [0.44, 0.5, 0.1];
  const book = makeNotebook(0.24, 0.3, M); body.add(book);
  const ARMS = {
    [-1]: {   // the notebook arm (viewer's left), mirrored
      rest: { T: [0.46, 0.34, 0.4], pole: [1, -0.6, -0.2], f: [-0.3, 0.8, 0.2], n: [0, 0, -1], curl: 0.55 },
      raise: { T: [0.56, 0.8, 0.12], pole: [1, -0.4, -0.2], f: [-0.3, 1, 0], n: [0, 0, 1], curl: 0.55 },
    },
    [1]: {
      rest: { T: [0.6, 0.32, 0.2], pole: [0.6, 0, -1], f: [0.12, -1, 0.3], n: [-1, 0, 0.25], curl: 0.42 },
      raise: { T: [0.58, 0.82, 0.12], pole: [1, -0.4, -0.2], f: [0.1, 1, 0.05], n: [0, 0, 1], curl: 0.1 },
      point: { T: [0.68, 0.56, 0.24], pole: [0.2, -1, -0.5], f: [0.85, 0.4, 0.15], n: [-0.1, -0.35, 1], curl: 1, idx: 0 },
      wave: { T: [0.64, 0.76, 0.22], pole: [1, -1, 0], f: [0.12, 1, 0.05], n: [0, 0, 1], curl: 0.06 },
      think: { T: [0.48, 0.52, 0.38], pole: [0.6, -1, 0], f: [-0.45, 1, 0.1], n: [-0.2, 0, -1], curl: 0.7, idx: 0.35 },
    },
  };
  const BOOK_E = new THREE.Euler(-0.08, 0.32, 0.12, 'YXZ'), BOOK_O = V3(0.1, 0.06, 0.06);
  const height = yb + 2 * R.ry - 0.03 + 0.14 * Math.cos(0.42) + 0.067;   // bud tips (they sway a little)
  const col = F.col;
  return {
    root: F.root, height, classroomScale: 0.76,   // stays smaller than the teacher above
    pose(s) {
      s = { ...DEF, ...s };
      const { sy, lv } = F.set(s);
      const t = s.t, k = sm(s.stateK), kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0, kT = s.state === 'think' ? k : 0;
      buds.forEach((b, i) => {
        const side = i ? 1 : -1;
        b.g.rotation.z = -side * (0.42 + 0.06 * Math.sin(t * 3 + i) + kA * 0.18) + kD * 0.25 * (i ? 1 : 0.4);
        b.g.rotation.x = kT * 0.15 * Math.sin(t * 4 + i * 2);
        b.mat.color.set(COL.bud).lerp(col, s.state === 'idle' ? 0 : 0.85 * k);
        b.mat.emissive.copy(col); b.mat.emissiveIntensity = 0.22 + 0.6 * lv * (s.state === 'idle' ? 0.4 : 1);
        b.ball.scale.setScalar(1 + kA * 0.15 * Math.abs(Math.sin(t * 9 + i)));
        b.glow.set(s, col, lv, 0.8);
      });
      arms.forEach((a, i) => {
        const side = i ? 1 : -1, P = armPose(s, side, ARMS[side]);
        a.set(V3(side * SH[0], SH[1] * (0.6 + 0.4 * sy), SH[2]), P, false);
        if (side < 0) { book.position.copy(a.W).add(BOOK_O); book.quaternion.setFromEuler(BOOK_E); }
      });
    },
  };
}

// ---------- embodiment: a tiny magenta sparkle-star drone with a little visor; the side points are its arms ----------
function makeSpark(rng) {
  const M = mats();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = makeShadow(0.8, 0.5); root.add(shadow);
  const starMat = glossy(COL.magenta, { r: 0.22, extra: { emissive: COL.magenta, emissiveIntensity: 0.05 } });
  // the vertical spine (top + bottom points) and two side points that move like arms
  const spine = new THREE.Mesh(sparkleGeo(0.38, 0.17, 0.32, 0.12, { p: 2.5, bc: 0.2, NA: 48, NR: 5 }), starMat); body.add(spine);
  const armPts = [-1, 1].map(sx => {
    const piv = new THREE.Group(); piv.position.set(sx * 0.1, 0, 0); body.add(piv);
    const g = sparkleGeo(0.09, 0.26, 0.09, 0.095, { p: 2.5, bc: 0.2, NA: 40, NR: 4 });
    const m = new THREE.Mesh(g, starMat); m.position.x = sx * 0.06; m.scale.x = 1; piv.add(m);
    return piv;
  });
  // round pearl face disc with a little visor + lilac bezel
  const fd = new THREE.Group(); fd.position.z = 0.07; body.add(fd);
  const FR = { rx: 0.17, ry: 0.15, rz: 0.1, e: 1, taper: 0 };
  fd.add(new THREE.Mesh(superGeo(FR.rx, FR.ry, FR.rz, 1, { ws: 28, hs: 16 }), M.pearl));
  const outline = outlinePts([[0.11, 0.07], [0.13, 0.0], [0.105, -0.06], [0, -0.075], [-0.105, -0.06], [-0.13, 0.0], [-0.11, 0.07], [0, 0.085]], 64);
  const planar = { cx: 0, cy: 0.005, w: 0.3, h: 0.2 };
  const face = makeLedFace({ outline, planar, ppu: 1500, style: 'cute', eyes: [{ x: -0.055, y: 0.012 }, { x: 0.055, y: 0.012 }], ew: 0.024, eh: 0.03, mouth: { x: 0, y: -0.04, w: 0.04, h: 0.03 }, idleOpen: 0.2 });
  const visor = new THREE.Mesh(superGeo(FR.rx, FR.ry, FR.rz, 1, { ws: 22, hs: 14, offset: 0.003, planar, phiStart: Math.PI / 2 - 1.2, phiLength: 2.4, thetaStart: 0.6, thetaLength: 1.9 }), face.mat); visor.renderOrder = 2; fd.add(visor);
  const ringMat = vinyl(COL.lilac, { r: 0.3, extra: { emissive: COL.lilac, emissiveIntensity: 0 } });
  fd.add(new THREE.Mesh(bezelGeo(FR, outline, 0.014, 0.012, 0.002), ringMat));
  const glow = makeGlow(0.1); glow.group.position.z = -0.05; body.add(glow.group);
  const marks = makeMarks(COL.magenta, COL.tick); marks.q.position.set(0.36, 0.42, 0.1); marks.q.userData.y = 0.42; marks.b.position.set(0.38, 0.36, 0.1); body.add(marks.q, marks.b);
  const CY = 0.5, col = new THREE.Color(), idleCol = new THREE.Color(COL.magenta);
  return {
    root, height: CY + 0.38, classroomScale: 1,
    pose(s) {
      s = { ...DEF, ...s };
      const t = s.t, k = sm(s.stateK), kT = s.state === 'think' ? k : 0, kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0;
      const bob = 0.03 * Math.sin(t * 2.6), h = clamp(s.hop) * 0.3;
      root.rotation.y = s.turn * 0.5;
      body.position.y = CY + bob + h;
      const sq = s.squash * 0.25; body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
      body.rotation.set(-s.lookY * 0.15, s.lookX * 0.35 + kA * Math.sin(t * 8) * 0.25, s.tilt * 0.35 + 0.06 * Math.sin(t * 1.9) + kD * (0.3 + 0.06 * Math.sin(t * 6)));
      // side points = arms: raise / wave / point
      armPts.forEach((p, i) => {
        const side = i ? 1 : -1, raise = side > 0 ? s.armR : s.armL;
        let a = 0.18 * Math.sin(t * 2.6 + i) * 0.4 + raise * 0.9;
        if (side > 0) { a = lerp(a, 0.25, sm(s.point)); a = lerp(a, 0.9 + 0.35 * Math.sin(t * 13), sm(s.wave)); a += kA * 0.5; }
        else a += kA * 0.5;
        p.rotation.z = side * a; p.rotation.y = side > 0 ? -sm(s.point) * 0.3 : 0;
      });
      face.draw(s);
      stateColor(s, col, idleCol); const lv = stateLevel(s);
      starMat.emissiveIntensity = 0.05 + (s.state === 'idle' ? 0 : 0.12 * k * lv);
      ringMat.color.set(COL.lilac).lerp(col, s.state === 'idle' ? 0 : k); ringMat.emissive.copy(col); ringMat.emissiveIntensity = s.state === 'idle' ? 0 : 0.9 * k * lv;
      glow.set(s, col, lv, 0.9);
      marks.set(s, 0.24);
      shadow.scale.setScalar(1 - h * 0.8 - bob); shadow.material.opacity = clamp(1 - h * 1.2);
    },
  };
}

export async function create(env, opts = {}) {
  const rng = env.rng;
  return { teacher: makeTeacher(rng), student: makeStudent(rng), embodiment: makeSpark(rng) };
}
