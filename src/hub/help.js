"use strict";
const I = require("obsidian");
const { t: c, getLocale: L } = require("../i18n");

var fe=class extends I.Modal{constructor(e,t){super(e),this.plugin=t}onClose(){var e;(e=document.getElementById("lh-help-styles"))==null||e.remove()}onOpen(){let e=this.plugin.settings,t=L(e),_isDark=document.body.classList.contains("theme-dark"),_bgPrimary=_isDark?"#1e1e2e":"#ffffff",_bgSecondary=_isDark?"#252538":"#f3f4f6",_textNormal=_isDark?"#e2e8f0":"#1f2937",_textMuted=_isDark?"#94a3b8":"#6b7280",_border=_isDark?"#3a3a5a":"#e5e7eb",_bgCard=_isDark?"#1a1a2e":"#f8faff";let imgInstallSkills=this.app.vault.adapter.getResourcePath(I.normalizePath(`${this.plugin.manifest.dir}/assets/install-skills.png`));this.modalEl.addClass("lh-help"),_isDark&&this.modalEl.addClass("lh-dark"),this.modalEl.style.cssText=`width:min(95vw,800px);max-width:none;height:min(90vh,700px);max-height:none;padding:0;overflow:hidden;border-radius:20px;background:${_bgCard}`,this.modalEl.style.setProperty("--background-primary",_bgPrimary,"important"),this.modalEl.style.setProperty("--background-secondary",_bgSecondary,"important"),this.modalEl.style.setProperty("--text-normal",_textNormal,"important"),this.modalEl.style.setProperty("--text-muted",_textMuted,"important"),this.modalEl.style.setProperty("--background-modifier-border",_border,"important"),this.contentEl.style.cssText=`padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${_bgCard};color:${_textNormal}`;let{contentEl:r}=this;r.empty();let s=r.createEl("div",{attr:{style:"padding:24px;border-bottom:1px solid var(--background-modifier-border);display:flex;justify-content:space-between;align-items:center"}});s.createEl("h2",{text:c(e,"HELP_TITLE"),attr:{style:"margin:0;font-size:18px;font-weight:700"}}),s.createEl("button",{text:"×",attr:{style:"width:32px;height:32px;background:transparent;border:none;cursor:pointer;font-size:20px;line-height:1;color:var(--text-muted)"}}).addEventListener("click",()=>this.close());let a=document.createElement("style");a.textContent=`
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
      .lh-help.lh-dark .lh-help-acc { border-color:var(--background-modifier-border); background:var(--background-secondary); }
      .lh-help.lh-dark .lh-help-acc-hdr { background:var(--background-secondary); }
      .lh-help.lh-dark .lh-help-acc-hdr:hover { background:rgba(99,102,241,0.12); }
      .lh-help.lh-dark .lh-help-acc-hdr.open { background:rgba(99,102,241,0.18); }
      .lh-help.lh-dark .lh-help-acc-title { color:var(--text-normal); }
      .lh-help.lh-dark .lh-help-acc-tag { background:rgba(255,255,255,0.06); color:var(--text-muted); }
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
    `,a.id="lh-help-styles",document.head.appendChild(a);let o=r.createEl("div",{attr:{style:"flex:1;overflow-y:auto;padding:20px;font-size:14px;line-height:1.6"}}),i=o.createEl("div",{attr:{class:"lh-help-intro"}});i.innerHTML=t==="zh-tw"?`
      <p><strong>EngramQuest</strong> 讓你用 AI 快速建立學習內容，直接在 Obsidian 裡學習。</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">🃏 Review Deck — 長期記憶，FSRS 排程</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">🗺️ Quest Map — 結構化學習地圖</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">🧠 Memory Map — 視覺化概念地圖</span>
      </div>
    `:`
      <p><strong>EngramQuest</strong> lets you use AI to build learning content and study it directly in Obsidian.</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">🃏 Review Deck — Long-term memory</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">🗺️ Quest Map — Structured learning</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">🧠 Memory Map — Visual concept map</span>
      </div>
    `;let d='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',f=0,h=[];t==="zh-tw"&&(h=[{icon:"🃏",title:"建立第一個 Review Deck",tag:"手動開始",html:`
            <p><strong>Step 1：在筆記加上標籤（Deck 名稱）</strong></p>
            <p>在你的筆記任意位置加上 <code>#flashcards/主題</code>。例如 <code>#flashcards/英文</code> 就會建立一個名為「英文」的 Deck。</p>
            <p><strong>Step 2：撰寫卡片內容</strong></p>
            <p>支援三種格式，最簡單的是 <code>::</code>：</p>
            <pre>畢氏定理 :: a² + b² = c²

Q: 誰提出了相對論？
A: 愛因斯坦

{{c1::間隔重複}} 是最有效的學習方法</pre>
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
            <p><strong>Step 3：開 Hub 開始學</strong></p>
            <p style="margin:4px 0">點側邊欄的 EngramQuest 圖示 → 切到對應分頁 → 開始學習。</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <ol>
              <li>跟 AI 說：「把 tag:math 的筆記做成 Review Deck」</li>
              <li>AI 讀取你的筆記，在 <code>engram-review/ai-cards/</code> 建立卡片檔（含 <code>#flashcards/math</code> tag 和 <code>question :: answer</code> 格式）</li>
              <li>開 Hub → Review Deck → 開始複習</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>你的一般筆記不需要有任何 tag，AI 可以直接讀取。AI <strong>產生的卡片檔</strong>存在 <code>engram-review/ai-cards/</code>，不會修改你的原始筆記。卡片檔需要有 <code>#flashcards/...</code> tag，插件才能偵測到。</div></div>
            <p><strong>相容模式：</strong>如果你有舊式 <code>::</code> 卡片筆記，可以到設定中開啟 legacy <code>::</code> 掃描。這是遷移模式，不是新手預設。</p>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <ol>
              <li>跟 AI 說：「把微積分.md 做成 quest-map medium」</li>
              <li>AI 建立學習地圖</li>
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
              <tr><td><code>::</code> 問答</td><td>簡短答案，一行</td><td><code>問題 :: 答案</code></td></tr>
              <tr><td><code>Q:/A:</code> 問答</td><td>答案有多行或列點</td><td><code>Q: 問題</code> 換行 <code>A: 答案</code>（答案可以從下一行開始，可有多行）</td></tr>
              <tr><td>Cloze 填空</td><td>填空記憶，同 Anki 語法</td><td><code>{{c1::答案}}</code> 或 <code>{{c1::答案::提示}}</code></td></tr>
            </table>
            <p><strong>Q:/A: 邊界規則：</strong></p>
            <ul>
              <li><code>A:</code> 後面可以不寫任何東西，答案從下一行開始</li>
              <li>答案裡有一個空行沒關係，會繼續收集</li>
              <li><strong>連續兩個空行</strong>代表卡片結束</li>
              <li>遇到下一個 <code>Q:</code> 或 Cloze 行也會自動結束</li>
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
            <p>複習進度存放在 <code>engram-review/sr/{筆記名稱}.json</code>，不會寫入使用者筆記。</p>
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
            <p>用你習慣的任何語法在筆記中標記重要答案，例如 Obsidian 高亮 <code>==文字==</code>、粗體 <code>**文字**</code>，或任何自訂記號都可以。接著在 AI 設定檔（<code>CLAUDE.md</code>、<code>GEMINI.md</code> 或 <code>AGENTS.md</code>）中加入對應指令，告訴 AI 把那個記號當作卡片答案：</p>
            <pre>IMPORTANT: When building a Review Deck, every highlighted ==text== must be turned into a review card.</pre>
            <p>用你自己最順手的標記方式就好，AI 會照著規則一致執行。</p>
            <p><strong>Q13：EngramQuest 支援 Anki 嗎？</strong></p>
            <p>支援。可搭配 <strong>Obsidian_to_Anki</strong> 社群插件使用。AI 生成的卡片採用 <code>question :: answer</code> 格式，frontmatter 也包含 <code>TARGET DECK</code> 欄位，兩者都與 Obsidian_to_Anki 原生相容。只需安裝 Obsidian_to_Anki + AnkiConnect，在設定中開啟 RemNote style（<code>::</code> 語法），同步後卡片就會自動出現在 Anki 中。</p>
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
            <p>Three formats are supported. The simplest is <code>::</code>:</p>
            <pre>Pythagorean theorem :: a² + b² = c²

Q: Who proposed the theory of relativity?
A: Albert Einstein

{{c1::Spaced repetition}} is the most effective way to learn</pre>
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
            <p><strong>Step 3: Open Hub and learn</strong></p>
            <p style="margin:4px 0">Click the EngramQuest ribbon icon → switch tabs → start learning.</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <ol>
              <li>Ask AI: "Turn notes tagged with math into a Review Deck"</li>
              <li>AI reads your notes and creates card files in <code>engram-review/ai-cards/</code> (with <code>#flashcards/math</code> tag and <code>question :: answer</code> format)</li>
              <li>Open Hub → Review Deck → start reviewing</li>
            </ol>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">💡</div><div>Your source notes don't need any tag — AI can read them directly. The card files AI generates are saved to <code>engram-review/ai-cards/</code> and are never written into your original notes. Those card files need a <code>#flashcards/...</code> tag for the plugin to detect them.</div></div>
            <p><strong>Migration mode:</strong> if you have old plain <code>::</code> flashcard notes, enable legacy <code>::</code> scanning in Settings. Optional, off by default.</p>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <ol>
              <li>Ask AI: "Turn calculus.md into a quest-map medium"</li>
              <li>AI builds the learning map</li>
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

{{c1::Spaced repetition}} is one of the most effective memory techniques
Capitals: France {{c1::Paris}}, Japan {{c2::Tokyo}}</pre>
            <table>
              <tr><th>Format</th><th>Best for</th><th>Syntax</th></tr>
              <tr><td><code>::</code> Q&amp;A</td><td>Short answers, one line</td><td><code>question :: answer</code></td></tr>
              <tr><td><code>Q:/A:</code> Q&amp;A</td><td>Multi-line or bullet answers</td><td><code>Q: question</code> → <code>A: answer</code> (answer can start on the next line; multiple lines ok)</td></tr>
              <tr><td>Cloze</td><td>Fill-in-the-blank, same as Anki</td><td><code>{{c1::answer}}</code> or <code>{{c1::answer::hint}}</code></td></tr>
            </table>
            <p><strong>Q:/A: boundary rules:</strong></p>
            <ul>
              <li><code>A:</code> can be empty — the answer starts on the next line</li>
              <li>A single blank line inside the answer is fine; collection continues</li>
              <li><strong>Two consecutive blank lines</strong> end the card</li>
              <li>The next <code>Q:</code> line or a Cloze line also ends the answer automatically</li>
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
            <p>Review progress is stored in <code>engram-review/sr/{note-name}.json</code> and never written into your notes.</p>
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
            <p>Mark key answers in your notes using any syntax you prefer — for example, Obsidian's highlight <code>==text==</code>, bold <code>**text**</code>, or any custom marker. Then add a rule to your AI config file (<code>CLAUDE.md</code>, <code>GEMINI.md</code>, or <code>AGENTS.md</code>) telling it to treat that marker as a card answer:</p>
            <pre>IMPORTANT: When building a Review Deck, every highlighted ==text== must be turned into a review card.</pre>
            <p>Use whatever convention fits your note-taking style — the AI will follow it consistently.</p>
            <p><strong>Q13. Does EngramQuest support Anki?</strong></p>
            <p>Yes. Pair it with the <strong>Obsidian_to_Anki</strong> community plugin. AI-generated cards use the <code>question :: answer</code> format and include a <code>TARGET DECK</code> field in the frontmatter — both are natively compatible with Obsidian_to_Anki. Install Obsidian_to_Anki + AnkiConnect, enable RemNote-style (<code>::</code>) syntax in its settings, and sync. Your cards will appear in Anki automatically.</p>
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
      `}),h.forEach((u,v)=>{let p=o.createEl("div",{attr:{class:"lh-help-acc"}}),g=p.createEl("div",{attr:{class:"lh-help-acc-hdr"+(v===f?" open":"")}});g.createEl("span",{text:u.icon,attr:{class:"lh-help-acc-icon"}}),g.createEl("span",{text:u.title,attr:{class:"lh-help-acc-title"}}),g.createEl("span",{text:u.tag,attr:{class:"lh-help-acc-tag"}});let E=g.createEl("span",{attr:{class:"lh-help-acc-arrow"}});E.innerHTML=d;let m=p.createEl("div",{attr:{class:"lh-help-acc-body"+(v===f?" open":"")}});m.innerHTML=u.html,g.addEventListener("click",()=>{let x=m.classList.contains("open");o.querySelectorAll(".lh-help-acc-body").forEach(S=>S.classList.remove("open")),o.querySelectorAll(".lh-help-acc-hdr").forEach(S=>S.classList.remove("open")),x||(m.classList.add("open"),g.classList.add("open"))})})}};

module.exports = { HelpModal: fe };
