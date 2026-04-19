"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { getReviewStatus } = require("../review/helpers");

const ACHIEVEMENTS = [
  { id: "first_card",   icon: "🌱", rarity: "UC",  threshold: 1,   field: "totalCardsReviewed", nameKey: "ACH_FIRST_CARD_NAME",   descKey: "ACH_FIRST_CARD_DESC"   },
  { id: "ten_cards",    icon: "📖", rarity: "UC",  threshold: 10,  field: "totalCardsReviewed", nameKey: "ACH_TEN_CARDS_NAME",    descKey: "ACH_TEN_CARDS_DESC"    },
  { id: "fifty_cards",  icon: "🧠", rarity: "R",   threshold: 50,  field: "totalCardsReviewed", nameKey: "ACH_FIFTY_CARDS_NAME",  descKey: "ACH_FIFTY_CARDS_DESC"  },
  { id: "century",      icon: "⚡", rarity: "R",   threshold: 100, field: "totalCardsReviewed", nameKey: "ACH_CENTURY_NAME",      descKey: "ACH_CENTURY_DESC"      },
  { id: "five_hundred", icon: "🏆", rarity: "LEG", threshold: 500, field: "totalCardsReviewed", nameKey: "ACH_FIVE_HUNDRED_NAME", descKey: "ACH_FIVE_HUNDRED_DESC" },
  { id: "streak_3",     icon: "🔥", rarity: "UC",  threshold: 3,   field: "currentStreak",      nameKey: "ACH_STREAK_3_NAME",    descKey: "ACH_STREAK_3_DESC"     },
  { id: "streak_7",     icon: "📅", rarity: "R",   threshold: 7,   field: "currentStreak",      nameKey: "ACH_STREAK_7_NAME",    descKey: "ACH_STREAK_7_DESC"     },
  { id: "streak_30",    icon: "🌟", rarity: "LEG", threshold: 30,  field: "currentStreak",      nameKey: "ACH_STREAK_30_NAME",   descKey: "ACH_STREAK_30_DESC"    },
  { id: "daily_surge",  icon: "💥", rarity: "R",   threshold: 30,  field: "dailySurge",         nameKey: "ACH_DAILY_SURGE_NAME", descKey: "ACH_DAILY_SURGE_DESC"  },
  { id: "master_50",    icon: "👑", rarity: "LEG", threshold: 50,  field: "masteredCount",      nameKey: "ACH_MASTER_50_NAME",   descKey: "ACH_MASTER_50_DESC"    },
];

const RARITY = {
  UC:  { badge: "#9ca3af", bg: "linear-gradient(145deg,#374151,#1f2937)", glow: "rgba(156,163,175,0.5)" },
  R:   { badge: "#60a5fa", bg: "linear-gradient(145deg,#1e3a8a,#1e40af)", glow: "rgba(96,165,250,0.5)"  },
  LEG: { badge: "#f59e0b", bg: "linear-gradient(145deg,#78350f,#92400e)", glow: "rgba(245,158,11,0.7)"  },
};

function buildDonutSvg(counts) {
  const total = counts.mastered + counts.learning + counts.due + counts.unseen;
  if (total === 0) {
    return `<svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="52" fill="none" stroke="#e5e7eb" stroke-width="24"/><text x="70" y="75" text-anchor="middle" font-size="11" fill="#9ca3af">0 cards</text></svg>`;
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
  return `<svg width="140" height="140" viewBox="0 0 140 140">${paths}<text x="70" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="#1f2937">${pct}%</text><text x="70" y="82" text-anchor="middle" font-size="9" fill="#6b7280" font-weight="700">MASTERED</text></svg>`;
}

function renderAchievementTab(container, plugin, decks) {
  const t = plugin.settings;
  const stats = t._stats || {};

  const counts = { mastered: 0, learning: 0, due: 0, unseen: 0, total: 0 };
  for (const deck of decks) {
    for (const card of deck.cards) {
      const st = getReviewStatus(card.srMeta);
      counts[st] = (counts[st] || 0) + 1;
      counts.total++;
    }
  }

  const totalReviewed = stats.totalCardsReviewed || 0;
  const currentStreak = stats.currentStreak || 0;
  const dailyLog = stats.dailyReviewLog || {};
  const logVals = Object.values(dailyLog);
  const dailySurge = logVals.length ? Math.max(...logVals) : 0;
  const evalCtx = { totalCardsReviewed: totalReviewed, currentStreak, dailySurge, masteredCount: counts.mastered };

  const wrap = container.createEl("div", { attr: { class: "lh-card", style: "margin-top:0;border-radius:0;flex:1;display:flex;flex-direction:column;overflow-y:auto;" } });
  const hdr = wrap.createEl("div", { attr: { class: "lh-card-header" } });
  hdr.createEl("span", { text: c(t, "TAB_ACHIEVEMENT"), attr: { class: "lh-card-title" } });

  // Summary stats row
  const sRow = wrap.createEl("div", { attr: { style: "display:flex;gap:10px;padding:0 20px 16px;flex-wrap:wrap;" } });
  [
    { label: c(t, "ACH_TOTAL_REVIEWED"), val: totalReviewed, color: "#6366f1" },
    { label: c(t, "ACH_MASTERED"),       val: counts.mastered, color: "#22c55e" },
    { label: c(t, "TOTAL"),              val: counts.total,    color: "#f59e0b" },
    { label: c(t, "ACH_STREAK"),         val: currentStreak + "d", color: "#ef4444" },
  ].forEach(s => {
    const b = sRow.createEl("div", { attr: { style: "flex:1;min-width:72px;padding:10px 12px;border-radius:12px;background:#f8faff;border:1.5px solid #e5e7eb;text-align:center;" } });
    b.createEl("div", { text: String(s.val), attr: { style: `font-size:22px;font-weight:900;color:${s.color};line-height:1.1;` } });
    b.createEl("div", { text: s.label, attr: { style: "font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;" } });
  });

  // Chart + legend
  const chartSec = wrap.createEl("div", { attr: { style: "display:flex;align-items:center;gap:20px;padding:0 20px 20px;flex-wrap:wrap;" } });
  const chartWrap = chartSec.createEl("div", { attr: { style: "flex-shrink:0;" } });
  chartWrap.appendChild(I.sanitizeHTMLToDom(buildDonutSvg(counts)));
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
    row.createEl("span", { text: c(t, item.key), attr: { style: "font-size:12px;color:#374151;flex:1;" } });
    row.createEl("span", { text: `${item.n} (${pct}%)`, attr: { style: "font-size:11px;font-weight:700;color:#6b7280;" } });
  });

  // Achievement collection header
  const achHdr = wrap.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;padding:0 20px 12px;border-top:1px solid #f1f5f9;" } });
  achHdr.createEl("span", { text: c(t, "ACH_COLLECTION"), attr: { style: "font-size:14px;font-weight:700;color:#374151;" } });
  const unlocked = ACHIEVEMENTS.filter(a => (evalCtx[a.field] || 0) >= a.threshold).length;
  achHdr.createEl("span", { text: `${unlocked} / ${ACHIEVEMENTS.length}`, attr: { class: "lh-card-count" } });

  // Cards grid
  const grid = wrap.createEl("div", { attr: { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;padding:0 20px 24px;" } });
  for (const ach of ACHIEVEMENTS) {
    const val = evalCtx[ach.field] || 0;
    const isUnlocked = val >= ach.threshold;
    const progress = Math.min(1, val / ach.threshold);
    const rs = RARITY[ach.rarity];

    const card = grid.createEl("div", { attr: { class: "lh-ach-card" + (isUnlocked ? " unlocked" : "") } });
    card.style.cssText = isUnlocked
      ? `background:${rs.bg};box-shadow:0 0 16px ${rs.glow},0 4px 12px rgba(0,0,0,0.3);border:2px solid ${rs.badge};`
      : `background:linear-gradient(145deg,#374151,#1f2937);border:2px solid #4b5563;opacity:0.55;`;

    const badgeEl = card.createEl("div", { text: ach.rarity, attr: { style: `background:${rs.badge};color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;position:absolute;top:8px;right:8px;letter-spacing:.04em;` } });
    card.createEl("div", { text: ach.icon, attr: { style: "font-size:34px;line-height:1;text-align:center;margin:20px 0 8px;" } });
    card.createEl("div", { text: c(t, ach.nameKey), attr: { style: "font-size:11px;font-weight:700;color:#fff;text-align:center;padding:0 6px;line-height:1.3;margin-bottom:4px;" } });
    card.createEl("div", { text: c(t, ach.descKey), attr: { style: "font-size:9px;color:rgba(255,255,255,0.55);text-align:center;padding:0 6px;line-height:1.4;margin-bottom:8px;" } });
    const barBg = card.createEl("div", { attr: { style: "height:3px;background:rgba(255,255,255,0.15);border-radius:99px;margin:0 8px 8px;overflow:hidden;" } });
    barBg.createEl("div", { attr: { style: `height:100%;border-radius:99px;background:${isUnlocked ? rs.badge : "#6b7280"};width:${Math.round(progress * 100)}%;` } });
    card.createEl("div", {
      text: isUnlocked ? ("✓ " + c(t, "ACH_UNLOCKED")) : `${val} / ${ach.threshold}`,
      attr: { style: `font-size:9px;text-align:center;margin-bottom:10px;color:${isUnlocked ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)"};font-weight:${isUnlocked ? "700" : "400"};` },
    });
  }
}

module.exports = { renderAchievementTab };
