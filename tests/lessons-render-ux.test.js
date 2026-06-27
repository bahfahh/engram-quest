import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = () => readFileSync("src/lessons/render.js", "utf8");

describe("Lesson Academy render UX", () => {
  it("hides the progress sidebar while browsing the expanded course grid", () => {
    const src = source();

    expect(src).toContain("if (!state.expanded) {");
    expect(src).toContain("if (sidebar) renderSidebar(sidebar, hub, t, tk, courses, refresh);");
  });

  it("lets course and lesson titles wrap to two lines before truncating", () => {
    const src = source();

    expect(src).toContain("-webkit-line-clamp:2");
    expect(src).toContain("grid-template-columns:repeat(auto-fill,minmax(240px,1fr))");
    expect(src).not.toContain("width:200px");
  });
});
