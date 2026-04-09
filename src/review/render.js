"use strict";

function getBadge(status, translateKey, settings) {
  if (status === "due") return translateKey(settings, "DUE");
  if (status === "mastered") return translateKey(settings, "MASTERED");
  if (status === "learning") return "LEARNING";
  return "NEW";
}

function getThemeColors(themes, styleName, index) {
  let fallback = { g1: "#dbeafe", g2: "#93c5fd" };
  let theme = themes[styleName] || themes.ocean || {};
  if (Array.isArray(theme.colors) && theme.colors[index % theme.colors.length]) {
    return theme.colors[index % theme.colors.length];
  }
  return fallback;
}

function renderReviewDeck(cards, config, themes, translateKey, getReviewStatus) {
  let today = new Date().toISOString().split("T")[0];
  let total = cards.length;
  let due = cards.filter((card) => card.srMeta && card.srMeta.due <= today).length;
  let mastered = cards.filter((card) => {
    let stability = card.srMeta?.stability ?? card.srMeta?.interval;
    return card.srMeta && card.srMeta.state === 2 && stability >= 21;
  }).length;
  let rate = total > 0 ? Math.round(mastered / total * 100) : 0;

  let html = '<div class="rd-wrap">';
  html += `<div class="rd-stats">
    <span>${translateKey(config.settings, "TOTAL")}: ${total}</span>
    <span>${translateKey(config.settings, "DUE")}: ${due}</span>
    <span>${translateKey(config.settings, "MASTERED")}: ${mastered}</span>
    <span>${translateKey(config.settings, "RATE")}: ${rate}%</span>
  </div>`;

  if (config.title) {
    html += `<div class="rd-title">${config.title}</div>`;
  }

  let columns = Math.min(config.columns || 4, 6);
  html += `<div class="rd-grid" style="grid-template-columns:repeat(${columns},1fr)">`;

  cards.forEach((card, index) => {
    let status = getReviewStatus(card.srMeta);
    let colors = getThemeColors(themes, config.style, index);
    let borderStyle = "border:2px solid var(--background-modifier-border)";
    let className = "rd-card";

    if (status === "due") {
      borderStyle = "border:2px solid #f59e0b";
      className += " rd-due-glow";
    } else if (status === "learning") {
      borderStyle = "border:2px solid #3b82f6";
    } else if (status === "mastered") {
      borderStyle = "border:2px solid #22c55e";
    }

    html += `<div class="${className}" data-index="${index}" style="${borderStyle};border-radius:12px;cursor:pointer;position:relative;overflow:hidden;aspect-ratio:2/3;transition:transform .18s,box-shadow .18s">
      <div class="rd-card-face" style="position:absolute;inset:0;background:linear-gradient(135deg,${colors.g1},${colors.g2});display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
        <span style="font-size:28px">${card.emoji || "📝"}</span>
      </div>
      <span style="position:absolute;top:6px;right:8px;font-size:12px;font-weight:700">${getBadge(status, translateKey, config.settings)}</span>
    </div>`;
  });

  html += "</div></div>";
  return html;
}

module.exports = {
  renderReviewDeck
};
