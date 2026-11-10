// Page runtime: draws a Deep Dive from window.__SPEC__ and window.__LIVE__. No coordinates come from
// the spec. Every position is computed here, so an authored page cannot produce a broken layout.
(function () {
  var S = window.__SPEC__, L = window.__LIVE__ || { notes: {} };
  function T(zh, en) { return L.lang === "en" ? en : zh; }
  var SVG = "http://www.w3.org/2000/svg";
  var root = document.querySelector(".eq"), NARROW = root.clientWidth < 520, FIT = root.clientWidth - 32;
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") e.textContent = attrs[k]; else if (k === "on") e.addEventListener("click", attrs[k]); else if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function s(tag, attrs, kids) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs || {}) { if (k === "text") e.textContent = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function width(t, size) { var w = 0; for (var i = 0; i < t.length; i++) w += t.charCodeAt(i) > 0x2e7f ? size : size * 0.58; return w; }
  function wrap(t, max, size) {
    if (width(t, size) <= max) return [t];
    var lines = [""], tokens = [];
    (t.match(/[A-Za-z0-9_.\-\/+#]+|\s+|./g) || [t]).forEach(function (tk) {
      // A single word wider than the box has to break, or it would overrun the box.
      var cur = "";
      if (width(tk, size) <= max) { tokens.push(tk); return; }
      for (var i = 0; i < tk.length; i++) { if (cur && width(cur + tk[i], size) > max) { tokens.push(cur); cur = ""; } cur += tk[i]; }
      tokens.push(cur);
    });
    tokens.forEach(function (tk) {
      var l = lines[lines.length - 1];
      if (width(l + tk, size) > max && l) { lines.push(tk.trim()); } else lines[lines.length - 1] = l + tk;
    });
    return lines;
  }
  function label(x, y, text, max, cls, size) {
    var lines = wrap(text, max, size), lh = size * 1.25, y0 = y - (lines.length - 1) * lh / 2;
    return s("text", { class: "tx " + (cls || "") }, lines.map(function (l, i) { return s("tspan", { x: x, y: y0 + i * lh, text: l }); }));
  }
  function noteBtn(name, cls) {
    var info = L.notes[name] || {};
    return h("button", { type: "button", class: "lk " + (info.exists ? "" : "un ") + (cls || ""), "data-note": name, text: name });
  }

  // ---- card text ----------------------------------------------------------------------------------
  // The owner's Markdown, built as DOM nodes so nothing inside it can run.
  function inline(t, parent) {
    var re = /\*\*[^*]+\*\*|\*[^*\s][^*]*\*|==[^=]+==|`[^`]+`|\[\[[^\]]+\]\]/g, at = 0, m;
    while ((m = re.exec(t))) {
      if (m.index > at) parent.appendChild(document.createTextNode(t.slice(at, m.index)));
      var k = m[0];
      if (k.slice(0, 2) === "**") parent.appendChild(inline(k.slice(2, -2), h("strong")));
      else if (k[0] === "*") parent.appendChild(inline(k.slice(1, -1), h("em")));
      else if (k[0] === "=") parent.appendChild(inline(k.slice(2, -2), h("mark")));
      else if (k[0] === "`") parent.appendChild(h("code", { text: k.slice(1, -1) }));
      else parent.appendChild(document.createTextNode(k.slice(2, -2).split("|").pop()));
      at = m.index + k.length;
    }
    if (at < t.length) parent.appendChild(document.createTextNode(t.slice(at)));
    return parent;
  }
  function markdown(src) {
    var out = h("div", { class: "md" }), lines = src.split("\n"), i = 0;
    var ROW = /^\s*\|.*\|\s*$/, RULE = /^\s*\|[\s:|-]+\|\s*$/, ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/, QUOTE = /^>\s?/, HEAD = /^#{1,6}\s+(.*)$/, FENCE = /^```/, HR = /^(-{3,}|\*{3,})\s*$/;
    function cells(l) { return l.trim().slice(1, -1).split("|").map(function (c) { return c.trim(); }); }
    function row(l, tag) { return h("tr", {}, cells(l).map(function (c) { return inline(c, h(tag)); })); }
    function startsBlock(l) { return !l.trim() || ITEM.test(l) || QUOTE.test(l) || HEAD.test(l) || FENCE.test(l) || HR.test(l) || ROW.test(l); }
    while (i < lines.length) {
      var l = lines[i], m;
      if (!l.trim()) { i++; }
      else if (FENCE.test(l)) { var code = []; i++; while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]); i++; out.appendChild(h("pre", {}, [h("code", { text: code.join("\n") })])); }
      else if (ROW.test(l) && RULE.test(lines[i + 1] || "")) {
        var head = l, body = []; i += 2; while (i < lines.length && ROW.test(lines[i])) body.push(row(lines[i++], "td"));
        out.appendChild(h("div", { class: "tw" }, [h("table", {}, [h("thead", {}, [row(head, "th")]), h("tbody", {}, body)])]));
      }
      else if ((m = HEAD.exec(l))) { out.appendChild(inline(m[1], h("p", { class: "mh" }))); i++; }
      else if (HR.test(l)) { out.appendChild(h("hr")); i++; }
      else if (QUOTE.test(l)) { var q = []; while (i < lines.length && QUOTE.test(lines[i])) q.push(lines[i++].replace(QUOTE, "")); out.appendChild(h("blockquote", {}, [inline(q.join(" "), h("p"))])); }
      else if (ITEM.test(l)) {
        var list = h(/\d/.test(ITEM.exec(l)[2]) ? "ol" : "ul");
        while (i < lines.length && (m = ITEM.exec(lines[i]))) { list.appendChild(inline(m[3], h("li", { class: m[1].length ? "in" : null }))); i++; }
        out.appendChild(list);
      }
      else { var p = [l]; i++; while (i < lines.length && !startsBlock(lines[i])) p.push(lines[i++]); out.appendChild(inline(p.join(" "), h("p"))); }
    }
    return out;
  }

  // ---- shapes: plates drawn from a vocabulary, so the picture carries no coordinates or text -------
  function plate(pl, cx, cy, hw, hh, dx) {
    var P = function (u, v) { return (cx + dx - hw + (u + v) * hw).toFixed(1) + " " + (cy + (v - u) * hh).toFixed(1); };
    var kids = [s("polygon", { class: "plt" + (pl.hot ? " hot" : "") + (pl.ghost ? " ghost" : ""), points: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].join(" ") })];
    var small = hw < 40, rows = small ? 4 : 8;
    if (pl.marks === "dots") [[.2, .3], [.74, .36], [.5, .56], [.3, .74], [.42, .18], [.86, .62], [.64, .84]].slice(0, small ? 4 : 7).forEach(function (d) { var q = P(d[0], d[1]).split(" "); kids.push(s("circle", { class: "sc", cx: q[0], cy: q[1], r: Math.max(1.4, 2 * hw / 70) })); });
    if (pl.marks === "rows") for (var k = 1; k <= rows; k++) kids.push(s("path", { class: "tk" + (pl.hot && k === Math.ceil(rows * 0.6) ? " t" : ""), d: "M" + P(.1, k / (rows + 1)) + " L" + P(.9, k / (rows + 1)) }));
    if (pl.marks === "grid") for (var g = 1; g < 4; g++) { kids.push(s("path", { class: "gd", d: "M" + P(g / 4, 0) + " L" + P(g / 4, 1) })); kids.push(s("path", { class: "gd", d: "M" + P(0, g / 4) + " L" + P(1, g / 4) })); }
    return s("g", {}, kids);
  }
  function panelArt(p) {
    // Sizes are relative within a panel, so the largest plate always fills the room its column has.
    var H = 150, SIZE = { s: 0.35, m: 0.65, l: 1 }, cols = {}, nodes = [], stops = [], JIT = [0, 6, -3, 3];
    p.plates.forEach(function (x) { var c = x.column || "center"; (cols[c] = cols[c] || []).push(x); });
    var names = ["left", "center", "right"].filter(function (c) { return cols[c]; }), SLOT = { 1: [95], 2: [50, 140], 3: [32, 95, 158] }[names.length], MAX = { 1: 70, 2: 43, 3: 30 }[names.length];
    var largest = Math.max.apply(null, p.plates.map(function (x) { return SIZE[x.size || "l"]; })), tagged = p.plates.some(function (x) { return x.tag; }), AREA = tagged ? H - 18 : H;
    names.forEach(function (c, at) {
      var list = cols[c], cx = SLOT[at], hws = list.map(function (x) { return MAX * SIZE[x.size || "l"] / largest; }), n = list.length, top = hws[n - 1] / 2, bottom = hws[0] / 2, gap, y0;
      if (n === 1) { gap = 0; y0 = AREA / 2; }
      else if (p.tight) { gap = 16; y0 = AREA / 2 + (gap * (n - 1) + top - bottom) / 2; }
      else { gap = Math.min((AREA - 12 - top - bottom) / (n - 1), 56); y0 = AREA / 2 + (gap * (n - 1) + top - bottom) / 2; }
      list.forEach(function (x, i) { var dx = p.tight ? JIT[i] : 0; nodes.push(plate(x, cx, y0 - gap * i, hws[i], hws[i] / 2, dx)); stops.push({ x: cx + (n - 1 - i) * 13, y: y0 - gap * i }); });
      var tag = list.filter(function (x) { return x.tag; })[0];
      if (tag) nodes.push(s("text", { class: "ptag", x: cx, y: H - 9, text: tag.tag }));
    });
    if (p.route) { var d = stops.slice().reverse().map(function (q, i) { return (i ? "L" : "M") + q.x + " " + q.y; }).join(" "); nodes.push(s("path", { class: "pth", d: d })); stops.forEach(function (q) { nodes.push(s("circle", { class: "pt", cx: q.x, cy: q.y, r: 3.5 })); }); }
    return s("svg", { viewBox: "0 0 190 " + H, "aria-hidden": "true" }, [s("path", { class: "gl", d: "M0 60 L95 12 L190 60 M0 100 L95 52 L190 100 M0 140 L95 92 L190 140 M0 60 L95 108 L190 60 M0 20 L95 68 L190 20" })].concat(nodes));
  }
  function shapes(f) {
    var row = h("div", { class: "pipe p" + f.panels.length }), els = [];
    f.panels.forEach(function (p, i) {
      var el = h("div", { class: "pl" }, [panelArt(p), h("p", { class: "pn", text: p.caption })]);
      els.push(el); row.appendChild(el);
      if (i < f.panels.length - 1) row.appendChild(h("div", { class: "ar" }, [h("span", { text: f.steps[i] }), s("svg", { viewBox: "0 0 44 12", "aria-hidden": "true" }, [s("path", { d: "M1 6 H42 M36 1 L42 6 L36 11" })])]));
    });
    var text = h("p", {}), re = /\{(\d)\|([^}]+)\}/g, at = 0, m;
    while ((m = re.exec(f.text))) {
      text.appendChild(document.createTextNode(f.text.slice(at, m.index)));
      (function (el, phrase) {
        var b = h("button", { type: "button", class: "tm", text: phrase }), on = function (v) { return function () { if (el) el.classList.toggle("hl", v); }; };
        b.addEventListener("mouseenter", on(true)); b.addEventListener("mouseleave", on(false)); b.addEventListener("focus", on(true)); b.addEventListener("blur", on(false));
        text.appendChild(b);
      })(els[+m[1] - 1], m[2]);
      at = m.index + m[0].length;
    }
    text.appendChild(document.createTextNode(f.text.slice(at)));
    return h("div", {}, [h("h3", { text: f.title }), text, row, f.hand ? h("p", { class: "scribble", text: f.hand }) : null]);
  }

  // ---- layouts: each returns { W, H, nodes: [svg], parts: { id: { cx, cy } } } --------------------
  // A box outline with slightly bowed sides: hand-drawn, but still a crisp vector at any zoom.
  function sketch(x, y, w, hh, key) {
    var seed = 7, r = 7, X = x + w, Y = y + hh;
    for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 2147483647;
    function j(a) { seed = (seed * 16807 + 11) % 2147483647; return +((seed % 1000 / 1000 - 0.5) * a).toFixed(2); }
    return "M" + (x + r) + " " + (y + j(1)) + " Q" + (x + w / 2 + j(24)) + " " + (y + j(3)) + " " + (X - r) + " " + (y + j(1)) + " Q" + X + " " + y + " " + (X + j(1)) + " " + (y + r) +
      " Q" + (X + j(3)) + " " + (y + hh / 2) + " " + (X + j(1)) + " " + (Y - r) + " Q" + X + " " + Y + " " + (X - r) + " " + (Y + j(1)) +
      " Q" + (x + w / 2 + j(24)) + " " + (Y + j(3)) + " " + (x + r) + " " + (Y + j(1)) + " Q" + x + " " + Y + " " + (x + j(1)) + " " + (Y - r) +
      " Q" + (x + j(3)) + " " + (y + hh / 2) + " " + (x + j(1)) + " " + (y + r) + " Q" + x + " " + y + " " + (x + r) + " " + y + "Z";
  }
  function box(id, x, y, w, hh, text, sub, cls) {
    var kids = [s("path", { class: "bx", d: sketch(x, y, w, hh, id) })];
    if (sub) {
      // Stack by the real line counts, so a name that wraps pushes its subtitle down instead of landing on it.
      var nameH = wrap(text, w - 14, 13.5).length * 16.9, subH = wrap(sub, w - 12, 11.5).length * 14.4, top = y + hh / 2 - (nameH + 3 + subH) / 2;
      kids.push(label(x + w / 2, top + nameH / 2, text, w - 14, "", 13.5)); kids.push(label(x + w / 2, top + nameH + 3 + subH / 2, sub, w - 12, "s", 11.5));
    }
    else kids.push(label(x + w / 2, y + hh / 2, text, w - 14, "", 13.5));
    return s("g", { class: "part " + (cls || ""), "data-k": id }, kids);
  }
  function edge(a, b, d, cls) { return s("path", { class: "eg " + (cls || ""), "data-a": a, "data-b": b, d: d, "marker-end": "url(#ah)" }); }

  function tree(m) {
    var kids = {}, root = null, byId = {};
    m.parts.forEach(function (p) { byId[p.id] = p; if (p.parent) (kids[p.parent] = kids[p.parent] || []).push(p); else root = p; });
    var leaves = 0, maxD = 0;
    (function count(p, d) { p.d = d; maxD = Math.max(maxD, d); var c = kids[p.id]; if (!c) { p.li = leaves++; return; } c.forEach(function (x) { count(x, d + 1); }); })(root, 0);
    var W = Math.max(678, leaves * 92), unit = W / leaves, BH = 46, GAP = 54, parts = {}, nodes = [];
    (function place(p) { var c = kids[p.id]; if (!c) p.x = (p.li + 0.5) * unit; else { c.forEach(place); p.x = (c[0].x + c[c.length - 1].x) / 2; } })(root);
    var H = 12 + (maxD + 1) * BH + maxD * GAP + 12;
    m.parts.forEach(function (p) {
      var y = 12 + p.d * (BH + GAP), isLeaf = !kids[p.id];
      var w = Math.min(isLeaf ? unit - 12 : Math.max(unit * 1.4, 110), Math.max(Math.min(width(p.label, 13.5) + 28, 200), isLeaf ? 0 : 100));
      parts[p.id] = { cx: p.x, cy: y + BH / 2, x: p.x - w / 2, y: y, w: w };
    });
    m.parts.forEach(function (p) { if (p.parent) { var a = parts[p.parent], b = parts[p.id]; nodes.push(edge(p.parent, p.id, "M" + a.cx + " " + (a.y + BH) + " L" + b.cx + " " + (b.y - 3))); } });
    m.parts.forEach(function (p) { var q = parts[p.id]; nodes.push(box(p.id, q.x, q.y, q.w, BH, p.label)); });
    return { W: W, H: H, nodes: nodes, parts: parts };
  }

  function sequence(m) {
    var n = m.actors.length, W = NARROW ? FIT : 678, M = NARROW ? 42 : 76, step = (W - 2 * M) / Math.max(n - 1, 1), X = {}, parts = {}, nodes = [], AH = 40, y = 14 + AH + 34;
    m.actors.forEach(function (a, i) { X[a.id] = M + i * step; });
    var rows = m.messages.map(function (msg) {
      var self = msg.from === msg.to, room = self ? 150 : Math.max(Math.abs(X[msg.from] - X[msg.to]) - 16, 120);
      var lines = wrap(msg.label, room, 12.5).length, ry = y + (lines - 1) * 8;
      y = ry + 48; return { msg: msg, self: self, room: room, ry: ry, lines: lines, h: 48 + (lines - 1) * 8 };
    });
    var H = y - 6;
    m.actors.forEach(function (a) { nodes.push(s("line", { class: "life", "data-l": a.id, x1: X[a.id], y1: 14 + AH, x2: X[a.id], y2: H - 8 })); });
    rows.forEach(function (r) {
      var f = X[r.msg.from], t = X[r.msg.to], c = (f + t) / 2, lblY = r.ry - 16 - (r.lines - 1) * 8, kids, bx = f + (r.self || t > f ? 13 : -13);
      if (r.self) {
        kids = [s("path", { class: "ms", d: "M" + f + " " + r.ry + " h32 v18 h-30", "marker-end": "url(#ah)" }), label(f + 40 + r.room / 2 > W - 8 ? f - r.room / 2 - 6 : f + 40 + r.room / 2, r.ry + 9, r.msg.label, r.room, "m", 12.5)];
        parts[r.msg.id] = { cx: f + 32, cy: r.ry + 9, onLine: 1 };
      } else {
        kids = [s("line", { class: "ms", x1: f, y1: r.ry, x2: t + (t > f ? -4 : 4), y2: r.ry, "marker-end": "url(#ah)" }), label(c, lblY, r.msg.label, r.room, "m", 12.5)];
        parts[r.msg.id] = { cx: t, cy: r.ry, onLine: 1 };
      }
      kids.push(s("circle", { class: "nb", cx: bx, cy: r.ry, r: 8.5 }), s("text", { class: "nt", x: bx, y: r.ry }));
      nodes.push(s("g", { class: "part msg", "data-k": r.msg.id }, kids));
    });
    m.actors.forEach(function (a) { var bw = NARROW ? Math.min(step - 6, 84) : Math.min(Math.max(width(a.label, 13.5) + 26, 96), step - 8 < 96 ? 96 : Math.min(step - 8, 148)); parts[a.id] = { cx: X[a.id], cy: 14 + AH / 2 }; nodes.push(box(a.id, X[a.id] - bw / 2, 14, bw, AH, a.label, null, "actor")); });
    return { W: W, H: H, nodes: nodes, parts: parts, rows: rows, top: 14 + AH + 34 };
  }

  function pipelineColumn(m) {
    var W = FIT, BH = 62, GAP = 30, hasExit = (m.exits || []).length > 0, BW = hasExit ? Math.round(W * 0.56) : W - 4, x = 2, exits = {}, parts = {}, nodes = [];
    (m.exits || []).forEach(function (e) { exits[e.from] = e; });
    m.stations.forEach(function (st, i) { parts[st.id] = { x: x, y: 6 + i * (BH + GAP), cx: x + BW / 2, cy: 6 + i * (BH + GAP) + BH / 2 }; });
    m.stations.forEach(function (st, i) { if (i === m.stations.length - 1) return; var a = parts[st.id], b = parts[m.stations[i + 1].id]; nodes.push(edge(st.id, m.stations[i + 1].id, "M" + a.cx + " " + (a.y + BH) + " V" + (b.y - 3))); });
    m.stations.forEach(function (st) { var p = parts[st.id]; nodes.push(box(st.id, p.x, p.y, BW, BH, st.label, st.sub)); });
    (m.exits || []).forEach(function (e) {
      var p = parts[e.from], ex = x + BW + 24, EW = W - ex - 2, EH = 52;
      nodes.push(edge(e.from, e.id, "M" + (x + BW) + " " + p.cy + " H" + (ex - 3), "ex"));
      nodes.push(box(e.id, ex, p.cy - EH / 2, EW, EH, e.label, null, "exit"));
      parts[e.id] = { cx: ex + EW / 2, cy: p.cy };
    });
    return { W: W, H: 6 + m.stations.length * (BH + GAP) - GAP + 8, nodes: nodes, parts: parts };
  }

  function pipeline(m) {
    if (NARROW) return pipelineColumn(m);
    var n = m.stations.length, cols = Math.min(n, n > 5 ? Math.ceil(n / 2) : n), W = 678, cell = W / cols, BW = cell - 34, BH = 62, exits = {}, parts = {}, nodes = [];
    (m.exits || []).forEach(function (e) { exits[e.from] = e; });
    var rowCount = Math.ceil(n / cols), hasExit = (m.exits || []).length > 0, ROW = BH + (hasExit ? 112 : 44);
    m.stations.forEach(function (st, i) { var c = i % cols, r = Math.floor(i / cols); parts[st.id] = { x: c * cell + 17, y: 14 + r * ROW, cx: c * cell + cell / 2, cy: 14 + r * ROW + BH / 2, c: c, r: r }; });
    m.stations.forEach(function (st, i) {
      if (i === n - 1) return;
      var a = parts[st.id], b = parts[m.stations[i + 1].id], d;
      if (a.r === b.r) d = "M" + (a.x + BW) + " " + a.cy + " L" + (b.x - 3) + " " + b.cy;
      else {
        // A station with an exit below it leaves from the side, so the wrap-around line misses the exit.
        var mid = a.y + BH + (hasExit ? 86 : 22), side = a.x + BW + 10;
        d = (exits[st.id] ? "M" + (a.x + BW) + " " + a.cy + " H" + side + " V" + mid : "M" + a.cx + " " + (a.y + BH) + " V" + mid) + " H" + b.cx + " V" + (b.y - 3);
      }
      nodes.push(edge(st.id, m.stations[i + 1].id, d));
    });
    m.stations.forEach(function (st) { var p = parts[st.id]; nodes.push(box(st.id, p.x, p.y, BW, BH, st.label, st.sub)); });
    (m.exits || []).forEach(function (e) {
      var p = parts[e.from], y = p.y + BH + 34, EH = 36, ew = Math.min(BW, Math.max(width(e.label, 13.5) + 24, 84));
      nodes.push(edge(e.from, e.id, "M" + p.cx + " " + (p.y + BH) + " V" + (y - 3), "ex"));
      nodes.push(box(e.id, p.cx - ew / 2, y, ew, EH, e.label, null, "exit"));
      parts[e.id] = { cx: p.cx, cy: y + EH / 2 };
    });
    return { W: W, H: 14 + rowCount * ROW - (hasExit ? 30 : 34) + (rowCount > 0 && hasExit ? 16 : 0), nodes: nodes, parts: parts };
  }

  function states(m) {
    var n = m.states.length, W = NARROW ? FIT : 678, H = NARROW ? 340 : 396, CX = W / 2, CY = H / 2, RX = NARROW ? W / 2 - 52 : 240, RY = NARROW ? 134 : 142, BW = NARROW ? 96 : 124, BH = 46, parts = {}, nodes = [], pair = {};
    m.states.forEach(function (st, i) { var t = -Math.PI / 2 + i * 2 * Math.PI / n; parts[st.id] = { cx: CX + RX * Math.cos(t), cy: CY + RY * Math.sin(t) }; });
    m.transitions.forEach(function (tr) {
      var a = parts[tr.from], b = parts[tr.to], dx = b.cx - a.cx, dy = b.cy - a.cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var key = [tr.from, tr.to].sort().join("|"), order = pair[key] = (pair[key] || 0) + 1, sgn = order === 1 ? 1 : -1, bend = sgn * Math.min(46, L * 0.2);
      if (tr.from > tr.to) bend = -bend;
      var mx = (a.cx + b.cx) / 2 - uy * bend, my = (a.cy + b.cy) / 2 + ux * bend;
      function trim(p, tox, toy) { var vx = tox - p.cx, vy = toy - p.cy, f = Math.min((BW / 2 + 6) / (Math.abs(vx) || 1), (BH / 2 + 6) / (Math.abs(vy) || 1)); return [p.cx + vx * f, p.cy + vy * f]; }
      var p0 = trim(a, mx, my), p1 = trim(b, mx, my), lx = (p0[0] + 2 * mx + p1[0]) / 4, ly = (p0[1] + 2 * my + p1[1]) / 4;
      parts[tr.id] = { cx: lx, cy: ly, onLine: 1 };
      tr.path = "M" + p0[0] + " " + p0[1] + " Q" + mx + " " + my + " " + p1[0] + " " + p1[1];
    });
    for (var pass = 0; pass < 12; pass++) m.transitions.forEach(function (a, i) {
      m.transitions.slice(i + 1).forEach(function (b) {
        var pa = parts[a.id], pb = parts[b.id], ox = (width(a.label, 12.5) + width(b.label, 12.5)) / 2 + 12 - Math.abs(pa.cx - pb.cx), oy = 22 - Math.abs(pa.cy - pb.cy);
        if (ox <= 0 || oy <= 0) return;
        if (oy < ox) { var dy = (pa.cy <= pb.cy ? -1 : 1) * oy / 2; pa.cy += dy; pb.cy -= dy; } else { var dx = (pa.cx <= pb.cx ? -1 : 1) * ox / 2; pa.cx += dx; pb.cx -= dx; }
      });
    });
    m.transitions.forEach(function (tr) { var q = parts[tr.id]; nodes.push(s("g", { class: "part msg", "data-k": tr.id }, [s("path", { class: "ms", fill: "none", d: tr.path, "marker-end": "url(#ah)" }), label(q.cx, q.cy, tr.label, NARROW ? 104 : 130, "m", 12.5)])); });
    m.states.forEach(function (st) { var p = parts[st.id]; nodes.push(box(st.id, p.cx - BW / 2, p.cy - BH / 2, BW, BH, st.label)); });
    return { W: W, H: H, nodes: nodes, parts: parts };
  }

  // ---- machine ------------------------------------------------------------------------------------
  function scoped(m, sc) {
    var used = {};
    sc.steps.forEach(function (st) { (st.lit || []).concat(st.bad || []).forEach(function (k) { used[k] = 1; }); });
    if (m.layout === "states") return Object.assign({}, m, { states: m.states.filter(function (x) { return used[x.id]; }), transitions: m.transitions.filter(function (t) { return used[t.from] && used[t.to]; }) });
    var messages = m.messages.filter(function (x) { return used[x.id]; });
    messages.forEach(function (x) { used[x.from] = used[x.to] = 1; });
    return Object.assign({}, m, { messages: messages, actors: m.actors.filter(function (a) { return used[a.id]; }) });
  }
  function machine(m) {
    var cur = 0, idx = 0, single = m.layout === "states", perScenario = NARROW && (m.layout === "sequence" || single), lay, svg, dot, fig = h("div", { class: "fig" });
    function build() {
      lay = { tree: tree, sequence: sequence, pipeline: pipeline, states: states }[m.layout](perScenario ? scoped(m, m.scenarios[cur]) : m);
      dot = s("circle", { class: "dot", r: 6, cx: 0, cy: 0 });
      svg = s("svg", { viewBox: "0 0 " + lay.W + " " + lay.H, style: "min-width:" + Math.min(lay.W, 560) + "px", role: "img", "aria-label": S.title }, [
        s("defs", {}, [["ah", "af"], ["ah2", "af2"], ["ah3", "af3"]].map(function (a) { return s("marker", { id: a[0], viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "9", markerHeight: "9", orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, [s("path", { class: a[1], d: "M0 0 L8 4 L0 8 Z" })]); }))
      ].concat(lay.nodes).concat([dot]));
      fig.textContent = ""; fig.appendChild(svg);
    }
    build();
    var say = h("p", { "aria-live": "polite", "data-r": "say" }), pos = h("span", { class: "pos" }), next = h("button", { type: "button", class: "btn go" }),
      cnt = h("div", { class: "cnt" }), lnk = h("p", { class: "ln" }), bar = h("div", { class: "scen" });
    function reflow(sc) {
      if (single) {
        // Each scenario shows only the route it takes; the other transitions would just be noise.
        var seen = {}, route = {};
        sc.steps.forEach(function (st, i) {
          (st.lit || []).concat(st.bad || []).forEach(function (k) { seen[k] = 1; });
          var from = i && (sc.steps[i - 1].lit || [])[0], to = (st.lit || [])[0];
          m.transitions.forEach(function (t) { if (t.from === from && t.to === to) route[t.id] = 1; });
        });
        Array.prototype.forEach.call(svg.querySelectorAll(".part"), function (g) { var k = g.getAttribute("data-k"); if (g.classList.contains("msg")) g.style.display = route[k] || seen[k] ? "" : "none"; else g.classList.toggle("idle", !seen[k]); });
        return;
      }
      if (!lay.rows) return;
      var order = [], touched = {};
      sc.steps.forEach(function (st) { (st.lit || []).concat(st.bad || []).forEach(function (k) { touched[k] = 1; if (order.indexOf(k) < 0 && lay.rows.some(function (r) { return r.msg.id === k; })) order.push(k); }); });
      var y = lay.top;
      order.forEach(function (k) { var r = lay.rows.filter(function (x) { return x.msg.id === k; })[0], extra = (r.lines - 1) * 8; r.to = y + extra - r.ry; y += r.h; touched[r.msg.from] = touched[r.msg.to] = 1; });
      lay.rows.forEach(function (r) { var g = svg.querySelector('[data-k="' + r.msg.id + '"]'), at = order.indexOf(r.msg.id); g.style.display = at >= 0 ? "" : "none"; if (at >= 0) { g.style.transform = "translateY(" + r.to + "px)"; g.querySelector(".nt").textContent = at + 1; } });
      var hh = y - 6;
      svg.setAttribute("viewBox", "0 0 " + lay.W + " " + hh);
      Array.prototype.forEach.call(svg.querySelectorAll(".life"), function (l) { l.setAttribute("y2", hh - 8); l.classList.toggle("idle", !touched[l.getAttribute("data-l")]); });
      Array.prototype.forEach.call(svg.querySelectorAll(".actor"), function (a) { a.classList.toggle("idle", !touched[a.getAttribute("data-k")]); });
    }
    function apply() {
      var sc = m.scenarios[cur], lit = {}, bad = {}, dim = {}, st = idx ? sc.steps[idx - 1] : null;
      reflow(sc);
      if (single && idx > 1) { var from = (sc.steps[idx - 2].lit || [])[0], to = (st.lit || [])[0]; (m.transitions || []).forEach(function (t) { if (t.from === from && t.to === to) lit[t.id] = 1; }); }
      for (var i = single ? idx - 1 : 0; i < idx; i++) { if (i < 0) continue; (sc.steps[i].lit || []).forEach(function (k) { lit[k] = 1; }); (sc.steps[i].bad || []).forEach(function (k) { bad[k] = 1; }); }
      if (st) (st.dim || []).forEach(function (k) { dim[k] = 1; });
      Array.prototype.forEach.call(svg.querySelectorAll(".part"), function (e) { var k = e.getAttribute("data-k"); e.classList.toggle("on", !!lit[k]); e.classList.toggle("bad", !!bad[k]); e.classList.toggle("dim", !!dim[k]); });
      Array.prototype.forEach.call(svg.querySelectorAll(".eg"), function (e) { var a = e.getAttribute("data-a"), b = e.getAttribute("data-b"); e.classList.toggle("on", !!((lit[a] || bad[a]) && (lit[b] || bad[b]))); e.classList.toggle("dim", !!(dim[a] || dim[b])); });
      say.textContent = st ? st.say : sc.prompt;
      pos.textContent = idx ? idx + " / " + sc.steps.length : T("共 " + sc.steps.length + " 步", sc.steps.length + " steps");
      next.textContent = idx === sc.steps.length ? T("再看一次", "Replay") : idx ? T("下一步", "Next") : T("開始", "Start");
      if (m.counter) { var v = 0; for (var j = 0; j < idx; j++) if (sc.steps[j].value != null) v = sc.steps[j].value; cnt.textContent = ""; cnt.appendChild(h("span", { class: "cl", text: m.counter.label })); cnt.appendChild(h("b", { text: String(v).replace(/\B(?=(\d{3})+$)/g, ",") })); cnt.appendChild(h("span", { class: "cl", text: m.counter.unit })); }
      lnk.textContent = "";
      if (st && st.note) { var info = L.notes[st.note] || {}; lnk.appendChild(document.createTextNode(info.exists ? T("這一步接到你的筆記：", "This step connects to your note: ") : T("你的筆記還沒寫到這件事：", "Your notes don't cover this yet: "))); lnk.appendChild(noteBtn(st.note)); }
      var tgt = st && ((st.bad && st.bad.length ? st.bad : st.lit) || []), id = tgt && tgt[tgt.length - 1], p = id && lay.parts[id], row = lay.rows && lay.rows.filter(function (r) { return r.msg.id === id; })[0];
      if (p) { dot.style.opacity = 1; dot.style.transform = "translate(" + p.cx + "px," + (p.onLine ? p.cy + (row ? row.to : 0) : p.cy - 23) + "px)"; } else dot.style.opacity = 0;
      dot.classList.toggle("is-bad", !!(st && st.bad && st.bad.length));
    }
    next.addEventListener("click", function () { idx = (idx + 1) % (m.scenarios[cur].steps.length + 1); apply(); });
    m.scenarios.forEach(function (sc, i) {
      bar.appendChild(h("button", { type: "button", class: "btn", "aria-pressed": i === 0 ? "true" : "false", "data-s": i, text: sc.label, on: function () { cur = i; idx = 0; if (perScenario) build(); Array.prototype.forEach.call(bar.children, function (x, n) { x.setAttribute("aria-pressed", n === i ? "true" : "false"); }); apply(); } }));
    });
    var wrapEl = h("div", {}, [fig, h("div", { class: "say" },[m.counter ? cnt : null, say, h("div", { class: "nav" }, [pos, next])]), lnk, bar, m.assumption ? h("p", { class: "cap", text: m.assumption }) : null]);
    apply();
    return wrapEl;
  }

  // ---- contrast: the same situation put to each option, read across a row -------------------------
  function contrast(c) {
    var why = h("p", { "aria-live": "polite" }), lnk = h("p", { class: "ln" }), rows = [], n = c.options.length;
    var TONE = { good: T("較好", "Better"), bad: T("出問題", "Breaks") };
    function pick(i) {
      var st = c.situations[i];
      rows.forEach(function (r, k) { r.classList.toggle("sel", k === i); r.setAttribute("aria-pressed", k === i ? "true" : "false"); });
      why.textContent = st.why;
      lnk.textContent = "";
      if (st.note) { var info = L.notes[st.note] || {}; lnk.appendChild(document.createTextNode(info.exists ? T("這個情境接到你的筆記：", "This situation connects to your note: ") : T("你的筆記還沒寫到這件事：", "Your notes don't cover this yet: "))); lnk.appendChild(noteBtn(st.note)); }
    }
    var head = h("div", { class: "cx-head", style: "--n:" + n }, c.options.map(function (o) { return h("div", { class: "cx-opt" }, [h("b", { text: o.label }), h("span", { text: o.sub })]); }));
    c.situations.forEach(function (st, i) {
      var r = h("button", { type: "button", class: "cx-row" }, [h("span", { class: "cx-sit", text: st.label }), h("span", { class: "cx-cells", style: "--n:" + n }, c.options.map(function (o) {
        var out = st.outcomes[o.id];
        return h("span", { class: "cx-cell " + out.tone }, [out.tone !== "plain" ? h("span", { class: "cx-tag", text: TONE[out.tone] }) : null, h("span", { text: out.text })]);
      }))]);
      r.addEventListener("click", function () { pick(i); });
      rows.push(r);
    });
    pick(0);
    return h("div", {}, [h("div", { class: "cx" }, [head].concat(rows)), h("div", { class: "say" }, [why]), lnk, h("p", { class: "scribble", text: c.verdict })]);
  }

  // ---- reading: no figure, so where the idea stops is the part that carries the page --------------
  function edges(e) {
    function side(cls, title, items) { return h("div", { class: "eg-side " + cls }, [h("p", { class: "eg-t", text: title }), h("ul", {}, items.map(function (t) { return h("li", { text: t }); }))]); }
    return h("div", {}, [h("h3", { text: T("它到哪裡為止", "Where it stops") }), h("div", { class: "edges" }, [side("in", T("成立的時候", "When it holds"), e.holds), side("out", T("不成立，或被誤認的時候", "When it fails, or gets mistaken for it"), e.breaks)])]);
  }

  // ---- map ----------------------------------------------------------------------------------------
  function map(m) {
    var W = 678, H = 420, Y = { foundation: 62, neighbor: 208, consequence: 354 }, CORE = { x: 339, y: 208 };
    var XS = { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8] }, NX = { 1: [0.17], 2: [0.17, 0.83] };
    var bands = { foundation: [], neighbor: [], consequence: [] };
    m.nodes.forEach(function (n) { bands[n.band].push(n); });
    var edges = [], labels = [], btns = [];
    Object.keys(bands).forEach(function (b) {
      bands[b].forEach(function (n, i) {
        var f = (b === "neighbor" ? NX : XS)[bands[b].length][i];
        n.px = f * W; n.py = Y[b];
        if (b === "neighbor") {
          var ax = n.px + (n.px < CORE.x ? 64 : -64), bx = CORE.x + (n.px < CORE.x ? -86 : 86);
          edges.push(s("path", { class: "e", "data-e": n.id, d: "M" + ax + " " + n.py + " L" + bx + " " + n.py }));
          labels.push(s("text", { class: "el", "data-e": n.id, x: (ax + bx) / 2, y: n.py - 16, text: n.relation }));
          return;
        }
        // Edges leave the node vertically and ease into the centre, so the fan reads as one drawing.
        var down = b === "foundation", p0 = down ? [n.px, n.py + 30] : [CORE.x + (n.px - CORE.x) * 0.26, CORE.y + 36], p3 = down ? [CORE.x + (n.px - CORE.x) * 0.26, CORE.y - 36] : [n.px, n.py - 30];
        var dy = p3[1] - p0[1], c1 = down ? [p0[0], p0[1] + dy * 0.5] : [p0[0] + (p3[0] - p0[0]) * 0.1, p0[1] + dy * 0.5], c2 = down ? [p3[0] + (p0[0] - p3[0]) * 0.1, p3[1] - dy * 0.5] : [p3[0], p3[1] - dy * 0.5];
        var t = 0.5, u = 1 - t, at = function (k) { return u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p3[k]; };
        edges.push(s("path", { class: "e", "data-e": n.id, d: "M" + p0.join(" ") + " C" + c1.join(" ") + " " + c2.join(" ") + " " + p3.join(" ") }));
        labels.push(s("text", { class: "el", "data-e": n.id, x: at(0), y: at(1), text: n.relation }));
      });
    });
    var marker = function (id, cls) { return s("marker", { id: id, viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, [s("path", { class: cls, d: "M0 0 L8 4 L0 8 Z" })]); };
    var weakest = null;
    m.nodes.forEach(function (n) { var i = L.notes[n.note] || {}; if (i.exists && i.cards && (i.minStability < 7 || i.again30 >= 2) && (!weakest || i.minStability < L.notes[weakest.note].minStability)) weakest = n; });
    var scribble = [];
    if (weakest) {
      var wx = weakest.px, wy = weakest.py;
      if (wx > 190) scribble = [s("text", { class: "scr", x: wx - 158, y: wy, text: T("卡在這", "stuck") }), s("path", { class: "scl", d: "M" + (wx - 104) + " " + wy + " C" + (wx - 96) + " " + (wy - 2) + " " + (wx - 84) + " " + (wy - 2) + " " + (wx - 72) + " " + wy + " m-8 -5 l8 5 l-8 5" })];
      else scribble = [s("text", { class: "scr", x: wx - 26, y: wy + 42, text: T("卡在這", "stuck") })];
    }
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, "aria-hidden": "true" }, [s("defs", {}, [marker("a1", "af"), marker("a2", "af2")]), s("text", { class: "rw", x: 14, y: 24, text: T("它靠什麼成立", "What it rests on") }), s("text", { class: "rw", x: 14, y: 160, text: T("它的鄰居", "Its neighbors") }), s("text", { class: "rw", x: 14, y: 306, text: T("帶來的後果", "What follows") })].concat(edges).concat(labels).concat(scribble));
    var mapEl = h("div", { class: "map pick" }, [svg]);
    var rel = h("p", { class: "rel" }), ttl = h("h2", {}), why = h("p", { class: "why" }), qt = h("p", { class: "qt" }), live = h("p", { class: "qt" }), open = h("button", { type: "button", class: "btn" });
    var core = h("button", { type: "button", class: "nd core", style: "left:50%;top:" + (CORE.y / H * 100) + "%", "data-n": "__core" }, [document.createTextNode(m.center.label), h("span", { class: "st", text: m.center.sub || "" })]);
    function pick(id) {
      var n = m.nodes.filter(function (x) { return x.id === id; })[0];
      Array.prototype.forEach.call(mapEl.querySelectorAll(".nd"), function (e) { e.classList.toggle("sel", e.getAttribute("data-n") === id); });
      Array.prototype.forEach.call(mapEl.querySelectorAll("[data-e]"), function (e) { e.classList.toggle("on", e.getAttribute("data-e") === id); });
      mapEl.classList.toggle("pick", !!n);
      if (!n) { rel.textContent = T("這張卡本身", "This card"); ttl.textContent = m.center.label; why.textContent = S.hook || ""; qt.textContent = ""; live.textContent = ""; open.style.display = "none"; return; }
      var info = L.notes[n.note] || {};
      rel.textContent = n.kind; ttl.textContent = n.note; why.textContent = n.why;
      qt.textContent = n.quote ? T("你的筆記寫著：「" + n.quote + "」", "Your note says: \u201c" + n.quote + "\u201d") : "";
      var days = Math.round(info.minStability);
      live.textContent = !info.exists ? T("這篇筆記還沒寫。", "This note isn't written yet.") : info.cards ? T("這篇的卡片最短穩定 " + days + " 天" + (info.again30 ? "，近 30 天按過 " + info.again30 + " 次 Again。" : "。"), "Its weakest card holds for " + days + " days" + (info.again30 ? ", with " + info.again30 + " Again in the last 30 days." : ".")) : "";
      open.style.display = ""; open.textContent = info.exists ? T("打開這篇筆記", "Open this note") : T("建立這篇筆記", "Create this note"); open.setAttribute("data-note", n.note);
    }
    btns.push(core); core.addEventListener("click", function () { pick("__core"); });
    m.nodes.forEach(function (n) {
      var info = L.notes[n.note] || {}, st = !info.exists ? T("還沒寫", "not written") : info.cards ? T("卡片穩定 " + Math.round(info.minStability) + " 天", "holds " + Math.round(info.minStability) + " days") : "";
      var b = h("button", { type: "button", class: "nd " + (info.exists ? "" : "un ") + (n === weakest ? "weak" : ""), "data-n": n.id, style: "left:" + (n.px / W * 100) + "%;top:" + (n.py / H * 100) + "%" }, [document.createTextNode(n.short || n.note), st ? h("span", { class: "st", text: st }) : null]);
      b.addEventListener("click", function () { pick(n.id); }); btns.push(b);
    });
    btns.forEach(function (b) { mapEl.appendChild(b); });
    var det = h("div", { class: "det" }, [h("div", {}, [rel, ttl, h("div", { class: "act" }, [open])]), h("div", {}, [why, qt, live])]);
    pick((weakest || m.nodes[0]).id);
    return h("div", {}, [h("div", { class: "scroll" }, [mapEl]), det]);
  }

  // ---- page shell ---------------------------------------------------------------------------------
  root.classList.add("f-" + S.form);
  try {
  var gaps = Object.keys(L.notes).filter(function (n) { return !L.notes[n].exists; });
  [h("p", { class: "origin", text: S.origin }), h("h1", { text: S.title }), h("p", { class: "sub", text: S.hook }),
    S.form === "machine" ? machine(S.machine) : S.form === "map" ? map(S.map) : S.form === "contrast" ? contrast(S.contrast) : null,
    S.shapes ? shapes(S.shapes) : null,
    h("h3", { text: S.form === "reading" ? T("其實是這樣", "What is really going on") : T("背後的道理", "Why it works") }),
    h("ol", { class: "why" }, S.points.map(function (p) { return h("li", {}, [h("p", {}, [h("b", { text: p.lead }), document.createTextNode(p.body + " "), p.note ? noteBtn(p.note) : null])]); })),
    S.edges ? edges(S.edges) : null,
    S.relations && S.relations.length ? h("div", { class: "rels" }, [h("h3", { text: T("它接在你筆記的哪裡", "Where it sits in your notes") })].concat(S.relations.map(function (r) { return h("p", { class: "rl" }, [noteBtn(r.note), h("span", { text: "　" + r.relation })]); }))) : null,
    gaps.length ? h("div", {}, [h("h3", { text: T("你的知識網還缺 " + gaps.length + " 條線", gaps.length + " links missing from your notes") }), h("div", { class: "gaps" }, [h("span", { class: "lb", text: T("點一下就建立筆記：", "Click to create the note: ") })].concat(gaps.map(function (n) { return h("button", { type: "button", class: "btn", "data-note": n, text: n }); })))]) : null,
    h("div", { class: "anchor" }, [h("p", { class: "big", text: S.anchor.line }), h("p", { class: "s", text: S.anchor.note })]),
    S.card && (function () { var a = markdown(S.card.a); a.classList.add("a"); return h("div", { class: "card" }, [h("p", { class: "l", text: T("你的原卡", "Your card") }), inline(S.card.q, h("p", { class: "q" })), h("button", { type: "button", class: "btn", text: T("看原卡答案", "Show the answer"), on: function () { a.classList.toggle("open"); } }), a]); })()
  ].forEach(function (e) { if (e) root.appendChild(e); });
  } catch (err) {
    // The host shows its own message and a way to regenerate, rather than a blank frame.
    root.textContent = "";
    window.parent.postMessage({ type: "engram-quest-render-error", message: String(err && err.message || err) }, "*");
    return;
  }
  root.addEventListener("click", function (e) {
    var n = e.target.closest && e.target.closest("[data-note]");
    if (n) window.parent.postMessage({ type: "engram-quest-open-note", note: n.getAttribute("data-note") }, "*");
  });

  // ---- host contract: theme in, height out ----------------------------------------------------------
  function paint() {
    var html = document.documentElement;
    html.style.colorScheme = root.classList.contains("dark") ? "dark" : "light";
    html.style.background = document.body.style.background = getComputedStyle(root).backgroundColor;
  }
  function report() { window.parent.postMessage({ type: "engram-quest-resize", height: document.documentElement.scrollHeight + 8 }, "*"); }
  window.addEventListener("message", function (e) {
    if (e.source === window.parent && e.data && e.data.type === "engram-quest-theme") { root.classList.toggle("dark", !!e.data.dark); paint(); }
  });
  paint();
  new ResizeObserver(report).observe(root);
  window.addEventListener("load", report);
})();
