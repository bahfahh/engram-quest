const fs = require("fs");
let c = fs.readFileSync("src/hub/modal.js", "utf8");

// The difficulty badge object defined in _renderQuestTab
const oldDiff = `g={easy:{bg:"#dcfce7",color:"#16a34a",label:c(t,"DIFF_EASY")},medium:{bg:"#fef3c7",color:"#d97706",label:c(t,"DIFF_MEDIUM")},hard:{bg:"#fee2e2",color:"#dc2626",label:c(t,"DIFF_HARD")}}`;

const newDiff = `g=document.body.classList.contains("theme-dark")?{easy:{bg:"rgba(99,102,241,0.18)",color:"#a5b4fc",label:c(t,"DIFF_EASY")},medium:{bg:"rgba(139,92,246,0.18)",color:"#c4b5fd",label:c(t,"DIFF_MEDIUM")},hard:{bg:"rgba(168,85,247,0.22)",color:"#e9d5ff",label:c(t,"DIFF_HARD")}}:{easy:{bg:"#dcfce7",color:"#16a34a",label:c(t,"DIFF_EASY")},medium:{bg:"#fef3c7",color:"#d97706",label:c(t,"DIFF_MEDIUM")},hard:{bg:"#fee2e2",color:"#dc2626",label:c(t,"DIFF_HARD")}}`;

if (!c.includes(oldDiff)) {
  console.error("Target diff object not found!");
  // Try to show context
  const idx = c.indexOf('"DIFF_EASY"');
  if (idx > 0) {
    console.log("DIFF_EASY context:", c.slice(Math.max(0, idx - 80), idx + 150));
  }
} else {
  const result = c.replace(oldDiff, newDiff);
  fs.writeFileSync("src/hub/modal.js", result, "utf8");
  console.log("Patched diff badge colors successfully!");
}
