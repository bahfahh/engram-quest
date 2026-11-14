#!/usr/bin/env node
// Reading-time check: every piece of on-screen text must stay fully in frame long enough to be read.
// Idea and rule adapted from Lemo-Opuscar's core/render/readcheck.mjs (MIT, (c) 2026 LemoLab,
// https://github.com/lemomo-ai/lemo-opuscar), rewritten for this studio's page contract.
//
//   node readcheck.cjs projects/<id> [--scene scene.html] [--from 0 --to 60] [--step 0.04]
//        [--cjk-cps 4.5] [--latin-cps 15] [--pad 1.5] [--min 1.5]
//   For a multi-page film, run it once per page with that page's --from/--to (segments.json). Text already on screen
//   when a partial range starts, or still on screen when it ends, is not judged there — check overlapping ranges if needed.
//   WebGL / three.js pages: readcheck turns every WebGL draw call (drawArrays, drawElements, clear …) into a no-op
//   while it runs, so a 3D page is checked at about the speed of a DOM page without any change to the page.
//   A page can still skip its own CPU-side work when window.READCHECK is true. --draw keeps real drawing (only
//   needed if TEXTS reads pixels back from a WebGL canvas, which it should not).
//
// Page contract (in addition to renderAt / DURATION / studioReady):
//   window.TEXTS(t) -> [{id, text, x0, y0, x1, y1}]  every block of text the viewer is meant to READ at time t,
//   with its box in 1920x1080 page pixels. Include labels on maps, diagrams, recap cards, question cards, UI
//   callouts. Leave out decorative text nobody needs to read and the subtitles (the plugin shows those).
//   `text` is the block's complete text from its first frame (for a write-on effect report the full text,
//   not the part written so far). The same id with different text counts as a new block.
//   Helper: S.textsOf(selector) in /lib/stage.js collects boxes of DOM elements marked data-read.
//
// Rule: from the moment a block is fully inside the frame, it must stay fully inside (and in TEXTS) for at least
//   CJK characters / 4.5 + other non-space characters / 15 + 1.5 s, and never less than 1.5 s.
//   A block that is never fully in frame is reported too.
// Exit: 0 all pass, 1 some fail, 2 could not check (no window.TEXTS, or no text at all — that is NOT a pass).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const STUDIO = __dirname;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const project = path.resolve(args[0] || '');
const SCENE = String(opt('scene', 'scene.html'));
const DRAW = args.includes('--draw');
const STEP = +opt('step', 0.04), CJK = +opt('cjk-cps', 4.5), LATIN = +opt('latin-cps', 15), PAD = +opt('pad', 1.5), MIN = +opt('min', 1.5);
if (!project.startsWith(path.join(STUDIO, 'projects'))) { console.error('project must live under ' + path.join(STUDIO, 'projects')); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };
// /engram-quest/custom/… is the user's custom area, served read-only from the vault (lib/served-path.cjs).
// Only this machine can reach the server.
const { servedPath } = require('./lib/served-path.cjs');
const srv = http.createServer((req, rsp) => {
  const { root, p } = servedPath(STUDIO, decodeURIComponent(req.url.split('?')[0]), project);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
  rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(rsp);
});

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const gpu = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  // WebGL needs a context even when nothing is drawn: use SwiftShader (cheap here because draws are no-ops)
  const browser = await chromium.launch({ args: gpu });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const url = `http://127.0.0.1:${srv.address().port}/${path.relative(STUDIO, project).split(path.sep).join('/')}/${SCENE}`;
  await page.addInitScript(draw => {
    window.READCHECK = true;
    if (draw) return;
    const noop = () => {};
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!C) continue;
      for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear', 'blitFramebuffer'])
        if (C.prototype[m]) C.prototype[m] = noop;
    }
  }, DRAW);
  await page.goto(url);
  await page.waitForFunction(() => window.studioReady !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.studioReady);
  const dur = await page.evaluate(() => window.DURATION);
  const from = +opt('from', 0), to = Math.min(+opt('to', dur), dur);
  const atEnd = to >= dur - 1e-6;
  const res = await page.evaluate(({ STEP, from, to, atEnd }) => {
    if (typeof window.TEXTS !== 'function') return { noTexts: true };
    // every appearance of a block (id + text) is judged on its own: a block that leaves and comes back later
    // (the same label in a later segment) gets a new record (debug/issue-2026-11-03-…-readcheck-reappear)
    const W = 1920, H = 1080, open = {}, closed = [], everSeen = new Set(), partial = {};
    for (let t = from; t <= to + 1e-9; t += STEP) {
      window.renderAt(t);
      const vis = new Set();
      for (const b of window.TEXTS(t) || []) {
        const key = String(b.id) + '\u0000' + b.text;
        if (!(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H)) { partial[key] ??= { id: String(b.id), text: b.text, t0: t }; continue; }
        vis.add(key); everSeen.add(key);
        // a block already on screen at the start of a partial range began earlier: not judged (openStart)
        const s = open[key] ??= { id: String(b.id), text: b.text, t0: t, run: 0, done: false, openStart: from > 0 && t - from < STEP / 2 };
        s.run = Math.min(t + STEP, to) - s.t0;
      }
      for (const k in open) if (!vis.has(k)) { open[k].done = true; closed.push(open[k]); delete open[k]; }
    }
    for (const k in partial) if (everSeen.has(k)) delete partial[k];
    // a block still on screen at the end of a partial range is not judged (it continues past --to)
    if (!atEnd) for (const k in open) open[k].openEnd = true;
    return { seen: [...closed, ...Object.values(open)].sort((a, b) => a.t0 - b.t0), partial: Object.values(partial) };
  }, { STEP, from, to, atEnd });
  await browser.close(); srv.close();
  if (res.noTexts || (!res.seen.length && !res.partial.length)) {
    console.error('readcheck: NOT CHECKED — ' + (res.noTexts ? 'the page has no window.TEXTS(t).' : 'TEXTS(t) returned no text in this range.') + ' This is not a pass.');
    process.exit(2);
  }
  const isCJK = ch => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch);
  const need = text => { let c = 0, o = 0; for (const ch of text) { if (/\s/.test(ch)) continue; isCJK(ch) ? c++ : o++; } return Math.max(MIN, c / CJK + o / LATIN + PAD); };
  const ts = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  let bad = 0;
  for (const s of res.seen.sort((a, b) => a.t0 - b.t0)) {
    const n = need(s.text), open = s.openEnd || s.openStart, ok = open || s.run >= n - 1e-6; if (!ok) bad++;
    const got = s.openStart ? '(began before range)' : s.openEnd ? '(runs past range)' : s.run.toFixed(1) + 's';
    console.log(`${ok ? 'OK ' : 'BAD'} ${ts(s.t0)}  need ${n.toFixed(1)}s  got ${got}  ${s.id}  ${JSON.stringify(s.text.slice(0, 30))}`);
  }
  for (const s of res.partial) { bad++; console.log(`BAD ${ts(s.t0)}  never fully in frame  ${s.id}  ${JSON.stringify(s.text.slice(0, 30))}`); }
  console.log(bad ? `readcheck: ${bad} block(s) too short or cut off` : 'readcheck: all text readable');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(2); });
