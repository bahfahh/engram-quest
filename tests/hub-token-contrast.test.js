import { describe, expect, it } from "vitest";

// Contrast is checked on the pairs the stylesheets actually use together, not only on text tokens
// over the page: a selected segment, a button label on its own surface, secondary text in a dialog.
const hubCss = String(require("../src/styles/hub"));
const SHEETS = { hub: hubCss, videos: String(require("../src/videos/styles")) };

function themeBlock(pattern) {
  const block = hubCss.match(pattern);
  if (!block) throw new Error("theme block not found");
  return Object.fromEntries([...block[1].matchAll(/--([a-z0-9]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const LIGHT = themeBlock(/\.lh-hub,[^{]*\{([^}]*--base:#F5F5F7[^}]*)\}/);
const DARK = { ...LIGHT, ...themeBlock(/\{([^}]*--base:#18181B[^}]*)\}/) };
const THEMES = [["light", LIGHT], ["dark", DARK]];

// Splits "a,b(c,d),e" on top-level commas.
function splitArgs(text) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Resolves a CSS colour value to [r,g,b,a]; returns null for anything that is not one flat colour.
function resolve(value, tokens, depth = 0) {
  if (depth > 12 || value == null) return null;
  const v = String(value).replace(/!important/, "").trim();
  let m;
  if ((m = v.match(/^#([0-9a-f]{6})$/i))) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  if (v === "transparent") return [0, 0, 0, 0];
  if ((m = v.match(/^rgba?\(([^)]+)\)$/))) {
    const p = m[1].split(",").map((x) => Number(x.trim()));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  if ((m = v.match(/^var\(--([a-z0-9]+)\)$/))) return resolve(tokens[m[1]], tokens, depth + 1);
  if ((m = v.match(/^color-mix\(in srgb,(.+)\)$/))) {
    const [first, second] = splitArgs(m[1]);
    const part = first.match(/^(.*?)\s+(\S+)$/);
    if (!part || !second) return null;
    const share = resolve(part[2], tokens, depth + 1) === null ? Number(String(part[2].startsWith("var(") ? tokens[part[2].slice(6, -1)] : part[2]).replace("%", "")) / 100 : null;
    const a = resolve(part[1], tokens, depth + 1), b = resolve(second, tokens, depth + 1);
    if (!a || !b || !(share >= 0 && share <= 1)) return null;
    // color-mix works on premultiplied channels: mixing with transparent keeps the hue and scales alpha.
    const alpha = a[3] * share + b[3] * (1 - share);
    if (alpha === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (a[i] * a[3] * share + b[i] * b[3] * (1 - share)) / alpha).concat(alpha);
  }
  return null;
}

const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
function luminance(c) {
  const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// A translucent surface is judged over each opaque surface it can sit on; the worst case counts.
function worstContrast(fgValue, bgValue, tokens) {
  const fg = resolve(fgValue, tokens), bg = resolve(bgValue, tokens);
  if (!fg || !bg) return null;
  const under = bg[3] < 1 ? ["base", "card", "side"].map((n) => resolve(tokens[n], tokens)) : [[0, 0, 0, 1]];
  return Math.min(...under.map((u) => { const surface = over(bg, u); return contrast(over(fg, surface), surface); }));
}

// Every rule that sets both a background and a text colour from tokens.
function usedPairs(css) {
  const pairs = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!selector || selector.startsWith("@")) continue;
    if (/:disabled|\.is-off|aria-disabled|::placeholder/.test(selector)) continue; // unavailable states are exempt
    const decl = {};
    for (const d of m[2].split(";")) { const i = d.indexOf(":"); if (i > 0) decl[d.slice(0, i).trim()] = d.slice(i + 1).trim(); }
    const bg = decl["background-color"] || decl.background, fg = decl.color;
    if (bg && fg && /var\(--|color-mix/.test(bg + fg)) pairs.push({ selector, bg, fg });
  }
  return pairs;
}

// Pairs that come from two different rules (text on a surface it is placed on).
const PLACED = [
  ...["text", "text2", "text3", "tint", "mstt", "duet", "lrnt", "newt", "dang", "goldt"].flatMap((fg) => ["base", "card", "side", "raised"].map((bg) => [fg, bg])),
  ...["text", "text2", "text3"].map((fg) => [fg, "fill"]),
  ["tint", "tone"], ["tint", "toneh"], ["text", "tabon"], ["onbtn", "btn"], ["onbtn", "btnh"], ["segtx", "segon"],
  ["rhardt", "color-mix(in srgb,var(--rhard) 24%,var(--raised))"],
  ["rgoodt", "color-mix(in srgb,var(--rgood) 24%,var(--raised))"],
  ["reasyt", "color-mix(in srgb,var(--reasy) 24%,var(--raised))"],
];

describe("design token contrast", () => {
  it("resolves the colour functions the stylesheets use", () => {
    expect(resolve("color-mix(in srgb,#FF0000 50%,#0000FF)", {})).toEqual([127.5, 0, 127.5, 1]);
    expect(resolve("color-mix(in srgb,var(--a) var(--k),transparent)", { a: "#FFFFFF", k: "40%" })).toEqual([255, 255, 255, 0.4]);
    expect(resolve("var(--b)", { b: "rgba(10,20,30,.5)" })).toEqual([10, 20, 30, 0.5]);
  });

  for (const [name, tokens] of THEMES) {
    it(`keeps text readable on every surface it is placed on in ${name}`, () => {
      const failures = [];
      for (const [fg, bg] of PLACED) {
        const ratio = worstContrast(tokens[fg] || fg, tokens[bg] || bg, tokens);
        if (ratio === null) failures.push(`${fg} on ${bg}: cannot resolve`);
        else if (ratio < 4.5) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)}`);
      }
      expect(failures).toEqual([]);
    });

    it(`keeps every background and text colour set by one rule readable in ${name}`, () => {
      const failures = [];
      let checked = 0;
      for (const [sheet, css] of Object.entries(SHEETS)) for (const { selector, bg, fg } of usedPairs(css)) {
        const darkOnly = /\.lh-dark|\.theme-dark/.test(selector), lightOnly = /:not\(\.theme-dark\)/.test(selector);
        if ((name === "light" && darkOnly) || (name === "dark" && lightOnly)) continue;
        const ratio = worstContrast(fg, bg, tokens);
        if (ratio === null) continue; // gradients, images, Obsidian variables
        checked++;
        if (ratio < 4.5) failures.push(`${sheet}: ${selector} — ${fg} on ${bg}: ${ratio.toFixed(2)}`);
      }
      expect(checked).toBeGreaterThan(30);
      expect(failures).toEqual([]);
    });

    it(`gives raised and tinted controls a 3:1 outline in ${name}`, () => {
      const ring = tokens.rshadow.match(/0 0 0 1px (rgba\([^)]+\))/);
      expect(ring).not.toBeNull();
      for (const under of ["base", "card"]) {
        const page = resolve(tokens[under], tokens);
        expect(contrast(over(resolve(ring[1], tokens), page), page)).toBeGreaterThanOrEqual(3);
      }
      const tone = resolve(tokens.tone, tokens);
      const toneRing = over(resolve(`color-mix(in srgb,var(--tint) ${tokens.ringk},transparent)`, tokens), tone);
      expect(contrast(toneRing, resolve(tokens.base, tokens))).toBeGreaterThanOrEqual(3);
    });
  }
});
