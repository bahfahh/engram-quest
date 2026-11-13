"use strict";
// What the Hub shows by itself, once: the three-step introduction (the guide's first screen) the first
// time the Hub opens, and each tab's own guide the first time that tab opens.
// settings._introSeen records that the introduction was shown, or deliberately skipped;
// settings._guideSeen records the tabs. The "?" in the Hub and on each page reopens them at any time.

const { HelpModal } = require("./help");
const { FeatureGuideModal, hasFeatureGuide } = require("./feature-guide");
const { anySkillsInstalled } = require("./skills");
const { isPhone } = require("./ui");

const POP_DELAY_MS = 220; // lets the Hub paint before a dialog covers it

// Anyone who opened a Hub tab before has an entry in _guideSeen.
function isReturningUser(settings) {
  return Object.keys(settings._guideSeen || {}).length > 0;
}

// A newcomer always sees the introduction. Someone updating from an earlier version sees it once only
// when no skills are installed in this vault: installing them is the step they have not reached.
// People already working with their AI tool are not interrupted.
function shouldShowIntro(settings, skillsInstalled) {
  if (settings._introSeen) return false;
  return !isReturningUser(settings) || !skillsInstalled;
}

function save(plugin) {
  return Promise.resolve(plugin.saveData(plugin.settings)).catch(err => console.warn("EngramQuest: guide state not saved", err));
}

// Opens `make()` shortly after the Hub has painted. `otherwise` runs when nothing was opened: the Hub
// was closed or minimized meanwhile, or the dialog failed.
function popOver(hub, make, otherwise) {
  hub._guideTimer = window.setTimeout(() => {
    hub._guideTimer = null;
    try {
      if (hub._minimized || !hub._hubOpen) { if (otherwise) otherwise(); return; }
      make();
    } catch (err) {
      if (otherwise) otherwise();
      console.warn("EngramQuest: guide popup failed", err);
    }
  }, POP_DELAY_MS);
}

// Called once per Hub window, after its first paint. hub._introPending (set when the window opens)
// holds the tabs' guides back until this has decided, and while the introduction is on screen: a
// newcomer gets one dialog, and the open tab's guide waits for the next visit to that tab.
async function maybeShowIntro(hub) {
  if (!hub._introPending) return;
  const plugin = hub.plugin, settings = plugin.settings;
  const done = () => { hub._introPending = false; };
  try {
    const installed = await anySkillsInstalled(plugin).catch((err) => { console.warn("EngramQuest: could not check installed skills", err); return false; });
    // The skills live where the AI tool runs. A phone that has none says nothing about an earlier
    // user, so the question waits, undecided, for the next time the Hub opens on a computer.
    if (isPhone() && isReturningUser(settings)) { done(); return; }
    if (!shouldShowIntro(settings, installed)) {
      if (!settings._introSeen) { settings._introSeen = true; await save(plugin); }
      done();
      return;
    }
    popOver(hub, () => {
      new HelpModal(hub.app, plugin, { intro: true, onDone: done, skillsInstalled: installed }).open();
      settings._introSeen = true;
      save(plugin);
    }, done);
  } catch (err) {
    done();
    console.warn("EngramQuest: introduction failed", err);
  }
}

// Called every time a tab is drawn.
function maybeShowTabGuide(hub, tab) {
  try {
    if (hub._introPending || !hasFeatureGuide(tab)) return;
    const settings = hub.plugin.settings;
    const seen = settings._guideSeen || (settings._guideSeen = {});
    if (seen[tab]) return;
    seen[tab] = true;
    save(hub.plugin);
    popOver(hub, () => new FeatureGuideModal(hub.app, hub.plugin, tab).open());
  } catch (err) {
    console.warn("EngramQuest: feature guide popup failed", err);
  }
}

module.exports = { shouldShowIntro, maybeShowIntro, maybeShowTabGuide };
