"use strict";
// Video skills keep their images, audio and fonts in a pack published with each GitHub release
// (ADR-31). Layout: uint32 LE header length, JSON header [{ p: path, s: size }], then the bytes in order.

const RELEASE_BASE = "https://github.com/bahfahh/engram-quest/releases/download";

function parsePack(buffer) {
  const headerLength = new DataView(buffer).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerLength)));
  let offset = 4 + headerLength;
  return header.map(({ p, s }) => {
    const data = buffer.slice(offset, offset + s);
    offset += s;
    return { path: p, data };
  });
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fetch and verify a pack. A copy next to the plugin (development sync) wins over the release download.
 * `fetchUrl(url)` resolves to an ArrayBuffer. Throws when the bytes are not the pack this build expects.
 */
async function loadPack({ adapter, configDir, version, pack, fetchUrl }) {
  const local = `${configDir}/plugins/engram-quest/video-packs/${pack.file}`;
  const buffer = (await adapter.exists(local))
    ? await adapter.readBinary(local)
    : await fetchUrl(`${RELEASE_BASE}/${version}/${pack.file}`);
  if ((await sha256Hex(buffer)) !== pack.sha256) throw new Error(`Video assets failed verification: ${pack.file}`);
  return parsePack(buffer);
}

module.exports = { parsePack, sha256Hex, loadPack, RELEASE_BASE };
