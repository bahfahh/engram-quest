// Verifies the questions_json per-item field mapping in renderQuestChallenge:
// - truefalse falls back to `q` for its statement (ticket-005)
// - items may override the round's challenge type (ticket-006)

import { describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { renderQuestChallenge } = require("../src/quest/modal.js");
const { Modal } = require("obsidian");

function makeContainerAndTextSpy() {
  const container = new Modal({}).contentEl;
  const proto = Object.getPrototypeOf(container);
  const original = proto.createEl;
  const texts = [];
  proto.createEl = function (tag, opts = {}) {
    if (opts && typeof opts.text === "string") texts.push(opts.text);
    return original.call(this, tag, opts);
  };
  return {
    container,
    texts,
    restore: () => { proto.createEl = original; },
  };
}

function makeApp() {
  return {
    vault: {
      getAbstractFileByPath: vi.fn(() => null),
      adapter: { getResourcePath: vi.fn((p) => `resource:${p}`), read: vi.fn(), exists: vi.fn(() => Promise.resolve(false)) },
    },
    metadataCache: { getFirstLinkpathDest: vi.fn(() => null) },
    workspace: { openLinkText: vi.fn() },
  };
}

function makeDeps() {
  return {
    questDifficultyPresets: {
      medium: { labelKey: "DIFF_MEDIUM", color: "#3b82f6", showHint: false, maxRetries: 99 },
    },
    translateKey: vi.fn(() => "Quest"),
    getLanguage: vi.fn(() => "en"),
    retriggerShake: vi.fn(),
    openQuestLink: vi.fn(),
    collectExpectedAnswers: vi.fn(() => ["Y"]),
    matchesExpectedAnswer: vi.fn(() => false),
    renderClozeSentence: vi.fn(() => ""),
    getQuestImageResource: vi.fn(() => ""),
  };
}

describe("questions_json field mapping", () => {
  it("truefalse statement falls back to q (ticket-005)", () => {
    const { container, texts, restore } = makeContainerAndTextSpy();
    try {
      renderQuestChallenge(
        container,
        {
          type: "truefalse",
          questions_json: [{ q: "Vercel runs at the edge.", ans: true }],
        },
        "medium",
        () => {},
        {},
        makeApp(),
        "Folder/Note.md",
        makeDeps(),
        { score: 0, lives: 3, coins: 100, streak: 0 },
      );
    } finally {
      restore();
    }
    expect(texts).toContain("Vercel runs at the edge.");
  });

  it("per-question type override routes cloze through cloze renderer (ticket-006)", () => {
    const deps = makeDeps();
    const { container, restore } = makeContainerAndTextSpy();
    try {
      renderQuestChallenge(
        container,
        {
          type: "auction",
          coins: 100,
          questions_json: [
            {
              type: "cloze",
              sentence: "Vercel deploys to the {{c1::edge}}.",
              answers: ["edge"],
            },
          ],
        },
        "medium",
        () => {},
        {},
        makeApp(),
        "Folder/Note.md",
        deps,
        { score: 0, lives: 3, coins: 100, streak: 0 },
      );
    } finally {
      restore();
    }
    // cloze renderer uniquely calls collectExpectedAnswers + renderClozeSentence;
    // auction does not. Their invocation proves the per-item type override took effect.
    expect(deps.collectExpectedAnswers).toHaveBeenCalled();
    expect(deps.renderClozeSentence).toHaveBeenCalled();
  });

  it("falls through to the round's outer type when item omits type (ticket-006 regression)", () => {
    const deps = makeDeps();
    const { container, restore } = makeContainerAndTextSpy();
    try {
      renderQuestChallenge(
        container,
        {
          type: "auction",
          coins: 100,
          questions_json: [{ q: "Pick A or B.", opts: ["A", "B"], ans: 0 }],
        },
        "medium",
        () => {},
        {},
        makeApp(),
        "Folder/Note.md",
        deps,
        { score: 0, lives: 3, coins: 100, streak: 0 },
      );
    } finally {
      restore();
    }
    // auction does not invoke cloze-only deps
    expect(deps.collectExpectedAnswers).not.toHaveBeenCalled();
    expect(deps.renderClozeSentence).not.toHaveBeenCalled();
  });
});
