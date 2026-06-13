---
phase: 02-machine-inventory-scanner
reviewed: 2026-06-13T22:43:16Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/app.tsx
  - src/inventory/homebrew.ts
  - src/inventory/report.ts
  - src/inventory/scan.ts
  - src/inventory/summary.ts
  - src/modes/config-first.tsx
  - src/modes/wizard.tsx
  - src/plugins/first-party/cursor/metadata.ts
  - src/plugins/first-party/homebrew/metadata.ts
  - src/plugins/first-party/jetbrains/metadata.ts
  - src/plugins/first-party/neovim/metadata.ts
  - src/plugins/first-party/vfox/metadata.ts
  - src/plugins/first-party/vscode/metadata.ts
  - src/plugins/first-party/zed/metadata.ts
  - src/steps/contexts.tsx
  - src/steps/inventory.tsx
  - src/tools/registry.ts
  - src/utils/package-manager.ts
  - tests/integration/config-first.test.ts
  - tests/integration/env-capture.test.ts
  - tests/integration/wizard-flow.test.tsx
  - tests/unit/inventory-homebrew.test.ts
  - tests/unit/inventory-scanner.test.ts
  - tests/unit/package-manager.test.ts
  - tests/unit/tool-metadata.test.ts
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-13T22:43:16Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the inventory scanner, report types, terminal flow integration, first-party tool metadata, and related tests. The implementation has two blocker-level regressions in the inventory-to-wizard path: users can continue from a fake "scan complete" state before scanning finishes, and installed inventory facts are converted into invalid package install defaults.

Build and focused test checks run during review:

- `npm run build` passed.
- `npx vitest run ...unit inventory/tool files...` passed for 4 unit files.
- `npm run test:integration -- tests/integration/config-first.test.ts tests/integration/env-capture.test.ts tests/integration/wizard-flow.test.tsx` passed.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: [BLOCKER] Inventory step can report completion before the inventory scan has finished

**File:** `src/app.tsx:68`

**Issue:** `App` initializes inventory with `createEmptyInventoryReport()` and starts `scanInventory()` asynchronously at `src/app.tsx:88-91`. The wizard receives that empty report immediately, and `InventoryStep` always renders "Inventory scan complete" at `src/steps/inventory.tsx:22` with a Continue action. A user who reaches step 1 before a slow `brew list`/rc scan finishes can continue with an empty report; that locks wrong shell/tool defaults into the flow at `src/modes/wizard.tsx:414-424` and `src/modes/wizard.tsx:481-489`. This violates the non-destructive "read and report before writing" requirement because the wizard can proceed as if discovery happened when it has not.

**Fix:**

Track inventory loading separately from the report value and block the Inventory step until the scan resolves or fails into an explicit warning report.

```tsx
type InventoryState =
  | { status: 'loading'; report: InventoryReport }
  | { status: 'ready'; report: InventoryReport };

const [inventoryState, setInventoryState] = useState<InventoryState>({
  status: 'loading',
  report: createEmptyInventoryReport(),
});

useEffect(() => {
  if (mode === 'non-interactive') return;
  scanInventory()
    .then(report => setInventoryState({ status: 'ready', report }))
    .catch(() => setInventoryState({
      status: 'ready',
      report: {
        ...createEmptyInventoryReport(),
        warnings: [{
          id: 'inventory-startup-failed',
          source: 'scanner',
          severity: 'warning',
          message: 'Inventory scan failed; continuing with an empty report.',
        }],
      },
    }));
}, []);
```

Pass the status into `Wizard`/`InventoryStep` and render a spinner until `status === 'ready'`.

### CR-02: [BLOCKER] Installed tool metadata IDs are reused as Homebrew package names

**File:** `src/modes/wizard.tsx:482`

**Issue:** The wizard seeds `ToolsStep.defaultTools` with `getInstalledKnownToolFacts(inventoryReport).map(tool => tool.toolId)`. Those values are metadata IDs across every known category, not installable package names. For example, the VS Code metadata ID is `vscode` while its Homebrew cask is `visual-studio-code` at `src/plugins/first-party/vscode/metadata.ts:5-13`; Chrome's metadata ID is `chrome` while its cask is `google-chrome` in `src/plugins/first-party/browser/metadata.ts:18-27`. `ToolsStep` then serializes those defaults into `config.tools` at `src/steps/tools.tsx:107-118`, and `installAll()` passes every `config.tools` entry to `pkgManager.installPackages()` at `src/installer/index.ts:40-52`. The result is that an installed editor/browser/package-manager discovered by inventory can become an invalid or unintended `brew install <metadata-id>` request on apply.

**Fix:**

Do not feed all installed inventory facts into the generic package list. Either remove inventory-driven defaults from `ToolsStep`, or translate and filter by the step's actual install surface.

```tsx
function inventoryDefaultsForTools(report: InventoryReport): string {
  return getInstalledKnownToolFacts(report)
    .filter(tool => tool.category === 'note-taking')
    .map(tool => {
      const metadata = getToolMetadata(tool.toolId);
      return metadata?.install?.homebrew?.formula ?? metadata?.install?.homebrew?.cask;
    })
    .filter((id): id is string => Boolean(id))
    .join(', ');
}
```

Keep package managers, version managers, browsers, and editors in their dedicated steps instead of adding them to `config.tools`.

## Warnings

### WR-01: [WARNING] Homebrew is never marked installed even when Homebrew scanning succeeds

**File:** `src/plugins/first-party/homebrew/metadata.ts:10`

**Issue:** The Homebrew metadata only declares `manualNote`, so `createMetadataFact()` has no formula, cask, app path, or command evidence to evaluate at `src/inventory/scan.ts:194-260`. When `brew list` succeeds and the report has Homebrew counts, the `homebrew` tool fact still resolves to `unknown` via `src/inventory/scan.ts:344-352`. That makes the "Known installed tools" summary under-report a core managed system component and weakens provenance trust.

**Fix:** Add explicit command evidence for metadata entries, or special-case Homebrew based on successful Homebrew helper calls.

```ts
if (metadata.id === 'homebrew' && context.homebrewAvailable) {
  evidence.push({ type: 'command', command: 'brew', outcome: 'succeeded' });
  installedEvidence = true;
}
```

Thread a boolean such as `homebrewAvailable` out of `scanHomebrew()` instead of inferring it from non-empty package lists.

### WR-02: [WARNING] Integration fixtures use impossible InventoryReport shapes

**File:** `tests/integration/env-capture.test.ts:122`

**Issue:** Multiple integration fixtures no longer match the real `InventoryReport` contract. `tests/integration/env-capture.test.ts:122-145` omits required `requestStatus` fields from Homebrew evidence, uses `unmatchedHomebrew.formulae: ['ripgrep']` instead of `{ id, requestStatus }`, and omits `directFormulaeCount`, `dependencyFormulaeCount`, and `unknownFormulaeCount`. Similar `{ name: 'ripgrep', requestStatus: ... }` fixtures appear at `tests/integration/config-first.test.ts:42` and `tests/integration/wizard-flow.test.tsx:67`, while the production type requires `id`. Vitest transpilation lets these impossible fixtures pass, so the tests do not exercise the real inventory shape or catch summary/report regressions.

**Fix:** Make fixtures satisfy `InventoryReport` exactly and add assertions for the fields that currently drift.

```ts
unmatchedHomebrew: {
  formulae: [{ id: 'ripgrep', requestStatus: 'dependency' }],
  casks: [],
},
homebrew: {
  installedFormulaeCount: 2,
  installedCasksCount: 1,
  matchedFormulaeCount: 1,
  matchedCasksCount: 1,
  unmatchedFormulaeCount: 1,
  unmatchedCasksCount: 0,
  directFormulaeCount: 1,
  dependencyFormulaeCount: 1,
  unknownFormulaeCount: 0,
},
```

Consider adding a `createInventoryReportFixture(overrides)` helper typed with `satisfies InventoryReport` so fixture drift fails during editing.

---

_Reviewed: 2026-06-13T22:43:16Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
