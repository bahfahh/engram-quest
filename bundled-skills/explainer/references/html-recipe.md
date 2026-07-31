# Explainer Page Recipe

The skeleton, design system, and section guidance for every Explainer page. The three files in
`assets/examples/` implement everything here — open the one matching your diagnosis and mirror its
structure with new content.

## Hard technical constraints

- **Self-contained**: inline CSS and vanilla JS only. No external scripts, fonts, images, fetches.
  Obsidian's CSP silently blocks external loads — the page will look broken with no error.
- **postMessage**: outgoing `{ type: "engram-quest-resize", height: documentElement.scrollHeight + 8 }`
  after load; incoming `engram-quest-theme` toggles `body.dark`. Nothing else — no
  `engram-quest-solved`, no scoring, no self-assessment UI.
- **Theme fallback**: when opened standalone (`window.self === window.top`), follow
  `prefers-color-scheme`. The plugin's theme message overrides it when embedded.
- **Responsive**: single column ≤700px wide; grids collapse to one column below ~480px.

## Page skeleton (in order)

```
.origin      ← how this page came to be + diagnosis in natural language
.hero        ← big emoji glyph row + title (a question, not a term) + subtitle
section ①    ← the problem it solves
section ②    ← the map (where the concept lives)
section ③    ← memory anchor (see visual-ip.md)
section ④    ← layered deep-dive
section ⑤    ← common confusions (2–3 items)
section ⑥    ← back to the original card
```

Every section header = numbered chip (1–6) + short title. Titles are questions or claims
("它解決什麼問題", "這支舞為什麼這樣跳"), not textbook headings ("概述", "原理").

## Design system

### CSS variables (define all, both themes)

Structure every page around this variable set, with `:root` (light) and `body.dark` values:

| Group | Variables | Use |
|---|---|---|
| Base | `--paper --ink --muted --line --card-bg` | page, text, secondary text, borders, figure background |
| Accent | `--accent --accent-soft --accent-ink` | chips, banners, anchor block. **Pick a per-page hue that fits the topic** (e.g. green for databases, indigo for auth) — pages should feel individually themed but structurally identical |
| Semantic pairs | `--bad/--bad-soft --good/--good-soft --warn/--warn-soft/--warn-text` | contrast cards, confusion boxes |
| Depth | `--depth1..3` + `-soft` | layered deep-dive block tints |

Rules learned from real dark-mode failures:
- Never hardcode a hex on a colored element — hardcoded backgrounds don't flip with `body.dark`
  while the text inside does, making it invisible in one theme.
- `--warn` needs its own `--warn-text`; `--ink` flips the wrong way against amber backgrounds.
- Any new accent must define both `:root` and `body.dark` values.

### Typography & spacing

- Page: `max-width: 700px`, centered, `line-height: 1.8`, system font stack with "Noto Sans TC".
- Hero glyph 52px, h1 25px, section titles ~17.5px, body 15px, captions/notes 12.5–13.5px muted.
- Sections separated by ~38px. Generous padding inside blocks (14–20px). Whitespace is part of
  the "one concept per screen" feel — do not compress.

## Section guidance

### Origin banner
One or two sentences: which deck/card triggered this page, and the diagnosis phrased as a natural
observation ("原卡把四個步驟背起來了，但沒有交代這支舞為什麼要這樣跳"). Never print the diagnosis
category name or any authoring vocabulary.

### ① The problem it solves
Start from pain, not definition: what breaks / what attack succeeds / what gets slow without this
concept. If the "before this existed" world is vivid (giving Apps your password; scanning a
million rows), open with it. The learner must want the concept before being told what it is.

### ② The map
Pick the diagram that matches the concept's shape:
- Layered thing → **stack diagram** (which layer it adds).
- Process with stations → **journey diagram** (highlight the station this concept owns).
- Multi-party protocol → **cast grid** (who's who + one line each) plus a trust note ("who trusts
  whom" is often the entire key to a protocol).

### ③ Memory anchor
Read `references/visual-ip.md`. One anchor per page.

### ④ Layered deep-dive — the authoring concept

Write this section **shallow to deep, macro to detail**: each layer answers the question the
previous layer raises. Typical ladder: *why the naive approach fails* → *the key idea* → *the
full mechanism*. 2–4 layers; a layer earns its place only if the one below it is needed to
understand it.

This ladder is YOUR production concept. On the page, label each layer by its content
("地基｜為什麼翻那麼貴", "核心原則", "完整五步") — never "淺/中/深", "basic/advanced", or any
depth-level vocabulary. The learner should feel a natural climb, not see the scaffolding.

Inside layers: bold the one load-bearing sentence per layer. Steps in a multi-step mechanism get
a timeline with a "why this step exists" sub-line each — mechanisms are memorable through their
reasons, not their order.

### ⑤ Common confusions
2–3 boxes, each: bold question stating the misconception → correction with the *reason* the
confusion is tempting. Best sources: deck sibling cards (the user filed them together because
they blur together) and classic beginner traps. Skip generic trivia.

### ⑥ Back to the original card
Quote the original card front; answer behind a "看原卡答案" toggle. Closing line pattern: "如果
現在你的反應是『這不就是{anchor}那件事嗎』，這頁就完成任務了。下次這張卡出現在 review deck，
見真章。" — it ties the page back to the anchor and sets the real success criterion (the card's
next review). For Mode A bare topics with no card, write a one-line self-check question instead.

## Diagnosis → structural emphasis

| Diagnosis | Structural shift |
|---|---|
| too-hard | ④ grows: more rungs, starting below the card's level (teach the missing prerequisite as the first layer). ② can shrink. |
| poor-description | ①③ carry the page: strongest possible hook + anchor; ④ re-explains with concrete examples in everyday words. |
| no-context | ② grows into the centerpiece (cast/map/trust); ④ walks the mechanism *on top of* the map so steps become consequences, not a list. |
