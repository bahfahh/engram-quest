// 1g Book-page spirit (built to match its design image; v3).
// Teacher: a deep-blue book-page spirit. A pointed hood wraps a warm glowing face like layered pages (amber almond eyes,
//        dark lash lines, thin brows, a small smile, an occasional twinkle), teal lining, gold piping, felt cloth with gold
//        dust; on each side a page layer folded back to show the teal lining; an A-line robe with a pointed, gold-edged hem;
//        a teal sash; a soft light through the chest = the state light; bell sleeves, glowing hands; pointing = an open palm
//        offered upward to the right. A few small motes of light float around.
//        Temperament (like Dumbledore inside): knows a lot without rushing to show it, patient, unhurried, now and then
//        humorous, shown through eyes, expression and movement.
// Embodiment: a white-and-gold porcelain tutor-bot (the design's other figure): dome head, navy visor with a thin gold
//        rim, warm gold LED eyes, a sage scarf, a gem on the chest, a matte-gold base.
// Student: a round little white porcelain bot in an apricot knit cap (the pompom = the state light), holding a notebook.
// States: the teacher's chest light, the embodiment's gem, the student's pompom: warm gold at rest, think = blue,
//        aha = green (the teacher laughs with eyes closed), doubt = orange-red + "?".
import * as THREE from 'three';

export const meta = {
  id: 'porcelain', no: '1g', name: '書頁精靈', kind: '3d',
  note: 'The light through the teacher chest, the gem on the embodiment chest and the pompom on the student cap are the state lights: warm gold at rest; think = blue pulse, the teacher with a finger to the chin and eyes up; aha = green burst, the teacher laughing with eyes closed and a hand on the chest, the motes brightening; doubt = orange-red flicker, one brow raised and a "?". Now and then a twinkle in the teacher eyes',
};

const COL = {
  porcelain: '#f3eee6', gold: '#d3ae66', goldDeep: '#a9843f', sage: '#8aa486', sageDeep: '#6b876a',
  led: '#ffc56a', ledCore: '#fff3d8', ledMouth: '#ffb85a', ledMouthCore: '#fff0d0',
  navy: '#1f3561', blue: '#2b4c86', teal: '#5d9c97', tealDeep: '#3f7a77', cream: '#fff1d4', page: '#fbf4e6',
  apricot: '#ec955a', apricotDeep: '#c9733a', peach: '#ffc29a', sun: '#f2b25c', warm: '#ffcf7d', warmCore: '#fff4e0',
  // aliases the shared helpers read
  pearl: '#f3eee6', tick: '#e8b84f', cyan: '#ffc56a', cyanCore: '#fff3d8', mouth: '#ffb85a', mouthCore: '#fff0d0',
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
    const amb = x.createRadialGradient(ccx, ccy, 0, ccx, ccy, W * 0.5); amb.addColorStop(0, cfg.amb || 'rgba(70,170,255,.10)'); amb.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = amb; x.fillRect(0, 0, W, H);
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
function makeHand(r, mat, side, slim = 1) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(superGeo(r * 0.98, r * 0.86, r * 0.66, 0.7, { ws: 16, hs: 10 }), mat); palm.position.y = -r * 0.8; g.add(palm);
  const fingers = [0.6, 0, -0.6].map((fx, i) => {
    const base = new THREE.Group(); base.position.set(side * fx * r, -r * 1.42, r * 0.05); g.add(base);
    const fr = r * (i === 2 ? 0.31 : 0.34) * slim, l1 = r * 0.42 / Math.sqrt(slim), l2 = r * (i === 0 ? 0.5 : 0.4) / Math.sqrt(slim);
    const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(fr, l1, 3, 8), mat); p1.position.y = -l1 / 2; base.add(p1);
    const j = new THREE.Group(); j.position.y = -l1; base.add(j);
    const p2 = new THREE.Mesh(new THREE.CapsuleGeometry(fr * 0.97, l2, 3, 8), mat); p2.position.y = -l2 / 2; j.add(p2);
    return { base, j };
  });
  const tb = new THREE.Group(); tb.position.set(side * r * 0.74, -r * 0.6, r * 0.24); g.add(tb);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.34 * slim, r * 0.52, 3, 8), mat); t1.position.y = -r * 0.36; tb.add(t1);
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
  const hand = makeHand(o.hr, o.handMat, side, o.slim || 1);
  g.add(sh, up, el, fo, cuff, glove, hand.group);
  const E = V3(), W = V3(), fd = V3();
  return {
    group: g, hand, W, E, q: hand.group.quaternion,
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
  const porcelain = new THREE.MeshPhysicalMaterial({ color: COL.porcelain, roughness: 0.24, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.1 });
  return {
    porcelain, pearl: porcelain,
    gold: new THREE.MeshPhysicalMaterial({ color: COL.gold, metalness: 0.85, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 1.35 }),
    sage: vinyl(COL.sage, { r: 0.64, cc: 0.12, cr: 0.5, env: 0.8 }),
    sageDeep: vinyl(COL.sageDeep, { r: 0.64, cc: 0.12, cr: 0.5, env: 0.8 }),
    blue: vinyl(COL.blue, { r: 0.5, cc: 0.35, cr: 0.35 }),
    navy: vinyl(COL.navy, { r: 0.45, cc: 0.4, cr: 0.3 }),
    teal: vinyl(COL.teal, { r: 0.55, cc: 0.2, cr: 0.4, extra: { side: THREE.DoubleSide } }),
    apricot: vinyl(COL.apricot, { r: 0.72, cc: 0.08, cr: 0.5, env: 0.8 }),
    apricotDeep: vinyl(COL.apricotDeep, { r: 0.6, cc: 0.2, cr: 0.4 }),
    peach: vinyl(COL.peach, { r: 0.34, cc: 0.7, cr: 0.16 }),
    sun: vinyl(COL.sun, { r: 0.32, cc: 0.8, cr: 0.12 }),
  };
}

// ---------- the teacher's warm LED face: calm half-lidded almond eyes, thin brows, a small smile, an occasional twinkle ----------
function makeWiseFace(cfg) {
  const { outline, planar, ppu } = cfg;
  const W = Math.round(planar.w * ppu), H = Math.round(planar.h * ppu);
  const toPx = (x, y) => [(x - planar.cx + planar.w / 2) * ppu, (planar.cy + planar.h / 2 - y) * ppu];
  const shape = (x, grow = 0) => {
    x.beginPath();
    let cx = 0, cy = 0; outline.forEach(([ox, oy]) => { cx += ox; cy += oy; }); cx /= outline.length; cy /= outline.length;
    outline.forEach(([ox, oy], i) => { const d = Math.hypot(ox - cx, oy - cy) || 1, k = 1 + grow / (d * ppu); const [px, py] = toPx(cx + (ox - cx) * k, cy + (oy - cy) * k); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.closePath();
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.38, metalness: 0, specularIntensity: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.35, transparent: true, emissive: '#ffffff', emissiveIntensity: 1.5, envMapIntensity: 0.45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  mat.map = canvasTex(W, H, (x) => {
    x.clearRect(0, 0, W, H);
    shape(x, 6); const g = x.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#22305c'); g.addColorStop(0.45, '#111a3a'); g.addColorStop(1, '#070b20'); x.fillStyle = g; x.fill();
    x.save(); shape(x, 6); x.clip();
    const s = x.createLinearGradient(0, 0, W * 0.55, H * 0.9); s.addColorStop(0, 'rgba(230,236,255,.2)'); s.addColorStop(0.3, 'rgba(230,236,255,.06)'); s.addColorStop(0.5, 'rgba(230,236,255,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.restore();
  });
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H;
  const x = ec.getContext('2d', { willReadFrequently: true });
  const emTex = new THREE.CanvasTexture(ec); emTex.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap = emTex;
  const LED = COL.led, CORE = COL.ledCore, MC = COL.ledMouth, MCORE = COL.ledMouthCore, U = ppu;
  const glowFill = (alpha, blur, col, path, fill) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = col; path(); x.fill(); x.shadowBlur = 0;
    if (fill) { x.fillStyle = fill; path(); x.fill(); }
    x.restore();
  };
  const glowStroke = (alpha, blur, col, core, lw, path) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.lineCap = 'round'; x.lineJoin = 'round';
    x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; path(); x.stroke(); x.shadowBlur = 0;
    x.strokeStyle = core; x.globalAlpha = alpha * 0.85; x.lineWidth = lw * 0.5; path(); x.stroke();
    x.restore();
  };
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const r2 = i % 2 ? r * 0.26 : r, a = i * Math.PI / 4; x.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); } x.closePath(); x.fill(); };
  // per eye: lid = how far the upper lid comes down (0 open … 1 shut), droop = the lid's outer end lower (kind look),
  // smile = lower lid lifted in the middle (a smiling crescent), sz; brow [lift, arch, innerDown] in eh units
  const E = (lid, droop, smile, sz, brow) => ({ lid, droop, smile, sz, brow });
  const SETS = {
    I: { L: E(0.24, 0.1, 0.46, 1.06, [0.12, 0.3, -0.04]), R: E(0.24, 0.1, 0.46, 1.06, [0.12, 0.3, -0.04]) },
    T: { L: E(0.14, 0.08, 0.14, 1, [0.5, 0.32, -0.25]), R: E(0.2, 0.1, 0.14, 0.98, [0.32, 0.28, -0.12]) },
    A: { L: E(0.3, 0.1, 0.5, 1.04, [0.42, 0.36, -0.16]), R: E(0.3, 0.1, 0.5, 1.04, [0.42, 0.36, -0.16]) },
    D: { L: E(0.5, 0.06, 0.24, 0.96, [-0.12, 0.08, 0.14]), R: E(0.1, 0.02, 0.1, 1.05, [0.8, 0.48, -0.3]) },
  };
  const blend = (w, side) => {
    const o = E(0, 0, 0, 0, [0, 0, 0]);
    for (const k of ['I', 'T', 'A', 'D']) { const p = SETS[k][side], wk = w[k]; if (!wk) continue; for (const key of ['lid', 'droop', 'smile', 'sz']) o[key] += p[key] * wk; p.brow.forEach((v, j) => { o.brow[j] += v * wk; }); }
    return o;
  };
  function draw(s) {
    const k = sm(s.stateK || 0), st = s.state;
    const kT = st === 'think' ? k : 0, kA = st === 'aha' ? k : 0, kD = st === 'doubt' ? k : 0, kI = 1 - kT - kA - kD;
    const w = { I: kI, T: kT, A: kA, D: kD };
    const bl = clamp(s.blink);
    x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); shape(x); x.clip();
    const [ccx, ccy] = toPx((cfg.eyes[0].x + cfg.eyes[1].x) / 2, cfg.eyes[0].y);
    const amb = x.createRadialGradient(ccx, ccy, 0, ccx, ccy, W * 0.55); amb.addColorStop(0, 'rgba(255,190,100,.13)'); amb.addColorStop(1, 'rgba(255,190,100,0)'); x.fillStyle = amb; x.fillRect(0, 0, W, H);
    const lx = clamp(s.lookX + kT * 0.4, -1, 1), ly = clamp(s.lookY + kT * 0.55, -1, 1);
    const ew = cfg.ew * U, eh = cfg.eh * U, gx = lx * ew * 0.45, gy = -ly * eh * 0.4;
    // twinkle: a little star in the eye now and then (pure function of t)
    const ph = (s.t + 0.9) % 4.7, tw = ph < 0.55 ? Math.sin(ph / 0.55 * Math.PI) : 0;
    cfg.eyes.forEach((e, i) => {
      const outer = i ? 1 : -1, P = blend(w, i ? 'R' : 'L');
      let [cx, cy] = toPx(e.x, e.y); cx += gx * 0.55; cy += gy * 0.55;
      const rx = ew * P.sz, ry = eh * P.sz;
      const lid = lerp(P.lid, 1.04, bl);
      const top = dx => cy - ry * (1 - 2 * lid) - 0.32 * ry * (1 - lid) * Math.max(0, 1 - (dx / rx) * (dx / rx)) + P.droop * ry * (dx * outer / rx);
      const bot = dx => cy + ry - P.smile * ry * 1.25 * Math.max(0, 1 - (dx / rx) * (dx / rx));
      const wOpen = 1 - kA;
      if (wOpen > 0.01 && lid < 0.98) {
        x.save();
        x.beginPath();
        for (let j = 0; j <= 16; j++) { const dx = -rx * 1.25 + rx * 2.5 * j / 16; j ? x.lineTo(cx + dx, top(dx)) : x.moveTo(cx + dx, top(dx)); }
        for (let j = 16; j >= 0; j--) { const dx = -rx * 1.25 + rx * 2.5 * j / 16; x.lineTo(cx + dx, Math.max(top(dx), bot(dx))); }
        x.closePath(); x.clip();
        const path = () => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
        const g = x.createRadialGradient(cx - outer * rx * 0.2, cy, 0, cx, cy, rx * 1.15); g.addColorStop(0, '#fff0c8'); g.addColorStop(0.5, LED); g.addColorStop(1, LED);
        glowFill(wOpen, 24, LED, path, g);
        x.restore();
        const tk = tw * kI * (1 - bl);
        if (tk > 0.02) { x.save(); x.globalAlpha = tk; x.shadowColor = '#ffffff'; x.shadowBlur = 12; x.fillStyle = '#ffffff'; star(cx - outer * rx * 0.3, cy - ry * 0.05, eh * 0.62 * tk); x.restore(); }
      }
      // laughing: eyes shut into soft upward arcs
      if (kA > 0.01) glowStroke(kA, 20, LED, CORE, ew * 0.3, () => { x.beginPath(); x.moveTo(cx - rx * 0.95, cy + ry * 0.3); x.quadraticCurveTo(cx, cy - ry * 1.0, cx + rx * 0.95, cy + ry * 0.3); });
      // brow: thin, the outer end a little lower (kind), inner end per state
      const [lift, arch, innerDown] = P.brow;
      const by = cy - ry * 1.55 - lift * eh;
      const ox = cx + outer * rx * 1.05, oy = by + eh * 0.18, ix = cx - outer * rx * 0.8, iy = by + innerDown * eh;
      glowStroke(0.92, 14, LED, CORE, ew * 0.16, () => { x.beginPath(); x.moveTo(ox, oy); x.quadraticCurveTo((ox + ix) / 2, (oy + iy) / 2 - arch * eh * 2, ix, iy); });
    });
    // mouth
    const m = cfg.mouth; let [mx, my] = toPx(m.x, m.y); mx += gx * 0.35; my += gy * 0.3;
    const mw = m.w * U, mh = m.h * U;
    const openAmt = clamp(clamp(s.talk) * 0.8 + kA * 0.6);
    const wO = clamp(openAmt * 3), closed = 1 - wO;
    if (closed * (kI + kA + kD) > 0.01) glowStroke(closed * clamp(kI + kA + kD), 12, MC, MCORE, ew * 0.16, () => { x.beginPath(); x.moveTo(mx - mw * 0.45, my - mh * 0.05); x.quadraticCurveTo(mx, my + mh * (0.38 + 0.15 * kA - 0.1 * kD), mx + mw * 0.45, my - mh * (0.05 + 0.35 * kD)); });
    if (closed * kT > 0.01) glowStroke(closed * kT, 12, MC, MCORE, ew * 0.16, () => { x.beginPath(); x.moveTo(mx - mw * 0.2, my + mh * 0.1); x.quadraticCurveTo(mx + mw * 0.05, my + mh * 0.18, mx + mw * 0.3, my + mh * 0.04); });
    if (wO > 0.01) {
      const h = mh * (0.35 + 0.75 * openAmt), ww = mw * (0.3 + 0.14 * openAmt), t0 = my - h * 0.25, b0 = my + h * 0.7;
      const path = () => { x.beginPath(); x.moveTo(mx - ww, t0); x.quadraticCurveTo(mx, t0 - h * 0.08, mx + ww, t0); x.bezierCurveTo(mx + ww * 1.02, b0, mx + ww * 0.5, b0 + h * 0.06, mx, b0 + h * 0.06); x.bezierCurveTo(mx - ww * 0.5, b0 + h * 0.06, mx - ww * 1.02, b0, mx - ww, t0); x.closePath(); };
      const g = x.createLinearGradient(0, t0, 0, b0); g.addColorStop(0, MCORE); g.addColorStop(0.5, MC); g.addColorStop(1, MC);
      glowFill(wO, 18, MC, path, g);
    }
    x.restore();
    emTex.needsUpdate = true;
  }
  return { mat, draw };
}

/** the small frosted-gold card the teacher holds: engraved triangle, circle and square */
function makeCard(w, h, M) {
  const tex = canvasTex(320, Math.round(320 * h / w), (x, W, H) => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f1d9a0'); g.addColorStop(0.5, '#d6b06a'); g.addColorStop(1, '#b88f48'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,248,225,.9)'; x.lineWidth = 6; x.beginPath(); x.roundRect(16, 16, W - 32, H - 32, 22); x.stroke();
    x.strokeStyle = '#7a5a26'; x.lineWidth = 9; x.lineJoin = 'round';
    const cy = H / 2, s = H * 0.2;
    x.beginPath(); x.moveTo(W * 0.24, cy - s); x.lineTo(W * 0.24 + s * 1.05, cy + s * 0.8); x.lineTo(W * 0.24 - s * 1.05, cy + s * 0.8); x.closePath(); x.stroke();
    x.beginPath(); x.arc(W * 0.5, cy, s * 0.95, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.roundRect(W * 0.76 - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8, 6); x.stroke();
  });
  const g = new THREE.Group();
  const plate = new THREE.Mesh(superGeo(w / 2, h / 2, 0.009, 0.22, { ws: 20, hs: 12, planar: { cx: 0, cy: 0, w, h } }), new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.55, roughness: 0.38, envMapIntensity: 1.2, clearcoat: 0.4, clearcoatRoughness: 0.3 }));
  g.add(plate);
  const rim = new THREE.Mesh(superGeo(w / 2 + 0.006, h / 2 + 0.006, 0.006, 0.22, { ws: 20, hs: 12 }), M.gold); rim.position.z = -0.004; g.add(rim);
  return g;
}
/** a warm translucent holo card with a tiny diagram (three nodes joined by arrows) */
function makeHoloWarm(w, h) {
  const tex = canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
    x.clearRect(0, 0, W, H);
    x.save(); x.shadowColor = 'rgba(255,205,120,.9)'; x.shadowBlur = 24;
    x.beginPath(); x.roundRect(18, 18, W - 36, H - 36, 40); x.fillStyle = 'rgba(255,247,230,.82)'; x.fill(); x.restore();
    x.lineWidth = 5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.roundRect(18, 18, W - 36, H - 36, 40); x.stroke();
    const node = (cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = f; x.fill(); x.lineWidth = 5; x.strokeStyle = '#c9a25a'; x.stroke(); };
    const r = H * 0.13;
    x.strokeStyle = '#b58e4a'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(W * 0.22 + r, H * 0.36); x.lineTo(W * 0.5 - r, H * 0.36); x.moveTo(W * 0.5 + r * 0.7, H * 0.36 + r * 0.7); x.lineTo(W * 0.74 - r * 0.7, H * 0.66 - r * 0.7); x.stroke();
    node(W * 0.22, H * 0.36, r, '#fbe7bd'); node(W * 0.5, H * 0.36, r, '#d9e8e2'); node(W * 0.74, H * 0.66, r * 1.15, '#2b4c86');
    x.fillStyle = '#ffe9b8'; x.beginPath(); x.arc(W * 0.74, H * 0.66, r * 0.4, 0, Math.PI * 2); x.fill();
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.renderOrder = 9;
  return { mesh: m, mat };
}

// ---------- embodiment: the porcelain tutor-bot (the design's white-and-gold AI tutor, shown small beside the teacher) ----------
function makeTutorBot(rng) {
  const M = mats();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.add(makeShadow(1.45, 1.0));
  // frosted-gold base
  body.add(new THREE.Mesh(lathe([[0, 0], [0.35, 0], [0.37, 0.014], [0.365, 0.05], [0.33, 0.085], [0.27, 0.105], [0, 0.105]], 32), M.gold));
  // torso: glazed porcelain egg, wider low, narrower at the shoulders
  const RB = { rx: 0.33, ry: 0.5, rz: 0.3, e: 0.9, taper: 0.2 }, yB = 0.06 + RB.ry;
  const torso = new THREE.Group(); torso.position.y = yB; body.add(torso);
  torso.add(new THREE.Mesh(superGeo(RB.rx, RB.ry, RB.rz, RB.e, { ws: 32, hs: 22, taper: RB.taper }), M.porcelain));
  // fine gold lines sweeping across the porcelain
  const gl = [[38, 168], [64, 150], [92, 128], [120, 108], [146, 92]].map(([th, ph]) => surfAng(RB, th, ph));
  torso.add(new THREE.Mesh(surfPanel(RB, gl, u => 0.007 * (0.4 + 0.6 * Math.sin(Math.PI * u)), u => 0.004, { N: 30, M: 4 }), M.gold));
  const gl2 = [[70, 170], [96, 152], [124, 132], [150, 118]].map(([th, ph]) => surfAng(RB, th, ph));
  torso.add(new THREE.Mesh(surfPanel(RB, gl2, u => 0.005 * (0.4 + 0.6 * Math.sin(Math.PI * u)), u => 0.004, { N: 24, M: 4 }), M.gold));
  // sage scarf: over the left shoulder (viewer's left), across the chest to the right hip, gold edges
  const sash = [[10, 48], [30, 66], [56, 96], [84, 126], [110, 146]].map(([th, ph]) => surfAng(RB, th, ph));
  const sW = u => 0.095 * (0.75 + 0.25 * Math.sin(Math.PI * u)), sT = u => 0.034;
  torso.add(new THREE.Mesh(surfPanel(RB, sash, sW, sT, { N: 30, M: 9 }), M.sage));
  for (const sh of [-0.93, 0.93]) torso.add(new THREE.Mesh(surfPanel(RB, sash, u => sW(u) * 0.075, u => sT(u) + 0.004, { N: 30, M: 4, shift: sh * 12.4 }), M.gold));
  // the scarf's end hanging down the front-left
  const tail = [[14, 40], [42, 30], [72, 25], [100, 24]].map(([th, ph]) => surfAng(RB, th, ph));
  const tW = u => 0.07 + 0.03 * u, tT = u => 0.03 + 0.012 * u;
  torso.add(new THREE.Mesh(surfPanel(RB, tail, tW, tT, { N: 22, M: 8 }), M.sageDeep));
  torso.add(new THREE.Mesh(surfPanel(RB, tail.slice(2), u => 0.1 * 0.12, u => 0.048, { N: 10, M: 4, shift: 0 }), M.gold));
  // collar: the scarf wound round the neck
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.068, 10, 32), M.sage);
  collar.rotation.x = Math.PI / 2; collar.scale.set(1.04, 0.92, 0.85); collar.position.y = RB.ry * 0.9; torso.add(collar);
  // chest gem (the state light) where the scarf crosses the chest
  const gemAt = surfAng(RB, 50, 92, 0.038);
  const gemG = new THREE.Group(); gemG.position.copy(gemAt.p); gemG.quaternion.setFromUnitVectors(Z_AX, gemAt.n); torso.add(gemG);
  gemG.add(new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.011, 10, 28), M.gold));
  const gemMat = glossy(COL.gold, { r: 0.15, extra: { emissive: COL.led, emissiveIntensity: 0.3 } });
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.031, 20, 14), gemMat); gem.scale.z = 0.62; gemG.add(gem);
  const glow = makeGlow(0.034); glow.group.position.z = 0.02; gemG.add(glow.group);
  // head: a separate porcelain dome with a big navy visor and a thin gold rim
  const RH = { rx: 0.33, ry: 0.3, rz: 0.315, e: 0.86, taper: -0.06 };
  const headG = new THREE.Group(); headG.position.y = yB + RB.ry - 0.03; body.add(headG);
  const head = new THREE.Group(); head.position.y = RH.ry + 0.02; headG.add(head);
  head.add(new THREE.Mesh(superGeo(RH.rx, RH.ry, RH.rz, RH.e, { ws: 32, hs: 22, taper: RH.taper }), M.porcelain));
  const outline = outlinePts([[0, 0.155], [0.15, 0.145], [0.232, 0.088], [0.252, -0.02], [0.215, -0.128], [0.11, -0.188], [0, -0.198], [-0.11, -0.188], [-0.215, -0.128], [-0.252, -0.02], [-0.232, 0.088], [-0.15, 0.145]]);
  const planar = { cx: 0, cy: -0.02, w: 0.6, h: 0.42 };
  const face = makeWiseFace({ outline, planar, ppu: 1100, eyes: [{ x: -0.1, y: 0.005 }, { x: 0.1, y: 0.005 }], ew: 0.058, eh: 0.046, mouth: { x: 0, y: -0.112, w: 0.085, h: 0.055 } });
  const visor = new THREE.Mesh(superGeo(RH.rx, RH.ry, RH.rz, RH.e, { ws: 30, hs: 20, taper: RH.taper, offset: 0.004, planar, phiStart: Math.PI / 2 - 1.15, phiLength: 2.3, thetaStart: 0.55, thetaLength: 1.55 }), face.mat);
  visor.renderOrder = 2; head.add(visor);
  head.add(new THREE.Mesh(bezelGeo(RH, outline, 0.012, 0.011, 0.003), M.gold));
  // small gold temple studs
  for (const ph of [3, 177]) { const o = surfAng(RH, 96, ph, 0.004); const d = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.016, 24), M.gold); d.position.copy(o.p); d.quaternion.setFromUnitVectors(Y_UP, o.n); head.add(d); }
  const marks = makeMarks(COL.goldDeep, COL.tick);
  marks.q.position.set(0.5, 0.42, 0.15); marks.q.userData.y = 0.42; marks.b.position.set(0.52, 0.36, 0.15); headG.add(marks.q, marks.b);
  // arms: slender porcelain, gold wrist rings, long fingers
  const armO = { a: 0.2, b: 0.2, r: 0.04, hr: 0.066, cuffAt: 0.8, slim: 0.7, mat: M.porcelain, cuff: M.gold, handMat: M.porcelain };
  const arms = [-1, 1].map(sx => { const a = makeArm(sx, armO); body.add(a.group); return a; });
  const SH = [0.235, 0.85, 0.0];
  const card = makeCard(0.19, 0.13, M); body.add(card);
  const holo = makeHoloWarm(0.4, 0.25); body.add(holo.mesh);
  const ARMS = {
    [-1]: {   // the card hand (viewer's left), written mirrored
      rest: { T: [0.17, 0.6, 0.34], pole: [0.35, -1, -0.3], f: [-0.75, 0.45, 0.35], n: [0.1, 0.3, 1], curl: 0.5 },
      raise: { T: [0.44, 1.2, 0.1], pole: [1, -0.4, -0.2], f: [0, 1, 0.05], n: [0, 0, 1], curl: 0.3 },
    },
    [1]: {    // the free hand: the "point" is an open palm offered to the right
      rest: { T: [0.37, 0.5, 0.14], pole: [0.4, -0.3, -1], f: [0.04, -1, 0.25], n: [-1, 0, 0.25], curl: 0.35 },
      raise: { T: [0.46, 1.2, 0.1], pole: [1, -0.4, -0.2], f: [0.08, 1, 0.05], n: [0, 0, 1], curl: 0.1 },
      point: { T: [0.6, 0.8, 0.24], pole: [0.1, -1, -0.5], f: [1, 0.2, 0.15], n: [0, 1, 0.2], curl: 0.14, idx: 0.1 },
      wave: { T: [0.5, 1.16, 0.18], pole: [1, -1, 0], f: [0.08, 1, 0.05], n: [0, 0, 1], curl: 0.05 },
      think: { T: [0.1, 1.06, 0.34], pole: [0.8, -1, 0], f: [-0.4, 1, 0.3], n: [0, 0.3, -1], curl: 0.65, idx: 0.4 },
      thumb: { T: [0.17, 0.74, 0.36], pole: [0.8, -1, -0.4], f: [-1, 0.15, 0.1], n: [0, 0, -1], curl: 0.3, idx: 0.3 },
    },
  };
  const CARD_O = V3(0.07, 0.07, 0.03), CARD_E = new THREE.Euler(-0.1, 0.25, -0.08, 'YXZ');
  const height = yB + RB.ry - 0.03 + RH.ry + 0.02 + RH.ry;
  const col = new THREE.Color(), idleCol = new THREE.Color(COL.led);
  return {
    root, height, classroomScale: 1,
    pose(s) {
      s = { ...DEF, ...s };
      const t = s.t, k = sm(s.stateK), kT = s.state === 'think' ? k : 0, kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0;
      root.rotation.y = s.turn * 0.5;
      const hop = clamp(s.hop), chuckle = kA * 0.01 * Math.abs(Math.sin(t * 11));
      body.position.y = hop * 0.3 + chuckle;
      body.rotation.z = s.tilt * 0.12 + kA * 0.012 * Math.sin(t * 11);
      const breath = Math.sin(t * 1.8 + 0.7) * 0.007, sq = s.squash * 0.2;
      torso.scale.set(1 - breath * 0.3 + sq * 0.4, 1 + breath - sq, 1 - breath * 0.3 + sq * 0.4);
      headG.position.y = yB + (RB.ry - 0.03) * (1 + breath - sq);
      headG.rotation.set(-s.lookY * 0.12 - kT * 0.1 + kA * 0.05, s.lookX * 0.25, 0.035 * Math.sin(t * 0.6 + 1) + kD * 0.14 - kT * 0.05 + s.tilt * 0.05);
      face.draw(s);
      stateColor(s, col, idleCol); const lv = stateLevel(s);
      gemMat.color.set(COL.gold).lerp(col, s.state === 'idle' ? 0.25 : 0.85 * k);
      gemMat.emissive.copy(col); gemMat.emissiveIntensity = 0.25 + (s.state === 'idle' ? 0.25 * lv : 0.9 * k * lv);
      glow.set(s, col, lv);
      marks.set(s, 0.24);
      arms.forEach((a, i) => {
        const side = i ? 1 : -1, P = armPose(s, side, ARMS[side]);
        a.set(V3(side * SH[0], SH[1] + breath * 0.5 - sq * 0.3, SH[2]), P, false);
        if (side < 0) { card.position.copy(a.W).add(CARD_O); card.quaternion.setFromEuler(CARD_E); }
        else {
          const kp = sm(clamp((s.point - 0.6) / 0.4));
          holo.mat.opacity = kp * 0.95; holo.mesh.visible = kp > 0.01;
          holo.mesh.position.set(a.W.x + 0.2, a.W.y + 0.26 + 0.012 * Math.sin(t * 2), a.W.z - 0.04);
          holo.mesh.rotation.set(0, -s.turn * 0.35 - 0.1, 0.02);
          holo.mesh.scale.setScalar(0.85 + 0.15 * kp);
        }
      });
    },
  };
}

// ---------- student: a round little porcelain bot in an apricot knit cap (the pompom is the state light), notebook ----------
function makeStudent(rng) {
  const M = mats();
  const R = { rx: 0.5, ry: 0.47, rz: 0.47, e: 0.92, taper: 0.1 }, yb = 0.12;
  const outline = outlinePts([[0.3, 0.27], [0.37, 0.21], [0.385, 0.08], [0.36, -0.05], [0.26, -0.125], [0, -0.14], [-0.26, -0.125], [-0.36, -0.05], [-0.385, 0.08], [-0.37, 0.21], [-0.3, 0.27], [0, 0.29]]);
  const planar = { cx: 0, cy: 0.075, w: 0.84, h: 0.5 };
  const F = makeFigure({
    shellSeg: [44, 30], R, yb, outline, shadow: [1.55, 1.15], lift: 0.55, tiltK: 0.26, seed: 23,
    face: { planar, ppu: 1000, style: 'cute', eyes: [{ x: -0.15, y: 0.085 }, { x: 0.15, y: 0.085 }], ew: 0.062, eh: 0.074, mouth: { x: 0, y: -0.05, w: 0.1, h: 0.075 }, idleOpen: 0.35,
      led: '#ffd486', ledCore: '#fff6e2', mouthCol: COL.warm, mouthCore: COL.warmCore, amb: 'rgba(255,200,120,.12)' },
    visorPatch: { phiStart: Math.PI / 2 - 1.2, phiLength: 2.4, thetaStart: 0.62, thetaLength: 1.3 },
    bezel: [0.03, 0.022, 0.004], bezelMat: M.apricot,
    slot: { y: -0.27, w: 0.12, h: 0.042, col: '#ffcf8a' }, slotRimMat: M.apricotDeep,
    feet: { x: 0.24, z: 0.05, out: 0.2, rx: 0.13, ry: 0.068, rz: 0.16, sole: 0.036 }, soleMat: M.apricotDeep,
    markCol: COL.apricotDeep, marks: [0.66, 1.08], markSize: 0.28, lightIdle: '#ffcf8a',
  }, M);
  const { body, shell } = F;
  // apricot knit cap: dome + ribbed brim + pompom (the state light)
  const capY = R.ry * 0.6;
  const dome = new THREE.Mesh(superGeo(0.43, 0.27, 0.42, 0.92, { ws: 40, hs: 16, thetaLength: Math.PI / 2 + 0.05 }), M.apricot); dome.position.y = capY; shell.add(dome);
  const ribTex = canvasTex(256, 32, (x, W, H) => { x.fillStyle = '#c9733a'; x.fillRect(0, 0, W, H); x.fillStyle = '#e48d52'; for (let i = 0; i < 48; i++) x.fillRect(i * W / 48, 0, W / 96, H); });
  ribTex.wrapS = THREE.RepeatWrapping;
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.418, 0.05, 12, 56), vinyl('#ffffff', { r: 0.75, cc: 0.05, extra: { map: ribTex } })); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 0.99, 1.15); brim.position.y = capY + 0.01; shell.add(brim);
  const pomMat = vinyl('#ffcf8a', { r: 0.8, cc: 0, extra: { emissive: '#ffcf8a', emissiveIntensity: 0.2 } });
  const pomG = new THREE.Group(); pomG.position.y = capY + 0.27 + 0.05; shell.add(pomG);
  const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 2), pomMat); pomG.add(pom);
  const pomGlow = makeGlow(0.05); pomG.add(pomGlow.group);
  const armO = { a: 0.12, b: 0.12, r: 0.046, hr: 0.07, cuffAt: 0.12, mat: M.porcelain, cuff: M.apricot, handMat: M.porcelain };
  const arms = [-1, 1].map(sx => { const a = makeArm(sx, armO); body.add(a.group); return a; });
  const SH = [0.44, 0.5, 0.1];
  const book = makeNotebook(0.24, 0.3, M); body.add(book);
  const ARMS = {
    [-1]: {
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
  const height = yb + R.ry + capY + 0.27 + 0.05 + 0.085;
  const col = F.col;
  return {
    root: F.root, height, classroomScale: 0.92,
    pose(s) {
      s = { ...DEF, ...s };
      const { sy, lv } = F.set(s);
      const t = s.t, k = sm(s.stateK), kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0, kT = s.state === 'think' ? k : 0;
      pomG.rotation.z = 0.08 * Math.sin(t * 2.4) + kD * 0.3; pomG.position.x = kD * 0.03;
      pom.scale.setScalar(1 + kA * 0.18 * Math.abs(Math.sin(t * 9)) + kT * 0.05 * Math.sin(t * 8));
      pomMat.color.set('#ffcf8a').lerp(col, s.state === 'idle' ? 0 : 0.85 * k);
      pomMat.emissive.copy(col); pomMat.emissiveIntensity = 0.15 + (s.state === 'idle' ? 0.1 : 0.7 * k * lv);
      pomGlow.set(s, col, lv, 0.9);
      arms.forEach((a, i) => {
        const side = i ? 1 : -1, P = armPose(s, side, ARMS[side]);
        a.set(V3(side * SH[0], SH[1] * (0.6 + 0.4 * sy), SH[2]), P, false);
        if (side < 0) { book.position.copy(a.W).add(BOOK_O); book.quaternion.setFromEuler(BOOK_E); }
      });
    },
  };
}


// ---------- teacher: the deep-blue book-page spirit (the user's design: hooded cloth figure, warm glowing face) ----------
/** a felt / velvet texture: base colour with fine lighter specks (the design's textured cloth) */
function feltTex(base, speck, seed) {
  const r = mulberry(seed);
  const t = canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) { x.globalAlpha = 0.05 + 0.16 * r(); x.fillStyle = r() < 0.75 ? speck : '#ffffff'; const s = 0.6 + r() * 1.6; x.fillRect(r() * W, r() * H, s, s); }
    for (let i = 0; i < 900; i++) { x.globalAlpha = 0.25 + 0.4 * r(); x.fillStyle = '#ecd08e'; const s = 0.5 + r() * 1.1; x.fillRect(r() * W, r() * H, s, s); }
    x.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clothMat = (map, sheen, o = {}) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map, roughness: o.r ?? 0.78, metalness: 0, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.45, envMapIntensity: 0.7, side: o.side ?? THREE.FrontSide });
const lerpTab = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, a0] = tab[i - 1], [y1, a1] = tab[i]; return lerp(a0, a1, sm((y - y0) / (y1 - y0))); } return tab[tab.length - 1][1]; };

/** a lathe-like shell with a front opening: prof = [[r, y], …] top → bottom, open(y) = half-angle of the opening (rad),
 *  deform(p, u, v, y) moves points (u: 0..1 from the opening's right edge round the back to its left edge, v: 0..1 down the profile) */
function resample(prof, n) { const c = new THREE.CatmullRomCurve3(prof.map(([r, y]) => V3(r, y, 0)), false, 'centripetal'); return c.getPoints(n - 1).map(v => [Math.max(0, v.x), v.y]); }
function shellGeo(prof, N, open, deform) {
  prof = resample(prof, Math.max(prof.length, 30));
  const P = [], UV = [], idx = [], rows = prof.length;
  for (let i = 0; i < rows; i++) {
    const [r, y] = prof[i], a = open(y);
    for (let j = 0; j <= N; j++) {
      const u = j / N, ph = a + u * (Math.PI * 2 - 2 * a);
      const p = V3(r * Math.sin(ph), y, r * Math.cos(ph));
      deform(p, u, i / (rows - 1), y, ph);
      P.push(p.x, p.y, p.z); UV.push(u * 4, i / (rows - 1) * 2);
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(idx); g.computeVertexNormals();
  // make the normals point outwards
  const mid = Math.floor(rows / 2) * (N + 1) + Math.floor(N / 2), n = g.attributes.normal, p = g.attributes.position;
  if (n.getX(mid) * p.getX(mid) + n.getZ(mid) * p.getZ(mid) < 0) { const I = g.index.array; for (let k = 0; k < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; } g.computeVertexNormals(); }
  return g;
}
/** one row (column j) or edge of a shell, as world points → a gold piping tube */
function edgeTube(pts, r, mat, seg = 64) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 6, false), mat);
}
/** a cloth band lying on a surface: at(s) → {p, n} (centre point and outward normal), w(s) half-width, cup = how much the band bows outwards */
function bandGeo(at, w, cup, N = 40, M = 7) {
  const P = [], idx = [], edges = [[], []];
  for (let i = 0; i <= N; i++) {
    const s = i / N, A = at(s), B = at(Math.min(1, s + 0.01)), Bm = at(Math.max(0, s - 0.01));
    const T = V3().subVectors(B.p, Bm.p).normalize(), X = V3().crossVectors(T, A.n).normalize(), ww = w(s);
    for (let j = 0; j < M; j++) {
      const t = -1 + 2 * j / (M - 1), q = V3().copy(A.p).addScaledVector(X, ww * t).addScaledVector(A.n, cup * ww * (1 - t * t));
      P.push(q.x, q.y, q.z);
      if (j === 0) edges[0].push(q.clone()); if (j === M - 1) edges[1].push(q.clone());
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const UV = []; for (let i = 0; i <= N; i++) for (let j = 0; j < M; j++) UV.push(i / N * 3, j / (M - 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return { geo: g, edges };
}

/** the glowing face: warm skin light, almond amber eyes with a dark lash line, thin brows, a small smile */
function makeGlowFace(rx, ry, rz) {
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.36, roughness: 0.6, envMapIntensity: 0.3 });
  const LASH = '#4a2810', BROW = '#6e4422';
  // per eye: open (0..1), lift (upper lid arch), g (gaze scale); brows: [raise, arch, innerDown]
  const SET = {
    I: { L: { o: 0.95, br: [0, 0.55, -2] }, R: { o: 0.95, br: [0, 0.55, -2] } },
    T: { L: { o: 0.95, br: [10, 0.65, -4] }, R: { o: 0.9, br: [4, 0.55, 2] } },
    A: { L: { o: 0, br: [8, 0.7, -2] }, R: { o: 0, br: [8, 0.7, -2] } },
    D: { L: { o: 0.6, br: [-4, 0.3, 5] }, R: { o: 1.0, br: [16, 0.8, -6] } },
  };
  const bl = (w, side) => { const o = { o: 0, br: [0, 0, 0] }; for (const k of ['I', 'T', 'A', 'D']) { if (!w[k]) continue; const p = SET[k][side]; o.o += p.o * w[k]; p.br.forEach((v, i) => { o.br[i] += v * w[k]; }); } return o; };
  function eye(cx, cy, dir, P, gx, gy, blink, kA, tw) {
    const ew = 82, eh = 47, open = P.o * (1 - 0.96 * blink);
    const ix = cx - dir * ew, ox = cx + dir * ew;            // inner / outer corner (dir +1 = viewer's right eye)
    const iy = cy + 6, oy = cy - 2;                           // outer corner a little higher (the design's upturn)
    const up = eh * 1.2 * Math.max(open, 0.06), lo = eh * 0.62;
    const path = () => { x.beginPath(); x.moveTo(ix, iy); x.bezierCurveTo(ix + dir * ew * 0.45, cy - up, ox - dir * ew * 0.35, cy - up * 1.02, ox, oy); x.bezierCurveTo(ox - dir * ew * 0.3, cy + lo, ix + dir * ew * 0.4, cy + lo * 1.05, ix, iy); x.closePath(); };
    if (open > 0.08) {
      x.save(); path(); x.clip();
      x.fillStyle = '#fff8ec'; x.fillRect(cx - 110, cy - 80, 220, 160);
      const icx = cx + gx, icy = cy + gy + 6, ir = 38;
      const g = x.createRadialGradient(icx - 4, icy - 5, 2, icx, icy, ir); g.addColorStop(0, '#ffd77a'); g.addColorStop(0.55, '#d9962c'); g.addColorStop(1, '#8a4f14');
      x.fillStyle = g; x.beginPath(); x.arc(icx, icy, ir, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2e1606'; x.beginPath(); x.arc(icx, icy, 15, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(icx - 12, icy - 13, 9 + 4 * tw, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(icx + 6, icy + 5, 2.2, 0, Math.PI * 2); x.fill();
      if (tw > 0.05) { x.globalAlpha = tw; x.fillStyle = '#ffffff'; x.beginPath(); const sx = icx - 7, sy = icy - 8, R = 12 * tw; for (let i = 0; i < 8; i++) { const r2 = i % 2 ? R * 0.22 : R, a = i * Math.PI / 4; x.lineTo(sx + Math.sin(a) * r2, sy - Math.cos(a) * r2); } x.fill(); x.globalAlpha = 1; }
      // upper lid shadow
      const sh = x.createLinearGradient(0, cy - up, 0, cy - up + 16); sh.addColorStop(0, 'rgba(120,60,20,.35)'); sh.addColorStop(1, 'rgba(120,60,20,0)'); x.fillStyle = sh; x.fillRect(cx - 110, cy - 80, 220, 160);
      x.restore();
    }
    // lash line (upper lid) with a small outer wing
    x.strokeStyle = LASH; x.lineCap = 'round'; x.lineJoin = 'round';
    if (kA < 0.99) {
      x.globalAlpha = 1 - kA; x.lineWidth = 12;
      x.beginPath(); x.moveTo(ix, iy); x.bezierCurveTo(ix + dir * ew * 0.45, cy - up, ox - dir * ew * 0.35, cy - up * 1.02, ox, oy); x.lineTo(ox + dir * 14, oy - 9); x.stroke();
      x.lineWidth = 3; x.globalAlpha = (1 - kA) * 0.3; x.beginPath(); x.moveTo(ix + dir * 10, iy - 12); x.bezierCurveTo(ix + dir * ew * 0.45, cy - up - 14, ox - dir * ew * 0.35, cy - up * 1.02 - 14, ox - dir * 6, oy - 12); x.stroke();
      x.lineWidth = 2.5; x.globalAlpha = (1 - kA) * 0.55; x.beginPath(); x.moveTo(ix + dir * 8, iy + 2); x.bezierCurveTo(ix + dir * ew * 0.4, cy + lo * 1.05, ox - dir * ew * 0.3, cy + lo, ox - dir * 4, oy + 3); x.stroke();
    }
    // laughing / serene closed eye: a soft arc (the design's middle panel)
    if (kA > 0.01) { x.globalAlpha = kA; x.lineWidth = 11; x.beginPath(); x.moveTo(ix, cy + 6); x.quadraticCurveTo(cx, cy - 46, ox, cy + 3); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(ox - dir * 2, cy + 2); x.lineTo(ox + dir * 8, cy - 4); x.stroke(); }
    x.globalAlpha = 1;
    // brow
    const [raise, arch, inner] = P.br;
    const by = cy - 104 - raise;
    x.strokeStyle = BROW; x.lineWidth = 6.5; x.beginPath();
    x.moveTo(cx - dir * 64, by + 12 + inner); x.quadraticCurveTo(cx + dir * 4, by - 34 * arch, cx + dir * 74, by + 16); x.stroke();
  }
  function draw(s) {
    const k = sm(s.stateK || 0), kT = s.state === 'think' ? k : 0, kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0, kI = 1 - kT - kA - kD;
    const w = { I: kI, T: kT, A: kA, D: kD };
    const g = x.createRadialGradient(W * 0.5, H * 0.44, 10, W * 0.5, H * 0.5, W * 0.6);
    g.addColorStop(0, '#ffe9c2'); g.addColorStop(0.45, '#ffd48a'); g.addColorStop(0.78, '#eea54c'); g.addColorStop(1, '#cf8030');
    x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(238,132,96,.2)'; [[138, 340], [374, 340]].forEach(([u, v]) => { x.beginPath(); x.ellipse(u, v, 52, 26, 0, 0, Math.PI * 2); x.fill(); });
    const gx = clamp(s.lookX + kT * 0.45, -1, 1) * 15, gy = -clamp(s.lookY + kT * 0.7, -1, 1) * 9;
    const ph = (s.t + 0.9) % 4.7, tw = (ph < 0.6 ? Math.sin(ph / 0.6 * Math.PI) : 0) * kI * (1 - clamp(s.blink));
    eye(150, 262, -1, bl(w, 'L'), gx, gy, clamp(s.blink), kA, tw);
    eye(362, 262, 1, bl(w, 'R'), gx, gy, clamp(s.blink), kA, tw * 0.7);
    // nose: a soft shadow
    x.strokeStyle = 'rgba(170,96,40,.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(258, 312); x.quadraticCurveTo(270, 336, 252, 342); x.stroke();
    // mouth
    const mx = 256 + gx * 0.3, my = 398, talk = clamp(s.talk), op = clamp(talk * 0.9 + kA * 0.35);
    x.lineCap = 'round';
    if (op > 0.12) {
      const hw = 30 + 12 * kA, hh = 8 + 20 * op;
      x.fillStyle = '#7a3420'; x.beginPath(); x.moveTo(mx - hw, my - 2); x.quadraticCurveTo(mx, my - 6, mx + hw, my - 2); x.quadraticCurveTo(mx + hw * 0.8, my + hh, mx, my + hh); x.quadraticCurveTo(mx - hw * 0.8, my + hh, mx - hw, my - 2); x.fill();
      x.fillStyle = 'rgba(240,140,120,.75)'; x.beginPath(); x.ellipse(mx, my + hh * 0.7, hw * 0.45, hh * 0.25, 0, 0, Math.PI * 2); x.fill();
    } else {
      x.strokeStyle = '#7a3c22'; x.lineWidth = 7;
      x.beginPath(); x.moveTo(mx - 34 - 8 * kA, my - 4 - 2 * kD); x.quadraticCurveTo(mx + 2, my + 16 + 5 * kA - 8 * kT, mx + 34 + 8 * kA, my - 4 - 12 * kD); x.stroke();
      x.lineWidth = 4; x.beginPath(); x.moveTo(mx + 32 + 8 * kA, my - 6 - 12 * kD); x.lineTo(mx + 40 + 8 * kA, my - 11 - 12 * kD); x.stroke();
    }
    tex.needsUpdate = true;
  }
  const geo = superGeo(rx, ry, rz, 0.92, { ws: 44, hs: 34, taper: -0.22, planar: { cx: 0, cy: 0, w: 2 * rx * 1.22, h: 2 * ry } });
  return { mesh: new THREE.Mesh(geo, mat), draw };
}

function makeSage(rng) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.add(makeShadow(1.25, 0.85));
  const blueTex = feltTex('#1d3470', '#5d7fc6', 7), tealTex = feltTex('#4f8c86', '#a3d3c6', 11);
  const BLUE = clothMat(blueTex, '#9fb6ec'), BLUE_IN = clothMat(tealTex, '#cfeee4', { side: THREE.BackSide });
  const TEAL = clothMat(tealTex, '#d8f2ea', { side: THREE.DoubleSide, r: 0.72 });
  const GOLD = new THREE.MeshPhysicalMaterial({ color: '#e7c47c', metalness: 0.65, roughness: 0.3, emissive: '#c99a45', emissiveIntensity: 0.35, envMapIntensity: 1.3 });
  const LIGHT = new THREE.MeshStandardMaterial({ color: '#ffd79a', emissive: '#f7ad55', emissiveIntensity: 0.55, roughness: 0.55 });
  // ---- robe: an A-line cloak with a V at the chest (inner light shows through), a swirl and pointed hem tails
  const robeProf = [[0.12, 0.99], [0.15, 0.93], [0.185, 0.84], [0.212, 0.73], [0.235, 0.6], [0.26, 0.46], [0.288, 0.32], [0.315, 0.19], [0.34, 0.08], [0.35, 0.02]];
  const robeOpen = y => lerpTab([[0.6, 0], [0.76, 0.32], [0.9, 0.62], [1.0, 0.7]], y);
  const twist = y => 0.42 * Math.pow(clamp(1 - y / 0.99), 1.4);
  const robeR = y => lerpTab(robeProf.slice().reverse().map(([r, yy]) => [yy, r]), y);
  const robeDef = (p, u, v, y) => {
    const a = twist(y), X = p.x * Math.cos(a) + p.z * Math.sin(a), Z = -p.x * Math.sin(a) + p.z * Math.cos(a);
    p.x = X; p.z = Z * 0.9;
    if (v > 0.8) { const k = (v - 0.8) / 0.2; p.y += k * (0.07 * (0.5 + 0.5 * Math.sin(u * Math.PI * 6 + 0.8)) - 0.02); }
    const e = Math.max(0, 1 - Math.min(u, 1 - u) / 0.06) * (y > 0.62 ? 1 : 0); p.x *= 1 + 0.06 * e; p.z += 0.025 * e;
  };
  const robeG = shellGeo(robeProf, 80, robeOpen, robeDef);
  const robe = new THREE.Group(); body.add(robe);
  robe.add(new THREE.Mesh(robeG, BLUE), new THREE.Mesh(robeG, BLUE_IN));
  { const L = [], R = []; robeProf.forEach(([r, y]) => { if (y < 0.6) return; const a = robeOpen(y); for (const [arr, ph, u] of [[R, a, 0], [L, Math.PI * 2 - a, 1]]) { const p = V3(r * Math.sin(ph), y, r * Math.cos(ph)); robeDef(p, u, 0, y); p.addScaledVector(V3(p.x, 0, p.z).normalize(), 0.004); arr.push(p); } });
    robe.add(edgeTube(R, 0.0055, GOLD, 24), edgeTube(L, 0.0055, GOLD, 24));
    const hem = []; const [hr, hy] = robeProf[robeProf.length - 1]; for (let j = 0; j <= 120; j++) { const u = j / 120, ph = u * Math.PI * 2; const q = V3(hr * Math.sin(ph), hy, hr * Math.cos(ph)); robeDef(q, u, 1, hy); q.addScaledVector(V3(q.x, 0, q.z).normalize(), 0.003); hem.push(q); }
    robe.add(edgeTube(hem, 0.006, GOLD, 150)); }
  // inner light at the chest (the state light)
  const coreMat = new THREE.MeshBasicMaterial({ color: '#ffd98e', toneMapped: false });
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: texes().halo, color: '#ffd98e', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.95 })); core.scale.set(0.2, 0.3, 1); core.position.set(0, 0.86, 0.06); core.renderOrder = 3; robe.add(core);
  const coreGlow = makeGlow(0.045); coreGlow.group.position.set(0, 0.86, 0.1); robe.add(coreGlow.group);
  // robe surface point at (phi, y) + offset, with the robe's twist
  const robeAt = (ph, y, off) => { const r = robeR(y) + off, p = V3(r * Math.sin(ph), y, r * Math.cos(ph)); const a = twist(y); const X = p.x * Math.cos(a) + p.z * Math.sin(a), Z = -p.x * Math.sin(a) + p.z * Math.cos(a); p.x = X; p.z = Z * 0.9; return { p, n: V3(p.x, 0.15, p.z / 0.9).normalize() }; };
  // the teal sash sweeping from the lower left up to the right shoulder, and a blue over-layer the other way, both gold-piped
  const band = (from, to, y0, y1, w0, w1, off, mat, cup) => {
    const B = bandGeo(s => robeAt(lerp(from, to, s), lerp(y0, y1, sm(s) * 0.5 + s * 0.5), off), s => lerp(w0, w1, s), cup);
    robe.add(new THREE.Mesh(B.geo, mat));
    B.edges.forEach(e => robe.add(edgeTube(e, 0.0045, GOLD, 48)));
  };
  band(-2.3, 0.95, 0.16, 0.8, 0.075, 0.055, 0.016, TEAL, 0.25);
  band(-0.95, 1.9, 0.82, 0.3, 0.06, 0.1, 0.03, clothMat(blueTex, '#9fb6ec', { side: THREE.DoubleSide }), 0.3);
  // ---- head: glowing face inside a pointed hood whose edges curl outwards (teal lining, gold piping)
  const headG = new THREE.Group(); headG.position.y = 0.97; body.add(headG);
  const FY = 0.2;
  const face = makeGlowFace(0.172, 0.2, 0.16); face.mesh.position.set(0, FY, 0.035); headG.add(face.mesh);
  const hoodProf = [[0, 0.63], [0.05, 0.61], [0.1, 0.575], [0.15, 0.52], [0.192, 0.45], [0.215, 0.37], [0.224, 0.28], [0.222, 0.19], [0.21, 0.1], [0.185, 0.02], [0.155, -0.05]];
  const hoodOpen = y => lerpTab([[-0.05, 0.5], [0.04, 0.78], [0.16, 0.92], [0.28, 0.78], [0.35, 0.42], [0.41, 0]], y);
  const hoodDef = (p, u, v, y) => {
    const k = clamp((y - 0.42) / 0.2); p.x += 0.05 * k * k * k; p.z -= 0.06 * k * k;   // the tip curls back and to the right
    const e = Math.max(0, 1 - Math.min(u, 1 - u) / 0.1), face = y > -0.02 && y < 0.44 ? 1 : 0;
    const R = Math.hypot(p.x, p.z) || 1, out = 1 + 0.16 * e * e * face;
    p.x *= out; p.z = p.z * out + 0.03 * e * face;
    p.z += 0.03;
  };
  const hoodG = shellGeo(hoodProf, 88, hoodOpen, hoodDef);
  headG.add(new THREE.Mesh(hoodG, BLUE), new THREE.Mesh(hoodG, BLUE_IN));
  { const L = [], R = []; hoodProf.forEach(([r, y]) => { const a = hoodOpen(y); if (a < 0.05) return; for (const [arr, ph, u] of [[R, a, 0], [L, Math.PI * 2 - a, 1]]) { const p = V3(r * Math.sin(ph), y, r * Math.cos(ph)); hoodDef(p, u, 0, y); arr.push(p); } });
    const top = V3(0, 0.47, 0); hoodDef(top, 0.5, 0, 0.47); const edge = [...R.reverse(), ...L]; headG.add(edgeTube(edge, 0.006, GOLD, 80)); }
  // an outer petal of the hood sweeping down over the right shoulder (the design's layered cloth)
  const hoodRy = y => lerpTab(hoodProf.slice().reverse().map(([rr, yy]) => [yy, rr]), y);
  const petal = (ph0, ph1, y0, y1, wMax, out, curl) => {
    const at = (s, extra) => { const ph = lerp(ph0, ph1, s), y = lerp(y0, y1, s), r = hoodRy(y) + out + extra; const p = V3(r * Math.sin(ph) * 1.03, y, r * Math.cos(ph) + 0.03); return { p, n: V3(p.x, 0.25, p.z).normalize() }; };
    const w = s => wMax * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.06));
    const B = bandGeo(s => at(s, 0), w, curl, 30, 7), Bi = bandGeo(s => at(s, -0.004), s => w(s) * 0.96, curl, 30, 7);
    headG.add(new THREE.Mesh(B.geo, clothMat(blueTex, '#9fb6ec', { side: THREE.FrontSide })), new THREE.Mesh(Bi.geo, clothMat(tealTex, '#d8f2ea', { side: THREE.BackSide })));
    headG.add(new THREE.Mesh(B.geo, clothMat(tealTex, '#d8f2ea', { side: THREE.BackSide })));
    B.edges.forEach(e => headG.add(edgeTube(e, 0.004, GOLD, 48)));
  };
  petal(0.95, 2.15, 0.55, -0.02, 0.1, 0.018, 0.35);     // over the right shoulder
  petal(-0.85, -2.05, 0.4, -0.03, 0.085, 0.014, 0.3);   // a lower one on the left
  // warm light spilling into the hood + a soft halo behind the head
  const T = texes();
  const spill = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.halo, color: '#ffcf86', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 })); spill.scale.setScalar(0.62); spill.position.set(0, FY - 0.02, 0.0); spill.renderOrder = 1; headG.add(spill);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.halo, color: '#ffd89a', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.35 })); halo.scale.setScalar(1.15); halo.position.set(0, FY + 0.05, -0.25); halo.renderOrder = -1; headG.add(halo);
  const motes = Array.from({ length: 9 }, (_, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star, color: '#ffe2a0', transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); sp.renderOrder = 7; body.add(sp); return { sp, a: i * 2.39, r: 0.3 + 0.12 * ((i * 37) % 10) / 10, y: 0.35 + 1.0 * ((i * 53) % 10) / 10, sp2: 0.25 + 0.15 * ((i * 17) % 10) / 10 }; });
  const marks = makeMarks(COL.goldDeep, COL.tick); marks.q.position.set(0.33, 0.48, 0.12); marks.q.userData.y = 0.48; marks.b.position.set(0.34, 0.42, 0.12); headG.add(marks.q, marks.b);
  // ---- arms: cloth sleeves with a gold-piped bell cuff, slender glowing hands
  const armO = { a: 0.2, b: 0.19, r: 0.04, hr: 0.058, cuffAt: 0.98, slim: 0.62, mat: BLUE, cuff: BLUE, handMat: LIGHT };
  const arms = [-1, 1].map(sx => {
    const a = makeArm(sx, armO); body.add(a.group);
    const bell = new THREE.Group(); body.add(bell);
    const bg = lathe([[0.04, 0], [0.046, 0.03], [0.058, 0.06], [0.074, 0.085], [0.082, 0.094]], 28);
    bell.add(new THREE.Mesh(bg, clothMat(blueTex, '#9fb6ec', { side: THREE.DoubleSide })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.005, 6, 28), GOLD); rim.rotation.x = Math.PI / 2; rim.position.y = 0.094; bell.add(rim);
    return { a, bell };
  });
  const SH = [0.14, 0.9, 0.0];
  const ARMS = {
    [-1]: {   // the quiet hand (viewer's left), resting at the waist under the wrap
      rest: { T: [0.1, 0.6, 0.26], pole: [0.4, -1, -0.3], f: [-0.6, -0.3, 0.6], n: [0, 0.2, -1], curl: 0.45 },
      raise: { T: [0.34, 1.16, 0.12], pole: [1, -0.4, -0.2], f: [0, 1, 0.05], n: [0, 0, 1], curl: 0.2 },
    },
    [1]: {    // the open hand: "point" = palm up, offered to the right (the design's gesture)
      rest: { T: [0.22, 0.56, 0.18], pole: [0.4, -0.6, -1], f: [0.1, -1, 0.3], n: [-1, 0, 0.3], curl: 0.35 },
      raise: { T: [0.36, 1.16, 0.14], pole: [1, -0.4, -0.2], f: [0.08, 1, 0.05], n: [0, 0, 1], curl: 0.15 },
      point: { T: [0.42, 0.9, 0.22], pole: [0.2, -1, -0.5], f: [0.95, 0.3, 0.12], n: [0, 1, 0.25], curl: 0.15, idx: 0.12 },
      wave: { T: [0.36, 1.12, 0.2], pole: [1, -1, 0], f: [0.08, 1, 0.05], n: [0, 0, 1], curl: 0.05 },
      think: { T: [0.05, 0.98, 0.27], pole: [0.8, -1, 0], f: [-0.35, 1, 0.3], n: [0, 0.3, -1], curl: 0.6, idx: 0.35 },
      thumb: { T: [0.09, 0.82, 0.25], pole: [0.8, -1, -0.4], f: [-1, 0.2, 0.1], n: [0, 0, -1], curl: 0.3, idx: 0.3 },
    },
  };
  const height = 0.97 + 0.62;
  const col = new THREE.Color(), idleCol = new THREE.Color('#ffcf7a'), tmp = new THREE.Color();
  return {
    root, height, classroomScale: 1,
    pose(s) {
      s = { ...DEF, ...s };
      const t = s.t, k = sm(s.stateK), kT = s.state === 'think' ? k : 0, kA = s.state === 'aha' ? k : 0, kD = s.state === 'doubt' ? k : 0;
      root.rotation.y = s.turn * 0.5;
      const float = 0.012 * Math.sin(t * 1.5), laugh = kA * 0.008 * Math.abs(Math.sin(t * 10));
      body.position.y = float + laugh + clamp(s.hop) * 0.22;
      body.rotation.z = s.tilt * 0.1 + 0.012 * Math.sin(t * 1.1);
      robe.rotation.y = 0.04 * Math.sin(t * 0.9);
      const sq = s.squash * 0.15; robe.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
      headG.position.y = 0.97 * (1 - sq);
      headG.rotation.set(-s.lookY * 0.12 - kT * 0.09 + kA * 0.06, s.lookX * 0.22, 0.05 * Math.sin(t * 0.55 + 1) + kD * 0.13 - kT * 0.06 + s.tilt * 0.05);
      face.draw(s);
      stateColor(s, col, idleCol); const lv = stateLevel(s);
      core.material.color.copy(col).lerp(tmp.set('#fff4d6'), 0.3);
      coreGlow.set(s, col, lv, 1.4); coreGlow.halo.material.opacity = Math.max(coreGlow.halo.material.opacity, 0.4 + 0.12 * lv);
      halo.material.color.copy(idleCol).lerp(col, s.state === 'idle' ? 0 : 0.6 * k); halo.material.opacity = 0.3 + 0.06 * Math.sin(t * 1.3) + 0.15 * kA;
      marks.set(s, 0.2);
      motes.forEach((m, i) => { const a = m.a + t * m.sp2, tw = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.7); m.sp.position.set(Math.cos(a) * m.r, m.y + 0.03 * Math.sin(t * 1.4 + i), Math.sin(a) * m.r * 0.7 + 0.05); m.sp.material.opacity = (0.35 + 0.5 * kA) * tw * (Math.sin(a) > -0.2 ? 1 : 0.25); m.sp.scale.setScalar(0.035 + 0.02 * tw + 0.02 * kA); });
      arms.forEach(({ a, bell }, i) => {
        const side = i ? 1 : -1, P = armPose(s, side, ARMS[side]);
        a.set(V3(side * SH[0], SH[1] - sq * 0.3, SH[2]), P, false);
        const fd = V3().subVectors(a.W, a.E).normalize();
        bell.position.copy(a.W).addScaledVector(fd, -0.075); bell.quaternion.setFromUnitVectors(Y_UP, fd);
      });
    },
  };
}

export async function create(env, opts = {}) {
  const rng = env.rng;
  return { teacher: makeSage(rng), student: makeStudent(rng), embodiment: makeTutorBot(rng) };
}
