const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ICONS = [
  { src: "icon_one_thousand_1776609247869.png",  out: "one_thousand.webp" },
  { src: "icon_two_thousand_1776609276493.png",   out: "two_thousand.webp" },
];

const SRC_DIR = "C:\\Users\\ab870\\.gemini\\antigravity\\brain\\bfc64cfe-9502-4c70-94c5-f8fa37edc141";
const OUT_DIR = path.join(__dirname, "../assets/icons");

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const { src, out } of ICONS) {
    const srcPath = path.join(SRC_DIR, src);
    const outPath = path.join(OUT_DIR, out);
    const info = await sharp(srcPath)
      .resize(120, 120, { fit: "cover" })
      .webp({ quality: 82 })
      .toFile(outPath);
    const srcBytes = fs.statSync(srcPath).size;
    console.log(`✓ ${out}  ${(srcBytes/1024).toFixed(0)}KB → ${(info.size/1024).toFixed(0)}KB`);
  }
  console.log("Done!");
})();
