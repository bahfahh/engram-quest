"use strict";
// selection-toolbar.js
// A small bar of actions that appears beside text the reader selects inside one element, so the
// action is where the selection is instead of at the top of a long page that has been scrolled away.
//
// The bar is drawn inside `host`, so it scrolls with the text. A desktop puts it above the selection;
// phones and tablets put it below, because the system's own copy menu takes the space above, and leave
// room under the selection for the handles the system draws there. When the preferred side has no room
// in the visible area, the bar goes on the other side.

const GAP = 8;
const HANDLES = 20; // extra room below a touch selection for the system's drag handles

/**
 * Where the bar goes, in host coordinates. sel, host and view are client rects (view is the part of the
 * scrolling area nothing floats over); bar is { width, height }; prefer is "above" or "below".
 */
function placeBar(sel, host, view, bar, prefer) {
  const below = prefer === "below" ? GAP + HANDLES : GAP;
  const roomAbove = sel.top - view.top >= bar.height + GAP;
  const roomBelow = view.bottom - sel.bottom >= bar.height + below;
  const above = prefer === "below" ? !roomBelow && roomAbove : roomAbove || !roomBelow;
  // A selection taller than the view still gets a bar the reader can see, over the text if need be.
  const top = Math.min(Math.max(above ? sel.top - bar.height - GAP : sel.bottom + below, view.top), view.bottom - bar.height);
  const minLeft = Math.max(host.left, view.left);
  const maxLeft = Math.max(minLeft, Math.min(host.right, view.right) - bar.width);
  const left = Math.min(Math.max((sel.left + sel.right) / 2 - bar.width / 2, minLeft), maxLeft);
  return { top: Math.round(top - host.top), left: Math.round(left - host.left), above };
}

/**
 * The part of the nearest scrolling ancestor the reader can see and nothing floats over. A scroller's
 * top and bottom padding is where bars float over its edges (on a phone the rating buttons float over
 * the review's bottom padding), so the bar is kept out of it.
 */
function visibleArea(el) {
  const doc = el.ownerDocument, win = doc.defaultView;
  for (let n = el.parentElement; n; n = n.parentElement) {
    const style = win.getComputedStyle(n);
    if (style.overflowY !== "auto" && style.overflowY !== "scroll") continue;
    const r = n.getBoundingClientRect();
    return { top: r.top + (parseFloat(style.paddingTop) || 0), bottom: r.bottom - (parseFloat(style.paddingBottom) || 0), left: r.left, right: r.right };
  }
  return doc.documentElement.getBoundingClientRect();
}

/**
 * Shows `actions` beside text selected inside `target`.
 *   host     positioned element containing target; the bar is drawn in it
 *   actions  [{ label, run(text) }]; run gets the selected text
 *   prefer   "above" | "below"
 *   owner    Component whose unload removes the document listeners
 */
function attachSelectionToolbar({ host, target, actions, prefer = "above", owner }) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const bar = host.createDiv({ cls: "lh-sel-bar", attr: { role: "toolbar" } });
  // pressed: a press on one of the bar's buttons has begun and its click has not arrived yet. Until then
  // the bar stays where it is, even if the press cleared the selection: a touch screen sends the click
  // after the finger lifts, to whatever is under it by then, and a bar gone by that time would pass the
  // tap on to what lies beneath (the rating buttons, a link).
  let text = "", pressed = false, dragging = false, frame = 0;

  const hide = () => bar.removeClass("is-shown");
  const selection = () => {
    const sel = win.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const s = sel.toString();
    if (!s.trim() || (!target.contains(sel.anchorNode) && !target.contains(sel.focusNode))) return null;
    return { s, rect: sel.getRangeAt(0).getBoundingClientRect() };
  };
  const update = () => {
    frame = 0;
    if (dragging || pressed) return; // still selecting with the mouse, or a button press is under way
    const found = selection();
    if (!found) { hide(); return; }
    text = found.s;
    bar.addClass("is-shown");
    const pos = placeBar(found.rect, host.getBoundingClientRect(), visibleArea(host),
      { width: bar.offsetWidth, height: bar.offsetHeight }, prefer);
    bar.style.top = `${pos.top}px`;
    bar.style.left = `${pos.left}px`;
  };
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(update); };

  owner.registerDomEvent(doc, "selectionchange", schedule);
  // A mouse selection shows its bar once the button is let go, not while the text is being dragged over.
  target.addEventListener("pointerdown", (ev) => { if (ev.pointerType === "mouse" && ev.button === 0) { dragging = true; hide(); } });
  owner.registerDomEvent(doc, "pointerup", (ev) => {
    dragging = false;
    if (pressed && bar.contains(ev.target)) return; // the click is on its way
    pressed = false;
    schedule();
  });
  owner.registerDomEvent(doc, "pointercancel", () => { dragging = false; pressed = false; schedule(); });

  for (const action of actions) {
    const btn = bar.createEl("button", { cls: "lh-sel-bar-btn", text: action.label });
    btn.addEventListener("pointerdown", (ev) => { if (ev.button === 0) pressed = true; });
    btn.addEventListener("mousedown", (ev) => ev.preventDefault()); // keep the selection on a desktop
    // The click comes last for a mouse, a finger and the keyboard alike, so the bar can go then.
    btn.addEventListener("click", () => {
      const s = text;
      pressed = false;
      hide();
      win.getSelection()?.removeAllRanges();
      action.run(s);
    });
  }
  return bar;
}

module.exports = { attachSelectionToolbar, placeBar };
