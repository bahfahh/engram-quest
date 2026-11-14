# 03 Adapter pattern: the skeleton is fixed, the middle follows the content

> It is a **metaphor**, not a menu to choose from. When no approved way of showing fits, improvise: maths, for example, may suit none of the realistic-animation methods, so work out from good teaching videos how the subject is best taught. Force-fitting is the worst outcome.

The spirit: **diagnose first, then choose** from purpose, reason and options that worked.

| Software adapter pattern | Teaching film |
|---|---|
| The caller only knows one fixed interface | The viewer and the series: every lesson has the same opening, ending, rhythm and rules |
| The fixed interface | **The skeleton** (`04-skeleton.md`) |
| Sources of different shapes | Each piece of content: a procedure, a rule, numbers, a scale, a structure, a derivation, an anatomy… |
| The adapter turns a source into the interface | **The way of showing it**: turns this shape of content into a picture the viewer can take in |

The skeleton stays because each part carries meaning: the board carries the point, one idea at a time; the course map shows where the lesson sits; the mindmap shows the whole.

## 1. The judgment, layer by layer (for every lesson and every segment)

When one lesson's middle was made several different ways, more than one worked: the adapter pattern still holds (the content decides), but one choice per lesson is too coarse.

"How it is shown" is not one choice. Experiment 17 needed five choices at different scales, made top down, each in the understanding card with its reason. Choosing is the producer's job (the user decides goal, scope, teacher and approval), so **don't ask the user which method they prefer**.

| Layer | Scope | What is chosen | How |
|---|---|---|---|
| 0. Rhythm | the whole middle | speech share, silences, recall questions, breathing, segment openers | Shared baseline for every film, not chosen per segment: `04-skeleton.md` §2 (pacecheck reports, the producer judges) |
| 1. Stage | once per lesson (the whole middle) | the one world the middle lives in: the real interface, an isometric diagram world, a 3D model, the Atlas world, a realistic anatomy diagram… | from what the lesson is about (§1.2), then cost |
| 2. Segment shape | each segment | what the viewer does: follow one thing through, bet then see, remove the guard, sort, compare two runs… | from the action the point needs (§1.3); neighbours usually differ |
| 3. Moment device | each "wow" and the "aha" | see-through / cut open, explode into layers, particles to scale, many runs side by side, link lines that break, a refusal stamp… | from the obstacle (§1.3) |
| 4. Camera and sound | each beat | wide → close → wide, what is lit, silence, one effect | conventions that worked (`04-skeleton.md` §2, §6) |

`05-presentation-methods.md` catalogues the approved stages, shapes and devices with their status. **It is a set of starting points, not a menu.** When nothing fits a layer, design one (borrow from §3) and mark it trial; a new design usually replaces one layer, not the whole film. Force-fitting is still the worst outcome.

### 1.1 Diagnose each segment first (four questions, written down)

1. **What question does the segment answer?** How does it run / where does it split / what is inside / how much, to scale / how long / which one / what does chance do / many things at once / why does this rule exist / how do I do it on the real screen.
2. **Where does listening alone get stuck?** The process is invisible; the quantity has no felt size; it is layered or nested; it is chance; a wrong intuition is already there; two things blur; the reason for a rule is not felt; the evidence behind a claim is invisible. The lesson's self-check questions help find these.
3. **What should the viewer do with it?** Follow it; predict or bet; compare; sort; take it apart; watch it fail; operate it for real.

4. **What can the viewer do afterwards, and what has to be in the segment for that to be true?** One sentence of outcome, then the few must-haves that make it true. They follow from the question (1), not from the subject:

   | The segment answers | Afterwards the viewer can | Must-haves |
   |---|---|---|
   | why it happens, how it runs | explain the chain in their own words and say what changes when one condition changes | every link of the chain visible, none skipped; at least once the viewer predicts the effect of one changed condition |
   | what it is, which one it is | tell examples from near misses | at least two examples and one close non-example; one borderline case the viewer judges |
   | how to do it | do it once in a new situation | one full run with the judgement at each step said aloud; a second run in a changed situation; the common mistake |
   | why believe it | state the claim, its strongest evidence and its strongest objection | what the claim does and does not say; what each piece of evidence supports; the strongest objection shown |

   Must-haves say what is achieved, never how it is shown; the layers below still choose that. They are the checklist the listener review of the script and the silent review read against (`06-workflow.md`), which gives "the change" in the understanding card something to be checked by. A short passage serving another segment's point needs only a short version (one example, one picture, one sentence). The rows are examples (adapted from the question types of Heptabase Explainer Studio, MIT); a segment that fits none still gets its own outcome sentence and must-haves, and sorting every segment into a fixed list of types would be a forced fit.

Written per segment in `UNDERSTANDING.md` before choosing; a choice without a diagnosis is how forced fits happen.

### 1.2 Layer 1: the stage

| The lesson is about | Stage | Approved example |
|---|---|---|
| Operating a tool | The real interface | the ads course; experiment 17 D |
| A process, pipeline or system in a concept lesson | An **isometric diagram world**: the process built as one place, stations in reading order, labels on the margin with leader lines | Experiment 17 A |
| What is inside something, thousands of things flowing, or a moment that must make people look up | A **3D model** that can turn transparent, be cut open and explode, with the real operation as particles | Experiment 17 B |
| Geometry or motion | The Atlas diagram world | Experiment 13 |
| Organs and cells | A realistic anatomy diagram (trial) | Experiment 12 |

**Look of head and tail**: the classroom — blackboard, 3D course map, blackboard mindmap — is the default for every lesson (`01-principles.md` §1, `04-skeleton.md`). The stage above is for the middle; a real interface keeps its real look. The Engram studio (light / dark, lights down) is a narrow option, used only when the user asks for it; in such a film the classroom, course map, recap cards and mindmap follow its mode (`scripts/studio/lib/house/HOUSE.md`).

- **One stage for the whole middle usually serves best**: a place the viewer knows, so they never feel lost; segments are stations in it. Switch when a point cannot be shown there (typically the closing real action on the real screen).
- Reifying the real objects counts as the real thing (`01-principles.md` §1): each card is a real record, a bin's height is the real share, the two rooms are the two real sets. A foreign metaphor ("an eval set is a restaurant") does not.
- Experiment 16: concept lessons as a made-up "workbench UI" turned into spreadsheets (15 lessons, every middle one flat page). If the learner will never operate that screen, it is not the real thing.
- Cost breaks ties between good stages: DOM/SVG ≈ 0.1–0.3 s per frame, three.js ≈ 0.85–3 s (`08-tools.md`). 3D pays when it gives what 2.5D cannot: rotation, depth, transparency, thousands of particles.

### 1.3 Layers 2–3: segment shapes and moment devices, from the diagnosis

Pairings that worked (the diagnosis decides):
- **Action → shape**: follow → **tour** (one real item through every station); predict → **bet** (the guess is an object on screen, the answer lands next to it); "why is this rule here?" → **remove the guard** (the student does the wrong step, the shortest failure path plays, the guard goes back); categories → **sort**; cause → **one condition changed, both runs visible**.
- **Obstacle → device**: invisible process → **see-through / cut open**; no felt size → **particles or cards to scale** (one dot = one item); layered → **explode into layers** (thickness = share); chance → **many runs side by side**; invisible evidence → **link lines** (a made-up claim has no line, it breaks red); a wrong intuition → the guess on screen, then a **silent reveal**; a refused move → a **stamp** with a one-line reason; one key word → a **selection box** around it; in a film the user asked to shoot in the Engram studio, the inside of something → **lights down** (trial, experiment 19: the room turns dark in ≈ 1–1.5 s, held ≥ 8 s, about twice a lesson at most, lit again before the recap).
- One wow device per segment and one main aha per lesson (silent, composed as the same picture reassembled, `04-skeleton.md` §2) read clearly; more was noise.
- Three segments, three different shapes (`04-skeleton.md` §2: neighbours differ in at least two knobs).

### 1.4 What carries the viewer from one sentence to the next (judged per segment)

A middle can meet the rhythm baseline and still feel like non-stop talk; experiment 17 §10.5 found four causes, none pause length: every sentence adds new information, the narration says what the picture already shows, nothing makes the viewer want the next sentence, and the shot never changes register. Below is what to achieve; the material decides if a segment needs each point, and in what shape.

1. **A reason to hear the next sentence.** The viewer always knows what they are waiting to find out. Its shape follows the question the segment answers (§1.1):
   - cause ("why did this happen?"): the question stays visible and is answered piece by piece;
   - choice: the options stay side by side until one is judged;
   - prediction: the viewer's guess becomes an object on screen (bet, in the order of `05-presentation-methods.md` §3b; nothing on screen gives the answer away first). Two kinds ask different things of what came before: a bet exposes an intuition and needs only the question, while a prediction the viewer is meant to work out needs its means in their hands before the pause (the rule, the number, the picture it runs on) — without them the pause is a blind guess and the answer arrives as a bare fact; when a piece the viewer saw earlier decides the outcome, let them complete it (planted piece);
   - wrong intuition: the belief is stated first, then broken; a Pro teacher may name the common mistake just before the viewer would make it (anticipation, `07-voice-and-language.md` §1b-3 point 6);
   - a conclusion the viewer could derive from what is on screen: let them watch it being derived against their intuition (visible reasoning, `05` §3b);
   - a segment that grows out of the previous answer's limit: open it from that limit (question ladder, `05` §3d);
   - a result that contradicts the rule just learned, with the mechanism in the next line: the student may ask that why (Pro, `05` §3c).

   All are options; a lesson can use none. They are not rules: the situation decides, and a device used because it exists is force-fitted. Planted piece, visible reasoning, the question ladder, anticipation, recall with a new case, a real case of the same mistake, the student's deep why, the rule's radius, stepping down into one run and the decision-maker's misreading are Pro-teacher devices (`11-teachers.md` §1b; free is Nico only); the bet, a plain question and stating the belief are for every teacher.

   A procedure is usually carried by the next step's goal alone ("now we need the price"). A short, concrete point may need nothing; a question the material doesn't raise sounds staged. Example only, for cause material: the clue board (`05` §3b).
2. **Picture first, narration for what the picture cannot say.** What worked: two columns — first what the viewer sees, beat by beat, then narration only where the picture cannot carry the point (the reason, the term, the consequence). A line describing what is visible can usually go.
   - A voiceless beat helps where an animation needs reading time (a build, a reveal); quota silences don't.
   - Speak the numbers the viewer must hold; others stay on screen or go.
   - Check each column alone: narration that retells the picture can be cut; a picture column with nothing the words point at is a signpost (`01-principles.md` §1).
3. **A cut back to the teacher or student brings something new**: a clue written on the board, a model turned in the room, the student's wrong guess, the teacher's judgement. Form from content: a board for an argument that grows, a model for something spatial, the student's hand for a mistake. The cut lands on the turn in the talk, where the next question starts, not on a clock. A cutback where only mouths move has no content: give it content or stay on the stage. Approved example (experiment 20 test 22, every teacher): a segment's bet moved whole onto the blackboard and back, with hard cuts (`05` §3b, Bet on the blackboard).
4. **Each sentence stands on the one before.** In a segment that reasons, the place a listener asks "where did that come from?" is a missing link, or two links in one beat (`04-skeleton.md` §2, One link, one beat). A listener review of the script finds these before any picture exists (`06-workflow.md` §1).
5. **Measure a reference to understand it, not to copy it.** Measure it (cuts, numbers, guide phrases, shot types), explain why each works there, then turn it into the criterion it serves. Its numbers are not targets: another subject and length change them. Only the rhythm baseline (`04-skeleton.md` §2) is series-wide.

Per segment, `UNDERSTANDING.md` §3 notes what carries the viewer (or "nothing needed" and why), and what each cutback shows.

### 1.5 Check

Against the learning principles (`01-principles.md` §2), the signpost test, the rhythm baseline (`pacecheck.py`), §1.4, and the question: *"What understanding does this picture give that listening alone would not?"* No answer: look elsewhere.

- **Demo films are not templates**: they and the catalogue are a minimum bar, not a format to copy.
- The skeleton is judged by its functions too: hook, place in the course, one-liner, recap per segment, structured ending, continuity. The classroom (blackboard, course map, mindmap) is the skeleton's default look for every subject; the clay cast was how the first course did it, and the learner's teacher now stands in the same classroom (`makeCast`, `11-teachers.md`). The Engram studio only when the user asks for it (`01-principles.md` §1).

## 2. Different subjects: the way of showing grows out of the subject

> Different subjects improvise: biology should be realistic (the heart, the cell nucleus as diagram animations), maths needs derivation and thinking problems through, and so on.

All approved methods so far come from one course (an ads course — an operating-a-tool subject). For another subject, first ask **"how do people in this subject come to understand this?"**, then animate that process. Examples (not a list to pick from):

| Subject | How people understand it | What the animation should do |
|---|---|---|
| Biology, medicine | Seeing the real structure and how it moves | Realistic diagram animation: the heart's four chambers and valves opening and closing, the direction of blood flow; the nucleus; insulin and blood sugar. Draw the organ or cell itself, not a metaphor for it |
| Mathematics | Following the derivation and thinking it through | Pose a question and let the viewer think; write the derivation line by line, each step changing the graph with it (geometric intuition, plug numbers in); let the wrong intuition appear, then overturn it |
| Physics, engineering | Change one condition, watch the result | Parameter simulation: the same setup replayed changing one variable; forces, velocities, energy drawn as visible arrows and quantities. Approved example: the Atlas diagram world (`05-presentation-methods.md`, `lib/atlas/ATLAS.md`) — two setups side by side, time paused at the telling instant, vectors split into components |
| Programming, systems | Seeing data and state move while the code runs | Code and execution state side by side: which line runs, how variables and memory change, how a request travels between services |
| Chemistry | Seeing molecules and reactions | Molecular models, electrons and bonds changing, before/after comparison |
| History, geography | Cause and effect in time and space | Timelines and maps in motion: who was where, in what order, how territories and routes changed |
| Operating a tool or setting (e.g. an ads manager) | Doing it once on the real interface | Real interface operation (`05-presentation-methods.md`) |

Common to every row: the picture is the thing itself and how it works, readable with the sound off.

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

Grammars from other film libraries (learn the grammar, don't copy their art — e.g. Lemo-Opuscar's style guides, MIT/CC BY):
- **Write, wipe, rewrite in place** (chalkboard): the wrong reading is written under its object, wiped in one pass, and the right one written in the same spot from the same camera position — the cleanest way to mark a wrong intuition wrong. A tracked part keeps one accent colour through several forms (a variable through an equation's rearrangements, a molecule through a pathway).
- **The character acts the system** (living screencast): the cursor is the user, the character is the software (or the body) doing its work — it runs along the rows it reads, stomps the button it tests. Gives the student character a job in real-interface segments.
- **The real specimen, one continuous change of scale** (microscope story): a real, licence-clean image of the actual thing, a camera that dives through scales with a scale bar, readings computed from the image, every number in `FACTS.md`.

- **The picture is the mechanism** (Tinycharts, April Zhu — concepts only; its kit and art are licensed for personal use only, so never reuse them): every state is a visible, named part of one picture; where we are now is lit so a stranger can name it; labels sit on the margin with leader lines; small people do the work at each station; a footnote says "illustrative" or names the source; removing a rule's guard shows the shortest path to failure. Grew into the isometric diagram world (experiment 17 A).
- **See through the real object** (short explainer reels, e.g. the user's reference "does keeping your laptop plugged in wear the battery?"): start from a real object in a real setting, its case turns transparent, inside the real mechanism runs as thousands of particles; open with a surprising fact or question. Grew into the 3D model stage (experiment 17 B).

Animation can also give viewers **impossible experiences**: impossible senses (seeing attention, trust, data), scale, time (weeks compressed into seconds), several viewpoints at once, worlds with different rules (no delay, unlimited resources — which problems remain?), the structure of abstract things.

## 4. The understanding design card (before any storyboard)

Each lesson's `UNDERSTANDING.md` (`templates/UNDERSTANDING.md`), written first so the choices follow from it:
1. **The change**: what the viewer can do after watching (see, tell apart, reason out, feel, use, want to explore), in concrete sentences.
2. **Obstacles**: invisible process, no scale, blurred concepts, a wrong intuition? The lesson's self-check questions help find them.
3. **Per segment, the diagnosis and the layers** (§1): the four answers (the last one, outcome and must-haves, is what the reviews check), then stage (once), shape, device. For a layer that needs a **new** design, **three genuinely different ideas**, each borrowed from a different field — not one explanation in three skins — surfaced the better option.
4. **The moment understanding happens**: which picture, event or contrast makes the viewer suddenly get it; apply the signpost test.
5. **Cost**: does it need a big metaphor learned first? Could it be fun but teach the wrong mechanism? Render cost, length.
6. Then the craft (layer 4: camera, morphs, sound), and an interest curve in `CARD.md`.
