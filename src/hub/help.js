"use strict";
// The Hub help dialog, opened by the "?" in the sidebar (or the capsule on a phone): what EngramQuest
// is, a map of every tab that opens its visual guide, and one collapsible section per topic.
// The words live in help-content.js; this file only draws them with the Hub's design tokens.

const I = require("obsidian");
const { ProUpgradeModal } = require("../license/upgrade");
const { t: c, getLocale } = require("../i18n");
const { registerSelectionCopy } = require("../ui/selection-copy");
const { FeatureGuideModal } = require("./feature-guide");
const { TABS } = require("./categories");
const { icon, iconButton, watchTheme, featureIcon } = require("./ui");
const CONTENT = require("./help-content");

const PROMPT_FILE = "assets/claude-desktop-prompt.txt";
// The release build carries the prompt text in main.js (a store install has no assets/ folder);
// a test or dev run without it reads the file.
const BUNDLED_PROMPT = typeof __SETUP_PROMPT__ === "undefined" ? null : __SETUP_PROMPT__;
const SUPPORT_URL = "https://ko-fi.com/wen_aidev";

// Section text may name the vault's config folder as {configDir}; it is not always ".obsidian".
function rich(parent, html, configDir) {
  parent.appendChild(I.sanitizeHTMLToDom(html.replace(/\{configDir\}/g, () => configDir)));
  return parent;
}

// A tab's glass icon from the sidebar; other sections get a neutral tile.
function tile(parent, plugin, tab, fallback) {
  const known = TABS[tab];
  if (known) return featureIcon(parent, plugin, tab, { size: 28, fallback: known.icon });
  return icon(parent.createSpan({ cls: "lh-gi" }), fallback);
}

class HelpModal extends I.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const t = this.plugin.settings;
    const copy = getLocale(t) === "zh-tw" ? CONTENT.zh : CONTENT.en;
    this.modalEl.addClass("lh-hub", "lh-help");
    watchTheme(this, { vars: true });
    registerSelectionCopy(this);

    const root = this.contentEl;
    root.empty();
    const head = root.createDiv({ cls: "lh-help-head" });
    head.createEl("h2", { cls: "lh-help-title", text: c(t, "HELP_TITLE") });
    iconButton(head, "close", c(t, "HUB_CLOSE"), () => this.close());

    const body = root.createDiv({ cls: "lh-help-body" });
    this.renderIntro(body, copy);
    body.createEl("h3", { cls: "lh-help-h", text: copy.ui.sectionsHead });
    const list = body.createDiv({ cls: "lh-help-acc" });
    copy.sections.forEach((section, at) => this.renderSection(list, section, copy.ui, at === 0));

    const foot = body.createDiv({ cls: "lh-help-foot" });
    foot.createSpan({ text: copy.ui.supportAsk });
    foot.createEl("a", { cls: "lh-link", text: "Buy me a coffee", attr: { href: SUPPORT_URL, target: "_blank", rel: "noopener" } });
  }

  onClose() {
    this.contentEl.empty();
    activeDocument.querySelectorAll(".eq-guide-lightbox").forEach(el => el.remove());
  }

  // The three groups and their tabs, the same shape as the sidebar. Each tab opens its guide.
  renderIntro(body, copy) {
    body.createEl("p", { cls: "lh-help-lead", text: copy.ui.intro });
    const map = body.createDiv({ cls: "lh-help-map" });
    copy.groups.forEach((group) => {
      const card = map.createDiv({ cls: "lh-help-grp" });
      const gh = card.createDiv({ cls: "lh-help-grp-h" });
      gh.createEl("b", { text: group.name });
      gh.createSpan({ text: group.desc });
      group.tabs.forEach((item) => {
        const btn = card.createEl("button", { cls: "lh-help-tab", attr: { title: copy.ui.openGuide } });
        tile(btn, this.plugin, item.tab);
        const text = btn.createSpan({ cls: "lh-help-tab-tx" });
        const name = text.createSpan({ cls: "lh-help-tab-nm", text: item.name });
        if (item.pro) name.createSpan({ cls: "lh-help-pro", text: "Pro" });
        text.createSpan({ cls: "lh-help-tab-sub", text: item.sub });
        icon(btn, "chevron");
        btn.addEventListener("click", () => new FeatureGuideModal(this.app, this.plugin, item.tab).open());
      });
    });
    body.createEl("p", { cls: "lh-help-note", text: copy.ui.guidesHint });
    body.createEl("p", { cls: "lh-help-lead", text: copy.ui.introAi });
  }

  renderSection(parent, section, ui, open) {
    const item = parent.createDiv({ cls: "lh-help-sec" });
    const panelId = `lh-help-${section.id}`;
    const btn = item.createEl("h3", { cls: "lh-help-sec-hd" }).createEl("button", { cls: "lh-help-sec-h", attr: { id: `${panelId}-h`, "aria-expanded": String(open), "aria-controls": panelId } });
    tile(btn, this.plugin, section.tab, section.icon);
    btn.createSpan({ cls: "lh-help-sec-t", text: section.title });
    btn.createSpan({ cls: "lh-help-tag" + (section.tag === "Pro" ? " pro" : ""), text: section.tag });
    icon(btn.createSpan({ cls: "lh-help-chev" }), "chevron");
    const panel = item.createDiv({ cls: "lh-help-sec-b", attr: { id: panelId } });
    panel.hidden = !open;
    btn.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      btn.setAttribute("aria-expanded", String(!panel.hidden));
    });
    section.body.forEach(block => this.renderBlock(panel, block, ui));
    if (section.tab) {
      const link = panel.createDiv({ cls: "lh-help-acts" }).createEl("button", { cls: "lh-link" });
      link.createSpan({ text: ui.openGuide });
      icon(link, "arrow");
      link.addEventListener("click", () => new FeatureGuideModal(this.app, this.plugin, section.tab).open());
    }
  }

  renderBlock(panel, block, ui) {
    const configDir = this.app.vault.configDir;
    const put = (el, html) => rich(el, html, configDir);
    if (block.p) put(panel.createEl("p"), block.p);
    else if (block.h) put(panel.createEl("h4"), block.h);
    else if (block.steps || block.list) {
      const el = panel.createEl(block.steps ? "ol" : "ul");
      (block.steps || block.list).forEach(line => put(el.createEl("li"), line));
    } else if (block.code) panel.createEl("pre", { text: block.code });
    else if (block.say) {
      const box = panel.createDiv({ cls: "lh-help-say" });
      block.say.forEach(line => box.createDiv({ cls: "lh-help-say-i", text: line }));
    } else if (block.table) {
      const table = panel.createDiv({ cls: "lh-help-tbl" }).createEl("table");
      block.table.forEach((row, at) => {
        const tr = table.createEl("tr");
        row.forEach(cell => put(tr.createEl(at ? "td" : "th"), cell));
      });
    } else if (block.note) put(panel.createDiv({ cls: "lh-help-aside" }), block.note);
    else if (block.first) {
      const box = panel.createDiv({ cls: "lh-help-first" });
      box.createDiv({ cls: "lh-help-first-h", text: ui.firstStep });
      put(box.createDiv(), block.first);
    } else if (block.action === "pro") this.proButton(panel);
    else if (block.action === "desktopPrompt") this.promptButton(panel, ui);
  }

  proButton(panel) {
    const t = this.plugin.settings;
    panel.createDiv({ cls: "lh-help-acts" })
      .createEl("button", { cls: "lh-btn", text: c(t, t.licenseValid ? "PRO_ACTIVE_ACTION" : "PRO_LEARN") })
      .addEventListener("click", () => new ProUpgradeModal(this.app, this.plugin).open());
  }

  promptButton(panel, ui) {
    const btn = panel.createDiv({ cls: "lh-help-acts" }).createEl("button", { cls: "lh-btn alt", text: ui.copyPrompt });
    btn.addEventListener("click", async () => {
      try {
        const text = BUNDLED_PROMPT ?? await this.app.vault.adapter.read(I.normalizePath(`${this.plugin.manifest.dir}/${PROMPT_FILE}`));
        await navigator.clipboard.writeText(text);
        btn.setText(ui.copied);
      } catch (err) {
        console.warn("EngramQuest: copying the setup prompt failed", err);
        btn.setText(ui.copyFailed);
      }
      window.setTimeout(() => { if (btn.isConnected) btn.setText(ui.copyPrompt); }, 2000);
    });
  }
}

module.exports = { HelpModal };
