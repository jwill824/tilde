# tilde Searchable Tool and Config Ecosystem

## What This Is

tilde is a macOS developer environment bootstrap CLI that installs tools, writes dotfiles, validates config, and guides users through an Ink wizard. v1.0 added machine inventory and provenance so tilde can explain what is already installed, where tools keep configuration, and whether a tool is managed by tilde, manually installed, bundled with the OS, or present as a dependency.

v1.1 builds on that base by making tilde's config/schema model easier to evolve and by introducing a searchable resource layer for packages, plugins, extensions, macOS defaults, and registry-backed tool metadata.

## Core Value

tilde should explain a machine's developer setup clearly enough that users can trust what it will manage before it changes anything.

## Current State

- **v1.0 shipped 2026-06-21:** Machine Inventory and Provenance. See `.planning/MILESTONES.md` and `.planning/milestones/v1.0-ROADMAP.md`.
- **Current milestone:** v1.1 Searchable Tool and Config Ecosystem.
- **Current status:** defining requirements and planning Phase 6.

## Current Milestone: v1.1 Searchable Tool and Config Ecosystem

**Goal:** tilde can describe, validate, and search developer-environment resources through stable config/schema foundations and a first-pass wrapper API.

**Target features:**

- Stabilize known CLI/config/plugin correctness issues before expanding the product surface.
- Standardize schema versioning and inspection for `tilde.config.json` and related config files.
- Add a typed wrapper API for searching packages, plugins, extensions, defaults, and dotfile-backed resources.
- Ship concrete Homebrew, macOS defaults, and plugin/registry search flows.

## Requirements

### Validated

- [x] Interactive wizard exists - `src/modes/wizard.tsx` and `src/steps/` collect developer environment config.
- [x] Config-first apply path exists - `src/modes/config-first.tsx`, `src/config/reader.ts`, and `src/config/writer.ts` load, migrate, validate, and write `tilde.config.json`.
- [x] Plugin contracts exist - `src/plugins/api.ts` defines package manager, secrets, account connector, env loader, version manager, browser, editor, and AI tool contracts.
- [x] First-party plugin registry exists - `src/plugins/registry.ts` registers current core first-party integrations.
- [x] Environment capture exists - `src/capture/scanner.ts` scans dotfiles, Homebrew packages, rc files, language versions, and version managers.
- [x] Dotfile writing exists - `src/dotfiles/writer.ts` writes managed shell and git config files idempotently.
- [x] Shared tool metadata registry exists - v1.0 added `src/tools/metadata.ts`, `src/tools/registry.ts`, browser metadata, note-taking metadata, and browser wizard regression coverage.
- [x] Machine inventory scanner exists - v1.0 detects installed tools and Homebrew direct/dependency evidence with mocked command tests.
- [x] Dotfiles discovery map exists - v1.0 maps known dotfiles and shell rc evidence to known tools without mutating files.
- [x] Provenance summaries exist - v1.0 renders tilde-managed, already installed, dependency, manual, OS-provided, and unknown provenance from metadata and scanner evidence.
- [x] Config discovery polish exists - v1.0 handles known config paths and explicit override precedence with source-aware errors.

### Active

- [ ] v1.1 Phase 6: Stabilization and Config Selection Polish. GitHub: #52, #60, #74.
- [ ] v1.1 Phase 7: Config and Schema Versioning Foundation. GitHub: #54, #81, #83.
- [ ] v1.1 Phase 8: Search Wrapper API Core. GitHub: #105, #31.
- [ ] v1.1 Phase 9: Registry-backed Ecosystem Search UX. GitHub: #84, #70, #56.

### Out of Scope

- New wizard step families in v1.1 - defer terminal, productivity, notes, zsh, expanded browser, and Obsidian-specific flows until search/schema foundations exist. GitHub: #82, #96, #97, #101, #108, #109, #110.
- Distribution and install-channel work - separate release engineering milestone. GitHub: #2, #3, #5, #62.
- First-class Windows support - preserve macOS-first product focus while designing abstractions that do not block later platform work. GitHub: #7, #107.
- Additional secrets backends - keep raw secret handling constrained and defer backend expansion. GitHub: #8.

## Context

The GitHub backlog clusters into a clear next sequence: stabilize the existing trusted setup flows, make schemas/versioning explicit, then introduce a wrapper API that lets tilde search and reason about resources across ecosystems. v1.0's registry, inventory, dotfile, provenance, and config-discovery work removes the main blocker for issue #105 and related search issues.

The current codebase is a Node.js/TypeScript ESM CLI with Ink/React UI, Zod schema validation, file-based state, and first-party plugin contracts. The codebase map in `.planning/codebase/` identifies a risk that newer plugin categories such as browser, editor, and AI tool modules are not all registered through the central `PluginRegistry`; v1.1 should reduce that ambiguity rather than deepen it.

## Constraints

- **Runtime**: Node.js >=20 with TypeScript NodeNext and `.js` import extensions - new modules must preserve ESM import style.
- **UI**: Ink/React terminal UI - inventory, provenance, and search output must fit terminal workflows and support non-interactive paths where relevant.
- **Platform**: macOS-first - Homebrew, app bundles, shell rc files, defaults, and dotfiles discovery should target macOS before cross-platform expansion.
- **Safety**: Non-destructive scanning/searching by default - discovery and search should read and report before writing or deleting anything.
- **Security**: Do not resolve or persist raw secrets - environment variables and secret references remain backend references.
- **Testability**: External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start v1.0 with issue #98 as the metadata foundation | Inventory, dotfile mapping, provenance, and search all needed one shared metadata model first. | Validated in v1.0 |
| Browser and note-taking metadata seeded the registry first | Browser proved plugin-backed migration; note-taking proved non-plugin metadata support. | Validated in v1.0 |
| Treat machine inventory as read-first, write-later | Users need trust and auditability before tilde mutates the machine. | Validated in v1.0 |
| Keep v1.1 macOS-first while designing extensible APIs | Current product is macOS-first; search abstractions can avoid blocking later platforms without implementing them now. | Active |
| Start v1.1 with stabilization before broad search work | Search and registry UX will touch shared surfaces, so known config/plugin correctness issues should be closed first. | Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-06-21 after v1.1 milestone setup*
