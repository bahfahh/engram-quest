"use strict";
// The Hub frame: sidebar on desktop (the user can fold it into the icon rail; narrow windows
// always use the rail), and on a phone a three-tab home with sub-pages. Tab ids, load order and
// guards are unchanged from the old nav.

const { t: c } = require("../i18n");
const { ProUpgradeModal } = require("../license/upgrade");
const { HelpModal } = require("./help");
const { attachInfoButton, hasFeatureGuide } = require("./feature-guide");
const { STAR, PLAY, rawIcon, iconButton, featureIcon, isPhone, metrics, segBar, clearCapsuleActions } = require("./ui");
const { RAIL_MAX_WIDTH, isCollapsed, setCollapsed, watchingTab } = require("./sidebar");
const { renderPhoneContinue } = require("../videos/render");
const { TABS, categories } = require("./categories");

// Phone tab bar: each group shows the icon of its first feature (glass icon, line-icon fallback).
const CAT_ICONS = { memory: ["review", "deck"], learn: ["lesson", "book"], achieve: ["achievement", "medal"] };

// Soft light along the top of the window, drawn in CSS.
function addAmbient(parent) { parent.createEl("div", { cls: "lh-amb", attr: { "aria-hidden": "true" } }); }

function tabIcon(parent, hub, id, size) { return featureIcon(parent, hub.plugin, id, { size, fallback: TABS[id].icon }); }

function readyCount(hub) { return hub.decks.reduce((n, d) => n + d.due + d.unseen, 0); }

function openPro(hub) { new ProUpgradeModal(hub.app, hub.plugin).open(); }

function proEntry(parent, hub, cls) {
  const t = hub.plugin.settings;
  const active = !!t.licenseValid;
  const label = c(t, active ? "PRO_ACTIVE_ACTION" : "PRO_LEARN");
  const btn = parent.createEl("button", { cls: cls + (active ? " active" : "") });
  rawIcon(btn.createEl("span", { cls: "lh-pti " + (active ? "active" : "free") }), STAR);
  return { btn, label };
}

// Renders a tab into `content`. The generation guard drops a stale render after rapid switching.
async function showTab(hub, content, tab) {
  hub.activeTab = tab;
  hub.viewMode = hub.viewModes[tab] || "list";
  const gen = hub._tabGen = (hub._tabGen || 0) + 1;
  hub.setHero(true);
  // Coming back to the tab whose video (hub._vTopic) is still open keeps the sidebar as it was there.
  hub.setWatching(hub._watchingTab === tab && !!hub._vTopic);
  clearCapsuleActions(hub);
  content.empty();
  content.createEl("div", { text: "⏳", cls: "lh-pending" });
  await Promise.all(hub._needsFor(tab));
  if (hub._tabGen !== gen) return;
  content.empty();
  hub._renderTab(content, tab);
  hub._maybeShowGuide(tab);
}

function renderDesktop(hub, root) {
  const t = hub.plugin.settings;
  const shell = root.createEl("div", { cls: "lh-shell" });
  addAmbient(shell);
  hub.setHero = (on) => shell.classList.toggle("no-hero", !on);

  const side = shell.createEl("nav", { cls: "lh-side", attr: { "aria-label": c(t, "HUB_NAV") } });
  const brand = side.createEl("div", { cls: "lh-brand" });
  featureIcon(brand, hub.plugin, "logo", { size: 32 });
  brand.createEl("span", { cls: "lh-brand-full", text: c(t, "HUB_TITLE") });

  // Fold / unfold, beside the name (under the logo once folded). A page with a video open calls
  // setWatching so the player gets the room; the button then changes (and remembers) the choice
  // for that situation only.
  const fold = iconButton(brand, "fold", "", () => {
    const s = hub.plugin.settings;
    setCollapsed(s, watching(), !isCollapsed(s, watching()));
    paintSide();
    Promise.resolve(hub.plugin.saveData(s)).catch((e) => console.warn("EngramQuest: sidebar state not saved", e));
  }, "lh-side-fold");
  const watching = () => !!hub._watchingTab && hub._watchingTab === hub.activeTab;
  // Obsidian shows an element's aria-label as its tooltip. An item whose name is on screen beside
  // its icon gets none: the tooltip would only cover the next item. In the icon rail (folded by
  // the user, or a narrow window) the name is not on screen, so the item carries it as aria-label:
  // its accessible name and its one tooltip, opening away from the rail.
  const named = [];
  const nameInRail = (btn, name) => { btn.setAttribute("data-tooltip-position", "right"); named.push([btn, name]); };
  const narrow = activeWindow.matchMedia(`(max-width:${RAIL_MAX_WIDTH}px)`);
  const paintSide = () => {
    const collapsed = isCollapsed(hub.plugin.settings, watching());
    shell.classList.toggle("is-rail", collapsed);
    fold.setAttribute("aria-expanded", String(!collapsed));
    fold.setAttribute("aria-label", c(t, collapsed ? "HUB_SIDE_EXPAND" : "HUB_SIDE_COLLAPSE"));
    const rail = collapsed || narrow.matches;
    named.forEach(([btn, name]) => { if (rail) btn.setAttribute("aria-label", name); else btn.removeAttribute("aria-label"); });
  };
  const onNarrow = () => { if (shell.isConnected) paintSide(); else narrow.removeEventListener("change", onNarrow); };
  narrow.addEventListener("change", onNarrow);
  fold.setAttribute("data-tooltip-position", "right");
  hub.setWatching = (on) => { hub._watchingTab = watchingTab(hub._watchingTab, hub.activeTab, !!on); paintSide(); };

  const main = shell.createEl("div", { cls: "lh-main" });
  const buttons = new Map();
  const select = (tab) => {
    buttons.forEach((b, id) => { b.classList.toggle("on", id === tab); if (id === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    showTab(hub, main, tab);
  };

  categories(t).forEach((cat, at) => {
    if (at) side.createEl("div", { cls: "lh-rsep" });
    side.createEl("div", { cls: "lh-grp", text: cat.label });
    cat.tabs.forEach((id) => {
      const meta = TABS[id], label = c(t, meta.key), full = `${cat.label}：${label}`;
      const btn = side.createEl("button", { cls: "lh-nv" + (id === hub.activeTab ? " on" : ""), attr: { "data-tab": id } });
      nameInRail(btn, full);
      tabIcon(btn, hub, id, 32);
      btn.createEl("span", { cls: "lh-nv-label", text: label });
      if (id === "review") {
        const count = btn.createEl("em");
        hub._decksReady.then(() => { count.textContent = String(readyCount(hub)); }).catch(() => {});
      }
      btn.addEventListener("click", () => select(id));
      buttons.set(id, btn);
    });
  });

  const foot = side.createEl("div", { cls: "lh-foot" });
  const { btn: pro, label: proLabel } = proEntry(foot, hub, "lh-pro");
  pro.createEl("span", { cls: "lh-pro-label", text: proLabel });
  pro.addEventListener("click", () => openPro(hub));
  nameInRail(pro, proLabel);
  iconButton(foot, "help", c(t, "HELP_OPEN"), () => new HelpModal(hub.app, hub.plugin).open()).setAttribute("data-tooltip-position", "right");
  paintSide();

  const capsule = shell.createEl("div", { cls: "lh-capsule" });
  hub.capsuleEl = capsule;
  iconButton(capsule, "minimize", c(t, "HUB_MINIMIZE"), () => hub._minimize());
  iconButton(capsule, "close", c(t, "HUB_CLOSE"), () => hub.close());

  const owner = categories(t).find(cat => cat.tabs.includes(hub.activeTab));
  select(owner ? hub.activeTab : "review");
}

// Counts on a phone home row appear once the feature's data is known; the home page never loads
// a feature just to show its number.
function phoneHint(hub, id) {
  const t = hub.plugin.settings;
  if (id === "memory" && hub._libraryLoaded) return c(t, "MAP_COUNT", { count: hub.memories.length });
  if (id === "quest" && hub._libraryLoaded) return `${hub.quests.filter(q => !q.completed && q.progressPct > 0).length} ${c(t, "QUEST_IN_PROGRESS")}`;
  return (hub._entryHints && hub._entryHints[id]) || "";
}

function phoneEntries(parent, hub, tabs) {
  const t = hub.plugin.settings;
  const list = parent.createEl("div", { cls: "lh-pl" });
  tabs.forEach((id) => {
    const meta = TABS[id];
    const row = list.createEl("button", { cls: "lh-pr", attr: { "data-tab": id } });
    tabIcon(row, hub, id, 32);
    row.createEl("span", { cls: "lh-grow" }).createEl("b", { text: c(t, meta.key) });
    if (id === "review") row.createEl("span", { cls: "lh-val", text: String(readyCount(hub)) });
    else {
      const hint = phoneHint(hub, id);
      if (hint) row.createEl("span", { cls: "lh-note", text: hint });
    }
    row.createEl("span", { cls: "lh-chev", text: "›", attr: { "aria-hidden": "true" } });
    row.addEventListener("click", () => hub._openPhonePage(id));
  });
}

function phoneMemoryHome(body, hub, cat) {
  const t = hub.plugin.settings;
  const due = hub.decks.reduce((n, d) => n + d.due, 0), unseen = hub.decks.reduce((n, d) => n + d.unseen, 0), total = hub.decks.reduce((n, d) => n + d.total, 0);
  const head = body.createEl("div", { attr: { style: "flex:none" } });
  head.createEl("h1", { cls: "lh-ptl", text: cat.label });
  head.createEl("p", { cls: "lh-psb", text: c(t, "READY_HELP_SHORT") });
  const sum = body.createEl("div", { cls: "lh-sumr" });
  metrics(sum, [{ value: due + unseen, label: c(t, "READY"), tone: "td" }, { value: unseen, label: c(t, "FILTER_NEW"), tone: "tn" }, { value: total, label: c(t, "TOTAL") }]);
  if (total) segBar(sum, [{ pct: due / total * 100, color: "due" }, { pct: unseen / total * 100, color: "new" }]);
  const study = body.createEl("button", { cls: "lh-pbtn" });
  rawIcon(study, PLAY);
  study.createEl("span", { text: c(t, "STUDY_ALL") });
  study.addEventListener("click", () => hub._studyAll());
  hub._resumeLink(body);
  phoneEntries(body, hub, cat.tabs);
  const proList = body.createEl("div", { cls: "lh-pl" });
  const { btn, label } = proEntry(proList, hub, "lh-pr");
  btn.createEl("span", { cls: "lh-grow" }).createEl("b", { text: label });
  btn.createEl("span", { cls: "lh-chev", text: "›", attr: { "aria-hidden": "true" } });
  btn.addEventListener("click", () => openPro(hub));
}

function phoneLearnHome(body, hub, cat) {
  const head = body.createEl("div", { attr: { style: "flex:none" } });
  head.createEl("h1", { cls: "lh-ptl", text: cat.label });
  if (hub._learnSummary) head.createEl("p", { cls: "lh-psb", text: hub._learnSummary });
  renderPhoneContinue(body.createEl("div", { cls: "lh-pcont" }), hub);
  phoneEntries(body, hub, cat.tabs);
}

function renderPhone(hub, root) {
  const t = hub.plugin.settings;
  const cats = categories(t);
  const shell = root.createEl("div", { cls: "lh-ph" });
  hub.setHero = () => {};
  hub.setWatching = () => {};
  const paint = () => {
    hub._tabGen = (hub._tabGen || 0) + 1;
    shell.empty();
    const page = hub._phonePage;
    shell.classList.toggle("is-home", !page);
    addAmbient(shell);
    if (page) { renderPhoneSub(hub, shell, page, cats); return; }
    const cat = cats.find(x => x.id === hub.activeCategory) || cats[0];
    const capsule = shell.createEl("div", { cls: "lh-capsule" });
    hub.capsuleEl = capsule;
    iconButton(capsule, "help", c(t, "HELP_OPEN"), () => new HelpModal(hub.app, hub.plugin).open());
    iconButton(capsule, "minimize", c(t, "HUB_MINIMIZE"), () => hub._minimize());
    iconButton(capsule, "close", c(t, "HUB_CLOSE"), () => hub.close());
    const body = shell.createEl("div", { cls: "lh-pbody" });
    if (cat.id === "memory") phoneMemoryHome(body, hub, cat);
    else if (cat.id === "learn") phoneLearnHome(body, hub, cat);
    else {
      const head = body.createEl("div", { attr: { style: "flex:none" } });
      head.createEl("h1", { cls: "lh-ptl", text: cat.label });
      const content = body.createEl("div", { cls: "lh-pmain" });
      showTab(hub, content, "achievement");
    }
    const bar = shell.createEl("nav", { cls: "lh-tabg lh-glass", attr: { "aria-label": c(t, "HUB_NAV") } });
    cats.forEach((x) => {
      const btn = bar.createEl("button", { cls: x.id === cat.id ? "on" : "", attr: x.id === cat.id ? { "aria-current": "page" } : {} });
      featureIcon(btn, hub.plugin, CAT_ICONS[x.id][0], { size: 26, fallback: CAT_ICONS[x.id][1] });
      btn.createEl("span", { text: x.label });
      btn.addEventListener("click", () => { hub.activeCategory = x.id; paint(); });
    });
  };
  hub._openPhonePage = (id) => { hub._phonePage = id; paint(); };
  hub._closePhonePage = () => { hub._phonePage = null; paint(); };
  paint();
}

function renderPhoneSub(hub, shell, page, cats) {
  const t = hub.plugin.settings;
  const cat = cats.find(x => x.tabs.includes(page)) || cats[0];
  const body = shell.createEl("div", { cls: "lh-pbody" });
  const nav = body.createEl("div", { cls: "lh-pnav" });
  const back = nav.createEl("div", { cls: "lh-pnav-side" }).createEl("button", { cls: "lh-pback", text: `‹ ${cat.label}` });
  back.addEventListener("click", () => { if (hub.phoneNav.onBack) hub.phoneNav.onBack(); else hub._closePhonePage(); });
  nav.createEl("span", { cls: "lh-pnav-title", text: c(t, TABS[page].key) });
  const side = nav.createEl("div", { cls: "lh-pnav-side" });
  if (hasFeatureGuide(page)) attachInfoButton(side, hub.app, hub.plugin, page);
  hub.phoneNav = { back, title: nav.querySelector(".lh-pnav-title"), side, backLabel: back.textContent, titleText: c(t, TABS[page].key), onBack: null };
  const content = body.createEl("div", { cls: "lh-pmain" });
  showTab(hub, content, page);
}

function renderShell(hub) {
  const root = hub.contentEl;
  root.empty();
  const t = hub.plugin.settings;
  const cats = categories(t);
  if (!cats.some(cat => cat.tabs.includes(hub.activeTab))) hub.activeTab = "review";
  if (!hub.activeCategory) hub.activeCategory = (cats.find(cat => cat.tabs.includes(hub.activeTab)) || cats[0]).id;
  if (isPhone()) renderPhone(hub, root); else renderDesktop(hub, root);
}

module.exports = { renderShell };
