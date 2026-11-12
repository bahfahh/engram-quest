// A name that is used but never declared throws only when that line runs, so a screen no test opens
// can ship broken (ticket-035: the quest map window kept passing `assetRoot` after its declaration was
// removed, and stopped drawing nodes). This runs ESLint's no-undef on every file in src/, with the
// globals eslint.config.mjs declares for them (browser, Obsidian, CommonJS, esbuild defines).
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ESLint, Linter } from "eslint";

const config = await new ESLint().calculateConfigForFile("src/main.js");
const linter = new Linter({ configType: "flat" });

function undeclared(code) {
  return linter
    .verify(code, [{
      languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: config.languageOptions.globals },
      rules: { "no-undef": "error" },
    }])
    .filter((message) => message.ruleId === "no-undef" || message.fatal)
    .map((message) => `${message.line}:${message.column} ${message.message}`);
}

// The generated data files (embedded skills and images) hold no code.
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return entry.name.endsWith(".js") && !entry.name.startsWith("embedded") ? [file] : [];
  });
}

describe("undeclared identifiers", () => {
  it("is a check that sees one", () => {
    expect(undeclared("function draw(node) { return paint(node, assetRoot); }\nfunction paint() {}")).toEqual([
      "1:42 'assetRoot' is not defined.",
    ]);
    expect(undeclared('module.exports = typeof __NOT_DEFINED__ === "undefined" ? activeDocument.body : window;')).toEqual([]);
  });

  it("finds none in src/", () => {
    const offenders = sourceFiles("src").flatMap((file) =>
      undeclared(fs.readFileSync(file, "utf8")).map((found) => `${file.replaceAll("\\", "/")}:${found}`));
    expect(offenders).toEqual([]);
  });

  it("stays on in the ESLint scan (npx eslint src/)", () => {
    expect([config.rules["no-undef"]].flat()[0]).toBe(2);
  });
});
