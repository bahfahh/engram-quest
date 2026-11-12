"use strict";
// First-run guide for each Hub tab: the first time a tab opens it pops a short "picture + what it is
// + first step" card, so a newcomer knows the next action without hunting through Help.
// A tab with `options` + `pages` gets a small menu of sub-pages (some with demo videos); the others
// are a single page. Shown once per tab (settings._guideSeen); reopened from the Help dialog, and from
// the "?" next to a page title on pages that attach one (attachInfoButton).

const I = require("obsidian");
const { getLocale: L } = require("../i18n");
const { assetUrl } = require("../assets");

// The icon and colour each tab wears in the sidebar (spec-design.md §3).
const { TABS } = require("./categories");

// `img` is the file name in assets/guide/ without the locale suffix: `{img}_中文.webp` / `{img}_english.webp`.
// A missing picture is simply left out.
const CONTENT = {
  review: {
    img: "reviewdeck",
    "zh-tw": {
      title: "Review Deck — 三階回想複習",
      lines: [
        "把筆記變成閃卡，FSRS 在你<strong>快忘記的時候</strong>排複習。",
        "想不起來時依序打開 <strong>L1</strong> 回想線索 → <strong>L2</strong> 當初的筆記 → <strong>L3</strong> 縮小範圍，最後才看答案。",
      ],
      pickPrompt: "你想怎麼開始？",
      options: [
        { id: "manual", label: "手動建立", sub: "自己寫卡，或貼上 AI 的回答" },
        { id: "ai", label: "用 AI 建立", sub: "安裝 skills，讓 AI 工具幫你做" },
        { id: "advanced", label: "進階技巧", sub: "SVG 題目、客製規則、先挑再做" },
      ],
      pages: {
        manual: {
          title: "手動建立 Review Deck",
          body: [
            { h: "只要兩個條件，筆記就會被<strong>自動偵測</strong>、加進牌組：<br>① 打上 <code>#flashcards/主題</code> tag　② 至少寫一張卡（最常用 <code>Q:/A:</code>，連續兩個空行結束一張卡）。" },
            { v: "XC0NsPVfcwE", label: "示範：自己手寫卡片" },
            { h: "<strong>也可以貼上 AI 的回答</strong>：問 ChatGPT 或任何 AI，把整段答案複製、用 <code>%%card%%</code> 包進筆記就變成卡片，<strong>連 AI 生成的圖片也能一起加進牌組</strong>。" },
            { v: "pMf5mfCswBo", label: "示範：貼上 AI 回答快速建卡" },
          ],
          first: "打開任一筆記，加 <code>#flashcards/主題</code> 和一張 <code>Q: 問題 / A: 答案</code> 卡，回到這分頁就看到牌組。",
        },
        ai: {
          title: "用 AI 建立 Review Deck",
          body: [
            { h: "① 到 <strong>設定 → EngramQuest → AI Skills</strong> 為你的工具按安裝。其中 <code>engram-review-deck</code> 負責建 Review Deck。" },
            { h: "② 用 Claude Code / Codex / Antigravity / Gemini CLI / Cursor，<strong>從 Obsidian 筆記所在的資料夾</strong>打開，直接跟它說「幫我建立 Review Deck」。" },
            { v: "X9RhfC-l8d4", label: "示範：用 AI 建立 Review Deck 完整流程" },
            { h: "範例：<br>・「幫我查今天的筆記，把醫學相關名詞建成 Review Deck」<br>・「把物理、力學相關的筆記建成 Review Deck，題目和解答可以用 SVG」<br>・「幫我查最新的 AI 資訊，建一個 Review Deck」" },
          ],
          first: "先到 設定 → EngramQuest → AI Skills 安裝你的工具；不想安裝就改用「手動建立」貼上 AI 回答。",
        },
        advanced: {
          title: "進階技巧",
          body: [
            { h: "<strong>用 AI 畫 SVG</strong> 當題目或解答，做圖像記憶，例如請 Claude「用 SVG 畫出這個結構當解答」。" },
            { h: "<strong>客製 AI 的做法</strong>：在 <code>CLAUDE.md</code> / <code>AGENTS.md</code> / <code>GEMINI.md</code> 加規則，例如「答案都用圖解呈現」「每個 ==highlight== 都要建一張卡」。" },
            { h: "<strong>先挑再做</strong>：讓 AI 先列出你最近的筆記，你直接挑要建成 Review Deck 的內容。" },
          ],
          first: "挑一個技巧試試。AI 做的卡都存在 <code>engram-review/</code>，不會動你的來源筆記。",
        },
      },
    },
    en: {
      title: "Review Deck — three-stage recall",
      lines: [
        "Turn notes into flashcards; FSRS schedules them <strong>just before you forget</strong>.",
        "When you're stuck, open <strong>L1</strong> recall cue → <strong>L2</strong> from your notes → <strong>L3</strong> narrowing hint, and only then the answer.",
      ],
      pickPrompt: "How do you want to start?",
      options: [
        { id: "manual", label: "Create manually", sub: "Write cards, or paste an AI answer" },
        { id: "ai", label: "Build with AI", sub: "Install skills and let your AI tool do it" },
        { id: "advanced", label: "Tips", sub: "SVG questions, custom rules, pick then build" },
      ],
      pages: {
        manual: {
          title: "Create a Review Deck manually",
          body: [
            { h: "Two conditions and a note is <strong>picked up automatically</strong> as a deck:<br>① tag it <code>#flashcards/topic</code>　② write at least one card (usually <code>Q:/A:</code>; two blank lines end a card)." },
            { v: "XC0NsPVfcwE", label: "Demo: write your own cards" },
            { h: "<strong>You can also paste an AI answer</strong>: ask ChatGPT or any AI, copy the whole answer and wrap it in <code>%%card%%</code> in a note. It becomes a card, and <strong>AI-generated images go into the deck too</strong>." },
            { v: "pMf5mfCswBo", label: "Demo: build a deck by pasting an AI answer" },
          ],
          first: "Open any note, add <code>#flashcards/topic</code> and one <code>Q: … / A: …</code> card, and the deck appears in this tab.",
        },
        ai: {
          title: "Build a Review Deck with AI",
          body: [
            { h: "① In <strong>Settings → EngramQuest → AI Skills</strong>, press Install for your tool. <code>engram-review-deck</code> is the skill that builds review decks." },
            { h: "② In Claude Code / Codex / Antigravity / Gemini CLI / Cursor, opened <strong>from the folder your Obsidian notes live in</strong>, just say \"Build a Review Deck.\"" },
            { v: "X9RhfC-l8d4", label: "Demo: the whole build-with-AI flow" },
            { h: "Examples:<br>・\"Check today's notes and build a Review Deck from the medical terms.\"<br>・\"Build a Review Deck on physics and mechanics, using SVG for questions and answers.\"<br>・\"Look up the latest AI news and build a Review Deck.\"" },
          ],
          first: "Install your tool in Settings → EngramQuest → AI Skills, or skip that and paste an AI answer through \"Create manually\".",
        },
        advanced: {
          title: "Tips",
          body: [
            { h: "<strong>Have the AI draw SVG</strong> as the question or answer for visual memory, e.g. ask Claude to \"draw this structure in SVG as the answer.\"" },
            { h: "<strong>Customize the AI</strong>: add rules to <code>CLAUDE.md</code> / <code>AGENTS.md</code> / <code>GEMINI.md</code>, e.g. \"always answer with diagrams\" or \"every ==highlight== becomes a card.\"" },
            { h: "<strong>Pick, then build</strong>: have the AI list your recent notes first, then choose which ones become a Review Deck." },
          ],
          first: "Try one tip. AI-made cards stay in <code>engram-review/</code> and never touch your source notes.",
        },
      },
    },
  },
  quest: {
    img: "questmap",
    "zh-tw": {
      title: "Quest Map — 把筆記變成應用任務",
      lines: [
        "一篇筆記或一個主題 → 一組<strong>應用任務</strong>：情境判斷、計算、診斷、模擬，一關一關做。",
        "難度 easy / medium / hard，最後用 <strong>Boss 戰</strong>檢驗你能不能把知識用出來。",
      ],
      pickPrompt: "你想了解什麼？",
      options: [
        { id: "build", label: "如何建立", sub: "安裝 skills，請 AI 把筆記做成任務" },
        { id: "play", label: "怎麼玩", sub: "任務、Boss 戰、進度" },
        { id: "advanced", label: "進階技巧", sub: "從自己的筆記做、挑難度" },
      ],
      pages: {
        build: {
          title: "如何建立 Quest Map",
          body: [
            { h: "① <strong>安裝 skills</strong>：到 設定 → EngramQuest → AI Skills，選你的工具（Claude Code / Codex / Antigravity / Gemini CLI / Cursor）按安裝。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong>：從 Obsidian 筆記所在的資料夾打開 AI，例如說「幫我建立關於高三數學的 quest-map，easy 難度」。" },
          ],
          first: "跟 AI 說「把 {筆記或主題} 做成 quest-map，{難度}」，任務就會出現在這分頁。",
        },
        play: {
          title: "怎麼玩",
          body: [
            { h: "每個任務是一頁<strong>互動畫面</strong>：判斷一個情境、算一個數字、診斷一個問題，或操作一個模擬。全部完成後挑戰 <strong>Boss 戰</strong>。" },
            { h: "分頁上方顯示全部、進行中、Boss 已解鎖、已通關的數量；可以依難度、狀態、tag 篩選。" },
            { h: "進度另外存在 <code>engram-quest/state/</code>，AI 更新任務時不會洗掉你的進度。" },
          ],
          first: "點任一張任務卡進去，逐關完成、挑戰 Boss。",
        },
        advanced: {
          title: "進階技巧",
          body: [
            { h: "<strong>用你自己的筆記或主題來做</strong>效果最好，AI 對你真正讀過的東西最準。" },
            { h: "<strong>可以指定難度</strong>（easy / medium / hard）；<strong>關卡越多、生成越久</strong>，想快就先做小範圍。" },
            { h: "範例：「幫我建立關於高三數學的 easy 難度 quest-map」。" },
          ],
          first: "挑一個你熟的主題，指定難度請 AI 生成一份 quest-map。",
        },
      },
    },
    en: {
      title: "Quest Map — notes into practice missions",
      lines: [
        "A note or a topic → a set of <strong>practice missions</strong>: judge a scenario, run a calculation, make a diagnosis, work a simulation.",
        "Difficulty easy / medium / hard, with a <strong>Boss Battle</strong> at the end that tests whether you can use what you know.",
      ],
      pickPrompt: "What do you want to know?",
      options: [
        { id: "build", label: "How to create", sub: "Install skills, ask the AI to turn a note into missions" },
        { id: "play", label: "How to play", sub: "Missions, the Boss Battle, progress" },
        { id: "advanced", label: "Tips", sub: "Build from your own notes, pick a difficulty" },
      ],
      pages: {
        build: {
          title: "How to create a Quest Map",
          body: [
            { h: "① <strong>Install skills</strong>: in Settings → EngramQuest → AI Skills, press Install for your tool (Claude Code / Codex / Antigravity / Gemini CLI / Cursor)." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong>: open it from the folder your Obsidian notes live in and say, e.g. \"Build an easy quest-map about Grade 12 math.\"" },
          ],
          first: "Tell your AI \"Turn {note or topic} into a quest-map, {difficulty}\" and the quest appears in this tab.",
        },
        play: {
          title: "How to play",
          body: [
            { h: "Each mission is an <strong>interactive page</strong>: judge a scenario, work out a number, diagnose a problem or run a simulation. Clear them all, then take on the <strong>Boss Battle</strong>." },
            { h: "The top of the tab counts all, in-progress, boss-ready and cleared quests; filter by difficulty, status and tag." },
            { h: "Progress is saved separately in <code>engram-quest/state/</code>, so the AI can update a quest without wiping your progress." },
          ],
          first: "Click any quest card, clear the missions and beat the Boss.",
        },
        advanced: {
          title: "Tips",
          body: [
            { h: "<strong>Build from your own notes or topic</strong>: the AI is most accurate on what you have actually studied." },
            { h: "<strong>Pick a difficulty</strong> (easy / medium / hard). <strong>More missions take longer to generate</strong>, so start small if you want it fast." },
            { h: "Example: \"Build an easy quest-map about Grade 12 math.\"" },
          ],
          first: "Pick a topic you know, choose a difficulty, and ask the AI for a quest-map.",
        },
      },
    },
  },
  lesson: {
    img: "lesson_academy",
    "zh-tw": {
      title: "教材 — 依你的目標打造課程",
      lines: [
        "告訴 AI 想學什麼，它<strong>先問你的目標和程度</strong>，再做出能在 Obsidian 裡讀的互動課程。",
        "看完一課按「標記完成」追蹤進度；學完可以請 AI 把課程做成 Review Deck 或 Quest Map。",
      ],
      pickPrompt: "你想怎麼開始？",
      options: [
        { id: "build", label: "用 AI 建立課程", sub: "一句話生成整套課程" },
        { id: "plan", label: "自己規劃或匯入", sub: "先排課綱，或匯入現成 HTML" },
        { id: "advanced", label: "進階技巧", sub: "目標導向、先看課綱再生成" },
      ],
      pages: {
        build: {
          title: "用 AI 建立課程",
          body: [
            { h: "① <strong>安裝 skills</strong>：到 設定 → EngramQuest → AI Skills，選你的工具按安裝。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong>，例如「教我 SEO，建一套課程」。它會<strong>先問你的目標和程度</strong>再生成。" },
            { v: "G8HxBl9Hf9o", label: "示範：用 Claude Code 建立課程" },
          ],
          first: "跟 AI 說「教我 {主題}，建一套課程」，先回答它問你的目標和程度。",
        },
        plan: {
          title: "自己規劃或匯入",
          body: [
            { h: "按「<strong>新增課程</strong>」可以先只排課綱（每行一個課名，標成待生成），之後再請 AI 補內容，<strong>進度會延續</strong>。" },
            { h: "<strong>匯入 HTML</strong>：把別處 AI 做好的課程 HTML 原樣放進來，不轉換。" },
          ],
          first: "按「新增課程」排出你的第一份課綱。",
        },
        advanced: {
          title: "進階技巧",
          body: [
            { h: "核心是<strong>目標導向</strong>的學習（《超速學習 Ultralearning》）：跟 AI 說你<strong>想達成的目標</strong>，讓它幫你排<strong>課綱</strong>。" },
            { h: "<strong>只挑你要的課綱</strong>來生成，<strong>不一定要全部做</strong>：改大綱便宜，重做課程貴。" },
            { h: "課程會<strong>連結你的 vault</strong>；學完可以請 AI 把它轉成 <strong>Review Deck 或 Quest Map</strong>。" },
          ],
          first: "跟 AI 說你的學習目標（例如「我想能獨立寫 React，幫我排課綱」），先看課綱再挑要生成的。",
        },
      },
    },
    en: {
      title: "Lessons — courses built for your goal",
      lines: [
        "Tell the AI a topic; it <strong>asks your goal and level first</strong>, then builds an interactive course you study inside Obsidian.",
        "Press Mark done after each lesson to track progress; when you finish, ask the AI to turn the course into a Review Deck or Quest Map.",
      ],
      pickPrompt: "How do you want to start?",
      options: [
        { id: "build", label: "Build with AI", sub: "A whole course from one sentence" },
        { id: "plan", label: "Plan or import", sub: "Outline it first, or import existing HTML" },
        { id: "advanced", label: "Tips", sub: "Goal first; see the outline before generating" },
      ],
      pages: {
        build: {
          title: "Build a course with AI",
          body: [
            { h: "① <strong>Install skills</strong>: in Settings → EngramQuest → AI Skills, press Install for your tool." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong>, e.g. \"Teach me SEO, build a course.\" It <strong>asks your goal and level first</strong>, then builds it." },
            { v: "G8HxBl9Hf9o", label: "Demo: build a course with Claude Code" },
          ],
          first: "Say \"Teach me {topic}, build a course\" and answer its questions about your goal and level.",
        },
        plan: {
          title: "Plan it yourself or import",
          body: [
            { h: "Press <strong>New course</strong> to write just the outline (one lesson title per line, marked as planned). The AI fills them in later and <strong>your progress carries over</strong>." },
            { h: "<strong>Import HTML</strong>: bring in a lesson made elsewhere, kept exactly as it is." },
          ],
          first: "Press New course and lay out your first outline.",
        },
        advanced: {
          title: "Tips",
          body: [
            { h: "The core is <strong>goal-first learning</strong> (as in <em>Ultralearning</em>): tell the AI <strong>the goal you want to reach</strong> and let it draft the <strong>outline</strong>." },
            { h: "<strong>Generate only the parts you want</strong>; you don't have to build them all. Changing an outline is cheap, regenerating lessons is not." },
            { h: "Courses <strong>link to your vault</strong>; when you finish, the AI can turn one into a <strong>Review Deck or Quest Map</strong>." },
          ],
          first: "Tell the AI your goal (e.g. \"I want to build React apps on my own, draft an outline\"), review the outline, then pick.",
        },
      },
    },
  },
  memory: {
    img: "memory_map",
    "zh-tw": {
      title: "Memory Map — 看見知識全局",
      lines: [
        "用 Obsidian Canvas 把抽象概念畫成<strong>視覺結構</strong>，串連你既有的筆記。",
        "複習卡片時可以一鍵跳到對應的概念圖。",
      ],
      pickPrompt: "你想了解什麼？",
      options: [
        { id: "build", label: "如何建立", sub: "AI 生成，或自己建 canvas" },
        { id: "use", label: "怎麼用、怎麼連到複習", sub: "自動收錄、複習時跳轉" },
      ],
      pages: {
        build: {
          title: "如何建立 Memory Map",
          body: [
            { h: "① <strong>安裝 skills</strong>：到 設定 → EngramQuest → AI Skills，選你的工具按安裝。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong>，例如「幫 作業系統概論.md 建立 memory-map」。也可以自己建檔名 <code>{筆記名}-memory.canvas</code>，Hub 會自動收錄。" },
            { h: "AI 依<strong>記憶科學</strong>生成：反直覺的重點、連結既有筆記、分組、類比。" },
          ],
          first: "跟 AI 說「幫 {筆記}.md 建立 memory-map」，概念圖就會出現在這分頁。",
        },
        use: {
          title: "怎麼用、怎麼連到複習",
          body: [
            { h: "任何 <code>{筆記名}-memory.canvas</code> 都會自動出現在 <strong>Hub → Memory Map</strong>，點一下就在 Obsidian 打開。" },
            { h: "複習卡片時按 <strong>Memory Map 按鈕</strong>，會自動找到並打開對應的 canvas。" },
          ],
          first: "複習一張卡時點 Memory Map 按鈕，看它跳到對應的概念圖。",
        },
      },
    },
    en: {
      title: "Memory Map — see the big picture",
      lines: [
        "Lay abstract ideas onto an Obsidian Canvas as <strong>visual structure</strong>, linked to the notes you already have.",
        "Jump from a review card straight to its matching map.",
      ],
      pickPrompt: "What do you want to know?",
      options: [
        { id: "build", label: "How to create", sub: "Made by AI, or a canvas you build yourself" },
        { id: "use", label: "Use it and link it to review", sub: "Picked up automatically, opened from review" },
      ],
      pages: {
        build: {
          title: "How to create a Memory Map",
          body: [
            { h: "① <strong>Install skills</strong>: in Settings → EngramQuest → AI Skills, press Install for your tool." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong>, e.g. \"Create a memory-map for operating-systems.md.\" Or make a file named <code>{note-name}-memory.canvas</code> yourself; the Hub picks it up." },
            { h: "The AI builds it with <strong>memory science</strong>: surprising points, links to your notes, grouping, analogies." },
          ],
          first: "Tell your AI \"Create a memory-map for {note}.md\" and the map appears in this tab.",
        },
        use: {
          title: "Use it and link it to review",
          body: [
            { h: "Any <code>{note-name}-memory.canvas</code> shows up in <strong>Hub → Memory Map</strong>; click it to open it in Obsidian." },
            { h: "While reviewing, press the <strong>Memory Map button</strong> to find and open the matching canvas." },
          ],
          first: "While reviewing a card, press the Memory Map button and watch it jump to the map.",
        },
      },
    },
  },
  episodic: {
    img: "episodic_review",
    "zh-tw": {
      title: "情境回顧 — 回到那段時間讀過的東西",
      lines: [
        "把一段時間（通常一個月）讀過的筆記做成<strong>動畫回顧片</strong>，帶你回到當時學到的東西。片子依期間分組，點了就播。",
        "按「<strong>+ 做新的一支</strong>」選月份與片長，插件會給你一段提示，貼進 <strong>Claude Code</strong> 就開始製作。還沒做好的需求會列在上方。",
        "看已經做好的回顧片免費；做新的回顧片需要 <strong>Pro</strong>。",
      ],
      first: "按「+ 做新的一支」，選上個月，把提示貼進 Claude Code。",
    },
    en: {
      title: "Recall Films — back to what you read",
      lines: [
        "A recall film turns the notes you read over a period (usually a month) into an <strong>animated film</strong> that walks you back through what you learned. Films are grouped by period; click one to play.",
        "Press \"<strong>+ New film</strong>\", choose the months and a length, and the plugin gives you a prompt to paste into <strong>Claude Code</strong>. Requests still being made are listed at the top.",
        "Watching recall films you already have is free; making new ones needs <strong>Pro</strong>.",
      ],
      first: "Press \"+ New film\", pick last month, and paste the prompt into Claude Code.",
    },
  },
  video: {
    img: "video_academy",
    "zh-tw": {
      title: "影片學院 — 一句話，AI 做成教學短片",
      lines: [
        "說一句<strong>想學或想複習什麼</strong>，AI 會自己判斷要讀哪些筆記、拆成幾支<strong>短片</strong>。",
        "外層是系列書架（可篩選、搜尋），點進系列就是播放器，旁邊的<strong>播放清單</strong>標出每支看完沒、看到哪；下次<strong>從上次的位置續播</strong>。",
        "在「影片設定」<strong>選老師</strong>，每位老師教法不同：Nico 免費，其他老師和替每個系列指定老師需要 <strong>Pro</strong>。畫質、語言這些設一次就好。",
      ],
      first: "按「<strong>新系列</strong>」寫下想學什麼，例如「架設網站」，再把插件給你的提示貼進 <strong>Claude Code</strong>，影片做好就會出現在這裡。",
    },
    en: {
      title: "Video Academy — one sentence, AI turns it into short lessons",
      lines: [
        "Say <strong>what you want to learn or review</strong>; the AI decides which notes to use and splits it into <strong>short videos</strong>.",
        "The outer view is a shelf of series (filter and search); open one to watch, with a <strong>playlist</strong> that shows what you finished and where you stopped. You <strong>resume where you stopped</strong>.",
        "<strong>Pick a teacher</strong> in Video settings; each one teaches differently. Nico is free; the other teachers, and a different teacher for each series, need <strong>Pro</strong>. Quality and language only need setting once.",
      ],
      first: "Press <strong>New series</strong> and write what you want to learn, e.g. \"build a website\"; paste the prompt the plugin gives you into <strong>Claude Code</strong> and the videos appear here when they are done.",
    },
  },
  explainer: {
    img: "deepdive",
    "zh-tw": {
      title: "深入解析 — 難卡的白話救援",
      lines: [
        "複習時看不懂的卡，顯示答案後按「<strong>加入解析佇列</strong>」，AI 會生成一頁<strong>白話、圖解</strong>的深入解析。這是 <strong>Pro</strong> 功能。",
        "解析頁<strong>沒有自己的排程</strong>：原卡照常複習；若一直答錯，AI 下次會用更淺的方式重寫這頁。",
      ],
      pickPrompt: "你想了解什麼？",
      options: [
        { id: "build", label: "如何生成", sub: "加入佇列，再跟 AI 說一句話" },
        { id: "read", label: "閱讀與狀態", sub: "已讀、加星、完成" },
      ],
      pages: {
        build: {
          title: "如何生成深入解析",
          body: [
            { h: "① 複習時顯示答案後，對看不懂的卡按「<strong>加入解析佇列</strong>」（手機在「更多動作」選單裡）。" },
            { h: "② 跟你的 AI 工具說「<strong>處理解析</strong>」：engram-explainer skill 會讀佇列、判斷這張卡為什麼難（太難？太簡略？缺脈絡？），批次生成解析頁。" },
            { h: "也可以不經佇列直接說：「幫我做一份 HTTPS 的深入解析」。" },
          ],
          first: "複習時按「加入解析佇列」，之後跟 AI 說「處理解析」。",
        },
        read: {
          title: "閱讀與狀態",
          body: [
            { h: "解析頁依牌組分組；點開就算<strong>已讀</strong>，也可以加星號或按 <strong>✓</strong> 標記完成。" },
            { h: "解析頁是原卡的<strong>輔助教材</strong>，不佔複習排程：有沒有真的懂，下次複習那張卡見真章。" },
          ],
          first: "點開一頁解析讀讀看，讀完回 Review Deck 複習原卡。",
        },
      },
    },
    en: {
      title: "Deep Dive — plain-language help for hard cards",
      lines: [
        "When a card is too hard to understand, show the answer and press \"<strong>Queue deep dive</strong>\"; the AI writes a <strong>plain-language, illustrated</strong> page about it. This is a <strong>Pro</strong> feature.",
        "Deep dives have <strong>no schedule of their own</strong>: the original card keeps reviewing, and if it keeps failing the AI rewrites the page from a simpler starting point.",
      ],
      pickPrompt: "What do you want to know?",
      options: [
        { id: "build", label: "How to generate", sub: "Queue a card, then one sentence to your AI" },
        { id: "read", label: "Reading and status", sub: "Read, starred, done" },
      ],
      pages: {
        build: {
          title: "How to generate a Deep Dive",
          body: [
            { h: "① While reviewing, show the answer and press \"<strong>Queue deep dive</strong>\" on a hard card (on a phone it is in the More actions menu)." },
            { h: "② Tell your AI tool to \"<strong>process the deep dive queue</strong>\": the engram-explainer skill reads the queue, works out why each card failed you (too hard? too terse? missing context?) and writes the pages." },
            { h: "You can also skip the queue: \"Make a deep dive about HTTPS.\"" },
          ],
          first: "Press \"Queue deep dive\" during review, then tell your AI to \"process the deep dive queue\".",
        },
        read: {
          title: "Reading and status",
          body: [
            { h: "Pages are grouped by deck; opening one marks it <strong>read</strong>, and you can star it or press <strong>✓</strong> to mark it done." },
            { h: "A deep dive is <strong>support material</strong> for the original card and takes no review slot; the card's next review is the real test." },
          ],
          first: "Open a page and read it, then review the original card in your Review Deck.",
        },
      },
    },
  },
  achievement: {
    img: "achievements",
    "zh-tw": {
      title: "成就系統 — 看見你的累積",
      lines: [
        "上方是累積複習、已掌握、總卡數與<strong>連續天數</strong>，加上一張熟悉度圓圈圖和最近的複習活動。",
        "下方是<strong>成就收藏</strong>：複習量、連續天數、單日複習量、掌握張數，以及做 Memory Map、通關 Quest、完成課程都能解鎖徽章。點徽章看目前進度。",
      ],
      first: "完成一次複習，回來看你的第一枚徽章。",
    },
    en: {
      title: "Achievements — see what you have built up",
      lines: [
        "At the top: total cards reviewed, mastered, total cards and your <strong>day streak</strong>, plus a familiarity ring and your recent review activity.",
        "Below is the <strong>achievement collection</strong>: badges for review volume, streaks, cards reviewed in a day, cards mastered, and for making memory maps, clearing quests and finishing lessons. Click a badge to see your progress.",
      ],
      first: "Finish one review session, then come back for your first badge.",
    },
  },
};

function hasGuide(tab) {
  return Object.prototype.hasOwnProperty.call(CONTENT, tab);
}

// ui.js requires this file, so its helpers are loaded on first use rather than at the top.
function hubUi() { return require("./ui"); }

class FeatureGuideModal extends I.Modal {
  constructor(app, plugin, tab) {
    super(app);
    this.plugin = plugin;
    this.tab = tab;
    this.page = null; // null = the menu (or the only page); otherwise a sub-page id
  }

  onOpen() {
    const def = CONTENT[this.tab];
    if (!def) { this.close(); return; }
    this.def = def;
    this.locale = L(this.plugin.settings) === "zh-tw" ? "zh-tw" : "en";
    this.modalEl.addClass("lh-hub", "lh-guide");
    hubUi().watchTheme(this, { vars: true });
    this.render();
  }

  onClose() {
    this._stopVideos();
    activeDocument.querySelectorAll(".eq-guide-lightbox").forEach(el => el.remove());
  }

  // Electron keeps an iframe's audio and network alive after it leaves the DOM, so blank it first.
  _stopVideos() {
    this.contentEl.querySelectorAll("iframe").forEach(f => { try { f.src = "about:blank"; } catch (_) { /* ignore */ } });
  }

  zh() { return this.locale === "zh-tw"; }

  render() {
    this._stopVideos();
    this.contentEl.empty();
    const copy = this.def[this.locale];
    if (copy.options && this.page) this.renderPage(copy);
    else this.renderMenu(copy);
  }

  // A picture from the plugin's assets (`rel` is its path inside the plugin folder), shown only once it
  // has loaded; a missing file leaves nothing behind.
  _picture(parent, rel, alt, cls) {
    const wrap = parent.createDiv({ cls });
    wrap.hidden = true;
    const src = assetUrl(this.app, rel);
    const img = wrap.createEl("img", { attr: { src, alt } });
    img.addEventListener("load", () => { wrap.hidden = false; });
    img.addEventListener("error", () => wrap.remove());
    const zoom = wrap.createEl("button", { cls: "lh-guide-zoom", text: this.zh() ? "點擊放大" : "Click to enlarge", attr: { "aria-label": `${this.zh() ? "放大" : "Enlarge"}: ${alt}` } });
    wrap.addEventListener("click", () => openLightbox(src, alt));
    zoom.addEventListener("click", (ev) => { ev.stopPropagation(); openLightbox(src, alt); });
    return wrap;
  }

  _footer(hint) {
    const foot = this.contentEl.createDiv({ cls: "lh-guide-foot" });
    foot.createSpan({ cls: "lh-guide-hint", text: hint });
    foot.createEl("button", { cls: "lh-btn", text: this.zh() ? "開始" : "Got it" }).addEventListener("click", () => this.close());
  }

  _first(parent, html) {
    const box = parent.createDiv({ cls: "lh-guide-first" });
    box.createDiv({ cls: "lh-guide-first-h", text: this.zh() ? "第一步" : "First step" });
    box.createDiv().appendChild(I.sanitizeHTMLToDom(html));
  }

  renderMenu(copy) {
    this._picture(this.contentEl, `assets/guide/${this.def.img}_${this.zh() ? "中文" : "english"}.webp`, copy.title, "lh-guide-hero");
    const body = this.contentEl.createDiv({ cls: "lh-guide-body" });
    const head = body.createDiv({ cls: "lh-guide-title" });
    const meta = TABS[this.tab];
    hubUi().featureIcon(head, this.plugin, this.tab, { size: 36, fallback: meta.icon });
    head.createEl("h2", { text: copy.title });
    copy.lines.forEach(line => body.createEl("p").appendChild(I.sanitizeHTMLToDom(line)));

    if (copy.options) {
      body.createDiv({ cls: "lh-guide-pick", text: copy.pickPrompt });
      const list = body.createDiv({ cls: "lh-guide-opts" });
      copy.options.forEach(opt => {
        const row = list.createEl("button", { cls: "lh-guide-opt" });
        const text = row.createSpan({ cls: "lh-grow" });
        text.createEl("b", { text: opt.label });
        text.createSpan({ text: opt.sub });
        hubUi().icon(row, "chevron");
        row.addEventListener("click", () => { this.page = opt.id; this.render(); });
      });
    } else {
      this._first(body, copy.first);
    }
    this._footer(this.zh() ? "之後可從 Hub 的說明（?）再看一次" : "Open it again any time from Help (?) in the Hub");
  }

  renderPage(copy) {
    const page = copy.pages[this.page];
    if (!page) { this.page = null; this.render(); return; }
    const body = this.contentEl.createDiv({ cls: "lh-guide-body" });
    const back = body.createEl("button", { cls: "lh-guide-back", text: this.zh() ? "‹ 返回" : "‹ Back" });
    back.addEventListener("click", () => { this.page = null; this.render(); });
    body.createEl("h2", { cls: "lh-guide-ptitle", text: page.title });
    page.body.forEach(item => {
      if (item.v) videoEmbed(body, item.v, item.label, this.locale);
      else if (item.img) {
        const fig = this._picture(body, `assets/${item.img}`, item.label || "", "lh-guide-fig lh-guide-img");
        if (item.label) fig.createDiv({ cls: "lh-guide-cap", text: item.label });
      } else if (item.h) body.createDiv({ cls: "lh-guide-p" }).appendChild(I.sanitizeHTMLToDom(item.h));
    });
    if (page.first) this._first(body, page.first);
    this._footer(this.zh() ? "按返回看其他方式" : "Go back for the other ways in");
  }
}

// A YouTube demo as a 16:9 iframe, with a link to open it in the browser if the embed is blocked.
function videoEmbed(parent, id, label, locale) {
  const wrap = parent.createDiv({ cls: "lh-guide-fig" });
  if (label) wrap.createDiv({ cls: "lh-guide-cap", text: label });
  wrap.createDiv({ cls: "lh-guide-vid" }).createEl("iframe", { attr: {
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    title: label || "YouTube",
    allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
    allowfullscreen: "true",
    loading: "lazy",
  } });
  wrap.createEl("a", { cls: "lh-guide-yt", text: locale === "zh-tw" ? "無法播放？在瀏覽器開啟" : "Can't play? Open in browser", attr: { href: `https://youtu.be/${id}`, target: "_blank", rel: "noopener" } });
  return wrap;
}

// Full-screen image viewer, because a guide picture is too small to read in the dialog. Tagged so the
// owning modal can clear a stranded overlay on close; closes on click or Escape.
function openLightbox(src, alt) {
  const doc = activeDocument;
  const ov = doc.createElement("div");
  ov.className = "eq-guide-lightbox";
  const im = doc.createElement("img");
  im.src = src;
  im.alt = alt || "";
  ov.appendChild(im);
  const close = () => { ov.remove(); doc.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  ov.addEventListener("click", close);
  doc.addEventListener("keydown", onKey);
  doc.body.appendChild(ov);
  return ov;
}

// The "?" next to a page title (or in the phone sub-page bar) that reopens this tab's guide.
function attachInfoButton(headerEl, app, plugin, tab) {
  if (!hasGuide(tab)) return;
  const label = L(plugin.settings) === "zh-tw" ? "使用說明" : "How it works";
  const btn = headerEl.createEl("button", { cls: "lh-feature-info", attr: { title: label, "aria-label": label } });
  btn.appendChild(I.sanitizeHTMLToDom('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'));
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    new FeatureGuideModal(app, plugin, tab).open();
  });
  return btn;
}

module.exports = { FeatureGuideModal, attachInfoButton, hasFeatureGuide: hasGuide, openLightbox };
