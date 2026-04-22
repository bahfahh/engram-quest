"use strict";

function renderQuestMap(nodes, styleName, activeIndex, visitedSet, app, getNodePositions) {
  let configDir = app.vault.configDir;
  let background = app.vault.adapter.getResourcePath(configDir + "/plugins/engram-quest/assets/quest-map/bg.png");
  let platform = app.vault.adapter.getResourcePath(configDir + "/plugins/engram-quest/assets/quest-map/platform.png");
  let iconRoot = configDir + "/plugins/engram-quest/assets/quest-map/icons/";
  let positions = getNodePositions(nodes.length);
  let width = Math.max(1100, nodes.length > 1 ? positions[nodes.length - 1].cx + 200 : 1100);
  let path = "";

  if (positions.length > 0) {
    path = `M ${positions[0].cx} ${positions[0].cy} `;
    for (let index = 0; index < positions.length - 1; index++) {
      let current = positions[index];
      let next = positions[index + 1];
      let delta = next.cx - current.cx;
      path += `C ${current.cx + delta * 0.65} ${current.cy}, ${next.cx - delta * 0.65} ${next.cy}, ${next.cx} ${next.cy} `;
    }
  }

  let mapH = 580;
  let html = `
  <div class="qm-scroll-wrapper">
    <div class="qm-hybrid-container" style="background-image:url('${background}');min-width:${width}px;height:${mapH}px;">
      <svg class="qm-svg-layer" viewBox="0 0 ${width} ${mapH}" preserveAspectRatio="xMinYMin slice">
        <path d="${path}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="6" stroke-linecap="round" transform="translate(0,8)" />
        <path d="${path}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 18" stroke-dashoffset="0" style="animation:dashFlow 1.2s linear infinite;" />
      </svg>
  `;

  nodes.forEach((node, index) => {
    let x = positions[index].cx;
    let y = positions[index].cy;
    let isCurrent = index === activeIndex;
    let isBoss = !!node.boss;
    let isVisited = visitedSet && visitedSet.has(index) && !isCurrent;
    let iconPath = node.icon ? app.vault.adapter.getResourcePath(iconRoot + node.icon) : "";
    let iconMarkup = iconPath
      ? `<img src="${iconPath}" class="qm-icon-prop ${isBoss ? "qm-icon-boss" : ""}" />`
      : `<div class="qm-emoji">${node.emoji || "📝"}</div>`;

    html += `
      <div class="qm-island-group ${isCurrent ? "qm-active" : ""} ${isBoss ? "qm-diff-boss" : ""} ${isVisited ? "qm-visited" : ""}" data-index="${index}" style="left:${x}px;top:${y}px;animation-delay:${-(index * 0.7)}s;">
        ${iconMarkup}
        ${isCurrent ? '<div class="qm-current-badge">Current</div>' : ""}
        ${isVisited ? '<div class="qm-visited-badge">Visited</div>' : ""}
        <img src="${platform}" class="qm-platform" />
        <div class="qm-label-wrap">${node.title || ""}</div>
      </div>
    `;
  });

  html += "</div></div>";
  return html;
}

module.exports = {
  renderQuestMap
};
