---
phase: 07-config-and-schema-versioning-foundation
plan: 01
subsystem: config
tags: [typescript, zod, schema-versioning, migrations, config-reader]

requires:
  - phase: 06-stabilization-and-config-selection-polish
    provides: stabilized config selection and trusted CLI behavior
provides:
  - strict authoritative schemaVersion validation for tilde.config.json
  - major.minor schema version parser and comparator helpers
  - semver-aware migration runner without parseFloat ordering
  - supported-config unknown-field warning and atomic cleanup rewrite
affects: [config, migrations, schema-inspection, future-schema-soft-blocking]

tech-stack:
  added: []
  patterns:
    - dependency-free major.minor version parsing
    - post-validation atomic rewrite for supported config cleanup

key-files:
  created:
    - src/config/schema-version.ts
    - tests/unit/config/schema-version.test.ts
  modified:
    - src/config/schema.ts
    - src/config/migrations/runner.ts
    - src/config/migrations/v1-5.ts
    - src/config/migrations/v1.ts
    - src/config/reader.ts
    - tests/unit/config/schema-v2.test.ts
    - tests/unit/config/migration-runner.test.ts
    - tests/contract/config-schema.test.ts

key-decisions:
  - "schemaVersion is required, string-only, and must use major.minor without patch values."
  - "Migration ordering uses parsed major/minor tuples, not parseFloat."
  - "Supported configs with unknown fields warn with field paths only, then rewrite using parsed supported fields."

patterns-established:
  - "Config schema versions are parsed through src/config/schema-version.ts before comparison."
  - "loadConfigWithMetadata exposes future-version and mutation metadata while loadConfig preserves the existing return shape."

requirements-completed: [SCHEMA-01]

duration: 33min
completed: 2026-06-21
---

# Phase 07 Plan 01: Schema Version Policy Summary

**Strict major.minor config schemaVersion handling with semver-aware migrations and supported-config cleanup rewrites.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-06-21T19:03:53Z
- **Completed:** 2026-06-21T19:37:20Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `src/config/schema-version.ts` with parser, comparator, and greater-than helpers for `major.minor` schema versions.
- Updated `TildeConfigSchema` so `schemaVersion` is authoritative, required, string-only, and rejects missing, numeric, malformed, and patch-bearing values.
- Replaced migration `parseFloat` ordering with tuple comparison and bumped `CURRENT_SCHEMA_VERSION` to `1.7`.
- Moved local migration rewrites after successful validation and added supported unknown-field warnings plus atomic cleanup rewrites.
- Added load metadata via `loadConfigWithMetadata()` for future-version and mutation-path follow-up work.

## Task Commits

1. **Task 1: Add schema version and compatibility regression tests** - `5cd5d72` (`test`)
2. **Task 2: Implement authoritative schemaVersion policy and supported-config cleanup** - `84b2058` (`feat`)

## Files Created/Modified

- `src/config/schema-version.ts` - Pure parser/comparator helpers for `major.minor` schema versions.
- `src/config/schema.ts` - Requires validated string `schemaVersion` without defaulting or numeric coercion.
- `src/config/migrations/runner.ts` - Uses tuple comparison and current schema version `1.7`.
- `src/config/migrations/v1-5.ts` - Registers the v1 baseline migration under `1.0`.
- `src/config/migrations/v1.ts` - Updates migration documentation for major.minor keys.
- `src/config/reader.ts` - Warns on unknown supported fields, rewrites validated supported configs, and exposes load metadata.
- `tests/unit/config/schema-version.test.ts` - Covers parsing, invalid inputs, and numeric ordering.
- `tests/unit/config/schema-v2.test.ts` - Covers strict `schemaVersion` Zod behavior.
- `tests/unit/config/migration-runner.test.ts` - Covers malformed versions, future versions, `1.10` ordering, and v1.5 migration preservation.
- `tests/contract/config-schema.test.ts` - Covers required persisted `schemaVersion` and unknown-field cleanup rewrites.

## Decisions Made

- Kept top-level `version` accepted as deprecated legacy metadata, but not schema authority.
- Preserved `loadConfig()` compatibility by returning `TildeConfig`, and added `loadConfigWithMetadata()` for Plan 04 mutation soft-block wiring.
- Ran contract verification through `npm run test:contract` because the default unit Vitest config excludes `tests/contract`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated v1 migration source key to major.minor**
- **Found during:** Task 2 (implementation)
- **Issue:** Existing v1 migration registration used source key `1`, which would be invalid under the new required `major.minor` parser.
- **Fix:** Changed the registration and baseline migration comments to use `1.0`.
- **Files modified:** `src/config/migrations/v1-5.ts`, `src/config/migrations/v1.ts`
- **Verification:** Unit migration tests cover `1.0` to current migration and v1.5 package manager migration preservation.
- **Committed in:** `84b2058`

---

**Total deviations:** 1 auto-fixed (Rule 2).
**Impact on plan:** Required for correctness of the planned major.minor migration policy; no scope expansion.

## Issues Encountered

- The plan's exact `npm test -- --run ... tests/contract/config-schema.test.ts` command exits 0 but the repo's default Vitest config only includes unit tests, so it reports 3 test files. I also ran `npm run test:contract -- --run tests/contract/config-schema.test.ts`, which executed the contract file and passed.
- Contract tests write a canonical test config under `~/.tilde`, so the contract command required filesystem approval outside the workspace sandbox.

## Verification

- `npm test -- --run tests/unit/config/schema-version.test.ts tests/unit/config/schema-v2.test.ts tests/unit/config/migration-runner.test.ts tests/contract/config-schema.test.ts` - passed (3 unit files, 29 tests)
- `npm run test:contract -- --run tests/contract/config-schema.test.ts` - passed (1 contract file, 14 tests)
- `npm run build` - passed
- `rg "parseFloat" src/config/migrations/runner.ts` - no matches
- `rg "default\('1\.6'\)|default\('1\.7'\)" src/config/schema.ts` - no matches

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can build shared schema metadata and `tilde config schema` on top of the strict runtime schema contract. Plan 04 can use `loadConfigWithMetadata()` to soft-block mutation paths for unsupported future schema versions.

## Self-Check: PASSED

- Found created files: `src/config/schema-version.ts`, `tests/unit/config/schema-version.test.ts`, `.planning/phases/07-config-and-schema-versioning-foundation/07-01-SUMMARY.md`
- Found task commits: `5cd5d72`, `84b2058`
- No tracked file deletions were introduced by task commits.

---
*Phase: 07-config-and-schema-versioning-foundation*
*Completed: 2026-06-21*
