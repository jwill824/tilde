# Feature Specification: get.tilde.sh Documentation & Download Site

**Feature Branch**: `003-get-tilde-sh-site`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Setup get.tilde.sh as the zero-prereq download site for
tilde, serving an install script, landing page, and full documentation accessible via
a public URL — modeled after sites like docs.astral.sh/uv and vfox.dev"

## Clarifications

### Session 2026-03-29

- Q: How is the root URL resolved when it must serve both a shell script (for curl) and
  an HTML landing page (for browsers)? → A: Root (`/`) serves the HTML landing page;
  the install script lives at `/install.sh` — curl command is
  `curl -fsSL https://get.tilde.sh/install.sh | bash`.
- Q: What is the Node.js bootstrap strategy on a fresh macOS machine with no package
  manager? → A: The install script prompts the user to select a package manager
  (Homebrew recommended/default on macOS); it installs the chosen package manager first
  if absent, then installs Node.js through it. Secondary package managers (npm, pip,
  etc.) follow. This mirrors tilde's Configuration-First principle.
- Q: Where do the documentation pages live — under `get.tilde.sh/docs/...` or a
  dedicated subdomain? → A: Dedicated subdomain `docs.tilde.sh` for all documentation;
  `get.tilde.sh` hosts only the landing page and install script.
- Q: What is the security posture of the install script for curl-piped execution? →
  A: HTTPS transport required; npm automatically verifies the SHA-512 integrity hash
  (`dist.integrity`) of the tilde package during install and aborts if verification fails.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Prereq Curl Install (Priority: P1)

A developer has just unboxed or reset their machine. They have no package manager, no
Node.js, and no prior tooling. They run a single curl command in their terminal and tilde
is fully installed and ready to launch — without any prior setup on their part.

**Why this priority**: This is the primary entry point. Every other story depends on
users being able to install tilde first.

**Independent Test**: Can be tested end-to-end on a fresh macOS VM by running
`curl -fsSL https://get.tilde.sh/install.sh | bash` and verifying tilde launches
successfully.

**Acceptance Scenarios**:

1. **Given** a macOS machine with no Node.js installed, **When** the user runs
   `curl -fsSL https://get.tilde.sh/install.sh | bash`, **Then** the script prompts
   the user to select a package manager (defaulting to Homebrew on macOS), installs
   it if absent, installs Node.js through it, installs tilde, and launches the tilde
   wizard.
2. **Given** a macOS machine that already has Node.js installed, **When** the user runs
   the curl command, **Then** the script skips prerequisite installation and proceeds
   directly to launching tilde.
3. **Given** the curl command is run on a non-macOS system (Linux), **When** the script
   executes, **Then** it detects the OS, installs appropriate prerequisites, and either
   launches tilde or prints a clear message explaining limited support.
4. **Given** the network is unavailable mid-install, **When** a download step fails,
   **Then** the script exits with a descriptive error message and leaves the system in
   a clean state (no partial installs).

---

### User Story 2 - Landing Page with Install Options (Priority: P2)

A developer hears about tilde and visits `https://get.tilde.sh` in their browser. They
land on a polished, minimal homepage that immediately communicates what tilde does,
shows all available install methods, and links to the full documentation.

**Why this priority**: The homepage is the first impression. It must earn trust quickly
and route users to the right next step (install or read docs).

**Independent Test**: Can be tested by loading `https://get.tilde.sh` in a browser and
verifying the install command, description, all install methods, and docs link are
visible without scrolling on a standard desktop viewport.

**Acceptance Scenarios**:

1. **Given** a user visits `https://get.tilde.sh`, **When** the page loads, **Then**
   they see the curl one-liner in a prominently copyable code block above the fold.
2. **Given** a user visits the landing page, **When** they read it, **Then** they can
   understand what tilde does and identify all supported install methods (curl, npm,
   npx) within 15 seconds.
3. **Given** a user visits on a mobile device, **When** the page loads, **Then** the
   install command and key content are legible without horizontal scrolling.
4. **Given** a user wants to learn more, **When** they look for documentation, **Then**
   a clearly labeled link takes them to the Getting Started guide on `docs.tilde.sh`
   in under one click.

---

### User Story 3 - Getting Started Documentation (Priority: P3)

A developer who has just installed tilde — or is evaluating it — visits the docs to
understand what tilde does, how to run it for the first time, and what to expect from
the setup wizard.

**Why this priority**: Reduces friction at the most critical drop-off point: right after
install. Without a getting started guide, users abandon before experiencing value.

**Independent Test**: Can be tested by having a first-time user follow only the Getting
Started page to complete their first tilde run, without referencing any other resource.

**Acceptance Scenarios**:

1. **Given** a user just installed tilde, **When** they visit the Getting Started guide,
   **Then** they can launch tilde and complete their first wizard run using only the
   instructions on that page.
2. **Given** a user is evaluating tilde before installing, **When** they read the Getting
   Started page, **Then** they understand what the wizard will ask, what it will configure,
   and what the end result looks like.
3. **Given** a user encounters an error during first run, **When** they consult the
   Getting Started page, **Then** they find troubleshooting guidance for the most common
   failure scenarios.

---

### User Story 4 - Configuration Reference (Priority: P4)

A developer who has already set up their environment wants to understand the full shape
of `tilde.config.json` — every key, its purpose, valid values, and defaults — so they
can edit their config file confidently or share it across machines.

**Why this priority**: Config-First is a core constitutional principle. Developers need
authoritative reference docs to trust and use the config file as "environment as code."

**Independent Test**: Can be tested by having a developer locate the schema for any
specific config key (e.g., `versionManager`) within 60 seconds using only the docs site.

**Acceptance Scenarios**:

1. **Given** a user wants to understand a specific config key, **When** they visit the
   Config Reference, **Then** they find the key's purpose, valid values, and an example
   within one page-search.
2. **Given** a user is setting up a new machine using an existing config file, **When**
   they reference the config docs, **Then** they can validate their config is correct
   before running tilde.
3. **Given** a new config key is added in a tilde release, **When** the docs are updated,
   **Then** the new key appears in the Config Reference with full documentation.

---

### User Story 5 - Version-Accurate Install (Priority: P5)

A developer runs the install script at any time and receives the latest stable published
version of tilde without any manual update to the site source.

**Why this priority**: Correctness of the install script over time requires zero-touch
version management — stale hardcoded versions cause install failures post-release.

**Independent Test**: Can be tested by publishing a new tilde version and verifying the
install script installs that version without changing the site source.

**Acceptance Scenarios**:

1. **Given** a new tilde version is published, **When** a user runs the curl install
   within 24 hours, **Then** the installed version matches the latest published release.
2. **Given** the upstream package registry is unavailable, **When** the install script
   runs, **Then** it fails gracefully with a message directing the user to install via
   `npx @jwill824/tilde` directly.

---

### Edge Cases

- What happens when `curl` is not available on the target machine?
- How does the script behave when run with `sudo` vs without elevated privileges?
- What if the user's default shell is not `bash` (e.g., `zsh`, `fish`)?
- What if the `get.tilde.sh` DNS has not yet propagated and the request fails?
- What happens when the script is piped into `sh` instead of `bash`?
- What if a user lands on a `docs.tilde.sh` page that describes a feature not yet in
  their installed version of tilde?
- What if the SHA-512 integrity verification fails (e.g., corrupted download or
  tampered package)? npm aborts the install automatically; the script MUST propagate
  that failure, display a security warning, and instruct the user to retry or report
  the issue.

## Requirements *(mandatory)*

### Functional Requirements

**Install Script**

- **FR-001**: The site MUST serve the install script at `https://get.tilde.sh/install.sh`
  (not the root path) so it is safe to pipe directly into `bash` via
  `curl -fsSL https://get.tilde.sh/install.sh | bash`.
- **FR-002**: The install script MUST prompt the user to select a primary package manager
  (Homebrew is the recommended default on macOS). If the selected package manager is not
  installed, the script MUST install it first, then use it to install Node.js. This
  mirrors tilde's Configuration-First principle — no package manager is assumed or
  silently installed without user confirmation.
- **FR-002a**: After Node.js is installed, secondary package managers (npm, pip, etc.)
  are available for tilde to manage during the wizard run.
- **FR-003**: The install script MUST install tilde after confirming Node.js is available.
- **FR-004**: The install script MUST print clear, human-readable progress messages at
  each major step (prerequisite check, install, launch).
- **FR-005**: The install script MUST exit with a non-zero status code and a descriptive
  error message on any unrecoverable error, leaving the system in a clean state.
- **FR-005a**: The install script MUST verify the integrity of the tilde package before
  completing installation. npm automatically verifies the package's SHA-512 integrity hash
  (`dist.integrity` field from the npm registry) during `npm install`. If verification
  fails, npm aborts with an error and the script MUST propagate that failure, removing
  any partially downloaded files.
- **FR-006**: The install script MUST always resolve and install the latest stable
  published version of tilde at run time (not a hardcoded version).
- **FR-007**: The install script MUST support macOS (primary). Linux support is SHOULD.
  Windows is explicitly out of scope.

**Landing Page**

- **FR-008**: The site MUST serve a human-readable landing page at `https://get.tilde.sh`
  (root path `/`) when visited from a browser. The install script is served separately
  at `/install.sh`.
- **FR-009**: The landing page MUST display: the curl one-liner in a copyable code block,
  a one-sentence description of tilde, all supported install methods, and a prominent
  link to the documentation.
- **FR-010**: The landing page MUST load in under 3 seconds on a standard broadband
  connection without requiring JavaScript to display core content.

**Documentation Site** *(hosted at `docs.tilde.sh`)*

- **FR-011**: `docs.tilde.sh` MUST include a Getting Started guide covering: installation,
  first run, what the wizard does, and expected output.
- **FR-012**: `docs.tilde.sh` MUST include a Configuration Reference documenting every
  `tilde.config.json` key with its purpose, valid values, defaults, and an example.
- **FR-013**: `docs.tilde.sh` MUST include documentation for all supported install methods
  (curl, npx, npm global, and future: Homebrew).
- **FR-014**: `docs.tilde.sh` MUST provide full-text search across all documentation pages.
- **FR-015**: `docs.tilde.sh` MUST support dark mode.
- **FR-016**: `docs.tilde.sh` MUST be navigable from any page via a persistent sidebar
  or navigation menu.

**Deployment & Maintenance**

- **FR-017**: Both `get.tilde.sh` (landing + install script) and `docs.tilde.sh`
  (documentation) source MUST live within the tilde repository and deploy automatically
  on merge to the default branch via CI — `get.tilde.sh` from `site/` and
  `docs.tilde.sh` from `site/docs/` (or equivalent subdirectory).
- **FR-018**: Documentation pages MUST be authorable in plain Markdown so that
  contributors can update them without specialized tooling knowledge.

### Key Entities

- **Install Script**: Shell script served at `https://get.tilde.sh/install.sh`; handles
  package manager selection, Node.js installation, tilde install, and version resolution.
- **Landing Page**: Browser-facing homepage at `https://get.tilde.sh`; entry point for
  new users showing install options and linking to `docs.tilde.sh`.
- **Documentation Site**: Full reference site at `https://docs.tilde.sh`; covers Getting
  Started, Configuration Reference, install methods, and future plugin docs.
- **Documentation Page**: A structured content page on `docs.tilde.sh` covering a
  specific topic.
- **Site Navigation**: Sidebar/menu structure on `docs.tilde.sh` linking all doc pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer on a fresh macOS machine can go from zero to tilde running in
  under 5 minutes using only the curl one-liner and the Getting Started guide.
- **SC-002**: 100% of User Story 1 acceptance scenarios pass on a clean macOS VM without
  manual intervention.
- **SC-003**: A first-time user can locate the documentation for any config key within
  60 seconds using `docs.tilde.sh`'s search.
- **SC-004**: The landing page and all documentation pages load in under 3 seconds on a
  standard broadband connection.
- **SC-005**: The install script produces zero silent failures — every error path results
  in a user-visible message and a non-zero exit code.
- **SC-006**: After any new tilde release, the install script installs the correct
  latest version without a site source change or manual redeployment.
- **SC-007**: All documentation pages render correctly on mobile viewports without
  horizontal scrolling.

## Assumptions

- Target users are developers on macOS who are comfortable with terminal commands.
- The `get.tilde.sh` domain is owned and DNS can be pointed to the chosen hosting
  service.
- The tilde npm package (`@jwill824/tilde`) remains the canonical distribution artifact;
  the install script wraps it rather than replacing it.
- A static site deployment is sufficient for both `get.tilde.sh` (landing page +
  install script) and `docs.tilde.sh` (documentation). Both can be served from the
  same hosting provider (GitHub Pages, Cloudflare Pages, or similar) using separate
  subdomain CNAME records.
- The existing `bootstrap.sh` in the repository root is the basis for the install script
  and will be adapted rather than rewritten from scratch.
- Windows support is out of scope; the script MAY print a message directing Windows
  users to the npm install path.
- No analytics, tracking, or user accounts are required.
- Documentation content for Configuration Reference will be sourced from the existing
  Zod schema definitions in the codebase — content accuracy depends on schema staying
  current.
- The plugin docs section (Homebrew, vfox, nvm, etc.) will follow in a later iteration
  once the plugin architecture is stable; this spec covers the core doc structure only.
