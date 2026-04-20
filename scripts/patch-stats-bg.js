const fs = require("fs");
let c = fs.readFileSync("src/hub/modal.js", "utf8");

// Replace the bg.png reference in _renderReview with dark-mode-aware version
const oldStr = `this.app.vault.adapter.getResourcePath(this.app.vault.configDir+"/plugins/engram-quest/bg.png"),s=e.createEl("div",{attr:{class:"lh-stats-header",style:\`background-image:url('\${r}')\`}})`;
const newStr = `(()=>{const _dark=document.body.classList.contains("theme-dark");return this.app.vault.adapter.getResourcePath(this.app.vault.configDir+"/plugins/engram-quest/"+(_dark?"stats_bg_dark.webp":"bg.png"))})(),s=e.createEl("div",{attr:{class:"lh-stats-header",style:\`background-image:url('\${r}')\`}})`;

if (!c.includes('this.app.vault.adapter.getResourcePath(this.app.vault.configDir+"/plugins/engram-quest/bg.png"),s=e.createEl("div",{attr:{class:"lh-stats-header"')) {
  console.error("Target string not found! Searching...");
  const idx = c.indexOf("lh-stats-header");
  console.log("lh-stats-header at:", idx);
  console.log("context:", c.slice(Math.max(0,idx-200), idx+50));
} else {
  const result = c.replace(oldStr, newStr);
  fs.writeFileSync("src/hub/modal.js", result, "utf8");
  console.log("Patched successfully!");
}
