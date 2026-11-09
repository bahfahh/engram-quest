// node tools/clarity.cjs [--step 0.25] [--from a --to b]
// 「讀得到」檢查：字不只在畫面上，還要在畫面內、在焦點內（模糊小）、夠大、已經淡入。
// 每 step 秒呼叫一次 renderAt(t)，量每個帶 data-tid 的字：螢幕上的字高（px）、螢幕上的模糊（px）、透明度、是否整個在畫面內。
// 每段字取「連續讀得到」的最長時間，和需要的時間比（字數 ÷ 5 ＋ 1.5；回想題＝讀題＋6；揭曉 ≥ 8）。結果寫 tools/clarity.txt。
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const PROJ = path.resolve(__dirname, '..'), STUDIO = path.resolve(PROJ, '../..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : Number(args[i + 1]); };
const STEP = opt('step', 0.25), MIN_PX = 18;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(STUDIO, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(STUDIO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => console.log('ERR', String(e)));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/${path.relative(STUDIO, PROJ).split(path.sep).join('/')}/scene.html`);
  await pg.waitForFunction(() => window.studioReady !== undefined); await pg.evaluate(() => window.studioReady);
  const { TXT, DUR } = await pg.evaluate(async () => { const m = await import('./content.js'); return { TXT: m.TXT.map(o => ({ id: o.id, t0: o.t0, t1: o.t1, use: o.use, text: m.plain(o.text) })), DUR: m.DURATION }; });
  const from = opt('from', 0), to = opt('to', DUR);
  const samples = {}; // id -> [[t, clear, why]]
  for (let t = from; t <= to + 1e-9; t += STEP) {
    const res = await pg.evaluate((t) => {
      window.renderAt(t);
      const out = [];
      const blurOf = el => { const m = /blur\(([\d.]+)px\)/.exec(el.style.filter || ''); return m ? +m[1] : 0; };
      const scaleOf = el => { const r = el.getBoundingClientRect(); const a = el.offsetWidth * el.offsetHeight; return a > 0 ? Math.sqrt((r.width * r.height) / a) : 1; };
      for (const e of document.querySelectorAll('[data-tid]')) {
        let op = 1, blur = 0, vis = true;
        for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none') { vis = false; break; } op *= +cs.opacity; const bl = blurOf(a); if (bl) blur += bl * scaleOf(a); }
        if (!vis || getComputedStyle(e).visibility !== 'visible' || op < 0.05) continue;
        const r = e.getBoundingClientRect(); if (r.width < 1) continue;
        const sc = scaleOf(e);
        let fs = 1e9; const walk = n => { for (const c of n.childNodes) { if (c.nodeType === 3 && c.textContent.trim()) fs = Math.min(fs, parseFloat(getComputedStyle(n).fontSize)); else if (c.nodeType === 1) walk(c); } }; walk(e); if (fs === 1e9) continue;
        const px = fs * sc, inFrame = r.left >= -4 && r.top >= -4 && r.right <= 1924 && r.bottom <= 1084;
        const clear = inFrame && op >= 0.85 && px >= 18 && blur <= Math.max(1.0, 0.06 * px);
        out.push([e.dataset.tid, clear ? 1 : 0, `${inFrame ? '' : '畫面外 '}${op < 0.85 ? '淡' + op.toFixed(2) + ' ' : ''}${px < 18 ? '太小' + px.toFixed(0) + 'px ' : ''}${blur > Math.max(1.0, 0.06 * px) ? '糊' + blur.toFixed(1) + 'px' : ''}`.trim()]);
      }
      return out;
    }, t);
    const per = {}; for (const [id, c, why] of res) { if (!per[id]) per[id] = [1, '']; if (!c) { per[id][0] = 0; per[id][1] = per[id][1] || why; } }
    for (const [id, [c, why]] of Object.entries(per)) (samples[id] = samples[id] || []).push([+t.toFixed(3), c, why]);
    if (Math.round(t / STEP) % 200 === 0) process.stdout.write(`t=${t.toFixed(1)} `);
  }
  const TR = args.indexOf('--trace'); if (TR >= 0) console.log('\n' + (samples[args[TR + 1]] || []).map(([t, c, w]) => `${t}:${c ? 'ok' : w || 'x'}`).join(' '));
  const count = s => (s.match(/[㐀-鿿]/g) || []).length + (s.match(/[A-Za-z0-9.]+/g) || []).length;
  const fmt = x => { const m = Math.floor(x / 60), s = (x - m * 60).toFixed(1).padStart(4, '0'); return `${m}:${s}`; };
  const lines = [], bad = [];
  for (const o of TXT.slice().sort((a, b) => a.t0 - b.t0)) {
    if (o.t1 < from || o.t0 > to) continue;
    const S = (samples[o.id] || []).filter(([t]) => t >= o.t0 && t <= o.t1);
    let best = 0, cur = 0, bestA = null, a = null; for (const [t, c] of S) { if (c) { if (!cur) a = t; cur += STEP; if (cur > best) { best = cur; bestA = a; } } else cur = 0; }
    const n = count(o.text); let need = n / 5 + (n > 4 ? 1.5 : 0);
    if (/_rec$|^qz\dq$/.test(o.id)) need = n / 5 + 6; if (/_ans$|^qz\da$/.test(o.id)) need = Math.max(need, 8);
    const why = [...new Set(S.filter(([, c]) => !c).map(([, , w]) => w).filter(Boolean))].slice(0, 2).join('、');
    const ok = !S.length || best + 1e-6 >= need - STEP; // one sample of slack; not measured = flat HUD text (card, ticker, title), always sharp
    const line = `${ok ? '  ' : '⚠ '}${fmt(o.t0)}–${fmt(o.t1)} ${o.id}：讀得到 ${best.toFixed(2)} 秒（從 ${bestA != null ? fmt(bestA) : '—'}），需要 ${need.toFixed(1)}${S.length ? '' : '（浮在畫面上的字，不量）'}${why ? '｜不清楚時：' + why : ''}｜${o.text.slice(0, 24)}`;
    lines.push(line); if (!ok) bad.push(line);
  }
  const head = `讀得到檢查（每 ${STEP} 秒一格；清楚＝整個在畫面內、透明度 ≥ 0.85、字高 ≥ ${MIN_PX}px、模糊 ≤ max(1px, 字高 6%)）\n${bad.length ? bad.length + ' 段不夠：\n' + bad.join('\n') : '全部通過'}\n\n`;
  fs.writeFileSync(path.join(__dirname, 'clarity.txt'), head + lines.join('\n') + '\n');
  console.log('\n' + head);
  await b.close(); srv.close();
});
