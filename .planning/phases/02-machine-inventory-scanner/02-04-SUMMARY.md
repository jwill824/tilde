---
phase: 02-machine-inventory-scanner
plan: 04
subsystem: inventory
tags: [inventory, homebrew, request-status, package-manager, vitest]

requires:
  - phase: 02-01
    provides: Evidence-backed InventoryReport, scanInventory, Homebrew audit data, warnings, and summary helpers
  - phase: 02-02
    provides: Plugin-backed metadata rows for inventory matching
  - phase: 02-03
    provides: Startup inventory flow and InventoryStep summary rendering
provides:
  - Installed-on-request Homebrew helper using exact brew argument arrays
  - Pure Homebrew direct/dependency/unknown request-status classifier
  - Request-status evidence on known Homebrew facts and unmatched audit entries
  - Request-state failure warning that preserves installed package facts
  - Concise Homebrew direct/dependency/unknown formula summary line
affects: [provenance-summary, config-first-summary, dotfiles-discovery-map]

tech-stack:
  added: []
  patterns:
    - Homebrew command execution remains in package-manager helpers while inventory classification stays pure
    - Request-state lookup failure is handled independently from installed package listing failures
    - Request status is evidence data, not final provenance labeling

key-files:
  created:
    - src/inventory/homebrew.ts
    - tests/unit/package-manager.test.ts
    - tests/unit/inventory-homebrew.test.ts
  modified:
    - src/utils/package-manager.ts
    - src/inventory/report.ts
    - src/inventory/scan.ts
    - src/inventory/summary.ts
    - tests/unit/inventory-scanner.test.ts

key-decisions:
  - "Represent Homebrew direct/dependency as requestStatus evidence while preserving Phase 4 provenance labels for later."
  - "Treat installed casks as direct by default because Phase 2 has no contrary request-state source for casks."
  - "Keep installed package facts when installed-on-request lookup fails and warn with homebrew-request-state-unavailable."

patterns-established:
  - "Use classifyHomebrewInventory for pure request-status interpretation of Homebrew helper output."
  - "Inventory summaries should report request-status counts without exposing final managed/manual labels."

requirements-completed: [INV-02, INV-04]
duration: 14 min
completed: 2026-06-13
---

# Phase 02 Plan 04: Homebrew Request-State Classification Summary

**Homebrew installed-on-request data now classifies formulae as direct, dependency, or unknown across known tool evidence and unmatched audit data.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-13T22:07:18Z
- **Completed:** 2026-06-13T22:20:33Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `listInstalledOnRequestFormulae()` with the exact mocked `brew list --installed-on-request --formula --full-name` argument array.
- Added `classifyHomebrewInventory()` and request-status types for `direct`, `dependency`, and `unknown` formula classification.
- Extended inventory report evidence and unmatched Homebrew audit entries with request status while keeping Phase 4 provenance labels out of scope.
- Updated scanner behavior so installed-on-request failures preserve installed Homebrew facts, mark formula request status as `unknown`, and emit `homebrew-request-state-unavailable`.
- Updated inventory summary output to show Homebrew formula counts as direct/dependency/unknown.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing Homebrew classification tests** - `b842f96` (test)
2. **Task 2: Implement Homebrew request-state classification in inventory data** - `3087ad4` (feat)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `src/inventory/homebrew.ts` - Pure Homebrew request-status types and classifier.
- `src/utils/package-manager.ts` - Adds installed-on-request Homebrew formula helper.
- `src/inventory/report.ts` - Adds request-status fields to Homebrew evidence, unmatched audit entries, and summary counts.
- `src/inventory/scan.ts` - Independently reads installed formulae, casks, and installed-on-request formulae; preserves installed facts on request-state failure.
- `src/inventory/summary.ts` - Renders formula direct/dependency/unknown counts.
- `tests/unit/package-manager.test.ts` - Mocks the Homebrew command boundary and parser.
- `tests/unit/inventory-homebrew.test.ts` - Covers pure direct/dependency/unknown classification.
- `tests/unit/inventory-scanner.test.ts` - Covers scanner request-status evidence, unmatched audit status, and request-state warning behavior.

## Decisions Made

- Request status is stored as evidence/audit data, not as final managed/manual/OS-provided provenance.
- Casks are classified as `direct` by default because Homebrew installed-on-request output is formula-specific for this phase.
- The scanner treats installed package listing and installed-on-request lookup as separate failure domains so a weaker request-state lookup does not erase installed facts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced unsupported Vitest `-x` verification flag**
- **Found during:** Task 1 RED verification
- **Issue:** `npm run test -- tests/unit/package-manager.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/inventory-scanner.test.ts -x` failed before running tests because Vitest 4.1.2 rejects `-x`.
- **Fix:** Ran the same targeted test files without the unsupported flag.
- **Files modified:** None.
- **Verification:** The supported targeted command failed RED on the missing helper/classifier/request-status behavior, then passed after implementation.
- **Committed in:** N/A, command-only adjustment.

---

**Total deviations:** 1 auto-fixed blocking command issue.
**Impact on plan:** The planned behavior and source assertions were preserved. No package installs, auth gates, or architecture changes were introduced.

## Issues Encountered

- The plan's exact Vitest command includes an unsupported `-x` flag, consistent with earlier Phase 2 plans.
- The working tree contained unrelated pre-existing local changes (`.planning/config.json`, `.vscode/mcp.json`, `.bg-shell/`, `.codex/`, `.mcp.json`). They were left untouched and unstaged.

## Verification

- `npm run test -- tests/unit/package-manager.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/inventory-scanner.test.ts -x` - failed before test execution because Vitest rejected `-x`.
- `npm run test -- tests/unit/package-manager.test.ts tests/unit/inventory-homebrew.test.ts tests/unit/inventory-scanner.test.ts` - RED failed before implementation, then passed after implementation with 9 tests.
- `npm run build` - passed.
- `npm run lint` - passed.

## Known Stubs

None. Stub-pattern scan found no placeholder UI text or unconnected mock data in the created/modified files.

## Threat Flags

None. The new Homebrew command helper, request-status classifier, scanner warning behavior, and summary counts are covered by the plan threat model.

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-05 can reuse `summarizeInventory()` and the enriched `InventoryReport` to render final inventory summaries in config-first and wizard confirmation paths. Phase 4 can later derive full provenance labels from this request-status evidence.

## Self-Check: PASSED

- Found created files: `src/inventory/homebrew.ts`, `tests/unit/package-manager.test.ts`, `tests/unit/inventory-homebrew.test.ts`.
- Found modified files: `src/utils/package-manager.ts`, `src/inventory/report.ts`, `src/inventory/scan.ts`, `src/inventory/summary.ts`, `tests/unit/inventory-scanner.test.ts`.
- Found task commits: `b842f96`, `3087ad4`.
- No tracked file deletions were introduced by task commits.

---
*Phase: 02-machine-inventory-scanner*
*Completed: 2026-06-13*
