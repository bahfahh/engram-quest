import { describe, it, expect } from "vitest";
import { parseFlashcards } from "../src/review/helpers.js";

describe("parseFlashcards — fenced mode (--- blocks)", () => {
  it("parses a simple fenced Q/A card", () => {
    const md = `---
Q: What is a derivative?
A: The instantaneous rate of change.
---`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("What is a derivative?");
    expect(cards[0].back).toBe("The instantaneous rate of change.");
  });

  it("preserves blank lines inside fenced answer", () => {
    const md = `---
Q: Explain Stripe
A: Stripe handles:

- payment_intent
- retry / failure

👉 You only receive the result
---`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Explain Stripe");
    expect(cards[0].back).toContain("payment_intent");
    expect(cards[0].back).toContain("👉 You only receive the result");
  });

  it("parses multiple Q/A cards inside one fenced block", () => {
    const md = `---
Q: Question one?
A: Answer one.

Q: Question two?
A: Answer two.
---`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Question one?");
    expect(cards[1].front).toBe("Question two?");
  });

  it("does not break existing unfenced Q/A cards", () => {
    const md = `Q: Simple question?
A: Simple answer.`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Simple question?");
  });

  it("mixes fenced and unfenced cards in same note", () => {
    const md = `Q: Unfenced card?
A: Unfenced answer.

---
Q: Fenced card with

blank lines in answer
A: Fenced answer.
---`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Unfenced card?");
    expect(cards[1].front).toBe("Fenced card with\n\nblank lines in answer");
  });
});
