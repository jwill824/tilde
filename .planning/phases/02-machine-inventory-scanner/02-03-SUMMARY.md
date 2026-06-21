---
phase: 02-machine-inventory-scanner
plan: 03
subsystem: inventory
tags: [inventory, wizard, ink, startup-scan, vitest]

requires:
  - phase: 02-01
    provides: Evidence-backed InventoryReport, scanInventory, createEmptyInventoryReport, and summary helpers
  - phase: 02-02
    provides: Plugin-backed metadata rows for package-manager, version-manager, and editor inventory facts
provides:
  - Startup inventory scan state for interactive app modes
  - Non-fatal wizard fallback report with inventory-startup-failed warning
  - InventoryStep wizard UI for installed-tool and warning summaries
  - Wizard step id and visible label migrated from environment capture to inventory
  - Inventory environment rc-file bridge for shell, git, and language defaults
affects: [config-first-summary, homebrew-classification, provenance-summary, dotfiles-discovery-map]

tech-stack:
  added: []
  patterns:
    - App owns inventory scanning and passes reports into wizard UI
    - InventoryStep renders provided report data and does not run external commands
    - Wizard sidebar summaries reuse summarizeInventory for concise terminal output

key-files:
  created:
    - src/steps/inventory.tsx
  modified:
    - src/app.tsx
    - src/modes/wizard.tsx
    - src/inventory/report.ts
    - src/inventory/scan.ts
    - src/inventory/summary.ts
    - src/steps/contexts.tsx
    - tests/integration/env-capture.test.ts
    - tests/integration/wizard-flow.test.tsx
  deleted:
    - src/steps/env-capture.tsx

key-decisions:
  - "App startup owns inventory scanning and failure fallback; InventoryStep renders only the supplied InventoryReport."
  - "Wizard defaults continue through inventory.environment, including rcFiles for git defaults and detectedLanguages for context suggestions."
  - "Installed-tool summary text lists known tool labels instead of only counts so users can see concrete evidence before choices."

patterns-established:
  - "Inventory UI components should be report-driven and command-free for deterministic Ink tests."
  - "Startup scan failures become an inventory-startup-failed warning instead of blocking wizard rendering."

requirements-completed: [INV-03, INV-04]

duration: 54 min
completed: 2026-06-13
---

# Phase 02 Plan 03: Wizard Inventory Startup Summary

**Interactive wizard startup now scans inventory, falls back safely on scanner failure, and renders known installed tools before later setup choices.**

## Performance

- **Duration:** 54 min
- **Started:** 2026-06-13T21:09:45Z
- **Completed:** 2026-06-13T22:03:51Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added RED integration coverage for inventory terminology, known installed tools, and fallback warnings.
- Added `InventoryStep` as the wizard's early summary surface, backed by `InventoryReport` and `summarizeInventory()`.
- Wired `App` to run `scanInventory()` for interactive modes and convert startup scan failures into an `inventory-startup-failed` warning report.
- Replaced the wizard step id and visible label with `inventory` / `Inventory`.
- Preserved downstream wizard defaults by reading shell, git rc content, and detected languages from `inventory.environment`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing wizard inventory wiring tests** - `83bc269` (test)
2. **Task 2: Wire startup inventory into the wizard and InventoryStep** - `8d02d2e` (feat)

**Plan metadata:** pending final commit.

## Files Created/Modified

- `src/steps/inventory.tsx` - Inventory summary step with continue/back controls and warning rendering.
- `src/app.tsx` - Interactive startup inventory state, scan execution, fallback warning report, and wizard prop wiring.
- `src/modes/wizard.tsx` - Inventory step registry label/id, `InventoryReport` prop/state flow, sidebar summary, and inventory-backed defaults.
- `src/inventory/report.ts` - Adds `environment.rcFiles` so wizard defaults can remain inventory-backed.
- `src/inventory/scan.ts` - Reads filtered rc files into inventory environment and converts failures to warnings.
- `src/inventory/summary.ts` - Lists known installed tool labels in concise summary output.
- `src/steps/contexts.tsx` - Updates the detected-language comment to inventory terminology.
- `tests/integration/env-capture.test.ts` - Adds InventoryStep rendering coverage.
- `tests/integration/wizard-flow.test.tsx` - Adds wizard inventory label, summary, and fallback warning coverage.
- `src/steps/env-capture.tsx` - Removed after wizard no longer imports the old primary step API.

## Decisions Made

- Kept `InventoryStep` command-free; scanning is a startup responsibility and tests inject deterministic reports.
- Kept existing capture scanner/parser utilities for rc-file compatibility rather than duplicating rc parsing inside wizard code.
- Used `summarizeInventory()` for both visible step output and completed-step sidebar summaries to avoid wording drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added inventory-backed rc-file environment data**
- **Found during:** Task 2
- **Issue:** Replacing `EnvCaptureStep` would otherwise remove the `.gitconfig` and rc-file data source used by later wizard defaults.
- **Fix:** Added `rcFiles` to `InventoryEnvironmentSnapshot` and populated it through existing filtered dotfile/rc scanning helpers.
- **Files modified:** `src/inventory/report.ts`, `src/inventory/scan.ts`, `src/modes/wizard.tsx`
- **Verification:** Targeted inventory integration tests, scanner unit tests, build, and lint passed.
- **Committed in:** `8d02d2e`

**2. [Rule 3 - Blocking] Replaced unsupported Vitest `-x` verification flag**
- **Found during:** Task 2 verification
- **Issue:** `npm run test -- tests/unit/inventory-scanner.test.ts -x` fails before running tests because Vitest 4.1.2 reports `Unknown option '-x'`.
- **Fix:** Ran the same targeted test file without the unsupported flag: `npm run test -- tests/unit/inventory-scanner.test.ts`.
- **Files modified:** None.
- **Verification:** Supported targeted scanner test passed with 4 tests.
- **Committed in:** N/A, command-only adjustment.

---

**Total deviations:** 2 auto-fixed (1 missing critical compatibility bridge, 1 blocking command issue)
**Impact on plan:** The compatibility bridge preserves existing wizard defaults under the new inventory boundary. No new package installs, auth gates, or architecture changes were introduced.

## Issues Encountered

- The planned Vitest `-x` flag remains incompatible with the installed Vitest CLI and was handled the same way as Plans 02-01 and 02-02.
- The working tree contained unrelated pre-existing local changes (`.planning/config.json`, `.vscode/mcp.json`, `.bg-shell/`, `.codex/`, `.mcp.json`). They were left untouched and unstaged.

## Verification

- `npm run test:integration -- tests/integration/env-capture.test.ts tests/integration/wizard-flow.test.tsx -t inventory` - RED failed before implementation on missing `src/steps/inventory.js` and old `Environment Capture` label; GREEN passed after implementation, 3 tests.
- `npm run test -- tests/unit/inventory-scanner.test.ts -x` - failed before test execution because Vitest rejected `-x`.
- `npm run test -- tests/unit/inventory-scanner.test.ts` - passed, 4 tests.
- `npm run build` - passed.
- `npm run lint` - passed.

## Known Stubs

None. Stub-pattern scan only found typed empty defaults and null sentinels used for normal optional/unknown state.

## Threat Flags

None. Startup inventory state, warning rendering, and rc/gitconfig default reuse are covered by this plan's trust boundaries and mitigations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-04 can add Homebrew direct/dependency classification inside the existing `InventoryReport` and summary boundaries. Plan 02-05 can reuse `InventoryStep` and `summarizeInventory()` wording for final config-first and wizard confirmation surfaces.

## Self-Check: PASSED

- Found created file: `src/steps/inventory.tsx`.
- Found summary file: `.planning/phases/02-machine-inventory-scanner/02-03-SUMMARY.md`.
- Found task commits: `83bc269`, `8d02d2e`.
- Intentional tracked deletion: `src/steps/env-capture.tsx` was removed after the wizard migrated to `InventoryStep`.

---
*Phase: 02-machine-inventory-scanner*
*Completed: 2026-06-13*
