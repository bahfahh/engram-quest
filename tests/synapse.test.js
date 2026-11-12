// Tests for src/review/synapse.js — pure data-layer + adapter helpers.
// Adapter is mocked as an in-memory dict so we can exercise edge cases.

import { describe, it, expect } from "vitest";
import {
  defaultStatus,
  loadSynapseStatus,
  loadSynapseForNote,
  loadSynapseBatch,
  attachSynapseToCards,
  loadSynapseSources,
  countMasteredFromSr,
  shouldShowRefreshBanner,
  isSynapseEnabled,
  STATUS_FILE,
  SYNAPSE_DIR,
  MASTERED_STABILITY_THRESHOLD
} from "../src/review/synapse.js";

function makeAdapter(files = {}) {
  return {
    files,
    async exists(p) {
      if (Object.prototype.hasOwnProperty.call(files, p)) return true;
      const prefix = p.endsWith("/") ? p : p + "/";
      return Object.keys(files).some(k => k.startsWith(prefix));
    },
    async read(p) {
      if (!Object.prototype.hasOwnProperty.call(files, p)) throw new Error(`ENOENT ${p}`);
      return files[p];
    },
    async list(dir) {
      const prefix = dir.endsWith("/") ? dir : dir + "/";
      const entries = Object.keys(files).filter(k => k.startsWith(prefix));
      return { files: entries, folders: [] };
    }
  };
}

describe("loadSynapseStatus", () => {
  it("returns defaults when file is missing", async () => {
    const status = await loadSynapseStatus(makeAdapter());
    expect(status).toEqual(defaultStatus());
    expect(status.enabled).toBe(false);
  });

  it("merges defaults with parsed file", async () => {
    const status = await loadSynapseStatus(makeAdapter({
      [STATUS_FILE]: JSON.stringify({ enabled: true, masteredPoolSize: 23, generatedAt: "2026-05-10T10:00:00Z" })
    }));
    expect(status.enabled).toBe(true);
    expect(status.masteredPoolSize).toBe(23);
  });

  it("falls back to defaults when JSON is malformed", async () => {
    const status = await loadSynapseStatus(makeAdapter({ [STATUS_FILE]: "{not json" }));
    expect(status.enabled).toBe(false);
  });
});

describe("isSynapseEnabled", () => {
  it("only true when status.enabled === true", () => {
    expect(isSynapseEnabled({ enabled: true })).toBe(true);
    expect(isSynapseEnabled({ enabled: false })).toBe(false);
    expect(isSynapseEnabled(null)).toBe(false);
    expect(isSynapseEnabled({ enabled: "yes" })).toBe(false);
  });
});

describe("loadSynapseForNote", () => {
  it("returns null when notePath is empty", async () => {
    expect(await loadSynapseForNote(makeAdapter(), "")).toBe(null);
    expect(await loadSynapseForNote(makeAdapter(), null)).toBe(null);
  });

  it("returns null when synapse file missing", async () => {
    expect(await loadSynapseForNote(makeAdapter(), "Study/Foo.md")).toBe(null);
  });

  it("returns parsed JSON for srFileName-mapped path", async () => {
    const doc = { _meta: { generatedAt: "x" }, cards: { Q: { anchors: [] } } };
    const adapter = makeAdapter({ [`${SYNAPSE_DIR}/Study__Foo.json`]: JSON.stringify(doc) });
    expect(await loadSynapseForNote(adapter, "Study/Foo.md")).toEqual(doc);
  });
});

describe("attachSynapseToCards", () => {
  function card(notePath, front, overrides = {}) {
    return { notePath, front, ...overrides };
  }

  it("sets [] when card has no notePath", () => {
    const cards = [card(null, "Q")];
    attachSynapseToCards(cards, new Map());
    expect(cards[0].synapseAnchors).toEqual([]);
  });

  it("sets [] when no doc for the path", () => {
    const cards = [card("a.md", "Q")];
    attachSynapseToCards(cards, new Map());
    expect(cards[0].synapseAnchors).toEqual([]);
  });

  it("attaches anchors when entry exists for card front", () => {
    const cards = [card("a.md", "Q")];
    const doc = { cards: { Q: { anchors: [{ front: "anchor1", notePath: "b.md", score: 9 }] } } };
    attachSynapseToCards(cards, new Map([["a.md", doc]]));
    expect(cards[0].synapseAnchors).toHaveLength(1);
    expect(cards[0].synapseAnchors[0].front).toBe("anchor1");
  });

  it("filters anchors that appear in userRejected", () => {
    const cards = [card("a.md", "Q")];
    const doc = {
      cards: {
        Q: {
          anchors: [
            { front: "keep", notePath: "b.md" },
            { front: "drop", notePath: "c.md" }
          ],
          userRejected: ["c.md|drop"]
        }
      }
    };
    attachSynapseToCards(cards, new Map([["a.md", doc]]));
    expect(cards[0].synapseAnchors.map(a => a.front)).toEqual(["keep"]);
  });

  it("filters anchors with missing front", () => {
    const cards = [card("a.md", "Q")];
    const doc = { cards: { Q: { anchors: [{ score: 9 }, { front: "ok" }] } } };
    attachSynapseToCards(cards, new Map([["a.md", doc]]));
    expect(cards[0].synapseAnchors).toHaveLength(1);
  });

  it("attaches relations beside the anchors and drops malformed or rejected ones", () => {
    const cards = [card("a.md", "Q")];
    const doc = {
      cards: {
        Q: {
          anchors: [{ front: "anchor1", notePath: "b.md", score: 9 }],
          relations: [
            { type: "lesson", ref: "course/lsn-1", score: 8, reason: "r" },
            { type: "video", ref: "series/v1", score: 9, reason: "rejected" },
            { type: "note", score: 7 },
            "not an object",
          ],
          userRejected: ["video|series/v1"]
        }
      }
    };
    attachSynapseToCards(cards, new Map([["a.md", doc]]));
    expect(cards[0].synapseAnchors).toHaveLength(1);
    expect(cards[0].synapseRelations).toEqual([{ type: "lesson", ref: "course/lsn-1", score: 8, reason: "r" }]);
    expect(cards[0].synapseRejected).toEqual(["video|series/v1"]);
  });

  it("reads an entry written before relations existed", () => {
    const cards = [card("a.md", "Q"), card("a.md", "no entry")];
    const doc = { cards: { Q: { anchors: [{ front: "anchor1" }], userRejected: [] } } };
    attachSynapseToCards(cards, new Map([["a.md", doc]]));
    expect(cards[0].synapseRelations).toEqual([]);
    expect(cards[1]).toMatchObject({ synapseAnchors: [], synapseRelations: [], synapseRejected: [] });
  });
});

describe("loadSynapseSources", () => {
  function folderAdapter(files) {
    const under = (dir) => Object.keys(files).filter((p) => p.startsWith(dir + "/"));
    return {
      async exists(p) { return p in files || under(p).length > 0; },
      async read(p) { if (!(p in files)) throw new Error(`ENOENT ${p}`); return files[p]; },
      async list(dir) {
        const rest = under(dir).map((p) => p.slice(dir.length + 1));
        if (!rest.length) throw new Error(`ENOENT ${dir}`);
        return {
          files: rest.filter((r) => !r.includes("/")).map((r) => `${dir}/${r}`),
          folders: [...new Set(rest.filter((r) => r.includes("/")).map((r) => `${dir}/${r.split("/")[0]}`))]
        };
      }
    };
  }
  const json = (v) => JSON.stringify(v);

  it("returns empty collections when the vault has none of the content", async () => {
    expect(await loadSynapseSources(folderAdapter({}))).toEqual({
      courses: [], series: [], explainers: [], explainerState: {}, recallTopics: [], topicSr: {}
    });
  });

  it("reads lessons, videos with recall films, Deep Dive pages and recall topics with their card schedules", async () => {
    const deck = "engram-review/ai-cards/情境回顧-LLM 應用怎麼測.md";
    const adapter = folderAdapter({
      "engram-quest/lessons/cicd/meta.json": json({ title: "CI/CD", lessons: [{ id: "lsn-1", title: "L1", file: "lsn-1.html" }], completion: {} }),
      "engram-quest/videos/azure-ai-2026/meta.json": json({ title: "Azure", videos: [{ id: "v1", file: "v1.mp4" }] }),
      "engram-quest/videos/episodic-recall/meta.json": json({ kind: "episodic", videos: [{ id: "ep-oct", file: "ep-oct.mp4" }], progress: { "ep-oct": { position: 34 } } }),
      "engram-quest/videos/settings.json": json({ quality: "high" }),
      "engram-quest/explainer/meta/p1.json": json({ id: "p1", title: "詳解", sourceCard: { note: "a.md", front: "Q" } }),
      "engram-quest/explainer/state.json": json({ p1: { viewed: true } }),
      "engram-quest/episodic-review/topics/t13/topic.json": json({ id: "t13", title: "LLM 應用怎麼測", notes: ["a.md"], cards: [{ q: "q1", a: "a1" }] }),
      "engram-quest/episodic-review/topics/broken/topic.json": "{not json",
      "engram-review/sr/engram-review__ai-cards__情境回顧-LLM 應用怎麼測.json": json({ q1: { stability: 9.5 }, q2: { due: "2026-11-20" } })
    });
    const raw = await loadSynapseSources(adapter, new Map([["t13", [deck]], ["unknown", ["x.md"]]]));
    expect(raw.courses.map((c) => c.slug)).toEqual(["cicd"]);
    expect(raw.series.map((s) => s.slug).sort()).toEqual(["azure-ai-2026", "episodic-recall"]);
    expect(raw.explainers.map((p) => p.id)).toEqual(["p1"]);
    expect(raw.explainerState).toEqual({ p1: { viewed: true } });
    expect(raw.recallTopics.map((t) => t.id)).toEqual(["t13"]);
    expect(raw.topicSr).toEqual({ t13: [9.5] });
  });
});

describe("countMasteredFromSr", () => {
  it("returns 0 when sr/ folder missing", async () => {
    expect(await countMasteredFromSr(makeAdapter())).toBe(0);
  });

  it("counts cards across files where stability >= threshold", async () => {
    const fileA = { Q1: { stability: 8.5 }, Q2: { stability: 3.2 } };
    const fileB = { Q3: { stability: MASTERED_STABILITY_THRESHOLD }, Q4: { stability: 17.108 } };
    const adapter = makeAdapter({
      "engram-review/sr/A.json": JSON.stringify(fileA),
      "engram-review/sr/B.json": JSON.stringify(fileB)
    });
    expect(await countMasteredFromSr(adapter)).toBe(3);
  });

  it("ignores files that are not .json or fail to parse", async () => {
    const adapter = makeAdapter({
      "engram-review/sr/A.json": "{not json",
      "engram-review/sr/notes.txt": "ignored",
      "engram-review/sr/B.json": JSON.stringify({ Q: { stability: 10 } })
    });
    expect(await countMasteredFromSr(adapter)).toBe(1);
  });

  it("treats cards without numeric stability as not mastered", async () => {
    const adapter = makeAdapter({
      "engram-review/sr/A.json": JSON.stringify({ Q1: { stability: "high" }, Q2: { stability: 9 } })
    });
    expect(await countMasteredFromSr(adapter)).toBe(1);
  });
});

describe("shouldShowRefreshBanner", () => {
  const baseStatus = {
    enabled: true,
    masteredPoolSize: 20,
    generatedAt: "2026-05-01T00:00:00Z"
  };
  const now = Date.parse("2026-05-05T00:00:00Z"); // 4 days after generatedAt

  it("does not show when feature not enabled", () => {
    const r = shouldShowRefreshBanner({ status: { enabled: false }, currentMastered: 100, now });
    expect(r.show).toBe(false);
  });

  it("does not show when delta < threshold and fresh", () => {
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 22, now });
    expect(r.show).toBe(false);
  });

  it("shows when delta >= 15 (pool grew)", () => {
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 35, now });
    expect(r.show).toBe(true);
    expect(r.reason).toBe("pool-changed");
    expect(r.delta).toBe(15);
  });

  it("shows when delta >= 15 (pool shrank)", () => {
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 5, now });
    expect(r.show).toBe(true);
    expect(r.reason).toBe("pool-changed");
  });

  it("shows when generatedAt is older than 28 days", () => {
    const stale = Date.parse("2026-05-30T00:00:00Z"); // 29 days after generatedAt
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 20, now: stale });
    expect(r.show).toBe(true);
    expect(r.reason).toBe("stale");
  });

  it("suppresses when dismissed within 120h regardless of trigger", () => {
    const dismissedAt = now - 60 * 60 * 1000; // 1h ago
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 30, now, dismissedAt });
    expect(r.show).toBe(false);
    expect(r.reason).toBe("dismissed-recently");
  });

  it("re-shows after dismissal expires (121h ago)", () => {
    const dismissedAt = now - 121 * 60 * 60 * 1000; // 121h ago
    const r = shouldShowRefreshBanner({ status: baseStatus, currentMastered: 35, now, dismissedAt });
    expect(r.show).toBe(true);
  });
});

describe("loadSynapseBatch", () => {
  it("returns Map keyed by notePath, null for missing", async () => {
    const docA = { cards: {} };
    const adapter = makeAdapter({ [`${SYNAPSE_DIR}/A.json`]: JSON.stringify(docA) });
    const batch = await loadSynapseBatch(adapter, ["A.md", "B.md", "A.md"]);
    expect(batch.get("A.md")).toEqual(docA);
    expect(batch.get("B.md")).toBe(null);
    expect(batch.size).toBe(2); // de-duped
  });
});
