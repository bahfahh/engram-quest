// Which file a studio page's URL means, for the local servers in render.cjs and readcheck.cjs.
// Everything is served from the studio, except /engram-quest/…: the user's custom area (custom skins, looks,
// music) is served read-only from the vault, so a custom skin loads where the user keeps it (lib/cast/skin-url.js)
// and is never copied into this skill. The vault: $VAULT, else the first folder above the studio that has
// engram-quest/ (a studio copied outside the vault, e.g. for a cloud render, needs $VAULT).
const fs = require('fs'), path = require('path');

function findVault(studio) {
  if (process.env.VAULT) return process.env.VAULT;
  for (let d = studio, i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(d, 'engram-quest'))) return d;
    if (path.dirname(d) === d) break;
    d = path.dirname(d);
  }
  return null;
}

/** { root, p }: the folder a request may read from, and the file it asks for. Check p.startsWith(root) before serving. */
function servedPath(studio, url) {
  const vault = url.startsWith('/engram-quest/') ? findVault(studio) : null;
  if (!vault) return { root: studio, p: path.join(studio, url) };
  const root = path.join(vault, 'engram-quest');
  const p = path.join(vault, url);
  // custom skins made before the custom area are still read from engram-quest/cast/skins/<id>/
  const legacy = p.replace(path.join(root, 'custom', 'cast', 'skins'), path.join(root, 'cast', 'skins'));
  // root ends with a separator, so a sibling folder such as engram-quest2/ never passes the startsWith check
  return { root: root + path.sep, p: !fs.existsSync(p) && legacy !== p ? legacy : p };
}

module.exports = { servedPath };
