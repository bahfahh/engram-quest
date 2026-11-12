// The desktop sidebar's remembered folded state (src/hub/sidebar.js): one choice for ordinary
// pages, one for while a video is open.
import { describe, it, expect } from "vitest";
import { isCollapsed, setCollapsed, watchingTab } from "../src/hub/sidebar.js";

describe("which tab has a video open", () => {
  it("remembers the tab that opened a video", () => {
    expect(watchingTab(null, "video", true)).toBe("video");
    expect(watchingTab("video", "episodic", true)).toBe("episodic");
  });

  it("forgets it only when that same tab closes its video", () => {
    expect(watchingTab("video", "video", false)).toBe(null);
    expect(watchingTab(null, "video", false)).toBe(null);
  });

  it("keeps it while another tab is on screen, so coming back folds the sidebar at once", () => {
    expect(watchingTab("video", "review", false)).toBe("video");
    expect(watchingTab("video", "episodic", false)).toBe("video");
  });
});

describe("sidebar folded state", () => {
  it("starts open on ordinary pages and folded while a video is open", () => {
    expect(isCollapsed({}, false)).toBe(false);
    expect(isCollapsed({}, true)).toBe(true);
  });

  it("remembers the choice made on ordinary pages without touching the video one", () => {
    const settings = {};
    setCollapsed(settings, false, true);
    expect(isCollapsed(settings, false)).toBe(true);
    expect(isCollapsed(settings, true)).toBe(true);
    setCollapsed(settings, false, false);
    expect(isCollapsed(settings, false)).toBe(false);
    expect(isCollapsed(settings, true)).toBe(true);
  });

  it("keeps the sidebar open on later videos once the user opened it during one", () => {
    const settings = {};
    setCollapsed(settings, true, false);
    expect(isCollapsed(settings, true)).toBe(false);
  });

  it("goes back to the ordinary-page choice when the video closes", () => {
    const open = {};
    setCollapsed(open, true, true);
    expect(isCollapsed(open, false)).toBe(false);

    const folded = {};
    setCollapsed(folded, false, true);
    setCollapsed(folded, true, false);
    expect(isCollapsed(folded, false)).toBe(true);
  });

  it("survives a save and reload, and keeps other settings", () => {
    const settings = { language: "zh-tw" };
    setCollapsed(settings, false, true);
    setCollapsed(settings, true, false);
    const reloaded = JSON.parse(JSON.stringify(settings));
    expect(reloaded.language).toBe("zh-tw");
    expect(isCollapsed(reloaded, false)).toBe(true);
    expect(isCollapsed(reloaded, true)).toBe(false);
  });

  it("falls back to the defaults when the stored value is not usable", () => {
    for (const bad of [null, "yes", 3, [], { pages: "no", watching: 0 }]) {
      const settings = { _sidebar: bad };
      expect(isCollapsed(settings, false)).toBe(false);
      expect(isCollapsed(settings, true)).toBe(true);
    }
  });
});
