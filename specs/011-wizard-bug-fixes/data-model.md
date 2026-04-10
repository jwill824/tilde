# Data Model: Wizard Bug Fixes (Spec 011)

## 1. `StepNavProps` — Focus-Aware Back Key

**File**: `src/ui/step-nav.tsx`

```ts
interface StepNavProps {
  onBack?: () => void;
  onSkip?: () => void;
  isOptional?: boolean;
  // NEW: when true, disables (b) key so TextInput captures all keyboard input
  isInputFocused?: boolean;
  // NEW: called when (b) is pressed on the first step (canGoBack = false)
  onAtFirstStep?: () => void;
}
```

**`useInput` change**:
```ts
useInput((input, key) => {
  if ((input === 'b' || key.leftArrow)) {
    if (onBack) {
      onBack();
    } else if (onAtFirstStep) {
      onAtFirstStep(); // triggers first-step inline hint
    }
  }
  if ((input === 's' || key.rightArrow) && onSkip) { onSkip(); }
  if (input === 'q') { process.exit(0); }
}, { isActive: !isInputFocused });
```

**First-step inline hint**: `wizard.tsx` passes `onAtFirstStep` when `!canGoBack`. The hint is rendered inline as a transient message (state: `showFirstStepHint: boolean`, auto-cleared after 2s via `setTimeout`).

---

## 2. `extractStepValues` — Resume History Pre-population

**File**: `src/modes/wizard.tsx` (new internal function)

**Signature**:
```ts
function extractStepValues(
  stepIdx: number,
  cfg: Partial<TildeConfig>
): Record<string, unknown>
```

**Step-index-to-config mapping**:

| Step Idx | Step ID | `values` keys | Source in `cfg` |
|----------|---------|---------------|-----------------|
| 0 | config-detection | `{}` | No user input (detection result shown) |
| 1 | env-capture | `{}` | No user input (env read-only display) |
| 2 | shell | `{ shell }` | `cfg.shell` |
| 3 | package-manager | `{ packageManagers }` | `cfg.packageManagers` |
| 4 | version-manager | `{ versionManagers }` | `cfg.versionManagers` |
| 5 | contexts | `{ workspaceRoot, contexts }` | `cfg.workspaceRoot`, `cfg.contexts` |
| 6 | tools | `{ tools }` | `cfg.tools` |
| 7 | app-config | `{ editor, editorConfigPath }` | `cfg.editor`, `cfg.editorConfigPath` |
| 8 | secrets-backend | `{ secretsBackend }` | `cfg.secretsBackend` |
| 9 | browser | `{ browser }` | `cfg.browser` |
| 10 | ai-tools | `{ aiTools }` | `cfg.aiTools` |
| 11 | config-export | `{}` | No user input (confirmation screen) |
| 12 | apply | `{}` | No user input (action screen) |

**Implementation skeleton**:
```ts
function extractStepValues(
  stepIdx: number,
  cfg: Partial<TildeConfig>
): Record<string, unknown> {
  switch (stepIdx) {
    case 2: return { shell: cfg.shell };
    case 3: return { packageManagers: cfg.packageManagers };
    case 4: return { versionManagers: cfg.versionManagers };
    case 5: return { workspaceRoot: cfg.workspaceRoot, contexts: cfg.contexts };
    case 6: return { tools: cfg.tools };
    case 7: return { editor: cfg.editor, editorConfigPath: cfg.editorConfigPath };
    case 8: return { secretsBackend: cfg.secretsBackend };
    case 9: return { browser: cfg.browser };
    case 10: return { aiTools: cfg.aiTools };
    default: return {};
  }
}
```

---

## 3. `ConfigSummaryProps` — Browser and AI Tools Sections

**File**: `src/ui/config-summary.tsx`

No interface change needed. `TildeConfig` already has `browser?: string` and `aiTools?: string[]` from spec 010. The fix is purely additive rendering.

**New render blocks** (added after Secrets Backend section):
```tsx
{config.browser && (
  <SummarySection title="Browser" items={[config.browser]} />
)}
{!!config.aiTools?.length && (
  <SummarySection title="AI Coding Tools" items={config.aiTools} />
)}
```

---

## 4. Cursor Restore — No Interface Changes

**File**: `src/index.tsx`

No new types. The fix is three `process.on()` registrations added at the top of `main()` before any Ink rendering:

```ts
process.stdout.write('\x1b[?25h');
process.on('exit', () => process.stdout.write('\x1b[?25h'));
process.on('SIGINT',  () => { process.stdout.write('\x1b[?25h'); process.exit(130); });
process.on('SIGTERM', () => { process.stdout.write('\x1b[?25h'); process.exit(143); });
```

---

## 5. Resume State Machine — Step Guard

**File**: `src/modes/wizard.tsx`

**Current** (line ~288):
```ts
setCurrentStep(resumeStep + 1);
```

**New**:
```ts
setCurrentStep(Math.min(resumeStep + 1, LAST_STEP));
```

No type changes. `LAST_STEP` is already defined as `STEP_REGISTRY.length - 1`.

---

## 6. Optional Step Sidebar — Label Rendering

**File**: `src/modes/wizard.tsx`

**Current**:
```tsx
{!step.required && !done && <Text dimColor> (opt)</Text>}
```

**New**:
```tsx
{!step.required && !done && <Text> (opt)</Text>}
```

No interface changes.
