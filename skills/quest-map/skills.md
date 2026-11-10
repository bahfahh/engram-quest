---
name: engram-quest-map
description:
  Generate HTML-first Quest Maps for the EngramQuest plugin from notes, topics, Lesson Academy courses, or other EngramQuest artifacts.
  Trigger when the user asks to create, update, redesign, or explain a quest map; turn study material into practice missions; build easy/medium/hard quests; or create Boss Battle style applied challenges.
---

# Quest Map Skill

A quest map is where a learner finds out whether they can **use** what they know. Each mission
puts them in a situation they have not seen, with the real material in front of them, and asks
them to do what someone with the skill would do. Lessons explain and review decks drill recall;
a quest map is neither. It is practice, and it is scored.

## What you produce

A quest package the plugin opens from its Quest Map tab:

- one folder, `engram-quest/quests/{questSlug}/`
- a `meta.json` describing the map and its nodes
- one self-contained HTML file per mission and boss node

`references/html-first-contract.md` has the exact shape and what the plugin does with it.
Progress and scores are kept by the plugin in `engram-quest/state/`, never in the package or the
source note.

Older quests are markdown blocks inside a note. Touch that format only to update such a quest or
when the user asks for an embeddable block. `references/challenge-formats.md`,
`references/parser-constraints.md`, `references/visual-challenges.md` and
`scripts/list_quest_icons.sh` belong to it; nothing in them applies to a quest package.

## Output language

Everything the learner reads — titles, material, feedback — is in the language of the source and
the user's request. Structural keys stay in English.

## Principles

These are what a good quest achieves. How a particular quest achieves them depends on its
subject, and working that out is the job; nothing here is a layout to reproduce.

1. **Start from what the learner should be able to do.** Before designing anything, write down
   the abilities this quest exercises, each as something a person does ("reads a performance
   report and says which step a page is stuck at"). A Lesson Academy course may already state
   them, as each lesson's `goal`; where a source does not, derive them from what it teaches and
   from what the user wants to get good at, and ask when that is unclear. Every later choice is
   judged against this list.
2. **A mission is a situation that calls for the ability.** Find where the ability is really
   used — a desk, a kitchen, a ward, a workshop, a negotiation — and put the learner there, in
   a case the source did not use as its example. A learner who meets the source's own example
   again is remembering, not applying.
3. **The real material is on the desk, and the learner acts on it.** Ask what a practitioner
   would have in front of them and what they would do with it: mark the line that does not hold
   up, set a dial, put steps in order, write the missing piece, decide where to look next.
   Picking one of several written answers is right when the real decision is a choice among
   options, and only then.
4. **The material answers before the explanation does.** When the learner commits, show what
   their decision did: the number that moved, the cup that came out bitter, the defence that
   now has a hole. Then give the reason, including why the tempting alternative is weaker.
5. **The score says how good the judgment was.** It is made of the things the ability consists
   of, each shown with its reason, and a defensible-but-weaker decision earns part of it. A
   learner who guessed should not score like one who knew.
6. **The quest is a path.** Earlier missions exercise abilities one at a time; the boss needs
   several at once, in a situation where an early decision changes what comes later.
7. **A quest does not teach.** A briefing gives the context needed to start, nothing more. If
   the learner would need a new idea explained, that idea belongs in a lesson.
8. **One house style, any mission.** `assets/quest-base.css` and `assets/quest-base.js` fix the
   look and the contract with the plugin. What is on the desk and what the learner does to it
   is designed for this mission. Two quests on different subjects should look like the same
   publisher and ask for completely different things; reusing a mission's layout because it
   exists is the failure to avoid.

`references/mission-design.md` works these out: finding the situation, choosing material,
designing the action and its consequence, scoring, difficulty, and the boss. Read it before
planning a quest.

## Flow

1. **Find the source.** When the user names a course, lesson, deck or other EngramQuest
   artifact, read it from the plugin's folders first (`references/engram-data-layout.md`); a
   vault search will not find it. For vault notes use the Obsidian CLI
   (`references/obsidian-cli.md`). A quest practises what the source has actually taught; when
   part of it is only planned or too thin to practise from, leave that part out and tell the
   user what the quest does not cover.
2. **Name the abilities** (principle 1).
3. **Plan the quest in a few lines per node**: the ability, the situation, what is on the desk,
   what the learner does, what the material shows in return, and what the score is made of. A
   plan that reads as a question followed by options is not ready; one that says what the
   learner has their hands on is. Use as many missions as there are abilities worth practising —
   usually a handful — and prefer a few rich missions to many thin ones.
4. **Write `meta.json`** as `references/html-first-contract.md` describes.
5. **Write each mission** on the house style, following `references/html-quality.md` (read it
   before the first mission: the plugin's frame silently blocks several ordinary browser
   features).
6. **Build** with `scripts/build_quest.py`, then **play every mission**; both steps are in
   `references/html-quality.md`, section 7.
7. **Tell the user** what the quest practises, what it leaves out, and where to open it
   (EngramQuest → Quest Map).

## Updating a quest

Read the existing `meta.json` and missions first. A node's `id` is what the learner's progress
is stored under: keep the `id` and filename of any node whose ability is unchanged, and replace
only the missions whose content really changed. Never write progress into the package.

## Before calling it done

Play each mission as the learner would:

- **It cannot be finished well without the ability**, and can be with it. Nothing in the
  material or the wording gives the answer away.
- **The learner's hands are on the material.** If the material could be deleted and the
  questions would still make sense, it is a quiz with decoration.
- **Every decision gets its consequence and its reason**, and the learner decides when to move
  on.
- **The score is believable.** Each part is visible, and the total matches how well a
  practitioner would say it went.
- **It works on a phone**, in light and dark, with a finger (`references/html-quality.md`).
- **What the mission's judgment rests on is true.** The source is the authority for its own
  conventions; facts, figures and "best practice" claims from outside it are verified, and
  invented data is labelled as invented.

## What not to do

- Do not modify the user's notes, unless they ask for a quest block embedded in one.
- Do not turn the source into a deck of questions; recall is the review deck's job.
- Do not explain new ideas inside a mission; hand that to a lesson.
