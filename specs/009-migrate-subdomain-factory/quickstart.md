# Migration Runbook: Tilde Subdomain Migration

**Branch**: `009-migrate-subdomain-factory` | **Date**: 2026-04-04

This document describes the safe sequence for executing the migration. Follow steps in
order to avoid service interruption.

---

## Pre-flight Checklist

Before merging or applying anything:

- [ ] Confirm `thingstead.io` is currently live and accessible
- [ ] Confirm the github-repo-factory PR is ready and reviewed
- [ ] Confirm no tilde deploy is in-flight (check GitHub Actions)

---

## Step 1: Apply github-repo-factory (Cross-Repo PR)

**Repo**: `github-repo-factory`  
**Action**: Merge the PR that adds the `tilde` entry to `repos.json`

After Terraform applies, verify:
- [ ] `thingstead-tilde` Cloudflare Pages project exists in the Cloudflare dashboard
- [ ] Custom domain `tilde.thingstead.io` is configured on the project
- [ ] CNAME record `tilde.thingstead.io → thingstead-tilde.pages.dev` exists in the `thingstead.io` DNS zone
- [ ] GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_TOKEN` exist on the `production` environment in the tilde repo

---

## Step 2: Merge This PR (tilde repo)

**Repo**: `tilde`  
**Action**: Merge `009-migrate-subdomain-factory`

Changes included:
- `.github/workflows/deploy-site.yml` — targets `thingstead-tilde`, new output structure
- `site/docs/astro.config.mjs` — updated `site` and `base`
- `site/tilde/index.html` — updated install URLs
- `site/tilde/_redirects` — new legacy redirect
- `docs/README.md` — updated install URL + deprecation notice
- `terraform/` — removed

The merge to `main` will automatically trigger the deploy workflow.

---

## Step 3: Verify Deploy

After the deploy workflow completes:

| Check | URL | Expected |
|-------|-----|----------|
| Landing page | `https://tilde.thingstead.io` | Tilde landing page loads, no CSP errors |
| Docs | `https://tilde.thingstead.io/docs/` | Docs load, internal links work |
| Install script (new URL) | `https://tilde.thingstead.io/install.sh` | Downloads `install.sh` with `Content-Type: text/plain` |
| Install script (legacy redirect) | `https://tilde.thingstead.io/tilde/install.sh` | 301 redirect → `/install.sh` |
| Main site (regression) | `https://thingstead.io` | Main thingstead site unaffected |
| README install command | `curl -fsSL https://tilde.thingstead.io/install.sh \| bash` | Executes successfully |

---

## Step 4 (Follow-up): Terraform Cloud Workspace Decommissioning

> **This is NOT a merge blocker.** Track as a separate issue.

Prerequisites:
- Coordinate with thingstead monorepo team to import/re-home the `thingstead` Cloudflare
  Pages project and `thingstead.io` DNS record into their infrastructure management.

Once the `thingstead` resources are re-homed:
1. Delete the `tilde-cloudflare` workspace from Terraform Cloud (`thingstead` org)
2. Delete the `tilde-github` workspace from Terraform Cloud (`thingstead` org)

Verify:
- [ ] Zero `tilde-*` workspaces exist in the `thingstead` Terraform Cloud organization
- [ ] `thingstead.io` remains live after workspace deletion

---

## Rollback Plan

If the deploy to `thingstead-tilde` fails or `tilde.thingstead.io` is inaccessible:

1. Re-deploy the previous build manually via Cloudflare Pages dashboard (rollback to last deployment)
2. The `thingstead` project is untouched — `thingstead.io` is unaffected
3. Fix the issue in a follow-up commit to `main`; the workflow will auto-redeploy

> The old `thingstead` project and its content are not modified by this migration, so
> there is no risk of breaking `thingstead.io` by rolling back the tilde deploy.
