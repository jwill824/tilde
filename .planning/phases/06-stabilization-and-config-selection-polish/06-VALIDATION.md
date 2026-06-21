# Phase 06: Stabilization and Config Selection Polish - Validation Strategy

> **Retroactive note:** This validation artifact was reconstructed on 2026-06-21 from `06-01-PLAN.md` and `06-01-SUMMARY.md`.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Unit config | `vitest.config.ts` |
| Integration config | `vitest.integration.config.ts` |
| Build command | `npm run build` |

## Validation Map

| Requirement | Target Behavior | Automated Command | Recorded Status |
|-------------|-----------------|-------------------|-----------------|
| STAB-01 | Generated runtime output imports `dist/index.js` and does not rely on duplicated `dist/src`. | `npm run build`; `npm run test -- tests/unit/build-output.test.ts` | Passed |
| STAB-02 | `tilde plugin list` explains first-party ownership as built in. | `npm run test:integration -- tests/integration/cli-regression.test.ts` | Passed |
| STAB-03 | Discovered configs are confirmed before config-first loading, while explicit sources bypass prompting. | `npm run test -- tests/unit/config-first.test.ts` | Passed |
| Regression guard | Existing discovery and metadata tests stay green. | `npm run test -- tests/unit/config-discovery.test.ts tests/unit/tool-metadata.test.ts tests/unit/config-first.test.ts tests/unit/build-output.test.ts` | Passed |

## Sampling Strategy

- Run targeted unit tests after source-level changes.
- Run CLI regression tests after changing CLI output or build output behavior.
- Run `npm run build` after build pipeline changes.

## Sign-Off

Recorded verification in `06-01-SUMMARY.md` satisfies the validation map for STAB-01, STAB-02, and STAB-03.
