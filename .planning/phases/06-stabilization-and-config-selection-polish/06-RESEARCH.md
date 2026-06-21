# Phase 06: Stabilization and Config Selection Polish - Research

> **Retroactive note:** This research artifact was reconstructed on 2026-06-21 from `06-CONTEXT.md`, `06-01-PLAN.md`, and `06-01-SUMMARY.md`. No separate research artifact existed during the original Phase 06 execution.

## Research Questions

1. How should the build artifact issue be safely reproduced before changing output?
2. How can plugin ownership be made explainable without widening registry scope?
3. Where should discovered-config confirmation live so explicit and non-interactive flows do not regress?

## Findings

### Build Output

- `package.json` originally used `tsc && tsc -p tsconfig.bin.json`.
- `tsconfig.bin.json` includes `bin/tilde.ts` plus imported source, which caused duplicated compiled source under `dist/src`.
- The selected fix was intentionally narrow: keep source imports stable and post-process emitted bin output so the package binary imports `dist/index.js`, then remove duplicate `dist/src`.
- A future packaging overhaul may replace this with a cleaner bin-specific build pipeline.

### Plugin Ownership

- `TildePlugin.source` remains useful as a machine-readable source value.
- The user-facing problem was ambiguity, not the need for a broad registry redesign.
- Output can explain `first-party` as built in without expanding browser/editor/AI registry semantics in Phase 06.

### Discovered Config Confirmation

- Existing config resolution already distinguished `flag`, `env`, `positional`, and `discovered` sources.
- Confirmation belongs in the interactive config-first/startup path, not non-interactive subcommands.
- Explicit `--config`, `TILDE_CONFIG`, and positional paths should bypass discovery prompts.

## Recommendation

Keep Phase 06 as stabilization only: targeted tests first, narrow implementation fixes, no schema/search expansion, and no broad plugin registry redesign.
