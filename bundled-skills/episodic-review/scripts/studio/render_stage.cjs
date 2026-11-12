#!/usr/bin/env node
// render_stage.cjs — frame renderer with a content-addressed frame cache.
//
//   node render_stage.cjs <projectDir> --data                      film-data.json + music-cues.json; prints length per part, reading shortfalls, layout problems
//   node render_stage.cjs <projectDir> --stills auto [--notext]    one still at each fullest moment (or --stills 1.5,12); --notext hides the words
//   add --film gallery to any of them to load film.gallery.js instead of film.js (its data goes to film-data.gallery.json)
//   node render_stage.cjs <projectDir> [--scene scene.html] [--fps 24] [--workers 3] [--from s] [--to s]
//                         [--out final.mp4] [--audio narration.wav] [--nocache] [--noaudio] [--poster 8] [--music-style map]
//
// The scene (templates/film/scene.html) exposes window.studioReady, window.renderAt(t), window.DURATION. One rule:
// everything a frame shows must be in the DOM after renderAt(t) (inline styles, attributes, text). No <canvas> drawing,
// no CSS animation. Then the page's HTML *is* the frame's identity:
//   key = sha1(salt + documentElement.outerHTML)   -> <project>/.frames/<key>.jpg
// A frame whose key already exists is not captured again:
//   - inside one render: every frame of a still hold is captured once;
//   - across renders: after an edit, only the frames whose picture changed are captured.
// salt = contents of the stylesheets and plate manifests the scene uses (things that change pixels without changing the HTML).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const STUDIO = __dirname;
const args = process.argv.slice(2);
const project = path.resolve(args[0] || '');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SCENE = String(opt('scene', 'scene.html'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const p = path.join(STUDIO, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(STUDIO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(rsp);
  }).listen(0, () => res(srv));
});
const walk = (d, out = []) => { for (const f of fs.readdirSync(d)) { if (f.startsWith('.') || f === 'node_modules' || f === 'stills') continue; const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

(async () => {
  const fps = Number(opt('fps', 24)), workers = Number(opt('workers', 3));
  const cacheDir = path.join(project, '.frames'); fs.mkdirSync(cacheDir, { recursive: true });
  const h = crypto.createHash('sha1');
  for (const d of [project, path.join(path.dirname(project), 'kit')]) if (fs.existsSync(d))
    for (const f of walk(d).sort()) if (/\.(css|json)$/.test(f)) h.update(fs.readFileSync(f)); else if (/\.(jpg|png|webp|svg)$/.test(f)) h.update(f + fs.statSync(f).size);
  const salt = h.digest('hex');
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/${path.relative(STUDIO, project).split(path.sep).join('/')}/${SCENE}` + '?' + [opt('notext') ? 'notext=1' : '', opt('film') ? 'film=' + encodeURIComponent(String(opt('film'))) : ''].filter(Boolean).join('&');
  const browser = await chromium.launch({ args: ['--disable-gpu', '--run-all-compositor-stages-before-draw'] });
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/\/film\.js$/.test(r.url().split('?')[0])) errors.push(`${r.status()} ${r.url()}`); });   // film.js may be absent: the scene falls back to the example
    await page.goto(url);
    await page.waitForFunction(() => window.studioReady !== undefined, null, { timeout: 60000 });
    await page.evaluate(() => window.studioReady);
    const cdp = await page.context().newCDPSession(page);
    return { page, errors, shot: async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 })).data, 'base64') };
  };
  const keyOf = (page, t) => page.evaluate(async ([t, salt]) => {
    window.renderAt(t);
    const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(salt + document.documentElement.outerHTML));
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  }, [t, salt]);

  const first = await open();
  const duration = await first.page.evaluate(() => window.DURATION);
  // what the scene says about itself (chapters, music cues, on-screen text): written beside the film for the other tools
  const data = await first.page.evaluate(() => ({ duration: window.DURATION, parts: window.PARTS || [], chapters: window.CHAPTERS || [], cues: window.CUES || [], marks: window.MARKS || [], peaks: window.PEAKS || [], onscreen: window.ONSCREEN || [], reading: window.READING || [] }));
  // layout check: text that leaves the frame or its card, and two texts whose boxes overlap (measured after fonts have loaded)
  data.layout = await first.page.evaluate((peaks) => {
    const V = document.getElementById('v'), out = [], seen = new Set();
    const shown = (e) => { let o = 1; for (let p = e; p && p !== document.body; p = p.parentElement) { if (p.style.opacity !== '') o *= parseFloat(p.style.opacity); } return o; };
    for (const t of peaks) { window.renderAt(t); const items = [];
      for (const e of V.querySelectorAll('*')) { if (e.closest('svg')) continue; const tn = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()); if (!tn.length || shown(e) < 0.15) continue;
        if (getComputedStyle(e).color === 'rgba(0, 0, 0, 0)') continue;
        let l = 1e9, r = -1e9, tp = 1e9, b = -1e9; for (const n of tn) { const g = document.createRange(); g.selectNodeContents(n); for (const q of g.getClientRects()) { l = Math.min(l, q.left); r = Math.max(r, q.right); tp = Math.min(tp, q.top); b = Math.max(b, q.bottom); } }
        const pad = (b - tp) > 0 ? Math.min(14, (b - tp) * 0.16) : 0;        // a line box is taller than its glyphs: compare the inked part
        if (r > l) items.push({ e, l, r, t: tp + pad, b: b - pad, s: tn.map(n => n.textContent.trim()).join(' ').slice(0, 16) }); }
      const add = (kind, a, b2) => { const k = kind + a.s + (b2 ? b2.s : ''); if (!seen.has(k)) { seen.add(k); out.push({ t, kind, text: a.s, other: b2 ? b2.s : undefined }); } };
      // outside: closer than 6 px to the edge of the frame counts as cut off
      for (const a of items) if (a.l < 6 || a.r > 1914 || a.t < 6 || a.b > 1074) add('outside', a);
      // overflow: text that runs past the card or sheet it is drawn on
      for (const a of items) { const box = a.e.closest('.card, .paper'); if (!box || box === a.e) continue; const q = box.getBoundingClientRect();
        if (a.l < q.left - 2 || a.r > q.right + 2 || a.t < q.top - 2 || a.b > q.bottom + 2) add('overflow', a); }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i], c = items[j]; if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        if (Math.min(a.r, c.r) - Math.max(a.l, c.l) > 8 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 8) add('overlap', a, c); } }
    window.renderAt(0); return out; },
    // the fullest moments, plus the middle of every text's time on screen (a caption that comes and goes alone is not a peak)
    [...new Set([...data.peaks, ...data.onscreen.map(o => Math.round((o.t0 + o.t1) / 2))])].sort((a, b) => a - b));
  // --film <name> is a look at another film in the same project (the gallery): its data must not replace the main film's
  const sfx = opt('film') ? '.' + opt('film') : '';
  fs.writeFileSync(path.join(project, `film-data${sfx}.json`), JSON.stringify(data, null, 1));
  // the cue sheet for scripts/music/pick_music.py, rewritten every time so it never lags behind a retimed film
  fs.writeFileSync(path.join(project, `music-cues${sfx}.json`), JSON.stringify({ film: path.basename(project), style: String(opt('music-style', 'map')), duration: data.duration,
    cues: data.cues.map(c => ({ segment: c.kind, start: +c.t0.toFixed(1), dur: +(c.t1 - c.t0).toFixed(1) })), marks: data.marks }, null, 1));
  if (first.errors.length) console.error('page errors:\n' + [...new Set(first.errors)].slice(0, 8).join('\n'));
  if (opt('data')) {
    console.log(`ok: film-data${sfx}.json, music-cues${sfx}.json  ${data.duration}s (${(data.duration / 60).toFixed(1)} min), ${data.chapters.length} chapters with a topic id`);
    data.parts.forEach(p => console.log(`  ${String(p.seconds).padStart(6)}s  ${p.name}`));
    console.log(`${data.reading.length} texts on screen for less than their reading time`); data.reading.slice(0, 30).forEach(r => console.log(`  ${r.t}s  on screen ${r.have}s, needs ${r.need}s  ${r.s}`));
    console.log(`${data.layout.length} layout problems (text outside the frame, overflowing its card, or two texts overlapping)`); data.layout.slice(0, 30).forEach(r => console.log(`  ${r.t}s  ${r.kind}  ${r.text}${r.other ? '  <->  ' + r.other : ''}`));
    await browser.close(); srv.close(); return; }
  const stills = opt('stills') && (opt('stills') === true || opt('stills') === 'auto' ? data.peaks : String(opt('stills')).split(',').map(Number));
  if (stills) {
    const dir = path.join(project, 'stills' + (opt('film') ? '-' + opt('film') : '') + (opt('notext') ? '-notext' : '')); fs.mkdirSync(dir, { recursive: true });
    for (const t of stills) { await first.page.evaluate(t => { window.renderAt(t); }, t); fs.writeFileSync(path.join(dir, `t-${Number(t).toFixed(1).padStart(6, '0')}.jpg`), await first.shot()); }
    console.log(`ok: ${stills.length} stills in ${path.basename(dir)}/  (${stills.join(', ')})`); await browser.close(); srv.close(); return;
  }
  const from = Number(opt('from', 0)), to = Math.min(Number(opt('to', duration)), duration);
  const n = Math.round((to - from) * fps);
  const keys = new Array(n);
  const stat = { captured: 0, held: 0, cached: 0 };
  const pre = new Set(opt('nocache') ? [] : fs.readdirSync(cacheDir).map(f => f.slice(0, -4)));
  const seen = new Set();
  const t0 = Date.now();
  const pages = [first]; for (let i = 1; i < workers; i++) pages.push(await open());
  await Promise.all(pages.map(async (P, w) => {
    const a = Math.floor(n * w / workers), b = Math.floor(n * (w + 1) / workers);
    for (let i = a; i < b; i++) {
      const k = await keyOf(P.page, from + i / fps);
      keys[i] = k;
      if (seen.has(k)) { stat.held++; continue; }
      seen.add(k);
      if (pre.has(k)) { stat.cached++; continue; }
      const tmp = path.join(cacheDir, k + '.tmp' + w);
      fs.writeFileSync(tmp, await P.shot()); fs.renameSync(tmp, path.join(cacheDir, k + '.jpg'));
      stat.captured++;
      if (w === 0 && stat.captured % 200 === 0) console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s  worker0 frame ${i - a}/${b - a}`);
    }
  }));
  const tCap = (Date.now() - t0) / 1000;
  const errs = pages.flatMap(p => p.errors);
  if (errs.length) console.error('page errors:\n' + [...new Set(errs)].slice(0, 8).join('\n'));
  // encode: pipe the frames in order (a held frame is simply sent again)
  const out = path.join(project, String(opt('out', 'final.mp4')));
  const audio = opt('audio') ? path.resolve(String(opt('audio'))) : path.join(project, 'narration.wav');
  const ff = ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  const withAudio = fs.existsSync(audio) && !opt('noaudio');
  if (withAudio) ff.push('-ss', String(from), '-t', String(to - from), '-i', audio);
  ff.push('-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (withAudio) ff.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  ff.push(out);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, buf = null;
  for (let i = 0; i < n; i++) {
    if (keys[i] !== last) { buf = fs.readFileSync(path.join(cacheDir, keys[i] + '.jpg')); last = keys[i]; }
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
  }
  enc.stdin.end(); await new Promise(r => enc.on('close', r));
  if (opt('poster') !== undefined) { await first.page.evaluate(t => { window.renderAt(t); }, Number(opt('poster'))); fs.writeFileSync(path.join(project, 'poster.jpg'), await first.shot()); }
  const tAll = (Date.now() - t0) / 1000;
  const report = { frames: n, ...stat, unique: seen.size, captureSeconds: +tCap.toFixed(1), totalSeconds: +tAll.toFixed(1), workers, fps, out };
  fs.writeFileSync(path.join(project, 'render-report.json'), JSON.stringify(report, null, 1));
  console.log('ok:', JSON.stringify(report));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
