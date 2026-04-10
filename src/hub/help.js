"use strict";
const I = require("obsidian");
const { t: c, getLocale: L } = require("../i18n");

var fe=class extends I.Modal{constructor(e,t){super(e),this.plugin=t}onClose(){var e;(e=document.getElementById("lh-help-styles"))==null||e.remove()}onOpen(){let e=this.plugin.settings,t=L(e);this.modalEl.addClass("lh-help"),this.modalEl.style.cssText="width:min(95vw,800px);max-width:none;height:min(90vh,700px);max-height:none;padding:0;overflow:hidden;border-radius:20px;background:#f8faff",this.modalEl.style.setProperty("--background-primary","#ffffff","important"),this.modalEl.style.setProperty("--background-secondary","#f3f4f6","important"),this.modalEl.style.setProperty("--text-normal","#1f2937","important"),this.modalEl.style.setProperty("--text-muted","#6b7280","important"),this.contentEl.style.cssText="padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#f8faff;color:#1f2937";let{contentEl:r}=this;r.empty();let s=r.createEl("div",{attr:{style:"padding:24px;border-bottom:1px solid var(--background-modifier-border);display:flex;justify-content:space-between;align-items:center"}});s.createEl("h2",{text:c(e,"HELP_TITLE"),attr:{style:"margin:0;font-size:18px;font-weight:700"}}),s.createEl("button",{text:"?",attr:{style:"width:32px;height:32px;background:transparent;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)"}}).addEventListener("click",()=>this.close());let a=document.createElement("style");a.textContent=`
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
    `,a.id="lh-help-styles",document.head.appendChild(a);let o=r.createEl("div",{attr:{style:"flex:1;overflow-y:auto;padding:20px;font-size:14px;line-height:1.6"}}),i=o.createEl("div",{attr:{class:"lh-help-intro"}});i.innerHTML=t==="zh-tw"?`
      <p><strong>EngramQuest</strong> \u63D0\u4F9B\u4E09\u500B AI-native \u5B78\u7FD2\u6A21\u7D44\u3002\u5148\u7528 AI \u5EFA\u7ACB\u5167\u5BB9\uFF0C\u518D\u76F4\u63A5\u5728\u63D2\u4EF6\u5167\u5B78\u7FD2\u3002</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">Review Deck</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">Quest Map</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">Memory Map</span>
      </div>
    `:`
      <p><strong>EngramQuest</strong> gives you three AI-native learning modules. Use AI to build the content, then learn directly in the plugin.</p>
      <div class="lh-help-chips">
        <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">Review Deck</span>
        <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">Quest Map</span>
        <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">Memory Map</span>
      </div>
    `;let d='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',f=0,h=[];t==="zh-tw"&&(h=[{icon:"\u{1F680}",title:"\u958B\u59CB\u4F7F\u7528",tag:"First Run",html:`
            <p><strong>Step 1\uFF1A\u5B89\u88DD AI Skills</strong></p>
            <ol>
              <li>\u5230 Obsidian \u8A2D\u5B9A\u4E2D\u7684 <strong>EngramQuest -> AI Skills</strong></li>
              <li>\u9078\u64C7\u4F60\u4F7F\u7528\u7684 AI \u5DE5\u5177\uFF1AClaude Code / Codex / Gemini CLI / Cursor</li>
              <li>\u5B89\u88DD\u5F8C\uFF0CAI \u6703\u66F4\u6E05\u695A EngramQuest \u7684\u683C\u5F0F\u8207\u5DE5\u4F5C\u6D41\u7A0B</li>
            </ol>
            <p><strong>Step 2\uFF1A\u8ACB AI \u5EFA\u7ACB\u5167\u5BB9</strong></p>
            <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>\u5E6B\u6211\u5EFA\u7ACB Azure \u7684 Review Deck</div></div>
            <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>\u628A <em>[note].md</em> \u505A\u6210 quest-map medium</div></div>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>\u5E6B <em>[note].md</em> \u5EFA\u7ACB memory-map</div></div>
            <p><strong>Step 3\uFF1A\u56DE\u5230 Hub \u4F7F\u7528</strong></p>
            <p style="margin:4px 0">\u9EDE\u5074\u908A\u6B04\u7684 EngramQuest \u5716\u793A\uFF0C\u5207\u5230\u5C0D\u61C9\u5206\u9801\u5F8C\u76F4\u63A5\u958B\u59CB\u5B78\u7FD2\u3002</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <p>Review Deck \u662F EngramQuest \u7684\u9577\u671F\u8A18\u61B6\u6A21\u7D44\uFF0C\u4F7F\u7528 FSRS \u6392\u7A0B\u3002</p>
            <p><strong>\u91CD\u8981\uFF1AAI \u8B80\u4F86\u6E90</strong> \u548C <strong>\u63D2\u4EF6\u6383\u63CF\u7D50\u679C</strong> \u662F\u5169\u4EF6\u4E0D\u540C\u7684\u4E8B\u3002</p>
            <ul>
              <li>AI \u8B80\u4F86\u6E90\u7B46\u8A18\u6642\uFF0C\u4E0D\u8981\u6C42\u4F86\u6E90\u7B46\u8A18\u5148\u6709 <code>flashcards</code> tag\u3002</li>
              <li>AI \u53EF\u4EE5\u5148\u8B80\u53D6 vault \u88E1\u548C\u4E3B\u984C\u76F8\u95DC\u7684\u4E00\u822C\u7B46\u8A18\uFF0C\u4F8B\u5982 Azure \u7B46\u8A18\u3001\u6559\u5B78\u7B46\u8A18\u3001\u6574\u7406\u7B46\u8A18\u3002</li>
              <li>\u4F46\u63D2\u4EF6\u9810\u8A2D\u6383\u63CF Review Deck \u6642\uFF0C\u6703\u512A\u5148\u770B\u7B26\u5408 flashcard tag \u524D\u7DB4\u7684\u5361\u7247\u7B46\u8A18\u3002</li>
              <li>\u76EE\u524D\u9810\u8A2D tag prefix \u662F <code>flashcards</code>\u3002</li>
            </ul>
            <p><strong>AI \u7522\u751F Review Deck \u6642\uFF0C\u61C9\u8A72\u8F38\u51FA\uFF1A</strong></p>
            <ul>
              <li><code>question :: answer</code></li>
              <li>\u5C0D\u61C9 tag\uFF0C\u4F8B\u5982 <code>#flashcards/azure</code></li>
            </ul>
            <p><strong>\u4F7F\u7528\u65B9\u5F0F\uFF1A</strong></p>
            <ol>
              <li>\u5C0D AI \u8AAA\uFF1A<em>\u5E6B\u6211\u5EFA\u7ACB Azure \u7684 Review Deck</em></li>
              <li>AI \u5148\u8B80\u53D6 vault \u4E2D\u8207 Azure \u6709\u95DC\u7684\u4F86\u6E90\u7B46\u8A18</li>
              <li>AI \u5EFA\u7ACB\u6216\u66F4\u65B0\u53EF\u88AB\u63D2\u4EF6\u8FA8\u8B58\u7684\u5361\u7247\u7B46\u8A18</li>
              <li>\u56DE\u5230 Hub \u7684 Review Deck \u958B\u59CB\u8907\u7FD2</li>
            </ol>
            <p><strong>\u76F8\u5BB9\u6A21\u5F0F\uFF1A</strong>\u5982\u679C\u4F60\u6709\u820A\u5F0F <code>::</code> \u5361\u7247\u7B46\u8A18\uFF0C\u53EF\u4EE5\u5230\u8A2D\u5B9A\u4E2D\u958B\u555F legacy <code>::</code> \u6383\u63CF\u3002\u9019\u662F\u9077\u79FB\u6A21\u5F0F\uFF0C\u4E0D\u662F\u65B0\u624B\u9810\u8A2D\u3002</p>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <p>Quest Map \u6703\u628A\u7B46\u8A18\u8B8A\u6210\u53EF\u4E92\u52D5\u7684\u5B78\u7FD2\u5730\u5716\uFF0C\u9069\u5408\u505A\u7D50\u69CB\u5316\u5B78\u7FD2\u8207\u4E3B\u52D5\u56DE\u60F3\u3002</p>
            <p><strong>\u4F7F\u7528\u65B9\u5F0F\uFF1A</strong></p>
            <ol>
              <li>\u5C0D AI \u8AAA\uFF1A<em>\u628A [note].md \u505A\u6210 quest-map medium</em></li>
              <li>\u56DE\u5230 Hub \u7684 Quest Map \u5206\u9801</li>
              <li>\u4F9D\u5E8F\u9EDE\u958B\u7BC0\u9EDE\u8207\u6311\u6230</li>
            </ol>
            <table>
              <tr><th>\u96E3\u5EA6</th><th>\u9069\u5408\u60C5\u5883</th></tr>
              <tr><td><strong>easy</strong></td><td>\u521D\u6B21\u63A5\u89F8</td></tr>
              <tr><td><strong>medium</strong></td><td>\u77E5\u8B58\u978F\u56FA</td></tr>
              <tr><td><strong>hard</strong></td><td>\u81EA\u6211\u6E2C\u9A57</td></tr>
            </table>
          `},{icon:"🧠",title:"Memory Map",tag:c(e,"HELP_MEMORY_TAG"),html:`
            <p>Memory Map \u6703\u628A\u62BD\u8C61\u6982\u5FF5\u8F49\u6210\u8996\u89BA\u5316\u95DC\u806F\u5730\u5716\uFF0C\u9069\u5408\u7406\u89E3\u95DC\u806F\u3001\u5EFA\u7ACB chunking\u3001\u52A0\u6DF1\u8A18\u61B6\u3002</p>
            <p><strong>\u4F7F\u7528\u65B9\u5F0F\uFF1A</strong></p>
            <ol>
              <li>\u5C0D AI \u8AAA\uFF1A<em>\u5E6B [note].md \u5EFA\u7ACB memory-map</em></li>
              <li>\u56DE\u5230 Hub \u7684 Memory Map \u5206\u9801\u67E5\u770B</li>
              <li>\u4E5F\u53EF\u4EE5\u5F9E Review Deck \u5361\u7247\u4E2D\u9EDE\u9032\u5C0D\u61C9\u7684 Memory Map</li>
            </ol>
          `},{icon:"\u{1F52C}",title:"Learning Science",tag:c(e,"HELP_SCIENCE_TAG"),html:`
            <div class="lh-help-sub"><div class="lh-help-sub-icon">SR</div><div><strong>Spaced Repetition</strong><br>\u5728\u5FEB\u5FD8\u8A18\u6642\u8907\u7FD2\uFF0C\u63D0\u5347\u6548\u7387\u3002Review Deck \u4F7F\u7528 FSRS \u81EA\u52D5\u5B89\u6392\u4E0B\u6B21\u8907\u7FD2\u3002</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">RP</div><div><strong>Retrieval Practice</strong><br>\u5148\u56DE\u60F3\uFF0C\u518D\u770B\u7B54\u6848\uFF0C\u6BD4\u91CD\u8B80\u66F4\u6709\u6548\u3002Review Deck \u8207 Quest Map \u90FD\u6703\u5F37\u8FEB\u4E3B\u52D5\u56DE\u60F3\u3002</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative Encoding</strong><br>\u628A\u62BD\u8C61\u6587\u5B57\u8B8A\u6210\u5177\u9AD4\u7D50\u69CB\uFF0C\u66F4\u5BB9\u6613\u8A18\u4F4F\u3002Memory Map \u5C31\u662F\u5728\u505A\u9019\u4EF6\u4E8B\u3002</div></div>
          `},{icon:"\u2699\uFE0F",title:"\u8A2D\u5B9A",tag:c(e,"HELP_SETTINGS_TAG"),html:`
            <p>\u5230 Obsidian \u8A2D\u5B9A\u4E2D\u7684 <strong>EngramQuest</strong> \u53EF\u8ABF\u6574\u4EE5\u4E0B\u9805\u76EE\uFF1A</p>
            <table>
              <tr><th>\u8A2D\u5B9A</th><th>\u9810\u8A2D\u503C</th><th>\u8AAA\u660E</th></tr>
              <tr><td>Flashcard tag prefixes</td><td><code>flashcards</code></td><td>\u6307\u5B9A\u54EA\u4E9B tag \u524D\u7DB4\u6703\u88AB\u8996\u70BA Review Deck \u5361\u7247\u4F86\u6E90\uFF0C\u4F8B\u5982 <code>#flashcards/azure</code></td></tr>
              <tr><td>Include legacy <code>::</code> notes</td><td>Off</td><td>\u8B93\u6C92\u6709 tag \u7684\u820A <code>::</code> \u5361\u7247\u4E5F\u80FD\u88AB\u6383\u63CF\u3002\u9019\u662F\u9077\u79FB\u6A21\u5F0F\uFF0C\u4E0D\u662F\u65B0\u624B\u9810\u8A2D\u3002</td></tr>
              <tr><td>Max review interval</td><td>36525</td><td>\u6700\u5927\u8907\u7FD2\u9593\u9694\u5929\u6578</td></tr>
              <tr><td>Requested retention</td><td>0.9</td><td>FSRS \u76EE\u6A19\u4FDD\u7559\u7387\uFF0C\u8D8A\u9AD8\u4EE3\u8868\u8907\u7FD2\u8D8A\u983B\u7E41</td></tr>
            </table>
          `},{icon:"\u2753",title:"FAQ",tag:c(e,"HELP_FAQ_TAG"),html:`
            <p><strong>Q1\uFF1A\u6C92\u6709\u5B89\u88DD Skills \u4E5F\u80FD\u7528\u55CE\uFF1F</strong></p>
            <p>\u53EF\u4EE5\u3002\u4F60\u53EF\u4EE5\u624B\u52D5\u5EFA\u7ACB <code>question :: answer</code> \u5361\u7247\uFF0C\u4E26\u52A0\u4E0A\u50CF <code>#flashcards/azure</code> \u9019\u7A2E tag\u3002</p>
            <p><strong>Q2\uFF1A\u5982\u679C\u4F86\u6E90\u7B46\u8A18\u6C92\u6709\u4EFB\u4F55 tag\uFF0CAI \u9084\u8B80\u5F97\u5230\u55CE\uFF1F</strong></p>
            <p>\u53EF\u4EE5\u3002AI \u8B80\u4F86\u6E90\u7B46\u8A18\u6642\uFF0C\u4E0D\u8981\u6C42\u4F86\u6E90\u7B46\u8A18\u5148\u6709 <code>flashcards</code> tag\uFF1B\u4F46\u6700\u5F8C\u8981\u8B93\u63D2\u4EF6\u6383\u63CF\u5F97\u5230\uFF0CAI \u4ECD\u61C9\u8F38\u51FA\u6210\u53EF\u8FA8\u8B58\u7684\u5361\u7247\u683C\u5F0F\u3002</p>
            <p><strong>Q3\uFF1A\u70BA\u4EC0\u9EBC\u6211\u770B\u4E0D\u5230 Review Deck\uFF1F</strong></p>
            <p>\u5E38\u898B\u539F\u56E0\u6709\uFF1A\u9084\u6C92\u6709\u5EFA\u7ACB\u5361\u7247\u7B46\u8A18\u3001\u5361\u7247\u7B46\u8A18\u6C92\u6709\u7B26\u5408\u76EE\u524D\u8A2D\u5B9A\u7684 tag prefix\uFF0C\u6216\u4F60\u671F\u5F85\u7684\u662F\u820A\u5F0F <code>::</code> \u6383\u63CF\u4F46 legacy \u6A21\u5F0F\u9084\u6C92\u958B\u3002</p>
            <p><strong>Q4\uFF1A\u6211\u6709\u4E00\u822C Azure \u7B46\u8A18\uFF0C\u6C92\u6709\u4EFB\u4F55 tag\u3002\u8981\u600E\u9EBC\u505A Review Deck\uFF1F</strong></p>
            <p>\u76F4\u63A5\u5C0D AI \u8AAA\uFF1A<em>\u5E6B\u6211\u5EFA\u7ACB Azure \u7684 Review Deck</em>\u3002AI \u53EF\u4EE5\u5148\u8B80\u4E00\u822C Azure \u7B46\u8A18\u7576\u4F86\u6E90\uFF0C\u4F46\u6700\u5F8C\u8F38\u51FA\u61C9\u8A72\u5BEB\u6210 <code>question :: answer</code>\uFF0C\u4E26\u52A0\u4E0A\u50CF <code>#flashcards/azure</code> \u7684 tag\u3002\u56DE\u5230 Hub \u7684 Review Deck \u5C31\u80FD\u770B\u5230\u3002</p>
            <p><strong>Q5\uFF1A\u6211\u60F3\u624B\u52D5\u505A\u5361\u7247\uFF0C\u4E0D\u9760 AI\u3002\u8981\u600E\u9EBC\u505A\uFF1F</strong></p>
            <p>\u5EFA\u4E00\u7BC7\u7B46\u8A18\uFF0C\u7528 <code>question :: answer</code> \u5BEB\u5361\u7247\uFF0C\u4E26\u52A0\u4E0A\u50CF <code>#flashcards/fsrs</code> \u7684 tag\u3002\u56DE\u5230 Hub \u7684 Review Deck \u5C31\u80FD\u770B\u5230\u9019\u500B deck\u3002</p>
            <p><strong>Q6\uFF1A\u6211\u6709\u5F88\u591A\u820A <code>::</code> \u5361\u7247\uFF0C\u4F46\u6C92\u6709 tag\u3002\u8981\u600E\u9EBC\u9077\u79FB\uFF1F</strong></p>
            <p>\u5230\u8A2D\u5B9A\u6253\u958B <code>Include legacy :: notes</code>\uFF0C\u4FDD\u7559\u539F\u672C\u7684 <code>question :: answer</code> \u683C\u5F0F\uFF0C\u518D\u56DE\u5230 Hub \u7684 Review Deck \u6AA2\u67E5\u662F\u5426\u5DF2\u88AB\u7D0D\u5165\u3002\u82E5\u8981\u9577\u671F\u7DAD\u8B77\uFF0C\u5EFA\u8B70\u4E4B\u5F8C\u6162\u6162\u88DC\u4E0A <code>#flashcards/...</code> tag\u3002</p>
            <p><strong>Q7\uFF1AReview Deck \u9032\u5EA6\u5B58\u5728\u54EA\u88E1\uFF1F</strong></p>
            <p>\u8907\u7FD2\u9032\u5EA6\u6703\u5BEB\u5728\u4F86\u6E90\u7B46\u8A18\u7684 SR comment \u4E2D\uFF1A<code>&lt;!--SR:!YYYY-MM-DD,interval,stability,difficulty,state--&gt;</code></p>
            <p><strong>Q8\uFF1A\u624B\u6A5F\u53EF\u4EE5\u7528\u55CE\uFF1F</strong></p>
            <p>Review Deck \u53EF\u4EE5\u3002Quest Map \u8207 Memory Map \u76EE\u524D\u4ECD\u8F03\u9069\u5408\u684C\u9762\u7248\u3002</p>
          `}]),t==="en"&&(h=[{icon:"\u{1F680}",title:"Get Started",tag:"First Time",html:`
            <p><strong>Step 1: Install AI Skills</strong></p>
            <ol>
              <li>Open Obsidian Settings -> <strong>EngramQuest -> AI Skills</strong></li>
              <li>Choose your AI tool: Claude Code / Codex / Gemini CLI / Cursor</li>
              <li>After install, your AI will understand EngramQuest formats more reliably</li>
            </ol>
            <p><strong>Step 2: Ask AI to build content</strong></p>
            <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>"Create a review deck about Azure"</div></div>
            <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>"Turn <em>[note].md</em> into a quest-map medium"</div></div>
            <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>"Create a memory-map for <em>[note].md</em>"</div></div>
            <p><strong>Step 3: Open the Hub and learn</strong></p>
            <p style="margin:4px 0">Click the EngramQuest ribbon icon, switch tabs, and start learning.</p>
          `},{icon:"🃏",title:"Review Deck",tag:c(e,"HELP_REVIEW_TAG"),html:`
            <p>Review Deck is EngramQuest's long-term memory module and uses FSRS scheduling.</p>
            <p><strong>Important:</strong> <em>what AI reads as source</em> and <em>what the plugin scans by default</em> are not the same thing.</p>
            <ul>
              <li>AI can read ordinary source notes even if they do not have a <code>flashcards</code> tag.</li>
              <li>For example, if you ask for an Azure review deck, AI can first read your general Azure notes across the vault.</li>
              <li>But the plugin scans Review Deck cards by matching flashcard tag prefixes by default.</li>
              <li>The current default tag prefix is <code>flashcards</code>.</li>
            </ul>
            <p><strong>When AI writes the result back, it should output:</strong></p>
            <ul>
              <li><code>question :: answer</code></li>
              <li>a matching tag such as <code>#flashcards/azure</code></li>
            </ul>
            <p><strong>Typical flow:</strong></p>
            <ol>
              <li>Ask AI: "Create a review deck about Azure"</li>
              <li>AI reads relevant Azure notes across the vault</li>
              <li>AI creates or updates plugin-readable card notes</li>
              <li>Open Hub -> Review Deck and start reviewing</li>
            </ol>
            <p><strong>Migration mode:</strong> if you already have old plain <code>::</code> flashcard notes, enable legacy <code>::</code> scanning in Settings. This is optional and off by default.</p>
          `},{icon:"🗺️",title:"Quest Map",tag:c(e,"HELP_QUEST_TAG"),html:`
            <p>Convert notes into chapter-based maps with interactive challenges.</p>
            <p><strong>How to use it:</strong></p>
            <ol>
              <li>Ask AI: "Turn <em>[note].md</em> into a quest-map medium"</li>
              <li>Open Hub -> Quest Map and click nodes to progress</li>
            </ol>
            <table>
              <tr><th>Difficulty</th><th>Format</th><th>Best for</th></tr>
              <tr><td><strong>easy</strong></td><td>True/false, multiple choice (with hints)</td><td>First exposure</td></tr>
              <tr><td><strong>medium</strong></td><td>Multiple choice, ordering (no hints)</td><td>Reinforcing knowledge</td></tr>
              <tr><td><strong>hard</strong></td><td>Matching, fill-in (3 attempt limit)</td><td>Self-testing mastery</td></tr>
            </table>
          `},{icon:"🧠",title:"Memory Map",tag:c(e,"HELP_MEMORY_TAG"),html:`
            <p>Visualize hard-to-remember concepts as a canvas map. It helps break misconceptions and build intuition.</p>
            <p><strong>Use it when:</strong> a concept keeps slipping, feels abstract, or is easy to confuse with something else.</p>
            <p><strong>How to use it:</strong></p>
            <ol>
              <li>Ask AI: "Create a memory-map for <em>[note].md</em>"</li>
              <li>Open Hub -> Memory Map to view it, or click "Memory Map" on a review card</li>
            </ol>
          `},{icon:"\u{1F52C}",title:"Why It Works",tag:c(e,"HELP_SCIENCE_TAG"),html:`
            <div class="lh-help-sub"><div class="lh-help-sub-icon">SR</div><div><strong>Spaced Repetition</strong><br>Review at the point of near-forgetting. FSRS calculates the next interval automatically.</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">RP</div><div><strong>Retrieval Practice</strong><br>Active recall is more effective than re-reading. Review Deck and Quest Map force retrieval before the answer appears.</div></div>
            <div class="lh-help-sub"><div class="lh-help-sub-icon">EE</div><div><strong>Elaborative Encoding</strong><br>Concrete images and structures are easier to remember than abstract text. Memory Map turns concepts into visual structure.</div></div>
          `},{icon:"\u2699\uFE0F",title:"Settings",tag:c(e,"HELP_SETTINGS_TAG"),html:`
            <p>Open Obsidian Settings -> <strong>EngramQuest</strong> to configure:</p>
            <table>
              <tr><th>Setting</th><th>Default</th><th>What it does</th></tr>
              <tr><td>Flashcard tag prefixes</td><td><code>flashcards</code></td><td>Defines which tag prefixes count as Review Deck cards, for example <code>#flashcards/azure</code></td></tr>
              <tr><td>Include legacy <code>::</code> notes</td><td>Off</td><td>Migration mode for existing flashcard-note users. When enabled, untagged <code>::</code> notes can also become decks.</td></tr>
              <tr><td>Max review interval</td><td>36525 days</td><td>Caps the interval so mastered cards still reappear</td></tr>
              <tr><td>Requested retention</td><td>0.9</td><td>Higher means more frequent reviews to keep recall probability high</td></tr>
            </table>
          `},{icon:"\u2753",title:"FAQ",tag:c(e,"HELP_FAQ_TAG"),html:`
            <p><strong>Q1. Can I use this without installing Skills?</strong></p>
            <p>Yes. You can write cards manually using <code>question :: answer</code> and add a matching tag such as <code>#flashcards/azure</code>.</p>
            <p><strong>Q2. Can AI read source notes that do not have tags?</strong></p>
            <p>Yes. AI can read ordinary source notes without <code>flashcards</code> tags. But to make the plugin scan the result by default, AI should still write the output back as plugin-readable cards.</p>
            <p><strong>Q3. Why can't I see a Review Deck?</strong></p>
            <p>Common reasons: no card note has been created yet, the card note does not match the current tag prefix setting, or you expected old plain <code>::</code> notes to be included without enabling legacy scan.</p>
            <p><strong>Q4. I have general Azure notes with no tags. How do I make a Review Deck?</strong></p>
            <p>Ask AI: <em>Create a review deck about Azure</em>. AI can read ordinary Azure notes as source, but the final output should still be written back as <code>question :: answer</code> plus a matching tag such as <code>#flashcards/azure</code>. Then open Hub -> Review Deck.</p>
            <p><strong>Q5. I want to make cards manually without AI. How do I do it?</strong></p>
            <p>Create a note, write cards using <code>question :: answer</code>, and add a matching tag such as <code>#flashcards/fsrs</code>. Then open Hub -> Review Deck.</p>
            <p><strong>Q6. I already have many old <code>::</code> cards without tags. How do I migrate?</strong></p>
            <p>Turn on <code>Include legacy :: notes</code> in Settings, keep the existing <code>question :: answer</code> format, and reopen Hub -> Review Deck. For long-term maintenance, it is still better to gradually add <code>#flashcards/...</code> tags.</p>
            <p><strong>Q7. Where is review progress stored?</strong><br>In SR comments below each card: <code>&lt;!--SR:!YYYY-MM-DD,interval,stability,difficulty,state--&gt;</code>.</p>
            <p><strong>Q8. Does this work on mobile?</strong><br>Review Deck works on mobile. Quest Map and Memory Map are still best on desktop.</p>
          `}]),h.splice(Math.max(h.length-1,0),0,{icon:"\u{1F916}",title:t==="zh-tw"?"AI 設定":"AI Setup",tag:c(e,"HELP_AI_SETUP_TAG"),html:`
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
