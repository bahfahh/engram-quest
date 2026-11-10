# 01 Principles

## 1. The biggest principle: help the viewer understand

Everything on screen — map, diagram, blackboard, a character's gesture — is there to help the viewer understand; decoration competes with it.

- **Signpost test.** Mute the narration and look only at the picture. If all the viewer gets is *what the topic is* ("this is about budgets"), the picture is a signpost; it helps once it shows a mechanism, a relation or a difference ("money flows to B because B got two more installs on day 2").
- **Describe what the viewer should understand, not what form it should have.** A brief saying "seven stations, each a little building" produced seven little buildings and no understanding.
- **The main screen shows the real thing**: the real interface, real numbers, the real organ, the real derivation, which the learner will meet later. An analogy earns its place when the real thing cannot be drawn and is hard to grasp; coming straight back keeps the link. Reifying the real objects counts as the real thing (each card a real record, a bin's height the real share, two rooms the two real sets — experiment 17 A and B, approved); a foreign metaphor ("an eval set is a restaurant") leaves the viewer translating.
- **The skeleton keeps the classroom; the look is chosen per lesson, not one look for everything**.
  - **Head and tail: the classroom** — the teacher and student, the **blackboard**, the 3D **course map**, the blackboard **mindmap** (`04-skeleton.md`, `scripts/studio/lib/classroom/`), with the learner's teacher (`makeCast`, `11-teachers.md`). The user's valued default; each part carries meaning: the blackboard carries the point being taught, one idea at a time (`04-skeleton.md` §1); the course map shows where this lesson sits and what earlier lessons it rests on; the mindmap shows the whole.
  - **The middle shows the real thing in its own look**: a real interface stays the real interface, real code, real numbers, a real organ; a drawn stage (isometric world, 3D model, Atlas, whiteboard) gets the look that makes its content clearest. Re-skinning real pictures was experiment 19's mistake.
  - **One consistent look within a film and a course** (2026-11-05: 「現在是風格不一致的問題，整體風格包含其他的教材感覺有時候很突兀」): the same classroom and cast from lesson to lesson, the same colour meanings on recap cards, labels and the mindmap. A look invented for one film breaks it.
  - **The Engram studio (light 明棚 / dark 暗棚, `scripts/studio/lib/house/HOUSE.md`) is a narrow option, not the default: used only when the user asks for it** (their decision).); experiment 19 then built it and made the light studio the default for every software / AI / data / money / rules lesson (nearly all) — replacing the classroom, blackboard, 3D course map and chalk mindmap before the user had reviewed it — wrong, undone here.
- **A picture nobody can read does not help.** Too fast, too close, too small or too busy fails like a signpost.


### Every frame has a focus (applies to every film, whatever the method)

At every moment the viewer knows **where to look** and **which one thing this frame is about**. Ask first: *what one thing should the viewer get from it?*

- **Complex is not the same as unfocused.** If the real thing is complex and the learner will face it as it is, show it as it is — a real Vercel deploy screen, a full block of code, a 3D heart. What hurts is a frame where the viewer cannot tell where to look. Focus is then made *on* the real thing, not by redrawing it simpler.
- **How focus is made depends on the form** (worked examples, not a list):

  | Content | Shown as | Where the focus comes from |
  |---|---|---|
  | Biology (the heart) | 3D / realistic anatomy | The camera turns to the chamber being explained; only that stretch of blood flow lights up |
  | Programming | The real code | The code stays whole; the lines being explained light up, the rest dims |
  | Operating a real product (deploy to Vercel, Ads Manager) | The real screens, as complex as they really are | Cursor, outline, local zoom on the one thing to press or read now — so the learner recognises the real screen later |
  | An abstract mechanism with no real picture (card payment, compounding, GPS) | Drawn diagrams, one concept per frame | Zoom out / zoom in decomposition (`05-presentation-methods.md` §3) |
  | Maths | The derivation | One step at a time; the earlier steps condensed into one line |

- **Clean is not empty.** A crowded frame improves when details move to the frame where they belong, not when deleted. An empty or meaningless frame fails like a crowded one (experiment 18b: 「我要你乾淨，不是空白」).
- **A map is fine; a film that *is* a map was not.** A zoomed-out map — only the parts and how they connect, no details — works as the opening (where are we going), between concepts (where are we now), and as the ending mindmap. What failed (experiment 18) was making the whole film one map with every detail drawn onto it and every concept opened inside it: the frame never had a focus.
- **The check is a glance**, not a count: look at a frame for three seconds — do you know where to look and what it says? Too much → split. Empty or meaningless → put the meaning back. Word and colour counts are hints; optimising them over understanding produced the empty films of 18b.
- **The voice works on the same one thing.** The picture shows it; the voice explains what the picture cannot say by itself — why, what follows, what is surprising — like a person beside the learner. Listing the screen, or silence over an unexplained frame, leaves the viewer alone.

## 2. Learning principles (use this table to choose a method and to review a film)

| Principle | What it means in the film |
|---|---|
| One point at a time | Approved films ran the middle as 3–4 segments of ≈ 40–90 s (`04-skeleton.md` §2), one idea per picture, closed with one key word before the next |
| Picture and narration say the same thing at the same moment | The thing appears on the word that names it (`T.word()`); subtitles are not burned in. Approved (experiment 20): each sentence of new information gets a picture event on the object itself, on its word — select the source passage, carry it where it goes, link each result back to its source, strike the old direction, scan and find nothing, tick each item as it is judged. A definition strip or caption did not do it; the event settles and holds still. `livecheck.py` reports narration over a frozen picture beyond ≈ 3 s outside planned holds |
| Only what helps understanding | Signpost test; "clean" means *few things*, not *small things* — the one idea fills the frame |
| Mark what matters | Spotlight, circle, colour change, everything else dims. When the point is a **relation** between two things already on screen (fix this one → that one passes), the cue can travel from the cause to the effect instead of lighting the two ends separately (`05-presentation-methods.md` §3c, The cue travels the relation) |
| Animate the change, hold the rest | Animation helps when the thing to learn is the change itself; anything else moving at that moment (idle characters, pulses, a travelling camera) competes with it. Everything else held still during the change, and its result stayed as a trace (approved, experiment 20 test 9; `04-skeleton.md` §2, Only the change moves) |
| The aha is assembled, not announced | The pieces are on screen in one composition before the silence; the last one lands as the silence starts; nothing new arrives inside it; the next line can be checked against the picture (approved, experiment 20 test 11; `04-skeleton.md` §2, Moment of understanding) |
| Hands and eyes go where the words go | When the narration names a thing on screen that the viewer has to find (a field, a number, a part of the heart), the teacher turns, looks and points at it **on that word**, the student looks too, the thing lights up. Pointing at nothing sends the eye nowhere. A character on screen does not by itself help people learn; one whose gestures and gaze lead to the content does (Mayer's image and embodiment principles; Mayer & DaPra 2012). Tool: `lib/cast/cue.js` (`lib/cast/CAST.md` → Cues) |
| Know the term before using it | First appearance: full name (+ translation if the film is not in the term's language) + one plain sentence, said and written; used earlier, even in the one-liner, it is an unknown word |
| Concrete before abstract; contrast | One real case first, then the rule; replay the same picture changing only one condition |
| Let the viewer think first | Bet before the reveal; approved order (experiment 20; `05-presentation-methods.md` §3b Bet): the question with its options on screen → 2.5–3 s real pause, the picture shows the bet card → the student states the common wrong answer confidently, with a reason → the reveal (the answer is not on screen before it) and a short silence → the teacher says why the bet looked right, then where it fails. A piece planted in an earlier segment can carry a prediction the viewer completes (§3b Planted piece; Pro teachers, `11-teachers.md` §1b) |
| Close each segment with an image; recall at the end | Each segment ends on one diagram + one sentence, held ≈ 4–6 s in approved films; the ending mindmap redraws those diagrams small and connects them |
| Land on a real action | Each key point maps to where it is done for real: which screen, which button, which column, which step |
| The one-liner | The lesson's core sentence (approved ones ≤ 25 Chinese characters / ≈ 15 English words) is said within about the first 60 s; the rest of the film unpacks it, proves it and uses it |

## 3. Iteration principles

- **Build on what was approved.** A new round changes what needs changing; reinventing loses what was approved — a brief saying "don't reuse last round's shell" works against it.
- **Versions are not either/or.** Every method the user approved is "approved"; they coexist and are chosen by content.
- **Record only what the user reviewed.** Only the user's review of finished films makes a method "approved" (their decision); unreviewed ones stay "trial" — options, not rules.
- **Keep the experience and the way to make it, not the films.** A film that can be remade is fine to lose; what lasts is this skill, the briefs, the components and the tools.
- **Old rule overturned → change the old rule.** Two contradicting rules side by side leave the producer guessing.
