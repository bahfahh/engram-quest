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
  // Skill ran but pool gate denied: status has generatedAt + enabled=false + reason.
  // Without this third state the UI was silent — user had no idea why ⚡ never appeared.
  const poolTooSmall = !!status.generatedAt && status.enabled === false && status.reason === "pool-too-small";
  const refresh = isSynapseEnabled(status)
    && shouldShowRefreshBanner({ status, currentMastered, now: Date.now(), dismissedAt }).show;

  if (!onboarding && !refresh && !poolTooSmall) return;

  const banner = parent.createEl("div", { attr: { class: "lh-synapse-banner" } });
  const text = banner.createEl("div", { attr: { class: "lh-synapse-banner-text" } });
  let title;
  if (poolTooSmall) {
    const have = (status.masteredPoolSize != null) ? status.masteredPoolSize : (currentMastered || 0);
    const need = (status.threshold != null) ? status.threshold : 10;
    title = c(t, "SYNAPSE_POOL_TOO_SMALL").replace("{have}", String(have)).replace("{need}", String(need));
  } else if (onboarding) {
    title = c(t, "SYNAPSE_ONBOARDING_TITLE");
  } else {
    title = c(t, "SYNAPSE_REFRESH_BANNER");
  }
  text.createEl("div", {
    text: title,
    attr: { style: "font-weight:600;font-size:13px;line-height:1.4;" }
  });
  if (!poolTooSmall) {
    text.createEl("div", {
      text: SKILL_COMMAND,
      attr: { style: "font-family:monospace;font-size:11px;color:var(--text-muted,#6b7280);margin-top:4px;" }
    });
  }

  const actions = banner.createEl("div", { attr: { class: "lh-synapse-banner-actions" } });
  if (!poolTooSmall) {
    const copyBtn = actions.createEl("button", {
      text: c(t, "SYNAPSE_REFRESH_BUTTON"),
      attr: { class: "lh-synapse-banner-btn" }
    });
    copyBtn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(SKILL_COMMAND); new I.Notice("Copied: " + SKILL_COMMAND); }
      catch { new I.Notice(SKILL_COMMAND); }
    });
  }

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

// `openSession(cards, name, backFn, minutes)` is provided by the caller so this module
// stays decoupled from the review session class import in hub/modal.js.
// Renders 3 compact ⏱ buttons inline into `parent` (the card-header row).
function renderTimeboxRow(parent, plugin, app, decks, openSession, backToHub) {
  if (!plugin.settings.licenseValid) return;
  const t = plugin.settings;
  const minSuffix = c(t, "TIMEBOX_MIN_SUFFIX");
  const row = parent.createEl("div", { attr: { class: "lh-timebox-row" } });
  [5, 10, 15].forEach((minutes) => {
    const btn = row.createEl("button", { attr: { class: "lh-timebox-btn" } });
    btn.textContent = `⏱ ${minutes} ${minSuffix}`;
    btn.addEventListener("click", () => {
      const all = collectAllCards(decks);
      if (all.length === 0) { new I.Notice(c(t, "TIMEBOX_NO_CARDS")); return; }
      const today = new Date();
      const picked = pickTopN(all, minutes, (card) => computeCardPriority(card, today));
      if (picked.length === 0) { new I.Notice(c(t, "TIMEBOX_NO_CARDS")); return; }
      openSession(picked, `⏱ ${minutes} ${minSuffix}`, backToHub, minutes);
    });
  });
}

module.exports = { renderSynapseProBanner, renderTimeboxRow };
