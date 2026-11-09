// Azure AI 2026：從 Foundry 到上線監控 (az-l01 … az-l05): course data for lib/house/coursemap.js.
// Same shape as coursemap-aieng.js: one entry per lesson {n, name, cycle, still, glyphs, pic(c, L, u, o)}.
// pic draws the lesson's core mechanism as a holo mini picture in a ±440 × ±250 box around (0, 0); u = 0 … 1 one run,
// a pure function of u. House colours only: cyan = the system / normal, magenta = wrong / warning, amber = the
// student's, grey = not yet (coursemap.js greys a 'later' lesson by itself), everything else blue-grey.
// Big shapes, strokes ≥ 8: it must read in the map's wide shot (a panel is ~300 px wide there); the only words are
// two 4-letter project names and the numbers that are the mechanism (429, ×5).
// `still` = the u a not-yet-reached (grey) lesson shows: the frame that carries the idea.
//
//   import { AZURE } from '/lib/house/coursemap-azure.js';
//   makeCourseMap({ room, H, ui, camera, lessons: AZURE, lesson: 3, … })      (see lib/house/coursemap.js)
//
// Pictures (SERIES.md appendix):
// 1 Foundry 全貌   one big frame (the Foundry resource) holds two projects (prod, dev) that share one deployment (the
//                  hexagon); an agent lives in prod; the App's request (amber dot) walks App → agent → deployment → back.
// 2 部署與額度     the per-minute bucket (clock = one minute): a burst of exam cards fills it, the two over the brim turn
//                  magenta and get the 429 stamp; then the same cards arrive spread over the minute and every one fits (✓).
// 3 追蹤與指標     a trace waterfall grows with a time cursor; one span runs far too long and turns magenta; the token
//                  meter beside it jumps up (×5).
// 4 評估與護欄     a shield stops the magenta card (the attack line on an exam paper); the pass-rate line drops and is
//                  stopped where it meets the threshold (CI gate).
// 5 告警與 AIOps   a metric line crosses the threshold → the bell lights → a magnifier walks back along the line and
//                  drops a magenta pin on the root cause (where the line started to climb).
import { P } from './coursemap.js';

const { rr, dot, ring, line, arrow, text, check, cross, prog, clamp, lerp, sm, out, outBack } = P;

/** position at k (0…1) along a polyline */
function along(pts, k) {
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let d = clamp(k) * tot;
  for (let i = 1; i < pts.length; i++) { if (d <= seg[i - 1] || i === pts.length - 1) { const v = seg[i - 1] ? clamp(d / seg[i - 1]) : 1; return [lerp(pts[i - 1][0], pts[i][0], v), lerp(pts[i - 1][1], pts[i][1], v)]; } d -= seg[i - 1]; }
  return pts[pts.length - 1];
}
/** a machine that thinks (house rule): glossy white head, black visor, two cyan eye marks */
function agentHead(c, L, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  line(c, [[0, -60], [0, -86]], L.ink3, 8); dot(c, 0, -92, 12, L.line);
  rr(c, -74, -62, 148, 124, 42); c.fillStyle = L.shell; c.fill(); c.lineWidth = 9; c.strokeStyle = L.line; c.stroke();
  rr(c, -54, -34, 108, 58, 24); c.fillStyle = '#0b111c'; c.fill();
  dot(c, -22, -5, 10, L.cyan); dot(c, 22, -5, 10, L.cyan);
  c.restore();
}
/** round stamp: label or a check, pressed in from 1.6× (k 0 → 1) */
function stamp(c, L, x, y, k, col, label) {
  if (k <= 0) return;
  const s = lerp(1.6, 1, outBack(k));
  c.save(); c.globalAlpha *= clamp(k * 3); c.translate(x, y); c.rotate(-0.2); c.scale(s, s);
  c.beginPath(); c.arc(0, 0, 92, 0, 7); c.fillStyle = L.anchorFill; c.fill(); c.lineWidth = 11; c.strokeStyle = col; c.stroke();
  c.setLineDash([10, 8]); c.beginPath(); c.arc(0, 0, 73, 0, 7); c.lineWidth = 4; c.stroke(); c.setLineDash([]);
  if (label) text(c, label, 0, 4, 64, col, 'center', 800); else check(c, 0, 4, 40, col, 15);
  c.restore();
}
/** an exam card lying flat in a bucket (white with cyan edge and two text lines; warn = magenta) */
function examTile(c, L, x, y, warn, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  rr(c, x - 140, y - 24, 280, 48, 10); c.fillStyle = warn ? L.magenta : L.shell; c.fill(); c.lineWidth = 7; c.strokeStyle = warn ? L.magenta : L.line; c.stroke();
  rr(c, x - 112, y - 7, 128, 14, 7); c.fillStyle = warn ? L.anchorFill : L.ink3; c.globalAlpha *= warn ? 0.9 : 0.6; c.fill();
  rr(c, x + 32, y - 7, 70, 14, 7); c.fill();
  c.restore();
}

// 1 — Foundry 全貌: resource ⊃ projects (prod, dev) sharing one deployment; the App's request goes App → agent → deployment → back
function pic1(c, L, u) {
  const AX = -385, AY = -55;
  // the Foundry resource: one big frame
  rr(c, -282, -240, 724, 480, 38); c.save(); c.globalAlpha = 0.1; c.fillStyle = L.cyan; c.fill(); c.restore(); c.lineWidth = 11; c.strokeStyle = L.line; c.stroke();
  // two projects
  const proj = (x0, x1, name) => { rr(c, x0, -206, x1 - x0, 232, 26); c.fillStyle = L.shell; c.fill(); c.lineWidth = 8; c.strokeStyle = L.ink3; c.stroke(); text(c, name, (x0 + x1) / 2, -164, 50, L.ink2, 'center', 800); };
  proj(-250, 44, 'prod'); proj(112, 410, 'dev');
  // dev keeps its own (test) agent: a dashed outline
  c.save(); c.setLineDash([14, 10]); rr(c, 196, -112, 124, 104, 34); c.lineWidth = 7; c.strokeStyle = L.ink3; c.stroke(); c.restore();
  agentHead(c, L, -103, -48, 0.86);
  // the one deployment both projects share (hexagon) + its two links
  const HX = 80, HY = 166, HR = 64;
  line(c, [[-103, 26], [-103, HY], [HX - HR, HY]], L.line, 9); line(c, [[258, 26], [258, HY], [HX + HR, HY]], L.line, 9);
  const pulse = prog(u, 0.43, 0.6);
  if (pulse > 0 && pulse < 1) { c.save(); c.globalAlpha = 1 - pulse; ring(c, HX, HY, lerp(HR, HR + 46, out(pulse)), L.line, 9); c.restore(); }
  c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](HX + Math.cos(a) * HR, HY + Math.sin(a) * HR); } c.closePath();
  c.fillStyle = L.line; c.fill(); c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = L.line; c.stroke();
  for (let j = -1; j <= 1; j++) line(c, [[HX - 26, HY + j * 20], [HX + 26, HY + j * 20]], L.anchorFill, 8);
  // the App (the student's)
  rr(c, AX - 56, AY - 72, 112, 144, 18); c.fillStyle = L.shell; c.fill(); c.lineWidth = 9; c.strokeStyle = L.amber; c.stroke();
  line(c, [[AX - 56, AY - 40], [AX + 56, AY - 40]], L.amber, 7);
  for (let j = 0; j < 3; j++) { rr(c, AX - 36, AY - 16 + j * 27, j === 1 ? 48 : 72, 13, 6.5); c.save(); c.globalAlpha = 0.55; c.fillStyle = L.amber; c.fill(); c.restore(); }
  // the request: forward App → agent → deployment, a beat at the deployment, then back
  const path = [[AX + 56, AY], [-103, AY], [-103, HY], [HX - HR + 6, HY]];
  const kF = sm(prog(u, 0.06, 0.43)), kB = sm(prog(u, 0.6, 0.9));
  if (kF > 0) { c.save(); c.globalAlpha = 0.45; line(c, path, L.amber, 9, kF); c.restore(); }
  if (u > 0.05 && u < 0.92) { const [x, y] = kB > 0 ? along(path, 1 - kB) : along(path, kF); c.save(); c.globalAlpha = 0.3; dot(c, x, y, 34, L.amber); c.restore(); dot(c, x, y, 21, L.amber); }
  // back at the App: answered
  const kD = prog(u, 0.88, 0.96);
  if (kD > 0) { c.save(); c.globalAlpha = clamp(kD * 3); dot(c, AX + 46, AY - 70, 30 * outBack(kD), L.line); check(c, AX + 46, AY - 70, 15, L.anchorFill, 8); c.restore(); }
}

// 2 — 部署與額度: the per-minute bucket; a burst overflows (429), the same cards spread over the minute all fit (✓)
function pic2(c, L, u) {
  const BX0 = -270, BX1 = 50, BT = -96, BB = 214, XC = (BX0 + BX1) / 2;
  const slotY = i => BB - 28 - 58 * i;                              // tile i from the bottom (5 fit under the brim)
  line(c, [[BX0 - 14, BT - 44], [BX0 - 14, BB + 14], [BX1 + 14, BB + 14], [BX1 + 14, BT - 44]], L.ink3, 13);
  line(c, [[BX0 - 46, BT - 8], [BX1 + 46, BT - 8]], L.line, 8, 1, [20, 13]);   // the limit (per minute)
  text(c, 'TPM', BX1 + 112, BT - 8, 50, L.cyanInk, 'center', 800);
  // the minute: a clock whose hand shows how much of the minute has passed
  const CX = 262, CY = -170, CR = 60;
  const ang = u < 0.5 ? lerp(0, 0.55, sm(prog(u, 0.04, 0.36))) : lerp(0, Math.PI * 2, prog(u, 0.56, 0.93));
  ring(c, CX, CY, CR, L.ink2, 9);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; line(c, [[CX + Math.sin(a) * (CR - 16), CY - Math.cos(a) * (CR - 16)], [CX + Math.sin(a) * (CR - 4), CY - Math.cos(a) * (CR - 4)]], L.ink2, 6); }
  if (u >= 0.5) { c.save(); c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, CR - 12, -Math.PI / 2, -Math.PI / 2 + ang); c.closePath(); c.globalAlpha = 0.22; c.fillStyle = L.cyan; c.fill(); c.restore(); }
  line(c, [[CX, CY], [CX + Math.sin(ang) * (CR - 14), CY - Math.cos(ang) * (CR - 14)]], L.line, 9); dot(c, CX, CY, 9, L.line);
  if (u < 0.56) {
    // burst: seven cards in a fraction of the minute; the two above the brim are refused
    const fade = 1 - sm(prog(u, 0.48, 0.55));
    for (let i = 0; i < 7; i++) {
      const t0 = 0.04 + i * 0.045, k = clamp((u - t0) / 0.07); if (k <= 0) continue;
      const over = i >= 5 && k >= 1;
      examTile(c, L, XC + (over ? (i === 5 ? 18 : -14) : 0), lerp(-330, slotY(i), k * k), over, fade);
    }
    c.save(); c.globalAlpha = fade; stamp(c, L, 262, 66, prog(u, 0.35, 0.42), L.magenta, '429'); c.restore();
  } else {
    // spread: the same seven cards one by one over the whole minute; each is done before the next arrives
    for (let i = 0; i < 7; i++) {
      const t0 = 0.56 + i * 0.05, k = clamp((u - t0) / 0.05); if (k <= 0) continue;
      const gone = i < 6 ? clamp((u - t0 - 0.065) / 0.025) : 0; if (gone >= 1) continue;
      examTile(c, L, XC, lerp(-330, slotY(0), k * k) + gone * 30, false, 1 - gone);
    }
    stamp(c, L, 262, 66, prog(u, 0.9, 0.97), L.line, '');
  }
}

// 3 — 追蹤與指標: a trace waterfall grows with time; one span is far too long (magenta); tokens jump ×5
function pic3(c, L, u) {
  const X0 = -420, AY = 226, RH = 54, RY = i => -206 + i * 80;
  arrow(c, X0 - 6, AY, 318, AY, L.ink3, 7);
  const rows = [
    { x0: 0, len: 670, d: 0 },                      // invoke_agent (root)
    { x0: 26, len: 112, d: 1, tok: 70 },            // chat
    { x0: 150, len: 66, d: 1 },                     // execute_tool
    { x0: 228, len: 360, d: 1, tok: 290, slow: true },  // chat (the slow one)
    { x0: 600, len: 50, d: 1 },                     // execute_tool
  ];
  const cur = 684 * prog(u, 0.04, 0.82);           // the time cursor, px from X0
  // nesting: a tree line from the root down to its children
  if (cur > 20) line(c, [[X0 + 10, RY(0) + RH / 2], [X0 + 10, RY(4) + RH / 2 - 8]], L.ink3, 6, clamp(cur / 600));
  let tokH = 0, slowVis = 0;
  rows.forEach((r, i) => {
    const vis = clamp(cur - r.x0, 0, r.len); if (vis <= 0) return;
    const y = RY(i), x = X0 + r.x0 + (r.d ? 22 : 0);
    if (r.d) line(c, [[X0 + 10, y + RH / 2], [x - 6, y + RH / 2]], L.ink3, 6);
    if (r.tok) tokH += r.tok * vis / r.len;
    if (r.slow) slowVis = vis;
    const warn = r.slow && vis > 120;
    rr(c, x, y, Math.max(vis, 12), RH, 12);
    if (i === 0) { c.save(); c.globalAlpha = 0.24; c.fillStyle = L.cyan; c.fill(); c.restore(); c.lineWidth = 9; c.strokeStyle = L.line; c.stroke(); }
    else { c.fillStyle = warn ? L.magenta : i % 2 ? L.line : L.cyan; c.fill(); }
  });
  if (u > 0.04 && u < 0.82) line(c, [[X0 + cur, -236], [X0 + cur, AY - 4]], L.ink3, 5, 1, [10, 10]);
  // the token meter
  const MX = 362, MW = 64, MB = 200, MT = -186;
  rr(c, MX, MT, MW, MB - MT, 14); c.lineWidth = 7; c.strokeStyle = L.ink3; c.stroke();
  const h = Math.min(MB - MT - 12, tokH * 1.03);
  if (h > 1) { rr(c, MX + 8, MB - 6 - h, MW - 16, h, 9); c.fillStyle = tokH > 120 ? L.magenta : L.line; c.fill(); }
  if (slowVis > 260) { c.save(); c.globalAlpha = clamp((slowVis - 260) / 50); text(c, '×5', MX + MW / 2, MT - 44, 64, L.magentaInk, 'center', 800); c.restore(); }
}

// 4 — 評估與護欄: the shield stops the attack card; the pass-rate line drops and is stopped at the threshold
function pic4(c, L, u) {
  // the shield (guardrail)
  const SX = -168, SY = -6;
  const shield = (s) => { c.beginPath(); c.moveTo(SX - 104 * s, SY - 112 * s); c.quadraticCurveTo(SX, SY - 156 * s, SX + 104 * s, SY - 112 * s); c.lineTo(SX + 104 * s, SY - 8 * s);
    c.quadraticCurveTo(SX + 98 * s, SY + 98 * s, SX, SY + 146 * s); c.quadraticCurveTo(SX - 98 * s, SY + 98 * s, SX - 104 * s, SY - 8 * s); c.closePath(); };
  const hit = prog(u, 0.3, 0.58), flash = u > 0.3 ? 1 - prog(u, 0.3, 0.5) : 0;
  if (flash > 0) { c.save(); c.globalAlpha = flash * 0.5; shield(1.22); c.fillStyle = L.cyan; c.fill(); c.restore(); }
  shield(1); c.save(); c.globalAlpha = 0.2; c.fillStyle = L.cyan; c.fill(); c.restore(); c.lineJoin = 'round'; c.lineWidth = 13; c.strokeStyle = L.line; c.stroke();
  shield(0.66); c.lineWidth = 6; c.stroke();
  // the attack: an exam card with a magenta line, flies in, is stopped, falls
  const ka = sm(prog(u, 0.04, 0.3));
  const x = lerp(-500, -340, ka) - 34 * Math.sin(Math.min(1, hit * 2.2) * Math.PI / 2), y = SY - 20 + 190 * hit * hit, rot = -0.6 * hit;
  c.save(); c.translate(x, y); c.rotate(rot);
  rr(c, -66, -86, 132, 172, 14); c.fillStyle = L.anchorFill; c.fill(); c.lineWidth = 9; c.strokeStyle = L.magenta; c.stroke();
  for (let j = 0; j < 4; j++) { rr(c, -44, -56 + j * 34, j === 2 ? 88 : 64, 13, 6.5); c.fillStyle = j === 2 ? L.magenta : L.ink3; c.save(); c.globalAlpha = j === 2 ? 1 : 0.55; c.fill(); c.restore(); }
  if (hit > 0) cross(c, 0, 0, 40, L.magenta, 13, prog(u, 0.32, 0.46));
  c.restore();
  // the pass rate against the threshold (CI gate)
  const GX0 = 30, GX1 = 430, yOf = p => lerp(176, -186, (p - 0.75) / 0.25);
  line(c, [[GX0, -214], [GX0, 200], [GX1 + 10, 200]], L.ink3, 7);
  const TY = yOf(0.9);
  line(c, [[GX0, TY], [GX1 + 10, TY]], L.ink2, 8, 1, [20, 13]);
  const pts = [[GX0 + 14, yOf(0.96)], [120, yOf(0.962)], [200, yOf(0.955)], [262, yOf(0.948)], [318, yOf(0.93)], [362, TY]];
  const kl = prog(u, 0.48, 0.84);
  line(c, pts, L.line, 12, kl);
  const ks = prog(u, 0.84, 0.92);
  if (ks > 0) { c.save(); c.globalAlpha = clamp(ks * 2); const r = 36 * outBack(ks); dot(c, 362, TY, r, L.magenta); line(c, [[362 - r * 0.55, TY], [362 + r * 0.55, TY]], L.anchorFill, 10); c.restore(); }
}

// 5 — 告警與 AIOps: the metric crosses the threshold → the bell lights → a magnifier walks back to the root cause (pin)
function pic5(c, L, u) {
  const X0 = -420, XR = 300, TY = -44;
  line(c, [[X0, -214], [X0, 206], [XR + 20, 206]], L.ink3, 7);
  line(c, [[X0, TY], [XR + 20, TY]], L.ink2, 8, 1, [20, 13]);
  const pts = [[X0 + 12, 132], [-330, 140], [-250, 126], [-170, 138], [-96, 130], [-40, 92], [30, 44], [96, 6], [158, -58], [222, -106], [290, -150]];
  const RC = pts[4], kl = prog(u, 0.03, 0.42);
  line(c, pts, L.line, 12, kl);
  c.save(); c.beginPath(); c.rect(-520, -400, 1040, 400 + TY); c.clip(); line(c, pts, L.magenta, 12, kl); c.restore();   // above the threshold → magenta
  // the bell (alert rule fires when the line crosses)
  const fire = prog(u, 0.32, 0.36), BXc = 384, BYc = -150;
  const rot = fire > 0 ? Math.sin(u * 90) * 0.28 * (1 - prog(u, 0.36, 0.62)) : 0;
  c.save(); c.translate(BXc, BYc); c.rotate(rot); c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-52, 32); c.quadraticCurveTo(-48, -42, 0, -50); c.quadraticCurveTo(48, -42, 52, 32); c.lineTo(66, 50); c.lineTo(-66, 50); c.closePath();
  c.fillStyle = fire > 0.5 ? L.magenta : L.shell; c.fill(); c.lineWidth = 10; c.strokeStyle = fire > 0.5 ? L.magenta : L.ink3; c.stroke();
  dot(c, 0, 66, 14, fire > 0.5 ? L.magenta : L.ink3); dot(c, 0, -58, 10, fire > 0.5 ? L.magenta : L.ink3);
  c.restore();
  if (fire > 0.5) { const w = 1 - prog(u, 0.6, 0.8) * 0.6; c.save(); c.globalAlpha = w; for (const s of [-1, 1]) { c.beginPath(); c.arc(BXc, BYc, 92, s < 0 ? Math.PI * 0.82 : -Math.PI * 0.18, s < 0 ? Math.PI * 1.18 : Math.PI * 0.18); c.lineWidth = 8; c.strokeStyle = L.magenta; c.lineCap = 'round'; c.stroke(); } c.restore(); }
  // the investigation: a magnifier walks back along the line to where it started to climb
  const back = [[176, -72], pts[8], pts[7], pts[6], pts[5], RC];
  const km = sm(prog(u, 0.46, 0.78)), aM = clamp(prog(u, 0.44, 0.5) * 1);
  if (aM > 0) { const [mx, my] = along(back, km); c.save(); c.globalAlpha = aM; ring(c, mx, my, 48, L.ink, 11); c.save(); c.globalAlpha *= 0.12; dot(c, mx, my, 44, L.cyan); c.restore(); line(c, [[mx + 36, my + 36], [mx + 84, my + 84]], L.ink, 16); c.restore(); }
  // the root cause pin
  const kp = prog(u, 0.78, 0.88);
  if (kp > 0) { const drop = (1 - out(kp)) * 60; c.save(); c.globalAlpha = clamp(kp * 3); line(c, [[RC[0], RC[1] - 74 - drop], [RC[0], RC[1] - 6]], L.magenta, 9); dot(c, RC[0], RC[1] - 92 - drop, 28, L.magenta); dot(c, RC[0], RC[1] - 92 - drop, 10, L.anchorFill); c.restore(); }
}

export const AZURE = [
  { n: 1, name: 'Foundry 全貌', cycle: 5.0, pic: pic1, still: 0.4, glyphs: 'prodev' },
  { n: 2, name: '部署與額度', cycle: 5.2, pic: pic2, still: 0.43, glyphs: 'TPM429' },
  { n: 3, name: '追蹤與指標', cycle: 4.6, pic: pic3, still: 0.8, glyphs: '×5' },
  { n: 4, name: '評估與護欄', cycle: 4.6, pic: pic4, still: 0.92 },
  { n: 5, name: '告警與 AIOps', cycle: 4.8, pic: pic5, still: 0.9 },
];
export default AZURE;
