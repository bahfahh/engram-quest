import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import questModal from "../src/quest/modal.js";

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// Runs the shared mission script against a page that records what it posts to the plugin. `parent`
// stands for the plugin's window; messages arrive through `receive`.
function runMission({ lang = "zh-Hant", height = 400, standalone = false, systemDark = false } = {}) {
  const posted = [], listeners = {}, parent = { postMessage: (m) => posted.push(m) };
  const node = (tag) => {
    const n = {
      tag, className: "", textContent: "", children: [], disabled: false, on: {},
      appendChild(c) { n.children.push(c); c.parent = n; return c; },
      addEventListener(type, fn) { n.on[type] = fn; },
      remove() { if (n.parent) n.parent.children = n.parent.children.filter((c) => c !== n); },
    };
    return n;
  };
  const classes = new Set(), page = { height, observed: null, changed: null };
  const body = Object.assign(node("body"), {
    getBoundingClientRect: () => ({ height: page.height }),
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)), contains: (name) => classes.has(name) },
  });
  const document = { body, documentElement: { lang }, createElement: node, querySelector: () => null, querySelectorAll: () => [] };
  const window = {
    parent, addEventListener: (type, fn) => (listeners[type] = fn),
    matchMedia: () => ({ matches: systemDark, addEventListener() {} }),
    ResizeObserver: class { constructor(fn) { page.changed = fn; } observe(target) { page.observed = target; } },
  };
  if (standalone) { window.parent = window; window.postMessage = parent.postMessage; }   // opened as a page in a browser
  const QZ = new Function("window", "document", read("skills/quest-map/assets/quest-base.js") + "\nreturn QZ;")(window, document);
  const find = (n, cls) => (n.className.split(" ").includes(cls) ? n : n.children.map((c) => find(c, cls)).find(Boolean));
  return {
    QZ, posted, body, classes, page,
    loaded: () => listeners.load(),
    // the page's content changed height, and the browser tells the observer
    grow: (to) => { page.height = to; page.changed(); },
    receive: (data, source = parent) => listeners.message({ data, source }),
    solved: () => posted.filter((m) => m.type === "engram-quest-solved"),
    finishButton: () => find(body, "btn"),
  };
}

describe("mission house style: contract with the plugin", () => {
  it("reports the page's height once it is laid out, and again whenever it changes", () => {
    const m = runMission({ height: 400 });
    expect(m.posted).toEqual([]);              // nothing is measured while the page is still being built
    expect(m.page.observed).toBe(m.body);
    m.loaded();
    m.loaded();                                // the same height is not sent twice
    m.grow(1840.2);
    expect(m.posted).toEqual([
      { type: "engram-quest-resize", height: 400 },
      { type: "engram-quest-resize", height: 1841 },
    ]);
  });

  it("opened on its own in a browser, follows the system theme and posts nothing", () => {
    const m = runMission({ standalone: true, systemDark: true });
    expect(m.classes.has("dark")).toBe(true);
    m.QZ.verdict({ title: "t", parts: [{ label: "a", got: 1, max: 1 }] });
    m.finishButton().on.click();
    expect(m.posted).toEqual([]);
    expect(m.finishButton().disabled).toBe(true);
  });

  it("follows the theme the plugin sends, and ignores the same message from anywhere else", () => {
    const m = runMission();
    m.receive({ type: "engram-quest-theme", dark: true }, { postMessage() {} });
    expect(m.classes.has("dark")).toBe(false);
    m.receive({ type: "engram-quest-theme", dark: true });
    expect(m.classes.has("dark")).toBe(true);
    m.receive({ type: "engram-quest-theme", dark: false });
    expect(m.classes.has("dark")).toBe(false);
  });

  it("sends the score once, and only when the learner presses finish", () => {
    const m = runMission();
    const score = m.QZ.verdict({ title: "t", parts: [{ label: "a", got: 20, max: 40 }, { label: "b", got: 8, max: 60 }] });
    expect(score).toBe(28);
    expect(m.solved()).toEqual([]);
    m.finishButton().on.click();
    m.finishButton().on.click();
    expect(m.solved()).toEqual([{ type: "engram-quest-solved", score: 28 }]);
    expect(m.finishButton().disabled).toBe(true);
  });

  it("keeps the score between 0 and 100 whatever the parts add up to", () => {
    expect(runMission().QZ.verdict({ title: "t", parts: [{ label: "a", got: 70, max: 50 }] })).toBe(100);
    expect(runMission().QZ.verdict({ title: "t", parts: [{ label: "a", got: -5, max: 50 }] })).toBe(0);
    expect(runMission().QZ.verdict({ title: "t", parts: [] })).toBe(0);
    expect(runMission().QZ.verdict()).toBe(0);
  });

  it("shows the same points it counts", () => {
    const m = runMission();
    const score = m.QZ.verdict({ title: "t", parts: [{ label: "a", got: 0.1 + 0.2, max: 1 }, { label: "b", got: "oops", max: 1 }] });
    const shown = [];
    (function walk(n) { if (n.tag === "b") shown.push(n.textContent); n.children.forEach(walk); })(m.body);
    expect(shown).toEqual(["0.3 / 1", "0 / 1", "15"]);
    expect(score).toBe(15);
  });

  it("replaces an earlier verdict instead of stacking a second finish button", () => {
    const m = runMission();
    m.QZ.verdict({ title: "first", parts: [{ label: "a", got: 1, max: 2 }] });
    m.QZ.verdict({ title: "second", parts: [{ label: "a", got: 2, max: 2 }] });
    expect(m.body.children.length).toBe(1);
    m.finishButton().on.click();
    expect(m.solved()).toEqual([{ type: "engram-quest-solved", score: 100 }]);
    expect(m.QZ.verdict({ title: "third", parts: [{ label: "a", got: 0, max: 2 }] })).toBe(null);
  });

  it("words the verdict in the mission's language", () => {
    const zh = runMission({ lang: "zh-Hant" }), en = runMission({ lang: "en" });
    zh.QZ.verdict({ title: "t", parts: [] }); en.QZ.verdict({ title: "t", parts: [] });
    expect(zh.finishButton().textContent).toBe("完成關卡");
    expect(en.finishButton().textContent).toBe("Finish");
  });
});

describe("quest window: the frame follows the mission's height", () => {
  const { questFrameHeight } = questModal;

  it("takes the height a mission reports, well past one screen", () => {
    expect(questFrameHeight(640, 760)).toBe(640);
    expect(questFrameHeight(3400.4, 760)).toBe(3400);
  });

  it("keeps a floor and a ceiling, and falls back when the report is not a height", () => {
    expect(questFrameHeight(10, 760)).toBe(220);
    expect(questFrameHeight(1e9, 760)).toBe(8000);
    expect(questFrameHeight("tall", 760)).toBe(760);
    expect(questFrameHeight(undefined, 760)).toBe(760);
    expect(questFrameHeight(-50, 760)).toBe(760);
  });
});

describe("mission house style: same colours as lessons", () => {
  const lesson = read("skills/lesson-academy/assets/lesson-base.css"), quest = read("skills/quest-map/assets/quest-base.css");
  const block = (css, sel) => {
    const i = css.indexOf(sel + "{");
    if (i < 0) throw new Error("no rule for " + sel);
    return css.slice(i + sel.length, css.indexOf("}", i) + 1);
  };

  it("uses the lesson palette for light and dark", () => {
    expect(block(quest, ".qz")).toBe(block(lesson, ".lz"));
    expect(block(quest, ".qz.dark")).toBe(block(lesson, ".lz.dark"));
  });

  it("has every course colour scheme, identical to the lesson's", () => {
    const schemes = (css) => css.split("\n").filter((l) => l.startsWith(".c-")).sort();
    expect(schemes(quest).length).toBe(22);
    expect(schemes(quest)).toEqual(schemes(lesson));
  });
});
