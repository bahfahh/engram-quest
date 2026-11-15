// Encodes the larger plugin images to WebP at the size they are shown, into src/assets/encoded/ (committed).
//   npm run encode:assets      after adding, changing or resizing an image listed in asset-list.mjs
// sharp's output can differ between platforms and libvips versions, so encoding is kept out of the release
// build: the build copies these bytes and stops when sources.json no longer matches an image.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { root, assetGroups, encodedDir, encodedFile, encodeRecipe } from './asset-list.mjs';

const dir = path.join(root, encodedDir);
fs.rmSync(dir, { recursive: true, force: true });
const recipes = {};
for (const group of assetGroups()) {
  if (!group.width) continue;
  for (const rel of group.files) {
    const out = path.join(root, encodedFile(rel));
    if (fs.existsSync(out)) throw new Error(`encode-assets: two images encode to ${encodedFile(rel)}`);
    const source = fs.readFileSync(path.join(root, rel));
    const data = await sharp(source).resize({ width: group.width, withoutEnlargement: true }).webp({ quality: group.quality || 80 }).toBuffer();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, data);
    recipes[rel] = encodeRecipe(group, source);
  }
}
fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify(recipes, null, 2) + '\n', 'utf8');
console.log(`Encoded ${Object.keys(recipes).length} images into ${encodedDir}/`);
