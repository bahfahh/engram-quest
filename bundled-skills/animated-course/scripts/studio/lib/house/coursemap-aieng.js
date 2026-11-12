// Example course data for lib/house/coursemap.js: an eight-lesson AI Engineering course that fills common gaps.
// One entry per lesson: name (the plate, same names as lib/classroom/coursemap-aieng.js), cycle (s for one run at
// speed 1) and pic(c, L, u, o): the lesson's core mechanism as a holo mini picture, drawn in a ±440 × ±250 box,
// u = 0 … 1 one run (a pure function of u). House colours: cyan = the system / normal, magenta = wrong / warning,
// amber = the student's, grey = not yet, everything else blue-grey. Big shapes, strokes ≥ 8: it must read in the
// map's wide shot (a panel is ~300 px wide there) and only the numbers that are part of the mechanism are written.
import { P } from './coursemap.js';

const { rr, dot, ring, line, arrow, text, check, cross, prog, clamp, lerp, sm, out, outBack } = P;
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const card = (c, x, y, w, h, L, { fill, edge, r = 12, lw = 6 } = {}) => { rr(c, x, y, w, h, r); c.fillStyle = fill || L.shell; c.fill(); c.lineWidth = lw; c.strokeStyle = edge || L.line; c.stroke(); };

// 1 — Learned program: written code has "the line" you can fix; a learned curve has none (the magnifier finds nothing)
function pic1(c, L, u) {
  rr(c, -420, -215, 330, 430, 26); c.fillStyle = '#0b111c'; c.fill(); c.lineWidth = 6; c.strokeStyle = L.line; c.stroke();
  const ws = [210, 150, 240, 120, 200, 170];
  ws.forEach((w, i) => { const bad = i === 2; rr(c, -385, -165 + i * 62, w, 24, 12); c.fillStyle = bad ? L.magenta : L.cyan; c.globalAlpha = bad ? 1 : 0.75; c.fill(); c.globalAlpha = 1; });
  ring(c, -385 + 240 + 32, -165 + 2 * 62 + 12, 20, L.magenta, 6);
  // right: data dots + the learned curve
  const f = x => 150 - 300 / (1 + Math.exp(-(x - 200) / 70));
  line(c, [[-30, 215], [430, 215]], L.ink3, 6); line(c, [[-30, 215], [-30, -215]], L.ink3, 6);
  const R = rng(11); for (let i = 0; i < 11; i++) { const x = 10 + i * 40, y = f(x) + (R() - 0.5) * 90; dot(c, x, y, 13 * clamp(u * 8 - i * 0.3), L.ink3); }
  const k = sm(prog(u, 0.2, 0.6)), pts = []; for (let x = 0; x <= 420; x += 10) pts.push([x, f(x)]);
  line(c, pts, L.line, 14, k);
  const m = sm(prog(u, 0.62, 0.95)), mx = lerp(40, 360, m), my = f(mx) + 20;
  if (u > 0.6) { c.save(); c.globalAlpha = clamp((u - 0.6) * 8); ring(c, mx, my, 54, L.ink, 10); line(c, [[mx + 40, my + 40], [mx + 92, my + 92]], L.ink, 14); c.restore(); }
  if (u > 0.92) text(c, '?', mx, my + 4, 64, L.magenta);
}
// 2 — Bias / variance: left darts cluster off the centre (bias), right darts scatter round it (variance)
function pic2(c, L, u) {
  const tg = (x) => { for (const r of [190, 125, 60]) ring(c, x, 0, r, L.line, 7); dot(c, x, 0, 16, L.line); };
  tg(-215); tg(215);
  const A = [[70, -78], [92, -60], [62, -52], [84, -92], [102, -80], [76, -66]], Bq = [[-120, 40], [110, -90], [40, 128], [-70, -122], [138, 52], [-24, 30]];
  for (let i = 0; i < 6; i++) { const k = clamp((u - i * 0.08) * 7); if (k <= 0) continue; const s = lerp(1.8, 1, out(k)); dot(c, -215 + A[i][0], A[i][1], 15 * s, L.ink); dot(c, 215 + Bq[i][0], Bq[i][1], 15 * s, L.ink); }
  arrow(c, -215, 0, -215 + 66, -60, L.magenta, 10, sm(prog(u, 0.62, 0.8)));
  if (u > 0.78) { c.save(); c.globalAlpha = sm(prog(u, 0.78, 0.92)); c.setLineDash([22, 14]); ring(c, 215, 0, 168, L.magenta, 9); c.restore(); }
}
// 3 — Error analysis: ten error cards fall into four bins; the bars become 4 / 3 / 2 / 1 and the tallest one is the fix
function pic3(c, L, u) {
  const BX = [-300, -100, 100, 300], to = [0, 1, 0, 2, 0, 1, 3, 0, 1, 2], cnt = [0, 0, 0, 0];
  for (let i = 0; i < 10; i++) { const k = clamp((u * 0.85 - i * 0.07) * 9); if (k >= 1) cnt[to[i]]++; }
  const hot = sm(prog(u, 0.85, 1));
  BX.forEach((x, j) => {
    const h = cnt[j] * 82; rr(c, x - 70, 190 - h, 140, h, 12); c.fillStyle = j === 0 && hot > 0 ? L.magenta : L.cyan; c.globalAlpha = j === 0 ? lerp(0.85, 1, hot) : 0.75; c.fill(); c.globalAlpha = 1;
    line(c, [[x - 86, 120], [x - 86, 214], [x + 86, 214], [x + 86, 120]], L.ink3, 8);
  });
  for (let i = 0; i < 10; i++) { const k = clamp((u * 0.85 - i * 0.07) * 9); if (k <= 0 || k >= 1) continue; const x = BX[to[i]], y = lerp(-250, 150 - cnt[to[i]] * 82, k * k); rr(c, x - 44, y - 30, 88, 60, 10); c.fillStyle = L.magenta; c.fill(); }
  if (hot > 0) { c.save(); c.globalAlpha = hot; const y = 190 - cnt[0] * 82 - 40 - 10 * Math.sin(hot * Math.PI); arrow(c, -300, y - 70, -300, y, L.magenta, 10); c.restore(); }
}
// 4 — Metrics: a net scoops 3 good + 1 wrong into the basket (3/4 precision); 2 good stay in the pool (3/5 recall)
function pic4(c, L, u) {
  c.save(); c.beginPath(); c.ellipse(-190, 120, 230, 105, 0, 0, 7); c.fillStyle = L.cyan; c.globalAlpha = 0.14; c.fill(); c.globalAlpha = 1; c.lineWidth = 7; c.strokeStyle = L.line; c.stroke(); c.restore();
  const balls = [[-330, 120, 1], [-260, 160, 0], [-250, 90, 1], [-180, 140, 1], [-120, 95, 0], [-90, 170, 1], [-30, 120, 0], [-200, 60, 0], [-60, 50, 1]];
  const caught = [0, 2, 3, 4], basket = [[250, 40], [320, 40], [215, 0], [285, 0]];
  const lift = sm(prog(u, 0.12, 0.5));
  balls.forEach(([x, y, good], i) => { const ci = caught.indexOf(i); let X = x, Y = y; if (ci >= 0) { X = lerp(x, basket[ci][0], lift); Y = lerp(y, basket[ci][1], lift) - Math.sin(lift * Math.PI) * 160; } dot(c, X, Y, 26, good ? L.line : L.grey); });
  line(c, [[170, 70], [190, 110], [370, 110], [390, 70]], L.ink3, 9); line(c, [[175, 70], [385, 70]], L.ink3, 6);
  if (u > 0.55) text(c, '3/4', 280, -95, 76, L.ink, 'center', 800);
  const k2 = sm(prog(u, 0.68, 0.82)); for (const i of [5, 8]) if (k2 > 0) { c.save(); c.globalAlpha = k2; ring(c, balls[i][0], balls[i][1], 40, L.line, 7); c.restore(); }
  if (u > 0.82) text(c, '3/5', -190, -70, 76, L.ink, 'center', 800);
}
// 5 — Eval set: from the pile of chats, three are picked, marked ✓ ✗ ✓ and filed into the eval booklet
function pic5(c, L, u) {
  for (let i = 4; i >= 0; i--) card(c, -420 + i * 14, -170 - i * 14, 230, 150, L, { edge: L.ink3 });
  const SL = [[-40, -150], [-40, 10], [-40, 170]];
  for (let i = 0; i < 3; i++) {
    const k = sm(prog(u, 0.08 + i * 0.13, 0.25 + i * 0.13)), fly = sm(prog(u, 0.66, 0.86));
    if (k <= 0) continue; const x = lerp(-420, SL[i][0], k), y = lerp(-170, SL[i][1], k) - 40;
    const bx = lerp(x, 250, fly), by = lerp(y, -40, fly), s = lerp(1, 0.55, fly);
    c.save(); c.translate(bx, by); c.scale(s, s); c.globalAlpha = 1 - prog(u, 0.84, 0.88); card(c, 0, 0, 200, 110, L, { edge: L.ink3 });
    const mk = sm(prog(u, 0.45 + i * 0.06, 0.55 + i * 0.06)); if (i === 1) cross(c, 250, 55, 34, L.magenta, 13, mk); else check(c, 250, 55, 36, L.line, 13, mk); c.restore();
  }
  const bk = sm(prog(u, 0.8, 1));
  c.save(); c.translate(320, 0); rr(c, -120, -170, 240, 320, 20); c.fillStyle = L.line; c.globalAlpha = lerp(0.35, 1, bk); c.fill(); c.globalAlpha = 1; line(c, [[-90, -170], [-90, 150]], L.anchorFill, 8);
  for (let j = 0; j < 3; j++) { rr(c, -60, -110 + j * 60, 140, 16, 8); c.fillStyle = L.anchorFill; c.globalAlpha = bk; c.fill(); c.globalAlpha = 1; } c.restore();
}
// 6 — Data processing: raw chats leave their pile and ride the belt; the duplicate is stopped at the gate and drops into the
// bin; every other card drops onto its category's pile (3 / 2 / 1); the piles are levelled (one card taken off the
// tall one, a synthetic card added to the short one: 2 / 2 / 2) and the version stamp lands.
// Beats (u): cards ride 0–.57 (the duplicate drops ≈ .38), level .6–.76, stamp .8–.95.
function pic6(c, L, u) {
  const BY = -40, GX = -80, CW = 64, CH = 84, PB = 222, TH = 36, TW = 100, PX = [170, 285, 400], V = 2600;
  const kL = prog(u, 0.6, 0.76), kD = prog(u, 0.8, 0.95);
  // belt with rollers, the gate arch (dedup), the bin under it, the pile shelf
  line(c, [[-430, BY], [GX - 46, BY]], L.ink3, 12); line(c, [[GX + 46, BY], [445, BY]], L.ink3, 12);
  for (let x = -410; x < 445; x += 50) if (Math.abs(x - GX) > 50) dot(c, x, BY + 20, 7, L.ink3);
  line(c, [[GX - 54, BY - 6], [GX - 54, -205], [GX + 54, -205], [GX + 54, BY - 6]], L.line, 10);
  line(c, [[GX - 74, 118], [GX - 74, 182], [GX + 74, 182], [GX + 74, 118]], L.grey, 10);
  line(c, [[PX[0] - 66, PB], [PX[2] + 60, PB]], L.ink3, 9);
  const CAT = [L.line, L.ink3, L.ink2];
  const cards = [{ cat: 0, p: 0, n: 0 }, { cat: 1, p: 1, n: 0 }, { cat: 0, p: 0, n: 1 }, { cat: 2, p: 2, n: 0 }, { cat: 1, p: 1, n: 1 }, { cat: 0, dup: true }, { cat: 0, p: 0, n: 2 }];
  const cy = BY - CH / 2 - 5;
  for (let i = cards.length - 1; i >= 0; i--) {
    const cd = cards[i], st = i * 0.045, tx = cd.dup ? GX : PX[cd.p];
    const px = -395 + (cards.length - 1 - i) * 7, py = cy - 30 - (cards.length - 1 - i) * 9;   // the raw pile (card 0 on top)
    const lift = sm(prog(u, st, st + 0.04)), dist = tx + 360, k = clamp((u - st - 0.04) * V / dist), kd = sm(prog(u, st + 0.04 + dist / V, st + 0.1 + dist / V));
    let x = lerp(px, -360, lift), y = lerp(py, cy, lift), w = CW, h = CH, col = CAT[cd.cat], edge = null;
    if (lift >= 1) x = lerp(-360, tx, sm(k) * 0.15 + k * 0.85);
    if (cd.dup) { if (k >= 1) { edge = L.magenta; y = lerp(cy, 150, kd); if (kd > 0.6) { col = L.grey; edge = null; } } }
    else if (kd > 0) {   // drop onto the pile and lie down as a tile
      const ty = PB - TH / 2 - 4 - cd.n * (TH + 4); y = lerp(cy, ty, kd); w = lerp(CW, TW, kd); h = lerp(CH, TH, kd);
      if (cd.p === 0 && cd.n === 2) { const cut = sm(prog(kL, 0, 0.5)); c.save(); c.globalAlpha = 1 - cut; rr(c, x - w / 2, y - h / 2 - cut * 70, w, h, 9); c.fillStyle = col; c.fill(); c.restore(); continue; }
    }
    rr(c, x - w / 2, y - h / 2, w, h, 9); c.fillStyle = col; c.fill();
    if (edge) { c.lineWidth = 8; c.strokeStyle = edge; c.stroke(); }
  }
  // the synthetic card joins the short pile (dashed outline), then the level line across 2 / 2 / 2
  const syn = sm(prog(kL, 0.3, 0.8));
  if (syn > 0) { c.save(); c.globalAlpha = syn; const y = PB - TH / 2 - 4 - (TH + 4) - (1 - syn) * 80; rr(c, PX[2] - TW / 2, y - TH / 2, TW, TH, 9); c.fillStyle = L.panelTop; c.fill(); c.setLineDash([12, 8]); c.lineWidth = 6; c.strokeStyle = L.line; c.stroke(); c.restore(); }
  if (kL > 0.8) { c.save(); c.globalAlpha = sm(prog(kL, 0.8, 1)); line(c, [[PX[0] - 70, PB - 2 * (TH + 4) - 12], [PX[2] + 64, PB - 2 * (TH + 4) - 12]], L.line, 7, 1, [16, 10]); c.restore(); }
  // the version stamp
  if (kD > 0) { const s = lerp(1.7, 1, outBack(kD)); c.save(); c.globalAlpha = clamp(kD * 3); c.translate(-300, 128); c.rotate(-0.2); c.scale(s, s);
    c.beginPath(); c.arc(0, 0, 88, 0, 7); c.fillStyle = L.anchorFill; c.fill(); c.lineWidth = 10; c.strokeStyle = L.line; c.stroke(); c.setLineDash([9, 7]); c.beginPath(); c.arc(0, 0, 70, 0, 7); c.lineWidth = 3; c.stroke(); c.setLineDash([]);
    text(c, 'v1.1', 0, 4, 58, L.cyanInk); c.restore(); }
}
// 7 — Drift and cost: the questions drift (the hill slides away from where the eval was built); cost per answer drops
function pic7(c, L, u) {
  const hill = (dx, col, w, dash, k = 1) => { const pts = []; for (let x = -420; x <= 140; x += 10) pts.push([x + dx, 170 - 300 * Math.exp(-Math.pow((x + 150) / 85, 2))]); line(c, pts, col, w, k, dash); };
  line(c, [[-440, 175], [180, 175]], L.ink3, 6);
  const m = sm(prog(u, 0.1, 0.6));
  hill(0, L.ink3, 7, [14, 12]); hill(150 * m, L.line, 12);
  if (m > 0.3) arrow(c, -150, -170, -150 + 150 * m, -170, L.magenta, 10, clamp((m - 0.3) / 0.7));
  for (let i = 0; i < 5; i++) { const gone = i >= 2 ? sm(prog(u, 0.6 + (i - 2) * 0.1, 0.78 + (i - 2) * 0.1)) : 0; c.save(); c.globalAlpha = 1 - gone; const x = 320 + gone * 90, y = 170 - i * 46 - gone * 160;
    c.beginPath(); c.ellipse(x, y, 74, 22, 0, 0, 7); c.fillStyle = L.shell; c.fill(); c.lineWidth = 6; c.strokeStyle = L.ink3; c.stroke(); c.restore(); }
}
// 8 — SLOs and incidents: an error budget (10 cells); an incident burns 3 cells; the review raises the standard line
function pic8(c, L, u) {
  rr(c, -300, -60, 560, 170, 22); c.lineWidth = 9; c.strokeStyle = L.ink3; c.stroke(); rr(c, 262, -10, 26, 70, 8); c.fillStyle = L.ink3; c.fill();
  const burn = sm(prog(u, 0.3, 0.55)), flash = u > 0.15 && u < 0.6 ? 0.5 + 0.5 * Math.sin(u * 60) : 0;
  for (let i = 0; i < 10; i++) { const lost = i >= 7 ? clamp(burn * 3 - (9 - i)) : 0; rr(c, -284 + i * 54, -44, 44, 138, 8); c.fillStyle = lost > 0.5 ? L.magenta : L.line; c.globalAlpha = lost > 0.5 ? 1 - (lost - 0.5) : 0.85; c.fill(); c.globalAlpha = 1; }
  dot(c, 200, -170, 34, L.magenta); c.save(); c.globalAlpha = flash; ring(c, 200, -170, 58, L.magenta, 8); c.restore();
  const up = sm(prog(u, 0.65, 0.95)); line(c, [[-420, 220], [-420, -220]], L.ink3, 7); line(c, [[-440, lerp(150, -120, up)], [-360, lerp(150, -120, up)]], L.line, 12);
  if (up > 0) arrow(c, -390, 150, -390, lerp(150, -95, up), L.line, 7, up);
}

export const AIENG = [
  { n: 1, name: '學來的程式', cycle: 5.0, pic: pic1 },
  { n: 2, name: '偏差／變異', cycle: 4.4, pic: pic2 },
  { n: 3, name: '錯誤分類', cycle: 4.2, pic: pic3 },
  { n: 4, name: '指標', cycle: 4.4, pic: pic4, glyphs: '3/45' },
  { n: 5, name: '考題集', cycle: 5.0, pic: pic5 },
  { n: 6, name: '資料處理', cycle: 4.6, pic: pic6, glyphs: 'v1.1' },
  { n: 7, name: '漂移與成本', cycle: 4.4, pic: pic7 },
  { n: 8, name: '約定與事故', cycle: 4.4, pic: pic8 },
];
export default AIENG;
