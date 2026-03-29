---
description: "Task list for feature 003-get-tilde-sh-site"
---

# Tasks: thingstead.io/tilde Documentation & Download Site

**Input**: Design documents from `/specs/003-get-tilde-sh-site/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Branch**: `003-get-tilde-sh-site`

**Tests**: Not included (no TDD requested for this feature).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5, maps to spec.md)
- All file paths are relative to the repo root (`/Users/jeff.williams/Developer/personal/tilde`)

---

## Phase 1: Setup (Repo Structure & Scaffolding)

**Purpose**: Create the `site/` directory layout and scaffold the Astro + Starlight docs project. No user story tasks can start until the directory structure and scaffold exist.

- [X] T001 [P] Create site/tilde/ directory in repo root: `mkdir -p site/tilde` (empty dir for landing page + install script)
- [X] T002 [P] Scaffold Astro + Starlight docs project in site/docs/ using `npm create astro@latest site/docs -- --template starlight` and accept all defaults; verify `site/docs/package.json`, `site/docs/astro.config.mjs`, `site/docs/src/content/docs/` are created
- [X] T003 [P] Update root `.gitignore` to exclude `site/docs/node_modules/`, `site/docs/dist/`, and `site/docs/.astro/`

**Checkpoint**: `site/tilde/` exists, `site/docs/` scaffolded and builds with `cd site/docs && npm install && npm run build`

---

## Phase 2: Foundational (Docs Site Configuration)

**Purpose**: Configure the Astro + Starlight project with tilde branding and the full sidebar nav structure. All documentation user stories (US3, US4) depend on this phase being complete.

**⚠️ CRITICAL**: No docs content tasks (US3, US4) can begin until the Starlight config and nav are established.

- [X] T004 Configure `site/docs/astro.config.mjs` with: site title (`tilde`), description, logo referencing `./src/assets/tilde-logo.svg`, and full sidebar nav structure — four entries: `Installation` → `/installation/`, `Getting Started` → `/getting-started/`, `Configuration Reference` → `/config-reference/`; social GitHub link to `https://github.com/jwill824/tilde`
- [X] T005 [P] Add `site/docs/src/assets/tilde-logo.svg` — minimal SVG wordmark or icon for the tilde project (used in Starlight header via `logo.src` in astro.config.mjs)
- [X] T006 [P] Remove Astro Starlight scaffold placeholder content from `site/docs/src/content/docs/`: delete the generated example pages (e.g., `guides/`, `reference/`), keep only `src/content/docs/` directory and `src/content/config.ts`

**Checkpoint**: `cd site/docs && npm run build` succeeds with tilde branding and correct sidebar nav; no placeholder content remains

---

## Phase 3: User Story 1 — Zero-Prereq Curl Install (Priority: P1) 🎯 MVP

**Goal**: A developer on a fresh macOS machine can run `curl -fsSL https://thingstead.io/tilde/install.sh | bash` and have tilde fully installed and launched — no prior tooling required.

**Independent Test**: Run `bash -n site/tilde/install.sh` (syntax check passes). Full acceptance: on a clean macOS VM, run the script and confirm tilde launches successfully; verify idempotency by running again on a machine with Node.js already present.

### Implementation for User Story 1

- [X] T007 [US1] Create `site/tilde/install.sh` base structure: shebang `#!/usr/bin/env bash`, `set -euo pipefail`, color constants (`BOLD`, `GREEN`, `YELLOW`, `RED`, `CYAN`, `RESET`), and helper functions `info()`, `success()`, `warn()`, `error()`, `abort()` — adapted from repo root `bootstrap.sh`; add banner `tilde 🌿 — macOS Developer Environment Setup`
- [X] T008 [US1] Implement OS detection block in `site/tilde/install.sh`: detect `uname -s` as `Darwin` or `Linux`; abort with `"tilde requires macOS or Linux. Windows support is coming — install via: npx @jwill824/tilde"` on any other OS; store `ARCH=$(uname -m)` for later use
- [X] T009 [US1] Implement macOS Xcode Command Line Tools check in `site/tilde/install.sh`: if `xcode-select -p` fails, run `xcode-select --install`, print `"Please complete the Xcode CLT install prompt, then re-run this script."`, and `exit 0` (not a failure — user must re-run after CLT installs)
- [X] T010 [US1] Implement interactive package manager selection prompt in `site/tilde/install.sh` per `contracts/install-script.md`: macOS presents `1) Homebrew (recommended)` / `2) Skip`; Linux presents `1) apt` / `2) dnf` / `3) pacman` / `4) Skip`; default is `1`; in non-interactive environments (`CI=true` or no TTY detected via `[ -t 0 ]`), auto-select default without prompting and warn to stdout; re-prompt once on invalid input then abort
- [X] T011 [US1] Implement package manager installation block in `site/tilde/install.sh`: if Homebrew is selected and `command -v brew` fails, install Homebrew via its official one-liner (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`) and add to PATH via `eval "$(/opt/homebrew/bin/brew shellenv)"` for arm64 or `eval "$(/usr/local/bin/brew shellenv)"` for x86_64; if already present, log `✓ Homebrew found`; add Linux PM skeleton (apt/dnf/pacman install of `nodejs`) with `warn "Linux support is experimental"`
- [X] T012 [US1] Implement Node.js 20+ detection and installation in `site/tilde/install.sh`: define `check_node()` that returns 0 only if `node --version` major ≥ 20 (adapted from `bootstrap.sh`); if check passes, log `✓ Node.js found: vX.Y.Z` and skip install; if not, install via selected PM (`brew install node` for Homebrew); abort if node still not found after install attempt
- [X] T013 [US1] Implement tilde global install step in `site/tilde/install.sh`: run `npm install -g "@jwill824/tilde@latest"` (placeholder — will be replaced with dynamic version in US5); log `→ Installing tilde…` before and `✓ tilde installed` after; on npm failure abort with cleanup (see T015)
- [X] T014 [US1] Implement tilde launch step and success flow in `site/tilde/install.sh`: after successful install, log `✓ Setup complete — launching tilde…`, then exec `tilde`; the script exits with code 0 only if tilde exits 0; add Windows stub at top of file (before OS check): `if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then abort "Windows not supported. Install via: npm install -g @jwill824/tilde"; fi`
- [X] T015 [US1] Implement error handling and cleanup contract in `site/tilde/install.sh` per `contracts/install-script.md`: all fatal errors go through `abort()` (prints to stderr, `exit 1`); on npm install failure, run `npm cache clean --force` and remove any partially written global node_modules entry; do NOT remove pre-existing Homebrew or Node.js; define a `cleanup()` trap on `ERR` and `EXIT` that only runs cleanup if `INSTALL_STARTED=true` flag is set; `chmod +x site/tilde/install.sh`

**Checkpoint**: `bash -n site/tilde/install.sh` passes; script is idempotent — running twice on a machine with Node.js 20+ skips prereqs and reaches tilde install step

---

## Phase 4: User Story 2 — Landing Page with Install Options (Priority: P2)

**Goal**: A developer visiting `https://thingstead.io/tilde` in a browser immediately sees the curl one-liner, understands what tilde does, can find all install methods, and links to the docs — all above the fold on desktop, without requiring JavaScript.

**Independent Test**: Open `site/tilde/index.html` directly in a browser (no server needed). Verify: curl one-liner is visible above the fold on a 1280×800 viewport, all three install methods are visible, the docs link resolves, and core content is readable on a 375px (mobile) viewport without horizontal scrolling.

### Implementation for User Story 2

- [X] T016 [US2] Create `site/tilde/index.html` scaffold: `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with Tailwind CSS CDN (`<script src="https://cdn.tailwindcss.com"></script>`), `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`, `<title>tilde — macOS developer environment, one command away</title>`, `<meta name="description" content="...">`, and empty `<body class="bg-gray-950 text-gray-100 font-mono">`
- [X] T017 [US2] Add hero section to `site/tilde/index.html`: centered `<main>` with tilde wordmark/heading, one-sentence description (`"tilde configures your entire macOS developer environment from a single config file"`), and the curl one-liner in a `<pre><code>` block styled with a dark background and copy affordance; curl command: `curl -fsSL https://thingstead.io/tilde/install.sh | bash`
- [X] T018 [US2] Add install methods section to `site/tilde/index.html`: three method entries (curl — macOS/Linux recommended, `npx @jwill824/tilde` — all platforms, `npm install -g @jwill824/tilde` — all platforms), each as a distinct code block with a method label and platform badge; per `contracts/site-routes.md` and FR-009
- [X] T019 [US2] Add footer/navigation links section to `site/tilde/index.html`: prominent `"Read the docs →"` link to `https://thingstead.io/tilde/docs/getting-started/`, and GitHub repo link to `https://github.com/jwill824/tilde`; both are `<a>` tags (no JS required)
- [X] T020 [US2] Apply Tailwind CSS responsive classes to `site/tilde/index.html` for mobile layout: `max-w-2xl mx-auto px-4` on the main container, `overflow-x-auto` on code blocks, minimum `text-sm` on mobile for legibility; verify no horizontal scroll on 375px viewport (FR-010, SC-007)

**Checkpoint**: `open site/tilde/index.html` in browser — curl command visible above fold at 1280×800, mobile layout correct at 375px, all install methods present, docs link present, no JS required for core content

---

## Phase 5: User Story 3 — Getting Started Documentation (Priority: P3)

**Goal**: A developer who just installed tilde can visit `thingstead.io/tilde/docs` and complete their first wizard run — or evaluate tilde before installing — using only the Getting Started page. Common failure scenarios have troubleshooting guidance.

**Independent Test**: Run `cd site/docs && npm run dev`, navigate to `http://localhost:4321/getting-started/`. A first-time user can follow the page alone to install tilde, launch the wizard, and understand the expected output. Troubleshooting section addresses top 3 failure scenarios.

### Implementation for User Story 3

- [X] T021 [P] [US3] Create `site/docs/src/content/docs/index.mdx`: docs home page with frontmatter (`title: Welcome to tilde`, `description: tilde configures your macOS developer environment from a single config file`, `template: splash`), hero block with tagline and two CTAs (`Getting Started` → `/getting-started/` and `Installation` → `/installation/`), and a brief feature overview (config-first, idempotent, extensible)
- [X] T022 [P] [US3] Create `site/docs/src/content/docs/installation.md`: frontmatter (`title: Installation`, `description: All supported ways to install tilde`); sections: `curl (Recommended)` with full curl one-liner + link to `thingstead.io/tilde`, `npm` global install command, `npx` (no install required), `What happens during install` (links back to install script walkthrough); platform notes (macOS primary, Linux experimental, Windows not supported); per FR-013 and `contracts/site-routes.md`
- [X] T023 [US3] Create `site/docs/src/content/docs/getting-started.md`: frontmatter (`title: Getting Started`, `description: Run tilde for the first time`); sections: `Prerequisites` (Node.js 20+, macOS), `Launch tilde` (command: `tilde`), `The setup wizard` (step-by-step of what the wizard asks — shell selection, package manager, version manager, languages, workspace, git identity, accounts, tools, secrets, browsers), `Expected output` (example terminal screenshot/code block), `Troubleshooting` (top 3 common failures: Node.js not found, permission errors on npm global install, wizard exits unexpectedly); per FR-011 and SC-001

**Checkpoint**: `cd site/docs && npm run build` succeeds; all three pages (`/`, `/installation/`, `/getting-started/`) appear in sidebar nav; getting-started page has troubleshooting section

---

## Phase 6: User Story 4 — Configuration Reference (Priority: P4)

**Goal**: A developer can locate the documentation for any `tilde.config.json` key (e.g., `versionManager`) within 60 seconds using `thingstead.io/tilde/docs`'s built-in Starlight search, and find its type, valid values, default, and an example.

**Independent Test**: Run `cd site/docs && npm run dev`, use the search bar to look up `versionManager`. Result should open `config-reference.md` and the key should be findable within one page-search (Cmd+F). All 12 top-level keys from `data-model.md` must be documented.

### Implementation for User Story 4

- [X] T024 [US4] Create `site/docs/src/content/docs/config-reference.md`: frontmatter (`title: Configuration Reference`, `description: Complete reference for tilde.config.json`); intro paragraph explaining the config file location and format; then a full reference section for all 12 top-level `tilde.config.json` keys listed in `specs/003-get-tilde-sh-site/data-model.md` — `schemaVersion`, `os`, `shell`, `packageManager`, `versionManager`, `languages`, `workspace`, `git`, `accounts`, `tools`, `secrets`, `browsers` — each documented as a level-3 heading with: **Type** (string/object/array), **Required** (yes/no), **Valid values** (enumerated), **Default** (value or none), **Description** (plain English), **Example** (fenced JSON code block), **Since** (tilde version); source key shapes from `src/config/schema.ts` in repo root; per FR-012 and `data-model.md` ConfigEntry model

**Checkpoint**: `cd site/docs && npm run build` succeeds; config-reference page renders all 12 keys; Starlight full-text search indexes the page (built-in, no config needed)

---

## Phase 7: User Story 5 — Version-Accurate Install (Priority: P5)

**Goal**: The install script always installs the latest stable published version of tilde at run time — without any manual site update — by resolving the version from the npm registry dynamically.

**Independent Test**: In `site/tilde/install.sh`, add a `--dry-run` mode (or test directly): run `TILDE_VERSION=$(npm view @jwill824/tilde version 2>/dev/null)` and verify it returns a non-empty semver string matching the current npm latest. Then run the full script in a test environment and confirm the installed version matches `npm view @jwill824/tilde version`.

### Implementation for User Story 5

- [X] T025 [US5] Add version resolution block to `site/tilde/install.sh` immediately before the tilde install step (T013): `TILDE_VERSION=$(npm view @jwill824/tilde version 2>/dev/null)`; if `TILDE_VERSION` is empty or the command fails, abort with `"✗ Could not resolve tilde version from npm registry. Check your internet connection or install directly: npx @jwill824/tilde"` and `exit 1`; otherwise log `→ Resolved tilde v${TILDE_VERSION}` per `contracts/install-script.md` version resolution contract
- [X] T026 [US5] Update tilde install command in `site/tilde/install.sh` to use the resolved version: replace `npm install -g "@jwill824/tilde@latest"` (from T013) with `npm install -g "@jwill824/tilde@${TILDE_VERSION}"`; npm automatically verifies `dist.integrity` (sha512) during install — if integrity check fails, npm exits non-zero, abort() catches it and cleanup trap fires; log `→ Installing tilde v${TILDE_VERSION}` before and `✓ tilde v${TILDE_VERSION} installed` after; this satisfies FR-005a (integrity) and FR-006 (dynamic version) per `research.md` sections 4 and 5

**Checkpoint**: `bash -n site/tilde/install.sh` passes; `grep 'npm view' site/tilde/install.sh` returns the version resolution line; `grep '@jwill824/tilde@\${TILDE_VERSION}' site/tilde/install.sh` confirms dynamic version is used in install command; `grep '@latest' site/tilde/install.sh` returns empty (no hardcoded @latest remains)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: CI/CD deployment automation, caching headers, and final validation across all deliverables.

- [X] T027 [P] Create `.github/workflows/deploy-site.yml`: top-level `on: push: branches: [main]: paths: ['site/**']`; one job — `build-and-deploy`; both jobs `needs` nothing (run in parallel on push); add job-level `if: contains(github.event.commits[*].modified, 'site/tilde') || contains(github.event.commits[*].added, 'site/tilde')` path filtering via `dorny/paths-filter` action or similar for efficiency
- [X] T028 Deploy-landing job in `.github/workflows/deploy-site.yml`: `runs-on: ubuntu-latest`; steps: `actions/checkout@v4`, then `cloudflare/wrangler-action@v3` with `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`, `command: pages deploy dist --project-name=thingstead`, `gitHubToken: ${{ secrets.GITHUB_TOKEN }}`; no build step (landing is served as-is); per `research.md` section 8 and FR-017
- [X] T029 Build-and-deploy-docs job in `.github/workflows/deploy-site.yml`: `runs-on: ubuntu-latest`; steps: `actions/checkout@v4`, `actions/setup-node@v4` (node-version: `20`, cache: `npm`, cache-dependency-path: `site/docs/package-lock.json`), `npm ci` in `site/docs/`, `npm run build` in `site/docs/`, then `cloudflare/wrangler-action@v3` with `command: pages deploy dist --project-name=thingstead`, `directory: site/docs/dist`, `gitHubToken: ${{ secrets.GITHUB_TOKEN }}`; per `research.md` section 8 and FR-017
- [X] T030 [P] Add `_headers` file at `site/tilde/_headers` with Cloudflare Pages cache rules per `contracts/site-routes.md` caching contract: `/*` gets `Cache-Control: public, max-age=300`, `/install.sh` gets `Cache-Control: public, max-age=300, must-revalidate` and `Content-Type: text/plain; charset=utf-8` (ensures curl pipes correctly and browsers don't execute it)
- [X] T031 [P] Document required GitHub Actions secrets in `CONTRIBUTING.md` (or create `docs/deployment.md` if CONTRIBUTING.md does not exist): `CLOUDFLARE_API_TOKEN` (Cloudflare API token with Pages edit permission), `CLOUDFLARE_ACCOUNT_ID` (found in CF dashboard URL); include steps to create each Cloudflare Pages project (`thingstead` pointing to `thingstead.io/tilde`, `thingstead` pointing to `thingstead.io/tilde/docs`) and configure custom domain CNAMEs per `research.md` section 3
- [X] T032 [P] Run final validation per `quickstart.md` acceptance test: `bash -n site/tilde/install.sh` (syntax OK), `cd site/docs && npm run build` (docs build OK); fix any build errors before marking done

**Checkpoint**: CI workflow file is valid YAML (`cat .github/workflows/deploy-site.yml` lints without errors); docs build passes; install script syntax is valid; `_headers` file is present

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T002 scaffold must complete) — **BLOCKS US3 and US4**
- **US1 (Phase 3)**: Depends on Phase 1 (T001 creates `site/tilde/`) — independent of Phase 2
- **US2 (Phase 4)**: Depends on Phase 1 (T001 creates `site/tilde/`) — independent of Phase 2; independent of US1 (different files)
- **US3 (Phase 5)**: Depends on Phase 2 (astro.config.mjs + sidebar nav must be configured) — independent of US1/US2
- **US4 (Phase 6)**: Depends on Phase 2; can run concurrently with US3 (different file) — independent of US1/US2
- **US5 (Phase 7)**: Depends on US1 (amends `site/tilde/install.sh`) — must run after Phase 3 completes
- **Polish (Phase 8)**: Depends on all user stories being functionally complete

### User Story Dependencies

```
Phase 1 (Setup)
    ├── Phase 3 (US1) → Phase 7 (US5)   [install.sh chain]
    ├── Phase 4 (US2)                    [index.html — independent]
    └── Phase 2 (Foundational)
            ├── Phase 5 (US3)            [docs pages — can run in parallel with US4]
            └── Phase 6 (US4)            [config-reference — can run in parallel with US3]
                                            ↓
                                    Phase 8 (Polish/CI)
```

### Within Each User Story

- Phases 3 (US1): T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 (sequential — same file)
- Phase 4 (US2): T016 → T017 → T018 → T019 → T020 (sequential — same file)
- Phase 5 (US3): T021 [P] + T022 [P] can start simultaneously; T023 after T021/T022 are drafted (index.mdx links to getting-started)
- Phase 6 (US4): T024 (single task)
- Phase 7 (US5): T025 → T026 (sequential — same file, version resolution precedes install command)

---

## Parallel Opportunities

### After Phase 1 completes — launch in parallel:

```
Agent A: Phase 2 (Foundational) → Phase 5 (US3) → Phase 6 (US4)
Agent B: Phase 3 (US1) → Phase 7 (US5)
Agent C: Phase 4 (US2)
```

### Within Phase 1 — all three tasks in parallel:

```
Task: T001 — Create site/tilde/ directory
Task: T002 — Scaffold Astro + Starlight in site/docs/
Task: T003 — Update .gitignore
```

### Within Phase 2 — T005 and T006 parallel with T004:

```
Task: T004 — Configure astro.config.mjs (must finish before T005/T006 reference it)
Task: T005 — Add tilde-logo.svg         [P] independent of T004
Task: T006 — Remove placeholder content [P] independent of T004
```

### Within Phase 5 (US3) — T021 and T022 parallel:

```
Task: T021 — Create index.mdx      [P]
Task: T022 — Create installation.md [P]
Task: T023 — Create getting-started.md (sequential after T021/T022 for cross-links)
```

### Within Phase 8 (Polish) — T027, T030, T031, T032 parallel after T028/T029:

```
Task: T027 — Create deploy-site.yml (then T028, T029 fill in jobs)
Task: T030 — Create site/tilde/_headers    [P]
Task: T031 — Document secrets in CONTRIBUTING.md [P]
Task: T032 — Final build validation          [P]
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: US1 (install script — this IS the core product)
3. Complete Phase 4: US2 (landing page — the entry point)
4. Complete Phase 7: US5 (version accuracy — required for correctness at launch)
5. **STOP and VALIDATE**: `bash -n site/tilde/install.sh` + open landing page in browser
6. Deploy manually to Cloudflare Pages for smoke test

### Incremental Delivery

1. **Sprint 1** → Phase 1 + Phase 3 (US1) + Phase 7 (US5): Working install script served locally
2. **Sprint 2** → Phase 4 (US2): Working landing page
3. **Sprint 3** → Phase 2 (Foundational) + Phase 5 (US3): Getting started docs online
4. **Sprint 4** → Phase 6 (US4): Config reference docs complete
5. **Sprint 5** → Phase 8 (Polish): CI/CD automation live

### Suggested MVP Scope

Phases 1 + 3 + 4 + 7 (T001–T003, T007–T020, T025–T026) = **21 tasks** for a fully functional thingstead.io/tilde with install script and landing page — before docs or CI/CD.

---

## Notes

- [P] tasks operate on different files with no shared dependencies — safe to parallelize
- [US#] label maps each task to its user story for traceability back to spec.md acceptance scenarios
- US1 and US5 both modify `site/tilde/install.sh` — implement them sequentially (US1 first, US5 amends)
- `site/docs/` has its own `package.json` and is isolated from the root tilde TypeScript build — no dependency conflicts
- The install script MUST be `bash 3.2+` compatible (ships with macOS) — avoid `bash 4+`-only syntax (associative arrays, `mapfile`, etc.)
- npm's native `dist.integrity` verification (sha512) is automatic during `npm install` — no custom hash computation needed in the script (per `research.md` section 5)
- Commit after each task or logical group; stop at any phase checkpoint to validate independently
