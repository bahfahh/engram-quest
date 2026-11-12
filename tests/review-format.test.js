import { describe, it, expect } from "vitest";
import { locateSelection, wrapSelection, selectionLines } from "../src/review/format.js";

const SRC = "但 **hit target (觸控區域)** 最小值必須達到 **44×44 CSS px**，否則不好點。";

describe("wrapSelection", () => {
  it("wraps plain text that is in the source as it is", () => {
    expect(wrapSelection("abc def", "def", "==")).toBe("abc ==def==");
  });

  it("finds a selection whose source has bold markup inside it", () => {
    expect(wrapSelection(SRC, "最小值必須達到 44×44 CSS px，", "==")).toBe(
      "但 **hit target (觸控區域)** ==最小值必須達到 **44×44 CSS px**，==否則不好點。",
    );
  });

  it("does not cut a bold pair when the selection starts inside it", () => {
    expect(wrapSelection(SRC, "target (觸控區域) 最小值", "==")).toBe(
      "但 ==**hit target (觸控區域)** 最小值==必須達到 **44×44 CSS px**，否則不好點。",
    );
  });

  it("does not cut a bold pair when the selection ends inside it", () => {
    expect(wrapSelection(SRC, "最小值必須達到 44×44", "==")).toBe(
      "但 **hit target (觸控區域)** ==最小值必須達到 **44×44 CSS px**==，否則不好點。",
    );
  });

  it("widens a span that runs from inside one bold pair into another", () => {
    expect(wrapSelection("**a b** c **d e**", "b c d", "==")).toBe("==**a b** c **d e**==");
  });

  it("wraps inside a bold pair when the whole selection is in it", () => {
    expect(wrapSelection("**hello world** end", "world", "==")).toBe("**hello ==world==** end");
  });

  it("matches across italic underscores", () => {
    expect(wrapSelection("an _italic_ word", "an italic word", "==")).toBe("==an _italic_ word==");
  });

  it("gives up quickly on a long miss in markup-heavy text", () => {
    const source = "*".repeat(2000) + "x";
    const t0 = Date.now();
    expect(wrapSelection(source, "a".repeat(40), "==")).toBe(null);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it("matches across a soft line break and a link", () => {
    expect(wrapSelection("see the\n[docs](https://x.y) now", "the docs now", "==")).toBe("see ==the\n[docs](https://x.y) now==");
  });

  it("returns null when the text is not in the source", () => {
    expect(wrapSelection(SRC, "不存在的字", "==")).toBe(null);
    expect(locateSelection(SRC, "")).toBe(null);
  });
});

describe("selectionLines", () => {
  it("gives the lines a selection spans, through markup", () => {
    expect(selectionLines("first\nsecond **bold** end\nthird", "bold end third")).toEqual({ first: 1, last: 2 });
  });

  it("returns null instead of guessing when nothing matches", () => {
    expect(selectionLines("a\nb", "zzz")).toBe(null);
  });
});
