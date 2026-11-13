// Style rules for the desktop review card, kept in place by what a test can see of CSS; how it looks is
// checked in a browser (light, dark, a narrow window).
//
// ticket-056  the card header (deck, source notes, actions) and the tabs above it never sit on top of
//             each other in a narrow window.
// ticket-057  a code block in the card's text scrolls sideways instead of running out of the card, and
//             the copy button Obsidian adds to it is styled and placed in the corner.
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

describe("card header (ticket-056)", () => {
  it("lets the actions drop to their own row instead of sitting on the source notes", () => {
    expect(declarations(".lh-hub.lh-session .lh-rc-top")["flex-wrap"]).toBe("wrap");
    expect(declarations(".lh-rc-acts")["flex"]).toBe("none");
    expect(declarations(".lh-rc-acts")["margin-left"]).toBe("auto");
  });

  it("gives the source notes what is left of the row and wraps them among themselves", () => {
    const notes = declarations(".lh-rc-srcs");
    expect(notes["flex-wrap"]).toBe("wrap");
    expect(notes["flex"]).toBe("1 1 0");
    // A note shortens its name, never overflows the row.
    expect(declarations(".lh-hub.lh-session .lh-rc-top .lh-rc-src")["min-width"]).toBe("0");
    expect(declarations(".lh-rc-src span")["text-overflow"]).toBe("ellipsis");
  });

  it("measures the tab strip and shows names only on the tabs there is room for", () => {
    expect(css).toContain(".lh-hub.lh-session .lh-review-tabs { container:lh-tabs / inline-size; }");
    expect(css).toMatch(/@container lh-tabs \(max-width:\d+px\)/);
    // A hidden name is clipped, not removed: it stays the button's accessible name.
    expect(css).toMatch(/\.lh-review-tab:not\(\.active\) span:not\(\.lh-fi\) \{ position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset\(50%\)/);
    expect(css).not.toMatch(/\.lh-review-tab:not\(\.active\) span \{[^}]*display:\s*none/);
  });
});

describe("code blocks in the card's text (ticket-057)", () => {
  const SURFACES = ".lh-hub.lh-session :is(.lh-rc-question,.lh-hint-text,.lh-answer-text,.lh-syg-back)";

  it("scrolls a block sideways when its lines are wider than the card", () => {
    const pre = declarations(`${SURFACES} pre`);
    expect(pre["overflow-x"]).toBe("auto");
    expect(pre["max-width"]).toBe("100%");
    // The block is the positioning parent of the copy button.
    expect(pre["position"]).toBe("relative");
  });

  it("puts the copy button in the corner with a colour of its own", () => {
    const copy = declarations(`${SURFACES} pre > button.copy-code-button`);
    expect(copy["position"]).toBe("absolute");
    expect(copy["top"]).toBeDefined();
    // Obsidian's button rules out-rank plain selectors, so colours carry !important.
    expect(copy["background"]).toMatch(/!important$/);
    expect(copy["color"]).toMatch(/!important$/);
    expect(declarations(`${SURFACES} pre > button.copy-code-button:hover`)["background"]).toMatch(/!important$/);
  });

  it("shows the button on hover on a desktop, and always on a phone, which has no hover", () => {
    expect(css).toContain(`body:not(.is-phone) ${SURFACES} pre:not(:hover):not(:focus-within) > button.copy-code-button { display:none; }`);
  });
});
