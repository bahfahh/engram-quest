const fs = require("fs");
const c = fs.readFileSync("main.js", "utf8");
// Line 166748 has "lh-ach-card", find click near it
const idx = c.indexOf("lh-ach-card\"+(I?\" unlocked\"", 160000);
console.log("JS card creation at:", idx);
if (idx > 0) {
  console.log(c.slice(idx, idx + 600));
}
