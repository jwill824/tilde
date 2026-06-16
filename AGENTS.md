<!-- GSD:project-start source:PROJECT.md -->

## Project

**tilde Machine Inventory and Provenance**

tilde is a macOS developer environment bootstrap CLI that already installs tools, writes dotfiles, validates config, and guides users through an Ink wizard. This project adds a machine inventory and provenance layer so tilde can understand what is already installed, where each tool keeps configuration, and whether each tool is managed by tilde, manually installed, bundled with the OS, or present as a dependency.

**Core Value:** tilde should explain a machine's developer setup clearly enough that users can trust what it will manage before it changes anything.

### Constraints

- **Runtime**: Node.js >=20 with TypeScript NodeNext and `.js` import extensions - new modules must preserve ESM import style.
- **UI**: Ink/React terminal UI - inventory and provenance output must fit terminal workflows and support non-interactive paths where relevant.
- **Platform**: macOS-first - Homebrew, app bundles, shell rc files, and dotfiles discovery should target macOS before cross-platform expansion.
- **Safety**: Non-destructive scanning by default - discovery should read and report before writing or deleting anything.
- **Security**: Do not resolve or persist raw secrets - environment variables and secret references remain backend references.
- **Testability**: External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.4 - all application source under `src/`, tests under `tests/`, and the CLI shim under `bin/`.
- JavaScript - utility scripts such as `scripts/generate-banner.cjs`.
- Shell - install/bootstrap scripts such as `bootstrap.sh` and `site/tilde/install.sh`.

## Runtime

- Node.js >=20 declared in `package.json`.
- CI uses Node.js 22 in `.github/workflows/ci.yml` and `.github/workflows/release.yml`.
- ESM-only package via `"type": "module"` in `package.json`.
- npm with `package-lock.json` present.
- CI installs with `npm ci --legacy-peer-deps`.

## Frameworks

- Ink 6.8 and React 19 - terminal UI rendering for the wizard and config-first flows.
- Zod 4 - config schema validation in `src/config/schema.ts`.
- Vitest 4 - unit, integration, and contract tests.
- ink-testing-library 4 - Ink component tests.
- TypeScript compiler - `npm run build` runs `tsc` plus `tsc -p tsconfig.bin.json`.
- tsx - local development via `npm run dev`.
- ESLint 10 with TypeScript ESLint - linting via `npm run lint`.

## Key Dependencies

- `ink` - renders the interactive CLI.
- `ink-select-input`, `ink-text-input`, `ink-spinner` - wizard controls and loading states.
- `react` - component model for the CLI UI.
- `zod` and `zod-validation-error` - validates and formats `tilde.config.json` errors.
- `execa` - runs shell commands through `src/utils/exec.ts` and select plugins.
- `fast-glob` and `ignore` - environment and config capture helpers.
- Node built-ins such as `fs`, `path`, `os`, `util`, and `url` are used throughout the CLI.

## Configuration

- `TILDE_CONFIG` overrides the config path.
- `TILDE_CI` enables non-interactive mode.
- `TILDE_STATE_DIR` is documented as an override for user state.
- `TILDE_NO_COLOR` disables terminal colors.
- `tsconfig.json` compiles `src/**/*` into `dist`.
- `tsconfig.bin.json` includes both `bin/**/*` and `src/**/*` for the executable output.
- `vitest.config.ts`, `vitest.integration.config.ts`, and `vitest.contract.config.ts` split test suites.
- `eslint.config.js` defines linting.

## Platform Requirements

- macOS is the product target; `src/index.tsx` calls `assertMacOS()` before launching interactive modes.
- Node.js >=20 and npm are required.
- Homebrew, GitHub CLI, 1Password CLI, vfox, direnv, and editor/browser CLIs are detected or installed through plugins.
- Distributed as npm package `@jwill824/tilde`.
- Binary entry is `tilde` mapped to `dist/bin/tilde.js`.
- Static install site lives under `site/tilde/`.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Kebab-case for most source files, for example `src/utils/config-discovery.ts`.
- `index.ts` or `index.tsx` for package or directory entry points.
- Tests use `*.test.ts` or `*.test.tsx` in `tests/unit/`, `tests/integration/`, and `tests/contract/`.
- camelCase for functions such as `loadConfig`, `writeConfig`, `installAll`, and `discoverConfig`.
- React component functions use PascalCase such as `Wizard`, `App`, and `ConfigFirstMode`.
- Event handlers commonly use `handle...` naming inside components and steps.
- camelCase for locals and props.
- UPPER_SNAKE_CASE for constants such as `SECRET_PATTERN`, `VERSION`, and `DEFAULT_CONFIGURATIONS`.
- PascalCase for interfaces and type aliases.
- No `I` prefix on interfaces.
- Exported config-derived types live near the schema in `src/config/schema.ts`.

## Code Style

- Two-space indentation is used throughout TypeScript source.
- Single quotes are used for strings.
- Semicolons are required.
- JSX is used in `.tsx` files for Ink UI.
- ESLint config lives in `eslint.config.js`.
- Run with `npm run lint`.
- TypeScript strict mode is enabled in `tsconfig.json`.

## Import Organization

- Source uses relative imports rather than path aliases.
- NodeNext ESM requires `.js` extensions in TypeScript source imports, for example `./app.js`.
- No path aliases are configured in `tsconfig.json`.

## Error Handling

- Config parsing throws descriptive `Error` instances in `src/config/reader.ts`.
- External command execution throws `PluginError` from `src/utils/exec.ts`.
- Plugin implementations wrap domain failures in `PluginError` where appropriate.
- Interactive UI modes store an error phase/state and render errors to the terminal.
- Subcommands often write to stderr and call `process.exit()` with explicit exit codes.
- `PluginError` in `src/plugins/api.ts` carries plugin id, code, original error, and severity.
- Validation errors use `zod-validation-error` to produce readable messages.

## Logging

- No logging framework.
- CLI output uses `process.stdout.write`, `process.stderr.write`, Ink `<Text>`, and occasional `console.log`.
- Subcommands use stdout/stderr directly for deterministic output.
- Dotfile writer and plugin guidance use console output for operational messages.
- CI scripts use console output and explicit `process.exit()`.

## Comments

- Comments are used to explain workflow constraints, migration behavior, and non-obvious runtime behavior.
- Examples include the TTY guard and cursor restoration in `src/index.tsx`.
- Used selectively on public helpers and plugin implementations.
- Not mandatory for every function.
- Existing TODO found in `.github/copilot-instructions.md`, not in core source.

## Function Design

- UI components and command handlers can be medium-large when they represent full flow state machines.
- Pure helpers are generally extracted into `src/utils/`, `src/config/`, or `src/dotfiles/`.
- Options objects are used where parameter sets grow, for example `installAll(config, registry, opts)`.
- Schema-derived types are passed through rather than duplicating shape definitions.
- Async functions return promises and throw on unexpected failure.
- Plugin methods return structured result objects where partial failure is expected, such as `installPackages()`.

## Module Design

- Named exports are common for utilities and React components.
- First-party plugin implementation modules often default-export singleton plugin instances.
- No broad source barrel pattern is used.
- `src/plugins/registry.ts` centralizes plugin registration.

## Practical Rules for Future Changes

- Keep schema changes, migrations, docs, and tests together.
- Preserve NodeNext `.js` import extensions.
- Mock external commands in tests; avoid running real `brew`, `gh`, `op`, `vfox`, or `defaultbrowser`.
- Use existing plugin interfaces instead of hardcoding new integrations inside wizard steps.
- Guard user secrets as backend references, not resolved values.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- Single npm-distributed executable.
- Interactive modes are React components rendered by Ink.
- Non-interactive config-first path can apply a validated config without prompts.
- File-based state and local machine side effects; no database or backend server.
- First-party plugin interfaces isolate package managers, account connectors, env loaders, version managers, browsers, editors, and AI tools.

## Layers

- Purpose: Parse flags/subcommands, select mode, enforce platform constraints.
- Contains: argument parsing, help/version output, subcommand dispatch.
- Location: `src/index.tsx`.
- Depends on: config reader/discovery, plugin registry, Ink render.
- Used by: executable `bin/tilde.ts` and npm bin output.
- Purpose: Render the correct user flow.
- Contains: wizard, config-first, reconfigure, update, and non-interactive modes.
- Locations: `src/app.tsx`, `src/modes/wizard.tsx`, `src/modes/config-first.tsx`, `src/modes/reconfigure.tsx`, `src/modes/update.tsx`.
- Depends on: steps, config schema, installer, dotfile writer, plugin registry.
- Used by: CLI entry layer.
- Purpose: Collect structured config from the user.
- Contains: per-step Ink components.
- Location: `src/steps/`.
- Depends on: UI helpers, environment capture, plugins, schema types.
- Used by: `Wizard` and reconfigure/config-first flows.
- Purpose: Validate, migrate, discover, and persist `tilde.config.json`.
- Contains: Zod schema, migrations, atomic writer, config discovery.
- Location: `src/config/` and `src/utils/config-discovery.ts`.
- Depends on: Node file system APIs, Zod, migration registry.
- Used by: CLI entry, config-first mode, non-interactive mode, tests.
- Purpose: Encapsulate external tools and install/apply operations.
- Contains: plugin interfaces, first-party implementations, command runner.
- Locations: `src/plugins/`, `src/installer/index.ts`, `src/utils/exec.ts`.
- Depends on: execa, Homebrew, GitHub CLI, 1Password CLI, vfox, direnv, defaultbrowser.
- Used by: installer, steps, context switching subcommands.
- Purpose: Generate and write dotfiles idempotently.
- Contains: shell profile, gitconfig, symlink, OS defaults, VS Code helpers.
- Location: `src/dotfiles/`.
- Depends on: config types, Node file system APIs, command runner for OS defaults.
- Used by: config-first, non-interactive mode, and apply flow.

## Data Flow

- User config and dotfiles are file-based.
- Wizard state is checkpointed locally.
- No persistent in-memory service state.

## Key Abstractions

- Purpose: Complete desired developer-environment state.
- Location: `src/config/schema.ts`.
- Pattern: Zod schema plus exported TypeScript types.
- Purpose: Stable contracts for external systems.
- Location: `src/plugins/api.ts`.
- Examples: `PackageManagerPlugin`, `SecretsBackendPlugin`, `AccountConnectorPlugin`, `VersionManagerPlugin`, `BrowserPlugin`, `EditorPlugin`, `AIToolPlugin`.
- Purpose: Runtime lookup of plugins by category/id.
- Location: `src/plugins/registry.ts`.
- Pattern: map keyed by `${category}:${id}`.
- Purpose: One screen of config collection.
- Location: `src/steps/*.tsx`.
- Pattern: Ink component that emits partial config and summary.
- Purpose: Normalize external command execution.
- Location: `src/utils/exec.ts`.
- Pattern: `execa` wrapper that throws `PluginError` on command failure.

## Entry Points

- Location: `src/index.tsx`.
- Triggers: User runs `tilde`.
- Responsibilities: parse args, dispatch subcommands, choose render mode, handle signals, restore cursor.
- Location: `bin/tilde.ts`.
- Triggers: npm bin entry compiled to `dist/bin/tilde.js`.
- Responsibilities: invoke the main CLI.
- Location: `site/tilde/install.sh`.
- Triggers: `curl -fsSL https://tilde.thingstead.io/install.sh | bash`.
- Responsibilities: bootstrap install path for end users.

## Error Handling

- Config parsing and validation throw formatted errors from `src/config/reader.ts`.
- External command failures become `PluginError` through `src/utils/exec.ts`.
- Interactive modes render error panels or set error phase state.
- Subcommands generally write to stderr and call `process.exit()` with explicit codes.
- Non-interactive mode exits with code 3 on apply failure.

## Cross-Cutting Concerns

- Zod schema is the main config boundary.
- Secret-looking env var values are rejected in both schema and writer code.
- `writeManagedFile()` skips writes when content matches and recreates symlinks.
- Installer plugins check availability/installation where possible.
- Raw secret detection uses prefix patterns for common tokens.
- Env vars are expected to be backend references such as 1Password `op://...`.
- macOS is enforced for interactive application flows.
- Some plugins declare Linux/Windows support, but main CLI currently blocks non-macOS interactive use.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| astro-developer | Comprehensive guide for developing in the Astro monorepo. Covers architecture, debugging, testing, and critical constraints. Use when working on features, fixes, tests, or understanding the codebase structure. | `.agents/skills/astro-developer/SKILL.md` |
| context-map | 'Generate a map of all files relevant to a task before making changes' | `.github/skills/context-map/SKILL.md` |
| conventional-commit | 'Prompt and workflow for generating conventional commit messages using a structured XML format. Guides users to create standardized, descriptive commit messages in line with the Conventional Commits specification, including instructions, examples, and validation.' | `.github/skills/conventional-commit/SKILL.md` |
| github-issues | 'Create, update, and manage GitHub issues using MCP tools. Use this skill when users want to create bug reports, feature requests, or task issues, update existing issues, add labels/assignees/milestones, set issue fields (dates, priority, custom fields), set issue types, manage issue workflows, link issues, add dependencies, or track blocked-by/blocking relationships. Triggers on requests like "create an issue", "file a bug", "request a feature", "update issue X", "set the priority", "set the start date", "link issues", "add dependency", "blocked by", "blocking", or any GitHub issue management task.' | `.github/skills/github-issues/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
