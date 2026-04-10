import { describe, it, expect } from "vitest";
import { ReviewSessionModal } from "../src/review/session.js";

function makeCard(overrides = {}) {
  return {
    front: "Q",
    back: "A",
    emoji: "",
    hint_l1: "hint1",
    hint_l2: "",
    hint_l3: "",
    srMeta: null,
    srComment: "",
    notePath: null,
    ...overrides,
  };
}

const fakeApp = { vault: { getAbstractFileByPath: () => null, read: async () => "", modify: async () => {} } };
const fakePlugin = { settings: { language: "en", requestedRetention: 0.9, maxInterval: 36500 } };

describe("ReviewSessionModal construction", () => {
  it("initialises with correct defaults", () => {
    const cards = [makeCard(), makeCard()];
    const m = new ReviewSessionModal(fakeApp, cards, "test-deck", fakePlugin, null);
    expect(m.cards).toBe(cards);
    expect(m.deckName).toBe("test-deck");
    expect(m.idx).toBe(0);
    expect(m.hintLevel).toBe(0);
    expect(m.answerShown).toBe(false);
    expect(m.browseOnly).toBe(false);
  });

  it("sets browseOnly from options", () => {
    const m = new ReviewSessionModal(fakeApp, [makeCard()], "d", fakePlugin, null, { browseOnly: true });
    expect(m.browseOnly).toBe(true);
  });
});

describe("ReviewSessionModal renderCard reset", () => {
  it("renderCard resets hintLevel and answerShown", () => {
    const m = new ReviewSessionModal(fakeApp, [makeCard()], "d", fakePlugin, null);
    m.hintLevel = 2;
    m.answerShown = true;
    m.renderCard();
    expect(m.hintLevel).toBe(0);
    expect(m.answerShown).toBe(false);
  });
});
