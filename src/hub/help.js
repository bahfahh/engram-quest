"use strict";

const obsidian = require("obsidian");

function buildHelpSections(zh, translateKey, settings) {
  return [
    {
      icon: "AI",
      title: zh ? "開始使用" : "Getting Started",
      tag: translateKey(settings, "HELP_AI_SETUP_TAG"),
      html: zh ? `
        <p>EngramQuest 提供三個 AI-native 學習模組。先用 AI 產生內容，再直接在插件內學習。</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px;">
          <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">Review Deck</span>
          <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">Quest Map</span>
          <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">Memory Map</span>
        </div>
        <p><strong>Step 1：安裝 AI Skills</strong></p>
        <ol>
          <li>到 Obsidian 設定中的 EngramQuest -> AI Skills</li>
          <li>選擇你使用的 AI 工具：Claude Code / Codex / Gemini CLI / Cursor</li>
          <li>安裝後，AI 會更清楚 EngramQuest 的格式與工作流程</li>
        </ol>
        <p><strong>Step 2：請 AI 建立內容</strong></p>
        <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>幫我建立 Azure 的 Review Deck</div></div>
        <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>把 <em>[note].md</em> 做成 quest-map medium</div></div>
        <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>幫 <em>[note].md</em> 建立 memory-map</div></div>
        <p><strong>Step 3：回到 Hub 使用</strong></p>
        <p style="margin:4px 0">點側邊欄的 EngramQuest 圖示，切到對應分頁後直接開始學習。</p>
      ` : `
        <p>EngramQuest has three AI-native learning modules. Generate content with AI first, then use it directly inside the plugin.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px;">
          <span class="lh-help-chip" style="background:#dbeafe;color:#1d4ed8">Review Deck</span>
          <span class="lh-help-chip" style="background:#d1fae5;color:#065f46">Quest Map</span>
          <span class="lh-help-chip" style="background:#ede9fe;color:#5b21b6">Memory Map</span>
        </div>
        <p><strong>Step 1: Install AI Skills</strong></p>
        <ol>
          <li>Open Obsidian Settings -> EngramQuest -> AI Skills</li>
          <li>Select your tool: Claude Code / Codex / Gemini CLI / Cursor</li>
          <li>After install, AI will understand EngramQuest formats and workflow better</li>
        </ol>
        <p><strong>Step 2: Ask AI to create content</strong></p>
        <div class="lh-help-sub" style="border-color:#2563eb"><div class="lh-help-sub-icon">🃏</div><div>Create a Review Deck about Azure</div></div>
        <div class="lh-help-sub" style="border-color:#059669"><div class="lh-help-sub-icon">🗺️</div><div>Turn <em>[note].md</em> into a quest-map medium</div></div>
        <div class="lh-help-sub" style="border-color:#7c3aed"><div class="lh-help-sub-icon">🧠</div><div>Create a memory-map for <em>[note].md</em></div></div>
        <p><strong>Step 3: Open Hub</strong></p>
        <p style="margin:4px 0">Click the EngramQuest ribbon icon and switch to the module you want to use.</p>
      `
    },
    {
      icon: "🃏",
      title: "Review Deck",
      tag: translateKey(settings, "HELP_REVIEW_TAG"),
      html: zh ? `
        <p>Review Deck 是 EngramQuest 的長期記憶模組，使用 FSRS 排程。</p>
        <p>預設會掃描符合 flashcard tag 前綴的卡片，例如 <code>#flashcards/azure</code>。</p>
        <p>你也可以直接用 <code>question :: answer</code> 建立卡片，再讓 AI 補上 tag 與 hints。</p>
      ` : `
        <p>Review Deck is EngramQuest's long-term memory module and uses FSRS scheduling.</p>
        <p>By default it scans cards that match your flashcard tag prefixes, such as <code>#flashcards/azure</code>.</p>
        <p>You can also create cards using <code>question :: answer</code> and let AI add tags and hints later.</p>
      `
    },
    {
      icon: "🗺️",
      title: "Quest Map",
      tag: translateKey(settings, "HELP_QUEST_TAG"),
      html: zh ? `
        <p>Quest Map 會把筆記變成可互動的學習地圖，適合做結構化學習與主動回想。</p>
        <p>Hub 會收進檔名為 <code>-quest.md</code> 的筆記，或是內含 <code>quest-map</code> code block 的筆記。</p>
      ` : `
        <p>Quest Map turns notes into interactive learning maps for structured study and active recall.</p>
        <p>The Hub includes notes named <code>-quest.md</code> or notes that contain a <code>quest-map</code> code block.</p>
      `
    },
    {
      icon: "🧠",
      title: "Memory Map",
      tag: translateKey(settings, "HELP_MEMORY_TAG"),
      html: zh ? `
        <p>Memory Map 會把抽象概念轉成視覺化關聯地圖，適合理解關聯與建立 chunking。</p>
        <p>對應檔案會以 <code>-memory.canvas</code> 存在 vault 中。</p>
      ` : `
        <p>Memory Map turns abstract concepts into visual association maps that support chunking and recall.</p>
        <p>Its generated files are stored as <code>-memory.canvas</code> inside the vault.</p>
      `
    }
  ];
}

class HelpModal extends obsidian.Modal {
  constructor(app, plugin, deps) {
    super(app);
    this.plugin = plugin;
    this.deps = deps;
  }

  onClose() {
    document.getElementById("lh-help-styles")?.remove();
  }

  onOpen() {
    let settings = this.plugin.settings;
    let zh = this.deps.getLanguage(settings) === "zh-tw";
    this.modalEl.addClass("lh-help");
    this.modalEl.style.cssText = "width:min(95vw,980px);max-width:none;";
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: this.deps.translate(settings, "HELP_TITLE") });

    let sections = buildHelpSections(zh, this.deps.translate, settings);
    let accordion = this.contentEl.createEl("div", { attr: { class: "lh-help-accordion" } });
    sections.forEach((section, index) => {
      let item = accordion.createEl("div", { attr: { class: "lh-help-acc-item" } });
      let header = item.createEl("button", { attr: { class: `lh-help-acc-hdr${index === 0 ? " open" : ""}` } });
      header.createEl("span", { attr: { class: "lh-help-acc-icon" }, text: section.icon });
      header.createEl("span", { attr: { class: "lh-help-acc-title" }, text: section.title });
      if (section.tag) {
        header.createEl("span", { attr: { class: "lh-help-chip" }, text: section.tag });
      }
      let body = item.createEl("div", { attr: { class: `lh-help-acc-body${index === 0 ? " open" : ""}` } });
      body.innerHTML = section.html;
      header.addEventListener("click", () => {
        let opening = !header.classList.contains("open");
        accordion.querySelectorAll(".lh-help-acc-hdr").forEach((node) => node.classList.remove("open"));
        accordion.querySelectorAll(".lh-help-acc-body").forEach((node) => node.classList.remove("open"));
        if (opening) {
          header.classList.add("open");
          body.classList.add("open");
        }
      });
    });
  }
}

module.exports = {
  HelpModal
};
