# 09 Pitfalls (each one happened)

## Design
- **Forcing content into an existing method** — the worst. If it doesn't fit, design one.
- **Treating versions as either/or**; a new round redesigning the whole film and dropping the approved skeleton. (A round that rebuilt head and tail of six lessons from scratch got "I meant you to merge it into version 3 — you rebuilt everything".)
- **Asking the user which method to use.** That is the producer's judgement.
- **Writing rules as form** ("seven little buildings") instead of understanding → signposts.
- **Signpost maps and icons**: a station that is a podium with a name tag instead of the mechanism running.
- **Maps too fast, too close, unrecognisable**. An unreadable map is a signpost.
- **The whole film as one map** (experiment 18): every detail drawn onto one world, every concept opened inside it — dense, no focus, and the narration ended up reading the map item by item. A zoomed-out map is fine as the opening, the place between concepts and the ending; the film is not the map (`01-principles.md` §1).
- **"Subtraction" done as deletion** (experiment 18b): told the old frames had no focus, the producers cut content and narration to meet word, colour and silence budgets until frames were empty and meaningless. Move details to their own frame; judge by a glance, not by counts.
- **Turning one good way into the only way** (after 18c): the zoom out / zoom in decomposition is one approved method for abstract mechanisms. Do not redraw a real screen as a simplified diagram, or chop code into cards.
- **Extracting a demo into rigid rules**: the host turned the user's demo into eight rules. Pass a concept, references and examples; let each subject grow its own form.
- **Taking a user's metaphor literally**: "thinking castle" meant *make thinking visible*, not *build a castle*.
- **Replacing the realistic middle with the classroom**; making the whiteboard the main screen (it is a crib sheet); falling in love with analogies.
- **Every lesson in the same mould** ("every lesson looks exactly the same").
- **A 5-minute middle with no recap** ("my attention scattered").
- **A puppet that does nothing** in a split screen. A character on screen must be doing something.

## Words
- Vague pronouns and AI-speak: "that cell D7", "this box", "half-blind". Name the thing.
- Using a term before defining it — including in the one-liner.
- Making a simple idea complicated.
- The same term translated or defined differently in different lessons.

## Facts and numbers
- **Numbers not recomputed.** In one round the silent review caught a number error in every lesson (a doubled cost computed wrong, a sample rule contradicting its own examples, counts and percentages that don't divide). Recompute every number from its formula; keep it consistent across frames.
- **A wrong intuition written on screen without being marked wrong** — muted viewers remember it as advice. A definition written under a wrong intuition has the same problem.
- The ending introducing a rule the body never taught.
- Unverified facts presented as certain: keep the course material's "estimated / third-party" hedges; look up unfamiliar terms.

## Picture
- Small text in a wide shot treated as the point; reviewing only thumbnails (small, overlapping, cut-off text is invisible in thumbnails).
- "Clean" done as "small": the idea squeezed into a corner, half the frame empty.
- Handover frames that differ between pages → a one-frame flash. Take the handover image from the **last frame the outgoing page actually plays** (segment start − 1/30 s), not from the segment's start second: experiment 15 lesson 5's classroom cut its own camera back to the wide shot at the handover second, the producer captured that wide frame, and the film jumped from a board close-up to a wide shot (joincheck diff 73).
- GPU compositing on DOM pages → ghosting during camera moves (render DOM in software).

- From Lemo-Opuscar's list of most common failures, all seen in our films too: subject too small or too far; a colour laid on the same colour (red on red); subtitles or captions covering the subject; a gag or a reveal too fast to understand; blank frames in transitions; an effect (spotlight, zoom) that doesn't follow its subject after the camera moves — use one world → screen function.

- One colour meaning two quantities (experiment 13: the boat's own upstream component drawn in the water's blue read as a second current); a whole vector and its component in the same colour at once; a length shown by a floating label instead of a dimension line; an angle with no reference line; arrows riding a moving object out of the frame.

## Sound
- Music under the whole lesson, or too loud ("very noisy"; "music is only support").
- Flat narration ("no enthusiasm").
- Checking English terms and polyphonic characters only with ASR; listing abbreviations in the ASR prompt.

## Process
- Running `readcheck.cjs` on a WebGL page with real drawing (experiment 13: a 58 s classroom check ran 40 minutes and was killed). Fixed: readcheck now no-ops WebGL draws itself; don't pass `--draw` unless you must.
- **Stopping mid-way to wait for the user's approval** (experiment 12 stopped after stage 1 to show stills and ask "is this direction OK?"). Reviews before delivery are internal; decide and record.
- Skipping stage 1 review or the silent review.
- **three.js parts in the cloud are very slow and can hit the 2 h background limit** (experiment 12: lesson 1's four GPU parts started together and only 5 of 8 parts finished in 2 h; the host rendered the last 3 locally in ~25 min). Cut GPU parts short, interleave GPU and DOM parts, or render GPU parts on the host machine; if farm.sh makes no poster, grab it from the joined film at the READY second.
- One cloud session per part (115 child sessions in one project; "opening 96 is absurd"). One per lesson; archive at once.
- Briefs pointing at outdated files with the same name as the current ones.
- A brief that invites a full redesign ("don't reuse last round's shell", "at least one segment must be neither A nor B").
- First drafts at 7–8 minutes because every self-check question was covered — cut at the storyboard.
- **`replaceChildren(a, null, b)` prints "null"** (screening room template, a film without an `avoid` field: the card showed `null` under the chapters on the user's phone). DOM `append`/`replaceChildren` stringify null; filter optional nodes out first (fixed in `scripts/farm/room-template.html`).

## Pacing and look (experiments 16–17)
- **A middle that never breathes**: 85–94% speech, recap cards with 1 s of silence (the narration ran over the "held 4–6 s"), up to 159 s of talk without a 1 s pause. Measure with `pacecheck.py` before voicing is final (`04-skeleton.md` §2).
- **Four minutes of one look**: every middle of experiments 15–16 was one flat page; thumbnails could not tell segment 1 from segment 3. Choose a stage and three different segment shapes (`03-adapter-pattern.md` §1).
- **A concept lesson built as a made-up workbench UI** turns into tables of small text. If the learner will never operate that screen, it is not "the real thing".
- **A middle that sounds like non-stop talk despite its pauses**: the narration described what the picture showed, numbers came at 9–14 a minute, cutbacks to the classroom had only moving mouths, and no question carried the viewer forward. Lengthening pauses does not fix it; `03-adapter-pattern.md` §1.4 does.
- **Turning one good film's device into a rule**: a question spine, clue board, cutback rhythm or a reference's per-minute numbers applied to every segment makes material that does not fit them feel strange. Each is judged per segment (`03-adapter-pattern.md` §1.4).
- **Saving time by chopping sentences**: cutting speech share made teacher lines fall to 17–18.5 characters on average. Cut whole points instead.
- **A producer inventing the look**: experiment 17 A's riso-print look was approved as a method but called ugly and clashed with the glossy robots. The look comes from the house style.
- **3D middles cost 3–6× per frame** (0.85 s vs 0.15 s) and make big files (81 MB; GitHub warns above 50 MB).
- **Render queue head-of-line blocking**: `render.cjs` full and range renders share one FIFO queue of `RENDER_SLOTS` (default 2) slots; a 2-second speed test waited 10 minutes behind a 3-part host render. Give extra jobs a higher `RENDER_SLOTS` (e.g. `RENDER_SLOTS=6`) so they take a free slot.

## House style (experiment 19)
- **Leaving the cast's default warm reflections in a cool room** (experiment 18: four of five styles had to override `lib/cast`'s warm-brown environment and contact shadows by hand). Always `room.dress(cast)` (3D) or `makeFlat` (flat pages): the cast's reflections, contact shadows and colour temperature come from the room and follow lights down.
- **A seam that cuts between two looks** (head, middle and tail rendered by different pages). Cut on `ui.wipe().update(t, tCut)` on both sides: the covered frame is identical, so a separately rendered head, middle and tail join without a jump (`研究/實驗19-…/定格/A 接縫（wipe）.jpg`).
- **Six category colours on small particles** (experiment 19 A, B): they cannot be told apart and break "everything else is blue-grey". Use tints of one family plus one accent, and label the categories.
- **Objects added after the first `room.lights(k)`** keep the old shadow tone in the dark studio; build everything before the first frame.
- **Assuming GPU is faster**: x19-a-light (flat iso page, few WebGL layers) rendered 2× faster *without* `RENDER_GPU=1` and without motion trails; measure both on a 2-second clip before a long render.

## Characters and teachers
- **A teacher who points at nothing while talking** (experiment 16, lesson 3: `point: speaking ? 0.75 : 0.15`, `lookX: 0.6` fixed for the whole page; the to-do list also has 「包老師不會真的指白板」, 「芋圓在真實畫面段……不會動」). Being on screen does not help; gestures and gaze that lead to the named thing do. Cue them on the word with `lib/cast/cue.js` (`01-principles.md` §2).
- **A persona that inserts its move everywhere** (experiment 14 follow-up, v3: a companion that asked a deep question in every segment). Teachers change how a beat is said, never add beats (`11-teachers.md`).
- **Departing from a design image the user liked** (owl v1 deliberately avoided the image's purple glasses and pencil). Follow the image; the old "no glasses" rule was only to tell several teachers apart.
- **Teacher names that TTS garbles**: one-syllable English names came back from ASR as nonsense (Mo →「MRO」, Max →「Nachs」, Bolt →「不」); Owen varied by voice. Use two-syllable names, test them through all three voices and ASR, and speak them with the Chinese transliteration mid-sentence.
- **Coined Chinese pun names** (沈默, 明鏡, 零一 …).
- **Teacher and student as the same character in two sizes** (glossy-bot v1: two white robots with black visors, the teacher only taller). Tell them apart by silhouette, colour identity and role props; follow the user's design image when there is one (`assets/cast-designs/`).
- **A skin face canvas on the GPU** (glossy-bot v2, student think frame): headless Chromium kept only a dirty rectangle of the redraw, so the face showed a pale blob and lost its black plate. Create per-pose canvases with `getContext('2d', { willReadFrequently: true })`.
- **Boxy or eerie characters for a "knowledgeable" teacher** (glass block with a screen face; flat ink figure with a tiny face). Rounded, refined, friendly.
- **Citing the learner's notes in the film** (Luna mock-up: 「你三週前的筆記寫過……」 plus a note-title chip). Use the known concept naturally; never name the note or its date. Also: 「以舊帶新」 read as odd and weak; the title is now 融會貫通.
- **Announcing the method in the narration** (Iris: 「先講通：……好，現在換個角度想：」) and commas inside a phrase. Lead into the question from the explanation; label the angle on screen only.
- **Several sentences in one TTS line** (the first teacher previews): 。！ give ≈0.8 s and ？ ≈1.1 s of silence inside the line. One sentence per line, gaps from `pauseAfter`; energy from short lines, questions and pace (`07-voice-and-language.md` §1b).
- **Teacher lines that sound slow-witted**: filler, cute phrasing, a comma after every short adverbial, pitch raised on every line. Precise words, setup fast, one beat before the key line, key line last (`07-voice-and-language.md` §1b, 5b).
