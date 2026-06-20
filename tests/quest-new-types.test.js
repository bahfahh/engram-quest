import { describe, it, expect } from "vitest";
import {
  getQuestHtmlBase,
  getQuestMeta,
  isHtmlQuestNode,
  isQuestVersion2,
  parseQuestMap,
  resolveQuestHtmlPath,
} from "../src/quest/helpers.js";

describe("parseQuestMap mission metadata", () => {
  it("parses scenario, mission_goal, and stakes on quest nodes", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: mission-1",
      "    title: Incident Triage",
      "    scenario: Production latency spiked after a cache rollout.",
      "    mission_goal: Pick the safest rollback and verification plan.",
      "    stakes: Wrong ordering can extend downtime.",
      "    challenge:",
      "      type: quiz",
      "      question: What should happen first?",
      "      options: [Rollback, Ignore, Delete logs]",
      "      answer: 0",
    ].join("\n"));
    const node = cfg.nodes[0];
    expect(node.scenario).toBe("Production latency spiked after a cache rollout.");
    expect(node.mission_goal).toBe("Pick the safest rollback and verification plan.");
    expect(node.stakes).toBe("Wrong ordering can extend downtime.");
  });
});

describe("parseQuestMap countdown fields", () => {
  it("parses timer field", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Countdown",
      "    challenge:",
      "      type: countdown",
      "      timer: 15",
      "      question: What is X?",
      "      options: [A, B, C, D]",
      "      answer: 2",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("countdown");
    expect(c.timer).toBe(15);
    expect(c.question).toBe("What is X?");
    expect(c.options).toEqual(["A", "B", "C", "D"]);
    expect(c.answer).toBe(2);
  });
});

describe("parseQuestMap snapshot fields", () => {
  it("parses snapshot_items, snapshot_labels, snapshot_time", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Snapshot",
      "    challenge:",
      "      type: snapshot",
      "      snapshot_items: [Alpha, Beta, Gamma]",
      "      snapshot_labels: [L1, L2, L3]",
      "      snapshot_time: 5",
      "      question: Which is L2?",
      "      options: [Alpha, Beta, Gamma, Delta]",
      "      answer: 1",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("snapshot");
    expect(c.snapshot_items).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(c.snapshot_labels).toEqual(["L1", "L2", "L3"]);
    expect(c.snapshot_time).toBe(5);
    expect(c.options).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(c.answer).toBe(1);
  });

  it("works without snapshot_labels", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Snapshot",
      "    challenge:",
      "      type: snapshot",
      "      snapshot_items: [X, Y]",
      "      snapshot_time: 3",
      "      question: Q?",
      "      options: [X, Y]",
      "      answer: 0",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.snapshot_items).toEqual(["X", "Y"]);
    expect(c.snapshot_labels).toBeUndefined();
    expect(c.snapshot_time).toBe(3);
  });
});

describe("parseQuestMap auction fields", () => {
  it("parses coins field", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Auction",
      "    challenge:",
      "      type: auction",
      "      coins: 80",
      "      question: Which is correct?",
      "      options: [A, B, C, D]",
      "      answer: 1",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("auction");
    expect(c.coins).toBe(80);
    expect(c.question).toBe("Which is correct?");
    expect(c.answer).toBe(1);
  });

  it("defaults coins to undefined when not specified", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Auction",
      "    challenge:",
      "      type: auction",
      "      question: Q?",
      "      options: [A, B]",
      "      answer: 0",
    ].join("\n"));
    expect(cfg.nodes[0].challenge.coins).toBeUndefined();
  });
});

describe("new types coexist with existing types", () => {
  it("parses a quest with mixed old and new challenge types", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "style: cyber",
      "difficulty: medium",
      "nodes:",
      "  - id: ch1",
      "    title: Quiz Chapter",
      "    challenge:",
      "      type: quiz",
      "      question: Basic?",
      "      options: [A, B]",
      "      answer: 0",
      "  - id: ch2",
      "    title: Countdown Chapter",
      "    challenge:",
      "      type: countdown",
      "      timer: 10",
      "      question: Fast?",
      "      options: [X, Y]",
      "      answer: 1",
      "  - id: ch3",
      "    title: Auction Chapter",
      "    challenge:",
      "      type: auction",
      "      coins: 50",
      "      question: Bet?",
      "      options: [P, Q]",
      "      answer: 0",
    ].join("\n"));
    expect(cfg.nodes).toHaveLength(3);
    expect(cfg.nodes[0].challenge.type).toBe("quiz");
    expect(cfg.nodes[1].challenge.type).toBe("countdown");
    expect(cfg.nodes[1].challenge.timer).toBe(10);
    expect(cfg.nodes[2].challenge.type).toBe("auction");
    expect(cfg.nodes[2].challenge.coins).toBe(50);
  });
});

describe("parseQuestMap timeline fields", () => {
  it("parses slots, events, and answer array", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Timeline",
      "    challenge:",
      "      type: timeline",
      "      question: Place events",
      "      slots: [2002, 2009, 2016]",
      "      events: [ASP.NET 1.0, MVC 1.0, Core 1.0]",
      "      answer: [0, 1, 2]",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("timeline");
    expect(c.slots).toEqual(["2002", "2009", "2016"]);
    expect(c.events).toEqual(["ASP.NET 1.0", "MVC 1.0", "Core 1.0"]);
    expect(c.answer).toEqual([0, 1, 2]);
  });
});

describe("parseQuestMap chain fields", () => {
  it("parses chain_items, timer, and answer array", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Chain",
      "    challenge:",
      "      type: chain",
      "      timer: 25",
      "      question: Click in order",
      "      chain_items: [Step A, Step B, Step C]",
      "      answer: [0, 1, 2]",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("chain");
    expect(c.timer).toBe(25);
    expect(c.chain_items).toEqual(["Step A", "Step B", "Step C"]);
    expect(c.answer).toEqual([0, 1, 2]);
  });
});

describe("parseQuestMap memory-palace fields", () => {
  it("parses palace_items, palace_descs, palace_time, and string answer", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Palace",
      "    challenge:",
      "      type: memory-palace",
      "      palace_items: [Pipeline, Controller, Service, DbContext]",
      "      palace_descs: [HTTP flow, Handles requests, Business logic, ORM layer]",
      "      palace_time: 12",
      "      question: Which handles ORM?",
      "      answer: DbContext",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("memory-palace");
    expect(c.palace_items).toEqual(["Pipeline", "Controller", "Service", "DbContext"]);
    expect(c.palace_descs).toEqual(["HTTP flow", "Handles requests", "Business logic", "ORM layer"]);
    expect(c.palace_time).toBe(12);
    expect(c.answer).toBe("DbContext");
  });

  it("works without palace_descs", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Palace",
      "    challenge:",
      "      type: memory-palace",
      "      palace_items: [A, B, C]",
      "      palace_time: 8",
      "      question: Which is B?",
      "      answer: B",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.palace_items).toEqual(["A", "B", "C"]);
    expect(c.palace_descs).toBeUndefined();
    expect(c.palace_time).toBe(8);
  });
});

describe("parseQuestMap questions_json field", () => {
  it("parses inline JSON array of questions", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Auction Round",
      "    challenge:",
      "      type: auction",
      "      coins: 100",
      '      questions_json: [{"q":"Q1","opts":["A","B","C"],"ans":1},{"q":"Q2","opts":["X","Y"],"ans":0}]',
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.type).toBe("auction");
    expect(c.coins).toBe(100);
    expect(c.questions_json).toHaveLength(2);
    expect(c.questions_json[0].q).toBe("Q1");
    expect(c.questions_json[0].ans).toBe(1);
    expect(c.questions_json[1].opts).toEqual(["X", "Y"]);
  });

  it("falls back to empty array on invalid JSON", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Bad JSON",
      "    challenge:",
      "      type: countdown",
      "      questions_json: not valid json",
    ].join("\n"));
    expect(cfg.nodes[0].challenge.questions_json).toEqual([]);
  });

  it("coexists with single-question fields", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: ch1",
      "    title: Single",
      "    challenge:",
      "      type: quiz",
      "      question: Standalone?",
      "      options: [A, B]",
      "      answer: 0",
      "  - id: ch2",
      "    title: Multi",
      "    challenge:",
      "      type: countdown",
      "      timer: 10",
      '      questions_json: [{"q":"Fast?","opts":["X","Y"],"ans":1}]',
    ].join("\n"));
    expect(cfg.nodes[0].challenge.questions_json).toBeUndefined();
    expect(cfg.nodes[0].challenge.question).toBe("Standalone?");
    expect(cfg.nodes[1].challenge.questions_json).toHaveLength(1);
    expect(cfg.nodes[1].challenge.timer).toBe(10);
  });
});

describe("parseQuestMap iframe fields", () => {
  it("parses iframe html path and height fields", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: sim1",
      "    title: Token Bucket Simulator",
      "    challenge:",
      "      type: iframe",
      "      html: engram-quest/html/token-bucket/sim1.html",
      "      height: 520",
    ].join("\n"));

    expect(cfg.nodes[0].challenge).toMatchObject({
      type: "iframe",
      html: "engram-quest/html/token-bucket/sim1.html",
      height: 520,
    });
  });
});

describe("parseQuestMap HTML-first v2 fields", () => {
  it("parses quest metadata and node-level html contract", () => {
    const cfg = parseQuestMap([
      "version: 2",
      "title: Azure Functions Mission",
      "description: Practice trigger and deployment decisions.",
      "difficulty: hard",
      "nodes:",
      "  - id: ch1",
      "    title: Trigger Triage",
      "    emoji: ⚡",
      "    type: mission",
      "    html: ch1-trigger.html",
      "    height: 760",
      "  - id: boss",
      "    title: Incident Boss",
      "    type: boss",
      "    html: boss-incident.html",
    ].join("\n"));

    expect(isQuestVersion2(cfg.nodes)).toBe(true);
    expect(getQuestMeta(cfg.nodes)).toMatchObject({
      version: 2,
      title: "Azure Functions Mission",
      description: "Practice trigger and deployment decisions.",
      difficulty: "hard",
    });
    expect(cfg.nodes[0]).toMatchObject({
      id: "ch1",
      type: "mission",
      html: "ch1-trigger.html",
      height: 760,
      challenge: {
        type: "iframe",
        html: "ch1-trigger.html",
        height: 760,
        __htmlFirst: true,
      },
    });
    expect(cfg.nodes[1].boss).toBe(true);
    expect(isHtmlQuestNode(cfg.nodes[0])).toBe(true);
  });

  it("keeps v1 challenge parsing unchanged", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: round1",
      "    title: Quiz",
      "    challenge:",
      "      type: quiz",
      "      html: legacy-sim.html",
      "      options: [A, B]",
      "      answer: 0",
    ].join("\n"));

    expect(isQuestVersion2(cfg.nodes)).toBe(false);
    expect(cfg.nodes[0].html).toBeUndefined();
    expect(cfg.nodes[0].challenge).toMatchObject({
      type: "quiz",
      html: "legacy-sim.html",
      options: ["A", "B"],
      answer: 0,
    });
  });
});

describe("resolveQuestHtmlPath", () => {
  it("resolves short html filenames under the quest html folder", () => {
    expect(resolveQuestHtmlPath("ch1.html", "Study/Azure Functions-quest.md"))
      .toBe("engram-quest/html/Azure Functions/ch1.html");
  });

  it("preserves explicit vault-relative html paths", () => {
    expect(resolveQuestHtmlPath("engram-quest/html/custom/ch1.html", "Study/Azure-quest.md"))
      .toBe("engram-quest/html/custom/ch1.html");
    expect(resolveQuestHtmlPath("Shared/quest-html/ch1.html", "Study/Azure-quest.md"))
      .toBe("Shared/quest-html/ch1.html");
  });

  it("derives quest html base from standalone or embedded quest notes", () => {
    expect(getQuestHtmlBase("Study/Azure Functions-quest.md")).toBe("Azure Functions");
    expect(getQuestHtmlBase("Study/Azure Functions.md")).toBe("Azure Functions");
  });
});

describe("parseQuestMap learning feedback fields", () => {
  it("parses explanation aliases and keyword answers for deterministic feedback", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: boss",
      "    title: Boss",
      "    challenge:",
      "      type: input",
      "      question: Rollback is reliable under what condition?",
      "      keywords: [same connection, same transaction]",
      "      explanation: Rollback only covers writes in the same transaction scope.",
    ].join("\n"));
    const c = cfg.nodes[0].challenge;
    expect(c.explanation).toBe("Rollback only covers writes in the same transaction scope.");
    expect(c.keywords).toEqual(["same connection", "same transaction"]);
  });

  it("parses explain as a compact explanation alias", () => {
    const cfg = parseQuestMap([
      "version: 1",
      "nodes:",
      "  - id: boss",
      "    title: Boss",
      "    challenge:",
      "      type: truefalse",
      "      statement: HTTP 200 proves DB state is correct.",
      "      answer: false",
      "      explain: Status-only assertions can miss persistence failures.",
    ].join("\n"));
    expect(cfg.nodes[0].challenge.explain).toBe("Status-only assertions can miss persistence failures.");
  });
});
