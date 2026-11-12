// Engram studio — 3D pieces (three.js r170). Same shapes in both studios; only the surface changes with the lights.
//
//   import { makeHolo } from '/lib/house/holo.js';
//   const H = makeHolo(room);                                  // room from makeRoom()
//   const p = H.panel({ w: 2, h: 1.1, res: 1024 });           // light: holo (pale blue, cyan rim) / dark: frosted glass
//   p.draw('step-' + n, (x, W, Hh, L) => { x.fillStyle = L.ink; … });   // redraws only when the key or the lights change
//   const ped = H.pedestal(); scene.add(ped.g); ped.set('now', 1);      // 'now' | 'done' | 'later'
//
// Everything here: no shadow maps, no transmission, no clearcoat on large areas, thin lines and glows kept out of the
// floor mirror (layer NOREFL). Canvas textures redraw only on the frame their key changes (pure function of t).
import * as THREE from 'three';
import { NOREFL, ringTex, haloTex } from './room.js';
import { LIGHT, DARK, lerpLook, quantK, mix } from './tokens.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const noRefl = o => { o.traverse(c => c.layers.set(NOREFL)); return o; };

/**
 * Draw a house panel frame on a 2D canvas (used by 3D panels; DOM panels use house.css). Same shape in both studios:
 * rounded fill, 2-px-equivalent rim with a glow, an inner hairline, four corner brackets, four corner dots.
 * L = tokens look (lerpLook(k)). o: {pad, r, lw, bracket, dots, blur, edge (override rim colour), fillTop, fillBot}
 */
export function drawFrame(x, w, h, L, o = {}) {
  const pad = o.pad ?? 26, r = o.r ?? 40, lw = o.lw ?? 4, s = o.scale ?? 1;
  const rr = (X, Y, W, H, R) => { x.beginPath(); x.roundRect(X, Y, W, H, R); };
  x.save();
  // fill: top → bottom, plus one soft diagonal sheen (reads as glass / holo), plus two faint corner tints (dark only)
  rr(pad, pad, w - pad * 2, h - pad * 2, r);
  const g = x.createLinearGradient(0, pad, 0, h - pad); g.addColorStop(0, o.fillTop ?? L.panelTop); g.addColorStop(1, o.fillBot ?? L.panelBot);
  x.fillStyle = g; x.fill();
  x.save(); rr(pad, pad, w - pad * 2, h - pad * 2, r); x.clip();
  const sh = x.createLinearGradient(pad, pad, pad + (w - 2 * pad) * 0.55, h - pad); sh.addColorStop(0.30, 'rgba(255,255,255,0)'); sh.addColorStop(0.42, L.sheen); sh.addColorStop(0.56, 'rgba(255,255,255,0)');
  x.globalAlpha = 0.6; x.fillStyle = sh; x.fillRect(0, 0, w, h); x.globalAlpha = 1;
  for (const [cx, cy, c] of [[pad, pad, L.tintA], [w - pad, h - pad, L.tintB]]) { const t = x.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.6); t.addColorStop(0, c); t.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = t; x.fillRect(0, 0, w, h); }
  x.restore();
  // rim with glow (top edge a touch brighter: edge light)
  rr(pad, pad, w - pad * 2, h - pad * 2, r);
  const eg = x.createLinearGradient(0, pad, 0, h - pad); eg.addColorStop(0, o.edge ?? L.edgeTop); eg.addColorStop(0.35, o.edge ?? L.edge); eg.addColorStop(1, o.edge ?? L.edge);
  x.shadowColor = o.glow ?? L.glow; x.shadowBlur = (o.blur ?? 22) * s; x.lineWidth = lw; x.strokeStyle = eg; x.stroke(); x.shadowBlur = 0;
  // inner hairline
  rr(pad + 12 * s, pad + 12 * s, w - pad * 2 - 24 * s, h - pad * 2 - 24 * s, Math.max(4, r - 10 * s)); x.lineWidth = 1.5 * s; x.strokeStyle = L.hair; x.stroke();
  // corner brackets
  const B = (o.bracket ?? 46) * s, b = pad - 10 * s; x.lineWidth = lw * 1.5; x.strokeStyle = o.edge ?? L.bracket; x.lineCap = 'round';
  for (const [cx, cy, sx, sy] of [[b, b, 1, 1], [w - b, b, -1, 1], [b, h - b, 1, -1], [w - b, h - b, -1, -1]]) {
    x.beginPath(); x.moveTo(cx, cy + sy * B); x.lineTo(cx, cy + sy * 12 * s); x.quadraticCurveTo(cx, cy, cx + sx * 12 * s, cy); x.lineTo(cx + sx * B, cy); x.stroke();
  }
  if (o.dots !== false) { x.fillStyle = o.edge ?? L.bracket; for (const [cx, cy] of [[pad + 34 * s, pad + 34 * s], [w - pad - 34 * s, pad + 34 * s], [pad + 34 * s, h - pad - 34 * s], [w - pad - 34 * s, h - pad - 34 * s]]) { x.beginPath(); x.arc(cx, cy, 4.5 * s, 0, 7); x.fill(); } }
  x.restore();
}

/** Fresnel material: alpha = a0 + a1·(1−|N·V|)^2.2 (holo shells, beams, glass bodies). Set .uniforms.uO for fading. */
export function fresnelMat(tint = '#5FD3FF', a0 = 0.04, a1 = 0.55, { additive = false, side = THREE.FrontSide, bright = 1 } = {}) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, clipping: true,
    uniforms: { uC: { value: new THREE.Color(tint) }, uA0: { value: a0 }, uA1: { value: a1 }, uO: { value: 1 }, uB: { value: bright } },
    vertexShader: `#include <clipping_planes_pars_vertex>
      varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <clipping_planes_vertex>
      }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform vec3 uC; uniform float uA0, uA1, uO, uB; varying vec3 vN; varying vec3 vV;
      void main(){
      #include <clipping_planes_fragment>
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uC * uB * (0.75 + 0.5 * f), (uA0 + uA1 * f) * uO);
      #include <colorspace_fragment>
      }` });
}

/**
 * The house 3D kit bound to a room. Returns factories; every piece follows room.lights(k).
 * @param {ReturnType<import('./room.js').makeRoom>} room
 */
export function makeHolo(room) {
  const { scene } = room;
  const look = () => lerpLook(room.k);
  const subs = []; const onLights = fn => { subs.push(fn); fn(room.k); };
  room.onLights(k => { for (const f of subs) f(k); });

  // ------------------------------------------------------------------ materials
  /** Glossy white shell (all solid props; same family as the robot's shell). No clearcoat (big areas). */
  const shell = (color = LIGHT.shell, { r = 0.2, env = 1.05 } = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0, envMapIntensity: env });
  const SHELL = shell();
  /** Black glossy visor ("a machine that thinks": Nico's relatives). Small areas only. */
  const visor = (color = '#0b111c') => new THREE.MeshStandardMaterial({ color, roughness: 0.07, metalness: 0.1, envMapIntensity: 1.35 });
  /** Unlit glowing colour (rings, strips); in the dark studio it is boosted ×glowK. */
  const glowMat = (c, op = 1, { additive = false } = {}) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }); return m; };

  // ------------------------------------------------------------------ canvas panel
  /**
   * A panel in 3D: a canvas texture on a plane. Light studio = holo (pale blue, cyan rim); dark = frosted glass.
   * @param {object} o {w, h (world units), res (canvas px width, default 1024), frame: true|false|{…drawFrame opts}, billboard}
   * draw(key, fn(x, W, H, L)) redraws only when key or the (quantised) lights change. L = tokens at the current lights.
   */
  function panel({ w = 2, h = 1.2, res = 1024, frame = true, order = 5 } = {}) {
    const cw = res, ch = Math.round(res * h / w);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d', { willReadFrequently: true });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    mesh.renderOrder = order; noRefl(mesh);
    let last = null, fkq = null; const fc = document.createElement('canvas'); fc.width = cw; fc.height = ch;
    const sc = cw / 1024;
    const P = {
      mesh, canvas: c, ctx: x, tex, W: cw, H: ch,
      draw(key, fn) {
        const kq = quantK(room.k, 12), full = key + '|' + kq; if (full === last) return P; last = full;
        const L = lerpLook(kq);
        if (frame && fkq !== kq) { const fx = fc.getContext('2d'); fx.clearRect(0, 0, cw, ch); drawFrame(fx, cw, ch, L, { pad: 18 * sc, r: 30 * sc, lw: 4 * sc, bracket: 34 * sc, blur: 18 * sc, scale: sc, ...(typeof frame === 'object' ? frame : {}) }); fkq = kq; }
        x.clearRect(0, 0, cw, ch); if (frame) x.drawImage(fc, 0, 0);
        if (fn) { x.save(); fn(x, cw, ch, L); x.restore(); }
        tex.needsUpdate = true; return P;
      },
      set opacity(v) { mesh.material.opacity = v; mesh.visible = v > 0.005; },
    };
    return P;
  }

  // ------------------------------------------------------------------ pedestal (station)
  /**
   * Station pedestal: white shell body on a foot, a glowing groove band, a black glossy top with a cyan emitter ring
   * (the projector), a floor ring when it is the station "now", and its contact shadow. Feet at y = 0.
   * set(state, k): state 'now' | 'done' | 'later', k = how far into that state (0–1). top = y of the top face.
   */
  function pedestal({ r = 0.8, h = 0.75 } = {}) {
    const g = new THREE.Group();
    const prof = [[0, 0], [r * 1.05, 0], [r * 1.07, 0.012], [r * 1.07, 0.05], [r * 1.03, 0.062], [r * 0.985, 0.07], [r * 0.98, h * 0.6], [r * 0.955, h * 0.6 + 0.01], [r * 0.955, h * 0.6 + 0.045], [r * 0.975, h * 0.6 + 0.055],
      [r * 0.975, h - 0.05], [r * 0.965, h - 0.02], [r * 0.94, h - 0.004], [r * 0.9, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), SHELL); g.add(body);
    const bandM = glowMat('#46D4FF', 1); const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.958, r * 0.958, 0.03, 96, 1, true), bandM); band.position.y = h * 0.6 + 0.028; g.add(band);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.76, r * 0.76, 0.012, 72), visor('#0c1220')); top.position.y = h + 0.004; g.add(top);
    const emM = glowMat('#46D4FF', 0.9); const em = new THREE.Mesh(new THREE.TorusGeometry(r * 0.76, 0.012, 6, 120), emM); em.rotation.x = Math.PI / 2; em.position.y = h + 0.011; g.add(noRefl(em));
    const inM = glowMat('#46D4FF', 0.35); const inner = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, 0.006, 6, 96), inM); inner.rotation.x = Math.PI / 2; inner.position.y = h + 0.011; g.add(noRefl(inner));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.16, 40), glowMat('#9BE9FF', 0.6)); lens.rotation.x = -Math.PI / 2; lens.position.y = h + 0.0115; g.add(noRefl(lens));
    const sh = room.shadow(r * 3.1, r * 3.1, 0.42); g.add(sh);
    const haloM = new THREE.MeshBasicMaterial({ map: ringTex(), color: '#46D4FF', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(r * 4.4, r * 4.4), haloM); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.006; halo.renderOrder = 2; g.add(noRefl(halo));
    let st = 'later', sk = 1;
    const apply = () => {
      const k = room.k, L = look(), boost = lerp(1.6, 1, k);
      const cy = new THREE.Color(L.cyan), gy = new THREE.Color(L.grey);
      const lvl = st === 'now' ? lerp(0.6, 1, sk) : st === 'done' ? 0.6 : 0.3;
      bandM.color.copy(st === 'later' ? gy : cy).multiplyScalar(st === 'later' ? 1 : boost); bandM.opacity = lvl;
      emM.color.copy(st === 'later' ? gy : cy).multiplyScalar(boost); emM.opacity = st === 'later' ? 0.45 : lerp(0.55, 1, st === 'now' ? sk : 0);
      inM.color.copy(cy); inM.opacity = st === 'later' ? 0.12 : 0.35;
      lens.material.color.set(st === 'later' ? L.grey : '#9BE9FF'); lens.material.opacity = st === 'later' ? 0.25 : 0.65;
      haloM.color.copy(cy).multiplyScalar(lerp(1.3, 1, k)); haloM.opacity = st === 'now' ? 0.9 * sk : 0; halo.visible = haloM.opacity > 0.01;
    };
    onLights(apply);
    return { g, top: h + 0.012, r, h, body, band, shadow: sh, halo, set(state = 'later', k = 1) { st = state; sk = clamp(k); apply(); return this; } };
  }

  // ------------------------------------------------------------------ "?" (a station not reached yet)
  /** Floating holo cube with a big "?" (Inter 800). Sprite; .set(a, t) fades it in and bobs it 5 cm. */
  function question({ size = 0.62 } = {}) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })); sp.scale.set(size, size, 1); noRefl(sp);
    let kq = -1; const y0 = { v: 0 };
    const redraw = () => { const q = quantK(room.k, 8); if (q === kq) return; kq = q; const L = lerpLook(q); x.clearRect(0, 0, 256, 256);
      drawFrame(x, 256, 256, L, { pad: 16, r: 60, bracket: 22, dots: false, blur: 14, lw: 4, scale: 0.6 });
      x.fillStyle = L.cyanInk; x.font = '800 150px Inter'; x.textAlign = 'center'; x.fillText('?', 128, 184); tex.needsUpdate = true; };
    onLights(redraw);
    return { sprite: sp, set(a, t = 0, seed = 0) { sp.material.opacity = clamp(a); sp.visible = a > 0.01; sp.position.y = y0.v + 0.05 * Math.sin(t * 2.2 + seed); return this; }, at(y) { y0.v = y; sp.position.y = y; return this; } };
  }

  // ------------------------------------------------------------------ beams, shells, edges
  /** Projection beam: an open Fresnel cylinder rising from a pedestal top (info "projected" from the station). */
  function beam({ r0 = 0.38, r1 = 0.3, h = 1.0, tint } = {}) {
    const m = fresnelMat(tint || '#7FE3FF', 0.10, 0.0, { side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 40, 1, true), m); mesh.geometry.translate(0, h / 2, 0); mesh.renderOrder = 3; noRefl(mesh);
    onLights(k => { m.uniforms.uA0.value = lerp(0.16, 0.10, k); m.uniforms.uB.value = lerp(1.4, 1, k); m.blending = k < 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending; });
    return { mesh, set(a) { m.uniforms.uO.value = clamp(a); mesh.visible = a > 0.01; return this; } };
  }
  /** Holo shell around any geometry (a sphere of ideas, a glass case). */
  function shellOf(geo, { tint = '#5FD3FF', a0 = 0.04, a1 = 0.55 } = {}) { const m = new THREE.Mesh(geo, fresnelMat(tint, a0, a1)); m.renderOrder = 3; return noRefl(m); }
  /** Edge lines of a geometry; 1 px cyan, never in the floor mirror (they shimmered there). */
  function edges(geo, { color, op = 0.7, thresh = 28 } = {}) {
    const m = new THREE.LineBasicMaterial({ color: color || LIGHT.line, transparent: true, opacity: op, depthWrite: false, toneMapped: false });
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, thresh), m); noRefl(l);
    if (!color) onLights(k => m.color.set(lerpLook(k).line).multiplyScalar(lerp(1.3, 1, k)));
    return l;
  }
  /** Thin unlit ring (torus) lying flat; colour follows the lights unless given. */
  function ring(r, tube = 0.008, { color, op = 0.55 } = {}) {
    const m = glowMat(color || LIGHT.line, op); const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 120), m); mesh.rotation.x = Math.PI / 2; noRefl(mesh);
    if (!color) onLights(k => m.color.set(lerpLook(k).line).multiplyScalar(lerp(1.4, 1, k)));
    return mesh;
  }

  // ------------------------------------------------------------------ particles
  /**
   * Instanced tiles / dots (one instance = one unit: the count on screen is the count of instances).
   * Each instance glows a little in its own colour (more in the dark studio).
   * setAt(i, position, scale(Vector3|number), color(Color), quaternion?) … then commit().
   */
  function tiles(count, { geo, w = 0.074, h = 0.054, d = 0.016, glow = 0.42 } = {}) {
    const g = geo || new THREE.BoxGeometry(w, h, d);
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0 });
    const U = { uGlow: { value: glow } };
    m.onBeforeCompile = sh => { sh.uniforms.uGlow = U.uGlow; sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor * uGlow;'); };
    const im = new THREE.InstancedMesh(g, m, count); im.frustumCulled = false; scene.add(im);
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    for (let i = 0; i < count; i++) im.setColorAt(i, new THREE.Color('#2FB4E8'));
    onLights(k => { U.uGlow.value = lerp(glow * 2.4, glow, k); });
    return { mesh: im, setAt(i, p, s = 1, c = null, q = Q.identity()) { if (typeof s === 'number') S.setScalar(s); else S.copy(s); M4.compose(p, q, S); im.setMatrixAt(i, M4); if (c) im.setColorAt(i, c); },
      commit() { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } };
  }
  /**
   * Flying dots computed on the GPU (no per-frame CPU): each dot leaves `from` at its own start time, flies an arc
   * (lift) to `to` in `dur` seconds and stays. Normal blending in the light studio, additive glow in the dark.
   * @param {object} o {from: Float32Array(3n), to: Float32Array(3n), start: Float32Array(n), dur, lift, size (world), color}
   * set(t, opacity) — pure of t. landed(t) — how many dots have arrived (sorted starts → binary search).
   */
  function flight({ from, to, start, dur = 0.6, lift = 0.25, size = 0.02, color = '#46D4FF', hot = '#ffffff' }) {
    const n = start.length; const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(to, 3)); geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3)); geo.setAttribute('aStart', new THREE.BufferAttribute(start, 1));
    const U = { uT: { value: 0 }, uDur: { value: dur }, uLift: { value: lift }, uSize: { value: size }, uPx: { value: 1000 }, uC: { value: new THREE.Color(color) }, uHot: { value: new THREE.Color(hot) }, uO: { value: 1 }, uGlow: { value: 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute vec3 aFrom; attribute float aStart; uniform float uT, uDur, uLift, uSize, uPx; varying float vA; varying float vMove;
        void main(){ float k = clamp((uT - aStart) / uDur, 0.0, 1.0); float e = k * k * (3.0 - 2.0 * k);
          vec3 mid = mix(aFrom, position, 0.5) + vec3(0.0, uLift, 0.0);
          vec3 p = (1.0 - e) * (1.0 - e) * aFrom + 2.0 * (1.0 - e) * e * mid + e * e * position;
          vA = step(0.0, uT - aStart); vMove = 4.0 * e * (1.0 - e);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uPx * uSize * (1.0 + 0.6 * vMove) / -mv.z, 1.5, 24.0) * vA; }`,
      fragmentShader: `uniform vec3 uC, uHot; uniform float uO, uGlow; varying float vA; varying float vMove;
        void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.18, r); float core = smoothstep(0.22, 0.0, r);
          vec3 c = mix(uC, uHot, vMove * 0.6 + core * uGlow * 0.5);
          gl_FragColor = vec4(c, a * vA * uO);
          #include <colorspace_fragment>
        }` });
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 9; noRefl(pts);
    const sorted = Array.from(start).sort((a, b) => a - b);
    onLights(k => { m.blending = k < 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending; U.uGlow.value = 1 - k; });
    return { points: pts, uniforms: U,
      set(t, o = 1, camera = room.camera) { U.uT.value = t; U.uO.value = o; pts.visible = o > 0.01; U.uPx.value = 540 / Math.tan(THREE.MathUtils.degToRad((camera.fov || 30) / 2)); return this; },
      landed(t) { let lo = 0, hi = n; const c = t - dur; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= c) lo = mid + 1; else hi = mid; } return lo; },
      count: n };
  }

  // ------------------------------------------------------------------ X-ray scan
  /**
   * X-ray: a scan sheet sweeps along `axis`; behind it every solid mesh of `target` is replaced by a glass twin with
   * cyan edge lines (the solid one is clipped away), so the parts inside show. Meshes with userData.xrayInner stay solid.
   * set(u): u 0 → 1 position of the sheet across the target's bounds (pure). Call after the target is placed.
   * @param {THREE.Object3D} target  @param {object} o {axis: Vector3 (world, default +x), tint, edge}
   */
  function xray(target, { axis = new THREE.Vector3(1, 0, 0), tint = '#9EC2FF', pad = 0.06 } = {}) {
    axis = axis.clone().normalize();
    const keep = new THREE.Plane(axis.clone(), 0), glass = new THREE.Plane(axis.clone().negate(), 0);
    const twins = [], edgeMats = [];
    const glassM = fresnelMat(tint, 0.05, 0.9, { side: THREE.DoubleSide }); glassM.clippingPlanes = [glass];
    const solids = []; target.traverse(o => { if (o.isMesh && !o.userData.xrayInner && !o.userData.xrayIgnore) solids.push(o); });
    for (const o of solids) {
      o.material = [].concat(o.material).map(m => { const c = m.clone(); c.clippingPlanes = [keep]; return c; });
      if (o.material.length === 1) o.material = o.material[0];
      const tw = new THREE.Mesh(o.geometry, glassM); tw.renderOrder = 6; tw.userData.xrayIgnore = true; noRefl(tw); o.add(tw); twins.push(tw);
      const e = edges(o.geometry, { op: 0.8, thresh: 30 }); e.material.clippingPlanes = [glass]; e.userData.xrayIgnore = true; o.add(e); edgeMats.push(e.material);
    }
    const box = new THREE.Box3();
    const sheetM = glowMat('#46D4FF', 0, { additive: true }); sheetM.side = THREE.DoubleSide;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheetM); sheet.renderOrder = 8; noRefl(sheet); scene.add(sheet);
    const haloM = new THREE.MeshBasicMaterial({ map: haloTex(), color: '#46D4FF', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloM); halo.renderOrder = 8; noRefl(halo); scene.add(halo);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    onLights(k => { const c = lerpLook(k).cyan; sheetM.color.set(c).multiplyScalar(lerp(1.4, 1, k)); haloM.color.set(c); });
    return {
      twins, sheet,
      /** u: sheet position 0–1; glow: sheet visibility (default: on while 0 < u < 1) */
      set(u, glow) {
        target.updateMatrixWorld(true); box.setFromObject(target, true);
        let lo = Infinity, hi = -Infinity;   // extent of the target along the axis (any direction)
        for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).dot(axis); lo = Math.min(lo, v); hi = Math.max(hi, v); }
        lo -= pad; hi += pad;
        const s = lerp(lo, hi, clamp(u)); keep.constant = -s; glass.constant = s;
        const g = glow ?? (u > 0 && u < 1 ? Math.min(1, Math.min(u, 1 - u) * 12) : 0);
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const sp = c.clone().addScaledVector(axis, s - c.dot(axis));
        const vert = Math.abs(axis.y) > 0.7, sw = vert ? Math.max(size.x, size.z) : Math.max(size.x, size.z), shh = vert ? Math.max(size.x, size.z) : size.y;
        sheet.position.copy(sp); sheet.quaternion.copy(q); sheet.scale.set(sw * 1.25 + 0.1, shh * 1.25 + 0.1, 1); sheetM.opacity = 0.42 * g; sheet.visible = g > 0.01;
        halo.position.copy(sp); halo.quaternion.copy(q); halo.scale.set(sw * 2.4 + 0.4, shh * 2.4 + 0.4, 1); haloM.opacity = 0.5 * g; halo.visible = g > 0.01;
        return this;
      },
    };
  }

  return { room, look, onLights, shell, SHELL, visor, glowMat, fresnelMat, panel, pedestal, question, beam, shellOf, edges, ring, tiles, flight, xray, drawFrame, noRefl };
}
