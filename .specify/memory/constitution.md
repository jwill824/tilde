<!--
Sync Impact Report
==================
Version change: 2.1.1 → 2.2.0
MINOR bump: new principle guidance (splash screen under IV; community plugin registry under
VIII), new wizard step (browser selection, step 11), new Technology Constraints sections
(Install Methods, Browsers), expanded Entry Modes (URL config loading detail, --reconfigure
fork with pre-population contract, Config Schema & Migration subsection), and
implementation-pending flags across Platforms & Shells, Version Managers, Service Accounts,
and Configurations Managed. Fixed longstanding duplicate step numbering in Setup Wizard
Flow. Corrected "seven" to "eight" Core Principles in Development Workflow and Governance.

Modified principles:
  - IV. Interactive & Ink-First UX — added splash screen startup behaviour: MUST
    dynamically display OS, architecture, shell, and tilde version before wizard begins;
    graceful fallback to raw values if friendly name mapping is unknown; CI/--yes skips
    splash entirely
  - VIII. Extensibility & Plugin Architecture — added community plugin registry definition:
    plugins are npm packages following the tilde-plugin-* naming convention, wizard-
    discoverable, and installed via the active package manager

Added sections:
  - Technology Constraints: Install Methods — lists all supported install pathways
    (npm install -g, npx, pnpm add -g, yarn global add, future brew install)
  - Technology Constraints: Browsers — new category (Chrome, Firefox, Arc, Brave,
    Safari, Edge); referenced by Browser Selection wizard step
  - Technology Constraints: Config Schema & Migration — schema versioning requirements,
    forward migration contract, and failure recovery behavior

Modified sections:
  - Setup Wizard Flow — fixed duplicate step numbering (was 1,2,3,2,3,4…→ now 1–15);
    added --reconfigure fork description to step 1; added Browser Selection as step 11
    (after Additional tools); renumbered App configurations → 12, Account connections → 13,
    Secrets backend → 14, Config export → 15
  - Entry Modes — URL loading behaviour note added below table (fetch → validate →
    summary → confirm before apply); --reconfigure row added; --yes/--ci flagged
    ⚠ implementation pending
  - Platforms & Shells — fish and bash on macOS flagged ⚠ implementation pending
  - Version Managers — sdkman flagged ⚠ implementation pending
  - Service Accounts — AWS flagged ⚠ implementation pending
  - Configurations Managed — OS defaults (defaults write) and direnv flagged
    ⚠ implementation pending
  - Development Workflow — "seven" corrected to "eight" Core Principles
  - Governance — "seven" corrected to "eight" Core Principles

Removed sections: None

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — No structural changes required; Constitution
     Check section is dynamic (reads from constitution file at plan time).
  ✅ .specify/templates/spec-template.md — No structural changes required.
  ✅ .specify/templates/tasks-template.md — No structural changes required.
  ✅ .specify/templates/checklist-template.md — No structural changes required.
  ✅ .specify/templates/constitution-template.md — No structural changes required.
  ✅ .specify/templates/agent-file-template.md — No structural changes required.

Follow-up TODOs:
  - Open GitHub issues to track all ⚠ implementation-pending items: fish shell (macOS),
    bash shell (macOS), sdkman, AWS account connection, OS defaults (defaults write),
    direnv / context-switching wiring, --yes/--ci non-interactive mode.
  - Confirm original ratification date: currently recorded as 2026-03-27.
-->

# Tilde Constitution

## Core Principles

### I. Configuration-First (NON-NEGOTIABLE)

Tilde MUST impose no decisions on the user. Every element of the developer stack — shell,
package manager, version manager, languages, language versions, directory structure, Git
authentication method, tools, app configurations, and account connections — MUST be presented
as an explicit, guided choice. The only action tilde takes automatically is OS detection; from
that point forward, all decisions belong to the user.

Tilde MUST support two equal-standing entry modes, selectable by user preference:

- **Prompt-first**: the interactive wizard guides the user through each decision in sequence.
  Default for new users with no existing config.
- **Config-first**: the user authors or provides a `tilde.config.json` file up front, and
  tilde applies it directly, prompting only for anything missing or ambiguous. Suitable for
  users who prefer to version-control their stack decisions as code before running setup.

Both modes MUST produce an identical, fully-resolved `tilde.config.json` as their output.
The config file format MUST be fully documented so users can author or edit it by hand without
using the wizard. No option MUST be pre-selected or defaulted without the user's confirmation
in either mode.

### II. Bootstrap-Ready

Tilde's primary use case is zero-to-developer-environment on a new or freshly reset machine.
A single script — copyable from a browser and runnable in any default terminal — MUST be
sufficient to trigger the full interactive setup. No pre-installed dependencies beyond what the
OS ships with (e.g., `curl`, PowerShell) are required to start. The wizard MUST walk the user
through every layer of the stack in logical top-down order, install selected tools, apply
configurations, wire accounts, and generate the reusable config. Subsequent runs using an
existing `tilde.config.json` MUST restore the full environment without re-prompting for
previously answered choices (unless `--reconfigure` is passed).

### III. Context-Aware Environments (NON-NEGOTIABLE)

Once configured, tilde MUST ensure that Git identity (name, email), the active VCS account,
shell environment variables, and tool versions resolve automatically based on the current
working directory — without any manual intervention from the user. Each developer context
(e.g., `personal`, `work`, `client`) MUST map to its own: directory subtree, Git identity,
VCS account, environment variables, and optionally a separate editor profile. The mechanism
used to achieve this (direnv, shell hooks, `.gitconfig` `includeIf`, etc.) is determined by
the user's configuration choices — this principle mandates the *outcome*, not the *method*.

### IV. Interactive & Ink-First UX (NON-NEGOTIABLE)

The CLI MUST be fully interactive, built with [Ink](https://github.com/vadimdemedes/ink)
(React-based terminal UI). Every setup and configuration workflow MUST guide the user with
clear prompts, selection menus, progress feedback, and confirmation steps — no silent state
mutations, no required flag memorization. The wizard MUST proceed top-down through the stack
(OS → shell → package manager → version manager → languages → tools → configurations →
accounts) so the user always understands where they are and what comes next.

On every interactive startup (all modes except `--ci` / `--yes`), tilde MUST display a splash
screen that dynamically renders the detected runtime environment: OS name and version (e.g.,
`macOS Sequoia 15.3`), CPU architecture (e.g., `arm64`), active shell name and version (e.g.,
`zsh 5.9`), and the running tilde version (e.g., `v1.0.1`). These values MUST be detected at
runtime, not hardcoded. If a friendly display name mapping is unavailable for a detected value,
tilde MUST gracefully fall back to the raw detected value rather than omitting it or showing an
error. Non-interactive / CI mode (`--ci`, `--yes`) MUST skip the splash entirely to keep output
machine-parseable.

Config-first mode (providing a `tilde.config.json` before running) is a first-class user
preference and MUST be treated as such in the UI — not as a workaround. When a config file
is detected, tilde MUST display a summary of what will be applied and ask for confirmation
before proceeding. Prompt-first is the default entry path for users with no existing config.
Fully non-interactive execution (e.g., `--yes` / `--ci`) MUST be supported as an opt-in
escape hatch for automation contexts and MUST require a complete, valid config file.

### V. Idempotent Operations

Every operation tilde performs — symlink creation, package installation, tool configuration,
account wiring — MUST be safe to re-run on both fresh and pre-existing machines. Running
`tilde install` a second time MUST produce the same final state as the first run. Tilde MUST
check current state before mutating it: existing symlinks, installed packages, and applied
configurations MUST be detected and skipped or reconciled rather than blindly overwritten.
Idempotency is a hard requirement, not a best effort.

### VI. Secrets-Free Repository

No plaintext secrets, tokens, or credentials MUST ever be committed to the dotfiles repo or
any tracked file — regardless of how "low-risk" they appear. The user MUST choose a secrets
backend during setup (e.g., 1Password CLI `op://` references, system keychain, environment-
only values). Tilde MUST generate `.envrc` and shell config files that reference secrets
through the chosen backend, never embedding resolved values. Resolved credential values MUST
exist only in the running shell environment and MUST NOT be written to disk in any form.

### VII. macOS First, Cross-Platform by Design

The MVP target is macOS. All initial implementation effort MUST be focused on a complete,
polished macOS experience. Windows support is explicitly deferred to a future spec and MUST NOT
block any macOS feature from shipping. However, the architecture MUST be designed from day one
to prevent macOS lock-in: every platform-specific concern (package manager, shell profile paths,
OS defaults, symlink mechanics) MUST be implemented behind a plugin/driver interface so that a
Windows driver can be added later without restructuring core logic. The interactive UI MUST
be designed to adapt its option menus based on detected OS — even if only the macOS options are
implemented initially.

### VIII. Extensibility & Plugin Architecture

Every tool integration category in tilde MUST be implemented as a plugin: secrets backends,
package managers, version managers, account connectors, OS defaults mechanisms, and editor
profile managers are all extension points, not hard-coded modules. The tilde core MUST provide:
a stable plugin API contract, a plugin registry (first-party and community), and a mechanism
for users to install and activate plugins from within the wizard. First-party plugins ship with
tilde (e.g., Homebrew, 1Password, gh CLI). Community plugins MUST be installable via a
published plugin spec. Adding a new integration (e.g., Bitwarden, Chocolatey, a new version
manager) MUST require only writing a plugin — not modifying tilde core. The plugin API contract
is governed under MAJOR versioning: breaking changes to it MUST trigger a major version bump.

Community plugins are npm packages following the naming convention `tilde-plugin-*`. They MUST
be discoverable via the wizard's plugin registry step and installed via the active package
manager (whichever the user selected during setup). A community plugin MUST implement the
stable plugin API contract and declare its supported plugin category (e.g., `secrets-backend`,
`version-manager`, `account-connector`) in its `package.json` metadata under a `tilde` key.
The plugin registry resolves available community plugins from the npm registry at install time;
no separate registry server is required.

## Technology Constraints

This section records the supported environments and tool categories that tilde is designed
around. Tilde does not prescribe which options a user must choose — it MUST support the full
menu listed here. Adding a new supported option in any category requires a constitution
amendment.

### Entry Modes

Tilde MUST detect and branch at startup:

| Mode | Trigger | Behaviour |
|---|---|---|
| **Config-first** | `tilde.config.json` found (local, flag, or URL) | Display config summary → confirm → apply; prompt only for missing fields |
| **Prompt-first** | No config file present | Run full wizard top-down; generate config on completion |
| **Reconfigure** | `--reconfigure` flag | Load existing `tilde.config.json` via config reader; re-run full wizard with all fields pre-populated from stored values; user may navigate and change any step; on completion overwrite existing config |
| **Non-interactive** | `--yes` / `--ci` flag | Apply complete config silently; error if any field missing ⚠ implementation pending |

When the `--config` flag is provided with a URL (e.g., `tilde --config https://...`), tilde
MUST fetch the remote JSON over HTTPS, validate it against the current config schema, display
a human-readable summary of every field that will be applied, and require explicit user
confirmation before proceeding. Tilde MUST NOT apply a remotely fetched config silently.
If the fetch fails or the payload is invalid, tilde MUST report a clear error and exit without
modifying local state.

The config file format MUST be documented in `docs/config-format.md` within the repo so users
can author or edit it independently of the wizard. The schema MUST be versioned and validated
at load time with clear error messages for any unknown or malformed fields.

### Config Schema & Migration

Every `tilde.config.json` MUST carry a `schemaVersion` field. When tilde loads a config, it
MUST compare the file's `schemaVersion` against the current supported version and, if they
differ, attempt automatic forward migration before validation. All migration steps MUST be
additive and non-destructive: they may add new fields with defaults or rename deprecated fields,
but MUST NOT remove data or alter values the user explicitly set. If migration succeeds, the
migrated config MUST be written back to disk and the user notified of the upgrade. If migration
fails for any reason, tilde MUST warn the user clearly, preserve the original file unmodified,
and offer to re-run the full wizard so the user can supply any missing values interactively.

### Setup Wizard Flow

The bootstrap wizard MUST proceed in the following top-down order, with later steps able to
reference choices made in earlier steps:

1. **Config detection** — check for `tilde.config.json`; if found, branch to config-first
   mode (see Entry Modes); if not found, continue wizard.
   - **`--reconfigure` fork**: when `--reconfigure` is passed, tilde loads the existing
     `tilde.config.json` and re-enters the full wizard with every field pre-populated from
     that file. The user may accept, change, or clear any value at any step. On completion
     the config file is overwritten with the updated choices and the environment is re-applied.
2. **Environment capture** — offer to scan the existing environment (`~/` dotfiles,
   `brew list -1`, rc files, etc.) and pre-populate wizard choices with detected values;
   user confirms, overrides, or skips each detected item
3. **OS detection** — automatic; no prompt
4. **Shell** — user selects from supported shells for the detected OS
5. **Package manager** — user selects from supported managers for the detected OS
6. **Version manager** — user selects zero or more (one per ecosystem)
7. **Languages & versions** — user selects languages and pins versions via chosen manager
8. **Developer root & contexts** — user defines workspace root (e.g., `~/Developer`) and
   names their contexts (e.g., `personal`, `work`, `client`) with directory mappings
9. **Git authentication method** — user selects per context: HTTPS, SSH, or `gh` CLI
10. **Additional tools** — user selects further CLI tools and apps via the package manager
11. **Browser selection** — user chooses a preferred browser (see Browsers); selected browser
    is installed via the active package manager if not already present; user may optionally
    set the chosen browser as the system default
12. **App configurations** — user enables/customises config domains (VS Code, Git, aliases,
    hooks, shell profiles, OS defaults)
13. **Account connections** — user connects service accounts (GitHub, Claude, AWS, etc.)
14. **Secrets backend** — user selects how secrets are stored and referenced
15. **Config export** — tilde writes `tilde.config.json` to the dotfiles repo

### Platforms & Shells

| Platform | Supported Shells |
|---|---|
| macOS | zsh, bash ⚠ implementation pending, fish ⚠ implementation pending |
| Windows | PowerShell (pwsh), Command Prompt (limited) |

### Browsers (user selects one as preferred; optional system default)

Tilde MUST offer the following browsers during the Browser Selection wizard step. The selected
browser is installed via the active package manager (e.g., Homebrew cask on macOS) if not
already present. Setting the chosen browser as system default is opt-in.

| Browser | Notes |
|---|---|
| **Chrome** | Google Chrome |
| **Firefox** | Mozilla Firefox |
| **Arc** | The Browser Company — macOS/Windows |
| **Brave** | Brave Browser |
| **Safari** | macOS built-in; installation step skipped if selected |
| **Edge** | Microsoft Edge |

### Package Managers

| Platform | Supported Options |
|---|---|
| macOS | Homebrew |
| Windows | winget (primary), Chocolatey |

### OS Defaults Mechanisms

| Platform | Mechanism |
|---|---|
| macOS | `.defaults` plist commands (via `defaults write`) |
| Windows | Windows DSC (Desired State Configuration) |

### Version Managers (user selects zero or more)

- **vfox** — polyglot; single manager for multiple ecosystems
- **sdkman** — JVM ecosystem (Java, Kotlin, Scala, Gradle, etc.) ⚠ implementation pending
- **nvm** — Node.js
- **pyenv** — Python

### Git Authentication Methods (user selects per context)

- **HTTPS** — username embedded in remote URL; credential helper of user's choice
- **SSH** — SSH key pair; per-context key selection via `~/.ssh/config`
- **gh CLI** — `gh auth` as the Git credential helper; account switching via `gh auth switch`

### Configurations Managed

Tilde MUST be capable of managing the following configuration domains (each opt-in):

- **Visual Studio Code** — settings, keybindings, extensions list, profiles per context
- **Git** — global `.gitconfig`, folder-level context overrides, hooks, commit templates
- **Shell aliases** — dedicated aliases file sourced from the active shell profile
- **Git hooks** — per-repo or global hooks directory
- **Shell profiles** — `.zshrc`, `.zshprofile` (macOS); PowerShell `$PROFILE` (Windows)
- **OS defaults** — macOS system preferences via `defaults write` ⚠ implementation pending;
  Windows DSC manifests
- **Context switching** — `.envrc` per developer context, wired via direnv (NON-NEGOTIABLE
  per Principle III) ⚠ implementation pending

### Symlinks

All managed dotfiles MUST be version-controlled in the dotfiles repo and symlinked into place.
Examples (actual paths are user-defined):

- `~/.zshrc` → `dotfiles/shell/.zshrc`
- `~/.zshprofile` → `dotfiles/shell/.zshprofile`
- Folder-level `.gitconfig` per developer context
- `.envrc` per developer context

### Service Accounts (user selects which to connect)

- **GitHub** — one account per context; switching method depends on chosen auth method
- **Claude** — API key; injected via chosen secrets backend
- **AWS** — access key / named profile; injected via chosen secrets backend
  ⚠ implementation pending

### Secrets Backends (user selects one)

- **1Password CLI** — secrets referenced as `op://` URIs, resolved at shell load time
- **System keychain** — macOS Keychain / Windows Credential Manager via helper scripts
- **Environment-only** — values sourced from a non-tracked local file (e.g., `.env.local`);
  not committed, manually managed

### CLI Framework

- **Runtime**: Node.js
- **UI**: [Ink](https://github.com/vadimdemedes/ink) (React-based terminal UI)

### Install Methods

Tilde MUST be installable and runnable via the following methods. All methods MUST produce an
identical runtime behaviour; the install method does not affect wizard functionality.

| Method | Command | Status |
|---|---|---|
| `npx` (no install) | `npx @jwill824/tilde` | ✅ supported |
| npm global | `npm install -g @jwill824/tilde` | ✅ supported |
| pnpm global | `pnpm add -g @jwill824/tilde` | ⚠ implementation pending |
| yarn global | `yarn global add @jwill824/tilde` | ⚠ implementation pending |
| Homebrew formula | `brew install tilde` | ⚠ future — Homebrew tap not yet published |
| curl one-liner | `curl -fsSL https://get.tilde.sh \| bash` | ⚠ future — installer script not yet published |

## Development Workflow

- Features MUST be spec'd before implementation (`/speckit.specify` → `/speckit.plan` →
  `/speckit.tasks`).
- Every PR MUST include a Constitution Check verifying compliance with all eight Core
  Principles.
- Complexity violations MUST be recorded in the plan's Complexity Tracking table with
  explicit justification.
- Any change to the wizard flow order (Section: Setup Wizard Flow) MUST be treated as a
  MINOR amendment at minimum.
- Integration tests covering context switching MUST accompany any change to environment
  resolution logic, regardless of the auth method involved.
- Cross-platform features MUST be tested on both macOS and Windows before merging.
- `tilde install` MUST be manually verified idempotent (run twice, clean and pre-existing
  state) before merging any change to install or configuration logic.

## Governance

This constitution supersedes all other conventions, READMEs, and informal agreements for the
tilde project. Amendments require:

1. A written rationale describing why the change is necessary.
2. An updated Sync Impact Report (as the HTML comment at the top of this file).
3. A version bump following semantic versioning:
   - **MAJOR**: Removal or redefinition of a Core Principle, removal of a supported tool
     category, or a breaking change to the config file format or wizard flow contract.
   - **MINOR**: New principle, new supported tool/platform, or materially expanded guidance.
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements.
4. Propagation of changes to all dependent templates (plan, spec, tasks) before the
   amendment is considered complete.

All PRs and reviews MUST verify compliance with the eight Core Principles. Exceptions require
explicit written justification recorded in the plan's Complexity Tracking table.

**Version**: 2.2.0 | **Ratified**: 2026-03-27 | **Last Amended**: 2026-03-28
