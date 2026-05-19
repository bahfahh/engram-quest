import { describe, expect, it, vi } from "vitest";
import {
  buildQuestRenderState,
  loadQuestState,
  markQuestNodeComplete,
  migrateQuestCompletion,
  questStateFileName,
  questStatePath,
  saveQuestState,
  updateQuestBestRun,
} from "../src/quest/state.js";

function makeAdapter(files = {}) {
  const store = new Map(Object.entries(files));
  return {
    exists: vi.fn(async (path) => store.has(path)),
    read: vi.fn(async (path) => store.get(path)),
    write: vi.fn(async (path, content) => store.set(path, content)),
    mkdir: vi.fn(async () => {}),
    store,
  };
}

describe("quest state file paths", () => {
  it("uses the full quest path to avoid same-name collisions", () => {
    expect(questStateFileName("Study/Azure Notes.md")).toBe("Study__Azure Notes.json");
    expect(questStatePath("Study/Azure Notes.md")).toBe("engram-quest/state/Study__Azure Notes.json");
  });
});

describe("quest state persistence", () => {
  it("loads an empty state when the state file does not exist", async () => {
    const adapter = makeAdapter();

    const state = await loadQuestState(adapter, "Study/Azure Notes.md");

    expect(state).toEqual({
      questPath: "Study/Azure Notes.md",
      nodes: {},
      bestRun: null,
      lastPlayed: null,
    });
  });

  it("saves state under engram-quest/state", async () => {
    const adapter = makeAdapter();
    const state = markQuestNodeComplete(
      { questPath: "Study/Azure Notes.md", nodes: {}, bestRun: null, lastPlayed: null },
      "round1",
      { scorePct: 75, now: "2026-05-19T12:00:00.000Z" },
    );

    await saveQuestState(adapter, "Study/Azure Notes.md", state);

    expect(adapter.mkdir).toHaveBeenCalledWith("engram-quest/state");
    const saved = JSON.parse(adapter.store.get("engram-quest/state/Study__Azure Notes.json"));
    expect(saved.nodes.round1).toMatchObject({
      completed: true,
      scorePct: 75,
      attempts: 1,
      lastPlayed: "2026-05-19T12:00:00.000Z",
    });
  });

  it("migrates legacy completed YAML flags without overwriting existing state", () => {
    const state = {
      questPath: "Study/Azure Notes.md",
      nodes: { old: { completed: true, scorePct: 60, attempts: 2 } },
      bestRun: null,
      lastPlayed: null,
    };

    const migrated = migrateQuestCompletion(state, [
      { id: "old", completed: true },
      { id: "new", completed: true },
      { id: "locked", completed: false },
    ]);

    expect(migrated.nodes.old.scorePct).toBe(60);
    expect(migrated.nodes.new).toMatchObject({ completed: true, scorePct: 100, attempts: 0 });
    expect(migrated.nodes.locked).toBeUndefined();
  });

  it("builds render progress from persisted node state", () => {
    const state = {
      questPath: "Study/Azure Notes.md",
      nodes: {
        intro: { completed: true, scorePct: 100 },
        round1: { completed: true, scorePct: 50 },
      },
      bestRun: { scorePct: 75, completedAt: "2026-05-19T12:00:00.000Z" },
      lastPlayed: "2026-05-19T12:00:00.000Z",
    };

    const renderState = buildQuestRenderState(
      [{ id: "intro" }, { id: "round1" }, { id: "boss" }],
      state,
    );

    expect([...renderState.visitedSet]).toEqual([0, 1]);
    expect(renderState.activeIndex).toBe(2);
    expect(renderState.completedCount).toBe(2);
    expect(renderState.progressPct).toBe(67);
    expect(renderState.bestScorePct).toBe(75);
  });

  it("records best run only after every node is completed", () => {
    let state = { questPath: "Study/Azure Notes.md", nodes: {}, bestRun: null, lastPlayed: null };
    state = markQuestNodeComplete(state, "intro", { scorePct: 100, now: "2026-05-19T12:00:00.000Z" });

    state = updateQuestBestRun(state, [{ id: "intro" }, { id: "round1" }], {
      now: "2026-05-19T12:00:00.000Z",
    });

    expect(state.bestRun).toBeNull();

    state = markQuestNodeComplete(state, "round1", { scorePct: 60, now: "2026-05-19T12:05:00.000Z" });
    state = updateQuestBestRun(state, [{ id: "intro" }, { id: "round1" }], {
      now: "2026-05-19T12:05:00.000Z",
    });

    expect(state.bestRun).toEqual({
      scorePct: 80,
      completedAt: "2026-05-19T12:05:00.000Z",
    });
  });
});
