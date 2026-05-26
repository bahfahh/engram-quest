// Tests for registerSelectionCopy — the Mod+C (copy) and Mod+A (select-all) handlers
// that restore native-style Ctrl/Cmd+C and Ctrl/Cmd+A inside EngramQuest modals
// (Obsidian's Modal scope otherwise swallows the keydown before the browser acts).

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerSelectionCopy } from "../src/ui/selection-copy.js";

// Build a fake modal whose scope.register records each handler by key so we can invoke
// the Mod+C / Mod+A handlers directly.
function makeModal({ containsNode = true } = {}) {
  const handlers = {};
  const calls = [];
  const modal = {
    modalEl: { contains: () => containsNode },
    scope: {
      register: (mods, key, fn) => { calls.push([mods, key]); handlers[key] = fn; }
    }
  };
  return {
    modal,
    calls,
    copy: () => handlers.c && handlers.c(),
    selectAll: () => handlers.a && handlers.a()
  };
}

// Stub the current-window selection + clipboard the copy handler reads.
function stubSelection(text) {
  const sel = text == null
    ? { rangeCount: 0, toString: () => "", anchorNode: null, focusNode: null }
    : { rangeCount: 1, toString: () => text, anchorNode: { node: true }, focusNode: null };
  globalThis.activeWindow = { getSelection: () => sel };
}

let writeText;
beforeEach(() => {
  writeText = vi.fn(() => Promise.resolve());
  globalThis.navigator = { clipboard: { writeText } };
});

describe("registerSelectionCopy — registration", () => {
  it("registers Mod+C and Mod+A on the modal scope", () => {
    const { calls } = makeModal();
    const probe = makeModal();
    registerSelectionCopy(probe.modal);
    expect(probe.calls).toEqual([[["Mod"], "c"], [["Mod"], "a"]]);
  });

  it("does not stack duplicate handlers when called twice on the same modal", () => {
    const probe = makeModal();
    registerSelectionCopy(probe.modal);
    registerSelectionCopy(probe.modal);
    expect(probe.calls).toEqual([[["Mod"], "c"], [["Mod"], "a"]]);
  });

  it("is a no-op when the modal has no usable scope", () => {
    expect(() => registerSelectionCopy({})).not.toThrow();
    expect(() => registerSelectionCopy(null)).not.toThrow();
  });
});

describe("registerSelectionCopy — Mod+C copy", () => {
  it("copies selected text inside the modal and returns false", () => {
    const { modal, copy } = makeModal({ containsNode: true });
    stubSelection("hello world");
    registerSelectionCopy(modal);
    expect(copy()).toBe(false);
    expect(writeText).toHaveBeenCalledWith("hello world");
  });

  it("returns true and copies nothing when there is no selection", () => {
    const { modal, copy } = makeModal({ containsNode: true });
    stubSelection(null);
    registerSelectionCopy(modal);
    expect(copy()).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("returns true and copies nothing for whitespace-only selection", () => {
    const { modal, copy } = makeModal({ containsNode: true });
    stubSelection("   \n  ");
    registerSelectionCopy(modal);
    expect(copy()).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("returns true and copies nothing when selection is outside the modal", () => {
    const { modal, copy } = makeModal({ containsNode: false });
    stubSelection("text from the editor behind the modal");
    registerSelectionCopy(modal);
    expect(copy()).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("returns true (lets native try) when clipboard API is unavailable", () => {
    const { modal, copy } = makeModal({ containsNode: true });
    stubSelection("hello");
    globalThis.navigator = {}; // no clipboard
    registerSelectionCopy(modal);
    expect(copy()).toBe(true);
  });
});

describe("registerSelectionCopy — Mod+A select-all", () => {
  // Build a selection stub that also captures range operations.
  function stubSelectAll({ activeTag = "DIV", isContentEditable = false } = {}) {
    const range = { selectNodeContents: vi.fn() };
    const sel = { removeAllRanges: vi.fn(), addRange: vi.fn() };
    globalThis.activeWindow = {
      getSelection: () => sel,
      document: {
        activeElement: { tagName: activeTag, isContentEditable },
        createRange: () => range
      }
    };
    return { range, sel };
  }

  it("selects all modal content and returns false on normal (non-editable) focus", () => {
    const { modal, selectAll } = makeModal();
    const { range, sel } = stubSelectAll({ activeTag: "DIV" });
    registerSelectionCopy(modal);
    expect(selectAll()).toBe(false);
    expect(range.selectNodeContents).toHaveBeenCalledWith(modal.modalEl);
    expect(sel.removeAllRanges).toHaveBeenCalled();
    expect(sel.addRange).toHaveBeenCalledWith(range);
  });

  it("lets native select-all run (returns true) when focus is in a textarea", () => {
    const { modal, selectAll } = makeModal();
    const { range } = stubSelectAll({ activeTag: "TEXTAREA" });
    registerSelectionCopy(modal);
    expect(selectAll()).toBe(true);
    expect(range.selectNodeContents).not.toHaveBeenCalled();
  });

  it("lets native select-all run when focus is in a contenteditable element", () => {
    const { modal, selectAll } = makeModal();
    const { range } = stubSelectAll({ activeTag: "DIV", isContentEditable: true });
    registerSelectionCopy(modal);
    expect(selectAll()).toBe(true);
    expect(range.selectNodeContents).not.toHaveBeenCalled();
  });
});
