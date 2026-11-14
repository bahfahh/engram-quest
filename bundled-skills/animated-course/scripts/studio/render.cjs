#!/usr/bin/env node
// Frame-by-frame renderer: opens projects/<name>/scene.html in headless Chromium, calls
// window.renderAt(t) for every frame, screenshots it and pipes the frames into ffmpeg.
//
//   node render.cjs <projectDir> --stills 1.5,12,40        -> <project>/stills/t-1.5.jpg ...
//   node render.cjs <projectDir> --preview                 -> <project>/preview.mp4 (960x540, 12 fps, with audio)
//   node render.cjs <projectDir>                           -> <project>/final.mp4 (1920x1080, 30 fps) + poster.jpg
//   options: --from 10 --to 25 (render a range), --poster 8.0 (poster time), --fps 30
//            --scene classroom.html (another page in the project, default scene.html; may carry a ?query), --noaudio (video only)
//   Multi-page films (3D classroom + DOM scene): see compose.py, which renders each range with its page and joins them.
//
// Scene contract (scene.html):
//   window.studioReady : Promise that resolves after fonts/timeline/assets are loaded
//   window.renderAt(t) : draw the frame for time t (seconds). Must be deterministic (no Date.now,
//                        no unseeded Math.random, no requestAnimationFrame-driven state).
//   window.DURATION    : total length in seconds (usually timeline.duration)
//   Capture: by default the WHOLE PAGE is captured (HTML/CSS/SVG + any <canvas>, ~70ms/frame via CDP).
//   window.captureCanvas = true : (optional, faster) capture only window.frameCanvas or the first <canvas>
//                        (WebGL canvases need preserveDrawingBuffer: true). --dom / --canvas force a mode.
//   renderAt's return value is ignored (never return a big object from it).
//   Subtitles are NOT burned in: the plugin shows subtitles.vtt itself.
// Full renders are limited to 2 at a time across all projects (the machine has 4 cores) and queue in arrival order.
// A partial render (--from/--to) only writes poster.jpg when --poster is given.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const STUDIO = __dirname;
const args = process.argv.slice(2);
const project = path.resolve(args[0] || '');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SCENE = String(opt('scene', 'scene.html'));
if (!fs.existsSync(path.join(project, SCENE.split('?')[0]))) { console.error('no ' + SCENE + ' in ' + project); process.exit(1); }
if (!project.startsWith(path.join(STUDIO, 'projects'))) { console.error('project must live under ' + path.join(STUDIO, 'projects')); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };
// /engram-quest/… is the user's custom area, served read-only from the vault (lib/served-path.cjs).
const { servedPath } = require('./lib/served-path.cjs');
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const { root, p } = servedPath(STUDIO, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function slot(name = '.render-slots', n = 2) {  // cross-process semaphore, first come first served
  const dir = path.join(STUDIO, name);
  const queue = path.join(dir, 'queue');
  fs.mkdirSync(queue, { recursive: true });
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  // Ticket = <arrival ms>-<pid>-<slots this job may use>. First come first served on the slots several waiters share;
  // a job with a higher RENDER_SLOTS may take slot k ahead of earlier waiters that cannot use slot k at all
  // (before this, a waiting 2-slot job at the head blocked every RENDER_SLOTS=6 job behind it while slots c–h were free).
  const ticket = path.join(queue, `${Date.now()}-${process.pid}-${n}`);
  fs.writeFileSync(ticket, '');
  const leave = () => fs.rmSync(ticket, { force: true });
  process.on('exit', leave);
  for (;;) {
    const waiting = fs.readdirSync(queue).filter((f) => alive(+f.split('-')[1]) || (fs.rmSync(path.join(queue, f), { force: true }), false)).sort();
    const me = waiting.indexOf(path.basename(ticket));
    const ahead = waiting.slice(0, Math.max(0, me)).map((f) => Number(f.split('-')[2]) || 2);   // old tickets: 2 slots
    if (me >= 0) {
      for (const [k, s] of 'abcdefgh'.slice(0, n).split('').entries()) {
        if (ahead.some((m) => m > k)) continue;   // an earlier waiter can use this slot: it goes first
        const p = path.join(dir, s);
        try { fs.mkdirSync(p); fs.writeFileSync(path.join(p, 'pid'), String(process.pid)); leave(); return () => fs.rmSync(p, { recursive: true, force: true }); }
        catch { try { if (!alive(+fs.readFileSync(path.join(p, 'pid'), 'utf8'))) fs.rmSync(p, { recursive: true, force: true }); } catch { fs.rmSync(p, { recursive: true, force: true }); } }
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

(async () => {
  const stills = opt('stills') && String(opt('stills')).split(',').map(Number);
  const preview = !!opt('preview');
  const W = preview ? 960 : 1920, H = preview ? 540 : 1080;
  const fps = Number(opt('fps', preview ? 12 : 30));
  const release = stills ? () => {} : preview ? await slot('.preview-slots', 3) : await slot('.render-slots', Number(process.env.RENDER_SLOTS || 2));
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/${path.relative(STUDIO, project).split(path.sep).join('/')}/${SCENE}`;
  // Software raster + compositing by default: the SwiftShader GPU path reuses stale tiles during camera moves
// (ghost copies of cards/phones in sequential renders). Set RENDER_GPU=1 only for WebGL (three.js) scenes.
  const gpu = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ args: [...(process.env.RENDER_GPU ? gpu : ['--disable-gpu']), '--run-all-compositor-stages-before-draw'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: W / 1920 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  try {
    await page.waitForFunction(() => window.studioReady !== undefined, null, { timeout: 60000 });
    await page.evaluate(() => window.studioReady);
  } catch (e) {
    console.error('scene failed to load: ' + e.message + (errors.length ? '\npage errors:\n' + [...new Set(errors)].join('\n') : '\n(no page errors captured)'));
    await browser.close(); srv.close(); release(); process.exit(1);
  }
  const duration = await page.evaluate(() => window.DURATION);
  // Capture: read the scene's canvas directly (window.frameCanvas, else the first <canvas>) — ~8x faster
  // than a page screenshot. Pass --dom to screenshot the whole page instead (needed only if the scene
  // relies on HTML/CSS layers outside the canvas).
  const dom = opt('dom') ? true : opt('canvas') ? false : !(await page.evaluate(() => window.captureCanvas === true));
  const cdp = await page.context().newCDPSession(page);
  const shot = async () => dom ? Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true })).data, 'base64') : Buffer.from(await page.evaluate(() => {
    const c = window.frameCanvas || document.querySelector('canvas');
    return c.toDataURL('image/jpeg', 0.93).split(',')[1];
  }), 'base64');
  const done = async (code = 0) => { if (errors.length) console.error('page errors:\n' + [...new Set(errors)].slice(0, 10).join('\n')); await browser.close(); srv.close(); release(); process.exit(code); };

  if (stills) {
    fs.mkdirSync(path.join(project, 'stills'), { recursive: true });
    for (const t of stills) {
      await page.evaluate(t => { window.renderAt(t); }, t);
      fs.writeFileSync(path.join(project, 'stills', `t-${t}.jpg`), await shot());
    }
    console.log(`ok: ${stills.length} stills in ${path.join(project, 'stills')}`);
    return done();
  }

  const from = Number(opt('from', 0)), to = Math.min(Number(opt('to', duration)), duration);
  const out = path.join(project, opt('out', preview ? 'preview.mp4' : 'final.mp4'));
  const audio = path.join(project, 'narration.wav');
  const ff = ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  const withAudio = fs.existsSync(audio) && !opt('noaudio');
  if (withAudio) ff.push('-ss', String(from), '-t', String(to - from), '-i', audio);
  ff.push('-vf', `scale=${W}:${H}:flags=lanczos`, '-c:v', 'libx264', '-preset', preview ? 'veryfast' : (process.env.X264_PRESET || 'slow'), '-crf', preview ? '28' : '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (withAudio) ff.push('-c:a', 'aac', '-b:a', '96k', '-shortest');
  ff.push(out);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round((to - from) * fps);
  // Frame times are whole frames over fps, the same doubles the pages compute with their own Math.ceil(x*fps)/fps.
  // `from` arrives rounded to 4 decimals ("110.6333" for 3319/30), which is 0.00003 s BEFORE the page's tH3, so the first
  // frame of a part would still count as "before the handover" and show the previous overlay for one frame (experiment 18).
  const f0 = Math.round(from * fps);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => { window.renderAt(t); }, (f0 + i) / fps);
    const buf = await shot();
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if (i % (fps * 10) === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  const partial = from > 0 || to < duration;
  if (!preview && (!partial || opt('poster') !== undefined)) {  // a partial range keeps the existing poster.jpg
    const pt = Number(opt('poster', Math.min(8, duration / 3)));
    await page.evaluate(t => { window.renderAt(t); }, pt);
    fs.writeFileSync(path.join(project, 'poster.jpg'), await shot());
  }
  console.log(`ok: ${out} (${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  return done();
})().catch(e => { console.error(e); process.exit(1); });
