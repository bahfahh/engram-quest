// Every image the plugin asks for with assetUrl must be on the embed list: anything missing still shows
// in a dev vault (its plugin folder has assets/) but is broken for store installs, which get only main.js.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { root, assetGroups } from "../scripts/asset-list.mjs";

const require = createRequire(import.meta.url);
const embedded = new Set(assetGroups().flatMap((g) => g.files));

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return e.name.endsWith(".js") && !e.name.startsWith("embedded") ? [p] : [];
  });
}

describe("embedded plugin images", () => {
  it("lists only files that exist", () => {
    for (const rel of embedded) expect(fs.existsSync(path.join(root, rel)), rel).toBe(true);
  });

  it("covers every literal path passed to assetUrl", () => {
    const requested = [];
    for (const file of sourceFiles(path.join(root, "src"))) {
      const text = fs.readFileSync(file, "utf8");
      // The fixed part of each `assets/...` path argument, up to the first ${...}.
      for (const m of text.matchAll(/assetUrl\([^,]+,\s*[`"](assets\/[^`"$]*)/g)) requested.push(m[1]);
      for (const m of text.matchAll(/generated\s*=\s*name\s*=>\s*assetUrl\([^,]+,\s*`(assets\/[^`$]*)/g)) requested.push(m[1]);
    }
    expect(requested.length).toBeGreaterThan(5);
    for (const prefix of requested) {
      expect([...embedded].some((rel) => rel.startsWith(prefix)), prefix).toBe(true);
    }
  });

  it("covers every achievement badge", () => {
    const { ACHIEVEMENTS } = require("../src/hub/achievement.js");
    for (const a of ACHIEVEMENTS) expect(embedded.has(a.icon), a.icon).toBe(true);
  });
});
