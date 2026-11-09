"use strict";

const { requestUrl } = require("obsidian");
const config = require("./config");
const { checkLicense } = require("./core");

function createLicenseController(plugin, options = {}) {
  const publicConfig = options.config || config;
  const clock = options.now || Date.now;
  const transport = options.request || requestUrl;
  let current = { valid: false, status: "inactive", cache: null };
  let generation = 0;
  let disposed = false;
  const listeners = new Set();
  // Existing entry points keep their synchronous checks. saveData / JSON.stringify
  // omit this getter; the old persisted boolean is never an authority.
  Object.defineProperty(plugin.settings, "licenseValid", {
    configurable: true, enumerable: false, get: () => current.valid,
  });
  const emit = () => listeners.forEach(fn => fn(current));
  async function request(args) {
    let timer;
    try {
      return await Promise.race([
        transport(args),
        new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error("timeout")), 8000); }),
      ]);
    } finally { window.clearTimeout(timer); }
  }
  async function refresh({ key = plugin.settings.licenseKey || "", force = false } = {}) {
    const run = ++generation;
    current = { ...current, status: "checking" };
    emit();
    const result = await checkLicense({ key, cache: plugin.settings.licenseCache, config: publicConfig,
      version: plugin.manifest.version, now: clock(), request, force });
    if (disposed || run !== generation) return current;
    plugin.settings.licenseKey = typeof key === "string" ? key.trim() : "";
    plugin.settings.licenseCache = result.cache;
    current = result;
    await plugin.saveData(plugin.settings);
    if (!disposed && run === generation) emit();
    return current;
  }
  async function remove() {
    ++generation;
    plugin.settings.licenseKey = "";
    plugin.settings.licenseCache = null;
    current = { valid: false, status: "inactive", cache: null };
    await plugin.saveData(plugin.settings);
    emit();
  }
  return {
    config: publicConfig,
    get state() { return current; },
    refresh, remove,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() { disposed = true; ++generation; listeners.clear(); },
  };
}

async function initializeLicense(plugin) {
  plugin.license = createLicenseController(plugin);
  plugin.register(() => plugin.license.dispose());
  await plugin.license.refresh();
  plugin.registerInterval(window.setInterval(() => {
    plugin.license.refresh().catch(() => console.warn("EngramQuest: license refresh could not be saved"));
  }, 60 * 60 * 1000));
}

module.exports = { initializeLicense, createLicenseController };
