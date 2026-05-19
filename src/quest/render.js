"use strict";
const I = require("obsidian");

// Remove near-grey background from island images using canvas
function removeIslandBg(imgEl) {
  imgEl.addEventListener('load', () => {
    try {
      const canvas = activeDocument.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        // Remove dark grey background (r≈g≈b, all < 80)
        if (Math.abs(r-g) < 18 && Math.abs(g-b) < 18 && r < 80) {
          d[i+3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      imgEl.src = canvas.toDataURL('image/png');
    } catch(e) { /* cross-origin fallback: just show as-is */ }
  }, { once: true });
}

function renderQuestMap(nodes, styleName, activeIndex, visitedSet, app, getNodePositions, questProgress) {
  let configDir = app.vault.configDir;
  let assetRoot = configDir + "/plugins/engram-quest/assets/quest-map/";
  let isDark = activeDocument.body.classList.contains("theme-dark");

  let bgFile = isDark ? "bg_dark.png" : "bg_light.png";
  let background = app.vault.adapter.getResourcePath(assetRoot + bgFile);
  let platform = app.vault.adapter.getResourcePath(assetRoot + (isDark ? "platform_dark.png" : "platform_light.png"));
  let iconRoot = assetRoot + "icons/";

  let positions = getNodePositions(nodes.length);
  let width = Math.max(900, nodes.length > 1 ? positions[nodes.length - 1].cx + 160 : 900);
  let path = "";

  if (positions.length > 0) {
    path = `M ${positions[0].cx} ${positions[0].cy} `;
    for (let i = 0; i < positions.length - 1; i++) {
      let cur = positions[i], nxt = positions[i + 1];
      let dx = nxt.cx - cur.cx;
      path += `C ${cur.cx + dx * 0.65} ${cur.cy}, ${nxt.cx - dx * 0.65} ${nxt.cy}, ${nxt.cx} ${nxt.cy} `;
    }
  }

  // Path color: golden dots for dark (like demo), white dots for light
  let dotColor = isDark ? "rgba(255,210,80,0.85)" : "rgba(80,120,200,0.75)";
  let shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";

  let mapH = 650;
  let glowFilter = isDark ? '<defs><filter id="qmGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' : '';
  let pathFilterAttr = isDark ? ' filter="url(#qmGlow)"' : '';
  let html = `
  <div class="qm-scroll-wrapper">
    <div class="qm-hybrid-container" style="background-image:url('${background}');min-width:${width}px;height:${mapH}px;">
      <svg class="qm-svg-layer" viewBox="0 0 ${width} ${mapH}" preserveAspectRatio="xMinYMin slice">
        ${glowFilter}
        <path d="${path}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="4" stroke-linecap="round" transform="translate(0,5)" />
        <path d="${path}" fill="none" stroke="${dotColor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 14" style="animation:dashFlow 1s linear infinite;"${pathFilterAttr} />
      </svg>
  `;

  let completedCount = questProgress && Number.isFinite(questProgress.completedCount) ? questProgress.completedCount : 0;
  nodes.forEach((node, index) => {
    let x = positions[index].cx;
    let y = positions[index].cy;
    let isCompleted = Boolean(visitedSet && visitedSet.has(index));
    let isCurrent = index === activeIndex && !isCompleted;
    let isBoss = !!node.boss;
    let isLocked = index > activeIndex && !isCompleted;
    if (!questProgress && isCompleted) completedCount++;

    // State badge (SVG inline — no PNG needed)
    let badgeHtml = "";
    if (isCompleted) {
      badgeHtml = '<div class="qm-badge qm-badge-check"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#22c55e"/><path d="M9 16l5 5 9-10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    } else if (isLocked) {
      let lc = isDark ? ["#b8860b","#d4a017","#a07010","#6b4000"] : ["#9ca3af","#d1d5db","#9ca3af","#6b7280"];
      badgeHtml = `<div class="qm-badge qm-badge-lock"><svg viewBox="0 0 32 40"><path d="M8 16V12a8 8 0 0116 0v4" fill="none" stroke="${lc[0]}" stroke-width="2.5" stroke-linecap="round"/><rect x="4" y="16" width="24" height="18" rx="3" fill="${lc[1]}" stroke="${lc[2]}" stroke-width="1"/><circle cx="16" cy="26" r="2.5" fill="${lc[3]}"/><rect x="15" y="26" width="2" height="4" rx="1" fill="${lc[3]}"/></svg></div>`;
    }

    let islandN = (index % 9) + 1;
    let prefix = isDark ? "island_dark_" : "island_light_";
    let islandSrc = app.vault.adapter.getResourcePath(assetRoot + `${prefix}${islandN}.png`);
    let islandMarkup = `<img src="${islandSrc}" class="qm-platform qm-island-img" />`;
    let stateClass = isLocked ? "qm-island-locked" : (isCompleted ? "qm-visited qm-completed" : "");

    html += `
      <div class="qm-island-group ${isCurrent ? "qm-active" : ""} ${isBoss ? "qm-diff-boss" : ""} ${stateClass}" data-index="${index}" style="left:${x}px;top:${y}px;animation-delay:${-(index * 0.7)}s;">
        ${isCurrent ? '<div class="qm-current-badge">▶ Current</div>' : ""}
        ${badgeHtml}
        ${islandMarkup}
        <div class="qm-label-wrap">${node.title || ""}</div>
      </div>
    `;
  });

  // Bottom panel
  let currentNode = nodes[activeIndex] || {};
  let progressPct = questProgress && Number.isFinite(questProgress.progressPct) ? questProgress.progressPct : (nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0);
  let bestScorePct = questProgress && Number.isFinite(questProgress.bestScorePct) ? questProgress.bestScorePct : null;
  let starBase = bestScorePct ?? progressPct;
  let starCount = starBase >= 90 ? 3 : starBase >= 60 ? 2 : starBase > 0 ? 1 : 0;
  let starsHtml = '';
  for (let s = 0; s < 3; s++) {
    if (s < starCount) {
      starsHtml += `<svg viewBox="0 0 24 24" width="20" height="20"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="${isDark ? '#f5c842' : '#f59e0b'}" stroke="${isDark ? '#c8930e' : '#d97706'}" stroke-width="0.8"/></svg>`;
    } else {
      starsHtml += `<svg viewBox="0 0 24 24" width="20" height="20"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="none" stroke="${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}" stroke-width="1.2"/></svg>`;
    }
  }
  let panelCls = isDark ? 'qm-panel-dark' : 'qm-panel-light';
  let fillCls = isDark ? 'qm-pfill-dark' : 'qm-pfill-light';
  html += `
    <div class="qm-bottom-panel ${panelCls}">
      <div class="qm-bp-header">
        <div class="qm-bp-title">\u{1F4CD} ${currentNode.title || ''}</div>
        <div class="qm-bp-stars">${starsHtml}</div>
      </div>
      ${currentNode.summary ? `<div class="qm-bp-desc">${currentNode.summary}</div>` : ''}
      <div class="qm-bp-prog-wrap">
        <div class="qm-bp-prog-bar"><div class="qm-bp-prog-fill ${fillCls}" style="width:${progressPct}%"></div></div>
        <span class="qm-bp-prog-label">${completedCount}/${nodes.length}${bestScorePct !== null ? ` · ${bestScorePct}%` : ""}</span>
      </div>
    </div>
  `;

  html += "</div></div>";
  return html;
}

module.exports = { renderQuestMap };
