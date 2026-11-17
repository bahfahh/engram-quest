import { describe, expect, it } from "vitest";
import achievement from "../src/hub/achievement";
import teachers from "../src/videos/teachers";
import review from "../src/review/session";

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

describe("video and Pro achievements", () => {
  const video = (id, options = {}) => ({ id, file: id + ".mp4", ...options });
  const done = { completed: true };
  const topic = (videos, progress) => ({ meta: { videos, progress } });
  const proTeacher = teachers.TEACHERS.find(teacher => teacher.tier === "pro").id;

  it("counts saved progress once per playable video and distinguishes eligible series", () => {
    const videoTopics = [
      topic([video("a", { cast: { teacher: proTeacher } }), video("a", { cast: { teacher: proTeacher } }),
        video("b"), video("c", { file: null })], { a: done, b: done, c: done }),
      topic([video("a", { cast: { teacher: "custom:local" } })], { a: done }),
      topic([video("a"), video("b")], { a: done, b: { position: 50 } }),
    ];
    const recallMeta = {
      videos: [video("a"), video("b"), video("c"), video("d", { file: null })],
      progress: { a: { ...done, starred: true }, b: { starred: true }, c: done, d: done, orphan: done },
    };
    const courses = [{ meta: { lessons: [{ id: "a" }], completion: { a: done } } }];
    const content = {
      videoTopics, recallMeta, deepDivePages: [{ id: "a" }, { id: "a" }, { id: "b" }],
      deepDiveState: { a: done, b: { viewed: true }, orphan: done },
    };
    const { evalCtx } = buildAchievementEvalCtx({ synapseContentOpens: 1, completedTimeboxes: 5 },
      [], [{ completed: true }, { completed: true }, { completed: true }], [], courses, content);
    expect(evalCtx).toMatchObject({
      completedVideos: 4, completedVideoSeries: 1, maxVideosInSeries: 2, startedVideoSeries: 3,
      completedProTeacherVideos: 1, completedRecallFilms: 2, starredCompletedRecallFilms: 1,
      completedDeepDives: 1, completedMediaTypes: 2, clearedQuestCount: 3,
      synapseContentOpens: 1, completedTimeboxes: 5,
    });
  });

  it("has 50 unique achievements with six new Pro badges and defaults legacy stats to zero", () => {
    const { evalCtx } = buildAchievementEvalCtx();
    expect(ACHIEVEMENTS).toHaveLength(50);
    expect(new Set(ACHIEVEMENTS.map(achievement => achievement.id)).size).toBe(50);
    expect(ACHIEVEMENTS.filter(achievement => achievement.pro)).toHaveLength(6);
    expect(ACHIEVEMENTS.every(achievement => Object.hasOwn(evalCtx, achievement.field))).toBe(true);
    expect(evalCtx).toMatchObject({ completedVideos: 0, completedDeepDives: 0, synapseContentOpens: 0, completedTimeboxes: 0 });
  });

  it("counts a rated timebox once, excluding regular and empty reviews", () => {
    let saves = 0;
    const session = {
      plugin: { settings: { _stats: { totalCardsReviewed: 42 } } },
      _persist: () => { saves++; },
    };
    const record = () => review.ReviewSessionModal.prototype._recordTimeboxCompletion.call(session);
    record();
    session._timeboxMinutes = 5;
    record();
    expect(saves).toBe(0);
    session._timeboxRatedCard = true;
    record();
    record();
    expect(session.plugin.settings._stats).toEqual({ totalCardsReviewed: 42, completedTimeboxes: 1 });
    expect(saves).toBe(1);
  });
});
