# 06 Workflow

Two roles. With one lesson you may be both; with several lessons, the **host** (the main session) plans and reviews, and one **producer** (a subagent) makes each lesson. Keep the number of agents proportionate; the user dislikes runaway fan-out.

## 0. Where things live

| What | Where |
|---|---|
| Working studio (renders, scratch) | `$STUDIO` — a scratchpad folder; set up with `cp -r scripts/studio "$STUDIO" && (cd "$STUDIO" && npm install)` |
| One lesson's working project | `$STUDIO/projects/<id>/` |
| Permanent record of each lesson (the "lab archive") | in the vault, (not public) — `00-紀錄.md` for the round; the **archive dir** `各片/` holds `<id>/` with `UNDERSTANDING.md`, `CARD.md`, `SCRIPT.md`, `NOTES.md`, `SILENT.md`, `src/` (from `scripts/farm/bundle.py`) and `parts/` (cloud renders), plus `parts-<id>.json` |
| Delivered films | `engram-quest/videos/<series>/` (`<id>.mp4`, `.jpg`, `.vtt`, `meta.json`); `FACTS.md` goes to the lesson archive |

## 1. Producer: one lesson

1. **Read**: this skill, the series plan, the course material (including its self-check questions), the previous and next lessons' scripts.
2. **Understanding design card** `UNDERSTANDING.md` (`templates/UNDERSTANDING.md`): the change → obstacles → per segment the four-step judgment (`03-adapter-pattern.md`) → the moment understanding happens → cost.
3. **Stage 1 (no visuals)**:
   - `CARD.md`: the one-liner and its second; head (hook, map, question card, the push into the middle); one line per segment (point / method / which recap image); ending mindmap sketch; the sentences linking to the previous and next lesson; terms with definition sentences; a fact base with each fact marked *source / verified / unverified*.
   - `SCRIPT.md`: line by line — speaker, line, tone, what is on screen, what a muted viewer understands.
   - `script.json` → `python3 voice.py projects/<id>`.
   - `FACTS.md` (`templates/FACTS.md`): every fact and number in the film with its source (URL + quoted wording, or the calculation). Biology, medicine and other factual subjects: no claim without a source. Good default sources: OpenStax (*Anatomy & Physiology 2e*, *Biology 2e*, *Chemistry 2e*, *University Physics* — free, CC BY, fetchable); the course material itself; official documentation for software. NCBI StatPearls is often behind a captcha for fetch tools.
   - Three stills: the first frame, the moment of understanding, the ending mindmap.
   - **Report to the host** (one-liner + second, opening 30 s of lines, one line per segment, mindmap structure, length, still paths, pronunciation spot-check, tool problems) and wait for the host's reply — the host answers right away, never after asking the user.
4. **Stage 2 (after the host's review)**: `classroom.html` (head and tail) and `scene.html` (middle), `segments.json` → at least one **full-resolution** still per segment, looked at → segment previews and contact sheets to check motion; at least two fix rounds → **`readcheck.cjs` passes on every page** (`08-tools.md` §2; the map and recap cards included) → `NOTES.md` (decisions and reasons, compromises, self-assessment, a signpost-test table) → `stills/` with 2–3 representative stills per segment (file names carry the second) → write `READY` containing the poster second.

Producer rules: write only in your own project folder; read others' freely. Do not edit the shared `lib/`, `render.cjs`, `compose.py`, `voice.py` — report problems; copy into your folder if you need a variant. No full renders on the shared machine.

## 2. Host

1. **Before work**: write the series plan (`templates/SERIES.md`) and the producer brief (`templates/BRIEF.md`). The brief starts from the skeleton and the approved methods; it must never say "don't reuse last round's shell" or anything else that invites a full redesign. Shared components (map, recap card, mindmap) go to a component maker first, in parallel with the producers' stage 1.
2. **Review stage 1 yourself, then send each producer straight into stage 2** with your fixes: length, term definitions, facts, whether each segment's method was chosen well (fits the content, not forced), the one-liner, continuity between lessons. **Do not stop to show the user stage 1 or ask for approval** — the user gave the goal; the whole run to delivery is yours. Decisions you would have asked about (cut a line or keep it, which pronunciation) you make and write in `00-紀錄.md`.
3. **Silent review** (after stage 2, before rendering): a separate reviewer who sees **only the stills**, never the script, first writes what they understood from the pictures, then compares with the understanding design card and lists fixes (`templates/SILENT-REVIEW.md`). It catches what producer and host both miss: numbers that don't add up, a switch drawn the wrong way, a picture that suggests the wrong answer, a wrong intuition written on screen without being marked wrong. Fix before rendering.
4. **Render**:
   - Three.js frames take ≈2.5–3 s each, DOM frames ≈0.3 s. Full films are rendered in the cloud; locally only stills and previews.
   - **One cloud session per lesson** (`scripts/farm/`): `plan.py` cuts parts → `bundle.py` stores the sources in the archive → commit and push → one session per lesson (`session-template.txt`) runs `farm.sh`, rendering all parts in parallel and pushing each → `land.sh` collects and joins → `joincheck.py` checks seams → **archive the session immediately**. Never one session per part (experiments 7–10 piled up 115 child sessions). Delete render branches only with the user's consent — and a cloud session usually cannot delete remote branches (the git proxy refuses with 403; experiments 12, 15, 16, 20): say so when reporting and ask the user to delete them on GitHub.
   - If a shared component is not final yet, send the parts that don't touch it first (`plan.py <id> <defer-seconds>`).
   - No cloud? Render locally in parallel parts: `bash scripts/farm/localfarm.sh <id>` (plan → compose per part, 4 at a time → join; finished parts are kept, so after a fix delete only the parts it touches), then `STUDIO=… python3 scripts/farm/joincheck.py <id> projects/<id>/_parts.json`. One lesson at a time.
5. **Sample-check the joined film**: one full-resolution frame per segment — catch numbers or text that were missed (once a table still showed the old numbers after a fix; only that part was re-rendered).
6. **Deliver** (`scripts/deliver.py`): "Morning" at opening and ending, first frame held 3 s, last frame 5 s, narration loudness consistent, poster, subtitles → `engram-quest/videos/<series>/`; with the `cards` module on (`12-modules.md` §3) write `projects/<id>/cards.json` first and check both frames of every card, then deliver writes the review-card deck → optionally a screening room (`scripts/farm/room-build.py`, an Artifact page with 720p copies and chapter buttons).
7. **After the user's review of the delivered films** (the first and only time the user is involved after giving the goal): record it (`10-iteration-and-records.md`).

## 3. Timing (for planning)

- Stage 1 per lesson: about an hour for one producer.
- Stage 2 per lesson: a few hours including fix rounds.
- Cloud render: about 50 minutes per lesson with all parts in parallel in one session.
