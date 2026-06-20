# Roadmap: tilde Machine Inventory and Provenance

## Overview

This roadmap turns tilde from a setup wizard into a machine-aware setup assistant. The work starts with issue #98 because a shared metadata registry is the foundation for installed-tool detection, dotfile mapping, provenance summaries, and later ecosystem search features.

## Phases

**Phase Numbering:**

- Integer phases are planned milestone work.
- Phase 1 is the immediate next milestone and covers GitHub issue #98.

- [x] **Phase 1: Tool Metadata Registry** - Create the shared data model and registry lookup layer for wizard tool metadata. (completed 2026-06-13)
- [x] **Phase 2: Machine Inventory Scanner** - Detect installed tools and Homebrew direct-vs-dependency provenance. (completed 2026-06-13)
- [x] **Phase 3: Dotfiles Discovery Map** - Map known dotfiles and rc-file contents to tools. (completed 2026-06-19)
- [x] **Phase 4: Provenance Summary** - Surface clear managed/already-installed/dependency/manual/unknown status to users. (completed 2026-06-20)
- [ ] **Phase 5: Config Discovery Polish** - Improve non-default config discovery and error messaging.

## Phase Details

### Phase 1: Tool Metadata Registry

**Goal**: Existing wizard tool metadata lives in one shared registry that current steps can consume without user-visible behavior changes.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [META-01, META-02, META-03, META-04, META-05]
**GitHub**: #98
**Success Criteria** (what must be TRUE):

  1. Developers can add or edit tool metadata in one shared source.
  2. At least one existing wizard step reads from the shared registry with no visible behavior regression.
  3. Registry metadata includes install identifiers, config paths, dotfile paths, plugin category, labels, and platform support.
  4. Tests fail if required metadata fields are missing or malformed.

**Plans**: 3 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md - Define and test the shared metadata registry slice for browser plus non-plugin note-taking metadata.

**Wave 2 (blocked on Wave 1 completion)**

- [x] 01-02-PLAN.md - Migrate BrowserStep and browser plugin fields to consume shared metadata.

**Wave 3 (blocked on Wave 2 completion)**

- [x] 01-03-PLAN.md - Harden registry validation and browser regression coverage.

Cross-cutting constraints:

- Existing wizard tool metadata must live in one shared registry without user-visible behavior changes.
- Registry validation must fail malformed required metadata before downstream use.
- Browser command behavior must remain mocked in tests and outside registry helpers.

### Phase 2: Machine Inventory Scanner

**Goal**: tilde can detect already-installed tools before interaction and distinguish direct Homebrew installs from dependency installs.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [INV-01, INV-02, INV-03, INV-04]
**GitHub**: #99, #112
**Success Criteria** (what must be TRUE):

  1. Wizard startup has access to installed-tool facts for package managers, version managers, shells, editors, and known core tools.
  2. Homebrew formulae can be marked as direct installs or dependencies.
  3. Missing or failing external commands do not crash the wizard.
  4. Tests cover scanner success and failure paths with mocked command execution.

**Plans**: 5 plans

Plans:

**Wave 1**

- [x] 02-01-PLAN.md - Create inventory report, scanner, summary helpers, and mocked scanner tests.
- [x] 02-02-PLAN.md - Seed plugin-backed metadata rows and registry tests for inventory categories.

**Wave 2 (blocked on Wave 1 completion)**

- [x] 02-03-PLAN.md - Wire startup inventory into the wizard and renamed InventoryStep.
- [x] 02-04-PLAN.md - Add Homebrew installed-on-request helper, classifier, scanner integration, and unit tests.

**Wave 3 (blocked on Wave 2 completion)**

- [x] 02-05-PLAN.md - Render final inventory summary in config-first and wizard confirmation paths.

### Phase 3: Dotfiles Discovery Map

**Goal**: tilde can map known dotfiles and shell rc-file contents to the tools they configure.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [DOT-01, DOT-02, DOT-03, DOT-04]
**GitHub**: #104
**Success Criteria** (what must be TRUE):

  1. Known dotfile paths are matched through registry metadata.
  2. Shell rc parsing surfaces aliases, env vars, plugin references, and PATH edits.
  3. Workspace context paths can be scanned read-only for known config files.
  4. Unknown files are reported separately without being treated as errors.

**Plans**: 2 plans

Plans:

**Wave 1**

- [x] 03-01-PLAN.md - Add metadata-driven dotfile path discovery.

**Wave 2 (blocked on Wave 1 completion)**

- [x] 03-02-PLAN.md - Add rc-file parsing and structured dotfile map output.

### Phase 4: Provenance Summary

**Goal**: Users can see which tools are tilde-managed, already installed, dependencies, manual installs, OS-provided, or unknown.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [PROV-01, PROV-02, PROV-03, PROV-04]
**GitHub**: #73
**Success Criteria** (what must be TRUE):

  1. Summary output labels each known tool with a provenance category.
  2. The wizard can explain why a tool is selected, skipped, or shown as already present.
  3. Provenance is computed from registry and scanner data, not duplicated per step.
  4. Output remains concise in normal mode while preserving detail for audit views.

**Plans**: 2 plans

Plans:

**Wave 1**

- [x] 04-01-PLAN.md - Define provenance categories and derivation rules.

**Wave 2 (blocked on Wave 1 completion)**

- [x] 04-02-PLAN.md - Render provenance in wizard/config summary output.

### Phase 5: Config Discovery Polish

**Goal**: tilde handles non-default config locations more clearly and can optionally discover known dotfiles config locations.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: [CONF-01, CONF-02, CONF-03]
**GitHub**: #95
**Success Criteria** (what must be TRUE):

  1. Config-not-found errors clearly list searched paths and recommended next commands.
  2. Known dotfiles config locations can be discovered safely.
  3. Explicit `--config` and `TILDE_CONFIG` override all auto-discovery behavior.

**Plans**: 1 plan
Plans:

- [ ] 05-01-PLAN.md - Improve discovery paths, error messaging, and tests for non-default config locations.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tool Metadata Registry | 3/3 | Complete    | 2026-06-13 |
| 2. Machine Inventory Scanner | 7/7 | Complete   | 2026-06-14 |
| 3. Dotfiles Discovery Map | 2/2 | Complete    | 2026-06-19 |
| 4. Provenance Summary | 2/2 | Complete    | 2026-06-20 |
| 5. Config Discovery Polish | 0/1 | Not started | - |
