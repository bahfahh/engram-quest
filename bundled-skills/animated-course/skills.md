---
name: engram-quest-animated-course
description: Make animated teaching videos (a whole course, a few lessons, or a single lesson that fills one concept) for the engram-quest video library — understanding first, a classroom skeleton (opening hook, course map, one-liner, a recap image per segment, mindmap ending) with the middle chosen per segment for how learners best understand it (adapter pattern, not force-fit). Defaults to an Ultralearning-style design (learning map first, project-based, real context, direct practice) unless the user specifies their own approach. Use when the user asks to make an animated course or teaching video, e.g. 「做動畫課程」「做教學影片」「教學動畫」「把這門課做成影片」「影片學院」「補一課講某個概念」「試新的展示方式」. Not for monthly recall videos of the user's own notes (that is engram-quest-episodic-review), and not for analysing a YouTube video (youtube-video-analysis).
---

# engram animated course

> **Custom area.** Before you plan anything, read `custom-area.md` in this skill's folder: where the user's own preferences and assets live (`engram-quest/custom/`), how each choice is decided, and why keys never go into files.

## How this skill is written

**Purpose** (what the viewer should understand, do or feel), **reason** (what was observed), **options** with when they fit: judge by situation. Numbers are what approved films measured; tools measure, you judge. Firm only: product decisions, technical contracts, truthfulness. Everything else is guidance, because fixed rules make an AI force-fit content.

## One line

**Every frame exists to make the viewer understand.** The skeleton carries the lesson; the middle changes with the content. For each segment, first decide how a learner would best understand and absorb it, then pick an approved way of showing it or design one. The adapter pattern is a metaphor, not a menu: forcing content into an existing method is the worst outcome.

## What the user decides, what you decide

| The user decides (firm) | You (the producer) decide |
|---|---|
| The goal: what they want to be able to do, and why | How each segment is shown (the user does not pick methods) |
| The scope: a whole course, a few lessons, or one lesson for one missing concept | How the scope is split into lessons and segments |
| Their own teaching approach, if they have one (then follow it) | Everything about pacing, visuals, wording, checks |
| Language of the video: what the user says now, else `settings.json` → `narrationLang`; `follow` or unset means the language of the source notes, else the language the user writes in | |
| **Who teaches**: one teacher, picked in the plugin (`settings.json` → `cast.teacher`), or chosen at the syllabus checkpoint when none is set. Free = Nico only; Pro = Nova, Professor Bao, Luna, Iris, Alden; every teacher has the same floor, Pro teachers add the curiosity-and-depth devices (`reference/11-teachers.md` §1b) | How every beat is said in that teacher's style (`reference/11-teachers.md`) |
| **The syllabus checkpoint** (once, before production): the lesson list with learning goals, the student's project, the teacher | |
| **Voice engine**, only if an AI voice key exists and they fixed nothing: asked once, at the syllabus checkpoint | No key → edge-tts, no question (`reference/07-voice-and-language.md` §1c) |
| **What to leave out**: the course is made in the full version; the learner may turn off modules (`settings.json` → `course.off`, e.g. review cards), not the skeleton (`reference/12-modules.md`) | How each module is shown in a lesson, or skipping it for a lesson where it cannot be done honestly (reason in `NOTES.md`) |
| Approval: only the user's review of the **finished films** marks a method "approved" | |

**Run end to end without stopping** (a product decision): the user gives what to learn and the goal (optionally scope, language, their own approach); you go all the way to delivered films. Reviews before delivery are internal (host, separate reviewer). Missing scope or details → decide, write it in the series plan. **One checkpoint before production**: once the series plan is written, show the syllabus (lessons, what each lets them do, the real examples used) and ask, in one `AskUserQuestion`, which teacher (if `settings.json` names none), whether the lesson structure is right, the student's project setting, and any open decision about the user's own material; ask the goal there too if it is missing. Their answers go into the series plan; then no more questions until the user reviews the finished films.

Why both halves: without the checkpoint the user has no say over the syllabus, the learning goals or the teacher; any question after it hands the user a decision that belongs to the producer.

## Requests from the plugin

The learner can queue what they want to learn in the plugin. Each request is a series folder with `status: "pending"`; the status is the only progress the learner can see there.

- `python3 scripts/series_status.py list` shows what is waiting. When the user asks for a video without naming a topic, these are the work. Several waiting: put them in the syllabus checkpoint, oldest first.
- A request's folder name is the series. `request.text` is the goal, `request.detail` the extra context, `request.source` either `notes` (use the notes in `request.refs`, or find relevant ones when empty) or `general`.
- Mark the series `making` when production starts, `ready` when its last lesson is delivered, and `failed` with a one-line reason the learner can read if the run cannot finish (`series_status.py <slug> making|ready|failed`).
- Leave `progress` and `starred` alone: they belong to the plugin.

## Default learning design: Ultralearning

Unless the user specifies otherwise (`reference/02-learning-design.md`):
1. **Learning map first** (≈10% of the effort): research how this subject is learned before writing anything. Write down *why* (the learner's goal), *what* (concepts, facts, procedures — which is hardest), *how* (the project and path).
2. **Project-based**: build the course around one concrete project the learner is trying to finish (for example: a café owner with a small budget testing whether online ads bring in new customers). Each lesson brings in a concept at the moment the project needs it — pain point first, concept second.
3. **Real context**: show the real thing in the situation it is used in (real UI, real numbers, real organs, the real derivation), so no transfer from an abstract example is needed.
4. **Direct and active**: the learner predicts, gets something wrong, sees the consequence; key points lead to a real action ("tomorrow you open X and check Y").

## Workflow

| Step | Do | Read |
|---|---|---|
| 0 | Principles, learning design, adapter pattern | `reference/01-principles.md`, `reference/02-learning-design.md`, `reference/03-adapter-pattern.md` |
| 1 | **Learning map + series plan** (`templates/SERIES.md`): goal, project, lessons, what each assumes and adds. For a single lesson: where it sits in what the learner already knows. Resolve **which teacher** teaches, the **voice engine** and the **modules** that are on (`modules[]`; every module is on unless turned off): `node scripts/studio/lib/cast/resolve.cjs [--series <slug>] > projects/<id>/cast.json`; if `engine.askUser`, ask once now (with the goal question), then re-run with `--engine <answer>` (Luna: also search the vault for notes to build on) | `reference/02-learning-design.md`, `reference/11-teachers.md`, `reference/12-modules.md` |
| 2 | **Understanding design card** per lesson (`templates/UNDERSTANDING.md`): change → obstacles → **diagnose each segment** (question it answers, where it gets stuck, what the viewer does) → choose **layer by layer**: stage for the whole middle, a shape per segment, a moment device (approved: about one wow per segment, one silent aha; rhythm baseline kept) → what carries the viewer to the next sentence, drafted picture first (judged per segment, §1.4) → cost | `reference/03-adapter-pattern.md` §1, `reference/05-presentation-methods.md` |
| 3 | **Stage 1, no visuals yet**: `CARD.md`, `SCRIPT.md`, `script.json` → `voice.py` (edge-tts by default; an AI voice only when the user chose it, not because a key exists, `reference/07-voice-and-language.md` §1c), three stills (first frame, the "aha" moment, ending mindmap). **Host review** (internal: the host fixes the plan and sends the producer straight on, without the user) | `reference/04-skeleton.md`, `reference/07-voice-and-language.md`, `templates/` |
| 4 | **Stage 2**: build scenes, full-resolution stills per segment, previews, two or more fix rounds, `NOTES.md` | `reference/08-tools.md`, `scripts/studio/lib/**/*.md` |
| 5 | **Silent review** by a separate reviewer who sees only the stills (`templates/SILENT-REVIEW.md`); fix before rendering | `reference/06-workflow.md` |
| 6 | Render (cloud: one session per lesson), join, sample-check one full-res frame per segment | `reference/06-workflow.md`, `scripts/farm/` |
| 7 | Deliver to `engram-quest/videos/<series>/` (with the `cards` module on: write `cards.json` first, deliver writes the review-card deck); after the last lesson of a plugin request, mark the series `ready`; record the user's review | `reference/06-workflow.md`, `reference/10-iteration-and-records.md` |
| 8 | After the last delivery of the run: refresh Synapse when it is already on (below) | — |

Read `reference/09-pitfalls.md` first: every mistake so far, and what helped.

### Step 8: refresh Synapse when it is already on

Synapse (Pro) links review cards the learner still struggles with to what they have studied, delivered videos included. A learner who has it running should not have to refresh it separately. Once the run has delivered at least one film, check both:

- `engram-review/synapse/_status.json` exists and holds `enabled: true`
- the Synapse skill is available in the tool you are running in (`engram-synapse`, installed as `engram-quest-synapse` next to this skill)

Both hold → run the Synapse skill in its default mode (no `--full`) without asking, and put the one line it hands back into the final report (`Synapse: 5 cards paired, 3 relations added`, `Synapse: already up to date`); if it hands back nothing, add nothing. Anything else → skip it and do not mention Synapse: starting Synapse is the learner's own step, not something to suggest here.

The films are the deliverable and Synapse is a follow-up. If it fails, the films stay delivered: report them as delivered and add `Synapse: not updated (<reason>)`. Review cards made in this run have no review history yet, so Synapse does not link them until they have been reviewed once; do not report them as linked.

## The core (rules 0–11)

0. **The run does not stop mid-way**: goal in, one syllabus checkpoint, finished films out. Ask only before irreversible actions on the user's things (deleting branches or old videos). **The voice engine** joins the checkpoint only when `resolve.cjs` says `engine.askUser`; no key → edge-tts without asking (`reference/07-voice-and-language.md` §1c).
1. **Understanding first.** The signpost test: mute the narration and look only at the picture — if the viewer learns only *what the topic is*, it is a signpost; a mechanism, relation or difference is what teaches. **Every frame has a focus**: at a glance the viewer knows where to look and what the frame is about. Complex is fine when the real thing is (real screens, code, a 3D organ) with a focus; crowded with no focus is not; clean is not empty. A map serves the whole; a whole film of map does not teach (`reference/01-principles.md` §1).
2. **Choose by diagnosis, finely.** Approved methods are options, not quotas: use one where the segment's diagnosis calls for it (`reference/05-presentation-methods.md` §1). Diagnose each segment, then choose layer by layer (stage, segment shape, moment device; rhythm baseline kept), `reference/03-adapter-pattern.md` §1. The catalogue (`05`) holds approved starting points per layer; if the content fits none, design from learning principles; different subjects grow their own way of showing (biology: realistic diagram animation of the heart or nucleus; math: a question, then the derivation step by step with the graph; physics: the Atlas diagram world, `lib/atlas/ATLAS.md`).
3. **The skeleton carries the lesson; the middle changes.** Hook, course map, one-liner in the first 60 s, the middle's rhythm baseline (approved films: speech ≈ 80% or less, real silences, recall questions, the picture following each new sentence — `reference/04-skeleton.md` §2, measured by `pacecheck.py` and `livecheck.py`), a recap image after each segment, a structured (mindmap) ending, continuity with the previous and next lesson. The classroom head and tail are the default, and each part has a job: the blackboard carries the point being taught, one idea at a time; the 3D course map shows where the lesson sits; the blackboard mindmap shows the whole (`reference/04-skeleton.md`). The middle shows the real thing in its own look, one consistent look per film and course; the Engram studio (light / dark) only when the user asks for it (`reference/01-principles.md` §1). The teacher is the learner's choice (`reference/11-teachers.md`); every teacher keeps the same beats and changes how each is said.
4. **Build on what was approved.** A new round changes what needs changing; versions are not either/or.
5. **Define before use.** First appearance of a term: full name + one plain-language sentence, said and written. Vague pronouns and AI-speak ("that cell", "this box") leave the viewer guessing.
6. **The real thing on the main screen.** Analogies help when the real thing cannot be drawn and is hard to grasp; then back to the real thing.
7. **Every number is real** (truthfulness, firm): recompute each one and keep it consistent across frames. Mark wrong intuitions on screen as wrong, or the picture teaches them.
8. **Two stages, `readcheck.cjs` and a silent review before any full render**: a render is costly; the silent review catches what producer and host miss. Check full-resolution frames, not only thumbnails.
9. **One cloud session per lesson**, archived as soon as its parts are collected (one session per part piled up over a hundred child sessions).
10. Follow the project's rules on which sources are off limits (for example raw web clippings). Look up any unfamiliar term on the web before writing about it.
11. **Hands, eyes and the picture go where the words go**, so attention lands where the narration points. When the narration names a thing the viewer must find, the teacher looks and points at it on that word and the student looks too (`lib/cast/cue.js`), not a fixed "point while talking". New information lands best when something happens on the object on its word (`reference/01-principles.md` §2). Holding the rest still while the thing to learn changes keeps the eye on it; the approved aha is the same picture reassembled, not a cut to a new picture at the reveal (`reference/04-skeleton.md` §2). The voice marks the structure: idea groups, layered pauses, a pause before the focus word (`reference/07-voice-and-language.md` §1b-4).

## Files

```
SKILL.md
reference/
  01-principles.md            the biggest principle, learning principles table, iteration principle
  02-learning-design.md       Ultralearning default, learning map, series plan, single-lesson scope
  03-adapter-pattern.md       the metaphor, diagnosis + layer-by-layer judgment (stage, shape, device), subjects improvise, borrowing
  04-skeleton.md              head / middle / tail, course map visibility, sound, picture spec, length
  05-presentation-methods.md  stages, segment shapes, moment devices, links and endings done so far, with status (approved = available, not required)
  06-workflow.md              producer stages, host duties, silent review, cloud render, delivery
  07-voice-and-language.md    voices, Chinese and English conventions, TTS and ASR traps
  08-tools.md                 studio setup and commands, script.json, scene.html contract, components
  09-pitfalls.md              mistakes already made, with the reason
  10-iteration-and-records.md how experience is recorded; status changes; end-of-round checklist
  11-teachers.md              the learner picks who teaches: shared rhythm, beat styles, the three core teachers, skins, names; the learner's own teachers, skins, looks and music (custom area)
  12-modules.md               the full version by default, the learner subtracts: cards (review cards, needs rework); transfer rejected
templates/                    SERIES, UNDERSTANDING, CARD, SCRIPT, FACTS, NOTES, BRIEF (producer task), SILENT-REVIEW
scripts/
  studio/                     render.cjs, compose.py, voice.py (idea groups, pause layers, focus pauses), asr.py, tonecheck.py (which reading a polyphonic character got), bgm2.py, readcheck.cjs, pacecheck.py, livecheck.py (narration over a frozen picture), remiddle.py, sfx.py, package.json, lib/ (components + docs; lib/atlas = Atlas diagram world; lib/cast = teacher registry teachers.json, skins and their contract CAST.md, cue.js = hands and eyes go where the words go; lib/course/modules.json = default-on modules; lib/classroom = the skeleton's head and tail: the classroom, blackboard, one 3D course map per course, blackboard mindmap; lib/house = the Engram studio (light / dark), only when the user asks for it)
  farm/                       cloud render: one session per lesson, plan, collect, seam check, screening room; localfarm.sh renders on this machine
  deliver.py                  music, holds, poster, subtitles, meta.json entry
  burnsubs.py                 a separate copy with subtitles burned in, for social platforms
  series_status.py            lists the plugin's waiting requests, reports making / ready / failed
  doctor.py                   checks this machine has what production needs, and warns about anything shaped like a key in engram-quest/custom/
assets/
  music/                      Morning.mp3 (CC BY 4.0, credit required) — opening and ending only
  looks/                      stills from the demo films, with what to learn and what not to copy
  cast-designs/               design images the character skins are built to match
  portraits/                  one portrait per registry teacher in its current look (picker cards)
```

This skill holds only distilled, reviewed guidance. If the project keeps a lab notebook (every experiment, what reviewers said, rejected versions), it lives outside the skill; when the two disagree, update both (`reference/10-iteration-and-records.md`).

## Reporting problems

A bug in this skill (wrong path, broken script, unclear guidance): confirm it, fix it in the copy you maintain, verify, and report what changed. A bug in the EngramQuest plugin goes through the project's bug-reporting process, and the user is told.
