# Phase 1: Tool Metadata Registry - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates a shared tool metadata registry so existing wizard steps can consume one canonical description of tools without user-visible behavior changes. The registry must support current browser-step migration first while establishing the lookup surface needed by later inventory, dotfile mapping, and provenance phases.

</domain>

<decisions>
## Implementation Decisions

### Registry Ownership and Shape
- **D-01:** Tool metadata should be colocated beside each tool or plugin family, then aggregated centrally for lookup.
- **D-02:** Phase 1 must not force every tool metadata entry to become a full `TildePlugin`.
- **D-03:** The central registry should include both plugin-backed catalogs and non-plugin catalogs.
- **D-04:** Keep `PluginRegistry` integration as a later consolidation path; do not broaden its contract in this phase.
- **D-05:** Each tool family should export typed `ToolMetadata[]` data.
- **D-06:** The central aggregate registry should import family metadata and expose lookup helpers.

### First Migration Target
- **D-07:** Migrate the browser step first because browser metadata is currently duplicated between `src/steps/browser.tsx` and `src/plugins/first-party/browser/index.ts`.
- **D-08:** Move all browser catalog fields into shared metadata in this phase: `id`, `label`, `appPath`, `brewCask`, `defaultBrowserId`, supported platforms, and plugin category.
- **D-09:** `BrowserStep` should preserve its current visible behavior while reading catalog data from the shared metadata layer.

### Metadata Validation
- **D-10:** Validation should be strict for required core fields and shape-validating for optional future fields.
- **D-11:** Required core fields are `id`, `label`, `category`, `supportedPlatforms`, and install identifiers when applicable.
- **D-12:** `configPaths`, `dotfilePaths`, and richer provenance hints may be empty or absent in Phase 1, but must validate when provided.

### Lookup Surface
- **D-13:** Phase 1 should include a broad lookup surface, not only helpers needed by the browser migration.
- **D-14:** Required helpers include `getToolMetadata(id)`, `getToolsByCategory(category)`, `getToolsByPlatform(platform)`, Homebrew formula/cask install-ID lookup, config-path lookup, dotfile-path lookup, variant lookup, source lookup, and simple search or fuzzy matching where useful.

### the agent's Discretion
- The exact module path and naming are the agent's discretion, as long as metadata is colocated by family and centrally aggregated.
- The exact fuzzy/search matching implementation is the agent's discretion, as long as it is simple, deterministic, and testable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Defines the milestone sequence, core value, constraints, and decision to start with GitHub issue #98.
- `.planning/REQUIREMENTS.md` — Defines Phase 1 requirements `META-01` through `META-05`.
- `.planning/ROADMAP.md` — Defines Phase 1 goal, success criteria, and planned slices.
- `.planning/STATE.md` — Records current focus and project concerns.

### Existing Code
- `src/plugins/api.ts` — Defines current plugin categories and uneven plugin interface shapes.
- `src/plugins/registry.ts` — Defines the existing `PluginRegistry`, which should not be broadened prematurely in Phase 1.
- `src/plugins/first-party/browser/index.ts` — Existing browser plugin catalog and behavior.
- `src/steps/browser.tsx` — First migration target; currently owns duplicated browser catalog metadata.
- `src/plugins/first-party/ai-tools/index.ts` — Existing colocated AI tool family catalog pattern.
- `src/steps/ai-tools.tsx` — Existing step consuming a tool-family registry.
- `src/steps/tools.tsx` — Existing non-plugin inline catalog for note-taking tools, useful as a later non-plugin metadata example.
- `tests/unit/browser-plugins.test.ts` — Existing browser metadata tests to preserve or adapt.
- `tests/unit/ai-tools.test.ts` — Existing AI tool metadata tests that reveal naming drift to avoid expanding accidentally.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/plugins/first-party/ai-tools/index.ts`: Already demonstrates a tool-family catalog exported as an array and consumed by a wizard step.
- `src/plugins/first-party/browser/index.ts`: Contains browser plugin classes with metadata fields that overlap `src/steps/browser.tsx`.
- `tests/unit/browser-plugins.test.ts`: Covers required browser metadata shape and can guide registry validation tests.

### Established Patterns
- TypeScript ESM uses `.js` import extensions for local modules.
- Wizard steps are Ink/React components under `src/steps/` and should preserve existing keyboard and display behavior.
- External command and filesystem detection should stay mockable in tests.
- First-party plugin contracts are not uniform across categories, so metadata should not assume every entry implements `TildePlugin`.

### Integration Points
- `BrowserStep` should consume browser catalog data from the shared metadata layer while retaining install and default-browser behavior.
- Later phases will use the same registry to answer inventory, dotfile, config-path, and provenance questions.
- The metadata registry should coexist with `PluginRegistry` rather than replacing it during this phase.

</code_context>

<specifics>
## Specific Ideas

- Prefer colocated family metadata files plus one central aggregate registry with typed arrays and helper functions.
- Browser migration is the proof slice and should move all browser catalog fields from inline step data into shared metadata.
- Validation should block missing core fields while allowing later phases to fill in optional config and dotfile paths.

</specifics>

<deferred>
## Deferred Ideas

- Unifying all plugin families under the current `PluginRegistry` is deferred until the metadata model is stable.
- Completing config paths, dotfile paths, and provenance hints for every tool family is deferred to later inventory, dotfiles, and provenance phases.

</deferred>

---

*Phase: 1-Tool Metadata Registry*
*Context gathered: 2026-06-12*
