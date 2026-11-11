import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { renderUpgradeContent } = require("../src/license/upgrade");

class Element {
  constructor(tag, opts = {}) {
    this.tag = tag; this.text = opts.text || ""; this.cls = opts.cls || "";
    this.attributes = { ...opts.attr }; this.children = []; this.events = {};
  }
  createEl(tag, opts) { const child = new Element(tag, opts); this.children.push(child); return child; }
  addClass(name) { this.cls += ` ${name}`; }
  setAttribute(name, value) { this.attributes[name] = value; }
  setText(value) { this.text = value; }
  addEventListener(name, fn) { this.events[name] = fn; }
  all() { return [this, ...this.children.flatMap(child => child.all())]; }
  querySelector(selector) { return this.all().find(el => el.cls.split(" ").includes(selector.slice(1))); }
}
function setup(active = false, link = "https://checkout.example/test") {
  const root = new Element("div");
  const close = vi.fn(), checkout = vi.fn();
  const plugin = {
    settings: { language: "zh-tw", licenseValid: active },
    manifest: { id: "engram-quest", dir: "custom/plugins/engram-quest" },
    app: { vault: { configDir: "custom", adapter: { getResourcePath: path => `app://${path}` } } },
    license: { config: { environment: "sandbox", checkoutUrl: link } },
  };
  renderUpgradeContent(root, plugin, { close, checkout });
  return { root, close, checkout };
}

describe("Pro upgrade overview", () => {
  it("shows four shipped features and uses separate theme assets", () => {
    const { root } = setup();
    expect(root.all().filter(el => el.cls === "eq-pro-feature")).toHaveLength(4);
    expect(root.querySelector(".eq-pro-research")).toBeFalsy();
    const images = root.all().filter(el => el.tag === "img");
    expect(images.map(el => el.src)).toEqual([
      "app://custom/plugins/engram-quest/assets/pro/learning-notebook-light.webp",
      "app://custom/plugins/engram-quest/assets/pro/learning-notebook-dark.webp",
    ]);
  });
  it("opens details on demand and preserves an accessible expanded state", () => {
    const { root } = setup();
    const button = root.querySelector(".eq-pro-feature-toggle");
    const detail = root.querySelector(".eq-pro-detail");
    expect(detail.hidden).toBe(true);
    button.events.click();
    expect(detail.hidden).toBe(false);
    expect(button.attributes["aria-expanded"]).toBe("true");
    button.events.click();
    expect(button.attributes["aria-expanded"]).toBe("false");
  });
  it("only purchases after an explicit action; continuing free closes without checkout", () => {
    const { root, close, checkout } = setup();
    expect(checkout).not.toHaveBeenCalled();
    const buttons = root.querySelector(".eq-pro-actions").children;
    buttons[1].events.click();
    expect(close).toHaveBeenCalledOnce();
    expect(checkout).not.toHaveBeenCalled();
    buttons[0].events.click();
    expect(checkout).toHaveBeenCalledOnce();
  });
  it("does not offer another purchase to an activated user", () => {
    const { root, close, checkout } = setup(true);
    const action = root.querySelector(".eq-pro-actions").children[0];
    expect(action.text).toBe("Pro 已啟用");
    action.events.click();
    expect(close).toHaveBeenCalledOnce();
    expect(checkout).not.toHaveBeenCalled();
  });
  it("disables checkout when a link is not configured", () => {
    const { root } = setup(false, "");
    expect(root.querySelector(".eq-pro-actions").children[0].disabled).toBe(true);
  });
});
