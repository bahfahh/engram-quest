// Blackboard director for one example lesson (what a container is). A pattern to copy, not an API: the board content and
// timing below are hard-coded to that lesson's Chinese narration.
// One idea per board; each element appears on the word that introduces it (all times come from timeline.json).
// Boards change with an eraser wiping left to right. The texture is redrawn and re-uploaded only when its content changes.
import * as S from '/lib/stage.js';
import * as C from './cast.js';

const FONT = 'LXGW WenKai TC';   // load with S.loadFonts([FONT], text): it also adds /lib/kit/tc-variants.css (Taiwan-standard forms)
const WH = C.CHALK.white, YE = C.CHALK.yellow, PK = C.CHALK.pink, OR = C.CHALK.orange;

// ---------------------------------------------------------------- element builders (each: {t0, dur, draw(ctx,k)})
function text(str, x, y, size, color, t0, { align = 'left', dur } = {}) {
  const d = dur ?? Math.max(0.3, [...str].length * 0.055);
  return { t0, dur: d, draw: (c, k) => S.writeOn(c, str, x, y, k, { font: `700 ${size}px "${FONT}"`, color, align }) };
}
function stroke(pts, color, width, t0, dur = 0.4, seed = 1) {
  return { t0, dur, draw: (c, k) => S.drawStroke(c, pts, k, { color, width, seed }) };
}
function ellipsePts(cx, cy, rx, ry, n = 40, a0 = -1.6) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * 6.283 * 1.04; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
function circle(cx, cy, rx, ry, color, width, t0, dur = 0.45, seed = 3) { return stroke(ellipsePts(cx, cy, rx, ry), color, width, t0, dur, seed); }
function custom(t0, dur, fn) { return { t0, dur, draw: fn }; }
const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

/** chalk bean: orange ellipse + two dots; alpha for fading out */
function beanDoodle(c, x, y, s, color = OR, alpha = 1) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = 9 * s; c.beginPath(); c.ellipse(x, y, 40 * s, 52 * s, 0, 0, 7); c.stroke();
  c.fillStyle = color; c.beginPath(); c.arc(x - 14 * s, y - 12 * s, 6.5 * s, 0, 7); c.arc(x + 14 * s, y - 12 * s, 6.5 * s, 0, 7); c.fill(); c.restore();
}
/** the core picture in chalk: table line, upside-down box (walls+top, splayed flaps, no floor), the bean on the line */
function corePicture(x, y, s, t0, { dashed = false, beanAlpha = () => 1, label = false } = {}) {
  const bw = 300 * s, bh = 270 * s, bx = x, by = y; // by = table line y, bx = box centre x
  const els = [];
  els.push(stroke([[bx - 380 * s, by], [bx + 380 * s, by + 3]], WH, 10, t0, 0.35, 5));
  if (!dashed) {
    els.push(stroke([[bx - bw / 2, by - 6], [bx - bw / 2, by - bh], [bx + bw / 2, by - bh - 3], [bx + bw / 2, by - 6]], WH, 9, t0 + 0.2, 0.5, 6));
  } else {
    els.push(custom(t0 + 0.2, 0.5, (c, k) => {
      const pts = [[bx - bw / 2, by - 6], [bx - bw / 2, by - bh], [bx + bw / 2, by - bh - 3], [bx + bw / 2, by - 6]];
      // dashed: draw short pieces along the path
      let segs = []; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 34); for (let j = 0; j < n; j += 2) segs.push([[x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n], [x0 + (x1 - x0) * (j + 1) / n, y0 + (y1 - y0) * (j + 1) / n]]); }
      const upto = Math.floor(segs.length * k); for (let i = 0; i < upto; i++) S.drawStroke(c, segs[i], 1, { color: WH, width: 9, seed: 20 + i });
    }));
  }
  els.push(stroke([[bx - bw / 2, by - 8], [bx - bw / 2 - 80 * s, by - 36 * s]], WH, 8, t0 + 0.65, 0.2, 7));
  els.push(stroke([[bx + bw / 2, by - 8], [bx + bw / 2 + 82 * s, by - 34 * s]], WH, 8, t0 + 0.7, 0.2, 8));
  els.push(custom(t0 + 0.8, 0.25, (c, k) => beanDoodle(c, bx, by - 58 * s, s, OR, Math.min(k * 3, 1) * beanAlpha())));
  if (label) els.push(text('核心', bx + 400 * s, by + 22, 62, YE, t0 + 0.9));
  return els;
}

export function makeBoardDirector(T, board) {
  const W = (id, needle) => T.word(id, needle), Ls = id => T.line(id).start, Le = id => T.line(id).end;
  const P = [];   // panels: {t0 (wipe starts), els}
  const WIPE = 0.55;

  // B0 — the misconception (pink): a monitor with a tiny monitor inside
  {
    const t = W('L01', '塞') - 0.1;
    P.push({ t0: -1, els: [
      stroke(rectPts(330, 230, 990, 660), PK, 10, t, 0.6, 11),
      stroke([[600, 660], [585, 760]], PK, 9, t + 0.5, 0.15, 12), stroke([[720, 660], [735, 760]], PK, 9, t + 0.5, 0.15, 13), stroke([[520, 768], [800, 772]], PK, 9, t + 0.6, 0.2, 14),
      stroke(rectPts(530, 360, 790, 530), PK, 8, t + 0.8, 0.4, 15), stroke([[640, 530], [650, 575], [610, 580], [690, 582]], PK, 7, t + 1.1, 0.2, 16),
      text('容器＝小電腦？', 1080, 500, 120, PK, t + 0.3),
      // when the box is lifted and there is no computer: cross the little one out
      stroke([[505, 335], [815, 560]], WH, 11, Ls('L03') + 0.1, 0.25, 17), stroke([[815, 335], [505, 560]], WH, 11, Ls('L03') + 0.35, 0.25, 18),
    ] });
  }
  // B1 — two roll calls: on the table / inside the box
  {
    const t0 = Ls('L07') - 0.1, a = t0 + WIPE;
    const tn = W('L07', '點名');
    const rows = ['1　系統', '⋮', '2310　瀏覽器', '3307　音樂', '4821　網站', '⋮'];
    const els = [text('桌上的點名', 170, 190, 84, WH, a), stroke([[170, 220], [600, 224]], WH, 7, a + 0.4, 0.25, 21)];
    rows.forEach((r, i) => els.push(text(r, 210, 310 + i * 86, 70, i === 4 ? WH : WH, tn + 0.05 + i * 0.22, { dur: 0.3 })));
    els.push(text('共三百多個', 210, 880, 76, YE, W('L07', '幾百個') - 0.1));
    const t8 = Ls('L08') - 0.05;
    els.push(stroke([[1120, 690], [1120, 140], [1880, 136], [1882, 690]], OR, 10, t8, 0.6, 22));
    els.push(stroke([[1120, 690], [1040, 725]], OR, 9, t8 + 0.55, 0.15, 23), stroke([[1882, 690], [1962, 722]], OR, 9, t8 + 0.6, 0.15, 24));
    els.push(text('箱子裡的點名', 1190, 270, 76, WH, t8 + 0.3), stroke([[1190, 300], [1640, 304]], WH, 7, t8 + 0.8, 0.25, 25));
    els.push(text('1　網站', 1300, 470, 104, OR, W('L08', '一號') - 0.15));
    els.push(circle(395, 625, 260, 62, OR, 9, W('L09', '四千八百') - 0.05, 0.5, 26));
    P.push({ t0, els });
  }
  // B1b — the files on the walls travel as one package (image), identical on any machine
  {
    const t0 = Ls('L11') - 0.1, a = t0 + WIPE;
    const els = [];
    // box net (cross), with little file marks
    const sq = 165, cx = 430, cy = 470;
    const faces = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, 2]];
    faces.forEach(([i, j], n) => {
      const x0 = cx + i * sq - sq / 2, y0 = cy + j * sq - sq / 2 - 60;
      els.push(stroke(rectPts(x0, y0, x0 + sq, y0 + sq), WH, 7, a + n * 0.08, 0.3, 30 + n));
      if (n < 5) els.push(stroke([[x0 + 40, y0 + 60], [x0 + 125, y0 + 60]], WH, 6, a + 0.4 + n * 0.05, 0.15, 40 + n), stroke([[x0 + 40, y0 + 98], [x0 + 110, y0 + 98]], WH, 6, a + 0.45 + n * 0.05, 0.15, 50 + n));
    });
    els.push(text('映像檔', 760, 300, 104, YE, W('L11', '映像檔') - 0.1));
    const tm = W('L11', '搬到') - 0.1;
    const machine = (y, label, t) => [
      stroke([[1150, y], [1640, y + 3]], WH, 9, t, 0.3, 60 + y),
      stroke([[1290, y - 4], [1290, y - 190], [1510, y - 192], [1512, y - 4]], WH, 8, t + 0.2, 0.4, 61 + y),
      stroke([[1290, y - 6], [1240, y - 26]], WH, 7, t + 0.55, 0.1, 62 + y), stroke([[1512, y - 6], [1562, y - 24]], WH, 7, t + 0.58, 0.1, 63 + y),
      custom(t + 0.6, 0.2, (c, k) => beanDoodle(c, 1401, y - 45, 0.62, OR, k)),
      text(label, 1150, y + 80, 66, WH, t + 0.3),
    ];
    els.push(stroke([[700, 420], [1080, 290]], WH, 8, tm, 0.3, 70), stroke([[1080, 290], [1040, 268]], WH, 8, tm + 0.28, 0.08, 71), stroke([[1080, 290], [1050, 322]], WH, 8, tm + 0.3, 0.08, 72));
    els.push(stroke([[700, 600], [1080, 700]], WH, 8, tm + 0.1, 0.3, 73), stroke([[1080, 700], [1036, 708]], WH, 8, tm + 0.38, 0.08, 74), stroke([[1080, 700], [1058, 666]], WH, 8, tm + 0.4, 0.08, 75));
    els.push(...machine(400, '這台電腦', tm + 0.2), ...machine(840, '那台電腦', tm + 0.5));
    els.push(text('一模一樣', 1820, 640, 80, YE, W('L11', '一模一樣') - 0.1, { align: 'center' }));
    els.push(stroke([[1820, 470], [1820, 560]], YE, 7, W('L11', '一模一樣'), 0.2, 76), stroke([[1820, 680], [1820, 760]], YE, 7, W('L11', '一模一樣') + 0.1, 0.2, 77));
    P.push({ t0, els });
  }
  // B2 — prediction question, then the rule (lifespan)
  {
    const t0 = W('L13', '換你') - 0.25, a = t0 + WIPE;
    const beanAlpha = () => 1 - S.clamp((curT - (Ls('L15') - 0.6)) / 0.5);
    const els = corePicture(560, 640, 1, a, { beanAlpha });
    els.push(custom(Ls('L15') - 0.6, 0.6, (c, k) => { if (k <= 0 || k >= 1) return; c.save(); c.globalAlpha = 1 - k; c.strokeStyle = WH; c.lineWidth = 5; for (let i = 0; i < 6; i++) { const ang = i / 6 * 6.283; c.beginPath(); c.arc(560 + Math.cos(ang) * 70 * k, 582 + Math.sin(ang) * 50 * k, 12 + 10 * k, 0, 7); c.stroke(); } c.restore(); }));
    els.push(text('程式下班了', 1060, 470, 96, WH, W('L13', '下班') - 0.15), text('→ 容器？', 1220, 600, 96, WH, W('L13', '容器會') - 0.1));
    els.push(text('容器活多久＝程式活多久', 1024, 900, 104, YE, W('L15', '活多久') - 0.25, { align: 'center' }));
    P.push({ t0, els });
  }
  // B3 — docker run ubuntu (no keyboard → bash leaves at once) / servers must not slip into the background
  {
    const t0 = Ls('L17') - 0.1, a = t0 + WIPE;
    const els = [text('$ docker run ubuntu', 150, 175, 80, WH, a)];
    const row = (y, label, ts, tLabel) => [
      stroke([[150, y], [620, y + 2]], WH, 8, ts, 0.25, 80 + y),
      stroke([[260, y - 4], [260, y - 190], [500, y - 192], [502, y - 4]], WH, 8, ts + 0.15, 0.35, 81 + y),
      stroke([[260, y - 6], [215, y - 26]], WH, 7, ts + 0.5, 0.1, 82 + y), stroke([[502, y - 6], [548, y - 24]], WH, 7, ts + 0.52, 0.1, 83 + y),
      text(label, 380, y + 72, 58, WH, tLabel, { align: 'center' }),
    ];
    // row 1: bash
    els.push(...row(470, 'bash', a + 0.2, W('L17', 'bash') - 0.1));
    const tLeave = W('L17', '下班') - 0.1;
    els.push(custom(a + 0.8, 0.25, (c, k) => beanDoodle(c, 380, 418, 0.65, OR, k * (1 - S.clamp((curT - tLeave) / 0.3)))));
    // keyboard + pink X (nobody is typing to it)
    const tk = W('L17', '打字') - 0.1;
    els.push(stroke(rectPts(700, 330, 960, 440), WH, 7, tk, 0.35, 90));
    els.push(custom(tk + 0.3, 0.3, (c, k) => { c.save(); c.globalAlpha = k; c.strokeStyle = WH; c.lineWidth = 4; for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) c.strokeRect(718 + q * 39, 346 + r * 30, 28, 20); c.restore(); }));
    const tx = W('L17', '沒接') - 0.05;
    els.push(stroke([[690, 320], [970, 452]], PK, 12, tx, 0.22, 91), stroke([[970, 320], [690, 452]], PK, 12, tx + 0.2, 0.22, 92));
    els.push(custom(tLeave, 0.4, (c, k) => beanDoodle(c, 590 + 30 * k, 420 - 20 * Math.sin(k * 3.14), 0.65, OR, 1 - S.clamp((curT - tLeave - 1.2) / 0.4))));
    els.push(text('→ 容器停', 1060, 420, 92, YE, tLeave + 0.15));
    // row 2: web server — stays in front, told not to slip into the background
    const ts = W('L18', '網站') - 0.1;
    els.push(...row(870, '網站伺服器', ts - 0.3, ts));
    els.push(custom(ts + 0.3, 0.25, (c, k) => beanDoodle(c, 380, 818, 0.65, OR, k)));
    els.push(text('要一直開著', 700, 760, 76, WH, W('L18', '一直') - 0.1));
    els.push(text('別溜到背景', 700, 880, 92, YE, W('L18', '別溜') - 0.1));
    els.push(text('nginx: daemon off;', 1270, 880, 58, WH, W('L18', '背景') + 0.1));
    P.push({ t0, els });
  }
  // B4 — honesty: there is no real box; and a hole in the shared table
  {
    const t0 = W('L24', '核心裡') - 0.35, a = t0 + WIPE;
    const els = corePicture(560, 640, 1, a, { dashed: true });
    els.push(text('沒有真的箱子', 1060, 400, 92, WH, W('L24', '真的箱子') - 0.2));
    els.push(text('只是看不到外面', 1060, 530, 92, WH, W('L24', '看到外面') - 0.2));
    const th = W('L25', '破個洞') - 0.1;
    els.push(custom(th, 0.35, (c, k) => { c.save(); c.globalAlpha = k; c.fillStyle = '#1b2f27'; c.beginPath(); c.ellipse(820, 650, 56 * k, 22 * k, 0, 0, 7); c.fill(); c.restore(); }));
    els.push(circle(820, 650, 60, 26, PK, 8, th + 0.1, 0.35, 95));
    els.push(custom(W('L25', '鑽出去') - 0.1, 0.3, (c, k) => beanDoodle(c, 820, 650 - 50 * k, 0.6, OR, k)));
    els.push(text('桌子破洞 → 鑽出去', 1060, 780, 86, PK, th + 0.2));
    P.push({ t0, els });
  }
  // B∅ — wiped clean for the recall
  P.push({ t0: Ls('L26') - 0.1, els: [] });
  // B5 — the learner's sentence, three keywords
  {
    const t0 = Ls('L27') - 0.15, a = t0 + WIPE * 0.5;
    P.push({ t0: t0 - 0.3, wipe: false, els: [
      text('被紙箱罩住的普通程式', 1024, 380, 112, YE, Math.max(a, W('L27', '普通程式') - 0.9), { align: 'center' }),
      text('看得到的變少', 1024, 590, 96, WH, W('L27', '變少') - 0.5, { align: 'center' }),
      text('腳下還是同一張桌子', 1024, 790, 96, WH, W('L27', '桌子') - 0.7, { align: 'center' }),
    ] });
  }

  let curT = 0, lastKey = '';
  const drawEls = (ctx, els, t, full) => C.chalk(ctx, c => { for (const e of els) { const k = full ? 1 : progressOf(e, t); if (k > 0) e.draw(c, k); } });
  const q = k => Math.round(S.clamp(k) * 48);
  const progressOf = (e, t) => S.clamp((t - e.t0) / Math.max(1e-3, e.dur));

  /** Draw the board for time t. Returns true when the texture changed. */
  function update(t) {
    curT = t;
    let i = 0; for (let j = 0; j < P.length; j++) if (t >= P[j].t0) i = j;
    const cur = P[i], prev = i > 0 ? P[i - 1] : null;
    const wipeK = (prev && cur.wipe !== false) ? S.clamp((t - cur.t0) / WIPE) : 1;
    const ks = cur.els.map(e => q(progressOf(e, t)));
    // a few elements read curT directly (fades); give them a time bucket while they are active
    const key = `${i}|${q(wipeK)}|${ks.join(',')}|${needsTime(t) ? Math.round(t * 15) : ''}`;
    if (key === lastKey) return false;
    lastKey = key;
    const ctx = board.ctx;
    C.boardBase(ctx);
    if (prev && wipeK < 1) {
      // eraser: the old panel, then the clean slate re-covers a band from the left with a dusty edge
      drawEls(ctx, prev.els, t, true);
      const x = wipeK * 2048 * 1.06;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, 1068); ctx.clip(); C.boardBase(ctx); ctx.restore();
      const g = ctx.createLinearGradient(x - 140, 0, x, 0); g.addColorStop(0, 'rgba(230,240,230,0)'); g.addColorStop(1, 'rgba(230,240,230,0.12)');
      ctx.fillStyle = g; ctx.fillRect(x - 140, 0, 140, 1068);
    }
    drawEls(ctx, cur.els, t, false);
    board.tex.needsUpdate = true;
    return true;
  }
  // fades that depend on curT (bean leaving, puff) need redraws even when element progress is constant
  function needsTime(t) {
    const L15 = Ls('L15'), L17b = W('L17', '下班');
    return (t > L15 - 0.7 && t < L15 + 0.2) || (t > L17b - 0.2 && t < L17b + 2.0);
  }
  return { update, panels: P };
}
