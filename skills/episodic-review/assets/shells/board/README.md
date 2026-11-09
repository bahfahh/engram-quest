# 外殼 board：線索板掛在盛夏午後的房間（ep-aug〈八月的調查室〉）

## (a) 這是什麼

使用者看過並認可的第三輪成品〈八月的調查室〉的**原版生產檔**（雲端算圖用的就是這一份）。看起來像這樣：8 月午後的真房間，左邊窗戶的百葉窗把陽光切成斜斜的光條，灰塵在光裡飄；牆上掛一整面軟木「線索板」（案件卡、便條、紅線、圖釘、筆記的圖當照片、懸案黑底虛線便條）；牆下是長書桌，桌上有檯燈、一台螢幕、冰麥茶、紅線捲。**結構和證物放牆上，會動的演示放桌上的螢幕**，鏡頭在兩處之間移動、用景深拉焦。回想時百葉窗闔上、房間變暗、只剩一束工作燈照著問題卡，加 6 秒倒數；片尾拿掉房間，只剩一張索引卡快問。太陽隨片子慢慢變金黃，最後夕陽掃過整面牆、四段紅線連成一圈、光點跑一圈。參考圖：`../../looks/board-*.jpg`；演示目錄：`../../demos/_ep-aug.md`。

這份程式碼是「換內容就能再用」的外殼，不是要重新設計的草稿。

## (b) 檔案地圖

| 檔案 | 做什麼 |
|---|---|
| `scene.html` | 場景頁：字型 CSS、canvas、回想倒數圓環、快問索引卡的 DOM 層。`?notext=1` 遮字版 |
| `film.js` | 主程式：renderer、燈光（太陽、工作燈、檯燈、掃光）、景深＋調色後製、**鏡頭計畫 `planShots()`**、`lightsAt(t)`（光隨時間）、`poseCards/poseThreads`（卡片翻面、紅線拉出）、環的光點、`poseDOM`（倒數和快問）、`window.DURATION/renderAt/studioReady` |
| `content.js` | **內容和時間的唯一來源**：版面尺寸、案件區、全部卡片、紅線、螢幕上的字、拍（beats）、閱讀時間算法、`DURATION` |
| `cards.js` | 把 `CARDS` 畫成紙卡貼圖（各 `kind` 的樣式）、軟木板、圖釘、紅線的幾何；載入 `assets/` 的圖 |
| `world.js` | 房間：牆、地板、窗、百葉窗、書桌、檯燈、螢幕、天花板軌道燈、案件夾（片頭） |
| `screen.js` | 桌上螢幕的所有演示程式 `P['…']`（2D canvas 畫在螢幕貼圖上），內附圖示和小工具（`pool`、`bracket`、`ruleChip`…） |
| `paper.js` | 紙、字型表 `F`、斷行、印章等 2D 小工具；`NOTEXT` |
| `stage.js` | 本專案自帶的 `clamp/lerp/prog/ease/rng`（不依賴 studio 的 `/lib/stage.js`） |
| `assets/*.png` | 筆記的圖（已用專案字型轉成 PNG；`*-notext.png` 是遮字版）。只留場景會讀的 6 張 |
| `fonts/JetBrainsMono-*.ttf` | 程式碼字型。**studio 的 npm 沒有 JetBrains Mono，所以這兩個檔要留在專案裡** |
| `tools/` | `report.mjs`（逐拍核對閱讀時間、`--onscreen` 產生 `onscreen.txt`）、`keystills.mjs`（印出關鍵定格秒數）、`cues.mjs`（產生配樂 cue sheet 和音效時間，要先 `mkdir audio`）、`mix.py`（配樂＋音效混成 `narration.wav`） |
| `CONTENT.md` `DEMO.md` `STORYBOARD.md` `NOTES.md` `onscreen.txt` | 這支片的內容整理、演示卡、分鏡、製作手法與問題、片上全部的字。換內容時當範本讀；不影響算圖 |
| `package.json` | 只有 `{"type":"module"}`，讓 `tools/*.mjs` 能 import `content.js` |

## (c) 換內容的地方

**內容集中在 `content.js`，不用讀懂 `film.js`／`world.js`。**

- **語言和介面字**：`content.js` 開頭的 `LANG` 是影片語言，閱讀時間跟著它算；`UI_SETS` 是固定的介面字（片頭提示、資料夾日期、卡片標題、判斷規則、筆記的圖、快問）。資料夾上的提示句最多兩行。
- **換語言時要自己改的字**：`assets/*.png` 是筆記的圖，裡面的字要重做；`SCREEN_TXT['c1-tree'].win`（螢幕標題列）；`CARDS` 的案件名和卡片字；`tools/` 的中文是給製作者看的，不上片。
- **案件區和牆的大小（版面旋鈕）**：`BOARD = { W: 4.4, H: 1.85, cy: 1.92 }`（牆寬高、中心離地高度，單位公尺；`cards.js` 用它長出軟木和木框）；`ZONES = { c1:{cx,cy,n,name}, c2, c3 }`（每個案件區在牆上的中心）。
- **卡片＝片上全部的字（情境、問題、判斷規則、回想、揭曉、名詞白話、懸案、照片）**：`CARDS`（每張 `{id, zone, kind, x, y, w, h, at, text…}`）。`kind` 決定樣式（`case ctx note def rule open q photo copy tag clue file tline grid title quote gate strip`，樣式在 `cards.js`）；`at` 是哪一拍把它翻面；`zone` 時 x,y 是區內座標；`late` 微調出現時刻。照片卡的 `src` 指向 `assets/<名>`（要同時放 `<名>.png` 和 `<名>-notext.png`）。
- **案例／時間線／四關**：就是 `CARDS` 裡各案件區的卡（例：案件二的 `c2.inc1` 事故時間線、案件三的 `c3.g1…g4` 四道關卡）。
- **紅線**：`LINKS`（案件之間的長線和紙條，`RING` 是閉合順序）、`THREADS`（案件內的短線）。
- **螢幕上的字**：`SCREEN_TXT['<程式名>']`。演示的動作本身寫在 `screen.js` 的 `P['<程式名>']`。
- **鏡頭和時間劇本**：
  - 時間＝`BEATS` 陣列的順序和欄位（`cards` 哪些卡在這拍翻面、`scr` 這拍用哪個螢幕程式、`demo` 演示秒數、`extra` 額外秒數、`post` 演示後才翻的卡）。**每拍長度不手寫，由「閱讀規則」算出**（每行字數 ÷ 5 ＋ 1.5 秒、回想題目讀完才倒數 6 秒、揭曉至少 8 秒）；改字就會自動改秒數，`DURATION` 跟著變。
  - 鏡頭＝`film.js` 的 `planShots()`（每拍一行 `p('<拍id>', [[偏移秒, 鏡頭, 轉場秒]])`；牆上鏡頭用 `Bs(矩形, yaw, pitch, 倍率)`，螢幕用 `Ms(zoom, dx, dy)`）。
  - 先讀牆、再看螢幕：`sc(拍id, 牆鏡頭, 螢幕鏡頭, 演示後鏡頭)` 這個小函式已經包好。
- **快問、片頭字**：`BEATS` 裡 `kind:'quiz'`（`q`、`a`、`hint`、`hintCap`）和 `intro` 的 `say`；縮圖提示對應表是 `film.js` 的 `HINTS`。
- **光／季節／時段旋鈕**（都在 `film.js` 的 `lightsAt(t)` 和燈光宣告）：
  - 太陽方向 `SUNDIR`（第 33 行）、顏色 `sun.color.setHSL(lerp(0.105,0.075,golden)…)`、強度 `lerp(4.2, 3.4, golden)`。
  - 「午後 → 金黃」：`golden = max(ring, endk)*0.9 + day*0.25`（`day = t/DURATION`）。要改季節或時段，改這幾個數字，不要改燈的種類。
  - 百葉窗開合 `blinds`、工作燈 `work.angle/penumbra/intensity`、檯燈 `deskLight`、螢幕冷光 `monLight`、夕陽掃光 `sweep`、灰塵 `DUST_N`。
  - 景深和調色：`buildPost()` 裡的 aperture、`warm`、暗角、顆粒。
- **顏色**：紙和墨 `cards.js` 的 `INK/INK2/RED`、圖釘 `PINM`；字型表 `paper.js` 的 `F`；螢幕調色盤 `screen.js` 的 `C`；房間材質 `world.js` 的 `M`。
- **房間尺寸**：`world.js` 開頭的 `ROOM/WIN/DESK/MON`。

**案件數不是純設定**：目前寫死 3 個案件（`c1/c2/c3`）。`film.js` 裡有幾處直接用到這些 id（`lightsAt` 的回想迴圈 `['c1_recall','c2_recall','c3_recall']`、`poseCards` 的換簽發者條 `c1.swapA/swapB`、`focusTarget` 的 `seg === 'c1'…`、`planShots` 的每拍鏡頭、環的 `L12/L23/L34/L41`）。要加減案件：`content.js`（`ZONES`、`CARDS`、`BEATS`、`LINKS`）和 `film.js` 這幾處要一起改。**改內容但案件數不變時，只動 `content.js`、`screen.js` 的演示、`planShots()`。**

## (d) 怎麼試

```bash
STUDIO=<已 npm install 的 studio 資料夾>        # 有 render.cjs、node_modules、lib/
mkdir -p $STUDIO/projects/<id>
cp -r .claude/skills/engram-quest-episodic-review/assets/shells/board/. $STUDIO/projects/<id>/
cd $STUDIO
RENDER_GPU=1 node render.cjs projects/<id> --stills 44      # 44 秒：案件一的四題表在畫面裡 -> projects/<id>/stills/t-44.jpg
```

- 其他好用的秒數（原片）：126（回想前）、294（連線池演示）、476（mutation 演示）、527（四道關卡）。
- 遮字版：`--scene "scene.html?notext=1"`。除錯鏡頭：`--scene "scene.html?cam=x,y,z,lx,ly,lz"`（自訂相機位置和看向的點）。
- 其他網址參數：`?w=<3D 寬度>`（預設 1600）、`?dof=0`（關景深）、`?soft=0`（硬陰影）、`?noscr`（不更新螢幕）。
- 全片分段算：`RENDER_GPU=1 node render.cjs projects/<id> --from 0 --to 70 --out part1.mp4 --fps 24`；每格約 0.75～1 秒（機器不忙時）。
- 不要設 `window.captureCanvas`：倒數圓環和快問卡是 DOM，要靠整頁截圖才抓得到。

## (e) 這個外殼已經踩過的坑

- **SwiftShader 很慢、景深會糊成一團**：一律 `RENDER_GPU=1`。景深已改成兩段（半解析度 800×450、12 個取樣收集模糊，再依每個像素的模糊圈混回清楚的畫面）。3D 算 1600×900 再放大，DOM 的字維持全解析度。
- **`studioReady` 要等字型載完**：`film.js` 已 `document.fonts.load` 全部用到的字（Noto Sans TC、LXGW WenKai TC、Inter、JB Mono），再建場景。新增用到的字型也要加進那個清單，否則貼圖上的字會變成預設字型。
- **JetBrains Mono 不在 studio 的 npm 裡**：所以 `fonts/` 的兩個 ttf 要跟著專案走（`scene.html` 的 `@font-face`）。其他字型從 `/node_modules/@fontsource/` 讀。
- **等寬字型的連字**：`!=` 會變 ≠、`=>` 變 ⇒。程式碼貼圖要設 `ctx.textRendering = 'optimizeSpeed'`（`screen.js` 已做）。
- **場景只能讀專案資料夾、`/node_modules/`**：任何一段都要能單獨算（雲端分段）。筆記的 SVG 圖不能直接讀，要先用專案字型轉成 PNG 放 `assets/`。
- **`renderAt(t)` 是 t 的純函數**：工作燈的瞄準點是過去 1.6 秒焦點的平均（不是累積狀態）；陰影只在卡片翻面、紅線拉出、百葉窗或光源改變時重算（`shadowMap.autoUpdate = false`，用 key 比對）。
- **強度 0 的燈要從場景拿掉**（`film.js` 的 render 段落），否則每個像素都多算一盞燈。
- **螢幕貼圖**：鏡頭近（1.4 公尺內）時每格重畫、不建 mipmap；遠時每秒只更新 4 次、建 mipmap。
- **寬廣角時天花板軌道工作燈的燈罩會在畫面上緣被切一半**：全貌和環的廣角時把燈罩藏起來（燈照樣亮），已在 `film.js` 處理。
- **`--stills 14.0` 存成 `t-14.jpg`**（小數點後的 0 被吃掉）；批次改名先轉成數字。
- 雲端機器用的是專案內的 `stage.js`，不要改成 `/lib/stage.js`。
- 機器同時有別的片在算時，每格秒數會變 2～3 倍，是正常的。

## (f) 不要動（認可過的外觀）

- **燈**：窄角太陽聚光燈只從窗戶進來（百葉窗影子＝條紋）；天花板軌道工作燈照正在讀的案件；檯燈暖光；螢幕冷光；夕陽掃光；回想時百葉窗闔上、工作燈收成一束。燈的種類、角度、陰影設定不要換。
- **軟木板**：軟木貼圖、木框、紙卡的紙感和微傾斜、圖釘（紅／藍／黑／黃銅）、紅線的粗細和垂墜。
- **調色**：亮部偏暖、暗部偏青、暗角、底片顆粒、景深的味道。
- **鏡頭的手感**：先讀牆、再移到螢幕；轉場秒數（1.6～2.4）；停住時緩慢推近（`camAt` 的 breathe）；牆上鏡頭的取景留出下方 140 px。
- **回想的儀式**：題目讀完才出現 6 秒倒數、揭曉至少 8 秒、卡片在揭曉時翻面。
- 可以換的是字、案件內容、演示內容、顏色以外的「數字」（案件數見 (c) 的提醒）。
