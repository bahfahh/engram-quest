import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { buildOptions } from './scripts/build-options.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = new Set(process.argv.slice(2));
const prod = args.has('--prod');
const sandbox = args.has('--sandbox');
const sync = args.has('--sync');

function runSync() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'scripts', 'sync-to-vault.mjs')], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sync-to-vault exited with code ${code}`));
    });
  });
}

await esbuild.build(buildOptions({ prod, sandbox }));
if (sandbox) console.warn('Built against the Polar SANDBOX. Run npm run build before any release.');

if (sync) {
  await runSync();
}
