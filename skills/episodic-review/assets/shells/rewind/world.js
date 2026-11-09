// world: the approved railway shell, shortened to one October; three station cabins and a timetable board.
// Everything is built once (seeded) and rendered as a pure function of t through render(state).
import * as THREE from 'three';

const V3 = THREE.Vector3;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// value noise (seeded, deterministic)
const NR = rng(77); const PERM = new Float32Array(1024).map(() => NR());
function hash2(x, y) { return PERM[((x * 73856093) ^ (y * 19349663)) & 1023]; }
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
const fbm = (x, y) => noise2(x, y) * 0.55 + noise2(x * 2.1 + 17, y * 2.1 - 9) * 0.3 + noise2(x * 4.3 - 5, y * 4.3 + 3) * 0.15;

/* ------------------------------------------------------------------ track ------------------------------------------------------------------ */
// day index = day of October (1 … 31); 32 = the end of the line (the night of 10/31). s = arc length from the end of the line toward 10/1.
export const DAY = { s1: 2.5, s2: 27, s3: 30, now: 32 };
const PTS = [[0, 16], [0, 0], [6, -40], [-14, -90], [-30, -140], [-12, -190], [22, -240], [34, -290], [14, -340], [-18, -385], [-30, -430], [-22, -468], [-8, -500]];
export const curve = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => new V3(x, 0, z)), false, 'centripetal');
const LEN = curve.getLength();
const S0 = 16;
export const SMAX = LEN - S0;
const LP = SMAX - 14;
const DKNOTS = [[32, 0], [30, 0.06 * LP], [27, 0.175 * LP], [20, 0.40 * LP], [10, 0.68 * LP], [2.5, 0.90 * LP], [1, 0.975 * LP], [0.5, LP]];
export function sOfDay(d) {
  for (let i = 0; i < DKNOTS.length - 1; i++) {
    const [d0, s0] = DKNOTS[i], [d1, s1] = DKNOTS[i + 1];
    if (d <= d0 && d >= d1) return lerp(s0, s1, (d0 - d) / (d0 - d1));
  }
  return d > 32 ? (32 - d) * 2 : LP + (0.5 - d) * 5;
}
export function dayOfS(s) {
  for (let i = 0; i < DKNOTS.length - 1; i++) {
    const [d0, s0] = DKNOTS[i], [d1, s1] = DKNOTS[i + 1];
    if (s >= s0 && s <= s1) return lerp(d0, d1, (s - s0) / (s1 - s0));
  }
  return s < 0 ? 32 : 0.5;
}
const _p = new V3(), _t = new V3();
export function trackPos(s, out = new V3()) { return curve.getPointAt(clamp((s + S0) / LEN, 0, 1), out); }
export function trackTan(s, out = new V3()) { return curve.getTangentAt(clamp((s + S0) / LEN, 0, 1), out).setY(0).normalize(); }
export function trackNormal(s, out = new V3()) { trackTan(s, _t); return out.set(-_t.z, 0, _t.x).normalize(); } // left of travel (travel = +s, toward 10/1)
const TS = []; for (let s = -S0; s <= SMAX; s += 1.5) { const p = trackPos(s); TS.push([p.x, p.z, s]); }
function nearestTrack(x, z) {
  let best = 1e9, bs = 0;
  for (let i = 0; i < TS.length; i++) { const dx = TS[i][0] - x, dz = TS[i][1] - z, q = dx * dx + dz * dz; if (q < best) { best = q; bs = TS[i][2]; } }
  return [Math.sqrt(best), bs];
}

/* ---------------------------------------------------------------- seasons (October only) ---------------------------------------------------------------- */
const C = h => new THREE.Color(h);
export function groundColor(d, n) {
  const stops = [[0, C('#7d9a40')], [8, C('#8a9a3e')], [15, C('#9c923c')], [21, C('#a07c36')], [27, C('#8f5e30')], [32, C('#76482a')]];
  let c = stops[0][1].clone();
  for (let i = 0; i < stops.length - 1; i++) if (d >= stops[i][0] && d <= stops[i + 1][0]) c = stops[i][1].clone().lerp(stops[i + 1][1], (d - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
  if (d > 32) c = stops[stops.length - 1][1].clone();
  c.offsetHSL((n - 0.5) * 0.03, (n - 0.5) * 0.1, (n - 0.5) * 0.08);
  return c;
}
function crownColor(d, r) {
  const pick = a => C(a[Math.floor(r() * a.length)]);
  const green = ['#5f9a3a', '#6aa443', '#4f8a34', '#76a83e'], yellow = ['#c9b440', '#d8c04a', '#b8a038', '#e0b84a'];
  const orange = ['#e0902e', '#d9792b', '#e8a838', '#c8662a'], red = ['#b8432a', '#a8352a', '#c45a26', '#8a4a24', '#9a2e2a'];
  const x = r();
  if (d < 8) return x < 0.72 ? pick(green) : x < 0.92 ? pick(yellow) : pick(orange);
  if (d < 16) return x < 0.38 ? pick(green) : x < 0.72 ? pick(yellow) : pick(orange);
  if (d < 24) return x < 0.12 ? pick(green) : x < 0.40 ? pick(yellow) : x < 0.75 ? pick(orange) : pick(red);
  return x < 0.18 ? pick(yellow) : x < 0.5 ? pick(orange) : pick(red);
}

/* ---------------------------------------------------------------- textures ---------------------------------------------------------------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
const glowTex = canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
}, false);
const leafTex = canvasTex(64, 64, g => {
  g.translate(32, 32); g.rotate(0.6); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(20, -6, 0, 26); g.quadraticCurveTo(-20, -6, 0, -26); g.fill();
}, false);
const petalTex = canvasTex(64, 64, g => {
  g.translate(32, 32); g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(0, 0, 14, 22, 0.4, 0, Math.PI * 2); g.fill();
}, false);
const beamTex = canvasTex(8, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.04, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, false);
function planks(base, line, w = 512, h = 512, n = 8) {
  const r = rng(5);
  const t = canvasTex(w, h, (g) => {
    for (let i = 0; i < n; i++) {
      const c = C(base).offsetHSL(0, 0, (r() - 0.5) * 0.08);
      g.fillStyle = '#' + c.getHexString(); g.fillRect(0, i * h / n, w, h / n);
      g.strokeStyle = line; g.lineWidth = 3; g.beginPath(); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke();
      const off = r() * w; g.beginPath(); g.moveTo(off, i * h / n); g.lineTo(off, (i + 1) * h / n); g.stroke();
      g.globalAlpha = 0.08; for (let k = 0; k < 14; k++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(0, i * h / n + r() * h / n, w, 1.5); } g.globalAlpha = 1;
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* ------------------------------------------------------------------ helpers ------------------------------------------------------------------ */
const M = {
  lam: (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }),
  pho: (c, o = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: 60, ...o }),
  bas: (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o }),
};
function mesh(geo, mat, x = 0, y = 0, z = 0, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  if (parent) parent.add(m); return m;
}
const box = (w, h, d, mat, x, y, z, parent, shadow) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent, shadow);
const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 16, shadow) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent, shadow);
function glowSprite(color, size, parent, x, y, z, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); if (parent) parent.add(s); return s;
}


/* ------------------------------------------------------------------ build ------------------------------------------------------------------ */
export function build(canvas, opts) {
  const W = 1600, H = 900;
  const Q = new URLSearchParams(location.search); const AA = Q.get('aa') !== '0'; const SH = +(Q.get('sh') || 1536);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b1422, 0.0028);
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 3000);

  /* sky */
  const skyU = { top: { value: C('#050a18') }, hor: { value: C('#1a2740') }, bot: { value: C('#05070c') }, sunDir: { value: new V3(0, 1, 0) }, sunCol: { value: C('#ffffff') }, sunAmt: { value: 0 }, moonDir: { value: new V3(0.3, 0.5, -0.8).normalize() }, moonAmt: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vD; uniform vec3 top, hor, bot, sunDir, sunCol, moonDir; uniform float sunAmt, moonAmt;
      void main(){ float h = vD.y; vec3 c = h>0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0),0.55)) : mix(hor, bot, clamp(-h*4.0,0.0,1.0));
        float sd = max(dot(vD, sunDir),0.0); c += sunCol * (pow(sd, 900.0)*3.0 + pow(sd, 18.0)*0.35) * sunAmt;
        float md = max(dot(vD, moonDir),0.0); c += vec3(0.85,0.9,1.0) * (smoothstep(0.9993,0.9996,md)*1.4 + pow(md, 60.0)*0.12) * moonAmt;
        gl_FragColor = vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -10; scene.add(sky);
  // stars
  { const r = rng(9), n = 1800, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = Math.acos(lerp(0.05, 1, r())); pos[i * 3] = Math.sin(ph) * Math.cos(th) * 1500; pos[i * 3 + 1] = Math.cos(ph) * 1500; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 1500; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false }));
    scene.add(stars); }

  /* lights */
  const hemi = new THREE.HemisphereLight(0x36507a, 0x0a0c12, 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xbcd0ff, 0.6); sun.castShadow = true;
  sun.shadow.mapSize.set(SH, SH); sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 220; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const warmA = new THREE.PointLight(0xffb066, 0, 16, 1.6); scene.add(warmA);
  const warmB = new THREE.PointLight(0xffb066, 0, 16, 1.6); scene.add(warmB);

  /* terrain */
  const TW = 720, TD = 780, seg = [150, 160];
  const tg = new THREE.PlaneGeometry(TW, TD, seg[0], seg[1]); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -280);
  const flats = []; // [x,z,r] areas to flatten (dioramas)
  const heightAt = (x, z, dist) => {
    let h = sstep(6, 75, dist) * (6 + 34 * fbm(x * 0.011 + 3, z * 0.011 - 2)) + (fbm(x * 0.07, z * 0.07) - 0.5) * 1.4 * sstep(4, 12, dist);
    for (const [fx, fz, fr] of flats) { const q = Math.hypot(x - fx, z - fz); h = lerp(-0.25, h, sstep(fr, fr + 10, q)); }
    return h - 0.25;
  };

  /* stations: positions */
  const ST = {};
  const mkStation = (key, day, side, off, sOverride) => {
    const s = sOverride ?? sOfDay(day); const p = trackPos(s), n = trackNormal(s), tan = trackTan(s);
    ST[key] = { key, day, s, side, p, n, tan, center: p.clone().addScaledVector(n, side * off) };
    return ST[key];
  };
  mkStation('s1', DAY.s1, -1, 15.5); mkStation('s2', DAY.s2, 1, 15.5); mkStation('s3', DAY.s3, -1, 15.5);
  mkStation('end', DAY.now, 1, 6.5, -1.5);
  for (const k of ['s1', 's2', 's3']) flats.push([ST[k].center.x, ST[k].center.z, 14]);
  flats.push([ST.end.center.x, ST.end.center.z, 6]);

  { const pa = tg.attributes.position, col = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i); const [dist, s] = nearestTrack(x, z);
      const h = heightAt(x, z, dist); pa.setY(i, h);
      const d = dayOfS(s); const n = fbm(x * 0.05 + 11, z * 0.05);
      const c = groundColor(d, n);
      if (dist < 4.2) c.lerp(C('#4a4540'), 0.85 * (1 - sstep(3.2, 4.2, dist)));
      c.multiplyScalar(lerp(1.0, 0.78, sstep(10, 60, h)) * lerp(1.0, 0.62, sstep(25, 120, dist)));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals(); }
  const terrain = new THREE.Mesh(tg, M.lam(0xffffff, { vertexColors: true })); terrain.receiveShadow = true; scene.add(terrain);

  /* track: ballast, rails, sleepers */
  { const N = 1400, L0 = -S0 + 1, L1 = SMAX - 2; const pos = [], idx = [], col = []; const r = rng(3);
    for (let i = 0; i <= N; i++) { const s = lerp(L0, L1, i / N); const p = trackPos(s), n = trackNormal(s);
      for (const [k, y] of [[-2.6, -0.2], [-1.9, 0.05], [1.9, 0.05], [2.6, -0.2]]) { pos.push(p.x + n.x * k, y, p.z + n.z * k); const v = 0.26 + r() * 0.05; col.push(v, v * 0.95, v * 0.9); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 4; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.lam(0xffffff, { vertexColors: true })); m.receiveShadow = true; scene.add(m);
    const railMat = M.pho(0x8a8f96, { shininess: 90, specular: 0x9aa3ad });
    for (const k of [-0.75, 0.75]) { const pts = []; for (let i = 0; i <= 700; i++) { const s = lerp(L0, L1, i / 700); const p = trackPos(s), n = trackNormal(s); pts.push(new V3(p.x + n.x * k, 0.32, p.z + n.z * k)); }
      const rc = new THREE.CatmullRomCurve3(pts); const rm = new THREE.Mesh(new THREE.TubeGeometry(rc, 2400, 0.075, 4, false), railMat); rm.castShadow = false; rm.receiveShadow = true; scene.add(rm); }
    const sleeperN = Math.floor((L1 - L0) / 0.9); const sg = new THREE.BoxGeometry(2.5, 0.16, 0.36);
    const sm = new THREE.InstancedMesh(sg, M.lam(0x5a4636), sleeperN); const dm = new THREE.Object3D();
    for (let i = 0; i < sleeperN; i++) { const s = L0 + i * 0.9; const p = trackPos(s), tn = trackTan(s); dm.position.set(p.x, 0.16, p.z); dm.rotation.set(0, Math.atan2(tn.x, tn.z), 0); dm.updateMatrix(); sm.setMatrixAt(i, dm.matrix); }
    sm.receiveShadow = true; scene.add(sm);
    // buffer stops at both ends
    for (const s of [-6, SMAX - 4]) { const p = trackPos(s), tn = trackTan(s); const g2 = new THREE.Group(); g2.position.copy(p); g2.rotation.y = Math.atan2(tn.x, tn.z);
      box(2.2, 0.9, 0.5, M.lam(0x9a2a22), 0, 0.9, 0, g2); box(0.25, 1.2, 0.25, M.lam(0x333333), -0.8, 0.6, 0.3, g2); box(0.25, 1.2, 0.25, M.lam(0x333333), 0.8, 0.6, 0.3, g2); scene.add(g2); }
  }

  sun.shadow.radius = 3;
  renderer.shadowMap.autoUpdate = false; let shadowKey = '';

  /* ------------------------------------------------------------ procedural textures ------------------------------------------------------------ */
  /* ------------------------------------------------------------ procedural textures ------------------------------------------------------------ */
  function woodTex(base, seed, w = 1024, rows = 8) {
    const r = rng(seed);
    const t = canvasTex(w, w, g => {
      const ph = w / rows;
      for (let i = 0; i < rows; i++) {
        let x0 = -r() * w * 0.5;
        while (x0 < w) {
          const len = w * (0.45 + r() * 0.5);
          const c = C(base).offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.1);
          g.fillStyle = '#' + c.getHexString(); g.fillRect(x0, i * ph, len, ph);
          g.save(); g.beginPath(); g.rect(x0, i * ph, len, ph); g.clip();
          for (let k = 0; k < 26; k++) { const y = i * ph + r() * ph; g.strokeStyle = r() < 0.65 ? `rgba(40,22,10,${0.05 + r() * 0.09})` : `rgba(255,230,200,${0.04 + r() * 0.06})`; g.lineWidth = 0.8 + r() * 1.6;
            g.beginPath(); g.moveTo(x0, y); for (let xx = x0; xx < x0 + len + 24; xx += 24) g.lineTo(xx, y + Math.sin(xx * 0.013 + k) * 2.2 + Math.sin(xx * 0.05 + k * 3) * 0.8); g.stroke(); }
          if (r() < 0.35) { const kx = x0 + r() * len, ky = i * ph + r() * ph; g.strokeStyle = 'rgba(50,25,10,0.3)'; g.lineWidth = 1.2; for (let q = 1; q < 5; q++) { g.beginPath(); g.ellipse(kx, ky, q * 5, q * 2.2, 0, 0, 7); g.stroke(); } }
          g.restore(); g.fillStyle = 'rgba(20,10,5,0.55)'; g.fillRect(x0 + len - 2, i * ph, 2, ph); x0 += len;
        }
        g.fillStyle = 'rgba(20,10,5,0.6)'; g.fillRect(0, i * ph, w, 2);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function plasterTex(base, seed, w = 512) {
    const r = rng(seed);
    const t = canvasTex(w, w, g => { g.fillStyle = base; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 2600; i++) { const s = 2 + r() * 16; g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.01 + r() * 0.022})` : `rgba(255,255,255,${0.02 + r() * 0.035})`; g.beginPath(); g.arc(r() * w, r() * w, s, 0, 7); g.fill(); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function fabricTex(base, seed) { const r = rng(seed);
    const t = canvasTex(256, 256, g => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 3) { g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.06})`; g.fillRect(i, 0, 1, 256); g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; g.fillRect(0, i, 256, 1); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  const spineTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (const y of [0.07, 0.11, 0.86, 0.9]) g.fillRect(0, y * h, w, h * 0.016);
    g.fillStyle = '#7a7a7a'; g.fillRect(w * 0.18, h * 0.3, w * 0.64, h * 0.3); g.fillStyle = '#efefef'; for (let i = 0; i < 5; i++) g.fillRect(w * 0.3, h * (0.34 + i * 0.05), w * 0.4, h * 0.012);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const terrazzo = (() => { const r = rng(83); const t = canvasTex(512, 512, (g, w) => { g.fillStyle = '#d9d8d3'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 3500; i++) { const c = ['#b9b6ae', '#8f8c86', '#ece9e2', '#c9b9a3', '#a5aab0'][Math.floor(r() * 5)]; g.fillStyle = c; g.beginPath(); g.arc(r() * w, r() * w, 0.8 + r() * 2.6, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(120,120,115,0.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, w); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();

  /* ------------------------------------------------------------ light band along the track + orbs ------------------------------------------------------------ */
  // The band (wide, soft, on the ground) and a thin core line share uniforms. pul[i] = (u, tailU, amp, dir): a bright head with a tail behind it.
  const TH0 = -5, TH1 = SMAX - 4; const uOfS = s => (s - TH0) / (TH1 - TH0);
  const bandU = { base: { value: 0 }, col: { value: C('#ffd9a0') }, headW: { value: 3.2 / (TH1 - TH0) }, pul: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, cross: { value: 0 } };
  const bandFrag = `uniform float base; uniform vec3 col; uniform float headW; uniform vec4 pul[3]; uniform float cross; varying vec2 vUv;
    void main(){ float a = base; for (int i=0;i<3;i++){ float x = (vUv.x - pul[i].x) * pul[i].w; float head = exp(-pow(x/headW, 2.0)); float tail = x < 0.0 ? exp(x / max(pul[i].y,1e-5)) : 0.0; a += pul[i].z * (head * 1.6 + tail * 0.7); }
      float c = cross > 0.5 ? exp(-pow((vUv.y-0.5)*3.4, 2.0)) : 1.0; gl_FragColor = vec4(col * a * c, 1.0); }`;
  const bandVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
  const band = (() => { const N = 1500, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const s = lerp(TH0, TH1, i / N); const p = trackPos(s), n = trackNormal(s);
      for (const k of [-6.5, 6.5]) { pos.push(p.x + n.x * k, 0.4, p.z + n.z * k); uv.push(i / N, k < 0 ? 0 : 1); } }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...bandU, cross: { value: 1 } }, vertexShader: bandVert, fragmentShader: bandFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 2; scene.add(m); return m; })();
  const thread = (() => { const pts = []; for (let i = 0; i <= 600; i++) { const s = lerp(TH0, TH1, i / 600); pts.push(trackPos(s).setY(0.44)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1800, 0.16, 4, false), new THREE.ShaderMaterial({ uniforms: { ...bandU, cross: { value: 0 } }, vertexShader: bandVert, fragmentShader: bandFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.frustumCulled = false; scene.add(m); return m; })();
  // the band and thread share the same uniform objects except `cross`
  band.material.uniforms.base = bandU.base; band.material.uniforms.pul = bandU.pul; band.material.uniforms.headW = bandU.headW; band.material.uniforms.col = bandU.col;
  thread.material.uniforms.base = bandU.base; thread.material.uniforms.pul = bandU.pul; thread.material.uniforms.headW = bandU.headW; thread.material.uniforms.col = bandU.col;
  const orbs = [0, 1, 2].map(() => { const g = new THREE.Group(); scene.add(g);
    const core = glowSprite(0xfff6e0, 4.6, g, 0, 0, 0, 1); const halo = glowSprite(0xffc070, 20, g, 0, 0, 0, 0.55); core.material.fog = halo.material.fog = false; return { g, core, halo }; });

  /* ------------------------------------------------------------ trees ------------------------------------------------------------ */
  { const r = rng(21); const N = 1700; const dm = new THREE.Object3D();
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1, 6); trunkGeo.translate(0, 0.5, 0);
    const roundGeo = new THREE.IcosahedronGeometry(1, 1); const coneGeo = new THREE.ConeGeometry(1, 2.2, 8); coneGeo.translate(0, 0.6, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, M.lam(0x4a3628), N);
    const rounds = new THREE.InstancedMesh(roundGeo, M.lam(0xffffff, { flatShading: true }), N);
    const cones = new THREE.InstancedMesh(coneGeo, M.lam(0xffffff, { flatShading: true }), N);
    let nr = 0, nc = 0, nt = 0;
    for (let i = 0; i < N * 3 && nt < N; i++) {
      const s = lerp(-12, SMAX - 6, r()); const side = r() < 0.5 ? -1 : 1; const off = 7 + Math.pow(r(), 1.6) * 95;
      const p = trackPos(s), n = trackNormal(s); const x = p.x + n.x * off * side + (r() - 0.5) * 6, z = p.z + n.z * off * side + (r() - 0.5) * 6;
      const [dist, s2] = nearestTrack(x, z); if (dist < 7) continue;
      let bad = false; for (const k in ST) { const c = ST[k].center; if (Math.hypot(x - c.x, z - c.z) < (k === 'end' ? 9 : 19)) bad = true; } if (bad) continue;
      const d = dayOfS(s2); const y = heightAt(x, z, dist); const sc = 2.2 + r() * 3.4; const bare = d > 27 ? r() < 0.22 : false;
      dm.position.set(x, y, z); dm.rotation.set(0, r() * 6.28, 0); dm.scale.set(1, sc * 0.9, 1); dm.updateMatrix(); trunks.setMatrixAt(nt, dm.matrix);
      const cc = crownColor(d, r); const cone = r() < 0.16;
      const cs = bare ? sc * 0.35 : sc * (0.55 + r() * 0.2);
      dm.position.set(x, y + sc * 0.9 * 0.85, z); dm.scale.set(cs * 1.05, cs * (cone ? 1.3 : 0.9), cs * 1.05); dm.updateMatrix();
      if (cone) { cones.setMatrixAt(nc, dm.matrix); cones.setColorAt(nc, cc); nc++; } else { rounds.setMatrixAt(nr, dm.matrix); rounds.setColorAt(nr, cc); nr++; }
      nt++;
    }
    trunks.count = nt; rounds.count = nr; cones.count = nc;
    for (const m of [trunks, rounds, cones]) { m.castShadow = false; m.receiveShadow = true; scene.add(m); }
    rounds.instanceColor.needsUpdate = true; if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
  }

  /* ------------------------------------------------------------ lamps along the track ------------------------------------------------------------ */
  const lamps = [];
  const step = 11; const nL = Math.floor((SMAX - 10) / step);
  const lampPts = (() => { const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 4.4, 6); poleGeo.translate(0, 2.2, 0);
    const poles = new THREE.InstancedMesh(poleGeo, M.lam(0x2b2f36), nL); const dm = new THREE.Object3D();
    const headGeo = new THREE.BoxGeometry(0.5, 0.18, 0.5); const heads = new THREE.InstancedMesh(headGeo, M.lam(0x1e2126), nL);
    const gp = new Float32Array(nL * 3), gs = new Float32Array(nL);
    for (let i = 0; i < nL; i++) { const s = -4 + i * step; const side = i % 2 ? 1 : -1; const p = trackPos(s), n = trackNormal(s);
      const x = p.x + n.x * 3.4 * side, z = p.z + n.z * 3.4 * side; dm.position.set(x, 0, z); dm.updateMatrix(); poles.setMatrixAt(i, dm.matrix);
      dm.position.set(x, 4.5, z); dm.updateMatrix(); heads.setMatrixAt(i, dm.matrix);
      gp[i * 3] = x; gp[i * 3 + 1] = 4.3; gp[i * 3 + 2] = z; lamps.push({ x, z, s, day: dayOfS(s) }); }
    scene.add(poles); scene.add(heads);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(gp, 3)); g.setAttribute('glow', new THREE.BufferAttribute(gs, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { map: { value: glowTex }, scale: { value: H * 0.5 } },
      vertexShader: 'attribute float glow; varying float vG; uniform float scale; void main(){ vG = glow; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = clamp(scale*3.4/(-mv.z), 9.0, 210.0)*step(0.001,glow); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vG; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0,0.76,0.44)*t.a*vG*1.9, 1.0); }' }));
    m.frustumCulled = false; scene.add(m); return m; })();
  const pools = (() => { const poolGeo = new THREE.CircleGeometry(5.2, 24); poolGeo.rotateX(-Math.PI / 2);
    const m = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), nL); const dm = new THREE.Object3D();
    for (let i = 0; i < nL; i++) { const l = lamps[i]; dm.position.set(l.x, 0.45, l.z); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); m.setColorAt(i, C('#000000')); }
    scene.add(m); return m; })();

  /* ------------------------------------------------------------ date gates (3D) + labels ------------------------------------------------------------ */
  const NOTEXT = Q.get('notext') === '1';
  const signTex = (top, bottom, bg = '#12233d', fg = '#f4efe2', w = 1024, h = 512) => canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40);
    if (NOTEXT) return;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${bottom ? 170 : 200}px "Noto Sans TC"`; g.fillText(top, w / 2, bottom ? h * 0.38 : h / 2);
    if (bottom) { g.font = '500 110px "Noto Sans TC"'; g.fillText(bottom, w / 2, h * 0.74); }
  });
  const labelTex = (txt) => canvasTex(512, 256, (g, w, h) => { if (NOTEXT) return; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 150px "Noto Sans TC"';
    g.lineWidth = 16; g.strokeStyle = 'rgba(10,14,24,0.85)'; g.strokeText(txt, w / 2, h / 2 + 6); g.fillStyle = '#fff3dc'; g.fillText(txt, w / 2, h / 2 + 6); });
  const gates = [];
  { const list = [[1, '10/1'], [10, '10/10'], [20, '10/20']];
    const gm = M.lam(0x2b2f36);
    for (const [d, label] of list) { const s = sOfDay(d); const p = trackPos(s), tn = trackTan(s);
      const g = new THREE.Group(); g.position.copy(p); g.rotation.y = Math.atan2(tn.x, tn.z); scene.add(g);
      box(0.32, 7.4, 0.32, gm, -3.7, 3.7, 0, g, false); box(0.32, 7.4, 0.32, gm, 3.7, 3.7, 0, g, false); box(7.8, 0.36, 0.36, gm, 0, 7.2, 0, g, false);
      const tx = signTex(label, '', '#14213a', '#ffe7c2', 768, 384);
      for (const [rz, z] of [[Math.PI, -0.22], [0, 0.22]]) { const pl = mesh(new THREE.PlaneGeometry(4.4, 2.2), M.bas(0xffffff, { map: tx }), 0, 5.7, z, g, false); pl.rotation.y = rz; pl.material.toneMapped = false; }
      const glow = glowSprite(0xffd9a8, 12, g, 0, 5.7, 0, 0.0);
      const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(label), transparent: true, depthTest: false, depthWrite: false, fog: false, opacity: 0, toneMapped: false }));
      lab.position.copy(p).setY(15); lab.renderOrder = 20; scene.add(lab);
      gates.push({ g, glow, lab, s }); } }

  /* ------------------------------------------------------------ platforms, signs (faces are DOM overlays), beacons ------------------------------------------------------------ */
  const signs = {};
  const quadOf = (obj, w, h, cx = 0, cy = 0, z = 0) => [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => obj.localToWorld(new V3(cx + sx * w / 2, cy + sy * h / 2, z)));
  const platform = (st, dir) => {
    const { p, n, tan, side } = st; const g = new THREE.Group(); g.position.copy(p).addScaledVector(n, side * 3.4);
    g.rotation.y = Math.atan2(tan.x, tan.z) + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    box(18, 0.95, 3.6, M.lam(0x8d8a84), 0, 0.47, -1.5, g); const edgeMat = M.bas(0xd9c25a); box(18, 0.08, 0.35, edgeMat, 0, 0.97, 0.15, g, false);
    scene.add(g); st.edgeMat = edgeMat;
    // the station sign stands a few metres ahead (in the direction the train arrives from) and turns to face the stopped train
    const sS = st.s + dir * 7.5; const sp = trackPos(sS).addScaledVector(trackNormal(sS), side * 4.4);
    const cam = trackPos(st.s).setY(2.6);
    const sg = new THREE.Group(); sg.position.copy(sp); sg.rotation.y = Math.atan2(cam.x - sp.x, cam.z - sp.z); scene.add(sg);
    const postM = M.lam(0x2a2e35);
    cyl(0.1, 0.1, 5.0, postM, -2.75, 2.5, -0.06, sg, 8); cyl(0.1, 0.1, 5.0, postM, 2.75, 2.5, -0.06, sg, 8);
    box(5.75, 2.7, 0.14, M.lam(0x16191e), 0, 3.9, -0.08, sg);
    mesh(new THREE.PlaneGeometry(5.4, 2.42), M.bas(0x1c2a40), 0, 3.9, 0.0, sg, false);
    box(1.2, 0.12, 0.5, postM, 0, 5.35, 0.25, sg, false); glowSprite(0xffe2b0, 3.2, sg, 0, 5.2, 0.45, 0.55);
    sg.updateMatrixWorld(true);
    signs[st.key] = { quad: quadOf(sg, 5.4, 2.42, 0, 3.9, 0.02), center: sg.localToWorld(new V3(0, 3.9, 0)) };
  };
  platform(ST.s1, +1); platform(ST.s2, -1); platform(ST.s3, -1);
  const beamGeo = new THREE.CylinderGeometry(1.1, 1.8, 160, 16, 1, true); beamGeo.translate(0, 80, 0);
  const beacons = {}, flashes = {};
  const mkBeacon = (st, color) => { const x = st.center.x, z = st.center.z;
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(x, 11, z); m.scale.set(1, 0.6, 1); scene.add(m);
    const s = glowSprite(color, 24, scene, x, 11, z, 0.9); s.material.fog = false;
    const pg = new THREE.CircleGeometry(30, 32); pg.rotateX(-Math.PI / 2); const pool = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); pool.position.set(x, 0.6, z); scene.add(pool);
    beacons[st.key] = { m, s, pool, top: new V3(x, 160 * 0.6 + 11, z) }; };
  mkBeacon(ST.s1, 0xffc070); mkBeacon(ST.s2, 0xffb35c); mkBeacon(ST.s3, 0xffd08a);
  for (const k of ['s1', 's2', 's3']) { const st = ST[k]; const pp = st.p.clone().addScaledVector(st.n, st.side * 2.2).setY(1.6); const f = glowSprite(0xfff0d0, 7, scene, pp.x, pp.y, pp.z, 0); f.material.fog = false; flashes[k] = f; } // small: the arrival camera is right next to the station (a size-22 glow whited out the frame)

  /* ------------------------------------------------------------ the timetable board at the end of the line ------------------------------------------------------------ */
  const board = {};
  { const st = ST.end; const g = new THREE.Group(); g.position.copy(st.center); const toTrack = st.p.clone().sub(st.center).setY(0).normalize(); g.rotation.y = Math.atan2(toTrack.x, toTrack.z); scene.add(g);
    box(9, 0.6, 5, M.lam(0x8d8a84), 0, 0.3, -0.6, g);
    const postM = M.lam(0x23262c);
    cyl(0.13, 0.13, 6.4, postM, -3.45, 3.2, -0.2, g, 8); cyl(0.13, 0.13, 6.4, postM, 3.45, 3.2, -0.2, g, 8);
    box(7.1, 3.55, 0.2, M.lam(0x15171b), 0, 3.85, -0.22, g);
    mesh(new THREE.PlaneGeometry(6.8, 3.23), M.bas(0x101a28), 0, 3.85, -0.1, g, false);
    box(7.4, 0.18, 0.9, postM, 0, 6.05, 0.15, g, false);
    board.glow = glowSprite(0xffe0b0, 9, g, 0, 5.85, 0.9, 0.5);
    // a lamp post beside the board + bench
    cyl(0.08, 0.1, 5.2, postM, 4.6, 2.6, 0.8, g, 6); mesh(new THREE.SphereGeometry(0.26, 12, 8), M.bas(0xfff2d6), 4.6, 5.25, 0.8, g, false); board.lampGlow = glowSprite(0xffd39a, 6, g, 4.6, 5.25, 0.8, 0.8);
    box(2.6, 0.12, 0.7, M.lam(0x6b4a30), -2.2, 1.1, 1.2, g); box(2.6, 0.55, 0.1, M.lam(0x6b4a30), -2.2, 1.45, 0.88, g);
    g.updateMatrixWorld(true);
    board.quad = quadOf(g, 6.8, 3.23, 0, 3.85, -0.08); board.center = g.localToWorld(new V3(0, 3.85, 0)); board.g = g;
    board.L = (x, y, z) => g.localToWorld(new V3(x, y, z));
    board.light = board.L(0, 5.6, 1.6);
  }

  /* ------------------------------------------------------------ station cabins (cut-away rooms on plinths; the open side faces the track) ------------------------------------------------------------ */
  const placeDiorama = (st) => {
    const g = new THREE.Group(); g.position.copy(st.center); g.position.y = 0;
    const toTrack = st.p.clone().sub(st.center).setY(0).normalize(); g.rotation.y = Math.atan2(toTrack.x, toTrack.z);
    scene.add(g); g.updateMatrixWorld(true); st.group = g; return g;
  };
  const stoneT = plasterTex('#5f5a54', 91); stoneT.repeat.set(3, 1);
  const stone = M.lam(0xffffff, { map: stoneT }), brass = M.pho(0xc8a25a, { shininess: 80, specular: 0x886633 });
  const plinth = (g, w = 17, d = 13) => { box(w, 1.3, d, stone, 0, 0.65, 0, g); for (const [x, z, ww, dd] of [[0, d / 2, w, 0.12], [0, -d / 2, w, 0.12], [w / 2, 0, 0.12, d], [-w / 2, 0, 0.12, d]]) box(ww, 0.1, dd, brass, x, 1.32, z, g, false); };
  const FY = 1.4;
  const shaftSet = (g, list, color = 0xfff1cf) => { const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, map: beamTex, fog: false });
    for (const [x, y, z, w, h, rx, ry, rz] of list) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); sh.position.set(x, y, z); sh.rotation.set(rx, ry, rz); sh.scale.y = -1; g.add(sh); } return mat; };
  const dustSet = (g, n, [x0, x1], [y0, y1], [z0, z1], seed) => { const p = new Float32Array(n * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: 0xfff0c8, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; g.add(pts);
    const seeds = Array.from({ length: n }, (_, i) => { const r = rng(seed + i); return [lerp(x0, x1, r()), r(), lerp(z0, z1, r()), r()]; });
    return { pts, update(W, k) { pts.material.opacity = k; pts.visible = k > 0.01; if (!pts.visible) return; const a = geo.attributes.position.array;
      seeds.forEach(([x, y, z, ph], i) => { a[i * 3] = x + Math.sin(W * 0.21 + ph * 20) * 0.5; a[i * 3 + 1] = y0 + ((y * (y1 - y0) + W * 0.05 * (0.5 + ph)) % (y1 - y0)); a[i * 3 + 2] = z + Math.cos(W * 0.17 + ph * 13) * 0.5; }); geo.attributes.position.needsUpdate = true; } }; };
  const corkTex = (() => { const r = rng(404); const t = canvasTex(512, 512, (cx, w) => { cx.fillStyle = '#a8794a'; cx.fillRect(0, 0, w, w);
    for (let i = 0; i < 9000; i++) { cx.fillStyle = r() < 0.5 ? `rgba(70,40,15,${0.10 + r() * 0.2})` : `rgba(230,190,140,${0.08 + r() * 0.16})`; cx.fillRect(r() * w, r() * w, 1 + r() * 3, 1 + r() * 3); } }); return t; })();
  const bookColors = ['#7a2e2a', '#2e4a6b', '#d8cdb5', '#3f5f45', '#a0763a', '#5a3d5c', '#c9b38a', '#2a3a4a', '#8a5a36'];
  const cabins = {};
  const mkCabin = (st, cfg) => {
    const g = placeDiorama(st); plinth(g);
    const L = (x, y, z) => g.localToWorld(new V3(x, y, z));
    const wood = woodTex(cfg.floor, 31 + cfg.seed); wood.repeat.set(2.2, 2.2);
    box(16, 0.12, 12, M.lam(0xffffff, { map: wood }), 0, FY - 0.04, 0, g);
    const plas = plasterTex(cfg.wall, 7 + cfg.seed); plas.repeat.set(3, 1.4); const wallM = M.lam(0xffffff, { map: plas });
    // back wall with a big window behind the desk (opening x −3.6…4.0, y FY+2.0…FY+6.2): the season and the hour show around the screens
    box(4.4, 7.2, 0.3, wallM, -5.8, FY + 3.6, -5.85, g); box(4.0, 7.2, 0.3, wallM, 6.0, FY + 3.6, -5.85, g);
    box(7.6, 2.0, 0.3, wallM, 0.2, FY + 1.0, -5.85, g); box(7.6, 1.0, 0.3, wallM, 0.2, FY + 6.7, -5.85, g);
    { const fm = M.lam(cfg.frame); for (const x of [-3.6, -1.07, 1.47, 4.0]) box(0.14, 4.2, 0.38, fm, x, FY + 4.1, -5.85, g, false);
      for (const y of [FY + 2.0, FY + 4.1, FY + 6.2]) box(7.74, 0.14, 0.38, fm, 0.2, y, -5.85, g, false); box(7.9, 0.1, 0.7, fm, 0.2, FY + 1.97, -5.6, g); }
    // left wall with a big window (opening z −4.6…1.4, y FY+1.3…FY+5.7)
    box(0.3, 1.3, 12, wallM, -7.85, FY + 0.65, 0, g); box(0.3, 1.5, 12, wallM, -7.85, FY + 6.45, 0, g);
    box(0.3, 4.4, 1.4, wallM, -7.85, FY + 3.5, -5.3, g); box(0.3, 4.4, 4.6, wallM, -7.85, FY + 3.5, 3.7, g);
    const frameM = M.lam(cfg.frame);
    for (const z of [-4.6, -1.6, 1.4]) box(0.38, 4.4, 0.13, frameM, -7.85, FY + 3.5, z, g, false);
    for (const y of [FY + 1.3, FY + 3.5, FY + 5.7]) box(0.38, 0.13, 6.13, frameM, -7.85, y, -1.6, g, false);
    box(0.8, 0.1, 6.3, frameM, -7.55, FY + 1.25, -1.6, g);
    box(0.3, 7.2, 12, wallM, 7.85, FY + 3.6, 0, g);
    box(16.4, 0.3, 12.4, M.lam(cfg.ceil), 0, FY + 7.35, 0, g);
    const roofM = M.lam(cfg.roof);
    for (const sx of [-1, 1]) { const r = box(9.3, 0.32, 13.2, roofM, sx * 4.05, FY + 9.1, 0, g); r.rotation.z = -sx * 0.43; }
    box(16.6, 0.5, 0.4, frameM, 0, FY + 7.25, 6.05, g, false); // header beam over the cut-away side
    box(16, 0.3, 0.08, M.lam(0x2a1e16), 0, FY + 0.15, -5.68, g, false); // baseboard
    // rug, desk, drawers
    box(6.6, 0.03, 4.4, M.lam(0xffffff, { map: fabricTex(cfg.rug, 5 + cfg.seed) }), 0.4, FY + 0.03, -2.4, g, false).receiveShadow = true;
    const deskM = M.lam(0xffffff, { map: woodTex(cfg.desk, 61 + cfg.seed, 512, 3) });
    box(6.0, 0.12, 1.95, deskM, 0.6, FY + 1.55, -4.78, g);
    for (const [x, z] of [[3.45, -3.95], [3.45, -5.6]]) box(0.12, 1.5, 0.12, deskM, x, FY + 0.75, z, g, false);
    box(1.3, 1.49, 1.8, deskM, -1.75, FY + 0.75, -4.78, g);
    for (const y of [0.4, 0.9]) box(1.1, 0.03, 0.02, M.lam(0x2a1e16), -1.75, FY + y, -3.87, g, false);
    { const cupM = M.pho(cfg.cupCol ?? 0x7a3a2a, { shininess: 40 }); cyl(0.16, 0.14, 0.34, cupM, -1.05, FY + 1.78, -3.98, g, 16);
      for (let i = 0; i < 4; i++) { const p = cyl(0.018, 0.018, 0.5, M.lam([0xd9b44a, 0x2a2a2a, 0xc0392b, 0x3b6fd8][i]), -1.05 + (i - 1.5) * 0.05, FY + 2.0, -3.98 + (i % 2 ? 0.04 : -0.04), g, 6); p.rotation.z = (i - 1.5) * 0.12; }
      const nb = box(0.95, 0.06, 0.66, M.lam(0x2f4a3a), -0.15, FY + 1.64, -4.0, g); nb.rotation.y = 0.18; box(0.9, 0.012, 0.6, M.lam(0xf2ede2), -0.15, FY + 1.676, -4.0, g, false).rotation.y = 0.18;
      cyl(0.36, 0.28, 0.75, M.lam(0x8a5a3a), -2.4, FY + 0.38, -0.4, g, 14);
      for (let i = 0; i < 7; i++) { const r = rng(140 + i + cfg.seed); const lf = mesh(new THREE.IcosahedronGeometry(0.42 + r() * 0.25, 1), M.lam(0x3f7f35, { flatShading: true }), -2.4 + (r() - 0.5) * 0.8, FY + 1.1 + r() * 1.7, -0.4 + (r() - 0.5) * 0.8, g); lf.scale.y = 1.3; } }
    // monitors (screens are DOM overlays; the planes here are the dark glass)
    const monM = M.pho(0x1b1d22, { shininess: 70 }), scrM = M.bas(0x22324a);
    const screens = [];
    for (const mo of cfg.monitors) { const mg = new THREE.Group(); mg.position.set(mo.x, FY + 1.61, -5.05); mg.rotation.y = mo.ry || 0; g.add(mg);
      cyl(0.34, 0.4, 0.05, monM, 0, 0.025, 0.12, mg, 20); box(0.13, mo.y - 0.25, 0.08, monM, 0, (mo.y - 0.25) / 2, 0.02, mg);
      box(mo.w + 0.1, mo.h + 0.1, 0.07, monM, 0, mo.y, 0, mg);
      mesh(new THREE.PlaneGeometry(mo.w, mo.h), scrM, 0, mo.y, 0.037, mg, false);
      mg.updateMatrixWorld(true);
      const glow = glowSprite(cfg.screenCol, mo.w * 1.9, mg, 0, mo.y, 0.5, 0.0);
      screens.push({ quad: quadOf(mg, mo.w, mo.h, 0, mo.y, 0.042), glow, center: mg.localToWorld(new V3(0, mo.y, 0.05)), w: mo.w, h: mo.h }); }
    // cork board on the back wall, right of the desk
    { box(3.55, 3.05, 0.08, frameM, 6.0, FY + 3.4, -5.68, g, false); const ck = mesh(new THREE.PlaneGeometry(3.3, 2.8), M.lam(0xffffff, { map: corkTex }), 6.0, FY + 3.4, -5.62, g, false); ck.receiveShadow = true; }
    const cork = quadOf(g, 3.3, 2.8, 6.0, FY + 3.4, -5.6);
    // the question note sits on the wall, left of the main monitor
    const mm = cfg.monitors[0]; const nx = mm.x - mm.w / 2 - 0.66;
    const note = (() => { const a = -0.05, w = 1.0, h = 0.7, cx = nx, cy = FY + 3.05; const ca = Math.cos(a), sa = Math.sin(a);
      return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => { const x = sx * w / 2, y = sy * h / 2; return L(cx + x * ca - y * sa, cy + x * sa + y * ca, -5.62); }); })();
    // desk lamp (arm lamp, right side)
    const lampM = M.pho(cfg.lampCol, { shininess: 70 });
    const lx = cfg.lampX, lz = -4.95;
    cyl(0.24, 0.28, 0.06, lampM, lx, FY + 1.64, lz, g, 18); const a1 = box(0.06, 1.25, 0.06, lampM, lx - 0.12, FY + 2.2, lz + 0.05, g, false); a1.rotation.z = 0.25;
    const a2 = box(0.06, 0.95, 0.06, lampM, lx - 0.55, FY + 2.82, lz + 0.18, g, false); a2.rotation.z = 1.2;
    const shade = mesh(new THREE.CylinderGeometry(0.1, 0.32, 0.36, 18, 1, true), M.pho(cfg.lampCol, { side: THREE.DoubleSide }), lx - 0.98, FY + 2.68, lz + 0.3, g, false); shade.rotation.z = 0.5;
    const bulbP = new V3(lx - 1.0, FY + 2.5, lz + 0.35);
    const lampGlow = glowSprite(0xffd9a0, 1.6, g, bulbP.x, bulbP.y, bulbP.z, 0.0);
    // chair, shelf, plant
    { const c = new THREE.Group(); c.position.set(-1.0, FY, -2.7); c.rotation.y = 0.55; g.add(c); const cm = M.lam(cfg.chair);
      cyl(0.05, 0.05, 0.8, M.pho(0x333333), 0, 0.4, 0, c, 8); box(1.0, 0.12, 0.95, cm, 0, 0.88, 0, c); box(1.0, 1.05, 0.12, cm, 0, 1.5, 0.46, c); cyl(0.42, 0.42, 0.05, M.pho(0x333333), 0, 0.03, 0, c, 10); }
    { const sh = new THREE.Group(); sh.position.set(7.35, FY, -1.6); g.add(sh); const sm = M.lam(cfg.desk === '#8a6040' ? 0x5a3d26 : 0x4a3426);
      box(0.7, 5.2, 0.12, sm, 0, 2.6, -2.2, sh); box(0.7, 5.2, 0.12, sm, 0, 2.6, 2.2, sh); for (const y of [0.1, 1.35, 2.6, 3.85, 5.1]) box(0.7, 0.1, 4.4, sm, 0, y, 0, sh);
      const r = rng(900 + cfg.seed); for (const y of [0.15, 1.4, 2.65, 3.9]) { let z = -2.05; while (z < 2.0) { const bw = 0.12 + r() * 0.14, bh = 0.75 + r() * 0.35; if (r() < 0.12) { z += 0.3; continue; }
        box(0.55, bh, bw, M.lam(bookColors[Math.floor(r() * bookColors.length)]), -0.02, y + bh / 2, z + bw / 2, sh, false); z += bw + 0.01; } } }
    { cyl(0.42, 0.32, 0.85, M.lam(0xb4775a), -6.7, FY + 0.43, -5.0, g, 14); for (let i = 0; i < 5; i++) { const r = rng(70 + i + cfg.seed); mesh(new THREE.IcosahedronGeometry(0.55 + r() * 0.3, 1), M.lam(0x3f7f35, { flatShading: true }), -6.7 + (r() - 0.5) * 0.7, FY + 1.3 + r() * 1.4, -5.0 + (r() - 0.5) * 0.7, g); } }
    // window light: three slanted shafts from the window toward the desk and floor, plus dust
    const shaft = shaftSet(g, cfg.shafts, cfg.shaftCol);
    const dust = dustSet(g, 220, [-7.4, 1], [FY + 0.4, FY + 5.6], [-5.4, 1.4], 1000 + cfg.seed * 50);
    // painted sky behind the windows (only drawn while we are inside): the hour and the season you see around the screens
    const sky = cfg.sky; const bdTex = canvasTex(1024, 512, (cx, W2, H2) => { const r = rng(500 + cfg.seed);
      const gr = cx.createLinearGradient(0, 0, 0, H2); sky.stops.forEach(([o, c]) => gr.addColorStop(o, c)); cx.fillStyle = gr; cx.fillRect(0, 0, W2, H2);
      if (sky.stars) for (let i = 0; i < 160; i++) { cx.fillStyle = `rgba(230,236,255,${0.3 + r() * 0.6})`; cx.fillRect(r() * W2, r() * H2 * 0.55, 1.6, 1.6); }
      const [sx, sy, sr, sc] = sky.sun; const sg = cx.createRadialGradient(sx * W2, sy * H2, 0, sx * W2, sy * H2, sr * W2); sg.addColorStop(0, sc[0]); sg.addColorStop(0.12, sc[1]); sg.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = sg; cx.fillRect(0, 0, W2, H2);
      if (sky.moon) { cx.fillStyle = '#f4f1e2'; cx.beginPath(); cx.arc(sx * W2, sy * H2, 16, 0, 7); cx.fill(); }
      const ridge = (y0, amp, col, seed) => { const rr = rng(seed); cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, H2); let y = y0; for (let x = 0; x <= W2; x += 16) { y += (rr() - 0.5) * amp; y = Math.max(y0 - amp * 2, Math.min(y0 + amp * 2, y)); cx.lineTo(x, y * H2 / 512); } cx.lineTo(W2, H2); cx.fill(); };
      // the desk camera sees rows ~200-300 of this texture through the back window, so the hills and trees sit there
      ridge(258, 12, sky.far, 11 + cfg.seed); ridge(298, 16, sky.near, 21 + cfg.seed);
      const blob = (x, y, s, col) => { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y - s * 0.6, s, 0, 7); cx.arc(x - s * 0.55, y - s * 0.35, s * 0.7, 0, 7); cx.arc(x + s * 0.55, y - s * 0.3, s * 0.72, 0, 7); cx.fill(); cx.fillRect(x - 3, y - s * 0.2, 6, s * 0.9); };
      for (let i = 0; i < 26; i++) blob(r() * W2, 300 + r() * 40, 30 + r() * 30, sky.trees[Math.floor(r() * sky.trees.length)]);
      cx.fillStyle = sky.near; cx.fillRect(0, 330, W2, H2 - 330);
      for (let i = 0; i < 60; i++) blob(r() * W2, 336 + r() * 120, 16 + r() * 26, sky.trees[Math.floor(r() * sky.trees.length)]); }, true);
    const bdM = M.bas(0xffffff, { map: bdTex, fog: false }); bdM.toneMapped = false;
    const bd1 = mesh(new THREE.PlaneGeometry(34, 17), bdM, 0.2, FY + 4.6, -10.5, g, false);
    const bd2 = mesh(new THREE.PlaneGeometry(34, 17), bdM, -12.5, FY + 4.6, -1.6, g, false); bd2.rotation.y = Math.PI / 2;
    const c = { g, L, screens, cork, note, lampGlow, lampPos: L(bulbP.x, bulbP.y, bulbP.z), shaft, dust, screenCol: cfg.screenCol, props: {}, backdrop: [bd1, bd2] };
    cfg.props && cfg.props(g, c);
    cabins[st.key] = c; return c;
  };
  const SHAFTS = [[-2.3, FY + 2.6, -2.6, 2.2, 8.4, -0.95, 0.08, 0], [0.2, FY + 2.6, -2.6, 2.2, 8.4, -0.95, 0, 0], [2.7, FY + 2.6, -2.6, 2.2, 8.4, -0.95, -0.08, 0]];
  const paperTex = (draw) => canvasTex(256, 340, (cx, w, h) => { cx.fillStyle = '#f2ede2'; cx.fillRect(0, 0, w, h); draw(cx, w, h); });
  mkCabin(ST.s1, { seed: 1, sky: { stops: [[0, '#5d8fc8'], [0.45, '#e9b98a'], [0.7, '#ffd29a'], [1, '#c98a5a']], sun: [0.72, 0.5, 0.45, ['rgba(255,244,214,1)', 'rgba(255,214,150,0.75)']], far: '#c08a5a', near: '#7a5a34', trees: ['#9a8a3a', '#b8902e', '#c27a2e', '#6f7a34', '#a86a2a'] }, floor: '#8a5a36', wall: '#e8dcc6', frame: 0x4a3524, ceil: 0x3a2e26, roof: 0x5a3a2a, rug: '#6b3a2a', desk: '#8a6040', chair: 0x3a4a5a, lampCol: 0x2f3a33, lampX: 3.35, screenCol: 0xbcd6ff, shaftCol: 0xffd9a0, shafts: SHAFTS,
    monitors: [{ x: -0.5, w: 2.1, h: 1.18, y: 0.98, ry: 0.07 }, { x: 1.72, w: 2.1, h: 1.18, y: 0.98, ry: -0.07 }],
    props: (g) => { const sw = canvasTex(256, 128, (cx, w, h) => { cx.fillStyle = '#f4efe4'; cx.fillRect(0, 0, w, h); ['#1f2a44', '#e2643c', '#f3efe6', '#7b8aa6', '#3aa38a'].forEach((col, i) => { cx.fillStyle = col; cx.fillRect(14 + i * 46, 18, 40, 92); }); });
      const s = mesh(new THREE.PlaneGeometry(0.9, 0.45), M.lam(0xffffff, { map: sw }), -0.9, FY + 1.62, -4.15, g, false); s.rotation.x = -Math.PI / 2; s.rotation.z = 0.2;
      box(1.0, 0.05, 0.72, M.lam(0x2f3b33), 2.25, FY + 1.635, -4.3, g, false); const pg = mesh(new THREE.PlaneGeometry(0.92, 0.64), M.lam(0xf2ede2), 2.25, FY + 1.665, -4.3, g, false); pg.rotation.x = -Math.PI / 2; } });
  mkCabin(ST.s2, { seed: 2, sky: { stops: [[0, '#1f2550'], [0.4, '#7a4a78'], [0.66, '#e07a62'], [0.78, '#f2a46a'], [1, '#3a2228']], sun: [0.3, 0.55, 0.35, ['rgba(255,200,140,0.9)', 'rgba(240,120,90,0.45)']], far: '#4a2a3e', near: '#24161e', trees: ['#3a1e22', '#4a2420', '#2e1a20', '#5a2a1e'] }, floor: '#6e4a30', wall: '#d9cdb8', frame: 0x3a2a20, ceil: 0x2c241f, roof: 0x4a3226, rug: '#2f4a3a', desk: '#7a5236', chair: 0x5a3a2a, lampCol: 0x6a1e1a, lampX: 3.6, screenCol: 0xc8dcff, shaftCol: 0xffc9a8, shafts: SHAFTS,
    monitors: [{ x: 0.55, w: 3.0, h: 1.69, y: 1.12, ry: 0 }],
    props: (g) => { const sheet = paperTex((cx, w, h) => { cx.fillStyle = '#2b2b2b'; cx.fillRect(18, 18, 120, 12); for (let i = 0; i < 13; i++) { cx.fillStyle = '#c9c1b0'; cx.fillRect(18, 48 + i * 21, 150, 7); cx.fillStyle = '#9a917f'; cx.fillRect(190, 48 + i * 21, 40, 7); } });
      for (let i = 0; i < 13; i++) { const r = rng(300 + i); const s = mesh(new THREE.BoxGeometry(0.82, 0.006, 1.08), [M.lam(0xeee8dc), M.lam(0xeee8dc), i === 12 ? M.lam(0xffffff, { map: sheet }) : M.lam(0xf2ede2), M.lam(0xeee8dc), M.lam(0xeee8dc), M.lam(0xeee8dc)], -1.95 + (r() - 0.5) * 0.05, FY + 1.615 + i * 0.007, -4.3 + (r() - 0.5) * 0.05, g, false); s.rotation.y = 0.1 + (r() - 0.5) * 0.08; s.receiveShadow = true; }
      cyl(0.13, 0.1, 0.26, M.pho(0xf4f0e8), 2.55, FY + 1.74, -4.2, g, 14); } });
  mkCabin(ST.s3, { seed: 3, sky: { stops: [[0, '#0b1636'], [0.5, '#1f3366'], [0.74, '#4a6aa6'], [1, '#141c34']], sun: [0.66, 0.4, 0.22, ['rgba(255,252,236,1)', 'rgba(180,200,255,0.5)']], moon: true, stars: true, far: '#1c2a4e', near: '#0e1426', trees: ['#16203a', '#1e2436', '#18202e', '#2a2030'] }, floor: '#5e3e28', wall: '#cfc4b2', frame: 0x30241c, ceil: 0x221c18, roof: 0x3a2a22, rug: '#4a3a5a', desk: '#6a4630', chair: 0x2e3440, lampCol: 0xc8a25a, lampX: 3.75, screenCol: 0xb8d0ff, shaftCol: 0xbcd0ff, shafts: SHAFTS,
    monitors: [{ x: 0.55, w: 3.6, h: 1.54, y: 1.02, ry: 0 }],
    props: (g) => { // the clay teacher (a white dumpling with a red bow tie) and the purple taro-ball student
      const clay = (c) => M.lam(c); const bao = new THREE.Group(); bao.position.set(2.55, FY + 1.61, -4.15); bao.rotation.y = -0.35; g.add(bao);
      const body = mesh(new THREE.SphereGeometry(0.3, 20, 14), clay(0xf1ece2), 0, 0.22, 0, bao); body.scale.set(1, 0.78, 1);
      mesh(new THREE.SphereGeometry(0.07, 10, 8), clay(0xf1ece2), 0, 0.48, 0, bao); mesh(new THREE.SphereGeometry(0.045, 10, 8), clay(0xf1ece2), 0, 0.55, 0, bao);
      for (const x of [-0.09, 0.09]) mesh(new THREE.SphereGeometry(0.035, 8, 6), clay(0x1a1a1a), x, 0.27, 0.27, bao, false);
      for (const x of [-0.06, 0.06]) { const b = mesh(new THREE.ConeGeometry(0.05, 0.1, 8), clay(0xc0281e), x, 0.08, 0.28, bao, false); b.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2; }
      const yu = new THREE.Group(); yu.position.set(3.05, FY + 1.61, -3.95); yu.rotation.y = -0.6; g.add(yu);
      mesh(new THREE.SphereGeometry(0.19, 18, 12), clay(0x9a7bbf), 0, 0.19, 0, yu); for (const x of [-0.06, 0.06]) mesh(new THREE.SphereGeometry(0.028, 8, 6), clay(0x1a1a1a), x, 0.23, 0.17, yu, false);
      cyl(0.012, 0.012, 0.12, clay(0x4a8a3a), 0, 0.42, 0, yu, 6); const lf = mesh(new THREE.SphereGeometry(0.05, 8, 6), clay(0x5aa045), 0.04, 0.48, 0, yu, false); lf.scale.set(1.4, 0.5, 0.8);
      cyl(0.13, 0.1, 0.26, M.pho(0x2a3a4a), -1.0, FY + 1.74, -4.15, g, 14); } });

  /* ------------------------------------------------------------ weather particles ------------------------------------------------------------ */
  const BX = 70, BY = 26, BZ = 70;
  const mkPts = (n, tex, size, colors, seed) => { const r = rng(seed); const p = new Float32Array(n * 3), c = new Float32Array(n * 3), base = [];
    for (let i = 0; i < n; i++) { base.push([r() * BX, r() * BY, r() * BZ, r() * 6.28, 0.6 + r() * 0.8]); const cc = C(colors[Math.floor(r() * colors.length)]); c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size, vertexColors: true, transparent: true, alphaTest: 0.25, depthWrite: false, opacity: 1 })); m.frustumCulled = false; scene.add(m); return { m, base, n }; };
  const leaves = mkPts(900, leafTex, 0.34, ['#d9792b', '#b8432a', '#e0a83a', '#c45a26', '#9a5a2a'], 101);
  const petals = mkPts(900, petalTex, 0.26, ['#f6c9d4', '#f9e3e8', '#ffffff', '#efb0c0'], 202);
  const rain = (() => { const n = 1400, r = rng(303); const p = new Float32Array(n * 6), base = []; for (let i = 0; i < n; i++) base.push([r() * BX, r() * BY, r() * BZ, 0, 0.8 + r() * 0.4]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xbcd2e6, transparent: true, opacity: 0.5, depthWrite: false })); m.frustumCulled = false; scene.add(m); return { m, base, n }; })();
  const wrap = (v, lo, span) => lo + ((((v - lo) % span) + span) % span);
  function setParticles(W, cam, wLeaves, wPetals, wRain) {
    const cx = cam.x - BX / 2, cy = cam.y - BY * 0.45, cz = cam.z - BZ / 2;
    const upd = (P, vy, sway, drift) => { const a = P.m.geometry.attributes.position.array;
      for (let i = 0; i < P.n; i++) { const [bx, by, bz, ph, sp] = P.base[i];
        const x = bx + Math.sin(W * 0.9 * sp + ph) * sway + W * drift, y = by - W * vy * sp, z = bz + Math.cos(W * 0.7 * sp + ph) * sway;
        a[i * 3] = wrap(x, cx, BX); a[i * 3 + 1] = wrap(y, cy, BY); a[i * 3 + 2] = wrap(z, cz, BZ);
        const dx = a[i * 3] - cam.x, dy = a[i * 3 + 1] - cam.y, dz = a[i * 3 + 2] - cam.z; if (dx * dx + dy * dy + dz * dz < 36) a[i * 3 + 1] += BY * 0.5; }
      P.m.geometry.attributes.position.needsUpdate = true; };
    leaves.m.visible = wLeaves > 0.01; petals.m.visible = wPetals > 0.01; rain.m.visible = wRain > 0.01;
    if (leaves.m.visible) { upd(leaves, 1.1, 1.2, 0.35); leaves.m.material.opacity = wLeaves; }
    if (petals.m.visible) { upd(petals, 0.55, 0.9, 0.25); petals.m.material.opacity = wPetals; }
    if (rain.m.visible) { const a = rain.m.geometry.attributes.position.array;
      for (let i = 0; i < rain.n; i++) { const [bx, by, bz, , sp] = rain.base[i]; const x = wrap(bx + W * 1.2, cx, BX), y = wrap(by - W * 14 * sp, cy, BY), z = wrap(bz, cz, BZ);
        a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + 0.05; a[i * 6 + 4] = y + 0.9; a[i * 6 + 5] = z; }
      rain.m.geometry.attributes.position.needsUpdate = true; rain.m.material.opacity = 0.45 * wRain; }
  }

  /* ------------------------------------------------------------ per frame ------------------------------------------------------------ */
  const SKY = {
    night: { top: '#081230', hor: '#2c4068', bot: '#0a0c14', fog: '#1a2844', fogD: 0.0021, hemiS: '#7a96cc', hemiG: '#2c2a24', hemiI: 1.25, sunC: '#c8d6ff', sunI: 1.3, exp: 1.35, stars: 1, moon: 1, sunAmt: 0 },
    golden: { top: '#3a6aa8', hor: '#f0b47a', bot: '#4a3a2a', fog: '#d9a87a', fogD: 0.0024, hemiS: '#b8c8e0', hemiG: '#4a3624', hemiI: 0.75, sunC: '#ffc480', sunI: 2.5, exp: 1.0, stars: 0, moon: 0, sunAmt: 1 },
    dusk: { top: '#1d2a52', hor: '#d0785a', bot: '#2a2020', fog: '#6a5060', fogD: 0.0026, hemiS: '#6a78a8', hemiG: '#2a1e1a', hemiI: 0.75, sunC: '#ff9a6a', sunI: 0.9, exp: 1.1, stars: 0.3, moon: 0.4, sunAmt: 0.8 },
    blue: { top: '#0e1838', hor: '#5a5a8a', bot: '#141420', fog: '#2e3456', fogD: 0.0024, hemiS: '#6a7ab0', hemiG: '#221c1a', hemiI: 0.95, sunC: '#a8a8e0', sunI: 0.45, exp: 1.25, stars: 0.6, moon: 0.7, sunAmt: 0.25 },
    void: { top: '#000000', hor: '#000000', bot: '#000000', fog: '#000000', fogD: 0.05, hemiS: '#000000', hemiG: '#000000', hemiI: 0.0, sunC: '#000000', sunI: 0, exp: 1.0, stars: 0, moon: 0, sunAmt: 0 },
  };
  const mixSky = (a, b, k) => { const o = {}; for (const key in a) { const va = a[key], vb = b[key]; o[key] = typeof va === 'string' ? C(va).lerp(C(vb), k) : lerp(va, vb, k); } return o; };
  const toCol = v => (v instanceof THREE.Color ? v : C(v));
  const _c = new THREE.Color();

  function render(st) {
    if (st.blackout) { renderer.setClearColor(0x000000, 1); renderer.clear(); return; }
    const sk = mixSky(SKY[st.sky.a], SKY[st.sky.b], st.sky.k);
    skyU.top.value.copy(toCol(sk.top)); skyU.hor.value.copy(toCol(sk.hor)); skyU.bot.value.copy(toCol(sk.bot));
    skyU.sunAmt.value = sk.sunAmt; skyU.moonAmt.value = sk.moon; skyU.sunCol.value.copy(toCol(sk.sunC));
    scene.fog.color.copy(toCol(sk.fog)); scene.fog.density = sk.fogD * (st.fogMul ?? 1);
    hemi.color.copy(toCol(sk.hemiS)); hemi.groundColor.copy(toCol(sk.hemiG)); hemi.intensity = sk.hemiI * (st.hemiMul ?? 1);
    sun.color.copy(toCol(sk.sunC)); sun.intensity = sk.sunI * (st.sunMul ?? 1);
    stars.material.opacity = sk.stars;
    renderer.toneMappingExposure = sk.exp * (st.expMul ?? 1);
    const sd = st.sunDir.clone().normalize(); skyU.sunDir.value.copy(sd);
    const f = st.focus; sun.position.copy(f).addScaledVector(sd, 120); sun.target.position.copy(f); sun.target.updateMatrixWorld();
    camera.position.copy(st.cam.pos); camera.up.set(0, 1, 0); camera.lookAt(st.cam.tgt);
    camera.fov = st.cam.fov; camera.updateProjectionMatrix();
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    setParticles(st.W, camera.position, st.wLeaves, 0, 0);
    // cabins: only the one in focus is drawn when we are inside
    for (const k in cabins) { const c = cabins[k]; const ins = (st.interior || {})[k] ?? 0;
      c.g.visible = st.showCabin ? st.showCabin(k) : true;
      for (const b of c.backdrop) b.visible = c.g.visible && ((st.backdrop || {})[k] ?? 0) > 0;
      c.shaft.opacity = (st.shaftK?.[k] ?? 0) * ins; c.dust.update(st.W, 0.8 * (st.shaftK?.[k] ?? 0) * ins * 3);
      c.lampGlow.material.opacity = st.lampGlow?.[k] ?? 0;
      for (const s of c.screens) s.glow.material.opacity = 0.16 * (st.screenGlow?.[k] ?? 0); }
    { const fc = cabins[st.focusKey];
      if (fc) { warmA.position.copy(fc.lampPos); warmA.color.set(0xffb066); warmA.intensity = st.lampI ?? 0; const s0 = fc.screens[0]; warmB.position.copy(s0.center).add(new V3(0, -0.2, 0)).addScaledVector(fc.g.localToWorld(new V3(0, 0, 1)).sub(fc.g.position).normalize(), 1.2); warmB.color.set(fc.screenCol); warmB.intensity = st.screenI ?? 0; }
      else if (st.focusKey === 'end') { warmA.position.copy(board.light); warmA.color.set(0xffc888); warmA.intensity = st.lampI ?? 0; warmB.intensity = 0; }
      else { warmA.intensity = warmB.intensity = 0; } }
    board.glow.material.opacity = 0.45 * (st.boardLamp ?? 1); board.lampGlow.material.opacity = 0.8 * (st.boardLamp ?? 1);
    // lamps along the track
    { const g = lampPts.geometry.attributes.glow; for (let i = 0; i < lamps.length; i++) { const v = st.lampOn(lamps[i].s, lamps[i].day); g.array[i] = v; pools.setColorAt(i, _c.set(0xffb066).multiplyScalar(0.6 * v)); }
      g.needsUpdate = true; pools.instanceColor.needsUpdate = true; }
    // gates & labels
    { const mk = st.gateK ?? 0; const tanHalf = Math.tan(camera.fov * Math.PI / 360);
      for (const gt of gates) { gt.glow.material.opacity = 0.5 * (st.gateGlow ?? 0); const dist = camera.position.distanceTo(gt.lab.position);
        const wpp = 2 * dist * tanHalf / 1080; const h = Math.max(6, 70 * wpp); gt.lab.scale.set(h * 2, h, 1);
        gt.lab.material.opacity = mk * sstep(45, 90, dist); gt.lab.visible = gt.lab.material.opacity > 0.01; } }
    for (const k in beacons) { const b = beacons[k]; const v = st.beacon[k] ?? 0; b.m.material.opacity = 0.75 * v; b.s.material.opacity = 0.9 * v; b.m.visible = v > 0.01; b.s.visible = v > 0.01; b.pool.material.opacity = 0.42 * (st.poolK ?? 0) * v; b.pool.visible = (st.poolK ?? 0) * v > 0.01; }
    for (const k in flashes) { const v = (st.flash || {})[k] ?? 0; flashes[k].material.opacity = 0.5 * v; flashes[k].visible = v > 0.01; ST[k].edgeMat.color.set(0xd9c25a).multiplyScalar(1 + 2.5 * v); }
    { const pl = st.pulses || []; bandU.base.value = st.bandK ?? 0; let any = (st.bandK ?? 0) > 0.003;
      for (let i = 0; i < 3; i++) { const p = pl[i]; const v = bandU.pul.value[i]; const o = orbs[i];
        if (p && p.amp > 0.001) { v.set(uOfS(p.s), p.tail / (TH1 - TH0), p.amp, p.dir); any = true; trackPos(p.s, o.g.position); o.g.position.y = 1.5; const near = sstep(4, 22, camera.position.distanceTo(o.g.position)); // close to the camera the 20-unit halo filled the bottom of the frame
          o.core.material.opacity = Math.min(1, p.amp) * (0.45 + 0.55 * near); o.halo.material.opacity = 0.5 * Math.min(1, p.amp) * near; o.halo.scale.setScalar(20 * (0.4 + 0.6 * near)); o.g.visible = true; }
        else { v.set(0, 1, 0, 1); o.g.visible = false; } }
      band.visible = thread.visible = any; }
    // the shadow map depends only on the sun and the focus point: re-render it only when those change (still a pure function of t)
    const key = [sd.x.toFixed(4), sd.y.toFixed(4), sd.z.toFixed(4), f.x.toFixed(2), f.z.toFixed(2), sk.sunI.toFixed(3), st.focusKey].join('|');
    if (key !== shadowKey) { renderer.shadowMap.needsUpdate = true; shadowKey = key; }
    renderer.render(scene, camera);
  }

  let curScale = 1; const setScale = (sc) => { if (sc === curScale) return; curScale = sc; renderer.setSize(Math.round(W * sc), Math.round(H * sc), false); };
  return { renderer, scene, camera, render, setScale, ST, cabins, signs, board, beacons, FY, trackPos, trackTan, trackNormal, sOfDay, dayOfS };
}
