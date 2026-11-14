// Tests for the Video Academy data layer (src/videos/data.js): settings clamping incl. the licence
// flag, topic scan/normalisation, progress read-merge-write, continue-watching, requests.
import { describe, it, expect } from "vitest";
import {
  VIDEOS_DIR,
  SETTINGS_PATH,
  normalizeSettings,
  readSettings,
  saveSettings,
  syncSettingsLicense,
  normalizeTopic,
  videoProgress,
  topicProgress,
  listTopics,
  continueWatching,
  saveProgress,
  createRequest,
  updateRequest,
  requeueSeries,
  readEpisodic,
  addEpisodicRequest,
  cancelEpisodicRequest,
  hasPlayable,
  topicState,
  collectTags,
  GOAL_MAX,
  deleteTopic,
} from "../src/videos/data.js";

// In-memory vault adapter mimicking the Obsidian adapter surface the data layer uses.
function makeAdapter(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async exists(p) { return Object.prototype.hasOwnProperty.call(files, p); },
    async read(p) {
      if (!(p in files)) throw new Error("ENOENT " + p);
      return files[p];
    },
    async write(p, content) { files[p] = content; },
    async mkdir() {},
    async remove(p) { delete files[p]; },
    async trashLocal(p) { delete files[p]; },
    async list(dir) {
      const prefix = dir.replace(/\/$/, "") + "/";
      const folders = new Set();
      for (const k of Object.keys(files)) {
        if (!k.startsWith(prefix)) continue;
        const rest = k.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash > 0) folders.add(prefix + rest.slice(0, slash));
      }
      return {
        files: Object.keys(files).filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/")),
        folders: [...folders],
      };
    },
  };
}

function topicMeta(overrides = {}) {
  return {
    title: "AI Coding 品質防線",
    status: "ready",
    createdAt: "2026-09-29T00:00:00.000Z",
    videos: [
      { id: "vid-1", title: "突變測試", file: "vid-1.mp4", subtitles: "vid-1.vtt", duration: 146, style: "fast", mode: "basic", source: "skill" },
      { id: "vid-2", title: "SDLC", file: "vid-2.mp4", duration: 179, style: "system", mode: "basic", source: "skill" },
    ],
    progress: {},
    ...overrides,
  };
}

const metaPath = (slug) => `${VIDEOS_DIR}/${slug}/meta.json`;

describe("normalizeSettings", () => {
  it("fills defaults for missing or invalid values and stamps the licence", () => {
    const defaults = { quality: "high", narrationLang: "follow", subtitles: true, episodicLength: "medium", cast: { teacher: "nico", variants: {} }, course: { off: [] }, voice: { engine: "auto" } };
    expect(normalizeSettings(null, false)).toEqual({ ...defaults, pro: false });
    expect(normalizeSettings({ quality: "ultra", narrationLang: "fr", subtitles: 0, episodicLength: "epic", voice: { engine: "nope" } }, true))
      .toEqual({ ...defaults, subtitles: false, pro: true });
  });

  it("keeps fields it doesn't know, at every level", () => {
    const s = normalizeSettings({ future: 1, cast: { teacher: "luna", variants: { nico: "wine" }, extra: 2 }, course: { off: ["cards", "cards"], note: "x" }, voice: { engine: "edge", speed: 3 } }, false);
    expect(s).toMatchObject({ future: 1, cast: { teacher: "luna", variants: { nico: "wine" }, extra: 2 }, course: { off: ["cards"], note: "x" }, voice: { engine: "edge", speed: 3 } });
  });

  it("drops retired settings: style (ADR-29), length and production mode", () => {
    const s = normalizeSettings({ style: "chalk", mode: "polished", length: 30 }, true);
    expect(s).not.toHaveProperty("style");
    expect(s).not.toHaveProperty("length");
    expect(s).not.toHaveProperty("mode");
  });
});

describe("settings file", () => {
  it("round-trips through settings.json, normalised on write", async () => {
    const a = makeAdapter();
    expect(await readSettings(a, false)).toMatchObject({ quality: "high", pro: false });
    await saveSettings(a, { quality: "compact" }, true);
    expect(JSON.parse(a.files[SETTINGS_PATH])).toMatchObject({ quality: "compact", narrationLang: "follow", subtitles: true, pro: true });
    expect((await readSettings(a, false)).pro).toBe(false);
  });

  it("a licence change does not wipe the teacher, modules or voice", async () => {
    const a = makeAdapter({ [SETTINGS_PATH]: JSON.stringify({ quality: "compact", cast: { teacher: "luna", variants: { nico: "wine" } }, course: { off: ["cards"] }, voice: { engine: "edge" }, pro: true }) });
    await syncSettingsLicense(a, false);
    expect(JSON.parse(a.files[SETTINGS_PATH])).toMatchObject({ quality: "compact", cast: { teacher: "luna", variants: { nico: "wine" } }, course: { off: ["cards"] }, voice: { engine: "edge" }, pro: false });
  });
});

describe("normalizeTopic", () => {
  it("treats a topic without any playable file as pending", () => {
    const m = normalizeTopic({ title: "x", status: "ready", videos: [{ id: "v", file: null }] });
    expect(m.status).toBe("pending");
    expect(normalizeTopic(topicMeta()).status).toBe("ready");
  });

  it("recognises the four series statuses and keeps the failure reason", () => {
    expect(normalizeTopic(topicMeta({ status: "making", videos: [] })).status).toBe("making");
    expect(normalizeTopic(topicMeta({ status: "failed", error: "算圖失敗", videos: [] }))).toMatchObject({ status: "failed", error: "算圖失敗" });
    expect(normalizeTopic(topicMeta({ status: "made-up" })).status).toBe("ready");
    expect(hasPlayable(normalizeTopic(topicMeta({ status: "making" })))).toBe(true);
    expect(hasPlayable(normalizeTopic(topicMeta({ status: "failed", videos: [] })))).toBe(false);
  });

  it("keeps the fields the plugin shows and tolerates their absence", () => {
    const m = normalizeTopic(topicMeta({
      kind: "episodic", cast: { teacher: "luna" }, requests: [{ id: "r1", period: "2026-11", length: "short", status: "pending" }, { no: "id" }],
      videos: [{ id: "v", file: "v.mp4", cast: { teacher: "iris", skin: "glass" }, cards: "engram-review/ai-cards/a.md", credits: "CC BY", period: "2026-10", length: "long", createdAt: "x",
        topics: [{ title: "A", from: 4, to: 9 }, { title: "bad" }], notTaken: ["B"] }],
    }));
    expect(m).toMatchObject({ kind: "episodic", cast: { teacher: "luna" }, requests: [{ id: "r1", period: "2026-11", length: "short", status: "pending" }] });
    expect(m.videos[0]).toMatchObject({ cast: { teacher: "iris", skin: "glass" }, cards: "engram-review/ai-cards/a.md", credits: "CC BY", period: "2026-10", length: "long", topics: [{ title: "A", from: 4, to: 9 }], notTaken: ["B"] });
    expect(normalizeTopic(topicMeta()).videos[0]).toMatchObject({ cast: null, cards: null, credits: "", period: null, length: null, topics: [], notTaken: [] });
  });

  it("keeps the request and defaults its source to notes", () => {
    const m = normalizeTopic({ request: { text: "SEO 教學", refs: ["SEO"] } });
    expect(m.title).toBe("SEO 教學");
    expect(m.request).toMatchObject({ text: "SEO 教學", source: "notes", refs: ["SEO"] });
  });

  it("drops entries without an id and rejects non-objects", () => {
    expect(normalizeTopic(topicMeta({ videos: [{ title: "no id" }] })).videos).toEqual([]);
    expect(normalizeTopic("nope")).toBeNull();
  });
});

describe("progress", () => {
  it("videoProgress returns a full object", () => {
    expect(videoProgress(normalizeTopic(topicMeta()), "vid-1")).toEqual({ position: 0, completed: false, lastViewed: null });
  });

  it("saveProgress merges without touching skill-owned fields", async () => {
    const a = makeAdapter({ [metaPath("t")]: JSON.stringify(topicMeta({ extra: "keep" })) });
    await saveProgress(a, "t", "vid-1", { position: 31.6 });
    await saveProgress(a, "t", "vid-1", { completed: true });
    const raw = JSON.parse(a.files[metaPath("t")]);
    expect(raw.extra).toBe("keep");
    expect(raw.videos).toHaveLength(2);
    expect(raw.progress["vid-1"]).toMatchObject({ position: 32, completed: true });
    expect(raw.progress["vid-1"].lastViewed).toBeTruthy();
    expect(topicProgress(normalizeTopic(raw))).toEqual({ completed: 1, total: 2 });
  });

  it("saveProgress returns null for a missing topic", async () => {
    expect(await saveProgress(makeAdapter(), "gone", "v", { position: 1 })).toBeNull();
  });
});

describe("listTopics / continueWatching", () => {
  it("orders by starred, then latest activity, and picks the latest unfinished video", async () => {
    const a = makeAdapter({
      [metaPath("old")]: JSON.stringify(topicMeta({ progress: { "vid-2": { position: 50, lastViewed: "2026-09-30T08:00:00.000Z" } } })),
      [metaPath("new")]: JSON.stringify({ title: "SEO", status: "pending", createdAt: "2026-09-30T09:00:00.000Z", videos: [] }),
      [metaPath("fav")]: JSON.stringify(topicMeta({ starred: true, createdAt: "2026-01-01" })),
      [`${VIDEOS_DIR}/broken/meta.json`]: "{not json",
    });
    const topics = await listTopics(a);
    expect(topics.map((t) => t.slug)).toEqual(["fav", "new", "old"]);
    const cw = continueWatching(topics);
    expect(cw).toMatchObject({ slug: "old", video: { id: "vid-2" }, progress: { position: 50 } });
  });

  it("leaves episodic recall films out of the teaching shelf", async () => {
    const a = makeAdapter({ [metaPath("t")]: JSON.stringify(topicMeta()), [metaPath("episodic-recall")]: JSON.stringify(topicMeta({ kind: "episodic" })) });
    expect((await listTopics(a)).map((t) => t.slug)).toEqual(["t"]);
  });

  it("returns nothing when the videos folder is missing", async () => {
    expect(await listTopics(makeAdapter())).toEqual([]);
    expect(continueWatching([])).toBeNull();
  });
});

describe("createRequest / deleteTopic", () => {
  it("writes a pending topic; non-ASCII text gets a timestamp slug", async () => {
    const a = makeAdapter();
    const { slug, meta } = await createRequest(a, { text: "  我的 coding 流程 ", refs: ["a.md", "a.md"] });
    expect(slug).toMatch(/^coding$|^topic-\d+$/);
    expect(meta.status).toBe("pending");
    expect(meta.request).toMatchObject({ text: "我的 coding 流程", source: "notes", refs: ["a.md"] });
  });

  it("drops refs for general requests and avoids slug collisions", async () => {
    const a = makeAdapter({ [metaPath("seo")]: "{}" });
    const { slug, meta } = await createRequest(a, { text: "SEO", source: "general", refs: ["x.md"] });
    expect(slug).not.toBe("seo");
    expect(meta.request).toMatchObject({ source: "general", refs: [] });
  });

  it("rejects an empty request", async () => {
    await expect(createRequest(makeAdapter(), { text: "  " })).rejects.toThrow();
  });

  it("deleteTopic trashes every file of the topic, subfolders included", async () => {
    const a = makeAdapter({ [metaPath("t")]: "{}", [`${VIDEOS_DIR}/t/vid-1.mp4`]: "bin", [`${VIDEOS_DIR}/t/assets/a.png`]: "img", [metaPath("other")]: "{}" });
    const removed = [];
    a.rmdir = async (dir) => { removed.push(dir); };
    expect(await deleteTopic(a, "t")).toBe(true);
    expect(Object.keys(a.files)).toEqual([metaPath("other")]);
    expect(removed).toEqual([`${VIDEOS_DIR}/t`]);
  });

  it("deleteTopic keeps the folder when a file can't be trashed", async () => {
    const stuck = `${VIDEOS_DIR}/t/vid-1.mp4`;
    const a = makeAdapter({ [metaPath("t")]: "{}", [stuck]: "bin" });
    const trash = a.trashLocal;
    a.trashLocal = async (p) => { if (p === stuck) throw new Error("locked"); return trash(p); };
    a.rmdir = async () => { throw new Error("rmdir must not run"); };
    expect(await deleteTopic(a, "t")).toBe(false);
    expect(a.files[stuck]).toBe("bin");
    expect(a.files[metaPath("t")]).toBe("{}"); // topic stays listed so the user sees it wasn't deleted
  });

  it("deleteTopic rejects slugs that escape the topic folder", async () => {
    for (const bad of ["", "..", "a/b", "a\\b"]) await expect(deleteTopic(makeAdapter(), bad)).rejects.toThrow();
  });
});

describe("continueWatching threshold", () => {
  it("ignores a video that was only opened (position 0)", () => {
    const meta = normalizeTopic(topicMeta({ progress: { "vid-1": { position: 0, lastViewed: "2026-09-30T08:00:00.000Z" } } }));
    expect(continueWatching([{ slug: "t", meta }])).toBeNull();
  });
});

describe("series request: goal, detail, teacher", () => {
  it("stores the goal as the name and keeps detail", async () => {
    const a = makeAdapter();
    const { slug, meta } = await createRequest(a, { text: "  架設網站 ", detail: " 從零開始，想用 Obsidian 發布 " });
    expect(meta).toMatchObject({ title: "架設網站", status: "pending", cast: null });
    expect(meta.request).toMatchObject({ text: "架設網站", detail: "從零開始，想用 Obsidian 發布" });
    expect(JSON.parse(a.files[metaPath(slug)])).not.toHaveProperty("style");
  });

  it("caps the goal length so it stays a name", async () => {
    const { meta } = await createRequest(makeAdapter(), { text: "x".repeat(GOAL_MAX + 20) });
    expect(meta.title).toHaveLength(GOAL_MAX);
  });

  it("records a series' own teacher", async () => {
    const a = makeAdapter();
    const { slug, meta } = await createRequest(a, { text: "SEO", teacher: "luna" });
    expect(meta.cast).toEqual({ teacher: "luna" });
    expect(JSON.parse(a.files[metaPath(slug)]).cast).toEqual({ teacher: "luna" });
    expect((await updateRequest(a, slug, { text: "SEO", teacher: "iris" })).cast).toEqual({ teacher: "iris" });
    expect((await updateRequest(a, slug, { text: "SEO" })).cast).toEqual({ teacher: "iris" });
    expect((await updateRequest(a, slug, { text: "SEO", teacher: "" })).cast).toBeNull();
  });

  it("an old series' style stays in the file untouched", async () => {
    const a = makeAdapter({ [metaPath("t")]: JSON.stringify({ title: "x", status: "pending", style: "chalk", videos: [] }) });
    await updateRequest(a, "t", { text: "y" });
    await saveProgress(a, "t", "v", { position: 1 });
    expect(JSON.parse(a.files[metaPath("t")]).style).toBe("chalk");
  });

  it("updateRequest edits a pending series in place and keeps plugin/skill fields", async () => {
    const a = makeAdapter();
    const { slug } = await createRequest(a, { text: "SEO", refs: ["a.md"] });
    const raw = JSON.parse(a.files[metaPath(slug)]);
    a.files[metaPath(slug)] = JSON.stringify({ ...raw, note: "no notes found" });
    const meta = await updateRequest(a, slug, { text: "SEO 教學", detail: "技術 SEO", refs: ["b.md"] });
    expect(meta).toMatchObject({ title: "SEO 教學" });
    // A field the plugin does not use is still written back as it was.
    expect(JSON.parse(a.files[metaPath(slug)]).note).toBe("no notes found");
    expect(meta.request).toMatchObject({ text: "SEO 教學", detail: "技術 SEO", refs: ["b.md"] });
    expect(meta.request.createdAt).toBe(raw.request.createdAt);
  });

  it("updateRequest refuses when the skill changed the series after the form opened", async () => {
    const a = makeAdapter();
    const { slug, meta: opened } = await createRequest(a, { text: "SEO" });
    const raw = JSON.parse(a.files[metaPath(slug)]);
    a.files[metaPath(slug)] = JSON.stringify({ ...raw, title: "SEO 入門（AI 命名）" });
    expect(await updateRequest(a, slug, { text: "SEO 2" }, opened)).toBeNull();
    expect(JSON.parse(a.files[metaPath(slug)]).title).toBe("SEO 入門（AI 命名）");
  });

  it("updateRequest needs the file itself to say pending, not just have no videos yet", async () => {
    const a = makeAdapter({ [metaPath("t")]: JSON.stringify({ title: "x", status: "ready", videos: [] }) });
    expect(await updateRequest(a, "t", { text: "y" })).toBeNull();
  });

  it("updateRequest refuses once the series has videos, or is gone", async () => {
    const a = makeAdapter({ [metaPath("t")]: JSON.stringify(topicMeta()) });
    expect(await updateRequest(a, "t", { text: "new" })).toBeNull();
    expect(JSON.parse(a.files[metaPath("t")]).title).toBe("AI Coding 品質防線");
    expect(await updateRequest(a, "gone", { text: "new" })).toBeNull();
  });

  it("requeueSeries returns a failed or stuck series to the queue and clears the reason", async () => {
    const a = makeAdapter({ [metaPath("f")]: JSON.stringify({ title: "x", status: "failed", error: "e", videos: [], extra: 1 }), [metaPath("r")]: JSON.stringify(topicMeta()) });
    expect(await requeueSeries(a, "f")).toBe(true);
    const raw = JSON.parse(a.files[metaPath("f")]);
    expect(raw).toMatchObject({ status: "pending", extra: 1 });
    expect(raw).not.toHaveProperty("error");
    expect(await requeueSeries(a, "r")).toBe(false);
    expect(await requeueSeries(a, "gone")).toBe(false);
  });
});

describe("episodic recall", () => {
  const path = metaPath("episodic-recall");

  it("reads nothing when no film has been made or requested", async () => {
    expect(await readEpisodic(makeAdapter())).toBeNull();
  });

  it("adds a pending request to a new series marked episodic", async () => {
    const a = makeAdapter();
    const r = await addEpisodicRequest(a, { period: "2026-11", length: "short" });
    expect(r).toMatchObject({ period: "2026-11", length: "short", status: "pending" });
    expect(JSON.parse(a.files[path])).toMatchObject({ kind: "episodic", requests: [{ period: "2026-11", length: "short", status: "pending" }] });
    expect((await readEpisodic(a)).meta.requests).toHaveLength(1);
  });

  it("keeps every other field when adding and cancelling a request", async () => {
    const before = topicMeta({ kind: "episodic", notes: "keep", requests: [{ id: "a", period: "2026-10", length: "long", status: "done" }], progress: { "vid-1": { position: 9 } } });
    const a = makeAdapter({ [path]: JSON.stringify(before) });
    const r = await addEpisodicRequest(a, { period: "2026-08..2026-09", length: "bogus" });
    expect(r.length).toBe("medium");
    expect(JSON.parse(a.files[path]).requests).toHaveLength(2);
    expect(await cancelEpisodicRequest(a, r.id)).toBe(true);
    expect(JSON.parse(a.files[path])).toEqual(before);
    expect(await cancelEpisodicRequest(a, "nope")).toBe(false);
  });

  it("rejects a malformed period", async () => {
    await expect(addEpisodicRequest(makeAdapter(), { period: "last month" })).rejects.toThrow();
  });

  it("progress saves keep the episodic fields", async () => {
    const a = makeAdapter({ [path]: JSON.stringify(topicMeta({ kind: "episodic", requests: [{ id: "a" }] })) });
    await saveProgress(a, "episodic-recall", "vid-1", { position: 12 });
    expect(JSON.parse(a.files[path])).toMatchObject({ kind: "episodic", requests: [{ id: "a" }] });
  });
});

describe("topicState", () => {
  it("buckets series for the shelf filters", () => {
    expect(topicState(normalizeTopic({ title: "p", status: "pending", videos: [] }))).toBe("pending");
    expect(topicState(normalizeTopic(topicMeta()))).toBe("new");
    expect(topicState(normalizeTopic(topicMeta({ progress: { "vid-1": { position: 12 } } })))).toBe("watching");
    expect(topicState(normalizeTopic(topicMeta({ progress: { "vid-1": { completed: true } } })))).toBe("watching");
    expect(topicState(normalizeTopic(topicMeta({ progress: { "vid-1": { completed: true }, "vid-2": { completed: true } } })))).toBe("done");
  });
});

describe("tags", () => {
  it("normalizes skill-written tags and counts them across series, most used first", () => {
    const a = normalizeTopic(topicMeta({ tags: [" 軟體 ", "AI Coding", "軟體", "", 3] }));
    expect(a.tags).toEqual(["軟體", "AI Coding", "3"]);
    const b = normalizeTopic(topicMeta({ tags: ["軟體", "SDD"] }));
    const c = normalizeTopic({ title: "p", status: "pending" });
    expect(c.tags).toEqual([]);
    expect(collectTags([{ meta: a }, { meta: b }, { meta: c }])).toEqual([
      { tag: "軟體", count: 2 }, { tag: "3", count: 1 }, { tag: "AI Coding", count: 1 }, { tag: "SDD", count: 1 },
    ]);
  });
});

describe("syncSettingsLicense", () => {
  it("keeps settings.json's pro flag in step with the licence, writing only on a change", async () => {
    const a = makeAdapter({ [SETTINGS_PATH]: JSON.stringify({ quality: "compact", pro: false }) });
    expect(await syncSettingsLicense(a, false)).toBe(false);
    expect(await syncSettingsLicense(a, true)).toBe(true);
    expect(JSON.parse(a.files[SETTINGS_PATH])).toMatchObject({ quality: "compact", pro: true });
    expect(await syncSettingsLicense(a, true)).toBe(false);
    expect(await syncSettingsLicense(a, false)).toBe(true);
    expect(JSON.parse(a.files[SETTINGS_PATH]).pro).toBe(false);
  });

  it("creates the file for a Pro user who never saved settings, but not for a free user", async () => {
    const free = makeAdapter();
    expect(await syncSettingsLicense(free, false)).toBe(false);
    expect(free.files[SETTINGS_PATH]).toBeUndefined();
    const pro = makeAdapter();
    expect(await syncSettingsLicense(pro, true)).toBe(true);
    expect(JSON.parse(pro.files[SETTINGS_PATH])).toMatchObject({ quality: "high", pro: true });
  });
});

describe("files that exist but can't be read are never overwritten", () => {
  const damaged = "<<<<<<< conflict";
  const adapterWith = (path) => {
    const files = { [path]: damaged };
    return {
      files,
      exists: async (p) => p in files,
      read: async (p) => files[p],
      write: async (p, content) => { files[p] = content; },
      mkdir: async () => {},
    };
  };

  it("keeps a damaged recall series when a new film is requested", async () => {
    const path = "engram-quest/videos/episodic-recall/meta.json";
    const adapter = adapterWith(path);
    await expect(addEpisodicRequest(adapter, { period: "2026-10", length: "short" })).rejects.toThrow();
    expect(adapter.files[path]).toBe(damaged);
  });

  it("keeps damaged settings when the licence state or a save would rewrite them", async () => {
    const adapter = adapterWith(SETTINGS_PATH);
    await expect(syncSettingsLicense(adapter, true)).rejects.toThrow();
    await expect(saveSettings(adapter, {}, true)).rejects.toThrow();
    expect(adapter.files[SETTINGS_PATH]).toBe(damaged);
  });
});
