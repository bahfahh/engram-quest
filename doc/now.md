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
- `npm test` runs vitest against `tests/` directory (46 tests, all pass).

## Current Architecture Truth
- `src/main.js` is 61.3 KB (down from 185 KB original — 67% reduction).
- Active incremental modularization is ongoing.
- Remaining inline residue in `src/main.js` is interleaved with must-keep items; full cleanup deferred.

## What Was Successfully Split
- `src/skills/installer.js`
- `src/harness/map.js`
- `src/quest/helpers.js`
- `src/quest/render.js`
- `src/quest/modal.js`
- `src/review/helpers.js`
- `src/review/decks.js`
- `src/review/render.js`
- `src/review/modal.js`
- `src/review/session.js` — Review session modal (`Q` class)
- `src/i18n/index.js` — i18n dictionary + translation helpers
- `src/fsrs/index.js` — FSRS-5 algorithm (pure math, no Obsidian dependency)
- `src/styles/index.js` — plugin CSS string
- `src/hub/settings.js` — Settings tab (`pe` class)
- `src/hub/skills.js` — Skills install/preview modals (`ce`, `de`) + installer helpers
- `src/hub/help.js` — Help modal (`fe` class)
- `src/hub/modal.js` — Hub modal shell and tab switching (`ne` class)

## What Is Still Active In `src/main.js`
- Legacy `engram-quest` block processor (`ze`, `Ee`, `ue`, `Ge`, `B`, `qe`, `Pe`)
- Harness map data (`q[]`, `ae`, `H[]`, `Ue`)
- Quest theme colors (`Y`)
- Inline residue of already-extracted modules (overridden by reassignment section at bottom)
- Plugin bootstrap and `onload` (`he` class) — do not touch

## Testing
- Framework: vitest
- Test files: `tests/i18n.test.js` (23), `tests/fsrs.test.js` (20), `tests/review-session.test.js` (3)
- Obsidian API mock: `tests/__mocks__/obsidian.js` + `node_modules/obsidian/` stub
- Run: `npm test`
- All 46 tests pass.

## Important Failure Learned
- Replacing active Hub/Help runtime with split modules previously broke the UI (`[object Object]`, layout corruption).
- Root cause: active UI ownership and runtime compatibility, not bundle parity.
- Help modal was successfully extracted on 2026-04-10 without issues (i18n now independent).

## Current Safe Baseline
- Hub modal (`ne`) is the last major UI block. Defer until ready.
- Fix runtime bugs from the current working baseline.
- Next safe extractions: Hub modal (`ne`), or cleanup of inline residue (Option B from analysis).

## Backup
- `tmp/refactor-backup/main.js.bak` — original before any refactor
- `tmp/refactor-backup/main-post-i18n.js.bak` — after i18n extraction
- `tmp/refactor-backup/main-post-fsrs.js.bak` — after FSRS extraction
- `tmp/refactor-backup/main-post-styles.js.bak` — after CSS + review session extraction
- `tmp/refactor-backup/main-post-session.js.bak` — after settings tab extraction
- `tmp/refactor-backup/main-post-settings.js.bak` — after skills modals extraction
- `tmp/refactor-backup/main-post-skills.js.bak` — after help modal extraction (current baseline)
- Do not remove backups until confirmed stable.

## Structure Change Already Done
- `10.非筆記用資料夾/` has been renamed to `doc/`.
- Skills source has been moved from `doc/開發計劃/skills/` to `skills/`.

## Document Convention
- `doc/now.md` only records currently true facts.
- When architecture or build flow changes, update: `AGENTS.md`, `CLAUDE.md`, `README.md`, `doc/now.md`.
