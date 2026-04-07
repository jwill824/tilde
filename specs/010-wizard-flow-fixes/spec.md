# Feature Specification: Wizard Flow Fixes & Enhancements

**Feature Branch**: `010-wizard-flow-fixes`  
**Created**: 2026-04-07  
**Status**: In Progress  
**GitHub Issues**: #67, #66, #74, #82  

## Clarifications

### Session 2026-04-07

- Q: When a user responds "no" to the config discovery prompt, what should tilde do? → A: Exit with a clear instruction — display "Run `tilde install --config <path>` to proceed" and terminate without launching the wizard.
- Q: When a language version is left blank in the wizard, how should it appear in the saved config? → A: Omit the key entirely — no null, no empty string; absence signals "unbound".
- Q: What locations should tilde search when discovering a config without `--config`? → A: In order — (1) current working directory, (2) git repo root of cwd, (3) `~/.tilde/tilde.config.json`. The canonical location (`~/.tilde/`) may be a symlink into a user's version-controlled tilde config repo; if no config exists anywhere, it is also the default creation target.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fluid Wizard Navigation (Priority: P1)

A developer running the tilde setup wizard encounters awkward pauses, jarring transitions between steps, or gets stuck in a loop with no clear way to move forward or back. The wizard should feel continuous and smooth: every transition is immediate, progress is always visible, and a user can move forward and backward without losing their work or triggering unintended side effects.

**Why this priority**: Wizard flow friction is the single highest driver of setup abandonment. Regressions in back-navigation or step sequencing undo the core UX guarantee established in spec 008. This must be fixed before any new wizard content is added.

**Independent Test**: Can be fully tested by running the full wizard from start to finish, navigating backward at each step, and confirming that all previously entered values are restored, transitions are instant, and no step is repeated unintentionally.

**Acceptance Scenarios**:

1. **Given** a user is on any wizard step after the first, **When** they choose to go back, **Then** they are immediately returned to the previous step with all previously entered values pre-populated and no data loss.
2. **Given** a user navigates back and then forward again without making changes, **When** they reach the step they were on, **Then** the step shows the same values as before — no prompts are repeated.
3. **Given** a user is on the first wizard step, **When** they attempt to navigate back, **Then** the back action is unavailable or clearly disabled with no error.
4. **Given** the wizard is running, **When** the user moves between any two adjacent steps, **Then** the transition completes without visible lag, flicker, or duplicate rendering.
5. **Given** an optional wizard step, **When** the user skips it and later navigates back to it, **Then** the step is shown again and previously skipped state is clearly indicated.

---

### User Story 2 - Multi-Selection Language Version Binding (Priority: P1)

A developer setting up a workspace context that uses multiple languages (e.g., Node.js and Python) expects to be able to select or enter a version for each language independently in a single pass. Currently the language version step caps selection at a single language, forcing developers with polyglot projects to leave version bindings incomplete.

**Why this priority**: Language version binding is a core part of workspace context setup. Silently capping selection to one language produces invalid configs for the majority of real-world projects and is a data-correctness bug.

**Independent Test**: Can be fully tested by creating a workspace context, selecting two or more languages, and confirming that each has an independently configurable version binding that is saved to the config correctly.

**Acceptance Scenarios**:

1. **Given** a developer selects three languages (e.g., Node.js, Python, Ruby) for a workspace context, **When** the language version step renders, **Then** a version input or selector is shown for each selected language independently.
2. **Given** a developer fills in versions for two of three languages and leaves one blank, **When** they proceed, **Then** the wizard accepts the partial input, leaves the blank version unbound, and does not error.
3. **Given** a developer has completed language version binding for a context, **When** they navigate back and then return to the step, **Then** all previously entered versions are restored exactly as entered.
4. **Given** a workspace context with a single language selected, **When** the language version step renders, **Then** only that language's version input is shown — no regression for single-language projects.

---

### User Story 3 - Config Discovery Prompt (Priority: P2)

A developer runs `tilde` or `tilde install` without passing `--config`, and a `tilde.config.json` (or equivalent) file exists in a discoverable location (current directory or a standard path). Rather than silently falling back to the wizard or erroring, tilde detects the existing config and asks the developer if they want to use it.

**Why this priority**: The opposite failure mode from spec 008 US2 — where no config existed and the error was appropriate. Here, the user has a config and should never be surprised by an unexpected wizard launch or a confusing error.

**Independent Test**: Can be fully tested by placing a valid config file in the current directory, running `tilde install` without `--config`, and confirming that tilde surfaces a prompt offering to use the discovered file.

**Acceptance Scenarios**:

1. **Given** a valid config file exists in the current directory, **When** a user runs a config-dependent command without `--config`, **Then** tilde detects the file and prompts: "Found `tilde.config.json` — use this config? (yes/no/specify path)".
2. **Given** the user responds "yes" to the discovery prompt, **When** tilde proceeds, **Then** it behaves identically to having passed `--config <discovered-path>`.
3. **Given** the user responds "no" to the discovery prompt, **When** tilde proceeds, **Then** it exits and displays: "Run `tilde install --config <path>` to proceed" — the wizard is never launched from this path.
4. **Given** multiple discoverable config files exist, **When** tilde runs, **Then** it lists each candidate and lets the user select one.
5. **Given** no config file is discoverable, **When** tilde runs without `--config`, **Then** the behavior from spec 008 US2 applies: clear error with guidance.

---

### User Story 4 - Note-Taking Apps in Wizard (Priority: P3)

A developer setting up a new machine with tilde wants to include their note-taking tools — such as Obsidian, Notion, Bear, or Apple Notes — as part of the standard wizard application selection step. These apps are a common part of a developer's daily workflow and should be available alongside editors and browsers without requiring manual config edits.

**Why this priority**: Extending the wizard's application catalog is additive and low-risk. Note-taking apps are high-frequency developer tools. This is a catalog expansion, not a flow change, so it does not block the higher-priority fixes.

**Independent Test**: Can be fully tested by running the wizard to the applications step and confirming that note-taking apps appear as selectable options that install correctly via the active package manager.

**Acceptance Scenarios**:

1. **Given** a user reaches the applications step in the wizard, **When** the step renders, **Then** at least the following note-taking apps are available as selectable options: Obsidian, Notion, Bear.
2. **Given** a user selects Obsidian (or any note-taking app) in the applications step, **When** the wizard completes and installation runs, **Then** the selected app is installed via the active package manager.
3. **Given** a note-taking app is already installed on the machine, **When** the applications step renders, **Then** the app is shown as already installed and pre-selected or clearly marked as present.
4. **Given** a note-taking app is not available via the active package manager (e.g., Apple Notes), **When** it appears in the list, **Then** it is shown as "not installable via package manager" and excluded from the installation run.

---

### Edge Cases

- What happens when the wizard state is corrupted mid-session (e.g., process killed between steps)? The wizard should resume cleanly or restart without leaving partial config artifacts.
- What happens when a config file detected during discovery is present but malformed? Tilde should warn the user and offer to skip it rather than crashing.
- What happens when navigating back past the language selection step and the user changes which languages are selected? All previously entered version bindings for removed languages must be cleared; bindings for retained languages must be preserved.
- What happens when a note-taking app requires additional setup beyond package manager installation (e.g., account login)? The wizard should note that post-install setup is required but not block the overall flow.
- What if more than one config file is found in discoverable paths and the user cancels the selection prompt? Tilde should exit cleanly with a message explaining how to proceed.


## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard MUST allow users to navigate to the previous step at any point after the first step, with all previously entered values restored exactly as submitted.
- **FR-002**: The wizard MUST disable or hide the back action on the first step, with no error or crash.
- **FR-003**: The wizard MUST complete step transitions without visible lag, flicker, or duplicate rendering.
- **FR-004**: When a user navigates back and then forward without making changes, the wizard MUST NOT re-prompt for information already provided.
- **FR-005**: The language version binding step MUST display an independent version input for each language selected in the workspace context — with no cap on the number of languages.
- **FR-006**: The wizard MUST accept partial language version input; languages left blank MUST have their version key omitted entirely from the saved config (no null, no empty string).
- **FR-007**: When a user navigates back through the language version step and returns, the wizard MUST restore all previously entered version values.
- **FR-008**: When a config-dependent command is run without `--config`, tilde MUST search the following locations in order before launching the wizard or returning an error: (1) current working directory, (2) git repo root of the current directory, (3) `~/.tilde/tilde.config.json`. The `~/.tilde/tilde.config.json` path MAY be a symlink to a file inside a user's version-controlled config repository.
- **FR-009**: When a discoverable config is found, tilde MUST prompt the user to confirm use of that file, offering: use it, skip it (exits with instruction to pass `--config <path>` explicitly), or specify a different path.
- **FR-010**: When multiple discoverable config files exist, tilde MUST present all candidates and allow the user to select one.
- **FR-011**: When no discoverable config is found and `--config` is absent, the behavior defined in spec 008 FR for US2 MUST be preserved (clear error with actionable guidance).
- **FR-012**: The wizard applications step MUST include note-taking apps as selectable options, including at minimum: Obsidian, Notion, and Bear.
- **FR-013**: Note-taking apps that are already installed on the machine MUST be shown as installed and either pre-selected or clearly distinguished from uninstalled options.
- **FR-014**: Note-taking apps that cannot be installed via the active package manager MUST be shown as unavailable for installation rather than hidden or causing an error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of wizard steps support backward navigation — a user can return from any step to the previous step and find their previously entered values intact.
- **SC-002**: Developers with multi-language workspace contexts can bind a version to each language in a single wizard pass — zero languages silently dropped.
- **SC-003**: A developer who runs a config-dependent command with a discoverable config present is presented with a config-discovery prompt in 100% of cases — the wizard is never launched unexpectedly.
- **SC-004**: At least 3 note-taking applications (Obsidian, Notion, Bear) are available for selection in the wizard applications step and installable without manual config edits.
- **SC-005**: 90% of developers who navigate backward through the wizard reach their target step with all previously entered data intact on the first attempt.

## Assumptions

- Spec 008 is the baseline: back-navigation and config-required behavior were implemented there. This spec addresses regressions (#67, #66) and extends behavior (#74, #82) on top of that foundation.
- "Discoverable config locations" are searched in priority order: (1) current working directory, (2) git repo root of cwd, (3) `~/.tilde/tilde.config.json`. The canonical location (`~/.tilde/`) supports symlinks — the expected pattern is that users maintain a versioned tilde config repository and symlink `~/.tilde/tilde.config.json` into it. Users without a versioned config default to `~/.tilde/tilde.config.json` as a plain file.
- Note-taking apps are assumed to be installable via Homebrew Cask where available (Obsidian, Notion). Apps without a Homebrew formula (e.g., Bear via App Store only) should be shown as unavailable for package manager installation.
- The language version step regression (#66) is isolated to the rendering of multi-language selections — the underlying config data model for multiple language bindings is assumed to already support it.
- Windows support and Linux support remain out of scope for this spec. All wizard behavior targets macOS.
- Apple Notes is not installable via a package manager and should be treated as a non-installable catalog entry if included.
