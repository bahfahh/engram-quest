// Draws the player page the way Video Academy and Recall Films draw it (renderTopic), on an in-memory
// vault whose resource URLs are on another origin than the page, as in Obsidian (app://<id>/… against
// app://obsidian.md). What was drawn is kept so a test can look at it.
import Module, { createRequire } from "node:module";
import { vaultAdapter, json } from "./vault-adapter.js";

const require = createRequire(import.meta.url);
// esbuild inlines the teachers' photos and voice samples; here a file name stands in for each.
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const obsidian = require("obsidian");
const { renderTopic } = require("../../src/videos/render.js");
const { listTopics, VIDEOS_DIR, SETTINGS_PATH } = require("../../src/videos/data.js");

export const VAULT_ORIGIN = "app://36495fd0vault";
export const SLUG = "ai-gaps";
export const VTT = "WEBVTT\n\n00:00.000 --> 00:02.000\n模型答錯了，先看資料。\n";

// Stands in for an Obsidian element: keeps what was drawn and lets the test fire an event.
export class FakeEl {
  constructor(tag = "div", opts = {}) {
    this.tag = tag;
    this.children = [];
    this.parent = null;
    this.text = opts.text ?? "";
    this.cls = new Set(String(opts.cls || "").split(" ").filter(Boolean));
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
  hasClass(name) { return this.cls.has(name); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type) { (this.listeners[type] || []).forEach((fn) => fn({ type })); }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter((el) => el !== this); }
  getBoundingClientRect() { return { top: 0, bottom: 0, height: 0 }; }
}

export const drawn = (el) => el.children.flatMap((child) => [child, ...drawn(child)]);

/** One series with one video; `subtitles: null` leaves the video without a subtitle file, `vtt: null` leaves the file off this device. */
export function vault({ subtitles = "l01.vtt", vtt = VTT, settings } = {}) {
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

/**
 * Draws the page and waits for the reads it starts (subtitle file, settings).
 * `phone` draws it as a phone does; `whileReading(body)` runs right after drawing, before those reads answer.
 */
export async function drawPlayer(adapter, { phone = false, whileReading } = {}) {
  const body = new FakeEl();
  const classes = obsidian.activeDocument.body.classList;
  const contains = classes.contains;
  const platform = obsidian.Platform, setIcon = obsidian.setIcon, observer = globalThis.ResizeObserver;
  classes.contains = (name) => phone && name === "is-phone";
  obsidian.Platform = { isDesktopApp: !phone };
  obsidian.setIcon = () => {};
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  try {
    const hub = { app: { vault: { adapter }, showInFolder: async () => {} }, plugin: { settings: { language: "zh-tw" } }, _vTopic: null };
    const [topic] = await listTopics(adapter);
    renderTopic(body, hub, hub.plugin.settings, topic, () => {});
    if (whileReading) whileReading(body);
    await new Promise((resolve) => setTimeout(resolve, 20));
  } finally {
    classes.contains = contains;
    obsidian.Platform = platform;
    obsidian.setIcon = setIcon;
    globalThis.ResizeObserver = observer;
  }
  return body;
}
