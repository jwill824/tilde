# Implementation Plan: MVP — macOS Developer Environment Bootstrap

**Branch**: `001-mvp-macos-bootstrap` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Full end-to-end MVP — environment capture, prompt-first wizard, config schema,
config-first entry mode, and context-aware environment switching for a personal macOS setup.

## Summary

Build `tilde`: an Ink-based interactive CLI that bootstraps a complete macOS developer
environment from a single `curl | bash` command. The tool guides users through a top-down
wizard (shell → package manager → version manager → languages → workspace → contexts →
git auth → tools → app config → accounts → secrets backend), generates a portable
`tilde.config.json`, and applies it idempotently on any future machine via config-first mode.
The architecture is plugin-driven so every integration category is swappable without modifying
core logic.

## Technical Context

**Language/Version**: Node.js 20 LTS, TypeScript 5.4+
**Primary Dependencies**: Ink 6.8, React 18, ink-select-input 6.2, ink-text-input 6.0,
  ink-spinner 5.0, Zod 4.3 (config schema + validation), execa 9.6 (shell commands),
  ignore 7.0 (gitignore patterns), fast-glob 3.3 (file scanning), ink-testing-library 4.0
**Storage**: Local filesystem — `~/.tilde/state.json` (checkpoint), `tilde.config.json`
  (output written to user's dotfiles repo)
**Testing**: Vitest (unit + integration), ink-testing-library (Ink component tests)
**Target Platform**: macOS Apple Silicon (arm64), zsh — MVP only
**Project Type**: CLI tool
**Performance Goals**: Full wizard + install completes in <15 min (SC-001); context switch
  resolves in <1 second (SC-005)
**Constraints**: No plaintext secrets in any file; idempotent installs; checkpoint/resume on
  failure; no pre-installed Node required for bootstrap entry
**Scale/Scope**: Single-user local CLI; no network server; one machine at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ PASS | Both prompt-first and config-first modes fully supported; FR-002, FR-014 |
| II. Bootstrap-Ready | ✅ PASS | FR-019 defines single `curl \| bash` entry; bootstrap.sh handles Node install |
| III. Context-Aware Environments | ✅ PASS | User Story 4; gitconfig includeIf + direnv (optional); gh auth switch |
| IV. Interactive & Ink-First UX | ✅ PASS | Ink 4 is the mandated UI framework; all wizard steps are Ink components |
| V. Idempotent Operations | ✅ PASS | FR-013 (idempotency) + FR-018 (checkpoint/resume) |
| VI. Secrets-Free Repository | ✅ PASS | FR-016 (no resolved secrets written); FR-010 (backend reference format) |
| VII. macOS First, Cross-Platform by Design | ✅ PASS | All platform concerns behind plugin interfaces; Windows deferred |
| VIII. Extensibility & Plugin Architecture | ✅ PASS | Plugin entity defined; plugin API contract is Phase 1 deliverable |

No gate violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp-macos-bootstrap/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── plugin-api.md         # Plugin interface contracts
│   ├── config-schema.md      # tilde.config.json schema contract
│   └── cli-commands.md       # CLI command/flag interface
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
bootstrap.sh                     # curl | bash entry point; installs Node, launches tilde

src/
├── index.tsx                    # Entry: OS detect → mode branch (wizard / config-first / --ci)
├── app.tsx                      # Root Ink App; renders active step
├── modes/
│   ├── wizard.tsx               # Prompt-first: step sequencer + state accumulator
│   └── config-first.tsx         # Config-first: load → summarize → confirm → apply
├── steps/                       # One Ink component per wizard step
│   ├── 00-config-detection.tsx
│   ├── 01-env-capture.tsx
│   ├── 02-shell.tsx
│   ├── 03-package-manager.tsx
│   ├── 04-version-manager.tsx
│   ├── 05-languages.tsx
│   ├── 06-workspace.tsx
│   ├── 07-contexts.tsx
│   ├── 08-git-auth.tsx
│   ├── 09-tools.tsx
│   ├── 10-app-config.tsx
│   ├── 11-accounts.tsx
│   ├── 12-secrets-backend.tsx
│   └── 13-config-export.tsx
├── plugins/
│   ├── api.ts                   # Plugin interface definitions (TypeScript)
│   ├── registry.ts              # Plugin loader and registry
│   ├── homebrew/                # First-party: package manager plugin
│   ├── onepassword/             # First-party: secrets backend plugin
│   ├── gh-cli/                  # First-party: GitHub account connector plugin
│   ├── direnv/                  # First-party: env loader plugin
│   └── vfox/                    # First-party: version manager plugin
├── capture/
│   ├── scanner.ts               # Scans ~/dotfiles, brew list, rc files
│   ├── filter.ts                # gitignore pattern exclusion (uses `ignore` package)
│   └── parser.ts                # Parse .gitconfig, .zshrc structure
├── installer/
│   └── index.ts                 # Orchestrates package installs via active plugin
├── dotfiles/
│   ├── symlinks.ts              # Idempotent symlink creation
│   └── writer.ts                # Write managed config files to dotfiles repo
├── config/
│   ├── schema.ts                # Zod schema for tilde.config.json v1
│   ├── reader.ts                # Load + validate config from path or URL
│   └── writer.ts                # Serialize and write config to dotfiles repo
├── state/
│   └── checkpoint.ts            # Read/write ~/.tilde/state.json; resume logic
└── utils/
    ├── os.ts                    # OS + architecture detection
    ├── exec.ts                  # Shell command wrapper (execa)
    └── gitignore.ts             # gitignore pattern helpers

tests/
├── unit/                        # Pure logic: schema, capture filter, checkpoint
├── integration/                 # End-to-end install flows on temp dirs
└── contract/                    # Plugin API conformance tests

docs/
└── config-format.md             # Human-authored config file documentation (constitution req)
```

**Structure Decision**: Single-project CLI. The plugin subdirectory under `src/plugins/` is
the extension point for all swappable integrations. Each plugin is a self-contained directory
implementing the relevant interface from `api.ts`. First-party plugins ship inside the repo;
community plugins are external npm packages following the `tilde-plugin-*` naming convention.

## Complexity Tracking

> No constitution violations to justify.
