// prints "time name" for the key stills, anchored to beats (so they survive timing changes)
// [name, beat, anchor, offset]: anchor is a field of the beat measured from its start (scrAt, postAt, countFrom, dotFrom, kbShot…),
// or 't0' / 't1' (offset from the beat's start / end).
import * as D from '../content.js';
const B = D.T.beats;
const f = (id, an, o) => { const b = B[id]; const base = an === 't0' ? b.t0 : an === 't1' ? b.t1 : an === 'stop2' ? b.t0 + b.stops[1].at + 2.0 : b.t0 + b[an]; return (base + o).toFixed(1); };
export const KEYS = [
  ['01-全貌_工作燈照案件二', 'pano', 'stop2', 2.2],
  ['02a-案件一演示_方塊滑進來', 'c1_reveal', 'scrAt', 1.1],
  ['02-案件一演示_換成外部登入', 'c1_reveal', 'scrAt', 3.6],
  ['02b-案件一演示_再換一家', 'c1_reveal', 'scrAt', 6.3],
  ['03-案件一_牆上紙條換過', 'c1_reveal', 't1', -0.6],
  ['04-案件二演示_連線池', 'c2_pool', 'scrAt', 11.2],
  ['05-回想_案件二', 'c2_recall', 'countFrom', 2.0],
  ['06a-揭曉_兩個括號靠攏', 'c2_reveal', 'scrAt', 2.5],
  ['06-揭曉_同一個兇手', 'c2_reveal', 'scrAt', 5.2],
  ['07-案件三演示_mutation', 'c3_g2', 'scrAt', 9.8],
  ['08-環_光點跑一圈', 'ring', 'dotFrom', 3.2],
  ['x1-片頭', 'intro', 't0', 3],
  ['x2-案件一_四題表', 'c1_grid2', 't1', -1.2],
  ['x3-案件二_交易拖住清理', 'c2_inc2', 'scrAt', 11.0],
  ['x4-案件二_交易框', 'c2_inc1', 'scrAt', 6.0],
  ['x5-案件三_禍對到測試', 'c3_g2', 'postAt', 4.5],
  ['x6-案件三_對帳', 'c3_g4', 'scrAt', 6.2],
  ['x7-案件三_第四關', 'c3_g4', 'postAt', 4.0],
  ['x8-same-rule-three-places', 'c3_three', 'scrAt', 7.4],
  ['x9-環_知識庫', 'ring', 'kbShot', 3.0],
  ['y1-快問_提示', 'quiz2', 'countFrom', 2.0],
  ['y2-結尾全景', 'end', 't0', 2.6],
];
console.log(KEYS.map(([n, id, an, o]) => f(id, an, o) + ' ' + n).join('\n'));
