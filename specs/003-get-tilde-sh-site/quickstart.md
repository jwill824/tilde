# Quickstart: thingstead.io/tilde Documentation & Download Site

**Branch**: `003-get-tilde-sh-site` | **Date**: 2026-03-29

---

## What we're building

Two co-deployed static sites from a single `site/` directory:

| Site | URL | Tech |
|------|-----|------|
| Landing + install script | `thingstead.io/tilde` | Plain HTML + `install.sh` |
| Documentation | `thingstead.io/tilde/docs` | Astro 4 + Starlight |

---

## Local Development

### Landing page

```bash
# No build step — open directly in browser
open site/tilde/index.html

# Or serve locally to test install.sh path
npx serve site/tilde
# → http://localhost:3000
# → http://localhost:3000/install.sh
```

### Docs site

```bash
cd site/docs
npm install
npm run dev
# → http://localhost:4321
```

### Test install script locally

```bash
# Dry run (inspect without executing)
bash -n site/tilde/install.sh

# Full local test (uses local version of script)
bash site/tilde/install.sh
```

---

## Project Setup (first time)

```bash
# 1. Scaffold Astro + Starlight in site/docs/
npm create astro@latest site/docs -- --template starlight

# 2. Verify it builds
cd site/docs && npm run build

# 3. Add landing page files
mkdir -p site/tilde
# Create site/tilde/index.html and site/tilde/install.sh
```

---

## Deployment

Both sites deploy via GitHub Actions on push to `main`.

```yaml
# .github/workflows/deploy-site.yml (overview)
on:
  push:
    branches: [main]
    paths:
      - 'site/**'

jobs:
  deploy-landing:    # → thingstead.io/tilde via Cloudflare Pages
  deploy-docs:       # → thingstead.io/tilde/docs via Cloudflare Pages (build + deploy)
```

**Required secrets** (set in GitHub repo settings):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Adding Documentation Pages

All docs are Markdown files under `site/docs/src/content/docs/`:

```bash
# Add a new page
touch site/docs/src/content/docs/my-new-page.md
```

Add frontmatter:

```markdown
---
title: My New Page
description: What this page covers
---

Content here...
```

Starlight auto-registers the page in the sidebar based on `astro.config.mjs` nav config.

---

## Updating the Install Script

The install script at `site/tilde/install.sh` dynamically resolves the latest tilde
version at run time — **no manual version bumps needed**.

To test a specific version locally:

```bash
TILDE_VERSION=1.2.0 bash site/tilde/install.sh
```

---

## Acceptance Test (CI smoke test)

```bash
# Verify docs site builds without errors
cd site/docs && npm run build && echo "✓ Docs build OK"

# Verify install script is valid bash
bash -n site/tilde/install.sh && echo "✓ install.sh syntax OK"

# Verify landing page is valid HTML (optional)
npx html-validate site/tilde/index.html
```
