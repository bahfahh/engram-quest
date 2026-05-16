<div align="center">

[![English](https://img.shields.io/badge/English-README.md-blue?style=flat-square)](README.md)

# 🗺️ EngramQuest

**把筆記刻進記憶。**  
*不只是紀錄，是你腦中的軌跡。*

從你的 Obsidian 筆記生成複習卡片與闖關地圖，讓 AI 增強記憶連結，用 FSRS 間隔重複讓知識真正留下來。

![EngramQuest Hub](assets/hub-dark.png)

[![GitHub Release](https://img.shields.io/github/v/release/bahfahh/engram-quest?style=flat-square)](https://github.com/bahfahh/engram-quest/releases)

</div>

---

## 💡 為什麼選 EngramQuest？

Anki 解決的是「什麼時候複習」。EngramQuest 解決的是「怎麼真正記住」。

- **L2 情境錨定** — AI 搜索你的 vault，找到你當初學這個知識時已經知道的東西，重建那個理解的瞬間。其他閃卡工具做不到這件事。
- **FSRS 演算法** — 比 Anki 的 SM-2 更新、更準確。間隔根據你的實際回想表現調整，不是固定乘數。
- **Quest Map** — 把枯燥的長篇筆記變成遊戲化的島嶼關卡。你主動挑戰，不只是重複閱讀。

---

## ✨ 核心功能

### 🃏 Review Deck — 複習更少，記住更多

![Review Deck Hub](assets/review-deck-hub.png)

三段漸進式回憶系統，建立真正的記憶，而不只是熟悉感：

![L1 L2 L3 提示運作中](assets/review-hint.png)

| 階段 | 作用 |
|---|---|
| **L1 主動回憶** | 只顯示問題 — 強迫大腦先搜尋，才能看任何提示 |
| **L2 情境錨定** ⭐ | AI 在你的 vault 找到相關筆記，重建你當初學這個知識的場景。Anki 做不到。 |
| **L3 縮小範圍** | 給出關鍵詞方向作為最後手段 — 永遠不直接給答案 |

- **FSRS 排程** — 間隔根據你的實際回想表現自動調整
- **AI 卡片獨立存放** — 生成的卡片存在 `engram-review/`，AI 不會修改你的原始筆記
- **編輯寫回筆記** — 複習中的高亮與編輯功能直接寫回原始筆記，讓它始終是唯一真相
- **自動偵測** — 任何帶有 `#flashcards/主題` tag 的筆記都會被自動掃描
- **來源筆記連結** — 複習途中可跳轉到原始筆記查看脈絡，看完直接回到剛才的卡片

### 🗺️ Quest Map — 把筆記變成闖關地圖

![Quest Map 島嶼全覽](assets/quest-map-overview.png)

![Quest 挑戰進行中](assets/quest-challenge.png)

將任意筆記轉化為遊戲化的島嶼地圖，直接嵌入 vault 成為一個 `.md` 檔案。

- **5 種挑戰題型：** 選擇題、Cloze 填空、排序題、連連看，以及**圖片遮蔽題**（把你 vault 裡的圖片局部遮住當題目）
- **難度分級：** Easy / Medium / Hard — 告訴你的 AI 你需要哪個等級
- **5 種視覺主題：** Sky Island、Sci-Fi、RPG、Ocean、Minimal
- **Boss Battle** — 每個章節末的掌握度測驗

### 🏆 成就系統

![成就收藏](assets/achievements.png)

用 3D 渲染圖示與稀有度分級記錄你的學習里程碑。

- **10 個里程碑：** 從第一張卡片到累計 2,000 次複習、連續 30 天學習、精通 50 張卡片等
- **稀有度分級：** Uncommon（UC）→ Rare（R）→ Legendary（LEG）— 越稀有的成就有發光邊框
- 點擊任何成就卡片查看進度資料、活動日曆和每日複習紀錄

### 🧠 Memory Map — 看見知識的全貌

![Memory Map 脈絡](assets/memory-map-context.png)

利用 Obsidian Canvas 將抽象概念具象化。

- AI 生成視覺化知識圖譜 — 透過對比、類比與情境錨定讓抽象主題真正被理解
- 任何命名為 `{筆記名}-memory.canvas` 的檔案都會自動出現在 Hub → Memory Map
- 複習時，Memory Map 按鈕會自動尋找並開啟對應的 canvas

### 🌙 深色模式

![深色模式極光背景](assets/bg_dark.webp)

完整自動偵測主題，無需手動切換。Hub、複習介面與成就頁面全部根據主題自動切換對應圖片。

---

## ⚡ 快速上手（AI 路徑）

1. **安裝外掛** — [直接在 Obsidian 中開啟](obsidian://show-plugin?id=engram-quest)，或在社群外掛商店搜尋 **EngramQuest**，或從 [GitHub Releases](https://github.com/bahfahh/engram-quest/releases) 下載。
2. **安裝 Skills** — 前往 `設定 → EngramQuest → AI Skills`，選你用的工具（Claude Code、Gemini CLI、Cursor 或 Codex）點 **Install**。
   ![安裝 Skills](assets/install-skills.png)
3. **告訴 AI** — *「把 `筆記名稱.md` 做成 quest-map medium」* 或 *「把 tag:math 的筆記做成 review deck」*。
4. **開 Hub** — 點側邊欄的 EngramQuest 圖示，切到對應分頁，開始學習。

---

## ✍️ 自己手動寫卡（不需要 AI）

加一個 `#flashcards/主題` tag，選一種格式。三種格式可在同一篇筆記裡自由混用：

| 格式 | 適合 | 寫法 |
|---|---|---|
| 🟢 `Q:/A:` 問答 ⭐ | **日常推薦格式。** 多行答案、圖片、表格、程式碼 | `Q: 問題` → `A:` — 兩個連續空行代表卡片結束 |
| 🔵 `---` fenced 問答 | 答案內有空行的既有筆記 | 前後各一行 `---` 包住 `Q:/A:` |
| 🟡 `%%card%%` 長答案 | 貼上可能含 `---` 分隔線的 AI 長回答 | 前後各一行 `%%card%%` 包住一張卡 |
| 🧩 `{{c1::}}` 填空 | 填空記憶，Anki 相容 | `{{c1::答案}}` 或 `{{c1::答案::提示}}` |
| ⚪ `::` 一行問答 | 僅限簡短單行答案 | `問題 :: 答案` |

<details>
<summary>查看卡片格式範例</summary>

```
#flashcards/學習科學

Q: 間隔重複的原理是什麼？
A: 在快忘記時複習，可以用最少時間達到最高記憶保留率。
   每次成功回想後，下次複習的間隔會自動拉長。

Q: 這張圖表示什麼？
![[diagram.png]]
A: 微服務系統的架構圖。

---
Q: Stripe 的核心模型是什麼？
A: Stripe 本質是一個 Saga System。
   它處理 payment_intent 狀態機、retry / failure handling
   和資金一致性。你只要「接結果」。
---

%%card%%
Q: 如何解釋 agentic testing？
A:
Agentic testing 檢查的是 AI 系統能不能可靠完成任務。
---
這個分隔線保留在答案裡。
%%card%%

{{c1::間隔重複}} 是最有效的長期記憶方法之一。

畢氏定理 :: a² + b² = c²
```

> **提示：** 在空行按 `Ctrl+/`（Mac 是 `Cmd+/`），Obsidian 會插入 `%% %%` 並把游標放在中間。輸入 `card` 就成了 `%%card%%`。

</details>

---

## 🔬 為什麼有效？

EngramQuest 建立在四大認知科學原理上：

| 原理 | 對應功能 |
|---|---|
| 間隔重複 | FSRS 在最接近遺忘的時刻安排複習 |
| 提取練習 | L1 在顯示任何提示前強迫主動回想 |
| 情境錨定 | L2 把每張卡片錨定到你 vault 裡已有的知識 |
| 精細編碼 | Memory Map 為抽象概念建立視覺結構 |

---

## ❓ 常見問題

**Q: 我一定要用 AI 嗎？**  
不需要 — 很多使用者根本不用 AI。用 `::` 問答、`Q:/A:` 或 `{{c1::}}` 在任何筆記裡寫卡片，加上 `#flashcards/主題` tag，插件就會自動偵測。

**Q: 我的學習進度存哪裡？**  
複習排程資料存放在 vault 內的 `engram-review/sr/` 資料夾，以 JSON 格式儲存。AI 生成的卡片在 `engram-review/ai-cards/`，兩者都不會修改你的原始筆記。

**Q: EngramQuest 支援 Anki 嗎？**  
部分支援。`::` 和 `{{c1::}}` 格式與 Anki 相容，可搭配 **Obsidian_to_Anki** 社群插件使用。`Q:/A:` 格式是 EngramQuest 專屬（多行富文本答案），不會同步到 Anki。

**Q: 如何讓 AI 每次建立 Review Deck 時都依照我想要的固定模式？**  
用高亮 `==文字==` 或粗體 `**文字**` 在筆記中標記重要答案，再到 AI 設定檔（`CLAUDE.md`、`GEMINI.md` 或 `AGENTS.md`）加入規則：
> `IMPORTANT: When building a Review Deck, every highlighted ==text== must be turned into a review card.`

---

## ☕ 支持我的工作

如果 EngramQuest 對你有幫助，歡迎贊助支持開發：

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/wen_aidev)

---

*為終身學習者打造。Made with ❤️*
