// CommonJS Obsidian API mock for modules that call require("obsidian") in tests.
class MockEl {
  constructor() {
    this.style = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    this.dataset = {};
  }
  createEl(tag, opts = {}) {
    const el = new MockEl();
    if (opts.text) el.textContent = opts.text;
    if (opts.attr) Object.assign(el.dataset, opts.attr);
    return el;
  }
  empty() {}
  addClass() {}
  setAttr(key, value) { this[key] = value; }
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

class Modal {
  constructor(app) {
    this.app = app;
    this.contentEl = new MockEl();
    this.modalEl = new MockEl();
  }
  open() {}
  close() {}
}

class Plugin {}
class PluginSettingTab {}
class Setting {
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addDropdown() { return this; }
  addSlider() { return this; }
  addButton() { return this; }
  addTextArea() { return this; }
}
class Notice { constructor(msg) {} }

const activeDocument = typeof document !== "undefined" ? document : {
  body: { classList: { contains: () => false }, appendChild: () => {}, createEl: () => ({}) },
  head: { appendChild: () => {} },
  getElementById: () => null,
  createElement: () => ({ textContent: "", id: "", style: {}, remove: () => {}, addEventListener: () => {} }),
  addEventListener: () => {},
  removeEventListener: () => {},
};

module.exports = {
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  normalizePath: p => p,
  moment: { locale: () => "en" },
  MarkdownRenderer: { renderMarkdown: () => {} },
  sanitizeHTMLToDom: () => new MockEl(),
  activeDocument,
};
