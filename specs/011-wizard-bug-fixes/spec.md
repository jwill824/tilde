# Feature Specification: Wizard Bug Fixes

**Feature Branch**: `011-wizard-bug-fixes`  
**Created**: 2026-04-09  
**Status**: Implemented  
**GitHub Issues**: #90, #91, #92, #93, #94, #66, #103

## Clarifications

### Session 2026-04-10

- Q: What is the correct back affordance for wizard steps containing active text inputs? → A: Focus-aware (b) key — (b) triggers back navigation only when no text input field has focus; users blur the field via Esc or Tab to enable (b)-based back nav.
- Q: What happens when the user presses (b) on the very first wizard step? → A: Show a non-modal inline hint (e.g., "Already on first step — press (q) to quit") with no action required; no exit confirmation dialog.
- Q: When resuming with an existing config, do wizard steps pre-populate with saved values? → A: Yes — all wizard steps pre-populate from the saved config (full resume experience); users see their previously saved selections when navigating.
- Q: How should the summary step display optional steps that were skipped? → A: Omit skipped optional steps entirely — only configured/completed steps appear in the summary.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Back Navigation Across All Steps (Priority: P1)

A developer runs the tilde wizard and navigates forward through multiple steps. At any point, they press the (b) key to go back to the previous step and review or change their selections. Currently some steps silently ignore the (b) key, trapping the user.

**Why this priority**: Back navigation is a core interaction pattern in the wizard. Any step that doesn't support it breaks the user's mental model and forces them to restart the entire wizard to correct a mistake.

**Independent Test**: Can be fully tested by navigating to each wizard step and pressing (b) — every step must transition to the previous step, delivering a fully navigable wizard.

**Acceptance Scenarios**:

1. **Given** the user is on any wizard step beyond the first, **When** they press (b), **Then** the wizard returns to the previous step with their prior selections preserved.
2. **Given** the user is on the first step, **When** they press (b), **Then** the wizard displays a non-modal inline hint (e.g., "Already on first step — press (q) to quit") and does not navigate, exit, or crash.
3. **Given** the user presses (b) on steps that previously did not respond (e.g., Editor Configuration, Contexts, Summary), **Then** the step transitions backward just like all other steps.

---

### User Story 2 - Resuming the Wizard from Any Step (Priority: P1)

A developer partially completes the wizard, exits, and later re-runs tilde with an existing config to resume. When resuming, all wizard steps MUST pre-populate with the saved config values so the user sees their prior selections. When they reach the final step, they should be able to navigate back through the wizard to review or edit any step — not have the command exit unexpectedly.

**Why this priority**: If resuming causes an immediate exit, the resume feature is functionally broken. Users lose the ability to iteratively refine their configuration.

**Independent Test**: Can be tested by completing the wizard once, then re-running tilde with the saved config and pressing (b) from the last step — the wizard must allow full backward traversal.

**Acceptance Scenarios**:

1. **Given** a saved config exists and the user resumes, **When** the wizard reaches the final/summary step, **Then** the user can press (b) to navigate back through all prior steps.
2. **Given** a saved config exists and the user resumes, **When** the wizard is on the final step, **Then** the command does not exit unless the user explicitly confirms.
3. **Given** a resume flow, **When** the user navigates back and changes a selection, **Then** the updated selection is preserved when they reach the summary again.

---

### User Story 3 - Terminal Cursor Visible After Apply (Priority: P1)

A developer completes the wizard and tilde applies all configuration changes. After tilde finishes, the developer's terminal cursor should be visible and the terminal should be in a normal, usable state.

**Why this priority**: A missing cursor leaves the terminal in an unusable state after setup, creating a confusing and broken first impression for a tool designed to improve the developer environment.

**Independent Test**: Can be tested by running the full wizard through to completion and observing that the terminal cursor remains visible and the shell prompt is functional.

**Acceptance Scenarios**:

1. **Given** the wizard completes the apply step, **When** tilde exits, **Then** the terminal cursor is visible in the shell.
2. **Given** tilde exits after applying changes, **When** the user types in the terminal, **Then** input is echoed normally and the terminal behaves as expected.
3. **Given** tilde encounters an error during apply and exits early, **Then** the terminal cursor is still restored before exit.

---

### User Story 4 - Optional Steps Display Correctly (Priority: P2)

A developer running the wizard sees a list of steps in the sidebar. Optional steps should be clearly labelled as "(opt)" but must not appear visually disabled (greyed-out) as if they are unavailable. The current grey rendering of "Editor Configuration (opt)" misleads users into thinking they cannot interact with it.

**Why this priority**: Visual ambiguity between "optional" and "disabled" causes users to skip steps they could and should interact with, leading to incomplete configurations.

**Independent Test**: Can be tested by inspecting the wizard sidebar and all step headers — optional steps must be clearly labelled but visually active, not greyed-out.

**Acceptance Scenarios**:

1. **Given** the wizard sidebar is rendered, **When** an optional step is present, **Then** it displays in the same active colour as required steps, with "(opt)" appended to clarify optionality.
2. **Given** the user sees an optional step label, **When** they navigate to it, **Then** the step is fully interactive (not read-only or skipped).
3. **Given** required and optional steps are both shown, **When** the user scans the sidebar, **Then** the visual distinction is only about required vs optional labelling, not colour or opacity.

---

### User Story 5 - Configuration Summary Reflects All Steps (Priority: P2)

A developer reaches the summary/review step at the end of the wizard. The summary must show every configured step — including browser and AI coding tools selections — so they can verify the full configuration before applying.

**Why this priority**: If the summary omits steps, users cannot verify their setup before applying it, leading to silent misconfiguration and lack of confidence in tilde's output.

**Independent Test**: Can be tested by selecting a browser and an AI tool in the wizard, then verifying both appear in the configuration summary before apply.

**Acceptance Scenarios**:

1. **Given** the user selected a browser in the browser step, **When** they reach the summary, **Then** the selected browser(s) appear in the summary.
2. **Given** the user selected AI coding tools, **When** they reach the summary, **Then** the selected tools appear in the summary.
3. **Given** an optional step was skipped, **When** the summary is displayed, **Then** that step is omitted entirely from the summary — it does not appear as "skipped" or as a blank entry.
4. **Given** all steps are completed, **When** the summary renders, **Then** every step with a non-empty selection appears in the summary output.

---

### User Story 6 - Context Language Version Selection Works (Priority: P2)

A developer in the Contexts step wants to configure a project context with one or more programming languages and their required versions. Currently the step does not allow selecting multiple languages for a context or specifying a version per language.

**Why this priority**: Language version management is a core tilde use case (via version managers like vfox/nvm). A broken language/version selector in Contexts means the core provisioning flow cannot be completed correctly.

**Independent Test**: Can be tested by creating a context, selecting two languages (e.g., Node.js and Python) each with different versions, and verifying both are saved to the config.

**Acceptance Scenarios**:

1. **Given** the user is in the Contexts step, **When** they add a language to a context, **Then** they can also specify the desired version for that language.
2. **Given** the user adds a context, **When** they select languages, **Then** they can select more than one language per context.
3. **Given** multiple languages with versions are configured for a context, **When** the wizard completes, **Then** all language-version pairs are saved correctly in the output config.
4. **Given** an invalid or empty version is entered, **When** the user tries to proceed, **Then** the wizard shows a helpful validation message.

---

### User Story 7 - Site Docs Reflect Spec 010 Changes (Priority: P2)

A new developer visits the tilde documentation site to understand the wizard flow before running tilde for the first time. The docs must accurately describe the current 13-step wizard (condensed in spec 010), including the merged Contexts step, the back-navigation pattern, and all newly supported tools (MacPorts, rbenv, fnm, python-venv). Outdated docs describing the old flow or missing new features undermine user confidence.

**Why this priority**: Docs are often the first touchpoint. Stale documentation describing a wizard flow that no longer exists will confuse users and generate unnecessary support burden. Bundling this into the bug-fix release ensures docs ship with the fixes they describe.

**Independent Test**: Can be fully tested by reading the updated docs site and verifying every wizard step, supported tool, and navigation pattern matches the current spec 010 implementation.

**Acceptance Scenarios**:

1. **Given** a developer reads the docs wizard walkthrough, **When** they follow the steps, **Then** the docs accurately describe the current 13-step flow with no references to the old step structure.
2. **Given** the docs list supported tools, **When** a user looks up MacPorts, rbenv, fnm, or python-venv, **Then** those tools appear as supported options with correct install/config guidance.
3. **Given** the docs describe navigation, **When** a user reads the back-navigation section, **Then** the docs accurately explain that (b) navigates back from any step.
4. **Given** the Contexts step is described in the docs, **When** a user reads it, **Then** the docs reflect the merged workspace/git-auth/accounts flow, not the old separate steps.

---

### Edge Cases

- What happens when the user presses (b) on the very first step — the wizard must show a non-modal inline hint and not crash, exit, or loop.
- What happens when the user presses (b) while a text input is focused — the key must not trigger back navigation; only after blurring the field (Esc or Tab) should (b) navigate back.
- What happens when the wizard is resumed but the saved config references a step that no longer exists in the current wizard version — graceful degradation expected.
- What happens when tilde is force-killed (Ctrl+C) mid-apply — cursor should be restored via signal handler.
- What happens when an optional step has partial input and the user navigates back then forward — partial input must be preserved.
- What happens when the Contexts step has zero languages configured — summary must reflect this state accurately.
- What happens when the docs site references a wizard step or flow that changed in spec 010 — all stale references must be updated before publishing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard MUST respond to the (b) back key on every step, including previously broken steps (Editor Configuration, Contexts, AI Tools, Browser, Summary). On steps containing active text input fields, (b) MUST trigger back navigation only when no text input has focus; users can blur the focused field via Esc or Tab to enable (b)-based back navigation.
- **FR-001b**: When the user presses (b) on the first wizard step, the wizard MUST display a non-modal inline hint (e.g., "Already on first step — press (q) to quit") and MUST NOT navigate, exit, or crash.
- **FR-002**: The wizard MUST preserve all user selections when navigating backward and returning forward through steps.
- **FR-003**: The wizard MUST NOT exit unexpectedly when the user attempts to navigate back from the final/summary step during a resume flow.
- **FR-003b**: When resuming with a saved config, all wizard steps MUST pre-populate with the saved configuration values so users see their prior selections on every step.
- **FR-004**: The terminal cursor MUST be restored to a visible state when tilde exits under any condition — normal completion, user-triggered exit, or error.
- **FR-005**: Optional wizard steps MUST be rendered with the same visual style as required steps, with only a textual "(opt)" label differentiating them.
- **FR-006**: The configuration summary MUST include all configured steps, including browser selections and AI coding tool selections. Optional steps that were skipped MUST be omitted from the summary entirely — they MUST NOT appear as "skipped" labels or blank entries.
- **FR-007**: The Contexts step MUST allow the user to select multiple programming languages per context.
- **FR-008**: The Contexts step MUST allow the user to specify a version for each selected language per context.
- **FR-009**: All language-version pairs configured in a context MUST be persisted correctly in the output configuration file.
- **FR-010**: The wizard MUST display a clear validation message when a language version field is left empty or contains an invalid value; the user MUST NOT be able to proceed until the field is corrected.
- **FR-011**: The documentation site MUST be updated to accurately reflect the spec 010 wizard changes: 13-step condensed flow, merged Contexts step, back-navigation pattern, and all newly supported tools (MacPorts, rbenv, fnm, python-venv).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of wizard steps respond to the (b) back key — zero steps silently ignore it.
- **SC-002**: When resuming with a saved config, all wizard steps display the user's previously saved selections; users can navigate forward and backward through the entire wizard without losing any prior selections.
- **SC-003**: The terminal is left in a fully usable state (cursor visible, input echoed) after every tilde exit path, including errors.
- **SC-004**: The configuration summary displays all selected options from all steps — zero omissions for browser, AI tools, or any other completed step.
- **SC-005**: Users can configure at least 3 language-version pairs per context without errors.
- **SC-006**: All 6 reported bugs (#90, #91, #92, #93, #94, #66) have no reproduction path after this spec is implemented.
- **SC-007**: 100% of spec 010 wizard changes are reflected in the documentation site — zero stale step descriptions, tool listings, or navigation instructions remain.

## Assumptions

- All bugs are present in the current spec 010 wizard implementation and have been manually reproduced.
- The wizard's back-navigation uses the history stack (StepFrame[]) introduced in spec 010 — fixes should extend this pattern, not replace it.
- Terminal cursor restoration applies to macOS/zsh as the primary target platform; other platforms are out of scope for this spec.
- The Contexts step language/version fix covers the UI interaction and config persistence; runtime version installation (via vfox/nvm) is handled by the apply step and is out of scope here.
- "Resuming" means re-running tilde with a previously saved config file — not a mid-session checkpoint system.
- Optional steps are already implemented and functional; only the visual styling of their labels needs correction.
- The docs site update covers content only — no site infrastructure or design changes are in scope for this spec.
