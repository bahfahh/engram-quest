// The packs this build downloads (video skills, Pro teachers' voice samples) each live on a GitHub
// release of their own, tagged with the pack's file name without ".pack". The name ends in the content
// hash, so a published pack never changes and an unchanged pack is never uploaded again.
//   npm run release:packs              publish the packs not yet on GitHub, from video-packs/ (needs gh)
//   npm run release:packs -- --check   fetch each one from the URL the plugin uses, without signing in,
//                                      and verify it (the release workflow runs this)
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import videoPack from '../src/skills/video-pack.js';

const { RELEASE_BASE, packTag, packUrl } = videoPack;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The repository the plugin downloads from, so publishing can never go anywhere else.
const repo = RELEASE_BASE.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download$/)[1];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
const packs = [
  ...Object.values(readJson('src/skills/video-modules.json')).map((m) => m.pack),
  readJson('src/videos/teacher-samples.json'),
];
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const gh = (...args) => execFileSync('gh', [...args, '--repo', repo], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Asset names on the pack's release, or null when there is no such release; any other gh error stops the run.
function published(tag) {
  try { return JSON.parse(gh('release', 'view', tag, '--json', 'assets')).assets.map((a) => a.name); }
  catch (err) {
    if (/release not found/i.test(String(err.stderr))) return null;
    throw err;
  }
}

const problems = [];
if (process.argv.includes('--check')) {
  // Anonymous, at the exact URL the plugin requests: a draft or a wrong address fails here as it would for users.
  for (const pack of packs) {
    const res = await fetch(packUrl(pack));
    if (!res.ok) { problems.push(`${pack.file}: ${packUrl(pack)} answered ${res.status}; run npm run release:packs`); continue; }
    if (sha256(Buffer.from(await res.arrayBuffer())) !== pack.sha256) problems.push(`${pack.file}: published bytes differ from this build's SHA-256`);
    else console.log(`ok ${packTag(pack)}`);
  }
} else {
  for (const pack of packs) {
    const local = path.join(repoRoot, 'video-packs', pack.file);
    if (!fs.existsSync(local) || sha256(fs.readFileSync(local)) !== pack.sha256) {
      problems.push(`${pack.file}: video-packs/ has no copy matching this commit; run npm run sync:video-skills`);
      continue;
    }
    const tag = packTag(pack);
    const assets = published(tag);
    if (assets && assets.includes(pack.file)) { console.log(`already published ${tag}`); continue; }
    // --latest=false keeps the plugin's version release as the repository's latest release.
    if (assets) gh('release', 'upload', tag, local);
    else gh('release', 'create', tag, local, '--title', tag, '--latest=false', '--notes', 'Download used by the EngramQuest plugin when you install the video skills or play a teacher\'s voice sample. Not a plugin version.');
    console.log(`published ${tag}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
