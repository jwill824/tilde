# Feature Specification: Terraform IaC for GitHub and Cloudflare

**Feature Branch**: `004-terraform-iac`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Terraform IaC for GitHub and Cloudflare — manage the tilde repo settings, branch protections, and Cloudflare Pages project with custom domain using Terraform"

## Clarifications

### Session 2026-03-29

- Q: Terraform Cloud execution mode — local with remote state, or remote execution triggered by VCS? → A: Remote execution — TFC is connected to the GitHub repo via VCS integration and automatically runs `terraform apply` when changes merge to `main`. Credentials are stored as encrypted TFC workspace variables.
- Q: Which CI status check name(s) must pass before merging to `main`? → A: `CI`
- Q: What GitHub token type should be used to manage repo settings and branch protections? → A: Fine-grained PAT scoped to `jwill824/tilde` with `Administration: Write` and `Contents: Read` permissions
- Q: What directory structure should the Terraform configuration follow? → A: `terraform/cloudflare/` and `terraform/github/` as separate root modules (each with its own TFC workspace), mirroring the `EmailNotionSync.Terraform/azure` + `github` pattern

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cloudflare infrastructure is reproducible (Priority: P1)

A contributor or maintainer can destroy and re-create all Cloudflare resources (Pages project, custom domain binding) by running a single Terraform apply. No manual steps in the Cloudflare dashboard are required.

**Why this priority**: The Pages project and domain binding are currently set up by hand. If the project is deleted or misconfigured, there is no automated way to restore it. This is the most urgent gap.

**Independent Test**: Run `terraform destroy` followed by `terraform apply` in a clean environment. Verify the `thingstead` Pages project exists in Cloudflare, `thingstead.io` is bound as a custom domain, and the site is reachable.

**Acceptance Scenarios**:

1. **Given** no Cloudflare Pages project exists, **When** `terraform apply` runs, **Then** the `thingstead` project is created with `main` as the production branch.
2. **Given** the Pages project exists but has no custom domain, **When** `terraform apply` runs, **Then** `thingstead.io` is added as a custom domain and resolves correctly.
3. **Given** all resources already exist, **When** `terraform apply` runs, **Then** no changes are made (idempotent).

---

### User Story 2 — GitHub repository settings are version-controlled (Priority: P2)

A maintainer can review and change repository settings (branch protections, required status checks, merge strategy) by editing a Terraform file and opening a PR — not by clicking through the GitHub UI.

**Why this priority**: Repository settings drift silently over time. Codifying them prevents accidental changes and makes the intended configuration auditable in git history.

**Independent Test**: Delete a branch protection rule manually in GitHub, then run `terraform apply`. Verify the rule is restored exactly as defined.

**Acceptance Scenarios**:

1. **Given** a branch protection rule is missing from `main`, **When** `terraform apply` runs, **Then** the rule is re-created with required status checks and no direct pushes allowed.
2. **Given** the repo has squash merge disabled, **When** `terraform apply` runs, **Then** squash merge is enabled and merge commits are disabled.
3. **Given** all settings match the Terraform state, **When** `terraform apply` runs, **Then** no changes are made.

---

### User Story 3 — Terraform state is safely stored and shared (Priority: P3)

Any authorized team member can run Terraform from any machine and share state without conflicts or accidental overwrites.

**Why this priority**: Local state files are lost on machine changes and cause conflicts in teams. Remote state is a prerequisite for safe collaboration.

**Independent Test**: Two contributors run `terraform plan` simultaneously on different machines and neither sees stale state or a conflict.

**Acceptance Scenarios**:

1. **Given** a remote state backend is configured, **When** a contributor runs `terraform init`, **Then** the current state is downloaded and no local state file is required.
2. **Given** one contributor is running `terraform apply`, **When** a second runs `terraform apply` at the same time, **Then** the second is blocked until the first completes (state locking).
3. **Given** `terraform apply` completes successfully, **When** any contributor runs `terraform plan`, **Then** the plan shows no pending changes.

---

### Edge Cases

- What happens if the Cloudflare API token is expired or missing when `terraform apply` runs?
- What happens if `thingstead.io` is transferred to a different registrar mid-apply?
- What if a GitHub branch protection rule conflicts with an existing ruleset?
- What if Terraform state becomes corrupted or is manually deleted?

## Requirements *(mandatory)*

### Functional Requirements

**Cloudflare**

- **FR-001**: Terraform MUST manage the Cloudflare Pages project named `thingstead` with `main` as the production branch.
- **FR-002**: Terraform MUST bind `thingstead.io` as a custom domain on the `thingstead` Pages project.
- **FR-003**: Terraform MUST source shared Cloudflare credentials (`cloudflare_api_token`, `cloudflare_account_id`) from a TFC Variable Set named `tilde-shared` applied to both workspaces — never from committed files or local environment variables.

**GitHub**

- **FR-004**: Terraform MUST manage the `jwill824/tilde` GitHub repository settings including: squash merge only, delete branch on merge, and issue tracking enabled.
- **FR-005**: Terraform MUST enforce a branch protection rule on `main` requiring: the `CI` status check passes before merging, no direct pushes, and linear history.
- **FR-006**: Terraform MUST authenticate to GitHub using a fine-grained PAT scoped exclusively to the `jwill824/tilde` repository with `Administration: Write` and `Contents: Read` permissions, stored as an encrypted Terraform Cloud workspace variable.
- **FR-011**: Terraform MUST create and manage a single `production` GitHub Actions environment on the `jwill824/tilde` repository.
- **FR-012**: Terraform MUST provision `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as encrypted secrets on the `production` GitHub Actions environment, sourcing their values from the `tilde-shared` TFC Variable Set.

**State & Structure**

- **FR-007**: Terraform state MUST be stored remotely to support multi-contributor workflows and prevent state loss.
- **FR-008**: Terraform configuration MUST be organized as two separate root modules: `terraform/cloudflare/` (Pages project, custom domain) and `terraform/github/` (repo settings, branch protection), each with its own TFC workspace and independent state. Each module contains `main.tf`, `variables.tf`, and `outputs.tf`.
- **FR-009**: A `terraform plan` MUST be runnable without applying changes, producing a human-readable diff of drift.
- **FR-010**: Terraform MUST output key resource identifiers (Pages project URL, custom domain status) after a successful apply.

### Key Entities

- **Cloudflare Pages Project**: Named `thingstead`; production branch `main`; deployed via CI not Terraform
- **Custom Domain Binding**: `thingstead.io` attached to the `thingstead` Pages project
- **GitHub Repository**: `jwill824/tilde`; settings and branch protections managed by Terraform
- **Branch Protection Rule**: Applied to `main`; required checks, no direct push, linear history
- **GitHub Actions Environment**: `production` environment with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets
- **Remote State Backend**: Stores Terraform state file; supports locking

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A complete `terraform destroy` followed by `terraform apply` restores all managed Cloudflare and GitHub resources with zero manual steps.
- **SC-002**: Running `terraform plan` after a successful `terraform apply` shows zero planned changes (full idempotency).
- **SC-003**: Any contributor with valid credentials can run `terraform plan` or `terraform apply` from a fresh machine in under 5 minutes.
- **SC-004**: All sensitive values (API tokens, PATs) are absent from the Terraform codebase and state file in plain text.
- **SC-005**: Repository settings drift (e.g., a manually deleted branch protection rule) is detected and corrected within one `terraform apply` run.

## Assumptions

- Terraform runs are executed remotely via Terraform Cloud, triggered automatically by the GitHub VCS integration when changes merge to `main`. No local `terraform apply` is required.
- The Cloudflare account already owns the `thingstead.io` domain and it is active in Cloudflare DNS.
- The `thingstead` Pages project may already exist; Terraform will import or adopt it rather than error on conflict.
- A fine-grained GitHub PAT (scoped to `jwill824/tilde`, `Administration: Write` + `Contents: Read`) is stored as an encrypted TFC workspace variable.
- Terraform Cloud is used as the remote state backend (account already exists); state locking and remote execution are available out of the box.
- The Cloudflare provider and GitHub provider for Terraform are used (both are official, actively maintained providers).
- Destroying the Cloudflare Pages project does not delete deployed content permanently — it only removes the project configuration.

