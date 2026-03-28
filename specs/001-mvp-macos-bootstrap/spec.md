# Feature Specification: MVP — macOS Developer Environment Bootstrap

**Feature Branch**: `001-mvp-macos-bootstrap`
**Created**: 2026-03-27
**Status**: Draft
**Input**: Full end-to-end MVP — environment capture, prompt-first wizard, config schema,
config-first entry mode, and context-aware environment switching for a personal macOS setup.

## Clarifications

### Session 2026-03-27

- Q: If tilde fails partway through setup, what should happen? → A: Save progress after each step; on re-run, resume from the last completed step.
- Q: What is the relationship between tilde and the user's dotfiles repository? → A: The dotfiles repo is a separate, user-owned git repository; tilde writes into it but does not own its git history. No submodule relationship between the tilde project and the dotfiles repo.
- Q: How should tilde identify secrets during environment capture? → A: Exclude files that would normally be gitignored (using .gitignore-style pattern matching); no value-level or entropy scanning required.
- Q: How is the bootstrap one-liner script distributed? → A: Primary: custom domain (e.g., `get.tilde.sh`) redirecting to GitHub raw URL. GitHub raw URL also valid directly. Additional distribution methods (npx, etc.) can be added later.
- Q: Is direnv a required dependency or user-selectable? → A: Default-on but user-selectable. Pre-selected in the wizard; user can deselect. Context env-var switching degrades gracefully if direnv is not chosen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fresh Machine Bootstrap (Priority: P1)

A developer unboxes a new Mac (or resets an existing one). They navigate to the tilde
project page in their browser, copy a single bootstrap script, open Terminal, paste and
run it. With no other pre-requisites, the Ink-based wizard walks them top-down through every
layer of their developer stack: shell, package manager, version manager, languages, workspace
root, named project contexts (personal, work, client), git auth method per context, tools to
install, app configurations, and service account connections. At the end, all selected tools
are installed, all dotfiles are symlinked into place, all contexts are wired, and a portable
`tilde.config.json` is written to their dotfiles repo.

**Why this priority**: This is the core value proposition of tilde — the entire tool exists
to make this journey fast, guided, and repeatable. Everything else is in service of this.

**Independent Test**: Run on a clean macOS user account with no prior tooling. Complete the
wizard choosing at minimum: zsh, Homebrew, one version manager, one context, and one GitHub
account. Verify the resulting machine state matches all wizard choices and `tilde.config.json`
captures them all accurately.

**Acceptance Scenarios**:

1. **Given** a fresh Mac with only the default system tools, **When** the user pastes and runs
   the bootstrap script in Terminal, **Then** tilde installs, launches the Ink wizard, and
   guides the user through each setup layer in order with no errors.
2. **Given** the user completes all wizard steps, **When** setup finishes, **Then** all
   selected packages are installed, all dotfiles are symlinked, and `tilde.config.json` is
   written with every choice recorded.
3. **Given** a completed setup, **When** the user opens a new shell session, **Then** all
   configured tools are available on `$PATH` and the correct shell profile is active.

---

### User Story 2 - Existing Machine Capture (Priority: P2)

A developer already has a working Mac they've configured by hand over months or years. They
run tilde for the first time and are offered an environment capture step before the wizard
begins. Tilde scans their home directory for dotfiles, runs the equivalent of `brew list`,
and reads their rc files. The wizard then pre-populates choices with the detected values —
the developer confirms, adjusts, or skips each item — and the result is a `tilde.config.json`
that represents their existing setup. They can now reproduce it on any future machine.

**Why this priority**: Without capture, existing developers must re-enter everything from
memory. Capture makes onboarding to tilde frictionless for users who already have a setup.

**Independent Test**: Run on a Mac with an existing Homebrew installation, `.zshrc`, and
`.gitconfig`. Verify that detected values appear as pre-populated defaults in the wizard and
that the generated `tilde.config.json` accurately reflects the existing state.

**Acceptance Scenarios**:

1. **Given** a Mac with Homebrew packages installed, **When** environment capture runs,
   **Then** the detected package list is presented as pre-populated selections the user can
   confirm or deselect.
2. **Given** an existing `.gitconfig` with name and email, **When** capture runs,
   **Then** those values are pre-populated in the corresponding wizard fields.
3. **Given** an existing `.zshrc` with aliases and exports, **When** capture runs,
   **Then** the user is shown a summary of detected configurations and given the option to
   include them in their managed dotfiles.
4. **Given** capture encounters a file matching standard `.gitignore` patterns (e.g., `.env`,
   `*.pem`, `*.key`), **When** processing that file, **Then** tilde MUST skip it entirely
   and MUST NOT include its path or contents in capture output or `tilde.config.json`.

---

### User Story 3 - Config-First Restore (Priority: P3)

A developer has a `tilde.config.json` from a previous setup (committed in their dotfiles
repo). They get a new machine, run the bootstrap script, and provide the config file path or
URL when prompted. Tilde reads the config, displays a summary of what it will install and
configure, asks for confirmation, and then applies everything without walking through the full
wizard again.

**Why this priority**: This closes the reproducibility loop. The wizard generates the config;
config-first mode consumes it. Without this story, the config file is write-only.

**Independent Test**: Take a valid `tilde.config.json` from a completed Story 1 run. Run
`tilde install --config path/to/tilde.config.json` on a separate clean machine. Verify the
resulting state is identical to the original without any wizard prompts.

**Acceptance Scenarios**:

1. **Given** a valid `tilde.config.json`, **When** the user runs tilde pointing to it,
   **Then** tilde displays a human-readable summary of the config contents before applying.
2. **Given** the user confirms the config summary, **When** tilde applies it, **Then** all
   packages are installed, dotfiles symlinked, and contexts wired — identical to a wizard run
   with the same choices.
3. **Given** a config file with a missing required field, **When** tilde loads it, **Then**
   tilde reports the missing field with a clear error and prompts the user to supply only the
   missing value.
4. **Given** a config file from an older schema version, **When** tilde loads it, **Then**
   tilde either migrates it automatically or reports a clear incompatibility message.

---

### User Story 4 - Context-Aware Environment Switching (Priority: P4)

A developer has completed setup with multiple named contexts (e.g., `personal` at
`~/Developer/personal`, `work` at `~/Developer/work`). As they `cd` between project
directories, their git identity (name, email), active GitHub account, shell environment
variables, and VS Code profile automatically switch to match the current context — no
manual commands required.

**Why this priority**: This is the daily-use payoff of the setup investment. It makes the
configured identity boundaries invisible and automatic.

**Independent Test**: Configure two contexts with different git identities. `cd` into each
context directory and run `git config user.email`. Verify the correct identity is active in
each context without any manual switching.

**Acceptance Scenarios**:

1. **Given** two configured contexts with different git identities, **When** the developer
   `cd`s into a context directory, **Then** `git config user.name` and `git config user.email`
   immediately reflect that context's identity.
2. **Given** a context connected to a specific GitHub account, **When** the developer enters
   that context directory, **Then** `gh` CLI operations use the correct GitHub account
   automatically.
3. **Given** a context with defined environment variables, **When** the developer enters the
   context directory, **Then** those variables are available in the shell and cleared when
   leaving the context.
4. **Given** a directory that matches no configured context, **When** the developer enters it,
   **Then** the personal context (or user-designated default) is active.

---

### Edge Cases

- What if the bootstrap script is run on an unsupported macOS version or non-Apple-Silicon
  hardware?
- What if Homebrew installation fails mid-wizard (network error, disk space, etc.)?
- What if a selected package no longer exists in Homebrew?
- What if two contexts map to overlapping directory paths?
- What if the user runs `tilde install` a second time after partial completion (one context
  set up, others not)? → Tilde resumes from the last successfully completed step using its
  persisted progress checkpoint; completed steps are skipped, remaining steps proceed.
- What if the dotfiles repo path doesn't exist when tilde tries to write `tilde.config.json`?
- What if environment capture finds an rc file that sources another rc file — does tilde
  follow the chain?
- What if a captured dotfile is already a symlink (managed by a previous tool)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect the current OS at startup without user input and present only
  the tool options supported on that OS.
- **FR-019**: The bootstrap entry point MUST be a single shell command invokable via a custom
  domain URL (e.g., `curl -fsSL https://get.tilde.sh | bash`). The custom domain MUST
  redirect to the versioned script on GitHub raw URL. The GitHub raw URL MUST also be
  independently valid as a direct install path.
- **FR-020**: The system MUST support a --reconfigure flag that re-runs the full wizard over
  an existing tilde.config.json, allowing the user to change any previously answered choice;
  the existing config is used as default values for each wizard step.
- **FR-002**: System MUST check for a `tilde.config.json` at startup and present a config-
  first mode option if one is found or a path/URL is provided via flag.
- **FR-003**: System MUST offer an environment capture step at the start of prompt-first mode
  that scans for: existing dotfiles in `~/`, installed packages via the OS package manager,
  and content of detected rc files (`.zshrc`, `.zshprofile`, `.gitconfig`, etc.).
- **FR-004**: System MUST present detected environment values as pre-populated, user-
  confirmable defaults — the user MUST be able to accept, modify, or skip each item.
- **FR-005**: System MUST exclude any file from environment capture that matches standard
  `.gitignore` patterns (e.g., `.env`, `*.pem`, `*.key`, `secrets.*`, files in `node_modules/`,
  etc.). No value-level or entropy scanning is required; exclusion is file-path-based only.
- **FR-006**: System MUST guide prompt-first users through setup choices in this order: shell
  → package manager → version manager → languages/versions → workspace root → contexts →
  git auth method → additional tools (including direnv, pre-selected by default) →
  app configurations → account connections → secrets backend.
- **FR-007**: System MUST allow users to define one or more named developer contexts, each
  with: a label, a directory path, a git identity (name + email), a GitHub account, and
  optional environment variables.
- **FR-008**: System MUST generate and symlink shell profile files (`.zshrc`, `.zshprofile`)
  from the user's dotfiles repo location.
- **FR-009**: System MUST generate folder-level `.gitconfig` files with `includeIf` entries
  for each defined context and symlink them into their respective directories.
- **FR-010**: If the user selects direnv, system MUST generate `.envrc` files per context,
  referencing any environment variable values through the user's chosen secrets backend
  (no plaintext values). If direnv is deselected, `.envrc` generation is skipped and
  per-context env vars are not automatically loaded.
- **FR-011**: System MUST install all packages the user selected via the configured package
  manager (Homebrew for macOS MVP).
- **FR-012**: System MUST write a complete, versioned `tilde.config.json` to the dotfiles
  repo at the end of every successful setup run.
- **FR-013**: System MUST be fully idempotent: re-running on an already-configured machine
  MUST detect existing state and skip or reconcile rather than overwrite.
- **FR-018**: System MUST checkpoint setup progress after each completed step and persist
  it to a local state file. On re-run following a partial or failed setup, tilde MUST
  resume from the last successfully completed step rather than restarting from the beginning.
- **FR-014**: System MUST support config-first mode: load a `tilde.config.json`, display a
  summary, confirm with the user, and apply it without requiring wizard interaction for
  already-answered fields.
- **FR-015**: System MUST validate `tilde.config.json` against a published schema at load
  time and report clear, field-level errors for any invalid or missing values.
- **FR-016**: System MUST never write a resolved secret value to any file or to
  `tilde.config.json`; all credential references MUST use the chosen backend's reference
  format (e.g., `op://` URIs).
- **FR-017**: System MUST connect the configured GitHub account(s) using the user's chosen
  auth method (gh CLI auth, HTTPS credential helper, or SSH key) per context.

### Key Entities

- **tilde.config.json**: The portable, versioned configuration file. Records all user choices
  made during setup. Drives config-first restore. Committed to the dotfiles repo. Contains:
  schema version, OS, shell, package manager, version managers, languages, workspace root,
  contexts array, tool list, configuration domains enabled, and account connections (without
  secrets).
- **Developer Context**: A named environment boundary. Attributes: label, directory path, git
  name, git email, GitHub account identifier, auth method, environment variable references,
  optional VS Code profile name.
- **Environment Capture Report**: Transient scan result from an existing machine. Contains:
  detected dotfile paths, detected package list, parsed rc file content. Used to pre-populate
  wizard defaults; never persisted directly.
- **Dotfiles Repo**: A separate, user-owned git repository (location user-defined at setup
  time) where tilde stores managed dotfile source files. The dotfiles repo has no submodule
  or ownership relationship with the tilde project. All managed configs live here; symlinks
  point back to it. Tilde writes file content but does not manage git commits or history.
- **Plugin**: A registered integration module that implements tilde's extension API for a
  specific tool category (secrets backend, package manager, account connector, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer on a fresh Mac can complete the full wizard and have a working
  developer environment — tools installed, dotfiles linked, contexts wired — in under
  15 minutes from pasting the bootstrap script.
- **SC-002**: 100% of wizard choices are captured in `tilde.config.json` and running
  config-first mode with that file on a second machine produces an identical environment
  state.
- **SC-003**: Re-running `tilde install` on an already-configured machine produces zero
  changes to the filesystem — pure idempotency, verifiable by diffing machine state before
  and after.
- **SC-004**: Environment capture correctly identifies at least 90% of existing Homebrew
  packages, dotfiles, and rc file configurations on a typical developer machine without
  manual input.
- **SC-005**: After setup, changing into a configured context directory results in the correct
  git identity and environment variables being active within one second.
- **SC-006**: A developer using config-first mode spends zero time re-answering previously
  configured choices — only missing or explicitly changed fields trigger prompts.

## Assumptions

- Target user is a macOS developer on Apple Silicon (arm64) running zsh — this is the
  personal MVP scope; other platforms are out of scope for this spec.
- Homebrew is the only supported package manager in this spec; additional package managers
  are deferred to future specs.
- Windows support is entirely out of scope for this spec.
- The user has internet access during the bootstrap and install steps.
- The user's dotfiles repo is a new or existing git repository; tilde does not manage git
  history within it, only file content.
- direnv is the default-selected mechanism for `.envrc`-based per-context environment variable
  loading but is user-deselectable in the wizard. If not selected, per-context env vars are
  not automatically loaded on `cd`; the rest of setup proceeds normally.
- For MVP, VS Code is the only supported editor configuration domain; other editors are
  deferred.
- The first-party secrets backend plugin for MVP is 1Password CLI; Bitwarden and keychain
  backends are deferred to a future plugin spec.
- The first-party GitHub account connector for MVP is the `gh` CLI; raw HTTPS and SSH
  connectors are also supported but receive less UX polish in v1.
- The `tilde.config.json` schema is v1 for this spec; migration logic for future schema
  versions is deferred.
