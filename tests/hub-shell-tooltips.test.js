// Tooltips on the desktop Hub frame (ticket-043). Obsidian shows an element's `aria-label` as its own
// tooltip, and the browser shows a `title` (the element's, or an ancestor's) as a second one. A
// sidebar item whose name is on screen beside its icon needs neither: the tooltip only covered the
// next item. In the icon rail (folded by the user, or a narrow window) the name is not on screen, so
// the item carries it as `aria-label`: the accessible name, and the one tooltip.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// esbuild inlines the teachers' photos and voice samples; here a file name stands in for each.
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const { renderShell } = require("../src/hub/shell.js");
const { setCollapsed, RAIL_MAX_WIDTH } = require("../src/hub/sidebar.js");

// Stands in for an Obsidian element and keeps what was drawn.
class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag;
    this.children = [];
    this.parent = null;
    this.text = opts.text ?? "";
    this.cls = new Set(String(opts.cls || "").split(" ").filter(Boolean));
    this.attrs = { ...(opts.attr || {}) };
    this.listeners = {};
    this.isConnected = true;
    this.classList = { toggle: (name, on) => (on ? this.cls.add(name) : this.cls.delete(name)), add: (name) => this.cls.add(name) };
  }
  createEl(tag, opts) { const el = new FakeEl(tag, opts); el.parent = this; this.children.push(el); return el; }
  appendChild(child) { return child; }
  empty() { this.children = []; }
  hasClass(name) { return this.cls.has(name); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
  removeAttribute(name) { delete this.attrs[name]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach((fn) => fn({})); }
  querySelectorAll() { return []; }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this.text = value; this.children = []; }
}

const drawn = (el) => el.children.flatMap((child) => [child, ...drawn(child)]);
const within = (el, cls) => { for (let at = el; at; at = at.parent) if (at.hasClass(cls)) return true; return false; };
// What the browser would show as a native tooltip: the nearest `title`, the element's own or an ancestor's.
const nativeTip = (el) => { for (let at = el; at; at = at.parent) if (at.attrs.title) return at.attrs.title; return null; };

let media;
function drawHub(settings = {}) {
  const hub = {
    app: {},
    plugin: { settings: { language: "zh-tw", ...settings }, saveData: async () => {} },
    contentEl: new FakeEl(),
    decks: [],
    _decksReady: Promise.resolve(),
    viewModes: {},
    activeTab: "review",
    _needsFor: () => [],
    _renderTab() {},
    _maybeShowGuide() {},
    _minimize() {},
    close() {},
  };
  renderShell(hub);
  const all = drawn(hub.contentEl);
  const side = all.filter((el) => within(el, "lh-side"));
  return {
    hub,
    all,
    nav: side.filter((el) => el.hasClass("lh-nv")),
    pro: side.find((el) => el.hasClass("lh-pro")),
    fold: side.find((el) => el.hasClass("lh-side-fold")),
    help: side.find((el) => el.hasClass("lh-ib")),
    windowButtons: all.filter((el) => el.tag === "button" && within(el, "lh-capsule")),
    buttons: all.filter((el) => el.tag === "button"),
  };
}

beforeEach(() => {
  media = { matches: false, query: "", listeners: [], addEventListener(type, fn) { this.listeners.push(fn); }, removeEventListener(type, fn) { this.listeners = this.listeners.filter((x) => x !== fn); } };
  globalThis.activeWindow = { matchMedia: (query) => { media.query = query; return media; } };
});
afterEach(() => { delete globalThis.activeWindow; });

describe("desktop Hub frame tooltips", () => {
  it("never gives one element two tooltips", () => {
    for (const settings of [{}, { _sidebar: { pages: true } }]) {
      const { buttons } = drawHub(settings);
      expect(buttons.length).toBeGreaterThan(10);
      const doubled = buttons.filter((el) => el.attrs["aria-label"] && nativeTip(el)).map((el) => `${[...el.cls][0]}: ${el.attrs["aria-label"]} + ${nativeTip(el)}`);
      expect(doubled).toEqual([]);
    }
  });

  it("shows no tooltip on an item whose name is beside it", () => {
    const { nav, pro } = drawHub();
    expect(nav.length).toBeGreaterThanOrEqual(7);
    for (const item of [...nav, pro]) {
      expect(item.attrs["aria-label"], item.textContent).toBeUndefined();
      expect(nativeTip(item), item.textContent).toBeNull();
      expect(item.textContent.trim()).not.toBe("");
    }
    expect(nav.map((item) => item.textContent)).toContain("Quest Map");
  });

  it("names each item, with its group, once the user folds the sidebar into the icon rail", () => {
    const { nav, pro } = drawHub({ _sidebar: { pages: true } });
    expect(nav.map((item) => item.attrs["aria-label"])).toContain("學習：Quest Map");
    expect(nav.every((item) => item.attrs["aria-label"])).toBe(true);
    expect(pro.attrs["aria-label"]).toBe(pro.textContent);
    // Obsidian puts a tooltip under its element unless told otherwise; beside the rail it covers nothing.
    for (const item of [...nav, pro]) expect(item.attrs["data-tooltip-position"]).toBe("right");
  });

  it("follows the fold button", () => {
    const { nav, fold } = drawHub();
    fold.click();
    expect(nav.every((item) => item.attrs["aria-label"])).toBe(true);
    fold.click();
    expect(nav.some((item) => "aria-label" in item.attrs)).toBe(false);
  });

  it("names each item in a window narrow enough for the automatic rail, and stops when it widens", () => {
    media.matches = true;
    const { nav } = drawHub();
    expect(media.query).toBe(`(max-width:${RAIL_MAX_WIDTH}px)`);
    expect(nav.every((item) => item.attrs["aria-label"])).toBe(true);
    media.matches = false;
    media.listeners.forEach((fn) => fn());
    expect(nav.some((item) => "aria-label" in item.attrs)).toBe(false);
  });

  it("stops watching the window width once the Hub is gone", () => {
    const { hub } = drawHub();
    expect(media.listeners).toHaveLength(1);
    hub.contentEl.children.forEach((el) => { el.isConnected = false; });
    media.listeners.forEach((fn) => fn());
    expect(media.listeners).toHaveLength(0);
  });

  it("keeps a name on every button that is only an icon", () => {
    const settings = {};
    for (const folded of [false, true]) {
      setCollapsed(settings, false, folded);
      const { fold, help, windowButtons } = drawHub(settings);
      expect(fold.attrs["aria-label"]).toBe(folded ? "展開側欄" : "收合側欄");
      expect(fold.attrs["aria-expanded"]).toBe(String(!folded));
      expect(help.attrs["aria-label"]).toBe("開啟說明");
      expect(windowButtons.map((el) => el.attrs["aria-label"])).toEqual(["縮小成浮動按鈕", "關閉"]);
    }
  });
});
