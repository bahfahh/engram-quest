"use strict";
// The Hub guide, opened by the "?" in the sidebar (or the capsule on a phone). Its first screen is the
// whole product in three steps (install the skills, open an AI tool, say what you want) with a few
// sentences to copy; everything else waits below in collapsed sections. Opened with { intro: true }
// it is the first-run introduction: the same first screen and nothing else (see intro.js).
// The words live in help-content.js; this file only draws them with the Hub's design tokens.

const I = require("obsidian");
const { ProUpgradeModal } = require("../license/upgrade");
const { t: c, getLocale } = require("../i18n");
const { registerSelectionCopy } = require("../ui/selection-copy");
const { FeatureGuideModal, videoEmbed } = require("./feature-guide");
const { SkillsInstallModal, isInstallerAvailable, anySkillsInstalled } = require("./skills");
const { TABS } = require("./categories");
const { icon, iconButton, watchTheme, featureIcon, isPhone } = require("./ui");
const CONTENT = require("./help-content");

const PROMPT_FILE = "assets/claude-desktop-prompt.txt";
// The release build carries the prompt text in main.js (a store install has no assets/ folder);
// a test or dev run without it reads the file.
const BUNDLED_PROMPT = typeof __SETUP_PROMPT__ === "undefined" ? null : __SETUP_PROMPT__;
const SUPPORT_URL = "https://ko-fi.com/wen_aidev";
const STEP_ICONS = { install: "download", tool: "terminal", say: "chat" };
const FLASH_MS = 2000;

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

// "I want to learn {SEO}" -> the text to copy, without the braces.
function plainSentence(text) { return text.replace(/[{}]/g, ""); }

// Draws a sentence with its {example} marked as the part to replace.
function sentence(parent, text) {
  text.split(/(\{[^}]*\})/).filter(Boolean).forEach((part) => {
    if (part.startsWith("{")) parent.createSpan({ cls: "lh-start-slot", text: part.slice(1, -1) });
    else parent.appendText(part);
  });
  return parent;
}

class HelpModal extends I.Modal {
  // opts.intro: draw only the first screen, as the first-run introduction. opts.onDone runs on close.
  // opts.skillsInstalled: what the caller already found in the vault, so step one is right at once.
  constructor(app, plugin, opts = {}) {
    super(app);
    this.plugin = plugin;
    this.intro = !!opts.intro;
    this.onDone = opts.onDone;
    this.skillsInstalled = typeof opts.skillsInstalled === "boolean" ? opts.skillsInstalled : null; // null: not checked yet
  }

  onOpen() {
    this.copy = getLocale(this.plugin.settings) === "zh-tw" ? CONTENT.zh : CONTENT.en;
    this.modalEl.addClass("lh-hub", "lh-help");
    watchTheme(this, { vars: true });
    registerSelectionCopy(this);
    this.render();
    if (this.skillsInstalled === null) this.checkSkills();
  }

  onClose() {
    this.contentEl.querySelectorAll("iframe").forEach((f) => { f.src = "about:blank"; });
    this.contentEl.empty();
    activeDocument.querySelectorAll(".eq-guide-lightbox").forEach(el => el.remove());
    if (this.onDone) this.onDone();
  }

  render() {
    const t = this.plugin.settings, copy = this.copy;
    this.modalEl.classList.toggle("is-intro", this.intro);
    this.sections = new Map();

    const root = this.contentEl;
    root.empty();
    const head = root.createDiv({ cls: "lh-help-head" });
    head.createEl("h2", { cls: "lh-help-title", text: this.intro ? copy.start.introTitle : c(t, "HELP_TITLE") });
    iconButton(head, "close", c(t, "HUB_CLOSE"), () => this.close());

    const body = root.createDiv({ cls: "lh-help-body" });
    this.renderStart(body, copy.start);
    if (this.intro) {
      const foot = root.createDiv({ cls: "lh-guide-foot" });
      foot.createSpan({ cls: "lh-guide-hint", text: copy.start.introHint });
      this.doneBtn = foot.createEl("button", { cls: "lh-btn", text: copy.start.introDone });
      this.doneBtn.addEventListener("click", () => this.close());
      this.paintInstall();
      return;
    }

    body.createEl("h3", { cls: "lh-help-h", text: copy.ui.detailsHead });
    const list = body.createDiv({ cls: "lh-help-acc" });
    copy.sections.forEach(section => this.renderSection(list, section, copy.ui));

    const foot = body.createDiv({ cls: "lh-help-foot" });
    foot.createSpan({ text: copy.ui.supportAsk });
    foot.createEl("a", { cls: "lh-link", text: "Buy me a coffee", attr: { href: SUPPORT_URL, target: "_blank", rel: "noopener" } });
  }

  // The first screen: the three steps as a diagram, then one sentence per feature to copy.
  renderStart(body, start) {
    body.createEl("p", { cls: "lh-help-lead", text: start.lead });
    this.renderVideo(body, start);

    const steps = body.createDiv({ cls: "lh-start-steps" });
    start.steps.forEach((step, at) => {
      if (at) icon(steps.createSpan({ cls: "lh-start-arrow", attr: { "aria-hidden": "true" } }), "chevron");
      const card = steps.createDiv({ cls: "lh-start-step" });
      const art = card.createDiv({ cls: "lh-start-art" });
      icon(art, STEP_ICONS[step.art]);
      art.createSpan({ cls: "lh-start-n", text: String(at + 1) });
      const text = card.createDiv({ cls: "lh-start-tx" });
      text.createEl("b", { text: step.title });
      text.createSpan({ text: step.sub });
      if (step.art === "install") this.installEl = text.createDiv({ cls: "lh-start-act" });
    });
    this.paintInstall();
    if (isPhone()) body.createEl("p", { cls: "lh-help-note", text: start.phoneNote });

    body.createEl("h3", { cls: "lh-start-h", text: start.sayHead });
    const list = body.createDiv({ cls: "lh-start-say" });
    start.say.forEach(item => this.renderSay(list, item, start));

    const more = body.createDiv({ cls: "lh-start-more" });
    this.jump(more, start.manual, "review");
    this.jump(more, start.allSay, "say");
  }

  // The overview video, drawn only once a video id is set in help-content.js. The first-run introduction
  // (shown once, on first install) puts the player right there; the guide opened later loads it on request.
  renderVideo(body, start) {
    if (!start.video) return;
    const slot = body.createDiv({ cls: "lh-start-video" });
    const locale = this.copy === CONTENT.zh ? "zh-tw" : "en";
    if (this.intro) { videoEmbed(slot, start.video, "", locale); return; }
    const btn = slot.createEl("button", { cls: "lh-btn alt" });
    icon(btn, "play");
    btn.createSpan({ text: start.videoLabel });
    btn.addEventListener("click", () => {
      slot.empty();
      videoEmbed(slot, start.video, "", locale);
    });
  }

  // Step one's action: the installer while nothing is installed, a quiet "Installed" once it is.
  // Skills are for the AI tools on a computer, so a phone gets the note under the steps instead.
  // While the installer is the thing to press, the introduction's own button steps back.
  paintInstall() {
    const el = this.installEl, start = this.copy.start;
    if (!el) return;
    el.empty();
    const known = !isPhone() && isInstallerAvailable() && this.skillsInstalled !== null;
    const offer = known && !this.skillsInstalled;
    if (this.intro && this.doneBtn) this.doneBtn.classList.toggle("alt", offer);
    if (offer) el.createEl("button", { cls: "lh-btn", text: start.install }).addEventListener("click", () => this.openInstaller());
    else if (known) {
      const done = el.createSpan({ cls: "lh-start-done" });
      icon(done, "check");
      done.createSpan({ text: start.installed });
    }
  }

  async checkSkills() {
    try { this.skillsInstalled = await anySkillsInstalled(this.plugin); }
    catch (err) { console.warn("EngramQuest: could not check installed skills", err); this.skillsInstalled = false; }
    this.paintInstall();
  }

  openInstaller() {
    const installer = new SkillsInstallModal(this.app, this.plugin);
    installer.onClose = () => { this.checkSkills(); };
    installer.open();
  }

  // One sentence to say to an AI tool; pressing it copies it.
  renderSay(list, item, start) {
    const plain = plainSentence(item.text);
    const row = list.createEl("button", { cls: "lh-start-row", attr: { "aria-label": `${start.copySay}: ${plain}` } });
    tile(row, this.plugin, item.tab);
    const text = row.createSpan({ cls: "lh-start-row-tx" });
    sentence(text.createSpan({ cls: "lh-start-q" }), item.text);
    text.createSpan({ cls: "lh-start-makes", text: item.makes });
    const state = row.createSpan({ cls: "lh-start-copy", attr: { "aria-live": "polite" } });
    icon(state, "copy");
    row.addEventListener("click", async () => {
      let ok = true;
      try { await navigator.clipboard.writeText(plain); }
      catch (err) { ok = false; console.warn("EngramQuest: copying the sentence failed", err); }
      state.empty();
      if (ok) icon(state, "check");
      state.createSpan({ text: this.copy.ui[ok ? "copied" : "copyFailed"] });
      window.setTimeout(() => { if (state.isConnected) { state.empty(); icon(state, "copy"); } }, FLASH_MS);
    });
  }

  // A quiet link under the sentences that opens one of the sections below.
  jump(parent, label, sectionId) {
    const link = parent.createEl("button", { cls: "lh-link" });
    link.createSpan({ text: label });
    icon(link, "chevron");
    link.addEventListener("click", () => this.openSection(sectionId));
  }

  // The introduction has no sections of its own: it turns into the full guide first.
  openSection(id) {
    if (this.intro) { this.intro = false; this.render(); }
    const section = this.sections.get(id);
    if (!section) return;
    section.setOpen(true);
    section.item.scrollIntoView({ block: "start" });
  }

  renderSection(parent, section, ui) {
    const item = parent.createDiv({ cls: "lh-help-sec" });
    const panelId = `lh-help-${section.id}`;
    const btn = item.createEl("h3", { cls: "lh-help-sec-hd" }).createEl("button", { cls: "lh-help-sec-h", attr: { id: `${panelId}-h`, "aria-expanded": "false", "aria-controls": panelId } });
    tile(btn, this.plugin, section.tab, section.icon);
    btn.createSpan({ cls: "lh-help-sec-t", text: section.title });
    btn.createSpan({ cls: "lh-help-tag" + (section.tag === "Pro" ? " pro" : ""), text: section.tag });
    icon(btn.createSpan({ cls: "lh-help-chev" }), "chevron");
    const panel = item.createDiv({ cls: "lh-help-sec-b", attr: { id: panelId } });
    panel.hidden = true;
    const setOpen = (on) => {
      panel.hidden = !on;
      btn.setAttribute("aria-expanded", String(on));
    };
    btn.addEventListener("click", () => setOpen(panel.hidden));
    this.sections.set(section.id, { item, setOpen });
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
    else if (block.action === "installSkills") this.installButton(panel);
  }

  proButton(panel) {
    const t = this.plugin.settings;
    panel.createDiv({ cls: "lh-help-acts" })
      .createEl("button", { cls: "lh-btn", text: c(t, t.licenseValid ? "PRO_ACTIVE_ACTION" : "PRO_LEARN") })
      .addEventListener("click", () => new ProUpgradeModal(this.app, this.plugin).open());
  }

  installButton(panel) {
    if (isPhone() || !isInstallerAvailable()) return;
    panel.createDiv({ cls: "lh-help-acts" })
      .createEl("button", { cls: "lh-btn alt", text: this.copy.start.install })
      .addEventListener("click", () => this.openInstaller());
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
      window.setTimeout(() => { if (btn.isConnected) btn.setText(ui.copyPrompt); }, FLASH_MS);
    });
  }
}

module.exports = { HelpModal, plainSentence };
