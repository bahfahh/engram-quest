# Music for recall films (`scripts/music/`)

Composes the background score of a recall film. `pick_music.py` picks the film's theme (mood, seed, arrangement, key) and the short pieces for recall moments; `music_gen.py` composes by rule and plays the result on real instrument samples (48 kHz stereo wav). Melody, chord progression, key and tempo differ from film to film. It needs Python 3 with numpy and scipy, and ffmpeg; `qa_music.py` also needs matplotlib. The samples ship in `samples/`.

**Hard rule: background sound is always pitched music, never noise.** No white noise, tape hiss, room tone, motor sounds or noise-based whooshes.

- One theme for the whole film, with a melody, mixed quietly. See "Picking" below.
- A recall countdown is one suspended chord (`thinking`); a reveal is one clean pitched sound (`chime`).
- No dead air between segments: every cue rings on 2 s under the fade-in of the next one.
- A sound effect, if one is added, is also a clean pitched sound (a bell, one pluck).
- The reverb impulse response is computed from decaying noise, but it is only convolved with the notes: no note, no sound.

## Quick use

```bash
cd scripts/music        # inside the skill folder
# one piece (nice keeps a render running in the background responsive)
nice -n 10 python3 -I music_gen.py --mood warm --seed 7 --dur 70 --out out/warm.wav --mp3
nice -n 10 python3 -I music_gen.py --mood reflective --seed 3 --dur 40 --density bed --key Eb --out out/topic.wav
nice -n 10 python3 -I music_gen.py --mood thinking --seed 5 --dur 8 --key Eb --out out/recall.wav    # recall countdown
nice -n 10 python3 -I music_gen.py --mood chime --seed 1 --key Eb --out out/reveal.wav               # reveal
python3 -I music_gen.py --mood curious --seed 3 --dur 70 --plan      # plan only (key, tempo, form, chord chart); no audio
python3 -I music_gen.py --list

# pick for a situation (prints JSON; --render writes audio; --dry-run does not write used.json)
python3 -I pick_music.py --film nov-map --segment opening --dur 20 --render out/
# a whole film: cue sheet -> one wav per cue + score.wav on the film's timeline + cues.json (with credits)
python3 -I pick_music.py --cues examples/cues_map.json --render out/map-example/

sh make_demos.sh                                   # listening demos in demo/ (every mood + the whole-film example)
nice -n 10 python3 -I qa_music.py demo/wav/*.wav   # one png per file + qa_report.md / .json
python3 -I qa_music.py --target -16.5 --out-dir <dir> final_mix.wav   # check a finished mix against its own loudness target
python3 -I tools/fetch_samples.py                  # only if samples/ is missing (downloads from raw.githubusercontent.com)
```

`music_gen.py` writes `<name>.wav` (48 kHz stereo, 24-bit PCM), `<name>.notes.tsv` (every note: time, bar, beat, layer, instrument, pitch, velocity, length, chord, in key or not, chord tone or not) and `<name>.json` (plan, chord chart, loudness, credits). Options: `--mood`, `--seed`, `--dur` (seconds), `--density full|light|bed`, `--key`, `--lufs`, `--open-tonic` (the first chord is I), `--mp3`, `--plan`, `--list`.

**Where state lives (outside the skill folder).** Decoded samples are cached in `~/.cache/engram-episodic-music/` (about 260 MB, safe to delete; `MUSIC_CACHE_DIR` overrides). The picks of earlier films are recorded in `~/.local/state/engram-episodic-music/used.json` (`MUSIC_USED` overrides). Point `MUSIC_USED` at one file kept with your films, for example `engram-quest/episodic-review/music-used.json` in the vault, so that films do not repeat each other.

## Files

| Path | Content |
|---|---|
| `music_gen.py` | Generator: composition (chords, voice leading, melody, accompaniment patterns, humanised timing, tempo curve), sample playback (transposition, loops, velocity), reverb, mastering (EQ, loudness, true peak) |
| `pick_music.py` | Picker: the film's theme and the recall pieces; `used.json`; cue sheet -> `score.wav` |
| `qa_music.py` | Measured quality check (loudness, true peak, spectrum, noise, clicks, note table) and a waveform + spectrogram png per file |
| `make_demos.sh` | Regenerates `demo/` (not shipped): mp3s, pngs, QA reports and the whole-film example |
| `samples/salamander/*.ogg` | Salamander Grand Piano, A1 to C7 in minor thirds (22 files) |
| `samples/fluidr3_gm/<instrument>/*.ogg` | FluidR3_GM: string_ensemble_1, pad_2_warm, music_box, celesta, glockenspiel, vibraphone, electric_piano_1, marimba, orchestral_harp |
| `tools/fetch_samples.py` | Downloads the samples (only sources that allow redistribution and commercial use) |
| `tools/check_pitch.py` | Measures the real pitch of every sample (octave + cents) and writes `tools/pitch_check.json` |
| `licenses/` | README / LICENSE texts copied from the source repositories |
| `examples/cues_map.json` | The cue sheet the template's example film writes (`render_stage.cjs --data`): about 6.5 minutes, 8 cues, 2 recall marks |

## Moods

| Mood | Used for | Instrumentation | Tempo, metre | Harmony | Default LUFS |
|---|---|---|---|---|---|
| `warm` | The theme of every film | Broken piano chords, three long string voices and a string bass; piano melody | 65–75 bpm, 4/4 | Major; maj7, add9, stepwise bass (I/3, V/3); sometimes a borrowed iv | -20 |
| `curious` | Not picked for films; available in `music_gen.py` | Syncopated electric-piano chords, plucked harp bass, marimba melody (vibraphone in the minor section) | 80–90 bpm, 4/4 | Major sections alternate with the relative minor (i–bVI–bIII–bVII); no diminished chords, no suspense | -20 |
| `reflective` | Not picked for films; available in `music_gen.py` | Slow broken piano chords, music-box melody (piano in the contrasting section), a faint warm pad, a reversed-reverb breath where phrases meet | 55–65 bpm, 3/4 | Major; IV–iv–I, vi–IV, maj7 | -20 |
| `bright` | Not picked for films (an ending is the theme's return); available in `music_gen.py` | Rising broken piano chords, piano melody, glockenspiel (doubling, a run into the last chord), light strings later on | 76–84 bpm, 4/4 | Major; I–V–vi–IV, IV–V–I; each phrase higher than the last | -20 |
| `thinking` | Recall and quiz segments | Long warm-pad chords, piano bass, an occasional high piano note with a celesta echo | 58–64 bpm, one chord per 2 bars | Iadd9, vi7, IVmaj7, ends unresolved on V9sus4 (or IVmaj7); under 16 s it is one chord that dissolves | -28 |
| `chime` | The reveal, and each recall mark | One of three by seed: celesta + glockenspiel, music box, harp pluck + vibraphone; a faint tonic pad underneath | – | Tonic chord (resolves the V9sus4 of the recall) | -24 |

`--density`: `full` is the whole arrangement at -20 LUFS; `light` has a sparser melody and a lighter accompaniment at -23; `bed` slows the accompaniment to quarter notes or longer, usually without a melody, at -26. A film's theme is always composed `full` and only its level changes; `thinking` and `chime` keep their own level. `--lufs` overrides the target.

Every piece is built from 4-bar phrases (an optional intro, antecedent and consequent phrases, a contrasting section, a tag, a held final chord) and stays in its key; the only out-of-key notes are the borrowed iv, marked `borrowed` in the note table. It fades in over at most 1.5 s (not the chime), fades out to silence, and is mastered to the loudness target with the true peak under -1 dBTP.

## Picking (`pick_music.py`)

**One theme for the whole film.** A long film with no narration needs a score that is heard as a piece of music, so the body carries the melody instead of a bed. `opening`, `overview`, `topic`, `closure` and `ending` are the same composition: `warm`, full arrangement, one seed (never the previous film's), one key, one tempo. The opening and ending play at -20 LUFS and the body 3 dB lower. Consecutive cues of the same body segment are merged, so the body is one continuous piece. `marks` in the cue sheet (recall countdowns, `{"start", "dur"}`) make the score step back 9 dB and keep going, and place one chime at the reveal. `render_stage.cjs --data` writes such a cue sheet. The viewer is reading, so mix these films quietly: `mix.py --lufs -25 --air 3`.

| `--segment` | Music | Density |
|---|---|---|
| `opening`, `ending` | the theme | full, -20 LUFS |
| `overview`, `topic`, `closure` | the theme (`closure` starts on I) | full, 3 dB lower |
| `recall`, `quiz` | thinking | bed |
| `reveal` | 6 s or shorter: chime (full); longer: a phrase of the theme's mood, starting on I (light) | full / light |

- **Random within a mood.** `seed = sha256("film:segment:None:salt") XOR 32 random bits` (the theme uses the segment name `theme`; `None` keeps the seeds of earlier films; the salt counts up past seeds already used), so the same situation sounds different in every film; `--deterministic` drops the random part.
- **One key per film.** Neighbouring cues overlap by `--overlap` seconds (default 2), and a shared key keeps them from clashing. A recall rests on V9sus4 and the reveal or closure starts on I: the question hangs, the answer resolves it.
- **No repeats of the previous film** (`used.json`). Its theme seed, its key and every (mood, seed) pair it used are avoided. Within one film a (mood, seed) pair is used once, except the theme, which is reused on purpose.
- **Cue sheet.** `{"film", "style": "map", "duration", "cues": [{"segment", "start", "dur"}], "marks"?: [{"start", "dur"}]}`. `--render` writes one wav per cue, places them at `start` in `score.wav` (as long as the film), and writes `cues.json` (picks + credits) and `score.json`. Narration, sound effects and the final level are mixed afterwards (`mix.py`).

## Quality check (`qa_music.py`)

Everything is measured; nothing is judged by ear, so listen to the result before you publish a film. A file is flagged when: loudness is more than 0.5 LU from its target or the true peak is above -1 dBTP; energy below 40 Hz is above -30 dB of the total (rumble); 5–10 kHz is above -16 dB, above 10 kHz is above -26 dB, or 2–5 kHz is above -8 dB (harsh); a 1/3-octave band stands more than 6 dB above its neighbours and is itself above -24 dB; more than 5% of frames are noise-like between 2 and 16 kHz (hiss); there is a click or sample jump away from any note onset; the last 0.3 s is above -60 dBFS; more than 2 s inside the piece stays under -50 dBFS (dead air); or the note table shows an out-of-key note, more than 6 pitch classes at once, a melody with under 45% steps, a leap over a major sixth, or a non-chord tone on a strong beat.

## Limits

- Samples have one velocity layer (velocity is modelled with level and a low-pass filter). Bell-like samples last about 3 s; longer notes fade at the sample's end (`truncated_notes` in the `.json`). Long string and pad notes are crossfaded loops.
- Composition is rule-based: each mood draws from a fixed set of phrases, so pieces over about 3 minutes start to repeat, and there is no modulation.
- The score follows the cue times only; it does not hit single on-screen events.

## Licences and credits

Only samples whose licence allows redistribution and commercial use, with attribution. The source texts are in `licenses/`.

| Source | Author | Licence |
|---|---|---|
| Salamander Grand Piano V3, the `.ogg` set from the Tone.js audio repository (`salamander/`) | Alexander Holm | CC BY 3.0 |
| FluidR3_GM SoundFont | Frank Wen | MIT |
| Per-note renders of FluidR3_GM from midi-js-soundfonts (`FluidR3_GM/<instrument>-ogg.js`) | Benjamin Gleitzman | CC BY 3.0 (the repository's code: MIT) |

MusyngKite and FatBoy from the same repository are CC BY-SA 3.0 (share-alike) and are not used. Paste these lines into the film's credits; the `credits` field of `pick_music.py` and the `.json` of `music_gen.py` list the ones that apply:

```
Music: original background score generated for this video (music_gen.py, procedural composition).
Piano samples: "Salamander Grand Piano V3" by Alexander Holm, licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); sample set via github.com/Tonejs/audio.
Instrument samples: FluidR3_GM SoundFont by Frank Wen, Copyright (c) 2000-2002, 2008 (MIT License); per-note renders from "midi-js-soundfonts" by Benjamin Gleitzman, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/us/).
```

The MIT licence asks for its copyright and permission notice to accompany copies of the software. A film is not a copy of the SoundFont, and the credit line above names the author and licence; to be on the safe side, also keep the MIT text from `licenses/` in the film's description or project folder.
