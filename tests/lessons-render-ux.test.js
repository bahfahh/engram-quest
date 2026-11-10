import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = () => readFileSync("src/lessons/render.js", "utf8");
const styles = () => readFileSync("src/styles/hub-pages.js", "utf8");

describe("Lesson Academy render UX", () => {
  it("hides the progress sidebar while browsing the expanded course grid", () => {
    const src = source();

    expect(src).toContain("const showSide = !state.expanded && (state.sideOpen || ui.isPhone());");
    expect(src).toContain('if (showSide) renderSidebar(layout.createEl("div", { cls: "lh-lside" }), hub, t, scopedCourses, stats, refresh);');
  });

  it("lets course and lesson titles wrap to two lines before truncating", () => {
    const css = styles();

    expect(css).toMatch(/\.lh-cc-nm \{[^}]*-webkit-line-clamp:2/);
    expect(css).toMatch(/\.lh-ls-t \{[^}]*-webkit-line-clamp:2/);
    expect(css).toContain("grid-template-columns:repeat(auto-fill,minmax(240px,1fr))");
  });

  it("keeps course sorting faithful to the selected sort mode", () => {
    const src = source();

    expect(src).toContain(".sort(sortFn)");
    expect(src).not.toContain("Number(!!b.meta.starred) - Number(!!a.meta.starred)");
  });

  it("keeps course cards neutral and identifies them by the user's own icon", () => {
    const src = source();

    expect(src).toContain('cls: "lh-cc-em", text: meta.icon');
    expect(src).not.toContain("colorScheme");
  });

  it("keeps archived courses out of the active course view until the archive scope is selected", () => {
    const src = source();

    expect(src).toContain('courseScope: saved.scope || "active"');
    expect(src).toContain("function matchesCourseScope");
    expect(src).toContain('courseScope === "archived" ? !!meta.archived : !meta.archived');
    expect(src).toContain("overallStats(scopedCourses)");
  });

  it("places the archive scope after the primary tag, progress, and sort controls", () => {
    const src = source();

    expect(src.indexOf('LESSON_CFILTER_TAG_ALL')).toBeLessThan(src.indexOf('LESSON_SCOPE_ACTIVE'));
    expect(src.indexOf('LESSON_CFILTER_PROG_ALL')).toBeLessThan(src.indexOf('LESSON_SCOPE_ACTIVE'));
    expect(src.indexOf('LESSON_CSORT_RECENT')).toBeLessThan(src.indexOf('LESSON_SCOPE_ACTIVE'));
  });

  it("offers archive and unarchive actions without using the delete flow", () => {
    const src = source();

    expect(src).toContain("toggleCourseArchive");
    expect(src).toContain('c(t, "LESSON_ARCHIVE")');
    expect(src).toContain('c(t, "LESSON_UNARCHIVE")');
    expect(src).toContain("LESSON_ARCHIVED_NOTICE");
  });
});
