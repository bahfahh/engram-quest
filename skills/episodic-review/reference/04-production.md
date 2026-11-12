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
- A month overview (long tier) is built with `scripts/month_film.py` (§2). With 14 topics it runs about ten minutes, most of it the quick questions; cut topics from the questions before cutting links from the map.
- Depth before breadth: a shorter film takes fewer skeleton questions, not shallower chapters.
- **Aiming at a length.** `--data` prints the seconds of every part. Measured on the template: opening 40-50 s (with the history line), skeleton about 20 s, relation map 50-90 s, recall 60-90 s, close 40-50 s, so about four minutes before any chapter; a chapter is 50-130 s, a beat 25-60 s. A film of two chapters therefore lands near seven minutes. To go shorter, drop parts whole (the history in the opening, the links out, the areas in the close, a second new case) before thinning a chapter.
- Report the topics not filmed. They are the candidates next time and they still have their cards.

Reference point, one deep topic (about 10 minutes, 9 chapters): 14,232 frames of which 4,875 were captured, 4 minutes on 4 CPU cores. The time ranges in `length.json` predate this structure and have not been re-measured; treat them as loose.

## 2. Building

```bash
STUDIO=<a work folder outside the vault>
mkdir -p $STUDIO/projects
cp -r .claude/skills/engram-quest-episodic-review/scripts/studio/. $STUDIO/ && (cd $STUDIO && npm install)
cp -r .claude/skills/engram-quest-episodic-review/templates/film $STUDIO/projects/<id>
cd $STUDIO
node render_stage.cjs projects/<id> --film gallery --stills auto   # one still of each pattern the example does not use
node render_stage.cjs projects/<id> --data                         # length of every part, reading shortfalls; writes film-data.json and music-cues.json
node render_stage.cjs projects/<id> --stills auto                  # a still at each fullest moment (or --stills 4,30,95)
node render_stage.cjs projects/<id> --stills auto --notext         # the same stills with the words hidden
X264_PRESET=veryfast node render_stage.cjs projects/<id> --poster 30 --noaudio --out silent.mp4
```

The renderer needs `playwright` with Chromium, `ffmpeg` and `node`. Cloud sessions have them; do not add playwright to the studio's `package.json` there (a second copy does not find the installed browser). On a machine without it: `npm i playwright && npx playwright install chromium`. `scripts/doctor.py` reports what is missing.

The template:

| File | Role |
|---|---|
| `engine.js` | a small timeline. Elements declare when they are on screen (`on`, `off`, `dim`), lines draw themselves (`line`), `fn` is for custom per-frame work. `renderAt(t)` only writes inline styles. Also reports reading-time shortfalls and the fullest moments |
| `parts.js` | pieces: chapter container, header, caption, nodes, labelled lines, cards, chat bubbles, rows, tags, countdown ring, an embedded figure; the palette |
| `patterns.js` | whole presentations driven by data. Chapter level: `opening`, `skeleton`, `chapter`, `relationMap`, `recall`, `closing`. Beats inside a chapter: `sortInto`, `facets`, `table`, `optionCards`, `ladder`, `lanes`, `bars`, `axisMap`, `spans`, `figure`. Helpers for your own beats: `hold`, `clear`, `colour`, `rt` |
| `look.css` | the look |
| `scene.html` | loads the film, wires the chrome (path, chapter, skeleton strip), exposes `renderAt`, `DURATION`, `PARTS`, `CHAPTERS`, `CUES`, `PEAKS`, `ONSCREEN`, `READING` |
| `film.example.js` | a complete small film about an invented person's notes. Replace its content; keep or change its patterns |
| `film.gallery.js`, `figs/` | the patterns the example does not use, and a sample figure |

A month overview film is generated, not written:

```bash
python3 .claude/skills/engram-quest-episodic-review/scripts/month_film.py --pack engram-quest/episodic-review/packs/2026-10/pack.json \
  --links <work>/links.json --sentences <work>/sentences.json --out $STUDIO/projects/<id>/film.js
```

`sentences.json` is `{ "<topic id>|<topic id>": "the sentence that states the relation" }`, written after reading the linking notes. A link with no sentence is not drawn and is listed on the terminal.

Write a topic film as `film.js` in the project: it is a list of chapters, each a call to a pattern with data, or your own beat. The data shape of every pattern is in the comment above it in `patterns.js`. Put images the film embeds in the project's `figs/`.

Chapters with a `strip` number are the ones walked for a skeleton question: they light that question in the strip and are written to `CHAPTERS` with the topic id. A chapter may set `cue` to name its own music segment.

**One rule makes rendering cheap:** a frame is exactly what the page's HTML says after `renderAt(t)`. No canvas drawing, no CSS animation, no clocks. The renderer fingerprints the HTML and captures identical frames once. A review is mostly holds, so about a quarter to a third of the frames are captured. Continuous camera motion defeats this; prefer cuts, fades and things that move and then rest.

Reuse across runs is weak: the fingerprint covers the whole page, so an edit to a shared node recaptures everything. Settle the stylesheet before tuning content.

## 3. Checking before the full render

1. `READING` in `film-data.json` (also printed by `--data`): every text that is on screen for less than it needs. A text leaves when it, its card or its chapter leaves. Fix the timing or cut words.
   `--data` also prints layout problems: text outside the frame, and two texts whose boxes overlap, measured in the browser at each fullest moment and in the middle of every text's time on screen. Zero problems does not mean the frame is good, only that nothing collides.
2. `--stills auto` takes a still just before each beat is cleared and each chapter ends, when the frame is fullest. Look at them at full size: overlaps, text outside its card, type too small, an empty half of the frame. The patterns place things by rule; long names and long relations are where the rules run out.
3. Read the on-screen text in order as a stranger would (`onscreen` in `film-data.json`). Then look at the `--notext` stills. For medium and long tiers give both to a fresh agent that has not seen the notes.
4. Every question: was its answer on screen before it was asked?

Changing timing after the score is generated means regenerating the cue sheet; do it from `film-data.json` every time rather than by hand.

## 4. Sound

- No narration is assumed. Where speech synthesis is available it must say what the picture shows, in the film's language.
- Music comes from `scripts/music/` (procedural score on sampled instruments; it needs numpy and scipy). `--data` writes the cue sheet `music-cues.json` from the film's `CUES` and the recall countdowns (`marks`). It is rewritten on every run, so it cannot lag behind a retimed film.

  ```bash
  python3 -I .claude/skills/engram-quest-episodic-review/scripts/music/pick_music.py --cues projects/<id>/music-cues.json --render projects/<id>/audio/
  python3 .claude/skills/engram-quest-episodic-review/scripts/mix.py --score projects/<id>/audio/score.wav --duration <seconds> --out projects/<id>/narration.wav --lufs -25 --air 3
  node render_stage.cjs projects/<id> --poster 30        # picks up narration.wav
  ```
  The credits text is in `audio/cues.json`.
- **What the score is for.** A film of six to ten minutes with no narration needs something that is heard as a piece of music: light, slow, with a melody. The cue sheet's style `map` gives one theme for the whole film: the opening states the melody (piano over long strings), the body restates it and carries on as one continuous piece 3 dB lower, the ending brings it back. One key, one tempo, no new piece per chapter. A bed without melody under a long film is heard as no music at all.
- **Level.** The viewer is reading. `--lufs -25` is the level for a film with music only (measured: about -25 in the opening and ending, -28 in the body); `-16.5` is for a film with narration. `--air 3` lifts the top a little so a quiet score survives small speakers.
- **Recall.** During each countdown the music steps back about 9 dB and keeps going; one clean chime marks the reveal. Both come from the `marks` in the cue sheet (the `recall` pattern emits them; your own beat can call `cue('recall', t0, t1)`).
- Never noise, hiss or room tone. The picker's other styles (`rooms`, `board`, `rewind`) score a film piece by piece with beds under the content; they suit a film with narration, not these.
- Pass the credits text to `deliver.py`.

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
