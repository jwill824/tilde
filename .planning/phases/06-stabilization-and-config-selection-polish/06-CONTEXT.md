---
phase: 06-stabilization-and-config-selection-polish
milestone: v1.1
created: 2026-06-21
github: [52, 60, 74]
requirements: [STAB-01, STAB-02, STAB-03]
---

# Phase 06 Context: Stabilization and Config Selection Polish

## Phase Goal

Fix known correctness and trust issues in generated outputs, plugin ownership labels, and config selection prompts before expanding tilde's search surface.

## User Value

Users should be able to trust that tilde is showing the real runtime artifact, explaining plugin ownership clearly, and making discovered config use explicit before any config-first action continues.

## Scope

### GitHub #52 - generated `*.js` files copying `*.tsx`

The issue title is terse, so this phase should begin by reproducing the failure from current build/package behavior. Relevant known files:

- `package.json` uses `npm run build` as `tsc && tsc -p tsconfig.bin.json`.
- `tsconfig.json` emits source to `dist`.
- `tsconfig.bin.json` emits `bin/tilde.ts` plus source to `dist`.
- `src/index.tsx` has `readPackageVersion()` fallback logic around `dist` and `dist/src`.
- Integration tests run the built binary at `dist/bin/tilde.js`.

Initial hypothesis: the build/package output may include generated `.js` files that preserve references or copied content from `.tsx` sources. Confirm with a failing test or scripted check before changing build behavior.

### GitHub #60 - update what is considered `first-party`

Current behavior:

- `tilde plugin list` is implemented in `src/index.tsx` and prints `${p.id}  ${p.version}  ${p.source}` for core plugin categories.
- `TildePlugin.source` in `src/plugins/api.ts` is currently `'first-party' | 'community' | 'local'`.
- Shared tool metadata has a separate `source` field in `src/tools/metadata.ts`.
- `PluginRegistry` registers only core plugin interfaces in `src/plugins/registry.ts`; browser/editor/AI metadata is split across first-party modules and the tool registry.

Problem from issue #60: output like `homebrew  1.0.0  first-party` is technically sourced from hardcoded plugin objects but not explainable to users. The fix should make ownership/source semantics explicit and keep CLI output understandable.

### GitHub #74 - prompt when discovered config exists but `--config` was omitted

Current behavior:

- `src/utils/config-resolution.ts` returns `source: 'flag' | 'env' | 'positional' | 'discovered'`.
- `src/index.tsx` resolves config at startup and sends `resolved.path` to `App`.
- `src/steps/config-detection.tsx` already prompts users when the wizard flow finds an existing config.
- Config-required non-interactive surfaces should remain deterministic and not become blocking prompts.

Likely target: interactive startup/config-first paths should explain or confirm use of a discovered config when neither `--config`, `TILDE_CONFIG`, nor positional config was supplied. Explicit sources must continue to bypass discovery prompts.

## Constraints

- Preserve NodeNext ESM `.js` import extensions.
- Keep external command behavior mocked in tests.
- Keep discovery/search non-destructive.
- Do not resolve or persist raw secrets.
- Do not broaden Phase 6 into search wrapper work; that begins in Phase 8.

## Initial Verification Targets

- Unit or integration test for generated JS/package output behavior tied to #52.
- CLI/plugin listing test for explicit, explainable ownership labels tied to #60.
- Built CLI or Ink test proving discovered-config interactive flows prompt/explain while explicit `--config`/`TILDE_CONFIG` paths do not tied to #74.

## Out of Scope

- Implementing schema versioning (#54, #81, #83).
- Adding wrapper search APIs (#105, #31).
- Adding new wizard steps.
- Publishing packages or Homebrew formulae.
