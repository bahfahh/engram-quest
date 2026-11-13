// Draws one review card the way the review session does (ReviewSessionModal._renderCardContent), on
// a phone or a desktop, and keeps what was drawn. The Synapse panel itself is replaced by a marker,
// so a test can see where the map would open without building a graph.
import Module, { createRequire } from "node:module";
import { vaultAdapter, json } from "./vault-adapter.js";

const require = createRequire(import.meta.url);
// esbuild inlines the teachers' photos and voice samples; here a file name stands in for each.
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const obsidian = require("obsidian");
const { ReviewSessionModal } = require("../../src/review/session.js");

const NOTE = "Git/Git 基礎 閃卡.md";
// What a card patches while it is on screen, as it was before any card was drawn.
const ORIGINAL = { contains: obsidian.activeDocument.body.classList.contains, Menu: obsidian.Menu };
export const CARD = { front: "git status 的用途？", back: "顯示哪些檔案被修改、已暫存或未追蹤。", notePath: NOTE };

export class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag;
    this.children = [];
    this.parent = null;
    this.text = opts.text ?? "";
    this.cls = new Set(String(opts.cls || (opts.attr && opts.attr.class) || "").split(" ").filter(Boolean));
    this.attrs = { ...(opts.attr || {}) };
    this.listeners = {};
    this.style = {};
    this.isConnected = true;
    this.classList = {
      add: (...names) => names.forEach((name) => this.cls.add(name)),
      remove: (...names) => names.forEach((name) => this.cls.delete(name)),
      contains: (name) => this.cls.has(name),
      toggle: (name, on) => (on ?? !this.cls.has(name) ? this.cls.add(name) : this.cls.delete(name)),
    };
  }
  createEl(tag, opts) { return this.appendChild(new FakeEl(tag, opts)); }
  // As in the DOM: appending an element that is already in the tree moves it.
  appendChild(child) {
    if (!(child instanceof FakeEl)) return child;
    if (child.parent) child.parent.children = child.parent.children.filter((el) => el !== child);
    child.parent = this;
    this.children.push(child);
    return child;
  }
  empty() { this.children = []; }
  hasClass(name) { return this.cls.has(name); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { return Promise.all((this.listeners.click || []).map((fn) => fn({ stopPropagation() {}, preventDefault() {} }))); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  contains() { return false; }
  scrollIntoView(options) { this.scrolls = [...(this.scrolls || []), options]; }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this.text = value; this.children = []; }
}

export const drawn = (el) => el.children.flatMap((child) => [child, ...drawn(child)]);
export const find = (root, cls) => drawn(root).find((el) => el.hasClass(cls));
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

/**
 * Draws the card and waits for the reads it starts. Returns:
 *   root       everything drawn (session.contentEl)
 *   card       the card body, whose children are in reading order
 *   menu()     presses the phone's "more" button and returns the titles the menu offers
 *   panels     how many times the Synapse map was drawn into its container
 *   loaded     the `afterLoad` callback given to each of those draws
 *   done()     puts back what was patched; call it when the test is finished with the card
 */
export async function drawCard({ phone = false, answerShown = true, pro = true, synapse = true, hasLinks = true, browseOnly = false, queued = false, hints = 0, synapseOpen = false } = {}) {
  const files = { [NOTE]: `${CARD.front} :: ${CARD.back}\n` };
  if (queued) files["engram-quest/explainer/queue.json"] = json({ entries: [{ source: NOTE, q: CARD.front, status: "pending" }] });
  const adapter = vaultAdapter(files);
  adapter.write = async (path, text) => { files[path] = text; };
  adapter.mkdir = async () => {};

  let menu = null;
  class Menu {
    constructor() { this.items = []; menu = this; }
    addItem(build) {
      const item = { title: "", disabled: false, setTitle(v) { this.title = v; return this; }, setIcon() { return this; }, setDisabled(v) { this.disabled = v; return this; }, onClick(fn) { this.run = fn; return this; } };
      build(item);
      this.items.push(item);
      return this;
    }
    showAtMouseEvent() {}
  }

  const session = Object.create(ReviewSessionModal.prototype);
  const panels = [];
  const loaded = [];
  Object.assign(session, {
    app: {
      vault: { adapter, getAbstractFileByPath: () => null, getFiles: () => [], getMarkdownFiles: () => [] },
      metadataCache: { getFileCache: () => null, getFirstLinkpathDest: () => null, resolvedLinks: {} },
      workspace: { openLinkText() {} },
    },
    plugin: { settings: { language: "zh-tw", licenseValid: pro }, saveData: async () => {} },
    contentEl: new FakeEl(),
    cards: [{ ...CARD, hint_l1: "先想檔案的三種狀態", hint_l2: "和 git add 有關", hint_l3: "s 開頭" }],
    idx: 0,
    deckName: "flashcards/git",
    hintLevel: hints,
    answerShown,
    synapseOpen,
    browseOnly,
    _timeboxMinutes: 0,
    _synapseStatus: { enabled: synapse },
    // The real one answers no without a licence or while Synapse is off.
    _synapse: { ready: true, hasLinks: () => pro && synapse && hasLinks },
    // `afterLoad` is what the card hands the real panel to run once a map that had to be read is drawn.
    _renderSynapsePanel(parent, _card, _t, _renderMd, _refresh, afterLoad) { panels.push(parent); loaded.push(afterLoad); parent.createEl("div", { cls: "test-synapse-map" }); },
  });

  const classes = obsidian.activeDocument.body.classList;
  // The session asks the page whether it is a phone each time it draws, also on a later redraw
  // (a press on Synapse), so the answer stays patched until the test calls done().
  classes.contains = (name) => phone && name === "is-phone";
  obsidian.Menu = Menu;
  const done = () => { classes.contains = ORIGINAL.contains; obsidian.Menu = ORIGINAL.Menu; };
  try {
    session._renderCardContent(session.cards[0]);
    await settle();
  } catch (error) { done(); throw error; }
  const root = session.contentEl;
  return {
    session,
    root,
    get card() { return find(root, "lh-review-card"); },
    panels,
    loaded,
    done,
    async menu() {
      await drawn(root).filter((el) => el.hasClass("lh-sib")).pop().click();
      return menu.items.map((item) => item.title + (item.disabled ? " (off)" : ""));
    },
  };
}
