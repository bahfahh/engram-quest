// A delete first lets go of the players still holding the files it moves (src/videos/render.js): a
// player taken off screen keeps its video open until garbage collection, and a folder holding an
// open file cannot move to the trash. ticket-082.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { vault, drawPlayer, drawn, SLUG } from "./helpers/player-page.js";

// The same module instance the player page draws with, so both see one list of players.
const require = createRequire(import.meta.url);
const { deleteAfterRelease } = require("../src/videos/render.js");
const { VIDEOS_DIR } = require("../src/videos/data.js");

const SERIES = `${VIDEOS_DIR}/${SLUG}`;
const playerOf = (body) => drawn(body).find((el) => el.tag === "video");
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

// The plugin calls window.setTimeout, as Obsidian's guidelines ask.
beforeEach(() => { globalThis.window = globalThis; });
afterEach(() => { vi.useRealTimers(); delete globalThis.window; });

describe("deleteAfterRelease", () => {
  it("empties the player of a video in the folder, then tries once more once it has let go", async () => {
    const vid = playerOf(await drawPlayer(vault()));
    expect(vid.src).toContain(`${SERIES}/l01.mp4`);
    vi.useFakeTimers();
    const run = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const result = deleteAfterRelease(SERIES, run);
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
    expect(vid.src).toBe("");
    expect(vid.loads).toBe(1);
  });

  it("leaves other series' players alone and does not retry when it let go of none", async () => {
    const vid = playerOf(await drawPlayer(vault()));
    const run = vi.fn().mockResolvedValue(false);
    // "ai" is a prefix of the drawn series' slug "ai-gaps", not its folder.
    expect(await deleteAfterRelease(`${VIDEOS_DIR}/ai`, run)).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    expect(vid.src).toContain(`${SERIES}/l01.mp4`);
    await deleteAfterRelease(SERIES, async () => true); // leave no player behind for the next test
  });

  it("a released player saves no more progress, so a delete that fails keeps the position", async () => {
    const adapter = vault();
    adapter.write = async (path, text) => { adapter.files[path] = text; };
    const vid = playerOf(await drawPlayer(adapter));
    const position = () => JSON.parse(adapter.files[`${SERIES}/meta.json`]).progress.l01.position;
    vid.currentTime = 30;
    vid.fire("timeupdate");
    await settle();
    expect(position()).toBe(30);
    expect(await deleteAfterRelease(SERIES, async () => true)).toBe(true);
    vid.currentTime = 0; // emptying a player rewinds it, and the browser reports that
    vid.fire("timeupdate");
    await settle();
    expect(position()).toBe(30);
  });
});
