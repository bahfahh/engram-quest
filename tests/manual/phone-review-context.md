# 手機版複習卡：分類資訊列（commit f3a9b77）

## 改了什麼
- 手機版複習卡，在題目正上方多一行小字：`牌組名稱（粗）  上層路徑（淡）  [僅瀏覽]  來源筆記 +N`。
- 每張卡自己記著所屬牌組（`src/review/decks.js` 掃描時寫入 `card.deckName`），
  「全部複習」、計時複習、影片重看這類混合 session 也會顯示卡片真正的牌組。桌面版標題同步改用卡片自己的牌組。
- 牌組名稱拆法共用 `splitDeckName()`（`src/review/helpers.js`），牌組列表和複習畫面一致。
- 樣式在 `src/styles/hub-pages.js` 的 `.lh-rc-ctx*`，邏輯在 `src/review/session.js` 的 `if(phone)` 分支。

## 自動測試
```bash
npm ci
# 測試需要內嵌資源（被 gitignore），沒有的話約 57 項會因缺資源而失敗，和本次改動無關
node scripts/sync-bundled-skills.js && node scripts/embed-skills.js && node scripts/embed-assets.mjs
npm test        # 預期：94 files passed, 1169 tests passed
```
新增測試：`tests/review-card-context.test.js`；`tests/review-decks.test.js` 加了 `card.deckName` 斷言。

## 本地實機測試（手機）
```bash
# vault 預設在 repo 旁的 ../Obsidian_Note，不同就設環境變數
export ENGRAMQUEST_VAULT_ROOT=/path/to/your/vault
npm run build:sync
```
然後在 Obsidian 重新載入插件（關掉再開，或 Reload app without saving），用手機打開 vault。

### 檢查清單
1. 進任一牌組開始複習：題目上方有一行小字，內容是該牌組名稱，約一行高，題目空間沒明顯變小。
2. 牌組名稱很長、路徑很深：牌組名稱最後才被截斷，先縮的是來源筆記，再來是上層路徑；整行不超出畫面、不換行。
3. 卡片有來源筆記：點該筆記名稱會打開筆記；有多個筆記時顯示 `+N`（完整清單仍在「⋯ 更多動作」）。
4. 「全部複習」進入：每張卡顯示自己真正的牌組，不是「全部」。
5. 計時複習、影片重看進入：同上，不顯示計時名稱或影片標題。
6. 「僅瀏覽」模式：標籤在同一行，不另外佔一行。
7. 按「顯示答案」：分類列仍在，題目縮小後版面正常。
8. 深色、淺色主題各看一次；有瀏海或圓角的手機看頂部不被遮住。
9. 平板或桌面：版面與以前相同，只有牌組標題改為卡片自己的牌組。

## 如果版面不喜歡
- 不要上層路徑：移除 `session.js` 中的 `lh-rc-ctx-path` 那一行。
- 不要來源筆記：移除 `lh-rc-ctx-src` 整段。
- 這行字級、間距：`hub-pages.js` 內 `.lh-rc-ctx`（font-size:12.5px、margin:-4px 0 -2px）。
