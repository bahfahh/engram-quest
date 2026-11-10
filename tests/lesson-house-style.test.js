import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { MOBILE_GRID_FIX } from "../src/lessons/viewer-modal.js";

const root = path.resolve(__dirname, "..");

// Runs the viewer's appended script against a fake page holding one three-column grid, 300px wide,
// on a phone-width viewport. Returns the grid's inline grid-template-columns afterwards.
function runGridFix(bodyClasses) {
  const grid = { clientWidth: 300, style: { gridTemplateColumns: "" } };
  const document = {
    readyState: "complete",
    body: { classList: { contains: (name) => bodyClasses.includes(name) } },
    querySelectorAll: () => [grid],
    addEventListener() {},
  };
  const window = { innerWidth: 390, addEventListener() {} };
  const getComputedStyle = () => ({ display: "grid", gridTemplateColumns: "100px 100px 100px" });
  const script = MOBILE_GRID_FIX.replace(/<\/?script>/g, "");
  new Function("window", "document", "getComputedStyle", script)(window, document, getComputedStyle);
  return grid.style.gridTemplateColumns;
}

describe("lesson viewer phone rescue", () => {
  it("collapses a narrow grid in a lesson without the house style", () => {
    expect(runGridFix([])).toBe("1fr");
  });

  it("leaves a house-style lesson's grids alone", () => {
    expect(runGridFix(["lz"])).toBe("");
  });
});

describe("lesson house style assets", () => {
  it("every file the installer lists for a skill exists in skills/", () => {
    const installer = fs.readFileSync(path.join(root, "src/skills/installer.js"), "utf8");
    const sources = [...installer.matchAll(/source:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(sources.length).toBeGreaterThan(20);
    const missing = sources.filter((s) => !fs.existsSync(path.join(root, "skills", s)));
    expect(missing).toEqual([]);
  });

  it("the stylesheet has a scheme for every colour the plugin can give a course", () => {
    const data = fs.readFileSync(path.join(root, "src/lessons/data.js"), "utf8");
    const names = data.slice(data.indexOf("const SCHEME_NAMES"), data.indexOf("];", data.indexOf("const SCHEME_NAMES"))).match(/"([a-z]+)"/g).map((s) => s.slice(1, -1));
    const css = fs.readFileSync(path.join(root, "skills/lesson-academy/assets/lesson-base.css"), "utf8");
    expect(names.length).toBe(12);
    // indigo is the default palette on .lz; every other scheme needs a light and a dark rule
    const missing = names.filter((n) => n !== "indigo" && !(css.includes(`.c-${n}{`) && css.includes(`.c-${n}.dark{`)));
    expect(missing).toEqual([]);
  });
});
