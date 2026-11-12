// Cast stage: blurred real-UI floor + 2D character layer + 3D character layer (three.js overlay).
// Used by lab.html / hero.html (skin tests) and by any scene that places a skin (see CAST.md).
// Skins live in /lib/cast/skins/<id>.js; this file is shared — skin authors do not edit it.
import * as THREE from 'three';
import * as K from '/lib/kit/kit.js';

// transparent: true → no background colour, floor or wash: the characters float over the page's own DOM
// (put your scene behind the stage frame, or append your elements into frame below layer2d).
// card: true draws a demo UI panel (the skin test page lab.html points at it); off by default so a scene shows only its own content.
export async function makeStage({ card = false, cardAt = { x: 920, y: 380 }, floor: floorSrc = '/lib/cast/floor.jpg', transparent = false } = {}) {
  if (transparent) floorSrc = null;
  await K.init(['wallet']);
  const css = document.createElement('style');
  css.textContent = `
    .x14-frame{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;background:#F4F1EC}
    .x14-floor{position:absolute;inset:0;width:1920px;height:1080px;opacity:.85}
    .x14-wash{position:absolute;inset:0;background:radial-gradient(1200px 700px at 50% 55%, rgba(255,255,255,.55), rgba(255,255,255,0))}
    .x14-card{position:absolute;transform:translate(-50%,-50%);box-shadow:0 18px 50px rgba(30,40,60,.18)!important;border-radius:16px!important}
    .x14-2d{position:absolute;inset:0;z-index:30;pointer-events:none}
    .x14-2d > *{position:absolute;left:0;top:0;transform-origin:0 0}
    .x14-3d{position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:40;pointer-events:none}`;
  document.head.append(css);
  const frame = document.createElement('div'); frame.className = 'x14-frame'; document.body.append(frame);
  if (transparent) frame.style.background = 'transparent';
  if (floorSrc) { const floor = new Image(); floor.className = 'x14-floor'; floor.src = floorSrc; frame.append(floor); await floor.decode(); }
  if (!transparent) { const wash = document.createElement('div'); wash.className = 'x14-wash'; frame.append(wash); }
  let cardEl = null, toggleEl = null;
  if (card) {
    const p = K.am.panel({ w: 520, sections: [{ title: 'Budget', icon: 'wallet', rows: [
      { label: 'Advantage+ campaign budget', sub: 'Distribute your budget across ad sets', toggle: true },
      { label: 'Campaign budget', input: 'NT$430', suffix: 'Daily' }] }] });
    cardEl = p.el; cardEl.classList.add('x14-card'); cardEl.style.left = cardAt.x + 'px'; cardEl.style.top = cardAt.y + 'px';
    toggleEl = p.switches['Advantage+ campaign budget']; frame.append(cardEl);
  }
  const layer2d = document.createElement('div'); layer2d.className = 'x14-2d'; frame.append(layer2d);
  const canvas = document.createElement('canvas'); canvas.className = 'x14-3d'; frame.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(1920, 1080, false); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(14, 16 / 9, 0.5, 200); cam.position.set(0, 4.5, 40); cam.lookAt(0, 0.6, 0); cam.updateMatrixWorld();
  // shared studio lighting (styles add emissive materials, not scene lights)
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b9a6', 1.25));
  const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(-6, 9, 10); scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe9ff', 0.6); fill.position.set(8, 3, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 0.9); rim.position.set(3, 6, -8); scene.add(rim);
  // simple environment for glossy / metal / glass materials (a soft studio gradient, no files)
  { const pm = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 32, 16); const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#eef2f8'); gr.addColorStop(0.55, '#b9c2cf'); gr.addColorStop(1, '#5d6673'); x.fillStyle = gr; x.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
    const l1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' })); l1.position.set(-5, 5, 6); l1.lookAt(0, 0, 0); envScene.add(l1);
    scene.environment = pm.fromScene(envScene, 0.02).texture; }
  const f = 540 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), v = new THREE.Vector3();
  const at = (sx, sy) => { ray.setFromCamera(new THREE.Vector2(sx / 960 - 1, 1 - sy / 540), cam); ray.ray.intersectPlane(plane, v); return v.clone(); };
  /** feet of char at screen (x, y), on-screen height px. Works for 3D ({root, height}) and 2D ({el, w, height}). */
  function place(ch, x, y, px, { visible = true, alpha = 1 } = {}) {
    if (ch.root) {
      ch.root.visible = visible && alpha > 0.01;
      const p = at(x, y); ch.root.position.copy(p); const d = cam.position.distanceTo(p); ch.root.scale.setScalar(px * d / (f * ch.height));
    } else if (ch.el) {
      if (!ch.el.parentNode) layer2d.append(ch.el);
      const s = px / ch.height;
      ch.el.style.display = visible && alpha > 0.01 ? 'block' : 'none';
      ch.el.style.opacity = alpha;
      ch.el.style.transform = `translate(${(x - ch.w * s / 2).toFixed(1)}px, ${(y - ch.height * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
    }
  }
  /** add a 3D cast to the scene once, and make every member's pose() accept a partial object:
   *  missing fields get POSE_DEFAULTS, the same defaults classroom.js poseNative fills in (CAST.md "Tolerate missing fields") */
  function adopt(cast) {
    for (const k of ['teacher', 'student', 'embodiment']) {
      const c = cast[k]; if (!c) continue;
      if (c.root && !c.root.parent) scene.add(c.root);
      if (typeof c.pose === 'function' && !c.pose.withDefaults) {
        const raw = c.pose.bind(c), pose = (s = {}) => raw(fillPose(s));
        pose.withDefaults = true; c.pose = pose;
      }
    }
  }
  const env = { THREE, K, rng: K.rng, layer2d };
  return { frame, env, place, adopt, render: () => renderer.render(scene, cam), scene, cam, cardEl, toggleEl };
}

/** Every pose field at rest (CAST.md field table). */
export const POSE_DEFAULTS = Object.freeze({ t: 0, blink: 0, lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0 });

/** A full pose from a partial one: fields that are missing or undefined (e.g. `{ lookX: opts.lookX }`) get POSE_DEFAULTS. */
export function fillPose(s = {}) {
  const out = { ...POSE_DEFAULTS };
  for (const k in s) if (s[k] !== undefined) out[k] = s[k];
  return out;
}

/** The test sequence every style must handle (lab.html uses it; scene.html uses the same idea). Returns pose objects. */
export function labPoses(t) {
  const k = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const win = (a, b, e = 0.2) => Math.min(k(a, a + e), 1 - k(b - e, b));
  const blink = (seed) => { const ph = (t + seed * 0.77) % 2.6; return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0; };
  const talkOf = (a, b) => win(a, b, 0.1) * (0.35 + 0.35 * Math.sin(t * 17) + 0.3 * Math.sin(t * 7.3));
  const base = seed => ({ t, blink: blink(seed), lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0 });
  const T = base(1), S = base(2), E = base(3);
  // 0-1 idle: everyone faces the viewer, small breathing
  // 1-2 teacher talks and points right at the UI card; student and embodiment look at the teacher
  const g1 = win(1, 2.05); T.talk = talkOf(1, 2); T.point = g1; T.lookX = 0.8 * g1; T.turn = 0.3 * g1; S.lookX = -1 * g1; E.lookX = -0.7 * g1;
  // 2-3 student THINKS (state light), one arm up near the chin
  const g2 = win(2, 3.05); S.state = 'think'; S.stateK = g2; S.armR = 0.45 * g2; S.lookY = 0.6 * g2; S.tilt = 0.15 * g2;
  // 3-4 student AHA: both arms up, hop
  const g3 = win(3, 4.05); if (g3 > 0) { S.state = 'aha'; S.stateK = g3; } S.armL = Math.max(S.armL, g3); S.armR = Math.max(S.armR, g3); S.hop = g3 * Math.max(0, Math.sin((t - 3) * 6)) * 0.6; S.talk = talkOf(3.1, 3.8);
  // 4-5 student DOUBTS, embodiment thinks then has the aha
  const g4 = win(4, 5.05); if (g4 > 0) { S.state = 'doubt'; S.stateK = g4; S.tilt = -0.2 * g4; S.lookX = -0.5 * g4; }
  E.state = t < 4.5 ? 'think' : 'aha'; E.stateK = g4; E.hop = 0.3 * g4 * Math.abs(Math.sin((t - 4) * 5));
  // 5-6 everyone waves at the viewer, teacher AHA
  const g5 = win(5, 6.2); T.wave = g5; S.wave = g5; E.wave = g5; T.armR = Math.max(T.armR, g5); S.armR = Math.max(S.armR, g5); E.armR = Math.max(E.armR, g5);
  if (g5 > 0) { T.state = 'aha'; T.stateK = g5; T.talk = talkOf(5.1, 5.9); }
  for (const P of [T, S, E]) P.squash += 0.02 * Math.sin(t * 2.2 + (P === S ? 1 : P === E ? 2 : 0));
  return { teacher: T, student: S, embodiment: E };
}
