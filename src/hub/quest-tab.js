"use strict";
// Quest Map page: two-column cards with a cover, a list and a folder tree.

const I = require("obsidian");
const { t: c, interpolate: K } = require("../i18n");
const { QuestViewerModal } = require("../quest/viewer-modal");
const ui = require("./ui");

const SORTS = [["newest", "SORT_NEWEST"], ["oldest", "SORT_OLDEST"], ["name", "SORT_NAME"]];
const DIFFICULTY = { easy: ["DIFF_EASY", "tm"], medium: ["DIFF_MEDIUM", "tl"], hard: ["DIFF_HARD", "tn"] };
const STATUS_LABEL = { cleared: "QUEST_CLEARED", boss: "QUEST_BOSS_READY", progress: "QUEST_IN_PROGRESS", idle: "QUEST_NOT_STARTED" };
const CTA_LABEL = { cleared: "QUEST_REVIEW_CLEAR", boss: "QUEST_CHALLENGE_BOSS", progress: "QUEST_CONTINUE_MISSION", idle: "OPEN_QUEST" };

function questStatus(q) { return q.completed ? "cleared" : q.bossReady ? "boss" : q.progressPct > 0 ? "progress" : "idle"; }

// Header numbers can overlap: a quest with its boss unlocked is usually also in progress.
function questCounts(quests) {
  return {
    total: quests.length,
    inProgress: quests.filter(q => !q.completed && q.progressPct > 0).length,
    bossReady: quests.filter(q => q.bossReady).length,
    cleared: quests.filter(q => q.completed).length,
  };
}

// The bar uses each quest's single status, so its segments never add up past 100%.
function questBarParts(quests) {
  const pct = (status) => (quests.length ? quests.filter(q => questStatus(q) === status).length / quests.length * 100 : 0);
  return [{ pct: pct("cleared"), color: "mst" }, { pct: pct("progress"), color: "lrn" }, { pct: pct("boss"), color: "new" }];
}

function starCount(q) {
  const base = q.bestScorePct ?? q.progressPct ?? 0;
  return base >= 90 ? 3 : base >= 60 ? 2 : base > 0 ? 1 : 0;
}

function titleOf(q) { return q.title || (q.file ? q.file.basename.replace(/-quest$/i, "") : q.slug || "Quest Map"); }

function coverUrl(hub, q) {
  try {
    let key = q.bossReady && !q.completed ? "hard" : String(q.difficulty || "medium").toLowerCase();
    if (!DIFFICULTY[key]) key = "medium";
    return hub.app.vault.adapter.getResourcePath(I.normalizePath(`${hub.plugin.manifest.dir}/assets/quest-map/card-headers/quest-card-header-${key}.webp`));
  } catch (err) {
    console.warn("EngramQuest: quest card header asset unavailable", err);
    return null;
  }
}

function paintCover(el, hub, q) {
  const url = coverUrl(hub, q);
  if (url) el.style.backgroundImage = `url("${url}")`;
}

function openQuest(hub, q) {
  new QuestViewerModal(hub.app, hub.plugin, q, async () => {
    try {
      hub._libraryReady = null;
      await hub.loadLibrary();
      if (hub._hubOpen) hub.render();
    } catch (err) {
      console.warn("EngramQuest: quest refresh failed", err);
    }
  }).open();
}

function addDelete(parent, hub, q) {
  if (!q.file && q.sourceType !== "package") return;
  ui.rowActions(parent, [{ name: "trash", label: c(hub.plugin.settings, "DELETE"), run: () => hub._confirmDelete(q, q.sourceType === "package" ? "quest-package" : "quest") }]);
}

function addStars(parent, q) {
  const count = starCount(q);
  const wrap = parent.createEl("span", { cls: "lh-stars", attr: { "aria-label": `${count}/3`, title: `${count}/3` } });
  wrap.appendText("★".repeat(count));
  if (count < 3) wrap.createEl("i", { text: "☆".repeat(3 - count) });
}

function addMeta(parent, t, q) {
  const meta = parent.createEl("div", { cls: "lh-qmeta" });
  const [key, tone] = DIFFICULTY[q.difficulty] || [];
  meta.createEl("b", { cls: tone || "", text: key ? c(t, key) : q.difficulty });
  const rest = [K(c(t, "QUEST_MISSION_COUNT"), { count: q.missionCount || 0 })];
  if (q.missionTypes && q.missionTypes.length) rest.push(q.missionTypes.slice(0, 3).join(" / "));
  if (q.bossTitle) rest.push(K(c(t, "QUEST_BOSS_LABEL"), { boss: q.bossTitle }));
  meta.appendText(` · ${rest.join(" · ")}`);
}

function addProgress(parent, t, q) {
  const top = parent.createEl("div", { cls: "lh-qpt" });
  top.createEl("span", { text: q.nodeCount ? K(c(t, "QUEST_PROGRESS_COUNT"), { done: q.completedCount, total: q.nodeCount }) : c(t, "QUEST_NO_PROGRESS") });
  top.createEl("span", { text: q.bestScorePct != null ? K(c(t, "QUEST_BEST_SCORE"), { score: q.bestScorePct }) : c(t, STATUS_LABEL[questStatus(q)]) });
  ui.track(parent, q.progressPct || 0, q.completed);
}

const CTA_ICON = { cleared: "reset", boss: "bolt", progress: "play", idle: "play" };

// The quest's state picks the button's weight: start/continue is primary, Boss is warm, cleared is quiet green.
function addCta(parent, hub, q) {
  const status = questStatus(q);
  const btn = parent.createEl("button", { cls: `lh-get is-${status}` });
  ui.icon(btn, CTA_ICON[status]);
  btn.createEl("span", { text: c(hub.plugin.settings, CTA_LABEL[status]) });
  btn.addEventListener("click", (ev) => { ev.stopPropagation(); openQuest(hub, q); });
}

function scenarioOf(t, q) { return q.scenario || q.missionGoal || q.stakes || c(t, "QUEST_SCENARIO_FALLBACK"); }

function renderCard(parent, hub, q) {
  const t = hub.plugin.settings;
  const card = parent.createEl("div", { cls: "lh-qc" });
  paintCover(card.createEl("div", { cls: "lh-qcov" }), hub, q);
  addDelete(card, hub, q);
  const body = card.createEl("div", { cls: "lh-qb" });
  const head = body.createEl("div", { cls: "lh-qt" });
  head.createEl("div", { cls: "lh-nm lh-grow", text: titleOf(q) });
  addStars(head, q);
  body.createEl("div", { cls: "lh-scn", text: scenarioOf(t, q) });
  addMeta(body, t, q);
  const foot = body.createEl("div", { cls: "lh-qf" });
  addProgress(foot.createEl("div", { cls: "lh-grow" }), t, q);
  addCta(foot, hub, q);
  card.addEventListener("click", () => openQuest(hub, q));
}

function renderRow(parent, hub, q) {
  const t = hub.plugin.settings;
  const row = parent.createEl("div", { cls: "lh-trow lh-qr" });
  paintCover(row.createEl("div", { cls: "lh-qthumb" }), hub, q);
  const main = row.createEl("div", { cls: "lh-trow-main" });
  const head = main.createEl("div", { cls: "lh-qt" });
  head.createEl("div", { cls: "lh-nm lh-grow", text: titleOf(q) });
  head.createEl("span", { cls: "lh-pth", text: c(t, STATUS_LABEL[questStatus(q)]) });
  main.createEl("div", { cls: "lh-scn", text: scenarioOf(t, q) });
  addMeta(main, t, q);
  addProgress(main.createEl("div", { attr: { style: "margin-top:6px" } }), t, q);
  addCta(row, hub, q);
  addDelete(row, hub, q);
  row.addEventListener("click", () => openQuest(hub, q));
}

function renderTreeRow(parent, hub, q) {
  const t = hub.plugin.settings;
  const row = parent.createEl("div", { cls: "lh-trow" });
  ui.icon(row.createEl("span", { cls: "lh-gi" }), "flag");
  const main = row.createEl("div", { cls: "lh-trow-main" });
  const head = main.createEl("div", { cls: "lh-qt" });
  head.createEl("div", { cls: "lh-nm lh-grow", text: titleOf(q) });
  if (q.completed) head.createEl("span", { cls: "lh-pth tm", text: c(t, "QUEST_CLEARED") });
  main.createEl("div", { cls: "lh-pth", text: (q.tags || []).join(" ") });
  const [key, tone] = DIFFICULTY[q.difficulty] || [];
  row.createEl("span", { cls: `lh-qdiff ${tone || ""}`, text: key ? c(t, key) : q.difficulty });
  const link = row.createEl("button", { cls: "lh-link" });
  link.createEl("span", { text: c(t, "OPEN_QUEST") });
  ui.icon(link, "arrow");
  if (q.file) addDelete(row, hub, q);
  row.addEventListener("click", () => openQuest(hub, q));
}

function matches(hub, q, query, difficulty, tag) {
  const haystack = [titleOf(q), q.file && q.file.parent && q.file.parent.path, q.slug, q.description, q.scenario, q.missionGoal, q.stakes, (q.tags || []).join(" ")].join(" ").toLowerCase();
  const status = hub.filterQuestStatus;
  const statusOk = status === "all" || (status === "completed" ? q.completed : status === "boss" ? q.bossReady : !q.completed);
  return (difficulty === "all" || q.difficulty === difficulty) && (tag === "all" || (q.tags && q.tags.includes(tag))) && statusOk && haystack.includes(query);
}

function renderItems(el, hub, filters) {
  const t = hub.plugin.settings;
  el.empty();
  const items = hub.quests.filter(q => matches(hub, q, hub.searchQuery.toLowerCase(), filters.difficulty, filters.tag.value));
  hub._sortItems(items, hub.sortQuest, true);
  if (items.length === 0) { el.createEl("div", { cls: "lh-empty2", text: c(t, "EMPTY_FILTERED_QUESTS") }); return; }
  if (hub.viewMode === "tree") {
    const wrap = el.createEl("div", { cls: "lh-tree-container" });
    const pathOf = q => (q.file && q.file.parent ? q.file.parent.path : q.sourceType === "package" ? `engram-quest/quests/${q.slug}` : "/");
    hub._renderTreeRecursive(wrap, hub._buildTree(items, pathOf), (parent, q) => renderTreeRow(parent, hub, q));
  } else if (hub.viewMode === "grid") {
    const grid = el.createEl("div", { cls: "lh-qgrid" });
    items.forEach(q => renderCard(grid, hub, q));
  } else {
    const list = el.createEl("div", { cls: "lh-tbl" });
    items.forEach(q => renderRow(list, hub, q));
  }
}

function renderQuestTab(e, hub) {
  const t = hub.plugin.settings;
  ui.pageHeader(e, hub, { titleKey: "QUEST_PRACTICE_TITLE", guide: "quest", subtitle: c(t, "QUEST_PRACTICE_DESC") });
  const counts = questCounts(hub.quests);
  const sum = e.createEl("div", { cls: "lh-sumr" });
  ui.metrics(sum, [
    { value: counts.total, label: c(t, "FILTER_ALL") },
    { value: counts.inProgress, label: c(t, "QUEST_IN_PROGRESS"), tone: "tl" },
    { value: counts.bossReady, label: c(t, "QUEST_BOSS_READY"), tone: "tn" },
    { value: counts.cleared, label: c(t, "QUEST_CLEARED"), tone: "tm" },
  ]);
  if (hub.quests.length === 0) {
    e.createEl("div", { cls: "lh-empty2" }).appendChild(I.sanitizeHTMLToDom(c(t, "EMPTY_QUESTS").split("\n").join("<br>")));
    return;
  }
  ui.segBar(sum, questBarParts(hub.quests));

  let content;
  const filters = { difficulty: "all", tag: null };
  const refresh = () => renderItems(content, hub, filters);
  const bar = e.createEl("div", { cls: "lh-tb" });
  ui.searchBox(bar, { placeholder: c(t, "SEARCH_QUEST"), value: hub.searchQuery, grow: true, onInput: (v) => { hub.searchQuery = v; refresh(); } });
  ui.sortSelect(bar, t, SORTS, hub.sortQuest, (v) => { hub.sortQuest = v; refresh(); });
  ui.filterSelect(bar, [["all", c(t, "FILTER_ALL_DIFFICULTIES")], ["easy", c(t, "DIFF_EASY")], ["medium", c(t, "DIFF_MEDIUM")], ["hard", c(t, "DIFF_HARD")]], "all", (v) => { filters.difficulty = v; refresh(); });
  ui.filterSelect(bar, [["all", c(t, "FILTER_ALL_STATUS")], ["incomplete", c(t, "FILTER_INCOMPLETE")], ["boss", c(t, "QUEST_BOSS_READY")], ["completed", c(t, "QUEST_CLEARED")]], hub.filterQuestStatus, (v) => { hub.filterQuestStatus = v; refresh(); });
  filters.tag = ui.tagFilter(bar, hub, new Set(hub.quests.flatMap(q => q.tags || [])), refresh);
  ui.viewToggle(bar, hub, refresh);
  content = e.createEl("div", { cls: "lh-scroll" });
  refresh();
}

module.exports = { renderQuestTab, questStatus, questCounts, questBarParts, starCount, CTA_LABEL };
