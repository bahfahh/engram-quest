// Vault index from Obsidian's own metadata cache, for `obsidian eval` (Obsidian CLI 1.12+, Obsidian must be running).
//
//   obsidian eval code="$(cat <skill folder>/scripts/obsidian_index.js)" > index.json
//
// Synchronous on purpose (only the metadata cache, no file reads), so it works whether or not `eval` awaits promises.
// Set START/END (ISO dates, UTC+8) to keep notes modified in the period; null keeps everything.
// Output JSON: { generated, files: [ { path, mtime, ctime, size, frontmatter, tags, headings, links, embeds, backlinks } ],
//                canvases: [ { path, mtime } ] }
//   links / embeds / backlinks are resolved vault paths: Obsidian resolves aliases, renamed files and same-name notes,
//   which a regex over the files cannot do reliably.
// Not included: each note's one-line summary and canvas contents. Read those files directly (they are few and known).
// Use it to: list the period's notes, group topics (folders, map series, shared canvas, many links), find project notes
// that link to a topic, and the figures each note embeds — without grepping the whole vault.
(() => {
  const START = null;   // e.g. '2026-10-01'
  const END = null;     // e.g. '2026-11-01' (exclusive)
  const t0 = START ? Date.parse(START + 'T00:00:00+08:00') : -Infinity;
  const t1 = END ? Date.parse(END + 'T00:00:00+08:00') : Infinity;
  const mc = app.metadataCache;
  const inPeriod = f => f.stat.mtime >= t0 && f.stat.mtime < t1;
  const resolve = (link, from) => { const d = mc.getFirstLinkpathDest(String(link).split('#')[0], from); return d ? d.path : null; };
  const back = {};
  for (const [src, targets] of Object.entries(mc.resolvedLinks)) {
    for (const dst of Object.keys(targets)) (back[dst] = back[dst] || []).push(src);
  }
  const files = app.vault.getMarkdownFiles()
    .filter(f => inPeriod(f) && !f.path.startsWith('Clippings/'))     // Clippings holds raw web captures, not notes
    .map(f => {
      const c = mc.getFileCache(f) || {};
      const fmTags = (c.frontmatter && c.frontmatter.tags) || [];
      return {
        path: f.path, mtime: f.stat.mtime, ctime: f.stat.ctime, size: f.stat.size,
        frontmatter: c.frontmatter || null,
        tags: (c.tags || []).map(t => t.tag).concat(Array.isArray(fmTags) ? fmTags : [fmTags]),
        headings: (c.headings || []).map(h => ({ level: h.level, heading: h.heading })),
        links: [...new Set((c.links || []).map(l => resolve(l.link, f.path)).filter(Boolean))],
        embeds: [...new Set((c.embeds || []).map(e => resolve(e.link, f.path) || e.link))],
        backlinks: (back[f.path] || []).filter(p => !p.startsWith('Clippings/')),
      };
    });
  const canvases = app.vault.getFiles().filter(x => x.extension === 'canvas' && inPeriod(x))
    .map(f => ({ path: f.path, mtime: f.stat.mtime }));
  return JSON.stringify({ generated: new Date().toISOString(), files, canvases });
})()
