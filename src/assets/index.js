"use strict";
// Images the plugin draws itself (Hub icons, achievement badges, guide pictures, Pro art, quest-map art).
// A store install receives only main.js, manifest.json and styles.css, so the release build embeds
// these files in main.js (scripts/embed-assets.mjs). Without that generated file (tests, a dev build
// that skipped it) the URL points at the copy in the plugin folder instead.

let EMBEDDED = {};
try { EMBEDDED = require("./embedded"); } catch (_) { /* generated at build time */ }

// `rel` is the path inside the plugin folder, e.g. "assets/hub-icons/dark/logo-64.webp".
function assetUrl(app, rel) {
  return EMBEDDED[rel] || app.vault.adapter.getResourcePath(`${app.vault.configDir}/plugins/engram-quest/${rel}`);
}

module.exports = { assetUrl };
