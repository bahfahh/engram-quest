// Tests for src/review/synapse-layout.js: which side of the map each branch goes on.

import { describe, it, expect } from "vitest";
import { groupOf, arrangeSynapseMap, spinePaths } from "../src/review/synapse-layout.js";

const node = (id, fields) => ({ id, type: "card", state: "mastered", inferred: true, children: [], ...fields });
const recall = (id) => node(id);
const source = (id) => node(id, { type: "note", state: null, inferred: false });
const next = (id) => node(id, { type: "lesson", state: "unseen" });
const shape = (side) => side.map((part) => [part.group, part.labelled, part.branches.map((b) => b.id)]);

describe("groupOf", () => {
  it("separates recall cues, where the card comes from, and what is still ahead", () => {
    expect(groupOf(recall("a"))).toBe("recall");
    expect(groupOf(node("l", { type: "lesson", state: "seen" }))).toBe("recall");
    expect(groupOf(source("n"))).toBe("source");
    expect(groupOf(node("e", { type: "explainer", state: "seen", inferred: false }))).toBe("source");
    expect(groupOf(next("x"))).toBe("next");
    expect(groupOf(node("c", { state: "learning" }))).toBe("next");
    expect(groupOf(node("v", { type: "video", state: "unseen", inferred: false }))).toBe("next");
  });
});

describe("arrangeSynapseMap", () => {
  it("puts what the user already knows first, left of the card, and the rest right of it", () => {
    const map = arrangeSynapseMap([source("n"), next("v"), recall("a"), recall("b"), next("l")]);
    expect(shape(map.left)).toEqual([["recall", true, ["a", "b"]]]);
    expect(shape(map.right)).toEqual([["source", true, ["n"]], ["next", true, ["v", "l"]]]);
  });

  it("keeps rank order inside a group", () => {
    const map = arrangeSynapseMap([recall("b"), source("n"), recall("a")]);
    expect(shape(map.left)).toEqual([["recall", true, ["b", "a"]]]);
  });

  it("with no recall cues, starts with where the card comes from", () => {
    const map = arrangeSynapseMap([source("n"), next("l")]);
    expect(shape(map.left)).toEqual([["source", true, ["n"]]]);
    expect(shape(map.right)).toEqual([["next", true, ["l"]]]);
  });

  it("shares a single group between both sides so the card stays in the middle, naming it once", () => {
    const map = arrangeSynapseMap([source("n"), source("e"), source("v")]);
    expect(shape(map.left)).toEqual([["source", true, ["n", "e"]]]);
    expect(shape(map.right)).toEqual([["source", false, ["v"]]]);
  });

  it("puts a lone branch right of the card, and returns empty sides for an empty graph", () => {
    expect(shape(arrangeSynapseMap([recall("a")]).right)).toEqual([["recall", true, ["a"]]]);
    expect(arrangeSynapseMap([recall("a")]).left).toEqual([]);
    expect(arrangeSynapseMap([])).toEqual({ left: [], right: [] });
  });
});

describe("spinePaths", () => {
  const from = { x: 300, y: 100 };

  it("draws one line out of the card and one spine, with a short branch to each node", () => {
    const paths = spinePaths(from, 1, [{ x: 350, y: 60 }, { x: 350, y: 180 }, { x: 350, y: 300 }]);
    expect(paths.map((p) => p.d)).toEqual([
      "M300 100H320",
      "M320 72V288",
      "M320 72Q320 60 332 60H350",
      "M320 168Q320 180 332 180H350",
      "M320 288Q320 300 332 300H350",
    ]);
    expect(paths.every((p) => !p.dashed)).toBe(true);
    expect(paths.filter((p) => p.d.startsWith("M300 "))).toHaveLength(1);
  });

  it("mirrors to the left of the card", () => {
    expect(spinePaths(from, -1, [{ x: 250, y: 180 }]).map((p) => p.d)).toEqual(["M300 100H280", "M280 100V168", "M280 168Q280 180 268 180H250"]);
  });

  it("dashes the branches to what is still ahead and only the stretch of spine they alone use", () => {
    const paths = spinePaths(from, 1, [{ x: 350, y: 180 }, { x: 350, y: 300, dashed: true }, { x: 350, y: 400, dashed: true }]);
    expect(paths.map((p) => [p.d, p.dashed])).toEqual([
      ["M300 100H320", false],
      ["M320 100V168", false],
      ["M320 168V388", true],
      ["M320 168Q320 180 332 180H350", false],
      ["M320 288Q320 300 332 300H350", true],
      ["M320 388Q320 400 332 400H350", true],
    ]);
  });

  it("is all dashed when a side holds only what is still ahead, and runs straight to a node level with the card", () => {
    expect(spinePaths(from, 1, [{ x: 350, y: 100, dashed: true }, { x: 350, y: 200, dashed: true }])).toEqual([
      { d: "M300 100H320", dashed: true },
      { d: "M320 100V188", dashed: true },
      { d: "M320 100Q320 100 320 100H350", dashed: true },
      { d: "M320 188Q320 200 332 200H350", dashed: true },
    ]);
    expect(spinePaths(from, 1, [])).toEqual([]);
  });
});
