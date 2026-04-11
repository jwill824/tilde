<!--
Sync Impact Report
==================
Version change: 2.3.0 → 2.4.1
MINOR bump (spec 010-wizard-flow-fixes, local testing findings):
  - Config detection step now documents the three-path discovery search order
    (cwd → git-root → ~/.tilde/tilde.config.json) and the auto-discovery confirmation prompt
  - Environment capture step updated to reflect language/version-manager detection and
    brew-leaves-based direct-install identification (replacing brew list -1)
  - Package managers: MacPorts added for macOS (⚠ implementation pending)
  - Version managers: rbenv (Ruby), fnm (Node.js alternative), python-venv added
  - Wizard back-navigation requirement added to Principle IV: all steps MUST expose
    back navigation via an explicit, focus-safe affordance — key-binding-only back is
    prohibited on any step that contains an active text input
  - Wizard step flow clarified: step 8 "Developer root & contexts" is a single unified step
    encompassing workspace root, named context paths, git auth per context, VCS account per
    context, and language version bindings per context (steps formerly split in code are
    reunified per constitutional intent); standalone Languages step (formerly step 7) moves
    into the Contexts step as a per-context sub-flow
  - Wizard step sequencing: flow is now logic-tree driven; next step is computed from prior
    answers, not always the next linear index
  - Note-taking apps added to Additional Tools step description and Managed Tool Catalogs
  - Schema version referenced as "1.5" (current default)
  - Logseq added to Browsers table as a note-taking app clarification (removed — stays in
    tools catalog, not browsers)

PATCH bump (spec 011-wizard-bug-fixes, post-PR manual test findings):
  - Schema version updated from "1.5" to "1.6" in Config export step
  - Entry Modes table: Config-first now documents all four confirmation options
    (Apply / Edit / Start Over / Cancel)
  - Principle IV: config-first confirmation MUST offer Apply, Edit configuration,
    Start over, and Cancel — not just a binary confirm/cancel
  - Config export: `writeConfig` always writes a canonical copy to `~/.tilde/tilde.config.json`
    in addition to the user's dotfiles repo path (enables `tilde install` discovery)

Rationale for context step unification:
  Git authentication, VCS accounts, and language version bindings are all properties of
  a developer context — not of the global environment. The constitution has always described
  them at the context level ("user selects per context"). This amendment makes that intent
  explicit in the wizard flow description and aligns the spec with the implemented code path
  being delivered in spec 010 Phase 2.

Modified principles:
  - IV. Interactive & Ink-First UX — added back-navigation requirement: all wizard steps
    MUST provide a focus-safe, explicit back affordance; key-binding-only back is prohibited
    on steps with active text inputs; config-first confirmation MUST offer four options

Modified sections:
  - Setup Wizard Flow — step 1 adds discovery search order; step 2 adds language/VM
    detection and brew-leaves note; step 7 (Languages) removed as standalone, language
    selection moved into step 8 (Contexts); step 8 clarified as unified contexts step
    encompassing workspace, contexts, git auth, VCS accounts, and per-context language
    bindings; step numbering updated to 15 steps total; dynamic sequencing note added;
    step 11 schema version updated to "1.6"
  - Package Managers — MacPorts added for macOS (implementation pending)
  - Version Managers — rbenv, fnm, python-venv added
  - Setup Wizard Flow (tools step) — note-taking app catalog noted
  - Entry Modes table — Config-first now shows full confirm menu description

Removed sections: None

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — No structural changes required
  ✅ .specify/templates/spec-template.md — No structural changes required
  ✅ .specify/templates/tasks-template.md — No structural changes required

Follow-up TODOs:
  - Implement MacPorts support (wizard step 5, installation dispatch)
  - Implement rbenv, fnm, python-venv in version manager step
  - Complete spec 010 Phase 2: context step unification, nav standardization, logic trees
  - Fix steps 13–15 rendering bug (BUG-001 in spec 010)
  - Open GitHub issues to track: fish shell, bash shell, sdkman, AWS account connection,
    OS defaults, direnv context-switching, --yes/--ci non-interactive mode
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
is detected, tilde MUST display a summary of what will be applied and present a confirmation
menu with at least four options: **Apply this configuration**, **Edit configuration**
(re-open the full wizard pre-populated with the existing config), **Start over (run wizard)**
(clear state and run a fresh wizard), and **Cancel**. This ensures users can always adjust
or restart their configuration after the initial setup run. Prompt-first is the default entry
path for users with no existing config. Fully non-interactive execution (e.g., `--yes` /
`--ci`) MUST be supported as an opt-in escape hatch for automation contexts and MUST require
a complete, valid config file.

Every wizard step that is not the first MUST expose a clearly visible back-navigation
affordance. Back navigation MUST be implemented as an explicit, focus-safe UI element (e.g.,
a SelectInput menu item or a button rendered outside any active text input). Key-binding-only
back (e.g., press 'b') is PROHIBITED on any step where a text input may be focused, because
the key would be inserted into the field rather than triggering navigation. Back-navigation
MUST restore all previously entered values for the step being returned to.

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
package managers, version managers, account connectors, OS defaults mechanisms, editor
profile managers, browser integrations, and AI coding tool integrations are all extension
points, not hard-coded modules. The tilde core MUST provide:
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
| **Config-first** | `tilde.config.json` found (local, flag, or URL) | Display config summary → confirm (Apply / Edit / Start Over / Cancel); prompt only for missing fields |
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

The bootstrap wizard proceeds in the following top-down order. Step sequencing is
logic-tree driven: the next step is computed from prior answers (e.g., if no git-capable
tool is selected, the git-auth sub-flow is skipped). Later steps may reference choices
made in earlier steps.

1. **Config detection** — search for `tilde.config.json` in priority order:
   (a) current working directory, (b) git repo root of the current directory (if inside a
   git repo), (c) `~/.tilde/tilde.config.json` (canonical; may be a symlink into a
   version-controlled tilde repo). If found, display an explicit prompt: "Found config at
   `<path>` — use it? (yes / no / specify path)". "No" exits with instructions; "specify
   path" shows a path input. If not found, offer to create one and continue the wizard.
   - **`--reconfigure` fork**: load the existing `tilde.config.json` and re-enter the full
     wizard with every field pre-populated; on completion overwrite with updated choices.
2. **Environment capture** — offer to scan the existing environment and pre-populate wizard
   defaults: detect shell rc files and dotfiles at `~/` and standard macOS paths; detect
   installed version managers (`nvm`, `pyenv`, `vfox`, `rbenv`, `fnm`, `mise`); detect
   existing language installations (`node`, `python3`, `go`, `java`, `ruby`) with versions;
   when Homebrew is present, use `brew leaves` to distinguish directly-installed formulae and
   casks from transitive dependencies. User confirms, overrides, or skips each detected item.
3. **OS detection** — automatic; no prompt.
4. **Shell** — user selects from supported shells for the detected OS.
5. **Package manager** — user selects one or more supported managers for the detected OS
   (multiple simultaneous package managers are supported).
6. **Version manager** — user selects zero or more (one per ecosystem); choice determines
   the integration artifact created per language (`.nvmrc`, `.envrc`, `.python-version`, etc.).
7. **Developer root & contexts** — unified step encompassing:
   - **Workspace root** — user defines the root directory (default: `~/Developer` on macOS).
   - **Named contexts** — user creates one or more contexts (e.g., `personal`, `work`,
     `client`), each with a directory path mapped beneath the workspace root.
   - **Per-context git authentication** — for each context, user selects: HTTPS, SSH key,
     or `gh` CLI; context switching is handled via `~/.ssh/config` `Match` blocks or
     `gh auth switch`.
   - **Per-context VCS account** — user specifies the GitHub (or other VCS) username for
     each context; account switching follows the chosen auth method.
   - **Per-context language bindings** — for each context, user selects languages and,
     per language, selects a version manager and a version from a curated catalog; no free-text
     version entry is required. The version manager choice determines the integration artifact
     written to the context's workspace directory.
   - **Per-context dotfiles location** — optional; user may store personal dotfiles inside or
     alongside a context directory.
8. **Additional tools** — user selects CLI tools, apps, and note-taking applications via the
   active package manager(s). Includes a structured catalog of note-taking apps (Obsidian,
   Notion, Bear, Logseq); App Store-only items are shown as unavailable for automated install
   with a post-wizard reminder.
9. **App configurations** — user enables/customises config domains (VS Code, Git, aliases,
   hooks, shell profiles, OS defaults).
10. **Secrets backend** — user selects how secrets are stored and referenced.
11. **Config export** — tilde writes `tilde.config.json` (schema version `1.6`) to the
    dotfiles repo or the canonical `~/.tilde/` location.
12. **Browser selection** *(optional)* — user chooses preferred browsers (see Browsers);
    selected browsers are installed via the active package manager if not already present;
    user may optionally set one as the system default; step may be skipped.
13. **AI coding tools** *(optional)* — user selects AI coding assistants and CLI tools
    installable via the active package manager (e.g., Claude Code, Claude Desktop, Cursor,
    GitHub Copilot CLI); installation status shown per tool; step may be skipped.

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
| macOS | Homebrew, MacPorts ⚠ implementation pending |
| Windows | winget (primary), Chocolatey |

Multiple package managers may be active simultaneously. Tool installation dispatches to the
appropriate manager per tool based on availability.

### OS Defaults Mechanisms

| Platform | Mechanism |
|---|---|
| macOS | `.defaults` plist commands (via `defaults write`) |
| Windows | Windows DSC (Desired State Configuration) |

### Version Managers (user selects zero or more)

- **vfox** — polyglot; single manager for multiple ecosystems; integrates via direnv `.envrc`
- **mise** — polyglot; multi-language version manager using `.tool-versions` format; compatible with asdf tooling ecosystem
- **sdkman** — JVM ecosystem (Java, Kotlin, Scala, Gradle, etc.) ⚠ implementation pending
- **nvm** — Node.js; pins version via `.nvmrc` in workspace directory
- **fnm** — Node.js alternative (Fast Node Manager); pins version via `.node-version` ⚠ implementation pending
- **pyenv** — Python; pins version via `.python-version`
- **python-venv** — Python virtual environments per context/project; no global version pinning ⚠ implementation pending
- **rbenv** — Ruby; pins version via `.ruby-version` ⚠ implementation pending

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
| curl one-liner | `curl -fsSL https://thingstead.io/tilde \| bash` | ⚠ future — installer script not yet published |

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

**Version**: 2.4.1 | **Ratified**: 2026-03-27 | **Last Amended**: 2026-04-11
