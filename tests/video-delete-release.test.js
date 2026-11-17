// A delete first lets go of the players still holding the files it moves (src/videos/render.js): a
// player taken off screen keeps its video open until garbage collection, and a folder holding an
// open file cannot move to the trash. ticket-082.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { vault, drawPlayer, drawn, SLUG, FakeEl } from "./helpers/player-page.js";
import { vaultAdapter, json } from "./helpers/vault-adapter.js";

// The same module instance the player page draws with, so both see one list of players.
const require = createRequire(import.meta.url);
const { deleteAfterRelease } = require("../src/videos/render.js");
const { VIDEOS_DIR } = require("../src/videos/data.js");

const SERIES = `${VIDEOS_DIR}/${SLUG}`;
const playerOf = (body) => drawn(body).find((el) => el.tag === "video");
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

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

describe("deleting one video of a series", () => {
  const obsidian = require("obsidian");
  const { t } = require("../src/i18n/index.js");
  const say = (key) => t({ language: "zh-tw" }, key);

  const L01 = { id: "l01", title: "第 1 課", file: "l01.mp4" };
  const L02 = { id: "l02", title: "第 2 課", file: "l02.mp4", poster: "l02.jpg", subtitles: "l02.vtt" };
  const metaPath = `${SERIES}/meta.json`;
  const ids = (adapter) => JSON.parse(adapter.files[metaPath]).videos.map((v) => v.id);
  const filesOf = (v) => [v.file, v.poster, v.subtitles].filter(Boolean);

  // A series on a vault that can move files and trash them, as Obsidian's adapter.
  function series(videos = [L01, L02], status = "ready") {
    const files = { [metaPath]: json({ title: "AI 補洞課", status, videos }) };
    for (const name of videos.flatMap(filesOf)) files[`${SERIES}/${name}`] = "";
    const adapter = vaultAdapter(files);
    const under = (p) => Object.keys(files).filter((k) => k === p || k.startsWith(`${p}/`));
    Object.assign(adapter, {
      getResourcePath: (path) => `app://vault/${path}`,
      async write(p, text) { files[p] = text; },
      async mkdir() {},
      async rename(from, to) { files[to] = files[from]; delete files[from]; },
      async trashLocal(p) { under(p).forEach((k) => delete files[k]); },
      async rmdir(p) { under(p).forEach((k) => delete files[k]); },
    });
    return adapter;
  }

  // Draws the page, presses the delete button on the row titled `title`, and returns the dialog.
  async function pressDelete(adapter, title) {
    const body = await drawPlayer(adapter);
    const row = drawn(body).find((el) => el.cls.has("lh-vid-item") && drawn(el).some((x) => x.text === title));
    const button = drawn(row).find((el) => el.tag === "button" && el.attrs["aria-label"] === say("DELETE"));
    const Modal = obsidian.Modal;
    let dialog = null;
    obsidian.Modal = class { constructor() { this.contentEl = new FakeEl(); this.modalEl = new FakeEl(); this.modalEl.addClass = () => {}; dialog = this; } open() {} close() {} };
    try { button.listeners.click[0]({ stopPropagation() {} }); } finally { obsidian.Modal = Modal; }
    const text = drawn(dialog.contentEl).map((el) => el.text);
    const confirm = drawn(dialog.contentEl).find((el) => el.cls.has("lh-vid-btn-danger"));
    // Confirms, waits for the delete, and returns the notices it showed.
    const confirmIt = async () => {
      const Notice = obsidian.Notice;
      const notices = [];
      obsidian.Notice = class { constructor(text) { notices.push(text); } };
      try { confirm.listeners.click[0](); await settle(); } finally { obsidian.Notice = Notice; }
      return notices;
    };
    return { text, confirm: confirmIt };
  }

  it("puts a delete button on each row; confirming sends that video's files to the trash and drops it from the series", async () => {
    const adapter = series();
    const dialog = await pressDelete(adapter, "第 2 課");
    expect(dialog.text).toContain(say("VIDEO_DELETE_ONE_BODY"));
    expect(await dialog.confirm()).toEqual([]);
    expect(Object.keys(adapter.files).sort()).toEqual([`${SERIES}/l01.mp4`, metaPath]);
    expect(ids(adapter)).toEqual(["l01"]);
  });

  it("the last video of a finished series takes the whole series to the trash", async () => {
    const adapter = series([L01]);
    const dialog = await pressDelete(adapter, "第 1 課");
    expect(dialog.text).toContain(say("VIDEO_DELETE_LAST_BODY"));
    await dialog.confirm();
    expect(Object.keys(adapter.files)).toEqual([]);
  });

  it("a series still being made loses only that video, even its last one", async () => {
    const adapter = series([L01], "making");
    const dialog = await pressDelete(adapter, "第 1 課");
    expect(dialog.text).toContain(say("VIDEO_DELETE_ONE_BODY"));
    await dialog.confirm();
    expect(Object.keys(adapter.files)).toEqual([metaPath]);
    expect(ids(adapter)).toEqual([]);
  });

  // The page on screen can be behind meta.json: the skill delivers a video, or another delete lands.
  it("deletes nothing when the video became the last while its dialog was open", async () => {
    const adapter = series();
    const dialog = await pressDelete(adapter, "第 2 課");
    adapter.files[metaPath] = json({ title: "AI 補洞課", status: "ready", videos: [L02] });
    delete adapter.files[`${SERIES}/l01.mp4`];
    const before = { ...adapter.files };
    expect(await dialog.confirm()).toEqual([say("VIDEO_DELETE_NOW_LAST")]);
    expect(adapter.files).toEqual(before);
  });

  it("deletes only that video when another arrived while the last-video dialog was open", async () => {
    const adapter = series([L01]);
    const dialog = await pressDelete(adapter, "第 1 課");
    expect(dialog.text).toContain(say("VIDEO_DELETE_LAST_BODY"));
    adapter.files[metaPath] = json({ title: "AI 補洞課", status: "ready", videos: [L01, L02] });
    for (const name of filesOf(L02)) adapter.files[`${SERIES}/${name}`] = "";
    expect(await dialog.confirm()).toEqual([]);
    expect(ids(adapter)).toEqual(["l02"]);
    expect(Object.keys(adapter.files).sort()).toEqual([`${SERIES}/l02.jpg`, `${SERIES}/l02.mp4`, `${SERIES}/l02.vtt`, metaPath]);
  });
});
