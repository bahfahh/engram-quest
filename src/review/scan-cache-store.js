"use strict";
// scan-cache-store.js
// Saves the scan cache (scan-cache.js) on this device, so the first Hub open after Obsidian starts is
// as quick as a later one: entries are checked against the file index's stamps exactly as in memory,
// so a file changed while Obsidian was closed is read again.
//
// Kept in IndexedDB, which belongs to this device: it is not a vault file, so sync does not carry it
// to other devices and does not wake up for every save. One record per vault, tagged with the plugin
// version: an update may parse notes differently, so a cache from another version is not used.

const scanCache = require("./scan-cache");

const DB_NAME = "engram-quest";
const STORE = "scan-cache";
const SAVE_DELAY_MS = 10000;
const RESTORE_WAIT_MS = 1500;

/** A {get(key), set(key, value)} store over IndexedDB, or null where there is none. */
function indexedDbStore(idb) {
  if (!idb) return null;
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  const run = (mode, fn) => db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
  return {
    get: (key) => run("readonly", (s) => s.get(key)),
    set: (key, value) => run("readwrite", (s) => s.put(value, key)),
  };
}

/** Restores the saved cache for `key` if it was saved by this plugin version. */
async function restore(kv, key, version) {
  const rec = await kv.get(key);
  if (rec && rec.version === version && rec.data) scanCache.importAll(rec.data);
}

async function save(kv, key, version) {
  await kv.set(key, { version, savedAt: Date.now(), data: scanCache.exportAll() });
}

/**
 * Restores the cache now and saves it a while after it changes, when the app goes to the background,
 * and when the plugin unloads. Scans wait for the restore (up to RESTORE_WAIT_MS) through
 * scanCache.whenRestored(). Returns stop().
 */
function attach({ kv, key, version, onHidden, setTimer = setTimeout, clearTimer = clearTimeout }) {
  if (!kv) return () => {};
  const restored = restore(kv, key, version).catch((err) => console.warn("EngramQuest: scan cache restore failed", err));
  scanCache.setRestoring(Promise.race([restored, new Promise((r) => setTimer(r, RESTORE_WAIT_MS))]));
  let timer = null, dirty = false;
  const flush = () => {
    if (timer) { clearTimer(timer); timer = null; }
    if (!dirty) return Promise.resolve();
    dirty = false;
    return save(kv, key, version).catch((err) => console.warn("EngramQuest: scan cache save failed", err));
  };
  const off = scanCache.onChange(() => {
    dirty = true;
    if (!timer) timer = setTimer(() => { timer = null; flush(); }, SAVE_DELAY_MS);
  });
  if (onHidden) onHidden(flush);
  return () => { off(); return flush(); };
}

module.exports = { attach, indexedDbStore, restore, save, SAVE_DELAY_MS };
