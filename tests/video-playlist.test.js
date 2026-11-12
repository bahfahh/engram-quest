// What a playlist row says about one video (src/videos/playlist.js): playing now, finished,
// stopped part-way, or not started.
import { describe, it, expect } from "vitest";
import { fmtTime, rowStatus } from "../src/videos/playlist.js";

const en = { language: "en" };
const zh = { language: "zh-tw" };
const video = (id) => ({ id, duration: 300 });
const meta = {
  progress: {
    done: { position: 0, completed: true, lastViewed: "2026-11-01T00:00:00.000Z" },
    half: { position: 132.4, completed: false, lastViewed: "2026-11-02T00:00:00.000Z" },
    rewatch: { position: 40, completed: true, lastViewed: "2026-11-03T00:00:00.000Z" },
    opened: { position: 0, completed: false, lastViewed: "2026-11-04T00:00:00.000Z" },
  },
};

describe("fmtTime", () => {
  it("writes seconds as m:ss", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(65)).toBe("1:05");
    expect(fmtTime(132.4)).toBe("2:12");
    expect(fmtTime(3600)).toBe("60:00");
    expect(fmtTime(undefined)).toBe("0:00");
    expect(fmtTime(-5)).toBe("0:00");
  });
});

describe("rowStatus", () => {
  it("marks the video on screen as playing, whatever its saved progress", () => {
    expect(rowStatus(en, meta, video("half"), "half")).toEqual({ kind: "playing", text: "Playing" });
    expect(rowStatus(en, meta, video("done"), "done")).toEqual({ kind: "playing", text: "Playing" });
    expect(rowStatus(zh, meta, video("new"), "new")).toEqual({ kind: "playing", text: "播放中" });
  });

  it("says a finished video is watched, even when it was reopened part-way", () => {
    expect(rowStatus(en, meta, video("done"), "half")).toEqual({ kind: "done", text: "Watched" });
    expect(rowStatus(zh, meta, video("rewatch"), "half")).toEqual({ kind: "done", text: "已看完" });
  });

  it("says where an unfinished video stopped", () => {
    expect(rowStatus(en, meta, video("half"), "done")).toEqual({ kind: "progress", text: "Stopped at 2:12" });
    expect(rowStatus(zh, meta, video("half"), "done")).toEqual({ kind: "progress", text: "看到 2:12" });
  });

  it("says a video with no saved position has not been started", () => {
    expect(rowStatus(en, meta, video("new"), "half")).toEqual({ kind: "new", text: "Not started" });
    expect(rowStatus(zh, meta, video("opened"), "half")).toEqual({ kind: "new", text: "未看" });
    expect(rowStatus(en, {}, video("new"), null)).toEqual({ kind: "new", text: "Not started" });
  });
});
