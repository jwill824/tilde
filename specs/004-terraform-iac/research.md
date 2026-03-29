# Research: Terraform IaC for GitHub and Cloudflare

## Decision 1: Cloudflare Terraform Provider

**Decision**: Use `cloudflare/cloudflare` provider v5; manage Pages with `cloudflare_pages_project`, `cloudflare_pages_domain`, and `cloudflare_record` for DNS

**Rationale**: Both resources are stable in the official Cloudflare provider v5 (current: 5.18.0). `cloudflare_pages_project` manages project creation and production branch. `cloudflare_pages_domain` handles the custom domain binding using the `name` attribute (not `domain`). A separate `cloudflare_record` (CNAME) is required — unlike adding a domain via the CF dashboard, the Terraform resource does NOT auto-create the DNS record.

**Key attributes**:
- `cloudflare_pages_project`: `account_id`, `name`, `production_branch` (required)
- `cloudflare_pages_domain`: `account_id`, `project_name`, `name` (required; `name` is the domain string)
- `cloudflare_record`: `zone_id`, `name`, `type = "CNAME"`, `content`, `proxied`

**Import**: `terraform import cloudflare_pages_project.thingstead <account_id>/thingstead`

**Alternatives considered**: Cloudflare API via `null_resource` + `curl` — rejected because it bypasses state management and idempotency guarantees.

---

## Decision 2: GitHub Terraform Provider

**Decision**: Use `integrations/github` provider; manage repo with `github_repository` (data source for existing repo) and `github_branch_protection` for `main`

**Rationale**: The repo already exists — using `github_repository` as a managed resource requires import, or can be referenced as a data source if we only want to enforce protection without managing all repo settings. Given FR-004 requires managing settings (squash merge, delete on merge), we use the resource with `import`.

**Key attributes for `github_repository`**:
- `allow_squash_merge = true`
- `allow_merge_commit = false`
- `allow_rebase_merge = false`
- `delete_branch_on_merge = true`
- `has_issues = true`

**Key attributes for `github_branch_protection`**:
- `repository_id` = `github_repository.tilde.node_id`
- `pattern = "main"`
- `enforce_admins = true`
- `require_linear_history = true`
- `required_status_checks { strict = true; contexts = ["CI"] }`

**Import**: `terraform import github_repository.tilde tilde` (uses repo name, not full path)

**Alternatives considered**: GitHub API via `null_resource` — rejected for same reasons as above.

---

## Decision 3: Terraform Cloud Backend

**Decision**: Use the native `cloud` block (not legacy `remote` backend) in each root module

**Rationale**: The `cloud` block is the current recommended approach for TFC integration (Terraform ≥ 1.1). It supports named workspaces, VCS-driven runs, and workspace variables natively.

**HCL pattern per module**:
```hcl
terraform {
  cloud {
    organization = "thingstead"
    workspaces {
      name = "tilde-cloudflare"  # or "tilde-github"
    }
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}
```

**Alternatives considered**: S3-compatible backend (Cloudflare R2) — rejected because TFC is already available and provides the run UI, state locking, and workspace variable encryption out of the box.

---

## Decision 4: VCS Integration vs API-Driven Runs

**Decision**: Configure each TFC workspace with VCS integration pointing to `jwill824/tilde`, with working directory set to `terraform/cloudflare` or `terraform/github` and trigger path filter matching that directory.

**Rationale**: VCS-driven runs mean merging to `main` automatically queues a speculative plan + apply in TFC — no manual `terraform apply` needed. Path filters prevent the GitHub workspace from running when only Cloudflare files change and vice versa.

**TFC workspace settings per workspace**:
- VCS: `jwill824/tilde` (GitHub)
- Working Directory: `terraform/cloudflare` (or `terraform/github`)
- Trigger: VCS trigger on working directory changes only
- Execution Mode: Remote

---

## Decision 5: Importing Existing Resources

**Decision**: Use `terraform import` before first apply for both the Cloudflare Pages project and the GitHub repository.

**Rationale**: Both already exist. Without import, `terraform apply` would either error (resource exists) or attempt to create a duplicate. Import pulls existing state into Terraform without modifying the resource.

**Import commands**:
```bash
# Cloudflare workspace
terraform import cloudflare_pages_project.thingstead <CLOUDFLARE_ACCOUNT_ID>/thingstead

# GitHub workspace
terraform import github_repository.tilde tilde
```

These are run once locally (even with TFC remote execution — `terraform import` runs locally and pushes state to TFC).

---

## Decision 6: Sensitive Variable Handling

**Decision**: Shared credentials stored in a TFC Variable Set (`tilde-shared`) applied to both workspaces. Workspace-specific variables set per workspace. No `terraform.tfvars` committed.

**Variable Set: `tilde-shared`** (applied to both workspaces):

| Variable | Type | Source |
|----------|------|--------|
| `cloudflare_api_token` | Terraform, sensitive | CF Dashboard → API Tokens |
| `cloudflare_account_id` | Terraform | CF Dashboard → Account ID |

**Workspace-specific variables**:

| Workspace | Variable | Type | Source |
|-----------|----------|------|--------|
| `tilde-cloudflare` | `zone_id` | Terraform | CF Dashboard → thingstead.io → Zone ID |
| `tilde-github` | `GITHUB_TOKEN` | env, sensitive | Fine-grained PAT (repo: tilde, Admin:Write + Contents:Read) |

The `cloudflare_api_token` variable is consumed by the Cloudflare provider (`api_token` attribute) in `tilde-cloudflare` and written as a GitHub environment secret by `tilde-github`.
