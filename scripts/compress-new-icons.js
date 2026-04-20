const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC_DIR = path.join(__dirname, "../assets/icons");
const OUT_DIR = path.join(__dirname, "../assets/icons");

const ICONS = [
  "first_card",
  "ten_cards",
  "fifty_cards",
  "century",
  "five_hundred",
  "one_thousand",
  "two_thousand",
  "streak_3",
  "streak_7",
  "streak_30",
  "daily_surge",
  "master_50",
];

(async () => {
  for (const name of ICONS) {
    const srcPath = path.join(SRC_DIR, `${name}.png`);
    const outPath = path.join(OUT_DIR, `${name}.webp`);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠ skip (not found): ${name}.png`);
      continue;
    }
    const info = await sharp(srcPath)
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toFile(outPath);
    const srcBytes = fs.statSync(srcPath).size;
    console.log(`✓ ${name}.webp  ${(srcBytes / 1024).toFixed(0)}KB → ${(info.size / 1024).toFixed(0)}KB`);
  }
  console.log("Done!");
})();
