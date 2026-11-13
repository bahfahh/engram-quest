"use strict";
// The length hint under the Recall Films length buttons ("About 9–11 min · 1 topic").
// Kept apart from the tab so it can be tested without the tab's images and Obsidian classes.

const { t: c, interpolate: K } = require("../i18n");
const { presets: LENGTHS } = require("../../skills/episodic-review/templates/length.json");

function estimate(t, id) {
  const { seconds: [low, high], topics: [few, many] } = LENGTHS[id];
  const single = few === 1 && many === 1;
  return K(c(t, single ? "EPISODIC_LEN_EST_ONE" : "EPISODIC_LEN_EST"), {
    min: Math.round(low / 60),
    max: Math.round(high / 60),
    topics: few === many ? few : `${few}–${many}`,
  });
}

module.exports = { estimate };
