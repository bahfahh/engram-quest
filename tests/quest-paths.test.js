import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const questHelpers = require("../src/quest/helpers.js");
const questModal = require("../src/quest/modal.js");
const { Modal } = require("obsidian");

const {
  resolveQuestPath,
  getQuestImageResource,
  openQuestLink,
} = questHelpers;
const {
  renderQuestChallenge,
  openQuestChapterModal,
} = questModal;

function makeApp({ exactFile = null, linkedFile = null } = {}) {
  return {
    vault: {
      getAbstractFileByPath: vi.fn((path) => {
        if (exactFile && path === exactFile.path) return exactFile;
        return null;
      }),
      adapter: {
        getResourcePath: vi.fn((path) => `resource:${path}`),
      },
    },
    metadataCache: {
      getFirstLinkpathDest: vi.fn((path, sourcePath) => {
        if (!linkedFile) return null;
        return path === linkedFile.lookupPath && sourcePath === linkedFile.sourcePath
          ? { path: linkedFile.path }
          : null;
      }),
    },
    workspace: {
      openLinkText: vi.fn(),
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete global.window;
});

describe("quest path resolution", () => {
  it("prefers exact vault-relative matches before note-relative lookup", () => {
    const exactFile = { path: "Folder/assets/image.png" };
    const app = makeApp({
      exactFile,
      linkedFile: {
        lookupPath: "assets/image.png",
        sourcePath: "Folder/Note.md",
        path: "Folder/assets/image.png",
      },
    });

    const resolved = resolveQuestPath(app, "Folder/assets/image.png", "Folder/Note.md");

    expect(resolved).toBe(exactFile);
    expect(app.metadataCache.getFirstLinkpathDest).not.toHaveBeenCalled();
  });

  it("falls back to note-relative lookup from the current note", () => {
    const app = makeApp({
      linkedFile: {
        lookupPath: "assets/image.png",
        sourcePath: "Folder/Note.md",
        path: "Folder/assets/image.png",
      },
    });

    const resolved = resolveQuestPath(app, "assets/image.png", "Folder/Note.md");

    expect(resolved).toEqual({ path: "Folder/assets/image.png" });
    expect(app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith("assets/image.png", "Folder/Note.md");
  });

  it("builds image resources from the resolved file path", () => {
    const app = makeApp({
      linkedFile: {
        lookupPath: "assets/image.png",
        sourcePath: "Folder/Note.md",
        path: "Folder/assets/image.png",
      },
    });

    const resource = getQuestImageResource(app, "assets/image.png", "Folder/Note.md");

    expect(resource).toBe("resource:Folder/assets/image.png");
    expect(app.vault.adapter.getResourcePath).toHaveBeenCalledWith("Folder/assets/image.png");
  });

  it("opens resolved files with the current note as link context", () => {
    const app = makeApp({
      linkedFile: {
        lookupPath: "assets/image.png",
        sourcePath: "Folder/Note.md",
        path: "Folder/assets/image.png",
      },
    });

    openQuestLink(app, "assets/image.png", "Folder/Note.md");

    expect(app.workspace.openLinkText).toHaveBeenCalledWith("Folder/assets/image.png", "Folder/Note.md", false);
  });

  it("falls back to obsidian://open when no file can be resolved", () => {
    const app = makeApp();
    global.window = { open: vi.fn() };

    openQuestLink(app, "missing/image.png", "Folder/Note.md");

    expect(global.window.open).toHaveBeenCalledWith("obsidian://open?file=missing%2Fimage.png");
    expect(app.workspace.openLinkText).not.toHaveBeenCalled();
  });
});

describe("quest source path propagation", () => {
  it("passes sourcePath into image challenge resource lookup", () => {
    const container = new Modal({}).contentEl;
    const app = makeApp();
    const deps = {
      questDifficultyPresets: {
        medium: { labelKey: "DIFF_MEDIUM", color: "#3b82f6", showHint: false, maxRetries: 99 },
      },
      translateKey: vi.fn(() => "Quest"),
      getLanguage: vi.fn(() => "en"),
      retriggerShake: vi.fn(),
      openQuestLink: vi.fn(),
      collectExpectedAnswers: vi.fn(() => ["Label"]),
      matchesExpectedAnswer: vi.fn(() => false),
      renderClozeSentence: vi.fn(() => ""),
      getQuestImageResource: vi.fn(() => "resource:Folder/assets/image.png"),
    };

    renderQuestChallenge(
      container,
      {
        type: "image-occlusion",
        image: "assets/image.png",
        answer: "Label",
        region_left_pct: 10,
        region_top_pct: 10,
        region_width_pct: 10,
        region_height_pct: 10,
      },
      "medium",
      () => {},
      {},
      app,
      "Folder/Note.md",
      deps,
    );

    expect(deps.getQuestImageResource).toHaveBeenCalledWith(app, "assets/image.png", "Folder/Note.md");
  });

  it("passes sourcePath from chapter modal into challenge rendering", () => {
    const app = makeApp();
    const deps = {
      getQuestTheme: vi.fn(() => ({ g1: "#60a5fa", g2: "#2563eb" })),
      getLanguage: vi.fn(() => "en"),
      renderQuestChallenge: vi.fn(),
    };

    openQuestChapterModal(
      app,
      [{ title: "Chapter 1", challenge: { type: "input", prompt: "Q", answers: ["A"] } }],
      0,
      "ocean",
      "medium",
      {},
      "Folder/Note.md",
      deps,
    );

    expect(deps.renderQuestChallenge).toHaveBeenCalled();
    expect(deps.renderQuestChallenge.mock.calls[0][6]).toBe("Folder/Note.md");
  });
});
