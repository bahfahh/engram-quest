# 07 Voice and language

## 1. Voices (edge-tts through `voice.py`)

| Role | Chinese films (zh-TW) | English films |
|---|---|---|
| Teacher (Professor Bao 包老師) | `zh-TW-YunJheNeural`, rate +4%, pitch +0Hz, speaker `teacher` (male; fails often — voice.py synthesises in parallel and retries) | `en-US-AndrewMultilingualNeural`, rate +0%, pitch +0Hz, speaker `teacher` |
| Student (Taro 芋圓, owns the project) | `zh-TW-HsiaoYuNeural`, rate +8%, pitch +20Hz, speaker `student` | `en-US-AvaMultilingualNeural`, rate +6%, pitch +10Hz, speaker `student` |
| Single narrator (no dialogue) | `zh-TW-HsiaoChenNeural` | |

When the learner picked another teacher (`11-teachers.md`), take that teacher's voice and register from the registry; the student takes a voice different from the teacher's. **`zh-TW-HsiaoYuNeural` is the student's voice in every film; no teacher uses it**. 

**Voice policy:**

| | Student | Teachers |
|---|---|---|
| Chinese (zh-TW) | HsiaoYu (reserved) | **Taiwan voices only**: female teachers HsiaoChen (Luna, Iris, Nova), male teachers YunJhe (Nico, 包老師); exception: Alden = fr-FR-VivienneMultilingualNeural −6 % (a multilingual voice reading Chinese; not a Taiwan accent). Teachers sharing a voice differ by rate, pitch, pace and wording; a film has one teacher, so sharing never collides. No zh-CN and no multilingual voices reading Chinese. |
| English (en-US) | Ava (reserved) | One voice each: Luna Aria, Iris Jenny, Nova Emma, Nico Brian, Alden Michelle, 包老師 Andrew |
| Other languages | add `studentVoices.<lang>` | add `voice.<lang>` per teacher from `edge-tts --list-voices`; test with ASR and re-measure the punctuation pauses (§1b) before use. `resolve.cjs` returns no voice and a note until then. |

**How a narration is put together (`voice.py`)**: `script.json` lines carry `speaker` → `voices` map (voice, rate, pitch), optional per-line `rate`/`pitch`, `pauseAfter`; each line is synthesised on its own (cached by text + voice), trimmed, and joined with the gaps → `narration.wav`, `timeline.json` (line and **word** timings from edge-tts WordBoundary: lip sync `S.mouth`, `T.word()` cues, subtitles), `subtitles.vtt`. Another engine (e.g. Gemini TTS) can replace the synthesis step as long as it returns word timings or `asr.py` (faster-whisper) aligns them afterwards; see the lab notebook's to-do list. Teacher names are spoken with the registry's `say` (Chinese transliteration) when mid-sentence; subtitles show the name.

- Never use zh-CN voices for Taiwanese Chinese films.
- Try 3–4 lines first to set the range of rate/pitch variation. English voices react more to pitch; use a smaller range than in Chinese.
- edge-tts voices are "reading" voices: flat delivery and accent are limits of the engine. Real improvement needs an "acting" engine (API key or GPU) and a blind listening test first.

## 1b. Rhythm: write for the ear (measured 2026-11-02)

edge-tts accepts no custom SSML (one rate/pitch/volume per request; [edge-tts README](https://github.com/rany2/edge-tts)), so rhythm comes from **how lines are cut** and from `pauseAfter`. Measured pauses inside one request (zh-TW HsiaoYu, rate +10%, silencedetect −38 dB):

| Inside one line | Pause |
|---|---|
| ，：、 | 0.20–0.27 s |
| 。！ | ≈ 0.83 s |
| ？ | ≈ 1.06 s |
| a space next to an English word | ≈ 0.12 s |

So two sentences in one line leave a near one-second hole: that is the "strange pause".

1. **One sentence per line.** Gaps come from `pauseAfter` / `defaultPause` (voice.py trims each clip, so they are true gaps; about 0.1 s of the clip's own tail remains). Lively 0.06–0.18, normal 0.25–0.35, unhurried 0.4. Each teacher's `pace.defaultPause` is in the registry (`11-teachers.md`).
2. **Commas only at phrase boundaries** (Chinese TTS pauses by phrase structure); never inside a phrase (「Kubernetes 就是，你說」). No colons in narration: use a comma or a new line.
3. **English terms without spaces in `text`** (「Kubernetes就是」); keep the spaces in `sub`.
4. **Intonation per line**: a question line +4 to +14 Hz; the punch line a little faster; the learner-facing close a little higher.
5. **Energy is form, not adjectives**: short sentences, open on a scene, a quicker-than-neutral rate and tight gaps. Nova's rate is −5 % (1.12 × 0.85 ≈ 0.95), keep her `defaultPause` 0.1; her key line goes about 4 points slower than her base (−9 %). Per-line `rate` is absolute, not relative to the voice's base, so a key-line `−6 %` written for the old +12 % base would now be *faster* than the base.
5b. **Sound like a master teacher, not a slow student**:
   - Precise words, no filler: cut 就是／那個／其實／的那個／喔／啦／對吧, cut 「好，」 openers, cut cute phrasing (「來救你的！」「長出來了」「繼續睡就好」). **Exception (experiment 17, §1b-3):** a few spoken markers per segment are wanted, not filler; the cut-list above is about stacking them.
   - One idea per sentence, declarative and confident; a rhetorical question only if the answer follows at once.
   - Rhythm of a good lecturer: setup lines fast with tight gaps (0.1–0.18 s); **one beat (≈0.3 s gap) before the key line**; the key line short, a little slower (−4 to −6 %), and last.
   - No comma after a short adverbial (「以前你得……」 not 「以前，你得……」): each comma costs ≈0.3 s.
   - Pitch flat or slightly down for statements (−2 to −4 Hz); raise it only on a real question. Raised pitch on every line sounds childish.
   - Example (Nova, gaps 0.12 / 0.12 / 0.3): 「凌晨三點伺服器掛了。」/ 「以前你得爬起來重開。」/ 「現在Kubernetes會先發現，再自己補上。」/ 「你的工作從救火變成定規則。」
6. **Never say the method aloud** (「先講通」「換個角度想」); lead into questions from the previous sentence (`11-teachers.md` §3).
7. Check: `ffmpeg -i narration.wav -af silencedetect=noise=-38dB:d=0.06 -f null -` — inside a teacher's turn no gap should exceed ≈ 0.5 s unless it is a planned think pause.

## 1b-2. Do not sound like an AI (experiment 16, 2026-11-04)


**Cause (ours, not the voice).** §1b 5b (「cut filler, short sentences, confident, no cute phrasing」) and the teachers' `beats` ("短句") were followed to the extreme. Lessons 6–7 averaged 17–18 characters per teacher line (lessons 1–5: 28–33), and the lines became telegraphic: subject and verb dropped, slogans in parallel, aphorisms. "Precise" is not "clipped": a smart person still speaks whole sentences.

**What the Chinese de-AI writing guides flag** (op7418/humanizer-zh and similar; all target Simplified Chinese, none is Taiwan-specific; mapped here by judgement): negative parallelism (「不是A，而是B」「不只…」), fixed triplets, quotable closers (「金句」), abstract "important/key" vocabulary, filler openers, synonym cycling, a punchy slogan where a plain statement would do. Spoken-writing guides add: short simple sentences, familiar words, you/I, active voice, no parentheses or long attributive clauses.

**Smells and fixes** (`scripts/studio/aiscan.py <script.json>` flags them; advisory, decide by ear):
1. **Slogan pair with a dropped subject** (「超過就長，不到就掉」「用量要多兩百倍，營收才持平」). Say who does what, in everyday verbs: 「用量剛好多兩百倍，營收就跟原來一樣。比兩百倍多，營收就變多；比兩百倍少，營收就變少。」
2. **Aphorism lines** (「賺到，不等於收到」「需求，不等於留下來的錢」「不代表貴，也不代表便宜」). At most one per lesson, only for the one-liner. Everywhere else state the fact: 「公司帳上賺了錢，不見得馬上收到現金。」
3. **Negative contrast** (「市場比的，不是賺多少，是比預期多或少」). Say the positive half only: 「市場在看的，是實際數字比預期好還是差。」
4. **Abstract written words**: 留下來的錢、這一環、落在…之間、緩衝、撐得住、吃掉、由此推論、到底、憑什麼. Replace with what a person says: 「每賣一百元，最後還剩幾元」「這個行業裡每一家公司」.
5. **Result verbs standing alone** (長／掉／漲／跌 as the whole predicate). Name the subject: 「營收變多／變少」「股價漲／跌」.
6. **Definition by comma** (「營收，是…」「毛利率，是…」 ten times in a row reads as a glossary). Vary: 「營收就是公司一年賣東西收到的錢。」, or let the picture define it and say only the plain sentence once.
7. **Same sentence shape four times** (「重點一，…」「第一問，…」「一，…二，…」). Once is a structure; four in a row is a template. Vary the openers; the recap card carries the numbering.
8. **Comma inside a phrase** (「差在，是不是比預期更好」「能確定的是，市場看的，不只…」): rewrite the sentence so it needs no comma.

**Checks before voicing.**
- Read each teacher line aloud once as if telling a friend over coffee; a line you would never say aloud, or that needs the screen to make sense, is rewritten. Every explanation line has a subject and a verb.
- Average teacher line ≥ 22 characters; only the key line and the learner's replies may be very short. **Promo films (length cap 4:30) may sit at 17–19**: the length cap wins, `aiscan.py` should only remind (experiment 17, three producers). `aiscan.py` prints the average and the flagged lines; flagged above ~12% of lines, rewrite before voicing.
- Add a **text-only reader** to the silent review: someone who sees only SCRIPT.md (no pictures) lists every line whose meaning is unclear or that sounds like a slogan. Do this before the TTS pass; it is far cheaper than a re-render.
- Numbers stay exact; "plainer" never means dropping the unit, the period or the comparison basis.

## 1b-3. Chinese narration that sounds spoken, not read (experiment 17, 2026-11-08)

Findings (full data and audio: lab `實驗17-宣傳片（大眾題）/00-紀錄.md` §10):

**Why Chinese was worse than the English of the same film (measured).** (1) The rules above are almost all "do not": they remove spoken markers and leave written Chinese; the English section gives a positive reference. Chinese lines had 0–3 particles per film, English 12–22 contractions. (2) Translationese: 「它」 28 times in one film, 「你想問的是，…」, cleft 「替它動手的，是旁邊的程式」, English appositives translated word for word (「叫做電壓，是把電推過去的力量」 vs "the push"), slogan pairs. (3) Synthesis: every Chinese comma pauses ≈ 0.3 s and no punctuation pauses 0 s (no middle value; no SSML in edge-tts), each line is synthesised alone so every line restarts its pitch and falls at the end.

**Confirmed by ear (A→B→E→F, same 60 s passage, one change at a time):**
1. **Write the spoken script, not the subtitle.** Put the topic first and drop the subject when it is clear; 「它」 only when nothing else is clear; a definition becomes a sentence a person says (「這一個一個點就叫像素」), not 「X 叫做 Y，是…的 Z」. Spoken markers (呢、啊、喔、對啊、你想想) one or two per segment, never one per line. `text` (voiced) and `sub` (subtitle) are two different strings.
2. **Fewer commas.** A comma only where a person would breathe; two short sentences become two lines.
3. **Synthesise a paragraph at a time, not a line at a time** (3–8 consecutive sentences of one speaker in one request), then trim any silence > 0.5 s to ≈ 0.32 s and put planned gaps back (0.15 between speakers, 0.55 before a key sentence). Not in `voice.py` yet; done by hand for the samples (`feature/feature-2026-11-08-paragraph-synthesis.md`).
4. **Calm passion lives in the content, not in speed**: a detail only someone who studied it would notice, said plainly with its surprise (「整個『點一下』，最後就只是兩個數字」); one step of consequence beyond "how it works" (「AI 在小照片上差一格，換回你的螢幕就差兩格」); the number first, then the plainest conclusion; long and short sentences alternating; a longer beat before the key sentence, the key sentence a little slower. **Never invent a personal history or feeling** (「我研究十年了」「我每次看都很感動」); the content must be interesting before the teacher says it is.

5. **Guide phrases** that announce where the talk turns (「那我們來看第二部分」「那實際上會怎麼跑呢」) help a little and are said a bit faster than the content around them. They are not the main cause of "not like a good teacher": that was structural (the narration repeated the picture and nothing carried the viewer forward) and is handled in `03-adapter-pattern.md` §1.4, judged per segment.

**Still open:** whether the teacher anticipating where the learner gets stuck, saying what is *not* known, or working a mistake out on screen adds to `03-adapter-pattern.md` §1.4. Needs a sample, not a rule.

## 1c. Voice engine: edge-tts by default; an AI voice only when chosen

**Decide while planning (step 1), with `resolve.cjs` → `engine`:**

| Situation | `engine` | What you do |
|---|---|---|
| No AI voice key | `id: edge`, `askUser: false` | Use edge-tts. Do not ask. |
| Key(s) present and the user fixed a voice (named it in the request or a standing rule → `--engine <id>`; `VOICE_ENGINE`; `settings.json` `voice.engine`) | that id, `askUser: false` | Use it. Do not ask. |
| Key(s) present, nothing fixed | `id: null`, `askUser: true`, `options` | **Ask once, in the single start-up question** (with the goal question if there is one): list `options` with their cost (edge-tts free; Gemini Flash about NT$2 per lesson; Azure about NT$0.6), recommend the one marked `recommended`. Then re-run `resolve.cjs --engine <answer>`. Unattended run with nobody to answer → edge-tts, noted in `NOTES.md`. |

The answer applies to the whole series: write `"engine": "<id>"` into every lesson's `script.json`. This is the only voice question, asked only at the start; never mid-way (`SKILL.md` rule 0).

**What `voice.py` does with it:**
1. `"engine"` in `script.json` (or `VOICE_ENGINE`) picks the engine; unset or `auto` always means edge-tts (no cost by surprise).
2. Gemini TTS (`gemini-3.8-flash-tts`, override `GEMINI_TTS_MODEL`; key `GEMINI_API_KEY`), Azure Speech (same voice names as edge-tts; `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`), or any engine through `TTS_CUSTOM_CMD`, a shell template with `{voice} {style} {rate} {pitch} {text_file} {out}` that writes an audio file.
3. Per-engine settings ride inside each voice: `{"voice", "rate", "pitch", "gemini": {"voice", "style"}, "azure": {"voice"}, "custom": {"voice", "style"}}`; `resolve.cjs` fills them from the registry (`voice.gemini`, `studentVoices.gemini`).
4. Engines without word timings are aligned with faster-whisper onto the script (one CJK character or one Latin word per entry), so lip sync, `T.word()` and subtitles keep working.
5. Every AI clip is checked (the ASR must hear the text, compared by sound with Traditional/Simplified and digits normalised: ≥ 70 %, or ≥ 50 % with a plausible length). **If any line still fails after retries, the whole narration is redone with edge-tts**, reason printed: a film never mixes engines. Copy the `voice engine:` line into `NOTES.md`.
6. Keys live in environment variables only, never in the vault, the plugin or `script.json`. Where people set them: Claude Code cloud → the environment's settings (session title bar → environment → Edit → Network secrets, or an environment variable; new sessions pick it up); local Claude Code → `"env": {"GEMINI_API_KEY": "…"}` in the user-level `~/.claude/settings.json` (outside the vault) or the shell profile; Gemini CLI users who already set `GEMINI_API_KEY` are detected as having a key (and asked).
7. Verified 2026-11-02 without real keys: no key → edge; invalid Gemini key → fallback to edge; a custom engine without word timings → aligned and used; a custom engine that drops two thirds of each line → rejected, fallback to edge. The Gemini and Azure calls follow the official REST formats but have not run with a real key; the `voice.gemini` presets are defaults to be checked by ear (gender, Taiwan accent).
8. Cost (real lesson length ≈ 280 s of speech): Gemini Flash ≈ NT$2 per lesson (an 8-lesson course ≈ NT$16–21), Flash-Lite ≈ NT$1.3, Azure ≈ NT$0.6; Gemini's free tier is free within its rate limits; Gemini prices double from 2027-01-01.

## 2. Chinese films

- English UI terms: **say them in Chinese, write them in English on screen** — least likely to be mispronounced.
- First appearance of a term: full English name + Chinese + one plain sentence. Example: 「D7 = Day 7 Retention（第 7 天留存）：使用者安裝 App 後，到了第 7 天，還有多少人回來開啟 App。」
- Check polyphonic characters (破音字) by ear.

## 3. English films

- **Rewrite, don't translate line by line.** Short sentences, spoken rhythm, real reactions. Reference feel: Cleo Abram, Kurzgesagt, Google Cloud Tech explainers — warm, clear, one idea at a time.
- All on-screen text in English. English runs about twice as long as Chinese: re-lay out, don't just swap strings. Mindmap nodes ≤ 5 words.
- Expand every abbreviation on screen at first appearance (CAC, CPM, CTA, D7 …).
- Money: the first time, say the local amount once with a rough USD conversion ("fifteen hundred Taiwan dollars, about fifty US dollars"); afterwards only write it on screen — TTS reads "NT$215" slowly.
- If TTS stumbles on an abbreviation, say the full name ("return on ad spend" for ROAS). Never use phonetic spellings in the narration text; keep the correct form in `sub`.
- Fonts: interface Inter; chalk Kalam 700; clay props Nunito 800 (`lib/classroom/EN.md`).

## 4. Pronunciation checks

- `python3 asr.py projects/<id>/narration.wav` (Chinese) / `ASR_LANG=en python3 asr.py …` (English) — spot-check abbreviations and hard lines only; ASR is slow.
- Keep the ASR prompt **neutral**: listing the abbreviations biases it into hearing them correctly.
- ASR cannot tell a mispronunciation from a mis-hearing. English terms and polyphonic characters need a **human ear**: list the suspect lines for the user at delivery.
- **Make that list playable.** Cut each suspect line out of the delivered film (the `.vtt` cue times, ±0.35 s) as a short mp3 and put them on one Artifact page: number, the word, how it should sound, the sentence with the word marked, a player. The user answers with numbers (「7、9 錯」). Experiment 18c: 15 lines checked in one pass; all acceptable.
- **CamelCase product names run together.** 「PageIndex」 came out as one fast word. For a name the learner must catch, write it with a space in `text` (「Page Index」), keep the real spelling in `sub`, and leave a short pause after it.
- When a reading is wrong: write `text` the way it should be read, keep the correct spelling in `sub`.
