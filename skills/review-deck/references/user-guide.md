# Review Deck User Guide

Review Deck is the flashcard and spaced-repetition module in EngramQuest.

## Basic setup

1. Ask an AI tool to build a review deck for a topic, or create notes manually.
2. Cards use `question :: answer`.
3. By default, the plugin scans notes tagged like `flashcards/topic`.
4. If you enable legacy `::` scanning in plugin settings, untagged flashcard notes can also be included for migration.
5. Ask an AI tool to generate review-deck hints.

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

- Hints live in `engram-review/hints/`
- Review progress lives in SR comments in the source note

## Editing and deleting cards

You can ask an AI tool to fix or remove cards at any time:

- To fix a card: "Fix the card [front text] in [note name]"
- To delete a card: "Delete the card [front text] from [note name]"
- To remove all hints for a note: "Remove hints for [note name]"

The AI will update both the source note and the hints JSON in `engram-review/hints/`.
