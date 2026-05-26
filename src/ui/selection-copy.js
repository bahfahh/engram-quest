"use strict";
// selection-copy.js
// Enables Ctrl/Cmd+C copy and Ctrl/Cmd+A select-all of text inside an Obsidian Modal.
//
// Root cause it solves: Obsidian's Modal owns a keymap Scope (this.scope) that is
// pushed onto the global keymap stack when the modal opens. Obsidian's keymap
// dispatcher routes every keydown (including Mod+C / Mod+A) through that active scope
// BEFORE the browser's native copy / select-all fires; with no handler registered, the
// event is swallowed — so selected text can be highlighted but not copied, and Mod+A
// does nothing. Registering these keys on the modal's own scope restores the behavior.

// isEditable(el): true when focus is in a field that should keep native Mod+A/Mod+C
// (input / textarea / contenteditable). For those we let the key pass through untouched.
function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable === true;
}

// registerSelectionCopy(modal): register Mod+C (copy current selection) and Mod+A
// (select all modal text) on the modal's scope. Guarded so repeated calls on the same
// modal instance don't stack duplicate handlers.
function registerSelectionCopy(modal) {
  if (!modal || !modal.scope || typeof modal.scope.register !== "function") return;
  if (modal._selCopyRegistered) return;
  modal._selCopyRegistered = true;
  const win = () => (typeof activeWindow !== "undefined") ? activeWindow : window;

  // Mod+C — copy the current DOM selection when it lives inside this modal.
  modal.scope.register(["Mod"], "c", () => {
    const w = win();
    const sel = w.getSelection && w.getSelection();
    if (!sel || sel.rangeCount === 0) return true;
    const text = sel.toString();
    const node = sel.anchorNode || sel.focusNode;
    if (text && text.trim() && modal.modalEl && modal.modalEl.contains(node)) {
      if (!navigator.clipboard) return true; // no clipboard API — let native try
      navigator.clipboard.writeText(text).catch(e => console.error("EngramQuest: copy failed", e));
      return false; // copied — prevent default / double handling
    }
    return true; // nothing relevant selected — let the key pass
  });

  // Mod+A — select all text in the modal. Skip when focus is in an editable field so
  // the field's own select-all keeps working.
  modal.scope.register(["Mod"], "a", () => {
    const w = win();
    const doc = w.document || (typeof activeDocument !== "undefined" ? activeDocument : document);
    if (isEditable(doc.activeElement)) return true;
    const sel = w.getSelection && w.getSelection();
    if (!sel || !modal.modalEl || typeof doc.createRange !== "function") return true;
    const range = doc.createRange();
    range.selectNodeContents(modal.modalEl);
    sel.removeAllRanges();
    sel.addRange(range);
    return false; // handled — prevent default
  });
}

module.exports = { registerSelectionCopy };
