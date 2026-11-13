// One tooltip per control (ticket-058). Obsidian shows an element's `aria-label` as its own tooltip and
// the browser shows its `title` as a second one, so an icon button that carried both showed two boxes.
// A control gets its name and its tooltip from `aria-label` alone (an icon button), or from its visible
// text. This scans the source for attribute lists that set both on one element.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["embedded.js", "embedded-skills.js"]);
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith(".js") && !SKIP.has(name) ? [path] : [];
  });
}

describe("tooltips", () => {
  it("no element is given both an aria-label and a title in the same attribute list", () => {
    const both = [];
    for (const file of sources("src")) {
      const text = readFileSync(file, "utf8");
      // attr: { ... } objects, on one line or several, with ${...} inside their values
      for (const m of text.matchAll(/attr\s*:\s*\{(?:[^{}]|\$\{[^}]*\})*\}/g)) {
        if (/["']aria-label["']\s*:/.test(m[0]) && /[{,]\s*title\s*[:,}]/.test(m[0])) both.push(`${file}:${text.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(both).toEqual([]);
  });

  it("no element gets an aria-label and a title one statement at a time (x.setAttribute(...) and x.title = ...)", () => {
    const both = [];
    for (const file of sources("src")) {
      const text = readFileSync(file, "utf8");
      const named = new Set([...text.matchAll(/(\w+)\.setAttribute\(\s*["']aria-label["']/g)].map((m) => m[1]));
      for (const m of text.matchAll(/(\w+)\.(?:title\s*=(?!=)|setAttribute\(\s*["']title["'])/g)) {
        if (named.has(m[1])) both.push(`${file}:${text.slice(0, m.index).split("\n").length} (${m[1]})`);
      }
    }
    expect(both).toEqual([]);
  });
});
