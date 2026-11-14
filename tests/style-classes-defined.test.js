import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);

// Modules whose static style assignments were moved into CSS classes (lint rule
// obsidianmd/no-static-styles-assignment). A class name that is added in JS but
// missing from the stylesheet would silently drop the style, so check each one.
const MIGRATED_FILES = [
  "src/quest/modal.js",
  "src/review/session.js",
  "src/review/create.js",
  "src/review/modal.js",
  "src/hub/modal.js",
  "src/hub/review-tab.js",
  "src/hub/settings.js",
  "src/hub/skills.js",
];

function classesUsedIn(file) {
  const source = fs.readFileSync(file, "utf8");
  const names = new Set();
  for (const call of source.matchAll(/classList\.(?:add|remove)\(([^)]*)\)/g)) {
    for (const lit of call[1].matchAll(/"([a-z0-9_-]+)"/gi)) names.add(lit[1]);
  }
  return [...names];
}

describe("classes added by migrated modules exist in the stylesheet", () => {
  const css = require("../src/styles");
  for (const file of MIGRATED_FILES) {
    it(file, () => {
      const missing = classesUsedIn(file).filter((name) => !css.includes("." + name));
      expect(missing).toEqual([]);
    });
  }
});
