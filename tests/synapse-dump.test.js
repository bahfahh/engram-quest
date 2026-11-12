// Tests for skills/synapse/scripts/dump_sr_pool.js — the one script the synapse skill runs.
// The script is deployed into the user's vault and runs with the vault root as cwd, so each test
// builds a small vault in a temp folder and runs the real script against it.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/synapse/scripts/dump_sr_pool.js");

const DECK = "Study/Deck.md";
const SR_FILE = "engram-review/sr/Study__Deck.json";
const SYNAPSE_FILE = "engram-review/synapse/Study__Deck.json";
const STATUS_FILE = "engram-review/synapse/_status.json";
const SEEN_FILE = "engram-review/synapse/_catalog.json";

let vault;

beforeEach(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), "synapse-dump-"));
});

afterEach(() => {
  fs.rmSync(vault, { recursive: true, force: true });
});

function write(rel, data) {
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(vault, rel), "utf8"));
}

function dumpRaw(...args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], { cwd: vault, encoding: "utf8" });
}

function dump(...args) {
  return JSON.parse(dumpRaw(...args));
}

/** Every file under the vault with its content, to prove a run wrote nothing. */
function snapshot(dir = vault, out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) snapshot(full, out);
    else out[path.relative(vault, full)] = fs.readFileSync(full, "utf8");
  }
  return out;
}

// Ten mastered cards (enough to pass the pool gate) plus the given targets, all in one deck.
function seedSr(targets = ["hard one", "hard two"]) {
  const sr = {};
  for (let i = 1; i <= 10; i++) sr[`mastered ${i}`] = { stability: 10 + i };
  for (const front of targets) sr[front] = { stability: 2 };
  write(SR_FILE, sr);
}

function seedStatus() {
  write(STATUS_FILE, { enabled: true, masteredPoolSize: 10, generatedAt: "2026-11-01T00:00:00Z", skillVersion: "1.0" });
}

function anchor(front) {
  return { front, back: "", notePath: DECK, stability: 11, score: 8, reason: "same topic" };
}

function seedSynapse(cards) {
  write(SYNAPSE_FILE, { _meta: { sourceNotePath: DECK }, cards });
}

function seedContent() {
  write("engram-quest/lessons/cicd/meta.json", {
    title: "CI/CD Basics",
    lessons: [
      { id: "lsn-1", title: "Test pyramid", file: "lsn-1.html" },
      { id: "lsn-2", title: "CI gate", file: "lsn-2.html" },
      { id: "lsn-3", title: "Planned, no page yet", file: null },
    ],
    completion: { "lsn-1": { viewed: true } },
  });
  write("engram-quest/lessons/cicd/lsn-1.html", "<html>lesson body must never be read</html>");
  write("engram-quest/videos/azure/meta.json", {
    title: "Azure AI",
    status: "ready",
    videos: [
      { id: "az-1", title: "Foundry overview", file: "az-1.mp4", cards: "engram-review/ai-cards/video-azure-az-1.md" },
      { id: "az-2", title: "Not rendered yet" },
    ],
  });
  write("engram-quest/videos/episodic-recall/meta.json", {
    title: "Recall films",
    kind: "episodic",
    videos: [{ id: "rewind-oct", title: "Rewind October", file: "rewind-oct.mp4" }],
  });
  write("engram-quest/videos/settings.json", { quality: "basic" });
  write("engram-quest/explainer/meta/ci-gate-1.json", {
    id: "ci-gate-1",
    title: "What a green CI run really checks",
    sourceCard: { note: DECK, front: "hard one" },
  });
  write("engram-quest/explainer/ci-gate-1.html", "<html>explainer body must never be read</html>");
  write("engram-quest/episodic-review/topics/t13-llm-testing/topic.json", {
    id: "t13-llm-testing",
    title: "How to test LLM apps",
    answer: "topic answer must never be output",
    notes: ["Notes/LLM testing.md"],
  });
}

const CATALOG_KEYS = [
  "lesson|cicd/lsn-1",
  "lesson|cicd/lsn-2",
  "video|azure/az-1",
  "explainer|ci-gate-1",
  "topic|t13-llm-testing",
];

const keysOf = (catalog) => catalog.map((c) => `${c.type}|${c.ref}`);

describe("dump_sr_pool: content catalog", () => {
  it("lists every lesson, video, explainer page and recall topic by type, ref and title only", () => {
    seedSr();
    seedContent();
    const out = dump();

    expect(out.mode).toBe("full");
    expect(keysOf(out.catalog)).toEqual(CATALOG_KEYS);
    expect(out.catalog[1]).toEqual({ id: "c2", type: "lesson", ref: "cicd/lsn-2", title: "CI gate", group: "CI/CD Basics" });
    expect(out.catalog[2]).toEqual({ id: "c3", type: "video", ref: "azure/az-1", title: "Foundry overview", group: "Azure AI" });
    expect(out.catalog[3]).toEqual({ id: "c4", type: "explainer", ref: "ci-gate-1", title: "What a green CI run really checks" });
    expect(out.catalog[4]).toEqual({ id: "c5", type: "topic", ref: "t13-llm-testing", title: "How to test LLM apps" });
    expect(out.stats.catalogCount).toBe(5);
    expect(JSON.stringify(out)).not.toMatch(/must never be/);
  });

  it("prints one catalog entry per line", () => {
    seedSr();
    seedContent();
    const lines = dumpRaw().split("\n");

    expect(lines.filter((l) => l.includes('"type":"lesson"'))).toHaveLength(2);
    expect(lines).toContain('    {"id":"c5","type":"topic","ref":"t13-llm-testing","title":"How to test LLM apps"}');
  });

  it("returns an empty catalog, not an error, when the content folders are missing", () => {
    seedSr();
    const out = dump();

    expect(out.mode).toBe("full");
    expect(out.catalog).toEqual([]);
    expect(out.stats.catalogCount).toBe(0);
    expect(out.mastered).toHaveLength(10);
    expect(out.targets.map((t) => t.front)).toEqual(["hard one", "hard two"]);
  });

  it("skips unreadable content files without failing the run", () => {
    seedSr();
    seedContent();
    write("engram-quest/lessons/broken/meta.json", "{not json");
    write("engram-quest/explainer/meta/no-id.json", { title: "page without an id" });
    write("engram-quest/episodic-review/topics/empty-folder/readme.txt", "no topic.json here");

    expect(keysOf(dump().catalog)).toEqual(CATALOG_KEYS);
  });

  it("tells each target which candidates the plugin already links or the user rejected", () => {
    seedSr(["hard one", "hard two", "video card", "topic card"]);
    seedContent();
    // "video card" lives in the cards file attached to the video; "topic card" was made from the recall topic.
    write("engram-review/sr/engram-review__ai-cards__video-azure-az-1.json", { "video card": { stability: 1 } });
    write("engram-review/sr/engram-review__ai-cards__recall-llm.json", { "topic card": { stability: 1 } });
    write("engram-review/hints/recall-llm.json", { note: "engram-quest/episodic-review/topics/t13-llm-testing/topic.json", cards: {} });
    // "hard two" was made from a note the recall topic covers; the file-level note is that
    // note too, but "hard one" declares it has no source note at all.
    write("engram-review/hints/Study__Deck.json", {
      note: "Notes/LLM testing.md",
      cards: { "hard two": { source: ["Notes/LLM testing.md"] }, "hard one": { source: null } },
    });
    seedSynapse({ "hard two": { anchors: [], userRejected: ["lesson|cicd/lsn-2", `${DECK}|mastered 3`] } });

    const byFront = Object.fromEntries(dump().targets.map((t) => [t.front, t]));

    expect(byFront["hard one"].skip).toEqual(["c4"]); // the explainer written for this card
    expect(byFront["video card"].skip).toEqual(["c3"]);
    expect(byFront["topic card"].skip).toEqual(["c5"]);
    expect(byFront["hard two"].skip.sort()).toEqual(["c2", "c5", "m3"]);
    expect(byFront["hard two"].userRejected).toEqual(["lesson|cicd/lsn-2", `${DECK}|mastered 3`]);
    expect(byFront["hard one"].userRejected).toBeUndefined();
  });
});

describe("dump_sr_pool: incremental runs", () => {
  it("keeps working with synapse files written before relations existed", () => {
    seedSr();
    seedStatus();
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], userRejected: [] },
      "hard two": { anchors: [anchor("mastered 2")] },
    });

    expect(dump().mode).toBe("noop");
  });

  it("re-pairs existing targets against the whole catalog the first time a catalog shows up", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], userRejected: [] },
      "hard two": { anchors: [anchor("mastered 2")], userRejected: [] },
    });

    const out = dump();

    expect(out.mode).toBe("incremental");
    expect(out.workQueue.map((t) => [t.front, t.reason])).toEqual([["hard one", "new-content"], ["hard two", "new-content"]]);
    expect(out.catalog.every((c) => c.new === true)).toBe(true);
    expect(out.preservedFronts).toEqual([]);
    expect(out.stats.newCatalog).toBe(5);
    expect(out.stats.newContentTargets).toBe(2);
  });

  it("preserves targets and their relations when nothing new appeared", () => {
    seedSr();
    seedStatus();
    seedContent();
    write(SEEN_FILE, { seen: CATALOG_KEYS });
    seedSynapse({
      "hard one": {
        anchors: [anchor("mastered 1")],
        relations: [{ type: "lesson", ref: "cicd/lsn-2", score: 8, reason: "covers the same gate" }],
        userRejected: [],
      },
      "hard two": { anchors: [anchor("mastered 2")], relations: [], userRejected: [] },
    });

    expect(dump().mode).toBe("noop");
  });

  it("queues already-paired targets as new-content when a lesson was added since the last run", () => {
    seedSr(["hard one", "hard two", "hard three"]);
    seedStatus();
    seedContent();
    write(SEEN_FILE, { seen: CATALOG_KEYS.filter((k) => k !== "lesson|cicd/lsn-2") });
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], relations: [], userRejected: [] },
      "hard two": { anchors: [anchor("mastered 2")], relations: [], userRejected: [] },
    });

    const out = dump();

    expect(out.mode).toBe("incremental");
    expect(out.workQueue.map((t) => [t.front, t.reason])).toEqual([
      ["hard three", "new-target"],
      ["hard one", "new-content"],
      ["hard two", "new-content"],
    ]);
    expect(out.catalog.filter((c) => c.new).map((c) => c.ref)).toEqual(["cicd/lsn-2"]);
    expect(out.catalog).toHaveLength(5);
    expect(out.stats.newCatalog).toBe(1);
  });

  it("treats an entry left under an old note path as not paired, since the plugin cannot see it", () => {
    seedSr();
    seedStatus();
    seedSynapse({ "hard two": { anchors: [anchor("mastered 2")], userRejected: [] } });
    write("engram-review/synapse/Old Folder__Deck.json", {
      _meta: { sourceNotePath: "Old Folder/Deck.md" },
      cards: { "hard one": { anchors: [anchor("mastered 1")], userRejected: ["lesson|cicd/lsn-2"] } },
    });

    const out = dump();

    expect(out.workQueue).toHaveLength(1);
    expect(out.workQueue[0]).toMatchObject({ front: "hard one", reason: "new-target" });
    expect(out.preservedFronts).toEqual(["hard two"]);
  });

  it("re-pairs a target whose relation points at content that no longer exists", () => {
    seedSr();
    seedStatus();
    seedContent();
    write(SEEN_FILE, { seen: CATALOG_KEYS });
    seedSynapse({
      "hard one": {
        anchors: [anchor("mastered 1")],
        relations: [
          { type: "lesson", ref: "cicd/deleted-lesson", score: 8, reason: "gone" },
          { type: "note", ref: "Notes/Somewhere.md", score: 7, reason: "notes are not in the catalog, so never stale" },
        ],
        userRejected: [],
      },
      "hard two": {
        anchors: [anchor("mastered 2")],
        relations: [{ type: "note", ref: "Notes/Somewhere.md", score: 7, reason: "kept" }],
        userRejected: [],
      },
    });

    const out = dump();

    expect(out.mode).toBe("incremental");
    expect(out.workQueue).toHaveLength(1);
    expect(out.workQueue[0]).toMatchObject({ front: "hard one", reason: "stale-relation", staleRelations: ["lesson|cicd/deleted-lesson"] });
    expect(out.preservedFronts).toEqual(["hard two"]);
  });

  it("sorts each target into one bucket: stale anchor, stale relation, empty retry, new content", () => {
    seedSr(["a", "b", "c", "d"]);
    // The pool had 9 mastered cards last run and has 10 now, so empty entries are retried.
    write(STATUS_FILE, { enabled: true, masteredPoolSize: 9, generatedAt: "2026-11-01T00:00:00Z" });
    seedContent();
    const gone = { type: "lesson", ref: "cicd/deleted-lesson", score: 8, reason: "gone" };
    seedSynapse({
      a: { anchors: [anchor("no longer mastered")], relations: [gone], userRejected: [] },
      b: { anchors: [], relations: [gone], userRejected: [] },
      c: { anchors: [], relations: [], userRejected: [] },
      d: { anchors: [anchor("mastered 1")], relations: [], userRejected: [] },
    });

    const out = dump();

    expect(out.workQueue.map((t) => [t.front, t.reason])).toEqual([
      ["a", "stale-anchor"],
      ["b", "stale-relation"],
      ["c", "empty-retry"],
      ["d", "new-content"],
    ]);
    expect(out.workQueue[0].staleAnchors).toEqual(["no longer mastered"]);
  });

  it("carries skip ids and stored rejections on queued targets too", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], userRejected: ["lesson|cicd/lsn-1", "mastered 4"] },
      "hard two": { anchors: [anchor("mastered 2")], userRejected: [] },
    });

    const [one, two] = dump().workQueue;

    expect(one).toMatchObject({ front: "hard one", reason: "new-content", userRejected: ["lesson|cicd/lsn-1", "mastered 4"] });
    expect(one.skip.sort()).toEqual(["c1", "c4", "m4"]); // rejected lesson, its own explainer, rejected anchor
    expect(two.skip).toBeUndefined();
    expect(two.userRejected).toBeUndefined();
  });

  it("reads a stored entry whose lists are not lists as an empty entry", () => {
    seedSr(["a", "b", "c"]);
    seedStatus();
    seedSynapse({
      a: { anchors: {}, relations: "none", userRejected: 5 },
      b: "not an object",
      c: { anchors: [null, "x", anchor("mastered 1")], relations: [null, 3, { type: "lesson" }] },
    });

    expect(dump().mode).toBe("noop");
  });
});

describe("dump_sr_pool: full runs", () => {
  it("flags nothing as new and names rejections held by cards that are no longer targets", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], userRejected: ["mastered 5"] },
      "mastered 2": { anchors: [], userRejected: ["lesson|cicd/lsn-1"] },
      "mastered 3": { anchors: [], userRejected: [] },
    });

    const out = dump("--full");

    expect(out.mode).toBe("full");
    expect(out.catalog.some((c) => c.new)).toBe(false);
    expect(out.keepEntries).toEqual([{ file: "Study__Deck.json", front: "mastered 2" }]);
    expect(out.targets.find((t) => t.front === "hard one").userRejected).toEqual(["mastered 5"]);
    expect(dump("--full", "--mark-seen", out.catalogToken).mode).toBe("marked-seen");
  });

  it("leaves keepEntries out when no rejection needs carrying", () => {
    seedSr();
    seedSynapse({ "hard one": { anchors: [anchor("mastered 1")], userRejected: [] } });

    expect(dump().keepEntries).toBeUndefined();
  });
});

describe("dump_sr_pool: --mark-seen", () => {
  it("writes nothing on a normal run", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({ "hard one": { anchors: [anchor("mastered 1")], userRejected: [] } });
    const before = snapshot();

    dump();
    dump("--full");

    expect(snapshot()).toEqual(before);
  });

  it("records the current catalog so the next run has nothing new", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({
      "hard one": { anchors: [anchor("mastered 1")], userRejected: [] },
      "hard two": { anchors: [anchor("mastered 2")], userRejected: [] },
    });
    const before = snapshot();

    const marked = dump("--mark-seen", dump().catalogToken);

    expect(marked).toMatchObject({ mode: "marked-seen", catalogCount: 5 });
    expect(read(SEEN_FILE).seen).toEqual(CATALOG_KEYS);
    const after = snapshot();
    delete after[path.normalize(SEEN_FILE)];
    expect(after).toEqual(before);
    expect(dump().mode).toBe("noop");
  });

  it("marks nothing when content was added after the dump the run worked from", () => {
    seedSr();
    seedStatus();
    seedContent();
    seedSynapse({ "hard one": { anchors: [anchor("mastered 1")], userRejected: [] } });
    const { catalogToken } = dump();
    write("engram-quest/explainer/meta/added-later.json", { id: "added-later", title: "Written while the run was pairing" });
    const before = snapshot();

    expect(dump("--mark-seen", catalogToken)).toMatchObject({ mode: "not-marked", reason: "catalog-changed-since-dump" });
    expect(dump("--mark-seen")).toMatchObject({ mode: "not-marked", reason: "catalog-token-missing" });
    expect(snapshot()).toEqual(before);
    // The late page is still offered as new next time.
    expect(dump().catalog.find((c) => c.ref === "added-later").new).toBe(true);
  });

  it("marks an empty catalog without needing the synapse folder to exist", () => {
    seedSr();

    expect(dump("--mark-seen", dump().catalogToken)).toMatchObject({ mode: "marked-seen", catalogCount: 0 });
    expect(read(SEEN_FILE).seen).toEqual([]);
  });
});

describe("dump_sr_pool: unchanged gates", () => {
  it("reports pool-too-small before looking at any content", () => {
    write(SR_FILE, { "only mastered": { stability: 9 }, "hard one": { stability: 1 } });
    seedContent();

    const out = dump();

    expect(out.mode).toBe("pool-too-small");
    expect(out.stats.masteredCount).toBe(1);
    expect(out.catalog).toBeUndefined();
  });

  it("exits with an error document when there is no sr folder", () => {
    seedContent();
    let stdout = "";
    try {
      execFileSync(process.execPath, [SCRIPT], { cwd: vault, encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      stdout = e.stdout;
      expect(e.status).toBe(2);
    }
    expect(JSON.parse(stdout).mode).toBe("error");
  });
});
