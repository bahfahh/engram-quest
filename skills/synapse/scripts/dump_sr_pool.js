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
// Cards are identified by note + front: two notes can hold a card with the same front
// text, and each is its own card in the pools.
//
// Stale-anchor detection: an anchor is stale iff its card (`notePath` + `front`) is NOT in
// the current mastered pool (stability ≥ 7). An anchor stored without a `notePath` (written
// before anchors carried one) is stale only when no mastered card has that front. This
// catches cards demoted from mastered (e.g. after Again rating). Anchors that point to a
// card no longer in sr/ at all are also stale.
//
// Empty-anchor targets: a target the skill paired last run but that got no anchor is
// stored as an entry with `anchors: []`. It is preserved while the mastered pool has
// not grown, and re-queued ("empty-retry") once it has — new mastered cards are the
// only thing that can give it an anchor.
//
// Each mastered entry now includes a `back` field extracted from the source note,
// so the skill can embed back text into anchor records for runtime display without
// relying on the target card being present in the same review session.
//
// Content catalog: besides cards, the dump lists the learner's other content — every
// lesson, video, explainer page and episodic-review topic — as type / ref / title only.
// Bodies are never read, so the run stays one-shot. Targets pick `relations` from it.
//   - "new-content"    — catalog entries not in synapse/_catalog.json (the snapshot the
//                         last run left with --mark-seen) are flagged `new`; targets that
//                         would otherwise be preserved are queued to look at those only.
//   - "stale-relation" — a relation whose content is no longer in the catalog.
// Each target also carries `skip`: ids of candidates it must not be paired with, because
// the plugin already draws that link from the vault's own data or the user rejected it.
//
// Usage:  node scripts/dump_sr_pool.js [--full]
//         node scripts/dump_sr_pool.js --mark-seen <catalogToken>
//             (the only call that writes a file; the token comes from the dump the
//              run worked from, so content added while pairing is not marked as seen)
//         (cwd should be the vault root)

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SR_DIR = "engram-review/sr";
const SYNAPSE_DIR = "engram-review/synapse";
const STATUS_FILE = path.join(SYNAPSE_DIR, "_status.json");
const CATALOG_SEEN_FILE = path.join(SYNAPSE_DIR, "_catalog.json");
const HINTS_DIR = "engram-review/hints";
const AI_CARDS_DIR = "engram-review/ai-cards";
const LESSONS_DIR = "engram-quest/lessons";
const VIDEOS_DIR = "engram-quest/videos";
const EXPLAINER_META_DIR = "engram-quest/explainer/meta";
const TOPICS_DIR = "engram-quest/episodic-review/topics";
const MASTERED_STABILITY_THRESHOLD = 7;

const forceFull = process.argv.includes("--full");
const markSeenAt = process.argv.indexOf("--mark-seen");
const markSeen = markSeenAt >= 0;
const markSeenToken = markSeen ? process.argv[markSeenAt + 1] : undefined;

// A schedule file is named after its note's path with "/" turned into "__", so a note whose own name
// holds "__" (AI card files are named "A__note.md") reads back ambiguously. Take the reading that
// exists on disk, folders first; with none on disk, every "__" is a folder.
function srFileNameToNotePath(srFileName) {
  const parts = srFileName.split("__");
  const gaps = parts.length - 1;
  if (gaps > 0 && gaps <= 10) {
    for (let mask = (1 << gaps) - 1; mask >= 0; mask--) {
      let candidate = parts[0];
      for (let i = 1; i < parts.length; i++) candidate += (mask & (1 << (gaps - i)) ? "/" : "__") + parts[i];
      if (fs.existsSync(candidate + ".md")) return candidate + ".md";
    }
  }
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
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

// Stored lists are AI-written; anything that is not an array counts as empty.
function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function listFolders(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
  } catch {
    return [];
  }
}

// A string, or a list of strings, as a list of non-empty strings.
function asList(value) {
  return (Array.isArray(value) ? value : [value]).filter(v => typeof v === "string" && v);
}

// Identity of a catalog item or a stored relation: "<type>|<ref>". Also the key the
// plugin uses in userRejected for a rejected relation.
const catalogKey = item => `${item.type}|${item.ref}`;
const CATALOG_TYPES = new Set(["lesson", "video", "explainer", "topic"]);

// Fingerprint of a catalog's contents. The dump carries it and --mark-seen takes it back,
// so the snapshot is only written when the catalog is still the one the run paired from.
function catalogTokenOf(items) {
  return crypto.createHash("sha1").update(items.map(catalogKey).sort().join("\n")).digest("hex").slice(0, 12);
}

// Titles go into a prompt line each: one line, bounded length.
function cleanTitle(value) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 200);
}

// The learner's other content, titles only. Refs are the ids the plugin opens each item
// by (src/lessons/data.js, src/videos/data.js, src/explainer/data.js). A missing folder
// or an unreadable file contributes nothing.
//
// `explicit` records the links the plugin already draws without AI, so a target can skip
// them: the cards file attached to a video, the card an explainer was written for, and
// the notes (and the topic file itself) behind an episodic-review topic. Keys are a note
// path, or "<note path>\n<card front>" for a single card.
function buildCatalog() {
  const items = [];
  const keys = new Set();
  const explicit = new Map();
  const push = (type, ref, title, group) => {
    const item = { id: `c${items.length + 1}`, type, ref, title: cleanTitle(title) };
    if (group) item.group = cleanTitle(group);
    const key = catalogKey(item);
    // Two entries with one id (a duplicated lesson id) are one item to the plugin.
    if (!keys.has(key)) {
      keys.add(key);
      items.push(item);
    }
    return key;
  };
  const link = (from, key) => {
    if (!explicit.has(from)) explicit.set(from, new Set());
    explicit.get(from).add(key);
  };

  for (const slug of listFolders(LESSONS_DIR)) {
    const meta = readJsonOrNull(path.join(LESSONS_DIR, slug, "meta.json"));
    if (!meta || !Array.isArray(meta.lessons)) continue;
    for (const lesson of meta.lessons) {
      // No file = a planned outline entry; there is nothing to open yet.
      if (!lesson || !lesson.file) continue;
      push("lesson", `${slug}/${lesson.id || `file-${lesson.file}`}`, lesson.title || lesson.file, meta.title || slug);
    }
  }

  for (const slug of listFolders(VIDEOS_DIR)) {
    const meta = readJsonOrNull(path.join(VIDEOS_DIR, slug, "meta.json"));
    // Recall films (kind "episodic") replay many topics at once; the topics are listed below instead.
    if (!meta || meta.kind === "episodic" || !Array.isArray(meta.videos)) continue;
    for (const video of meta.videos) {
      if (!video || !video.id || !video.file) continue;
      const key = push("video", `${slug}/${video.id}`, video.title || video.file, meta.title || slug);
      if (typeof video.cards === "string" && video.cards) link(video.cards, key);
    }
  }

  for (const filename of listJsonFiles(EXPLAINER_META_DIR)) {
    const page = readJsonOrNull(path.join(EXPLAINER_META_DIR, filename));
    if (!page || !page.id) continue;
    const key = push("explainer", String(page.id), page.title || page.id);
    const card = page.sourceCard;
    if (card && card.note && card.front) link(`${card.note}\n${card.front}`, key);
  }

  for (const folder of listFolders(TOPICS_DIR)) {
    const topicFile = `${TOPICS_DIR}/${folder}/topic.json`;
    const topic = readJsonOrNull(topicFile);
    if (!topic || typeof topic !== "object" || Array.isArray(topic)) continue;
    const key = push("topic", folder, topic.title || folder);
    for (const note of [topicFile, ...asList(topic.notes)]) link(note, key);
  }

  return { items, explicit };
}

// The notes a card was made from: its own file plus what its hints file records. Follows
// the plugin: hints are named by the note's full path, or by its bare name for AI card
// files and older hints (hintsPath / loadHints in src/review/helpers.js); a card's own
// `source` replaces the file-level `note`, and `source: null` means it has none
// (src/review/decks.js).
const hintsCache = new Map();
function sourceNotesOf(target) {
  if (!hintsCache.has(target.notePath)) {
    const bare = target.notePath.split("/").pop().replace(/\.md$/i, "");
    const full = target.notePath.replace(/\//g, "__").replace(/\.md$/i, "");
    const names = target.notePath.startsWith(`${AI_CARDS_DIR}/`) ? [bare] : [full, bare];
    let hints = null;
    for (const name of names) {
      hints = readJsonOrNull(path.join(HINTS_DIR, `${name}.json`));
      if (hints) break;
    }
    hintsCache.set(target.notePath, hints);
  }
  const hints = hintsCache.get(target.notePath);
  const cards = hints && hints.cards;
  const card = Array.isArray(cards)
    ? cards.find(c => c && c.front === target.front)
    : cards && typeof cards === "object" ? cards[target.front] : null;
  const sources = card && typeof card === "object" && "source" in card ? card.source : hints && hints.note;
  return [target.notePath, ...asList(sources)];
}

// Ids of the candidates a target must not be paired with: catalog items the plugin
// already links to it, and anchors or relations the user rejected.
function skipIdsFor(target, userRejected, { explicit, catalogByKey, masteredByFront, masteredByKey }) {
  const skip = new Set();
  for (const note of sourceNotesOf(target)) {
    for (const from of [note, `${note}\n${target.front}`]) {
      for (const key of explicit.get(from) || []) skip.add(catalogByKey.get(key).id);
    }
  }
  for (const key of userRejected) {
    // A relation is rejected as "<type>|<ref>"; an anchor as "<notePath>|<front>", or as the bare
    // front in older entries, which rejects every mastered card with that front.
    const hits = catalogByKey.has(key) ? [catalogByKey.get(key)]
      : masteredByKey.has(key) ? [masteredByKey.get(key)]
        : masteredByFront.get(key) || [];
    for (const hit of hits) skip.add(hit.id);
  }
  return [...skip];
}

// Pretty-printed like every other mode, with the catalog appended one entry per line:
// it is the longest list in the dump and each entry is read as a single line.
function writeDumpWithCatalog(doc, catalog) {
  const head = JSON.stringify(doc, null, 2).replace(/\n}$/, "");
  const lines = catalog.map(item => `    ${JSON.stringify(item)}`).join(",\n");
  process.stdout.write(`${head},\n  "catalog": [${lines ? `\n${lines}\n  ` : ""}]\n}`);
}

function loadSeenCatalogKeys() {
  const doc = readJsonOrNull(CATALOG_SEEN_FILE);
  return new Set(asList(doc && doc.seen));
}

// A card's identity across notes. A note path never contains "|"; a front may. The same form is
// the key the plugin uses in userRejected for an anchor.
const cardKey = card => `${card.notePath}|${card.front}`;

// Mastered cards grouped by front, for what is stored by front alone (legacy anchors and rejections).
function groupByFront(cards) {
  const byFront = new Map();
  for (const card of cards) {
    if (!byFront.has(card.front)) byFront.set(card.front, []);
    byFront.get(card.front).push(card);
  }
  return byFront;
}

function buildPoolsFromSr() {
  if (!fs.existsSync(SR_DIR)) {
    return { error: "sr-dir-missing", path: SR_DIR };
  }
  const masteredByKey = new Map(); // "<notePath>|<front>" -> { id, front, notePath, stability }
  const targetsByKey = new Map();  // "<notePath>|<front>" -> { id, front, notePath, stability }
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
        masteredByKey.set(cardKey(entry), { id: `m${mid++}`, ...entry });
      } else {
        targetsByKey.set(cardKey(entry), { id: `t${tid++}`, ...entry });
      }
    }
  }
  return { masteredByKey, targetsByKey, fileErrors };
}

// A stored entry is found by the synapse file it is in plus the card front. The file named
// after the card's current note is the only one the plugin reads, so an entry left behind
// under an old note path does not count as "already paired" (and cannot be merged into).
const entryKey = (synapseFile, front) => `${synapseFile}\n${front}`;
const entryKeyOf = target =>
  entryKey(target.notePath.replace(/\//g, "__").replace(/\.md$/i, "") + ".json", target.front);
function priorEntryOf(existingEntries, target) {
  return existingEntries.get(entryKeyOf(target));
}

function loadExistingSynapseFiles() {
  // Map: entryKey -> { front, synapseFile, anchors: [{ front, notePath? }], relationKeys: Set<"type|ref">, userRejected: string[] }
  // Entries written before relations existed simply have no relation keys.
  const existingEntries = new Map();
  const skillFiles = [];
  if (!fs.existsSync(SYNAPSE_DIR)) return { existingEntries, skillFiles };

  for (const filename of listJsonFiles(SYNAPSE_DIR)) {
    if (filename === "_status.json" || filename === "_catalog.json") continue;
    const fullPath = path.join(SYNAPSE_DIR, filename);
    const doc = readJsonOrNull(fullPath);
    if (!doc || !doc.cards) continue;
    skillFiles.push(filename);
    const sourceNotePath = doc._meta && doc._meta.sourceNotePath;
    for (const front of Object.keys(doc.cards)) {
      const entry = doc.cards[front];
      const anchors = arrayOrEmpty(entry && entry.anchors)
        .filter(a => a && a.front)
        .map(a => ({ front: a.front, notePath: typeof a.notePath === "string" && a.notePath ? a.notePath : null }));
      const relationKeys = new Set(
        arrayOrEmpty(entry && entry.relations).filter(r => r && r.type && r.ref).map(catalogKey)
      );
      existingEntries.set(entryKey(filename, front), {
        front,
        notePath: sourceNotePath || srFileNameToNotePath(filename.replace(/\.json$/i, "")),
        synapseFile: filename,
        anchors,
        relationKeys,
        userRejected: asList(entry && entry.userRejected)
      });
    }
  }
  return { existingEntries, skillFiles };
}

function decideMode({ status, masteredCount, forceFull }) {
  if (forceFull) return "full";
  if (!status || !status.generatedAt) return "full";
  if (status.enabled === false) return "full"; // probably first successful run after pool grew
  // Threshold: pool size changed by at least max(10, 20% of last run's size) → force full.
  const last = status.masteredPoolSize || 0;
  const now = masteredCount;
  if (last > 0 && Math.abs(now - last) >= Math.max(10, last * 0.2)) return "full";
  // Otherwise incremental (workQueue may still end up empty → caller emits noop)
  return "incremental";
}

function buildWorkQueue({ masteredByKey, masteredByFront, targetsByKey, existingEntries, poolGrew, catalogByKey, hasNewContent }) {
  const newTargets = [];     // targets with no entry in their note's synapse file
  const staleTargets = [];   // targets whose existing anchors include cards no longer mastered
  const staleRelationTargets = []; // targets with a relation to content that is no longer in the catalog
  const emptyRetryTargets = []; // targets that got no anchors last run, retried after pool growth
  const newContentTargets = []; // otherwise-preserved targets that only need to look at new catalog entries
  const preservedFronts = []; // fronts of targets whose anchors and relations are all still valid

  for (const target of targetsByKey.values()) {
    const prior = priorEntryOf(existingEntries, target);
    if (!prior) {
      newTargets.push({ ...target, reason: "new-target" });
      continue;
    }
    const stale = [];
    for (const anchor of prior.anchors) {
      const mastered = anchor.notePath ? masteredByKey.has(cardKey(anchor)) : masteredByFront.has(anchor.front);
      if (!mastered) stale.push(anchor.front);
    }
    // Only types the catalog lists can be checked; any other relation is left alone.
    const staleRelations = [...prior.relationKeys].filter(
      key => CATALOG_TYPES.has(key.split("|")[0]) && !catalogByKey.has(key)
    );
    if (stale.length > 0) {
      staleTargets.push({ ...target, reason: "stale-anchor", staleAnchors: stale });
    } else if (staleRelations.length > 0) {
      staleRelationTargets.push({ ...target, reason: "stale-relation", staleRelations });
    } else if (prior.anchors.length === 0 && poolGrew) {
      emptyRetryTargets.push({ ...target, reason: "empty-retry" });
    } else if (hasNewContent) {
      newContentTargets.push({ ...target, reason: "new-content" });
    } else {
      preservedFronts.push(target.front);
    }
  }
  return { newTargets, staleTargets, staleRelationTargets, emptyRetryTargets, newContentTargets, preservedFronts };
}

function main() {
  const result = buildPoolsFromSr();
  if (result.error) {
    process.stdout.write(JSON.stringify({ mode: "error", error: result.error, path: result.path }, null, 2));
    process.exit(2);
  }
  const { masteredByKey, targetsByKey, fileErrors } = result;

  // Called once the run's files are written: remember the catalog the run paired from, so
  // the next run only treats later content as new. If the catalog changed in between
  // (another session added a lesson while this one was pairing), nothing is written: the
  // next run then offers the same entries again, which costs a pass but loses nothing.
  if (markSeen) {
    const items = buildCatalog().items;
    if (catalogTokenOf(items) !== markSeenToken) {
      process.stdout.write(JSON.stringify({
        mode: "not-marked",
        reason: markSeenToken ? "catalog-changed-since-dump" : "catalog-token-missing",
        catalogCount: items.length
      }, null, 2));
      return;
    }
    const seen = items.map(catalogKey);
    fs.mkdirSync(SYNAPSE_DIR, { recursive: true });
    fs.writeFileSync(CATALOG_SEEN_FILE, JSON.stringify({ markedAt: new Date().toISOString(), seen }, null, 2));
    process.stdout.write(JSON.stringify({
      mode: "marked-seen",
      catalogCount: seen.length,
      file: `${SYNAPSE_DIR}/_catalog.json`
    }, null, 2));
    return;
  }

  const status = readJsonOrNull(STATUS_FILE);
  const { existingEntries, skillFiles } = loadExistingSynapseFiles();

  const masteredArr = [...masteredByKey.values()];
  const targetsArr = [...targetsByKey.values()];
  const masteredByFront = groupByFront(masteredArr);

  const mode = decideMode({ status, masteredCount: masteredArr.length, forceFull });

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

  const { items: catalog, explicit } = buildCatalog();
  const lookups = {
    explicit,
    catalogByKey: new Map(catalog.map(item => [catalogKey(item), item])),
    masteredByFront,
    masteredByKey
  };
  // Attach what the target must not be paired with, and the rejections to carry over
  // into its written entry. Both fields are omitted when empty.
  const withExclusions = target => {
    const prior = priorEntryOf(existingEntries, target);
    const userRejected = prior ? prior.userRejected : [];
    const skip = skipIdsFor(target, userRejected, lookups);
    return {
      ...target,
      ...(skip.length ? { skip } : {}),
      ...(userRejected.length ? { userRejected } : {})
    };
  };

  const catalogToken = catalogTokenOf(catalog);

  if (mode === "full" || forceFull) {
    // A full run regenerates each file from its targets. Entries of cards that are not
    // targets now but hold user rejections are named so the skill carries them over.
    const targetKeys = new Set(targetsArr.map(entryKeyOf));
    const keepEntries = [...existingEntries]
      .filter(([key, entry]) => entry.userRejected.length > 0 && !targetKeys.has(key))
      .map(([, entry]) => ({ file: entry.synapseFile, front: entry.front }));

    writeDumpWithCatalog({
      mode: "full",
      forced: forceFull,
      previousMasteredPoolSize: status ? (status.masteredPoolSize || 0) : 0,
      catalogToken,
      stats: {
        masteredCount: masteredArr.length,
        targetCount: targetsArr.length,
        catalogCount: catalog.length,
        existingSynapseFiles: skillFiles.length,
        threshold: MASTERED_STABILITY_THRESHOLD,
        filesScanned: listJsonFiles(SR_DIR).length,
        fileErrors: fileErrors.length
      },
      mastered: masteredArr,
      targets: targetsArr.map(withExclusions),
      ...(keepEntries.length ? { keepEntries } : {})
    }, catalog);
    return;
  }

  // Incremental
  const seen = loadSeenCatalogKeys();
  const newCatalog = catalog.filter(item => !seen.has(catalogKey(item)));
  for (const item of newCatalog) item.new = true;

  const poolGrew = masteredArr.length > ((status && status.masteredPoolSize) || 0);
  const {
    newTargets, staleTargets, staleRelationTargets, emptyRetryTargets, newContentTargets, preservedFronts
  } = buildWorkQueue({
    masteredByKey, masteredByFront, targetsByKey, existingEntries, poolGrew,
    catalogByKey: lookups.catalogByKey, hasNewContent: newCatalog.length > 0
  });
  const workQueue = [
    ...newTargets, ...staleTargets, ...staleRelationTargets, ...emptyRetryTargets, ...newContentTargets
  ].map(withExclusions);

  if (workQueue.length === 0) {
    process.stdout.write(JSON.stringify({
      mode: "noop",
      reason: "no-changes-since-last-run",
      stats: {
        masteredCount: masteredArr.length,
        targetCount: targetsArr.length,
        catalogCount: catalog.length,
        preservedTargets: preservedFronts.length,
        threshold: MASTERED_STABILITY_THRESHOLD,
        filesScanned: listJsonFiles(SR_DIR).length,
        fileErrors: fileErrors.length
      }
    }, null, 2));
    return;
  }

  writeDumpWithCatalog({
    mode: "incremental",
    catalogToken,
    stats: {
      masteredCount: masteredArr.length,
      targetCount: targetsArr.length,
      catalogCount: catalog.length,
      newCatalog: newCatalog.length,
      newTargets: newTargets.length,
      staleTargets: staleTargets.length,
      staleRelationTargets: staleRelationTargets.length,
      emptyRetryTargets: emptyRetryTargets.length,
      newContentTargets: newContentTargets.length,
      preservedTargets: preservedFronts.length,
      threshold: MASTERED_STABILITY_THRESHOLD,
      filesScanned: listJsonFiles(SR_DIR).length,
      fileErrors: fileErrors.length
    },
    mastered: masteredArr,    // LLM still needs the FULL pool to pick anchors from
    workQueue,                // ONLY these go through the LLM
    preservedFronts           // skill must NOT touch synapse files for these
  }, catalog);                // the full catalog; entries added since the last run carry `new: true`
}

main();
