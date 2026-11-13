// Pressing Synapse brings the relation map into view (ticket-055). The map is read when it is first
// opened, so it starts as a one-line "loading" panel; the scroll that shows it used to run then, and
// stopped at that line while the map itself drew below the visible card. The card now scrolls once the
// map is drawn.
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { drawCard, find, FakeEl, CARD } from "./helpers/review-card.js";

const require = createRequire(import.meta.url);
const { ReviewSessionModal } = require("../src/review/session.js");

const open = [];
afterEach(() => open.splice(0).forEach((card) => card.done()));

describe("the map scrolls into view when it is opened", () => {
  it("hands the card's scroll to the panel, and the scroll targets the map's own container", async () => {
    const card = await drawCard({ synapseOpen: true });
    open.push(card);
    const container = find(card.card, "lh-synapse-container");
    expect(card.loaded).toHaveLength(1);
    expect(container.scrolls).toBeUndefined();
    card.loaded[0]();
    expect(container.scrolls).toEqual([{ block: "nearest" }]);
  });

  it("does not scroll when the map has been closed in the meantime", async () => {
    const card = await drawCard({ synapseOpen: true });
    open.push(card);
    const container = find(card.card, "lh-synapse-container");
    card.session.synapseOpen = false;
    card.loaded[0]();
    expect(container.scrolls).toBeUndefined();
  });
});

describe("the panel scrolls after it has drawn, not before", () => {
  const draw = async (load) => {
    const session = Object.create(ReviewSessionModal.prototype);
    Object.assign(session, { answerShown: true, plugin: { settings: { language: "zh-tw" } }, _synapse: { ready: false, load } });
    const parent = new FakeEl();
    const order = [];
    session._renderSynapsePanel(parent, CARD, { language: "zh-tw" }, () => {}, () => order.push("drawn"), () => order.push("scrolled"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    return order;
  };

  it("draws the loaded map first and scrolls to it second", async () => {
    expect(await draw(() => Promise.resolve(true))).toEqual(["drawn", "scrolled"]);
  });

  it("neither draws nor scrolls when Synapse is not allowed (no licence, switched off)", async () => {
    expect(await draw(() => Promise.resolve(false))).toEqual([]);
  });
});
