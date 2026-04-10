# Now

## Date
- 2026-04-10

## Current Truth
- Source entry is still `src/main.js`.
- Build output is repo-root `main.js`.
- Skills source lives under `skills/`.
- `bundled-skills/` is a generated repo artifact, not the source of truth.
- Runtime plugin is `../Obsidian_Note/.obsidian/plugins/engram-quest/`.
- Planning docs live under `doc/開發計劃/`.

## Build / Deploy Contract
- `npm run sync:bundled-skills` generates repo-root `bundled-skills/` from `skills/`.
- `npm run build` updates `bundled-skills/` and rebuilds `main.js`.
- `npm run build` should work without an Obsidian vault.
- `npm run sync:vault` copies repo artifacts into the runtime plugin directory.
- `npm run build:sync` runs build first, then syncs the runtime.
- `npm test` runs vitest against `tests/` directory (43 tests, all pass).

## Current Architecture Truth
- The repo is in active incremental modularization.
- `src/main.js` is still the active owner for Hub/UI/Settings/Skills/Help behavior.
- Extracted modules exist under `src/skills/`, `src/harness/`, `src/quest/`, `src/review/`, `src/i18n/`, `src/fsrs/`, `src/styles/`.

## What Was Successfully Split
- `src/skills/installer.js`
- `src/harness/map.js`
- `src/quest/helpers.js`
- `src/quest/render.js`
- `src/quest/modal.js`
- `src/review/helpers.js`
- `src/review/decks.js`
- `src/review/render.js`
- `src/review/session.js` — Review session modal (`Q` class)
- `src/i18n/index.js` — i18n dictionary + translation helpers (Se, L, Ze, c, C)
- `src/fsrs/index.js` — FSRS-5 algorithm (pure math, no Obsidian dependency)
- `src/styles/index.js` — plugin CSS string (He)

## What Is Still Active In `src/main.js`
- Hub modal shell and tab switching (`ne` class)
- Help modal (`fe` class)
- Skills install/preview modals (`ce`, `de` classes)
- Settings tab (`pe` class)
- Plugin bootstrap and `onload` (`he` class)
- Harness map data (q[], ae, H[]) and legacy `engram-quest` block processor

## Testing
- Framework: vitest
- Test files: `tests/i18n.test.js` (23 tests), `tests/fsrs.test.js` (20 tests), `tests/review-session.test.js` (3 tests)
- Obsidian API mock: `tests/__mocks__/obsidian.js` (aliased via `vitest.config.js`)
- Run: `npm test`
- All 46 tests pass as of 2026-04-10.

## Important Failure Learned
- Replacing active Hub/Help runtime with the split `src/hub/modal.js` and `src/hub/help.js` broke the UI.
- The visible result was `[object Object]` and layout corruption.
- The issue is active UI ownership and runtime compatibility, not bundle parity.

## Current Safe Baseline
- Keep Hub/Help/Review session/Settings on the old active path inside `src/main.js`.
- Fix runtime bugs from the current working baseline instead of swapping the whole Hub implementation.
- Next safe extractions: Settings tab (`pe`), Skills modals (`ce`, `de`), Review session modal (`Q`).

## Backup
- `tmp/refactor-backup/main.js.bak` — original before any refactor
- `tmp/refactor-backup/main-post-i18n.js.bak` — after i18n extraction
- `tmp/refactor-backup/main-post-styles.js.bak` — after CSS extraction + review session extraction (current baseline)
- Do not remove backups until confirmed stable.
