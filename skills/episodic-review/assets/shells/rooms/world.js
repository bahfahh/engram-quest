// world.js — the dollhouse (approved shell from round 1, now 4 floors = 4 domains), rooms, furniture, skies.
// Built once; film.js poses it per frame (pure function of t).
import * as THREE from 'three';
import { rng } from './lib.js';

export const R = { W: 5, D: 4.4, H: 3.0, SLAB: 0.22, WALL: 0.12 };
export const FH = R.H + R.SLAB;
export const NF = 4, NC = 3;
export const slotPos = (floor, col) => new THREE.Vector3((col - 1) * R.W, floor * FH, 0);
const SRGB = THREE.SRGBColorSpace;

/* ------------------------------------------------------------------ canvas textures */
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = SRGB; tex.anisotropy = 8;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...opts.repeat); }
  let key = null;
  const api = { tex, c, ctx, w, h, set(k, fn) { if (k === key) return false; key = k; ctx.clearRect(0, 0, w, h); (fn || draw)(ctx, w, h, k); tex.needsUpdate = true; return true; } };
  if (draw) api.set('init', draw);
  return api;
}

function noiseFill(ctx, w, h, base, amp, seed) {
  const r = rng(seed); const img = ctx.createImageData(w, h);
  const [br, bg, bb] = base;
  for (let i = 0; i < w * h; i++) { const n = (r() - 0.5) * amp; img.data[i * 4] = br + n; img.data[i * 4 + 1] = bg + n; img.data[i * 4 + 2] = bb + n * 0.9; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
function woodTex(seed, tone = [150, 104, 66], planks = 8, w = 1024, h = 1024, gaps = true) {
  return canvasTex(w, h, (ctx) => {
    const r = rng(seed); const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const off = r() * w; const k = 0.78 + r() * 0.36;
      for (let seg = -1; seg < 2; seg++) {
        const x0 = off + seg * w * 0.62; const kk = k * (0.92 + r() * 0.16);
        ctx.fillStyle = `rgb(${tone.map(v => Math.min(255, v * kk)).join(',')})`;
        ctx.fillRect(((x0 % w) + w) % w - w, p * ph, w * 0.62, ph); ctx.fillRect(((x0 % w) + w) % w, p * ph, w * 0.62, ph);
      }
      for (let g = 0; g < 26; g++) {
        const yy = p * ph + r() * ph; const a = 0.05 + r() * 0.12;
        ctx.strokeStyle = `rgba(${r() < .5 ? '40,24,10' : '255,230,200'},${a})`; ctx.lineWidth = 0.6 + r() * 1.6; ctx.beginPath();
        for (let x = 0; x <= w; x += 32) ctx.lineTo(x, yy + Math.sin(x * 0.01 + g) * (2 + r() * 3));
        ctx.stroke();
      }
      if (gaps) { ctx.fillStyle = 'rgba(25,14,6,.55)'; ctx.fillRect(0, p * ph, w, 2.5); for (let s = 0; s < 3; s++) { ctx.fillStyle = 'rgba(25,14,6,.5)'; ctx.fillRect(((off + s * w * 0.62) % w), p * ph, 2.5, ph); } }
    }
  }, { repeat: [1, 1] });
}
function plasterTex(seed, base) {
  return canvasTex(256, 256, (ctx, w, h) => {
    noiseFill(ctx, w, h, base, 12, seed); const r = rng(seed + 7);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(0,0,0,${0.012 + r() * 0.018})`; ctx.beginPath(); ctx.arc(r() * w, r() * h, 8 + r() * 30, 0, 7); ctx.fill(); }
  }, { repeat: [2, 2] });
}
function sidingTex() {
  return canvasTex(512, 512, (ctx, w) => {
    const r = rng(41);
    for (let i = 0; i < 16; i++) { const k = 0.92 + r() * 0.1; ctx.fillStyle = `rgb(${[118, 140, 120].map(v => v * k).join(',')})`; ctx.fillRect(0, i * 32, w, 32); ctx.fillStyle = 'rgba(20,30,20,.45)'; ctx.fillRect(0, i * 32 + 29, w, 3); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, i * 32, w, 3); }
  }, { repeat: [6, 4] });
}
function roofTex() {
  return canvasTex(512, 512, (ctx, w, h) => {
    const r = rng(77); ctx.fillStyle = '#4a3c38'; ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let i = 0; i < 9; i++) { const k = 0.8 + r() * 0.4; ctx.fillStyle = `rgb(${[128, 96, 86].map(v => v * k).join(',')})`; ctx.fillRect(i * 60 + (row % 2) * 30 - 30, row * 32, 56, 29); }
  }, { repeat: [4, 3] });
}

/* ------------------------------------------------------------------ window skies */
const SKY = {
  // late-summer afternoon, low western sun (room 1)
  lateAft: { top: '#7fb0dc', mid: '#c7d9e6', bot: '#f4dcae', tree: ['#4f8a45', '#6aa154', '#3f7339', '#a7a145'], sun: [0.72, 0.62, '#fff2cf'], trunk: '#4a3a2b' },
  dusk: { top: '#2c2c5c', mid: '#8a5480', bot: '#f0965e', tree: ['#1f2a2a', '#26302e', '#2c3a30'], sun: [0.62, 0.95, '#ffb46a'], trunk: '#141b1b' },
  night: { top: '#060a18', mid: '#0d1631', bot: '#1c2746', tree: ['#070a10', '#0b1016'], sun: null, stars: true, lights: true, moon: [0.24, 0.22], trunk: '#05070a' },
  autumn: { top: '#8c97a3', mid: '#b9b3a6', bot: '#d4c3a4', tree: ['#b4532a', '#c97a32', '#8f3b22', '#d39b48'], sun: null, trunk: '#3d2b22' },
  morning: { top: '#8fbfe6', mid: '#c7def0', bot: '#f2ecd6', tree: ['#5a9450', '#74aa5c', '#4b7f43'], sun: [0.2, 0.55, '#ffffff'], trunk: '#4a3a2b' },
  deep: { top: '#04060e', mid: '#070b18', bot: '#0c1226', tree: ['#03050a'], sun: null, stars: true, lights: true, trunk: '#020305' },
  neutral: { top: '#8c97a6', mid: '#a7b0bc', bot: '#c2c8d0', tree: ['#7a838e'], sun: null, trunk: '#5d636b' },
};
export const skyTex = {};
function buildSky(name) {
  const s = SKY[name];
  return canvasTex(512, 384, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, s.top); g.addColorStop(0.55, s.mid); g.addColorStop(1, s.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = rng(name.length * 13 + 5);
    if (s.stars) for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.6})`; ctx.fillRect(r() * w, r() * h * 0.6, 1.4, 1.4); }
    if (s.moon) { const [mx, my] = s.moon; const rg = ctx.createRadialGradient(mx * w, my * h, 2, mx * w, my * h, 60); rg.addColorStop(0, 'rgba(235,240,255,.95)'); rg.addColorStop(0.18, 'rgba(220,230,255,.85)'); rg.addColorStop(0.22, 'rgba(160,180,230,.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); }
    if (s.sun) { const [sx, sy, sc] = s.sun; const rg = ctx.createRadialGradient(sx * w, sy * h, 2, sx * w, sy * h, 170); rg.addColorStop(0, sc); rg.addColorStop(0.12, sc); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = s.tree[s.tree.length - 1]; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * 0.72 - Math.sin(x * 0.012) * 18 - r() * 6);
    ctx.lineTo(w, h); ctx.fill(); ctx.globalAlpha = 1;
    if (s.lights) for (let i = 0; i < 34; i++) { ctx.fillStyle = r() < .5 ? 'rgba(255,200,120,.85)' : 'rgba(200,220,255,.6)'; ctx.fillRect(r() * w, h * 0.68 + r() * h * 0.12, 2.5, 2.5); }
    for (let i = 0; i < 9; i++) {
      const tx = (i + 0.2 + r() * 0.6) * w / 8 - 30, tb = h * (0.86 + r() * 0.1), tr = 34 + r() * 40;
      ctx.fillStyle = s.trunk; ctx.fillRect(tx - 4, tb - tr, 8, tr + 30);
      for (let b = 0; b < 16; b++) { ctx.fillStyle = s.tree[Math.floor(r() * s.tree.length)]; ctx.beginPath(); ctx.arc(tx + (r() - 0.5) * tr * 1.6, tb - tr - r() * tr * 1.3, tr * (0.35 + r() * 0.4), 0, 7); ctx.fill(); }
    }
  });
}

/* ------------------------------------------------------------------ materials & helpers */
export const M = {};
const std = (o) => new THREE.MeshStandardMaterial(o);
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function cyl(rt, rb, h, mat, seg = 20, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function plane(w, h, mat, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.receiveShadow = true; if (parent) parent.add(m); return m; }
export const build = { box, cyl, plane, std };

/* ------------------------------------------------------------------ furniture */
function desk(parent, mat, w = 1.8, d = 0.8) {
  const g = new THREE.Group(); parent.add(g);
  box(w, 0.045, d, mat, 0, 0.745, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.72, 0.05, mat, sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06), g);
  box(w - 0.12, 0.1, 0.02, mat, 0, 0.66, -d / 2 + 0.05, g);
  box(0.42, 0.16, d - 0.1, mat, w / 2 - 0.3, 0.63, 0, g);
  box(0.2, 0.018, 0.02, M.brass, w / 2 - 0.3, 0.63, d / 2 - 0.04, g);
  return g;
}
function chair(parent, mat) {
  const g = new THREE.Group(); parent.add(g);
  box(0.46, 0.04, 0.44, mat, 0, 0.46, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.035, 0.46, 0.035, mat, sx * 0.2, 0.23, sz * 0.19, g);
  for (const sx of [-1, 1]) box(0.035, 0.5, 0.035, mat, sx * 0.2, 0.72, 0.19, g);
  box(0.44, 0.16, 0.025, mat, 0, 0.86, 0.19, g); box(0.44, 0.04, 0.025, mat, 0, 0.66, 0.19, g);
  return g;
}
// a big desktop monitor; the screen plane is returned in userData.screen (size sw x sh)
function monitor(parent, tex, sw = 0.92, sh = 0.53) {
  const g = new THREE.Group(); parent.add(g);
  box(0.26, 0.014, 0.2, M.dark, 0, 0.007, 0, g);
  box(0.04, 0.24, 0.03, M.dark, 0, 0.13, -0.03, g);
  box(sw + 0.03, sh + 0.03, 0.03, M.dark, 0, 0.26 + sh / 2, 0, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0, 0.26 + sh / 2, 0.0156); g.add(scr);
  g.userData.screen = scr; g.userData.sw = sw; g.userData.sh = sh;
  return g;
}
function laptop(parent, tex) {
  const g = new THREE.Group(); parent.add(g);
  box(0.36, 0.014, 0.25, M.alu, 0, 0.007, 0, g); box(0.3, 0.002, 0.11, M.keys, 0, 0.0145, -0.02, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.125); lid.rotation.x = -0.28; g.add(lid);
  box(0.36, 0.235, 0.008, M.alu, 0, 0.1175, -0.004, lid);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.335, 0.21), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0, 0.1175, 0.0005); lid.add(scr); g.userData.screen = scr;
  return g;
}
function rod(a, b, r, mat, parent) { const v = new THREE.Vector3().subVectors(b, a); const m = cyl(r, r, v.length(), mat, 8, parent); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); return m; }
function deskLamp(parent) {
  const g = new THREE.Group(); parent.add(g);
  cyl(0.075, 0.085, 0.022, M.lampMetal, 24, g).position.y = 0.011;
  const j0 = new THREE.Vector3(0, 0.02, 0), j1 = new THREE.Vector3(0.06, 0.36, 0), j2 = new THREE.Vector3(0.232, 0.468, 0);
  rod(j0, j1, 0.009, M.lampMetal, g); rod(j1, j2, 0.009, M.lampMetal, g);
  for (const j of [j1, j2]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.lampMetal); s.position.copy(j); s.castShadow = true; g.add(s); }
  const shade = cyl(0.03, 0.09, 0.12, M.lampShade, 24, g); shade.position.set(0.26, 0.42, 0); shade.rotation.z = 0.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c8 })); bulb.position.set(0.28, 0.38, 0); g.add(bulb);
  g.userData.bulb = bulb;
  return g;
}
function bookshelf(parent, seed) {
  const g = new THREE.Group(); parent.add(g); const r = rng(seed);
  const W = 1.1, H = 1.9, D = 0.32;
  box(W, 0.03, D, M.shelf, 0, 0.015, 0, g); box(W, 0.03, D, M.shelf, 0, H, 0, g);
  box(0.03, H, D, M.shelf, -W / 2, H / 2, 0, g); box(0.03, H, D, M.shelf, W / 2, H / 2, 0, g); box(W, H, 0.015, M.shelf, 0, H / 2, -D / 2, g);
  const cols = [0x7a3b2e, 0x2f4f6f, 0xc9a66b, 0x3f5e45, 0x8c6d4f, 0xdcd3c0, 0x5a4a6a, 0x9b4e3a, 0x2a2a2a];
  const mats = cols.map(c => std({ color: c, roughness: 0.8 }));
  for (let s = 0; s < 4; s++) {
    const y = 0.03 + s * 0.47; if (s) box(W, 0.025, D, M.shelf, 0, y, 0, g);
    let x = -W / 2 + 0.04;
    while (x < W / 2 - 0.08) { const bw = 0.025 + r() * 0.04, bh = 0.24 + r() * 0.14; if (r() < 0.08) { x += 0.06; continue; } const b = box(bw, bh, 0.2 + r() * 0.06, mats[Math.floor(r() * mats.length)], x + bw / 2, y + bh / 2 + 0.012, 0.01, g); if (r() < 0.1) b.rotation.z = 0.12; x += bw + 0.004; }
  }
  return g;
}
function plant(parent, seed) {
  const g = new THREE.Group(); parent.add(g);
  cyl(0.13, 0.1, 0.24, M.pot, 20, g).position.y = 0.12; const r = rng(seed);
  for (let i = 0; i < 9; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.leaf); leaf.scale.set(0.5, 1.6, 0.25); leaf.position.set((r() - 0.5) * 0.18, 0.38 + r() * 0.22, (r() - 0.5) * 0.18); leaf.rotation.set((r() - 0.5) * 0.9, r() * 6, (r() - 0.5) * 0.9); leaf.castShadow = true; g.add(leaf); }
  return g;
}
function rug(parent, seed, color, w = 2.2, d = 1.6) {
  const t = canvasTex(256, 256, (ctx, W, H) => { noiseFill(ctx, W, H, color, 18, seed); ctx.strokeStyle = 'rgba(255,240,220,.35)'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, W - 28, H - 28); ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60); });
  const m = plane(w, d, std({ map: t.tex, roughness: 1 }), parent); m.rotation.x = -Math.PI / 2; m.position.y = 0.004; return m;
}
function mug(parent) { const g = new THREE.Group(); parent.add(g); const c = cyl(0.04, 0.036, 0.09, M.mug, 20, g); c.position.y = 0.045; const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), M.mug); h.position.set(0.045, 0.05, 0); h.rotation.z = -Math.PI / 2; g.add(h); return g; }

/* ------------------------------------------------------------------ the house */
export function buildWorld(scene) {
  const T = {};
  T.floorWood = woodTex(3, [158, 112, 72], 9); T.floorWood.tex.repeat.set(2.2, 2);
  T.deskWood = woodTex(9, [124, 80, 50], 3, 512, 512, false);
  T.siding = sidingTex(); T.roof = roofTex();
  for (const k of Object.keys(SKY)) skyTex[k] = buildSky(k);
  Object.assign(M, {
    desk: std({ map: T.deskWood.tex, roughness: 0.55 }),
    shelf: std({ map: T.deskWood.tex, roughness: 0.65, color: 0xd8c8b8 }),
    alu: std({ color: 0x9a9ea4, metalness: 0.7, roughness: 0.35 }), keys: std({ color: 0x222326, roughness: 0.8 }),
    dark: std({ color: 0x1e1f22, roughness: 0.6, metalness: 0.2 }), red: std({ color: 0xb03a2e, roughness: 0.6 }),
    brass: std({ color: 0xb08a4a, metalness: 0.8, roughness: 0.35 }),
    lampMetal: std({ color: 0x2c4a3e, metalness: 0.5, roughness: 0.4 }), lampShade: std({ color: 0x2c4a3e, metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }),
    pot: std({ color: 0xb4643f, roughness: 0.85 }), leaf: std({ color: 0x3f6b3a, roughness: 0.7 }), mug: std({ color: 0xe9e2d4, roughness: 0.5 }),
    trim: std({ color: 0xece4d6, roughness: 0.6 }), cut: new THREE.MeshLambertMaterial({ color: 0xe9dcc6 }),
    siding: new THREE.MeshLambertMaterial({ map: T.siding.tex }), roof: new THREE.MeshLambertMaterial({ map: T.roof.tex }),
    turn: std({ map: T.deskWood.tex, color: 0x9c8574, roughness: 0.45, metalness: 0.05 }),
    windowFrame: std({ color: 0xf1ece2, roughness: 0.5 }), cloth: std({ color: 0xcfc6b8, roughness: 1 }),
    boardFrame: std({ color: 0xb9bdc2, metalness: 0.6, roughness: 0.35 }), frameWood: std({ color: 0x3a2a20, roughness: 0.6 }),
  });
  const world = new THREE.Group(); scene.add(world);
  const shell = new THREE.Group(); world.add(shell);
  const rooms = [];
  const tones = [[226, 214, 196], [214, 222, 214], [228, 216, 204], [205, 212, 222], [232, 222, 205], [216, 206, 214], [222, 216, 200], [210, 220, 222], [226, 210, 198], [218, 214, 206], [212, 218, 210], [224, 214, 202]];
  let id = 0;
  for (let f = 0; f < NF; f++) for (let c = 0; c < NC; c++) { const room = buildRoom(f, c, tones[id], id, T); room.slot = [f, c]; rooms.push(room); world.add(room.g); id++; }
  const HW = 1.5 * R.W, HT = NF * FH;
  for (const sx of [-1, 1]) { box(0.08, HT + 0.52, R.D + 0.16, M.siding, sx * (HW + 0.04), (HT - 0.52) / 2, 0, shell); box(0.12, HT + 0.52, 0.12, M.trim, sx * (HW + 0.06), (HT - 0.52) / 2, R.D / 2 + 0.05, shell); }
  box(2 * HW + 0.3, 0.3, R.D + 0.3, M.cut, 0, -0.15 - R.SLAB, 0, shell);
  box(2 * HW + 0.2, 0.22, R.D + 0.16, M.cut, 0, HT - R.SLAB / 2, 0, shell);
  const roofG = new THREE.Group(); roofG.position.y = HT; shell.add(roofG);
  const pitch = 0.56, half = HW + 0.7, slope = half / Math.cos(pitch);
  for (const sx of [-1, 1]) { const r = box(slope, 0.28, R.D + 1.0, M.roof, sx * half / 2, Math.tan(pitch) * half / 2 - (Math.tan(pitch) * (half - HW) - 0.14 / Math.cos(pitch)), 0, roofG); r.rotation.z = -sx * pitch; }
  const tri = new THREE.Shape(); tri.moveTo(-HW, 0); tri.lineTo(HW, 0); tri.lineTo(0, Math.tan(pitch) * HW); tri.lineTo(-HW, 0);
  const hole = new THREE.Path(); hole.absarc(0, 1.6, 0.5, 0, Math.PI * 2, true); tri.holes.push(hole);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }), M.siding); gable.position.set(0, 0, -R.D / 2 - 0.12); gable.castShadow = gable.receiveShadow = true; roofG.add(gable);
  const atticGlow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x1a2340 })); atticGlow.position.set(0, 1.6, -R.D / 2 - 0.2); roofG.add(atticGlow);
  box(0.7, 2.4, 0.7, std({ color: 0x7b4a3a, roughness: 0.9 }), HW * 0.55, Math.tan(pitch) * HW * 0.45 + 0.6, -0.6, roofG);
  box(0.9, 0.6, 0.6, M.cloth, -3, 0.3, -0.8, roofG); box(0.6, 0.45, 0.5, M.cloth, -2.1, 0.22, -1.0, roofG);
  const turntable = new THREE.Group(); world.add(turntable);
  const disk = cyl(13.5, 13.8, 0.55, M.turn, 96, turntable); disk.position.y = -R.SLAB - 0.3 - 0.275; disk.castShadow = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(13.62, 0.05, 8, 128), M.brass); ring.rotation.x = Math.PI / 2; ring.position.y = -R.SLAB - 0.3; turntable.add(ring);
  return { world, shell, rooms, roofG, turntable, T };
}

// door between room (f,c) and (f,c+1) on floor 0 (col 0 <-> col 1)
const DOOR = { z: 0.9, w: 1.0, h: 2.15 };
function hasSideDoor(f, c, sx) { return f === 0 && ((c === 0 && sx === 1) || (c === 1 && sx === -1)); }

function buildRoom(f, c, tone, id, T) {
  const g = new THREE.Group(); g.position.copy(slotPos(f, c));
  const plasterT = plasterTex(100 + id, tone);
  const wallMat = new THREE.MeshLambertMaterial({ map: plasterT.tex, emissive: 0x000000, emissiveMap: plasterT.tex });
  const floorMat = new THREE.MeshLambertMaterial({ map: T.floorWood.tex, emissive: 0x000000, emissiveMap: T.floorWood.tex });
  const ceilMat = new THREE.MeshLambertMaterial({ color: 0xf2ece2, emissive: 0x000000 });
  const { W, D, H, SLAB, WALL } = R;
  const slab = box(W, SLAB, D, M.cut, 0, -SLAB / 2, 0, g); slab.material = [M.cut, M.cut, floorMat, ceilMat, M.cut, M.cut];
  const ceil = plane(W, D, ceilMat, g); ceil.rotation.x = Math.PI / 2; ceil.position.y = H - 0.001;
  box(W, 0.02, D, M.cut, 0, H + 0.01, 0, g).receiveShadow = false;
  const wz = -D / 2 - WALL / 2; const win = { w: 1.6, h: 1.5, sill: 0.85, x: 0 };
  const L = -W / 2, Rr = W / 2, wl = win.x - win.w / 2, wr = win.x + win.w / 2;
  box(wl - L, H, WALL, wallMat, (L + wl) / 2, H / 2, wz, g); box(Rr - wr, H, WALL, wallMat, (wr + Rr) / 2, H / 2, wz, g);
  box(win.w, win.sill, WALL, wallMat, win.x, win.sill / 2, wz, g); box(win.w, H - win.sill - win.h, WALL, wallMat, win.x, H - (H - win.sill - win.h) / 2, wz, g);
  const fz = -D / 2 - WALL / 2, ft = 0.06;
  box(win.w + 0.12, ft, WALL + 0.06, M.windowFrame, win.x, win.sill + win.h + ft / 2, fz, g);
  box(win.w + 0.24, 0.045, 0.26, M.windowFrame, win.x, win.sill - 0.02, fz + 0.08, g);
  for (const sx of [-1, 1]) box(ft, win.h, WALL + 0.06, M.windowFrame, win.x + sx * (win.w / 2 + ft / 2), win.sill + win.h / 2, fz, g);
  box(0.04, win.h, 0.05, M.windowFrame, win.x, win.sill + win.h / 2, fz - 0.02, g); box(win.w, 0.04, 0.05, M.windowFrame, win.x, win.sill + win.h * 0.62, fz - 0.02, g);
  const skyA = new THREE.MeshBasicMaterial({ map: skyTex.night.tex, fog: false, toneMapped: false });
  const skyB = new THREE.MeshBasicMaterial({ map: skyTex.night.tex, fog: false, toneMapped: false, transparent: true, opacity: 0 });
  const pA = plane(4.6, 2.9, skyA, g); pA.position.set(0, 1.55, -D / 2 - 1.05); pA.receiveShadow = false;
  const pB = plane(4.6, 2.9, skyB, g); pB.position.set(0, 1.55, -D / 2 - 1.04); pB.receiveShadow = false;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - WALL / 2);
    if (!hasSideDoor(f, c, sx)) box(WALL / 2, H, D, wallMat, x + sx * WALL / 4, H / 2, 0, g);
    else {
      const { z: dz, w: dw, h: dh } = DOOR, z0 = -D / 2, z1 = D / 2;
      box(WALL / 2, H, (dz - dw / 2) - z0, wallMat, x + sx * WALL / 4, H / 2, (z0 + dz - dw / 2) / 2, g);
      box(WALL / 2, H, z1 - (dz + dw / 2), wallMat, x + sx * WALL / 4, H / 2, (dz + dw / 2 + z1) / 2, g);
      box(WALL / 2, H - dh, dw, wallMat, x + sx * WALL / 4, dh + (H - dh) / 2, dz, g);
      box(0.06, dh, 0.08, M.trim, x - sx * 0.01, dh / 2, dz - dw / 2 - 0.04, g); box(0.06, dh, 0.08, M.trim, x - sx * 0.01, dh / 2, dz + dw / 2 + 0.04, g); box(0.06, 0.08, dw + 0.16, M.trim, x - sx * 0.01, dh + 0.04, dz, g);
    }
  }
  box(W - 0.1, 0.1, 0.02, M.trim, 0, 0.05, -D / 2 + 0.01, g);
  box(W, 0.06, 0.04, M.cut, 0, H - 0.03, D / 2 - 0.02, g);
  const room = { g, id, f, c, wallMat, floorMat, ceilMat, skyA, skyB, pA, pB, win, glowBulbs: [], plaster: plasterT };
  const r = rng(500 + id);
  if (!STATION_IDS.includes(id)) {   // a lived-in filler room
    const bs = bookshelf(g, 600 + id); bs.position.set(-W / 2 + 0.3, 0, -0.6 + r() * 0.6); bs.rotation.y = Math.PI / 2;
    const tb = new THREE.Group(); g.add(tb); box(1.0, 0.04, 0.6, M.desk, 0, 0.72, 0, tb);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.04, 0.72, 0.04, M.desk, sx * 0.45, 0.36, sz * 0.25, tb);
    tb.position.set(0.6 + r() * 0.4, 0, -1.4);
    const lampG = new THREE.Group(); g.add(lampG);
    cyl(0.012, 0.012, 1.5, M.dark, 8, lampG).position.y = 0.75; cyl(0.14, 0.16, 0.03, M.dark, 16, lampG).position.y = 0.015;
    const shade = cyl(0.14, 0.22, 0.26, std({ color: 0xf3e3c4, roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: 0 }), 20, lampG); shade.position.y = 1.55;
    lampG.position.set(1.9, 0, -1.6); room.glowBulbs.push(shade.material);
    rug(g, 700 + id, [120 + r() * 60, 90 + r() * 30, 80 + r() * 30]);
    box(0.5, 0.35, 0.4, M.cloth, -1.2, 0.175, 1.0 + r() * 0.5, g);
  }
  return room;
}
// rooms we walk into: floor 0 col 0, floor 0 col 1, floor 1 col 0
export const STATION_IDS = [0, 1, 3];

/* ------------------------------------------------------------------ station furnishing */
// opts: monitorTex, laptopTex, notebookTex, boardTex, calTex, plateTex, wbSide (whiteboard on right wall), wbZ
export function furnishStation(room, opts) {
  const g = room.g; const { W, D } = R; const S = { room };
  S.desk = desk(g, M.desk); S.desk.position.set(0, 0, -D / 2 + 0.45);
  S.chair = chair(g, M.desk); S.chair.position.set(-0.15, 0, -1.0); S.chair.rotation.y = 0.35;
  const top = new THREE.Group(); top.position.set(0, 0.7675, -D / 2 + 0.45); g.add(top); S.top = top;
  S.monitor = monitor(top, opts.monitorTex); S.monitor.position.set(0.32, 0, -0.12); S.monitor.rotation.y = -0.18;
  S.laptop = laptop(top, opts.laptopTex); S.laptop.position.set(-0.55, 0, -0.16); S.laptop.rotation.y = 0.35;
  S.lamp = deskLamp(top); S.lamp.position.set(-0.8, 0, 0.12); S.lamp.rotation.y = -0.2;
  S.mug = mug(top); S.mug.position.set(0.82, 0, 0.18);
  // things that were really on the desk that month: a stack of books, a pen cup, loose printouts, headphones
  { const bk = new THREE.Group(); top.add(bk); bk.position.set(0.8, 0, -0.26); const r = rng(77 + room.id);
    [[0x2f4f6f, 0.25, 0.17], [0x9b4e3a, 0.23, 0.16], [0xd8cdb4, 0.21, 0.15]].forEach(([c, w, d], i) => { const b = box(w, 0.036, d, std({ color: c, roughness: 0.8 }), 0, 0.018 + i * 0.037, 0, bk); b.rotation.y = (r() - 0.5) * 0.4; });
    S.books = bk; }
  { const pc = new THREE.Group(); top.add(pc); pc.position.set(0.62, 0, 0.27); cyl(0.032, 0.03, 0.1, std({ color: 0x3f5e45, roughness: 0.6 }), 16, pc).position.y = 0.05;
    [[0x2c67a3, 0.12, 0.2], [0xc2453a, -0.1, 0.1], [0x25303d, 0.02, -0.18]].forEach(([c, ax, az]) => { const p = cyl(0.005, 0.005, 0.15, std({ color: c, roughness: 0.5 }), 6, pc); p.position.set(ax * 0.1, 0.12, az * 0.1); p.rotation.set(az, 0, ax); }); S.penCup = pc; }
  { const paperT = canvasTex(256, 362, (ctx, w, h) => { ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(40,40,50,.28)'; const r = rng(5); for (let y = 40; y < h - 30; y += 18) { if (r() < 0.12) { y += 10; continue; } ctx.fillRect(24, y, 120 + r() * 90, 5); } ctx.fillStyle = 'rgba(44,103,163,.35)'; ctx.fillRect(24, 22, 110, 9); });
    const pm = std({ map: paperT.tex, roughness: 0.95 });
    [[0.27, 0.0025, 0.24, 0.35], [0.4, 0.004, 0.2, -0.12]].forEach(([x, y, z, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), pm); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, y, z); m.receiveShadow = true; top.add(m); }); }
  { const hp = new THREE.Group(); top.add(hp); hp.position.set(-0.36, 0.012, -0.3); hp.rotation.set(-Math.PI / 2 + 0.25, 0, 0.4);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 8, 20, Math.PI), M.dark); band.castShadow = true; hp.add(band);
    for (const sx of [-1, 1]) { const cup = cyl(0.04, 0.04, 0.03, M.dark, 16, hp); cup.position.set(sx * 0.085, -0.01, 0); cup.rotation.x = Math.PI / 2; } S.headphones = hp; }
  // sticky notes and a clock on the back wall, a bag by the chair
  { const stickyT = (bg, seed) => canvasTex(128, 128, (ctx, w, h) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(30,30,40,.45)'; ctx.lineWidth = 3; const r = rng(seed); for (let i = 0; i < 4; i++) { ctx.beginPath(); const y = 34 + i * 22; ctx.moveTo(14, y); for (let x = 14; x < 30 + r() * 80; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.4 + i) * 2.5); ctx.stroke(); } });
    const spots = room.id === 3 ? [[1.95, 2.2, 0.06, '#f6dc78'], [2.15, 2.05, -0.05, '#bfe0f0']] : [[-1.25, 1.95, 0.05, '#f6dc78'], [-1.02, 1.82, -0.06, '#f2b8a0'], [-1.2, 1.62, 0.02, '#bfe0f0']];
    spots.forEach(([x, y, rz, bg], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), std({ map: stickyT(bg, room.id * 10 + i).tex, roughness: 0.9 })); m.position.set(x, y, -D / 2 + 0.006 + i * 0.001); m.rotation.z = rz; g.add(m); }); }
  { const ck = new THREE.Group(); g.add(ck); ck.position.set(-1.55, 2.42, -D / 2 + 0.03);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), std({ color: 0xf4efe4, roughness: 0.6 })); face.position.z = 0.012; ck.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), M.dark); rim.position.z = 0.012; ck.add(rim);
    const hand = (len, w, ang) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: 0x25303d })); m.geometry.translate(0, len / 2, 0); m.position.z = 0.016; m.rotation.z = -ang; ck.add(m); };
    const hh = [3.3, 7.6, 10.4][STATION_IDS.indexOf(room.id)] ?? 3; hand(0.09, 0.014, hh / 12 * Math.PI * 2); hand(0.135, 0.009, (hh % 1) * Math.PI * 2 + 0.6); S.clock = ck; }
  { const bag = box(0.34, 0.4, 0.18, std({ color: 0x3a4a5c, roughness: 0.85 }), -0.95, 0.2, -0.75, g); bag.rotation.y = 0.5; S.bag = bag; }
  // open notebook (context line, handwritten)
  { const nb = new THREE.Group(); top.add(nb); nb.position.set(-0.12, 0.004, 0.22); nb.rotation.y = 0.06;
    box(0.46, 0.012, 0.31, M.leather || std({ color: 0x5a3324, roughness: 0.7 }), 0, 0.006, 0, nb);
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.29), std({ map: opts.notebookTex, roughness: 0.95 })); pg.rotation.x = -Math.PI / 2; pg.position.y = 0.0135; pg.receiveShadow = true; nb.add(pg);
    S.notebook = nb; S.notebookPage = pg; }
  S.bookshelf = bookshelf(g, 900 + room.id); S.bookshelf.position.set(-W / 2 + 0.24, 0, 0.35); S.bookshelf.rotation.y = Math.PI / 2;
  S.plant = plant(g, 40 + room.id); S.plant.position.set(1.95, 0, -1.8);
  S.rug = rug(g, 30 + room.id, [118, 74, 58]); S.rug.position.set(0.1, 0.004, -0.5);
  // whiteboard on the right wall (faces -x)
  { const wb = new THREE.Group(); g.add(wb); const bw = 2.3, bh = 1.3; wb.position.set(W / 2 - 0.075, 1.6, opts.wbZ ?? -0.75); wb.rotation.y = -Math.PI / 2;
    box(bw + 0.05, bh + 0.05, 0.025, M.boardFrame, 0, 0, -0.005, wb);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), std({ map: opts.boardTex, roughness: 0.62, metalness: 0.0, emissive: 0xffffff, emissiveMap: opts.boardTex, emissiveIntensity: 0.16 })); face.position.z = 0.0085; face.receiveShadow = true; wb.add(face);
    box(0.8, 0.025, 0.06, M.boardFrame, 0.3, -bh / 2 - 0.03, 0.03, wb);
    for (const [i, col] of [[0, 0x2c67a3], [1, 0xc2453a], [2, 0x25303d]].map((v) => v)) { const mk = cyl(0.009, 0.009, 0.12, std({ color: col, roughness: 0.5 }), 10, wb); mk.rotation.z = Math.PI / 2; mk.position.set(0.05 + i * 0.13, -bh / 2 - 0.01, 0.05); }
    S.wb = wb; S.boardFace = face; S.bw = bw; S.bh = bh; }
  // wall calendar (right of window)
  { const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), std({ map: opts.calTex, roughness: 0.9 })); cal.position.set(1.45, 1.75, -D / 2 + 0.012); g.add(cal); S.cal = cal; }
  // front door frame + plate
  { const door = new THREE.Group(); g.add(door); door.position.set(1.35, 0, D / 2 - 0.05);
    const dw = 1.0, dh = 2.15; for (const sx of [-1, 1]) box(0.08, dh, 0.14, M.trim, sx * (dw / 2 + 0.04), dh / 2, 0, door); box(dw + 0.16, 0.1, 0.14, M.trim, 0, dh + 0.05, 0, door);
    const leafPivot = new THREE.Group(); leafPivot.position.set(dw / 2, 0, 0.05); door.add(leafPivot);
    box(dw - 0.04, dh - 0.04, 0.045, std({ color: 0x6d4a35, roughness: 0.6 }), -dw / 2, dh / 2, 0, leafPivot); box(0.03, 0.03, 0.08, M.brass, -dw + 0.12, 1.0, 0, leafPivot); leafPivot.rotation.y = 1.66;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), std({ map: opts.plateTex, roughness: 0.4, metalness: 0.2 })); plate.position.set(0, dh + 0.3, 0.075); plate.castShadow = true; door.add(plate);
    S.door = door; S.plate = plate; }
  return S;
}

// a framed picture (note figure) hung on a wall; returns the mesh group
export function framedPicture(parent, tex, w, h) {
  const g = new THREE.Group(); parent.add(g);
  box(w + 0.06, h + 0.06, 0.03, M.frameWood, 0, 0, -0.012, g);
  box(w + 0.01, h + 0.01, 0.005, std({ color: 0xf4efe4, roughness: 0.9 }), 0, 0, 0.004, g);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); pic.position.z = 0.008; g.add(pic);
  g.userData.pic = pic;
  return g;
}

/* ------------------------------------------------------------------ dust + light shaft + glow sprites */
export function makeDust(n = 900) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const sprite = canvasTex(64, 64, (ctx) => { const rg = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, 64, 64); });
  const mat = new THREE.PointsMaterial({ size: 0.019, map: sprite.tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const r = rng(2026); const seeds = Array.from({ length: n }, () => [r(), r(), r(), r(), r(), r()]);
  return { pts, geo, mat, seeds, n };
}
// window light as a soft volume: a proxy box (the room interior) whose shader integrates light along each view ray
// through the slanted beam behind the window opening. No hard faces, so no visible "column" edges.
export function makeShaft() {
  const { W, D, H } = R;
  const geo = new THREE.BoxGeometry(W - 0.14, H - 0.02, D - 0.02); geo.translate(0, H / 2, 0.0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(1, 0.85, 0.6) }, uI: { value: 0 }, uCam: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0.4, -0.5, 0.76) },
      uWin: { value: new THREE.Vector4(-0.8, 0.8, 0.86, 2.34) }, uZ: { value: -D / 2 } },
    vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; uniform vec3 uCam; uniform vec3 uDir; uniform vec4 uWin; uniform float uZ; varying vec3 vL;
      float soft(float x, float a, float b, float e){ return smoothstep(a, a + e, x) * (1.0 - smoothstep(b - e, b, x)); }
      void main(){
        vec3 ro = uCam; vec3 d = vL - ro; float tmax = length(d); vec3 rd = d / tmax;
        // beam coordinates: s = distance along the beam from the window plane, (a,b) = where it entered the window
        float s0 = (ro.z - uZ) / uDir.z, s1 = rd.z / uDir.z;
        float a0 = ro.x - s0 * uDir.x, a1 = rd.x - s1 * uDir.x;
        float b0 = ro.y - s0 * uDir.y, b1 = rd.y - s1 * uDir.y;
        float t0 = 0.0, t1 = tmax;
        // slabs on a, b and s >= 0
        if (abs(a1) > 1e-5) { float ta = (uWin.x - a0) / a1, tb = (uWin.y - a0) / a1; t0 = max(t0, min(ta, tb)); t1 = min(t1, max(ta, tb)); } else if (a0 < uWin.x || a0 > uWin.y) discard;
        if (abs(b1) > 1e-5) { float ta = (uWin.z - b0) / b1, tb = (uWin.w - b0) / b1; t0 = max(t0, min(ta, tb)); t1 = min(t1, max(ta, tb)); } else if (b0 < uWin.z || b0 > uWin.w) discard;
        if (abs(s1) > 1e-5) { float ts = -s0 / s1; if (s1 > 0.0) t0 = max(t0, ts); else t1 = min(t1, ts); } else if (s0 < 0.0) discard;
        if (t1 <= t0) discard;
        float acc = 0.0; float dt = (t1 - t0) / 8.0; float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        for (int i = 0; i < 8; i++) {
          float t = t0 + (float(i) + jit) * dt; float s = s0 + s1 * t; float a = a0 + a1 * t; float b = b0 + b1 * t;
          vec3 p = ro + rd * t; if (p.y < 0.0) continue;
          float e = soft(a, uWin.x, uWin.y, 0.16) * soft(b, uWin.z, uWin.w, 0.14);
          float mun = (1.0 - 0.75 * (1.0 - smoothstep(0.02, 0.06, abs(a)))) * (1.0 - 0.75 * (1.0 - smoothstep(0.02, 0.06, abs(b - (uWin.z + (uWin.w - uWin.z) * 0.62)))));
          float streak = 0.72 + 0.28 * sin(a * 21.0 + b * 6.0) * sin(a * 7.3 - b * 3.1 + 1.7);
          acc += e * mun * streak * exp(-s * 0.32);
        }
        acc *= dt * uI * 0.55;
        gl_FragColor = vec4(uColor * acc, 1.0);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.renderOrder = 5;
  return { mesh, geo, mat };
}
// soft additive glow sprite (lamp bloom, screen halo)
let _glowTex = null;
export function glowSprite(color = 0xffd9a0, size = 0.5) {
  if (!_glowTex) _glowTex = canvasTex(128, 128, (ctx) => { const rg = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.2, 'rgba(255,255,255,.45)'); rg.addColorStop(0.55, 'rgba(255,255,255,.1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, 128, 128); }).tex;
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.scale.setScalar(size); return m;
}
