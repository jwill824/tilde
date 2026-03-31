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
├── index.tsx              # CLI entry point — arg parsing, mode detection, TTY guard
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
├── 001-mvp-macos-bootstrap/
│   ├── spec.md            # Feature specification
│   ├── plan.md            # Architecture and implementation plan
│   └── tasks.md           # Ordered task checklist
└── ###-feature-name/      # Each feature gets its own directory

site/
├── tilde/                 # Install page + curl-pipe install script
│   ├── index.html         # Landing page (Tailwind CDN)
│   ├── install.sh         # Bash install script
│   └── favicon.svg        # Brand favicon
└── docs/                  # Astro + Starlight documentation site
    ├── astro.config.mjs
    ├── package.json
    └── src/content/docs/  # Markdown/MDX documentation pages

docs/
└── design/                # Brand assets and design tokens
    ├── thingstead-logo.svg # Thingstead parent brand wordmark
    └── design-tokens.md   # Canonical colours, typeface, CLI ANSI equivalents

scripts/                   # Build and release scripts
terraform/                 # Infrastructure as code (Cloudflare, Terraform Cloud)
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
- An update to `site/docs/src/content/docs/config-format.md` if the config schema changes

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

### Release workflow

Releases are handled by a separate `release.yml` workflow triggered on pushes to `main` (filtered to relevant paths) or manually via `workflow_dispatch`. It uses [semantic-release](https://semantic-release.gitbook.io) to:

1. Determine the next version from [Conventional Commits](#commit-conventions)
2. Publish to npm using GitHub OIDC (no stored npm token — requires npm trusted publisher configured with `environment: production`)
3. Push the version bump commit + updated `CHANGELOG.md` back to `main`
4. Create a GitHub release with generated release notes

The workflow requires the `GH_TOKEN` secret in the `production` environment (see [Required secrets](#required-secrets-github--settings--environments--production)). This PAT must belong to a repo admin to bypass branch protection on the version bump commit.

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

The job runs in the **`production` GitHub environment** — secrets are provisioned automatically by the `tilde-github` Terraform workspace. No manual secret management is needed after the first Terraform apply.

### Required secrets (GitHub → Settings → Environments → production)

> These secrets are managed by Terraform (`tilde-github` workspace). Do not set them manually — they will be overwritten on next apply.

| Secret | Provisioned by | Used by |
|--------|---------------|---------|
| `CLOUDFLARE_API_TOKEN` | `github_actions_environment_secret.cloudflare_api_token` in `terraform/github/` | `deploy-site.yml` — Cloudflare Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | `github_actions_environment_secret.cloudflare_account_id` in `terraform/github/` | `deploy-site.yml` — Cloudflare Pages deploy |
| `GH_TOKEN` | `github_actions_environment_secret.gh_token` in `terraform/github/` | `release.yml` — semantic-release version bump push + GitHub release |

### First-time Cloudflare setup

The `thingstead` Pages project, `thingstead.io` custom domain, and DNS record are all managed by the `tilde-cloudflare` Terraform workspace — no manual dashboard steps required. See the [Infrastructure (Terraform)](#infrastructure-terraform) section below for setup instructions.

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

Variables are split between a **shared Variable Set** (applied to both workspaces) and workspace-specific variables.

#### Shared Variable Set: `tilde-shared`

Create this Variable Set in TFC (Organization → Settings → Variable Sets) and apply it to both `tilde-cloudflare` and `tilde-github`.

| Type | Key | Sensitive | Description |
|------|-----|-----------|-------------|
| Terraform variable | `cloudflare_api_token` | ✅ | Cloudflare API token with **Cloudflare Pages: Edit** + **Zone: DNS: Edit** permissions — used by the CF provider in `tilde-cloudflare` and stored as a GitHub secret by `tilde-github` |
| Terraform variable | `cloudflare_account_id` | No | Cloudflare account ID — used in CF resources and stored as a GitHub secret |

#### Workspace-specific: `tilde-cloudflare`

| Type | Key | Sensitive | Description |
|------|-----|-----------|-------------|
| Terraform variable | `zone_id` | No | DNS zone ID for `thingstead.io` — found in CF Dashboard → thingstead.io → Overview (right sidebar) |

#### Workspace-specific: `tilde-github`

| Type | Key | Sensitive | Description |
|------|-----|-----------|-------------|
| Terraform variable | `github_token` | ✅ | Fine-grained PAT for `jwill824/tilde` — see [GitHub PAT requirements](#github-pat-requirements) below |

> **Why a Terraform variable (not an env var)?** The `tilde-github` provider block uses `token = var.github_token` explicitly so the same PAT value is also stored as the `GH_TOKEN` GitHub Actions secret by Terraform. If you previously had `GITHUB_TOKEN` as a TFC environment variable, it is now superseded by `github_token` as a Terraform variable and can be removed.

### GitHub PAT requirements

A single fine-grained PAT serves two roles in this project:

| Role | Where it's used | TFC storage |
|------|----------------|-------------|
| **IaC auth** — authenticates the `integrations/github` Terraform provider to manage repo settings, branch protection, and secrets | `terraform/github/main.tf` provider block (`token = var.github_token`) | `github_token` Terraform variable in `tilde-github` workspace |
| **CI release** — allows semantic-release to push the version bump commit and create the GitHub release | `release.yml` workflow (`GH_TOKEN` secret) | Provisioned automatically by `github_actions_environment_secret.gh_token` resource |

**Required PAT permissions** (fine-grained, scoped to `jwill824/tilde`):

| Permission | Level | Required for |
|------------|-------|-------------|
| Administration | Read | Terraform reads repo settings |
| Contents | Read & Write | Terraform manages files; semantic-release pushes version bump commit |
| Environments | Read & Write | Terraform manages the `production` environment |
| Issues | Read & Write | semantic-release comments on issues for each release |
| Metadata | Read | Required by all fine-grained PATs |
| Pull requests | Read & Write | semantic-release comments on merged PRs for each release |
| Secrets | Read & Write | Terraform provisions `GH_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` secrets |

> **Tip**: A classic PAT with the `repo` scope covers all of the above. Fine-grained is preferred for least-privilege.

### First-time setup

The `thingstead` Cloudflare Pages project and `jwill824/tilde` GitHub repository already exist. Import them into Terraform state before the first apply.

`terraform import` always runs locally. Because TFC workspace variables marked sensitive are unavailable locally, supply them as `TF_VAR_*` environment variables in your shell before running imports:

```bash
export TF_VAR_cloudflare_api_token=<token>
export TF_VAR_cloudflare_account_id=<account_id>
export TF_VAR_zone_id=<zone_id>
export TF_VAR_github_token=<fine-grained-PAT>
```

Then run imports:

```bash
# Cloudflare workspace
cd terraform/cloudflare
terraform login
terraform init

terraform import cloudflare_pages_project.thingstead <CLOUDFLARE_ACCOUNT_ID>/thingstead
terraform import cloudflare_pages_domain.thingstead_io <CLOUDFLARE_ACCOUNT_ID>/thingstead/thingstead.io
terraform import cloudflare_dns_record.thingstead_io <ZONE_ID>/<DNS_RECORD_ID>
# DNS record ID: GET https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records?name=thingstead.io&type=CNAME

# GitHub workspace
cd ../github
terraform init

terraform import github_repository.tilde tilde
terraform import github_repository_environment.production tilde:production
# github_branch_protection: skip import if branch protection doesn't exist yet —
#   Terraform will create it on first apply.
# github_actions_environment_secret: cannot be imported (write-only) —
#   all secrets are created fresh on first apply.
```

After importing, run `terraform plan` in each workspace to confirm no unexpected changes, then open a PR. TFC will run `plan` on the PR and `apply` on merge.

### Making infrastructure changes

1. Edit the relevant `.tf` files in `terraform/cloudflare/` or `terraform/github/`
2. Open a PR — TFC runs a **speculative plan** and posts results as a PR check
3. Merge to `main` — TFC auto-applies the plan

> Never commit `*.tfvars` files or Terraform state files — credentials and state are managed entirely by Terraform Cloud.
