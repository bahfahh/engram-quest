// Which second of the video a review card goes back to, and the pop-up player that plays it.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { rewatchTarget } from "../src/videos/rewatch.js";

const require = createRequire(import.meta.url);

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

describe("openRewatch", () => {
  // A closed player that only pauses keeps the video file open until garbage collection, and its
  // series cannot be moved to the trash meanwhile (ticket-082).
  it("empties its player when closed", () => {
    const { openRewatch } = require("../src/videos/rewatch.js");
    const { Modal } = require("obsidian");
    const calls = [];
    const player = { addEventListener() {}, pause: () => calls.push("pause"), removeAttribute: (name) => calls.push(`remove ${name}`), load: () => calls.push("load") };
    const proto = Object.getPrototypeOf(new Modal({}).contentEl);
    const createEl = proto.createEl;
    proto.createEl = function (tag, opts) { return tag === "video" ? player : createEl.call(this, tag, opts); };
    try {
      openRewatch({ vault: { adapter: { getResourcePath: (path) => `app://vault/${path}` } } }, { path: "engram-quest/videos/s/a.mp4", at: 5 });
      Modal.lastCreated.onClose();
    } finally {
      proto.createEl = createEl;
    }
    expect(calls).toEqual(["pause", "remove src", "load"]);
  });
});
