import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { renderUpgradeContent, ProWelcomeModal, activateKey } = require("../src/license/upgrade");
const { Modal } = require("obsidian");
const { assetUrl } = require("../src/assets");
// A data URL after a build (embedded), a plugin-folder path before one.
const APP = { vault: { configDir: "custom", adapter: { getResourcePath: path => `app://${path}` } } };

class Element {
  constructor(tag, opts = {}) {
    this.tag = tag; this.text = opts.text || ""; this.cls = opts.cls || "";
    this.attributes = { ...opts.attr }; this.children = []; this.events = {}; this.value = "";
  }
  createEl(tag, opts) { const child = new Element(tag, opts); this.children.push(child); return child; }
  addClass(name) { this.cls += ` ${name}`; }
  setAttribute(name, value) { this.attributes[name] = value; }
  setText(value) { this.text = value; }
  toggleClass(name, on) { const set = new Set(this.cls.split(" ").filter(Boolean)); if (on) set.add(name); else set.delete(name); this.cls = [...set].join(" "); }
  addEventListener(name, fn) { this.events[name] = fn; }
  all() { return [this, ...this.children.flatMap(child => child.all())]; }
  scrollIntoView() { this.scrolled = true; }
  focus() { this.focused = true; }
  querySelector(selector) { return this.all().find(el => el.cls.split(" ").includes(selector.slice(1))); }
}
function setup(active = false, link = "https://checkout.example/test", refresh = vi.fn()) {
  const root = new Element("div");
  const close = vi.fn(), checkout = vi.fn();
  const plugin = {
    settings: { language: "zh-tw", licenseValid: active },
    manifest: { id: "engram-quest", dir: "custom/plugins/engram-quest" },
    app: { vault: { configDir: "custom", adapter: { getResourcePath: path => `app://${path}` } } },
    license: { config: { environment: "sandbox", checkoutUrl: link, organizationId: "13564b2c-5a08-4d30-a419-bbcfcba599dd", benefitId: "9ef5dc28-a7cd-440f-beae-fc405fd9be81" }, refresh },
  };
  renderUpgradeContent(root, plugin, { close, checkout });
  return { root, close, checkout, plugin };
}

describe("Pro upgrade overview", () => {
  it("shows four shipped features and uses separate theme assets", () => {
    const { root } = setup();
    expect(root.all().filter(el => el.cls === "eq-pro-feature")).toHaveLength(4);
    expect(root.querySelector(".eq-pro-research")).toBeFalsy();
    const images = root.all().filter(el => el.tag === "img");
    expect(images.map(el => el.src)).toEqual([
      assetUrl(APP, "assets/pro/learning-notebook-light.webp"),
      assetUrl(APP, "assets/pro/learning-notebook-dark.webp"),
    ]);
  });
  it("opens details on demand and preserves an accessible expanded state", () => {
    const { root } = setup();
    const button = root.querySelector(".eq-pro-feature-toggle");
    const detail = root.querySelector(".eq-pro-detail");
    expect(detail.hidden).toBe(true);
    button.events.click();
    expect(detail.hidden).toBe(false);
    expect(button.attributes["aria-expanded"]).toBe("true");
    button.events.click();
    expect(button.attributes["aria-expanded"]).toBe("false");
  });
  it("only purchases after an explicit action; continuing free closes without checkout", () => {
    const { root, close, checkout } = setup();
    expect(checkout).not.toHaveBeenCalled();
    const buttons = root.querySelector(".eq-pro-actions").children;
    buttons[1].events.click();
    expect(close).toHaveBeenCalledOnce();
    expect(checkout).not.toHaveBeenCalled();
    const box = root.querySelector(".eq-pro-key");
    expect(box.hidden).toBe(true);
    buttons[0].events.click();
    expect(checkout).toHaveBeenCalledOnce();
    // Paying does not unlock Pro, so buying opens the key box and marks it as the next step.
    expect(box.hidden).toBe(false);
    expect(box.cls).toContain("is-next");
    expect(root.querySelector(".eq-pro-key-hint").hidden).toBe(true);
    expect(box.querySelector(".eq-pro-em").text).toBe("貼上授權 key");
    expect(root.querySelector(".eq-pro-key-hint").querySelector(".eq-pro-em").text).toBe("複製授權 key");
    expect(box.all().find(el => el.tag === "input").focused).toBe(true);
  });
  it("lets a returning buyer open the key box without any warning", () => {
    const { root, checkout } = setup();
    const box = root.querySelector(".eq-pro-key");
    root.querySelector(".eq-pro-key-open").events.click();
    expect(box.hidden).toBe(false);
    expect(box.cls).not.toContain("is-next");
    expect(box.all().find(el => el.tag === "input").focused).toBe(true);
    expect(checkout).not.toHaveBeenCalled();
  });
  it("activates a pasted key inside the upgrade window and welcomes the new Pro user", async () => {
    let plugin;
    const refresh = vi.fn(async () => { plugin.settings.licenseValid = true; return { valid: true, status: "active" }; });
    const ctx = setup(false, undefined, refresh);
    plugin = ctx.plugin;
    const box = ctx.root.querySelector(".eq-pro-key");
    const input = box.all().find(el => el.tag === "input");
    const go = box.all().find(el => el.tag === "button");
    const status = box.querySelector(".eq-pro-key-status");
    expect(go.disabled).toBe(false);
    await go.events.click();
    expect(status.text).toBe("請先輸入授權 key。");
    expect(refresh).not.toHaveBeenCalled();
    input.value = "  EQPRO-KEY  ";
    await go.events.click();
    expect(refresh).toHaveBeenCalledWith({ key: "EQPRO-KEY", force: true });
    expect(ctx.close).toHaveBeenCalledOnce();
    expect(Modal.lastCreated).toBeInstanceOf(ProWelcomeModal);
  });
  it("keeps the window open and explains a rejected key", async () => {
    const refresh = vi.fn(async () => ({ valid: false, status: "invalid" }));
    const { root, close } = setup(false, undefined, refresh);
    const box = root.querySelector(".eq-pro-key");
    box.all().find(el => el.tag === "input").value = "WRONG";
    await box.all().find(el => el.tag === "button").events.click();
    expect(box.querySelector(".eq-pro-key-status").text).toBe("此 key 無效、已到期、已撤銷，或屬於其他商品。");
    expect(close).not.toHaveBeenCalled();
  });
  it("ignores Enter while a check is already running", async () => {
    let finish;
    const refresh = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const { root } = setup(false, undefined, refresh);
    const box = root.querySelector(".eq-pro-key");
    const input = box.all().find(el => el.tag === "input");
    input.value = "EQPRO-KEY";
    const first = input.events.keydown({ key: "Enter" });
    input.events.keydown({ key: "Enter" });
    expect(refresh).toHaveBeenCalledOnce();
    finish({ valid: false, status: "invalid" });
    await first;
    expect(box.querySelector(".eq-pro-key-status").cls).toContain("is-error");
  });
  it("welcomes only when the activation turned Pro on", async () => {
    const plugin = { settings: { licenseValid: true }, app: {}, license: { refresh: vi.fn(async () => ({ valid: true, status: "active" })) } };
    Modal.lastCreated = null;
    const onActive = vi.fn();
    await activateKey(plugin, "EQPRO-KEY", { onActive });
    expect(onActive).toHaveBeenCalledOnce();
    expect(Modal.lastCreated).toBeNull();
  });
  it("does not offer another purchase to an activated user", () => {
    const { root, close, checkout } = setup(true);
    expect(root.querySelector(".eq-pro-key")).toBeFalsy();
    const action = root.querySelector(".eq-pro-actions").children[0];
    expect(action.text).toBe("Pro 已啟用");
    action.events.click();
    expect(close).toHaveBeenCalledOnce();
    expect(checkout).not.toHaveBeenCalled();
  });
  it("disables checkout when a link is not configured", () => {
    const { root } = setup(false, "");
    expect(root.querySelector(".eq-pro-actions").children[0].disabled).toBe(true);
  });
});
