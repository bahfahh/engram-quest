import { describe, it, expect } from "vitest";
import { parseQuestMap } from "../src/quest/helpers.js";

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
