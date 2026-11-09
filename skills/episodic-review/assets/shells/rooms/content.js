// content.js — every word that appears in the film, with the time it appears (single source).
// kind: dom = overlay text; world = drawn on an object in the room (notebook, whiteboard, screen, sticky).
// use: 情境 / 問題 / 判斷規則 / 回想 / 揭曉 / 小標 (the five allowed uses; 小標 = name attached to an action)
// card: counts as a card (+1.5 s when it has 7+ characters). tex: texture — on screen but not meant to be read
// (UI chrome, axis ticks, the 17 other topic names, code around the one key line); dup: repeats words already read.
// exits: where a gate's arrows go (drawn as arrows + the landing box names, listed here for the text test)

// ---------------------------------------------------------------- language and interface wording
// LANG is the language of this film. UI_SETS holds the shell's fixed wording (not the topic). A film in another
// language changes LANG, adds a set here if there is none, and rewrites the topic text below.
export const LANG = 'zh-tw';
const UI_SETS = {
  'zh-tw': { notice: '畫面是比喻，字都整理自你的筆記。', pause: '想多停一下，隨時可以按暫停。', litRooms: '亮燈的三間，是這次要走進去的：', quizAgain: '不看剛才的房間，再想一次。', goodbye: '你走過的房間，燈都還亮著。', yes: '是', no: '否', srcOpen: '〈', srcClose: '〉' },
  en: { notice: 'The pictures are metaphors. The words come from your notes.', pause: 'Need longer? Pause any time.', litRooms: 'The three lit rooms are the ones we walk into:', quizAgain: 'Without the rooms, think it through again.', goodbye: 'The rooms you walked through are still lit.', yes: 'Yes', no: 'No', srcOpen: '“', srcClose: '”' },
};
if (!UI_SETS[LANG]) console.error(`content.js: no interface strings for "${LANG}", showing the English set; add UI_SETS["${LANG}"] to translate them`);
export const UI = UI_SETS[LANG] || UI_SETS.en;

export const TL = {
  open: [0, 8], over: [8, 38], dive: [38, 44],
  r1: [44, 186], r2: [186, 328], r3: [328, 479],
  shuffle: [479, 487], q1: [487, 507], q2: [507, 527], end: [527, 541],
};
// The story timeline above was laid out first; the reading-time check then stretched the beats that carry the most
// words and squeezed animation-only beats. renderAt(filmTime) plays storyTime = warp(filmTime).
export const WARP = [
  [0, 0], [9.5, 8], [39.5, 38], [44.1, 44], [54.3, 52.5], [67.3, 62], [96.8, 82], [119.3, 103], [158.9, 133], [174.8, 143], [184.6, 151], [191.1, 158], [206.9, 171], [224.1, 178], [232.1, 187], [235.1, 189], [242.1, 197], [248.2, 203], [266.2, 227], [280.2, 242], [309, 266], [328.5, 280], [336.5, 288], [343, 295], [355.2, 309], [366.2, 321], [372.7, 328], [375.7, 331], [386.3, 339], [391.9, 344.5], [410.4, 370], [415.9, 378], [426, 390], [434.6, 400], [469.2, 418], [477.8, 426], [484.3, 433], [495.3, 444], [506.3, 456], [521.3, 471], [526.3, 479], [531.8, 487], [539.8, 494], [545.8, 500], [559.8, 507], [566.3, 514], [572.3, 520], [584.8, 527], [596.3, 541],
];
export const DURATION = WARP[WARP.length - 1][0];
export function warp(t) { for (let i = 1; i < WARP.length; i++) if (t <= WARP[i][0]) { const [a0, b0] = WARP[i - 1], [a1, b1] = WARP[i]; return b0 + (b1 - b0) * (t - a0) / Math.max(1e-9, a1 - a0); } return WARP[WARP.length - 1][1]; }
export function unwarp(s) { for (let i = 1; i < WARP.length; i++) if (s <= WARP[i][1]) { const [a0, b0] = WARP[i - 1], [a1, b1] = WARP[i]; return a0 + (a1 - a0) * (s - b0) / Math.max(1e-9, b1 - b0); } return WARP[WARP.length - 1][0]; }

// beats inside each room (absolute seconds)
export const B = {
  r1: { enter: 44, ctx: 44.8, q: 52.5, A: 62, Bk: 82, C: 103, punch: 133, recall: { q: 143, c0: 151, c1: 158, end: 171 }, wrap: 171, door: 178, out: 186 },
  r2: { enter: 186, ctx: 189, q: 197, cas: 203, prof: 227, bench: 242, anal: 266, recall: { q: 280, c0: 288, c1: 295, end: 309 }, wrap: 309, out: 321 },
  r3: { enter: 328, ctx: 331, q: 339, mach: 344.5, outp: 370, grid: 378, llm: 390, gates: 400, recall: { q: 418, c0: 426, c1: 433, end: 444 }, cheap: 444, fix: 456, wrap: 471 },
  quiz: { q1: { q: 487.5, c0: 494, c1: 500, end: 507 }, q2: { q: 507.5, c0: 514, c1: 520, end: 527 } },
};

export const TEXT = [
  // ---------------------------------------------------------------- opening
  { id: 'open.1', t0: 0.6, t1: 7.6, kind: 'dom', use: '情境', text: UI.notice, card: true },
  { id: 'open.2', t0: 1.6, t1: 7.6, kind: 'dom', use: '情境', text: UI.pause, card: true },
  // ---------------------------------------------------------------- overview: only the three lit rooms need reading
  { id: 'over.title', t0: 9.0, t1: 37.4, kind: 'dom', use: '情境', text: '{{FILL:over.title}}', card: true },
  { id: 'over.f1', t0: 11.0, t1: 37.4, kind: 'dom', use: '紋理', tex: true, text: '{{FILL:over.f1}}', sub: '{{FILL:over.f1.sub.1}}・{{FILL:over.f1.sub.2}}・{{FILL:over.f1.sub.3}}' },
  { id: 'over.f2', t0: 14.0, t1: 37.4, kind: 'dom', use: '紋理', tex: true, text: '{{FILL:over.f2}}', sub: '{{FILL:over.f2.sub.1}}・{{FILL:over.f2.sub.2}}・{{FILL:over.f2.sub.3}}・{{FILL:over.f2.sub.4}}' },
  { id: 'over.f3', t0: 17.0, t1: 37.4, kind: 'dom', use: '紋理', tex: true, text: '{{FILL:over.f3}}', sub: '{{FILL:over.f3.sub.1}}・{{FILL:over.f3.sub.2}}・{{FILL:over.f3.sub.3}}・{{FILL:over.f3.sub.4}}・{{FILL:over.f3.sub.5}}' },
  { id: 'over.f4', t0: 20.0, t1: 37.4, kind: 'dom', use: '紋理', tex: true, text: '{{FILL:over.f4}}', sub: '{{FILL:over.f4.sub.1}}・{{FILL:over.f4.sub.2}}・{{FILL:over.f4.sub.3}}・{{FILL:over.f4.sub.4}}・{{FILL:over.f4.sub.5}}' },
  { id: 'over.lit', t0: 23.5, t1: 37.4, kind: 'dom', use: '情境', text: UI.litRooms, card: true },
  { id: 'over.n1', t0: 25.0, t1: 37.4, kind: 'dom', use: '小標', text: '{{FILL:over.n1}}', sub: '{{FILL:over.n1.sub}}', card: true },
  { id: 'over.n2', t0: 27.5, t1: 37.4, kind: 'dom', use: '小標', text: '{{FILL:over.n2}}', card: true },
  { id: 'over.n3', t0: 29.5, t1: 37.4, kind: 'dom', use: '小標', text: '{{FILL:over.n3}}', card: true },
  { id: 'dive.cal', t0: 40.0, t1: 186, kind: 'world', where: '月曆', use: '情境', text: '{{FILL:dive.cal}}' },

  // ---------------------------------------------------------------- room 1
  { id: 'r1.ctx', t0: 44.8, t1: 186, kind: 'world', where: '筆記本', use: '情境', text: '{{FILL:r1.ctx}}', card: true },
  { id: 'r1.q', t0: 52.5, t1: 186, kind: 'world', where: '白板', use: '問題', text: '{{FILL:r1.q}}', card: true },
  { id: 'r1.q.ddd', t0: 54.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.q.ddd}}', card: true },
  { id: 'r1.start', t0: 62, t1: 186, kind: 'world', where: '白板', use: '紋理', tex: true, text: '{{FILL:r1.start}}' },
  { id: 'r1.q1', t0: 62.5, t1: 186, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r1.q1}}', card: true, exits: '{{FILL:r1.q1.exits}}' },
  { id: 'r1.cardA', t0: 63.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.cardA}}', card: true },
  { id: 'r1.mA.h1', t0: 66.5, t1: 82, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mA.h1}}', card: true },
  { id: 'r1.mA.c1', t0: 66.5, t1: 82, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r1.mA.c1}}' },
  { id: 'r1.mA.h2', t0: 70.0, t1: 82, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mA.h2}}', card: true },
  { id: 'r1.mA.key', t0: 70.0, t1: 82, kind: 'world', where: '螢幕', use: '小標', code: true, text: '{{FILL:r1.mA.key}}', card: true },
  { id: 'r1.mA.c2', t0: 70.0, t1: 82, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r1.mA.c2}}' },
  { id: 'r1.mA.6', t0: 75, t1: 82, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r1.mA.6}}' },
  { id: 'r1.slotE', t0: 77.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.slotE}}', sub: '{{FILL:r1.slotE.sub}}', card: true },
  { id: 'r1.q2', t0: 82, t1: 186, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r1.q2}}', card: true, exits: '{{FILL:r1.q2.exits}}' },
  { id: 'r1.cardB', t0: 83.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.cardB}}', sub: '{{FILL:r1.cardB.sub}}', card: true },
  { id: 'r1.mB.tables', t0: 88, t1: 103, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r1.mB.tables.1}}・{{FILL:r1.mB.tables.2}}・{{FILL:r1.mB.tables.3}}・{{FILL:r1.mB.tables.4}}・{{FILL:r1.mB.tables.5}}' },
  { id: 'r1.mB.out', t0: 91.5, t1: 103, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mB.out}}' },
  { id: 'r1.mB.ro', t0: 93, t1: 103, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r1.mB.ro}}' },
  { id: 'r1.br2', t0: 96.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: UI.no },
  { id: 'r1.slotD', t0: 98, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.slotD}}', sub: '{{FILL:r1.slotD.sub}}', card: true },
  { id: 'r1.q3', t0: 103, t1: 186, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r1.q3}}', card: true, exits: '{{FILL:r1.q3.exits}}' },
  { id: 'r1.cardC', t0: 104.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.cardC}}', card: true },
  { id: 'r1.mC.1', t0: 109, t1: 133, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mC.1}}', card: true },
  { id: 'r1.mC.ui', t0: 109.5, t1: 133, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r1.mC.ui.1}}・{{FILL:r1.mC.ui.2}}・{{FILL:r1.mC.ui.3}}・{{FILL:r1.mC.ui.4}}・{{FILL:r1.mC.ui.5}}／{{FILL:r1.mC.ui.6}}' },
  { id: 'r1.slotT', t0: 112, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.slotT}}', card: true },
  { id: 'r1.mC.2', t0: 115, t1: 133, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mC.2}}', card: true },
  { id: 'r1.mC.3', t0: 121, t1: 133, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r1.mC.3}}', card: true },
  { id: 'r1.mC.code', t0: 124, t1: 133, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r1.mC.code.1}}・{{FILL:r1.mC.code.2}}' },
  { id: 'r1.mC.409', t0: 124, t1: 133, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r1.mC.409}}' },
  { id: 'r1.slotG', t0: 127.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.slotG}}', sub: '{{FILL:r1.slotG.sub}}', card: true },
  { id: 'r1.punch.cards', t0: 133.5, t1: 186, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r1.punch.cards.1}}／{{FILL:r1.punch.cards.2}}', sub: '{{FILL:r1.punch.cards.sub}}', card: true },
  { id: 'r1.short', t0: 77.5, t1: 186, kind: 'world', where: '白板', use: '紋理', dup: true, tex: true, text: '{{FILL:r1.short.1}}・{{FILL:r1.short.2}}・{{FILL:r1.short.3}}・{{FILL:r1.short.4}}・{{FILL:r1.short.5}}' },
  { id: 'r1.punch.rule', t0: 137.5, t1: 186, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r1.punch.rule}}', card: true },
  { id: 'r1.recall.q', t0: 143, t1: 171, kind: 'dom', use: '回想', text: '{{FILL:r1.recall.q}}' },
  { id: 'r1.recall.a', t0: 158, t1: 171, kind: 'dom', use: '揭曉', text: '{{FILL:r1.recall.a}}', src: '{{FILL:r1.recall.a.src}}' },
  { id: 'r1.wrap', t0: 171.5, t1: 186, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r1.wrap}}', card: true },
  { id: 'r1.open', t0: 174, t1: 186, kind: 'world', where: '便條', use: '判斷規則', text: '{{FILL:r1.open}}', card: true },
  { id: 'r1.door', t0: 179, t1: 187, kind: 'world', where: '紙條', use: '小標', text: '{{FILL:r1.door}}', card: true },

  // ---------------------------------------------------------------- room 2
  { id: 'r2.ctx', t0: 189, t1: 328, kind: 'world', where: '筆記本', use: '情境', text: '{{FILL:r2.ctx}}', card: true },
  { id: 'r2.q', t0: 197, t1: 328, kind: 'world', where: '白板', use: '問題', text: '{{FILL:r2.q}}', card: true },
  { id: 'r2.case.h', t0: 203.5, t1: 227, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.case.h}}', card: true },
  { id: 'r2.case.code', t0: 203.5, t1: 227, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r2.case.code}}' },
  { id: 'r2.case.count', t0: 204.5, t1: 227, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r2.case.count}}' },
  { id: 'r2.case.axis', t0: 208, t1: 227, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r2.case.axis.1}}・{{FILL:r2.case.axis.2}}・{{FILL:r2.case.axis.3}}・{{FILL:r2.case.axis.4}}・{{FILL:r2.case.axis.5}}・{{FILL:r2.case.axis.6}}・{{FILL:r2.case.axis.7}}・{{FILL:r2.case.axis.8}}' },
  { id: 'r2.case.leg', t0: 208.5, t1: 227, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r2.case.leg.1}}／{{FILL:r2.case.leg.2}}' },
  { id: 'r2.case.l', t0: 212, t1: 227, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.case.l}}', card: true },
  { id: 'r2.case.r', t0: 217.5, t1: 227, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.case.r}}', card: true },
  { id: 'r2.prof.h', t0: 227.5, t1: 242, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.prof.h}}', card: true },
  { id: 'r2.prof.ui', t0: 229, t1: 242, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r2.prof.ui.1}}・{{FILL:r2.prof.ui.2}}・{{FILL:r2.prof.ui.3}}・{{FILL:r2.prof.ui.4}}・{{FILL:r2.prof.ui.5}}' },
  { id: 'r2.prof.hot', t0: 233, t1: 242, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.prof.hot}}' },
  { id: 'r2.prof.code', t0: 234, t1: 242, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r2.prof.code}}' },
  { id: 'r2.scale1', t0: 239.6, t1: 328, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r2.scale1}}', card: true },
  { id: 'r2.bench.h', t0: 242.5, t1: 266, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.bench.h}}', card: true },
  { id: 'r2.bench.ex', t0: 243, t1: 266, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.bench.ex}}', card: true },
  { id: 'r2.bench.code', t0: 243.5, t1: 266, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r2.bench.code}}' },
  { id: 'r2.bench.res', t0: 250, t1: 266, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.bench.res.1}}・{{FILL:r2.bench.res.2}}／{{FILL:r2.bench.res.3}}・{{FILL:r2.bench.res.4}}', card: true },
  { id: 'r2.bench.note', t0: 250, t1: 266, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.bench.note}}', card: true },
  { id: 'r2.bench.ui', t0: 250, t1: 266, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r2.bench.ui.1}}・{{FILL:r2.bench.ui.2}}・{{FILL:r2.bench.ui.3}}' },
    { id: 'r2.scale2', t0: 263.6, t1: 328, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r2.scale2}}', card: true },
  { id: 'r2.anal.h', t0: 266.5, t1: 280, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.anal.h}}', card: true },
  { id: 'r2.anal.code', t0: 267, t1: 280, kind: 'world', where: '螢幕', use: '紋理', tex: true, code: true, text: '{{FILL:r2.anal.code.1}}・{{FILL:r2.anal.code.2}}・{{FILL:r2.anal.code.3}}・{{FILL:r2.anal.code.4}}・{{FILL:r2.anal.code.5}}・{{FILL:r2.anal.code.6}}・{{FILL:r2.anal.code.7}}' },
  { id: 'r2.anal.err', t0: 271, t1: 280, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r2.anal.err}}', card: true },
  { id: 'r2.anal.quote', t0: 274.5, t1: 280, kind: 'world', where: '螢幕', use: '判斷規則', text: '{{FILL:r2.anal.quote}}', card: true },
  { id: 'r2.scale3', t0: 277.6, t1: 328, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r2.scale3}}', card: true },
  { id: 'r2.recall.q', t0: 280, t1: 309, kind: 'dom', use: '回想', text: '{{FILL:r2.recall.q}}' },
  { id: 'r2.recall.a', t0: 295, t1: 309, kind: 'dom', use: '揭曉', text: '{{FILL:r2.recall.a}}', src: '{{FILL:r2.recall.a.src}}' },
  { id: 'r2.wrap', t0: 309.5, t1: 328, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r2.wrap}}', card: true },

  // ---------------------------------------------------------------- room 3
  { id: 'r3.ctx', t0: 331, t1: 479, kind: 'world', where: '筆記本', use: '情境', text: '{{FILL:r3.ctx}}', card: true },
  { id: 'r3.q', t0: 339, t1: 479, kind: 'world', where: '白板', use: '問題', text: '{{FILL:r3.q}}', card: true },
  { id: 'r3.f', t0: 345, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.f}}', card: true },
  { id: 'r3.sig1', t0: 351, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.sig1.1}}：{{FILL:r3.sig1.2}}', card: true },
  { id: 'r3.sig2', t0: 356.5, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.sig2.1}}：{{FILL:r3.sig2.2}}' , card: true },
  { id: 'r3.sig3', t0: 362, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.sig3.1}}：{{FILL:r3.sig3.2}}', card: true },
  { id: 'r3.sig3.tiles', t0: 358.5, t1: 363, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r3.sig3.tiles.1}} → {{FILL:r3.sig3.tiles.2}}' },
  { id: 'r3.sig4', t0: 368, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.sig4.1}}：{{FILL:r3.sig4.2}}', card: true },
  { id: 'r3.out', t0: 371, t1: 378, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.out.1}}・{{FILL:r3.out.2}}・{{FILL:r3.out.3}}・{{FILL:r3.out.4}}', card: true },
  { id: 'r3.out.items', t0: 371, t1: 378, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r3.out.items.1}}・{{FILL:r3.out.items.2}}・{{FILL:r3.out.items.3}}・{{FILL:r3.out.items.4}}' },
  { id: 'r3.grid', t0: 379, t1: 400, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.grid.1}}・{{FILL:r3.grid.2}}・{{FILL:r3.grid.3}}・{{FILL:r3.grid.4}}', card: true },
  { id: 'r3.grid.tex', t0: 379, t1: 400, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r3.grid.tex.1}}・{{FILL:r3.grid.tex.2}}・{{FILL:r3.grid.tex.3}}' },
  { id: 'r3.grid.note', t0: 385, t1: 400, kind: 'world', where: '螢幕', use: '判斷規則', text: '{{FILL:r3.grid.note}}', card: true },
  { id: 'r3.llm.cands', t0: 390.6, t1: 400, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r3.llm.cands}}' },
  { id: 'r3.llm', t0: 391, t1: 400, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.llm}}', card: true },
  { id: 'r3.gate1', t0: 400.5, t1: 479, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r3.gate1}}', card: true, exits: '{{FILL:r3.gate1.exits.1}}／{{FILL:r3.gate1.exits.2}}' },
  { id: 'r3.gate2', t0: 401, t1: 479, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r3.gate2}}', sub: '{{FILL:r3.gate2.sub.1}}；{{FILL:r3.gate2.sub.2}}', card: true, exits: '{{FILL:r3.gate2.exits}}' },
  { id: 'r3.gate3', t0: 401.5, t1: 479, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r3.gate3}}', sub: '{{FILL:r3.gate3.sub.1}}；{{FILL:r3.gate3.sub.2}}', card: true, exits: '{{FILL:r3.gate3.exits}}' },
  { id: 'r3.gate4', t0: 402, t1: 479, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r3.gate4}}', sub: '{{FILL:r3.gate4.sub.1}}；{{FILL:r3.gate4.sub.2}}', card: true, exits: '{{FILL:r3.gate4.exits}}' },
  { id: 'r3.card1', t0: 403, t1: 418, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r3.card1}}', card: true },
  { id: 'r3.land', t0: 404, t1: 479, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r3.land.1}} → {{FILL:r3.land.2}}／{{FILL:r3.land.3}}・{{FILL:r3.land.4}} → {{FILL:r3.land.5}}・{{FILL:r3.land.6}} → {{FILL:r3.land.7}}', card: true },
  { id: 'r3.ans1', t0: 404.5, t1: 418, kind: 'world', where: '白板', use: '小標', text: '{{FILL:r3.ans1.1}}・{{FILL:r3.ans1.2}}' },
  { id: 'r3.card2', t0: 418, t1: 479, kind: 'world', where: '白板', use: '回想', dup: true, text: '{{FILL:r3.card2}}' },
  { id: 'r3.ans2', t0: 433.2, t1: 479, kind: 'world', where: '白板', use: '揭曉', dup: true, text: '{{FILL:r3.ans2.1}}・{{FILL:r3.ans2.2}}' },
  { id: 'r3.recall.q', t0: 418, t1: 444, kind: 'dom', use: '回想', text: '{{FILL:r3.recall.q}}' },
  { id: 'r3.recall.a', t0: 433, t1: 444, kind: 'dom', use: '揭曉', text: '{{FILL:r3.recall.a}}', src: '{{FILL:r3.recall.a.src}}' },
  { id: 'r3.cheap', t0: 445, t1: 456, kind: 'world', where: '螢幕', use: '小標', text: '{{FILL:r3.cheap}}', card: true },
  { id: 'r3.cheap.ui', t0: 445, t1: 456, kind: 'world', where: '螢幕', use: '紋理', tex: true, text: '{{FILL:r3.cheap.ui.1}}・{{FILL:r3.cheap.ui.2}}・{{FILL:r3.cheap.ui.3}}・{{FILL:r3.cheap.ui.4}}' },
  { id: 'r3.fix.old', t0: 456.5, t1: 479, kind: 'world', where: '便利貼', use: '判斷規則', text: '{{FILL:r3.fix.old}}', card: true },
  { id: 'r3.fix.new', t0: 460.5, t1: 479, kind: 'world', where: '便利貼', use: '判斷規則', text: '{{FILL:r3.fix.new}}', card: true },
  { id: 'r3.wrap', t0: 471.5, t1: 479, kind: 'world', where: '白板', use: '判斷規則', text: '{{FILL:r3.wrap}}', card: true },

  // ---------------------------------------------------------------- quick quiz + ending
  { id: 'quiz.title', t0: 479.6, t1: 486.8, kind: 'dom', use: '回想', text: UI.quizAgain, card: true },
  { id: 'quiz.q1', t0: 487.5, t1: 507, kind: 'dom', use: '回想', text: '{{FILL:quiz.q1}}' },
  { id: 'quiz.a1', t0: 500, t1: 507, kind: 'dom', use: '揭曉', text: '{{FILL:quiz.a1}}', src: '{{FILL:quiz.a1.src}}' },
  { id: 'quiz.q2', t0: 507.5, t1: 527, kind: 'dom', use: '回想', text: '{{FILL:quiz.q2}}' },
  { id: 'quiz.a2', t0: 520, t1: 527, kind: 'dom', use: '揭曉', text: '{{FILL:quiz.a2}}', src: '{{FILL:quiz.a2.src}}' },
  { id: 'end.title', t0: 529, t1: 540.6, kind: 'dom', use: '情境', text: '{{FILL:end.title}}', card: true },
  { id: 'end.l1', t0: 530.5, t1: 540.6, kind: 'dom', use: '小標', text: '{{FILL:end.l1}}', card: true },
  { id: 'end.tg', t0: 531.5, t1: 540.6, kind: 'dom', use: '紋理', tex: true, text: '{{FILL:end.tg}}' },
  { id: 'end.bye', t0: 534, t1: 540.6, kind: 'dom', use: '情境', text: UI.goodbye, card: true },
];
export const T = Object.fromEntries(TEXT.map(e => [e.id, e]));
