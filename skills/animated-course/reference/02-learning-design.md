# 02 Learning design: scope, the Ultralearning default, the series plan

## 1. Who decides the scope

The user decides what they want to learn and how much: usually **one goal, one thing they want to be able to do**. It may be a whole course, a few lessons, or **one lesson that fills one missing concept**. Do not assume "teach everything from zero".

- If the user gives their own approach (an outline, a book's order, a teaching style), **follow it**; the defaults below only fill gaps.
- If the user gives no approach, use the Ultralearning default.
- After writing `SERIES.md`, hold **one syllabus checkpoint** (`SKILL.md`): show the lessons, their learning goals and the running project, and let the user choose the teacher (when `settings.json` names none), confirm the structure and adjust the student's project. If the goal itself is missing, ask it there too ("What do you want to be able to do after watching?"). After that, proceed to delivery without asking again. Details not covered at the checkpoint (length, style, pronunciations): decide them yourself and record the decision in `SERIES.md`.

## 2. The default: Ultralearning (Scott H. Young, *Ultralearning*, 2019)

Ultralearning is an aggressive, self-directed way of learning built on nine principles: metalearning, focus, directness, drill, retrieval, feedback, retention, intuition, experimentation. The user asked for this as the default because a film should get the learner *using* the skill, not just knowing about it.

### 2.1 Learning map first (metalearning)

Spend about **10% of the total effort** researching *how this subject is learned* before planning lessons: how experts explain it, which ideas beginners get stuck on, which projects people learn it through, what good teaching of this subject looks like on video. Then write the three cores into `SERIES.md`:

| Core | Question | Example (AdsDemo Meta ads course) |
|---|---|---|
| **Why** (motivation) | What does the learner want to achieve? What hurts now? | An indie developer must find out, with NT$3,000, whether strangers want the app |
| **What** (knowledge structure) | Which concepts, facts, procedures? Which one is hardest? | Auction, campaign / ad set / ad, measurement, metrics, kill criteria, scaling; hardest: reading metrics as one funnel |
| **How** (path) | Which project carries the learning? In which order does the project need each concept? | Set up one real validation campaign end to end; each lesson is the next decision in that campaign |

Also pick **one or two benchmark teaching videos for this subject and this topic** (e.g. 3Blue1Brown for math, Osmosis or Kurzgesagt for biology/medicine, Google Cloud Tech explainers for systems). Write for each: **what to learn** (how they make it understood: order, pacing, what they draw, camera) and **what not to take** (characters, designs, music, specific shots). Benchmarks teach grammar only. They lift quality more than any rule.

### 2.2 Project-based: do, don't just read

Build the course around **one concrete project** the learner is trying to finish. A concept enters at the moment the project needs it: show the problem (the pain point) first, then the concept that solves it. The brain links and keeps knowledge best when it is solving a clear, felt problem.

In the film: a running case (one app, one patient, one dataset, one proof to finish) appears in every lesson; the student character owns the project and makes the mistakes a real learner would make.

### 2.3 Real context (contextual learning)

Learn in the situation where the skill is used. Scott Young's "year without English" (four languages, speaking only the local language from day one) worked because the real situation forced real use.

In the film: the main screen is the real setting — the real interface, the real report, the real organ, the real lab result, the real equation in a real problem. Not a generic example that later has to be mapped onto reality.

### 2.4 Close the transfer gap (directness)

People are bad at applying knowledge learned in situation A to situation B (the transfer problem). The fix is to learn directly in B. So:
- Show the concept in the exact situation the learner will meet (their screen, their kind of data, their kind of problem).
- End each key point in a real action: "tomorrow, open X, look at Y, if Z then do W".
- Prefer the learner's own project numbers over textbook numbers.

### 2.5 Other Ultralearning principles as film techniques

| Principle | In the film |
|---|---|
| Retrieval | Prediction questions with a real pause; the ending mindmap redraws earlier recap images for recall; the next lesson's opening map makes the learner recall the previous ones |
| Feedback | The student's choice is followed immediately by its visible consequence |
| Drill | Isolate the hardest sub-skill in its own segment and replay it with one condition changed |
| Intuition | Show *why* (the mechanism, the derivation), not only *what*; the signpost test enforces it |
| Focus | One point at a time; 60–90 s segments, each closed with an image |
| Retention | Same terms and definition sentences across lessons; recap images reused in the mindmap |
| Experimentation | New methods are allowed — marked "trial" until the user reviews them |

## 3. The series plan (`templates/SERIES.md`)

Write it before any lesson:
- The learning map (why / what / how) and the running project.
- Lessons in order; for each: what it assumes (lessons 1…N−1 only), what it adds, its question, how it connects to the previous and next lesson.
- The glossary: each term's wording and definition sentence, used identically in every lesson.
- The cast and the setting (classroom, characters, colours) — reuse the approved ones unless the subject needs another look.

**Lesson N may assume only lessons 1…N−1.** Producers of different lessons may read each other's scripts.

## 4. A single lesson for one concept

When the user only wants one concept filled in:
- Skip the series plan, but still write a short learning map: what the learner already knows, what their project is, why this concept is missing.
- The skeleton still applies. The course map becomes "where this concept sits in what you already know / in your project"; the ending points to what the learner can now do (instead of "next lesson").
- Keep it as short as the concept allows (often 3–5 minutes); do not pad to fill a course.
