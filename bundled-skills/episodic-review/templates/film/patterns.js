// patterns.js — whole presentations driven by data. Each is chosen for a shape of content (reference/03-presentation.md).
// Chapter-level patterns return (t0) => t1. Beats are used inside chapter({ beats: [...] }) and return (c, W, q) => void:
// c is the chapter's container, W its svg for lines, q the skeleton question of the chapter ([name, sub, colour]) when it has one.
// Timing follows the text: a beat waits as long as its new words need.
// None fits? Write a beat here in the film with engine.js and parts.js (see `spans` for a short one), using hold / clear / colour below.
import { el, on, off, at, wait, T, wire, line, fn, cue, ico, midOf, clamp } from './engine.js';
import { chapter as chap, header, caption, label, node, chat, bubble, box, row, tag, ring, figure as sheet, COL, tw } from './parts.js';
export const PALETTE = [COL.blue, COL.teal, COL.violet, COL.rose, COL.lime];   // one per skeleton question; not green, coral or amber (they mean good, cost, your turn)
export const SK = { q: [] };                                    // the film's skeleton: [[name, sub, colour, inThisFilm]], set by skeleton()
const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s/g, '');
const secs = (x) => { const t = strip(x), wide = (t.match(/[⺀-￯]/g) || []).length; return wide / 5 + (t.length - wide) / 14 + 0.5; };
export const rt = (...s) => s.reduce((a, x) => a + secs(x), 0);                       // seconds the viewer needs for these texts
export const hold = (...s) => wait(Math.max(2.2, rt(...s)));                           // wait long enough to read them
export const colour = (c) => COL[c] || c || COL.ink;                                   // a palette name, or any css colour
export const clear = (list, lines = []) => { list.forEach(r => off(r)); lines.forEach(l => { l.out = T; }); };   // a beat leaves the frame

// ------------------------------------------------------------------ opening: a few points, then one question
// { year, month, count, areasTitle, areas: [[name, n]], pick: { index, line, topic }, history: { title, stops: [[when, title, sub, isNow]], note }, question }
// Every part but month and question is optional. A stop written in this period (isNow) gets a halo; older ones are outlines.
export const opening = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c); at(t0 + 0.8);
  const a = on(el(c, 'a s c', d.year || '', 'left:0;right:0;top:330px;letter-spacing:.5em;font-size:30px'), { dy: 0 }), b = on(el(c, 'a h0 c', d.month, 'left:0;right:0;top:380px'));
  wait(2.4); const s0 = on(el(c, 'a h2 c', d.count, 'left:0;right:0;top:640px;color:#b9bac2;font-weight:400')); hold(d.count); wait(1); [a, b, s0].forEach(r => off(r)); wait(0.5);
  if (d.areas) { const n = d.areas.length, gap = Math.min(300, 1400 / n), x0 = 960 - gap * (n - 1) / 2;
    const hd = on(el(c, 'a h2 c', d.areasTitle, 'left:0;right:0;top:300px'));
    const dots = d.areas.map(([name, k], i) => on(node(c, x0 + i * gap, 540, name, `${k}`, { side: 'below', r: 8 + Math.min(4, parseInt(k) || 1) * 3.5, fs: 34 }), { t: T + 0.4 + i * 0.55, dy: 10 }));
    hold(d.areasTitle, ...d.areas.map(x => x[0])); wait(1.5); off(hd);
    if (d.pick) { const h2 = on(el(c, 'a h2 c', d.pick.line, 'left:0;right:0;top:300px')); dots.forEach((r, i) => { if (i !== d.pick.index) r.dim.push([T, 1e9, 0.22]); });
      const nm = on(el(c, 'a h3 c', d.pick.topic, `left:${x0 + d.pick.index * gap - 250}px;width:500px;top:690px`), { t: T + 1.2 }); hold(d.pick.line, d.pick.topic); wait(1.5); off(h2); off(nm); }
    dots.forEach(r => off(r)); wait(0.6); }
  if (d.history) { const st = d.history.stops, n = st.length, gap = Math.min(380, 1500 / n), x0 = 960 - gap * (n - 1) / 2;
    on(el(c, 'a h2', d.history.title, 'left:140px;top:230px')); line(W, 'M140 560 L1780 560', { t: T + 0.4, dur: 2.0, color: 'rgba(255,255,255,.3)', w: 2 });
    st.forEach(([m, name, sub, now], i) => { const x = x0 + i * gap, t = T + 1.4 + i * 2.4;
      on(el(c, 'dot', '', `left:${x - 8}px;top:552px;width:16px;height:16px;` + (now ? 'background:#fff;box-shadow:0 0 0 7px rgba(255,255,255,.22)' : 'background:#0f0f15;border:2px solid #9a9ca6')), { t, dy: 0 });
      on(el(c, 'a s nw c', m, `left:${x - 150}px;width:300px;top:496px;color:${now ? COL.ink : COL.mute}`), { t, dy: 0 });
      on(el(c, 'a nw c', `<div style="font-size:33px;font-weight:500">${name}</div><div class="s" style="margin-top:8px;font-size:26px">${sub || ''}</div>`, `left:${x - 190}px;width:380px;top:610px`), { t: t + 0.2 }); });
    if (d.history.note) on(el(c, 'a s it', d.history.note, 'right:140px;top:760px;color:#b9bac2'), { t: T + 1.4 + n * 2.4, dy: 0 });
    wait(1.4 + n * 2.4 + 3.5); }
  on(el(c, 'a h1 c', d.question, `left:0;right:0;top:${d.history ? 820 : 440}px;font-size:60px`)); hold(d.question); wait(2.5);
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ skeleton: the questions the topic answers, in order
// { title, questions: [[name, sub]], taken: [indices this film walks] (omit when it walks all), skipNote, note }
// The whole skeleton is always shown: the viewer needs the full map even when a short film walks part of it.
export const skeleton = (d) => (t0) => {
  SK.q = d.questions.map(([n, s], i) => [n, s, PALETTE[i % PALETTE.length], !d.taken || d.taken.includes(i)]);
  const { c, end } = chap(t0), W = wire(c), n = SK.q.length, gap = Math.min(440, 1500 / n), x0 = 960 - gap * (n - 1) / 2, R = SK.q.map(() => []); at(t0 + 0.6);
  on(el(c, 'a h1 c', d.title, 'left:0;right:0;top:230px'));
  SK.q.forEach(([name, sub, col], i) => { const x = x0 + i * gap, t = T + 1.6 + i * 2.7;
    R[i].push(on(el(c, 'a s c', `0${i + 1}`, `left:${x - 100}px;width:200px;top:452px;color:${col};letter-spacing:.2em`), { t, dy: 0 }));
    R[i].push(on(el(c, 'dot', '', `left:${x - 11}px;top:529px;width:22px;height:22px;background:${col}`), { t, dy: 0 }));
    R[i].push(on(el(c, 'a c nw', `<div style="font-size:${tw(name, 50) > gap - 30 ? 38 : 50}px;font-weight:500;letter-spacing:.04em">${name}</div><div class="s" style="margin-top:14px;font-size:27px;color:#b9bac2">${sub}</div>`, `left:${x - gap / 2}px;width:${gap}px;top:590px`), { t: t + 0.15 }));
    if (i < n - 1) line(W, `M${x + 30} 540 L${x + gap - 30} 540`, { t: t + 1.5, dur: 1.0, arrow: true, w: 2 }); });
  wait(1.6 + n * 2.7 + 2.5);
  if (SK.q.some(q => !q[3])) { SK.q.forEach((q, i) => { if (!q[3]) R[i].forEach(r => r.dim.push([T, 1e9, 0.3])); });
    if (d.skipNote) { const r = on(el(c, 'a p c', d.skipNote, 'left:0;right:0;top:770px')); hold(d.skipNote); wait(1.2); if (d.note) off(r); } else wait(2.0); }
  if (d.note) { on(el(c, 'a p c', d.note, 'left:0;right:0;top:820px')); hold(d.note); wait(1.5); }
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ a chapter for one skeleton question: header + beats
// { index (which skeleton question), title, beats: [beat, ...] }
export const chapter = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c), q = SK.q[d.index] || []; at(t0 + 0.5);
  header(c, d.index != null ? `0${d.index + 1}` : '', d.title || q[0] + '？', q[2] || '#fff', T); wait(1.4);
  d.beats.forEach((b, i) => { b(c, W, q); if (i < d.beats.length - 1) wait(0.6); });
  end(T); return T + 0.6;
};

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
// The pieces of a card sit in its flow, so a line that wraps pushes the next one down and the cards stay equally tall.
// Check the still all the same: with three cards and three lines each, about 30 characters per line is what fits above the caption.
export const optionCards = (d) => (c) => { const A = [], n = d.cards.length, w = Math.min(520, (1720 - (n - 1) * 25) / n), x0 = 960 - (n * w + (n - 1) * 25) / 2, y = d.title ? 372 : 290;
  if (d.title) A.push(on(el(c, 'a h2', d.title, 'left:130px;top:284px'))); if (d.setup) A.push(on(el(c, 'a nw', d.setup, 'right:130px;top:290px'), { t: T + 1.0, dy: 0 }));
  wait(d.title ? 2.2 : 0.2);
  const deck = el(c, 'a', '', `left:${x0}px;top:${y}px;display:flex;gap:25px;align-items:stretch`);
  d.cards.forEach((k0, i) => { const col = colour(k0.color), k = el(deck, 'card f', '', `width:${w}px;padding:26px 24px 24px 30px`); A.push(on(k));
    if (k0.art) el(k, 'f', k0.art, 'height:150px;margin-bottom:10px');
    on(el(k, 'f', `<div style="font-size:${tw(k0.name, 52) > w - 60 ? 36 : 52}px;font-weight:500;color:${col};line-height:1.2">${k0.name}</div><div class="s" style="margin-top:4px;font-size:25px">${k0.sub || ''}</div>`), { t: T + 0.4, dy: 0 });
    let tt = 1.5; k0.lines.forEach(([lab, text, lc]) => { on(el(k, 'f', (lab ? `<div class="s" style="color:${colour(lc || 'mute')};letter-spacing:.14em;font-size:24px">${lab}</div>` : '') + `<div style="font-size:29px;line-height:1.45;margin-top:2px;color:${lc && lc !== 'green' && lc !== 'coral' ? colour(lc) : '#f3f3f5'}">${text}</div>`, 'margin-top:20px'), { t: T + tt }); tt += rt(text) * 0.7 + 0.6; });
    if (k0.src) on(el(k, 'f s it', k0.src, 'margin-top:22px;font-size:24px'), { t: T + tt, dy: 0 });
    wait(tt + 1.2); });
  const cp = d.caption && caption(c, d.caption, T, undefined, 944); if (d.sub) A.push(on(el(c, 'a s nw', d.sub, 'left:820px;top:1012px;font-size:26px'), { t: T + 2.6, dy: 0 }));
  if (cp) hold(d.caption, d.sub || ''); wait(1.5); clear(cp ? [...A, cp] : A); };

// beat: a choice, asked one question after another, each with where a yes leads
// { title, questions: [{ q, ex, yes, to, why, color }], extra: { lead, q, ex, a: [[label, text, color]] }, caption }
// extra is a boxed question that sits apart from the ladder (an exception, a tie-break). caption states the point; use one or the other.
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
  const cp = !d.extra && d.caption && caption(c, d.caption, T, undefined, 900); if (cp) hold(d.caption);
  wait(2.0); clear(cp ? [...A, cp] : A, L); };

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

// beat: things placed on two axes (a positioning, a trade-off), then where the author stands and where they are heading
// { title, x: [low, high], y: [low, high], items: [{ name, sub, x, y, r, color }], zone: { from: [x, y], to: [x, y], text, color },
//   target: { name, sub, x, y, toward: [x, y], via }, caption }      positions are 0..1 on each axis, y upward
export const axisMap = (d) => (c, W, q) => { const A = [], L = [], X0 = 250, X1 = 1390, Y0 = 390, Y1 = 850, px = (u) => X0 + u * (X1 - X0), py = (v) => Y1 - v * (Y1 - Y0);
  if (d.title) A.push(on(el(c, 'a h2', d.title, 'left:130px;top:284px')));
  L.push(line(W, `M${X0} ${Y1} L${X1} ${Y1}`, { t: T + 0.6, dur: 1.2, w: 2 })); L.push(line(W, `M${X0} ${Y1} L${X0} ${Y0}`, { t: T + 0.6, dur: 1.2, w: 2 }));
  A.push(on(el(c, 'a s nw', d.x[0], `left:${X0}px;top:${Y1 + 14}px`), { t: T + 1.6, dy: 0 })); A.push(on(el(c, 'a s nw', d.x[1], `right:${1920 - X1}px;top:${Y1 + 14}px`), { t: T + 1.9, dy: 0 }));
  A.push(on(el(c, 'a s nw', d.y[0], `right:${1920 - X0 + 18}px;top:${Y1 - 44}px`), { t: T + 2.2, dy: 0 })); A.push(on(el(c, 'a s nw', d.y[1], `right:${1920 - X0 + 18}px;top:${Y0 + 4}px`), { t: T + 2.5, dy: 0 }));
  wait(2.5 + rt(d.title || '', ...d.x, ...d.y) * 0.7);
  if (d.zone) { const z = d.zone, col = colour(z.color || 'coral'), l = px(Math.min(z.from[0], z.to[0])), r = px(Math.max(z.from[0], z.to[0])), t = py(Math.max(z.from[1], z.to[1])), b = py(Math.min(z.from[1], z.to[1]));
    A.push(on(el(c, 'a', '', `left:${l}px;top:${t}px;width:${r - l}px;height:${b - t}px;background:${col}1a;border:1.5px dashed ${col}99;border-radius:10px`), { dy: 0, read: false }));
    A.push(on(el(c, 'a s nw', z.text, `left:${l + 22}px;top:${t + 12}px;color:${col}`), { t: T + 0.5, dy: 0 })); wait(0.5 + rt(z.text) + 1.0); }
  d.items.forEach((it) => { const x = px(it.x), y = py(it.y), col = colour(it.color), r = it.r || 26;
    A.push(on(el(c, 'a', '', `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;border:2px solid ${col};background:${col}30`), { dy: 0, sc: 0.2 }));
    A.push(on(el(c, 'a nw', `<div style="font-size:34px;font-weight:500;color:${col}">${it.name}</div><div class="s" style="margin-top:4px;color:#b9bac2">${it.sub || ''}</div>`, `left:${x + r + 18}px;top:${y - 40}px`), { t: T + 0.5 }));
    wait(0.5 + rt(it.name, it.sub || '') + 0.8); });
  if (d.target) { const g = d.target, x = px(g.x), y = py(g.y), col = (q && q[2]) || COL.ink;
    A.push(on(el(c, 'a', '', `left:${x - 14}px;top:${y - 14}px;width:28px;height:28px;border-radius:50%;background:${col};box-shadow:0 0 0 8px ${col}33`), { dy: 0 }));
    A.push(on(el(c, 'a nw', `<span style="font-size:34px;font-weight:500;color:${col}">${g.name}</span><span class="s" style="margin-left:16px;color:#b9bac2">${g.sub || ''}</span>`, `left:${x - 34}px;top:${y - 78}px`), { t: T + 0.4 }));
    wait(0.4 + rt(g.name, g.sub || '') + 0.6);
    if (g.toward) { const tx = px(g.toward[0]), ty = py(g.toward[1]); L.push(line(W, `M${x} ${y} C${(x + tx) / 2} ${y} ${tx} ${(y + ty) / 2} ${tx} ${ty}`, { dash: '3 10', color: col, w: 2.5, arrow: true }));
      if (g.via) { A.push(on(el(c, 'a s it nw', g.via, `left:${Math.min(tx, x) + Math.abs(tx - x) / 2 + 24}px;top:${(y + ty) / 2 - 16}px;color:${col};background:#0f0f15;padding:2px 12px;border-radius:10px`), { t: T + 0.5, dy: 0 })); wait(0.5 + rt(g.via)); } wait(1.0); } }
  const cp = d.caption && caption(c, d.caption, T, undefined, 936); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A, L); };

// beat: spans on a time axis (a plan, phases, what ran when), with one marker for the moment that decides something
// { title, last (length of the axis in its unit), ticks: [[position, text]], rows: [{ name, sub, from, to, text, see, color }], mark: [position, text], caption }
// A row with from === to is a single moment and is drawn as a dot.
export const spans = (d) => (c, W, q) => { const A = [], L = [], X0 = 560, X1 = 1700, u = (X1 - X0) / d.last, YA = d.title ? 420 : 356, Y0 = YA + 40, gap = Math.min(112, (860 - Y0) / d.rows.length), base = (q && q[2]) || COL.slate;
  if (d.title) A.push(on(el(c, 'a h2', d.title, 'left:130px;top:284px')));
  L.push(line(W, `M${X0} ${YA} L${X1} ${YA}`, { dur: 1.2, w: 2 }));
  d.ticks.forEach(([p, s], i) => { const x = X0 + p * u; L.push(line(W, `M${x} ${YA - 8} L${x} ${YA + 8}`, { t: T + 0.4 + i * 0.2, dur: 0.3, w: 2 })); A.push(on(el(c, 'a s nw c', s, `left:${x - 100}px;width:200px;top:${YA - 52}px`), { t: T + 0.4 + i * 0.2, dy: 0 })); });
  wait(1.8);
  d.rows.forEach((r, i) => { const y = Y0 + i * gap, x = X0 + r.from * u, w = (r.to - r.from) * u, col = r.color ? colour(r.color) : base;
    A.push(on(el(c, 'a nw', `<span style="font-size:38px;font-weight:500">${r.name}</span><span class="s" style="margin-left:18px">${r.sub || ''}</span>`, `left:130px;top:${y + 2}px`)));
    const fits = tw(r.text || '', 29) + 44 <= w;                    // a short span cannot hold its words: they go beside it
    if (w > 0) { A.push(on(el(c, 'a nw', fits ? r.text || '' : '', `left:${x}px;top:${y}px;width:${w}px;height:56px;line-height:54px;padding-left:22px;border-radius:14px;border:1.5px solid ${col};background:${col}1f;font-size:29px`), { t: T + 0.7, dy: 0, dx: -24 }));
      if (!fits && r.text) A.push(on(el(c, 'a nw', r.text, `left:${x + w + 18}px;top:${y + 6}px;font-size:29px`), { t: T + 0.9, dy: 0 })); }
    else { A.push(on(el(c, 'dot', '', `left:${x - 10}px;top:${y + 18}px;width:20px;height:20px;background:${col}`), { t: T + 0.7, dy: 0 })); A.push(on(el(c, 'a nw', r.text || '', `left:${x + 26}px;top:${y + 6}px;font-size:29px`), { t: T + 0.9, dy: 0 })); }
    if (r.see) A.push(on(el(c, 'a s nw', r.see, `left:${x + (w > 0 && fits ? 24 : w + 18)}px;top:${y + 60}px;font-size:25px;color:#b9bac2`), { t: T + 1.6 }));
    wait(1.6 + rt(r.name, r.sub || '', r.text || '', r.see || '')); });
  if (d.mark) { const x = X0 + d.mark[0] * u; L.push(line(W, `M${x} ${YA} L${x} ${Y0 + d.rows.length * gap - 16}`, { dur: 0.9, color: COL.amber, w: 3 }));
    A.push(on(el(c, 'a nw', d.mark[1], `left:${x + 16}px;top:${Y0 + d.rows.length * gap - 30}px;font-size:32px;font-weight:500;color:${COL.amber}`), { t: T + 0.5, dy: 0 })); wait(0.5 + rt(d.mark[1]) + 1.2); }
  const cp = d.caption && caption(c, d.caption, T, undefined, 936); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A, L); };

// beat: a figure the notes already contain, with the places worth looking at pointed out one at a time
// { title, src (image in the project folder, e.g. 'figs/plan.png'), w, h (size of the sheet; default 1000 x 560), dark (a dark figure: no light sheet),
//   points: [{ at: [u, v] (0..1 on the figure; omit for a remark with no place), label, text, color }], caption }
export const figure = (d) => (c) => { const A = [], w = d.w || 1000, h = d.h || 560, x = 130, y = d.title ? 372 : 300, pts = d.points || [];
  if (d.title) A.push(on(el(c, 'a h2', d.title, 'left:130px;top:284px')));
  const k = sheet(c, x, y, w, h, d.src, pts.filter(p => p.at).map(p => [p.at[0], p.at[1], p.label, colour(p.color || 'amber')]), { dark: d.dark }); A.push(on(k, { t: T + 0.4, read: false }));
  wait(2.4); let m = 0, yy = y + 6;
  pts.forEach((p) => { const col = colour(p.color || 'amber'); if (p.at) A.push(on(k.marks[m++], { dy: 0, sc: 0.3, read: false }));
    const e = el(c, 'a', `<div class="s" style="color:${col};letter-spacing:.1em">${p.label}</div><div style="font-size:33px;line-height:1.45;margin-top:4px">${p.text}</div>`, `left:${x + w + 50}px;top:${yy}px;right:110px`);
    A.push(on(e, { t: T + 0.3 })); yy += 62 + Math.ceil(tw(p.text, 33) / (1920 - 110 - x - w - 50)) * 48 + 26; wait(0.3 + rt(p.label, p.text) + 0.8); });
  const cp = d.caption && caption(c, d.caption, T, undefined, y + h + 30 > 920 ? 990 : 944); if (cp) hold(d.caption); wait(1.5); clear(cp ? [...A, cp] : A); };

// ------------------------------------------------------------------ relation map: shown last
// { title, legend, sources: { key: [name, when, isNow] }, links: [[ [key, relation], ... ] per skeleton question ([] for one this film did not walk)],
//   caption, outs: [[key, topic, relation, color, [x, y]?]], outCaption }
// Sources sit in two rows around the skeleton; one question lights up at a time with the notes that answered it. A source written in this
// period has a halo, older ones are outlines (say so in `legend`). Up to eight sources read well; group the rest under their hub note.
// outs are links to other topics: each leaves its source along the gap beside the skeleton and ends in a column at the right, name and
// relation beside its dot (the relation wraps: about twenty characters fit). Two from the upper row and two from the lower row have a place;
// beyond that give [x, y] yourself, or show fewer.
export const relationMap = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c), Q = SK.q, n = Q.length, gap = Math.min(360, 1200 / n), QY = 610, QX = Q.map((_, i) => 960 - gap * (n - 1) / 2 + i * gap); at(t0 + 0.5);
  on(el(c, 'a h2', d.title, 'left:100px;top:136px')); if (d.legend) on(el(c, 'a s nw', d.legend, 'right:100px;top:150px'), { t: T + 2.4, dy: 0 }); wait(1.4);
  const qn = Q.map(([name, s, col, inFilm], i) => { const r = on(node(c, QX[i], QY, name, '', { side: 'below', r: 13, color: col, fs: tw(name, 38) > gap - 24 ? 30 : 38 }), { t: T + i * 0.4, dy: 0 }); if (!inFilm) r.dim.push([T, 1e9, 0.3]); return r; });
  const keys = Object.keys(d.sources), top = keys.filter((_, i) => i % 2 === 0), bot = keys.filter((_, i) => i % 2 === 1), P = {};
  [[top, 380, 'above'], [bot, 860, 'below']].forEach(([ks, y, side]) => ks.forEach((k, i) => { P[k] = [300 + (ks.length > 1 ? i * (1250 / (ks.length - 1)) : 625), y, side]; }));
  const sn = {}; keys.forEach((k, i) => { const [name, when, now] = d.sources[k], [x, y, side] = P[k]; sn[k] = on(node(c, x, y, name, when, { side, r: 9, mark: now ? 'ring' : 'hollow', color: now ? '#fff' : '#9a9ca6', fs: 32 }), { t: T + 2.0 + i * 0.35, dy: 0 }); });
  wait(2.0 + keys.length * 0.35 + 2.0);
  const all = [], steps = d.links.map(ls => ls.length ? 3.0 + ls.length * 0.9 + rt(...ls.map(x => x[1])) : 0), tAll = T + steps.reduce((a, b) => a + b, 0); let ts = T;
  d.links.forEach((ls, qi) => { if (!ls.length) return; const te = ts + steps[qi], placed = [];
    ls.forEach(([k, rel], j) => { const [x, y] = P[k], up = y < QY, x1 = QX[qi], y1 = QY + (up ? -22 : 74);
      const l = line(W, `M${x} ${y + (up ? 18 : -18)} C${x} ${(y + y1) / 2} ${x1} ${(y + y1) / 2} ${x1} ${y1}`, { t: ts + 0.5 + j * 0.9, dur: 0.9, color: Q[qi][2], w: 2.5 }); l.dim.push([te, tAll, 0.16], [tAll, 1e9, 0.5]); all.push(l);
      // the relation sits near its source, where the lines of one question are furthest apart; it steps aside when another is already there
      const [mx, my] = midOf(l, 0.27), wd = tw(rel, 30) + 30; let lx = mx + 16, ly = my - 22; if (lx + wd > 1890) lx = mx - 16 - wd;
      while (placed.some(([a, b, w2]) => Math.abs(b - ly) < 46 && lx < a + w2 && a < lx + wd)) ly += up ? 48 : -48;
      placed.push([lx, ly, wd]); label(c, lx, ly, rel, ts + 1.2 + j * 0.9, { color: Q[qi][2], out: te - 0.3, fs: 30, bg: 1 }); });
    qn.forEach((r, i) => { if (i !== qi) r.dim.push([ts, te, 0.35]); }); keys.forEach(k => { if (!ls.some(([kk]) => kk === k)) sn[k].dim.push([ts, te, 0.3]); }); ts = te; });
  at(tAll); if (d.caption) { caption(c, d.caption, T, T + rt(d.caption) + 3, 990); wait(rt(d.caption) + 3.5); }
  if (d.outs && d.outs.length) { all.forEach(l => l.dim.push([T, 1e9, 0.3])); const used = {}, X = 1610, XV = X - 34;
    d.outs.forEach(([k, name, rel, col, pos]) => { const [sx, sy] = P[k], t = T + 0.6, dir = sy < QY ? 1 : -1, m = used[dir] = (used[dir] || 0) + 1, yc = sy + dir * (46 + (m - 1) * 16);
      let x = X, y = dir > 0 ? yc + (m - 1) * 104 : 778 - (m - 1) * 120, path; if (pos) [x, y] = pos;
      const v = Math.sign(y - yc);
      if (pos || sx > XV - 60) path = `M${sx} ${sy + dir * 18} C${sx} ${y} ${x - 60} ${y} ${x - 22} ${y}`;                      // close by, or placed by hand: one curve
      else path = `M${sx} ${sy + dir * 18} Q${sx} ${yc} ${sx + 30} ${yc} ` + (Math.abs(y - yc) < 4 ? `L${x - 22} ${yc}` : `L${XV - 20} ${yc} Q${XV} ${yc} ${XV} ${yc + v * 20} L${XV} ${y - v * 14} Q${XV} ${y} ${x - 22} ${y}`);
      line(W, path, { t, dur: 1.1, color: '#f3f3f5', w: 3, arrow: true });
      on(el(c, 'dot', '', `left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;background:${colour(col)}`), { t: t + 0.8, dy: 0 });
      on(el(c, 'a', `<div style="font-size:32px;font-weight:500;line-height:1.25">${name}</div><div class="it" style="margin-top:4px;font-size:25px;line-height:1.35;color:#f3f3f5;text-wrap:balance">${rel}</div>`, `left:${x + 26}px;top:${y - 22}px;width:${Math.min(270, 1900 - x - 26)}px`), { t: t + 0.8, dy: 0 });
      wait(2.5 + rt(name, rel)); });
    if (d.outCaption) { caption(c, d.outCaption, T - 1, undefined, 990); wait(rt(d.outCaption) + 1.5); } }
  wait(1.5); end(T); return T + 0.6;
};

// ------------------------------------------------------------------ month map: the topics of a period and the links between them
// { title, areas: [{ name, topics: [[id, name], ...] }], links: [[idA, idB, sentence]], shared: [[idA, idB, sentence]], alone, caption }
// For a film about the whole period, one level above a topic film. Topics sit on two arcs, names on the outside, so a link never crosses
// a name. One area arrives at a time (its colour stays in the legend), then one link at a time with the sentence that states it, then
// the topics that stand alone. `links` come from scripts/topic_links.py; each sentence is written from what the linking note says.
// `shared` is a note that belongs to two topics (drawn dashed). About nine topics per side read well; beyond that, split by area.
export const monthMap = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c), cols = [...PALETTE, COL.sand, COL.slate], CX = 960, CY = 580, RX = 500, RY = 330, PHI = 62 * Math.PI / 180; at(t0 + 0.5);
  on(el(c, 'a h2', d.title, 'left:100px;top:136px')); wait(1.6);
  const all = d.areas.flatMap((a, ai) => a.topics.map(([id, name]) => ({ id, name, ai }))), half = Math.ceil(all.length / 2), P = {}, R = {};
  // keep an area together on one side when that is possible
  let cut = half, acc = 0; for (const a of d.areas) { if (acc + a.topics.length > half) { cut = (half - acc) * 2 >= a.topics.length ? acc + a.topics.length : acc; break; } acc += a.topics.length; cut = acc; }
  if (cut === 0 || cut === all.length) cut = half;
  const fs = Math.max(cut, all.length - cut) > 9 ? 25 : 30;
  [all.slice(0, cut), all.slice(cut)].forEach((side, si) => side.forEach((tp, i) => { const ph = Math.min(PHI, (side.length - 1) * 0.2), a = side.length > 1 ? -ph + 2 * ph * i / (side.length - 1) : 0;   // a short side stays near the middle
    P[tp.id] = [CX + (si ? 1 : -1) * RX * Math.cos(a), CY + RY * Math.sin(a), si]; }));
  d.areas.forEach((a, ai) => { const col = cols[ai % cols.length];
    on(el(c, 'a nw', `<i style="display:inline-block;width:14px;height:14px;border-radius:7px;margin-right:10px;background:${col}"></i>${a.name}`, `right:${100 + (d.areas.length - 1 - ai) * 0}px;top:${150 + ai * 40}px;font-size:26px;font-weight:300;letter-spacing:.06em;color:#b9bac2`), { dy: 0 });
    a.topics.forEach(([id, name], i) => { const [x, y, si] = P[id];
      R[id] = on(el(c, 'a', `<i style="position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:9px;background:${col}"></i><div class="nw" style="position:absolute;${si ? 'left:24px' : 'right:24px'};top:${-fs * 0.72}px;font-size:${fs}px;font-weight:500;letter-spacing:.03em">${name}</div>`, `left:${x}px;top:${y}px`), { t: T + 0.5 + i * 0.5, dy: 0 }); });
    wait(0.5 + a.topics.length * 0.5 + rt(a.name, ...a.topics.map(x => x[1])) * 0.5 + 0.6); });
  wait(1.5);
  const say = (text, t, out) => on(el(c, 'a h2 c', text, 'left:170px;right:170px;top:922px;font-size:40px'), { t, out });   // two lines fit under the arcs
  const chord = (a, b) => { const [x1, y1, s1] = P[a], [x2, y2, s2] = P[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = s1 === s2 ? 0.75 : 0.35;
    return `M${x1 + (s1 ? -14 : 14)} ${y1} Q${mx + (CX - mx) * k} ${my + (CY - my) * k} ${x2 + (s2 ? -14 : 14)} ${y2}`; };
  const linked = new Set(), L = [];
  const show = (list, dash) => list.forEach(([a, b, text]) => { if (!P[a] || !P[b]) return; linked.add(a); linked.add(b); const need = rt(text) + 2.2, te = T + 1.0 + need;
    const l = line(W, chord(a, b), { t: T + 0.3, dur: 1.0, color: '#f3f3f5', w: 2.5, dash }); l.dim.push([te, 1e9, 0.3]); L.push(l);
    Object.keys(R).forEach(id => { if (id !== a && id !== b) R[id].dim.push([T, te, 0.28]); }); L.slice(0, -1).forEach(o => o.dim.push([T, te, 0.4]));
    say(text, T + 1.0, te - 0.3); at(te + 0.5); });
  show(d.links || []); show(d.shared || [], '3 9');
  const lone = Object.keys(R).filter(id => !linked.has(id));
  if (lone.length && d.alone) { const te = T + rt(d.alone) + 3.5; Object.keys(R).forEach(id => { if (!lone.includes(id)) R[id].dim.push([T, te, 0.28]); });
    lone.forEach((id, i) => { const [x, y] = P[id]; on(el(c, 'a', '', `left:${x - 17}px;top:${y - 17}px;width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.7)`), { t: T + 0.3 + i * 0.25, out: te, dy: 0, sc: 0.3 }); });
    say(d.alone, T + 0.8, te - 0.3); at(te + 0.5); }
  if (d.caption) { say(d.caption, T); hold(d.caption); wait(2.0); }
  wait(1.0); end(T); return T + 0.6;
};

// ------------------------------------------------------------------ recall: cover and fill, then new cases
// { title, clue, lines: ['text with ｛hidden words｝' | [skeleton index, text], ...], casesTitle, ask, cases: [[situation, answer, detail, clue, label]] }
// Without `lines` only the cases run: a month film asks one quick question per topic that way (label = the topic's name).
// A plain string takes the skeleton question at its own position; give [index, text] when the film walked only some questions.
// A clue is something that was there at learning (the pack's `quick.clue`): shown before the wait, it must not contain the answer.
export const recall = (d) => (t0) => {
  const { c, end } = chap(t0), Q = SK.q; at(t0 + 0.5);
  const A = [], rows = (d.lines || []).map((x, i) => Array.isArray(x) ? x : [i, x]), y0 = d.clue ? 372 : 330;
  if (rows.length) { A.push(on(el(c, 'a h1', d.title, 'left:98px;top:150px'))); wait(1.6);
  if (d.clue) A.push(on(el(c, 'a nw', d.clue, 'left:150px;top:268px;font-size:32px;color:#b9bac2'), { dy: 0 }));
  const think = 8, tReveal = T + rt(d.clue || '', ...rows.map(r => r[1])) * 0.8 + think, blanks = [];
  rows.forEach(([qi, s], i) => { const y = y0 + i * 132, q = Q[qi] || [], col = q[2] || '#fff';
    A.push(on(el(c, 'dot', '', `left:150px;top:${y + 18}px;width:20px;height:20px;background:${col}`), { t: T + i * 0.5, dy: 0 }));
    A.push(on(el(c, 'a nw', q[0] || '', `left:196px;top:${y}px;font-size:${tw(q[0] || '', 38) > 250 ? 28 : 38}px;font-weight:500;color:${col}`), { t: T + i * 0.5, dy: 0 }));
    const e = el(c, 'a nw', s.replace(/｛(.+?)｝/g, (m, w) => `<span class="bk" style="display:inline-block;padding:0 14px;margin:0 6px;border-radius:10px;font-weight:500">${w}</span>`), `left:480px;top:${y - 4}px;font-size:${tw(s, 42) > 1330 ? 34 : 42}px`);
    A.push(on(e, { t: T + 0.3 + i * 0.5, read: false })); e.querySelectorAll('.bk').forEach(b => blanks.push([b, tReveal + i * 2.0, col])); });
  fn((t) => blanks.forEach(([b, tr, col]) => { const open = t >= tr; b.style.color = open ? col : 'transparent'; b.style.background = open ? 'transparent' : 'rgba(242,184,75,.16)'; b.style.outline = open ? 'none' : '1.5px dashed #f2b84b'; }));
  ring(c, 1760, 190, tReveal - think, tReveal); cue('recall', tReveal - think, tReveal); at(tReveal + rows.length * 2.0 + 4.5); A.forEach(r => off(r)); }
  if (d.cases && d.cases.length) { on(el(c, 'a h1', d.casesTitle, 'left:98px;top:150px'), { t: T + 0.6 });
    d.cases.forEach(([q, a1, a2, clue, lab], i) => { wait(0.6); const B = [], tq = rt(q, clue || '') + 1.5;
      B.push(on(el(c, 'a s nw', `${i + 1} / ${d.cases.length}` + (lab ? `<span style="margin-left:24px;color:#f3f3f5;letter-spacing:.06em">${lab}</span>` : ''), 'left:150px;top:300px;letter-spacing:.14em;color:#6fdc9b'), { dy: 0 })); B.push(on(el(c, 'a h1', q, 'left:150px;top:350px;right:300px;font-size:56px')));
      if (clue) B.push(on(el(c, 'a nw', clue, 'left:150px;top:520px;font-size:30px;color:#b9bac2'), { t: T + rt(q) * 0.6, dy: 0 }));
      B.push(on(el(c, 'a p', d.ask, `left:150px;top:${clue ? 580 : 560}px;font-size:38px;color:#f2b84b`), { t: T + tq - 1.2 })); ring(c, 1700, 420, T + tq, T + tq + 6); cue('recall', T + tq, T + tq + 6);
      B.push(on(el(c, 'a', a1, 'left:150px;top:660px;right:200px;font-size:44px;font-weight:500'), { t: T + tq + 6.2 })); B.push(on(el(c, 'a p', a2 || '', 'left:150px;top:744px;right:200px;font-size:36px;color:#f3f3f5'), { t: T + tq + 6.2 + rt(a1) }));
      wait(tq + 6.2 + rt(a1, a2 || '') + 2.5); B.forEach(r => off(r)); }); }
  end(T); return T + 0.6;
};

// ------------------------------------------------------------------ closing: the author's own judgement, what is open, where the questions live
// { lead, left: [who, line], right: [who, line], verdict, openLead, open, openDetail, areas, pick: { index, done }, last, credits }
// Every part but `last` is optional: a topic with no stated judgement skips the verdict, one with nothing open skips `open`.
export const closing = (d) => (t0) => {
  const { c, end } = chap(t0), W = wire(c); at(t0 + 0.6); const A = [];
  if (d.verdict) { const two = d.left || d.right, vy = two ? 640 : 470; A.push(on(el(c, 'a s', d.lead || '', `left:0;right:0;top:${two ? 230 : 380}px;text-align:center;letter-spacing:.2em`), { dy: 0 }));
    if (d.left) A.push(on(el(c, 'a c', `<div class="s" style="margin-bottom:14px">${d.left[0]}</div><div class="h2">${d.left[1]}</div>`, 'left:140px;width:760px;top:350px'), { t: T + 0.8 }));
    if (d.right) { line(W, 'M960 340 L960 520', { t: T + 2.6, dur: 0.6, color: 'rgba(255,255,255,.2)', w: 1.5 }).out = T + rt(d.left ? d.left[1] : '', d.right[1], d.verdict) + 8;
      A.push(on(el(c, 'a c', `<div class="s" style="margin-bottom:14px">${d.right[0]}</div><div class="h2">${d.right[1]}</div>`, 'left:1010px;width:780px;top:350px'), { t: T + 1.6 + rt(d.left ? d.left[1] : '') })); }
    A.push(on(el(c, 'a h1 c', `<span class="ul">${d.verdict}</span>`, `left:120px;right:120px;top:${vy}px`), { t: T + (two ? 3 : 1) + rt(d.left ? d.left[1] : '', d.right ? d.right[1] : '') }));
    wait(rt(d.left ? d.left[1] : '', d.right ? d.right[1] : '', d.verdict) + (two ? 8 : 5)); A.forEach(r => off(r)); wait(0.6); }
  if (d.open) { const B = [on(el(c, 'a s', d.openLead || '', 'left:0;right:0;top:380px;text-align:center;letter-spacing:.2em;color:#ff8e72'), { dy: 0 }), on(el(c, 'a h2 c', d.open, 'left:200px;right:200px;top:450px'), { t: T + 0.6 })];
    if (d.openDetail) B.push(on(el(c, 'a p c', d.openDetail, 'left:200px;right:200px;top:600px;font-size:36px;color:#f3f3f5'), { t: T + 1 + rt(d.open) }));
    wait(rt(d.open, d.openDetail || '') + 4); B.forEach(r => off(r)); wait(0.6); }
  if (d.areas) { const n = d.areas.length, gap = Math.min(300, 1400 / n), x0 = 960 - gap * (n - 1) / 2;
    d.areas.forEach(([name, k], i) => { const me = d.pick && i === d.pick.index, r = on(node(c, x0 + i * gap, 440, name, me ? d.pick.done : '', { side: 'below', r: 8 + Math.min(4, parseInt(k) || 1) * 3.5, fs: 34, mark: me ? 'ring' : '' }), { t: T + i * 0.2, dy: 0, read: false }); if (!me) r.dim.push([T, 1e9, 0.3]); }); }
  on(el(c, 'a h2 c', d.last, `left:120px;right:120px;top:${d.areas ? 700 : 500}px`), { t: T + 2.0 });
  if (d.credits) on(el(c, 'a s c', d.credits, 'left:0;right:0;bottom:50px;font-size:22px;letter-spacing:.02em'), { t: T + 4.0, dy: 0, read: false });
  wait(rt(d.last) + 7); end(T); return T + 0.2;
};
