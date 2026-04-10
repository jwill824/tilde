# Research: Wizard Bug Fixes (Spec 011)

## R1 — Ink `useInput` Focus Semantics

**Question**: How do we prevent `StepNav`'s `(b)` handler from firing when a `TextInput` has keyboard focus?

**Finding**: Ink's `useInput(handler, { isActive })` is the only supported mechanism for conditionally disabling a key handler. When `isActive = false`, the handler is never called regardless of what keys are pressed. `ink-text-input` does not emit `onFocus`/`onBlur` events — it captures all keyboard input while rendered without a focus notification API.

**Pattern used in this spec**: Add `isInputFocused?: boolean` to `StepNavProps`. Steps that contain `TextInput` components determine their "text is focused" state from the current phase name:

```ts
// In a step with text-input phases:
const isInputFocused = phase === 'workspace-path' || phase === 'custom-input';
<StepNav ... isInputFocused={isInputFocused} />
```

```ts
// In StepNav:
useInput((input, key) => {
  if ((input === 'b' || key.leftArrow) && onBack) { onBack(); }
  if ((input === 's' || key.rightArrow) && onSkip) { onSkip(); }
  if (input === 'q') { process.exit(0); }
}, { isActive: !isInputFocused });
```

**Steps requiring this change**:
- `contexts.tsx` — phases: `workspace-path`, `git-email`, `git-name`
- `app-config.tsx` — single text-input phase (editor config path)
- Any future step with a text input

**Steps NOT requiring this change** (no text inputs):
- `shell.tsx`, `package-manager.tsx`, `version-manager.tsx`, `browser.tsx`, `ai-tools.tsx`, `secrets-backend.tsx`, `config-export.tsx`, `apply.tsx`, `config-detection.tsx`, `env-capture.tsx`, `tools.tsx` (select-only)

---

## R2 — Cursor Restoration in Terminal

**Question**: Why does the cursor disappear after `tilde` applies, and how do we restore it?

**Root cause**: Ink 6 enters raw mode and hides the cursor with `\x1b[?25l` on startup. It restores the cursor (`\x1b[?25h`) inside its internal cleanup that runs when `unmount()` is called or the React render loop exits naturally. All exit paths in `src/index.tsx` call `process.exit()` directly, which terminates the Node.js process before Ink's cleanup runs.

**Fix**: Register signal/exit handlers before any Ink rendering begins in `src/index.tsx` → `main()`:

```ts
// Cursor restore — register once before Ink renders
process.stdout.write('\x1b[?25h'); // no-op if already visible; safety net
process.on('exit', () => process.stdout.write('\x1b[?25h'));
process.on('SIGINT',  () => { process.stdout.write('\x1b[?25h'); process.exit(130); });
process.on('SIGTERM', () => { process.stdout.write('\x1b[?25h'); process.exit(143); });
```

**Exit code conventions** (POSIX):
- 130 = 128 + 2 (SIGINT / `Ctrl-C`)
- 143 = 128 + 15 (SIGTERM / `kill`)

**Alternative considered**: Wrapping each `process.exit()` call — rejected because there are 20+ call sites in `index.tsx`; the `process.on('exit')` handler fires for ALL of them.

---

## R3 — Resume Exit Guard

**Question**: Why does resuming from the last step cause the wizard to appear to exit immediately?

**Root cause**:
```ts
// wizard.tsx, resume handler:
setCurrentStep(resumeStep + 1);
```
If `checkpoint.lastCompletedStep === LAST_STEP (12)`, then `currentStep = 13`. No step branch in the render tree matches `currentStep === 13`, so nothing renders. Node.js idles with a blank terminal output — users perceive this as the wizard exiting.

**Fix**: Clamp the resume step:
```ts
setCurrentStep(Math.min(resumeStep + 1, LAST_STEP));
```
When the checkpoint was at `LAST_STEP`, the user resumes at the Apply & Finish step (step 12) and can re-apply or navigate back.

---

## R4 — Resume History Pre-population

**Question**: How do we ensure back-navigation from a resumed step shows pre-filled values?

**Root cause**: 
```ts
setHistory(
  STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
    stepIndex: idx,
    values: {},  // ← bug: empty, not derived from saved config
  }))
);
```
When user presses `(b)`, `goBack()` pops the last history frame. The wizard uses `prevFrame.values` as `initialValues` for the returned-to step. With `values = {}`, all steps reset to their blank defaults instead of showing the previously configured values.

**Fix**: Add `extractStepValues(idx: number, cfg: Partial<TildeConfig>): Record<string, unknown>` in `wizard.tsx`:
```ts
setHistory(
  STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
    stepIndex: idx,
    values: extractStepValues(idx, resumeConfig),
  }))
);
```

See `data-model.md` §2 for the full step-index-to-config-field mapping.

---

## R5 — Optional Step Label Dimming

**Question**: Why is the `(opt)` label grey and how do we fix it?

**Root cause**: `wizard.tsx` sidebar:
```tsx
{!step.required && !done && <Text dimColor> (opt)</Text>}
```
`dimColor` in Ink renders text at ~50% opacity (grey). Combined with the outer label's `dimColor={!done && !active}`, upcoming optional steps render fully grey, indistinguishable from disabled controls.

**Fix**: Remove `dimColor` from the `(opt)` suffix `<Text>`:
```tsx
{!step.required && !done && <Text> (opt)</Text>}
```
The step label continues to dim as before for inactive steps. Only the `(opt)` marker becomes non-dimmed, making it look like an annotation rather than a state indicator.

---

## R6 — Config Summary Missing Fields

**Question**: Where in `config-summary.tsx` should `browser` and `aiTools` be added?

**Finding**: `src/ui/config-summary.tsx` currently renders sections in this order:
1. OS
2. Shell
3. Package Managers
4. Version Managers
5. Contexts
6. Tools
7. Editor Configuration *(optional)*
8. Secrets Backend

Fields missing: `browser` (string | undefined), `aiTools` (string[] | undefined).

**Fix**: Add after "Secrets Backend":
```tsx
{config.browser && (
  <SummarySection title="Browser" items={[config.browser]} />
)}
{config.aiTools?.length && (
  <SummarySection title="AI Coding Tools" items={config.aiTools} />
)}
```

Using `SummarySection` (or equivalent pattern already in the file) to stay consistent with existing rendering style.

---

## R7 — Docs Site Content Gaps

**Question**: Which docs files need updating and what specifically changed in spec 010?

**Files to update**:

| File | Gap |
|------|-----|
| `getting-started.md` | Step list is the old pre-spec-010 format; no mention of merged Contexts step, no back-nav docs, no optional step info |
| `config-reference.md` | Missing: `browser`, `aiTools`, `contexts[].gitAuth`, `contexts[].languages`, new `versionManagers` array shape, MacPorts/rbenv/fnm/python-venv options |
| `installation.md` | Current — no changes needed |

**Spec 010 changes to document**:
1. Wizard condensed to 13 steps (steps listed in STEP_REGISTRY in `wizard.tsx`)
2. Workspace + Languages + Git Auth + Accounts merged into single "Workspace & Contexts" step
3. Back-navigation available on all steps (use `←` or `(b)`)
4. Optional steps: Editor Configuration (7), Browser Selection (9), AI Coding Tools (10)
5. New install methods: MacPorts (alongside Homebrew), rbenv/fnm (alongside nvm/asdf/vfox), python-venv (alongside pyenv)
6. Config auto-discovery: cwd → git root → `~/.tilde/tilde.config.json`
