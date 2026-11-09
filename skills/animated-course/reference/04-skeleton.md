# 04 The skeleton (the same in every lesson)

The skeleton is the fixed interface of the adapter pattern. Its **functions** are required in every course; its **look** (the clay classroom, Professor Bao and Taro, the tabletop map) is the approved AdsDemo look and is reused unless another subject needs a different one. Professor Bao is the default teacher; the learner may pick another (`11-teachers.md`), who keeps every function below and changes only how each beat is said.

## 1. Head (40–55 s)

1. **Classroom opening.** 3D clay classroom (`lib/classroom/cast.js`): the teacher and the student (who owns the running project) talk. The first frame is a good-looking opening picture (it is held 3 s at delivery).
2. **Hook that grows out of the content**: the student's wrong guess, a visible loss, a counter-intuitive result. Then say the topic plainly — no withholding.
3. **Course map** (`lib/classroom/coursemap4.js` for AdsDemo): parts already learned play their own mechanism (= review), the camera arrives at this lesson's part and its question card. For the first lesson, the map of the whole course. **It must be clearly visible** (§5).
4. **The one-liner**, within 60 s, with every term in it already defined.
5. **Camera pushes into the blackboard or screen** and hands over to the middle (the handover frame is identical on both pages).

## 2. Middle

Three segments (four at most) of 40–90 s, on one stage chosen for the lesson (`03-adapter-pattern.md` §1). **Each segment ends on one recap image** (`lib/kit/keypoint.js`, the blackboard, or the stage's wide shot with that station lit and its result left in place): one diagram + one sentence, held 4–6 s, the last 2.5–3 s of it in real silence.

### Rhythm baseline (approved, experiment 17 D; every film; `scripts/studio/pacecheck.py` measures it)

> Experiment 16 measured why: the middle was 85–94% speech, recap cards had 1 s of silence, up to 159 s of talk without a 1 s pause, four minutes of one look. Experiment 17 made one lesson's middle four ways on this baseline; D (this rhythm, the old look) was approved together with A and B.

| Rule | Target |
|---|---|
| Speech share in the middle | ≤ 80% |
| Recap | the key sentence, then 2.5–3 s of real silence (`{"id": "K1-hold", "silence": 2.8}`) |
| Moment of understanding | the picture plays 3–5 s with no voice (one effect at most), then the line |
| Breathing | no stretch over ~40 s without a ≥ 1 s pause |
| Segment opener | a surprising fact or a question (「隨機抽五十題，有將近一半的機會，整類消失。」), never "next, let's look at…" |
| Recall between segments | 8–10 s: a question about the **previous** segment over the stage's wide shot; the student answers; the place it points to flashes |
| Neighbours differ | adjacent segments differ in at least two knobs: scale (wide / close), form, watch / guess, talk / silence, tension |
| One point per segment | ≤ 2 new terms. Save time by cutting whole points or sentences, never by chopping sentences into fragments (teacher lines average ≥ ~22 characters, `07-voice-and-language.md` §1b-2; experiment 17 slipped to 17–18.5). Points you cut go in `CARD.md`; if an existing ending mindmap is reused, check its nodes still match |
| The turn | the strongest reversal (the score was fake, the rule fails) lives in the last segment; the main aha lands at about two-thirds of the film (experiment 17: 64–70% in all four versions) |
| The student acts | does the wrong step with their own hand and sees the consequence; a refused move is stamped with one line of reason; no idle puppet |
| Interest curve | sketched in `CARD.md`: rising with rests, highest at the aha; never three equal humps |
| Density | a table shows ≤ 5 rows (the rest as "… 195 more"); text sizes per §7 |

## 3. Tail

Back in the classroom; the blackboard becomes a **mindmap** (`lib/classroom/mindmap.js`):
- Centre: the lesson's question or the one-liner. Branches: the segments' recap images **redrawn small** (the viewer recognises them), arrows labelled with the relation (cause, decision, order, contrast). Choose the layout the knowledge has: a funnel lesson is laid out as a path, not a radial star.
- Each node: one picture + ≤ 8 Chinese characters / ≤ 5 English words. White space, aligned.
- No rule that the body did not teach.
- One or two lines lead to the next lesson (or, for a single lesson, to what the learner can do now).
- The last frame is complete and clean (held 5 s at delivery).

## 4. Series continuity

Lesson N assumes only lessons 1…N−1. It opens from where the previous lesson ended and ends with the next lesson's question. Terms keep the same wording and definition sentence across lessons (`02-learning-design.md` §3).

## 5. The course map must be clearly visible


1. **Hold long enough.** Each part or group the viewer must look at stays on screen **2–3 s**; any text gets time to be read. Do not squeeze the map into 6–7 s of fly-through — slower still on first appearance and when summing up the course.
2. **Frame it properly.** For the overview, the whole table is in frame. To look at one part, push in on that part and dim the others. Never stop half-near, where everything is half visible.
3. **Recognisable.** Simple silhouettes, colours that separate, one group lit at a time. Drop details that become unreadable when small. Name tags readable at the current camera distance.
4. **Meaningful.** Each part is a small model of that lesson's core mechanism and actually moves (a rules part plays the rule, not a podium with a name tag).

Better a longer map than a fly-by: an unreadable map is a signpost.

## 5b. Reading time (all text, checked by machine)

Every block of text the viewer must read (map name tags, labels, recap cards, question cards, callouts) stays **fully in frame** for at least **CJK characters ÷ 4.5 + other characters ÷ 15 + 1.5 s** (minimum 1.5 s). Pages report their text through `window.TEXTS(t)` and `readcheck.cjs` checks the whole film (`08-tools.md`). Fast is fine — with fewer words per screen, not by cutting before people finish reading.

- **Comparisons hold still before the verdict**: when the film compares options (two ad sets, three treatments, four bridges), each option is fully in frame and held at least **2.5 s** before it is judged.
- A label is either fully in or fully out of a shot; a push-in must not cut labels in half.

## 6. Sound

- Two voices in dialogue (teacher + student), warm and varied: per line rate −12%…+15%, pitch −10…+25 Hz (English voices are more sensitive to pitch; use a smaller range). The one-liner slower and lower, with a 0.4–0.6 s pause before it.
- Pauses of different lengths: dialogue 0.15–0.25 s, after a reveal 0.8–1.2 s, after a question 2.5–4 s.
- Background music: "Morning" (`assets/music/`), **opening and ending only**, ending 3 dB quieter. Never under the lesson. Music supports; it must never compete with the voice.
- **Sound design (status: trial — rules from Lemo-Opuscar's DIRECTOR.md §6, adapted; the user has not reviewed them yet; every film using them is delivered with a no-effects B version for A/B listening)**:
  1. **Key visible actions have a quiet sound** — chalk stroke, UI tap, a card landing, a heartbeat, a particle released (`scripts/studio/sfx.py`, anchored to the word in `script.json`). Gain 0.15–0.35 (≈10–12 dB under the voice). Not every motion — only actions the viewer should notice. Never a constant bed, room tone or noise floor.
  2. **Real near-silence before the turn**: before the one-liner and before the moment of understanding, no effects and a real pause (0.6–1.2 s). The first sound after that silence is the important one (the line itself, or the one effect that marks the reveal).
  3. **Sound carries the handover**: at classroom ↔ middle page changes, let the next scene's first effect start 0.2–0.4 s before the cut (J-cut) or the last one ring past it (L-cut), instead of a silent hard cut.
  4. Music stays at opening and ending only (the user's rule); effects never replace or imitate music.

## 7. Picture spec

- **One house style** across classroom, stage, cards, mindmap and map (`01-principles.md` §1): the Engram studio, light or dark by content (`03-adapter-pattern.md` §1.2), components in `scripts/studio/lib/house/`; the stage's look comes from the house style, not from the producer.

- 1920×1080, 30 fps. The learner's `quality: compact` only shrinks the delivered copy to 720p (`deliver.py`); always render at full size.
- Interface text when pushed in ≥ 28 px; key numbers ≥ 36 px; key words ≈ 40 px; chalk text ≥ 50 px. Small text in a wide shot is never the point.
- The main subject fills about 70% of the frame.
- Bottom 140 px: nothing important (the plugin shows `subtitles.vtt` there; never burn subtitles in).

## 8. Length

5–7 minutes per lesson (target 5:30–6:30) for a course lesson, modules included (`12-modules.md`: they fit inside this length, they do not extend it); a single-concept lesson may be shorter. First drafts run to 7–8 minutes — cut at the storyboard stage, not after rendering.
Sizing a draft: the English dialogue voices with normal pauses run at about **140 words per minute** (experiment 12: 975 words ≈ 6:55), so 6:30 ≈ 900 words. Measure the Chinese rate on your first `voice.py` run and size from that.
