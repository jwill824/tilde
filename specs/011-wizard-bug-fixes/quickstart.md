# Quickstart: Wizard Bug Fixes (Spec 011)

Quick-reference for implementing each fix. Read `research.md` and `data-model.md` for full context before starting.

## Bug 1 — Focus-Aware `(b)` Back Key

**Files**: `src/ui/step-nav.tsx`, `src/steps/contexts.tsx`, `src/steps/app-config.tsx`

1. Add `isInputFocused?: boolean` and `onAtFirstStep?: () => void` to `StepNavProps`
2. In `StepNav.useInput`: add `{ isActive: !isInputFocused }` option
3. In `StepNav.useInput`: when `!onBack && onAtFirstStep`, call `onAtFirstStep()`
4. In `wizard.tsx`: add `showFirstStepHint` state; pass `onAtFirstStep={() => setShowFirstStepHint(true)}` to StepNav (or the active step's StepNav); add hint render: `{showFirstStepHint && <Text color="yellow">Already at the first step — press (q) to quit.</Text>}`; auto-clear with `setTimeout`
5. In `contexts.tsx`: derive `isInputFocused` from the current phase (text-entry phases); pass to `<StepNav>`
6. In `app-config.tsx`: same pattern

**Test**: unit test in `wizard-navigation.test.ts` — (b) on first step shows hint; (b) during text input does not navigate back

---

## Bug 2 — Resume Exit Guard

**File**: `src/modes/wizard.tsx`

1. Locate `setCurrentStep(resumeStep + 1)` in the resume branch
2. Replace with `setCurrentStep(Math.min(resumeStep + 1, LAST_STEP))`

**Test**: unit test — checkpoint at `lastCompletedStep: 12` resumes at step 12 (not beyond)

---

## Bug 3 — Resume History Pre-population

**File**: `src/modes/wizard.tsx`

1. Add `extractStepValues(stepIdx, cfg)` function (see `data-model.md` §2 for full mapping)
2. Update resume `setHistory(...)` call to use `values: extractStepValues(idx, resumeConfig)` per frame

**Test**: unit test — after resume + back from step 5, `initialValues` contains `workspaceRoot` from saved config

---

## Bug 4 — Cursor Disappears After Apply

**File**: `src/index.tsx`

1. At the top of `main()`, before any Ink renders, add:
   ```ts
   process.stdout.write('\x1b[?25h');
   process.on('exit', () => process.stdout.write('\x1b[?25h'));
   process.on('SIGINT',  () => { process.stdout.write('\x1b[?25h'); process.exit(130); });
   process.on('SIGTERM', () => { process.stdout.write('\x1b[?25h'); process.exit(143); });
   ```

**Test**: integration test — verify SIGINT handler writes cursor-restore sequence before exiting

---

## Bug 5 — Optional Step Label Grey

**File**: `src/modes/wizard.tsx`

1. Find: `{!step.required && !done && <Text dimColor> (opt)</Text>}`
2. Change to: `{!step.required && !done && <Text> (opt)</Text>}`

**Test**: visual — run tilde, confirm "Editor Configuration (opt)" label is not fully greyed out when inactive

---

## Bug 6 — Config Summary Missing Browser / AI Tools

**File**: `src/ui/config-summary.tsx`

1. After the Secrets Backend section, add:
   ```tsx
   {config.browser && (
     <SummarySection title="Browser" items={[config.browser]} />
   )}
   {!!config.aiTools?.length && (
     <SummarySection title="AI Coding Tools" items={config.aiTools} />
   )}
   ```

**Test**: unit/snapshot test — summary with `browser: 'chrome'` and `aiTools: ['copilot']` renders both sections

---

## Feature 7 — Site Docs Update (Spec 010 Changes)

**Files**: `site/docs/src/content/docs/getting-started.md`, `site/docs/src/content/docs/config-reference.md`

### `getting-started.md`
1. Update "Navigating the wizard" section: mention `(b)` / `←` for back, `(s)` to skip optional steps
2. Replace old step list with the 13 current steps (from STEP_REGISTRY, noting which are optional)
3. Add note about MacPorts, rbenv, fnm, python-venv as new options

### `config-reference.md`
1. Add `browser` field (string, optional): `"chrome" | "firefox" | "safari" | "brave" | "arc"`
2. Add `aiTools` field (string array, optional): list of AI coding tool names
3. Update `contexts[]` to include `gitAuth`, `languages` sub-fields
4. Update `versionManagers[]` to reflect current shape (object with `name` + `languages`)
5. Add MacPorts, rbenv, fnm, python-venv to the valid values lists

---

## Commit Order

Follow conventional commits. Suggested order:
```
fix(wizard): clamp resume step to LAST_STEP to prevent blank screen
fix(wizard): pre-populate resume history frames from saved config
fix(wizard): add focus-aware isInputFocused prop to StepNav
fix(wizard): restore cursor on exit via process signal handlers
fix(wizard): remove dimColor from optional step sidebar label
fix(wizard): add browser and aiTools to config summary
docs(site): update getting-started and config-reference for spec 010
```
