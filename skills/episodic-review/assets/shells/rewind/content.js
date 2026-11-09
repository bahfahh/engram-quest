// every piece of on-screen text, when it is on screen and what it is for.
// The timeline is built from beat durations (seconds); every text is placed relative to its beat.
// The scene and demos read this file; tools/dump.mjs turns it into onscreen.txt and checks reading time.
// use: 片頭 / 全貌 / 情境 / 問題 / 小標 / 判斷規則 / 回想 / 揭曉 / 原話 / 未解 / 證物 / 關係

// ---------------------------------------------------------------- language and interface wording
// LANG is the language of this film. UI_SETS holds the shell's fixed wording (not the topic). A film in another
// language changes LANG, adds a set here if there is none, and rewrites the topic text below.
export const LANG = 'zh-tw';
const UI_SETS = {
  'zh-tw': { notice: '畫面是比喻，字都是從你的筆記整理出來的。', pause: '想多想一下，隨時按暫停。', rewind: '倒　帶', fastForward: '快　轉', date: '10月{d}日', quizAgain: '拿掉情境，再想一次。', quizLabel: '快　問　{n}／{of}' },
  en: { notice: 'The pictures are metaphors. The words come from your notes.', pause: 'Want to think longer? Pause any time.', rewind: 'REWIND', fastForward: 'FAST FORWARD', date: 'Oct {d}', quizAgain: 'Without the setting, think it through again.', quizLabel: 'QUICK QUESTION {n}/{of}' },
};
if (!UI_SETS[LANG]) console.error(`content.js: no interface strings for "${LANG}", showing the English set; add UI_SETS["${LANG}"] to translate them`);
export const UI = UI_SETS[LANG] || UI_SETS.en;

let T = 0;
const beats = (list) => { const o = {}; for (const [k, d] of list) { o[k] = T; T += d; } o.out = T; return o; };
export const SEG = {};
const seg = (k, d) => { SEG[k] = [T, T + d]; T += d; };

seg('card', 8.6); seg('ov', 17.5); seg('desc', 3.5); seg('tt', 32); seg('rw', 9.5);
const s1a = T; export const B1 = beats([['arr', 9.5], ['q', 5.5], ['five', 12.5], ['cork', 9], ['ugly', 14], ['gate', 11], ['r1', 15.5], ['r2', 18], ['rec', 12.5], ['rev', 12.5], ['ab', 15], ['wrap', 12]]); SEG.s1 = [s1a, T];
seg('ff1', 6.5);
const s2a = T; export const B2 = beats([['arr', 9.5], ['q', 5.5], ['cse', 19], ['rows', 22.5], ['comp', 14], ['rset', 17], ['rec', 10.5], ['rev', 21], ['own', 31], ['wrap', 12.5]]); SEG.s2 = [s2a, T];
seg('ff2', 6.5);
const s3a = T; export const B3 = beats([['arr', 9.5], ['q', 5.5], ['v1', 18], ['v2', 16], ['v3', 31], ['std', 16.5], ['v4', 19], ['rec', 15], ['rev', 18], ['wrap', 12.5]]); SEG.s3 = [s3a, T];
const qa = T; seg('qz', 40.3); seg('end', 15);
export const DURATION = T;
// countdowns: question read first (字數 ÷ 5), then 6 s of silence
B1.cd = [B1.rec + 5.6, B1.rec + 11.6];
B2.cd = [B2.rec + 4.2, B2.rec + 10.2];
B3.cd = [B3.rec + 8.6, B3.rec + 14.6];
export const QZ = [
  { q0: qa + 4.0, cd: [qa + 7.6, qa + 13.6], a0: qa + 13.8, a1: qa + 21.8 },
  { q0: qa + 21.8, cd: [qa + 26.0, qa + 32.0], a0: qa + 32.2, a1: qa + 40.3 },
];

export const TXT = [];
const S = (id, t0, t1, text, use, where) => TXT.push({ id, t0, t1, text, use, where });

/* ---------- */
const C0 = SEG.card[0], O0 = SEG.ov[0], O1 = SEG.ov[1], TT0 = SEG.tt[0], TT1 = SEG.tt[1];
S('card1', C0 + 0.4, C0 + 8.6, UI.notice, '片頭', '畫面');
S('card2', C0 + 1.2, C0 + 8.6, UI.pause, '片頭', '畫面');
S('title', O0 + 0.4, O1, '{{FILL:title}}', '全貌', '畫面');
S('subtitle', O0 + 1.2, O1, '{{FILL:subtitle}}', '全貌', '畫面');
S('pin3', O0 + 5.0, O1, '{{FILL:pin3.1}}　{{FILL:pin3.2}}', '全貌', '畫面');
S('pin2', O0 + 6.6, O1, '{{FILL:pin2.1}}　{{FILL:pin2.2}}', '全貌', '畫面');
S('pin1', O0 + 9.6, O1, '{{FILL:pin1.1}}　{{FILL:pin1.2}}', '全貌', '畫面');
S('tt_head', TT0 + 1.0, TT1, '{{FILL:tt_head}}', '全貌', '時刻表');
S('tt_stop', TT0 + 2.0, TT1, '{{FILL:tt_stop}}', '全貌', '時刻表');
S('tt_r1', TT0 + 5.0, TT1, '{{FILL:tt_r1.1}}｜{{FILL:tt_r1.2}}｜{{FILL:tt_r1.3}}', '全貌', '時刻表');
S('tt_r2', TT0 + 10.5, TT1, '{{FILL:tt_r2.1}}｜{{FILL:tt_r2.2}}｜{{FILL:tt_r2.3}}', '全貌', '時刻表');
S('tt_r3', TT0 + 16.0, TT1, '{{FILL:tt_r3.1}}｜{{FILL:tt_r3.2}}｜{{FILL:tt_r3.3}}', '全貌', '時刻表');
S('tt_other', TT0 + 21.5, TT1, '{{FILL:tt_other}}', '全貌', '時刻表');
S('rw', SEG.rw[0] + 0.5, SEG.rw[1] - 0.4, UI.rewind, '情境', '畫面');

/* ---------- */
const b1 = B1;
S('s1_date', b1.arr + 0.6, b1.q - 0.4, '{{FILL:s1_date}}', '情境', '站牌');
S('s1_name', b1.arr + 0.9, b1.q - 0.4, '{{FILL:s1_name}}', '情境', '站牌');
S('s1_ctx', b1.arr + 1.2, b1.q - 0.4, '{{FILL:s1_ctx}}', '情境', '站牌');
S('s1_q', b1.q + 0.2, b1.rec - 0.3, '{{FILL:s1_q}}', '問題', '便條');
S('s1_pl', b1.five + 0.6, b1.cork, '{{FILL:s1_pl}}', '小標', '螢幕');
S('s1_g1', b1.five + 1.2, b1.ugly - 0.3, '{{FILL:s1_g1}}', '小標', '螢幕');
S('s1_g2', b1.five + 1.5, b1.ugly - 0.3, '{{FILL:s1_g2}}', '小標', '螢幕');
S('s1_g3', b1.five + 1.8, b1.ugly - 0.3, '{{FILL:s1_g3}}', '小標', '螢幕');
S('s1_g4', b1.five + 2.1, b1.ugly - 0.3, '{{FILL:s1_g4}}', '小標', '螢幕');
S('s1_g5', b1.five + 2.4, b1.ugly - 0.3, '{{FILL:s1_g5}}', '小標', '螢幕');
S('s1_sw', b1.five + 6.6, b1.ugly - 0.3, '{{FILL:s1_sw}}', '小標', '螢幕');
S('s1_tbl', b1.cork + 0.8, b1.ugly - 0.2, '{{FILL:s1_tbl}}', '證物', '軟木板');
S('s1_ug1', b1.ugly + 0.6, b1.ugly + 7.4, '{{FILL:s1_ug1}}', '小標', '螢幕');
S('s1_ug2', b1.ugly + 7.2, b1.gate - 0.3, '{{FILL:s1_ug2}}', '判斷規則', '螢幕');
S('s1_gate', b1.gate + 0.6, b1.r1 - 0.3, '{{FILL:s1_gate}}', '小標', '螢幕');
S('s1_ref', b1.gate + 1.4, b1.r1 - 0.3, '{{FILL:s1_ref}}', '小標', '螢幕');
S('s1_r1a', b1.r1 + 0.6, b1.r2 - 0.3, '{{FILL:s1_r1a}}', '小標', '螢幕');
S('s1_r1b', b1.r1 + 3.0, b1.r2 - 0.3, '{{FILL:s1_r1b}}', '小標', '螢幕');
S('s1_r1c', b1.r1 + 7.0, b1.r2 - 0.3, '{{FILL:s1_r1c}}', '小標', '螢幕');
S('s1_r2a', b1.r2 + 0.6, b1.rev - 0.3, '{{FILL:s1_r2a}}', '小標', '螢幕');
S('s1_r2b', b1.r2 + 5.0, b1.rev - 0.3, '{{FILL:s1_r2b}}', '小標', '螢幕');
S('s1_r2c', b1.r2 + 10.5, b1.rec - 0.3, '{{FILL:s1_r2c}}', '小標', '螢幕');
S('s1_rec', b1.rec + 0.4, b1.rev - 0.2, '{{FILL:s1_rec}}', '回想', '螢幕');
S('s1_ans', b1.rev + 0.4, b1.ab - 0.2, '{{FILL:s1_ans}}', '揭曉', '螢幕');
S('s1_ansrc', b1.rev + 0.4, b1.ab - 0.2, '{{FILL:s1_ansrc}}', '揭曉', '螢幕');
S('s1_ab1', b1.ab + 0.5, b1.wrap - 0.2, '{{FILL:s1_ab1}}', '小標', '螢幕');
S('s1_ab2', b1.ab + 1.6, b1.wrap - 0.2, '{{FILL:s1_ab2}}', '小標', '螢幕');
S('s1_ab3', b1.ab + 1.6, b1.wrap - 0.2, '{{FILL:s1_ab3}}', '小標', '螢幕');
S('s1_ab4', b1.ab + 5.0, b1.wrap - 0.2, '{{FILL:s1_ab4}}', '小標', '便條');
S('s1_open', b1.wrap + 5.6, b1.out + 0.6, '{{FILL:s1_open}}', '未解', '便條');
S('s1_rule', b1.wrap + 0.5, b1.out + 0.6, '{{FILL:s1_rule}}', '判斷規則', '索引卡');

S('ff', SEG.ff1[0] + 2.0, SEG.ff1[1] - 0.3, UI.fastForward, '情境', '畫面');

/* ---------- */
const b2 = B2;
S('s2_date', b2.arr + 0.6, b2.q - 0.4, '{{FILL:s2_date}}', '情境', '站牌');
S('s2_name', b2.arr + 0.9, b2.q - 0.4, '{{FILL:s2_name}}', '情境', '站牌');
S('s2_ctx', b2.arr + 1.2, b2.q - 0.4, '{{FILL:s2_ctx}}', '情境', '站牌');
S('s2_q', b2.q + 0.2, b2.rset - 0.3, '{{FILL:s2_q}}', '問題', '便條');
S('s2_c0', b2.cse + 0.4, b2.rows - 0.2, '{{FILL:s2_c0}}', '小標', '螢幕');
S('s2_c1', b2.cse + 0.4, b2.own, '{{FILL:s2_c1}}', '小標', '螢幕');
S('s2_tbl', b2.cse + 0.4, b2.own, '{{FILL:s2_tbl.1}}｜{{FILL:s2_tbl.2}}｜{{FILL:s2_tbl.3}}／{{FILL:s2_tbl.4}}／{{FILL:s2_tbl.5}}／{{FILL:s2_tbl.6}}／{{FILL:s2_tbl.7}}', '小標', '螢幕');
S('s2_c2', b2.cse + 3.5, b2.rows - 0.2, '{{FILL:s2_c2}}', '小標', '螢幕');
S('s2_c3', b2.cse + 5.0, b2.rows - 0.2, '{{FILL:s2_c3}}', '小標', '螢幕');
S('s2_c4', b2.cse + 9.0, b2.rows - 0.2, '{{FILL:s2_c4}}', '小標', '螢幕');
S('s2_rh', b2.rows + 0.5, b2.rset, '{{FILL:s2_rh}}', '小標', '螢幕');
S('s2_row1', b2.rows + 3.0, b2.own, '{{FILL:s2_row1.1}}｜{{FILL:s2_row1.2}}／{{FILL:s2_row1.3}}｜{{FILL:s2_row1.4}}', '小標', '螢幕');
S('s2_row2', b2.rows + 8.0, b2.own, '{{FILL:s2_row2.1}}｜{{FILL:s2_row2.2}}／{{FILL:s2_row2.3}}｜{{FILL:s2_row2.4}}', '小標', '螢幕');
S('s2_row3', b2.rows + 13.0, b2.own, '{{FILL:s2_row3.1}}｜{{FILL:s2_row3.2}}／{{FILL:s2_row3.3}}｜{{FILL:s2_row3.4}}', '小標', '螢幕');
S('s2_cp1', b2.comp + 0.4, b2.rset, '{{FILL:s2_cp1}}', '小標', '螢幕');
S('s2_cp2', b2.comp + 1.6, b2.own, '{{FILL:s2_cp2}}', '小標', '螢幕');
S('s2_cp3', b2.comp + 5.0, b2.rset, '{{FILL:s2_cp3}}', '小標', '螢幕');
S('s2_cp4', b2.comp + 7.0, b2.rset, '{{FILL:s2_cp4}}', '小標', '螢幕');
S('s2_rc0', b2.rset + 0.4, b2.rev + 4.6, '{{FILL:s2_rc0}}', '小標', '螢幕');
S('s2_leak', b2.rset + 0.4, b2.own, '{{FILL:s2_leak}}', '小標', '螢幕');
S('s2_rc1', b2.rset + 4.0, b2.own, '{{FILL:s2_rc1.1}}｜{{FILL:s2_rc1.2}}／{{FILL:s2_rc1.3}}｜{{FILL:s2_rc1.4}}', '小標', '螢幕');
S('s2_rec', b2.rec + 0.2, b2.rev - 0.1, '{{FILL:s2_rec}}', '回想', '螢幕');
S('s2_rv1', b2.rev + 1.0, b2.own, '{{FILL:s2_rv1}}', '揭曉', '螢幕');
S('s2_rv2', b2.rev + 5.0, b2.own, '{{FILL:s2_rv2}}', '揭曉', '螢幕');
S('s2_rv3', b2.rev + 6.4, b2.own, '{{FILL:s2_rv3}}', '揭曉', '螢幕');
S('s2_ans', b2.rev + 9.0, b2.own, '{{FILL:s2_ans}}', '揭曉', '螢幕');
S('s2_ansrc', b2.rev + 9.0, b2.own, '{{FILL:s2_ansrc}}', '揭曉', '螢幕');
S('s2_o1', b2.own + 3.0, b2.wrap - 0.2, '{{FILL:s2_o1}}', '小標', '螢幕');
S('s2_o2', b2.own + 6.5, b2.wrap - 0.2, '{{FILL:s2_o2}}', '小標', '螢幕');
S('s2_o4', b2.own + 11.0, b2.wrap - 0.2, '{{FILL:s2_o4}}', '小標', '便條');
S('s2_o5', b2.own + 12.0, b2.wrap - 0.2, '{{FILL:s2_o5.1}}／{{FILL:s2_o5.2}}／{{FILL:s2_o5.3}}／{{FILL:s2_o5.4}}／{{FILL:s2_o5.5}}', '原話', '便條');
S('s2_o7', b2.own + 21.0, b2.wrap - 0.2, '{{FILL:s2_o7}}', '小標', '螢幕');
S('s2_rule', b2.wrap + 0.5, b2.out + 0.6, '{{FILL:s2_rule}}', '判斷規則', '索引卡');
S('s2_open', b2.wrap + 5.2, b2.out + 0.6, '{{FILL:s2_open}}', '未解', '便條');

/* ---------- */
const b3 = B3;
S('s3_date', b3.arr + 0.6, b3.q - 0.4, '{{FILL:s3_date}}', '情境', '站牌');
S('s3_name', b3.arr + 0.9, b3.q - 0.4, '{{FILL:s3_name}}', '情境', '站牌');
S('s3_ctx', b3.arr + 1.2, b3.q - 0.4, '{{FILL:s3_ctx}}', '情境', '站牌');
S('s3_q', b3.q + 0.2, b3.rec - 0.3, '{{FILL:s3_q}}', '問題', '便條');
S('s3_v1a', b3.v1 + 0.5, b3.v2 - 0.2, '{{FILL:s3_v1a}}', '小標', '螢幕');
S('s3_v1b', b3.v1 + 2.5, b3.v2 - 0.2, '{{FILL:s3_v1b}}', '證物', '螢幕');
S('s3_v1c', b3.v1 + 5.0, b3.v2 - 0.2, '{{FILL:s3_v1c}}', '原話', '便條');
S('s3_v1d', b3.v1 + 10.5, b3.v2 - 0.2, '{{FILL:s3_v1d}}', '原話', '便條');
S('s3_v2a', b3.v2 + 0.5, b3.v3 - 0.2, '{{FILL:s3_v2a}}', '小標', '螢幕');
S('s3_v2b', b3.v2 + 2.5, b3.v3 - 0.2, '{{FILL:s3_v2b}}', '原話', '螢幕');
S('s3_v2c', b3.v2 + 7.0, b3.v3 - 0.2, '{{FILL:s3_v2c}}', '原話', '便條');
S('s3_v3a', b3.v3 + 0.5, b3.std - 0.2, '{{FILL:s3_v3a}}', '小標', '螢幕');
S('s3_v3s', b3.v3 + 2.0, b3.v3 + 15.5, '{{FILL:s3_v3s}}', '小標', '螢幕');
S('s3_kp1', b3.v3 + 4.5, b3.std - 0.2, '{{FILL:s3_kp1}}', '小標', '螢幕');
S('s3_kp2', b3.v3 + 6.5, b3.std - 0.2, '{{FILL:s3_kp2}}', '小標', '螢幕');
S('s3_kp3', b3.v3 + 8.5, b3.std - 0.2, '{{FILL:s3_kp3}}', '小標', '螢幕');
S('s3_kp4', b3.v3 + 10.5, b3.std - 0.2, '{{FILL:s3_kp4}}', '小標', '螢幕');
S('s3_v3c', b3.v3 + 18.5, b3.std - 0.2, '{{FILL:s3_v3c}}', '小標', '螢幕');
S('s3_v3d', b3.v3 + 21.0, b3.std - 0.2, '{{FILL:s3_v3d}}', '小標', '螢幕');
S('s3_st0', b3.std + 0.5, b3.v4 - 0.2, '{{FILL:s3_st0}}', '原話', '螢幕');
S('s3_st2', b3.std + 6.0, b3.v4 - 0.2, '{{FILL:s3_st2}}', '小標', '螢幕');
S('s3_st3', b3.std + 9.0, b3.v4 - 0.2, '{{FILL:s3_st3}}', '小標', '螢幕');
S('s3_v4a', b3.v4 + 0.5, b3.rec - 0.2, '{{FILL:s3_v4a}}', '小標', '螢幕');
S('s3_v4b', b3.v4 + 6.0, b3.rec - 0.2, '{{FILL:s3_v4b}}', '小標', '螢幕');
S('s3_v4c', b3.v4 + 9.0, b3.rec - 0.2, '{{FILL:s3_v4c}}', '原話', '便條');
S('s3_v4d', b3.v4 + 13.0, b3.rec - 0.2, '{{FILL:s3_v4d}}', '原話', '便條');
S('s3_rc1', b3.rec + 0.2, b3.rev, '{{FILL:s3_rc1}}', '原話', '螢幕');
S('s3_rc2', b3.rec + 0.8, b3.rev, '{{FILL:s3_rc2}}', '原話', '螢幕');
S('s3_rec', b3.rec + 3.6, b3.rev - 0.1, '{{FILL:s3_rec}}', '回想', '螢幕');
S('s3_rv1', b3.rev + 1.6, b3.wrap - 0.2, '{{FILL:s3_rv1}}', '揭曉', '螢幕');
S('s3_rv2', b3.rev + 5.0, b3.wrap - 0.2, '{{FILL:s3_rv2}}', '揭曉', '螢幕');
S('s3_ans', b3.rev + 7.0, b3.wrap - 0.2, '{{FILL:s3_ans}}', '揭曉', '螢幕');
S('s3_ansrc', b3.rev + 7.0, b3.wrap - 0.2, '{{FILL:s3_ansrc}}', '揭曉', '螢幕');
S('s3_rule', b3.wrap + 0.5, b3.out + 0.6, '{{FILL:s3_rule}}', '判斷規則', '索引卡');
S('s3_open', b3.wrap + 5.6, b3.out + 0.6, '{{FILL:s3_open}}', '未解', '便條');

/* ---------- */
S('qz0', qa + 0.1, qa + 4.0, UI.quizAgain, '回想', '畫面');
S('qz1q', QZ[0].q0, QZ[0].a0, '{{FILL:qz1q}}', '回想', '畫面');
S('qz1a', QZ[0].a0, QZ[0].a1, '{{FILL:qz1a}}', '揭曉', '畫面');
S('qz2q', QZ[1].q0, QZ[1].a0, '{{FILL:qz2q}}', '回想', '畫面');
S('qz2a', QZ[1].a0, QZ[1].a1, '{{FILL:qz2a}}', '揭曉', '畫面');

/* ---------- */
const E0 = SEG.end[0];
S('end_t', E0 + 1.5, DURATION, '{{FILL:end_t}}', '全貌', '畫面');
S('end_l1', E0 + 4.0, DURATION, '{{FILL:end_l1}}', '關係', '金線');
S('end_l2', E0 + 7.0, DURATION, '{{FILL:end_l2}}', '關係', '金線');

export const plain = s => s.replace(/\n/g, '');
export const tx = id => { const o = TXT.find(x => x.id === id); if (!o) throw new Error('no text ' + id); return o; };
