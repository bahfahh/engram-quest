# Producer brief — <round name>: <course>, lessons <…>

> The host fills this in for each producer, from the skeleton and the approved methods. "Don't reuse last round's shell" or "at least one segment must be new" invite a redesign that loses approved work.

You are one of <k> producers; each makes one lesson. <What this round is for, in one or two sentences.>

`STUDIO=<path>`  `SKILL=.claude/skills/engram-quest-animated-course`

## 0. Read first (in order)
1. `$SKILL/SKILL.md` and all of `$SKILL/reference/`. This brief adds only this round's specifics.
2. The user's words for this round (§1).
3. The series plan: `<path to SERIES.md>`.
4. Your lesson's earlier versions, if any (approved parts are kept): `<paths>`.
5. Course material, incl. self-check questions: `<path>`.
6. `$SKILL/reference/08-tools.md` and the component docs in `$STUDIO/lib/`.

## 1. The user's feedback (why this round exists)
> (quote the user exactly)

So this round: (what is kept, what changes, why — on the approved version)

## 2. Your lesson
| id | Lesson | Start from |
|---|---|---|

Setup: `cp -r` the starting project to `$STUDIO/projects/<id>/` and delete render output (`final.mp4`, `_parts*`, `_seg*`, `narration.wav`, `timeline.json`, `subtitles.vtt`, `READY`).

## 3. Conventions for this round
- **Teacher**: `<id>` (the user's choice; the host ran `node $STUDIO/lib/cast/resolve.cjs [--teacher <id>] > $STUDIO/projects/<id>/cast.json`; copy `voices` into `script.json` and `pace.defaultPause` into its `defaultPause` (one sentence per line, `07-voice-and-language.md` §1b; set `"engine"` to the engine the host settled while planning — producers don't ask, §1c — and copy the `voice engine:` line voice.py prints into NOTES.md), write each beat in the style listed under `beats`, build the classroom with `makeCast(cast.skin.id, { renderer, variant: cast.skin.variant })` and flat scenes with `create(st.env, { variant: cast.skin.variant })` — the learner's colour set, `reference/11-teachers.md` §6). One teacher for the whole series.
- Language, voices, money, terms, fonts: (from `reference/07-voice-and-language.md` and the series glossary)
- Course map question card: short (≤ 6 words so far).
- Length: <target and why>.

## 4. Stage 1 (when done, report to the host and wait for its reply — the host replies right away, the user is never asked)
Per `reference/06-workflow.md` §1 steps 1–3. Report (last message, short): the one-liner and its second; the opening 30 s of lines; one line per segment (method, what the viewer should get or feel, why — kept / changed); mindmap structure; length; three still paths; pronunciation spot-check; tool problems. Report by <time UTC> (`date -u`), then stop and wait.

## 5. Stage 2 (after the host's reply)
Per `reference/06-workflow.md` §1 step 4. Handover frames identical; first frame a good opening picture (held 3 s); last frame complete and clean (held 5 s). No full renders — the host sends them to the cloud. Write `READY` with the poster second.

## 6. Rules
- Write only in your project folder; read others'. `lib/`, `render.cjs`, `compose.py`, `voice.py` are shared — report problems, copy for a variant.
- Don't modify the vault, don't commit, don't read the vault's `Clippings/`.
- Shared machine: no full renders; ASR only on hard lines; previews in short ranges. Three.js stills need `RENDER_GPU=1`.
- Keep "estimated / third-party" hedges from the course material.
