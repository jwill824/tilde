# Implementation Plan: Wizard Bug Fixes

**Branch**: `011-wizard-bug-fixes` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-wizard-bug-fixes/spec.md`

## Summary

Fix six P0–P1 wizard bugs in the tilde CLI: (1) resume from last step causes immediate exit because `setCurrentStep(resumeStep + 1)` can set an out-of-bounds index; (2) resuming back-navigation shows blank step inputs because history frames carry `values: {}` instead of per-step values derived from the saved config; (3) cursor disappears in the terminal after the wizard applies because all `process.exit()` paths skip Ink cleanup; (4) the `(opt)` label on optional steps is dimmed grey making them look disabled; (5) Config Summary omits browser and AI coding tool selections; (6) focus-aware `(b)` back navigation does not work on text input steps because `StepNav.useInput` fires unconditionally. Additionally, update the Astro docs site to reflect spec 010's wizard changes (13-step flow, back-nav, merged Contexts step, new install methods). All changes are in TypeScript/Ink source files with Vitest test coverage; no schema changes needed.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, `.js` imports), Node.js 20+
**Primary Dependencies**: React 19, Ink 6 (CLI UI), Zod (schema validation), ink-text-input, ink-select-input
**Storage**: JSON config file (`tilde.config.json`), atomic writes via `fs.rename()`
**Testing**: Vitest — `npm test` (unit), `npm run test:integration` (integration), `npm run test:contract` (contract)
**Target Platform**: macOS (darwin), interactive TTY
**Project Type**: CLI tool (Ink/React terminal UI)
**Performance Goals**: Wizard step transitions must be instant; no perceptible delay on resume or back-nav
**Constraints**: No new npm dependencies; ESM-only (`"type": "module"`); no schema version bump required
**Scale/Scope**: 13 wizard steps; 8 source files modified; 1 new helper function; 5 docs pages updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| No new external dependencies | ✅ Pass | All changes use existing ink, react, node:process |
| Atomic file writes | ✅ Pass | No new config write paths added |
| Schema version bump required? | ✅ Pass (none) | No config schema changes in this spec |
| ESM-only (no CJS) | ✅ Pass | All files already use `.js` imports |
| Principle IV — back-nav on all steps | ✅ This spec implements it | FR-001/FR-001b: focus-safe (b) + first-step inline hint |
| Ink TTY guard preserved | ✅ Pass | `process.stdin.isTTY` check in `index.tsx` unchanged |
| macOS-only assertion remains | ✅ Pass | `assertMacOS()` guard unchanged |

## Project Structure

### Documentation (this feature)

```text
specs/011-wizard-bug-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── wizard-ux.md     # Back-nav, resume pre-population, cursor restore contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── modes/
│   └── wizard.tsx           UPDATE: resume exit guard + extractStepValues() + first-step hint
├── ui/
│   ├── step-nav.tsx         UPDATE: isInputFocused prop → focus-aware (b) key
│   └── config-summary.tsx   UPDATE: add browser + aiTools sections
├── steps/
│   ├── contexts.tsx         UPDATE: pass isInputFocused to StepNav for text-input phases
│   ├── app-config.tsx       UPDATE: pass isInputFocused to StepNav
│   └── [all text-input steps] UPDATE: thread isInputFocused prop
└── index.tsx                UPDATE: process.on('exit'/'SIGINT'/'SIGTERM') cursor restore

site/docs/src/content/docs/
├── getting-started.md       UPDATE: new 13-step wizard flow, back-nav, optional steps
├── config-reference.md      UPDATE: new fields (browser, aiTools, contexts, versionManagers)
└── installation.md          UPDATE: minor — curl installer behavior, Node 20 req

tests/
├── unit/
│   ├── wizard-navigation.test.ts   UPDATE: first-step hint, resume exit guard, pre-pop
│   └── config-summary.test.ts      UPDATE or NEW: browser + aiTools sections
└── integration/
    └── wizard-flow.test.tsx         UPDATE: cursor restore handler, focus-aware back
```

## Phase 0 — Research

### R1: Ink `useInput` Focus Detection

**Finding**: Ink's `useInput(handler, options)` accepts an `{ isActive?: boolean }` option that completely disables the handler when `false`. This is the canonical Ink pattern for focus-aware key listening. `ink-text-input` does not expose "is currently receiving keyboard input" to parent components — there is no shared focus context.

**Approach**: Add an `isInputFocused?: boolean` prop to `StepNavProps`. Steps that contain `TextInput` components track focus state via a local `useState(false)` and flip it using `TextInput`'s `onFocus`/`onBlur` callbacks (or `isFocused` prop from `ink-text-input`). The step passes this boolean down to `StepNav`. `StepNav.useInput` calls `useInput(handler, { isActive: !isInputFocused })`.

**`ink-text-input` focus API**: The package supports `focus` (controlled focus) and fires `onChange`. It does NOT emit `onFocus`/`onBlur`. Instead, use Ink's `useFocus()` + `useFocusManager()` hooks to track focus — but since `StepNav` and `TextInput` are siblings (not parent/child), the simplest approach is a boolean prop from the parent step. Each step already knows when it is in a "text entry phase" (e.g., `phase === 'workspace-path'` in contexts.tsx).

**Verdict**: `isInputFocused?: boolean` prop on `StepNavProps`; steps set it based on current phase, not per-keystroke focus events.

### R2: Cursor Restoration After Process Exit

**Finding**: Ink 6 hides the terminal cursor via `\x1b[?25l` during raw mode rendering and restores it (`\x1b[?25h`) when it calls `unmount()` or when the React render loop ends naturally. When `process.exit()` is called directly (as in `index.tsx`), Node.js terminates before Ink's cleanup handlers run, leaving the cursor hidden.

**Fix**: Register cursor-restore handlers **before** rendering in `src/index.tsx`:
```ts
process.stdout.write('\x1b[?25h'); // safety: ensure cursor visible before hiding it
process.on('exit', () => { process.stdout.write('\x1b[?25h'); });
process.on('SIGINT',  () => { process.stdout.write('\x1b[?25h'); process.exit(130); });
process.on('SIGTERM', () => { process.stdout.write('\x1b[?25h'); process.exit(143); });
```
The pre-registration `write` is a no-op if cursor is already visible. The `exit` handler fires on ALL `process.exit()` calls (including the many in `index.tsx`). SIGINT/SIGTERM handlers cover `Ctrl-C` and `kill` signals.

**Note**: Exit codes 130 (SIGINT) and 143 (SIGTERM) are the POSIX-conventional values (`128 + signal_number`).

### R3: Resume Exit Bug — Root Cause

**Finding**: In `wizard.tsx` `onSelect` handler (resume branch):
```ts
setCurrentStep(resumeStep + 1);
```
`resumeStep` is loaded from `checkpoint.lastCompletedStep`. If the checkpoint was saved while at step 12 (Apply & Finish, `LAST_STEP = 12`), then `resumeStep + 1 = 13`. Since `STEP_REGISTRY` only has indices 0–12, no step branch in the render matches `currentStep === 13` — nothing renders and the process idles with a blank terminal. In practice users perceive this as "the wizard exits."

**Fix**: Clamp the resume target:
```ts
setCurrentStep(Math.min(resumeStep + 1, LAST_STEP));
```
When clamped to `LAST_STEP = 12`, the user is placed at the Apply step and can either re-apply or press `(b)` to go back and edit.

### R4: Resume History Pre-population (Empty Values)

**Finding**: The resume history is built with `values: {}` for all prior steps:
```ts
setHistory(
  STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
    stepIndex: idx,
    values: {},  // ← all empty
  }))
);
```
When the user presses `(b)` from the resumed step, `goBack()` pops the previous frame. The wizard reads `prevFrame?.values ?? {}` and passes it as `initialValues` to the returned-to step. Because `values = {}`, the step's `useState(() => initialValues.field ?? default)` initializes to the default (blank), not the saved config value.

**Fix**: Add a `extractStepValues(stepIdx: number, cfg: Partial<TildeConfig>): Record<string, unknown>` helper that returns the relevant field(s) from `cfg` for a given step index:
```ts
setHistory(
  STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
    stepIndex: idx,
    values: extractStepValues(idx, resumeConfig),
  }))
);
```
See `data-model.md` for the full mapping table.

### R5: Optional Step Label — `dimColor` Source

**Finding**: In `wizard.tsx` sidebar render:
```tsx
{!step.required && !done && <Text dimColor> (opt)</Text>}
```
The `dimColor` prop on Ink `<Text>` produces grey/dim output, which makes upcoming optional steps appear disabled. The outer step label already has:
```tsx
<Text dimColor={!done && !active}>
  {step.label}
</Text>
```
So upcoming steps (not active, not done) are already dimmed by design. Adding `dimColor` to the `(opt)` suffix doubles-down on the grey, making it look like a disabled control rather than an informational annotation.

**Fix**: Remove `dimColor` from the `(opt)` suffix `<Text>`. Keep the label dimming for inactive steps unchanged.

### R6: Config Summary — Missing Sections

**Finding**: `src/ui/config-summary.tsx` renders these sections: OS, Shell, Package Managers, Version Managers, Contexts, Tools, Editor Config, Secrets Backend. Fields `browser` and `aiTools` are present in `TildeConfig` (from spec 010) but not rendered in the summary. The `browser` field is of type `string` (e.g., `"chrome"`); `aiTools` is an array of tool-name strings.

**Fix**: Add two new sections after "Secrets Backend":
- **Browser** — single string, same pattern as Shell section
- **AI Coding Tools** — array, same pattern as Tools section

### R7: Site Docs — Out-of-Date Content

**Finding**: `site/docs/src/content/docs/getting-started.md` describes the old multi-step wizard (separate Shell, Package Manager, etc. steps listed individually, no mention of Workspace & Contexts merged step, no back-navigation note). `config-reference.md` lacks `browser`, `aiTools`, `contexts[].languages`, `versionManagers` fields. `installation.md` correctly describes the curl installer.

**Changes needed**:
- `getting-started.md`: update "Navigating the wizard" section; list the 13 current steps with optional markers; add back-navigation guidance; note MacPorts/rbenv/fnm/python-venv options
- `config-reference.md`: add `browser`, `aiTools`, `contexts[].gitAuth`, `contexts[].languages`, new `versionManagers` shapes
- `installation.md`: no substantive changes needed

## Phase 1 — Design

See [`data-model.md`](./data-model.md) for full interface and type changes.
See [`contracts/wizard-ux.md`](./contracts/wizard-ux.md) for the back-nav, resume, and cursor-restore UX contracts.
See [`quickstart.md`](./quickstart.md) for the per-bug implementation quick-reference.

## Complexity Tracking

> No Constitution violations in this spec.
