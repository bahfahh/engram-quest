"use strict";
// Whether the desktop sidebar is folded into the icon rail. The user's choice is kept in the
// plugin settings (`_sidebar`), once for ordinary pages and once for while a video is open:
// a video starts with the sidebar folded so the player and playlist have room, and whatever the
// user picks there never changes how the other pages look.

const DEFAULTS = { pages: false, watching: true };

// A window this wide or narrower always draws the sidebar as the icon rail (src/styles/hub.js).
const RAIL_MAX_WIDTH = 1039;

function isCollapsed(settings, watching) {
  const key = watching ? "watching" : "pages";
  const saved = settings && settings._sidebar;
  return saved && typeof saved[key] === "boolean" ? saved[key] : DEFAULTS[key];
}

function setCollapsed(settings, watching, collapsed) {
  const saved = settings._sidebar && typeof settings._sidebar === "object" && !Array.isArray(settings._sidebar) ? settings._sidebar : {};
  settings._sidebar = { ...saved, [watching ? "watching" : "pages"]: !!collapsed };
}

/**
 * Which tab has a video open, after the tab on screen reports `on`. A tab can only clear its own
 * mark, so the mark outlives a visit to another tab and the sidebar folds again at once on return.
 */
function watchingTab(current, activeTab, on) {
  if (on) return activeTab;
  return current === activeTab ? null : current;
}

module.exports = { RAIL_MAX_WIDTH, isCollapsed, setCollapsed, watchingTab };
