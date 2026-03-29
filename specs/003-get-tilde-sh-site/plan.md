# Implementation Plan: thingstead.io/tilde Documentation & Download Site

**Branch**: `003-get-tilde-sh-site` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-get-tilde-sh-site/spec.md`

## Summary

Build two co-deployed static sites from a single `site/` directory in the tilde repo:

- **`thingstead.io/tilde`** — minimal landing page (HTML) + `install.sh` (bash install script).
  The install script prompts for package manager, installs prerequisites, verifies the
  tilde package via SHA-256, and launches the wizard.
- **`thingstead.io/tilde/docs`** — full documentation site (Astro + Starlight) with Getting
  Started guide, Configuration Reference, and install method docs.

Both sites deploy automatically on merge to `main` via GitHub Actions, with Cloudflare
Pages serving each as a separate project under its respective CNAME.

## Technical Context

**Language/Version**: Bash 5+ (install script); Astro 4+ with Starlight (docs site);
HTML/CSS (landing page — no JS framework required)
**Primary Dependencies**: Astro 4, `@astrojs/starlight`, Node.js 20+ (docs build only);
`shasum`/`openssl` (install script checksum); `npm view` (version resolution)
**Storage**: N/A — static files only; no database, no server state
**Testing**: Bash `bats` or manual shell testing for install script; Astro build CI
check for docs; E2E smoke test on clean macOS VM for install acceptance
**Target Platform**: macOS (primary for install script); Linux (SHOULD); all modern
browsers for the sites
**Project Type**: Static site (docs) + shell script (installer)
**Performance Goals**: Landing page LCP < 1.5s; docs pages < 3s; install script
total runtime < 5 min on a fresh machine (per SC-001)
**Constraints**: No JavaScript required to display landing page core content (FR-010);
install script must run in `bash` 3.2+ (ships with macOS); no secrets in site source
**Scale/Scope**: Low traffic static site; no CDN scaling concerns beyond standard
Cloudflare Pages global distribution

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ Pass | Install script prompts user for package manager — no silent decisions |
| II. Bootstrap-Ready | ✅ Pass | This feature IS the Bootstrap-Ready story; directly implements Principle II |
| III. Context-Aware | ✅ N/A | Static site has no directory-context switching requirement |
| IV. Interactive & Ink-First UX | ✅ N/A | Install script is bash (pre-Node.js context); Ink not applicable until tilde launches |
| V. Idempotent Operations | ✅ Pass | Install script checks for existing Homebrew/Node before installing; safe to re-run |
| VI. Secrets-Free | ✅ Pass | No credentials in site source; checksum is a public hash, not a secret |
| VII. macOS First, Cross-Platform | ✅ Pass | macOS primary; Linux SHOULD; Windows out of scope with clear messaging |
| VIII. Extensibility & Plugin | ✅ N/A | No plugin hooks needed for a static site and install script |

**Gate result: PASS — no violations.**

## Project Structure

### Documentation (this feature)

```text
specs/003-get-tilde-sh-site/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── install-script.md   ← Install script interface contract
│   └── site-routes.md      ← URL routing contract for both domains
└── tasks.md             ← Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
site/
├── landing/                  # thingstead.io/tilde — deployed as-is (no build step)
│   ├── index.html            # Landing page
│   └── install.sh            # Served at thingstead.io/tilde/install.sh
│
└── docs/                     # thingstead.io/tilde/docs — Astro + Starlight build
    ├── astro.config.mjs
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── content/
        │   ├── config.ts
        │   └── docs/
        │       ├── index.mdx              # thingstead.io/tilde/docs root
        │       ├── installation.md        # All install methods
        │       ├── getting-started.md     # First run walkthrough
        │       └── config-reference.md    # tilde.config.json schema reference
        └── assets/
            └── tilde-logo.svg

.github/
└── workflows/
    └── deploy-site.yml       # CI: build docs + deploy both sites on push to main
```

**Structure Decision**: Single `site/` directory in the repo root. The landing page is
pure static HTML (no build step needed, fast to iterate). The docs site is a separate
Astro project under `site/docs/` with its own `package.json` — this isolates the docs
build from the main tilde TypeScript build and avoids dependency conflicts. Both are
deployed by a single GitHub Actions workflow to Cloudflare Pages (two separate CF
projects, one per domain).

## Phase 0: Research

See [research.md](./research.md) for full findings.

**Key decisions resolved:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Docs framework | Astro + Starlight | Minimal JS output, framework-agnostic, built-in search/dark mode/sidebar, aligns with modern CLI tool docs pattern |
| Landing page | Plain HTML + Tailwind CDN | No build step; fast iteration; JS not required for core content (FR-010) |
| Hosting | Cloudflare Pages (single project `thingstead`) | Free tier, global CDN, path-based routing for all tools under `thingstead.io`, HTTPS automatic |
| Version resolution | `npm view @jwill824/tilde version` at install time | Dynamic; no hardcoded version; always latest stable |
| SHA-256 checksum | `npm view @jwill824/tilde dist.integrity` + `openssl dgst` | npm registry publishes sha512 of tarball natively; script extracts and verifies |
| Install script base | Adapt `bootstrap.sh` | Already handles Xcode CLT, Homebrew, Node.js 20; add interactive PM prompt + checksum |
| Monorepo structure | `site/tilde/` + `site/docs/` | Separation of concerns; docs has own deps; both in same repo for co-location with source; assembled into single `dist/` at deploy time |

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

### Re-evaluated Constitution Check (post-design)

All gates remain passing. No design decisions introduced violations.
The install script's interactive package manager prompt is a direct implementation of
Principle I (Configuration-First) applied to the bootstrap context.

