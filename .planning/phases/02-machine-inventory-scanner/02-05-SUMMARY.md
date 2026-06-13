---
phase: 02-machine-inventory-scanner
plan: 05
subsystem: inventory
tags: [inventory, config-first, wizard, ink, vitest]

requires:
  - phase: 02-03
    provides: Startup InventoryReport flow and InventoryStep wizard rendering
  - phase: 02-04
    provides: Homebrew direct/dependency/unknown counts and warning data
provides:
  - Config-first confirmation inventory summary before apply choices
  - Startup InventoryReport pass-through from App to ConfigFirstMode
  - Shared concise inventory warning grouping for wizard and config-first output
  - Integration coverage for inventory-before-config ordering and summary content
affects: [provenance-summary, dotfiles-discovery-map, config-first-summary]

tech-stack:
  added: []
  patterns:
    - Config-first UI consumes startup InventoryReport as render data and does not scan
    - Wizard and config-first inventory summaries share summarizeInventory output
    - Default inventory display stays aggregate-only and excludes unmatched audit names

key-files:
  created:
    - .planning/phases/02-machine-inventory-scanner/02-05-SUMMARY.md
  modified:
    - src/app.tsx
    - src/inventory/summary.ts
    - src/modes/config-first.tsx
    - src/steps/inventory.tsx
    - tests/integration/config-first.test.ts
    - tests/integration/wizard-flow.test.tsx

key-decisions:
  - "Config-first confirmation consumes the App startup InventoryReport via prop instead of running inventory scanning during render."
  - "Inventory warning grouping is centralized in summarizeInventory so wizard and config-first output cannot drift."

patterns-established:
  - "Render inventory summary blocks from report props and pure summary helpers only."
  - "Keep unmatched Homebrew audit names out of default terminal summaries; use them only as mocked count sources in tests."

requirements-completed: [INV-03, INV-04]

duration: 9 min
completed: 2026-06-13
---

# Phase 02 Plan 05: Final Inventory Summary Rendering

**Config-first and wizard confirmation paths now show concise installed-tool, Homebrew count, and warning summaries before setup/apply decisions.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-13T22:24:52Z
- **Completed:** 2026-06-13T22:33:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added RED integration coverage proving config-first inventory output must precede `Configuration Summary`.
- Passed the startup `InventoryReport` from `App` into `ConfigFirstMode`.
- Rendered the shared concise inventory summary in config-first confirm mode before apply/edit/start-over choices.
- Centralized grouped warning output in `summarizeInventory()` so wizard and config-first output both show `Warnings:` when warnings exist.
- Verified default inventory blocks show aggregate counts and labels without dumping unmatched Homebrew audit names.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing config-first and final summary tests** - `04ead51` (test)
2. **Task 2: Render inventory summaries in config-first and final wizard paths** - `74e441d` (feat)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `src/app.tsx` - Passes startup inventory into `ConfigFirstMode`.
- `src/modes/config-first.tsx` - Accepts `inventory?: InventoryReport` and renders inventory summary before `ConfigSummary`.
- `src/inventory/summary.ts` - Adds grouped `Warnings:` output before individual warning lines.
- `src/steps/inventory.tsx` - Colors the grouped warning heading and warning lines consistently.
- `tests/integration/config-first.test.ts` - Adds inventory-before-config ordering coverage with a mocked report fixture.
- `tests/integration/wizard-flow.test.tsx` - Adds Homebrew count, grouped warning, and unmatched-name exclusion coverage.

## Decisions Made

- Config-first rendering uses the App startup inventory report instead of initiating any scanner work from `ConfigFirstMode`.
- The same `summarizeInventory()` output drives wizard and config-first inventory blocks to keep wording and warning behavior aligned.
- Negative unmatched-name assertions are scoped to the inventory block, because config fixtures can legitimately list the same tool names in `ConfigSummary`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed unmatched-name assertion to the inventory block**
- **Found during:** Task 2
- **Issue:** The new config-first test asserted the entire frame did not contain `ripgrep`, but the fixture config legitimately includes `ripgrep` under configured tools.
- **Fix:** Scoped the negative assertion to the rendered inventory block before `Configuration Summary`.
- **Files modified:** `tests/integration/config-first.test.ts`
- **Verification:** Targeted integration inventory tests passed.
- **Committed in:** `74e441d`

**2. [Rule 3 - Blocking] Replaced unsupported Vitest `-x` verification flag**
- **Found during:** Task 2 verification
- **Issue:** `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts -x` failed before running tests because Vitest 4.1.2 rejects `-x`.
- **Fix:** Ran the same targeted unit files without the unsupported flag.
- **Files modified:** None.
- **Verification:** Supported targeted unit command passed with 8 tests.
- **Committed in:** N/A, command-only adjustment.

---

**Total deviations:** 2 auto-fixed (1 test assertion bug, 1 blocking command issue).
**Impact on plan:** Both fixes preserved the planned behavior and did not expand scope. No package installs, auth gates, or architecture changes were introduced.

## Issues Encountered

- The planned Vitest `-x` flag remains incompatible with the installed Vitest CLI, consistent with prior Phase 2 plans.
- The working tree contained unrelated pre-existing local changes (`.planning/config.json`, `.vscode/mcp.json`, `.bg-shell/`, `.codex/`, `.mcp.json`). They were left untouched and unstaged.

## Verification

- `npm run test:integration -- tests/integration/config-first.test.ts tests/integration/wizard-flow.test.tsx -t inventory` - RED failed before implementation on missing config-first inventory rendering and missing grouped `Warnings:` output; GREEN passed after implementation with 4 tests.
- `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts -x` - failed before test execution because Vitest rejected `-x`.
- `npm run test -- tests/unit/inventory-scanner.test.ts tests/unit/inventory-homebrew.test.ts` - passed, 8 tests.
- `npm run build` - passed.
- `npm run lint && npm run build && npm test && npm run test:integration` - passed; 27 unit test files / 263 tests and 8 integration test files / 47 tests passed with 1 todo.

## Known Stubs

None. Stub-pattern scan found only normal progress state initialization and test fixture overrides, not unconnected UI placeholders.

## Threat Flags

None. The inventory report to config-first and wizard summary surfaces are covered by the plan threat model; output remains aggregate-only and scanner-free at render time.

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 2 is complete: startup inventory facts, Homebrew request-status counts, soft-failure warnings, wizard summary output, and config-first confirmation output are all in place. Phase 3 can build dotfile discovery on the existing inventory report and metadata boundaries.

## Self-Check: PASSED

- Found summary file: `.planning/phases/02-machine-inventory-scanner/02-05-SUMMARY.md`.
- Found modified files: `src/app.tsx`, `src/inventory/summary.ts`, `src/modes/config-first.tsx`, `src/steps/inventory.tsx`, `tests/integration/config-first.test.ts`, `tests/integration/wizard-flow.test.tsx`.
- Found task commits: `04ead51`, `74e441d`.
- No tracked file deletions were introduced by task commits.

---
*Phase: 02-machine-inventory-scanner*
*Completed: 2026-06-13*
