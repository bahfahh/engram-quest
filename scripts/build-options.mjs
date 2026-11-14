// The esbuild options for main.js, shared by the build (esbuild.config.mjs) and the parity check
// (check-bundle-parity.mjs) so the two can never drift apart.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

export function buildOptions({ prod, sandbox = false, outfile = path.join(root, 'main.js') }) {
  return {
    entryPoints: [path.join(root, 'src/main.js')],
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
      '@lezer/lr',
    ],
    format: 'cjs',
    loader: { '.jpg': 'dataurl', '.mp3': 'dataurl' },
    define: {
      // Deep Dive page assets go into the sandboxed iframe as text, so they are not bundled as modules.
      __EXPLAINER_PAGE__: JSON.stringify({ css: read('src/explainer/page/page.css'), runtime: read('src/explainer/page/runtime.js') }),
      // The Help dialog's setup prompt: a store install has no assets/ folder to read it from.
      __SETUP_PROMPT__: JSON.stringify(read('assets/claude-desktop-prompt.txt')),
      // Polar profile in src/license/config.js. Only `npm run build:sandbox` passes sandbox; no environment
      // variable can switch it, so a leftover shell setting never ships a test checkout.
      __POLAR_SANDBOX__: JSON.stringify(sandbox === true),
    },
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    minify: prod,
    outfile,
  };
}
