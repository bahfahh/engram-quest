# 回顧片配樂產生器（`scripts/music/`）

> **Style `map` (2026-11-12, full-frame topic and month films, no narration).** One theme for the whole film: opening, body and
> ending are the same composition (same seed, key and tempo; `warm`, full arrangement), the body is one continuous piece 3 dB
> lower, and consecutive `topic` cues are merged. `marks` in the cue sheet (recall countdowns) make the score step back 9 dB and
> place one chime at the reveal. `render_stage.cjs --data` writes such a cue sheet. Final mix for these films:
> `mix.py --lufs -25 --air 3`. Why: a bed without melody under a ten-minute film was heard as "no music"; a melody at -19 LUFS was
> "too loud". The rules below (`bed` under topics, a new piece per segment) describe the older styles `rooms`, `board`, `rewind`.

> 下面指令裡的 `studio/music/gen` 就是這個資料夾。
> **不寫進 skill 資料夾**：解碼快取放 `~/.cache/engram-episodic-music/`（`MUSIC_CACHE_DIR` 可改）；用過的 (mood, seed, 調) 記在 `~/.local/state/engram-episodic-music/used.json`，**主持人應把 `MUSIC_USED` 指到 vault 的 `engram-quest/episodic-review/music-used.json`**，片與片之間才不會重複。
> 檢查成品混音：`python3 -I qa_music.py --target -16.5 --out-dir <別處> narration.wav`（不在專案資料夾留檔，響度目標用成品的）。取樣已放在 `samples/`（授權見 `licenses/`）；第一次跑會在 `.cache/` 解碼取樣（約 260MB，可刪，已加進 .gitignore）。需要 numpy、scipy（`pip install scipy`）、ffmpeg；`qa_music.py` 另外要 matplotlib。

依「情況」（風格 × 段落 × 片 id）自動挑 mood 和 seed，用**真的樂器取樣**即時作曲，產生 48 kHz 立體聲 wav。
每支片的旋律、和弦進行、調、速度都不一樣，回顧片不再和課程片共用〈Morning〉。

> **規則：背景一律是樂音，不用雜訊當氛圍。**
> 不用白噪音、錄音帶嘶聲（hiss）、錄音室底噪、馬達聲、雜訊做的 whoosh。
> - 主題段：很淡、但有和聲、有節奏的音樂（`--density bed`，預設 -26 LUFS）。
> - 回想倒數：一個懸著的長音和弦（V9sus4 或 IVmaj7）慢慢散掉（`thinking`，-28 LUFS）。
> - 揭曉：有音高、乾淨的一聲（`chime`：鋼片琴＋鐘琴、音樂盒兩個音、豎琴撥弦＋鐵琴，底下淡淡的主和弦），或從 I 開始的短樂句，把回想的懸念解決掉。
> - 段落之間不留死寂：每段都延長 2 秒蓋住下一段的淡入；QA 會量「低於 -50 dBFS 的最長連續時間」。
> - 音效如果要加，也只用有音高的乾淨聲音（鐘、撥弦一聲），不要用雜訊。
> - 殘響的脈衝響應（IR）是用「衰減的雜訊」算出來的，但它只是捲積（convolution）在樂音上，沒有音符就沒有聲音。QA 也量 2–16 kHz 的頻譜平坦度，確認成品裡沒有嘶聲類的成分。

## 快速使用

```bash
cd studio/music/gen
# 一段配樂（全部用 nice，背景算圖不受影響）
nice -n 10 python3 -I music_gen.py --mood warm --seed 7 --dur 70 --out out/warm.wav --mp3
nice -n 10 python3 -I music_gen.py --mood reflective --seed 3 --dur 40 --density bed --key Eb --out out/topic.wav
nice -n 10 python3 -I music_gen.py --mood thinking --seed 5 --dur 8 --key Eb --out out/recall.wav    # 回想倒數
nice -n 10 python3 -I music_gen.py --mood chime --seed 1 --key Eb --out out/reveal.wav               # 揭曉一聲
python3 -I music_gen.py --mood curious --seed 3 --dur 70 --plan      # 只印作曲計畫（調、速度、段落、和弦表），不算音訊
python3 -I music_gen.py --list

# 依情況挑（印出 JSON；--render 才產生音檔；--dry-run 不寫 used.json）
python3 -I pick_music.py --film rooms-nov --style rooms --segment opening --dur 20 --render out/
# 整支片：cue sheet → 每段 wav + 對齊時間軸的 score.wav + cues.json（含 credits）
python3 -I pick_music.py --cues examples/cues_rooms.json --render out/rooms-nov/

# 試聽與品質檢查
sh make_demos.sh                                   # 重新產生 demo/（約 10 分鐘，含整支片範例）
nice -n 10 python3 -I qa_music.py demo/wav/*.wav   # 每段一張 png ＋ qa_report.md / .json
python3 -I tools/fetch_samples.py                  # 取樣不見了才需要（只連 raw.githubusercontent.com）
```

`music_gen.py` 輸出：`<名>.wav`（48 kHz 立體聲 24-bit PCM）、`<名>.notes.tsv`（音符表：時間、小節、拍、聲部、樂器、音名、力度、長度、和弦、是否調內、是否和弦音）、`<名>.json`（計畫、和弦表、響度、各聲部響度、credits）。

參數：`--mood`、`--seed`、`--dur`（秒）、`--density full|light|bed`、`--key`（固定調）、`--lufs`（響度目標）、`--open-tonic`（第一個和弦一定是 I）、`--mp3`。

## 檔案

| 路徑 | 內容 |
|---|---|
| `music_gen.py` | 產生器：作曲（和弦、聲部進行、旋律、伴奏型、人性化、速度曲線）＋取樣算音（移調、loop、力度）＋殘響＋母帶（EQ、響度、true peak） |
| `pick_music.py` | 挑選器：情況 → mood/seed/density/key 或 library 曲子；`used.json` 記錄；整支片 cue sheet → `score.wav` |
| `qa_music.py` | 品質檢查（響度、true peak、頻譜、雜訊、喀噠聲、音符表）＋每段的波形＋頻譜圖 png |
| `make_demos.sh` | 重新產生 `demo/` |
| `samples/salamander/*.ogg` | Salamander Grand Piano，A1–C7 每小三度一個（22 個） |
| `samples/fluidr3_gm/<樂器>/*.ogg` | FluidR3_GM：string_ensemble_1、pad_2_warm、music_box、celesta、glockenspiel、vibraphone、electric_piano_1、marimba、orchestral_harp |
| `tools/fetch_samples.py` | 下載取樣（只用允許再散布、商用的來源） |
| `tools/check_pitch.py`、`tools/pitch_check.json` | 量每個取樣的實際音高（八度＋音分），確認檔名對得上 |
| `licenses/` | 從來源 repo 抓下來的 README／LICENSE 原文（授權判斷的依據） |
| `library/library.json` | 真的曲子清單（目前只有〈Morning〉，標 `course`，回顧片不選） |
| `examples/cues_rooms.json` | 整支片 cue sheet 範例（約 6 分鐘、29 段） |
| `demo/` | 試聽 mp3（192k）、每段 png、`qa_report.md/.json`；`demo/wav/` 是原始 wav 與音符表 |
| `demo/13_film_example_rooms_score.mp3`、`demo/film_example_rooms/` | 整支片範例：用 `examples/cues_rooms.json` 挑選＋產生的 29 段、對齊時間軸的 `score.wav`、`score.png`（段落標記）、`cues.json`（含 credits）、`qa_report.md` |
| `used.json` | 挑選紀錄（第一次正式挑選時才會產生） |
| `.cache/` | 解碼後的取樣（npy），可刪 |

## mood

| mood | 用在 | 配器 | 速度／拍子 | 調性與和聲 | 旋律 | 殘響 | 預設響度 |
|---|---|---|---|---|---|---|---|
| `warm` | rooms（回到那個房間）片頭、主題段 | 鋼琴左手開放分解和弦（1-5-8-10）＋弦樂三聲部長音＋弦樂低音；鋼琴右手旋律 | 65–75 bpm，4/4 | 大調；maj7、add9、I/3、V/3 的級進低音；後句偶爾用借來的 iv（懷舊的「小四級」） | 鋼琴 F4–C6，稀疏、拱形 | RT60 2.4 s | -20 |
| `curious` | board（線索板） | 電鋼琴切分短和弦＋豎琴撥弦低音（根音、五度、往下一個低音靠近的經過音）＋馬林巴木琴旋律；小調段改由鐵琴接旋律 | 80–90 bpm，4/4 | 大調段和**關係小調**段交錯（i–bVI–bIII–bVII，自然小調、不用減和弦和導音），小調段停在 bVII 再回大調 I，不懸疑 | 馬林巴 F4–C6，短動機重複＋一問一答 | RT60 1.7 s（比較乾、顆粒清楚） | -20 |
| `reflective` | rewind（倒帶） | 3/4 慢板鋼琴分解和弦＋音樂盒旋律（對比段換鋼琴）＋極淡的暖 pad；樂句交接處有一個「倒放殘響」的吸氣聲，最後一個和弦前也有 | 55–65 bpm，3/4 | 大調；IV–iv–I（借來的小四級）、vi–IV、maj7 | 音樂盒 A4–D6，很稀疏、長音多 | RT60 3.2 s | -20 |
| `bright` | 片尾全部亮起 | 鋼琴「往上走」的分解和弦（1-5-8-10-5-8-10-12）＋鋼琴旋律＋鐘琴（後段八度重疊旋律、進最後和弦前一串上行琶音、最後一個高音）＋後段淡弦樂 | 76–84 bpm，4/4 | 大調；I–V–vi–IV、IV–V–I | 每一句比上一句高約 2 個半音，句內上行 | RT60 2.2 s | -20 |
| `thinking` | 回想倒數、片尾快問 | 暖 pad 長音＋鋼琴低音＋偶爾一個鋼琴高音（級進）、鋼片琴回聲 | 58–64 bpm，和弦每 2 小節換一次 | Iadd9、vi7、IVmaj7、**停在 V9sus4**（或 IVmaj7）不解決；短於 16 秒時就是「一個長音和弦慢慢散掉」 | 幾乎沒有旋律 | RT60 3.6 s | -28 |
| `chime` | 揭曉一聲 | 三種隨 seed：鋼片琴＋鐘琴（主音＋五度）、音樂盒（五度→主音）、豎琴撥弦＋鐵琴；底下一個很淡的主和弦 pad 慢慢開出來再散掉（回想的 V9sus4 在這裡解決，也讓揭曉之後不會有死寂） | — | 主和弦 | — | RT60 2.6 s | -24 |

`--density`：`full`（片頭、片尾）全配器；`light`（全貌、揭曉後的收束）旋律更稀疏、伴奏更輕，-23 LUFS；`bed`（主題段）伴奏改成四分音符或更慢、通常沒有旋律（偶爾對比段有兩三個音），-26 LUFS。

**為什麼這樣配**：warm 用鋼琴＋弦樂長音是最直接的「懷舊、安全感」；curious 刻意不用懸疑（減和弦、半音、低音弦樂顫音都不用），而是用撥弦和木琴的短音、切分節奏製造「一塊一塊拼起來」的感覺，大小調交錯只用關係小調，聽起來是「想一想」不是「有危險」；reflective 用 3/4 和音樂盒是「舊東西、往回看」，倒放殘響呼應倒帶但只在樂句交接處淡淡出現；bright 用鐘琴和上行音型做「全部亮起」；thinking 停在掛留和弦，讓觀眾的腦袋接著把答案補上，揭曉時回到 I 才「解決」。

## 作曲規則（共通）

- **曲式**：前奏 1–2 小節 → 4 小節樂句（前句停在 V/IV、後句回到 I、對比段、再現段）→ 剩下的小節做 tag（IV–V）→ 最後一個和弦延長。長度不同就增減樂句（6 秒到 3 分鐘以上都可以）；seed 決定的速度不變時，用最後和弦的延長來對準 `--dur`，不行才微調速度。
- **和弦**：每個 mood 有一組 4 小節進行（羅馬數字），依 seed 抽，前後句接縫不重複同一個和弦；後句常重複前句（讓人聽得出主題）。全部在調內，唯一的調外音是刻意借用的 iv（音符表標 `borrowed`）。
- **聲部進行**：每個和弦在音域內列出所有排法，選「和前一個和弦移動總量最小」的；不准小二度／小九度、低音區不准大二度、相鄰聲部不超過大六度、第三音和七音一定要有。左手分解和弦在低音上方第一個八度內只用根音和五度（避免低音區混濁）。
- **旋律**：beam search。強拍（或長音）必須是和弦音或大和弦上的 9 音；非和弦音只能級進進入、級進解決到和弦音；級進加分、三度小加分、大跳扣分，大跳後要反向級進；不准三全音和超過大六度的跳；不准 D-C-D-C 來回；句子有拱形（或 bright 的上行）目標音高；後句結束在主音；每句最後一小節長音或休止（呼吸）。後句用前句的節奏和開頭音（動機重複）。
- **伴奏型**：分解和弦（八分音符，踏板在換和弦時換）、弦樂／pad 長音（共同音不重彈）、電鋼琴切分、豎琴低音、鐘琴琶音。
- **人性化**：起音時間 ±5–12 ms 高斯抖動（旋律稍晚約 8 ms）、最後和弦由低到高滾奏、力度＝樂句弧線＋強拍重音＋隨機；速度有很慢的 ±1% 起伏、每句結尾稍慢 4.5%、最後 1.5 小節漸慢 22%。
- **取樣算音**：最近的取樣用 `resample_poly`（多相濾波）移調，最多 ±1 半音；鋼琴和鐘琴類自然衰減，放開時 0.15–0.9 秒釋音；弦樂／pad 的取樣只有 3.1 秒，長音用隨機片段 + 0.3 秒等功率交叉淡化 loop，自己做起音和釋音；取樣不夠長時用 0.4 秒淡出（音符表可查）。力度＝音量（vel^1.7）＋亮度（one-pole 低通，力度越小越暗）。每個取樣的音量依音高做線性擬合，修掉個別取樣的音量跳動（最多 ±4 dB）。音樂盒在 3.15 kHz 固定 -3 dB（壓掉偏刺的泛音）。
- **殘響**：自己算的立體聲 IR：12 個早期反射＋分 5 個頻段、各自衰減時間的雜訊尾巴（高頻衰減較快），預延遲 12–30 ms；送殘響前先切 160 Hz 以下和 7.5 kHz 以上（不混濁、不嘶）。
- **母帶**：35 Hz 高通、320 Hz -1.5 dB、7 kHz 高架 -1.5 dB、16 kHz 低通；開頭 1.5 秒淡入（chime 除外）、結尾 2.5 秒淡出到完全無聲；BS.1770 響度對到目標（±0.1 LU），4 倍超取樣量 true peak，超過就用 lookahead limiter，保證 < -1 dBTP。

## 挑選規則（`pick_music.py`）

| 段落 `--segment` | rooms | board | rewind | density |
|---|---|---|---|---|
| `opening` 片頭 | warm | curious | reflective | full |
| `overview` 全貌、回到全貌 | warm | curious | reflective | light |
| `topic` 主題段（房間裡） | warm 75% / reflective 25% | curious 75% / warm 25% | reflective 75% / warm 25% | bed |
| `recall`、`quiz` 回想倒數、片尾快問倒數 | thinking | thinking | thinking | bed |
| `reveal` 揭曉 | ≤ 6 秒：chime；更長：風格 mood、從 I 開始 | 同左 | 同左 | light |
| `closure` 收束 | 風格 mood、從 I 開始 | 同左 | 同左 | light |
| `ending` 片尾 | bright 70% / warm 30% | bright 70% / curious 30% | bright 70% / reflective 30% | full |

- **同一個 mood 裡隨機**：`seed = sha256("片id:段落:房間") XOR 隨機 32 位元`，所以同一個情況每支片都不同；`--deterministic` 不加隨機（可重現）。
- **整支片一個調**（`--key-policy film`，預設）：段落交接時前一段的尾音和下一段的淡入會重疊（`--overlap` 預設 2 秒），同調才不會打架；這個調避開上一支片用過的調。回想停在 V9sus4，揭曉／收束從 I 開始，等於「問題懸著 → 答案解決」。`--key-policy room` 則每個房間自己一個調。
- **避免和上一支片重複**（`used.json`）：上一支片在同一段落用過的 mood 權重 ×0.35（有其他選擇時）；上一支片用過的 (mood, seed) 不再用；上一支片用過的 library 曲子不選。同一支片裡不重複 (mood, seed)。
- **真的曲子**：`library/` 放 mp3／wav，`library/library.json` 寫 `file`（相對 `library/`）、`title`、`artist`、`moods`（用上面的 mood 名稱）、`tags`、`license`、`credit`，可選 `segments`。片頭、全貌、主題、收束、片尾有符合 mood 的曲子時，有 `--library-weight`（預設 0.3）的機率選它；會裁成需要的長度、淡出、對到該段的響度。**標 `course` 的（〈Morning〉）回顧片不選**，`--allow-course` 才會選。只放授權允許再散布、商用的曲子，credit 欄位要能直接貼。
- **整支片**：cue sheet 是 `{"film", "style", "duration", "cues": [{"segment", "start", "dur", "room"?}]}`，範例 `examples/cues_rooms.json`（片頭 6 秒、全貌 20 秒、4 個房間各「主題 34 + 回想 8 + 揭曉 4 + 收束 8 + 回到全貌 5」、快問 3 題各「倒數 9 + 揭曉 4」、片尾 60 秒）。實際用時把秒數換成 timeline 的時間。`--render` 會產生每段 wav，再依 `start` 放進一條和片一樣長的 `score.wav`，並寫 `cues.json`（挑選結果＋credits）。

## 授權與 credits

只用授權允許**再散布、商用**的取樣（都只要求標示作者）。依據是從各 repo 用 raw.githubusercontent.com 抓下來的原文，存在 `licenses/`：

| 來源 | 作者 | 授權 | 原文出處 |
|---|---|---|---|
| Salamander Grand Piano V3（Yamaha C5，48 kHz/24 bit 錄音），取自 Tone.js 的 audio repo（`salamander/*.ogg`，Vorbis 約 160 kb/s） | Alexander Holm | **CC BY 3.0** | `https://raw.githubusercontent.com/Tonejs/audio/master/salamander/README`：「Licence: CC-by http://creativecommons.org/licenses/by/3.0/ … Author: Alexander Holm」（repo 根目錄 README：「Links and licenses for the files are located in each collection's folder.」）。README 標題寫 V2，但 changelog 列到 V3（Markus Fiedler 重新調音的版本）。 |
| FluidR3_GM SoundFont（各 GM 樂器） | Frank Wen | **MIT** | `https://raw.githubusercontent.com/musescore/MuseScore/3.x/share/sound/FluidR3Mono_License.md` 收錄的原始 README／COPYING：「Copyright (c) 2000-2002, 2008 Frank Wen … I hereby release Fluid under the MIT license」 |
| 上面那套 FluidR3_GM 逐音算出來的音檔（`FluidR3_GM/<樂器>-ogg.js` 裡的 Vorbis 80 kb/s） | Benjamin Gleitzman（midi-js-soundfonts） | **CC BY 3.0**（repo 程式部分 MIT） | `https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/README.md`：「Fluid Soundfont … Released under Creative Commons Attribution 3.0 license」；`LICENSE.txt`：MIT, Copyright (C) 2012 Benjamin Gleitzman |
| **沒有用**：MusyngKite、FatBoy（同一個 repo） | — | CC BY-SA 3.0（相同方式分享，衍生作品要用同授權） | 同上 README |
| 〈Morning〉（`studio/music/Morning.mp3`，**只給課程用**，回顧片不選） | Kevin MacLeod | CC BY 4.0（依 `bgm2.py` 的註記；ID3 標籤 title=Morning、artist=Kevin MacLeod；incompetech.com 被網路政策擋住，無法再從官網核對） | — |

為什麼用 `.ogg` 而不是 `.mp3`：同一個資料夾裡的 Salamander mp3 只有約 36 kb/s，C6 以上 4.4 kHz 以上全被切掉（量過）；FluidR3 的單音 mp3 約 8 kHz 以上被切掉。ogg 版本是同一批錄音、同一個授權。

**影片 credits 欄位直接貼（依實際用到的樂器，`pick_music.py` 的 `credits` 和 `music_gen.py` 的 `.json` 會自動列出）：**

```
Music: original background score generated for this video (music_gen.py, procedural composition).
Piano samples: "Salamander Grand Piano V3" by Alexander Holm, licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); sample set via github.com/Tonejs/audio.
Instrument samples: FluidR3_GM SoundFont by Frank Wen, Copyright (c) 2000-2002, 2008 (MIT License); per-note renders from "midi-js-soundfonts" by Benjamin Gleitzman, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/us/).
```

中文版：

```
配樂：本片自動作曲產生的原創背景音樂（music_gen.py）。
鋼琴取樣：〈Salamander Grand Piano V3〉Alexander Holm，CC BY 3.0（https://creativecommons.org/licenses/by/3.0/），取自 github.com/Tonejs/audio。
樂器取樣：FluidR3_GM SoundFont，Frank Wen，Copyright (c) 2000-2002, 2008（MIT 授權）；逐音音檔取自 Benjamin Gleitzman 的 midi-js-soundfonts，CC BY 3.0（https://creativecommons.org/licenses/by/3.0/us/）。
```

MIT 授權要求「著作權聲明和許可聲明要包含在軟體的所有副本中」；音樂作品不是軟體副本，這裡用 credits 標示作者和授權來對應，比較保守的做法是另外把 `licenses/` 裡的 MIT 全文放在影片說明或專案資料夾。

## 品質檢查（`qa_music.py`，全部是量測，沒有人耳試聽）

| 檢查 | 怎麼量 | 標準 |
|---|---|---|
| 響度、true peak、LRA | ffmpeg `ebur128=peak=true`（和產生器自己的 BS.1770 量測分開，互相核對） | 目標 ±0.5 LU；TP < -1 dBTP |
| 低頻轟鳴 | Welch 頻譜，40 Hz 以下能量相對全頻 | < -30 dB |
| 刺耳高頻 | 5–10 kHz、10 kHz 以上能量；2–5 kHz；1/3 八度頻帶比鄰帶突起 > 6 dB **而且**該帶 > -24 dB re 全頻才算 | 5–10k < -16 dB、>10k < -26 dB、2–5k < -8 dB |
| 雜訊／嘶聲 | 2–16 kHz 頻譜平坦度（每 43 ms 一格，-60 dBFS 以上的格）；樂段最安靜 10% 的電平 | 平坦度 > 0.3 的格 < 5% |
| 爆音／喀噠聲／取樣接縫 | 7 kHz 高通後的尖峰 / 20 ms 局部 RMS > 9 倍，以及二階差分 / 10 ms 局部 > 14 倍；扣掉音符起音 ±30 ms 內的 | 不明尖峰 0 |
| 結尾 | 最後 0.3 秒 RMS | < -60 dBFS |
| 空白（整支片要一直有樂音） | 400 ms RMS 低於 -50 dBFS 的最長連續時間（頭尾除外） | ≤ 2 秒 |
| 音符表 | 調外音（借用和弦除外）、起音後 0.25 秒仍在按的不同音高數和音級數、旋律級進比例、最大跳進、強拍非和弦音（9 音除外）、旋律與伴奏的小二度／小九度摩擦 | 調外音 0、同時音級 ≤ 6、級進 ≥ 45%、跳進 ≤ 大六度、強拍非和弦音 0 |

最新結果在 `demo/qa_report.md`（12 段全部 ok）和 `demo/film_example_rooms/qa_report.md`（整支片＋29 段），每段的波形＋頻譜圖＋段落／和弦標記在 `demo/*.png`。

## 已知限制

- **沒有人耳聽過。** 好不好聽、配器平衡、混音的「感覺」只靠數據和規則推論；請主持人或使用者實際聽 `demo/` 再決定 mood 和音量。
- 取樣只有一個力度層，力度靠音量＋低通濾波模擬；FluidR3 是 2000 年代初的 GM 音色，弦樂、pad 的質感不如現代音源。弦樂／pad 的 loop 是隨機片段交叉淡化，長音可能有輕微的「起伏」。
- 電鋼琴、音樂盒、鐘琴的取樣只有 3.1 秒，持續更久的音會在取樣尾端用 0.4 秒淡出（音符表與 `.json` 的 `truncated_notes` 可查）。
- 作曲是規則式：和弦進行來自每個 mood 一組固定的樂句庫，長曲子（3 分鐘以上）會開始重複；沒有轉調。
- 音樂不會跟畫面的單一事件對拍（例如卡片釘上那一下），只對齊 cue sheet 的段落時間；要對拍得另外把事件時間轉成 `--dur` 或拆段。
- 弦樂和撥弦取樣本身的音高量測不穩（合奏的 chorus），量到 ±10–16 音分的散布，沒有逐個修正。
- 1/3 八度「突起」在稀疏的曲子（音樂盒、鋼片琴只有少數幾個音）一定會出現，這是音高集中不是共振，所以只在突起的頻帶本身夠大聲時才標記。整支片範例裡有 2 段回想（8 秒，只有一個鋼片琴 G6）還是被標記：那個頻帶就是那一個音的基頻，我判斷不是問題，但沒有人耳確認。
- `score.wav` 是把每段直接疊在時間軸上（相鄰段重疊 2 秒）；和旁白、音效的最後混音、片頭片尾的音量（例如片尾比片頭小 3 dB）仍要在算圖端處理。我沒有改 `bgm2.py`、各片的 `sound.py`。
