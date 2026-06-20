import { describe, expect, it, vi } from "vitest";
import { renderQuestMap } from "../src/quest/render.js";

function appMock() {
  return {
    vault: {
      configDir: ".obsidian",
      adapter: {
        getResourcePath: vi.fn((path) => "app://" + path),
      },
    },
  };
}

describe("quest map generated assets", () => {
  it("renders generated webp overlays for current nodes, numbers, and boss states", () => {
    globalThis.activeDocument = {
      body: {
        classList: {
          contains: () => false,
        },
      },
    };

    const html = renderQuestMap(
      [
        { title: "Briefing" },
        { title: "Mission" },
        { title: "Boss", boss: true },
      ],
      "default",
      1,
      new Set([0]),
      appMock(),
      () => [
        { cx: 120, cy: 500 },
        { cx: 360, cy: 360 },
        { cx: 600, cy: 220 },
      ],
      { completedCount: 1, progressPct: 33 }
    );

    expect(html).toContain("generated/crown-current-node.webp");
    expect(html).toContain("generated/node-number-frame.webp");
    expect(html).toContain("generated/boss-gate.webp");
    expect(html).toContain("generated/boss-lock-badge.webp");
    expect(html).toContain('class="qm-node-number"');
    expect(html).toContain(">2</span>");
    expect(html).not.toContain("island_light_");
    expect(html).not.toContain("island_dark_");
  });
});
