# Roadmap: tilde Searchable Tool and Config Ecosystem

## Overview

v1.0 shipped the machine inventory and provenance foundation: shared tool metadata, installed-tool scanning, dotfile discovery, provenance summaries, and safer config discovery. v1.1 builds on that foundation by stabilizing the existing CLI surfaces, formalizing config/schema evolution, and introducing the first searchable ecosystem layer for tools, packages, plugins, and macOS defaults.

## Completed Milestones

- [x] **v1.0: Machine Inventory and Provenance** - Shipped metadata registry, inventory scanner, dotfile map, provenance summary, and config discovery polish. See `.planning/milestones/v1.0-ROADMAP.md` and `.planning/milestones/v1.0-REQUIREMENTS.md`.

## Current Milestone: v1.1 Searchable Tool and Config Ecosystem

**Goal:** tilde can describe, validate, and search developer-environment resources through stable config/schema foundations and a first-pass wrapper API.

**Phase Numbering:**

- Phase numbering continues from v1.0.
- v1.1 starts at Phase 6.

## Phases

- [ ] **Phase 6: Stabilization and Config Selection Polish** - Close known correctness issues before widening the surface area. GitHub: #52, #60, #74.
- [ ] **Phase 7: Config and Schema Versioning Foundation** - Standardize tilde config and related schema evolution so new searchable resources can be managed safely. GitHub: #54, #81, #83.
- [ ] **Phase 8: Search Wrapper API Core** - Create the consistent search abstraction for packages, plugins, extensions, defaults, and dotfile-backed resources. GitHub: #105, #31.
- [ ] **Phase 9: Registry-backed Ecosystem Search UX** - Wire the wrapper API into concrete Homebrew, macOS defaults, and plugin registry search flows. GitHub: #84, #70, #56.

## Phase Details

### Phase 6: Stabilization and Config Selection Polish

**Goal:** Fix known correctness and trust issues in generated outputs, plugin ownership labels, and config selection prompts before expanding tilde's search surface.
**Mode:** mvp
**Depends on:** v1.0 completion
**Requirements:** [STAB-01, STAB-02, STAB-03]
**GitHub:** #52, #60, #74

**Success Criteria** (what must be TRUE):

1. Generated JavaScript artifacts no longer copy or expose `.tsx` source content incorrectly.
2. `tilde plugin list` reports first-party/plugin ownership from explicit registry metadata that users can understand.
3. When a config exists but was not specified with `--config`, tilde prompts or explains the selected config path before proceeding in interactive flows.
4. Tests cover each regression without running real external package managers or editors.

### Phase 7: Config and Schema Versioning Foundation

**Goal:** tilde has a clear, versioned schema story for `tilde.config.json`, `repos.json`, and schema inspection.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** [SCHEMA-01, SCHEMA-02, SCHEMA-03]
**GitHub:** #54, #81, #83

**Success Criteria** (what must be TRUE):

1. `tilde.config.json` has an explicit versioning and migration policy documented in code and user-facing docs.
2. `repos.json` can carry a schema version without breaking existing configs.
3. Users or maintainers can inspect the effective schema through a CLI schema-viewer path.
4. Tests cover migration, validation, and compatibility behavior.

### Phase 8: Search Wrapper API Core

**Goal:** tilde exposes a shared internal API for searching and describing external resource ecosystems without hardcoding each flow into wizard steps.
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** [WRAP-01, WRAP-02, WRAP-03]
**GitHub:** #105, #31

**Success Criteria** (what must be TRUE):

1. Search providers share a typed interface for query, result identity, install/config target, source ecosystem, and confidence.
2. The API can represent package managers, extensions, plugins, macOS defaults, and dotfile mappings without resolving secrets.
3. Provider failures are reported as non-fatal search diagnostics.
4. Tests mock all external commands and network-adjacent behavior.

### Phase 9: Registry-backed Ecosystem Search UX

**Goal:** Users can search concrete ecosystems through tilde using registry-backed metadata and safe command boundaries.
**Mode:** mvp
**Depends on:** Phase 8
**Requirements:** [SEARCH-01, SEARCH-02, SEARCH-03]
**GitHub:** #84, #70, #56

**Success Criteria** (what must be TRUE):

1. tilde can search Homebrew formulae through the wrapper API and display actionable results.
2. tilde can search macOS defaults metadata without requiring destructive writes.
3. tilde can search registered plugins/resources using the shared tool metadata registry.
4. CLI output remains usable in non-interactive contexts and includes source/provenance hints.

## Deferred From v1.1

- New wizard step families: terminal emulators, productivity apps, notes, zsh plugins, expanded browser features. GitHub: #82, #96, #97, #101, #108, #109, #110.
- Distribution and install-channel work: Homebrew formula, bootstrap Node cleanup, pnpm/yarn global install, canary releases. GitHub: #2, #3, #5, #62.
- Platform expansion: Windows support, OS-specific configs beyond schema groundwork, Nix/MacPorts, additional secrets backends. GitHub: #7, #8, #55, #107.
- Docs/marketing refresh and demos. GitHub: #69, #80, #111.

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Stabilization and Config Selection Polish | 0/1 | In Progress | - |
| 7. Config and Schema Versioning Foundation | 0/0 | Planned | - |
| 8. Search Wrapper API Core | 0/0 | Planned | - |
| 9. Registry-backed Ecosystem Search UX | 0/0 | Planned | - |
