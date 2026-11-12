// patterns.js — whole presentations driven by data. Each is chosen for a shape of content (reference/03-presentation.md).
// Chapter-level patterns return (t0) => t1. Beats are used inside chapter({ beats: [...] }) and return (c, W) => void.
// Timing follows the text: a beat waits as long as its new words need. Write your own beat with engine.js when none fits.
import { el, on, off, at, wait, T, wire, line, fn, ico, midOf, clamp } from './engine.js';
import { chapter as chap, header, caption, label, node, chat, bubble, box, row, tag, ring, COL } from './parts.js';
export const PALETTE = [COL.blue, COL.teal, COL.violet, COL.amber, COL.green];
export const SK = { q: [] };                                    // the film's skeleton: [[name, sub, colour]], set by skeleton()
const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s/g, '');
export const rt = (...s) => s.reduce((a, x) => a + strip(x).length / 5 + 0.5, 0);      // seconds the viewer needs for these texts
const hold = (...s) => wait(Math.max(2.2, rt(...s)));
const colour = (c) => COL[c] || c || COL.ink;

// ------------------------------------------------------------------ opening: a few points, then one question
// { year, month, count, areasTitle, areas: [[name, n]], pick: { index, line, topic }, history: { title, stops: [[when, title, sub, isNow]], note }, question }
export const opening = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c); at(t0 + 0.8);
  const a = on(el(c, 'a s c', d.year || '', 'left:0;right:0;top:330px;letter-spacing:.5em;font-size:30px'), { dy: 0 }), b = on(el(c, 'a h0 c', d.month, 'left:0;right:0;top:380px'));
  wait(2.4); const s0 = on(el(c, 'a h2 c', d.count, 'left:0;right:0;top:640px;color:#b9bac2;font-weight:400')); hold(d.count); wait(1); [a, b, s0].forEach(r => off(r)); wait(0.5);
  if (d.areas) { const n = d.areas.length, gap = Math.min(300, 1400 / n), x0 = 960 - gap * (n - 1) / 2;
    const hd = on(el(c, 'a h2 c', d.areasTitle, 'left:0;right:0;top:300px'));
    const dots = d.areas.map(([name, k], i) => on(node(c, x0 + i * gap, 540, name, `${k}`, { side: 'below', r: 8 + Math.min(4, parseInt(k) || 1) * 3.5, fs: 34 }), { t: T + 0.4 + i * 0.55, dy: 10 }));
    hold(d.areasTitle, ...d.areas.map(x => x[0])); wait(1.5); off(hd);
    if (d.pick) { const h2 = on(el(c, 'a h2 c', d.pick.line, 'left:0;right:0;top:300px')); dots.forEach((r, i) => { if (i !== d.pick.index) r.dim.push([T, 1e9, 0.22]); });
      const nm = on(el(c, 'a h3 c violet', d.pick.topic, `left:${x0 + d.pick.index * gap - 250}px;width:500px;top:690px`), { t: T + 1.2 }); hold(d.pick.line, d.pick.topic); wait(1.5); off(h2); off(nm); }
    dots.forEach(r => off(r)); wait(0.6); }
  if (d.history) { const st = d.history.stops, n = st.length, gap = Math.min(380, 1500 / n), x0 = 960 - gap * (n - 1) / 2;
    on(el(c, 'a h2', d.history.title, 'left:140px;top:230px')); line(W, 'M140 560 L1780 560', { t: T + 0.4, dur: 2.0, color: 'rgba(255,255,255,.3)', w: 2 });
    st.forEach(([m, name, sub, now], i) => { const x = x0 + i * gap, t = T + 1.4 + i * 2.4;
      on(el(c, 'dot', '', `left:${x - 8}px;top:552px;width:16px;height:16px;background:${now ? COL.violet : '#fff'}`), { t, dy: 0 });
      on(el(c, 'a s nw c', m, `left:${x - 150}px;width:300px;top:496px;color:${now ? COL.violet : COL.mute}`), { t, dy: 0 });
      on(el(c, 'a nw c', `<div style="font-size:33px;font-weight:500">${name}</div><div class="s" style="margin-top:8px;font-size:26px">${sub || ''}</div>`, `left:${x - 190}px;width:380px;top:610px`), { t: t + 0.2 }); });
    if (d.history.note) on(el(c, 'a s it', d.history.note, 'right:140px;top:760px;color:#b69cff'), { t: T + 1.4 + n * 2.4, dy: 0 });
    wait(1.4 + n * 2.4 + 3.5); }
  on(el(c, 'a h1 c', d.question, `left:0;right:0;top:${d.history ? 820 : 440}px;font-size:60px`)); hold(d.question); wait(2.5);
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ skeleton: the questions the topic answers, in order
// { title, questions: [[name, sub]], note }
export const skeleton = (d) => (t0) => {
  SK.q = d.questions.map(([n, s], i) => [n, s, PALETTE[i % PALETTE.length]]);
  const { c, end } = chap(t0), W = wire(c), n = SK.q.length, gap = Math.min(440, 1500 / n), x0 = 960 - gap * (n - 1) / 2; at(t0 + 0.6);
  on(el(c, 'a h1 c', d.title, 'left:0;right:0;top:230px'));
  SK.q.forEach(([name, sub, col], i) => { const x = x0 + i * gap, t = T + 1.6 + i * 2.7;
    on(el(c, 'a s c', `0${i + 1}`, `left:${x - 100}px;width:200px;top:452px;color:${col};letter-spacing:.2em`), { t, dy: 0 });
    on(el(c, 'dot', '', `left:${x - 11}px;top:529px;width:22px;height:22px;background:${col}`), { t, dy: 0 });
    on(el(c, 'a c nw', `<div style="font-size:50px;font-weight:500;letter-spacing:.04em">${name}</div><div class="s" style="margin-top:14px;font-size:27px;color:#b9bac2">${sub}</div>`, `left:${x - gap / 2}px;width:${gap}px;top:590px`), { t: t + 0.15 });
    if (i < n - 1) line(W, `M${x + 30} 540 L${x + gap - 30} 540`, { t: t + 1.5, dur: 1.0, arrow: true, w: 2 }); });
  wait(1.6 + n * 2.7 + 2.5); if (d.note) { on(el(c, 'a p c', d.note, 'left:0;right:0;top:820px')); hold(d.note); wait(1.5); }
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ a chapter for one skeleton question: header + beats
// { index (which skeleton question), title, beats: [beat, ...] }
export const chapter = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c), q = SK.q[d.index] || []; at(t0 + 0.5);
  header(c, d.index != null ? `0${d.index + 1}` : '', d.title || q[0] + '？', q[2] || '#fff', T); wait(1.4);
  d.beats.forEach((b, i) => { b(c, W); if (i < d.beats.length - 1) wait(0.6); });
  end(T); return T + 0.6;
};
const clear = (list, lines = []) => { list.forEach(r => off(r)); lines.forEach(l => { l.out = T; }); };

// beat: one source, sorted into groups (a conversation or a page, and what is taken from it)
// { source: { title, lines: [[text, mine]] }, groups: [{ title, color, via, items, as: 'rows' | 'chips' }], caption }
export const sortInto = (d) => (c, W) => { const A = [], L = [], n = d.groups.length, gh = Math.min(260, (540 - (n - 1) * 30) / n);
  const k = chat(c, 100, 300, 620, 540, d.source.title); A.push(on(k, { dy: 0 }));
  d.source.lines.forEach(([s, me], i) => on(bubble(k, s, me !== 0), { t: T + 0.9 + i * 1.5, dy: 12 })); wait(0.9 + d.source.lines.length * 1.5 + 1.2);
  d.groups.forEach((g, j) => { const y = 300 + j * (gh + 30), col = colour(g.color);
    L.push(line(W, `M720 ${y + gh / 2} L1060 ${y + gh / 2}`, { arrow: true, color: col, w: 2.5 })); if (g.via) A.push(label(c, 770, y + gh / 2 - 44, g.via, T + 0.5, { color: col }));
    const b = box(c, 1080, y, 720, gh, g.title, col); A.push(on(b, { t: T + 0.7 }));
    g.items.forEach((it, i) => g.as === 'chips' ? on(el(b.body, 'a nw', it, `position:static;display:inline-block;margin:6px 14px 10px 0;padding:10px 22px;border-radius:14px;border:1.5px dashed ${col};color:${col};font-size:30px`), { t: T + 1.5 + i * 0.9, dy: 8 })
      : on(row(b, ...[].concat(it)), { t: T + 1.5 + i * 0.9, dy: 8 }));
    wait(1.5 + g.items.length * 0.9 + rt(g.title, ...g.items.flat()) * 0.6); });
  const cp = d.caption && caption(c, d.caption, T); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A, L); };

// beat: the same facets, side by side, for two or three things
// { cols: [{ name, color, rows: [[facet, text]] }], caption }
export const facets = (d) => (c) => { const A = [], n = d.cols.length, w = (1660 - (n - 1) * 40) / n, rows = Math.max(...d.cols.map(x => x.rows.length));
  d.cols.forEach((col, j) => { const x = 130 + j * (w + 40), k = box(c, x, 300, w, 160 + rows * 118, '', colour(col.color)); A.push(on(k, { t: T + j * 0.4 }));
    on(el(k, 'a', col.name, `left:40px;top:30px;font-size:60px;font-weight:500;letter-spacing:.08em;color:${colour(col.color)}`), { t: T + 0.3 + j * 0.4, dy: 0 });
    col.rows.forEach(([a, b], i) => { on(el(k, 'a s', a, `left:42px;top:${150 + i * 118}px;letter-spacing:.14em`), { t: T + 1.4 + i * 3.2 + j * 1.5, dy: 0 }); on(el(k, 'a', b, `left:42px;top:${186 + i * 118}px;right:30px;font-size:${n > 2 ? 30 : 35}px`), { t: T + 1.5 + i * 3.2 + j * 1.5 }); }); });
  wait(1.5 + rows * 3.2 + n * 1.5); const cp = d.caption && caption(c, d.caption, T, undefined, 880); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A); };

// beat: rows that arrive one at a time under shared column heads (several views of one thing; a comparison table)
// { title, heads: [a, b, c], rows: [{ name, when, mid, tags: [[text, color]] }], caption }
export const table = (d) => (c, W) => { const A = [], L = [];
  A.push(on(el(c, 'a h2', d.title, 'left:130px;top:290px'))); d.heads.forEach((s, i) => A.push(on(el(c, 'a s', s, `left:${[130, 520, 1130][i]}px;top:390px;letter-spacing:.14em`), { t: T + 0.8, dy: 0 })));
  wait(1.6); d.rows.forEach((r, i) => { const y = 450 + i * 130;
    L.push(line(W, `M130 ${y - 16} L1790 ${y - 16}`, { dur: 0.8, color: 'rgba(255,255,255,.12)', w: 1 }));
    A.push(on(el(c, 'a nw', `<span style="font-size:36px;font-weight:500">${r.name}</span><span class="s" style="margin-left:16px">${r.when || ''}</span>`, `left:130px;top:${y + 14}px`)));
    A.push(on(el(c, 'a nw', r.mid, `left:506px;top:${y + 12}px;font-size:38px`), { t: T + 0.8 }));
    A.push(on(el(c, 'a nw', r.tags.map(([s, col]) => `<span class="tag" style="color:${colour(col)};font-size:28px;margin-right:14px">${s}</span>`).join(''), `left:1130px;top:${y + 16}px`), { t: T + 1.8 }));
    wait(1.8 + rt(r.name, r.mid, ...r.tags.map(x => x[0]))); });
  const cp = d.caption && caption(c, d.caption, T, undefined, 880); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A, L); };

// beat: two to four options as cards, each with a small picture and the same two or three labelled lines
// { title, setup, cards: [{ art, name, sub, color, src, lines: [[label, text, color]] }], caption, sub }
export const optionCards = (d) => (c) => { const A = [], n = d.cards.length, w = Math.min(520, (1720 - (n - 1) * 25) / n), x0 = 960 - (n * w + (n - 1) * 25) / 2, y = d.title ? 372 : 290;
  if (d.title) A.push(on(el(c, 'a h2', d.title, 'left:130px;top:284px'))); if (d.setup) A.push(on(el(c, 'a nw', d.setup, 'right:130px;top:290px'), { t: T + 1.0, dy: 0 }));
  wait(d.title ? 2.2 : 0.2);
  d.cards.forEach((k0, i) => { const k = box(c, x0 + i * (w + 25), y, w, (k0.art ? 300 : 150) + k0.lines.length * 112 + 60, ''), col = colour(k0.color); A.push(on(k));
    if (k0.art) el(k, 'a', k0.art, 'left:30px;top:26px;right:20px;height:150px');
    on(el(k, 'a', `<div style="font-size:${k0.name.length > 5 ? 36 : 52}px;font-weight:500;color:${col};line-height:1.2">${k0.name}</div><div class="s" style="margin-top:4px;font-size:25px">${k0.sub || ''}</div>`, `left:30px;top:${k0.art ? 186 : 30}px;right:20px`), { t: T + 0.4, dy: 0 });
    let tt = 1.5; k0.lines.forEach(([lab, text, lc], j) => { on(el(k, 'a', (lab ? `<div class="s" style="color:${colour(lc || 'mute')};letter-spacing:.14em;font-size:24px">${lab}</div>` : '') + `<div style="font-size:29px;line-height:1.45;margin-top:2px;color:${lc && lc !== 'green' && lc !== 'coral' ? colour(lc) : '#f3f3f5'}">${text}</div>`, `left:30px;top:${(k0.art ? 300 : 150) + j * 112}px;right:24px`), { t: T + tt }); tt += rt(text) * 0.7 + 0.6; });
    if (k0.src) on(el(k, 'a s it', k0.src, 'left:30px;bottom:18px;font-size:24px'), { t: T + tt, dy: 0 });
    wait(tt + 1.2); });
  const cp = d.caption && caption(c, d.caption, T, undefined, 944); if (d.sub) A.push(on(el(c, 'a s nw', d.sub, 'left:820px;top:1012px;font-size:26px'), { t: T + 2.6, dy: 0 }));
  if (cp) hold(d.caption, d.sub || ''); wait(1.5); clear(cp ? [...A, cp] : A); };

// beat: a choice, asked one question after another, each with where a yes leads
// { title, questions: [{ q, ex, yes, to, why, color }], extra: { lead, q, ex, a: [[label, text, color]] } }
export const ladder = (d) => (c, W) => { const A = [], L = [], n = d.questions.length, gap = Math.min(148, 440 / n);
  A.push(on(el(c, 'a h2', d.title, 'left:130px;top:280px'))); L.push(line(W, `M176 390 L176 ${370 + n * gap}`, { t: T + 0.8, dur: 2.0, color: 'rgba(255,255,255,.22)', w: 2 })); wait(1.4);
  d.questions.forEach((x, i) => { const y = 380 + i * gap, col = colour(x.color);
    A.push(on(el(c, 'dot', '', `left:167px;top:${y + 18}px;width:18px;height:18px`), { dy: 0 }));
    A.push(on(el(c, 'a nw', `<div style="font-size:40px;font-weight:500">${x.q}</div><div class="s" style="margin-top:8px">${x.ex || ''}</div>`, `left:220px;top:${y}px`)));
    L.push(line(W, `M900 ${y + 28} L1050 ${y + 28}`, { t: T + 1.6, dur: 0.6, arrow: true, color: col, w: 2.5 })); A.push(label(c, 944, y - 12, x.yes || '', T + 1.6, { color: col }));
    A.push(on(el(c, 'a nw', `<span style="font-size:${x.to.length > 4 ? 38 : 48}px;font-weight:500;color:${col}">${x.to}</span><span style="font-size:30px;margin-left:22px;color:#b9bac2">${x.why || ''}</span>`, `left:1080px;top:${y - 2}px`), { t: T + 2.0 }));
    wait(2.0 + rt(x.q, x.ex || '', x.to, x.why || '')); });
  if (d.extra) { const k = box(c, 130, 836, 1660, 150, '', COL.coral); A.push(on(k));
    on(el(k, 'a nw', `<span class="s coral" style="letter-spacing:.12em">${d.extra.lead}</span><div style="font-size:38px;font-weight:500;margin-top:6px">${d.extra.q}<span class="s" style="margin-left:16px">${d.extra.ex || ''}</span></div>`, 'left:34px;top:22px'), { t: T + 0.4, dy: 0 });
    on(el(k, 'a', d.extra.a.map(([l, s, col]) => `<div style="font-size:30px;margin-bottom:8px"><span style="color:${colour(col)}">${l}</span>　${s}</div>`).join(''), 'left:1010px;top:28px'), { t: T + 3.2, dy: 0 });
    wait(3.2 + rt(d.extra.q, ...d.extra.a.map(x => x[1]))); }
  wait(2.0); clear(A, L); };

// beat: two or three flows drawn as lanes of steps, so their difference is visible
// { lanes: [{ name, sub, steps: [[text, color]], bypass: { from, to, text }, tag: [text, color] }], quote, rule }
export const lanes = (d) => (c, W) => { const A = [], L = [], gap = Math.min(260, 520 / d.lanes.length);
  d.lanes.forEach((ln, j) => { const y = 340 + j * gap; A.push(on(el(c, 'a nw', `<div style="font-size:40px;font-weight:500">${ln.name}</div><div class="s" style="margin-top:6px">${ln.sub || ''}</div>`, `left:130px;top:${y - 8}px`)));
    let x = 480; const xs = []; ln.steps.forEach(([s, col], i) => { const w = strip(s).length * 32 + 62, cc = col ? colour(col) : 'rgba(255,255,255,.2)'; xs.push([x, w]);
      A.push(on(el(c, 'a c nw', s, `left:${x}px;top:${y}px;width:${w}px;height:70px;line-height:68px;border-radius:16px;border:1.5px solid ${cc};background:${col ? cc + '14' : 'rgba(255,255,255,.05)'};font-size:30px`), { t: T + 0.8 + i * 1.1, dy: 0, dx: -14 }));
      if (i < ln.steps.length - 1) L.push(line(W, `M${x + w + 8} ${y + 35} L${x + w + 52} ${y + 35}`, { t: T + 1.3 + i * 1.1, dur: 0.4, arrow: true, w: 2 })); x += w + 60; });
    let tt = 0.8 + ln.steps.length * 1.1;
    if (ln.bypass) { const [a, aw] = xs[ln.bypass.from], [b, bw] = xs[ln.bypass.to]; L.push(line(W, `M${a + aw / 2} ${y + 80} C${a + aw / 2} ${y + 140} ${b + bw / 2} ${y + 140} ${b + bw / 2} ${y + 80}`, { t: T + tt, dur: 0.9, arrow: true, color: COL.coral, w: 2.5, dash: '3 10' }));
      A.push(label(c, (a + aw / 2 + b + bw / 2) / 2 - 100, y + 138, ln.bypass.text, T + tt + 0.4, { color: COL.coral })); tt += 1.6; }
    if (ln.tag) A.push(on(tag(c, x + 10, y + 16, ln.tag[0], colour(ln.tag[1])), { t: T + tt, dy: 0 }));
    wait(tt + rt(ln.name, ...ln.steps.map(s => s[0])) * 0.5 + 1.5); });
  if (d.quote) { A.push(on(el(c, 'a h1 c it', d.quote, 'left:0;right:0;top:770px;font-size:58px;font-weight:400'))); hold(d.quote); }
  if (d.rule) { A.push(on(el(c, 'a p c', d.rule, 'left:0;right:0;top:880px'))); hold(d.rule); }
  wait(1.5); clear(A, L); };

// beat: quantities as bars
// { title, rows: [{ name, sub, value (0..1 of the widest), text, note, color }], note }
export const bars = (d) => (c) => { const A = [], gap = Math.min(136, 430 / d.rows.length);
  A.push(on(el(c, 'a h2', d.title, 'left:130px;top:290px'))); wait(1.4);
  d.rows.forEach((r, i) => { const y = 400 + i * gap, col = colour(r.color), w = Math.max(30, r.value * 640);
    A.push(on(el(c, 'a nw', `<div style="font-size:38px;font-weight:500">${r.name}</div><div class="s" style="margin-top:4px">${r.sub || ''}</div>`, `left:130px;top:${y}px`)));
    A.push(on(el(c, 'a', '', `left:640px;top:${y + 14}px;width:${w}px;height:40px;border-radius:10px;background:${col}`), { t: T + 0.8, dy: 0, dx: -30 }));
    A.push(on(el(c, 'a nw', `<span style="font-size:36px;font-weight:500;color:${col}">${r.text}</span><span class="s" style="margin-left:18px">${r.note || ''}</span>`, `left:${660 + w}px;top:${y + 8}px`), { t: T + 1.6, dy: 0 }));
    wait(1.6 + rt(r.name, r.sub || '', r.text, r.note || '')); });
  if (d.note) { A.push(on(el(c, 'a p', d.note, 'left:130px;top:860px;right:130px;color:#f3f3f5'))); hold(d.note); }
  wait(1.5); clear(A); };

// ------------------------------------------------------------------ relation map: shown last
// { title, sources: { key: [name, when, isNow] }, links: [[ [key, relation], ... ] per skeleton question], caption,
//   outs: [[key, topic, relation, color]], outCaption }
export const relationMap = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c), Q = SK.q, n = Q.length, gap = Math.min(360, 1200 / n), QY = 610, QX = Q.map((_, i) => 960 - gap * (n - 1) / 2 + i * gap); at(t0 + 0.5);
  on(el(c, 'a h2', d.title, 'left:100px;top:136px')); wait(1.4);
  const qn = Q.map(([name, s, col], i) => on(node(c, QX[i], QY, name, '', { side: 'below', r: 13, color: col, fs: 38 }), { t: T + i * 0.4, dy: 0 }));
  const keys = Object.keys(d.sources), top = keys.filter((_, i) => i % 2 === 0), bot = keys.filter((_, i) => i % 2 === 1), P = {};
  [[top, 380, 'above'], [bot, 860, 'below']].forEach(([ks, y, side]) => ks.forEach((k, i) => { P[k] = [300 + (ks.length > 1 ? i * (1250 / (ks.length - 1)) : 625), y, side]; }));
  const sn = {}; keys.forEach((k, i) => { const [name, when, now] = d.sources[k], [x, y, side] = P[k]; sn[k] = on(node(c, x, y, name, when, { side, r: 8, color: now ? COL.violet : '#fff', fs: 32 }), { t: T + 2.0 + i * 0.35, dy: 0 }); });
  wait(2.0 + keys.length * 0.35 + 2.0);
  const all = [], steps = d.links.map(ls => 3.0 + ls.length * 0.9 + rt(...ls.map(x => x[1]))), tAll = T + steps.reduce((a, b) => a + b, 0); let ts = T;
  d.links.forEach((ls, qi) => { const te = ts + steps[qi];
    ls.forEach(([k, rel], j) => { const [x, y] = P[k], up = y < QY, x1 = QX[qi], y1 = QY + (up ? -22 : 74);
      const l = line(W, `M${x} ${y + (up ? 18 : -18)} C${x} ${(y + y1) / 2} ${x1} ${(y + y1) / 2} ${x1} ${y1}`, { t: ts + 0.5 + j * 0.9, dur: 0.9, color: Q[qi][2], w: 2.5 }); l.dim.push([te, tAll, 0.16], [tAll, 1e9, 0.5]); all.push(l);
      const [mx, my] = midOf(l, 0.42); label(c, mx + 14, my - 22, rel, ts + 1.2 + j * 0.9, { color: Q[qi][2], out: te - 0.3, fs: 30, bg: 1 }); });
    qn.forEach((r, i) => { if (i !== qi) r.dim.push([ts, te, 0.35]); }); keys.forEach(k => { if (!ls.some(([kk]) => kk === k)) sn[k].dim.push([ts, te, 0.3]); }); ts = te; });
  at(tAll); if (d.caption) { caption(c, d.caption, T, T + rt(d.caption) + 3, 990); wait(rt(d.caption) + 3.5); }
  if (d.outs && d.outs.length) { all.forEach(l => l.dim.push([T, 1e9, 0.35])); const spots = [[1720, 0, 'below'], [1420, 176, 'right'], [190, 520, 'above']];
    d.outs.forEach(([k, name, rel, col], i) => { const [sx, sy] = P[k], t = T + 0.6; let [x, y, side] = spots[i % 3]; if (i % 3 === 0) y = sy;
      line(W, `M${sx + (x > sx ? 20 : -20)} ${sy} C${(sx + x) / 2} ${sy} ${(sx + x) / 2} ${y} ${x + (x > sx ? -22 : 22)} ${y}`, { t, dur: 1.1, color: '#f3f3f5', w: 3, arrow: true });
      on(node(c, x, y, name, `<span class="it" style="color:#f3f3f5">${rel}</span>`, { side, r: 12, color: colour(col), fs: 34, sfs: 28 }), { t: t + 0.8, dy: 0 }); wait(2.5 + rt(name, rel)); });
    if (d.outCaption) { caption(c, d.outCaption, T - 1, undefined, 990); wait(rt(d.outCaption) + 1.5); } }
  wait(1.5); end(T); return T + 0.6;
};

// ------------------------------------------------------------------ recall: cover and fill, then new cases
// { title, lines: ['text with ｛hidden words｝', ...] (one per skeleton question), casesTitle, ask, cases: [[situation, answer, detail]] }
export const recall = (d) => (t0) => {
  const { c, end } = chap(t0), Q = SK.q; at(t0 + 0.5);
  const A = [on(el(c, 'a h1', d.title, 'left:98px;top:150px'))]; wait(1.6);
  const think = 8, tReveal = T + rt(...d.lines) * 0.8 + think, blanks = [];
  d.lines.forEach((s, i) => { const y = 330 + i * 132, col = (Q[i] || [])[2] || '#fff';
    A.push(on(el(c, 'dot', '', `left:150px;top:${y + 18}px;width:20px;height:20px;background:${col}`), { t: T + i * 0.5, dy: 0 }));
    A.push(on(el(c, 'a nw', (Q[i] || [''])[0], `left:196px;top:${y}px;font-size:38px;font-weight:500;color:${col}`), { t: T + i * 0.5, dy: 0 }));
    const e = el(c, 'a nw', s.replace(/｛(.+?)｝/g, (m, w) => `<span class="bk" style="display:inline-block;padding:0 14px;margin:0 6px;border-radius:10px;font-weight:500">${w}</span>`), `left:480px;top:${y - 4}px;font-size:42px`);
    A.push(on(e, { t: T + 0.3 + i * 0.5, read: false })); e.querySelectorAll('.bk').forEach(b => blanks.push([b, tReveal + i * 2.0, col])); });
  fn((t) => blanks.forEach(([b, tr, col]) => { const open = t >= tr; b.style.color = open ? col : 'transparent'; b.style.background = open ? 'transparent' : 'rgba(242,184,75,.16)'; b.style.outline = open ? 'none' : '1.5px dashed #f2b84b'; }));
  ring(c, 1760, 190, tReveal - think, tReveal); at(tReveal + d.lines.length * 2.0 + 4.5); A.forEach(r => off(r));
  if (d.cases && d.cases.length) { on(el(c, 'a h1', d.casesTitle, 'left:98px;top:150px'), { t: T + 0.6 });
    d.cases.forEach(([q, a1, a2], i) => { wait(0.6); const B = [], tq = rt(q) + 1.5;
      B.push(on(el(c, 'a s', `${i + 1} / ${d.cases.length}`, 'left:150px;top:300px;letter-spacing:.14em;color:#6fdc9b'), { dy: 0 })); B.push(on(el(c, 'a h1', q, 'left:150px;top:350px;right:300px;font-size:56px')));
      B.push(on(el(c, 'a p', d.ask, 'left:150px;top:560px;font-size:38px;color:#f2b84b'), { t: T + tq - 1.2 })); ring(c, 1700, 420, T + tq, T + tq + 6);
      B.push(on(el(c, 'a', a1, 'left:150px;top:660px;right:200px;font-size:44px;font-weight:500'), { t: T + tq + 6.2 })); B.push(on(el(c, 'a p', a2, 'left:150px;top:744px;right:200px;font-size:36px;color:#f3f3f5'), { t: T + tq + 6.2 + rt(a1) }));
      wait(tq + 6.2 + rt(a1, a2) + 2.5); B.forEach(r => off(r)); }); }
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ closing: the author's own judgement, what is open, where the questions live
// { lead, left: [who, line], right: [who, line], verdict, openLead, open, openDetail, areas, pick, last, credits }
export const closing = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c); at(t0 + 0.6); const A = [];
  if (d.verdict) { A.push(on(el(c, 'a s', d.lead || '', 'left:0;right:0;top:230px;text-align:center;letter-spacing:.2em'), { dy: 0 }));
    if (d.left) A.push(on(el(c, 'a c', `<div class="s" style="margin-bottom:14px">${d.left[0]}</div><div class="h2">${d.left[1]}</div>`, 'left:140px;width:760px;top:350px'), { t: T + 0.8 }));
    if (d.right) { line(W, 'M960 340 L960 520', { t: T + 2.6, dur: 0.6, color: 'rgba(255,255,255,.2)', w: 1.5, out: T + 99 }).out = T + rt(d.left[1], d.right[1], d.verdict) + 8;
      A.push(on(el(c, 'a c', `<div class="s" style="margin-bottom:14px">${d.right[0]}</div><div class="h2">${d.right[1]}</div>`, 'left:1010px;width:780px;top:350px'), { t: T + 1.6 + rt(d.left[1]) })); }
    A.push(on(el(c, 'a h1 c', `<span class="ul">${d.verdict}</span>`, 'left:0;right:0;top:640px'), { t: T + 3 + rt(d.left ? d.left[1] : '', d.right ? d.right[1] : '') }));
    wait(rt(d.left ? d.left[1] : '', d.right ? d.right[1] : '', d.verdict) + 8); A.forEach(r => off(r)); wait(0.6); }
  if (d.open) { const B = [on(el(c, 'a s', d.openLead || '', 'left:0;right:0;top:300px;text-align:center;letter-spacing:.2em;color:#ff8e72'), { dy: 0 }), on(el(c, 'a h2 c', d.open, 'left:200px;right:200px;top:380px'), { t: T + 0.6 })];
    if (d.openDetail) B.push(on(el(c, 'a p c', d.openDetail, 'left:200px;right:200px;top:520px;font-size:36px;color:#f3f3f5'), { t: T + 1 + rt(d.open) }));
    wait(rt(d.open, d.openDetail || '') + 4); B.forEach(r => off(r)); wait(0.6); }
  if (d.areas) { const n = d.areas.length, gap = Math.min(300, 1400 / n), x0 = 960 - gap * (n - 1) / 2;
    d.areas.forEach(([name, k], i) => { const me = d.pick && i === d.pick.index, r = on(node(c, x0 + i * gap, 440, name, me ? d.pick.done : '', { side: 'below', r: 8 + Math.min(4, parseInt(k) || 1) * 3.5, fs: 34, color: me ? COL.violet : '#fff' }), { t: T + i * 0.2, dy: 0, read: false }); if (!me) r.dim.push([T, 1e9, 0.3]); }); }
  on(el(c, 'a h2 c', d.last, 'left:0;right:0;top:700px'), { t: T + 2.0 });
  if (d.credits) on(el(c, 'a s c', d.credits, 'left:0;right:0;bottom:50px;font-size:22px;letter-spacing:.02em'), { t: T + 4.0, dy: 0, read: false });
  wait(rt(d.last) + 7); end(T); return T + 0.2;
};
