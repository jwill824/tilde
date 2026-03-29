# Contributing to tilde

Thanks for your interest in contributing! This guide covers everything you need to get from zero to a working local dev environment, write a plugin, run the test suites, and open a pull request.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Building](#building)
- [Testing](#testing)
- [Writing a Plugin](#writing-a-plugin)
- [Site Development](#site-development)
- [Infrastructure (Terraform)](#infrastructure-terraform)
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

## Site Development

The tilde website lives entirely in the `site/` directory and is deployed as a single [Cloudflare Pages](https://pages.cloudflare.com/) project (`thingstead`) to [thingstead.io/tilde](https://thingstead.io/tilde).

### Structure

```
site/
├── tilde/
│   ├── index.html      # Landing page (thingstead.io/tilde)
│   ├── install.sh      # Curl-piped installer (thingstead.io/tilde/install.sh)
│   └── _headers        # Cloudflare cache + Content-Type rules
└── docs/               # Astro + Starlight docs site (thingstead.io/tilde/docs)
    ├── astro.config.mjs
    ├── package.json
    └── src/content/docs/
        ├── index.mdx
        ├── installation.md
        ├── getting-started.md
        └── config-reference.md
```

### Local preview

**Landing page** — open directly in a browser (no build step):

```bash
open site/tilde/index.html
```

**Docs site** — Astro dev server with hot reload:

```bash
cd site/docs
npm install
npm run dev
# → http://localhost:4321/tilde/docs
```

**Full assembled output** — mirrors exactly what gets deployed:

```bash
cd site/docs && npm run build && cd ../..
mkdir -p dist/tilde/docs
cp -r site/tilde/. dist/tilde/
cp -r site/docs/dist/. dist/tilde/docs/
# Serve dist/ with any static file server, e.g.:
npx serve dist
# → http://localhost:3000/tilde
```

### Adding or updating content

| What to change | Where |
|----------------|-------|
| Landing page copy or styling | `site/tilde/index.html` |
| Install script logic | `site/tilde/install.sh` |
| Cache or Content-Type headers | `site/tilde/_headers` |
| Docs pages | `site/docs/src/content/docs/*.md` |
| Docs sidebar / nav | `site/docs/astro.config.mjs` → `starlight.sidebar` |
| Docs site title or base URL | `site/docs/astro.config.mjs` → `site` / `base` |

> **Important:** Do not change `site` or `base` in `astro.config.mjs` without a corresponding DNS/routing update — Astro uses them to generate all internal links.

### Deployment

Changes to `site/**` on `main` trigger `.github/workflows/deploy-site.yml`. The workflow:

1. Builds the Astro docs site (`npm run build` in `site/docs/`)
2. Assembles a `dist/` directory: `dist/tilde/` (landing) + `dist/tilde/docs/` (docs)
3. Deploys `dist/` to Cloudflare Pages project `thingstead` via `wrangler-action@v3`

The job runs in the **`production` GitHub environment** — secrets must be set there (not repo-level).

### Required secrets (GitHub → Settings → Environments → production)

| Secret | Description | Where to find it |
|--------|-------------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Custom token with **Cloudflare Pages: Edit** permission | [CF Dashboard → Manage Account → API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | URL when logged in: `https://dash.cloudflare.com/<account-id>/` |

### First-time Cloudflare setup

`wrangler-action` auto-creates the `thingstead` Pages project on the first successful deploy — no manual project creation needed. After the first deploy:

1. In the Cloudflare Dashboard, go to **Workers & Pages → thingstead → Custom domains**
2. Add `thingstead.io`
3. Cloudflare will automatically create the DNS record and provision HTTPS


---

## Infrastructure (Terraform)

The `terraform/` directory contains two independent root modules that manage Cloudflare Pages and GitHub repository settings as code.

### Directory structure

```text
terraform/
├── .gitignore          # Ignores .terraform/, *.tfstate, *.tfvars
├── cloudflare/         # Manages Cloudflare Pages project + custom domain
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── github/             # Manages GitHub repo settings + branch protection
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

Each module is a standalone Terraform root module with its own Terraform Cloud workspace and state.

### Terraform Cloud workspaces

| Workspace | Working Directory | Triggers on |
|-----------|------------------|-------------|
| `tilde-cloudflare` | `terraform/cloudflare` | Changes to `terraform/cloudflare/**` |
| `tilde-github` | `terraform/github` | Changes to `terraform/github/**` |

Both workspaces use **remote execution** — merging to `main` automatically queues a plan+apply in TFC via the VCS integration.

### Required workspace variables

Set these as **environment variables** (not Terraform variables) in each TFC workspace. Mark sensitive values as sensitive.

**`tilde-cloudflare`**

| Type | Key | Sensitive | Description |
|------|-----|-----------|-------------|
| Environment variable | `CLOUDFLARE_API_TOKEN` | ✅ | Custom API token with **Cloudflare Pages: Edit** permission — used by the provider for auth |
| Terraform variable | `account_id` | No | Your Cloudflare account ID — passed to `var.account_id` in resources |
| Terraform variable | `zone_id` | No | DNS zone ID for `thingstead.io` — found in CF Dashboard → thingstead.io → Overview (right sidebar) |

**`tilde-github`**

| Type | Key | Sensitive | Description |
|------|-----|-----------|-------------|
| Environment variable | `GITHUB_TOKEN` | ✅ | Fine-grained PAT for `jwill824/tilde` with `Administration: Write` + `Contents: Read` |
| Terraform variable | `cloudflare_api_token` | ✅ | Cloudflare API token — Terraform writes this as `CLOUDFLARE_API_TOKEN` secret into the `production` GitHub environment |
| Terraform variable | `cloudflare_account_id` | No | Cloudflare account ID — Terraform writes this as `CLOUDFLARE_ACCOUNT_ID` secret into the `production` GitHub environment |

### First-time setup

The `thingstead` Cloudflare Pages project and `jwill824/tilde` GitHub repository already exist. Import them into Terraform state before the first apply:

```bash
# Cloudflare workspace — run locally with TFC remote state
cd terraform/cloudflare
terraform login
terraform init
terraform import cloudflare_pages_project.thingstead <CLOUDFLARE_ACCOUNT_ID>/thingstead

# GitHub workspace
cd ../github
terraform init
terraform import github_repository.tilde tilde
terraform import github_repository_environment.production tilde:production
```

After importing, push the `terraform/` files and TFC will run `plan` on the next merge.

### Making infrastructure changes

1. Edit the relevant `.tf` files in `terraform/cloudflare/` or `terraform/github/`
2. Open a PR — TFC runs a **speculative plan** and posts results as a PR check
3. Merge to `main` — TFC auto-applies the plan

> Never commit `*.tfvars` files or Terraform state files — credentials and state are managed entirely by Terraform Cloud.
