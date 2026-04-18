// Minimal Obsidian API mock for unit tests
export class Modal {
  constructor(app) { this.app = app; this.contentEl = new MockEl(); this.modalEl = new MockEl(); }
  open() {}
  close() {}
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting { setName() { return this; } setDesc() { return this; } addText() { return this; } addToggle() { return this; } addDropdown() { return this; } addSlider() { return this; } addButton() { return this; } addTextArea() { return this; } }
export class Notice { constructor(msg) {} }
export function normalizePath(p) { return p; }
export const moment = { locale: () => "en" };
export const MarkdownRenderer = { renderMarkdown: () => {} };

class MockEl {
  constructor() { this.style = {}; this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; this.dataset = {}; }
  createEl(tag, opts = {}) { const el = new MockEl(); if (opts.text) el.textContent = opts.text; if (opts.attr) Object.assign(el.dataset, opts.attr); return el; }
  empty() {}
  addClass() {}
  querySelector() { return new MockEl(); }
  querySelectorAll() { return []; }
  appendChild() {}
  addEventListener() {}
  removeEventListener() {}
  remove() {}
  setProperty() {}
  get innerHTML() { return ""; }
  set innerHTML(v) {}
  get textContent() { return ""; }
  set textContent(v) {}
}
