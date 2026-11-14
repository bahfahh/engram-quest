// Copies the two video skills from the Obsidian vault (their only master, ADR-28) into this repo.
//   npm run sync:video-skills              (vault: ../Obsidian_Note, or ENGRAMQUEST_VAULT_ROOT)
// Text goes to skills/<module>/ and is embedded in main.js by the normal build. Images, audio and fonts
// go into one pack per module under video-packs/, uploaded with each GitHub release (ADR-31).
// Also generates what the plugin needs at runtime: the install manifest, the teacher list and the
// picker's portraits and voice samples. Pro files are derived from each teacher's tier, so adding a
// teacher in the vault needs no change here.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { danglingMentions, imageHash, isRemoved, lineHash, linesToReview, needsReview, ownerPhrases, publicFilter, readApproved, readPrivateTerms, readReviewedLines, shapeForPublic, writeReviewedLines } from './video-public.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vaultRoot = path.resolve(process.env.ENGRAMQUEST_VAULT_ROOT || path.join(repoRoot, '..', 'Obsidian_Note'));
const SKILLS = [
  // The vault's development copy carries a `dev-` name so it never clashes with the installed copy; `name` is
  // what the published copy is called.
  { id: 'animated-course', dir: 'dev-engram-quest-animated-course', name: 'engram-quest-animated-course' },
  { id: 'episodic-review', dir: 'engram-episodic-review', name: 'engram-quest-episodic-review' },
];
const terms = readPrivateTerms(vaultRoot);
const { publicText, findPrivate } = publicFilter(terms);
const SAMPLES_DIR = path.join(vaultRoot, terms.samplesDir);
const REGISTRY = 'scripts/studio/lib/cast/teachers.json';
const SKIP_DIRS = new Set(['node_modules', '__pycache__', '.git']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.woff', '.woff2', '.ttf', '.otf', '.pdf']);
const packsDir = path.join(repoRoot, 'video-packs');
const teachersAssets = path.join(repoRoot, 'assets', 'teachers');

function walk(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), childRel));
    else out.push(childRel);
  }
  return out;
}

const isBinary = (rel, buf) => BINARY_EXT.has(path.extname(rel).toLowerCase()) || buf.subarray(0, 8000).includes(0);

// The folder name changes on install; every hard-coded path inside the skills has to follow it.
function rewritePaths(text) {
  return SKILLS.reduce((s, { id, dir }) => s.split(`.claude/skills/${dir}`).join(`.claude/skills/engram-quest-${id}`), text);
}

// Pack layout: uint32 LE header length, JSON header [{ p: path, s: size }], then the file bytes in order.
function buildPack(id, files) {
  const header = Buffer.from(JSON.stringify(files.map(({ rel, buf }) => ({ p: rel, s: buf.length }))), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(header.length);
  const pack = Buffer.concat([len, header, ...files.map((f) => f.buf)]);
  const sha256 = crypto.createHash('sha256').update(pack).digest('hex');
  const file = `engram-video-${id}-${sha256.slice(0, 12)}.pack`;
  fs.writeFileSync(path.join(packsDir, file), pack);
  return { file, sha256, size: pack.length, count: files.length };
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(rel, value) {
  fs.writeFileSync(path.join(repoRoot, rel), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

const courseRoot = path.join(vaultRoot, '.claude', 'skills', SKILLS[0].dir);
const registry = JSON.parse(fs.readFileSync(path.join(courseRoot, REGISTRY), 'utf8'));

// A Pro teacher's skin is Pro only when no free teacher uses it and it isn't shared studio code.
const freeSkins = new Set(registry.teachers.filter((t) => t.tier !== 'pro').map((t) => t.skin));
const proSkinFiles = new Set(registry.skins
  .filter((s) => !freeSkins.has(s.id) && registry.teachers.some((t) => t.skin === s.id) && s.file && s.file.startsWith('/lib/cast/skins/'))
  .map((s) => `scripts/studio${s.file}`));

// Everything is built and checked in memory first, so a failed check leaves the last good copy untouched.
const approved = readApproved(repoRoot);
const leaks = [];
const ownerWords = new Set();
const built = SKILLS.map(({ id, dir, name }) => {
  const root = path.join(vaultRoot, '.claude', 'skills', dir);
  if (!fs.existsSync(root)) throw new Error(`Skill not found: ${root}`);
  const texts = [];
  const binaries = [];
  const left = [];
  for (const rel of walk(root)) {
    if (isRemoved(id, rel)) {
      left.push(rel);
      continue;
    }
    leaks.push(...findPrivate(rel).map((hit) => `${id}/${rel} (file name) ${hit.match}`));
    const buf = fs.readFileSync(path.join(root, rel));
    if (needsReview(rel) && approved[id]?.[rel] !== imageHash(buf)) {
      console.warn(`Not published, image not reviewed: ${id}/${rel} (${imageHash(buf)})`);
      left.push(rel);
      continue;
    }
    if (isBinary(rel, buf)) { binaries.push({ rel, buf }); continue; }
    const source = buf.toString('utf8');
    if (!/\.(m?js|cjs|py|html|css|sh)$/i.test(rel)) ownerPhrases(source).forEach((phrase) => ownerWords.add(phrase));
    let text = rewritePaths(publicText(shapeForPublic(id, rel, source), rel));
    if (name && rel === 'SKILL.md') text = text.replace(/^name: .*$/m, `name: ${name}`);
    leaks.push(...findPrivate(text).map((hit) => `${id}/${rel}:${hit.line} ${hit.match}`));
    texts.push({ rel, text });
  }
  if (!texts.some(({ rel }) => rel === 'SKILL.md')) throw new Error(`${dir} has no SKILL.md`);
  return { id, texts, binaries, left };
});
// A left-out file (removed, or an image nobody approved) must not still be pointed to.
for (const { id, texts, binaries, left } of built) {
  for (const { rel, name } of danglingMentions(texts, [...texts, ...binaries].map((f) => f.rel), left)) {
    leaks.push(`${id}/${rel} points to ${name}, which the public copy leaves out: drop the mention with a rule, or approve the image`);
  }
  for (const { rel, text } of texts) {
    for (const phrase of ownerWords) if (text.includes(phrase) && !terms.keptPhrases?.includes(phrase)) leaks.push(`${id}/${rel} someone's words: ${phrase}`);
  }
}

// What the teacher picker shows: the registry without anything only production needs.
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const pickerData = {
  teachers: registry.teachers.map((t) => pick(t, ['id', 'tier', 'default', 'hidden', 'skin', 'name', 'title', 'effect', 'fitsIf', 'sample'])),
  skins: registry.skins.map((s) => pick(s, ['id', 'status', 'variants'])),
};
leaks.push(...findPrivate(JSON.stringify(pickerData, null, 1)).map((hit) => `src/videos/teachers.json:${hit.line} ${hit.match}`));
if (leaks.length) throw new Error(`Private details left in the public skills; add a rule in scripts/video-public.mjs:\n${leaks.join('\n')}`);

// Lines a person has read are remembered by hash, so only new or changed ones stop the sync.
const reviewed = readReviewedLines(repoRoot);
const unread = built.flatMap(({ id, texts }) => texts.flatMap(({ rel, text }) => linesToReview(text)
  .filter((line) => !reviewed.has(lineHash(line)))
  .map((line) => ({ where: `${id}/${rel}`, line }))));
if (unread.length && process.argv.includes('--approve-lines')) {
  unread.forEach(({ line }) => reviewed.add(lineHash(line)));
  writeReviewedLines(repoRoot, reviewed);
} else if (unread.length) {
  throw new Error(`${unread.length} published lines nobody has read yet. Add a rule for anyone's words; once every line below is fine, rerun with --approve-lines:\n${unread.map(({ where, line }) => `${where}: ${line.trim().slice(0, 300)}`).join('\n')}`);
}

const proFiles = (files) => files.filter((f) => proSkinFiles.has(f));
if (proFiles(built[0].texts.map(({ rel }) => rel)).length !== proSkinFiles.size) throw new Error('A Pro skin file named in the registry was not found in the skill');
const portraitDir = path.join(courseRoot, 'assets', 'portraits');
const portraitNames = fs.readdirSync(portraitDir).sort().filter((name) => {
  if (path.extname(name) !== '.jpg') return false;
  const approvedImage = approved['animated-course'][`assets/portraits/${name}`] === imageHash(fs.readFileSync(path.join(portraitDir, name)));
  if (!approvedImage) console.warn(`Not published, image not reviewed: assets/portraits/${name}`);
  return approvedImage;
});
const sampleNames = fs.readdirSync(SAMPLES_DIR).sort().filter((name) => path.extname(name) === '.mp3' && registry.teachers.some((t) => t.id === path.basename(name, '.mp3')));

resetDir(packsDir);
const manifest = {};
for (const { id, texts, binaries } of built) {
  const target = path.join(repoRoot, 'skills', id);
  resetDir(target);
  for (const { rel, text } of texts) {
    const out = path.join(target, rel === 'SKILL.md' ? 'skills.md' : rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text, 'utf8');
  }
  const files = texts.map(({ rel }) => rel);
  manifest[id] = {
    files,
    pro: id === 'animated-course' ? proFiles(files) : [],
    pack: buildPack(id, binaries),
  };
}
writeJson('src/skills/video-modules.json', manifest);
writeJson('src/videos/teachers.json', pickerData);

resetDir(teachersAssets);
const portraits = [];
for (const name of portraitNames) {
  fs.copyFileSync(path.join(portraitDir, name), path.join(teachersAssets, name));
  portraits.push(path.basename(name, '.jpg'));
}
const samples = [];
for (const name of sampleNames) {
  fs.copyFileSync(path.join(SAMPLES_DIR, name), path.join(teachersAssets, name));
  samples.push(path.basename(name, '.mp3'));
}
const media = (ids, ext) => ids.map((id) => `  ${JSON.stringify(id)}: require("../../assets/teachers/${id}.${ext}"),`).join('\n');
fs.writeFileSync(path.join(repoRoot, 'src/videos/teacher-media.js'), [
  '// Auto-generated by scripts/sync-video-skills.mjs — do not edit. Inlined as data URLs by esbuild.',
  '"use strict";',
  `const PORTRAITS = {\n${media(portraits, 'jpg')}\n};`,
  `const SAMPLES = {\n${media(samples, 'mp3')}\n};`,
  'module.exports = { PORTRAITS, SAMPLES };',
  '',
].join('\n'), 'utf8');

for (const [id, m] of Object.entries(manifest)) {
  console.log(`${id}: ${m.files.length} text files, ${m.pro.length} Pro files, pack ${m.pack.file} (${(m.pack.size / 1048576).toFixed(1)} MB, ${m.pack.count} files)`);
}
