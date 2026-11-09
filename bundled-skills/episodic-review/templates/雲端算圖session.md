# 雲端算圖：一支片依片長分給 1～3 個 session

> 第三輪實測：雲端一個 session 同時算約 4 段（`nproc`），每段約 1,300 格、45～50 分鐘（約 2.2 秒／格，含 4 段搶 CPU）。一支 10 分鐘的片切 12 段時，一個 session 要三輪、約 2.3 小時，會撞到背景工作 2 小時的上限。
> **每個 session 只排一輪**（≤ 4 段、預計 ≤ 90 分鐘）：背景工作撞到 2 小時上限後，session 不會自己重跑，會停下來等人確認，沒算完的段就卡住。第三輪原本一個 session 排 12 段，結果兩支片在第 5～8 段卡住，只好再開 session 補算。
> **開始時就分好**：雲端 session 開始後，不會照其他 session 傳來的訊息改任務（它只聽使用者的），所以中途不能叫它停在第幾段。
> **單檔超過 100MB 推不上去**（第三輪 9 月：一段 104.8MB 被 GitHub 拒收，之後每次 push 都被那個 commit 擋住）：`farm.sh` 現在把超過 90MB 的段切成 45MB 的塊（`pNN.mp4.part00`…，附 `.sha256`）再推，`join_parts.sh` 接片前合回去，片子不變；推失敗也算未完成，不會再印 ALL DONE。
> **session 停下來問問題時，其他 session 的回答它也不收**（它只聽使用者的）。不要等它：把卡住的段重算。**每段的速度是固定的**（約 0.35 格／秒），平行只在段與段之間，所以補算時切小：一段切 4 小段（`p08a`…`p08d`，約 300 格），一個 session 排 4 小段，約 20 分鐘到齊。`join_parts.sh` 在 `pNN.mp4` 不存在時會用 `pNNa`、`pNNb`… 依序接上。
> **做法**：一個 session 一輪排 4 段、約 225 秒的片，所以短片（約 3 分半）通常 1 個 session、中片 2 個、長片（約 10 分）3 個（片長是範圍，超過就多一個），同時開、各算一輪，牆鐘約 40～70 分。短版要草稿大小時，在 farm.sh 前加 `FARM_WIDTH=1280`。`python3 scripts/plan_parts.py <片長秒數> --sessions auto --out-prefix <路徑>/parts-<id>` 一次產出每個 session 的清單（`parts-<id>-a.json`、`-b.json`……）和總清單。每個 session 的 outcome_branch 不同（`<工作分支>-<id>-a/b/c`），收回時每個分支都要抓。片長三檔見 `reference/10-片長與成本.md`。

主持人先把專案（`scene.html`、程式、素材，不含大檔的 mp4）存進 vault 的 `<研究資料夾>/各片/<id>/製作檔/`，加上每個 session 的清單 `parts-<id>-a/b/c.json`（`scripts/plan_parts.py <片長秒數> --sessions auto --out-prefix …`），commit、push 到工作分支。

create_session：source_url `https://github.com/<owner>/<repo>`、source_revision `<工作分支>`、outcome_branch `<工作分支>-<id>`、clone_depth 1、**sparse_checkout_paths**（skill 資料夾和這支片的資料夾，clone 快很多）、title `Render: <id>`、tags `["episodic-render"]`。

prompt：

```
This is a mechanical render job for a film another session prepared. Make no creative or content changes.

1. In the repo root, run this as a background command (Bash with run_in_background: true, timeout 7200000):
   bash .claude/skills/engram-quest-episodic-review/scripts/farm.sh "<製作檔 path>" "<parts json path>" 24
   It sets up a render studio in /tmp/studio (npm install; headless Chromium), renders the parts several at a time,
   and commits and pushes each finished part by itself. Wait for its completion notification; do not poll with sleep.
2. If it ends with "INCOMPLETE" or "npm install failed": read the FAILED part's log if there is one, fix only environment problems (missing package,
   etc.), and run the same command again (finished parts are skipped). Repeat until "ALL DONE".
   Do not edit scene files or render.cjs.
3. When it prints "ALL DONE", reply with one line: that line and the last pushed commit hash.
```

收回來：`git fetch origin <工作分支>-<id>`，把 `成片/pNN.mp4` 取出來（一支片約 1.6 萬格時切 12 段，背景工作 2 小時會被砍，重跑會跳過算好的段），`scripts/join_parts.sh <成片資料夾> <narration.wav> final.mp4`，逐一看接縫，然後封存那個 session。
