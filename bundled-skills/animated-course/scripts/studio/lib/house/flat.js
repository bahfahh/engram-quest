// Engram studio — flat (DOM / SVG) middles in the same studio.
// The background IS the 3D room (cyc, floor grid, light columns), rendered once from a fixed frontal camera into a
// canvas and re-rendered only when the lights change; so a flat page and a 3D page are visibly the same room.
// makeStage() characters (lib/cast/stage.js) get this studio's light: reflections (scene.environment), fill and rim
// lights, a cool contact shadow and a faint floor reflection — without changing stage.js.
//
//   import { makeStage } from '/lib/cast/stage.js';
//   import { makeFlat } from '/lib/house/flat.js';
//   import { makeUI } from '/lib/house/ui.js';
//   const st = await makeStage({ card: false, floor: null });
//   const cast = await (await import('/lib/cast/skins/glossy-bot.js')).create(st.env, { variant: 'classic' }); st.adopt(cast);
//   const flat = await makeFlat(st, { mode: 'light' });     // background + layers inside st.frame
//   const ui = makeUI(flat.over, { mode: 'light' });        // labels, cards (above the characters)
//   // your diagram goes in flat.content (below the characters); add class "h-reflect" to blocks that stand on the floor
//   window.renderAt = t => { flat.lights(k); ui.lights(k); flat.place(cast.student, 1500, 930, 330); cast.student.pose(s); flat.render(); };
import * as THREE from 'three';
import { makeRoom, rigAt, envTexture, KEY_DIR } from './room.js';
import { applyVars, quantK, LIGHT, DARK, mix } from './tokens.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;

/**
 * @param {object|HTMLElement} host  a makeStage() result (st) or any 1920×1080 element (no characters)
 * @param {object} o {mode, camera: {y, z, lookY, fov}, columns (room.js format | false), focus: [x, z], glow: [x, y, s], reflect: strength of the cast's floor reflection}
 * @returns {Promise<{frame, content, over, lights(k), place(ch, x, y, px, opts), render(), k}>}
 */
export async function makeFlat(host, { mode = 'light', camera = {}, columns, focus = [0, -2], glow = [0, 2.8, 1.15], reflect = true } = {}) {
  const st = host && host.frame && host.scene ? host : null;
  const frame = st ? st.frame : host;
  frame.style.background = 'transparent';
  if (st) for (const c of [...frame.children]) if (c.classList && (c.classList.contains('x14-wash') || c.classList.contains('x14-floor'))) c.style.display = 'none';
  frame.dataset.house = mode;

  // ---- the room as background (its own small WebGL context; rendered only when the lights change)
  const bg = document.createElement('canvas'); bg.width = 1920; bg.height = 1080; bg.className = 'h-flat-bg';
  bg.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:0'; frame.prepend(bg);
  const renderer = new THREE.WebGLRenderer({ canvas: bg, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false);
  const scene = new THREE.Scene();
  const C = { y: 1.6, z: 11, lookY: 1.35, fov: 30, ...camera };
  const cam = new THREE.PerspectiveCamera(C.fov, 16 / 9, 0.05, 220); cam.position.set(0, C.y, C.z); cam.lookAt(0, C.lookY, -6); cam.updateMatrixWorld();
  const cols = columns === undefined ? [[-7.4, -4.2, '#36E2FF'], [-9.6, -1.6, '#36E2FF'], [7.4, -4.2, '#FF4FD8'], [9.6, -1.6, '#FF4FD8']] : columns;
  const room = makeRoom({ renderer, scene, camera: cam, mode, columns: cols, reflect: false });
  room.focus(...focus); room.glow(...glow);

  // ---- layers inside the frame: content (diagram) < shadows < reflections < 2D cast (30) < 3D cast (40) < over (UI)
  const mk = (z, cls) => { const d = document.createElement('div'); d.className = cls; d.style.cssText = `position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:${z};pointer-events:none`; frame.append(d); return d; };
  const content = mk(10, 'h-flat-content'); content.dataset.house = mode;
  const shadowL = mk(25, 'h-flat-shadows');
  const reflC = document.createElement('canvas'); reflC.width = 1920; reflC.height = 1080; reflC.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:28;pointer-events:none'; frame.append(reflC);
  const rx = reflC.getContext('2d');
  const over = mk(50, 'h-flat-over');
  const castCanvas = st ? frame.querySelector('canvas.x14-3d') : null;

  // ---- the cast's lights: same rig as the room (key upper-left-front, fill, rims), same environment
  let lights3 = null;
  if (st) {
    const hemi = st.scene.children.find(o => o.isHemisphereLight), dirs = st.scene.children.filter(o => o.isDirectionalLight);
    const [key, fill, rim] = dirs; key.position.set(...KEY_DIR).multiplyScalar(1.2);
    const rimC = new THREE.DirectionalLight('#36E2FF', 0); rimC.position.set(-7, 4, -6); st.scene.add(rimC);
    const rimM = new THREE.DirectionalLight('#FF4FD8', 0); rimM.position.set(7, 4, -6); st.scene.add(rimM);
    lights3 = { hemi, key, fill, rim, rimC, rimM };
  }

  let K = mode === 'dark' ? 0 : 1, kq = null;
  const placed = new Map(), shadows = new Map();
  const flat = {
    frame, content, over, room, background: bg,
    get k() { return K; },
    /** Lights level: 1 light studio … 0 dark studio (background, DOM tokens of content, cast lights all follow). */
    lights(k) {
      K = clamp(k); const q = quantK(K, 24);
      if (q !== kq) {
        kq = q; room.lights(q); room.render();
        applyVars(content, q); content.dataset.house = q >= 0.5 ? 'light' : 'dark'; frame.dataset.house = content.dataset.house;
        if (lights3) { const R = rigAt(q), L = lights3; L.hemi.color.copy(R.hemiSky); L.hemi.groundColor.copy(R.hemiGround); L.hemi.intensity = R.hemi;
          L.key.color.copy(R.key); L.key.intensity = R.keyI * 1.05; L.fill.color.copy(R.fill); L.fill.intensity = R.fillI; L.rim.intensity = R.rimI; L.rimC.intensity = R.cyanI; L.rimM.intensity = R.magI;
          st.scene.environment = envTexture(q); st.scene.environmentIntensity = R.envI; }
        const sc = mix(DARK.shadow, LIGHT.shadow, q);
        for (const el of shadows.values()) el.style.setProperty('--sc', sc);
      }
      return flat;
    },
    /**
     * Place a makeStage character (feet at screen x, y; on-screen height px) and give it a contact shadow and a floor reflection.
     * o: {visible, alpha, shadow (true), reflect (true)} — call every frame for every character, then flat.render().
     */
    place(ch, x, y, px, { visible = true, alpha = 1, shadow = true, reflect: rf = true } = {}) {
      if (!st) throw new Error('flat.place: makeFlat was given an element, not a makeStage() result (no cast layer)');
      st.place(ch, x, y, px, { visible, alpha });
      const on = visible && alpha > 0.01;
      placed.set(ch, { x, y, px, on, rf: rf && reflect, alpha });
      let s = shadows.get(ch);
      if (!s) { s = document.createElement('div'); s.style.cssText = 'position:absolute;left:0;top:0;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--sc) 85%, transparent), color-mix(in srgb, var(--sc) 40%, transparent) 45%, transparent)'; s.style.setProperty('--sc', mix(DARK.shadow, LIGHT.shadow, kq ?? K)); shadowL.append(s); shadows.set(ch, s); }
      s.style.display = on && shadow ? '' : 'none';
      if (on && shadow) { const w = px * 0.78, h = px * 0.13; s.style.width = w + 'px'; s.style.height = h + 'px'; s.style.opacity = (alpha * lerp(0.95, 0.5, K)).toFixed(3); s.style.transform = `translate(${(x - w / 2).toFixed(1)}px,${(y - h * 0.55).toFixed(1)}px)`; }
      return flat;
    },
    /** Render the cast, then draw each character's faint floor reflection (a flipped, fading copy under its feet). */
    render() {
      if (st) st.render();
      rx.clearRect(0, 0, 1920, 1080);
      if (!castCanvas) { for (const s of shadows.values()) s.style.display = 'none'; placed.clear(); return flat; }
      const str = lerp(0.42, 0.2, K);
      for (const [, p] of placed) {
        if (!p.on || !p.rf) continue;
        const w = p.px * 1.3, h = p.px * 1.12, sx = Math.max(0, p.x - w / 2), sy = Math.max(0, p.y - h), sw = Math.min(1920 - sx, w), sh = p.y - sy;
        if (sw <= 0 || sh <= 0) continue;
        rx.save(); rx.beginPath(); rx.rect(sx, p.y, sw, sh * 0.6); rx.clip();
        rx.translate(0, 2 * p.y); rx.scale(1, -1); rx.drawImage(castCanvas, sx, sy, sw, sh, sx, sy, sw, sh); rx.setTransform(1, 0, 0, 1, 0, 0);
        rx.globalCompositeOperation = 'destination-in';
        const g = rx.createLinearGradient(0, p.y, 0, p.y + sh * 0.6); g.addColorStop(0, `rgba(0,0,0,${(str * p.alpha).toFixed(3)})`); g.addColorStop(0.75, 'rgba(0,0,0,0)');
        rx.fillStyle = g; rx.fillRect(sx, p.y, sw, sh * 0.6); rx.restore();
      }
      for (const [ch, s] of shadows) { const p = placed.get(ch); if (!p || !p.on) s.style.display = 'none'; }
      placed.clear();
      return flat;
    },
  };
  flat.lights(K);
  return flat;
}
