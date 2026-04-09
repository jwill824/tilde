# Feature Specification: Wizard Flow Fixes & Enhancements

**Feature Branch**: `010-wizard-flow-fixes`  
**Created**: 2026-04-07  
**Status**: Implemented  
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
- **FR-003**: The wizard MUST complete step transitions without visible lag, flicker, or duplicate rendering. Step transitions MUST complete within 100ms of user input (measured from keypress to next step render).
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

---

## Phase 2 — Findings from Local Testing (2026-04-09)

After running the wizard end-to-end locally, the following issues were discovered. They are grouped into new user stories (US5–US9), bug reports (BUG-001, BUG-002), and additional functional requirements (FR-015+).

### Additional Clarifications

- **Language versioning scope**: Language version selection should be per-context, not global. The relationship is: language → version manager → version (from a pre-defined catalog). Patterns supported: `vfox` + direnv (`.envrc`), `nvm` + `.nvmrc`, `pyenv`, Python `venv`, `rbenv`.
- **Version input**: Versions should be selected from a curated catalog (dropdown), not entered as free text.
- **Workspace + contexts merge**: Steps 6 (workspace root) and 7 (contexts) should be a single unified step. Default workspace root is `~/Developer` on macOS. Contexts can optionally store personal dotfiles + tilde config inside them. Git auth, VCS accounts, and language bindings are defined per-context.
- **Package managers**: Multiple package managers may be active simultaneously (e.g., Homebrew + MacPorts).
- **Step scoping**: The wizard should use logic trees to decide which steps to show next, rather than always advancing linearly.
- **Steps 13–15 not rendering**: A rendering bug prevents the last three steps from ever showing. Must be diagnosed and fixed before Phase 2 ships.

---

### User Story 5 — Consolidated Contexts Step (Priority: P1)

Steps 6 (Workspace Directory), 7 (Workspace Contexts), 8 (Git Authentication), and 11 (Accounts) share a common subject — the user's development contexts. Presenting them as separate linear steps is confusing and forces the user to mentally connect information spread across four interruptions. They should be a single nested flow where each context is defined end-to-end: name → workspace path → git auth method → VCS account(s) → language bindings.

**Why this priority**: The separate steps currently create artificial gaps in a naturally hierarchical piece of data (a context). Merging them eliminates confusion, reduces total wizard steps by 3, and enables per-context language version binding (required for US6 removal of standalone step 5).

**Acceptance Scenarios**:

1. **Given** a user reaches the contexts step, **When** they create a new context, **Then** they are presented with a nested flow: name → workspace path → git auth → VCS account → languages (per-context).
2. **Given** a user has multiple contexts, **When** they add a second context, **Then** they repeat the nested flow for the new context without leaving the step.
3. **Given** the user has only one context, **When** the context step renders, **Then** the multi-context selection UI is simplified to a single context form.
4. **Given** a user navigates back into a previously completed context, **When** they update a field, **Then** all sub-fields of that context are restored and editable.
5. **Given** a user stores dotfiles inside a context path, **When** they specify the context workspace, **Then** they may also specify a dotfiles location within or alongside that context.

---

### User Story 6 — Language Bindings Inside Contexts (Priority: P1)

Step 5 (Languages) currently exists as a standalone global step and is redundant once contexts are introduced. Language version management is inherently per-context: a personal context might use Node 20 via nvm, while a work context uses Node 18 via vfox + direnv. The version manager choice also determines the integration mechanism (`.nvmrc`, `.envrc`, `pyproject.toml`). This step should be removed as a standalone and absorbed into context setup (US5).

**Why this priority**: A standalone global language step that doesn't model per-context requirements produces configs that don't reflect real workflows. This is a data-correctness issue.

**Acceptance Scenarios**:

1. **Given** a user is creating a context, **When** they reach the language section, **Then** they see a nested menu: select language → select version manager → select version from a catalog.
2. **Given** a user selects "Node.js" and then "nvm", **When** they pick a version, **Then** tilde adds `.nvmrc` to the context's workspace root.
3. **Given** a user selects "Python" and then "pyenv", **When** they pick a version, **Then** tilde sets up the appropriate pyenv config file.
4. **Given** a user selects a language, **When** a pre-defined version catalog is shown, **Then** available versions are listed as menu items (no free-text input required).
5. **Given** a user wants to add more than one language to a context, **When** they finish the first, **Then** they are offered the option to add another language before moving on.
6. **Given** step 5 (Languages) is removed as standalone, **When** the wizard runs, **Then** the step is no longer rendered or counted in the step registry.

---

### User Story 7 — Consistent Wizard Navigation (Priority: P1)

Back and skip navigation is currently inconsistent: some steps use interactive menu items (SelectInput with Back/Skip entries), while others rely on key bindings ('b' for back, 's' for skip). Key bindings don't work when a text input is focused — pressing 'b' types into the field instead of navigating. This inconsistency is confusing and results in users getting stuck.

**Why this priority**: Navigation is foundational to wizard UX. An inconsistent pattern means users must learn a different interaction model at each step, and the text-input-focus bug means back navigation is broken on any step with a free-text field.

**Acceptance Scenarios**:

1. **Given** a user is on any wizard step with a text input, **When** they want to go back, **Then** they can do so without the back key typing into the text field.
2. **Given** a user is on any wizard step, **When** they want to navigate back or skip, **Then** the mechanism is the same across all steps (no per-step variation in interaction model).
3. **Given** a user is on step 9 (Tools) in the multi-select phase, **When** they press back, **Then** they return to the previous step.
4. **Given** an optional step, **When** the user skips it, **Then** the skip action behaves identically to all other optional steps.
5. **Given** the first step, **When** back is attempted, **Then** the back option is absent or clearly disabled.

---

### User Story 8 — Multiple Package Managers (Priority: P2)

The wizard currently forces a single package manager choice (Homebrew only on macOS). Some developers use MacPorts, or have both Homebrew and MacPorts installed. The package manager step should allow multi-selection, and tool installation logic should dispatch to the correct manager per tool.

**Acceptance Scenarios**:

1. **Given** a user reaches the package manager step, **When** they see the options, **Then** they can select more than one (e.g., Homebrew + MacPorts).
2. **Given** a user selects multiple package managers, **When** the wizard completes, **Then** each tool is installed via the package manager that provides it.
3. **Given** a tool is only available in Homebrew, **When** MacPorts is the only selected manager, **Then** the tool is flagged as unavailable rather than silently omitted.

---

### User Story 9 — Enhanced Environment Discovery (Priority: P2)

Step 1 (Environment Capture) currently scans for high-level system info. It should also detect: existing language installations (node, python, java, go, ruby), version managers already installed (nvm, pyenv, vfox, rbenv), dotfiles at `~` or standard macOS Unix paths, and — when Homebrew is installed — which packages are direct installs vs. transitive dependencies.

**Acceptance Scenarios**:

1. **Given** a machine has nvm and Node 20 installed, **When** step 1 runs, **Then** the wizard pre-populates the Node.js entry for the current context with version 20 and version manager nvm.
2. **Given** a machine has dotfiles at `~/.zshrc`, `~/.gitconfig`, etc., **When** step 1 runs, **Then** the wizard surfaces these as detected dotfiles and offers to incorporate them.
3. **Given** Homebrew is installed, **When** step 1 runs, **Then** directly-installed packages (via `brew leaves`) are distinguished from transitive dependencies.
4. **Given** no version manager is installed, **When** the language step (inside contexts) renders, **Then** the user is offered the option to install one as part of setup.

---

### Bugs Identified in Local Testing

#### BUG-001 — Steps 13, 14, 15 Do Not Render (Critical)

Steps 13 (Config Export), 14 (Browser Selection), and 15 (AI Coding Tools) do not appear when running the wizard locally. The wizard appears to stall or silently skip past them. Root cause unknown — likely a rendering or conditional logic issue in `wizard.tsx`. Must be diagnosed and fixed before any wizard release.

#### BUG-002 — Back Key in Text Inputs Types Instead of Navigates

In any step that uses a text input (`ink-text-input`), pressing 'b' (the intended back key binding) inserts the character 'b' into the input field rather than triggering back-navigation. This is a fundamental conflict between key binding and focus management. The fix is to always surface back-navigation as an explicit menu item or a dedicated UI element outside the text input, not as a key binding intercepted via `useInput`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard MUST allow users to navigate to the previous step at any point after the first step, with all previously entered values restored exactly as submitted.
- **FR-002**: The wizard MUST disable or hide the back action on the first step, with no error or crash.
- **FR-003**: The wizard MUST complete step transitions without visible lag, flicker, or duplicate rendering. Step transitions MUST complete within 100ms of user input (measured from keypress to next step render).
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
- **FR-015**: Steps 6, 7, 8, and 11 MUST be merged into a single "Contexts" step that guides the user through a nested per-context flow: name → workspace path → git auth → VCS account → language bindings.
- **FR-016**: Step 5 (Languages) MUST be removed from the step registry as a standalone step. All language + version manager configuration MUST occur inside the Contexts step.
- **FR-017**: Language version selection inside a context MUST use a pre-defined version catalog (dropdown list), not a free-text input field.
- **FR-018**: Language + version manager selection inside a context MUST be presented as a nested menu: select language → select version manager for that language → select version from catalog.
- **FR-019**: The version manager choice for a language MUST determine the integration artifact created (e.g., nvm → `.nvmrc`, vfox → `.envrc`, pyenv → `.python-version`).
- **FR-020**: Back and skip navigation MUST use a consistent interaction pattern across all wizard steps. Key-binding-only back MUST NOT be used on any step that contains a focused text input.
- **FR-021**: Steps 13 (Config Export), 14 (Browser Selection), and 15 (AI Coding Tools) MUST render correctly when reached in the wizard.
- **FR-022**: The wizard MUST allow selection of multiple package managers simultaneously (e.g., Homebrew + MacPorts).
- **FR-023**: Step 1 (Environment Capture) MUST detect and surface existing language installations and version managers.
- **FR-024**: Step 1 MUST detect dotfiles at `~` and standard macOS Unix paths and offer to incorporate them.
- **FR-025**: When Homebrew is installed, step 1 MUST distinguish directly-installed packages (via `brew leaves`) from transitive dependencies.
- **FR-026**: Wizard step sequencing MUST support logic tree / scoped step transitions: the next step shown MUST be determined by the user's prior answers, not always the next linear index.
- **FR-027**: The wizard MUST include a final Apply step that presents a summary of the full configuration and offers the user the choice to (a) apply the configuration immediately (install tools, write dotfiles, configure shell) or (b) save the config and apply later via `tilde install`.
- **FR-028**: The wizard MUST display a persistent sidebar panel showing all steps, marking each as completed (✓), current (▶), or pending. Completed steps MUST show a brief summary of the user's selection inline. Optional steps MUST be labeled as such (opt).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of wizard steps support backward navigation — a user can return from any step to the previous step and find their previously entered values intact.
- **SC-002**: Developers with multi-language workspace contexts can bind a version to each language in a single wizard pass — zero languages silently dropped.
- **SC-003**: A developer who runs a config-dependent command with a discoverable config present is presented with a config-discovery prompt in 100% of cases — the wizard is never launched unexpectedly.
- **SC-004**: At least 3 note-taking applications (Obsidian, Notion, Bear) are available for selection in the wizard applications step and installable without manual config edits.
- **SC-005**: 90% of developers who navigate backward through the wizard reach their target step with all previously entered data intact on the first attempt.
- **SC-006**: Steps 6, 7, 8, and 11 are replaced by a single Contexts step; total step count reduces by 3 (from 16 to 13 or fewer with logic-tree skipping).
- **SC-007**: Steps 13, 14, and 15 render and complete successfully when reached.
- **SC-008**: Back navigation works on every step including those with text inputs — pressing any back affordance never inserts a character into a text field.
- **SC-009**: The wizard selects which steps to show based on prior answers — a user who selects no git-related tools is not shown the git auth step.

## Assumptions

- Spec 008 is the baseline: back-navigation and config-required behavior were implemented there. This spec addresses regressions (#67, #66) and extends behavior (#74, #82) on top of that foundation.
- "Discoverable config locations" are searched in priority order: (1) current working directory, (2) git repo root of cwd, (3) `~/.tilde/tilde.config.json`. The canonical location (`~/.tilde/`) supports symlinks — the expected pattern is that users maintain a versioned tilde config repository and symlink `~/.tilde/tilde.config.json` into it. Users without a versioned config default to `~/.tilde/tilde.config.json` as a plain file.
- Note-taking apps are assumed to be installable via Homebrew Cask where available (Obsidian, Notion). Apps without a Homebrew formula (e.g., Bear via App Store only) should be shown as unavailable for package manager installation.
- The language version step regression (#66) is isolated to the rendering of multi-language selections — the underlying config data model for multiple language bindings is assumed to already support it.
- Windows support and Linux support remain out of scope for this spec. All wizard behavior targets macOS.
- Apple Notes is not installable via a package manager and should be treated as a non-installable catalog entry if included.

---

## Phase 3 — Final Review Outcomes (2026-04-09)

All implementation work is complete. The following findings from the final code review were remediated before merge.

### Findings Resolved

| ID | Severity | Description | Resolution |
|----|----------|-------------|-----------|
| H1 | HIGH | 11 integration test imports used old numeric step file names | All imports in `wizard-flow.test.tsx` updated to new descriptive names |
| H2 | HIGH | 3 ESLint errors (unused `SelectInput` import, unused `data` param, unused destructure var `_`) | Removed unused import in `ai-tools.tsx`; renamed to `_data` in `wizard.tsx`; replaced destructure-discard in `runner.ts` with `Object.fromEntries()` |
| H3 | HIGH | `PackageManagerStep` lost user selection on back-navigation — history frame was popped before being read | Added `poppedFrame` state in `wizard.tsx`; `goBack()` now saves the popped frame; `initialValues` prefers `poppedFrame` when `stepIndex` matches |
| H4 | HIGH | `src/steps/accounts.tsx` was orphaned dead code (never imported after context unification) | Deleted via `git rm` |
| M1 | MEDIUM | Dead `hasAccount` conditional in `getNextStep()` case 5 — both branches returned `6` identically | Removed dead `if` block; case now unconditionally returns `6` |

### Additional Changes During Final Review

- **Default dotfiles path**: Changed from `{context-path}/dotfiles` to `{workspaceRoot}/dotfiles` — one shared dotfiles repo per workspace, consistent with how dotfiles repos work in practice (e.g., `~/Developer/dotfiles/tilde.config.json`).
- **Step file renames**: All 17 step files renamed from numeric-prefixed names (`07-contexts.tsx`) to descriptive names (`contexts.tsx`). Step ordering is now purely a registry concern in `wizard.tsx`, not embedded in file names.
- **`config.languages` nullish guard**: Added `?? []` guard in `src/installer/index.ts` — TildeConfig assembled piecemeal in the wizard bypasses Zod's `.default([])`, so `languages` could be `undefined` at apply time.

### Test Coverage at Completion

- **Unit**: 208/208 passing (`npm test`)
- **Integration**: 42/42 passing (`npx vitest run --config vitest.integration.config.ts`)
- **Contract**: passing (`npx vitest run --config vitest.contract.config.ts`)
- **Lint**: 0 errors (`npx eslint src/`)
