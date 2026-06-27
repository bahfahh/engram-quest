import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = () => readFileSync("src/lessons/render.js", "utf8");

describe("Lesson Academy render UX", () => {
  it("hides the progress sidebar while browsing the expanded course grid", () => {
    const src = source();

    expect(src).toContain("if (!state.expanded) {");
    expect(src).toContain("if (sidebar) renderSidebar(sidebar, hub, t, tk, scopedCourses, refresh);");
  });

  it("lets course and lesson titles wrap to two lines before truncating", () => {
    const src = source();

    expect(src).toContain("-webkit-line-clamp:2");
    expect(src).toContain("grid-template-columns:repeat(auto-fill,minmax(240px,1fr))");
    expect(src).not.toContain("width:200px");
  });

  it("keeps course sorting faithful to the selected sort mode", () => {
    const src = source();

    expect(src).toContain(".sort(sortFn)");
    expect(src).not.toContain("Number(!!b.meta.starred) - Number(!!a.meta.starred)");
  });

  it("adds stronger deterministic visual identity to course cards", () => {
    const src = source();

    expect(src).toContain("function cardBackground");
    expect(src).toContain("background:${cardBackground(slug, sc, dark)}");
    expect(src).toContain("width:42px;height:42px");
  });

  it("keeps archived courses out of the active course view until the archive scope is selected", () => {
    const src = source();

    expect(src).toContain('courseScope: saved.scope || "active"');
    expect(src).toContain("function matchesCourseScope");
    expect(src).toContain('courseScope === "archived" ? !!meta.archived : !meta.archived');
    expect(src).toContain("renderSidebar(sidebar, hub, t, tk, scopedCourses, refresh)");
  });

  it("offers archive and unarchive actions without using the delete flow", () => {
    const src = source();

    expect(src).toContain("toggleCourseArchive");
    expect(src).toContain('c(t, "LESSON_ARCHIVE")');
    expect(src).toContain('c(t, "LESSON_UNARCHIVE")');
    expect(src).toContain("LESSON_ARCHIVED_NOTICE");
  });
});
