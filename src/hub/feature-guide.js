"use strict";
// Per-feature onboarding modal. The first time a user opens a Hub feature tab
// (review / quest / lesson / memory) it pops a concise "image + what + first step"
// card so newcomers know their next action instead of hunting the global "?" help.
// Review Deck uses a multi-page router (menu → manual / ai / advanced sub-pages with
// embedded demo videos); the other tabs use the legacy single-page layout.
// Shown once per feature (tracked in settings._guideSeen); re-openable via the "?"
// button attached to each feature's card header (attachInfoButton).

const I = require("obsidian");
const { getLocale: L } = require("../i18n");

// One entry per feature tab id. `img` is the base filename in assets/guide/ WITHOUT
// the locale suffix — resolved to `{img}_中文.webp` / `{img}_english.webp` at render.
// review: has `options` + `pages` → multi-page router. Others: legacy {title,lines,first}.
const CONTENT = {
  review: {
    emoji: "🃏", img: "reviewdeck",
    "zh-tw": {
      title: "Review Deck — 三階回想複習",
      lines: [
        "把筆記變成閃卡，FSRS 在你<strong>快忘記的瞬間</strong>排複習。",
        "<strong>L1</strong> 只給問題逼你回想 → <strong>L2</strong> 從你的 vault 找出當初學它的脈絡 → <strong>L3</strong> 給關鍵字方向。",
      ],
      pickPrompt: "你想怎麼開始？",
      options: [
        { id: "manual", emoji: "🖊️", label: "手動建立", sub: "自己寫卡、或貼上 AI 回答，自動收錄" },
        { id: "ai", emoji: "🤖", label: "用 AI 建立", sub: "安裝 Skills，讓 AI 工具自動生成" },
        { id: "advanced", emoji: "🎓", label: "進階技巧", sub: "SVG 題、客製規則、挑筆記生成" },
      ],
      pages: {
        manual: {
          title: "🖊️ 手動建立 Review Deck",
          body: [
            { h: "只要兩個條件，筆記就會被<strong>自動偵測</strong>、加進牌組：<br>① 打上 <code>#flashcards/主題</code> tag　② 至少寫一張卡（最常用 <code>Q:/A:</code>，連續兩個空行結束一張卡）。" },
            { v: "XC0NsPVfcwE", label: "示範：自己手寫卡片" },
            { h: "<strong>也可以貼上 AI 回答</strong>：問 ChatGPT 或任意 AI，把整段答案複製、用 <code>%%card%%</code> 包進筆記就變成卡片 —— <strong>連 AI 生成的圖片也能一起加進牌組</strong>。" },
            { v: "pMf5mfCswBo", label: "示範：貼上 AI 回答快速建卡" },
          ],
          first: "打開任一筆記，加 <code>#flashcards/主題</code> + 一張 <code>Q: 問題 / A: 答案</code> 卡，回到這分頁就看到牌組。",
        },
        ai: {
          title: "🤖 用 AI 建立 Review Deck",
          body: [
            { h: "① 到 <strong>設定 → AI Skills</strong> 為你的工具點安裝。會裝 <strong>5 個 skills</strong>，其中 <code>engram-review-deck</code> 負責建 Review Deck。" },
            { h: "② 用 Claude Code / Codex / Antigravity / Gemini CLI / Cursor，<strong>從 Obsidian 筆記所在的資料夾</strong>打開，直接跟它說「幫我建立 Review Deck」。" },
            { v: "X9RhfC-l8d4", label: "示範：用 AI 建立 Review Deck 完整流程" },
            { h: "範例：<br>・「幫我查今天的筆記，把醫學相關名詞建成 Review Deck」<br>・「把 topic 物理、力學相關的建成 Review Deck，可以用 SVG 當題目和解答」<br>・「幫我查最新的 AI 資訊，建一個 Review Deck」" },
          ],
          first: "先到 設定 → AI Skills 安裝你的工具；不想安裝就改用「手動建立」貼上 AI 回答。",
        },
        advanced: {
          title: "🎓 進階技巧（best practice）",
          body: [
            { h: "<strong>用 AI 建 SVG 圖</strong>當題目或解答，做圖像記憶 —— 例如請 Claude「用 SVG 畫出這個結構當解答」。" },
            { h: "<strong>客製化 AI 風格</strong>：在 <code>CLAUDE.md</code> / <code>AGENTS.md</code> / <code>GEMINI.md</code> 加規則，例如「答案都用圖解呈現」「每個 ==highlight== 都要建一張卡」。" },
            { h: "<strong>先選再生成</strong>：讓 AI 先列出你最近的筆記，你直接挑要建成 Review Deck 的內容。" },
          ],
          first: "挑一個 best practice 試試 —— AI 卡片都存在 <code>engram-review/</code>，永遠不動你的來源筆記。",
        },
      },
    },
    en: {
      title: "Review Deck — Three-Stage Recall",
      lines: [
        "Turn notes into flashcards; FSRS schedules them <strong>right before you forget</strong>.",
        "<strong>L1</strong> question-only recall → <strong>L2</strong> AI rebuilds the moment you first learned it from your vault → <strong>L3</strong> a keyword nudge.",
      ],
      pickPrompt: "How do you want to start?",
      options: [
        { id: "manual", emoji: "🖊️", label: "Create manually", sub: "Write cards or paste an AI answer — auto-detected" },
        { id: "ai", emoji: "🤖", label: "Build with AI", sub: "Install Skills, let your AI tool generate them" },
        { id: "advanced", emoji: "🎓", label: "Pro tips", sub: "SVG questions, custom rules, pick-then-build" },
      ],
      pages: {
        manual: {
          title: "🖊️ Create a Review Deck manually",
          body: [
            { h: "Two conditions and a note is <strong>auto-detected</strong> into a deck:<br>① tag it <code>#flashcards/topic</code>　② write at least one card (usually <code>Q:/A:</code> — two blank lines end a card)." },
            { v: "XC0NsPVfcwE", label: "Demo: write your own cards" },
            { h: "<strong>You can also paste an AI answer</strong>: ask ChatGPT or any AI, copy the whole answer, wrap it in <code>%%card%%</code> in a note — it becomes cards, and <strong>AI-generated images go into the deck too</strong>." },
            { v: "pMf5mfCswBo", label: "Demo: build a deck by pasting an AI answer" },
          ],
          first: "Open any note, add <code>#flashcards/topic</code> + one <code>Q: … / A: …</code> card — the deck appears in this tab.",
        },
        ai: {
          title: "🤖 Build a Review Deck with AI",
          body: [
            { h: "① In <strong>Settings → AI Skills</strong>, click Install for your tool. It installs <strong>5 skills</strong>; <code>engram-review-deck</code> is the one that builds review decks." },
            { h: "② In Claude Code / Codex / Antigravity / Gemini CLI / Cursor — opened <strong>from the folder your Obsidian notes live in</strong> — just say \"Build a Review Deck.\"" },
            { v: "X9RhfC-l8d4", label: "Demo: the full Build-with-AI flow" },
            { h: "Examples:<br>・\"Check today's notes and build a Review Deck from the medical terms.\"<br>・\"Build a Review Deck on physics / mechanics, using SVG for questions and answers.\"<br>・\"Look up the latest AI news and build a Review Deck.\"" },
          ],
          first: "Install your tool in Settings → AI Skills; or skip it and paste an AI answer via \"Create manually\".",
        },
        advanced: {
          title: "🎓 Pro tips (best practices)",
          body: [
            { h: "<strong>Use AI to draw SVG</strong> as the question or answer for visual memory — e.g. ask Claude to \"draw this structure in SVG as the answer.\"" },
            { h: "<strong>Customize AI style</strong>: add rules to <code>CLAUDE.md</code> / <code>AGENTS.md</code> / <code>GEMINI.md</code>, e.g. \"always answer with diagrams\" or \"every ==highlight== becomes a card.\"" },
            { h: "<strong>Pick then build</strong>: have the AI list your recent notes first, then choose which ones to turn into a Review Deck." },
          ],
          first: "Try one best practice — AI cards stay in <code>engram-review/</code> and never touch your source notes.",
        },
      },
    },
  },
  quest: {
    emoji: "🗺️", img: "questmap",
    "zh-tw": {
      title: "Quest Map — 把筆記變成遊戲關卡",
      lines: [
        "一篇筆記 → 一張島嶼地圖，<strong>15 種互動題型</strong>逐關闖過去。",
        "難度 Easy / Medium / Hard，章末有 <strong>Boss Battle</strong> 綜合測驗。",
      ],
      pickPrompt: "你想了解什麼？",
      options: [
        { id: "build", emoji: "🛠️", label: "如何建立", sub: "安裝 Skills，叫 AI 把筆記變關卡" },
        { id: "play", emoji: "🎮", label: "玩法 & 題型", sub: "15 種挑戰、難度、Boss Battle" },
        { id: "advanced", emoji: "🎓", label: "進階技巧", sub: "依 topic 建立、選難度的訣竅" },
      ],
      pages: {
        build: {
          title: "🛠️ 如何建立 Quest Map",
          body: [
            { h: "① <strong>安裝 Skills</strong> — 到 設定 → AI Skills，選你的工具（Claude Code / Codex / Antigravity / Gemini CLI / Cursor）按「安裝」。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong> — 從 Obsidian 筆記所在的資料夾打開 AI，例如說「幫我建立關於高三數學的 quest-map，easy 難度」。" },
          ],
          first: "跟 AI 說「把 {筆記或主題} 做成 quest-map，{難度}」，地圖就出現在這分頁。",
        },
        play: {
          title: "🎮 玩法 & 題型",
          body: [
            { h: "<strong>15 種題型</strong>：選擇、是非、克漏字、輸入、排序、配對、倒數計時、快照記憶、競標（押籌碼）、時間軸、序列接龍、記憶宮殿、圖片題、圖片遮罩、iframe 互動模擬。" },
            { h: "難度 <strong>Easy / Medium / Hard</strong>；章末 <strong>Boss Battle</strong> 綜合測驗。<br><strong>5 種主題</strong>：天空島、科幻、RPG、海洋、極簡。" },
          ],
          first: "點任一 quest 卡進入地圖，逐關完成、挑戰 Boss。",
        },
        advanced: {
          title: "🎓 進階技巧（best practice）",
          body: [
            { h: "<strong>依你自己的筆記內容 / topic 建立</strong>效果最好 —— AI 對你真正讀過的東西最準。" },
            { h: "<strong>可指定難度</strong>（easy / medium / hard）；<strong>關卡越多、生成越久</strong>，想快就先做小範圍。" },
            { h: "範例：「幫我建立關於高三數學的 easy 難度 quest-map」。" },
            { h: "進度與分數和 quest 內容<strong>分開儲存</strong>，AI 更新關卡不會洗掉你的進度。" },
          ],
          first: "挑一個你熟的 topic，指定難度請 AI 生成一張 quest-map。",
        },
      },
    },
    en: {
      title: "Quest Map — Turn Notes into Challenges",
      lines: [
        "One note → an island map you clear through <strong>15 interaction types</strong>.",
        "Easy / Medium / Hard difficulty, with a final applied <strong>Boss Battle</strong>.",
      ],
      pickPrompt: "What do you want to know?",
      options: [
        { id: "build", emoji: "🛠️", label: "How to create", sub: "Install Skills, ask AI to turn a note into a map" },
        { id: "play", emoji: "🎮", label: "Play & types", sub: "15 challenges, difficulty, Boss Battle" },
        { id: "advanced", emoji: "🎓", label: "Pro tips", sub: "Build from your topic, pick difficulty" },
      ],
      pages: {
        build: {
          title: "🛠️ How to create a Quest Map",
          body: [
            { h: "① <strong>Install Skills</strong> — in Settings → AI Skills, click Install for your tool (Claude Code / Codex / Antigravity / Gemini CLI / Cursor)." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong> — open the AI from the folder your Obsidian notes live in and say, e.g. \"Build an easy quest-map about Grade-12 math.\"" },
          ],
          first: "Tell your AI \"Turn {note or topic} into a quest-map, {difficulty}\" — the map appears in this tab.",
        },
        play: {
          title: "🎮 Play & challenge types",
          body: [
            { h: "<strong>15 types</strong>: quiz, true/false, cloze, input, ordering, matching, countdown, snapshot, auction (bet coins), timeline, chain, memory palace, image quiz, image occlusion, interactive iframe simulations." },
            { h: "Difficulty <strong>Easy / Medium / Hard</strong>; a final <strong>Boss Battle</strong> applied test.<br><strong>5 themes</strong>: Sky Island, Sci-Fi, RPG, Ocean, Minimal." },
          ],
          first: "Click any quest card to enter the map, clear missions and beat the Boss.",
        },
        advanced: {
          title: "🎓 Pro tips (best practices)",
          body: [
            { h: "<strong>Build from your own note content / topic</strong> — AI is most accurate on what you've actually studied." },
            { h: "<strong>Pick a difficulty</strong> (easy / medium / hard); <strong>more levels take longer to generate</strong> — keep the scope small for speed." },
            { h: "Example: \"Build an easy quest-map about Grade-12 math.\"" },
            { h: "Progress and scores are <strong>stored separately</strong> from quest content, so AI can update a quest without wiping your progress." },
          ],
          first: "Pick a topic you know, set a difficulty, and ask AI to generate a quest-map.",
        },
      },
    },
  },
  lesson: {
    emoji: "🎓", img: "lesson_academy",
    "zh-tw": {
      title: "教材 — AI 為你打造課程",
      lines: [
        "告訴 AI 想學什麼，它<strong>先問你的目標和程度</strong>，再生成可在 Obsidian 內研讀的互動課程。",
        "每堂課附測驗，學完可一鍵轉成 Review Deck 或 Quest Map。",
      ],
      pickPrompt: "你想怎麼開始？",
      options: [
        { id: "build", emoji: "🤖", label: "用 AI 建立課程", sub: "一句話生成整套課程" },
        { id: "plan", emoji: "📝", label: "自己規劃 / 匯入", sub: "先排課綱，或匯入現成 HTML" },
        { id: "advanced", emoji: "🎓", label: "進階技巧", sub: "目標導向、課綱先選再生成" },
      ],
      pages: {
        build: {
          title: "🤖 用 AI 建立課程",
          body: [
            { h: "① <strong>安裝 Skills</strong> — 到 設定 → AI Skills，選你的工具按「安裝」。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong> — 例如「教我 SEO，建一套課程」，它會<strong>先問你的目標和程度</strong>再生成。" },
            { v: "G8HxBl9Hf9o", label: "示範：用 Claude Code 建立課程" },
          ],
          first: "跟 AI 說「教我 {主題}，建一套課程」，先回答它的目標 / 程度問題。",
        },
        plan: {
          title: "📝 自己規劃 / 匯入",
          body: [
            { h: "按「<strong>建立新課程</strong>」可先排課綱（只有標題的待生成課時），之後 AI 再補內容、<strong>進度延續</strong>。" },
            { h: "📥 <strong>匯入</strong>：把別處 AI 生成的課程 HTML 原樣匯入，不轉換。" },
          ],
          first: "按「建立新課程」排你的第一份課綱。",
        },
        advanced: {
          title: "🎓 進階技巧（best practice）",
          body: [
            { h: "核心是<strong>目標導向</strong>學習（《超速學習 Ultralearning》）：跟 AI 說你<strong>想達成的目標</strong>，讓它幫你排<strong>課綱</strong>。" },
            { h: "你<strong>挑想要的課綱</strong>生成就好，<strong>不一定要全部建立</strong> —— 改大綱便宜、重生成課程貴。" },
            { h: "課程<strong>連結你的 vault</strong>；學完一鍵<strong>轉成 Review Deck 或 Quest Map</strong>。" },
          ],
          first: "跟 AI 說你的學習目標（例：「我想能獨立寫 React，幫我排課綱」），先看課綱再挑要生成的。",
        },
      },
    },
    en: {
      title: "Lesson Academy — AI-Built Courses",
      lines: [
        "Tell AI a topic; it <strong>asks your goal and level first</strong>, then builds an interactive course you study inside Obsidian.",
        "Every lesson ends with a quiz — convert a finished course into a Review Deck or Quest Map.",
      ],
      pickPrompt: "How do you want to start?",
      options: [
        { id: "build", emoji: "🤖", label: "Build with AI", sub: "Generate a whole course in one sentence" },
        { id: "plan", emoji: "📝", label: "Plan / import", sub: "Outline it first, or import existing HTML" },
        { id: "advanced", emoji: "🎓", label: "Pro tips", sub: "Goal-first; pick outline before generating" },
      ],
      pages: {
        build: {
          title: "🤖 Build a course with AI",
          body: [
            { h: "① <strong>Install Skills</strong> — in Settings → AI Skills, click Install for your tool." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong> — e.g. \"Teach me SEO, build a course.\" It <strong>asks your goal and level first</strong>, then generates." },
            { v: "G8HxBl9Hf9o", label: "Demo: build a course with Claude Code" },
          ],
          first: "Say \"Teach me {topic}, build a course\" — answer its goal / level questions first.",
        },
        plan: {
          title: "📝 Plan it yourself / import",
          body: [
            { h: "Click <strong>New course</strong> to plan an outline first (title-only lessons marked \"to generate\"); AI fills them in later and <strong>your progress carries over</strong>." },
            { h: "📥 <strong>Import</strong>: bring in a course HTML generated elsewhere, kept as-is." },
          ],
          first: "Click New course and lay out your first outline.",
        },
        advanced: {
          title: "🎓 Pro tips (best practices)",
          body: [
            { h: "The core is <strong>goal-first learning</strong> (à la <em>Ultralearning</em>): tell AI <strong>the goal you want to reach</strong> and let it draft the <strong>outline</strong>." },
            { h: "<strong>Pick only the outline parts you want</strong> — you don't have to build them all. Changing the outline is cheap; regenerating lessons is not." },
            { h: "Courses <strong>link to your vault</strong>; convert a finished one into a <strong>Review Deck or Quest Map</strong> in one click." },
          ],
          first: "Tell AI your goal (e.g. \"I want to build React on my own — draft an outline\"), review the outline, then pick.",
        },
      },
    },
  },
  memory: {
    emoji: "🧠", img: "memory_map",
    "zh-tw": {
      title: "Memory Map — 看見知識全局",
      lines: [
        "用 Obsidian Canvas 把抽象概念畫成<strong>視覺結構</strong>，串連你既有的筆記。",
        "複習卡片時可一鍵跳到對應的概念圖。",
      ],
      pickPrompt: "你想了解什麼？",
      options: [
        { id: "build", emoji: "🛠️", label: "如何建立", sub: "AI 生成，或自建 canvas" },
        { id: "use", emoji: "🔗", label: "怎麼用 & 連動複習", sub: "自動偵測 + 複習跳轉" },
      ],
      pages: {
        build: {
          title: "🛠️ 如何建立 Memory Map",
          body: [
            { h: "① <strong>安裝 Skills</strong> — 到 設定 → AI Skills，選你的工具按「安裝」。" },
            { img: "install-skills.png", label: "在 設定 → AI Skills 安裝" },
            { h: "② <strong>在 AI 工具裡直接說</strong> — 例如「幫 作業系統概論.md 建立 memory-map」。也可自建檔名 <code>{筆記名}-memory.canvas</code>，Hub 會自動收錄。" },
            { h: "AI 用<strong>記憶科學</strong>生成：反直覺、連結既有筆記、分組、類比。" },
          ],
          first: "跟 AI 說「幫 {筆記}.md 建立 memory-map」，概念圖就出現在這分頁。",
        },
        use: {
          title: "🔗 怎麼用 & 連動複習",
          body: [
            { h: "任何 <code>{筆記名}-memory.canvas</code> 會在 <strong>Hub → Memory Map</strong> 自動偵測。" },
            { h: "複習卡片時按 <strong>Memory Map 鈕</strong>，自動找到並打開對應的 canvas。" },
          ],
          first: "複習一張卡時點 Memory Map 鈕，看它跳到對應概念圖。",
        },
      },
    },
    en: {
      title: "Memory Map — See the Big Picture",
      lines: [
        "Lay abstract concepts onto an Obsidian Canvas as <strong>visual structure</strong>, linked to your existing notes.",
        "Jump from a review card straight to its matching concept map.",
      ],
      pickPrompt: "What do you want to know?",
      options: [
        { id: "build", emoji: "🛠️", label: "How to create", sub: "AI-generated, or build a canvas yourself" },
        { id: "use", emoji: "🔗", label: "Use & link review", sub: "Auto-detect + jump from review" },
      ],
      pages: {
        build: {
          title: "🛠️ How to create a Memory Map",
          body: [
            { h: "① <strong>Install Skills</strong> — in Settings → AI Skills, click Install for your tool." },
            { img: "install-skills.png", label: "Install in Settings → AI Skills" },
            { h: "② <strong>Just tell your AI</strong> — e.g. \"Create a memory-map for OS-overview.md.\" Or make a file named <code>{note-name}-memory.canvas</code> yourself — Hub auto-detects it." },
            { h: "AI generates using <strong>memory science</strong>: novelty, association to your notes, chunking, analogy." },
          ],
          first: "Tell AI \"Create a memory-map for {note}.md\" — the map appears in this tab.",
        },
        use: {
          title: "🔗 Use it & link to review",
          body: [
            { h: "Any <code>{note-name}-memory.canvas</code> is auto-detected in <strong>Hub → Memory Map</strong>." },
            { h: "During review, click the <strong>Memory Map button</strong> to find and open the matching canvas automatically." },
          ],
          first: "While reviewing a card, click the Memory Map button to jump to its concept map.",
        },
      },
    },
  },
};

function hasGuide(tab) {
  return Object.prototype.hasOwnProperty.call(CONTENT, tab);
}

class FeatureGuideModal extends I.Modal {
  constructor(app, plugin, tab) {
    super(app);
    this.plugin = plugin;
    this.tab = tab;
    this.page = null; // null = menu (or legacy single page); else sub-page id
  }

  onOpen() {
    const def = CONTENT[this.tab];
    if (!def) { this.close(); return; }
    this.def = def;
    this.locale = L(this.plugin.settings) === "zh-tw" ? "zh-tw" : "en";

    const isDark = activeDocument.body.classList.contains("theme-dark");
    this.t = {
      isDark,
      bg: isDark ? "#1a1a2e" : "#ffffff",
      text: isDark ? "#e2e8f0" : "#1f2937",
      muted: isDark ? "#94a3b8" : "#6b7280",
      border: isDark ? "#2a2a44" : "#e5e7eb",
      accentBg: isDark ? "rgba(99,102,241,0.16)" : "#eef2ff",
      accentBorder: isDark ? "rgba(129,140,248,0.5)" : "#c7d2fe",
      accentText: isDark ? "#c7d2fe" : "#4338ca",
      codeBg: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6",
      cardBg: isDark ? "rgba(255,255,255,0.04)" : "#f8faff",
      hoverBg: isDark ? "rgba(99,102,241,0.16)" : "#eef2ff",
      imgBg: isDark ? "#12121f" : "#f8faff",
    };

    // Bounded-height shell: scrollable body + pinned footer button, so the CTA and
    // "Got it" are always reachable regardless of viewport height.
    this.modalEl.style.cssText = `width:min(92vw,500px);max-width:none;max-height:88vh;padding:0;overflow:hidden;border-radius:18px;background:${this.t.bg};color:${this.t.text};display:flex;flex-direction:column`;
    this.render();
  }

  onClose() {
    this._stopVideos();
    activeDocument.querySelectorAll(".eq-guide-lightbox").forEach(el => el.remove());
  }

  // Stop any demo iframes — Electron keeps audio/network alive after DOM removal,
  // so blank the src before the node is discarded (on navigation and on close).
  _stopVideos() {
    this.contentEl.querySelectorAll("iframe").forEach(f => { try { f.src = "about:blank"; } catch (_) { /* ignore */ } });
  }

  render() {
    const { contentEl } = this;
    this._stopVideos();
    contentEl.empty();
    contentEl.style.cssText = `padding:0;color:${this.t.text};display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden`;
    const copy = this.def[this.locale];
    if (copy.options) {
      if (this.page) this.renderPage(copy);
      else this.renderMenu(copy);
    } else {
      this.renderLegacy(copy);
    }
    // sanitizeHTMLToDom strips style attrs, so style inline <code> after render.
    contentEl.querySelectorAll("code").forEach(el => {
      el.style.cssText = `background:${this.t.codeBg};padding:1px 6px;border-radius:5px;font-size:12px;color:${this.t.text}`;
    });
  }

  // Shared footer with the close button.
  _footer(hint) {
    const t = this.t;
    const footer = this.contentEl.createEl("div", { attr: { style: `flex-shrink:0;padding:11px 22px;border-top:1px solid ${t.border};display:flex;align-items:center;justify-content:space-between;gap:10px;background:${t.bg}` } });
    footer.createEl("span", { text: hint, attr: { style: `font-size:11px;color:${t.muted}` } });
    const okBtn = footer.createEl("button", { text: this.locale === "zh-tw" ? "開始" : "Got it", attr: { style: "padding:8px 22px;border-radius:9px;border:none;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0" } });
    okBtn.addEventListener("click", () => this.close());
  }

  // Concept-image hero (click to enlarge). Used on menu + legacy.
  _hero(copyTitle) {
    const t = this.t;
    const imgFile = `${this.def.img}_${this.locale === "zh-tw" ? "中文" : "english"}.webp`;
    const imgSrc = this.app.vault.adapter.getResourcePath(
      I.normalizePath(`${this.plugin.manifest.dir}/assets/guide/${imgFile}`)
    );
    const imgWrap = this.contentEl.createEl("div", { attr: { style: `position:relative;flex-shrink:0;width:100%;background:${t.imgBg};border-bottom:1px solid ${t.border};cursor:zoom-in` } });
    const imgEl = imgWrap.createEl("img", { attr: { src: imgSrc, alt: copyTitle, style: "width:100%;display:block;max-height:32vh;object-fit:contain" } });
    imgEl.addEventListener("error", () => { imgWrap.style.display = "none"; });
    imgWrap.createEl("div", { text: this.locale === "zh-tw" ? "🔍 點擊放大" : "🔍 Click to enlarge", attr: { style: "position:absolute;right:8px;bottom:8px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,0.62);color:#fff;font-size:11px;font-weight:600;pointer-events:none" } });
    imgWrap.addEventListener("click", () => openLightbox(imgSrc, copyTitle));
  }

  // Renders a local asset image inside a sub-page body (e.g. the install-skills
  // screenshot for the "how to create" flow). Click to enlarge.
  _bodyImage(parent, file, label) {
    const t = this.t;
    const src = this.app.vault.adapter.getResourcePath(
      I.normalizePath(`${this.plugin.manifest.dir}/assets/${file}`)
    );
    const wrap = parent.createEl("div", { attr: { style: "margin:11px 0" } });
    if (label) wrap.createEl("div", { text: label, attr: { style: `font-size:12px;font-weight:600;margin-bottom:5px;color:${t.muted}` } });
    const box = wrap.createEl("div", { attr: { style: `position:relative;border-radius:10px;overflow:hidden;border:1px solid ${t.border};background:${t.imgBg};cursor:zoom-in` } });
    const im = box.createEl("img", { attr: { src, alt: label || "", style: "width:100%;display:block;max-height:30vh;object-fit:contain" } });
    im.addEventListener("error", () => { wrap.style.display = "none"; });
    box.createEl("div", { text: this.locale === "zh-tw" ? "🔍 點擊放大" : "🔍 Click to enlarge", attr: { style: "position:absolute;right:8px;bottom:8px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,0.62);color:#fff;font-size:11px;font-weight:600;pointer-events:none" } });
    box.addEventListener("click", () => openLightbox(src, label || ""));
  }

  renderMenu(copy) {
    const t = this.t;
    this._hero(copy.title);
    const scroll = this.contentEl.createEl("div", { attr: { style: "flex:1;min-height:0;overflow-y:auto;padding:16px 22px 10px" } });

    const titleRow = scroll.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;margin-bottom:8px" } });
    titleRow.createEl("span", { text: this.def.emoji, attr: { style: "font-size:22px;line-height:1" } });
    titleRow.createEl("span", { text: copy.title, attr: { style: "font-size:16.5px;font-weight:700" } });

    copy.lines.forEach(line => {
      const p = scroll.createEl("p", { attr: { style: `margin:7px 0;font-size:13px;line-height:1.6;color:${t.text}` } });
      p.appendChild(I.sanitizeHTMLToDom(line));
    });

    scroll.createEl("div", { text: copy.pickPrompt, attr: { style: `margin:14px 0 6px;font-size:12.5px;font-weight:700;color:${t.muted}` } });

    copy.options.forEach(opt => {
      const row = scroll.createEl("button", { attr: { style: `width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:12px 14px;margin:8px 0;border-radius:12px;border:1px solid ${t.border};background:${t.cardBg};cursor:pointer;color:${t.text}` } });
      row.createEl("span", { text: opt.emoji, attr: { style: "font-size:21px;flex-shrink:0" } });
      const tx = row.createEl("div", { attr: { style: "flex:1;min-width:0" } });
      tx.createEl("div", { text: opt.label, attr: { style: "font-size:14px;font-weight:700" } });
      tx.createEl("div", { text: opt.sub, attr: { style: `font-size:11.5px;color:${t.muted};margin-top:2px` } });
      row.createEl("span", { text: "›", attr: { style: `font-size:20px;color:${t.muted};flex-shrink:0` } });
      row.addEventListener("mouseenter", () => { row.style.background = t.hoverBg; });
      row.addEventListener("mouseleave", () => { row.style.background = t.cardBg; });
      row.addEventListener("click", () => { this.page = opt.id; this.render(); });
    });

    this._footer(this.locale === "zh-tw" ? "之後可點標題旁的 ? 再看一次" : "Reopen via the ? next to the title");
  }

  renderPage(copy) {
    const t = this.t;
    const page = copy.pages[this.page];
    if (!page) { this.page = null; this.render(); return; }
    const scroll = this.contentEl.createEl("div", { attr: { style: "flex:1;min-height:0;overflow-y:auto;padding:14px 22px 10px" } });

    const back = scroll.createEl("button", { attr: { style: `display:inline-flex;align-items:center;gap:5px;padding:5px 11px;margin-bottom:12px;border-radius:8px;border:1px solid ${t.border};background:transparent;cursor:pointer;color:${t.accentText};font-size:12px;font-weight:600` } });
    back.setText(this.locale === "zh-tw" ? "← 返回" : "← Back");
    back.addEventListener("click", () => { this.page = null; this.render(); });

    scroll.createEl("div", { text: page.title, attr: { style: "font-size:16px;font-weight:700;margin-bottom:10px" } });

    page.body.forEach(item => {
      if (item.v) {
        videoEmbed(scroll, item.v, item.label, this.locale, t);
      } else if (item.img) {
        this._bodyImage(scroll, item.img, item.label);
      } else if (item.h) {
        const p = scroll.createEl("div", { attr: { style: `margin:8px 0;font-size:13px;line-height:1.65;color:${t.text}` } });
        p.appendChild(I.sanitizeHTMLToDom(item.h));
      }
    });

    if (page.first) {
      const cta = scroll.createEl("div", { attr: { style: `margin-top:14px;padding:11px 14px;background:${t.accentBg};border:1px solid ${t.accentBorder};border-radius:12px` } });
      cta.createEl("div", { text: this.locale === "zh-tw" ? "👉 第一步" : "👉 First step", attr: { style: `font-size:12px;font-weight:700;color:${t.accentText};margin-bottom:5px;letter-spacing:0.02em` } });
      cta.createEl("div", { attr: { style: `font-size:13px;line-height:1.6;color:${t.text}` } }).appendChild(I.sanitizeHTMLToDom(page.first));
    }

    this._footer(this.locale === "zh-tw" ? "← 返回可看其他建立方式" : "← Back for other ways to build");
  }

  // Legacy single-page layout for tabs without an options/pages router.
  renderLegacy(copy) {
    const t = this.t;
    this._hero(copy.title);
    const scroll = this.contentEl.createEl("div", { attr: { style: "flex:1;min-height:0;overflow-y:auto;padding:16px 22px 6px" } });
    const titleRow = scroll.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;margin-bottom:8px" } });
    titleRow.createEl("span", { text: this.def.emoji, attr: { style: "font-size:22px;line-height:1" } });
    titleRow.createEl("span", { text: copy.title, attr: { style: "font-size:16.5px;font-weight:700" } });
    copy.lines.forEach(line => {
      const p = scroll.createEl("p", { attr: { style: `margin:7px 0;font-size:13px;line-height:1.6;color:${t.text}` } });
      p.appendChild(I.sanitizeHTMLToDom(line));
    });
    const cta = scroll.createEl("div", { attr: { style: `margin-top:12px;padding:11px 14px;background:${t.accentBg};border:1px solid ${t.accentBorder};border-radius:12px` } });
    cta.createEl("div", { text: this.locale === "zh-tw" ? "👉 第一步" : "👉 First step", attr: { style: `font-size:12px;font-weight:700;color:${t.accentText};margin-bottom:5px;letter-spacing:0.02em` } });
    cta.createEl("div", { attr: { style: `font-size:13px;line-height:1.6;color:${t.text}` } }).appendChild(I.sanitizeHTMLToDom(copy.first));
    this._footer(this.locale === "zh-tw" ? "之後可點標題旁的 ? 再看一次" : "Reopen via the ? next to the title");
  }
}

// Embeds a YouTube demo video as a responsive 16:9 iframe, with a browser-open
// fallback link in case Obsidian's CSP blocks the embed.
function videoEmbed(parent, id, label, locale, t) {
  const wrap = parent.createEl("div", { attr: { style: "margin:11px 0" } });
  if (label) wrap.createEl("div", { text: label, attr: { style: `font-size:12px;font-weight:600;margin-bottom:5px;color:${t.muted}` } });
  const box = wrap.createEl("div", { attr: { style: `position:relative;width:100%;padding-bottom:56.25%;border-radius:10px;overflow:hidden;border:1px solid ${t.border};background:#000` } });
  box.createEl("iframe", { attr: {
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    style: "position:absolute;inset:0;width:100%;height:100%;border:0",
    allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
    allowfullscreen: "true",
    loading: "lazy",
  } });
  const fb = wrap.createEl("a", { text: locale === "zh-tw" ? "▶ 若無法播放，在瀏覽器開啟" : "▶ Can't play? Open in browser", attr: { href: `https://youtu.be/${id}`, target: "_blank", rel: "noopener", style: "display:inline-block;margin-top:5px;font-size:11px;color:#818cf8;text-decoration:none" } });
  fb.addEventListener("mouseenter", () => { fb.style.textDecoration = "underline"; });
  fb.addEventListener("mouseleave", () => { fb.style.textDecoration = "none"; });
  return wrap;
}

// Full-screen image viewer — the modal thumbnail is too small to read the infographic.
// Tagged with .eq-guide-lightbox so the owning modal can clear a stranded overlay on
// close; closes on click or Escape (and unbinds its own key listener).
function openLightbox(src, alt) {
  const doc = activeDocument;
  const ov = doc.createElement("div");
  ov.className = "eq-guide-lightbox";
  ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px;-webkit-tap-highlight-color:transparent";
  const im = doc.createElement("img");
  im.src = src;
  im.alt = alt || "";
  im.style.cssText = "max-width:96vw;max-height:96vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.55)";
  ov.appendChild(im);
  const close = () => { ov.remove(); doc.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  ov.addEventListener("click", close);
  doc.addEventListener("keydown", onKey);
  doc.body.appendChild(ov);
  return ov;
}

// Adds a clear "?" button to a feature card header that reopens this feature's guide.
function attachInfoButton(headerEl, app, plugin, tab) {
  if (!hasGuide(tab)) return;
  const isDark = activeDocument.body.classList.contains("theme-dark");
  const baseBg = isDark ? "rgba(99,102,241,0.18)" : "#eef2ff";
  const hoverBg = isDark ? "rgba(99,102,241,0.34)" : "#e0e7ff";
  const btn = headerEl.createEl("button", { attr: { class: "lh-feature-info", title: L(plugin.settings) === "zh-tw" ? "使用說明" : "How it works", "aria-label": "guide" } });
  btn.style.cssText = `width:26px;height:26px;border-radius:50%;border:1px solid ${isDark ? "rgba(129,140,248,0.55)" : "#c7d2fe"};background:${baseBg};cursor:pointer;color:${isDark ? "#c7d2fe" : "#4f46e5"};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0`;
  btn.appendChild(I.sanitizeHTMLToDom('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'));
  btn.addEventListener("mouseenter", () => { btn.style.background = hoverBg; });
  btn.addEventListener("mouseleave", () => { btn.style.background = baseBg; });
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    new FeatureGuideModal(app, plugin, tab).open();
  });
  return btn;
}

module.exports = { FeatureGuideModal, attachInfoButton, hasFeatureGuide: hasGuide, openLightbox };
