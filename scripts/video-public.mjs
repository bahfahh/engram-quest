// The video skills' master copies live in a private vault and carry its history: the owner's words, project
// names and films made from real notes. Everything here decides what the public copy keeps, so new research can
// still just be synced: text passes through these rules, images are approved by content, and anything a rule misses
// stops the sync instead of being published.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const PUBLIC_DIR = 'video-public';

// The names to hide stay in the private vault, so this public repo never publishes the list of them.
export const TERMS_FILE = '.claude/video-public-terms.json';

// What the public copy leaves out, per skill: material in the master that is not meant for everyone.
const REMOVED = {
  // Kits and course maps built for one series; the generic engines and one example map per kind stay.
  'animated-course': [
    /^scripts\/studio\/lib\/azure\//,
    /^scripts\/studio\/lib\/classroom\/(coursemap-(stock|pstack)\.js|COURSEMAP-(STOCK|PSTACK)\.md)$/,
    /^scripts\/studio\/lib\/house\/coursemap-(azure|ops)\.js$/,
  ],
};

const IMAGE = /\.(jpe?g|png|a?png|webp|gif|avif|bmp|tiff?|ico|heic|jxl)$/i;

// A quote is credited to someone when the word for them is followed, in the same clause, by a colon and the quote.
// Instructions to ask the person something have the same shape and stay.
const NOT_ASKING = '(?<!(?:問|告訴|跟|向|請|[Aa]sk|[Tt]ell|[Ss]how)s?\\s*(?:the\\s+)?)';
const CREDIT = `${NOT_ASKING}(?:使用者|\\b[Uu]ser\\b(?!'))(?:[^「"“\\n：:.。；;|*]|:\\d){0,80}[:：]\\s*`;
const QUOTE = '(?:「(?:[^「」\\n]|「[^」\\n]*」)*」|"[^"\\n]*"|“[^”\\n]*”)';
const QUOTES = `${QUOTE}(?:\\s*(?:[，,、]|, then:)?\\s*${QUOTE})*`;
// A quoted block line goes, but whatever it goes on to explain after the last quote stays.
const lastQuote = (line) => Math.max(...['」', '"', '”'].map((mark) => line.lastIndexOf(mark)));
function quotedBlockLine(whole, line) {
  if (lastQuote(line) < 0) return whole;
  const rest = line.slice(lastQuote(line) + 1).replace(/^[\s.。．;；]+/, '');
  return rest ? `> ${rest}\n` : '';
}
const OWNER_WORDS = [
  [/^(>\s*(?:The\s+)?(?:使用者|User\b)[^\r\n]*)(?:\r?\n>[ \t]*(?=\r?\n))?\r?\n?/gm, quotedBlockLine],
  [new RegExp(`\\s*[（(]\\s*${CREDIT}${QUOTES}[^（）()\\n]*[）)]`, 'g'), ''],
  [new RegExp(`\\s*[;；,，]\\s*${CREDIT}${QUOTES}(?=\\s*[）)])`, 'g'), ''],
  [new RegExp(`(?:,?\\s*(?:(?:chosen|corrected) by|which)\\s+the\\s+|[，,、]?\\s*(?:[Tt]he\\s+)?)${CREDIT}${QUOTES}[。．.]?`, 'g'), ''],
];
const NOTES_WORDING = [
  [/^\|\s*使用者說\s*\|\s*—.*\r?\n/gm, ''],
  [/（使用者[：:][^）「」\n]*）/g, ''],
  [/（使用者原話整理）/g, ''],
  [/（第三輪，使用者認可）/g, ''],
  [/（2026-11-02，使用者說「[^」]*」）/g, ''],
  [/\d{4}-\d{2}-\d{2} 使用者看完[^，\n]*，所以/g, ''],
  [/和使用者原話/g, ''],
  [/使用者認可/g, '認可'],
  [/使用者第一輪就認可了/g, '第一輪就認可了'],
  [/，使用者看過、說「好」，/g, '，'],
  [/^- \*\*是使用者自己的說法\*\*：[^\n]*\r?\n/gm, ''],
  [/^User, on lesson \d+ at [^\n]*\r?\n/gm, ''],
  [/\| User: lessons [^|\n]*\|/g, '| — |'],
  [/The user's principle: /g, 'Principle: '],
  [/\s*[（(]screening room:\s*https:\/\/claude\.ai\/(?:public\/)?artifacts?\/[\w-]+[）)]/g, ''],
  [/https:\/\/claude\.ai\/(?:public\/)?artifacts?\/[\w-]+/g, '(not public)'],
];
const CODE_FILE = /\.(m?js|cjs|py|html|css|sh)$/i;
const ALWAYS_PRIVATE = `claude\\.ai\\/(?:public\\/)?artifact|使用者原話|\\bgit [0-9a-f]{7,}\\b|\\| User: |${CREDIT}[「"“]`;
const asPattern = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Deliberately wider than the removal rules and independent of them: anything that merely looks like someone's words
// needs a person to have read that exact line. What a rule misses stops here.
const WHO = '使用者|用戶|\\b(?:user|owner)\\b';
const LOOKS_CREDITED = new RegExp(`(?:${WHO})[^\\n]{0,80}[「『"“]|(?:${WHO})\\s*[,，]?\\s*(?:\\d{4}-)?(?:\\d{1,2}-\\d{1,2})?\\s*[:：]|(?:${WHO})[^\\n]{0,12}?(?:\\d{4}-)?\\d{1,2}-\\d{1,2}\\b|\\d{4}-\\d{1,2}-\\d{1,2}[^\\n]{0,12}?(?:${WHO})`, 'i');
export const lineHash = (line) => crypto.createHash('sha256').update(line.trim()).digest('hex').slice(0, 16);

// Runs long enough to be someone's phrase rather than a common word.
const PHRASE = /[㐀-鿿]{6,}|[A-Za-z][a-z]+(?: [A-Za-z][a-z]+){3,}/g;

/** Phrases from quotes credited in the source. The same words repeated elsewhere without a credit are still theirs. */
export function ownerPhrases(source) {
  // Only what is inside the quotation marks: the sentence that leads up to the credit is the skill's own wording.
  return [...source.matchAll(new RegExp(`${CREDIT}(${QUOTES})`, 'g'))].flatMap(([, quoted]) => quoted.match(PHRASE) || []);
}

/** Lines of a published file that a person has to read before it can ship. */
export const linesToReview = (text) => text.split('\n').filter((line) => LOOKS_CREDITED.test(line));

// Changes only one published file needs, by skill and path: [find, replace] steps. A step that no longer finds
// its text stops the sync, so a rule cannot go quietly dead while the master moves on.
const FILE_RULES = {
  // Mentions of the course maps left out above, and the demo films only the owner can watch.
  'animated-course/SKILL.md': [['; the demo films (minimum bar)', '']],
  'animated-course/reference/05-presentation-methods.md': [
    [', `coursemap-stock.js` (also §5b), `coursemap-pstack.js` (§5 only)', ''],
    ['`coursemap4.js`, `coursemap-stock.js` and `coursemap-pstack.js` silently ignore them', '`coursemap4.js` silently ignores them'],
    [/\n## 4\. The demo films[\s\S]*?(?=\n## |$)/, ''],
  ],
  'animated-course/reference/08-tools.md': [[/^.*coursemap-stock\.js.*\n/m, '']],
  // Stills not approved for the public copy (the owner's brand is on screen, or the frame is a raw screen capture).
  'animated-course/assets/looks/README.md': [[/^\| `(1b-l01|3-l05|4a-l07|5a-l08|6x-no-focus)[^`]*\.jpg`.*\n/gm, '']],
  'animated-course/scripts/studio/lib/house/HOUSE.md': [[/^\| `coursemap-ops\.js`.*\n/m, '']],
};

/** What a skill file becomes in the public copy, before the text rules run. */
export function shapeForPublic(id, rel, text) {
  return (FILE_RULES[`${id}/${rel}`] || []).reduce((out, [find, replace]) => {
    const next = out.replace(find, replace);
    if (next === out) throw new Error(`The rule for ${id}/${rel} no longer finds ${find} in the master; update FILE_RULES in scripts/video-public.mjs`);
    return next;
  }, text);
}

/** Names of left-out files that a shipped text still points to. A name a shipped file shares says nothing. */
export function danglingMentions(texts, shipped, left) {
  const shippedNames = new Set(shipped.map((rel) => path.basename(rel)).concat(SHARED_NAMES));
  const gone = [...new Set(left.map((rel) => path.basename(rel)))].filter((name) => !shippedNames.has(name));
  return texts.flatMap(({ rel, text }) => gone.filter((name) => text.includes(name)).map((name) => ({ rel, name })));
}
// Every film writes its own film.js.
const SHARED_NAMES = ['film.js'];

export const isRemoved = (id, rel) => (REMOVED[id] || []).some((pattern) => pattern.test(rel));

export const needsReview = (rel) => IMAGE.test(rel);

export const imageHash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

export function readPrivateTerms(vaultRoot) {
  const file = path.join(vaultRoot, TERMS_FILE);
  if (!fs.existsSync(file)) throw new Error(`${file} is missing: it lists the names the public copy must not contain`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** The text rules and the final check, built from the private terms. */
export function publicFilter({ aliases, names, paths, edits = [] }) {
  const rules = [
    ...edits.map(([pattern, replacement]) => [new RegExp(pattern, 'gm'), replacement]),
    ...NOTES_WORDING,
    ...aliases.map(([name, standIn]) => [new RegExp(asPattern(name), 'gi'), standIn]),
    [new RegExp(`\`?(?:${paths.map(asPattern).join('|')})/[^\\s\`，。；、)）|'"]*\`?`, 'g'), '(not public)'],
  ];
  const leftovers = new RegExp([...aliases.map(([name]) => name), ...names, ...paths].map(asPattern).concat(ALWAYS_PRIVATE).join('|'), 'gi');
  return {
    publicText(text, rel = '') {
      const applied = CODE_FILE.test(rel) ? rules : [...OWNER_WORDS, ...rules];
      return applied.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
    },
    /** Every private detail left in a text, with its line number. */
    findPrivate: (text) => text.split('\n').flatMap((line, index) => (line.match(leftovers) || []).map((match) => ({ line: index + 1, match }))),
  };
}

const reviewedLinesFile = (repoRoot) => path.join(repoRoot, PUBLIC_DIR, 'reviewed-lines.json');
export const readReviewedLines = (repoRoot) => new Set(fs.existsSync(reviewedLinesFile(repoRoot)) ? JSON.parse(fs.readFileSync(reviewedLinesFile(repoRoot), 'utf8')) : []);
export const writeReviewedLines = (repoRoot, hashes) => fs.writeFileSync(reviewedLinesFile(repoRoot), `${JSON.stringify([...hashes].sort(), null, 0).replace(/,/g, ',\n')}\n`, 'utf8');

export function readApproved(repoRoot) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, PUBLIC_DIR, 'approved-images.json'), 'utf8'));
}
