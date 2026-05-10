"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { SkillsInstallModal: de, isInstallerAvailable: me } = require("./skills");

var pe = class extends I.PluginSettingTab {
  constructor(e, t) { super(e, t); this.plugin = t; }
  display() {
    let { containerEl: e } = this, t = this.plugin.settings;
    e.empty();

    // Support row — top of settings tab
    const _support = e.createEl("div", { attr: { style: "display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin:0 0 18px;" } });
    const _sponsor = _support.createEl("a", { attr: { href: "https://github.com/bahfahh/engram-quest", target: "_blank", rel: "noopener", style: "display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:#ec4899;color:#fff;text-decoration:none;font-size:13px;font-weight:600;border:none;" } });
    _sponsor.createEl("span", { text: "♥" });
    _sponsor.createEl("span", { text: "Sponsor" });
    const _coffee = _support.createEl("a", { attr: { href: "https://ko-fi.com/wen_aidev", target: "_blank", rel: "noopener", style: "display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:#fcd34d;color:#1f2937;text-decoration:none;font-size:13px;font-weight:600;border:none;" } });
    _coffee.createEl("span", { text: "☕" });
    _coffee.createEl("span", { text: "Buy me a coffee" });

    new I.Setting(e).setName(c(t, "LANGUAGE")).setDesc(c(t, "LANGUAGE_DESC")).addDropdown(r => r.addOption("en", c(t, "LANGUAGE_ENGLISH")).addOption("zh-tw", c(t, "LANGUAGE_ZH_TW")).addOption("system", c(t, "LANGUAGE_SYSTEM")).setValue(t.language || "en").onChange(async s => { this.plugin.settings.language = s; await this.plugin.saveData(this.plugin.settings); this.display(); })),
    new I.Setting(e).setName(c(t, "SETTINGS_APPEARANCE")).setHeading(),
    new I.Setting(e).setName(c(t, "SETTINGS_THEME_NAME")).setDesc(c(t, "SETTINGS_THEME_DESC")).addDropdown(r => r.addOption("bright", `☀️ ${c(t, "SETTINGS_THEME_BRIGHT")}`).addOption("dark", `🌙 ${c(t, "SETTINGS_THEME_DARK")}`).addOption("minimal", `✨ ${c(t, "SETTINGS_THEME_MINIMAL")}`).setValue(t.lhTheme).onChange(async s => { this.plugin.settings.lhTheme = s; await this.plugin.saveData(this.plugin.settings); })),
    new I.Setting(e).setName(c(t, "SETTINGS_REVIEW_DECK")).setHeading(),
    new I.Setting(e).setName(c(t, "SETTINGS_FLASHCARD_TAGS_NAME")).setDesc(c(t, "SETTINGS_FLASHCARD_TAGS_DESC")).addTextArea(r => { r.setPlaceholder("flashcards").setValue(t.flashcardTags).onChange(async s => { this.plugin.settings.flashcardTags = s.trim(); await this.plugin.saveData(this.plugin.settings); }); r.inputEl.style.cssText = "width:200px;height:72px;font-family:monospace;font-size:13px"; }),
    new I.Setting(e).setName(c(t, "SETTINGS_SR_SCAN_NAME")).setDesc(c(t, "SETTINGS_SR_SCAN_DESC")).addToggle(r => r.setValue(t.enableSRScan).onChange(async s => { this.plugin.settings.enableSRScan = s; await this.plugin.saveData(this.plugin.settings); })),
    new I.Setting(e).setName(c(t, "SETTINGS_MAX_INTERVAL_NAME")).setDesc(c(t, "SETTINGS_MAX_INTERVAL_DESC")).addText(r => r.setPlaceholder("36525").setValue(String(t.maxInterval)).onChange(async s => { let l = parseInt(s); !isNaN(l) && l >= 1 && (this.plugin.settings.maxInterval = l, await this.plugin.saveData(this.plugin.settings)); })),
    new I.Setting(e).setName(c(t, "SETTINGS_RETENTION_NAME")).setDesc(c(t, "SETTINGS_RETENTION_DESC")).addSlider(r => { var s; return r.setLimits(.7, .99, .01).setValue((s = t.requestedRetention) != null ? s : .9).setDynamicTooltip().onChange(async l => { this.plugin.settings.requestedRetention = l; await this.plugin.saveData(this.plugin.settings); }); }),
    new I.Setting(e).setName(c(t, "SETTINGS_MEMORY_MAP")).setHeading(),
    new I.Setting(e).setName(c(t, "SETTINGS_MEMORY_MAP_FOLDER_NAME")).setDesc(c(t, "SETTINGS_MEMORY_MAP_FOLDER_DESC")).addText(r => {
      r.setPlaceholder("Maps/MemoryMaps").setValue(t.memoryMapFolder || "").onChange(async s => {
        this.plugin.settings.memoryMapFolder = s.trim();
        await this.plugin.saveData(this.plugin.settings);
        const adapter = this.app.vault.adapter;
        try {
          if (!await adapter.exists(".memory-map")) await this.app.vault.createFolder(".memory-map");
          await adapter.write(".memory-map/config.json", JSON.stringify({ memoryMapFolder: this.plugin.settings.memoryMapFolder }, null, 2));
        } catch (err) { console.error("EngramQuest: could not write .memory-map/config.json", err); }
      });
      r.inputEl.style.cssText = "width:200px;font-family:monospace;font-size:13px";
    }),
    new I.Setting(e).setName(c(t, "SETTINGS_AI_SKILLS")).setHeading(),
    new I.Setting(e).setName(c(t, "SETTINGS_AI_SKILLS")).setDesc(c(t, "SETTINGS_AI_SKILLS_DESC")).addButton(r => r.setButtonText(c(t, "SETTINGS_AI_SKILLS_BUTTON")).setCta().onClick(() => { if (!me()) { new I.Notice("EngramQuest installer assets are unavailable."); return; } new de(this.app, this.plugin).open(); })),
    new I.Setting(e).setName(c(t, "SETTINGS_AUTO_UPDATE_SKILLS_NAME")).setDesc(c(t, "SETTINGS_AUTO_UPDATE_SKILLS_DESC")).addToggle(r => r.setValue(!!t.autoUpdateInstalledSkills).onChange(async s => { this.plugin.settings.autoUpdateInstalledSkills = s; await this.plugin.saveData(this.plugin.settings); })),
    new I.Setting(e).setName(c(t, "SETTINGS_PRO")).setHeading(),
    // Pro license toggle. Future Polar.sh integration replaces this with a key input
    // that calls a validate API; the same `licenseValid` flag remains the runtime gate.
    new I.Setting(e).setName(c(t, "SETTINGS_PRO_LICENSE_NAME")).setDesc(c(t, "SETTINGS_PRO_LICENSE_DESC")).addToggle(r => r.setValue(!!t.licenseValid).onChange(async s => { this.plugin.settings.licenseValid = s; await this.plugin.saveData(this.plugin.settings); }));
  }
};

module.exports = { SettingsTab: pe };
