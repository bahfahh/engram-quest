// screen.js — what the desk monitor shows: replays of the real things in the notes.
// Every program is a pure function of (local time τ, beat duration). 1600×900 canvas.
import * as THREE from 'three';
import { clamp, lerp, prog, rng } from './stage.js';
import * as D from './content.js';
import { F, NOTEXT, wrap } from './paper.js';

export const SW = 1600, SH = 900;
const C = { bg: '#0e131b', panel: '#151c27', line: '#243041', ink: '#e3eaf3', dim: '#8e9bb0', amber: '#f2b24a', red: '#ec5a4f', green: '#4cc78f', blue: '#5ea6ec', grey: '#4a5568' };
const sm = k => k * k * (3 - 2 * k);
let cv, ctx, tex;
export function makeScreen() {
  cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; ctx = cv.getContext('2d');
  tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function T(s, x, y, size, color = C.ink, o = {}) {
  if (NOTEXT && !o.keep) return;
  ctx.textRendering = o.family === F.mono ? 'optimizeSpeed' : 'auto';   // no ligatures in code (!= stays !=)
  ctx.font = `${o.weight || 500} ${size}px ${o.family || F.sans}`; ctx.fillStyle = color; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
  ctx.globalAlpha = o.alpha ?? 1; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
}
function TW(s, x, y, maxW, size, color, o = {}) {   // wrapped
  ctx.font = `${o.weight || 500} ${size}px ${o.family || F.sans}`;
  const lines = wrap(ctx, s, maxW);
  lines.forEach((l, i) => T(l, x, y + i * size * 1.35, size, color, o));
  return lines.length * size * 1.35;
}
function rr(x, y, w, h, r, fill, stroke, lw = 2) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function chrome(title, sub) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, SW, 56);
  for (const [i, c] of ['#ec5a4f', '#f2b24a', '#4cc78f'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(36 + i * 30, 28, 9, 0, 7); ctx.fill(); }
  if (title) T(title, 130, 29, 26, C.dim, { family: F.mono, weight: 400 });
  if (sub) T(sub, SW - 34, 29, 24, C.dim, { align: 'right', alpha: 0.9 });
}
function bracket(x, y, w, h, color = C.amber, alpha = 1, lw = 7) {   // the transaction: the same amber bracket everywhere
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const k = Math.min(18, w * 0.25);
  ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + k, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - k, y + h); ctx.stroke();
  ctx.restore();
}
function badge(s, x, y, color, size = 30) {
  if (NOTEXT) { rr(x, y - size * 0.75, size * 3, size * 1.5, 10, color + '33', color); return; }
  ctx.font = `700 ${size}px ${F.sans}`; const w = ctx.measureText(s).width + size;
  rr(x, y - size * 0.75, w, size * 1.5, 10, color + '2a', color, 2.5); T(s, x + size / 2, y + 1, size, color, { weight: 700 });
}
function check(x, y, s, color) { ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.35, y); ctx.lineTo(x - s * 0.08, y + s * 0.28); ctx.lineTo(x + s * 0.4, y - s * 0.32); ctx.stroke(); }
function cross(x, y, s, color) { ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.32); ctx.lineTo(x + s * 0.32, y + s * 0.32); ctx.moveTo(x + s * 0.32, y - s * 0.32); ctx.lineTo(x - s * 0.32, y + s * 0.32); ctx.stroke(); }

// ---------------------------------------------------------------- programs
const P = {};
P.idle = (τ) => {
  const g = ctx.createLinearGradient(0, 0, SW, SH); g.addColorStop(0, '#1b2a3a'); g.addColorStop(1, '#2e2a33'); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const r = rng(3); for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,220,170,${0.03 + r() * 0.05})`; ctx.beginPath(); ctx.arc(r() * SW, r() * SH, 20 + r() * 120, 0, 7); ctx.fill(); }
};

// 案件一：SampleApp walks the three questions
P['c1-tree'] = (τ, d) => {
  const S = D.SCREEN_TXT['c1-tree'];
  chrome(S.win, '');
  const cx = 800, qy = [250, 440, 630], qw = 700, qh = 116;
  // outcome boxes
  const kept = sm(prog(τ, 7.0, 7.8));
  rr(70, 380, 300, 220, 18, kept > 0 ? `rgba(76,199,143,${0.12 + 0.2 * kept})` : '#132019', C.green, 3);
  TW(S.keep, 95, 445, 250, 34, C.green, { weight: 700 });
  rr(SW - 370, 380, 300, 220, 18, '#121a26', '#3b5675', 3);
  TW(S.go, SW - 345, 445, 250, 30, '#6f8fb4', { weight: 700 });
  ctx.strokeStyle = '#3d4a5c'; ctx.lineWidth = 4;
  qy.forEach((y, i) => {
    if (i < 2) { ctx.beginPath(); ctx.moveTo(cx, y + qh / 2); ctx.lineTo(cx, qy[i + 1] - qh / 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - qw / 2, y); ctx.lineTo(370, 490); ctx.stroke();
    ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(cx + qw / 2, y); ctx.lineTo(SW - 370, 490); ctx.stroke(); ctx.setLineDash([]);
  });
  qy.forEach((y, i) => {
    const on = prog(τ, 1.4 + i * 1.8, 1.8 + i * 1.8);
    rr(cx - qw / 2, y - qh / 2, qw, qh, 16, '#1a2230', on > 0 ? C.amber : '#43506a', 3);
    T(S.q[i], cx - 48, y, 38, C.ink, { align: 'center', weight: 700 });
    const no = sm(prog(τ, 2.1 + i * 1.8, 2.5 + i * 1.8));
    if (no > 0) { ctx.save(); ctx.globalAlpha = no; ctx.translate(cx + qw / 2 - 70, y); ctx.rotate(-0.15); rr(-48, -36, 96, 72, 10, 'rgba(236,90,79,.15)', C.red, 4); T(S.no, 0, 2, 44, C.red, { align: 'center', weight: 700 }); ctx.restore(); }
  });
  // the SampleApp chip travels down, then left into "keep"
  const steps = [[cx, 120], [cx - qw / 2 - 90, qy[0]], [cx - qw / 2 - 90, qy[1]], [cx - qw / 2 - 90, qy[2]], [220, 520]];
  const kf = [0.6, 1.4, 3.2, 5.0, 7.0];
  let p = steps[0];
  for (let i = 1; i < steps.length; i++) { const k = sm(prog(τ, kf[i - 1] + 0.3, kf[i])); if (τ > kf[i - 1]) p = [lerp(steps[i - 1][0], steps[i][0], k), lerp(steps[i - 1][1], steps[i][1], k)]; }
  const a = sm(prog(τ, 0.3, 0.8));
  ctx.save(); ctx.globalAlpha = a; rr(p[0] - 90, p[1] - 34, 180, 68, 34, '#f2e4c4', '#a3221b', 3); T(S.title, p[0], p[1] + 1, 32, '#3a2410', { align: 'center', weight: 700, family: F.inter }); ctx.restore();
};

// 案件一：swap the issuer — the permission line never changes
function pool(x, y, cell, lit, color = C.amber, glow = 0) {
  for (let i = 0; i < 100; i++) {
    const cx = x + (i % 10) * cell, cy = y + Math.floor(i / 10) * cell;
    const on = lit(i);
    rr(cx + 4, cy + 4, cell - 8, cell - 8, 6, on ? 'rgba(242,178,74,.2)' : '#141b26', on ? color : '#2c3748', on ? 3 : 2);
    if (on) bracket(cx + 13, cy + 12, cell - 26, cell - 24, color, 1, 4);
  }
  if (glow > 0) { ctx.save(); ctx.globalAlpha = glow * 0.5; ctx.strokeStyle = C.amber; ctx.lineWidth = 10; ctx.strokeRect(x - 6, y - 6, cell * 10 + 12, cell * 10 + 12); ctx.restore(); }
}
P['c2-pool'] = (τ, d, b) => {
  const S = D.SCREEN_TXT['c2-pool'];
  chrome('connection pool', '');
  const gx = 120, gy = 110, cell = 66;
  τ = Math.max(0, τ);
  if (b.id === 'c2_terms') {   // borrow one, give it back
    const cyc = 2.6, k = (τ % cyc) / cyc, n = Math.floor(τ / cyc);
    const slot = [12, 47, 81, 5][n % 4];
    pool(gx, gy, cell, i => i === slot && k > 0.2 && k < 0.8);
    // an order card coming in
    const ox = lerp(1500, 1000, sm(prog(k, 0, 0.2)));
    rr(ox - 110, 360, 220, 120, 14, '#1d2636', '#46566f', 2); T('#' + (1041 + n), ox, 420, 34, C.ink, { align: 'center', family: F.mono, keep: true });
    if (k > 0.15 && k < 0.85) bracket(ox - 130, 340, 260, 160, C.amber, 1, 6);
    return;
  }
  const slow = b.id === 'c2_pool' ? 5.5 : 0;   // seconds into the replay when ERP becomes slow
  const local = τ - slow;
  let used, need, queue;
  if (τ < slow) {
    const f = Math.floor(τ * 12.5), r = rng(f + 1);
    const a = Math.floor(r() * 100), c = Math.floor(r() * 100);
    used = 2; pool(gx, gy, cell, i => i === a || i === c);
    need = 2; queue = 0;
  } else {
    used = Math.min(100, Math.floor(25 * local)); queue = Math.max(0, Math.floor(25 * local) - 100);
    const order = []; const r = rng(9); const idx = [...Array(100).keys()]; for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const rank = new Array(100); idx.forEach((v, i) => rank[v] = i);
    pool(gx, gy, cell, i => rank[i] < used, C.amber, used >= 100 ? 0.6 + 0.4 * Math.sin(τ * 6) : 0);
    need = used >= 100 ? 205 : used;
  }
  // right panel: arrivals and counters
  const px = 860;
  rr(px, 110, 680, 660, 18, C.panel, C.line);
  T(S.flat, px + 40, 160, 32, C.ink, { weight: 700 });
  // conveyor of orders: 25 per second
  const off = (τ * 25 * 26) % 26;
  for (let i = 0; i < 22; i++) { const xx = px + 40 + i * 26 - off; if (xx > px + 30 && xx < px + 640) rr(xx, 210, 18, 26, 4, '#46566f'); }
  T(τ < slow ? S.hold0 : S.hold1, px + 40, 290, 34, τ < slow ? C.green : C.red, { weight: 700 });
  T(S.inUse, px + 40, 380, 30, C.dim);
  T(`${used} / 100`, px + 640, 380, 54, used >= 100 ? C.red : C.ink, { align: 'right', weight: 700, family: F.inter, keep: true });
  T(S.need, px + 40, 470, 30, C.dim);
  T(τ < slow ? '≈ 2' : used >= 100 ? '≈ 205' : `${used}…`, px + 640, 470, 54, τ < slow ? C.green : C.red, { align: 'right', weight: 700, family: F.inter, keep: true });
  T(S.queue, px + 40, 560, 30, C.dim);
  T(String(queue), px + 640, 560, 54, queue ? C.red : C.dim, { align: 'right', weight: 700, family: F.inter, keep: true });
  // waiting line
  for (let i = 0; i < Math.min(queue, 40); i++) rr(px + 40 + (i % 20) * 30, 640 + Math.floor(i / 20) * 40, 22, 30, 4, 'rgba(236,90,79,.6)');
};

// 案件二：the monitoring dashboard (示意)
P['c2-dash'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c2-dash'];
  chrome('monitoring', S.title);
  const k = sm(prog(τ, 0.3, 4.5));
  const chart = (x, y, w, h, title, f, color, labelEnd) => {
    rr(x, y, w, h, 16, C.panel, C.line);
    T(title, x + 30, y + 40, 30, C.ink, { weight: 700 });
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 30, y + 80 + i * (h - 120) / 4); ctx.lineTo(x + w - 30, y + 80 + i * (h - 120) / 4); ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath();
    const N = 120;
    for (let i = 0; i <= N * k; i++) { const u = i / N; const xx = x + 30 + u * (w - 60), yy = y + h - 40 - f(u) * (h - 140); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
    ['14:00', '14:30', '15:00', '15:30'].forEach((s, i) => T(s, x + 30 + i * (w - 60) / 3, y + h - 16, 22, C.dim, { align: 'center', family: F.inter, keep: true }));
    if (labelEnd && k > 0.95) labelEnd();
  };
  // error curve: 14:20 rise, 14:35 full, 14:40 restart, 15:10 again
  const err = u => { const t = u * 90; const a = sm(clamp((t - 20) / 15)) * (1 - sm(clamp((t - 40) / 1.5))); const b2 = sm(clamp((t - 64) / 8)); return Math.max(a, b2) * 0.92 + 0.03; };
  chart(60, 100, 720, 420, S.cpu, u => 0.12 + Math.sin(u * 40) * 0.015, C.green, () => T('12%', 740, 420, 40, C.green, { align: 'right', weight: 700, family: F.inter, keep: true }));
  chart(820, 100, 720, 420, S.err, err, C.red, () => { T('↓ ' + S.restart, 820 + 30 + (40 / 90) * 660, 190, 24, C.dim, { align: 'center' }); });
  // the slow-query report: clean
  rr(60, 560, 1480, 250, 16, C.panel, C.line);
  T(S.slow, 100, 610, 34, C.ink, { weight: 700 });
  const rows = [['GetOrders', '180 ms'], ['GetCustomer', '42 ms'], ['ListItems', '31 ms']];
  rows.forEach((r, i) => { const yy = 670 + i * 44; T(r[0], 100, yy, 28, C.dim, { family: F.mono, keep: true }); T(r[1], 700, yy, 28, i ? C.dim : C.green, { family: F.mono, align: 'right', keep: true }); });
  if (τ > 4.8) { const a = sm(prog(τ, 4.8, 5.4)); ctx.globalAlpha = a; badge(S.tag, 860, 700, C.amber, 36); ctx.globalAlpha = 1; }
};

// 案件二：CreateOrderAsync — the ERP call inside the transaction stretches it
P['c2-flow'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c2-flow'];
  chrome('OrderService.cs', '');
  T(S.head, 80, 120, 34, C.amber, { weight: 700 });
  T(S.fn + '()', 80, 200, 40, C.ink, { family: F.mono, weight: 700, keep: true });
  const st = sm(prog(τ, 2.0, 4.5));
  const widths = [250, 250, lerp(140, 640, st), 250];
  const y = 330, h = 150, gap = 40; let x = 90;
  const xs = [];
  widths.forEach((w, i) => { xs.push(x); x += w + gap; });
  const totalW = xs[3] + widths[3] - xs[0];
  const scale = Math.min(1, (SW - 180) / totalW);
  ctx.save(); ctx.translate(90, 0); ctx.scale(scale, 1); ctx.translate(-90, 0);
  bracket(xs[0] - 26, y - 34, totalW + 52, h + 68, C.amber, 1, 9);
  S.steps.forEach((s, i) => {
    const erp = i === 2;
    rr(xs[i], y, widths[i], h, 16, erp ? (st > 0 ? `rgba(236,90,79,${0.12 + 0.2 * st})` : '#1b2433') : '#1b2433', erp && st > 0 ? C.red : '#475672', 3);
    ctx.save(); ctx.translate(xs[i] + widths[i] / 2, y + h / 2); ctx.scale(1 / scale, 1); T(s, 0, 0, 36, C.ink, { align: 'center', weight: 700 }); ctx.restore();
    if (i < 3) { ctx.fillStyle = '#6b7a93'; ctx.beginPath(); ctx.moveTo(xs[i] + widths[i] + 8, y + h / 2 - 12); ctx.lineTo(xs[i] + widths[i] + gap - 8, y + h / 2); ctx.lineTo(xs[i] + widths[i] + 8, y + h / 2 + 12); ctx.fill(); }
  });
  // progress dot
  const pk = (τ * 0.5) % 1;
  ctx.restore();
  T(S.erp, 90, 610, 32, C.dim);
  if (st > 0) { ctx.globalAlpha = st; T(S.slow, 90, 690, 46, C.red, { weight: 700 }); ctx.globalAlpha = 1; }
};

// 案件二：the table that keeps growing (PostgreSQL versions + cleanup)
P['c2-bloat'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c2-bloat'];
  chrome('order_status', '');
  { const a = sm(prog(τ, 5.2, 5.8)); if (a > 0) { ctx.globalAlpha = a; rr(50, 70, 1500, 70, 12, 'rgba(242,178,74,.12)', C.amber, 2); TW(S.why, 76, 104, 1450, 30, '#f6dca4', { weight: 700 }); ctx.globalAlpha = 1; } }
  // left: the table as a column of row-versions
  const bx = 120, by = 820, bw = 520, rowH = 14;
  const open = 3.5;                 // the transaction opens (and never closes)
  const rate = 9;                   // versions per second
  const n = Math.floor(τ * rate);
  const flagIdx = Math.floor(open * rate);
  const sweepEvery = 1.2;
  const lastSweep = Math.floor(τ / sweepEvery) * sweepEvery;
  // which versions are dead: every version except the newest of its row (4 rows cycle)
  const rows = [];
  for (let i = 0; i < n; i++) {
    const t = i / rate, dead = i < n - 4;
    const swept = dead && t + 0.3 < lastSweep && (τ < open || i < flagIdx);
    if (!swept) rows.push({ i, dead });
  }
  const growth = rows.length;
  const visible = Math.min(growth, 46);
  const tall = Math.min(1, growth / 46);
  rr(bx - 16, by - visible * rowH - 26, bw + 32, visible * rowH + 42, 12, '#121925', '#33415a', 2);
  const start = Math.max(0, rows.length - visible);
  for (let k = start; k < rows.length; k++) {
    const r = rows[k]; const y = by - (k - start + 1) * rowH;
    ctx.fillStyle = r.dead ? '#3d4553' : C.blue; ctx.fillRect(bx, y + 2, bw, rowH - 4);
  }
  // the broom (cleanup) sweeping up to where it is allowed
  const sweepK = (τ - lastSweep) / sweepEvery;
  const limitRow = τ < open ? rows.length : Math.max(0, rows.findIndex(r => r.i >= flagIdx));
  const broomY = by - Math.min(limitRow, visible) * rowH * sm(clamp(sweepK * 2));
  ctx.strokeStyle = C.green; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx - 30, broomY); ctx.lineTo(bx + bw + 30, broomY); ctx.stroke();
  T(S.sweep, bx + bw + 40, broomY, 24, C.green, { weight: 700 });
  // the open transaction: amber bracket + flag at the moment it opened
  if (τ > open) {
    const fi = rows.findIndex(r => r.i >= flagIdx), fy = by - Math.max(0, Math.min(visible, fi - start)) * rowH;
    const a = sm(prog(τ, open, open + 0.5));
    ctx.globalAlpha = a; bracket(bx - 70, fy - 40, 40, 80, C.amber, 1, 7);
    ctx.strokeStyle = C.amber; ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 20, fy); ctx.lineTo(bx + bw + 20, fy); ctx.stroke(); ctx.setLineDash([]);
    if (τ > open + 3.5) T(S.stop, bx, fy + 46, 28, C.amber, { weight: 700 });
    ctx.globalAlpha = 1;
  }
  // right: the numbers
  const g = sm(prog(τ, open + 1, open + 7));
  const px = 820;
  rr(px, 170, 720, 630, 18, C.panel, C.line);
  T(S.size, px + 40, 230, 30, C.dim);
  const mb = lerp(420, 14336, g * g);
  T(mb < 1024 ? `${Math.round(mb)} MB` : `${(mb / 1024).toFixed(1)} GB`, px + 680, 300, 72, g > 0.5 ? C.red : C.ink, { align: 'right', weight: 700, family: F.inter, keep: true });
  T(S.q, px + 40, 400, 30, C.dim);
  const ms = lerp(8, 2400, g * g);
  T(ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`, px + 680, 470, 72, g > 0.5 ? C.red : C.ink, { align: 'right', weight: 700, family: F.inter, keep: true });
  // dead share bar
  const dead = rows.filter(r => r.dead).length / Math.max(1, rows.length);
  const shown = τ > open ? lerp(dead, 0.987, g) : dead;
  rr(px + 40, 570, 640, 46, 10, '#1d2636', '#33415a');
  ctx.fillStyle = '#4d5666'; ctx.fillRect(px + 42, 572, 636 * shown, 42);
  if (g > 0.85) T(S.dead, px + 40, 670, 34, C.red, { weight: 700 });
};

// 案件二揭曉：the same amber bracket in both replays
P['c2-clock'] = (τ) => {
  τ = Math.max(0, τ);
  chrome('monitoring', '');
  T("SELECT max(now() - xact_start) FROM pg_stat_activity WHERE state <> 'idle';", 80, 140, 26, C.dim, { family: F.mono, keep: true });
  const secs = Math.min(1900, Math.pow(τ / 9, 2.2) * 1900);
  const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
  const col = secs >= 1800 ? C.red : secs >= 300 ? C.amber : C.green;
  T(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 800, 470, 260, col, { align: 'center', weight: 700, family: F.inter, keep: true });
  rr(200, 700, 1200, 30, 10, '#1d2636');
  const k = Math.min(1, secs / 1800);
  ctx.fillStyle = col; ctx.fillRect(200, 700, 1200 * k, 30);
  for (const [v, s] of [[300, '5 min'], [1800, '30 min']]) { const xx = 200 + 1200 * v / 1800; ctx.fillStyle = '#e3eaf3'; ctx.fillRect(xx - 2, 680, 4, 70); T(s, xx, 780, 26, C.dim, { align: 'center', family: F.inter, keep: true }); }
};

// 案件三 第①關：the agent runs the must-run list, fails an architecture rule, fixes it
P['c3-term'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c3-term'];
  chrome('terminal — AI agent', '');
  const lh = 50; let y = 120;
  const line = (s, color, size = 28, o = {}) => { T(s, 70, y, size, color, { family: F.mono, ...o }); y += lh; };
  const type = (s, t0, speed = 40) => s.slice(0, Math.max(0, Math.floor((τ - t0) * speed)));
  const step = [0.4, 2.2, 4.2, 6.6, 8.6];
  if (τ > step[0]) line('$ ' + type(S.cmds[0], step[0]), C.ink, 28, { keep: true });
  if (τ > step[0] + 1.2) line('  Build succeeded.  0 Warning(s)', C.green, 26, { keep: true });
  if (τ > step[1]) line('$ ' + type(S.cmds[1], step[1]), C.ink, 28, { keep: true });
  if (τ > step[1] + 1.6) { line('  ✗ ArchitectureTests.Engine_ShouldNot_Depend_On_DbContext', C.red, 26, { keep: true }); line('    ' + S.err, C.red, 28); }
  if (τ > step[2]) { line('  # ' + S.fix, C.amber, 26); }
  if (τ > step[2] + 1.0) line('$ ' + type(S.cmds[1], step[2] + 1.0, 60), C.ink, 28, { keep: true });
  if (τ > step[3]) line('  Passed!  Failed: 0', C.green, 26, { keep: true });
  if (τ > step[3] + 0.6) line('$ ' + type(S.cmds[2], step[3] + 0.6), C.ink, 28, { keep: true });
  if (τ > step[4]) line('  ✓ 0 problems', C.green, 26, { keep: true });
  if (τ > step[4] + 0.5) badge('✓ ' + S.ok, 70, y + 30, C.green, 34);
};

// 案件三 第②關：mutation testing — the guard is flipped, every test stays green

// ---------------------------------------------------------------- icons (no words needed)
export function icon(kind, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'person') { ctx.beginPath(); ctx.arc(0, -s * 0.18, s * 0.18, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, s * 0.42, s * 0.36, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
  if (kind === 'key') { ctx.beginPath(); ctx.arc(-s * 0.22, 0, s * 0.17, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.05, 0); ctx.lineTo(s * 0.4, 0); ctx.moveTo(s * 0.28, 0); ctx.lineTo(s * 0.28, s * 0.14); ctx.moveTo(s * 0.38, 0); ctx.lineTo(s * 0.38, s * 0.12); ctx.stroke(); }
  if (kind === 'ticket') { ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.22); ctx.lineTo(s * 0.4, -s * 0.22); ctx.lineTo(s * 0.4, -s * 0.07); ctx.arc(s * 0.4, 0, s * 0.07, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(s * 0.4, s * 0.22); ctx.lineTo(-s * 0.4, s * 0.22); ctx.lineTo(-s * 0.4, s * 0.07); ctx.arc(-s * 0.4, 0, s * 0.07, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.stroke(); ctx.setLineDash([s * 0.05, s * 0.05]); ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 0.2); ctx.lineTo(s * 0.12, s * 0.2); ctx.stroke(); ctx.setLineDash([]); }
  if (kind === 'shield') { ctx.beginPath(); ctx.moveTo(0, -s * 0.36); ctx.lineTo(s * 0.3, -s * 0.24); ctx.lineTo(s * 0.26, s * 0.12); ctx.quadraticCurveTo(s * 0.16, s * 0.3, 0, s * 0.38); ctx.quadraticCurveTo(-s * 0.16, s * 0.3, -s * 0.26, s * 0.12); ctx.lineTo(-s * 0.3, -s * 0.24); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.02, s * 0.09); ctx.lineTo(s * 0.13, -s * 0.09); ctx.stroke(); }
  if (kind === 'cloud') { ctx.beginPath(); ctx.arc(-s * 0.15, s * 0.04, s * 0.17, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(s * 0.04, -s * 0.08, s * 0.22, Math.PI, Math.PI * 1.9); ctx.arc(s * 0.22, s * 0.06, s * 0.15, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.stroke(); }
  if (kind === 'db') { ctx.beginPath(); ctx.ellipse(0, -s * 0.26, s * 0.3, s * 0.1, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.26); ctx.lineTo(-s * 0.3, s * 0.26); ctx.ellipse(0, s * 0.26, s * 0.3, s * 0.1, 0, Math.PI, 0, true); ctx.lineTo(s * 0.3, -s * 0.26); ctx.stroke(); }
  if (kind === 'stop') { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36); } ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.16, 0); ctx.lineTo(s * 0.16, 0); ctx.stroke(); }
  if (kind === 'clock') { ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.22); ctx.moveTo(0, 0); ctx.lineTo(s * 0.15, s * 0.06); ctx.stroke(); }
  if (kind === 'calendar') { ctx.strokeRect(-s * 0.32, -s * 0.26, s * 0.64, s * 0.58); ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.1); ctx.lineTo(s * 0.32, -s * 0.1); ctx.moveTo(-s * 0.16, -s * 0.36); ctx.lineTo(-s * 0.16, -s * 0.2); ctx.moveTo(s * 0.16, -s * 0.36); ctx.lineTo(s * 0.16, -s * 0.2); ctx.stroke(); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-s * 0.22 + i * s * 0.17, s * 0.0 + j * s * 0.13, s * 0.08, s * 0.06); }
  if (kind === 'bell') { ctx.beginPath(); ctx.moveTo(-s * 0.26, s * 0.18); ctx.quadraticCurveTo(-s * 0.24, -s * 0.3, 0, -s * 0.3); ctx.quadraticCurveTo(s * 0.24, -s * 0.3, s * 0.26, s * 0.18); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, s * 0.26, s * 0.06, 0, 7); ctx.fill(); }
  ctx.restore();
}
// the rule chip: "the lines add up to the total" (Σ = ▭), the same shape and colour everywhere
function ruleChip(x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  rr(-s * 0.9, -s * 0.42, s * 1.8, s * 0.84, s * 0.2, 'rgba(242,178,74,.92)', '#ffd892', 3);
  ctx.fillStyle = '#3a2408'; ctx.font = `700 ${s * 0.56}px ${F.inter}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Σ', -s * 0.5, s * 0.03);
  ctx.fillRect(-s * 0.18, -s * 0.1, s * 0.22, s * 0.06); ctx.fillRect(-s * 0.18, s * 0.06, s * 0.22, s * 0.06);
  ctx.strokeStyle = '#3a2408'; ctx.lineWidth = s * 0.07; ctx.strokeRect(s * 0.18, -s * 0.2, s * 0.5, s * 0.4);
  ctx.restore();
}

// 案件一：換登入服務 — a block slides over ①②③; ④ and its permission lines never move
const C1_CODE0 = ['builder.Services.AddAuthentication()', '    .AddBearerToken(IdentityConstants.BearerScheme);'];
const C1_CODEE = ['builder.Services.AddAuthentication(JwtBearer…)', '    .AddMicrosoftIdentityWebApi(config.GetSection("AzureAd"));'];
const C1_CODES = ['builder.Services.AddAuthentication(JwtBearer…)', '    .AddJwtBearer(o => o.Authority = "https://….supabase.co/auth/v1");'];
const C1_POL = ['.AddPolicy("users:delete",', '    p => p.RequireClaim("permission", "users:delete"));'];
P['c1-swap'] = (τ, d, b) => {
  const S = D.SCREEN_TXT['c1-swap'];
  chrome('', '');
  const recall = b.kind === 'recall';
  const px = 70, py = 90, pw = 640, rh = 168;
  T(S.mine, px, py - 22, 26, C.dim, { weight: 700 });
  const ic = ['person', 'key', 'ticket', 'shield'];
  // phases (reveal): Entra in 0.4–1.8, hold; swap to Supabase 4.6–6.2
  let eIn = 0, sIn = 0, eOut = 0;
  if (recall) eIn = 0.42;
  else { eIn = sm(prog(τ, 0.4, 1.8)); eOut = sm(prog(τ, 4.6, 5.6)); sIn = sm(prog(τ, 5.0, 6.2)); }
  const glow4 = recall ? 0 : sm(prog(τ, 2.4, 3.0)) * (0.75 + 0.25 * Math.sin(τ * 3));
  for (let i = 0; i < 4; i++) {
    const y = py + 20 + i * rh;
    const four = i === 3;
    rr(px, y, pw, rh - 18, 16, four && glow4 > 0 ? `rgba(76,199,143,${0.08 + 0.14 * glow4})` : '#151d29', four && glow4 > 0 ? C.green : '#2f3c52', four && glow4 > 0 ? 4 : 2);
    icon(ic[i], px + 90, y + (rh - 18) / 2, 92, four ? (glow4 > 0 ? C.green : '#cfd9e6') : '#cfd9e6');
    T(S.rows[i], px + 170, y + (rh - 18) / 2, 38, C.ink, { weight: 700 });
  }
  // the outside service: one block that covers ①②③
  const block = (k, color, label, kind) => {
    if (k <= 0) return;
    const x = px + pw + 40 - (pw + 40) * k, y = py + 10, h = 3 * rh;
    ctx.save(); ctx.beginPath(); ctx.rect(px - 10, py, pw + 20, 3 * rh + 12); ctx.clip();
    rr(x, y, pw, h - 8, 18, color, '#ffffff55', 3);
    icon('cloud', x + pw / 2, y + h / 2 - 60, 150, '#ffffff');
    T(label, x + pw / 2, y + h / 2 + 60, 46, '#ffffff', { align: 'center', weight: 700, family: F.inter });
    for (let i = 0; i < 3; i++) T(['①', '②', '③'][i], x + 40, y + 70 + i * rh, 40, '#ffffffcc', { weight: 700, keep: true });
    ctx.restore();
  };
  if (eOut <= 0) block(eIn, '#2c64c4', S.entra);
  if (eOut > 0) { ctx.save(); ctx.globalAlpha = 1 - eOut; block(1 + eOut, '#2c64c4', S.entra); ctx.restore(); }
  block(sIn, '#2a9a63', S.supa);
  // code: the identity lines change; the permission lines never do
  const cx0 = 760, lh = 50; let y = 140;
  rr(cx0 - 20, 100, 820, 340, 14, '#0f151e', '#2a3546');
  const stage = recall ? 0 : sIn > 0.5 ? 2 : eIn > 0.5 ? 1 : 0;
  const cur = [C1_CODE0, C1_CODEE, C1_CODES][stage];
  const changed = stage > 0;
  cur.forEach(l => { T(l, cx0, y, 19, changed ? C.green : C.ink, { family: F.mono, keep: true }); y += lh; });
  if (changed) { ctx.globalAlpha = 0.55; C1_CODE0.forEach((l, i) => { T('- ' + l.trim(), cx0, y + i * 40, 18, C.red, { family: F.mono, keep: true }); }); ctx.globalAlpha = 1; }
  rr(cx0 - 20, 470, 820, 210, 14, glow4 > 0 ? `rgba(76,199,143,${0.08 + 0.12 * glow4})` : '#0f151e', glow4 > 0 ? C.green : '#2a3546', glow4 > 0 ? 4 : 2);
  icon('shield', cx0 + 30, 575, 70, glow4 > 0 ? C.green : '#8fa0b8');
  C1_POL.forEach((l, i) => T(l, cx0 + 80, 545 + i * 56, 19, C.ink, { family: F.mono, keep: true }));
  if (glow4 > 0) { ctx.globalAlpha = glow4; badge('✓ ' + S.same, cx0 + 600, 720, C.green, 34); ctx.globalAlpha = 1; }
};

// 案件二揭曉：two chains, one amber bracket — the same culprit
P['c2-split'] = (τ) => {
  τ = Math.max(0, τ);
  chrome('', '');
  const L = 420, R = 1180, top = 190;
  const merge = sm(prog(τ, 1.6, 3.6));
  const nodes = (x, items, color) => items.forEach(([kind, y], i) => {
    rr(x - 120, y - 70, 240, 140, 20, '#151d29', color, 3);
    if (kind === 'grid') { for (let j = 0; j < 25; j++) rr(x - 70 + (j % 5) * 28, y - 62 + Math.floor(j / 5) * 25, 22, 20, 3, 'rgba(242,178,74,.85)'); }
    else if (kind === 'stack') { for (let j = 0; j < 9; j++) { ctx.fillStyle = j < 2 ? C.blue : '#4a5262'; ctx.fillRect(x - 70, y + 52 - j * 13, 140, 9); } }
    else icon(kind, x, y, 110, color);
    if (i < items.length - 1) { ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + 74); ctx.lineTo(x, items[i + 1][1] - 78); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - 12, items[i + 1][1] - 90); ctx.lineTo(x + 12, items[i + 1][1] - 90); ctx.lineTo(x, items[i + 1][1] - 74); ctx.fill(); }
  });
  nodes(L, [['grid', 420], ['stop', 620], ['clock', 800]], C.red);
  nodes(R, [['stack', 420], ['db', 620], ['calendar', 800]], '#4fd1c5');
  // two brackets rise and become one
  const bx = (x0) => lerp(x0, 800, merge), by = lerp(top + 40, top - 10, merge);
  const sz = lerp(1, 1.5, merge);
  const glow = 0.6 + 0.4 * Math.sin(τ * 4);
  if (merge < 1) { bracket(bx(L) - 50 * sz, by - 55 * sz, 100 * sz, 110 * sz, C.amber, 1, 9); bracket(bx(R) - 50 * sz, by - 55 * sz, 100 * sz, 110 * sz, C.amber, 1, 9); }
  else { ctx.save(); ctx.globalAlpha = 0.25 * glow; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(800, by, 120, 0, 7); ctx.fill(); ctx.restore(); bracket(800 - 75, by - 82, 150, 165, C.amber, 1, 12); }
  // lines from the bracket down to both chains
  ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.setLineDash([18, 10]);
  for (const x of [L, R]) { ctx.beginPath(); ctx.moveTo(bx(x), by + 60 * sz); ctx.lineTo(x, 340); ctx.stroke(); }
  ctx.setLineDash([]);
};

// 案件三 第②關：mutation — first say what it is, then do it
P['c3-mut'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c3-mut'];
  chrome(S.file + ':31', '');
  { const a = sm(prog(τ, 0.2, 0.8)); ctx.globalAlpha = a; rr(60, 80, 1480, 80, 14, '#141c28', '#33415a'); T(S.name, 90, 121, 34, C.ink, { weight: 700 }); ctx.globalAlpha = 1; }
  T('// ' + S.rule, 70, 205, 26, '#7f8ea6', { family: F.mono });
  const flip = sm(prog(τ, 1.8, 2.4));
  ctx.textRendering = 'optimizeSpeed'; ctx.font = `700 34px ${F.mono}`;
  const pre = S.a.slice(0, S.a.indexOf('==')), x0 = 70 + ctx.measureText(pre).width, w = ctx.measureText('==').width;
  T(pre, 70, 262, 34, C.ink, { family: F.mono, weight: 700, keep: true });
  // the operator: the original is struck through, the mutant sits above it
  T('==', x0, 262, 34, flip > 0 ? '#7f8ea6' : C.ink, { family: F.mono, weight: 700, keep: true });
  if (flip > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 - 4, 262); ctx.lineTo(x0 + w + 4, 262); ctx.stroke(); ctx.globalAlpha = flip; T('!=', x0, 222 - 4, 34, C.red, { family: F.mono, weight: 700, keep: true }); ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.strokeRect(x0 - 8, 196, w + 16, 46); ctx.globalAlpha = 1; }
  T(S.a.slice(S.a.indexOf('==') + 2), x0 + w, 262, 34, C.ink, { family: F.mono, weight: 700, keep: true });
  T(S.c, 70, 312, 30, C.ink, { family: F.mono, keep: true });
  rr(60, 360, 820, 300, 16, C.panel, C.line);
  T(S.tests, 90, 398, 28, C.dim, { weight: 700 });
  for (let i = 0; i < 10; i++) {
    const on = τ > 2.8 + i * 0.26;
    const x = 120 + (i % 5) * 150, y = 480 + Math.floor(i / 5) * 110;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fillStyle = on ? 'rgba(76,199,143,.25)' : '#1c2533'; ctx.fill(); ctx.strokeStyle = on ? C.green : '#3a475c'; ctx.lineWidth = 3; ctx.stroke();
    if (on) check(x, y, 40, C.green);
  }
  if (τ > 5.8) { const a = sm(prog(τ, 5.8, 6.2)); ctx.save(); ctx.globalAlpha = a; ctx.translate(470, 700); ctx.rotate(-0.04); rr(-150, -40, 300, 80, 10, 'rgba(242,178,74,.15)', C.amber, 4); T(S.survived, 0, 2, 44, C.amber, { align: 'center', weight: 700, family: F.inter, keep: true }); ctx.restore(); }
  const n = sm(prog(τ, 6.6, 7.2));
  if (n > 0) {
    ctx.globalAlpha = n; rr(920, 360, 620, 150, 16, '#1d1a14', '#6b5a3a', 2); T(S.ai, 950, 435, 30, '#e8d6ae', { weight: 500 }); ctx.globalAlpha = 1;
    const c = sm(prog(τ, 7.6, 8.6));
    if (c > 0) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(1230, 435, 330, 100, -0.03, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c); ctx.stroke(); ctx.restore(); }
    const w2 = sm(prog(τ, 8.8, 9.4));
    if (w2 > 0) { ctx.globalAlpha = w2; TW(S.why, 940, 590, 600, 34, C.red, { weight: 700 }); ctx.globalAlpha = 1; }
  }
};

// 案件三 第③關：a bad input from outside stops at the input check
P['c3-valid'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c3-valid'];
  chrome('', '');
  T(S.from, 80, 120, 30, C.dim, { weight: 700 });
  const gx = 980;
  // the checkpoint: a shield gate
  rr(gx - 18, 190, 36, 560, 10, '#2a3546', C.green, 3);
  icon('shield', gx, 160, 80, C.green);
  T('RuleFor(c => c.Address.Country).Must(Supported.Contains);', 640, 820, 24, '#6f7f96', { family: F.mono, keep: true, align: 'center' });
  const req = (y, t0, label, good) => {
    const k = sm(prog(τ, t0, t0 + 1.6));
    const stopX = good ? 1190 : gx - 170;
    const x = lerp(140, stopX, k);
    rr(x - 130, y - 60, 260, 120, 16, '#1d2636', good ? (k >= 1 ? C.green : '#5d6c86') : (k >= 1 ? C.red : '#5d6c86'), 4);
    T(label, x, y, 30, C.ink, { align: 'center', family: F.mono, keep: true });
    if (k >= 1) {
      const a = sm(prog(τ, t0 + 1.6, t0 + 2.0)); ctx.globalAlpha = a;
      if (good) { check(x + 180, y, 60, C.green); T(S.ok, x + 220, y, 32, C.green, { weight: 700 }); }
      else { cross(gx - 20, y - 100, 60, C.red); T(S.bad, gx + 50, y - 100, 32, C.red, { weight: 700 }); }
      ctx.globalAlpha = 1;
    }
  };
  req(320, 0.5, 'Country: TW', true);
  req(600, 2.6, 'Country: ??', false);
};

// 案件三 第④關：the nightly reconciliation — one month does not balance, the alarm rings
P['c3-recon'] = (τ) => {
  τ = Math.max(0, τ);
  const S = D.SCREEN_TXT['c3-recon'];
  chrome('', '');
  T(S.title, 80, 120, 32, C.ink, { weight: 700 });
  const bad = 5;
  for (let i = 0; i < 8; i++) {
    const y = 210 + i * 70, on = τ > 0.8 + i * 0.5;
    rr(120, y, 900, 56, 10, '#151d29', '#2f3c52', 2);
    T(D.UI.monthN.replace('{n}', i + 1), 150, y + 28, 26, C.dim, { weight: 700, keep: true });
    // scale bar: left = 月初＋進, right = 出＋月底
    const ok = i !== bad;
    ctx.fillStyle = '#4a5a72'; ctx.fillRect(290, y + 18, 280, 20); ctx.fillRect(620, y + 18, ok ? 280 : 220, 20);
    if (on) { if (ok) check(970, y + 28, 40, C.green); else cross(970, y + 28, 40, C.red); }
  }
  const al = sm(prog(τ, 0.8 + bad * 0.5 + 0.3, 0.8 + bad * 0.5 + 0.8));
  if (al > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(τ * 8);
    ctx.save(); ctx.globalAlpha = al * 0.35 * pulse; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(1300, 470, 170, 0, 7); ctx.fill(); ctx.restore();
    icon('bell', 1300, 450, 180, C.red);
    ctx.globalAlpha = al; T(S.alarm, 1300, 640, 34, C.red, { align: 'center', weight: 700 }); ctx.globalAlpha = 1;
  }
};

// 案件三：the same rule (one chip) sits in all three layers; three different bad things stop at different layers
P['c3-three'] = (τ) => {
  τ = Math.max(0, τ);
  chrome('', '');
  const layers = [300, 500, 700];
  const lab = ['②', '③', 'db'];
  // the chip appears, then stamps into each layer
  const appear = sm(prog(τ, 0.2, 0.7));
  ruleChip(800, 110, 70, appear * (1 - sm(prog(τ, 1.0, 1.3))));
  layers.forEach((y, i) => {
    const k = sm(prog(τ, 0.9 + i * 0.35, 1.3 + i * 0.35));
    rr(160, y - 30, 1280, 60, 14, 'rgba(242,178,74,.10)', '#c9a15a', 3);
    if (lab[i] === 'db') icon('db', 120, y, 56, '#c9a15a'); else T(lab[i], 120, y, 40, '#c9a15a', { align: 'center', weight: 700, keep: true });
    if (k > 0) ruleChip(lerp(800, 250, k), lerp(110, y, k), 46, 1);
  });
  const items = [{ x: 520, stop: 0, t0: 2.6, icon: 'sum' }, { x: 860, stop: 1, t0: 4.0, icon: 'doc' }, { x: 1200, stop: 2, t0: 5.4, icon: 'db' }];
  items.forEach(it => {
    const yStop = layers[it.stop] - 80;
    const k = sm(prog(τ, it.t0, it.t0 + 1.3));
    if (τ < it.t0 - 0.2) return;
    const y = lerp(60, yStop, k), hit = τ > it.t0 + 1.3;
    ctx.save(); ctx.translate(it.x, y);
    rr(-58, -48, 116, 96, 14, '#1d2636', hit ? C.red : '#5d6c86', 4);
    ctx.strokeStyle = '#d6dfeb'; ctx.lineWidth = 5;
    if (it.icon === 'sum') { T('Σ', 0, 2, 60, '#d6dfeb', { align: 'center', weight: 700, family: F.inter, keep: true }); ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(18, -30); ctx.lineTo(40, -10); ctx.stroke(); }
    if (it.icon === 'doc') { ctx.strokeRect(-28, -34, 56, 68); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-18, -20 + i * 15); ctx.lineTo(18, -20 + i * 15); ctx.stroke(); } ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(-18, 24); ctx.lineTo(18, 24); ctx.stroke(); }
    if (it.icon === 'db') icon('db', 0, 0, 80, '#d6dfeb');
    ctx.restore();
    if (hit) { const a = sm(prog(τ, it.t0 + 1.3, it.t0 + 1.7)); ctx.globalAlpha = a; cross(it.x + 88, yStop + 10, 56, C.red); ctx.globalAlpha = 1; }
  });
};

P.blank = () => { ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, SW, SH); };

export function drawScreen(prog_, τ, d, beat) {
  ctx.save(); (P[prog_] || P.idle)(τ, d, beat || {}); ctx.restore();
  tex.needsUpdate = true;
}
// a small sketch of a replay (for the quiz card hints): draws program `p` at time τ into another 2D context
export function sketch(p, τ, beat, dst, x, y, w, h) {
  drawScreen(p, τ, 0, beat);
  dst.drawImage(cv, x, y, w, h);
}
