---
phase: 04-provenance-summary
plan: 2
subsystem: inventory-ui
tags: [provenance, ink, config-first, wizard, vitest]
requires:
  - phase: 04-provenance-summary
    provides: Shared provenance derivation and grouped summary formatting from Plan 04-01
provides:
  - Config-first confirmation provenance summary with complete TildeConfig intent
  - Final wizard apply confirmation provenance summary with startup inventory and completed config
  - Integration coverage for concise shared provenance output and warning preservation
affects: [config-first, wizard-confirmation, inventory-summary]
tech-stack:
  added: []
  patterns:
    - UI components render shared summarizeInventory output instead of duplicating provenance logic
key-files:
  created: []
  modified:
    - src/inventory/summary.ts
    - src/modes/config-first.tsx
    - src/modes/wizard.tsx
    - src/steps/apply.tsx
    - tests/integration/config-first.test.ts
    - tests/integration/wizard-flow.test.tsx
    - tests/unit/inventory-scanner.test.ts
key-decisions:
  - "Early wizard inventory remains evidence-only because final selections are not known yet."
  - "Config-first and final wizard confirmation pass complete config intent into summarizeInventory()."
  - "Normal output remains one Provenance line plus existing aggregate inventory and warning lines."
patterns-established:
  - "summarizeInventory(report, config?) is the only UI-facing summary entry point for provenance output."
requirements-completed: [PROV-01, PROV-02, PROV-03, PROV-04]
duration: 4 min
completed: 2026-06-20
---

# Phase 04 Plan 02: Shared Provenance Rendering Summary

**Config-aware provenance summaries rendered through config-first and final wizard confirmation paths**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-20T01:08:46Z
- **Completed:** 2026-06-20T01:12:02Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `summarizeInventory(report, config?)` provenance output to config-first and final wizard confirmation paths.
- Extended `ApplyStep` to accept optional inventory and render config-aware provenance before `ConfigSummary` and apply choices.
- Preserved early wizard inventory as evidence-oriented output by continuing to call `summarizeInventory(report)` without config.
- Added integration coverage for exactly one concise provenance line, config-aware selected tools, warning preservation, and no raw rc/source details.

## Task Commits

1. **Task 1 and Task 2: Rendering tests and shared wiring** - `8d2cce4` (feat)
2. **Verification fixture stabilization** - `2000c4c` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/inventory/summary.ts` - Accepts optional config and includes `formatProvenanceSummaryLine()` exactly once.
- `src/modes/config-first.tsx` - Passes complete config into inventory summary at confirmation.
- `src/modes/wizard.tsx` - Passes startup inventory into final `ApplyStep`.
- `src/steps/apply.tsx` - Renders config-aware inventory summary before the final config summary.
- `tests/integration/config-first.test.ts` - Asserts config-aware provenance in config-first inventory block.
- `tests/integration/wizard-flow.test.tsx` - Covers early evidence-only inventory and final config-aware apply confirmation.
- `tests/unit/inventory-scanner.test.ts` - Updates mocked registry shape to include `getToolMetadata()`.

## Decisions Made

- Final wizard confirmation is the config-aware provenance surface; early inventory remains non-config-aware to avoid pretending final choices are known.
- Existing warning rendering stays unchanged and follows the shared inventory summary lines.

## Deviations from Plan

The scanner unit test mock was updated because `summarizeInventory()` now calls the provenance helper, which uses `getToolMetadata()`. Full integration also exposed two older fixture assumptions: one hand-built inventory fixture lacked dotfile counts, and one async config-detection assertion needed a longer settle time. These are test-support changes caused by the shared summary boundary and full-suite timing, not production scope changes.

**Total deviations:** 1 test-support adjustment.
**Impact on plan:** Required to keep existing scanner summary coverage compatible with the shared helper.

## Issues Encountered

Initial config-first assertion expected only Homebrew as selected, but the fixture config also selects `ripgrep` and `fd`. The assertion was corrected to reflect config-aware provenance.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run test:integration -- tests/integration/config-first.test.ts tests/integration/wizard-flow.test.tsx -t inventory` - passed
- `npm run test -- tests/unit/inventory-provenance.test.ts tests/unit/inventory-scanner.test.ts` - passed
- `npm run build` - passed

## Next Phase Readiness

All Phase 04 plans are complete and ready for phase-level verification.

---
*Phase: 04-provenance-summary*
*Completed: 2026-06-20*
