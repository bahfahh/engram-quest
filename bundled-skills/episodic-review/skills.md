---
name: engram-quest-episodic-review
description: Turn the notes a person touched over a period (usually one month) into recall material that actually helps memory - a recall pack for every topic (one-line overview plus retrieval questions that go into the Review Deck), and, for the topics worth it, a full-frame recall film built on maps and diagrams (a skeleton of questions first, illustrated concepts, a relation map at the end, then recall). Use when the user asks for "this month's episodic review", "recall film", "回顧片", "情境回顧", "情境記憶", a short / medium / long review, or pastes a request created by the EngramQuest plugin's Recall tab. This reviews what the user already wrote; it is not a teaching video (that is engram-quest-animated-course).
---

# Episodic review

> **Custom area.** Before you plan anything, read `custom-area.md` in this skill's folder: where the user's own preferences and assets live (`engram-quest/custom/`), how each choice is decided, and why keys never go into files.

## In one line

**Order is what makes notes memorable.** Read the whole topic as it stands now, find the few questions it answers, and show the content hanging on that skeleton: one thing at a time, every relation named, the picture doing the explaining. Then make the viewer retrieve it.

## What this must achieve

A person who wrote these notes months ago is now a stranger to them. After the review they should be able to:

1. Say what each topic is about, what was concluded and why, in their own words.
2. See how the pieces relate: inside a topic, and between topics.
3. Pull it back out without help, now and again later (questions scheduled in the Review Deck).

Films are expensive. A film that is only watched once gives a feeling, not a memory. So the review always produces the cheap, durable part first (the recall pack), and a film only for topics that earn it.

## What gets produced

| Output | For | Cost |
|---|---|---|
| **Recall pack**: one cached content file per topic, retrieval cards in the Review Deck, an overview page, a ranking of which topics deserve a film | every topic touched in the period | reading tokens only, no rendering |
| **Topic film**: one topic, full depth, 4-10 minutes | the one or two topics the tier holds | a few minutes of rendering per film |
| **Month film**: the period's topics by area, the real links between them one at a time, the topics that stand alone, then one quick question per topic | once per period, in the long tier or when asked | generated from the pack and the links; one sentence written per link |
| Links between the two: each film chapter (`videos[].topics`) carries the id of the pack topic it covers | — | — |

## Flow

Read the reference named in each row before doing that step. Steps are goals; decide how much each needs from the request (a request for one named topic skips discovery).

| # | Goal | Read |
|---|---|---|
| 0 | Understand why this exists and the principles of order. Check `engram-quest/videos/episodic-recall/meta.json` for a `pending` request from the plugin: its period and length win. | `reference/01-memory-principles.md`, `reference/05-plugin-contract.md` |
| 1 | **Scope**: which notes were touched in the period, grouped into topics. A topic is always taken whole, including its older notes. Reuse cached topics whose notes have not changed. | `reference/02-content.md` §1-2 |
| 2 | **Read**: every topic's notes as they are now. For each topic write the pack entry: the question it answers, the conclusion, why, one line of context, retrieval questions. | `reference/02-content.md` §3-5 |
| 3 | **Build the pack** with `scripts/build_pack.py`; compute topic relations with `scripts/topic_links.py`. | `reference/02-content.md` §6-7 |
| 4 | **Choose** what becomes a film (length tier, ranking, the user's word). Ask once if the user has not said and can be asked. | `reference/04-production.md` §1 |
| 5 | For each chosen topic: find its **skeleton** (the 3-5 questions its notes answer) and the **facets** each concept has in the notes. Write the film plan. | `reference/02-content.md` §8, `templates/film-plan.md` |
| 6 | **Choose how each part is shown** from the shape of the content. | `reference/03-presentation.md` |
| 7 | **Build** the film from `templates/film/`; check stills and reading time before the full render. | `reference/04-production.md` §2-4 |
| 8 | **Deliver** the film, write chapters with topic ids, mark the plugin request done, report what was not taken. | `reference/04-production.md` §5, `reference/05-plugin-contract.md` |
| 9 | **Refresh Synapse when it is already on**, after the pack is built and any film is delivered. | below |

Read `reference/06-pitfalls.md` once before step 5. Every item there happened.

### Step 9: refresh Synapse when it is already on

Synapse (Pro) links review cards the person still struggles with to what they have studied, recall topics included. Someone who has it running should not have to refresh it separately. At the end of a run that built a pack, check both:

- `engram-review/synapse/_status.json` exists and holds `enabled: true`
- the Synapse skill is available in the tool you are running in (`engram-synapse`, installed as `engram-quest-synapse` next to this skill)

Both hold → run the Synapse skill in its default mode (no `--full`) without asking, and put the one line it hands back into the final report (`Synapse: 5 cards paired, 3 relations added`, `Synapse: already up to date`); if it hands back nothing, add nothing. Anything else → skip it and do not mention Synapse: starting Synapse is the person's own step, not something to suggest here.

The pack and the films are the deliverable and Synapse is a follow-up. If it fails, the review is still done: report it as delivered and add `Synapse: not updated (<reason>)`. The retrieval cards made in this run have no review history yet, so Synapse does not link them until they have been reviewed once; do not report them as linked.

## Things that are fixed

These are product decisions, technical contracts or matters of correctness. Everything else in this skill is purpose, reason and options: choose what serves the content.

1. **Content fills the frame.** Never place the content on a screen, wall or page inside a pictured scene. The viewer is already looking at a screen.
2. **Only what the notes say.** Every sentence on screen traces back to a note as it is now. Nothing is added from outside; what the notes do not say is left out or stated as open. Invented example values are marked as illustrative.
3. **A topic is taken whole.** The period only decides which topics come up. If one note of a topic moved this month, the whole group is read, older notes included.
4. **Relations are drawn only where the notes relate.** A line needs a sentence that says what the relation is. A topic with no relation is shown as standing alone, and that is worth saying.
5. **The viewer must retrieve.** Every film asks, waits, then answers; clues are on screen before the question; at least one question applies the idea to a case the notes do not contain.
6. **Do not read `Clippings/`.** Look up unfamiliar terms before writing about them.
7. **Language.** The film, the pack and the cards use the language of the notes (or what the user asks for). This skill's own files stay in English. Decide with `scripts/film_lang.py`.
8. **Field names in `meta.json`, `pack.json` and `topic.json` are a contract** with the plugin: do not rename them (`reference/05-plugin-contract.md`).
9. **Background sound is music**, never noise beds. Credits for the samples go into the delivered entry.

## Files

```
SKILL.md
reference/
  01-memory-principles.md   why a review helps memory; the principles of order; acceptance
  02-content.md             scope, reading, the pack entry, relations, skeleton and facets
  03-presentation.md        choosing a presentation from the shape of the content; the look; film structure
  04-production.md          choosing what to film, building, checking, sound, delivering; cost
  05-plugin-contract.md     files and fields shared with the EngramQuest plugin
  06-pitfalls.md            mistakes already made
templates/
  film/                     engine.js, parts.js, patterns.js, look.css, scene.html, film.example.js, film.gallery.js, figs/
  film-plan.md              the plan written before building a film
  topic.example.json        one pack entry
  length.json               the three length tiers (single source, also read by the plugin)
scripts/
  collect.py                notes touched in a period, grouped into topics (git history or mtimes)
  build_pack.py             pack entries -> topic cache, Review Deck cards and hints, overview page, film ranking
  topic_links.py            relations between topics, from links between their notes
  month_film.py             the film.js of a month overview film, from the pack and the links
  film_lang.py              decide the film's language
  studio/                   render_stage.cjs (frame renderer: data, stills, film; holds are captured once), package.json
  music/, mix.py            score generator (one theme per film) and final mix
  deliver.py                compress, poster, meta.json entry
  render_canvas.cjs         an Obsidian canvas as an image, for reading
  obsidian_index.js, doctor.py   doctor.py also warns about anything shaped like a key in engram-quest/custom/
```

## Reporting problems

When a script path, a script or a description in this skill turns out to be wrong, confirm it first (reproduce it, find the line), then tell the user what you found and how you worked around it. If the vault has its own instructions for reporting skill problems, follow them.
