// The length hint under the Recall Films length buttons: "1 topic" must not read "1 topics".
import { describe, it, expect } from "vitest";
import { estimate } from "../src/videos/episodic-length.js";

const tFor = (language) => ({ language });

describe("recall film length hint", () => {
  it("says '1 topic' for a one-topic tier in English", () => {
    expect(estimate(tFor("en"), "medium")).toBe("About 9–11 min · 1 topic");
    expect(estimate(tFor("en"), "short")).toBe("About 7–8 min · 1 topic");
  });

  it("keeps the plural for a tier with several topics", () => {
    expect(estimate(tFor("en"), "long")).toMatch(/ · 2 topics$/);
  });

  it("reads naturally in Chinese too", () => {
    expect(estimate(tFor("zh-tw"), "medium")).toBe("約 9–11 分鐘 · 1 個主題");
  });
});
