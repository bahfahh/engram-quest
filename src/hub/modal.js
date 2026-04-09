"use strict";

const obsidian = require("obsidian");

function isZh(deps, settings) {
  return deps.getLanguage(settings) === "zh-tw";
}

function normalizeTagList(cache) {
  let tags = [];
  if (cache?.tags) {
    cache.tags.forEach((tag) => tags.push(String(tag.tag).replace(/^#/, "").toLowerCase()));
  }
  if (cache?.frontmatter?.tags) {
    let frontmatterTags = cache.frontmatter.tags;
    if (typeof frontmatterTags === "string") {
      frontmatterTags.split(",").forEach((tag) => tags.push(tag.trim().replace(/^#/, "").toLowerCase()));
    } else if (Array.isArray(frontmatterTags)) {
      frontmatterTags.forEach((tag) => tags.push(String(tag).replace(/^#/, "").toLowerCase()));
    } else {
      tags.push(String(frontmatterTags).replace(/^#/, "").toLowerCase());
    }
  }
  return [...new Set(tags.filter(Boolean))];
}

function createHeaderStat(container, value, label, color) {
  let item = container.createEl("div", { attr: { style: "display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:120px" } });
  item.createEl("div", { text: label, attr: { style: "font-size:12px;font-weight:700;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.25)" } });
  item.createEl("div", { text: String(value), attr: { style: `font-size:68px;font-weight:800;line-height:1;color:${color};text-shadow:0 4px 14px rgba(0,0,0,0.22)` } });
}

class HubModal extends obsidian.Modal {
  constructor(app, plugin, deps) {
    super(app);
    this.plugin = plugin;
    this.deps = deps;
    this.decks = [];
    this.quests = [];
    this.memories = [];
    this.activeTab = "review";
    this.viewMode = "list";
    this.filterStatus = "all";
    this.searchQuery = "";
    this.memoryTagFilter = "";
    this.questTagFilter = "";
    this.questDifficultyFilter = "";
  }

  async loadData() {
    this.decks = await this.deps.scanReviewDecks(this.app, this.plugin.settings);

    this.quests = [];
    for (let file of this.app.vault.getMarkdownFiles()) {
      let content = await this.app.vault.read(file);
      if (!(file.name.endsWith("-quest.md") || /```quest-map\s/i.test(content))) continue;
      let cache = this.app.metadataCache.getFileCache(file);
      let tags = normalizeTagList(cache).map((tag) => `#${tag}`);
      let difficulty = (content.match(/difficulty:\s*(\w+)/) || [])[1] || "medium";
      let styleMatch = content.match(/style:\s*([a-zA-Z0-9_-]+)/);
      let style = styleMatch ? styleMatch[1] : "sky-island";
      this.quests.push({ file, tags, difficulty, style });
    }

    this.memories = [];
    for (let file of this.app.vault.getFiles()) {
      if (!file.name.endsWith("-memory.canvas")) continue;
      let noteBase = file.name.replace("-memory.canvas", "");
      let note = this.app.vault.getMarkdownFiles().find((candidate) => candidate.basename === noteBase);
      let tags = note ? normalizeTagList(this.app.metadataCache.getFileCache(note)).map((tag) => `#${tag}`) : [];
      this.memories.push({ file, note, tags });
    }
  }

  onOpen() {
    this.modalEl.addClass("lh-hub");
    this.modalEl.style.cssText = "width:min(96vw,1180px);max-width:none;height:min(90vh,860px);";
    this.render();
  }

  render() {
    let settings = this.plugin.settings;
    let content = this.contentEl;
    content.empty();

    let root = content.createEl("div", { attr: { style: "display:flex;flex-direction:column;height:100%" } });
    let header = root.createEl("div", { attr: { class: "lh-header" } });
    header.createEl("div", { text: this.deps.translate(settings, "HUB_TITLE"), attr: { class: "lh-brand" } });

    let tabs = [
      { id: "review", label: this.deps.translate(settings, "TAB_REVIEW") },
      { id: "memory", label: this.deps.translate(settings, "TAB_MEMORY") },
      { id: "quest", label: this.deps.translate(settings, "TAB_QUEST") }
    ];

    let tabBar = header.createEl("div", { attr: { style: "display:flex;gap:12px;align-items:center" } });
    tabs.forEach((tab) => {
      let button = tabBar.createEl("button", { attr: { class: `lh-tab${tab.id === this.activeTab ? " active" : ""}` } });
      button.createEl("span", { text: tab.label });
      button.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.render();
      });
    });

    let actions = header.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;margin-left:auto" } });
    let help = actions.createEl("button", { attr: { class: "lh-help-btn", title: this.deps.translate(settings, "HELP_OPEN") } });
    help.style.cssText = "width:32px;height:32px;border-radius:8px;background:transparent;border:none;cursor:pointer;color:#6b7280;display:flex;align-items:center;justify-content:center";
    help.textContent = "❔";
    help.addEventListener("click", () => new this.deps.HelpModal(this.app, this.plugin, this.deps.helpDeps).open());
    actions.createEl("button", { text: "×", attr: { class: "lh-close", title: this.deps.translate(settings, "HUB_CLOSE") } }).addEventListener("click", () => this.close());

    let body = root.createEl("div", { attr: { style: "flex:1;display:flex;flex-direction:column;overflow:hidden" } });
    if (this.activeTab === "review") this.renderReview(body);
    if (this.activeTab === "memory") this.renderMemory(body);
    if (this.activeTab === "quest") this.renderQuest(body);
  }

  renderReview(container) {
    let settings = this.plugin.settings;
    let header = container.createEl("div");
    header.innerHTML = `
      <div style="height:170px;border-radius:0 0 28px 28px;overflow:hidden;position:relative;background:linear-gradient(180deg,#9bd6f7 0%,#bfe7fb 40%,#e8f5ff 100%);border-bottom:1px solid var(--background-modifier-border)">
        <div style="position:absolute;inset:0;background:url('${this.app.vault.adapter.getResourcePath(".obsidian/plugins/engram-quest/assets/quest-map/bg.png")}') center/cover;opacity:.22"></div>
        <div style="position:relative;display:flex;justify-content:space-around;align-items:flex-start;padding:28px 24px 12px;">
          <div style="transform:translateY(10px)">${this.createIslandStatMarkup(this.decks.reduce((sum, deck) => sum + deck.due, 0), isZh(this.deps, settings) ? "可複習" : "Ready", "#9bd765")}</div>
          <div style="transform:translateY(2px)">${this.createIslandStatMarkup(this.decks.reduce((sum, deck) => sum + deck.unseen, 0), isZh(this.deps, settings) ? "新卡" : "New", "#7aa8ff")}</div>
          <div style="transform:translateY(8px)">${this.createIslandStatMarkup(this.decks.reduce((sum, deck) => sum + deck.total, 0), isZh(this.deps, settings) ? "總數" : "Total", "#ffd95e")}</div>
        </div>
      </div>
    `;

    let panel = container.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:16px;padding:18px 22px 22px;min-height:0;overflow:hidden" } });
    let titleRow = panel.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;gap:16px" } });
    titleRow.createEl("h3", { text: this.deps.translate(settings, "TAB_REVIEW"), attr: { style: "margin:0;font-size:18px" } });
    titleRow.createEl("button", { text: `▶ ${this.deps.translate(settings, "STUDY_ALL")}`, attr: { class: "mod-cta", style: "border-radius:999px;padding:10px 18px;font-weight:700" } }).addEventListener("click", () => this.openAllReady());

    this.renderToolbar(panel, this.deps.translate(settings, "SEARCH_REVIEW"), [
      { value: "all", label: this.deps.translate(settings, "FILTER_ALL") },
      { value: "due", label: this.deps.translate(settings, "FILTER_DUE") },
      { value: "new", label: this.deps.translate(settings, "FILTER_NEW") },
      { value: "done", label: this.deps.translate(settings, "FILTER_DONE") }
    ], (value) => {
      this.filterStatus = value;
      this.render();
    });

    let list = panel.createEl("div", { attr: { style: "flex:1;overflow:auto" } });
    let filtered = this.decks.filter((deck) => {
      let ready = deck.due + deck.unseen;
      if (this.searchQuery && !deck.name.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;
      if (this.filterStatus === "due" && deck.due === 0) return false;
      if (this.filterStatus === "new" && deck.unseen === 0) return false;
      if (this.filterStatus === "done" && ready > 0) return false;
      return true;
    });

    if (this.viewMode === "list") {
      let deckList = list.createEl("div", { attr: { class: "lh-deck-list" } });
      let icons = ["🗂️", "📘", "🧠", "⭐", "⚡", "🔗", "🌿", "🧩", "📝", "🌊", "💡", "📚"];
      filtered.forEach((deck, index) => {
        let ready = deck.due + deck.unseen;
        let row = deckList.createEl("div", { attr: { class: `lh-deck-row${ready === 0 ? " is-emptyready" : ""}` } });
        row.createEl("span", { text: ">", attr: { class: "lh-deck-chevron" } });
        let main = row.createEl("div", { attr: { class: "lh-deck-main" } });
        let nameRow = main.createEl("div", { attr: { class: "lh-deck-row-name", style: "display:flex;align-items:center;gap:8px" } });
        nameRow.createEl("span", { text: icons[index % icons.length], attr: { style: "font-size:16px;line-height:1" } });
        nameRow.createEl("span", { text: deck.name });
        main.createEl("div", {
          text: ready > 0
            ? `${this.deps.translate(settings, "READY_NOW")}: ${ready}`
            : this.deps.translate(settings, "ALL_SCHEDULED").replace("{total}", String(deck.total)),
          attr: { class: "lh-deck-row-sub" }
        });

        let metrics = row.createEl("div", { attr: { class: "lh-deck-metrics" } });
        [
          { label: isZh(this.deps, settings) ? "到期" : "Due", value: deck.due, color: "#65a30d" },
          { label: isZh(this.deps, settings) ? "新卡" : "New", value: deck.unseen, color: "#6366f1" },
          { label: isZh(this.deps, settings) ? "總數" : "Total", value: deck.total, color: "#d97706" }
        ].forEach((item) => {
          let metric = metrics.createEl("div", { attr: { class: "lh-deck-metric" } });
          metric.createEl("div", { text: item.label, attr: { class: "lh-deck-metric-label" } });
          metric.createEl("div", { text: String(item.value), attr: { class: "lh-deck-metric-value", style: `color:${item.color}` } });
        });
        row.addEventListener("click", () => this.openDeck(deck, true));
      });
      return;
    }

    let grid = list.createEl("div", { attr: { class: "lh-deck-grid" } });
    filtered.forEach((deck) => {
      let ready = deck.due + deck.unseen;
      let card = grid.createEl("div", { attr: { class: `lh-deck-card${ready === 0 ? " is-emptyready" : ""}` } });
      card.createEl("div", { text: deck.name, attr: { class: "lh-deck-title" } });
      card.createEl("div", { text: ready > 0 ? `${ready} ${this.deps.translate(settings, "READY")}` : this.deps.translate(settings, "NOTHING_READY"), attr: { class: "lh-deck-ready" } });
      card.addEventListener("click", () => this.openDeck(deck, true));
    });
  }

  renderMemory(container) {
    let settings = this.plugin.settings;
    let panel = container.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:16px;padding:22px;min-height:0;overflow:hidden" } });
    let titleRow = panel.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;gap:16px" } });
    titleRow.createEl("h3", { text: this.deps.translate(settings, "TAB_MEMORY"), attr: { style: "margin:0;font-size:18px" } });
    titleRow.createEl("div", { text: `${this.memories.length} ${isZh(this.deps, settings) ? "張卡" : "items"}`, attr: { style: "font-size:13px;color:var(--text-muted)" } });

    this.renderToolbar(panel, this.deps.translate(settings, "SEARCH_MEMORY"), [{ value: "", label: this.deps.translate(settings, "FILTER_ALL_TAGS") }], (value) => {
      this.memoryTagFilter = value;
      this.render();
    }, this.collectTagOptions(this.memories), (value) => {
      this.memoryTagFilter = value;
      this.render();
    });

    let list = panel.createEl("div", { attr: { style: "flex:1;overflow:auto" } });
    let filtered = this.memories.filter((item) => {
      let term = this.searchQuery.toLowerCase();
      let fileName = item.file.basename.toLowerCase();
      if (term && !fileName.includes(term)) return false;
      if (this.memoryTagFilter && !item.tags.includes(this.memoryTagFilter)) return false;
      return true;
    });

    let rows = list.createEl("div", { attr: { class: this.viewMode === "grid" ? "lh-memory-grid" : "lh-memory-list" } });
    filtered.forEach((item, index) => {
      let row = rows.createEl("div", { attr: { class: this.viewMode === "grid" ? "lh-memory-card" : "lh-memory-row" } });
      let head = row.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:14px;min-width:0" } });
      head.createEl("div", { text: ["🌐", "⌘", "🧩", "💰", "🧠", "🧭"][index % 6], attr: { style: "width:48px;height:48px;border-radius:14px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0" } });
      let body = head.createEl("div", { attr: { style: "min-width:0;flex:1" } });
      body.createEl("div", { text: item.file.basename.replace(/-memory$/i, ""), attr: { style: "font-size:18px;font-weight:700;line-height:1.3" } });
      if (item.tags.length) {
        body.createEl("div", { text: item.tags.join(" "), attr: { style: "font-size:13px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" } });
      }
      row.createEl("button", { text: `${this.deps.translate(settings, "OPEN_MAP")} →`, attr: { style: "margin-left:auto;border:none;background:transparent;color:var(--interactive-accent);font-weight:700;cursor:pointer;white-space:nowrap" } })
        .addEventListener("click", async (event) => {
          event.stopPropagation();
          await this.app.workspace.getLeaf(true).openFile(item.file);
        });
      row.addEventListener("click", async () => this.app.workspace.getLeaf(true).openFile(item.file));
    });
  }

  renderQuest(container) {
    let settings = this.plugin.settings;
    let zh = isZh(this.deps, settings);
    let panel = container.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:16px;padding:22px;min-height:0;overflow:hidden" } });
    let titleRow = panel.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;gap:16px" } });
    titleRow.createEl("h3", { text: this.deps.translate(settings, "TAB_QUEST"), attr: { style: "margin:0;font-size:18px" } });
    titleRow.createEl("div", { text: `${this.quests.length} ${zh ? "個" : "items"}`, attr: { style: "font-size:13px;color:var(--text-muted)" } });

    let controls = panel.createEl("div", { attr: { style: "display:grid;grid-template-columns:minmax(0,1fr) 220px 220px auto;gap:12px;align-items:center" } });
    let searchWrap = controls.createEl("div", { attr: { class: "lh-search" } });
    searchWrap.createEl("span", { text: "⌕", attr: { class: "lh-search-icon" } });
    let search = searchWrap.createEl("input", { attr: { type: "text", placeholder: this.deps.translate(settings, "SEARCH_QUEST"), value: this.searchQuery } });
    search.addEventListener("input", () => {
      this.searchQuery = search.value;
      this.render();
    });

    this.createSelect(controls, [{ value: "", label: this.deps.translate(settings, "FILTER_ALL_DIFFICULTIES") }, { value: "easy", label: this.deps.translate(settings, "DIFF_EASY") }, { value: "medium", label: this.deps.translate(settings, "DIFF_MEDIUM") }, { value: "hard", label: this.deps.translate(settings, "DIFF_HARD") }], this.questDifficultyFilter, (value) => {
      this.questDifficultyFilter = value;
      this.render();
    });
    this.createSelect(controls, [{ value: "", label: this.deps.translate(settings, "FILTER_ALL_TAGS") }, ...this.collectTagOptions(this.quests)], this.questTagFilter, (value) => {
      this.questTagFilter = value;
      this.render();
    });
    this.createViewToggle(controls);

    let list = panel.createEl("div", { attr: { style: "flex:1;overflow:auto" } });
    let filtered = this.quests.filter((quest) => {
      if (this.searchQuery && !quest.file.basename.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;
      if (this.questDifficultyFilter && quest.difficulty !== this.questDifficultyFilter) return false;
      if (this.questTagFilter && !quest.tags.includes(this.questTagFilter)) return false;
      return true;
    });

    if (filtered.length === 0) {
      let empty = list.createEl("div", { attr: { style: "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:10px;text-align:center" } });
      empty.createEl("div", { text: zh ? "找不到 Quest Maps。" : "No Quest Maps found." });
      empty.createEl("div", { text: zh ? "請先建立 -quest.md 檔案，或在筆記內加入 ```quest-map code block。" : "Create a -quest.md note or add a ```quest-map code block to a note first." });
      return;
    }

    let rows = list.createEl("div", { attr: { class: this.viewMode === "grid" ? "lh-quest-grid" : "lh-quest-list" } });
    filtered.forEach((quest, index) => {
      let row = rows.createEl("div", { attr: { class: this.viewMode === "grid" ? "lh-quest-card" : "lh-quest-row" } });
      let body = row.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:14px;min-width:0" } });
      body.createEl("div", { text: ["🗺️", "🏝️", "⚔️", "🧪", "🎯", "🌊"][index % 6], attr: { style: "width:48px;height:48px;border-radius:14px;background:rgba(34,197,94,0.10);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0" } });
      let meta = body.createEl("div", { attr: { style: "min-width:0;flex:1" } });
      meta.createEl("div", { text: quest.file.basename.replace(/-quest$/i, ""), attr: { style: "font-size:18px;font-weight:700;line-height:1.3" } });
      meta.createEl("div", { text: `${quest.difficulty} • ${quest.style}`, attr: { style: "font-size:13px;color:var(--text-muted);margin-top:4px" } });
      if (quest.tags.length) {
        meta.createEl("div", { text: quest.tags.join(" "), attr: { style: "font-size:13px;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" } });
      }
      row.createEl("button", { text: `${this.deps.translate(settings, "OPEN_QUEST")} →`, attr: { style: "margin-left:auto;border:none;background:transparent;color:var(--interactive-accent);font-weight:700;cursor:pointer;white-space:nowrap" } })
        .addEventListener("click", async (event) => {
          event.stopPropagation();
          await this.app.workspace.getLeaf(true).openFile(quest.file);
        });
      row.addEventListener("click", async () => this.app.workspace.getLeaf(true).openFile(quest.file));
    });
  }

  renderToolbar(container, placeholder, filterOptions, onFilter, tagOptions, onTagFilter) {
    let toolbar = container.createEl("div", { attr: { class: "lh-toolbar" } });
    let searchWrap = toolbar.createEl("div", { attr: { class: "lh-search" } });
    searchWrap.createEl("span", { text: "⌕", attr: { class: "lh-search-icon" } });
    let search = searchWrap.createEl("input", { attr: { type: "text", placeholder, value: this.searchQuery } });
    search.addEventListener("input", () => {
      this.searchQuery = search.value;
      this.render();
    });
    this.createSelect(toolbar, filterOptions, this.filterStatus, onFilter);
    if (tagOptions && onTagFilter) {
      this.createSelect(toolbar, [{ value: "", label: this.deps.translate(this.plugin.settings, "FILTER_ALL_TAGS") }, ...tagOptions], this.memoryTagFilter, onTagFilter);
    }
    this.createViewToggle(toolbar);
  }

  createSelect(container, options, value, onChange) {
    let select = container.createEl("select", { attr: { class: "lh-select" } });
    options.forEach((option) => select.createEl("option", { value: option.value, text: option.label }));
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  createViewToggle(container) {
    let wrap = container.createEl("div", { attr: { style: "display:flex;gap:6px;justify-self:end" } });
    let list = wrap.createEl("button", { text: "≣", attr: { class: `lh-view-toggle${this.viewMode === "list" ? " active" : ""}` } });
    let grid = wrap.createEl("button", { text: "⊞", attr: { class: `lh-view-toggle${this.viewMode === "grid" ? " active" : ""}` } });
    list.addEventListener("click", () => {
      this.viewMode = "list";
      this.render();
    });
    grid.addEventListener("click", () => {
      this.viewMode = "grid";
      this.render();
    });
  }

  createIslandStatMarkup(value, label, color) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:180px">
        <div style="font-size:12px;font-weight:700;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.25);margin-bottom:8px">${label}</div>
        <div style="width:180px;height:95px;border-radius:60% 40% 52% 48%/48% 54% 46% 52%;background:rgba(255,255,255,0.22);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 8px 18px rgba(255,255,255,0.28),0 12px 28px rgba(0,0,0,0.10);border:1px solid rgba(255,255,255,0.45)">
          <div style="font-size:70px;font-weight:800;line-height:1;color:${color};text-shadow:0 4px 14px rgba(0,0,0,0.20)">${value}</div>
        </div>
      </div>
    `;
  }

  collectTagOptions(items) {
    let tags = new Set();
    items.forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort().map((tag) => ({ value: tag, label: tag }));
  }

  openDeck(deck, browseOnly) {
    let cards = [...deck.cards].sort((left, right) => {
      let order = { due: 0, learning: 1, unseen: 2, mastered: 3 };
      return (order[this.deps.getReviewStatus(left.srMeta)] ?? 2) - (order[this.deps.getReviewStatus(right.srMeta)] ?? 2);
    });
    let reopenHub = async () => {
      let modal = new HubModal(this.app, this.plugin, this.deps);
      modal.activeTab = "review";
      modal.viewMode = this.viewMode;
      modal.filterStatus = this.filterStatus;
      modal.searchQuery = this.searchQuery;
      await modal.loadData();
      modal.open();
    };
    this.close();
    new this.deps.ReviewDeckSessionModal(this.app, cards, deck.name, this.plugin, reopenHub, { browseOnly }).open();
  }

  openAllReady() {
    let settings = this.plugin.settings;
    let cards = this.decks.flatMap((deck) => deck.cards.filter((card) => {
      let status = this.deps.getReviewStatus(card.srMeta);
      return status === "due" || status === "unseen";
    }));
    if (cards.length === 0) {
      new obsidian.Notice(this.deps.translate(settings, "NO_CARDS_TO_REVIEW"));
      return;
    }
    this.openDeck({ name: this.deps.translate(settings, "FILTER_ALL"), cards }, false);
  }
}

module.exports = {
  HubModal
};
