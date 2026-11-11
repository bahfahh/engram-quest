"use strict";
// Memory Map page: a card grid, a list and a folder tree over the vault's *-memory.canvas files.

const I = require("obsidian");
const { t: c } = require("../i18n");
const ui = require("./ui");

const SORTS = [["newest", "SORT_NEWEST"], ["oldest", "SORT_OLDEST"], ["name", "SORT_NAME"]];

function folderOf(item) { return item.file.parent ? item.file.parent.path : ""; }
function tagsOf(item) { return item.tags && item.tags.length ? item.tags.join(" ") : ""; }

function bindOpen(el, hub, item) {
  el.addEventListener("click", () => { hub._minimize(); hub.app.workspace.openLinkText(item.file.path, "", false); });
}

function mapIcon(parent, hub) { ui.featureIcon(parent.createEl("span", { cls: "lh-gi" }), hub.plugin, "memory", { size: 26, fallback: "map" }); }

function openButton(parent, t) {
  const btn = parent.createEl("button", { cls: "lh-btn alt lh-open" });
  btn.createEl("span", { text: c(t, "OPEN_MAP") });
  ui.icon(btn, "external");
  return btn;
}

function tagChips(parent, item) {
  if (!item.tags || !item.tags.length) return;
  const row = parent.createEl("div", { cls: "lh-chips" });
  item.tags.slice(0, 3).forEach(tag => row.createEl("span", { cls: "lh-chip", text: tag }));
  if (item.tags.length > 3) row.createEl("span", { cls: "lh-chip", text: "+" + (item.tags.length - 3), attr: { title: item.tags.join("  ") } });
}

function deleteAction(parent, hub, item) {
  ui.rowActions(parent, [{ name: "trash", label: c(hub.plugin.settings, "DELETE"), run: () => hub._confirmDelete(item, "memory") }]);
}

function renderCard(parent, hub, item) {
  const t = hub.plugin.settings;
  const card = parent.createEl("div", { cls: "lh-dc lh-mc" });
  const head = card.createEl("div", { cls: "lh-dh" });
  mapIcon(head, hub);
  const name = head.createEl("div", { attr: { style: "min-width:0" } });
  name.createEl("div", { cls: "lh-nm", text: item.baseName });
  name.createEl("div", { cls: "lh-pth", text: folderOf(item) || "/" });
  tagChips(card, item);
  // The card has two separate controls: open the canvas, and delete it.
  const foot = card.createEl("div", { cls: "lh-mf" });
  openButton(foot, t);
  // A click anywhere on the card opens it, except on the delete button.
  card.addEventListener("click", (ev) => {
    if (ev.target.closest("button") && !ev.target.closest(".lh-open")) return;
    hub._minimize();
    hub.app.workspace.openLinkText(item.file.path, "", false);
  });
  ui.iconButton(foot, "trash", c(t, "DELETE"), () => hub._confirmDelete(item, "memory"));
}

function renderRow(parent, hub, item, showFolder) {
  const t = hub.plugin.settings;
  const row = parent.createEl("div", { cls: "lh-trow" });
  mapIcon(row, hub);
  const main = row.createEl("div", { cls: "lh-trow-main" });
  main.createEl("div", { cls: "lh-nm", text: item.baseName });
  main.createEl("div", { cls: "lh-pth", text: showFolder ? [tagsOf(item), folderOf(item)].filter(Boolean).join(" · ") : tagsOf(item) });
  openButton(row, t);
  deleteAction(row, hub, item);
  bindOpen(row, hub, item);
}

function renderItems(el, hub, tag) {
  const t = hub.plugin.settings;
  el.empty();
  const query = hub.searchQuery.toLowerCase();
  const items = hub.memories.filter(item =>
    (tag.value === "all" || (item.tags && item.tags.includes(tag.value))) &&
    (item.baseName.toLowerCase().includes(query) || folderOf(item).toLowerCase().includes(query)));
  hub._sortItems(items, hub.sortMemory, false);
  if (items.length === 0) { el.createEl("div", { cls: "lh-empty2", text: c(t, "EMPTY_FILTERED_MEMORIES") }); return; }
  if (hub.viewMode === "tree") {
    const wrap = el.createEl("div", { cls: "lh-tree-container" });
    hub._renderTreeRecursive(wrap, hub._buildTree(items, item => folderOf(item) || "/"), (parent, item) => renderRow(parent, hub, item, false));
  } else if (hub.viewMode === "grid") {
    const grid = el.createEl("div", { cls: "lh-mgrid" });
    items.forEach(item => renderCard(grid, hub, item));
  } else {
    const list = el.createEl("div", { cls: "lh-tbl" });
    items.forEach(item => renderRow(list, hub, item, true));
  }
}

function renderMemoryTab(e, hub) {
  const t = hub.plugin.settings;
  ui.pageHeader(e, hub, { titleKey: "TAB_MEMORY", guide: "memory", subtitle: c(t, "MAP_COUNT", { count: hub.memories.length }) });
  if (hub.memories.length === 0) {
    e.createEl("div", { cls: "lh-empty2" }).appendChild(I.sanitizeHTMLToDom(c(t, "EMPTY_MEMORIES").replace(/\n/g, "<br>")));
    return;
  }
  let content, tag;
  const refresh = () => renderItems(content, hub, tag);
  const bar = e.createEl("div", { cls: "lh-tb" });
  ui.searchBox(bar, { placeholder: c(t, "SEARCH_MEMORY"), value: hub.searchQuery, grow: true, onInput: (v) => { hub.searchQuery = v; refresh(); } });
  const tags = new Set(hub.memories.flatMap(item => item.tags || []));
  tag = ui.tagFilter(bar, hub, tags, refresh);
  ui.sortSelect(bar, t, SORTS, hub.sortMemory, (v) => { hub.sortMemory = v; refresh(); });
  ui.viewToggle(bar, hub, refresh);
  content = e.createEl("div", { cls: "lh-scroll" });
  refresh();
}

module.exports = { renderMemoryTab };
