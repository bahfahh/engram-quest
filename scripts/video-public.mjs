// The video skills' master copies live in a private vault and carry its history: the owner's words, project
// names and films made from real notes. Everything here decides what the public copy keeps, so new research can
// still just be synced: text passes through these rules, images are approved by content, and anything a rule misses
// stops the sync instead of being published.
import { parse } from 'acorn';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const OVERLAY_DIR = 'video-public';

// The names to hide stay in the private vault, so this public repo never publishes the list of them.
export const TERMS_FILE = '.claude/video-public-terms.json';

// Records of films made from real notes. Each film writes its own, so nothing depends on these.
const REMOVED = [
  /^assets\/shells\/.+\/(CONTENT|DEMO|NOTES|STORYBOARD)[^/]*\.md$/i,
  /^assets\/shells\/.+\/onscreen\.txt$/i,
  /^assets\/shells\/rooms\/img\/agg-tree\.png$/i,
];

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

// Deliberately wider than the removal rules and independent of them: anything that merely looks like someone's words,
// and any Chinese left in shell code, needs a person to have read that exact line. What a rule misses stops here.
const WHO = '使用者|用戶|\\b(?:user|owner)\\b';
const LOOKS_CREDITED = new RegExp(`(?:${WHO})[^\\n]{0,80}[「『"“]|(?:${WHO})\\s*[,，]?\\s*(?:\\d{4}-)?(?:\\d{1,2}-\\d{1,2})?\\s*[:：]`, 'i');
const SHELL_CODE = /^assets\/shells\/.+(?<!\.md)$/i;
export const lineHash = (line) => crypto.createHash('sha256').update(line.trim()).digest('hex').slice(0, 16);

/** Phrases from quotes credited in the source. The same words repeated elsewhere without a credit are still theirs. */
export function ownerPhrases(source) {
  return (source.match(new RegExp(`${CREDIT}${QUOTES}`, 'g')) || []).flatMap((quote) => quote.match(PHRASE) || []);
}

/** Lines of a published file that a person has to read before it can ship. */
export function linesToReview(rel, text) {
  // Markers and the short category words the data checks already limit would otherwise stop the sync on every timing change.
  const wording = (line) => line.replace(/\{\{FILL:[^}]*\}\}|\b(?:use|where): '[^']*'|, '[^',]*', '[^',]*'\);\s*$/g, '');
  return text.split('\n').filter((line) => LOOKS_CREDITED.test(line) || (SHELL_CODE.test(rel) && CJK.test(wording(line))));
}

// The three shells' content.js files hold the words of a film made from real notes. The public copy keeps their
// structure and timing and leaves a {{FILL:key}} marker for every word, so the shells can still be synced as they
// evolve. Anything not listed here as structure counts as wording, and text no rule reaches stops the sync.
const SHELL_CONTENT = /^assets\/shells\/([^/]+)\/content\.js$/;
const STRUCTURE = new Set(['id', 'kind', 'use', 'at', 'zone', 'seg', 'scr', 'card', 'hint', 'gridCol', 'pin', 'link', 'from', 'to', 'n', 'name', 'icons', 'cards', 'post', 'sayCards', 'scrTxt']);
// A field in neither list stops the sync, so a new one is classified on purpose rather than blanked by accident.
const WORDS = new Set(['text', 'sub', 'title', 'label', 'head', 'cells', 'rows', 'stamp', 'code', 'rowsTxt', 'lines', 'caption', 'layers', 'q', 'a', 'tag', 'dir', 'via', 'say', 'hintCap', 'note', 'where', 'src', 'exits']);
// Runs long enough to be a phrase of the film rather than a common word.
const PHRASE = /[㐀-鿿]{6,}|[A-Za-z][a-z]+(?: [A-Za-z][a-z]+){3,}/g;
// Published names of the looks: a film's title may repeat one without being its private wording.
const LOOK_NAMES = new Set(['回到那個房間']);
// Files whose words can end up on a stranger's screen. Reference docs may quote a worked example; a film can't show those.
const REACHES_SCREEN = /^(assets\/shells\/.+\.(m?js|html|json|svg)|templates\/.+)$/i;
const SHELLS = {
  rooms: { data: ['TEXT'], cuts: [[/^r3\.sig\d$/, '：'], [/^r3\.sig3\.tiles$/, ' → '], [/^r3\.land/, ' → '], [/^r3\.gate\d\.sub$/, '；']] },
  rewind: { data: [], speech: 'S', cuts: [[/^pin\d$/, '　']] },
  board: { data: ['ZONES', 'CARDS', 'LINKS', 'SCREEN_TXT', 'BEATS'], cuts: [[/^scr\.c3-mut\.a$/, ' == ']] },
};
// Characters the shells' code splits a string on: kept between markers so the parts still line up.
const LIST_SEPARATORS = ['・', '／', '｜'];
// Sentences and titles that happen to contain a separator; no code cuts these.
const PROSE = /(^|\.)(recall\.[qa]|title)$/;
// The middle dot U+30FB is a separator kept on purpose, not a word.
const CJK = /[\u3400-\u9fff\u3040-\u30fa\u30fc-\u30ff]/;
const WORDLESS = /^[^\p{L}\p{N}]*$/u;
// A place note keeps only which surface holds the text: the rest of it can name the topic.
const PLACE = /月曆|筆記本|白板|螢幕|便利貼|便條|紙條|軟木板|時刻表|站牌|畫面|索引卡|金線/;
// Fields that may keep Chinese in the public copy: categories the code compares, and the place word above.
const KEPT_WORDS = new Set(['use', 'where', 'name']);
const LONGEST_KEPT_WORD = 8;
const PARSE = { ecmaVersion: 'latest', sourceType: 'module' };
const SAFE_COMMENT = /^\/\/ (use:|countdowns:)/;

// A list line that starts with a clock time is read by position: the code takes the first five characters.
function markerFor(key, text, cuts) {
  const clock = text.match(/^\d\d:\d\d(\s+)/u);
  if (clock) return `{{FILL:${key}.time}}${clock[1]}{{FILL:${key}}}`;
  const seps = [...LIST_SEPARATORS, ...cuts.filter(([pattern]) => pattern.test(key)).map(([, sep]) => sep)];
  const parts = PROSE.test(key) ? [text] : text.split(new RegExp(`(${seps.join('|')})`));
  if (parts.length === 1) return `{{FILL:${key}}}`;
  let n = 0;
  return parts.map((part, i) => (i % 2 ? part : part.trim() ? `{{FILL:${key}.${++n}}}` : part)).join('');
}

const quoted = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function filmData(ast, shell) {
  const { data, speech } = SHELLS[shell];
  const regions = [];
  for (const node of ast.body) {
    const statement = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (statement?.type === 'VariableDeclaration') {
      for (const d of statement.declarations) {
        if (data.includes(d.id.name)) regions.push({ node: d.init, name: d.id.name });
        if (d.id.name === 'UI_SETS') regions.push({ node: d.init, ui: true });
      }
    }
    if (speech && statement?.type === 'ExpressionStatement' && statement.expression.callee?.name === speech) regions.push({ node: statement.expression, speech: true });
  }
  return regions;
}

const holdsText = (node) => (node.type === 'Literal' ? typeof node.value === 'string'
  : node.type === 'TemplateLiteral' || (node.type === 'ArrayExpression' && node.elements.some(holdsText)) || (node.type === 'ConditionalExpression' && (holdsText(node.consequent) || holdsText(node.alternate))));

function blank(shell, source) {
  if (!SHELLS[shell]) throw new Error(`Unknown shell "${shell}": add it to SHELLS in scripts/video-public.mjs`);
  const comments = [];
  const ast = parse(source, { ...PARSE, onComment: comments });
  const { cuts } = SHELLS[shell];
  const edits = [];
  const phrases = [];
  const replaceWith = (node, value) => edits.push([node.start, node.end, quoted(value)]);
  const blankString = (node, value, key) => {
    if (WORDLESS.test(value)) return;
    phrases.push(...(value.match(PHRASE) || []).filter((phrase) => !LOOK_NAMES.has(phrase)));
    replaceWith(node, markerFor(key, value, cuts));
  };
  const place = (node) => replaceWith(node, node.value.match(PLACE)?.[0] ?? '');
  // SCREEN_TXT holds only words, so its field names say nothing about what is structure.
  function blankValue(node, key, allWords) {
    if (!node) return;
    if (node.type === 'Literal' && typeof node.value === 'string') blankString(node, node.value, key);
    else if (node.type === 'TemplateLiteral') {
      if (node.expressions.length) throw new Error(`Cannot blank a template string with expressions at ${key}`);
      blankString(node, node.quasis[0].value.cooked, key);
    } else if (node.type === 'ArrayExpression') node.elements.forEach((el, i) => blankValue(el, `${key}.${i + 1}`, allWords));
    else if (node.type === 'ObjectExpression') blankObject(node, key, allWords);
  }
  function blankObject(node, key, allWords) {
    const idProp = node.properties.find((p) => (p.key?.name ?? p.key?.value) === 'id' && p.value?.type === 'Literal');
    const base = idProp ? idProp.value.value : key;
    for (const prop of node.properties) {
      if (prop.type !== 'Property') throw new Error(`Cannot blank a spread at ${key}`);
      const name = prop.key.name ?? prop.key.value;
      const literal = prop.value.type === 'Literal' ? prop.value : null;
      if (!allWords && STRUCTURE.has(name)) continue;
      if (!allWords && !WORDS.has(name) && holdsText(prop.value)) throw new Error(`New field "${name}" in the ${shell} shell's film data: add it to STRUCTURE or WORDS in scripts/video-public.mjs`);
      if (name === 'where' && literal) place(literal);
      else if (name === 'note' && literal) replaceWith(literal, '');
      else if (!(name === 'src' && literal && String(literal.value).startsWith('assets/'))) blankValue(prop.value, name === 'text' && idProp ? base : `${base}.${name}`, allWords);
    }
  }
  const regions = filmData(ast, shell);
  if (!regions.some((r) => !r.ui)) throw new Error(`No film wording found in the ${shell} shell; update SHELLS in scripts/video-public.mjs`);
  for (const region of regions) {
    if (region.speech) {
      const [id, , , text, , where] = region.node.arguments;
      if (id.type !== 'Literal') throw new Error(`A text call in the ${shell} shell has no literal id`);
      blankValue(text, id.value);
      if (where?.type === 'Literal') place(where);
    } else if (!region.ui) {
      if (!['ArrayExpression', 'ObjectExpression'].includes(region.node.type)) throw new Error(`${region.name} in the ${shell} shell is not plain data; update blankShellContent`);
      blankValue(region.node, region.name === 'SCREEN_TXT' ? 'scr' : region.name, region.name === 'SCREEN_TXT');
    }
  }
  for (const comment of comments) edits.push(...commentEdit(source, comment));
  const output = edits.sort((a, b) => b[0] - a[0]).reduce((out, [start, end, text]) => out.slice(0, start) + text + out.slice(end), source);
  assertNothingLeft(output, shell);
  return { output, phrases };
}

/** The public form of a shell's content.js: same code and timing, a marker in place of every word. */
export const blankShellContent = (shell, source) => blank(shell, source).output;

export const reachesScreen = (rel) => REACHES_SCREEN.test(rel);

/** The film's own phrases, which must not turn up in another file that reaches the screen. */
export function filmPhrases(rel, source) {
  const shell = rel.match(SHELL_CONTENT);
  return shell ? blank(shell[1], source).phrases : [];
}

// Checks the finished file, so a form of text no rule handles stops the sync instead of shipping.
function assertNothingLeft(output, shell) {
  const comments = [];
  const ast = parse(output, { ...PARSE, onComment: comments });
  const stop = (text) => { throw new Error(`Film text outside the rules in the ${shell} shell's content.js: ${text}`); };
  for (const { start, end } of comments) {
    const text = output.slice(start, end);
    if (CJK.test(text) && !SAFE_COMMENT.test(text)) stop(text);
  }
  const ui = filmData(ast, shell).find((r) => r.ui)?.node;
  (function visit(node, key) {
    const isDiagnostic = node?.type === 'ThrowStatement' || (node?.type === 'CallExpression' && node.callee.object?.name === 'console');
    if (!node || typeof node !== 'object' || node === ui || isDiagnostic) return;
    if (Array.isArray(node)) { node.forEach((child) => visit(child, key)); return; }
    if (node.type === 'Property') {
      const name = node.key.name ?? node.key.value;
      if (CJK.test(String(name))) stop(name);
      visit(node.value, name);
      return;
    }
    if (node.type === 'CallExpression' && node.callee.name === SHELLS[shell].speech) { node.arguments.forEach((arg, i) => visit(arg, i >= 4 ? 'use' : i === 3 ? 'text' : key)); return; }
    const value = node.type === 'Literal' ? node.value : node.type === 'TemplateElement' ? node.value.cooked : undefined;
    if (typeof value === 'string') {
      if (CJK.test(value) && !KEPT_WORDS.has(key)) stop(value);
      if (KEPT_WORDS.has(key) && value.length > LONGEST_KEPT_WORD && !value.includes('{{FILL:')) stop(value);
      if (WORDS.has(key) && key !== 'where' && !value.includes('{{FILL:') && !WORDLESS.test(value) && !value.startsWith('assets/')) stop(value);
      if (/^[^{]*[A-Za-z]+ [A-Za-z]+ [A-Za-z]+/.test(value) && !value.includes('{{FILL:')) stop(value);
    }
    Object.values(node).forEach((child) => visit(child, key));
  })(ast);
}

// Film titles come out; a comment still in the film's own words is dropped or cut down to a plain divider.
function commentEdit(source, { start, end }) {
  const original = source.slice(start, end);
  const untitled = original.replace(/\s*〈[^〉]*〉[:：]?\s*/g, ' ').replace(/^\/\/ {2,}/, '// ');
  if (!CJK.test(untitled) || SAFE_COMMENT.test(untitled)) return untitled === original ? [] : [[start, end, untitled]];
  const divider = untitled.match(/^(\/\/|\/\*)\s*(-{5,})\s*([ -~]*?)\s*(?=[:：\u3400-\u9fff]|\*\/|$)/);
  if (divider) {
    const label = divider[3].replace(/-+$/, '').trim();
    return [[start, end, `${divider[1]} ${divider[2]}${label ? ` ${label}` : ''}${original.startsWith('/*') ? ' */' : ''}`]];
  }
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const lineEnd = source.indexOf('\n', end) === -1 ? source.length : source.indexOf('\n', end);
  if (source.slice(lineStart, start).trim()) return [[source.slice(0, start).trimEnd().length, end, '']];
  if (source.slice(end, lineEnd).trim()) return [[start, end + (source.slice(end, lineEnd).length - source.slice(end, lineEnd).trimStart().length), '']];
  return [[lineStart, Math.min(lineEnd + 1, source.length), '']];
}

// Changes only one published file needs, by its path in the skill.
const STILLS_NOTE = '本版的目錄裡，有些條目沒有定格圖；照文字描述使用即可。';
const FILE_RULES = {
  'assets/demos/README.md': (text) => text.replace(/^# .*$/m, (heading) => `${heading}\n\n${STILLS_NOTE}`),
  // Words these two films' scenes draw directly: a new film has to supply its own.
  'assets/shells/rooms/demos.js': (text) => text
    .replace(/^(\s*(\w+): \{ (?:id|text)[^\n]*?)short: '[^']*'(, sub: '[^']*')?/gm, (_, lead, card, sub) => `${lead}short: '{{FILL:demo.${card}.short}}'${sub ? `, sub: '{{FILL:demo.${card}.sub}}'` : ''}`)
    .replace(/(\/\/ card 1): [^\n]*/, '$1'),
  'assets/shells/board/tools/keystills.mjs': (text) => text.replace(/x8-[^']*/, 'x8-same-rule-three-places'),
  'assets/shells/rewind/demos.js': (text) => text
    .replace(/>[㐀-鿿（）]+</g, ((col) => () => `>{{FILL:demo.table.col${++col}}}<`)(0))
    .replace(/\['[㐀-鿿]+',/g, ((row) => () => `['{{FILL:demo.table.row${++row}}}',`)(0))
    .replace(/'[㐀-鿿]+'(\);\s*doc\.appendChild)/, "'{{FILL:demo.doc.title}}'$1"),
};
const NEW_CONTENT_FILE = /^assets\/shells\/.*content[^/]*$/i;

// The list of glyphs to preload keeps every character but no longer reads as the film's sentences.
function tidyShellCode(text) {
  return text
    .replace(/(\.join\(''\)\s*\+\s*')([^'\n]{20,})(';)/g, (_, lead, glyphs, tail) => `${lead}${[...new Set(glyphs)].sort().join('')}${tail}`)
    .replace(/<title>[^<]*[㐀-鿿][^<]*<\/title>/, '<title>Film</title>')
    .replace(/^\s*\/\/.*$/gm, (comment) => comment.replace(/\s*〈[^〉]*〉/g, ''));
}

/** What a skill file becomes in the public copy, before the text rules run. */
export function shapeForPublic(rel, text) {
  const shell = rel.match(SHELL_CONTENT);
  if (shell) return blankShellContent(shell[1], text);
  if (NEW_CONTENT_FILE.test(rel)) throw new Error(`${rel} looks like film content in a form the sync does not know; update SHELLS in scripts/video-public.mjs`);
  const shaped = FILE_RULES[rel] ? FILE_RULES[rel](text) : text;
  return /^assets\/shells\/.+\.(m?js|html)$/.test(rel) ? tidyShellCode(shaped) : shaped;
}

export const isRemoved = (rel) => REMOVED.some((pattern) => pattern.test(rel));

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

const reviewedLinesFile = (repoRoot) => path.join(repoRoot, OVERLAY_DIR, 'reviewed-lines.json');
export const readReviewedLines = (repoRoot) => new Set(fs.existsSync(reviewedLinesFile(repoRoot)) ? JSON.parse(fs.readFileSync(reviewedLinesFile(repoRoot), 'utf8')) : []);
export const writeReviewedLines = (repoRoot, hashes) => fs.writeFileSync(reviewedLinesFile(repoRoot), `${JSON.stringify([...hashes].sort(), null, 0).replace(/,/g, ',\n')}\n`, 'utf8');

export function readApproved(repoRoot) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, OVERLAY_DIR, 'approved-images.json'), 'utf8'));
}
