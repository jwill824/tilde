---
status: resolved
trigger: "GitHub username input step repeats sidebar/current prompt text while typing in the Ink TUI"
created: 2026-06-20
updated: 2026-06-20
---

# Debug Session: github-username-tui-redraw

## Symptoms

- Expected behavior: typing in the GitHub username field updates the input without corrupting the surrounding TUI.
- Actual behavior: each typed character repeats the first sidebar row and current prompt text inline.
- Error messages: none.
- Timeline: observed while running `node dist/bin/tilde.js` on the phase 05 branch.
- Reproduction: advance through the wizard to `Workspace & Contexts` -> GitHub username, then type a username.

## Current Focus

- hypothesis: Long completed-step sidebar summary lines overflow the terminal row while the active `TextInput` rerenders, causing Ink redraw artifacts.
- test: Add a regression test with long inventory summary content and active context input, then constrain/truncate the sidebar layout.
- expecting: Rendered frames keep completed summaries bounded and typing in the account input does not duplicate prompt/sidebar text.
- next_action: complete

## Evidence

## Eliminated

## Resolution

- root_cause: Completed-step sidebar summaries could exceed the available row width while active step content rendered beside them, which made Ink redraws during text input spill and repeat prompt/sidebar text.
- fix: Constrained the wizard sidebar/content widths and truncated completed-step summary lines before rendering.
- verification: `npx vitest run tests/unit/wizard-navigation.test.ts`; `npm run build`; `npm run lint`.
- files_changed: src/modes/wizard.tsx, tests/unit/wizard-navigation.test.ts
