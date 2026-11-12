# 02 Content: from a period of notes to topics, packs and a film plan

Notes differ completely between people: tidy maps with links, loose daily notes, clippings with a line of comment, long essays. Nothing here assumes a form. Use the structure the person already made when there is one, and build the minimum yourself when there is not.

## 1. Scope: what was touched

```bash
python3 .claude/skills/engram-quest-episodic-review/scripts/collect.py --vault . --start 2026-10-01 --end 2026-10-31 --out <work>/collect
```

- With git history covering the period it uses commits (renames followed, bulk move days set aside). Without it, file modification times; say so in the report, since notes edited after the period are then missed.
- A shallow clone has no history for the period. Deepen it without downloading file contents: `git fetch --filter=blob:none --shallow-since=<date> origin <default branch>`.
- When Obsidian is open, `scripts/obsidian_index.js` returns links, backlinks, embeds and tags in one call.
- Skip system and generated folders, and `Clippings/`.

## 2. Topics

A topic is a group of notes about one thing. It is the unit of everything that follows.

- Prefer the person's own grouping: a folder, a map folder with numbered notes, a canvas, a hub note that links the group.
- With no structure, group by what the notes are about: shared tags, links between them, titles that mention each other, the same source or project.
- **Take the topic whole.** Notes of the group that were not touched in the period belong to it. Its first note may be months old; say so, it is part of the story.
- Give each topic a stable id (`t-<slug>`) and keep it across periods.
- **Cache.** `engram-quest/episodic-review/topics/<id>/topic.json` records the modification time of each source note. If none changed, reuse the entry and only refresh the context line. Reading is the largest token cost of a review; do not pay it twice.

## 3. Reading

- Read each note whole, as it is now. How it changed along the way is not content. A change of mind counts only when the note itself states it.
- Render a canvas to an image before reading it: groups, arrows and edge labels are the author's relations. `node scripts/render_canvas.cjs <list file: one vault-relative .canvas path per line> <output folder> [vault]` (set `CANVAS_FONT_DIR` to a `@fontsource/noto-sans-tc` folder when the machine has no CJK font).
- Use the figures the notes already contain before drawing new ones. Copy the image into the film project (`figs/`) and show it with the `figure` beat, which points at the places worth looking at one by one.
- Many notes in one topic: read the hub, map or index first, then the notes it leans on, then the ones touched in the period.
- Unfamiliar term: search the vault, then the web, before writing a sentence about it.
- When two notes disagree, do not choose for the author. Leave the point out of questions, and list it in the report.

## 4. Depth

How far the notes go decides how far the review goes.

| Level | The notes contain |
|---|---|
| L1 | names: what exists |
| L2 | concepts: what it is, why it matters |
| L3 | method: steps, rules, how to choose, code, checklists |
| L4 | cases: use on a real project, incidents, measurements |

Show a topic at its deepest level. Never fill a gap with outside material.

A level counts only when it is the author's own. A plan that has not been carried out is L3, however many cases it quotes from other people: those cases are shown as someone else's numbers, with their source, and the close says the plan is still untried.

## 5. The pack entry (one JSON per topic)

`templates/topic.example.json` is a complete entry. Write every text field in the language of the notes.

| Field | What it holds |
|---|---|
| `id`, `title`, `domain` | stable id; a short name; the person's own top-level area |
| `question` | what the topic answers, one plain question |
| `answer`, `why` | the conclusion in one sentence; the reason in one or two |
| `context` | one line for the author: what they were doing when they met this. Month and early/mid/late only |
| `depth` | L1-L4 |
| `notes` | vault paths of the notes read |
| `points` | three to five points in the notes' own order |
| `rule`, `case`, `open` | a decision rule the notes state; a concrete case; what the notes leave undecided. Empty string when absent |
| `quick` | `{q, clue, a, because}`: one short retrieval question |
| `apply` | `{q, a}`: the idea applied to a situation the notes do not contain |
| `cards` | three to five Review Deck cards `{kind: why|how|contrast|apply, q, a}` |

Writing the questions:

- Ask for reasons and choices: why, how to decide, what differs, when to use. Never dates, file names or recitation.
- A **clue is a cue, not the answer**: a word or image that was present at learning. If reading the clue answers the question, rewrite the clue.
- An answer goes from the nature of the thing down to where it is used.
- A first mention of a term carries a few words that explain it.
- Keep the person's judgement and the sources they quote apart.

## 6. Building the pack

```bash
python3 .claude/skills/engram-quest-episodic-review/scripts/build_pack.py --vault . --packs <dir with one json per topic> --period 2026-10 [--lang zh-tw]
```

It writes, without any model call:

- the topic cache `engram-quest/episodic-review/topics/<id>/topic.json`
- Review Deck cards `engram-review/ai-cards/<prefix>-<title>.md` and their hints (the first hint level is the context line and the topic's question; it never contains the answer)
- `engram-quest/episodic-review/packs/<period>/pack.json` and an overview page
- a film ranking: depth, how often the topic's existing cards were answered badly, and whether it has any cards at all

The ranking is a suggestion. With little review history it mostly reflects depth; say so when reporting it.

## 7. Relations between topics

```bash
python3 .claude/skills/engram-quest-episodic-review/scripts/topic_links.py --vault . --period 2026-10 --out <work>/links.json
```

- A relation exists when notes of two topics link to each other. Notes that link to almost everything (indexes, subscription lists, skill trees) are hubs and are left out, or every topic would relate to every other.
- A note listed under two topics is reported as `shared`, not as a link: its own links would otherwise count for both topics. Read it and decide: it may be a real bridge (then write the sentence), or a sign that the two topics are one.
- With no links at all, the script falls back to titles mentioned in the text; treat those as candidates to verify by reading.
- **Each relation needs one sentence** saying what it is, taken from what the linking note says at that link. If you cannot write the sentence, do not draw the line.
- Topics with no relation are returned as `isolated`. Show them as such.

## 8. For a topic that becomes a film

### Skeleton

Ask of the whole group of notes: **which three to five questions are these notes answering?** That list is the film's skeleton and its chapter order. It comes from this topic; do not reuse another topic's.

Ways it shows up:

- the headings of a map or index note, or the numbered notes of a map folder
- the questions the notes literally ask
- a sequence the subject has by itself: steps of a process, layers, stages over time
- the decisions the person had to make

Check it: every note should answer at least one question, and no question should be answered by a single sentence.

Cases that come up:

- **The author's numbering is not automatically the skeleton.** A map folder numbered 01-07 is the order things were filed in. Use it when its headings are questions the content answers; otherwise read through it for the questions underneath.
- **A note that answers none of the questions.** Either the skeleton is missing a question, or the note is a side branch. A side branch stays out of the film and is listed under "left out" in the plan; it still gets its cards.
- **A film that walks fewer questions than the skeleton has** (a short tier, or only some questions are deep enough). The skeleton screen still shows all of them, with the ones not walked dimmed and one line saying where they live (their cards). The relation map and the recall then cover only the walked questions, and the close does not raise open points from the others.
- **Content that is not concepts.** The questions then follow what the content is: a decision (what was at stake, the options, what decided it), an investigation (the claim, the evidence, how far it holds), a plan (the goal, the steps, how it will be checked).

### Facets

A concept is understood from several sides. For each concept in a chapter, see which sides the notes cover, and show those:

what it is / what it looks like / an example / what it is good at / what it costs / when to choose it / what happens when it is misused / how it differs from its neighbour / how it changed over time / what it connects to

Two or three well-chosen facets beat a full table. A facet the notes do not cover is not shown.

That list suits concepts. Other content has other sides:

| The content is | Sides worth showing |
|---|---|
| a decision | the options / the criteria / what was chosen / why / what it costs / what would change it |
| evidence | the claim / where it comes from / the number / how strong it is / what it does not show |
| a plan | the goal / the steps / when / how it is checked / what has been done so far |
| an incident | what happened / the cause / the fix / what is now done differently |

### Sources within the topic

Record which note answers which skeleton question. That mapping is the relation map shown at the end of the film, and it is also where each chapter's content comes from.

### The plan

Fill `templates/film-plan.md` before building: the skeleton, per chapter the concepts with their facets and the presentation chosen for each, the case that runs through, the recall questions, the relations. Building without it produces a sequence of unrelated screens.
