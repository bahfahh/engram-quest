"use strict";
// scan-cache.js
// What the Hub's scans read, kept per file and reused while the file is unchanged.
//
// Opening the Hub used to read every deck note, its schedule (sr/) file and its hints file, plus every
// note with a code block (to find quest maps), on every open. On a phone each read crosses the native
// bridge, so a large vault took seconds. Each entry here is keyed by the file's stamp: its modified time
// and size from Obsidian's file index, which is in memory, so checking it costs no disk access. A file
// whose stamp is unchanged is not read again.
//
// The stamp is not enough for files the plugin writes itself through the adapter: on a phone the index
// may not see such a write. Those writers update or drop their entry here (updateSrData in helpers.js,
// the hints writers in edit.js, create.js for card notes).
//
// Stores: notes  (deck note -> its deck name and parsed cards)
//         sr     (sr/ file -> schedule data)
//         hints  (hints file -> hints data)
//         quests (note -> its quest map parse, or null when it is not one)

let stamper = null;
const stores = { notes: new Map(), sr: new Map(), hints: new Map(), quests: new Map() };
const listeners = new Set();

/** fn(path) -> a string that changes when the file changes ("none" when the index has no such file). */
function setStamper(fn) { stamper = fn; }
/** The stamp of a vault path, or null when no stamper is set (nothing is cached then). */
function stampOf(path) {
  if (!stamper) return null;
  try { return stamper(path); } catch { return null; }
}
/** The stamp of a file object from the index. */
function fileStamp(file) {
  return file && file.stat ? `${file.stat.mtime}:${file.stat.size}` : null;
}

const clone = (value) => {
  if (value == null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function changed() { listeners.forEach((fn) => { try { fn(); } catch { /* a listener's failure is its own */ } }); }

/** The cached value for key at this stamp (a copy), or undefined. */
function get(store, key, stamp) {
  if (stamp == null) return undefined;
  const entry = stores[store].get(key);
  return entry && entry.stamp === stamp ? clone(entry.value) : undefined;
}
/** Remembers a copy of value for key at this stamp. A null stamp is not cached. */
function put(store, key, stamp, value) {
  if (stamp == null) return;
  stores[store].set(key, { stamp, value: clone(value) });
  changed();
}
function drop(store, key) {
  if (stores[store].delete(key)) changed();
}
/** Forgets the keys of a store that a full scan did not visit (deleted or renamed files). */
function prune(store, visited) {
  let any = false;
  for (const key of stores[store].keys()) if (!visited.has(key)) { stores[store].delete(key); any = true; }
  if (any) changed();
}
function clear() {
  Object.values(stores).forEach((m) => m.clear());
  changed();
}

/** Plain-object copy of every store, for saving on this device (see persist in main.js). */
function exportAll() {
  const out = {};
  for (const [name, map] of Object.entries(stores)) out[name] = [...map.entries()];
  return out;
}
/** Restores what exportAll gave; entries already in memory win, since they are newer. */
function importAll(data) {
  if (!data || typeof data !== "object") return;
  for (const [name, entries] of Object.entries(data)) {
    const map = stores[name];
    if (!map || !Array.isArray(entries)) continue;
    for (const pair of entries) {
      if (!Array.isArray(pair) || pair.length !== 2 || !pair[1] || typeof pair[1].stamp !== "string") continue;
      if (!map.has(pair[0])) map.set(pair[0], pair[1]);
    }
  }
}
// While the copy saved on this device is being restored (scan-cache-store.js), scans wait for it
// rather than read files the restore is about to cover.
let restoring = null;
function setRestoring(promise) { restoring = promise; }
function whenRestored() { return restoring || Promise.resolve(); }

/** fn() runs after any change; returns a function that stops it. */
function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

module.exports = { setRestoring, whenRestored, setStamper, stampOf, fileStamp, get, put, drop, prune, clear, exportAll, importAll, onChange, clone };
