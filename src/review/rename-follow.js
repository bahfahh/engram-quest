"use strict";
// When a note is renamed or moved, data that points at it by path has to follow, or memory anchors,
// Deep Dive links and video sources quietly stop resolving. Review schedules and quest state are moved
// by the rename handler in main.js, which also calls followCardFilesRename for hints and AI cards;
// followNoteRenames covers the rest.
//
// Moving a folder fires one rename event per note. They are collected for a moment and applied as one
// batch, one at a time, so each data file is read and written once per batch and two events never
// rewrite the same file at the same time.

const { srFileName, HINTS_DIR, AI_CARDS_DIR, nameKey } = require("./helpers");

const SYNAPSE_DIR = "engram-review/synapse";
const EXPLAINER_META_DIR = "engram-quest/explainer/meta";
const EXPLAINER_QUEUE = "engram-quest/explainer/queue.json";
const VIDEOS_DIR = "engram-quest/videos";
const BATCH_MS = 500;

// A link the user rejected in a synapse file (userRejected in src/review/synapse.js) is kept as
// "note|<path>" for a note, "<path>|<front>" for a mastered-card anchor, "<type>|<ref>" for other content.
const REJECTED_KEY = "userRejected";
const REJECTED_NOTE = "note|";

// The part before the first "|" is the note path; a card front after it may contain "|" itself,
// but a note path never does.
function replaceRejectedKey(value, moves, followPathKeys) {
  const bar = value.indexOf("|");
  const head = bar === -1 ? "" : value.slice(0, bar);
  if (head === REJECTED_NOTE.slice(0, -1)) {
    const ref = value.slice(bar + 1);
    return moves.has(ref) ? { value: REJECTED_NOTE + moves.get(ref), changed: true } : { value, changed: false };
  }
  return followPathKeys && moves.has(head) ? { value: moves.get(head) + value.slice(bar), changed: true } : { value, changed: false };
}

/**
 * `value` with every string that is a key of `moves` replaced by its new path; `changed` says whether any was.
 * Inside a `userRejected` list the keys that start with a path are followed too. Elsewhere a string that
 * only starts with a path is left alone: it may be a card front.
 */
function replacePaths(value, moves, inRejected = false) {
  if (typeof value === "string") {
    if (moves.has(value)) return { value: moves.get(value), changed: true };
    return replaceRejectedKey(value, moves, inRejected);
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => { const r = replacePaths(v, moves, inRejected); changed = changed || r.changed; return r.value; });
    return { value: changed ? out : value, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) { const r = replacePaths(v, moves, k === REJECTED_KEY); changed = changed || r.changed; out[k] = r.value; }
    return { value: changed ? out : value, changed };
  }
  return { value, changed: false };
}

async function readJson(adapter, path) {
  try { return JSON.parse(await adapter.read(path)); } catch { return undefined; }
}

async function listJson(adapter, dir) {
  if (!(await adapter.exists(dir))) return [];
  return (await adapter.list(dir)).files.filter((p) => p.endsWith(".json"));
}

// Rewrites one JSON file when it mentions a moved path (to `target` when the file itself moves);
// unreadable files are left alone.
/** Two paths that differ only in letter case or Unicode form are one file on Windows and macOS. */
const sameFile = (a, b) => nameKey(a) === nameKey(b);

/**
 * Put `data` at `to` and drop `from`. When both names are one file on this disk (`sameFile`),
 * writing the new name and then removing the old one would delete it: the file is renamed through a
 * temporary name instead, which also gives it the new spelling. Every step that fails leaves the data
 * under `from` (a failed second rename is undone), so a failure never leaves it only in the temporary file.
 */
async function replaceFile(adapter, from, to, data) {
  if (from === to) return adapter.write(to, data);
  if (!sameFile(from, to)) {
    await adapter.write(to, data);
    await adapter.remove(from);
    return;
  }
  const temp = `${to}.moving`;
  if (typeof adapter.rename === "function") {
    await adapter.rename(from, temp);
    try { await adapter.rename(temp, to); } catch (e) {
      await adapter.rename(temp, from).catch(() => {});
      throw e;
    }
    await adapter.write(to, data);
    return;
  }
  await adapter.write(temp, data);
  await adapter.remove(from);
  try { await adapter.write(to, data); } catch (e) {
    await adapter.write(from, data).then(() => adapter.remove(temp)).catch(() => {});
    throw e;
  }
  await adapter.remove(temp);
}

async function rewrite(adapter, path, moves, target = path) {
  const data = await readJson(adapter, path);
  if (data === undefined) return;
  const r = replacePaths(data, moves);
  if (!r.changed && target === path) return;
  await replaceFile(adapter, path, target, JSON.stringify(r.value, null, 2));
}

/** Apply a set of note moves (old path → new path) to every file that cites notes by path. */
async function followNoteRenames(adapter, moves) {
  if (!moves.size) return;
  // A note's own anchors file is named after its path; it moves with the note unless the new name is taken.
  for (const [from, to] of moves) {
    const ownOld = `${SYNAPSE_DIR}/${srFileName(from)}.json`;
    const ownNew = `${SYNAPSE_DIR}/${srFileName(to)}.json`;
    if (ownOld !== ownNew && (await adapter.exists(ownOld)) && (sameFile(ownOld, ownNew) || !(await adapter.exists(ownNew)))) {
      await rewrite(adapter, ownOld, moves, ownNew);
    }
  }
  const files = [...(await listJson(adapter, SYNAPSE_DIR)), ...(await listJson(adapter, EXPLAINER_META_DIR)), EXPLAINER_QUEUE];
  if (await adapter.exists(VIDEOS_DIR)) {
    for (const folder of (await adapter.list(VIDEOS_DIR)).folders) files.push(`${folder}/meta.json`);
  }
  for (const path of files) {
    if (await adapter.exists(path)) await rewrite(adapter, path, moves);
  }
}

async function moveFile(adapter, from, to, edit) {
  if (!(await adapter.exists(from))) return false;
  let data = await adapter.read(from);
  if (edit) data = edit(data);
  if (from === to && !edit) return true;
  await replaceFile(adapter, from, to, data);
  return true;
}

/**
 * A renamed note's hints and the AI card file made from it follow the note. Both are named by the
 * note's full path (`A__note`) or, when written before that, by its name alone (`note`); each kind
 * moves to the same kind of name, so a note and its AI cards keep sharing one hints file. An AI card
 * file takes its review schedule along.
 */
async function followCardFilesRename(adapter, oldPath, newPath) {
  const swap = (v) => (Array.isArray(v) ? v.map((e) => (e === oldPath ? newPath : e)) : v === oldPath ? newPath : v);
  const fixHints = (raw) => {
    try {
      const hints = JSON.parse(raw);
      hints.note = swap(hints.note);
      for (const entry of Object.values(hints.cards && typeof hints.cards === "object" ? hints.cards : {})) {
        if (entry && Object.prototype.hasOwnProperty.call(entry, "source")) entry.source = swap(entry.source);
      }
      return JSON.stringify(hints, null, 2);
    } catch { return raw; }
  };
  const name = (p) => p.split("/").pop().replace(/\.md$/i, "");
  const keys = new Map([[srFileName(oldPath), srFileName(newPath)], [name(oldPath), name(newPath)]]);
  for (const [from, to] of keys) {
    await moveFile(adapter, `${HINTS_DIR}/${from}.json`, `${HINTS_DIR}/${to}.json`, fixHints);
    const card = `${AI_CARDS_DIR}/${from}.md`;
    const cardTo = `${AI_CARDS_DIR}/${to}.md`;
    if (card !== cardTo && (await moveFile(adapter, card, cardTo))) {
      for (const dir of ["engram-review/sr", SYNAPSE_DIR]) {
        await moveFile(adapter, `${dir}/${srFileName(card)}.json`, `${dir}/${srFileName(cardTo)}.json`);
      }
    }
  }
}

// One pending batch per adapter; batches run one after another.
let pending = null;
let chain = Promise.resolve();

/** Record a note move; it is applied with any others that arrive within BATCH_MS. */
function queueNoteRename(adapter, from, to) {
  if (!pending || pending.adapter !== adapter) pending = { adapter, moves: new Map(), timer: null };
  const batch = pending;
  // A → B then B → C in one batch means A → C.
  for (const [k, v] of batch.moves) if (v === from) batch.moves.set(k, to);
  if (!batch.moves.has(from)) batch.moves.set(from, to);
  if (batch.timer) window.clearTimeout(batch.timer);
  batch.timer = window.setTimeout(() => {
    if (pending === batch) pending = null;
    chain = chain
      .then(() => followNoteRenames(batch.adapter, batch.moves))
      .catch((e) => console.warn("EngramQuest: failed to update note paths after a rename", e));
  }, BATCH_MS);
}

module.exports = { followNoteRenames, followCardFilesRename, queueNoteRename, replacePaths, replaceFile };
