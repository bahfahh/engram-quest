"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { getReviewStatus } = require("../review/helpers");

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
  { id: "first_memory_map", icon: "assets/icons/first_memory_map.webp", rarity: "R",   threshold: 1,     field: "memoryMapCount",     nameKey: "ACH_FIRST_MEMORY_MAP_NAME", descKey: "ACH_FIRST_MEMORY_MAP_DESC" },
  { id: "first_quest_map",  icon: "assets/icons/first_quest_map.webp",  rarity: "R",   threshold: 1,     field: "questMapCount",      nameKey: "ACH_FIRST_QUEST_MAP_NAME",  descKey: "ACH_FIRST_QUEST_MAP_DESC"  },
  { id: "quest_cleared",    icon: "assets/icons/quest_cleared.webp",    rarity: "LEG", threshold: 1,     field: "clearedQuestCount",  nameKey: "ACH_QUEST_CLEARED_NAME",    descKey: "ACH_QUEST_CLEARED_DESC"    },
  { id: "multiple_decks",   icon: "assets/icons/multiple_decks.webp",   rarity: "R",   threshold: 3,     field: "deckCount",          nameKey: "ACH_MULTIPLE_DECKS_NAME",   descKey: "ACH_MULTIPLE_DECKS_DESC"   },
  { id: "perfect_session",  icon: "assets/icons/perfect_session.webp",  rarity: "LEG", threshold: 1,     field: "perfectSessions",    nameKey: "ACH_PERFECT_SESSION_NAME",  descKey: "ACH_PERFECT_SESSION_DESC"  },
  { id: "hundred_again",    icon: "assets/icons/hundred_again.webp",    rarity: "R",   threshold: 100,   field: "totalAgainCount",    nameKey: "ACH_HUNDRED_AGAIN_NAME",    descKey: "ACH_HUNDRED_AGAIN_DESC"    },
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
const RARITY = RARITY_DARK;

function buildDonutSvg(counts, isDark) {
  const total = counts.mastered + counts.learning + counts.due + counts.unseen;
  const emptyStroke = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const textPrimary = isDark ? "#e2e8f0" : "#1f2937";
  const textMuted   = isDark ? "#94a3b8"  : "#6b7280";
  if (total === 0) {
    return `<svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="52" fill="none" stroke="${emptyStroke}" stroke-width="24"/><text x="70" y="75" text-anchor="middle" font-size="11" fill="${textMuted}">0 cards</text></svg>`;
  }
  const cx = 70, cy = 70, oR = 52, iR = 30;
  const segs = [
    { n: counts.mastered, c: "#22c55e" },
    { n: counts.learning, c: "#f59e0b" },
    { n: counts.due,      c: "#ef4444" },
    { n: counts.unseen,   c: "#94a3b8" },
  ];
  let paths = "", angle = -Math.PI / 2;
  for (const s of segs) {
    if (!s.n) continue;
    const sw = s.n / total * 2 * Math.PI;
    const ea = angle + sw, la = sw > Math.PI ? 1 : 0;
    const f = n => n.toFixed(2);
    paths += `<path d="M${f(cx+oR*Math.cos(angle))} ${f(cy+oR*Math.sin(angle))} A${oR} ${oR} 0 ${la} 1 ${f(cx+oR*Math.cos(ea))} ${f(cy+oR*Math.sin(ea))} L${f(cx+iR*Math.cos(ea))} ${f(cy+iR*Math.sin(ea))} A${iR} ${iR} 0 ${la} 0 ${f(cx+iR*Math.cos(angle))} ${f(cy+iR*Math.sin(angle))} Z" fill="${s.c}"/>`;
    angle = ea;
  }
  const pct = Math.round(counts.mastered / total * 100);
  return `<svg width="140" height="140" viewBox="0 0 140 140">${paths}<text x="70" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="${textPrimary}">${pct}%</text><text x="70" y="82" text-anchor="middle" font-size="9" fill="${textMuted}" font-weight="700">MASTERED</text></svg>`;
}

function buildActivitySvg(dailyLog, days, isDark) {
  const pad = n => String(n).padStart(2, "0");
  const toStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = new Date();
  const todayStr = toStr(today);

  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(toStr(d));
  }

  const counts = dates.map(ds => dailyLog[ds] || 0);
  const maxCount = Math.max(...counts, 1);
  const studyDays = counts.filter(n => n > 0).length;
  const total = counts.reduce((a, b) => a + b, 0);
  const avgActive = studyDays > 0 ? (total / studyDays).toFixed(1) : 0;

  const W = 520, H = 140, padL = 28, padR = 4, padT = 6, padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(2, chartW / days - 1.2);
  const step = (chartW - barW) / Math.max(days - 1, 1);

  let bars = "";
  dates.forEach((ds, i) => {
    const x = (padL + i * step).toFixed(1);
    const n = counts[i];
    const h = n > 0 ? Math.max(3, (n / maxCount) * chartH) : 2;
    const y = (padT + chartH - h).toFixed(1);
    const isToday = ds === todayStr;
    const fill = isToday ? "#818cf8" : n > 0 ? "#6366f1" : (isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb");
    const op = n > 0 ? "1" : "0.6";
    bars += `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" rx="2" opacity="${op}"/>`;
  });

  // x-axis labels
  const labelStep = days <= 7 ? 1 : days <= 30 ? 7 : 14;
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let xLabels = "";
  dates.forEach((ds, i) => {
    if (i % labelStep !== 0 && i !== days - 1) return;
    const x = (padL + i * step + barW / 2).toFixed(1);
    const d = new Date(ds);
    const label = days <= 7 ? DOW[d.getDay()] : `${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
    xLabels += `<text x="${x}" y="${H - 2}" text-anchor="middle" font-size="7.5" fill="#9ca3af">${label}</text>`;
  });

  // y-axis max label
  const yLabel = `<text x="${padL - 3}" y="${padT + 8}" text-anchor="end" font-size="7.5" fill="#9ca3af">${maxCount}</text>`;
  const baseline = `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="${isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"}" stroke-width="1"/>`;

  return {
    svg: `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}">${baseline}${bars}${yLabel}${xLabels}</svg>`,
    studyDays, total, avgActive, days,
  };
}

function renderActivitySection(container, dailyLog, t, activePeriod, globalTotal, isDark) {
  container.empty();
  const cardBg   = isDark ? "#252538" : "#f8faff";
  const border   = isDark ? "#3a3a5a" : "#e5e7eb";
  const textMain = isDark ? "#e2e8f0" : "#374151";

  // Header + toggle row
  const hdr = container.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;" } });
  hdr.createEl("span", { text: c(t, "ACH_ACTIVITY"), attr: { style: `font-size:13px;font-weight:700;color:${textMain};` } });

  const toggleWrap = hdr.createEl("div", { attr: { style: "display:flex;gap:4px;" } });
  const periods = [
    { days: 7,  label: c(t, "ACH_PERIOD_7")  },
    { days: 30, label: c(t, "ACH_PERIOD_30") },
    { days: 90, label: c(t, "ACH_PERIOD_90") },
  ];
  periods.forEach(p => {
    const isActive = p.days === activePeriod;
    const btnBg  = isActive ? (isDark ? "#3730a3" : "#eef2ff") : (isDark ? "#2a2a3e" : "#fff");
    const btnClr = isActive ? "#818cf8" : (isDark ? "#94a3b8" : "#6b7280");
    const btnBdr = isActive ? "#6366f1" : border;
    const btn = toggleWrap.createEl("button", {
      text: p.label,
      attr: { style: `padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid ${btnBdr};background:${btnBg};color:${btnClr};` },
    });
    btn.addEventListener("click", () => renderActivitySection(container, dailyLog, t, p.days, globalTotal, isDark));
  });

  // Chart
  const { svg, studyDays, total, avgActive, days } = buildActivitySvg(dailyLog, activePeriod, isDark);
  const chartBox = container.createEl("div", { attr: { class: "lh-ach-chart-box", style: `background:${cardBg};border:1.5px solid ${border};border-radius:12px;padding:10px 12px 6px;margin-bottom:10px;` } });
  chartBox.appendChild(I.sanitizeHTMLToDom(svg));

  // Stats row
  const statsPct = Math.round(studyDays / days * 100);
  const statsRow = container.createEl("div", { attr: { class: "lh-ach-stats-row", style: "display:flex;gap:8px;" } });
  [
    { label: c(t, "ACH_STUDY_DAYS"), val: `${studyDays}/${days}`, sub: `${statsPct}%` },
    { label: c(t, "ACH_PERIOD_REVIEWS"), val: String(total), sub: "" },
    { label: c(t, "ACH_DAILY_AVG"), val: String(avgActive), sub: c(t, "ACH_PER_DAY") },
  ].forEach(s => {
    const box = statsRow.createEl("div", { attr: { style: `flex:1;padding:8px 10px;border-radius:10px;background:${cardBg};border:1.5px solid ${border};text-align:center;` } });
    box.createEl("div", { text: s.val, attr: { style: `font-size:16px;font-weight:900;color:${textMain};line-height:1.1;` } });
    if (s.sub) box.createEl("div", { text: s.sub, attr: { style: "font-size:9px;color:#818cf8;font-weight:700;" } });
    box.createEl("div", { text: s.label, attr: { style: "font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-top:2px;" } });
  });
}

function openAchievementDetail(app, plugin, ach, val, settings, decks, quests, memories) {
  const t = settings;
  const isUnlocked = val >= ach.threshold;
  const progress = Math.min(1, val / ach.threshold);
  const isDark = document.body.classList.contains("theme-dark");
  const rs = (isDark ? RARITY_DARK : RARITY_LIGHT)[ach.rarity] || RARITY_DARK.UC;
  const rarityColors = { UC: "#6b7280", R: "#3b82f6", LEG: "#d97706" };

  // Theme tokens
  const modalBg      = isDark ? "#0f111a" : "#ffffff";
  const textPrimary  = isDark ? "#fff"    : "#1e293b";
  const textSecondary= isDark ? "rgba(255,255,255,0.6)" : "#64748b";
  const textProgress = isDark ? "rgba(255,255,255,0.7)" : "#374151";
  const borderHero   = isDark ? "rgba(255,255,255,0.08)": "#e5e7eb";
  const barBgColor   = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const lockedFilter = isDark ? "filter:grayscale(1) brightness(0.4);" : "filter:grayscale(1) brightness(0.7) opacity(0.5);";

  const modal = new I.Modal(app);
  modal.modalEl.style.cssText = `width:min(92vw,480px);padding:0;border-radius:20px;overflow:hidden;background:${modalBg};`;
  const el = modal.contentEl;
  el.style.cssText = `padding:0;background:${modalBg};color:${textPrimary};`;

  // ── Header hero ──
  const hero = el.createEl("div", { attr: { style: `background:${rs.bg};padding:28px 24px 20px;text-align:center;position:relative;border-bottom:1px solid ${borderHero};` } });
  // Rarity badge
  hero.createEl("div", { text: ach.rarity, attr: { style: `display:inline-block;background:${rarityColors[ach.rarity]};color:#fff;font-size:10px;font-weight:800;padding:2px 10px;border-radius:99px;letter-spacing:.06em;margin-bottom:12px;` } });
  // Icon
  const iconWrap = hero.createEl("div", { attr: { style: "position:relative;display:inline-block;margin-bottom:12px;" } });
  if (isUnlocked) {
    iconWrap.createEl("div", { attr: { style: `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,${rs.ring} 0%,transparent 70%);box-shadow:0 0 30px ${rs.glow};pointer-events:none;` } });
  }
  const iconSrc = plugin.app.vault.adapter.getResourcePath
    ? plugin.app.vault.adapter.getResourcePath(plugin.app.vault.configDir + "/plugins/engram-quest/" + ach.icon)
    : ach.icon;
  const img = iconWrap.createEl("img", { attr: { src: iconSrc, width: "96", height: "96", style: `object-fit:contain;display:block;position:relative;z-index:1;${isUnlocked ? "" : lockedFilter}` } });
  img.onerror = () => { iconWrap.empty(); iconWrap.createEl("div", { text: "🏆", attr: { style: "font-size:64px;line-height:1;" } }); };
  hero.createEl("div", { text: c(t, ach.nameKey), attr: { style: `font-size:18px;font-weight:800;color:${textPrimary};margin-bottom:4px;` } });
  hero.createEl("div", { text: c(t, ach.descKey), attr: { style: `font-size:12px;color:${textSecondary};line-height:1.5;` } });

  // ── Progress ──
  const progSec = el.createEl("div", { attr: { style: "padding:16px 20px 0;" } });
  const progRow = progSec.createEl("div", { attr: { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;" } });
  progRow.createEl("span", { text: isUnlocked ? "✓ Unlocked" : "Progress", attr: { style: `font-size:11px;font-weight:700;color:${isUnlocked ? rs.badge : "#9ca3af"};` } });
  progRow.createEl("span", { text: `${val} / ${ach.threshold}`, attr: { style: `font-size:12px;font-weight:700;color:${textProgress};` } });
  const barBg = progSec.createEl("div", { attr: { style: `height:6px;background:${barBgColor};border-radius:99px;overflow:hidden;margin-bottom:14px;` } });
  const barFill = barBg.createEl("div", { attr: { style: `height:100%;border-radius:99px;background:${rs.badge};width:0%;transition:width 0.6s ease;` } });
  setTimeout(() => { barFill.style.width = `${Math.round(progress * 100)}%`; }, 80);

  modal.open();
}

function renderAchievementTab(containerEl, plugin, decks, quests=[], memories=[]) {
  const t = plugin.settings;
  const st = t._stats || {};
  const isDark = document.body.classList.contains("theme-dark");
  const cardBg   = isDark ? "#252538" : "#f8faff";
  const border   = isDark ? "#3a3a5a" : "#e5e7eb";
  const divider  = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const textMain = isDark ? "#e2e8f0" : "#374151";

  const textMuted= isDark ? "#94a3b8"  : "#9ca3af";

  let masteredTotal = 0;
  const counts = { mastered: 0, learning: 0, due: 0, unseen: 0, total: 0 };
  for (const deck of decks) {
    for (const card of deck.cards) {
      const cst = getReviewStatus(card.srMeta);
      counts[cst] = (counts[cst] || 0) + 1;
      counts.total++;
    }
    masteredTotal += deck.cards.filter(cd => cd.srMeta && (cd.srMeta.stability ?? 0) >= 21).length;
  }
  let maxDaily = 0;
  const dailyLog = st.dailyReviewLog || {};
  const logVals = Object.values(dailyLog);
  if(logVals.length > 0) {
    maxDaily = Math.max(...logVals);
  }
  const totalReviewed = st.totalCardsReviewed || 0;
  const currentStreak = st.currentStreak || 0;

  let evalCtx = {
    totalCardsReviewed: totalReviewed,
    longestStreak: st.longestStreak || 0,
    maxDaily: maxDaily,
    masteredCards: masteredTotal,
    memoryMapCount: memories.length,
    questMapCount: quests.length,
    clearedQuestCount: quests.filter(q => q.completed).length,
    deckCount: decks.length,
    perfectSessions: st.perfectSessions || 0,
    totalAgainCount: st.totalAgainCount || 0
  };

  const wrap = containerEl.createEl("div", { attr: { class: "lh-card", style: "margin-top:0;border-radius:0;flex:1;display:flex;flex-direction:column;overflow-y:auto;" } });

  // === Header ===
  const hdr = wrap.createEl("div", { attr: { class: "lh-card-header" } });
  hdr.createEl("span", { text: c(t, "TAB_ACHIEVEMENT"), attr: { class: "lh-card-title" } });

  // === Summary stats ===
  const sRow = wrap.createEl("div", { attr: { class: "lh-ach-stats-row", style: "display:flex;gap:10px;padding:0 20px 16px;flex-wrap:wrap;" } });
  [
    { label: c(t, "ACH_TOTAL_REVIEWED"), val: totalReviewed, color: "#6366f1" },
    { label: c(t, "ACH_MASTERED"),       val: counts.mastered, color: "#22c55e" },
    { label: c(t, "TOTAL"),              val: counts.total,    color: "#f59e0b" },
    { label: c(t, "ACH_STREAK"),         val: currentStreak + "d", color: "#ef4444" },
  ].forEach(s => {
    const b = sRow.createEl("div", { attr: { style: `flex:1;min-width:72px;padding:10px 12px;border-radius:12px;background:${cardBg};border:1.5px solid ${border};text-align:center;` } });
    b.createEl("div", { text: String(s.val), attr: { class: "lh-ach-stat-val", style: `font-size:22px;font-weight:900;color:${s.color};line-height:1.1;` } });
    b.createEl("div", { text: s.label, attr: { style: `font-size:9px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:.05em;margin-top:2px;` } });
  });

  // === Familiarity donut ===
  const chartSec = wrap.createEl("div", { attr: { class: "lh-ach-familiarity", style: `display:flex;align-items:center;gap:20px;padding:0 20px 20px;flex-wrap:wrap;border-bottom:1px solid ${divider};` } });
  const chartWrap = chartSec.createEl("div", { attr: { style: "flex-shrink:0;" } });
  chartWrap.appendChild(I.sanitizeHTMLToDom(buildDonutSvg(counts, isDark)));
  const legendWrap = chartSec.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:8px;flex:1;min-width:110px;" } });
  [
    { color: "#22c55e", key: "ACH_MASTERED", n: counts.mastered },
    { color: "#f59e0b", key: "ACH_LEARNING", n: counts.learning },
    { color: "#ef4444", key: "ACH_DUE",      n: counts.due },
    { color: "#94a3b8", key: "ACH_UNSEEN",   n: counts.unseen },
  ].forEach(item => {
    const pct = counts.total > 0 ? Math.round(item.n / counts.total * 100) : 0;
    const row = legendWrap.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;" } });
    row.createEl("div", { attr: { style: `width:10px;height:10px;border-radius:50%;background:${item.color};flex-shrink:0;` } });
    row.createEl("span", { text: c(t, item.key), attr: { style: `font-size:12px;color:${textMain};flex:1;` } });
    row.createEl("span", { text: `${item.n} (${pct}%)`, attr: { style: `font-size:11px;font-weight:700;color:${textMuted};` } });
  });

  // === Activity chart ===
  const actSec = wrap.createEl("div", { attr: { class: "lh-ach-activity", style: "padding:16px 20px 8px;" } });
  renderActivitySection(actSec, dailyLog, t, 30, totalReviewed, isDark);

  // === Achievement collection ===
  const achHdr = wrap.createEl("div", { attr: { style: `display:flex;align-items:center;gap:8px;padding:16px 20px 12px;border-top:1px solid ${divider};` } });
  achHdr.createEl("span", { text: c(t, "ACH_COLLECTION"), attr: { style: `font-size:14px;font-weight:700;color:${textMain};` } });
  const unlocked = ACHIEVEMENTS.filter(a => (evalCtx[a.field] || 0) >= a.threshold).length;
  achHdr.createEl("span", { text: `${unlocked} / ${ACHIEVEMENTS.length}`, attr: { class: "lh-card-count" } });

  // Achievement section wrapper — with optional dark BG image
  // NOTE: no overflow:hidden here — that would block parent wrap's scroll
  const achSection = wrap.createEl("div", { attr: { style: `padding:4px 20px 28px;margin:0;position:relative;background:${isDark ? "linear-gradient(180deg,#0c0c18 0%,#111827 100%)" : "#f1f5f9"};` } });
  if (isDark) {
    // Aurora background image at low opacity behind cards
    const _bgRes = plugin.app.vault.adapter.getResourcePath
      ? plugin.app.vault.adapter.getResourcePath(plugin.app.vault.configDir + "/plugins/engram-quest/bg_dark.webp")
      : "";
    if (_bgRes) {
      achSection.createEl("div", { attr: { style: `position:absolute;inset:0;background-image:url('${_bgRes}');background-size:cover;background-position:center 30%;opacity:0.13;pointer-events:none;z-index:0;border-radius:inherit;` } });
    }
    // Star pattern overlay
    achSection.createEl("div", { attr: { style: `position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='12' cy='18' r='1' fill='rgba(255,255,255,0.35)'/%3E%3Ccircle cx='55' cy='7' r='0.8' fill='rgba(255,255,255,0.25)'/%3E%3Ccircle cx='90' cy='32' r='1.2' fill='rgba(255,255,255,0.3)'/%3E%3Ccircle cx='140' cy='10' r='0.9' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='175' cy='45' r='1' fill='rgba(255,255,255,0.3)'/%3E%3Ccircle cx='30' cy='65' r='0.7' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='110' cy='55' r='1.1' fill='rgba(255,255,255,0.25)'/%3E%3Ccircle cx='160' cy='80' r='0.8' fill='rgba(255,255,255,0.3)'/%3E%3Ccircle cx='70' cy='95' r='1' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='190' cy='120' r='1.2' fill='rgba(255,255,255,0.25)'/%3E%3Ccircle cx='20' cy='140' r='0.9' fill='rgba(255,255,255,0.3)'/%3E%3Ccircle cx='130' cy='150' r='1' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='80' cy='170' r='0.8' fill='rgba(255,255,255,0.25)'/%3E%3Ccircle cx='50' cy='185' r='1.1' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='170' cy='175' r='0.7' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.5;` } });
  }

  const grid = achSection.createEl("div", { attr: { class: "lh-ach-grid", style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;padding-top:8px;position:relative;z-index:1;" } });
  for (const ach of ACHIEVEMENTS) {
    const val = evalCtx[ach.field] || 0;
    const isUnlocked = val >= ach.threshold;
    const progress = Math.min(1, val / ach.threshold);
    const rs = isDark ? RARITY_DARK[ach.rarity] : RARITY_LIGHT[ach.rarity];
    const cardTextColor = isDark ? "#fff" : "#1e293b";
    const cardDescColor = isDark ? "rgba(255,255,255,0.55)" : "#64748b";
    const cardBarBg     = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
    const cardStatusColor = isDark
      ? (isUnlocked ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)")
      : (isUnlocked ? "#374151" : "#94a3b8");
    const rarityClass = isUnlocked ? ` lh-ach-${ach.rarity.toLowerCase()}` : "";
    const card = grid.createEl("div", { attr: { class: "lh-ach-card" + (isUnlocked ? " unlocked" : "") + rarityClass } });
    if (isUnlocked) {
      card.style.cssText = `background:${rs.bg};box-shadow:0 0 20px ${rs.glow},0 6px 16px rgba(0,0,0,${isDark ? "0.5" : "0.12"});cursor:pointer;`;
    } else {
      card.style.cssText = isDark
        ? `background:linear-gradient(145deg,#1e2433,#151b27);border:1.5px solid rgba(75,85,99,0.5);opacity:0.5;cursor:pointer;`
        : `background:#e2e8f0;border:1.5px solid #cbd5e1;opacity:0.6;cursor:pointer;`;
    }

    card.addEventListener("click", () => openAchievementDetail(plugin.app, plugin, ach, val, t, decks, quests, memories));

    const rarityColors = { UC: "#6b7280", R: "#3b82f6", LEG: "#d97706" };
    card.createEl("div", { text: ach.rarity, attr: { style: `z-index:10;background:${rarityColors[ach.rarity]};color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;position:absolute;top:8px;right:8px;letter-spacing:.04em;box-shadow:0 1px 4px rgba(0,0,0,0.4);` } });

    // Image icon with rarity glow ring behind it
    const iconWrap = card.createEl("div", { attr: { style: "text-align:center;margin:14px 0 6px;position:relative;" } });
    if (isUnlocked) {
      iconWrap.createEl("div", { attr: { style: `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:84px;height:84px;border-radius:50%;background:radial-gradient(circle,${rs.ring} 0%,transparent 70%);box-shadow:0 0 18px ${rs.glow};pointer-events:none;` } });
    }
    const iconSrc = plugin.app.vault.adapter.getResourcePath
      ? plugin.app.vault.adapter.getResourcePath(plugin.app.vault.configDir + "/plugins/engram-quest/" + ach.icon)
      : ach.icon;
    const lockedFilter = isDark ? "filter:grayscale(1) brightness(0.35);" : "filter:grayscale(1) brightness(0.7) opacity(0.5);";
    const img = iconWrap.createEl("img", { attr: { src: iconSrc, width: "88", height: "88", style: `object-fit:contain;display:block;margin:0 auto;position:relative;z-index:1;${isUnlocked ? "" : lockedFilter}` } });
    img.onerror = () => { iconWrap.empty(); iconWrap.setText(ach.id); };

    card.createEl("div", { text: c(t, ach.nameKey), attr: { style: `font-size:11px;font-weight:700;color:${cardTextColor};text-align:center;padding:0 6px;line-height:1.3;margin-bottom:4px;` } });
    card.createEl("div", { text: c(t, ach.descKey), attr: { style: `font-size:9px;color:${cardDescColor};text-align:center;padding:0 6px;line-height:1.4;margin-bottom:8px;` } });
    const barBg = card.createEl("div", { attr: { style: `height:3px;background:${cardBarBg};border-radius:99px;margin:0 8px 8px;overflow:hidden;` } });
    barBg.createEl("div", { attr: { style: `height:100%;border-radius:99px;background:${isUnlocked ? rs.badge : (isDark ? "#6b7280" : "#94a3b8")};width:${Math.round(progress * 100)}%;` } });
    card.createEl("div", {
      text: isUnlocked ? ("✓ " + c(t, "ACH_UNLOCKED")) : `${val} / ${ach.threshold}`,
      attr: { style: `font-size:9px;text-align:center;margin-bottom:10px;color:${cardStatusColor};font-weight:${isUnlocked ? "700" : "400"};` },
    });
  }
}

module.exports = { renderAchievementTab, openAchievementDetail, ACHIEVEMENTS, RARITY_DARK, RARITY_LIGHT };
