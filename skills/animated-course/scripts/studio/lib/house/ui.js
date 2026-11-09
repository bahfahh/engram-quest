// Engram studio — DOM components over a 3D room or a flat page. Everything is driven by t (no CSS transitions).
//
//   <link rel="stylesheet" href="/lib/house/house.css">
//   import { makeUI } from '/lib/house/ui.js';
//   const ui = makeUI(document.getElementById('ui'), { mode: 'light', camera });   // camera: THREE camera (3D anchors) or null
//   const L = ui.station(2, '投出光點', { sub: '<b>30,000</b> 個' });   L.state('now');
//   window.renderAt = t => { ui.lights(k); ui.place(L, worldPoint, { dy: -110, a }); … };
//   window.TEXTS = () => ui.TEXTS();
//
// Components (all return {el, …, set/update}): label, station, place (leader + anchor), progress, foot, selection,
// stamp, readout, ratio, keycard, mindmap, veil, wipe. Colours are token variables: ui.lights(k) fades them.
import { applyVars, quantK } from './tokens.js';
import { textsOf } from '/lib/stage.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const ease = {
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  outBack: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
export const sm = k => ease.inOut(clamp(k));
/** Fade window: 0 → 1 over [a, a+fi], 1 → 0 over [b−fo, b]. */
export const win = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
/** Opacity + visibility (hidden below 1 %). */
export const vis = (el, a) => { a = clamp(a); el.style.opacity = a.toFixed(3); el.style.visibility = a < 0.01 ? 'hidden' : 'visible'; return a; };
/** Absolute placement by transform. */
export const at = (el, x, y, s = 1, rot = 0) => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` + (s !== 1 ? ` scale(${s.toFixed(4)})` : '') + (rot ? ` rotate(${rot}deg)` : ''); };
export const corners = () => '<span class="h-corners"><i></i><i></i><i></i><i></i></span>';
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const html = s => { const d = document.createElement('div'); d.innerHTML = s.trim(); return d.firstElementChild; };
const TONES = ['is-now', 'is-done', 'is-later', 'is-student', 'is-warn'];

/**
 * @param {HTMLElement} root  1920×1080 container (gets class h-root and data-house)
 * @param {object} o {mode: 'light'|'dark', camera: THREE.Camera|null, safe: [top, bottom] y range labels are kept in}
 */
export function makeUI(root, { mode = 'light', camera = null, safe = [130, 930], W = 1920, H = 1080 } = {}) {
  root.classList.add('h-root'); root.dataset.house = mode;
  const layer = (z, svg = false) => { const e = svg ? svgEl('svg', { class: 'h-svg', width: W, height: H }) : document.createElement('div'); e.style.zIndex = z; if (!svg) { e.style.width = W + 'px'; e.style.height = H + 'px'; } root.append(e); return e; };
  const leadSvg = layer(1, true); leadSvg.classList.add('h-lead');
  const chips = layer(2); chips.classList.add('h-root');            // labels, pill, foot, readouts
  const veilL = layer(3); veilL.classList.add('h-root');
  const cards = layer(4); cards.classList.add('h-root');            // key card, mindmap nodes, stamps
  const topSvg = layer(5, true); topSvg.classList.add('h-mm');     // mindmap links (above the veil)
  const over = layer(6); over.classList.add('h-root');              // wipes
  const add = (parent, s) => { const e = html(s); parent.append(e); return e; };
  let kNow = mode === 'dark' ? 0 : 1, kq = null;

  const ui = {
    root, camera, layers: { lead: leadSvg, chips, veil: veilL, cards, top: topSvg, over },
    /** Lights level (1 light … 0 dark): every token variable is interpolated, so the DOM fades with the room. */
    lights(k) { kNow = clamp(k); const q = quantK(kNow, 32); if (q !== kq) { kq = q; applyVars(root, q); root.dataset.house = q >= 0.5 ? 'light' : 'dark'; } return ui; },
    get k() { return kNow; },
    /** World point (THREE.Vector3) → screen [x, y]; or pass [x, y] through. */
    project(p) { if (Array.isArray(p)) return p; const v = p.clone().project(ui.camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; },
    TEXTS: () => textsOf('[data-read]', root),
  };
  ui.lights(kNow);

  // ------------------------------------------------------------------ labels + leaders
  /** A label chip. tone: '' | 'now' | 'done' | 'later' | 'student' | 'warn'. id → data-read id (readcheck). */
  ui.label = (inner, { tone = '', id = '', n = true } = {}) => {
    const el = add(chips, `<div class="h-chip ${n ? '' : 'no-n'} ${tone ? 'is-' + tone : ''}" data-read="${id}">${inner}</div>`);
    const path = svgEl('path'), dot = svgEl('circle', { r: 7 }); leadSvg.append(path, dot);
    // tone starts as null so tone_(tone) below always applies it — also to the leader and anchor (experiment 19 A)
    const L = { el, path, dot, w: 0, h: 0, tone: null,
      tone_(t) { if (t === L.tone) return L; L.tone = t; el.classList.remove(...TONES); if (t) el.classList.add('is-' + t); for (const e of [path, dot]) { e.classList.remove(...TONES); if (t === 'student' || t === 'warn' || t === 'later') e.classList.add('is-' + t); } L.w = 0; return L; } };
    L.tone_(tone); return L;
  };
  /** Station chip: number badge + name (+ sub line when "now", + "?" when "later"). L.state('now'|'done'|'later'). */
  ui.station = (n, name, { sub = '', id = '' } = {}) => {
    const L = ui.label(`<span class="h-n">${n}</span><span><span class="nm">${name}</span><small class="sb"></small></span><span class="h-q">?</span>`, { tone: 'later', id: id || 'st' + n });
    const sb = L.el.querySelector('.sb'), q = L.el.querySelector('.h-q');
    L.state = s => { if (L.st === s) return L; L.st = s; L.tone_(s); sb.innerHTML = s === 'now' ? sub : ''; sb.style.display = s === 'now' && sub ? '' : 'none'; q.style.display = s === 'later' ? '' : 'none'; L.w = 0; return L; };
    L.state('later'); return L;
  };
  /**
   * Place a label next to an anchor and draw the leader. anchor: THREE.Vector3 (projected) or [x, y].
   * o: {dx, dy (label centre relative to the anchor), a (opacity), line (true), left (dx measured from the label's left edge), remeasure}
   * Labels are kept inside the safe area (x 30…1890, y safe[0]…safe[1]): never in the bottom 140 px.
   */
  ui.place = (L, anchor, { dx = 0, dy = -110, a = 1, line = true, left = false, remeasure = false } = {}) => {
    vis(L.el, a); const on = a > 0.01; L.path.style.display = L.dot.style.display = on && line ? '' : 'none';
    if (!on) return L;
    if (!L.w || remeasure) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
    const [ax, ay] = ui.project(anchor);
    const cx = clamp(ax + dx + (left ? L.w / 2 : 0), L.w / 2 + 30, W - 30 - L.w / 2), cy = clamp(ay + dy, L.h / 2 + safe[0], safe[1] - L.h / 2);
    at(L.el, cx - L.w / 2, cy - L.h / 2); L.cx = cx; L.cy = cy;
    if (!line) return L;
    const ddx = ax - cx, ddy = ay - cy, k = Math.min((L.w / 2 + 6) / Math.max(1e-3, Math.abs(ddx)), (L.h / 2 + 6) / Math.max(1e-3, Math.abs(ddy)));
    const ex = cx + ddx * Math.min(1, k), ey = cy + ddy * Math.min(1, k);
    L.path.setAttribute('d', `M${ex.toFixed(1)},${ey.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`); L.path.style.opacity = a;
    L.dot.setAttribute('cx', ax.toFixed(1)); L.dot.setAttribute('cy', ay.toFixed(1)); L.dot.style.opacity = a;
    return L;
  };

  // ------------------------------------------------------------------ progress pill, footnote
  /** Progress capsule: brand + title + numbered steps (done / now / later). set(cur (0-based, −1 none), a, x, y). */
  ui.progress = ({ brand = '', title = '', steps = 3, id = 'pill' } = {}) => {
    const n = Array.isArray(steps) ? steps.length : steps;
    const el = add(chips, `<div class="h-pill h-surface">${brand ? `<span class="h-brand">${brand}</span>` : ''}<span data-read="${id}">${title}</span><span class="h-steps">${Array.from({ length: n }, (_, i) => `<i>${i + 1}</i>`).join('')}</span></div>`);
    const dots = [...el.querySelectorAll('.h-steps i')];
    return { el, set(cur, a = 1, x = 48, y = 40) { vis(el, a); at(el, x, y); dots.forEach((d, i) => { d.classList.toggle('is-now', i === cur); d.classList.toggle('is-done', i < cur); }); } };
  };
  /** Small note (fiction / source). Never put anything the viewer must read here. set(a, x, y, alignRight). */
  ui.foot = (text, { id = 'foot' } = {}) => {
    const el = add(chips, `<div class="h-foot" data-read="${id}">${text}</div>`); let w = 0;
    return { el, set(a = 1, x = 1872, y = 48, right = true) { vis(el, a); if (a <= 0.01) return; if (!w) w = el.offsetWidth; at(el, right ? x - w : x, y); } };
  };

  // ------------------------------------------------------------------ selection, stamp
  /** Selection box with four square handles. set(rect {x0,y0,x1,y1} | HTMLElement, a, pad). tone: '' | 'warn' (magenta: framing a wrong word/value). */
  ui.selection = ({ layer: lay = 'chips', tone = '' } = {}) => {
    const el = add(lay === 'cards' ? cards : chips, `<div class="h-selbox${tone ? ' is-' + tone : ''}"><i></i><i></i><i></i><i></i></div>`);
    return { el, set(r, a = 1, pad = 10) { vis(el, a); if (a <= 0.01) return; if (r instanceof Element) { const b = r.getBoundingClientRect(), rb = root.getBoundingClientRect(); r = { x0: b.left - rb.left, y0: b.top - rb.top, x1: b.right - rb.left, y1: b.bottom - rb.top }; }
      el.style.width = (r.x1 - r.x0 + 2 * pad).toFixed(1) + 'px'; el.style.height = (r.y1 - r.y0 + 2 * pad).toFixed(1) + 'px'; at(el, r.x0 - pad, r.y0 - pad); } };
  };
  /** Round seal. set(x, y (centre), k): k 0 → 1 = pressed in (from 1.6× with a little bounce). tone: '' | 'warn' | 'student'. */
  ui.stamp = (inner, { tone = '', id = 'stamp', parent = null, rot = -12 } = {}) => {
    const el = add(parent || cards, `<div class="h-stamp ${tone ? 'is-' + tone : ''}" data-read="${id}"><span>${inner}</span></div>`);
    return { el, set(x, y, k) { vis(el, clamp(k * 3)); if (k <= 0) return; const s = lerp(1.6, 1, ease.outBack(clamp(k))); el.style.transform = `translate(${(x - 75).toFixed(1)}px,${(y - 75).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${rot}deg)`; } };
  };

  // ------------------------------------------------------------------ readout (HUD), proportional card
  /** Readout card: small title, one big number, rows. set({value, rows:[[label, html]], tone}, a, x, y). Text is rewritten only when it changes. */
  ui.readout = ({ title = '', rows = 0, id = 'hud' } = {}) => {
    const el = add(chips, `<div class="h-hud h-panel"><div class="k" data-read="${id}">${title}</div><div class="v"></div>${Array.from({ length: rows }, () => '<div class="row"><span></span><b></b></div>').join('')}${corners()}</div>`);
    const v = el.querySelector('.v'), rs = [...el.querySelectorAll('.row')]; let last = '';
    return { el, set({ value = '', rows: R = [], tone = '' } = {}, a = 1, x = 1500, y = 150) {
      vis(el, a); if (a <= 0.01) return; at(el, x, y);
      const key = value + '|' + R.flat().join('|') + '|' + tone; if (key === last) return; last = key;
      v.innerHTML = value; R.forEach(([l, h], i) => { if (rs[i]) { rs[i].firstChild.textContent = l; rs[i].lastChild.innerHTML = h; } });
      el.classList.remove('is-now', 'is-warn', 'is-student'); if (tone) el.classList.add('is-' + tone); } };
  };
  /**
   * Proportional number card: every cell is one unit, so the picture is the number. rows: [{label, n, tone: 'cyan'|'amber'|'warn'|'grey', value}]
   * set(a, fill (0–1, cells light up in order), x, y).
   */
  ui.ratio = ({ title = '', sub = '', rows = [], width = 520, id = 'ratio' } = {}) => {
    const tc = { cyan: 'var(--h-cyan)', amber: 'var(--h-amber)', warn: 'var(--h-magenta)', grey: 'var(--h-grey)' };
    const el = add(chips, `<div class="h-ratio h-panel"><div class="t" data-read="${id}">${title}${sub ? `<small>${sub}</small>` : ''}</div>${rows.map((r, i) => `<div class="r" style="--c:${tc[r.tone || 'cyan']};--w:${width}px"><span class="l" data-read="${id}-l${i}">${r.label}</span><span class="cells">${'<i></i>'.repeat(r.n)}</span><span class="v" data-read="${id}-v${i}">${r.value ?? r.n}</span></div>`).join('')}${corners()}</div>`);
    const cellRows = [...el.querySelectorAll('.cells')].map(c => [...c.children]); const total = rows.reduce((s, r) => s + r.n, 0); let lastOn = -1;
    return { el, set(a = 1, fill = 1, x = 560, y = 150) { vis(el, a); if (a <= 0.01) return; at(el, x, y);
      const on = Math.round(clamp(fill) * total); if (on === lastOn) return; lastOn = on; let c = 0;
      cellRows.forEach(cs => cs.forEach(i => { i.classList.toggle('on', c < on); c++; })); } };
  };

  // ------------------------------------------------------------------ key card, mindmap
  /**
   * Key card: tab + one picture (SVG string) + one sentence (HTML; wrap the key phrase in <span class="h-sel"><i></i><i></i><i></i><i></i>…</span>).
   * update(t): enters at `at` (0.5 s, rises 24 px), selection appears at `selAt`, leaves at `until` (0.3 s). Pure of t.
   */
  ui.keycard = ({ tab = '重點', fig = '', say = '', src = '', x = 240, y = 190, at: t0 = 0, until = 5, selAt, id = 'key' } = {}) => {
    const el = add(cards, `<div class="h-key h-panel">${corners()}<span class="h-tab">${tab}</span><div class="fig">${fig}</div><div class="say"><div data-read="${id}">${say}</div>${src ? `<small data-read="${id}-src">${src}</small>` : ''}</div></div>`);
    const sel = el.querySelector('.h-sel'); const sAt = selAt ?? t0 + 1.2;
    return { el, update(t) { const a = win(t, t0, until, 0.5, 0.3); vis(el, a); if (a <= 0.01) return a;
      at(el, x, y + 24 * (1 - sm(prog(t, t0, t0 + 0.6))));
      if (sel) { const k = sm(prog(t, sAt, sAt + 0.3)); sel.style.outlineColor = k < 1 ? `color-mix(in srgb, var(--h-line) ${Math.round(k * 100)}%, transparent)` : ''; sel.style.background = k < 1 ? `color-mix(in srgb, var(--h-cyan) ${Math.round(k * 16)}%, transparent)` : ''; sel.querySelectorAll('i').forEach(e => { e.style.opacity = k; }); }
      return a; } };
  };
  /**
   * Mindmap: centre capsule (solid cyan, same in both studios), node cards (icon SVG + ≤ 8 characters), S-shaped links.
   * center: {text, t}; nodes: [{text, icon (SVG markup, 96×96 viewBox), t}]. layout: one row under the centre.
   * update(t, a = 1) — pure of t; a fades the whole map (e.g. at the very end).
   */
  ui.mindmap = ({ center, nodes, cx = 960, cy = 300, ny = 640, spread = 440, nodeW = 300, nodeH = 226, id = 'mm' }) => {
    const c = add(cards, `<div class="h-mm-c" data-read="${id}-c">${center.text}</div>`);
    const N = nodes.map((n, i) => add(cards, `<div class="h-mm-n h-panel" style="width:${nodeW}px;height:${nodeH}px">${n.icon || ''}<span data-read="${id}-${i}">${n.text}</span>${corners()}</div>`));
    const nx = i => cx + (i - (nodes.length - 1) / 2) * spread;
    const paths = nodes.map(() => { const p = svgEl('path'); topSvg.append(p); return p; }), dots = nodes.map(() => { const d = svgEl('circle', { r: 7 }); topSvg.append(d); return d; });
    let cw = 0, ch = 0;
    return { center: c, nodes: N, update(t, a = 1) {
      const kc = sm(prog(t, center.t, center.t + 0.45)) * a; vis(c, kc);
      if (kc > 0.01) { if (!cw) { cw = c.offsetWidth; ch = c.offsetHeight; } at(c, cx - cw / 2, cy - ch / 2 + 16 * (1 - kc)); }
      nodes.forEach((n, i) => {
        const kl = sm(prog(t, n.t, n.t + 0.4)) * (a > 0.01 ? 1 : 0), kn = sm(prog(t, n.t + 0.15, n.t + 0.55)) * a;
        vis(N[i], kn); at(N[i], nx(i) - nodeW / 2, ny - nodeH / 2 + 20 * (1 - kn));
        const x0 = cx, y0 = cy + ch / 2 - 2, x1 = nx(i), y1 = ny - nodeH / 2 - 6, len = Math.hypot(x1 - x0, y1 - y0) * 1.25;
        const p = paths[i]; p.style.display = kl > 0.001 ? '' : 'none'; p.style.opacity = a;
        p.setAttribute('d', `M${x0},${y0} C${x0},${(y0 + y1) / 2} ${x1},${(y0 + y1) / 2} ${x1},${y1}`);
        p.setAttribute('stroke-dasharray', (len + 10).toFixed(0)); p.setAttribute('stroke-dashoffset', ((len + 10) * (1 - kl)).toFixed(1));
        dots[i].style.display = kl > 0.98 ? '' : 'none'; dots[i].style.opacity = a; dots[i].setAttribute('cx', x1); dots[i].setAttribute('cy', y1);
      }); } };
  };

  // ------------------------------------------------------------------ veil, wipe
  /** Veil over the scene behind a key card / mindmap (the studio stays visible). set(a). */
  ui.veil = () => { const el = add(veilL, '<div class="h-veil"></div>'); return { el, set(a) { vis(el, a); } }; };
  /**
   * Scene change: the studio's own wall slides in with a cyan scan band and brackets — never a flat white flash, fully
   * covered for at most two frames. update(t, tc): cut the camera at tc; covered over [tc−0.22, tc+0.06].
   */
  ui.wipe = () => { const el = add(over, `<div class="h-wipe">${corners()}</div>`);
    return { el, update(t, tc) { const a = Math.min(sm(prog(t, tc - 0.32, tc - 0.04)), 1 - sm(prog(t, tc + 0.04, tc + 0.42))); vis(el, a); el.style.setProperty('--p', prog(t, tc - 0.32, tc + 0.42).toFixed(3)); return a; } };
  };
  return ui;
}
