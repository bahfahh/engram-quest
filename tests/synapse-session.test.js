// Tests for src/review/synapse-session.js: what the ⚡ panel does that needs no DOM. The review
// session supplies the openers (the viewers); here they are plain recorders.

import { describe, it, expect, vi } from "vitest";
import { SynapseMapSession } from "../src/review/synapse-session.js";
import { attachSynapseToCards } from "../src/review/synapse.js";
import { vaultAdapter, json } from "./helpers/vault-adapter.js";

const DECK = "engram-review/ai-cards/video-azure-ai-2026-az-l04-eval.md";
const SOURCE = "AI 工程/LLM 測試.md";
const FRONT = "CI gate 靠哪個設定擋下結果？";

function vault() {
  return {
    "engram-quest/lessons/cicd/meta.json": json({
      title: "CI/CD",
      lessons: [{ id: "lsn-1", title: "第 1 課", file: "lsn-1.html" }, { id: "lsn-2", title: "畫布課", file: "lsn-2.canvas", type: "canvas" }],
      completion: {},
    }),
    "engram-quest/videos/azure-ai-2026/meta.json": json({ title: "Azure AI", videos: [{ id: "az-l04", title: "第 4 課", file: "az-l04.mp4", cards: DECK }], progress: { "az-l04": { position: 42 } } }),
    "engram-quest/videos/azure-ai-2026/az-l04.mp4": "(video)",
    "engram-quest/explainer/meta/ci-gate.json": json({ id: "ci-gate", title: "詳解：CI gate", sourceCard: { note: DECK, front: FRONT } }),
    "engram-quest/explainer/state.json": json({ "ci-gate": { viewed: true, starred: true, completed: true } }),
  };
}

function makeCard(entry = {}) {
  const card = { front: FRONT, back: "失敗門檻", notePath: DECK };
  attachSynapseToCards([card], new Map([[DECK, { cards: { [FRONT]: entry } }]]));
  return card;
}

function makeSession(files = vault(), overrides = {}) {
  const adapter = vaultAdapter(files);
  const opened = [];
  const openers = {
    note: (path) => opened.push(["note", path]),
    lesson: (lesson) => opened.push(["lesson", lesson]),
    explainer: (page, onChanged) => opened.push(["explainer", page, onChanged]),
    video: (video) => opened.push(["video", video]),
    missing: () => opened.push(["missing"]),
  };
  const session = new SynapseMapSession({
    adapter, openers,
    allowed: () => true,
    sourcePaths: () => [SOURCE],
    noteExists: (p) => p === SOURCE,
    resolvedLinks: () => ({}),
    anchorBack: (anchor) => anchor.back || "",
    ...overrides,
  });
  return { session, adapter, opened };
}

const nodeOf = (session, card, id) => {
  const graph = session.graph(card, true);
  return graph.branches.flatMap((b) => [b, ...b.children]).find((n) => n.id === id);
};

describe("SynapseMapSession: loading", () => {
  it("reads nothing and opens nothing without Pro and an enabled Synapse", async () => {
    const { session, adapter, opened } = makeSession(vault(), { allowed: () => false });
    expect(await session.load()).toBe(false);
    expect(adapter.reads).toEqual([]);
    expect(adapter.lists).toEqual([]);
    expect(session.hasLinks(makeCard())).toBe(false);
    expect(await session.open({ type: "note", ref: SOURCE })).toBe(false);
    expect(opened).toEqual([]);
  });

  it("reads the content once, however many times it is asked for", async () => {
    const { session, adapter } = makeSession();
    expect(session.ready).toBe(false);
    await Promise.all([session.load(), session.load()]);
    const reads = adapter.reads.length;
    expect(reads).toBeGreaterThan(0);
    expect(session.ready).toBe(true);
    await session.load();
    expect(adapter.reads.length).toBe(reads);
  });

  it("does not keep a failed load: the map is drawn from what the card carries, and the next card tries again", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { session, adapter } = makeSession();
    adapter.failList.add("engram-quest/lessons");
    const card = makeCard({ relations: [{ type: "lesson", ref: "cicd/lsn-1", score: 9, reason: "同一個設定" }] });

    expect(await session.load()).toBe(true);
    expect(session.ready).toBe(true);
    expect(session.graph(card, true).branches.map((n) => n.id)).toEqual([`note|${SOURCE}`]);

    adapter.failList.clear();
    session.retry();
    expect(session.ready).toBe(false);
    await session.load();
    expect(session.graph(card, true).branches.map((n) => n.id)).toContain("lesson|cicd/lsn-1");
    warn.mockRestore();
  });
});

describe("SynapseMapSession: the graph never breaks the card", () => {
  it("answers with an empty map when building it throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { session } = makeSession(vault(), { sourcePaths: () => { throw new Error("boom"); } });
    await session.load();
    expect(session.graph(makeCard(), true)).toEqual({ branches: [], count: 0, more: 0 });
    expect(session.hasLinks(makeCard())).toBe(false);
    warn.mockRestore();
  });

  it("says a card in a file may have links until the content is read, then answers exactly", async () => {
    const { session } = makeSession({}, { sourcePaths: () => [] });
    const card = makeCard();
    expect(session.hasLinks(card)).toBe(true);
    expect(session.hasLinks({ front: "inline", back: "x", notePath: null })).toBe(false);
    await session.load();
    expect(session.hasLinks(card)).toBe(false);
  });
});

describe("SynapseMapSession: opening a node", () => {
  it("opens a Deep Dive page with the reading state the Deep Dive tab would give it", async () => {
    const { session, opened } = makeSession();
    await session.load();
    const card = makeCard();
    expect(await session.open(nodeOf(session, card, "explainer|ci-gate"))).toBe(true);
    const [kind, page] = opened[0];
    expect(kind).toBe("explainer");
    expect(page).toMatchObject({ id: "ci-gate", _viewed: true, _starred: true, _completed: true });
  });

  it("after the page is closed, reads its state again instead of all the content", async () => {
    const { session, adapter, opened } = makeSession();
    await session.load();
    const card = makeCard();
    const redraw = vi.fn();
    expect(nodeOf(session, card, "explainer|ci-gate").state).toBe("done");
    await session.open(nodeOf(session, card, "explainer|ci-gate"), redraw);
    adapter.files["engram-quest/explainer/state.json"] = json({ "ci-gate": { viewed: true } });
    adapter.reads.length = 0;
    adapter.lists.length = 0;
    await opened[0][2]();
    expect(nodeOf(session, card, "explainer|ci-gate").state).toBe("seen");
    expect(adapter.reads).toEqual(["engram-quest/explainer/state.json"]);
    expect(adapter.lists).toEqual([]);
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it("drops a Deep Dive page that was deleted from its viewer", async () => {
    const { session, adapter, opened } = makeSession();
    await session.load();
    const card = makeCard();
    await session.open(nodeOf(session, card, "explainer|ci-gate"));
    delete adapter.files["engram-quest/explainer/meta/ci-gate.json"];
    await opened[0][2]();
    expect(nodeOf(session, card, "explainer|ci-gate")).toBeUndefined();
  });

  it("opens a lesson with its course as it is now, and afterwards re-reads only that course", async () => {
    const { session, adapter, opened } = makeSession();
    await session.load();
    const card = makeCard({ relations: [{ type: "lesson", ref: "cicd/lsn-1", score: 9, reason: "同一個設定" }] });
    await session.open(nodeOf(session, card, "lesson|cicd/lsn-1"));
    const [kind, lesson] = opened[0];
    expect(kind).toBe("lesson");
    expect(lesson).toMatchObject({ slug: "cicd", lesson: { id: "lsn-1", file: "lsn-1.html" } });
    expect(lesson.meta.title).toBe("CI/CD");

    adapter.files["engram-quest/lessons/cicd/meta.json"] = json({
      title: "CI/CD", lessons: [{ id: "lsn-1", title: "第 1 課", file: "lsn-1.html" }], completion: { "lsn-1": { viewed: true } },
    });
    adapter.reads.length = 0;
    await lesson.onClose();
    expect(nodeOf(session, card, "lesson|cicd/lsn-1").state).toBe("seen");
    expect(adapter.reads).toEqual(["engram-quest/lessons/cicd/meta.json"]);
  });

  it("says so instead of opening when the lesson or the video is not there", async () => {
    const { session, adapter, opened } = makeSession();
    await session.load();
    const card = makeCard({ relations: [{ type: "lesson", ref: "cicd/lsn-1", score: 9, reason: "r" }] });
    const lesson = nodeOf(session, card, "lesson|cicd/lsn-1");
    const video = nodeOf(session, card, "video|azure-ai-2026/az-l04");
    adapter.files["engram-quest/lessons/cicd/meta.json"] = json({ title: "CI/CD", lessons: [], completion: {} });
    delete adapter.files["engram-quest/videos/azure-ai-2026/az-l04.mp4"];
    expect(await session.open(lesson)).toBe(false);
    expect(await session.open(video)).toBe(false);
    expect(opened).toEqual([["missing"], ["missing"]]);
  });

  it("plays a video from where the user stopped, and opens a note by its path", async () => {
    const { session, opened } = makeSession();
    await session.load();
    const card = makeCard();
    await session.open(nodeOf(session, card, "video|azure-ai-2026/az-l04"));
    await session.open(nodeOf(session, card, `note|${SOURCE}`));
    expect(opened).toEqual([
      ["video", { path: "engram-quest/videos/azure-ai-2026/az-l04.mp4", at: 42 }],
      ["note", SOURCE],
    ]);
  });

  it("ignores a second tap while the first is still opening", async () => {
    const { session, opened } = makeSession();
    await session.load();
    const card = makeCard({ relations: [{ type: "lesson", ref: "cicd/lsn-1", score: 9, reason: "r" }] });
    const node = nodeOf(session, card, "lesson|cicd/lsn-1");
    const results = await Promise.all([session.open(node), session.open(node)]);
    expect(results).toEqual([true, false]);
    expect(opened.filter(([kind]) => kind === "lesson")).toHaveLength(1);
    expect(await session.open(node)).toBe(true);
  });

  it("does not open the video a card came with until the answer is shown", async () => {
    const { session, opened } = makeSession();
    await session.load();
    const card = makeCard();
    const find = (revealed) => session.graph(card, revealed).branches.find((n) => n.id === "video|azure-ai-2026/az-l04");
    expect(find(false).locked).toBe(true);
    expect(await session.open(find(false))).toBe(false);
    expect(opened).toEqual([]);
    expect(await session.open(find(true))).toBe(true);
    expect(opened.map(([kind]) => kind)).toEqual(["video"]);
  });

  it("does nothing for a node that has no page of its own", async () => {
    const { session, opened } = makeSession();
    await session.load();
    expect(await session.open({ id: "topic|t1", type: "topic", ref: "t1", entry: {} })).toBe(false);
    expect(await session.open({ id: "card|x", type: "card", ref: "x" })).toBe(false);
    expect(opened).toEqual([]);
  });
});
