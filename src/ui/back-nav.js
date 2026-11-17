"use strict";
// back-nav.js
// One "back" for each full-screen window of the plugin (Hub, review session, guides, viewers).
//
// Obsidian keeps a stack of open windows. Android's back button and window.history.back call the top
// window's onHistoryBack(), which for a plain Modal closes it, so a window with inner pages (a Hub
// sub-page, the review's edit form) closed entirely instead of going back one page. useBack() makes
// onHistoryBack take the same step as the window's own back button. On iPhone and iPad, where people
// go back by swiping in from the left edge and Obsidian gives plugin windows no such gesture, the swipe
// takes that step too.
//
// A step closes the newest image or diagram viewer first (those are overlays, not windows), then goes
// back one page; the window itself closes only from its first page.

const I = require("obsidian");

const EDGE_PX = 24; // a swipe has to start this close to the left edge
const DECIDE_PX = 10; // movement before telling sideways (back) from up and down (scrolling)
const TRIGGER_PX = 64; // letting go past this goes back; short of it nothing happens
const MAX_PULL_PX = 96;

/** Closes the newest full-screen image or diagram viewer; true when there was one. */
function closeTopOverlay(doc) {
  const all = doc.body.querySelectorAll(".eq-lightbox, .eq-guide-lightbox");
  const top = all[all.length - 1];
  if (!top) return false;
  // The image and diagram viewers close from their ✕; the guide's picture closes on any tap.
  (top.querySelector(".eq-lightbox-close") || top).click();
  return true;
}

/** Whether something under the finger is scrolled sideways and should get the swipe itself. */
function scrolledSideways(el, root) {
  for (let n = el; n && n !== root; n = n.parentElement) if (n.scrollLeft > 0) return true;
  return false;
}

/** iPhone/iPad: a swipe in from the left edge calls modal.onHistoryBack(). */
function attachEdgeSwipe(modal) {
  const root = modal.containerEl;
  if (root._lhEdgeSwipe) return;
  root._lhEdgeSwipe = true;
  let start = null, sideways = false, pull = 0, hint = null;
  const reset = () => {
    if (start) root.removeEventListener("touchmove", onMove);
    start = null; sideways = false; pull = 0;
    if (hint) { hint.remove(); hint = null; }
  };
  // A round chevron that comes in from the edge with the finger and fills once letting go will go back.
  const draw = () => {
    if (!hint) {
      hint = root.createDiv({ cls: "lh-edge-back" });
      I.setIcon(hint, "chevron-left");
    }
    hint.style.transform = `translate(${Math.round(pull * 0.8) - 40}px,-50%)`;
    hint.toggleClass("is-ready", pull >= TRIGGER_PX);
  };
  root.addEventListener("touchstart", (ev) => {
    reset();
    if (ev.touches.length !== 1) return;
    const touch = ev.touches[0];
    if (touch.clientX > EDGE_PX || scrolledSideways(ev.target, root)) return;
    start = { x: touch.clientX, y: touch.clientY };
    // Listened to only while a touch that began at the edge is down: a blocking touchmove listener on
    // the whole window would make every scroll in it wait for the script.
    root.addEventListener("touchmove", onMove, { passive: false });
  }, { passive: true });
  function onMove(ev) {
    if (!start) return;
    if (ev.touches.length !== 1) { reset(); return; } // a second finger: a pinch, not a back swipe
    const touch = ev.touches[0];
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (!sideways) {
      if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return;
      if (dx <= Math.abs(dy)) { reset(); return; } // scrolling, or moving left: not ours
      sideways = true;
    }
    ev.preventDefault(); // the page under the finger must not move while this is a back swipe
    pull = Math.min(Math.max(dx, 0), MAX_PULL_PX);
    draw();
  }
  root.addEventListener("touchend", () => {
    const go = sideways && pull >= TRIGGER_PX;
    reset();
    if (go) modal.onHistoryBack();
  });
  root.addEventListener("touchcancel", reset);
}

/**
 * Makes `back` the window's back step for Android's back button, history.back and the iPhone edge
 * swipe. `back` should be what the window's on-screen back button does (closing the window when it is
 * on its first page). Call it from onOpen.
 */
function useBack(modal, back) {
  modal.onHistoryBack = () => {
    if (closeTopOverlay(modal.containerEl.ownerDocument || activeDocument)) return;
    back();
  };
  if (I.Platform && I.Platform.isIosApp) attachEdgeSwipe(modal);
}

module.exports = { useBack, TRIGGER_PX };
