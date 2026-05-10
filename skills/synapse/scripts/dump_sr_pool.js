// Synapse pool dumper — produces ONE JSON containing both mastered pool and targets
// from every engram-review/sr/*.json. Intended to be invoked once at the start of
// the engram-quest-synapse skill so the AI agent does not have to read each SR file
// individually. Output goes to stdout; errors go to stderr with non-zero exit.
//
// Usage:  node scripts/dump_sr_pool.js
//         (cwd should be the vault root — the script reads engram-review/sr/ relatively)

"use strict";

const fs = require("fs");
const path = require("path");

const SR_DIR = "engram-review/sr";
const MASTERED_STABILITY_THRESHOLD = 7;

function srFileNameToNotePath(srFileName) {
  return srFileName.replace(/__/g, "/") + ".md";
}

function main() {
  if (!fs.existsSync(SR_DIR)) {
    console.error(JSON.stringify({ error: "sr-dir-missing", path: SR_DIR }));
    process.exit(2);
  }

  const mastered = [];
  const targets = [];
  let mid = 1;
  let tid = 1;
  const fileErrors = [];

  const files = fs.readdirSync(SR_DIR).filter(f => f.endsWith(".json")).sort();

  for (const filename of files) {
    const fullPath = path.join(SR_DIR, filename);
    const stem = filename.replace(/\.json$/i, "");
    const notePath = srFileNameToNotePath(stem);

    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (e) {
      fileErrors.push({ file: filename, error: String(e && e.message || e) });
      continue;
    }

    if (!data || typeof data !== "object") continue;

    for (const front of Object.keys(data)) {
      const meta = data[front];
      const stability = (meta && typeof meta.stability === "number") ? meta.stability : 0;
      if (stability >= MASTERED_STABILITY_THRESHOLD) {
        mastered.push({ id: `m${mid++}`, front, notePath, stability });
      } else {
        targets.push({ id: `t${tid++}`, front, notePath, stability });
      }
    }
  }

  const out = {
    mastered,
    targets,
    stats: {
      masteredCount: mastered.length,
      targetCount: targets.length,
      threshold: MASTERED_STABILITY_THRESHOLD,
      filesScanned: files.length,
      fileErrors: fileErrors.length
    }
  };
  if (fileErrors.length > 0) out.stats.errorDetails = fileErrors;

  process.stdout.write(JSON.stringify(out, null, 2));
}

main();
