// Rebuilds main.js from the current source into a temp file and checks it is byte-identical to the
// main.js in the repo: a release must ship exactly what the source builds. Run after `npm run build`.
import esbuild from "esbuild";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { buildOptions } from "./build-options.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "engramquest-bundle-"));
const outputFile = path.join(tempDir, "main.parity.js");
const sha256 = filePath => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

try {
  await esbuild.build({ ...buildOptions({ prod: true, outfile: outputFile }), logLevel: "silent" });
  const currentMain = path.join(repoRoot, "main.js");
  const currentHash = sha256(currentMain);
  const parityHash = sha256(outputFile);
  const matches = currentHash === parityHash;
  console.log(JSON.stringify({ matches, currentHash, parityHash }, null, 2));
  if (!matches) process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
