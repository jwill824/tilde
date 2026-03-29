# Contributing to tilde

Thanks for your interest in contributing! This guide covers everything you need to get from zero to a working local dev environment, write a plugin, run the test suites, and open a pull request.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Building](#building)
- [Testing](#testing)
- [Writing a Plugin](#writing-a-plugin)
- [Commit Conventions](#commit-conventions)
- [Opening a Pull Request](#opening-a-pull-request)
- [CI Pipeline](#ci-pipeline)

---

## Getting Started

**Prerequisites:** Node.js 20+, npm 10+.

```bash
git clone https://github.com/jwill824/tilde.git
cd tilde
npm install
```

Run the CLI locally without installing it globally:

```bash
npm run build
node dist/index.js --help
node dist/index.js          # launches the wizard
node dist/index.js --dry-run --config path/to/tilde.config.json
```

For a full walkthrough — including how to simulate a fresh-machine wizard run — see [`specs/001-mvp-macos-bootstrap/quickstart.md`](specs/001-mvp-macos-bootstrap/quickstart.md).

---

## Project Structure

```
src/
├── index.tsx              # CLI entry point — arg parsing, mode detection
├── app.tsx                # Root Ink component — splash + mode routing
├── steps/                 # One file per wizard step (00–13)
├── plugins/
│   ├── api.ts             # Plugin interface definitions
│   ├── registry.ts        # Plugin registry singleton
│   └── first-party/       # Bundled plugins (homebrew, gh-cli, direnv, vfox, 1password)
├── config/                # Zod schema, reader, writer
├── capture/               # Environment scanner, filter, rc file parser
├── dotfiles/              # File generators: .zshrc, .zshprofile, .gitconfig, .envrc, symlinks
├── installer/             # Orchestrates package installs via active plugin
├── state/                 # Checkpoint read/write (~/.tilde/state.json)
├── ui/                    # Shared Ink components (splash, header)
└── utils/                 # OS detection, exec wrapper, gitignore helpers

tests/
├── unit/                  # Pure logic — schema, capture filter, checkpoint
├── contract/              # Plugin API conformance tests
└── integration/           # End-to-end flows on temp directories

specs/
└── 001-mvp-macos-bootstrap/
    ├── spec.md            # Feature specification
    ├── plan.md            # Architecture and implementation plan
    └── tasks.md           # Ordered task checklist
```

---

## Building

```bash
npm run build        # TypeScript → dist/
npm run lint         # ESLint (flat config)
```

The build output goes to `dist/`. The `bin` entry in `package.json` points to `dist/index.js`.

---

## Testing

Three suites run independently so you can target just what you need:

```bash
npm test                  # unit tests  (tests/unit/)
npm run test:contract     # contract tests  (tests/contract/)
npm run test:integration  # integration tests  (tests/integration/)
```

Run everything with coverage:

```bash
npm run test -- --coverage
```

| Suite | What it covers |
|-------|----------------|
| **unit** | Schema validation, capture filter, checkpoint logic, dotfile generators, cd-hook, gitconfig |
| **contract** | Every registered plugin satisfies its TypeScript interface and required method signatures |
| **integration** | Full wizard and config-first flows using `ink-testing-library` against temp directories |

Tests are written with [Vitest](https://vitest.dev/) and [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library).

---

## Writing a Plugin

Every integration point in tilde is a plugin. Plugins live in `src/plugins/first-party/` (bundled) or as separate npm packages following the `tilde-plugin-<name>` naming convention (community).

### 1. Implement the interface

Pick the interface that matches your category from `src/plugins/api.ts`:

```typescript
import type { PackageManagerPlugin } from '../../api.js'
import { PluginError } from '../../api.js'

class MyPackageManager implements PackageManagerPlugin {
  readonly id = 'my-pm'
  readonly version = '1.0.0'
  readonly category = 'package-manager' as const

  async isAvailable(): Promise<boolean> {
    // return true if the tool is installed on the current machine
    return true
  }

  async installPackages(pkgs: string[]): Promise<void> {
    // install the given packages
    // throw new PluginError('reason', { cause: originalError }) on failure
  }
}

export default new MyPackageManager()
```

Available interfaces:

| Interface | Category string | Required methods |
|-----------|----------------|-----------------|
| `PackageManagerPlugin` | `package-manager` | `isAvailable`, `installPackages` |
| `VersionManagerPlugin` | `version-manager` | `isAvailable`, `installRuntime`, `setVersion` |
| `AccountConnectorPlugin` | `account-connector` | `isAvailable`, `connect`, `switchAccount`, `currentAccount` |
| `SecretsBackendPlugin` | `secrets-backend` | `isAvailable`, `formatReference`, `resolve` |
| `EnvLoaderPlugin` | `env-loader` | `isAvailable`, `generateEnvrc`, `generateShellHook` |

### 2. Register it (first-party only)

Add a static import and `registry.register()` call in `src/plugins/registry.ts`.

### 3. Add a contract test

Every plugin must pass the contract suite. Add a test file in `tests/contract/` that imports your plugin and asserts all required methods exist and return the correct types:

```typescript
import myPlugin from '../../src/plugins/first-party/my-pm/index.js'
import { describe, it, expect } from 'vitest'

describe('my-pm plugin contract', () => {
  it('exposes required metadata', () => {
    expect(myPlugin.id).toBe('my-pm')
    expect(myPlugin.category).toBe('package-manager')
  })

  it('isAvailable returns a boolean', async () => {
    const result = await myPlugin.isAvailable()
    expect(typeof result).toBe('boolean')
  })
})
```

### 4. Community plugins

For a plugin distributed as an npm package, name it `tilde-plugin-<name>` and export a default matching the relevant interface. Users install it with:

```bash
tilde plugin add <name>
```

---

## Development Workflow (speckit)

tilde uses a **spec-driven development** workflow powered by speckit — a set of Copilot CLI agents that enforce a design-before-code discipline. Every new feature must have a complete `spec.md`, `plan.md`, and `tasks.md` before any implementation begins.

> **Rule**: No code may be written for a new feature until `tasks.md` exists and `/speckit.analyze` passes with no HIGH or CRITICAL issues. This is a constitution-level requirement.

---

### The pipeline

```
specify → clarify → plan → tasks → analyze → implement
```

Each stage gates the next. Running `/speckit.analyze` before implementation is mandatory — it catches gaps, ambiguities, and constitution violations before they become bugs.

---

### Commands

All speckit commands are invoked through the **GitHub Copilot CLI** chat interface.

| Command | When to use |
|---------|-------------|
| `/speckit.specify` | Start here. Create or update the feature spec (`spec.md`) from a natural-language description. |
| `/speckit.clarify` | Identify underspecified areas in the current spec. Asks up to 5 targeted questions and encodes the answers back into `spec.md`. Run until no ambiguities remain. |
| `/speckit.plan` | Generate the implementation plan (`plan.md`) — architecture, stack choices, data model, phases — from the finalised spec. |
| `/speckit.tasks` | Generate an ordered, dependency-aware `tasks.md` from `spec.md` + `plan.md`. |
| `/speckit.analyze` | **Gate check.** Read-only cross-artifact analysis. Reports inconsistencies, coverage gaps, constitution violations, and ambiguities. Must pass before implementation. |
| `/speckit.implement` | Execute `tasks.md` task-by-task, tracking progress and marking each task complete. |
| `/speckit.checklist` | Generate a custom quality checklist for the feature (optional but recommended for complex features). |
| `/speckit.taskstoissues` | Convert `tasks.md` into GitHub Issues for tracking in the repo (optional). |
| `/speckit.constitution` | Update the project constitution (`.specify/memory/constitution.md`). Only used when a principle genuinely needs to change — requires explicit justification. |

---

### Starting a new feature

1. **Create a branch** using the spec-number format:

   ```bash
   git checkout main && git pull
   git checkout -b 002-short-feature-name
   ```

   The number must match the next sequential spec number. Check `specs/` to find the current highest.

2. **Run the pipeline** in order:

   ```
   /speckit.specify   → describe the feature in plain language
   /speckit.clarify   → resolve any ambiguities (repeat until clean)
   /speckit.plan      → generate plan.md
   /speckit.tasks     → generate tasks.md
   /speckit.analyze   → validate all artifacts (fix any HIGH/CRITICAL findings)
   /speckit.implement → implement the tasks
   ```

3. **Check the constitution** before submitting your PR. Verify your changes don't violate any of the NON-NEGOTIABLE principles in [`.specify/memory/constitution.md`](.specify/memory/constitution.md):
   - No option pre-selected without user confirmation (Principle I)
   - Bootstrap must work from a single curl command (Principle II)
   - Context switching must be automatic and transparent (Principle III)
   - All interactive prompts must use Ink components (Principle IV)
   - No plaintext secrets in any written file (Principle VI)

---

### Spec directory structure

Each feature gets its own directory under `specs/`:

```
specs/
└── NNN-feature-name/
    ├── spec.md          # Feature specification (FRs, user stories, success criteria)
    ├── plan.md          # Architecture, data model, implementation phases
    ├── tasks.md         # Ordered task checklist (generated by /speckit.tasks)
    ├── quickstart.md    # Developer walkthrough (created manually if needed)
    ├── data-model.md    # Data model detail (if applicable)
    ├── research.md      # Research notes (if applicable)
    └── contracts/       # Plugin/API contract definitions (if applicable)
```

`spec.md`, `plan.md`, and `tasks.md` are the three mandatory artifacts. Everything else is optional.

---

### Branching

All feature branches follow the spec-number format: `NNN-short-name`, where `NNN` is the zero-padded spec number matching the `specs/NNN-*/` directory.

| ✅ Valid | ❌ Invalid |
|---------|----------|
| `002-windows-support` | `feat/windows` |
| `003-bitwarden-plugin` | `fix/plugin-bug` |
| `004-vscode-profiles` | `my-feature` |

Branch from `main`. Delete your branch after it merges.

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) — every commit message must follow this format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer — e.g., BREAKING CHANGE: ...]
```

**Types that trigger a release:**

| Type | Release bump | When to use |
|------|-------------|-------------|
| `feat` | minor | New feature visible to users |
| `fix` | patch | Bug fix |
| `BREAKING CHANGE` footer | major | Incompatible API or config change |

**Types that do not trigger a release:**

| Type | When to use |
|------|-------------|
| `chore` | Tooling, dependencies, config |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `test` | Adding or fixing tests |
| `ci` | CI/CD workflow changes |

Semantic-release reads these on every push to `main` and automatically bumps the version, updates `CHANGELOG.md`, creates a GitHub Release, and publishes to npm. **You do not bump versions manually.**

---

## Opening a Pull Request

1. Fork the repo and create a branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes and add tests
3. Ensure the full suite passes locally: `npm run lint && npm run build && npm test && npm run test:contract && npm run test:integration`
4. Push and open a PR against `main`
5. The CI pipeline runs automatically — all checks must be green before merging

PRs that add new features should include:
- The implementation
- Unit and/or integration tests
- An update to `docs/config-format.md` if the config schema changes

---

## CI Pipeline

Every push and PR runs the following jobs in order:

| Step | Command |
|------|---------|
| Lint | `npm run lint` |
| Build | `npm run build` |
| Unit tests | `npm test` |
| Contract tests | `npm run test:contract` |
| Integration tests | `npm run test:integration` |

Results are reported in the GitHub Actions job summary with labeled sections per suite. All steps must pass — failures block merging.

Releases are handled by a separate workflow that runs only on pushes to `main`. It requires an `NPM_TOKEN` secret set in the repo settings.

---

## Site Deployment

Changes to `site/**` on `main` trigger `.github/workflows/deploy-site.yml`, which
deploys two Cloudflare Pages projects in parallel:

| Job | Source | Domain |
|-----|--------|--------|
| `deploy-landing` | `site/landing/` (served as-is, no build) | `get.tilde.sh` |
| `build-and-deploy-docs` | `site/docs/dist/` (Astro build) | `docs.tilde.sh` |

### Required GitHub Actions secrets

Set these in **Settings → Secrets and variables → Actions** in the GitHub repository:

| Secret | Description | Where to find it |
|--------|-------------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Cloudflare Pages: Edit** permission | [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Appears in the URL when you log in to the Cloudflare Dashboard: `https://dash.cloudflare.com/<account-id>/` |

### Cloudflare Pages project setup

Create two Cloudflare Pages projects (once, manually):

1. **`tilde-get`** — for `get.tilde.sh`
   - In the Cloudflare Dashboard, go to **Workers & Pages → Create application → Pages → Connect to Git**
   - Set project name: `tilde-get`
   - Build settings: no build command, output directory `site/landing`
   - After creation, add a custom domain: `get.tilde.sh`
   - Add a CNAME record in your DNS: `get` → `tilde-get.pages.dev`

2. **`tilde-docs`** — for `docs.tilde.sh`
   - Set project name: `tilde-docs`
   - Build command: `npm run build` (working directory: `site/docs`)
   - Output directory: `site/docs/dist`
   - After creation, add a custom domain: `docs.tilde.sh`
   - Add a CNAME record in your DNS: `docs` → `tilde-docs.pages.dev`

Cloudflare Pages handles HTTPS automatically for custom domains.
