// node tools/report.mjs [--onscreen] [--md]
import * as D from '../content.js';
import { writeFileSync } from 'fs';
const ts = t => { const m = Math.floor(t / 60), s = (t - m * 60).toFixed(1); return `${m}:${s.padStart(4, '0')}`; };
const fmt = s => String(s).replace(/\n/g, ' ');
if (process.argv.includes('--onscreen')) {
  const out = ['# 片上全部的字（照出現順序，附秒數）', '# 由 content.js 產生：node tools/report.mjs --onscreen', `# 片長 ${D.DURATION} 秒`, ''];
  let seg = '';
  const SEG = { intro: '片頭', pano: '全貌', c1: '案件一 登入', c2: '案件二 SQL Server 與 PostgreSQL', c3: '案件三 AI coding 品質防線', ring: '環', quiz: '片尾快問（拿掉牆）', end: '結尾' };
  for (const b of D.BEAT_LIST) {
    if (b.seg !== seg) { seg = b.seg; const S = D.T.segs[seg]; out.push(''); out.push(`【${SEG[seg]}　${S.t0.toFixed(1)}–${S.t1.toFixed(1)} 秒】`); }
    const head = `[${b.t0.toFixed(1)}–${b.t1.toFixed(1)}] ${b.id}`;
    if (b.kind === 'recall') { const K = D.byId(b.card); out.push(`${head}　回想（百葉窗闔上，只剩照著問題卡的燈）：${fmt(K.q)}　（倒數 6 秒，從 +${b.countFrom.toFixed(1)} 秒起）`); continue; }
    if (b.kind === 'reveal') { const K = D.byId(b.card); out.push(`${head}　揭曉：${fmt(K.a)}　${K.src}`); }
    if (b.kind === 'quiz') { out.push(`${head}　問：${fmt(b.q)}　（題目讀完才倒數 6 秒，從 +${b.countFrom.toFixed(1)} 秒起）`); if (b.hintCap) out.push(`${' '.repeat(head.length)}　提示縮圖下的字：${b.hintCap}`); out.push(`${' '.repeat(head.length)}　答（+${b.ansAt.toFixed(1)} 秒）：${fmt(b.a)}`); continue; }
    if (b.say) b.say.forEach(s => out.push(`${head}　${s}`));
    for (const id of b.cards || []) {
      const c = D.byId(id); if (!c) continue;
      const where = c.zone ? '牆' : '牆（上排）';
      if (c.kind === 'grid') { out.push(`${head}　${where}・四題表：${c.head}｜${c.rows.map(r => r.filter(Boolean).join('：')).join('｜')}`); out.push(`${head}　　第一欄 ${fmt(c.colA.head)}：${c.colA.cells.map(fmt).join('｜')}`); continue; }
      if (c.kind === 'file') { out.push(`${head}　${where}・${c.stamp ? '事故檔案〔' + c.stamp + '〕' : '案件夾：'}${fmt(c.title)}${c.sub ? '｜' + c.sub : ''}｜${c.lines.join('｜')}`); continue; }
      if (c.kind === 'copy') { out.push(`${head}　${where}・影本：${fmt(c.title)}${c.code ? '｜' + c.code.join(' ⏎ ') : ''}${c.rowsTxt ? '｜' + c.rowsTxt.map(r => r.join('：')).join('｜') : ''}${c.layers ? '｜' + c.layers.map(l => l[0] + '：' + l[1] + '（' + l[2] + '）').join('｜') : ''}`); continue; }
      if (c.kind === 'photo') { out.push(`${head}　${where}・照片（${c.src.replace('assets/', '')}）：${c.caption}`); continue; }
      if (c.kind === 'gate') { out.push(`${head}　${where}・關卡卡：${c.n} ${c.text}｜${c.sub}`); continue; }
      const kindName = { tline: '時間線便條', strip: '紙條（蓋住前三列）', case: '案件卡', ctx: '情境便條', note: '便條', def: '名詞卡', rule: '判斷規則', open: '懸案', quote: '筆記原話', tag: '小標', clue: '線索卡', title: '牆的標題' }[c.kind] || c.kind;
      out.push(`${head}　${where}・${kindName}：${c.label ? c.label + '｜' : ''}${fmt(c.text)}${c.sub ? '｜' + c.sub : ''}`);
    }
    if (b.gridCol === 'B') { const g = D.byId('c1.grid'); out.push(`${head}　牆・四題表第二欄 ${fmt(g.colB.head)}：${g.colB.cells.map(fmt).join('｜')}`); }
    if (b.sayCards) out.push(`${head}　（天花板的工作燈依序照到三張案件卡：${b.sayCards.map(id => fmt(D.byId(id).text)).join('｜')}）`);
    if (b.scr) { const S = D.SCREEN_TXT[b.scr]; const keys = b.scrTxt || []; out.push(`${head}　螢幕〔${b.scr}〕：${keys.map(k => [].concat(S[k]).map(fmt).join('／')).join('｜') || '（只有圖，沒有新字）'}`); }
    if (b.link) { const L = D.LINKS.find(l => l.id === b.link); out.push(`${head}　紅線紙條：${L.dir}｜${fmt(L.text)}`); }
  }
  out.push(''); out.push('【牆上一開始就有的字（全貌時可暫停讀）】');
  for (const c of D.CARDS.filter(c => !c.at)) out.push(`  ${c.label ? c.label + '｜' : ''}${fmt(c.text)}${c.sub ? '｜' + c.sub : ''}`);
  writeFileSync(new URL('../onscreen.txt', import.meta.url), out.join('\n') + '\n');
  console.log('wrote onscreen.txt');
}
const rows = ['| 起 | 段 | 拍 | 字數 | 需要 | 給的 |', '|---|---|---|---|---|---|'];
for (const b of D.BEAT_LIST) rows.push(`| ${ts(b.t0)} | ${b.seg} | ${b.id} | ${b.texts.reduce((a, s) => a + D.units(s), 0).toFixed(1)} | ${b.need.toFixed(1)} | ${b.dur.toFixed(1)} |`);
if (process.argv.includes('--md')) console.log(rows.join('\n'));
const segs = Object.entries(D.T.segs).map(([k, v]) => `${k} ${(v.t1 - v.t0).toFixed(1)}`).join('｜');
console.log(`DURATION ${D.DURATION} s (${ts(D.DURATION)})｜${segs}`);
