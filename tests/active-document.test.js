import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const activeDocumentFiles = [
  "src/hub/achievement.js",
  "src/hub/help.js",
  "src/hub/modal.js",
  "src/quest/modal.js",
  "src/quest/render.js",
  "src/review/session.js",
];

describe("active document compatibility", () => {
  it("uses Obsidian activeDocument at runtime instead of module-level destructuring or global document", () => {
    const offenders = [];

    for (const file of activeDocumentFiles) {
      const source = readFileSync(file, "utf8");
      if (/\{\s*activeDocument\s*\}\s*=/.test(source)) {
        offenders.push(`${file}: destructures activeDocument`);
      }
      if (/\bdocument\./.test(source)) {
        offenders.push(`${file}: uses global document`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
