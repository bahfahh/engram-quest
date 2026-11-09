// The teacher list the picker shows and how a saved choice is read.
import { describe, it, expect } from "vitest";
import { TEACHERS, DEFAULT, findTeacher, teacherOfVideo, canUse, variantOf, portraitKey } from "../src/videos/teachers.js";
import { PREVIEWABLE } from "./helpers/teacher-assets.js";
import registry from "../src/videos/teachers.json";

describe("teacher list", () => {
  it("has one free default teacher and everyone else is Pro", () => {
    expect(DEFAULT.id).toBe("nico");
    expect(TEACHERS.filter((x) => x.tier !== "pro").map((x) => x.id)).toEqual(["nico"]);
  });

  it("has a portrait and a voice sample for every teacher offered", () => {
    for (const teacher of TEACHERS) {
      expect(PREVIEWABLE.portraits).toContain(portraitKey(teacher));
      expect(PREVIEWABLE.samples).toContain(teacher.id);
    }
  });
});

describe("reading a saved choice", () => {
  it("treats an unknown id as the default teacher", () => {
    expect(findTeacher("no-such-teacher")).toBe(DEFAULT);
  });

  it("doesn't offer a hidden teacher, but still names them on their finished videos", () => {
    const hidden = registry.teachers.filter((x) => x.hidden);
    expect(hidden.length).toBeGreaterThan(0);
    for (const { id } of hidden) {
      expect(TEACHERS.map((x) => x.id)).not.toContain(id);
      expect(findTeacher(id)).toBe(DEFAULT);
      expect(teacherOfVideo(id).id).toBe(id);
    }
  });

  it("names nobody on a video whose teacher is unknown", () => {
    expect(teacherOfVideo("no-such-teacher")).toBe(null);
  });

  it("gates Pro teachers on the licence only", () => {
    const pro = TEACHERS.find((x) => x.tier === "pro");
    expect(canUse(DEFAULT, false)).toBe(true);
    expect(canUse(pro, false)).toBe(false);
    expect(canUse(pro, true)).toBe(true);
  });

  it("falls back to the first colour set and uses that set's portrait", () => {
    expect(variantOf(DEFAULT, "nope").id).toBe("classic");
    expect(portraitKey(DEFAULT, "wine")).toBe("nico-wine");
    expect(portraitKey(DEFAULT)).toBe("nico");
  });
});
