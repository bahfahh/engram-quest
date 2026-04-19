# Review Deck User Guide

Review Deck is the flashcard and spaced-repetition module in EngramQuest.

## Basic setup

1. Ask an AI tool to build a review deck for a topic, or create notes manually.
2. Cards use `question :: answer`.
3. By default, the plugin scans notes tagged like `flashcards/topic`.
4. If you enable legacy `::` scanning in plugin settings, untagged flashcard notes can also be included for migration.
5. Ask an AI tool to generate review-deck hints.

## Card formats

Three formats are supported and freely mixable in one note:

| Format | Best for | Syntax |
|---|---|---|
| `::` Q&A | Short answers, one line | `question :: answer` |
| `Q:/A:` Q&A | Multi-line or bullet answers | `Q: question` → `A:` (two blank lines end the card) |
| `{{c1::}}` Cloze | Fill-in-the-blank, Anki-compatible | `{{c1::answer}}` or `{{c1::answer::hint}}` |

## Embedding images in cards

Use Obsidian's wiki-link or standard markdown image syntax inside any card format:

```
Q: What does this diagram show?
![[diagram.png]]
A: The architecture of a microservice system.

Cell structure :: ![[cell-diagram.png]]

{{c1::Mitochondria}} is shown here: ![[cell.png]]
```

Both `![[image.png]]` (wiki-link) and `![](path/to/image.png)` (standard markdown) are supported. Images display directly in the review card during study sessions.

## Hint levels

- `L1`: active recall trigger
- `L2`: real contextual anchor from the vault
- `L3`: narrowing hint

## Example prompts

- `Build a review deck for azure`
- `Update review-deck hints for database notes`
- `Generate flashcards from [note].md`
- `Fix the card "What is X" in my azure note`
- `Delete the card "What is X" from my azure note`

## Storage

- AI-generated cards: `engram-review/ai-cards/`
- Hints: `engram-review/hints/`
- Review progress (SR schedules): `engram-review/sr/`

## Editing and deleting cards

You can ask an AI tool to fix or remove cards at any time:

- To fix a card: "Fix the card [front text] in [note name]"
- To delete a card: "Delete the card [front text] from [note name]"
- To remove all hints for a note: "Remove hints for [note name]"

The AI will update the source note, the hints JSON in `engram-review/hints/`, and (if the card's front text changed) the SR schedule key in `engram-review/sr/`.
