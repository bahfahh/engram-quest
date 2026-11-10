// Azure UI kit — the real Microsoft Foundry (new portal) and Azure portal screens, redrawn from Microsoft Learn so the
// learner recognises them later; shared by all five lessons of the azure-ai-2026 series. Doc: lib/azure/AZURE.md.
//
//   <link rel="stylesheet" href="/lib/kit/kit.css"><link rel="stylesheet" href="/lib/house/house.css"><link rel="stylesheet" href="/lib/azure/azure.css">
//   import * as AZ from '/lib/azure/azure.js';
//   await AZ.init();                                            // icons (lucide) — before building
//   const f = AZ.foundryFrame({ section: 'Build', nav: 'Models', title: 'Models' });
//   f.page.append(AZ.dropdown({ label: 'Deployment type', value: 'Global Standard', open: true, options: AZ.DEPLOYMENT_TYPES }).el);
//   window.studioReady = AZ.ready();                            // last: fonts for every glyph on the page (+ kit layout)
//
// Two looks: the REAL screen keeps Fluent 2 light (azure.css, az-*); what WE draw on top uses the house grammar
// (makeUI from lib/house/ui.js on frame.overlay, statusChip, magnifier, cursor, focus): cyan = system / now,
// amber = the student's, magenta = warning / broken, grey = not yet / preview.
// Every builder returns plain DOM (no timers); animation is the page's job, a pure function of t (set / reveal / update).
import * as K from '/lib/kit/kit.js';
import { textsOf } from '/lib/stage.js';
import { PORTAL_ICONS } from './portal.js';

export { K };
const ICONS = ['bot', 'box', 'layers', 'wrench', 'book-open', 'brain', 'shield', 'database', 'clipboard-check', 'sliders-horizontal', 'layout-dashboard', 'boxes',
  'shield-check', 'gauge', 'network', 'info', 'layout-grid', 'search', 'triangle-alert', 'activity', 'bell', 'chart-line', 'file-text', 'notebook', 'settings',
  'circle-help', 'user', 'house', 'compass', 'play', 'refresh-cw', 'chevron-down', 'chevron-right', 'check', 'x', 'circle-x', 'circle-check', 'star', 'ellipsis',
  'sparkles', 'send', 'message-square', 'list-tree', 'clock', 'coins', 'plus', 'copy', 'filter', 'download', 'circle-alert', 'zap', 'waypoints', 'folder', 'save',
  'external-link', 'pencil', 'trash-2'];
/** Load the icon set (call once, before building). */
export async function init(extra = []) { await K.init([...ICONS, ...PORTAL_ICONS, ...extra]); }
/** Call last (window.studioReady = AZ.ready()): loads the glyphs of every text on the page in every weight the kit uses, then kit layout. */
export async function ready() {
  const text = document.body.innerText + document.body.textContent;
  const jobs = [];
  for (const w of ['400', '500', '600', '700', '800']) { jobs.push(document.fonts.load(`${w} 32px Inter`, text).catch(() => {})); jobs.push(document.fonts.load(`${w} 32px "Noto Sans TC"`, text).catch(() => {})); }
  for (const w of ['400', '500', '700']) jobs.push(document.fonts.load(`${w} 32px "JetBrains Mono"`, text).catch(() => {}));
  await Promise.all(jobs); await K.ready(); await document.fonts.ready;
}

// ------------------------------------------------------------------------------------------------ small helpers
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ic = (n, s = 24) => K.icon(n, { size: s }).outerHTML;
const rd = id => (id ? ` data-read="${esc(id)}"` : '');
const node = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const find = (root, sel, txt) => [...root.querySelectorAll(sel)].find(e => e.dataset.name === txt || e.textContent.trim() === txt);
const vis = (el, a) => { a = clamp(a); el.style.opacity = a.toFixed(3); el.style.visibility = a < 0.01 ? 'hidden' : 'visible'; return a; };
export const util = { esc, clamp, lerp, vis, prog: (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a)), sm: k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; } };

/** Box of an element in the coordinate space of `root` (unscaled root px; works inside a zoomed camera world or a scaled studio screen). */
export function box(el, root) {
  if (el && !(el instanceof Element) && el.el) el = el.el;          // accept a component ({el, …}, e.g. azureFrame()) as well as its element
  if (root && !(root instanceof Element) && root.el) root = root.el;
  const b = el.getBoundingClientRect(), r = root.getBoundingClientRect(), s = r.width / (root.offsetWidth || r.width || 1);
  return { x0: (b.left - r.left) / s, y0: (b.top - r.top) / s, x1: (b.right - r.left) / s, y1: (b.bottom - r.top) / s, get cx() { return (this.x0 + this.x1) / 2; }, get cy() { return (this.y0 + this.y1) / 2; } };
}
/** Readable blocks for readcheck: every [data-read] under root (default: the whole page). window.TEXTS = () => AZ.texts(); */
export const texts = (root = document) => textsOf('[data-read]', root);
/** Mark an element as text the viewer must read (readcheck). */
export const read = (el, id) => { el.dataset.read = id; return el; };

// ------------------------------------------------------------------------------------------------ names (research A §3, B §4, C §2)
export const FOUNDRY_SECTIONS = ['Home', 'Discover', 'Build', 'Operate', 'Manage', 'Docs'];
export const FOUNDRY_NAV = {
  Home: [],
  Discover: [{ items: [['Overview', 'layout-grid'], ['Models', 'box'], ['Tools', 'wrench']] }],
  Build: [{ g: 'Create', items: [['Agents', 'bot'], ['Models', 'box'], ['Services', 'layers'], ['Tools', 'wrench'], ['Knowledge', 'book-open'], ['Memory', 'brain'], ['Guardrails', 'shield'], ['Data', 'database']] },
    { g: 'Optimize', items: [['Evaluations', 'clipboard-check'], ['Fine-tune', 'sliders-horizontal']] }],
  Operate: [{ items: [['Overview', 'layout-dashboard'], ['Assets', 'boxes'], ['Compliance', 'shield-check']] }],
  Manage: [{ items: [['Quota', 'gauge'], ['AI Gateway', 'network'], ['Project details', 'info']] }],
  Docs: [],
};
export const AGENT_TABS = ['Playground', 'Traces', 'Monitor'];
export const DEPLOYMENT_TYPES = ['Global Standard', 'Data Zone Standard', 'Standard', 'Global Provisioned Throughput', 'Global Batch', 'Data Zone Batch'];
/** Application Insights resource menu (Azure portal). Items: [label, icon]. */
export const APPINSIGHTS_MENU = [
  { items: [['Overview', 'layout-grid'], ['Activity log', 'list-tree']] },
  { g: 'Investigate', items: [['Agents (Preview)', 'bot'], ['Search', 'search'], ['Failures', 'triangle-alert'], ['Performance', 'activity'], ['Application map', 'waypoints']] },
  { g: 'Monitoring', items: [['Alerts', 'bell'], ['Metrics', 'chart-line'], ['Logs', 'file-text'], ['Workbooks', 'notebook'], ['Dashboards with Grafana', 'layout-dashboard']] },
  { g: 'Settings', items: [['Diagnostic settings', 'settings']] },
];
/** Foundry resource (Azure portal view of cram-ai) menu. */
export const FOUNDRY_RESOURCE_MENU = [
  { items: [['Overview', 'layout-grid'], ['Activity log', 'list-tree'], ['Access control (IAM)', 'user']] },
  { g: 'Resource Management', items: [['Keys and Endpoint', 'shield'], ['Networking', 'network']] },
  { g: 'Monitoring', items: [['Alerts', 'bell'], ['Metrics', 'chart-line'], ['Diagnostic settings', 'settings'], ['Logs', 'file-text']] },
];
/** Corner footnote. Default since experiment 21 (2026-11-09): 「介面依 Microsoft Learn 與入口網站重繪，2026-11」; FOOTNOTE_LEARN = the azure-ai-2026 text
 *  (pass it as `text` to keep an old page's footnote unchanged: AZ.footnote(parent, { text: AZ.FOOTNOTE_LEARN })). */
export const FOOTNOTE_LEARN = '介面依 Microsoft Learn 重繪，2026-11';
export const FOOTNOTE = '介面依 Microsoft Learn 與入口網站重繪，2026-11';

// ================================================================================================ frames
/**
 * Microsoft Foundry (new portal) shell.
 * o: {w, h, project, section ('Home'|'Discover'|'Build'|'Operate'|'Manage'), nav (active left-pane item), newFoundry (true),
 *     crumbs (string, e.g. 'Agents / grader'), title, chip ('GA'|'Preview'|…), tabs (array, e.g. AZ.AGENT_TABS), tab, user (initials), read (data-read id prefix)}
 * → {el, top, navEl, main, page (append your content), overlay (for house UI), item(name), section(name), tab(name), setNav(name), setTab(name)}
 */
export function foundryFrame({ w = 1920, h = 1080, project = 'cram-ai / grading-prod', section = 'Build', nav = null, newFoundry = true, crumbs = '', title = '', chip = null, tabs = null, tab = null, user = 'YW', read: rid = 'fd' } = {}) {
  const groups = FOUNDRY_NAV[section] || [];
  const el = node(`<div class="az az-fd" style="width:${w}px;height:${h}px">
    <div class="az-fd-top">
      <span class="az-wordmark">Microsoft Foundry</span><span class="az-crumbsep">/</span>
      <span class="az-picker">${ic('folder', 22)}<span${rd(rid + '-project')}>${esc(project)}</span>${ic('chevron-down', 20)}</span>
      <span class="az-newtoggle"><span class="az-switch ${newFoundry ? 'is-on' : ''}"><i></i></span><span>New Foundry</span></span>
      <div class="az-fd-sections">${FOUNDRY_SECTIONS.map(s => `<span class="az-fd-sec ${s === section ? 'is-on' : ''}" data-name="${s}">${s}</span>`).join('')}</div>
      <div class="az-topicons">${ic('search', 26)}${ic('settings', 26)}${ic('circle-help', 26)}<span class="az-avatar">${esc(user)}</span></div>
    </div>
    <div class="az-fd-body">
      ${groups.length ? `<div class="az-nav">${groups.map(g => `${g.g ? `<div class="az-nav-g">${g.g}</div>` : ''}${g.items.map(([n, i]) => `<div class="az-nav-i ${n === nav ? 'is-on' : ''}" data-name="${n}">${ic(i, 24)}<span>${n}</span></div>`).join('')}`).join('')}</div>` : ''}
      <div class="az-main">
        ${crumbs ? `<div class="az-crumbs">${crumbs.split(' / ').map((c, i, a) => i < a.length - 1 ? `<b>${esc(c)}</b> / ` : esc(c)).join('')}</div>` : ''}
        ${title ? `<div class="az-pagehead"><span class="az-h1"${rd(rid + '-title')}>${esc(title)}</span></div>` : ''}
        ${tabs ? `<div class="az-tabs az-pagetabs">${tabs.map(t => `<span class="az-tab ${t === tab ? 'is-on' : ''}" data-name="${t}">${t}</span>`).join('')}</div>` : ''}
        <div class="az-page" style="position:relative;margin-top:${tabs ? 22 : 8}px"></div>
      </div>
    </div></div>`);
  if (chip) el.querySelector('.az-pagehead').append(statusChip(chip, { read: rid + '-chip' }));
  const overlay = node(`<div class="az-over" style="width:${w}px;height:${h}px"></div>`); el.append(overlay);
  const api = {
    el, overlay, top: el.querySelector('.az-fd-top'), navEl: el.querySelector('.az-nav'), main: el.querySelector('.az-main'), page: el.querySelector('.az-page'),
    item: n => find(el, '.az-nav-i', n), section: n => find(el, '.az-fd-sec', n), tab: n => find(el, '.az-pagetabs .az-tab', n),
    setNav(n) { el.querySelectorAll('.az-nav-i').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); return api; },
    setTab(n) { el.querySelectorAll('.az-pagetabs .az-tab').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); return api; },
  };
  return api;
}

/**
 * Azure portal blade (portal.azure.com) for one resource.
 * o: {w, h, resource, type, page (blade title after the |), crumbs (array), menu (AZ.APPINSIGHTS_MENU), active (menu item),
 *     cmds ([[icon, label], …] command bar), icon, iconBg, light (light top bar instead of the default dark one), search, user, chip}
 * → {el, top, menuEl, cmdbar, content (append your content), overlay, item(name), cmd(label), setActive(name)}
 */
export function azureFrame({ w = 1920, h = 1080, resource = 'cram-ai-insights', type = 'Application Insights', page = '', crumbs = ['Home'], menu = APPINSIGHTS_MENU, active = null,
  cmds = [['refresh-cw', 'Refresh']], icon = 'activity', iconBg = '#8764B8', light = false, search = 'Search resources, services, and docs (G+/)', user = 'YW', chip = null, read: rid = 'pt' } = {}) {
  const el = node(`<div class="az az-pt ${light ? 'is-light' : ''}" style="width:${w}px;height:${h}px">
    <div class="az-pt-top"><span class="az-wordmark">Microsoft Azure</span>
      <span class="az-pt-search">${ic('search', 22)}<span>${esc(search)}</span></span>
      <div class="az-topicons">${ic('bell', 26)}${ic('settings', 26)}${ic('circle-help', 26)}<span class="az-avatar">${esc(user)}</span></div></div>
    <div class="az-pt-crumb">${[...crumbs, resource].map((c, i, a) => i < a.length - 1 ? `<b>${esc(c)}</b>&nbsp;&nbsp;›&nbsp;&nbsp;` : '').join('')}</div>
    <div class="az-pt-head"><span class="az-resicon" style="background:${iconBg}">${ic(icon, 30)}</span>
      <div class="az-col"><span class="az-h1"${rd(rid + '-title')}>${esc(resource)}${page ? ` <span>|</span> ${esc(page)}` : ''}</span><span class="az-sub"${rd(rid + '-type')}>${esc(type)}</span></div>
      <span class="az-row" style="gap:16px;margin-left:12px;color:var(--az-ink3)">${ic('star', 24)}${ic('ellipsis', 24)}</span></div>
    <div class="az-pt-body">
      <div class="az-menu"><div class="az-menu-search">${ic('search', 20)}<span>Search</span></div>
        ${menu.map(g => `${g.g ? `<div class="az-menu-g">${ic('chevron-down', 18)}${g.g}</div>` : ''}${g.items.map(([n, i]) => `<div class="az-menu-i ${g.g ? '' : 'top'} ${n === active ? 'is-on' : ''}" data-name="${n}">${ic(i, 24)}<span>${n}</span></div>`).join('')}`).join('')}</div>
      <div class="az-pt-main">${cmds && cmds.length ? `<div class="az-cmdbar">${cmds.map(([i, l]) => `<span class="az-cmd" data-name="${esc(l)}">${ic(i, 22)}<span>${esc(l)}</span></span>`).join('')}</div>` : ''}<div class="az-pt-content"></div></div>
    </div></div>`);
  if (chip) el.querySelector('.az-pt-head .az-col').firstElementChild.append(statusChip(chip, { read: rid + '-chip' }));
  const overlay = node(`<div class="az-over" style="width:${w}px;height:${h}px"></div>`); el.append(overlay);
  const api = {
    el, overlay, top: el.querySelector('.az-pt-top'), menuEl: el.querySelector('.az-menu'), cmdbar: el.querySelector('.az-cmdbar'), content: el.querySelector('.az-pt-content'),
    item: n => find(el, '.az-menu-i', n), cmd: n => find(el, '.az-cmd', n),
    setActive(n) { el.querySelectorAll('.az-menu-i').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); return api; },
  };
  api.page = api.content;
  return api;
}

// ================================================================================================ widgets
/** Fluent tab list. → {el, tab(name), set(name)} */
export function tabs(items, active, { read: rid = '' } = {}) {
  const el = node(`<div class="az-tabs">${items.map(t => `<span class="az-tab ${t === active ? 'is-on' : ''}" data-name="${esc(t)}"${rd(rid && t === active ? rid : '')}>${esc(t)}</span>`).join('')}</div>`);
  return { el, tab: n => find(el, '.az-tab', n), set(n) { el.querySelectorAll('.az-tab').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); } };
}
/** Button. o: {primary, subtle, icon, pressed, disabled, read} → element (toggle .is-pressed yourself for a click) */
export function button(label, { primary = false, subtle = false, icon = null, pressed = false, disabled = false, read: rid = '' } = {}) {
  return node(`<span class="az-btn ${primary ? 'is-primary' : ''} ${subtle ? 'is-subtle' : ''} ${pressed ? 'is-pressed' : ''} ${disabled ? 'is-dis' : ''}" data-name="${esc(label)}">${icon ? ic(icon, 22) : ''}<span${rd(rid)}>${esc(label)}</span></span>`);
}
/** Text field with label. o: {label, value, placeholder, required, focus, w, read} → {el, input, set(value)} */
export function textField({ label = '', value = '', placeholder = '', required = false, focus = false, w = null, read: rid = '' } = {}) {
  const el = node(`<div class="az-field" style="${w ? `width:${w}px` : ''}">${label ? `<span class="az-label">${esc(label)}${required ? '<span class="az-req">*</span>' : ''}</span>` : ''}<span class="az-input ${value ? '' : 'is-ph'} ${focus ? 'is-focus' : ''}"><span${rd(rid)}>${esc(value || placeholder)}</span></span></div>`);
  const input = el.querySelector('.az-input'), sp = input.firstElementChild;
  return { el, input, set(v) { if (sp.textContent !== v) { sp.textContent = v; input.classList.toggle('is-ph', !v); } } };
}
/**
 * Dropdown (closed or open). o: {label, value, options, open, selected (option name, default value), hover (option name), required, w, read}
 * → {el, box (the closed field), list, opt(name), set({open, value, selected, hover})}
 */
export function dropdown({ label = '', value = '', options = [], open = false, selected, hover = null, required = false, w = 560, read: rid = '' } = {}) {
  const el = node(`<div class="az-field az-dd" style="width:${w}px">${label ? `<span class="az-label">${esc(label)}${required ? '<span class="az-req">*</span>' : ''}</span>` : ''}
    <span class="az-input"><span class="val"${rd(rid)}>${esc(value)}</span>${ic('chevron-down', 22)}</span>
    <div class="az-list">${options.map(o => `<div class="az-opt" data-name="${esc(o)}">${ic('check', 22)}<span>${esc(o)}</span></div>`).join('')}</div></div>`);
  const list = el.querySelector('.az-list'), boxEl = el.querySelector('.az-input'), val = el.querySelector('.val');
  const api = { el, box: boxEl, list, opt: n => find(list, '.az-opt', n),
    set({ open: o = open, value: v, selected: s, hover: hv = null } = {}) {
      list.style.display = o ? '' : 'none';
      if (v != null && val.textContent !== v) val.textContent = v;
      const sel = s ?? val.textContent;
      list.querySelectorAll('.az-opt').forEach(e => { e.classList.toggle('is-sel', e.dataset.name === sel); e.classList.toggle('is-hover', e.dataset.name === hv); });
      boxEl.classList.toggle('is-focus', !!o);
      return api; } };
  api.set({ open, value, selected: selected ?? value, hover });
  return api;
}
/** Slider with its value box (e.g. "Tokens per Minute Rate Limit" 100K). o: {label, value (text), k (0–1 position), w, read} → {el, set(k, valueText)} */
export function slider({ label = '', value = '', k = 0.5, w = 720, read: rid = '' } = {}) {
  const el = node(`<div class="az-slider" style="width:${w}px"><span class="az-label">${esc(label)}</span><div class="az-slider-row"><div class="az-track"><i></i><span class="az-thumb"></span></div><span class="az-slider-val"${rd(rid)}>${esc(value)}</span></div></div>`);
  const fill = el.querySelector('.az-track i'), th = el.querySelector('.az-thumb'), v = el.querySelector('.az-slider-val');
  const api = { el, thumb: th, valueEl: v, set(kk, text) { const p = (clamp(kk) * 100).toFixed(2) + '%'; fill.style.width = p; th.style.left = p; if (text != null && v.textContent !== text) v.textContent = text; return api; } };
  return api.set(k, value);
}
/** Fluent switch. → {el, set(on)} */
export function toggle({ label = '', on = false, read: rid = '' } = {}) {
  const el = node(`<span class="az-switch ${on ? 'is-on' : ''}"><i></i>${label ? `<span${rd(rid)}>${esc(label)}</span>` : ''}</span>`);
  return { el, set(o) { el.classList.toggle('is-on', !!o); } };
}
/** Key–value property list. rows: [[key, value, {link, read}], …] → element */
export function props(rows, { read: rid = '' } = {}) {
  return node(`<div class="az-props">${rows.map(([k, v, o = {}], i) => `<span class="k">${esc(k)}</span><span class="v ${o.link ? 'link' : ''}"${rd(o.read || (rid ? `${rid}-${i}` : ''))}>${esc(v)}</span>`).join('')}</div>`);
}
const STATUS = { ok: ['circle-check', 'ok'], err: ['circle-x', 'err'], warn: ['triangle-alert', 'warn'], info: ['info', 'info'], off: ['circle-minus', 'off'] };
/**
 * Table (≤ 5 visible rows, then "… N more"). columns: [{key, label, num, w, link, mono}], rows: [{key: value | {text, status: 'ok'|'err'|'warn'}}] or arrays.
 * o: {more (number of hidden rows), mono (results grid look), sel (row index), read (id prefix: every cell gets data-read)}
 * → {el, row(i), cell(i, key)}
 */
export function table({ columns = [], rows = [], more = 0, mono = false, sel = -1, read: rid = '', moreText } = {}) {
  const cellHtml = (c, v, i, j) => { const o = v && typeof v === 'object' ? v : { text: v }; const st = o.status && STATUS[o.status];
    const inner = st ? `<span class="az-st ${st[1]}">${ic(st[0], 22)}<span>${esc(o.text)}</span></span>` : o.icon ? `<span class="az-st">${K.icon(o.icon, { size: 22, color: o.color }).outerHTML}<span>${esc(o.text)}</span></span>` : esc(o.text);
    return `<td class="${c.num ? 'num' : ''} ${c.link || o.link ? 'link' : ''} ${c.mono || o.mono ? 'az-mono' : ''}" data-key="${esc(c.key)}"${rd(rid ? `${rid}-r${i}c${j}` : '')}>${inner}${o.chip ? ` <span class="az-badge">${esc(o.chip)}</span>` : ''}</td>`; };
  const el = node(`<table class="az-table ${mono ? 'is-mono' : ''}"><thead><tr>${columns.map(c => `<th class="${c.num ? 'num' : ''}" style="${c.w ? `width:${c.w}px` : ''}"${rd(rid ? `${rid}-h-${c.key}` : '')}>${esc(c.label ?? c.key)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(0, 5).map((r, i) => `<tr class="${i === sel ? 'is-sel' : ''}">${columns.map((c, j) => cellHtml(c, Array.isArray(r) ? r[j] : r[c.key], i, j)).join('')}</tr>`).join('')}
    ${more ? `<tr class="more"><td colspan="${columns.length}"${rd(rid ? rid + '-more' : '')}>${esc(moreText ?? `… ${more.toLocaleString('en-US')} more`)}</td></tr>` : ''}</tbody></table>`);
  return { el, row: i => el.tBodies[0].rows[i], cell: (i, key) => el.tBodies[0].rows[i]?.querySelector(`td[data-key="${key}"]`) };
}
/** Results grid under a query editor = a monospace table. */
export const resultsGrid = o => table({ mono: true, ...o });

/** Message bar (banner). kind: 'err'|'warn'|'ok'|'info'. o: {title, text (may contain <code>), read} → element */
export function banner({ kind = 'err', title = '', text = '', read: rid = 'banner' } = {}) {
  const icn = { err: 'circle-x', warn: 'triangle-alert', ok: 'circle-check', info: 'info' }[kind];
  return node(`<div class="az-bar ${kind}">${ic(icn, 26)}<div${rd(rid)}>${title ? `<b>${esc(title)}</b>` : ''}${text}</div></div>`);
}
/** Portal notification (toast). o: {kind, title, text, when, read} → element */
export function toast({ kind = 'err', title = '', text = '', when = '', read: rid = 'toast' } = {}) {
  const icn = { err: 'circle-x', warn: 'triangle-alert', ok: 'circle-check', info: 'info' }[kind];
  return node(`<div class="az-toast ${kind}">${ic(icn, 30)}<div><div class="az-t"${rd(rid + '-t')}>${esc(title)}</div><div class="az-m"${rd(rid + '-m')}>${text}</div>${when ? `<div class="az-when">${esc(when)}</div>` : ''}</div></div>`);
}

// ------------------------------------------------------------------------------------------------ line chart (Azure Monitor metrics look)
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
let clipSeq = 0;
/**
 * Line chart. o: {w, h (plot+axes), title, sub, x: {min, max, ticks: [[v, label]]}, y: {min, max, ticks: [[v, label]]},
 *   series: [{name, color, pts: [[x, y]], width}], threshold: {y, label}, legend: [{name, value, color}], read}
 * → {el, svg, px(x, y) → [chart px], reveal(k) (draw-on 0–1, pure), hover(x | null, rows: [{name, value, color}], title)}
 * Real-screen colours: series default #0F6CBD, #CA5010, #8764B8 (Fluent data colours). The threshold is the portal's dashed line.
 */
export function lineChart({ w = 1100, h = 420, title = '', sub = '', x = { min: 0, max: 1, ticks: [] }, y = { min: 0, max: 1, ticks: [] }, series = [], threshold = null, legend = [], read: rid = 'chart' } = {}) {
  const PL = 70, PR = 24, PT = 14, PB = 40, W = w - PL - PR, H = h - PT - PB;
  const px = (vx, vy) => [PL + (vx - x.min) / (x.max - x.min) * W, PT + (1 - (vy - y.min) / (y.max - y.min)) * H];
  const el = node(`<div class="az-chart" style="width:${w}px">${title ? `<div class="az-chart-title"${rd(rid + '-title')}>${esc(title)}</div>` : ''}${sub ? `<div class="az-chart-sub">${esc(sub)}</div>` : ''}</div>`);
  const svg = svgEl('svg', { width: w, height: h }); el.append(svg);
  for (const [v, l] of y.ticks || []) { const [, yy] = px(x.min, v); svg.append(svgEl('line', { x1: PL, x2: PL + W, y1: yy, y2: yy, class: 'grid' })); const t = svgEl('text', { x: PL - 12, y: yy + 6, 'text-anchor': 'end', class: 'axis' }); t.textContent = l; svg.append(t); }
  for (const [v, l] of x.ticks || []) { const [xx] = px(v, y.min); const t = svgEl('text', { x: xx, y: PT + H + 30, 'text-anchor': 'middle', class: 'axis' }); t.textContent = l; svg.append(t); }
  const id = 'azc' + (++clipSeq), clip = svgEl('clipPath', { id }), cr = svgEl('rect', { x: 0, y: -40, width: PL + W + 30, height: h + 80 }); clip.append(cr); svg.append(clip);
  const g = svgEl('g', { 'clip-path': `url(#${id})` }); svg.append(g);
  const COLS = ['#0F6CBD', '#CA5010', '#8764B8', '#038387'];
  series.forEach((s, i) => { const d = s.pts.map((p, j) => `${j ? 'L' : 'M'}${px(...p).map(v => v.toFixed(1)).join(',')}`).join(''); g.append(svgEl('path', { d, fill: 'none', stroke: s.color || COLS[i % 4], 'stroke-width': s.width || 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); });
  if (threshold) { const [, ty] = px(x.min, threshold.y); svg.append(svgEl('line', { x1: PL, x2: PL + W, y1: ty, y2: ty, class: 'thr' })); if (threshold.label) { const t = svgEl('text', { x: PL + W - 6, y: ty - 10, 'text-anchor': 'end', class: 'thr-l' }); t.textContent = threshold.label; svg.append(t); } }
  if (legend.length) el.append(node(`<div class="az-legend">${legend.map((l, i) => `<div class="az-leg"><i style="background:${l.color || COLS[i % 4]}"></i><div><div class="n">${esc(l.name)}</div><div class="v"${rd(`${rid}-leg${i}`)}>${esc(l.value)}</div></div></div>`).join('')}</div>`));
  const hl = svgEl('line', { class: 'hover', y1: PT, y2: PT + H }); hl.style.display = 'none'; svg.append(hl);
  const dots = series.map((s, i) => { const c = svgEl('circle', { r: 7, fill: '#fff', stroke: s.color || COLS[i % 4], 'stroke-width': 3.5 }); c.style.display = 'none'; svg.append(c); return c; });
  const tip = node('<div class="az-tip"></div>'); tip.style.display = 'none'; el.append(tip);
  const top = () => (title ? 34 : 0) + (sub ? 34 : 0);
  const yAt = (s, vx) => { const P = s.pts; if (vx <= P[0][0]) return P[0][1]; for (let j = 1; j < P.length; j++) if (vx <= P[j][0]) return lerp(P[j - 1][1], P[j][1], (vx - P[j - 1][0]) / (P[j][0] - P[j - 1][0])); return P[P.length - 1][1]; };
  let tipKey = '';
  return { el, svg, px: (vx, vy) => { const [a, b] = px(vx, vy); return [a, b + top()]; },
    reveal(k) { cr.setAttribute('width', (PL + W * clamp(k) + 2).toFixed(1)); },
    hover(vx, rows = null, ttl = '') {
      const on = vx != null; hl.style.display = tip.style.display = on ? '' : 'none'; dots.forEach(d => { d.style.display = on ? '' : 'none'; }); if (!on) return;
      const [xx] = px(vx, 0); hl.setAttribute('x1', xx); hl.setAttribute('x2', xx);
      series.forEach((s, i) => { const [, yy] = px(vx, yAt(s, vx)); dots[i].setAttribute('cx', xx); dots[i].setAttribute('cy', yy); });
      const R = rows || series.map((s, i) => ({ name: s.name, value: String(Math.round(yAt(s, vx))), color: s.color || COLS[i % 4] }));
      const key = ttl + JSON.stringify(R); if (key !== tipKey) { tipKey = key; tip.innerHTML = `${ttl ? `<div class="az-sb" data-read="${rid}-tip-t">${esc(ttl)}</div>` : ''}${R.map((r, i) => `<div class="r"><i style="background:${r.color}"></i><span>${esc(r.name)}</span><b data-read="${rid}-tip${i}">${esc(r.value)}</b></div>`).join('')}`; }
      const tw = tip.offsetWidth || 260; tip.style.left = (xx + 18 + tw > w ? xx - 18 - tw : xx + 18).toFixed(1) + 'px'; tip.style.top = (top() + PT + 10) + 'px';
    } };
}

// ------------------------------------------------------------------------------------------------ code editor (C#, KQL, JSON)
const KW = {
  csharp: 'using|var|new|await|async|public|private|protected|internal|static|class|record|return|try|catch|when|if|else|true|false|null|string|int|long|double|bool|void|namespace|foreach|in|const|readonly|throw|this|is|not',
  kql: 'where|summarize|by|order|sort|extend|project|distinct|take|top|count|countif|sum|avg|min|max|toint|todouble|tostring|round|percentile|percentiles|ago|between|datetime|isnotempty|isempty|make_set|make_list|desc|asc|and|or|mv-expand|parse_json|strcat_array|bin|join|on|let|render|timechart|has|contains',
  json: 'true|false|null',
};
const KQL_TABLES = 'dependencies|requests|customEvents|traces|exceptions|AppDependencies|AppRequests|AppTraces|AppEvents|AppGenAIContent|AzureDiagnostics|AzureMetrics|ApiManagementGatewayLlmLog';
function tokenize(line, lang) {
  let rx;
  if (lang === 'json') rx = /("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*")|(-?\b\d+(?:\.\d+)?\b)|(\b(?:true|false|null)\b)/g;
  else if (lang === 'kql') rx = new RegExp(`(\\/\\/.*$)|("(?:[^"\\\\]|\\\\.)*")|(\\b\\d+(?:\\.\\d+)?[a-z]*\\b)|(\\b(?:${KQL_TABLES})\\b)|((?:^|(?<=\\|\\s*))\\b(?:${KW.kql})\\b|\\b(?:${KW.kql})\\b(?=\\s*\\())|(\\b(?:${KW.kql})\\b)`, 'g');
  else rx = new RegExp(`(\\/\\/.*$)|(\\$?"(?:[^"\\\\]|\\\\.)*")|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${KW.csharp})\\b)|(\\b[A-Z][A-Za-z0-9_]*\\b)|(\\b[a-z_][A-Za-z0-9_]*(?=\\())`, 'g');
  const cls = lang === 'json' ? ['tk-pr', 'tk-st', 'tk-nu', 'tk-kw'] : lang === 'kql' ? ['tk-cm', 'tk-st', 'tk-nu', 'tk-tb', 'tk-kw', 'tk-kw'] : ['tk-cm', 'tk-st', 'tk-nu', 'tk-kw', 'tk-ty', 'tk-fn'];
  let out = '', last = 0, m;
  while ((m = rx.exec(line))) { if (!m[0]) { rx.lastIndex++; continue; } out += esc(line.slice(last, m.index)); const gi = m.slice(1).findIndex(v => v !== undefined); out += `<span class="${cls[gi] || ''}">${esc(m[0])}</span>`; last = m.index + m[0].length; }
  return out + esc(line.slice(last));
}
/**
 * Code / query editor (Monaco light). o: {lang: 'csharp'|'kql'|'json', code (string), title (file or tab name), run (KQL: Run button + time range),
 *   time ('Last 24 hours'), first (first line number), w, read (id prefix: every line gets data-read)}
 * → {el, code, lines: [el], line(n), runBtn, focus(a, b, k)}: focus lights lines a…b (1-based, inclusive) in the house cyan and dims the rest
 *   (k 0 → 1 fades the dim in; focus(null) clears). Pure.
 */
export function codeEditor({ lang = 'csharp', code = '', title = '', run = false, time = 'Last 24 hours', first = 1, w = 1100, read: rid = '', runLabel = 'Run', timeLabel = 'Time range' } = {}) {
  const src = code.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const el = node(`<div class="az-editor" style="width:${w}px">${title || run ? `<div class="az-ed-bar">${run ? `<span class="az-btn is-primary" data-name="Run">${ic('play', 20)}<span>${esc(runLabel)}</span></span><span class="az-ed-time">${esc(timeLabel)} : <b class="az-sb">${esc(time)}</b></span>` : ''}${title ? `<span class="az-ed-file" style="${run ? 'margin-left:auto' : ''}">${esc(title)}</span>` : ''}</div>` : ''}
    <div class="az-code">${src.map((l, i) => `<div class="az-ln"><span class="az-no">${first + i}</span><span class="az-tx"${rd(rid ? `${rid}-${first + i}` : '')}>${tokenize(l, lang) || ' '}</span></div>`).join('')}</div></div>`);
  const codeEl = el.querySelector('.az-code'), lines = [...el.querySelectorAll('.az-ln')];
  let lastKey = '';
  return { el, code: codeEl, lines, line: n => lines[n - first], runBtn: el.querySelector('[data-name="Run"]'),
    focus(a, b = a, k = 1) {
      const key = `${a}|${b}|${k.toFixed(2)}`; if (key === lastKey) return; lastKey = key;
      lines.forEach((ln, i) => ln.classList.toggle('is-hl', a != null && first + i >= a && first + i <= b && k > 0.01));
      codeEl.classList.toggle('is-dim', a != null && k > 0.01); codeEl.style.setProperty('--az-dim', lerp(1, 0.3, clamp(k)).toFixed(3));
      codeEl.style.setProperty('--az-hl-bg', `rgba(70,212,255,${(0.14 * clamp(k)).toFixed(3)})`);
    } };
}

// ------------------------------------------------------------------------------------------------ trace waterfall + simple view
const KIND_ICON = { agent: 'bot', llm: 'sparkles', tool: 'wrench' };
/**
 * Trace waterfall (End-to-end transaction details). spans: [{op ('invoke_agent'), target ('grader'), kind ('agent'|'llm'|'tool'), depth, start, dur, tokens, warn, err}]
 * o: {total (same unit as start/dur), unit ('s'), ticks ([v…]), w, nameW, tokW, sel (row index), read (id prefix)}
 * → {el, row(i), bar(i), reveal(k) (bars grow along time, 0–1, pure)}
 * Colours: the portal's own (agent blue, model purple, tool teal, error red); `warn` is OUR mark (house magenta + glow).
 */
export function waterfall({ spans = [], total = 10, unit = 's', ticks = null, w = 1400, nameW = 520, tokW = 150, sel = -1, read: rid = 'wf' } = {}) {
  const fmt = v => (unit === 'ms' ? `${Math.round(v)} ms` : `${v.toFixed(v < 10 ? 1 : 1)} s`);
  const T = ticks || [0, total / 4, total / 2, total * 3 / 4, total];
  const el = node(`<div class="az-wf" style="width:${w}px"><div class="az-wf-head"><span style="width:${nameW}px;padding-left:12px">Name</span>${tokW ? `<span style="width:${tokW}px;text-align:right;padding-right:18px">Tokens</span>` : ''}<span class="az-wf-lane"></span></div>
    ${spans.map((s, i) => `<div class="az-wf-row ${i === sel ? 'is-sel' : ''}"><span class="az-wf-name" style="width:${nameW}px;padding-left:${12 + (s.depth || 0) * 30}px">${ic(KIND_ICON[s.kind] || 'activity', 22)}<span class="op"${rd(`${rid}-n${i}`)}>${esc(s.op)}</span><span class="tgt">${esc(s.target || '')}</span></span>
      ${tokW ? `<span class="az-wf-tok" style="width:${tokW}px"${rd(s.tokens ? `${rid}-t${i}` : '')}>${s.tokens ? s.tokens.toLocaleString('en-US') : ''}</span>` : ''}<span class="az-wf-lane"><span class="az-wf-bar k-${s.kind} ${s.err ? 'is-err' : ''} ${s.warn ? 'is-warn' : ''}"></span><span class="az-wf-dur ${s.warn ? 'is-warn' : ''}"${rd(`${rid}-d${i}`)}>${fmt(s.dur)}</span></span></div>`).join('')}</div>`);
  const head = el.querySelector('.az-wf-head .az-wf-lane'); const laneW = w - nameW - tokW;
  T.forEach(v => { const a = node(`<span class="az-wf-axis" style="left:${(v / total * (laneW - 90)).toFixed(1)}px">${fmt(v)}</span>`); head.append(a); });
  const rows = [...el.querySelectorAll('.az-wf-row')], bars = rows.map(r => r.querySelector('.az-wf-bar')), durs = rows.map(r => r.querySelector('.az-wf-dur'));
  const sc = (laneW - 90) / total;
  const api = { el, row: i => rows[i], bar: i => bars[i],
    reveal(k) { const now = clamp(k) * total;
      spans.forEach((s, i) => { const v = clamp(now - s.start, 0, s.dur); bars[i].style.left = (s.start * sc).toFixed(1) + 'px'; bars[i].style.width = Math.max(v > 0 ? 3 : 0, v * sc).toFixed(1) + 'px'; bars[i].style.visibility = v > 0 ? 'visible' : 'hidden';
        durs[i].style.left = ((s.start + s.dur) * sc + 10).toFixed(1) + 'px'; durs[i].style.visibility = v >= s.dur - 1e-6 ? 'visible' : 'hidden'; }); } };
  api.reveal(1);
  return api;
}
/**
 * Application Insights "simple view": the trace as a story (invoke_agent → chat → execute_tool …).
 * steps: [{kind: 'agent'|'llm'|'tool', title, detail, dur, tokens, warn}] o: {head (true: "Simple view" + "Leave simple view"), w, read}
 * → {el, step(i)}
 */
export function simpleView({ steps = [], head = true, w = 760, read: rid = 'sv' } = {}) {
  const el = node(`<div class="az-sv" style="width:${w}px">${head ? `<div class="az-sv-head"><span class="az-h3">Simple view</span><span class="az-link" style="margin-left:auto">Leave simple view</span></div>` : ''}
    ${steps.map((s, i) => `<div class="az-sv-step ${s.warn ? 'is-warn' : ''}"><span class="az-sv-ic ${s.kind}">${ic(KIND_ICON[s.kind] || 'activity', 24)}</span><div class="az-sv-card"><div class="az-t"${rd(`${rid}-${i}`)}>${esc(s.title)}</div>${s.detail ? `<div class="az-d">${esc(s.detail)}</div>` : ''}
      <div class="az-sv-meta">${s.dur != null ? `<span class="dur"${rd(`${rid}-${i}-d`)}>${ic('clock', 20)}${esc(s.dur)}</span>` : ''}${s.tokens != null ? `<span${rd(`${rid}-${i}-t`)}>${ic('coins', 20)}${esc(s.tokens)}</span>` : ''}</div></div></div>`).join('')}</div>`);
  const st = [...el.querySelectorAll('.az-sv-step')];
  return { el, step: i => st[i] };
}

// ------------------------------------------------------------------------------------------------ alert rule (Create an alert rule) pieces
export const ALERT_TABS = ['Scope', 'Condition', 'Actions', 'Details', 'Tags', 'Review + create'];
/** Tabs of the Create-an-alert-rule page. → tabs() api */
export const alertTabs = (active = 'Condition') => { const t = tabs(ALERT_TABS, active, { read: 'alert-tab' }); t.el.classList.add('az-steps'); return t; };
/** Scope: the resource the rule watches. o: {resource, type, location} → element */
export function alertScope({ resource = 'cram-ai', type = 'Foundry', location = 'Japan East' } = {}) {
  return node(`<div class="az-sec"><span class="az-h2">Scope</span><span class="az-sub">Select the target resource you wish to monitor.</span>
    ${table({ columns: [{ key: 'r', label: 'Resource' }, { key: 't', label: 'Resource type' }, { key: 'l', label: 'Location' }], rows: [[{ text: resource, link: true }, type, location]], read: 'alert-scope' }).el.outerHTML}</div>`);
}
/**
 * Condition: signal + operator + threshold + window. o: {signal, aggregation ('Total'), operator ('Greater than'), threshold ('5'), unit, check ('1 minute'), lookback ('5 minutes'),
 *   split ('StatusCode = 429'), sentence (preview line; default built from the fields)} → {el, field(label) → the input element}
 */
export function alertCondition({ signal = 'Azure OpenAI Requests', aggregation = 'Total', operator = 'Greater than', threshold = '5', unit = '', check = '1 minute', lookback = '5 minutes', split = '', sentence = null } = {}) {
  const f = (label, v, dd = true) => `<div class="az-field" data-name="${esc(label)}"><span class="az-label">${esc(label)}</span><span class="az-input"${dd ? ' style="justify-content:space-between"' : ''}><span data-read="alert-${esc(label)}">${esc(v)}</span>${dd ? ic('chevron-down', 22) : ''}</span></div>`;
  const s = sentence ?? `Whenever the ${aggregation.toLowerCase()} ${signal.toLowerCase()} is ${operator.toLowerCase()} ${threshold}${unit ? ' ' + unit : ''}`;
  const el = node(`<div class="az-sec"><span class="az-h2">Condition</span>
    <div class="az-grid2">${f('Signal name', signal)}${split ? f('Dimension', split) : f('Threshold', 'Static')}</div>
    <div class="az-grid4">${f('Aggregation type', aggregation)}${f('Operator', operator)}${f('Threshold value', threshold + (unit ? ' ' + unit : ''), false)}${f('Check every', check)}</div>
    <div class="az-grid4">${f('Lookback period', lookback)}</div>
    <div class="az-sentence" data-read="alert-sentence">${esc(s)}</div></div>`);
  return { el, field: n => el.querySelector(`.az-field[data-name="${n}"] .az-input`) };
}
/** Actions: action groups. o: {groups: [{name, actions}]} → element */
export function alertActions({ groups = [{ name: 'ag-grading-oncall', actions: 'Email, SMS, Webhook' }] } = {}) {
  return node(`<div class="az-sec"><span class="az-h2">Actions</span><span class="az-row" style="gap:16px"><span class="az-btn">${ic('plus', 20)}<span>Select action groups</span></span><span class="az-btn">${ic('plus', 20)}<span>Create action group</span></span></span>
    ${table({ columns: [{ key: 'n', label: 'Action group name' }, { key: 'a', label: 'Contains actions' }], rows: groups.map(g => [{ text: g.name, link: true }, g.actions]), read: 'alert-actions' }).el.outerHTML}</div>`);
}
/** Details: severity + rule name. o: {severity ('2 - Warning'), name, description} → element */
export function alertDetails({ severity = '2 - Warning', name = 'grading-429-rate', description = '' } = {}) {
  return node(`<div class="az-sec"><span class="az-h2">Details</span><div class="az-grid2">
    <div class="az-field"><span class="az-label">Severity<span class="az-req">*</span></span><span class="az-input" style="justify-content:space-between"><span data-read="alert-sev">${esc(severity)}</span>${ic('chevron-down', 22)}</span></div>
    <div class="az-field"><span class="az-label">Alert rule name<span class="az-req">*</span></span><span class="az-input"><span data-read="alert-name">${esc(name)}</span></span></div>
    ${description ? `<div class="az-field" style="grid-column:1/3"><span class="az-label">Alert rule description</span><span class="az-input"><span>${esc(description)}</span></span></div>` : ''}</div></div>`);
}

// ------------------------------------------------------------------------------------------------ Grafana-like dashboard
/**
 * A dashboard in the Grafana (dark) style — Azure Monitor dashboards with Grafana / "Explore in Grafana".
 * o: {title ('Agent Framework'), folder ('Azure Monitor'), range ('Last 6 hours'), w, cols (4), tiles: [{label, value, unit, color}],
 *   series: {title, pts: [[x, y]], color, threshold, h}} → {el, tile(i), reveal(k)}
 */
export function grafanaPanel({ title = 'Agent Framework', folder = 'Dashboards', range = 'Last 6 hours', w = 1300, cols = 4, tiles = [], series = null, read: rid = 'gf' } = {}) {
  const el = node(`<div class="az-gf" style="width:${w}px"><div class="az-gf-top">${ic('layout-dashboard', 24)}<span>${esc(folder)}</span>${ic('chevron-right', 18)}<b${rd(rid + '-title')}>${esc(title)}</b><span class="tr">${ic('clock', 18)}${esc(range)}</span></div>
    <div class="az-gf-grid" style="grid-template-columns:repeat(${cols},1fr)">${tiles.map((t, i) => `<div class="az-gf-p"><div class="az-t"${rd(`${rid}-l${i}`)}>${esc(t.label)}</div><div class="az-gf-stat" style="color:${t.color || '#73BF69'}"${rd(`${rid}-v${i}`)}>${esc(t.value)}${t.unit ? `<small>${esc(t.unit)}</small>` : ''}</div></div>`).join('')}</div></div>`);
  let api = { el, tile: i => el.querySelectorAll('.az-gf-p')[i], reveal() {} };
  if (series) {
    const H = series.h || 260, SW = w - 36 - 28, p = node(`<div class="az-gf-grid" style="grid-template-columns:1fr"><div class="az-gf-p"><div class="az-t"${rd(rid + '-s')}>${esc(series.title || '')}</div></div></div>`);
    el.append(p); const svg = svgEl('svg', { width: SW, height: H }); p.firstElementChild.append(svg);
    const xs = series.pts.map(q => q[0]), ys = series.pts.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = series.max ?? Math.max(...ys) * 1.15;
    const P = (x, y) => [10 + (x - x0) / (x1 - x0) * (SW - 20), 10 + (1 - y / y1) * (H - 30)];
    for (let i = 0; i <= 4; i++) svg.append(svgEl('line', { x1: 10, x2: SW - 10, y1: 10 + i * (H - 30) / 4, y2: 10 + i * (H - 30) / 4, stroke: '#2B2D33', 'stroke-width': 1.5 }));
    const id = 'azg' + (++clipSeq), clip = svgEl('clipPath', { id }), cr = svgEl('rect', { x: 0, y: -10, width: SW, height: H + 20 }); clip.append(cr); svg.append(clip);
    const d = series.pts.map((q, j) => `${j ? 'L' : 'M'}${P(...q).map(v => v.toFixed(1)).join(',')}`).join('');
    const col = series.color || '#5794F2';
    const g = svgEl('g', { 'clip-path': `url(#${id})` }); g.append(svgEl('path', { d: d + `L${P(x1, 0).join(',')}L${P(x0, 0).join(',')}Z`, fill: col, opacity: 0.16 }), svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': 3 })); svg.append(g);
    if (series.threshold != null) { const [, ty] = P(x0, series.threshold); svg.append(svgEl('line', { x1: 10, x2: SW - 10, y1: ty, y2: ty, stroke: '#F2495C', 'stroke-width': 2, 'stroke-dasharray': '8 6' })); }
    api.reveal = k => cr.setAttribute('width', (SW * clamp(k)).toFixed(1));
  }
  return api;
}

// ------------------------------------------------------------------------------------------------ chat / investigation panel (generic)
/**
 * Chat panel for an AIOps agent conversation — a generic panel (labelled 「介面示意」), not a copy of a real product screen.
 * o: {title, messages: [{role: 'user'|'agent', text, steps: [string]}], input, w, h, mock (true)} → {el, msg(i), show(n)} (show the first n messages; pure)
 */
export function chatPanel({ title = 'Observability Agent', messages = [], input = 'Ask a question…', w = 720, h = 760, mock = true, read: rid = 'chat' } = {}) {
  const el = node(`<div class="az-chat" style="width:${w}px;height:${h}px;position:relative"><div class="az-chat-head">${ic('sparkles', 24)}<span${rd(rid + '-title')}>${esc(title)}</span>${mock ? '<span class="az-x-mock" style="margin-left:auto">介面示意</span>' : ''}</div>
    <div class="az-chat-body">${messages.map((m, i) => `<div class="az-msg ${m.role}"><div${rd(`${rid}-${i}`)}>${esc(m.text)}</div>${(m.steps || []).map((s, j) => `<div class="step"${rd(`${rid}-${i}-${j}`)}>${ic('circle-check', 20)}${esc(s)}</div>`).join('')}</div>`).join('')}</div>
    <div class="az-chat-in"><span>${esc(input)}</span><span style="margin-left:auto;color:var(--az-brand)">${ic('send', 22)}</span></div></div>`);
  const ms = [...el.querySelectorAll('.az-msg')];
  return { el, msg: i => ms[i], show(n) { ms.forEach((m, i) => { m.style.display = i < n ? '' : 'none'; }); } };
}

// ================================================================================================ OUR layer (house grammar)
/** Status chip, house colours: 'GA' cyan · 'Preview' grey · '退役 12/1' (any text starting with 退役 or 'Retired') magenta. o: {big, read} → element */
export function statusChip(kind, { big = false, read: rid = '' } = {}) {
  const k = String(kind), cls = /^(退役|Retired|Retiring)/i.test(k) ? 'is-retired' : /^preview$/i.test(k) ? 'is-preview' : '';
  return node(`<span class="az-x-chip ${cls} ${big ? 'is-big' : ''}"${rd(rid)}>${esc(k)}</span>`);
}
/** Put a status chip right after the text of an element (nav item, title, option…). → the chip */
export function chipOn(el, kind, o = {}) { const c = statusChip(kind, o); (el.querySelector(':scope > span:last-of-type') || el).after(c); return c; }
/** The corner footnote (default AZ.FOOTNOTE 「介面依 Microsoft Learn 與入口網站重繪，2026-11」; AZ.FOOTNOTE_LEARN = the old text) (never needed reading). o: {x (24), y (890: just above the subtitle band), right (px from the right edge instead of x), text} → {el, set(a)} */
export function footnote(parent, { text = FOOTNOTE, right = null, y = 890, x = 24 } = {}) {
  const el = node(`<div class="az-x-foot">${esc(text)}</div>`); parent.append(el);
  let w = 0;
  return { el, set(a = 1) { vis(el, a); if (a <= 0.01) return; if (!w) w = el.offsetWidth; el.style.transform = `translate(${(right != null ? (parent.offsetWidth || 1920) - right - w : x).toFixed(1)}px,${y}px)`; } };
}
/** 「介面示意」 tag for a generic (not real) panel. */
export const mockTag = (text = '介面示意') => node(`<span class="az-x-mock">${esc(text)}</span>`);

/**
 * Mouse cursor (the kit's arrow), a pure function of t. keys: [{t, at: [x, y] | Element, click}] in `root` px (frame or overlay coordinates).
 * The cursor eases between keys (0.6 s before each key it starts moving); a click shows a ring and presses the arrow. → {el, update(t)}
 */
export function cursor(layer, root, keys = [], { move = 0.6 } = {}) {
  const el = node('<div class="k-cursor"><div class="k-ripple"></div><svg viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.3-4.1 2.9 6.6 3-1.3-2.9-6.5h6z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg></div>');
  layer.append(el); const rip = el.querySelector('.k-ripple'), arrow = el.querySelector('svg');
  Object.assign(el.style, { position: 'absolute', left: '0', top: '0', zIndex: 60 });
  Object.assign(rip.style, { position: 'absolute', left: '-26px', top: '-26px', width: '52px', height: '52px', borderRadius: '50%', border: '4px solid #16A6DE', background: 'rgba(70,212,255,.18)', boxSizing: 'border-box' });
  const pt = a => (a instanceof Element ? (() => { const b = box(a, root); return [b.cx, b.cy]; })() : a);
  const sm = util.sm;
  return { el, update(t) {
    if (!keys.length || t < keys[0].t - move - 0.3) { vis(el, 0); return; }
    vis(el, Math.min(1, (t - (keys[0].t - move - 0.3)) / 0.3));
    let p = pt(keys[0].at);
    for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (t <= k.t - move) break; const q = pt(k.at), u = sm((t - (k.t - move)) / move); p = [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; if (t < k.t) break; p = q; }
    el.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`;
    const c = keys.filter(k => k.click && t >= k.t).pop(), r = c ? (t - c.t) / 0.5 : 1;
    rip.style.opacity = r < 1 ? (1 - r).toFixed(3) : '0'; rip.style.transform = `scale(${(0.4 + 0.9 * clamp(r)).toFixed(3)})`;
    arrow.style.transform = c && t - c.t < 0.16 ? 'scale(0.86)' : ''; arrow.style.transformOrigin = '20% 10%';
  } };
}

/**
 * Magnifier inset: a local zoom of a region of a frame, in a house rim, with a leader to the region.
 * src: the frame element (cloned once; call refresh() after you change it). o: {region: {x0,y0,x1,y1} (src px), zoom (2), at: [x, y] (inset centre, overlay px),
 *   size: [w, h], shape ('rect'|'round'), parent (element the inset goes in; default src's .az-over), map (src px → parent px, e.g. screen.toPage)} → {el, ring, set(a), refresh()}
 */
export function magnifier(src, { region, zoom = 2, at = [1400, 360], size = [620, 300], shape = 'rect', parent = null, lead = true, map = null } = {}) {
  const par = parent || src.querySelector('.az-over') || src;
  const ring = node('<div class="az-x-ring"></div>'), mag = node(`<div class="az-x-mag is-${shape}"></div>`), svg = svgEl('svg', { class: 'az-x-lead', width: 10, height: 10 });
  const path = svgEl('path'), dot = svgEl('circle', { r: 7 }); svg.append(path, dot); par.append(svg, ring, mag);
  const [w, h] = size; let clone = null;
  function refresh() { if (clone) clone.remove(); clone = src.cloneNode(true); clone.classList.add('clone'); clone.classList.remove('k-place'); Object.assign(clone.style, { position: 'absolute', left: '0px', top: '0px', margin: '0', zIndex: 'auto' }); clone.removeAttribute('data-read'); clone.querySelectorAll('[data-read]').forEach(e => e.removeAttribute('data-read')); clone.querySelectorAll('.az-over').forEach(e => e.remove());
    const cx = (region.x0 + region.x1) / 2, cy = (region.y0 + region.y1) / 2; clone.style.transform = `translate(${(w / 2 - cx * zoom).toFixed(1)}px,${(h / 2 - cy * zoom).toFixed(1)}px) scale(${zoom})`; mag.append(clone); }
  refresh();
  Object.assign(mag.style, { width: w + 'px', height: h + 'px', left: (at[0] - w / 2) + 'px', top: (at[1] - h / 2) + 'px' });
  // the ring and the leader live in the parent's px: `map` converts src px → parent px (studioScreen().toPage for an inset outside the screen)
  const [q0x, q0y] = map ? map([region.x0, region.y0]) : [region.x0, region.y0], [q1x, q1y] = map ? map([region.x1, region.y1]) : [region.x1, region.y1];
  const R = { x0: q0x, y0: q0y, x1: q1x, y1: q1y };
  Object.assign(ring.style, { left: (R.x0 - 6) + 'px', top: (R.y0 - 6) + 'px', width: (R.x1 - R.x0 + 12) + 'px', height: (R.y1 - R.y0 + 12) + 'px' });
  // leader: from the inset edge to the nearest edge of the region ring
  const rcx = (R.x0 + R.x1) / 2, rcy = (R.y0 + R.y1) / 2, dx = rcx - at[0], dy = rcy - at[1];
  const kI = Math.min((w / 2) / Math.max(1e-3, Math.abs(dx)), (h / 2) / Math.max(1e-3, Math.abs(dy))), sx = at[0] + dx * Math.min(1, kI), sy = at[1] + dy * Math.min(1, kI);
  const hw = (R.x1 - R.x0) / 2 + 6, hh = (R.y1 - R.y0) / 2 + 6, kR = Math.min(hw / Math.max(1e-3, Math.abs(dx)), hh / Math.max(1e-3, Math.abs(dy))), ex = rcx - dx * kR, ey = rcy - dy * kR;
  path.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`); dot.setAttribute('cx', ex.toFixed(1)); dot.setAttribute('cy', ey.toFixed(1));
  svg.style.display = lead ? '' : 'none';
  return { el: mag, ring, refresh, set(a = 1) { a = clamp(a); for (const e of [mag, ring, svg]) vis(e, a); mag.style.transform = `scale(${lerp(0.92, 1, util.sm(a)).toFixed(3)})`; } };
}

/**
 * Screen-in-studio framing: a large floating screen with a thin house rim, for a flat page (lib/house/flat.js) where Nico and the
 * student stand beside it. The UI inside is built at its design size and scaled to fit.
 * o: {x, y, w, h (screen rect on the 1920×1080 page), design: [dw, dh] (the frame's size), parent (flat.content)} → {el, glass, fit, scale, put(frameEl), toPage([x, y]) (design px → page px)}
 */
export function studioScreen({ x = 330, y = 120, w = 1260, h = 720, design = [1600, 900], parent = document.body } = {}) {
  const el = node(`<div class="az-x-screen" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><span class="h-corners"><i></i><i></i><i></i><i></i></span><div class="glass"><div class="fit"></div></div></div>`);
  parent.append(el); const glass = el.querySelector('.glass'), fit = el.querySelector('.fit');
  const s = (w - 24) / design[0]; fit.style.transform = `scale(${s.toFixed(5)})`; fit.style.width = design[0] + 'px'; fit.style.height = design[1] + 'px';
  return { el, glass, fit, scale: s, put(f) { fit.append(f.el || f); return f; }, toPage: ([dx, dy]) => [x + 14 + dx * s, y + 14 + dy * s] };
}

/** Camera targets for a frame placed in a kit world (K.stage) at (fx, fy): the whole frame, or a push-in on a box (frame px). */
export const shot = {
  full: (fx = 0, fy = 0) => ({ x: fx + 960, y: fy + 513, zoom: 1 }),
  on: (fx, fy, b, zoom = 1.3) => ({ x: fx + (b.x0 + b.x1) / 2, y: fy + (b.y0 + b.y1) / 2, zoom }),
};

// ------------------------------------------------------------------------------------------------ zh-TW Azure portal (experiment 21): lib/azure/portal.js, AZURE.md §7
export * from './portal.js';
