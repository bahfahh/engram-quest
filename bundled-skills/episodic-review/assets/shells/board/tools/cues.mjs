// node tools/cues.mjs  → audio/cues_in.json (cue sheet for pick_music.py, from the beat timeline) + audio/events.json (SFX times)
import * as D from '../content.js';
import { writeFileSync } from 'fs';
const B = D.T.beats, r1 = x => Math.round(x * 100) / 100;
const cues = [];
const cue = (segment, start, end, room) => cues.push({ segment, start: r1(start), dur: r1(end - start), ...(room ? { room } : {}) });
cue('opening', 0, B.pano.t0);
cue('overview', B.pano.t0, B.pano.t1);
for (const n of [1, 2, 3]) {
  const i = B[`c${n}_in`], rc = B[`c${n}_recall`], rv = B[`c${n}_reveal`], ex = B[`c${n}_exit`];
  cue('topic', i.t0, rc.t0, n);
  cue('recall', rc.t0, rc.t1, n);
  cue('reveal', rv.t0, rv.t0 + 5, n);
  cue('closure', rv.t0 + 3, ex.t1, n);
}
cue('overview', B.ring.t0, B.ring.t1);
// quiz: the countdown pad runs a little past the answer (its fade covers the chime's start: no gap), then a short
// resolution from I under the answer of the first quiz; the second answer goes straight into the ending
{ const b = B.quiz2; cue('quiz', b.t0, b.t0 + b.ansAt + 1.2); cue('reveal', b.t0 + b.ansAt, b.t0 + b.ansAt + 5); cue('closure', b.t0 + b.ansAt + 3.0, b.t1 + 0.5); }
{ const b = B.quiz3; cue('quiz', b.t0 + 0.5, b.t0 + b.ansAt + 1.2); cue('reveal', b.t0 + b.ansAt, b.t0 + b.ansAt + 5); }
cue('ending', B.quiz3.t0 + B.quiz3.ansAt + 3.5, D.DURATION);
writeFileSync(new URL('../audio/cues_in.json', import.meta.url), JSON.stringify({ film: 'ep-aug', style: 'board', duration: D.DURATION, cues }, null, 1));
// clean pitched SFX at the moments something happens (not on every card)
const ev = [];
const e = (t, kind, note) => ev.push({ t: r1(t), kind, note });
const s = id => B[id].t0 + B[id].scrAt;
e(s('c1_reveal') + 0.5, 'pluck', 'Entra 蓋上 ①②③');
e(s('c1_reveal') + 2.5, 'bell', '④ 亮起：一個字都不用改');
e(s('c1_reveal') + 5.1, 'pluck', '換成 Supabase Auth');
e(s('c2_reveal') + 3.4, 'bell', '兩條鏈收進同一個交易框');
e(s('c3_g2') + 5.8, 'low', 'SURVIVED');
e(s('c3_g4') + 3.5, 'ding', '對帳對不上：警報');
const rg = B.ring, run = rg.dotTo - rg.dotFrom; for (let k = 0; k < 4; k++) e(rg.t0 + rg.dotFrom + run * (0.12 + k * 0.22), 'glock' + k, '光點經過第 ' + (k + 1) + ' 段');
e(rg.t0 + rg.dotTo, 'shimmer', '圈亮起');
writeFileSync(new URL('../audio/events.json', import.meta.url), JSON.stringify(ev, null, 1));
console.log(cues.length + ' cues, ' + ev.length + ' sfx, duration ' + D.DURATION);
