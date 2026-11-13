import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const obsidian = require("./__mocks__/obsidian.cjs");
const { SettingsTab } = require("../src/hub/settings.js");

// Records every row the settings tab draws, and the change handler of each control,
// so a test can operate the controls the way a user would.
function recordingSetting(rows) {
  return class {
    constructor() { this.row = { name: "", heading: false, handlers: [] }; rows.push(this.row); }
    setName(name) { this.row.name = name; return this; }
    setDesc() { return this; }
    setHeading() { this.row.heading = true; return this; }
    // A control accepts any chained call; only its change handler is kept.
    _add(kind, cb) {
      const control = new Proxy({}, {
        get: (_, prop) => prop === "inputEl" ? { style: {} } : (...args) => {
          if (prop === "onChange" || prop === "onClick") this.row.handlers.push({ kind, fn: args[0] });
          return control;
        },
      });
      cb(control);
      return this;
    }
    addDropdown(cb) { return this._add("dropdown", cb); }
    addText(cb) { return this._add("text", cb); }
    addTextArea(cb) { return this._add("textarea", cb); }
    addToggle(cb) { return this._add("toggle", cb); }
    addSlider(cb) { return this._add("slider", cb); }
    addButton(cb) { return this._add("button", cb); }
  };
}

function drawTab(settings) {
  const rows = [];
  obsidian.Setting = recordingSetting(rows);
  const saved = [];
  const plugin = { settings, saveData: async (data) => { saved.push(JSON.parse(JSON.stringify(data))); } };
  const tab = new SettingsTab({ vault: { adapter: {} } }, plugin);
  tab.containerEl = new obsidian.Modal().contentEl;
  tab.display();
  return { rows, saved, plugin };
}

describe("settings tab", () => {
  let originalSetting;
  beforeEach(() => { originalSetting = obsidian.Setting; });
  afterEach(() => { obsidian.Setting = originalSetting; });

  it("offers no theme choice: the Hub follows Obsidian's own light or dark theme", async () => {
    for (const language of ["en", "zh-tw"]) {
      const { rows, plugin } = drawTab({ language, flashcardTags: "flashcards", maxInterval: 36525 });
      const names = rows.map(r => r.name);
      expect(names).not.toContain("Visual theme");
      expect(names).not.toContain("視覺主題");
      // A heading with nothing under it would be an empty section.
      rows.forEach((row, i) => {
        if (row.heading) expect(rows[i + 1] && !rows[i + 1].heading, `"${row.name}" has rows under it`).toBe(true);
      });
      // Operating every dropdown must only store settings the plugin actually uses.
      // Snapshot first: changing the language redraws the tab, which adds rows.
      const dropdowns = rows.flatMap(row => row.handlers.filter(h => h.kind === "dropdown"));
      for (const h of dropdowns) await h.fn(language);
      expect(plugin.settings).not.toHaveProperty("lhTheme");
    }
  });

  it("ignores the theme value an older data.json still carries, and leaves it there", async () => {
    const fresh = drawTab({ language: "en", flashcardTags: "flashcards", maxInterval: 36525 }).rows.map(r => r.name);
    const old = drawTab({ language: "en", flashcardTags: "flashcards", maxInterval: 36525, lhTheme: "minimal" });
    expect(old.rows.map(r => r.name)).toEqual(fresh);
    const dropdowns = old.rows.flatMap(row => row.handlers.filter(h => h.kind === "dropdown"));
    for (const h of dropdowns) await h.fn("en");
    expect(old.saved.length).toBeGreaterThan(0);
    expect(old.saved.every(data => data.lhTheme === "minimal")).toBe(true);
  });

  it("has no default for a setting nothing reads", () => {
    // Booleans keep a failure from printing the whole source file.
    expect(/lhTheme\s*:/.test(readFileSync("src/main.js", "utf8"))).toBe(false);
    expect(/SETTINGS_THEME_|SETTINGS_APPEARANCE/.test(readFileSync("src/i18n/index.js", "utf8"))).toBe(false);
  });
});
