# Architecture

**Analysis Date:** 2026-06-12

## Pattern Overview

**Overall:** Monolithic Ink CLI with plugin-backed environment operations.

**Key Characteristics:**
- Single npm-distributed executable.
- Interactive modes are React components rendered by Ink.
- Non-interactive config-first path can apply a validated config without prompts.
- File-based state and local machine side effects; no database or backend server.
- First-party plugin interfaces isolate package managers, account connectors, env loaders, version managers, browsers, editors, and AI tools.

## Layers

**CLI Entry Layer:**
- Purpose: Parse flags/subcommands, select mode, enforce platform constraints.
- Contains: argument parsing, help/version output, subcommand dispatch.
- Location: `src/index.tsx`.
- Depends on: config reader/discovery, plugin registry, Ink render.
- Used by: executable `bin/tilde.ts` and npm bin output.

**Application Mode Layer:**
- Purpose: Render the correct user flow.
- Contains: wizard, config-first, reconfigure, update, and non-interactive modes.
- Locations: `src/app.tsx`, `src/modes/wizard.tsx`, `src/modes/config-first.tsx`, `src/modes/reconfigure.tsx`, `src/modes/update.tsx`.
- Depends on: steps, config schema, installer, dotfile writer, plugin registry.
- Used by: CLI entry layer.

**Wizard Step Layer:**
- Purpose: Collect structured config from the user.
- Contains: per-step Ink components.
- Location: `src/steps/`.
- Depends on: UI helpers, environment capture, plugins, schema types.
- Used by: `Wizard` and reconfigure/config-first flows.

**Config Layer:**
- Purpose: Validate, migrate, discover, and persist `tilde.config.json`.
- Contains: Zod schema, migrations, atomic writer, config discovery.
- Location: `src/config/` and `src/utils/config-discovery.ts`.
- Depends on: Node file system APIs, Zod, migration registry.
- Used by: CLI entry, config-first mode, non-interactive mode, tests.

**Execution and Plugin Layer:**
- Purpose: Encapsulate external tools and install/apply operations.
- Contains: plugin interfaces, first-party implementations, command runner.
- Locations: `src/plugins/`, `src/installer/index.ts`, `src/utils/exec.ts`.
- Depends on: execa, Homebrew, GitHub CLI, 1Password CLI, vfox, direnv, defaultbrowser.
- Used by: installer, steps, context switching subcommands.

**Output Writer Layer:**
- Purpose: Generate and write dotfiles idempotently.
- Contains: shell profile, gitconfig, symlink, OS defaults, VS Code helpers.
- Location: `src/dotfiles/`.
- Depends on: config types, Node file system APIs, command runner for OS defaults.
- Used by: config-first, non-interactive mode, and apply flow.

## Data Flow

**Interactive Wizard Flow:**
1. User runs `tilde`.
2. `src/index.tsx` parses arguments, checks macOS, discovers config if present, and renders `App`.
3. `src/app.tsx` captures environment and shows a splash before selecting wizard/config-first UI.
4. `src/modes/wizard.tsx` advances through step components in `src/steps/`.
5. Each step contributes a partial `TildeConfig`.
6. Wizard writes checkpoints through `src/state/checkpoint.ts`.
7. Config export writes validated config through `src/config/writer.ts`.
8. Apply/install stages call `installAll()` and `writeAll()`.

**Config-First Flow:**
1. User passes `--config`, sets `TILDE_CONFIG`, or has a discoverable config.
2. `loadConfig()` reads JSON, runs migrations, validates with `TildeConfigSchema`, and may rewrite migrated files.
3. `ConfigFirstMode` shows a summary and asks whether to apply, edit, or start over.
4. Apply path calls `installAll()` and `writeAll()`.

**Subcommand Flow:**
1. `tilde context`, `tilde plugin`, `tilde config`, `tilde update`, and `tilde install` are handled before the Ink app launch.
2. Subcommands write direct stdout/stderr and call `process.exit()` for completion/failure.

**State Management:**
- User config and dotfiles are file-based.
- Wizard state is checkpointed locally.
- No persistent in-memory service state.

## Key Abstractions

**TildeConfig:**
- Purpose: Complete desired developer-environment state.
- Location: `src/config/schema.ts`.
- Pattern: Zod schema plus exported TypeScript types.

**Plugin Interfaces:**
- Purpose: Stable contracts for external systems.
- Location: `src/plugins/api.ts`.
- Examples: `PackageManagerPlugin`, `SecretsBackendPlugin`, `AccountConnectorPlugin`, `VersionManagerPlugin`, `BrowserPlugin`, `EditorPlugin`, `AIToolPlugin`.

**PluginRegistry:**
- Purpose: Runtime lookup of plugins by category/id.
- Location: `src/plugins/registry.ts`.
- Pattern: map keyed by `${category}:${id}`.

**Wizard Step:**
- Purpose: One screen of config collection.
- Location: `src/steps/*.tsx`.
- Pattern: Ink component that emits partial config and summary.

**Command Runner:**
- Purpose: Normalize external command execution.
- Location: `src/utils/exec.ts`.
- Pattern: `execa` wrapper that throws `PluginError` on command failure.

## Entry Points

**CLI Entry:**
- Location: `src/index.tsx`.
- Triggers: User runs `tilde`.
- Responsibilities: parse args, dispatch subcommands, choose render mode, handle signals, restore cursor.

**Executable Shim:**
- Location: `bin/tilde.ts`.
- Triggers: npm bin entry compiled to `dist/bin/tilde.js`.
- Responsibilities: invoke the main CLI.

**Static Installer:**
- Location: `site/tilde/install.sh`.
- Triggers: `curl -fsSL https://tilde.thingstead.io/install.sh | bash`.
- Responsibilities: bootstrap install path for end users.

## Error Handling

**Strategy:** Fail fast at boundaries and show user-readable errors.

**Patterns:**
- Config parsing and validation throw formatted errors from `src/config/reader.ts`.
- External command failures become `PluginError` through `src/utils/exec.ts`.
- Interactive modes render error panels or set error phase state.
- Subcommands generally write to stderr and call `process.exit()` with explicit codes.
- Non-interactive mode exits with code 3 on apply failure.

## Cross-Cutting Concerns

**Validation:**
- Zod schema is the main config boundary.
- Secret-looking env var values are rejected in both schema and writer code.

**Idempotency:**
- `writeManagedFile()` skips writes when content matches and recreates symlinks.
- Installer plugins check availability/installation where possible.

**Security:**
- Raw secret detection uses prefix patterns for common tokens.
- Env vars are expected to be backend references such as 1Password `op://...`.

**Platform Behavior:**
- macOS is enforced for interactive application flows.
- Some plugins declare Linux/Windows support, but main CLI currently blocks non-macOS interactive use.

---

*Architecture analysis: 2026-06-12*
*Update when major patterns change*
