# EngramQuest

Standalone source repository for the EngramQuest Obsidian plugin.

## Current Architecture

- Source entry: `src/main.js`
- Build output: `main.js`
- Runtime plugin dir: `../Obsidian_Note/.obsidian/plugins/engram-quest/`
- Planning docs: `10.非筆記用資料夾/開發計劃/`
- Current status note: `10.非筆記用資料夾/now.md`

The runtime release shape is still a single bundled `main.js`.

Internally, the repo is now in a gradual modularization phase:
- `src/main.js` remains the only entrypoint
- extracted logic lives under `src/skills/`, `src/harness/`, `src/quest/`, and `src/review/`
- `src/main.js` reconnects those modules at the tail to preserve runtime behavior

## Extracted Modules

- `src/skills/installer.js`
- `src/harness/map.js`
- `src/quest/helpers.js`
- `src/quest/render.js`
- `src/quest/modal.js`
- `src/review/helpers.js`
- `src/review/decks.js`
- `src/review/render.js`
- `src/review/modal.js`

## Commands

```powershell
npm install
node scripts/sync-bundled-skills.js
npm run build
npm run check:bundle-parity
npm run build:sync
```

`build:sync` updates `bundled-skills`, rebuilds `main.js`, then syncs runtime files into `../Obsidian_Note/.obsidian/plugins/engram-quest/`.

## Notes

- Do not edit repo-root `main.js` directly.
- Keep `src/main.js` as the only source entry.
- The current goal is maintainable internal source organization while preserving the single-bundle runtime contract.
