import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("i18n key parity", () => {
  it("defines every key in both English and Traditional Chinese", () => {
    const src = readFileSync("src/i18n/index.js", "utf8");
    const split = src.search(/\n\s*"?zh-tw"?\s*:/);
    const keys = (text) => new Set([...text.matchAll(/^\s{4}([A-Z][A-Z0-9_]+):/gm)].map(m => m[1]));
    const en = keys(src.slice(0, split));
    const zh = keys(src.slice(split));
    expect(split).toBeGreaterThan(0);
    expect([...zh].filter(k => !en.has(k))).toEqual([]);
    expect([...en].filter(k => !zh.has(k))).toEqual([]);
  });
});
