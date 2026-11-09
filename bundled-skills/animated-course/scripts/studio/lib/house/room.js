// Engram studio — the room (three.js r170). One seamless studio, two lights: light (k = 1) and dark (k = 0).
//
//   import { makeRoom, NOREFL } from '/lib/house/room.js';
//   const room = makeRoom({ renderer, scene, camera, mode: 'light' });   // adds cyc, floor reflection, lights, columns
//   const cast = await makeCast('glossy-bot', { renderer, variant: 'classic' });
//   room.dress(cast);                         // the cast gets this room's reflections and cool contact shadows
//   window.renderAt = t => { …; room.lights(k(t)); room.focus(x, z); room.render(); };   // reflection pass, then the frame
//
// Rules this file keeps (experiment 18): no shadow maps, no transmission, no clearcoat on big areas; the floor
// reflection pass is called by room.render() BEFORE the main render (never from onBeforeRender: its clip plane
// leaked into transparent objects of the main pass); everything is a pure function of the arguments.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { LIGHT, DARK, quantK } from './tokens.js';

/** Layer for things the camera sees but the floor mirror does not (thin lines, glows, shadows, the room itself). */
export const NOREFL = 1;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const col = hex => new THREE.Color(hex);   // sRGB hex → linear working colour

// ============================================================================================ environment
// One analytic equirect HDR map for reflections (white shells, visors, glass). The same function serves the 3D room
// and flat pages (lib/house/flat.js sets it as scene.environment of makeStage), so the cast is lit the same way.
// Light: white soft box upper-left-front, a right strip, a back-top strip, a pale cyan patch, a dark flag behind the
// camera (without it the visor reflects grey, S1). Dark: the same key soft box, cyan strip left-back, magenta strip
// right-back, a blue horizon glow. Intermediate k mixes them (lights(k) uses 9 cached levels).
const ENV_W = 512, ENV_H = 256;
const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const ENV_SKY = {
  light: [[90, '#ffffff'], [25, '#eef2f6'], [3.6, '#b9c3ce'], [-10.8, '#8c97a4'], [-90, '#6f7a88']].map(([a, h]) => [a, lin(h)]),
  dark: [[90, '#3a4a6c'], [14.4, '#1a2540'], [-3.6, '#0c1426'], [-90, '#03050a']].map(([a, h]) => [a, lin(h)]),
};
// [position, w, h, colour, intensity in light, intensity in dark, opaque]
const ENV_BOXES = [
  [[-5.5, 5.5, 6], 6.5, 4.0, '#ffffff', 2.2, 2.2],            // key soft box (same direction as the key light)
  [[8, 2.5, 2], 1.2, 6.0, '#ffffff', 1.6, 0.25],               // right strip
  [[0, 7.5, -6], 7.0, 1.0, '#ffffff', 1.4, 0.15],              // back-top strip
  [[0.5, 1.6, -8.5], 3.2, 1.6, '#bfefff', 1.1, 0.0],           // pale cyan patch (holo boards reflect in shells)
  [[-8, 1, -3], 1.0, 9.0, '#36E2FF', 0.0, 1.6],                // cyan strip (the light columns, left)
  [[8, 1, -3.4], 1.0, 9.0, '#FF4FD8', 0.0, 1.3],               // magenta strip (right)
  [[0, -0.6, -9], 14, 0.5, '#7fa8ff', 0.0, 0.5],               // horizon glow
  [[0, 0.6, 9.4], 16, 5.5, '#3a4452', 0.32, -1, true],         // dark flag behind the camera (light only; replaces)
];
const _envCache = new Map();
function skyAt(stops, deg) {
  for (let i = 0; i < stops.length - 1; i++) { const [a0, c0] = stops[i], [a1, c1] = stops[i + 1]; if (deg <= a0 && deg >= a1) { const k = (deg - a0) / (a1 - a0); return [0, 1, 2].map(j => lerp(c0[j], c1[j], k)); } }
  return stops[stops.length - 1][1];
}
/** Equirect HDR environment for lights level k (cached on 9 levels). DataTexture, HalfFloat, mapping = equirect. */
export function envTexture(k) {
  const q = quantK(k, 8); if (_envCache.has(q)) return _envCache.get(q);
  const up = new THREE.Vector3(0, 1, 0);
  const boxes = ENV_BOXES.map(([p, w, h, c, iL, iD, opaque]) => {
    const pos = new THREE.Vector3(...p), n = pos.clone().normalize(), dist = pos.length();
    const r = new THREE.Vector3().crossVectors(up, n).normalize(), u = new THREE.Vector3().crossVectors(n, r);
    const inten = opaque ? q : lerp(iD, iL, q);
    return { n, dist, r, u, w: w / 2, h: h / 2, e: Math.min(w, h) * 0.18, c: lin(c), inten, opaque };
  }).filter(b => b.inten > 0.001);
  const data = new Uint16Array(ENV_W * ENV_H * 4), d = new THREE.Vector3(), p = new THREE.Vector3();
  for (let j = 0; j < ENV_H; j++) {
    const th = ((j + 0.5) / ENV_H - 0.5) * Math.PI, deg = th * 180 / Math.PI, cy = Math.cos(th), sy = Math.sin(th);
    const sL = skyAt(ENV_SKY.light, deg), sD = skyAt(ENV_SKY.dark, deg);
    for (let i = 0; i < ENV_W; i++) {
      const ph = ((i + 0.5) / ENV_W - 0.5) * 2 * Math.PI; d.set(cy * Math.cos(ph), sy, cy * Math.sin(ph));
      let c = [lerp(sD[0], sL[0], q), lerp(sD[1], sL[1], q), lerp(sD[2], sL[2], q)];
      for (const b of boxes) {
        const dn = d.dot(b.n); if (dn <= 0.05) continue;
        p.copy(d).multiplyScalar(b.dist / dn).addScaledVector(b.n, -b.dist);
        const a = Math.abs(p.dot(b.r)), bb = Math.abs(p.dot(b.u));
        const f = (1 - smooth(b.w - b.e, b.w + b.e, a)) * (1 - smooth(b.h - b.e, b.h + b.e, bb)); if (f <= 0) continue;
        if (b.opaque) { const m = f * b.inten; c = c.map((v, k2) => lerp(v, b.c[k2] * 0.32, m)); }
        else c = c.map((v, k2) => v + b.c[k2] * b.inten * f);
      }
      const o = (j * ENV_W + i) * 4;
      data[o] = THREE.DataUtils.toHalfFloat(c[0]); data[o + 1] = THREE.DataUtils.toHalfFloat(c[1]); data[o + 2] = THREE.DataUtils.toHalfFloat(c[2]); data[o + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }
  const tex = new THREE.DataTexture(data, ENV_W, ENV_H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  _envCache.set(q, tex); return tex;
}

// ============================================================================================ lights (pure of k)
const RIG = {
  light: { hemiSky: '#ffffff', hemiGround: '#d3dbe4', hemi: 1.2, key: '#fff6ec', keyI: 2.0, fill: '#e2edff', fillI: 0.7, rimI: 0.85, cyanI: 0, magI: 0, exposure: 1.06, envI: 1.0 },
  dark: { hemiSky: '#a9bde6', hemiGround: '#0a0f1c', hemi: 0.75, key: '#f3f7ff', keyI: 2.1, fill: '#9fb8ff', fillI: 0.35, rimI: 0.3, cyanI: 2.6, magI: 2.2, exposure: 1.0, envI: 1.0 },
};
/** Light rig values at level k (also used by flat.js for makeStage's lights). */
export function rigAt(k) {
  const L = RIG.light, D = RIG.dark, a = (1 - clamp(k)) ** 1.15;   // coloured rims come up as the white goes down
  return {
    hemiSky: col(D.hemiSky).lerp(col(L.hemiSky), k), hemiGround: col(D.hemiGround).lerp(col(L.hemiGround), k), hemi: lerp(D.hemi, L.hemi, k),
    key: col(D.key).lerp(col(L.key), k), keyI: lerp(D.keyI, L.keyI, k), fill: col(D.fill).lerp(col(L.fill), k), fillI: lerp(D.fillI, L.fillI, k),
    rimI: lerp(D.rimI, L.rimI, k), cyanI: D.cyanI * a, magI: D.magI * a, exposure: lerp(D.exposure, L.exposure, k), envI: lerp(D.envI, L.envI, k),
  };
}
/** Same key direction in both modes (upper-left-front); only fill, rims and the environment change. */
export const KEY_DIR = [-6, 10, 8.5];

// ============================================================================================ textures
let _shadowTex = null, _glowTex = null, _haloTex = null;
const radial = (stops, size = 128) => {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, s]) => g.addColorStop(o, s));
  x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/** Soft contact shadow alpha (white, tint with material.color). */
export const shadowTex = () => _shadowTex || (_shadowTex = radial([[0, 'rgba(255,255,255,0.85)'], [0.42, 'rgba(255,255,255,0.42)'], [1, 'rgba(255,255,255,0)']]));
/** Floor ring glow (white ring, tint it): the "now" ring under a station. */
export const ringTex = () => _glowTex || (_glowTex = radial([[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,0)'], [0.70, 'rgba(255,255,255,0.6)'], [0.80, 'rgba(255,255,255,0.26)'], [1, 'rgba(255,255,255,0)']]));
/** Soft round halo (white centre, tint it). */
export const haloTex = () => _haloTex || (_haloTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]));

// ============================================================================================ the cyc (floor → curve → wall)
function cycGeo({ back = -17, R = 8, width = 180, front = 40, top = 60 }) {
  const prof = [];
  for (let z = front; z > back; z -= 2) prof.push([z, 0]);
  for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI / 2; prof.push([back - Math.sin(a) * R, R - Math.cos(a) * R]); }
  for (let y = R + 4; y <= top; y += 8) prof.push([back - R, y]);
  const hw = width / 2, xs = [-hw, -hw / 2, -hw / 6, -6, 0, 6, hw / 6, hw / 2, hw], pos = [], idx = [];
  prof.forEach(([z, y]) => xs.forEach(x => pos.push(x, y, z)));
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < xs.length - 1; j++) { const a = i * xs.length + j, b = a + 1, c = a + xs.length, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
const CYC_FRAG = `
  uniform vec3 lFloorNear, lFloorFar, lWallLow, lWallTop, lWallEdge, lGrid, dFloorNear, dFloorFar, dWallLow, dWallTop, dHorizon, dGrid, dPool;
  uniform float uK, uZ0, uGrid, uCurve; uniform vec2 uPool; uniform vec3 uGlow; uniform vec3 uCam; varying vec3 vW;
  void main(){
    float kWall = smoothstep(0.15, 1.0, uK), kFloor = smoothstep(0.0, 0.85, uK);
    float kk = mix(kFloor, kWall, smoothstep(0.0, 7.0, vW.y));          // lights go off top-down, come back bottom-up
    float fz = clamp((uZ0 - vW.z) / 24.0, 0.0, 1.0);
    float wallMix = smoothstep(0.2, uCurve * 0.62, vW.y);
    // light studio (S1): near → far floor, low → top wall, a clean white cyc
    vec3 Lfl = mix(lFloorNear, lFloorFar, smoothstep(0.0, 1.0, fz));
    // both studios have the same soft pool of light on the wall behind the subject (uGlow), falling off to the edges
    float gx = (vW.x - uGlow.x) / (13.0 * uGlow.z), gy = (vW.y - uGlow.y) / (7.0 * uGlow.z);
    float g = exp(-(gx * gx + gy * gy));
    vec3 Lwl = mix(lWallLow, lWallTop, smoothstep(0.0, 1.0, clamp(vW.y / 16.0, 0.0, 1.0)));
    Lwl = mix(lWallEdge, Lwl, 0.35 + 0.65 * g);
    // dark studio (S2, lifted): the glow is navy, a blue horizon where the floor curves up
    vec3 Dwl = mix(dWallTop, dWallLow, g);
    float hz = exp(-pow((vW.y - uCurve * 0.35) / (uCurve * 0.32), 2.0)) * exp(-gx * gx * 0.45);
    Dwl = mix(Dwl, dHorizon, hz * 0.62);
    vec3 Dfl = mix(dFloorNear, dFloorFar, smoothstep(0.0, 1.0, fz));
    // in between: a blue-hour room (the dark palette lifted ×3), never a flat grey
    vec3 fl = kk < 0.5 ? mix(Dfl, Dfl * 3.0, kk * 2.0) : mix(Dfl * 3.0, Lfl, kk * 2.0 - 1.0);
    vec3 wl = kk < 0.5 ? mix(Dwl, Dwl * 3.0, kk * 2.0) : mix(Dwl * 3.0, Lwl, kk * 2.0 - 1.0);
    vec3 c = mix(fl, wl, wallMix);
    // the pool of light under the subject (follows room.focus)
    float d = length((vW.xz - uPool) * vec2(0.075, 0.11));
    float pool = (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - wallMix * 0.75);
    c += mix(dPool, vec3(0.030, 0.032, 0.034), kk) * pool;
    // fine floor grid, anti-aliased, fades with distance (and is faint in the light studio)
    vec2 gq = vW.xz / 0.8; vec2 gw = fwidth(gq); vec2 gl = abs(fract(gq - 0.5) - 0.5) / max(gw, 1e-4);
    float line = (1.0 - min(min(gl.x, gl.y), 1.0)) * (1.0 - smoothstep(0.08, 0.32, max(gw.x, gw.y)));
    float gfade = exp(-pow(length(vW.xz - uPool) / 9.0, 2.0)) * (1.0 - wallMix);
    c = mix(c, mix(dGrid, lGrid, kk), line * gfade * uGrid * mix(0.16, 0.10, kk));
    c *= 1.0 - mix(0.18, 0.07, kk) * smoothstep(12.0, 34.0, abs(vW.x));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

// ============================================================================================ floor reflection (overlay on the cyc)
const REFL_SHADER = {
  name: 'HouseFloor',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStr: { value: 0.3 }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 288) }, uCam: { value: new THREE.Vector3() } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uStr; uniform vec2 uTexel; uniform vec3 uCam; varying vec4 vUv; varying vec3 vW;
    void main(){
      vec2 uv = vUv.xy / vUv.w; vec2 o = uTexel * vec2(1.35, 1.7);
      vec4 s = vec4(0.0);   // 3x3 tent on a low-res mirror: soft, no tap pattern, thin lines do not flicker
      for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) { float w = (i == 0 ? 2.0 : 1.0) * (j == 0 ? 2.0 : 1.0); s += texture2D(tDiffuse, uv + vec2(float(i), float(j)) * o) * w; }
      s /= 16.0;
      vec3 V = normalize(uCam - vW); float fres = 0.28 + 0.72 * pow(1.0 - clamp(V.y, 0.0, 1.0), 2.4);   // weak when looking down: no blob at high angles
      float fade = 1.0 - smoothstep(16.0, 38.0, length(vW.xz - uCam.xz));
      vec3 c = s.a > 0.002 ? s.rgb / s.a : vec3(1.0);
      gl_FragColor = vec4(c, clamp(s.a, 0.0, 1.0) * uStr * fres * fade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// ============================================================================================ light columns
/** A light column: white shell post with a strip; in the dark studio the strip glows (cyan left, magenta right). */
function makeColumn(color, h, shellMat) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, h, 20), shellMat); post.position.y = h / 2; g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 28), shellMat); base.position.y = 0.03; g.add(base);
  const stripM = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, h * 0.86, 0.035), stripM); strip.position.set(0, h * 0.5, 0.055); g.add(strip);
  const glowM = new THREE.MeshBasicMaterial({ map: haloTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, h * 1.1), glowM); glow.position.set(0, h * 0.5, 0.08); g.add(glow);
  const accent = new THREE.Color(color), pale = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.72);
  return { g, set(k) { const a = (1 - k) ** 1.3; stripM.color.copy(pale).lerp(accent.clone().multiplyScalar(1.7), 1 - k); glowM.opacity = 0.34 * a; glow.visible = a > 0.01; } };
}

// ============================================================================================ makeRoom
/**
 * @param {object} o
 * @param {THREE.WebGLRenderer} o.renderer  @param {THREE.Scene} o.scene  @param {THREE.Camera} o.camera
 * @param {'light'|'dark'} [o.mode]  starting lights (room.lights(k) changes them; k = 1 light … 0 dark)
 * @param {object} [o.cyc]  {back: z of the wall foot (-17), R: curve radius (8), width (180)}
 * @param {Array|false} [o.columns]  [[x, z, '#36E2FF'|'#FF4FD8', height], …] or false; default four around the origin
 * @param {boolean} [o.reflect]  floor reflection (true)
 * @param {[number, number]} [o.reflRes]  mirror resolution (512×288)
 */
export function makeRoom({ renderer, scene, camera, mode = 'light', cyc = {}, columns, reflect = true, reflRes = [512, 288], grid = 1 } = {}) {
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);   // the mirror pass needs alpha 0 where nothing is (else the floor turns grey)
  camera.layers.enable(NOREFL);
  const markNoRefl = o => { o.traverse(c => c.layers.set(NOREFL)); return o; };

  // lights (no shadow maps)
  const hemi = new THREE.HemisphereLight('#ffffff', '#d3dbe4', 1.2); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff6ec', 2.0); key.position.set(...KEY_DIR); scene.add(key);
  const fill = new THREE.DirectionalLight('#e2edff', 0.7); fill.position.set(8, 3, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 0.85); rim.position.set(3, 6, -8); scene.add(rim);
  const rimC = new THREE.DirectionalLight('#36E2FF', 0); rimC.position.set(-7, 4, -6); scene.add(rimC);
  const rimM = new THREE.DirectionalLight('#FF4FD8', 0); rimM.position.set(7, 4, -6); scene.add(rimM);

  // the cyc
  const C = { back: -17, R: 8, width: 180, ...cyc };
  const U = {
    lFloorNear: { value: col(LIGHT.floorNear) }, lFloorFar: { value: col(LIGHT.floorFar) }, lWallLow: { value: col(LIGHT.wallLow) }, lWallTop: { value: col(LIGHT.wallTop) }, lWallEdge: { value: col(LIGHT.wallEdge) }, lGrid: { value: col(LIGHT.grid) },
    dFloorNear: { value: col(DARK.floorNear) }, dFloorFar: { value: col(DARK.floorFar) }, dWallLow: { value: col(DARK.wallLow) }, dWallTop: { value: col(DARK.wallTop) }, dHorizon: { value: col(DARK.horizon) }, dGrid: { value: col(DARK.grid) },
    dPool: { value: col(DARK.pool).sub(col(DARK.floorNear)) },
    uK: { value: 1 }, uZ0: { value: C.back + 23 }, uGrid: { value: grid }, uCurve: { value: C.R }, uPool: { value: new THREE.Vector2(0, -6) }, uGlow: { value: new THREE.Vector3(0, 2.2, 1) }, uCam: { value: new THREE.Vector3() },
  };
  const cycMesh = new THREE.Mesh(cycGeo(C), new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: CYC_FRAG }));
  cycMesh.name = 'house-cyc'; markNoRefl(cycMesh); scene.add(cycMesh);

  // floor reflection (transparent overlay; only things on layer 0 are mirrored; renders only where something is)
  let refl = null, reflUpdate = null; const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.4);
  if (reflect) {
    refl = new Reflector(new THREE.PlaneGeometry(160, 110), { shader: REFL_SHADER, textureWidth: reflRes[0], textureHeight: reflRes[1], multisample: 0, clipBias: 0.003 });
    refl.rotation.x = -Math.PI / 2; refl.position.set(0, 0.002, C.back + 30);
    refl.material.transparent = true; refl.material.depthWrite = false; refl.renderOrder = 1;
    refl.material.uniforms.uTexel.value.set(1 / reflRes[0], 1 / reflRes[1]);
    reflUpdate = refl.onBeforeRender; refl.onBeforeRender = () => {};   // called by renderReflection(), not during the main pass
    markNoRefl(refl); scene.add(refl);
  }

  // shells used by the room (columns); props use holo.js shell materials with the same values
  const shell = new THREE.MeshStandardMaterial({ color: LIGHT.shell, roughness: 0.22, metalness: 0 });
  const cols = (columns === undefined ? [[-6.4, -3.6, '#36E2FF'], [-8.2, -1.0, '#36E2FF'], [6.4, -3.6, '#FF4FD8'], [8.2, -1.0, '#FF4FD8']] : columns || [])
    .map(([x, z, c, h = 4.4]) => { const m = makeColumn(c, h, shell); m.g.position.set(x, 0, z); scene.add(m.g); m.glowMesh = m.g.children[3]; m.glowMesh.layers.set(NOREFL); return m; });

  // contact shadows (cool, never the clay room's warm brown)
  const shadows = [];
  const shadowMat = (op) => { const m = new THREE.MeshBasicMaterial({ map: shadowTex(), color: LIGHT.shadow, transparent: true, opacity: op, depthWrite: false, toneMapped: false }); m.userData.houseOp = op; shadows.push(m); return m; };
  /** A soft cool contact shadow w × d on the floor (add it under an object; set .position). Opacity is the light-studio value. */
  function shadow(w, d, op = 0.45) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), shadowMat(op)); s.rotation.x = -Math.PI / 2; s.position.y = 0.004; s.renderOrder = 2; markNoRefl(s); return s; }

  /** Re-light a makeCast() cast for this room: this room's reflections (scene.environment) and cool contact shadows. */
  const dressed = [];
  function dress(cast, { shadowScale = 1.15, shadowOp = 0.5 } = {}) {
    for (const k of ['teacher', 'student', 'embodiment']) {
      const c = cast && cast[k]; if (!c || !c.root || dressed.includes(c)) continue; dressed.push(c);
      c.root.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) { m.envMap = null; m.needsUpdate = true; } });
      for (const ch of c.root.children) if (ch.isMesh && ch.geometry && ch.geometry.type === 'PlaneGeometry' && ch.material && ch.material.map) {   // makeCast's contact shadow
        ch.material = shadowMat(shadowOp); ch.scale.multiplyScalar(shadowScale); ch.renderOrder = 2; markNoRefl(ch);
      }
    }
    return cast;
  }

  const subs = [];
  const room = {
    mode, k: mode === 'dark' ? 0 : 1, scene, camera, renderer, cyc: cycMesh, reflector: refl, columns: cols, lightsRig: { hemi, key, fill, rim, rimC, rimM },
    NOREFL, noReflect: markNoRefl, shadow, dress, shellMat: shell, uniforms: U,
    /** Lights level: 1 = light studio, 0 = dark studio; anything between is a good-looking dimmed room. Pure of k. */
    lights(k) {
      k = clamp(k); room.k = k;
      const R = rigAt(k);
      hemi.color.copy(R.hemiSky); hemi.groundColor.copy(R.hemiGround); hemi.intensity = R.hemi;
      key.color.copy(R.key); key.intensity = R.keyI; fill.color.copy(R.fill); fill.intensity = R.fillI;
      rim.intensity = R.rimI; rimC.intensity = R.cyanI; rimM.intensity = R.magI;
      renderer.toneMappingExposure = R.exposure;
      scene.environment = envTexture(k); scene.environmentIntensity = R.envI;
      U.uK.value = k;
      if (refl) { refl.material.uniforms.uStr.value = lerp(0.46, 0.30, k); clipPlane.constant = lerp(30, 0.42, smooth(0.0, 0.5, k)); }
      const sc = col(DARK.shadow).lerp(col(LIGHT.shadow), k), sm = lerp(1.45, 1, k);
      for (const m of shadows) { m.color.copy(sc); m.opacity = Math.min(1, m.userData.houseOp * sm); }
      for (const c of cols) c.set(k);
      for (const f of subs) f(k);
      return room;
    },
    /** Register fn(k) to run on every lights(k) (holo.js materials, your own props). Runs once now. */
    onLights(fn) { subs.push(fn); fn(room.k); return room; },
    /** Centre of the floor's pool of light (x, z); usually the camera target. */
    focus(x, z) { U.uPool.value.set(x, z); return room; },
    /** Centre and size of the dark studio's wall glow (x, y, scale). */
    glow(x, y, s = 1) { U.uGlow.value.set(x, y, s); return room; },
    /** The mirror pass (call before the main render; room.render() does both). */
    renderReflection(cam = camera) {
      if (!refl) return;
      refl.material.uniforms.uCam.value.setFromMatrixPosition(cam.matrixWorld);
      const keep = renderer.clippingPlanes; renderer.clippingPlanes = clipPlane.constant < 25 ? [clipPlane] : [];
      scene.updateMatrixWorld(); reflUpdate.call(refl, renderer, scene, cam);
      renderer.clippingPlanes = keep;
    },
    render(cam = camera) { cam.updateMatrixWorld(); U.uCam.value.setFromMatrixPosition(cam.matrixWorld); room.renderReflection(cam); renderer.render(scene, cam); },
  };
  room.lights(room.k);
  return room;
}
