// cards.js — the cork board, every card / photo / copy on it, pins and red yarn.
import * as THREE from 'three';
import { rng } from './stage.js';
import * as D from './content.js';
import { canvasTex, noise, paper, block, measure, fit, text1, stamp, roundRect, loadSvg, F, NOTEXT } from './paper.js';

const PPM = 2300;                     // texture pixels per metre on the board
export const B = D.BOARD;
export const CORKZ = 0.032;           // cork surface (board hangs 3 cm off the wall)
const px = m => Math.round(m * PPM);
export function cardXY(c) { if (!c.zone) return [c.x, c.y]; const z = D.ZONES[c.zone]; return [z.cx + c.x, z.cy + c.y]; }
export const toWorld = (x, y, dz = 0) => new THREE.Vector3(x, B.cy + y, CORKZ + dz);

// ---------------------------------------------------------------- materials
const pinGeo = new THREE.SphereGeometry(0.0075, 10, 8);
const pinNeedle = new THREE.CylinderGeometry(0.0012, 0.0012, 0.016, 4);
const PINM = {
  red: new THREE.MeshStandardMaterial({ color: 0xc0281f, roughness: 0.32, metalness: 0.1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a44a, roughness: 0.3, metalness: 0.75 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2c5f9e, roughness: 0.32, metalness: 0.1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.3, metalness: 0.5 }),
};
function makePin(kind = 'red', big = false) {
  const g = new THREE.Group();
  const h = new THREE.Mesh(pinGeo, PINM[kind]); h.position.z = 0.012; h.castShadow = true; if (big) h.scale.setScalar(1.7);
  const n = new THREE.Mesh(pinNeedle, PINM.dark); n.rotation.x = Math.PI / 2; n.position.z = 0.004;
  g.add(h, n); return g;
}

// ---------------------------------------------------------------- card faces
const INK = '#211b15', INK2 = '#4a4036', RED = '#b3261e';
const SVGIMG = {};
function faceFor(c, side = 'front') {
  const s = c.kind === 'photo' ? PPM * 2.2 : PPM;
  const W = Math.round(c.w * s), H = Math.round(c.h * s);
  const seed = [...c.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  return canvasTex(W, H, (ctx) => {
    const k = c.kind;
    if (k === 'title') {
      paper(ctx, W, H, [238, 230, 212], seed, { edge: 0.08 });
      ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 0, W, 0.012 * s);
      const f = fit(ctx, c.text, W - 0.06 * s, H - 0.03 * s, { size: 0.032 * s, weight: 700, color: INK });
      block(ctx, c.text, 0.03 * s, (H - f.size * 1.3) / 2 + 0.004 * s, W - 0.06 * s, { ...f, align: 'center' });
    } else if (k === 'case') {
      paper(ctx, W, H, [241, 233, 214], seed, { edge: 0.1 });
      ctx.fillStyle = '#a3221b'; ctx.fillRect(0, 0, W, 0.008 * s);
      const lab = c.label; ctx.font = `700 ${0.021 * s}px ${F.sans}`; const lw = ctx.measureText(lab).width + 0.024 * s;
      ctx.fillStyle = '#a3221b'; ctx.fillRect(0.022 * s, 0.018 * s, lw, 0.032 * s);
      text1(ctx, lab, 0.022 * s + 0.012 * s, 0.022 * s, { size: 0.021 * s, weight: 700, color: '#fbeee2' });
      const top = 0.06 * s, size = (c.small ? 0.026 : 0.033) * s;
      const f = fit(ctx, c.text, W - 0.05 * s, H - top - (c.sub ? 0.03 : 0.012) * s, { size, weight: 700, color: INK, lh: 1.25 });
      block(ctx, c.text, 0.024 * s, top, W - 0.05 * s, f);
      if (c.sub) text1(ctx, c.sub, W - 0.024 * s, H - 0.03 * s, { size: 0.018 * s, weight: 500, color: INK2, align: 'right', family: F.inter });
    } else if (k === 'ctx') {
      ctx.fillStyle = '#f2d77a'; ctx.fillRect(0, 0, W, H); paper(ctx, W, H, [242, 215, 122], seed, { edge: 0.12 });
      text1(ctx, D.UI.contextHead, 0.02 * s, 0.016 * s, { size: 0.015 * s, color: 'rgba(80,60,20,.75)', weight: 500 });
      const f = fit(ctx, c.text, W - 0.04 * s, H - 0.05 * s, { size: 0.024 * s, family: F.hand, color: '#2d2410', lh: 1.32 });
      block(ctx, c.text, 0.02 * s, 0.045 * s, W - 0.04 * s, f);
    } else if (k === 'note' || k === 'def' || k === 'tag' || k === 'quote' || k === 'clue') {
      const base = k === 'def' ? [222, 230, 236] : k === 'quote' ? [240, 236, 226] : k === 'clue' ? [234, 226, 208] : [246, 242, 232];
      paper(ctx, W, H, base, seed, { edge: 0.1 });
      if (k === 'note' && !c.red) { ctx.strokeStyle = 'rgba(200,70,60,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0.016 * s); ctx.lineTo(W, 0.016 * s); ctx.stroke(); }
      if (c.red) { ctx.fillStyle = RED; ctx.fillRect(0, 0, 0.008 * s, H); }
      if (k === 'def') { ctx.fillStyle = '#5b7d96'; ctx.fillRect(0, 0, 0.007 * s, H); }
      if (c.hot) { ctx.strokeStyle = 'rgba(160,110,20,.8)'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, W - 10, H - 10); }
      const fam = k === 'quote' ? F.hand : k === 'tag' ? F.sans : F.sans;
      const size = (k === 'clue' ? 0.022 : k === 'tag' ? 0.02 : k === 'quote' ? 0.022 : 0.021) * s;
      let top = 0.016 * s;
      if (c.label) { text1(ctx, c.label, 0.018 * s, 0.012 * s, { size: 0.014 * s, color: INK2, weight: 500 }); top = 0.034 * s; }
      const f = fit(ctx, c.text, W - 0.036 * s, H - top - 0.012 * s, { size, weight: k === 'clue' || k === 'tag' ? 700 : 500, family: fam, color: c.dim ? INK2 : INK, lh: 1.3 });
      const th = measure(ctx, c.text, W - 0.036 * s, f);
      const y = k === 'clue' || k === 'tag' ? Math.max(top, (H - th) / 2 + (c.label ? 0.008 * s : 0)) : top + Math.max(0, (H - top - 0.012 * s - th) / 2);
      block(ctx, c.text, 0.018 * s + (c.red ? 0.006 * s : 0), y, W - 0.036 * s - (c.red ? 0.006 * s : 0), { ...f, align: k === 'clue' || k === 'tag' ? 'center' : 'left' });
    } else if (k === 'rule') {
      paper(ctx, W, H, [236, 200, 106], seed, { edge: 0.14 });
      let top = 0.012 * s;
      if (c.label) { text1(ctx, c.label, 0.018 * s, 0.01 * s, { size: 0.014 * s, color: 'rgba(80,50,10,.8)', weight: 700 }); top = 0.03 * s; }
      const f = fit(ctx, c.text, W - 0.036 * s, H - top - 0.01 * s, { size: 0.022 * s, weight: 700, color: '#2a1c08', lh: 1.28 });
      const th = measure(ctx, c.text, W - 0.036 * s, f);
      block(ctx, c.text, 0.018 * s, top + Math.max(0, (H - top - 0.01 * s - th) / 2), W - 0.036 * s, f);
    } else if (k === 'open') {
      ctx.fillStyle = '#17181b'; ctx.fillRect(0, 0, W, H);
      ctx.setLineDash([0.012 * s, 0.008 * s]); ctx.strokeStyle = 'rgba(240,200,120,.75)'; ctx.lineWidth = 0.0025 * s; ctx.strokeRect(0.008 * s, 0.008 * s, W - 0.016 * s, H - 0.016 * s); ctx.setLineDash([]);
      text1(ctx, D.UI.openHead, 0.022 * s, 0.018 * s, { size: 0.015 * s, color: 'rgba(240,200,120,.95)', weight: 700 });
      const f = fit(ctx, c.text, W - 0.044 * s, H - 0.05 * s, { size: (c.short ? 0.024 : 0.0185) * s, weight: c.short ? 700 : 400, color: '#f1ece2', lh: 1.38 });
      block(ctx, c.text, 0.022 * s, 0.042 * s, W - 0.044 * s, f);
    } else if (k === 'gate') {
      paper(ctx, W, H, [244, 239, 226], seed, { edge: 0.1 });
      ctx.fillStyle = '#26303a'; ctx.fillRect(0, 0, W, 0.01 * s);
      text1(ctx, c.n, 0.016 * s, 0.018 * s, { size: 0.036 * s, weight: 700, color: '#a3221b', keep: true });
      text1(ctx, c.text, 0.062 * s, 0.024 * s, { size: 0.026 * s, weight: 700, color: INK });
      const f = fit(ctx, c.sub, W - 0.03 * s, 0.04 * s, { size: 0.017 * s, weight: 500, color: '#7a2a20' });
      block(ctx, c.sub, 0.016 * s, 0.07 * s, W - 0.03 * s, f);
    } else if (k === 'file') {
      // kraft case file with a tab
      ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, W, H);
      paper(ctx, W, H, [205, 170, 112], seed, { edge: 0.18 });
      ctx.fillStyle = 'rgba(90,60,25,.25)'; ctx.fillRect(0, 0, W, 0.006 * s);
      const pad = 0.022 * s;
      const f = fit(ctx, c.title, W - pad * 2 - (c.stamp ? 0.11 * s : 0), 0.07 * s, { size: 0.022 * s, weight: 700, color: '#2a1d10', lh: 1.25 });
      let y = 0.016 * s + block(ctx, c.title, pad, 0.016 * s, W - pad * 2 - (c.stamp ? 0.11 * s : 0), f) + 0.008 * s;
      if (c.sub) { y += block(ctx, c.sub, pad, y, W - pad * 2, { size: 0.016 * s, weight: 500, color: '#4a3520' }) + 0.004 * s; }
      // the evidence sheet inside the folder
      const lh = c.risks ? 0.052 * s : 0.04 * s;
      if (c.risks) c.riskTop = (y + 0.014 * s + 0.012 * s) / s;   // where the yarn ties on (metres from the card top)
      if (c.lines.length) {
        ctx.fillStyle = '#f4efe3'; ctx.fillRect(pad * 0.6, y, W - pad * 1.2, H - y - pad * 0.6);
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(pad * 0.6, y, W - pad * 1.2, 3);
        c.lines.forEach((l, i) => {
          const yy = y + 0.014 * s + i * lh;
          if (c.risks) { ctx.fillStyle = RED; ctx.fillRect(pad, yy + 0.002 * s, 0.006 * s, 0.03 * s); }
          const isT = /^\d\d:\d\d/.test(l);
          if (isT) { text1(ctx, l.slice(0, 5), pad + 0.01 * s, yy, { size: 0.02 * s, weight: 700, color: '#7a2318', family: F.mono, keep: false }); text1(ctx, l.slice(6).trim(), pad + 0.095 * s, yy, { size: 0.02 * s, weight: 500, color: INK }); }
          else text1(ctx, l, pad + (c.risks ? 0.016 : 0.01) * s, yy, { size: (c.risks ? 0.02 : 0.02) * s, weight: c.risks ? 700 : 500, color: INK });
        });
      }
      if (c.stamp) stamp(ctx, c.stamp, W - 0.075 * s, 0.045 * s, 0.022 * s, -0.12);
    } else if (k === 'copy') {
      paper(ctx, W, H, [248, 246, 240], seed, { edge: 0.06 });
      const pad = 0.018 * s;
      let y = 0.014 * s;
      const f = fit(ctx, c.title, W - pad * 2, 0.05 * s, { size: 0.018 * s, weight: 700, color: INK });
      y += block(ctx, c.title, pad, y, W - pad * 2, f) + 0.008 * s;
      if (c.code) {
        const cs = fit(ctx, c.code.reduce((a, l) => a.length > l.length ? a : l, ''), W - pad * 2.6, 0.03 * s, { size: 0.0165 * s, family: F.mono }).size;
        ctx.fillStyle = '#1e2229'; ctx.fillRect(pad * 0.7, y, W - pad * 1.4, Math.min(H - y - pad * 0.6, c.code.length * cs * 1.45 + 0.018 * s));
        c.code.forEach((l, i) => text1(ctx, l, pad * 1.3, y + 0.012 * s + i * cs * 1.45, { size: cs, family: F.mono, color: '#d9e3ee' }));
      }
      if (c.rowsTxt) {
        const rh = (H - y - pad * 0.5) / c.rowsTxt.length;
        c.rowsTxt.forEach((r, i) => {
          const yy = y + i * rh;
          ctx.strokeStyle = 'rgba(40,30,20,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke();
          const hot = /205|gate/.test(r[1] + r[0]);
          text1(ctx, r[0], pad, yy + rh * 0.24, { size: 0.0185 * s, weight: 700, color: hot ? '#a3221b' : INK2 });
          const ff = fit(ctx, r[1], W * 0.64 - pad, rh * 0.8, { size: 0.0195 * s, weight: 700, color: hot ? '#a3221b' : INK, family: /\d/.test(r[1]) ? F.inter : F.sans });
          text1(ctx, r[1], W * 0.36, yy + rh * 0.24, ff);
        });
      }
      if (c.layers) {
        const rh = (H - y - pad * 0.5) / c.layers.length;
        c.layers.forEach((L, i) => {
          const yy = y + i * rh, tint = [[226, 236, 246], [236, 244, 228], [246, 232, 222]][i];
          ctx.fillStyle = `rgb(${tint.join(',')})`; ctx.fillRect(pad * 0.6, yy + 3, W - pad * 1.2, rh - 6);
          text1(ctx, L[0], pad, yy + rh * 0.12, { size: 0.0185 * s, weight: 700, color: '#7a2318' });
          text1(ctx, L[1], pad + 0.15 * s, yy + rh * 0.12, { size: 0.0185 * s, weight: 700, color: INK });
          const ff = fit(ctx, L[2], W - pad * 2.2, rh * 0.4, { size: 0.0145 * s, family: F.mono, color: '#2b3540' });
          text1(ctx, L[2], pad, yy + rh * 0.56, ff);
        });
      }
    } else if (k === 'q') {
      if (side === 'front') {
        ctx.fillStyle = '#1d2433'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(240,220,170,.6)'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, W - 16, H - 16);
        text1(ctx, D.UI.questionMark, W - 0.05 * s, H - 0.075 * s, { size: 0.06 * s, weight: 700, color: 'rgba(240,200,120,.85)', keep: true });
        text1(ctx, D.UI.recallHead, 0.022 * s, 0.018 * s, { size: 0.015 * s, color: 'rgba(240,200,120,.9)', weight: 700 });
        const f = fit(ctx, c.q, W - 0.08 * s, H - 0.06 * s, { size: 0.026 * s, weight: 700, color: '#f4ecdf', lh: 1.32 });
        block(ctx, c.q, 0.022 * s, 0.045 * s, W - 0.08 * s, f);
      } else {
        paper(ctx, W, H, [244, 238, 222], seed + 1, { edge: 0.1 });
        ctx.fillStyle = '#2f6b3d'; ctx.fillRect(0, 0, W, 0.008 * s);
        text1(ctx, D.UI.revealHead, 0.022 * s, 0.016 * s, { size: 0.015 * s, color: '#2f6b3d', weight: 700 });
        const f = fit(ctx, c.a, W - 0.044 * s, H - 0.085 * s, { size: 0.02 * s, weight: 700, color: INK, lh: 1.32 });
        block(ctx, c.a, 0.022 * s, 0.04 * s, W - 0.044 * s, f);
        const fs = fit(ctx, c.src, W - 0.044 * s, 0.03 * s, { size: 0.0135 * s, weight: 400, color: INK2 });
        block(ctx, c.src, 0.022 * s, H - 0.034 * s, W - 0.044 * s, fs);
      }
    } else if (k === 'strip') {
      const col = c.blue ? [214, 228, 244] : [218, 238, 222];
      paper(ctx, W, H, col, seed, { edge: 0.12 });
      ctx.fillStyle = c.blue ? '#2c5f9e' : '#2f7a45'; ctx.fillRect(0, 0, W, 0.008 * s);
      const f = fit(ctx, c.text, W - 0.03 * s, H - 0.04 * s, { size: 0.026 * s, weight: 700, color: c.blue ? '#1d3f6b' : '#1f5230', lh: 1.35 });
      const th = measure(ctx, c.text, W - 0.03 * s, f);
      block(ctx, c.text, 0.015 * s, (H - th) / 2, W - 0.03 * s, { ...f, align: 'center' });
    } else if (k === 'photo') {
      // a glossy print with a white border; the note's own figure inside
      ctx.fillStyle = '#f5f3ee'; ctx.fillRect(0, 0, W, H);
      const b = 0.012 * s, img = SVGIMG[c.src];
      if (img) ctx.drawImage(img, b, b, W - b * 2, H - b * 2 - 0.016 * s);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(b, b, W - b * 2, (H - b * 2) * 0.4);
      text1(ctx, c.caption, W - b, H - 0.0175 * s, { size: 0.012 * s, color: '#5a5048', align: 'right', weight: 500 });
    } else if (k === 'link') {
      paper(ctx, W, H, [214, 186, 140], seed, { edge: 0.16 });
      ctx.fillStyle = 'rgba(60,40,20,.5)'; ctx.beginPath(); ctx.arc(0.02 * s, H / 2, 0.006 * s, 0, 7); ctx.fill();
      text1(ctx, c.dir, 0.036 * s, 0.012 * s, { size: 0.018 * s, weight: 700, color: '#8c1c14' });
      const f = fit(ctx, c.text, W - 0.05 * s, H - 0.046 * s, { size: 0.0165 * s, weight: 500, color: INK, lh: 1.32 });
      block(ctx, c.text, 0.036 * s, 0.038 * s, W - 0.05 * s, f);
    } else if (k === 'tline') {
      paper(ctx, W, H, [244, 239, 227], seed, { edge: 0.06 });
      ctx.fillStyle = 'rgba(179,38,30,.85)'; ctx.fillRect(0, 0, 0.006 * s, H);
      const tm = c.text.slice(0, 5), rest = c.text.slice(6).trim();
      text1(ctx, tm, 0.018 * s, H / 2 - 0.011 * s, { size: 0.02 * s, weight: 700, color: '#7a2318', family: F.mono });
      const f = fit(ctx, rest, W - 0.12 * s, H - 0.012 * s, { size: 0.0185 * s, weight: 700, color: INK, lh: 1.25 });
      const th = measure(ctx, rest, W - 0.12 * s, f);
      block(ctx, rest, 0.105 * s, (H - th) / 2, W - 0.12 * s, f);
    } else if (k === 'cell') {
      paper(ctx, W, H, c.tone || [250, 248, 241], seed, { edge: 0.06 });
      const mono = /[\[\]\/]|KV|bcrypt|AspNet|Identity|middleware|NextAuth/.test(c.text);
      const f = fit(ctx, c.text, W - 0.02 * s, H - 0.014 * s, { size: 0.0175 * s, weight: 600, color: INK, lh: 1.25, family: F.sans });
      const th = measure(ctx, c.text, W - 0.02 * s, f);
      block(ctx, c.text, 0.01 * s, (H - th) / 2, W - 0.02 * s, { ...f, align: 'center' });
    } else if (k === 'grid') {
      paper(ctx, W, H, [247, 244, 236], seed, { edge: 0.06 });
      const G = gridGeom(c), x = m => m * s;
      ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 0, W, x(G.hh));
      block(ctx, c.head, x(0.014), x(0.012), x(G.lw - 0.02), { size: 0.0165 * s, weight: 700, color: '#f3ead8', lh: 1.25 });
      const heads = [c.colA.head, c.colB.head];
      heads.forEach((h, i) => block(ctx, h, x(G.lw + i * G.cw), x(0.014), x(G.cw), { size: 0.0165 * s, weight: 700, color: '#f3ead8', align: 'center', lh: 1.2 }));
      c.rows.forEach((r, i) => {
        const yy = x(G.hh + i * G.rh);
        ctx.strokeStyle = 'rgba(40,30,20,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
        if (i === 3) { ctx.fillStyle = 'rgba(179,38,30,.08)'; ctx.fillRect(0, yy, W, x(G.rh)); }
        if (c.icons) gridIcon(ctx, c.icons[i], x(0.034), yy + x(G.rh / 2), x(0.05), i === 3 ? '#8c1c14' : '#3a3128');
        text1(ctx, r[0], x(0.066), yy + x(0.016), { size: 0.021 * s, weight: 700, color: i === 3 ? '#8c1c14' : INK });
        if (r[1]) text1(ctx, r[1], x(0.066), yy + x(0.052), { size: 0.016 * s, weight: i === 3 ? 700 : 500, color: i === 3 ? '#b3261e' : INK2 });
      });
      ctx.strokeStyle = 'rgba(40,30,20,.3)'; ctx.lineWidth = 2;
      for (const xx of [G.lw, G.lw + G.cw]) { ctx.beginPath(); ctx.moveTo(x(xx), 0); ctx.lineTo(x(xx), H); ctx.stroke(); }
    }
  });
}
function gridIcon(ctx, kind, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'person') { ctx.beginPath(); ctx.arc(0, -s * 0.18, s * 0.18, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, s * 0.42, s * 0.36, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
  if (kind === 'key') { ctx.beginPath(); ctx.arc(-s * 0.22, 0, s * 0.17, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.05, 0); ctx.lineTo(s * 0.4, 0); ctx.moveTo(s * 0.28, 0); ctx.lineTo(s * 0.28, s * 0.14); ctx.moveTo(s * 0.38, 0); ctx.lineTo(s * 0.38, s * 0.12); ctx.stroke(); }
  if (kind === 'ticket') { ctx.strokeRect(-s * 0.4, -s * 0.22, s * 0.8, s * 0.44); ctx.setLineDash([s * 0.06, s * 0.05]); ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 0.2); ctx.lineTo(s * 0.12, s * 0.2); ctx.stroke(); ctx.setLineDash([]); }
  if (kind === 'shield') { ctx.beginPath(); ctx.moveTo(0, -s * 0.36); ctx.lineTo(s * 0.3, -s * 0.24); ctx.lineTo(s * 0.26, s * 0.12); ctx.quadraticCurveTo(s * 0.16, s * 0.3, 0, s * 0.38); ctx.quadraticCurveTo(-s * 0.16, s * 0.3, -s * 0.26, s * 0.12); ctx.lineTo(-s * 0.3, -s * 0.24); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.02, s * 0.09); ctx.lineTo(s * 0.13, -s * 0.09); ctx.stroke(); }
  ctx.restore();
}
export function gridGeom(c) { const hh = 0.085, lw = c.w - 0.44, cw = 0.22, rh = (c.h - hh) / 4; return { hh, lw, cw, rh }; }

// ---------------------------------------------------------------- face-down backs
const _backs = {};
function backMat(c) {
  const key = c.kind === 'photo' ? 'photo' : c.kind === 'file' ? 'file' : 'card';
  if (_backs[key]) return _backs[key];
  const tex = canvasTex(512, 320, (ctx, w, h) => { paper(ctx, w, h, key === 'photo' ? [232, 230, 224] : key === 'file' ? [190, 156, 100] : [206, 178, 128], key.length * 7, { edge: 0.22 }); });
  return (_backs[key] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
}
// ---------------------------------------------------------------- board build
export const OBJ = {};       // id -> { c, g (group), mesh, base: [x,y], at, late, tilt }
export const THREADS = [];   // { a, b, at, mesh, len }
export const LINKOBJ = {};
let ROOT;
export async function buildBoard(scene) {
  ROOT = new THREE.Group(); scene.add(ROOT);
  // cork + frame + top shelf
  const corkTex = canvasTex(1024, 1024, (ctx, w, h) => {
    noise(ctx, w, h, [172, 128, 84], 32, 11);
    const r = rng(5);
    for (let i = 0; i < 9000; i++) { const sz = 0.6 + r() * 2.4; ctx.fillStyle = r() < 0.55 ? `rgba(70,40,18,${0.2 + r() * 0.35})` : `rgba(214,174,120,${0.12 + r() * 0.25})`; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, sz, sz * (0.5 + r()), r() * 3, 0, 7); ctx.fill(); }
  }, { repeat: [6, 2.4] });
  const cork = new THREE.Mesh(new THREE.BoxGeometry(B.W, B.H, 0.02), new THREE.MeshStandardMaterial({ map: corkTex, color: 0xf2e6d6, roughness: 0.95 }));
  cork.position.set(0, B.cy, CORKZ - 0.01); cork.receiveShadow = true; ROOT.add(cork);
  const fm = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.55 });
  const ft = 0.045, fd = 0.05;
  for (const [x, y, w, h] of [[0, B.H / 2 + ft / 2, B.W + ft * 2, ft], [0, -B.H / 2 - ft / 2, B.W + ft * 2, ft], [-B.W / 2 - ft / 2, 0, ft, B.H], [B.W / 2 + ft / 2, 0, ft, B.H]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, fd), fm); m.position.set(x, B.cy + y, fd / 2); m.castShadow = true; m.receiveShadow = true; ROOT.add(m);
  }
  // photos: load the note's SVG figures
  for (const c of D.CARDS.filter(c => c.kind === 'photo')) { const img = new Image(); img.src = `${c.src}${NOTEXT ? '-notext' : ''}.png`; await img.decode(); SVGIMG[c.src] = img; }

  const all = [...D.CARDS];
  // grid cells become their own little cards (pinned into the table)
  const grid = D.byId('c1.grid'), G = gridGeom(grid);
  const [gx, gy] = cardXY(grid);
  const gl = gx - grid.w / 2, gt = gy + grid.h / 2;
  const cells = [];
  ['colA', 'colB'].forEach((col, ci) => grid[col].cells.forEach((t, ri) => {
    cells.push({ id: `c1.cell.${ci}.${ri}`, kind: 'cell', x: gl + G.lw + ci * G.cw + G.cw / 2, y: gt - G.hh - ri * G.rh - G.rh / 2, w: G.cw - 0.016, h: G.rh - 0.014, text: t, at: grid[col].at, late: 0.25 + ri * 0.17, tone: ci ? [236, 242, 248] : [250, 247, 238], cell: [ci, ri], pinKind: ci ? 'blue' : 'red' });
  }));
  all.push(...cells);
  // the swap strips sit exactly over column B, rows 1–3
  for (const id of ['c1.swapA', 'c1.swapB']) { const s = all.find(c => c.id === id); s.zone = null; s.x = gl + G.lw + G.cw + G.cw / 2; s.y = gt - G.hh - 1.5 * G.rh; s.w = G.cw + 0.012; s.h = 3 * G.rh + 0.01; }

  let layer = 0;
  for (const c of all) {
    const tex = faceFor(c, 'front');
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: c.kind === 'photo' ? 0.42 : 0.9, metalness: 0 });
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), mat); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
    let back = null;
    if (c.kind === 'q') {
      const bt = faceFor(c, 'back');
      back = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 }));
      back.rotation.y = Math.PI; back.castShadow = true; back.receiveShadow = true; g.add(back);
    }
    const [x, y] = c.zone !== undefined && c.zone ? cardXY(c) : [c.x, c.y];
    const r = rng([...c.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0);
    const tilt = c.kind === 'cell' || c.kind === 'strip' || c.kind === 'grid' ? (r() - 0.5) * 0.006 : (r() - 0.5) * (c.kind === 'clue' || c.kind === 'ctx' || c.kind === 'photo' ? 0.05 : 0.022);
    const dz = c.kind === 'strip' ? 0.006 : c.kind === 'cell' ? 0.0035 : 0.0015 + (layer++ % 7) * 0.0004;
    g.position.copy(toWorld(x, y, dz)); g.rotation.z = tilt;
    // pins
    const pk = c.pinKind || (c.kind === 'photo' ? 'dark' : c.kind === 'clue' || c.kind === 'title' ? 'brass' : c.kind === 'strip' ? (c.blue ? 'blue' : 'dark') : 'red');
    const pins = [];
    const pinAt = c.kind === 'cell' || c.kind === 'tline' ? [-c.w / 2 + 0.014] : c.w > 0.42 ? [-c.w / 2 + 0.016, c.w / 2 - 0.016] : [0];
    const py = c.kind === 'cell' ? c.h / 2 - 0.012 : c.h / 2 - 0.0062;
    for (const pxl of pinAt) { const p = makePin(pk, c.pin === 'big'); p.position.set(pxl, py, 0.0005); g.add(p); pins.push(p); }
    // cards waiting for their beat hang face-down (kraft back, like round 2's 未翻開)
    let backFace = null;
    if (c.at && !['cell', 'strip', 'q'].includes(c.kind)) {
      backFace = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), backMat(c)); backFace.rotation.y = Math.PI; backFace.castShadow = true; backFace.receiveShadow = true; g.add(backFace);
      for (const pxl of pinAt) { const p = makePin(pk); p.position.set(-pxl, py, -0.0005); p.rotation.y = Math.PI; g.add(p); pins.push(p); p.userData.back = true; }
    }
    ROOT.add(g);
    OBJ[c.id] = { c, g, mesh, back, backFace, base: [x, y], dz, tilt, pins, at: c.at, late: c.late || 0 };
  }
  // red threads inside cases
  const yarnMat = new THREE.MeshStandardMaterial({ color: 0xa3180f, roughness: 0.8 });
  for (const [a, b, at] of D.THREADS) THREADS.push(makeThread(anchor(a), anchor(b), at, yarnMat, 0.0016));
  // ring links between cases, each with a kraft tag
  for (const L of D.LINKS) {
    const pa = anchor(L.from), pb = anchor(L.to);
    const tagTop = { x: L.tag[0], y: L.tag[1] + 0.06, c: { w: 0, h: 0 }, left: true };
    const pts = [pa, ...(L.via || []).map(([x, y]) => ({ x, y, c: { w: 0, h: 0 }, left: true }))];
    const segs = [];
    // first leg: from the source (through waypoints) to the tag's pin; second leg: tag pin to the destination
    const legA = [...pts, tagTop], legB = [tagTop, pb];
    for (const leg of [legA, legB]) for (let i = 0; i + 1 < leg.length; i++) segs.push(makeThread(leg[i], leg[i + 1], L.at, yarnMat, 0.0019, 0.03));
    const th = segs[0]; th.segs = segs;
    const c = { id: L.id, kind: 'link', w: 0.5, h: 0.112, dir: L.dir, text: L.text };
    const tex = faceFor(c);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    const mid = toWorld(L.tag[0], L.tag[1], 0.01); tag.position.set(mid.x, mid.y, mid.z + 0.004); tag.castShadow = true; tag.receiveShadow = true;
    const tp = makePin('red'); tp.position.set(0, c.h / 2 - 0.012, 0.001); tag.add(tp);
    tag.rotation.z = (rng(L.id.charCodeAt(1))() - 0.5) * 0.06; ROOT.add(tag);
    LINKOBJ[L.id] = { L, th, tag, mid };
  }
  return ROOT;
}
// anchor: 'cardId' (nearest edge centre is resolved later) or 'cardId@n' for grid row / file line n
export function anchor(ref) {
  const [id, n] = ref.split('@');
  const c = D.byId(id) || OBJ[id]?.c;
  const [x, y] = c.zone ? cardXY(c) : [c.x, c.y];
  if (n === 'R') return { x: x + c.w / 2 - 0.01, y, c, left: true };
  if (n === 'L') return { x: x - c.w / 2 + 0.01, y, c, left: true };
  if (n === 'T') return { x, y: y + c.h / 2 - 0.012, c, left: true };
  if (n === 'B') return { x, y: y - c.h / 2 + 0.012, c, left: true };
  if (n !== undefined && c.kind === 'grid') { const G = gridGeom(c); return { x: x + c.w / 2, y: y + c.h / 2 - G.hh - (Number(n) - 0.5) * G.rh, c }; }
  if (n !== undefined && c.kind === 'file') { return { x: x + c.w / 2 - 0.02, y: y + c.h / 2 - (c.riskTop || 0.14) - (Number(n) - 1) * 0.052, c, left: true }; }
  return { x, y, c };
}
function edgePoint(A, B) {   // point on A's rectangle toward B's centre
  const c = A.c; const dx = B.x - A.x, dy = B.y - A.y;
  if (A.left || c.kind === 'grid') return new THREE.Vector2(A.x, A.y);
  const hw = c.w / 2 - 0.012, hh = c.h / 2 - 0.012;
  const k = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : 1e9);
  return new THREE.Vector2(A.x + dx * k, A.y + dy * k);
}
function makeThread(A, Bp, at, mat, rad, sag = 0.025) {
  const p0 = edgePoint(A, Bp), p1 = edgePoint(Bp, A);
  const a = toWorld(p0.x, p0.y, 0.012), b = toWorld(p1.x, p1.y, 0.012);
  const len = a.distanceTo(b), mid = a.clone().lerp(b, 0.5); mid.y -= sag * Math.min(1, len / 0.6) + 0.004; mid.z += 0.004;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const seg = Math.max(12, Math.round(len * 60));
  const geo = new THREE.TubeGeometry(curve, seg, rad, 5, false);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; ROOT.add(mesh);
  const pa = makePin('red'), pb = makePin('red'); pa.position.copy(a).setZ(CORKZ); pb.position.copy(b).setZ(CORKZ); pa.scale.setScalar(0.8); pb.scale.setScalar(0.8); ROOT.add(pa, pb);
  const T = { a, b, at, mesh, curve, count: geo.index.count, pa, pb };
  return T;
}
