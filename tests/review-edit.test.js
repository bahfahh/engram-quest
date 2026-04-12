import { describe, it, expect, vi } from "vitest";
import { saveTagSourceCard, saveInlineCard, replaceCardInBlock } from "../src/review/edit.js";

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
    let hintsWritten = null;
    return {
      _getWritten: () => written,
      _getHintsWritten: () => hintsWritten,
      vault: {
        getAbstractFileByPath: (p) => p ? { path: p } : null,
        read: async () => fileContent,
        modify: async (f, c) => { written = c; },
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
