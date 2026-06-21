# Phase 06: Stabilization and Config Selection Polish - Pattern Map

> **Retroactive note:** This pattern map was reconstructed on 2026-06-21 from `06-CONTEXT.md`, `06-01-PLAN.md`, and `06-01-SUMMARY.md`.

## Files and Roles

| File | Role | Pattern |
|------|------|---------|
| `scripts/fix-bin-output.cjs` | build utility | Narrow post-build cleanup script invoked from `npm run build`. |
| `src/index.tsx` | CLI entry | Subcommand routing, plugin list formatting, config source threading. |
| `src/app.tsx` | app mode router | Pass config source into config-first mode without changing non-interactive commands. |
| `src/modes/config-first.tsx` | interactive config-first UI | Gate discovered config loading behind confirmation; explicit sources load immediately. |
| `tests/unit/build-output.test.ts` | build regression test | Deterministic artifact layout assertion. |
| `tests/unit/config-first.test.ts` | Ink/unit behavior test | Confirm source-specific config-first load behavior. |
| `tests/integration/cli-regression.test.ts` | CLI regression suite | Built CLI behavior and plugin list output. |

## Established Patterns

- Pin underspecified bugs with focused regression tests before changing behavior.
- Preserve machine-readable internal values while improving user-facing labels.
- Thread source metadata only as far as the UI needs it.
- Keep prompts out of deterministic non-interactive subcommand paths.
- Use narrow build-output cleanup rather than broad packaging redesign when the phase is stabilization.

## Constraints Reinforced

- Preserve NodeNext ESM `.js` imports in source.
- Keep external commands mocked in tests.
- Do not broaden Phase 06 into schema versioning, search wrappers, or registry redesign.
