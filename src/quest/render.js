// Remove near-grey background from island images using canvas
function removeIslandBg(imgEl) {
  imgEl.addEventListener('load', () => {
    try {
      const canvas = document.createElement('canvas');
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

"use strict";

function renderQuestMap(nodes, styleName, activeIndex, visitedSet, app, getNodePositions) {
  let configDir = app.vault.configDir;
  let assetRoot = configDir + "/plugins/engram-quest/assets/quest-map/";
  let isDark = document.body.classList.contains("theme-dark");

  let bgFile = isDark ? "bg_dark.png" : "bg_light.png";
  let background = app.vault.adapter.getResourcePath(assetRoot + bgFile);
  let platform = app.vault.adapter.getResourcePath(assetRoot + (isDark ? "platform_dark.png" : "platform_light.png"));
  let iconRoot = assetRoot + "icons/";

  let positions = getNodePositions(nodes.length);
  let width = Math.max(1100, nodes.length > 1 ? positions[nodes.length - 1].cx + 200 : 1100);
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
  let dotColor = isDark ? "rgba(255,210,80,0.85)" : "rgba(255,255,255,0.7)";
  let shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";

  let mapH = 640;
  let html = `
  <div class="qm-scroll-wrapper">
    <div class="qm-hybrid-container" style="background-image:url('${background}');min-width:${width}px;height:${mapH}px;">
      <svg class="qm-svg-layer" viewBox="0 0 ${width} ${mapH}" preserveAspectRatio="xMinYMin slice">
        <path d="${path}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="4" stroke-linecap="round" transform="translate(0,5)" />
        <path d="${path}" fill="none" stroke="${dotColor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 14" style="animation:dashFlow 1s linear infinite;" />
      </svg>
  `;

  nodes.forEach((node, index) => {
    let x = positions[index].cx;
    let y = positions[index].cy;
    let isCurrent = index === activeIndex;
    let isBoss = !!node.boss;
    let isVisited = visitedSet && visitedSet.has(index) && !isCurrent;

    let islandMarkup = "";
    if (isDark) {
      // Use island_dark_N.png as the main visual (replaces platform)
      let islandN = (index % 9) + 1;
      let islandSrc = app.vault.adapter.getResourcePath(assetRoot + `island_dark_${islandN}.png`);
      islandMarkup = `<img src="${islandSrc}" class="qm-platform qm-island-img" />`;
    } else {
      // Light mode: show emoji/icon prop above platform
      let iconPath = node.icon ? app.vault.adapter.getResourcePath(iconRoot + node.icon) : "";
      let iconProp = iconPath
        ? `<img src="${iconPath}" class="qm-icon-prop ${isBoss ? "qm-icon-boss" : ""}" />`
        : `<div class="qm-emoji">${node.emoji || "📝"}</div>`;
      islandMarkup = iconProp + `<img src="${platform}" class="qm-platform" />`;
    }

    html += `
      <div class="qm-island-group ${isCurrent ? "qm-active" : ""} ${isBoss ? "qm-diff-boss" : ""} ${isVisited ? "qm-visited" : ""}" data-index="${index}" style="left:${x}px;top:${y}px;animation-delay:${-(index * 0.7)}s;">
        ${isCurrent ? '<div class="qm-current-badge">▶ Current</div>' : ""}
        ${isVisited ? '<div class="qm-visited-badge">✓</div>' : ""}
        ${islandMarkup}
        <div class="qm-label-wrap">${node.title || ""}</div>
      </div>
    `;
  });

  html += "</div></div>";
  return html;
}

module.exports = { renderQuestMap };
