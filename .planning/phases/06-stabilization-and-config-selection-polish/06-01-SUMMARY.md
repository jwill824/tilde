---
phase: 06-stabilization-and-config-selection-polish
plan: 01
subsystem: cli-stabilization
tags: [stabilization, config-discovery, plugins, build-output, vitest]

requires:
  - milestone: v1.0
    provides: "Inventory, provenance, metadata registry, and source-aware config resolution are complete"
provides:
  - "Build output no longer depends on duplicated dist/src emission"
  - "Plugin list output explains first-party ownership as built in"
  - "Discovered configs are confirmed before config-first loading"
affects: [cli, plugins, config-discovery, build-output, integration-tests]

requirements-completed: [STAB-01, STAB-02, STAB-03]
github: [52, 60, 74]
completed: 2026-06-21
---

# Phase 06 Plan 01: Stabilization and Config Selection Polish Summary

**Build output cleanup, plugin ownership explanation, and discovered-config confirmation**

## Accomplishments

- Added a build-output regression test that asserts the published binary imports `dist/index.js` and no longer requires duplicated compiled source under `dist/src`.
- Added `scripts/fix-bin-output.cjs` and wired `npm run build` to rewrite the emitted bin import from `../src/index.js` to `../index.js`, then remove `dist/src`.
- Updated `tilde plugin list` output so first-party plugins display as `first-party (built in)`.
- Added CLI regression coverage for plugin list ownership output.
- Threaded `ConfigPathSource` from CLI startup into `App` and `ConfigFirstMode`.
- Added a confirmation prompt before loading auto-discovered configs while preserving immediate loading for explicit `--config`, `TILDE_CONFIG`, and positional sources.
- Added `ConfigFirstMode` unit coverage proving discovered configs are not read before confirmation and explicit configs still load without prompting.

## Files Created/Modified

- `scripts/fix-bin-output.cjs` - Post-build cleanup for bin import and duplicate `dist/src` output.
- `tests/unit/build-output.test.ts` - Regression coverage for generated output layout.
- `tests/unit/config-first.test.ts` - Discovered vs explicit config source behavior.
- `tests/integration/cli-regression.test.ts` - Plugin list ownership output coverage.
- `src/index.tsx` - Plugin source formatting and config source threading.
- `src/app.tsx` - Config source prop passed into config-first mode.
- `src/modes/config-first.tsx` - Discovered-config confirmation gate.
- `package.json` - Build script now runs post-build cleanup.

## Verification Commands

- `npm run build` - passed.
- `npm run test -- tests/unit/build-output.test.ts` - passed after build cleanup.
- `npm run test:integration -- tests/integration/cli-regression.test.ts` - passed, 22 tests and 1 existing todo.
- `npm run test -- tests/unit/config-first.test.ts tests/unit/build-output.test.ts` - passed, 6 tests.
- `npm run test -- tests/unit/config-discovery.test.ts tests/unit/tool-metadata.test.ts tests/unit/config-first.test.ts tests/unit/build-output.test.ts` - passed, 56 tests.

## Decisions Made

- Kept the bin source import unchanged and fixed only emitted output because TypeScript includes imported source files when compiling `bin/tilde.ts`; removing `src/**/*` from `tsconfig.bin.json` directly would break module resolution.
- Kept plugin source values machine-readable in code and changed only the user-facing list display for first-party plugins.
- Put the discovered-config confirmation in `ConfigFirstMode` so non-interactive command paths remain deterministic and explicit config sources bypass the prompt.

## Known Follow-ups

- The build cleanup script is intentionally narrow. A future packaging overhaul could replace this with a cleaner bin-specific build pipeline.
- The existing CLI invalid-argument todo remains unrelated.

## Next Phase Readiness

Phase 7 can proceed with schema/config versioning on top of stable config source behavior and cleaner build output.
