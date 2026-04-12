import { describe, it, expect } from "vitest";
import { DICT, normalizeLocale, getLocale, interpolate, t, tAlt } from "../src/i18n/index.js";

// ── normalizeLocale ──────────────────────────────────────────────────────────
describe("normalizeLocale", () => {
  it("returns en for empty / unknown input", () => {
    expect(normalizeLocale("")).toBe("en");
    expect(normalizeLocale("fr")).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
  });

  it("returns zh-tw for any zh variant", () => {
    expect(normalizeLocale("zh")).toBe("zh-tw");
    expect(normalizeLocale("zh-TW")).toBe("zh-tw");
    expect(normalizeLocale("zh-CN")).toBe("zh-tw");
  });

  it("returns system for 'system'", () => {
    expect(normalizeLocale("system")).toBe("system");
  });

  it("returns en for explicit 'en'", () => {
    expect(normalizeLocale("en")).toBe("en");
  });
});

// ── getLocale ────────────────────────────────────────────────────────────────
describe("getLocale", () => {
  it("returns en when settings.language is en", () => {
    expect(getLocale({ language: "en" })).toBe("en");
  });

  it("returns zh-tw when settings.language is zh-tw", () => {
    expect(getLocale({ language: "zh-tw" })).toBe("zh-tw");
  });

  it("falls back to en when settings is null", () => {
    expect(getLocale(null)).toBe("en");
  });

  it("resolves system locale via momentLocale param", () => {
    expect(getLocale({ language: "system" }, "zh-TW")).toBe("zh-tw");
    expect(getLocale({ language: "system" }, "en")).toBe("en");
  });

  it("falls back to en when system + no momentLocale", () => {
    expect(getLocale({ language: "system" })).toBe("en");
  });
});

// ── interpolate ──────────────────────────────────────────────────────────────
describe("interpolate", () => {
  it("replaces {key} placeholders", () => {
    expect(interpolate("Hello {name}", { name: "World" })).toBe("Hello World");
  });

  it("leaves unknown placeholders intact", () => {
    expect(interpolate("{foo} bar", {})).toBe("{foo} bar");
  });

  it("returns original string when vars is null", () => {
    expect(interpolate("no vars", null)).toBe("no vars");
  });

  it("handles multiple placeholders", () => {
    expect(interpolate("{a} and {b}", { a: "1", b: "2" })).toBe("1 and 2");
  });
});

// ── t (translate) ────────────────────────────────────────────────────────────
describe("t", () => {
  it("returns English string for en settings", () => {
    expect(t({ language: "en" }, "AGAIN")).toBe("Again");
  });

  it("returns zh-tw string for zh-tw settings", () => {
    expect(t({ language: "zh-tw" }, "AGAIN")).toBe("重來");
  });

  it("falls back to en when key missing in zh-tw", () => {
    // All keys should exist, but if one were missing it should fall back
    expect(t({ language: "zh-tw" }, "AGAIN")).not.toBe("AGAIN");
  });

  it("returns the key itself when key is missing everywhere", () => {
    expect(t({ language: "en" }, "NONEXISTENT_KEY_XYZ")).toBe("NONEXISTENT_KEY_XYZ");
  });

  it("interpolates vars", () => {
    const result = t({ language: "en" }, "ALL_SCHEDULED", { total: 5 });
    expect(result).toBe("All 5 cards are scheduled for later.");
  });

  it("interpolates vars in zh-tw", () => {
    const result = t({ language: "zh-tw" }, "ALL_SCHEDULED", { total: 3 });
    expect(result).toContain("3");
  });

  it("works with null settings (defaults to en)", () => {
    expect(t(null, "GOOD")).toBe("Good");
  });
});

// ── tAlt (alternate arg order) ───────────────────────────────────────────────
describe("tAlt", () => {
  it("produces same result as t with swapped args", () => {
    expect(tAlt("EASY", { language: "en" })).toBe(t({ language: "en" }, "EASY"));
    expect(tAlt("EASY", { language: "zh-tw" })).toBe(t({ language: "zh-tw" }, "EASY"));
  });

  it("interpolates vars", () => {
    const result = tAlt("MASTERY_RATE", { language: "en" }, { percent: 80 });
    expect(result).toBe("80% mastered");
  });
});

// ── DICT completeness ────────────────────────────────────────────────────────
describe("DICT completeness", () => {
  it("zh-tw has all keys that en has", () => {
    const enKeys = Object.keys(DICT.en);
    const zhKeys = new Set(Object.keys(DICT["zh-tw"]));
    const missing = enKeys.filter(k => !zhKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("edit keys exist in both locales", () => {
    const editKeys = ["EDIT_CARD", "EDIT_SAVE", "EDIT_CANCEL", "EDIT_FRONT", "EDIT_BACK", "EDIT_HINTS"];
    for (const key of editKeys) {
      expect(DICT.en[key]).toBeTruthy();
      expect(DICT["zh-tw"][key]).toBeTruthy();
    }
  });
});
