// Meta-ads explainer kit — see /lib/kit/README.md.  import * as K from '/lib/kit/kit.js';
// Everything here is deterministic: state is a pure function of t (GSAP timeline seek + K.render updatables).
import { gsap } from '/node_modules/gsap/index.js';
export { gsap };

/* ============================== tokens & tiny helpers ============================== */
export const tokens = {
  bg: '#F4F2EE', card: '#FFFFFF', ink: '#1C1E21', muted: '#65676B', line: '#E4E6EB',
  blue: '#1877F2', teal: '#0F9D8F', orange: '#F2780C', conceptA: '#0F9D8F', conceptB: '#F2780C',
  red: '#E5484D', green: '#2EA44F', amber: '#F5A524',
  font: 'Inter, "Noto Sans TC", sans-serif', fontTC: '"Noto Sans TC", Inter, sans-serif', fontHand: '"LXGW WenKai TC", serif',
};
const TONE = { red: tokens.red, green: tokens.green, blue: tokens.blue, amber: tokens.amber, teal: tokens.teal, orange: tokens.orange, neutral: tokens.ink, a: tokens.teal, b: tokens.orange };
export const tone = c => TONE[c] || c;
/* ---- language. K.setLang('en') before building: Chinese-only fonts (--font-tc, --font-hand) switch to Inter / Kalam and the
   sample defaults (creative, IG post/reel, Play listing, title card, recap) are in English. Default 'zh' = unchanged. See /lib/classroom/EN.md */
export let LANG = 'zh';
export function setLang(lang = 'zh') {
  LANG = lang === 'en' ? 'en' : 'zh';
  document.documentElement.classList.toggle('k-en', LANG === 'en');
  return LANG;
}
const EN_ = () => LANG === 'en';
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const ease = {
  linear: k => k, inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3), in: k => k * k * k,
  smooth: k => k * k * k * (k * (k * 6 - 15) + 10),
};
export function rng(seed = 1) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** h('div.cls1.cls2', {style:{...}, attr:value}, child|string|[...]) -> element. Strings are set as text; use {html:'...'} for markup. */
export function h(sel, props, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else for (const [sk, sv] of Object.entries(v)) { if (sv == null) continue; sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv); } }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className += ' ' + v;
    else if (k.startsWith('--')) el.style.setProperty(k, v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const H = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
export const fmt = (v, { prefix = '', suffix = '', decimals = 0 } = {}) => prefix + Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

/* ============================== icons (lucide-static) ============================== */
const ICONS = {};
const DEFAULT_ICONS = ['heart', 'message-circle', 'send', 'bookmark', 'ellipsis', 'ellipsis-vertical', 'house', 'search', 'square-plus', 'clapperboard', 'circle-user',
  'chevron-right', 'chevron-down', 'chevron-left', 'music', 'camera', 'megaphone', 'mouse-pointer-click', 'messages-square', 'filter', 'smartphone', 'shopping-bag',
  'menu', 'gauge', 'users', 'chart-column', 'receipt', 'settings', 'circle-help', 'folder', 'layout-grid', 'rectangle-horizontal', 'plus', 'copy', 'pencil',
  'flask-conical', 'bell', 'info', 'triangle-alert', 'lock-open', 'star', 'download', 'x', 'check', 'lightbulb', 'sparkles', 'wallet', 'coins', 'user',
  'zap', 'ban', 'circle-check', 'circle-x', 'eye', 'play', 'arrow-left', 'share-2', 'volume-2', 'calendar', 'target', 'image', 'trending-up', 'trending-down', 'mic'];
/** Load lucide icons by name (call once at start: await K.init(['extra-icon'])). */
export async function loadIcons(names) {
  await Promise.all([...new Set(names)].filter(n => !ICONS[n]).map(async n => {
    const r = await fetch(`/node_modules/lucide-static/icons/${n}.svg`);
    if (!r.ok) { console.warn('kit: no icon ' + n); ICONS[n] = ''; return; }
    ICONS[n] = (await r.text()).replace(/<!--[\s\S]*?-->/, '').replace(/<svg[^>]*>/, m => m.replace(/\s(width|height|class)="[^"]*"/g, '')).trim();
  }));
}
/** icon('heart', {size:24, color:'#000', stroke:2, fill:'none'}) -> <span class="k-icon"> */
export function icon(name, { size = 20, color, stroke, fill, style } = {}) {
  const s = h('span.k-icon', { style: { width: size + 'px', height: size + 'px', color: color || '' } });
  if (!(name in ICONS)) console.warn('kit: icon not preloaded: ' + name + ' (pass it to K.init)');
  s.innerHTML = ICONS[name] || '';
  const svg = s.firstElementChild;
  if (svg) { if (stroke != null) svg.setAttribute('stroke-width', stroke); if (fill) svg.setAttribute('fill', fill); }
  if (style) Object.assign(s.style, style);
  return s;
}

/* ============================== lifecycle ============================== */
const lazy = [];               // resolvers that need final layout (run in K.ready after fonts load)
const onLayout = fn => { lazy.push(fn); return fn; };
/** Call first: loads the default icon set + extras. */
export async function init(extraIcons = []) { await loadIcons([...DEFAULT_ICONS, ...extraIcons]); }
/** Call last: window.studioReady = K.ready(). Loads every font glyph used on the page, then resolves camera targets / connectors. */
export async function ready() {
  const text = document.body.innerText + document.body.textContent;
  const loads = [];
  for (const fam of EN_() ? ['Noto Sans TC', 'Inter', 'LXGW WenKai TC', 'Kalam'] : ['Noto Sans TC', 'Inter', 'LXGW WenKai TC']) for (const w of ['400', '500', '600', '700']) loads.push(document.fonts.load(`${w} 32px "${fam}"`, text).catch(() => {}));
  await Promise.all(loads);
  document.body.offsetHeight;
  await document.fonts.ready;
  for (const fn of lazy) fn();
}
/** window.renderAt = K.render(tl, cam, chapterBar, ...anything with update(t)) */
export function render(tl, ...ups) {
  return t => { if (tl) tl.seek(t, false); for (const u of ups) u && u.update && u.update(t); };
}

/* ============================== stage / world / camera ============================== */
export const SCREEN = { w: 1920, h: 1080, safeTop: 96, safeBottom: 150 };
/**
 * const S = K.stage({width:3840, height:2160, grid:true})
 *   S.world  : World (place things in world px)   S.screen : screen-space layer (chapter bar, title, recap)
 *   S.cam    : Camera
 */
export function stage({ width = 3840, height = 2160, grid = true, bg } = {}) {
  const frame = h('div.k-frame', bg ? { style: { background: bg } } : null);
  const viewport = h('div.k-viewport');
  const layer = h('div.k-world', { style: { width: width + 'px', height: height + 'px' } });
  if (grid) layer.append(h('div.k-world-grid'));
  const NS = 'http://www.w3.org/2000/svg';
  const mk = z => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'k-svg'); s.setAttribute('width', width); s.setAttribute('height', height); s.style.zIndex = z; return s; };
  const under = mk(1), over = mk(30);
  layer.append(under, over);
  viewport.append(layer);
  const screen = h('div.k-screen');
  frame.append(viewport, screen);
  document.body.append(frame);
  const world = new World(layer, width, height, under, over);
  const cam = new Camera(world, { x: width / 2, y: height / 2, zoom: Math.min(1920 / width, 1080 / height) });
  return { frame, world, screen, cam, layer };
}

class World {
  constructor(el, w, hgt, under, over) { Object.assign(this, { el, w, h: hgt, under, over, tx: 0, ty: 0, z: 1 }); }
  /** Place el at world (x,y). opts: {anchor:'center'|'tl'|'top'|'left'..., scale, z} -> el */
  add(el, x, y, { anchor = 'center', scale = 1, z = 10 } = {}) {
    el = el.el || el;
    el.classList.add('k-place');
    Object.assign(el.style, { position: 'absolute', left: x + 'px', top: y + 'px', zIndex: z });
    const ax = /left|tl|bl/.test(anchor) ? 0 : /right|tr|br/.test(anchor) ? 1 : 0.5;
    const ay = /top|tl|tr/.test(anchor) ? 0 : /bottom|bl|br/.test(anchor) ? 1 : 0.5;
    gsap.set(el, { xPercent: -ax * 100, yPercent: -ay * 100, scale, transformOrigin: `${ax * 100}% ${ay * 100}%` });
    el._kPlace = { x, y, ax, ay, scale };
    this.el.append(el);
    return el;
  }
  /** World-space rect {x,y,w,h,cx,cy,r,b} of an element (placed ones use their layout box; nested ones use the live box). Also accepts {x,y,w,h} or {x,y}. */
  rect(t) {
    if (t == null) throw new Error('rect(null)');
    if (t.el && !(t instanceof Node)) t = t.el;
    let r;
    if (!(t instanceof Node)) r = { x: t.x, y: t.y, w: t.w || 0, h: t.h || 0 };
    else if (t._kPlace) { const p = t._kPlace, w = t.offsetWidth * p.scale, hh = t.offsetHeight * p.scale; r = { x: p.x - p.ax * w, y: p.y - p.ay * hh, w, h: hh }; }
    else { const b = t.getBoundingClientRect(); r = { x: (b.left - this.tx) / this.z, y: (b.top - this.ty) / this.z, w: b.width / this.z, h: b.height / this.z }; }
    return { ...r, cx: r.x + r.w / 2, cy: r.y + r.h / 2, r: r.x + r.w, b: r.y + r.h };
  }
  apply(x, y, z) {
    const FY = (SCREEN.safeTop + SCREEN.h - SCREEN.safeBottom) / 2;
    this.tx = 960 - x * z; this.ty = FY - y * z; this.z = z;
    this.el.style.transform = `translate(${this.tx.toFixed(2)}px, ${this.ty.toFixed(2)}px) scale(${z.toFixed(5)})`;
  }
}

/**
 * Camera: (x,y) = world point shown at the centre of the safe area (between chapter bar and subtitles), zoom = scale.
 *   cam.set({x,y,zoom})                         initial shot
 *   cam.to(at, target, dur = 1.4, ease='inOut') move; target = {x,y,zoom} | element | [elements] | {el, pad, zoom}
 *   cam.cut(at, target)                         instant cut
 *   cam.frame(target, pad = 80) -> {x,y,zoom}   fit target into the safe area (after K.ready)
 *   cam.update(t)                               (K.render does it)
 */
class Camera {
  constructor(world, init) { this.world = world; this.init = init; this.moves = []; this.maxZoom = 3; }
  set(target) { this._initT = target; return this; }
  to(at, target, dur = 1.4, e = 'inOut') { this.moves.push({ start: at, dur: Math.max(1e-3, dur), target, ease: typeof e === 'function' ? e : ease[e] }); this.moves.sort((a, b) => a.start - b.start); this._resolved = false; return this; }
  cut(at, target) { return this.to(at, target, 1e-3, 'linear'); }
  frame(target, pad = 80) {
    if (target && !Array.isArray(target) && target.zoom !== undefined && target.x !== undefined && !(target instanceof Node)) return target;
    let p = pad, zMax = this.maxZoom, dx = 0, dy = 0;
    if (target && target.el && !(target instanceof Node) && (target.pad !== undefined || target.zoom !== undefined || target.dx !== undefined)) { p = target.pad ?? pad; zMax = target.zoom ?? zMax; dx = target.dx || 0; dy = target.dy || 0; target = target.el; }
    const list = Array.isArray(target) ? target : [target];
    const rs = list.map(t => this.world.rect(t));
    const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.r)), y1 = Math.max(...rs.map(r => r.b));
    const sw = SCREEN.w, sh = SCREEN.h - SCREEN.safeTop - SCREEN.safeBottom;
    const zoom = Math.min(zMax, sw / (x1 - x0 + 2 * p), sh / (y1 - y0 + 2 * p));
    return { x: (x0 + x1) / 2 + dx, y: (y0 + y1) / 2 + dy, zoom };
  }
  _resolve() {
    if (this._resolved) return;
    this.start = this._initT ? this.frame(this._initT) : this.init;
    let s = this.start;
    for (const m of this.moves) { m.to = this.frame(m.target); }
    for (let i = 0; i < this.moves.length; i++) { const m = this.moves[i]; m.from = this._eval(m.start, i); }
    this._resolved = true;
  }
  _eval(t, upto = this.moves.length) {
    let s = this.start;
    for (let i = 0; i < upto; i++) {
      const m = this.moves[i]; if (t <= m.start) break;
      const k = m.ease(clamp((t - m.start) / m.dur)), f = m.from;
      s = { x: lerp(f.x, m.to.x, k), y: lerp(f.y, m.to.y, k), zoom: f.zoom * Math.pow(m.to.zoom / f.zoom, k) };
    }
    return s;
  }
  at(t) { this._resolve(); return this._eval(t); }
  update(t) { const s = this.at(t); this.world.apply(s.x, s.y, s.zoom); }
}

/* ============================== generic cards ============================== */
/** Plain white card with optional header label. K.card({w:600, title:'Ads Manager', pad:24}, ...children) */
export function card({ w, hgt, pad = 24, title, radius = 18, style } = {}, ...kids) {
  const el = h('div.k-card', { style: { width: w ? w + 'px' : '', height: hgt ? hgt + 'px' : '', padding: pad + 'px', borderRadius: radius + 'px', boxSizing: 'border-box', ...(style || {}) } });
  if (title) el.append(h('div', { style: 'font:700 22px var(--font);margin-bottom:14px' }, title));
  el.append(...kids);
  return el;
}
/** Small grey section label above a group, like "使用者在 App 上看到的". K.label('看到的廣告', {icon:'smartphone'}) */
export function label(text, { icon: ic, color } = {}) { return h('div.k-label', { style: { color: color || '' } }, ic && icon(ic, { size: 24 }), text); }
/** Dark (or coloured) solid tag pill: K.tag('Concept A', {color:'a'}) */
export function tag(text, { color = 'neutral', icon: ic } = {}) { return h('div.k-tag', { style: { background: tone(color) } }, ic && icon(ic, { size: 20 }), text); }

/* ============================== phone ============================== */
const SIG = '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>';
const WIFI = '<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.2c2.5 0 4.8 1 6.5 2.6l1.3-1.4A11 11 0 0 0 8.5.3 11 11 0 0 0 .7 3.4L2 4.8a9 9 0 0 1 6.5-2.6zm0 3.7c1.5 0 2.9.6 3.9 1.6l1.4-1.4a7.5 7.5 0 0 0-10.6 0l1.4 1.4c1-1 2.4-1.6 3.9-1.6zm0 3.7c-.6 0-1.1.2-1.5.6l1.5 1.6 1.5-1.6c-.4-.4-.9-.6-1.5-.6z"/></svg>';
const BATT = '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2"/><rect x="25" y="4.5" width="2" height="4" rx="1" opacity=".45"/></svg>';
/**
 * K.phone({os:'ios'|'android', w:390, h:844, dark:false, time:'9:41', overlayStatus:false})
 *  -> {el, screen, body, status}   build app UI into `body` (below the status bar) or `screen` (full)
 */
export function phone({ os = 'ios', w = 390, h: hh = 844, dark = false, time, overlayStatus = false } = {}) {
  const el = h(`div.k-phone.${os}`, { style: { width: w + 26 + 'px', height: hh + 26 + 'px' } });
  if (dark) el.classList.add('dark');
  if (overlayStatus) el.classList.add('overlay-status');
  const screen = h('div.k-phone-screen');
  const status = h('div.k-status', { html: `<span>${time || (os === 'ios' ? '9:41' : '12:30')}</span><span class="r">${SIG}${WIFI}${BATT}</span>` });
  status.querySelectorAll('svg').forEach(s => s.setAttribute('fill', 'currentColor'));
  const body = h('div.k-phone-body');
  screen.append(status, body, h('div.k-island'), h('div.k-homebar'));
  el.append(screen);
  return { el, screen, body, status };
}

/* ============================== creative / avatar placeholders ============================== */
/** Colored circle avatar with initial. */
export function avatar(name = 'A', { color = '#7B61FF', size = 32, img } = {}) {
  const a = h('div.ig-av', { style: { width: size + 'px', height: size + 'px', background: img || color, fontSize: size * 0.42 + 'px' } }, img ? '' : name[0].toUpperCase());
  return a;
}
/**
 * A believable app-install ad creative (fills its container). K.creative({headline:'5 分鐘背 20 個單字', sub:'免費下載', color:'a', app:'LingoLeaf', style:'phone'|'bold'|'photo'})
 */
export function creative({ headline = EN_() ? '5 minutes a day\nto learn new words' : '每天 5 分鐘\n學會新單字', sub = EN_() ? 'Free download' : '免費下載', color = 'a', app = 'LingoLeaf', look = 'phone', glyph = 'sparkles', badge = true } = {}) {
  const c = tone(color);
  const el = h('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(160deg, color-mix(in srgb, ${c} 75%, #fff) 0%, ${c} 55%, color-mix(in srgb, ${c} 70%, #000) 100%)`, fontFamily: 'var(--font-tc)', color: '#fff' } });
  el.append(h('div', { style: 'position:absolute;width:70%;aspect-ratio:1;border-radius:50%;right:-22%;top:-18%;background:rgba(255,255,255,.12)' }));
  el.append(h('div', { style: 'position:absolute;width:50%;aspect-ratio:1;border-radius:50%;left:-18%;bottom:-12%;background:rgba(0,0,0,.08)' }));
  const head = h('div', { style: 'position:absolute;left:7%;top:7%;right:7%;font:700 7.2cqw/1.25 var(--font-tc);white-space:pre-line;text-shadow:0 2px 8px rgba(0,0,0,.15)' }, headline);
  el.style.containerType = 'size';
  el.append(head);
  if (look === 'phone') {
    const ph = h('div', { style: 'position:absolute;left:50%;bottom:-8%;width:44%;height:66%;margin-left:-6%;border-radius:4.5cqw;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);border:1.4cqw solid #1b1c1f;padding:4cqw 3cqw;box-sizing:border-box;display:flex;flex-direction:column;gap:2.4cqw' });
    ph.append(h('div', { style: `height:3cqw;width:55%;border-radius:2cqw;background:${c}` }));
    ph.append(h('div', { style: `flex:none;height:30%;border-radius:2.5cqw;background:color-mix(in srgb, ${c} 20%, #fff);display:flex;align-items:center;justify-content:center;color:${c}` }, icon(glyph, { size: 40, stroke: 2.2 })));
    for (const wv of [90, 70, 80]) ph.append(h('div', { style: `height:2.4cqw;width:${wv}%;border-radius:2cqw;background:#E4E6EB` }));
    ph.append(h('div', { style: `margin-top:auto;height:7cqw;border-radius:2cqw;background:${c}` }));
    el.append(ph);
  }
  const badgeEl = h('div', { style: 'position:absolute;left:7%;bottom:8%;display:flex;align-items:center;gap:2cqw;font:700 4cqw Inter, "Noto Sans TC"' },
    h('div', { style: `width:10cqw;height:10cqw;border-radius:2.6cqw;background:#fff;color:${c};display:flex;align-items:center;justify-content:center` }, icon(glyph, { size: 26, stroke: 2.4 })),
    h('div', null, app, h('div', { style: 'font:500 3.4cqw var(--font-tc);opacity:.85' }, sub)));
  if (badge) el.append(badgeEl);
  return el;
}

/* ============================== Instagram ============================== */
const igGlyph = (size = 26) => H(`<svg width="${size}" height="${size}" viewBox="0 0 24 24"><defs><radialGradient id="igg${size}" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".05" stop-color="#fdf497"/><stop offset=".45" stop-color="#fd5949"/><stop offset=".6" stop-color="#d6249f"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs><rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#igg${size})"/><rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="16.4" cy="7.6" r="1" fill="#fff"/></svg>`);
export const ig = {
  glyph: igGlyph,
  /** Instagram home feed inside a phone body: K.ig.feed(ph.body, {stories:true}) -> {el, scroll, tabbar}. Append posts to `scroll`; tween scroll's y to fake scrolling. */
  feed(parent, { stories = true, storyNames = ['Your story', 'mia.chen', 'jay_lin', 'coffee.tw', 'yuting', 'run.club'] } = {}) {
    const el = h('div.ig', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;position:relative;background:#fff' });
    const top = h('div.ig-top', h('div.ig-word', 'Instagram', icon('chevron-down', { size: 16, stroke: 2.5 })), h('div.r', icon('heart', { size: 25, stroke: 1.9 }), icon('send', { size: 24, stroke: 1.9 })));
    const viewport = h('div', { style: 'flex:1;min-height:0;overflow:hidden;position:relative' });
    const scroll = h('div', { style: 'position:absolute;left:0;right:0;top:0' });
    if (stories) {
      const row = h('div.ig-stories');
      const cols = ['#E8A87C', '#85CDCA', '#C38D9E', '#41B3A3', '#E27D60', '#8E9AAF'];
      storyNames.forEach((n, i) => row.append(h('div.ig-story', h('div.ig-ring', { style: i === 0 ? 'background:none;padding:0' : '' }, h('div', { style: `background:${cols[i % cols.length]}` })), h('span', n))));
      scroll.append(row);
    }
    viewport.append(scroll);
    const tabbar = h('div.ig-tabbar', icon('house', { size: 26, stroke: 2.2, fill: '#000' }), icon('search', { size: 26 }), icon('square-plus', { size: 26 }), icon('clapperboard', { size: 26 }), h('div', { style: 'width:26px;height:26px;border-radius:50%;background:#C38D9E' }));
    el.append(top, viewport, tabbar);
    parent.append(el);
    return { el, scroll, tabbar, top };
  },
  /**
   * Feed post. K.ig.post({user:'lingoleaf.app', avatarColor:'#0F9D8F', sponsored:true, media: element|cssBackground, ratio:1 (or 4/5),
   *   cta:'Install now', ctaBlue:true, likes:'2,184 likes', caption:'…', moreAt:60}) -> {el, media, cta, ctaFill, actions, caption}
   */
  post({ user = 'lingoleaf.app', avatarColor = tokens.teal, sponsored = true, media, ratio = 1, cta = 'Install now', ctaBlue = true, likes = '2,184 likes', caption = EN_() ? 'Five minutes a day is enough to learn new words on your commute. Download now: a 7-day free trial and 3,000 word cards to unlock.' : '每天 5 分鐘，通勤也能把單字背起來。現在下載，免費試用 7 天，還有 3000 個常用單字卡等你解鎖。', moreAt = 46, width = 390 } = {}) {
    const el = h('div.ig-post.ig', { style: { width: width ? '100%' : '' } });
    el.append(h('div.ig-ph', avatar(user, { color: avatarColor }), h('div', { style: 'flex:1' }, h('div.ig-un', user), sponsored ? h('div.ig-sp', 'Sponsored') : null), icon('ellipsis', { size: 22 })));
    const m = h('div.ig-media', { style: { aspectRatio: String(ratio) } });
    if (media instanceof Node) m.append(media); else if (typeof media === 'string') m.style.background = media; else m.append(creative({}));
    el.append(m);
    let ctaEl = null, ctaFill = null;
    if (cta) {
      ctaFill = h('div.fill', { style: { '--k': ctaBlue ? 1 : 0 } });
      ctaEl = h('div.ig-cta', ctaFill, h('span', cta), icon('chevron-right', { size: 20, stroke: 2.4 }));
      if (ctaBlue) ctaEl.classList.add('blue');
      el.append(ctaEl);
    }
    const actions = h('div.ig-actions', icon('heart', { size: 26, stroke: 1.9 }), icon('message-circle', { size: 25, stroke: 1.9 }), icon('send', { size: 24, stroke: 1.9 }), h('div.sp'), icon('bookmark', { size: 25, stroke: 1.9 }));
    el.append(actions, h('div.ig-likes', likes));
    const short = caption.length > moreAt ? caption.slice(0, moreAt) : caption;
    const cap = h('div.ig-cap', h('b', { style: 'font-weight:600' }, user), ' ', h('span.txt', short), caption.length > moreAt ? h('span.more', '… more') : null);
    el.append(cap, h('div.ig-time', sponsored ? '' : '2 hours ago'));
    return { el, media: m, cta: ctaEl, ctaFill, actions, caption: cap };
  },
  /**
   * Full-screen Reels (or Stories) ad. Fills its parent (use inside phone({dark:true, overlayStatus:true}).screen or a 9:16 box).
   * K.ig.reel({kind:'reels'|'stories', media, user, primaryText, cta:'Install now', safeZones:false})
   *  -> {el, media, cta, ctaFill, safeTop, safeBottom}  (tween safe zones' opacity / ctaFill '--k' 0→1 for the blue CTA highlight)
   */
  reel({ kind = 'reels', media, user = 'lingoleaf.app', avatarColor = tokens.teal, primaryText = EN_() ? 'Double your vocabulary in 5-minute commutes 📚' : '通勤 5 分鐘，單字量翻倍 📚', cta = 'Install now', safeZones = false, likes = '12.4K', comments = '318', safeTop = 0.14, safeBottom = 0.20 } = {}) {
    const el = h(`div.ig-reel.${kind}`);
    const md = h('div.media');
    if (media instanceof Node) md.append(media); else if (typeof media === 'string') md.style.background = media; else md.append(creative({ look: 'phone', badge: false }));
    el.append(md, h('div.shade'));
    if (kind === 'stories') el.append(h('div.bars', h('i'), h('i'), h('i')));
    else el.append(h('div.topl', h('span', 'Reels'), icon('camera', { size: 26, stroke: 2 })));
    if (kind === 'reels') el.append(h('div.side',
      h('div', icon('heart', { size: 28, stroke: 2 }), likes), h('div', icon('message-circle', { size: 28, stroke: 2 }), comments),
      h('div', icon('send', { size: 26, stroke: 2 })), h('div', icon('ellipsis', { size: 24, stroke: 2 })), h('div.audio')));
    const ctaFill = h('div.fill', { style: { '--k': 0 } });
    const ctaEl = cta ? h('div.rcta', ctaFill, h('span', cta), icon('chevron-right', { size: 20, stroke: 2.4 })) : null;
    const acct = h('div.acct', avatar(user, { color: avatarColor, size: 30 }), h('div', null, user, h('div', { style: 'font:400 12px Inter;opacity:.85' }, 'Sponsored')), kind === 'reels' ? h('span.follow', 'Follow') : null);
    el.append(h('div.bottom', acct, primaryText ? h('div.ptext', primaryText, h('span.more', ' … more')) : null, ctaEl));
    const sTop = h('div.ig-safe.top', { style: { height: safeTop * 100 + '%', '--k': safeZones ? 1 : 0 } }, h('span', EN_() ? `Top ${Math.round(safeTop * 100)}% covered by the app UI` : `上方 ${Math.round(safeTop * 100)}% 被介面蓋住`));
    const sBot = h('div.ig-safe.bot', { style: { height: safeBottom * 100 + '%', '--k': safeZones ? 1 : 0 } }, h('span', EN_() ? `Bottom ${Math.round(safeBottom * 100)}% covered by the app UI` : `下方 ${Math.round(safeBottom * 100)}% 被介面蓋住`));
    el.append(sTop, sBot);
    return { el, media: md, cta: ctaEl, ctaFill, safeTop: sTop, safeBottom: sBot };
  },
};

/* ============================== Ads Manager ============================== */
/** Toggle switch; tween its '--k' 0→1 to switch on: tl.to(sw, {'--k':1, duration:.25}, at) */
export function toggle(on = false) { return h('span.k-switch', { style: { '--k': on ? 1 : 0 } }); }
const DELIV = { 'Active': '#2EA44F', 'Learning': '#1877F2', 'Learning limited': '#F5A524', 'Off': '#BCC0C4', 'In review': '#8D949E', 'Not delivering': '#E5484D', 'Completed': '#8D949E' };
/** Delivery status: K.am.delivery('Learning limited') */
function delivery(s, sub) {
  const d = h('span.am-deliv', h('span.d', { style: { background: DELIV[s] || '#BCC0C4' } }), h('span', null, s, sub ? h('span.sub', sub) : null));
  if (s === 'Learning limited' || s === 'Learning') d.append(icon('info', { size: 15 }));
  return d;
}
export const am = {
  delivery, toggle,
  /**
   * App shell: K.am.shell({account:'LingoLeaf Ads (2381…)', w:1640, h:920, tab:'campaigns', selected:{campaigns:1}})
   *  -> {el, body, tabs:{campaigns,adsets,ads}, toolbar, createBtn}
   */
  shell({ account = 'LingoLeaf App Ads', w = 1640, h: hh = null, tab = 'campaigns', selected = {}, title = 'Campaigns' } = {}) {
    const el = h('div.am', { style: { width: w + 'px', height: hh ? hh + 'px' : '' } });
    const meta = H('<svg width="30" height="20" viewBox="0 0 36 24"><path d="M7.5 3C3.7 3 1 8 1 13c0 4 2 7 5.2 7 3 0 5-2.6 8.3-8.3l1.6-2.7C18.3 5.5 20.6 3 24.6 3 30 3 35 8.6 35 14.5c0 3.8-2 5.5-4.6 5.5-3.3 0-5.3-3-8.3-8.2L19.6 7.9C16.9 3.5 14.2 3 12 3z" fill="none" stroke="#0866FF" stroke-width="3.2" stroke-linejoin="round"/></svg>');
    const rail = h('div.am-rail', h('div', { style: 'height:44px;display:flex;align-items:center' }, meta), ...['menu', 'gauge', 'layout-grid', 'users', 'chart-column', 'receipt', 'settings'].map((n, i) => h(`div.it${i === 2 ? '.on' : ''}`, icon(n, { size: 22 }))));
    const main = h('div.am-main');
    const top = h('div.am-top', h('div.am-title', title), h('div.am-acct', h('span.dot', account[0]), account, icon('chevron-down', { size: 16 })), h('div.sp'),
      h('div', { style: 'display:flex;align-items:center;gap:8px;color:#65676B;font:500 13px Inter' }, icon('calendar', { size: 16 }), 'Last 7 days: Oct 21 – Oct 27, 2026'), icon('bell', { size: 20, color: '#465A69' }), icon('circle-help', { size: 20, color: '#465A69' }));
    const mk = (k, ic, nm) => { const t = h(`div.am-tab${tab === k ? '.on' : ''}`, icon(ic, { size: 20 }), nm, selected[k] ? h('span.sel', `${selected[k]} selected`) : null); return t; };
    const tabs = { campaigns: mk('campaigns', 'folder', 'Campaigns'), adsets: mk('adsets', 'layout-grid', 'Ad sets'), ads: mk('ads', 'rectangle-horizontal', 'Ads') };
    const createBtn = h('span.am-btn.green', icon('plus', { size: 18, stroke: 2.5 }), 'Create');
    const toolbar = h('div.am-toolbar', createBtn, h('span.am-btn', icon('copy', { size: 16 }), 'Duplicate'), h('span.am-btn', icon('pencil', { size: 16 }), 'Edit', icon('chevron-down', { size: 14 })),
      h('span.am-btn', icon('flask-conical', { size: 16 }), 'A/B test'), h('span.am-btn', icon('ellipsis', { size: 16 })), h('div', { style: 'flex:1' }), h('span.am-btn', icon('chart-column', { size: 16 }), 'Breakdown', icon('chevron-down', { size: 14 })), h('span.am-btn', 'Columns: Performance', icon('chevron-down', { size: 14 })));
    const tablewrap = h('div.am-tablewrap');
    const body = h('div.am-body', h('div', null, h('div.am-tabs', tabs.campaigns, tabs.adsets, tabs.ads), toolbar, tablewrap));
    main.append(top, body);
    el.append(rail, main);
    return { el, body, tabs, toolbar, createBtn, tablewrap, top };
  },
  /**
   * Data table. columns: [{key, label, w (px), num:true, type:'toggle'|'name'|'delivery'}]; rows: [{key: value}] (toggle: bool, delivery: 'Active'|'Learning'|'Learning limited'|...).
   * Values may be strings, numbers (formatted with separators) or elements. K.am.table({columns, rows, footer:{name:'Results from 3 campaigns'}})
   * -> {el, rows:[tr], cell(i,key), switches:[el], highlight(i, color='amber') -> tr}
   */
  table({ columns = am.cols.adsets, rows = [], footer } = {}) {
    const el = h('table.am-table');
    const cg = h('colgroup'); columns.forEach(c => cg.append(h('col', { style: c.w ? `width:${c.w}px` : '' })));
    el.append(cg, h('thead', h('tr', columns.map(c => h(`th${c.num ? '.num' : ''}`, c.type === 'toggle' ? 'Off / On' : c.label)))));
    const tb = h('tbody'); const trs = []; const switches = [];
    const cellOf = (c, v) => {
      if (v instanceof Node) return v;
      if (c.type === 'toggle') { const s = toggle(!!v); switches.push(s); return s; }
      if (c.type === 'delivery') return v ? delivery(v) : '';
      if (c.type === 'name') return h('a', v);
      if (typeof v === 'number') return fmt(v, { prefix: c.prefix || '', suffix: c.suffix || '', decimals: c.decimals || 0 });
      return v == null ? '—' : String(v);
    };
    rows.forEach(r => { const tr = h('tr', columns.map(c => h(`td${c.num ? '.num' : ''}${c.type === 'name' ? '.name' : ''}`, cellOf(c, r[c.key])))); trs.push(tr); tb.append(tr); });
    if (footer) tb.append(h('tr.foot', columns.map(c => h(`td${c.num ? '.num' : ''}`, footer[c.key] instanceof Node ? footer[c.key] : footer[c.key] == null ? '' : typeof footer[c.key] === 'number' ? fmt(footer[c.key], { prefix: c.prefix || '', suffix: c.suffix || '', decimals: c.decimals || 0 }) : footer[c.key]))));
    el.append(tb);
    const cell = (i, key) => trs[i].children[columns.findIndex(c => c.key === key)];
    const highlight = (i, color = 'amber', k = 1) => { const tr = trs[i]; tr.classList.add('am-row-hl'); tr.style.setProperty('--hl', tone(color)); tr.style.setProperty('--k', k); return tr; };
    return { el, rows: trs, cell, switches, highlight };
  },
  cols: {
    campaigns: [{ key: 'on', type: 'toggle', w: 80 }, { key: 'name', label: 'Campaign', type: 'name', w: 300 }, { key: 'delivery', label: 'Delivery', type: 'delivery', w: 200 }, { key: 'budget', label: 'Budget', num: true, prefix: 'NT$', w: 130 }, { key: 'results', label: 'Results', num: true, w: 110 }, { key: 'cpr', label: 'Cost per result', num: true, prefix: 'NT$', decimals: 2, w: 150 }, { key: 'spent', label: 'Amount spent', num: true, prefix: 'NT$', w: 150 }],
    adsets: [{ key: 'on', type: 'toggle', w: 80 }, { key: 'name', label: 'Ad set', type: 'name', w: 280 }, { key: 'delivery', label: 'Delivery', type: 'delivery', w: 190 }, { key: 'budget', label: 'Budget', num: true, prefix: 'NT$', w: 120 }, { key: 'results', label: 'App installs', num: true, w: 130 }, { key: 'cpr', label: 'Cost per install', num: true, prefix: 'NT$', decimals: 2, w: 150 }, { key: 'ctr', label: 'CTR (all)', num: true, suffix: '%', decimals: 2, w: 110 }, { key: 'spent', label: 'Amount spent', num: true, prefix: 'NT$', w: 140 }],
  },
  /** "Create new campaign" objective picker. K.am.objectives({selected:'App promotion'}) -> {el, items:{Awareness:el,...}, select(tl, name, at)} ; item '--k' 0..1 = selected */
  objectives({ selected = null, title = 'Create new campaign' } = {}) {
    const OBJ = [['Awareness', 'megaphone', 'Show your ads to people who are most likely to remember them.'], ['Traffic', 'mouse-pointer-click', 'Send people to a destination, like your website or app.'],
      ['Engagement', 'messages-square', 'Get more messages, video views, post engagement or event responses.'], ['Leads', 'filter', 'Collect leads for your business or brand.'],
      ['App promotion', 'smartphone', 'Find new people to install your app and continue using it.'], ['Sales', 'shopping-bag', 'Find people likely to purchase your product or service.']];
    const el = h('div.am-modal');
    el.append(h('div.am-mh', title, icon('x', { size: 22, color: '#65676B' })));
    const lst = h('div.lst', h('div.lbl', 'Buying type'), h('div.am-input.buy', 'Auction', icon('chevron-down', { size: 16 })), h('div.lbl', 'Choose a campaign objective'));
    const items = {}; const descs = {};
    const desc = h('div.am-desc');
    for (const [nm, ic, d] of OBJ) {
      const it = h('div.am-obj', { style: { '--k': nm === selected ? 1 : 0 } }, h('span.am-radio'), h('span.ic', icon(ic, { size: 19 })), h('span.nm', nm));
      items[nm] = it; descs[nm] = d; lst.append(it);
    }
    const sel = selected || 'App promotion';
    const dIcon = OBJ.find(o => o[0] === sel)[1];
    desc.append(h('div.hero', icon(dIcon, { size: 56, stroke: 1.6 })), h('h4', sel), h('p', descs[sel]), h('div.gd', 'Good for:'), h('ul', ...(sel === 'App promotion' ? ['App installs', 'App events', 'Mobile app engagement'] : ['Reach', 'Brand awareness', 'Video views']).map(x => h('li', x))));
    el.append(h('div.am-mb', lst, desc), h('div.am-mf', h('span.am-btn', 'Cancel'), h('span.am-btn.primary', 'Continue')));
    const select = (tl, name, at, prev) => { if (prev) tl.to(items[prev], { '--k': 0, duration: 0.2 }, at); tl.to(items[name], { '--k': 1, duration: 0.25 }, at); };
    return { el, items, desc, select };
  },
  /**
   * Settings panel (campaign / ad set editor style).
   * K.am.panel({w:640, sections:[{title:'Budget & schedule', icon:'wallet', rows:[
   *   {label:'Advantage campaign budget', sub:'Distribute budget across ad sets', toggle:true},
   *   {label:'Daily budget', input:'NT$215'}, {label:'Optimization for ad delivery', select:'App installs'}, {label:'Advantage+ audience', value:'On', adv:true}]}]})
   *  -> {el, rows:{label: rowEl}, switches:{label: switchEl}, inputs:{label: valueEl}}
   */
  panel({ w = 640, sections = [] } = {}) {
    const el = h('div.am-panel', { style: { width: w + 'px' } });
    const rows = {}, switches = {}, inputs = {};
    for (const s of sections) {
      const sec = h('div.am-sec', h('h3', s.icon ? icon(s.icon, { size: 20 }) : null, s.title));
      for (const r of s.rows || []) {
        const right = [];
        if (r.adv) right.push(h('span.am-adv', icon('sparkles', { size: 14 }), 'Advantage+'));
        if (r.input != null) { const v = h('span.v', r.input); inputs[r.label] = v; right.push(h('div.am-input', v, r.suffix ? h('span', { style: 'color:#65676B' }, r.suffix) : null)); }
        if (r.select != null) { const v = h('span.v', r.select); inputs[r.label] = v; right.push(h('div.am-input', v, icon('chevron-down', { size: 16 }))); }
        if (r.value != null) { const v = h('span.v', { style: 'font-weight:600' }, r.value); inputs[r.label] = v; right.push(v); }
        if (r.toggle != null) { const sw = toggle(!!r.toggle); switches[r.label] = sw; right.push(sw); }
        const row = h('div.am-row', h('div.l', h('b', r.label), r.sub ? h('span', r.sub) : null), ...right);
        rows[r.label] = row; sec.append(row);
      }
      el.append(sec);
    }
    return { el, rows, switches, inputs };
  },
};

/* ============================== annotations ============================== */
/** Callout label: K.callout('沒設定轉換事件', {sub:'系統不知道誰裝了 App', tone:'red', icon:'triangle-alert', solid:false, pill:false}) */
export function callout(text, { sub, tone: tn = 'red', icon: ic, solid = false, pill = false, size = 1 } = {}) {
  const el = h(`div.k-callout${solid ? '.solid' : ''}${pill ? '.pill' : ''}`, { style: { '--c': tone(tn), fontSize: '', transform: '' } });
  if (ic) el.append(icon(ic, { size: (sub ? 34 : 28), stroke: 2.4 }));
  el.append(h('div', null, h('div.t', text), sub ? h('div.s', sub) : null));
  if (size !== 1) el.style.zoom = size;
  return el;
}

let maskSeq = 0;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
function anchorPt(r, side) {
  switch (side) { case 'left': return [r.x, r.cy, -1, 0]; case 'right': return [r.r, r.cy, 1, 0]; case 'top': return [r.cx, r.y, 0, -1]; case 'bottom': return [r.cx, r.b, 0, 1]; default: return [r.cx, r.cy, 0, 0]; }
}
/**
 * Curved connector in world space between two elements/points.
 * K.connector(S.world, {from: el|{x,y}, to: el|{x,y}, fromSide:'auto'|'right'|..., toSide, color:'#A8ABB0', width:3, dashed:false, arrow:false, dot:true, bend:0.5, progress:1, over:false, gap:8 (px kept free at element edges)})
 *  -> {el, path, progress (tweenable 0..1), len, pointAt(k)->{x,y,angle}}
 *  Draw-on: const c = K.connector(W, {..., progress:0}); tl.to(c, {progress:1, duration:.8}, at)
 */
export function connector(world, { from, to, fromSide = 'auto', toSide = 'auto', color = '#A8ABB0', width = 3, dashed = false, arrow = false, dot = true, bend = 0.5, progress = 1, over = false, gap = 8 } = {}) {
  const c = tone(color);
  const g = svgEl('g');
  const path = svgEl('path', { fill: 'none', stroke: c, 'stroke-width': width, 'stroke-linecap': 'round' });
  if (dashed) path.setAttribute('stroke-dasharray', `${width * 3} ${width * 2.6}`);
  const head = svgEl('path', { d: `M0 0 L${-width * 4} ${-width * 2.6} L${-width * 4} ${width * 2.6} Z`, fill: c });
  const d0 = svgEl('circle', { r: width * 1.8, fill: c }), d1 = svgEl('circle', { r: width * 1.8, fill: c });
  let mask = null, mpath = null;
  if (dashed) {
    const id = 'km' + (++maskSeq);
    mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: world.w, height: world.h });
    mpath = svgEl('path', { fill: 'none', stroke: '#fff', 'stroke-width': width + 4, 'stroke-linecap': 'round' });
    mask.append(mpath); g.append(mask); path.setAttribute('mask', `url(#${id})`);
  }
  g.append(path); if (dot) g.append(d0); if (arrow) g.append(head); if (dot && !arrow) g.append(d1);
  (over ? world.over : world.under).append(g);
  const api = {
    el: g, path, len: 0, _p: progress,  // NB: never name a field `length` (GSAP would treat the object as an array)
    get progress() { return this._p; },
    set progress(k) { this._p = k; this._draw(); },
    _draw() {
      if (!this.len) return;
      const L = this.len, k = clamp(this._p);
      const tgt = mpath || path;
      tgt.setAttribute('stroke-dasharray', `${L * k} ${L + 10}`);
      g.style.opacity = k <= 0.001 ? 0 : 1;
      const p = this.pointAt(k);
      if (arrow) head.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.angle})`);
      d1.setAttribute('cx', p.x); d1.setAttribute('cy', p.y); d1.style.opacity = k > 0.98 ? 1 : 0;
    },
    pointAt(k) { const L = this.len * clamp(k); const a = path.getPointAtLength(L), b = path.getPointAtLength(Math.max(0, L - 2)); const a2 = L < 2 ? path.getPointAtLength(2) : a; const ang = Math.atan2(a2.y - b.y, a2.x - b.x) * 180 / Math.PI; return { x: a.x, y: a.y, angle: ang }; },
    resolve() {
      const A = world.rect(from), B = world.rect(to);
      let fs = fromSide, ts = toSide;
      const dx = B.cx - A.cx, dy = B.cy - A.cy;
      const horiz = Math.abs(dx) > Math.abs(dy);
      if (fs === 'auto') fs = (from instanceof Node || from.el) ? (horiz ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top')) : 'center';
      if (ts === 'auto') ts = (to instanceof Node || to.el) ? (horiz ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'top' : 'bottom')) : 'center';
      let [x0, y0, nx0, ny0] = anchorPt(A, fs), [x1, y1, nx1, ny1] = anchorPt(B, ts);
      x0 += nx0 * gap; y0 += ny0 * gap; x1 += nx1 * gap; y1 += ny1 * gap;
      const dist = Math.hypot(x1 - x0, y1 - y0) * bend;
      const d = `M${x0} ${y0} C${x0 + nx0 * dist} ${y0 + ny0 * dist} ${x1 + nx1 * dist} ${y1 + ny1 * dist} ${x1} ${y1}`;
      path.setAttribute('d', d); if (mpath) mpath.setAttribute('d', d);
      d0.setAttribute('cx', x0); d0.setAttribute('cy', y0);
      this.len = path.getTotalLength();
      this._draw();
    },
  };
  onLayout(() => api.resolve());
  return api;
}

/** Highlight ring around a (placed or nested) element, in world space. K.highlight(S.world, el, {pad:10, color:'red', radius:16}) -> el (tween opacity / scale) */
export function highlight(world, target, { pad = 10, color = 'red', radius = 16, width = 4 } = {}) {
  const el = h('div.k-hl', { style: { '--c': tone(color), borderRadius: radius + 'px', borderWidth: width + 'px', zIndex: 25 } });
  world.el.append(el);
  onLayout(() => { const r = world.rect(target); Object.assign(el.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + 2 * pad + 'px', height: r.h + 2 * pad + 'px' }); });
  return el;
}

/**
 * Mouse cursor in world space. const cur = K.cursor(S.world, {x, y});
 *   cur.moveTo(tl, target(el|{x,y}), at, dur = .8, {dx, dy})   cur.click(tl, at)   (tween cur.el opacity to show/hide)
 */
export function cursor(world, { x = 0, y = 0, scale = 1 } = {}) {
  const el = h('div.k-cursor');
  const ripple = h('div.k-ripple');
  el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.3-4.1 2.9 6.6 3-1.3-2.9-6.5h6z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  el.prepend(ripple);
  world.el.append(el);
  gsap.set(el, { x, y, scale, zIndex: 60 });
  const svg = el.querySelector('svg');
  return {
    el, ripple,
    moveTo(tl, target, at, dur = 0.8, { dx = 0, dy = 0 } = {}) {
      tl.to(el, { x: () => world.rect(target).cx + dx, y: () => world.rect(target).cy + dy, duration: dur, ease: 'power2.inOut' }, at);
      return this;
    },
    click(tl, at) {
      tl.fromTo(ripple, { scale: 0.2, opacity: 0.9 }, { scale: 1.3, opacity: 0, duration: 0.5, ease: 'power1.out', immediateRender: false }, at);
      tl.to(svg, { scale: 0.85, duration: 0.08, transformOrigin: '20% 10%', yoyo: true, repeat: 1 }, at);
      return this;
    },
  };
}

/** Tweenable number: const c = K.counter({value:0, prefix:'NT$', suffix:'', decimals:0}); tl.to(c, {value:12000, duration:1.5}, at) -> c.el */
export function counter({ value = 0, prefix = '', suffix = '', decimals = 0, style } = {}) {
  const el = h('span.k-counter', { style });
  const api = { el, _v: value, get value() { return this._v; }, set value(v) { this._v = v; el.textContent = fmt(decimals ? v : Math.round(v), { prefix, suffix, decimals }); } };
  api.value = value;
  return api;
}

/* ============================== screen chrome ============================== */
/**
 * Top chapter indicator (screen space). K.chapterBar(S.screen, {lesson:'第 3 課', chapters:[{name:'競價怎麼決定', start:0}, {name:'...', start:22}], duration})
 *  -> {el, update(t)}  (K.render(tl, cam, bar) calls update). Hide it during the title card by tweening el opacity.
 */
export function chapterBar(parent, { lesson, chapters = [], duration = 60 } = {}) {
  const el = h('div.k-chapters');
  if (lesson) el.append(h('div.lesson', lesson));
  const segs = h('div.segs'); el.append(segs);
  const knob = h('div.knob');
  const items = chapters.map((c, i) => {
    const fill = h('i');
    const bar = h('div.bar', fill);
    const seg = h('div.seg', { style: { flex: String(Math.max(0.6, ((chapters[i + 1]?.start ?? duration) - c.start) / duration * chapters.length)) } }, bar, h('div.nm', c.name));
    segs.append(seg);
    return { seg, fill, bar, start: c.start, end: chapters[i + 1]?.start ?? duration };
  });
  parent.append(el);
  return {
    el, items,
    update(t) {
      items.forEach(it => {
        const k = prog(t, it.start, it.end);
        it.fill.style.width = (k * 100).toFixed(2) + '%';
        const cur = t >= it.start && t < it.end;
        it.seg.classList.toggle('cur', cur); it.seg.classList.toggle('done', t >= it.end);
        if (cur && knob.parentNode !== it.bar) it.bar.append(knob);
        if (cur) knob.style.left = (k * 100).toFixed(2) + '%';
      });
    },
  };
}
/** Opening title (screen space, full-bleed). K.titleCard(S.screen, {lesson:'第 3 課', title:'...', question:'...'}) -> {el, hide(tl, at)} */
export function titleCard(parent, { lesson = EN_() ? 'Lesson 1' : '第 1 課', title = '', question = '', deco } = {}) {
  const el = h('div.k-title', h('div.no', lesson), h('h1', title), question ? h('div.q', h('div.qm', '?'), h('div', question)) : null, deco ? h('div.deco', deco) : null);
  parent.append(el);
  const parts = [...el.children];
  return {
    el, parts,
    intro(tl, at = 0.2) { tl.from(parts, { opacity: 0, y: 30, duration: 0.7, stagger: 0.25, ease: 'power2.out' }, at); return this; },
    hide(tl, at, dur = 0.6) { tl.to(el, { opacity: 0, duration: dur, ease: 'power1.inOut' }, at); tl.set(el, { display: 'none' }, at + dur); return this; },
  };
}
/** Closing recap sheet (note-paper look). K.recap(S.screen, {title:'重點回顧', points:['...', '...']}) -> {el, points, show(tl, at, gap=1.2)} ; use **bold** for marker highlight */
export function recap(parent, { title = EN_() ? 'Recap' : '重點回顧', points = [], colors = ['#E5484D', '#0F9D8F', '#F2780C', '#1877F2'] } = {}) {
  const dim = h('div.k-recap-dim');
  const el = h('div.k-recap', h('h2', { html: `<u>${title}</u>` }));
  const pts = points.map((p, i) => { const r = h('div.pt', { style: { '--c': colors[i % colors.length] } }, h('div.n', String(i + 1)), h('div', { html: p.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') })); el.append(r); return r; });
  parent.append(dim, el);
  gsap.set([el, dim], { opacity: 0 });
  return {
    el, dim, points: pts,
    show(tl, at, gap = 1.2) { tl.to(dim, { opacity: 1, duration: 0.5 }, at); tl.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, at); pts.forEach((p, i) => tl.from(p, { opacity: 0, x: -24, duration: 0.5 }, at + 0.5 + i * gap)); return this; },
  };
}

/* ============================== Priority 2 ============================== */
/** Google Play listing inside a phone body. K.playStore(ph.body, {name, dev, color:'a', rating:'4.6', reviews:'12K reviews', downloads:'500K+', shots:['a','b',...]}) -> {el, install} */
export function playStore(parent, { name = EN_() ? 'LingoLeaf: Vocabulary' : 'LingoLeaf: 英文單字', dev = 'LingoLeaf Inc.', color = 'a', glyph = 'sparkles', rating = '4.6', reviews = '12K reviews', downloads = '500K+', age = 'Rated for 3+', shots = ['a', 'b', 'a', 'b'], about = EN_() ? 'Five-minute word practice every day, with spaced repetition so new words stick.' : '每天 5 分鐘的單字練習，搭配間隔重複，讓你通勤時間也能穩定進步。' } = {}) {
  const c = tone(color);
  const el = h('div.gp');
  el.append(h('div.gp-top', icon('arrow-left', { size: 24 }), h('div.sp'), icon('search', { size: 22 }), icon('ellipsis-vertical', { size: 22 })));
  el.append(h('div.gp-hd', h('div.gp-ic', { style: { background: `linear-gradient(140deg, color-mix(in srgb, ${c} 70%, #fff), ${c})` } }, icon(glyph, { size: 40, stroke: 2.2 })), h('div', null, h('div.gp-nm', name), h('div.gp-dev', dev), h('div.gp-iap', 'Contains ads · In-app purchases'))));
  el.append(h('div.gp-stats', h('div', h('span', null, rating, ' ★'), h('small', reviews)), h('div', h('span', downloads), h('small', 'Downloads')), h('div', h('span', h('span', { style: 'border:1.5px solid #333;border-radius:3px;font-size:10px;padding:0 3px' }, '3+')), h('small', age))));
  const install = h('div.gp-install', 'Install');
  el.append(install);
  const sh = h('div.gp-shots');
  shots.forEach((s, i) => { const box = h('div', { style: { position: 'relative', overflow: 'hidden' } }); box.append(creative({ color: s, headline: (EN_() ? ['5 minutes\na day', 'Learn on\nthe go', 'Daily\nchallenge', 'See your\nprogress'] : ['5 分鐘\n背單字', '通勤\n也能學', '每日\n挑戰', '進度\n看得見'])[i % 4], look: 'phone' })); sh.append(box); });
  const bars = h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:5px' }, ...[78, 12, 5, 2, 3].map((v, i) => h('div', { style: 'display:flex;align-items:center;gap:8px;font:500 11px Inter;color:#5F6368' }, String(5 - i), h('div', { style: 'flex:1;height:8px;border-radius:4px;background:#E8EAED;overflow:hidden' }, h('div', { style: `width:${v}%;height:100%;background:#0B57D0;border-radius:4px` })))));
  const ratings = h('div.gp-about', h('b', null, 'Ratings and reviews', icon('arrow-left', { size: 18, style: { transform: 'rotate(180deg)' } })),
    h('div', { style: 'display:flex;gap:18px;align-items:center;margin-top:10px' }, h('div', { style: 'text-align:center' }, h('div', { style: 'font:400 44px/1 Inter' }, rating), h('div', { style: 'color:#0B57D0;font-size:13px;letter-spacing:1px;margin-top:4px' }, '★★★★★'), h('div', { style: 'font-size:11px;color:#5F6368;margin-top:2px' }, reviews.replace(' reviews', ''))), bars));
  el.append(sh, h('div.gp-about', h('b', null, 'About this app', icon('arrow-left', { size: 18, style: { transform: 'rotate(180deg)' } })), h('p', about)), ratings);
  parent.append(el);
  return { el, install };
}
/** Bar chart. K.barChart({w:720, h:380, data:[{label:'Concept A', value:132, color:'a'}], max, format:{prefix:'NT$'}, grid:4}) -> {el, bars, values, grow(tl, at, dur, stagger)}; bars start full; ch.grow(tl, at) animates them up from 0 */
export function barChart({ w = 720, h: hh = 380, data = [], max, format = {}, grid = 4, barW = 0.55 } = {}) {
  const el = h('div.k-chart', { style: { width: w + 'px', height: hh + 'px' } });
  const M = max || Math.max(...data.map(d => d.value)) * 1.15;
  for (let i = 0; i <= grid; i++) { const y = hh - (i / grid) * hh; el.append(h(i ? 'div.gl' : 'div.ax', { style: { top: y + 'px' } }), h('div.yl', { style: { top: y + 'px' } }, fmt(M * i / grid, format))); }
  const slot = w / data.length;
  const bars = [], values = [];
  data.forEach((d, i) => {
    const bh = d.value / M * hh, x = slot * i + slot * (1 - barW) / 2;
    const b = h('div.bar', { style: { left: x + 'px', width: slot * barW + 'px', height: bh + 'px', background: tone(d.color || 'blue'), '--k': 1 } });
    const v = h('div.bv', { style: { left: x + slot * barW / 2 + 'px', top: hh - bh - 8 + 'px', '--k': 1 } }, fmt(d.value, format));
    el.append(b, v, h('div.xl', { style: { left: x + slot * barW / 2 + 'px' } }, d.label));
    bars.push(b); values.push(v);
  });
  /** grow bars from 0 (uses fromTo: GSAP from() does not work on CSS variables) */
  const grow = (tl, at, dur = 0.8, stagger = 0.2) => { tl.fromTo(bars, { '--k': 0 }, { '--k': 1, duration: dur, stagger, ease: 'power2.out', immediateRender: true }, at); tl.fromTo(values, { '--k': 0 }, { '--k': 1, duration: 0.3, stagger, immediateRender: true }, at + dur * 0.7); };
  return { el, bars, values, grow };
}
/** Funnel. K.funnel({w:760, stages:[{label:'看到廣告', value:100000, color:'#1877F2'}, ...]}) -> {el, stages:[el]} (widths shrink with value, min 32%) */
export function funnel({ w = 760, stages = [], format = {} } = {}) {
  const el = h('div.k-funnel');
  const max = Math.max(...stages.map(s => s.value), 1), min = Math.max(1, Math.min(...stages.map(s => s.value)));
  const els = stages.map((s, i) => { const k = max === min ? 1 : 0.42 + 0.58 * Math.log(Math.max(1, s.value) / min) / Math.log(max / min); const st = h('div.st', { style: { width: w * k + 'px', background: tone(s.color || 'blue'), opacity: 1 - i * 0.06 } }, h('b', s.label), h('span', s.text || fmt(s.value, format))); el.append(st); return st; });
  return { el, stages: els };
}
/**
 * Crowd of person dots on a grid (world element). K.crowd({n:120, cols:15, size:22, gap:10, seed:3, color:'#B0B3B8'}) -> {el, dots:[el], pick(frac, seed) -> [el]}
 * Animate with GSAP: tl.to(cr.pick(.6), {y:300, opacity:0, stagger:{each:.01, from:'random'}}) — note: use seeded pick, not GSAP 'random'.
 */
export function crowd({ n = 100, cols = 10, size = 22, gap = 10, color = '#B0B3B8', person = true } = {}) {
  const rows = Math.ceil(n / cols);
  const el = h('div.k-crowd', { style: { width: cols * (size + gap) - gap + 'px', height: rows * (size * (person ? 1.5 : 1) + gap) - gap + 'px' } });
  const dots = [];
  for (let i = 0; i < n; i++) {
    const x = (i % cols) * (size + gap), y = Math.floor(i / cols) * (size * (person ? 1.5 : 1) + gap);
    const d = person ? h('div.k-dot', { style: { left: x + 'px', top: y + 'px', width: size + 'px', height: size * 1.5 + 'px', borderRadius: 0, background: 'none' } },
      h('div', { style: `width:${size * 0.55}px;height:${size * 0.55}px;border-radius:50%;background:${color};margin:0 auto` }),
      h('div', { style: `width:${size}px;height:${size * 0.8}px;border-radius:${size / 2}px ${size / 2}px ${size * 0.15}px ${size * 0.15}px;background:${color};margin-top:${size * 0.1}px` }))
      : h('div.k-dot', { style: { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', background: color } });
    el.append(d); dots.push(d);
  }
  const pick = (frac, seed = 1) => { const r = rng(seed); return dots.map(d => [r(), d]).sort((a, b) => a[0] - b[0]).slice(0, Math.round(dots.length * frac)).map(x => x[1]); };
  const paint = (els, c) => els.forEach(d => d.querySelectorAll('div').forEach(p => p.style.background = tone(c)));
  return { el, dots, pick, paint };
}
/**
 * Coins flowing along a connector (budget → ad set). const f = K.coinFlow(S.world, conn, {n:6, start:3, dur:2.5, spacing:.35, label:'$'}) ; add f to K.render(...).
 */
export function coinFlow(world, conn, { n = 6, start = 0, dur = 2, spacing = 0.3, label = '$', size = 1 } = {}) {
  const coins = Array.from({ length: n }, () => { const c = h('div.k-coin', label); c.style.zIndex = 35; c.style.opacity = 0; c.style.transform = `scale(${size})`; world.el.append(c); return c; });
  return {
    coins,
    update(t) {
      if (!conn.len) return;
      coins.forEach((c, i) => {
        const k = (t - start - i * spacing) / dur;
        if (k <= 0 || k >= 1) { c.style.opacity = 0; return; }
        const p = conn.pointAt(ease.inOut(k));
        c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
        c.style.opacity = String(Math.min(1, k * 8, (1 - k) * 8));
      });
    },
  };
}
