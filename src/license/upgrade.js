"use strict";

const { Modal } = require("obsidian");
const { t } = require("../i18n");

const FEATURES = [
  { id: "anchors", icon: "✦", name: "PRO_ANCHORS", desc: "PRO_ANCHORS_DESC", detail: "PRO_ANCHORS_DETAIL" },
  { id: "explain", icon: "◇", name: "PRO_EXPLAIN", desc: "PRO_EXPLAIN_DESC", detail: "PRO_EXPLAIN_DETAIL" },
  { id: "time", icon: "◷", name: "PRO_TIME", desc: "PRO_TIME_DESC", detail: "PRO_TIME_DETAIL" },
  { id: "video", icon: "▷", name: "PRO_VIDEO", desc: "PRO_VIDEO_DESC", detail: "PRO_VIDEO_DETAIL", research: true },
];

function renderUpgradeContent(container, plugin, { close, checkout } = {}) {
  const tr = key => t(plugin.settings, key);
  const wrap = container.createEl("div", { cls: "eq-pro-layout" });
  const art = wrap.createEl("div", { cls: "eq-pro-art" });
  const brand = art.createEl("div", { cls: "eq-pro-brand" });
  brand.createEl("span", { text: "✦", attr: { "aria-hidden": "true" } });
  // Brand name retains its official capitalization.
  // eslint-disable-next-line obsidianmd/ui/sentence-case
  brand.createEl("span", { text: "EngramQuest Pro" });
  const base = plugin.manifest.dir || `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
  for (const theme of ["light", "dark"]) {
    const image = art.createEl("img", { cls: `eq-pro-notebook eq-pro-notebook-${theme}`, attr: { alt: tr("PRO_ART_ALT") } });
    image.addEventListener("error", () => { image.hidden = true; art.addClass("eq-pro-art-missing"); });
    image.src = plugin.app.vault.adapter.getResourcePath(`${base}/assets/pro/learning-notebook-${theme}.webp`);
  }
  art.createEl("p", { cls: "eq-pro-art-caption", text: tr("PRO_ART_CAPTION") });

  const body = wrap.createEl("div", { cls: "eq-pro-body" });
  const heading = body.createEl("h2", { cls: "eq-pro-heading", text: tr("PRO_HEADLINE") });
  heading.id = "eq-pro-heading";
  body.createEl("p", { cls: "eq-pro-subtitle", text: tr("PRO_SUBTITLE") });
  const list = body.createEl("div", { cls: "eq-pro-features" });
  for (const feature of FEATURES) {
    const item = list.createEl("div", { cls: "eq-pro-feature" });
    const button = item.createEl("button", { cls: "eq-pro-feature-toggle", attr: { "aria-expanded": "false", "aria-controls": `eq-pro-detail-${feature.id}` } });
    const thumb = button.createEl("span", { cls: `eq-pro-thumb eq-pro-thumb-${feature.id}`, attr: { "aria-hidden": "true" } });
    thumb.createEl("span", { cls: "eq-pro-thumb-icon", text: feature.icon });
    const mini = thumb.createEl("span", { cls: "eq-pro-mini" });
    for (let n = 0; n < 3; n++) mini.createEl("span", { text: feature.id === "time" ? ["5", "10", "15"][n] : "" });
    const copy = button.createEl("span", { cls: "eq-pro-feature-copy" });
    const title = copy.createEl("span", { cls: "eq-pro-feature-title", text: tr(feature.name) });
    if (feature.research) title.createEl("span", { cls: "eq-pro-research", text: tr("PRO_RESEARCH") });
    copy.createEl("span", { cls: "eq-pro-feature-desc", text: tr(feature.desc) });
    button.createEl("span", { cls: "eq-pro-expand", text: "+", attr: { "aria-hidden": "true" } });
    const detail = item.createEl("p", { cls: "eq-pro-detail", text: tr(feature.detail) });
    detail.id = `eq-pro-detail-${feature.id}`;
    detail.hidden = true;
    button.addEventListener("click", () => {
      detail.hidden = !detail.hidden;
      button.setAttribute("aria-expanded", String(!detail.hidden));
      button.querySelector(".eq-pro-expand").setText(detail.hidden ? "+" : "−");
    });
  }
  const price = body.createEl("div", { cls: "eq-pro-price" });
  const priceTop = price.createEl("div", { cls: "eq-pro-price-top" });
  priceTop.createEl("strong", { text: "US$11.99" });
  priceTop.createEl("span", { cls: "eq-pro-buyout", text: tr("PRO_BUYOUT") });
  price.createEl("p", { text: `✓ ${tr("PRO_FUTURE")}` });
  price.createEl("p", { text: `✓ ${tr("PRO_FREE_PROMISE")}` });
  body.createEl("p", { cls: "eq-pro-tax", text: tr("PRO_TAX") });
  const actions = body.createEl("div", { cls: "eq-pro-actions" });
  const active = !!plugin.settings.licenseValid;
  const buy = actions.createEl("button", { cls: "lh-btn-primary", text: tr(active ? "PRO_ACTIVE_ACTION" : "PRO_UPGRADE_ACTION") });
  buy.disabled = !active && !plugin.license?.config.checkoutUrl;
  buy.addEventListener("click", () => { if (active) close?.(); else checkout?.(); });
  const later = actions.createEl("button", { text: tr(active ? "PRO_BACK" : "PRO_CONTINUE_FREE") });
  later.addEventListener("click", () => close?.());
  if (!active) body.createEl("p", { cls: "eq-pro-key-hint", text: tr("PRO_KEY_HINT") });
  if (plugin.license?.config.environment === "sandbox") {
    body.createEl("p", { cls: "eq-pro-sandbox", text: tr("LICENSE_SANDBOX") });
  }
}

class ProUpgradeModal extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    this.modalEl.addClass("eq-pro-modal");
    this.modalEl.setAttribute("aria-labelledby", "eq-pro-heading");
    renderUpgradeContent(this.contentEl, this.plugin, {
      close: () => this.close(),
      checkout: () => window.open(this.plugin.license.config.checkoutUrl, "_blank", "noopener,noreferrer"),
    });
  }
  onClose() { this.contentEl.empty(); }
}

module.exports = { ProUpgradeModal, renderUpgradeContent, FEATURES };
