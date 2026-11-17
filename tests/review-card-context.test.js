// A card read on a phone says where it is from: its deck and its source note, on one short line above
// the question. The line is small so the question keeps the room (the card is drawn by the real session
// code, tests/helpers/review-card.js).
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { drawCard, drawn, find } from "./helpers/review-card.js";

const require = createRequire(import.meta.url);
const { splitDeckName } = require("../src/review/helpers.js");
const css = String(require("../src/styles/hub-pages"));

const open = [];
afterEach(() => open.splice(0).forEach((card) => card.done()));
async function draw(options) {
  const card = await drawCard(options);
  open.push(card);
  return card;
}
const ctxOf = (card) => find(card, "lh-rc-ctx");
const parts = (ctx) => ({
  name: find(ctx, "lh-rc-ctx-deck").children.find((el) => el.tag === "b").textContent,
  path: (find(ctx, "lh-rc-ctx-path") || { textContent: "" }).textContent,
  title: find(ctx, "lh-rc-ctx-deck").attrs.title,
});

describe("deck name split", () => {
  it("takes the last part as the name and the rest as where it sits", () => {
    expect(splitDeckName("flashcards/open-source/repo-choice")).toEqual({ name: "repo-choice", path: "flashcards/open-source" });
  });
  it("uses the note's folder when the name is a single part", () => {
    expect(splitDeckName("flashcards", "Git/Basics.md")).toEqual({ name: "flashcards", path: "Git" });
    expect(splitDeckName("Git", "Basics.md")).toEqual({ name: "Git", path: "" });
  });
});

describe("review card context line on a phone", () => {
  it("comes first in the card, before the question", async () => {
    const { card } = await draw({ phone: true, answerShown: false });
    expect(card.children[0].hasClass("lh-rc-ctx")).toBe(true);
    expect(card.children.findIndex((el) => el.hasClass("lh-rc-question"))).toBeGreaterThan(0);
  });

  it("names the deck the card is in, with the full name on hold", async () => {
    const { card } = await draw({ phone: true, answerShown: false });
    expect(parts(ctxOf(card))).toEqual({ name: "git", path: "flashcards", title: "flashcards/git" });
  });

  it("prefers the card's own deck over the name of a session that mixes decks", async () => {
    const drawnCard = await draw({ phone: true, answerShown: false });
    const { session } = drawnCard;
    session.deckName = "全部";
    session.cards[0].deckName = "flashcards/open-source/repo-choice";
    session._renderCardContent(session.cards[0]);
    expect(parts(ctxOf(drawnCard.card))).toEqual({ name: "repo-choice", path: "flashcards/open-source", title: "flashcards/open-source/repo-choice" });
  });

  it("offers the source note, which opens it", async () => {
    const { card, session } = await draw({ phone: true, answerShown: false });
    const opened = [];
    session.app.workspace.openLinkText = (path) => opened.push(path);
    session.app.vault.getAbstractFileByPath = (path) => ({ path });
    session._renderCardContent(session.cards[0]);
    const src = find(find(session.contentEl, "lh-rc-ctx"), "lh-rc-ctx-src");
    expect(src.textContent).toBe("Git 基礎 閃卡");
    await src.click();
    expect(opened).toEqual(["Git/Git 基礎 閃卡.md"]);
    expect(card).toBeDefined();
  });

  it("shows how many more notes there are", async () => {
    const { session } = await draw({ phone: true, answerShown: false });
    session.cards[0].relatedNotePaths = ["Git/其他.md"];
    session._renderCardContent(session.cards[0]);
    expect(find(find(session.contentEl, "lh-rc-ctx"), "lh-rc-ctx-src").textContent).toBe("Git 基礎 閃卡+1");
  });

  it("keeps the browse badge on the same line", async () => {
    const { card } = await draw({ phone: true, answerShown: false, browseOnly: true });
    expect(drawn(ctxOf(card)).some((el) => el.hasClass("lh-rc-badge"))).toBe(true);
    expect(card.children.filter((el) => el.hasClass("lh-rc-badge"))).toHaveLength(0);
  });

  it("stays after the answer is shown", async () => {
    const { card } = await draw({ phone: true, answerShown: true });
    expect(ctxOf(card)).toBeDefined();
  });
});

describe("review card on a desktop", () => {
  it("has no context line, its header already shows the deck", async () => {
    const { card } = await draw({ phone: false });
    expect(ctxOf(card)).toBeUndefined();
    expect(find(card, "lh-rc-deck").attrs.title).toBe("flashcards/git");
  });

  it("shows the card's own deck rather than the session's name", async () => {
    const drawnCard = await draw({ phone: false });
    drawnCard.session.cards[0].deckName = "flashcards/open-source";
    drawnCard.session._renderCardContent(drawnCard.session.cards[0]);
    expect(find(drawnCard.session.contentEl, "lh-rc-deck").attrs.title).toBe("flashcards/open-source");
  });
});

describe("context line styles", () => {
  it("is one line of small text that gives way to the question", () => {
    const rule = css.split("\n").find((line) => line.startsWith("body.is-phone .lh-hub.lh-session .lh-rc-ctx {"));
    expect(rule).toMatch(/font-size:1[0-3](\.\d)?px/);
    expect(rule).toMatch(/margin:-\d+px 0/);
    expect(css).toMatch(/\.lh-rc-ctx-deck \{[^}]*white-space:nowrap/);
    expect(css).toMatch(/\.lh-rc-ctx-src \{[^}]*max-width:\d+%/);
  });
});
