// The plugin's own images that go into main.js, and how each is re-encoded. Shared by the build step
// (embed-assets.mjs), the encoder (encode-assets.mjs) and the test that checks every image the code asks
// for is on this list.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Sorted: readdir order differs between filesystems, and the order of entries is part of main.js.
const list = dir => fs.readdirSync(path.join(root, dir)).filter(f => /\.(webp|png)$/i.test(f)).sort().map(f => `${dir}/${f}`);

// The guide pictures the first-run guide names (`img: "..."` in feature-guide.js), in both languages.
function guideFiles() {
  const src = fs.readFileSync(path.join(root, 'src/hub/feature-guide.js'), 'utf8');
  const names = new Set([...src.matchAll(/img:\s*"([^"]+)"/g)].map(m => m[1]));
  const files = [];
  for (const name of names) {
    if (/\.\w+$/.test(name)) files.push(`assets/${name}`);
    else for (const lang of ['中文', 'english']) files.push(`assets/guide/${name}_${lang}.webp`);
  }
  return files;
}

// width: re-encode to WebP no wider than about twice the size it is drawn at (sharp screens).
export function assetGroups() {
  return [
    { files: [...list('assets/hub-icons/light'), ...list('assets/hub-icons/dark')] },
    { files: list('assets/icons'), width: 128 },
    { files: list('assets/quest-map/generated'), width: 320 },
    { files: list('assets/quest-map/card-headers'), width: 800 },
    { files: ['light', 'dark'].map(t => `assets/pro/learning-notebook-${t}.webp`), width: 600 },
    { files: guideFiles(), width: 1200 },
    { files: ['bg_dark', 'bg_light'].map(n => `assets/quest-map/${n}.png`), width: 1024 },
    { files: ['easy', 'medium', 'hard'].map(d => `assets/quest-map/quest-map_backgroud_${d}.png`), width: 1200, quality: 72 },
  ];
}

// Images with a width are encoded once (`npm run encode:assets`) and the results are committed, so the
// release build copies fixed bytes and main.js does not depend on the building machine's sharp binary.
export const encodedDir = 'src/assets/encoded';
export const encodedFile = rel => `${encodedDir}/${rel.replace(/^assets\//, '').replace(/\.\w+$/, '.webp')}`;
// What an encoded file was made from; the build stops when the source or the settings no longer match.
export const encodeRecipe = (group, sourceBytes) => ({
  sha256: crypto.createHash('sha256').update(sourceBytes).digest('hex'),
  width: group.width,
  quality: group.quality || 80,
});
