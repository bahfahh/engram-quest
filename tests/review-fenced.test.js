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

describe("parseFlashcards - comment card blocks", () => {
  it("keeps markdown separators inside %%card%% answers", () => {
    const md = `%%card%%
Q: What is an apple?
A:
A fruit.

---

This separator is part of the answer.
%%card%%`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("What is an apple?");
    expect(cards[0].back).toContain("---");
    expect(cards[0].back).toContain("This separator is part of the answer.");
  });

  it("keeps blank lines, tables, and code blocks inside %%card%% answers", () => {
    const md = `%%card%%
Q: Explain the result
A:
Paragraph one.


| A | B |
|---|---|
| 1 | 2 |

\`\`\`js
const x = "---";
\`\`\`
%%card%%`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].back).toContain("Paragraph one.");
    expect(cards[0].back).toContain("|---|---|");
    expect(cards[0].back).toContain('const x = "---";');
  });

  it("parses multiple %%card%% blocks in order", () => {
    const md = `%%card%%
Q: First?
A: One
%%card%%

%%card%%
Q: Second?
A: Two
%%card%%`;
    const cards = parseFlashcards(md);
    expect(cards.map((card) => card.front)).toEqual(["First?", "Second?"]);
  });

  it("ignores an unclosed %%card%% block", () => {
    const md = `%%card%%
Q: Broken?
A:
This should not become a card.`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(0);
  });

  it("accepts whitespace and case variants of the %%card%% fence", () => {
    // Ctrl+/ in Obsidian inserts `%% %%` and users often type `card` with surrounding spaces.
    const md = `%% card %%
Q: With inner spaces?
A: Yes
%% card %%

%%CARD%%
Q: Uppercase?
A: Yes
%%CARD%%

%%  Card  %%
Q: Mixed case + multi-space?
A: Yes
%%  Card  %%`;
    const cards = parseFlashcards(md);
    expect(cards.map((card) => card.front)).toEqual([
      "With inner spaces?",
      "Uppercase?",
      "Mixed case + multi-space?",
    ]);
  });

  it("matches an opening `%% card %%` with a closing `%%card%%` (mixed forms)", () => {
    const md = `%% card %%
Q: Mixed close?
A: Yes
%%card%%`;
    const cards = parseFlashcards(md);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Mixed close?");
  });
});
