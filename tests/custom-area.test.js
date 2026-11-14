// The user's custom area, engram-quest/custom/: preferences and assets the user (or their AI) keeps across
// plugin updates. The plugin, the installer and auto-update never write there; every skill carries the same
// guide to it; note searches leave engram-quest/ out; the teacher menu lists custom teachers (Pro).
import { describe, it, expect, afterEach } from "vitest";
import Module, { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vaultAdapter, json } from "./helpers/vault-adapter.js";
import { FakeEl, drawn } from "./helpers/player-page.js";

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
      // Only the vault's top-level folder is plugin data; a note folder of the same name is the user's.
      put("Projects/engram-quest/plan.md", "mitochondria for the plugin pitch\n");

      const out = execFileSync("bash", [path.join(scripts, "search_vault.sh"), "mitochondria"], { encoding: "utf8" });
      expect(out).toContain("note.md");
      expect(out).toContain("Projects/engram-quest/plan.md");
      expect(out).not.toContain("custom/preferences");
      expect(out).not.toContain("lessons/bio");
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
      put("engram-quest/custom/preferences/all.md", [
        `- GEMINI_API_KEY=${fake}`,
        "- 2026-11-14 the token limit is fine: tokens-per-minute-limit-is-high",
        `- AZURE_SPEECH_KEY: 0123456789abcdef0123456789abcdef`,
        `- "api_key": "${fake}"`,
      ].join("\n") + "\n");
      const { code, out } = scan(skill);
      expect(code).toBe(1);
      for (const line of [1, 3, 4]) expect(out).toMatch(new RegExp(`preferences[\\\\/]all\\.md:${line}\\b`));
      expect(out).not.toMatch(/all\.md:2\b/);
      expect(out).not.toContain(fake);
      expect(out).not.toContain("0123456789abcdef");
    });
  }

  it("says it scanned nothing when no vault was found", () => {
    dir = mkdtempSync(path.join(tmpdir(), "eq-keys-"));
    const { code, out } = (() => {
      try { return { code: 0, out: execFileSync(python, [fileURLToPath(new URL("../skills/animated-course/scripts/doctor.py", import.meta.url)), "--keys"], { encoding: "utf8", cwd: dir, env: { ...process.env, VAULT: "" } }) }; }
      catch (e) { return { code: e.status, out: String(e.stdout) }; }
    })();
    expect(code).toBe(2);
    expect(out).toContain("nothing scanned");
  });
});

// The video skill's studio: a custom skin is served from the custom area (never copied), and nothing else of the vault.
describe("the video studio serves the custom area and nothing else", () => {
  const studioLib = fileURLToPath(new URL("../skills/animated-course/scripts/studio/lib/", import.meta.url));
  const { servedPath } = require(path.join(studioLib, "served-path.cjs"));
  let dir;
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = null; });

  function setup() {
    dir = mkdtempSync(path.join(tmpdir(), "eq-studio-"));
    const vault = path.join(dir, "vault"), studio = path.join(dir, "studio"), project = path.join(studio, "projects", "l01");
    const put = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
    put("vault/engram-quest/custom/cast/skins/owl/skin.js", "export const meta = {};");
    put("vault/engram-quest/cast/skins/old/skin.js", "export const meta = {};");
    put("vault/engram-quest/videos/settings.json", "{}");
    put("vault/engram-quest2/x.js", "x");
    put("studio/lib/cast/stage.js", "x");
    put("studio/projects/l01/cast.json", JSON.stringify({ vault }));
    return { vault, studio, project };
  }
  const served = (studio, project, url) => { const { root, p } = servedPath(studio, url, project); return p.startsWith(root) && existsSync(p) ? p : null; };

  it("finds the vault through the project's cast.json when the studio is outside it", () => {
    const { vault, studio, project } = setup();
    expect(served(studio, project, "/engram-quest/custom/cast/skins/owl/skin.js")).toBe(path.join(vault, "engram-quest/custom/cast/skins/owl/skin.js"));
    expect(served(studio, project, "/engram-quest/custom/cast/skins/old/skin.js")).toBe(path.join(vault, "engram-quest/cast/skins/old/skin.js"));
    expect(served(studio, project, "/lib/cast/stage.js")).toBe(path.join(studio, "lib/cast/stage.js"));
  });

  it("refuses the rest of the vault and every way out of the custom area", () => {
    const { studio, project } = setup();
    for (const url of [
      "/engram-quest/videos/settings.json", "/engram-quest/custom/../videos/settings.json", "/engram-quest/custom/../../engram-quest2/x.js",
      "/engram-quest/custom/cast/skins/../../../videos/settings.json", "/engram-quest/custom/cast/skins/../../../../engram-quest2/x.js",
    ]) expect(served(studio, project, url), url).toBeNull();
  });
});

describe("the video skill picks custom teachers like Pro teachers", () => {
  const resolver = fileURLToPath(new URL("../skills/animated-course/scripts/studio/lib/cast/resolve.cjs", import.meta.url));
  const registry = JSON.parse(readFileSync(new URL("../skills/animated-course/scripts/studio/lib/cast/teachers.json", import.meta.url), "utf8"));
  const nico = registry.teachers.find((t) => t.default);
  let dir;
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = null; });

  function resolve(settings, teachers) {
    dir = mkdtempSync(path.join(tmpdir(), "eq-resolve-"));
    const put = (rel, text) => { mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); writeFileSync(path.join(dir, rel), text); };
    put("engram-quest/videos/settings.json", JSON.stringify(settings));
    put("engram-quest/custom/cast/skins/owl/skin.js", "export const meta = {};");
    put("engram-quest/cast/skins/oldskin/skin.js", "export const meta = {};");
    for (const [rel, t] of Object.entries(teachers)) put(rel, JSON.stringify({ name: { en: "Kay" }, beats: nico.beats, voice: nico.voice, ...t }));
    const out = JSON.parse(execFileSync("node", [resolver, "--vault", dir], { encoding: "utf8" }));
    return { teacher: out.teacher.id, skin: out.skin.id, file: out.skin.file };
  }

  it("uses the custom teacher and its custom skin with Pro, loaded from the custom area", () => {
    expect(resolve({ pro: true, cast: { teacher: "custom:kay" } }, { "engram-quest/custom/cast/teachers/kay.json": { skin: "custom:owl" } }))
      .toEqual({ teacher: "custom:kay", skin: "custom:owl", file: "/engram-quest/custom/cast/skins/owl/skin.js" });
  });

  it("falls back to the default teacher without Pro, or when the skin is missing", () => {
    expect(resolve({ cast: { teacher: "custom:kay" } }, { "engram-quest/custom/cast/teachers/kay.json": { skin: "custom:owl" } }).teacher).toBe(nico.id);
    expect(resolve({ pro: true, cast: { teacher: "custom:kay" } }, { "engram-quest/custom/cast/teachers/kay.json": { skin: "custom:gone" } }).teacher).toBe(nico.id);
  });

  it("still reads a teacher and skin from the older folders", () => {
    expect(resolve({ pro: true, cast: { teacher: "custom:old" } }, { "engram-quest/cast/custom/old.json": { skin: "oldskin" } }))
      .toEqual({ teacher: "custom:old", skin: "custom:oldskin", file: "/engram-quest/custom/cast/skins/oldskin/skin.js" });
  });

  it("keeps an official teacher and a custom one of the same name apart", () => {
    const same = { [`engram-quest/custom/cast/teachers/${nico.id}.json`]: { skin: "custom:owl" } };
    expect(resolve({ pro: true, cast: { teacher: `custom:${nico.id}` } }, same).skin).toBe("custom:owl");
    expect(resolve({ pro: true, cast: { teacher: nico.id } }, same).skin).toBe(nico.skin);
  });
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
  appendChild(child) { this.children.push(child); return child; }
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

describe("films made by a custom teacher", () => {
  const { teacherOfVideo } = require("../src/videos/teachers.js");
  const { customTeachersOfFilms } = require("../src/videos/custom-teachers.js");
  const { renderTopic } = require("../src/videos/render.js");
  const kayFile = { "engram-quest/custom/cast/teachers/kay.json": json({ name: { en: "Kay" }, skin: "custom:owl" }), "engram-quest/custom/cast/skins/owl/portrait.jpg": "jpg" };
  const series = (teacher) => ({ slug: "maths", meta: { title: "Maths", status: "ready", sources: [], tags: [], videos: [{ id: "l01", title: "Lesson 1", file: "l01.mp4", duration: 60, cast: { teacher } }] } });

  it("name their teacher, so the player can say who taught", async () => {
    const custom = await loadCustomTeachers(vaultAdapter({ ...kayFile }));
    expect(teacherOfVideo("custom:kay", custom)?.name).toEqual({ en: "Kay" });
    expect(teacherOfVideo("custom:gone", custom)).toBeNull();
  });

  it("read the custom teachers only when a film names one", async () => {
    const adapter = vaultAdapter({ ...kayFile });
    expect(await customTeachersOfFilms(adapter, [series("nico")])).toEqual([]);
    expect(adapter.reads).toEqual([]);
    expect((await customTeachersOfFilms(adapter, [series("custom:kay")])).map((x) => x.id)).toEqual(["custom:kay"]);
  });

  it("show the taught-by label on the player", async () => {
    const original = { Platform: obsidian.Platform, setIcon: obsidian.setIcon, contains: obsidian.activeDocument.body.classList.contains, RO: globalThis.ResizeObserver };
    obsidian.Platform = { isDesktopApp: false };
    obsidian.setIcon = () => {};
    obsidian.activeDocument.body.classList.contains = () => false;
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    try {
      const adapter = Object.assign(vaultAdapter({ ...kayFile, "engram-quest/videos/maths/meta.json": json(series("custom:kay").meta), "engram-quest/videos/maths/l01.mp4": "" }), { getResourcePath: (p) => p });
      const [topic] = await require("../src/videos/data.js").listTopics(adapter);
      const hub = { app: { vault: { adapter } }, plugin: { settings: { language: "en" } }, _vTopic: null, _vCustomTeachers: await customTeachersOfFilms(adapter, [topic]) };
      const body = new FakeEl();
      renderTopic(body, hub, hub.plugin.settings, topic, () => {});
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(drawn(body).some((el) => el.text === "Taught by Kay")).toBe(true);
    } finally {
      obsidian.Platform = original.Platform; obsidian.setIcon = original.setIcon;
      obsidian.activeDocument.body.classList.contains = original.contains; globalThis.ResizeObserver = original.RO;
    }
  });
});

describe("video settings with a saved custom teacher", () => {
  const original = { Modal: obsidian.Modal };
  afterEach(() => { obsidian.Modal = original.Modal; });

  async function notes(teacher, files = {}, language = "en") {
    let modal;
    obsidian.Modal = class { constructor() { this.contentEl = new El(); this.modalEl = new El(); modal = this; } open() {} close() {} };
    const { openVideoSettingsModal } = require("../src/videos/settings-modal.js");
    const adapter = Object.assign(vaultAdapter({ "engram-quest/videos/settings.json": json({ pro: true, cast: { teacher } }), ...files }), { getResourcePath: (p) => p });
    await openVideoSettingsModal({ app: { vault: { adapter } }, plugin: { settings: { language, licenseValid: true } } }, { language, licenseValid: true });
    return modal.contentEl.all().filter((el) => /lh-vid-set-note/.test(el.cls)).map((el) => el.text);
  }

  it("says when its file is missing or its name cannot be listed, in both languages", async () => {
    expect((await notes("custom:gone")).some((n) => n.includes('"gone" was not found'))).toBe(true);
    expect((await notes("custom:Bad_Name", { "engram-quest/custom/cast/teachers/Bad_Name.json": json({ name: { en: "B" } }) })).some((n) => n.includes("was not found"))).toBe(true);
    expect((await notes("custom:gone", {}, "zh-tw")).some((n) => n.includes("找不到你的老師「gone」"))).toBe(true);
  });

  it("says nothing of the kind when the teacher is there", async () => {
    const found = await notes("custom:kay", { "engram-quest/custom/cast/teachers/kay.json": json({ name: { en: "Kay" } }) });
    expect(found.some((n) => n.includes("not found"))).toBe(false);
  });
});

describe("the plugin's own flashcard scan", () => {
  const { scanReviewDecks } = require("../src/review/decks.js");
  const reviewHelpers = require("../src/review/helpers.js");

  it("never makes cards from the vault's top-level engram-quest/, but still reads a note folder of that name", async () => {
    const text = {
      "Study/bio.md": "Mitochondria :: make energy\n",
      "engram-quest/custom/preferences/all.md": "Diagrams :: always\n",
      "engram-quest/explainer/assets/old-skill/references/obsidian-cli.md": "Search :: obsidian search\n",
      "Projects/engram-quest/plan.md": "Pitch :: the plugin\n",
    };
    const files = Object.keys(text).map((p) => ({ path: p, name: p.split("/").pop(), basename: p.split("/").pop().replace(/\.md$/, ""), parent: { name: p.split("/").slice(-2, -1)[0] || "/" } }));
    const app = {
      vault: { getMarkdownFiles: () => files, read: async (f) => text[f.path], adapter: { exists: async () => false, list: async () => ({ files: [], folders: [] }), read: async () => "{}" } },
      metadataCache: { getFileCache: () => null },
    };
    const decks = await scanReviewDecks(app, { enableSRScan: true, flashcardTags: "flashcards" }, reviewHelpers);
    const sources = decks.flatMap((d) => d.cards.map((card) => card.notePath));
    expect(sources).toContain("Study/bio.md");
    expect(sources).toContain("Projects/engram-quest/plan.md");
    expect(sources.filter((p) => p.startsWith("engram-quest/"))).toEqual([]);
  });
});

describe("the Hub help explains the custom area", () => {
  const CONTENT = require("../src/hub/help-content.js");
  for (const [lang, words] of [["zh", ["engram-quest/custom/", "自訂區", "環境變數"]], ["en", ["engram-quest/custom/", "Custom area", "environment variables"]]]) {
    it(lang, () => {
      const section = CONTENT[lang].sections.find((s) => s.id === "custom");
      expect(section).toBeTruthy();
      const text = JSON.stringify(section.body);
      for (const w of words) expect(text).toContain(w);
    });
  }
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
      addText(cb) { const x = new Proxy({}, { get: (_, k) => (k === "inputEl" ? { style: {}, classList: { add() {} } } : () => x) }); cb(x); return this; }
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
