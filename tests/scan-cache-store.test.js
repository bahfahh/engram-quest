// perf(hub-open 3/3): the scan cache is kept on this device between launches.
import { beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scanCache = require("../src/review/scan-cache.js");
const store = require("../src/review/scan-cache-store.js");

function memoryKv() {
  const m = new Map();
  return { m, sets: 0, async get(k) { return m.get(k); }, async set(k, v) { this.sets++; m.set(k, JSON.parse(JSON.stringify(v))); } };
}
// Timers the test runs by hand.
function clock() {
  const timers = new Map(); let id = 0;
  return { setTimer: (fn) => { timers.set(++id, fn); return id; }, clearTimer: (t) => timers.delete(t), runAll: () => { const fns = [...timers.values()]; timers.clear(); fns.forEach((f) => f()); }, pending: () => timers.size };
}

beforeEach(() => { scanCache.clear(); scanCache.setRestoring(null); });

describe("between launches", () => {
  it("restores what the last launch saved", async () => {
    const kv = memoryKv(), c = clock();
    const stop = store.attach({ kv, key: "v1", version: "2.0.4", ...c });
    scanCache.put("sr", "engram-review/sr/a.json", "5:10", { q: { due: "x" } });
    await stop();
    scanCache.clear();
    store.attach({ kv, key: "v1", version: "2.0.4", ...c });
    await scanCache.whenRestored();
    expect(scanCache.get("sr", "engram-review/sr/a.json", "5:10")).toEqual({ q: { due: "x" } });
  });

  it("does not use a cache saved by another plugin version", async () => {
    const kv = memoryKv(), c = clock();
    scanCache.put("notes", "n.md", "1:1", { deckName: "d", cards: [] });
    await store.save(kv, "v1", "2.0.3");
    scanCache.clear();
    store.attach({ kv, key: "v1", version: "2.0.4", ...c });
    await scanCache.whenRestored();
    expect(scanCache.exportAll().notes).toEqual([]);
  });

  it("keeps vaults apart", async () => {
    const kv = memoryKv(), c = clock();
    scanCache.put("notes", "n.md", "1:1", { deckName: "a", cards: [] });
    await store.save(kv, "vault-a", "1");
    scanCache.clear();
    store.attach({ kv, key: "vault-b", version: "1", ...c });
    await scanCache.whenRestored();
    expect(scanCache.exportAll().notes).toEqual([]);
  });
});

describe("saving", () => {
  it("saves once a while after changes, not on each one", async () => {
    const kv = memoryKv(), c = clock();
    store.attach({ kv, key: "k", version: "1", ...c });
    for (let i = 0; i < 20; i++) scanCache.put("sr", `p${i}`, "1:1", { i });
    expect(kv.sets).toBe(0);
    c.runAll();
    await new Promise((r) => setTimeout(r, 0));
    expect(kv.sets).toBe(1);
  });

  it("saves at once when the app goes to the background", async () => {
    const kv = memoryKv(), c = clock();
    let hidden;
    store.attach({ kv, key: "k", version: "1", ...c, onHidden: (flush) => { hidden = flush; } });
    scanCache.put("sr", "p", "1:1", { a: 1 });
    await hidden();
    expect(kv.sets).toBe(1);
    await hidden();
    expect(kv.sets).toBe(1); // nothing new to save
  });

  it("lets scans go ahead when the saved copy cannot be read", async () => {
    const c = clock();
    const kv = { get: () => Promise.reject(new Error("blocked")), set: async () => {} };
    store.attach({ kv, key: "k", version: "1", ...c });
    await expect(scanCache.whenRestored()).resolves.toBeUndefined();
  });

  it("does nothing without IndexedDB", () => {
    expect(store.indexedDbStore(undefined)).toBeNull();
    expect(typeof store.attach({ kv: null })).toBe("function");
  });
});
