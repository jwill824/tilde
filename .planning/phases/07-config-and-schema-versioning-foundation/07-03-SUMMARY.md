---
phase: 07-config-and-schema-versioning-foundation
plan: 03
subsystem: docs
tags: [schema-metadata, astro, starlight, config-schema, vitest]

requires:
  - phase: 07-config-and-schema-versioning-foundation
    provides: shared runtime config schema metadata and CLI schema viewer from Plan 07-02
provides:
  - generated docs JSON artifact for tilde config schema metadata
  - docs artifact freshness test comparing generated JSON to runtime metadata
  - Starlight Configuration Schema page backed by the generated metadata artifact
affects: [docs, config-schema, schema-inspection]

tech-stack:
  added: []
  patterns:
    - checked-in generated docs metadata from shared TypeScript schema metadata
    - docs-only Astro component with browser-side filtering and native details disclosure

key-files:
  created:
    - scripts/generate-schema-metadata.ts
    - site/docs/src/data/tilde-config-schema.json
    - site/docs/src/components/SchemaExplorer.astro
    - site/docs/src/content/docs/config-schema.mdx
    - tests/unit/config/schema-metadata-artifact.test.ts
  modified:
    - package.json
    - site/docs/astro.config.mjs

key-decisions:
  - "Docs schema metadata is generated from tildeConfigSchemaMetadata and checked in for the Starlight build."
  - "The schema explorer uses the generated artifact and browser DOM controls only; it does not add a config validator or playground."

patterns-established:
  - "Run npm run generate:schema-metadata after changing src/config/schema-metadata.ts."
  - "Docs schema explorer pages import site/docs/src/data/tilde-config-schema.json instead of hand-maintaining schema tables."

requirements-completed: [SCHEMA-02, SCHEMA-03]

duration: 34min
completed: 2026-06-21
---

# Phase 07 Plan 03: Docs Schema Explorer Summary

**Generated config schema metadata artifact with a Starlight schema explorer page backed by the same source as `tilde config schema --json`.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-06-22T00:10:46Z
- **Completed:** 2026-06-22T00:44:24Z
- **Tasks:** 2 committed, 1 not committed
- **Files modified:** 7 committed

## Accomplishments

- Added a TDD freshness test proving the checked-in docs JSON artifact matches `tildeConfigSchemaMetadata` exactly.
- Added `scripts/generate-schema-metadata.ts` and `npm run generate:schema-metadata` to write `site/docs/src/data/tilde-config-schema.json`.
- Published a dedicated Starlight Configuration Schema page using `SchemaExplorer.astro`.
- Added search, expand/collapse controls, and detail panels for type, required status, default, since, deprecation, and descriptions.

## Task Commits

1. **Task 1 RED: Add generated metadata artifact freshness test** - `11f27af` (`test`)
2. **Task 1 GREEN: Generate docs schema metadata artifact** - `47505f1` (`feat`)
3. **Task 2: Build the Starlight schema explorer page** - `fd9f0e0` (`feat`)
4. **Task 3: Align static config docs with schemaVersion authority** - not committed before interruption

## Files Created/Modified

- `tests/unit/config/schema-metadata-artifact.test.ts` - Compares the docs artifact to runtime schema metadata and checks for raw secret-like examples.
- `scripts/generate-schema-metadata.ts` - Serializes shared schema metadata into the docs data artifact.
- `package.json` - Adds the `generate:schema-metadata` script.
- `site/docs/src/data/tilde-config-schema.json` - Checked-in generated schema metadata artifact.
- `site/docs/src/components/SchemaExplorer.astro` - Interactive docs explorer for grouped schema fields.
- `site/docs/src/content/docs/config-schema.mdx` - Dedicated Configuration Schema page.
- `site/docs/astro.config.mjs` - Adds the Configuration Schema sidebar entry.

## Decisions Made

- Used a checked-in JSON artifact so the docs site can build from stable metadata without importing the CLI source directly.
- Kept explorer behavior to search, disclosure panels, and expand/collapse controls; no in-browser config validator or playground was introduced.
- Left interrupted static-doc edits uncommitted during close-out per operator instruction to stop further production edits.

## Deviations from Plan

### Auto-fixed Issues

None.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** Task 1 and Task 2 were completed and committed. Task 3 remains incomplete in committed history.

## Issues Encountered

- `npm run generate:schema-metadata` initially failed in the sandbox because `tsx` could not create its temporary IPC pipe under the system temp directory. Rerunning the same command with approval succeeded.
- Execution was interrupted during Task 3 before static config docs were committed. Uncommitted docs edits were intentionally not touched during this close-out.

## Verification

- `npm run generate:schema-metadata` - passed.
- `npm test -- --run tests/unit/config/schema-metadata-artifact.test.ts` - passed.
- Manual artifact drift check - passed by temporarily editing the artifact, confirming the test failed, and regenerating the artifact.
- `rg "op://|ghp_|sk-" site/docs/src/data/tilde-config-schema.json` - no matches.
- `rg "SchemaExplorer" site/docs/src/content/docs/config-schema.mdx` - matched import and usage.
- `rg "Configuration Schema|config-schema" site/docs/astro.config.mjs` - matched sidebar entry.
- `rg "Search fields|Expand all|Collapse all|Type|Required|Default|Since" site/docs/src/components/SchemaExplorer.astro` - matched required controls and detail labels.
- `rg "validator|playground" site/docs/src/content/docs/config-schema.mdx site/docs/src/components/SchemaExplorer.astro` - no matches.
- `cd site/docs && npm run build` - passed.
- `npm run validate:config-doc` - not run after interruption because Task 3 was not completed.

## Known Stubs

None in committed files.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The generated metadata artifact and docs schema explorer are ready for use. Static config docs still need a committed follow-up to align `schemaVersion`, `version`, and `packageManagers` prose with the Phase 07 policy.

## Self-Check: FAILED

- Found created files: `scripts/generate-schema-metadata.ts`, `site/docs/src/data/tilde-config-schema.json`, `site/docs/src/components/SchemaExplorer.astro`, `site/docs/src/content/docs/config-schema.mdx`, `tests/unit/config/schema-metadata-artifact.test.ts`, `.planning/phases/07-config-and-schema-versioning-foundation/07-03-SUMMARY.md`.
- Found task commits: `11f27af`, `47505f1`, `fd9f0e0`.
- Missing committed Task 3 close-out: static config docs alignment was started but not committed before interruption.
- Worktree was not clean at close-out: `docs/config-format.md` and `site/docs/src/content/docs/config-format.md` had unstaged interrupted production edits and were intentionally left untouched.

---
*Phase: 07-config-and-schema-versioning-foundation*
*Completed: 2026-06-21*
