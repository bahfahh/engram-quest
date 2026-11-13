// The desktop player page in a very narrow window (ticket-044). Its header was one row that could
// not wrap: the series name was the only part allowed to shrink, so it vanished first, and then the
// buttons, which cannot shrink, slid under the Hub's minimise / close buttons and off the page.
// Under the player, the video's title was held to one line beside its buttons. Layout cannot be
// measured here, so this keeps the rules that let both rows wrap, and the phone's rules as they
// were; how it looks is checked in a browser at several widths.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { drawn, drawPlayer, vault } from "./helpers/player-page.js";

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

  // The rules above only work on the elements the page really draws.
  const titleRow = async (phone) => drawn(await drawPlayer(vault(), { phone })).find((el) => el.hasClass("lh-vid-info-row"));
  const kinds = (el) => el.children.map((child) => `${child.tag}.${[...child.cls][0]}`);

  it("draws the desktop's buttons as one group after the titles", async () => {
    const row = await titleRow(false);
    expect(kinds(row)).toEqual(["div.lh-vid-info-titles", "div.lh-vid-info-actions"]);
    expect(kinds(row.children[1])).toEqual(["button.lh-vid-btn", "button.lh-vid-btn"]);
  });

  it("draws the phone's row without the group: titles, then the full-width button", async () => {
    const row = await titleRow(true);
    expect(kinds(row)).toEqual(["div.lh-vid-info-titles", "button.lh-pbtn"]);
    expect(drawn(row).some((el) => el.hasClass("lh-vid-info-actions"))).toBe(false);
  });
});

// The shelf page in a narrow desktop window (ticket-053). Its title and the two page buttons shared one
// row in which only the title could shrink, so "影片學院" became a one-character column; the continue-
// watching card gave the same squeeze to its text, which vanished beside the thumbnail and the button.
describe("shelf page in a narrow desktop window", () => {
  const hubCss = String(require("../src/styles/hub"));
  const rule = (sheet, selector) => {
    const line = sheet.split("\n").find((l) => l.startsWith(`${selector} {`));
    if (!line) return {};
    return Object.fromEntries(line.slice(line.indexOf("{") + 1, line.lastIndexOf("}")).split(";")
      .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([name]) => name));
  };

  it("lets the page buttons drop below the title, which keeps a width it never shrinks below", () => {
    expect(rule(hubCss, "body:not(.is-phone) .lh-hd")["flex-wrap"]).toBe("wrap");
    expect(rule(hubCss, "body:not(.is-phone) .lh-hd-main").flex).toMatch(/^1 1 \d/);
    expect(rule(hubCss, "body:not(.is-phone) .lh-hd-main")["min-width"]).toMatch(/^min\(100%,/);
  });

  it("leaves the phone's header as it was: it has no title, so nothing there wraps", () => {
    expect(hubCss).not.toMatch(/body\.is-phone \.lh-hd \{[^}]*flex-wrap/);
    expect(hubCss).not.toMatch(/^\.lh-hd \{[^}]*flex-wrap/m);
  });

  it("keeps the continue-watching text a readable width and drops the button to its own row", () => {
    expect(rule(css, ".lh-vid-continue")["flex-wrap"]).toBe("wrap");
    expect(rule(css, ".lh-vid-continue-info")["min-width"]).toMatch(/^min\(100%,/);
    expect(rule(css, ".lh-vid-continue > .lh-vid-btn").flex).toBe("1 1 auto");
  });
});
