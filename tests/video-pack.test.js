// The video assets pack: the format written by scripts/sync-video-skills.mjs and how it is loaded.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { parsePack, loadPack, RELEASE_BASE } from "../src/skills/video-pack.js";

function buildPack(files) {
  const header = Buffer.from(JSON.stringify(files.map(([p, data]) => ({ p, s: data.length }))));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(header.length);
  const pack = Buffer.concat([length, header, ...files.map(([, data]) => data)]);
  const buffer = pack.buffer.slice(pack.byteOffset, pack.byteOffset + pack.length);
  return { buffer, sha256: createHash("sha256").update(pack).digest("hex") };
}

const files = [["assets/a.png", Buffer.from([1, 2, 3])], ["fonts/b.woff2", Buffer.from([9, 8])]];
const adapterWith = (local) => ({ exists: async () => !!local, readBinary: async () => local });
const load = (extra) => loadPack({ configDir: ".obsidian", version: "1.2.3", ...extra });

describe("parsePack", () => {
  it("returns every file with its own bytes", () => {
    const parsed = parsePack(buildPack(files).buffer);
    expect(parsed.map((f) => f.path)).toEqual(["assets/a.png", "fonts/b.woff2"]);
    expect([...new Uint8Array(parsed[1].data)]).toEqual([9, 8]);
  });
});

describe("loadPack", () => {
  const { buffer, sha256 } = buildPack(files);
  const pack = { file: "p.pack", sha256 };

  it("downloads from this version's release when there is no local copy", async () => {
    let asked = null;
    const result = await load({ adapter: adapterWith(null), pack, fetchUrl: async (url) => { asked = url; return buffer; } });
    expect(asked).toBe(`${RELEASE_BASE}/1.2.3/p.pack`);
    expect(result).toHaveLength(2);
  });

  it("uses a local development copy without touching the network", async () => {
    const fetchUrl = async () => { throw new Error("should not download"); };
    await expect(load({ adapter: adapterWith(buffer), pack, fetchUrl })).resolves.toHaveLength(2);
  });

  it("rejects bytes that are not the pack this build expects", async () => {
    await expect(load({ adapter: adapterWith(null), pack: { file: "p.pack", sha256: "0".repeat(64) }, fetchUrl: async () => buffer })).rejects.toThrow(/verification/);
  });
});
