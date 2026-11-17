// Highlight and quote beside a selection (src/ui/selection-toolbar.js): the bar appears next to the
// selected text, on the side with room, and acts on the text it was shown for.
import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { drawCard, drawn, find } from "./helpers/review-card.js";

const require = createRequire(import.meta.url);
const { attachSelectionToolbar, placeBar } = require("../src/ui/selection-toolbar.js");

const rect = (top, bottom, left = 0, right = 600) => ({ top, bottom, left, right });
const BAR = { width: 160, height: 40 };

describe("where the bar goes", () => {
  const host = rect(0, 2000), view = rect(100, 700);

  it("sits above the selection on a desktop", () => {
    const pos = placeBar(rect(300, 320, 200, 300), host, view, BAR, "above");
    expect(pos).toEqual({ top: 300 - 40 - 8, left: 250 - 80, above: true });
  });

  it("goes below when the selection is at the top of the visible area", () => {
    const pos = placeBar(rect(110, 130, 200, 300), host, view, BAR, "above");
    expect(pos.above).toBe(false);
    expect(pos.top).toBe(130 + 8);
  });

  it("sits below the selection on a phone, clear of the system's drag handles", () => {
    const pos = placeBar(rect(300, 320), host, view, BAR, "below");
    expect(pos.above).toBe(false);
    expect(pos.top).toBe(320 + 8 + 20);
  });

  it("goes above on a phone when the selection is at the bottom of the visible area", () => {
    expect(placeBar(rect(660, 690), host, view, BAR, "below").above).toBe(true);
  });

  it("stays inside the answer at the left and right edges", () => {
    expect(placeBar(rect(300, 320, 0, 20), host, view, BAR, "above").left).toBe(0);
    expect(placeBar(rect(300, 320, 580, 600), host, view, BAR, "above").left).toBe(600 - 160);
  });

  it("stays in view when the selection is taller than the visible area", () => {
    const pos = placeBar(rect(50, 900), host, view, BAR, "above");
    expect(pos.top).toBeGreaterThanOrEqual(100);
    expect(pos.top + BAR.height).toBeLessThanOrEqual(700);
  });

  it("gives positions relative to the answer, which scrolls with the text", () => {
    const pos = placeBar(rect(300, 320, 200, 300), rect(250, 900, 40, 640), view, BAR, "above");
    expect(pos).toEqual({ top: 252 - 250, left: 170 - 40, above: true });
  });
});

class FakeEl {
  constructor(doc, tag = "div") {
    this.ownerDocument = doc; this.tagName = tag; this.children = []; this.parentElement = null;
    this.listeners = {}; this.classes = new Set(); this.style = {}; this.offsetWidth = 160; this.offsetHeight = 40;
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, ev = {}) { (this.listeners[type] || []).forEach((fn) => fn(ev)); }
  createDiv(o = {}) { return this.createEl("div", o); }
  createEl(tag, o = {}) {
    const el = new FakeEl(this.ownerDocument, tag);
    el.parentElement = this; this.children.push(el);
    if (o.cls) el.classes.add(o.cls);
    if (o.text) el.textContent = o.text;
    return el;
  }
  addClass(c) { this.classes.add(c); }
  removeClass(c) { this.classes.delete(c); }
  contains(n) { for (let x = n; x; x = x.parentElement) if (x === this) return true; return false; }
  getBoundingClientRect() { return this.rect || rect(0, 2000); }
}

// scroller: { rect, paddingBottom } puts the answer in a scrolling area, as the review card is.
function setup({ prefer, scroller, selRect = rect(300, 320, 200, 300) } = {}) {
  let sel = null; // { text, node }
  const frames = [];
  const win = {
    getSelection: () => sel
      ? { rangeCount: 1, isCollapsed: false, toString: () => sel.text, anchorNode: sel.node, focusNode: sel.node,
          getRangeAt: () => ({ getBoundingClientRect: () => selRect }), removeAllRanges: () => { sel = null; } }
      : { rangeCount: 0, isCollapsed: true, removeAllRanges: () => {} },
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    getComputedStyle: (el) => (el.scroll ? { overflowY: "auto", paddingTop: "0px", paddingBottom: `${el.scroll.paddingBottom}px` } : { overflowY: "visible" }),
  };
  const doc = { defaultView: win, listeners: {} };
  doc.documentElement = { getBoundingClientRect: () => rect(0, 800) };
  const docOn = (type, fn) => { (doc.listeners[type] ||= []).push(fn); };
  const docFire = (type, ev = {}) => (doc.listeners[type] || []).forEach((fn) => fn(ev));
  const owner = { registerDomEvent: (_t, type, fn) => docOn(type, fn) };
  const root = new FakeEl(doc);
  if (scroller) { root.scroll = scroller; root.rect = scroller.rect; }
  const host = root.createDiv();
  const target = host.createDiv();
  const inside = target.createDiv();
  const outside = new FakeEl(doc);
  const highlight = vi.fn(), quote = vi.fn();
  const bar = attachSelectionToolbar({ host, target, owner, prefer, actions: [{ label: "Highlight", run: highlight }, { label: "Quote", run: quote }] });
  const flush = () => { while (frames.length) frames.shift()(); };
  const select = (text, node = inside) => { sel = text ? { text, node } : null; docFire("selectionchange"); flush(); };
  const [hlBtn, qBtn] = bar.children;
  // A press on a button as the browser delivers it: down, up (to the document too), then the click.
  const press = (btn, { button = 0, clickArrives = true } = {}) => {
    btn.fire("pointerdown", { button });
    docFire("pointerup", { target: btn });
    flush();
    if (clickArrives) btn.fire("click", { detail: 1 });
  };
  return { bar, target, outside, select, flush, docFire, press, hlBtn, qBtn, highlight, quote, shown: () => bar.classes.has("is-shown") };
}

describe("the bar beside a selection", () => {
  it("appears for text selected in the answer and leaves when the selection goes", () => {
    const s = setup();
    expect(s.shown()).toBe(false);
    s.select("cache admission policy");
    expect(s.shown()).toBe(true);
    expect(s.bar.style).toEqual({ top: "252px", left: "170px" });
    s.select(null);
    expect(s.shown()).toBe(false);
  });

  it("ignores a selection outside the answer, and one that is only spaces", () => {
    const s = setup();
    s.select("question text", s.outside);
    expect(s.shown()).toBe(false);
    s.select("   ");
    expect(s.shown()).toBe(false);
  });

  it("runs the pressed button's action on the selected text", () => {
    const s = setup();
    s.select("10 分鐘內被查詢超過 5 次");
    s.press(s.qBtn);
    expect(s.quote).toHaveBeenCalledWith("10 分鐘內被查詢超過 5 次");
    expect(s.highlight).not.toHaveBeenCalled();
    expect(s.shown()).toBe(false);
  });

  it("stays under the finger until a tap's click arrives, even when the tap cleared the selection", () => {
    const s = setup({ prefer: "below" });
    s.select("TTL");
    s.hlBtn.fire("pointerdown", { button: 0 });
    s.select(null); // the system drops the selection on the tap
    s.docFire("pointerup", { target: s.hlBtn });
    s.flush();
    // Still there when the click is sent, so the tap does not fall through to what is under the bar.
    expect(s.shown()).toBe(true);
    s.hlBtn.fire("click", { detail: 1 });
    expect(s.highlight).toHaveBeenCalledWith("TTL");
    expect(s.shown()).toBe(false);
  });

  it("does nothing on a right-click", () => {
    const s = setup();
    s.select("TTL");
    s.press(s.hlBtn, { button: 2, clickArrives: false });
    expect(s.highlight).not.toHaveBeenCalled();
    expect(s.shown()).toBe(true);
  });

  it("lets the bar go when a press is cancelled and the selection is gone", () => {
    const s = setup();
    s.select("TTL");
    s.hlBtn.fire("pointerdown", { button: 0 });
    s.docFire("pointercancel");
    s.select(null);
    expect(s.shown()).toBe(false);
    expect(s.highlight).not.toHaveBeenCalled();
  });

  it("works from the keyboard", () => {
    const s = setup();
    s.select("eviction");
    s.hlBtn.fire("click", { detail: 0 });
    expect(s.highlight).toHaveBeenCalledWith("eviction");
  });

  it("waits until the mouse is let go before showing up while text is being dragged over", () => {
    const s = setup();
    s.target.fire("pointerdown", { pointerType: "mouse", button: 0 });
    s.select("evic");
    expect(s.shown()).toBe(false);
    s.docFire("pointerup", { target: s.target });
    s.flush();
    expect(s.shown()).toBe(true);
  });

  it("keeps the selection when the mouse presses a button", () => {
    const s = setup();
    const ev = { preventDefault: vi.fn() };
    s.hlBtn.fire("mousedown", ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("keeps clear of what floats over the bottom of the scrolling area, such as a phone's rating buttons", () => {
    // Room below the selection only if the 150px reserved for the rating buttons is counted.
    const s = setup({ prefer: "below", scroller: { rect: rect(0, 800), paddingBottom: 150 }, selRect: rect(580, 600, 200, 300) });
    s.select("TTL");
    expect(s.bar.style.top).toBe(`${580 - 8 - 40}px`);
  });
});

describe("in a review card", () => {
  for (const phone of [false, true]) {
    it(`offers the answer header's highlight and quote beside a selection in the answer (${phone ? "phone" : "desktop"})`, async () => {
      const shown = await drawCard({ phone });
      try {
        const block = find(shown.card, "lh-answer-block");
        const bar = find(block, "lh-sel-bar");
        const header = drawn(block).filter((el) => el.hasClass("lh-fmt-btn")).map((el) => el.textContent);
        expect(header).toHaveLength(2);
        expect(bar.children.map((el) => el.textContent)).toEqual(header);
      } finally { shown.done(); }
    });
  }
});
