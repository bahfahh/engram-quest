// Azure 服務上線維運：3 萬人的正式環境 (ops-l01 … ops-l08, experiment 21): course data for lib/house/coursemap.js.
// Same shape as coursemap-azure.js: one entry per lesson {n, name, cycle, still, glyphs, pic(c, L, u, o)}.
// pic draws the lesson's core mechanism as a holo mini picture in a ±440 × ±250 box around (0, 0); u = 0 … 1 one run,
// a pure function of u. House colours only: cyan = the system / now / normal, amber = the student's, magenta = pressure /
// broken, grey = not yet / retired (coursemap.js greys a 'later' lesson by itself); everything else blue-grey.
// Big shapes, strokes ≥ 8: eight pedestals in two rows of four, a panel is ~300 px wide in the wide shot. The only words are
// numbers that ARE the mechanism (30, 200 / 100 / 47, 21, 4 → 3) and two short slot names (staging, prod).
// `still` = the u a not-yet-reached (grey) lesson shows: the frame that carries the idea.
//
//   import { OPS } from '/lib/house/coursemap-ops.js';
//   makeCourseMap({ room, H, ui, camera, lessons: OPS, lesson: 1, …, times: { preview: [null, t2, t3, …, t8], … } })   (lib/house/coursemap.js)
//
// Pictures (SERIES.md appendix):
// 1 容量         a crowd of 60 dots (30,000 users): only a small cluster lights up and walks through the door (concurrent users);
//                beside it a database cylinder with 30 worker cells fills one by one, the ones that do not fit spill out magenta.
// 2 擴展與部署   two machine blocks; at the peak (load line rises) two more grow; then the two slots (staging / prod) swap places.
// 3 網域與憑證   a lock on an address bar; the validity bar below shrinks 200 → 100 → 47 days; the auto-renew arrow circles back
//                and refills it.
// 4 身分與權限   three keys (team amber, code cyan, users blue-grey) slide into three doors; below, the row of Owner keys
//                goes from four to three (the fourth turns grey and drops).
// 5 網路與防護   requests fly at a shield in front of a wall; magenta ones bounce off, cyan ones pass; the database moves from
//                outside the wall to inside.
// 6 看得見       one slow request (dot) leaves the API box; a magnifier follows it; at the database it bounces back and forth,
//                the counter runs to ×21.
// 7 告警與值班   a metric line crosses the threshold → the bell rings → a cursor walks back along the timeline below and
//                drops a magenta pin on the 「⇄」 swap cell.
// 8 SLO 與檢討   the error-budget bar; an incident bites a magenta chunk off it; a loop arrow returns to a 「1」 chip (lesson 1).
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
const fill = (c, col, a = 1) => { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.fill(); c.restore(); };
const stroke = (c, col, w = 9) => { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(); };
/** database cylinder centred at (x, y): w × h body; the top ellipse drawn last */
function cylinder(c, L, x, y, w, h, col = L.line, body = L.shell) {
  const ry = w * 0.18;
  c.beginPath(); c.moveTo(x - w / 2, y - h / 2); c.lineTo(x - w / 2, y + h / 2); c.ellipse(x, y + h / 2, w / 2, ry, 0, Math.PI, 0, true); c.lineTo(x + w / 2, y - h / 2); c.closePath();
  fill(c, body); stroke(c, col, 9);
  c.beginPath(); c.ellipse(x, y - h / 2, w / 2, ry, 0, 0, Math.PI * 2); fill(c, body); stroke(c, col, 9);
}
/** a machine block (server) */
function machine(c, L, x, y, s, col, a = 1) {
  if (s <= 0.01 || a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  rr(c, -46, -62, 92, 124, 14); fill(c, L.shell); stroke(c, col, 9);
  for (let j = 0; j < 3; j++) { rr(c, -28, -40 + j * 30, 56, 12, 6); fill(c, col, 0.55); }
  dot(c, 26, 46, 7, col);
  c.restore();
}
/** a key: ring head + shaft + teeth, pointing right; (x, y) = head centre */
function key(c, L, x, y, s, col, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  ring(c, 0, 0, 26, col, 11); line(c, [[26, 0], [110, 0]], col, 11); line(c, [[86, 0], [86, 20]], col, 10); line(c, [[104, 0], [104, 16]], col, 10);
  c.restore();
}
/** round stamp / chip with text */
function chipTxt(c, L, x, y, r, col, s, size = 60, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; dot(c, x, y, r, col); text(c, s, x, y + 3, size, L.anchorFill, 'center', 800); c.restore();
}

// 1 — 容量: 60 dots (3 万) → a small cluster lights and walks through the door; 30 worker cells fill, the overflow spills magenta
function pic1(c, L, u) {
  // the crowd: 10 × 6 dots
  const GX = -410, GY = -200, D = 34;
  const lit = [12, 13, 22, 23, 24, 33, 34];          // the concurrent few (~12 %)
  const walk = sm(prog(u, 0.08, 0.36));
  const DOOR = -40;
  for (let i = 0; i < 60; i++) {
    const cx = GX + (i % 10) * D, cy = GY + Math.floor(i / 10) * D * 1.2;
    const k = lit.indexOf(i);
    if (k < 0) { dot(c, cx, cy, 10, L.ink3); continue; }
    const on = sm(prog(u, 0.02 + k * 0.012, 0.08 + k * 0.012));
    const x = lerp(cx, DOOR + 26, walk), y = lerp(cy, -40 + (k - 3) * 22, walk);
    dot(c, x, y, lerp(10, 13, on), on > 0.5 ? L.cyan : L.ink3);
  }
  // the door (the app): a frame the lit dots walk into
  rr(c, DOOR, -150, 52, 220, 10); fill(c, L.cyan, 0.12); stroke(c, L.line, 10);
  // arrow door → database
  arrow(c, 30, -40, 96, -40, L.line, 9, sm(prog(u, 0.3, 0.38)));
  // the database with 30 worker cells (6 rows × 5)
  const X = 260, Y = 30, W = 290, H = 300;
  cylinder(c, L, X, Y, W, H);
  const CW = 46, CH = 34, x0 = X - 2.5 * CW - 6, yb = Y + H / 2 - 36;
  const nFill = Math.floor(30 * prog(u, 0.36, 0.78));
  for (let i = 0; i < 30; i++) {
    const cx = x0 + (i % 5) * (CW + 3), cy = yb - Math.floor(i / 5) * (CH + 6);
    rr(c, cx, cy, CW, CH, 6); if (i < nFill) fill(c, L.line); else stroke(c, L.ink3, 3);
  }
  // overflow: queries that find no worker spill out, magenta
  const ov = prog(u, 0.8, 0.98);
  for (let j = 0; j < 4; j++) {
    const k = clamp(ov * 4 - j); if (k <= 0) continue;
    const sx = X + 110 + j * 6, sy = Y - H / 2 - 30 + out(k) * (20 + j * 46), sxx = sx + out(k) * (30 + j * 8);
    rr(c, sxx - 23, sy - 17, 46, 34, 6); fill(c, L.magenta, clamp(k * 2));
  }
  if (u > 0.5) text(c, '30', X, Y - H / 2 - 92, 56, L.cyanInk, 'center', 800);
}

// 2 — 擴展與部署: two machines; the load rises and two more grow; then staging and prod swap places
function pic2(c, L, u) {
  // load line (top left)
  const lx0 = -420, lx1 = -40, base = -150;
  const pts = Array.from({ length: 12 }, (_, i) => [lx0 + i * (lx1 - lx0) / 11, base - (i > 4 && i < 10 ? 70 * Math.sin((i - 4) / 5 * Math.PI) : 0) * 1]);
  line(c, [[lx0, -232], [lx0, base + 10], [lx1 + 8, base + 10]], L.ink3, 6);
  line(c, pts, L.line, 9, sm(prog(u, 0.02, 0.4)));
  // machines: 2 base + 2 that grow at the peak
  const g1 = outBack(prog(u, 0.22, 0.34)), g2 = outBack(prog(u, 0.28, 0.4));
  [[-370, 0], [-260, 0]].forEach(([x], i) => machine(c, L, x, 90, 0.9, L.line));
  machine(c, L, -150, 90, 0.9 * g1, L.cyan); machine(c, L, -40, 90, 0.9 * g2, L.cyan);
  // the two slots, side by side; they swap (prod on the left after)
  const k = sm(prog(u, 0.52, 0.86));
  const XA = 150, XB = 340, slot = (x, y, name, col, fillA) => { rr(c, x - 80, y - 110, 160, 220, 18); fill(c, col, fillA); stroke(c, col, 10); text(c, name, x, y - 70, 40, col === L.line ? L.cyanInk : L.ink2, 'center', 800); machine(c, L, x, y + 30, 0.62, col); };
  const ax = lerp(XA, XB, k), ay = -Math.sin(k * Math.PI) * 70, bx = lerp(XB, XA, k), by = Math.sin(k * Math.PI) * 70;
  slot(ax, 20 + ay, 'staging', L.ink3, 0.08);
  slot(bx, 20 + by, 'prod', L.line, 0.14);
  if (k > 0 && k < 1) { c.save(); c.globalAlpha = Math.sin(k * Math.PI); arrow(c, XA + 10, -150, XB - 10, -150, L.line, 8); arrow(c, XB - 10, 190, XA + 10, 190, L.line, 8); c.restore(); }
}

// 3 — 網域與憑證: the lock on the address bar; validity 200 → 100 → 47 days shrinks; auto-renew loops back and refills
function pic3(c, L, u) {
  // address bar
  rr(c, -400, -220, 800, 96, 48); fill(c, L.shell); stroke(c, L.ink3, 8);
  // lock
  const LX = -330, LY = -172;
  c.beginPath(); c.arc(LX, LY - 12, 20, Math.PI, 0); stroke(c, L.line, 9); rr(c, LX - 30, LY - 12, 60, 46, 8); fill(c, L.line);
  rr(c, -270, -186, 380, 26, 13); fill(c, L.ink3, 0.45);
  // the validity bar: full width = 200 days
  const BX = -420, BW = 680, BY = 0, BH = 70;
  // the validity shrinks in steps (200 → 100 → 47 days); then this period's clock runs out and the renewal refills it
  const dNow = lerp(lerp(200, 100, sm(prog(u, 0.3, 0.4))), 47, sm(prog(u, 0.52, 0.62)));
  const days = u < 0.35 ? 200 : u < 0.57 ? 100 : 47;
  const refill = sm(prog(u, 0.84, 0.96));
  const ww = BW * dNow / 200;
  rr(c, BX, BY, BW, BH, 35); stroke(c, L.ink3, 7);
  // drain within the current period (the clock running out), then refill when renewed
  const drain = u > 0.62 ? sm(prog(u, 0.62, 0.8)) * (1 - refill) : 0;
  const cur = Math.max(70, ww * (1 - 0.82 * drain));
  rr(c, BX, BY, cur, BH, 35); fill(c, drain > 0.6 && refill < 0.5 ? L.magenta : L.line);
  text(c, String(days), BX + BW + 78, BY + BH / 2 + 2, 60, days === 47 ? L.magentaInk : L.cyanInk, 'center', 800);
  // the auto-renew loop: a circular arrow from the bar's end back to its start
  const kr = sm(prog(u, 0.7, 0.9));
  if (kr > 0) {
    const cx = 0, cy = 170, R = 62;
    c.save(); c.beginPath(); c.arc(cx, cy, R, -Math.PI * 0.1, -Math.PI * 0.1 + kr * Math.PI * 1.7); stroke(c, L.line, 11); c.restore();
    if (kr > 0.9) { const a = -Math.PI * 0.1 + Math.PI * 1.7, ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R; c.save(); c.translate(ex, ey); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(14, 0); c.lineTo(-12, -16); c.lineTo(-12, 16); c.closePath(); fill(c, L.line); c.restore(); }
  }
}

// 4 — 身分與權限: three keys into three doors; the Owner keys go from four to three
function pic4(c, L, u) {
  const cols = [L.amber, L.line, L.ink2];
  for (let i = 0; i < 3; i++) {
    const DX = -230 + i * 260, DY = -110;
    rr(c, DX + 40, DY - 100, 120, 170, 12); fill(c, L.shell); stroke(c, cols[i], 10);
    dot(c, DX + 70, DY - 15, 9, cols[i]);
    const k = sm(prog(u, 0.05 + i * 0.1, 0.3 + i * 0.1));
    key(c, L, lerp(DX - 150, DX - 70, k), DY - 15, 0.9, cols[i]);
  }
  // Owner keys: 4 → 3
  const Y = 160;
  line(c, [[-420, Y + 60], [420, Y + 60]], L.ink3, 5);
  const drop = sm(prog(u, 0.62, 0.9));
  for (let i = 0; i < 4; i++) {
    const x = -300 + i * 170;
    if (i === 3) { const g = prog(u, 0.55, 0.62) > 0.5; key(c, L, x, Y + drop * 60, 0.95, g ? L.grey : L.amber, 1 - drop * 0.8); }
    else key(c, L, x, Y, 0.95, L.amber);
  }
  if (u > 0.62) text(c, '3', 400, Y - 4, 64, L.amberInk, 'center', 800); else text(c, '4', 400, Y - 4, 64, L.magentaInk, 'center', 800);
}

// 5 — 網路與防護: requests hit the shield; magenta bounce, cyan pass; the database moves inside the wall
function pic5(c, L, u) {
  const WX = 200, WY = 0, WR = 210;
  c.beginPath(); c.arc(WX, WY, WR, 0, Math.PI * 2); fill(c, L.cyan, 0.08); stroke(c, L.line, 12);
  // shield in front (left side of the wall)
  const SX = -40, SY = 0;
  c.beginPath(); c.moveTo(SX - 50, SY - 90); c.quadraticCurveTo(SX, SY - 120, SX + 50, SY - 90); c.lineTo(SX + 50, SY + 10); c.quadraticCurveTo(SX + 46, SY + 80, SX, SY + 112); c.quadraticCurveTo(SX - 46, SY + 80, SX - 50, SY + 10); c.closePath();
  fill(c, L.cyan, 0.22); stroke(c, L.line, 11);
  // requests: 6 dots in sequence; 0, 2, 4 pass (cyan) into the app; 1, 3, 5 bounce (magenta)
  for (let j = 0; j < 6; j++) {
    const t0 = 0.02 + j * 0.08, k = prog(u, t0, t0 + 0.14); if (k <= 0 || k >= 1) continue;
    const yy = -80 + (j % 3) * 70, bad = j % 2 === 1;
    let x, y = yy;
    if (k < 0.55) x = lerp(-430, SX - 60, k / 0.55);
    else if (bad) { const b = (k - 0.55) / 0.45; x = lerp(SX - 60, -300, out(b)); y = yy + b * 60; }
    else x = lerp(SX - 60, WX - 60, (k - 0.55) / 0.45);
    dot(c, x, y, 16, bad ? L.magenta : L.cyan);
    if (bad && k > 0.55) cross(c, SX - 80, yy, 14, L.magenta, 8, 1);
  }
  // the app inside the wall
  rr(c, WX - 90, WY - 60, 90, 110, 12); fill(c, L.shell); stroke(c, L.line, 9);
  // the database: starts outside (top right), moves inside the wall
  const k = sm(prog(u, 0.55, 0.88));
  const dx = lerp(370, WX + 80, k), dy = lerp(-180, WY + 5, k);
  cylinder(c, L, dx, dy, 100, 100, k > 0.99 ? L.line : L.magenta);
}

// 6 — 看得見: a slow request leaves the API, the magnifier follows it, at the database it bounces 21 times (×21)
function pic6(c, L, u) {
  const AX = -300, AY = 0, DX = 260, DY = 0;
  rr(c, AX - 90, AY - 110, 180, 220, 18); fill(c, L.shell); stroke(c, L.line, 10);
  for (let j = 0; j < 3; j++) { rr(c, AX - 60, AY - 60 + j * 44, 120, 18, 9); fill(c, L.ink3, 0.5); }
  cylinder(c, L, DX, DY, 180, 210);
  line(c, [[AX + 90, AY], [DX - 90, DY]], L.ink3, 6, 1, [14, 12]);
  // trips: the request makes 21 round trips between api and db (fast) after travelling out
  const trips = 21, kT = prog(u, 0.16, 0.86), n = Math.min(trips, Math.floor(kT * trips + (kT > 0 ? 1 : 0)));
  let x, y = AY;
  if (u < 0.16) x = lerp(AX, AX + 90, prog(u, 0.02, 0.16));
  else if (u < 0.86) { const ph = (kT * trips) % 1; x = lerp(AX + 100, DX - 100, ph < 0.5 ? ph * 2 : 2 - ph * 2); }
  else x = lerp(AX + 100, AX + 90, prog(u, 0.86, 0.9));
  dot(c, x, y, 18, n >= 6 ? L.magenta : L.cyan);
  // magnifier follows the request
  const mx = x, my = y - 6;
  c.save(); ring(c, mx, my, 50, L.ink, 11); c.globalAlpha = 0.12; dot(c, mx, my, 46, L.cyan); c.restore();
  line(c, [[mx + 36, my + 36], [mx + 86, my + 86]], L.ink, 16);
  // the counter
  if (u > 0.16) text(c, '×' + Math.max(1, n), 20, -170, 72, n >= 6 ? L.magentaInk : L.cyanInk, 'center', 800);
}

// 7 — 告警與值班: the line crosses the threshold → the bell rings → the cursor walks back along the timeline to the swap cell (pin)
function pic7(c, L, u) {
  const X0 = -420, XR = 260, TY = -110;
  line(c, [[X0, -240], [X0, 40], [XR + 20, 40]], L.ink3, 7);
  line(c, [[X0, TY], [XR + 20, TY]], L.ink2, 8, 1, [20, 13]);
  const pts = [[X0 + 10, 10], [-330, 14], [-250, 6], [-170, 12], [-90, 2], [-30, -40], [40, -90], [110, -150], [180, -200], [250, -226]];
  const kl = prog(u, 0.03, 0.38);
  line(c, pts, L.line, 12, kl);
  c.save(); c.beginPath(); c.rect(-520, -400, 1040, 400 + TY); c.clip(); line(c, pts, L.magenta, 12, kl); c.restore();
  // bell
  const fire = prog(u, 0.3, 0.34), BXc = 370, BYc = -150, rot = fire > 0 ? Math.sin(u * 90) * 0.28 * (1 - prog(u, 0.34, 0.56)) : 0;
  c.save(); c.translate(BXc, BYc); c.rotate(rot);
  c.beginPath(); c.moveTo(-52, 32); c.quadraticCurveTo(-48, -42, 0, -50); c.quadraticCurveTo(48, -42, 52, 32); c.lineTo(66, 50); c.lineTo(-66, 50); c.closePath();
  fill(c, fire > 0.5 ? L.magenta : L.shell); stroke(c, fire > 0.5 ? L.magenta : L.ink3, 10);
  dot(c, 0, 66, 14, fire > 0.5 ? L.magenta : L.ink3); c.restore();
  // the timeline below: 8 cells, the 5th is the swap (⇄)
  const CY = 150, CW = 92;
  for (let i = 0; i < 8; i++) {
    const x = -400 + i * (CW + 10);
    rr(c, x, CY - 40, CW, 80, 12); fill(c, L.shell); stroke(c, i === 4 && u > 0.82 ? L.magenta : L.ink3, i === 4 ? 9 : 6);
    if (i === 4) { const col = u > 0.82 ? L.magenta : L.ink2; arrow(c, x + 20, CY - 12, x + CW - 20, CY - 12, col, 7); arrow(c, x + CW - 20, CY + 14, x + 20, CY + 14, col, 7); }
  }
  // the cursor walks back from the right end of the timeline to the swap cell
  const kc = sm(prog(u, 0.46, 0.78)), cx = lerp(-400 + 7 * (CW + 10) + CW / 2, -400 + 4 * (CW + 10) + CW / 2, kc);
  if (u > 0.44) { c.save(); c.globalAlpha = clamp(prog(u, 0.44, 0.5)); line(c, [[cx, CY - 60], [cx, CY + 60]], L.ink, 8); dot(c, cx, CY - 64, 10, L.ink); c.restore(); }
  // the pin
  const kp = prog(u, 0.8, 0.9);
  if (kp > 0) { const px = -400 + 4 * (CW + 10) + CW / 2, drop = (1 - out(kp)) * 50; c.save(); c.globalAlpha = clamp(kp * 3); line(c, [[px, CY - 120 - drop], [px, CY - 46]], L.magenta, 9); dot(c, px, CY - 136 - drop, 26, L.magenta); dot(c, px, CY - 136 - drop, 9, L.anchorFill); c.restore(); }
}

// 8 — SLO 與檢討: the error budget bar; an incident bites a chunk off; the loop arrow goes back to lesson 1
function pic8(c, L, u) {
  const BX = -410, BY = -150, BW = 620, BH = 90;
  rr(c, BX, BY, BW, BH, 45); stroke(c, L.ink3, 7);
  // the month's budget drains slowly; the incident bites a big magenta chunk
  const drain = 0.18 * sm(prog(u, 0.04, 0.3));
  const bite = 0.36 * sm(prog(u, 0.3, 0.42));
  const left = 1 - drain - bite;
  rr(c, BX, BY, Math.max(BH, BW * left), BH, 45); fill(c, L.line);
  if (bite > 0.01) { c.save(); c.beginPath(); c.rect(BX + BW * left, BY - 4, BW * bite, BH + 8); c.clip(); rr(c, BX + BW * left - 30, BY, BW * bite + 30, BH, 20); fill(c, L.magenta, 0.9); c.restore(); }
  // a bite mark: three teeth notches
  if (bite > 0.2) for (let j = 0; j < 3; j++) dot(c, BX + BW * left + 8, BY + 18 + j * 28, 12, L.anchorFill);
  // the incident marker under the bite
  const kb = prog(u, 0.3, 0.38);
  if (kb > 0) { c.save(); c.globalAlpha = clamp(kb * 3); const mx = BX + BW * (1 - drain - bite / 2); line(c, [[mx, BY + BH + 12], [mx, BY + BH + 70]], L.magenta, 9); dot(c, mx, BY + BH + 84, 18, L.magenta); c.restore(); }
  // the loop: a big circular arrow on the right, back to a 「1」 chip (lesson 1: 算)
  const kr = sm(prog(u, 0.5, 0.88)), CX = 300, CY = 80, R = 110;
  if (kr > 0) { c.save(); c.beginPath(); c.arc(CX, CY, R, -Math.PI * 0.5, -Math.PI * 0.5 + kr * Math.PI * 1.75); stroke(c, L.line, 12); c.restore(); }
  if (kr > 0.95) { const a = -Math.PI * 0.5 + Math.PI * 1.75, ex = CX + Math.cos(a) * R, ey = CY + Math.sin(a) * R; c.save(); c.translate(ex, ey); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(18, 0); c.lineTo(-14, -20); c.lineTo(-14, 20); c.closePath(); fill(c, L.line); c.restore(); }
  const k1 = outBack(prog(u, 0.86, 0.96));
  if (k1 > 0.05) chipTxt(c, L, CX - R + 10, CY - R + 20, 46 * k1, L.line, '1', 56 * Math.min(1, k1));
  // small step chips around the loop (the review's action items): three ticks
  for (let j = 0; j < 3; j++) { const kk = prog(u, 0.56 + j * 0.08, 0.62 + j * 0.08); if (kk <= 0) continue; const a = -Math.PI * 0.2 + j * 0.55; check(c, CX + Math.cos(a) * (R + 46), CY + Math.sin(a) * (R + 46), 18, L.line, 9, kk); }
}

export const OPS = [
  { n: 1, name: '容量', cycle: 5.0, pic: pic1, still: 0.9, glyphs: '30' },
  { n: 2, name: '擴展與部署', cycle: 5.0, pic: pic2, still: 0.7, glyphs: 'stagingprod' },
  { n: 3, name: '網域與憑證', cycle: 5.2, pic: pic3, still: 0.6, glyphs: '200147' },
  { n: 4, name: '身分與權限', cycle: 4.6, pic: pic4, still: 0.8, glyphs: '43' },
  { n: 5, name: '網路與防護', cycle: 5.0, pic: pic5, still: 0.62 },
  { n: 6, name: '看得見', cycle: 5.2, pic: pic6, still: 0.7, glyphs: '×21' },
  { n: 7, name: '告警與值班', cycle: 5.0, pic: pic7, still: 0.92 },
  { n: 8, name: 'SLO 與檢討', cycle: 5.0, pic: pic8, still: 0.95, glyphs: '1' },
];
export default OPS;
