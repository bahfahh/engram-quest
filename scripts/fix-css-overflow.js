const fs = require("fs");
const path = require("path");

const f = path.join(__dirname, "../src/styles/index.js");
let c = fs.readFileSync(f, "utf8");

console.log("Before - overflow:visible:", c.includes("overflow:visible"));
console.log("Before - ::before rule:", c.includes("lh-ach-leg::before"));

// Fix 1: overflow:visible → overflow:hidden
c = c.split("overflow:visible;transition:transform 0.25s,box-shadow 0.25s; }").join("overflow:hidden;transition:transform 0.25s,box-shadow 0.25s; }");

// Fix 2: tone down hover
c = c.split("transform:translateY(-5px) scale(1.04); }").join("transform:translateY(-4px) scale(1.03); }");

// Fix 3: Remove ::before and > * rules using regex on the whole content
// The ::before rule in the JS string appears as: \n.lh-ach-leg::before {...}\n.lh-ach-leg > * {...}
c = c.replace(/\\n\.lh-ach-leg::before \{[^}]+\}\\n\.lh-ach-leg > \* \{ position:relative;z-index:1; \}/g, "");

fs.writeFileSync(f, c);

const c2 = fs.readFileSync(f, "utf8");
console.log("After - overflow:visible:", c2.includes("overflow:visible"));
console.log("After - ::before rule:", c2.includes("lh-ach-leg::before"));
console.log("After - overflow:hidden:", c2.includes("overflow:hidden"));
console.log("DONE");
