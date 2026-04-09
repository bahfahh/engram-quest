import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const defaultVaultRoot = path.resolve(repoRoot, '..', 'Obsidian_Note');
const vaultRoot = process.env.ENGRAMQUEST_VAULT_ROOT
  ? path.resolve(process.env.ENGRAMQUEST_VAULT_ROOT)
  : defaultVaultRoot;
const runtimeRoot = path.join(vaultRoot, '.obsidian', 'plugins', 'engram-quest');

const filesToCopy = [
  ['main.js', 'main.js'],
  ['manifest.json', 'manifest.json'],
  ['versions.json', 'versions.json'],
  ['bg.png', 'bg.png'],
  ['skills-installer-assets.js', 'skills-installer-assets.js'],
];

const directoriesToCopy = [
  ['assets', 'assets'],
  ['bundled-skills', 'bundled-skills'],
  ['scripts', 'scripts'],
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    fs.rmSync(path.join(dirPath, entry.name), { recursive: true, force: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

ensureDir(runtimeRoot);

for (const [sourceRel, targetRel] of filesToCopy) {
  copyRecursive(path.join(repoRoot, sourceRel), path.join(runtimeRoot, targetRel));
}

for (const [sourceRel, targetRel] of directoriesToCopy) {
  const targetPath = path.join(runtimeRoot, targetRel);
  ensureDir(targetPath);
  removeDirContents(targetPath);
  copyRecursive(path.join(repoRoot, sourceRel), targetPath);
}

console.log(`Synced EngramQuest runtime to ${runtimeRoot}`);
