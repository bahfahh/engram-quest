# 12 Modules: the full version by default, the learner subtracts

> Status: the model is **approved**. Each module itself is **trial** until the user has reviewed a finished film that uses it. Experiment 17 (2026-11-06) was that review: `transfer` was **rejected** and removed (§3.1), `cards` **needs rework** (§3). Lab notebook: `研究/00-教學影片變好的其他維度.md`.

## 1. The idea

- Every course is made in **the full version**. Some parts are **modules**: on by default, and the learner may turn them off in the plugin. Nothing is ever added on top of the default by a setting — only taken away. This keeps the number of combinations small and every film at the quality that was reviewed.
- **The skeleton is not a module** (`04-skeleton.md`): hook, course map, one-liner, a recap image per segment, mindmap ending, continuity. It cannot be turned off. Neither can the principles (`01-principles.md`) or the cues (hands and eyes go where the words go).
- **Against bloat: new things enter as modules, never straight into the skeleton.** The skeleton is the reviewed, optimized base; adding every good idea to it would make every film heavier. So a new part goes in as a module (on by default, can be turned off), and the skeleton itself changes only when the user decides it after reviewing films. Modules also fit **inside** the lesson length (`04-skeleton.md` §8): the full version does not get longer because of them.
- How each module is shown is still the producer's call per content (`03-adapter-pattern.md`). A module that has no honest way to appear in a lesson is skipped for that lesson with the reason written in `NOTES.md` — **never force-fit a module**.
- Registry: `scripts/studio/lib/course/modules.json` (id, status, name, what it does, cost, where its rule lives). The plugin shows the same list with an on/off switch each.

## 2. Which modules are on

`resolve.cjs` decides it, together with the teacher (`SKILL.md` step 1); do not work it out by hand:
```bash
node scripts/studio/lib/cast/resolve.cjs [--off cards] [--on cards] > projects/<id>/cast.json   # → modules[]: {id, on, why}
```
1. Default: every module in the registry is on.
2. `engram-quest/videos/settings.json` → `"course": { "off": ["cards"] }` (written by the plugin) turns modules off.
3. In the request: "no review cards" → `--off cards`; "this time with review cards" → `--on cards` overrides the setting for this run.
4. Unknown ids are ignored with a note. Copy the `modules` lines of `notes` into `NOTES.md`; a series uses the same modules in every lesson.

## 3. The modules

### `cards` — Review cards (複習卡) — needs rework
- **Status**: A screenshot of the film's recap card plus "what does it say" is only a second viewing. The new design is being decided with the user (lab notebook, experiment 17); until then the mechanics below still work but are not the target.
- **What**: each segment's recap picture becomes one EngramQuest review card, scheduled by the plugin's spaced repetition. The film does not change.
- **Why**: the two strongest study techniques are retrieval practice and spacing (Dunlosky et al. 2013); a film is watched once, cards bring it back at the right intervals. The recap pictures are already one picture + one sentence: ready-made cards.
- **How** (stage 2, after the stills are checked): write `projects/<id>/cards.json`, one entry per segment recap:
  ```json
  [{ "front": 91.2, "back": 93.6, "q": "…", "a": "…" }]
  ```
  - `front`: a second in `final.mp4` where the recap **figure is complete but its key sentence has not appeared yet** (otherwise the answer is on the front). `back`: a second where the full card with the sentence is shown. Check both frames.
  - **Each recap card must stand alone**, because months later it is seen without the film: the totals it compares, what was changed, the numbers it relies on are on the card itself (experiment 17's silent review: card 2 had no 8 s total, card 3 never said what was changed — both unreadable alone). The silent review judges every recap card this way.
  - `q` / `a` follow the plugin's image-card rules (`.obsidian/plugins/engram-quest/bundled-skills/review-deck/references/image-cards.md`): the question needs the picture's reasoning, never its name ("what does this diagram show?" is forbidden); the answer starts with the key sentence and quotes something visible in the picture so the learner can check themselves. In the film's language.
  - `scripts/deliver.py` cuts the frames into `<series>/cards/`, writes the deck `engram-review/ai-cards/video-<series>-<id>.md` (tag `<flashcardTags prefix>/videos/<series>`; frontmatter `video` = the delivered film and `video_times` = the second to rewatch per card, for the plugin's "rewatch" button; `%%card%%` image cards ending with the film title and that second), and adds `"cards"` to the video's `meta.json` entry. Turned off (`course.off` or `--no-cards`) → no deck; an existing deck is never deleted.
- **Where**: `06-workflow.md` step 6, `scripts/deliver.py`.

### 3.1 Rejected: `transfer` — Somewhere else (換個地方)
A 10–15 s beat before the mindmap that showed the lesson's mechanism once in a far, everyday context (experiment 17: cooking a curry). Why it failed: (1) placed after everything was understood, it helps no one understand; (2) the analogy was structurally wrong (in a kitchen steps run at the same time, so the waterfall premise does not hold); (3) a default-on module forced a far context into every lesson, against "never force-fit". Do not bring it back as an analogy beat in any form.

## 4. Adding a module

Every new part of a course goes this way (not into the skeleton, §1). It becomes a module only when (a) it is evidence-based and a film or the plugin can actually carry it, (b) the user agreed it belongs in the full version. Add it to `modules.json` as `trial`, write its rule here, and open a feature ticket for the plugin's switch if the plugin needs to do anything (`10-iteration-and-records.md` §4). Only the user's review of finished films makes a module `approved`.
