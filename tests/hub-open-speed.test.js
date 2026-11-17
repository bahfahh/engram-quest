// Opening the Hub (perf, hub-open 1/3): the window opens at once and each scan starts only when a page
// needs it. Before, every opener awaited both the deck scan and the quest/memory library scan (which
// reads every note with a code block) before the window appeared.
import { describe, expect, it } from "vitest";
import Module, { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const { HubModal } = require("../src/hub/modal.js");

function hub() {
  const h = Object.create(HubModal.prototype);
  h.calls = { decks: 0, library: 0, lessons: 0 };
  h.loadDecks = function () { this.calls.decks++; return (this._decksReady = Promise.resolve()); };
  h.loadLibrary = function () { this.calls.library++; return (this._libraryReady = Promise.resolve()); };
  h.loadLessons = function () { this.calls.lessons++; return Promise.resolve(); };
  return h;
}

describe("what each page waits for", () => {
  it("the review page starts the deck scan only", () => {
    const h = hub();
    h._needsFor("review");
    expect(h.calls).toEqual({ decks: 1, library: 0, lessons: 0 });
  });
  it("the quest and memory pages start the library scan when first shown", () => {
    const h = hub();
    expect(h._needsFor("quest")).toHaveLength(1);
    expect(h.calls.library).toBe(1);
  });
  it("shares a scan already started instead of starting another", () => {
    const h = hub();
    h._needsFor("review"); h._needsFor("review"); h._needsFor("memory"); h._needsFor("quest");
    expect(h.calls).toMatchObject({ decks: 1, library: 1 });
  });
  it("pages with their own loading start no scan", () => {
    const h = hub();
    for (const tab of ["explainer", "lesson", "video", "episodic"]) expect(h._needsFor(tab)).toEqual([]);
    expect(h.calls).toEqual({ decks: 0, library: 0, lessons: 0 });
  });
});

describe("openers", () => {
  const src = ["src/main.js", "src/hub/modal.js"].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8")).join("\n");
  it("open the Hub without waiting for its data first", () => {
    expect(src).not.toMatch(/await \w+\.loadData\(\)\s*[,;]\s*\w+\.open\(\)/);
  });
});
