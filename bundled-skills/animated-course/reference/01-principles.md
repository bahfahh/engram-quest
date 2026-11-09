# 01 Principles

## 1. The biggest principle: help the viewer understand

Everything on screen — map, diagram, blackboard, a character's gesture — is there to help the viewer understand. Nothing is decoration.

- **Signpost test.** Mute the narration and look only at the picture. If all the viewer gets is *what the topic is* ("this is about budgets"), the picture is a signpost. Redo it so it shows a mechanism, a relation or a difference ("money flows to B because B got two more installs on day 2").
- **Write rules as "what the viewer must understand", never as "what form it must have".** A brief that says "seven stations, each a little building" produces seven little buildings and no understanding.
- **The main screen shows the real thing**: the real interface, real numbers, the real organ, the real derivation. Use an analogy only when the real thing cannot be drawn and is hard to grasp — and come straight back to the real thing. Reifying the real objects counts as the real thing (each card a real record, a bin's height the real share, two rooms the two real sets — experiment 17 A and B, approved); a foreign metaphor ("an eval set is a restaurant") does not.
- **One house style for everything the learner sees**: classroom, characters, the middle's stage, recap cards, mindmap, course map and the written course material look like they come from one studio. Direction: clean, simple, technological, matching the glossy robot cast. A producer chooses the stage's *structure* (`03-adapter-pattern.md` §1), never its look.
  - **The house style is the Engram studio: one room, two lights**. **Light studio** (white seamless studio, glossy white props, information on pale-blue holographic panels with thin cyan lines) is the default; **dark studio** (the same room with the lights off: navy, frosted-glass panels with edge light, cyan and magenta rim lights) is for lessons about seeing what is normally invisible. Like the stage, the mode is chosen from the content (`03-adapter-pattern.md` §1.2). Both modes share the room's shape, the key-light direction on the cast, the component shapes, the type (Noto Sans TC + Inter, no handwriting) and the colour meanings: **cyan** = now / normal / the system, **amber** = the student's (their question, what their hand touched), **magenta** = pressure / warning / broken, **grey** = not yet / unusable. Components: `scripts/studio/lib/house/` (`HOUSE.md`; built in experiment 19, `研究/實驗19-全系列風格落地（明棚／暗棚）/`).
- **A picture nobody can read does not help.** Too fast, too close, too small or too busy is the same failure as a signpost.


### Every frame has a focus (applies to every film, whatever the method)

At every moment the viewer knows **where to look** and **which one thing this frame is about**. Before designing a frame, ask: *what one thing should the viewer get from it?*

- **Complex is not the same as unfocused.** If the real thing is complex and the learner will face it as it is, show it as it is — a real Vercel deploy screen, a full block of code, a 3D heart. What is not allowed is a frame full of things where the viewer cannot tell where to look. Focus is then made *on* the real thing, not by redrawing it simpler.
- **How focus is made depends on the form** (examples, not a list):

  | Content | Shown as | Where the focus comes from |
  |---|---|---|
  | Biology (the heart) | 3D / realistic anatomy | The camera turns to the chamber being explained; only that stretch of blood flow lights up |
  | Programming | The real code | The code stays whole; the lines being explained light up, the rest dims |
  | Operating a real product (deploy to Vercel, Ads Manager) | The real screens, as complex as they really are | Cursor, outline, local zoom on the one thing to press or read now — the learner must recognise the real screen later |
  | An abstract mechanism with no real picture (card payment, compounding, GPS) | Drawn diagrams, one concept per frame | Zoom out / zoom in decomposition (`05-presentation-methods.md` §3) |
  | Maths | The derivation | One step at a time; the earlier steps condensed into one line |

- **Clean is not empty.** The cure for a crowded frame is to move details to the frame where they belong, never to delete them. A frame that looks empty, or whose meaning is gone, failed as surely as a crowded one (experiment 18b: 「我要你乾淨，不是空白」).
- **A map is fine; a film that *is* a map is not.** A zoomed-out map — only the parts and how they connect, no details — works as the opening (where are we going), as the place between concepts (where are we now), and as the ending mindmap. What failed (experiment 18) was making the whole film one map with every detail drawn onto it and every concept opened inside it: the frame never had a focus.
- **The check is a glance**, not a count: look at a frame for three seconds — do you know where to look and what it says? Too much → split. Empty or meaningless → put the meaning back. Word counts and colour counts are hints at most; optimising them instead of understanding produced the empty films of 18b.
- **The voice works on the same one thing.** The picture shows it; the voice explains what the picture cannot say by itself — why, what follows, what is surprising — like a person beside the learner. It neither names what is on screen item by item nor goes quiet and leaves a frame unexplained.

## 2. Learning principles (use this table to choose a method and to review a film)

| Principle | What it means in the film |
|---|---|
| One point at a time | Middle in 3–4 segments of 60–90 s; one idea per picture, closed with one key word before the next |
| Picture and narration say the same thing at the same moment | The thing appears on the exact word that names it (`T.word()`); subtitles are not burned in |
| Only what helps understanding | Signpost test; "clean" means *few things*, not *small things* — the one idea fills the frame |
| Mark what matters | Spotlight, circle, colour change, everything else dims |
| Hands and eyes go where the words go | When the narration names a thing on screen that the viewer must find (a field, a number, a part of the heart), the teacher turns, looks and points at it **on that word**, the student looks at it too, and the thing itself lights up. No pointing at nothing while talking. A character being on screen does not by itself help people learn; one whose gestures and gaze lead to the content does (Mayer's image and embodiment principles; Mayer & DaPra 2012). Use `lib/cast/cue.js` (`lib/cast/CAST.md` → Cues) |
| Know the term before using it | First appearance: full name (+ translation if the film is not in the term's language) + one plain sentence, said and written; never use it earlier, not even in the one-liner |
| Concrete before abstract; contrast | One real case first, then the rule; replay the same picture changing only one condition |
| Let the viewer think first | The student guesses wrong; a prediction question with a real pause (2.5–4 s, the picture shows "your turn"); then the reveal |
| Close each segment with an image; recall at the end | Each segment ends on one diagram + one sentence held 4–6 s; the ending mindmap redraws those diagrams small and connects them |
| Land on a real action | Every key point maps to where it is done for real: which screen, which button, which column, which step |
| The one-liner | The lesson's core sentence (≤ 25 Chinese characters / ≈ 15 English words) is said within the first 60 s; the rest of the film unpacks it, proves it and uses it |

## 3. Iteration principles

- **Build on what was approved.** A new round changes only what needs changing; it does not reinvent the film. A brief must never say "don't reuse last round's shell".
- **Versions are not either/or.** Every method the user approved is "approved"; they coexist and are chosen by content.
- **Record only what the user reviewed.** Unreviewed methods are "trial", never rules.
- **Keep the experience and the way to make it, not the films.** A film that can be remade is fine to lose; what must survive is this skill, the briefs, the components and the tools.
- **Old rule overturned → change the old rule.** Never keep two contradicting rules side by side.
