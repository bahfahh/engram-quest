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

const SPINE_GAP = 20; // from the card's edge to the spine its side's branches hang on
const CORNER = 12;    // radius of the turn from the spine into a branch

/**
 * The connectors on one side of the card, as SVG path data: one line from the card (`from`, the
 * middle of its edge) to a spine, the spine, and a short branch off it to each `end` ({ x, y, dashed },
 * where the line under that node's reason begins). `dir` is -1 left of the card, 1 right of it.
 * One spine instead of a curve per node keeps a side with many nodes from turning into a bundle of
 * near-parallel lines. Branches to what is still ahead are dashed, and so is the stretch of spine
 * that only they use.
 */
function spinePaths(from, dir, ends) {
  if (!ends.length) return [];
  const spine = from.x + dir * SPINE_GAP;
  // Each branch leaves the spine a corner's height short of its own level, on the card's side of it.
  const turns = ends.map((end) => {
    const corner = Math.min(CORNER, Math.abs(end.y - from.y));
    return { ...end, corner, turn: end.y + (end.y > from.y ? -corner : corner) };
  });
  const solid = turns.filter((end) => !end.dashed).map((end) => end.turn);
  const dashed = turns.filter((end) => end.dashed).map((end) => end.turn);
  const top = Math.min(from.y, ...solid);
  const bottom = Math.max(from.y, ...solid);
  const paths = [{ d: `M${from.x} ${from.y}H${spine}`, dashed: !solid.length }];
  if (bottom > top) paths.push({ d: `M${spine} ${top}V${bottom}`, dashed: false });
  if (dashed.length && Math.max(...dashed) > bottom) paths.push({ d: `M${spine} ${bottom}V${Math.max(...dashed)}`, dashed: true });
  if (dashed.length && Math.min(...dashed) < top) paths.push({ d: `M${spine} ${top}V${Math.min(...dashed)}`, dashed: true });
  for (const end of turns) {
    paths.push({ d: `M${spine} ${end.turn}Q${spine} ${end.y} ${spine + dir * end.corner} ${end.y}H${end.x}`, dashed: !!end.dashed });
  }
  return paths;
}

module.exports = { groupOf, arrangeSynapseMap, spinePaths };
