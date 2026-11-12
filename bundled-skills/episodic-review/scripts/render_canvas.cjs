// Render Obsidian canvases to PNG, so a person (or an agent) can read the relations by eye.
// Usage: node render_canvas.cjs <list file: one vault-relative .canvas path per line> <output folder> [vault path]
// CJK font: set the environment variable CANVAS_FONT_DIR to an @fontsource/noto-sans-tc folder when the machine has no CJK font.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const [listFile, outDir, vaultArg] = process.argv.slice(2);
const VAULT = path.resolve(vaultArg || '.');
const FONT = process.env.CANVAS_FONT_DIR || '';
fs.mkdirSync(outDir, { recursive: true });
const COLORS = { '1': '#e5484d', '2': '#f76b15', '3': '#e2b203', '4': '#30a46c', '5': '#0090ff', '6': '#8e4ec6' };
const col = c => !c ? null : (COLORS[c] || c);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/!\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (m, a) => `<span class="emb">[image: ${path.basename(a)}]</span>`)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<u>$2</u>').replace(/\[\[([^\]]+)\]\]/g, (m, a) => `<u>${path.basename(a)}</u>`)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/==([^=]+)==/g, '<mark>$1</mark>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
function md(text, maxLines = 60) {
  const out = []; let n = 0;
  for (let line of (text || '').split('\n')) {
    if (++n > maxLines) { out.push('<div class="more">…</div>'); break; }
    if (/^\s*$/.test(line)) { out.push('<div class="sp"></div>'); continue; }
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); continue; }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)/))) out.push(`<div class="h h${m[1].length}">${inline(m[2])}</div>`);
    else if ((m = line.match(/^(\s*)[-*]\s+(.*)/))) out.push(`<div class="li" style="margin-left:${m[1].length * 6}px">• ${inline(m[2])}</div>`);
    else if ((m = line.match(/^(\s*)\d+[.)]\s+(.*)/))) out.push(`<div class="li" style="margin-left:${m[1].length * 6}px">${inline(line.trim())}</div>`);
    else if ((m = line.match(/^>\s?(.*)/))) out.push(`<div class="bq">${inline(m[1])}</div>`);
    else out.push(`<div>${inline(line)}</div>`);
  }
  return out.join('');
}
function fileNode(n) {
  const f = n.file || ''; const abs = path.join(VAULT, f); const ext = path.extname(f).toLowerCase();
  const title = `<div class="ft">📄 ${esc(path.basename(f, ext))}${n.subpath ? esc(n.subpath) : ''}</div>`;
  if (['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(ext) && fs.existsSync(abs))
    return `${title}<img src="file://${encodeURI(abs)}">`;
  if (ext === '.md' && fs.existsSync(abs)) {
    let t = fs.readFileSync(abs, 'utf8').replace(/^---[\s\S]*?\n---\n/, '');
    if (n.subpath) { const h = n.subpath.replace(/^#/, ''); const i = t.indexOf(h); if (i >= 0) t = t.slice(i); }
    return title + `<div class="fb">${md(t, 18)}</div>`;
  }
  return title + `<div class="fb">(${fs.existsSync(abs) ? 'file' : 'file not found'})</div>`;
}
function anchor(n, side) {
  const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
  return { top: [cx, n.y], bottom: [cx, n.y + n.height], left: [n.x, cy], right: [n.x + n.width, cy] }[side || 'right'] || [cx, cy];
}
const norm = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
function build(c) {
  const nodes = c.nodes || [], edges = c.edges || [];
  if (!nodes.length) return null;
  const minx = Math.min(...nodes.map(n => n.x)) - 60, miny = Math.min(...nodes.map(n => n.y)) - 60;
  const maxx = Math.max(...nodes.map(n => n.x + n.width)) + 60, maxy = Math.max(...nodes.map(n => n.y + n.height)) + 60;
  const W = maxx - minx, H = maxy - miny, scale = Math.min(1, 3600 / W);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const sorted = [...nodes].sort((a, b) => (a.type === 'group' ? 0 : 1) - (b.type === 'group' ? 0 : 1) || b.width * b.height - a.width * a.height);
  let html = '';
  for (const n of sorted) {
    const k = col(n.color); const st = `left:${n.x - minx}px;top:${n.y - miny}px;width:${n.width}px;height:${n.height}px;${k ? `border-color:${k};` : ''}`;
    if (n.type === 'group') html += `<div class="g" style="${st}${k ? `background:${k}14;` : ''}"><div class="gl" style="${k ? `background:${k};color:#fff;` : ''}">${esc(n.label || '')}</div></div>`;
    else if (n.type === 'text') html += `<div class="n t" style="${st}${k ? `background:${k}1f;` : ''}">${md(n.text)}</div>`;
    else if (n.type === 'file') html += `<div class="n f" style="${st}">${fileNode(n)}</div>`;
    else if (n.type === 'link') html += `<div class="n t" style="${st}">🔗 ${esc(n.url || '')}</div>`;
  }
  let svg = '', labels = '';
  for (const e of edges) {
    const a = byId[e.fromNode], b = byId[e.toNode]; if (!a || !b) continue;
    const [x1, y1] = anchor(a, e.fromSide), [x2, y2] = anchor(b, e.toSide);
    const d1 = norm[e.fromSide] || [0, 0], d2 = norm[e.toSide] || [0, 0];
    const L = Math.max(60, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    const p = [x1 - minx, y1 - miny, x1 - minx + d1[0] * L, y1 - miny + d1[1] * L, x2 - minx + d2[0] * L, y2 - miny + d2[1] * L, x2 - minx, y2 - miny];
    const k = col(e.color) || '#555';
    const endA = (e.toEnd || 'arrow') !== 'none', startA = e.fromEnd === 'arrow';
    svg += `<path d="M${p[0]},${p[1]} C${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]}" stroke="${k}" stroke-width="3" fill="none" ${endA ? 'marker-end="url(#ar)"' : ''} ${startA ? 'marker-start="url(#as)"' : ''}/>`;
    if (e.label) {
      const t = 0.5, mx = (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[2] + 3 * (1 - t) * t * t * p[4] + t ** 3 * p[6];
      const my = (1 - t) ** 3 * p[1] + 3 * (1 - t) ** 2 * t * p[3] + 3 * (1 - t) * t * t * p[5] + t ** 3 * p[7];
      labels += `<div class="el" style="left:${mx}px;top:${my}px;border-color:${k}">${esc(e.label)}</div>`;
    }
  }
  return { W, H, scale, body: `<div id="c" style="width:${W}px;height:${H}px;transform:scale(${scale});transform-origin:0 0">${html}<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#555"/></marker><marker id="as" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#555"/></marker></defs>${svg}</svg>${labels}</div>` };
}
const CSS = `body{margin:0;background:#f4f2ee;font-family:"Noto Sans TC","Noto Sans CJK TC",sans-serif;color:#222}
#c{position:relative}.g{position:absolute;border:3px solid #999;border-radius:14px;background:#0000000a}
.gl{position:absolute;left:10px;top:-30px;font-size:20px;font-weight:700;background:#888;color:#fff;padding:2px 10px;border-radius:6px;white-space:nowrap}
.n{position:absolute;border:2px solid #bbb;border-radius:10px;background:#fff;padding:8px 10px;overflow:hidden;font-size:15px;line-height:1.4;box-sizing:border-box}
.f{background:#fbfbff;border-style:dashed}.ft{font-weight:700;color:#3451b2;margin-bottom:4px;font-size:15px}.fb{font-size:12px;color:#444}.f img{max-width:100%;max-height:85%}
.h{font-weight:700}.h1{font-size:22px}.h2{font-size:19px}.h3{font-size:17px}.li{}.bq{border-left:3px solid #aaa;padding-left:6px;color:#555}.sp{height:5px}
mark{background:#ffe066}code{background:#eee;padding:0 3px;border-radius:3px;font-size:90%}.emb{color:#888}.more{color:#999}
.el{position:absolute;transform:translate(-50%,-50%);background:#fff;border:2px solid #555;border-radius:8px;padding:2px 8px;font-size:15px;font-weight:700;white-space:nowrap;z-index:5}`;
(async () => {
  const list = fs.readFileSync(listFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const browser = await chromium.launch(); const page = await browser.newPage();
  const index = {}; const TMP = path.resolve(outDir, '_tmp.html');
  for (const rel of list) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(VAULT, rel), 'utf8'));
      const b = build(c); if (!b) { index[rel] = null; continue; }
      const w = Math.ceil(b.W * b.scale), h = Math.ceil(b.H * b.scale);
      await page.setViewportSize({ width: Math.max(200, w), height: Math.max(200, Math.min(h, 12000)) });
      fs.writeFileSync(TMP, `<!doctype html><meta charset="utf-8">${FONT ? `<link rel="stylesheet" href="file://${FONT}/400.css"><link rel="stylesheet" href="file://${FONT}/700.css">` : ""}<style>${CSS}</style>${b.body}`);
      await page.goto('file://' + TMP, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
      const out = path.resolve(outDir, rel.replace(/\//g, '__').replace(/\.canvas$/, '.png'));
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: Math.min(h, 12000) } });
      index[rel] = { png: out, nodes: c.nodes.length, edges: (c.edges || []).length, scale: +b.scale.toFixed(2) };
    } catch (err) { index[rel] = { error: String(err).slice(0, 200) }; }
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1));
  await browser.close();
  console.log('rendered', Object.values(index).filter(v => v && v.png).length, '/', list.length);
})();
