"use strict";
// Text of the Hub help dialog (the "?" button). help.js draws it; nothing here is code.
// Keep the Chinese object first and the English one second: tests read the text between the two keys.
//
// A section body is a list of blocks, each with one of these keys:
//   p      paragraph            h      sub-heading          note   aside in a soft box
//   steps  numbered list        list   bullet list          first  "first step" box
//   code   preformatted text    say    things to tell an AI tool
//   table  rows, the first row is the header
//   action "pro" (opens the Pro dialog) or "desktopPrompt" (copies the Claude Desktop setup prompt)
// Inline text may use <strong>, <em> and <code> only; write {configDir} for the vault config folder.

module.exports = {
  zh: {
    ui: {
      intro: "EngramQuest 把你的 Obsidian 筆記變成一個學習循環：學懂、練會、記住。所有功能都在 Hub 裡，分成三組：",
      introAi: "不用 AI 也能開始：手寫一張卡就能複習。想讓 AI 幫忙時，安裝 EngramQuest 的 skills，再用你平常的 AI 工具（Claude Code、Codex、Gemini CLI、Cursor）從筆記做出牌組、地圖、課程和影片。",
      guidesHint: "每個分頁第一次開啟都會跳出圖解說明。點下面任一項可以再看一次。",
      sectionsHead: "使用說明",
      openGuide: "看圖解說明",
      firstStep: "第一步",
      copyPrompt: "複製設定提示",
      copied: "已複製",
      copyFailed: "複製失敗",
      supportAsk: "覺得 EngramQuest 有幫助？",
    },
    groups: [
      {
        id: "memory", name: "記憶", desc: "把學過的留住",
        tabs: [
          { tab: "review", name: "Review Deck", sub: "間隔重複閃卡" },
          { tab: "explainer", name: "深入解析", sub: "難卡的白話圖解", pro: true },
          { tab: "memory", name: "Memory Map", sub: "用 Canvas 看見結構" },
          { tab: "episodic", name: "情境回顧", sub: "回到一段時間讀過的東西" },
        ],
      },
      {
        id: "learn", name: "學習", desc: "學新的、練應用",
        tabs: [
          { tab: "lesson", name: "教材", sub: "依你的目標排的互動課程" },
          { tab: "quest", name: "Quest Map", sub: "把筆記變成應用任務" },
          { tab: "video", name: "影片學院", sub: "一句話做成教學短片" },
        ],
      },
      {
        id: "achieve", name: "成就", desc: "看見累積",
        tabs: [
          { tab: "achievement", name: "成就系統", sub: "複習統計與徽章" },
        ],
      },
    ],
    sections: [
      {
        id: "start", icon: "arrow", title: "開始使用", tag: "從這裡開始",
        body: [
          { h: "不用 AI：一分鐘做出第一副牌組" },
          { steps: [
            "在任一筆記加上 tag <code>#flashcards/主題</code>。斜線後面就是牌組名稱，例如 <code>#flashcards/英文</code> 會建立「英文」牌組。",
            "在同一篇筆記寫一張卡：一行 <code>Q: 問題</code>，下一行 <code>A: 答案</code>。",
            "點左側功能列的 EngramQuest 圖示（打開的書）開啟 Hub，到 <strong>Review Deck</strong> 就會看到這副牌組，按「複習已就緒卡片」開始。",
          ] },
          { code: "#flashcards/英文\n\nQ: apple 是什麼意思？\nA: 蘋果" },
          { h: "用 AI：讓你的 AI 工具來做" },
          { steps: [
            "到 <strong>設定 → EngramQuest → AI Skills</strong>，按「安裝 skills」，選你用的工具。",
            "從這個 vault 的資料夾開啟 AI 工具，直接說你要什麼，例如：",
          ] },
          { say: [
            "把 tag:math 的筆記做成 Review Deck",
            "幫 作業系統概論.md 建立 memory-map",
            "我想學 SEO，幫我建一套課程",
            "把 微積分.md 做成 quest-map，medium 難度",
          ] },
          { p: "做好的內容會出現在 Hub 對應的分頁。" },
          { table: [
            ["工具", "Skills 安裝位置"],
            ["Claude Code", "<code>.claude/skills</code>"],
            ["Codex / Antigravity", "<code>.agents/skills</code>（兩者共用，裝一次就好）"],
            ["Gemini CLI", "<code>.gemini/skills</code>"],
            ["Cursor", "<code>.cursor/skills</code>"],
          ] },
          { note: "會安裝的 skills：quest-map、review-deck、memory-map、lesson-academy；有 Pro 再加 synapse 與 explainer。做影片的 animated-course 和做情境回顧片的 episodic-review（Pro）只裝到 Claude Code。插件更新後會自動更新已安裝的 skills（設定裡可關閉）；有新版還沒更新時，Review Deck 頁會出現提醒，按「更新 Skills」即可。" },
          { h: "沒有 terminal？用 Claude Desktop" },
          { p: "先讓 Claude Desktop 能讀寫你的 vault（例如官方的 filesystem MCP），再複製下面的設定提示貼進 Claude Desktop，跟著它走一次，大約兩分鐘。" },
          { action: "desktopPrompt" },
        ],
      },
      {
        id: "review", tab: "review", icon: "deck", title: "Review Deck", tag: "免費",
        body: [
          { p: "把筆記裡的問答變成閃卡。FSRS 演算法替每張卡排在你快忘記的時候複習；答得越穩，下次間隔拉得越長。" },
          { list: [
            "<strong>三階提示</strong>：想不起來時依序打開 L1 回想線索 → L2 當初的筆記 → L3 縮小範圍，最後才看答案。提示由 review-deck skill 產生，也可以在複習時自己編輯。",
            "<strong>評分</strong>：看完答案選「重來／困難／普通／簡單」，下次複習日立刻排好。",
            "<strong>邊複習邊修</strong>：編輯、高亮、引述會直接寫回你的原始筆記。AI 做的卡存在 <code>engram-review/ai-cards/</code>，不會動你的筆記。",
            "<strong>串到其他功能</strong>：有對應的 Memory Map 時一鍵打開；從影片來的卡可以「回看這段」。",
            "牌組可依全部／到期／新卡／已完成篩選，切換清單、格狀、資料夾三種檢視；牌組上的 ＋ 可以直接新增卡片。",
          ] },
          { first: "在筆記加 <code>#flashcards/主題</code> 和一張 <code>Q:</code>／<code>A:</code> 卡，或跟 AI 說「把 [主題] 的筆記做成 Review Deck」。" },
          { note: "免費。有 Pro 時這裡多三件事：Synapse 記憶錨點、限時複習（5／10／15 分鐘），以及把難卡加入深入解析佇列。" },
        ],
      },
      {
        id: "explainer", tab: "explainer", icon: "doc", title: "深入解析", tag: "Pro",
        body: [
          { p: "背不起來、看不懂的卡，交給 AI 寫成一頁白話圖解：先說這個概念解決什麼問題，再由淺到深拆開，最後回到你原本的卡片。" },
          { steps: [
            "複習時顯示答案後，按「加入解析佇列」（手機在「更多動作」選單裡）。",
            "跟 AI 工具說「處理解析」，engram-explainer skill 會讀佇列、判斷這張卡難在哪，批次寫好解析頁。也可以直接說「幫我做一份 X 的深入解析」。",
            "到 Hub 的「深入解析」分頁閱讀。頁面依牌組分組；開過就算已讀，可加星號、按 ✓ 標記完成，不要的可以刪除。",
          ] },
          { p: "解析頁沒有自己的複習排程：原卡照常在 Review Deck 複習，懂了沒有，下次複習見真章。原卡一直答錯時，skill 會換更淺的切入點重寫這頁。" },
          { first: "複習時對一張難卡按「加入解析佇列」，再跟 AI 說「處理解析」。" },
          { note: "需要 Pro。沒有授權時這個分頁不會出現在側邊欄。" },
        ],
      },
      {
        id: "memory", tab: "memory", icon: "map", title: "Memory Map", tag: "免費",
        body: [
          { p: "用 Obsidian Canvas 把一個主題畫成結構圖，串起你既有的筆記，抽象概念變得看得見。" },
          { list: [
            "vault 裡檔名以 <code>-memory.canvas</code> 結尾的檔案都會自動收進這個分頁，可搜尋、依 tag 篩選、排序，點一下就在 Obsidian 打開。",
            "AI 生成時預設存在來源筆記旁；在設定填「Memory Map 儲存資料夾」可以集中管理。",
            "複習卡片時按 Memory Map 按鈕，會找出屬於這張卡的地圖：同一個資料夾裡的 <code>-memory.canvas</code>、Memory Map 儲存資料夾裡的 <code>{筆記名}-memory.canvas</code>，以及含有指向這篇筆記檔案節點的地圖。AI 會自動放這個檔案節點，筆記改名或搬家也不會斷。",
          ] },
          { first: "跟 AI 說「幫 {筆記}.md 建立 memory-map」，或自己新增一個 <code>{筆記名}-memory.canvas</code>。" },
          { note: "免費。" },
        ],
      },
      {
        id: "episodic", tab: "episodic", icon: "recall", title: "情境回顧", tag: "觀看免費 · 製作 Pro",
        body: [
          { p: "情境回顧片把一段時間（通常一個月）讀過的筆記整理成一支動畫影片，帶你回到當時學到的東西。片子依期間分組，點了就播。" },
          { steps: [
            "按「+ 做新的一支」，選起訖月份與片長（短／中／長，會顯示大約幾分鐘、幾個主題）。",
            "插件記下這個需求並給你一段提示，貼進 Claude Code，episodic-review skill 就會開始做。",
            "做好的片子出現在這裡。還沒做完的需求列在上方，可以再複製提示或取消。",
          ] },
          { first: "按「+ 做新的一支」，選上個月，把提示貼進 Claude Code。" },
          { note: "觀看已經做好的回顧片免費。做新的回顧片需要 Pro，而且要用 Claude Code。" },
        ],
      },
      {
        id: "lesson", tab: "lesson", icon: "book", title: "教材", tag: "免費",
        body: [
          { p: "告訴 AI 你想學什麼，Lesson Academy skill 會先問你的目標和程度，再做一套互動式 HTML 課程，直接在 Obsidian 裡讀。程式、行銷、醫學、瑜珈，什麼主題都可以。" },
          { list: [
            "看完一課按「標記完成」，課程卡顯示進度；重要的課可以加星號。",
            "概念圖課時會在 Obsidian 原生 Canvas 分頁打開，可以拖拉、加自己的註記。",
            "「新增課程」可以先只排課綱（每行一個課名），之後再請 AI 補內容，進度會延續。",
            "「匯入 HTML」可以把別處做好的課程原樣放進來。",
            "課程多了可以搜尋、依 tag 或進度篩選、排序，不用的課程可以封存。",
          ] },
          { first: "跟 AI 說「教我 {主題}，建一套課程」，先回答它問你的目標和程度。" },
          { note: "免費。學完可以請 AI 把課程內容做成 Review Deck 或 Quest Map 繼續練。" },
        ],
      },
      {
        id: "quest", tab: "quest", icon: "flag", title: "Quest Map", tag: "免費",
        body: [
          { p: "把筆記變成應用任務：每一關是一頁互動畫面，可能是情境判斷、計算、診斷或模擬，最後用 Boss 戰檢驗你能不能把知識用出來。" },
          { list: [
            "難度分 easy／medium／hard；分頁上方顯示全部、進行中、Boss 已解鎖、已通關的數量，也能依難度、狀態、tag 篩選。",
            "任務存在 <code>engram-quest/quests/</code>，你的進度另外存在 <code>engram-quest/state/</code>，AI 更新任務時不會洗掉進度。",
            "舊版的 Quest Map 也還能照常打開。",
          ] },
          { first: "跟 AI 說「把 {筆記或主題} 做成 quest-map，{難度}」，再點任務卡開始。" },
          { note: "免費。" },
        ],
      },
      {
        id: "video", tab: "video", icon: "video", title: "影片學院", tag: "免費 · 更多老師 Pro",
        body: [
          { p: "說一句想學或想複習什麼，AI 會自己決定要讀哪些筆記、拆成幾支短片。外層是系列書架，點進系列就是播放器；看到哪裡都會記住，下次從上次的位置續播。" },
          { steps: [
            "按「新系列」寫下想學什麼，可以補充細節、讓 AI 自動挑筆記或指定筆記，也可以不用筆記。",
            "插件記下需求並給你一段提示，貼進 Claude Code，animated-course skill 就會開始做。",
            "做好的影片出現在書架上，可用觀看中、未開始、已看完、待製作篩選，也能搜尋或依 tag 找。",
          ] },
          { p: "「影片設定」設一次就好：老師、畫質、旁白語言、配音、字幕，以及要不要替每支影片附上複習卡。" },
          { first: "按「新系列」，例如寫「架設網站」，再把提示貼進 Claude Code。" },
          { note: "觀看與管理影片免費，Nico 老師免費。其他老師、替每個系列指定不同老師需要 Pro。做影片要用 Claude Code。" },
        ],
      },
      {
        id: "achievement", tab: "achievement", icon: "medal", title: "成就系統", tag: "免費",
        body: [
          { p: "看見自己的累積：累積複習張數、已掌握、總卡數、連續天數，一張熟悉度圓圈圖（已掌握／學習中／到期／未看），以及最近的複習活動長條圖。" },
          { p: "下方是成就收藏：複習量、連續天數、單日複習量、掌握張數，以及做 Memory Map、通關 Quest、完成課程都能解鎖徽章。點徽章看目前進度；在複習中解鎖時會當場提示。" },
          { first: "完成一次複習，回來看第一枚徽章。" },
          { note: "免費，不需要 AI。" },
        ],
      },
      {
        id: "pro", icon: "star", title: "Pro", tag: "US$11.99 一次買斷",
        body: [
          { p: "一次買斷，之後的 Pro 功能更新都包含。不升級也能繼續使用所有免費功能。Pro 加的是這四件事：" },
          { list: [
            "<strong>Synapse 記憶錨點</strong>：把難記的卡連到你已經掌握的相關卡。已掌握的卡（穩定度 7 天以上）累積到 10 張後，執行 engram-synapse skill；複習時有適合的錨點，卡片上才會出現 Synapse 按鈕。Review Deck 頁會提醒你何時該執行或更新。",
            "<strong>深入解析</strong>：難卡加入佇列，用 engram-explainer skill 生成白話圖解，在「深入解析」分頁閱讀。",
            "<strong>限時複習</strong>：在 Review Deck 頁的「定時」選 5／10／15 分鐘，以一張約一分鐘挑出那麼多張卡，順序是新卡 → 過期最久 → 最快到期。倒數到零會顯示「時間到」，但你可以把這輪做完，排程照常記錄。",
            "<strong>更多老師與情境回顧片</strong>：Nico 以外的影片老師、替每個系列指定老師，以及用 Claude Code 把筆記做成情境回顧片。看影片、管理影片學院、看已經做好的回顧片都免費。",
          ] },
          { h: "在哪裡升級、啟用" },
          { list: [
            "電腦：Hub 側邊欄最下方的 Pro 按鈕（未啟用時是「看看 Pro」，啟用後顯示「Pro 已啟用」）。",
            "手機：Hub「記憶」首頁最下方的 Pro 那一列。",
            "付款後從 Polar 複製 key，到 <strong>設定 → EngramQuest → EngramQuest Pro</strong> 貼上啟用，再重新開啟 Hub。",
          ] },
          { p: "啟用時只傳授權 key 與商品識別碼給 Polar，不傳筆記內容；驗證成功後最多可離線使用 14 天。移除本機授權不會刪除任何學習資料。" },
          { action: "pro" },
        ],
      },
      {
        id: "science", icon: "learn", title: "背後的學習科學", tag: "原理",
        body: [
          { list: [
            "<strong>間隔重複</strong>：在快忘記時複習，用最少時間留住最多。Review Deck 用 FSRS 排程。",
            "<strong>主動提取</strong>：先自己想，再看答案，比重讀有效得多。三階提示讓你在想不起來時只拿到剛好夠的線索；Quest Map 把提取放進真實情境。",
            "<strong>精緻化編碼</strong>：把新東西掛在已知的東西上。Memory Map 畫出結構，Synapse 把難卡接到你已掌握的卡。",
            "<strong>情境記憶</strong>：回到學習當下的情境比較容易想起來。L2 提示帶你回到當初的筆記，情境回顧片帶你回到那段時間。",
          ] },
        ],
      },
      {
        id: "settings", icon: "list", title: "設定", tag: "自訂",
        body: [
          { p: "在 Obsidian <strong>設定 → EngramQuest</strong>。" },
          { table: [
            ["設定", "做什麼"],
            ["EngramQuest Pro", "輸入授權 key 啟用 Pro，或移除本機授權。"],
            ["語言", "English、繁體中文，或跟隨 Obsidian。"],
            ["Flashcard tag 前綴", "哪些 tag 會被當成牌組，預設 <code>flashcards</code>。多個前綴用空白或換行分隔；牌組名稱取前綴後的第一段，<code>#flashcards/azure</code> 歸到 azure。"],
            ["納入舊版 <code>::</code> 筆記", "相容模式：沒有符合 tag 的舊筆記也依資料夾名稱成為牌組。預設關閉。"],
            ["最大複習間隔（天）", "間隔成長的上限，預設 36525。調小可讓熟卡定期出現。"],
            ["目標保留率", "FSRS 想達到的記住機率（0.70–0.99，預設 0.90）。越高複習越頻繁。"],
            ["Memory Map 儲存資料夾", "AI 生成的 <code>-memory.canvas</code> 存放處，留空則放在來源筆記旁。"],
            ["AI Skills", "替 Claude Code、Codex / Antigravity、Gemini CLI、Cursor 安裝 skills。"],
            ["自動更新已安裝的 skills", "插件載入時更新這個 vault 裡由 EngramQuest 安裝的 skills。"],
          ] },
          { p: "影片相關的設定在影片學院的「影片設定」裡。" },
        ],
      },
      {
        id: "faq", icon: "help", title: "常見問題", tag: "FAQ",
        body: [
          { h: "沒有安裝 skills 也能用嗎？" },
          { p: "可以。手寫卡片、複習、成就系統、觀看影片和已經做好的內容都不需要 AI。" },
          { h: "來源筆記沒有任何 tag，AI 讀得到嗎？" },
          { p: "讀得到。AI 讀筆記不需要 tag；它做的卡片會存在 <code>engram-review/ai-cards/</code> 並自帶 tag，你的原始筆記不會被改。" },
          { h: "為什麼看不到我的牌組？" },
          { list: [
            "筆記裡還沒有任何一張卡。",
            "筆記的 tag 不符合設定裡的 Flashcard tag 前綴。",
            "你用的是沒有 tag 的舊式 <code>::</code> 卡，但「納入舊版 <code>::</code> 筆記」還沒開。",
          ] },
          { h: "卡片有哪些寫法？" },
          { table: [
            ["格式", "適合", "寫法"],
            ["<code>Q:</code>／<code>A:</code>", "日常推薦。多行答案、圖片、表格", "<code>Q: 問題</code> 換行 <code>A: 答案</code>，答案可從下一行開始"],
            ["<code>---</code> 包住", "答案裡有很多空行", "前後各一行 <code>---</code> 包住一組 <code>Q:</code>／<code>A:</code>，裡面的空行不會截斷卡片"],
            ["<code>%%card%%</code> 包住", "貼上 AI 的長回答，內容可能含 <code>---</code>、表格、程式碼", "前後各一行 <code>%%card%%</code>；<code>A:</code> 之後到結束標記前都是答案"],
            ["填空", "同 Anki 的 cloze", "<code>{{c1::答案}}</code> 或 <code>{{c1::答案::提示}}</code>"],
            ["<code>::</code>", "一行的短答案", "<code>問題 :: 答案</code>"],
          ] },
          { list: [
            "<code>Q:</code>／<code>A:</code> 卡遇到<strong>連續兩個空行</strong>、下一個 <code>Q:</code> 或填空行就結束；答案中間單一個空行沒關係。",
            "筆記裡一般的 <code>---</code> 水平線（後面沒有接 <code>Q:</code>）會被忽略。",
            "同一行有 c1、c2 等不同編號的填空，每個編號各自成為一張卡。",
            "快速輸入 <code>%%card%%</code>：在空行按 <code>Ctrl+/</code>（Mac 為 <code>Cmd+/</code>）插入 <code>%% %%</code>，中間打 card 即可；空格與大小寫都可以。",
          ] },
          { code: "#flashcards/ai\n\n%%card%%\nQ: 什麼是 agentic testing？\nA:\n檢查 AI 系統能不能可靠完成任務，而不只是某個函式有沒有回傳正確值。\n\n---\n\n- 給 agent 一個真實任務\n- 驗證最後產物\n%%card%%" },
          { h: "我有很多沒有 tag 的舊 <code>::</code> 卡，怎麼遷移？" },
          { p: "打開設定裡的「納入舊版 <code>::</code> 筆記」，原本的寫法不用改，回 Review Deck 確認是否已收進來。長期使用建議慢慢補上 <code>#flashcards/...</code> tag。" },
          { h: "複習進度存在哪裡？" },
          { p: "排程在 <code>engram-review/sr/</code>，提示在 <code>engram-review/hints/</code>，AI 做的卡在 <code>engram-review/ai-cards/</code>，Quest 進度在 <code>engram-quest/state/</code>。這些都不會寫進你的原始筆記；只有你在複習時編輯、高亮、引述自己寫的卡，才會改到原始筆記。" },
          { h: "手機可以用嗎？" },
          { p: "可以。Hub 有手機版面，下方分成記憶、學習、成就三個分頁，複習完整可用。用 AI 工具做內容要在電腦上；做好的內容隨 vault 同步到手機。" },
          { h: "手機上的插件沒有更新？" },
          { p: "插件存在 vault 的 <code>{configDir}/plugins/engram-quest/</code>。如果你用 git（Obsidian Git）同步 vault，請確認：" },
          { steps: [
            "<code>.gitignore</code> 沒有排除 <code>{configDir}/plugins/engram-quest/</code>。",
            "手機的 Obsidian Git 有開自動 pull。",
            "pull 完後在設定裡停用再啟用插件，或重開 App。",
          ] },
          { h: "筆記很多很亂，不知道從哪裡開始？" },
          { p: "不用先整理。先請 AI 列出主題，再挑一個開始：" },
          { say: [
            "幫我列出 vault 裡所有筆記的主題分類",
            "用第 3 類的筆記做成 Quest Map，medium 難度",
            "先把這些筆記整理成大綱，再建立 Review Deck",
          ] },
          { h: "AI 做出來的內容不合我意，怎麼客製？" },
          { p: "在 AI 設定檔（<code>CLAUDE.md</code>、<code>AGENTS.md</code>、<code>GEMINI.md</code>）寫下你的規則，AI 每次都會照做。例如：" },
          { code: "建立 Review Deck 時，每張卡都附一個實際應用的例子。\n筆記裡每個 ==高亮== 都要做成一張卡。\n所有 Memory Map 存到 Maps/Memory/。" },
          { h: "支援 Anki 嗎？" },
          { p: "部分支援。<code>::</code> 與 <code>{{c1::}}</code> 跟 Anki 相容，可以搭配社群插件 Obsidian_to_Anki 與 AnkiConnect 同步。<code>Q:</code>／<code>A:</code> 是 EngramQuest 專用格式，為多行答案、圖片、表格設計，不會同步到 Anki；兩邊都要用的卡請改用 <code>::</code> 或填空。" },
          { h: "為什麼找不到「深入解析」分頁？" },
          { p: "深入解析是 Pro 功能，啟用授權後才會出現在側邊欄。" },
        ],
      },
    ],
  },

  en: {
    ui: {
      intro: "EngramQuest turns your Obsidian notes into a learning loop: understand them, practise them, keep them. Everything lives in the Hub, in three groups:",
      introAi: "You can start without AI: write one card by hand and review it. When you want help, install the EngramQuest skills and use the AI tool you already have (Claude Code, Codex, Gemini CLI, Cursor) to build decks, maps, courses and videos from your notes.",
      guidesHint: "Each tab shows a visual guide the first time you open it. Pick one below to see it again.",
      sectionsHead: "How it works",
      openGuide: "Visual guide",
      firstStep: "First step",
      copyPrompt: "Copy setup prompt",
      copied: "Copied",
      copyFailed: "Copy failed",
      supportAsk: "Find EngramQuest helpful?",
    },
    groups: [
      {
        id: "memory", name: "Memory", desc: "Keep what you learned",
        tabs: [
          { tab: "review", name: "Review Deck", sub: "Spaced-repetition flashcards" },
          { tab: "explainer", name: "Deep Dive", sub: "Plain-language help for hard cards", pro: true },
          { tab: "memory", name: "Memory Map", sub: "See the structure on a canvas" },
          { tab: "episodic", name: "Recall Films", sub: "Go back to what you read in a period" },
        ],
      },
      {
        id: "learn", name: "Learn", desc: "Learn and practise",
        tabs: [
          { tab: "lesson", name: "Lessons", sub: "Interactive courses built for your goal" },
          { tab: "quest", name: "Quest Map", sub: "Turn notes into practice missions" },
          { tab: "video", name: "Video Academy", sub: "One sentence into short lessons" },
        ],
      },
      {
        id: "achieve", name: "Achieve", desc: "See your progress",
        tabs: [
          { tab: "achievement", name: "Achievements", sub: "Review stats and badges" },
        ],
      },
    ],
    sections: [
      {
        id: "start", icon: "arrow", title: "Getting started", tag: "Start here",
        body: [
          { h: "Without AI: your first deck in a minute" },
          { steps: [
            "Add the tag <code>#flashcards/topic</code> anywhere in a note. The part after the slash is the deck name: <code>#flashcards/english</code> makes a deck called \"english\".",
            "Write a card in the same note: <code>Q: question</code> on one line, <code>A: answer</code> on the next.",
            "Open the Hub from the EngramQuest icon (an open book) in the left ribbon. The deck is under <strong>Review Deck</strong>; press Review Ready to start.",
          ] },
          { code: "#flashcards/english\n\nQ: What does \"ephemeral\" mean?\nA: Lasting a very short time" },
          { h: "With AI: let your AI tool build it" },
          { steps: [
            "Go to <strong>Settings → EngramQuest → AI Skills</strong>, press Install skills and pick your tool.",
            "Open the AI tool from this vault's folder and say what you want, for example:",
          ] },
          { say: [
            "Make a Review Deck from my notes tagged math",
            "Create a memory-map for operating-systems.md",
            "I want to learn SEO, build me a course",
            "Turn calculus.md into a quest-map, medium",
          ] },
          { p: "What it builds shows up in the matching Hub tab." },
          { table: [
            ["Tool", "Where skills are installed"],
            ["Claude Code", "<code>.claude/skills</code>"],
            ["Codex / Antigravity", "<code>.agents/skills</code> (shared, install once)"],
            ["Gemini CLI", "<code>.gemini/skills</code>"],
            ["Cursor", "<code>.cursor/skills</code>"],
          ] },
          { note: "Skills installed: quest-map, review-deck, memory-map and lesson-academy; with Pro also synapse and explainer. The video skills, animated-course and episodic-review (Pro), go to Claude Code only. Installed skills update themselves when the plugin updates (you can turn this off in Settings); if an update is waiting, the Review Deck page shows a banner with an Update skills button." },
          { h: "No terminal? Use Claude Desktop" },
          { p: "First give Claude Desktop a way to read and write your vault (the official filesystem MCP, for example). Then copy the setup prompt below, paste it into Claude Desktop and follow it once; it takes about two minutes." },
          { action: "desktopPrompt" },
        ],
      },
      {
        id: "review", tab: "review", icon: "deck", title: "Review Deck", tag: "Free",
        body: [
          { p: "Questions and answers in your notes become flashcards. FSRS schedules each card for just before you would forget it; the steadier your answers, the longer the next gap." },
          { list: [
            "<strong>Three hints</strong>: when you're stuck, open L1 recall cue → L2 from your notes → L3 narrowing hint, and only then the answer. The review-deck skill writes the hints, and you can edit them while reviewing.",
            "<strong>Rating</strong>: after the answer, pick Again, Hard, Good or Easy and the next review date is set.",
            "<strong>Fix as you go</strong>: edits, highlights and quotes go straight back to your source note. Cards the AI makes live in <code>engram-review/ai-cards/</code> and never touch your notes.",
            "<strong>Linked features</strong>: open the matching Memory Map in one click; cards that came from a video can \"Rewatch this part\".",
            "Filter decks by All, Due, New or Done and switch between list, grid and folder views. The + on a deck adds a card.",
          ] },
          { first: "Add <code>#flashcards/topic</code> and one <code>Q:</code>/<code>A:</code> card to a note, or tell your AI \"Make a Review Deck from my notes on [topic]\"." },
          { note: "Free. With Pro you also get Synapse memory anchors, Time-boxed review (5, 10 or 15 minutes) and a button that queues a hard card for a Deep Dive." },
        ],
      },
      {
        id: "explainer", tab: "explainer", icon: "doc", title: "Deep Dive", tag: "Pro",
        body: [
          { p: "A card you can't understand or can't remember gets a page of plain-language, illustrated explanation: what problem the idea solves, then layer by layer from simple to detailed, ending back at your original card." },
          { steps: [
            "While reviewing, show the answer and press \"Queue deep dive\" (on a phone it is in the More actions menu).",
            "Tell your AI tool to \"process the deep dive queue\". The engram-explainer skill reads the queue, works out why each card is hard and writes the pages. You can also ask directly: \"make a deep dive about X\".",
            "Read them in the Deep Dive tab. Pages are grouped by deck; opening one marks it read, and you can star it, press ✓ to mark it done or delete it.",
          ] },
          { p: "A deep dive has no review schedule of its own: the original card keeps its place in the Review Deck, and its next review shows whether it worked. If the card keeps failing, the skill rewrites the page from a simpler starting point." },
          { first: "Press \"Queue deep dive\" on a hard card while reviewing, then tell your AI to \"process the deep dive queue\"." },
          { note: "Needs Pro. Without a licence the tab does not appear in the sidebar." },
        ],
      },
      {
        id: "memory", tab: "memory", icon: "map", title: "Memory Map", tag: "Free",
        body: [
          { p: "An Obsidian Canvas that lays a topic out as a structure linked to the notes you already have, so abstract ideas become something you can see." },
          { list: [
            "Every file in the vault whose name ends in <code>-memory.canvas</code> shows up in this tab. Search it, filter by tag, sort it, and click to open it in Obsidian.",
            "AI-made maps are saved next to the source note unless you set a Memory Map folder in Settings.",
            "While reviewing, the Memory Map button finds the maps that belong to the card: <code>-memory.canvas</code> files in the same folder, <code>{note-name}-memory.canvas</code> in your Memory Map folder, and any map with a file node pointing at the note. The AI adds that file node, so the link survives renames and moves.",
          ] },
          { first: "Tell your AI \"Create a memory-map for {note}.md\", or make a <code>{note-name}-memory.canvas</code> yourself." },
          { note: "Free." },
        ],
      },
      {
        id: "episodic", tab: "episodic", icon: "recall", title: "Recall Films", tag: "Free to watch · Pro to make",
        body: [
          { p: "A recall film turns the notes you read over a period (usually a month) into an animated film that walks you back through what you learned. Films are grouped by period; click one to play it." },
          { steps: [
            "Press \"+ New film\", choose the start and end month and a length (Short, Medium or Long, each with an estimate of minutes and topics).",
            "The plugin saves the request and gives you a prompt. Paste it into Claude Code and the episodic-review skill makes the film.",
            "Finished films appear here. Requests still waiting are listed at the top, where you can copy the prompt again or cancel.",
          ] },
          { first: "Press \"+ New film\", pick last month, and paste the prompt into Claude Code." },
          { note: "Watching recall films you already have is free. Making new recall films needs Pro and Claude Code." },
        ],
      },
      {
        id: "lesson", tab: "lesson", icon: "book", title: "Lessons (Lesson Academy)", tag: "Free",
        body: [
          { p: "Tell your AI what you want to learn. The Lesson Academy skill asks about your goal and level first, then builds a course of interactive HTML lessons you study inside Obsidian. Any subject works: programming, marketing, medicine, yoga." },
          { list: [
            "Press Mark done after a lesson and the course card shows your progress; star the lessons that matter.",
            "Concept-map lessons open in a native Obsidian Canvas tab where you can drag nodes and add notes.",
            "New course lets you write just the outline (one lesson title per line) and have the AI fill it in later; your progress carries over.",
            "Import HTML brings in a lesson made elsewhere, unchanged.",
            "With many courses, search, filter by tag or progress, sort, and archive the ones you are done with.",
          ] },
          { first: "Tell your AI \"Teach me {topic}, build a course\" and answer its questions about your goal and level." },
          { note: "Free. When you finish, you can ask your AI to turn the course into a Review Deck or a Quest Map." },
        ],
      },
      {
        id: "quest", tab: "quest", icon: "flag", title: "Quest Map", tag: "Free",
        body: [
          { p: "Your notes become practice missions. Each mission is an interactive page (a scenario to judge, a calculation, a diagnosis or a simulation) and a Boss Battle at the end tests whether you can use what you know." },
          { list: [
            "Difficulty is easy, medium or hard. The tab counts all, in-progress, boss-ready and cleared quests, and filters by difficulty, status and tag.",
            "Quests live in <code>engram-quest/quests/</code> and your progress is saved separately in <code>engram-quest/state/</code>, so the AI can update a quest without wiping your progress.",
            "Quests made by earlier versions still open.",
          ] },
          { first: "Tell your AI \"Turn {note or topic} into a quest-map, {difficulty}\", then click the quest card to start." },
          { note: "Free." },
        ],
      },
      {
        id: "video", tab: "video", icon: "video", title: "Video Academy", tag: "Free · more teachers with Pro",
        body: [
          { p: "Say what you want to learn or review; the AI decides which notes to use and splits it into short videos. The outer view is a shelf of series; open one to watch. Your place is remembered, so you resume where you stopped." },
          { steps: [
            "Press \"New series\" and write what you want to learn. Add details if you like, and let the AI pick relevant notes, drop in notes yourself, or use none.",
            "The plugin saves the request and gives you a prompt. Paste it into Claude Code and the animated-course skill makes the videos.",
            "Finished videos appear on the shelf. Filter by Watching, Not started, Finished or In the queue, search, or browse by tag.",
          ] },
          { p: "Video settings only need setting once: teacher, quality, narration language, voice, subtitles, and whether each video comes with review cards." },
          { first: "Press \"New series\", write something like \"build a website\", and paste the prompt into Claude Code." },
          { note: "Watching and managing videos is free, and so is the teacher Nico. The other teachers, and a different teacher for each series, need Pro. Making videos needs Claude Code." },
        ],
      },
      {
        id: "achievement", tab: "achievement", icon: "medal", title: "Achievements", tag: "Free",
        body: [
          { p: "See what you have built up: total cards reviewed, mastered, total cards and your day streak, a familiarity ring (mastered, learning, due, unseen) and a chart of recent review activity." },
          { p: "Below is the achievement collection. Badges unlock through review volume, streaks, cards reviewed in a day, cards mastered, and making memory maps, clearing quests and finishing lessons. Click a badge to see your progress; one you unlock during review is announced on the spot." },
          { first: "Finish one review session, then come back for your first badge." },
          { note: "Free, no AI needed." },
        ],
      },
      {
        id: "pro", icon: "star", title: "Pro", tag: "US$11.99 one-time",
        body: [
          { p: "One purchase, with future Pro feature updates included. Every free feature keeps working without it. Pro adds four things:" },
          { list: [
            "<strong>Synapse memory anchors</strong>: link a hard card to related cards you have already mastered. Once you have 10 mastered cards (stability of 7 days or more), run the engram-synapse skill; during review a Synapse button appears on cards that have a good anchor. The Review Deck page tells you when to run or refresh it.",
            "<strong>Deep Dive</strong>: queue a hard card, generate a plain-language, illustrated page with the engram-explainer skill, and read it in the Deep Dive tab.",
            "<strong>Time-boxed review</strong>: under Timed on the Review Deck page, pick 5, 10 or 15 minutes. At about a minute per card it picks that many cards: new first, then the most overdue, then the soonest due. When the countdown reaches zero it says Time's up, but you can finish the round and scheduling works as usual.",
            "<strong>More teachers and recall films</strong>: the video teachers besides Nico, a teacher for each series, and making recall films from your notes with Claude Code. Watching videos, managing the Video Academy and watching recall films you already have are free.",
          ] },
          { h: "Where to upgrade and activate" },
          { list: [
            "Desktop: the Pro button at the bottom of the Hub sidebar (Explore Pro, or Pro is active once activated).",
            "Phone: the Pro row at the bottom of the Hub's Memory home page.",
            "After paying, copy your key from Polar, paste it in <strong>Settings → EngramQuest → EngramQuest Pro</strong>, then reopen the Hub.",
          ] },
          { p: "Activation sends only your licence key and product identifiers to Polar, never note content. After a successful check it works offline for up to 14 days. Removing the local licence keeps all your learning data." },
          { action: "pro" },
        ],
      },
      {
        id: "science", icon: "learn", title: "The learning science", tag: "Why it works",
        body: [
          { list: [
            "<strong>Spaced repetition</strong>: review just before you forget to keep the most for the least time. Review Deck schedules with FSRS.",
            "<strong>Retrieval practice</strong>: recalling before you look beats rereading. The three hints give you only as much as you need; Quest Map puts recall into real situations.",
            "<strong>Elaborative encoding</strong>: hang new ideas on ones you know. Memory Map draws the structure; Synapse ties hard cards to cards you have mastered.",
            "<strong>Context and episodic memory</strong>: returning to where you learned something helps you recall it. The L2 hint takes you back to the note; recall films take you back to the period.",
          ] },
        ],
      },
      {
        id: "settings", icon: "list", title: "Settings", tag: "Customize",
        body: [
          { p: "In Obsidian <strong>Settings → EngramQuest</strong>." },
          { table: [
            ["Setting", "What it does"],
            ["EngramQuest Pro", "Enter a licence key to activate Pro, or remove the local licence."],
            ["Language", "English, Traditional Chinese, or follow Obsidian."],
            ["Flashcard tag prefixes", "Which tags make a deck; default <code>flashcards</code>. Separate several with spaces or new lines. The deck name is the first part after the prefix: <code>#flashcards/azure</code> goes to azure."],
            ["Include legacy <code>::</code> notes", "Migration mode: old notes without a matching tag become decks named after their folder. Off by default."],
            ["Maximum review interval (days)", "The longest gap a card can reach; default 36525. Lower it to keep familiar cards coming back."],
            ["Target retention rate", "The recall probability FSRS aims for (0.70 to 0.99, default 0.90). Higher means more frequent reviews."],
            ["Memory Map folder", "Where AI-made <code>-memory.canvas</code> files go; empty means next to the source note."],
            ["AI Skills", "Install skills for Claude Code, Codex / Antigravity, Gemini CLI or Cursor."],
            ["Auto update installed skills", "Refresh the skills EngramQuest installed in this vault when the plugin loads."],
          ] },
          { p: "Video options live in Video settings inside the Video Academy." },
        ],
      },
      {
        id: "faq", icon: "help", title: "FAQ", tag: "FAQ",
        body: [
          { h: "Can I use it without installing skills?" },
          { p: "Yes. Hand-written cards, reviewing, Achievements, watching videos and using anything already made need no AI." },
          { h: "My source notes have no tags. Can the AI still read them?" },
          { p: "Yes. The AI reads notes without any tag. The cards it makes are saved, already tagged, in <code>engram-review/ai-cards/</code>, and your notes are left untouched." },
          { h: "Why don't I see my deck?" },
          { list: [
            "The note has no card in it yet.",
            "The note's tag doesn't match the Flashcard tag prefixes in Settings.",
            "You use old untagged <code>::</code> cards but Include legacy <code>::</code> notes is off.",
          ] },
          { h: "Which card formats can I use?" },
          { table: [
            ["Format", "Good for", "How to write it"],
            ["<code>Q:</code>/<code>A:</code>", "Everyday use. Multi-line answers, images, tables", "<code>Q: question</code>, new line, <code>A: answer</code>; the answer may start on the next line"],
            ["Wrapped in <code>---</code>", "Answers with many blank lines", "A <code>---</code> line before and after a <code>Q:</code>/<code>A:</code> pair; blank lines inside never cut the card"],
            ["Wrapped in <code>%%card%%</code>", "Pasting a long AI answer that may contain <code>---</code>, tables or code", "A <code>%%card%%</code> line before and after; everything after <code>A:</code> up to the closing marker is the answer"],
            ["Cloze", "Fill in the blank, Anki style", "<code>{{c1::answer}}</code> or <code>{{c1::answer::hint}}</code>"],
            ["<code>::</code>", "Short one-line answers", "<code>question :: answer</code>"],
          ] },
          { list: [
            "A <code>Q:</code>/<code>A:</code> card ends at <strong>two blank lines in a row</strong>, the next <code>Q:</code>, or a cloze line; a single blank line inside the answer is fine.",
            "An ordinary <code>---</code> divider (not followed by <code>Q:</code>) is ignored.",
            "Clozes with different numbers on one line (c1, c2…) each become their own card.",
            "Quick <code>%%card%%</code>: on an empty line press <code>Ctrl+/</code> (<code>Cmd+/</code> on Mac) to insert <code>%% %%</code>, then type card between them. Spaces and capitals don't matter.",
          ] },
          { code: "#flashcards/ai\n\n%%card%%\nQ: What is agentic testing?\nA:\nIt checks whether an AI system can reliably finish a task, not just whether one function returns the right value.\n\n---\n\n- Give the agent a real task\n- Verify the final output\n%%card%%" },
          { h: "I have lots of old untagged <code>::</code> cards. How do I migrate?" },
          { p: "Turn on Include legacy <code>::</code> notes in Settings; your cards stay as they are. Check the Review Deck to confirm they were picked up, and add <code>#flashcards/...</code> tags over time." },
          { h: "Where is my progress stored?" },
          { p: "Schedules in <code>engram-review/sr/</code>, hints in <code>engram-review/hints/</code>, AI-made cards in <code>engram-review/ai-cards/</code>, quest progress in <code>engram-quest/state/</code>. None of this is written into your notes; only editing, highlighting or quoting your own hand-written cards during review changes the source note." },
          { h: "Does it work on a phone?" },
          { p: "Yes. The Hub has a phone layout with Memory, Learn and Achieve along the bottom, and review works fully. Building content with an AI tool happens on a computer; what it makes reaches your phone when your vault syncs." },
          { h: "The plugin on my phone doesn't update." },
          { p: "The plugin lives in your vault at <code>{configDir}/plugins/engram-quest/</code>. If you sync the vault with git (Obsidian Git), check that:" },
          { steps: [
            "<code>.gitignore</code> doesn't exclude <code>{configDir}/plugins/engram-quest/</code>.",
            "Obsidian Git on the phone pulls automatically.",
            "After pulling, you disable and re-enable the plugin in Settings, or restart the app.",
          ] },
          { h: "My notes are messy. Where do I start?" },
          { p: "No need to tidy first. Ask the AI to list your topics, then pick one:" },
          { say: [
            "List the topic categories across my vault",
            "Make a medium Quest Map from the notes in category 3",
            "Organize these notes into an outline, then build a Review Deck",
          ] },
          { h: "I don't like what the AI made. How do I customize it?" },
          { p: "Write your rules in the AI config file (<code>CLAUDE.md</code>, <code>AGENTS.md</code>, <code>GEMINI.md</code>) and the AI follows them every time. For example:" },
          { code: "When building a Review Deck, give every card a real-world example.\nEvery ==highlight== in my notes becomes a card.\nSave all Memory Maps to Maps/Memory/." },
          { h: "Does it work with Anki?" },
          { p: "Partly. <code>::</code> and <code>{{c1::}}</code> are Anki-compatible and sync with the Obsidian_to_Anki community plugin and AnkiConnect. <code>Q:</code>/<code>A:</code> is EngramQuest's own format for multi-line answers, images and tables and does not sync to Anki; use <code>::</code> or cloze for cards you want in both." },
          { h: "Why can't I find the Deep Dive tab?" },
          { p: "Deep Dive is a Pro feature; the tab appears in the sidebar once your licence is active." },
        ],
      },
    ],
  },
};
