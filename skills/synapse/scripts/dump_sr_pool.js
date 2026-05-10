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
// Each mastered entry now includes a `back` field extracted from the source note,
// so the skill can embed back text into anchor records for runtime display without
// relying on the target card being present in the same review session.
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

// Parse card formats (::, %%card%%, fenced ---Q:A---, plain Q:/A:) and return
// Map<front, back>. Mirrors the subset of parseFlashcards used by the plugin runtime.
// Self-contained because the script is deployed without access to the repo's src/.
function extractBacksFromMarkdown(text) {
  const backs = new Map();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const CARD_FENCE = /^\s*%%\s*card\s*%%\s*$/i;
  const STRIP_MD = s => s.replace(/^[*_=]+|[*_=]+$/g, "").trim();

  let i = 0;
  let inCodeFence = false;
  let codeFenceChar = "";
  let codeFenceLen = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Track fenced code blocks (``` or ~~~) to avoid false :: matches inside them
    const fenceMatch = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const ch = fenceMatch[1][0], len = fenceMatch[1].length;
      if (!inCodeFence) { inCodeFence = true; codeFenceChar = ch; codeFenceLen = len; i++; continue; }
      if (ch === codeFenceChar && len >= codeFenceLen) { inCodeFence = false; }
      i++; continue;
    }
    if (inCodeFence) { i++; continue; }

    // %%card%% block with embedded Q:/A: (single pair, same as plugin runtime)
    if (CARD_FENCE.test(line)) {
      const blockLines = [];
      let j = i + 1;
      while (j < lines.length && !CARD_FENCE.test(lines[j])) blockLines.push(lines[j++]);
      i = j + 1;
      let qi = -1, ai = -1;
      for (let k = 0; k < blockLines.length; k++) {
        if (qi === -1 && /^\s*Q:\s*/i.test(blockLines[k])) { qi = k; continue; }
        if (qi !== -1 && /^\s*A:\s*/i.test(blockLines[k])) { ai = k; break; }
      }
      if (qi !== -1 && ai !== -1) {
        const qm = blockLines[qi].match(/^\s*Q:\s*(.*)/i);
        const am = blockLines[ai].match(/^\s*A:\s*(.*)/i);
        const frontLines = [qm ? qm[1] : "", ...blockLines.slice(qi + 1, ai)];
        const backLines  = [am ? am[1] : "", ...blockLines.slice(ai + 1)];
        while (frontLines.length && !frontLines[frontLines.length - 1].trim()) frontLines.pop();
        while (backLines.length  && !backLines[backLines.length  - 1].trim()) backLines.pop();
        const front = frontLines.join("\n").trim();
        const back  = backLines.join("\n").trim();
        if (front && back) backs.set(front, back);
      }
      continue;
    }

    // --- fenced Q:/A: block (multiple cards inside)
    if (/^---\s*$/.test(line)) {
      let peek = i + 1;
      while (peek < lines.length && lines[peek].trim() === "") peek++;
      if (peek < lines.length && /^\s*Q:\s*/i.test(lines[peek])) {
        const fencedLines = [];
        let j = i + 1;
        while (j < lines.length && !/^---\s*$/.test(lines[j])) fencedLines.push(lines[j++]);
        i = j + 1;
        let fi = 0;
        while (fi < fencedLines.length) {
          const qmf = fencedLines[fi].match(/^\s*Q:\s*(.+)/i);
          if (!qmf) { fi++; continue; }
          const frontLines = [qmf[1]];
          fi++;
          while (fi < fencedLines.length && !/^\s*A:\s*/i.test(fencedLines[fi])) frontLines.push(fencedLines[fi++]);
          while (frontLines.length && !frontLines[frontLines.length - 1].trim()) frontLines.pop();
          const amf = fi < fencedLines.length ? fencedLines[fi].match(/^\s*A:\s*(.*)/i) : null;
          if (!amf) continue;
          const backLines = [amf[1]];
          fi++;
          while (fi < fencedLines.length && !/^\s*Q:\s*/i.test(fencedLines[fi])) backLines.push(fencedLines[fi++]);
          while (backLines.length && !backLines[backLines.length - 1].trim()) backLines.pop();
          const front = frontLines.join("\n").trim();
          const back = backLines.join("\n").trim();
          if (front && back) backs.set(front, back);
        }
        continue;
      }
    }

    // Q:/A: non-fenced (stop at 2 blank lines or next Q: or ---)
    const qaMatch = line.match(/^\s*Q:\s*(.+)/i);
    if (qaMatch) {
      const frontLines = [qaMatch[1]];
      let j = i + 1;
      while (j < lines.length && !/^\s*A:\s*/i.test(lines[j])) {
        if (lines[j].trim() !== "") frontLines.push(lines[j]);
        j++;
      }
      const am = j < lines.length ? lines[j].match(/^\s*A:\s*(.*)/i) : null;
      if (am) {
        const backLines = [am[1]];
        j++;
        let blanks = 0;
        while (j < lines.length && !/^\s*Q:\s*/i.test(lines[j]) && !/^---\s*$/.test(lines[j])) {
          if (lines[j].trim() === "") { if (++blanks >= 2) break; }
          else blanks = 0;
          backLines.push(lines[j]);
          j++;
        }
        while (backLines.length && !backLines[backLines.length - 1].trim()) backLines.pop();
        const front = frontLines.join("\n").trim();
        const back = backLines.join("\n").trim();
        if (front && back) backs.set(front, back);
        i = j;
        continue;
      }
    }

    // front :: back (single-line; skip inline-code and cloze lines)
    const sepIdx = line.indexOf("::");
    if (sepIdx >= 1) {
      const before = line.slice(0, sepIdx);
      if ((before.match(/`/g) || []).length % 2 === 0 && !/\{\{c\d+::/.test(before)) {
        const front = STRIP_MD(before.trim());
        const back = STRIP_MD(line.slice(sepIdx + 2).trim());
        if (front && back) backs.set(front, back);
      }
    }

    i++;
  }
  return backs;
}

function readBacksFromNote(notePath) {
  try {
    return extractBacksFromMarkdown(fs.readFileSync(notePath, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") console.warn(`[synapse] could not read backs from ${notePath}:`, e.message);
    return new Map();
  }
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

  // Pool gate (same threshold as runtime) — checked before the note-file reads below
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

  // Attach back text to mastered entries so the skill can embed it into anchor records.
  // Read each source note once (cache by notePath) and look up the back by front text.
  const masteredNotePaths = new Set(masteredArr.map(e => e.notePath).filter(Boolean));
  const noteBacksCache = new Map();
  for (const np of masteredNotePaths) noteBacksCache.set(np, readBacksFromNote(np));
  for (const entry of masteredArr) {
    const cache = noteBacksCache.get(entry.notePath);
    entry.back = (cache && cache.get(entry.front)) || "";
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
