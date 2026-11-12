// Tests for src/review/synapse-graph.js: the relation graph the ⚡ panel draws.
// Fixtures follow the shape of the files a real vault holds (lesson and video meta.json, Deep Dive
// meta and state, recall topic.json, engram-review/synapse entries).

import { describe, it, expect } from "vitest";
import { buildContentIndex, buildSynapseGraph, isLearned, leaksAnswer, MAX_NODES } from "../src/review/synapse-graph.js";
import { attachSynapseToCards } from "../src/review/synapse.js";
import { normalizeMeta } from "../src/lessons/data.js";
import { normalizeTopic } from "../src/videos/data.js";

const DECK = "engram-review/ai-cards/video-azure-ai-2026-az-l04-eval.md";
const SOURCE_NOTE = "1.領域/11.ai-coding/知識/LLM測試維度地圖/01-觀念-核心概念與五個測試維度.md";
const LINKED_NOTE = "1.領域/11.ai-coding/知識/LLM測試維度地圖/02-操作-從0到1建立LLM測試.md";
const OTHER_NOTE = "1.領域/11.ai-coding/紀錄/LLM測試/微軟CoreAI Marco Casalaina 訪談2026.md";
const FRONT = "CI gate 擋下不合格的評測結果，靠的是哪個設定？";
const BACK = "失敗門檻";

function rawContent() {
  return {
    courses: [{
      slug: "cicd-azure-essentials",
      meta: normalizeMeta({
        title: "CI/CD 與 Azure 基礎",
        lessons: [
          { id: "lsn-1752400000000", title: "CI/CD 在自動化什麼 + 測試金字塔", file: "lsn-1752400000000-cicd-and-test-pyramid.html", source: "skill" },
          { id: "lsn-1752400000002", title: "把評測接進 CI gate", file: "lsn-1752400000002-ci-gate.html", source: "skill" },
          { id: "lsn-1752400000009", title: "還沒做的課", file: null, source: "skill" },
        ],
        completion: {
          "lsn-1752400000000": { viewed: true, completed: true, starred: false, lastViewed: "2026-07-13T03:15:07.885Z" },
          "lsn-1752400000002": { viewed: false, completed: false, starred: false },
        },
      }),
    }],
    series: [
      {
        slug: "azure-ai-2026",
        meta: normalizeTopic({
          title: "Azure AI 2026", status: "ready", sources: [],
          videos: [
            { id: "az-l01-foundry", title: "第 1 課 Foundry 全貌", file: "az-l01-foundry.mp4", cards: "engram-review/ai-cards/video-azure-ai-2026-az-l01-foundry.md" },
            { id: "az-l04-eval", title: "第 4 課 評測流程", file: "az-l04-eval.mp4", cards: DECK },
            { id: "az-l09-draft", title: "還沒算好的片" },
          ],
        }),
      },
      {
        slug: "episodic-recall",
        meta: normalizeTopic({
          title: "Episodic Recall", status: "ready", kind: "episodic",
          videos: [{ id: "ep-oct", title: "十月回顧", file: "ep-oct.mp4", period: "2026-10" }],
          progress: { "ep-oct": { position: 34, completed: false, lastViewed: "2026-11-11T08:10:00.869Z" } },
        }),
      },
    ],
    explainers: [
      { id: "ci-gate-value-1785501573", title: "詳解：CI gate 到底擋了什麼", sourceCard: { note: DECK, front: FRONT }, deck: "videos/azure-ai-2026" },
      { id: "foundry-eval-selfhost-1794494410", title: "詳解：自架評測怎麼接", sourceCard: { note: "engram-review/ai-cards/other.md", front: "別張卡" } },
    ],
    explainerState: { "ci-gate-value-1785501573": { viewed: true, lastViewed: "2026-07-31", starred: true } },
    recallTopics: [{
      id: "t13-llm-testing", title: "LLM 應用怎麼測", question: "…", answer: "…",
      notes: ["1.領域/11.ai-coding/知識/LLM測試維度地圖/LLM測試維度-memory.canvas", SOURCE_NOTE, OTHER_NOTE, "實驗 7～10 紀錄"],
      cards: [{ kind: "contrast", q: "q1", a: "a1" }, { kind: "why", q: "q2", a: "a2" }],
    }],
    topicSr: { "t13-llm-testing": [9.2, 12] },
  };
}

const NOTES = new Set([SOURCE_NOTE, LINKED_NOTE, OTHER_NOTE]);
const noteExists = (p) => NOTES.has(p);

function makeCard(entry = {}, extra = {}) {
  const card = { front: FRONT, back: BACK, notePath: DECK, ...extra };
  attachSynapseToCards([card], new Map([[card.notePath, { cards: { [card.front]: entry } }]]));
  return card;
}

function graphOf(card, opts = {}) {
  return buildSynapseGraph({ card, sourcePaths: [SOURCE_NOTE], index: buildContentIndex(rawContent()), noteExists, ...opts });
}

const flat = (graph) => graph.branches.flatMap((b) => [b, ...b.children]);
const ids = (graph) => flat(graph).map((n) => n.id);

describe("buildContentIndex", () => {
  const index = buildContentIndex(rawContent());

  it("keys lessons by <course slug>/<lessonId> with their reading state, leaving out planned lessons", () => {
    expect([...index.lessons.keys()]).toEqual(["cicd-azure-essentials/lsn-1752400000000", "cicd-azure-essentials/lsn-1752400000002"]);
    expect(index.lessons.get("cicd-azure-essentials/lsn-1752400000000")).toMatchObject({ title: "CI/CD 在自動化什麼 + 測試金字塔", sub: "CI/CD 與 Azure 基礎", state: "done" });
    expect(index.lessons.get("cicd-azure-essentials/lsn-1752400000002").state).toBe("unseen");
    expect(index.lessonByPath.get("engram-quest/lessons/cicd-azure-essentials/lsn-1752400000002-ci-gate.html")).toBe("cicd-azure-essentials/lsn-1752400000002");
  });

  it("treats a video with no recorded progress as not seen, and any progress as seen", () => {
    expect(index.videos.get("azure-ai-2026/az-l04-eval")).toMatchObject({ state: "unseen", path: "engram-quest/videos/azure-ai-2026/az-l04-eval.mp4" });
    expect(index.videos.get("episodic-recall/ep-oct")).toMatchObject({ state: "seen", position: 34 });
    expect(index.videos.has("azure-ai-2026/az-l09-draft")).toBe(false);
    expect(index.videoByCards.get(DECK)).toBe("azure-ai-2026/az-l04-eval");
  });

  it("reads Deep Dive state from state.json and indexes pages by the card they explain", () => {
    expect(index.explainers.get("ci-gate-value-1785501573").state).toBe("seen");
    expect(index.explainers.get("foundry-eval-selfhost-1794494410").state).toBe("unseen");
    expect(index.explainersByCard.get(`${DECK}\n${FRONT}`)).toEqual(["ci-gate-value-1785501573"]);
  });

  it("gives a recall topic the state of its cards and keeps only its note paths", () => {
    expect(index.topics.get("t13-llm-testing")).toMatchObject({ state: "mastered", notes: [SOURCE_NOTE, OTHER_NOTE] });
    expect(index.topicsByNote.get(OTHER_NOTE)).toEqual(["t13-llm-testing"]);
    const learning = buildContentIndex({ ...rawContent(), topicSr: { "t13-llm-testing": [9.2] } });
    expect(learning.topics.get("t13-llm-testing").state).toBe("learning");
    const unseen = buildContentIndex({ ...rawContent(), topicSr: {} });
    expect(unseen.topics.get("t13-llm-testing").state).toBe("unseen");
  });

  it("is empty, not an error, when nothing exists", () => {
    const empty = buildContentIndex();
    expect(empty.lessons.size + empty.videos.size + empty.explainers.size + empty.topics.size).toBe(0);
  });
});

describe("buildSynapseGraph: entries written before relations existed", () => {
  const card = makeCard({
    anchors: [
      { front: "測試金字塔的三層", back: "單元、整合、端對端", notePath: "Study/CI.md", stability: 20.1, score: 10, reason: "同屬 CI gate 的判斷" },
      { front: "Golden Master 是什麼", back: "", notePath: "Study/CI.md", stability: 8.9, score: 9, reason: "都在講回歸" },
    ],
    userRejected: [],
  });

  it("draws the mastered cards and the explicit links, with no index at all", () => {
    const graph = buildSynapseGraph({ card, sourcePaths: [SOURCE_NOTE], noteExists, revealed: true });
    expect(graph.branches.map((n) => n.type)).toEqual(["note", "card", "card"]);
    expect(graph.branches[0]).toMatchObject({ rel: "source-note", title: "01-觀念-核心概念與五個測試維度", state: null, inferred: false });
    expect(graph.branches[1]).toMatchObject({ title: "測試金字塔的三層", state: "mastered", reason: "同屬 CI gate 的判斷", inferred: true });
    expect(graph.branches[1].anchor.back).toBe("單元、整合、端對端");
    expect(graph.more).toBe(0);
  });

  it("returns an empty graph for a card with no entry and no source", () => {
    const bare = { front: "Q", back: "A", notePath: "x.md" };
    attachSynapseToCards([bare], new Map());
    expect(buildSynapseGraph({ card: bare, revealed: true })).toEqual({ branches: [], count: 0, more: 0 });
    expect(buildSynapseGraph({ card: null })).toEqual({ branches: [], count: 0, more: 0 });
  });
});

describe("buildSynapseGraph: mixed content", () => {
  const entry = {
    anchors: [{ front: "測試金字塔的三層", notePath: "Study/CI.md", stability: 20.1, score: 10, reason: "同屬 CI gate 的判斷" }],
    relations: [
      { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "同一道 CI gate 的設定步驟" },
      { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000002", score: 9, reason: "第 3 課講同一個設定" },
      { type: "video", ref: "episodic-recall/ep-oct", score: 7, reason: "回顧片重提這個流程" },
      { type: "explainer", ref: "foundry-eval-selfhost-1794494410", score: 7, reason: "詳解同一個接法" },
      { type: "note", ref: OTHER_NOTE, score: 7, reason: "訪談提到同一個做法" },
      { type: "topic", ref: "t13-llm-testing", score: 8, reason: "這個主題的核心之一" },
    ],
    userRejected: [],
  };

  it("connects cards, notes, Deep Dive pages, lessons, videos and recall topics, every edge with text", () => {
    const graph = graphOf(makeCard(entry), { revealed: true });
    expect(new Set(flat(graph).map((n) => n.type))).toEqual(new Set(["note", "explainer", "video", "card", "lesson", "topic"]));
    for (const node of flat(graph)) expect(node.reason || node.rel, node.id).toBeTruthy();
    expect(graph.branches.find((n) => n.id === "explainer|ci-gate-value-1785501573")).toMatchObject({ rel: "explainer", state: "seen" });
    expect(graph.branches.find((n) => n.id === "video|azure-ai-2026/az-l04-eval")).toMatchObject({ rel: "video-cards", state: "unseen" });
  });

  it("puts explicit links first, then the skill's links by score", () => {
    const graph = graphOf(makeCard(entry), { revealed: true });
    expect(graph.branches.map((n) => n.id)).toEqual([
      `note|${SOURCE_NOTE}`,
      "explainer|ci-gate-value-1785501573",
      "video|azure-ai-2026/az-l04-eval",
      "card|Study/CI.md|測試金字塔的三層",
      "lesson|cicd-azure-essentials/lsn-1752400000002",
      "lesson|cicd-azure-essentials/lsn-1752400000000",
      "topic|t13-llm-testing",
      "video|episodic-recall/ep-oct",
      `note|${OTHER_NOTE}`,
      "explainer|foundry-eval-selfhost-1794494410",
    ]);
  });

  it("at the same score, what the user already learned comes first", () => {
    const order = graphOf(makeCard(entry), { revealed: true }).branches.filter((n) => n.inferred && n.score === 7).map((n) => [n.type, isLearned(n)]);
    expect(order).toEqual([["video", true], ["note", true], ["explainer", false]]);
  });

  it("before the answer shows only what the user has learned; the rest waits for the reveal", () => {
    const before = graphOf(makeCard(entry), { revealed: false });
    expect(flat(before).every(isLearned)).toBe(true);
    expect(ids(before)).not.toContain("video|azure-ai-2026/az-l04-eval");
    expect(ids(before)).not.toContain("lesson|cicd-azure-essentials/lsn-1752400000002");
    expect(ids(before)).not.toContain("explainer|foundry-eval-selfhost-1794494410");
    expect(ids(before)).toContain("lesson|cicd-azure-essentials/lsn-1752400000000");
    expect(ids(before)).toContain("topic|t13-llm-testing");

    const after = graphOf(makeCard(entry), { revealed: true });
    expect(ids(after)).toEqual(expect.arrayContaining(ids(before)));
    expect(before.more).toBe(after.count - before.count);
    expect(before.more).toBe(4);
    expect(after.more).toBe(0);
  });

  it("holds back a link whose text spells out the answer until the answer is shown", () => {
    const leaky = makeCard({
      anchors: [{ front: "失敗門檻設多少才合理？", notePath: "Study/CI.md", stability: 20, score: 9, reason: "同一個設定" }],
      relations: [{ type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "兩者都靠「失敗 門檻」擋下結果" }],
    });
    const before = graphOf(leaky, { revealed: false });
    expect(ids(before)).toEqual([`note|${SOURCE_NOTE}`, "topic|t13-llm-testing"]);
    expect(before.more).toBe(4);
    const texts = flat(before).flatMap((n) => [n.title, n.sub, n.reason]).join(" ");
    expect(leaksAnswer(texts, BACK)).toBe(false);
    expect(ids(graphOf(leaky, { revealed: true }))).toContain("card|Study/CI.md|失敗門檻設多少才合理？");
  });

  it("skips refs that no longer lead to content", () => {
    const stale = makeCard({
      relations: [
        { type: "lesson", ref: "cicd-azure-essentials/lsn-gone", score: 9, reason: "x" },
        { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000009", score: 9, reason: "planned, no file" },
        { type: "video", ref: "azure-ai-2026/az-l09-draft", score: 9, reason: "never rendered" },
        { type: "explainer", ref: "deleted-page", score: 9, reason: "x" },
        { type: "note", ref: "Gone/Deleted.md", score: 9, reason: "x" },
        { type: "topic", ref: "t99", score: 9, reason: "x" },
        { type: "quest", ref: "anything", score: 9, reason: "unknown type" },
        { type: "lesson", score: 9 },
        null,
      ],
    });
    const graph = buildSynapseGraph({ card: stale, sourcePaths: ["Gone/Source.md"], index: buildContentIndex(rawContent()), noteExists, revealed: true });
    expect(ids(graph)).toEqual(["explainer|ci-gate-value-1785501573", "video|azure-ai-2026/az-l04-eval"]);
  });
});

describe("buildSynapseGraph: where the card came from", () => {
  it("reads a lesson file or a recall topic file in the hints as that lesson or topic, not as a note", () => {
    const card = makeCard({});
    const graph = buildSynapseGraph({
      card, index: buildContentIndex(rawContent()), noteExists, revealed: true,
      sourcePaths: [
        "engram-quest/lessons/cicd-azure-essentials/lsn-1752400000002-ci-gate.html",
        "engram-quest/episodic-review/topics/t13-llm-testing/topic.json",
        "engram-review/ai-cards/AI_Framework_Demo.md",
        "engram-quest/lessons/cicd-azure-essentials/meta.json",
      ],
    });
    expect(graph.branches.map((n) => [n.id, n.rel])).toEqual([
      ["topic|t13-llm-testing", "from-topic"],
      ["explainer|ci-gate-value-1785501573", "explainer"],
      ["lesson|cicd-azure-essentials/lsn-1752400000002", "from-lesson"],
      ["video|azure-ai-2026/az-l04-eval", "video-cards"],
    ]);
  });

  it("walks one more step along a note's own links, the topics citing it, and a topic's notes", () => {
    const card = makeCard({ relations: [{ type: "topic", ref: "t13-llm-testing", score: 8, reason: "同一個主題" }] });
    const graph = graphOf(card, {
      revealed: true,
      resolvedLinks: { [SOURCE_NOTE]: { [LINKED_NOTE]: 2, "assets/diagram.png": 1, "Gone/Deleted.md": 1 }, [LINKED_NOTE]: { [OTHER_NOTE]: 1 } },
    });
    const source = graph.branches.find((n) => n.id === `note|${SOURCE_NOTE}`);
    expect(source.children.map((n) => [n.id, n.rel, n.depth])).toEqual([[`note|${LINKED_NOTE}`, "note-link", 2]]);
    // The topic is already next to the centre, so it is not repeated under the note that it cites.
    const topic = graph.branches.find((n) => n.id === "topic|t13-llm-testing");
    expect(topic.children.map((n) => [n.id, n.rel])).toEqual([[`note|${OTHER_NOTE}`, "topic-note"]]);
    expect(flat(graph).every((n) => n.depth <= 2)).toBe(true);
    expect(new Set(ids(graph)).size).toBe(ids(graph).length);
  });

  it("hangs a recall topic under the source note it cites", () => {
    const graph = graphOf(makeCard({}), { revealed: true });
    const source = graph.branches.find((n) => n.id === `note|${SOURCE_NOTE}`);
    expect(source.children.map((n) => [n.id, n.rel])).toEqual([["topic|t13-llm-testing", "topic-cites"]]);
  });

  it("before the answer, drops what hangs under a hidden node", () => {
    const card = makeCard({ relations: [{ type: "topic", ref: "t13-llm-testing", score: 8, reason: "同一個主題" }] });
    const index = buildContentIndex({ ...rawContent(), topicSr: {} });
    const before = buildSynapseGraph({ card, sourcePaths: [], index, noteExists, revealed: false });
    expect(ids(before)).toEqual([]);
    const after = buildSynapseGraph({ card, sourcePaths: [], index, noteExists, revealed: true });
    expect(ids(after)).toContain(`note|${OTHER_NOTE}`);
  });

  it("never lists the card as its own link, and keeps one node per target", () => {
    const card = makeCard({
      anchors: [{ front: FRONT, notePath: DECK, stability: 30, score: 10, reason: "self" }],
      relations: [
        { type: "note", ref: SOURCE_NOTE, score: 9, reason: "也是來源" },
        { type: "explainer", ref: "ci-gate-value-1785501573", score: 9, reason: "同一頁" },
      ],
    });
    const graph = graphOf(card, { revealed: true });
    expect(ids(graph).filter((id) => id.startsWith("card|"))).toEqual([]);
    expect(graph.branches.find((n) => n.id === `note|${SOURCE_NOTE}`).rel).toBe("source-note");
    expect(ids(graph).filter((id) => id === "explainer|ci-gate-value-1785501573")).toHaveLength(1);
  });
});

describe("buildSynapseGraph: size limit", () => {
  const anchors = [10, 9, 9, 8, 7].map((score, i) => ({ front: `熟卡 ${i}`, notePath: "Study/CI.md", stability: 10 + i, score, reason: `理由 ${i}` }));
  const relations = [
    { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "a" },
    { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000002", score: 7, reason: "b" },
    { type: "explainer", ref: "foundry-eval-selfhost-1794494410", score: 7, reason: "c" },
    { type: "video", ref: "episodic-recall/ep-oct", score: 7, reason: "d" },
    { type: "topic", ref: "t13-llm-testing", score: 7, reason: "e" },
  ];
  const links = { [SOURCE_NOTE]: { [LINKED_NOTE]: 1, [OTHER_NOTE]: 1 } };

  it(`keeps at most ${MAX_NODES} nodes counting the centre card`, () => {
    const graph = graphOf(makeCard({ anchors, relations }), { revealed: true, resolvedLinks: links });
    expect(graph.count).toBe(MAX_NODES - 1);
    expect(flat(graph)).toHaveLength(MAX_NODES - 1);
  });

  it("drops the far and the weak first: second-step nodes, then the lowest scores, unseen before learned", () => {
    const kept = ids(graphOf(makeCard({ anchors, relations }), { revealed: true, resolvedLinks: links }));
    expect(kept.slice(0, 3)).toEqual([`note|${SOURCE_NOTE}`, "explainer|ci-gate-value-1785501573", "video|azure-ai-2026/az-l04-eval"]);
    expect(kept).not.toContain(`note|${LINKED_NOTE}`);
    expect(kept).toContain("lesson|cicd-azure-essentials/lsn-1752400000000");
    // Five links scored 7 compete for the last three places; the three the user has learned win.
    expect(kept.slice(-3)).toEqual(["card|Study/CI.md|熟卡 4", "video|episodic-recall/ep-oct", "topic|t13-llm-testing"]);
    expect(kept).not.toContain("lesson|cicd-azure-essentials/lsn-1752400000002");
    expect(kept).not.toContain("explainer|foundry-eval-selfhost-1794494410");
  });

  it("honours a smaller limit, starting from what was shown before the answer", () => {
    const small = makeCard({ anchors: anchors.slice(0, 1) });
    const before = graphOf(small, { revealed: false, resolvedLinks: links, max: 4 });
    expect(ids(before)).toEqual([`note|${SOURCE_NOTE}`, "topic|t13-llm-testing", "card|Study/CI.md|熟卡 0"]);
    expect(ids(graphOf(small, { revealed: true, resolvedLinks: links, max: 4 }))).toEqual(ids(before));
    // With room for one more, the next link by rank joins them.
    expect(ids(graphOf(small, { revealed: true, resolvedLinks: links, max: 5 }))).toEqual(
      [`note|${SOURCE_NOTE}`, "topic|t13-llm-testing", "explainer|ci-gate-value-1785501573", "card|Study/CI.md|熟卡 0"]);
  });
});

describe("userRejected", () => {
  const entry = {
    anchors: [
      { front: "keep", notePath: "b.md", stability: 9, score: 9, reason: "r" },
      { front: "drop", notePath: "c.md", stability: 9, score: 9, reason: "r" },
    ],
    relations: [
      { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "keep" },
      { type: "video", ref: "episodic-recall/ep-oct", score: 8, reason: "drop" },
    ],
    userRejected: ["c.md|drop", "video|episodic-recall/ep-oct", `note|${SOURCE_NOTE}`, "explainer|ci-gate-value-1785501573"],
  };

  it("hides rejected anchors and relations when the entry is attached", () => {
    const card = makeCard(entry);
    expect(card.synapseAnchors.map((a) => a.front)).toEqual(["keep"]);
    expect(card.synapseRelations.map((r) => r.ref)).toEqual(["cicd-azure-essentials/lsn-1752400000000"]);
  });

  it("hides a rejected explicit link too, by the same <type>|<ref> key", () => {
    const graph = graphOf(makeCard(entry), { revealed: true });
    expect(ids(graph)).toEqual(["video|azure-ai-2026/az-l04-eval", "card|b.md|keep", "lesson|cicd-azure-essentials/lsn-1752400000000"]);
  });
});

describe("buildSynapseGraph: nothing gives the answer away before it is shown", () => {
  it("does not let a mastered card be opened when its own answer contains this card's answer", () => {
    const card = makeCard({
      anchors: [
        { front: "合併前 CI 要檢查什麼？", back: "在 CI 設定失敗門檻來擋下合併", notePath: "Study/CI.md", stability: 20, score: 9, reason: "同一道 gate" },
        { front: "測試金字塔的三層", back: "單元、整合、端對端", notePath: "Study/CI.md", stability: 20, score: 8, reason: "同屬 CI 的判斷" },
      ],
    });
    const before = graphOf(card, { revealed: false }).branches.filter((n) => n.type === "card");
    expect(before.map((n) => [n.title, n.locked])).toEqual([["合併前 CI 要檢查什麼？", true], ["測試金字塔的三層", false]]);
    const after = graphOf(card, { revealed: true }).branches.filter((n) => n.type === "card");
    expect(after.map((n) => n.locked)).toEqual([false, false]);
    expect(after[0].back).toBe("在 CI 設定失敗門檻來擋下合併");
  });

  it("checks the answer the session would look up when the anchor stores none", () => {
    const card = makeCard({ anchors: [{ front: "合併前 CI 要檢查什麼？", back: "", notePath: "Study/CI.md", stability: 20, score: 9, reason: "同一道 gate" }] });
    const anchorBack = () => "先看失敗門檻有沒有過";
    const [node] = graphOf(card, { revealed: false, anchorBack }).branches.filter((n) => n.type === "card");
    expect(node).toMatchObject({ locked: true, back: "先看失敗門檻有沒有過" });
  });

  it("shows the video or lesson the card was made from as a cue, but does not let it be opened yet", () => {
    // The review screen itself only offers "rewatch" once the answer is shown.
    const raw = rawContent();
    raw.series[0].meta.progress = { "az-l04-eval": { position: 0, completed: true } };
    raw.courses[0].meta.completion["lsn-1752400000002"] = { viewed: true };
    const index = buildContentIndex(raw);
    const card = makeCard({ relations: [{ type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "同一道 gate" }] });
    const sourcePaths = ["engram-quest/lessons/cicd-azure-essentials/lsn-1752400000002-ci-gate.html"];
    const lockedOf = (graph) => Object.fromEntries(flat(graph).map((n) => [n.id, n.locked]));

    expect(lockedOf(buildSynapseGraph({ card, sourcePaths, index, noteExists, revealed: false }))).toEqual({
      "lesson|cicd-azure-essentials/lsn-1752400000002": true,  // the lesson the card came from
      "video|azure-ai-2026/az-l04-eval": true,                 // the video the card came with
      "lesson|cicd-azure-essentials/lsn-1752400000000": false, // a lesson the skill related: opens as before
    });
    const after = lockedOf(buildSynapseGraph({ card, sourcePaths, index, noteExists, revealed: true }));
    expect(Object.values(after).every((locked) => locked === false)).toBe(true);
    expect(Object.keys(after)).toEqual(expect.arrayContaining(["lesson|cicd-azure-essentials/lsn-1752400000002", "video|azure-ai-2026/az-l04-eval"]));
  });

  it("does not treat the name of the card's own source note, which the review screen shows, as part of the answer", () => {
    const anchor = { front: "LLM測試維度有哪幾個？", notePath: "Study/CI.md", stability: 20, score: 9, reason: "同一份筆記的觀念" };
    const card = makeCard({ anchors: [anchor] }, { back: "看 LLM測試維度 裡的穩定性那一組" });
    const named = buildSynapseGraph({ card, sourcePaths: ["Notes/LLM測試維度.md"], noteExists: () => true, revealed: false });
    expect(ids(named)).toContain("card|Study/CI.md|LLM測試維度有哪幾個？");
    const unnamed = buildSynapseGraph({ card, sourcePaths: ["Notes/別的筆記.md"], noteExists: () => true, revealed: false });
    expect(ids(unnamed)).not.toContain("card|Study/CI.md|LLM測試維度有哪幾個？");
  });

  it("still hides the source video when its title would give the answer away", () => {
    const raw = rawContent();
    raw.series[0].meta.videos[1].title = "第 4 課 失敗門檻怎麼設";
    raw.series[0].meta.progress = { "az-l04-eval": { completed: true } };
    const before = buildSynapseGraph({ card: makeCard({}), index: buildContentIndex(raw), noteExists, revealed: false });
    expect(ids(before)).not.toContain("video|azure-ai-2026/az-l04-eval");
  });

  it("holds back any Deep Dive page made from this card's file, however the card is now worded", () => {
    // The page was written for this card before its front was edited, so the exact match is gone;
    // the skill may then list the page as a relation.
    const raw = rawContent();
    raw.explainers[0].sourceCard.front = "CI gate 的舊問法";
    raw.explainers.push({ id: "sibling-page", title: "詳解：同一份牌組的另一張卡", sourceCard: { note: DECK, front: "另一張卡" } });
    raw.explainerState["sibling-page"] = { viewed: true };
    const index = buildContentIndex(raw);
    const card = makeCard({
      relations: [
        { type: "explainer", ref: "ci-gate-value-1785501573", score: 9, reason: "講同一個設定" },
        { type: "explainer", ref: "sibling-page", score: 8, reason: "同一份牌組" },
        { type: "explainer", ref: "foundry-eval-selfhost-1794494410", score: 7, reason: "別的牌組的詳解" },
      ],
    });
    raw.explainerState["foundry-eval-selfhost-1794494410"] = { viewed: true };
    const before = buildSynapseGraph({ card, index: buildContentIndex(raw), noteExists, revealed: false });
    expect(ids(before)).toEqual(["explainer|foundry-eval-selfhost-1794494410"]);
    const after = buildSynapseGraph({ card, index, noteExists, revealed: true });
    expect(ids(after)).toEqual(expect.arrayContaining(["explainer|ci-gate-value-1785501573", "explainer|sibling-page"]));
  });

  it("keeps a Deep Dive page written for this very card until the answer is shown, even when read", () => {
    const card = makeCard({});
    expect(ids(graphOf(card, { revealed: false }))).not.toContain("explainer|ci-gate-value-1785501573");
    expect(ids(graphOf(card, { revealed: true }))).toContain("explainer|ci-gate-value-1785501573");
  });

  it("keeps notes that are only linked from another node until the answer is shown", () => {
    const card = makeCard({ relations: [{ type: "topic", ref: "t13-llm-testing", score: 8, reason: "同一個主題" }] });
    const links = { [SOURCE_NOTE]: { [LINKED_NOTE]: 1 } };
    const before = graphOf(card, { revealed: false, resolvedLinks: links });
    expect(ids(before)).toEqual([`note|${SOURCE_NOTE}`, "topic|t13-llm-testing"]);
    const after = graphOf(card, { revealed: true, resolvedLinks: links });
    expect(ids(after)).toEqual(expect.arrayContaining([`note|${LINKED_NOTE}`, `note|${OTHER_NOTE}`]));
    expect(flat(after).filter((n) => n.type === "note" && n.depth === 2).map(isLearned)).toEqual([false, false]);
  });
});

describe("buildSynapseGraph: what was on the map before the answer stays on it after", () => {
  const lessons = Array.from({ length: 12 }, (_, i) => ({ id: `lsn-${i}`, title: `第 ${i + 1} 課`, file: `lsn-${i}.html`, source: "skill" }));
  const index = buildContentIndex({ courses: [{ slug: "big", meta: normalizeMeta({ title: "大課", lessons, completion: {} }) }] });
  const card = makeCard({
    anchors: [{ front: "熟卡", notePath: "Study/CI.md", stability: 20, score: 7, reason: "同一件事" }],
    relations: lessons.map((l) => ({ type: "lesson", ref: `big/${l.id}`, score: 9, reason: "還沒上過的課" })),
  });

  it("keeps a recall cue that newer, higher-scored links would otherwise push out", () => {
    const before = buildSynapseGraph({ card, sourcePaths: [SOURCE_NOTE], index, noteExists, revealed: false });
    const after = buildSynapseGraph({ card, sourcePaths: [SOURCE_NOTE], index, noteExists, revealed: true });
    expect(ids(before)).toEqual([`note|${SOURCE_NOTE}`, "card|Study/CI.md|熟卡"]);
    expect(ids(after)).toEqual(expect.arrayContaining(ids(before)));
    expect(after.count).toBe(MAX_NODES - 1);
    expect(before.more).toBe(after.count - before.count);
  });

  it("still lists the revealed map in rank order", () => {
    const after = buildSynapseGraph({ card, sourcePaths: [SOURCE_NOTE], index, noteExists, revealed: true });
    expect(after.branches.map((n) => n.id)).toEqual([
      `note|${SOURCE_NOTE}`, ...lessons.slice(0, 9).map((l) => `lesson|big/${l.id}`), "card|Study/CI.md|熟卡",
    ]);
  });
});

describe("buildSynapseGraph: malformed entries", () => {
  it("skips a relation whose type is not one it knows, including names every object has", () => {
    const card = makeCard({
      relations: [
        { type: "constructor", ref: "x", score: 9, reason: "r" },
        { type: "__proto__", ref: "x", score: 9, reason: "r" },
        { type: "toString", ref: "x", score: 9, reason: "r" },
        { type: "hasOwnProperty", ref: "get", score: 9, reason: "r" },
        { type: "lesson", ref: "cicd-azure-essentials/lsn-1752400000000", score: 8, reason: "ok" },
      ],
    });
    const graph = buildSynapseGraph({ card, index: buildContentIndex(rawContent()), noteExists, revealed: true });
    expect(ids(graph)).toEqual(["explainer|ci-gate-value-1785501573", "video|azure-ai-2026/az-l04-eval", "lesson|cicd-azure-essentials/lsn-1752400000000"]);
  });
});

describe("content states follow the user's real progress", () => {
  it("tells finished from merely opened, for lessons, videos and Deep Dive pages", () => {
    const raw = rawContent();
    raw.courses[0].meta.completion["lsn-1752400000002"] = { viewed: true, completed: false };
    raw.series[0].meta.progress = { "az-l04-eval": { position: 0, completed: true }, "az-l01-foundry": { position: 12, completed: false } };
    raw.explainerState["foundry-eval-selfhost-1794494410"] = { viewed: true, completed: true };
    const index = buildContentIndex(raw);
    expect(index.lessons.get("cicd-azure-essentials/lsn-1752400000000").state).toBe("done");
    expect(index.lessons.get("cicd-azure-essentials/lsn-1752400000002").state).toBe("seen");
    expect(index.videos.get("azure-ai-2026/az-l04-eval").state).toBe("done");
    expect(index.videos.get("azure-ai-2026/az-l01-foundry").state).toBe("seen");
    expect(index.videos.get("episodic-recall/ep-oct").state).toBe("seen");
    expect(index.explainers.get("foundry-eval-selfhost-1794494410").state).toBe("done");
    expect(index.explainers.get("ci-gate-value-1785501573").state).toBe("seen");
    for (const state of ["done", "seen"]) expect(isLearned({ type: "lesson", state })).toBe(true);
    expect(isLearned({ type: "lesson", state: "unseen" })).toBe(false);
  });
});

describe("leaksAnswer: more than a verbatim match", () => {
  it("finds one part of a longer answer", () => {
    expect(leaksAnswer("什麼是失敗門檻？", "失敗門檻（fail threshold）")).toBe(true);
    expect(leaksAnswer("How to set a fail threshold", "失敗門檻（fail threshold）")).toBe(true);
    expect(leaksAnswer("兩者都靠失敗門檻", "指標低於失敗門檻，這次評測就不通過")).toBe(true);
  });

  it("reads through HTML, list markers and markdown", () => {
    expect(leaksAnswer("設定失敗門檻", "失敗門檻<br>低於就不通過")).toBe(true);
    expect(leaksAnswer("整合測試怎麼寫", "1. 單元測試\n2. 整合測試\n3. 端對端測試")).toBe(true);
    expect(leaksAnswer("第 2 課的內容", "1. 單元測試\n2. 整合測試\n3. 端對端測試")).toBe(false);
    expect(leaksAnswer("整合測試怎麼寫", "- **單元測試**\n- ==整合測試==\n- 端對端測試")).toBe(true);
    expect(leaksAnswer("用&nbsp;Redis 當快取", "<b>Redis</b>&nbsp;")).toBe(true);
  });

  it("normalises curly quotes, dashes, ellipses and full-width letters", () => {
    expect(leaksAnswer("都用 redis 當快取", "“Ｒｅｄｉｓ”——快取…")).toBe(true);
    expect(leaksAnswer("ＲＥＤＩＳ 的用法", "‘redis’")).toBe(true);
  });

  it("does not count what the question already says", () => {
    expect(leaksAnswer("失敗門檻是什麼", "失敗門檻設在基準分數的九成", "失敗門檻設多少才合理？")).toBe(false);
    expect(leaksAnswer("設在基準分數的九成左右", "失敗門檻設在基準分數的九成", "失敗門檻設多少才合理？")).toBe(true);
  });

  it("stays quiet about unrelated text and trivial answers", () => {
    expect(leaksAnswer("同屬 CI gate 的判斷", "失敗門檻（fail threshold）：指標低於門檻，這次評測就不通過 gate。", "CI gate 靠哪個設定？")).toBe(false);
    expect(leaksAnswer("It depends on the setup", "end-to-end")).toBe(false);
    expect(leaksAnswer("anything", "<br>")).toBe(false);
  });
});

describe("leaksAnswer", () => {
  it("ignores spacing, case and markdown marks", () => {
    expect(leaksAnswer("靠 **失敗 門檻** 擋下", "失敗門檻")).toBe(true);
    expect(leaksAnswer("Uses a Redis cache", "`redis`")).toBe(true);
    expect(leaksAnswer("同屬 CI gate 的判斷", "失敗門檻")).toBe(false);
  });

  it("does not treat an empty or one-character answer as leaked", () => {
    expect(leaksAnswer("anything", "")).toBe(false);
    expect(leaksAnswer("是否啟用", "是")).toBe(false);
  });
});
