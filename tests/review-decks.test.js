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
});
