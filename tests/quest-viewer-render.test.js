// The quest map window, opened the way the Hub opens it, on a quest package the quest-map skill wrote
// (tests/fixtures/quests/exposure-triangle/meta.json). It must finish drawing: one button per node on
// the map and the side panel beside it. Every image it asks for must be on the embed list, because a
// store install has no assets/ folder.
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { assetGroups } from "../scripts/asset-list.mjs";

const require = createRequire(import.meta.url);
const { QuestViewerModal } = require("../src/quest/viewer-modal.js");
const { listQuestPackages, questPackageToHubItem } = require("../src/quest/data.js");
const { loadQuestState, questStatePath } = require("../src/quest/state.js");
const { assetUrl } = require("../src/assets/index.js");

const SLUG = "exposure-triangle";
const META_PATH = `engram-quest/quests/${SLUG}/meta.json`;
const META = fs.readFileSync(fileURLToPath(new URL(`./fixtures/quests/${SLUG}/meta.json`, import.meta.url)), "utf8");
const NODE_IDS = JSON.parse(META).nodes.map((node) => node.id);
const PLUGIN = { settings: { language: "en" } };

// Stands in for an Obsidian element and keeps what was drawn, so the test can look at the result.
class FakeEl {
  constructor(tag = "div", opts = {}) {
    if (typeof opts === "string") opts = { cls: opts };
    this.tag = tag;
    this.children = [];
    this.text = opts.text ?? "";
    this.cls = new Set(String(opts.cls || "").split(" ").filter(Boolean));
    this.attrs = { ...(opts.attr || {}) };
    this.listeners = {};
    this.style = { cssText: "", setProperty() {} };
  }
  createEl(tag, opts) { const el = new FakeEl(tag, opts); this.children.push(el); return el; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  appendChild(child) { this.children.push(child); return child; }
  empty() { this.children = []; }
  addClass(...names) { names.forEach((name) => this.cls.add(name)); }
  toggleClass(name, on) { if (on) this.cls.add(name); else this.cls.delete(name); }
  hasClass(name) { return this.cls.has(name); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
}

// Everything drawn under `el`, in drawing order.
const drawn = (el) => (el.children || []).flatMap((child) => [child, ...drawn(child)]);
const textOf = (el) => [el, ...drawn(el)].map((item) => item.text || "").join(" ").replace(/\s+/g, " ").trim();
const nodeButtons = (root) => drawn(root).filter((el) => el.tag === "button" && /position:absolute/.test(el.attrs.style || ""));
const sideRows = (root) => drawn(root).filter((el) => el.tag === "button" && el.hasClass("lh-qrow"));
const images = (el) => drawn(el).filter((item) => item.tag === "img").map((img) => img.attrs.src);

function makeApp(files) {
  const store = new Map(Object.entries(files));
  return {
    vault: {
      configDir: ".obsidian",
      adapter: {
        list: async (dir) => ({ files: [], folders: dir === "engram-quest/quests" ? [`engram-quest/quests/${SLUG}`] : [] }),
        exists: async (p) => store.has(p),
        read: async (p) => { if (!store.has(p)) throw new Error("ENOENT " + p); return store.get(p); },
        getResourcePath: (p) => "app://" + p,
      },
    },
    workspace: { on: () => ({}), offref: () => {} },
  };
}

// Loads the package and opens the window as the Hub's Quest Map page does.
async function openViewer({ width = 1280, completed = [] } = {}) {
  vi.stubGlobal("window", { innerWidth: width });
  const files = { [META_PATH]: META };
  if (completed.length) {
    files[questStatePath(META_PATH)] = JSON.stringify({
      questPath: META_PATH,
      nodes: Object.fromEntries(completed.map((id) => [id, { completed: true, scorePct: 100, attempts: 1 }])),
    });
  }
  const app = makeApp(files);
  const [entry] = await listQuestPackages(app.vault.adapter);
  const quest = questPackageToHubItem(entry, await loadQuestState(app.vault.adapter, entry.stateKey));
  const modal = new QuestViewerModal(app, PLUGIN, quest);
  modal.modalEl = new FakeEl();
  modal.contentEl = new FakeEl();
  await modal.onOpen();
  return { app, quest, root: modal.contentEl };
}

afterEach(() => vi.unstubAllGlobals());

describe("quest map window", () => {
  it("draws every node and the side panel for a quest package", async () => {
    const { app, quest, root } = await openViewer();
    const titles = quest.nodes.map((node) => node.title);
    expect(quest.nodes.map((node) => node.id)).toEqual(NODE_IDS);

    const buttons = nodeButtons(root);
    expect(buttons.map((button) => button.children.at(-1).text)).toEqual(titles);
    buttons.forEach((button) => expect(typeof button.listeners.click).toBe("function"));

    const art = (name) => assetUrl(app, `assets/quest-map/generated/${name}.webp`);
    // Nothing is done yet: the first node is current (crown), the rest wait, the boss gate is locked.
    expect(images(buttons[0])).toEqual([art("crown-current-node"), art("node-number-frame")]);
    expect(images(buttons[1])).toEqual([art("node-number-frame")]);
    expect(images(buttons.at(-1))).toEqual([art("boss-gate"), art("boss-lock-badge")]);
    expect(images(root)).toContain(assetUrl(app, "assets/quest-map/quest-map_backgroud_medium.png"));

    expect(textOf(root)).toContain("Current Node");
    expect(textOf(root)).toContain("Start Current Node");
    expect(sideRows(root).map(textOf)).toEqual(titles);
  });

  it("draws the same on a phone, where the side panel comes first", async () => {
    const { quest, root } = await openViewer({ width: 390 });
    expect(nodeButtons(root)).toHaveLength(quest.nodes.length);
    expect(sideRows(root)).toHaveLength(quest.nodes.length);
  });

  // Where the map's nodes really are, in pixels, as the window drew them.
  const css = (el, prop) => (el.attrs.style.match(new RegExp(`(?:^|;)${prop}:([^;]+)`)) || [])[1];
  const px = (value) => parseFloat(value);
  function mapGeometry(root) {
    const buttons = nodeButtons(root);
    const parentOf = (child) => drawn(root).find((el) => (el.children || []).includes(child));
    const stage = parentOf(buttons[0]);
    const wrap = parentOf(stage);
    const stageWidth = px(css(stage, "width"));
    const stageHeight = stageWidth * 941 / 1672;
    const [top, right, bottom, left] = css(wrap, "padding").split(" ").map(px);
    const discs = buttons.map((button) => {
      const disc = button.children[0];
      const size = px(css(disc, "width"));
      return { size, cx: px(css(button, "left")) / 100 * stageWidth, cy: px(css(button, "top")) / 100 * stageHeight - 12.5, title: button.children.at(-1) };
    });
    return { stage, wrap, stageWidth, stageHeight, pad: { top, right, bottom, left }, discs };
  }

  it("keeps the nodes apart and inside the map on a phone (ticket-039)", async () => {
    for (const width of [320, 360, 390, 430]) {
      const { root } = await openViewer({ width });
      const { discs, stageWidth, stageHeight, pad } = mapGeometry(root);
      discs.forEach((disc, i) => {
        expect(disc.size, `${width}px, node ${i}`).toBeGreaterThanOrEqual(44);
        discs.slice(i + 1).forEach((other, k) => {
          expect(Math.hypot(disc.cx - other.cx, disc.cy - other.cy), `${width}px, ${i} and ${i + 1 + k}`).toBeGreaterThanOrEqual((disc.size + other.size) / 2);
        });
        // The disc and its title sit inside the map or in the room the window keeps around it.
        const title = px(css(disc.title, "max-width"));
        expect(disc.cx - Math.max(disc.size, title) / 2, `${width}px, node ${i}`).toBeGreaterThanOrEqual(-pad.left);
        expect(disc.cx + Math.max(disc.size, title) / 2).toBeLessThanOrEqual(stageWidth + pad.right);
        expect(disc.cy - disc.size / 2).toBeGreaterThanOrEqual(-pad.top);
        expect(disc.cy + disc.size / 2 + 5 + 20).toBeLessThanOrEqual(stageHeight + pad.bottom);
      });
    }
  });

  it("draws the map to fit the desktop window instead of forcing it wider than the window (ticket-039)", async () => {
    const { root } = await openViewer({ width: 1280 });
    const { stage, wrap, stageWidth, pad, discs } = mapGeometry(root);
    expect(css(stage, "min-width")).toBeUndefined();
    // The window is 1040 wide with a 280 side panel; the map and its padding have to fit beside it.
    expect(stageWidth + pad.left + pad.right).toBeLessThanOrEqual(1040 - 280);
    expect(css(wrap, "overflow")).toBe("auto"); // a short window scrolls the map instead of cutting it
    expect(discs.every((disc) => disc.size <= 110 && disc.size >= 44)).toBe(true);
    // The boss, at the top of the map, is not cut by its edge.
    const boss = discs.at(-1);
    expect(boss.cy - boss.size / 2).toBeGreaterThanOrEqual(-pad.top);
  });

  it("lets the phone's column scroll instead of squeezing the map (ticket-039)", async () => {
    const { root } = await openViewer({ width: 390 });
    const { wrap } = mapGeometry(root);
    expect(css(wrap, "flex")).toBe("none");
  });

  it("marks finished nodes and moves the crown to the next one", async () => {
    const { app, quest, root } = await openViewer({ completed: NODE_IDS.slice(0, 2) });
    const crown = assetUrl(app, "assets/quest-map/generated/crown-current-node.webp");
    const buttons = nodeButtons(root);
    expect(buttons).toHaveLength(quest.nodes.length);
    expect(buttons.map((button) => images(button).includes(crown))).toEqual([true, true, true, false]);
    expect(sideRows(root).map((row) => row.hasClass("is-done"))).toEqual([true, true, false, false]);
    expect(textOf(root)).toContain(`2/${quest.nodes.length}`);
  });

  it("asks only for images that are embedded in main.js", async () => {
    const embedded = new Set(assetGroups().flatMap((group) => group.files));
    const { app, quest } = await openViewer();
    // An image missing from the embedded file is looked up in the plugin folder, which is where a
    // store install comes up empty. Before a build there is no embedded file and every image comes here.
    const fromFolder = [];
    app.vault.adapter.getResourcePath = (p) => { fromFolder.push(p.replace(".obsidian/plugins/engram-quest/", "")); return "app://" + p; };
    for (const difficulty of ["easy", "medium", "hard"]) {
      const modal = new QuestViewerModal(app, PLUGIN, { ...quest, difficulty });
      modal.contentEl = new FakeEl();
      modal.render();
      expect(nodeButtons(modal.contentEl)).toHaveLength(quest.nodes.length);
    }
    for (const rel of fromFolder) expect(embedded.has(rel), rel).toBe(true);
  });
});
