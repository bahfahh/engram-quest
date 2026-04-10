"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { SkillsInstallModal: de, isInstallerAvailable: me } = require("./skills");

var pe = class extends I.PluginSettingTab {
  constructor(e, t) { super(e, t); this.plugin = t; }
  display() {
    let { containerEl: e } = this, t = this.plugin.settings;
    e.empty(), e.createEl("h2", { text: c(t, "SETTINGS_TITLE") }),
    new I.Setting(e).setName(c(t, "LANGUAGE")).setDesc(c(t, "LANGUAGE_DESC")).addDropdown(r => r.addOption("en", c(t, "LANGUAGE_ENGLISH")).addOption("zh-tw", c(t, "LANGUAGE_ZH_TW")).addOption("system", c(t, "LANGUAGE_SYSTEM")).setValue(t.language || "en").onChange(async s => { this.plugin.settings.language = s; await this.plugin.saveData(this.plugin.settings); this.display(); })),
    e.createEl("h3", { text: c(t, "SETTINGS_APPEARANCE") }),
    new I.Setting(e).setName(c(t, "SETTINGS_THEME_NAME")).setDesc(c(t, "SETTINGS_THEME_DESC")).addDropdown(r => r.addOption("bright", `☀️ ${c(t, "SETTINGS_THEME_BRIGHT")}`).addOption("dark", `🌙 ${c(t, "SETTINGS_THEME_DARK")}`).addOption("minimal", `✨ ${c(t, "SETTINGS_THEME_MINIMAL")}`).setValue(t.lhTheme).onChange(async s => { this.plugin.settings.lhTheme = s; await this.plugin.saveData(this.plugin.settings); })),
    e.createEl("h3", { text: c(t, "SETTINGS_REVIEW_DECK") }),
    new I.Setting(e).setName(c(t, "SETTINGS_FLASHCARD_TAGS_NAME")).setDesc(c(t, "SETTINGS_FLASHCARD_TAGS_DESC")).addTextArea(r => { r.setPlaceholder("flashcards").setValue(t.flashcardTags).onChange(async s => { this.plugin.settings.flashcardTags = s.trim(); await this.plugin.saveData(this.plugin.settings); }); r.inputEl.style.cssText = "width:200px;height:72px;font-family:monospace;font-size:13px"; }),
    new I.Setting(e).setName(c(t, "SETTINGS_SR_SCAN_NAME")).setDesc(c(t, "SETTINGS_SR_SCAN_DESC")).addToggle(r => r.setValue(t.enableSRScan).onChange(async s => { this.plugin.settings.enableSRScan = s; await this.plugin.saveData(this.plugin.settings); })),
    new I.Setting(e).setName(c(t, "SETTINGS_MAX_INTERVAL_NAME")).setDesc(c(t, "SETTINGS_MAX_INTERVAL_DESC")).addText(r => r.setPlaceholder("36525").setValue(String(t.maxInterval)).onChange(async s => { let l = parseInt(s); !isNaN(l) && l >= 1 && (this.plugin.settings.maxInterval = l, await this.plugin.saveData(this.plugin.settings)); })),
    new I.Setting(e).setName(c(t, "SETTINGS_RETENTION_NAME")).setDesc(c(t, "SETTINGS_RETENTION_DESC")).addSlider(r => { var s; return r.setLimits(.7, .99, .01).setValue((s = t.requestedRetention) != null ? s : .9).setDynamicTooltip().onChange(async l => { this.plugin.settings.requestedRetention = l; await this.plugin.saveData(this.plugin.settings); }); }),
    e.createEl("h3", { text: c(t, "SETTINGS_AI_SKILLS") }),
    new I.Setting(e).setName(c(t, "SETTINGS_AI_SKILLS")).setDesc(c(t, "SETTINGS_AI_SKILLS_DESC")).addButton(r => r.setButtonText(c(t, "SETTINGS_AI_SKILLS_BUTTON")).setCta().onClick(() => { if (!me()) { new I.Notice("EngramQuest installer assets are unavailable."); return; } new de(this.app, this.plugin).open(); })),
    new I.Setting(e).setName(c(t, "SETTINGS_AUTO_UPDATE_SKILLS_NAME")).setDesc(c(t, "SETTINGS_AUTO_UPDATE_SKILLS_DESC")).addToggle(r => r.setValue(!!t.autoUpdateInstalledSkills).onChange(async s => { this.plugin.settings.autoUpdateInstalledSkills = s; await this.plugin.saveData(this.plugin.settings); }));
  }
};

module.exports = { SettingsTab: pe };
