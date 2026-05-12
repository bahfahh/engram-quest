import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function listJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...listJsFiles(path));
    else if (path.endsWith(".js")) files.push(path.replaceAll("\\", "/"));
  }
  return files;
}

describe("ESLint hygiene", () => {
  it("uses window-qualified timers in source files", () => {
    const offenders = [];
    const bareTimerPattern = /(?<![\w.])(?:setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/g;

    for (const file of listJsFiles("src")) {
      const source = readFileSync(file, "utf8");
      const matches = source.match(bareTimerPattern);
      if (matches) offenders.push(`${file}: ${matches.join(", ")}`);
    }

    expect(offenders).toEqual([]);
  });

  it("configures manifest.json as JSON for ESLint", () => {
    const config = readFileSync("eslint.config.mjs", "utf8");

    expect(config).toContain('files: ["manifest.json"]');
    expect(config).toContain('language: "json/json"');
    expect(config).toContain('"obsidianmd/validate-manifest"');
  });
});
