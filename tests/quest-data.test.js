import { describe, expect, it } from "vitest";
import {
  listQuestPackages,
  normalizeQuestMeta,
  questPackageStateKey,
  questPackageToHubItem,
  resolveQuestPackageHtmlPath,
} from "../src/quest/data.js";

class MemoryAdapter {
  constructor(files = {}) {
    this.files = files;
  }

  async read(path) {
    if (!(path in this.files)) throw new Error("missing: " + path);
    return this.files[path];
  }

  async list(path) {
    const folders = new Set();
    for (const filePath of Object.keys(this.files)) {
      if (!filePath.startsWith(path + "/")) continue;
      const rest = filePath.slice(path.length + 1);
      const first = rest.split("/")[0];
      if (first) folders.add(path + "/" + first);
    }
    return { files: [], folders: [...folders] };
  }
}

describe("Quest package data layer", () => {
  it("normalizes package meta and resolves relative HTML inside the quest folder", () => {
    const meta = normalizeQuestMeta("procurement-system-dev", {
      title: "Procurement System Dev",
      difficulty: "hard",
      tags: ["procurement", "ddd"],
      nodes: [
        { id: "briefing", title: "Briefing", type: "briefing", summary: "Read the case." },
        { id: "ch1", title: "Inventory", type: "mission", html: "nodes/ch1.html", x: 20, y: 70 },
        { id: "boss", title: "Final Boss", type: "boss", file: "boss.html", height: 920 },
      ],
    });

    expect(meta.difficulty).toBe("hard");
    expect(meta.nodes[1]).toMatchObject({
      id: "ch1",
      html: "engram-quest/quests/procurement-system-dev/nodes/ch1.html",
      x: 20,
      y: 70,
    });
    expect(meta.nodes[2]).toMatchObject({
      boss: true,
      html: "engram-quest/quests/procurement-system-dev/boss.html",
      height: 920,
    });
  });

  it("keeps short HTML filenames under the package folder", () => {
    expect(resolveQuestPackageHtmlPath("azure-functions", "ch1.html"))
      .toBe("engram-quest/quests/azure-functions/ch1.html");
    expect(resolveQuestPackageHtmlPath("azure-functions", "nodes/ch1.html"))
      .toBe("engram-quest/quests/azure-functions/nodes/ch1.html");
    expect(resolveQuestPackageHtmlPath("azure-functions", "engram-quest/shared/ch1.html"))
      .toBe("engram-quest/shared/ch1.html");
  });

  it("lists quest packages from engram-quest/quests", async () => {
    const adapter = new MemoryAdapter({
      [questPackageStateKey("course-a")]: JSON.stringify({
        title: "Course A Quest",
        nodes: [{ id: "ch1", title: "One", html: "ch1.html" }],
      }),
      [questPackageStateKey("course-b")]: JSON.stringify({
        title: "Course B Quest",
        nodes: [{ id: "ch1", title: "One", html: "ch1.html" }],
      }),
    });

    const quests = await listQuestPackages(adapter);

    expect(quests.map((q) => q.slug).sort()).toEqual(["course-a", "course-b"]);
    expect(quests[0].meta.nodes[0].html).toContain("engram-quest/quests/");
  });

  it("creates a Hub item with progress from quest state", () => {
    const entry = {
      slug: "course-a",
      stateKey: questPackageStateKey("course-a"),
      meta: normalizeQuestMeta("course-a", {
        title: "Course A Quest",
        difficulty: "medium",
        nodes: [
          { id: "ch1", title: "One", html: "ch1.html" },
          { id: "boss", title: "Boss", type: "boss", html: "boss.html" },
        ],
      }),
    };

    const item = questPackageToHubItem(entry, {
      questPath: entry.stateKey,
      nodes: { ch1: { completed: true, scorePct: 80 } },
    });

    expect(item.sourceType).toBe("package");
    expect(item.title).toBe("Course A Quest");
    expect(item.progressPct).toBe(50);
    expect(item.completedCount).toBe(1);
    expect(item.bossReady).toBe(true);
    expect(item.nodes).toHaveLength(2);
  });
});
