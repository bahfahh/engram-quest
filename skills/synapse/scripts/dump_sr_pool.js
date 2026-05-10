// Synapse pool + diff dumper.
//
// Reads engram-review/sr/*.json (current SR state) and engram-review/synapse/*.json
// (last run's anchor recommendations) to decide whether the upcoming Synapse run
// should be:
//   "full"        — first run, or _status.json missing, or --full forced.
//                    LLM must process every target.
//   "incremental" — _status.json exists; only new targets and targets with stale
//                    anchors need LLM work. Other targets are preserved as-is.
//   "noop"        — nothing changed since last run. Skill should bump generatedAt
//                    and exit without an LLM call.
//
// Stale-anchor detection: an anchor is stale iff its `front` is NOT in the current
// mastered pool (stability ≥ 7). This catches cards demoted from mastered (e.g.
// after Again rating). Anchors that point to a card no longer in sr/ at all are
// also stale.
//
// Usage:  node scripts/dump_sr_pool.js [--full]
//         (cwd should be the vault root)

"use strict";

const fs = require("fs");
const path = require("path");

const SR_DIR = "engram-review/sr";
const SYNAPSE_DIR = "engram-review/synapse";
const STATUS_FILE = path.join(SYNAPSE_DIR, "_status.json");
const MASTERED_STABILITY_THRESHOLD = 7;

const forceFull = process.argv.includes("--full");

function srFileNameToNotePath(srFileName) {
  return srFileName.replace(/__/g, "/") + ".md";
}

function readJsonOrNull(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
}

function buildPoolsFromSr() {
  if (!fs.existsSync(SR_DIR)) {
    return { error: "sr-dir-missing", path: SR_DIR };
  }
  const masteredByFront = new Map(); // front -> { id, front, notePath, stability }
  const targetsByFront = new Map();  // front -> { id, front, notePath, stability }
  const fileErrors = [];
  let mid = 1, tid = 1;

  for (const filename of listJsonFiles(SR_DIR)) {
    const fullPath = path.join(SR_DIR, filename);
    const stem = filename.replace(/\.json$/i, "");
    const notePath = srFileNameToNotePath(stem);
    const data = readJsonOrNull(fullPath);
    if (!data) { fileErrors.push(filename); continue; }
    if (typeof data !== "object") continue;

    for (const front of Object.keys(data)) {
      const meta = data[front];
      const stability = (meta && typeof meta.stability === "number") ? meta.stability : 0;
      const entry = { front, notePath, stability };
      if (stability >= MASTERED_STABILITY_THRESHOLD) {
        masteredByFront.set(front, { id: `m${mid++}`, ...entry });
      } else {
        targetsByFront.set(front, { id: `t${tid++}`, ...entry });
      }
    }
  }
  return { masteredByFront, targetsByFront, fileErrors };
}

function loadExistingSynapseFiles() {
  // Map: targetFront -> { notePath, anchorFronts: Set<front> }
  const existingByFront = new Map();
  const skillFiles = [];
  if (!fs.existsSync(SYNAPSE_DIR)) return { existingByFront, skillFiles };

  for (const filename of listJsonFiles(SYNAPSE_DIR)) {
    if (filename === "_status.json") continue;
    const fullPath = path.join(SYNAPSE_DIR, filename);
    const doc = readJsonOrNull(fullPath);
    if (!doc || !doc.cards) continue;
    skillFiles.push(filename);
    const sourceNotePath = doc._meta && doc._meta.sourceNotePath;
    for (const front of Object.keys(doc.cards)) {
      const entry = doc.cards[front];
      const anchorFronts = new Set(
        ((entry && entry.anchors) || []).map(a => a && a.front).filter(Boolean)
      );
      existingByFront.set(front, {
        notePath: sourceNotePath || srFileNameToNotePath(filename.replace(/\.json$/i, "")),
        synapseFile: filename,
        anchorFronts
      });
    }
  }
  return { existingByFront, skillFiles };
}

function decideMode({ status, masteredByFront, targetsByFront, existingByFront, forceFull }) {
  if (forceFull) return "full";
  if (!status || !status.generatedAt) return "full";
  if (status.enabled === false) return "full"; // probably first successful run after pool grew
  // Threshold: if mastered pool size grew/shrank by > 20% (and at least 10), force full.
  const last = status.masteredPoolSize || 0;
  const now = masteredByFront.size;
  if (last > 0 && Math.abs(now - last) >= Math.max(10, last * 0.2)) return "full";
  // Otherwise incremental (workQueue may still end up empty → caller emits noop)
  return "incremental";
}

function buildWorkQueue({ masteredByFront, targetsByFront, existingByFront }) {
  const newTargets = [];     // targets with no existing synapse entry
  const staleTargets = [];   // targets whose existing anchors include cards no longer mastered
  const preservedFronts = []; // targets whose anchors are all still valid

  for (const [front, target] of targetsByFront) {
    const prior = existingByFront.get(front);
    if (!prior) {
      newTargets.push({ ...target, reason: "new-target" });
      continue;
    }
    const stale = [];
    for (const anchorFront of prior.anchorFronts) {
      if (!masteredByFront.has(anchorFront)) stale.push(anchorFront);
    }
    if (stale.length > 0) {
      staleTargets.push({ ...target, reason: "stale-anchor", staleAnchors: stale });
    } else if (prior.anchorFronts.size === 0) {
      // Target was processed last time but yielded no anchors. Don't redo unless full.
      preservedFronts.push(front);
    } else {
      preservedFronts.push(front);
    }
  }
  return { newTargets, staleTargets, preservedFronts };
}

function main() {
  const result = buildPoolsFromSr();
  if (result.error) {
    process.stdout.write(JSON.stringify({ mode: "error", error: result.error, path: result.path }, null, 2));
    process.exit(2);
  }
  const { masteredByFront, targetsByFront, fileErrors } = result;
  const status = readJsonOrNull(STATUS_FILE);
  const { existingByFront, skillFiles } = loadExistingSynapseFiles();

  const mode = decideMode({ status, masteredByFront, targetsByFront, existingByFront, forceFull });

  const masteredArr = [...masteredByFront.values()];
  const targetsArr = [...targetsByFront.values()];

  // Pool gate (same threshold as runtime)
  if (masteredArr.length < 10) {
    process.stdout.write(JSON.stringify({
      mode: "pool-too-small",
      stats: {
        masteredCount: masteredArr.length,
        targetCount: targetsArr.length,
        threshold: 10,
        filesScanned: listJsonFiles(SR_DIR).length,
        fileErrors: fileErrors.length
      }
    }, null, 2));
    return;
  }

  if (mode === "full" || forceFull) {
    process.stdout.write(JSON.stringify({
      mode: "full",
      forced: forceFull,
      previousMasteredPoolSize: status ? (status.masteredPoolSize || 0) : 0,
      stats: {
        masteredCount: masteredArr.length,
        targetCount: targetsArr.length,
        existingSynapseFiles: skillFiles.length,
        threshold: MASTERED_STABILITY_THRESHOLD,
        filesScanned: listJsonFiles(SR_DIR).length,
        fileErrors: fileErrors.length
      },
      mastered: masteredArr,
      targets: targetsArr
    }, null, 2));
    return;
  }

  // Incremental
  const { newTargets, staleTargets, preservedFronts } = buildWorkQueue({
    masteredByFront, targetsByFront, existingByFront
  });
  const workQueue = [...newTargets, ...staleTargets];

  if (workQueue.length === 0) {
    process.stdout.write(JSON.stringify({
      mode: "noop",
      reason: "no-changes-since-last-run",
      stats: {
        masteredCount: masteredArr.length,
        targetCount: targetsArr.length,
        preservedTargets: preservedFronts.length,
        threshold: MASTERED_STABILITY_THRESHOLD,
        filesScanned: listJsonFiles(SR_DIR).length,
        fileErrors: fileErrors.length
      }
    }, null, 2));
    return;
  }

  process.stdout.write(JSON.stringify({
    mode: "incremental",
    stats: {
      masteredCount: masteredArr.length,
      targetCount: targetsArr.length,
      newTargets: newTargets.length,
      staleTargets: staleTargets.length,
      preservedTargets: preservedFronts.length,
      threshold: MASTERED_STABILITY_THRESHOLD,
      filesScanned: listJsonFiles(SR_DIR).length,
      fileErrors: fileErrors.length
    },
    mastered: masteredArr,    // LLM still needs the FULL pool to pick anchors from
    workQueue,                // ONLY these go through the LLM
    preservedFronts           // skill must NOT touch synapse files for these
  }, null, 2));
}

main();
