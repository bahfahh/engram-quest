import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const questHelpers = require("../src/quest/helpers.js");
const { renderQuestChallenge } = require("../src/quest/modal.js");

class TestEl {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.parent = null;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.disabled = false;
    this.value = "";
    this._text = "";
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name) => {
        if (this.classNames.has(name)) {
          this.classNames.delete(name);
          return false;
        }
        this.classNames.add(name);
        return true;
      },
    };
  }

  createEl(tag, opts = {}) {
    const child = new TestEl(tag);
    if (opts.text !== undefined) child.textContent = opts.text;
    if (opts.attr) {
      Object.entries(opts.attr).forEach(([key, value]) => {
        child.attributes[key] = value;
        if (key === "class") {
          String(value).split(/\s+/).filter(Boolean).forEach((name) => child.classList.add(name));
        } else if (key === "style") {
          child.attributes.style = value;
        } else {
          child[key] = value;
        }
      });
    }
    this.appendChild(child);
    return child;
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  empty() {
    this.children = [];
    this._text = "";
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  removeEventListener() {}

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  querySelectorAll(selector) {
    return this.all().filter((el) => {
      if (selector.startsWith(".")) return el.classNames.has(selector.slice(1));
      return el.tag === selector;
    });
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  all() {
    return [this, ...this.children.flatMap((child) => child.all())];
  }

  click() {
    (this.listeners.click || []).forEach((handler) => handler({ stopPropagation() {} }));
  }

  keydown(key) {
    (this.listeners.keydown || []).forEach((handler) => handler({ key }));
  }

  get textContent() {
    return [this._text, ...this.children.map((child) => child.textContent)].join("");
  }

  set textContent(value) {
    this._text = String(value ?? "");
  }
}

function makeDeps() {
  return {
    ...questHelpers,
    getLanguage: vi.fn(() => "en"),
    translateKey: vi.fn((_, key) => key === "SHOW_ANSWER" ? "Show answer" : key),
  };
}

function findByText(root, text, tag = null) {
  return root.all().find((el) => (!tag || el.tag === tag) && el.textContent.includes(text));
}

beforeEach(() => {
  global.window = {
    setTimeout: (fn) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.window;
});

describe("quest-map learning UX", () => {
  it("scores only first-try answers and reviews false answers with explanations", () => {
    const container = new TestEl();

    renderQuestChallenge(
      container,
      {
        type: "truefalse",
        questions_json: [
          {
            statement: "Transaction rollback always isolates background jobs.",
            ans: false,
            explanation: "Background jobs may use a different DB connection outside the test transaction.",
          },
          {
            statement: "truncate/reseed is safer for API + DB integration tests.",
            ans: true,
            explanation: "Full-stack tests often cross request and connection boundaries.",
          },
        ],
      },
      "medium",
      () => {},
      {},
      {},
      "Testing.md",
      makeDeps(),
      { score: 0, lives: 3, coins: 100, streak: 0 },
    );

    findByText(container, "True", "button").click();
    findByText(container, "False", "button").click();
    findByText(container, "True", "button").click();

    expect(container.textContent).toContain("1 / 2");
    expect(container.textContent).toContain("Transaction rollback always isolates background jobs.");
    expect(container.textContent).toContain("False");
    expect(container.textContent).toContain("Background jobs may use a different DB connection");
    expect(container.textContent).toContain("Missed");
  });

  it("shows cloze question context before the blanked sentence", () => {
    const container = new TestEl();

    renderQuestChallenge(
      container,
      {
        type: "cloze",
        question: "What condition makes rollback reliable?",
        sentence: "Rollback works inside the same {{c1::transaction scope}}.",
        answers: ["transaction scope"],
      },
      "medium",
      () => {},
      {},
      {},
      "Testing.md",
      makeDeps(),
    );

    expect(container.textContent).toContain("What condition makes rollback reliable?");
  });

  it("renders match-pair challenge text without inline selection blocking", () => {
    const container = new TestEl();

    renderQuestChallenge(
      container,
      {
        type: "match",
        question: "Match each layer to its defense.",
        pairs: [
          ["Application layer", "Token budget quota"],
          ["Network edge", "DDoS protection"],
        ],
      },
      "medium",
      () => {},
      {},
      {},
      "Security.md",
      makeDeps(),
    );

    const buttons = container.querySelectorAll(".qm-ch-btn");
    expect(container.textContent).toContain("Application layer");
    expect(container.textContent).toContain("Token budget quota");
    expect(buttons).toHaveLength(4);
    buttons.forEach((button) => {
      expect(button.attributes.style || "").not.toContain("user-select:none");
      expect(button.attributes.style || "").not.toContain("user-select: none");
    });
  });

  it("lets input challenges reveal the answer without counting as first-try correct", () => {
    const container = new TestEl();

    renderQuestChallenge(
      container,
      {
        type: "input",
        questions_json: [
          {
            q: "Rollback is reliable only under what shared condition?",
            keywords: ["same connection"],
            explanation: "Rollback only covers writes inside the same connection and transaction scope.",
          },
        ],
      },
      "medium",
      () => {},
      {},
      {},
      "Testing.md",
      makeDeps(),
      { score: 0, lives: 3, coins: 100, streak: 0 },
    );

    const input = container.querySelector("input");
    input.value = "wait longer";
    findByText(container, "Submit", "button").click();
    findByText(container, "Show answer", "button").click();

    expect(container.textContent).toContain("0 / 1");
    expect(container.textContent).toContain("same connection");
    expect(container.textContent).toContain("Rollback only covers writes");
    expect(container.textContent).toContain("Revealed");
  });
});
