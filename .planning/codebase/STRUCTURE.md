# Codebase Structure

**Analysis Date:** 2026-06-12

## Directory Layout

```text
tilde/
|-- bin/                 # npm executable shim
|-- docs/                # user/developer docs and design assets
|-- scripts/             # repository maintenance scripts
|-- site/                # public install site and docs site
|-- specs/               # spec-kit planning artifacts
|-- src/                 # TypeScript source
|-- tests/               # Vitest unit, integration, and contract tests
|-- package.json         # npm package manifest
|-- tsconfig.json        # main TypeScript config
|-- tsconfig.bin.json    # executable build config
|-- vitest.config.ts     # unit test config
|-- vitest.integration.config.ts
|-- vitest.contract.config.ts
`-- eslint.config.js
```

## Directory Purposes

**`bin/`:**
- Purpose: Executable entry wrappers.
- Contains: `bin/tilde.ts`.
- Key files: `bin/tilde.ts` invokes the compiled CLI entry.

**`src/`:**
- Purpose: Application source.
- Contains: CLI entry, Ink UI, wizard modes, config handling, plugins, installer, dotfile writers, state, and utilities.
- Key files: `src/index.tsx`, `src/app.tsx`, `src/config/schema.ts`, `src/plugins/api.ts`, `src/plugins/registry.ts`.

**`src/steps/`:**
- Purpose: Individual wizard screens.
- Contains: Ink components for shell, tools, contexts, browsers, AI tools, secrets, config export, apply, and related steps.
- Key files: `src/steps/contexts.tsx`, `src/steps/config-export.tsx`, `src/steps/apply.tsx`.

**`src/modes/`:**
- Purpose: Top-level user flows.
- Contains: wizard, config-first, reconfigure, and update modes.
- Key files: `src/modes/wizard.tsx`, `src/modes/config-first.tsx`, `src/modes/reconfigure.tsx`, `src/modes/update.tsx`.

**`src/plugins/`:**
- Purpose: Plugin contracts, registry, and first-party plugin implementations.
- Contains: `api.ts`, `registry.ts`, and `first-party/*/index.ts`.
- Key files: `src/plugins/api.ts`, `src/plugins/registry.ts`, `src/plugins/first-party/homebrew/index.ts`.

**`src/config/`:**
- Purpose: Config schema, migrations, reader, and writer.
- Contains: schema definitions, migration runner, version migrations, atomic writer.
- Key files: `src/config/schema.ts`, `src/config/reader.ts`, `src/config/writer.ts`, `src/config/migrations/runner.ts`.

**`src/dotfiles/`:**
- Purpose: Generated dotfile content and writes.
- Contains: gitconfig, shell profile, symlink, OS defaults, editor helpers.
- Key files: `src/dotfiles/writer.ts`, `src/dotfiles/gitconfig.ts`, `src/dotfiles/shellprofile.ts`.

**`tests/`:**
- Purpose: Automated tests.
- Contains: `tests/unit/`, `tests/integration/`, `tests/contract/`, and `tests/fixtures/`.
- Key files: `tests/fixtures/tilde.config.json`, `tests/integration/cli-regression.test.ts`.

**`site/`:**
- Purpose: Public install and documentation sites.
- Contains: `site/tilde/` static installer page and `site/docs/` docs app/assets.

**`specs/`:**
- Purpose: Historical and active spec-kit feature plans.
- Contains: numbered feature folders with `spec.md`, `plan.md`, `tasks.md`, contracts, and checklists.

## Key File Locations

**Entry Points:**
- `src/index.tsx`: CLI entry and subcommand dispatcher.
- `src/app.tsx`: Ink app root and mode selection.
- `bin/tilde.ts`: npm binary shim.

**Configuration:**
- `package.json`: package metadata, scripts, dependencies, npm bin.
- `tsconfig.json`: application TypeScript compile settings.
- `tsconfig.bin.json`: build settings for executable output.
- `eslint.config.js`: lint configuration.
- `.github/workflows/ci.yml`: CI verification.
- `.github/workflows/release.yml`: semantic-release pipeline.

**Core Logic:**
- `src/config/schema.ts`: config contract.
- `src/modes/wizard.tsx`: guided config collection.
- `src/modes/config-first.tsx`: apply existing config.
- `src/installer/index.ts`: package and language installation orchestration.
- `src/dotfiles/writer.ts`: dotfile write/symlink orchestration.
- `src/plugins/api.ts`: plugin interfaces.
- `src/plugins/registry.ts`: first-party plugin registration.

**Testing:**
- `tests/unit/`: fast tests for helpers, schema, wizard navigation, UI summaries, and plugins.
- `tests/integration/`: CLI and flow tests.
- `tests/contract/`: plugin and config contract tests.
- `tests/fixtures/tilde.config.json`: shared valid config fixture.

**Documentation:**
- `docs/README.md`: user-facing project readme content.
- `docs/config-format.md`: config reference.
- `docs/CONTRIBUTING.md`: development workflow and architecture notes.

## Naming Conventions

**Files:**
- `kebab-case.ts` and `kebab-case.tsx` for most modules and components.
- `index.ts` or `index.tsx` for package/directory entry points.
- `*.test.ts` and `*.test.tsx` for tests.
- Numbered spec directories under `specs/NNN-feature-name/`.

**Directories:**
- Lowercase or kebab-case for feature directories.
- `first-party/<plugin-id>/index.ts` for plugin implementations.

**Imports:**
- ESM imports use `.js` extensions in TypeScript source because the compiler targets NodeNext.
- Type-only imports use `import type`.

## Where to Add New Code

**New Wizard Capability:**
- Step UI: `src/steps/<capability>.tsx`.
- Mode wiring: `src/modes/wizard.tsx`.
- Schema fields: `src/config/schema.ts`.
- Tests: `tests/unit/` for step logic or `tests/integration/` for flow coverage.

**New Plugin Category or Contract:**
- Interface: `src/plugins/api.ts`.
- Registry support: `src/plugins/registry.ts`.
- Implementation: `src/plugins/first-party/<id>/index.ts`.
- Contract tests: `tests/contract/`.

**New Config Version:**
- Schema: `src/config/schema.ts`.
- Migration: `src/config/migrations/`.
- Tests: `tests/unit/config/` and `tests/unit/config/schema-v2.test.ts`.

**New CLI Subcommand:**
- Dispatch: `src/index.tsx`.
- UI mode or command implementation: `src/modes/` or focused utility module.
- Tests: `tests/integration/cli-regression.test.ts` plus targeted unit tests.

**New Docs or Install Site Work:**
- User docs: `docs/`.
- Static installer site: `site/tilde/`.
- Docs site assets/styles: `site/docs/src/`.

## Special Directories

**`dist/`:**
- Purpose: Build output.
- Source: generated by `npm run build`.
- Committed: no, ignored by `.gitignore`.

**`node_modules/`:**
- Purpose: npm dependencies.
- Committed: no, ignored by `.gitignore`.

**`.codex/` and `.agents/`:**
- Purpose: local agent/GSD tooling.
- Committed: currently untracked according to `git status`.

**`.copilot/` and `.speckit/`:**
- Purpose: nested tooling/vendor checkouts with their own `.git` directories.
- Committed: repo has `.gitmodules`; treat as separate repos/submodules rather than normal source folders.

---

*Structure analysis: 2026-06-12*
*Update when directory structure changes*
