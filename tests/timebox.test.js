// Tests for time-boxed card picker (Pro feature).

import { describe, it, expect } from "vitest";
import {
  computeCardPriority,
  pickTopN,
  collectAllCards,
  pickTimeboxCards,
  cardTopic,
  topicDistance,
  getLocalDateStr,
  UNSEEN_BASE,
  OVERDUE_BASE
} from "../src/review/timebox.js";
import { AI_CARDS_DIR } from "../src/review/helpers.js";

const today = new Date("2026-05-10T08:00:00");

function unseen(name) { return { front: name, srMeta: null }; }
function withDue(name, due) { return { front: name, srMeta: { due, interval: 1, stability: 5, difficulty: 5, state: 2 } }; }

describe("computeCardPriority", () => {
  it("unseen cards get UNSEEN_BASE (highest tier)", () => {
    expect(computeCardPriority(unseen("Q"), today)).toBe(UNSEEN_BASE);
  });

  it("overdue cards: OVERDUE_BASE + days_overdue", () => {
    expect(computeCardPriority(withDue("Q", "2026-05-08"), today)).toBe(OVERDUE_BASE + 2);
    expect(computeCardPriority(withDue("Q", "2026-05-10"), today)).toBe(OVERDUE_BASE + 0);
  });

  it("future cards: negative, closer to today = higher", () => {
    expect(computeCardPriority(withDue("Q", "2026-05-11"), today)).toBe(-1);
    expect(computeCardPriority(withDue("Q", "2026-05-15"), today)).toBe(-5);
  });

  it("ordering: unseen > overdue > due-today > future", () => {
    const cards = [
      withDue("future", "2026-05-15"),
      withDue("today", "2026-05-10"),
      unseen("new"),
      withDue("overdue", "2026-05-05")
    ];
    const sorted = [...cards].sort((a, b) => computeCardPriority(b, today) - computeCardPriority(a, today));
    expect(sorted.map(c => c.front)).toEqual(["new", "overdue", "today", "future"]);
  });
});

describe("pickTopN", () => {
  const cards = [
    withDue("future-far", "2026-05-15"),
    withDue("today", "2026-05-10"),
    unseen("new-1"),
    withDue("overdue-2d", "2026-05-08"),
    unseen("new-2"),
    withDue("future-near", "2026-05-11")
  ];

  it("picks the n highest-priority cards", () => {
    const top3 = pickTopN(cards, 3).map(c => c.front);
    expect(top3).toContain("new-1");
    expect(top3).toContain("new-2");
    // 3rd slot is overdue (priority 502 > today 500)
    expect(top3).toContain("overdue-2d");
  });

  it("returns ≤ available cards when n > total", () => {
    expect(pickTopN(cards, 100).length).toBe(cards.length);
  });

  it("handles n = 0", () => {
    expect(pickTopN(cards, 0)).toEqual([]);
  });

  it("preserves stable order on ties", () => {
    const first = unseen("first");
    const second = unseen("second");
    const result = pickTopN([first, second], 2, () => 5);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });
});

describe("collectAllCards", () => {
  it("flattens cards across decks, skipping falsy", () => {
    const decks = [
      { name: "A", cards: [unseen("a1"), unseen("a2")] },
      { name: "B", cards: [unseen("b1"), null] },
      null
    ];
    const all = collectAllCards(decks);
    expect(all.map(c => c.front)).toEqual(["a1", "a2", "b1"]);
  });

  it("returns [] for empty input", () => {
    expect(collectAllCards([])).toEqual([]);
    expect(collectAllCards(null)).toEqual([]);
  });
});

// ── Topic coherence (ticket-075) ─────────────────────────────────────────────

function card(name, notePath, srMeta = null, extra = {}) { return { front: name, notePath, srMeta, ...extra }; }
function due(daysAgo) {
  const d = new Date(today); d.setDate(d.getDate() - daysAgo);
  return { due: getLocalDateStr(d), interval: 1, stability: 5, difficulty: 5, state: 2 };
}
const names = (cards) => cards.map((c) => c.front);

describe("computeCardPriority — same new-card test as the normal review", () => {
  it("state 0 counts as unseen even when it already has a due date", () => {
    const c = { front: "Q", srMeta: { due: "2026-05-01", interval: 0, stability: 0, difficulty: 0, state: 0 } };
    expect(computeCardPriority(c, today)).toBe(UNSEEN_BASE);
  });
});

describe("cardTopic / topicDistance", () => {
  it("untagged AI cards use the folder of their source note, not the shared AI-cards deck", () => {
    const a = card("a", `${AI_CARDS_DIR}/x.md`, null, { sourceNotePaths: ["notes/azure/ops.md"], primarySourceNotePath: "notes/azure/ops.md" });
    const b = card("b", `${AI_CARDS_DIR}/y.md`, null, { sourceNotePaths: ["notes/biz/model.md"], primarySourceNotePath: "notes/biz/model.md" });
    expect(cardTopic(a, AI_CARDS_DIR).path).toBe("notes/azure");
    expect(topicDistance(cardTopic(a, AI_CARDS_DIR), cardTopic(b, AI_CARDS_DIR))).toBe(4);
  });

  it("a card made from a note is as close as that note's own cards", () => {
    const fromNote = card("ai", `${AI_CARDS_DIR}/x.md`, null, { sourceNotePaths: ["notes/azure/ops.md"] });
    const own = card("own", "notes/azure/ops.md");
    expect(topicDistance(cardTopic(fromNote, AI_CARDS_DIR), cardTopic(own, "flashcards/azure"))).toBe(0);
  });

  it("orders note < deck < longer shared path < shorter shared path < link < unrelated", () => {
    const t = (deck, note) => cardTopic(card("q", note), deck);
    const base = t("flashcards/azure/ops/vm", "a.md");
    const links = { "a.md": { "f.md": 1 } };
    const d = (other) => topicDistance(base, other, links);
    expect(d(t("x/y", "a.md"))).toBe(0);
    expect(d(t("flashcards/azure/ops/vm", "b.md"))).toBe(1);
    expect(d(t("flashcards/azure/ops/net", "c.md"))).toBeLessThan(d(t("flashcards/azure/ai", "d.md")));
    expect(d(t("flashcards/azure/ai", "d.md"))).toBeLessThan(d(t("flashcards/biz", "f.md")));
    expect(d(t("flashcards/biz", "f.md"))).toBe(3);
    expect(d(t("flashcards/biz", "g.md"))).toBe(4);
  });

  it("a one-segment deck (bare tag root) is a catch-all, not a topic", () => {
    expect(topicDistance(cardTopic(card("a", "a.md"), "flashcards"), cardTopic(card("b", "b.md"), "flashcards"))).toBe(4);
  });
});

describe("pickTimeboxCards — related cards stay together", () => {
  const azureAndBiz = () => [
    { name: "flashcards/azure/ops", cards: [card("ops-1", "ops.md"), card("ops-2", "ops.md")] },
    { name: "flashcards/biz", cards: [card("biz-1", "biz.md"), card("biz-2", "biz.md"), card("biz-3", "biz2.md")] },
    { name: "flashcards/azure/ai", cards: [card("ai-1", "ai.md")] },
    { name: "flashcards/azure", cards: [card("az-1", "az.md")] }
  ];

  it("all-new pool: picks the azure family, not the business deck that sits between them", () => {
    const decks = azureAndBiz();
    expect(names(pickTopN(collectAllCards(decks), 4))).toEqual(["ops-1", "ops-2", "biz-1", "biz-2"]); // old behaviour
    expect(names(pickTimeboxCards(decks, 4, { today }))).toEqual(["ops-1", "ops-2", "ai-1", "az-1"]);
  });

  it("cards of the same note come together, in their original order", () => {
    const decks = [
      { name: "flashcards/azure/ops", cards: [card("a-1", "a.md"), card("b-1", "b.md"), card("a-2", "a.md"), card("b-2", "b.md"), card("a-3", "a.md")] }
    ];
    expect(names(pickTimeboxCards(decks, 5, { today }))).toEqual(["a-1", "a-2", "a-3", "b-1", "b-2"]);
  });

  it("new cards still all come before due cards, even when the due ones share the seed's topic", () => {
    const decks = [
      { name: "flashcards/azure/ops", cards: [card("az-new", "ops.md"), card("az-due-1", "ops.md", due(3)), card("az-due-2", "ops.md", due(9))] },
      { name: "flashcards/biz", cards: [card("biz-new", "biz.md")] }
    ];
    const picked = names(pickTimeboxCards(decks, 3, { today }));
    expect(picked.slice(0, 2)).toEqual(["az-new", "biz-new"]);
    expect(picked[2]).toBe("az-due-2");
  });

  it("due cards come before not-yet-due cards of the seed's topic", () => {
    const future = { due: "2026-05-12", interval: 3, stability: 5, difficulty: 5, state: 2 };
    const decks = [
      { name: "flashcards/azure/ops", cards: [card("az-due", "ops.md", due(5)), card("az-future", "ops.md", future)] },
      { name: "flashcards/biz", cards: [card("biz-due", "biz.md", due(1))] }
    ];
    expect(names(pickTimeboxCards(decks, 2, { today }))).toEqual(["az-due", "biz-due"]);
  });

  it("starts from the most overdue card and fills with its topic even when other topics are more overdue", () => {
    const decks = [
      { name: "flashcards/azure/ops", cards: [card("az-30d", "ops.md", due(30)), card("az-2d", "ops.md", due(2)), card("az-1d", "ops2.md", due(1))] },
      { name: "flashcards/biz", cards: Array.from({ length: 6 }, (_, i) => card(`biz-${i}`, `biz${i}.md`, due(20))) },
      { name: "flashcards/seo", cards: Array.from({ length: 6 }, (_, i) => card(`seo-${i}`, `seo${i}.md`, due(20))) }
    ];
    // The top 3N cards by priority hold no second azure card; every due card is a candidate.
    expect(names(pickTimeboxCards(decks, 3, { today }))).toEqual(["az-30d", "az-2d", "az-1d"]);
  });

  it("flat deck names are joined through note links", () => {
    const decks = [
      { name: "flashcards/azure-ops-2026", cards: [card("ops", "ops.md")] },
      { name: "flashcards/biz", cards: [card("biz", "biz.md")] },
      { name: "flashcards/azure-ai-2026", cards: [card("ai", "ai.md")] }
    ];
    expect(names(pickTimeboxCards(decks, 2, { today }))).toEqual(["ops", "biz"]);
    expect(names(pickTimeboxCards(decks, 2, { today, links: { "ai.md": { "ops.md": 1 } } }))).toEqual(["ops", "ai"]);
  });

  it("rotates: once a session's cards are rated, the next session moves to another topic", () => {
    const decks = azureAndBiz();
    const first = pickTimeboxCards(decks, 4, { today });
    const rated = { due: "2026-05-14", interval: 4, stability: 5, difficulty: 5, state: 2 };
    first.forEach((c) => { c.srMeta = rated; });
    expect(names(pickTimeboxCards(decks, 3, { today }))).toEqual(["biz-1", "biz-2", "biz-3"]);
  });

  it("falls back without error: no deck names, no note paths, too few cards, nothing at all", () => {
    const loose = [card("x", undefined), card("y", undefined, due(4)), card("z", undefined)];
    expect(names(pickTopN(loose, 3, (c) => computeCardPriority(c, today), { deckOf: new Map() })))
      .toEqual(names(pickTopN(loose, 3, (c) => computeCardPriority(c, today))));
    expect(names(pickTimeboxCards([{ name: "flashcards/a/b", cards: [card("only", "a.md")] }], 15, { today }))).toEqual(["only"]);
    expect(pickTimeboxCards([], 5, { today })).toEqual([]);
    expect(pickTimeboxCards(null, 5, { today })).toEqual([]);
    expect(pickTimeboxCards(azureAndBiz(), 0, { today })).toEqual([]);
  });

  it("does not modify the card objects", () => {
    const decks = azureAndBiz();
    const before = JSON.stringify(decks);
    pickTimeboxCards(decks, 4, { today });
    expect(JSON.stringify(decks)).toBe(before);
  });
});
