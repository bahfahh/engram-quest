'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultVaultRoot = path.resolve(repoRoot, '..', 'Obsidian_Note');
const vaultRoot = process.env.ENGRAMQUEST_VAULT_ROOT
  ? path.resolve(process.env.ENGRAMQUEST_VAULT_ROOT)
  : defaultVaultRoot;
const sourceRoot = path.join(repoRoot, 'skills');
const targetRoot = path.join(vaultRoot, '.obsidian', 'plugins', 'engram-quest', 'bundled-skills');

function removeDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source skills directory not found: ${sourceRoot}`);
  }

  fs.mkdirSync(targetRoot, { recursive: true });
  removeDirContents(targetRoot);
  copyRecursive(sourceRoot, targetRoot);

  console.log('Synced bundled skills.');
  console.log(`Source: ${sourceRoot}`);
  console.log(`Target: ${targetRoot}`);
}

main();
