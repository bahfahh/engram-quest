"use strict";
// Hub tabs (icon, colour group, label key) and the sidebar groups they sit in.
// Deep Dive appears only with a Pro licence.

const { t: c } = require("../i18n");

const TABS = {
  review: { icon: "deck", tone: "mem", key: "TAB_REVIEW" },
  explainer: { icon: "doc", tone: "mem", key: "TAB_EXPLAINER" },
  memory: { icon: "map", tone: "mem", key: "TAB_MEMORY" },
  episodic: { icon: "recall", tone: "mem", key: "TAB_EPISODIC" },
  lesson: { icon: "book", tone: "lrn", key: "TAB_LESSON" },
  quest: { icon: "flag", tone: "lrn", key: "TAB_QUEST" },
  video: { icon: "video", tone: "lrn", key: "TAB_VIDEO" },
  achievement: { icon: "medal", tone: "ach", key: "TAB_ACHIEVEMENT" },
};

function categories(t) {
  return [
    { id: "memory", label: c(t, "CAT_MEMORY"), tabs: ["review", ...(t.licenseValid ? ["explainer"] : []), "memory", "episodic"] },
    { id: "learn", label: c(t, "CAT_LEARN"), tabs: ["lesson", "quest", "video"] },
    { id: "achieve", label: c(t, "CAT_ACHIEVE"), tabs: ["achievement"] },
  ];
}

module.exports = { TABS, categories };
