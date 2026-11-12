# 外殼：回到那個房間（rooms）

來源：〈回到那個房間・九月〉（ep-sep）的生產檔，使用者看過成片、認可。這一版取代第一輪（五到七月）的舊 rooms 程式（舊版在 git 歷史裡）。

## 1. 這個外殼是什麼、給出什麼畫面

一棟**剖開的娃娃屋**（4 層 × 3 間 = 12 間，轉台上）。鏡頭從屋外全貌俯衝，**穿窗進到其中三間**，每間是第一人稱的書桌：月曆、筆記本、螢幕、白板、便利貼、檯燈。

- **窗外的光依季節與時段不同**：房間 1 是九月午後斜陽（體積光穿過窗格）、房間 2 黃昏到入夜、房間 3 月光；片頭從十月底（秋）退回九月。
- **螢幕演示「問題正在發生」**：進門時螢幕就在演（兩人同時推同一張單、進度條卡住、一張需求配三台機器）。
- **回想時燈熄**：房間暗下，只有白板自發光，一顆光點沿白板走一遍、停在題目上；揭曉時光點走完答案那條路。
- **片尾**：只有走過的三間亮著，一條光線從房子底下繞到下一間（下一支片的入口）。
- 另有：全貌的名牌拉光線到房間、快問前九間房間升空洗牌換位。
- 參考圖：`../../looks/rooms-*.jpg`（舊版）；ep-sep 的畫面見 `../../demos/stills/ep-sep-*.jpg`。

## 2. 檔案地圖

| 檔 | 管什麼 |
|---|---|
| `scene.html` | 殼：CSS（字層、全貌名牌、回想疊層）、`<canvas id=gl>`（比畫面大一圈，景深不露黑邊）、載入 `film.js`。字型靠 studio 的 `/node_modules/@fontsource/*` |
| `film.js` | 主程式：場景組裝、**鏡頭關鍵格**、光與天空的時間軸、全貌光線、回想疊層、洗牌；`window.renderAt(t)`、`window.studioReady`、`window.__glTime` |
| `content.js` | **所有字和時間的唯一來源**：`TL`、`WARP`、`B`、`TEXT` |
| `demos.js` | **每個面上畫什麼**（t 的純函數）：3 台螢幕、3 面白板、筆記本、月曆、便利貼、門牌 |
| `world.js` | 房子、房間、家具、窗外天空貼圖、體積光、灰塵 |
| `surfaces.js` | 把 2D canvas 畫面貼到 3D 物件上；螢幕疊字 |
| `draw.js` | 2D 小工具（`text`、`wrap`、`box`、`arrow`、`code`、`card`、`check`、`cross`…）與配色 `C` |
| `post.js` | 柔焦＋檯燈泛光 |
| `lib.js` | `prog`、`ease`、`rng`、`QS`、`NOTEXT`、`ndcToPx` |
| `img/*.png` | 筆記自己的圖（已轉成 PNG 當貼圖）；`film.js` 的 `imgList` 指到它們 |
| `fonts/JetBrainsMono-*.ttf` | 程式碼字型。**studio 的 npm 沒有這個字型**，所以隨外殼帶著（其他字型由 studio 提供） |
| `check_reading.mjs` | 閱讀時間檢查，並輸出 `onscreen.txt` |
| `CONTENT.md`／`DEMO.md`／`STORYBOARD.md`／`NOTES.md` | ep-sep 做片時的四份文件，當範例：內容十項、每個概念的演示設計、時間軸、製作紀錄 |

## 3. 換內容的地方

**時間單位**：`content.js` 的 `TL`、`B`、`TEXT` 和 `demos.js` 裡的秒數是「故事秒」；真正算圖的 `t` 是「成片秒」，`window.renderAt(t)` 會先 `warp(t)`。`--stills` 給的是**成片秒**。

### 3.1 內容（字）：`content.js`
- `TEXT`：每一條字一個物件 `{ id, t0, t1, kind, use, text, sub, src, card, tex, dup }`。`kind: 'dom'` 是疊在畫面上，`'world'` 是畫在房間裡的物件上（`where` 寫在哪個物件）。`tex: true` 是紋理（不要求讀完）、`dup: true` 是重複。`demos.js` 都用 `T['<id>'].text` 取字，所以**換字只改這裡**。
- 主題名／樓層名：`over.f1`–`over.f4`（樓層標籤，`text` 是樓名，`sub` 用「・」隔開各間主題名＝紋理）；`over.n1`–`over.n3`（亮燈的三個名牌）。
- 回想與揭曉：`rN.recall.q`／`rN.recall.a`（`src` 是出處筆記）；快問 `quiz.q1/a1/q2/a2`。
- 片頭 `open.*`、片尾 `end.*`。

- **語言**：`content.js` 開頭的 `LANG` 是影片語言，`UI_SETS` 是外殼固定的介面字（片頭提示、亮燈那句、快問前那句、片尾那句、是／否、出處括號）。其他語言加一組。
- **換語言時要自己改的字**：
  - `demos.js` 裡白板卡片的 `short`、`sub`（短名）；候選字 `cands`。
  - `dive.cal`（月曆的月份）字要短，字級 170px、月曆很窄。
  - 演示會用符號切開內容字串（`／`、`・`、`：`、`；`、` → `、全形括號）：換語言時這些分隔符要留著，否則切不出來會少字或出錯。
  - `demos.js` 裡的 `.replace('只有', …)` 等是中文換行提示，換語言後不作用，要換行自己加 `\n`。
  - LLM 候選字的演示（`r3.sig3.tiles`、`r3.llm.cands`、`r3.out.items` 的第三項）把字串一個字元一格排開，拼音文字要改成一個詞一格。

### 3.2 時間：`content.js`
- `TL`：各段的故事秒範圍；`B`：每間房內的拍點（`ctx` 情境、`q` 問題、各小節、`recall.{q,c0,c1,end}` 回想題／倒數起／揭曉／結束、`wrap` 收束、`out` 離開）。
- `WARP`：成片秒 → 故事秒的分段線性表（字多的段放慢、只有動畫的段收緊）；`DURATION`＝最後一格。改字後用 `node check_reading.mjs <專案資料夾的絕對路徑>` 檢查讀得完，不夠就加長 `WARP` 對應段。

### 3.3 每個面上演什麼：`demos.js`
- 房間 1／2／3 各一組：`drawMon1/2/3`（螢幕）、`drawBoard1/2/3`（白板）；共用 `drawNotebook`（筆記本，寫情境）、`drawCalendar`、`drawPlate`（樓層牌）、`drawSlip`（便利貼／紙條）、`drawLaptopIdle`。
- 螢幕依 `B` 的拍點切換子畫面（例如 `drawMon1`：`idleR1` → `monEntity` → `monService` → `monAggregate`）。換主題＝重寫這三個螢幕函數和三個白板函數，改用你的 `T[...]`。可重用的演示元件清單見 `../../demos/_ep-sep.md`。
- 筆記自己的圖放 `img/`，在 `film.js` 的 `imgList`（約 45 行）登記，用 `img(ctx, key, …)` 畫。

### 3.4 「旋鈕」（沒有集中成單一設定，要照下表找）

| 想改 | 在哪 |
|---|---|
| 樓層數、每層間數 | `world.js` 的 `NF = 4`、`NC = 3`；同時 `tones`（12 個牆色）、`film.js` 的 `ROOMSKY`、`ORDER`、`NEW_SLOT`（都是 12 個）要跟著改；樓名 `over.f*` |
| 哪幾間有桌子可走進去 | `world.js` 的 `STATION_IDS = [0, 1, 3]`（房間編號＝樓層×3＋欄）；`film.js` 的 `RK`、`ST`（`r1/r2/r3` 對應哪個房間編號） |
| 全貌時哪幾間亮燈 | `film.js` 的 `LIT_ROOMS`、`PILL`（名牌 → 樓層、房間、光線秒數）、`floorGlow()` 的 `[11, 14, 17, 20]`（四個樓層標籤依序亮起的秒數） |
| 走進幾間、走進去的時間 | `film.js` 的 `INSIDE`（房間、起、止）、`RECALLS`（五段回想的拍點）；`KF`（鏡頭關鍵格，`k(秒, 房間, 鏡位, 視角)`） |
| 鏡位 | `film.js`：`faceOf(房間, 物件, 距離, u, v)` 讓鏡頭面對螢幕／白板／筆記本的某一點；`deskView()`；`orbit()` 繞屋 |
| **季節與時段（窗外）** | `film.js` 的 `ROOMSKY`（12 間各自的天空）、`skyFor()`（轉場：片頭秋→九月、房間 2 的黃昏→夜）；天空預設 `world.js` 的 `SKY`：`lateAft` `dusk` `night` `autumn` `morning` `deep` `neutral` |
| **室內光** | `film.js` 的 `preset(名稱)`：`r1`（午後，`sunI 6.2`、`shaftI 1.0`）、`r2dusk`（0.6）、`r2night`（0.18）、`r3`（月光 0.32）、`dark`（回想）、`quick`（快問）、`end`；`ENV` 是「哪個秒用哪個 preset」的表 |
| 回想時燈熄 | `darkAt()`＋ `preset('dark')`；白板的暖光點 `GLOWPOS`；`recallUI()`（題目底板、倒數圈、揭曉卡） |
| 窗外風景／月曆 | 天空貼圖在 `world.js` 的 `buildSky()`；月曆 `drawCalendar`（年份「2026」**寫死在 `demos.js`**，月份讀 `content.js` 的 `dive.cal`） |
| 洗牌換位（快問前） | `film.js` 的 `ORDER`、`NEW_SLOT`、`LIFT_T`、`LAND_T` |
| 片尾 | `film.js` 的 `RELL`（光線）、`HOP`（虛線小弧）、`end.*` 的字 |

**寫死的時間要一起改**：`film.js` 裡還有幾組直接寫成故事秒的數字：`floorGlow`（38.5、527、530.6）、`skyFor`（39–44、240–300、480.6–482.6、527.5–529.5）、`quickAt`（486.6、527）、`applyRooms`（170–192 的側門鄰房）、`renderAt` 結尾的黑場（7.6、539.6）；`demos.js` 的 `RUNS`（345.6…）。**時間軸一動，用 `grep -n` 找這些數字**。

## 4. 怎麼試

```bash
STUDIO=<你的工作資料夾>          # 有 render.cjs、node_modules（three、@fontsource/*）
cp -r .claude/skills/engram-quest-episodic-review/assets/shells/rooms $STUDIO/projects/<id>
cd $STUDIO
RENDER_GPU=1 node render.cjs projects/<id> --stills 147.8     # 成片秒；輸出 projects/<id>/stills/t-147.8.jpg
```

- **一定要 `RENDER_GPU=1`**（WebGL）。起動約 20～40 秒，之後每張約 1～3 秒；算全片每格約 0.7～1.6 秒（白板的 2560×1448 貼圖和體積光最貴）。
- 遮字版：`--scene "scene.html?notext=1"`。網址參數：`aa=1` 抗鋸齒、`smap=` 陰影解析度、`sh=0` 關陰影、`w=` GL 寬（預設 1600）、`noshaft=1` 關體積光（**只用來量時間，成片要開**）。
- 閱讀檢查：`node projects/<id>/check_reading.mjs $PWD/projects/<id>`（要給**絕對路徑**；會寫 `projects/<id>/onscreen.txt`）。
- 場景只讀專案資料夾、`/node_modules/`；**不用 studio 的 `/lib/`**（`lib.js` 在專案裡）。字型：Noto Sans TC、霞鶩文楷、Inter 來自 studio 的 npm，JetBrains Mono 來自 `fonts/`。

## 5. 這個外殼已經踩過的坑

1. **螢幕疊字被誤判成「佔滿畫面」而整格柔焦**：螢幕在鏡頭旁邊、投影座標很大時，會被當成螢幕佔滿畫面。`surfaces.js` 的 `place()` 現在要求螢幕中心在畫面內。
2. **字發糊、有光暈**：泛光門檻 0.72 太低，亮紙也被泛光。現在 `post.js` 的 `thr` 0.88、`film.js` 的 `bloom`（約 483 行）房內 0.42。
3. **回想時白板中間一團亮斑**：暖光放太近（35 公分）、白板太光滑。現在光在 1.1 公尺外（`GLOWPOS`）、白板粗糙度 0.62（`world.js` 約 336 行）。
4. **英文字被拆行**（「LL／M」）：`draw.js` 的 `wrap()` 英文字、數字連在一起不切。
5. **回想題要「白板自發光反而提高」**：整個房間調暗但白板亮（0.16 → 0.32），題目放深色底板上，鏡頭往下讓出位置；不要整個畫面調暗。
6. **不要用 studio 的 `/lib/`**：曾與專案內的 `lib.js` 衝突；現在場景只用專案內的 `lib.js`。
7. **字出現在下一個畫面之前沒讀完**：段落結束前 3 秒淡入下一張圖，會蓋掉還在讀的字。改字量一律先跑 `check_reading.mjs`（規則：新出現的字數 ÷ 5 ＋ 每張 7 字以上的卡 1.5 秒；揭曉至少 8 秒；倒數至少 6 秒）。
8. **字型子集沒載入就變成備用字型**：`film.js` 的 `ALLTXT`（約 528 行）把 `TEXT` 的字加上一串寫死在 `demos.js` 裡的字一起載入；**新增寫死在 `demos.js` 的中文字時，要加進 `ALLTXT` 那串**。
9. **螢幕演示必須在鏡頭看得到的時候演**：鏡頭不在螢幕上的時段，演示在跑但沒人看到；演示的起點要對齊 `KF` 裡「面對螢幕」那一格。
10. **`--stills 14.0` 檔名是 `t-14.jpg`**（小數點後的 0 被吃掉）。
11. 閱讀速度的底：這一版是「新出現的字 ÷ 5 秒」，全片 1,930 字、88 張卡、9:56；字再多就超過十分鐘。

## 6. 不要動的（已認可的外觀）

- 剖面娃娃屋、轉台、屋頂與屋外全貌的構圖；穿窗進房的鏡頭手法、第一人稱書桌（桌上有書、筆筒、紙、耳機、檯燈、馬克杯，後牆有月曆、便利貼、時鐘）。
- 窗光的畫法：**房間內方盒上逐像素沿視線積分的體積光**（有窗框影子、邊緣柔和）、灰塵、柔焦與泛光；各時段的色溫與強度（午後 1.0、黃昏 0.6、入夜 0.18、月光 0.32）。
- 回想時燈熄＋白板自發光＋光點走流程的手法；揭曉卡與倒數圈的版面。
- 螢幕的深色 UI 風格、配色 `C`、白板的米白底與筆跡質感。
- 全貌的「名牌拉光線到房間、到了才亮燈」、片尾「只有走過的房間亮著、光線從房子底下繞過去」、快問前的洗牌換位。
- 不要把內容的字寫進 `film.js`／`world.js`；換主題時改 `content.js` 和 `demos.js`，外觀程式留著。
