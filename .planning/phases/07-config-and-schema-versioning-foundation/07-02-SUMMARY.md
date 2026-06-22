---
phase: 07-config-and-schema-versioning-foundation
plan: 02
subsystem: config
tags: [typescript, cli, schema-metadata, schema-viewer, vitest]

requires:
  - phase: 07-config-and-schema-versioning-foundation
    provides: strict authoritative schemaVersion validation from Plan 07-01
provides:
  - shared tilde config schema metadata for CLI and future docs consumption
  - pure terminal tree and JSON schema metadata formatters
  - read-only `tilde config schema` and `tilde config schema --json` CLI routes
affects: [config, cli, docs-schema-explorer, schema-inspection]

tech-stack:
  added: []
  patterns:
    - explicit schema field metadata descriptors mirrored from runtime Zod schema
    - pure formatting helpers that do not read config files or environment values
    - non-UI CLI subcommands emit deterministic stdout without Ink cursor escapes

key-files:
  created:
    - src/config/schema-metadata.ts
    - src/config/schema-viewer.ts
    - tests/unit/config/schema-metadata.test.ts
    - tests/unit/config/schema-viewer.test.ts
  modified:
    - src/index.tsx
    - tests/integration/cli-regression.test.ts

key-decisions:
  - "Shared schema metadata is explicit TypeScript data keyed to CURRENT_SCHEMA_VERSION rather than generated from Zod JSON Schema."
  - "`tilde config schema` branches before config path resolution so schema inspection works without any user config file."
  - "Ink cursor restoration now runs only before render paths so machine-readable subcommand stdout remains parseable."

patterns-established:
  - "Schema inspection formatters stay pure and import only schema metadata."
  - "Config schema metadata includes structural field paths, required/default markers, deprecation notes, and version notes without example secret values."

requirements-completed: [SCHEMA-02, SCHEMA-03]

duration: 6min
completed: 2026-06-21
---

# Phase 07 Plan 02: Config Schema Viewer Summary

**Shared config schema metadata with read-only `tilde config schema` tree and JSON output that does not require a user config file.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-21T19:45:38Z
- **Completed:** 2026-06-21T19:51:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `src/config/schema-metadata.ts` with `ConfigSchemaField`, `ConfigSchemaMetadata`, `tildeConfigSchemaMetadata`, and `flattenConfigSchemaFields()`.
- Added `src/config/schema-viewer.ts` with pure tree and JSON formatters backed by the shared metadata source.
- Updated `src/index.tsx` so `tilde config schema` and `tilde config schema --json` exit successfully before config path resolution.
- Added unit and compiled-CLI regression coverage for metadata shape, formatter output, no-config schema inspection, and parseable JSON.

## Task Commits

1. **Task 1: Add metadata and schema viewer tests** - `42bf184` (`test`)
2. **Task 2: Implement shared metadata and CLI schema route** - `b1c72b4` (`feat`)

## Files Created/Modified

- `src/config/schema-metadata.ts` - Shared structural metadata for the supported tilde config schema.
- `src/config/schema-viewer.ts` - Pure tree and JSON formatting helpers for schema metadata.
- `src/index.tsx` - Adds `--json` parsing, help text, the `config schema` route, and render-only cursor restoration.
- `tests/unit/config/schema-metadata.test.ts` - Verifies metadata version, required/deprecated markers, field paths, and secret-safe descriptions.
- `tests/unit/config/schema-viewer.test.ts` - Verifies terminal tree markers, ordering, and JSON formatter shape.
- `tests/integration/cli-regression.test.ts` - Verifies compiled CLI schema output works without a config file and JSON matches shared metadata.

## Decisions Made

- Kept schema metadata as explicit TypeScript descriptors because Phase 07 research found raw Zod JSON Schema conversion does not directly represent the user-facing contract.
- Treated `config schema` as a config subcommand that does not resolve or read config paths, preserving no-config behavior for validate/show/edit.
- Moved cursor restoration out of non-UI subcommands after integration testing showed the prior global stdout escape prefix made JSON unparsable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed cursor escape prefix from JSON subcommand stdout**
- **Found during:** Task 2 (`npm run test:integration -- tests/integration/cli-regression.test.ts`)
- **Issue:** `main()` wrote the Ink cursor restoration escape sequence to stdout before parsing CLI args, so `tilde config schema --json` emitted invalid JSON.
- **Fix:** Moved cursor restoration setup into render-only paths and left non-UI subcommands with deterministic stdout.
- **Files modified:** `src/index.tsx`
- **Verification:** `npm run test:integration -- tests/integration/cli-regression.test.ts` passed with JSON parsing assertions.
- **Committed in:** `b1c72b4`

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** Required for the planned machine-readable JSON output; no scope expansion.

## Issues Encountered

- A manual acceptance probe initially used `node dist/bin/tilde.js` from `/private/tmp`, which looked for `/private/tmp/dist/bin/tilde.js`. Reran with the absolute compiled binary path and confirmed both tree and JSON output.

## Verification

- `npm test -- --run tests/unit/config/schema-metadata.test.ts tests/unit/config/schema-viewer.test.ts` - passed (2 files, 7 tests)
- `npm run build` - passed
- `npm run test:integration -- tests/integration/cli-regression.test.ts` - passed (24 tests, 1 todo)
- `node /Users/jeff.williams/Developer/personal/tilde/dist/bin/tilde.js config schema` - passed
- `node /Users/jeff.williams/Developer/personal/tilde/dist/bin/tilde.js config schema --json` - passed
- `rg -n "schema|resolveRequiredConfigPath|formatConfigSchema" src/index.tsx` - verified `schema` branch before config resolver
- `rg -n "reader|writer|process\\.env|node:fs|fs" src/config/schema-viewer.ts` - no matches

## Known Stubs

None. Stub-pattern scan found only implementation defaults and a descriptive schema metadata sentence; no incomplete UI/data stubs.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can generate and publish a docs-site schema explorer from the shared metadata source. The CLI JSON output now gives the docs artifact a stable source shape to compare against.

## Self-Check: PASSED

- Found created files: `src/config/schema-metadata.ts`, `src/config/schema-viewer.ts`, `.planning/phases/07-config-and-schema-versioning-foundation/07-02-SUMMARY.md`
- Found task commits: `42bf184`, `b1c72b4`
- No tracked file deletions were introduced by task commits.

---
*Phase: 07-config-and-schema-versioning-foundation*
*Completed: 2026-06-21*
