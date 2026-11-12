# 04 Production: choosing, building, checking, delivering

## 1. What becomes a film

Three length tiers exist and nothing else (`templates/length.json`, also read by the plugin). A tier is a budget of tokens and attention, not a number of seconds.

| | Short | Medium | Long |
|---|---|---|---|
| Recall pack | every topic | every topic | every topic |
| Films | one topic | two topics, or one in full depth | three topics, or a month overview plus two |
| Checks | self-check: reading report, key stills | words and pictures once each | both checks, twice |

- Order of authority: what the user said this time; the `length` of a pending plugin request; ask once after reading (offer the three tiers with what each would cover); when nobody can be asked, the plugin setting `episodicLength`; otherwise medium.
- Which topics: the user's named topics first; then the pack's ranking; prefer topics that reach L3-L4 and whose cards have gone badly. If fewer topics are deep enough than the tier holds, say so and make fewer. Do not pad.
- Depth before breadth: a shorter film takes fewer skeleton questions, not shallower chapters.
- Report the topics not filmed. They are the candidates next time and they still have their cards.

Reference point, one deep topic (about 10 minutes, 9 chapters): 14,232 frames of which 4,875 were captured, 4 minutes on 4 CPU cores. The time ranges in `length.json` predate this structure and have not been re-measured; treat them as loose.

## 2. Building

```bash
STUDIO=<a work folder outside the vault>
mkdir -p $STUDIO/projects
cp -r .claude/skills/engram-quest-episodic-review/scripts/studio/. $STUDIO/ && (cd $STUDIO && npm install)
cp -r .claude/skills/engram-quest-episodic-review/templates/film $STUDIO/projects/<id>
cd $STUDIO
node render_stage.cjs projects/<id> --data              # film-data.json: length, chapters, music cues, on-screen text
node render_stage.cjs projects/<id> --stills 4,30,95    # look before rendering
```

The template:

| File | Role |
|---|---|
| `engine.js` | a small timeline. Elements declare when they are on screen (`on`, `off`, `dim`), lines draw themselves (`line`), `fn` is for custom per-frame work. `renderAt(t)` only writes inline styles. Also reports reading-time shortfalls |
| `parts.js` | pieces: chapter container, header, caption, nodes, labelled lines, cards, chat bubbles, rows, tags, countdown ring |
| `patterns.js` | whole presentations driven by data: opening, skeleton, sorting a source into groups, facet cards, option cards, comparison rows, decision ladder, lanes, bars, relation map, cloze recall, new cases, closing |
| `look.css` | the look |
| `scene.html` | loads the film, wires the chrome (path, chapter, skeleton strip), exposes `renderAt`, `DURATION`, `CHAPTERS`, `CUES`, `ONSCREEN`, `READING` |
| `film.example.js` | a complete small film about an invented person's notes. Replace its content; keep or change its patterns |

Write the film as `film.js` in the project: it is a list of chapters, each a call to a pattern with data, or your own function built from `parts.js`.

**One rule makes rendering cheap:** a frame is exactly what the page's HTML says after `renderAt(t)`. No canvas drawing, no CSS animation, no clocks. The renderer fingerprints the HTML and captures identical frames once. A review is mostly holds, so about a quarter to a third of the frames are captured. Continuous camera motion defeats this; prefer cuts, fades and things that move and then rest.

Reuse across runs is weak: the fingerprint covers the whole page, so an edit to a shared node recaptures everything. Settle the stylesheet before tuning content.

## 3. Checking before the full render

1. `READING` in `film-data.json` (also printed by `--data`): every text that is on screen for less than it needs. Fix the timing or cut words.
2. Stills at each chapter's fullest moment: overlaps, text outside its card, type too small, an empty half of the frame.
3. Read the on-screen text in order as a stranger would. Then look at the stills with text hidden. For medium and long tiers give both to a fresh agent that has not seen the notes.
4. Every question: was its answer on screen before it was asked?

Changing timing after the score is generated means regenerating the cue sheet; do it from `film-data.json` every time rather than by hand.

## 4. Sound

- No narration is assumed. Where speech synthesis is available it must say what the picture shows, in the film's language.
- Music comes from `scripts/music/` (procedural score on sampled instruments): give `pick_music.py` a cue sheet built from the film's `CUES` (`opening`, `topic`, `recall`, `reveal`, `ending`), then `scripts/mix.py` for the final level (-16.5 LUFS, true peak under -1 dB).
- Quiet beds under content, the thinnest texture during recall, one clean pitched sound at a reveal. Never noise, hiss or room tone.
- The generator returns the credits text for the samples. Pass it to `deliver.py`.

## 5. Delivering

```bash
python3 .claude/skills/engram-quest-episodic-review/scripts/deliver.py --final $STUDIO/projects/<id>/final.mp4 --poster $STUDIO/projects/<id>/poster.jpg \
  --id <id> --title "<title>" --style episodic-map --vault . --period 2026-10 --length <tier> \
  --topics-json $STUDIO/projects/<id>/topics.json --credits "<credits>" [--request-id <id>] [--not-taken "A,B"]
```

- It compresses to the vault's video rule (H.264, CRF 26, at most 95 MB), copies the poster and adds or replaces the entry in `engram-quest/videos/episodic-recall/meta.json`.
- `topics.json` is the chapter list with `topicId` on each chapter, so a card that fails can open the right passage.
- Only the final file goes into the vault. Frames, intermediate renders and the studio stay outside.
- Render with a fast encoder preset (`X264_PRESET=veryfast`); `deliver.py` encodes again.

## 6. Where cost goes, and what to reuse

| Cost | Lever |
|---|---|
| Reading notes (the largest token cost) | topic cache; read only what changed |
| Designing a film | the skeleton and the plan first; patterns for the common shapes |
| Rendering | holds captured once; no 3D; fast preset for the intermediate |
| Redoing | stills and the reading report before the full render |
| Anything that does not help understanding or recall | do not make it |

After each film, keep what proved itself: a new pattern goes into `patterns.js`, a new mistake into `06-pitfalls.md`.
