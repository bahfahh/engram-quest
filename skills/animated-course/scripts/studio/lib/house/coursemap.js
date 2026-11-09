// Engram studio — the course map (three.js r170 + DOM chips). Data-driven: one pedestal per lesson, each with a holo
// mini picture of that lesson's core mechanism that actually plays. States: done (lessons before this one) / now
// (this lesson) / later (not yet). Same component shapes as everywhere in the house (pedestal, panel, station chip).
//
//   import { makeCourseMap } from '/lib/house/coursemap.js';
//   import { AIENG } from '/lib/house/coursemap-aieng.js';       // course data: [{n, name, cycle, pic(c, L, u, o)}]
//   const map = makeCourseMap({ room, H, ui, camera, lessons: AIENG, lesson: 6, at: [24, 0], t0: Ls('M01'),
//     question: '資料怎麼挑、補、整理？', times: { review: [...words], arrive: Ls('M02') + 0.4, end: Le('M03') + 0.35 } });
//   window.renderAt = t => { …; if (map.on(t)) { setCam(map.cam(t)); map.update(t); } …; };
//   window.TEXTS = t => ui.TEXTS();        // chips and the question card are DOM elements with data-read
//
// Layout: up to 5 lessons in one row; more in two rows that read like two lines of text (1–4 front, 5–8 back,
// back row raised so its pictures clear the front ones). Name chips: back row above its pictures, front row below its
// pedestals, so chips never cover a picture and pictures never cover a chip (experiment 17 map, trial 1).
// Beats (04-skeleton §5): overview ≥ 1.5 s, learned lessons light up (on the words that name them, or together),
// push to this lesson (others dim, their chips hide), the question card stays until it is read.
import * as THREE from 'three';
import { lerpLook, quantK } from './tokens.js';
import { drawChip } from './board.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
const sm = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const win2 = (t, a, b, f = 0.2) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));
/** reading time (04-skeleton §5b): CJK / 4.5 + other / 15 + 1.5 s */
export const readNeed = s => { const t = String(s).replace(/\s/g, ''); const cjk = (t.match(/[　-鿿＀-￯]/g) || []).length; return Math.max(1.5, cjk / 4.5 + (t.length - cjk) / 15 + 1.5); };

/** a look where every colour is grey (a lesson not reached yet) */
export function greyLook(L) {
  const g = { ...L };
  for (const k of ['line', 'cyan', 'magenta', 'amber', 'bracket', 'nowA', 'nowB']) g[k] = L.grey;
  for (const k of ['ink', 'ink2', 'cyanInk', 'magentaInk', 'amberInk']) g[k] = L.greyInk;
  g.ink3 = L.grey; g.edge = L.grey; g.edgeTop = L.grey; g.glow = 'rgba(0,0,0,0)';
  return g;
}

/**
 * @param {object} o
 * @param {object} o.room   makeRoom()   @param {object} o.H  makeHolo(room)   @param {object} o.ui  makeUI(…, {camera})
 * @param {THREE.Camera} o.camera
 * @param {Array} o.lessons  [{n, name, cycle (s), pic(c, L, u, o)}] — pic draws in a ±440 × ±250 box around (0, 0); u = 0…1 one run
 * @param {number} o.lesson  this lesson (n)
 * @param {[number, number]} [o.at]  floor centre of the map (x, z of the middle between the rows)
 * @param {number} o.t0      map start (absolute s)
 * @param {object} [o.times] {review: t | [t per learned lesson], say: [t per learned lesson] (its chip glows as the narration names it),
 *                            preview: [t per lesson n, index n-1, null to skip] — on its word ANY lesson's chip glows and
 *                            its picture brightens (a not-yet lesson stays grey); use it when the map names lessons not learned yet (lesson 1),
 *                            arrive, ask, end, play: [[t, u], …] (this lesson's run, keyed to the words), push (s, 1.1)}
 * @param {string} [o.question]  question card text (≤ 12 CJK per line, '\n' for two)
 * @param {string} [o.label]     card label (default 「第 N 課 · name」)
 * @param {number} [o.res]   panel canvas width (1024)
 */
export function makeCourseMap({ room, H, ui, camera, lessons, lesson, at = [24, 0], t0 = 0, times = {}, question = '', label, res = 1024, idPrefix = 'map' }) {
  const N = lessons.length, two = N > 5, perRow = two ? Math.ceil(N / 2) : N;
  const root = new THREE.Group(); root.position.set(at[0], 0, at[1]); room.scene.add(root);
  const SP = 2.25, ZF = 1.35, ZB = -1.35;                 // spacing, front / back row z (relative to `at`)
  const PW = 1.62, PH = 1.06;                             // picture panel size (m)
  const ped = { front: { r: 0.5, h: 0.5 }, back: { r: 0.5, h: 1.18 } };
  const items = lessons.map((ls, i) => {
    const row = two && i >= perRow ? 'back' : 'front', j = row === 'back' ? i - perRow : i, cnt = row === 'back' ? N - perRow : perRow;
    const x = (j - (cnt - 1) / 2) * SP, z = two ? (row === 'back' ? ZB : ZF) : 0;
    const P = ped[row], pd = H.pedestal({ r: P.r, h: P.h }); pd.g.position.set(x, 0, z); root.add(pd.g);
    const sc = row === 'back' ? 1.12 : 1;                // the back row is drawn 12 % bigger (it is further away)
    const panel = H.panel({ w: PW, h: PH, res, order: 5 }); panel.mesh.scale.setScalar(sc); panel.mesh.position.set(x, P.h + 0.24 + PH * sc / 2, z); root.add(panel.mesh);
    const beam = H.beam({ r0: P.r * 0.55, r1: PW * 0.32, h: 0.26 }); beam.mesh.position.set(x, pd.top, z); root.add(beam.mesh);
    const state = ls.n < lesson ? 'done' : ls.n === lesson ? 'now' : 'later';
    const chip = ui.station(ls.n, ls.name, { id: `${idPrefix}-${ls.n}` }); chip.state(state);
    return { ls, i, row, x, z, pd, panel, beam, state, chip, sc, top: V3(x, P.h + 0.24 + PH * sc, z), foot: V3(x, 0.0, z + P.r + 0.06) };
  });
  const me = items.find(it => it.ls.n === lesson);
  const learned = items.filter(it => it.state === 'done');

  // ------------------------------------------------------------------ cameras (world)
  const cx = at[0], cz = at[1];
  const wz = (z) => cz + z;
  const overview = { pos: V3(cx, 4.15, wz(ZF + 8.35)), look: V3(cx, 1.12, wz(-0.55)), fov: 35 };
  const part = it => { const w = PW * it.sc, h = PH * it.sc, tg = V3(cx + it.x + w * 0.55, it.top.y - h * 0.55, wz(it.z)); return { pos: tg.clone().add(V3(0.05, it.row === 'back' ? 0.68 : 0.45, 3.5 * it.sc)), look: tg, fov: 34 }; };
  // every panel faces the overview camera (yaw + pitch), so the pictures read square in the wide shot
  root.updateMatrixWorld(true);
  for (const it of items) { it.panel.mesh.lookAt(V3(cx + it.x * 0.75, overview.pos.y, overview.pos.z)); }
  root.updateMatrixWorld(true);

  // ------------------------------------------------------------------ times
  const T = { start: t0, push: 1.1, ...times };
  const blend = T.blend ?? 0;                              // camera blend from the page's camera (0 = cut / wipe)
  T.overview = T.overview ?? t0 + Math.max(1.8, blend + 0.8);
  if (T.review == null) T.review = T.overview;
  const rev = Array.isArray(T.review) ? T.review : learned.map(() => T.review);
  learned.forEach((it, i) => { it.tLit = rev[Math.min(i, rev.length - 1)]; });
  T.arrive = T.arrive ?? (Math.max(T.overview, ...learned.map(it => it.tLit)) + 5.2 + T.push);
  T.pushAt = T.arrive - T.push;
  const cyc = me ? me.ls.cycle || 4.5 : 4.5;
  T.play = T.play || [[T.arrive - 0.6, 0], [T.arrive - 0.6 + cyc, 1]];
  T.ask = T.ask ?? T.arrive + 0.15;
  const qLabel = label ?? (me ? `第 ${lesson} 課 · ${me.ls.name}` : '');
  T.readQ = readNeed(qLabel + question) + 0.4;
  T.end = T.end ?? T.ask + T.readQ;
  if (question && T.end - T.ask < T.readQ - 0.4) console.warn(`[coursemap] question card shown ${(T.end - T.ask).toFixed(2)}s, needs ${(T.readQ - 0.4).toFixed(2)}s to read`);
  const playU = t => { const P = T.play; if (t <= P[0][0]) return 0; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) return lerp(P[i - 1][1], P[i][1], prog(t, P[i - 1][0], P[i][0])); return P[P.length - 1][1]; };

  // ------------------------------------------------------------------ question card (DOM, house panel + cyan tab)
  const card = document.createElement('div'); card.className = 'h-panel h-qcard';
  card.innerHTML = `<span class="h-corners"><i></i><i></i><i></i><i></i></span><span class="h-tab" data-read="${idPrefix}-qlabel">${qLabel}</span><div class="q" data-read="${idPrefix}-question">${question.replace(/\n/g, '<br>')}</div>`;
  Object.assign(card.style, { position: 'absolute', left: '0', top: '0', padding: '54px 46px 40px', visibility: 'hidden', whiteSpace: 'nowrap' });
  card.querySelector('.q').style.cssText = 'font: 800 56px/1.35 var(--h-font-tc); color: var(--h-ink);';
  ui.layers.cards.append(card);
  let cardW = 0;

  // ------------------------------------------------------------------ camera
  const DRIFT = V3(0.12, -0.06, -0.35);                  // the overview breathes in a little while it holds
  const ovEnd = overview.pos.clone().add(DRIFT);
  const close = me ? part(me) : overview;
  const pushPath = new THREE.CatmullRomCurve3([ovEnd, ovEnd.clone().lerp(close.pos, 0.5).add(V3(0, 0.3, 0)), close.pos], false, 'centripetal');
  function cam(t) {
    if (t < T.pushAt) { const d = sm(prog(t, t0, T.pushAt)); return { pos: overview.pos.clone().addScaledVector(DRIFT, d), look: overview.look.clone(), fov: overview.fov }; }
    const k = sm(prog(t, T.pushAt, T.arrive));
    if (k < 1) return { pos: pushPath.getPoint(k), look: overview.look.clone().lerp(close.look, k), fov: lerp(overview.fov, close.fov, k) };
    const d = prog(t, T.arrive, T.end + 1);
    return { pos: close.pos.clone().add(V3(-0.04 * d, 0, -0.1 * d)), look: close.look.clone(), fov: close.fov };
  }

  // ------------------------------------------------------------------ per frame
  const _last = new Map();
  function drawPanel(it, u, lit, grey) {
    const kq = quantK(room.k, 12), uq = Math.round(clamp(u) * 72) / 72;
    it.panel.draw(`${it.ls.n}|${uq}|${grey ? 'g' : lit ? 'l' : 'd'}`, (c, W, Hh, L) => {
      c.save(); c.translate(W / 2, Hh / 2); const s = W / 1024; c.scale(s, s);
      const LL = grey ? greyLook(L) : L;
      try { it.ls.pic(c, LL, uq, { state: it.state, lit, grey }); } catch (e) { console.error('[coursemap] pic ' + it.ls.n + ': ' + e.message); }
      c.restore();
    });
  }
  function update(t) {
    const on = t >= t0 && t < T.end + 0.6; root.visible = on;
    if (!on) { for (const it of items) ui.place(it.chip, [0, 0], { a: 0 }); card.style.visibility = 'hidden'; return; }
    const kPush = sm(prog(t, T.pushAt, T.arrive));           // 0 overview … 1 close-up
    const chipA = Math.min(prog(t, t0 + Math.max(0.15, blend * 0.6), t0 + Math.max(0.15, blend * 0.6) + 0.35), 1 - prog(t, T.pushAt, T.pushAt + 0.3));
    for (const it of items) {
      const isMe = it === me;
      let lit = 0, u = 1, grey = it.state === 'later';
      if (it.state === 'done') { lit = sm(prog(t, it.tLit - 0.15, it.tLit + 0.25)); u = t < it.tLit ? 1 : prog(t, it.tLit, it.tLit + (it.ls.cycle || 4.5) / (it.ls.rate || 1.25)); }
      if (isMe) { lit = 1; u = t < T.play[0][0] ? 0 : playU(t); }
      if (grey) u = it.ls.still ?? 0.62;
      // brightness: lit 1, learned-but-not-lit 0.55, later 0.62; while pushed in, everything but this lesson dims
      const pv = T.preview && T.preview[it.ls.n - 1] != null ? win2(t, T.preview[it.ls.n - 1] - 0.1, T.preview[it.ls.n - 1] + 1.3) : 0;
      let op = isMe ? lerp(0.9, 1, kPush) : grey ? lerp(0.62, 0.96, pv) : lerp(0.55, 1, lit);
      if (!isMe) op *= lerp(1, 0.22, kPush);
      it.panel.opacity = op; it.panel.mesh.material.opacity = op;
      drawPanel(it, u, lit > 0.5 || isMe, grey);
      it.pd.set(it.state, isMe ? 1 : lit); it.beam.set((isMe ? 1 : lit * 0.8) * (isMe ? 1 : 1 - kPush * 0.8));
      it.pd.g.visible = true;
      // chip: back row above the picture, front row below the pedestal
      const anchor = it.row === 'back' ? it.top.clone().add(V3(cx, 0.02, cz)) : it.foot.clone().add(V3(cx, 0, cz));
      // the chip of the lesson being named lights up (times.say: one time per learned lesson, in order)
      const si = learned.indexOf(it), say = Math.max(pv, T.say && si >= 0 && T.say[si] != null ? win2(t, T.say[si] - 0.1, T.say[si] + 1.0) : 0);
      it.chip.el.style.boxShadow = say > 0.01 ? `0 0 0 ${(8 * say).toFixed(1)}px var(--h-glow-ring), 0 0 ${(40 * say).toFixed(0)}px var(--h-glow), 0 14px 34px var(--h-drop)` : '';
      it.chip.el.style.borderColor = say > 0.5 ? 'var(--h-line)' : '';
      ui.place(it.chip, anchor, { dy: it.row === 'back' ? -46 : 52, a: chipA, line: true });
    }
    // question card next to this lesson's picture
    const qa = Math.min(sm(prog(t, T.ask, T.ask + 0.35)), 1 - prog(t, T.end - 0.3, T.end - 0.02));   // gone by the end (a wipe or cut follows)
    card.style.visibility = qa > 0.01 ? 'visible' : 'hidden'; card.style.opacity = qa.toFixed(3);
    if (qa > 0.01) {
      if (!cardW) cardW = card.offsetWidth;
      const Pc = part(me); const c2 = new THREE.PerspectiveCamera(Pc.fov, 16 / 9, 0.05, 220); c2.position.copy(Pc.pos); c2.lookAt(Pc.look); c2.updateMatrixWorld(); c2.updateProjectionMatrix();
      const edge = V3(cx + me.x + PW * me.sc / 2, me.top.y - PH * me.sc * 0.5, wz(me.z)).project(c2);
      const x = Math.min(1880 - cardW, (edge.x + 1) * 960 + 64), y = (1 - edge.y) * 540 - card.offsetHeight / 2;
      card.style.transform = `translate(${x.toFixed(1)}px,${(y + 18 * (1 - qa)).toFixed(1)}px)`;
    }
  }
  return {
    root, items, times: T, cams: { overview, part: n => part(items.find(it => it.ls.n === n)) }, cam, update, card,
    on: t => t >= t0 && t < T.end + 0.6,
    /** glyphs for loadFonts */
    glyphs: () => lessons.map(l => l.name + (l.glyphs || '')).join('') + qLabel + question + '0123456789/.v',
  };
}

/** canvas helpers for lesson pictures (draw in a ±440 × ±250 box; strokes ≥ 8 so they read in the wide shot) */
export const P = {
  rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); },
  dot(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); },
  ring(c, x, y, r, col, w = 8) { c.beginPath(); c.arc(x, y, r, 0, 7); c.lineWidth = w; c.strokeStyle = col; c.stroke(); },
  line(c, pts, col, w = 10, k = 1, dash) { if (k <= 0) return; let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    const stop = L * clamp(k); let acc = 0; c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = col; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) { if (acc + seg[i - 1] >= stop) { const u = (stop - acc) / seg[i - 1]; c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u); break; } c.lineTo(...pts[i]); acc += seg[i - 1]; }
    c.stroke(); c.restore(); },
  arrow(c, x0, y0, x1, y1, col, w = 10, k = 1) { if (k <= 0) return; const ex = x0 + (x1 - x0) * clamp(k), ey = y0 + (y1 - y0) * clamp(k); P.line(c, [[x0, y0], [ex, ey]], col, w); if (k > 0.8) { const a = Math.atan2(y1 - y0, x1 - x0), s = w * 2.6; c.save(); c.fillStyle = col; c.beginPath(); c.moveTo(ex + Math.cos(a) * s * 0.4, ey + Math.sin(a) * s * 0.4); c.lineTo(ex - Math.cos(a - 0.6) * s, ey - Math.sin(a - 0.6) * s); c.lineTo(ex - Math.cos(a + 0.6) * s, ey - Math.sin(a + 0.6) * s); c.closePath(); c.fill(); c.restore(); } },
  text(c, s, x, y, size, col, align = 'center', weight = 800) { c.save(); c.font = `${weight} ${size}px Inter, "Noto Sans TC"`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); c.restore(); },
  check(c, x, y, r, col, w = 12, k = 1) { P.line(c, [[x - r, y], [x - r * 0.3, y + r * 0.7], [x + r, y - r * 0.75]], col, w, k); },
  cross(c, x, y, r, col, w = 12, k = 1) { P.line(c, [[x - r, y - r], [x + r, y + r]], col, w, clamp(k * 2)); P.line(c, [[x + r, y - r], [x - r, y + r]], col, w, clamp(k * 2 - 1)); },
  prog, clamp, lerp, sm,
  out: k => 1 - Math.pow(1 - clamp(k), 3),
  outBack: k => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  chip: drawChip,
};
