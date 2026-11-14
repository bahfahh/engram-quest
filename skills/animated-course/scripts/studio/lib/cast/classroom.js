// Put any teacher's skin into the existing classroom scenes (lib/classroom/*).
//
//   import { makeCast } from '/lib/cast/classroom.js';
//   const cast = await makeCast('glossy-owl', { renderer });      // skin id from resolve.cjs (a custom skin: 'custom:<id>')
//   cast.teacher.root.position.set(-2.25, 0, -0.7); scene.add(cast.teacher.root);
//   cast.student.root.position.set(2.1, 0, 0.05);  scene.add(cast.student.root);
//   // per frame — the same call the clay cast takes:
//   cast.teacher.pose({ t, mouth: S.mouth(T, 'teacher', t), turn: 0.5 });
//   // or the skin's own fields (CAST.md): point, wave, hop, state 'think'|'aha'|'doubt', stateK …
//   cast.teacher.poseNative({ t, talk, point: 1, state: 'aha', stateK: 1 });
//
// 'clay-snackshop' returns the clay Professor Bao / Taro unchanged, so a scene can always go through makeCast().
// Skins are scaled to the clay characters' heights, get a contact shadow, and get their own reflection
// map (the classroom's own materials are not touched). 2D skins cannot go into a 3D classroom: use
// lib/cast/stage.js for those.
import * as THREE from 'three';
import * as C from '/lib/classroom/cast.js';
import { rng } from '/lib/kit/kit.js';
import { skinUrl } from '/lib/cast/skin-url.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STATES = new Set(['idle', 'think', 'aha', 'doubt']);

let _heights = null;
function clayHeights() {
  if (_heights) return _heights;
  const h = o => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); return b.max.y - b.min.y; };
  const t = C.makeTeacher(), s = C.makeStudent();
  _heights = { teacher: h(t.root), student: h(s.root) };
  _heights.embodiment = _heights.student * 0.62;
  return _heights;
}

function studioEnv(renderer) {
  if (!renderer) return null;
  const pm = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene();
  const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#f3ece4'); gr.addColorStop(0.55, '#c8b9a8'); gr.addColorStop(1, '#6b5a4c');
  x.fillStyle = gr; x.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  const l1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' })); l1.position.set(-5, 5, 6); l1.lookAt(0, 0, 0); envScene.add(l1);
  return pm.fromScene(envScene, 0.02).texture;
}

/** Clay-style pose fields → the skin's pose fields (CAST.md). */
export function claySToSkin(s = {}) {
  const arm = r => (r === undefined ? 0 : clamp((r - 0.35) / 2.2, 0, 1));
  let state = STATES.has(s.state) ? s.state : 'idle', stateK = s.stateK ?? 0;
  if (!s.state) {
    if ((s.steam || 0) > 0.05) { state = 'aha'; stateK = clamp(s.steam, 0, 1); }
    else if ((s.leafDroop || 0) > 0.05) { state = 'doubt'; stateK = clamp(s.leafDroop, 0, 1); }
  }
  return {
    t: s.t || 0, blink: s.blink || 0, lookX: s.lookX || 0, lookY: s.lookY || 0,
    talk: clamp(s.talk ?? s.mouth ?? 0, 0, 1),
    armL: arm(s.armL), armR: arm(s.armR),
    point: s.point || 0, wave: s.wave || 0, hop: s.hop || 0,
    squash: s.squash || 0, tilt: clamp((s.tilt || 0) / 0.3, -1, 1),
    turn: s.turn === undefined ? 0 : clamp(s.turn / 0.55, -1, 1),
    state, stateK,
  };
}

/** Skin pose fields (CAST.md) → the clay cast's fields, so cue.js and poseNative() work on Professor Bao / Taro too.
 *  The clay teacher's right-hand chopstick is on the viewer's right, like every skin's `point` arm. */
export function skinToClay(s = {}) {
  const t = s.t || 0, arm = v => 0.35 + 2.2 * clamp(v || 0, 0, 1);
  let armR = arm(s.armR);
  if (s.point) armR = lerpN(armR, 1.5, clamp(s.point, 0, 1));                 // straight out towards the viewer's right
  if (s.wave) armR = lerpN(armR, 2.3 + 0.35 * Math.sin(t * 12), clamp(s.wave, 0, 1));
  const st = STATES.has(s.state) ? s.state : 'idle', k = clamp(s.stateK ?? 0, 0, 1);
  return {
    t, blink: s.blink || 0, lookX: s.lookX || 0, lookY: s.lookY || 0, mouth: clamp(s.talk || 0, 0, 1),
    armL: arm(s.armL), armR, tilt: (s.tilt || 0) * 0.3, turn: clamp(s.turn || 0, -1, 1) * 0.55,
    squash: s.squash || 0, steam: st === 'aha' ? k : 0, leafDroop: st === 'doubt' ? k : 0,
    brow: st === 'think' ? 0.6 * k : st === 'doubt' ? 0.4 * k : 0, browTilt: st === 'doubt' ? 0.5 * k : 0,
  };
}
const lerpN = (a, b, k) => a + (b - a) * k;

function wrap(ch, targetH, envTex) {
  if (!ch) return null;
  if (!ch.root) throw new Error('makeCast: this skin is 2D; place it with /lib/cast/stage.js instead of a 3D classroom');
  const root = new THREE.Group(); root.add(ch.root);
  targetH *= ch.classroomScale ?? 1;   // optional per-character factor (CAST.md): a wide round role would dwarf the teacher at the clay height
  ch.root.scale.setScalar(targetH / ch.height);
  if (envTex) ch.root.traverse(o => {
    if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && 'envMap' in m && !m.envMap && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) { m.envMap = envTex; m.needsUpdate = true; }
  });
  const sh = C.contactShadow(targetH * 0.55, targetH * 0.45, 0.4); sh.position.y = 0.004; root.add(sh);
  let last = null;
  const poseNative = (s = {}) => { const full = { t: 0, blink: 0, lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0, ...s }; ch.pose(full); last = full; };
  const pose = (s = {}) => poseNative(claySToSkin(s));
  pose({});
  return { root, pose, poseNative, headY: targetH * 0.85, height: targetH, skin: ch, get lastPose() { return last; } };
}

/**
 * @param {string} skinId  e.g. 'glossy-owl' (from resolve.cjs → skin)
 * @param {{renderer?: THREE.WebGLRenderer, seed?: number, variant?: string}} opts  pass the scene's renderer so glossy skins get reflections;
 *        variant = colour set id from resolve.cjs → skin.variant (CAST.md "Colour sets"; unknown/absent → the skin's default)
 * @returns {Promise<{skin:string, kind:'clay'|'3d', teacher, student, embodiment}>}
 */
export async function makeCast(skinId = 'clay-snackshop', { renderer = null, seed = 7, variant = null } = {}) {
  if (!skinId || skinId === 'clay-snackshop') {
    // the clay objects unchanged, plus poseNative (skin fields → clay) and height, so cue.js works on them too
    const H = clayHeights(), clay = (ch, h) => Object.assign(ch, { height: h, poseNative: s => ch.pose(skinToClay(s)) });
    return { skin: 'clay-snackshop', kind: 'clay', teacher: clay(C.makeTeacher(), H.teacher), student: clay(C.makeStudent(), H.student), embodiment: null };
  }
  const mod = await import(skinUrl(skinId));
  if (mod.meta && mod.meta.kind === '2d') throw new Error(`makeCast: skin ${skinId} is 2D; use /lib/cast/stage.js`);
  const raw = await mod.create({ THREE, K: null, rng, layer2d: null, seed }, { variant });
  const H = clayHeights(), envTex = studioEnv(renderer);
  return { skin: skinId, variant: raw.variant || null, kind: '3d', teacher: wrap(raw.teacher, H.teacher, envTex), student: wrap(raw.student, H.student, envTex), embodiment: wrap(raw.embodiment, H.embodiment, envTex) };
}
