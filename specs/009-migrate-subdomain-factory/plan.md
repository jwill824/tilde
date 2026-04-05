# Implementation Plan: Migrate Tilde Site to Dedicated Subdomain and Factory Management

**Branch**: `009-migrate-subdomain-factory` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/009-migrate-subdomain-factory/spec.md`

## Summary

Migrate the tilde landing page and docs from the shared `thingstead` Cloudflare Pages project to a new, dedicated `thingstead-tilde` project with custom domain `tilde.thingstead.io`. This resolves a deployment conflict where both sites shared one project (last-deploy-wins) and a CSP mismatch blocking Tailwind CDN. The approach is: (1) add tilde to github-repo-factory (`repos.json`) to provision the new Pages project, DNS record, and GitHub secrets; (2) update the tilde deploy workflow, Astro config, landing page URLs, and add a `_redirects` file for the legacy install URL; (3) remove standalone Terraform from the tilde repo. Workspace decommissioning is a tracked follow-up, not a merge blocker.

## Technical Context

**Language/Version**: Node.js 22, TypeScript (docs site: Astro/Starlight), YAML (GitHub Actions), HCL (Terraform — being removed)  
**Primary Dependencies**: Cloudflare Pages (wrangler-action v3), Astro + Starlight, github-repo-factory (`repos.json`)  
**Storage**: N/A  
**Testing**: No new automated tests — verification is manual (URL resolution, deploy workflow run)  
**Target Platform**: Cloudflare Pages (CDN), GitHub Actions CI/CD  
**Project Type**: Infrastructure migration + static site deployment update  
**Performance Goals**: Standard CDN — static assets served from edge  
**Constraints**: Zero downtime; `thingstead.io` must remain live throughout; `_redirects` must preserve legacy install URL  
**Scale/Scope**: ~7 files changed across tilde repo + 1 cross-repo change to github-repo-factory

## Constitution Check

*This feature is a pure infrastructure/deployment migration. It does not change any CLI behavior. The 8 Core Principles govern tilde's CLI runtime — not its hosting infrastructure. The relevant principle check:*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ Not applicable | No CLI behavior changed |
| II. Bootstrap-Ready | ✅ Pass | Install one-liner URL updated in landing page and README; legacy URL preserved via `_redirects` |
| III. Context-Aware Environments | ✅ Not applicable | No environment resolution logic changed |
| IV. Interactive & Ink-First UX | ✅ Not applicable | No UI changes |
| V. Idempotent Operations | ✅ Not applicable | No install/configure logic changed |
| VI. Secrets-Free Repository | ✅ Pass | Secrets remain environment-scoped, provisioned by factory — none committed to repo |
| VII. macOS First, Cross-Platform by Design | ✅ Not applicable | No platform logic changed |
| VIII. Extensibility & Plugin Architecture | ✅ Not applicable | No plugin interface changed |

**Gate result: PASS — no violations. Proceed to Phase 1.**

## Project Structure

### Documentation (this feature)

```text
specs/009-migrate-subdomain-factory/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── quickstart.md        ← Phase 1 output (migration runbook)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code Changes (tilde repo)

```text
.github/workflows/
└── deploy-site.yml          ← update project name, assemble paths, job label

site/tilde/
├── index.html               ← update install URLs (2 occurrences)
├── _redirects               ← NEW: redirect /tilde/install.sh → /install.sh
└── _headers                 ← unchanged

site/docs/
└── astro.config.mjs         ← update site + base

docs/
└── README.md                ← update install URL + add infra deprecation notice

terraform/                   ← REMOVE entire directory
├── cloudflare/
│   ├── main.tf
│   ├── outputs.tf
│   ├── variables.tf
│   └── .terraform.lock.hcl
└── github/
    ├── main.tf
    ├── outputs.tf
    ├── variables.tf
    └── .terraform.lock.hcl
```

### Cross-Repo Change (github-repo-factory)

```text
repos.json    ← add tilde entry (thingstead-tilde Pages project + DNS + secrets)
```

**Structure Decision**: No new source directories are created in the tilde repo. All changes are targeted edits to existing files plus one new `_redirects` file and deletion of `terraform/`. The github-repo-factory change is a single JSON file edit coordinated as a separate PR in that repo.

## Complexity Tracking

No constitution violations — complexity tracking table not required.

