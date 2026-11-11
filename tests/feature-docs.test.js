import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const registry = require("./feature-registry");
const createInstaller = require("../src/skills/installer");
const { FEATURES } = require("../src/license/upgrade");
const { categories } = require("../src/hub/categories");
const { hasFeatureGuide } = require("../src/hub/feature-guide");

const read = (p) => readFileSync(p, "utf8");
const readme = read("README.md");
const zhStart = readme.indexOf("# 🇹🇼");
const README = { en: readme.slice(0, zhStart), zh: readme.slice(zhStart) };
const headings = (text) => [...text.matchAll(/^#{2,3} .*$/gm)].map((m) => m[0]);
const named = (text, names) => names.some((n) => text.toLowerCase().includes(n.toLowerCase()));

describe("code matches the feature registry", () => {
  const tabsOf = (licenseValid) => categories({ language: "en", licenseValid }).flatMap((cat) => cat.tabs);

  it("shows every tab to Pro users, in order", () => {
    expect(tabsOf(true)).toEqual(registry.tabs.map((tab) => tab.id));
  });

  it("hides only the Pro tabs from free users", () => {
    expect(tabsOf(false)).toEqual(registry.tabs.filter((tab) => !tab.pro).map((tab) => tab.id));
  });

  it("installs the Pro skills only for Pro users", () => {
    const proModules = createInstaller({}).MODULES.filter((m) => m.pro).map((m) => m.id).sort();
    expect(proModules).toEqual(registry.pro.filter((p) => p.module).map((p) => p.module).sort());
  });

  it("lists the same Pro features in the Pro dialog", () => {
    expect(FEATURES.map((f) => f.id)).toEqual(registry.pro.map((p) => p.id));
    expect(FEATURES.filter((f) => f.research)).toEqual([]);
  });
});

describe("docs describe every feature", () => {
  it("gives every tab a first-run guide", () => {
    expect(registry.tabs.filter((tab) => !hasFeatureGuide(tab.id)).map((tab) => tab.id)).toEqual([]);
  });

  for (const lang of ["en", "zh"]) {
    it(`gives every tab a README section in ${lang}, marked Pro only when it is`, () => {
      const hs = headings(README[lang]);
      for (const tab of registry.tabs) {
        const h = hs.find((line) => named(line, tab[lang]));
        expect(h, `${lang} README heading for ${tab.id}`).toBeTruthy();
        expect(/\bPro\b/.test(h), `${lang} README heading for ${tab.id}: ${h}`).toBe(tab.pro);
      }
    });

    it(`lists every Pro feature in the ${lang} README Pro table`, () => {
      const table = README[lang].slice(README[lang].search(/^#{2,3} .*Pro/m));
      for (const p of registry.pro) expect(named(table, p[lang]), `${lang} Pro table: ${p.id}`).toBe(true);
    });
  }

  it("covers every tab and Pro feature in the help, in both languages", () => {
    const help = read("src/hub/help-content.js");
    const zh = help.slice(help.indexOf("zh:"), help.indexOf("en:"));
    const en = help.slice(help.indexOf("en:"));
    for (const [lang, text] of [["en", en], ["zh", zh]]) {
      for (const item of [...registry.tabs, ...registry.pro]) {
        expect(named(text, item[lang]), `${lang} help: ${item.id}`).toBe(true);
      }
    }
  });
});

describe("docs describe the shipped product", () => {
  const sources = ["README.md", "src/hub/help-content.js", "src/hub/feature-guide.js", "src/license/upgrade.js", "src/i18n/index.js"];

  it("never calls a shipped feature a preview or research", () => {
    const stale = /in research|still in research|研究中|\(preview\)|（預覽）|預覽版/i;
    expect(sources.filter((p) => stale.test(read(p)))).toEqual([]);
  });

  it("only tells users to run skills the plugin installs", () => {
    expect(sources.filter((p) => /macro-review|engram-quadrant/.test(read(p)))).toEqual([]);
  });
});
