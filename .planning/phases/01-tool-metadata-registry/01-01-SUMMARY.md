---
phase: 01-tool-metadata-registry
plan: 01
subsystem: metadata
tags: [tool-metadata, zod, registry, browser, note-taking]
requires: []
provides:
  - Static ToolMetadata schema and validation helpers
  - Browser metadata catalog colocated with first-party browser plugins
  - Non-plugin note-taking metadata catalog
  - Pure central registry lookup and search helpers
affects: [browser-step, inventory, provenance, dotfiles]
tech-stack:
  added: []
  patterns:
    - Colocated family metadata arrays aggregated by src/tools/registry.ts
    - Runtime validation with Zod before exposing aggregate metadata
key-files:
  created:
    - src/tools/metadata.ts
    - src/tools/registry.ts
    - src/tools/note-taking-metadata.ts
    - src/plugins/first-party/browser/metadata.ts
    - tests/unit/tool-metadata.test.ts
  modified:
    - tests/unit/tool-metadata.test.ts
key-decisions:
  - "Keep metadata as static family-owned arrays rather than broadening PluginRegistry."
  - "Allow note-taking as a non-plugin category in ToolCategorySchema for the first non-plugin registry slice."
  - "Keep registry helpers pure and side-effect free; command execution remains in plugin and wizard modules."
patterns-established:
  - "Tool families export typed ToolMetadata[] data."
  - "The aggregate registry validates all metadata before exposing lookup helpers."
requirements-completed: [META-01, META-02, META-04, META-05]
duration: 16 min
completed: 2026-06-13
---

# Phase 01 Plan 01: Tool Metadata Registry Slice Summary

**Zod-validated browser and note-taking metadata catalogs with pure central lookup helpers**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-13T13:56:47Z
- **Completed:** 2026-06-13T14:12:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `ToolMetadata` schemas, inferred types, aggregate array validation, and descriptive validation errors.
- Added first-party browser metadata for Safari, Chrome, Firefox, Arc, Brave, and Edge.
- Added non-plugin note-taking metadata for Obsidian, Notion, and Bear.
- Added a side-effect-free central registry with id, category, platform, Homebrew formula/cask/id, config path, dotfile path, variant, source, and deterministic search helpers.
- Added unit tests for seed data, validation failures, and lookup behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing registry behavior tests** - `e79a49c` (test)
2. **Task 2: Implement browser and note-taking metadata registry slice** - `8363d8b` (feat)

## Files Created/Modified

- `src/tools/metadata.ts` - Zod schemas, inferred metadata types, duplicate-id validation, and validation helper.
- `src/tools/registry.ts` - Aggregate registry and pure lookup/search helpers.
- `src/tools/note-taking-metadata.ts` - Obsidian, Notion, and Bear metadata.
- `src/plugins/first-party/browser/metadata.ts` - Browser metadata colocated with browser plugins.
- `tests/unit/tool-metadata.test.ts` - Registry seed, validation, and lookup coverage.

## Decisions Made

- Kept `PluginRegistry` unchanged because Phase 1 explicitly defers broad plugin contract consolidation.
- Added `note-taking` to the tool metadata category schema so non-plugin catalogs can be represented without becoming `TildePlugin` implementations.
- Kept `searchTools` deterministic and simple by matching normalized id, label, category, Homebrew ids, defaultbrowser id, and variants.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep.

## Issues Encountered

- The initial search assertion used query `note`, which correctly matched the `note-taking` category for all note apps. The assertion was tightened to search `notion`.

## Verification

- `npm run test -- tests/unit/tool-metadata.test.ts` - passed, 11 tests.
- `npm run build` - passed.
- `npm run test -- tests/unit/tool-metadata.test.ts tests/unit/browser-step.test.tsx` - passed, targeted metadata coverage. `browser-step.test.tsx` is not present yet, so Vitest ran the existing metadata test file.
- `npm test` - passed, 23 files and 243 tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The shared registry foundation is ready for Plan 02 to migrate the browser wizard and browser plugin alignment to consume `browserToolMetadata` without visible behavior changes.

---
*Phase: 01-tool-metadata-registry*
*Completed: 2026-06-13*
