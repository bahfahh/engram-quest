// An opened card in the Synapse map shows that card's answer, which is the user's own Markdown,
// inside a node about 250px wide (ticket-041). Obsidian only wraps a code block that names a
// language; a plain fenced block, a wide image or a long address used to run out of the node and
// across the map. Layout cannot be measured here, so this keeps the rules that hold such content
// in place; how it looks is checked in a browser (light, dark, narrow and phone).
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const css = String(require("../src/styles/hub-pages"));

function declarations(selector) {
  const rule = css.split("\n").find((line) => line.startsWith(`${selector} {`));
  if (!rule) return {};
  return Object.fromEntries(rule.slice(rule.indexOf("{") + 1, rule.lastIndexOf("}")).split(";")
    .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([name]) => name));
}

describe("an opened card's answer stays inside its node", () => {
  it("wraps long strings, and scrolls sideways within the answer for what cannot wrap", () => {
    const back = declarations(".lh-syg-back");
    expect(back["overflow-wrap"]).toBe("anywhere");
    expect(back["overflow-x"]).toBe("auto");
  });

  it("wraps a code block that names no language", () => {
    expect(declarations(".lh-syg-back pre")["white-space"]).toBe("pre-wrap");
  });

  it("never draws an image or other media wider than the answer", () => {
    expect(declarations(".lh-syg-back :is(img,video,iframe,svg)")["max-width"]).toBe("100%");
    // An embedded frame has no shape of its own: it keeps the height it was given.
    expect(declarations(".lh-syg-back :is(img,video,iframe,svg)").height).toBeUndefined();
    expect(declarations(".lh-syg-back :is(img,video,svg)").height).toBe("auto");
  });

  it("keeps a table's columns wide enough to read", () => {
    expect(declarations(".lh-syg-back :is(th,td)")["min-width"]).toBe("4em");
  });
});
