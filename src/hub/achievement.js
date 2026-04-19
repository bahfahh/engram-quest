"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { getReviewStatus } = require("../review/helpers");

const ACHIEVEMENTS = [
  { id: "first_card",   icon: "assets/icons/first_card.webp",   rarity: "UC",  threshold: 1,   field: "totalCardsReviewed", nameKey: "ACH_FIRST_CARD_NAME",   descKey: "ACH_FIRST_CARD_DESC"   },
  { id: "ten_cards",    icon: "assets/icons/ten_cards.webp",    rarity: "UC",  threshold: 10,  field: "totalCardsReviewed", nameKey: "ACH_TEN_CARDS_NAME",    descKey: "ACH_TEN_CARDS_DESC"    },
  { id: "fifty_cards",  icon: "assets/icons/fifty_cards.webp",  rarity: "R",   threshold: 50,  field: "totalCardsReviewed", nameKey: "ACH_FIFTY_CARDS_NAME",  descKey: "ACH_FIFTY_CARDS_DESC"  },
  { id: "century",      icon: "assets/icons/century.webp",      rarity: "R",   threshold: 100, field: "totalCardsReviewed", nameKey: "ACH_CENTURY_NAME",      descKey: "ACH_CENTURY_DESC"      },
  { id: "five_hundred", icon: "assets/icons/five_hundred.webp", rarity: "LEG", threshold: 500,  field: "totalCardsReviewed", nameKey: "ACH_FIVE_HUNDRED_NAME",  descKey: "ACH_FIVE_HUNDRED_DESC"  },
  { id: "one_thousand", icon: "assets/icons/one_thousand.webp", rarity: "LEG", threshold: 1000, field: "totalCardsReviewed", nameKey: "ACH_ONE_THOUSAND_NAME",  descKey: "ACH_ONE_THOUSAND_DESC"  },
  { id: "two_thousand", icon: "assets/icons/two_thousand.webp", rarity: "LEG", threshold: 2000, field: "totalCardsReviewed", nameKey: "ACH_TWO_THOUSAND_NAME",  descKey: "ACH_TWO_THOUSAND_DESC"  },
  { id: "streak_3",     icon: "assets/icons/streak_3.webp",     rarity: "UC",  threshold: 3,   field: "currentStreak",      nameKey: "ACH_STREAK_3_NAME",    descKey: "ACH_STREAK_3_DESC"     },
  { id: "streak_7",     icon: "assets/icons/streak_7.webp",     rarity: "R",   threshold: 7,   field: "currentStreak",      nameKey: "ACH_STREAK_7_NAME",    descKey: "ACH_STREAK_7_DESC"     },
  { id: "streak_30",    icon: "assets/icons/streak_30.webp",    rarity: "LEG", threshold: 30,  field: "currentStreak",      nameKey: "ACH_STREAK_30_NAME",   descKey: "ACH_STREAK_30_DESC"    },
  { id: "daily_surge",  icon: "assets/icons/daily_surge.webp",  rarity: "R",   threshold: 30,  field: "dailySurge",         nameKey: "ACH_DAILY_SURGE_NAME", descKey: "ACH_DAILY_SURGE_DESC"  },
  { id: "master_50",    icon: "assets/icons/master_50.webp",    rarity: "LEG", threshold: 50,  field: "masteredCount",      nameKey: "ACH_MASTER_50_NAME",   descKey: "ACH_MASTER_50_DESC"    },
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

function buildActivitySvg(dailyLog, days) {
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
    const fill = isToday ? "#818cf8" : n > 0 ? "#6366f1" : "#e5e7eb";
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
  const baseline = `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#e5e7eb" stroke-width="1"/>`;

  return {
    svg: `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}">${baseline}${bars}${yLabel}${xLabels}</svg>`,
    studyDays, total, avgActive, days,
  };
}

function renderActivitySection(container, dailyLog, t, activePeriod, globalTotal) {
  container.empty();

  // Header + toggle row
  const hdr = container.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;" } });
  hdr.createEl("span", { text: c(t, "ACH_ACTIVITY"), attr: { style: "font-size:13px;font-weight:700;color:#374151;" } });

  const toggleWrap = hdr.createEl("div", { attr: { style: "display:flex;gap:4px;" } });
  const periods = [
    { days: 7,  label: c(t, "ACH_PERIOD_7")  },
    { days: 30, label: c(t, "ACH_PERIOD_30") },
    { days: 90, label: c(t, "ACH_PERIOD_90") },
  ];
  periods.forEach(p => {
    const btn = toggleWrap.createEl("button", {
      text: p.label,
      attr: { style: `padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid ${p.days === activePeriod ? "#6366f1" : "#e5e7eb"};background:${p.days === activePeriod ? "#eef2ff" : "#fff"};color:${p.days === activePeriod ? "#6366f1" : "#6b7280"};` },
    });
    btn.addEventListener("click", () => renderActivitySection(container, dailyLog, t, p.days, globalTotal));
  });

  // Chart
  const { svg, studyDays, total, avgActive, days } = buildActivitySvg(dailyLog, activePeriod);
  const chartBox = container.createEl("div", { attr: { class: "lh-ach-chart-box", style: "background:#f8faff;border:1.5px solid #e5e7eb;border-radius:12px;padding:10px 12px 6px;margin-bottom:10px;" } });
  chartBox.appendChild(I.sanitizeHTMLToDom(svg));

  // Stats row
  const statsPct = Math.round(studyDays / days * 100);
  const statsRow = container.createEl("div", { attr: { class: "lh-ach-stats-row", style: "display:flex;gap:8px;" } });
  [
    { label: c(t, "ACH_STUDY_DAYS"), val: `${studyDays}/${days}`, sub: `${statsPct}%` },
    { label: c(t, "ACH_PERIOD_REVIEWS"), val: String(total), sub: "" },
    { label: c(t, "ACH_DAILY_AVG"), val: String(avgActive), sub: c(t, "ACH_PER_DAY") },
  ].forEach(s => {
    const box = statsRow.createEl("div", { attr: { style: "flex:1;padding:8px 10px;border-radius:10px;background:#f8faff;border:1.5px solid #e5e7eb;text-align:center;" } });
    box.createEl("div", { text: s.val, attr: { style: "font-size:16px;font-weight:900;color:#374151;line-height:1.1;" } });
    if (s.sub) box.createEl("div", { text: s.sub, attr: { style: "font-size:9px;color:#6366f1;font-weight:700;" } });
    box.createEl("div", { text: s.label, attr: { style: "font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-top:2px;" } });
  });
}

function renderAchievementTab(container, plugin, decks) {
  const t = plugin.settings;
  const stats = t._stats || {};

  const counts = { mastered: 0, learning: 0, due: 0, unseen: 0, total: 0 };
  let srRepTotal = 0;
  for (const deck of decks) {
    for (const card of deck.cards) {
      const st = getReviewStatus(card.srMeta);
      counts[st] = (counts[st] || 0) + 1;
      counts.total++;
      srRepTotal += (card.srMeta?.repetitions || 0);
    }
  }

  const totalReviewed = Math.max(stats.totalCardsReviewed || 0, srRepTotal);
  const currentStreak = stats.currentStreak || 0;
  const dailyLog = stats.dailyReviewLog || {};
  const logVals = Object.values(dailyLog);
  const dailySurge = logVals.length ? Math.max(...logVals) : 0;
  const evalCtx = { totalCardsReviewed: totalReviewed, currentStreak, dailySurge, masteredCount: counts.mastered };

  const wrap = container.createEl("div", { attr: { class: "lh-card", style: "margin-top:0;border-radius:0;flex:1;display:flex;flex-direction:column;overflow-y:auto;" } });

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
    const b = sRow.createEl("div", { attr: { style: "flex:1;min-width:72px;padding:10px 12px;border-radius:12px;background:#f8faff;border:1.5px solid #e5e7eb;text-align:center;" } });
    b.createEl("div", { text: String(s.val), attr: { class: "lh-ach-stat-val", style: `font-size:22px;font-weight:900;color:${s.color};line-height:1.1;` } });
    b.createEl("div", { text: s.label, attr: { style: "font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;" } });
  });

  // === Familiarity donut ===
  const chartSec = wrap.createEl("div", { attr: { class: "lh-ach-familiarity", style: "display:flex;align-items:center;gap:20px;padding:0 20px 20px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;" } });
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

  // === Activity chart ===
  const actSec = wrap.createEl("div", { attr: { class: "lh-ach-activity", style: "padding:16px 20px 8px;" } });
  renderActivitySection(actSec, dailyLog, t, 30, totalReviewed);

  // === Achievement collection ===
  const achHdr = wrap.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;padding:16px 20px 12px;border-top:1px solid #f1f5f9;" } });
  achHdr.createEl("span", { text: c(t, "ACH_COLLECTION"), attr: { style: "font-size:14px;font-weight:700;color:#374151;" } });
  const unlocked = ACHIEVEMENTS.filter(a => (evalCtx[a.field] || 0) >= a.threshold).length;
  achHdr.createEl("span", { text: `${unlocked} / ${ACHIEVEMENTS.length}`, attr: { class: "lh-card-count" } });

  const grid = wrap.createEl("div", { attr: { class: "lh-ach-grid", style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;padding:0 20px 24px;" } });
  for (const ach of ACHIEVEMENTS) {
    const val = evalCtx[ach.field] || 0;
    const isUnlocked = val >= ach.threshold;
    const progress = Math.min(1, val / ach.threshold);
    const rs = RARITY[ach.rarity];

    const card = grid.createEl("div", { attr: { class: "lh-ach-card" + (isUnlocked ? " unlocked" : "") } });
    card.style.cssText = isUnlocked
      ? `background:${rs.bg};box-shadow:0 0 16px ${rs.glow},0 4px 12px rgba(0,0,0,0.3);border:2px solid ${rs.badge};`
      : `background:linear-gradient(145deg,#374151,#1f2937);border:2px solid #4b5563;opacity:0.55;`;

    card.createEl("div", { text: ach.rarity, attr: { style: `background:${rs.badge};color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;position:absolute;top:8px;right:8px;letter-spacing:.04em;` } });

    // Image icon — resolve to plugin's bundled asset path
    const iconWrap = card.createEl("div", { attr: { style: "text-align:center;margin:14px 0 6px;" } });
    const iconSrc = plugin.app.vault.adapter.getResourcePath
      ? plugin.app.vault.adapter.getResourcePath(".obsidian/plugins/engram-quest/" + ach.icon)
      : ach.icon;
    const img = iconWrap.createEl("img", { attr: { src: iconSrc, width: "88", height: "88", style: `object-fit:contain;display:block;margin:0 auto;${isUnlocked ? "" : "filter:grayscale(1) brightness(0.5);"}` } });
    img.onerror = () => { iconWrap.empty(); iconWrap.setText(ach.id); };

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
