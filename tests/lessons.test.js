// Tests for the Lesson Academy data layer (src/lessons/data.js): course scan/CRUD, completion
// marking, planned-outline lessons, HTML import, and the sidebar aggregations.
import { describe, it, expect } from "vitest";
import {
  LESSONS_DIR,
  normalizeMeta,
  lessonCompletion,
  lessonStatus,
  courseProgress,
  listCourses,
  loadCourse,
  markLesson,
  createCourse,
  addPlannedLesson,
  toggleCourseStar,
  safeSlugPart,
  extractHtmlTitle,
  importLesson,
  deleteLesson,
  deleteCourse,
  reorderLessons,
  recentLessons,
  overallStats,
} from "../src/lessons/data.js";

// In-memory vault adapter mimicking the Obsidian adapter surface the data layer uses.
// list() returns immediate subfolders (derived from file paths) the way the real adapter does.
function makeAdapter(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async exists(p) { return Object.prototype.hasOwnProperty.call(files, p); },
    async read(p) {
      if (!(p in files)) throw new Error("ENOENT " + p);
      return files[p];
    },
    async write(p, content) { files[p] = content; },
    async mkdir() {},
    async remove(p) { delete files[p]; },
    async list(dir) {
      const prefix = dir.replace(/\/$/, "") + "/";
      const folders = new Set();
      for (const k of Object.keys(files)) {
        if (!k.startsWith(prefix)) continue;
        const rest = k.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash > 0) folders.add(prefix + rest.slice(0, slash));
      }
      return {
        files: Object.keys(files).filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/")),
        folders: [...folders],
      };
    },
  };
}

function courseMeta(overrides = {}) {
  return {
    title: "Course A",
    topic: "a",
    icon: "📘",
    description: "desc",
    tags: ["t1"],
    colorScheme: "indigo",
    starred: false,
    createdAt: "2026-06-01",
    lessons: [
      { id: "lsn-1", title: "L1", file: "lsn-1-a.html", source: "skill" },
      { id: "lsn-2", title: "L2", file: "lsn-2-b.html", source: "skill" },
    ],
    completion: {
      "lsn-1": { viewed: true, completed: true, starred: false, lastViewed: "2026-06-05T10:00:00Z" },
      "lsn-2": { viewed: false, completed: false, starred: false },
    },
    ...overrides,
  };
}

function seedCourse(slug, meta) {
  return { [`${LESSONS_DIR}/${slug}/meta.json`]: JSON.stringify(meta) };
}

describe("normalizeMeta", () => {
  it("fills defaults and keeps planned (file:null) lessons", () => {
    const meta = normalizeMeta({
      title: "X",
      lessons: [
        { id: "a", title: "with file", file: "a.html" },
        { id: "b", title: "planned only" },
        { title: "no id — dropped", file: "x.html" },
      ],
    });
    expect(meta.lessons).toHaveLength(2);
    expect(meta.lessons[0].file).toBe("a.html");
    expect(meta.lessons[1].file).toBe(null);
    expect(meta.icon).toBe("📘");
    expect(meta.tags).toEqual([]);
    expect(meta.completion).toEqual({});
  });

  it("returns null for garbage input", () => {
    expect(normalizeMeta(null)).toBe(null);
    expect(normalizeMeta("not an object")).toBe(null);
  });
});

describe("lessonStatus / lessonCompletion", () => {
  it("derives completed > viewed > new from the completion map", () => {
    const meta = normalizeMeta(courseMeta());
    expect(lessonStatus(meta, "lsn-1")).toBe("completed");
    expect(lessonStatus(meta, "lsn-2")).toBe("new");
    const c = lessonCompletion(meta, "lsn-2");
    expect(c).toEqual({ viewed: false, completed: false, starred: false, lastViewed: null });
  });

  it("reports planned for outline-only lessons regardless of completion", () => {
    const meta = normalizeMeta(courseMeta({
      lessons: [{ id: "lsn-p", title: "planned", file: null }],
    }));
    expect(lessonStatus(meta, "lsn-p")).toBe("planned");
  });
});

describe("courseProgress", () => {
  it("counts completed lessons (planned ones count toward the total)", () => {
    const meta = normalizeMeta(courseMeta({
      lessons: [
        { id: "lsn-1", title: "L1", file: "a.html" },
        { id: "lsn-2", title: "L2", file: "b.html" },
        { id: "lsn-3", title: "planned", file: null },
      ],
    }));
    expect(courseProgress(meta)).toEqual({ completed: 1, total: 3, pct: 33 });
  });
});

describe("listCourses", () => {
  it("returns [] when the lessons dir doesn't exist", async () => {
    const adapter = makeAdapter();
    expect(await listCourses(adapter)).toEqual([]);
  });

  it("scans course folders and sorts starred first", async () => {
    const adapter = makeAdapter({
      ...seedCourse("aaa", courseMeta({ title: "A", createdAt: "2026-06-09" })),
      ...seedCourse("bbb", courseMeta({ title: "B", createdAt: "2026-06-01", starred: true })),
    });
    const courses = await listCourses(adapter);
    expect(courses.map((c) => c.slug)).toEqual(["bbb", "aaa"]);
  });

  it("skips folders without a parseable meta.json", async () => {
    const adapter = makeAdapter({
      [`${LESSONS_DIR}/good/meta.json`]: JSON.stringify(courseMeta()),
      [`${LESSONS_DIR}/bad/meta.json`]: "{{{not json",
      [`${LESSONS_DIR}/empty/whatever.html`]: "<html></html>",
    });
    const courses = await listCourses(adapter);
    expect(courses.map((c) => c.slug)).toEqual(["good"]);
  });
});

describe("markLesson", () => {
  it("patches only the given fields and stamps lastViewed on viewed:true", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta()));
    const meta = await markLesson(adapter, "c", "lsn-2", { viewed: true });
    expect(meta.completion["lsn-2"].viewed).toBe(true);
    expect(meta.completion["lsn-2"].completed).toBe(false);
    expect(meta.completion["lsn-2"].lastViewed).toBeTruthy();
    // persisted
    const onDisk = JSON.parse(adapter.files[`${LESSONS_DIR}/c/meta.json`]);
    expect(onDisk.completion["lsn-2"].viewed).toBe(true);
  });

  it("toggles completed and starred independently", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta()));
    await markLesson(adapter, "c", "lsn-2", { completed: true });
    const meta = await markLesson(adapter, "c", "lsn-2", { starred: true });
    expect(meta.completion["lsn-2"]).toMatchObject({ completed: true, starred: true, viewed: false });
  });

  it("returns null for a missing course", async () => {
    const adapter = makeAdapter();
    expect(await markLesson(adapter, "nope", "x", { viewed: true })).toBe(null);
  });
});

describe("createCourse / addPlannedLesson", () => {
  it("creates a course shell with outline entries as planned lessons", async () => {
    const adapter = makeAdapter();
    const { slug, meta } = await createCourse(adapter, {
      title: "Backend Basics",
      description: "d",
      outline: ["HTTP", "", "REST API"],
    });
    expect(slug).toBe("backend-basics");
    expect(meta.lessons).toHaveLength(2); // blank line skipped
    expect(meta.lessons.every((l) => l.file === null)).toBe(true);
    expect(Object.keys(meta.completion)).toHaveLength(2);
    const loaded = await loadCourse(adapter, slug);
    expect(lessonStatus(loaded, loaded.lessons[0].id)).toBe("planned");
  });

  it("falls back to a generated slug for non-ASCII titles", async () => {
    const adapter = makeAdapter();
    const { slug } = await createCourse(adapter, { title: "行銷課程", outline: [] });
    expect(slug).toMatch(/^course-\d+$/);
  });

  it("appends a planned lesson to an existing course", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta()));
    const lesson = await addPlannedLesson(adapter, "c", "New topic");
    expect(lesson.file).toBe(null);
    const meta = await loadCourse(adapter, "c");
    expect(meta.lessons).toHaveLength(3);
    expect(meta.lessons[2].title).toBe("New topic");
    expect(meta.completion[lesson.id]).toEqual({ viewed: false, completed: false, starred: false });
  });
});

describe("importLesson", () => {
  it("writes the HTML, extracts <title>, and appends with source:import", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta()));
    const html = "<!DOCTYPE html><html><head><title>  My   Imported Lesson </title></head><body>x</body></html>";
    const lesson = await importLesson(adapter, "c", html, "fallback-name");
    expect(lesson.title).toBe("My Imported Lesson");
    expect(lesson.source).toBe("import");
    expect(adapter.files[`${LESSONS_DIR}/c/${lesson.file}`]).toBe(html);
    const meta = await loadCourse(adapter, "c");
    expect(meta.lessons[2].id).toBe(lesson.id);
    expect(meta.completion[lesson.id].viewed).toBe(false);
  });

  it("falls back to the suggested title when no <title> tag", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta()));
    const lesson = await importLesson(adapter, "c", "<html><body>x</body></html>", "From Gemini");
    expect(lesson.title).toBe("From Gemini");
  });

  it("returns null when the course doesn't exist", async () => {
    const adapter = makeAdapter();
    expect(await importLesson(adapter, "nope", "<html></html>", "t")).toBe(null);
  });
});

describe("deleteLesson / deleteCourse", () => {
  it("removes the lesson HTML and its entry, leaving completion residue harmlessly", async () => {
    const meta = courseMeta();
    const adapter = makeAdapter({
      ...seedCourse("c", meta),
      [`${LESSONS_DIR}/c/lsn-1-a.html`]: "<html>1</html>",
      [`${LESSONS_DIR}/c/lsn-2-b.html`]: "<html>2</html>",
    });
    const updated = await deleteLesson(adapter, "c", "lsn-1");
    expect(updated.lessons.map((l) => l.id)).toEqual(["lsn-2"]);
    expect(adapter.files[`${LESSONS_DIR}/c/lsn-1-a.html`]).toBeUndefined();
    expect(adapter.files[`${LESSONS_DIR}/c/lsn-2-b.html`]).toBe("<html>2</html>");
  });

  it("deletes a planned lesson without touching any file", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta({
      lessons: [{ id: "lsn-p", title: "planned", file: null }],
      completion: {},
    })));
    const updated = await deleteLesson(adapter, "c", "lsn-p");
    expect(updated.lessons).toEqual([]);
  });

  it("deleteCourse trashes every lesson file and the meta.json", async () => {
    const adapter = makeAdapter({
      ...seedCourse("c", courseMeta()),
      [`${LESSONS_DIR}/c/lsn-1-a.html`]: "1",
      [`${LESSONS_DIR}/c/lsn-2-b.html`]: "2",
    });
    await deleteCourse(adapter, "c");
    expect(Object.keys(adapter.files).filter((k) => k.includes("/c/"))).toEqual([]);
  });
});

describe("reorderLessons", () => {
  it("reorders by id and appends ids missing from the new order", async () => {
    const adapter = makeAdapter(seedCourse("c", courseMeta({
      lessons: [
        { id: "a", title: "A", file: "a.html" },
        { id: "b", title: "B", file: "b.html" },
        { id: "c", title: "C", file: "c.html" },
      ],
      completion: {},
    })));
    const meta = await reorderLessons(adapter, "c", ["c", "a"]);
    expect(meta.lessons.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });
});

describe("sidebar aggregations", () => {
  it("recentLessons sorts by lastViewed desc and respects the limit", () => {
    const mk = (slug, id, last) => ({
      slug,
      meta: normalizeMeta(courseMeta({
        title: slug,
        lessons: [{ id, title: id, file: id + ".html" }],
        completion: { [id]: { viewed: true, completed: false, starred: false, lastViewed: last } },
      })),
    });
    const courses = [
      mk("c1", "l1", "2026-06-01T00:00:00Z"),
      mk("c2", "l2", "2026-06-09T00:00:00Z"),
      mk("c3", "l3", "2026-06-05T00:00:00Z"),
    ];
    const recents = recentLessons(courses, 2);
    expect(recents.map((r) => r.lesson.id)).toEqual(["l2", "l3"]);
  });

  it("overallStats aggregates pct and course counts", () => {
    const done = {
      slug: "done",
      meta: normalizeMeta(courseMeta({
        lessons: [{ id: "x", title: "x", file: "x.html" }],
        completion: { x: { viewed: true, completed: true, starred: false } },
      })),
    };
    const inProgress = { slug: "prog", meta: normalizeMeta(courseMeta()) }; // 1 of 2 done
    const stats = overallStats([done, inProgress]);
    expect(stats.pct).toBe(67); // 2 of 3 lessons completed
    expect(stats.coursesCompleted).toBe(1);
    expect(stats.coursesInProgress).toBe(1);
    expect(stats.estimatedHours).toBe(1); // 2 completed × 0.5h
  });
});

describe("helpers", () => {
  it("safeSlugPart sanitizes to kebab ASCII with fallback", () => {
    expect(safeSlugPart("Hello World!")).toBe("hello-world");
    expect(safeSlugPart("行銷")).toBe("import");
    expect(safeSlugPart("行銷", "zz")).toBe("zz");
  });

  it("extractHtmlTitle reads the title tag or returns null", () => {
    expect(extractHtmlTitle("<title>Hi</title>")).toBe("Hi");
    expect(extractHtmlTitle("<TITLE lang='x'>Multi\n line</TITLE>")).toBe("Multi line");
    expect(extractHtmlTitle("<html></html>")).toBe(null);
  });
});
