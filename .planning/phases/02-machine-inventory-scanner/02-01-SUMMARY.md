---
phase: 02-machine-inventory-scanner
plan: 01
subsystem: inventory
tags: [inventory, scanner, homebrew, app-path, vitest]
requires:
  - phase: 01-01
    provides: Static ToolMetadata schema and central registry lookup helpers
  - phase: 01-03
    provides: Strict metadata validation and path lookup hardening
provides:
  - Evidence-backed InventoryReport data model
  - Read-only scanInventory scanner for metadata, Homebrew, app paths, shells, and core tools
  - Unmatched Homebrew audit section and report warnings for soft failures
  - Pure inventory summary helpers
affects: [wizard-startup-inventory, config-first-summary, homebrew-classification, provenance]
tech-stack:
  added: []
  patterns:
    - Inventory scanner consumes registry metadata and helper outputs instead of executing commands directly
    - Subsystem failures become InventoryWarning records and unknown facts
key-files:
  created:
    - src/inventory/report.ts
    - src/inventory/scan.ts
    - src/inventory/summary.ts
    - tests/unit/inventory-scanner.test.ts
  modified: []
key-decisions:
  - "Represent detection as evidence arrays with installed, missing, or unknown state rather than final provenance labels."
  - "Keep scanner-owned shell and core-tool categories local to inventory instead of widening ToolCategorySchema."
  - "Use read-only fs access only for metadata-declared appPath values."
patterns-established:
  - "InventoryReport separates known tool facts from unmatched Homebrew audit data."
  - "scanInventory catches Homebrew, environment, and app-path failures independently."
requirements-completed: [INV-01, INV-04]
duration: 19 min
completed: 2026-06-13
---

# Phase 02 Plan 01: Inventory Scanner Core Summary

**Evidence-backed inventory scanner with Homebrew audit data, app-path checks, shell/core facts, warnings, and pure summary helpers**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-13T20:33:19Z
- **Completed:** 2026-06-13T20:52:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `InventoryReport`, `InventoryToolFact`, evidence, warning, Homebrew audit, and environment snapshot types.
- Added `scanInventory()` that reads registry metadata, Homebrew helper results, metadata-declared app paths, shell state, language detections, and version manager detections.
- Added soft-failure behavior so Homebrew, environment, and app-path failures become warnings and unknown facts instead of rejected scans.
- Added pure summary helpers for installed known-tool facts and concise terminal-ready inventory lines.
- Added unit coverage for Homebrew evidence, unmatched Homebrew audit data, app-path installed/missing evidence, scanner-owned shell/core facts, and Homebrew failure warnings.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing inventory scanner core tests** - `d27b177` (test)
2. **Task 2: Implement inventory report, scanner, and summary helpers** - `c91865e` (feat)

**Plan metadata:** pending final commit.

## Files Created/Modified

- `src/inventory/report.ts` - Inventory report, fact, evidence, warning, Homebrew audit, environment snapshot, and empty report types/helpers.
- `src/inventory/scan.ts` - Scanner orchestration for registry metadata, Homebrew helper output, app-path evidence, shell facts, core tool facts, environment snapshots, warnings, and unmatched Homebrew data.
- `src/inventory/summary.ts` - Pure installed-known-tool filter and concise summary line helper.
- `tests/unit/inventory-scanner.test.ts` - Mocked scanner behavior coverage with no real external command execution.

## Decisions Made

- Used `InventoryInstallState = 'installed' | 'missing' | 'unknown'` and evidence arrays, avoiding Phase 4 provenance labels such as managed/manual/OS-provided.
- Kept `shell` and `core-tool` as `InventoryToolCategory` extensions only, preserving the existing metadata category schema.
- Checked only metadata-declared `install.appPath` strings with `fs.promises.access`, persisting only the path and boolean existence result.
- Kept unmatched Homebrew formulae/casks in report data without turning them into detailed default output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted targeted Vitest invocation**
- **Found during:** Task 1 RED verification
- **Issue:** The planned command `npm run test -- tests/unit/inventory-scanner.test.ts -x` failed before executing tests because Vitest 4 rejected the unsupported `-x` option.
- **Fix:** Used `npm run test -- tests/unit/inventory-scanner.test.ts` for RED and GREEN verification.
- **Files modified:** None.
- **Verification:** The supported targeted command failed RED on the missing scanner module, then passed after implementation.
- **Committed in:** n/a - verification command adjustment only.

**2. [Rule 3 - Blocking] Fixed Vitest mock hoisting in RED test**
- **Found during:** Task 1 RED verification
- **Issue:** The initial test mocks referenced non-hoisted variables inside `vi.mock` factories, so Vitest failed before reaching the missing scanner module.
- **Fix:** Switched the mock functions to `vi.hoisted`.
- **Files modified:** `tests/unit/inventory-scanner.test.ts`
- **Verification:** RED test then failed on missing `src/inventory/scan.js` as intended.
- **Committed in:** `d27b177`

**3. [Rule 3 - Blocking] Removed lint-blocked NodeJS namespace cast**
- **Found during:** Task 2 phase lint gate
- **Issue:** ESLint reported `NodeJS` as undefined in the app-path error-code check.
- **Fix:** Replaced the namespace cast with a local structural `{ code?: string }` cast.
- **Files modified:** `src/inventory/scan.ts`
- **Verification:** `npm run lint`, `npm run build`, and targeted scanner tests passed.
- **Committed in:** `c91865e`

---

**Total deviations:** 3 auto-fixed (3 blocking).
**Impact on plan:** All fixes were required to complete the planned tests and verification. No architectural or feature scope change.

## Issues Encountered

- The plan’s `-x` Vitest flag is incompatible with the installed Vitest CLI. The plan behavior was verified with the same targeted file command without that flag.
- No authentication gates occurred.

## Verification

- `npm run test -- tests/unit/inventory-scanner.test.ts -x` - failed before test execution because Vitest rejected `-x`.
- `npm run test -- tests/unit/inventory-scanner.test.ts` - RED failed on missing `src/inventory/scan.js`; GREEN passed, 4 tests.
- `npm run build` - passed.
- `npm run lint` - passed.

## Known Stubs

None. Stub-pattern scan only found internal empty-array initializers and `null` sentinels used to model unknown Homebrew subsystem state; these are not UI placeholders.

## Threat Flags

None. The new Homebrew helper consumption, read-only app-path checks, filesystem path evidence, and summary labels are covered by the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-02 can seed additional plugin-backed metadata rows against the scanner boundary. Later plans can wire `InventoryReport` into startup and add direct/dependency Homebrew classification without changing this report boundary.

## Self-Check: PASSED

- Found created files: `src/inventory/report.ts`, `src/inventory/scan.ts`, `src/inventory/summary.ts`, `tests/unit/inventory-scanner.test.ts`.
- Found task commits: `d27b177`, `c91865e`.
- No unexpected tracked deletions were introduced by task commits.

---
*Phase: 02-machine-inventory-scanner*
*Completed: 2026-06-13*
