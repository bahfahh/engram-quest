// Counts in the Video Academy read right for exactly one video: "1 video", not "1 videos" (ticket-023).
// English has a singular string for each; Traditional Chinese counts with 支 and reads the same either way.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { vault, drawPlayer, drawn } from "./helpers/player-page.js";

const require = createRequire(import.meta.url);
const { DICT, t, tn } = require("../src/i18n");

const en = { language: "en" };
const zh = { language: "zh-tw" };
const COUNTED = ["VIDEO_COUNT", "VIDEO_TOPIC_META", "VIDEO_DELETE_READY_BODY"];

describe("tn (a string that counts something)", () => {
  it("uses the singular string for exactly one, the plural for every other number", () => {
    expect(tn(en, "VIDEO_COUNT", 1)).toBe("1 video");
    expect(tn(en, "VIDEO_COUNT", 0)).toBe("0 videos");
    expect(tn(en, "VIDEO_COUNT", 2)).toBe("2 videos");
    expect(tn(en, "VIDEO_COUNT", 12)).toBe("12 videos");
  });

  it("fills the other placeholders too", () => {
    expect(tn(en, "VIDEO_TOPIC_META", 1, { done: 0 })).toBe("1 video · 0 watched");
    expect(tn(en, "VIDEO_TOPIC_META", 3, { done: 2 })).toBe("3 videos · 2 watched");
  });

  it("says 'Its 1 video, cover, …' when a series with one video is deleted", () => {
    expect(tn(en, "VIDEO_DELETE_READY_BODY", 1)).toMatch(/^Its 1 video, cover, subtitles and watch history go to the trash\./);
    expect(tn(en, "VIDEO_DELETE_READY_BODY", 4)).toMatch(/^Its 4 videos, covers, subtitles and watch history go to the trash\./);
  });

  it("leaves Traditional Chinese as it was, for one and for many", () => {
    expect(tn(zh, "VIDEO_COUNT", 1)).toBe("1 支");
    expect(tn(zh, "VIDEO_COUNT", 5)).toBe("5 支");
    expect(tn(zh, "VIDEO_TOPIC_META", 1, { done: 1 })).toBe("1 支 · 已看完 1");
    expect(tn(zh, "VIDEO_DELETE_READY_BODY", 1)).toBe(t(zh, "VIDEO_DELETE_READY_BODY", { count: 1 }));
  });

  it("every counted key has a singular string in both languages", () => {
    for (const key of COUNTED) {
      expect(DICT.en[`${key}_ONE`], key).toBeTruthy();
      expect(DICT["zh-tw"][`${key}_ONE`], key).toBe(DICT["zh-tw"][key]);
    }
  });
});

// The series card, the delete dialog and the Recall Films hint are not drawn here, so this keeps them honest:
// a counted key is only ever formatted through tn, and every key tn is asked for has its singular string.
describe("counted strings in the source", () => {
  const sources = () => {
    const out = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.name.endsWith(".js") && !/embedded/.test(entry.name) && !file.endsWith(path.join("i18n", "index.js"))) out.push(file);
      }
    };
    walk(path.join(__dirname, "..", "src"));
    return out;
  };

  it("never formats a counted key without tn", () => {
    const bare = [];
    for (const file of sources()) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (COUNTED.some((key) => line.includes(`"${key}"`)) && !/\btn\(/.test(line)) bare.push(`${path.relative(path.join(__dirname, ".."), file)}:${i + 1}`);
      });
    }
    expect(bare).toEqual([]);
  });

  it("has a singular string, in both languages, for every key tn is called with", () => {
    const asked = new Set();
    for (const file of sources()) for (const m of fs.readFileSync(file, "utf8").matchAll(/\btn\(\s*[\w.]+\s*,\s*"([A-Z0-9_]+)"/g)) asked.add(m[1]);
    expect(asked.size).toBeGreaterThanOrEqual(COUNTED.length);
    for (const key of asked) {
      expect(DICT.en[`${key}_ONE`], key).toBeTruthy();
      expect(DICT["zh-tw"][`${key}_ONE`], key).toBeTruthy();
    }
  });
});

describe("the playlist heading of a series with one video", () => {
  it("counts '1 video' in English", async () => {
    const body = await drawPlayer(vault(), { language: "en" });
    expect(drawn(body).some((el) => el.text === "Playlist · 1 video · 0 watched")).toBe(true);
    expect(drawn(body).some((el) => /\b1 videos\b/.test(el.text))).toBe(false);
  });

  it("is unchanged in Traditional Chinese", async () => {
    const body = await drawPlayer(vault());
    expect(drawn(body).some((el) => el.text === "播放清單 · 1 支 · 已看完 0")).toBe(true);
  });
});
