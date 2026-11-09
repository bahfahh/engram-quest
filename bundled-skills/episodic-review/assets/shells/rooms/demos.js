// demos.js — what is drawn on each in-world surface, as a pure function of t.
import { prog, clamp, lerp, ease, sm, rng, fio } from './lib.js';
import { F, C, font, text, wrap, rr, box, arrow, pathArrow, code, check, cross, screenBase, boardBase, card } from './draw.js';
import { T, B, UI as SHELL_UI } from './content.js';

const io = (t, a, b) => ease.inOut(prog(t, a, b));
const on = (id, t) => t >= T[id].t0;
const ap = (id, t, d = 0.6) => sm(prog(t, T[id].t0, T[id].t0 + d)); // appear factor
const IMG = {};
export function setImages(imgs) { Object.assign(IMG, imgs); }
function img(ctx, key, x, y, w, h, a = 1) { const im = IMG[key]; if (!im || a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(im, x, y, w, h); ctx.restore(); }

/* ======================================================================= shared pieces */
// handwritten notebook page (context line) — left page date stamp, right page the line
export function drawNotebook(id) {
  return (ctx, w, h, t) => {
    ctx.fillStyle = '#f3ecdc'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,110,160,.22)'; ctx.lineWidth = 2; for (let y = 120; y < h - 30; y += 64) { ctx.beginPath(); ctx.moveTo(26, y); ctx.lineTo(w - 26, y); ctx.stroke(); }
    const g = ctx.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(60,40,20,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(w / 2 - 40, 0, 80, h);
    const e = T[id]; const a = sm(prog(t, e.t0, e.t0 + 1.2));
    ctx.save(); ctx.globalAlpha = a;
    wrap(ctx, e.text, 46, 108, w / 2 - 80, 64, { px: 50, fam: F.hand, color: '#22314a' });
    ctx.restore();
    // right page: faint old scribbles (not readable, just a lived-in page)
    ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#22314a'; ctx.lineWidth = 3; const r = rng(id.length * 31);
    for (let i = 0; i < 6; i++) { const y = 108 + i * 64 - 14; ctx.beginPath(); ctx.moveTo(w / 2 + 40, y); for (let x = w / 2 + 40; x < w / 2 + 40 + 180 + r() * 260; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.2 + i) * 6); ctx.stroke(); }
    ctx.restore();
  };
}
export function drawCalendar(ctx, w, h) {
  ctx.fillStyle = '#f6f2e8'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b4382c'; ctx.fillRect(0, 0, w, 96);
  text(ctx, '2026', w / 2, 66, { px: 50, w: 700, fam: F.en, color: '#fff', align: 'center' });
  text(ctx, T['dive.cal'].text, w / 2, 300, { px: 170, w: 700, color: '#2a2622', align: 'center' });
  ctx.strokeStyle = 'rgba(40,30,20,.25)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) ctx.strokeRect(24 + j * 45, 340 + i * 22, 41, 18);
}
export function drawPlate(txt) { return (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d7b56d'); g.addColorStop(1, '#9c7a3c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#5e4720'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16); text(ctx, txt, w / 2, 100, { px: 70, w: 700, color: '#2e2312', align: 'center' }); }; }
export function drawLaptopIdle(seed) { return (ctx, w, h) => { screenBase(ctx, w, h); ctx.fillStyle = '#262a31'; ctx.fillRect(0, 54, 150, h - 54); const r = rng(seed); for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(200,200,190,${0.15 + r() * 0.2})`; ctx.fillRect(190, 110 + i * 46, 200 + r() * 560, 16); } }; }
// a small paper note (sticky / slip) drawn into its own texture
export function drawSlip(id, o = {}) {
  return (ctx, w, h, t) => {
    ctx.fillStyle = o.bg || '#f6dc78'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, 0, w, 30);
    const e = T[id];
    wrap(ctx, e.text, 36, 30 + (o.px || 52) * 1.1, w - 72, (o.px || 52) * 1.28, { px: o.px || 52, w: 500, color: o.ink || C.ink, fam: o.fam || F.ui });
    if (o.strike && t >= o.strike) { const u = io(t, o.strike, o.strike + 0.7); ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(30, h * 0.2); ctx.lineTo(30 + (w - 60) * u, h * 0.2 + (h * 0.55) * u); ctx.stroke(); if (u >= 1) { ctx.beginPath(); ctx.moveTo(w - 30, h * 0.2); ctx.lineTo(w - 30 - (w - 60) * io(t, o.strike + 0.7, o.strike + 1.3), h * 0.2 + h * 0.55 * io(t, o.strike + 0.7, o.strike + 1.3)); ctx.stroke(); } }
  };
}

/* ======================================================================= ROOM 1 — 輕量 DDD */
// whiteboard geometry (canvas 2560 x 1448) — the note's decision tree, upper half
const W1 = { start: [1500, 300], q1: [1500, 450], q2: [1500, 712], q3: [1500, 975], G: [1500, 1236], E: [520, 450], D: [520, 712], Tt: [520, 975] };
const QW = 900, SW = 820, SH = 210, BIG = [430, 196], SMALL = [340, 88];
const QH = { q1: 116, q2: 150, q3: 150 };
// card positions over time: list of [t, x, y, big(0/1)]; returns {x,y,b}
function pathAt(t, kf) {
  const g = (f) => ({ x: f[1], y: f[2], b: f[3] ?? 1 });
  if (t <= kf[0][0]) return g(kf[0]);
  for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) { const u = ease.inOut(prog(t, kf[i - 1][0], kf[i][0])); const A = g(kf[i - 1]), Bq = g(kf[i]); return { x: lerp(A.x, Bq.x, u), y: lerp(A.y, Bq.y, u), b: lerp(A.b, Bq.b, u) }; }
  return g(kf[kf.length - 1]);
}
const PARK = (k) => [W1[k][0] + QW / 2 + 40, W1[k][1] - BIG[1] / 2, 1];
const SLOT = (k, n = 0) => { const c = W1[k]; return [c[0] + SW / 2 - SMALL[0] - 24, c[1] - SH / 2 + 16 + n * (SMALL[1] + 10), 0]; };
const ENTRY = [2020, 40, 1];
const r1 = B.r1;
const PC = T['r1.punch.cards'].text.split('／');
const CARDS1 = {
  A: { id: 'r1.cardA', short: '{{FILL:demo.A.short}}', band: C.amber, kf: [[r1.A + 1.5, ...ENTRY], [r1.A + 3, ...PARK('q1')], [r1.A + 12.5, ...PARK('q1')], [r1.A + 15.5, ...SLOT('E', 0)]] },
  B: { id: 'r1.cardB', short: '{{FILL:demo.B.short}}', band: C.blue, kf: [[r1.Bk + 1.5, ...ENTRY], [r1.Bk + 3, ...PARK('q1')], [r1.Bk + 5, ...PARK('q1')], [r1.Bk + 6.5, ...PARK('q2')], [r1.Bk + 14.5, ...PARK('q2')], [r1.Bk + 16.5, ...SLOT('D', 0)]] },
  C: { id: 'r1.cardC', short: '{{FILL:demo.C.short}}', band: C.green, kf: [[r1.C + 1.5, ...ENTRY], [r1.C + 3, ...PARK('q1')], [r1.C + 4, ...PARK('q1')], [r1.C + 5, ...PARK('q2')], [r1.C + 6, ...PARK('q2')], [r1.C + 7.5, ...PARK('q3')], [r1.C + 23.5, ...PARK('q3')], [r1.C + 25.5, ...SLOT('G', 0)]] },
  E2: { text: PC[0], short: '{{FILL:demo.E2.short}}', sub: '{{FILL:demo.E2.sub}}', band: C.blue, kf: [[r1.punch + 0.5, ...ENTRY], [r1.punch + 2.0, ...PARK('q1')], [r1.punch + 3.5, ...SLOT('E', 1)]] },
  G2: { text: PC[1], short: '{{FILL:demo.G2.short}}', sub: '{{FILL:demo.G2.sub}}', band: C.blue, kf: [[r1.punch + 0.8, ...ENTRY], [r1.punch + 2.2, ...PARK('q2')], [r1.punch + 3.0, ...PARK('q3')], [r1.punch + 4.2, ...SLOT('G', 1)]] },
};
function gateBox(ctx, k, label, t, t0, glow) {
  const a = sm(prog(t, t0, t0 + 0.6)); if (a <= 0) return;
  const [x, y] = W1[k]; const qh = QH[k];
  ctx.save(); ctx.globalAlpha *= a;
  box(ctx, x - QW / 2, y - qh / 2, QW, qh, 18, glow ? 'rgba(242,182,92,.22)' : 'rgba(201,138,34,.07)', glow ? '#d98a12' : C.amber, glow ? 8 : 4);
  const n = qh > 120 ? 2 : 1;
  if (n === 2) wrap(ctx, label, x - QW / 2 + 34, y - 10, QW - 68, 58, { px: 44, w: 700, color: C.ink });
  else text(ctx, label, x, y + 16, { px: 46, w: 700, color: C.ink, align: 'center' });
  ctx.restore();
}
function slotBox(ctx, x, y, title, sub, t, t0, color, glow) {
  const a = sm(prog(t, t0, t0 + 0.6)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  box(ctx, x - SW / 2, y - SH / 2, SW, SH, 18, glow ? 'rgba(255,214,140,.32)' : 'rgba(255,255,255,.35)', color, glow ? 8 : 5);
  text(ctx, title, x - SW / 2 + 28, y - SH / 2 + 70, { px: 50, w: 700, color, fam: F.en });
  if (sub) wrap(ctx, sub, x - SW / 2 + 28, y - SH / 2 + 120, 452, 36, { px: 28, color: C.inkDim });
  ctx.restore();
}
function branch(ctx, pts, label, lx, ly, t, t0, color = C.ink) {
  const u = io(t, t0, t0 + 0.8); if (u <= 0) return;
  pathArrow(ctx, pts, color, 6, u, 22);
  if (label && u > 0.6) text(ctx, label, lx, ly, { px: 40, w: 700, color, align: 'center' });
}
function drawCard1(ctx, c, p, glow) {
  const e = c.id ? T[c.id] : c;
  const w = lerp(SMALL[0], BIG[0], p.b), h = lerp(SMALL[1], BIG[1], p.b);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; box(ctx, 0, 0, w, h, 6, '#fffdf6'); ctx.shadowColor = 'transparent';
  ctx.fillStyle = c.band; ctx.fillRect(0, 0, w, 10);
  if (glow) { ctx.save(); ctx.globalAlpha = glow; ctx.strokeStyle = '#f0a020'; ctx.lineWidth = 10; rr(ctx, -6, -6, w + 12, h + 12, 12); ctx.stroke(); ctx.restore(); }
  if (p.b > 0.5) { ctx.globalAlpha *= sm(prog(p.b, 0.5, 1)); wrap(ctx, e.text, 22, 56, w - 44, 42, { px: 33, w: 700, color: C.ink }); if (e.sub) text(ctx, e.sub, 22, h - 14, { px: 26, color: C.inkDim }); }
  else { ctx.globalAlpha *= sm(prog(0.5 - p.b, 0, 0.5)); text(ctx, c.short, w / 2, h / 2 + 14, { px: c.short.length > 7 ? 34 : 40, w: 700, color: C.ink, align: 'center' }); }
  ctx.restore();
}
// a glowing dot that walks a polyline (recall: "walk the flow once and stop on the question")
export function tracer(ctx, pts, u, color = '#ffb43c', r = 18) {
  if (u <= 0) return; const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  const at = (v) => { let rem = tot * clamp(v); for (let i = 1; i < pts.length; i++) { if (rem <= L[i - 1]) { const k = rem / L[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; } rem -= L[i - 1]; } return pts[pts.length - 1]; };
  for (let k = 8; k >= 0; k--) { const [x, y] = at(u - k * 0.012); ctx.globalAlpha = (1 - k / 9) * 0.5; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * (1 - k / 14), 0, 7); ctx.fill(); }
  const [x, y] = at(u); const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.3, 'rgba(255,190,80,.7)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
}
export function drawBoard1(ctx, w, h, t) {
  boardBase(ctx, w, h, 1);
  const rcd = r1.recall; const qz = B.quiz.q1; const inQuiz = Math.min(sm(prog(t, qz.q - 1.5, qz.q - 0.5)), 1 - sm(prog(t, qz.end, qz.end + 0.5)));
  const rk = Math.min(sm(prog(t, rcd.q - 0.6, rcd.q + 0.4)), 1 - sm(prog(t, rcd.c1 + 3.5, rcd.c1 + 4.5)));
  const back = Math.min(1 - 0.55 * rk, 1 - 0.55 * inQuiz);   // the board stays bright; only the parts that are not the clue step back
  const hideRules = 1 - inQuiz;
  const recallOn = rk > 0.01;
  if (on('r1.q', t)) { ctx.save(); ctx.globalAlpha = ap('r1.q', t, 1) * back; text(ctx, T['r1.q'].text, 90, 118, { px: 76, w: 700, color: C.ink }); ctx.restore(); }
  if (on('r1.q.ddd', t)) { ctx.save(); ctx.globalAlpha = ap('r1.q.ddd', t, 1) * back; text(ctx, T['r1.q.ddd'].text, 92, 190, { px: 44, color: C.inkDim }); ctx.restore(); }
  if (on('r1.start', t)) { const a = ap('r1.start', t); ctx.save(); ctx.globalAlpha = a; box(ctx, W1.start[0] - 300, W1.start[1] - 42, 600, 84, 42, '#fff', C.ink, 3); text(ctx, T['r1.start'].text, W1.start[0], W1.start[1] + 15, { px: 42, w: 500, color: C.ink, align: 'center' }); ctx.restore(); arrow(ctx, W1.start[0], W1.start[1] + 44, W1.q1[0], W1.q1[1] - QH.q1 / 2 - 6, C.ink, 5, 18, a); }
  const parkedAt = (k) => Object.values(CARDS1).some(c => { const p = pathAt(t, c.kf); const pk = PARK(k); return t > c.kf[0][0] && Math.abs(p.x - pk[0]) < 3 && Math.abs(p.y - pk[1]) < 3; });
  ctx.save(); ctx.globalAlpha = back; gateBox(ctx, 'q1', T['r1.q1'].text, t, T['r1.q1'].t0, parkedAt('q1')); ctx.restore();
  gateBox(ctx, 'q2', T['r1.q2'].text, t, T['r1.q2'].t0, parkedAt('q2') || recallOn);
  gateBox(ctx, 'q3', T['r1.q3'].text, t, T['r1.q3'].t0, parkedAt('q3') || recallOn);
  const L = (k) => W1[k][0] - QW / 2, Rs = (k) => W1[k][0] + SW / 2 + 8;
  branch(ctx, [[L('q1'), W1.q1[1]], [Rs('E'), W1.E[1]]], SHELL_UI.yes,(L('q1') + Rs('E')) / 2, W1.q1[1] - 18, t, r1.A + 11, C.green);
  branch(ctx, [[W1.q1[0], W1.q1[1] + QH.q1 / 2], [W1.q2[0], W1.q2[1] - QH.q2 / 2 - 6]], SHELL_UI.no,W1.q1[0] + 46, (W1.q1[1] + QH.q1 / 2 + W1.q2[1] - QH.q2 / 2) / 2 + 14, t, r1.Bk + 3.6, C.red);
  branch(ctx, [[L('q2'), W1.q2[1]], [Rs('D'), W1.D[1]]], T['r1.br2'].text, (L('q2') + Rs('D')) / 2 + 6, W1.q2[1] - 18, t, T['r1.br2'].t0, C.red);
  branch(ctx, [[W1.q2[0], W1.q2[1] + QH.q2 / 2], [W1.q3[0], W1.q3[1] - QH.q3 / 2 - 6]], SHELL_UI.yes,W1.q2[0] + 46, (W1.q2[1] + QH.q2 / 2 + W1.q3[1] - QH.q3 / 2) / 2 + 14, t, r1.C + 5.2, C.green);
  branch(ctx, [[L('q3'), W1.q3[1]], [Rs('Tt'), W1.Tt[1]]], SHELL_UI.no,(L('q3') + Rs('Tt')) / 2, W1.q3[1] - 18, t, T['r1.slotT'].t0 - 0.6, C.red);
  branch(ctx, [[W1.q3[0], W1.q3[1] + QH.q3 / 2], [W1.G[0], W1.G[1] - SH / 2 - 6]], SHELL_UI.yes,W1.q3[0] + 46, (W1.q3[1] + QH.q3 / 2 + W1.G[1] - SH / 2) / 2 + 12, t, T['r1.slotG'].t0 - 0.8, C.green);
  ctx.save(); ctx.globalAlpha = back; slotBox(ctx, ...W1.E, T['r1.slotE'].text, T['r1.slotE'].sub, t, T['r1.slotE'].t0, C.green, false); ctx.restore();
  slotBox(ctx, ...W1.D, T['r1.slotD'].text, T['r1.slotD'].sub, t, T['r1.slotD'].t0, C.blue, recallOn);
  ctx.save(); ctx.globalAlpha = back; slotBox(ctx, ...W1.Tt, T['r1.slotT'].text, null, t, T['r1.slotT'].t0, C.inkDim, false); ctx.restore();
  slotBox(ctx, ...W1.G, T['r1.slotG'].text, T['r1.slotG'].sub, t, T['r1.slotG'].t0, C.red, recallOn);
  if (on('r1.punch.rule', t)) { ctx.save(); ctx.globalAlpha = ap('r1.punch.rule', t, 0.8) * back * hideRules; ctx.translate(110, 1150); ctx.rotate(-0.012); wrap(ctx, T['r1.punch.rule'].text, 0, 0, 800, 62, { px: 50, w: 700, color: C.red }); ctx.restore(); }
  if (on('r1.wrap', t) && hideRules > 0.01) { ctx.save(); ctx.globalAlpha = hideRules * back; sticky(ctx, 1958, 235, 580, 300, T['r1.wrap'].text.replace('只有', '\n只有').replace('的資料', '\n的資料'), t, T['r1.wrap'].t0, '#f6dc78', 0.015, 36); ctx.restore(); }
  for (const [k, c] of Object.entries(CARDS1)) {
    if (t < c.kf[0][0] - 0.01) continue;
    const p = pathAt(t, c.kf); const pc = k === 'B' || k === 'G2' || k === 'E2';
    const focus = (recallOn && (k === 'B' || k === 'G2')) || (inQuiz > 0.5 && pc);
    const glow = focus ? 0.55 + 0.45 * Math.sin(t * 3) : 0;
    ctx.save(); ctx.globalAlpha = sm(prog(t, c.kf[0][0], c.kf[0][0] + 0.5)) * (focus ? 1 : back); drawCard1(ctx, c, p, glow); ctx.restore();
  }
  if (on('r1.open', t) && hideRules > 0.01) {
    ctx.save(); ctx.globalAlpha = hideRules * back;
    const a = ease.outBack(prog(t, T['r1.open'].t0, T['r1.open'].t0 + 0.6)); const [cx, cy] = SLOT('G', 1);
    ctx.save(); ctx.translate(1928, 1112); ctx.rotate(0.02); ctx.scale(Math.max(0.01, a), Math.max(0.01, a));
    box(ctx, 0, 0, 610, 206, 8, '#1c1d22'); ctx.setLineDash([14, 10]); box(ctx, 10, 10, 590, 186, 6, null, '#e9d9a8', 3); ctx.setLineDash([]);
    wrap(ctx, T['r1.open'].text.replace('：', '：\n').replace('，要直接', '，\n要直接'), 26, 62, 570, 48, { px: 32, w: 500, color: '#f2ead2' });
    ctx.restore();
    if (a > 0.9) arrow(ctx, 1928, 1210, cx + SMALL[0] + 8, cy + SMALL[1] / 2, '#1c1d22', 5, 18, io(t, T['r1.open'].t0 + 0.4, T['r1.open'].t0 + 1));
    ctx.restore();
  }
  // recall: a light walks the flow (start → ① → ②) and waits at ②; at the reveal it splits: left to Domain Service, down to Aggregate
  if (recallOn) {
    ctx.save();
    const p1 = [[W1.start[0], W1.start[1]], [W1.q1[0], W1.q1[1]], [W1.q2[0], W1.q2[1]]];
    const u = io(t, rcd.q + 0.5, rcd.c0);
    if (t < rcd.c1) { tracer(ctx, p1, u); if (u >= 1) { const pulse = 0.5 + 0.5 * Math.sin(t * 4); ctx.globalAlpha = 0.35 + 0.4 * pulse; ctx.strokeStyle = '#ffb43c'; ctx.lineWidth = 10; rr(ctx, W1.q2[0] - QW / 2 - 14, W1.q2[1] - QH.q2 / 2 - 14, QW + 28, QH.q2 + 28, 26); ctx.stroke(); } }
    else { const v = io(t, rcd.c1, rcd.c1 + 2.4); tracer(ctx, [[W1.q2[0], W1.q2[1]], [L('q2'), W1.q2[1]], [Rs('D') + 40, W1.D[1]]], v, '#6fa9f2'); tracer(ctx, [[W1.q2[0], W1.q2[1]], [W1.q3[0], W1.q3[1]], [W1.G[0], W1.G[1]]], v); }
    ctx.restore();
  }
}

// room-1 monitor (1600 x 922)
export function drawMon1(ctx, w, h, t) {
  screenBase(ctx, w, h, '');
  if (t < r1.A + 4) { idleR1(ctx, w, h, t); return; }
  if (t < r1.Bk + 5) return monEntity(ctx, w, h, t);
  if (t < r1.C + 5.5) return monService(ctx, w, h, t);
  return monAggregate(ctx, w, h, t);
}
function idle(ctx, w, h) { ctx.fillStyle = '#1a1e25'; ctx.fillRect(0, 54, w, h - 54); const g = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, w * 0.8); g.addColorStop(0, 'rgba(90,120,170,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 54, w, h - 54); }
function person(ctx, x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.42, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + s * 0.45, s * 0.75, s * 0.55, 0, Math.PI, 0); ctx.fill(); }
// the problem already happening when you walk in: two people pushing changes into one form at the same moment
function idleR1(ctx, w, h, t) {
  idle(ctx, w, h);
  const cx = w / 2, cy = h / 2 + 40; const k = (t * 0.9) % 1;
  person(ctx, 260, cy, 130, C.sBlue); person(ctx, w - 260, cy, 130, C.sViolet);
  box(ctx, cx - 190, cy - 150, 380, 300, 18, '#20242c', k > 0.55 && k < 0.85 ? C.sRed : C.sAmber, 8);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(220,214,200,.35)'; ctx.fillRect(cx - 140, cy - 90 + i * 52, 280 - i * 40, 22); }
  const u = clamp(k / 0.55); const ax = lerp(400, cx - 200, u), bx = lerp(w - 400, cx + 200, u);
  if (k < 0.55) { ctx.fillStyle = C.sBlue; ctx.beginPath(); ctx.arc(ax, cy, 26, 0, 7); ctx.fill(); ctx.fillStyle = C.sViolet; ctx.beginPath(); ctx.arc(bx, cy, 26, 0, 7); ctx.fill(); }
  else if (k < 0.85) { const f = 0.6 + 0.4 * Math.sin(t * 30); cross(ctx, cx, cy, 160, `rgba(242,105,90,${f})`, 18); }
}
function monEntity(ctx, w, h, t) {
  const t0 = T['r1.mA.h1'].t0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t0, t0 + 0.6));
  box(ctx, 40, 90, 600, 790, 18, C.panel);
  text(ctx, T['r1.mA.h1'].text, 70, 160, { px: 44, w: 700, color: C.sRed });
  const callers = [[80, 300], [80, 470], [80, 640]];
  const v = Math.floor(lerp(0, 999, Math.pow(prog(t, t0 + 1, t0 + 7), 2.2)));
  callers.forEach(([x, y], i) => {
    box(ctx, x, y - 40, 150, 80, 12, C.panel2, C.line, 2); ctx.fillStyle = C.faint; for (let k = 0; k < 3; k++) ctx.fillRect(x + 22, y - 18 + k * 18, 90 - k * 20, 8);
    const pulse = (t * 1.3 + i * 0.33) % 1; const u = clamp(prog(t, t0 + 1, t0 + 1.6));
    arrow(ctx, x + 160, y, 380, 470, `rgba(242,105,90,${0.35 + 0.5 * (1 - pulse)})`, 4, 16, u);
  });
  box(ctx, 384, 380, 230, 180, 16, '#2a1e1f', C.sRed, 4);
  text(ctx, String(Math.max(0, v)), 499, 505, { px: 92, w: 700, color: v > 5 ? C.sRed : C.txt, align: 'center', fam: F.en });
  code(ctx, [[T['r1.mA.c1'].text, C.sRed]], 70, 800, { px: 34 });
  ctx.restore();
  const t2 = T['r1.mA.h2'].t0; if (t < t2) return;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t2, t2 + 0.6));
  box(ctx, 660, 90, 900, 790, 18, C.panel);
  text(ctx, T['r1.mA.h2'].text, 690, 160, { px: 44, w: 700, color: C.sGreen });
  const lines = T['r1.mA.c2'].text.split('\n');
  const n = Math.floor(prog(t, t2 + 1.2, t2 + 6.2) * 6.999);
  const bounce = n >= 6;
  // the one line to read is lit; the rest of the method is texture
  code(ctx, lines.map((s2, i) => [s2.replace('        ', '    '), i === 1 || i === 2 ? (bounce ? C.sRed : C.sAmber) : 'rgba(236,231,220,.45)', i === 1 ? 1 : 0]), 690, 240, { px: 28, lh: 50, w: 850, hiColor: bounce ? 'rgba(242,105,90,.24)' : 'rgba(242,182,92,.2)' });
  box(ctx, 1090, 560, 240, 180, 16, '#1d2a22', C.sGreen, 4);
  text(ctx, String(Math.min(5, n)), 1210, 685, { px: 92, w: 700, color: C.sGreen, align: 'center', fam: F.en });
  for (let i = 1; i <= 6; i++) {
    const ti = t2 + 1.2 + (i - 1) * (5 / 6); const u = prog(t, ti, ti + 0.7); if (u <= 0 || u >= 1) continue;
    const back = i === 6 && u > 0.5; const x = back ? lerp(1080, 760, (u - 0.5) * 2) : lerp(760, 1080, u * 2 > 1 ? 1 : u * 2);
    ctx.fillStyle = i === 6 ? C.sRed : C.sGreen; ctx.beginPath(); ctx.arc(x, 650, 18, 0, 7); ctx.fill();
  }
  if (bounce) { const a = sm(prog(t, t2 + 6.2, t2 + 6.8)); ctx.save(); ctx.globalAlpha *= a; cross(ctx, 820, 650, 46, C.sRed, 9); text(ctx, T['r1.mA.6'].text, 820, 760, { px: 34, color: C.sRed, align: 'center' }); ctx.restore(); }
  ctx.restore();
}
function table(ctx, x, y, w, rows, title, color, hl = -1) {
  box(ctx, x, y, w, 64 + rows * 38, 12, C.panel2, color, 3);
  text(ctx, title, x + 20, y + 44, { px: 32, w: 700, color });
  for (let i = 0; i < rows; i++) { ctx.fillStyle = i === hl ? 'rgba(242,182,92,.35)' : 'rgba(200,200,190,.16)'; ctx.fillRect(x + 20, y + 76 + i * 38, w - 40 - (i % 3) * 30, 18); }
}
function eye(ctx, x, y, s, color) { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, 0, 0, 7); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, s * 0.25, 0, 7); ctx.fill(); }
function monService(ctx, w, h, t) {
  const t0 = T['r1.mB.tables'].t0; const a0 = sm(prog(t, t0, t0 + 0.6));
  ctx.save(); ctx.globalAlpha = a0;
  const src = T['r1.mB.tables'].text.split('・').slice(0, 4);
  src.forEach((s2, i) => { table(ctx, 50, 90 + i * 172, 380, 2, s2, C.sBlue); eye(ctx, 390, 120 + i * 172, 18, C.sBlue); });
  if (t > T['r1.mB.ro'].t0) { ctx.save(); ctx.globalAlpha *= ap('r1.mB.ro', t); text(ctx, T['r1.mB.ro'].text, 240, 840, { px: 40, w: 700, color: C.sBlue, align: 'center' }); ctx.restore(); }
  box(ctx, 640, 330, 340, 260, 24, '#1f2633', C.sAmber, 5);
  text(ctx, T['r1.mB.tables'].text.split('・')[4], 810, 470, { px: 40, w: 700, color: C.sAmber, align: 'center' });
  ctx.save(); ctx.translate(810, 400); ctx.rotate(t * 1.2); ctx.strokeStyle = C.sAmber; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.stroke(); for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = C.sAmber; ctx.fillRect(-6, -40, 12, 14); } ctx.restore();
  src.forEach((s2, i) => {
    const y = 160 + i * 172; const u = io(t, t0 + 0.6 + i * 0.25, t0 + 1.6 + i * 0.25);
    arrow(ctx, 432, y, 636, 380 + i * 40, 'rgba(111,169,242,.6)', 4, 16, u);
    for (let k = 0; k < 3; k++) { const p = ((t - t0) * 0.7 + k / 3 + i * 0.13) % 1; if (t > t0 + 1.6) { ctx.fillStyle = C.sBlue; ctx.beginPath(); ctx.arc(lerp(432, 636, p), lerp(y, 380 + i * 40, p), 9, 0, 7); ctx.fill(); } }
  });
  const ot = T['r1.mB.out'].t0; if (t > ot) {
    const u = io(t, ot, ot + 0.8); arrow(ctx, 984, 460, 1130, 460, C.sAmber, 5, 18, u);
    const rows = Math.floor(prog(t, ot + 0.8, ot + 3.5) * 6.99);
    box(ctx, 1140, 280, 400, 64 + 6 * 38, 12, '#2a2418', C.sAmber, 4); text(ctx, T['r1.mB.out'].text, 1160, 324, { px: 34, w: 700, color: C.sAmber });
    for (let i = 0; i < rows; i++) { ctx.fillStyle = 'rgba(242,182,92,.55)'; ctx.fillRect(1160, 356 + i * 38, 300 - (i % 3) * 40, 18); }
  }
  ctx.restore();
}
function cursorAt(ctx, x, y) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y + 30); ctx.lineTo(x + 12, y + 30); ctx.lineTo(x + 18, y + 46); ctx.lineTo(x + 11, y + 48); ctx.lineTo(x + 5, y + 33); ctx.lineTo(x - 4, y + 42); ctx.closePath(); ctx.fill(); ctx.stroke(); }
const UI1 = T['r1.mC.ui'].text.split('・');   // 審核人 A・審核人 B・核准・審核單・待一審／待二審
function reviewer(ctx, x, y, label, active, press, color) {
  ctx.save(); ctx.globalAlpha *= active ? 1 : 0.3;
  box(ctx, x, y, 420, 250, 14, C.panel2, active ? color : C.line, 3);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 50, y + 52, 20, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 50, y + 100, 32, 22, 0, Math.PI, 0); ctx.fill();
  text(ctx, label, x + 96, y + 64, { px: 32, w: 700, color: C.txt });
  for (let k = 0; k < 3; k++) { box(ctx, x + 30, y + 130 + k * 26, 18, 18, 3, null, C.dim, 2); ctx.fillStyle = C.faint; ctx.fillRect(x + 60, y + 134 + k * 26, 180 - k * 30, 10); }
  box(ctx, x + 280, y + 170, 116, 56, 10, press ? '#e7f6ec' : color, null);
  text(ctx, UI1[2], x + 338, y + 208, { px: 30, w: 700, color: press ? color : '#11161c', align: 'center' });
  ctx.restore();
}
function record(ctx, x, y, state, stamps, bad, totals) {
  box(ctx, x, y, 380, 270, 14, '#20242c', bad ? C.sRed : C.sAmber, 4);
  text(ctx, UI1[3], x + 24, y + 50, { px: 32, w: 700, color: C.sAmber });
  text(ctx, state, x + 24, y + 104, { px: 30, color: C.txt });
  // the total: one bar normally; two different bars when both writes land (the data no longer agrees)
  totals.forEach(([wv, col], i) => { ctx.fillStyle = col; ctx.fillRect(x + 24, y + 128 + i * 26, wv, 16); });
  stamps.forEach((s2, i) => { ctx.save(); ctx.translate(x + 110 + i * 70, y + 210); ctx.rotate(-0.2 + i * 0.35); ctx.strokeStyle = s2; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke(); check(ctx, 0, 0, 36, s2, 6); ctx.restore(); });
}
function monAggregate(ctx, w, h, t) {
  const ph1 = T['r1.mC.1'].t0, ph2 = T['r1.mC.2'].t0, ph3 = T['r1.mC.3'].t0;
  const phase = t < ph2 ? 1 : t < ph3 ? 2 : 3; const p0 = phase === 1 ? ph1 : phase === 2 ? ph2 : ph3;
  const lt = t - p0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, ph1 - 0.5, ph1 + 0.1));
  wrap(ctx, T['r1.mC.' + phase].text, 60, 116, w - 120, 48, { px: 38, w: 700, color: phase === 2 ? C.sRed : phase === 3 ? C.sGreen : C.txt });
  const A = [70, 200], Bp = [1110, 200], R = [610, 560];
  const twoPeople = phase > 1; const press = lt > 1.4;
  reviewer(ctx, ...A, UI1[0], true, press, C.sBlue);
  reviewer(ctx, ...Bp, UI1[1], twoPeople, twoPeople && press, C.sViolet);
  if (!press) { cursorAt(ctx, lerp(A[0] + 200, A[0] + 330, io(lt, 0.2, 1.3)), lerp(A[1] + 120, A[1] + 196, io(lt, 0.2, 1.3))); if (twoPeople) cursorAt(ctx, lerp(Bp[0] + 200, Bp[0] + 330, io(lt, 0.2, 1.3)), lerp(Bp[1] + 120, Bp[1] + 196, io(lt, 0.2, 1.3))); }
  const gate = phase === 3; const G = [800, 500];
  // the paths every request takes (so "who goes where" is visible in a still)
  const toRec = [R[0] + 190, R[1]];
  const paths = [[[A[0] + 338, A[1] + 230], gate ? G : toRec]]; if (twoPeople) paths.push([[Bp[0] + 338, Bp[1] + 230], gate ? G : toRec]);
  paths.forEach(([f, to], i) => { ctx.save(); ctx.setLineDash([12, 10]); ctx.globalAlpha *= 0.55; arrow(ctx, f[0], f[1], to[0], to[1] - (gate ? 46 : 8), i ? C.sViolet : C.sBlue, 4, 16, 1); ctx.restore(); });
  if (gate) { ctx.save(); ctx.globalAlpha *= sm(prog(lt, 0, 0.6)); box(ctx, G[0] - 70, G[1] - 40, 140, 80, 12, '#2b2a1c', C.sAmber, 4);
    const locked = lt > 2.25; ctx.strokeStyle = C.sAmber; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(G[0], G[1] - 8, 16, Math.PI, locked ? 0 : -0.6); ctx.stroke(); box(ctx, G[0] - 22, G[1] - 6, 44, 34, 6, C.sAmber); ctx.restore();
    arrow(ctx, G[0], G[1] + 42, toRec[0], toRec[1] - 8, C.sAmber, 4, 16, 1); }
  const reqs = [[A, C.sBlue, 0]]; if (twoPeople) reqs.push([Bp, C.sViolet, gate ? 0.35 : 0.05]);
  const stamps = []; let bounced = false;
  reqs.forEach(([Pp, col, delay], i) => {
    const s0 = 1.5 + delay, u = prog(lt, s0, s0 + 1.0);
    const from = [Pp[0] + 338, Pp[1] + 230], to = gate ? G : toRec;
    if (u > 0 && u < 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lerp(from[0], to[0], u), lerp(from[1], to[1], u), 16, 0, 7); ctx.fill(); }
    if (u >= 1) {
      if (gate && i === 1) { const ub = prog(lt, s0 + 1.0, s0 + 2.0); bounced = true; if (ub < 1) { ctx.fillStyle = C.sRed; ctx.beginPath(); ctx.arc(lerp(to[0], from[0], ub), lerp(to[1], from[1], ub), 16, 0, 7); ctx.fill(); } }
      else stamps.push(col);
    }
  });
  const states = UI1[4].split('／');
  const bad = phase === 2 && stamps.length === 2;
  const totals = bad ? [[300, C.sBlue], [200, C.sViolet]] : stamps.length ? [[260, C.sAmber]] : [[300, 'rgba(200,200,190,.3)']];
  record(ctx, ...R, stamps.length ? states[1] : states[0], stamps, bad, totals);
  if (bad) { cross(ctx, R[0] + 320, R[1] + 140, 54, C.sRed, 10); }
  if ((phase === 1 || phase === 3) && stamps.length) check(ctx, R[0] + 320, R[1] + 140, 54, C.sGreen, 10);
  if (bounced) { const a = sm(prog(lt, 3.0, 3.5)); ctx.save(); ctx.globalAlpha *= a; box(ctx, Bp[0] + 60, Bp[1] + 280, 300, 70, 12, '#3a1d1d', C.sRed, 3); text(ctx, T['r1.mC.409'].text, Bp[0] + 210, Bp[1] + 327, { px: 38, w: 700, color: C.sRed, align: 'center' }); ctx.restore(); }
  if (on('r1.mC.code', t)) { ctx.save(); ctx.globalAlpha *= ap('r1.mC.code', t) * 0.7; code(ctx, T['r1.mC.code'].text.split('・').map(s2 => [s2, C.dim]), 60, 860, { px: 26, lh: 34 }); ctx.restore(); }
  ctx.restore();
  void w; void h;
}

/* ======================================================================= ROOM 2 — .NET 效能 */
const r2 = B.r2;
// what sits inside each box of the scale ladder (so the boxes are never empty)
function miniProgram(ctx, x, y, w, h, a) { ctx.save(); ctx.globalAlpha *= a; box(ctx, x, y, w, h, 12, 'rgba(44,103,163,.07)', 'rgba(44,103,163,.5)', 3); for (let i = 0; i < 4; i++) { box(ctx, x + 24 + i * (w - 48) / 4, y + 26, (w - 48) / 4 - 16, 40, 6, 'rgba(44,103,163,.18)'); } ctx.restore(); }
function miniMethod(ctx, x, y, w, a) { ctx.save(); ctx.globalAlpha *= a; for (let i = 0; i < 4; i++) { ctx.fillStyle = i === 1 ? 'rgba(201,138,34,.55)' : 'rgba(201,138,34,.25)'; ctx.fillRect(x + (i ? 40 : 0), y + i * 34, w - 140 - (i % 2) * 120, 18); } ctx.restore(); }
function miniLine(ctx, x, y, w, a) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(46,134,86,.6)'; ctx.fillRect(x, y, w, 20); ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k < w; k += 14) ctx.lineTo(x + k, y + 30 + (k / 14 % 2 ? 5 : -2)); ctx.stroke(); ctx.restore(); }
export function drawBoard2(ctx, w, h, t) {
  boardBase(ctx, w, h, 2);
  const rcd = r2.recall; const rk = Math.min(sm(prog(t, rcd.q - 0.6, rcd.q + 0.4)), 1 - sm(prog(t, rcd.c1 + 3.5, rcd.c1 + 4.5)));
  const back = 1 - 0.5 * rk;
  if (on('r2.q', t)) { ctx.save(); ctx.globalAlpha = ap('r2.q', t, 1) * back; text(ctx, T['r2.q'].text, 90, 118, { px: 76, w: 700, color: C.ink }); ctx.restore(); }
  const L = [
    { id: 'r2.scale1', x: 120, y: 240, w: 1500, h: 1080, col: C.blue },
    { id: 'r2.scale2', x: 270, y: 470, w: 1050, h: 700, col: C.amber },
    { id: 'r2.scale3', x: 420, y: 720, w: 560, h: 330, col: C.green },
  ];
  L.forEach((l, i) => {
    const a = ap(l.id, t, 0.8); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    box(ctx, l.x, l.y, l.w, l.h, 22, rk > 0.01 ? 'rgba(255,214,140,.10)' : null, l.col, 6 + rk * 3);
    text(ctx, T[l.id].text, l.x + 30, l.y + 66, { px: 50, w: 700, color: l.col });
    if (i === 0) { miniProgram(ctx, l.x + 1080, l.y + 110, 380, 150, 1); }
    if (i === 1) { miniMethod(ctx, l.x + 640, l.y + 110, 520, 1); }
    if (i === 2) { miniLine(ctx, l.x + 40, l.y + 150, 360, 1); }
    ctx.restore();
  });
  if (on('r2.wrap', t)) sticky(ctx, 1690, 300, 790, 470, T['r2.wrap'].text.replace('手寫', '\n手寫').replace('內建', '\n內建'), t, T['r2.wrap'].t0, '#f6dc78', 0.02, 44);
  // recall: a light goes round the three boxes, small to big, and waits at the question mark
  if (rk > 0.01) {
    const loop = (l) => [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h], [l.x, l.y]];
    const segs = [loop(L[2]), loop(L[1]), loop(L[0])];
    const u = prog(t, rcd.q + 0.4, rcd.c0 + 3) * 3;
    ctx.save();
    if (t < rcd.c1) { const i = Math.min(2, Math.floor(u)); if (u < 3) tracer(ctx, segs[i], u - i); else { const pulse = 0.5 + 0.5 * Math.sin(t * 4); ctx.globalAlpha = 0.6 + 0.4 * pulse; text(ctx, '?', L[0].x + L[0].w + 50, L[0].y + 560, { px: 140, w: 700, color: '#d98a12', keep: true }); } }
    else { const v = io(t, rcd.c1, rcd.c1 + 2); tracer(ctx, loop(L[0]), v, '#6fa9f2', 22); }
    ctx.restore();
  }
}
function sticky(ctx, x, y, w, h, s2, t, t0, bg, rot, px = 50) {
  const a = ease.outBack(prog(t, t0, t0 + 0.6)); if (a <= 0) return;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot + (1 - a) * 0.3); ctx.scale(Math.max(0.01, a), Math.max(0.01, a)); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(0, 0, w, 26);
  wrap(ctx, s2, 36, 40 + px * 1.05, w - 72, px * 1.28, { px, w: 700, color: C.ink });
  ctx.restore();
}
export function drawMon2(ctx, w, h, t) {
  screenBase(ctx, w, h, '');
  if (t < r2.cas) return idleR2(ctx, w, h, t);
  if (t < r2.prof) return monCase(ctx, w, h, t);
  if (t < r2.bench) return monProfiler(ctx, w, h, t);
  if (t < r2.anal) return monBench(ctx, w, h, t);
  if (t < r2.recall.q) return monAnalyzer(ctx, w, h, t);
  if (t >= r2.wrap) { ctx.fillStyle = '#111317'; ctx.fillRect(0, 54, w, h - 54); img(ctx, 'perf', 30, 120, w - 60, (w - 60) * 578 / 1280, sm(prog(t, r2.wrap, r2.wrap + 1))); return; }
  return monAnalyzer(ctx, w, h, r2.recall.q - 0.01);
}
// the problem already happening when you walk in: a progress bar that crawls and stops, a spinner that never ends
function idleR2(ctx, w, h, t) {
  idle(ctx, w, h);
  const p = Math.min(0.83, 1 - Math.exp(-((t * 0.2) % 6)));
  box(ctx, 200, 520, 1200, 60, 30, '#262b33'); box(ctx, 200, 520, 1200 * p, 60, 30, p > 0.8 ? C.sRed : C.sAmber);
  ctx.save(); ctx.translate(800, 330); ctx.rotate(t * 3); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = `rgba(236,231,220,${0.12 + 0.07 * i})`; ctx.fillRect(-8, -110, 16, 46); } ctx.restore();
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r + 5; i++) { ctx.fillStyle = r === 3 ? 'rgba(242,105,90,.7)' : 'rgba(150,150,150,.3)'; ctx.fillRect(420 + i * 44, 650 + r * 40, 36, 28); }
}
const NS = [5, 50, 500, 5000, 50000, 500000];
function monCase(ctx, w, h, t) {
  const t0 = T['r2.case.h'].t0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t0, t0 + 0.6));
  text(ctx, T['r2.case.h'].text, 50, 112, { px: 36, w: 700, color: C.sAmber });
  code(ctx, [[T['r2.case.code'].text, 'rgba(236,231,220,.55)']], 50, 166, { px: 26 });
  // each add: a new array one longer, every old block copied down (the work grows each time)
  const fs = prog(t, t0 + 1, t0 + 8) * 9; const n = Math.min(10, 2 + Math.floor(fs)); const f = fs % 1;
  for (let i = 0; i < n - 1; i++) { ctx.fillStyle = 'rgba(150,150,150,.45)'; ctx.fillRect(60 + i * 56, 220, 46, 36); }
  for (let i = 0; i < n; i++) { const done = i < (n - 1) * Math.min(1, f * 1.6); const last = i === n - 1;
    ctx.fillStyle = last ? (f > 0.7 ? C.sAmber : 'rgba(242,182,92,.15)') : done ? 'rgba(242,105,90,.85)' : 'rgba(242,105,90,.12)'; ctx.fillRect(60 + i * 56, 290, 46, 36);
    if (!last && done) { ctx.strokeStyle = 'rgba(242,105,90,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(83 + i * 56, 258); ctx.lineTo(83 + i * 56, 288); ctx.stroke(); } }
  const moved = (n - 1) * (n - 2) / 2 + Math.floor((n - 1) * Math.min(1, f * 1.6));
  text(ctx, T['r2.case.count'].text.replace('10', String(n)).replace('36', String(moved)), 680, 290, { px: 32, w: 700, color: C.sRed });
  const X0 = 220, X1 = 1500, Y0 = 860, Y1 = 430;
  const AX = T['r2.case.axis'].text.split('・');
  const at = T['r2.case.axis'].t0; const aa = sm(prog(t, at, at + 0.6));
  ctx.save(); ctx.globalAlpha = aa;
  ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, Y1 - 20); ctx.lineTo(X0, Y0); ctx.lineTo(X1 + 20, Y0); ctx.stroke();
  NS.forEach((n2, i) => { const x = lerp(X0 + 40, X1 - 40, i / 5); text(ctx, AX[i], x, Y0 + 44, { px: 30, color: C.dim, align: 'center' }); });
  text(ctx, AX[6], X1 + 60, Y0 + 44, { px: 26, color: C.faint, align: 'left' });
  const sw = prog(t, at + 0.8, at + 11);
  const fx = (i) => lerp(X0 + 40, X1 - 40, i / 5);
  const yCopy = (i) => Y0 - 6 - i * 9;
  const yMan = (i) => Y0 - 6 - [0, 1, 4, 26, 120, 520][i] * 0.9;
  const draw = (fy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath(); const S = sw * 5; for (let k = 0; k <= 50; k++) { const s3 = (k / 50) * S; const i0 = Math.floor(s3), i1 = Math.min(5, i0 + 1), f2 = s3 - i0; const x = lerp(fx(i0), fx(i1), f2), y = lerp(fy(i0), fy(i1), f2); if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, Math.max(Y1 - 60, y)); } ctx.stroke(); };
  draw(yCopy, C.sGreen); draw(yMan, C.sRed);
  const LEG = T['r2.case.leg'].text.split('／');
  if (sw > 0.02) text(ctx, LEG[1], X1 - 10, yCopy(5) - 18, { px: 30, w: 700, color: C.sGreen, align: 'right' });
  if (sw > 0.85) text(ctx, LEG[0], fx(5) - 30, Y1 - 10, { px: 30, w: 700, color: C.sRed, align: 'right' });
  const nNow = Math.round(Math.pow(10, lerp(Math.log10(5), Math.log10(500000), sw)));
  text(ctx, AX[7].replace('500,000', nNow.toLocaleString('en-US')), X0 + 30, Y1 + 30, { px: 40, w: 700, color: C.txt, fam: F.en });
  if (on('r2.case.l', t)) { ctx.save(); ctx.globalAlpha *= ap('r2.case.l', t); box(ctx, X0 + 30, Y0 - 160, 640, 74, 12, 'rgba(111,169,242,.12)', C.sBlue, 2); text(ctx, T['r2.case.l'].text, X0 + 350, Y0 - 110, { px: 32, w: 700, color: C.sBlue, align: 'center' }); ctx.restore(); }
  if (on('r2.case.r', t)) { ctx.save(); ctx.globalAlpha *= ap('r2.case.r', t); box(ctx, 640, Y1 + 70, 620, 112, 12, 'rgba(242,105,90,.14)', C.sRed, 2); wrap(ctx, T['r2.case.r'].text, 662, Y1 + 116, 580, 44, { px: 32, w: 700, color: C.sRed }); ctx.restore(); }
  ctx.restore();
  ctx.restore();
}
function monProfiler(ctx, w, h, t) {
  const t0 = T['r2.prof.h'].t0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t0, t0 + 0.6));
  wrap(ctx, T['r2.prof.h'].text, 50, 112, w - 100, 48, { px: 36, w: 700, color: C.sBlue });
  const UI = T['r2.prof.ui'].text.split('・');   // CPU Usage・Hot Path・Main・…・ManualArrayCopier.Add
  box(ctx, 50, 200, 520, 300, 12, C.panel); text(ctx, UI[0], 70, 240, { px: 28, color: C.dim, fam: F.en });
  ctx.strokeStyle = C.sBlue; ctx.lineWidth = 3; ctx.beginPath(); const r = rng(5); for (let i = 0; i <= 60; i++) { const x = 70 + i * 8, y = 470 - (i > 18 ? 180 + r() * 40 : 30 + r() * 30); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  box(ctx, 610, 200, 940, 300, 12, C.panel);
  const rows = [UI[1], UI[2], '  ' + UI[3], '    ' + UI[4]];
  const reveal = prog(t, t0 + 1.5, t0 + 4.5) * 1.01;
  rows.forEach((s2, i) => { if (i / rows.length > reveal) return; const y = 250 + i * 62; const hot = i === 3; const sel = hot && t > t0 + 6;
    if (sel) box(ctx, 620, y - 40, 920, 56, 8, 'rgba(242,182,92,.18)');
    if (i > 0) { const bw = [0, 330, 310, 290][i]; ctx.fillStyle = hot ? C.sRed : 'rgba(111,169,242,.5)'; ctx.fillRect(1180, y - 26, bw, 22); }
    text(ctx, s2, 640, y, { px: i === 0 ? 30 : 32, w: i === 0 ? 700 : 500, color: i === 0 ? C.dim : hot ? C.sAmber : C.txt, fam: F.code }); });
  if (t > T['r2.prof.hot'].t0) { ctx.save(); ctx.globalAlpha *= ap('r2.prof.hot', t); box(ctx, 1240, 410, 120, 56, 28, C.sRed); text(ctx, T['r2.prof.hot'].text, 1300, 450, { px: 32, w: 700, color: '#fff', align: 'center' }); ctx.restore(); }
  if (t > t0 + 5) { const u = io(t, t0 + 5, t0 + 6); cursorAt(ctx, lerp(1300, 760, u), lerp(650, 440, u)); }
  if (t > t0 + 6.5) { const a = sm(prog(t, t0 + 6.5, t0 + 7.2)); ctx.save(); ctx.globalAlpha *= a; box(ctx, 50, 540, 1500, 330, 12, '#171a20');
    const lines = T['r2.prof.code'].text.split('\n');
    code(ctx, lines.map((s2, i) => [s2, i === 1 || i === 2 ? C.sRed : 'rgba(236,231,220,.55)', i === 1 ? 1 : 0]), 80, 610, { px: 30, lh: 56, w: 1460, hiColor: 'rgba(242,105,90,.2)' });
    ctx.restore(); }
  ctx.restore();
}
function bar(ctx, x, y, wpx, hpx, col, label, val) { ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(3, wpx), hpx); if (label) text(ctx, label, x - 16, y + hpx * 0.75, { px: 30, color: C.txt, align: 'right', fam: F.code }); if (val) text(ctx, val, x + Math.max(3, wpx) + 16, y + hpx * 0.75, { px: 30, w: 700, color: col, fam: F.en }); }
function monBench(ctx, w, h, t) {
  const t0 = T['r2.bench.h'].t0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t0, t0 + 0.6));
  text(ctx, T['r2.bench.h'].text, 50, 112, { px: 36, w: 700, color: C.sAmber });
  if (on('r2.bench.ex', t)) { ctx.save(); ctx.globalAlpha *= ap('r2.bench.ex', t); text(ctx, T['r2.bench.ex'].text, 50, 168, { px: 32, w: 500, color: C.txt }); ctx.restore(); }
  box(ctx, 50, 200, 1500, 190, 12, C.panel);
  code(ctx, T['r2.bench.code'].text.split('\n').map((s2, i) => [s2, i === 0 ? 'rgba(179,156,245,.6)' : 'rgba(236,231,220,.55)']), 80, 256, { px: 27, lh: 48 });
  const rt = T['r2.bench.res'].t0; const run = prog(t, rt - 3, rt);
  box(ctx, 50, 410, 1500, 18, 9, C.panel); box(ctx, 50, 410, 1500 * run, 18, 9, C.sAmber);
  if (t >= rt) { const u = io(t, rt, rt + 1.2); const UI = T['r2.bench.ui'].text.split('・'); const RES = T['r2.bench.res'].text.split('／');
    text(ctx, UI[0], 420, 490, { px: 30, color: C.dim, align: 'center' }); text(ctx, UI[1], 1110, 490, { px: 30, color: C.dim, align: 'center' });
    bar(ctx, 420, 520, 460 * u, 50, C.sRed, '', ''); bar(ctx, 420, 600, 10 * u, 50, C.sGreen, '', '');
    bar(ctx, 1110, 520, 360 * u, 50, C.sRed, '', ''); bar(ctx, 1110, 600, 2 * u, 50, C.sGreen, '', '');
    text(ctx, RES[0], 60, 700, { px: 38, w: 700, color: C.sRed, fam: F.code }); text(ctx, RES[1], 60, 760, { px: 38, w: 700, color: C.sGreen, fam: F.code });
    if (on('r2.bench.note', t)) text(ctx, T['r2.bench.note'].text, 1540, 760, { px: 30, color: C.dim, align: 'right' });
    text(ctx, UI[2], 1540, 860, { px: 24, color: C.faint, align: 'right' }); }
  ctx.restore();
}
function monAnalyzer(ctx, w, h, t) {
  const t0 = T['r2.anal.h'].t0;
  ctx.save(); ctx.globalAlpha = sm(prog(t, t0, t0 + 0.6));
  text(ctx, T['r2.anal.h'].text, 50, 112, { px: 36, w: 700, color: C.sGreen });
  const CO = T['r2.anal.code'].text.split('・');   // props, two settings, Program.cs, line, CA1825, Ctrl+.
  box(ctx, 50, 150, 1500, 160, 12, C.panel); text(ctx, CO[0], 1530, 182, { px: 24, color: C.faint, align: 'right', fam: F.code });
  code(ctx, [[CO[1], 'rgba(111,169,242,.7)'], [CO[2], 'rgba(111,169,242,.7)']], 80, 220, { px: 30, lh: 50 });
  const et = T['r2.anal.err'].t0; const fixed = t > et + 2.6;
  box(ctx, 50, 340, 1500, 150, 12, C.panel); text(ctx, CO[3], 1530, 372, { px: 24, color: C.faint, align: 'right', fam: F.code });
  code(ctx, [[fixed ? 'return Array.Empty<int>();' : CO[4], fixed ? C.sGreen : C.txt]], 80, 432, { px: 34 });
  if (!fixed && t > T['r2.anal.code'].t0 + 1.2) { ctx.strokeStyle = C.sRed; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 250; x < 400; x += 10) ctx.lineTo(x, 446 + (x / 10 % 2 ? 5 : -2)); ctx.stroke(); }
  if (t > et) { const a = sm(prog(t, et, et + 0.4));
    ctx.save(); ctx.globalAlpha *= a; box(ctx, 50, 520, 1500, 120, 12, fixed ? '#17261d' : '#2d1a1a', fixed ? C.sGreen : C.sRed, 4);
    if (fixed) check(ctx, 130, 580, 60, C.sGreen, 10); else cross(ctx, 130, 580, 56, C.sRed, 10);
    text(ctx, fixed ? '' : CO[5], 200, 596, { px: 34, w: 700, color: C.sRed, fam: F.code });
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= ap('r2.anal.err', t); text(ctx, T['r2.anal.err'].text, 800, 700, { px: 40, w: 700, color: C.txt, align: 'center' }); ctx.restore(); }
  if (t > et + 1.6 && t < et + 2.8) { const u = io(t, et + 1.6, et + 2.4); cursorAt(ctx, lerp(900, 260, u), lerp(760, 440, u)); if (u > 0.9) text(ctx, CO[6], 330, 420, { px: 30, w: 700, color: C.sAmber, fam: F.en }); }
  if (on('r2.anal.quote', t)) { ctx.save(); ctx.globalAlpha *= ap('r2.anal.quote', t); text(ctx, T['r2.anal.quote'].text, 800, 820, { px: 46, w: 700, color: C.sAmber, align: 'center' }); ctx.restore(); }
  ctx.restore();
}

/* ======================================================================= ROOM 3 — AI 模型怎麼選 */
const r3 = B.r3;
const SIGCOL = [C.sBlue, C.sGreen, C.sViolet, C.sAmber];
const SIG = ['r3.sig1', 'r3.sig2', 'r3.sig3', 'r3.sig4'];
const shortSig = (i) => T[SIG[i]].text.split('：')[0];
// one learning run per kind of signal (story seconds); the name tag lands when the run is done
const RUNS = [['sup', 345.6, 351.6], ['unsup', 351.6, 357.1], ['self', 357.1, 362.6], ['rl', 362.6, 369.6]];
function sigIcon(ctx, k, x, y, s, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 4;
  if (k === 0) { box(ctx, x - s * 0.5, y - s * 0.35, s, s * 0.7, 6, null, col, 4); check(ctx, x, y, s * 0.4, col, 4); } // answer tag
  if (k === 1) { [[-0.3, -0.2], [0.25, -0.25], [0, 0.25], [-0.3, 0.3], [0.3, 0.2]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, s * 0.08, 0, 7); ctx.fill(); }); }
  if (k === 2) { box(ctx, x - s * 0.5, y - s * 0.22, s, s * 0.44, 4, null, col, 3); ctx.fillRect(x + s * 0.05, y - s * 0.16, s * 0.36, s * 0.32); }
  if (k === 3) { check(ctx, x - s * 0.22, y, s * 0.36, C.sGreen, 4); cross(ctx, x + s * 0.25, y, s * 0.3, C.sRed, 4); }
}
function gear(ctx, x, y, r, n, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const ang = i * Math.PI / n, rr2 = i % 2 ? r : r * 0.78; ctx.lineTo(Math.cos(ang - 0.12) * rr2, Math.sin(ang - 0.12) * rr2); ctx.lineTo(Math.cos(ang + 0.12) * rr2, Math.sin(ang + 0.12) * rr2); }
  ctx.closePath(); ctx.fill(); ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill(); ctx.restore();
}
// the same machine for every kind of model: data drops in through the hopper on top, results leave by the chute below
const MX = 790;
function machine(ctx, t, busy, tint, lit) {
  ctx.fillStyle = '#3a4252'; ctx.strokeStyle = '#6a768a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(MX - 175, 186); ctx.lineTo(MX + 175, 186); ctx.lineTo(MX + 62, 290); ctx.lineTo(MX - 62, 290); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1e26'; ctx.beginPath(); ctx.ellipse(MX, 190, 168, 16, 0, 0, 7); ctx.fill();
  box(ctx, MX - 195, 288, 390, 340, 30, '#262c38', '#556070', 4);
  box(ctx, MX - 175, 306, 350, 18, 9, '#303746');
  ctx.fillStyle = '#141820'; ctx.strokeStyle = '#6a768a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(MX, 448, 112, 0, 7); ctx.fill(); ctx.stroke();
  const a = busy ? t * 1.7 : 0.3;
  ctx.save(); ctx.beginPath(); ctx.arc(MX, 448, 106, 0, 7); ctx.clip();
  gear(ctx, MX - 30, 425, 62, 10, a, tint); gear(ctx, MX + 50, 496, 42, 8, -a * 1.47 + 0.2, 'rgba(236,231,220,.55)');
  ctx.restore();
  lit.forEach((on2, i) => { ctx.fillStyle = on2 ? SIGCOL[i] : '#3c4456'; ctx.beginPath(); ctx.arc(MX - 81 + i * 54, 596, 13, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#3a4252'; ctx.beginPath(); ctx.moveTo(MX - 46, 628); ctx.lineTo(MX + 46, 628); ctx.lineTo(MX + 58, 676); ctx.lineTo(MX - 58, 676); ctx.closePath(); ctx.fill();
}
// left: what the machine is fed in each run
const PIN = { x: 40, y: 180, w: 470, h: 470 };
function scatter(ctx, t, mode, t0) {
  const { x: X, y: Y, w: W2, h: H2 } = PIN;
  const r = rng(77); const pts = Array.from({ length: 13 }, () => { const x = r(); return [x, 0.2 + 0.6 * x + (r() - 0.5) * 0.18, r()]; });
  const P = (p) => [X + 34 + p[0] * (W2 - 68), Y + H2 - 34 - p[1] * (H2 - 68)];
  if (mode === 'sup') {
    const u = io(t, t0 + 0.8, t0 + 4.6); const slope = lerp(-0.1, 0.6, u), icpt = lerp(0.7, 0.2, u);
    pts.forEach(p => { const [x, y] = P(p); const [lx, ly] = P([p[0], icpt + slope * p[0]]); ctx.strokeStyle = 'rgba(242,105,90,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke(); ctx.fillStyle = C.sBlue; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); box(ctx, x + 10, y - 30, 24, 16, 3, '#e8eef8'); });
    const [a1, b1] = P([0, icpt]), [a2, b2] = P([1, icpt + slope]); ctx.strokeStyle = C.sAmber; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
  } else {
    const u = io(t, t0 + 0.6, t0 + 3.6); const cent = [[0.2, 0.75], [0.75, 0.7], [0.5, 0.2]];
    pts.forEach((p, i) => { const c = cent[i % 3]; const q = [lerp(p[0], c[0] + (p[2] - 0.5) * 0.14, u), lerp(p[1], c[1] + (p[0] - 0.5) * 0.14, u)]; const [x, y] = P(q); ctx.fillStyle = u > 0.6 ? [C.sGreen, C.sViolet, C.sAmber][i % 3] : '#9aa1aa'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); });
    if (u > 0.7) cent.forEach(([cx, cy], i) => { const [x, y] = P([cx, cy]); ctx.save(); ctx.globalAlpha *= sm(prog(u, 0.7, 1)); ctx.strokeStyle = [C.sGreen, C.sViolet, C.sAmber][i]; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(x, y, 62, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); });
  }
}
function selfSup(ctx, t, t0) {
  const tiles = T['r3.sig3.tiles'].text; const words = [...tiles.split(' → ')[0].replace('＿', '')]; const ans = tiles.split(' → ')[1];
  const X = PIN.x + 12, Y = PIN.y + 170;
  const guess = t > t0 + 2.6, reveal = t > t0 + 3.4;
  [...words, ans].forEach((ch, i) => { const x = X + i * 64; const masked = i === words.length; box(ctx, x, Y, 58, 84, 10, masked && !reveal ? '#3a4252' : C.panel2, masked ? C.sViolet : C.line, 3);
    if (!masked || reveal) text(ctx, ch, x + 29, Y + 58, { px: 42, w: 700, color: C.txt, align: 'center' });
    else if (t > t0 + 1.0) { const cands = ['錢', '料', '人', ans]; const k = guess ? 3 : Math.floor(t * 8) % 4; text(ctx, cands[k], x + 29, Y + 58, { px: 42, w: 700, color: guess ? C.sViolet : 'rgba(179,156,245,.5)', align: 'center' }); } });
  if (reveal) check(ctx, X + words.length * 64 + 29, Y + 130, 40, C.sGreen, 6);
  // the mask itself: a hand-drawn bracket over the hidden tile
  ctx.strokeStyle = C.sViolet; ctx.lineWidth = 4; ctx.beginPath(); const mx = X + words.length * 64; ctx.moveTo(mx - 2, Y - 18); ctx.lineTo(mx - 2, Y - 30); ctx.lineTo(mx + 60, Y - 30); ctx.lineTo(mx + 60, Y - 18); ctx.stroke();
}
function rl(ctx, t, t0) {
  const S = 84, X = PIN.x + 25, Y = PIN.y + 100;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) box(ctx, X + i * S, Y + j * S, S - 8, S - 8, 8, C.panel2);
  const path = [[0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [2, 1], [3, 1], [4, 1], [4, 0]]; const good = [1, 1, 1, 0, 0, 1, 1, 1, 1];
  const k = Math.min(path.length - 1, Math.floor(prog(t, t0 + 0.5, t0 + 6) * path.length));
  for (let s = 1; s <= k; s++) { const [i, j] = path[s]; const g = good[s]; ctx.fillStyle = g ? 'rgba(98,201,142,.35)' : 'rgba(242,105,90,.35)'; ctx.fillRect(X + i * S, Y + j * S, S - 8, S - 8); }
  const [ci, cj] = path[k]; ctx.fillStyle = C.sAmber; ctx.beginPath(); ctx.arc(X + ci * S + S / 2 - 4, Y + cj * S + S / 2 - 4, 20, 0, 7); ctx.fill();
  const [li, lj] = path[k]; const g2 = good[k];
  if (k > 0) { if (g2) check(ctx, X + li * S + S - 22, Y + lj * S + 16, 22, C.sGreen, 4); else cross(ctx, X + li * S + S - 22, Y + lj * S + 16, 18, C.sRed, 4); }
  ctx.save(); ctx.fillStyle = '#ffe28a'; ctx.beginPath(); const sx = X + 4 * S + S / 2 - 4, sy = Y + S / 2 - 4; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 10 : 24; ctx.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } ctx.closePath(); if (k < path.length - 1) ctx.globalAlpha *= 0.5; ctx.fill(); ctx.restore();
}
// right: the four kinds of signal pile up as tags (later they become the rows of the grid)
const TAG = (i) => ({ x: 1050, y: 180 + i * 120, w: 510, h: 104 });
// bottom: the tray the outputs land in (later its four cells become the columns of the grid)
const TRAY = (i) => ({ x: 40 + i * 385, y: 712, w: 365, h: 190 });
const GX = 350, GY = 246, CW = 305, CH = 138;
const ROWH = (i) => ({ x: 40, y: GY + i * CH + 8, w: 292, h: CH - 16 });
const COLH = (i) => ({ x: GX + i * CW + 6, y: 176, w: CW - 12, h: 58 });
const lr = (A, Bq, u) => ({ x: lerp(A.x, Bq.x, u), y: lerp(A.y, Bq.y, u), w: lerp(A.w, Bq.w, u), h: lerp(A.h, Bq.h, u) });
function outItem(ctx, i, x, y, t, t0) {
  const IT = T['r3.out.items'].text.split('・');
  ctx.save();
  if (i === 0) { box(ctx, x - 100, y - 38, 200, 76, 12, C.panel2, C.sBlue, 3); text(ctx, IT[0], x, y + 15, { px: 42, w: 700, color: C.sBlue, align: 'center', fam: F.en }); }
  if (i === 1) { box(ctx, x - 92, y - 36, 184, 72, 36, C.sGreen); text(ctx, IT[1], x, y + 13, { px: 36, w: 700, color: '#10241a', align: 'center' }); }
  if (i === 2) { const n = Math.max(1, Math.floor(prog(t, t0 + 0.9, t0 + 2.6) * [...IT[2]].length)); box(ctx, x - 160, y - 38, 320, 76, 12, C.panel2, C.sViolet, 3); text(ctx, [...IT[2]].slice(0, n).join(''), x - 142, y + 12, { px: 30, color: C.sViolet }); }
  if (i === 3) { box(ctx, x - 100, y - 38, 200, 76, 12, C.panel2, C.sAmber, 3); text(ctx, IT[3], x, y + 15, { px: 40, w: 700, color: C.sAmber, align: 'center', fam: F.en }); }
  ctx.restore();
}
export function drawMon3(ctx, w, h, t) {
  screenBase(ctx, w, h, '');
  if (t < r3.mach) return idleR3(ctx, w, h, t);
  if (t < r3.gates) return monMachine(ctx, w, h, t);
  if (t >= r3.cheap - 0.5 && t < r3.fix + 2) return monCheap(ctx, w, h, t);
  if (t >= B.quiz.q2.q - 1.5 && t < B.quiz.q2.end + 1) return monCheap(ctx, w, h, t, true);
  // otherwise: the note's own two-axes figure stays on screen
  ctx.fillStyle = '#111317'; ctx.fillRect(0, 54, w, h - 54); img(ctx, 'axes', 40, 100, w - 80, (w - 80) * 723 / 1280, sm(prog(t, r3.gates, r3.gates + 1)));
}
// the problem already happening when you walk in: one request card, three different-looking models, which one?
function idleR3(ctx, w, h, t) {
  idle(ctx, w, h);
  box(ctx, 610, 120, 380, 200, 10, '#f3ecdc'); ctx.fillStyle = C.blue; ctx.fillRect(610, 120, 380, 12);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(37,48,61,.35)'; ctx.fillRect(640, 175 + i * 40, 300 - i * 70, 18); }
  const M3 = [[330, 640, 200, 150, C.sBlue], [800, 640, 260, 190, C.sGreen], [1270, 640, 330, 230, C.sViolet]];
  const cyc = Math.floor(t / 1.6) % 3, f = (t / 1.6) % 1;
  M3.forEach(([x, y, bw, bh, col], i) => { const hi = i === cyc; box(ctx, x - bw / 2, y - bh / 2, bw, bh, 18, '#20242c', hi ? col : '#3c4456', hi ? 6 : 3); gear(ctx, x, y, bh * 0.26, 8, hi ? t * 2 : 0, hi ? col : '#3c4456'); });
  const [tx, ty, , bh] = M3[cyc]; ctx.save(); ctx.setLineDash([16, 12]); pathArrow(ctx, [[800, 330], [tx, ty - bh / 2 - 14]], 'rgba(236,231,220,.6)', 5, sm(clamp(f * 1.6)), 20); ctx.setLineDash([]); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); text(ctx, '?', 1060, 250, { px: 120, w: 700, color: C.sAmber, keep: true }); ctx.restore();
}
function monMachine(ctx, w, h, t) {
  const toGrid = io(t, r3.grid, r3.grid + 1.4); const mFade = 1 - sm(prog(t, r3.grid - 0.2, r3.grid + 0.6));
  const cur = RUNS.findIndex(([, a, b]) => t >= a && t < b);
  const busy = cur >= 0 || (t >= r3.outp && t < r3.outp + 6);
  if (mFade > 0) {
    ctx.save(); ctx.globalAlpha = mFade;
    if (on('r3.f', t)) { ctx.save(); ctx.globalAlpha *= ap('r3.f', t); text(ctx, T['r3.f'].text, MX, 136, { px: 44, w: 700, color: '#cfd6e2', align: 'center' }); ctx.restore(); }
    machine(ctx, t, busy, cur >= 0 ? SIGCOL[cur] : C.sAmber, RUNS.map(([, a]) => t >= a));
    // input panel: crossfades between the four kinds of data
    const inFade = 1 - sm(prog(t, r3.outp - 0.4, r3.outp + 0.3));
    ctx.save(); ctx.globalAlpha *= inFade; box(ctx, PIN.x, PIN.y, PIN.w, PIN.h, 14, C.panel); ctx.restore();
    if (cur >= 0 && inFade > 0) {
      const [m, a, b] = RUNS[cur]; ctx.save(); ctx.globalAlpha *= Math.min(sm(prog(t, a, a + 0.4)), 1 - sm(prog(t, b - 0.3, b))) * inFade;
      if (m === 'sup' || m === 'unsup') scatter(ctx, t, m, a); if (m === 'self') selfSup(ctx, t, a); if (m === 'rl') rl(ctx, t, a);
      for (let k2 = 0; k2 < 3; k2++) { const p = ((t - a) * 0.8 + k2 / 3) % 1; const x = (1 - p) * (1 - p) * 515 + 2 * (1 - p) * p * 600 + p * p * MX, y = (1 - p) * (1 - p) * 330 + 2 * (1 - p) * p * 110 + p * p * 215; ctx.fillStyle = SIGCOL[cur]; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // conveyor under the chute
    ctx.fillStyle = '#2a303b'; ctx.fillRect(40, 686, 1520, 12); if (busy && t >= r3.outp) { ctx.fillStyle = 'rgba(236,231,220,.25)'; for (let x = 40 + ((t * 120) % 60); x < 1560; x += 60) ctx.fillRect(x, 688, 24, 8); }
    ctx.restore();
  }
  // signal tags (right) -> grid rows
  RUNS.forEach(([, a, b], i) => {
    if (t < a) { if (toGrid <= 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([12, 10]); const q = TAG(i); box(ctx, q.x, q.y, q.w, q.h, 14, null, C.line, 3); ctx.setLineDash([]); ctx.restore(); } return; }
    const q = lr(TAG(i), ROWH(i), toGrid); const active = cur === i;
    ctx.save(); ctx.globalAlpha = sm(prog(t, a, a + 0.4));
    box(ctx, q.x, q.y, q.w, q.h, 14, active ? 'rgba(255,255,255,.07)' : C.panel, SIGCOL[i], active ? 5 : 2);
    sigIcon(ctx, i, q.x + lerp(58, 46, toGrid), q.y + q.h / 2, lerp(56, 44, toGrid), SIGCOL[i]);
    const e = T[SIG[i]];
    if (t >= e.t0) { ctx.save(); ctx.globalAlpha *= ap(SIG[i], t) * (1 - toGrid); text(ctx, e.text, q.x + 118, q.y + q.h / 2 + 13, { px: 38, w: 700, color: SIGCOL[i] }); ctx.restore();
      if (toGrid > 0) { ctx.save(); ctx.globalAlpha *= toGrid; text(ctx, shortSig(i), q.x + 92, q.y + q.h / 2 + 12, { px: 34, w: 700, color: SIGCOL[i] }); ctx.restore(); } }
    ctx.restore();
  });
  // output tray (bottom) -> grid columns
  const OUT = T['r3.out'].text.split('・');
  for (let i = 0; i < 4; i++) {
    const q = lr(TRAY(i), COLH(i), toGrid);
    const ti = r3.outp + 0.4 + i * 1.3; const arrived = prog(t, ti + 1.1, ti + 1.4);
    ctx.save();
    box(ctx, q.x, q.y, q.w, q.h, 14, '#171b22', arrived > 0 ? '#8a93a0' : C.line, arrived > 0 ? 3 : 2);
    if (t < ti + 1.1 && toGrid <= 0) { ctx.save(); ctx.globalAlpha = 0.35; text(ctx, '?', q.x + q.w / 2, q.y + 120, { px: 60, w: 700, color: C.dim, align: 'center', keep: true }); ctx.restore(); }
    if (on('r3.out', t)) { ctx.globalAlpha = ap('r3.out', t); text(ctx, OUT[i], q.x + lerp(24, q.w / 2, toGrid), q.y + lerp(48, 40, toGrid), { px: lerp(32, 30, toGrid), w: 700, color: C.txt, align: toGrid > 0.5 ? 'center' : 'left' }); }
    ctx.restore();
    // the item: out of the chute, along the belt, into its cell
    const u = prog(t, ti, ti + 1.4); const itemFade = 1 - sm(prog(t, r3.grid - 0.2, r3.grid + 0.4));
    if (u > 0 && itemFade > 0) {
      const cx = TRAY(i).x + TRAY(i).w / 2; let x, y;
      if (u < 0.25) { x = MX; y = lerp(640, 690, u / 0.25); } else if (u < 0.8) { x = lerp(MX, cx, ease.inOut((u - 0.25) / 0.55)); y = 690; } else { x = cx; y = lerp(690, 830, (u - 0.8) / 0.2); }
      ctx.save(); ctx.globalAlpha = itemFade; outItem(ctx, i, x, y, t, ti); ctx.restore();
    }
  }
  if (t >= r3.grid) monGrid(ctx, w, h, t);
}
// grid: which signal (row) x which output (column); a light walks the staircase and each cell lights as it arrives
function monGrid(ctx, w, h, t) {
  const g0 = r3.grid; const ga = sm(prog(t, g0 + 0.8, g0 + 1.4));
  const llmOn = t >= r3.llm; const dimO = llmOn ? 1 - 0.65 * sm(prog(t, r3.llm, r3.llm + 0.6)) : 1;
  ctx.save(); ctx.globalAlpha = ga * dimO;
  ctx.strokeStyle = C.line; ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(GX, GY + i * CH); ctx.lineTo(GX + 4 * CW, GY + i * CH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(GX + i * CW, GY); ctx.lineTo(GX + i * CW, GY + 4 * CH); ctx.stroke(); }
  ctx.restore();
  const RD = T['r3.grid'].text.split('・'), TX = T['r3.grid.tex'].text.split('・');
  const jepa = RD[3].match(/^(.*?)（(.*)）$/) || [RD[3], RD[3], ''];
  const CHIPS = [[RD[0], '', 0, 0, 0], [RD[1], '', 0, 1, 0], [TX[0], '', 1, 1, 1], [TX[1], '', 1, 2, 1], [RD[2], '', 2, 2, 0], [jepa[1], jepa[2], 2, 3, 0], [TX[2], '', 3, 3, 1]];
  const T0 = g0 + 1.4, DT = 0.75; const at = (k2) => T0 + k2 * DT;
  const ctr = (r, c) => [GX + c * CW + CW / 2, GY + r * CH + CH / 2];
  const special = (k2) => llmOn && (k2 === 1 || k2 === 4);
  CHIPS.forEach(([s, sub, r, c, tex], k2) => {
    const ta = at(k2); if (t < ta) return; const k3 = ease.outBack(prog(t, ta, ta + 0.45)); const [x, y0] = ctr(r, c); const y = y0 - (1 - k3) * 40;
    ctx.save(); ctx.globalAlpha = clamp(k3) * (special(k2) ? 1 : dimO);
    ctx.fillStyle = `rgba(${['111,169,242', '98,201,142', '179,156,245', '242,182,92'][r]},${tex ? 0.06 : 0.13})`; ctx.fillRect(GX + c * CW + 2, GY + r * CH + 2, CW - 4, CH - 4);
    const glow = special(k2) ? 0.6 + 0.4 * Math.sin(t * 4) : 0;
    box(ctx, x - 128, y - 46, 256, 92, 14, '#1d2430', SIGCOL[r], tex ? 2 : 4 + glow * 4);
    if (sub) { text(ctx, s, x, y - 2, { px: 36, w: 700, color: C.txt, align: 'center', fam: F.en }); text(ctx, sub, x, y + 32, { px: 22, w: 500, color: C.dim, align: 'center' }); }
    else text(ctx, s, x, y + 13, { px: tex ? 30 : 38, w: tex ? 500 : 700, color: tex ? C.dim : C.txt, align: 'center' });
    ctx.restore();
  });
  // the walking light
  if (t >= T0 - 0.4 && t < at(CHIPS.length - 1) + 0.8) {
    const pts = [[GX - 10, GY + CH / 2], ...CHIPS.map(([, , r, c]) => ctr(r, c))]; const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    let d; if (t < T0) d = L[1] * prog(t, T0 - 0.4, T0); else { const k2 = Math.min(CHIPS.length - 1, Math.floor((t - T0) / DT)); const f = clamp((t - at(k2) - DT * 0.4) / (DT * 0.6)); d = k2 + 1 < pts.length - 1 ? lerp(L[k2 + 1], L[k2 + 2], ease.inOut(f)) : L[pts.length - 1]; }
    ctx.save(); ctx.globalAlpha = 1 - sm(prog(t, at(CHIPS.length - 1) + 0.3, at(CHIPS.length - 1) + 0.8)); tracer(ctx, pts, d / L[L.length - 1], '#ffd27a', 16); ctx.restore();
  }
  // empty cells: hatched, they are empty on purpose
  if (on('r3.grid.note', t)) {
    const a = ap('r3.grid.note', t); const filled = new Set(CHIPS.map(([, , r, c]) => r * 4 + c));
    ctx.save(); ctx.globalAlpha = a * 0.5 * dimO; ctx.strokeStyle = C.faint; ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if (filled.has(r * 4 + c)) continue; const x0 = GX + c * CW, y0 = GY + r * CH; ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, CW - 4, CH - 4); ctx.clip(); for (let k2 = -CH; k2 < CW; k2 += 26) { ctx.beginPath(); ctx.moveTo(x0 + k2, y0 + CH); ctx.lineTo(x0 + k2 + CH, y0); ctx.stroke(); } ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a * (1 - sm(prog(t, r3.llm - 0.5, r3.llm))); text(ctx, T['r3.grid.note'].text, 800, 868, { px: 38, w: 700, color: C.sAmber, align: 'center' }); ctx.restore();
  }
  if (llmOn) monLLM(ctx, t, ctr);
}
// LLM: every step picks one word out of a very long list -> it is a classifier underneath
function monLLM(ctx, t, ctr) {
  const l0 = r3.llm; const a = sm(prog(t, l0, l0 + 0.6));
  const S = [...T['r3.out.items'].text.split('・')[2].replace(/[，…]/g, '')]; const CAND = [...T['r3.llm.cands'].text];
  const X = 1282, Y = 176, PW = 290, PH = 640;
  const [lx, ly] = ctr(2, 2);
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = C.sViolet; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx + 128, ly); ctx.lineTo(X, ly); ctx.stroke();
  box(ctx, X, Y, PW, PH, 14, '#141820', C.sViolet, 3);
  const step = clamp((t - l0 - 0.6) / 0.55, 0, S.length); const k2 = Math.floor(step), f = step - k2;
  text(ctx, S.slice(0, Math.min(S.length, k2 + (f > 0.75 ? 1 : 0))).join(''), X + 20, Y + 56, { px: 32, w: 700, color: C.sViolet });
  ctx.fillStyle = C.line; ctx.fillRect(X + 14, Y + 78, PW - 28, 2);
  const r = rng(11 + Math.min(k2, S.length - 1) * 7); const sel = 3;
  for (let i = 0; i < 9; i++) { const y = Y + 136 + i * 56; const right = i === sel && k2 < S.length; const ch = right ? S[k2] : CAND[Math.floor(r() * CAND.length)];
    const bw = right ? 150 : 14 + r() * 70; if (right && f > 0.3) box(ctx, X + 10, y - 38, PW - 20, 52, 8, 'rgba(179,156,245,.25)');
    text(ctx, ch, X + 28, y, { px: 32, w: right ? 700 : 400, color: right ? C.sViolet : C.dim }); ctx.fillStyle = right ? C.sViolet : 'rgba(154,161,170,.35)'; ctx.fillRect(X + 80, y - 22, bw, 14); }
  ctx.fillStyle = 'rgba(154,161,170,.5)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X + PW / 2 - 20 + i * 20, Y + PH - 22, 4, 0, 7); ctx.fill(); }
  // the arrow: LLM -> 分類
  const [cx, cy] = ctr(0, 1); const lu = io(t, l0 + 3.0, l0 + 4.4);
  if (lu > 0) { ctx.setLineDash([16, 12]); pathArrow(ctx, [[lx - 40, ly - 46], [lx - 120, ly - 170], [cx + 60, cy + 50]], C.sViolet, 6, lu, 22); ctx.setLineDash([]); }
  if (on('r3.llm', t)) { ctx.globalAlpha = a * ap('r3.llm', t); text(ctx, T['r3.llm'].text, 800, 872, { px: 34, w: 700, color: C.sViolet, align: 'center' }); }
  ctx.restore();
}
// customer service: the cheap, fast classifier catches the easy ones; only the hard ones go to the LLM
function bubble(ctx, x, y, col) { box(ctx, x - 42, y - 21, 84, 42, 18, col); ctx.fillStyle = 'rgba(17,22,28,.75)'; ctx.fillRect(x - 24, y - 4, 48, 7); ctx.beginPath(); ctx.moveTo(x - 26, y + 19); ctx.lineTo(x - 36, y + 32); ctx.lineTo(x - 12, y + 20); ctx.fillStyle = col; ctx.fill(); }
function coin(ctx, x, y) { ctx.fillStyle = '#e8b85c'; ctx.beginPath(); ctx.ellipse(x, y, 22, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#b8892f'; ctx.fillRect(x - 22, y, 44, 6); ctx.beginPath(); ctx.ellipse(x, y + 6, 22, 9, 0, 0, Math.PI); ctx.fill(); }
function bolt(ctx, x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.5); ctx.lineTo(x - s * 0.3, y + s * 0.05); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x - s * 0.12, y + s * 0.5); ctx.lineTo(x + s * 0.32, y - s * 0.08); ctx.lineTo(x + s * 0.02, y - s * 0.08); ctx.closePath(); ctx.fill(); }
function hourglass(ctx, x, y, s, col) { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - s * 0.35, y - s * 0.5); ctx.lineTo(x + s * 0.35, y - s * 0.5); ctx.lineTo(x - s * 0.35, y + s * 0.5); ctx.lineTo(x + s * 0.35, y + s * 0.5); ctx.closePath(); ctx.stroke(); }
function monCheap(ctx, w, h, t, bare = false) {
  const c0 = r3.cheap; const UI = T['r3.cheap.ui'].text.split('・');
  ctx.save(); ctx.globalAlpha = bare ? 1 : sm(prog(t, c0 - 0.5, c0));
  if (!bare && on('r3.cheap', t)) wrap(ctx, T['r3.cheap'].text, 60, 116, 1480, 52, { px: 36, w: 700, color: C.txt });
  box(ctx, 470, 330, 310, 230, 18, '#1d2a22', C.sGreen, 4);
  box(ctx, 1080, 260, 440, 390, 24, '#241d2e', C.sViolet, 4);
  if (!bare) { text(ctx, UI[0], 625, 402, { px: 36, w: 700, color: C.sGreen, align: 'center' }); text(ctx, UI[1], 1300, 410, { px: 60, w: 700, color: C.sViolet, align: 'center', fam: F.en }); }
  bolt(ctx, 575, 480, 60, C.sGreen); coin(ctx, 680, 478);
  hourglass(ctx, 1210, 530, 80, C.sViolet); for (let i = 0; i < 4; i++) coin(ctx, 1360, 560 - i * 16);
  box(ctx, 470, 595, 310, 200, 14, null, 'rgba(98,201,142,.4)', 2);
  let done = 0, passed = 0;
  for (let i = 0; i < 10; i++) {
    const hard = i === 3 || i === 7;
    if (bare) { if (i < 7) bubble(ctx, 160, 250 + i * 64, '#2a3039'); continue; }
    const ti = c0 + 0.6 + i * 0.75; const u1 = prog(t, ti, ti + 1.0);
    if (u1 <= 0) { const q = i - Math.floor(prog(t, c0 + 0.6, c0 + 8.1) * 10); if (q < 7) bubble(ctx, 160, 250 + q * 64, '#2a3039'); continue; }
    if (u1 < 1) { bubble(ctx, lerp(160, 470, ease.inOut(u1)), lerp(250, 445, ease.inOut(u1)), '#2a3039'); continue; }
    if (!hard) { const u2 = prog(t, ti + 1.0, ti + 1.5); const slot = done; if (u2 >= 1) { done++; } bubble(ctx, lerp(625, 525 + (slot % 3) * 100, u2), lerp(445, 632 + Math.floor(slot / 3) * 60, u2), C.sGreen); }
    else { const u2 = prog(t, ti + 1.0, ti + 2.8); if (u2 >= 1) { passed++; continue; } bubble(ctx, lerp(780, 1080, ease.inOut(u2)), 445, C.sViolet); }
  }
  if (!bare) { text(ctx, `✓ ${done}`, 625, 850, { px: 44, w: 700, color: C.sGreen, align: 'center', fam: F.en }); text(ctx, `→ ${passed}`, 1300, 710, { px: 44, w: 700, color: C.sViolet, align: 'center', fam: F.en }); }
  ctx.restore();
}
// room-3 whiteboard: four questions, each with where its answers go (the note's 4 判準), landing boxes on the right
const G3 = { x: 500, w: 980, ys: [330, 565, 805, 1045], hs: [120, 176, 176, 176] };
const LB = { x: 1760, w: 690, ys: [300, 520, 740], h: 160 };
const CARD3 = [400, 150];
const gateTop = (i) => G3.ys[i] - G3.hs[i] / 2, gateBot = (i) => G3.ys[i] + G3.hs[i] / 2;
function drawGate3(ctx, i, t, glow, hiExit) {
  const id = ['r3.gate1', 'r3.gate2', 'r3.gate3', 'r3.gate4'][i]; const e = T[id]; const a = ap(id, t); if (a <= 0) return;
  const y = G3.ys[i], hh = G3.hs[i];
  ctx.save(); ctx.globalAlpha *= a;
  box(ctx, G3.x, y - hh / 2, G3.w, hh, 18, glow ? 'rgba(242,182,92,.22)' : 'rgba(201,138,34,.07)', glow ? '#d98a12' : C.amber, glow ? 8 : 4);
  if (!e.sub) { text(ctx, e.text, G3.x + 36, y + 19, { px: 54, w: 700, color: C.ink }); ctx.restore(); return; }
  text(ctx, e.text, G3.x + 32, y - 18, { px: 52, w: 700, color: C.ink });
  const ex = e.sub.split('；'); ctx.font = font(40, 700); let x = G3.x + 32;
  ex.forEach((s2, k2) => { const wv = ctx.measureText(s2).width; if (hiExit === k2) box(ctx, x - 12, y + 14, wv + 24, 56, 10, 'rgba(111,169,242,.22)', C.blue, 3);
    text(ctx, s2, x, y + 54, { px: 40, w: 700, color: k2 === 0 ? C.green : C.inkDim }); x += wv + 54; });
  ctx.restore();
}
function landBox(ctx, k2, t, glow, col) {
  const LND = T['r3.land'].text.split('・').map(s2 => s2.split(' → '));
  const a = sm(prog(t, T['r3.land'].t0 + k2 * 0.3, T['r3.land'].t0 + k2 * 0.3 + 0.6)); if (a <= 0) return;
  const y = LB.ys[k2]; const [lab, name] = LND[k2];
  ctx.save(); ctx.globalAlpha *= a;
  // arrow from question ① out to this box, labelled with the answer
  const sx = G3.x + G3.w, sy = G3.ys[0];
  pathArrow(ctx, [[sx + 8, sy], [sx + 90, sy], [sx + 140, y], [LB.x - 10, y]], C.ink, 5, io(t, T['r3.land'].t0 + k2 * 0.3, T['r3.land'].t0 + k2 * 0.3 + 0.7), 20);
  text(ctx, lab, (sx + 140 + LB.x) / 2, y - 18, { px: 36, w: 700, color: C.inkDim, align: 'center' });
  box(ctx, LB.x, y - LB.h / 2, LB.w, LB.h, 18, glow ? 'rgba(255,214,140,.32)' : 'rgba(255,255,255,.4)', col, glow ? 9 : 5);
  text(ctx, name, LB.x + 36, y + 20, { px: 56, w: 700, color: col });
  ctx.restore();
}
export function drawBoard3(ctx, w, h, t) {
  boardBase(ctx, w, h, 3);
  const rc = r3.recall; const rk = Math.min(sm(prog(t, rc.q - 0.6, rc.q + 0.4)), 1 - sm(prog(t, rc.end - 0.2, rc.end + 0.8)));
  const back = 1 - 0.5 * rk; const recallOn = rk > 0.01;
  const cheapOn = t >= r3.cheap && t < r3.fix + 1;
  if (on('r3.q', t)) { ctx.save(); ctx.globalAlpha = ap('r3.q', t, 1); text(ctx, T['r3.q'].text, 90, 118, { px: 76, w: 700, color: C.ink }); ctx.restore(); }
  const g0 = T['r3.card1'].t0; const rv = rc.c1;
  // which exit is lit: card 1 = number + labelled history; recall card = category + labelled history
  const c1Ans = T['r3.ans1'].text.split('・'), c2Ans = T['r3.ans2'].text.split('・');
  const hi2 = (t >= g0 + 5 && t < rc.q - 0.5) || (t >= rv + 3.2 && t < rc.end) ? 0 : -1;
  for (let i = 0; i < 4; i++) {
    const GID = ['r3.gate1', 'r3.gate2', 'r3.gate3', 'r3.gate4'];
    if (i < 3 && on(GID[i + 1], t)) arrow(ctx, G3.x + 120, gateBot(i) + 6, G3.x + 120, gateTop(i + 1) - 8, C.ink, 5, 18, ap(GID[i + 1], t));
    const clue = i < 2;
    ctx.save(); ctx.globalAlpha = clue ? 1 : back;
    const glow = (i === 0 && recallOn && t < rv) || (i === 3 && cheapOn);
    drawGate3(ctx, i, t, glow, i === 1 ? hi2 : -1);
    ctx.restore();
  }
  const COLS3 = [C.blue, C.green, '#6b4fb8'];
  for (let k2 = 0; k2 < 3; k2++) landBox(ctx, k2, t, (k2 === 0 && t > g0 + 3.2 && t < rc.q - 0.5) || (k2 === 1 && t > rv + 1.6 && t < rc.end), COLS3[k2]);
  // card 1
  const P = (i) => [70, G3.ys[i] - CARD3[1] / 2];
  const pin = (k2) => [LB.x + LB.w - 300, LB.ys[k2] + 30];
  const chip = (s2, x, y, col, a) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; box(ctx, x, y, 130, 64, 32, col); text(ctx, s2, x + 65, y + 45, { px: 38, w: 700, color: '#fff', align: 'center' }); ctx.restore(); };
  if (t >= g0 && t < rc.q) {
    const kf1 = [[g0, -440, 160, 1], [g0 + 1.0, ...P(0), 1], [g0 + 3.4, ...P(0), 1], [g0 + 4.2, ...P(1), 1], [g0 + 6.4, ...P(1), 1], [g0 + 7.6, ...pin(0), 0]];
    const p = pathAt(t, kf1); const sc = lerp(0.62, 1, p.b);
    ctx.save(); ctx.globalAlpha = 1 - sm(prog(t, rc.q - 0.8, rc.q - 0.2)); ctx.translate(p.x, p.y); ctx.scale(sc, sc);
    card(ctx, 0, 0, CARD3[0], CARD3[1], T['r3.card1'].text, null, { band: C.blue, px: 42, rot: -0.012 });
    chip(c1Ans[0], CARD3[0] - 150, -30, C.blue, sm(prog(t, T['r3.ans1'].t0, T['r3.ans1'].t0 + 0.4)) * (p.b > 0.5 ? 1 : 0) * (t < g0 + 5 ? 1 : 0));
    chip(c1Ans[1], CARD3[0] - 150, -30, C.blue, sm(prog(t, g0 + 5, g0 + 5.4)) * (p.b > 0.5 ? 1 : 0) * (t > g0 + 5 ? 1 : 0));
    ctx.restore();
    if (t > g0 + 1.9 && t < g0 + 3.6) { ctx.save(); tracer(ctx, [[G3.x + 400, G3.ys[0]], [G3.x + G3.w + 90, G3.ys[0]], [G3.x + G3.w + 140, LB.ys[0]], [LB.x + 60, LB.ys[0]]], io(t, g0 + 1.9, g0 + 3.2), '#6fa9f2'); ctx.restore(); }
  }
  // recall: the new card walks in, a light runs into question ① and waits at the fork; the reveal takes the 類別 branch
  if (t >= rc.q - 0.5) {
    const kf2 = [[rc.q - 0.5, -440, 160, 1], [rc.q + 0.6, ...P(0), 1], [rv + 1.8, ...P(0), 1], [rv + 2.8, ...P(1), 1], [rv + 4.4, ...P(1), 1], [rv + 5.6, ...pin(1), 0]];
    const p = pathAt(t, kf2); const sc = lerp(0.62, 1, p.b); const glow = t < rv ? 0.55 + 0.45 * Math.sin(t * 3) : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc);
    card(ctx, 0, 0, CARD3[0], CARD3[1], T['r3.card2'].text, null, { band: C.green, px: 38, rot: 0.012, glow });
    chip(c2Ans[0], CARD3[0] - 150, -30, C.green, sm(prog(t, rv + 0.2, rv + 0.6)) * (p.b > 0.5 ? 1 : 0) * (t < rv + 3.2 ? 1 : 0));
    chip(c2Ans[1], CARD3[0] - 150, -30, C.green, sm(prog(t, rv + 3.2, rv + 3.6)) * (p.b > 0.5 ? 1 : 0));
    ctx.restore();
    if (recallOn) {
      ctx.save();
      if (t < rv) { const u = io(t, rc.q + 1.0, rc.c0); tracer(ctx, [[P(0)[0] + CARD3[0], G3.ys[0]], [G3.x + G3.w + 90, G3.ys[0]]], u); if (u >= 1) { const pulse = 0.5 + 0.5 * Math.sin(t * 4); ctx.globalAlpha = 0.4 + 0.5 * pulse; ctx.strokeStyle = '#ffb43c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(G3.x + G3.w + 90, G3.ys[0], 40 + 10 * pulse, 0, 7); ctx.stroke(); } }
      else tracer(ctx, [[G3.x + G3.w + 90, G3.ys[0]], [G3.x + G3.w + 140, LB.ys[1]], [LB.x + 60, LB.ys[1]]], io(t, rv + 0.3, rv + 1.6), '#62c98e');
      ctx.restore();
    }
  }
  if (on('r3.wrap', t)) { ctx.save(); ctx.globalAlpha = ap('r3.wrap', t, 0.8); text(ctx, T['r3.wrap'].text, G3.x, 1250, { px: 64, w: 700, color: C.red }); ctx.restore(); }
}
