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

  // Obsidian reads `==x==` as a highlight but not `====x====`, which shows its marks as text (ticket-081).
  it("takes the highlight off text that is already highlighted, instead of nesting another", () => {
    const card = "應避免問「你需要什麼軟體」，改問「你每天最煩的重複工作是什麼」";
    const once = wrapSelection(card, "改問", "==");
    expect(once).toBe("應避免問「你需要什麼軟體」，==改問==「你每天最煩的重複工作是什麼」");
    expect(wrapSelection(once, "改問", "==")).toBe(card);
  });

  it("takes the whole highlight off when part of it is selected", () => {
    expect(wrapSelection("==abc def== g", "def", "==")).toBe("abc def g");
  });

  it("joins a highlight the selection runs into", () => {
    expect(wrapSelection("==bc== d", "c d", "==")).toBe("==bc d==");
    expect(wrapSelection("a ==bc==", "a b", "==")).toBe("==a bc==");
  });

  it("takes in a whole highlight inside the selection", () => {
    expect(wrapSelection("a ==b== c", "a b c", "==")).toBe("==a b c==");
  });

  it("never writes a pair inside a pair, however the presses go", () => {
    const src = "x ==ab== cd ==ef== y";
    for (const sel of ["ab", "b cd", "ab cd ef", "cd", "x ab", "f y", "b", "x ab cd ef y"]) {
      expect(wrapSelection(src, sel, "==")).not.toMatch(/={3,}/);
    }
  });

  it("leaves == inside inline code alone", () => {
    expect(wrapSelection("`x == y` then z", "then z", "==")).toBe("`x == y` ==then z==");
    expect(wrapSelection("use `a == b` here", "use a == b here", "==")).toBe("==use `a == b` here==");
    expect(wrapSelection("`a == b` c ==d==", "c", "==")).toBe("`a == b` ==c== ==d==");
  });

  it("leaves a == with space on both sides alone, as Obsidian does", () => {
    expect(wrapSelection("x == y 表示相等，==重點==", "表示相等", "==")).toBe("x == y ==表示相等==，==重點==");
    expect(wrapSelection("x == y 表示相等，==重點==", "重點", "==")).toBe("x == y 表示相等，重點");
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
