---
name: engram-lesson-academy
description: >
  Build interactive HTML lesson courses for the EngramQuest plugin's Lesson Academy
  (the "Lessons" / "教材" tab). Given any topic — programming, marketing, medicine, yoga,
  anything — this skill designs a course matched to the user's background and goal, then
  generates beautiful self-contained HTML lessons the user studies inside Obsidian.
  Trigger this skill whenever the user says they want to learn something, asks to be taught
  a topic, mentions "teach", "教我", "我想學", "課程", "教材", "lesson", "course",
  or asks to add / extend / regenerate lessons in an existing course — even if they
  don't name the skill. Also trigger when the user wants study material generated from
  their own vault notes.
---

# Lesson Academy Skill

Create **courses** of interactive HTML **lessons** for the EngramQuest plugin. A course is a
folder under `engram-quest/lessons/{courseSlug}/` holding a `meta.json` (course info + lesson
list + completion tracking) and one self-contained HTML file per lesson. The plugin's
**Learn → Lessons** tab renders courses as cards with progress bars; the user opens each lesson
in an in-app viewer and marks it done.

Your lessons are the user's actual study material — quality matters more than quantity.
One excellent, tightly-scoped lesson beats three shallow ones.

## Output language

Lesson content and course metadata (title, description, tags) match the language of the user's
prompt and source notes. If the user writes in Traditional Chinese, teach in Traditional Chinese.

## Core principles

1. **Every lesson has one learning goal.** Write it down before anything else, as what the
   learner can do afterwards ("can tell which stage of the funnel lost the customers"). Every
   paragraph and figure either moves the learner toward it or leaves. Completable in 10–20
   minutes.
2. **Ground in the user's mission.** Knowing *why* they want to learn shapes every lesson.
   If the goal is unclear, ask before designing the course.
3. **Zone of proximal development.** Each lesson should challenge "just enough" — build on what
   the previous lessons established, never re-explain what's already mastered.
4. **Never trust parametric knowledge alone for fast-moving topics.** For current
   frameworks/tools/APIs, verify key claims with web search and cite sources in the lesson. Cite
   only what you actually opened and read.
5. **Arrange the lesson as the learner's path to the goal.** Each part answers the question the
   previous part leaves open, and the lesson stops when the goal is reached. Derive the path
   from the goal each time. A path that often suits a concept: a real problem the learner
   recognises → the idea explained with figures → one example worked through with real numbers
   → the same idea in a changed situation → carrying it to the learner's own work. A procedure
   follows the task instead; other subjects have their own natural order. This is a way of
   thinking about order, not a list of sections to fill.
6. **Show the subject; let prose carry the thread.** A lesson reads like a well-made handout:
   one running example, short connected prose, and figures that show the real thing the prose
   is talking about. Whatever can be shown is shown. How to show it depends on the subject, and
   on whether image generation is available — read `references/visual-teaching.md` before
   planning the figures.
7. **A lesson teaches; it does not examine.** Interaction exists so the learner can see how
   something works. A short check where the learner applies the idea to a new case and gets the
   reason back fits a lesson. Scores, gates and drills are the quest map's job.
8. **One house style, any presentation.** `assets/lesson-base.css` fixes the look: colour,
   type, and the surfaces figures sit on. What appears on those surfaces is designed for this
   lesson's content. Two lessons on different subjects should look like the same publisher and
   show completely different things. Reusing another lesson's layout because it exists is the
   failure to avoid.

---

## Step 1: Understand the request

Parse what the user wants:

| Request | Action |
|---|---|
| "I want to learn X" (new topic) | New course → Step 2 |
| "Add a lesson about Y to my Z course" | Extend existing course → Step 4 (read meta.json first) |
| "Continue my course" / "next lesson" | Read meta.json + completion, generate the next lesson in the outline |
| "Generate my course" / "把課綱生成內容" | Course has planned (`file: null`) lessons — generate HTML for each, keeping their ids (see `references/lesson-format.md` § Planned lessons) |
| "Just build me an outline first" | Create the course with all lessons as `file: null` so the user can edit the plan in the plugin UI before generation |
| "Make lessons from my notes on X" | Search vault for source notes, then Step 2 |

The user can also create courses and outline entries directly in the plugin ("建立新課程" /
"新增課綱") — those appear as lessons with `"file": null`. Generating their content is the
most common follow-up request this skill receives.

Before asking the user anything, check what already exists:

```bash
ls engram-quest/lessons/ 2>/dev/null
```

If a matching course exists, read its `meta.json` to see the outline and which lessons are
completed — extend it rather than starting over. Its `mission` and each lesson's `goal` are the
plan the course was designed on; generate from them, since a title alone does not say what a
lesson is for. A course or entry without them — made in the plugin, or written before these
fields existed — gets them first: settle the mission (Step 2) and the goal before generating,
and record them (Step 5).

When the request builds on the user's own notes, find them with Obsidian CLI
(see `references/obsidian-cli.md` for syntax):

```bash
obsidian search query="<topic>" format=json
```

## Step 2: Establish the mission (any course without one)

Ask the user (briefly, 2–3 questions max, skip what's already clear from the prompt):

1. **Why** do they want to learn this? (project, exam, career, curiosity)
2. **Current level** — total beginner, some exposure, or experienced in an adjacent area?
3. **Depth** — quick overview (3–4 lessons) or thorough path (6–10 lessons)?

The answers shape the outline. A .NET backend developer learning React needs a completely
different course than a designer learning React.

The mission has to outlive this conversation, because most lessons are generated in a later one.
Keep it as the course's `mission`: the why, the starting point, and whatever the user said about
their situation that changes how a lesson should be built for them.

## Step 3: Design the course outline

Produce an outline of N lessons, each one line:

```
1. <lesson title> — <what the learner can do after it>
2. ...
```

Order matters: each lesson should rely only on earlier lessons. Show the outline to the user
for approval before generating (generation is expensive; outline changes are cheap).

Each lesson also gets a `goal`: what the learner can do after it, in the terms the user approved.
That holds for a canvas step too — its form is not its goal. A lesson generated later is built
toward it.

### Canvas steps in the outline

Some steps teach better as a native Obsidian canvas concept map than as an HTML page — the user
can pan it, drag nodes, and annotate it, so it works as a living map rather than a document.
Decide these at outline time and mark them:

```
3. 🗺️ <title> — canvas: <form, e.g. comparison of X vs Y>
```

- Canvas is a **medium, not a diagram type**: learning maps, mindmaps, classification,
  comparison, flows, section summaries are all fair game (form menu in
  `references/canvas-recipe.md`).
- Density: roughly **one canvas step per three HTML lessons** as a ceiling, not a quota —
  concept-heavy courses can use it fully, hands-on or code-heavy courses may need zero.
  Never add a canvas step just to hit a number.
- Placement is free: **before** the lessons it maps (orient with the big picture first) or
  **after** them (consolidate what was just learned).
- Content that is table-heavy, code-heavy, or a linear narrative belongs in HTML.

Pick the course metadata now:
- `courseSlug` — short kebab-case ASCII (e.g. `dotnet-basics`, `marketing-seo`)
- `icon` — one emoji that captures the topic (🔷 💊 📈 🧘 …)
- `colorScheme` — one of `indigo | green | amber | rose | cyan | violet | blue | teal | lime |
  orange | fuchsia | slate` (pick what fits the topic mood; keep the value of an existing course)
- `tags` — **reuse existing tags first; only add a new one if nothing fits:**
  1. Scan the existing tag pool before deciding:
     ```bash
     python3 -c "
     import json, glob
     tags = set()
     for f in glob.glob('engram-quest/lessons/*/meta.json'):
         tags.update(json.load(open(f, encoding='utf-8')).get('tags', []))
     print(sorted(tags))
     "
     ```
  2. Pick 1–2 tags from the pool that best match this course's topic.
  3. Only add a brand-new tag when the pool has nothing suitable. Maximum **2 tags total**.
  4. Exception: if the user explicitly specifies tags, use those exactly.
- `description` — one sentence, shown on the course card (≤ 40 chars in zh, ≤ 80 in en)

## Step 4: Generate lessons

For each lesson, work in this order:

1. **Plan it in a few lines before writing HTML**: the learning goal (the entry's `goal` from
   the outline), the running example, the
   path (principle 5), and for each step what the learner will *see*
   (`references/visual-teaching.md`). A plan that reads as headings with bullet points under
   them is not ready; one that names what is on screen at each step is.
2. **Write a single self-contained HTML file** on the house style, following
   `references/html-recipe.md` (read it before generating the first lesson — Obsidian's CSP
   silently breaks externally-loaded resources, so violations look fine to you but broken to
   the user).
3. **Build and check it** with `scripts/build_lesson.py` as that file describes.

Canvas steps produce a JSON Canvas file instead of HTML — read
`references/canvas-recipe.md` before generating the first one (naming rules, layout spacing,
script validation). Their meta.json entry carries `"type": "canvas"`.

Lesson ID and filename:
- `id` = `lsn-<current unix ms timestamp>` (e.g. `lsn-1717977600000`); when generating several
  lessons in one run, make each timestamp distinct (increment by 1 if needed)
- filename = `<id>-<short-ascii-slug>.html` (e.g. `lsn-1717977600000-seo-basics.html`);
  canvas steps use `.canvas` instead — and must never end with `-memory.canvas`

Write the file to:

```
engram-quest/lessons/{courseSlug}/{filename}
```

## Step 5: Write / update meta.json

`engram-quest/lessons/{courseSlug}/meta.json` is the contract with the plugin — its exact
shape is specified in `references/lesson-format.md` (read it the first time you write one).

Critical rules:
- **Never overwrite an existing meta.json blindly.** Read → merge → write. Existing `lessons`
  entries and the whole `completion` map must survive (they hold the user's progress).
- New lessons append to the `lessons` array with `"source": "skill"`.
- Initialize `completion[id] = { "viewed": false, "completed": false, "starred": false }`
  for each new lesson.
- **The plan is saved with the outline**: the course's `mission` and every lesson's `goal` are
  written when the outline is, whether its lessons are generated now or left planned.
  Generating a planned lesson fills in its `file`; its goal stays as it was.

## Step 6: Tell the user

After generating, summarize:

```
✅ Course "{title}" — {N} lessons created

Open EngramQuest → 學習 (Learn) → 教材 (Lessons) to start.
Lessons:
1. <title>
2. ...
```

Remind them they can ask you follow-up questions about any lesson, ask for the next lesson,
or ask to regenerate one that didn't land.

---

## Lesson HTML quality bar

A lesson is a document the user will revisit. Before calling one done, read it as the learner:

- **The goal is reachable from the page alone.** Someone who reads it start to finish can do
  what the learning goal says.
- **Headings and figures tell the story by themselves.** Each heading states a point; each
  figure shows something real and its caption says what to take from it. A figure that only
  repeats the paragraph in boxes is removed or redrawn.
- **Nothing is there because lessons usually have it.** No section, callout, check or image
  that this goal does not need.
- **It reads on a phone**, in both light and dark (`references/html-recipe.md`).
- **Claims the learner will rely on are sourced** (`<a href>` links) when the topic is
  technical or fast-moving, and anything shown as an illustration is labelled as one.
- **It ends with a way forward**: where the idea stops applying, what the next lesson adds,
  and a reminder that the user can ask their AI teacher (you) follow-up questions.

## Converting lessons to other EngramQuest formats

When the user finishes a course (or asks), offer to:
- **Generate review-deck flashcards** from the lessons' key facts — create an
  `engram-review/ai-cards/{course-title}.md` per the review-deck skill's card format
  (`question :: answer` lines, if that skill is installed).
- **Build a quest map** from the course — hand off to the quest-map skill if installed.

Don't auto-generate these; lessons alone are the deliverable unless asked.

## What NOT to do

- Don't write into the user's own notes — only `engram-quest/lessons/` is yours.
- Don't delete or rename existing lesson files; the plugin tracks them by `meta.json`.
- Don't generate the whole course's HTML before the outline is approved.
- Don't pad lessons to look longer; density and clarity beat length.
