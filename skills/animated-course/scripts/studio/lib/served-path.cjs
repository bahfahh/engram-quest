// Which file a studio page's URL means, for the local servers in render.cjs and readcheck.cjs.
// Everything is served from the studio, except /engram-quest/custom/…: the user's custom area (custom skins, looks,
// music) is served read-only from the vault, so a custom skin loads where the user keeps it (lib/cast/skin-url.js)
// and is never copied into this skill. Nothing else in the vault is served.
// The vault: $VAULT, else the `vault` that resolve.cjs wrote into the project's cast.json, else the first folder
// above the studio that has engram-quest/ (a studio copied outside the vault finds it through cast.json).
const fs = require('fs'), path = require('path');

function findVault(studio, project) {
  if (process.env.VAULT) return process.env.VAULT;
  try {
    const { vault } = JSON.parse(fs.readFileSync(path.join(project, 'cast.json'), 'utf8'));
    if (vault && fs.existsSync(path.join(vault, 'engram-quest'))) return vault;
  } catch { /* no cast.json: not a teacher film, or not resolved yet */ }
  for (let d = studio, i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(d, 'engram-quest'))) return d;
    if (path.dirname(d) === d) break;
    d = path.dirname(d);
  }
  return null;
}

const CUSTOM = '/engram-quest/custom/';

/**
 * { root, p }: the folder a request may read from (ending in a separator, so a sibling folder never passes) and the
 * file it asks for. Serve only when p.startsWith(root) and the file exists.
 */
function servedPath(studio, url, project) {
  const vault = url.startsWith(CUSTOM) ? findVault(studio, project) : null;
  if (!vault) return { root: studio, p: path.join(studio, url) };
  const custom = path.join(vault, 'engram-quest', 'custom');
  const p = path.join(vault, url);
  // custom skins made before the custom area are still read from engram-quest/cast/skins/<id>/
  const skins = path.join(custom, 'cast', 'skins') + path.sep, legacy = path.join(vault, 'engram-quest', 'cast', 'skins') + path.sep;
  if (!fs.existsSync(p) && p.startsWith(skins)) return { root: legacy, p: legacy + p.slice(skins.length) };
  return { root: custom + path.sep, p };
}

module.exports = { servedPath };
