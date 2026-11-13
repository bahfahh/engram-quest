// Which notes the Hub lists as Quest Maps, and what they read as (ticket-052, ticket-040).
// A note whose name ends in -quest.md was listed whatever it held, so a plain note such as
// `ai/engram-quest.md` showed up as a map with no stages. A quest counts when it has something to play.
// The older quest notes still have to be read, and a difficulty the plugin does not know reads as medium.
import { describe, expect, it } from "vitest";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// esbuild inlines the teachers' photos and voice samples; here a file name stands in for each.
for (const ext of [".jpg", ".mp3"]) Module._extensions[ext] = (module, file) => { module.exports = file; };
const { HubModal } = require("../src/hub/modal.js");
const { normalizeDifficulty, parseQuestMap, readLegacyQuest } = require("../src/quest/helpers.js");
const { normalizeQuestMeta } = require("../src/quest/data.js");
const { assetGroups } = require("../scripts/asset-list.mjs");

const AZURE = [
  "---",
  "tags: [azure]",
  "---",
  "",
  "# Azure",
  "",
  "```quest-map",
  "version: 1",
  "style: ocean",
  "difficulty: hard",
  "nodes:",
  "  - id: ch1",
  "    title: Regions",
  "    summary: Where the data lives.",
  "    challenge:",
  "      type: cloze",
  "      sentence: Data stays in a {{c1::region}}",
  "      answers: [region]",
  "  - id: boss",
  "    title: Boss",
  "    boss: true",
  "    challenge:",
  "      type: cloze",
  "      sentence: Pick a {{c1::region}}",
  "      answers: [region]",
  "```",
  "",
].join("\n");

const YAML_ONLY = [
  "version: 1",
  "style: forest",
  "difficulty: easy",
  "nodes:",
  "  - id: a",
  "    title: First",
  "    summary: s",
  "",
].join("\n");

const withDifficulty = (value) => AZURE.replace("difficulty: hard", `difficulty: ${value}`);

describe("readLegacyQuest", () => {
  it("reads a quest-map block, whatever the note is called", () => {
    for (const name of ["Azure-quest.md", "Azure.md", "Plan.md"]) {
      const quest = readLegacyQuest(name, AZURE);
      expect(quest.nodes.map((node) => node.id), name).toEqual(["ch1", "boss"]);
      expect(quest.difficulty).toBe("hard");
    }
  });

  it("still reads an old *-quest.md that holds the YAML without a fence", () => {
    const quest = readLegacyQuest("Study/Azure-quest.md", YAML_ONLY);
    expect(quest.nodes.map((node) => node.id)).toEqual(["a"]);
    expect(quest.difficulty).toBe("easy");
    expect(readLegacyQuest("Study/Azure.md", YAML_ONLY)).toBeNull();
  });

  it("is not fooled by a note that only has the name", () => {
    const aboutQuests = "# Notes for the AI\n\nHow EngramQuest stores quests. Nothing playable here.\n";
    expect(readLegacyQuest("ai/engram-quest.md", aboutQuests)).toBeNull();
    expect(readLegacyQuest("ai/engram-quest.md", "")).toBeNull();
    expect(readLegacyQuest("ai/engram-quest.md", undefined)).toBeNull();
  });

  it("does not list a block with no nodes in it", () => {
    const empty = "# How to write one\n\n```quest-map\nversion: 1\nnodes:\n```\n";
    expect(readLegacyQuest("Docs-quest.md", empty)).toBeNull();
    expect(readLegacyQuest("Docs.md", empty)).toBeNull();
  });
});

// The Hub's own scan, on a vault with one of each.
function makeHub(notes) {
  const files = Object.keys(notes).map((path) => {
    const name = path.split("/").pop();
    return { path, name, basename: name.replace(/\.md$/, ""), extension: "md", stat: { ctime: 1, mtime: 1, size: 1 } };
  });
  const app = {
    vault: {
      adapter: { list: async () => ({ files: [], folders: [] }), exists: async () => false, read: async () => { throw new Error("ENOENT"); } },
      getMarkdownFiles: () => files,
      getFiles: () => files,
      cachedRead: async (file) => notes[file.path],
    },
    metadataCache: { getFileCache: () => null },
  };
  return new HubModal(app, { settings: { language: "en" } });
}

describe("the Hub's quest scan", () => {
  it("lists quests and leaves out notes that are only named like one", async () => {
    const hub = makeHub({
      "ai/engram-quest.md": "# Notes for the AI\n\nHow EngramQuest stores quests.\n",
      "Study/Azure-quest.md": AZURE,
      "Study/Plan.md": withDifficulty("easy"),
      "Study/Old-quest.md": YAML_ONLY,
      "Study/Docs-quest.md": "# How to write one\n\n```quest-map\nversion: 1\nnodes:\n```\n",
      "Study/Daily.md": "# Today\n\nNothing to see.\n",
    });
    await hub._loadLibrary();
    const listed = Object.fromEntries(hub.quests.map((quest) => [quest.sourcePath, quest]));
    expect(Object.keys(listed).sort()).toEqual(["Study/Azure-quest.md", "Study/Old-quest.md", "Study/Plan.md"]);
    expect(listed["Study/Azure-quest.md"]).toMatchObject({ nodeCount: 2, difficulty: "hard", title: "Azure" });
    expect(listed["Study/Plan.md"]).toMatchObject({ nodeCount: 2, difficulty: "easy" });
    expect(listed["Study/Old-quest.md"]).toMatchObject({ nodeCount: 1, difficulty: "easy" });
  });
});

describe("a difficulty the plugin does not know (ticket-040)", () => {
  it("reads as medium in a legacy quest, as it does in a quest package", () => {
    for (const written of ["esay", "困難", "", "hardest", "difficult", "3"]) {
      expect(parseQuestMap(withDifficulty(written)).difficulty, `"${written}"`).toBe("medium");
      expect(normalizeQuestMeta("q", { title: "T", difficulty: written, nodes: [{ id: "a" }] }).difficulty, `"${written}"`).toBe("medium");
    }
  });

  it("still reads the three it knows, however they are written", () => {
    for (const [written, expected] of [["easy", "easy"], ["hard", "hard"], ["Hard", "hard"], ['"easy"', "easy"], ["hard # for the boss", "hard"], [" medium ", "medium"]]) {
      expect(parseQuestMap(withDifficulty(written)).difficulty, `"${written}"`).toBe(expected);
    }
    expect(normalizeDifficulty(undefined)).toBe("medium");
  });

  it("gives the Hub a difficulty whose map picture exists", async () => {
    const embedded = new Set(assetGroups().flatMap((group) => group.files));
    const hub = makeHub({ "Study/Typo-quest.md": withDifficulty("esay"), "Study/Mixed-quest.md": withDifficulty("Hard") });
    await hub._loadLibrary();
    expect(hub.quests.map((quest) => quest.difficulty).sort()).toEqual(["hard", "medium"]);
    for (const quest of hub.quests) {
      expect(embedded.has(`assets/quest-map/quest-map_backgroud_${quest.difficulty}.png`), quest.difficulty).toBe(true);
    }
  });

  it("takes the difficulty from the quest block, not from elsewhere in the note", () => {
    const text = "---\ndifficulty: hard\n---\n" + AZURE.replace("difficulty: hard\n", "");
    expect(readLegacyQuest("Study/Plan.md", text).difficulty).toBe("medium");
  });

  it("leaves the note itself alone", () => {
    const text = withDifficulty("esay");
    readLegacyQuest("Typo-quest.md", text);
    expect(text).toContain("difficulty: esay");
  });
});
