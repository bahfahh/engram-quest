// EngramQuest lesson shared behaviour. Copy this file unchanged to the top of a lesson's <script>; the
// lesson's own script follows it and may use LZ.$, LZ.$$, LZ.player and LZ.relight. It covers: theme,
// section navigation, words that point at figure parts, figure views, playback, copy buttons, and the
// understanding check. Each piece does nothing when its markup is absent, and a mistake in one piece's
// markup leaves the others working.
var LZ = (function () {
  var body = document.body, $ = function (s, r) { return (r || document).querySelector(s); },
    $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function each(sel, fn) { $$(sel).forEach(function (el) { try { fn(el); } catch (err) { if (window.console) console.error("lesson-base:", sel, err); } }); }

  // Theme: the plugin sends it from the parent window; alone in a browser, follow the system.
  function dark(on) { body.classList.toggle("dark", !!on); }
  window.addEventListener("message", function (e) { if (e.source === window.parent && e.data && e.data.type === "engram-quest-theme") dark(e.data.dark); });
  if (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) dark(true);

  // One pip per section. It shows where the reader is and jumps there; it tracks nothing.
  var pips = $(".pips"), secs = pips ? $$(".sec[data-pip]") : [];
  secs.forEach(function (s) {
    var b = document.createElement("button"), dot = document.createElement("i"), name = document.createElement("span");
    b.className = "pip"; b.type = "button"; b.setAttribute("aria-label", s.dataset.pip); name.textContent = s.dataset.pip;
    b.appendChild(dot); b.appendChild(name);
    b.addEventListener("click", function () { s.scrollIntoView(); });
    pips.appendChild(b); s._pip = b;
  });
  if (secs.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) secs.forEach(function (s) { s._pip.classList.toggle("now", s === e.target); }); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    secs.forEach(function (s) { io.observe(s); });
  }

  // A word in the prose (.t[data-ref]) points at parts of a figure ([data-part], space-separated names).
  // Hovering either side lights the pair; a tap on the word keeps it lit until the next tap anywhere.
  // Delegated, so redrawn figures keep working. Names are compared as text, so any name is safe.
  var held = null, over = null;
  function names(el) { return (el.getAttribute("data-part") || "").split(/\s+/).filter(Boolean); }
  function partsOf(ref) { return $$("[data-part]").filter(function (p) { return names(p).indexOf(ref) >= 0; }); }
  function show(ref) {
    $$(".lit").forEach(function (p) { p.classList.remove("lit"); });
    $$(".linking").forEach(function (p) { p.classList.remove("linking"); });
    $$(".t.on").forEach(function (p) { p.classList.remove("on"); });
    if (!ref) return;
    partsOf(ref).forEach(function (p) { p.classList.add("lit"); var st = p.closest(".stage"); if (st) st.classList.add("linking"); });
    $$(".t[data-ref]").forEach(function (t) { if (t.getAttribute("data-ref") === ref) t.classList.add("on"); });
  }
  function refEl(e) { return e.target && e.target.closest ? e.target.closest(".t[data-ref],[data-part]") : null; }
  function refOf(el) { return el ? (el.getAttribute("data-ref") || names(el)[0] || null) : null; }
  document.addEventListener("mouseover", function (e) { var el = refEl(e), r = refOf(el); if (r) { over = el; show(r); } });
  document.addEventListener("mouseout", function (e) { if (refEl(e)) { over = null; show(held); } });
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest(".t[data-ref]") : null, r = t && t.getAttribute("data-ref");
    if (!r) { if (held) { held = null; show(null); } return; }
    held = held === r ? null : r; show(held);
    var p = held && partsOf(held)[0];
    if (p) { var box = p.getBoundingClientRect(); if (box.top < 60 || box.bottom > innerHeight) p.scrollIntoView({ block: "center" }); }
  });
  each(".t[data-ref]", function (t) {
    t.tabIndex = 0; t.setAttribute("role", "button");
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.click(); } });
  });
  // Call after a redraw replaces figure nodes: the light goes back on the new nodes, and a hover on a
  // node that no longer exists is dropped.
  function relight() { if (over && !over.isConnected) over = null; show(refOf(over) || held); }

  // Numbered marks in a command or code pair with the numbered explanations under it.
  each(".ana", function (a) {
    var marks = $$("pre b[data-n]", a), items = $$("ol li", a), keep = 0;
    function set(n) { marks.forEach(function (m) { m.classList.toggle("on", +m.dataset.n === n); }); items.forEach(function (li, i) { li.classList.toggle("on", i + 1 === n); }); }
    function wire(el, n) {
      el.addEventListener("mouseenter", function () { set(n); });
      el.addEventListener("mouseleave", function () { set(keep); });
      el.addEventListener("click", function () { keep = keep === n ? 0 : n; set(keep); });
    }
    marks.forEach(function (m) { wire(m, +m.dataset.n); });
    items.forEach(function (li, i) { wire(li, i + 1); });
  });

  // Views of one figure: the buttons in .seg[data-tabs] show the [data-when] pieces that name their view.
  // Works on HTML and SVG pieces. The figure carries the current view in data-v.
  each(".seg[data-tabs]", function (seg) {
    var fig = seg.closest(".fig") || seg.parentNode, bs = $$("button[data-v]", seg);
    if (!bs.length) return;
    function pick(v) {
      bs.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === v); });
      fig.setAttribute("data-v", v);
      $$("[data-when]", fig).forEach(function (el) { el.toggleAttribute("hidden", el.getAttribute("data-when").split(/\s+/).indexOf(v) < 0); });
      fig.dispatchEvent(new CustomEvent("lz:view", { detail: v }));
    }
    bs.forEach(function (b) { b.type = "button"; b.addEventListener("click", function () { pick(b.dataset.v); }); });
    pick(bs[0].dataset.v);
  });

  // Playback: the button walks a figure through states 0..count-1 on a timer and stops at the last one.
  // at() returns the current state, go(i) shows state i. Returns { stop }: call stop() from the figure's
  // own controls so a manual step ends the playback.
  function player(btn, count, ms, at, go) {
    var timer = 0;
    function stop() { clearInterval(timer); timer = 0; btn.classList.remove("on"); btn.setAttribute("aria-pressed", "false"); }
    btn.type = "button";
    btn.addEventListener("click", function () {
      if (timer) return stop();
      if (at() >= count - 1) go(0);
      btn.classList.add("on"); btn.setAttribute("aria-pressed", "true");
      timer = setInterval(function () { if (at() >= count - 1) return stop(); go(at() + 1); if (at() >= count - 1) stop(); }, ms);
    });
    return { stop: stop };
  }

  // Copy a command. The button shows a tick only when the text really reached the clipboard; when it
  // could not, the command is left selected so it can be copied by hand.
  each(".cp", function (b) {
    var pre = $("pre", b.parentNode), label = b.textContent;
    if (!pre) return;
    b.type = "button";
    function done() { b.textContent = "✓ " + label; setTimeout(function () { b.textContent = label; }, 1400); }
    function byHand() {
      var range = document.createRange(), sel = window.getSelection(), ok = false;
      range.selectNodeContents(pre); sel.removeAllRanges(); sel.addRange(range);
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      if (ok) { sel.removeAllRanges(); done(); }
    }
    b.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pre.textContent).then(done, byHand); else byHand();
    });
  });

  // Understanding check: data-answer is the right option; every option explains itself; wrong picks can be retried.
  each(".ask", function (ask) {
    var opts = $$(".opt", ask), fb = $(".fb", ask), right = +ask.dataset.answer;
    if (!fb) return;
    fb.textContent = "";
    opts.forEach(function (o, i) {
      o.addEventListener("click", function () {
        if (ask.classList.contains("solved")) return;
        opts.forEach(function (x) { x.classList.remove("no"); });
        if (i === right) { o.classList.add("yes"); ask.classList.add("solved"); fb.textContent = "✓ " + (o.dataset.why || ""); fb.className = "fb good"; }
        else { o.classList.add("no"); fb.textContent = "✗ " + (o.dataset.why || ""); fb.className = "fb miss"; }
      });
    });
  });

  return { $: $, $$: $$, player: player, relight: relight };
})();
