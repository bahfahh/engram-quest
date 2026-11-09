# 03 Adapter pattern: the skeleton is fixed, the middle follows the content

> It is a **metaphor**, not a menu to choose from.

| Software adapter pattern | Teaching film |
|---|---|
| The caller only knows one fixed interface | The viewer and the series: every lesson has the same opening, ending, rhythm and rules |
| The fixed interface | **The skeleton** (`04-skeleton.md`) |
| Sources of different shapes | Each piece of content: a procedure, a rule, numbers, a scale, a structure, a derivation, an anatomy… |
| The adapter turns a source into the interface | **The way of showing it**: turns this shape of content into a picture the viewer can take in |

## 1. The judgment, layer by layer (for every lesson and every segment)


"How it is shown" is not one choice. To get experiment 17 made, the brief had to spell it out as five choices at different scales. Make each one explicitly, top down, and write each in the understanding card with its reason. Choosing is the producer's job; **never ask the user which method they prefer**.

| Layer | Scope | What is chosen | How |
|---|---|---|---|
| 0. Rhythm | the whole middle | speech share, silences, recall questions, breathing, segment openers | **Fixed**, not chosen: `04-skeleton.md` §2 (every film) |
| 1. Stage | once per lesson (the whole middle) | the one world the middle lives in: the real interface, an isometric diagram world, a 3D model, the Atlas world, a realistic anatomy diagram… — and the house mode (light or dark studio) | from what the lesson is about (§1.2), then cost |
| 2. Segment shape | each segment | what the viewer does: follow one thing through, bet then see, remove the guard, sort, compare two runs… | from the action the point needs (§1.3); neighbouring segments differ |
| 3. Moment device | each "wow" and the "aha" | see-through / cut open, explode into layers, particles to scale, many runs side by side, link lines that break, a refusal stamp… | from the obstacle (§1.3) |
| 4. Camera and sound | each beat | wide → close → wide, what is lit, silence, one effect | conventions (`04-skeleton.md` §2, §6) |

The catalogue of approved stages, shapes and devices, with their status, is `05-presentation-methods.md`. **It is a set of starting points, not a menu.** If nothing fits a layer, design one for that layer (borrow from §3) and mark it trial; a new design usually replaces one layer, not the whole film. Force-fitting is still the worst outcome.

### 1.1 Diagnose each segment first (three questions, written down)

1. **What question does the segment answer?** How does it run / where does it split / what is inside / how much, to scale / how long / which one / what does chance do / many things at once / why does this rule exist / how do I do it on the real screen.
2. **Where does listening alone get stuck?** The process is invisible; the quantity has no felt size; it is layered or nested; it is chance; a wrong intuition is already there; two things blur; the reason for a rule is not felt; the evidence behind a claim is invisible. Use the lesson's self-check questions to find these.
3. **What should the viewer do with it?** Follow it; predict or bet; compare; sort; take it apart; watch it fail; operate it for real.

Write the three answers per segment in `UNDERSTANDING.md` before choosing anything. A choice with no diagnosis behind it is a forced fit.

### 1.2 Layer 1: the stage

| The lesson is about | Stage | Approved example |
|---|---|---|
| Operating a tool | The real interface | AdsDemo lessons; experiment 17 D |
| A process, pipeline or system in a concept lesson | An **isometric diagram world**: the process built as one place, stations in reading order, labels on the margin with leader lines | Experiment 17 A |
| What is inside something, thousands of things flowing, or a moment that must make people look up | A **3D model** that can turn transparent, be cut open and explode, with the real operation as particles | Experiment 17 B |
| Geometry or motion | The Atlas diagram world | Experiment 13 |
| Organs and cells | A realistic anatomy diagram (trial) | Experiment 12 |

**House mode** (same layer; the look itself is fixed by the house style, `01-principles.md` §1):

| The lesson is about | Mode |
|---|---|
| A process, system, software / AI / data, money, rules, comparisons: anything read as structure or text | **Light studio** (default) |
| Seeing what is normally invisible: inside a body, device or material; particles, energy, signals; pressure, danger, failure — and the middle's main device is see-through, cut open or particles | **Dark studio** |
| A light lesson with one see-through or particles moment | Light, with **lights down** for that moment (layer 3, §1.3) |

- The classroom, course map, recap cards and mindmap follow the lesson's mode: the same room with the lights on or off.

- **Default: one stage for the whole middle.** It becomes a place the viewer knows, so they always know where they are; the segments are stations in it. Switch only when a segment's point cannot be shown there (typically the closing real action on the real screen).
- Reifying the real objects counts as the real thing (`01-principles.md` §1): each card is a real record, a bin's height is the real share, the two rooms are the two real sets. A foreign metaphor ("an eval set is a restaurant") does not.
- A concept lesson built as a made-up "workbench UI" turns into spreadsheets (experiment 16: 15 lessons, every middle one flat page). If the learner will never operate that screen, it is not the real thing.
- Cost decides between equally good stages: DOM/SVG ≈ 0.1–0.3 s per frame, three.js ≈ 0.85–3 s (`08-tools.md`). A 3D stage needs a reason 2.5D cannot give: rotation, depth, transparency, thousands of particles.

### 1.3 Layers 2–3: segment shapes and moment devices, from the diagnosis

- **Action → shape**: follow → **tour** (one real item through every station); predict → **bet** (the guess is an object on screen, the answer lands next to it); "why is this rule here?" → **remove the guard** (the student does the wrong step, the shortest failure path plays, the guard goes back); categories → **sort**; cause → **one condition changed, both runs visible**.
- **Obstacle → device**: invisible process → **see-through / cut open**; no felt size → **particles or cards to scale** (one dot = one item); layered → **explode into layers** (thickness = share); chance → **many runs side by side**; invisible evidence → **link lines** (a made-up claim has no line, it breaks red); a wrong intuition → the guess on screen, then a **silent reveal**; a refused move → a **stamp** with a one-line reason; one key word → a **selection box** around it; in a light-studio lesson, the inside of something → **lights down** (the room turns into the dark studio in ≈ 1–1.5 s for that moment, ≥ 8 s, at most twice a lesson, lights back up before the recap).
- Each segment gets **one** wow device; the lesson gets **one** main aha (silent, `04-skeleton.md` §2). More is noise.
- Three segments, three different shapes (`04-skeleton.md` §2: neighbours differ in at least two knobs).

### 1.4 What carries the viewer from one sentence to the next (judged per segment)

A middle can meet the rhythm baseline and still feel like non-stop talk. Experiment 17 §10.5 traced that feeling to four causes, none of them pause length: every sentence adds new information, the narration says what the picture already shows, nothing makes the viewer want the next sentence, and the shot never changes register. The four points below are what to achieve. None of them is a device that every segment must use: the material decides whether a segment needs it and in what shape.

1. **A reason to hear the next sentence.** At any moment the viewer knows what they are waiting to find out. Its shape comes from the question the segment answers (§1.1):
   - cause ("why did this happen?"): the question stays visible and is answered piece by piece;
   - choice: the options stay side by side until one is judged;
   - prediction: the viewer's guess becomes an object on screen (bet);
   - wrong intuition: the belief is stated first, then broken.

   A procedure is usually carried by the next step's goal alone ("now we need the price"). A short, concrete point may need nothing. A question the material does not raise by itself sounds staged; leave it out. Example only, for cause material: the clue board (`05-presentation-methods.md` §3b).
2. **Picture first, narration for what the picture cannot say.** Draft the segment as two columns, picture then narration. First write what the viewer sees, beat by beat. Then write narration only where the picture cannot carry the point: the reason, the term, the consequence. Cut any line that describes what is visible.
   - Leave a beat without voice where an animation needs time to be read (a build, a reveal). Do not add silences as a quota.
   - Speak only the numbers the viewer must hold. Other numbers stay on screen or go.
   - Check both columns alone. If the narration column retells the picture, cut lines. If the picture column shows nothing the words point at, the segment is a signpost (`01-principles.md` §1).
3. **A cut back to the teacher or student brings something new**: a clue written on the board, a model turned in the room, the student's wrong guess, the teacher's judgement. Choose the form from the content: a board for an argument that grows, a model for something spatial, the student's hand for a mistake. Time the cut to the turn in the talk, where the next question starts, not to a clock. A cutback where only mouths move has no content: either give it content or stay on the stage.
4. **Measure a reference to understand it, not to copy it.** When studying a reference video, measure it (cuts, numbers, guide phrases, shot types), explain why each measurement works there, then turn it into the criterion it serves. Never adopt a reference's numbers as targets: a different subject and length change them. The rhythm baseline (`04-skeleton.md` §2) is the only numeric floor.

Write the outcome per segment in `UNDERSTANDING.md` §3: what carries the viewer (or "nothing needed" and why), and what each cutback shows.

### 1.5 Check

Against the learning principles (`01-principles.md` §2), the signpost test, the rhythm baseline (`pacecheck.py`), §1.4, and the question: *"What understanding does this picture give that listening alone would not?"* If you cannot answer, look elsewhere.

- **Demo films are not templates.** The demo films and the catalogue are a minimum bar, not a format to copy.
- The skeleton is judged by its functions too: hook, place in the course, one-liner, recap per segment, structured ending, continuity. The clay classroom, Professor Bao and Taro were how the AdsDemo course did it; new films use the house style (Engram studio, light or dark) for every subject.

## 2. Different subjects: the way of showing grows out of the subject


All approved methods so far come from one course (AdsDemo, Meta ads — an operating-a-tool subject). For another subject, first ask **"how do people in this subject come to understand this?"**, then animate that process. Examples (not a list to pick from):

| Subject | How people understand it | What the animation should do |
|---|---|---|
| Biology, medicine | Seeing the real structure and how it moves | Realistic diagram animation: the heart's four chambers and valves opening and closing, the direction of blood flow; the nucleus; insulin and blood sugar. Draw the organ or cell itself, not a metaphor for it |
| Mathematics | Following the derivation and thinking it through | Pose a question and let the viewer think; write the derivation line by line, each step changing the graph with it (geometric intuition, plug numbers in); let the wrong intuition appear, then overturn it |
| Physics, engineering | Change one condition, watch the result | Parameter simulation: the same setup replayed changing one variable; forces, velocities, energy drawn as visible arrows and quantities. Approved example: the Atlas diagram world (`05-presentation-methods.md`, `lib/atlas/ATLAS.md`) — two setups side by side, time paused at the telling instant, vectors split into components |
| Programming, systems | Seeing data and state move while the code runs | Code and execution state side by side: which line runs, how variables and memory change, how a request travels between services |
| Chemistry | Seeing molecules and reactions | Molecular models, electrons and bonds changing, before/after comparison |
| History, geography | Cause and effect in time and space | Timelines and maps in motion: who was where, in what order, how territories and routes changed |
| Operating a tool or setting (e.g. AdsDemo) | Doing it once on the real interface | Real interface operation (`05-presentation-methods.md`) |

The one common rule: the picture is the thing itself and how it works, readable with the sound off.

## 3. Borrowing from other fields (starting points, not a list)

| Borrow from | Ability | May suit |
|---|---|---|
| Scientist | An experiment that separates two explanations: change one condition, see the outcomes split | "Why X, not Y"; test design |
| Investigative journalist | From one concrete anomaly (a strange report, a bill) trace the whole system, ruling out wrong explanations | Diagnosis |
| Game designer, coach | Several quick decisions in a row, each followed by its consequence | Decision rules |
| Magician | Show an impossible result, then replay revealing the overlooked key | "Looks good, is actually fake" |
| Film director | Control when the viewer learns what; one event from several characters' eyes | Multiple stakeholders |
| Information designer | Re-arrange the same data so clusters and differences appear | Reading reports |
| Editor, creative director | Lay a finished piece on a timeline so each part's job is visible | Structure of a creative work |
| Exhibition / product designer | How a thing works is visible from its form and feedback | Systems, processes, settings |
| Comedy writer | Expectation gaps, repetition and callbacks | A small early detail that becomes the key later |
| Math teacher | Derivation, geometric intuition, equation and graph moving together | Anything quantitative |

Grammars from other film libraries (learn the grammar, never copy their art — e.g. Lemo-Opuscar's style guides, MIT/CC BY):
- **Write, wipe, rewrite in place** (chalkboard): the wrong reading is written under its object, wiped in one pass, and the right one written in the same spot from the same camera position — the cleanest way to mark a wrong intuition as wrong. A tracked part keeps one accent colour through several forms (a variable through an equation's rearrangements, a molecule through a pathway).
- **The character acts the system** (living screencast): the cursor is the user, the character is the software (or the body) doing its work — it runs along the rows it reads, stomps the button it tests. Gives the student character a job in real-interface segments.
- **The real specimen, one continuous change of scale** (microscope story): a real, licence-clean image of the actual thing, a camera that dives through scales with a scale bar, readings computed from the image, every number in `FACTS.md`.

- **The picture is the mechanism** (Tinycharts, April Zhu — concepts only; its kit and art are licensed for personal use, never reuse them): every state is a visible, named part of one picture; where we are now is lit so a stranger can name it; labels sit on the margin with leader lines; small people do the work at each station; a footnote says "illustrative" or names the source; removing a rule's guard shows the shortest path to failure. Grew into the isometric diagram world (experiment 17 A).
- **See through the real object** (short explainer reels, e.g. the user's reference "does keeping your laptop plugged in wear the battery?"): start from a real object in a real setting, its case turns transparent, inside the real mechanism runs as thousands of particles; open with a surprising fact or question. Grew into the 3D model stage (experiment 17 B).

Animation can also give viewers **impossible experiences**: impossible senses (seeing attention, trust, data), scale, time (weeks compressed into seconds), several viewpoints at once, worlds with different rules (no delay, unlimited resources — which problems remain?), the structure of abstract things.

## 4. The understanding design card (before any storyboard)

Write `UNDERSTANDING.md` (`templates/UNDERSTANDING.md`) for every lesson:
1. **The change**: what the viewer can do after watching (see, tell apart, reason out, feel, use, want to explore), as concrete sentences.
2. **Obstacles**: invisible process, no scale, blurred concepts, a wrong intuition? Use the lesson's self-check questions to find them.
3. **Per segment, the diagnosis and the layers** (§1): the three answers, then stage (once), shape, device. Only for a layer that needs a **new** design, sketch **three genuinely different ideas**, each borrowed from a different field — not one explanation in three skins.
4. **The moment understanding happens**: which picture, event or contrast makes the viewer suddenly get it. Apply the signpost test.
5. **Cost**: does it need a big metaphor learned first? Could it be fun but teach the wrong mechanism? Render cost, length.
6. Only then the craft (layer 4: camera, morphs, sound), and an interest curve in `CARD.md`.
