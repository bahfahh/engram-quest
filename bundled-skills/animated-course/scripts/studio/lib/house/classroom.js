// Engram studio — the classroom (head and tail of every lesson), three.js r170.
// The clay classroom is replaced by the house studio: one seamless cyc, a big board (light = holo board, dark =
// frosted-glass board) floating over a white projector plinth, the teacher left and the student right, the same
// camera language (wide ↔ push-in). The board's canvas is drawn by board.js (typeset content on narration words)
// and by mindmap.js (the ending map); the course map stands in the same studio (coursemap.js).
//
//   import { makeClassroom } from '/lib/house/classroom.js';
//   const C = await makeClassroom({ renderer, scene, camera: cam, mode: 'light', skin: 'glossy-bot', variant: 'classic' });
//   const ui = makeUI(document.getElementById('ui'), { mode, camera: cam });
//   window.renderAt = t => { C.lights(k); C.setCam(C.cams.W); …; C.render(); };
//
// Everything is a pure function of the arguments (renderAt(t) may be called in any order).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeRoom, haloTex } from './room.js';
import { makeHolo } from './holo.js';
import { lerpLook } from './tokens.js';
import { makeCast } from '/lib/cast/classroom.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Board geometry: 4.6 × 2.4 m, canvas 2048 × 1069 (board px), centre at pos. Same size as the clay blackboard. */
export const BOARD = { w: 4.6, h: 2.4, cw: 2048, pos: [0, 1.85, -2.36] };

/** Camera rig of the classroom (world units). Same shots as the clay classroom, re-framed for the studio. */
export function classroomCams(B = BOARD, studentAt = [2.85, 0, -1.2]) {
  const [bx, by, bz] = B.pos, [sx, , sz] = studentAt;
  const P = (pos, look, fov = 32) => ({ pos: V3(...pos), look: V3(...look), fov });
  return {
    W: P([bx + 0.1, 2.05, bz + 8.0], [bx, 1.42, bz], 34),                 // wide: teacher, board, student (board ≈ 53 % of the width)
    CS: P([sx - 1.45, 1.02, sz + 2.75], [sx - 0.1, 0.62, sz], 30),           // student close-up
    BC: P([bx, by - 0.13, bz + 5.05], [bx, by - 0.13, bz], 32),            // board close: the whole board, ~0.84 screen px per board px
    BFULL: P([bx, by, bz + 4.25], [bx, by, bz], 32),                       // board fills the frame
  };
}
export const mixCam = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: lerp(a.fov, b.fov, k) });

/**
 * @param {object} o
 * @param {THREE.WebGLRenderer} o.renderer  @param {THREE.Scene} o.scene  @param {THREE.PerspectiveCamera} o.camera
 * @param {'light'|'dark'} [o.mode]   lights at start (room.lights(k) / C.lights(k) change them)
 * @param {string} [o.skin]  makeCast skin id ('glossy-bot')   @param {string} [o.variant]  colour set ('classic')
 * @param {object} [o.board]  {w, h, cw, pos} (BOARD)
 * @param {Array} [o.teacherAt] [x, y, z]  @param {Array} [o.studentAt] [x, y, z]
 * @param {Array} [o.columns]  light columns for makeRoom; default: two each side of the board, plus `extraColumns`
 */
export async function makeClassroom({ renderer, scene, camera, mode = 'light', skin = 'glossy-bot', variant = 'classic', board = {}, teacherAt = [-2.95, 0, -1.5], studentAt = [2.85, 0, -1.2], columns, extraColumns = [], cast: castIn = null } = {}) {
  const B = { ...BOARD, ...board };
  B.ch = Math.round(B.cw * B.h / B.w);
  const cols = columns ?? [[-5.5, -5.8, '#36E2FF', 4.6], [-7.6, -3.2, '#36E2FF', 4.6], [5.5, -5.8, '#FF4FD8', 4.6], [7.6, -3.2, '#FF4FD8', 4.6], ...extraColumns];
  const room = makeRoom({ renderer, scene, camera, mode, columns: cols });
  const H = makeHolo(room);

  // ------------------------------------------------------------------ the board (holo / frosted glass) on a projector plinth
  const g = new THREE.Group(); g.position.set(...B.pos); scene.add(g);
  const sc = B.cw / 1024;
  const panel = H.panel({ w: B.w, h: B.h, res: B.cw, order: 4, frame: { pad: 22 * sc, r: 27 * sc, lw: 2.6 * sc, bracket: 30 * sc, blur: 13 * sc, scale: sc * 0.62 } });
  g.add(panel.mesh);
  // soft halo behind the board (gives the holo board presence on the white wall; glows in the dark)
  const haloM = new THREE.MeshBasicMaterial({ map: haloTex(), color: '#46D4FF', transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(B.w * 1.9, B.h * 2.1), haloM); halo.position.set(0, 0, -0.08); halo.renderOrder = 2; g.add(room.noReflect(halo));
  // plinth: white shell bar, glowing groove, black projector strip with a cyan emitter line
  const PL = { w: B.w * 0.92, d: 0.5, h: 0.3 };
  const plinth = new THREE.Group(); plinth.position.set(B.pos[0], 0, B.pos[2] + 0.02); scene.add(plinth);
  const body = new THREE.Mesh(new RoundedBoxGeometry(PL.w, PL.h, PL.d, 5, 0.09), H.SHELL); body.position.y = PL.h / 2; plinth.add(body);
  const bandM = H.glowMat('#46D4FF', 0.9); const band = new THREE.Mesh(new THREE.BoxGeometry(PL.w - 0.16, 0.022, 0.006), bandM); band.position.set(0, PL.h * 0.52, PL.d / 2 + 0.002); plinth.add(band);
  const top = new THREE.Mesh(new RoundedBoxGeometry(PL.w - 0.14, 0.012, PL.d - 0.16, 2, 0.005), H.visor('#0c1220')); top.position.y = PL.h + 0.004; plinth.add(top);
  const emM = H.glowMat('#46D4FF', 0.95); const em = new THREE.Mesh(new THREE.BoxGeometry(PL.w - 0.3, 0.008, 0.03), emM); em.position.y = PL.h + 0.012; plinth.add(H.noRefl(em));
  const pSh = room.shadow(PL.w * 1.18, PL.d * 2.6, 0.38); pSh.position.set(0, 0.004, 0); plinth.add(pSh);
  // light sheet from the plinth to the board (the board is projected)
  const sheetC = document.createElement('canvas'); sheetC.width = 4; sheetC.height = 128; { const x = sheetC.getContext('2d'); const gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); }
  const sheetT = new THREE.CanvasTexture(sheetC); sheetT.colorSpace = THREE.SRGBColorSpace;
  const gap = B.pos[1] - B.h / 2 - PL.h;
  const sheetM = new THREE.MeshBasicMaterial({ map: sheetT, color: '#7FE3FF', transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(PL.w - 0.3, gap + 0.12), sheetM); sheet.position.set(0, PL.h + (gap + 0.12) / 2, 0); sheet.renderOrder = 3; plinth.add(H.noRefl(sheet));

  room.onLights(k => {
    const L = lerpLook(k), boost = lerp(1.7, 1, k);
    bandM.color.set(L.cyan).multiplyScalar(boost); emM.color.set(L.cyan).multiplyScalar(boost * 1.1);
    sheetM.color.set(L.cyan); sheetM.opacity = lerp(0.30, 0.13, k); sheetM.blending = k < 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    haloM.color.set(L.cyan); haloM.opacity = lerp(0.20, 0.10, k); haloM.blending = k < 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
  });

  /** board px → world point (on the board plane, 2 mm in front) */
  const toWorld = (bx, by, z = 0.002) => { const v = V3((bx / B.cw - 0.5) * B.w, (0.5 - by / B.ch) * B.h, z); g.updateMatrixWorld(); return g.localToWorld(v); };
  /** board px → screen px [x, y] for camera cam (1920×1080) */
  const toScreen = (bx, by, cam = camera) => { const v = toWorld(bx, by).project(cam); return [(v.x + 1) * 960, (1 - v.y) * 540]; };
  /** board-px box → screen-px box {x0,y0,x1,y1} */
  const boxToScreen = (x0, y0, x1, y1, cam = camera) => { const p = toScreen(x0, y0, cam), q = toScreen(x1, y1, cam); return { x0: Math.min(p[0], q[0]), y0: Math.min(p[1], q[1]), x1: Math.max(p[0], q[0]), y1: Math.max(p[1], q[1]) }; };

  // ------------------------------------------------------------------ the cast
  const cast = castIn || await makeCast(skin, { renderer, variant });
  room.dress(cast);
  const teacher = cast.teacher, student = cast.student;
  teacher.root.position.set(...teacherAt); student.root.position.set(...studentAt); scene.add(teacher.root, student.root);

  // ------------------------------------------------------------------ cameras
  const cams = classroomCams(B, studentAt);
  /**
   * Push in through the board to a board point (bx, by): a camera `dist` m in front of it (default 0.9 m) — the
   * handover to the middle (pair it with ui.wipe at the cut).
   */
  cams.boardAt = (bx, by, dist = 0.9, fov = 32) => { const p = toWorld(bx, by, 0); return { pos: V3(p.x, p.y, p.z + dist), look: p, fov }; };
  const pushPath = (from, to) => new THREE.CatmullRomCurve3([from.pos, from.pos.clone().lerp(to.pos, 0.5).add(V3(0, 0.05, 0)), to.pos], false, 'centripetal');
  /** camera on a push from `from` to `to` (k 0..1, already eased) */
  cams.push = (from, to, k) => ({ pos: pushPath(from, to).getPoint(clamp(k)), look: from.look.clone().lerp(to.look, clamp(k)), fov: lerp(from.fov, to.fov, k) });

  const setCam = c => { camera.position.copy(c.pos); camera.fov = c.fov; camera.near = 0.05; camera.far = 220; camera.updateProjectionMatrix(); camera.lookAt(c.look); camera.updateMatrixWorld(); };

  const C = {
    room, H, board: { g, panel, ...B, toWorld, toScreen, boxToScreen, plinth, halo }, cast, teacher, student, cams, mixCam, setCam,
    /** lights level (1 light … 0 dark) */
    lights(k) { room.lights(k); return C; },
    /** floor pool + wall glow follow what the camera looks at */
    focus(c) { room.focus(c.look.x, Math.min(c.look.z, B.pos[2] + 1)); room.glow(c.look.x * 0.6, 2.9, 1.15); return C; },
    render(cam = camera) { room.render(cam); },
  };
  return C;
}
