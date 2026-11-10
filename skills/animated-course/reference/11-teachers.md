# 11 Teachers: the learner chooses who teaches

> Status: the concept is **approved**. The skins other than the clay cast are **trial**. Nico carried the first full non-clay series (stock-market basics, 5 lessons, `研究/實驗15-股市入門/`) with the **old** robot look; the robot, capsule, glass and ink looks were then redone the same day (§6 table) and have not been in a finished film yet. Lab notebook: `研究/00-角色系統方案（外觀、個性、自訂）.md`, `研究/實驗14-角色畫風（11 種）/00-紀錄.md`; mock-up of the picker: `研究/角色選擇樣稿/`.

## 1. The idea

- **Every teacher shares the rhythm** (`04-skeleton.md`): hook → per segment explain → one pause (predict, then reveal) → recap image (with real silence) → a recall question before the next segment (except at a seam made by closing a segment at its reveal, `04-skeleton.md` §2) → mindmap ending (`04-skeleton.md` §2). The strongest learning moves live in the rhythm, so the floor stays the same whoever teaches.
- **A teacher changes how each beat is said, without extra beats or interjections**: a persona inserting its move everywhere broke the rhythm.
- **Every teacher = an operating principle (what is actually done) + a learning principle (why it works) + a character (name, skin, voice, register).**
- **A learning approach is a teacher.** There is no separate "learning method" setting: a new evidence-based approach that a film can actually carry becomes a new teacher (registry entry or custom teacher) with its operating and learning principle; one that needs the learner to act outside the film (e.g. the learner explaining it back) fits after the film, not in a teacher.
- **Hands and eyes go where the words go, for every teacher** (`01-principles.md` §2, `lib/cast/cue.js`): on the word that names a thing, the teacher looks and points at it and the student looks too: the eye lands where the meaning is. Shared rhythm, not a style.
- The learner chooses one thing: **who teaches**. The student and the embodiment come from the same skin family and keep their functions (the student says the intuitive answer at the pause; with a Pro teacher the student may also ask one or two deep whys in place of a teacher setup line, `05-presentation-methods.md` §3c; the embodiment acts out what the system does).

## 1b. Free and Pro (decided 2026-11-09)

- **Free: Nico only. Pro: Nova, 包老師, Luna, Iris, Alden** (`teachers.json` → `tier`; Nico is the registry `default`). The teachers replace the old "advanced video styles" as the video Pro selling point. Without Pro the resolver falls back to Nico.
- **The floor is every teacher's, free included, never made worse on purpose** (「基本的都要有」): the skeleton and its rhythm (`04-skeleton.md`), the voice structure (`07-voice-and-language.md` §1b-4), the picture following new information and hands and eyes going where the words go (`01-principles.md` §2), the aha composed as the same picture reassembled, only the change moving while it happens, the student's reaction at a reveal, the recap that draws a process's path, carrying an object across a seam, recap-card words as a short anchor, a wrong proposal answered by its right part first, quiet sound effects on key actions (`04-skeleton.md` §2, §6), a cue that travels a relation and two rulers when the yardstick changed (`05-presentation-methods.md` §3c), measured and true on one dial (§3c), the bet on the blackboard (§3b), the course map asking the previous lesson (§3d), closing a long segment at its reveal (`04` §2), define-before-use, the bet at the pause in its approved order, recap, recall, the mindmap ending, the classroom with its blackboard (one key concept at a time) and course map, one consistent look.
- **Pro teachers add the curiosity-and-depth toolkit** (「好奇之類或是更深度的 希望pro版能更好」): the devices marked **Pro** in `05-presentation-methods.md` — planted piece, visible reasoning, recall with a new case, question ladder, ending returns to the opening, naming the common mistake before it happens and the concrete boundary sentence (`07` §1b-3 point 6), a real case of the same mistake, the student asking the deep why, the rule's radius, stepping down into one run, the decision-maker's misreading (`05` §3c) — and later approved devices of that kind. They live inside beats the rhythm already has (how a segment opens, what happens at the pause, how a segment's point is reached, how the recall is asked, how the tail closes), so there is still one rhythm. They are chosen per segment from the diagnosis, not as a quota (`05` §1). Each Pro teacher leans on the ones closest to its operating principle — Iris: visible reasoning (and stepping down into one run), question ladder, the boundary sentence and the rule's radius (her boundary angle; the radius beat replaces her question in that segment); Luna: ending returns to the opening, recall with a new case, recall that reaches back to earlier lessons (the course map asking the previous lesson is for every teacher, and hers most of all); Alden: planted piece (the student takes the step), naming the common mistake (kindly), the student's deep why, and the deadpan line after an absurd fact (`07` §1b-3 point 7); Nova: a real case, question ladder, the decision-maker's misreading (what it means for the person who decides); 包老師: question ladder, planted piece. Any Pro teacher may use any of them when the content calls for it, except the deadpan line: Alden's alone (user, 2026-11-10).
- **Where a new improvement goes**: something every learner needs to understand the film, or plain quality (voice, picture, sound, motion), goes into the floor; a curiosity or depth device goes into the Pro toolkit. Each A/B test in the screening room says which tier it is for.

## 2. Which teacher to use

**Use the resolver** (it applies the fallbacks consistently and records why):
```bash
node scripts/studio/lib/cast/resolve.cjs [--series <slug>] [--teacher <id>] [--lang zh-tw|en] > projects/<id>/cast.json
```
It applies these rules and prints the teacher, the skin (`skin.id`, `skin.file`), `voices` ready for `script.json`, the four `beats` with their definitions, the `meta` entry, and `notes` explaining every fallback:
1. A teacher named in the user's request (`--teacher`) wins; then the series' `meta.json` → `cast.teacher` (`--series`); then `engram-quest/videos/settings.json` → `cast.teacher` (written by the plugin's picker).
2. Registry: `scripts/studio/lib/cast/teachers.json`, the only copy. A custom teacher (`custom:<id>`) is `engram-quest/cast/custom/<id>.json`.
3. Not set → with `pro: true`, offer the teachers at the syllabus checkpoint (`SKILL.md`; one question, default teacher first) and pass the choice as `--teacher`; without Pro the teacher is Nico and there is nothing to ask (§1b). A `pro` teacher while `settings.json` has no `pro: true`, or a teacher whose skin file is not installed → the default teacher, however it was chosen; if the user asked for that teacher, say so at the checkpoint. No questions after the checkpoint: the run goes end to end (user's decision); copy `notes` into `NOTES.md`.
4. A series keeps one teacher, so it feels like one course.

## 3. Beats

The registry (`teachers.json` → `beats`) lists the ways of saying each beat; each teacher picks one per beat. In `SCRIPT.md` each beat is written in the teacher's style from the registry's definitions. Content still comes from the understanding card: the question, the wrong intuition, the example. A style changes how a line is said, not the segments or the core explanation's time.

**Write for the ear: felt, not announced; the teacher leads**.
- Beat or method names spoken (「先講通」「換個角度想」「現在停一下」「我們來回想」) are what sounded odd.
- What worked: a question growing out of the sentence before it, the way a good tutor leads: 「……你宣告要幾個，它就維持幾個。」/「掛一個，補一個。」/「那如果它掛掉，是因為程式本身有 bug 呢？」
- A comma or colon inside a phrase (「Kubernetes 就是，你說」) becomes a TTS pause; reading lines aloud (or via TTS) before voicing catches it.

## 4. The three core teachers

### Luna｜融會貫通 (memory) — skin `glossy-owl`, Pro
- **Operating principle**
  - Before writing, search the learner's vault for concepts this lesson can build on: notes (skip `Clippings/`), EngramQuest review cards (`.obsidian/plugins/engram-quest/data.json` → `flashcardTags`) and memory maps (`memoryMapFolder`). List them in `CARD.md` with the note path.
  - Explain by **deriving** the new concept from a known one or **contrasting** them, naming the single difference ("Docker looks after one container; Kubernetes looks after the whole group").
  - **Use the knowledge as something the learner simply knows; the notes stay out of the film** (no "your note says", no note titles, no dates, nothing on screen), in a natural tone ("還記得容器嗎？").
  - At the pause, ask the learner to recall the old concept without hints, then connect.
  - Recap: the new concept linked to the old one. If cards are produced, link them to the old cards.
  - Nothing related in the vault → fall back to `everyday-scene` / `analogy-map`. **Never invent a note** (truthfulness).
- **Learning principle**: prior knowledge (Ausubel), elaboration, comparison (Gentner et al. 2003: comparing two cases transfers better than studying one), retrieval practice.

### Nico｜實戰演練 (practice) — skin `glossy-bot`, free, the default teacher
- **Operating principle**: open by putting the learner inside a real situation (second person; the learner's own project from the series plan if there is one); explain on the real interface with real numbers (the real-UI floor, `研究/實驗13-角色試片`), the student acts and sees the consequence; pause = "your turn: what next?"; recap = one action for tomorrow.
- **Learning principle**: directness (Ultralearning), situated learning, worked example before practice, first-person immersion.

### Iris｜多維思考 (thinking + questioning) — skin `glass`, Pro
- **Operating principle**: make the concept clear first (understand before challenge); then a Socratic question from one angle (`dimensions`: cause, boundary, counter-example, cost, another role, scale ×10), led into from the explanation like a guide (「那如果……呢？」) rather than announced; the angle is labelled on screen only; at the pause the student answers by intuition, then the reveal; recap = a dimension map. One per segment, about three per lesson; more becomes §1's rhythm-breaking 追問. In a segment where the student asks the deep why or the rule's radius plays (Pro devices, `05-presentation-methods.md` §3c; with her, the two go in different segments), that device takes her question's place, so questions do not pile up.
- **Learning principle**: elaborative interrogation, Socratic questioning, cognitive flexibility (Spiro: a concept seen from several angles transfers to new cases), understand before challenge.

## 5. The other teachers

| Teacher | Skin | Operating principle | Learning principle |
|---|---|---|---|
| Alden｜耐心引導 (Pro; replaced Rumi 2026-11-04) | `porcelain` | Start from the learner's own question; give one hint and let the student take the step, then confirm in one whole sentence; real silence at the pause, a wrong guess met kindly; recap = one sentence to keep; dry humour sparingly, her persona set at about two lines per lesson (how: `07-voice-and-language.md` §1b-3 point 7). Calm, knows a lot, doesn't show off | Scaffolding (Wood, Bruner & Ross 1976), guided discovery, generation effect, low anxiety |
| Nova｜直白熱血 (Pro since 2026-11-09) | `glossy-nova` | Open with what it means for you; every term restated plainly; recap = one sentence to keep | Utility value (Hulleman & Harackiewicz 2009), motivation |
| 包老師｜生活比喻 (Pro since 2026-11-09; was the default; `hidden` in the registry since 11-09 because its clay look clashed with the studio, so it is not offered and only a request naming it uses it — with the classroom back as the default, the user may want to revisit this) | clay (`lib/classroom/cast.js`) | One everyday analogy per mechanism, mapped back to the real thing | Analogy, everyday prior knowledge |

## 6. Skins

- A skin is only an asset: one file per family, `scripts/studio/lib/cast/skins/<id>.js`, contract in `scripts/studio/lib/cast/CAST.md`. Swapping a skin changes no script.
- **Current looks (films use these; older versions are kept for comparison in the lab notebook's `實驗14…/製作檔/styles/*-v1.js|-v2.js`).** Portraits for a picker or a card: `assets/portraits/<teacher>.jpg` (640 px, rendered with `hero.html`, teacher, idle, turn 0.3, px 800, square crop). The registry's `skins[]` carries `version`, `look`, `design` and `portrait` for each.

| Teacher | Skin (version) | Teacher looks like | Student | Embodiment | State signature | Built from |
|---|---|---|---|---|---|---|
| Luna | `glossy-owl` (v2 of the owl, unchanged) | warm brown owl, purple glasses, pencil, book emblem on the chest | bunny | teal firefly | chest emblem + mark above the head: blue "…" think, green "!" aha, amber "?" doubt | user's design image (earlier; the user's favourite) |
| Nico | `glossy-bot` (v2) | big-headed white robot, navy vest with gold trim, blue ear rings, pointer + tablet | 芋圓: shorter, rounder, orange ear cups and backpack | hovering orb drone | antenna/ear lamp: blue think, green aha, orange-red doubt; LED face | `assets/cast-designs/glossy-bot.jpg` |
| Nova | `glossy-nova` (v1, 2026-11-03) | pearl-white gumdrop robot, lilac + pink panels, big dark visor with a lilac rim, confident cyan smirk, magenta four-point star on top, glowing wand, small holo card when pointing | rounder robot with a yellow rim, two bud lights, a peach notebook | magenta star with a face | star + belly slot: blue think, green burst + wink + thumbs-up aha, orange-red + "?" doubt | `assets/cast-designs/nova.jpg` (replaced the candy capsule) |
| Iris | `glass` (v3) | ice-blue glass robot, black visor, cyan eyes, glowing orbital core | lilac glass sphere with a magenta core | mint faceted crystal | core: blue + faster spin think, gold pulse aha, dim flicker doubt | `assets/cast-designs/glass-ink.jpg` (top row) |
| Alden | `porcelain` (v3, approved 2026-11-04) | deep-blue book-page spirit (felt cloth with gold dust, layered page flaps with teal lining, gold-piped hem, floating motes of light): a pointed hood folded like pages round a warm glowing face (amber almond eyes, thin brows, small smile, occasional twinkle), teal lining, gold piping, teal sash, light at the chest, bell sleeves, glowing hands; points with an open palm offered upward | round little porcelain bot in an apricot knit cap, notebook | small white-and-gold porcelain tutor-bot (navy visor, sage scarf, gold base) | chest light / pompom / bot's gem: blue think (hand to chin, eyes up), green aha (laughing closed eyes, a small chuckle), orange-red + "?" doubt (one brow up, knowing smile) | `assets/cast-designs/porcelain.jpg` (left = teacher) |
| 包老師 | clay (`lib/classroom/cast.js`) | clay soup dumpling, red bow tie | 芋圓 (taro) | — | steam / leaf droop | — |

- **Colour sets**: a skin may offer a few designed colour sets of the same characters (`CAST.md` → Colour sets). The learner picks one before a course is made (films are rendered video; an existing film keeps its colours). Resolution: `--variant` (named in the request) > `settings.json` → `cast.variants.<teacher id>` > `cast.variant` > the skin's first set; `resolve.cjs` prints `skin.variant` and `skin.variants`, and notes a fallback. Pass `skin.variant` to `makeCast` and to `create` on flat scenes; record it in `meta.json` (`cast.variant`). Now: Nico (`glossy-bot`) has `classic` (navy & gold, orange student), `wine` (wine & gold, mustard student), `grape` (grape & gold, pink student); the other skins have one look. Changing the character itself = choosing another teacher.
- Old looks no teacher uses (glossy animal, pearl, the candy capsule, earlier versions) live in the lab notebook, `研究/實驗14-角色畫風（11 種）/製作檔/styles/`; the skill holds the live skins.
- Cost: a more detailed cast renders slower in every scene it appears in (measured 2026-11-02: `scripts/studio/lib/cast/CAST.md` → Rules → Performance). The CAST.md triangle budget is the reference.
- **Classroom scenes (opening, mindmap ending, any three.js scene)**: build the cast with `makeCast(cast.skin.id, { renderer, variant: cast.skin.variant })` from `/lib/cast/classroom.js` instead of `C.makeTeacher()` / `C.makeStudent()`. It returns `{teacher, student, embodiment}` with the clay API (`root`, `pose({t, mouth, turn, armL, armR, tilt, steam, leafDroop …})`), scaled to the clay heights, so existing classroom code works unchanged; `poseNative({talk, point, wave, hop, state, stateK …})` gives the skin's own gestures and state light (`CAST.md`). `'clay-snackshop'` returns the clay cast itself. Verified 2026-11-02: the classroom opening rendered with glossy-owl, glossy-bot, glass and clay (`研究/實驗14-角色畫風（11 種）/00-紀錄.md` §7).
- **Flat real-UI scenes**: place the skin with `lib/cast/stage.js` (`makeStage` → `place`), the way experiment 14's showcase does. 2D skins work only here.
- Known gaps: `coursemap4.js` still rides the clay Taro on the map (acceptable for now); the clay classroom room itself is the only classroom. Every registry skin is 3D now. Rumi (`ink`, 說個故事) was retired on 2026-11-04; the skin and its portrait are kept only in the lab notebook (`實驗14…/製作檔/styles/ink-v3.js`). A request or setting that still names `rumi` falls back to the default teacher with a note (that fallback has been rendered in the classroom opening).
- Quality bar from the user: rounded, refined, friendly, and the teacher looks like someone who knows a lot. **Teacher and student are told apart at a glance by silhouette, colour identity and role props** (teacher: taller, a deep uniform colour block with a trim, a teaching prop; student: rounder, bigger head, a warm accent, backpack/tablet) — colour alone was not enough. A design image from the user (`assets/cast-designs/`) is followed closely.

## 7. Names and voices

- Names are short two-syllable English names, tested through the narration voices and ASR (`09-pitfalls.md`). Subtitles show `name`; the narration uses `say` (露娜, 艾瑞絲 …) when the name is mid-sentence.
- Voice, register and **pace** (`pace.defaultPause`, the gap between a teacher's lines) per teacher are in the registry; voice a teacher one idea per line, several sentences of one idea as a `group`, with layered pauses (`07-voice-and-language.md` §1b, §1b-4). `sampleScript` is each teacher's preview in that form. The student takes a voice different from the teacher's so the ear tells them apart (zh-TW has only three voices: YunJhe, HsiaoYu, HsiaoChen).

## 8. Custom teachers and skins (made by the learner's AI)

- `engram-quest/cast/custom/<id>.json`: same fields as a registry teacher. `beats` use the registry's beat names, same number and order (the resolver and shared rhythm depend on it).
- `engram-quest/cast/skins/<id>/`: a skin module plus its 6-frame sheet; it passes the `CAST.md` test before use (else scenes break). No trademarked characters, no real people (rights, likeness).

## 9. Records

Add to the film's `meta.json` entry: `"cast": { "teacher": "<id>", "skin": "<id>", "variant": "<colour set, if any>" }`; for Luna also `"notesUsed": ["<note path>", …]` (an internal record for linking cards; it stays out of the film, §4).
