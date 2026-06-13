# tilde Machine Inventory and Provenance

## What This Is

tilde is a macOS developer environment bootstrap CLI that already installs tools, writes dotfiles, validates config, and guides users through an Ink wizard. This project adds a machine inventory and provenance layer so tilde can understand what is already installed, where each tool keeps configuration, and whether each tool is managed by tilde, manually installed, bundled with the OS, or present as a dependency.

## Core Value

tilde should explain a machine's developer setup clearly enough that users can trust what it will manage before it changes anything.

## Requirements

### Validated

- [x] Interactive wizard exists - `src/modes/wizard.tsx` and `src/steps/` collect developer environment config.
- [x] Config-first apply path exists - `src/modes/config-first.tsx`, `src/config/reader.ts`, and `src/config/writer.ts` load, migrate, validate, and write `tilde.config.json`.
- [x] Plugin contracts exist - `src/plugins/api.ts` defines package manager, secrets, account connector, env loader, version manager, browser, editor, and AI tool contracts.
- [x] First-party plugin registry exists - `src/plugins/registry.ts` registers current core first-party integrations.
- [x] Environment capture exists - `src/capture/scanner.ts` scans dotfiles, Homebrew packages, rc files, language versions, and version managers.
- [x] Dotfile writing exists - `src/dotfiles/writer.ts` writes managed shell and git config files idempotently.
- [x] Shared tool metadata registry exists - Phase 1 added `src/tools/metadata.ts`, `src/tools/registry.ts`, browser metadata, note-taking metadata, and browser wizard regression coverage.

### Active

- [ ] Milestone 2: Detect installed tools and Homebrew direct-vs-dependency provenance. GitHub: #99, #112.
- [ ] Milestone 3: Discover and map dotfiles and rc-file contents to known tools. GitHub: #104.
- [ ] Milestone 4: Surface provenance summaries showing tilde-managed, already installed, dependency, manual, app-store, OS-provided, and unknown tools. GitHub: #73.
- [ ] Milestone 5: Polish config discovery for non-default config locations. GitHub: #95.

### Out of Scope

- Full wrapper/search API across every ecosystem - defer until the shared metadata model exists. GitHub: #105.
- New browser, notes, terminal, productivity, and zsh plugin wizard steps - defer until metadata and inventory can describe existing steps consistently. GitHub: #82, #96, #97, #101, #108, #109, #110.
- Windows or Linux first-class support - preserve current macOS focus for this milestone sequence. GitHub: #7, #107.
- Homebrew formula distribution work - separate install-channel milestone. GitHub: #3.

## Context

The GitHub backlog clusters around a single foundation: tilde needs a canonical description of tools before it can reliably scan, prefill, audit, or search them. Issue #98 asks for a common data location for all step maps. Issues #99, #112, #104, and #73 build directly on that foundation.

The current codebase is a Node.js/TypeScript ESM CLI with Ink/React UI, Zod schema validation, file-based state, and first-party plugin contracts. The codebase map in `.planning/codebase/` identifies a risk that newer plugin categories such as browser, editor, and AI tool modules are not all registered through the central `PluginRegistry`; this project should avoid deepening that split.

## Constraints

- **Runtime**: Node.js >=20 with TypeScript NodeNext and `.js` import extensions - new modules must preserve ESM import style.
- **UI**: Ink/React terminal UI - inventory and provenance output must fit terminal workflows and support non-interactive paths where relevant.
- **Platform**: macOS-first - Homebrew, app bundles, shell rc files, and dotfiles discovery should target macOS before cross-platform expansion.
- **Safety**: Non-destructive scanning by default - discovery should read and report before writing or deleting anything.
- **Security**: Do not resolve or persist raw secrets - environment variables and secret references remain backend references.
- **Testability**: External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with issue #98 as Milestone 1 | Inventory, dotfile mapping, provenance, and search all need one shared metadata model first. | Pending |
| Browser and note-taking metadata seed the registry first | Browser is the first migrated plugin-backed wizard slice; note-taking proves non-plugin metadata support. | Validated in Phase 1 |
| Treat machine inventory as read-first, write-later | Users need trust and auditability before tilde mutates the machine. | Pending |
| Keep the milestone macOS-focused | Current product and code paths are macOS-first; cross-platform config can come after the model stabilizes. | Pending |
| Defer the wrapper/search API | Issue #105 is too broad until the metadata registry can describe ecosystems consistently. | Pending |

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
*Last updated: 2026-06-13 after Phase 1 completion*
