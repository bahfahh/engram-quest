// Where a review card offers Synapse and the Deep Dive queue once its answer is shown (ticket-048).
// A desktop has them in the answer header. A phone, the main device for reviewing, used to keep both
// inside its "more" menu; it now shows them as a row under the answer card, with the relation map
// opening right below that row, and the menu no longer repeats what is on screen.
// The card is drawn by the real session code (tests/helpers/review-card.js).
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { drawCard, drawn, find } from "./helpers/review-card.js";

const require = createRequire(import.meta.url);
const { t: c } = require("../src/i18n");
const t = { language: "zh-tw" };
const SYNAPSE = c(t, "SYNAPSE"), QUEUE = c(t, "EXPLAINER_MARK_BTN"), QUEUED = c(t, "EXPLAINER_QUEUED_BTN");

// The card's parts from the answer down, in reading order.
const PARTS = ["lh-answer-block", "lh-answer-features", "lh-synapse-container", "lh-open-note"];
const order = (card) => card.children.map((el) => PARTS.find((name) => el.hasClass(name))).filter(Boolean);
// One card is on screen at a time; what it patched is put back after each test.
const open = [];
afterEach(() => open.splice(0).forEach((card) => card.done()));
async function draw(options) {
  open.splice(0).forEach((card) => card.done());
  const card = await drawCard(options);
  open.push(card);
  return card;
}
const hintsShown = (card) => find(card, "lh-hints-container").children.length;
const features = (root) => drawn(root).filter((el) => el.hasClass("lh-ans-feature")).map((el) => el.textContent);

describe("review card on a phone, answer shown", () => {
  it("shows both entries as a row under the answer card, with the map's place right below", async () => {
    const { card } = await draw({ phone: true });
    expect(order(card)).toEqual(["lh-answer-block", "lh-answer-features", "lh-synapse-container", "lh-open-note"]);
    expect(features(card)).toEqual([SYNAPSE, QUEUE]);
    // Nothing is added to the answer card itself: its header still holds only the formatting tools.
    expect(features(find(card, "lh-answer-block"))).toEqual([]);
  });

  it("opens the map under the row when Synapse is pressed, and closes it on the next press", async () => {
    const { card, panels } = await draw({ phone: true });
    const synapse = drawn(card).find((el) => el.hasClass("lh-ans-feature"));
    expect(synapse.attrs["aria-pressed"]).toBe("false");
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("true");
    expect(panels).toEqual([find(card, "lh-synapse-container")]);
    expect(find(card, "lh-synapse-container").children).toHaveLength(1);
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("false");
    expect(find(card, "lh-synapse-container").children).toEqual([]);
  });

  it("does not offer in the menu what the row already shows", async () => {
    const { menu } = await draw({ phone: true });
    const titles = await menu();
    expect(titles).not.toContain(SYNAPSE);
    expect(titles.filter((title) => title.includes(QUEUE) || title.includes(c(t, "EXPLAINER_ALREADY")))).toEqual([]);
    expect(titles).toContain(c(t, "EDIT_CARD"));
  });

  it("shows a card that is already queued as done", async () => {
    const { card } = await draw({ phone: true, queued: true });
    expect(features(card)).toEqual([SYNAPSE, QUEUED]);
    const queue = drawn(card).find((el) => el.hasClass("lh-queue-btn"));
    expect(queue.hasClass("is-done")).toBe(true);
    expect(queue.attrs["aria-disabled"]).toBe("true");
  });

  it("keeps hints and map apart, as the menu entry did: the map replaces the hints and gives them back", async () => {
    const { card } = await draw({ phone: true, hints: 2 });
    const synapse = drawn(card).find((el) => el.hasClass("lh-ans-feature"));
    expect(hintsShown(card)).toBe(2);
    await synapse.click();
    expect(hintsShown(card)).toBe(0);
    expect(find(card, "lh-synapse-container").children).toHaveLength(1);
    await synapse.click();
    expect(hintsShown(card)).toBe(2);
    expect(find(card, "lh-synapse-container").children).toEqual([]);
  });

  it("shows Synapse as pressed when the map was opened before the answer, and closing it brings the hints back", async () => {
    const { card } = await draw({ phone: true, hints: 1, synapseOpen: true });
    const synapse = drawn(card).find((el) => el.hasClass("lh-ans-feature"));
    expect(synapse.attrs["aria-pressed"]).toBe("true");
    expect(order(card).slice(0, 3)).toEqual(["lh-answer-block", "lh-answer-features", "lh-synapse-container"]);
    expect(find(card, "lh-synapse-container").children).toHaveLength(1);
    expect(hintsShown(card)).toBe(0);
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("false");
    expect(hintsShown(card)).toBe(1);
  });

  it("leaves out Synapse for a card that links to nothing", async () => {
    const { card, menu } = await draw({ phone: true, hasLinks: false });
    expect(features(card)).toEqual([QUEUE]);
    expect((await menu()).some((title) => title.startsWith(SYNAPSE))).toBe(false);
  });

  it("leaves out the queue while browsing a finished deck", async () => {
    const { card } = await draw({ phone: true, browseOnly: true });
    expect(features(card)).toEqual([SYNAPSE]);
  });

  it("draws no row without Pro", async () => {
    const { card, menu } = await draw({ phone: true, pro: false });
    expect(find(card, "lh-answer-features")).toBeUndefined();
    expect(order(card)).toEqual(["lh-answer-block", "lh-synapse-container", "lh-open-note"]);
    const titles = await menu();
    expect(titles).not.toContain(SYNAPSE);
    expect(titles).not.toContain(QUEUE);
  });
});

describe("review card on a phone, before the answer", () => {
  it("has no row, and keeps Synapse in the menu", async () => {
    const { card, menu } = await draw({ phone: true, answerShown: false });
    expect(find(card, "lh-answer-features")).toBeUndefined();
    const titles = await menu();
    expect(titles).toContain(SYNAPSE);
    expect(titles).not.toContain(QUEUE);
  });

  it("shows Synapse in the menu as unavailable for a card that links to nothing", async () => {
    const { menu } = await draw({ phone: true, answerShown: false, hasLinks: false });
    expect(await menu()).toContain(`${SYNAPSE} (off)`);
  });
});

describe("review card on a desktop, answer shown", () => {
  it("keeps both entries in the answer header and draws no row under the card", async () => {
    const { card } = await draw({ phone: false });
    const header = find(card, "lh-answer-header");
    expect(header.children.map((el) => [...el.cls][0])).toEqual(["lh-answer-label", "lh-answer-features", "lh-answer-fmt-btns"]);
    expect(features(header)).toEqual([SYNAPSE, QUEUE]);
    expect(order(card)).toEqual(["lh-answer-block", "lh-synapse-container"]);
  });

  it("leaves the hints above the answer when the map opens below it", async () => {
    const { card } = await draw({ hints: 2 });
    const synapse = drawn(card).find((el) => el.hasClass("lh-ans-feature"));
    await synapse.click();
    expect(synapse.attrs["aria-pressed"]).toBe("true");
    expect(hintsShown(card)).toBe(2);
    expect(find(card, "lh-synapse-container").children).toHaveLength(1);
  });

  it("applies the same gates: no Synapse without links, no queue while browsing, neither without Pro", async () => {
    expect(features((await draw({ hasLinks: false })).card)).toEqual([QUEUE]);
    expect(features((await draw({ browseOnly: true })).card)).toEqual([SYNAPSE]);
    expect(features((await draw({ pro: false })).card)).toEqual([]);
  });
});
