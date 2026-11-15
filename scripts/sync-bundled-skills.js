'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'skills');
const targetRoot = path.join(repoRoot, 'bundled-skills');
// skills/shared/ holds text every skill carries; the installer puts custom-area.md next to each SKILL.md.
const SHARED_DIR = 'shared';
// The video skills reach users inside their packs (scripts/sync-video-skills.mjs), never embedded in main.js.
const VIDEO_MODULES = Object.keys(require('../src/skills/video-modules.json'));
const CUSTOM_POINTER = "> **Custom area.** Before you plan anything, read `custom-area.md` in this skill's folder: where the user's own preferences and assets live (`engram-quest/custom/`), how each choice is decided, and why keys never go into files.";

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

// Every skill gets the same pointer, right under its title, so no skill has to write it by hand.
function withCustomPointer(text, where) {
  if (text.includes('custom-area.md')) throw new Error(`${where} already names custom-area.md; the sync adds the pointer itself`);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const title = text.match(/^# .*$/m);
  if (!title) throw new Error(`${where} has no "# " title to put the custom-area pointer under`);
  const at = title.index + title[0].length;
  return text.slice(0, at) + eol + eol + CUSTOM_POINTER + text.slice(at);
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source skills directory not found: ${sourceRoot}`);
  }

  ensureDir(targetRoot);
  removeDirContents(targetRoot);
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (VIDEO_MODULES.includes(entry.name)) continue;
    copyRecursive(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name));
    const skillFile = path.join(targetRoot, entry.name, 'skills.md');
    if (entry.isDirectory() && entry.name !== SHARED_DIR && fs.existsSync(skillFile)) {
      fs.writeFileSync(skillFile, withCustomPointer(fs.readFileSync(skillFile, 'utf8'), skillFile), 'utf8');
    }
  }

  console.log('Synced bundled skills.');
  console.log(`Source: ${sourceRoot}`);
  console.log(`Target: ${targetRoot}`);
}

if (require.main === module) main();

module.exports = { withCustomPointer };
