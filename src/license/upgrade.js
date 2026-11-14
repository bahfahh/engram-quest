"use strict";

const { Modal } = require("obsidian");
const { t } = require("../i18n");
const { assetUrl } = require("../assets");
const { price: PRICE } = require("./config");
const { configured } = require("./core");

const FEATURES = [
  { id: "anchors", icon: "✦", name: "PRO_ANCHORS", desc: "PRO_ANCHORS_DESC", detail: "PRO_ANCHORS_DETAIL", start: "PRO_ANCHORS_START" },
  { id: "explain", icon: "◇", name: "PRO_EXPLAIN", desc: "PRO_EXPLAIN_DESC", detail: "PRO_EXPLAIN_DETAIL", start: "PRO_EXPLAIN_START" },
  { id: "time", icon: "◷", name: "PRO_TIME", desc: "PRO_TIME_DESC", detail: "PRO_TIME_DETAIL", start: "PRO_TIME_START" },
  { id: "video", icon: "▷", name: "PRO_VIDEO", desc: "PRO_VIDEO_DESC", detail: "PRO_VIDEO_DETAIL", start: "PRO_VIDEO_START" },
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
  for (const theme of ["light", "dark"]) {
    const image = art.createEl("img", { cls: `eq-pro-notebook eq-pro-notebook-${theme}`, attr: { alt: tr("PRO_ART_ALT") } });
    image.addEventListener("error", () => { image.hidden = true; art.addClass("eq-pro-art-missing"); });
    image.src = assetUrl(plugin.app, `assets/pro/learning-notebook-${theme}.webp`);
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
  priceTop.createEl("strong", { text: PRICE });
  priceTop.createEl("span", { cls: "eq-pro-buyout", text: tr("PRO_BUYOUT") });
  price.createEl("p", { text: `✓ ${tr("PRO_FUTURE")}` });
  price.createEl("p", { text: `✓ ${tr("PRO_FREE_PROMISE")}` });
  body.createEl("p", { cls: "eq-pro-tax", text: tr("PRO_TAX") });
  const actions = body.createEl("div", { cls: "eq-pro-actions" });
  const active = !!plugin.settings.licenseValid;
  const buy = actions.createEl("button", { cls: "lh-btn-primary", text: tr(active ? "PRO_ACTIVE_ACTION" : "PRO_UPGRADE_ACTION") });
  buy.disabled = !active && !plugin.license?.config.checkoutUrl;
  const later = actions.createEl("button", { text: tr(active ? "PRO_BACK" : "PRO_CONTINUE_FREE") });
  later.addEventListener("click", () => close?.());
  // Paying does not unlock anything by itself. The key box stays out of the way until it is the next
  // step: buying opens it and marks it as the thing left to do; a returning buyer opens it from the link.
  const keyBox = active ? null : renderKeyBox(body, plugin, () => close?.());
  buy.addEventListener("click", () => { if (active) close?.(); else { checkout?.(); keyBox?.reveal(true); } });
  if (plugin.license?.config.environment === "sandbox") {
    body.createEl("p", { cls: "eq-pro-sandbox", text: tr("LICENSE_SANDBOX") });
  }
}

// Validates a key the user entered. The welcome opens only when this call turned Pro on, so a
// re-check of an active key or a background refresh stays quiet.
async function activateKey(plugin, key, { onActive } = {}) {
  const wasPro = !!plugin.settings.licenseValid;
  const state = await plugin.license.refresh({ key, force: true });
  if (state.valid) onActive?.();
  if (state.valid && !wasPro) new ProWelcomeModal(plugin.app, plugin).open();
  return state;
}

// Writes text whose {braced} part is the one phrase to notice, drawn in the emphasis colour.
function withKeyword(el, text) {
  text.split(/{(.+?)}/).forEach((part, i) => {
    if (part) el.createEl("span", { cls: i % 2 ? "eq-pro-em" : "", text: part });
  });
  return el;
}

function renderKeyBox(parent, plugin, onActive) {
  const tr = key => t(plugin.settings, key);
  // Before checkout: one quiet line, so the offer stays the focus.
  const hint = withKeyword(parent.createEl("p", { cls: "eq-pro-key-hint" }), tr("PRO_KEY_HINT"));
  const opener = hint.createEl("button", { cls: "eq-pro-key-open", text: tr("PRO_KEY_OPEN") });
  const box = parent.createEl("div", { cls: "eq-pro-key" });
  box.hidden = true;
  opener.addEventListener("click", () => controls.reveal(false));
  withKeyword(box.createEl("p", { cls: "eq-pro-key-title" }), tr("PRO_KEY_TITLE"));
  box.createEl("p", { cls: "eq-pro-key-desc", text: tr("PRO_KEY_DESC") });
  const row = box.createEl("div", { cls: "eq-pro-key-row" });
  const input = row.createEl("input", { attr: { type: "password", autocomplete: "off", spellcheck: "false",
    placeholder: tr("LICENSE_KEY_PLACEHOLDER"), "aria-label": tr("LICENSE_KEY") } });
  const ready = configured(plugin.license?.config || {});
  const go = row.createEl("button", { cls: "lh-btn-primary", text: tr("LICENSE_ACTIVATE") });
  go.disabled = !ready;
  const status = box.createEl("p", { cls: "eq-pro-key-status", attr: { "aria-live": "polite" } });
  const say = (key, error) => { status.setText(tr(key)); status.toggleClass("is-error", error); };
  const portal = plugin.license?.config.portalUrl;
  if (portal) {
    const recover = box.createEl("button", { cls: "eq-pro-key-recover", text: tr("LICENSE_RECOVER") });
    recover.addEventListener("click", () => window.open(portal, "_blank", "noopener,noreferrer"));
  }
  let busy = false;
  async function submit() {
    if (busy || !ready) return;
    const key = input.value.trim();
    if (!key) { say("LICENSE_ENTER_KEY", true); input.focus(); return; }
    busy = go.disabled = true;
    say("LICENSE_STATUS_CHECKING", false);
    try {
      const state = await activateKey(plugin, key, { onActive });
      if (!state.valid) say(`LICENSE_STATUS_${state.status.toUpperCase()}`, state.status !== "checking");
    } catch (_) { say("LICENSE_SAVE_ERROR", true); }
    finally { busy = go.disabled = false; }
    if (!plugin.settings.licenseValid) input.focus();
  }
  go.addEventListener("click", submit);
  input.addEventListener("keydown", event => { if (event.key === "Enter") return submit(); });
  const controls = {
    reveal(afterCheckout) {
      hint.hidden = true;
      box.hidden = false;
      if (afterCheckout) box.addClass("is-next");
      box.scrollIntoView({ block: "nearest" });
      input.focus();
    },
  };
  return controls;
}

class ProWelcomeModal extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    const tr = key => t(this.plugin.settings, key);
    this.modalEl.addClass("eq-pro-welcome-modal");
    this.modalEl.setAttribute("aria-labelledby", "eq-pro-welcome-heading");
    const root = this.contentEl.createEl("div", { cls: "eq-pro-welcome" });
    const head = root.createEl("div", { cls: "eq-pro-welcome-head" });
    head.createEl("span", { cls: "eq-pro-welcome-star", text: "✦", attr: { "aria-hidden": "true" } });
    head.createEl("h2", { text: tr("PRO_WELCOME_TITLE"), attr: { id: "eq-pro-welcome-heading" } });
    head.createEl("p", { text: tr("PRO_WELCOME_SUB") });
    const list = root.createEl("ul", { cls: "eq-pro-welcome-list" });
    for (const feature of FEATURES) {
      const item = list.createEl("li");
      item.createEl("span", { cls: "eq-pro-welcome-icon", text: feature.icon, attr: { "aria-hidden": "true" } });
      const copy = item.createEl("div");
      copy.createEl("strong", { text: tr(feature.name) });
      copy.createEl("p", { text: tr(feature.desc) });
      copy.createEl("p", { cls: "eq-pro-welcome-start", text: `→ ${tr(feature.start)}` });
    }
    const start = root.createEl("button", { cls: "lh-btn-primary eq-pro-welcome-go", text: tr("PRO_WELCOME_GO") });
    start.addEventListener("click", () => this.close());
    window.setTimeout(() => start.focus(), 0);
  }
  onClose() { this.contentEl.empty(); }
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

module.exports = { ProUpgradeModal, ProWelcomeModal, renderUpgradeContent, activateKey, FEATURES };
