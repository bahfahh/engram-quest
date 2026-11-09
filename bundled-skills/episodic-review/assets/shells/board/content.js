// content.js — every piece of on-screen text, where it lives in the room, and when it appears.
// Units: metres. Board coordinates: origin = board centre, x right, y up (board plane z = 0).
// Timing is not hand-placed: each beat's length comes from the reading rule
// new characters / 5 + 1.5 s per card + 2 s per code line + 7 s per photo push-in (+ demo time),
// recall = question/5 + 1.5 + 6 s countdown, reveal >= 8 s.

// ---------------------------------------------------------------- language and interface wording
// LANG is the language of this film. UI_SETS holds the shell's fixed wording (not the topic). A film in another
// language changes LANG, adds a set here if there is none, and rewrites the topic text below.
export const LANG = 'zh-tw';
const UI_SETS = {
  'zh-tw': { notice: '畫面是比喻；字都整理自你的筆記。', pause: '想多想一下，隨時按暫停。', folderDate: '2026・八月', contextHead: '情境（給你的入口）', openHead: '懸案（筆記裡還沒定論）', recallHead: '回想', revealHead: '揭曉', questionMark: '？', ruleLabel: '判斷規則', noteFigure: '筆記的圖', quizLabel: '快問 {n}／{of}', monthN: '{n} 月' },
  en: { notice: 'Pictures are metaphors. The words come from your notes.', pause: 'Need longer? Pause any time.', folderDate: 'August 2026', contextHead: 'Context (your way in)', openHead: 'Open case (no verdict in the notes)', recallHead: 'Recall', revealHead: 'Reveal', questionMark: '?', ruleLabel: 'Decision rule', noteFigure: 'From your notes', quizLabel: 'Quick question {n}/{of}', monthN: 'Month {n}' },
};
if (!UI_SETS[LANG]) console.error(`content.js: no interface strings for "${LANG}", showing the English set; add UI_SETS["${LANG}"] to translate them`);
export const UI = UI_SETS[LANG] || UI_SETS.en;

// ---------------------------------------------------------------- reading units
// CJK = 1, latin word <= 3 letters = 1, longer = 1.5, digits group = 1, punctuation/space = 0.
// In a language written with spaces every word counts 1.75 (about 2.9 words a second under the same ÷ 5 rule).
const SPACED = !/^(zh|ja)/i.test(LANG);
if (LANG !== 'zh-tw' && LANG !== 'en') console.error(`reading rate for "${LANG}" is not calibrated: counted ${SPACED ? 'per word' : 'per character'}, confirm by reading the stills`);
const WORD = /[㐀-鿿぀-ヿ]|(?:(?![㐀-鿿぀-ヿ])[\p{L}\p{N}])+(?:['’.\-](?:(?![㐀-鿿぀-ヿ])[\p{L}\p{N}])+)*/gu;
export function units(s) {
  if (!s) return 0;
  if (SPACED || /^ja/i.test(LANG)) return (String(s).match(WORD) || []).reduce((n, tk) => n + (/^[㐀-鿿぀-ヿ]$/u.test(tk) ? 1 : 1.75), 0);
  let n = 0;
  for (const tk of String(s).match(/[A-Za-z_][A-Za-z0-9_.+#\-]*|[0-9][0-9.,:%]*|[㐀-鿿]|./gu) || []) {
    if (/^[㐀-鿿]$/u.test(tk)) n += 1;
    else if (/^[A-Za-z_]/.test(tk)) n += tk.length <= 3 ? 1 : 1.5;
    else if (/^[0-9]/.test(tk)) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------- board geometry
export const BOARD = { W: 4.4, H: 1.85, cy: 1.92 };         // board centre 1.92 m above the floor
export const ZONES = {
  c1: { cx: -1.38, cy: -0.1, n: 0, name: '案件一' },
  c2: { cx: 0.0, cy: -0.1, n: 1, name: '案件二' },
  c3: { cx: 1.38, cy: -0.1, n: 2, name: '案件三' },
};

// ---------------------------------------------------------------- cards
// kind: case | ctx | note | def | rule | open | q | photo | copy | tag | link | clue | file | tline | grid | title | quote | gate | strip
// at: beat id that turns it face-up (absent = on the wall from the start). x,y are zone-local when zone is set.
// bg: background texture (not read in that beat). Photos are the note's own figures, pre-rendered to PNG with the project font.
export const CARDS = [
  // ---------- top band: title, knowledge base, the 12 topics not walked into (face-down until the ring)
  { id: 'title', kind: 'title', x: 0, y: 0.835, w: 1.06, h: 0.1, text: '{{FILL:title}}' },
  { id: 'kb', kind: 'clue', x: 0, y: 0.68, w: 0.62, h: 0.11, label: '{{FILL:kb.label}}', text: '{{FILL:kb}}', hot: true, at: 'ring', late: 0.62 },
  { id: 't1', kind: 'clue', x: -2.04, y: 0.835, w: 0.22, h: 0.105, text: '{{FILL:t1}}', at: 'ring', late: 0.30, bg: true },
  { id: 't2', kind: 'clue', x: -1.80, y: 0.83, w: 0.22, h: 0.105, text: '{{FILL:t2}}', at: 'ring', late: 0.32, bg: true },
  { id: 't3', kind: 'clue', x: -1.56, y: 0.838, w: 0.22, h: 0.105, text: '{{FILL:t3}}', at: 'ring', late: 0.34, bg: true },
  { id: 't4', kind: 'clue', x: -1.32, y: 0.83, w: 0.22, h: 0.105, text: '{{FILL:t4}}', at: 'ring', late: 0.36, bg: true },
  { id: 't5', kind: 'clue', x: -1.08, y: 0.836, w: 0.22, h: 0.105, text: '{{FILL:t5}}', at: 'ring', late: 0.38, bg: true },
  { id: 't6', kind: 'clue', x: -0.84, y: 0.83, w: 0.22, h: 0.105, text: '{{FILL:t6}}', at: 'ring', late: 0.40, bg: true },
  { id: 't7', kind: 'clue', x: 0.84, y: 0.83, w: 0.22, h: 0.105, text: '{{FILL:t7}}', at: 'ring', late: 0.42, bg: true },
  { id: 't8', kind: 'clue', x: 1.08, y: 0.836, w: 0.22, h: 0.105, text: '{{FILL:t8}}', at: 'ring', late: 0.44, bg: true },
  { id: 't9', kind: 'clue', x: 1.32, y: 0.83, w: 0.22, h: 0.105, text: '{{FILL:t9}}', at: 'ring', late: 0.46, bg: true },
  { id: 't10', kind: 'clue', x: 1.56, y: 0.838, w: 0.22, h: 0.105, text: '{{FILL:t10}}', at: 'ring', late: 0.48, bg: true },
  { id: 'c4', kind: 'case', x: 1.97, y: 0.81, w: 0.4, h: 0.17, label: '{{FILL:c4.label}}', text: '{{FILL:c4}}', small: true, bg: true },

  // ----------
  { id: 'c1.H', zone: 'c1', kind: 'case', x: -0.17, y: 0.555, w: 0.64, h: 0.15, label: '{{FILL:c1.H.label}}', text: '{{FILL:c1.H}}' },
  { id: 'c1.ctx', zone: 'c1', kind: 'ctx', x: 0.44, y: 0.555, w: 0.27, h: 0.16, at: 'c1_in', text: '{{FILL:c1.ctx.1}}・{{FILL:c1.ctx.2}}' },
  { id: 'c1.grid', zone: 'c1', kind: 'grid', x: -0.26, y: 0.205, w: 0.74, h: 0.49, at: 'c1_grid',
    head: '{{FILL:c1.grid.head}}',
    rows: [['{{FILL:c1.grid.rows.1.1}}', ''], ['{{FILL:c1.grid.rows.2.1}}', ''], ['{{FILL:c1.grid.rows.3.1}}', '{{FILL:c1.grid.rows.3.2}}'], ['{{FILL:c1.grid.rows.4.1}}', '{{FILL:c1.grid.rows.4.2}}']],
    icons: ['person', 'key', 'ticket', 'shield'],
    colA: { head: '{{FILL:c1.grid.colA.head}}', at: 'c1_grid', cells: ['{{FILL:c1.grid.colA.cells.1}}', '{{FILL:c1.grid.colA.cells.2}}', '{{FILL:c1.grid.colA.cells.3}}', '{{FILL:c1.grid.colA.cells.4}}'] },
    colB: { head: '{{FILL:c1.grid.colB.head}}', at: 'c1_grid2', cells: ['{{FILL:c1.grid.colB.cells.1}}', '{{FILL:c1.grid.colB.cells.2}}', '{{FILL:c1.grid.colB.cells.3}}', '{{FILL:c1.grid.colB.cells.4}}'] } },
  { id: 'c1.four', zone: 'c1', kind: 'note', x: 0.39, y: 0.0, w: 0.44, h: 0.085, at: 'c1_grid2', late: 0.55, text: '{{FILL:c1.four}}', pin: 'big' },
  { id: 'c1.fork', zone: 'c1', kind: 'tag', x: 0.39, y: 0.40, w: 0.44, h: 0.075, at: 'c1_fork', text: '{{FILL:c1.fork}}', red: true },
  { id: 'c1.self', zone: 'c1', kind: 'copy', x: 0.39, y: 0.265, w: 0.48, h: 0.15, at: 'c1_fork', title: '{{FILL:c1.self.title}}',
    code: ['{{FILL:c1.self.code.1}}'] },
  { id: 'c1.ext', zone: 'c1', kind: 'note', x: 0.39, y: 0.12, w: 0.48, h: 0.1, at: 'c1_fork', text: '{{FILL:c1.ext}}' },
  { id: 'c1.tree', zone: 'c1', kind: 'photo', x: 0.36, y: -0.17, w: 0.5, h: 0.242, at: 'c1_tree', src: 'assets/auth-tree', caption: UI.noteFigure },
  { id: 'c1.which', zone: 'c1', kind: 'rule', x: -0.42, y: -0.195, w: 0.4, h: 0.12, at: 'c1_which', text: '{{FILL:c1.which}}' },
  { id: 'c1.p1', zone: 'c1', kind: 'note', x: -0.42, y: -0.29, w: 0.4, h: 0.065, at: 'c1_which', text: '{{FILL:c1.p1}}' },
  { id: 'c1.p2', zone: 'c1', kind: 'note', x: -0.42, y: -0.365, w: 0.4, h: 0.065, at: 'c1_which', text: '{{FILL:c1.p2}}' },
  { id: 'c1.open', zone: 'c1', kind: 'open', x: -0.37, y: -0.565, w: 0.5, h: 0.16, at: 'c1_open',
    text: '{{FILL:c1.open}}' },
  { id: 'c1.K', zone: 'c1', kind: 'q', x: 0.06, y: -0.49, w: 0.36, h: 0.2, at: 'c1_recall',
    q: '{{FILL:c1.K.q}}',
    a: '{{FILL:c1.K.a}}', src: '{{FILL:c1.K.src}}' },
  { id: 'c1.swapA', zone: 'c1', kind: 'strip', x: -0.025, y: 0.29, w: 0.22, h: 0.3, at: 'c1_recall', text: '{{FILL:c1.swapA}}', blue: true },
  { id: 'c1.swapB', zone: 'c1', kind: 'strip', x: -0.025, y: 0.29, w: 0.22, h: 0.3, at: 'c1_reveal', late: 0.62, text: '{{FILL:c1.swapB}}', green: true },
  { id: 'c1.pano', zone: 'c1', kind: 'photo', x: 0.445, y: -0.445, w: 0.4, h: 0.206, at: 'c1_close', src: 'assets/auth-overview', caption: UI.noteFigure },
  { id: 'c1.verdict', zone: 'c1', kind: 'rule', x: 0.43, y: -0.615, w: 0.42, h: 0.085, at: 'c1_close', text: '{{FILL:c1.verdict}}', label: UI.ruleLabel },

  // ----------
  { id: 'c2.H', zone: 'c2', kind: 'case', x: -0.17, y: 0.555, w: 0.64, h: 0.15, label: '{{FILL:c2.H.label}}', text: '{{FILL:c2.H}}', sub: '{{FILL:c2.H.sub.1}}／{{FILL:c2.H.sub.2}}' },
  { id: 'c2.ctx', zone: 'c2', kind: 'ctx', x: 0.44, y: 0.555, w: 0.27, h: 0.16, at: 'c2_in', text: '{{FILL:c2.ctx.1}}・{{FILL:c2.ctx.2}}' },
  { id: 'c2.mvccP', zone: 'c2', kind: 'photo', x: -0.47, y: 0.27, w: 0.3, h: 0.236, at: 'c2_inc2', src: 'assets/sql-02', caption: UI.noteFigure },
  { id: 'c2.dTx', zone: 'c2', kind: 'def', x: 0.38, y: 0.385, w: 0.46, h: 0.1, at: 'c2_terms', text: '{{FILL:c2.dTx}}' },
  { id: 'c2.dPool', zone: 'c2', kind: 'def', x: 0.38, y: 0.27, w: 0.46, h: 0.09, at: 'c2_terms', late: 0.45, text: '{{FILL:c2.dPool}}' },
  { id: 'c2.inc1', zone: 'c2', kind: 'file', x: -0.36, y: -0.07, w: 0.54, h: 0.27, at: 'c2_inc1', stamp: '{{FILL:c2.inc1.stamp}}',
    title: '{{FILL:c2.inc1.title}}', lines: ['{{FILL:c2.inc1.lines.1.time}}　{{FILL:c2.inc1.lines.1}}', '{{FILL:c2.inc1.lines.2.time}}　{{FILL:c2.inc1.lines.2}}', '{{FILL:c2.inc1.lines.3.time}}　{{FILL:c2.inc1.lines.3}}'] },
  { id: 'c2.217', zone: 'c2', kind: 'tline', x: -0.36, y: -0.245, w: 0.5, h: 0.075, at: 'c2_culprit', text: '{{FILL:c2.217.time}}　{{FILL:c2.217}}' },
  { id: 'c2.formula', zone: 'c2', kind: 'copy', x: 0.36, y: 0.075, w: 0.52, h: 0.2, at: 'c2_pool', title: '{{FILL:c2.formula.title}}',
    rowsTxt: [['{{FILL:c2.formula.rowsTxt.1.1}}', '{{FILL:c2.formula.rowsTxt.1.2}}'], ['{{FILL:c2.formula.rowsTxt.2.1}}', '{{FILL:c2.formula.rowsTxt.2.2}}']] },
  { id: 'c2.two', zone: 'c2', kind: 'rule', x: 0.36, y: -0.075, w: 0.52, h: 0.07, at: 'c2_pool', late: 0.72, text: '{{FILL:c2.two}}' },
  { id: 'c2.inc2', zone: 'c2', kind: 'file', x: 0.36, y: -0.255, w: 0.52, h: 0.2, at: 'c2_inc2', stamp: '{{FILL:c2.inc2.stamp}}',
    title: '{{FILL:c2.inc2.title}}', lines: ['{{FILL:c2.inc2.lines.1}}', '{{FILL:c2.inc2.lines.2}}'] },
  { id: 'c2.K', zone: 'c2', kind: 'q', x: 0.0, y: -0.465, w: 0.36, h: 0.2, at: 'c2_recall',
    q: '{{FILL:c2.K.q}}',
    a: '{{FILL:c2.K.a}}', src: '{{FILL:c2.K.src}}' },
  { id: 'c2.rule', zone: 'c2', kind: 'rule', x: -0.4, y: -0.42, w: 0.44, h: 0.1, at: 'c2_rule', label: UI.ruleLabel, text: '{{FILL:c2.rule}}' },
  { id: 'c2.sql', zone: 'c2', kind: 'copy', x: -0.4, y: -0.565, w: 0.46, h: 0.15, at: 'c2_rule', title: '{{FILL:c2.sql.title}}',
    code: ['{{FILL:c2.sql.code.1}}', '{{FILL:c2.sql.code.2}}'] },
  { id: 'c2.photo4', zone: 'c2', kind: 'photo', x: 0.42, y: -0.52, w: 0.3, h: 0.24, at: 'c2_reveal', late: 0.7, src: 'assets/sql-04', caption: UI.noteFigure },
  { id: 'c2.verdict', zone: 'c2', kind: 'rule', x: 0.0, y: -0.625, w: 0.44, h: 0.1, at: 'c2_close', text: '{{FILL:c2.verdict}}' },

  // ----------
  { id: 'c3.H', zone: 'c3', kind: 'case', x: -0.17, y: 0.555, w: 0.64, h: 0.15, label: '{{FILL:c3.H.label}}', text: '{{FILL:c3.H}}' },
  { id: 'c3.ctx', zone: 'c3', kind: 'ctx', x: 0.44, y: 0.555, w: 0.27, h: 0.16, at: 'c3_in', text: '{{FILL:c3.ctx.1}}・{{FILL:c3.ctx.2}}' },
  { id: 'c3.open', zone: 'c3', kind: 'open', x: 0.33, y: 0.39, w: 0.56, h: 0.085, at: 'c3_in', late: 0.55, text: '{{FILL:c3.open}}', short: true },
  { id: 'c3.case', zone: 'c3', kind: 'file', x: -0.33, y: 0.25, w: 0.58, h: 0.31, at: 'c3_case', stamp: '', risks: true,
    title: '{{FILL:c3.case.title}}',
    lines: ['{{FILL:c3.case.lines.1}}', '{{FILL:c3.case.lines.2}}', '{{FILL:c3.case.lines.3}}'] },
  { id: 'c3.g1', zone: 'c3', kind: 'gate', x: -0.48, y: -0.015, w: 0.29, h: 0.12, at: 'c3_g1', n: '①', text: '{{FILL:c3.g1}}', sub: '{{FILL:c3.g1.sub}}' },
  { id: 'c3.g2', zone: 'c3', kind: 'gate', x: -0.16, y: -0.015, w: 0.29, h: 0.12, at: 'c3_g2', n: '②', text: '{{FILL:c3.g2}}', sub: '{{FILL:c3.g2.sub}}' },
  { id: 'c3.g3', zone: 'c3', kind: 'gate', x: 0.16, y: -0.015, w: 0.29, h: 0.12, at: 'c3_g3', n: '③', text: '{{FILL:c3.g3}}', sub: '{{FILL:c3.g3.sub}}' },
  { id: 'c3.g4', zone: 'c3', kind: 'gate', x: 0.48, y: -0.015, w: 0.29, h: 0.12, at: 'c3_g4', n: '④', text: '{{FILL:c3.g4}}', sub: '{{FILL:c3.g4.sub}}' },
  { id: 'c3.rule', zone: 'c3', kind: 'rule', x: 0.33, y: 0.255, w: 0.56, h: 0.11, at: 'c3_g1', late: 0.8, label: UI.ruleLabel, text: '{{FILL:c3.rule}}' },
  { id: 'c3.e2', zone: 'c3', kind: 'photo', x: -0.16, y: -0.145, w: 0.29, h: 0.106, at: 'c3_g2', src: 'assets/qa-mutant', caption: '{{FILL:c3.e2.caption}}' },
  { id: 'c3.e2b', zone: 'c3', kind: 'note', x: -0.16, y: -0.27, w: 0.3, h: 0.13, at: 'c3_g2', late: 0.78, text: '{{FILL:c3.e2b}}' },
  { id: 'c3.e3', zone: 'c3', kind: 'copy', x: 0.16, y: -0.16, w: 0.29, h: 0.13, at: 'c3_g3', title: '{{FILL:c3.e3.title}}',
    code: ['{{FILL:c3.e3.code.1}}', '{{FILL:c3.e3.code.2}}'] },
  { id: 'c3.e4', zone: 'c3', kind: 'note', x: 0.48, y: -0.16, w: 0.29, h: 0.13, at: 'c3_g4', late: 0.6, text: '{{FILL:c3.e4}}' },
  { id: 'c3.three', zone: 'c3', kind: 'copy', x: -0.33, y: -0.44, w: 0.56, h: 0.27, at: 'c3_three', title: '{{FILL:c3.three.title}}',
    layers: [['{{FILL:c3.three.layers.1.1}}', '{{FILL:c3.three.layers.1.2}}', '{{FILL:c3.three.layers.1.3}}'], ['{{FILL:c3.three.layers.2.1}}', '{{FILL:c3.three.layers.2.2}}', '{{FILL:c3.three.layers.2.3}}'], ['{{FILL:c3.three.layers.3.1}}', '{{FILL:c3.three.layers.3.2}}', '{{FILL:c3.three.layers.3.3}}']] },
  { id: 'c3.K', zone: 'c3', kind: 'q', x: 0.16, y: -0.5, w: 0.32, h: 0.19, at: 'c3_recall',
    q: '{{FILL:c3.K.q}}',
    a: '{{FILL:c3.K.a}}', src: '{{FILL:c3.K.src}}' },
  { id: 'c3.photo', zone: 'c3', kind: 'photo', x: 0.47, y: -0.5, w: 0.3, h: 0.131, at: 'c3_close', src: 'assets/qa-spectrum', caption: UI.noteFigure },
  { id: 'c3.verdict', zone: 'c3', kind: 'rule', x: 0.32, y: -0.62, w: 0.6, h: 0.08, at: 'c3_close', text: '{{FILL:c3.verdict}}' },
];

// ---------------------------------------------------------------- red threads
export const LINKS = [
  { id: 'L12', from: 'c1.H@T', to: 'c2.H@T', tag: [-0.98, 0.665], at: 'c1_exit', dir: '{{FILL:L12.dir}}', text: '{{FILL:L12}}' },
  { id: 'L23', from: 'c2.H@T', to: 'c3.H@T', tag: [0.98, 0.665], at: 'c2_exit', dir: '{{FILL:L23.dir}}', text: '{{FILL:L23}}' },
  { id: 'L34', from: 'c3.H@T', to: 'c4@B', tag: [1.68, 0.66], at: 'c3_exit', dir: '{{FILL:L34.dir}}', text: '{{FILL:L34}}' },
  { id: 'L41', from: 'c4@T', via: [[1.97, 0.905], [-1.7, 0.905]], to: 'c1.H@T', tag: [-1.7, 0.665], at: 'ring', dir: '{{FILL:L41.dir}}', text: '{{FILL:L41}}' },
];
export const RING = ['L12', 'L23', 'L34', 'L41'];     // the loop, in order
export const THREADS = [   // short yarn inside a case: [from, to, beat, (card that must be up first)]
  ['c1.fork@R', 'c1.self@R', 'c1_fork'], ['c1.self@R', 'c1.ext@R', 'c1_fork'], ['c1.four', 'c1.grid@4', 'c1_grid2'],
  ['c1.which@L', 'c1.p1@L', 'c1_which'], ['c1.p1@L', 'c1.p2@L', 'c1_which'],
  ['c2.217', 'c2.K', 'c2_recall'], ['c2.inc2', 'c2.K', 'c2_recall'],
  ['c3.case@1', 'c3.g2@T', 'c3_g2', 'c3.e2b'], ['c3.case@2', 'c3.g2@T', 'c3_g2', 'c3.e2b'], ['c3.case@3', 'c3.g2@T', 'c3_g2', 'c3.e2b'],
  ['c3.g1', 'c3.g2', 'c3_g2'], ['c3.g2', 'c3.g3', 'c3_g3'], ['c3.g3', 'c3.g4', 'c3_g4'],
];

// ---------------------------------------------------------------- the monitor (on the desk)
// The words the replays show (labels on actions). Code shown on screen is "looked at", not read: it is not counted.
export const SCREEN_TXT = {
  'c1-tree': { win: '{{FILL:scr.c1-tree.win}}', title: '{{FILL:scr.c1-tree.title}}', q: ['{{FILL:scr.c1-tree.q.1}}', '{{FILL:scr.c1-tree.q.2}}', '{{FILL:scr.c1-tree.q.3}}'], no: '{{FILL:scr.c1-tree.no}}', keep: '{{FILL:scr.c1-tree.keep}}', go: '{{FILL:scr.c1-tree.go}}' },
  'c1-swap': { mine: '{{FILL:scr.c1-swap.mine}}', rows: ['{{FILL:scr.c1-swap.rows.1}}', '{{FILL:scr.c1-swap.rows.2}}', '{{FILL:scr.c1-swap.rows.3}}', '{{FILL:scr.c1-swap.rows.4}}'], entra: '{{FILL:scr.c1-swap.entra}}', supa: '{{FILL:scr.c1-swap.supa}}', same: '{{FILL:scr.c1-swap.same}}' },
  'c2-pool': { inUse: '{{FILL:scr.c2-pool.inUse}}', need: '{{FILL:scr.c2-pool.need}}', queue: '{{FILL:scr.c2-pool.queue}}', flat: '{{FILL:scr.c2-pool.flat}}', hold0: '{{FILL:scr.c2-pool.hold0}}', hold1: '{{FILL:scr.c2-pool.hold1}}' },
  'c2-dash': { title: '{{FILL:scr.c2-dash.title}}', cpu: '{{FILL:scr.c2-dash.cpu}}', slow: '{{FILL:scr.c2-dash.slow}}', err: '{{FILL:scr.c2-dash.err}}', tag: '{{FILL:scr.c2-dash.tag}}', restart: '{{FILL:scr.c2-dash.restart}}' },
  'c2-flow': { fn: '{{FILL:scr.c2-flow.fn}}', head: '{{FILL:scr.c2-flow.head.time}}　{{FILL:scr.c2-flow.head}}', steps: ['{{FILL:scr.c2-flow.steps.1}}', '{{FILL:scr.c2-flow.steps.2}}', '{{FILL:scr.c2-flow.steps.3}}', '{{FILL:scr.c2-flow.steps.4}}'], erp: '{{FILL:scr.c2-flow.erp}}', slow: '{{FILL:scr.c2-flow.slow}}' },
  'c2-bloat': { pg: '{{FILL:scr.c2-bloat.pg}}', sweep: '{{FILL:scr.c2-bloat.sweep}}', why: '{{FILL:scr.c2-bloat.why}}', size: '{{FILL:scr.c2-bloat.size}}', q: '{{FILL:scr.c2-bloat.q}}', stop: '{{FILL:scr.c2-bloat.stop}}', dead: '{{FILL:scr.c2-bloat.dead}}' },
  'c3-term': { cmds: ['{{FILL:scr.c3-term.cmds.1}}', '{{FILL:scr.c3-term.cmds.2}}', '{{FILL:scr.c3-term.cmds.3}}'],
    err: '{{FILL:scr.c3-term.err}}', fix: '{{FILL:scr.c3-term.fix}}', ok: '{{FILL:scr.c3-term.ok}}' },
  'c3-mut': { file: '{{FILL:scr.c3-mut.file}}', a: '{{FILL:scr.c3-mut.a.1}} == {{FILL:scr.c3-mut.a.2}}', b: '{{FILL:scr.c3-mut.b}}', c: '{{FILL:scr.c3-mut.c}}',
    name: '{{FILL:scr.c3-mut.name}}', rule: '{{FILL:scr.c3-mut.rule}}', tests: '{{FILL:scr.c3-mut.tests}}', survived: '{{FILL:scr.c3-mut.survived}}', ai: '{{FILL:scr.c3-mut.ai}}', why: '{{FILL:scr.c3-mut.why}}' },
  'c3-valid': { from: '{{FILL:scr.c3-valid.from}}', ok: '{{FILL:scr.c3-valid.ok}}', bad: '{{FILL:scr.c3-valid.bad}}' },
  'c3-recon': { title: '{{FILL:scr.c3-recon.title}}', alarm: '{{FILL:scr.c3-recon.alarm}}' },
};

// ---------------------------------------------------------------- beats
// cards: ids turned face-up in this beat; texts are counted from them (plus screen labels listed in `scrTxt`).
// extra: seconds for motion / demo that are not reading time.
export const BEATS = [
  { id: 'intro', seg: 'intro', say: [UI.notice, UI.pause], extra: 1.2 },
  { id: 'pano', seg: 'pano', sayCards: ['c1.H', 'c2.H', 'c3.H'], note: '' },

  { id: 'c1_in', seg: 'c1', cards: ['c1.ctx'], extra: 1.4 },
  { id: 'c1_grid', seg: 'c1', cards: ['c1.grid'], gridCol: 'A', extra: 1.2 },
  { id: 'c1_grid2', seg: 'c1', gridCol: 'B', cards: ['c1.four'], extra: 1.0 },
  { id: 'c1_fork', seg: 'c1', cards: ['c1.fork', 'c1.self', 'c1.ext'], codeLines: 1, extra: 1.0 },
  { id: 'c1_tree', seg: 'c1', cards: ['c1.tree'], scr: 'c1-tree', scrTxt: ['q', 'keep', 'go'], demo: 8.5, extra: 1.0 },
  { id: 'c1_which', seg: 'c1', cards: ['c1.which', 'c1.p1', 'c1.p2'], extra: 1.0 },
  { id: 'c1_open', seg: 'c1', cards: ['c1.open'], extra: 1.0 },
  { id: 'c1_recall', seg: 'c1', kind: 'recall', card: 'c1.K', scr: 'c1-swap' },
  { id: 'c1_reveal', seg: 'c1', kind: 'reveal', card: 'c1.K', scr: 'c1-swap', scrTxt: ['entra', 'supa', 'same'], demo: 8.0, extra: 3.4 },
  { id: 'c1_close', seg: 'c1', cards: ['c1.pano', 'c1.verdict'], photos: 1, extra: 0.5 },
  { id: 'c1_exit', seg: 'c1', link: 'L12', extra: 1.6 },

  { id: 'c2_in', seg: 'c2', cards: ['c2.ctx'], extra: 1.2 },
  { id: 'c2_terms', seg: 'c2', cards: ['c2.dTx', 'c2.dPool'], scr: 'c2-pool', demo: 5.0, extra: 1.0 },
  { id: 'c2_inc1', seg: 'c2', cards: ['c2.inc1'], scr: 'c2-dash', scrTxt: ['cpu', 'slow', 'err', 'tag'], demo: 7.0, extra: 1.0 },
  { id: 'c2_culprit', seg: 'c2', cards: ['c2.217'], scr: 'c2-flow', scrTxt: ['head', 'erp', 'slow'], demo: 7.0, extra: 1.0 },
  { id: 'c2_pool', seg: 'c2', cards: ['c2.formula', 'c2.two'], post: ['c2.two'], scr: 'c2-pool', scrTxt: ['flat', 'hold0', 'hold1', 'inUse', 'need', 'queue'], demo: 11.5, extra: 1.4 },
  { id: 'c2_inc2', seg: 'c2', cards: ['c2.inc2', 'c2.mvccP'], scr: 'c2-bloat', scrTxt: ['why', 'stop', 'dead'], demo: 14.0, extra: 1.0 },
  { id: 'c2_recall', seg: 'c2', kind: 'recall', card: 'c2.K' },
  { id: 'c2_reveal', seg: 'c2', kind: 'reveal', card: 'c2.K', cards: ['c2.photo4'], post: ['c2.photo4'], scr: 'c2-split', demo: 8.0, extra: 1.4 },
  { id: 'c2_rule', seg: 'c2', cards: ['c2.rule', 'c2.sql'], scr: 'c2-clock', codeLines: 1, demo: 6.0, extra: 1.0 },
  { id: 'c2_close', seg: 'c2', cards: ['c2.verdict'], extra: 0.8 },
  { id: 'c2_exit', seg: 'c2', link: 'L23', extra: 1.6 },

  { id: 'c3_in', seg: 'c3', cards: ['c3.ctx', 'c3.open'], extra: 1.2 },
  { id: 'c3_case', seg: 'c3', cards: ['c3.case'], extra: 1.0 },
  { id: 'c3_g1', seg: 'c3', cards: ['c3.g1', 'c3.rule'], post: ['c3.rule'], scr: 'c3-term', scrTxt: ['err', 'fix', 'ok'], demo: 11.0, extra: 1.4 },
  { id: 'c3_g2', seg: 'c3', cards: ['c3.e2', 'c3.g2', 'c3.e2b'], post: ['c3.e2b'], scr: 'c3-mut', scrTxt: ['name', 'survived', 'ai', 'why'], demo: 12.0, extra: 2.0 },
  { id: 'c3_g3', seg: 'c3', cards: ['c3.g3', 'c3.e3'], scr: 'c3-valid', scrTxt: ['from', 'ok', 'bad'], codeLines: 1, demo: 7.0, extra: 1.0 },
  { id: 'c3_g4', seg: 'c3', cards: ['c3.g4', 'c3.e4'], post: ['c3.e4'], scr: 'c3-recon', scrTxt: ['title', 'alarm'], demo: 7.0, extra: 1.4 },
  { id: 'c3_three', seg: 'c3', cards: ['c3.three'], scr: 'c3-three', demo: 8.5, extra: 1.0 },
  { id: 'c3_recall', seg: 'c3', kind: 'recall', card: 'c3.K' },
  { id: 'c3_reveal', seg: 'c3', kind: 'reveal', card: 'c3.K', extra: 1.0 },
  { id: 'c3_close', seg: 'c3', cards: ['c3.photo', 'c3.verdict'], photos: 1, extra: 0.5 },
  { id: 'c3_exit', seg: 'c3', link: 'L34', extra: 1.6 },

  { id: 'ring', seg: 'ring', link: 'L41', cards: ['kb'], extra: 8.5, note: '' },
  { id: 'quiz2', seg: 'quiz', kind: 'quiz', hint: 'pool', hintCap: '{{FILL:quiz2.hintCap}}', q: '{{FILL:quiz2.q}}', a: '{{FILL:quiz2.a}}' },
  { id: 'quiz3', seg: 'quiz', kind: 'quiz', hint: 'mut', hintCap: '{{FILL:quiz3.hintCap}}', q: '{{FILL:quiz3.q}}', a: '{{FILL:quiz3.a}}' },
  { id: 'end', seg: 'end', extra: 6.0, note: '' },
];

// ---------------------------------------------------------------- timing
// Reading rule (strict, after the 2026-11-01 text check): every visible line/label is a "card":
// need = units / 5 + 1.5 s per line (0.5 s for labels under 3 units); code on cards/screens is looked at, not read (0.5 s a line).
// recall: question / 5 + 1.5 + 1.0 margin before the 6-second countdown starts; reveal >= 8 s.
export const byId = id => CARDS.find(c => c.id === id);
export function cardText(c) {
  if (!c || c.bg) return [];
  const lines = s => String(s || '').split('\n').filter(Boolean);
  if (c.kind === 'grid') return [c.head, c.colA.head, ...c.rows.map((r, i) => r.filter(Boolean).join('：') + '　' + c.colA.cells[i])];
  if (c.kind === 'q') return [];
  if (c.kind === 'file') return [c.title, c.sub, ...c.lines];   // the stamp is a glance
  if (c.kind === 'copy') return [c.title, ...(c.rowsTxt || []).map(r => r.join('：')), ...(c.layers || []).map(l => l[0] + '：' + l[1])];
  if (c.kind === 'case') return [c.label, c.text, c.sub];
  if (c.kind === 'gate') return [c.n + c.text, c.sub];
  if (c.kind === 'photo') return [];   // captions are not required reading
  if (c.kind === 'open' || c.id === 'c3.e2b') return [c.label, ...lines(c.text)];
  if (c.kind === 'rule') return [c.text];
  return [c.label, c.text];
}
function scrText(id, keys) {
  const S = SCREEN_TXT[id]; if (!S || !keys) return [];
  return keys.flatMap(k => [].concat(S[k]));
}
export const readNeed = texts => texts.filter(Boolean).reduce((a, s) => { const u = units(s); return a + u / 5 + (u >= 3 ? 1.5 : 0.5); }, 0);
const PHOTO = 4.0;   // push in on a note's own figure (not required reading)
const PAD = 0.5;      // settle time before reading starts (card turns over / camera arrives)
const SLACK = 1.0;
// cards in `post` go up after the screen: the camera comes back to the board (1.8 s), then they are read one by one
function postBlock(b, post, texts, sr) {
  if (!post.length) return 0;
  b.postAt = b.scrAt + sr; let pa = b.postAt + 1.0;
  for (const id of post) { const c = byId(id); b.appear[id] = pa; const tx = cardText(c); texts.push(...tx); pa += c.kind === 'photo' ? PHOTO : readNeed(tx) * SLACK; }
  return pa - b.postAt;
}
export const T = { beats: {}, segs: {} };
export const BEAT_LIST = [];
let t = 0.0;
for (const b of BEATS) {
  let texts = [], need = 0, dur = 0;
  const code = 0;   // code on a copy is looked at (1–3 key lines), not read
  if (b.kind === 'recall') {
    const K = byId(b.card); texts = [K.q];
    const read = units(K.q) / 5 + 1.5 + 1.0;
    b.countFrom = PAD + read; need = read + 6.0; dur = PAD + need + 0.8;
  } else if (b.kind === 'reveal') {
    const K = byId(b.card); const post = b.post || []; const board = [K.a];   // the citation is shown, not read
    for (const id of (b.cards || []).filter(id => !post.includes(id))) board.push(...cardText(byId(id)));
    const scr = scrText(b.scr, b.scrTxt); texts = [...board, ...scr];
    const br = Math.max(8, readNeed(board) * SLACK), sr = b.scr ? Math.max(readNeed(scr) * SLACK, b.demo || 0) : 0;
    b.boardEnd = PAD + br; b.scrAt = b.boardEnd + 1.2; b.appear = {};
    const pr = postBlock(b, post, texts, sr);
    need = br + sr + code + PHOTO * (b.photos || 0) + pr;
    dur = PAD + need + (b.extra || 0);
  } else if (b.kind === 'quiz') {
    texts = [b.q, b.a];
    const rq = units(b.q) / 5 + 1.5 + 1.0; b.countFrom = PAD + rq;
    b.ansAt = PAD + rq + 6.0;
    need = rq + 6.0 + (units(b.a) / 5 + 1.5) * SLACK; dur = PAD + need + 1.2;
  } else {
    const post = b.post || [];
    if (b.say) texts.push(...b.say);
    if (b.link) { const L = LINKS.find(l => l.id === b.link); texts.push(L.dir, L.text); }
    if (b.gridCol === 'B') { const g = byId('c1.grid'); texts.push(g.colB.head, ...g.colB.cells); }
    // cards turn over one after another: the next one when the previous one has been read (screen beats only;
    // other beats keep their hand-set `late`)
    let acc = PAD + readNeed(texts) * SLACK, last = -1; b.appear = {};
    for (const id of (b.cards || []).filter(id => !post.includes(id))) {
      const tx = cardText(byId(id)); if (b.scr) last = b.appear[id] = Math.max(0.3, last + 0.6, acc - 0.3);
      acc += readNeed(tx) * SLACK; texts.push(...tx);
    }
    if (b.sayCards) { const tt = b.sayCards.map(id => byId(id).text); texts.push(...tt); acc += readNeed(tt); }   // only the case questions are read
    const scr = scrText(b.scr, b.scrTxt);
    const br = acc - PAD + code, sr = b.scr ? Math.max(readNeed(scr) * SLACK, b.demo || 0) : 0;
    b.boardEnd = PAD + br; b.scrAt = b.boardEnd + 1.2;
    texts.push(...scr);
    const pr = postBlock(b, post, texts, sr);
    need = br + sr + PHOTO * (b.photos || 0) + pr;
    dur = PAD + need + (b.extra || 0);
    if (b.id === 'pano') {   // the camera stops at the title, then at each case card (the work light follows)
      b.stops = []; let s0 = 2.4;
      for (const id of b.sayCards) { const r = readNeed([byId(id).text]); b.stops.push({ id, at: s0, read: r }); s0 += 1.7 + r; }
      b.wideAt = s0 - 0.2; dur = s0 + 2.8;
    }
    if (b.id === 'ring') {   // link tag → the loop lights up (a dot runs once round) → the knowledge-base card
      const L = LINKS.find(l => l.id === b.link);
      b.linkRead = readNeed([L.dir, L.text]); b.kbRead = readNeed(cardText(byId('kb')));
      b.loopAt = 3.4 + b.linkRead; b.dotFrom = b.loopAt + 1.4; b.dotTo = b.dotFrom + 5.0;
      b.appear.kb = b.dotTo - 0.3; b.kbShot = b.dotTo + 0.3;
      dur = b.kbShot + 1.7 + b.kbRead + 0.6;
    }
  }
  b.t0 = t; b.dur = dur; b.t1 = t + dur; b.need = need; b.texts = texts.filter(Boolean);
  T.beats[b.id] = b; BEAT_LIST.push(b);
  if (!T.segs[b.seg]) T.segs[b.seg] = { t0: t, t1: t + dur }; else T.segs[b.seg].t1 = t + dur;
  t += dur;
}
export const DURATION = Math.ceil(t * 10) / 10;
export const beatAt = (time) => { for (let i = BEAT_LIST.length - 1; i >= 0; i--) if (time >= BEAT_LIST[i].t0) return BEAT_LIST[i]; return BEAT_LIST[0]; };
export const at = (id, off = 0) => T.beats[id].t0 + off;
