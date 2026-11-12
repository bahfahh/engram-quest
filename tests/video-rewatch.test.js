// Which second of the video a review card goes back to.
import { describe, it, expect } from "vitest";
import { rewatchTarget } from "../src/videos/rewatch.js";

const appWith = (frontmatter) => ({
  vault: { getAbstractFileByPath: () => ({}) },
  metadataCache: { getFileCache: () => ({ frontmatter }) },
});
const card = (back) => ({ notePath: "deck.md", back });

describe("rewatchTarget", () => {
  it("reads the time from the card's own stamp", () => {
    const target = rewatchTarget(appWith({ video: "v/a.mp4" }), card("答案\n\n影片：第一課（2:05）"));
    expect(target).toEqual({ path: "v/a.mp4", at: 125 });
  });

  it("offers nothing for cards that didn't come from a video", () => {
    expect(rewatchTarget(appWith({}), card("影片：第一課（2:05）"))).toBe(null);
    expect(rewatchTarget(appWith({ video: "v/a.mp4" }), card("Answer\n\nVideo: Lesson one (12:07)"))).toEqual({ path: "v/a.mp4", at: 727 });
    expect(rewatchTarget(appWith({ video: "v/a.mp4" }), card("一般答案"))).toBe(null);
  });
});
