"use strict";

// Sizing for the quest map window (src/quest/viewer-modal.js). The nodes sit at percentages of the
// map picture, but a node is a disc of real pixels. On a narrow map the percentages shrink and the
// discs do not, so they pile up and run off the edges. This works out, from where the nodes are and
// how wide the map is, how big the discs can be and how much room the map needs around its picture.

// The map pictures are all this shape (assets/quest-map/quest-map_backgroud_*.png).
const ART_RATIO = 941 / 1672;

const NODE_BASE = 94;
const BOSS_BASE = 110;
// The smallest disc a finger can still hit.
const NODE_MIN = 44;
// A stage this wide gets the full-size discs; the art's platforms are drawn for roughly that.
const ART_REF_WIDTH = 760;
// How close two discs may come, as a share of the distance between their centres.
const CLEARANCE = 0.95;
// A map this wide is as far as it is worth growing a quest with many nodes.
const MAX_STAGE_WIDTH = 1000;
const MIN_STAGE_WIDTH = 280;

// What hangs outside a disc: the crown above the current node, and the title below every node.
const CROWN_RISE = 36;
const LABEL_GAP = 5;
const LABEL_HEIGHT = 20;

const baseSize = (boss) => (boss ? BOSS_BASE : NODE_BASE);

// Width of the title pill under a node.
function labelMaxWidth(size) {
  return Math.round(Math.min(110, Math.max(64, size * 1.5)));
}

// The largest disc scale (1 = full size) at which no two discs touch, per pixel of stage width.
// Returns Infinity when there is nothing to collide.
function clearanceScalePerPx(positions, bosses) {
  let best = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = (positions[i].x - positions[j].x) / 100;
      const dy = ((positions[i].y - positions[j].y) / 100) * ART_RATIO;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue; // the same spot twice cannot be pulled apart by a wider map
      const radii = (baseSize(bosses[i]) + baseSize(bosses[j])) / 2;
      best = Math.min(best, (CLEARANCE * dist) / radii);
    }
  }
  return best;
}

function discScale(stageWidth, perPx) {
  const art = Math.max(stageWidth / ART_REF_WIDTH, NODE_MIN / NODE_BASE);
  return Math.max(NODE_MIN / NODE_BASE, Math.min(1, art, perPx * stageWidth));
}

// How far the discs, crown and titles stick out past each edge of a stage of this width.
function overhangFor(positions, bosses, activeIndex, stageWidth, scale) {
  const stageHeight = stageWidth * ART_RATIO;
  const out = { top: 0, right: 0, bottom: 0, left: 0 };
  positions.forEach((pos, index) => {
    const size = baseSize(bosses[index]) * scale;
    const cx = (pos.x / 100) * stageWidth;
    // A node is a column (disc, gap, title) centred on its position, so the disc sits above the position.
    const cy = (pos.y / 100) * stageHeight - (LABEL_GAP + LABEL_HEIGHT) / 2;
    const half = Math.max(size, labelMaxWidth(size)) / 2;
    const crown = index === activeIndex ? CROWN_RISE * scale : 0;
    out.top = Math.max(out.top, size / 2 + crown - cy);
    out.bottom = Math.max(out.bottom, cy + size / 2 + LABEL_GAP + LABEL_HEIGHT - stageHeight);
    out.left = Math.max(out.left, half - cx);
    out.right = Math.max(out.right, cx + half - stageWidth);
  });
  for (const side of Object.keys(out)) out[side] = Math.ceil(Math.max(0, out[side]));
  return out;
}

// positions: [{ x, y }] in percent of the map picture. bosses: one boolean per node.
// available: the width, in pixels, the map may use. When the discs would be smaller than a finger
// can hit, the map is made wider than that (the window pans it), on any screen.
function computeMapLayout({ positions, bosses, activeIndex = 0, available }) {
  const perPx = clearanceScalePerPx(positions, bosses);
  const room = Math.max(MIN_STAGE_WIDTH, Math.floor(available));
  let stageWidth = room;
  if (Number.isFinite(perPx)) {
    const needed = Math.ceil(NODE_MIN / NODE_BASE / perPx);
    stageWidth = Math.min(MAX_STAGE_WIDTH, Math.max(room, needed));
  }
  let scale = discScale(stageWidth, perPx);
  let overhang = overhangFor(positions, bosses, activeIndex, stageWidth, scale);
  // Where the map has to fit the window, the room around the picture comes out of the picture.
  if (stageWidth === room) {
    stageWidth = Math.max(MIN_STAGE_WIDTH, room - overhang.left - overhang.right);
    scale = discScale(stageWidth, perPx);
    overhang = overhangFor(positions, bosses, activeIndex, stageWidth, scale);
  }
  const sizes = bosses.map((boss) => Math.round(baseSize(boss) * scale));
  return {
    stageWidth: Math.round(stageWidth),
    stageHeight: Math.round(stageWidth * ART_RATIO),
    scale,
    sizes,
    overhang,
  };
}

// Where to scroll a map wider than its window so the nodes, not the empty art beside them, show.
// leftPad: the space before the picture inside the scrolling area. When even the nodes alone are
// wider than the window, it opens on the current node.
function scrollStart({ positions, stageWidth, leftPad, viewWidth, activeIndex = 0 }) {
  if (!positions.length) return 0;
  const xs = positions.map((pos) => (pos.x / 100) * stageWidth);
  const span = Math.max(...xs) - Math.min(...xs);
  const centre = span > viewWidth ? xs[Math.min(activeIndex, xs.length - 1)] : (Math.min(...xs) + Math.max(...xs)) / 2;
  const middle = centre + leftPad;
  return Math.max(0, Math.round(middle - viewWidth / 2));
}

module.exports = {
  ART_RATIO,
  BOSS_BASE,
  NODE_BASE,
  NODE_MIN,
  baseSize,
  computeMapLayout,
  labelMaxWidth,
  scrollStart,
};
