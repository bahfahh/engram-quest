import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = new Set(process.argv.slice(2));
const prod = args.has('--prod');
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

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr'
  ],
  format: 'cjs',
  loader: { '.jpg': 'dataurl', '.mp3': 'dataurl' },
  // Deep Dive page assets go into the sandboxed iframe as text, so they are not bundled as modules.
  define: {
    __EXPLAINER_PAGE__: JSON.stringify({
      css: fs.readFileSync(path.join(__dirname, 'src/explainer/page/page.css'), 'utf8'),
      runtime: fs.readFileSync(path.join(__dirname, 'src/explainer/page/runtime.js'), 'utf8'),
    }),
  },
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  minify: prod,
  outfile: 'main.js',
});

if (sync) {
  await runSync();
}
