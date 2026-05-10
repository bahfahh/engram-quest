// Pro feature UI hooks for the Hub Review tab.
// Centralises Synapse banner + Time-boxed Review buttons so hub/modal.js
// only needs a single small insertion point. All gated by settings.licenseValid.

"use strict";

const I = require("obsidian");
const { t: c } = require("../i18n");
const {
  loadSynapseStatus,
  countMasteredFromSr,
  shouldShowRefreshBanner,
  isSynapseEnabled
} = require("./synapse");
const { collectAllCards, pickTopN, computeCardPriority } = require("./timebox");

const SKILL_COMMAND = "engram-quest-synapse";

async function renderSynapseProBanner(parent, plugin, app) {
  if (!plugin.settings.licenseValid) return;
  const t = plugin.settings;
  const adapter = app.vault.adapter;

  // Banner is dismissed for 24h after the user closes it — short-circuit before
  // any I/O so re-renders during dismissal don't read every sr/*.json file.
  const dismissedAt = (t._synapseBannerDismissedAt) || 0;
  if (dismissedAt && Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;

  let status, currentMastered;
  try {
    [status, currentMastered] = await Promise.all([
      loadSynapseStatus(adapter),
      countMasteredFromSr(adapter)
    ]);
  } catch (err) {
    console.warn("synapse: status load failed", err);
    return;
  }

  const onboarding = !status.generatedAt;
  const refresh = isSynapseEnabled(status)
    && shouldShowRefreshBanner({ status, currentMastered, now: Date.now(), dismissedAt }).show;

  if (!onboarding && !refresh) return;

  const banner = parent.createEl("div", { attr: { class: "lh-synapse-banner" } });
  const text = banner.createEl("div", { attr: { class: "lh-synapse-banner-text" } });
  text.createEl("div", {
    text: onboarding ? c(t, "SYNAPSE_ONBOARDING_TITLE") : c(t, "SYNAPSE_REFRESH_BANNER"),
    attr: { style: "font-weight:600;font-size:13px;line-height:1.4;" }
  });
  text.createEl("div", {
    text: SKILL_COMMAND,
    attr: { style: "font-family:monospace;font-size:11px;color:var(--text-muted,#6b7280);margin-top:4px;" }
  });

  const actions = banner.createEl("div", { attr: { class: "lh-synapse-banner-actions" } });
  const copyBtn = actions.createEl("button", {
    text: c(t, "SYNAPSE_REFRESH_BUTTON"),
    attr: { class: "lh-synapse-banner-btn" }
  });
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(SKILL_COMMAND); new I.Notice("Copied: " + SKILL_COMMAND); }
    catch { new I.Notice(SKILL_COMMAND); }
  });

  if (!onboarding) {
    const dismissBtn = actions.createEl("button", {
      text: "✕",
      attr: { class: "lh-synapse-banner-btn", title: "Dismiss for 24h", style: "padding:6px 10px;" }
    });
    dismissBtn.addEventListener("click", async () => {
      plugin.settings._synapseBannerDismissedAt = Date.now();
      await plugin.saveData(plugin.settings);
      banner.remove();
    });
  }
}

// `openSession(cards, name, onBack)` is provided by the caller so this module
// stays decoupled from the review session class import in hub/modal.js.
function renderTimeboxRow(parent, plugin, app, decks, openSession, backToHub) {
  if (!plugin.settings.licenseValid) return;
  const t = plugin.settings;
  const wrap = parent.createEl("div", { attr: { style: "padding:0 16px 8px;" } });
  wrap.createEl("div", {
    text: "⏱ " + c(t, "TIMEBOX_LABEL"),
    attr: { style: "font-size:12px;font-weight:700;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;" }
  });
  const row = wrap.createEl("div", { attr: { class: "lh-timebox-row" } });
  [5, 10, 15].forEach((minutes) => {
    const btn = row.createEl("button", { attr: { class: "lh-timebox-btn" } });
    btn.textContent = `${minutes} ${c(t, "TIMEBOX_MIN_SUFFIX")}`;
    btn.addEventListener("click", () => {
      const all = collectAllCards(decks);
      if (all.length === 0) { new I.Notice(c(t, "TIMEBOX_NO_CARDS")); return; }
      const today = new Date();
      const picked = pickTopN(all, minutes, (card) => computeCardPriority(card, today));
      if (picked.length === 0) { new I.Notice(c(t, "TIMEBOX_NO_CARDS")); return; }
      openSession(picked, `⏱ ${minutes} ${c(t, "TIMEBOX_MIN_SUFFIX")}`, backToHub);
    });
  });
  wrap.createEl("div", {
    text: c(t, "TIMEBOX_PRO_HINT"),
    attr: { class: "lh-timebox-pro-hint" }
  });
}

module.exports = { renderSynapseProBanner, renderTimeboxRow };
