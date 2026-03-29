# Research: thingstead.io/tilde Documentation & Download Site

**Branch**: `003-get-tilde-sh-site` | **Date**: 2026-03-29
**Status**: Complete — all NEEDS CLARIFICATION resolved

## 1. Docs Site Framework

**Decision**: Astro 4 + Starlight

**Rationale**:
- Starlight is purpose-built for CLI tool documentation (sidebar, search, dark mode,
  code blocks, mobile-responsive — all built in, zero config)
- Ships near-zero JavaScript to the browser (Islands Architecture); fastest page loads
  of any docs SSG in 2024–2025 benchmarks
- Framework-agnostic: no Vue/React dependency mismatch with the TypeScript/Node.js
  tilde codebase
- Used by a growing number of modern CLI tools; strong community momentum
- Markdown-first authoring (FR-018); MDX supported for interactive components later

**Alternatives considered**:
- VitePress: Vue-dependent; tilde is not a Vue project — introduces unnecessary coupling
- Docusaurus: React-based (compatible), but heavier bundle and overbuilt for current
  doc scope; better suited once docs scale to 50+ pages
- MkDocs: Python-based; awkward in a Node.js monorepo; requires separate Python toolchain
- Plain HTML: Insufficient for full docs site (no search, no sidebar, high maintenance)

**References**: docs.astral.sh/uv (MkDocs+Material), vfox.lmk.sh (VitePress),
brew.sh (Jekyll), react.dev (Next.js custom)

---

## 2. Landing Page Technology

**Decision**: Plain semantic HTML + Tailwind CSS CDN (no build step)

**Rationale**:
- FR-010 requires core content visible without JavaScript — plain HTML satisfies this
  trivially
- No build step means faster iteration and zero dependency on Node.js for the landing
  page itself
- Tailwind CDN provides enough styling utility for a minimal, polished page
- The landing page is intentionally simple: one-liner, description, install methods,
  link to docs. It doesn't need a framework.

**Alternatives considered**:
- Astro page in same project as docs: cleaner monorepo but adds Astro build dependency
  to the landing page; harder to serve `install.sh` alongside
- React/Next.js: complete overkill for a static marketing page

---

## 3. Hosting & Deployment

**Decision**: Cloudflare Pages (single project: `thingstead`, path-based routing)

**Rationale**:
- Free tier supports unlimited bandwidth for static sites
- Custom domain `thingstead.io` with automatic HTTPS
- Global CDN ensures fast loads worldwide without configuration
- Single project scales to future tools (`thingstead.io/ordrctrl`, etc.) with zero new DNS
- Unlike two-project approach, no per-subdomain CF project management needed

**Alternatives considered**:
- GitHub Pages: No `_headers` support — can't set `Content-Type: text/plain` on `install.sh`, which breaks `curl | bash`
- Vercel: Paid plan required for multiple projects from one repo; overkill for static
- Netlify: Viable alternative; Cloudflare Pages preferred for CDN performance and cost

**DNS setup**:
- `thingstead.io` → CNAME → `thingstead.pages.dev` (single record, proxied)

---

## 4. Install Script: Version Resolution

**Decision**: Resolve latest version dynamically at install time via
`npm view @jwill824/tilde version`

**Rationale**:
- FR-006 requires latest stable at run time (no hardcoded version)
- `npm view @jwill824/tilde version` returns the `latest` dist-tag — the canonical
  "stable release" — without requiring authentication or special access
- The existing `bootstrap.sh` already uses `npx --yes tilde@latest` which is equivalent
  but less explicit; the new script will capture the version for display and checksum
  verification

**Implementation sketch**:
```bash
TILDE_VERSION=$(npm view @jwill824/tilde version 2>/dev/null)
if [[ -z "$TILDE_VERSION" ]]; then
  abort "Could not resolve tilde version from npm registry. Check your internet connection."
fi
```

**Fallback**: If npm registry is unavailable, abort with message directing user to
`npx @jwill824/tilde` directly (per FR-005, US5 scenario 2).

---

## 5. Install Script: SHA-256 Integrity Verification

**Decision**: Verify `npm pack` tarball integrity using npm registry's published
`dist.integrity` field (sha512) via `openssl dgst`

**Rationale**:
- npm registry publishes a `dist.integrity` field for every package version
  (format: `sha512-<base64>`). This is the same hash npm itself verifies during install.
- Querying it: `npm view @jwill824/tilde@$VERSION dist.integrity`
- Comparing: download the tarball, compute sha512, compare to registry value
- This approach requires no separate checksum file to publish or maintain
- FR-005a requires abort + cleanup on mismatch; this is straightforward in bash

**Implementation sketch**:
```bash
EXPECTED=$(npm view "@jwill824/tilde@${TILDE_VERSION}" dist.integrity)
# npm install verifies integrity automatically when run with --prefer-offline false
# For additional belt-and-suspenders, verify npm's own audit:
npm install -g "@jwill824/tilde@${TILDE_VERSION}" --dry-run  # audit step
```

**Note**: `npm install -g` inherently verifies the tarball against `dist.integrity`
before installation. The script can additionally confirm this explicitly by checking
npm's exit code and audit output rather than duplicating hash computation in bash.

---

## 6. Install Script: Interactive Package Manager Prompt

**Decision**: Prompt user with a numbered selection menu before any installation begins

**Rationale**:
- Principle I (Configuration-First): no package manager assumed or silently installed
- The existing `bootstrap.sh` silently installs Homebrew — this violates Configuration-
  First when used as the canonical install script
- The prompt mirrors what tilde itself does: ask first, act second

**macOS options presented**:
1. Homebrew (recommended) — installs system packages + GUI apps; required for full
   tilde wizard functionality
2. Skip — user already has a package manager or will manage Node.js manually

**Linux options presented**:
1. apt (Debian/Ubuntu)
2. dnf (Fedora/RHEL)
3. pacman (Arch)
4. Skip

**After PM selection**: install Node.js 20+ via the chosen PM if not already present,
then `npm install -g @jwill824/tilde@<version>`.

---

## 7. Docs Content: Configuration Reference Source

**Decision**: Hand-authored Markdown sourced from Zod schema inspection; not
auto-generated in this iteration

**Rationale**:
- The Zod schema in `src/config/schema.ts` is the authoritative source of truth
- Auto-generation (e.g., zod-to-markdown) adds tooling complexity not justified yet
- For the initial docs, a well-structured hand-authored `config-reference.md` drawn
  from the schema is faster to ship and easier to read
- Future: add `zod-to-openapi` or custom zod-doc script once schema stabilizes

---

## 8. CI/CD Workflow

**Decision**: Single GitHub Actions workflow (`deploy-site.yml`) with one job

**Job — Build & deploy** (`thingstead.io`):
- Trigger: push to `main`, paths `site/**`
- Steps: `npm ci` in `site/docs/`, `npm run build`, assemble `dist/tilde/` from `site/tilde/` + `site/docs/dist/`
- Action: `cloudflare/wrangler-action@v3` running `wrangler pages deploy dist --project-name=thingstead`
- Auto-creates the CF Pages project `thingstead` on first run
- `gitHubToken` enables deployment status comments on PRs
