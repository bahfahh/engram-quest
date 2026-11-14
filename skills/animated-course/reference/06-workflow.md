# 06 Workflow

Two roles. With one lesson you may be both; with several lessons, the **host** (the main session) plans and reviews, and one **producer** (a subagent) makes each lesson. Keep agents proportionate; the user dislikes runaway fan-out.

## 0. Where things live

| What | Where |
|---|---|
| Working studio (renders, scratch) | `$STUDIO` — a scratchpad folder; set up with `cp -r scripts/studio "$STUDIO" && (cd "$STUDIO" && npm install)` |
| One lesson's working project | `$STUDIO/projects/<id>/` |
| Permanent record of each lesson (the "lab archive") | a folder the project keeps outside the studio, one per round, with a record file for the round; its **archive dir** holds `<id>/` with `UNDERSTANDING.md`, `CARD.md`, `SCRIPT.md`, `NOTES.md`, `SILENT.md`, `src/` (from `scripts/farm/bundle.py`) and `parts/` (cloud renders), plus `parts-<id>.json` |
| Delivered films | `engram-quest/videos/<series>/` (`<id>.mp4`, `.jpg`, `.vtt`, `meta.json`); `FACTS.md` goes to the lesson archive |

## 1. Producer: one lesson

1. **Read**: this skill, the series plan, the course material (including its self-check questions), the previous and next lessons' scripts.
2. **Understanding design card** `UNDERSTANDING.md` (`templates/UNDERSTANDING.md`): the change → obstacles → per segment the four-step judgment (`03-adapter-pattern.md`) → the moment understanding happens → cost.
3. **Stage 1 (no visuals)**:
   - `CARD.md`: the one-liner and its second; head (hook, map, question card, the push into the middle); one line per segment (point / method / which recap image); ending mindmap sketch; the sentences linking to the previous and next lesson; terms with definition sentences; a fact base with each fact marked *source / verified / unverified*.
   - `SCRIPT.md`: line by line — speaker, line, tone, what is on screen, what a muted viewer understands.
   - **Listener review of the script** (`templates/LISTENER-REVIEW.md`), before `script.json` is voiced and before any still: a separate reviewer gets only the audience description and the lines (speaker, line, a one-line note of what is on screen), hears them once in order as that viewer, and marks where they are lost, where they would leave believing something false, and what is merely awkward. No score: a model playing a half-informed viewer overrates what it understood, so findings are the output. It then answers each segment's outcome in its own words, works one case the film does not contain, and checks the must-haves (`03-adapter-pattern.md` §1.1). What kept scripts from growing: fix by cutting or reordering before adding a sentence; the same spot lost twice wants a different way of saying it; three rounds at most, then settle and note what stays open in `NOTES.md`. Why here: a round takes about a minute and a rewrite costs no scene work, while the silent review (§2) comes after the scenes and covers what only pictures show. In the film that tried it, two rounds found nine skipped links, among them a takeaway the body never computed and two guess beats asked before the viewer had the means to answer.
   - `script.json` → `python3 voice.py projects/<id>`.
   - `FACTS.md` (`templates/FACTS.md`): every fact and number in the film with its source (URL + quoted wording, or the calculation). Facts must be real; in biology, medicine and other factual subjects every claim has a source. Good default sources: OpenStax (*Anatomy & Physiology 2e*, *Biology 2e*, *Chemistry 2e*, *University Physics* — free, CC BY, fetchable); the course material itself; official documentation for software. NCBI StatPearls is often behind a captcha for fetch tools.
   - Three stills: the first frame, the moment of understanding, the ending mindmap.
   - **Report to the host** (one-liner + second, opening 30 s of lines, one line per segment, mindmap structure, length, still paths, pronunciation spot-check, tool problems) and wait for the host's reply — the host answers right away, without asking the user.
4. **Stage 2 (after the host's review)**: `classroom.html` (head and tail) and `scene.html` (middle), `segments.json` → at least one **full-resolution** still per segment, looked at → segment previews and contact sheets to check motion; two or more fix rounds → **`readcheck.cjs` on every page** (`08-tools.md` §2; map and recap cards included), fix what it reports → **`livecheck.py` on the middle's preview** flags narration over a frozen picture (approved films: under ≈ 3 s outside planned holds); judge each flagged stretch: does the picture follow the words? (`01-principles.md` §2) → `NOTES.md` (decisions and reasons, compromises, self-assessment, a signpost-test table) → `stills/` with 2–3 representative stills per segment (file names carry the second) → write `READY` containing the poster second.

Producer contract (the studio is shared): write only in your own project folder; read others' freely. The shared `lib/`, `render.cjs`, `compose.py`, `voice.py` stay untouched — report problems, or copy into your folder for a variant. Full renders: cloud, not the shared machine.

## 2. Host

1. **Before work**: write the series plan (`templates/SERIES.md`) and the producer brief (`templates/BRIEF.md`). The brief starts from the skeleton and the approved methods; wording like "don't reuse last round's shell" invites a full redesign and loses what was approved. Shared components (map, recap card, mindmap) go to a component maker first, in parallel with the producers' stage 1.
2. **Review stage 1 yourself, then send each producer straight into stage 2** with your fixes: length, term definitions, facts, whether each segment's method was chosen well (fits the content, not forced), the one-liner, continuity between lessons. **Stage 1 is not shown to the user for approval** (`SKILL.md` rule 0): the user gave the goal; the run is yours. Decisions you would have asked about (cut a line or keep it, which pronunciation) you make and write in the round's record file.
3. **Silent review** (after stage 2, before rendering): a separate reviewer who sees **only the stills**, not the script, first writes what they understood from the pictures, then compares with the understanding design card and lists fixes (`templates/SILENT-REVIEW.md`). It catches what producer and host miss: numbers that don't add up, a switch drawn the wrong way, a picture that suggests the wrong answer, a wrong intuition written on screen without being marked wrong.
4. **Render**:
   - Three.js frames take ≈2.5–3 s each, DOM frames ≈0.3 s, so full films render in the cloud; locally, stills and previews.
   - **One cloud session per lesson** (`scripts/farm/`): `plan.py` cuts parts → `bundle.py` stores the sources in the archive → commit and push → one session per lesson (`session-template.txt`) runs `farm.sh`, rendering all parts in parallel and pushing each → `land.sh` collects and joins → `joincheck.py` checks seams → **archive the session once collected**. One session per part piled up 115 child sessions (experiments 7–10). Delete render branches only with the user's consent — and a cloud session usually cannot delete remote branches (the git proxy refuses with 403; experiments 12, 15, 16, 20): say so when reporting and ask the user to delete them on GitHub.
   - If a shared component is not final yet, send the parts that don't touch it first (`plan.py <id> <defer-seconds>`).
   - No cloud? Render locally in parallel parts: `bash scripts/farm/localfarm.sh <id>` (plan → compose per part, 4 at a time → join; finished parts are kept, so after a fix delete only the parts it touches), then `STUDIO=… python3 scripts/farm/joincheck.py <id> projects/<id>/_parts.json`. One lesson at a time.
5. **Sample-check the joined film**: one full-resolution frame per segment — catch numbers or text that were missed (once a table still showed the old numbers after a fix; only that part was re-rendered).
6. **Deliver** (`scripts/deliver.py`): "Morning" at opening and ending, first frame held 3 s, last frame 5 s, narration loudness consistent, poster, subtitles → `engram-quest/videos/<series>/`; pass `--tags` (one or two broad subject areas, such as software or health, in the learner's language: the library shelf filters by them) and `--source` (the vault path of the note or course the lesson came from: the player links to it), which are added to the series even when the plugin created it; with the `cards` module on (`12-modules.md` §3) write `projects/<id>/cards.json` first and check both frames of every card, then deliver writes the review-card deck → optionally a screening room (`scripts/farm/room-build.py`, an Artifact page with 720p copies and chapter buttons).
7. **After the user's review of the delivered films** (the user's only involvement after the syllabus checkpoint): record it (`10-iteration-and-records.md`).

## 3. Timing (for planning)

- Stage 1 per lesson: about an hour for one producer.
- Stage 2 per lesson: a few hours including fix rounds.
- Cloud render: about 1–1.5 hours per lesson with all parts in parallel in one session (experiment 21: eight lessons, ~17–19 parts each; several lessons can render at once, each in its own session).
