# Review Deck User Guide

Review Deck is the flashcard and spaced-repetition module in EngramQuest.

## Basic setup

1. Ask an AI tool to build a review deck for a topic, or create notes manually.
2. Cards use `question :: answer`.
3. By default, the plugin scans notes tagged like `flashcards/topic`.
4. If you enable legacy `::` scanning in plugin settings, untagged flashcard notes can also be included for migration.
5. Ask an AI tool to generate review-deck hints.

## Card formats

Core formats are supported and freely mixable in one note. 🟢 <mark><code>Q:/A:</code></mark> remains the everyday multi-line format; 🟡 <mark><code>%%card%%</code></mark> is only for occasional long pasted AI answers that may contain their own `---` separators.

| Format | Best for | Syntax |
|---|---|---|
| 🟢 <mark><code>Q:/A:</code> Q&A</mark> | Everyday multi-line or bullet answers | `Q: question` → `A:` (two blank lines end the card) |
| 🟡 <mark><code>%%card%%</code> long answer</mark> | Safe mode for long pasted AI answers that may include `---` | Wrap one card between two `%%card%%` lines; everything after `A:` stays in the answer until the closing marker |
| ⚪ <mark><code>::</code> Q&A</mark> | Short answers, one line | `question :: answer` |
| 🧩 <mark><code>{{c1::}}</code> Cloze</mark> | Fill-in-the-blank, Anki-compatible | `{{c1::answer}}` or `{{c1::answer::hint}}` |

Example:

```md
%%card%%
Q: When should I use %%card%%?
A:
Use it only for long pasted AI answers that may contain their own Markdown separators.

---

This separator stays inside the answer.
%%card%%
```

## How do I turn a long AI answer into a Review Deck card?

Use normal 🟢 <mark><code>Q:/A:</code></mark> for everyday cards. Use 🟡 <mark><code>%%card%%</code></mark> when pasting a long AI answer that may contain its own `---` separators, headings, tables, code blocks, or many blank lines.

````md
#flashcards/ai

%%card%%
Q: How should I explain agentic testing?
A:
Agentic testing checks whether an AI system can complete a task reliably, not just whether one function returns the right value.

---

Example:
- Give the agent a realistic task
- Verify the final artifact
- Check logs, tool calls, and failure recovery

```js
expect(result.completed).toBe(true)
```
%%card%%
````

**Why this is safe:** everything after `A:` stays in the answer until the closing <mark><code>%%card%%</code></mark>. The `---` line above is preserved as answer content, so the card will not be cut early. Existing `---` fenced cards still work and do not need to be rebuilt.

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

**Best practice when authoring image cards yourself:**

- Use `%%card%%` so the answer can include extra blank lines around the image without ending the card early.
- Default to 1 image per card. Avoid "what is this image called?" style questions — they can be answered by glancing. Prefer questions that force cross-reference or reasoning across multiple parts of the image.
- Have the answer quote a recognizable element from the image (e.g., a label or arrow) so you can verify whether you got it right.

## Hint levels

- `L1`: active recall trigger
- `L2`: real contextual anchor from the vault
- `L3`: narrowing hint

## Key capabilities

- **FSRS-5 scheduling:** The latest spaced-repetition algorithm — intervals adapt to your actual recall performance, not fixed multipliers.
- **Notes stay clean:** Cards and scheduling data live in `engram-review/`. Your original markdown is never modified — no scheduling comments injected into your notes.
- **Multi-line Q&A:** Both question and answer support multiple lines, embedded images, and code blocks. A single blank line within a card is fine; two blank lines end the card.
- **Long pasted answers:** `%%card%%` keeps `---`, blank lines, tables, and code blocks inside the answer. It is an extra safe mode, not a replacement for normal `Q:/A:`.
- **Image support:** Embed `![[image.png]]` or `![](path)` in any card format — images render directly in the review session.
- **Card formats:** `::` one-liner, `Q:/A:` multi-line, `%%card%%` long answer, and `{{c1::}}` Cloze — freely mixable in one note.
- **Triple-level Hints:** L1 (active recall), L2 (contextual anchor from your vault), L3 (narrowing hint). L2 links new knowledge to things you already know.
- **AI Skills integration:** Generate cards, hints, and quest challenges from your notes using Claude Code, Gemini CLI, or Cursor.
- **Source note link:** Every card connects back to its origin note — tap to read context, then resume where you left off.
- **Anki compatible:** AI-generated cards use `question :: answer` format with `TARGET DECK` frontmatter — natively compatible with Obsidian_to_Anki.

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
