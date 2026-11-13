"use strict";
// Shared building blocks for Hub pages. Markup and class names follow spec-design.md §3.

const I = require("obsidian");
const { t: c } = require("../i18n");
const { attachInfoButton } = require("./feature-guide");
const { assetUrl } = require("../assets");

const PATHS = {
  deck: '<rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M7 5h10"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
  map: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-4M8.2 13l7.6 4"/>',
  recall: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4.5l3 1.5"/>',
  book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5c4-2 7 2 12 0v9c-5 2-8-2-12 0"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  medal: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.9"/><path d="M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  minimize: '<path d="M6 12h12"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  list: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  fold: '<path d="m11 6-6 6 6 6"/><path d="m18 6-6 6 6 6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>',
  learn: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/>',
  sidebar: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M15 5v14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="2.6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  'circle-check': '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7 5.3-5.4"/>',
  'circle-dash': '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3.3"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  arrow: '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  back: '<path d="M20 12H5"/><path d="m11 6-6 6 6 6"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  sparkle: '<path d="M12 3.5c.6 4.4 2.2 6 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.5 5.9-2.1 6.5-6.5z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  upload: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2"/><path d="M5.5 9v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  download: '<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M5 19.5h14"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="m7.5 9.5 3 2.5-3 2.5"/><path d="M13 14.5h3.5"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.5L4 19.5l1.5-4.3A7.5 7.5 0 1 1 20 11.5z"/>',
  layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
};
const STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 5.8 3.7 9 9.5 9.5-5.8.5-9 3.7-9.5 9.5-.5-5.8-3.7-9-9.5-9.5 5.8-.5 9-3.7 9.5-9.5z"/></svg>';
const PLAY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

function icon(parent, name) {
  parent.appendChild(I.sanitizeHTMLToDom(`<svg xmlns="http://www.w3.org/2000/svg" class="lh-i" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`));
  return parent;
}
function rawIcon(parent, svg) { parent.appendChild(I.sanitizeHTMLToDom(svg)); return parent; }

function iconButton(parent, name, label, onClick, cls = "lh-ib") {
  // The label is the accessible name and, in Obsidian, the tooltip. A `title` beside it would add the
  // browser's own tooltip on top.
  const btn = icon(parent.createEl("button", { cls, attr: { "aria-label": label } }), name);
  btn.addEventListener("click", onClick);
  return btn;
}

function isPhone() { return activeDocument.body.classList.contains("is-phone"); }

function isDark() { return activeDocument.body.classList.contains("theme-dark"); }

// Keeps `.lh-dark` (and, with `vars`, the Obsidian variables) on a dialog in step with
// Obsidian's theme while it is open.
function watchTheme(modal, { vars = false, onChange } = {}) {
  const paint = () => {
    modal.modalEl.toggleClass("lh-dark", isDark());
    if (vars) applyHubVars(modal.modalEl, isDark());
  };
  paint();
  // onChange is for content drawn per theme (images, inline colours) that CSS alone cannot swap.
  const ref = modal.app.workspace.on("css-change", () => { paint(); if (onChange) onChange(); });
  const close = modal.onClose;
  modal.onClose = function (...args) { modal.app.workspace.offref(ref); return close.apply(this, args); };
  return modal;
}

// Glass feature icons (assets/hub-icons). Both theme variants are in the DOM and CSS shows the
// one that matches `.lh-dark`, so a theme switch needs no re-render. A missing file falls back
// to the line icon.
function iconUrl(plugin, theme, id, px) {
  return assetUrl(plugin.app, `assets/hub-icons/${theme}/${id}-${px}.webp`);
}
function featureIcon(parent, plugin, id, { size = 32, fallback } = {}) {
  const wrap = parent.createEl("span", { cls: "lh-fi", attr: { style: `--fi:${size}px`, "aria-hidden": "true" } });
  const px = size > 32 ? 128 : 64;
  ["light", "dark"].forEach((theme) => {
    const img = wrap.createEl("img", { cls: "lh-fi-" + theme, attr: { src: iconUrl(plugin, theme, id, px), alt: "", width: String(size), height: String(size), draggable: "false" } });
    img.addEventListener("error", () => {
      if (wrap.hasClass("is-fallback")) return;
      wrap.empty();
      wrap.addClass("is-fallback");
      if (fallback) icon(wrap, fallback);
    });
  });
  return wrap;
}

// Pages and dialogs still read Obsidian's variables; point them at the Hub's neutrals.
function applyHubVars(el, dark) {
  const vars = dark
    ? { "--background-primary": "#232326", "--background-secondary": "#2C2C30", "--text-normal": "#F5F5F7", "--text-muted": "#B0B0B9", "--background-modifier-border": "rgba(235,235,245,.12)" }
    : { "--background-primary": "#FFFFFF", "--background-secondary": "#F5F5F7", "--text-normal": "#1D1D1F", "--text-muted": "#62626A", "--background-modifier-border": "rgba(60,60,67,.12)" };
  for (const k in vars) el.style.setProperty(k, vars[k], "important");
}

// The round button that brings a minimized Hub or review back. It lives on <body>, outside any
// themed dialog, so it carries the theme classes itself.
function restoreButton(plugin, label, onClick) {
  const btn = activeDocument.body.createEl("button", { cls: "lh-theme lh-fab" + (isDark() ? " lh-dark" : ""), attr: { "aria-label": label, title: label } });
  featureIcon(btn, plugin, "logo", { size: 30, fallback: "book" });
  btn.addEventListener("click", onClick);
  const ref = plugin.app.workspace.on("css-change", () => btn.toggleClass("lh-dark", isDark()));
  const remove = btn.remove.bind(btn);
  btn.remove = () => { plugin.app.workspace.offref(ref); remove(); };
  return btn;
}

// A dialog opened outside the Hub element still needs the design tokens.
function themedModal(modal) {
  modal.modalEl.addClass("lh-theme");
  return watchTheme(modal);
}

// A page header. On a phone the sub-page bar already shows the title and guide button.
function pageHeader(parent, hub, { titleKey, title, guide, subtitle, count }) {
  const t = hub.plugin.settings;
  const hd = parent.createEl("div", { cls: "lh-hd" });
  const main = hd.createEl("div", { cls: "lh-hd-main" });
  if (!isPhone()) {
    const row = main.createEl("div", { cls: "lh-hd-title" });
    row.createEl("h1", { cls: "lh-tt", text: title || c(t, titleKey) });
    if (guide) attachInfoButton(row, hub.app, hub.plugin, guide);
    if (count != null) row.createEl("span", { cls: "lh-count", text: count });
  }
  if (subtitle) main.createEl("p", { cls: "lh-sub", text: subtitle });
  return { hd, right: () => hd.createEl("div", { cls: "lh-hd-right" }) };
}

// A phone sub-page can take over the bar (the player's "back to shelf"); null restores the page's own.
function setPhoneNav(hub, over) {
  const nav = hub.phoneNav;
  if (!nav) return;
  nav.onBack = over ? over.onBack : null;
  nav.back.textContent = over ? over.label : nav.backLabel;
  nav.title.textContent = over ? over.title : nav.titleText;
  nav.side.style.visibility = over ? "hidden" : "";
}

// A page can add its own button to the window capsule; the shell clears them on tab change.
function clearCapsuleActions(hub) {
  if (hub.capsuleEl) hub.capsuleEl.querySelectorAll(".lh-cap-x").forEach(el => el.remove());
}

function primaryButton(parent, text, onClick, { alt = false, play = false, small = false, icon: glyph } = {}) {
  const cls = (isPhone() && !small ? "lh-pbtn" : "lh-btn") + (alt ? " alt" : "");
  const btn = parent.createEl("button", { cls });
  if (play) rawIcon(btn, PLAY);
  else if (glyph) icon(btn, glyph);
  btn.createEl("span", { text });
  btn.addEventListener("click", onClick);
  return btn;
}

// tone: td/tn/tm/tl. A zero never takes a data colour.
function metrics(parent, items) {
  const wrap = parent.createEl("div", { cls: "lh-mets" });
  items.forEach(({ value, label, tone }) => {
    const m = wrap.createEl("div", { cls: "lh-met" });
    m.createEl("b", { text: String(value) });
    m.createEl("span", { text: label, cls: tone && Number(value) > 0 ? tone : "" });
  });
  return wrap;
}

function segBar(parent, parts) {
  const bar = parent.createEl("div", { cls: "lh-sb" });
  parts.filter(p => p.pct > 0).forEach(p => bar.createEl("i", { attr: { style: `width:${p.pct}%;background:var(--${p.color})` } }));
  return bar;
}

// segments: [{ pct, color }], clockwise from 12 o'clock over a neutral ring. Returns the centre element.
function donut(parent, segments, { size, stroke, gap = 0 }) {
  const doc = parent.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const wrap = parent.createEl("div", { cls: "lh-dn", attr: { style: `width:${size}px;height:${size}px` } });
  const svg = doc.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  const mid = size / 2, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const ring = (color, length, start) => {
    const circle = doc.createElementNS(ns, "circle");
    circle.setAttribute("cx", String(mid));
    circle.setAttribute("cy", String(mid));
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-width", String(stroke));
    circle.style.stroke = `var(--${color})`;
    if (length != null) {
      circle.setAttribute("stroke-dasharray", `${length} ${circ - length}`);
      circle.setAttribute("stroke-dashoffset", String(-start));
      circle.setAttribute("transform", `rotate(-90 ${mid} ${mid})`);
    }
    svg.appendChild(circle);
  };
  ring("trk");
  let at = 0;
  segments.forEach(({ pct, color }) => {
    const length = pct / 100 * circ;
    if (length > gap) ring(color, length - gap, at);
    at += length;
  });
  wrap.appendChild(svg);
  return wrap.createEl("div", { cls: "lh-dnc" });
}

function track(parent, pct, ok) {
  const el = parent.createEl("div", { cls: "lh-track" + (ok ? " ok" : "") });
  el.createEl("i", { attr: { style: `width:${Math.max(0, Math.min(100, pct))}%` } });
  return el;
}

function segmented(parent, options, value, onChange, cls = "") {
  const seg = parent.createEl("div", { cls: "lh-seg " + cls, attr: { role: "group" } });
  const buttons = options.map(({ value: v, label, icon: name, title }) => {
    const btn = seg.createEl("button", { cls: v === value ? "on" : "", attr: { "aria-pressed": String(v === value), ...(title ? { title, "aria-label": title } : {}) } });
    if (name) icon(btn, name); else btn.textContent = label;
    btn.addEventListener("click", () => {
      buttons.forEach(([b, x]) => { b.classList.toggle("on", x === v); b.setAttribute("aria-pressed", String(x === v)); });
      onChange(v);
    });
    return [btn, v];
  });
  return seg;
}

// The first option is the default; any other value shows in the tint colour. A sort control always does.
function filterSelect(parent, options, value, onChange, { sort = false, label } = {}) {
  const sel = parent.createEl("select", { cls: "lh-fp", attr: label ? { "aria-label": label, title: label } : {} });
  options.forEach(([v, text]) => { sel.createEl("option", { text, attr: { value: v } }).selected = v === value; });
  const paint = () => sel.classList.toggle("is-set", sort || sel.selectedIndex > 0);
  paint();
  sel.addEventListener("change", () => { paint(); onChange(sel.value); });
  return sel;
}

function sortSelect(parent, t, options, value, onChange) {
  const prefix = c(t, "SORT_PREFIX");
  return filterSelect(parent, options.map(([v, key]) => [v, prefix + c(t, key)]), value, onChange, { sort: true, label: prefix });
}

// A searchable tag menu. Returns an object whose `value` is the current tag, or "all".
function tagFilter(parent, hub, tags, onChange) {
  const t = hub.plugin.settings;
  const selected = { value: "all" };
  const allLabel = c(t, "FILTER_ALL_TAGS");
  const wrap = parent.createEl("div", { cls: "lh-tf" });
  const btn = wrap.createEl("button", { cls: "lh-fp", text: allLabel, attr: { "aria-haspopup": "true", "aria-expanded": "false" } });
  const drop = wrap.createEl("div", { cls: "lh-tf-drop" });
  const input = drop.createEl("input", { attr: { type: "text", placeholder: c(t, "SEARCH_TAG"), "aria-label": c(t, "SEARCH_TAG") } });
  const list = drop.createEl("div", { cls: "lh-tf-list" });
  const setOpen = (open) => { drop.classList.toggle("on", open); btn.setAttribute("aria-expanded", String(open)); };
  const pick = (value, label) => {
    selected.value = value;
    btn.textContent = label;
    btn.classList.toggle("is-set", value !== "all");
    setOpen(false);
    onChange();
  };
  const option = (value, label) => {
    list.createEl("button", { cls: "lh-tf-opt" + (selected.value === value ? " on" : ""), text: label }).addEventListener("click", () => pick(value, label));
  };
  const paint = (query) => {
    list.empty();
    option("all", allLabel);
    [...tags].sort().filter(tag => tag.toLowerCase().includes(query.toLowerCase())).forEach(tag => option(tag, tag));
  };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const open = !drop.classList.contains("on");
    setOpen(open);
    if (open) { input.value = ""; paint(""); window.setTimeout(() => input.focus(), 0); }
  });
  input.addEventListener("input", () => paint(input.value));
  drop.addEventListener("click", ev => ev.stopPropagation());
  const close = () => setOpen(false);
  activeDocument.addEventListener("click", close);
  (hub._tagFilterCleanups = hub._tagFilterCleanups || []).push(() => activeDocument.removeEventListener("click", close));
  return selected;
}

function confirmDialog(app, t, { title, body, onConfirm }) {
  const modal = themedModal(new I.Modal(app));
  modal.modalEl.addClass("lh-confirm");
  const wrap = modal.contentEl;
  wrap.createEl("div", { cls: "lh-confirm-title", text: title });
  wrap.createEl("div", { cls: "lh-confirm-body", text: body });
  const row = wrap.createEl("div", { cls: "lh-confirm-acts" });
  row.createEl("button", { cls: "lh-btn alt", text: c(t, "DELETE_CANCEL_BTN") }).addEventListener("click", () => modal.close());
  const del = row.createEl("button", { cls: "lh-btn danger", text: c(t, "DELETE_CONFIRM_BTN") });
  del.addEventListener("click", async () => {
    if (del.disabled) return;
    del.disabled = true;
    modal.close();
    await onConfirm();
  });
  modal.open();
}

function emptyState(parent, { iconName, title, body }) {
  const wrap = parent.createEl("div", { cls: "lh-emp" });
  icon(wrap.createEl("span", { cls: "lh-gi" }), iconName);
  wrap.createEl("b", { text: title });
  wrap.createEl("p", { text: body });
  return wrap;
}

function searchBox(parent, { placeholder, value, onInput, width, grow }) {
  const box = parent.createEl("div", { cls: "lh-sf" + (grow ? " lh-grow" : ""), attr: width ? { style: `width:${width}px` } : {} });
  icon(box, "search");
  const input = box.createEl("input", { attr: { type: "text", placeholder, "aria-label": placeholder, value: value || "" } });
  input.addEventListener("input", () => onInput(input.value));
  return input;
}

const VIEW_MODES = [["list", "list", "VIEW_LIST"], ["grid", "grid", "VIEW_GRID"], ["tree", "folder", "VIEW_TREE"]];

async function saveViewMode(hub, mode) {
  hub.viewMode = mode;
  hub.viewModes[hub.activeTab] = mode;
  hub.plugin.settings._viewModes = hub.viewModes;
  await hub.plugin.saveData(hub.plugin.settings);
}

// Desktop: three-way segmented control. Phone: one button that cycles, showing the current mode.
function viewToggle(parent, hub, onChange) {
  const t = hub.plugin.settings;
  if (isPhone()) {
    const btn = parent.createEl("button", { cls: "lh-pcycle", attr: { "aria-label": c(t, "VIEW_CYCLE"), title: c(t, "VIEW_CYCLE") } });
    const paint = () => { btn.empty(); icon(btn, (VIEW_MODES.find(m => m[0] === hub.viewMode) || VIEW_MODES[0])[1]); };
    paint();
    btn.addEventListener("click", async () => {
      const at = VIEW_MODES.findIndex(m => m[0] === hub.viewMode);
      await saveViewMode(hub, VIEW_MODES[(at + 1) % VIEW_MODES.length][0]);
      paint();
      onChange();
    });
    return btn;
  }
  return segmented(parent, VIEW_MODES.map(([value, name, key]) => ({ value, icon: name, title: c(t, key) })), hub.viewMode, async (mode) => {
    await saveViewMode(hub, mode);
    onChange();
  }, "lh-vt");
}

function rowActions(parent, actions) {
  const wrap = parent.createEl("div", { cls: isPhone() ? "lh-ra-phone" : "lh-ra" });
  actions.forEach(({ name, label, run }) => {
    iconButton(wrap, name, label, (ev) => { ev.stopPropagation(); run(); }, isPhone() ? "lh-pact" : "");
  });
  return wrap;
}

module.exports = { STAR, PLAY, icon, rawIcon, iconButton, isPhone, isDark, watchTheme, iconUrl, featureIcon, restoreButton, applyHubVars, themedModal, setPhoneNav, pageHeader, clearCapsuleActions, primaryButton, metrics, segBar, donut, track, segmented, filterSelect, sortSelect, tagFilter, confirmDialog, emptyState, searchBox, viewToggle, rowActions };
