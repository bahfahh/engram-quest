/* EngramQuest mission house style, shared behaviour. Copy this file unchanged to the top of a mission's
   <script>; the mission's own script follows it. It owns the contract with the plugin, so a mission cannot
   get it wrong: the frame follows the content's height, the page follows Obsidian's theme, and the score
   is sent once, after the learner has read the verdict and pressed the finish button. */
var QZ = (function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var framed = window.parent && window.parent !== window;
  function post(m) { if (framed) { try { window.parent.postMessage(m, "*"); } catch (e) {} } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // The frame is as tall as the page, whenever the page changes. The first report waits until the page
  // has been laid out (the observer's first callback, or load), so a half-built page is never measured.
  // The page's own scrollbar is turned off in the frame (see the stylesheet): where a scrollbar takes
  // width, it would appear while the frame catches up, narrow the page, and change the height reported.
  if (framed) document.documentElement.classList.add("qz-framed");
  var sentH = 0;
  function resize() {
    var h = Math.ceil(document.body.getBoundingClientRect().height);
    if (h > 0 && h !== sentH) { sentH = h; post({ type: "engram-quest-resize", height: h }); }
  }
  try { if (window.ResizeObserver) new window.ResizeObserver(resize).observe(document.body); } catch (e) {}
  window.addEventListener("load", resize);

  // the plugin says which theme Obsidian is in; opened on its own in a browser, the page follows the system
  window.addEventListener("message", function (e) {
    if (!framed || e.source !== window.parent || !e.data || e.data.type !== "engram-quest-theme") return;
    document.body.classList.toggle("dark", !!e.data.dark);
  });
  if (!framed && window.matchMedia) {
    try {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      document.body.classList.toggle("dark", mq.matches);
      mq.addEventListener("change", function (e) { document.body.classList.toggle("dark", e.matches); });
    } catch (e) {}
  }

  var zh = /^zh/i.test(document.documentElement.lang || "");
  var WORDS = zh ? { of: "分（滿分 100）", finish: "完成關卡", sent: "已送出" } : { of: "out of 100", finish: "Finish", sent: "Sent" };

  /* Shows the verdict and the finish button, and returns the score.
     o.title    one sentence: how it went
     o.lead     optional: the point to take away
     o.parts    [{ label, got, max, note }] — what the score is made of; the score is the share of points
                earned, 0 to 100
     o.into     optional element to put the verdict in (default: the end of .wrap)
     o.finish, o.sent, o.of   optional wording, when the mission is in a language other than English or Chinese
     Calling it again replaces the verdict, until the learner has pressed finish; after that it returns null. */
  var sent = false, box = null;
  function points(x) { return Math.round((Number(x) || 0) * 10) / 10; }   // what is shown is what is counted
  function verdict(o) {
    if (sent) return null;
    o = o || {};
    var parts = (o.parts || []).map(function (p) { return { label: p.label, got: points(p.got), max: points(p.max), note: p.note }; });
    var got = 0, max = 0;
    parts.forEach(function (p) { got += p.got; max += p.max; });
    var score = max > 0 ? Math.max(0, Math.min(100, Math.round(got / max * 100))) : 0;
    if (box) box.remove();
    box = el("section", "verdict");
    box.appendChild(el("h2", "", o.title));
    if (o.lead) box.appendChild(el("p", "", o.lead));
    var ul = el("ul", "parts");
    parts.forEach(function (p) {
      var li = el("li");
      li.appendChild(el("span", "", p.label));
      li.appendChild(el("b", "", p.got + " / " + p.max));
      if (p.note) li.appendChild(el("small", "", p.note));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var tot = el("div", "total"), btn = el("button", "btn pri", o.finish || WORDS.finish);
    tot.appendChild(el("b", "", String(score)));
    tot.appendChild(el("span", "", o.of || WORDS.of));
    btn.type = "button";
    btn.addEventListener("click", function () {
      if (sent) return;
      sent = true; btn.disabled = true; btn.textContent = o.sent || WORDS.sent;
      post({ type: "engram-quest-solved", score: score });
    });
    tot.appendChild(btn);
    box.appendChild(tot);
    (o.into || $(".wrap") || document.body).appendChild(box);
    resize();
    return score;
  }

  // draws the eye to something that has just changed; works every time it is called
  function flash(node) {
    if (!node) return;
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
  }

  // Brings a part of the page to the top of the view. Inside the frame it waits until the frame has grown
  // to the page's new height: until then the quest window has nowhere to scroll to, and the learner lands
  // somewhere else. A frame that has stopped growing (the plugin's ceiling) is not waited for forever.
  function show(node) {
    if (!node) return;
    var waited = 0;
    (function go() {
      var fits = !framed || window.innerHeight + 1 >= document.body.getBoundingClientRect().height;
      if (fits || ++waited > 30) node.scrollIntoView({ block: "start" });
      else window.requestAnimationFrame(go);
    })();
  }

  return { $: $, $$: $$, el: el, verdict: verdict, flash: flash, show: show, resize: resize };
})();
