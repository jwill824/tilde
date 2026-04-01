---
description: "Task list for Terraform IaC — GitHub and Cloudflare"
---

# Tasks: Terraform IaC for GitHub and Cloudflare

**Input**: Design documents from `/specs/004-terraform-iac/`
**Branch**: `004-terraform-iac`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅
**Tests**: Not requested — validation via `terraform validate` and `terraform plan` (idempotency checks)

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Create the Terraform directory skeleton and shared ignore rules.

- [X] T001 Create Terraform directory structure: `mkdir -p terraform/cloudflare terraform/github` at repository root — produces empty `terraform/cloudflare/` and `terraform/github/` directories
- [X] T002 Create `terraform/.gitignore` with the following entries: `.terraform/`, `*.tfstate`, `*.tfstate.*`, `*.tfvars`, `*.tfvars.json`, `crash.log`, `override.tf`, `override.tf.json`, `*_override.tf`, `*_override.tf.json`, `.terraformrc`, `terraform.rc` — prevents secrets, lock files, and local state from being committed

**Checkpoint**: Directory scaffold exists; no secrets can slip through.

---

## Phase 2: Foundational — TFC Workspace Configuration (Human Operator Steps)

**Purpose**: Terraform Cloud workspaces must be created and credentialed **before** `terraform init` can succeed. These are manual steps performed once by the maintainer in the TFC web UI or via the TFC API.

**⚠️ CRITICAL**: Both workspaces must be fully configured before any module can be initialized or validated.

- [ ] T003 Create the `tilde-cloudflare` TFC workspace: log into app.terraform.io → Organization `thingstead` → New Workspace → Version Control Workflow → connect `jwill824/tilde` → set **Working Directory** to `terraform/cloudflare` → enable **Automatic Run Triggering** scoped to the `terraform/cloudflare/**` path → set Execution Mode to **Remote**
- [ ] T004 Create the `tilde-github` TFC workspace: same process → connect `jwill824/tilde` → set **Working Directory** to `terraform/github` → enable **Automatic Run Triggering** scoped to the `terraform/github/**` path → set Execution Mode to **Remote**
- [ ] T005 [P] Add sensitive environment variables to the `tilde-cloudflare` workspace in TFC (Settings → Variables): `CLOUDFLARE_API_TOKEN` (Environment variable, mark **Sensitive**) from Cloudflare Dashboard → API Tokens; `CLOUDFLARE_ACCOUNT_ID` (Environment variable, not sensitive) from Cloudflare Dashboard → right-side Account ID; `TF_VAR_account_id` (Terraform variable, mark **Sensitive**) set to the same account ID value — used by resource arguments `var.account_id`; `TF_VAR_zone_id` (Terraform variable) set to the Cloudflare zone ID for `thingstead.io` from Cloudflare Dashboard → DNS → Zone ID
- [ ] T006 [P] Add sensitive environment variable to the `tilde-github` workspace in TFC (Settings → Variables): `GITHUB_TOKEN` (Environment variable, mark **Sensitive**) — a fine-grained PAT scoped exclusively to `jwill824/tilde` with **Administration: Write** and **Contents: Read** permissions; create at github.com → Settings → Developer settings → Fine-grained personal access tokens → New token

**Checkpoint**: Both TFC workspaces exist, VCS integration is active, and all credentials are stored as encrypted workspace variables. Module implementation can now begin.

---

## Phase 3: User Story 1 — Cloudflare Infrastructure is Reproducible (Priority: P1) 🎯 MVP

**Goal**: Codify the `thingstead` Cloudflare Pages project and `thingstead.io` custom domain binding as Terraform-managed resources so any authorized maintainer can destroy and restore them without manual dashboard steps.

**Independent Test**: Run `terraform destroy` followed by `terraform apply` in `terraform/cloudflare/` (via TFC). Verify the `thingstead` Pages project exists in Cloudflare, `thingstead.io` is bound as a custom domain, and the site is reachable.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `terraform/cloudflare/variables.tf` declaring two input variables: `account_id` (type `string`, `sensitive = true`, description "Cloudflare account ID — set via TF_VAR_account_id in TFC workspace variables") and `zone_id` (type `string`, description "Cloudflare zone ID for thingstead.io — set via TF_VAR_zone_id in TFC workspace variables")

- [X] T008 [US1] Create `terraform/cloudflare/main.tf` with four blocks in this order:
  1. `terraform` block: `required_version = ">= 1.6"`, `cloud` sub-block with `organization = "thingstead"` and `workspaces { name = "tilde-cloudflare" }`, `required_providers` sub-block with `cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }`
  2. `provider "cloudflare"` block: empty body (API token sourced from `CLOUDFLARE_API_TOKEN` env var set in TFC)
  3. `resource "cloudflare_pages_project" "thingstead"` block: `account_id = var.account_id`, `name = "thingstead"`, `production_branch = "main"`
  4. `resource "cloudflare_pages_domain" "thingstead_io"` block: `account_id = var.account_id`, `project_name = cloudflare_pages_project.thingstead.name`, `domain = "thingstead.io"`

- [X] T009 [P] [US1] Create `terraform/cloudflare/outputs.tf` with two outputs: `pages_project_url` (value `"${cloudflare_pages_project.thingstead.name}.pages.dev"`, description "Cloudflare Pages subdomain for the thingstead project") and `custom_domain_status` (value `cloudflare_pages_domain.thingstead_io.status`, description "Verification/activation status of the thingstead.io custom domain binding")

- [X] T010 [US1] Run `terraform init` inside `terraform/cloudflare/`: authenticate the Terraform CLI to TFC first via `terraform login`, then run `terraform init` — confirm the output shows "Terraform Cloud has been successfully initialized!" and the `cloudflare/cloudflare` provider is downloaded

- [X] T011 [US1] Run `terraform validate` inside `terraform/cloudflare/` — confirm output is "Success! The configuration is valid." Resolve any HCL syntax or schema errors before proceeding

- [X] T012 [US1] Import the existing Cloudflare Pages project into TFC state — run `terraform import cloudflare_pages_project.thingstead <CLOUDFLARE_ACCOUNT_ID>/thingstead` from `terraform/cloudflare/` (substituting the real account ID); this command runs locally but pushes state to TFC; confirm the import succeeds with "Import successful!" before running plan

- [X] T013 [US1] Run `terraform plan` in the `tilde-cloudflare` TFC workspace (triggered by pushing the branch to GitHub, or via `terraform plan` locally with remote execution): verify the plan output shows **0 to add, 0 to change, 0 to destroy** — this confirms the imported state matches the live Cloudflare configuration and the module is idempotent (SC-002)

**Checkpoint**: User Story 1 complete — Cloudflare infrastructure is fully codified, imported, and idempotent. The Pages project and domain binding can be destroyed and recreated with a single `terraform apply`.

---

## Phase 4: User Story 2 — GitHub Repository Settings are Version-Controlled (Priority: P2)

**Goal**: Codify the `jwill824/tilde` GitHub repository settings and `main` branch protection rule so drift is detectable and correctable via `terraform apply`.

**Independent Test**: Delete the `main` branch protection rule manually in GitHub Settings, then trigger a TFC run. Verify the rule is restored with required `CI` status check, no direct pushes, and linear history enforcement.

### Implementation for User Story 2

- [X] T014 [P] [US2] Create `terraform/github/variables.tf` declaring one input variable: `github_owner` (type `string`, `default = "jwill824"`, description "GitHub user or organization that owns the tilde repository")

- [X] T015 [US2] Create `terraform/github/main.tf` with four blocks in this order:
  1. `terraform` block: `required_version = ">= 1.6"`, `cloud` sub-block with `organization = "thingstead"` and `workspaces { name = "tilde-github" }`, `required_providers` sub-block with `github = { source = "integrations/github", version = "~> 6.0" }`
  2. `provider "github"` block: `owner = var.github_owner` (token sourced from `GITHUB_TOKEN` env var set in TFC)
  3. `resource "github_repository" "tilde"` block: `name = "tilde"`, `allow_squash_merge = true`, `allow_merge_commit = false`, `allow_rebase_merge = false`, `delete_branch_on_merge = true`, `has_issues = true`
  4. `resource "github_branch_protection" "main"` block: `repository_id = github_repository.tilde.node_id`, `pattern = "main"`, `enforce_admins = true`, `require_linear_history = true`, nested `required_status_checks { strict = true; contexts = ["CI"] }`, nested `required_pull_request_reviews { required_approving_review_count = 0 }`

- [X] T016 [P] [US2] Create `terraform/github/outputs.tf` with two outputs: `repository_url` (value `github_repository.tilde.html_url`, description "HTTPS URL of the jwill824/tilde GitHub repository") and `branch_protection_id` (value `github_branch_protection.main.id`, description "Terraform resource ID for the main branch protection rule")

- [X] T017 [US2] Run `terraform init` inside `terraform/github/` — confirm the output shows "Terraform Cloud has been successfully initialized!" and the `integrations/github` provider is downloaded

- [X] T018 [US2] Run `terraform validate` inside `terraform/github/` — confirm output is "Success! The configuration is valid." Resolve any HCL syntax or schema errors before proceeding

- [X] T019 [US2] Import the existing GitHub repository into TFC state — run `terraform import github_repository.tilde tilde` from `terraform/github/` (uses repo name only, not the full `owner/repo` path); confirm the import succeeds with "Import successful!" before running plan; note: `github_branch_protection` does NOT need a separate import — it will be created fresh on first apply if the protection already exists (Terraform will reconcile it)

- [X] T020 [US2] Run `terraform plan` in the `tilde-github` TFC workspace: verify the plan output shows **0 to add, 0 to change, 0 to destroy** for the repository resource; the branch protection rule may show as a new resource to add if it did not previously exist in state — review the planned changes match the intended configuration before applying (SC-002)

**Checkpoint**: User Story 2 complete — GitHub repository settings and branch protections are fully codified and drift-detectable. Stories 1 and 2 are independently testable.

---

## Phase 5: User Story 3 — Terraform State is Safely Stored and Shared (Priority: P3)

**Goal**: Confirm that both TFC workspaces store state remotely, support concurrent plan isolation, and allow any authorized contributor to run plans from a fresh machine without local state files.

**Independent Test**: Two contributors run `terraform plan` simultaneously on different machines — neither sees stale state or a conflict (TFC queues overlapping runs automatically).

### Implementation for User Story 3

- [ ] T021 [P] [US3] Verify remote state is active in the `tilde-cloudflare` workspace: log into app.terraform.io → Workspaces → `tilde-cloudflare` → States tab — confirm at least one state version is listed after the import step (T012) with a non-empty serial number; confirm no `terraform.tfstate` file exists locally in `terraform/cloudflare/`

- [ ] T022 [P] [US3] Verify remote state is active in the `tilde-github` workspace: log into app.terraform.io → Workspaces → `tilde-github` → States tab — confirm at least one state version is listed after the import step (T019); confirm no `terraform.tfstate` file exists locally in `terraform/github/`

- [ ] T023 [US3] Test concurrent plan isolation: from two separate terminal sessions (or two machines with valid TFC credentials), trigger `terraform plan` in both `terraform/cloudflare/` and `terraform/github/` within the same minute — verify both plans complete successfully and independently with no stale-state errors; verify that running both simultaneously does not cause either to report unexpected changes or state lock errors (TFC serializes runs per workspace automatically)

**Checkpoint**: All three user stories are complete. Remote state is confirmed active, locking is provided by TFC, and a fresh `terraform init` on any authorized machine downloads current state without needing local files.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final validation, and end-to-end verification.

- [ ] T024 [P] Update `CONTRIBUTING.md`: add a new top-level section **"Infrastructure (Terraform)"** after the existing "CI Pipeline" section; include the following sub-sections:
  - **Prerequisites**: Terraform CLI ≥ 1.6 (`brew install terraform`), access to the `thingstead` TFC organization
  - **First-time local setup**: `terraform login` to authenticate CLI to TFC, then `terraform init` in each module directory
  - **Running a plan locally**: `cd terraform/cloudflare && terraform plan` (runs remotely in TFC, output streamed to terminal); same for `terraform/github/`
  - **How VCS-driven runs work**: merging to `main` automatically queues a plan + apply in TFC for whichever module's files changed; path filters ensure the GitHub workspace only triggers on `terraform/github/**` changes and vice versa
  - **Adding a new resource**: edit the appropriate `main.tf`, open a PR, review the speculative plan in TFC before merging
  - **Importing an existing resource**: run `terraform import <resource.name> <id>` locally (pushes state to TFC); see Phase 3 and Phase 4 tasks in `specs/004-terraform-iac/tasks.md` for the exact import IDs used for initial setup
  - **Credentials**: never commit API tokens or PATs; all secrets live as encrypted TFC workspace variables (see T005, T006)
  - **TFC workspace URLs**: `https://app.terraform.io/app/thingstead/workspaces/tilde-cloudflare` and `https://app.terraform.io/app/thingstead/workspaces/tilde-github`

- [ ] T025 [P] Final end-to-end validation: delete the `.terraform/` directories in both `terraform/cloudflare/` and `terraform/github/`, run `terraform init` in each from scratch, then run `terraform plan` — confirm both plans show **0 changes** and outputs are populated; this simulates a fresh-machine contributor experience and validates SC-003 ("any contributor with valid credentials can run `terraform plan` from a fresh machine in under 5 minutes")

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **blocks all module work**
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both depend on Foundational (Phase 2); US1 and US2 are **independent of each other** and can be worked in parallel
- **US3 (Phase 5)**: Depends on US1 (T012 import) and US2 (T019 import) completion — state must be seeded before verification
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

```
Phase 1 (T001–T002)
  └── Phase 2 (T003–T006)
        ├── Phase 3: US1 (T007–T013)  ──────┐
        └── Phase 4: US2 (T014–T020)  ──────┤
                                             │
                              Phase 5: US3 (T021–T023)
                                             │
                              Phase 6: Polish (T024–T025)
```

### Intra-Phase Parallel Opportunities

**Within Phase 2:**
- T005 and T006 can run in parallel (different TFC workspaces)

**Across Phase 3 and Phase 4 (inter-story parallelism):**
- T007 (cloudflare/variables.tf) ∥ T014 (github/variables.tf)
- T008 (cloudflare/main.tf) ∥ T015 (github/main.tf) — after T007 and T014 respectively
- T009 (cloudflare/outputs.tf) ∥ T016 (github/outputs.tf) — alongside T008 and T015
- T010 (terraform init cloudflare) ∥ T017 (terraform init github)
- T011 (terraform validate cloudflare) ∥ T018 (terraform validate github)
- T012 (import cloudflare resource) before T013 (plan cloudflare)
- T019 (import github resource) before T020 (plan github)

**Within Phase 5:**
- T021 and T022 can run in parallel (different TFC workspaces)

**Within Phase 6:**
- T024 (CONTRIBUTING.md) ∥ T025 (validation run)

---

## Parallel Execution Examples

### Module Development (Phases 3 + 4 in Parallel)

```bash
# Terminal A — Cloudflare module
cd terraform/cloudflare
# Write variables.tf → main.tf → outputs.tf
terraform init
terraform validate
terraform import cloudflare_pages_project.thingstead <ACCOUNT_ID>/thingstead
terraform plan

# Terminal B — GitHub module (simultaneously)
cd terraform/github
# Write variables.tf → main.tf → outputs.tf
terraform init
terraform validate
terraform import github_repository.tilde tilde
terraform plan
```

### Validation Runs (Phase 5 in Parallel)

```bash
# Confirm remote state in both workspaces simultaneously:
open https://app.terraform.io/app/thingstead/workspaces/tilde-cloudflare/states
open https://app.terraform.io/app/thingstead/workspaces/tilde-github/states
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: TFC workspace setup (T003–T006) — **CRITICAL, blocks everything**
3. Complete Phase 3: Cloudflare module (T007–T013)
4. **STOP and VALIDATE**: Confirm Pages project and domain binding in Cloudflare dashboard; run `terraform plan` and verify 0 changes
5. This alone satisfies SC-001 and SC-002 for the most urgent gap (FR-001, FR-002, FR-003)

### Incremental Delivery

1. Setup + Foundational → workspaces ready
2. US1 Cloudflare module → Pages project reproducible (MVP)
3. US2 GitHub module → repo settings version-controlled
4. US3 State verification → multi-contributor workflow confirmed
5. Polish → documentation and clean-slate validation

### Parallel Team Strategy

With two contributors:

1. Both complete Phase 1 + Phase 2 together (setup and TFC)
2. Once TFC workspaces are configured:
   - **Contributor A**: Phase 3 (Cloudflare module, T007–T013)
   - **Contributor B**: Phase 4 (GitHub module, T014–T020)
3. Both contribute to Phase 5 verification (T021–T023)
4. Both contribute to Phase 6 polish (T024–T025)

---

## Task Summary

| Phase | Tasks | Story | Count |
|-------|-------|-------|-------|
| Phase 1: Setup | T001–T002 | — | 2 |
| Phase 2: Foundational (TFC) | T003–T006 | — | 4 |
| Phase 3: Cloudflare Module | T007–T013 | US1 | 7 |
| Phase 4: GitHub Module | T014–T020 | US2 | 7 |
| Phase 5: State Verification | T021–T023 | US3 | 3 |
| Phase 6: Polish | T024–T025 | — | 2 |
| **Total** | | | **25** |

### Parallel Opportunities

- T005 ∥ T006 (TFC workspace variable setup)
- T007 ∥ T014 (variables.tf across modules)
- T008 ∥ T015 (main.tf across modules)
- T009 ∥ T016 (outputs.tf across modules)
- T010 ∥ T017 (terraform init across modules)
- T011 ∥ T018 (terraform validate across modules)
- T021 ∥ T022 (state verification across modules)
- T024 ∥ T025 (CONTRIBUTING.md ∥ validation run)

### Independent Test Criteria per Story

| Story | Independent Test |
|-------|-----------------|
| US1 (Cloudflare) | `terraform destroy` + `terraform apply` in `terraform/cloudflare/` — thingstead project and thingstead.io domain exist in Cloudflare dashboard |
| US2 (GitHub) | Delete `main` branch protection rule manually, run `terraform apply` — rule is restored with `CI` check, no direct push, linear history |
| US3 (Remote State) | Fresh `terraform init` on a new machine downloads state; concurrent `terraform plan` runs queue without conflict |

---

## Notes

- **No `terraform.tfvars` committed**: All sensitive values live as TFC workspace variables (T005, T006). The `.gitignore` (T002) enforces this.
- **Import before first apply**: Both `cloudflare_pages_project.thingstead` (T012) and `github_repository.tilde` (T019) already exist and must be imported to avoid conflict errors on first apply.
- **Remote execution model**: `terraform apply` is never run locally in production. Merging to `main` triggers TFC. Local `terraform plan` (remote execution mode) is used for development review.
- **`github_branch_protection` import**: Not strictly required — if the rule doesn't exist in state, Terraform will create it. If a conflicting rule exists, apply may error; review the plan output carefully on first run.
- **Provider credential pattern**: `CLOUDFLARE_API_TOKEN` and `GITHUB_TOKEN` are environment variables passed directly to providers. `TF_VAR_account_id` and `TF_VAR_zone_id` are Terraform-prefixed variables used by resource arguments via `var.*`.
- **[P] tasks** = different files, no blocking dependencies between them
- **[Story] labels** map tasks to user stories for independent traceability
- Commit after each logical group (e.g., after completing all files for a module)
- Stop at each **Checkpoint** to validate the story independently before proceeding
