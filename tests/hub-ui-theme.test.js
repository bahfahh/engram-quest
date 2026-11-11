import { describe, it, expect } from "vitest";
import { watchTheme } from "../src/hub/ui.js";
import { ReviewSessionModal } from "../src/review/session.js";

function fakeModal() {
  const handlers = [];
  const off = [];
  const classes = new Set();
  const modal = {
    app: {
      workspace: {
        on: (name, fn) => { const ref = { name, fn }; handlers.push(ref); return ref; },
        offref: (ref) => off.push(ref),
      },
    },
    modalEl: { toggleClass: (cls, on) => (on ? classes.add(cls) : classes.delete(cls)) },
    closed: 0,
    onClose() { this.closed++; },
  };
  return { modal, handlers, off };
}

describe("watchTheme", () => {
  it("listens for theme changes and stops listening when the dialog closes", () => {
    const { modal, handlers, off } = fakeModal();
    let changes = 0;
    watchTheme(modal, { onChange: () => changes++ });
    expect(handlers).toHaveLength(1);
    expect(handlers[0].name).toBe("css-change");

    handlers[0].fn();
    expect(changes).toBe(1);

    modal.onClose();
    expect(modal.closed).toBe(1);
    expect(off).toEqual([handlers[0]]);
  });
});

describe("review pill buttons", () => {
  it("enabling a button undoes everything disabling applied", () => {
    const classes = new Set();
    const btn = { disabled: false, title: "", classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } };
    const session = Object.create(ReviewSessionModal.prototype);

    session._disablePillBtn(btn, "nothing here");
    expect(btn.disabled).toBe(true);
    expect(classes.has("is-off")).toBe(true);

    session._enablePillBtn(btn);
    expect(btn.disabled).toBe(false);
    expect(classes.has("is-off")).toBe(false);
  });
});
