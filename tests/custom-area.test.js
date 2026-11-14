// The user's custom area, engram-quest/custom/: preferences and assets the user (or their AI) keeps across
// plugin updates. The plugin, the installer and auto-update never write there; every skill carries the same
// guide to it; note searches leave engram-quest/ out; the teacher menu lists custom teachers (Pro).
import { describe, it, expect, afterEach } from "vitest";
import Module, { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vaultAdapter, json } from "./helpers/vault-adapter.js";

const require = createRequire(import.meta.url);
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const obsidian = require("obsidian");
const { autoUpdateSkills, getInstallPreview, doInstall } = require("../src/hub/skills.js");
const createInstaller = require("../src/skills/installer.js");
const { loadCustomTeachers, CUSTOM_DIR } = require("../src/videos/custom-teachers.js");
const G = createInstaller();

const CUSTOM_FILES = {
  "engram-quest/custom/preferences/all.md": "- 2026-11-14 Prefer many diagrams (asked twice)\n",
  "engram-quest/custom/preferences/animated-course.md": "- 2026-11-14 Blackboard style\n",
  "engram-quest/custom/assets/index.json": json({ schema: 1, assets: [{ id: "calm-loop", kind: "music", skill: "animated-course" }] }),
  "engram-quest/custom/assets/music/calm-loop.mp3": "binary",
  "engram-quest/custom/cast/teachers/cold-math.json": json({ name: { en: "Kay" }, skin: "custom:glass" }),
  // Same name as an official skin: still the user's own file.
  "engram-quest/custom/cast/skins/glass/skin.js": "export const meta = {};",
};

// A vault that can be written to, so a test sees every write, removal and folder made.
function writableVault(files) {
  const under = (dir) => Object.keys(files).filter((p) => p.startsWith(dir + "/"));
  const log = [];
  const adapter = {
    exists: async (p) => p in files || under(p).length > 0,
    read: async (p) => files[p],
    write: async (p, content) => { log.push(["write", p]); files[p] = content; },
    writeBinary: async (p, data) => { log.push(["write", p]); files[p] = data; },
    mkdir: async (p) => { log.push(["mkdir", p]); },
    remove: async (p) => { log.push(["remove", p]); delete files[p]; },
    rmdir: async (p) => { log.push(["remove", p]); under(p).forEach((f) => delete files[f]); delete files[p]; },
    stat: async (p) => (p in files ? { type: "file" } : under(p).length ? { type: "folder" } : null),
  };
  return { adapter, log };
}

function pluginOn(files, { pro = false, licence = "active" } = {}) {
  const { adapter, log } = writableVault(files);
  return {
    log,
    settings: { licenseValid: pro },
    license: { state: { status: licence } },
    manifest: { version: "0.0.0-test" },
    saveData: async () => {},
    app: { vault: { adapter, configDir: ".obsidian", getAbstractFileByPath: () => ({}), createFolder: async () => {} } },
  };
}

const touchedCustom = (log) => log.filter(([, p]) => p === CUSTOM_DIR || p.startsWith(CUSTOM_DIR + "/"));

describe("the custom area belongs to the user", () => {
  it("is never an install target, for any tool, free or Pro", async () => {
    for (const tool of Object.keys(G.TOOL_TARGETS)) {
      for (const isPro of [false, true]) {
        const entries = await G.getInstallEntries(tool, writableVault({}).adapter, ".obsidian", { isPro });
        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) expect(entry.path.startsWith(G.TOOL_TARGETS[tool].baseDir + "/")).toBe(true);
      }
    }
  });

  it("keeps every file after installing, auto-updating and removing Pro content once a licence has ended", async () => {
    for (const tool of Object.keys(G.TOOL_TARGETS)) {
      const files = { ...CUSTOM_FILES };
      const pro = pluginOn(files, { pro: true });
      const install = await getInstallPreview(pro, tool);
      await doInstall(pro, { ...install, items: install.items.filter((i) => !i.pack) });

      const stale = pluginOn(files, { pro: true });
      const someSkill = Object.keys(files).find((p) => p.endsWith("/SKILL.md"));
      files[someSkill] = "OLD";
      await autoUpdateSkills(stale);

      const lapsed = pluginOn(files, { licence: "inactive" });
      const removal = await getInstallPreview(lapsed, tool);
      expect(removal.items.some((i) => i.action === "remove")).toBe(true);
      await doInstall(lapsed, { ...removal, items: removal.items.filter((i) => !i.pack) });

      for (const [p, content] of Object.entries(CUSTOM_FILES)) expect(files[p], `${tool}: ${p}`).toBe(content);
      for (const plugin of [pro, stale, lapsed]) expect(touchedCustom(plugin.log)).toEqual([]);
    }
  });
});

describe("every skill carries the same custom-area guide", () => {
  const guide = readFileSync(new URL("../skills/shared/custom-area.md", import.meta.url), "utf8");

  it("installs the guide next to each SKILL.md, and SKILL.md sends the AI to it before it starts", async () => {
    for (const tool of Object.keys(G.TOOL_TARGETS)) {
      const entries = await G.getInstallEntries(tool, writableVault({}).adapter, ".obsidian", { isPro: true });
      const roots = [...new Set(entries.map((e) => e.path.split("/").slice(0, 3).join("/")))];
      expect(roots.length).toBeGreaterThan(0);
      for (const root of roots) {
        expect(entries.find((e) => e.path === `${root}/custom-area.md`)?.content, root).toBe(guide);
        const skill = entries.find((e) => e.path === `${root}/SKILL.md`).content;
        expect(skill.split("custom-area.md").length - 1, root).toBe(1);
        expect(skill.split("\n").length, `${root}/SKILL.md stays under 500 lines`).toBeLessThan(500);
      }
    }
  });

  it("covers what the design asks of every skill", () => {
    for (const topic of [
      "engram-quest/custom/", "preferences/all.md", "assets/index.json", "teachers/<id>.json",
      "custom:<name>", "environment variable", "engram-quest/cast/custom/", "engram-quest/video/teachers/",
    ]) expect(guide).toContain(topic);
  });
});

describe("note search leaves engram-quest/ out", () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  for (const skill of ["review-deck", "memory-map"]) {
    it(`${skill}: search_vault.sh finds the note, not the custom area or plugin data`, () => {
      dir = mkdtempSync(path.join(tmpdir(), "eq-search-"));
      const scripts = path.join(dir, ".claude", "skills", `engram-quest-${skill}`, "scripts");
      mkdirSync(scripts, { recursive: true });
      copyFileSync(new URL(`../skills/${skill}/scripts/search_vault.sh`, import.meta.url), path.join(scripts, "search_vault.sh"));
      const put = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
      put("Study/note.md", "mitochondria make energy\n");
      put("engram-quest/custom/preferences/all.md", "mitochondria diagrams please\n");
      put("engram-quest/lessons/bio/lesson.md", "mitochondria lesson\n");

      const out = execFileSync("bash", [path.join(scripts, "search_vault.sh"), "mitochondria"], { encoding: "utf8" });
      expect(out).toContain("note.md");
      expect(out).not.toContain("engram-quest");
    });
  }
});

// The video skills' doctor.py warns about key-shaped strings in the custom area. Python only where it is installed.
const python = ["python", "python3"].find((cmd) => {
  try { return /Python 3/.test(execFileSync(cmd, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); } catch (_) { return false; }
});

describe.skipIf(!python)("the video skills' check script finds a key put into the custom area", () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
  const put = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
  const scan = (skill) => {
    try { return { code: 0, out: execFileSync(python, [fileURLToPath(new URL(`../skills/${skill}/scripts/doctor.py`, import.meta.url)), "--keys", "--vault", dir], { encoding: "utf8" }) }; }
    catch (e) { return { code: e.status, out: String(e.stdout) }; }
  };

  for (const skill of ["animated-course", "episodic-review"]) {
    it(skill, () => {
      dir = mkdtempSync(path.join(tmpdir(), "eq-keys-"));
      put("engram-quest/custom/preferences/voice.md", "- 2026-11-14 edge-tts, zh-TW-YunJheNeural, rate -4% (asked twice)\n");
      expect(scan(skill).code).toBe(0);

      const fake = "FAKE0FAKE1FAKE2FAKE3FAKE4";
      put("engram-quest/custom/preferences/all.md", `- GEMINI_API_KEY=${fake}\n`);
      const { code, out } = scan(skill);
      expect(code).toBe(1);
      expect(out).toMatch(/preferences[\\/]all\.md:1/);
      expect(out).not.toContain(fake);
    });
  }
});

describe("custom teachers", () => {
  const files = {
    "engram-quest/custom/cast/teachers/cold-math.json": json({ name: { en: "Kay", "zh-tw": "K 老師" }, title: { en: "Deadpan maths" }, skin: "custom:owl" }),
    "engram-quest/custom/cast/skins/owl/portrait.jpg": "jpg",
    "engram-quest/custom/cast/teachers/broken.json": "{ not json",
    "engram-quest/custom/cast/teachers/Bad Name.json": json({ name: { en: "x" } }),
    "engram-quest/custom/cast/teachers/notes.md": "not a teacher",
    // Older places the skills wrote custom teachers; the new folder wins when both have the same id.
    "engram-quest/cast/custom/cold-math.json": json({ name: { en: "Old Kay" } }),
    "engram-quest/video/teachers/river.json": json({ name: { en: "River" }, skin: "glossy-owl" }),
  };
  const adapter = () => Object.assign(vaultAdapter({ ...files }), { getResourcePath: (p) => `app://vault/${p}` });

  it("reads them from the custom area and the older folders, named custom:<id>, as Pro teachers", async () => {
    const teachers = await loadCustomTeachers(adapter());
    expect(teachers.map((x) => x.id)).toEqual(["custom:cold-math", "custom:river"]);
    const kay = teachers[0];
    expect(kay).toMatchObject({ tier: "pro", custom: true, name: { en: "Kay", "zh-tw": "K 老師" }, portrait: "app://vault/engram-quest/custom/cast/skins/owl/portrait.jpg" });
    expect(teachers[1].portrait).toBeNull();
  });

  it("finds none in a vault without a custom area", async () => {
    expect(await loadCustomTeachers(vaultAdapter({}))).toEqual([]);
  });
});

// Stands in for an Obsidian element: keeps what was drawn and lets a test press a button.
class El {
  constructor(tag = "div", opts = {}) { this.tag = tag; this.text = opts.text || ""; this.cls = String(opts.cls || ""); this.attr = opts.attr || {}; this.children = []; this.on = {}; this.isConnected = true; }
  createEl(tag, opts) { const el = new El(tag, opts); this.children.push(el); return el; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  empty() { this.children = []; }
  addClass(...names) { this.cls += " " + names.join(" "); }
  setText(text) { this.text = text; }
  addEventListener(type, fn) { this.on[type] = fn; }
  all() { return this.children.flatMap((c) => [c, ...c.all()]); }
}

describe("the teacher menu", () => {
  const original = { Modal: obsidian.Modal };
  afterEach(() => { obsidian.Modal = original.Modal; });

  async function openMenu(licensed) {
    let modal;
    obsidian.Modal = class { constructor() { this.contentEl = new El(); this.modalEl = new El(); modal = this; } open() {} close() {} };
    const { openTeacherPicker } = require("../src/videos/teacher-picker.js");
    const adapter = Object.assign(vaultAdapter({
      "engram-quest/custom/cast/teachers/cold-math.json": json({ name: { en: "Kay" }, effect: { en: "Short and cold." } }),
    }), { getResourcePath: (p) => p });
    const picked = [];
    const hub = { app: { vault: { adapter } }, plugin: { settings: {} } };
    await openTeacherPicker(hub, { language: "en", licenseValid: licensed }, { selected: "nico", onPick: (id) => picked.push(id) });
    return { drawn: modal.contentEl.all(), picked };
  }

  it("lists custom teachers in their own section, and choosing one saves custom:<id>", async () => {
    const { drawn, picked } = await openMenu(true);
    expect(drawn.some((el) => el.text === "Your teachers")).toBe(true);
    const name = drawn.findIndex((el) => el.text === "Kay");
    expect(name).toBeGreaterThan(-1);
    const choose = drawn.slice(name).find((el) => el.tag === "button" && el.text === "Choose");
    choose.on.click();
    expect(picked).toEqual(["custom:cold-math"]);
  });

  it("shows them locked without Pro", async () => {
    const { drawn, picked } = await openMenu(false);
    const name = drawn.findIndex((el) => el.text === "Kay");
    expect(drawn.slice(name).find((el) => el.tag === "button" && /Pro/.test(el.text))).toBeTruthy();
    expect(picked).toEqual([]);
  });
});

describe("settings: open the custom folder", () => {
  const original = { Setting: obsidian.Setting, Platform: obsidian.Platform };
  afterEach(() => { obsidian.Setting = original.Setting; obsidian.Platform = original.Platform; });

  async function pressOpen(files) {
    const rows = [];
    obsidian.Setting = class {
      constructor() { this.row = { name: "", click: null }; rows.push(this.row); }
      setName(n) { this.row.name = n; return this; }
      setDesc() { return this; } setHeading() { return this; }
      addButton(cb) { const b = { setButtonText: () => b, setCta: () => b, onClick: (fn) => { this.row.click = fn; return b; } }; cb(b); return this; }
      addText(cb) { const x = new Proxy({}, { get: (_, k) => (k === "inputEl" ? { style: {} } : () => x) }); cb(x); return this; }
      addTextArea(cb) { return this.addText(cb); } addToggle(cb) { return this.addText(cb); } addDropdown(cb) { return this.addText(cb); } addSlider(cb) { return this.addText(cb); }
    };
    obsidian.Platform = { isDesktopApp: true };
    const { SettingsTab } = require("../src/hub/settings.js");
    const { adapter, log } = writableVault(files);
    const shown = [];
    const app = { vault: { adapter }, showInFolder: async (p) => shown.push(p) };
    const tab = new SettingsTab(app, { app, settings: { language: "en" }, saveData: async () => {} });
    tab.containerEl = new El();
    tab.display();
    const row = rows.find((r) => r.name === "Custom area");
    expect(row && row.click).toBeTruthy();
    await row.click();
    return { shown, log };
  }

  it("opens engram-quest/custom/ without writing anything in it", async () => {
    const { shown, log } = await pressOpen({ ...CUSTOM_FILES });
    expect(shown).toEqual([CUSTOM_DIR]);
    expect(log).toEqual([]);
  });

  it("makes only the empty folder when it does not exist yet", async () => {
    const { shown, log } = await pressOpen({});
    expect(shown).toEqual([CUSTOM_DIR]);
    expect(log).toEqual([["mkdir", CUSTOM_DIR]]);
  });
});
