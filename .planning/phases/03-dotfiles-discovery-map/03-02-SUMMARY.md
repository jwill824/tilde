---
phase: 03-dotfiles-discovery-map
plan: 02
subsystem: inventory
tags: [dotfiles, rc-parser, inventory, summary, vitest]
requires:
  - phase: 03-dotfiles-discovery-map
    provides: DotfileMap path discovery and shared inventory summary integration from 03-01
provides:
  - Safe line-oriented shell rc parser for aliases, functions, exports, PATH edits, sources, and known tool hooks
  - Rc findings integrated into DotfileMap file summaries and aggregate counts
  - Shared wizard and config-first dotfile finding summary output through summarizeInventory()
affects: [inventory, dotfiles, wizard-summary, config-first-summary]
tech-stack:
  added: []
  patterns: [line-oriented shell parsing, safe env value classification, aggregate terminal summaries]
key-files:
  created: []
  modified: [src/inventory/dotfiles.ts, src/inventory/summary.ts, tests/unit/inventory-dotfiles.test.ts, tests/integration/wizard-flow.test.tsx, tests/integration/config-first.test.ts]
key-decisions:
  - "Rc parser output stores env names and value kinds only; raw values, command substitutions, and function bodies are not persisted."
  - "Known rc hooks count as known tool findings while aliases, functions, exports, PATH edits, and source statements remain unknown rc evidence."
  - "Wizard and config-first output share the new Dotfile findings line from summarizeInventory()."
patterns-established:
  - "DotfileMap counts separate known tool hooks from unknown rc findings without counting unmatched-path placeholders."
  - "Known hook matching is text-only and never invokes shell/plugin commands."
requirements-completed: [DOT-02, DOT-04]
duration: 17min
completed: 2026-06-19
---

# Phase 03 Plan 02: Rc-File Parsing and Structured Dotfile Output Summary

**Safe shell rc parsing with known hook evidence, unknown finding counts, and shared concise inventory output**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-19T22:00:00Z
- **Completed:** 2026-06-19T22:16:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added RED coverage for rc parsing, safe env handling, rc integration, and shared wizard/config-first output.
- Implemented `parseShellRcFindings()` for aliases, function names, env var value kinds, PATH edits, sources, and known `direnv`, `vfox`, `1password`, and `homebrew` hooks.
- Integrated rc findings into scanned rc-file summaries and added aggregate `knownFindingsCount` / `unknownFindingsCount` values.
- Extended `summarizeInventory()` with a concise `Dotfile findings:` line used by both wizard and config-first inventory blocks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing rc parsing and shared-output tests** - `9ddafba` (test)
2. **Task 2: Implement safe rc findings and rc-aware summaries** - `817ae8f` (feat)

**Plan metadata:** this summary commit

_Note: This plan followed the TDD gate with RED then GREEN commits._

## Files Created/Modified

- `src/inventory/dotfiles.ts` - Safe rc parser, known hook matching, rc finding integration, and rc finding counts.
- `src/inventory/summary.ts` - Shared aggregate `Dotfile findings:` line for terminal inventory output.
- `tests/unit/inventory-dotfiles.test.ts` - DOT-02/DOT-04 rc parsing and scanner integration coverage.
- `tests/integration/wizard-flow.test.tsx` - Wizard regression for shared dotfile finding summary and no rc detail leakage.
- `tests/integration/config-first.test.ts` - Config-first regression for the same shared summary output.

## Decisions Made

- Kept rc parsing line-oriented and text-only; no shell execution, source expansion, or function-body parsing was introduced.
- Stored source targets only for literal/reference source statements; command-derived source statements are represented by safe kind only.
- Counted rc finding aggregates separately from path-level metadata findings so default output stays concise.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Issues Encountered

None.

## Verification

- `npm run test -- tests/unit/inventory-dotfiles.test.ts` - RED failed before implementation for missing hook/PATH/map integration; passed after implementation with 5 tests.
- `npm run test:integration -- tests/integration/wizard-flow.test.tsx tests/integration/config-first.test.ts -t inventory` - RED failed before implementation for missing `Dotfile findings:` output; passed after implementation with 10 tests.
- `npm run test -- tests/unit/inventory-dotfiles.test.ts tests/unit/inventory-scanner.test.ts` - passed, 2 files and 14 tests.
- `npm run build` - passed.
- `npm run lint` - passed.

## Known Stubs

None. Stub scan found only normal empty accumulator defaults and test setup locals, not placeholder UI/data paths.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 3 now has path-level and rc-level dotfile evidence ready for Phase 4 provenance derivation. The structured report preserves details for downstream audit/provenance while default terminal output remains aggregate-only.

## Self-Check: PASSED

- Key modified files exist.
- Task commits `9ddafba` and `817ae8f` exist in git history.
- Required verification commands passed.
- Summary file was created at `.planning/phases/03-dotfiles-discovery-map/03-02-SUMMARY.md`.
- No raw rc values, backend references, command substitutions, or function bodies are asserted in scanner output by tests.

---
*Phase: 03-dotfiles-discovery-map*
*Completed: 2026-06-19*
