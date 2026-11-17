// One back step per window (src/ui/back-nav.js): Android's back button / history.back reach the window's
// onHistoryBack, and on iPhone/iPad a swipe in from the left edge does the same.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const obsidian = require("obsidian");
const { useBack, TRIGGER_PX } = require("../src/ui/back-nav.js");

class FakeEl {
  constructor(doc) { this.ownerDocument = doc; this.listeners = {}; this.children = []; this.style = {}; this.parentElement = null; this.scrollLeft = 0; this.classes = new Set(); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
  createDiv() { const el = new FakeEl(this.ownerDocument); el.parentElement = this; this.children.push(el); return el; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((c) => c !== this); }
  toggleClass(cls, on) { if (on) this.classes.add(cls); else this.classes.delete(cls); }
  fire(type, ev) { [...(this.listeners[type] || [])].forEach((fn) => fn(ev)); }
}

function setup({ overlays = [] } = {}) {
  const doc = { body: { querySelectorAll: () => overlays } };
  const root = new FakeEl(doc);
  const back = vi.fn();
  const modal = { containerEl: root, close: vi.fn() };
  useBack(modal, back);
  return { modal, root, back };
}

const touch = (x, y, target) => ({ touches: [{ clientX: x, clientY: y }], target, preventDefault: vi.fn() });
function swipe(root, from, to, target = root) {
  root.fire("touchstart", touch(from[0], from[1], target));
  const moves = [];
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const ev = touch(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, target);
    root.fire("touchmove", ev);
    moves.push(ev);
  }
  root.fire("touchend", { touches: [] });
  return moves;
}

afterEach(() => { delete obsidian.Platform; delete obsidian.setIcon; });

describe("back step for Android's back button and history.back", () => {
  it("runs the window's own back step", () => {
    const { modal, back } = setup();
    modal.onHistoryBack();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("closes an open image or diagram viewer first, and leaves the page where it is", () => {
    const close = { click: vi.fn() };
    const viewer = { querySelector: () => close, click: vi.fn() };
    const { modal, back } = setup({ overlays: [viewer] });
    modal.onHistoryBack();
    expect(close.click).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it("closes the guide's full-screen picture, which has no close button, by tapping it", () => {
    const picture = { querySelector: () => null, click: vi.fn() };
    const { modal, back } = setup({ overlays: [picture] });
    modal.onHistoryBack();
    expect(picture.click).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it("adds no touch handling outside iPhone and iPad", () => {
    const { root } = setup();
    expect(root.listeners.touchstart).toBeUndefined();
  });
});

describe("swipe from the left edge on iPhone and iPad", () => {
  const ios = () => { obsidian.Platform = { isIosApp: true }; obsidian.setIcon = () => {}; };

  it("goes back after a swipe from the edge that goes far enough", () => {
    ios();
    const { root, back } = setup();
    const moves = swipe(root, [6, 300], [6 + TRIGGER_PX + 20, 308]);
    expect(back).toHaveBeenCalledTimes(1);
    expect(moves.at(-1).preventDefault).toHaveBeenCalled();
    expect(root.children).toEqual([]); // the chevron is gone after letting go
  });

  it("does nothing when let go short of the distance", () => {
    ios();
    const { root, back } = setup();
    swipe(root, [6, 300], [6 + TRIGGER_PX - 20, 300]);
    expect(back).not.toHaveBeenCalled();
  });

  it("leaves a swipe that starts away from the edge to the page", () => {
    ios();
    const { root, back } = setup();
    const moves = swipe(root, [120, 300], [300, 300]);
    expect(back).not.toHaveBeenCalled();
    expect(moves.every((m) => !m.preventDefault.mock.calls.length)).toBe(true);
  });

  it("leaves scrolling up and down alone, even from the edge", () => {
    ios();
    const { root, back } = setup();
    const moves = swipe(root, [6, 300], [40, 500]);
    expect(back).not.toHaveBeenCalled();
    expect(moves.every((m) => !m.preventDefault.mock.calls.length)).toBe(true);
  });

  it("lets a strip that is scrolled sideways (a wide diagram) take the swipe", () => {
    ios();
    const { root, back } = setup();
    const strip = root.createDiv();
    strip.scrollLeft = 80;
    const inside = strip.createDiv();
    swipe(root, [6, 300], [200, 300], inside);
    expect(back).not.toHaveBeenCalled();
  });

  it("listens to finger moves only while a touch that began at the edge is down", () => {
    ios();
    const { root } = setup();
    expect(root.listeners.touchmove || []).toHaveLength(0);
    root.fire("touchstart", touch(120, 300, root));
    expect(root.listeners.touchmove || []).toHaveLength(0);
    root.fire("touchstart", touch(6, 300, root));
    expect(root.listeners.touchmove).toHaveLength(1);
    root.fire("touchend", { touches: [] });
    expect(root.listeners.touchmove).toHaveLength(0);
  });

  it("lets a second finger turn the swipe into a pinch", () => {
    ios();
    const { root, back } = setup();
    root.fire("touchstart", touch(6, 300, root));
    root.fire("touchmove", touch(40, 300, root));
    root.fire("touchmove", { touches: [{ clientX: 90, clientY: 300 }, { clientX: 200, clientY: 400 }], target: root, preventDefault: vi.fn() });
    root.fire("touchend", { touches: [] });
    expect(back).not.toHaveBeenCalled();
  });

  it("does not go back when the system cancels the touch", () => {
    ios();
    const { root, back } = setup();
    root.fire("touchstart", touch(6, 300, root));
    root.fire("touchmove", touch(6 + TRIGGER_PX + 20, 300, root));
    root.fire("touchcancel", {});
    root.fire("touchend", { touches: [] });
    expect(back).not.toHaveBeenCalled();
  });
});
