import { describe, expect, it } from "vitest";
import achievement from "../src/hub/achievement";

const { buildAchievementEvalCtx, ACHIEVEMENTS } = achievement;

describe("achievement derived stats", () => {
  it("counts Lesson Academy completions and Quest Map completed nodes", () => {
    const courses = [
      {
        slug: "course-a",
        meta: {
          lessons: [
            { id: "a", title: "A", file: "a.html" },
            { id: "b", title: "B", file: "b.html" },
          ],
          completion: {
            a: { completed: true },
            b: { completed: true },
          },
        },
      },
      {
        slug: "course-b",
        meta: {
          lessons: [
            { id: "c", title: "C", file: "c.html" },
            { id: "d", title: "D", file: "d.html" },
          ],
          completion: {
            c: { completed: true },
            d: { completed: false },
          },
        },
      },
    ];
    const quests = [
      { title: "Quest A", completedCount: 7, completed: false },
      { title: "Quest B", completedCount: 3, completed: true },
    ];

    const { evalCtx } = buildAchievementEvalCtx({}, [], quests, [], courses);

    expect(evalCtx.completedLessons).toBe(3);
    expect(evalCtx.completedCourses).toBe(1);
    expect(evalCtx.completedQuestNodes).toBe(10);
  });

  it("registers the five Lesson and Quest achievement definitions", () => {
    expect(ACHIEVEMENTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "first_lesson", field: "completedLessons", threshold: 1 }),
        expect.objectContaining({ id: "course_finisher", field: "completedCourses", threshold: 1 }),
        expect.objectContaining({ id: "lesson_marathon", field: "completedLessons", threshold: 10 }),
        expect.objectContaining({ id: "first_quest_step", field: "completedQuestNodes", threshold: 1 }),
        expect.objectContaining({ id: "quest_veteran", field: "completedQuestNodes", threshold: 10 }),
      ])
    );
  });
});
