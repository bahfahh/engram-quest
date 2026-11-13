// The guide's first screen (three steps and the sentences to say) and the first-run introduction that
// shows it once when the Hub opens: src/hub/intro.js and src/hub/help.js.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const obsidian = require("./__mocks__/obsidian.cjs");
const registry = require("./feature-registry");
const CONTENT = require("../src/hub/help-content");
const { shouldShowIntro, maybeShowIntro, maybeShowTabGuide } = require("../src/hub/intro");
const { HelpModal, plainSentence } = require("../src/hub/help");
const { hasFeatureGuide } = require("../src/hub/feature-guide");
const { isInstallerAvailable, anySkillsInstalled } = require("../src/hub/skills");

// An element that records what was drawn into it, enough to read a dialog back and press its buttons.
class El {
  constructor(tag, opts = {}) {
    this.tag = tag; this.text = opts.text || ""; this.cls = opts.cls || "";
    this.attr = { ...opts.attr }; this.children = []; this.events = {}; this.hidden = false; this.isConnected = true;
    this.classList = {
      toggle: (name, on) => { const has = this.has(name), want = on === undefined ? !has : on; if (want !== has) this.cls = want ? `${this.cls} ${name}`.trim() : this.cls.split(" ").filter(c => c !== name).join(" "); },
      contains: name => this.has(name),
    };
  }
  has(name) { return this.cls.split(" ").includes(name); }
  createEl(tag, opts) { const child = new El(tag, opts); this.children.push(child); return child; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  appendText(text) { this.children.push(new El("#text", { text })); }
  appendChild(child) { return child; }
  addClass(...names) { this.cls = `${this.cls} ${names.join(" ")}`.trim(); }
  empty() { this.children = []; }
  setAttribute(name, value) { this.attr[name] = value; }
  addEventListener(name, fn) { this.events[name] = fn; }
  scrollIntoView() {}
  all() { return [this, ...this.children.flatMap(child => child.all())]; }
  byClass(name) { return this.all().filter(el => el.has(name)); }
  querySelectorAll(selector) { return this.all().filter(el => el.tag === selector); }
  get fullText() { return this.text + this.children.map(child => child.fullText).join(""); }
}

function fakePlugin(settings = {}, skillFolders = []) {
  const saves = [];
  const plugin = {
    settings: { language: "en", ...settings },
    manifest: { id: "engram-quest", dir: ".obsidian/plugins/engram-quest" },
    saveData: async (data) => { saves.push(JSON.parse(JSON.stringify(data))); },
    saves,
  };
  plugin.app = { vault: { configDir: ".obsidian", adapter: { exists: async path => skillFolders.includes(path), getResourcePath: path => `app://${path}` } } };
  return plugin;
}

// Draws the guide into recording elements, without Obsidian's modal machinery.
function drawGuide({ intro = false, language = "en", skillsInstalled = null, video = "" } = {}) {
  const plugin = fakePlugin({ language });
  const modal = new HelpModal(plugin.app, plugin, { intro });
  modal.contentEl = new El("div");
  modal.modalEl = new El("div");
  modal.copy = language === "zh-tw" ? CONTENT.zh : CONTENT.en;
  if (video) modal.copy = { ...modal.copy, start: { ...modal.copy.start, video } };
  modal.skillsInstalled = skillsInstalled;
  modal.render();
  return { modal, root: modal.contentEl, plugin };
}

describe("the three-step first screen", () => {
  for (const [lang, copy] of [["zh-tw", CONTENT.zh], ["en", CONTENT.en]]) {
    it(`is three steps and one sentence per feature in ${lang}`, () => {
      const { root } = drawGuide({ language: lang });
      expect(root.byClass("lh-start-step")).toHaveLength(3);
      expect(root.byClass("lh-start-step").map(step => step.byClass("lh-start-n")[0].text)).toEqual(["1", "2", "3"]);
      const rows = root.byClass("lh-start-row");
      expect(rows).toHaveLength(copy.start.say.length);
      expect(rows.length).toBeLessThanOrEqual(5);
      expect(new Set(copy.start.say.map(item => item.tab)).size).toBe(copy.start.say.length);
    });

    it(`starts with free features only in ${lang}`, () => {
      const free = registry.tabs.filter(tab => !tab.pro).map(tab => tab.id);
      for (const item of copy.start.say) expect(free).toContain(item.tab);
    });

    it(`gives every feature that is built by an AI a sentence in ${lang}`, () => {
      const table = copy.sections.find(section => section.id === "say").body.find(block => block.table).table;
      // Achievements is the one tab nothing is said for; Synapse has no tab but has a sentence.
      expect(table.length - 1).toBe(registry.tabs.length - 1 + 1);
      expect(table.map(row => row[0]).join(" ")).toContain("Synapse");
    });
  }

  it("marks the example to replace and copies the sentence without the marks", async () => {
    const { root } = drawGuide();
    const row = root.byClass("lh-start-row")[0];
    expect(row.byClass("lh-start-slot").map(slot => slot.text)).toEqual(["SEO"]);
    expect(row.byClass("lh-start-q")[0].fullText).toBe("I want to learn SEO, build me a course");

    const copied = [];
    const before = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async text => { copied.push(text); } } }, configurable: true });
    globalThis.window = { setTimeout: () => 0 };
    try { await row.events.click(); }
    finally { if (before) Object.defineProperty(globalThis, "navigator", before); else delete globalThis.navigator; delete globalThis.window; }
    expect(copied).toEqual(["I want to learn SEO, build me a course"]);
    expect(row.byClass("lh-start-copy")[0].fullText).toBe(CONTENT.en.ui.copied);
    expect(plainSentence("把 {微積分} 的筆記做成 Quest Map")).toBe("把 微積分 的筆記做成 Quest Map");
  });

  it("opens the Review Deck section from the introduction too, by turning into the full guide", () => {
    const { modal, root } = drawGuide({ intro: true });
    expect(root.byClass("lh-help-sec")).toEqual([]);
    root.byClass("lh-start-more")[0].children[0].events.click();
    expect(modal.intro).toBe(false);
    expect(modal.contentEl.all().find(el => el.attr.id === "lh-help-review").hidden).toBe(false);
    expect(modal.contentEl.byClass("lh-start-step")).toHaveLength(3);
  });

  it("keeps the written-by-hand path one press away, inside the Review Deck section", () => {
    const { modal, root } = drawGuide();
    const review = CONTENT.en.sections.find(section => section.id === "review");
    expect(review.body.some(block => block.code && block.code.includes("#flashcards/"))).toBe(true);
    const link = root.byClass("lh-start-more")[0].children[0];
    expect(link.fullText).toBe(CONTENT.en.start.manual);
    const panel = root.all().find(el => el.attr.id === "lh-help-review");
    expect(panel.hidden).toBe(true);
    link.events.click();
    expect(panel.hidden).toBe(false);
    expect(modal.intro).toBe(false);
  });

  it.runIf(isInstallerAvailable())("offers the installer in step one until skills are installed", () => {
    const missing = drawGuide({ skillsInstalled: false }).root.byClass("lh-start-act")[0];
    expect(missing.children.map(el => el.text)).toEqual([CONTENT.en.start.install]);
    const present = drawGuide({ skillsInstalled: true }).root.byClass("lh-start-act")[0];
    expect(present.all().some(el => el.tag === "button")).toBe(false);
    expect(present.fullText).toBe(CONTENT.en.start.installed);
  });

  it.runIf(isInstallerAvailable())("counts skills as installed when any tool has an EngramQuest skill folder", async () => {
    expect(await anySkillsInstalled(fakePlugin())).toBe(false);
    expect(await anySkillsInstalled(fakePlugin({}, [".cursor/skills/engram-quest-review-deck"]))).toBe(true);
  });
});

describe("feature detail behind the first screen", () => {
  it("keeps every section, all closed, each tab still leading to its own guide", () => {
    const { root } = drawGuide();
    const panels = root.byClass("lh-help-sec-b");
    expect(panels).toHaveLength(CONTENT.en.sections.length);
    expect(panels.every(panel => panel.hidden)).toBe(true);
    const withGuide = CONTENT.en.sections.filter(section => section.tab).map(section => section.tab);
    expect(withGuide).toEqual(registry.tabs.map(tab => tab.id));
    expect(withGuide.every(hasFeatureGuide)).toBe(true);
  });

  it("explains Synapse where reviewing is explained, with the sentence to say", () => {
    for (const [copy, say] of [[CONTENT.zh, "幫我建立 Synapse"], [CONTENT.en, "Build synapse"]]) {
      const review = copy.sections.find(section => section.id === "review");
      expect(review.body.some(block => block.h && block.h.includes("Synapse") && block.h.includes("Pro"))).toBe(true);
      expect(review.body.some(block => block.say && block.say.includes(say))).toBe(true);
      expect(review.body.some(block => block.p && block.p.includes("engram-synapse"))).toBe(true);
    }
  });
});

describe("the one-minute overview video", () => {
  it("ships with no video and draws nothing for it", () => {
    expect(CONTENT.zh.start.video).toBe("");
    expect(CONTENT.en.start.video).toBe("");
    const { root } = drawGuide();
    expect(root.byClass("lh-start-video")).toEqual([]);
    expect(root.fullText).not.toContain(CONTENT.en.start.videoLabel);
  });

  it("appears once a video is set, and loads only when asked", () => {
    const { root } = drawGuide({ video: "abc123" });
    const slot = root.byClass("lh-start-video")[0];
    expect(slot.fullText).toBe(CONTENT.en.start.videoLabel);
    expect(slot.querySelectorAll("iframe")).toEqual([]);
    slot.children[0].events.click();
    expect(slot.querySelectorAll("iframe").map(frame => frame.attr.src)).toEqual(["https://www.youtube-nocookie.com/embed/abc123"]);
  });
});

describe("when the introduction shows by itself", () => {
  it("shows to someone who has never opened the Hub", () => {
    expect(shouldShowIntro({}, false)).toBe(true);
    expect(shouldShowIntro({}, true)).toBe(true);
    expect(shouldShowIntro({ _guideSeen: {} }, true)).toBe(true);
  });

  it("never shows again once seen", () => {
    expect(shouldShowIntro({ _introSeen: true }, false)).toBe(false);
    expect(shouldShowIntro({ _introSeen: true, _guideSeen: { review: true } }, false)).toBe(false);
  });

  it("shows once to an earlier user only when no skills are installed", () => {
    expect(shouldShowIntro({ _guideSeen: { review: true } }, false)).toBe(true);
    expect(shouldShowIntro({ _guideSeen: { review: true } }, true)).toBe(false);
  });
});

describe("opening the Hub for the first time", () => {
  let opened, realOpen, timers;
  beforeEach(() => {
    opened = []; timers = [];
    realOpen = obsidian.Modal.prototype.open;
    obsidian.Modal.prototype.open = function () { opened.push(this); };
    globalThis.window = { setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {} };
  });
  afterEach(() => { obsidian.Modal.prototype.open = realOpen; delete globalThis.window; });

  // The part of the Hub window the introduction touches, as onOpen leaves it.
  function openHub(plugin) {
    const hub = { app: plugin.app, plugin, _hubOpen: true, _minimized: false, _introPending: !plugin.settings._introSeen };
    hub._maybeShowIntro = () => maybeShowIntro(hub);
    hub._maybeShowGuide = tab => maybeShowTabGuide(hub, tab);
    return hub;
  }
  const runTimers = () => timers.splice(0).forEach(fn => fn());

  it("shows the introduction once, instead of the open tab's guide", async () => {
    const plugin = fakePlugin();
    const hub = openHub(plugin);
    hub._maybeShowGuide("review");
    await hub._maybeShowIntro();
    runTimers();

    expect(opened).toHaveLength(1);
    expect(opened[0]).toBeInstanceOf(HelpModal);
    expect(opened[0].intro).toBe(true);
    expect(plugin.settings._introSeen).toBe(true);
    expect(plugin.saves.at(-1)._introSeen).toBe(true);
    // The Review Deck guide was held back, not used up.
    expect(plugin.settings._guideSeen).toBeUndefined();

    // Closing the introduction lets the tabs' own guides through again.
    opened[0].contentEl = new El("div");
    activeDocument.querySelectorAll = () => [];
    try { opened[0].onClose(); } finally { delete activeDocument.querySelectorAll; }
    hub._maybeShowGuide("lesson");
    runTimers();
    expect(plugin.settings._guideSeen).toEqual({ lesson: true });
    expect(opened).toHaveLength(2);
  });

  it("does not show it a second time", async () => {
    const plugin = fakePlugin({ _introSeen: true });
    const hub = openHub(plugin);
    await hub._maybeShowIntro();
    hub._maybeShowGuide("review");
    runTimers();
    expect(opened.map(modal => modal instanceof HelpModal)).toEqual([false]);
    expect(plugin.settings._guideSeen).toEqual({ review: true });
  });

  it("can always be opened again from the ? in the Hub: the guide starts with the same screen", () => {
    const intro = drawGuide({ intro: true }).root;
    const guide = drawGuide().root;
    const firstScreen = root => [...root.byClass("lh-start-step"), ...root.byClass("lh-start-row")].map(el => el.fullText);
    expect(firstScreen(guide)).toEqual(firstScreen(intro));
    expect(intro.byClass("lh-help-sec")).toEqual([]);
    expect(guide.byClass("lh-help-sec").length).toBeGreaterThan(0);
  });

  it.runIf(isInstallerAvailable())("leaves an earlier user with skills installed alone, and keeps their settings", async () => {
    const before = { language: "zh-tw", flashcardTags: "flashcards", _guideSeen: { review: true, quest: true }, _viewModes: { review: "grid" }, _reviewProgress: { deck: "a", idx: 2 } };
    const plugin = fakePlugin(before, [".claude/skills/engram-quest-review-deck"]);
    const hub = openHub(plugin);
    await hub._maybeShowIntro();
    runTimers();
    expect(opened).toEqual([]);
    expect(plugin.settings).toEqual({ ...before, _introSeen: true });
    expect(plugin.saves.at(-1)).toEqual({ ...before, _introSeen: true });
    expect(hub._introPending).toBe(false);
  });

  it("shows it once to an earlier user who never installed the skills, keeping their settings", async () => {
    const before = { language: "zh-tw", _guideSeen: { review: true }, _viewModes: { review: "grid" } };
    const plugin = fakePlugin(before);
    const hub = openHub(plugin);
    await hub._maybeShowIntro();
    runTimers();
    expect(opened).toHaveLength(1);
    expect(plugin.settings).toEqual({ ...before, _introSeen: true });
  });

  it("does not ask an earlier user on a phone, and leaves the question for the computer", async () => {
    const before = { _guideSeen: { review: true } };
    const plugin = fakePlugin(before);
    const hub = openHub(plugin);
    const body = activeDocument.body, real = body.classList;
    body.classList = { contains: name => name === "is-phone" };
    try { await hub._maybeShowIntro(); } finally { body.classList = real; }
    runTimers();
    expect(opened).toEqual([]);
    expect(plugin.settings._introSeen).toBeUndefined();
    expect(plugin.saves).toEqual([]);
    expect(hub._introPending).toBe(false);
  });

  it("lets the tabs' guides through again when the introduction fails to open", async () => {
    const plugin = fakePlugin();
    const hub = openHub(plugin);
    obsidian.Modal.prototype.open = function () { throw new Error("boom"); };
    await hub._maybeShowIntro();
    runTimers();
    expect(plugin.settings._introSeen).toBeUndefined();
    expect(hub._introPending).toBe(false);
  });

  it("waits for the next time when the Hub is closed before it could appear", async () => {
    const plugin = fakePlugin();
    const hub = openHub(plugin);
    await hub._maybeShowIntro();
    hub._hubOpen = false;
    runTimers();
    expect(opened).toEqual([]);
    expect(plugin.settings._introSeen).toBeUndefined();
  });
});
