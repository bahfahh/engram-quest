// check_reading.mjs <project dir> — reading-time check + onscreen.txt export (film time)
// Rule (host, round 3): a window needs (new characters, no whitespace) ÷ 5 + 1.5 s for every card of 7+ characters.
// In a language written with spaces, one word counts as 1.75 of those characters (about 2.9 words a second; 4 words make a card).
// Each card must stay up long enough to be read on its own; a reveal stays >= 8 s and readable;
// a recall question must be read before the countdown starts. Texture (tex) and repeats (dup) are not counted.
import fs from 'fs';
const P = process.argv[2];
const { TEXT, B, TL, DURATION, unwarp, LANG, UI } = await import(P + '/content.js');
const strip = s => (s || '').replace(/<br>/g, '').replace(/\n/g, ' ');
const SPACED = !/^(zh|ja)/i.test(LANG);
const WORD = /[㐀-鿿぀-ヿ]|(?:(?![㐀-鿿぀-ヿ])[\p{L}\p{N}])+(?:['’.\-](?:(?![㐀-鿿぀-ヿ])[\p{L}\p{N}])+)*/gu;
const wordUnits = s => (s.match(WORD) || []).reduce((n, tk) => n + (/^[㐀-鿿぀-ヿ]$/u.test(tk) ? 1 : 1.75), 0);
const chars = s => SPACED ? wordUnits(strip(String(s || '').replace(/<br>/g, ' '))) : [...strip(s).replace(/\s/g, '')].length;
if (LANG !== 'zh-tw' && LANG !== 'en') console.log(`reading rate for "${LANG}" is not calibrated: counted ${SPACED ? 'per word' : 'per character'}, confirm by reading the stills`);
const units = e => chars(e.text) + chars(e.sub) + (e.src ? chars(UI.srcOpen + e.src + UI.srcClose) : 0);
const need = e => e.tex || e.dup ? 0 : units(e) / 5 + (units(e) >= 7 ? 1.5 : 0);
const fmt = s => { const m = Math.floor(s / 60), x = (s % 60).toFixed(1); return `${m}:${x.padStart(4, '0')}`; };
const len = (a, b) => unwarp(b) - unwarp(a);
const W = [
  [0, 8, '片頭'], [8, 38, '全貌'], [38, 44, '俯衝'],
  [44, B.r1.q, 'R1 情境'], [B.r1.q, B.r1.A, 'R1 問題'], [B.r1.A, B.r1.Bk, 'R1 ① Entity'], [B.r1.Bk, B.r1.C, 'R1 ② Domain Service'], [B.r1.C, B.r1.punch, 'R1 ③ Aggregate'], [B.r1.punch, B.r1.recall.q, 'R1 按規則挑'],
  [B.r1.wrap, B.r1.door, 'R1 收束＋懸案'], [B.r1.door, B.r1.out + 1, 'R1 側門'],
  [B.r2.ctx, B.r2.q, 'R2 情境'], [B.r2.q, B.r2.cas, 'R2 問題'], [B.r2.cas, B.r2.prof, 'R2 案例'], [B.r2.prof, B.r2.bench, 'R2 找'], [B.r2.bench, B.r2.anal, 'R2 驗'], [B.r2.anal, B.r2.recall.q, 'R2 擋'], [B.r2.wrap, B.r2.out, 'R2 收束'],
  [B.r3.ctx, B.r3.q, 'R3 情境'], [B.r3.q, B.r3.mach, 'R3 問題'], [B.r3.mach, B.r3.outp, 'R3 同一台機器'], [B.r3.outp, B.r3.grid, 'R3 輸出'], [B.r3.grid, B.r3.llm, 'R3 兩軸'], [B.r3.llm, B.r3.gates, 'R3 LLM'], [B.r3.gates, B.r3.recall.q, 'R3 四道閘'],
  [B.r3.cheap, B.r3.fix, 'R3 便宜先擋'], [B.r3.fix, B.r3.wrap, 'R3 更正'], [B.r3.wrap, TL.r3[1], 'R3 收束'],
  [TL.shuffle[0], TL.shuffle[1], '快問：重排'], [TL.end[0], 541, '結尾'],
];
const rows = []; let bad = 0;
const row = (ok, at, name, have, req) => { if (!ok) bad++; rows.push(`${ok ? 'ok ' : 'XX '} ${(fmt(at) + ' ' + name).padEnd(24, ' ')} ${have.toFixed(1).padStart(5)} s  需 ${req.toFixed(1).padStart(5)} s`); };
for (const [a, b, name] of W) { const es = TEXT.filter(e => e.t0 >= a && e.t0 < b && !/recall|quiz\.[qa]/.test(e.id)); const req = es.reduce((s, e) => s + need(e), 0); row(len(a, b) + 0.01 >= req, unwarp(a), name, len(a, b), req); }
// recalls and quick questions: read the question before the countdown; countdown >= 6 s; reveal >= 8 s and readable
const RC = [['r1', B.r1.recall, 'r1.recall'], ['r2', B.r2.recall, 'r2.recall'], ['r3', B.r3.recall, 'r3.recall'], ['q1', B.quiz.q1, 'quiz', 'q1'], ['q2', B.quiz.q2, 'quiz', 'q2']];
for (const [k, r, pre, n] of RC) {
  const q = TEXT.find(e => e.id === (n ? `quiz.${n}` : `${pre}.q`)), a = TEXT.find(e => e.id === (n ? `quiz.a${n.slice(1)}` : `${pre}.a`));
  row(len(r.q, r.c0) + 0.01 >= need(q), unwarp(r.q), k + ' 讀題（倒數前）', len(r.q, r.c0), need(q));
  row(len(r.c0, r.c1) + 0.01 >= 6, unwarp(r.c0), k + ' 安靜倒數', len(r.c0, r.c1), 6);
  row(len(r.c1, r.end) + 0.01 >= Math.max(8, need(a)), unwarp(r.c1), k + ' 揭曉', len(r.c1, r.end), Math.max(8, need(a)));
}
// every readable card must stay up long enough on its own
for (const e of TEXT) { if (e.tex || e.dup || /recall|quiz\.[qa]/.test(e.id)) continue; const have = len(e.t0, e.t1); if (have + 0.01 < need(e)) row(false, unwarp(e.t0), '單張 ' + e.id, have, need(e)); }
const readable = TEXT.filter(e => !e.tex && !e.dup); const total = readable.reduce((s, e) => s + units(e), 0);
console.log(rows.join('\n'));
console.log(`\n要讀的字：${total} 字、${readable.length} 張（${readable.filter(e => units(e) >= 7).length} 張 7 字以上）；全部讀完約 ${Math.round(readable.reduce((s, e) => s + need(e), 0))} 秒；片長 ${fmt(DURATION)}`);
console.log(bad ? `${bad} 項讀不完` : '全部讀得完');
// onscreen.txt
let out = '# 回到那個房間・九月：片上的字（照出現順序，成片時間）\n# 格式：出現–消失｜位置｜用途｜字（字數）\n# 第一部分是要讀的字；第二部分是紋理（畫面上看得到、但不需要讀：介面字、軸上的刻度、其他 17 個主題名、重點行以外的程式碼）。\n\n## 一、要讀的字\n\n';
for (const e of [...TEXT].sort((a, b) => a.t0 - b.t0)) {
  if (e.tex || e.dup) continue;
  const where = e.kind === 'dom' ? '畫面上' : e.where; let t = strip(e.text); if (e.sub) t += `（${strip(e.sub)}）`; if (e.src) t += `${UI.srcOpen}${e.src}${UI.srcClose}`;
  out += `${fmt(unwarp(e.t0))}–${fmt(unwarp(e.t1))}｜${where}｜${e.use}｜${t}（${units(e)} 字）\n`;
  if (e.exits) out += `　　　　　　　　｜白板上的箭頭｜（不另計字）｜${e.exits}\n`;
}
out += `\n合計：${total} 字、${readable.length} 張。片長 ${fmt(DURATION)}。\n\n## 二、紋理（不需要讀）\n\n`;
for (const e of [...TEXT].sort((a, b) => a.t0 - b.t0)) { if (!(e.tex || e.dup)) continue; let t = strip(e.text); if (e.sub) t += `（${strip(e.sub)}）`; out += `${fmt(unwarp(e.t0))}–${fmt(unwarp(e.t1))}｜${e.kind === 'dom' ? '畫面上' : e.where}｜${t}\n`; }
fs.writeFileSync(P + '/onscreen.txt', out);
