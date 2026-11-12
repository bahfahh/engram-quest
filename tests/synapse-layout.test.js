// Tests for src/review/synapse-layout.js: which side of the map each branch goes on.

import { describe, it, expect } from "vitest";
import { groupOf, arrangeSynapseMap } from "../src/review/synapse-layout.js";

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
