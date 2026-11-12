// Glossy figure: owl (v2, rebuilt to match its design image). Teacher = a plump caramel owl (calm, learned, to the point).
//   A big rounded-square head almost as wide as the body, high forehead, low eyes; cream eye discs, big amber-brown eyes,
//   thick purple rounded-square glasses, feather brows (one can lift), a small orange hooked beak, three ear tufts each
//   forming a crest, a ring of feather tips round the cheeks; wings as arms ending in feather "fingers", the left wing
//   holding an orange pencil (purple end); an embossed "open book" emblem on the chest. Feathers are satin sheen (not hard
//   gloss); only the eyes, glasses frame, beak and pencil are glossy.
// Student = a lilac bunny (from the glossy animals). Embodiment = a teal firefly (its tail light is its state light).
// Signature = the chest book emblem glows the state, plus punctuation rising above the head: think = blue pulse + "…"
//   with its three dots lighting in turn, ear tufts up, a wing-finger tapping the temple; aha = green light + a popping
//   "!" + sparkle, all tufts up, a satisfied nod; doubt = amber flicker + a wobbling "?", one tuft drooping, one brow
//   raised and the other eye narrowed.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const meta = {
  id: 'glossy-owl', no: '1e', name: '亮面公仔・貓頭鷹', kind: '3d',
  note: 'chest book emblem glows in the state colour + a mark floats above the head: blue pulse + "…" with tufts up and wing-finger at the temple (think), green + "!" pop and a nod (aha), amber flicker + wobbling "?" with one tuft drooping and one brow raised (doubt)',
};

const STATE = { idle: '#bfe2ff', think: '#2f7bff', aha: '#1fe07a', doubt: '#ffa31a' };
const OWL_STATE = { idle: '#ffd9a0', think: '#3d8bff', aha: '#22e27c', doubt: '#ffa31a' };
const SPH_HI = new THREE.SphereGeometry(1, 32, 22);
const SPH = new THREE.SphereGeometry(1, 24, 16);
const SPH_S = new THREE.SphereGeometry(1, 14, 10);
const SPH_LO = new THREE.SphereGeometry(1, 12, 8);
const LID = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const LID_LO = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

function gloss(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: o.r ?? 0.32, metalness: o.m ?? 0, clearcoat: 1, clearcoatRoughness: o.cr ?? 0.04,
    envMapIntensity: o.env ?? 1.0, vertexColors: !!o.vc, flatShading: !!o.flat,
  });
}
function mesh(geo, mat, parent, pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scl); m.rotation.set(...rot); parent.add(m); return m;
}
function lathe(pts, seg = 32, np = 32) {
  const c = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const P = c.getPoints(np); P[0].x = 0; P[P.length - 1].x = 0; return new THREE.LatheGeometry(P, seg);
}
function colorByY(geo, y0, y1, cA, cB) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), A = new THREE.Color(cA), B = new THREE.Color(cB), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const k = clamp01((p.getY(i) - y0) / (y1 - y0)); c.copy(A).lerp(B, k * k * (3 - 2 * k)); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
// tube along a curve with a radius profile (closed tips when r -> 0), optional colour by u
function sweep(pts, rFn, { radial = 16, seg = 32, colFn, fx = 1, fy = 1, planar = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const fr = curve.computeFrenetFrames(seg, false); const pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), r = rFn(u);
    let N = fr.normals[i], B = fr.binormals[i];
    if (planar) { const T = curve.getTangentAt(u); B = new THREE.Vector3(0, 0, 1); N = new THREE.Vector3().crossVectors(T, B).normalize(); }
    const c = colFn ? colFn(u) : null;
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, x = Math.cos(a) * r * fx, y = Math.sin(a) * r * fy;
      pos.push(P.x + N.x * x + B.x * y, P.y + N.y * x + B.y * y, P.z + N.z * x + B.z * y);
      if (c) col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g = mergeVertices(g); g.computeVertexNormals(); return g;
}
function canvasTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {};
function tex(kind) {
  if (TEX[kind]) return TEX[kind];
  if (kind === 'soft') TEX[kind] = canvasTex((x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.85)'); g.addColorStop(0.45, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
  if (kind === 'star') TEX[kind] = canvasTex((x, n) => {
    x.translate(n / 2, n / 2);
    for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); const L = (i % 3 === 0 ? 0.5 : i % 3 === 1 ? 0.3 : 0.38) * n, w = n * 0.035;
      const g = x.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-w, 0); x.lineTo(0, -L); x.lineTo(w, 0); x.closePath(); x.fill(); }
  }, 256);
  if (kind === 'glint') TEX[kind] = canvasTex((x, n) => {   // slim 4-point glint
    x.translate(n / 2, n / 2);
    for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); const L = (i % 2 ? 0.3 : 0.5) * n, w = n * 0.03;
      const g = x.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-w, 0); x.lineTo(0, -L); x.lineTo(w, 0); x.closePath(); x.fill(); }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, n * 0.12); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-n / 2, -n / 2, n, n);
  }, 256);
  if (kind === 'shadow') TEX[kind] = canvasTex((x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(60,40,30,.5)'); g.addColorStop(0.55, 'rgba(60,40,30,.2)'); g.addColorStop(1, 'rgba(60,40,30,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
  if (kind === 'iris') TEX[kind] = canvasTex((x, n) => {
    const c = n / 2; x.fillStyle = '#1c100a'; x.fillRect(0, 0, n, n);
    const R = n * 0.42;
    const g = x.createRadialGradient(c, c, 0, c, c, R); g.addColorStop(0, '#ffe07a'); g.addColorStop(0.42, '#ffbe2e'); g.addColorStop(0.78, '#f0861a'); g.addColorStop(1, '#a8460a');
    x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; x.strokeStyle = i % 2 ? 'rgba(255,240,170,.22)' : 'rgba(150,60,0,.2)'; x.lineWidth = n * 0.008;
      x.beginPath(); x.moveTo(c + Math.cos(a) * R * 0.42, c + Math.sin(a) * R * 0.42); x.lineTo(c + Math.cos(a) * R * 0.95, c + Math.sin(a) * R * 0.95); x.stroke(); }
    x.strokeStyle = '#4a1a05'; x.lineWidth = n * 0.035; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#0b0605'; x.beginPath(); x.arc(c, c, n * 0.165, 0, Math.PI * 2); x.fill();
  }, 256);
  if (kind === 'owlhead') TEX[kind] = canvasTex((x, n) => {
    // sphere UVs (u around, canvas top = crown). Only the back/top shows; the facial disc covers the front.
    const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, '#43220f'); g.addColorStop(0.45, '#5a3019'); g.addColorStop(1, '#6e3c20');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    x.lineCap = 'round';
    // U-shaped feather scallops; sphere UVs stretch u about 2.3x, so draw them narrow; wrap across the seam
    x.strokeStyle = 'rgba(30,12,4,.12)'; x.lineWidth = n * 0.005;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 30; c++) for (const w of [-n, 0, n]) {
      const cx = (c + (r % 2) * 0.5) / 30 * n + w, cy = n * (0.16 + r * 0.08);
      x.beginPath(); x.ellipse(cx, cy, n * 0.017, n * 0.036, 0, 0.12 * Math.PI, 0.88 * Math.PI); x.stroke();
    }
  }, 512);
  if (kind === 'owlbody') TEX[kind] = canvasTex((x, n) => {
    // lathe UVs: u around (0.5 = front after the mesh is turned), v up the profile (canvas top = v 1)
    const g = x.createLinearGradient(0, n, 0, 0); g.addColorStop(0, '#2e170e'); g.addColorStop(0.16, '#4f2a17'); g.addColorStop(0.5, '#73401f'); g.addColorStop(1, '#6d3b1f');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    // soft feather scallops on back and sides
    x.lineCap = 'round';
    x.strokeStyle = 'rgba(40,18,8,.15)'; x.lineWidth = n * 0.006;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 20; c++) for (const w of [-n, 0, n]) {
      const cx = (c + (r % 2) * 0.5) / 20 * n + w, cy = n * (0.2 + r * 0.075);
      x.beginPath(); x.ellipse(cx, cy, n * 0.02, n * 0.028, 0, 0.12 * Math.PI, 0.88 * Math.PI); x.stroke();
    }
    // bib: cream throat to ochre belly, soft edge
    x.save(); x.filter = `blur(${n * 0.022}px)`;
    const b = x.createLinearGradient(0, n * 0.1, 0, n * 0.6); b.addColorStop(0, '#fff3dc'); b.addColorStop(0.35, '#fbe2bb'); b.addColorStop(0.75, '#eab070'); b.addColorStop(1, '#d08a45');
    x.fillStyle = b; x.beginPath(); x.ellipse(n * 0.5, n * 0.35, n * 0.105, n * 0.25, 0, 0, Math.PI * 2); x.fill(); x.restore();
    // chevron barring on the belly
    for (let r = 0; r < 4; r++) {
      const y = n * (0.33 + r * 0.055), half = n * (0.064 - Math.abs(r - 1.5) * 0.012);
      for (let cx = n * 0.5 - half + (r % 2) * n * 0.02; cx <= n * 0.5 + half + 1; cx += n * 0.04) {
        x.strokeStyle = `rgba(125,60,24,${0.36 + r * 0.06})`; x.lineWidth = n * 0.0075;
        x.beginPath(); x.moveTo(cx - n * 0.012, y - n * 0.008); x.lineTo(cx, y + n * 0.006); x.lineTo(cx + n * 0.012, y - n * 0.008); x.stroke();
      }
    }
  }, 512);
  return TEX[kind];
}
function sprite(kind, color, parent, pos, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(kind), color, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  s.position.set(...pos); s.scale.setScalar(size); s.userData.size = size; parent.add(s); return s;
}
function blobShadow(parent, w) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex('shadow'), transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, w * 1.3, 1); m.position.y = 0.004; m.renderOrder = -1; m.userData.w = w; parent.add(m); return m;
}
// sphere with planar front UVs (for iris / bib textures)
function frontUV(geo) {
  const g = geo.clone(), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 2, 0.5 + p.getY(i) / 2);
  uv.needsUpdate = true; return g;
}

// --- facial parts on an ellipsoid head (centre c, semi-axes abc) ---
function surfR(az, el, abc) { const x = Math.cos(el) * Math.sin(az), y = Math.sin(el), z = Math.cos(el) * Math.cos(az); return 1 / Math.sqrt((x / abc[0]) ** 2 + (y / abc[1]) ** 2 + (z / abc[2]) ** 2); }
function onSurface(parent, c, abc, az, el, sink, obj) {
  const piv = new THREE.Group(); piv.position.set(...c); parent.add(piv); piv.add(obj);
  const upd = (daz = 0, del = 0) => { const A = az + daz, E = el + del; piv.rotation.set(-E, A, 0, 'YXZ'); obj.position.set(0, 0, surfR(A, E, abc) - sink); };
  upd(); return upd;
}
const EYE_MAT = new THREE.MeshPhysicalMaterial({ color: '#0d0b12', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
const SHINE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
function makeEye(parent, c, abc, az, el, size, lidMat) {
  const g = new THREE.Group(); const sc = new THREE.Group(); sc.scale.set(...size); g.add(sc);
  mesh(SPH_S, EYE_MAT, sc);
  const lid = mesh(LID, lidMat, sc, [0, 0, 0], [1.13, 1.13, 1.13]);
  const c1 = mesh(SPH_LO, SHINE, sc, [-0.34, 0.4, 0.8], [0.27, 0.3, 0.14]);
  const c2 = mesh(SPH_LO, SHINE, sc, [0.36, -0.36, 0.82], [0.12, 0.12, 0.1]);
  const upd = onSurface(parent, c, abc, az, el, size[2] * 0.45, g);
  return { g, sc, lid, c1, c2, upd, size };
}
function makeBrow(parent, c, abc, az, el, len, th, mat) {
  const g = new THREE.Group();
  const m = mesh(new THREE.CapsuleGeometry(th, len, 4, 10), mat, g, [0, 0, 0], [1, 1, 0.55], [0, 0, Math.PI / 2]);
  const upd = onSurface(parent, c, abc, az, el, th * 0.2, g);
  return { g, m, upd, az, el };
}
function makeArm(parent, side, at, len, rad, mat, pawMat, pawR) {
  const sh = new THREE.Group(); sh.position.set(...at); parent.add(sh);
  const raise = new THREE.Group(); sh.add(raise);
  mesh(new THREE.CapsuleGeometry(rad, len, 5, 12), mat, raise, [0, -len / 2, 0]);
  const paw = new THREE.Group(); paw.position.y = -len; raise.add(paw);
  mesh(SPH_S, pawMat, paw, [0, 0, 0], [pawR, pawR * 0.95, pawR]);
  const finger = mesh(new THREE.CapsuleGeometry(pawR * 0.36, pawR * 0.9, 4, 10), pawMat, paw, [0, -pawR * 0.9, pawR * 0.25]);
  return { sh, raise, paw, finger, side, pawR };
}
function makeGem(parent, pos, r, bezelMat, states = STATE) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  mesh(new THREE.TorusGeometry(r * 1.12, r * 0.28, 8, 22), bezelMat, g);
  const mat = new THREE.MeshPhysicalMaterial({ color: states.idle, emissive: states.idle, emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0, flatShading: true });
  const gem = mesh(new THREE.OctahedronGeometry(1, 0), mat, g, [0, 0, r * 0.15], [r * 0.95, r * 1.12, r * 0.62], [0, Math.PI / 4, 0]);
  const halo = sprite('soft', states.idle, g, [0, 0, r * 1.2], r * 7);
  const star = sprite('star', states.aha, g, [0, 0, r * 1.4], r * 11);
  return { g, mat, gem, halo, star };
}

// shared animation for the rabbit and the firefly (copied from glossy-animal; states map is a parameter)
function rig(P) {
  const ST = P.states || STATE;
  const tmpC = new THREE.Color(), idleC = new THREE.Color(ST.idle);
  return {
    root: P.root, height: P.H,
    pose(s) {
      const t = s.t, st = s.state || 'idle', K = clamp01(s.stateK || 0);
      const th = st === 'think' ? K : 0, ah = st === 'aha' ? K : 0, db = st === 'doubt' ? K : 0;
      P.root.rotation.y = s.turn * 0.6;
      const sq = s.squash; P.fig.scale.set(1 + 0.22 * sq, 1 - 0.32 * sq, 1 + 0.22 * sq);
      P.body.position.y = s.hop * P.hopH;
      P.body.rotation.z = s.tilt * 0.24;
      P.torso.scale.set(1 + 0.012 * Math.sin(t * 2.4 + P.seed), 1 + 0.018 * Math.sin(t * 2.4 + P.seed), 1);
      P.shadow.scale.set(P.shadow.userData.w * (1 - 0.35 * s.hop), P.shadow.userData.w * 1.3 * (1 - 0.35 * s.hop), 1);
      P.shadow.material.opacity = 1 - 0.5 * s.hop;
      P.head.rotation.set(-s.lookY * 0.2 - th * 0.12 + db * 0.05, s.lookX * 0.32 + th * 0.12, s.tilt * 0.08 + th * 0.14 - db * 0.16);
      const gx = s.lookX * 0.11 + th * 0.09, gy = s.lookY * 0.09 + th * 0.12 - db * 0.02;
      P.eyes.forEach((e, i) => {
        e.upd(gx, gy);
        const sz = 1 + ah * 0.14;
        e.sc.scale.set(e.size[0] * sz, e.size[1] * sz, e.size[2] * sz);
        const squint = i === 1 ? db * 0.4 : db * 0.08;
        const close = Math.max(clamp01(s.blink), squint, th * 0.12);
        e.lid.rotation.x = -Math.PI / 2 + close * Math.PI * 0.98;
        const sparkle = 1 + ah * 0.45; e.c1.scale.set(0.27 * sparkle, 0.3 * sparkle, 0.14); e.c1.position.y = 0.4 - Math.min(close, 0.5) * 0.75; e.c2.scale.setScalar(0.12 * (1 + ah * 0.6)); e.c2.scale.z = 0.1;
      });
      if (P.brows) P.brows.forEach((b, i) => {
        const side = i === 0 ? -1 : 1;
        let up = ah * 0.09 + th * (i === 0 ? 0.07 : 0.02), ang = th * (i === 0 ? 0.25 : -0.1) + ah * 0.15;
        if (i === 1) { up += db * 0.01; ang += -db * 0.4; } else { up += db * 0.11; ang += db * -0.15; }
        b.upd(gx * 0.5, up);
        b.g.rotation.z = side < 0 ? ang : -ang;
        b.m.material.opacity = 1;
      });
      const open = Math.max(clamp01(s.talk), ah * 0.75, th * 0.18);
      P.mouthPose(open, s, { th, ah, db });
      const armPose = (a, raiseAmt, pt, wv, think) => {
        let ang = 0.28 + raiseAmt * 1.95;
        ang = lerp(ang, 1.72, pt);
        ang = lerp(ang, 2.2, wv) + wv * 0.38 * Math.sin(t * 12 + P.seed);
        ang = lerp(ang, -0.45, think);
        a.raise.rotation.set(0, 0, a.side * ang);
        a.sh.rotation.set(-think * 1.75 - pt * 0.25, 0, 0);
        a.paw.rotation.set(0, 0, wv * 0.35 * Math.sin(t * 12 + P.seed + 0.8));
        a.finger.scale.setScalar(Math.max(0.001, pt));
      };
      const thinkArm = th * clamp01((s.armR || 0) / 0.4);
      armPose(P.arms[0], s.armL, 0, 0, 0);
      armPose(P.arms[1], s.armR, s.point, s.wave, thinkArm);
      P.extras(s, { th, ah, db, t });
      const G = P.gem; const target = new THREE.Color(ST[st] || ST.idle);
      tmpC.copy(idleC).lerp(target, K);
      const pulse = 0.5 + 0.5 * Math.sin(t * 7.5);
      const beat = 0.5 + 0.5 * Math.sin(t * 11);
      const flick = 0.75 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 7.7);
      G.mat.color.copy(tmpC); G.mat.emissive.copy(tmpC);
      G.mat.emissiveIntensity = (P.gemBase ?? 0.35) + th * (0.5 + 1.3 * pulse) + ah * (1.8 + 0.8 * beat) + db * 0.9 * flick;
      G.halo.material.color.copy(tmpC);
      G.halo.material.opacity = (P.haloBase ?? 0.4) + th * (0.3 + 0.3 * pulse) + ah * 0.5 + db * 0.45 * flick;
      G.halo.scale.setScalar(G.halo.userData.size * (1 + th * (0.4 + 0.8 * pulse) + ah * (1.1 + 0.3 * beat) + db * 0.5));
      G.star.material.opacity = ah * (0.75 + 0.25 * beat);
      G.star.material.rotation = t * 1.2;
      G.star.scale.setScalar(G.star.userData.size * (0.55 + 0.45 * ah + 0.1 * beat));
      G.gem.rotation.y = Math.PI / 4 + Math.sin(t * 1.3) * 0.25 + ah * t * 2.5;
    },
  };
}

// =====================================================================
// OWL (teacher) — v2, after the user's design image
// =====================================================================
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V3(0, 1, 0), Z = V3(0, 0, 1);
const pw = (v, p) => Math.pow(Math.abs(v), p);
const backOut = k => { const c = 1.9, x = k - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

// --- the head is a superellipsoid: a big soft rounded box (wide cheeks, high forehead) ---
// upper half rounder (dome crown), lower half a little deeper (chubby cheeks and chin)
const HD = { a: 0.69, b: 0.48, bl: 0.53, c: 0.56, e: 2.8, f: 2.2, fl: 2.5 };
const hb_ = y => y >= 0 ? HD.b : HD.bl, hf_ = y => y >= 0 ? HD.f : HD.fl;
function seR(x, y, z) { const f = hf_(y), S = Math.pow(pw(x / HD.a, HD.e) + pw(z / HD.c, HD.e), f / HD.e) + pw(y / hb_(y), f); return Math.pow(S, -1 / f); }
function seN(x, y, z, out = V3()) {
  const f = hf_(y), b = hb_(y);
  const sxz = pw(x / HD.a, HD.e) + pw(z / HD.c, HD.e), k = sxz > 1e-9 ? Math.pow(sxz, f / HD.e - 1) : 0;
  out.set(k * pw(x / HD.a, HD.e - 1) * Math.sign(x) / HD.a, pw(y / b, f - 1) * Math.sign(y) / b, k * pw(z / HD.c, HD.e - 1) * Math.sign(z) / HD.c);
  return out.normalize();
}
// front-projected point on the head surface (z >= 0), pushed out along the normal by off
function seFront(x, y, off = 0) {
  const sxz = Math.pow(Math.max(0, 1 - pw(y / hb_(y), hf_(y))), HD.e / hf_(y));
  const z = HD.c * Math.pow(Math.max(0, sxz - pw(x / HD.a, HD.e)), 1 / HD.e);
  const p = V3(x, y, z); if (off) p.addScaledVector(seN(x, y, z), off); return p;
}
function headShell(wS, hS, colFn) {
  const g = new THREE.SphereGeometry(1, wS, hS); g.rotateY(-Math.PI / 2); // uv seam to the back, face at u = 0.5
  const p = g.attributes.position, nr = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color(), N = V3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = seR(x, y, z), X = x * r, Yy = y * r, Zz = z * r;
    p.setXYZ(i, X, Yy, Zz); seN(X, Yy, Zz, N); nr.setXYZ(i, N.x, N.y, N.z);
    colFn(X, Yy, Zz, c); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}

// tube along a curve with a radius profile; grid normals (no merge) so it can carry uvs
function sweep2(pts, rFn, { radial = 12, seg = 16, colFn, fx = 1, fy = 1, bAxis = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V3(...p)));
  const fr = bAxis ? null : curve.computeFrenetFrames(seg, false);
  const R = radial + 1, P = [], Cc = [], col = [], uv = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, c = curve.getPointAt(u), T = curve.getTangentAt(u), r = rFn(u);
    let N, B;
    if (bAxis) { B = V3(...bAxis); N = V3().crossVectors(T, B).normalize(); B = V3().crossVectors(N, T).normalize(); }
    else { N = fr.normals[i]; B = fr.binormals[i]; }
    const cc = colFn ? colFn(u) : null;
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      P.push(c.clone().addScaledVector(N, Math.cos(a) * r * fx).addScaledVector(B, Math.sin(a) * r * fy)); Cc.push(c);
      if (cc) col.push(cc.r, cc.g, cc.b); uv.push(j / radial, u);
    }
  }
  const id = (i, j) => i * R + j, nrm = new Float32Array(P.length * 3), d1 = V3(), d2 = V3(), n = V3();
  for (let i = 0; i <= seg; i++) for (let j = 0; j <= radial; j++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(seg, i + 1), jm = j === 0 ? radial - 1 : j - 1, jp = j === radial ? 1 : j + 1;
    d1.subVectors(P[id(i1, j)], P[id(i0, j)]); d2.subVectors(P[id(i, jp)], P[id(i, jm)]);
    n.crossVectors(d2, d1);
    if (n.lengthSq() < 1e-14) { n.subVectors(Cc[id(i1, j)], Cc[id(i0, j)]); if (i === 0) n.negate(); }
    else if (n.dot(d1.subVectors(P[id(i, j)], Cc[id(i, j)])) < 0) n.negate();
    n.normalize(); nrm.set([n.x, n.y, n.z], id(i, j) * 3);
  }
  const pos = new Float32Array(P.length * 3); P.forEach((p, k) => pos.set([p.x, p.y, p.z], k * 3));
  const idx = []; for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = id(i, j), b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (colFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); return g;
}
// a soft feather blade pointing down local -Y (rounded tip), thin in z
function blade(L, w, { seg = 8, radial = 8, fy = 0.36, bend = 0.012, cA, cB, tipK = 0.5 } = {}) {
  const A = new THREE.Color(cA || '#ffffff'), B = new THREE.Color(cB || cA || '#ffffff');
  return sweep2([[0, 0.01, 0], [0, -L * 0.5, bend], [0, -L, 0]], u => w * Math.pow(Math.sin(Math.PI * (0.03 + 0.97 * u)), 0.5) * (1 - 0.25 * u),
    { bAxis: [0, 0, 1], fy, seg, radial, colFn: u => A.clone().lerp(B, smooth(tipK, 1, u)) });
}
function boneQ(d, nHint, out = new THREE.Quaternion()) {
  const Yb = V3().copy(d).negate().normalize();
  const Zb = V3().copy(nHint).addScaledVector(Yb, -nHint.dot(Yb));
  if (Zb.lengthSq() < 1e-6) Zb.set(0, 0, 1).addScaledVector(Yb, -Yb.z);
  Zb.normalize(); const Xb = V3().crossVectors(Yb, Zb);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xb, Yb, Zb));
}
function ik2(T, L1, L2, pole) {
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, T.length())), dir = T.clone().normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const E = dir.clone().multiplyScalar(a).addScaledVector(pp, h), W = dir.clone().multiplyScalar(d);
  return { dU: E.clone().normalize(), dF: W.clone().sub(E).normalize() };
}

// --- owl textures (canvas): feather scallops as a soft multiply map + a bump map ---
function canvasData(w, h, draw, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function scallops(x, w, h, rows, colsAt, { v0 = 0, v1 = 1, fwK = 0.62, fhK = 1.25, bump = false, stroke = 'rgba(70,30,6,.16)', lw = 2, alphaAt } = {}) {
  // rows from bottom to top so each upper feather overlaps the one below (roof tiles); every feather's lower edge shows
  for (let r = rows - 1; r >= 0; r--) {
    const v = v0 + (v1 - v0) * (r + 0.5) / rows, cols = colsAt(v), cy = v * h, fh = (v1 - v0) * h / rows * fhK * 0.5;
    for (let c = 0; c < cols; c++) for (const wrap of [-w, 0, w]) {
      const cx = (c + (r % 2) * 0.5) / cols * w + wrap, fw = w / cols * fwK;
      if (cx < -fw * 2 || cx > w + fw * 2) continue;
      const al = alphaAt ? alphaAt(cx / w, v) : 1; if (al <= 0.01) continue;
      x.save(); x.globalAlpha = al;
      if (bump) {
        const g = x.createLinearGradient(0, cy - fh, 0, cy + fh); g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.7, '#b4b4b4'); g.addColorStop(1, '#c8c8c8');
        x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, fw, fh, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#3c3c3c'; x.lineWidth = lw * 1.4; x.beginPath(); x.ellipse(cx, cy, fw, fh, 0, 0.08 * Math.PI, 0.92 * Math.PI); x.stroke();
      } else {
        x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, cy, fw, fh, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = stroke; x.lineWidth = lw; x.beginPath(); x.ellipse(cx, cy, fw, fh, 0, 0.1 * Math.PI, 0.9 * Math.PI); x.stroke();
      }
      x.restore();
    }
  }
}
const OTEX = {};
function otex(kind) {
  if (OTEX[kind]) return OTEX[kind];
  // head: equirect uvs (u around, canvas top = crown). feathers keep a similar physical size: fewer columns near the poles
  const headCols = v => Math.max(8, Math.round(40 * Math.sin(Math.PI * Math.min(0.97, Math.max(0.05, v)))));
  // soften the pattern on the face front (u ~ 0.75 after the uv seam rotation, lower half)
  const headAlpha = (u, v) => { const du = Math.abs(u - 0.5); return 1 - 0.75 * smooth(0.2, 0.1, du) * smooth(0.42, 0.55, v); };
  if (kind === 'headMap') OTEX[kind] = canvasData(1024, 512, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); scallops(x, w, h, 14, headCols, { alphaAt: headAlpha, stroke: 'rgba(60,24,4,.09)' }); }, true);
  if (kind === 'headBump') OTEX[kind] = canvasData(1024, 512, (x, w, h) => { x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, w, h); scallops(x, w, h, 14, headCols, { bump: true, alphaAt: headAlpha }); x.filter = 'blur(1.5px)'; x.drawImage(x.canvas, 0, 0); });
  // body (lathe uvs: u around from the back, v up; canvas top = v 1)
  if (kind === 'bodyMap') OTEX[kind] = canvasData(1024, 1024, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); scallops(x, w, h, 17, () => 22, { stroke: 'rgba(110,50,10,.055)', lw: 3 }); }, true);
  if (kind === 'bodyBump') OTEX[kind] = canvasData(1024, 1024, (x, w, h) => { x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, w, h); scallops(x, w, h, 17, () => 22, { bump: true, lw: 3 }); x.filter = 'blur(2px)'; x.drawImage(x.canvas, 0, 0); });
  // wing bones (sweep uvs: u around the section, v along the bone)
  if (kind === 'wingMap') OTEX[kind] = canvasData(256, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); scallops(x, w, h, 5, () => 8, { stroke: 'rgba(60,24,4,.22)', lw: 2 }); }, true);
  if (kind === 'iris') OTEX[kind] = canvasData(256, 256, (x, n) => {
    const c = n / 2; // planar front uvs over the ball (radius 1 -> n/2)
    const sg = x.createRadialGradient(c, c, 0, c, c, c); sg.addColorStop(0, '#fdf0d8'); sg.addColorStop(0.5, '#f8e2c0'); sg.addColorStop(0.72, '#ebc896'); sg.addColorStop(1, '#dcb07a');
    x.fillStyle = sg; x.fillRect(0, 0, n, n);
    const R = n * 0.25;
    const g = x.createRadialGradient(c, c, 0, c, c, R); g.addColorStop(0, '#0e0603'); g.addColorStop(0.6, '#24100a'); g.addColorStop(0.8, '#5a2c0c'); g.addColorStop(0.93, '#9a5418'); g.addColorStop(1, '#2e1206');
    x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.strokeStyle = i % 2 ? 'rgba(255,200,120,.16)' : 'rgba(60,20,0,.18)'; x.lineWidth = n * 0.008;
      x.beginPath(); x.moveTo(c + Math.cos(a) * R * 0.55, c + Math.sin(a) * R * 0.55); x.lineTo(c + Math.cos(a) * R * 0.93, c + Math.sin(a) * R * 0.93); x.stroke(); }
    x.strokeStyle = '#3a1806'; x.lineWidth = n * 0.02; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#080405'; x.beginPath(); x.arc(c, c, R * 0.6, 0, Math.PI * 2); x.fill();
  }, true);
  return OTEX[kind];
}

const BODY_PTS = [[0, 0.06], [0.33, 0.07], [0.5, 0.15], [0.585, 0.3], [0.6, 0.45], [0.578, 0.62], [0.535, 0.8], [0.47, 0.97], [0.36, 1.14], [0.2, 1.26], [0, 1.3]];
const BODY_CURVE = new THREE.SplineCurve(BODY_PTS.map(p => new THREE.Vector2(p[0], p[1])));
function bodyR(y) { let best = 0, bd = 1e9; for (let i = 0; i <= 200; i++) { const p = BODY_CURVE.getPoint(i / 200), d = Math.abs(p.y - y); if (d < bd) { bd = d; best = p.x; } } return best; }

function buildOwl() {
  const C = {
    top: '#7e4200', side: '#622a00', low: '#4a2000', face: '#eba04a', chin: '#f0aa55',
    mound: '#f2a646', moundEdge: '#d68838', lid: '#dc8e40', lash: '#3e1a06',
    wing: '#723200', wingDark: '#4a2000', finger: '#682e00', fingerTip: '#461e00', tuftTip: '#542800',
    brow: '#3a1805', beak: '#e06000', mouth: '#4a140a', frame: '#301c5e',
    foot: '#c24600', belly: '#dc7a18', bellyLo: '#b05a10', emblem: '#f6b25c',
    pencil: '#e06000', pencilHi: '#ff9a2a', wood: '#eeb878', lead: '#3e3253', ferrule: '#301c6e', eraser: '#48309a',
  };
  const feather = (o = {}) => new THREE.MeshPhysicalMaterial({
    color: '#ffffff', vertexColors: true, roughness: 0.56, metalness: 0, sheen: 0.3, sheenColor: new THREE.Color('#ffa04a'), sheenRoughness: 0.45,
    envMapIntensity: 0.2, specularIntensity: 0.45, ...o,
  });
  const shiny = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.r ?? 0.22, metalness: 0, clearcoat: o.cc ?? 1, clearcoatRoughness: o.cr ?? 0.06, envMapIntensity: o.env ?? 1.0, specularIntensity: o.spec ?? 1, flatShading: !!o.flat });
  const mHead = feather({ map: otex('headMap'), bumpMap: otex('headBump'), bumpScale: 0.6 });
  const mBody = feather({ map: otex('bodyMap'), bumpMap: otex('bodyBump'), bumpScale: 0.4 });
  const mWing = feather({ map: otex('wingMap') });
  const mFeat = feather();
  const root = new THREE.Group(), fig = new THREE.Group(), body = new THREE.Group(); root.add(fig); fig.add(body);
  const shadow = blobShadow(root, 1.25);

  // ---------------- body: one chubby egg; the head sinks deep into it ----------------
  const HS = 1.1, HY = 1.45, BY = 0.9; // head scale, head centre, body height scale
  const torso = new THREE.Group(); body.add(torso);
  const cSide = new THREE.Color(C.side), cLow = new THREE.Color(C.low), cBel = new THREE.Color(C.belly), cBelLo = new THREE.Color(C.bellyLo), cChin = new THREE.Color(C.chin);
  {
    const g = lathe(BODY_PTS, 36, 22);
    g.scale(1, BY, 0.92);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ang = Math.abs(Math.atan2(x, z));
      c.copy(cSide).lerp(cLow, 0.45 * smooth(0.45, 0.05, y));
      const lim = 0.95 + 0.2 * smooth(0.2, 0.85, y);
      const bel = (1 - smooth(lim - 0.25, lim + 0.12, ang)) * smooth(0.04, 0.14, y);
      c.lerp(cBelLo.clone().lerp(cBel, smooth(0.15, 0.7, y)).lerp(cChin, smooth(0.8, 1.05, y)), bel);
      const hb = HY - HD.bl * HS * Math.pow(Math.max(0, 1 - pw(x / (HD.a * HS), HD.e)), 1 / HD.fl); // head underside above this point
      c.multiplyScalar(1 - 0.3 * smooth(hb - 0.16, hb, y));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mesh(g, mBody, torso);
  }
  // feet: plump orange toes peeking out under the belly
  const toeGeo = new THREE.CapsuleGeometry(0.062, 0.085, 3, 10);
  const mFoot = shiny(C.foot, { r: 0.4, cr: 0.25, cc: 0.4, env: 0.3, spec: 0.4 });
  for (const sx of [-1, 1]) {
    const foot = new THREE.Group(); foot.position.set(sx * 0.23, 0.06, 0.31); foot.rotation.y = sx * 0.14; body.add(foot);
    [-0.42, 0, 0.42].forEach((a, k) => {
      const toe = new THREE.Group(); toe.rotation.y = a; foot.add(toe);
      mesh(toeGeo, mFoot, toe, [0, 0, 0.07 * (k === 1 ? 1.12 : 0.95)], [1, 0.9, 1], [Math.PI / 2, 0, 0]);
    });
  }
  // tail feathers at the back
  { const tb = blade(0.26, 0.075, { cA: C.wing, cB: C.wingDark });
    [-1, 0, 1].forEach(k => mesh(tb, mFeat, torso, [k * 0.08, 0.3, -0.4], [1, 1, 1], [-0.7, 0, k * 0.3])); }

  // chest emblem: an embossed open book inside a rounded badge ring (glows in the state colour)
  const EMB_Y = 0.56, EMB_Z = bodyR(EMB_Y / BY) * 0.92 - 0.006;
  const embMat = new THREE.MeshPhysicalMaterial({ color: C.emblem, roughness: 0.42, sheen: 0.5, sheenColor: new THREE.Color('#fff2d8'), emissive: '#000000', emissiveIntensity: 1, envMapIntensity: 0.6 });
  const emb = new THREE.Group(); emb.position.set(0, EMB_Y, EMB_Z); emb.rotation.x = -0.1; torso.add(emb);
  {
    const bend = (g, R = 0.5) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) ** 2 / (2 * R) - p.getY(i) ** 2 / (2 * 1.4)); g.computeVertexNormals(); return g; };
    const page = sx => {
      const P = [[0.008, -0.052], [0.06, -0.04], [0.112, -0.058], [0.112, 0.048], [0.06, 0.066], [0.008, 0.054]];
      const pts = (sx > 0 ? P : P.slice().reverse()).map(q => new THREE.Vector2(q[0] * sx, q[1]));
      return bend(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.007, bevelSegments: 1, curveSegments: 4 }));
    };
    mesh(page(-1), embMat, emb, [0, 0.005, 0]); mesh(page(1), embMat, emb, [0, 0.005, 0]);
    const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; ring.push(V3(Math.cos(a) * 0.158, Math.sin(a) * 0.15 + 0.004, 0)); }
    const rg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 36, 0.014, 5, true); bend(rg); mesh(rg, embMat, emb, [0, 0, 0.004]);
  }
  const embHalo = sprite('soft', '#ffffff', emb, [0, 0, 0.06], 0.75);
  const embStar = sprite('star', '#ffffff', emb, [0, 0, 0.08], 0.6);

  // ---------------- head ----------------
  const head = new THREE.Group(); head.position.set(0, HY, 0.0); head.rotation.order = 'YXZ'; head.scale.setScalar(HS); body.add(head);
  const cTop = new THREE.Color(C.top), cFace = new THREE.Color(C.face);
  mesh(headShell(48, 34, (x, y, z, c) => {
    const yn = y / hb_(y);
    c.copy(cSide).lerp(cTop, smooth(-0.1, 0.85, yn));
    c.lerp(cLow, 0.35 * smooth(0.1, -0.9, yn) * (z < 0 ? 1 : 0.4) + 0.2 * smooth(0, -0.6, z / HD.c));
    // a darker V of forehead feathers between the eye mounds, pointing at the beak
    if (z > 0) c.lerp(cLow, 0.38 * (1 - smooth(0.02, 0.09, Math.abs(x) - 0.25 * (y - 0.0))) * smooth(-0.14, -0.04, y) * smooth(0.36, 0.2, y));
    // cream lower face (under the glasses, around the beak, down to the chin)
    const fz = smooth(0.1, 0.45, z / HD.c), d = (x / 0.47) ** 2 + ((y + 0.5) / 0.3) ** 2;
    c.lerp(cFace.clone().lerp(cChin, smooth(-0.25, -0.45, y)), (1 - smooth(0.68, 1.02, d)) * fz);
  }), mHead, head);

  // eye mounds: two big cream discs that bulge a little (their tops show above the frames like brow ridges)
  const MOUND = [[-0.35, -0.035], [0.35, -0.035]], RM = 0.29;
  const moundH = k => k >= 1 ? 0 : 0.004 + 0.04 * Math.pow(1 - k * k, 0.85);
  const faceAt = (x, y, extra = 0) => { let off = 0; for (const m of MOUND) off = Math.max(off, moundH(Math.hypot(x - m[0], y - m[1]) / RM)); return seFront(x, y, off + extra); };
  {
    const cM = new THREE.Color(C.mound), cE = new THREE.Color(C.moundEdge);
    for (const [mx, my] of MOUND) {
      const M = 32, NR = 6, pos = [], col = [], idx = [], c = new THREE.Color();
      const push = (x, y, k) => { const p = seFront(x, y, moundH(Math.min(0.999, k)) + 0.001); pos.push(p.x, p.y, p.z); c.copy(cM).lerp(cE, smooth(0.6, 1, k)); col.push(c.r, c.g, c.b); };
      push(mx, my, 0);
      for (let k = 1; k <= NR; k++) for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2, d = RM * k / NR; push(mx + Math.cos(a) * d, my + Math.sin(a) * d, k / NR); }
      for (let j = 0; j < M; j++) idx.push(0, 1 + j, 1 + (j + 1) % M);
      for (let k = 1; k < NR; k++) for (let j = 0; j < M; j++) { const a = 1 + (k - 1) * M + j, b = 1 + (k - 1) * M + (j + 1) % M; idx.push(a, a + M, b, b, a + M, b + M); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx); g.computeVertexNormals();
      mesh(g, feather({ sheen: 0.5 }), head);
    }
  }

  // eyes: a glossy ball sunk into each mound (only a dome shows), amber-brown iris, plum rim, cream lids with a lash line
  const EYE = [[-0.355, -0.085], [0.355, -0.085]], RB = 0.22, RV = 0.158, SINK = Math.sqrt(RB * RB - RV * RV);
  const ballGeo = frontUV(new THREE.SphereGeometry(1, 18, 12));
  const irisMat = new THREE.MeshPhysicalMaterial({ map: otex('iris'), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 });
  const lidMat = new THREE.MeshPhysicalMaterial({ color: C.lid, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#fff0d0') });
  const lashMat = shiny(C.lash, { r: 0.35, cr: 0.3 }), rimMat = shiny('#4a2c55', { r: 0.3 });
  const LIDG = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), LIDG_LO = new THREE.SphereGeometry(1, 14, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const DOT = new THREE.SphereGeometry(1, 10, 8);
  const eyes = EYE.map(([ex, ey]) => {
    const S = faceAt(ex, ey), Nh = seN(...seFront(ex, ey).toArray()), Ne = Nh.clone().lerp(Z, 0.6).normalize();
    const g = new THREE.Group(); g.position.copy(S).addScaledVector(Ne, -SINK); g.quaternion.setFromUnitVectors(Z, Ne); head.add(g);
    const ball = mesh(ballGeo, irisMat, g, [0, 0, 0], [RB, RB, RB]);
    const c1 = mesh(DOT, SHINE, ball, V3(0.2, 0.23, 0.95).normalize().multiplyScalar(1.004).toArray(), [0.085, 0.085, 0.03]);
    const c2 = mesh(DOT, SHINE, ball, V3(-0.17, -0.2, 0.96).normalize().multiplyScalar(1.004).toArray(), [0.04, 0.04, 0.02]);
    mesh(new THREE.TorusGeometry(RV, 0.0085, 4, 32), rimMat, g, [0, 0, SINK - 0.002]);
    const lidU = mesh(LIDG, lidMat, g, [0, 0, 0], [RB * 1.045, RB * 1.045, RB * 1.045]); lidU.rotation.order = 'ZYX';
    mesh(new THREE.TorusGeometry(1, 0.032, 5, 24, Math.PI), lashMat, lidU, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    const lidD = mesh(LIDG_LO, lidMat, g, [0, 0, 0], [RB * 1.035, RB * 1.035, RB * 1.035]); lidD.rotation.order = 'ZYX';
    return { g, ball, lidU, lidD, c1, c2, sx: Math.sign(ex) };
  });

  // feathery brows: three dark strokes each, sitting on the mound tops above the frames
  const browMat = feather({ sheen: 0.4 });
  const browStroke = blade(0.13, 0.019, { cA: '#6a3008', cB: C.brow, tipK: 0.2, fy: 0.55, seg: 5, radial: 5 });
  const brows = [-1, 1].map(sx => {
    const g = new THREE.Group(); head.add(g);
    const inner = new THREE.Group(); inner.scale.x = sx; g.add(inner);
    // strokes point outward (+x) and overlap like a little feather row
    [[-0.09, -0.004, 1.5, 0.8], [-0.02, 0.006, 1.62, 1.0], [0.05, 0.008, 1.8, 0.95], [0.1, 0.0, 2.0, 0.6]].forEach(([x, y, a, L]) => mesh(browStroke, browMat, inner, [x, y, 0.004], [1, L, 1], [0, 0, a]));
    return { g, sx, bx: sx * 0.35, by: 0.215 };
  });
  const placeBrow = (b, up, ang, dx = 0) => {
    const x = b.bx + dx, y = b.by + up, p = faceAt(x, y, 0.006), n = seN(...seFront(x, y).toArray());
    b.g.position.copy(p); b.g.quaternion.setFromUnitVectors(Z, n.lerp(Z, 0.3).normalize());
    b.g.rotateZ(b.sx * ang);
  };

  // beak: hooked, orange, glossy; the lower mandible opens for talking
  const mBeak = new THREE.MeshPhysicalMaterial({ color: C.beak, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 0.2, specularIntensity: 0.5 });
  const z0 = seFront(0, -0.11).z;
  const beak = new THREE.Group(); head.add(beak);
  mesh(sweep2([[0, -0.085, z0 - 0.04], [0, -0.14, z0 + 0.045], [0, -0.22, z0 + 0.092], [0, -0.3, z0 + 0.082], [0, -0.345, z0 + 0.04]],
    u => 0.125 * Math.pow(1 - u, 0.6) + 0.004, { bAxis: [1, 0, 0], fx: 0.82, fy: 1.12, seg: 12, radial: 12 }), mBeak, beak);
  // mouth: a dark opening right under the hooked tip, with a small orange lower beak that drops when talking
  const MY = -0.315, mouthG = new THREE.Group(); mouthG.position.set(0, MY, seFront(0, MY).z + 0.045); head.add(mouthG);
  const mouthIn = mesh(DOT, shiny(C.mouth, { r: 0.45, cr: 0.4, cc: 0.5 }), mouthG, [0, 0, 0], [0.07, 0.02, 0.035]);
  mesh(DOT, shiny('#c4503c', { r: 0.5, cc: 0.3 }), mouthIn, [0, -0.45, 0.35], [0.62, 0.45, 0.5]);
  const jaw = new THREE.Group(); mouthG.add(jaw);
  mesh(DOT, new THREE.MeshPhysicalMaterial({ color: '#d45200', roughness: 0.36, clearcoat: 0.4, envMapIntensity: 0.2, specularIntensity: 0.5 }), jaw, [0, 0, 0.004], [0.072, 0.03, 0.042]);

  // glasses: thick rounded-square purple frames, faint lenses with a streak, bridge on the beak, temples to the sides
  const mFrame = shiny(C.frame, { r: 0.24, cr: 0.05, env: 1.1 });
  const rrect = (p, hw, hh, r) => { p.moveTo(-hw + r, -hh); p.lineTo(hw - r, -hh); p.quadraticCurveTo(hw, -hh, hw, -hh + r); p.lineTo(hw, hh - r); p.quadraticCurveTo(hw, hh, hw - r, hh); p.lineTo(-hw + r, hh); p.quadraticCurveTo(-hw, hh, -hw, hh - r); p.lineTo(-hw, -hh + r); p.quadraticCurveTo(-hw, -hh, -hw + r, -hh); return p; };
  const OW = 0.272, OH = 0.232, IW = 0.234, IH = 0.194;
  const frameGeo = (() => {
    const s = rrect(new THREE.Shape(), OW, OH, 0.12); s.holes.push(rrect(new THREE.Path(), IW, IH, 0.085));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.034, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.013, bevelSegments: 2, curveSegments: 5 });
    g.translate(0, 0, -0.017); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 + 0.05 * p.getY(i) / OH)); // a touch wider at the top
    return g;
  })();
  const lensGeo = new THREE.ShapeGeometry(rrect(new THREE.Shape(), IW, IH, 0.085), 4);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide });
  const streakMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false });
  // the frames hug the face (each vertex is laid onto the head surface + a small gap), so they never float off in 3/4 view
  const glasses = new THREE.Group(); head.add(glasses);
  const LY = -0.075, LX = 0.355, HUG = 0.088;
  const hz = (X, Y) => seFront(X, Y).z + HUG;
  const hug = (geo, sx, dz = 0) => {
    let g = geo.clone(); g.deleteAttribute('normal'); g.deleteAttribute('uv');
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const X = sx * LX + p.getX(i), Y = LY + p.getY(i); p.setXYZ(i, X, Y, hz(X, Y) + dz + p.getZ(i)); }
    g = mergeVertices(g, 1e-5); g.computeVertexNormals(); return g;
  };
  for (const sx of [-1, 1]) {
    mesh(hug(frameGeo, sx), mFrame, glasses);
    mesh(hug(lensGeo, sx, 0.005), lensMat, glasses);
    for (const [x, y, w, h] of [[0.165, 0.115, 0.026, 0.11], [0.2, 0.06, 0.012, 0.07]]) {
      const st = mesh(new THREE.PlaneGeometry(1, 1), streakMat, glasses, [0, 0, 0], [1, 1, 1]);
      const X = sx * (LX + x), Y = LY + y; st.position.set(X, Y, hz(X, Y) + 0.012); st.scale.set(w, h, 1); st.rotation.set(0, sx * 0.5, -0.6 * sx);
    }
  }
  {
    const bx = LX - OW + 0.012, by = LY + 0.07;
    const a = V3(-bx, by, hz(-bx, by)), b = V3(bx, by, hz(bx, by));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, V3(0, by + 0.008, hz(0, by) + 0.012), b]), 10, 0.036, 10, false), mFrame, glasses);
    for (const sx of [-1, 1]) {
      const ox = LX + OW - 0.01, oy = LY + 0.1;
      const pts = [V3(sx * ox, oy, hz(sx * ox, oy)), V3(sx * 0.69, oy, 0.14), V3(sx * 0.712, oy, 0.0), V3(sx * 0.68, oy, -0.12)];
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.02, 6, false), mFrame, glasses);
    }
  }
  const glintPos = [LX + 0.17, LY + 0.15, hz(LX + 0.17, LY + 0.15) + 0.05];
  const lensGlint = sprite('glint', '#ffffff', head, glintPos, 0.3);

  // ear tufts: three feathers each (a fat main one plus two smaller), like a little crest at each corner
  const cTuftA = new THREE.Color(C.top), cTuftB = new THREE.Color(C.tuftTip);
  const tuftGeo = (len, w) => sweep2([[0, -0.07, 0], [0.025 * len, 0.08 * len, 0], [0.09 * len, 0.2 * len, 0], [0.2 * len, 0.29 * len, 0]],
    u => w * Math.pow(1 - u, 0.8) + 0.003, { bAxis: [0, 0, 1], fy: 0.42, seg: 10, radial: 8, colFn: u => cTuftA.clone().lerp(cTuftB, 0.8 * smooth(0.35, 1, u)) });
  const tMain = tuftGeo(1.08, 0.19), tSide = tuftGeo(0.66, 0.11);
  const tufts = [-1, 1].map(sx => {
    const piv = new THREE.Group(); piv.position.set(sx * 0.47, 0.31, -0.03); head.add(piv);
    const t = new THREE.Group(); t.scale.x = sx; piv.add(t);
    const back = mesh(tSide, mFeat, t, [0.04, -0.03, -0.05], [1, 1, 1], [0, 0, -0.24]);
    const inner = mesh(tSide, mFeat, t, [-0.05, -0.03, -0.03], [0.85, 0.9, 1], [0, 0, 0.22]);
    mesh(tMain, mFeat, t, [0, 0, 0]);
    return { piv, back, inner, sx };
  });

  // cheek ruff: soft feather tips along the lower sides of the head, so head and body read as one fluffy mass
  {
    const tip = blade(0.13, 0.055, { cA: '#ffffff', cB: '#c9c2ba', tipK: 0.3, seg: 6, radial: 6 });
    const list = [];
    for (const sx of [-1, 1]) {
      [[-0.18, 0.95, 2.35, 7], [-0.4, 1.05, 2.2, 6]].forEach(([el, a0, a1, n], row) => {
        for (let i = 0; i < n; i++) {
          const az = a0 + (a1 - a0) * (i + (row % 2) * 0.5) / (n - 0.5), d = V3(Math.sin(az) * Math.cos(el) * sx, Math.sin(el), Math.cos(az) * Math.cos(el));
          const r = seR(d.x, d.y, d.z), p = d.multiplyScalar(r), n0 = seN(p.x, p.y, p.z);
          const dn = V3(0, -1, 0).addScaledVector(n0, -(-n0.y)).normalize().addScaledVector(n0, 0.45).normalize();
          const zN = n0.clone().addScaledVector(dn, -n0.dot(dn)).normalize();
          const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3().crossVectors(dn.clone().negate(), zN), dn.clone().negate(), zN));
          const s = 0.9 + 0.25 * Math.sin(i * 2.3 + row);
          const c = cSide.clone().lerp(cLow, row === 1 ? 0.35 : 0.1); if (row === 2) c.lerp(cTop, 0.3);
          list.push({ m: new THREE.Matrix4().compose(p.addScaledVector(n0, -0.012), q, V3(s, s * (row === 1 ? 1.1 : 1), s)), c });
        }
      });
    }
    const im = new THREE.InstancedMesh(tip, mFeat, list.length);
    list.forEach((o, i) => { im.setMatrixAt(i, o.m); im.setColorAt(i, o.c); });
    head.add(im);
  }

  // ---------------- wings = arms with feather fingers ----------------
  const SHX = 0.5, SHY = 0.9, SHZ = 0.0, L1 = 0.33, L2 = 0.31, HANDS = 1.2; // HANDS: chunky mitten hands
  const cW = new THREE.Color(C.wing), cWD = new THREE.Color(C.wingDark);
  const capped = (u, a = 0.16, b = 0.1) => Math.pow(Math.sin(Math.PI / 2 * Math.min(1, u / a)), 0.45) * Math.pow(Math.sin(Math.PI / 2 * Math.min(1, (1 - u) / b)), 0.4);
  const upperGeo = sweep2([[0, 0.06, 0], [0, -0.1, 0.01], [0, -L1 - 0.02, 0]], u => 0.215 * (1 - 0.3 * u) * capped(u) + 0.002,
    { bAxis: [0, 0, 1], fy: 0.48, seg: 12, radial: 12, colFn: u => cW.clone().lerp(cWD, 0.15 * u) });
  const foreGeo = sweep2([[0, 0.02, 0], [0, -L2 * 0.5, 0.008], [0, -L2 - 0.02, 0]], u => 0.135 * (1 - 0.25 * u) * capped(u, 0.12, 0.12) + 0.002, { bAxis: [0, 0, 1], fy: 0.5, seg: 10, radial: 12, colFn: u => cW.clone().lerp(cWD, 0.2 + 0.2 * u) });
  const fingerGeo = blade(0.16, 0.05, { cA: C.finger, cB: C.fingerTip, fy: 0.62, seg: 6, radial: 6, bend: 0.004 });
  const sleeveGeo = blade(0.42, 0.095, { cA: C.wing, cB: C.wingDark, tipK: 0.35, fy: 0.3, seg: 6, radial: 6 });
  const mFinger = feather();
  const SLEEVE = [{ x: -0.06, z: -0.03, a: -0.1, L: 0.92 }, { x: 0.0, z: -0.02, a: 0.0, L: 1.04 }, { x: 0.06, z: -0.01, a: 0.1, L: 0.95 }];
  const FING = [{ x: -0.045, a: -0.22, L: 1.08 }, { x: -0.015, a: -0.07, L: 1.1 }, { x: 0.017, a: 0.07, L: 1.0 }, { x: 0.045, a: 0.22, L: 0.96 }];
  const wings = [-1, 1].map(sx => {
    const side = new THREE.Group(); side.position.set(sx * SHX, SHY, SHZ); side.scale.x = sx; body.add(side);
    const upper = new THREE.Group(); side.add(upper);
    mesh(upperGeo, mWing, upper);
    const sleeve = new THREE.Group(); sleeve.position.set(0, -L1 * 0.35, -0.015); upper.add(sleeve);
    const sl = SLEEVE.map(f => { const p = new THREE.Group(); p.position.set(f.x, 0, f.z); p.rotation.z = f.a; sleeve.add(p); mesh(sleeveGeo, mFeat, p, [0, 0, 0], [1, f.L, 1]); return { p, f }; });
    const fore = new THREE.Group(); fore.position.y = -L1; upper.add(fore);
    mesh(SPH_LO, mFeat, fore, [0, 0, 0], [0.135, 0.135, 0.065]).material = feather({ vertexColors: false, color: C.wing });
    mesh(foreGeo, mWing, fore);
    const hand = new THREE.Group(); hand.position.y = -L2; hand.scale.setScalar(HANDS); fore.add(hand);
    mesh(SPH_LO, feather({ vertexColors: false, color: C.finger }), hand, [0, -0.02, 0], [0.097, 0.082, 0.06]);
    const fingers = FING.map(f => { const p = new THREE.Group(); p.position.set(f.x, -0.045, 0); p.rotation.z = f.a; hand.add(p); const c = new THREE.Group(); p.add(c); mesh(fingerGeo, mFinger, c, [0, 0, 0], [1, f.L, 1]); return { p, c, f }; });
    return { side, upper, sleeve, sl, fore, hand, fingers, sx };
  });
  // pose library (right-wing space: +x outward, +y up, +z towards the viewer). W = wrist, P = elbow pole, H = hand dir, n* = wing-face hints
  const POSE = {
    rest: { W: V3(0.04, -0.5, 0.22), P: V3(1, 0.1, -0.45), H: V3(-0.35, -0.55, 0.8), nU: V3(0.75, 0, 1), nF: V3(0.8, 0, 1), nH: V3(1, 0.2, 0.7), curl: [0.5, 0.55, 0.6, 0.65], spread: 1 },
    hold: { W: V3(0.31, -0.36, 0.27), P: V3(1, -0.3, -0.5), H: V3(-1, -0.12, 0.15), nU: V3(1, 0, 0.8), nF: V3(0.7, 0, 1), nH: V3(0.1, 0.1, 1), curl: [1.35, 1.4, 1.45, 1.5], spread: 0.55 },
    upHold: { W: V3(0.33, 0.36, 0.2), P: V3(1, -0.5, -0.5), H: V3(-0.95, 0.3, 0.2), nU: V3(0.7, 0, 1), nF: V3(0.6, 0, 1), nH: V3(0.1, 0.1, 1), curl: [1.35, 1.4, 1.45, 1.5], spread: 0.55 },
    up: { W: V3(0.3, 0.44, 0.12), P: V3(1, -0.4, -0.6), H: V3(0.25, 1, 0.1), nU: V3(0.6, 0, 1), nF: V3(0.3, 0, 1), nH: V3(0.15, 0, -1), curl: [0.15, 0.15, 0.2, 0.25], spread: 1.3 },
    point: { W: V3(0.56, 0.06, 0.24), P: V3(0.1, -1, -0.4), H: V3(1, 0.12, 0.3), nU: V3(0, 0.35, 1), nF: V3(0, 0.5, 1), nH: V3(0, 1, 0.25), curl: [0, 1.4, 1.5, 1.5], spread: 0.6 },
    wave: { W: V3(0.36, 0.42, 0.16), P: V3(1, -0.5, -0.5), H: V3(0.25, 1, 0.15), nU: V3(0.5, 0, 1), nF: V3(0.2, 0, 1), nH: V3(0.1, 0, -1), curl: [0.05, 0.05, 0.08, 0.1], spread: 1.9 },
    think: { W: null, P: V3(0.6, -1, -0.2), H: null, nU: V3(0.8, 0, 1), nF: V3(1, 0, 0.6), nH: V3(1, 0, 0.35), curl: [1.45, 1.4, 1.3, 0], spread: 0.6 },
  };
  const TEMPLE_TIP = V3(0.71, 0.16, 0.24), TEMPLE_DIR = V3(-0.22, 0.96, -0.12).normalize(), TSH = V3(0.03, 0.08, 0.07), HAND_LEN = (0.045 + 0.16 * 1.08) * HANDS;
  const qU = new THREE.Quaternion(), qF = new THREE.Quaternion(), qH = new THREE.Quaternion(), qS = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const DOWN = V3(0, -1, 0);
  const lerpP = (A, B, k) => {
    if (k <= 0) return A;
    const o = {}; for (const key of ['W', 'P', 'H', 'nU', 'nF', 'nH']) o[key] = A[key].clone().lerp(B[key], k);
    o.curl = A.curl.map((c, i) => lerp(c, B.curl[i], k)); o.spread = lerp(A.spread, B.spread, k); return o;
  };
  const applyWing = (w, P) => {
    const { dU, dF } = ik2(P.W, L1, L2, P.P);
    boneQ(dU, P.nU, qU); boneQ(dF, P.nF, qF); boneQ(P.H, P.nH, qH);
    w.upper.quaternion.copy(qU);
    w.fore.quaternion.copy(qI.copy(qU).invert()).multiply(qF);
    w.hand.quaternion.copy(qI.copy(qF).invert()).multiply(qH);
    // the sleeve feathers hang towards the ground
    const dS = dU.clone().multiplyScalar(0.35).addScaledVector(DOWN, 0.65).normalize();
    boneQ(dS, P.nU.clone().lerp(V3(0.3, 0, 1), 0.5), qS);
    w.sleeve.quaternion.copy(qI.copy(qU).invert()).multiply(qS);
    w.fingers.forEach((f, k) => { f.p.rotation.z = f.f.a * P.spread; f.c.rotation.x = P.curl[k]; });
  };
  // pencil in the left wing: placed once from the rest ("hold") pose, then it simply rides on the hand
  {
    const P = POSE.hold, { dF } = ik2(P.W, L1, L2, P.P); boneQ(P.H, P.nH, qH);
    const pen = new THREE.Group(); wings[0].hand.add(pen);
    const qPen = new THREE.Quaternion().setFromUnitVectors(Y, V3(0.3, 1, 0.08).normalize());
    pen.quaternion.copy(qI.copy(qH).invert()).multiply(qPen);
    pen.position.copy(V3(0, -0.075, -0.05)); pen.scale.setScalar(1 / HANDS);
    const mPen = shiny(C.pencil, { r: 0.42, cr: 0.2, cc: 0.35, env: 0.2, spec: 0.35, flat: true }), mWood = shiny(C.wood, { r: 0.55, cr: 0.4, cc: 0.3, env: 0.3, spec: 0.4, flat: true });
    const PB = 0.26, PT = 0.78, PR = 0.105;
    mesh(new THREE.CylinderGeometry(PR, PR, PB + PT - 0.2, 6, 1), mPen, pen, [0, (PT - 0.2 - PB) / 2, 0]);
    mesh(new THREE.CylinderGeometry(0.005, PR, 0.2, 6, 1), mWood, pen, [0, PT - 0.1, 0]);
    mesh(new THREE.ConeGeometry(0.03, 0.075, 8), shiny(C.lead, { r: 0.3 }), pen, [0, PT - 0.03, 0]);
    mesh(new THREE.CylinderGeometry(PR + 0.006, PR + 0.006, 0.075, 14), shiny(C.ferrule, { r: 0.26 }), pen, [0, -PB - 0.035, 0]);
    for (const dy of [-0.012, -0.058]) mesh(new THREE.TorusGeometry(PR + 0.006, 0.006, 5, 16), shiny(C.ferrule, { r: 0.26 }), pen, [0, -PB + dy, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    mesh(new THREE.CapsuleGeometry(PR - 0.002, 0.04, 3, 12), shiny(C.eraser, { r: 0.4, cr: 0.2 }), pen, [0, -PB - 0.1, 0]);
  }

  // ---------------- marks above the head (signature, with the chest emblem) ----------------
  const MARKC = { think: '#3d8bff', aha: '#22d27a', doubt: '#ff7400' };
  const markMat = (c, ei = 0.55) => new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: ei, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 0.5 });
  const marks = new THREE.Group(); marks.position.set(0.55, 2.2, 0.12); body.add(marks);
  const mkQ = new THREE.Group(), mkE = new THREE.Group(), mkD = new THREE.Group(); marks.add(mkQ, mkE, mkD);
  {
    const m = markMat(MARKC.doubt, 0.25);
    const q = [[-0.085, 0.165], [-0.07, 0.245], [0.0, 0.29], [0.078, 0.25], [0.085, 0.18], [0.035, 0.125], [0.004, 0.085], [0.0, 0.035]].map(p => V3(p[0], p[1], 0));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q), 28, 0.045, 7, false), m, mkQ);
    mesh(DOT, m, mkQ, q[0].toArray(), [0.045, 0.045, 0.045]); mesh(DOT, m, mkQ, q[q.length - 1].toArray(), [0.045, 0.045, 0.045]);
    mesh(DOT, m, mkQ, [0, -0.06, 0], [0.052, 0.052, 0.052]);
    mkQ.userData.halo = sprite('soft', MARKC.doubt, mkQ, [0, 0.12, -0.05], 0.55);
  }
  {
    const m = markMat(MARKC.aha);
    mesh(new THREE.CylinderGeometry(0.052, 0.03, 0.22, 12), m, mkE, [0, 0.17, 0]);
    mesh(DOT, m, mkE, [0, 0.28, 0], [0.052, 0.04, 0.052]); mesh(DOT, m, mkE, [0, 0.06, 0], [0.03, 0.03, 0.03]);
    mesh(DOT, m, mkE, [0, -0.04, 0], [0.05, 0.05, 0.05]);
    mkE.userData.halo = sprite('soft', MARKC.aha, mkE, [0, 0.12, -0.05], 0.6);
    mkE.userData.star = sprite('star', MARKC.aha, mkE, [0, 0.12, -0.04], 0.7);
  }
  const dots = [-1, 0, 1].map(k => mesh(DOT, markMat(MARKC.think), mkD, [k * 0.145, 0.1, 0], [0.055, 0.055, 0.055]));
  mkD.userData.halo = sprite('soft', MARKC.think, mkD, [0, 0.1, -0.05], 0.55);

  // -------------------- pose --------------------
  const OWL_STATE = { idle: '#fcd9a0', think: '#3d8bff', aha: '#22e27c', doubt: '#ffa31a' };
  const cState = new THREE.Color(), cIdle = new THREE.Color(C.emblem);
  const H = 2.18;
  return {
    root, height: H, classroomScale: 0.78,   // the wings and the held pencil make it wide: sized so the studio frame keeps a margin on its side
    pose(s) {
      const t = s.t, st = s.state || 'idle', K = clamp01(s.stateK || 0);
      const th = st === 'think' ? K : 0, ah = st === 'aha' ? K : 0, db = st === 'doubt' ? K : 0;
      root.rotation.y = (s.turn || 0) * 0.6;
      const sq = (s.squash || 0) * 0.6; fig.scale.set(1 + 0.14 * sq, 1 - 0.2 * sq, 1 + 0.14 * sq);
      body.position.y = (s.hop || 0) * 0.35;
      body.rotation.z = (s.tilt || 0) * 0.15;
      const br = Math.sin(t * 1.6);
      torso.scale.set(1 + 0.012 * br, 1 + 0.01 * br, 1 + 0.012 * br);
      shadow.scale.set(1.25 * (1 - 0.3 * s.hop), 1.25 * 1.3 * (1 - 0.3 * s.hop), 1);
      shadow.material.opacity = 1 - 0.5 * s.hop;
      // head: calm. owls turn the head; aha = a satisfied double nod; doubt = a sceptical tilt
      const nod = ah * Math.pow(Math.max(0, Math.sin(t * 4.4)), 2);
      const talk = clamp01(s.talk || 0);
      head.rotation.set(
        -(s.lookY || 0) * 0.16 - th * 0.06 + db * 0.05 + nod * 0.17 + talk * 0.025 * Math.sin(t * 9),
        (s.lookX || 0) * 0.42 + th * 0.1 - db * 0.1,
        (s.tilt || 0) * 0.08 + th * 0.07 - db * 0.13 + 0.025 * Math.sin(t * 0.8));
      head.position.y = HY + 0.006 * br;
      // eyes
      const gx = (s.lookX || 0) * 0.24 + th * 0.3 - db * 0.2, gy = (s.lookY || 0) * 0.22 + th * 0.36 + db * 0.06;
      eyes.forEach((e, i) => {
        const left = i === 0;
        e.ball.rotation.set(-gy, gx, 0);
        let hU = 0.6 + 0.16 * th + 0.22 * ah + 0.12 * gy - db * (left ? 0.38 : -0.2);
        const bl = clamp01(s.blink);
        hU = lerp(Math.min(0.95, hU), -0.32, bl);
        e.lidU.rotation.set(-Math.asin(Math.max(-1, Math.min(1, hU))), 0, db * (left ? -0.12 : 0.1));
        const hD = lerp(0.86 - ah * 0.22 - db * (left ? 0.16 : 0) - th * 0.05, 0.3, bl);
        e.lidD.rotation.set(Math.asin(Math.max(-1, Math.min(1, hD))), 0, 0);
        e.c1.scale.set(0.085 * (1 + ah * 0.35), 0.085 * (1 + ah * 0.35), 0.03);
      });
      // brows: think = both up (one more), aha = both up, doubt = one high and arched, the other low
      brows.forEach((b, i) => {
        const left = i === 0;
        let up = th * (left ? 0.03 : 0.055) + ah * 0.045, ang = 0.1 + th * (left ? -0.05 : 0.12) + ah * 0.08;
        up += db * (left ? -0.03 : 0.075); ang += db * (left ? -0.2 : 0.32);
        placeBrow(b, up, ang);
      });
      // beak
      const open = Math.max(talk, ah * 0.22 + ah * 0.12 * nod, db * 0.12);
      mouthIn.scale.set(0.07 * (1 - 0.2 * db), 0.014 + 0.07 * open, 0.035); mouthIn.position.y = -0.03 * open;
      jaw.position.set(0, -0.022 - 0.072 * open, 0.006 * open);
      mouthG.position.x = db * 0.022; mouthG.rotation.z = db * 0.2;
      // wings
      const thinkArm = th * clamp01((s.armR || 0) / 0.35);
      let tipB = null, dirB = null;
      if (thinkArm > 0) {
        head.updateMatrix();
        const tipH = TEMPLE_TIP.clone().applyMatrix4(head.matrix), dH = TEMPLE_DIR.clone().applyQuaternion(head.quaternion);
        tipB = tipH.addScaledVector(dH, -HAND_LEN).sub(V3(SHX, SHY, SHZ).addScaledVector(TSH, thinkArm)); dirB = dH;
      }
      wings.forEach((w, i) => {
        const right = i === 1;
        let P = right ? POSE.rest : POSE.hold;
        P = right ? lerpP(P, POSE.up, (s.armR || 0) * (1 - thinkArm)) : lerpP(P, POSE.upHold, s.armL || 0);
        if (right) {
          P = lerpP(P, POSE.point, s.point || 0);
          if ((s.wave || 0) > 0) { const sw = Math.sin(t * 6.2); const Wv = { ...POSE.wave, H: V3(0.25 + 0.45 * sw, 1, 0.15), W: V3(0.36 + 0.03 * sw, 0.42, 0.16) }; P = lerpP(P, Wv, s.wave); }
          if (thinkArm > 0) P = lerpP(P, { ...POSE.think, W: tipB, H: dirB }, thinkArm);
        }
        if (right) w.side.position.set(SHX + TSH.x * thinkArm, SHY + TSH.y * thinkArm, SHZ + TSH.z * thinkArm);
        applyWing(w, P);
      });
      // ear tufts: lift for think / aha, one droops for doubt
      tufts.forEach((tu, i) => {
        const left = i === 0;
        const out = 0.2 - th * 0.14 - ah * 0.24 + db * (left ? 0.95 : 0.02) + 0.03 * Math.sin(t * 1.1 + i * 2);
        tu.piv.rotation.set(-th * 0.05 + db * (left ? 0.3 : 0), 0, -tu.sx * out);
        tu.piv.scale.setScalar(1 + ah * 0.08 + th * 0.04 - db * (left ? 0.06 : 0));
        tu.back.rotation.z = -0.24 - ah * 0.12; tu.inner.rotation.z = 0.22 + ah * 0.1;
      });
      // signature 1: the chest emblem glows in the state colour
      cState.set(OWL_STATE[st] || OWL_STATE.idle);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.2), beat = 0.5 + 0.5 * Math.sin(t * 9), flick = 0.6 + 0.4 * Math.sin(t * 3.3) * Math.sin(t * 8.1 + 1);
      embMat.emissive.copy(cState);
      embMat.emissiveIntensity = th * (0.45 + 0.75 * pulse) + ah * (1.3 + 0.4 * beat) + db * (1.8 * flick);
      embHalo.material.color.copy(cState);
      embHalo.material.opacity = th * (0.35 + 0.35 * pulse) + ah * 0.75 + db * 0.8 * flick;
      embHalo.scale.setScalar(0.75 * (0.8 + th * 0.4 * pulse + ah * 0.6 + db * 0.25));
      embStar.material.color.set(OWL_STATE.aha); embStar.material.opacity = ah * (0.7 + 0.3 * beat); embStar.material.rotation = t * 1.1;
      embStar.scale.setScalar(0.6 * (0.6 + 0.4 * ah));
      // signature 2: a mark above the head
      const pop = k => k <= 0.001 ? 0 : backOut(clamp01(k));
      const sQ = pop(db), sE = pop(ah), sD = pop(th);
      mkQ.visible = sQ > 0.01; mkQ.scale.setScalar(sQ); mkQ.rotation.z = 0.18 * Math.sin(t * 3.1); mkQ.position.y = 0.02 * Math.sin(t * 2.3);
      mkQ.userData.halo.material.opacity = 0.55 * db * flick;
      mkE.visible = sE > 0.01; mkE.scale.setScalar(sE * (1 + 0.05 * beat)); mkE.rotation.z = -0.12;
      mkE.userData.halo.material.opacity = 0.7 * ah; mkE.userData.star.material.opacity = ah * (0.6 + 0.4 * beat); mkE.userData.star.material.rotation = t * 1.4;
      mkD.visible = sD > 0.01; mkD.scale.setScalar(sD);
      dots.forEach((d, k) => { const ph = ((t * 1.6 - k * 0.33) % 1 + 1) % 1, b = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 2); d.scale.setScalar(0.055 * (0.75 + 0.45 * b)); d.position.y = 0.1 + 0.035 * b; d.material.emissiveIntensity = 0.35 + 1.0 * b; });
      mkD.userData.halo.material.opacity = 0.45 * th * (0.7 + 0.3 * pulse);
      // lenses glint on aha
      lensGlint.material.opacity = ah * (0.7 + 0.3 * beat); lensGlint.material.rotation = 0.3 + t * 0.5; lensGlint.scale.setScalar(0.3 * (0.6 + 0.4 * ah));
    },
  };
}

// =====================================================================
// BUNNY (student) — from glossy-animal
// =====================================================================
function buildBunny() {
  const LILAC = '#b9a0f0', WHITE = '#fffaf6', PINK = '#ff9fbf', GOLD = '#e7b552';
  const mL = gloss(LILAC), mW = gloss(WHITE, { r: 0.3 }), mP = gloss(PINK, { r: 0.3 }), mGold = gloss(GOLD, { r: 0.2, m: 0.85 });
  const root = new THREE.Group(), fig = new THREE.Group(), body = new THREE.Group(); root.add(fig); fig.add(body);
  const shadow = blobShadow(root, 1.05);
  for (const sx of [-1, 1]) mesh(SPH_S, mW, body, [sx * 0.17, 0.065, 0.08], [0.13, 0.08, 0.17]);
  const torso = new THREE.Mesh(lathe([[0, 0.09], [0.22, 0.1], [0.36, 0.19], [0.4, 0.35], [0.35, 0.54], [0.24, 0.7], [0, 0.78]], 28, 24), mL); body.add(torso);
  mesh(SPH, mW, body, [0, 0.34, 0.17], [0.26, 0.25, 0.24]);
  mesh(SPH_S, mW, body, [0, 0.22, -0.38], [0.12, 0.12, 0.12]); // tail puff
  mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 32), mP, body, [0, 0.64, 0], [1, 1, 1], [Math.PI / 2 + 0.12, 0, 0]);
  const gem = makeGem(body, [0, 0.5, 0.36], 0.072, mGold); gem.g.rotation.x = -0.15;
  const HC = [0, 0, 0], HA = [0.56, 0.45, 0.48];
  const head = new THREE.Group(); head.position.set(0, 1.04, 0); body.add(head);
  mesh(new THREE.SphereGeometry(1, 28, 18), mL, head, HC, HA);
  mesh(SPH, mW, head, [0, -0.13, 0.33], [0.2, 0.13, 0.16]);       // muzzle
  mesh(SPH_S, mP, head, [0, -0.065, 0.485], [0.05, 0.034, 0.03]);  // nose
  const blush = new THREE.MeshPhysicalMaterial({ color: '#ffb3c8', roughness: 0.35, clearcoat: 1, transparent: true, opacity: 0.85 });
  for (const sx of [-1, 1]) { const g = new THREE.Group(); onSurface(head, HC, HA, sx * 0.72, -0.16, 0.01, g); mesh(SPH_LO, blush, g, [0, 0, 0], [0.085, 0.05, 0.02]); }
  const earPts = [[0, 0, 0], [0.01, 0.2, 0], [0.035, 0.42, 0], [0.04, 0.6, 0]];
  const earR = u => 0.12 * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.55) * (0.75 + 0.25 * Math.sin(Math.PI * u));
  const earGeo = sweep(earPts, earR, { fy: 0.42, seg: 24, radial: 14, planar: true });
  const innerGeo = sweep(earPts.map(p => [p[0], p[1] * 0.9 + 0.05, p[2]]), u => earR(u) * 0.6, { fy: 0.3, seg: 18, radial: 10, planar: true });
  const ears = [-1, 1].map(sx => {
    const piv = new THREE.Group(); piv.position.set(sx * 0.17, 0.34, -0.05); head.add(piv);
    const tip = new THREE.Group(); piv.add(tip); tip.scale.x = sx;
    mesh(earGeo, mL, tip); mesh(innerGeo, mP, tip, [0, 0, 0.03]);
    return { piv, tip, sx };
  });
  const eyes = [-1, 1].map(sx => makeEye(head, HC, HA, sx * 0.37, 0.04, [0.092, 0.107, 0.052], mL));
  const browMat = gloss('#5b4590', { r: 0.3 });
  const brows = [-1, 1].map(sx => makeBrow(head, HC, HA, sx * 0.37, 0.28, 0.07, 0.017, browMat));
  const mouth = new THREE.Group(); head.add(mouth); mouth.position.set(0, -0.155, 0.485);
  const mo = mesh(SPH_S, gloss('#5a1d2a', { r: 0.2 }), mouth, [0, 0, 0], [0.06, 0.02, 0.04]);
  mesh(SPH_LO, gloss('#ff7b8a', { r: 0.3 }), mo, [0, -0.45, 0.3], [0.65, 0.5, 0.55]);
  const tooth = mesh(new THREE.BoxGeometry(1, 1, 1), mW, mouth, [0, 0, 0.02], [0.04, 0.03, 0.02]);
  const arms = [-1, 1].map(sx => makeArm(body, sx, [sx * 0.33, 0.6, 0.05], 0.25, 0.075, mL, mW, 0.088));
  return rig({
    root, fig, body, torso, head, eyes, brows, arms, gem, shadow, H: 2.05, hopH: 0.6, seed: 1.7,
    mouthPose(open, s, f) {
      const w = 0.06 * (1 + f.ah * 0.35) * (1 - f.th * 0.3) * (1 - f.db * 0.2);
      const h = 0.014 + 0.06 * open;
      mo.scale.set(w, h, 0.04);
      tooth.position.y = h * 0.55; tooth.scale.set(0.035, Math.min(0.026, h * 0.6), 0.02); tooth.visible = open > 0.15;
      mouth.position.x = f.db * 0.035; mouth.rotation.z = f.db * 0.22;
    },
    extras(s, f) {
      ears.forEach((e, i) => {
        const out = 0.14 - f.ah * 0.06 + f.db * (1.15 + 0.12 * i) + (i === 0 ? f.th * 0.25 : 0);
        e.piv.rotation.set(-f.db * 0.25 - f.ah * 0.05, 0, -e.sx * out);
        e.tip.rotation.set(0, 0, -(f.db * 0.35 + (i === 0 ? f.th * 0.35 : 0) + 0.05 * Math.sin(f.t * 2 + i)));
        e.piv.scale.setScalar(1 + f.ah * 0.08);
      });
    },
  });
}

// =====================================================================
// FIREFLY (embodiment) — a glossy teal firefly sprite; its tail lantern is the state light
// =====================================================================
function buildFirefly() {
  const TEAL = '#25b8b2', DEEP = '#0f7f86', GOLD = '#e7b552';
  const FSTATE = { idle: '#ffe27a', think: '#2f7bff', aha: '#1fe07a', doubt: '#ffa31a' };
  const mT = gloss(TEAL), mD = gloss(DEEP), mGold = gloss(GOLD, { r: 0.2, m: 0.85 });
  const root = new THREE.Group(), fig = new THREE.Group(), body = new THREE.Group(); root.add(fig); fig.add(body);
  const shadow = blobShadow(root, 0.62);
  const hover = new THREE.Group(); hover.position.y = 0.12; body.add(hover);
  const torso = new THREE.Group(); torso.position.y = 0.52; hover.add(torso);
  const HC = [0, 0, 0], HA = [0.36, 0.33, 0.33];
  const head = new THREE.Group(); torso.add(head);
  mesh(SPH, mT, head, HC, HA);
  // small body + glowing lantern abdomen hanging below
  mesh(SPH_S, mD, torso, [0, -0.3, -0.02], [0.17, 0.14, 0.15]);
  for (let k = 0; k < 2; k++) mesh(new THREE.TorusGeometry(0.115 - k * 0.012, 0.018, 6, 20), mGold, torso, [0, -0.37 - k * 0.045, -0.04], [1, 1, 1], [Math.PI / 2 + 0.2, 0, 0]);
  const gem = (() => {
    const g = new THREE.Group(); g.position.set(0, -0.47, -0.06); torso.add(g);
    const mat = new THREE.MeshPhysicalMaterial({ color: FSTATE.idle, emissive: FSTATE.idle, emissiveIntensity: 0.6, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0 });
    const bulb = mesh(SPH_S, mat, g, [0, 0, 0], [0.12, 0.13, 0.12]);
    const halo = sprite('soft', FSTATE.idle, g, [0, 0, 0.1], 0.6);
    const star = sprite('star', FSTATE.aha, g, [0, 0, 0.14], 0.8);
    return { g, mat, gem: bulb, halo, star };
  })();
  // antennae with gold ball tips
  const antGeo = sweep([[0, 0, 0], [0.02, 0.12, 0.01], [0.08, 0.22, 0.03], [0.15, 0.27, 0.05]], u => 0.016 * (1 - 0.4 * u), { seg: 16, radial: 8 });
  const ants = [-1, 1].map(sx => {
    const piv = new THREE.Group(); piv.position.set(sx * 0.1, 0.28, 0.02); head.add(piv);
    const a = new THREE.Group(); a.scale.x = sx; piv.add(a);
    mesh(antGeo, mD, a); mesh(SPH_S, mGold, a, [0.15, 0.27, 0.05], [0.042, 0.042, 0.042]);
    return { piv, sx };
  });
  // translucent wings on the back
  const wingMat = new THREE.MeshPhysicalMaterial({ color: '#c9eef8', transparent: true, opacity: 0.55, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const wingGeo = new THREE.CircleGeometry(1, 24);
  const fwings = [];
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.12, k ? -0.1 : 0.06, -0.26); torso.add(piv);
    mesh(wingGeo, wingMat, piv, [sx * (k ? 0.16 : 0.24), k ? -0.03 : 0.14, 0], [k ? 0.17 : 0.27, k ? 0.09 : 0.13, 1], [0, 0, sx * (k ? -0.3 : 0.6)]);
    piv.rotation.y = sx * 0.5; fwings.push({ piv, sx, k });
  }
  const eyes = [-1, 1].map(sx => makeEye(head, HC, HA, sx * 0.36, 0.05, [0.072, 0.085, 0.043], mT));
  const browMat = gloss('#0b5960', { r: 0.3 });
  const brows = [-1, 1].map(sx => makeBrow(head, HC, HA, sx * 0.36, 0.33, 0.055, 0.015, browMat));
  const mouth = new THREE.Group(); head.add(mouth); mouth.position.set(0, -0.12, 0.315);
  const mo = mesh(SPH_S, gloss('#0d3a40', { r: 0.2 }), mouth, [0, 0, 0], [0.045, 0.015, 0.03]);
  mesh(SPH_LO, gloss('#ff7b8a', { r: 0.3 }), mo, [0, -0.45, 0.3], [0.6, 0.5, 0.55]);
  const arms = [-1, 1].map(sx => makeArm(torso, sx, [sx * 0.15, -0.26, 0.06], 0.1, 0.04, mD, mT, 0.05));
  return rig({
    root, fig, body, torso, head, eyes, brows, arms, gem, shadow, H: 1.12, hopH: 0.45, seed: 2.9, states: FSTATE, gemBase: 0.6, haloBase: 0.45,
    mouthPose(open, s, f) {
      mo.scale.set(0.045 * (1 + f.ah * 0.3), 0.012 + 0.05 * open, 0.03);
      mouth.position.x = f.db * 0.025; mouth.rotation.z = f.db * 0.25;
    },
    extras(s, f) {
      hover.position.y = 0.12 + 0.03 * Math.sin(f.t * 3.1);
      fwings.forEach((w, i) => { w.piv.rotation.set(0, w.sx * (0.5 + 0.28 * Math.sin(f.t * 16 + w.k * 1.3)), 0); });
      ants.forEach((a, i) => {
        const left = i === 0;
        a.piv.rotation.set(-f.th * 0.15 + f.db * (left ? 0.5 : 0), 0, -a.sx * (0.1 - f.ah * 0.15 + f.db * (left ? 0.7 : 0.05)) + 0.06 * Math.sin(f.t * 2.3 + i));
      });
    },
  });
}

export async function create(env) {
  return { teacher: buildOwl(), student: buildBunny(), embodiment: buildFirefly() };
}
