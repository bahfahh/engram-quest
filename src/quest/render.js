"use strict";
const I = require("obsidian");

function renderQuestMap(nodes, styleName, activeIndex, visitedSet, app, getNodePositions, questProgress) {

  let configDir = app.vault.configDir;
  let assetRoot = configDir + "/plugins/engram-quest/assets/quest-map/";
  let isDark = activeDocument.body.classList.contains("theme-dark");

  let bgFile = isDark ? "bg_dark.png" : "bg_light.png";
  let background = app.vault.adapter.getResourcePath(assetRoot + bgFile);
  let generatedRoot = assetRoot + "generated/";
  let crownAsset = app.vault.adapter.getResourcePath(generatedRoot + "crown-current-node.webp");
  let nodeFrameAsset = app.vault.adapter.getResourcePath(generatedRoot + "node-number-frame.webp");
  let bossGateAsset = app.vault.adapter.getResourcePath(generatedRoot + "boss-gate.webp");
  let bossLockAsset = app.vault.adapter.getResourcePath(generatedRoot + "boss-lock-badge.webp");

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
  <div class="qm-map-outer">
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

    let badgeHtml = "";
    if (isCompleted) {
      badgeHtml = `<img src="${crownAsset}" class="qm-badge qm-badge-crown" alt="" style="width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(255,210,80,.45));top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;" />`;
    } else if (isLocked && isBoss) {
      badgeHtml = `<img src="${bossLockAsset}" class="qm-badge qm-badge-boss-lock" alt="" style="top:-10px;right:18px;width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 8px 14px rgba(60,0,90,.35));" />`;
    } else if (isLocked) {
      let lc = isDark ? ["#b8860b","#d4a017","#a07010","#6b4000"] : ["#9ca3af","#d1d5db","#9ca3af","#6b7280"];
      badgeHtml = `<div class="qm-badge qm-badge-lock"><svg viewBox="0 0 32 40"><path d="M8 16V12a8 8 0 0116 0v4" fill="none" stroke="${lc[0]}" stroke-width="2.5" stroke-linecap="round"/><rect x="4" y="16" width="24" height="18" rx="3" fill="${lc[1]}" stroke="${lc[2]}" stroke-width="1"/><circle cx="16" cy="26" r="2.5" fill="${lc[3]}"/><rect x="15" y="26" width="2" height="4" rx="1" fill="${lc[3]}"/></svg></div>`;
    }

    let nodeFilter = isLocked ? "grayscale(70%) brightness(.68) saturate(.55)" : (isCompleted ? "brightness(1.08) saturate(1.08)" : "none");
    let nodeMarkup = isBoss
      ? `<img src="${bossGateAsset}" class="qm-platform qm-boss-gate-img" style="width:150px;filter:drop-shadow(0 18px 24px rgba(75,0,130,.38));" />`
      : `<div class="qm-node-number-wrap" style="position:relative;width:94px;height:94px;z-index:4;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 10px 16px rgba(0,0,0,.28)) ${nodeFilter};">
          <img src="${nodeFrameAsset}" class="qm-node-number-frame" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" />
          <span class="qm-node-number" style="position:relative;z-index:1;color:#fff;font-size:34px;font-weight:900;line-height:1;text-shadow:0 2px 5px rgba(0,0,0,.65),0 0 8px rgba(99,102,241,.45);font-variant-numeric:tabular-nums;">${index + 1}</span>
        </div>`;
    let stateClass = isLocked ? "qm-island-locked" : (isCompleted ? "qm-visited qm-completed" : "");

    html += `
      <div class="qm-island-group ${isCurrent ? "qm-active" : ""} ${isBoss ? "qm-diff-boss" : ""} ${stateClass}" data-index="${index}" style="left:${x}px;top:${y}px;animation-delay:${-(index * 0.7)}s;">
        ${isCurrent ? `<img src="${crownAsset}" class="qm-crown-img" alt="" style="position:absolute;top:-72px;left:50%;transform:translateX(-50%);width:76px;height:76px;object-fit:contain;z-index:7;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35));animation:crownFloat 3s ease-in-out infinite;" />` : ""}
        ${isCurrent ? '<div class="qm-current-badge">▶ Current</div>' : ""}
        ${badgeHtml}
        ${nodeMarkup}
        <div class="qm-label-wrap">${node.title || ""}</div>
      </div>
    `;
  });

  // Close hybrid-container + scroll-wrapper so the panel sits outside the
  // horizontal scroll area and stays fixed to the viewport.
  html += "</div></div>";

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

  html += "</div>";
  return html;
}

module.exports = { renderQuestMap };
