'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'skills');
const targetRoot = path.join(repoRoot, 'bundled-skills');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

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
    ensureDir(dest);
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source skills directory not found: ${sourceRoot}`);
  }

  ensureDir(targetRoot);
  removeDirContents(targetRoot);
  copyRecursive(sourceRoot, targetRoot);

  console.log('Synced bundled skills.');
  console.log(`Source: ${sourceRoot}`);
  console.log(`Target: ${targetRoot}`);
}

main();
