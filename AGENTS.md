# EngramQuest Plugin Repo

此資料夾是 EngramQuest 的獨立 source repo，已和 Obsidian vault 分離。

## 路徑基準

- Repo root: `obsidian-plugin-engram-quest/`
- Source entry: `src/main.js`
- Build output: `main.js`
- Skills source: `skills/`
- Generated runtime skills artifact: `bundled-skills/`
- Runtime install dir: `../Obsidian_Note/.obsidian/plugins/engram-quest/`
- 規格與規劃文件: `doc/開發計劃/`
- 當前狀態摘要: `doc/now.md`

## 目前架構

- `src/main.js` 仍是唯一 entry，但不是乾淨的小型手寫 source，而是歷史延續下來的 monolithic bundle-style source。
- 目前採用漸進式拆解：低風險邏輯已抽到各 `src/` 子模組，再由 `src/main.js` 尾端接回 runtime。
- release 形式不變，仍然只產出單一 `main.js` 供 Obsidian runtime 使用。
- 成功條件是 runtime 行為與 build contract 不變，不是要求 source 立刻完全重寫。

## 已拆出的模組

- `src/skills/installer.js`
- `src/harness/map.js`
- `src/quest/helpers.js`
- `src/quest/render.js`
- `src/quest/modal.js`
- `src/review/helpers.js`
- `src/review/decks.js`
- `src/review/render.js`
- `src/review/modal.js`
- `src/review/session.js` — Review session modal（Q class）
- `src/i18n/index.js` — i18n 字典 + 翻譯函式
- `src/fsrs/index.js` — FSRS-5 演算法（純數學，無 Obsidian 依賴）
- `src/styles/index.js` — 插件 CSS 字串
- `src/hub/settings.js` — Settings tab（pe class）
- `src/hub/skills.js` — Skills install/preview modals（ce, de）+ 安裝 helpers
- `src/hub/help.js` — Help modal（fe class）

## 仍在 `src/main.js` 的部分

- Legacy `engram-quest` block processor（ze, Ee, ue, Ge, B, qe, Pe）
- Harness map 資料（q[], ae, H[], Ue）
- Quest theme colors（Y）
- 已拆模組的 inline 殘留（由底部 reassignment section 覆蓋）
- Hub modal shell 與 tab 切換（`ne` class）— 最後大型 UI 區塊
- Plugin bootstrap 與 `onload`（`he` class）— 不動

## 開發原則

- 不要直接手改 repo 根目錄的 `main.js`。
- `src/main.js` 是唯一 source entry。
- 要拆功能時，優先抽純函式、render、modal，再考慮動 plugin bootstrap。
- Runtime 只吃 `main.js`、`manifest.json`、`versions.json`、`assets/`、`bundled-skills/`、`scripts/`、`skills-installer-assets.js`。
- `data.json` 是 runtime state，不納入 source repo。
- 避免 `console.log`，改用 `console.debug` / `console.warn` / `console.error`。

## 測試

- Framework: vitest
- 測試檔: `tests/i18n.test.js`（23 tests）、`tests/fsrs.test.js`（20 tests）、`tests/review-session.test.js`（3 tests）
- Obsidian API mock: `tests/__mocks__/obsidian.js` + `node_modules/obsidian/` stub
- 執行: `npm test`
- 目前 46 tests 全部 pass。
- 新增模組時應同步新增對應測試。

## Skills 與建置

- `skills/` 是開發中的 source of truth。
- `bundled-skills/` 是由 `skills/` 生成的正式 repo 產物，也是 release/runtime 內容的一部分。
- 修改 skills source 後需更新 `bundled-skills/`：
  `npm run sync:bundled-skills`
- 一般 build：
  `npm run build`
- 要同步到本機 Obsidian runtime：
  `npm run build:sync`

## 驗證流程

- bundle parity 檢查：
  `npm run check:bundle-parity`
- runtime deploy：
  `npm run sync:vault`
- 測試：
  `npm test`

## Backup

- `tmp/refactor-backup/main.js.bak` — 重構前原始備份
- `tmp/refactor-backup/main-post-i18n.js.bak` — i18n 拆出後
- `tmp/refactor-backup/main-post-fsrs.js.bak` — FSRS 拆出後（目前 baseline）
- 確認穩定前不要刪除備份。

## 目前文件約定

- `doc/now.md` 只寫當前仍成立的事實，不保留過時過程描述。
- 如果架構或 build 流程有變，需同步更新：
  - `AGENTS.md`
  - `CLAUDE.md`
  - `README.md`
  - `doc/now.md`
