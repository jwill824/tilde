# Feature Specification: Migrate Tilde Site to Dedicated Subdomain and Factory Management

**Feature Branch**: `009-migrate-subdomain-factory`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: Migrate tilde site to tilde.thingstead.io subdomain and onboard to github-repo-factory

## Clarifications

### Session 2026-04-04

- Q: Should the old install script URL (`thingstead.io/tilde/install.sh`) redirect to the new URL, or is updating only the landing page sufficient? → A: Tilde serves a redirect at the old path via a `_redirects` file in the `thingstead-tilde` project.
- Q: Should GitHub Actions secrets be provisioned at the environment level or repo level? → A: Environment-scoped — secrets remain on the `production` environment (matches current setup).
- Q: Must the `thingstead` Pages project transfer complete before this PR merges, or can workspace decommissioning be a separate follow-up? → A: Deferred follow-up — tilde changes merge independently; workspace decommission tracked separately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tilde Site Accessible at Dedicated Subdomain (Priority: P1)

A visitor navigates to `tilde.thingstead.io` and lands on the tilde product page. The docs are accessible at `tilde.thingstead.io/docs/`. The install script URL in the landing page works correctly.

**Why this priority**: This is the core deliverable — giving tilde its own isolated deployment that doesn't conflict with the main thingstead site.

**Independent Test**: Can be fully tested by visiting `tilde.thingstead.io` and `tilde.thingstead.io/docs/` after a successful deploy, verifying the landing page loads and install script URLs are correct.

**Acceptance Scenarios**:

1. **Given** a successful deploy to `thingstead-tilde`, **When** a user visits `tilde.thingstead.io`, **Then** the tilde landing page loads without CSP errors.
2. **Given** a successful deploy, **When** a user visits `tilde.thingstead.io/docs/`, **Then** the tilde documentation loads correctly.
3. **Given** the landing page is loaded, **When** a user copies the install script URL, **Then** it references `tilde.thingstead.io/install.sh` (not `thingstead.io/tilde/install.sh`).
4. **Given** the tilde site deploys, **When** the thingstead main site also deploys, **Then** neither deployment overwrites the other's content.

---

### User Story 2 - Deploy Workflow Targets Correct Project (Priority: P2)

A developer merges a PR to the `main` branch of the tilde repo. The CI/CD pipeline automatically deploys the tilde site to the `thingstead-tilde` Cloudflare Pages project with the correct directory structure.

**Why this priority**: Ensures ongoing deployments land in the right place once infrastructure is set up.

**Independent Test**: Can be tested independently by triggering the deploy workflow and confirming it targets `thingstead-tilde` and produces the correct output structure (`dist/` for landing page, `dist/docs/` for docs).

**Acceptance Scenarios**:

1. **Given** a push to `main`, **When** the deploy workflow runs, **Then** it deploys to the `thingstead-tilde` project (not `thingstead`).
2. **Given** the build step, **When** the output is assembled, **Then** the landing page is at `dist/` root and docs are at `dist/docs/`.
3. **Given** the workflow uses Cloudflare credentials, **When** it authenticates, **Then** it uses the secrets provisioned by github-repo-factory.

---

### User Story 3 - Tilde Managed by github-repo-factory (Priority: P3)

An infrastructure operator adds tilde to the `repos.json` in github-repo-factory. After applying Terraform, the `thingstead-tilde` Cloudflare Pages project is created with the correct custom domain, and the tilde repo's GitHub secrets are provisioned automatically.

**Why this priority**: Centralises infrastructure ownership and eliminates the need for standalone Terraform in the tilde repo, but the site can function without this step initially.

**Independent Test**: Can be tested by inspecting the `repos.json` entry against the existing thingstead pattern and verifying Terraform plan output creates the expected resources.

**Acceptance Scenarios**:

1. **Given** the `tilde` entry is added to `repos.json`, **When** Terraform is applied, **Then** the `thingstead-tilde` Pages project is created with custom domain `tilde.thingstead.io`.
2. **Given** the factory manages the tilde repo, **When** Terraform is applied, **Then** GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are provisioned in the tilde repo.
3. **Given** factory management is in place, **When** the standalone `terraform/` directory is removed from the tilde repo, **Then** infrastructure state is fully owned by github-repo-factory.

---

### User Story 4 - Standalone Terraform Deprecated and State Migrated (Priority: P4)

An infrastructure operator follows the documented migration sequence: factory creates new resources first, existing live resources are either re-homed or decommissioned in the correct order, and only then is the standalone Terraform removed from the tilde repo. No live site is disrupted during the migration.

**Why this priority**: The standalone TF currently manages the shared `thingstead` Pages project (and its `thingstead.io` DNS), the `tilde` GitHub repository, branch protection, deploy secrets, and a production environment. Blindly deleting the Terraform directories without migrating or decommissioning this state would leave orphaned remote state in two Terraform Cloud workspaces (`tilde-cloudflare`, `tilde-github`) and risk accidentally destroying resources that serve `thingstead.io`.

**Independent Test**: Can be verified by confirming the Terraform Cloud workspaces `tilde-cloudflare` and `tilde-github` are decommissioned, no standalone Terraform files remain in the tilde repo, and `thingstead.io` continues to load correctly throughout.

**Acceptance Scenarios**:

1. **Given** the factory has applied and the `thingstead-tilde` project is live, **When** the standalone Terraform directories are removed, **Then** no live resource (Pages project, DNS record, secrets, branch protection) is destroyed or degraded.
2. **Given** the `tilde-cloudflare` workspace manages the shared `thingstead` Pages project and `thingstead.io` DNS, **When** this state is decommissioned, **Then** those resources are first transferred to the appropriate owner (thingstead monorepo infrastructure) — they MUST NOT be destroyed.
3. **Given** the `tilde-github` workspace manages the `tilde` repo, environments, secrets, and branch protection, **When** the factory takes over, **Then** all equivalent settings are present in the factory's output before the old workspace is decommissioned.
4. **Given** both Terraform Cloud workspaces are decommissioned, **When** a developer reads the tilde README, **Then** they find a clear deprecation notice with the migration path and a reference to github-repo-factory.

---

### User Story 5 - Terraform Cloud Workspaces Decommissioned (Priority: P5)

After all resources are migrated, an infrastructure operator deletes the `tilde-cloudflare` and `tilde-github` Terraform Cloud workspaces from the `thingstead` organization. No orphaned state remains.

**Why this priority**: Decommissioning the workspaces is the final cleanup step that prevents future drift or accidental applies against resources that are now managed elsewhere.

**Independent Test**: Can be verified in Terraform Cloud by confirming neither workspace exists in the `thingstead` organization.

**Acceptance Scenarios**:

1. **Given** all resources are migrated or re-homed, **When** both workspaces are deleted, **Then** no Terraform-managed resources are orphaned.
2. **Given** the workspaces are deleted, **When** any operator inspects Terraform Cloud, **Then** zero `tilde-*` workspaces exist in the `thingstead` organization.

---

### Edge Cases

- If the deploy workflow runs before the `thingstead-tilde` Cloudflare Pages project is created, the deploy fails with a clear error rather than silently overwriting the wrong project.
- If the `install.sh` URL update is missed in any location within `site/tilde/index.html`, users attempting to install tilde get a broken link.
- If the `_redirects` file is missing or misconfigured, existing users or scripts using the legacy path `/tilde/install.sh` will receive a 404 instead of being redirected to `install.sh`.
- If the `base` path in `astro.config.mjs` is incorrect, all docs internal links break.
- If both the tilde and thingstead deploy workflows trigger simultaneously, each must target its own separate project with no interference.
- If `speckit_enabled: true` and `copilot_enabled: true` are set in `repos.json` for an existing repo (such as `tilde`), the factory's `github-repo` module will push updated `.gitmodules` and `speckit-bootstrap.yml` files to the repo via the GitHub API (`overwrite_on_create = true`). Since the tilde repo already has these files at the same expected content, this overwrite is safe — but operators should confirm content equivalence before the factory applies.
- If the `thingstead` Cloudflare Pages project (owned by the `tilde-cloudflare` workspace) is destroyed instead of transferred, `thingstead.io` goes down — this must be treated as a critical risk in the migration sequence.
- If the new `tilde.thingstead.io` CNAME record is not added to the shared `thingstead.io` DNS zone, the custom domain will not resolve even though the Pages project exists.
- If the `tilde-github` workspace is deleted before the factory provisions equivalent branch protection and secrets, the tilde repo is left in an unprotected and non-deployable state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tilde deploy workflow MUST target the Cloudflare Pages project named `thingstead-tilde`.
- **FR-002**: The assembled site output MUST place the landing page content at the root (`dist/`) and docs content at `dist/docs/`.
- **FR-003**: The `site/docs/astro.config.mjs` MUST set `site` to `https://tilde.thingstead.io` and `base` to `/docs/`.
- **FR-004**: All install script URLs in `site/tilde/index.html` and `docs/README.md` MUST reference `tilde.thingstead.io/install.sh`. The documentation link in `docs/README.md` MUST also be updated from `thingstead.io/tilde/docs` to `tilde.thingstead.io/docs`.
- **FR-004a**: The tilde site MUST include a `_redirects` file that redirects requests for `/tilde/install.sh` to `/install.sh`, so that the legacy URL `thingstead.io/tilde/install.sh` — when served from the `thingstead-tilde` project — continues to resolve correctly for existing users.
- **FR-005**: A new, dedicated Cloudflare Pages project named `thingstead-tilde` MUST be created; it is a separate project from the existing `thingstead` project and MUST NOT share content or deployment pipeline with it.
- **FR-005a**: The `thingstead-tilde` project MUST have the custom domain `tilde.thingstead.io` configured as a subdomain within the existing `thingstead.io` DNS zone — a new CNAME record pointing to `thingstead-tilde.pages.dev` MUST be added to that zone.
- **FR-006**: The `repos.json` entry for `tilde` in github-repo-factory MUST include a `cloudflare_pages_projects` entry for `thingstead-tilde` with `custom_domain: "tilde.thingstead.io"` and `production_branch: "main"`.
- **FR-006a**: The `repos.json` entry MUST include `speckit_enabled: true`, `copilot_enabled: true`, and `git_hooks` with lefthook pre-commit and commit-msg hooks — matching the existing thingstead entry pattern.
- **FR-007**: The standalone Terraform directories (`terraform/cloudflare/` and `terraform/github/`) MUST be removed from the tilde repo as part of this feature, after the factory has taken over management of tilde's own resources. Decommissioning of the `tilde-cloudflare` and `tilde-github` Terraform Cloud workspaces (which depends on the cross-team `thingstead` resource transfer) is a **separate tracked follow-up** and is NOT a merge blocker for this PR.
- **FR-008**: The `tilde-cloudflare` Terraform Cloud workspace currently manages the shared `thingstead` Cloudflare Pages project and its `thingstead.io` DNS record; these resources MUST be transferred to the appropriate owner (thingstead monorepo infrastructure) and MUST NOT be destroyed during migration.
- **FR-009**: The `tilde-github` Terraform Cloud workspace currently manages the `tilde` GitHub repository, `production` environment, environment-scoped deploy secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_TOKEN`), and branch protection. The factory MUST provision `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as **repo-level** GitHub Actions secrets (the factory's `cloudflare.tf` uses `github_actions_secret`, which is accessible from environment-gated jobs). `GH_TOKEN` is not provisioned by the factory and MUST be re-provisioned manually or via a separate mechanism before the `tilde-github` workspace is decommissioned.
- **FR-010**: Both Terraform Cloud workspaces (`tilde-cloudflare`, `tilde-github`) in the `thingstead` organization MUST be decommissioned as a **follow-up action** after this PR merges and the `thingstead` resource transfer is coordinated with the thingstead monorepo team. This is explicitly not a merge blocker.
- **FR-011**: The tilde README MUST include a deprecation notice documenting the migration away from standalone Terraform, the migration sequence followed, and a pointer to github-repo-factory.
- **FR-012**: The thingstead main site deploy MUST continue to function correctly after all tilde changes are made (no interference).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The tilde landing page loads successfully at `tilde.thingstead.io` with no CSP errors after a completed deploy.
- **SC-002**: The tilde docs load successfully at `tilde.thingstead.io/docs/` with correct internal navigation.
- **SC-003**: The install script URL on the tilde landing page resolves to a valid resource at `tilde.thingstead.io/install.sh`.
- **SC-004**: The thingstead main site at `thingstead.io` remains fully functional after tilde's migration (zero regression).
- **SC-005**: The tilde deploy workflow completes without error when targeting the `thingstead-tilde` project.
- **SC-006**: The tilde repo contains zero standalone Terraform files after migration.
- **SC-007**: The github-repo-factory `repos.json` diff shows a single well-formed `tilde` entry that passes Terraform plan validation without errors.
- **SC-008**: Both Terraform Cloud workspaces (`tilde-cloudflare`, `tilde-github`) are deleted from the `thingstead` organization with zero orphaned resources.
- **SC-009**: `thingstead.io` remains fully accessible throughout and after the migration, confirming no accidental destruction of the shared Cloudflare Pages project or its DNS record.
- **SC-010**: The subdomain `tilde.thingstead.io` resolves correctly in DNS as a CNAME within the `thingstead.io` zone, and does not interfere with resolution of `thingstead.io` itself.

## Assumptions

- The `thingstead-tilde` Cloudflare Pages project is a brand-new project separate from the existing `thingstead` project; both projects co-exist under the same Cloudflare account and share the `thingstead.io` DNS zone, but each has its own deployment pipeline, custom domain, and content.
- The DNS record for `tilde.thingstead.io` is a new CNAME in the existing `thingstead.io` zone pointing to `thingstead-tilde.pages.dev`. The factory's Cloudflare provider has access to this zone and will manage the new record — it is distinct from the existing `thingstead.io` A/CNAME record.
- The github-repo-factory's Cloudflare provider already has access to the `thingstead.io` zone (it manages the main site's DNS) and can add the subdomain record without requiring any additional zone access configuration.
- The factory's `cloudflare.tf` automatically provisions `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as **repo-level** GitHub Actions secrets for any repo with a `cloudflare_pages_projects` entry. These are accessible from the `production` environment-gated deploy job. `GH_TOKEN` is NOT provisioned by the factory.
- The existing thingstead entry in `repos.json` serves as the canonical schema reference; the tilde entry must match its structure.
- The `install.sh` script is served as a static file from the tilde site at `/install.sh`. A `_redirects` file in the tilde site will handle the legacy path `/tilde/install.sh` → `/install.sh` so existing users are not broken.
- The `thingstead` Cloudflare Pages project and `thingstead.io` DNS record (currently owned by the `tilde-cloudflare` workspace) must be transferred to the thingstead monorepo's infrastructure management. Coordinating that transfer with the thingstead monorepo team is a prerequisite for decommissioning the `tilde-cloudflare` workspace, but the mechanics of that transfer are out of scope for this feature.
- Changes to the thingstead monorepo (removing any `tilde/` path routing or CSP overrides) are out of scope for this feature and handled separately.
- The github-repo-factory is a separate repository; the `repos.json` change is a cross-repo change that must be coordinated but is included in this feature's scope as a required deliverable.
- The migration sequence for this PR is: (1) factory applies and creates `thingstead-tilde` and tilde's GitHub resources, (2) tilde repo changes (workflow, site config, URL updates, `_redirects`, README, Terraform directory removal) are merged. Decommissioning the `tilde-cloudflare` and `tilde-github` workspaces and re-homing the shared `thingstead` Pages project are **follow-up actions** that do not block this PR.
