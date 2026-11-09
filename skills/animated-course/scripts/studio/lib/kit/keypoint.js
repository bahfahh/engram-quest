// 圖解重點（BRIEF3 規則 9）：每段講完，畫面靜下來，一張乾淨的圖卡＋一句關鍵句。說明：/lib/kit/KEYPOINT.md
//   import * as KP from '/lib/kit/keypoint.js';      // 並在 <head> 放 <link rel="stylesheet" href="/lib/kit/keypoint.css">
//   const kp = KP.keypoint(st, { at, dur: 5, index: 2, total: 3, key: '兩組只差**一個變因**', figure: f => { f.node(...); f.arrow(...) } });
//   window.renderAt = K.render(tl, cam, bar, kp);    // kp.update(t) 是 t 的純函數
import * as K from './kit.js';
const { h, tone, clamp, prog, ease, lerp } = K;

if (!document.querySelector('link[href$="/lib/kit/keypoint.css"]')) {   // fallback; the <link> in <head> is better (loads before studioReady)
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/lib/kit/keypoint.css'; document.head.append(l);
}
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); return e; };
const easeBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const GREY = '#8A8D91';

// all keypoints sharing one backdrop: the backdrop is pushed back by the strongest of them at time t
const BACKDROPS = new Map();

/**
 * KP.keypoint(stOrParent, opts) -> kp
 *   stOrParent : K.stage() 的回傳值（建議：背景＝它的 viewport，卡片放在章節條下面），或任何 1920×1080 的父元素
 *   opts.at     卡片開始進場的秒數（絕對秒數，用 T.line()/T.word() 取）
 *   opts.dur    總長（含進出場），預設 5；或 opts.until 結束秒數
 *   opts.index, opts.total   「重點 2／3」與進度點
 *   opts.label  標籤字，預設 '重點'；opts.sub 標籤下的一行小字（選用，盡量不要）
 *   opts.key    關鍵句（12 字以內），**包起來**的字會有螢光筆底線
 *   opts.keyAt  關鍵句出現的秒數；預設 at + min(2.6, dur*0.5)
 *   opts.figure SVG/HTML 字串 | DOM 節點 | (f) => {...}（f＝畫圖小工具，見下）
 *   opts.size   圖的尺寸 [w, h]，預設 [1440, 480]（卡片中間那塊）
 *   opts.backdrop 要推遠的背景元素（預設 st 的 .k-viewport）；false＝不動背景
 *   opts.out    false＝不退場（之後你自己切走）
 *   opts.mark   螢光筆顏色，預設 '#FFE27A'
 */
export function keypoint(parent, opts = {}) {
  const st = parent && parent.frame && parent.screen ? parent : null;
  const host = st ? st.frame : (parent.el || parent);
  const at = opts.at ?? 0;
  const end = opts.until ?? at + (opts.dur ?? 5);
  const dur = end - at;
  const IN = 0.5, OUT = 0.45;
  const keyAt = opts.keyAt ?? at + Math.min(2.6, dur * 0.5);
  const outAt = opts.out === false ? Infinity : end - OUT;
  const [FW, FH] = opts.size || [1440, 480];
  const EN = (opts.lang ?? K.LANG) === 'en';     // English: Inter, 'Key point 1 / 3', the key line shrinks to fit the card

  const wash = h('div.kp-wash');
  const card = h(EN ? 'div.kp-card.kp-en' : 'div.kp-card');
  const pill = h('div.kp-pill', EN ? `${opts.label ?? 'Key point'} ${opts.index ?? 1} / ${opts.total ?? 3}` : `${opts.label ?? '重點'} ${opts.index ?? 1}／${opts.total ?? 3}`);
  const dots = h('div.kp-dots');
  const total = opts.total ?? 3, index = opts.index ?? 1;
  for (let i = 1; i <= total; i++) dots.append(h('i', { class: i < index ? 'done' : i === index ? 'cur' : '' }));
  const head = h('div.kp-head', pill, total > 1 ? dots : null);
  card.append(head);
  if (opts.sub) card.append(h('div.kp-sub', opts.sub));
  const fig = h('div.kp-fig', { style: { width: FW + 'px', height: FH + 'px' } });
  const lines = svgEl('svg', { class: 'kp-lines', width: FW, height: FH, viewBox: `0 0 ${FW} ${FH}` });
  fig.append(lines);
  card.append(h('div.kp-figwrap', fig));
  const keyEl = h('div.kp-key', { html: String(opts.key || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') });
  if (opts.mark) keyEl.style.setProperty('--kp-mark', opts.mark);
  card.append(keyEl);
  if (st) st.frame.insertBefore(wash, st.screen), st.frame.insertBefore(card, st.screen);
  else host.append(wash, card);
  if (EN) { if (String(opts.key || '').replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length > 7) console.warn('keypoint: key line over 7 words: ' + opts.key); }
  else if ([...String(opts.key || '').replace(/\*\*/g, '')].filter(c => /\S/.test(c)).length > 12) console.warn('keypoint: 關鍵句超過 12 字：' + opts.key);

  // ------------------------------------------------------------------ reveal items
  const items = [];            // {el, t, dur, anim, draw?}
  const rel = v => (typeof v === 'string' && /^[+-]/.test(v) ? at + parseFloat(v) : v);
  const add = (el, o = {}, anim = 'pop', d = 0.45) => { const it = { el, t: rel(o.t), dur: o.dur ?? d, anim: o.anim || anim, order: items.length }; items.push(it); return it; };
  const place = (el, x, y, o = {}) => {
    const w = h('div.kp-at', { style: { left: x + 'px', top: y + 'px', zIndex: o.z ?? '' } }, el);
    fig.append(w); return w;
  };
  const refs = new Map();      // element -> wrapper used for measuring
  /** element / helper / [x,y] -> box {x,y,w,h,cx,cy} in figure px */
  const boxOf = (target) => {
    if (Array.isArray(target)) return { x: target[0], y: target[1], w: 0, h: 0, cx: target[0], cy: target[1] };
    const el = target.wrap || target.el || target;
    const F = fig.getBoundingClientRect(), s = F.width / fig.offsetWidth || 1, r = el.getBoundingClientRect();
    const b = { x: (r.left - F.left) / s, y: (r.top - F.top) / s, w: r.width / s, h: r.height / s };
    return { ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  };
  const lazy = [];             // geometry that needs layout (resolved on the first update)
  if (EN) lazy.push(() => {    // English lines run longer: shrink the key line (76 → min 54 px) until it fits the card
    let fs = 76; while (keyEl.offsetWidth > 1640 - 120 && fs > 54) { fs -= 2; keyEl.style.fontSize = fs + 'px'; }
    if (keyEl.offsetWidth > 1640 - 120) console.warn('keypoint: key line too long for the card: ' + opts.key);
  });

  /** figure helpers */
  const f = {
    W: FW, H: FH, el: fig, svg: lines,
    /** icon tile + label. f.node({x, y, icon:'users', label:'受眾', sub, color:'teal', size:'s'|'m'|'l', shape:'tile'|'circle', solid, t}) */
    node({ x, y, icon, label, sub, color = 'neutral', size = 'm', shape = 'tile', solid = false, t, anim, iconSize } = {}) {
      const c = tone(color);
      const isz = iconSize || (size === 's' ? 50 : size === 'l' ? 84 : 64);
      const tile = h(`div.kp-tile${shape === 'circle' ? '.circle' : ''}${solid ? '.solid' : ''}`, icon ? K.icon(icon, { size: isz, stroke: 2 }) : null);
      const el = h(`div.kp-node.${size}`, { style: { '--c': c } }, tile, label ? h('div.lb', label) : null, sub ? h('div.sb', sub) : null);
      const wrap = place(el, x, y);
      const it = add(el, { t, anim }, 'pop');
      return { el, wrap, tile, item: it };
    },
    /** free text. f.text('NT$2,400', {x, y, size:40, color, weight:700, align:'center'|'left'|'right', t, anim:'wipe'}) */
    text(str, { x, y, size = 40, color = 'neutral', weight = 700, t, anim = 'fade', font } = {}) {
      const el = h('div.kp-text', { style: { fontSize: size + 'px', fontWeight: weight, color: tone(color), fontFamily: font || '' }, html: String(str).replace(/\*\*(.+?)\*\*/g, '<b style="color:inherit">$1</b>') });
      const wrap = place(el, x, y);
      add(el, { t, anim }, anim);
      return { el, wrap };
    },
    /** any DOM node at (x,y). f.put(node, {x, y, t, anim}) */
    put(node, { x, y, t, anim = 'pop' } = {}) { node = node.el || node; const wrap = place(node, x, y); add(node, { t, anim }, anim); return { el: node, wrap }; },
    /** dashed group box with a small label on its border. f.group({x, y, w, h, label:'全部一樣', color, dashed:true, t}) — x,y = top-left */
    group({ x, y, w, h: hh, label, color = GREY, dashed = true, radius = 30, width = 3, t, dur = 0.7 } = {}) {
      const c = tone(color);
      const r = svgEl('rect', { x: x + 1, y: y + 1, width: w - 2, height: hh - 2, rx: radius, fill: 'none', stroke: c, 'stroke-width': width });
      lines.append(r);
      const it = add(r, { t, dur }, 'draw', dur); it.dash = dashed ? [14, 11] : null; it.len = () => 2 * (w + hh) - (8 - 2 * Math.PI) * radius;
      let lbl = null;
      if (label) { lbl = h('div.kp-glabel', { style: { '--c': c, left: x + 32 + 'px', top: y + 'px' } }, label); fig.append(lbl); add(lbl, { t: it.t == null ? undefined : it.t + dur * 0.5, anim: 'fade' }, 'fade'); if (it.t == null) items[items.length - 1].follow = it; }
      return { el: r, label: lbl, item: it, box: { x, y, w, h: hh } };
    },
    /**
     * arrow / line between two things. f.arrow({from, to, label, color, width:5, dashed, bend:0, head:true, fromSide, toSide, gap:14, t, dur:0.5})
     *   from/to: [x,y] | helper result | element inside the figure.  bend: curve amount (-0.5..0.5, + = bulge to the left of the direction).
     */
    arrow({ from, to, label, color = GREY, width = 5, dashed = false, bend = 0, head = true, fromSide, toSide, gap = 14, t, dur = 0.55, labelAt = 0.5, labelDx = 0, labelDy = 0 } = {}) {
      const c = tone(color);
      const p = svgEl('path', { fill: 'none', stroke: c, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      const hd = head ? svgEl('path', { fill: c, stroke: c, 'stroke-width': Math.max(2, width * 0.5), 'stroke-linejoin': 'round' }) : null;
      lines.append(p); if (hd) lines.append(hd);
      const it = add(p, { t, dur }, 'draw', dur); it.dash = dashed ? [Math.max(12, width * 3), Math.max(10, width * 2.4)] : null; it.head = hd;
      let lbl = null;
      if (label) { lbl = h('div.kp-albl', { style: { '--c': c } }, label); const w = place(lbl, 0, 0); lbl._w = w; const li = add(lbl, { anim: 'pop' }, 'pop', 0.35); li.follow = it; li.lag = dur * 0.6; }
      lazy.push(() => {
        const A = boxOf(from), B = boxOf(to);
        const pa = edgePt(A, fromSide, [B.cx, B.cy], gap), pb = edgePt(B, toSide, [A.cx, A.cy], gap + (head ? width * 0.6 : 0));
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, dx = pb[0] - pa[0], dy = pb[1] - pa[1];
        const cx = mx + dy * bend, cy = my - dx * bend;
        p.setAttribute('d', `M${pa[0].toFixed(1)},${pa[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${pb[0].toFixed(1)},${pb[1].toFixed(1)}`);
        it.len = () => p.getTotalLength();
        if (hd) {
          const a = Math.atan2(pb[1] - cy, pb[0] - cx), L = 12 + width * 2.4, s = 0.5;
          const tip = [pb[0] + Math.cos(a) * width * 0.6, pb[1] + Math.sin(a) * width * 0.6];
          const l = [tip[0] - L * Math.cos(a - s), tip[1] - L * Math.sin(a - s)], r = [tip[0] - L * Math.cos(a + s), tip[1] - L * Math.sin(a + s)];
          hd.setAttribute('d', `M${tip[0].toFixed(1)},${tip[1].toFixed(1)} L${l[0].toFixed(1)},${l[1].toFixed(1)} L${r[0].toFixed(1)},${r[1].toFixed(1)} Z`);
        }
        if (lbl) { const u = labelAt, qx = (1 - u) * (1 - u) * pa[0] + 2 * u * (1 - u) * cx + u * u * pb[0], qy = (1 - u) * (1 - u) * pa[1] + 2 * u * (1 - u) * cy + u * u * pb[1]; lbl._w.style.left = qx + labelDx + 'px'; lbl._w.style.top = qy + labelDy + 'px'; }
      });
      return { el: p, head: hd, label: lbl, item: it };
    },
    /** round badge (=, ≠, ✓, ✗ or an icon) next to / on something. f.badge('≠', {on: el, side:'right', dx, x, y, color:'red', ghost, t}) */
    badge(content, { on, side = 'center', x, y, dx = 0, dy = 0, color = 'neutral', ghost = false, size = 64, t, anim = 'pop' } = {}) {
      const isIcon = /^[a-z][a-z0-9-]+$/.test(content);
      const el = h(`div.kp-badge${ghost ? '.ghost' : ''}`, { style: { '--c': tone(color), width: size + 'px', height: size + 'px', fontSize: size * 0.62 + 'px' } }, isIcon ? K.icon(content, { size: size * 0.56, stroke: 3 }) : content);
      const wrap = place(el, x ?? 0, y ?? 0);
      if (on) lazy.push(() => { const b = boxOf(on); const px = x ?? (side === 'right' ? b.x + b.w + size * 0.5 + 12 : side === 'left' ? b.x - size * 0.5 - 12 : b.cx), py = y ?? (side === 'top' ? b.y - size * 0.5 - 10 : side === 'bottom' ? b.y + b.h + size * 0.5 + 10 : b.cy); wrap.style.left = px + dx + 'px'; wrap.style.top = py + dy + 'px'; });
      add(el, { t, anim }, anim, 0.35);
      return { el, wrap };
    },
    /**
     * mini UI card, e.g. an ad set. f.card({x, y, w:520, title:'Ad set A', icon:'layout-grid', color, rows:[{icon, label, value, color, t}], t})
     * A row with `color` gets a tinted background + colour bar; with `t` the tint fades in at t (the row is "lit"). Returns {el, rows:[el]}.
     */
    card({ x, y, w = 520, title, icon, color = GREY, rows = [], t, anim = 'up' } = {}) {
      const el = h('div.kp-mini', { style: { width: w + 'px', '--c': tone(color) } });
      if (title) el.append(h('div.hd', icon ? K.icon(icon, { size: 32, stroke: 2.2 }) : null, title));
      const rowEls = rows.map(r => {
        const re = h(`div.row${r.color && r.t == null ? '.hot' : ''}`, r.color ? { style: { '--rc': tone(r.color), '--k': r.t == null ? 1 : 0 } } : null);
        if (r.color) { const tint = h('div.tint'), bar = h('div.bar'); re.append(tint, bar); if (r.t != null) { const it = add(re, { t: r.t, anim: 'var', dur: 0.4 }); it.varEl = re; } }
        if (r.icon) re.append(K.icon(r.icon, { size: 28, stroke: 2.2 }));
        re.append(h('span.l', r.label || ''));
        if (r.value != null) re.append(h('span.v', r.value));
        el.append(re); return re;
      });
      const wrap = place(el, x, y);
      add(el, { t, anim }, anim, 0.5);
      return { el, wrap, rows: rowEls };
    },
    /**
     * two columns side by side. f.compare({x, y, left:{title, icon, color, items:[{icon,label}] | node}, right:{…}, vs:'VS' | '', t, gap})
     * Columns appear one after the other (right at t + 0.9 unless right.t is given).
     */
    compare({ x, y, left = {}, right = {}, vs = 'VS', t, colW = 560 } = {}) {
      const col = (c) => {
        const el = h('div.kp-col', { style: { '--c': tone(c.color || 'neutral'), width: colW + 'px' } });
        if (c.icon) el.append(h(`div.kp-tile${c.solid ? '.solid' : ''}`, { style: { width: '150px', height: '150px', borderRadius: '40px' } }, K.icon(c.icon, { size: 76, stroke: 2 })));
        if (c.title) el.append(h('div.ct', c.title));
        if (c.sub) el.append(h('div.cs', c.sub));
        if (c.items) el.append(h('div.its', c.items.map(i => h('div.it', i.icon ? K.icon(i.icon, { size: 34, stroke: 2.2 }) : null, i.label))));
        if (c.node) el.append(c.node.el || c.node);
        return el;
      };
      const L = col(left), R = col(right), V = h('div.kp-vs', vs ? h('span', vs) : null);
      const el = h('div.kp-cmp', L, V, R);
      const wrap = place(el, x ?? FW / 2, y ?? FH / 2);
      const tl0 = rel(left.t ?? t), tr0 = rel(right.t) ?? (tl0 != null ? tl0 + 0.9 : undefined);
      add(L, { t: tl0, anim: 'up' }); add(V, { t: tl0 != null ? tl0 + 0.3 : undefined, anim: 'fade' }); add(R, { t: tr0, anim: 'up' });
      return { el, wrap, left: L, right: R };
    },
    /** reveal an element you built yourself at time t (absolute s, or '+0.8' from the card's start) */
    reveal(el, t, anim = 'pop', d = 0.45) { return add(el.el || el, { t, anim }, anim, d); },
  };

  // ------------------------------------------------------------------ figure input
  const fg = opts.figure;
  if (typeof fg === 'function') { const r = fg(f); if (r instanceof Node) fig.append(r); }
  else if (typeof fg === 'string') { const d = h('div', { style: { position: 'absolute', inset: 0 }, html: fg }); fig.append(d); }
  else if (fg instanceof Node) fig.append(fg);
  // data-t on anything inside the figure (absolute seconds, or '+0.8' relative to `at`); data-anim = pop|fade|up|wipe|draw
  for (const el of fig.querySelectorAll('[data-t]')) {
    const v = el.getAttribute('data-t'); const anim = el.getAttribute('data-anim') || (el instanceof SVGGeometryElement ? 'draw' : 'pop');
    const it = add(el, { t: /^[+-]/.test(v) ? v : parseFloat(v), anim }, anim, parseFloat(el.getAttribute('data-dur') || '') || (anim === 'draw' ? 0.6 : 0.45));
    if (anim === 'draw') it.len = () => el.getTotalLength();
  }
  // auto times: items without t are spread between the card's entrance and the key sentence, in creation order
  {
    const free = items.filter(i => i.t == null && !i.follow);
    const a0 = at + IN * 0.8, a1 = Math.max(a0 + 0.1, keyAt - 0.35);
    free.forEach((it, i) => { it.t = free.length > 1 ? lerp(a0, a1 - it.dur * 0.5, i / (free.length - 1)) : a0; });
    for (const it of items) if (it.follow) it.t = it.follow.t + (it.lag ?? it.follow.dur * 0.5);
  }

  // ------------------------------------------------------------------ backdrop
  const back = opts.backdrop === false ? null : (opts.backdrop || (st ? st.frame.querySelector('.k-viewport') : null));
  const self = {};
  if (back) { if (!BACKDROPS.has(back)) BACKDROPS.set(back, []); BACKDROPS.get(back).push(self); back.style.transformOrigin = '50% 46%'; }

  const kAt = t => {
    if (t < at || t >= (outAt === Infinity ? Infinity : outAt + OUT)) return 0;
    const kin = ease.out(prog(t, at, at + IN)), kout = outAt === Infinity ? 0 : ease.inOut(prog(t, outAt, outAt + OUT));
    return kin * (1 - kout);
  };
  let measured = false;
  function apply(it, k) {
    const el = it.el;
    if (it.anim === 'draw') {
      const L = it._L ?? (it._L = it.len ? it.len() : el.getTotalLength());
      if (it.dash && k >= 1) { el.style.strokeDasharray = it.dash.join(' '); el.style.strokeDashoffset = '0'; }
      else if (it.dash) { const [d, g] = it.dash, n = Math.floor(L * k / (d + g)), rest = L * k - n * (d + g); const arr = []; for (let i = 0; i < n; i++) arr.push(d, g); arr.push(Math.min(rest, d), L + 10); el.style.strokeDasharray = arr.join(' '); el.style.strokeDashoffset = '0'; }
      else { el.style.strokeDasharray = `${L} ${L + 10}`; el.style.strokeDashoffset = String(L * (1 - k)); }
      el.style.opacity = k > 0 ? 1 : 0;
      if (it.head) it.head.style.opacity = clamp((k - 0.85) / 0.15);
      return;
    }
    if (it.anim === 'var') { el.style.setProperty('--k', k.toFixed(3)); el.classList.toggle('hot', k > 0.35); return; }
    if (el instanceof SVGElement && !it._svg) { it._svg = 1; el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; }
    el.style.opacity = it.anim === 'wipe' ? (k > 0 ? 1 : 0) : clamp(k * 1.6).toFixed(3);
    if (it.anim === 'pop') el.style.scale = (0.82 + 0.18 * easeBack(k)).toFixed(4);
    else if (it.anim === 'up') el.style.translate = `0 ${((1 - ease.out(k)) * 28).toFixed(1)}px`;
    else if (it.anim === 'wipe') el.style.clipPath = `inset(-10% ${((1 - ease.inOut(k)) * 100).toFixed(2)}% -10% -2%)`;
  }
  function update(t) {
    // backdrop: strongest keypoint on it at t (pure: every keypoint is evaluated at t)
    if (back) { const m = Math.max(...BACKDROPS.get(back).map(o => o.kAt(t))); back.style.scale = (1 - 0.05 * m).toFixed(4); }
    const k = kAt(t);
    const vis = k > 0.001;
    wash.style.visibility = card.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) return;
    if (!measured) { measured = true; for (const fn of lazy) fn(); }
    wash.style.opacity = k.toFixed(3);
    const kin = ease.out(prog(t, at, at + IN)), kout = outAt === Infinity ? 0 : ease.inOut(prog(t, outAt, outAt + OUT));
    card.style.opacity = clamp(kin * 1.4 * (1 - kout)).toFixed(3);
    card.style.transform = `translateY(${((1 - kin) * 46 - kout * 16).toFixed(1)}px) scale(${(0.965 + 0.035 * kin - 0.015 * kout).toFixed(4)})`;
    head.style.opacity = clamp((t - at - 0.12) / 0.3).toFixed(3);
    for (const it of items) apply(it, clamp((t - it.t) / Math.max(1e-3, it.dur)));
    // key sentence: wipe in, then the marker sweeps
    const kk = ease.inOut(prog(t, keyAt, keyAt + 0.55));
    keyEl.style.opacity = kk > 0 ? 1 : 0;
    keyEl.style.clipPath = `inset(-20% ${((1 - kk) * 100).toFixed(2)}% -20% -2%)`;
    keyEl.style.setProperty('--m', ease.inOut(prog(t, keyAt + 0.45, keyAt + 0.85)).toFixed(3));
  }
  Object.assign(self, { el: card, card, wash, fig, f, key: keyEl, at, end, keyAt, kAt, update, render: update, items });
  return self;
}

/** point on box b where the line towards `toward` leaves it (+gap); or a side midpoint when side is given */
function edgePt(b, side, toward, gap) {
  if (!b.w && !b.h) return [b.cx, b.cy];
  if (side === 'left') return [b.x - gap, b.cy];
  if (side === 'right') return [b.x + b.w + gap, b.cy];
  if (side === 'top') return [b.cx, b.y - gap];
  if (side === 'bottom') return [b.cx, b.y + b.h + gap];
  const dx = toward[0] - b.cx, dy = toward[1] - b.cy;
  if (!dx && !dy) return [b.cx, b.cy];
  const sx = Math.abs(dx) > 1e-6 ? (b.w / 2) / Math.abs(dx) : Infinity, sy = Math.abs(dy) > 1e-6 ? (b.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy), L = Math.hypot(dx, dy);
  return [b.cx + dx * s + dx / L * gap, b.cy + dy * s + dy / L * gap];
}

/** Helper for scripts: the usual beat — card in just before the teacher's line, key on a word, out after a silence.
 *  KP.beat(T, 'K2', '一個變因', {lead: 0.4, hold: 1.0}) -> {at, keyAt, until} to spread into KP.keypoint opts */
export function beat(T, lineId, keyWord, { lead = 0.4, hold = 1.0 } = {}) {
  const L = T.line(lineId);
  return { at: L.start - lead, keyAt: keyWord ? T.word(lineId, keyWord) : L.start + 0.2, until: L.end + hold + 0.45 };
}
