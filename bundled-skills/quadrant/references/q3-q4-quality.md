# Q3 & Q4 Quality Guide

Q3 (verbal IP) and Q4 (visual IP) are where Quadrant Cards live or die. Q1/Q2 are mechanical;
these two carry the memory. Read this before writing them.

## Q3 — Verbal IP (the metaphor)

**Goal:** turn Q1/Q2 into a vivid mental picture so abstract content becomes concrete. Q3 is not
a shorter Q2 — it is a *different memory interface* (from logic to imagery).

Techniques, in priority order:
1. **Metaphor** — "Bedrock = a phone call, SageMaker = renting a whole office building". Strongest.
2. **Analogy** — "like sending one letter by truck".
3. **Contrast** — "X is like A vs Y is like B" (for decisions / binaries).
4. **Homophone/wordplay** — only when a human supplies it. AI-forced homophones are almost always bad.

**Forbidden (real pitfalls from testing):**
- ❌ AI-forced keyword-chain mnemonics, e.g. compressing Q2's four words into single characters
  with no metaphor, no story, no picture. That is not memory, it is noise.
- ❌ Acronym mnemonics (don't work well in Chinese; weak in English too).
- ❌ Re-shortening the Q2 answer. Q3 must change the *interface*, not the length.

**The pass test (use this every time):** close your eyes; when the Q3 text surfaces, can you
*directly see a picture*? See one → pass. See nothing → rewrite.

Good Q3 examples:
- "Office building vs phone call" (Bedrock decision)
- "The flywheel spins faster the more people use it" (one image, not a word-chain)

Bad Q3 example:
- "人→料→腦→爽" — four single characters forced from Q2's terms. No metaphor, no picture. Rewrite
  into one image like the flywheel line above.

## Q4 — Visual IP (the image)

**Goal:** carry Q3's metaphor into one concrete image so visual memory takes over. The book draws
by hand — the point is **vivid, absurd, memorable**, not "well drawn". Electronically, the safe
path is emoji, not AI geometry.

Visual strategy by content type:

| Content type | Visual method | Recipe |
|---|---|---|
| Cycle / process / flywheel | CSS spin animation + emoji nodes + dashed SVG arrows | A |
| Binary / decision / contrast | Two-panel comic, big emoji + red/green + VS badge | B |
| Single metaphor object | One big emoji + label | C |
| Genuine static structure / architecture | Hand-drawn SVG (high risk) | D |
| Comparison table / parallel relations | Don't draw — use text contrast instead | — |

## Q4 quality checklist (tick all before reporting done)

| # | Check | Standard |
|---|---|---|
| 1 | Is the main visual an emoji or AI-drawn geometry? | Must be emoji. AI geometry → fail |
| 2 | Color count | ≤ 3 main colors (emoji's own colors don't count) |
| 3 | Label readability | ≥ 10px at ~480px width |
| 4 | Does it carry Q3's metaphor? | Must map to it. Unrelated image → fail |
| 5 | Eye-close test | Look 5s, close eyes, can you reproduce it? No → too complex, redo |
| 6 | Relationship to Q2 | Image must reinforce Q2, never contradict it |

## Failure cases (do not repeat)

| Failure | Why it's bad | Fix |
|---|---|---|
| Azure robot (brain head + dictionary hands + shield body) stacked from SVG primitives | AI geometry → broken proportions, stiff lines | Three big emoji (🧠 📖 🛡) side by side + labels |
| "人→料→腦→爽" character-chain mnemonic | Forced, no metaphor, no picture | One metaphor sentence ("the flywheel spins itself") |
| One image stuffed with 6 small emoji + 4 lines + 3 labels | Visual density too high, unmemorable | Split into two images, or cut to 3 elements |
| SVG with gradients + shadows to look "polished" | Weak AI color taste → looks amateur | Flat fill + thin border only |

## Why these judgments

- AI (including Claude) makes weak pure-geometry SVG — verified by the Azure-robot failure.
- Emoji are a reliable visual primitive — system-font rendered, immune to AI taste.
- CSS animation clearly helps "process" content — a spinning vs static flywheel feels very different.
- Forced mnemonics are worse than none — AI can't produce natural Chinese homophones; forced ones
  interfere with memory.
- Metaphor is what AI is good at — "Bedrock = phone call, SageMaker = whole office" is well within reach.
