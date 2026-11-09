# 11 Teachers: the learner chooses who teaches

> Status: the concept is **approved**. The skins other than the clay cast are **trial**. Nico carried the first full non-clay series (stock-market basics, 5 lessons, `研究/實驗15-股市入門/`) with the **old** robot look; the robot, capsule, glass and ink looks were then redone the same day (§6 table) and have not been in a finished film yet. Lab notebook: `研究/00-角色系統方案（外觀、個性、自訂）.md`, `研究/實驗14-角色畫風（11 種）/00-紀錄.md`; mock-up of the picker: `研究/角色選擇樣稿/`.

## 1. The idea

- **The rhythm is the same for every teacher** (`04-skeleton.md`): hook → per segment explain → one pause (predict, then reveal) → recap image (with real silence) → a recall question before the next segment → mindmap ending (`04-skeleton.md` §2). The strongest learning moves live in the rhythm, so the learning floor is the same whoever teaches.
- **A teacher changes only how each beat is said.** No extra beats, no interjections. A persona that inserts its move everywhere breaks the rhythm.
- **Every teacher = an operating principle (what is actually done) + a learning principle (why it works) + a character (name, skin, voice, register).**
- **A learning approach is a teacher.** There is no separate "learning method" setting: a new evidence-based approach that a film can actually carry becomes a new teacher (registry entry or custom teacher) with its operating and learning principle; one that needs the learner to act outside the film (e.g. the learner explaining it back) belongs after the film, not in a teacher.
- **Hands and eyes go where the words go, for every teacher** (`01-principles.md` §2, `lib/cast/cue.js`): on the word that names a thing, the teacher looks and points at it and the student looks too. This is part of the shared rhythm, not a style.
- The learner chooses one thing: **who teaches**. The student and the embodiment come from the same skin family; their functions do not change (the student says the intuitive answer at the pause; the embodiment acts out what the system does).

## 2. Which teacher to use

**Run the resolver; do not work it out by hand:**
```bash
node scripts/studio/lib/cast/resolve.cjs [--series <slug>] [--teacher <id>] [--lang zh-tw|en] > projects/<id>/cast.json
```
It applies these rules and prints the teacher, the skin (`skin.id`, `skin.file`), `voices` ready for `script.json`, the four `beats` with their definitions, the `meta` entry, and `notes` explaining every fallback:
1. A teacher named in the user's request (`--teacher`) wins; then the series' `meta.json` → `cast.teacher` (`--series`); then `engram-quest/videos/settings.json` → `cast.teacher` (written by the plugin's picker).
2. Registry: `scripts/studio/lib/cast/teachers.json`, the only copy. A custom teacher (`custom:<id>`) is `engram-quest/cast/custom/<id>.json`.
3. Not set → with `pro: true`, offer the teachers at the syllabus checkpoint (`SKILL.md`; one question, default teacher first) and pass the choice as `--teacher`; without Pro there is nothing to choose, so do not ask. A `pro` teacher while `settings.json` has no `pro: true`, or a teacher whose skin file is not installed → the default teacher, however it was chosen; if the user asked for that teacher, say so at the checkpoint. No questions after the checkpoint; copy `notes` into `NOTES.md`.
4. Every lesson of a series uses the same teacher.

## 3. Beats

The registry (`teachers.json` → `beats`) lists the allowed way of saying each beat; each teacher picks one per beat. When writing `SCRIPT.md`, write each beat in the teacher's style, using the definitions in the registry. Content still comes from the understanding card: the question, the wrong intuition, the example. A style never adds a segment and never takes time from the core explanation; it replaces how a line is said.

**Write for the ear.**
- Never say a beat's name or the method aloud: no 「先講通」「換個角度想」「現在停一下」「我們來回想」. The structure is felt, not announced.
- A question grows out of the sentence before it, the way a good tutor leads: 「……你宣告要幾個，它就維持幾個。」/「掛一個，補一個。」/「那如果它掛掉，是因為程式本身有 bug 呢？」
- No comma or colon inside a phrase (「Kubernetes 就是，你說」): TTS turns each into a pause. Read every teacher line aloud (or through TTS) before voicing the lesson.

## 4. The three core teachers

### Luna｜融會貫通 (memory) — skin `glossy-owl`, Pro
- **Operating principle**
  - Before writing, search the learner's vault for concepts this lesson can build on: notes (skip `Clippings/`), EngramQuest review cards (`.obsidian/plugins/engram-quest/data.json` → `flashcardTags`) and memory maps (`memoryMapFolder`). List them in `CARD.md` with the note path.
  - Explain by **deriving** the new concept from a known one or **contrasting** them, naming the single difference ("Docker looks after one container; Kubernetes looks after the whole group").
  - **Never mention the notes**: no "your note says", no note titles, no dates, nothing on screen. The notes may be AI-written; use the knowledge as something the learner simply knows, in a natural tone ("還記得容器嗎？").
  - At the pause, ask the learner to recall the old concept without hints, then connect.
  - Recap: the new concept linked to the old one. If cards are produced, link them to the old cards.
  - Nothing related in the vault → fall back to `everyday-scene` / `analogy-map`. **Never invent a note.**
- **Learning principle**: prior knowledge (Ausubel), elaboration, comparison (Gentner et al. 2003: comparing two cases transfers better than studying one), retrieval practice.

### Nico｜實戰演練 (practice) — skin `glossy-bot`, free, the default teacher
- **Operating principle**: open by putting the learner inside a real situation (second person; the learner's own project from the series plan if there is one); explain on the real interface with real numbers (the real-UI floor, `研究/實驗13-角色試片`), the student acts and sees the consequence; pause = "your turn: what next?"; recap = one action for tomorrow.
- **Learning principle**: directness (Ultralearning), situated learning, worked example before practice, first-person immersion.

### Iris｜多維思考 (thinking + questioning) — skin `glass`, Pro
- **Operating principle**: make the concept clear first, never question before it is understood; then **one** Socratic question per segment from one angle (`dimensions`: cause, boundary, counter-example, cost, another role, scale ×10), led into from the explanation like a guide (「那如果……呢？」), never announced; the angle is labelled on screen only; at the pause the student answers by intuition, then the reveal; recap = a dimension map. Limits: one question per segment, three per lesson.
- **Learning principle**: elaborative interrogation, Socratic questioning, cognitive flexibility (Spiro: a concept seen from several angles transfers to new cases), understand before challenge.

## 5. The other teachers

| Teacher | Skin | Operating principle | Learning principle |
|---|---|---|---|
| Alden｜耐心引導 (Pro; replaced Rumi 2026-11-04) | `porcelain` | Start from the learner's own question; give one hint and let the student take the step, then confirm in one whole sentence; real silence at the pause, a wrong guess met kindly; recap = one sentence to keep, at most two lines of dry humour per lesson. Calm, knows a lot, never shows off | Scaffolding (Wood, Bruner & Ross 1976), guided discovery, generation effect, low anxiety |
| Nova｜直白熱血 (Pro) | `glossy-nova` | Open with what it means for you; every term restated plainly; recap = one sentence to keep | Utility value (Hulleman & Harackiewicz 2009), motivation |
| 包老師｜生活比喻 (Pro; clay look, differs from the studio; `hidden` in the registry, so it is not offered and only a request naming it uses it) | clay (`lib/classroom/cast.js`) | One everyday analogy per mechanism, mapped back to the real thing | Analogy, everyday prior knowledge |

## 6. Skins

- A skin is only an asset: one file per family, `scripts/studio/lib/cast/skins/<id>.js`, contract in `scripts/studio/lib/cast/CAST.md`. Swapping a skin changes no script.
- **Current looks (use these; older versions are only in the lab notebook's `實驗14…/製作檔/styles/*-v1.js|-v2.js` for comparison, never in a film).** Portraits for a picker or a card: `assets/portraits/<teacher>.jpg` (640 px, rendered with `hero.html`, teacher, idle, turn 0.3, px 800, square crop). The registry's `skins[]` carries `version`, `look`, `design` and `portrait` for each.

| Teacher | Skin (version) | Teacher looks like | Student | Embodiment | State signature | Built from |
|---|---|---|---|---|---|---|
| Luna | `glossy-owl` (v2 of the owl, unchanged) | warm brown owl, purple glasses, pencil, book emblem on the chest | bunny | teal firefly | chest emblem + mark above the head: blue "…" think, green "!" aha, amber "?" doubt | user's design image (earlier; the user's favourite) |
| Nico | `glossy-bot` (v2) | big-headed white robot, navy vest with gold trim, blue ear rings, pointer + tablet | 芋圓: shorter, rounder, orange ear cups and backpack | hovering orb drone | antenna/ear lamp: blue think, green aha, orange-red doubt; LED face | `assets/cast-designs/glossy-bot.jpg` |
| Nova | `glossy-nova` (v1, 2026-11-03) | pearl-white gumdrop robot, lilac + pink panels, big dark visor with a lilac rim, confident cyan smirk, magenta four-point star on top, glowing wand, small holo card when pointing | rounder robot with a yellow rim, two bud lights, a peach notebook | magenta star with a face | star + belly slot: blue think, green burst + wink + thumbs-up aha, orange-red + "?" doubt | `assets/cast-designs/nova.jpg` (replaced the candy capsule) |
| Iris | `glass` (v3) | ice-blue glass robot, black visor, cyan eyes, glowing orbital core | lilac glass sphere with a magenta core | mint faceted crystal | core: blue + faster spin think, gold pulse aha, dim flicker doubt | `assets/cast-designs/glass-ink.jpg` (top row) |
| Alden | `porcelain` (v3, approved 2026-11-04) | deep-blue book-page spirit (felt cloth with gold dust, layered page flaps with teal lining, gold-piped hem, floating motes of light): a pointed hood folded like pages round a warm glowing face (amber almond eyes, thin brows, small smile, occasional twinkle), teal lining, gold piping, teal sash, light at the chest, bell sleeves, glowing hands; points with an open palm offered upward | round little porcelain bot in an apricot knit cap, notebook | small white-and-gold porcelain tutor-bot (navy visor, sage scarf, gold base) | chest light / pompom / bot's gem: blue think (hand to chin, eyes up), green aha (laughing closed eyes, a small chuckle), orange-red + "?" doubt (one brow up, knowing smile) | `assets/cast-designs/porcelain.jpg` (left = teacher) |
| 包老師 | clay (`lib/classroom/cast.js`) | clay soup dumpling, red bow tie | 芋圓 (taro) | — | steam / leaf droop | — |

- **Colour sets**: a skin may offer a few designed colour sets of the same characters (`CAST.md` → Colour sets). The learner picks one before a course is made (films are rendered video; an existing film keeps its colours). Resolution: `--variant` (named in the request) > `settings.json` → `cast.variants.<teacher id>` > `cast.variant` > the skin's first set; `resolve.cjs` prints `skin.variant` and `skin.variants`, and notes a fallback. Pass `skin.variant` to `makeCast` and to `create` on flat scenes; record it in `meta.json` (`cast.variant`). Now: Nico (`glossy-bot`) has `classic` (navy & gold, orange student), `wine` (wine & gold, mustard student), `grape` (grape & gold, pink student); the other skins have one look. Changing the character itself = choosing another teacher.
- Old looks that no teacher uses (glossy animal, pearl, the candy capsule, earlier versions) are kept only in the lab notebook, `研究/實驗14-角色畫風（11 種）/製作檔/styles/`; the skill holds only the live skins.
- Cost: a more detailed cast renders slower in every scene it appears in (measured 2026-11-02: `scripts/studio/lib/cast/CAST.md` → Rules → Performance). Keep within the CAST.md triangle budget.
- **Classroom scenes (opening, mindmap ending, any three.js scene)**: build the cast with `makeCast(cast.skin.id, { renderer, variant: cast.skin.variant })` from `/lib/cast/classroom.js` instead of `C.makeTeacher()` / `C.makeStudent()`. It returns `{teacher, student, embodiment}` with the clay API (`root`, `pose({t, mouth, turn, armL, armR, tilt, steam, leafDroop …})`), scaled to the clay heights, so existing classroom code works unchanged; `poseNative({talk, point, wave, hop, state, stateK …})` gives the skin's own gestures and state light (`CAST.md`). `'clay-snackshop'` returns the clay cast itself. Verified 2026-11-02: the classroom opening rendered with glossy-owl, glossy-bot, glass and clay (`研究/實驗14-角色畫風（11 種）/00-紀錄.md` §7).
- **Flat real-UI scenes**: place the skin with `lib/cast/stage.js` (`makeStage` → `place`), the way experiment 14's showcase does. 2D skins can only go here.
- Known gaps: `coursemap4.js` still rides the clay Taro on the map (acceptable for now); the clay classroom room itself is the only classroom. Every registry skin is 3D now. Rumi (`ink`, 說個故事) was retired on 2026-11-04; the skin and its portrait are kept only in the lab notebook (`實驗14…/製作檔/styles/ink-v3.js`). A request or setting that still names `rumi` falls back to the default teacher with a note and has been rendered in the classroom opening.
- Quality bar from the user: rounded, refined, friendly, and the teacher must look like someone who knows a lot. **Teacher and student are told apart at a glance by silhouette, colour identity and role props** (teacher: taller, a deep uniform colour block with a trim, a teaching prop; student: rounder, bigger head, a warm accent, backpack/tablet), not by colour alone. When the user supplies a design image, follow it closely; the user's design images are in `assets/cast-designs/`.

## 7. Names and voices

- Names are short two-syllable English names, tested through the narration voices and ASR (`09-pitfalls.md`). Subtitles show `name`; the narration uses `say` (露娜, 艾瑞絲 …) when the name is mid-sentence.
- Voice, register and **pace** (`pace.defaultPause`, the gap between a teacher's lines) per teacher are in the registry; voice a teacher one sentence per line (`07-voice-and-language.md` §1b). `sampleScript` is each teacher's preview in that form. The student always takes a voice different from the teacher's (zh-TW has only three voices: YunJhe, HsiaoYu, HsiaoChen).

## 8. Custom teachers and skins (made by the learner's AI)

- `engram-quest/cast/custom/<id>.json`: same fields as a registry teacher; `beats` must use names from the registry's `beats`; the number and order of beats never change.
- `engram-quest/cast/skins/<id>/`: a skin module plus its 6-frame sheet; it must pass the `CAST.md` test before it is used. No trademarked characters, no real people.

## 9. Records

Add to the film's `meta.json` entry: `"cast": { "teacher": "<id>", "skin": "<id>", "variant": "<colour set, if any>" }`; for Luna also `"notesUsed": ["<note path>", …]` (an internal record for linking cards; never shown in the film).
