// world.js — the investigation room: an August afternoon. Built once; film.js poses it per frame.
// Metres. Floor y=0, back wall z=0 (the cork board hangs on it), the camera lives at z>0.
import * as THREE from 'three';
import { rng } from './stage.js';
import { canvasTex, noise, paper, block, F, NOTEXT } from './paper.js';
import { UI } from './content.js';

export const ROOM = { x0: -2.75, x1: 3.2, z1: 5.2, H: 3.0 };
export const WIN = { x: -2.75, z0: 0.95, z1: 2.45, y0: 0.95, y1: 2.5 };
export const DESK = { x0: -2.2, x1: 2.25, z0: 0.12, z1: 0.92, y: 0.76 };
export const MON = { x: 0.0, z: 0.46, w: 0.595, h: 0.335, cy: 1.07 };
export const M = {};
const std = o => new THREE.MeshStandardMaterial(o);
const lam = o => new THREE.MeshLambertMaterial(o);
function box(w, h, d, mat, x, y, z, parent, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, mat, seg, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }

function woodTex(seed, tone, planks, w = 1024, h = 1024, grainDir = 'h') {
  return canvasTex(w, h, (ctx) => {
    noise(ctx, w, h, tone, 18, seed);
    const r = rng(seed + 3);
    const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const k = 0.85 + r() * 0.3;
      ctx.fillStyle = `rgba(${tone[0] * k | 0},${tone[1] * k | 0},${tone[2] * k | 0},.45)`; ctx.fillRect(0, p * ph, w, ph);
      for (let i = 0; i < 26; i++) { ctx.strokeStyle = `rgba(30,15,5,${0.05 + r() * 0.12})`; ctx.lineWidth = 1 + r() * 2.5; ctx.beginPath(); const y = p * ph + r() * ph; ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + r() * 10 - 5, w * 0.7, y + r() * 10 - 5, w, y + r() * 6 - 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,10,4,.55)'; ctx.fillRect(0, p * ph, w, 2.5);
      const off = r() * w; ctx.fillRect(off, p * ph, 2.5, ph);
    }
  }, { repeat: [1, 1], aniso: 4 });
}
function plasterTex(seed, base) {
  return canvasTex(512, 512, (ctx, w, h) => {
    noise(ctx, w, h, base, 10, seed);
    const r = rng(seed + 9);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '255,250,240' : '90,70,50'},${0.02 + r() * 0.04})`; ctx.beginPath(); ctx.arc(r() * w, r() * h, 6 + r() * 30, 0, 7); ctx.fill(); }
  }, { repeat: [4, 2] });
}
function skyTex() {   // what you see through the blinds: a hot August afternoon
  return canvasTex(1024, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9cc6ea'); g.addColorStop(0.55, '#d7e7ee'); g.addColorStop(1, '#f6edd0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const sg = ctx.createRadialGradient(w * 0.2, h * 0.18, 4, w * 0.2, h * 0.18, w * 0.55); sg.addColorStop(0, 'rgba(255,252,236,1)'); sg.addColorStop(0.25, 'rgba(255,246,214,.75)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    const r = rng(41);
    ctx.fillStyle = 'rgba(160,175,170,.5)'; ctx.beginPath(); ctx.moveTo(0, h);   // far hills
    for (let x = 0; x <= w; x += 12) ctx.lineTo(x, h * 0.66 - Math.sin(x * 0.01) * 26 - r() * 6); ctx.lineTo(w, h); ctx.fill();
    for (let i = 0; i < 11; i++) {   // summer trees, sun-lit
      const tx = (i + r() * 0.8) * w / 9 - 40, tb = h * (0.9 + r() * 0.08), tr = 50 + r() * 60;
      ctx.fillStyle = '#4b3a28'; ctx.fillRect(tx - 6, tb - tr, 12, tr + 40);
      for (let b = 0; b < 22; b++) { const c = ['#4f8a3e', '#69a24b', '#3f7333', '#86b95a', '#5c9644'][Math.floor(r() * 5)]; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tx + (r() - 0.5) * tr * 1.7, tb - tr - r() * tr * 1.4, tr * (0.3 + r() * 0.4), 0, 7); ctx.fill(); }
    }
  }, { nomip: true });
}

export function buildWorld(scene) {
  const W = new THREE.Group(); scene.add(W);
  M.plaster = lam({ map: plasterTex(5, [214, 200, 178]), color: 0xffffff });
  M.plasterSide = lam({ map: plasterTex(6, [206, 192, 170]), color: 0xffffff });
  M.ceil = lam({ color: 0xe9e1d2 });
  M.floor = std({ map: woodTex(11, [118, 78, 48], 10), roughness: 0.62, metalness: 0.0 }); M.floor.map.repeat.set(4, 3);
  M.deskWood = std({ map: woodTex(21, [126, 84, 50], 3, 1024, 512), roughness: 0.48 });
  M.frame = std({ map: woodTex(31, [92, 60, 36], 2, 512, 128), roughness: 0.55 });
  M.paintWhite = std({ color: 0xf1ece2, roughness: 0.6 });
  M.dark = std({ color: 0x1b1c1f, roughness: 0.45, metalness: 0.3 });
  M.alu = std({ color: 0x9a9da3, roughness: 0.35, metalness: 0.75 });
  M.lampGreen = std({ color: 0x2f4a3a, roughness: 0.35, metalness: 0.4 });
  M.brass = std({ color: 0xb8913f, roughness: 0.32, metalness: 0.85 });
  M.slat = std({ color: 0xf0e9dc, roughness: 0.55, side: THREE.DoubleSide });
  M.shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

  const { x0, x1, z1, H } = ROOM;
  // floor, back wall, ceiling, right wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, z1 / 2); floor.receiveShadow = true; W.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, H), M.plaster); back.position.set(0, H / 2, 0); back.receiveShadow = true; W.add(back);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, z1 / 2); ceil.castShadow = true; W.add(ceil);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(z1, H), M.plasterSide); right.rotation.y = -Math.PI / 2; right.position.set(x1, H / 2, z1 / 2); right.receiveShadow = true; W.add(right);
  // skirting board
  box(x1 - x0, 0.09, 0.015, M.paintWhite, 0, 0.045, 0.008, W, false);
  // left wall with the window opening (4 slabs around the hole) — casts the sun's shadow
  const lw = (y0, y1, za, zb) => { const m = box(0.14, y1 - y0, zb - za, M.plasterSide, x0 - 0.07, (y0 + y1) / 2, (za + zb) / 2, W); return m; };
  lw(0, WIN.y0, 0, z1); lw(WIN.y1, H, 0, z1); lw(WIN.y0, WIN.y1, 0, WIN.z0); lw(WIN.y0, WIN.y1, WIN.z1, z1);
  // invisible front wall + roof so the sun only enters through the window
  // window frame, sill, glass, the outside
  const wf = M.paintWhite, wz = (WIN.z0 + WIN.z1) / 2, wl = WIN.z1 - WIN.z0, wh = WIN.y1 - WIN.y0;
  box(0.16, 0.05, wl + 0.1, wf, x0 + 0.01, WIN.y1 + 0.025, wz, W); box(0.24, 0.04, wl + 0.16, wf, x0 + 0.05, WIN.y0 - 0.02, wz, W);
  box(0.16, wh, 0.05, wf, x0 + 0.01, (WIN.y0 + WIN.y1) / 2, WIN.z0 - 0.025, W); box(0.16, wh, 0.05, wf, x0 + 0.01, (WIN.y0 + WIN.y1) / 2, WIN.z1 + 0.025, W);
  box(0.06, wh, 0.035, wf, x0 - 0.02, (WIN.y0 + WIN.y1) / 2, wz, W, false);   // mullion
  box(0.06, 0.035, wl, wf, x0 - 0.02, WIN.y0 + wh * 0.62, wz, W, false);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: false }));
  sky.rotation.y = Math.PI / 2; sky.position.set(x0 - 3.2, 1.7, wz); W.add(sky); M.sky = sky.material;
  // venetian blinds: slats rotate about their long axis (z)
  const slats = []; const NS = 30;
  for (let i = 0; i < NS; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.0035, wl - 0.02), M.slat);
    m.position.set(x0 + 0.12, WIN.y1 - 0.03 - i * ((wh - 0.06) / (NS - 1)), wz); m.castShadow = true; m.receiveShadow = true; W.add(m); slats.push(m);
  }
  box(0.08, 0.05, wl, M.slat, x0 + 0.12, WIN.y1 - 0.005, wz, W);   // head rail
  for (const dz of [-0.35, 0.35]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, wh, 4), M.slat); c.position.set(x0 + 0.12, (WIN.y0 + WIN.y1) / 2, wz + dz); W.add(c); }

  // desk
  const D = DESK, dw = D.x1 - D.x0, dd = D.z1 - D.z0, dcx = (D.x0 + D.x1) / 2, dcz = (D.z0 + D.z1) / 2;
  M.deskWood.map.repeat.set(2, 1);
  box(dw, 0.04, dd, M.deskWood, dcx, D.y - 0.02, dcz, W);
  for (const sx of [D.x0 + 0.05, D.x1 - 0.05]) for (const sz of [D.z0 + 0.05, D.z1 - 0.05]) box(0.05, D.y - 0.04, 0.05, M.deskWood, sx, (D.y - 0.04) / 2, sz, W);
  box(dw - 0.1, 0.09, 0.02, M.deskWood, dcx, D.y - 0.085, D.z1 - 0.04, W);
  box(0.5, 0.2, dd - 0.06, M.deskWood, D.x1 - 0.32, D.y - 0.14, dcz, W);   // drawer unit
  box(0.16, 0.015, 0.012, M.brass, D.x1 - 0.32, D.y - 0.12, D.z1 - 0.015, W);

  // monitor (screen texture is set by film.js)
  const mon = new THREE.Group(); mon.position.set(MON.x, D.y, MON.z); W.add(mon);
  box(0.24, 0.012, 0.18, M.dark, 0, 0.006, 0, mon); box(0.035, 0.24, 0.03, M.dark, 0, 0.13, -0.03, mon);
  box(MON.w + 0.024, MON.h + 0.024, 0.024, M.dark, 0, MON.cy - D.y, 0, mon);
  const scrMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(MON.w, MON.h), scrMat); scr.position.set(0, MON.cy - D.y, 0.0125); mon.add(scr);
  // keyboard + mouse
  box(0.42, 0.016, 0.13, M.dark, 0.02, D.y + 0.008, 0.76, W);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.11), std({ color: 0x2b2c30, roughness: 0.7 })); keys.rotation.x = -Math.PI / 2; keys.position.set(0.02, D.y + 0.0165, 0.76); W.add(keys);
  box(0.06, 0.02, 0.1, M.dark, 0.34, D.y + 0.01, 0.77, W);

  // architect desk lamp (left): base, two arms, conical shade
  const lamp = new THREE.Group(); lamp.position.set(-1.98, D.y, 0.34); W.add(lamp);
  cyl(0.08, 0.09, 0.025, M.lampGreen, 24, lamp).position.y = 0.012;
  const a1 = cyl(0.009, 0.009, 0.24, M.alu, 8, lamp); a1.position.set(0.04, 0.12, 0.02); a1.rotation.z = -0.35;
  const a2 = cyl(0.009, 0.009, 0.3, M.alu, 8, lamp); a2.position.set(0.2, 0.24, 0.08); a2.rotation.z = 1.3; a2.rotation.y = -0.2;
  const head = new THREE.Group(); head.position.set(0.35, 0.2, 0.13); lamp.add(head);
  const shade = cyl(0.035, 0.1, 0.13, M.lampGreen, 24, head); shade.rotation.z = 0.9; shade.material = M.lampGreen;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.097, 0.128, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, side: THREE.BackSide, toneMapped: false })); inner.rotation.z = 0.9; head.add(inner);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false })); bulb.position.set(0.035, -0.03, 0); head.add(bulb);
  M.lampInner = inner.material; M.lampBulb = bulb.material;

  // the work light: an adjustable spot clamped on a ceiling track, aims at the case being read
  const track = box(4.4, 0.03, 0.05, M.dark, 0, H - 0.03, 1.05, W, false);
  const spot = new THREE.Group(); spot.position.set(0, H - 0.06, 1.05); W.add(spot);
  const stem = cyl(0.01, 0.01, 0.16, M.dark, 8, spot); stem.position.y = -0.08;
  const can = new THREE.Group(); can.position.y = -0.17; spot.add(can);
  const canMesh = cyl(0.045, 0.06, 0.16, M.dark, 20, can); canMesh.rotation.x = Math.PI / 2; canMesh.position.z = 0.0;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), new THREE.MeshBasicMaterial({ color: 0xfff1d2, toneMapped: false })); lens.position.z = 0.081; can.add(lens);
  M.spotLens = lens.material;

  // glass of iced barley tea with condensation
  const glass = new THREE.Group(); glass.position.set(0.66, D.y, 0.66); W.add(glass);
  const gmat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.28, metalness: 0, side: THREE.DoubleSide });
  const g1 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.13, 24, 1, true), gmat); g1.position.y = 0.065; glass.add(g1);
  const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 24), new THREE.MeshStandardMaterial({ color: 0x9a5a1c, roughness: 0.15, transparent: true, opacity: 0.82 })); tea.position.y = 0.047; glass.add(tea);
  const ice = std({ color: 0xf4f6f4, roughness: 0.1, transparent: true, opacity: 0.7 });
  for (const [dx, dz, ry] of [[0.01, 0.006, 0.4], [-0.012, -0.004, 1.1]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.024), ice); c.position.set(dx, 0.09, dz); c.rotation.set(0.3, ry, 0.2); glass.add(c); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0x3a2412, transparent: true, opacity: 0.22 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0.05, 0.001, 0.03); glass.add(ring);
  // red yarn spool, pin tin, folders
  const sp = cyl(0.04, 0.04, 0.07, std({ color: 0x9c1a14, roughness: 0.85 }), 20, W); sp.rotation.z = Math.PI / 2; sp.position.set(-0.6, D.y + 0.04, 0.74);
  const tin = cyl(0.045, 0.045, 0.025, M.alu, 24, W); tin.position.set(1.0, D.y + 0.0125, 0.74);
  const r = rng(77);
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), std({ color: [0xc0281f, 0xc9a44a, 0x2a6fb0][i % 3], roughness: 0.35 })); p.position.set(1.0 + (r() - 0.5) * 0.06, D.y + 0.03, 0.74 + (r() - 0.5) * 0.06); W.add(p); }
  const folderMat = std({ color: 0xc9a46a, roughness: 0.8 });
  for (let i = 0; i < 3; i++) { const f = box(0.34, 0.006, 0.25, folderMat, -1.05 + i * 0.01, D.y + 0.003 + i * 0.007, 0.66 - i * 0.01, W); f.rotation.y = (r() - 0.5) * 0.2; }

  // desk fan (August): base, neck, cage ring, blades (blades spin in film.js)
  const fan = new THREE.Group(); fan.position.set(2.62, 0, 1.15); fan.rotation.y = -0.75; W.add(fan);
  cyl(0.14, 0.16, 0.03, M.paintWhite, 24, fan).position.y = 0.015;
  cyl(0.014, 0.014, 0.95, M.paintWhite, 8, fan).position.y = 0.49;
  const fanHead = new THREE.Group(); fanHead.position.set(0, 1.0, 0.0); fanHead.scale.setScalar(1.35); fan.add(fanHead);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.004, 6, 40), M.paintWhite); fanHead.add(cage);
  for (let k = 0; k < 8; k++) { const sp2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.002, 0.002), M.paintWhite); sp2.rotation.z = k * Math.PI / 8; sp2.position.z = 0.02; fanHead.add(sp2); }
  const blades = new THREE.Group(); fanHead.add(blades);
  const bmat = std({ color: 0xbfd9e6, roughness: 0.4, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12, 0, 0.9), bmat); b.rotation.z = k * 2.094; blades.add(b); }
  cyl(0.025, 0.025, 0.05, M.paintWhite, 12, fanHead).rotation.x = Math.PI / 2;

  // chair in front of the desk
  const chair = new THREE.Group(); chair.position.set(0.55, 0, 1.55); chair.rotation.y = 0.35; W.add(chair);
  const cw = M.deskWood;
  box(0.46, 0.04, 0.44, cw, 0, 0.46, 0, chair); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.035, 0.46, 0.035, cw, sx * 0.2, 0.23, sz * 0.19, chair);
  for (const sx of [-1, 1]) box(0.035, 0.5, 0.035, cw, sx * 0.2, 0.72, 0.19, chair); box(0.44, 0.16, 0.025, cw, 0, 0.86, 0.19, chair);
  // a pothos by the window
  const pot = cyl(0.11, 0.09, 0.22, std({ color: 0xa8573a, roughness: 0.8 }), 20, W); pot.position.set(-2.4, 0.11, 2.95);
  const leafM = std({ color: 0x3d7a37, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.06 + r() * 0.03, 8), leafM); const a = r() * 6.28, rr = r() * 0.22; l.position.set(-2.4 + Math.cos(a) * rr, 0.26 + r() * 0.45, 2.95 + Math.sin(a) * rr); l.rotation.set(r() * 3, r() * 3, r() * 3); l.castShadow = true; W.add(l); }
  // bookshelf on the right wall
  const shelf = new THREE.Group(); shelf.position.set(3.02, 0, 2.2); shelf.rotation.y = -Math.PI / 2; W.add(shelf);
  for (const y of [0.02, 0.45, 0.9, 1.35, 1.8]) box(1.0, 0.025, 0.3, M.frame, 0, y, 0, shelf);
  for (const sx of [-0.5, 0.5]) box(0.025, 1.82, 0.3, M.frame, sx, 0.91, 0, shelf);
  for (const y of [0.04, 0.47, 0.92, 1.37]) { let x = -0.46; while (x < 0.42) { const bw = 0.025 + r() * 0.035, bh = 0.24 + r() * 0.14; const c = new THREE.Color().setHSL(r(), 0.3 + r() * 0.3, 0.3 + r() * 0.3); box(bw, bh, 0.2, std({ color: c, roughness: 0.8 }), x + bw / 2, y + bh / 2 + 0.012, 0.02, shelf); x += bw + 0.004; } }

  return { W, slats, scr, scrMat, lamp, lampHead: head, spot, spotCan: can, blades, sky, fanHead };
}

// the intro folder on the desk: a kraft case file with a typed label
export function introFolder(W) {
  const D = DESK;
  const tex = canvasTex(1400, 1000, (ctx, w, h) => {
    paper(ctx, w, h, [196, 160, 104], 3, { edge: 0.2 });
    ctx.fillStyle = 'rgba(80,50,20,.25)'; ctx.fillRect(0, 0, w, 6);
    // label plate
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(140, 210, w - 280, 560);
    ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 3; ctx.strokeRect(140, 210, w - 280, 560);
    block(ctx, UI.folderDate, 200, 250, w - 400, { size: 54, weight: 700, family: F.sans, color: '#3a2a1c' });
    block(ctx, UI.notice, 200, 400, w - 400, { size: 64, weight: 500, family: F.sans, color: '#241a12' });
    block(ctx, UI.pause, 200, 560, w - 400, { size: 64, weight: 500, family: F.sans, color: '#241a12' });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), std({ map: tex, roughness: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = 0.06; m.position.set(-1.42, D.y + 0.004, 0.6); m.receiveShadow = true; W.add(m);
  return m;
}
