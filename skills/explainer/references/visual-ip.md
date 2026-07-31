# Visual IP — Memory Anchor & Diagram Rules

The memory anchor (section ③) and the diagrams are where an Explainer beats a wall of text.
These rules come from real failures in the predecessor feature — do not relearn them the hard way.

## The memory anchor (one per page)

**Goal:** compress the whole concept into one concrete image the learner can replay with closed
eyes. When the anchor surfaces in memory, the mechanism should unfold from it.

Structure of the anchor block (see any example page):

```
[tag]    🏷 主視覺記憶錨          ← small labeled pill
[scene]  🚗🔑 ➜ 🎫               ← the image, 34–40px emoji composition
[line]   Access token = 代客泊車鑰匙  ← one bold sentence naming the mapping
[note]   1–2 lines grounding the metaphor in everyday experience
[optional contrast pair]           ← two mini-cards when the metaphor is a versus
```

**The pass test:** close your eyes; when the anchor line surfaces, do you *see a picture*?
See one → pass. See nothing → rewrite the metaphor, not the drawing.

Metaphor quality, in priority order:
1. **Everyday-object metaphor** — valet key, dictionary thumb-index, sealed registered letter. Strongest.
2. **Analogy to a familiar process** — "like phoning vs renting an office".
3. **Contrast pair** — "X is the postcard, Y is the sealed letter" (for either-or concepts).

Forbidden (verified failures):
- ❌ Forced keyword-chain mnemonics (compressing terms into characters with no image). Noise, not memory.
- ❌ Acronym mnemonics — weak in English, near-useless in Chinese.
- ❌ A metaphor that merely restates the definition shorter. The anchor must switch the interface
  from logic to imagery, not compress the text.

## Diagram rules (all figures on the page)

**Emoji-first, always.** Emoji render via system fonts, look right in both themes, and are immune
to AI drawing taste. AI-composed geometric SVG (robots assembled from primitives, gradient-heavy
"polished" art) reliably looks broken — it is banned.

Allowed building blocks:
- Emoji compositions in a line (`🏢—🌉—🏢`) or grid.
- CSS boxes + borders for structure: stack layers, journey stations, cast grids, timelines with
  a connector line, simple trees.
- Text arrows (`→ ↓ ↙↘ ~`) between elements.
- Small CSS animation only when the concept *is* motion (a spinning cycle). Static otherwise.

Quality checklist per figure:
| # | Check | Standard |
|---|---|---|
| 1 | Main visual is emoji/CSS boxes, not drawn geometry | drawn geometry → redo |
| 2 | ≤3 main colors (emoji's own colors don't count) | more → simplify |
| 3 | Caption present | every figure gets a one-line muted caption stating what to see |
| 4 | Eye-close test | look 5s, close eyes, reproduce it? no → too dense, split or cut |
| 5 | Figure reinforces the adjacent text | decorative-only figure → delete it |

## Density

One idea per figure. A figure with 6 small emoji + 4 arrows + 3 labels is unmemorable — split it
into two figures or cut to 3 elements. The page can have many figures; each must stay simple.
