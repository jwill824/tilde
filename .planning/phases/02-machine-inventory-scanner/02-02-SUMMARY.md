---
phase: 02-machine-inventory-scanner
plan: 02
subsystem: inventory
tags: [metadata, registry, homebrew, editors, vitest]

requires:
  - phase: 01-tool-metadata-registry
    provides: Shared ToolMetadata schema, validation, and pure registry lookups
provides:
  - Plugin-backed package-manager, version-manager, and editor metadata rows
  - Registry aggregation for Phase 2 inventory categories
  - Regression coverage for INV-01/D-05 category and Homebrew lookups
affects: [machine-inventory-scanner, dotfiles-discovery-map, provenance-summary]

tech-stack:
  added: []
  patterns:
    - Family-owned first-party metadata arrays
    - Pure registry aggregation through validateToolMetadata

key-files:
  created:
    - src/plugins/first-party/homebrew/metadata.ts
    - src/plugins/first-party/vfox/metadata.ts
    - src/plugins/first-party/vscode/metadata.ts
    - src/plugins/first-party/neovim/metadata.ts
    - src/plugins/first-party/jetbrains/metadata.ts
    - src/plugins/first-party/cursor/metadata.ts
    - src/plugins/first-party/zed/metadata.ts
  modified:
    - src/tools/registry.ts
    - tests/unit/tool-metadata.test.ts

key-decisions:
  - "Plugin-backed inventory metadata stays static and is aggregated through validateToolMetadata without broadening PluginRegistry."
  - "JetBrains metadata follows the existing WebStorm and IntelliJ first-party plugin IDs instead of inventing an unconfirmed JetBrains Toolbox row."

patterns-established:
  - "First-party plugin families can expose colocated metadata.ts files with typed ToolMetadata[] exports."
  - "Inventory category seed tests assert category and Homebrew lookup behavior through registry helpers only."

requirements-completed: [INV-01]

duration: 10min
completed: 2026-06-13
---

# Phase 02 Plan 02: Plugin-Backed Metadata Rows Summary

**Static Homebrew, vfox, and editor metadata rows are now validated through the shared registry for inventory consumption.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-13T20:57:35Z
- **Completed:** 2026-06-13T21:05:50Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added RED coverage for INV-01/D-05 package-manager, version-manager, editor, formula, and cask registry lookups.
- Added colocated metadata arrays for Homebrew, vfox, VS Code, Neovim, WebStorm, IntelliJ IDEA, Cursor, and Zed.
- Aggregated all new metadata through `validateToolMetadata` without adding scanner logic, command execution, UI changes, or PluginRegistry expansion.

## Task Commits

1. **Task 1: Add failing metadata seed coverage for inventory categories** - `08c452e` (test)
2. **Task 2: Seed plugin-backed metadata arrays and aggregate them** - `f918324` (feat)

**Plan metadata:** captured in final docs commit after state updates.

## Files Created/Modified

- `src/plugins/first-party/homebrew/metadata.ts` - Homebrew package-manager metadata.
- `src/plugins/first-party/vfox/metadata.ts` - vfox version-manager metadata with Homebrew formula evidence.
- `src/plugins/first-party/vscode/metadata.ts` - VS Code editor metadata with app path and cask evidence.
- `src/plugins/first-party/neovim/metadata.ts` - Neovim editor metadata with formula and config path evidence.
- `src/plugins/first-party/jetbrains/metadata.ts` - WebStorm and IntelliJ IDEA editor metadata from the existing JetBrains plugin module.
- `src/plugins/first-party/cursor/metadata.ts` - Cursor editor metadata with app path and cask evidence.
- `src/plugins/first-party/zed/metadata.ts` - Zed editor metadata with app path, cask, and config path evidence.
- `src/tools/registry.ts` - Imports and spreads the seven new metadata arrays through validation.
- `tests/unit/tool-metadata.test.ts` - Adds INV-01/D-05 category and Homebrew lookup assertions.

## Decisions Made

- Kept registry helpers pure and side-effect free; tests use only static metadata and registry helpers.
- Used `webstorm` and `intellij` for JetBrains coverage because `src/plugins/first-party/jetbrains/index.ts` exposes those first-party plugin IDs and casks, not a JetBrains Toolbox plugin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced unsupported Vitest `-x` verification flag**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** `npm run test -- tests/unit/tool-metadata.test.ts -x` fails before running tests because Vitest 4.1.2 reports `Unknown option '-x'`.
- **Fix:** Ran the same targeted test file without the unsupported flag: `npm run test -- tests/unit/tool-metadata.test.ts`.
- **Files modified:** None
- **Verification:** RED failure showed the intended missing metadata rows before implementation; GREEN run passed 17 tests after implementation.
- **Committed in:** N/A, command-only adjustment

**2. [Rule 1 - Bug] Avoided unbacked JetBrains Toolbox metadata**
- **Found during:** Task 2 implementation
- **Issue:** The plan text named JetBrains Toolbox, but the corresponding first-party plugin module confirms WebStorm and IntelliJ IDEA plugin IDs/casks only. Adding an unconfirmed Toolbox row would weaken T-02-06's exact metadata derivation requirement.
- **Fix:** Implemented `jetbrainsToolMetadata` with `webstorm` and `intellij` rows derived from `src/plugins/first-party/jetbrains/index.ts`.
- **Files modified:** `src/plugins/first-party/jetbrains/metadata.ts`, `tests/unit/tool-metadata.test.ts`
- **Verification:** Targeted metadata tests, build, and lint passed.
- **Committed in:** `f918324`

---

**Total deviations:** 2 auto-fixed (1 blocking command issue, 1 metadata correctness issue)
**Impact on plan:** Registry coverage satisfies INV-01 and D-05 using confirmed first-party plugin facts; no command execution or PluginRegistry expansion was introduced.

## Issues Encountered

- The plan's exact targeted test command includes an unsupported Vitest flag. The valid targeted command was used and recorded above.
- The working tree contained unrelated pre-existing local changes (`.planning/config.json`, `.vscode/mcp.json`, `.bg-shell/`, `.codex/`, `.mcp.json`). They were left untouched and unstaged.

## Verification

- `npm run test -- tests/unit/tool-metadata.test.ts -x` - failed before test execution due unsupported Vitest `-x` flag.
- `npm run test -- tests/unit/tool-metadata.test.ts` - passed, 17 tests.
- `npm run build` - passed.
- `npm run lint` - passed.

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 can consume package-manager, version-manager, and editor rows from `allToolMetadata`. The registry remains static and pure, so later inventory scanner work can classify these rows without triggering plugin command behavior.

## Self-Check: PASSED

- Created files exist: all seven `src/plugins/first-party/*/metadata.ts` files were found.
- Modified files exist: `src/tools/registry.ts` and `tests/unit/tool-metadata.test.ts` were found.
- Task commits exist: `08c452e` and `f918324` were found in git history.
- No tracked file deletions were introduced by Task 2.

---
*Phase: 02-machine-inventory-scanner*
*Completed: 2026-06-13*
