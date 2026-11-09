---
name: engram-animated-course
description: Make animated teaching videos (a whole course, a few lessons, or a single lesson that fills one concept) for the engram-quest video library — understanding first, a fixed skeleton (opening hook, course map, one-liner, a recap image per segment, mindmap ending) with the middle chosen per segment for how learners best understand it (adapter pattern, never force-fit). Defaults to an Ultralearning-style design (learning map first, project-based, real context, direct practice) unless the user specifies their own approach. Use when the user asks to make an animated course or teaching video, e.g. 「做動畫課程」「做教學影片」「教學動畫」「把這門課做成影片」「影片學院」「補一課講某個概念」「試新的展示方式」. Not for monthly recall videos of the user's own notes (that is engram-episodic-review), and not for analysing a YouTube video (youtube-video-analysis).
---

# engram animated course

## One line

**Every frame exists to make the viewer understand.** The skeleton is fixed; the middle changes with the content. For each segment, first decide how a learner would best understand and absorb it, then pick an approved way of showing it — or design a new one. The adapter pattern is a metaphor, not a menu: **never force content into an existing method.**

## What the user decides, what you decide

| The user decides | You (the producer) decide |
|---|---|
| The goal: what they want to be able to do, and why | How each segment is shown (never ask the user to pick a method) |
| The scope: a whole course, a few lessons, or one lesson for one missing concept | How the scope is split into lessons and segments |
| Their own teaching approach, if they have one (then follow it) | Everything about pacing, visuals, wording, checks |
| Language of the video: what the user says now, else `settings.json` → `narrationLang`; `follow` or unset means the language of the source notes, else the language the user writes in | |
| **Who teaches**: one teacher, picked in the plugin (`settings.json` → `cast.teacher`), or chosen at the syllabus checkpoint when none is set. Without Pro only the free teacher is available | How every beat is said in that teacher's style (`reference/11-teachers.md`) |
| **The syllabus checkpoint** (once, before production): the lesson list with learning goals, the student's project, the teacher | |
| **Voice engine**, only if an AI voice key exists and they fixed nothing: asked once, at the syllabus checkpoint | No key → edge-tts, no question (`reference/07-voice-and-language.md` §1c) |
| **What to leave out**: the course is made in the full version; the learner may turn off modules (`settings.json` → `course.off`, e.g. review cards), never the skeleton (`reference/12-modules.md`) | How each module is shown in a lesson, or skipping it for a lesson where it cannot be done honestly (reason in `NOTES.md`) |
| Approval: only the user's review of the **finished films** can mark a method "approved" | |

**Run end to end without stopping.** The user's only input is what to learn and the goal (optionally scope, language, their own approach). From there you go all the way to delivered films: research, plan, both stages, silent review, render, delivery. Never stop mid-way to ask the user or wait for their approval; every review before delivery is internal (host and a separate reviewer). Missing scope or details → decide them yourself and write the decision in the series plan. **One checkpoint before production**: once the series plan is written, show the user the syllabus (lessons, what each lets them do, the real examples used) and ask, in one `AskUserQuestion`, which teacher (if `settings.json` names none), whether the lesson structure is right, the student's project setting, and any open decision about the user's own material. Their answers go into the series plan; from then on, no more questions. Only if the goal itself is missing, ask it at that same checkpoint. The user's review comes after delivery, on the finished films.



## Requests from the plugin

The learner can queue what they want to learn in the plugin. Each request is a series folder with `status: "pending"`; the status is the only progress the learner can see there.

- `python3 scripts/series_status.py list` shows what is waiting. When the user asks for a video without naming a topic, these are the work. Several waiting: put them in the syllabus checkpoint, oldest first.
- A request's folder name is the series. `request.text` is the goal, `request.detail` the extra context, `request.source` either `notes` (use the notes in `request.refs`, or find relevant ones when empty) or `general`.
- Mark the series `making` when production starts, `ready` when its last lesson is delivered, and `failed` with a one-line reason the learner can read if the run cannot finish (`series_status.py <slug> making|ready|failed`).
- Leave `progress` and `starred` alone: they belong to the plugin.

## Default learning design: Ultralearning

Unless the user specifies otherwise (`reference/02-learning-design.md`):
1. **Learning map first** (≈10% of the effort): research how this subject is learned before writing anything. Write down *why* (the learner's goal), *what* (concepts, facts, procedures — which is hardest), *how* (the project and path).
2. **Project-based**: build the course around one concrete project the learner is trying to finish (AdsDemo example: an app developer with NT$3,000 validating the app with Meta ads). Each lesson brings in a concept at the moment the project needs it — pain point first, concept second.
3. **Real context**: show the real thing in the situation it is used in (real UI, real numbers, real organs, the real derivation), so no transfer from an abstract example is needed.
4. **Direct and active**: the learner predicts, gets something wrong, sees the consequence; every key point ends in a real action ("tomorrow you open X and check Y").

## Workflow

| Step | Do | Read |
|---|---|---|
| 0 | Principles, learning design, adapter pattern | `reference/01-principles.md`, `reference/02-learning-design.md`, `reference/03-adapter-pattern.md` |
| 1 | **Learning map + series plan** (`templates/SERIES.md`): goal, project, lessons, what each assumes and adds. For a single lesson: where it sits in what the learner already knows. Resolve **which teacher** teaches, the **voice engine** and the **modules** that are on (`modules[]`; every module is on unless turned off): `node scripts/studio/lib/cast/resolve.cjs [--series <slug>] > projects/<id>/cast.json`; if `engine.askUser`, ask once now (with the goal question), then re-run with `--engine <answer>` (Luna: also search the vault for notes to build on) | `reference/02-learning-design.md`, `reference/11-teachers.md`, `reference/12-modules.md` |
| 2 | **Understanding design card** per lesson (`templates/UNDERSTANDING.md`): change → obstacles → **diagnose each segment** (question it answers, where it gets stuck, what the viewer does) → choose **layer by layer**: stage for the whole middle, a shape per segment, one wow device per segment, one silent aha (rhythm is fixed) → what carries the viewer to the next sentence, drafted picture first (judged per segment, §1.4) → cost | `reference/03-adapter-pattern.md` §1, `reference/05-presentation-methods.md` |
| 3 | **Stage 1, no visuals yet**: `CARD.md`, `SCRIPT.md`, `script.json` → `voice.py` (edge-tts by default; uses an AI voice automatically if one is configured, `reference/07-voice-and-language.md` §1c), three stills (first frame, the "aha" moment, ending mindmap). **Host review** (internal: the producer reports to the host, the host fixes the plan and sends the producer straight on; never wait for the user) | `reference/04-skeleton.md`, `reference/07-voice-and-language.md`, `templates/` |
| 4 | **Stage 2**: build scenes, full-resolution stills per segment, previews, at least two fix rounds, `NOTES.md` | `reference/08-tools.md`, `scripts/studio/lib/**/*.md` |
| 5 | **Silent review** by a separate reviewer who sees only the stills (`templates/SILENT-REVIEW.md`); fix before rendering | `reference/06-workflow.md` |
| 6 | Render (cloud: one session per lesson), join, sample-check one full-res frame per segment | `reference/06-workflow.md`, `scripts/farm/` |
| 7 | Deliver to `engram-quest/videos/<series>/` (with the `cards` module on: write `cards.json` first, deliver writes the review-card deck); after the last lesson of a plugin request, mark the series `ready`; record the user's review | `reference/06-workflow.md`, `reference/10-iteration-and-records.md` |

Read `reference/09-pitfalls.md` before starting: every mistake made so far is there.

## Rules you must not break

0. **Never stop to ask the user mid-way.** Goal in, one syllabus checkpoint (lessons, goals, project, teacher), then finished films out. The only other exceptions are irreversible actions on the user's things (deleting branches or old videos). The checkpoint may also carry **the voice engine**, and only when `resolve.cjs` says `engine.askUser` (an AI voice key exists and the user fixed nothing); no key → edge-tts without asking (`reference/07-voice-and-language.md` §1c).
1. **Understanding first.** The signpost test: mute the narration, look only at the picture — if the viewer only learns *what the topic is*, it is a signpost; redo it so it shows a mechanism, relation or difference. **Every frame has a focus**: at a glance the viewer knows where to look and what the frame is about. Complex is fine when the real thing is complex (real screens, code, a 3D organ) — make the focus on it; crowded with no focus is not; clean is not empty. A map is fine for the whole; the whole film is not a map (`reference/01-principles.md` §1).
2. **Never force-fit — and choose finely.** Diagnose each segment, then choose layer by layer (stage, segment shape, moment device; rhythm fixed), `reference/03-adapter-pattern.md` §1. The catalogue in `reference/05-presentation-methods.md` holds approved starting points per layer, not a menu. If the content does not fit them, design from learning principles; different subjects grow their own way of showing (biology: realistic diagram animation of the heart or nucleus; math: a question, then the derivation step by step with the graph; physics: the Atlas diagram world, `lib/atlas/ATLAS.md`). Forcing content into a method is the worst outcome.
3. **Skeleton is fixed, the middle changes.** Hook, course map, one-liner in the first 60 s, the middle's rhythm baseline (speech ≤ 80%, real silences, recall questions — `reference/04-skeleton.md` §2, checked by `pacecheck.py`), a recap image after each segment, a structured (mindmap) ending, continuity with the previous and next lesson. One house style for everything the learner sees: the Engram studio, light by default, dark for seeing inside — chosen from the content like the stage (`reference/01-principles.md` §1, `reference/03-adapter-pattern.md` §1.2, `scripts/studio/lib/house/`). The teacher is the learner's choice (`reference/11-teachers.md`); the functions are fixed. A teacher changes how each beat is said, never the beats.
4. **Build on what was approved.** A new round changes only what needs changing; versions are not either/or.
5. **Define before use.** First appearance of a term: full name + one plain-language sentence, said and written. No vague pronouns or AI-speak ("that cell", "this box").
6. **Real thing on the main screen.** Analogies only when the real thing cannot be drawn and is hard to grasp; return to the real thing immediately.
7. **Recompute every number** and keep it consistent across frames; mark wrong intuitions on screen as wrong.
8. **Two stages, `readcheck.cjs` and a silent review** before any full render, all reviewed internally (host + a separate reviewer), never by stopping for the user. Check full-resolution frames, never only thumbnails.
9. **One cloud session per lesson**; archive it as soon as its parts are collected. Ask before deleting branches or old videos.
10. Do not read the vault's `Clippings/`. Look up any unfamiliar term on the web before writing about it.
11. **Hands and eyes go where the words go.** When the narration names a thing the viewer must find, the teacher looks and points at it on that word and the student looks too (`lib/cast/cue.js`); never a fixed "point while talking".

## Files

```
SKILL.md
reference/
  01-principles.md            the biggest principle, learning principles table, iteration principle
  02-learning-design.md       Ultralearning default, learning map, series plan, single-lesson scope
  03-adapter-pattern.md       the metaphor, diagnosis + layer-by-layer judgment (stage, shape, device), subjects improvise, borrowing
  04-skeleton.md              head / middle / tail, course map visibility, sound, picture spec, length
  05-presentation-methods.md  stages, segment shapes and moment devices done so far, with status; the demo films (minimum bar)
  06-workflow.md              producer stages, host duties, silent review, cloud render, delivery
  07-voice-and-language.md    voices, Chinese and English conventions, TTS and ASR traps
  08-tools.md                 studio setup and commands, script.json, scene.html contract, components
  09-pitfalls.md              mistakes already made, with the reason
  10-iteration-and-records.md how experience is recorded; status changes; end-of-round checklist
  11-teachers.md              the learner picks who teaches: shared rhythm, beat styles, the three core teachers, skins, names, custom teachers
  12-modules.md               the full version by default, the learner subtracts: cards (review cards, needs rework); transfer rejected
templates/                    SERIES, UNDERSTANDING, CARD, SCRIPT, FACTS, NOTES, BRIEF (producer task), SILENT-REVIEW
scripts/
  studio/                     render.cjs, compose.py, voice.py, asr.py, bgm2.py, readcheck.cjs, pacecheck.py, remiddle.py, sfx.py, package.json, lib/ (components + docs; lib/atlas = Atlas diagram world; lib/cast = teacher registry teachers.json, skins and their contract CAST.md, cue.js = hands and eyes go where the words go; lib/course/modules.json = default-on modules; lib/house = the Engram studio house style, light and dark)
  farm/                       cloud render: one session per lesson, plan, collect, seam check, screening room
  deliver.py                  music, holds, poster, subtitles, meta.json entry
  series_status.py            lists the plugin's waiting requests, reports making / ready / failed
  doctor.py                   checks this machine has what production needs
assets/
  music/                      Morning.mp3 (CC BY 4.0, credit required) — opening and ending only
  looks/                      stills from the demo films, with what to learn and what not to copy
  cast-designs/               the user's design images for character skins (build to match them)
  portraits/                  one portrait per registry teacher in its current look (picker cards)
```

The lab notebook (every experiment, the user's exact words, rejected versions) lives in the vault at (not public). This skill holds only the distilled rules; when they disagree, update both (`reference/10-iteration-and-records.md`).

## Reporting problems

The user develops engram-quest. If you find a bug in the plugin or in this skill (wrong path, broken script, unclear rule), confirm it first, then open a ticket in `debug/` as the vault's `AGENTS.md` describes, and tell the user.
