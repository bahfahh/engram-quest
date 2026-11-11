import { describe, expect, it } from "vitest";

const css = require("../src/styles/hub");

function themeTokens(selectorPattern) {
  const block = String(css).match(selectorPattern);
  if (!block) throw new Error("theme block not found");
  return Object.fromEntries([...block[1].matchAll(/--([a-z0-9]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ["text", "text2", "text3", "mstt", "duet", "lrnt", "newt", "tint"];
const SURFACES = ["base", "card"];

describe("design token contrast", () => {
  const light = themeTokens(/\.lh-hub,[^{]*\{([^}]*--base:#F5F5F7[^}]*)\}/);
  const dark = { ...light, ...themeTokens(/\{([^}]*--base:#18181B[^}]*)\}/) };

  for (const [name, tokens] of [["light", light], ["dark", dark]]) {
    it(`keeps every text colour at 4.5:1 on ${name} surfaces`, () => {
      const failures = [];
      for (const fg of TEXT) for (const bg of SURFACES) {
        const ratio = contrast(tokens[fg], tokens[bg]);
        if (ratio < 4.5) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)}`);
      }
      expect(failures).toEqual([]);
    });

    it(`keeps button text readable in ${name}`, () => {
      expect(contrast(tokens.onbtn, tokens.btn)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
