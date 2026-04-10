import { describe, it, expect } from "vitest";
import { parseQuestMap, resolveImageOcclusionRect } from "../src/quest/helpers.js";

describe("parseQuestMap image-occlusion bbox", () => {
  it("parses pixel bbox fields", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Pixel Occlusion",
      "    challenge:",
      "      type: image-occlusion",
      "      image: assets/diagram.png",
      "      answer: Label",
      "      region_x: 295",
      "      region_y: 292",
      "      region_width: 640",
      "      region_height: 86",
    ].join("\n"));

    expect(cfg.nodes[0].challenge.region_x).toBe(295);
    expect(cfg.nodes[0].challenge.region_y).toBe(292);
    expect(cfg.nodes[0].challenge.region_width).toBe(640);
    expect(cfg.nodes[0].challenge.region_height).toBe(86);
  });

  it("keeps legacy percent bbox fields for compatibility", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Percent Occlusion",
      "    challenge:",
      "      type: image-occlusion",
      "      image: assets/diagram.png",
      "      answer: Label",
      "      region_left_pct: 65",
      "      region_top_pct: 15",
      "      region_width_pct: 22",
      "      region_height_pct: 12",
    ].join("\n"));

    expect(cfg.nodes[0].challenge.region_left_pct).toBe(65);
    expect(cfg.nodes[0].challenge.region_top_pct).toBe(15);
    expect(cfg.nodes[0].challenge.region_width_pct).toBe(22);
    expect(cfg.nodes[0].challenge.region_height_pct).toBe(12);
  });
});

describe("resolveImageOcclusionRect", () => {
  it("prefers pixel bbox when both pixel and percent are present", () => {
    const rect = resolveImageOcclusionRect({
      region_x: 100,
      region_y: 50,
      region_width: 200,
      region_height: 80,
      region_left_pct: 1,
      region_top_pct: 1,
      region_width_pct: 1,
      region_height_pct: 1,
    }, 1000, 500);

    expect(rect.source).toBe("pixel");
    expect(rect.leftPct).toBe(10);
    expect(rect.topPct).toBe(10);
    expect(rect.widthPct).toBe(20);
    expect(rect.heightPct).toBe(16);
  });

  it("converts legacy percent bbox to canonical geometry", () => {
    const rect = resolveImageOcclusionRect({
      region_left_pct: 65,
      region_top_pct: 15,
      region_width_pct: 22,
      region_height_pct: 12,
    }, 1000, 500);

    expect(rect.source).toBe("percent");
    expect(rect.leftPx).toBe(650);
    expect(rect.topPx).toBe(75);
    expect(rect.widthPx).toBe(220);
    expect(rect.heightPx).toBe(60);
  });

  it("clamps bbox to image bounds", () => {
    const rect = resolveImageOcclusionRect({
      region_x: -50,
      region_y: 450,
      region_width: 300,
      region_height: 100,
    }, 1000, 500);

    expect(rect.wasClamped).toBe(true);
    expect(rect.leftPx).toBe(0);
    expect(rect.topPx).toBe(450);
    expect(rect.widthPx).toBe(250);
    expect(rect.heightPx).toBe(50);
  });

  it("returns null for missing bbox", () => {
    expect(resolveImageOcclusionRect({}, 1000, 500)).toBeNull();
  });

  it("returns null for zero-size or fully out-of-bounds bbox", () => {
    expect(resolveImageOcclusionRect({
      region_x: 1200,
      region_y: 20,
      region_width: 50,
      region_height: 50,
    }, 1000, 500)).toBeNull();

    expect(resolveImageOcclusionRect({
      region_x: 20,
      region_y: 20,
      region_width: 0,
      region_height: 50,
    }, 1000, 500)).toBeNull();
  });
});
