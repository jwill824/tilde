# Research: Migrate Tilde Site to Dedicated Subdomain and Factory Management

**Branch**: `009-migrate-subdomain-factory` | **Date**: 2026-04-04

## Summary

No significant unknowns requiring external research. All technical decisions were resolved
during the specification and clarification phases. This document records the decisions and
their rationale for planning traceability.

---

## Decision 1: `_redirects` File for Legacy Install URL

**Decision**: Add a `_redirects` file to `site/tilde/` with the rule:
```
/tilde/install.sh /install.sh 301
```

**Rationale**: Cloudflare Pages natively supports `_redirects` files (same format as
Netlify). The file is placed in the root of the deployed site — in this case, `site/tilde/`
(which becomes `dist/` after assembly). A 301 (permanent) redirect signals to clients and
crawlers that the URL has moved. This keeps the tilde repo self-contained for redirect
management without requiring the thingstead monorepo team to configure anything.

**Alternatives considered**:
- Require thingstead monorepo to add a redirect for the old path — rejected because it
  creates a cross-team dependency and the redirect logic belongs with the tilde site.
- Use `_headers` file with a Location header — rejected because Cloudflare Pages `_redirects`
  is the canonical, purpose-built mechanism.

---

## Decision 2: Deploy Output Structure

**Decision**: Assemble build output as:
- Landing page files → `dist/` (root)
- Docs site → `dist/docs/`

**Current** (old structure): `dist/tilde/` and `dist/tilde/docs/`  
**New** structure: `dist/` and `dist/docs/`

**Rationale**: The new subdomain `tilde.thingstead.io` is the site root, so the landing
page should be served from `/` and docs from `/docs/`. The old structure put everything
under `/tilde/` because it was sharing a project with the main thingstead site.

**Assemble step diff**:
```yaml
# OLD
mkdir -p dist/tilde/docs
cp -r site/tilde/. dist/tilde/
cp -r site/docs/dist/. dist/tilde/docs/

# NEW
mkdir -p dist/docs
cp -r site/tilde/. dist/
cp -r site/docs/dist/. dist/docs/
```

---

## Decision 3: Astro Config Updates

**Decision**:
- `site`: `https://tilde.thingstead.io` (was `https://thingstead.io`)
- `base`: `/docs/` (was `/tilde/docs/`)

**Rationale**: `site` is used for canonical URLs and sitemap generation. `base` is the
URL prefix for all internal Astro/Starlight links. Both must match the new subdomain and
path structure, or all internal docs links will be broken.

---

## Decision 4: Environment-Scoped Secrets

**Decision**: GitHub Actions secrets remain scoped to the `production` environment
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GH_TOKEN`).

**Rationale**: Matches the current `tilde-github` Terraform workspace setup. The deploy
workflow already gates on `environment: production` for `main` branch pushes. Keeping
secrets at environment scope limits exposure and avoids any workflow changes beyond the
project name update.

---

## Decision 5: Workspace Decommissioning is a Follow-Up

**Decision**: The `tilde-cloudflare` and `tilde-github` Terraform Cloud workspaces are
decommissioned as a tracked follow-up, not a merge blocker.

**Rationale**: The `tilde-cloudflare` workspace manages the shared `thingstead` Pages
project and `thingstead.io` DNS — resources that belong to the thingstead monorepo team.
Waiting for that cross-team transfer before merging would indefinitely block delivery.
The tilde repo's standalone Terraform directories are removed in this PR, eliminating the
risk of accidental applies. The workspace decommissioning is safe to defer.

---

## Decision 6: github-repo-factory `repos.json` Entry

**Decision**: Add a `tilde` entry to `repos.json` in the github-repo-factory repo,
following the existing thingstead entry as the schema reference. The entry must include:
- `cloudflare_pages_projects`: one entry for `thingstead-tilde` with
  `custom_domain: "tilde.thingstead.io"`, `production_branch: "main"`
- DNS CNAME record for `tilde.thingstead.io` in the `thingstead.io` zone
- `speckit_enabled: true`
- `copilot_enabled: true`
- `git_hooks`: lefthook with pre-commit and commit-msg hooks

**Rationale**: github-repo-factory already manages the thingstead repo and its Cloudflare
Pages project. Onboarding tilde follows the same pattern, centralising all infrastructure
ownership and eliminating the need for standalone Terraform in the tilde repo.

**Note**: The exact JSON shape must be confirmed against the current thingstead entry in
`repos.json` at implementation time. The factory's `cloudflare.tf` handles DNS record
creation for repos with `cloudflare_pages_projects` entries.
