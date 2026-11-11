"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { getReviewStatus } = require("../review/helpers");
const { listCourses, courseProgress } = require("../lessons/data");
const ui = require("./ui");

const ACHIEVEMENTS = [
  // --- Original 12 ---
  { id: "first_card",   icon: "assets/icons/first_card.webp",   rarity: "UC",  threshold: 1,    field: "totalCardsReviewed", nameKey: "ACH_FIRST_CARD_NAME",   descKey: "ACH_FIRST_CARD_DESC"   },
  { id: "ten_cards",    icon: "assets/icons/ten_cards.webp",    rarity: "UC",  threshold: 10,   field: "totalCardsReviewed", nameKey: "ACH_TEN_CARDS_NAME",    descKey: "ACH_TEN_CARDS_DESC"    },
  { id: "fifty_cards",  icon: "assets/icons/fifty_cards.webp",  rarity: "R",   threshold: 50,   field: "totalCardsReviewed", nameKey: "ACH_FIFTY_CARDS_NAME",  descKey: "ACH_FIFTY_CARDS_DESC"  },
  { id: "century",      icon: "assets/icons/century.webp",      rarity: "R",   threshold: 100,  field: "totalCardsReviewed", nameKey: "ACH_CENTURY_NAME",      descKey: "ACH_CENTURY_DESC"      },
  { id: "five_hundred", icon: "assets/icons/five_hundred.webp", rarity: "LEG", threshold: 500,  field: "totalCardsReviewed", nameKey: "ACH_FIVE_HUNDRED_NAME", descKey: "ACH_FIVE_HUNDRED_DESC" },
  { id: "one_thousand", icon: "assets/icons/one_thousand.webp", rarity: "LEG", threshold: 1000, field: "totalCardsReviewed", nameKey: "ACH_ONE_THOUSAND_NAME", descKey: "ACH_ONE_THOUSAND_DESC" },
  { id: "two_thousand", icon: "assets/icons/two_thousand.webp", rarity: "LEG", threshold: 2000, field: "totalCardsReviewed", nameKey: "ACH_TWO_THOUSAND_NAME", descKey: "ACH_TWO_THOUSAND_DESC" },
  { id: "streak_3",     icon: "assets/icons/streak_3.webp",     rarity: "UC",  threshold: 3,    field: "longestStreak",      nameKey: "ACH_STREAK_3_NAME",    descKey: "ACH_STREAK_3_DESC"     },
  { id: "streak_7",     icon: "assets/icons/streak_7.webp",     rarity: "R",   threshold: 7,    field: "longestStreak",      nameKey: "ACH_STREAK_7_NAME",    descKey: "ACH_STREAK_7_DESC"     },
  { id: "streak_30",    icon: "assets/icons/streak_30.webp",    rarity: "LEG", threshold: 30,   field: "longestStreak",      nameKey: "ACH_STREAK_30_NAME",   descKey: "ACH_STREAK_30_DESC"    },
  { id: "daily_20",     icon: "assets/icons/daily_20.webp",     rarity: "UC",  threshold: 20,   field: "maxDaily",           nameKey: "ACH_DAILY_20_NAME",    descKey: "ACH_DAILY_20_DESC"     },
  { id: "daily_50",     icon: "assets/icons/daily_50.webp",     rarity: "R",   threshold: 50,   field: "maxDaily",           nameKey: "ACH_DAILY_50_NAME",    descKey: "ACH_DAILY_50_DESC"     },
  { id: "daily_80",     icon: "assets/icons/daily_80.webp",     rarity: "LEG", threshold: 80,   field: "maxDaily",           nameKey: "ACH_DAILY_80_NAME",    descKey: "ACH_DAILY_80_DESC"     },
  { id: "daily_100",    icon: "assets/icons/daily_100.webp",    rarity: "LEG", threshold: 100,  field: "maxDaily",           nameKey: "ACH_DAILY_100_NAME",   descKey: "ACH_DAILY_100_DESC"    },
  { id: "daily_150",    icon: "assets/icons/daily_150.webp",    rarity: "LEG", threshold: 150,  field: "maxDaily",           nameKey: "ACH_DAILY_150_NAME",   descKey: "ACH_DAILY_150_DESC"    },
  { id: "daily_200",    icon: "assets/icons/daily_200.webp",    rarity: "LEG", threshold: 200,  field: "maxDaily",           nameKey: "ACH_DAILY_200_NAME",   descKey: "ACH_DAILY_200_DESC"    },
  { id: "master_50",    icon: "assets/icons/master_50.webp",    rarity: "LEG", threshold: 50,   field: "masteredCards",      nameKey: "ACH_MASTER_50_NAME",   descKey: "ACH_MASTER_50_DESC"    },
  // --- New 12 ---
  { id: "four_thousand",    icon: "assets/icons/four_thousand.webp",    rarity: "LEG", threshold: 4000,  field: "totalCardsReviewed", nameKey: "ACH_FOUR_THOUSAND_NAME",    descKey: "ACH_FOUR_THOUSAND_DESC"    },
  { id: "ten_thousand",     icon: "assets/icons/ten_thousand.webp",     rarity: "LEG", threshold: 10000, field: "totalCardsReviewed", nameKey: "ACH_TEN_THOUSAND_NAME",     descKey: "ACH_TEN_THOUSAND_DESC"     },
  { id: "streak_100",       icon: "assets/icons/streak_100.webp",       rarity: "LEG", threshold: 100,   field: "longestStreak",      nameKey: "ACH_STREAK_100_NAME",       descKey: "ACH_STREAK_100_DESC"       },
  { id: "streak_365",       icon: "assets/icons/streak_365.webp",       rarity: "LEG", threshold: 365,   field: "longestStreak",      nameKey: "ACH_STREAK_365_NAME",       descKey: "ACH_STREAK_365_DESC"       },

  { id: "master_200",       icon: "assets/icons/master_200.webp",       rarity: "LEG", threshold: 200,   field: "masteredCards",      nameKey: "ACH_MASTER_200_NAME",       descKey: "ACH_MASTER_200_DESC"       },
  { id: "synapse_awaken",   icon: "assets/icons/synapse_awaken.webp",   rarity: "R",   threshold: 10,    field: "masteredCards",      nameKey: "ACH_SYNAPSE_AWAKEN_NAME",   descKey: "ACH_SYNAPSE_AWAKEN_DESC"    },
  { id: "synapse_network",  icon: "assets/icons/synapse_network.webp",  rarity: "LEG", threshold: 300,   field: "masteredCards",      nameKey: "ACH_SYNAPSE_NETWORK_NAME",  descKey: "ACH_SYNAPSE_NETWORK_DESC"   },
  { id: "first_memory_map", icon: "assets/icons/first_memory_map.webp", rarity: "R",   threshold: 1,     field: "memoryMapCount",     nameKey: "ACH_FIRST_MEMORY_MAP_NAME", descKey: "ACH_FIRST_MEMORY_MAP_DESC" },
  { id: "first_quest_map",  icon: "assets/icons/first_quest_map.webp",  rarity: "R",   threshold: 1,     field: "questMapCount",      nameKey: "ACH_FIRST_QUEST_MAP_NAME",  descKey: "ACH_FIRST_QUEST_MAP_DESC"  },
  { id: "quest_cleared",    icon: "assets/icons/quest_cleared.webp",    rarity: "LEG", threshold: 1,     field: "clearedQuestCount",  nameKey: "ACH_QUEST_CLEARED_NAME",    descKey: "ACH_QUEST_CLEARED_DESC"    },
  { id: "multiple_decks",   icon: "assets/icons/multiple_decks.webp",   rarity: "R",   threshold: 3,     field: "deckCount",          nameKey: "ACH_MULTIPLE_DECKS_NAME",   descKey: "ACH_MULTIPLE_DECKS_DESC"   },
  { id: "perfect_session",  icon: "assets/icons/perfect_session.webp",  rarity: "LEG", threshold: 1,     field: "perfectSessions",    nameKey: "ACH_PERFECT_SESSION_NAME",  descKey: "ACH_PERFECT_SESSION_DESC"  },
  { id: "hundred_again",    icon: "assets/icons/hundred_again.webp",    rarity: "R",   threshold: 100,   field: "totalAgainCount",    nameKey: "ACH_HUNDRED_AGAIN_NAME",    descKey: "ACH_HUNDRED_AGAIN_DESC"    },
  { id: "first_lesson",     icon: "assets/icons/first_lesson.webp",     rarity: "UC",  threshold: 1,     field: "completedLessons",   nameKey: "ACH_FIRST_LESSON_NAME",     descKey: "ACH_FIRST_LESSON_DESC"     },
  { id: "course_finisher",  icon: "assets/icons/course_finisher.webp",  rarity: "R",   threshold: 1,     field: "completedCourses",   nameKey: "ACH_COURSE_FINISHER_NAME",  descKey: "ACH_COURSE_FINISHER_DESC"  },
  { id: "lesson_marathon",  icon: "assets/icons/lesson_marathon.webp",  rarity: "R",   threshold: 10,    field: "completedLessons",   nameKey: "ACH_LESSON_MARATHON_NAME",  descKey: "ACH_LESSON_MARATHON_DESC"  },
  { id: "first_quest_step", icon: "assets/icons/first_quest_step.webp", rarity: "UC",  threshold: 1,     field: "completedQuestNodes", nameKey: "ACH_FIRST_QUEST_STEP_NAME", descKey: "ACH_FIRST_QUEST_STEP_DESC" },
  { id: "quest_veteran",    icon: "assets/icons/quest_veteran.webp",    rarity: "R",   threshold: 10,    field: "completedQuestNodes", nameKey: "ACH_QUEST_VETERAN_NAME",    descKey: "ACH_QUEST_VETERAN_DESC"    },
];

const RARITY_DARK = {
  UC:  { badge: "#9ca3af", bg: "linear-gradient(145deg,#2d3748,#1a202c)",    glow: "rgba(156,163,175,0.4)", ring: "rgba(156,163,175,0.15)" },
  R:   { badge: "#60a5fa", bg: "linear-gradient(145deg,#1a2f5e,#1e3a8a)",    glow: "rgba(96,165,250,0.6)",  ring: "rgba(96,165,250,0.18)"  },
  LEG: { badge: "#f59e0b", bg: "linear-gradient(145deg,#1c1a0f,#2d2000)",    glow: "rgba(245,158,11,0.8)",  ring: "rgba(245,158,11,0.22)"  },
};
const RARITY_LIGHT = {
  UC:  { badge: "#6b7280", bg: "linear-gradient(145deg,#f8fafc,#f1f5f9)",    glow: "rgba(156,163,175,0.25)", ring: "rgba(156,163,175,0.1)"  },
  R:   { badge: "#3b82f6", bg: "linear-gradient(145deg,#eff6ff,#dbeafe)",    glow: "rgba(59,130,246,0.3)",   ring: "rgba(59,130,246,0.12)"  },
  LEG: { badge: "#d97706", bg: "linear-gradient(145deg,#fffbeb,#fef3c7)",    glow: "rgba(245,158,11,0.4)",   ring: "rgba(245,158,11,0.15)"  },
};
// Icons whose artwork is round rather than a rounded square.
const ROUND_ICONS = new Set(["fifty_cards"]);

function periodStats(dailyLog, days, today = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  const counts = dates.map(date => dailyLog[date] || 0);
  const studyDays = counts.filter(n => n > 0).length;
  const total = counts.reduce((a, b) => a + b, 0);
  return { dates, counts, studyDays, total, avgActive: studyDays > 0 ? (total / studyDays).toFixed(1) : "0" };
}

function renderActivity(panel, dailyLog, t, days) {
  panel.empty();
  const { dates, counts, studyDays, total, avgActive } = periodStats(dailyLog, days);
  const head = panel.createEl("div", { cls: "lh-ach-head" });
  head.createEl("span", { cls: "lh-pnl-t", text: c(t, "ACH_ACTIVITY") });
  ui.segmented(head, [7, 30, 90].map(value => ({ value, label: c(t, `ACH_PERIOD_${value}`) })), days, v => renderActivity(panel, dailyLog, t, v), "lh-seg-s");
  const stats = head.createEl("div", { cls: "lh-acs" });
  [
    { label: c(t, "ACH_PERIOD_REVIEWS"), value: String(total) },
    { label: c(t, "ACH_STUDY_DAYS"), value: String(studyDays), title: `${studyDays}/${days} (${Math.round(studyDays / days * 100)}%)` },
    { label: c(t, "ACH_DAILY_AVG"), value: `${avgActive} ${c(t, "ACH_PER_DAY")}` },
  ].forEach(({ label, value, title }) => {
    const item = stats.createEl("span", { text: `${label} `, attr: title ? { title } : {} });
    item.createEl("b", { text: value });
  });
  const bars = panel.createEl("div", { cls: "lh-bars" + (days === 90 ? " dense" : "") });
  const max = Math.max(...counts, 1);
  counts.forEach((n, i) => {
    bars.createEl("i", { cls: n ? "" : "zero", attr: { style: `height:${n / max * 100}%`, title: `${dates[i]}: ${n}` } });
  });
}

function addAchievementIcon(parent, plugin, ach) {
  const { adapter } = plugin.app.vault;
  const src = adapter.getResourcePath ? adapter.getResourcePath(`${plugin.app.vault.configDir}/plugins/engram-quest/${ach.icon}`) : ach.icon;
  const img = parent.createEl("img", { attr: { src, alt: "" } });
  img.onerror = () => { img.remove(); ui.icon(parent.createEl("span", { cls: "lh-gi" }), "medal"); };
}

function achievementClass(ach, isUnlocked) {
  return (ROUND_ICONS.has(ach.id) ? " round" : "") + (isUnlocked ? "" : " off");
}

function openAchievementDetail(plugin, ach, val) {
  const t = plugin.settings;
  const isUnlocked = val >= ach.threshold;
  const modal = ui.themedModal(new I.Modal(plugin.app));
  modal.modalEl.addClass("lh-ach-modal");
  const el = modal.contentEl;
  el.createEl("div", { cls: "lh-ach-rar", text: ach.rarity });
  addAchievementIcon(el.createEl("div", { cls: "lh-ach-img" + achievementClass(ach, isUnlocked) }), plugin, ach);
  el.createEl("div", { cls: "lh-confirm-title", text: c(t, ach.nameKey) });
  el.createEl("div", { cls: "lh-confirm-body", text: c(t, ach.descKey) });
  const row = el.createEl("div", { cls: "lh-qpt lh-ach-prog" });
  row.createEl("span", { text: isUnlocked ? `✓ ${c(t, "ACH_UNLOCKED")}` : c(t, "ACH_PROGRESS"), cls: isUnlocked ? "tm" : "" });
  row.createEl("span", { text: `${val} / ${ach.threshold}` });
  ui.track(el, Math.min(1, val / ach.threshold) * 100, isUnlocked);
  modal.open();
}

function buildAchievementEvalCtx(st = {}, decks = [], quests = [], memories = [], courses = []) {
  let masteredTotal = 0;
  const counts = { mastered: 0, learning: 0, due: 0, unseen: 0, total: 0 };
  for (const deck of decks) {
    for (const card of deck.cards || []) {
      const cst = getReviewStatus(card.srMeta);
      counts[cst] = (counts[cst] || 0) + 1;
      counts.total++;
    }
    masteredTotal += (deck.cards || []).filter(cd => cd.srMeta && (cd.srMeta.stability ?? 0) >= 21).length;
  }

  let maxDaily = 0;
  const dailyLog = st.dailyReviewLog || {};
  const logVals = Object.values(dailyLog);
  if (logVals.length > 0) maxDaily = Math.max(...logVals);

  let completedLessons = 0;
  let completedCourses = 0;
  for (const course of courses || []) {
    const meta = course && course.meta;
    if (!meta) continue;
    const progress = courseProgress(meta);
    completedLessons += progress.completed || 0;
    if (progress.total > 0 && progress.completed >= progress.total) completedCourses++;
  }

  const completedQuestNodes = (quests || []).reduce((sum, q) => {
    if (Number.isFinite(q && q.completedCount)) return sum + q.completedCount;
    if (Array.isArray(q && q.nodes)) return sum + q.nodes.filter(node => node && node.completed).length;
    return sum;
  }, 0);

  return {
    evalCtx: {
      totalCardsReviewed: st.totalCardsReviewed || 0,
      longestStreak: st.longestStreak || 0,
      maxDaily,
      masteredCards: masteredTotal,
      memoryMapCount: memories.length,
      questMapCount: quests.length,
      clearedQuestCount: quests.filter(q => q.completed).length,
      deckCount: decks.length,
      perfectSessions: st.perfectSessions || 0,
      totalAgainCount: st.totalAgainCount || 0,
      completedLessons,
      completedCourses,
      completedQuestNodes,
    },
    counts,
    dailyLog,
    maxDaily,
    totalReviewed: st.totalCardsReviewed || 0,
    currentStreak: st.currentStreak || 0,
  };
}

async function renderAchievementTab(containerEl, plugin, decks, quests = [], memories = [], courses = null) {
  if (!courses) {
    try {
      courses = await listCourses(plugin.app.vault.adapter);
    } catch (e) {
      console.warn("EngramQuest: lesson achievements scan failed", e);
      courses = [];
    }
  }
  const t = plugin.settings;
  const { evalCtx, counts, dailyLog, totalReviewed, currentStreak } =
    buildAchievementEvalCtx(t._stats || {}, decks, quests, memories, courses);

  if (!ui.isPhone()) ui.pageHeader(containerEl, { app: plugin.app, plugin }, { titleKey: "TAB_ACHIEVEMENT", guide: "achievement" });
  ui.metrics(containerEl, [
    { value: totalReviewed, label: c(t, "ACH_TOTAL_REVIEWED") },
    { value: counts.mastered, label: c(t, "ACH_MASTERED") },
    { value: counts.total, label: c(t, "TOTAL") },
    { value: `${currentStreak}d`, label: c(t, "ACH_STREAK") },
  ]);

  const scroll = containerEl.createEl("div", { cls: "lh-scroll" });
  const charts = scroll.createEl("div", { cls: "lh-ach-charts" });
  const familiarity = charts.createEl("div", { cls: "lh-pnl lh-ach-fam" });
  const states = [
    { key: "ACH_MASTERED", n: counts.mastered, color: "mst", tone: "tm" },
    { key: "ACH_LEARNING", n: counts.learning, color: "lrn", tone: "tl" },
    { key: "ACH_DUE", n: counts.due, color: "due", tone: "td" },
    { key: "ACH_UNSEEN", n: counts.unseen, color: "uns" },
  ];
  const pctOf = n => (counts.total > 0 ? n / counts.total * 100 : 0);
  ui.donut(familiarity, states.map(({ n, color }) => ({ pct: pctOf(n), color })), { size: 104, stroke: 14, gap: 2.6 }).createEl("b", { text: String(counts.total) });
  const rows = familiarity.createEl("div", { cls: "lh-grow" });
  states.forEach(({ key, n, tone }) => {
    const row = rows.createEl("div", { cls: "lh-rw" });
    row.createEl("span", { text: c(t, key), cls: tone && n > 0 ? tone : "" });
    row.createEl("b", { text: `${n} (${Math.round(pctOf(n))}%)` });
  });
  renderActivity(charts.createEl("div", { cls: "lh-pnl lh-ach-act" }), dailyLog, t, 30);

  const head = scroll.createEl("div", { cls: "lh-ach-coll" });
  head.createEl("span", { cls: "lh-pnl-t", text: c(t, "ACH_COLLECTION") });
  head.createEl("span", { cls: "lh-count", text: `${ACHIEVEMENTS.filter(a => (evalCtx[a.field] || 0) >= a.threshold).length} / ${ACHIEVEMENTS.length}` });
  const grid = scroll.createEl("div", { cls: "lh-acg" });
  ACHIEVEMENTS.forEach((ach) => {
    const val = evalCtx[ach.field] || 0;
    const isUnlocked = val >= ach.threshold;
    const card = grid.createEl("div", { cls: "lh-ac" + achievementClass(ach, isUnlocked), attr: { role: "button", tabindex: "0" } });
    card.createEl("span", { cls: "lh-ach-rar", text: ach.rarity });
    addAchievementIcon(card, plugin, ach);
    card.createEl("b", { text: c(t, ach.nameKey) });
    card.createEl("small", { text: c(t, ach.descKey) });
    card.createEl("small", { cls: isUnlocked ? "tm" : "", text: isUnlocked ? `✓ ${c(t, "ACH_UNLOCKED")}` : `${val} / ${ach.threshold}` });
    card.addEventListener("click", () => openAchievementDetail(plugin, ach, val));
    card.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openAchievementDetail(plugin, ach, val); } });
  });
}

module.exports = { renderAchievementTab, buildAchievementEvalCtx, periodStats, ACHIEVEMENTS, RARITY_DARK, RARITY_LIGHT };
