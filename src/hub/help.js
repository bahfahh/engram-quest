"use strict";
const I = require("obsidian");
const { t: c, getLocale: L } = require("../i18n");
const { registerSelectionCopy } = require("../ui/selection-copy");

var fe=class extends I.Modal{constructor(e,t){super(e),this.plugin=t}onClose(){var e;(e=activeDocument.getElementById("lh-help-styles"))==null||e.remove()}onOpen(){let e=this.plugin.settings,t=L(e),_isDark=activeDocument.body.classList.contains("theme-dark"),_bgPrimary=_isDark?"#1e1e2e":"#ffffff",_bgSecondary=_isDark?"#252538":"#f3f4f6",_textNormal=_isDark?"#e2e8f0":"#1f2937",_textMuted=_isDark?"#94a3b8":"#6b7280",_border=_isDark?"#3a3a5a":"#e5e7eb",_bgCard=_isDark?"#1a1a2e":"#f8faff";let imgInstallSkills=this.app.vault.adapter.getResourcePath(I.normalizePath(`${this.plugin.manifest.dir}/assets/install-skills.png`));this.modalEl.addClass("lh-help"),_isDark&&this.modalEl.addClass("lh-dark"),registerSelectionCopy(this),this.modalEl.style.cssText=`width:min(95vw,800px);max-width:none;height:min(90vh,700px);max-height:none;padding:0;overflow:hidden;border-radius:20px;background:${_bgCard}`,this.modalEl.style.setProperty("--background-primary",_bgPrimary,"important"),this.modalEl.style.setProperty("--background-secondary",_bgSecondary,"important"),this.modalEl.style.setProperty("--text-normal",_textNormal,"important"),this.modalEl.style.setProperty("--text-muted",_textMuted,"important"),this.modalEl.style.setProperty("--background-modifier-border",_border,"important"),this.contentEl.style.cssText=`padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${_bgCard};color:${_textNormal}`;let{contentEl:r}=this;r.empty();let s=r.createEl("div",{attr:{style:"padding:24px;border-bottom:1px solid var(--background-modifier-border);display:flex;justify-content:space-between;align-items:center"}});s.createEl("h2",{text:c(e,"HELP_TITLE"),attr:{style:"margin:0;font-size:18px;font-weight:700"}}),s.createEl("button",{text:"×",attr:{style:"width:32px;height:32px;background:transparent;border:none;cursor:pointer;font-size:20px;line-height:1;color:var(--text-muted)"}}).addEventListener("click",()=>this.close());let a=activeDocument.createElement("style");a.textContent=`
      .lh-help-acc { border:1px solid #e5e7eb; border-radius:10px; margin-bottom:10px; overflow:hidden; background:#fff; }
      .lh-help-acc-hdr { display:flex; align-items:center; gap:10px; padding:14px 16px; cursor:pointer; user-select:none; background:#fff; transition:background 0.15s; }
      .lh-help-acc-hdr:hover { background:#f8faff; }
      .lh-help-acc-hdr.open { background:#f0f7ff; }
      .lh-help-acc-icon { font-size:18px; flex-shrink:0; }
      .lh-help-acc-title { flex:1; font-weight:600; font-size:14px; color:#1f2937; }
      .lh-help-acc-tag { font-size:11px; font-weight:500; padding:2px 8px; border-radius:99px; background:#f3f4f6; color:#6b7280; flex-shrink:0; }
      .lh-help-acc-arrow { color:#9ca3af; transition:transform 0.2s; flex-shrink:0; }
      .lh-help-acc-hdr.open .lh-help-acc-arrow { transform:rotate(90deg); }
      .lh-help-acc-body { display:none; padding:0 16px 16px; font-size:13.5px; line-height:1.65; color:#374151; border-top:1px solid #e5e7eb; }
      .lh-help-acc-body.open { display:block; }
      .lh-help-acc-body p { margin:8px 0; }
      .lh-help-acc-body ul, .lh-help-acc-body ol { margin:6px 0 6px 18px; }
      .lh-help-acc-body li { margin:4px 0; }
      .lh-help-acc-body code { background:#f3f4f6; padding:1px 6px; border-radius:4px; font-size:12.5px; }
      .lh-help-acc-body table { width:100%; border-collapse:collapse; margin:10px 0; font-size:13px; }
      .lh-help-acc-body th { background:#f9fafb; padding:8px 10px; text-align:left; border:1px solid #e5e7eb; font-weight:600; }
      .lh-help-acc-body td { padding:8px 10px; border:1px solid #e5e7eb; vertical-align:top; }
      .lh-help-acc-body tr:nth-child(even) td { background:#fafafa; }
      .lh-help-sub { display:flex; gap:8px; align-items:flex-start; padding:10px 12px; background:#f8faff; border-radius:8px; margin:8px 0; border-left:3px solid #3b82f6; }
      .lh-help-sub-icon { font-size:20px; flex-shrink:0; line-height:1; }
      .lh-help-intro { background:linear-gradient(135deg,#f0f7ff,#faf5ff); border-radius:10px; padding:16px; margin-bottom:14px; }
      .lh-help-intro p { margin:0; font-size:13.5px; color:#374151; line-height:1.6; }
      .lh-help-chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
      .lh-help-chip { padding:4px 12px; border-radius:99px; font-size:12px; font-weight:600; }
      .lh-help-acc-body pre { background:#f3f4f6; padding:8px 10px; border-radius:6px; font-size:12px; margin:6px 0; overflow-x:auto; white-space:pre-wrap; }
      .lh-help-fmt-chip { padding:2px 6px; border-radius:6px; font-weight:700; }
      .lh-help-fmt-chip code { background:transparent !important; color:inherit !important; padding:0 !important; }
      .lh-help.lh-dark .lh-help-acc { border-color:var(--background-modifier-border); background:var(--background-secondary); }
      .lh-help.lh-dark .lh-help-acc-hdr { background:var(--background-secondary); }
      .lh-help.lh-dark .lh-help-acc-hdr:hover { background:rgba(99,102,241,0.12); }
      .lh-help.lh-dark .lh-help-acc-hdr.open { background:rgba(99,102,241,0.18); }
      .lh-help.lh-dark .lh-help-acc-title { color:var(--text-normal); }
      .lh-help.lh-dark .lh-help-acc-tag { background:rgba(99,102,241,0.22); color:#c7d2fe; font-weight:600; }
      .lh-help.lh-dark .lh-help-acc-arrow { color:var(--text-muted); }
      .lh-help.lh-dark .lh-help-acc-body { color:var(--text-normal); border-top-color:var(--background-modifier-border); }
      .lh-help.lh-dark .lh-help-acc-body code,
      .lh-help.lh-dark .lh-help-acc-body pre { background:rgba(255,255,255,0.06); color:var(--text-normal); }
      .lh-help.lh-dark .lh-help-acc-body th { background:rgba(255,255,255,0.06); border-color:var(--background-modifier-border); color:var(--text-normal); }
      .lh-help.lh-dark .lh-help-acc-body td { border-color:var(--background-modifier-border); color:var(--text-normal); }
      .lh-help.lh-dark .lh-help-acc-body tr:nth-child(even) td { background:rgba(255,255,255,0.03); }
      .lh-help.lh-dark .lh-help-sub { background:rgba(255,255,255,0.04); }
      .lh-help.lh-dark .lh-help-intro { background:linear-gradient(135deg,rgba(59,130,246,0.16),rgba(124,58,237,0.14)); }
      .lh-help.lh-dark .lh-help-intro p { color:var(--text-normal); }
    `,a.id="lh-help-styles",activeDocument.head.appendChild(a);let o=r.createEl("div",{attr:{style:"flex:1;overflow-y:auto;padding:20px;font-size:14px;line-height:1.6"}}),i=o.createEl("div",{attr:{class:"lh-help-intro"}});i.innerHTML=t==="zh-tw"?`
      <p><strong>EngramQuest</strong> 讓你用 AI 快速建立學習內容，直接在 Obsidian 裡學習。</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">🃏 Review Deck — 長期記憶，FSRS 排程</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">🗺️ Quest Map — 結構化學習地圖</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">🧠 Memory Map — 視覺化概念地圖</span>
        <span class="lh-help-chip" style="background:#dbeafe;color:#0c4a6e">🎴 Quadrant Card — A4 超記憶卡（Pro）</span>
      </div>
    `:`
      <p><strong>EngramQuest</strong> lets you use AI to build learning content and study it directly in Obsidian.</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">🃏 Review Deck — Long-term memory</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">🗺️ Quest Map — Structured learning</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">🧠 Memory Map — Visual concept map</span>
        <span class="lh-help-chip" style="background:#dbeafe;color:#0c4a6e">🎴 Quadrant Card — A4 super-memory (Pro)</span>
      </div>
    `;let d='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',f=0,h=[];t==="zh-tw"&&(h=[{icon:"🃏",title:"建立第一個 Review Deck",tag:"手動開始",html:`
            <p><strong>Step 1：在筆記加上標籤（Deck 名稱）</strong></p>
            <p>在你的筆記任意位置加上 <code>#flashcards/主題</code>。例如 <code>#flashcards/英文</code> 就會建立一個名為「英文」的 Deck。</p>
            <p><strong>Step 2：撰寫卡片內容</strong></p>
            <p>支援三種格式，推薦使用 <code>Q:/A:</code>（支援多行、圖片、表格）：</p>
            <pre>Q: 誰提出了相對論？
A: 愛因斯坦

Q: 什麼是間隔重複？
A: 在快忘記時複習，可以用最少時間達到最高記憶保留率。
   每次成功回想後，下次複習的間隔會自動拉長。

{{c1::間隔重複}} 是最有效的學習方法

畢氏定理 :: a² + b² = c²</pre>
            <p><strong>Step 3：到 Hub 開始複習</strong></p>
            <p>點側邊欄圖示開啟 Hub → <strong>Review Deck</strong> → 你就會看到剛建立的牌組了！</p>
          `},{icon:"🚀",title:"開始使用 AI",tag:"AI 自動化",html:`
            <p><strong>Step 1：安裝 AI Skills</strong></p>
            <ol>
              <li>Obsidian 設定 → <strong>EngramQuest → AI Skills</strong></li>
              <li>選你用的工具：Claude Code / Codex / Gemini CLI / Cursor</li>
              <li>安裝後 AI 就知道怎麼幫你建立三個模組的內容</li>
            </ol>
            <img src="${imgInstallSkills}" alt="Install Skills 示意圖" style="width:100%;border-radius:8px;margin:10px 0;border:1px solid #e5e7eb;" />
            <p><strong>Step 2：跟 AI 說</strong></p>
            <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>「把 tag:math 的筆記都做成 Review Deck」<br>「把和行銷相關的筆記做成 Review Deck」</div></div>
            <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>「把微積分.md 做成 quest-map medium」<br>「把 tag:math 的筆記合成一個 quest-map hard」</div></div>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>「幫作業系統概論.md 建立 memory-map」<br>「把和網路協定相關的筆記做成 memory-map」</div></div>
            <div class="lh-help-sub" style="border-color:#d97706"><div class="lh-help-sub-icon">🎓</div><div>「教我 SEO，建一套課程」<br>「我想學 .NET，做成教材」</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">🎴</div><div>「升級」把標記的卡做成四象限卡<br>「把數據飛輪做成四象限卡」<br>跟 AI 說「四象限卡 / 四格卡 / 超記憶卡 / Quadrant Card」任一名稱都能建立。<br>不要的卡片可在「四象限卡」分頁的牌組列或複習卡內按 🗑️ 刪除。 <span style="background:#fde68a;color:#92400e;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:700;">Pro</span></div></div>
            <p><strong>Step 3：開 Hub 開始學</strong></p>
            <p style="margin:4px 0">點側邊欄的 EngramQuest 圖示 → 切到對應分頁 → 開始學習。</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <ol>
              <li>跟 AI 說：「把 tag:math 的筆記做成 Review Deck」</li>
              <li>AI 讀取你的筆記，在 <code>engram-review/ai-cards/</code> 建立卡片檔（含 <code>#flashcards/math</code> tag 和 <code>question :: answer</code> 格式）</li>
              <li>開 Hub → Review Deck → 開始複習</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>你的一般筆記不需要有任何 tag，AI 可以直接讀取。AI <strong>產生的卡片檔</strong>存在 <code>engram-review/ai-cards/</code>，<strong>不會修改你的原始筆記</strong>。你自己手寫的卡片，在複習時使用「編輯」、「高亮」或「引述」功能，變更會直接寫回原始筆記。卡片檔需要有 <code>#flashcards/...</code> tag，插件才能偵測到。</div></div>
            <p><strong>相容模式：</strong>如果你有舊式 <code>::</code> 卡片筆記，可以到設定中開啟 legacy <code>::</code> 掃描。這是遷移模式，不是新手預設。</p>
          `},{icon:"🃏",title:"AI 長答案卡片",tag:"%%card%%",html:`
            <p><strong>Q：如何把 AI 長回答做成 Review Deck 卡片？</strong></p>
            <p><strong>A：</strong>平常寫卡片仍然用 <span class="lh-help-fmt-chip" style="background:#dcfce7;color:#166534;"><code>Q:/A:</code> 日常格式</span>。如果你要貼上很長的 AI 回答，而且答案裡可能有 <code>---</code>、表格、程式碼區塊或很多空行，就用 <span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code> 安全模式</span> 包住一張卡。</p>
            <pre>#flashcards/ai

%%card%%
Q: 如何解釋 agentic testing？
A:
Agentic testing 檢查的是 AI 系統能不能可靠完成任務，而不只是某個函式有沒有回傳正確值。

---

範例：
- 給 agent 一個真實任務
- 驗證最後產物
- 檢查 logs、tool calls、失敗復原

&#96;&#96;&#96;js
expect(result.completed).toBe(true)
&#96;&#96;&#96;
%%card%%</pre>
            <p><strong>重點：</strong><code>A:</code> 後面的內容會一直保留到結尾的 <span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code></span>。中間的 <span class="lh-help-fmt-chip" style="background:#dbeafe;color:#1d4ed8;"><code>---</code></span> 不會截斷卡片；既有 <code>---</code> fenced 卡片也仍然支援，不需要重建。</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">⚡</div><div><strong>最快輸入方式：</strong>在空行按 <code>Ctrl+/</code>（Mac 為 <code>Cmd+/</code>），Obsidian 會直接幫你插入 <code>%% %%</code> 並把游標放中間。輸入 <code>card</code> 就成了 <code>%% card %%</code>，可以直接用。空格和大小寫都認，<code>%%card%%</code>、<code>%% card %%</code>、<code>%%CARD%%</code> 三種寫法效果一樣。</div></div>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <ol>
              <li>跟 AI 說：「把微積分.md 做成 quest-map medium」</li>
              <li>AI 建立學習地圖</li>
              <li>進度會另外儲存，AI 更新 quest 時不會清掉已完成節點</li>
              <li>進階 quest 可以使用本機 iframe HTML 模擬互動系統</li>
              <li>開 Hub → Quest Map → 依序點開節點和挑戰</li>
            </ol>
            <table>
              <tr><th>難度</th><th>適合</th></tr>
              <tr><td><strong>easy</strong></td><td>初次接觸</td></tr>
              <tr><td><strong>medium</strong></td><td>知識鞏固</td></tr>
              <tr><td><strong>hard</strong></td><td>自我測驗</td></tr>
            </table>
          `},{icon:"🧠",title:"Memory Map",tag:c(e,"HELP_MEMORY_TAG"),html:`
            <p><strong>建立方式（三種都可以）</strong></p>
            <ol>
              <li><strong>AI 生成：</strong>跟 AI 說「幫作業系統概論.md 建立 memory-map」，AI 會自動建立 <code>作業系統概論-memory.canvas</code></li>
              <li><strong>手動建立：</strong>在 Obsidian 新增 Canvas 檔案，命名為 <code>{筆記名}-memory.canvas</code>，插件就會自動偵測</li>
              <li><strong>存放位置：</strong>預設放在來源筆記同資料夾。也可以在設定中指定 Memory Map 資料夾，集中管理</li>
            </ol>
            <p><strong>偵測規則</strong></p>
            <p>插件會掃描 vault 中所有檔名以 <code>-memory.canvas</code> 結尾的檔案，自動收錄到 Hub → Memory Map 頁籤。</p>
            <p><strong>與 Review Deck 的關聯</strong></p>
            <p>複習卡片時，底部的「Memory Map」按鈕會自動尋找對應的 canvas：</p>
            <ol>
              <li>先找同名的 <code>-memory.canvas</code>（根據來源筆記名稱）</li>
              <li>找不到時，會掃描所有 memory canvas 的內容，如果 canvas 裡有指向該筆記的 file node，就會自動關聯</li>
            </ol>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">💡</div><div>建議讓 canvas 裡包含一個指向來源筆記的 file node（AI 生成時會自動加入），這樣即使檔案移動或改名，Obsidian 也會自動更新路徑，關聯不會斷掉。</div></div>
          `},{icon:"🎓",title:"課程學院（教材）",tag:"AI 教學",html:`
            <p>告訴 AI 你想學什麼，它會建立一套專屬課程：互動式 HTML 教材，直接在 plugin 裡學習、追蹤進度。</p>
            <p><strong>運作機制</strong></p>
            <ol>
              <li>跟 AI 說：「教我 SEO」或「我想學 .NET，幫我建課程」（Lesson Academy skill）</li>
              <li>AI 詢問你的目標和程度，設計課程大綱，逐課生成 HTML 教材到 <code>engram-quest/lessons/</code></li>
              <li>打開 plugin → 學習 → 教材，點任一課時即可閱讀，附互動測驗</li>
              <li>看完按「標記完成」，課程卡會顯示進度；可加星標記重點課時</li>
              <li>也可以用「匯入 HTML」把其他 AI（如 Gemini）生成的教材加進課程</li>
              <li>課程多時用卡片上方的「類別／進度／排序」下拉篩選排序，選擇會自動記住</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>任何主題都可以：程式、行銷、醫學、瑜珈。學完一套課程後，可以請 AI 把教材轉成 Review Deck 卡片或 Quest Map 繼續鞏固。</div></div>
          `},{icon:"⚡",title:"Synapse (Pro)",tag:"Pro",html:`
            <p>複習一張難記的卡時，自動連結到你已掌握的相關卡，作為「記憶錨點」。</p>
            <p><strong>運作機制</strong></p>
            <ol>
              <li>跟 AI 說「跑 engram-synapse」</li>
              <li>AI 掃描所有 SR 紀錄找出 mastered pool（FSRS stability ≥ 7）</li>
              <li>對每張卡找出最多 3 張強連結錨點，存進 <code>engram-review/synapse/</code></li>
              <li>複習時，Review session 看答案前會多一個 ⚡ Synapse 按鈕</li>
            </ol>
            <p><strong>三大記憶機制</strong></p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>精緻化編碼</strong> — 把難記的卡掛在已熟悉的卡上</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">AR</div><div><strong>主動提取</strong> — 強迫回想錨點答案，雙倍記憶強化</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">CA</div><div><strong>情節錨定</strong> — 已掌握的卡作為熟悉的記憶情境</div></div>
            <p><strong>需要 Pro license</strong>。Mastered pool 至少要 10 張卡才會啟用。</p>
          `},{icon:"⏱",title:"Time-boxed Review (Pro)",tag:"Pro",html:`
            <p>沒時間複習全部？選 5 / 10 / 15 分鐘，系統挑出最該複習的 N 張卡（1 卡約 1 分鐘）。</p>
            <p><strong>挑卡優先順序</strong></p>
            <ol>
              <li>從未複習過的新卡（unseen）</li>
              <li>已過期最久的卡（overdue）</li>
              <li>最快到期的卡（即將 due）</li>
            </ol>
            <p>跟「全部複習」共用同一個 review session UI 與 SR 寫回流程，沒有額外風險。</p>
            <p><strong>需要 Pro license</strong>。</p>
          `},{icon:"🎴",title:"四象限卡 (Pro)",tag:"Pro",html:`
            <p>把一張 Q/A 卡升級成一張 A4「超記憶卡」，用四個象限從不同角度編碼同一個概念，專治最難記、最核心的觀念。</p>
            <p><strong>四個象限</strong></p>
            <ol>
              <li><strong>Q1 問題</strong> — 要記住的提問</li>
              <li><strong>Q2 答案</strong> — 精準的正解</li>
              <li><strong>Q3 文字比喻</strong> — 用口訣／類比把抽象變好懂</li>
              <li><strong>Q4 視覺圖像</strong> — 一張畫面或 emoji 場景，讓大腦用圖像記</li>
            </ol>
            <p><strong>有什麼用</strong></p>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">DC</div><div><strong>雙重編碼</strong> — 同時用文字與圖像記，比純文字更牢</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">EE</div><div><strong>精緻化編碼</strong> — 比喻 + 圖像把抽象概念掛上熟悉的鉤子</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">SR</div><div><strong>獨立排程</strong> — 每張四象限卡有自己的 FSRS 排程，與 Review Deck 分開</div></div>
            <p><strong>怎麼用</strong></p>
            <ol>
              <li>跟 AI 說「四象限卡 / 四格卡 / 超記憶卡 / Quadrant Card」任一名稱，或在複習時把卡標記「升級」</li>
              <li>到 Hub →「四象限卡」分頁複習，自評後自動更新排程</li>
              <li>複習卡上可按 📄 開啟來源筆記、📋 複製問答、✏️ 編輯（標題即時生效；改 Q1–Q4 內容後重跑 skill 說「升級」才會重建卡片視覺）</li>
              <li>不要的卡可在牌組列或複習卡內按 🗑️ 刪除</li>
            </ol>
            <p><strong>需要 Pro license</strong>。適合用在最重要、最難記的核心概念，不必每張卡都升級。</p>
          `},{icon:"🔬",title:"Learning Science",tag:c(e,"HELP_SCIENCE_TAG"),html:`
            <div class="lh-help-sub"><div class="lh-help-sub-icon">SR</div><div><strong>Spaced Repetition</strong><br>在快忘記時複習，提升效率。Review Deck 使用 FSRS 自動安排下次複習。</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">RP</div><div><strong>Retrieval Practice</strong><br>先回想，再看答案，比重讀更有效。Review Deck 與 Quest Map 都會強迫主動回想。</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative Encoding</strong><br>把抽象文字變成具體結構，更容易記住。Memory Map 就是在做這件事。</div></div>
          `},{icon:"⚙️",title:"設定",tag:c(e,"HELP_SETTINGS_TAG"),html:`
            <p>到 Obsidian 設定中的 <strong>EngramQuest</strong> 調整。</p>
            <p><strong>Flashcard tag prefixes</strong>（預設：<code>flashcards</code>）</p>
            <p>決定哪些筆記會被插件掃描為 Review Deck 卡片。</p>
            <ul>
              <li>預設 <code>flashcards</code> → <code>#flashcards/math</code>、<code>#flashcards/行銷</code> 會被偵測到</li>
              <li>改成 <code>cards</code> → 只有 <code>#cards/math</code> 會被偵測，<code>#flashcards/math</code> 就不會</li>
              <li>可以設多個，用逗號分隔，例如 <code>flashcards, cards, anki</code></li>
            </ul>
            <p><strong>讓插件偵測到的條件（兩個都要滿足）：</strong></p>
            <ol>
              <li>筆記裡有卡片（<code>::</code>、<code>Q:/A:</code>、Cloze 三種格式均支援），例如：<pre>#flashcards/數學

畢氏定理是什麼 :: 直角三角形中，a² + b² = c²

Q: 導數的定義？
A: 函數在某點的瞬時變化率

{{c1::微積分}} 是高中數學最重要的一門學科</pre></li>
              <li>筆記有符合前綴的 tag，例如 <code>#flashcards/數學</code>（如上例第一行）</li>
            </ol>
            <p><strong>Include legacy <code>::</code> notes</strong>（預設：Off）</p>
            <p>開啟後，沒有任何 tag 的舊式 <code>::</code> 筆記也會被掃描。遷移模式，新手不需要開。</p>
            <p><strong>Max review interval</strong>（預設：36525 天）</p>
            <p>FSRS 排程的最大間隔上限。調小可以讓熟悉的卡片仍保持定期出現。</p>
            <p><strong>Requested retention</strong>（預設：0.9）</p>
            <p>FSRS 目標記憶保留率。越高複習越頻繁，越低間隔越長。</p>
          `},{icon:"❓",title:"FAQ",tag:c(e,"HELP_FAQ_TAG"),html:`
            <p><strong>Q1：沒有安裝 Skills 也能用嗎？</strong></p>
            <p>可以。你可以手動建立 <code>question :: answer</code> 卡片，並加上像 <code>#flashcards/math</code> 這種 tag。</p>
            <p><strong>Q2：如果來源筆記沒有任何 tag，AI 還讀得到嗎？</strong></p>
            <p>可以。AI 讀來源筆記時，不要求來源筆記先有 <code>flashcards</code> tag。AI 產生的卡片會存到 <code>engram-review/ai-cards/</code>，不會動你的原始筆記。</p>
            <p><strong>Q3：為什麼我看不到 Review Deck？</strong></p>
            <p>常見原因有：還沒有建立卡片筆記、卡片筆記沒有符合目前設定的 tag prefix，或你期待的是舊式 <code>::</code> 掃描但 legacy 模式還沒開。</p>
            <p><strong>Q4：我有一般筆記，沒有任何 tag。要怎麼做 Review Deck？</strong></p>
            <p>直接對 AI 說：「把和[主題]相關的筆記做成 Review Deck」。AI 會讀取你的筆記，在 <code>engram-review/ai-cards/</code> 建立含 tag 的卡片檔，不會動你的原始筆記。回到 Hub 的 Review Deck 就能看到。</p>
            <p><strong>Q5：我想手動做卡片，不靠 AI。要怎麼做？</strong></p>
            <p><strong>Step 1：加 tag（決定放到哪個 Deck）</strong></p>
            <p>在筆記任意位置加上 <code>#flashcards/主題</code>。斜線後面的名稱就是 Deck 的名字。</p>
            <ul>
              <li><code>#flashcards/英文</code> → 建立「英文」Deck</li>
              <li><code>#flashcards/math</code> → 建立「math」Deck</li>
              <li>前綴預設是 <code>flashcards</code>，可在設定中改成其他名稱（如 <code>cards</code>、<code>anki</code>）</li>
            </ul>
            <p><strong>Step 2：寫卡片（支援三種格式，可自由混用）</strong></p>
            <pre>#flashcards/學習科學

畢氏定理 :: a² + b² = c²

Q: 間隔重複的原理是什麼？
A:
1.在快忘記時複習，效果最佳
2.每次成功回想後，下次複習的間隔自動拉長

{{c1::間隔重複}} 是最有效的長期記憶方法之一
法國首都 {{c1::巴黎}}，日本首都 {{c2::東京}}</pre>
            <table>
              <tr><th>格式</th><th>適合</th><th>寫法</th></tr>
              <tr><td><span class="lh-help-fmt-chip" style="background:#dcfce7;color:#166534;"><code>Q:/A:</code> 問答</span> ⭐</td><td>日常推薦格式。多行答案、圖片、表格</td><td><code>Q: 問題</code> 換行 <code>A: 答案</code>（答案可以從下一行開始，可有多行）</td></tr>
              <tr><td><span class="lh-help-fmt-chip" style="background:#dbeafe;color:#1d4ed8;"><code>---</code> fenced</span> ⭐</td><td>既有長答案筆記、一般 Markdown 友善用法</td><td>前後各加一行 <code>---</code> 包住卡片，裡面的空行永遠不會被當成卡片邊界</td></tr>
              <tr><td><span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code> 長答案</span></td><td>貼上 AI 長答案的安全模式，適合內容可能包含 <code>---</code></td><td>前後各一行 <code>%%card%%</code> 包住一張卡；<code>A:</code> 後面直到結束標記前都會保留為答案</td></tr>
              <tr><td>Cloze 填空</td><td>填空記憶，同 Anki 語法</td><td><code>{{c1::答案}}</code> 或 <code>{{c1::答案::提示}}</code></td></tr>
              <tr><td><code>::</code> 問答</td><td>簡短答案，僅限一行</td><td><code>問題 :: 答案</code></td></tr>
            </table>
            <p><strong>Q:/A: 邊界規則：</strong></p>
            <ul>
              <li><code>A:</code> 後面可以不寫任何東西，答案從下一行開始</li>
              <li>答案裡有一個空行沒關係，會繼續收集</li>
              <li><strong>連續兩個空行</strong>代表卡片結束</li>
              <li>遇到下一個 <code>Q:</code> 或 Cloze 行也會自動結束</li>
              <li><strong>Fenced 模式：</strong>前後各加一行 <code>---</code> 包住，裡面不管幾個空行都不會截斷 — 適合貼上 ChatGPT / AI 的長答案：<pre>---
Q: Stripe 的核心模型是什麼？
A: Stripe 本質是一個 Saga System。

   它處理：
   - payment_intent 狀態機
   - retry / failure handling

   你只要「接結果」。
---

---
Q: 什麼是 Saga 模式？
A: 一連串的本地交易。

   每個步驟發布一個事件。
   失敗時，補償交易負責回滾。
---</pre>
              <strong>注意：</strong>筆記裡普通的 <code>---</code> 水平線（後面不接 <code>Q:</code>）會自動被忽略，不會誤觸發。</li>
            </ul>
            <p><strong>Cloze 補充說明：</strong></p>
            <ul>
              <li>每個 <code>{{cX::答案}}</code> 自動產生一張卡，正面顯示 <code>[...]</code>，背面顯示答案</li>
              <li>同一行有多個填空（c1、c2…），每個各自產生一張卡</li>
              <li>有提示版：<code>{{c1::巴黎::首都}}</code> → 正面顯示 <code>[首都]</code></li>
            </ul>
            <p>回到 Hub 的 Review Deck 就能看到所有卡片。</p>
            <p><strong>Q6：我有很多舊 <code>::</code> 卡片，但沒有 tag。要怎麼遷移？</strong></p>
            <p>到設定打開 <code>Include legacy :: notes</code>，保留原本的 <code>question :: answer</code> 格式，再回到 Hub 的 Review Deck 檢查是否已被納入。若要長期維護，建議之後慢慢補上 <code>#flashcards/...</code> tag。</p>
            <p><strong>Q7：Review Deck 進度存在哪裡？</strong></p>
            <p>複習排程資料存放在 <code>engram-review/sr/{筆記名稱}.json</code>，AI 生成的卡片存在 <code>engram-review/ai-cards/</code>，兩者都不會寫入你的原始筆記。你自己手寫的卡片，在複習時使用「編輯」、「高亮」或「引述」功能，變更會直接寫回原始筆記。</p>
            <p><strong>Q8：手機可以用嗎？</strong></p>
            <p>Review Deck 可以。Quest Map 與 Memory Map 目前仍較適合桌面版。</p>
            <p><strong>Q9：手機上的插件不會自動更新怎麼辦？</strong></p>
            <p>插件的 <code>main.js</code> 存在 vault 的 <code>.obsidian/plugins/engram-quest/</code> 裡。只要 vault 有用 git 同步（Obsidian Git 插件），電腦端更新後 push，手機端 pull 就會自動拿到新版本。如果手機沒更新，請確認：</p>
            <ol>
              <li>vault 的 <code>.gitignore</code> 沒有把 <code>/.obsidian/plugins/engram-quest/</code> 整個排除</li>
              <li>手機的 Obsidian Git 插件有開啟 auto-pull</li>
              <li>pull 完後在 Obsidian 設定中停用再啟用插件，或重啟 App</li>
            </ol>
            <p><strong>Q10：筆記很雜亂或內容非常多，不知道從哪裡開始怎麼辦？</strong></p>
            <p>不用先整理。直接請 AI 幫你掃描並列出筆記的主題分類，再從列表中挑你想學的方向：</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>「幫我列出 vault 裡所有筆記的主題分類」<br>「列出和[科目]相關的所有筆記標題」</div></div>
            <p>看到列表後，直接指定你要的筆記讓 AI 建立內容：</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>「用第 3 項的筆記做成 Quest Map medium」<br>「把行銷相關的那幾篇做成 Review Deck」</div></div>
            <p>如果筆記本身也很零散，可以先請 AI 整理分類再建立：</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>「先把這些筆記整理成結構化的大綱，再建立 Quest Map」</div></div>
            <p><strong>Q11：AI 產生的內容我不滿意，想要客製化怎麼做？</strong></p>
            <p>可以在 AI 設定檔（<code>CLAUDE.md</code>、<code>GEMINI.md</code>、<code>AGENTS.md</code>）裡加入自訂指令，AI 就會照著你的規則產生內容。</p>
            <pre>建立 Review Deck 時，每張卡片都必須附上一個實際應用的例句。
字卡難度不要太基礎，需包含分析與應用層次的問題。
所有卡片問題請用繁體中文撰寫。</pre>
            <p><strong>Q12：如何讓 AI 每次建立 Review Deck 時都依照我想要的固定模式？</strong></p>
            <p>用你習慣的任何語法在筆記中標記重要答案，例如 Obsidian 高亮 <code>==文字==</code>、引用區塊 <code>&gt; 文字</code>，或任何自訂記號都可以。接著在 AI 設定檔（<code>CLAUDE.md</code>、<code>GEMINI.md</code> 或 <code>AGENTS.md</code>）中加入對應指令，告訴 AI 把那個記號當作卡片答案：</p>
            <pre>IMPORTANT: When building a Review Deck, every highlighted ==text== must be turned into a review card.</pre>
            <p>用你自己最順手的標記方式就好，AI 會照著規則一致執行。</p>
            <p><strong>Q13：EngramQuest 支援 Anki 嗎？</strong></p>
            <p>部分支援。<code>::</code> 和 <code>{{c1::}}</code> 格式與 Anki 相容，可搭配 <strong>Obsidian_to_Anki</strong> 社群插件使用。只需安裝 Obsidian_to_Anki + AnkiConnect，在設定中開啟 RemNote style（<code>::</code> 語法），同步後卡片就會自動出現在 Anki 中。</p>
            <p><code>Q:/A:</code> 格式是 EngramQuest 專屬，<strong>不會</strong>同步到 Anki — 它是為多行答案、圖片、表格設計的，這些內容無法直接對應到 Anki 的卡片模型。如果你需要同時在兩邊使用，請改用 <code>::</code> 或 <code>{{c1::}}</code>。</p>
            <p><strong>Q14：AI 產生的 Map 我想放在特定資料夾，怎麼做？</strong></p>
            <p>同樣在 AI 設定檔中加入路徑規則，AI 建立檔案時就會遵守。</p>
            <pre>建立 Quest Map 時，檔案必須存放在 Quest_Map/ 資料夾底下。
所有 Memory Map 請存到 Maps/Memory/ 目錄。</pre>
            <p><strong>Q15：除了建立內容，AI 還能提供什麼幫助？</strong></p>
            <p>AI 不只能幫你「產出」卡片。它還能讀取你的 Review Deck，進行互動式複習或針對錯誤點進行教學解說。此外，它也能幫你整理、分類既有的牌組，或根據現有內容延伸出更有挑戰性的新題目。</p>
          `}]),t==="en"&&(h=[{icon:"🃏",title:"Create Your First Review Deck",tag:"Manual Start",html:`
            <p><strong>Step 1: Add a tag to your note (Deck name)</strong></p>
            <p>Add <code>#flashcards/topic</code> anywhere in your note. For example, <code>#flashcards/english</code> creates a Deck named "english".</p>
            <p><strong>Step 2: Write your cards</strong></p>
            <p>Three formats are supported. Recommended: <code>Q:/A:</code> (supports multi-line, images, tables):</p>
            <pre>Q: Who proposed the theory of relativity?
A: Albert Einstein

Q: What is spaced repetition?
A: Reviewing just before you forget — maximizes retention with minimal time.
   Each successful recall automatically extends the next review interval.

{{c1::Spaced repetition}} is the most effective way to learn

Pythagorean theorem :: a² + b² = c²</pre>
            <p><strong>Step 3: Start reviewing in Hub</strong></p>
            <p>Click the ribbon icon to open Hub → <strong>Review Deck</strong> → Your new deck is ready!</p>
          `},{icon:"🚀",title:"Get Started AI",tag:"AI Automation",html:`
            <p><strong>Step 1: Install AI Skills</strong></p>
            <ol>
              <li>Open Obsidian Settings → <strong>EngramQuest → AI Skills</strong></li>
              <li>Choose your tool: Claude Code / Codex / Gemini CLI / Cursor</li>
              <li>After install, AI knows how to build content for all three modules</li>
            </ol>
            <img src="${imgInstallSkills}" alt="Install Skills screenshot" style="width:100%;border-radius:8px;margin:10px 0;border:1px solid #e5e7eb;" />
            <p><strong>Step 2: Ask AI</strong></p>
            <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>"Turn notes tagged with math into a Review Deck"<br>"Make a Review Deck from all notes about marketing"</div></div>
            <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>"Turn calculus.md into a quest-map medium"<br>"Combine tag:math notes into a quest-map hard"</div></div>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>"Create a memory-map for OS-overview.md"<br>"Make a memory-map from notes about network protocols"</div></div>
            <div class="lh-help-sub" style="border-color:#d97706"><div class="lh-help-sub-icon">🎓</div><div>"Run engram-macro-review tag:azure"<br>"I have a pile of unseen azure cards — teach me through them"</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">🎴</div><div>"upgrade" (turns flashcards you marked into quadrant cards)<br>"Make a quadrant card about the data flywheel"<br>Any alias works — say "Quadrant Card", "quadrant", "四象限卡", "四格卡", or "超記憶卡".<br>Remove unwanted cards with the 🗑️ button on a deck row or inside the review card in the Quadrant Card tab. <span style="background:#fde68a;color:#92400e;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:700;">Pro</span></div></div>
            <p><strong>Step 3: Open Hub and learn</strong></p>
            <p style="margin:4px 0">Click the EngramQuest ribbon icon → switch tabs → start learning.</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <ol>
              <li>Ask AI: "Turn notes tagged with math into a Review Deck"</li>
              <li>AI reads your notes and creates card files in <code>engram-review/ai-cards/</code> (with <code>#flashcards/math</code> tag and <code>question :: answer</code> format)</li>
              <li>Open Hub → Review Deck → start reviewing</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>Your source notes don't need any tag — AI can read them directly. Card files AI generates are saved to <code>engram-review/ai-cards/</code> and <strong>never touch your source notes</strong>. Cards you write yourself: Edit, Highlight, and Emphasis tools in the review session write changes back to your source note. Card files need a <code>#flashcards/...</code> tag for the plugin to detect them.</div></div>
            <p><strong>Migration mode:</strong> if you have old plain <code>::</code> flashcard notes, enable legacy <code>::</code> scanning in Settings. Optional, off by default.</p>
          `},{icon:"🃏",title:"Long AI Answer Cards",tag:"%%card%%",html:`
            <p><strong>Q: How do I turn a long AI answer into a Review Deck card?</strong></p>
            <p><strong>A:</strong> Use normal <span class="lh-help-fmt-chip" style="background:#dcfce7;color:#166534;"><code>Q:/A:</code> everyday format</span>. If you paste a long AI answer that may contain <code>---</code>, tables, code blocks, or many blank lines, wrap one card with <span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code> safe mode</span>.</p>
            <pre>#flashcards/ai

%%card%%
Q: How should I explain agentic testing?
A:
Agentic testing checks whether an AI system can complete a task reliably, not just whether one function returns the right value.

---

Example:
- Give the agent a realistic task
- Verify the final artifact
- Check logs, tool calls, and failure recovery

&#96;&#96;&#96;js
expect(result.completed).toBe(true)
&#96;&#96;&#96;
%%card%%</pre>
            <p><strong>Key point:</strong> everything after <code>A:</code> stays in the answer until the closing <span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code></span>. The <span class="lh-help-fmt-chip" style="background:#dbeafe;color:#1d4ed8;"><code>---</code></span> line above will not cut the card early. Existing <code>---</code> fenced cards still work and do not need to be rebuilt.</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">⚡</div><div><strong>Quickest way to type the fence:</strong> press <code>Ctrl+/</code> (or <code>Cmd+/</code>) on an empty line — Obsidian inserts <code>%% %%</code> with the cursor between the markers. Type <code>card</code> and you have <code>%% card %%</code>, ready to use. Spacing and case are tolerated, so <code>%%card%%</code>, <code>%% card %%</code>, and <code>%%CARD%%</code> all work the same.</div></div>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <ol>
              <li>Ask AI: "Turn calculus.md into a quest-map medium"</li>
              <li>AI builds the learning map</li>
              <li>Progress is saved separately, so AI can update a quest without clearing completed nodes</li>
              <li>Advanced quests may include local iframe HTML simulations for interactive systems</li>
              <li>Open Hub → Quest Map → click nodes to progress</li>
            </ol>
            <table>
              <tr><th>Difficulty</th><th>Best for</th></tr>
              <tr><td><strong>easy</strong></td><td>First exposure</td></tr>
              <tr><td><strong>medium</strong></td><td>Reinforcing knowledge</td></tr>
              <tr><td><strong>hard</strong></td><td>Self-testing mastery</td></tr>
            </table>
          `},{icon:"🧠",title:"Memory Map",tag:c(e,"HELP_MEMORY_TAG"),html:`
            <p><strong>How to create (three ways)</strong></p>
            <ol>
              <li><strong>AI-generated:</strong> Ask AI "Create a memory-map for OS-overview.md" — it produces <code>OS-overview-memory.canvas</code> automatically</li>
              <li><strong>Manual:</strong> Create a Canvas file in Obsidian and name it <code>{note-name}-memory.canvas</code> — the plugin detects it automatically</li>
              <li><strong>Save location:</strong> Defaults to the same folder as the source note. You can also set a dedicated Memory Map folder in Settings</li>
            </ol>
            <p><strong>Detection rule</strong></p>
            <p>The plugin scans all files ending with <code>-memory.canvas</code> in your vault and lists them in Hub → Memory Map.</p>
            <p><strong>Link to Review Deck</strong></p>
            <p>During review, the "Memory Map" button on each card automatically finds the matching canvas:</p>
            <ol>
              <li>First, it looks for a <code>-memory.canvas</code> with the same name as the source note</li>
              <li>If not found, it scans all memory canvases — if a canvas contains a file node pointing to that note, it links automatically</li>
            </ol>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">💡</div><div>Tip: include a file node in your canvas that points back to the source note (AI does this automatically). This way, even if files are moved or renamed, Obsidian updates the path and the link stays intact.</div></div>
          `},{icon:"🎓",title:"Lesson Academy",tag:"AI teaching",html:`
            <p>Tell the AI what you want to learn and it builds you a course: interactive HTML lessons you study right inside the plugin, with progress tracking.</p>
            <p><strong>How it works</strong></p>
            <ol>
              <li>Ask AI: "Teach me SEO" or "I want to learn .NET — build me a course" (Lesson Academy skill)</li>
              <li>AI asks about your goal and level, designs an outline, then generates HTML lessons into <code>engram-quest/lessons/</code></li>
              <li>Open the plugin → Learn → Lessons; click any lesson to read it, with built-in quizzes</li>
              <li>Press "Mark done" when finished — the course card shows your progress; star key lessons</li>
              <li>You can also "Import HTML" to add lessons generated elsewhere (e.g. by Gemini)</li>
              <li>With many courses, use the tag / progress / sort dropdowns above the cards — your picks are remembered</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>Any topic works: programming, marketing, medicine, yoga. After finishing a course, ask the AI to turn the lessons into Review Deck cards or a Quest Map to consolidate.</div></div>
          `},{icon:"⚡",title:"Synapse (Pro)",tag:"Pro",html:`
            <p>While reviewing a hard card, automatically surface 1–3 cards you have already mastered that link conceptually — memory anchors that make the new card easier to remember.</p>
            <p><strong>How it works</strong></p>
            <ol>
              <li>Tell your AI assistant: "run engram-synapse"</li>
              <li>The skill scans every SR file and builds a "mastered pool" (FSRS stability ≥ 7)</li>
              <li>For each card in the vault, the AI picks up to 3 strong anchors and writes them to <code>engram-review/synapse/</code></li>
              <li>During review, a ⚡ Synapse button appears before you reveal the answer</li>
            </ol>
            <p><strong>Three memory mechanisms triggered</strong></p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative encoding</strong> — hang new knowledge onto an existing network</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">AR</div><div><strong>Active recall</strong> — recalling the anchor doubles the review effect</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">CA</div><div><strong>Contextual anchoring</strong> — mastered cards serve as familiar memory hooks</div></div>
            <p><strong>Requires a Pro license.</strong> Needs at least 10 mastered cards before it activates.</p>
          `},{icon:"⏱",title:"Time-boxed Review (Pro)",tag:"Pro",html:`
            <p>Short on time? Pick 5 / 10 / 15 minutes — the plugin selects the N cards you most need to review (~1 card per minute).</p>
            <p><strong>Picking priority</strong></p>
            <ol>
              <li>Unseen cards (new content)</li>
              <li>Most-overdue cards</li>
              <li>Cards closest to their due date</li>
            </ol>
            <p>Reuses the regular review session UI and SR write-back path, so there is no risk to your scheduling data.</p>
            <p><strong>Requires a Pro license.</strong></p>
          `},{icon:"🎴",title:"Quadrant Card (Pro)",tag:"Pro",html:`
            <p>Upgrade a single Q/A card into an A4 "super memory" sheet that encodes one concept from four angles — built for your hardest, most important ideas.</p>
            <p><strong>The four quadrants</strong></p>
            <ol>
              <li><strong>Q1 Question</strong> — what you need to recall</li>
              <li><strong>Q2 Answer</strong> — the precise answer</li>
              <li><strong>Q3 Verbal metaphor</strong> — a mnemonic or analogy that makes the abstract concrete</li>
              <li><strong>Q4 Visual image</strong> — a scene or emoji that lets your brain remember by picture</li>
            </ol>
            <p><strong>Why it helps</strong></p>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">DC</div><div><strong>Dual coding</strong> — words + image together stick better than text alone</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative encoding</strong> — metaphor + image hook the abstract onto something familiar</div></div>
            <div class="lh-help-sub" style="border-color:#0078d4"><div class="lh-help-sub-icon">SR</div><div><strong>Own schedule</strong> — each quadrant card carries its own FSRS schedule, separate from your review decks</div></div>
            <p><strong>How to use it</strong></p>
            <ol>
              <li>Tell the AI any alias — "Quadrant Card", "quadrant", "四象限卡", "四格卡", "超記憶卡" — or mark a card "upgrade" during review</li>
              <li>Review them in Hub → Quadrant Card tab; your self-assessment updates the schedule</li>
              <li>On a review card: 📄 opens the source note, 📋 copies the Q&amp;A, ✏️ edits it (title applies instantly; Q1–Q4 content edits rebuild the card visuals after you re-run the skill and say "upgrade")</li>
              <li>Delete unwanted cards with the 🗑️ button on a deck row or inside the review card</li>
            </ol>
            <p><strong>Requires a Pro license.</strong> Best for your most important, hardest-to-remember concepts — you don't need to upgrade every card.</p>
          `},{icon:"🔬",title:"Why It Works",tag:c(e,"HELP_SCIENCE_TAG"),html:`
            <div class="lh-help-sub"><div class="lh-help-sub-icon">SR</div><div><strong>Spaced Repetition</strong><br>Review at the point of near-forgetting. FSRS calculates the next interval automatically.</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">RP</div><div><strong>Retrieval Practice</strong><br>Active recall is more effective than re-reading. Review Deck and Quest Map force retrieval before the answer appears.</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative Encoding</strong><br>Concrete images and structures are easier to remember than abstract text. Memory Map turns concepts into visual structure.</div></div>
          `},{icon:"⚙️",title:"Settings",tag:c(e,"HELP_SETTINGS_TAG"),html:`
            <p>Open Obsidian Settings → <strong>EngramQuest</strong> to configure.</p>
            <p><strong>Flashcard tag prefixes</strong> (default: <code>flashcards</code>)</p>
            <p>Determines which notes are scanned as Review Deck cards.</p>
            <ul>
              <li>Default <code>flashcards</code> → <code>#flashcards/math</code>, <code>#flashcards/marketing</code> are detected</li>
              <li>Change to <code>cards</code> → only <code>#cards/math</code> is detected; <code>#flashcards/math</code> is not</li>
              <li>Multiple prefixes: comma-separated, e.g. <code>flashcards, cards, anki</code></li>
            </ul>
            <p><strong>To be detected, a note needs both:</strong></p>
            <ol>
              <li>Cards in any supported format (<code>::</code>, <code>Q:/A:</code>, or Cloze), for example:<pre>#flashcards/math

What is the Pythagorean theorem? :: In a right triangle, a² + b² = c²

Q: What is a derivative?
A: The instantaneous rate of change of a function at a point.
   Formally: lim(h→0) [f(x+h) − f(x)] / h

{{c1::Calculus}} is built on limits, derivatives, and integrals</pre></li>
              <li>A matching tag prefix, e.g. <code>#flashcards/math</code> (first line of the example above)</li>
            </ol>
            <p><strong>Include legacy <code>::</code> notes</strong> (default: Off)</p>
            <p>When on, untagged <code>::</code> notes are also scanned. Migration mode, not needed for new users.</p>
            <p><strong>Max review interval</strong> (default: 36525 days)</p>
            <p>Cap on FSRS scheduling. Lower it to keep well-known cards appearing periodically.</p>
            <p><strong>Requested retention</strong> (default: 0.9)</p>
            <p>FSRS target retention rate. Higher = more frequent reviews; lower = longer intervals.</p>
          `},{icon:"❓",title:"FAQ",tag:c(e,"HELP_FAQ_TAG"),html:`
            <p><strong>Q1. Can I use this without installing Skills?</strong></p>
            <p>Yes. You can write cards manually using <code>question :: answer</code> and add a matching tag such as <code>#flashcards/math</code>.</p>
            <p><strong>Q2. Can AI read source notes that do not have tags?</strong></p>
            <p>Yes. AI can read ordinary source notes without <code>flashcards</code> tags. The generated cards are saved to <code>engram-review/ai-cards/</code> — your original notes are never modified.</p>
            <p><strong>Q3. Why can't I see a Review Deck?</strong></p>
            <p>Common reasons: no card note has been created yet, the card note does not match the current tag prefix setting, or you expected old plain <code>::</code> notes to be included without enabling legacy scan.</p>
            <p><strong>Q4. I have general notes with no tags. How do I make a Review Deck?</strong></p>
            <p>Ask AI: "Make a Review Deck from notes about [topic]". AI reads your notes and creates card files in <code>engram-review/ai-cards/</code> with the correct tags — your original notes are never modified. Open Hub → Review Deck to see them.</p>
            <p><strong>Q5. I want to make cards manually without AI. How?</strong></p>
            <p><strong>Step 1: Add a tag (sets the Deck name)</strong></p>
            <p>Add <code>#flashcards/topic</code> anywhere in your note. The name after the slash becomes the Deck name.</p>
            <ul>
              <li><code>#flashcards/english</code> → creates an "english" Deck</li>
              <li><code>#flashcards/math</code> → creates a "math" Deck</li>
              <li>Default prefix is <code>flashcards</code>; change it in Settings (e.g. <code>cards</code>, <code>anki</code>)</li>
            </ul>
            <p><strong>Step 2: Write cards (3 formats, freely mixable)</strong></p>
            <pre>#flashcards/learning-science

Pythagorean theorem :: a² + b² = c²

Q: What is spaced repetition?
A:
1. Review just before you forget — best timing for retention
2. Each successful recall pushes the next review further out

%%card%%
Q: When should I use %%card%%?
A:
Use it only for long pasted AI answers that may contain their own --- separators.

---

This separator stays inside the answer.
%%card%%

{{c1::Spaced repetition}} is one of the most effective memory techniques
Capitals: France {{c1::Paris}}, Japan {{c2::Tokyo}}</pre>
            <table>
              <tr><th>Format</th><th>Best for</th><th>Syntax</th></tr>
              <tr><td><span class="lh-help-fmt-chip" style="background:#dcfce7;color:#166534;"><code>Q:/A:</code> Q&amp;A</span> ⭐</td><td>Recommended everyday format. Multi-line, images, tables</td><td><code>Q: question</code> → <code>A: answer</code> (answer can start on the next line; multiple lines ok)</td></tr>
              <tr><td><code>Q:/A:</code> fenced ⭐</td><td>Long answers with many blank lines (e.g. pasted AI output)</td><td>Wrap with <code>---</code> on its own line before and after — blank lines inside never end the card</td></tr>
              <tr><td><span class="lh-help-fmt-chip" style="background:#fef3c7;color:#92400e;"><code>%%card%%</code> long answer</span></td><td>Safe mode for pasted AI answers that may include <code>---</code></td><td>Wrap one card between two <code>%%card%%</code> lines; everything after <code>A:</code> stays in the answer until the closing marker</td></tr>
              <tr><td>Cloze</td><td>Fill-in-the-blank, same as Anki</td><td><code>{{c1::answer}}</code> or <code>{{c1::answer::hint}}</code></td></tr>
              <tr><td><code>::</code> Q&amp;A</td><td>Short answers, one line only</td><td><code>question :: answer</code></td></tr>
            </table>
            <p><strong>Q:/A: boundary rules:</strong></p>
            <ul>
              <li><code>A:</code> can be empty — the answer starts on the next line</li>
              <li>A single blank line inside the answer is fine; collection continues</li>
              <li><strong>Two consecutive blank lines</strong> end the card</li>
              <li>The next <code>Q:</code> line or a Cloze line also ends the answer automatically</li>
              <li><strong>Fenced mode:</strong> wrap the card with <code>---</code> on its own line before and after — any number of blank lines inside are safe. Ideal for pasting ChatGPT / AI answers:<pre>---
Q: What is Stripe's core model?
A: Stripe is essentially a Saga System.

   It handles:
   - payment_intent state machine
   - retry / failure handling

   You only receive the result.
---

---
Q: What is a Saga pattern?
A: A sequence of local transactions.

   Each step publishes an event.
   On failure, compensating transactions roll back.
---</pre>
              <strong>Note:</strong> a plain <code>---</code> horizontal rule in your note (not followed by <code>Q:</code>) is automatically ignored — no false triggers.</li>
            </ul>
            <p><strong>Cloze notes:</strong></p>
            <ul>
              <li>Each <code>{{cX::answer}}</code> generates one card — front shows <code>[...]</code>, back reveals the answer</li>
              <li>Multiple clozes on one line (c1, c2…) each produce their own card</li>
              <li>Optional hint: <code>{{c1::Paris::capital}}</code> → front shows <code>[capital]</code> instead of <code>[...]</code></li>
            </ul>
            <p>Open Hub → Review Deck to see all cards.</p>
            <p><strong>Q6. I already have many old <code>::</code> cards without tags. How do I migrate?</strong></p>
            <p>Turn on <code>Include legacy :: notes</code> in Settings, keep the existing <code>question :: answer</code> format, and reopen Hub → Review Deck. For long-term maintenance, gradually add <code>#flashcards/...</code> tags.</p>
            <p><strong>Q7. Where is review progress stored?</strong></p>
            <p>Review scheduling data is stored in <code>engram-review/sr/{note-name}.json</code>. AI-generated cards live in <code>engram-review/ai-cards/</code> — neither touches your source notes. Cards you write yourself: Edit, Highlight, and Emphasis tools in the review session write changes directly back to your note.</p>
            <p><strong>Q8. Does this work on mobile?</strong></p>
            <p>Review Deck works on mobile. Quest Map and Memory Map are still best on desktop.</p>
            <p><strong>Q9. Why doesn't the plugin update on my phone?</strong></p>
            <p>The plugin's <code>main.js</code> lives inside your vault at <code>.obsidian/plugins/engram-quest/</code>. As long as your vault is synced via git (Obsidian Git plugin), updates pushed from desktop will be pulled to mobile automatically. If your phone isn't getting updates, check:</p>
            <ol>
              <li>Your vault <code>.gitignore</code> is not excluding <code>/.obsidian/plugins/engram-quest/</code> entirely</li>
              <li>The Obsidian Git plugin on mobile has auto-pull enabled</li>
              <li>After pulling, disable and re-enable the plugin in Settings, or restart the app</li>
            </ol>
            <p><strong>Q10. My notes are messy or there's way too much content. Where do I even start?</strong></p>
            <p>No need to tidy up first. Ask AI to scan and list the topics across your notes, then pick what you want to learn:</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>"List all the topic categories in my vault"<br>"List all note titles related to [subject]"</div></div>
            <p>Once you have the list, point AI at what you want:</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>"Turn item 3 from that list into a Quest Map medium"<br>"Make a Review Deck from the marketing-related notes"</div></div>
            <p>If the notes themselves are fragmented, ask AI to organize them first:</p>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💬</div><div>"Organize these notes into a structured outline, then build a Quest Map"</div></div>
            <p><strong>Q11. I'm not satisfied with the AI output. How do I customize it?</strong></p>
            <p>Add custom instructions to your AI config files (<code>CLAUDE.md</code>, <code>GEMINI.md</code>, <code>AGENTS.md</code>). AI will follow your rules when generating content.</p>
            <pre>When building a Review Deck, every card must include a real-world application example.
Keep card difficulty at an advanced level — include analysis and application questions.
Write all card questions in formal academic English.</pre>
            <p><strong>Q12. How can I make AI always follow a specific pattern when building a Review Deck?</strong></p>
            <p>Mark key answers in your notes using any syntax you prefer — for example, Obsidian's highlight <code>==text==</code>, blockquote <code>&gt; text</code>, or any custom marker. Then add a rule to your AI config file (<code>CLAUDE.md</code>, <code>GEMINI.md</code>, or <code>AGENTS.md</code>) telling it to treat that marker as a card answer:</p>
            <pre>IMPORTANT: When building a Review Deck, every highlighted ==text== must be turned into a review card.</pre>
            <p>Use whatever convention fits your note-taking style — the AI will follow it consistently.</p>
            <p><strong>Q13. Does EngramQuest support Anki?</strong></p>
            <p>Partially. The <code>::</code> and <code>{{c1::}}</code> formats are Anki-compatible. Pair them with the <strong>Obsidian_to_Anki</strong> community plugin — install Obsidian_to_Anki + AnkiConnect, enable RemNote-style (<code>::</code>) syntax in its settings, and sync. Your cards will appear in Anki automatically.</p>
            <p>The <code>Q:/A:</code> format is EngramQuest-native and does <strong>not</strong> sync to Anki — it's designed for rich multi-line answers, images, and tables that don't map cleanly to Anki's card model. Use <code>::</code> or <code>{{c1::}}</code> for cards you want in both places.</p>
            <p><strong>Q14. I want AI-generated maps saved to a specific folder. How?</strong></p>
            <p>Add a path rule to your AI config files and AI will respect it when creating files.</p>
            <pre>All Quest Maps must be saved under the Quest_Map/ folder.
Store all Memory Maps in the Maps/Memory/ directory.</pre>
            <p><strong>Q15. What other assistance can AI provide?</strong></p>
            <p>Beyond content creation, AI can interact with your Review Decks to provide personalized tutoring and guided review sessions. It can also help organize and categorize existing decks, or generate more challenging new questions based on your current knowledge.</p>
          `}]),h.splice(Math.max(h.length-1,0),0,{icon:"🤖",title:t==="zh-tw"?"AI 設定":"AI Setup",tag:c(e,"HELP_AI_SETUP_TAG"),html:`
        <p>${c(e,"SKILLS_AI_SETUP_COPY")}</p>
        <table>
          <tr><th>Tool</th><th>Path</th></tr>
          <tr><td>Claude Code</td><td><code>.claude/skills</code></td></tr>
          <tr><td>Codex</td><td><code>.agents/skills</code></td></tr>
          <tr><td>Gemini CLI</td><td><code>.gemini/skills</code></td></tr>
          <tr><td>Cursor</td><td><code>.cursor/rules</code></td></tr>
        </table>
      `}),h.forEach((u,v)=>{let p=o.createEl("div",{attr:{class:"lh-help-acc"}}),g=p.createEl("div",{attr:{class:"lh-help-acc-hdr"+(v===f?" open":"")}});g.createEl("span",{text:u.icon,attr:{class:"lh-help-acc-icon"}}),g.createEl("span",{text:u.title,attr:{class:"lh-help-acc-title"}}),g.createEl("span",{text:u.tag,attr:{class:"lh-help-acc-tag"}});let E=g.createEl("span",{attr:{class:"lh-help-acc-arrow"}});E.innerHTML=d;let m=p.createEl("div",{attr:{class:"lh-help-acc-body"+(v===f?" open":"")}});m.innerHTML=u.html,g.addEventListener("click",()=>{let x=m.classList.contains("open");o.querySelectorAll(".lh-help-acc-body").forEach(S=>S.classList.remove("open")),o.querySelectorAll(".lh-help-acc-hdr").forEach(S=>S.classList.remove("open")),x||(m.classList.add("open"),g.classList.add("open"))})});let _coffeeFoot=o.createEl("div",{attr:{style:"margin-top:28px;padding:20px 16px 8px;border-top:1px solid var(--background-modifier-border);text-align:center;"}});_coffeeFoot.createEl("div",{text:t==="zh-tw"?"覺得 EngramQuest 對你有幫助？":"Find EngramQuest helpful?",attr:{style:"font-size:13px;color:var(--text-muted);margin-bottom:10px;"}});let _coffeeBtn=_coffeeFoot.createEl("a",{attr:{href:"https://ko-fi.com/wen_aidev",target:"_blank",rel:"noopener",style:"display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:8px;background:#fcd34d;color:#1f2937;text-decoration:none;font-size:14px;font-weight:600;"}});_coffeeBtn.createEl("span",{text:"☕"});_coffeeBtn.createEl("span",{text:"Buy me a coffee"});}};

module.exports = { HelpModal: fe };
