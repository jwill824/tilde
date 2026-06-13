# Phase 02: machine-inventory-scanner - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/inventory/report.ts` | model | transform | `src/capture/scanner.ts` | role-match |
| `src/inventory/scan.ts` | service | batch | `src/capture/scanner.ts` | exact |
| `src/inventory/homebrew.ts` | utility | transform | `src/utils/package-manager.ts` | role-match |
| `src/inventory/summary.ts` | utility | transform | `src/steps/env-capture.tsx` | partial |
| `src/steps/inventory.tsx` | component | event-driven | `src/steps/env-capture.tsx` | exact |
| `src/utils/package-manager.ts` | utility | request-response | `src/utils/package-manager.ts` | exact |
| `src/tools/metadata.ts` | model | transform | `src/tools/metadata.ts` | exact |
| `src/tools/registry.ts` | utility | transform | `src/tools/registry.ts` | exact |
| `src/app.tsx` | component | event-driven | `src/app.tsx` | exact |
| `src/modes/wizard.tsx` | component | event-driven | `src/modes/wizard.tsx` | exact |
| `src/modes/config-first.tsx` | component | event-driven | `src/modes/config-first.tsx` | exact |
| `tests/unit/inventory-scanner.test.ts` | test | batch | `tests/unit/capture-scanner.test.ts` | exact |
| `tests/unit/tool-metadata.test.ts` | test | transform | `tests/unit/tool-metadata.test.ts` | exact |
| `tests/integration/inventory-summary.test.tsx` | test | event-driven | `tests/unit/config-first.test.ts` | role-match |

## Pattern Assignments

### `src/inventory/report.ts` (model, transform)

**Analog:** `src/capture/scanner.ts`

**Imports pattern:** keep model-only modules import-light. The legacy report co-locates reusable detected types with the report boundary (lines 1-7):

```typescript
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import fg from 'fast-glob';
import { run } from '../utils/exec.js';
import { detectLanguages, detectVersionManagers, type DetectedLanguage, type DetectedVersionManager } from '../utils/env-detection.js';

export type EnvironmentCaptureReport = {
```

**Report shape pattern:** replace this flat report with `InventoryReport`, but preserve the local exported type style and named exports (lines 7-14):

```typescript
export type EnvironmentCaptureReport = {
  dotfiles: string[];
  brewPackages: string[];
  rcFiles: Record<string, string>;
  skippedFiles: string[];
  detectedLanguages: DetectedLanguage[];
  detectedVersionManagers: DetectedVersionManager[];
};
```

**Planner guidance:** define evidence-backed discriminated unions in this file. Include known tool facts, unmatched Homebrew audit entries, Homebrew summary counts, and warning records. Keep Phase 4 provenance labels out of scope; use `installed: 'installed' | 'missing' | 'unknown'` and request status such as `direct`, `dependency`, or `unknown`.

---

### `src/inventory/scan.ts` (service, batch)

**Analog:** `src/capture/scanner.ts`

**Batch orchestration pattern** (lines 49-66):

```typescript
export async function scanEnvironment(homeDir?: string): Promise<EnvironmentCaptureReport> {
  const resolvedHome = homeDir ?? process.env.HOME ?? '~';
  const [dotfiles, brewPackages, detectedLanguages, detectedVersionManagers] = await Promise.all([
    scanDotfiles(resolvedHome),
    scanBrewPackages(),
    detectLanguages(),
    detectVersionManagers(),
  ]);
  const rcFiles = await scanRcFiles(dotfiles);
  return {
    dotfiles,
    brewPackages,
    rcFiles,
    skippedFiles: [],
    detectedLanguages,
    detectedVersionManagers,
  };
}
```

**Soft-failure command pattern** (lines 27-34):

```typescript
export async function scanBrewPackages(): Promise<string[]> {
  try {
    const result = await run('brew', ['list', '-1']);
    return result.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
```

**File scan pattern** (lines 18-24, 36-47):

```typescript
export async function scanDotfiles(homeDir: string): Promise<string[]> {
  const paths = await fg([`${homeDir}/.*`], {
    onlyFiles: true,
    deep: 1,
    dot: true,
  });
  return paths;
}

export async function scanRcFiles(dotfilePaths: string[]): Promise<Record<string, string>> {
  const rcPaths = dotfilePaths.filter(p => RC_FILE_NAMES.includes(basename(p)));
  const result: Record<string, string> = {};
  await Promise.all(
    rcPaths.map(async (filePath) => {
      const name = basename(filePath);
      const content = await readFile(filePath, 'utf-8');
      result[name] = content;
    })
  );
  return result;
}
```

**Planner guidance:** `scanInventory()` should keep the `Promise.all` batch shape but return warnings instead of empty data when a data source fails. Use registry lookups from `src/tools/registry.ts` for known facts, package-manager helpers for Homebrew data, and existing `detectLanguages()` / `detectVersionManagers()` where useful.

---

### `src/inventory/homebrew.ts` (utility, transform)

**Analog:** `src/utils/package-manager.ts`

**Parsing pattern** (lines 24-41):

```typescript
export async function listInstalledFormulae(): Promise<string[]> {
  const output = await runBrew(['list', '--formula', '--full-name']);
  return output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

export async function listInstalledCasks(): Promise<string[]> {
  const output = await runBrew(['list', '--cask', '--full-name']);
  return output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}
```

**Install-check soft fallback pattern** (lines 62-80):

```typescript
export async function isFormulaInstalled(name: string): Promise<boolean> {
  try {
    const installed = await listInstalledFormulae();
    return installed.includes(name);
  } catch {
    return false;
  }
}

export async function isCaskInstalled(name: string): Promise<boolean> {
  try {
    const installed = await listInstalledCasks();
    return installed.includes(name);
  } catch {
    return false;
  }
}
```

**Planner guidance:** keep command execution in `package-manager.ts`; put pure classification in `inventory/homebrew.ts`. The classifier should accept installed formulae, installed casks, and optional installed-on-request formulae, then return direct/dependency/unknown statuses for all formulae and direct-by-default casks.

---

### `src/inventory/summary.ts` (utility, transform)

**Analog:** `src/steps/env-capture.tsx`

**Current summary grouping pattern** (lines 97-115):

```typescript
if (phase.type === 'summary') {
  const { report, skippedCount, rcEntryCount } = phase;
  return (
    <Box flexDirection="column">
      <Text bold>Environment scan complete:</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="green">✓ Found {report.brewPackages.length} packages (brew)</Text>
        <Text color="green">✓ Found {report.dotfiles.length} dotfiles</Text>
        <Text color="green">✓ Found {rcEntryCount} rc entries</Text>
        {report.detectedLanguages.length > 0 && (
          <Text color="green">✓ Languages: {report.detectedLanguages.map(l => `${l.name} ${l.version}`).join(', ')}</Text>
        )}
        {report.detectedVersionManagers.length > 0 && (
          <Text color="green">✓ Version managers: {report.detectedVersionManagers.map(v => v.name).join(', ')}</Text>
        )}
        {skippedCount > 0 && (
          <Text color="yellow">⚠ Skipped {skippedCount} files (secrets excluded)</Text>
        )}
      </Box>
```

**Planner guidance:** extract pure summary helpers that return concise lines/counts. Default UI should show known installed tools, Homebrew direct/dependency counts, and warnings. Keep unmatched Homebrew details in the report for later, not default display.

---

### `src/steps/inventory.tsx` (component, event-driven)

**Analog:** `src/steps/env-capture.tsx`

**Component imports pattern** (lines 1-7):

```typescript
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { scanEnvironment } from '../capture/scanner.js';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';
```

**Phase state pattern** (lines 15-23):

```typescript
type Phase =
  | { type: 'prompt' }
  | { type: 'scanning' }
  | { type: 'summary'; report: EnvironmentCaptureReport; skippedCount: number; rcEntryCount: number }
  | { type: 'done' };

export function EnvCaptureStep({ onComplete, onBack, isOptional: _isOptional }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'prompt' });
```

**Async scan transition and fallback pattern** (lines 35-60):

```typescript
useEffect(() => {
  if (phase.type !== 'scanning') return;

  async function doScan() {
    const report = await scanEnvironment();
    const filter = createCaptureFilter();
    const { included, excluded } = filterDotfiles(report.dotfiles, filter);
    const rcEntryCount =
      Object.values(report.rcFiles).reduce((acc, content) => acc + content.split('\n').filter(Boolean).length, 0);

    const finalReport: EnvironmentCaptureReport = {
      ...report,
      dotfiles: included,
      skippedFiles: excluded,
    };

    setPhase({ type: 'summary', report: finalReport, skippedCount: excluded.length, rcEntryCount });
  }

  doScan().catch(() => {
    // On scan failure, return empty report
    onComplete({
      captureReport: { dotfiles: [], brewPackages: [], rcFiles: {}, skippedFiles: [], detectedLanguages: [], detectedVersionManagers: [] },
    });
  });
}, [phase.type]);
```

**Selection pattern** (lines 116-123):

```typescript
<SelectInput
  items={confirmItems}
  onSelect={(item) => {
    if (item.value === 'back' && onBack) { onBack(); return; }
    onComplete({ captureReport: report });
  }}
/>
```

**Planner guidance:** after app-level startup scan is introduced, prefer `InventoryStep` as a renderer for a provided `InventoryReport` rather than re-running scans in the step. Preserve the `SelectInput` continue/back interaction and concise grouped output.

---

### `src/utils/package-manager.ts` (utility, request-response)

**Analog:** `src/utils/package-manager.ts`

**Command wrapper pattern** (lines 9-18):

```typescript
import { execa } from 'execa';

/**
 * Run a `brew` subcommand and return stdout as a string.
 * Throws if brew exits with a non-zero status.
 */
export async function runBrew(args: string[]): Promise<string> {
  const result = await execa('brew', args, { reject: true });
  return result.stdout;
}
```

**New helper should copy list helper shape** (lines 20-41):

```typescript
export async function listInstalledFormulae(): Promise<string[]> {
  const output = await runBrew(['list', '--formula', '--full-name']);
  return output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}
```

**Planner guidance:** add `listInstalledOnRequestFormulae()` here with the same parse style and `runBrew(['list', '--installed-on-request'])`. Let callers decide whether failure is fatal or report-level warning data.

---

### `src/tools/metadata.ts` (model, transform)

**Analog:** `src/tools/metadata.ts`

**Schema import and reusable validation pattern** (lines 1-11):

```typescript
import { z } from 'zod';

const HomebrewIdentifierSchema = z.string()
  .min(1)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/@+-]*$/, 'Homebrew identifier contains unsupported characters');

const NonBlankStringSchema = z.string().min(1).refine(value => value.trim().length > 0, {
  message: 'Value must not be blank',
}).refine(value => !hasControlCharacter(value), {
  message: 'Value must not contain control characters',
});
```

**Category schema pattern** (lines 20-32):

```typescript
export const PlatformSchema = z.enum(['darwin', 'linux', 'win32']);

export const ToolCategorySchema = z.enum([
  'package-manager',
  'secrets-backend',
  'account-connector',
  'env-loader',
  'version-manager',
  'browser',
  'editor',
  'ai-tool',
  'note-taking',
]);
```

**Validation error pattern** (lines 80-91):

```typescript
export function validateToolMetadata(metadata: unknown): ToolMetadata[] {
  const parsed = ToolMetadataArraySchema.safeParse(metadata);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid tool metadata: ${details}`);
  }

  return parsed.data;
}
```

**Planner guidance:** if Phase 2 adds `shell` or `core-tool`, extend the enum here only if the shared registry should own those categories now. If keeping scanner-owned categories, do not widen metadata validation unnecessarily.

---

### `src/tools/registry.ts` (utility, transform)

**Analog:** `src/tools/registry.ts`

**Registry aggregation pattern** (lines 1-14):

```typescript
import { browserToolMetadata } from '../plugins/first-party/browser/metadata.js';
import { noteTakingToolMetadata } from './note-taking-metadata.js';
import {
  validateToolMetadata,
  type ToolCategory,
  type ToolMetadata,
  type ToolPlatform,
  type ToolSource,
} from './metadata.js';

export const allToolMetadata = validateToolMetadata([
  ...browserToolMetadata,
  ...noteTakingToolMetadata,
]);
```

**Lookup helpers inventory should use** (lines 16-41):

```typescript
export function getToolMetadata(id: string): ToolMetadata | undefined {
  return allToolMetadata.find(tool => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.category === category);
}

export function getToolsByPlatform(platform: ToolPlatform): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.supportedPlatforms.includes(platform));
}

export function getToolsByHomebrewFormula(formula: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.install?.homebrew?.formula === formula);
}

export function getToolsByHomebrewCask(cask: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.install?.homebrew?.cask === cask);
}

export function getToolsByHomebrewId(id: string): ToolMetadata[] {
  return allToolMetadata.filter(tool =>
    tool.install?.homebrew?.formula === id ||
    tool.install?.homebrew?.cask === id
  );
}
```

**Path match pattern** (lines 81-91):

```typescript
function pathMatches(knownPath: string, queryPath: string): boolean {
  const normalizedKnownPath = normalizePath(knownPath);
  const normalizedQueryPath = normalizePath(queryPath);

  return normalizedQueryPath === normalizedKnownPath ||
    normalizedQueryPath.startsWith(`${normalizedKnownPath}/`);
}
```

**Planner guidance:** inventory should consume these helpers rather than duplicating metadata matching. Consider adding no new registry API unless matching needs cannot be expressed by existing helpers.

---

### `src/app.tsx` (component, event-driven)

**Analog:** `src/app.tsx`

**Startup fallback state pattern** (lines 62-72):

```typescript
export function App({ mode, configPath, dryRun, resume, reconfigure, version = '0.1.0' }: AppProps) {
  const [splashDone, setSplashDone] = useState(false);
  const [done, setDone] = useState(false);
  const [configEditMode, setConfigEditMode] = useState<'apply' | 'edit' | 'start-over'>('apply');
  const [environment, setEnvironment] = useState<EnvironmentSnapshot>({
    os: 'macOS',
    arch: 'unknown',
    shellName: 'unknown',
    shellVersion: undefined,
    tildeVersion: version,
  });
```

**Soft-fail startup effect pattern** (lines 74-83):

```typescript
// Capture real environment at startup for interactive modes; update splash in-flight
useEffect(() => {
  if (mode === 'non-interactive') return;
  captureEnvironment(version)
    .then(setEnvironment)
    .catch(() => {
      // Fallback is already set above — never crash on detection failure
    });
  // mode and version are mount-time values that never change
}, []);
```

**Prop pass-through pattern for modes** (lines 180-188, 203-207):

```typescript
<ConfigFirstMode
  configPath={configPath}
  onComplete={() => setDone(true)}
  onEdit={() => setConfigEditMode('edit')}
  onStartOver={() => setConfigEditMode('start-over')}
/>
```

```typescript
<Wizard
  onComplete={(_config: TildeConfig) => {
    setDone(true);
  }}
/>
```

**Planner guidance:** add `const [inventory, setInventory] = useState(createEmptyInventoryReport())`, run `scanInventory()` alongside or after `captureEnvironment()` for interactive modes, swallow scan failure by turning it into warning data, and pass `inventory` into `Wizard`, `ConfigFirstMode`, and `ReconfigureMode` if needed.

---

### `src/modes/wizard.tsx` (component, event-driven)

**Analog:** `src/modes/wizard.tsx`

**Imports to replace** (lines 6-9):

```typescript
import { ConfigDetectionStep } from '../steps/config-detection.js';
import { EnvCaptureStep } from '../steps/env-capture.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';
import { parseGitconfig } from '../capture/parser.js';
```

**Step registry rename target** (lines 81-95):

```typescript
const STEP_REGISTRY: StepDefinition[] = [
  { id: 'config-detection',  label: 'Config Detection',    required: true  }, // 0
  { id: 'env-capture',       label: 'Environment Capture', required: true  }, // 1
  { id: 'shell',             label: 'Shell',               required: true  }, // 2
```

**State and checkpoint pattern** (lines 179-187, 226-249):

```typescript
export function Wizard({ initialStep = 0, initialConfig = {}, onComplete, onExit }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [config, setConfig] = useState<Partial<TildeConfig>>({
    ...initialConfig,
    os: (initialConfig.os ?? detectOS()) as 'macos',
  });
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [captureReport, setCaptureReport] = useState<EnvironmentCaptureReport | null>(null);
```

```typescript
const advance = useCallback(
  async (stepData: Partial<TildeConfig>, summary: string[]) => {
    const merged = { ...config, ...stepData };
    setConfig(merged);
    setCompletedSteps(prev => [...prev, { id: currentStep, summary }]);
    setPoppedFrame(null); // clear any back-nav restore frame on forward advance

    // Push current step onto history
    setHistory(prev => [...prev, { stepIndex: currentStep, values: stepData as Record<string, unknown> }]);

    try {
      await saveCheckpoint(currentStep, merged as Partial<TildeConfig>);
    } catch {
      // Non-fatal: continue even if checkpoint fails
    }
```

**Current capture step integration to refactor** (lines 401-421):

```typescript
{currentStep === 1 && (
  <EnvCaptureStep
    onBack={onBack}
    isOptional={false}
    onComplete={(data) => {
      setCaptureReport(data.captureReport);
      const rcFiles = data.captureReport.rcFiles;
      const detectedShell =
        rcFiles['.zshrc'] !== undefined ? 'zsh' :
        rcFiles['.bash_profile'] !== undefined ? 'bash' : undefined;
      advance(
        detectedShell ? { shell: detectedShell } : {},
        [
          `${data.captureReport.dotfiles.length} dotfiles, ${data.captureReport.brewPackages.length} brew pkgs`,
          ...(data.captureReport.detectedLanguages.length > 0
            ? [`${data.captureReport.detectedLanguages.length} languages`]
            : []),
        ]
      );
    }}
  />
)}
```

**Downstream capture consumers** (lines 457-478):

```typescript
<ContextsStep
  defaultGitName={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').name : undefined}
  defaultGitEmail={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').email : undefined}
  initialContexts={canGoBack ? (config.contexts ?? []) : []}
  detectedLanguages={captureReport?.detectedLanguages}
```

```typescript
<ToolsStep
  defaultTools={captureReport ? captureReport.brewPackages.join(', ') : undefined}
```

**Planner guidance:** rename `captureReport` state to inventory terminology, but preserve access to rc files/languages or create a compatibility subset if those are still needed for defaults. Change the step id/label to inventory and feed concise inventory summary lines to `advance()`.

---

### `src/modes/config-first.tsx` (component, event-driven)

**Analog:** `src/modes/config-first.tsx`

**Imports and props pattern** (lines 1-24):

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from '../config/schema.js';
```

**Phase state pattern** (lines 26-33):

```typescript
type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'collect-shell'; partial: Record<string, unknown> }
  | { type: 'collect-contexts'; partial: Record<string, unknown> }
  | { type: 'confirm'; config: TildeConfig }
  | { type: 'applying'; config: TildeConfig; progress: string[] }
  | { type: 'done' };
```

**Load/validate transition pattern** (lines 70-91):

```typescript
useEffect(() => {
  async function load() {
    try {
      const expanded = expandTilde(configPath);
      const content = await readFile(expanded, 'utf-8');
      const raw = JSON.parse(content) as Record<string, unknown>;
      const migrationResult = runMigrations(raw, CURRENT_SCHEMA_VERSION);
      if (migrationResult.didMigrate) {
        const migrated = JSON.stringify({ ...migrationResult.config, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2) + '\n';
        try {
          await atomicWriteConfig(expanded, migrated);
        } catch {
          // Non-fatal: continue even if migration write fails
        }
      }
      setPhase(validateAndTransition(migrationResult.config as Record<string, unknown>));
    } catch (err) {
      setPhase({ type: 'error', message: (err as Error).message });
    }
  }
  load();
}, [configPath]);
```

**Confirm screen insertion point** (lines 159-187):

```typescript
if (phase.type === 'confirm') {
  const items = [
    { label: 'Apply this configuration', value: 'apply' },
    ...(onEdit ? [{ label: 'Edit configuration', value: 'edit' }] : []),
    ...(onStartOver ? [{ label: 'Start over (run wizard)', value: 'start-over' }] : []),
    { label: 'Cancel', value: 'cancel' },
  ];
  return (
    <Box flexDirection="column">
      <ConfigSummary config={phase.config} configPath={configPath} />
      <Box marginTop={1}>
        <SelectInput
```

**Planner guidance:** add an optional `inventory` prop and render `InventorySummary` before or adjacent to `ConfigSummary` in the confirm branch. Do not re-scan here if `App` owns startup inventory.

---

### `tests/unit/inventory-scanner.test.ts` (test, batch)

**Analog:** `tests/unit/capture-scanner.test.ts`

**Module mock pattern** (lines 1-9):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

vi.mock('../../src/utils/exec.js', () => ({
  run: vi.fn().mockResolvedValue({ stdout: 'git\nnodejs\n', stderr: '', exitCode: 0 }),
}));
```

**Temp home setup pattern** (lines 11-25):

```typescript
describe('capture/scanner', () => {
  let tmpHome: string;

  beforeEach(async () => {
    tmpHome = join(tmpdir(), `tilde-scanner-test-${randomUUID()}`);
    await mkdir(tmpHome, { recursive: true });
    await writeFile(join(tmpHome, '.zshrc'), 'alias gs="git status"\nexport PATH=/usr/local/bin\n');
    await writeFile(join(tmpHome, '.gitconfig'), '[user]\n  name = Test User\n  email = test@example.com\n');
    await writeFile(join(tmpHome, '.env'), 'SECRET=hunter2\n');
  });

  afterEach(async () => {
    await rm(tmpHome, { recursive: true, force: true });
    vi.clearAllMocks();
  });
```

**Soft-failure assertion pattern** (lines 65-71):

```typescript
it('scanBrewPackages returns [] when brew is not available', async () => {
  const { run } = await import('../../src/utils/exec.js');
  vi.mocked(run).mockRejectedValueOnce(new Error('brew not found'));
  const { scanBrewPackages } = await import('../../src/capture/scanner.js');
  const packages = await scanBrewPackages();
  expect(packages).toEqual([]);
});
```

**Planner guidance:** inventory tests should mock `src/utils/package-manager.ts` helpers or `execa` depending on the unit boundary. Add explicit assertions for known facts, unmatched Homebrew split, direct/dependency/unknown status, and report-level warnings.

---

### `tests/unit/tool-metadata.test.ts` (test, transform)

**Analog:** `tests/unit/tool-metadata.test.ts`

**Registry test import pattern** (lines 1-19):

```typescript
import { describe, expect, it } from 'vitest';
import {
  ToolMetadataSchema,
  validateToolMetadata,
} from '../../src/tools/metadata.js';
import {
  allToolMetadata,
  getToolMetadata,
  getToolsByCategory,
  getToolsByConfigPath,
  getToolsByDotfilePath,
  getToolsByHomebrewCask,
  getToolsByPlatform,
  getToolsBySource,
  getToolsByVariant,
  searchTools,
} from '../../src/tools/registry.js';
```

**Lookup assertion pattern** (lines 149-185):

```typescript
describe('tool metadata registry', () => {
  it('D-05/D-06 aggregates plugin-backed and non-plugin metadata', () => {
    expect(allToolMetadata.map(tool => tool.id)).toEqual([
      'safari',
      'chrome',
      'firefox',
      'arc',
      'brave',
      'edge',
      'obsidian',
      'notion',
      'bear',
    ]);
  });

  it('D-13/D-14 answers lookup questions deterministically', () => {
    expect(getToolMetadata('chrome')?.label).toBe('Google Chrome');
    expect(getToolsByCategory('browser').map(tool => tool.id)).toEqual([
      'safari',
      'chrome',
      'firefox',
      'arc',
      'brave',
      'edge',
    ]);
```

**Planner guidance:** extend this file only if metadata categories or registry aggregation change. Inventory-specific matching behavior belongs in inventory tests.

---

### `tests/integration/inventory-summary.test.tsx` (test, event-driven)

**Analog:** `tests/unit/config-first.test.ts`

**Ink render test pattern** (lines 1-4):

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
```

**Module mock pattern for side effects** (lines 5-19):

```typescript
vi.mock('../../src/installer/index.js', () => ({
  installAll: vi.fn().mockResolvedValue({
    packages: { installed: [], skipped: [], failed: [] },
    languages: [],
    errors: [],
  }),
}));

vi.mock('../../src/dotfiles/writer.js', () => ({
  writeAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/plugins/registry.js', () => ({
  pluginRegistry: {},
}));
```

**Frame assertion pattern** (lines 88-107):

```typescript
it('complete valid config → ConfigSummary rendered, no step components shown', async () => {
  vi.doMock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...actual, readFile: vi.fn().mockResolvedValue(VALID_CONFIG) };
  });

  const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
  const onComplete = vi.fn();
  const { lastFrame } = render(
    React.createElement(ConfigFirstMode, { configPath: '/fake/path.json', onComplete })
  );

  await new Promise((r) => setTimeout(r, 200));

  const frame = lastFrame() ?? '';
  expect(frame).toContain('Configuration Summary');
  expect(frame).toContain('personal');
```

**Planner guidance:** assert that the concise inventory summary renders in config-first confirm mode and the wizard inventory step. Mock inventory reports directly rather than running real `brew` or filesystem scans in component tests.

## Shared Patterns

### NodeNext ESM Imports
**Source:** `src/app.tsx`, `src/modes/wizard.tsx`, `src/tools/registry.ts`
**Apply to:** all new TypeScript source files

```typescript
import { Wizard } from './modes/wizard.js';
import { ConfigFirstMode } from './modes/config-first.js';
import { browserToolMetadata } from '../plugins/first-party/browser/metadata.js';
```

Use relative imports with `.js` extensions for first-party TypeScript modules.

### External Command Boundary
**Source:** `src/utils/package-manager.ts`
**Apply to:** Homebrew list helpers and inventory scanner

```typescript
export async function runBrew(args: string[]): Promise<string> {
  const result = await execa('brew', args, { reject: true });
  return result.stdout;
}
```

Keep raw command execution in utility modules. Inventory should interpret helper success/failure into report data.

### Startup Detection Fallback
**Source:** `src/app.tsx`
**Apply to:** app-level inventory scan

```typescript
captureEnvironment(version)
  .then(setEnvironment)
  .catch(() => {
    // Fallback is already set above — never crash on detection failure
  });
```

Initialize fallback report state first, then update it asynchronously. Detection failures must not crash interactive startup.

### Wizard Step Navigation
**Source:** `src/modes/wizard.tsx`
**Apply to:** inventory step integration

```typescript
await saveCheckpoint(currentStep, merged as Partial<TildeConfig>);
```

Step completion should continue using `advance(stepData, summaryLines)` and checkpoint failures stay non-fatal.

### Ink Summary Rendering
**Source:** `src/steps/env-capture.tsx`, `src/modes/config-first.tsx`
**Apply to:** inventory summary component and config-first confirm branch

```typescript
<Box flexDirection="column">
  <ConfigSummary config={phase.config} configPath={configPath} />
  <Box marginTop={1}>
    <SelectInput
```

Render summary blocks as compact vertical groups with a single SelectInput action area.

### Test Isolation and Mocks
**Source:** `tests/unit/capture-scanner.test.ts`, `tests/unit/config-first.test.ts`
**Apply to:** all inventory tests

```typescript
vi.mock('../../src/utils/exec.js', () => ({
  run: vi.fn().mockResolvedValue({ stdout: 'git\nnodejs\n', stderr: '', exitCode: 0 }),
}));
```

```typescript
vi.doMock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return { ...actual, readFile: vi.fn().mockResolvedValue(VALID_CONFIG) };
});
```

Mock command and filesystem boundaries. Do not run real `brew`, `gh`, `op`, `vfox`, or `defaultbrowser` in automated tests.

## No Analog Found

No files lack usable analogs. The weakest match is `src/inventory/summary.ts`, which should copy the summary grouping from `src/steps/env-capture.tsx` but become a pure formatter instead of an Ink component.

## Metadata

**Analog search scope:** `src/`, `tests/unit/`, `tests/integration/`, `tests/contract/`
**Files scanned:** 79 source/test files from `rg --files src tests`
**Pattern extraction date:** 2026-06-13
