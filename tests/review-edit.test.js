import { describe, it, expect, vi } from "vitest";
import { saveTagSourceCard, saveInlineCard, replaceCardInBlock, applyFormatToCardBack, refreshTagSourceCard, findCurrentSourceCard, removeCardFromContent } from "../src/review/edit.js";

// ── replaceCardInBlock (pure, no I/O) ────────────────────────────────────────
describe("replaceCardInBlock", () => {
  const blockContent = `cards:
  - front: What is X?
    back: It is X.
    hint_l1: Think about X
    hint_l2: Context
    hint_l3: Narrow
  - front: What is Y?
    back: It is Y.
`;

  it("replaces front and back", () => {
    const result = replaceCardInBlock(blockContent, { front: "What is X?", back: "It is X." }, {
      front: "What is X? (edited)", back: "It is X. (edited)", hint_l1: "", hint_l2: "", hint_l3: ""
    });
    expect(result).toContain("- front: What is X? (edited)");
    expect(result).toContain("back: It is X. (edited)");
    expect(result).not.toContain("- front: What is X?\n");
  });

  it("preserves other cards", () => {
    const result = replaceCardInBlock(blockContent, { front: "What is X?", back: "It is X." }, {
      front: "New Q", back: "New A", hint_l1: "", hint_l2: "", hint_l3: ""
    });
    expect(result).toContain("- front: What is Y?");
  });

  it("includes non-empty hints", () => {
    const result = replaceCardInBlock(blockContent, { front: "What is X?", back: "It is X." }, {
      front: "What is X?", back: "It is X.", hint_l1: "L1 hint", hint_l2: "", hint_l3: "L3 hint"
    });
    expect(result).toContain("hint_l1: L1 hint");
    expect(result).toContain("hint_l3: L3 hint");
    expect(result).not.toContain("hint_l2:");
  });

  it("returns original if card not found", () => {
    const result = replaceCardInBlock(blockContent, { front: "Nonexistent", back: "X" }, {
      front: "New", back: "New", hint_l1: "", hint_l2: "", hint_l3: ""
    });
    expect(result).toBe(blockContent);
  });

  it("preserves emoji", () => {
    const withEmoji = `  - front: Q\n    back: A\n    emoji: 🧠\n    hint_l1: hint\n`;
    const result = replaceCardInBlock(withEmoji, { front: "Q", back: "A" }, {
      front: "Q2", back: "A2", hint_l1: "new hint", hint_l2: "", hint_l3: ""
    });
    expect(result).toContain("emoji: 🧠");
  });
});

// ── saveTagSourceCard ────────────────────────────────────────────────────────
describe("saveTagSourceCard", () => {
  function makeApp({ fileContent = "", hintsExist = false, hintsContent = null } = {}) {
    let written = null;
    let modifyCount = 0;
    let hintsWritten = null;
    return {
      _getWritten: () => written,
      _getModifyCount: () => modifyCount,
      _getHintsWritten: () => hintsWritten,
      vault: {
        getAbstractFileByPath: (p) => p ? { path: p } : null,
        read: async () => fileContent,
        modify: async (f, c) => { written = c; modifyCount++; },
        adapter: {
          exists: async () => hintsExist,
          read: async () => hintsContent || JSON.stringify({ note: "test.md", generated: "2026-01-01", cards: { "What is X?": { l1: "old l1", l2: "old l2", l3: "" } } }),
          write: async (p, c) => { hintsWritten = { path: p, content: c }; },
        },
      },
    };
  }

  it("replaces front :: back in markdown", async () => {
    const app = makeApp({ fileContent: "What is X? :: It is X.\n<!--SR:!2026-01-01,1,1,5,1-->\n" });
    const card = { front: "What is X?", back: "It is X.", notePath: "Notes/test.md", srComment: "" };
    await saveTagSourceCard(app, card, { front: "What is X? (v2)", back: "It is X. (v2)", hint_l1: "", hint_l2: "", hint_l3: "" });
    expect(app._getWritten()).toContain("What is X? (v2) :: It is X. (v2)");
    expect(app._getWritten()).not.toContain("What is X? :: It is X.");
  });

  it("replaces the full Q:/A: answer block without leaving old answer lines", async () => {
    const app = makeApp({
      fileContent: "Q: What is X?\nA: first line\nsecond line\n\n\nNext paragraph\n",
    });
    const card = { front: "What is X?", back: "first line\nsecond line", notePath: "Notes/test.md" };
    const saved = await saveTagSourceCard(app, card, {
      front: "What is X?",
      back: "edited first\nedited second",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
    });

    expect(saved).toBe(true);
    expect(app._getWritten()).toBe("Q: What is X?\nA: edited first\nedited second\n\n\nNext paragraph\n");
    expect(app._getWritten()).not.toContain("first line\nsecond line");
  });

  it("does not modify source, hints, or sr when the original card cannot be found", async () => {
    const app = makeApp({ fileContent: "Q :: A\n", hintsExist: false });
    const card = { front: "Missing", back: "Nope", notePath: "Notes/test.md" };
    const saved = await saveTagSourceCard(app, card, {
      front: "Q2",
      back: "A2",
      hint_l1: "new hint",
      hint_l2: "",
      hint_l3: "",
    });

    expect(saved).toBe(false);
    expect(app._getModifyCount()).toBe(0);
    expect(app._getHintsWritten()).toBeNull();
  });

  it("creates hints file when it does not exist", async () => {
    const app = makeApp({ fileContent: "Q :: A\n", hintsExist: false });
    const card = { front: "Q", back: "A", notePath: "Notes/test.md" };
    await saveTagSourceCard(app, card, { front: "Q", back: "A", hint_l1: "L1", hint_l2: "", hint_l3: "" });
    const written = app._getHintsWritten();
    expect(written).not.toBeNull();
    const parsed = JSON.parse(written.content);
    expect(parsed.cards["Q"].l1).toBe("L1");
  });

  it("renames key in hints when front changes", async () => {
    const app = makeApp({ fileContent: "What is X? :: It is X.\n", hintsExist: true });
    const card = { front: "What is X?", back: "It is X.", notePath: "Notes/test.md" };
    await saveTagSourceCard(app, card, { front: "New Q", back: "It is X.", hint_l1: "new l1", hint_l2: "", hint_l3: "" });
    const written = app._getHintsWritten();
    const parsed = JSON.parse(written.content);
    expect(parsed.cards["New Q"]).toBeDefined();
    expect(parsed.cards["What is X?"]).toBeUndefined();
    expect(parsed.cards["New Q"].l1).toBe("new l1");
  });

  it("does nothing when notePath is null", async () => {
    const app = makeApp({ fileContent: "Q :: A\n" });
    const card = { front: "Q", back: "A", notePath: null };
    await saveTagSourceCard(app, card, { front: "Q2", back: "A2", hint_l1: "", hint_l2: "", hint_l3: "" });
    expect(app._getWritten()).toBeNull();
  });

  it("converts :: card to %%card%% block when new back is multi-line", async () => {
    const app = makeApp({ fileContent: "What is X? :: original\n" });
    const card = { front: "What is X?", back: "original", rawFront: "What is X?", rawBack: "original", notePath: "Notes/test.md" };
    const saved = await saveTagSourceCard(app, card, {
      front: "What is X?",
      back: "para1\n\npara2\n\npara3",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
    });
    expect(saved).toBe(true);
    expect(app._getWritten()).toBe("%%card%%\nQ: What is X?\nA: para1\n\npara2\n\npara3\n%%card%%\n");
    expect(app._getWritten()).not.toMatch(/What is X\? :: para1/);
  });

  it("multi-line save preserves adjacent :: cards when converting", async () => {
    const initialContent = "Q1 :: A1\nWhat is X? :: original\nQ2 :: A2\n";
    const app = makeApp({ fileContent: initialContent });
    const card = { front: "What is X?", back: "original", rawFront: "What is X?", rawBack: "original", notePath: "Notes/test.md" };
    const newBack = "first paragraph\n\nsecond paragraph\n\nthird paragraph";
    await saveTagSourceCard(app, card, { front: "What is X?", back: newBack, hint_l1: "", hint_l2: "", hint_l3: "" });
    const written = app._getWritten();
    // The %%card%% fence isolates the multi-line back; adjacent :: cards stay intact
    expect(written).toContain("Q1 :: A1");
    expect(written).toContain("Q2 :: A2");
    expect(written).toContain("%%card%%\nQ: What is X?\nA: first paragraph\n\nsecond paragraph\n\nthird paragraph\n%%card%%");
  });

  it("multi-line save survives a re-parse round-trip without truncation", async () => {
    const initialContent = "Q1 :: A1\nWhat is X? :: original\nQ2 :: A2\n";
    const app = makeApp({ fileContent: initialContent });
    const card = { front: "What is X?", back: "original", rawFront: "What is X?", rawBack: "original", notePath: "Notes/test.md" };
    const newBack = "first paragraph\n\nsecond paragraph\n\nthird paragraph";
    await saveTagSourceCard(app, card, { front: "What is X?", back: newBack, hint_l1: "", hint_l2: "", hint_l3: "" });
    const written = app._getWritten();

    // Step 2: simulate refresh — re-parse via findCurrentSourceCard with the now-fresh back
    const refreshed = findCurrentSourceCard(written, {
      front: "What is X?",
      back: newBack,
      rawFront: "What is X?",
      rawBack: newBack,
    });
    expect(refreshed).not.toBeNull();
    expect(refreshed.back).toBe(newBack);
  });

  it("re-edits a %% card %% block (with inner spaces) and normalizes to %%card%%", async () => {
    const initialContent = "%% card %%\nQ: What is X?\nA: old\n%% card %%\n";
    const app = makeApp({ fileContent: initialContent });
    const card = { front: "What is X?", back: "old", notePath: "Notes/test.md" };
    const saved = await saveTagSourceCard(app, card, {
      front: "What is X?",
      back: "new line 1\nnew line 2",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
    });
    expect(saved).toBe(true);
    const written = app._getWritten();
    // Block found by the relaxed parser, rewritten in canonical form
    expect(written).toContain("%%card%%\nQ: What is X?\nA: new line 1\nnew line 2\n%%card%%");
    expect(written).not.toContain("%% card %%");
  });

  it("re-edits a card already stored as %%card%% block (no duplication)", async () => {
    const initialContent = "Q1 :: A1\n%%card%%\nQ: What is X?\nA: old line 1\nold line 2\n%%card%%\nQ2 :: A2\n";
    const app = makeApp({ fileContent: initialContent });
    const card = { front: "What is X?", back: "old line 1\nold line 2", notePath: "Notes/test.md" };
    const saved = await saveTagSourceCard(app, card, {
      front: "What is X?",
      back: "new line 1\n\nnew line 2",
      hint_l1: "",
      hint_l2: "",
      hint_l3: "",
    });
    expect(saved).toBe(true);
    const written = app._getWritten();
    expect(written).toContain("%%card%%\nQ: What is X?\nA: new line 1\n\nnew line 2\n%%card%%");
    expect(written).not.toContain("old line 1");
    expect(written).not.toContain("old line 2");
    expect(written.match(/%%card%%/g)).toHaveLength(2); // exactly one block, two fences
  });
});

describe("refreshTagSourceCard", () => {
  function makeApp(fileContent) {
    return {
      vault: {
        getAbstractFileByPath: (p) => p ? { path: p } : null,
        read: async () => fileContent,
      },
    };
  }

  it("refreshes stale :: card text from the source file", async () => {
    const app = makeApp("Q :: current answer\n");
    const card = { front: "Q", back: "old answer", rawFront: "Q", rawBack: "old answer", notePath: "Notes/test.md" };

    const refreshed = await refreshTagSourceCard(app, card);

    expect(refreshed).toBe(true);
    expect(card.front).toBe("Q");
    expect(card.back).toBe("current answer");
    expect(card.rawBack).toBe("current answer");
  });

  it("refreshes stale Q:/A: multi-line answer text", async () => {
    const app = makeApp("Q: What is X?\nA: current first\ncurrent second\n\n\nNext paragraph\n");
    const card = { front: "What is X?", back: "old first\nold second", notePath: "Notes/test.md" };

    const refreshed = await refreshTagSourceCard(app, card);

    expect(refreshed).toBe(true);
    expect(card.front).toBe("What is X?");
    expect(card.back).toBe("current first\ncurrent second");
  });

  it("does not guess when duplicate fronts exist and the old back no longer matches", () => {
    const current = findCurrentSourceCard("Q :: current one\nQ :: current two\n", {
      front: "Q",
      back: "old answer",
      rawFront: "Q",
      rawBack: "old answer",
    });

    expect(current).toBeNull();
  });
});

describe("applyFormatToCardBack", () => {
  function makeApp(fileContent) {
    let written = null;
    let modifyCount = 0;
    return {
      _getWritten: () => written,
      _getModifyCount: () => modifyCount,
      vault: {
        getAbstractFileByPath: (p) => p ? { path: p } : null,
        read: async () => fileContent,
        modify: async (f, c) => { written = c; modifyCount++; },
      },
    };
  }

  it("formats a :: answer", async () => {
    const app = makeApp("Q :: first answer\n");
    const card = { front: "Q", back: "first answer", rawFront: "Q", rawBack: "first answer", notePath: "Notes/test.md" };
    const saved = await applyFormatToCardBack(app, card, "first answer", "==first answer==");

    expect(saved).toBe(true);
    expect(app._getWritten()).toBe("Q :: ==first answer==\n");
    expect(card.rawBack).toBe("==first answer==");
  });

  it("formats a multi-line Q:/A: answer without duplicating old lines", async () => {
    const app = makeApp("Q: What is X?\nA: first line\nsecond line\n\n\nNext paragraph\n");
    const card = { front: "What is X?", back: "first line\nsecond line", notePath: "Notes/test.md" };
    const saved = await applyFormatToCardBack(
      app,
      card,
      "first line\nsecond line",
      "==first line==\nsecond line"
    );

    expect(saved).toBe(true);
    expect(app._getWritten()).toBe("Q: What is X?\nA: ==first line==\nsecond line\n\n\nNext paragraph\n");
    expect(app._getWritten().match(/second line/g)).toHaveLength(1);
  });

  it("does not write when the card cannot be found", async () => {
    const app = makeApp("Q :: A\n");
    const saved = await applyFormatToCardBack(
      app,
      { front: "Missing", back: "Nope", notePath: "Notes/test.md" },
      "Nope",
      "**Nope**"
    );

    expect(saved).toBe(false);
    expect(app._getModifyCount()).toBe(0);
  });

  // Regression: parseFencedQA (loader, used inside ---...--- blocks) does NOT
  // terminate the back on 2 consecutive blank lines, but collectQaCards (editor)
  // did — so highlighting a fenced multi-paragraph card silently failed with
  // "新增卡片失敗". Editor must mirror loader semantics inside fenced blocks.
  it("formats a fenced --- Q:/A: answer that contains 2 consecutive blank lines", async () => {
    const fileContent =
      "#flashcards/ai\n" +
      "---\n" +
      "Q: skills manager .net?\n" +
      "A: ## .NET / Enterprise 組合\n" +
      "\n" +
      "\n" +
      "Microsoft Agent Framework\n" +
      "+ AG-UI\n" +
      "+ GitHub Copilot SDK\n" +
      "\n" +
      "### 適合目標\n" +
      "\n" +
      "- 面向企業\n" +
      "- Windows / .NET 生態\n" +
      "- coding agent 場景\n" +
      "---\n";
    const fullBack =
      "## .NET / Enterprise 組合\n\n\n" +
      "Microsoft Agent Framework\n+ AG-UI\n+ GitHub Copilot SDK\n\n" +
      "### 適合目標\n\n" +
      "- 面向企業\n- Windows / .NET 生態\n- coding agent 場景";
    const newBack = fullBack.replace("Windows / .NET 生態", "==Windows / .NET 生態==");

    const app = makeApp(fileContent);
    const card = { front: "skills manager .net?", back: fullBack, notePath: "Notes/test.md" };
    const saved = await applyFormatToCardBack(app, card, fullBack, newBack);

    expect(saved).toBe(true);
    const written = app._getWritten();
    expect(written).toContain("==Windows / .NET 生態==");
    // Closing --- fence preserved
    expect(written.endsWith("---\n")).toBe(true);
    // Opening --- fence preserved
    expect(written).toContain("---\nQ: skills manager .net?");
    // Surrounding tag preserved (above the fence)
    expect(written).toContain("#flashcards/ai\n");
  });
});

// ── saveInlineCard ───────────────────────────────────────────────────────────
describe("saveInlineCard", () => {
  const fileContent = "# Note\n\n```review-deck\ncards:\n  - front: What is X?\n    back: It is X.\n    hint_l1: old hint\n  - front: What is Y?\n    back: It is Y.\n```\n";

  function makeApp(content) {
    let written = null;
    return {
      _getWritten: () => written,
      vault: {
        getAbstractFileByPath: (p) => p ? { path: p } : null,
        read: async () => content,
        modify: async (f, c) => { written = c; },
      },
    };
  }

  it("replaces card fields in code block", async () => {
    const app = makeApp(fileContent);
    const card = { front: "What is X?", back: "It is X.", notePath: null };
    await saveInlineCard(app, "Notes/test.md", card, { front: "What is X? (v2)", back: "New answer", hint_l1: "new hint", hint_l2: "", hint_l3: "" });
    expect(app._getWritten()).toContain("- front: What is X? (v2)");
    expect(app._getWritten()).toContain("back: New answer");
    expect(app._getWritten()).toContain("hint_l1: new hint");
  });

  it("preserves other cards in the block", async () => {
    const app = makeApp(fileContent);
    const card = { front: "What is X?", back: "It is X.", notePath: null };
    await saveInlineCard(app, "Notes/test.md", card, { front: "Q2", back: "A2", hint_l1: "", hint_l2: "", hint_l3: "" });
    expect(app._getWritten()).toContain("- front: What is Y?");
  });

  it("does nothing when sourcePath file not found", async () => {
    const app = makeApp(fileContent);
    app.vault.getAbstractFileByPath = () => null;
    const card = { front: "What is X?", back: "It is X.", notePath: null };
    await saveInlineCard(app, "nonexistent.md", card, { front: "Q2", back: "A2", hint_l1: "", hint_l2: "", hint_l3: "" });
    expect(app._getWritten()).toBeNull();
  });
});

// ── removeCardFromContent (delete parity across 3 formats) ────────────────────
// Regression: deleter used to handle only `::` lines, so %%card%% and Q:/A: cards
// silently survived deletion and reappeared on the next review session.
describe("removeCardFromContent", () => {
  it("removes a %%card%% fenced block including both fences", () => {
    const content = [
      "# Notes",
      "",
      "%%card%%",
      "Q: First question?",
      "A: First answer.",
      "%%card%%",
      "",
      "%%card%%",
      "Q: Second question?",
      "A: Second answer.",
      "%%card%%",
      "",
    ].join("\n");
    const r = removeCardFromContent(content, { front: "First question?", back: "First answer." }, "First answer.");
    expect(r.modified).toBe(true);
    expect(r.content).not.toContain("First question?");
    expect(r.content).not.toContain("First answer.");
    // The other card survives untouched
    expect(r.content).toContain("Q: Second question?");
    expect(r.content).toContain("A: Second answer.");
  });

  it("removes a %%card%% block with a multi-line answer", () => {
    const content = [
      "%%card%%",
      "Q: Why frameworks?",
      "A:",
      "",
      "**Reason one** explained.",
      "",
      "**Reason two** explained.",
      "%%card%%",
    ].join("\n");
    const r = removeCardFromContent(content, { front: "Why frameworks?", back: "**Reason one** explained.\n\n**Reason two** explained." }, "**Reason one** explained.\n\n**Reason two** explained.");
    expect(r.modified).toBe(true);
    expect(r.content).not.toContain("Why frameworks?");
    expect(r.content).not.toContain("Reason one");
  });

  it("removes a bare Q:/A: card (double blank line terminates the answer)", () => {
    // Outside a fence the loader needs 2 blank lines to end the answer, so the
    // card boundary must use the same separation the loader recognises.
    const content = ["Q: Bare question?", "A: Bare answer.", "", "", "Some trailing text."].join("\n");
    const r = removeCardFromContent(content, { front: "Bare question?", back: "Bare answer." }, "Bare answer.");
    expect(r.modified).toBe(true);
    expect(r.content).not.toContain("Bare question?");
    expect(r.content).toContain("Some trailing text.");
  });

  it("removes a :: card line (regression: original behavior preserved)", () => {
    const content = ["What is X? :: It is X.", "What is Y? :: It is Y."].join("\n");
    const r = removeCardFromContent(content, { front: "What is X?", back: "It is X." }, "It is X.");
    expect(r.modified).toBe(true);
    expect(r.content).not.toContain("What is X?");
    expect(r.content).toContain("What is Y? :: It is Y.");
  });

  it("returns modified:false when the card is not found", () => {
    const content = "%%card%%\nQ: Existing?\nA: Yes.\n%%card%%";
    const r = removeCardFromContent(content, { front: "Missing?", back: "No." }, "No.");
    expect(r.modified).toBe(false);
    expect(r.content).toBe(content);
  });
});
