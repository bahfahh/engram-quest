"use strict";
// diagram-fit.js
// Makes diagrams drawn into a card (Mermaid, rendered by Obsidian after the markdown) fit a phone.
//
// A Mermaid flowchart laid out left to right is often wider than the card. Left alone, its right side
// was cut off at the card's edge with no way to see it. Each diagram now gets one of three layouts:
//   - it fits: shown at its own size;
//   - it fits once shrunk, and the text is still readable (scale >= MIN_SCALE): shrunk to the card width;
//   - it would be too small: shown at MIN_SCALE in a strip that scrolls sideways, with a fade on the
//     side that has more to see.
// Tapping a diagram, or its expand button, opens it full screen with pinch-zoom and drag.
//
// Mermaid draws after renderMarkdown returns, so diagrams are picked up by a MutationObserver as they
// appear. Everything this sets up is released through `owner` (the card's Component).

const MIN_SCALE = 0.65;
const MAX_ZOOM = 6;
const DIAGRAM_SELECTOR = ".mermaid";

const EXPAND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M10 20H4v-6"/><path d="m20 4-6.5 6.5"/><path d="m4 20 6.5-6.5"/></svg>';

/** The width the diagram was drawn at, in CSS px; 0 when it cannot be told yet. */
function naturalWidth(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width > 0) return vb.width;
  const max = parseFloat(svg.style.maxWidth);
  if (max > 0) return max;
  const attr = parseFloat(svg.getAttribute("width"));
  if (attr > 0 && !/%$/.test(svg.getAttribute("width"))) return attr;
  return 0;
}

/** Pure layout choice, exported for tests: "natural" | "fit" | "scroll" and the width to draw at. */
function chooseLayout(natural, available, minScale = MIN_SCALE) {
  if (!(natural > 0) || !(available > 0)) return { mode: "natural", width: 0 };
  if (natural <= available) return { mode: "natural", width: natural };
  if (available / natural >= minScale) return { mode: "fit", width: available };
  return { mode: "scroll", width: Math.round(natural * minScale) };
}

function layout(wrap, svg) {
  const natural = naturalWidth(svg);
  const scroller = wrap.querySelector(".lh-diagram-scroll");
  const { mode, width } = chooseLayout(natural, scroller.clientWidth);
  if (!width) return;
  wrap.dataset.fit = mode;
  svg.style.width = `${width}px`;
  svg.removeAttribute("height");
  updateFades(wrap, scroller);
}

function updateFades(wrap, scroller) {
  const more = scroller.scrollWidth - scroller.clientWidth;
  wrap.classList.toggle("has-more-right", more > 2 && scroller.scrollLeft < more - 2);
  wrap.classList.toggle("has-more-left", more > 2 && scroller.scrollLeft > 2);
}

function enhance(diagram, owner, doc) {
  if (diagram.dataset.lhDiagram) return;
  const svg = diagram.querySelector("svg");
  if (!svg) return;
  diagram.dataset.lhDiagram = "1";

  const wrap = doc.createElement("div");
  wrap.className = "lh-diagram";
  const scroller = wrap.appendChild(doc.createElement("div"));
  scroller.className = "lh-diagram-scroll";
  diagram.parentNode.insertBefore(wrap, diagram);
  scroller.appendChild(diagram);

  const expand = wrap.appendChild(doc.createElement("button"));
  expand.className = "lh-diagram-expand";
  expand.setAttribute("aria-label", "Full screen");
  expand.appendChild(new DOMParser().parseFromString(EXPAND_SVG, "image/svg+xml").documentElement);
  const open = (ev) => {
    // A link drawn in the diagram (a Mermaid internal-link node, a click href) keeps doing its job.
    if (ev.target && ev.target.closest && ev.target.closest("a, .internal-link")) return;
    ev.preventDefault(); ev.stopPropagation(); openDiagramViewer(svg, doc, owner);
  };
  expand.addEventListener("click", open);
  diagram.addEventListener("click", open);
  scroller.addEventListener("scroll", () => updateFades(wrap, scroller), { passive: true });

  layout(wrap, svg);
  // Rotating the phone or resizing the window changes the room the diagram has.
  if (typeof ResizeObserver === "function") {
    let lastWidth = scroller.clientWidth;
    const ro = new ResizeObserver(() => {
      if (scroller.clientWidth === lastWidth) return;
      lastWidth = scroller.clientWidth;
      layout(wrap, svg);
    });
    ro.observe(scroller);
    owner.register(() => ro.disconnect());
  }
}

/** Picks up the diagrams in `el` now and as the renderer finishes them. */
function fitDiagrams(el, owner) {
  const doc = el.ownerDocument;
  const scan = () => el.querySelectorAll(DIAGRAM_SELECTOR).forEach((d) => enhance(d, owner, doc));
  scan();
  if (typeof MutationObserver !== "function") return;
  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    // One pass per frame, after Mermaid has finished writing the svg.
    (doc.defaultView || window).requestAnimationFrame(() => { queued = false; scan(); });
  });
  mo.observe(el, { childList: true, subtree: true });
  owner.register(() => mo.disconnect());
}

/** Full-screen view of one diagram: fitted to the screen, pinch or wheel to zoom, drag to pan,
 *  double-tap to go back to fitted. Closed by ✕, Esc, or a tap outside the diagram. */
function openDiagramViewer(svg, doc, owner) {
  const lb = doc.body.appendChild(doc.createElement("div"));
  lb.className = "eq-lightbox lh-diagram-viewer";
  const stage = lb.appendChild(doc.createElement("div"));
  stage.className = "lh-diagram-stage";
  const copy = svg.cloneNode(true);
  const natural = naturalWidth(svg) || svg.getBoundingClientRect().width;
  const ratio = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width)
    ? svg.viewBox.baseVal.height / svg.viewBox.baseVal.width
    : svg.getBoundingClientRect().height / Math.max(1, svg.getBoundingClientRect().width);
  copy.style.width = `${natural}px`;
  copy.style.height = `${natural * ratio}px`;
  copy.removeAttribute("height");
  stage.appendChild(copy);
  const close = lb.appendChild(doc.createElement("button"));
  close.className = "eq-lightbox-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "✕";

  // View state: the copy is drawn at its natural size, then scaled about its top-left corner.
  let scale = 1, x = 0, y = 0, fitScale = 1;
  const apply = () => { copy.style.transform = `translate(${x}px,${y}px) scale(${scale})`; };
  const fit = () => {
    const vw = lb.clientWidth, vh = lb.clientHeight;
    const h = natural * ratio;
    fitScale = Math.min((vw - 24) / natural, (vh - 120) / h, MAX_ZOOM);
    scale = fitScale;
    x = (vw - natural * scale) / 2;
    y = (vh - h * scale) / 2;
    apply();
  };
  const zoomAt = (cx, cy, next) => {
    next = Math.min(Math.max(next, fitScale * 0.5), Math.max(MAX_ZOOM, fitScale));
    x = cx - (cx - x) * (next / scale);
    y = cy - (cy - y) * (next / scale);
    scale = next;
    apply();
  };
  fit();

  const pointers = new Map();
  let pinch = null, moved = false, lastTap = 0, onDiagram = false;
  stage.addEventListener("pointerdown", (ev) => {
    if (pointers.size === 0) onDiagram = copy.contains(ev.target);
    stage.setPointerCapture && stage.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  });
  stage.addEventListener("pointermove", (ev) => {
    const prev = pointers.get(ev.pointerId);
    if (!prev) return;
    const cur = { x: ev.clientX, y: ev.clientY };
    pointers.set(ev.pointerId, cur);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.scale * (d / pinch.d));
      moved = true;
    } else if (pointers.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      x += dx; y += dy; apply();
    }
  });
  const up = (ev) => {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  stage.addEventListener("pointerup", (ev) => {
    up(ev);
    if (moved || pointers.size) return;
    // A tap on the dark area around the diagram closes; a double-tap on it goes back to fitted.
    if (!onDiagram) { dismiss(); return; }
    const now = Date.now();
    if (now - lastTap < 300) { fit(); lastTap = 0; } else lastTap = now;
  });
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    zoomAt(ev.clientX, ev.clientY, scale * Math.exp(-ev.deltaY * 0.0015));
  }, { passive: false });

  const win = doc.defaultView || window;
  const onKey = (ev) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); dismiss(); } };
  const onResize = () => fit();
  const dismiss = () => {
    lb.remove();
    win.removeEventListener("keydown", onKey, true);
    win.removeEventListener("resize", onResize);
  };
  win.addEventListener("keydown", onKey, true);
  win.addEventListener("resize", onResize);
  close.addEventListener("click", (ev) => { ev.stopPropagation(); dismiss(); });
  // Clicks must not reach the modal underneath.
  lb.addEventListener("click", (ev) => ev.stopPropagation());
  if (owner) owner.register(dismiss);
  return { dismiss };
}

module.exports = { fitDiagrams, chooseLayout, openDiagramViewer, MIN_SCALE };
