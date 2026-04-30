import { describe, it, expect, vi } from "vitest";
import { scanReviewDecks } from "../src/review/decks.js";

describe("scanReviewDecks", () => {
  it("falls back to inline tags when cache tags are missing and SR scan is disabled", async () => {
    const file = {
      path: "Study/inline-tag.md",
      name: "inline-tag.md",
      parent: { path: "Study" },
    };
    const content = "#flashcards/math\n\nQuestion :: Answer\n";
    const reviewHelpers = {
      matchFlashcardTagPrefix: (tags, flashcardTags) => {
        const prefixes = String(flashcardTags || "")
          .split(/[\s,\n]+/)
          .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
          .filter(Boolean);
        for (const tag of tags) {
          const normalized = String(tag).replace(/^#/, "").toLowerCase();
          for (const prefix of prefixes) {
            if (normalized === prefix || normalized.startsWith(prefix + "/")) {
              return String(tag).replace(/^#/, "");
            }
          }
        }
        return null;
      },
      parseFlashcards: vi.fn(() => [{ front: "Question", back: "Answer" }]),
      loadSrData: vi.fn(async () => ({})),
      mergeSrIntoCards: vi.fn(),
      mergeReviewHints: vi.fn(),
      getReviewStatus: vi.fn(() => "unseen"),
    };
    const app = {
      vault: {
        getMarkdownFiles: () => [file],
        read: vi.fn(async () => content),
        adapter: {
          exists: vi.fn(async () => false),
        },
      },
      metadataCache: {
        getFileCache: () => ({ tags: [] }),
      },
    };
    const decks = await scanReviewDecks(app, { enableSRScan: false, flashcardTags: "flashcards" }, reviewHelpers);

    expect(app.vault.read).toHaveBeenCalledWith(file);
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe("flashcards/math");
    expect(decks[0].total).toBe(1);
  });

  it("normalizes aggregated AI hint sources into related note paths", async () => {
    const file = {
      path: "engram-review/ai-cards/dotnet-mastery.md",
      name: "dotnet-mastery.md",
      parent: { path: "engram-review/ai-cards" },
    };
    const reviewHelpers = {
      matchFlashcardTagPrefix: vi.fn(() => "flashcards/dotnet"),
      parseFlashcards: vi.fn(() => [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
        { front: "Q3", back: "A3" },
      ]),
      loadSrData: vi.fn(async () => ({})),
      mergeSrIntoCards: vi.fn(),
      mergeReviewHints: vi.fn(),
      getReviewStatus: vi.fn(() => "unseen"),
    };
    const hintPayload = {
      note: "4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md",
      cards: {
        Q1: { l1: "", l2: "", l3: "", source: "4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md" },
        Q2: { l1: "", l2: "", l3: "", source: ["4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md", "4.軟體工程/dotnet/Aspire_Orchestrator.md"] },
        Q3: { l1: "", l2: "", l3: "", source: null },
      },
    };
    const app = {
      vault: {
        getMarkdownFiles: () => [file],
        read: vi.fn(async () => "#flashcards/dotnet\n\nQ1 :: A1\nQ2 :: A2\nQ3 :: A3\n"),
        adapter: {
          exists: vi.fn(async (path) => path === "engram-review/hints/dotnet-mastery.json"),
          read: vi.fn(async () => JSON.stringify(hintPayload)),
        },
      },
      metadataCache: {
        getFileCache: () => ({ tags: [{ tag: "#flashcards/dotnet" }] }),
      },
    };

    const decks = await scanReviewDecks(app, { enableSRScan: false, flashcardTags: "flashcards" }, reviewHelpers);

    expect(decks).toHaveLength(1);
    expect(decks[0].cards[0].relatedNotePaths).toEqual(["4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md"]);
    expect(decks[0].cards[1].relatedNotePaths).toEqual([
      "4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md",
      "4.軟體工程/dotnet/Aspire_Orchestrator.md",
    ]);
    expect(decks[0].cards[2].relatedNotePaths).toEqual([]);
    expect(decks[0].cards[0].primarySourceNotePath).toBe("4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md");
  });
});
