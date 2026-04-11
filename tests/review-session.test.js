import { describe, it, expect } from "vitest";
import { ReviewSessionModal } from "../src/review/session.js";
import { mergeReviewHints } from "../src/review/helpers.js";

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

describe("mergeReviewHints", () => {
  function makeBlankCard(front) {
    return { front, back: "A", hint_l1: "", hint_l2: "", hint_l3: "" };
  }

  it("merges dict-format hints into cards", () => {
    const cards = [makeBlankCard("What is X?"), makeBlankCard("Why Y?")];
    mergeReviewHints(cards, {
      cards: {
        "What is X?": { l1: "recall1", l2: "ctx1", l3: "kw1" },
        "Why Y?": { l1: "recall2", l2: "", l3: "kw2" },
      },
    });
    expect(cards[0].hint_l1).toBe("recall1");
    expect(cards[0].hint_l2).toBe("ctx1");
    expect(cards[0].hint_l3).toBe("kw1");
    expect(cards[1].hint_l1).toBe("recall2");
    expect(cards[1].hint_l2).toBe("");
  });

  it("merges array-format hints into cards (backward compat)", () => {
    const cards = [makeBlankCard("What is X?"), makeBlankCard("Why Y?")];
    mergeReviewHints(cards, {
      cards: [
        { front: "What is X?", l1: "recall1", l2: "ctx1", l3: "kw1" },
        { front: "Why Y?", l1: "recall2", l2: "", l3: "kw2" },
      ],
    });
    expect(cards[0].hint_l1).toBe("recall1");
    expect(cards[0].hint_l2).toBe("ctx1");
    expect(cards[0].hint_l3).toBe("kw1");
    expect(cards[1].hint_l1).toBe("recall2");
    expect(cards[1].hint_l3).toBe("kw2");
  });

  it("does nothing when hintPayload is null", () => {
    const cards = [makeBlankCard("Q")];
    mergeReviewHints(cards, null);
    expect(cards[0].hint_l1).toBe("");
  });

  it("does nothing when cards field is missing", () => {
    const cards = [makeBlankCard("Q")];
    mergeReviewHints(cards, {});
    expect(cards[0].hint_l1).toBe("");
  });
});
