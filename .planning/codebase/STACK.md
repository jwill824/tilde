# Technology Stack

**Analysis Date:** 2026-06-12

## Languages

**Primary:**
- TypeScript 5.4 - all application source under `src/`, tests under `tests/`, and the CLI shim under `bin/`.

**Secondary:**
- JavaScript - utility scripts such as `scripts/generate-banner.cjs`.
- Shell - install/bootstrap scripts such as `bootstrap.sh` and `site/tilde/install.sh`.

## Runtime

**Environment:**
- Node.js >=20 declared in `package.json`.
- CI uses Node.js 22 in `.github/workflows/ci.yml` and `.github/workflows/release.yml`.
- ESM-only package via `"type": "module"` in `package.json`.

**Package Manager:**
- npm with `package-lock.json` present.
- CI installs with `npm ci --legacy-peer-deps`.

## Frameworks

**Core:**
- Ink 6.8 and React 19 - terminal UI rendering for the wizard and config-first flows.
- Zod 4 - config schema validation in `src/config/schema.ts`.

**Testing:**
- Vitest 4 - unit, integration, and contract tests.
- ink-testing-library 4 - Ink component tests.

**Build/Dev:**
- TypeScript compiler - `npm run build` runs `tsc` plus `tsc -p tsconfig.bin.json`.
- tsx - local development via `npm run dev`.
- ESLint 10 with TypeScript ESLint - linting via `npm run lint`.

## Key Dependencies

**Critical:**
- `ink` - renders the interactive CLI.
- `ink-select-input`, `ink-text-input`, `ink-spinner` - wizard controls and loading states.
- `react` - component model for the CLI UI.
- `zod` and `zod-validation-error` - validates and formats `tilde.config.json` errors.
- `execa` - runs shell commands through `src/utils/exec.ts` and select plugins.
- `fast-glob` and `ignore` - environment and config capture helpers.

**Infrastructure:**
- Node built-ins such as `fs`, `path`, `os`, `util`, and `url` are used throughout the CLI.

## Configuration

**Environment:**
- `TILDE_CONFIG` overrides the config path.
- `TILDE_CI` enables non-interactive mode.
- `TILDE_STATE_DIR` is documented as an override for user state.
- `TILDE_NO_COLOR` disables terminal colors.

**Build:**
- `tsconfig.json` compiles `src/**/*` into `dist`.
- `tsconfig.bin.json` includes both `bin/**/*` and `src/**/*` for the executable output.
- `vitest.config.ts`, `vitest.integration.config.ts`, and `vitest.contract.config.ts` split test suites.
- `eslint.config.js` defines linting.

## Platform Requirements

**Development:**
- macOS is the product target; `src/index.tsx` calls `assertMacOS()` before launching interactive modes.
- Node.js >=20 and npm are required.
- Homebrew, GitHub CLI, 1Password CLI, vfox, direnv, and editor/browser CLIs are detected or installed through plugins.

**Production:**
- Distributed as npm package `@jwill824/tilde`.
- Binary entry is `tilde` mapped to `dist/bin/tilde.js`.
- Static install site lives under `site/tilde/`.

---

*Stack analysis: 2026-06-12*
*Update after major dependency or runtime changes*
