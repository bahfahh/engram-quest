import esbuild from "esbuild";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "engramquest-bundle-"));
const outputFile = path.join(tempDir, "main.parity.js");
const external = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr"
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

try {
  await esbuild.build({
    entryPoints: [path.join(repoRoot, "src", "main.js")],
    bundle: true,
    external,
    format: "cjs",
    target: "es2018",
    logLevel: "silent",
    sourcemap: false,
    treeShaking: true,
    minify: true,
    outfile: outputFile
  });

  const currentMain = path.join(repoRoot, "main.js");
  const currentHash = sha256(currentMain);
  const parityHash = sha256(outputFile);
  const matches = currentHash === parityHash;

  console.log(JSON.stringify({
    matches,
    currentHash,
    parityHash,
    currentMain,
    parityFile: outputFile
  }, null, 2));

  if (!matches) {
    process.exitCode = 1;
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
