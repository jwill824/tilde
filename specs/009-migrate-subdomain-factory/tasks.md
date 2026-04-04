# Tasks: Migrate Tilde Site to Dedicated Subdomain and Factory Management

**Input**: Design documents from `/specs/009-migrate-subdomain-factory/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are relative to the tilde repo root unless noted as cross-repo

---

## Phase 1: Setup (Cross-Repo Factory Change)

**Purpose**: The github-repo-factory PR must land and Terraform must apply **before** any
tilde repo deploy can target the new `thingstead-tilde` project. This phase is the hard
prerequisite for all subsequent phases.

- [ ] T001 [US3] Add `tilde` entry to `repos.json` in the github-repo-factory repo following the thingstead entry pattern: include `cloudflare_pages_projects` entry for `thingstead-tilde` with `custom_domain: "tilde.thingstead.io"` and `production_branch: "main"`, a CNAME DNS record for `tilde.thingstead.io` → `thingstead-tilde.pages.dev` in the `thingstead.io` zone, `speckit_enabled: true`, `copilot_enabled: true`, and `git_hooks` with lefthook pre-commit and commit-msg hooks (cross-repo PR in github-repo-factory)

---

## Phase 2: Foundational (Blocking Gate)

**Purpose**: Verify the factory has provisioned all infrastructure before touching the tilde
repo. No user story work should proceed until this checkpoint is confirmed.

**⚠️ CRITICAL**: Do not begin Phase 3 until all items below are confirmed.

- [ ] T002 Verify github-repo-factory Terraform has applied: confirm `thingstead-tilde` Cloudflare Pages project exists in the Cloudflare dashboard, CNAME record `tilde.thingstead.io → thingstead-tilde.pages.dev` is present in the `thingstead.io` DNS zone, and secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `GH_TOKEN` exist on the `production` environment in the tilde GitHub repo (per quickstart.md Step 1)

**Checkpoint**: Infrastructure ready — tilde repo changes can now proceed

---

## Phase 3: User Story 1 — Tilde Site Accessible at Dedicated Subdomain (Priority: P1) 🎯 MVP

**Goal**: The landing page loads at `tilde.thingstead.io`, docs at `tilde.thingstead.io/docs/`,
and the install script URL is correct. The legacy install URL redirects correctly.

**Independent Test**: Visit `tilde.thingstead.io` (landing page), `tilde.thingstead.io/docs/`
(docs), and `curl -I tilde.thingstead.io/tilde/install.sh` (legacy redirect → 301).

### Implementation for User Story 1

- [ ] T003 [P] [US1] Update `site/docs/astro.config.mjs`: set `site` to `https://tilde.thingstead.io` and `base` to `/docs/` (currently `https://thingstead.io` and `/tilde/docs/`)
- [ ] T004 [P] [US1] Replace both occurrences of `https://thingstead.io/tilde/install.sh` with `https://tilde.thingstead.io/install.sh` in `site/tilde/index.html` (lines 40 and 65)
- [ ] T005 [P] [US1] Create `site/tilde/_redirects` with the single redirect rule: `/tilde/install.sh /install.sh 301` to preserve the legacy install URL for existing users
- [ ] T006 [P] [US1] Update the install command URL in `docs/README.md` from `https://thingstead.io/tilde/install.sh` to `https://tilde.thingstead.io/install.sh`

**Checkpoint**: At this point, site content, config, redirect, and README are correct.
Pending deploy workflow update (Phase 4) to ship.

---

## Phase 4: User Story 2 — Deploy Workflow Targets Correct Project (Priority: P2)

**Goal**: CI/CD deploys to `thingstead-tilde` with the correct output structure
(`dist/` for landing page, `dist/docs/` for docs).

**Independent Test**: Trigger a workflow run on `main`; confirm the Pages deploy step targets
`thingstead-tilde` and the Cloudflare dashboard shows a new deployment on that project.

### Implementation for User Story 2

- [ ] T007 [US2] Update `.github/workflows/deploy-site.yml` job name from `Build & Deploy (thingstead.io)` to `Build & Deploy (tilde.thingstead.io)`
- [ ] T008 [US2] Update `.github/workflows/deploy-site.yml` assemble step: replace the three lines that write to `dist/tilde/` with `mkdir -p dist/docs`, `cp -r site/tilde/. dist/`, and `cp -r site/docs/dist/. dist/docs/` so the landing page is at root and docs are at `dist/docs/`
- [ ] T009 [US2] Update `.github/workflows/deploy-site.yml` deploy command: change `--project-name=thingstead` to `--project-name=thingstead-tilde` in the `wrangler-action` step

**Checkpoint**: All tilde repo changes for US1 and US2 are complete. Merge this branch to
trigger the first deploy to `thingstead-tilde`.

---

## Phase 5: User Story 4 — Standalone Terraform Deprecated (Priority: P4)

**Goal**: No Terraform files remain in the tilde repo. The README documents the migration.

**Independent Test**: `ls terraform/` returns "No such file or directory". README contains
a deprecation notice linking to github-repo-factory.

> **Note**: US4 is included in this PR. Workspace decommissioning (US5) is a tracked
> follow-up — see T018 in the final phase.

### Implementation for User Story 4

- [ ] T010 [P] [US4] Remove the `terraform/cloudflare/` directory from the tilde repo (deletes `main.tf`, `outputs.tf`, `variables.tf`, `.terraform.lock.hcl`, and the `.terraform/` provider cache)
- [ ] T011 [P] [US4] Remove the `terraform/github/` directory from the tilde repo (deletes `main.tf`, `outputs.tf`, `variables.tf`, `.terraform.lock.hcl`, and the `.terraform/` provider cache)
- [ ] T012 [US4] Add a Terraform deprecation notice to `docs/README.md`: note that infrastructure is no longer managed by standalone Terraform in this repo, that it is now managed by github-repo-factory, and reference the migration sequence from `specs/009-migrate-subdomain-factory/quickstart.md`

**Checkpoint**: Terraform directories removed. README deprecation notice in place.

---

## Final Phase: Verification & Follow-up Tracking

**Purpose**: Confirm the full migration is working end-to-end and create the tracked
follow-up issue for workspace decommissioning (US5).

- [ ] T013 [P] Verify `tilde.thingstead.io` loads the tilde landing page with no CSP errors and no console errors in the browser
- [ ] T014 [P] Verify `tilde.thingstead.io/docs/` loads the Starlight docs site with correct internal navigation (sidebar links work, no broken 404s)
- [ ] T015 [P] Verify `curl -fsSL https://tilde.thingstead.io/install.sh` downloads the install script with `Content-Type: text/plain; charset=utf-8`
- [ ] T016 [P] Verify `curl -I https://tilde.thingstead.io/tilde/install.sh` returns `HTTP 301` with `Location: /install.sh` (legacy redirect working)
- [ ] T017 [P] Verify `https://thingstead.io` (main thingstead site) is fully accessible and unaffected by the migration (regression check)
- [ ] T018 [US5] Create a GitHub issue in the tilde repo to track workspace decommissioning: title "Follow-up: Decommission tilde-cloudflare and tilde-github Terraform Cloud workspaces", noting the prerequisite cross-team `thingstead` Pages project transfer and referencing quickstart.md Step 4

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Factory PR)**: No tilde repo dependencies — can open immediately
- **Phase 2 (Gate check)**: Depends on Phase 1 Terraform applying — **BLOCKS all tilde repo changes**
- **Phase 3 (US1)**: Depends on Phase 2 confirmation — T003, T004, T005, T006 all independent of each other [P]
- **Phase 4 (US2)**: Depends on Phase 2 confirmation — T007, T008, T009 must be sequential (same file)
- **Phase 5 (US4)**: Depends on Phase 2 confirmation — T010, T011 are independent [P]; T012 depends on nothing
- **Final Phase**: Depends on merge + successful deploy (T013–T017 parallel; T018 standalone)

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US3 (T001) | Nothing | Open factory PR first |
| US1 (T003–T006) | Phase 2 gate | All four tasks fully parallel |
| US2 (T007–T009) | Phase 2 gate | Sequential (same file) |
| US4 (T010–T012) | Phase 2 gate | T010/T011 parallel, T012 sequential |
| US5 (T018) | Merge + deploy | Tracked follow-up issue only |

### Parallel Opportunities

Within Phase 3 (US1): T003, T004, T005, T006 — all different files, all independent  
Within Phase 5 (US4): T010, T011 — different directories  
Across phases: Phases 3, 4, and 5 can be worked in any order after Phase 2 completes  
Final verification: T013–T017 are all fully parallel read-only checks

---

## Parallel Example: User Story 1 (Phase 3)

```
# All four tasks can be executed simultaneously:
Task: "Update site/docs/astro.config.mjs (site + base)" [T003]
Task: "Update install URLs in site/tilde/index.html" [T004]
Task: "Create site/tilde/_redirects" [T005]
Task: "Update install URL in docs/README.md" [T006]
```

---

## Implementation Strategy

### MVP Scope (US1 + US2 — the core deliverable)

1. Complete Phase 1: Open factory PR (T001)
2. Complete Phase 2: Confirm Terraform applied (T002)
3. Complete Phase 3: US1 site content changes (T003–T006)
4. Complete Phase 4: US2 deploy workflow changes (T007–T009)
5. **Merge to `main`** → auto-deploy triggers
6. Verify with T013–T017

### Full Scope (add US4 + US5 tracking)

7. Complete Phase 5: Remove Terraform + README notice (T010–T012)
8. Create follow-up issue: T018

### Notes

- T001 is in the github-repo-factory repo — open that PR and get it merged before touching anything in the tilde repo
- T002 is a verification gate — do not skip it; a failed deploy to a non-existent Pages project will fail silently in some configurations
- T003–T006 are fully parallelizable and can all be committed together in a single logical commit
- T007–T009 are all edits to the same file — do them sequentially in one commit
- T010–T011 are `git rm -r` operations; confirm the `.terraform/` provider cache directories are also removed (they are gitignored but the `git rm -r` will handle tracked files)
- After T010–T011, verify `terraform/` directory no longer appears in `git status`
