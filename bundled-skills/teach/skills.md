---
name: engram-teach
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

# Teach Skill

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

1. **One lesson teaches ONE thing.** Completable in 10–20 minutes, ending with a tangible win.
2. **Ground in the user's mission.** Knowing *why* they want to learn shapes every lesson.
   If the goal is unclear, ask before designing the course.
3. **Zone of proximal development.** Each lesson should challenge "just enough" — build on what
   the previous lessons established, never re-explain what's already mastered.
4. **Never trust parametric knowledge alone for fast-moving topics.** For current
   frameworks/tools/APIs, verify key claims with web search and cite sources in the lesson.
5. **Knowledge first, then practice.** Teach the concept, then end the lesson with an
   interactive quiz or exercise so the user gets an immediate feedback loop.

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
completed — extend it rather than starting over.

When the request builds on the user's own notes, find them with Obsidian CLI
(see `references/obsidian-cli.md` for syntax):

```bash
obsidian search query="<topic>" format=json
```

## Step 2: Establish the mission (new course only)

Ask the user (briefly, 2–3 questions max, skip what's already clear from the prompt):

1. **Why** do they want to learn this? (project, exam, career, curiosity)
2. **Current level** — total beginner, some exposure, or experienced in an adjacent area?
3. **Depth** — quick overview (3–4 lessons) or thorough path (6–10 lessons)?

The answers shape the outline. A .NET backend developer learning React needs a completely
different course than a designer learning React.

## Step 3: Design the course outline

Produce an outline of N lessons, each one line:

```
1. <lesson title> — <the ONE thing it teaches>
2. ...
```

Order matters: each lesson should rely only on earlier lessons. Show the outline to the user
for approval before generating (generation is expensive; outline changes are cheap).

Pick the course metadata now:
- `courseSlug` — short kebab-case ASCII (e.g. `dotnet-basics`, `marketing-seo`)
- `icon` — one emoji that captures the topic (🔷 💊 📈 🧘 …)
- `colorScheme` — one of `indigo | green | amber | rose | cyan` (pick what fits the topic mood)
- `tags` — 2–3 short topic tags in the user's language
- `description` — one sentence, shown on the course card (≤ 40 chars in zh, ≤ 80 in en)

## Step 4: Generate lessons

For each lesson, write a single self-contained HTML file following the hard rules in
`references/html-recipe.md` (read it before generating the first lesson — Obsidian's CSP
silently breaks externally-loaded resources, so violations look fine to you but broken to
the user).

Lesson ID and filename:
- `id` = `lsn-<current unix ms timestamp>` (e.g. `lsn-1717977600000`); when generating several
  lessons in one run, make each timestamp distinct (increment by 1 if needed)
- filename = `<id>-<short-ascii-slug>.html` (e.g. `lsn-1717977600000-seo-basics.html`)

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

A lesson is a **beautiful, readable document** the user will revisit. Follow the visual and
structural guidance in `references/html-recipe.md`, and:

- Open with what the lesson teaches and why it matters for the user's mission.
- Use concrete examples over abstract definitions. Code topics get runnable-looking snippets;
  physical skills get step sequences; concept topics get diagrams built from styled divs.
- Litter factual claims with citations (`<a href>` links to sources) when the topic is
  technical or fast-moving.
- End with a short interactive quiz (3–5 questions, inline JS, immediate feedback) plus a
  "next steps" pointer.
- Close with a reminder that the user can ask their AI teacher (you) follow-up questions.

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
