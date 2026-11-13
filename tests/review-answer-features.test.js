// The answer header of a review card (ticket-048). Synapse and the Deep Dive queue are ways into a
// feature; "highlight" and "quote" are formatting tools. All four used to be the same small button.
// The two feature entries are now drawn by src/review/answer-features.js as their own group, with the
// accent surface, and each shows its state: the map is open, the card is already in the queue.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { renderAnswerFeatures } = require("../src/review/answer-features.js");
const { t: c } = require("../src/i18n");
const css = String(require("../src/styles/hub-pages"));

class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag;
    this.children = [];
    this.text = opts.text ?? "";
    this.cls = new Set(String(opts.cls || "").split(" ").filter(Boolean));
    this.attrs = { ...(opts.attr || {}) };
    this.listeners = {};
    this.disabled = false;
    this.classList = { add: (name) => this.cls.add(name), remove: (name) => this.cls.delete(name) };
  }
  createEl(tag, opts) { const el = new FakeEl(tag, opts); this.children.push(el); return el; }
  appendChild(child) { return child; }
  empty() { this.children = []; }
  hasClass(name) { return this.cls.has(name); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { return Promise.all((this.listeners.click || []).map((fn) => fn({}))); }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this.text = value; this.children = []; }
}

const t = { language: "zh-tw" };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function draw({ synapse, queue } = {}) {
  const header = new FakeEl();
  const group = renderAnswerFeatures(header, { t, plugin: { settings: t }, synapse, queue });
  const buttons = group ? group.children.filter((el) => el.tag === "button") : [];
  return { header, group, buttons };
}
const notQueued = { isQueued: async () => false, add: async () => true };

describe("feature entries in the answer header", () => {
  it("draws Synapse and the queue as one group of feature buttons, apart from the formatting tools", () => {
    const { header, group, buttons } = draw({ synapse: { open: false, toggle: () => true }, queue: notQueued });
    expect(header.children).toEqual([group]);
    expect(group.hasClass("lh-answer-features")).toBe(true);
    expect(buttons.map((b) => b.textContent)).toEqual([c(t, "SYNAPSE"), c(t, "EXPLAINER_MARK_BTN")]);
    for (const b of buttons) {
      expect(b.hasClass("lh-ans-feature")).toBe(true);
      expect(b.hasClass("lh-fmt-btn")).toBe(false);
    }
  });

  it("draws nothing when the card has neither", () => {
    const { header, group } = draw();
    expect(group).toBeNull();
    expect(header.children).toEqual([]);
  });

  it("shows Synapse as pressed while the map is open, and follows each toggle", async () => {
    let open = true;
    const { buttons: [synapse] } = draw({ synapse: { open, toggle: () => (open = !open) } });
    expect(synapse.attrs["aria-pressed"]).toBe("true");
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("false");
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("true");
  });

  it("offers the queue while the card is not in it", async () => {
    const { buttons: [queue] } = draw({ queue: notQueued });
    await settle();
    expect(queue.textContent).toBe(c(t, "EXPLAINER_MARK_BTN"));
    expect(queue.attrs["aria-disabled"]).toBeUndefined();
    expect(queue.hasClass("is-done")).toBe(false);
  });

  it("shows a card that is already queued as done, not as unavailable", async () => {
    const { buttons: [queue] } = draw({ queue: { isQueued: async () => true, add: async () => true } });
    await settle();
    expect(queue.textContent).toBe(c(t, "EXPLAINER_QUEUED_BTN"));
    expect(queue.hasClass("is-done")).toBe(true);
    // Finished, not unavailable: the button keeps focus and is never the grey of `disabled`.
    expect(queue.attrs["aria-disabled"]).toBe("true");
    expect(queue.disabled).toBe(false);
  });

  it("adds a card once, however often the button is pressed", async () => {
    let calls = 0, finish;
    const { buttons: [queue] } = draw({ queue: { isQueued: async () => false, add: () => { calls++; return new Promise((resolve) => { finish = resolve; }); } } });
    await settle();
    const first = queue.click(), second = queue.click();
    finish(true);
    await Promise.all([first, second]);
    await queue.click();
    expect(calls).toBe(1);
    expect(queue.hasClass("is-done")).toBe(true);
  });

  it("turns to done once the card is added, and stays as it was when adding failed", async () => {
    const { buttons: [queue] } = draw({ queue: notQueued });
    await queue.click();
    expect(queue.textContent).toBe(c(t, "EXPLAINER_QUEUED_BTN"));
    expect(queue.hasClass("is-done")).toBe(true);

    const { buttons: [failing] } = draw({ queue: { isQueued: async () => false, add: async () => false } });
    await failing.click();
    expect(failing.textContent).toBe(c(t, "EXPLAINER_MARK_BTN"));
    expect(failing.hasClass("is-done")).toBe(false);
  });

  it("has a short label for the queued state in both languages", () => {
    for (const language of ["zh-tw", "en"]) {
      const label = c({ language }, "EXPLAINER_QUEUED_BTN");
      expect(label).not.toBe("EXPLAINER_QUEUED_BTN");
      expect(label).not.toMatch(/[。.]$/);
    }
  });
});

// Layout cannot run here; these keep the rules that give each state its look, all from Hub tokens.
function declarations(selector) {
  const rule = css.split("\n").find((line) => line.startsWith(`${selector} {`));
  if (!rule) return {};
  return Object.fromEntries(rule.slice(rule.indexOf("{") + 1, rule.lastIndexOf("}")).split(";")
    .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([name]) => name));
}
const S = ".lh-hub.lh-session";

describe("feature entry styles", () => {
  it("is a tinted button a size above the formatting tools", () => {
    const feature = declarations(`${S} .lh-ans-feature`), tool = declarations(`${S} .lh-rc-edit-btn`);
    expect(feature.background).toBe("var(--tone) !important");
    expect(feature.color).toBe("var(--tint) !important");
    expect(feature["box-shadow"]).toBe("var(--tonering)");
    expect(parseFloat(feature.height)).toBeGreaterThan(parseFloat(tool.height));
    expect(parseFloat(feature["font-size"])).toBeGreaterThan(parseFloat(tool["font-size"]));
  });

  it("fills with the accent while pressed", () => {
    const pressed = declarations(`${S} .lh-ans-feature[aria-pressed="true"]`);
    expect(pressed.background).toBe("var(--btn) !important");
    expect(pressed.color).toBe("var(--onbtn) !important");
  });

  it("shows where the keyboard is on every button of the card's header", () => {
    expect(declarations(`${S} .lh-rc-edit-btn:focus-visible`).outline).toBe("2px solid var(--focus)");
  });

  it("keeps the feature group beside the label when the tools wrap below (desktop)", () => {
    const header = declarations(`body:not(.is-phone) ${S} .lh-answer-header`);
    expect(header["flex-wrap"]).toBe("wrap");
    expect(header["justify-content"]).toBe("flex-start");
  });

  it("on a phone gives each entry half the row and a finger-sized height, and lets a long label wrap", () => {
    const entry = declarations(`body.is-phone ${S} .lh-ans-feature`);
    expect(entry.flex).toBe("0 1 calc(50% - 5px)"); // one entry alone keeps the size it has in a pair
    expect(parseFloat(entry["min-height"])).toBeGreaterThanOrEqual(44);
    expect(entry.height).toBe("auto");
    expect(entry["white-space"]).toBe("normal");
    expect(declarations(`body.is-phone ${S} .lh-answer-features`).gap).toBe("10px");
  });

  it("shows done in the finished colour, not the grey of a disabled button", () => {
    const done = declarations(`${S} .lh-ans-feature.is-done`);
    expect(done.color).toBe("var(--mstt) !important");
    expect(done.background).toContain("var(--mst)");
    expect(done.background).not.toContain("--fill");
    expect(done.opacity).toBe("1");
  });
});
