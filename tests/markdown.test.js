// Tests for src/ui/markdown.js — render-time markdown normalization.
// Covers ticket-016: a GFM table written directly under a paragraph line needs a
// blank line inserted, or Obsidian renders the whole block as one paragraph.

import { describe, it, expect } from "vitest";
import { normalizeMarkdown } from "../src/ui/markdown.js";

describe("normalizeMarkdown — table needs a block boundary", () => {
  it("inserts a blank line between a paragraph line and a table header", () => {
    const input = [
      "**(a) 三題各戳一個限制**",
      "| 問題 | 戳的限制 |",
      "|---|---|",
      "| Q1 需要社交登入？ | 沒有社交登入端點 |"
    ].join("\n");
    expect(normalizeMarkdown(input)).toBe([
      "**(a) 三題各戳一個限制**",
      "",
      "| 問題 | 戳的限制 |",
      "|---|---|",
      "| Q1 需要社交登入？ | 沒有社交登入端點 |"
    ].join("\n"));
  });

  it("handles alignment colons and outer-pipe-less delimiter rows", () => {
    const input = "intro\n| a | b |\n:--- | ---:\n| 1 | 2 |";
    expect(normalizeMarkdown(input)).toBe("intro\n\n| a | b |\n:--- | ---:\n| 1 | 2 |");
  });

  it("fixes several tables in the same text", () => {
    const input = "one\n| a |\n|---|\n| 1 |\n\ntwo\n| b |\n|---|\n| 2 |";
    expect(normalizeMarkdown(input)).toBe(
      "one\n\n| a |\n|---|\n| 1 |\n\ntwo\n\n| b |\n|---|\n| 2 |"
    );
  });

  it("leaves a table that already has a blank line untouched", () => {
    const input = "intro\n\n| a | b |\n|---|---|\n| 1 | 2 |";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("leaves a table at the very start untouched", () => {
    const input = "| a | b |\n|---|---|\n| 1 | 2 |";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("does not touch tables inside fenced code blocks", () => {
    const input = "```md\nintro\n| a | b |\n|---|---|\n```";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("does not split a blockquote", () => {
    const input = "> quoted\n| a | b |\n|---|---|";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("does not treat a bare --- horizontal rule as a delimiter row", () => {
    const input = "intro\nsome | text\n---\ntail";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("does not insert when the preceding line is already a table row", () => {
    const input = "| a | b |\n| c | d |\n|---|---|";
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it("returns empty string for null/undefined and passes through pipe-free text", () => {
    expect(normalizeMarkdown(null)).toBe("");
    expect(normalizeMarkdown(undefined)).toBe("");
    expect(normalizeMarkdown("plain **text**\nsecond line")).toBe("plain **text**\nsecond line");
  });
});
