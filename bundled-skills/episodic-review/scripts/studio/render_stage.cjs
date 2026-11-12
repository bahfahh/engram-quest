#!/usr/bin/env node
// render_stage.cjs — frame renderer with a content-addressed frame cache (實驗 24).
//
//   node render_stage.cjs <projectDir> [--scene scene.html] [--fps 24] [--workers 3] [--from s] [--to s]
//                         [--out final.mp4] [--audio narration.wav] [--stills 1.5,12] [--nocache] [--poster 8]
//
// Same scene contract as render.cjs (window.studioReady, window.renderAt(t), window.DURATION), plus one rule:
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
  const url = `http://127.0.0.1:${srv.address().port}/${path.relative(STUDIO, project).split(path.sep).join('/')}/${SCENE}`;
  const browser = await chromium.launch({ args: ['--disable-gpu', '--run-all-compositor-stages-before-draw'] });
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
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
  fs.writeFileSync(path.join(project, 'film-data.json'), JSON.stringify(await first.page.evaluate(() => ({ duration: window.DURATION, chapters: window.CHAPTERS || [], cues: window.CUES || [], onscreen: window.ONSCREEN || [], reading: window.READING || [] })), null, 1));
  if (opt('data')) { const d = JSON.parse(fs.readFileSync(path.join(project, 'film-data.json'), 'utf8')); console.log(`ok: film-data.json  ${d.duration}s, ${d.chapters.length} chapters, ${d.reading.length} texts shorter than their reading time`); d.reading.slice(0, 20).forEach(r => console.log(`  ${r.t}s  on screen ${r.have}s, needs ${r.need}s  ${r.s}`)); await browser.close(); srv.close(); return; }
  const stills = opt('stills') && String(opt('stills')).split(',').map(Number);
  if (stills) {
    fs.mkdirSync(path.join(project, 'stills'), { recursive: true });
    for (const t of stills) { await first.page.evaluate(t => { window.renderAt(t); }, t); fs.writeFileSync(path.join(project, 'stills', `t-${t}.jpg`), await first.shot()); }
    if (first.errors.length) console.error('page errors:\n' + [...new Set(first.errors)].slice(0, 8).join('\n'));
    console.log(`ok: ${stills.length} stills`); await browser.close(); srv.close(); return;
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
