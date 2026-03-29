# Implementation Plan: Terraform IaC for GitHub and Cloudflare

**Branch**: `004-terraform-iac` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-terraform-iac/spec.md`

## Summary

Codify the Thingstead organization's GitHub repository settings and Cloudflare Pages infrastructure as Terraform. Two separate root modules (`terraform/cloudflare/` and `terraform/github/`) — each with its own Terraform Cloud workspace — manage the `thingstead` Pages project + `thingstead.io` custom domain and the `jwill824/tilde` repository settings + `main` branch protection respectively. TFC remote execution is triggered automatically via GitHub VCS integration on merge to `main`. All credentials are stored as encrypted TFC workspace variables.

## Technical Context

**Language/Version**: HCL (Terraform ≥ 1.6)
**Primary Dependencies**:
- `cloudflare/cloudflare` provider (Terraform Registry) — Pages project, custom domain
- `integrations/github` provider (Terraform Registry) — repo settings, branch protection
- Terraform Cloud — remote execution, state storage, workspace variables
**Storage**: Terraform Cloud (remote state per workspace)
**Testing**: `terraform validate`, `terraform plan` (reviewed in TFC run UI); no unit test framework
**Target Platform**: Terraform Cloud (remote execution); macOS local for `terraform plan` review
**Project Type**: Infrastructure-as-Code (two root modules, no application code)
**Performance Goals**: `terraform apply` completes in under 2 minutes per workspace
**Constraints**: No secrets in committed files; all sensitive vars in TFC workspace variables
**Scale/Scope**: 2 TFC workspaces, ~5–8 managed resources total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature is pure infrastructure — it does not modify the tilde CLI behaviour, wizard steps, config schema, or any user-facing interaction. Constitution principles I–VIII apply only to the tilde application itself; none are violated here.

| Principle | Applicability | Status |
|-----------|--------------|--------|
| I. Configuration-First | N/A — no CLI changes | ✅ Pass |
| II. Bootstrap-Ready | N/A — no install script changes | ✅ Pass |
| III. Context-Aware Environments | N/A | ✅ Pass |
| IV. Interactive & Ink-First UX | N/A | ✅ Pass |
| V. Idempotent & Safe | Terraform apply is idempotent by design | ✅ Pass |
| VI. No Plaintext Secrets | All credentials in encrypted TFC vars | ✅ Pass |
| VII. Config Portability | N/A | ✅ Pass |
| VIII. Extensibility | N/A | ✅ Pass |

## Project Structure

### Documentation (this feature)

```text
specs/004-terraform-iac/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/           # Phase 1 output
│   └── workspace-config.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
terraform/
├── .gitignore           # Ignore .terraform/, *.tfstate, *.tfvars (local overrides)
├── cloudflare/
│   ├── main.tf          # cloudflare_pages_project, cloudflare_pages_domain
│   ├── variables.tf     # account_id, zone_id
│   └── outputs.tf       # pages_url, domain_status
└── github/
    ├── main.tf          # github_repository, github_branch_protection
    ├── variables.tf     # github_owner, required_status_checks
    └── outputs.tf       # repo_url, branch_protection_id
```

**Structure Decision**: Two independent root modules mirroring the `EmailNotionSync.Terraform/azure` + `github` pattern. Each module has its own `terraform { cloud { ... } }` backend block pointing to a separate named TFC workspace (`tilde-cloudflare`, `tilde-github`). Independent state means a Cloudflare change never forces a GitHub plan and vice versa.

## Phase 0: Research

See [research.md](./research.md) for full findings.

### Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cloudflare Pages resource | `cloudflare_pages_project` | Official CF provider resource for Pages |
| Custom domain resource | `cloudflare_pages_domain` | Binds domain to Pages project |
| GitHub repo resource | `github_repository` | Manages settings on existing repo |
| Branch protection resource | `github_branch_protection` | Enforces `main` protections |
| State backend | Terraform Cloud (`cloud` block) | Already owned; remote exec + state locking |
| Credential storage | TFC workspace variables (sensitive) | Never committed; encrypted at rest |
| Import strategy | `terraform import` for existing resources | `thingstead` Pages project already exists |

## Phase 1: Design & Contracts

### TFC Workspace Configuration

| Workspace | Working Directory | VCS Trigger Path | Provider Credentials |
|-----------|------------------|-----------------|---------------------|
| `tilde-cloudflare` | `terraform/cloudflare` | `terraform/cloudflare/**` | `CLOUDFLARE_API_TOKEN`, `account_id`, `zone_id` |
| `tilde-github` | `terraform/github` | `terraform/github/**` | `GITHUB_TOKEN`, `cloudflare_api_token`, `cloudflare_account_id` |

### Resource Map

**`terraform/cloudflare/main.tf`**
```
cloudflare_pages_project "thingstead"
  - name            = "thingstead"
  - account_id      = var.account_id
  - production_branch = "main"

cloudflare_pages_domain "thingstead_io"
  - account_id  = var.account_id
  - project_name = cloudflare_pages_project.thingstead.name
  - domain       = "thingstead.io"
```

**`terraform/github/main.tf`**
```
github_repository "tilde"
  - name                   = "tilde"
  - allow_squash_merge     = true
  - allow_merge_commit     = false
  - allow_rebase_merge     = false
  - delete_branch_on_merge = true
  - has_issues             = true

github_repository_environment "prod"
  - repository  = github_repository.tilde.name
  - environment = "prod"

github_actions_environment_secret "cloudflare_api_token"
  - secret_name     = "CLOUDFLARE_API_TOKEN"
  - plaintext_value = var.cloudflare_api_token

github_actions_environment_secret "cloudflare_account_id"
  - secret_name     = "CLOUDFLARE_ACCOUNT_ID"
  - plaintext_value = var.cloudflare_account_id

github_branch_protection "main"
  - repository_id          = github_repository.tilde.node_id
  - pattern                = "main"
  - enforce_admins         = true
  - require_linear_history = true
  - required_status_checks:
      strict   = true
      contexts = ["CI"]
  - required_pull_request_reviews:
      required_approving_review_count = 0  (at least PR required, no reviewers for solo)
```

### Import Plan

The `thingstead` Cloudflare Pages project, `jwill824/tilde` GitHub repository, and `prod` GitHub environment already exist. Before first `terraform apply`, run:

```bash
# In terraform/cloudflare/
terraform import cloudflare_pages_project.thingstead <account_id>/thingstead

# In terraform/github/
terraform import github_repository.tilde tilde
terraform import github_repository_environment.prod tilde:prod
```

> `github_actions_environment_secret` resources cannot be imported (write-only values). They will be created on first apply, overwriting any manually set secret values.

### Outputs

**cloudflare outputs.tf**
- `pages_project_url` — `<project>.pages.dev` subdomain
- `custom_domain_status` — active/pending verification status

**github outputs.tf**
- `repository_url` — `https://github.com/jwill824/tilde`
- `branch_protection_id` — TF resource ID for the `main` rule
- `prod_environment_url` — GitHub prod environment deployments URL

## Complexity Tracking

No constitution violations. No complexity justification required.

