// Node sizes on the quest map (ticket-039). The nodes sit at percentages of the map picture but are
// discs of real pixels: on a phone-wide map they piled up, and the ones near an edge, with their
// titles, were cut off by it. The sizes now come from where the nodes are and how wide the map is.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ART_RATIO, NODE_BASE, NODE_MIN, baseSize, computeMapLayout, labelMaxWidth, scrollStart } = require("../src/quest/map-layout.js");
const { DISC_PRESETS, nodePositions } = require("../src/quest/viewer-modal.js");

const bossesFor = (count) => Array.from({ length: count }, (_, index) => index === count - 1 && count > 1);
const positionsFor = (count, difficulty) => nodePositions(Array.from({ length: count }, () => ({})), {}, difficulty);

// Where each disc and its title really are on a map laid out as `layout` says.
function boxes(positions, bosses, layout) {
  const height = layout.stageWidth * ART_RATIO;
  return positions.map((pos, index) => {
    const size = layout.sizes[index];
    const cx = (pos.x / 100) * layout.stageWidth;
    // A node is a column (disc, gap, title) centred on its position, so the disc sits above it.
    const cy = (pos.y / 100) * height - 12.5;
    const half = Math.max(size, labelMaxWidth(size)) / 2;
    return { cx, cy, size, half, bottom: cy + size / 2 + 5 + 20 };
  });
}

const CASES = [];
for (const difficulty of Object.keys(DISC_PRESETS)) {
  for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) CASES.push({ difficulty, count });
}

describe("quest map layout", () => {
  describe.each([
    ["desktop", { available: 724 }],
    ["phone", { available: 336 }],
    ["narrow phone", { available: 296 }],
  ])("on a %s", (_name, screen) => {
    it("keeps the discs apart, and as big as the room allows", () => {
      for (const { difficulty, count } of CASES) {
        const positions = positionsFor(count, difficulty);
        const bosses = bossesFor(count);
        const layout = computeMapLayout({ positions, bosses, ...screen });
        const at = boxes(positions, bosses, layout);
        const label = `${difficulty} x${count}`;
        for (let i = 0; i < at.length; i++) {
          expect(layout.sizes[i], label).toBe(Math.round(baseSize(bosses[i]) * layout.scale));
          // More nodes than the art has platforms for pack tighter than a finger-sized disc allows.
          for (let j = i + 1; j < at.length && count <= 8; j++) {
            const gap = Math.hypot(at[i].cx - at[j].cx, at[i].cy - at[j].cy) - (at[i].size + at[j].size) / 2;
            expect(gap, `${label}: ${i} and ${j}`).toBeGreaterThan(-1);
          }
        }
      }
    });

    it("keeps every disc and title inside the map plus the room it asks for around the picture", () => {
      for (const { difficulty, count } of CASES) {
        const positions = positionsFor(count, difficulty);
        const bosses = bossesFor(count);
        const layout = computeMapLayout({ positions, bosses, activeIndex: 0, ...screen });
        const { overhang } = layout;
        const label = `${difficulty} x${count}`;
        const crown = 36 * layout.scale;
        boxes(positions, bosses, layout).forEach((box, index) => {
          expect(box.cx - box.half, label).toBeGreaterThanOrEqual(-overhang.left - 1);
          expect(box.cx + box.half, label).toBeLessThanOrEqual(layout.stageWidth + overhang.right + 1);
          expect(box.cy - box.size / 2 - (index === 0 ? crown : 0), label).toBeGreaterThanOrEqual(-overhang.top - 1);
          expect(box.bottom, label).toBeLessThanOrEqual(layout.stageHeight + overhang.bottom + 1);
        });
      }
    });
  });

  it("fits the map and the room around it into a desktop window, with full-size discs where they fit", () => {
    for (const { difficulty, count } of CASES.filter((item) => item.count <= 8)) {
      const layout = computeMapLayout({ positions: positionsFor(count, difficulty), bosses: bossesFor(count), available: 724 });
      expect(layout.stageWidth + layout.overhang.left + layout.overhang.right, `${difficulty} x${count}`).toBeLessThanOrEqual(724 + 1);
    }
    const roomy = computeMapLayout({ positions: positionsFor(3, "easy"), bosses: bossesFor(3), available: 1000 });
    expect(roomy.sizes).toEqual([NODE_BASE, NODE_BASE, baseSize(true)]);
  });

  it("keeps discs apart on windows between a phone and a desktop (landscape phone, small tablet)", () => {
    for (const available of [280, 324, 356, 394, 452, 600]) {
      for (const { difficulty, count } of CASES.filter((item) => item.count <= 8)) {
        const positions = positionsFor(count, difficulty);
        const bosses = bossesFor(count);
        const at = boxes(positions, bosses, computeMapLayout({ positions, bosses, available }));
        for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
          const gap = Math.hypot(at[i].cx - at[j].cx, at[i].cy - at[j].cy) - (at[i].size + at[j].size) / 2;
          expect(gap, `${difficulty} x${count} in ${available}px: ${i} and ${j}`).toBeGreaterThan(-1);
        }
      }
    }
  });

  it("keeps a disc a finger can hit on a phone, by making the map wider than the screen if it has to", () => {
    for (const { difficulty, count } of CASES) {
      const bosses = bossesFor(count);
      const layout = computeMapLayout({ positions: positionsFor(count, difficulty), bosses, available: 336 });
      const label = `${difficulty} x${count}`;
      layout.sizes.forEach((size, index) => {
        expect(size, label).toBeGreaterThanOrEqual(Math.round(baseSize(bosses[index]) * NODE_MIN / NODE_BASE));
      });
      // Few nodes fit the screen as it is; a dense quest scrolls sideways.
      if (count <= 3) expect(layout.stageWidth, label).toBeLessThanOrEqual(336);
    }
  });

  it("opens a map that is wider than the screen on its nodes", () => {
    const positions = positionsFor(8, "hard");
    const layout = computeMapLayout({ positions, bosses: bossesFor(8), available: 336 });
    expect(layout.stageWidth).toBeGreaterThan(336);
    const leftPad = 12 + layout.overhang.left;
    const viewWidth = 360;
    const start = scrollStart({ positions, stageWidth: layout.stageWidth, leftPad, viewWidth });
    const xs = positions.map((pos) => leftPad + (pos.x / 100) * layout.stageWidth);
    expect(Math.min(...xs) - layout.sizes[0] / 2).toBeGreaterThanOrEqual(start);
    expect(Math.max(...xs) + layout.sizes[0] / 2).toBeLessThanOrEqual(start + viewWidth);
  });

  it("copes with nodes the layout cannot pull apart", () => {
    const same = [{ x: 50, y: 50 }, { x: 50, y: 50 }, { x: 10, y: 10 }];
    const layout = computeMapLayout({ positions: same, bosses: [false, false, false], available: 336 });
    expect(Number.isFinite(layout.stageWidth)).toBe(true);
    expect(layout.stageWidth).toBeLessThanOrEqual(1000);
    expect(computeMapLayout({ positions: [], bosses: [], available: 336 }).sizes).toEqual([]);
  });
});
