// Phone fixes: the top bar clears the status bar, back is a real button, and a wide diagram in a card
// can be seen in full instead of being cut at the card's edge.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chooseLayout, MIN_SCALE } = require("../src/ui/diagram-fit.js");
const ui = require("../src/hub/ui.js");
const hubCss = String(require("../src/styles/hub"));
const pagesCss = String(require("../src/styles/hub-pages"));
const videoCss = String(require("../src/videos/styles"));

class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag; this.children = []; this.textContent = opts.text ?? "";
    this.cls = String(opts.cls || ""); this.attrs = {}; this.listeners = {};
  }
  createEl(tag, opts) { const el = new FakeEl(tag, opts); this.children.push(el); return el; }
  appendChild(child) { return child; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
}

describe("wide diagrams", () => {
  it("keeps a diagram that fits at its own size", () => {
    expect(chooseLayout(300, 340)).toEqual({ mode: "natural", width: 300 });
  });
  it("shrinks a diagram to the card while the text stays readable", () => {
    expect(chooseLayout(400, 340)).toEqual({ mode: "fit", width: 340 });
    expect(chooseLayout(340 / MIN_SCALE, 340).mode).toBe("fit");
  });
  it("scrolls sideways, at the smallest readable size, once shrinking would go below it", () => {
    expect(chooseLayout(1000, 340)).toEqual({ mode: "scroll", width: Math.round(1000 * MIN_SCALE) });
  });
  it("waits when the width is not known yet", () => {
    expect(chooseLayout(0, 340).width).toBe(0);
    expect(chooseLayout(800, 0).width).toBe(0);
  });
});

describe("phone back button", () => {
  it("draws a chevron icon and drops the old ‹ from the label", () => {
    const parent = new FakeEl();
    let clicked = 0;
    const btn = ui.backButton(parent, "‹ 返回書架", () => clicked++);
    expect(btn.cls).toBe("lh-back-pill");
    expect(btn._lhBackLabel.textContent).toBe("返回書架");
    expect(btn.attrs["aria-label"]).toBe("返回書架");
    btn.listeners.click[0]();
    expect(clicked).toBe(1);
    ui.setBackLabel(btn, "牌組");
    expect(btn._lhBackLabel.textContent).toBe("牌組");
  });
  it("is at least a finger wide and tall", () => {
    expect(hubCss).toMatch(/button\.lh-back-pill\.lh-back-pill \{[^}]*height:36px[^}]*min-width:44px/);
    // The 36px capsule grows to a 44px touch target.
    expect(hubCss).toMatch(/button\.lh-back-pill\.lh-back-pill::before \{[^}]*inset:-4px -4px/);
  });
});

describe("status bar", () => {
  it("prefers Obsidian's safe-area inset, which Android fills while env() reads 0", () => {
    expect(hubCss).toContain("--lh-safe-top:max(var(--safe-area-inset-top,0px),env(safe-area-inset-top,0px))");
    expect(hubCss).toMatch(/body\.is-android \{ --lh-safe-top:max\([^}]*24px\)/);
  });
  it("leaves no full-screen page on env() alone", () => {
    const rules = [hubCss, pagesCss, videoCss].join("\n").replace(/--lh-safe-(top|bottom):max\([^;]*\);/g, "");
    expect(rules).not.toMatch(/env\(safe-area-inset/);
  });
  it("puts the review session's top bar below the status bar", () => {
    expect(pagesCss).toMatch(/\.lh-snav \{[^}]*padding:calc\(var\(--lh-safe-top\) \+ 6px\)/);
  });
});
