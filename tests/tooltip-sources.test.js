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
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        // attr: { ... } / attr:{ ... } objects written on one line
        for (const [list] of line.matchAll(/attr\s*:\s*\{[^}]*\}/g)) {
          if (/["']aria-label["']\s*:/.test(list) && /[{,]\s*title\s*[:,}]/.test(list)) both.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(both).toEqual([]);
  });
});
