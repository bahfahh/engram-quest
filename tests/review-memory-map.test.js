import { describe, it, expect, vi } from "vitest";
import { __private as sessionPrivate } from "../src/review/session.js";

function canvas(path) {
  const parts = path.split("/");
  return {
    path,
    name: parts[parts.length - 1],
    parent: { path: parts.slice(0, -1).join("/") },
  };
}

function makeApp({ files, canvasBodies = {} }) {
  return {
    vault: {
      getFiles: () => files,
      read: vi.fn(async (file) => canvasBodies[file.path] || JSON.stringify({ nodes: [] })),
      getAbstractFileByPath: (path) => files.find(file => file.path === path) || null,
    },
    metadataCache: {
      getFirstLinkpathDest: vi.fn(() => null),
    },
  };
}

describe("review memory map discovery", () => {
  it("prefers same-folder memory maps for AI cards", () => {
    const app = makeApp({
      files: [
        canvas("4.軟體工程/dotnet/Modern_NET_Architecture_Aspire-memory.canvas"),
        canvas("Maps/Modern_NET_Architecture_Aspire-memory.canvas"),
      ],
    });
    const card = {
      notePath: "engram-review/ai-cards/dotnet-mastery.md",
      relatedNotePaths: ["4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md"],
    };

    const found = sessionPrivate.findMemoryMapCandidatesSync(app, card, { memoryMapFolder: "Maps" }, "flashcards/dotnet");

    expect(found.map(candidate => candidate.path)).toEqual(["4.軟體工程/dotnet/Modern_NET_Architecture_Aspire-memory.canvas"]);
  });

  it("falls back to topic folder candidates when same-folder is empty", () => {
    const app = makeApp({
      files: [
        canvas("4.軟體工程/dotnet/Aspire-overview-memory.canvas"),
        canvas("4.軟體工程/azure/Azure-memory.canvas"),
      ],
    });
    const card = {
      notePath: "engram-review/ai-cards/dotnet-mastery.md",
      relatedNotePaths: ["4.軟體工程/dotnet/microservices/Modern_NET_Architecture_Aspire.md"],
    };

    const found = sessionPrivate.findMemoryMapCandidatesSync(app, card, {}, "flashcards/dotnet");

    expect(found.map(candidate => candidate.path)).toEqual(["4.軟體工程/dotnet/Aspire-overview-memory.canvas"]);
  });

  it("returns multiple same-folder candidates for chooser flows", () => {
    const app = makeApp({
      files: [
        canvas("4.軟體工程/dotnet/Map-A-memory.canvas"),
        canvas("4.軟體工程/dotnet/Map-B-memory.canvas"),
      ],
    });
    const card = {
      notePath: "engram-review/ai-cards/dotnet-mastery.md",
      relatedNotePaths: ["4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md"],
    };

    const found = sessionPrivate.findMemoryMapCandidatesSync(app, card, {}, "flashcards/dotnet");

    expect(found).toHaveLength(2);
  });

  it("uses canvas file nodes as the last fallback", async () => {
    const targetPath = "4.軟體工程/dotnet/Modern_NET_Architecture_Aspire.md";
    const app = makeApp({
      files: [
        canvas("Maps/Aggregate-memory.canvas"),
        canvas("Maps/Other-memory.canvas"),
      ],
      canvasBodies: {
        "Maps/Aggregate-memory.canvas": JSON.stringify({
          nodes: [{ type: "file", file: targetPath }],
        }),
        "Maps/Other-memory.canvas": JSON.stringify({
          nodes: [{ type: "file", file: "Other/Note.md" }],
        }),
      },
    });
    const card = {
      notePath: "engram-review/ai-cards/dotnet-mastery.md",
      relatedNotePaths: [targetPath],
    };

    const found = await sessionPrivate.findMemoryMapCandidatesByCanvasContent(app, card, []);

    expect(found.map(candidate => candidate.path)).toEqual(["Maps/Aggregate-memory.canvas"]);
  });
});
