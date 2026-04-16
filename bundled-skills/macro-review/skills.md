---
name: macro-review
description:
  Knowledge condensation review for the EngramQuest plugin (Pro feature).
  Trigger when the user invokes /macro-review, mentions having too many unseen or overdue cards,
  wants to batch-learn a topic, or wants to clear a backlog of flashcards in one session.
  Use this skill whenever the user wants to learn a large set of cards at once, do a bulk review,
  or get through all cards on a topic quickly — even if they do not explicitly say "macro review".
---

# Macro Review Skill

## What This Skill Does

Macro Review solves the "card pile-up" problem: when a user has 50–100 unseen cards,
the sheer number feels overwhelming and they avoid the plugin entirely.

This skill:
1. Finds all unseen/due cards for a given tag
2. Groups them by source note (5–15 cards per group)
3. Teaches each group in plain language, like a teacher giving a 5-minute lesson
4. Asks the user to rate their understanding per group
5. **Writes FSRS scheduling comments directly into the vault markdown files**

After the session, when the user opens the plugin, all grey (unseen) cards are gone —
replaced with blue (learning) or gold (due) cards. The visual change is the psychological win.

## Output Language

Match the language of the user's prompt and source notes. If notes are in Traditional Chinese, teach in Traditional Chinese.

---

## Step 1: Find Cards

Before searching raw files, check for a pre-existing knowledge index or graph in the vault (e.g. `graphify-out/GRAPH_REPORT.md`, `graph.json`). If found, use its community structure to inform card grouping — cards from the same knowledge community can be taught together even if they span multiple source notes.

Parse the user's command for a tag or topic:

```
/macro-review tag:azure
/macro-review azure-ai
幫我學完 azure 的卡片
```

Find relevant notes using this priority.
IMPORTANT: When vault search is needed, use Obsidian CLI (`obsidian search`). For full syntax, query operators, and fallback rules, see `references/obsidian-cli.md`.
- If a flashcard tag was given (e.g. `azure`, `flashcards/azure`):
  `obsidian search query="tag:#flashcards/<tag>" format=json`
- If topic-only (no explicit tag):
  `obsidian search query="<topic>" format=json`
- If Obsidian CLI is not available (command fails):
  `bash scripts/search_vault.sh "<tag-or-topic>" 30`

Then read each note and extract all `question :: answer` lines. For each card, check
whether the line immediately below contains `<!--SR:!...-->` (any format).

Classify each card:
- **unseen**: no SR comment below the card line
- **due**: has SR comment AND the date in it is ≤ today

Ignore cards whose SR date is in the future (already scheduled, not overdue).

Group cards by their source file path. Discard groups with 0 eligible cards.

If no eligible cards found, tell the user clearly and stop.

---

## Step 2: Teach Each Group

For each group (one source note = one group), do the following in sequence.

### 2a. Announce the group

Show a clear header:

```
---
## 群組 X／Y：{Note Title}（{N} 張卡）
```

### 2b. Teach the concepts

Read the full note content. Write a concise explanation (5 minutes to read) that:
- Covers every concept tested by the cards in this group
- Uses plain language, examples, and analogies — not bullet dumps
- Anticipates confusions (e.g., "don't mix this up with X")
- Feels like a real teacher talking, not a Wikipedia summary

### 2c. Show the card list

After teaching, list all cards in this group by their front question only.
Number them so the user can reference them in option 4.

### 2d. Ask for rating

Always use this exact numbered format:

```
這群組你的掌握感如何？

1. ✅ 懂了（Good）
2. 🤔 大概（Hard）
3. ❌ 很陌生（Again）
4. ❓ 繼續解釋，我不懂第 [N] 張
```

Wait for the user to reply before proceeding to the next group.

---

## Step 3: Handle Each Rating

### If user picks 1 / "懂了" / Good

Apply **Good** rating to all cards in this group. Then say:

```
✅ 已更新 {N} 張卡片的 review-deck 記憶紀錄
   狀態：灰色（未學習）→ 藍色（學習中）
   下次複習：明天（FSRS 將根據你的回答繼續調整）
```

Then immediately move to the next group.

### If user picks 2 / "大概" / Hard

Apply **Hard** rating to all cards. Then say:

```
🤔 已更新 {N} 張卡片的 review-deck 記憶紀錄
   狀態：灰色（未學習）→ 藍色（學習中，較快複習）
   下次複習：明天（Hard 排程，下次會更快出現）
```

### If user picks 3 / "很陌生" / Again

Apply **Again** rating to all cards. Then say:

```
❌ 已更新 {N} 張卡片的 review-deck 記憶紀錄
   狀態：灰色（未學習）→ 藍色（學習中，明天需要再學一次）
   建議：明天再跑一次這個群組的 Macro Review
```

### If user picks 4 / "不懂第 N 張"

Re-explain **only that specific card** with:
- A different angle or analogy
- A concrete real-world example
- An answer to what's likely confusing

Then show the 4 options again for the same group. Repeat as many times as needed.
When the user finally picks 1–3, apply that rating to **all cards** in the group,
including the one they asked about.

---

## Step 4: Write SR Data Back

After receiving each group's rating, immediately write SR scheduling data
into `engram-review/sr/{note-name}.json` before moving to the next group.

For each card in the group, update the JSON file at `engram-review/sr/{note-name}.json`
where `{note-name}` is the filename (without `.md`) of the card's source file.

The JSON is a flat object where each key is the card's front text:

```json
{
  "card front text": {
    "due": "YYYY-MM-DD",
    "interval": 1,
    "stability": 3.126,
    "difficulty": 5.315,
    "state": 2,
    "repetitions": 1
  }
}
```

Calculate today's date as `YYYY-MM-DD`. Tomorrow = today + 1 day.

| Rating | Values to write |
|--------|----------------|
| Good (1) | due=tomorrow, interval=1, stability=3.126, difficulty=5.315, state=2, repetitions=1 |
| Hard (2) | due=tomorrow, interval=1, stability=1.183, difficulty=6.508, state=2, repetitions=1 |
| Again (3) | due=tomorrow, interval=1, stability=0.407, difficulty=3.286, state=1, repetitions=1 |

If the file already exists, read it first and merge — only update keys for cards in this group, preserve all other keys.

PROHIBITED: Do NOT write `<!--SR:!...-->` comments into any markdown file.

---

## Step 5: Final Summary

After all groups are done, show a summary:

```
---
## ✅ Macro Review 完成

| 群組 | 筆記 | 卡數 | 評分 |
|------|------|------|------|
| 1 | Azure OpenAI Service | 7 張 | ✅ Good |
| 2 | Azure AI Services | 7 張 | 🤔 Hard |

**共更新 14 張卡片的 review-deck 記憶紀錄**
打開 EngramQuest plugin，灰色卡片已全部消失。
```

---

## Important Rules

- **Never skip writing back** — the whole point is that the plugin reflects the learning.
  If a file write fails, report the error and continue with the next group.
- **Never fabricate context** — the teaching must come from the actual note content.
  If a note is too sparse to teach from, say so and ask the user if they want to skip.
- **Keep groups independent** — finish one group completely (teach → rate → write)
  before starting the next. Don't batch all teaching first.
- **Respect option 4 loops** — a user can ask for re-explanation multiple times.
  Never force them to rate before they're ready.
