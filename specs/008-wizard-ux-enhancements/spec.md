# Feature Specification: Wizard UX & CLI Interaction Improvements

**Feature Branch**: `008-wizard-ux-enhancements`  
**Created**: 2026-04-01  
**Status**: Implemented  
**Related Issues**: #49, #50, #51, #53, #59, #11, #9, #27, #47

## Clarifications

### Session 2026-04-01

- Q: Config update command interaction model → A: Interactive mini-wizard per resource (e.g., `tilde update shell` launches a focused interactive prompt for that resource only)
- Q: AI coding assistant tools — what counts as installable → A: Any tool installable via the active package manager (Homebrew); includes CLI tools (e.g., Claude Code, `gh copilot`) and desktop apps (e.g., Cursor, Claude Desktop); tools with multiple variants (e.g., Claude CLI vs Claude Desktop) are shown as distinct options labeled by purpose
- Q: Offline / no-internet behavior during installation steps → A: Warn and skip — show which tools could not be installed due to connectivity, continue the wizard, user can retry later via `tilde update <resource>`
- Q: Back-navigation through multi-context configuration → A: Navigating back returns to a context list view; all previously defined contexts are preserved and remain editable from that list

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wizard Navigation & Step Usability (Priority: P1)

A developer running the tilde wizard for the first time makes a mistake midway through — they chose the wrong shell, or mistyped their git email. Currently there is no way to go back; they must abandon the session and restart from the beginning. With this improvement, users can navigate backwards to any previous step, skip optional steps, and the wizard avoids asking for information it has already collected (e.g., the user's name when entering a second workspace context).

**Why this priority**: Navigation friction and forced restarts are the single biggest source of user frustration in any interactive setup flow. Fixing this directly reduces abandonment and support requests.

**Independent Test**: Can be fully tested by running the wizard, advancing past three steps, pressing the back action, and confirming the previous step is restored with the previously entered values intact — delivering a frustration-free correction experience without requiring a full restart.

**Acceptance Scenarios**:

1. **Given** a user is on wizard step 4 of 10, **When** they choose to go back, **Then** they are returned to step 3 with their previously entered values pre-populated.
2. **Given** a user is on the first wizard step, **When** they attempt to go back, **Then** the back action is unavailable or clearly disabled.
3. **Given** a user has already provided their name in one workspace context, **When** they add a second workspace context, **Then** the wizard reuses the name without asking again.
4. **Given** a user reaches an optional wizard step (e.g., browser selection), **When** they choose to skip, **Then** the wizard advances to the next step without requiring any input.

---

### User Story 2 - CLI Hardening: Config-Required Behavior (Priority: P2)

A developer who has already set up their machine runs `tilde install` without specifying a config file path. Today this unexpectedly launches the full interactive wizard — which is disorienting for someone who has an existing config and just wants to apply it. The improved behavior should treat a missing `--config` flag as an error and guide the user toward the correct command.

**Why this priority**: Incorrect default behavior erodes trust in the tool. Users who have already gone through setup should not be accidentally dropped into a wizard they don't want.

**Independent Test**: Can be fully tested by running `tilde install` (or any config-dependent subcommand) without `--config` and confirming a clear, actionable error message is displayed with no wizard launched.

**Acceptance Scenarios**:

1. **Given** a user runs a config-dependent command without `--config`, **When** no config file is discoverable in the current context, **Then** tilde displays a clear error message explaining what is missing and how to provide it.
2. **Given** a user runs `tilde install --config ./tilde.config.json`, **When** the file exists and is valid, **Then** tilde proceeds normally with no error.
3. **Given** a user runs `tilde install` and a config file is present in the standard location (e.g., current directory), **Then** tilde discovers and uses it automatically without requiring `--config`.

---

### User Story 3 - Targeted Config Resource Updates (Priority: P2)

A developer wants to swap out a tool — say, replace their shell from `zsh` to `fish`, or add a new application to their config — without re-running the full wizard. An update command lets them target a specific resource (shell, editor, application, language version, etc.) and change only that, leaving everything else intact.

**Why this priority**: Without this, any change to a live config requires either manually editing JSON or running the full wizard again — both are error-prone. This is a key day-two workflow.

**Independent Test**: Can be fully tested by running the targeted update command for a single resource (e.g., shell), confirming only that resource changes in the saved config, and verifying all other config values are unchanged.

**Acceptance Scenarios**:

1. **Given** an existing config with a shell value of `zsh`, **When** the user runs the update command targeting the shell resource, **Then** they are prompted to select a new shell and the config is updated only for that field.
2. **Given** an existing config, **When** the user runs the update command targeting applications, **Then** they can add, remove, or modify individual applications without affecting other sections.
3. **Given** an invalid resource name is passed to the update command, **When** the command runs, **Then** tilde displays a list of valid updatable resources and exits without modifying the config.
4. **Given** the user runs `tilde update languages` and multiple workspace contexts exist, **When** the mini-wizard opens, **Then** a context selector is presented first; once a context is selected, the language binding form for that context is shown; only the selected context's `languageBindings` field is updated in the config.

---

### User Story 4 - Browser Selection Wizard Step (Priority: P3)

A developer setting up a new machine with tilde wants to install their preferred browser and optionally set it as the system default — all within the same wizard flow they already use for shell, editor, and applications. A dedicated browser step detects already-installed browsers, lets the user select additional ones for installation, and offers to configure a default.

**Why this priority**: Browser is a universal developer tool and a natural complement to the existing wizard steps. Addressing it in the wizard completes the "fresh machine" setup story.

**Independent Test**: Can be fully tested by running the wizard to the browser step, selecting a browser not currently installed, and verifying it is installed and optionally set as default — independently of all other wizard steps.

**Acceptance Scenarios**:

1. **Given** a user reaches the browser wizard step, **When** the step loads, **Then** already-installed browsers are listed and pre-selected, and additional supported browsers are shown as installable options.
2. **Given** a user selects a browser that is not installed, **When** they confirm and proceed, **Then** the browser is installed via the active package manager.
3. **Given** a user selects a browser as the default, **When** the step completes, **Then** the operating system is configured to use that browser for web links (with a clear user prompt if system confirmation is required).
4. **Given** a user skips the browser step entirely, **When** the wizard continues, **Then** no browser is installed or changed, and the step is not marked incomplete.

---

### User Story 5 - Additional Editor Support (Priority: P3)

A developer who uses Cursor, a JetBrains IDE, or Neovim as their primary editor runs the tilde wizard and expects their editor to be available for selection and configuration — not just VS Code. The wizard's editor/configurations step is extended to surface all supported editors, letting users choose and optionally apply editor-specific profile or settings configuration.

**Why this priority**: VS Code is common but not universal. Excluding other editors limits tilde's audience and makes it less useful for a significant portion of developers.

**Independent Test**: Can be fully tested by running the wizard configurations step, selecting Cursor or a JetBrains IDE, and confirming the selection is saved to the config without requiring VS Code to be present.

**Acceptance Scenarios**:

1. **Given** a user reaches the editor selection step, **When** the step loads, **Then** Cursor, JetBrains IDEs (IntelliJ, WebStorm, etc.), Neovim, and Zed are listed alongside VS Code as options.
2. **Given** a user selects Neovim, **When** the step completes, **Then** the config records Neovim as the selected editor and any available dotfile-based configuration is applied.
3. **Given** a user selects a JetBrains IDE, **When** the step completes, **Then** the config records the selection; settings sync guidance is presented if applicable.
4. **Given** a user selects multiple editors, **When** the wizard completes, **Then** all selected editors are recorded and the primary editor is indicated.

---

### User Story 6 - AI Coding Assistant Tools Wizard Step (Priority: P3)

A developer setting up their machine uses one or more AI coding assistants as essential tools — ranging from CLI tools like Claude Code and `gh copilot`, to desktop apps like Cursor and Claude Desktop. The wizard includes a dedicated step showing all AI tools installable via the active package manager (Homebrew). Where a tool has multiple variants (e.g., Claude Code CLI vs. Claude Desktop app), each variant is shown as a distinct option with a purpose label, so the user can make an informed choice. Selected tools are installed and recorded in the config.

**Why this priority**: AI coding assistants have become a standard part of the modern developer workflow. Including them in the wizard keeps tilde current with how developers actually work.

**Independent Test**: Can be fully tested by running the wizard to the AI tools step, selecting at least one assistant, and confirming the selection is saved to the config and the tool is installed if not already present.

**Acceptance Scenarios**:

1. **Given** a user reaches the AI coding assistant step, **When** the step loads, **Then** a curated list of popular AI coding tools is shown with installation status for each.
2. **Given** a user selects GitHub Copilot, **When** the step completes, **Then** the tool is recorded in the config and installation instructions or automatic installation is triggered.
3. **Given** a user skips the AI tools step, **When** the wizard continues, **Then** no AI tools are installed or configured, and the step is not required to complete setup.

---

### User Story 8 - Reconfigure Existing Setup (Priority: P2)

A developer who ran the wizard weeks ago wants to re-run it against their existing config — perhaps to change their shell, add contexts, or onboard to a new machine where the config already exists. Running `tilde --reconfigure` loads the existing config, pre-populates all wizard steps with the current values, and overwrites the config on completion. If the config file cannot be found (ENOENT), an actionable error is shown and the wizard is never launched. If the config has validation issues, partial values are extracted and surfaced as warnings before the wizard opens.

**Why this priority**: Without `--reconfigure`, changing any value in a wizard-generated config requires either manually editing JSON (error-prone) or running the full unguided wizard from scratch (loses existing values). This closes the day-two reconfiguration loop.

**Independent Test**: Run `tilde --reconfigure` with an existing valid config → wizard opens with all fields pre-populated. Complete the wizard → the same config file is overwritten with the updated values. Run with a missing config path → clear ENOENT error is displayed, wizard is not launched.

**Acceptance Scenarios**:

1. **Given** a valid `tilde.config.json` exists at the resolved config path, **When** the user runs `tilde --reconfigure`, **Then** the wizard opens with all existing field values pre-populated.
2. **Given** the wizard completes after a `--reconfigure` session, **When** the config is saved, **Then** the original config file at the same path is atomically overwritten with the updated values.
3. **Given** `tilde --reconfigure` is run and no config file exists at the resolved path, **When** the command starts, **Then** a clear error message is shown (referencing the searched path) and the wizard is NOT launched.
4. **Given** `tilde --reconfigure` is run and the config file has validation errors, **When** the command starts, **Then** the invalid fields are listed as warnings and the wizard opens with the remaining valid fields pre-populated; the user is not blocked.

---

### User Story 7 - Language Version Scoping Per Workspace Context (Priority: P4)

A developer who switches between a personal project (using Node 22) and a work project (using Java 21) wants tilde to automatically activate the correct language runtime when they enter each workspace context. When a context is activated, the appropriate language version is set without any manual intervention.

**Why this priority**: Language version conflicts are a common pain point for multi-project developers. Automating this within the context model extends the value of workspace contexts substantially.

**Independent Test**: Can be fully tested by defining two workspace contexts each with a different language version, switching between them, and confirming the active language version changes to match the context — without any other wizard steps needing to be run.

**Acceptance Scenarios**:

1. **Given** a workspace context has Node 22 configured, **When** that context is activated, **Then** Node 22 becomes the active runtime.
2. **Given** a workspace context has Java 21 configured, **When** that context is activated, **Then** Java 21 becomes the active runtime.
3. **Given** a workspace context has no language version configured, **When** that context is activated, **Then** the system default runtime is used and no error is shown.
4. **Given** a user is in the wizard's workspace context step, **When** they configure a context, **Then** they can optionally specify one or more language runtimes and versions for that context.
5. **Given** the specified language version is not installed, **When** the context is activated, **Then** the user is prompted to install it or shown instructions for doing so.

---

### Edge Cases

- What happens when a user navigates back past the first step of a multi-context configuration (e.g., after defining two contexts)? Navigating back from the context configuration step returns to a context list view; all previously defined contexts are preserved and remain editable or removable from that list. No contexts are lost on back-navigation.
- How does the wizard handle a browser that requires system-level permissions to set as default and the user denies the prompt?
- What happens when the update command is run against a config that has been manually edited and contains unknown fields?
- How does language version switching behave when the version manager (vfox/nvm) is not installed or misconfigured?
- What happens when a user selects an editor during setup that is not yet installed?
- How does the wizard behave if the user's machine has no internet connection during the AI tools or browser steps? If connectivity is unavailable during any installation step, tilde MUST warn the user, list the tools that could not be installed, and continue the wizard without blocking. The user can retry failed installs at any time via `tilde update <resource>`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to navigate to any previously completed wizard step using a back action, with previously entered values pre-populated.
- **FR-002**: The wizard MUST allow users to skip any step marked as optional without requiring input.
- **FR-003**: The wizard MUST reuse already-collected values (e.g., user name) across steps and contexts without prompting again.
- **FR-004**: Running a config-dependent command without a discoverable config file MUST result in a clear error message with guidance — the wizard MUST NOT be invoked automatically.
- **FR-005**: tilde MUST automatically discover a config file in the standard location (current directory, `~/.config/tilde/`, or `~/`) when `--config` is not specified. When a config is found via auto-discovery, tilde MUST display the resolved file path and a summary of the settings that will be applied, and MUST require explicit user confirmation before proceeding.
- **FR-006**: Users MUST be able to update a single named configuration resource (shell, editor, applications, languages, etc.) via an interactive mini-wizard (e.g., `tilde update shell`) without affecting other parts of the config. Non-interactive flag-based updates are out of scope for this spec.
- **FR-007**: The targeted update command MUST validate the resource name and display available resource types when an invalid name is provided.
- **FR-008**: The wizard MUST include a browser selection step that detects installed browsers and offers installation of supported options.
- **FR-009**: The browser step MUST offer to configure a system default browser, with clear messaging if a system confirmation dialog is required.
- **FR-010**: The wizard MUST include an editor selection step offering VS Code, Cursor, JetBrains IDEs, Neovim, and Zed as options.
- **FR-011**: The wizard MUST include an AI coding assistant step listing all tools installable via the active package manager (CLI tools such as Claude Code and `gh copilot`, and desktop apps such as Cursor and Claude Desktop). Tools with multiple variants (e.g., Claude CLI vs. Claude Desktop) MUST appear as distinct entries labeled by purpose. Installation status for each tool MUST be shown. Each AI tool MUST be implemented as an `AIToolPlugin` (see Plugin Interface Extensions in the data model) — the step MUST NOT embed tool definitions as inline literals.
- **FR-012**: Each workspace context MUST support optional language runtime and version configuration.
- **FR-013**: When a workspace context is activated, any configured language runtime versions MUST be applied automatically.
- **FR-014**: When a configured language version is not installed, tilde MUST prompt the user to install it or provide clear installation guidance.
- **FR-015**: When a user navigates back to the workspace context step, the wizard MUST display a list of all previously defined contexts with options to edit or remove each; no context data MUST be lost on back-navigation.

- **FR-016**: Running `tilde --reconfigure` with a discoverable config MUST load the existing config, pre-populate all wizard steps with current values, and atomically overwrite the original config file on wizard completion.
- **FR-017**: Running `tilde --reconfigure` when no config file is discoverable MUST display a clear error message referencing the searched path and MUST NOT launch the wizard.
- **FR-018**: Running `tilde --reconfigure` when the config file has validation errors MUST display the invalid field list as warnings and open the wizard with the remaining valid fields pre-populated; the user MUST NOT be blocked from proceeding.

### Key Entities

- **Wizard Step**: A single interactive screen in the setup flow; has a type (required/optional), position, input values, and navigation state (visited, skipped, completed).
- **Workspace Context**: A named environment profile (e.g., "personal", "work") containing shell preferences, tools, and language version bindings.
- **Language Binding**: An association between a workspace context and a specific language runtime and version (e.g., Node 22, Java 21, Python 3.12).
- **Configuration Resource**: A named top-level section of the config that can be independently targeted for updates (shell, editor, applications, browser, AI tools, contexts).
- **AIToolPlugin**: A plugin implementing the `ai-tool` category. Each supported AI coding tool (Claude Code, Claude Desktop, Cursor, etc.) MUST be registered as an `AIToolPlugin` instance; the AI tools wizard step renders the plugin registry dynamically rather than embedding tool definitions as literals. Cursor appears in both the editor and AI tools plugin registries as separate entries labeled by context ("Cursor — editor" vs "Cursor — AI coding assistant").
- **ReconfigureMode**: A mode invoked by `--reconfigure` that loads an existing `TildeConfig`, passes it as `initialConfig` to the Wizard, and atomically overwrites the original config path on completion. Handles ENOENT (clear error, no wizard launch) and validation failures (warnings + partial values, wizard still opens).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can correct a mistake in any previous wizard step without restarting the wizard — 100% of wizard steps are navigable backwards.
- **SC-002**: First-time wizard completion time decreases by at least 20% compared to the current flow, measured by time from launch to config written.
- **SC-003**: Running `tilde install` without a config produces a clear, actionable error in 100% of cases — the wizard is never invoked unintentionally.
- **SC-004**: A targeted config resource update completes in under 60 seconds for any single resource.
- **SC-005**: The wizard AI coding assistant step surfaces all tools installable via the active package manager; tools with multiple variants appear as separate labeled entries.
- **SC-006**: Language version switching upon context activation completes in under 5 seconds for any configured runtime.
- **SC-007**: 90% of users completing the wizard report no required restarts due to navigation limitations (measured via post-install feedback or error log analysis).
- **SC-008**: `tilde --reconfigure` with a valid config pre-populates 100% of wizard fields correctly; the overwritten config contains only the user's updated values with no data loss from fields not visited.

## Assumptions

- Users are running macOS (arm64 or x64); Windows and Linux platform support is out of scope for this spec.
- The version manager plugin (vfox or nvm) is already installed or selected earlier in the wizard before language version scoping is configured.
- "Workspace context" refers to the existing context model introduced in spec 001; this spec extends it rather than replacing it.
- Browser default-setting behavior on macOS requires a system confirmation dialog that tilde cannot bypass; tilde will prompt the user and handle the result gracefully.
- AI coding assistant tools that require account sign-in (e.g., GitHub Copilot) will be installed only; authentication is handled outside the wizard by the tool itself.
- The targeted update command operates on an existing, valid config file; it does not create new configs from scratch.
- Editor profile/settings sync (e.g., JetBrains settings sync) is surfaced as guidance rather than automated by tilde in the first iteration of this spec.
