"use strict";

const { Setting, Notice } = require("obsidian");
const { t } = require("../i18n");
const { configured } = require("./core");
const { ProUpgradeModal } = require("./upgrade");

function renderLicenseSettings(container, plugin, rerender = () => {}) {
  const license = plugin.license;
  if (!license) return;
  const tr = (key, vars) => t(plugin.settings, key, vars);
  new Setting(container).setName(tr("LICENSE_TITLE")).setHeading();
  const status = container.createEl("p", { cls: "eq-license-status", attr: { "aria-live": "polite" } });
  function paint() {
    status.setText(tr(`LICENSE_STATUS_${license.state.status.toUpperCase()}`));
  }
  paint();
  // The first check finishes in the background, possibly after this tab is drawn.
  const stop = license.subscribe(() => { if (status.isConnected) paint(); else stop(); });
  if (license.config.environment === "sandbox") {
    container.createEl("p", { text: tr("LICENSE_SANDBOX"), cls: "setting-item-description" });
  }
  new Setting(container).setName(tr("PRO_OVERVIEW")).setDesc(tr("PRO_ENTRY_DESC"))
    .addButton(button => {
      button.setButtonText(tr("PRO_LEARN"));
      button.onClick(() => new ProUpgradeModal(plugin.app, plugin).open());
    });
  let draft = plugin.settings.licenseKey || "";
  let activate, remove;
  function busy(value) {
    activate.setDisabled(value || !configured(license.config));
    remove.setDisabled(value);
  }
  new Setting(container).setName(tr("LICENSE_KEY")).setDesc(tr("LICENSE_KEY_DESC"))
    .addText(input => {
      input.setPlaceholder(tr("LICENSE_KEY_PLACEHOLDER")).setValue(draft);
      input.inputEl.type = "password";
      input.inputEl.autocomplete = "off";
      input.inputEl.spellcheck = false;
      input.onChange(value => { draft = value; });
    }).addButton(button => {
      activate = button;
      button.setButtonText(tr("LICENSE_ACTIVATE")).setDisabled(!configured(license.config));
      button.buttonEl.addClass("lh-btn-primary");
      button.onClick(async () => {
        if (!draft.trim()) { new Notice(tr("LICENSE_ENTER_KEY")); return; }
        busy(true);
        status.setText(tr("LICENSE_STATUS_CHECKING"));
        try { await license.refresh({ key: draft, force: true }); }
        catch (_) { new Notice(tr("LICENSE_SAVE_ERROR")); }
        finally { paint(); busy(false); }
      });
    });
  if (license.config.portalUrl) {
    new Setting(container).setName(tr("LICENSE_RECOVER")).setDesc(tr("LICENSE_RECOVER_DESC"))
      .addButton(button => {
        button.setButtonText(tr("LICENSE_RECOVER_OPEN"));
        button.onClick(() => window.open(license.config.portalUrl, "_blank", "noopener,noreferrer"));
      });
  }
  new Setting(container).setName(tr("LICENSE_REMOVE")).setDesc(tr("LICENSE_REMOVE_DESC"))
    .addButton(button => {
      remove = button;
      button.setButtonText(tr("LICENSE_REMOVE"));
      button.onClick(async () => {
        busy(true);
        try { await license.remove(); draft = ""; rerender(); }
        catch (_) { new Notice(tr("LICENSE_SAVE_ERROR")); }
        finally { paint(); busy(false); }
      });
    });
  container.createEl("p", { text: tr("LICENSE_PRIVACY"), cls: "setting-item-description" });
}

module.exports = { renderLicenseSettings };
