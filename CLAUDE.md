# EngramQuest Plugin Repo

This repository is the standalone source repo for the EngramQuest Obsidian plugin.

## Source / Build Contract

- Source entry: `src/main.js`
- Built artifact: `main.js`
- Skills source: `skills/`
- Generated skills artifact: `bundled-skills/`
- Runtime plugin dir: `../Obsidian_Note/.obsidian/plugins/engram-quest/`
- Planning docs: `doc/開發計劃/`
- Current architecture status: `doc/now.md`

## Important Context

- `src/main.js` is still the only entrypoint.
- It is not yet a clean small source file; it remains a monolithic bundle-style source file maintained in place.
- The repo is in active incremental modularization:
  - Already extracted: `src/i18n/`, `src/fsrs/`, `src/styles/`, `src/skills/`, `src/harness/`, `src/quest/`, `src/review/`
  - Still in `src/main.js`: Hub modal, Help modal, Review session modal, Skills modals, Settings tab, plugin bootstrap
  - Keep release output as one bundled `main.js`
- Do not treat this repo as fully refactored. It is a controlled transition state.
- Tests: `npm test` runs vitest against `tests/` (43 tests, all pass).

## Build / Deploy Rules

- `skills/` is the source of truth.
- `bundled-skills/` is a generated repo artifact and part of the plugin release payload.
- `npm run build` must work without an Obsidian vault present.
- `npm run build:sync` is the deploy step for local vault testing.
- `sync-bundled-skills.js` generates repo artifacts.
- `sync-to-vault.mjs` deploys repo artifacts into the Obsidian runtime directory.

## Workflow

```powershell
npm install
npm run sync:bundled-skills
npm run build
npm run check:bundle-parity
npm run sync:vault
npm run build:sync
```

## Rules

- Do not edit repo-root `main.js` directly.
- Keep `src/main.js` as the only source entry.
- Preserve the single-bundle runtime release shape.
- Prefer extracting helpers, renderers, and modal logic before touching plugin bootstrap or lifecycle wiring.
- If architecture or workflow changes, update:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `README.md`
  - `doc/now.md`
