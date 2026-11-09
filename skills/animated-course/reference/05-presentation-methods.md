# 05 Ways of showing: what has been done (examples, not a menu)

The catalogue is organised by the layers of `03-adapter-pattern.md` §1: §3 stages and whole-middle methods (layer 1), §3b segment shapes (layer 2), §3c moment devices (layer 3). Most of §3 comes from **one course** — AdsDemo Meta Ads Playbook, a course for an indie app developer validating an app with NT$3,000 of Meta ads. It is an operate-a-tool subject, so real-interface methods dominate; later experiments added physics (Atlas), biology and abstract mechanisms (zoom out / zoom in). **For another subject, start from the learning principles and `03-adapter-pattern.md` §2, not from this table.** If something here fits, use it; if it fits only loosely, design your own.

## 1. Status

| Status | Meaning |
|---|---|
| `approved` | The user reviewed it and found it good. Approved methods coexist; none replaces another |
| `trial` | Made, not yet reviewed by the user. Never a rule |
| `rejected` | The user reviewed it and did not pick it. Write which content it was used for — the content can still be taught another way |
| `needs rework` | Direction approved, execution not |

Only the user's review changes a status.

## 2. The skeleton and shared components

| Thing | Status | Notes |
|---|---|---|
| Skeleton: clay classroom opening with teacher and student, blackboard, recap images, blackboard mindmap ending | approved (fixed) | — |
| Course map (`coursemap4.js`, tabletop clay model of the whole system) | needs rework | Direction kept; too fast, camera too close, low recognisability (`04-skeleton.md` §5) |
| Recap card (`keypoint.js`) | approved | One diagram + one sentence, 4–6 s |

## 3. Methods for the middle

| Shape of the content | Method | Status | The moment understanding happens (example) |
|---|---|---|---|
| How to do it in an interface | **Real interface operation**: the real screens, step by step, on one running case | approved | Lesson 4 "rewind replay": only day 2 changes by two installs, and the whole money flow swings to ad set B |
| Something invisible inside a real interface | **Real interface + draw the invisible**: overlay what the screen does not show | approved | Lesson 5: a solid fence = hard limit, a dashed circle = starting point, drawn over a crowd of dots; "can a 38-year-old see it?" — revealed |
| Judgement, rules, categories | **Whiteboard explanation**: one clean board per idea (number tag, icon appears on its word, dashed groups, ends in one big key word); finished boards shrink to the corner; at the end the boards line up into one flow | approved | Lesson 7: "you + attribute" is rewritten and passes the policy gate |
| What parts a finished piece has, what each part does | **Review desk**: the piece laid out as film strips on a board, a panel of 100 viewers watching in sync, each one who scrolls away goes dark | approved | Lesson 8: the pointer finds nothing to point at in the pretty video's first 1.5 s; in the plain one it stops on "the 47th time" |
| Where numbers come from, how to read them | **Report development**: the people behind each percentage walk through a row of gates | approved | Lesson 10: only the first gate is widened, and link CTR turns green by itself |
| Scale; what happens when you spend more | **Scale sandbox**: draw the invisible price ladder; more money climbs up and to the right | approved | Lesson 13: budget ×10, installs only ×4 |
| Comparing methods, test design | Season fast-forward | rejected (lesson 9) | |
| Diagnosis, decision rules | The red shape | rejected (lesson 11) | |
| A system of interacting settings | System sandbox | rejected (lesson 12) | |
| Physics and other subjects where the real thing is a geometry or a motion (vectors, forces, mechanisms) | **Atlas diagram world** (`lib/atlas/`, from Atlas of Physics): one 3D textbook-style world (paper solids, ink edges) for the whole middle; per narration phrase only the camera beat, the one lit thing and what is shown change; the moment of understanding is an "explode" (a vector slides tip-to-tail, or splits into its components); time stops while a moving thing is explained; numbers from `model.js` checked by `checks.mjs`; the simulation rate is written on screen | approved (experiment 13) | Lesson "crossing a river": both boats paused halfway on one level line — the current does not change the crossing time |
| Biology: how organs and cells work | **Realistic anatomy diagrams**: shaded SVG/canvas illustrations of the real structure (frontal heart section with valves, alveoli with capillary net, nephron with the receiving capillaries, skin cross-section at a wound), a small body locator, one tracked thing (a red blood cell, water drops) moving along the real path; a "Detect → Order → Pull back" loop display filled with the real organ names | trial (experiment 12, awaiting review) | Two identical nephrons side by side, still filtering a lot; ADH opens water channels on one side only; the urine cups fill small and dark vs large and pale |
| A process, pipeline or system in a concept lesson (stage) | **Isometric diagram world**: the whole process drawn as one place, stations in reading order with numbered margin labels on leader lines, title block and an "illustrative" footnote; the camera tours wide → close → wide; the station being taught is lit, the others wait with a "?"; a recap = the wide shot with that station lit and its result left in place. Own style (experiment 17: riso print — navy ink line, offset colour blocks, halftone shadows, isometric dot paper) | method approved (experiment 17 A); **look needs rework** → rebuilt in the light studio (experiment 19 `x19-a-light`, trial, waiting for the user's review) | 214 s: the 驗收集 safe is cut open (4 s silence) — four customers' other questions are hiding inside |
| What is inside, thousands of things flowing, a look-up moment (stage) | **3D model**: a machine on the classroom's table; cases turn transparent (x-ray), drawers are cut open, a stack explodes into layers whose thickness is the share; the real operation as particles (30,000 conversations = 30,000 dots); labels as DOM over the canvas. ≈ 0.85 s per frame (instancing), 3–6× a DOM page, an 81 MB film | approved (experiment 17 B) | 101.9 s: 155 cards explode into six trays — 清潔保養 is a single gold thread |
| The same quantity shown twice | **Dual view**: to-scale particle bands on the left, the cut-away scene on the right, moving together | rejected (experiment 17 C, not picked; the same content was taught by A and B) | 73 s: the cabinet turns transparent, its row of cards as long as the band |
| (rhythm only) | **The approved look with the rhythm baseline** — now part of the skeleton (`04-skeleton.md` §2) | approved (experiment 17 D) | 188.6 s: 5 s of silence, 81% struck through, 75% appears |
| An abstract mechanism with no real picture to show (how card payments settle, how fees compound, how GPS finds you) | **Zoom out / zoom in decomposition**: one drawn frame per concept the learner must understand, built up while it is explained; a zoomed-out map only for the whole (parts and connections, no details); details stay in their own frame; ending mindmap = small versions of those frames lit in the order of the logic. Few-shot: the user's own demo (below) | approved as **one** way (experiment 18c) — not a replacement for the others | GPS: both measured lines grow the same orange 300 m piece — so the clock error is the fourth unknown |
| Teaching a whole lesson inside one map (every detail drawn on it, every concept opened inside it) | Whole film is a map | rejected (experiment 18: too dense, no focus, narration read the screen) | |
| Fixing a crowded frame by deleting content under word / colour / silence budgets | Subtraction to empty frames | rejected (experiment 18b: 「我要你乾淨，不是空白」) | |
| None of the above (common when the subject changes) | Design your own from the learning principles | trial | |

"Rejected" does not mean that content cannot be taught; it means that execution was not picked. Teach the same shape with an approved method or another new idea.

### Notes on the approved methods
- **Real interface**: easy to fall into the same shell every lesson; interface text in wide shots gets too small; the student shrinks to a speech bubble with no job. Components: `lib/kit/` (phone, feed, Ads Manager pieces, callouts, camera) — Meta-ads specific; build the equivalent for your subject's real screens.
- **Whiteboard**: came from a reference film the user liked (Google Cloud Tech, "AI Agent Memory Architecture"). Clean means few things, not small things — the one idea must fill the board. A split screen's other half must do work (a case panel that changes with each idea, or a map of the decision flow lighting the current step) — never an idle puppet. Implementation pattern: one track per element (appear, vanish, move, draw line, stamp), `render(t)` a pure function of t; DOM pages render cheaply (≈0.2–0.5 s per frame).
- **Atlas diagram world** (`lib/atlas/ATLAS.md`): design the camera beats, the lit table and the explode moments in the understanding card before building. Keep one colour per quantity for the whole film; show adding tip-to-tail and cancelling side by side in separate steps; measure with drawn dimension lines. It replaces nothing: head and tail stay the classroom skeleton. For single-concept lessons the course map can be a three-panel blackboard (already know → today → later), each panel held ≥ 3 s.
- **Zoom out / zoom in decomposition** (experiment 18c). Use it when the content is a mechanism with no real picture; for a real screen, real code or a real organ, show the real thing and make the focus on it (`01-principles.md` §1 "Every frame has a focus"). Few-shot: the user's demo in the vault, (not public) — A card payment (2 frames + mindmap), B fees and compounding (2 + 1), C GPS (4 + 1), each with `00-說明與播放順序.html`; stills `assets/looks/6a–6d`, and the counter-example `6x`. They are references for a way of thinking, not templates. What they show, take what fits:
  - **Focus by size, position and contrast**: the subject is large and central; one accent colour means one thing (C: orange = the error only; B: orange = the gap only; A: purple = claim data going out, green = money coming back). Everything else in dark ink, clearly visible — not greyed to nothing.
  - **One sentence states the frame's point or question** (「手機的鐘一偏，測距就一起偏」「同樣 100 萬，30 年後差 142 萬」); a heading, a spoken question or a picture that says it alone can all work.
  - **The picture runs the mechanism with recognisable objects** (satellite → dashed line → phone with a stopwatch reading 0.07 秒; two circles crossing at two dots; store, bank buildings, coins), drawn large with solid fills — not 24 px outline icons.
  - **Real numbers and honesty labels stay** (0.07 秒, ≈ 21,000 公里, 574 / 432 / 142 萬; 「差距放大示意」), small and to the side.
  - **As many frames as concepts** (C four, A and B two), plus the whole at the end; one frame may build up over 20–40 s and stay on its one thing.
  - **Voice**: the picture shows, the voice gives the why. C03 example: *(both lines grow the same orange piece)* 「可是一微秒，光就跑了三百公尺——每一條距離，都一起被多算了三百公尺。」*(beat)*「所以鐘差不是小事，它就是第四個未知數。」— never 「左邊是手機，右邊是兩顆衛星」.
  - Producer brief and reviewer task used in 18c: the experiment's `製作工具/BRIEF-v3.md` and `REVIEW-v3.md` (vault, `研究/實驗18-整支片是地圖（六版測試）/`).
- **Review desk / report development / scale sandbox**: approved as middles, but their first versions had **no head and no tail** — always wrap them in the skeleton.

## 3b. Segment shapes (layer 2: what the viewer does in a segment)

| Shape | What the viewer does | Fits (diagnosis) | Status | Example |
|---|---|---|---|---|
| **Tour** | follows one real item through every station | a process; "how does it run" | approved (experiment 17 D, A, B segment 1) | the conversation 「濾網要怎麼洗」 through dedupe → the bins → ten draws |
| **Bet** | commits to a guess that is an object on screen (a flag, a pin, a highlighted card); the answer lands next to it | a wrong intuition, a judgement | approved (experiment 17 D, A segment 2) | which of the AI's question cards cannot go into the test |
| **Remove the guard** | the student does the wrong step; the shortest failure path plays fast; then the guard goes back | "why does this rule exist" | approved (experiment 17 D, A, B segment 3) | random split → same customer on both sides → 81% → really 75% → split by customer |
| **Recall** (between segments, a skeleton beat) | answers a question about the previous segment over the stage's wide shot | — | approved (experiment 17) | 「隨機抽 50 題，哪一類最容易整類消失？」 |
| **Rewind replay** | the same picture with one condition changed | cause | approved (AdsDemo lesson 4); variant "keep the previous result on screen" trial (experiment 16) | day 2 changes by two installs, the money swings to B |
| **Sort** | real cards dropped one by one into their bins, the third one paused for a guess | categories, decision rules | trial (experiment 16) | |
| **Clue board** | holds one "why" question on the board; each clue is written next to it at the moment it is found in the real footage; at the end the clues are joined and the question answered | cause: a result whose reason is spread over several facts. Not for definitions, procedures or single facts | trial (experiment 17 §10.5, an 80 s test cut of one segment; direction accepted, no full film yet) | 「為什麼點成 16:30？」: shrunken screenshot / only coordinates / blind between screenshots |

## 3c. Moment devices (layer 3: the wow and the aha, chosen from the obstacle)

| Obstacle | Device | Status | Example |
|---|---|---|---|
| The process is invisible | **See-through / cut open**: a case turns transparent, a cabinet or safe is cut open, the inside keeps working | approved (experiment 17 A, B; from the user's reel reference) | B 51 s: the data cabinet x-rayed; A 214 s: the safe cut open |
| The quantity has no felt size | **Particles or cards to scale**: one dot or card = one item | approved (experiment 17 A, B) | B: 30,000 particles; A: a tank of small cards |
| Layers or categories inside one thing | **Explode into layers**, thickness = share | approved (experiment 17 B) | six trays |
| Chance | **Many runs side by side** (small multiples, test tubes) | approved (experiment 17 D, A, B; first in experiment 16) | ten draws: half lose a whole category |
| The evidence is invisible | **Link lines** to the source sentence; a made-up claim has no line, it breaks red | approved (experiment 17 D, A, B) | the NT$650 card connects to nothing |
| A move that is not allowed | **Stamp** with a one-line reason | approved (experiment 17) | 「文件裡找不到 NT$650」「不能直接比：尺變了」 |
| One key word must stick | **Selection box** around one word at the top of the frame (≥ 40 px); never full captions | approved (experiment 17 A) | 「整類消失」 |
| The inside of something, in a light-studio lesson | **Lights down**: the light studio turns into the dark studio for that moment (≈ 1–1.5 s), the case goes see-through, then the lights come back up | trial (experiment 19) | A 214 s: the safe is cut open in the dark |
| A wrong intuition | the guess on screen, then a **silent reveal** next to it (3–5 s) | approved (experiment 17, all versions) | 81% struck through → 75% |
| Others from experiment 16 (denominator tags, the known thing morphing into the new one, the dumbest baseline, the impossible search, question-first mindmap…) | | trial (`研究/實驗16-AI-Engineering補洞（8課）/新想法彙整.md`; not reviewed) | |

## 4. The demo films (minimum bar, not templates)

Chosen at the end of experiments 6–11 to show one approved way of teaching each. **They are demos and a minimum standard, not formats to copy.** A new film should at least reach what is good in them and avoid their listed flaws. Stills in `assets/looks/`; the films are in the vault under `engram-quest/videos/`.

| # | Film | Way of teaching | Why it was chosen | Flaws — do not copy | Stills |
|---|---|---|---|---|---|
| 1 | Lesson 1 Auction (v2, Chinese) `AdsDemo-meta-ads-v2/r2-l01-auction.mp4` | Real interface + dialogue | Every wrong guess by the student uncovers one mechanism; "the lowest bid won" is counter-intuitive and clear | Ending blackboard is lines of text with no structure (later replaced by a mindmap); course map too plain | `1a-l01-classroom-opening.jpg`, `1b-l01-real-ui-lowest-bid-wins.jpg` |
| 2 | Lesson 4 Campaign (v3, Chinese) `AdsDemo-meta-ads-v3/r3-l04-campaign.mp4` | Real interface + rewind replay | The prototype of the skeleton (classroom opening, real Ads Manager, blackboard mindmap); the replay changes one thing and the money flows to B | Course map is a signpost; interface text too small in wide shots | `2a-l04-rewind-replay.jpg`, `2b-l04-mindmap-ending.jpg` |
| 3 | Lesson 5 Ad set (v3, Chinese) `AdsDemo-meta-ads-v3/r3-l05-adset.mp4` | Real interface + drawing invisible boundaries | Fence vs dashed starting circle over a crowd; one reveal and it is understood | Course map is a signpost; report wide shot text too small, labels overlap | `3-l05-invisible-boundaries.jpg` |
| 4 | Lesson 7 Policy red lines (v3, Chinese) `AdsDemo-meta-ads-v3/r3-l07-policy.mp4` | Whiteboard | One board per idea, then three boards joined into one flow | No head or tail; the puppet on the right does nothing; board text squeezed into a corner, lower half empty | `4a-l07-whiteboard-one-idea.jpg`, `4b-l07-boards-joined.jpg` |
| 5 | Lesson 8 Hook / Body / CTA (English model lesson) `AdsDemo-meta-ads-model-en/en-l08-hook.mp4` | Review desk inside the v3 skeleton | Pointer finds nothing in the pretty video's first 1.5 s; the plain one stops on "47th time"; 100 viewers go dark in sync | Course map too fast, camera too close, low recognisability | `5a-l08-review-desk.jpg`, `5b-l08-mindmap-en.jpg` |

| 6 | Experiment 17 D, lesson 6 data (Chinese) `exp17-middle-pacing/x17-d-rhythm.mp4` | The rhythm baseline on the approved look | Same look as the original, but the middle is no longer tiring: tour, bet, remove the guard, recall questions, real silences | The picture has nothing new; segment 3 runs 89 s with two points | `6-x17d-silent-aha.jpg` |
| 7 | Experiment 17 A, lesson 6 data (Chinese) `exp17-middle-pacing/x17-a-sketch.mp4` | Isometric diagram world | One place for the whole middle; margin labels; the cut-open safe | The riso-print look (ugly, inconsistent with the cast — learn the structure, not the look); wide shot scaled to ~0.55; segment 3 crowded | `7-x17a-iso-factory.jpg` |
| 8 | Experiment 17 B, lesson 6 data (Chinese) `exp17-middle-pacing/x17-b-model.mp4` | 3D model: x-ray, explode, particles | The look-up moment (explode into six layers); continuous with the 3D classroom | No text on 3D cards (labels only); 3–6× render cost; student's actions small | `8-x17b-explode.jpg` |

Experiment 17 screening room (original + all four versions, chapters to the wow and the aha): (not public)

Experiment 19 screening room (the house style, trial): the 35 s component demo (light → lights down → light), A rebuilt in the light studio with lights down at the cut-open safe, B rebuilt in the dark studio, new classroom / course map / mindmap, next to the experiment 17 originals: (not public) (films in `engram-quest/videos/exp19-house-lesson/`). Learn the house look from these, the structures from 7 and 8.

Also worth watching: lesson 2 measurement (follow one data record), lesson 3 landing page vs app (two roads race), lesson 6 ads (the feed crops the hook text card), English lessons 10 (report development) and 13 (scale sandbox).

Why these five: the real interface is the method the user scored highest throughout; earlier versions had many good films whose flaws were in the whiteboard, blackboard or map handling, so each way of teaching is represented by its best film regardless of version.
