// scripts/compress-icons.js
// Compress achievement icons to WebP for use in Obsidian plugin
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ICONS = [
  { src: "icon_first_card_1776607905913.png",   out: "first_card.webp"   },
  { src: "icon_ten_cards_1776607930798.png",     out: "ten_cards.webp"    },
  { src: "icon_fifty_cards_1776607958032.png",   out: "fifty_cards.webp"  },
  { src: "icon_century_1776608000738.png",       out: "century.webp"      },
  { src: "icon_five_hundred_1776608047526.png",  out: "five_hundred.webp" },
  { src: "icon_streak_3_1776608075069.png",      out: "streak_3.webp"     },
  { src: "icon_streak_7_1776608162570.png",      out: "streak_7.webp"     },
  { src: "icon_streak_30_1776608358912.png",     out: "streak_30.webp"    },
  { src: "icon_daily_surge_1776608385212.png",   out: "daily_surge.webp"  },
  { src: "icon_master_50_1776608411255.png",     out: "master_50.webp"    },
];

const SRC_DIR = path.join(__dirname, "../assets/icons");
const OUT_DIR = path.join(__dirname, "../assets/icons");

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { src, out } of ICONS) {
    const srcPath = path.join(SRC_DIR, src);
    const outPath = path.join(OUT_DIR, out);

    const info = await sharp(srcPath)
      .resize(120, 120, { fit: "cover" })  // icon size: 120x120
      .webp({ quality: 82 })
      .toFile(outPath);

    const srcBytes = fs.statSync(srcPath).size;
    console.log(`✓ ${out}  ${(srcBytes/1024).toFixed(0)}KB → ${(info.size/1024).toFixed(0)}KB`);
  }

  console.log("\nDone! All icons compressed to assets/icons/*.webp");
})();
