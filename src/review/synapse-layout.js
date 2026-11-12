"use strict";
// Where each branch of the Synapse graph goes on the map. Pure; the drawing is in synapse-panel.js.
//
// Synapse exists to hang a hard card on what the user already knows, so the map is read in that
// order: first the learned things the skill tied to this card (recall cues), then where the card
// comes from, then what is still ahead. On a wide panel the first group sits left of the card and
// the rest right of it; on a phone the same order runs top to bottom.

const { isLearned } = require("./synapse-graph");

const GROUPS = ["recall", "source", "next"];

/**
 * recall  learned, and linked by a reason the skill wrote: the way back to the card
 * source  learned, and linked by data that already exists: the note, page or video the card belongs to
 * next    not learned yet: only drawn once the answer is shown
 */
function groupOf(node) {
  if (!isLearned(node)) return "next";
  return node.inferred ? "recall" : "source";
}

/**
 * branches (buildSynapseGraph().branches, already in rank order) → { left, right }.
 * Each side is a list of { group, labelled, branches }; `labelled` is false on the second half of
 * a group that had to be split to keep the card in the middle.
 */
function arrangeSynapseMap(branches) {
  const parts = GROUPS
    .map((group) => ({ group, labelled: true, branches: branches.filter((b) => groupOf(b) === group) }))
    .filter((part) => part.branches.length);
  if (parts.length > 1) return { left: [parts[0]], right: parts.slice(1) };
  if (!parts.length) return { left: [], right: [] };
  // One group only: a lone branch goes right of the card, several are shared between both sides.
  const [only] = parts;
  if (only.branches.length === 1) return { left: [], right: [only] };
  const half = Math.ceil(only.branches.length / 2);
  return {
    left: [{ ...only, branches: only.branches.slice(0, half) }],
    right: [{ ...only, labelled: false, branches: only.branches.slice(half) }],
  };
}

module.exports = { groupOf, arrangeSynapseMap };
