import { describe, it, expect, vi } from "vitest";
import { appendManualCard } from "../src/review/create.js";

describe("appendManualCard", () => {
  it("creates parent folders before writing the first manual card", async () => {
    const existing = new Set();
    const writes = new Map();
    const mkdir = vi.fn(async (path) => {
      existing.add(path);
    });
    const adapter = {
      exists: vi.fn(async (path) => existing.has(path)),
      mkdir,
      read: vi.fn(async (path) => writes.get(path) || ""),
      write: vi.fn(async (path, content) => {
        writes.set(path, content);
        existing.add(path);
      }),
    };

    await appendManualCard(adapter, "azure", "What is ARM?", "Azure Resource Manager");

    expect(mkdir).toHaveBeenCalledWith("engram-review");
    expect(mkdir).toHaveBeenCalledWith("engram-review/ai-cards");
    expect(adapter.write).toHaveBeenCalledWith(
      "engram-review/ai-cards/azure-manual.md",
      "#flashcards/azure\n\nWhat is ARM? :: Azure Resource Manager\n"
    );
  });

  it("appends to an existing manual card file", async () => {
    const existing = new Set([
      "engram-review",
      "engram-review/ai-cards",
      "engram-review/ai-cards/azure-manual.md",
    ]);
    const writes = new Map([
      ["engram-review/ai-cards/azure-manual.md", "#flashcards/azure\n\nQ1 :: A1\n"],
    ]);
    const adapter = {
      exists: vi.fn(async (path) => existing.has(path)),
      mkdir: vi.fn(async () => {}),
      read: vi.fn(async (path) => writes.get(path) || ""),
      write: vi.fn(async (path, content) => {
        writes.set(path, content);
      }),
    };

    await appendManualCard(adapter, "azure", "Q2", "A2");

    expect(adapter.write).toHaveBeenCalledWith(
      "engram-review/ai-cards/azure-manual.md",
      "#flashcards/azure\n\nQ1 :: A1\nQ2 :: A2\n"
    );
  });
});
