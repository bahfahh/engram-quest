// Every review card hands Obsidian an owner for the markdown it draws (ticket-065). Without one, what
// the rendered content registers (copy buttons, embeds, other plugins' code blocks) is never cleaned up,
// and Obsidian logs an error each time a deck opens. The owner of the previous card is let go when the
// next card is drawn and when the review window closes.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { drawCard } from "./helpers/review-card.js";

const require = createRequire(import.meta.url);
const obsidian = require("obsidian");

const open = [];
afterEach(() => { open.splice(0).forEach((card) => card.done()); vi.restoreAllMocks(); });

describe("review card markdown has an owner", () => {
  it("passes a loaded Component to every render of the card", async () => {
    const render = vi.spyOn(obsidian.MarkdownRenderer, "renderMarkdown");
    const card = await drawCard({ hints: 1 });
    open.push(card);
    expect(render.mock.calls.length).toBeGreaterThan(0);
    for (const call of render.mock.calls) {
      expect(call[3]).toBeInstanceOf(obsidian.Component);
      expect(call[3].loaded).toBe(true);
    }
  });

  it("lets the previous card's owner go on the next draw and when the window closes", async () => {
    const card = await drawCard();
    open.push(card);
    const first = card.session._mdOwner;
    card.session._renderCardContent(card.session.cards[0]);
    const second = card.session._mdOwner;
    expect(second).not.toBe(first);
    expect(first.unloads).toBe(1);
    card.session.onClose();
    expect(second.unloads).toBe(1);
    expect(card.session._mdOwner).toBeNull();
  });
});

describe("single-card review window markdown has an owner", () => {
  it("renders the card with a loaded Component and lets it go when the window closes", () => {
    const { openReviewCardModal } = require("../src/review/modal.js");
    const render = vi.spyOn(obsidian.MarkdownRenderer, "renderMarkdown");
    const deps = { computeFsrs: () => ({ interval: 1 }), translate: (_s, key) => key };
    openReviewCardModal({}, { front: "Q", back: "A", notePath: "n.md" }, null, {}, deps);
    const owner = render.mock.calls[0][3];
    expect(owner).toBeInstanceOf(obsidian.Component);
    expect(owner.loaded).toBe(true);
    obsidian.Modal.lastCreated.onClose();
    expect(owner.unloads).toBe(1);
  });
});
