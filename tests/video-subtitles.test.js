// Subtitles on the player page (ticket-042). In Obsidian the Hub page is app://obsidian.md and a
// vault file's resource URL is app://<id>/…: another origin. A <video> may play from there, but the
// browser fetches a <track> same-origin only, so a subtitle file attached by its resource URL is
// blocked and nothing shows. The page is drawn here the way both Video Academy and Recall Films draw
// it (renderTopic), on a vault whose resource URLs are on that other origin.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Module, { createRequire } from "node:module";
import { resolveObjectURL } from "node:buffer";
import { vaultAdapter, json } from "./helpers/vault-adapter.js";

const require = createRequire(import.meta.url);
// esbuild inlines the teachers' photos and voice samples; here a file name stands in for each.
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const obsidian = require("obsidian");
const { renderTopic } = require("../src/videos/render.js");
const { listTopics, VIDEOS_DIR, SETTINGS_PATH } = require("../src/videos/data.js");

const VAULT_ORIGIN = "app://36495fd0vault";
const SLUG = "ai-gaps";
const VTT = "WEBVTT\n\n00:00.000 --> 00:02.000\n模型答錯了，先看資料。\n";

// Stands in for an Obsidian element: keeps what was drawn and lets the test fire an event.
class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag;
    this.children = [];
    this.parent = null;
    this.text = opts.text ?? "";
    this.attrs = { ...(opts.attr || {}) };
    this.listeners = {};
    this.isConnected = true;
    // As in a browser: a track is off until its `default` attribute or a script turns it on.
    if (tag === "track") this.track = { mode: "default" in this.attrs ? "showing" : "disabled" };
  }
  createEl(tag, opts) { const el = new FakeEl(tag, opts); el.parent = this; this.children.push(el); return el; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  appendChild(child) { return child; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type) { (this.listeners[type] || []).forEach((fn) => fn({ type })); }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter((el) => el !== this); }
  getBoundingClientRect() { return { top: 0, bottom: 0, height: 0 }; }
}

const drawn = (el) => el.children.flatMap((child) => [child, ...drawn(child)]);
const tracks = (root) => drawn(root).filter((el) => el.tag === "track");
// The page reads the subtitle file and the settings before it adds the track.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function vault({ subtitles = "l01.vtt", vtt = VTT, settings } = {}) {
  const files = {
    [`${VIDEOS_DIR}/${SLUG}/meta.json`]: json({
      title: "AI Engineering 補洞課",
      status: "ready",
      videos: [{ id: "l01", title: "第 1 課", file: "l01.mp4", duration: 352, ...(subtitles ? { subtitles } : {}) }],
    }),
    [`${VIDEOS_DIR}/${SLUG}/l01.mp4`]: "",
  };
  if (vtt !== null && subtitles) files[`${VIDEOS_DIR}/${SLUG}/${subtitles}`] = vtt;
  if (settings) files[SETTINGS_PATH] = json(settings);
  const adapter = vaultAdapter(files);
  adapter.getResourcePath = (path) => `${VAULT_ORIGIN}/C:/vault/${path}?1794042066490`;
  return adapter;
}

async function drawPlayer(adapter) {
  const hub = { app: { vault: { adapter } }, plugin: { settings: { language: "zh-tw" } }, _vTopic: null };
  const [topic] = await listTopics(adapter);
  const body = new FakeEl();
  renderTopic(body, hub, hub.plugin.settings, topic, () => {});
  await settle();
  return body;
}

describe("player subtitles", () => {
  let revoke;
  beforeEach(() => {
    obsidian.Platform = { isDesktopApp: false };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    revoke = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete obsidian.Platform;
    delete globalThis.ResizeObserver;
  });

  it("gives the track the file's text on the page's own origin, never the vault resource URL", async () => {
    const body = await drawPlayer(vault());
    const [track] = tracks(body);
    expect(track, "a video with subtitles gets a track").toBeTruthy();
    expect(track.attrs.kind).toBe("subtitles");
    expect(track.attrs.src.startsWith(VAULT_ORIGIN)).toBe(false);
    expect(track.attrs.src.startsWith("blob:")).toBe(true);
    const blob = resolveObjectURL(track.attrs.src);
    expect(blob.type).toBe("text/vtt");
    expect(await blob.text()).toBe(VTT);
  });

  it("starts with subtitles showing", async () => {
    const [track] = tracks(await drawPlayer(vault()));
    expect(track.track.mode).toBe("showing");
  });

  it("starts with subtitles off when Video settings say so, and keeps the track for the player's own menu", async () => {
    const [track] = tracks(await drawPlayer(vault({ settings: { subtitles: false } })));
    expect(track.track.mode).toBe("hidden");
  });

  it("releases the Blob URL once the browser has read the cues, or failed to", async () => {
    for (const outcome of ["load", "error"]) {
      revoke.mockClear();
      const [track] = tracks(await drawPlayer(vault()));
      expect(revoke).not.toHaveBeenCalled();
      track.fire(outcome);
      expect(revoke.mock.calls).toEqual([[track.attrs.src]]);
    }
  });

  it("plays without a track when the subtitle file is not on this device", async () => {
    const body = await drawPlayer(vault({ vtt: null }));
    expect(tracks(body)).toEqual([]);
    expect(drawn(body).some((el) => el.tag === "video")).toBe(true);
  });

  it("reads no subtitle file for a video that has none (recall films)", async () => {
    const adapter = vault({ subtitles: null });
    const body = await drawPlayer(adapter);
    expect(tracks(body)).toEqual([]);
    expect(adapter.reads.filter((path) => path.endsWith(".vtt"))).toEqual([]);
  });
});
