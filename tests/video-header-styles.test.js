// The desktop player page in a very narrow window (ticket-044). Its header was one row that could
// not wrap: the series name was the only part allowed to shrink, so it vanished first, and then the
// buttons, which cannot shrink, slid under the Hub's minimise / close buttons and off the page.
// Under the player, the video's title was held to one line beside its buttons. Layout cannot be
// measured here, so this keeps the rules that let both rows wrap, and the phone's rules as they
// were; how it looks is checked in a browser at several widths.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const css = String(require("../src/videos/styles"));

function declarations(selector) {
  const rule = css.split("\n").find((line) => line.startsWith(`${selector} {`));
  if (!rule) return {};
  return Object.fromEntries(rule.slice(rule.indexOf("{") + 1, rule.lastIndexOf("}")).split(";")
    .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([name]) => name));
}

describe("player page header in a narrow desktop window", () => {
  it("wraps instead of sliding under the window buttons, and still keeps their room on the first line", () => {
    const row = declarations(".lh-vid-head-row");
    expect(row["flex-wrap"]).toBe("wrap");
    expect(row["padding-right"]).toBe("92px");
  });

  it("gives the series name a width it never shrinks below, so it moves to its own line instead of vanishing", () => {
    const title = declarations(".lh-vid-head-title");
    expect(title["min-width"]).toMatch(/^min\(100%,/);
    expect(title["text-overflow"]).toBe("ellipsis");
  });

  it("keeps the two page actions together when they wrap", () => {
    expect(declarations(".lh-vid-head-actions").display).toBe("flex");
  });
});

describe("video title under the player", () => {
  it("lets the buttons drop below the title when the row is too narrow for both (desktop)", () => {
    expect(declarations("body:not(.is-phone) .lh-vid-info-row")["flex-wrap"]).toBe("wrap");
    expect(declarations("body:not(.is-phone) .lh-vid-info-titles").flex).toMatch(/^1 1 \d/);
    // The buttons are one group, so they drop together.
    expect(declarations(".lh-vid-info-actions").flex).toBe("none");
  });

  it("shows up to two lines of the title on a desktop", () => {
    const title = declarations("body:not(.is-phone) .lh-vid-info-title");
    expect(title["white-space"]).toBe("normal");
    expect(title["-webkit-line-clamp"]).toBe("2");
  });

  it("leaves the phone's title row as it was", () => {
    expect(declarations("body.is-phone .lh-vid-info-row")).toEqual({ "flex-direction": "column", "align-items": "stretch" });
    expect(declarations("body.is-phone .lh-vid-info-title")).toEqual({ "font-size": "22px", "line-height": "29px", "white-space": "normal" });
  });
});
