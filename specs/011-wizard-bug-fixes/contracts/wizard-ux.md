# Contract: Wizard UX — Back Navigation, Resume, Cursor Restore

**Spec**: `011-wizard-bug-fixes`  
**Supersedes**: No prior contract (spec 010 did not document these behaviors)

---

## 1. Back Navigation (`StepNav`)

### 1.1 Normal Back Navigation

When a user presses `(b)` or `←` on any step other than the first:
- The wizard navigates to the previous step
- The returned-to step is pre-filled with the values the user entered (or the saved config values on resume)
- The sidebar reflects the returned-to step as the active step

### 1.2 First-Step Back Attempt

When a user presses `(b)` or `←` on the **first step** (step 0, Config Detection):
- No navigation occurs
- An inline non-modal hint appears below the step title:  
  `"Already on the first step — press (q) to quit."`
- The hint auto-disappears after 2 seconds
- The wizard does not exit, scroll, or show a modal

### 1.3 Text Input Focus Guard

When a `TextInput` component is active (the step is in a text-entry phase):
- `(b)` and `←` key presses are captured by the `TextInput` (allow editing)
- **Back navigation does not fire**
- This is controlled via `isInputFocused: true` passed to `StepNav`, which sets `useInput({ isActive: false })`
- To trigger back navigation while typing, the user must first exit the text field (press `Esc` or `Tab` to move focus, if applicable) — or the step must be in a non-text-entry phase

### 1.4 Skip Navigation

- `(s)` or `→` is only available on optional steps (`required: false`)
- Skip is always active (not blocked by text-input focus) because skip should be accessible as a secondary affordance
- Skipping stores `values: {}` in the history frame and marks the step as not done in the sidebar

---

## 2. Resume Flow

### 2.1 Resume Prompt

When a checkpoint exists at startup, the wizard displays:
```
Resume from where you left off?
❯ Resume from step N
  Start over
```

### 2.2 Resume Step Clamping

The resumed `currentStep` is set to:
```
currentStep = min(lastCompletedStep + 1, LAST_STEP)
```

When `lastCompletedStep === LAST_STEP (12)`, the user resumes at step 12 (Apply & Finish). They can re-apply or navigate back to edit.

### 2.3 Resume History Pre-population

When "Resume" is selected:
- History frames for steps 0 through `lastCompletedStep` are populated with `extractStepValues(idx, resumeConfig)`
- Back-navigation from the resumed step pre-fills each prior step with the values from the saved config
- The user sees the same selections they made in the previous session

### 2.4 Resume Config Pre-load

`setConfig(resumeConfig)` is called before `setCurrentStep(...)`. All steps that read directly from the wizard's `config` state will see the saved values even before back-navigation.

---

## 3. Cursor Restoration

### 3.1 Normal Exit

When the wizard completes (apply finished, `onComplete()` → `process.exit(0)`):
- The `process.on('exit')` handler fires
- `\x1b[?25h` (show cursor) is written to stdout before process termination
- The terminal cursor is visible after tilde exits

### 3.2 Signal Exit (SIGINT / Ctrl-C)

When the user presses `Ctrl-C`:
- `process.on('SIGINT')` fires
- `\x1b[?25h` is written to stdout
- Process exits with code **130** (128 + SIGINT signal number 2)

### 3.3 SIGTERM Exit

When the process receives SIGTERM:
- `process.on('SIGTERM')` fires
- `\x1b[?25h` is written to stdout
- Process exits with code **143** (128 + SIGTERM signal number 15)

### 3.4 Error Exit

All `process.exit(1)` and `process.exit(2)` paths in `index.tsx` trigger the `'exit'` event handler automatically. No per-call cursor restoration needed.

---

## 4. Config Summary Display

When the Review & Summary step (config-export, step 11) is displayed:

The summary **includes** all configured fields:
- OS, Shell, Package Managers, Version Managers, Contexts, Tools, Editor Config *(if configured)*, Secrets Backend, Browser *(if configured)*, AI Coding Tools *(if configured)*

The summary **omits** optional sections that were skipped (per clarification Q4: skipped optional steps are omitted entirely, not shown as "not configured").

---

## 5. Optional Step Sidebar Label

Optional steps (required: false) display a `(opt)` annotation next to their label in the sidebar.

- The annotation is **not dimmed** (no `dimColor`)
- The label itself follows the same active/inactive/done color rules as required steps
- When the step is active: label is bold + cyan
- When the step is done: label is green
- When the step is upcoming/skipped: label is dimmed (the outer `<Text dimColor>` still applies to the full label), but `(opt)` itself is at the same intensity as the label
