# 07 Voice and language

Aim: a smart, warm teacher, one idea at a time, structure audible in the voice.

## 1. Voices (edge-tts through `voice.py`)

| Role | Chinese films (zh-TW) | English films |
|---|---|---|
| Teacher (the resolved teacher's `voices` from `resolve.cjs`; Nico by default; these are 包老師's, Pro) | `zh-TW-YunJheNeural`, rate +4%, pitch +0Hz, speaker `teacher` (male; fails often — voice.py synthesises in parallel and retries) | `en-US-AndrewMultilingualNeural`, rate +0%, pitch +0Hz, speaker `teacher` |
| Student (Taro 芋圓, owns the project) | `zh-TW-HsiaoYuNeural`, rate +8%, pitch +20Hz, speaker `student` | `en-US-AvaMultilingualNeural`, rate +6%, pitch +10Hz, speaker `student` |
| Single narrator (no dialogue) | `zh-TW-HsiaoChenNeural` | |

Take the resolved teacher's voice and register from the registry (`11-teachers.md` §2); the student's voice differs, so the viewer knows who speaks. **`zh-TW-HsiaoYuNeural` is the student's voice in every film; no teacher uses it**.

**Voice policy (the user's decision, 2026-11-02):**

| | Student | Teachers |
|---|---|---|
| Chinese (zh-TW) | HsiaoYu (reserved) | **Taiwan voices only** (the user's choice): female teachers HsiaoChen (Luna, Iris, Nova), male teachers YunJhe (Nico, 包老師); exception: Alden = fr-FR-VivienneMultilingualNeural −6 % (a multilingual voice reading Chinese; not a Taiwan accent). Teachers sharing a voice differ by rate, pitch, pace and wording; a film has one teacher, so no collision — except with an extra speaker such as the decision-maker (`05-presentation-methods.md` §3c): her voice has to differ from the teacher's (HsiaoChen is Luna's, Iris's and Nova's), or the student reads her line. No zh-CN, no other multilingual voices reading Chinese. |
| English (en-US) | Ava (reserved) | One voice each: Luna Aria, Iris Jenny, Nova Emma, Nico Brian, Alden Michelle, 包老師 Andrew |
| Other languages | add `studentVoices.<lang>` | add `voice.<lang>` per teacher from `edge-tts --list-voices`; test with ASR and re-measure the punctuation pauses (§1b) before use. `resolve.cjs` returns no voice and a note until then. |

**How a narration is put together (`voice.py`; pipeline contract)**: `script.json` lines carry `speaker` → `voices` map (voice, rate, pitch), optional per-line `rate`/`pitch`, `pauseAfter`; each line is synthesised on its own (cached by text + voice), trimmed, and joined with the gaps → `narration.wav`, `timeline.json` (line and **word** timings from edge-tts WordBoundary: lip sync `S.mouth`, `T.word()` cues, subtitles), `subtitles.vtt`. Another engine (e.g. Gemini TTS) can replace synthesis if it returns word timings or `asr.py` (faster-whisper) aligns them afterwards; see the lab notebook's to-do list. Teacher names are spoken with the registry's `say` (Chinese transliteration) when mid-sentence; subtitles show the name.

- Taiwanese Chinese films: zh-TW voices, not zh-CN (policy above).
- 3–4 trial lines set the rate/pitch range quickly. English voices react more to pitch; a smaller range than in Chinese sounded right.
- edge-tts voices are "reading" voices: flat delivery and accent are limits of the engine. Real improvement needs an "acting" engine (API key or GPU) and a blind listening test first.

## 1b. Rhythm: write for the ear (measured 2026-11-02)

Aim: livelier, quicker speech that guides, pauses where a person breathes. edge-tts accepts no custom SSML (one rate/pitch/volume per request; [edge-tts README](https://github.com/rany2/edge-tts)), so rhythm comes from **how lines are cut** and from `pauseAfter`. Measured pauses inside one request (zh-TW HsiaoYu, rate +10%, silencedetect −38 dB):

| Inside one line | Pause |
|---|---|
| ，：、 | 0.20–0.27 s |
| 。！ | ≈ 0.83 s |
| ？ | ≈ 1.06 s |
| a space next to an English word | ≈ 0.12 s |

So two sentences in one line leave a near one-second hole: that is the "strange pause".

1. **One idea per line.** Two full sentences in one `text` leave the ≈0.83 s hole above. When one idea takes two or three sentences, options that worked: separate lines with the same `group` (voice.py joins them into one sentence, §1b-4), or one sentence with commas. Gaps between lines come from `pauseAfter` / `defaultPause` / `gapBefore` (voice.py trims each clip, so they are true gaps; ≈0.1 s of tail remains). References: lively 0.06–0.18, normal 0.25–0.35, unhurried 0.4; §1b-4's layers help choose. Each teacher's `pace.defaultPause` is in the registry (`11-teachers.md`).
2. **Commas where a phrase ends.** Chinese TTS pauses by phrase structure, so a comma inside a phrase (「Kubernetes 就是，你說」) breaks it audibly. Colons in narration became a comma or a new line.
3. **English terms without spaces in `text`** (「Kubernetes就是」), since the space adds ≈0.12 s; keep the spaces in `sub`.
4. **Intonation per line**: a question line +4 to +14 Hz; the punch line a little faster; the learner-facing close a little higher.
5. **Energy comes from form, not adjectives**: short sentences, open on a scene, a quicker-than-neutral rate and tight gaps. Nova's rate is −5 % (1.12 × 0.85 ≈ 0.95), her `defaultPause` 0.1; her key line goes about 4 points slower than her base (−9 %). Pitfall: per-line `rate` is absolute, not relative to the base, so a key-line `−6 %` written for the old +12 % base became *faster* than the new one.
5b. **Sound like a master teacher, not a slow student**:
   - Precise words: stacked 就是／那個／其實／的那個／喔／啦／對吧, 「好，」 openers and cute phrasing (「來救你的！」「長出來了」「繼續睡就好」) sounded slow. **But (experiment 17, §1b-3):** a few spoken markers per segment are wanted; stacking was the problem.
   - One idea per sentence, declarative and confident; a rhetorical question works when its answer follows at once.
   - Rhythm of a good lecturer: setup lines fast with tight gaps (≈0.1–0.18 s); **a longer beat (≈0.6–0.9 s) before the key line** (§1b-4); the key line short, slower than the base (about −10 points), and last.
   - A comma after a short adverbial costs ≈0.3 s: 「以前你得……」 flows, 「以前，你得……」 stalls.
   - Statements flat or slightly down (−2 to −4 Hz), pitch up on a real question; raised on every line it sounded childish.
   - Example (Nova, gaps 0.12 / 0.12 / 0.3): 「凌晨三點伺服器掛了。」/ 「以前你得爬起來重開。」/ 「現在Kubernetes會先發現，再自己補上。」/ 「你的工作從救火變成定規則。」
6. **Let the method be felt, not announced.** Saying it aloud (「先講通」「換個角度想」) made Iris's sample sound strange; leading into the question from the previous sentence guides instead (`11-teachers.md` §3).
7. Check: `ffmpeg -i narration.wav -af silencedetect=noise=-38dB:d=0.06 -f null -` — inside a teacher's turn, unplanned gaps above ≈ 0.5 s are usually the strange pauses.

## 1b-2. Do not sound like an AI (experiment 16, 2026-11-04)


**Cause (ours, not the voice).** §1b 5b (「cut filler, short sentences, confident, no cute phrasing」) and the teachers' `beats` ("短句") were taken to the extreme. Lessons 6–7 averaged 17–18 characters per teacher line (lessons 1–5: 28–33): telegraphic, subject and verb dropped, slogans in parallel, aphorisms. "Precise" is not "clipped": a smart person still speaks whole sentences.

**What the Chinese de-AI writing guides flag** (op7418/humanizer-zh and similar; Simplified Chinese, none Taiwan-specific; mapped by judgement): negative parallelism (「不是A，而是B」「不只…」), fixed triplets, quotable closers (「金句」), abstract "important/key" vocabulary, filler openers, synonym cycling, a punchy slogan where a plain statement would do. Spoken-writing guides add: short simple sentences, familiar words, you/I, active voice, no parentheses or long attributive clauses.

**Smells and what helped** (`scripts/studio/aiscan.py <script.json>` flags them; the ear decides):
1. **Slogan pair with a dropped subject** (「超過就長，不到就掉」「用量要多兩百倍，營收才持平」). Saying who does what, in everyday verbs: 「用量剛好多兩百倍，營收就跟原來一樣。比兩百倍多，營收就變多；比兩百倍少，營收就變少。」
2. **Aphorism lines** (「賺到，不等於收到」「需求，不等於留下來的錢」「不代表貴，也不代表便宜」). One per lesson, saved for the one-liner, kept its weight; elsewhere the plain fact read better: 「公司帳上賺了錢，不見得馬上收到現金。」
3. **Negative contrast** (「市場比的，不是賺多少，是比預期多或少」). The positive half alone: 「市場在看的，是實際數字比預期好還是差。」
4. **Abstract written words**: 留下來的錢、這一環、落在…之間、緩衝、撐得住、吃掉、由此推論、到底、憑什麼. What a person says instead: 「每賣一百元，最後還剩幾元」「這個行業裡每一家公司」.
5. **Result verbs standing alone** (長／掉／漲／跌 as the whole predicate). Name the subject: 「營收變多／變少」「股價漲／跌」.
6. **Definition by comma** (「營收，是…」「毛利率，是…」 ten times in a row reads as a glossary). Vary: 「營收就是公司一年賣東西收到的錢。」, or let the picture define it and say only the plain sentence once.
7. **Same sentence shape four times** (「重點一，…」「第一問，…」「一，…二，…」). Once is a structure; four in a row is a template. Varied openers read better; the recap card carries the numbering.
8. **Comma inside a phrase** (「差在，是不是比預期更好」「能確定的是，市場看的，不只…」): rewriting the sentence so it needs no comma.

**Checks before voicing** (cheaper than a re-render):
- Read each teacher line aloud as if telling a friend over coffee; a line you would never say, or that needs the screen to make sense, is worth rewriting. Explanation lines with subject and verb sound like a person.
- Line length reference: lessons 1–5 averaged 28–33 characters per teacher line (natural), 6–7 averaged 17–18 (telegraphic); an average around 22+ has served. The key line, a deadpan line (§1b-3 point 7, the hook's dry line included) and the learner's replies are naturally very short. `aiscan.py` flags a dry line of ≤ 6 characters (「測你的運氣。」) as 極短斷句: it is intended and not counted toward the ~12 %. **Promo films (length cap 4:30) sat at 17–19** and passed; the cap matters more there, so `aiscan.py` only reminds (experiment 17, three producers). `aiscan.py` prints the average and flagged lines; above ~12 % flagged, rewriting before voicing paid off.
- A **text-only reader** in the silent review: someone seeing only SCRIPT.md (no pictures) lists each line that is unclear or sounds like a slogan.
- Numbers stay exact (truthfulness): "plainer" never drops the unit, the period or the comparison basis.

## 1b-3. Chinese narration that sounds spoken, not read (experiment 17, 2026-11-08)

Findings (full data and audio: lab `實驗17-宣傳片（大眾題）/00-紀錄.md` §10):

**Why Chinese was worse than the same film's English (measured).** (1) The guidance above was mostly "do not": it removed spoken markers and left written Chinese; the English section gives a positive reference. Chinese lines had 0–3 particles per film, English 12–22 contractions. (2) Translationese: 「它」 28 times in one film, 「你想問的是，…」, cleft 「替它動手的，是旁邊的程式」, English appositives translated word for word (「叫做電壓，是把電推過去的力量」 vs "the push"), slogan pairs. (3) Synthesis: a Chinese comma pauses ≈ 0.3 s, no punctuation 0 s (no middle value, no SSML); each line synthesised alone restarts its pitch and falls at the end.

**Confirmed by ear (A→B→E→F, same 60 s passage, one change at a time):**
1. **Write the spoken script, not the subtitle.** Topic first, subject dropped when it is clear; 「它」 when nothing else is clear; a definition as a sentence a person says (「這一個一個點就叫像素」), not 「X 叫做 Y，是…的 Z」. Spoken markers (呢、啊、喔、對啊、你想想): one or two per segment sounded natural; one per line becomes a tic. `text` (voiced) and `sub` (subtitle) are two different strings.
2. **Fewer commas.** A comma where a person would breathe. Two short sentences of one idea worked best as one `group` (§1b-4), not two unrelated lines or one line with a full stop inside.
3. ~~Synthesise a paragraph at a time~~ (superseded by §1b-4, experiment 20): re-measured, one request per paragraph gives the **same** pitch per sentence as separate requests (zh-TW edge voices restart at every full stop, inside one request too); it only evened out the pauses. What works is joining the sentences of one idea with commas (`group`) and shaping the pauses (`pauseShape`), both in `voice.py`.
4. **Calm passion lives in the content, not in speed**: a detail only someone who studied it would notice, said plainly with its surprise (「整個『點一下』，最後就只是兩個數字」); one step of consequence beyond "how it works" (「AI 在小照片上差一格，換回你的螢幕就差兩格」); the number first, then the plainest conclusion; long and short sentences alternating; a longer beat before the key sentence, the key sentence a little slower. **Never invent a personal history or feeling** (truthfulness; 「我研究十年了」「我每次看都很感動」): the content has to be interesting before the teacher says it is.

5. **Guide phrases** that announce where the talk turns (「那我們來看第二部分」「那實際上會怎麼跑呢」) help a little and are said a bit faster than the content around them. The main cause of "not like a good teacher" was structural (the narration repeated the picture; nothing carried the viewer forward), handled in `03-adapter-pattern.md` §1.4, judged per segment.

6. **Sound like someone who knows where people go wrong** (Pro teachers; approved, experiment 20 test 8 — the user preferred it over the same film without these lines; used by situation, not by quota). Research: a teacher sounds expert by naming the common mistake and turning it over, stating the exact condition a tool works under, and saying at a seam why the next part matters — not by fluent delivery, which only raises the feeling of having understood. Two kinds of line, each with a picture event on its word (`05-presentation-methods.md` §3c):
   - **Anticipation**, just before the viewer's natural wrong move is tested: 「等等，這樣切看起來最公平，但大家最常漏掉一件事。」 It names that the move looks right and something is missed, keeping the answer back: the viewer's prediction pause is what makes it land.
   - **A concrete boundary**: the condition under which the thing stops working, said as a rule a person could check — 「答案不在說明書裡，就不能用合成。」 A hedge (「不一定」「看情況」「這不一定適用所有情況」) sounds like the opposite of expertise. In test 8 it shared only the topic word 合成 with the key sentence beside it (「合成只補形式，不造事實。」), not 補, 形式 or 事實, so each line said something new.
   - It falls flat when you cannot say exactly where the mistake is: a bare 「很多人會錯」 is empty, and so is one in every segment.

   Working a mistake out on screen is the visible-reasoning shape (`05-presentation-methods.md` §3b, approved, experiment 20 test 4). **Still open:** saying what is *not* known. Needs a sample, not a rule.

7. **One deadpan line** (**Alden's** — the user's decision, 2026-11-10; approved, experiment 20 test 20 — the user: a bit better, small difference. An option by situation, not quota or habit: a film where nothing absurd is proved on screen has none; not every absurd fact needs one). Right after the picture proves something absurd, the teacher may add one flat sentence — no laugh, no 「哈」, no change in the picture (the evidence stays on screen): after the NT$650 repair fee that is nowhere in the manual, 「寫得比說明書還詳細。」 Test 20 voiced it at the base rate; the hook's 「測你的運氣。」 there is a little slower (+2 % against +8 %) and passed too: rate is not what makes it work. The joke is the fact itself: humour tied to the point goes with better learning; a funny example used *as* the explanation does worse. A dry line in the hook differs: it belongs to the hook (a visible loss said flatly, `04-skeleton.md` §1), any teacher may use it (lesson 6's 「測你的運氣。」 is in Nico's free film); the line after the evidence is Alden's alone (her persona carries about two lines of dry humour per lesson, `11-teachers.md` §5); other teachers, Pro included, do not add it. With both, a film keeps to two (Alden's persona limit). Held back where it would take the student's question or the moment a term is named (kept off C09); 「順便補的，就順便編了。」 was turned down for turning the student's own 「順便」 back on her (aimed at student or viewer, it stings); a pun the subtitles cannot carry is lost.

## 1b-4. Prosody hierarchy: mark the structure with the voice (experiment 20, approved 2026-11-09)


**Why it sounded read aloud.** Listeners hear structure in the voice: one idea falls in pitch with short pauses; a new topic restarts high after a longer pause; a new word is set apart. edge-tts zh-TW voices restart the intonation at **every full stop** (measured twice: three sentences in one request or in three give the same per-sentence P90 pitch), and our scripts had one short sentence per line, nearly every pause 0.15–0.35 s. So every 1.5 s the voice announced a new paragraph, on one even beat. A synthetic voice's *emotional* style barely changes learning (Zhao & Mayer 2024; Liew et al. 2022): the voice makes structure audible; enthusiasm lives in the content (§1b-3 point 4).

**Tools that worked (in `script.json`, run by `voice.py`); pick by what the passage needs:**

| Tool | Write | Effect |
|---|---|---|
| Idea group | the same `"group": "g3"` on the 2–3 consecutive lines of one speaker that make one idea (around 40 characters together worked) | synthesized as one sentence (inner full stops become commas): later clauses stay lower instead of restarting; timeline keeps every line id, so pictures still land on their words |
| Pause layers | `"pauseShape": {"、": 0.12, "，": 0.24, "join": 0.32}` (restrict with `"pauseShapeOnly"` when only part of a film is reworked) | pauses inside a clip by what separates the words: enumeration tight, comma short, the seam of a group a bit longer |
| Between lines | `pauseAfter`, references: same idea 0.1–0.2, end of a thought 0.45–0.6, topic change or before the key line 0.8–0.9 | the length of a pause *is* the structure |
| Focus pause | `‖` (or `‖0.4`) right before the one new word of a key line: 「有將近一半的機會，‖整類消失」 | a real 0.35–0.4 s silence cut into the audio, intonation unbroken (「……」 does nothing in edge-tts). Strongest when rare: key lines, about one per 20 s; before a filler it stresses the filler. The picture lands on that word, after the pause |
| Speed bands | per-line `rate` relative to the teacher's base: guide / setup lines a little faster, mechanism lines about 4–6 points slower, the key line about 10 points slower | slowing down says "this is new and hard"; one speed for the whole film hides that |
| Turn gaps | `gapBefore`: the teacher answering a wrong guess 0.25 (≈0.45 s in total); a student proposal without a think beat before it 0.6 | the gap itself acts: a considered proposal, a teacher who listened. A guess right after a think beat needs no extra gap (the beat is there) |

**Measured on the approved B (lesson 6, first middle segment):** pauses of 0.15–0.35 s fell from 29 of 40 to 22; pauses of 0.45 s or more rose from 20 % to 35 %; speech share 68 % → 66 %; the segment grew 3 s. Lab: `研究/實驗20-高點閱研究AB實測/00-紀錄.md`.

**Check:** `ffmpeg -i narration_dry.wav -af silencedetect=noise=-38dB:d=0.08 -f null -` over the middle — almost every pause in one band (0.2–0.35 s) means the structure is probably not audible yet. Numbers are hints; the ear decides.

## 1c. Voice engine: edge-tts by default; an AI voice only when chosen The user's product decision, so firm: an AI voice is used only when the user chose it — named in the request or a standing rule, set in `VOICE_ENGINE` or `settings.json` `voice.engine`, or their answer to the start-up question. A key existing, a better sound or a film's problem is no reason to switch; not suggested mid-way.

**Decide while planning (step 1), with `resolve.cjs` → `engine`:**

| Situation | `engine` | What you do |
|---|---|---|
| No AI voice key | `id: edge`, `askUser: false` | Use edge-tts. No question. |
| Key(s) present and the user fixed a voice (named it in the request or a standing rule → `--engine <id>`; `VOICE_ENGINE`; `settings.json` `voice.engine`) | that id, `askUser: false` | Use it. No question. |
| Key(s) present, nothing fixed | `id: null`, `askUser: true`, `options` | **Ask once, in the single start-up question** (with the goal question if any), so the run then goes end to end: list `options` with cost (edge-tts free; Gemini Flash about NT$2 per lesson; Azure about NT$0.6), recommend the one marked `recommended` — always edge-tts, the default; an AI voice is the user's pick, not pushed. Then re-run `resolve.cjs --engine <answer>`. Unattended run with nobody to answer → edge-tts, noted in `NOTES.md`. |

The answer applies to the whole series: write `"engine": "<id>"` into every lesson's `script.json`. This is the only voice question, asked only at the start, never mid-way (`SKILL.md` rule 0).

**What `voice.py` does with it (pipeline contract):**
1. `"engine"` in `script.json` (or `VOICE_ENGINE`) picks the engine; unset or `auto` means edge-tts (no cost by surprise).
2. Gemini TTS (`gemini-3.8-flash-tts`, override `GEMINI_TTS_MODEL`; key `GEMINI_API_KEY`), Azure Speech (same voice names as edge-tts; `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`), or any engine through `TTS_CUSTOM_CMD`, a shell template with `{voice} {style} {rate} {pitch} {text_file} {out}` that writes an audio file.
3. Per-engine settings ride inside each voice: `{"voice", "rate", "pitch", "gemini": {"voice", "style"}, "azure": {"voice"}, "custom": {"voice", "style"}}`; `resolve.cjs` fills them from the registry for the film's language (`voice.gemini.<lang>`, `studentVoices.gemini.<lang>`), because a style is language-specific: the zh-tw one asks for a Taiwan accent, which an English film must not get (it did, before the presets were split). An older flat preset (`{"voice", "style"}` without language keys) counts as zh-tw: for another language only its Gemini voice name is kept and the style dropped, with a note. These presets only fill in the voice once Gemini has been chosen; they never choose it.
4. Engines without word timings are aligned to the script with faster-whisper (one CJK character or Latin word per entry), so lip sync, `T.word()` and subtitles keep working.
5. Every AI clip is checked (ASR must hear the text, compared by sound, Traditional/Simplified and digits normalised: ≥ 70 %, or ≥ 50 % with a plausible length). **If any line still fails after retries, the whole narration is redone with edge-tts**, reason printed: a film never mixes engines. Copy the `voice engine:` line into `NOTES.md`.
6. Keys live in environment variables only — not in the vault, the plugin or `script.json`, which are shared. Where: Claude Code cloud → environment settings (session title bar → environment → Edit → Network secrets, or an environment variable; new sessions pick it up); local → `"env": {"GEMINI_API_KEY": "…"}` in user-level `~/.claude/settings.json` (outside the vault) or the shell profile; Gemini CLI users with `GEMINI_API_KEY` set are detected as having a key (and asked).
7. Verified 2026-11-02 without real keys: no key → edge; invalid Gemini key → edge; custom engine without word timings → aligned, used; custom engine dropping two thirds of each line → rejected, edge. Gemini and Azure calls follow the official REST formats but have not run with a real key; `voice.gemini` presets are defaults to check by ear (gender, accent for the language).
8. Cost (real lesson length ≈ 280 s of speech): Gemini Flash ≈ NT$2 per lesson (an 8-lesson course ≈ NT$16–21), Flash-Lite ≈ NT$1.3, Azure ≈ NT$0.6; Gemini's free tier is free within its rate limits; Gemini prices double from 2027-01-01.

## 2. Chinese films

- English UI terms: **said in Chinese, written in English on screen** — least often mispronounced.
- First appearance of a term: full English name + Chinese + one plain sentence anchors it. Example: 「D7 = Day 7 Retention（第 7 天留存）：使用者安裝 App 後，到了第 7 天，還有多少人回來開啟 App。」
- Polyphonic characters (破音字) are worth checking by ear — and by signal, since ASR cannot tell the readings apart (§4): `tonecheck.py` (`08-tools.md` §2) voices the sentence with the character and with unambiguous references and says which reading it is closer to. Experiment 17: zh-TW-YunJheNeural read 重跑 as zhòng pǎo in 8 of 14 sentences (); 重現 and 重新 were mostly right, not reliably; 太重 (zhòng) was fine. What fixed all 14: **蟲** in `text` for the chóng 重 (蟲 has only that reading), 重 kept in `sub`, any `Wd(id, '重跑')` anchor re-pointed to `蟲跑`. A verdict whose distances differ by less than ≈ 0.5 is no verdict — that line goes on the human-ear list.
- **Re-voicing a line after the visuals are rendered** moves everything after it by the clip's few tens of ms. Setting that line's `pauseAfter` to `old pause + old duration − new duration` lets the next line start where it did (max drift 2 ms in experiment 17), so every rendered part stays valid and nothing needs re-rendering.

## 3. English films

- **Rewrite, don't translate line by line.** Short sentences, spoken rhythm, real reactions. Reference feel: Cleo Abram, Kurzgesagt, Google Cloud Tech explainers — warm, clear, one idea at a time.
- On-screen text in English. English runs about twice as long as Chinese: re-lay out, not just swap strings. Mindmap nodes of about 5 words fit.
- Abbreviations expanded on screen at first appearance (CAC, CPM, CTA, D7 …) let a newcomer follow.
- Money: the first time, say the local amount once with a rough USD conversion ("fifteen hundred Taiwan dollars, about fifty US dollars"); afterwards writing it on screen is enough — TTS reads "NT$215" slowly.
- If TTS stumbles on an abbreviation, the full name ("return on ad spend" for ROAS) worked better than a phonetic spelling in `text`; keep the correct form in `sub`.
- Fonts: interface Inter; chalk Kalam 700; clay props Nunito 800 (`lib/classroom/EN.md`).

## 4. Pronunciation checks

- `python3 asr.py projects/<id>/narration.wav` (Chinese) / `ASR_LANG=en python3 asr.py …` (English) — spot-check abbreviations and hard lines; ASR is slow.
- Keep the ASR prompt **neutral**: listing the abbreviations biases it into hearing them right.
- ASR cannot tell a mispronunciation from a mis-hearing. English terms and polyphonic characters need a **human ear**: list the suspect lines for the user at delivery.
- **Make that list playable.** Cut each suspect line from the delivered film (`.vtt` cue times, ±0.35 s) as a short mp3, all on one Artifact page: number, word, how it should sound, the sentence with the word marked, a player. The user answers with numbers (「7、9 錯」). Experiment 18c: 15 lines checked in one pass; all acceptable.
- **CamelCase product names run together.** 「PageIndex」 came out as one fast word. For a name the learner must catch, a space in `text` (「Page Index」), the real spelling in `sub` and a short pause after it help.
- When a reading is wrong: write `text` the way it should be read, keep the correct spelling in `sub`.
