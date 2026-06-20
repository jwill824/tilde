---
phase: 04-provenance-summary
plan: 1
subsystem: inventory
tags: [provenance, inventory, metadata, vitest]
requires:
  - phase: 02-machine-inventory-scanner
    provides: InventoryReport evidence, Homebrew request status, app-path facts, scanner-owned shell/core-tool facts
  - phase: 03-dotfiles-discovery-map
    provides: Concise inventory summary constraints and warning preservation
provides:
  - Shared provenance derivation helper for inventory facts, config intent, and tool metadata
  - User-facing provenance grouping and summary formatting
  - Unit coverage for selected precedence, Homebrew dependency handling, manual GUI labels, OS-provided rules, and unknown paths
affects: [inventory-summary, config-first, wizard-confirmation]
tech-stack:
  added: []
  patterns:
    - Evidence-first inventory derivation with structured detail preserved for future audit views
key-files:
  created:
    - tests/unit/inventory-provenance.test.ts
  modified:
    - src/inventory/provenance.ts
key-decisions:
  - "Primary provenance labels use PROV-01 user-facing categories; Homebrew direct remains detail under already-installed."
  - "OS-provided is limited to scanner-owned shell:* and core-tool:* installed facts with shell or command evidence."
  - "Selected tools keep tilde-managed as primary while action/detail text explains installed, dependency, manual, or unknown evidence."
patterns-established:
  - "deriveInventoryProvenance(report, config?) is the shared classifier boundary for UI surfaces."
  - "formatProvenanceSummaryLine() emits one concise grouped line with at most three examples per group."
requirements-completed: [PROV-01, PROV-03, PROV-04]
duration: 6 min
completed: 2026-06-20
---

# Phase 04 Plan 01: Provenance Categories Summary

**Evidence-backed provenance derivation with config-aware tilde-managed precedence and concise grouped formatting**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-20T01:02:00Z
- **Completed:** 2026-06-20T01:08:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added unit coverage for PROV-01 categories, PROV-03 action text, and PROV-04 shared derivation from inventory/config/metadata.
- Reconciled the interrupted provenance helper to use `already-installed`, `homebrew-dependency`, `manual-install`, `manual-gui`, `os-provided`, `tilde-managed`, and `unknown`.
- Preserved structured `evidence` and `warningIds` while keeping `formatProvenanceSummaryLine()` concise.

## Task Commits

1. **Task 1 and Task 2: Provenance contract and implementation** - `2bb1a61` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/inventory/provenance.ts` - Shared provenance derivation, grouping, detail/action text, and summary line formatting.
- `tests/unit/inventory-provenance.test.ts` - Unit coverage for precedence, categories, grouping, warning preservation, and unknown selected paths.

## Decisions Made

- Homebrew direct is not a primary user-facing label; it appears as detail for `already-installed` or `tilde-managed` records.
- OS-provided classification requires scanner-owned ids and concrete shell/command evidence, avoiding broad `core-tool` fallback labels.
- Unknown selected tools remain non-blocking and return cautious action text.

## Deviations from Plan

The two TDD tasks were committed together because the interrupted helper already existed untracked and the contract plus implementation were reconciled in one local pass. The RED run was still performed and failed before the helper patch, then passed after implementation.

**Total deviations:** 1 procedural deviation.
**Impact on plan:** Behavioral scope stayed within Plan 04-01; verification passed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run test -- tests/unit/inventory-provenance.test.ts` - passed
- `npm run build` - passed

## Next Phase Readiness

Plan 04-02 can now render shared provenance output through `summarizeInventory(report, config?)` in config-first and wizard confirmation paths.

---
*Phase: 04-provenance-summary*
*Completed: 2026-06-20*
