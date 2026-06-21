---
phase: 07-config-and-schema-versioning-foundation
plan: 04
subsystem: config
tags: [typescript, ink, schema-versioning, mutation-guards, vitest]

requires:
  - phase: 07-config-and-schema-versioning-foundation
    provides: strict schemaVersion metadata from Plan 07-01
provides:
  - future-schema soft blocks for config-first apply paths
  - future-schema soft blocks for reconfigure save and recovery paths
  - future-schema soft blocks for update resource mutation paths
affects: [config-first, reconfigure, update, schema-versioning]

tech-stack:
  added: []
  patterns:
    - metadata-driven mutation guard using loadConfigWithMetadata
    - terminal-safe future-schema upgrade guidance before local writes

key-files:
  created: []
  modified:
    - src/modes/config-first.tsx
    - src/modes/reconfigure.tsx
    - src/modes/update.tsx
    - tests/unit/config-first.test.ts
    - tests/unit/reconfigure.test.ts
    - tests/unit/update-command.test.ts

key-decisions:
  - "Mutation modes consume loadConfigWithMetadata before apply, save, or update UI paths."
  - "Future-schema guidance is split onto a second terminal line so `Upgrade tilde` remains readable in Ink output."
  - "Config-first and reconfigure preserve supported-config partial recovery while blocking future-schema recovery."

patterns-established:
  - "Future-schema mutation checks use metadata.canMutate and metadata.isFutureVersion before local writes."
  - "Fallback partial-recovery paths explicitly reject raw schemaVersion values newer than CURRENT_SCHEMA_VERSION."

requirements-completed: [SCHEMA-01]

duration: 13min
completed: 2026-06-21
---

# Phase 07 Plan 04: Future-Schema Mutation Guards Summary

**Unsupported future-schema configs now stay inspectable but cannot be applied, reconfigured, updated, or rewritten by mutation modes.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-21T19:55:08Z
- **Completed:** 2026-06-21T20:08:07Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added RED coverage for config-first explicit and discovered config flows, including Phase 06 confirmation behavior before loading discovered configs.
- Added reconfigure and update command coverage proving future-schema metadata shows upgrade guidance and prevents writes.
- Updated `ConfigFirstMode`, `ReconfigureMode`, and `UpdateCommand` to call `loadConfigWithMetadata()` and soft-block when `canMutate` is false or `isFutureVersion` is true.
- Preserved supported-config partial recovery in config-first and reconfigure while adding raw future-schema checks before recovery can rewrite a newer config.

## Task Commits

1. **Task 1: Add mutation soft-block tests for future schema configs** - `058d481` (`test`)
2. **Task 2: Wire future-schema guards into mutation modes** - `29d835c` (`feat`)

## Files Created/Modified

- `src/modes/config-first.tsx` - Uses load metadata before confirmation/apply choices and blocks future schemas before apply or fallback recovery.
- `src/modes/reconfigure.tsx` - Uses load metadata before wizard launch and blocks future schemas before recovery or save.
- `src/modes/update.tsx` - Uses load metadata before resource update UI and blocks future schemas with exit code 3 error state.
- `tests/unit/config-first.test.ts` - Covers explicit and discovered future-schema blocks plus discovered confirmation before load.
- `tests/unit/reconfigure.test.ts` - Covers future-schema reconfigure block before wizard/recovery/write.
- `tests/unit/update-command.test.ts` - Covers future-schema update block before resource UI/write.

## Decisions Made

- Kept the mutation block local to the existing mode error states instead of adding a new UI phase type.
- Split the upgrade sentence onto a second line because Ink wrapped the one-line guidance between `Upgrade` and `tilde`, weakening the terminal output and assertions.
- Retained config-first and reconfigure supported-config recovery paths, but added raw schemaVersion checks so future-version configs do not use those recovery paths.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The RED test run failed as expected before implementation: 4 new assertions failed while 27 existing assertions passed.
- Ink wrapped the long guidance sentence between `Upgrade` and `tilde`; the message was split across two sentences/lines so the required guidance phrase remains visible and stable.

## Verification

- `npm test -- --run tests/unit/config-first.test.ts tests/unit/reconfigure.test.ts tests/unit/update-command.test.ts` - passed (31 tests)
- `npm test -- --run tests/unit/config tests/unit/index` - passed (100 tests)
- `rg "loadConfigWith|canMutate|isFutureVersion" src/modes/config-first.tsx src/modes/reconfigure.tsx src/modes/update.tsx` - verified guard wiring in all three modes
- `rg "atomicWriteConfig" src/modes/config-first.tsx src/modes/reconfigure.tsx src/modes/update.tsx` - verified writes remain after supported load/recovery checks or in update branches reached only after supported metadata

## Known Stubs

None. Stub-pattern scan found only internal empty array/object initialization, not user-facing placeholders or unwired data.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Mutation safety for unsupported future `tilde.config.json` versions is in place. Read-only schema inspection from Plan 07-02 remains unaffected because it does not use these mutation modes.

## Self-Check: PASSED

- Found summary file: `.planning/phases/07-config-and-schema-versioning-foundation/07-04-SUMMARY.md`
- Found task commits: `058d481`, `29d835c`
- No tracked file deletions were introduced by task commits.

---
*Phase: 07-config-and-schema-versioning-foundation*
*Completed: 2026-06-21*
