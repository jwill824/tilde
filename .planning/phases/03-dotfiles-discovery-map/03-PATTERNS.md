# Phase 03: Dotfiles Discovery Map - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/inventory/dotfiles.ts` | service/utility | file-I/O, transform | `src/capture/scanner.ts`, `src/capture/parser.ts`, `src/tools/registry.ts` | role-match |
| `src/inventory/report.ts` | model | transform | `src/inventory/report.ts` | exact |
| `src/inventory/scan.ts` | service | batch, file-I/O | `src/inventory/scan.ts` | exact |
| `src/inventory/summary.ts` | utility | transform | `src/inventory/summary.ts` | exact |
| `src/tools/metadata.ts` | model/config | transform | `src/tools/metadata.ts` | exact |
| `src/tools/registry.ts` | utility | transform | `src/tools/registry.ts` | exact |
| `tests/unit/inventory-dotfiles.test.ts` | test | file-I/O, transform | `tests/unit/capture-scanner.test.ts`, `tests/unit/tool-metadata.test.ts` | role-match |
| `tests/unit/inventory-scanner.test.ts`, `tests/integration/wizard-flow.test.tsx`, `tests/integration/config-first.test.ts` | test | request-response, transform | existing same files | exact |

## Pattern Assignments

### `src/inventory/dotfiles.ts` (service/utility, file-I/O + transform)

**Analogs:** `src/capture/scanner.ts`, `src/capture/parser.ts`, `src/tools/registry.ts`, `src/inventory/scan.ts`

**Imports pattern** (`src/capture/scanner.ts` lines 1-5):
```typescript
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import fg from 'fast-glob';
import { run } from '../utils/exec.js';
import { detectLanguages, detectVersionManagers, type DetectedLanguage, type DetectedVersionManager } from '../utils/env-detection.js';
```

Copy the NodeNext ESM style and `.js` relative import extensions, but do not import `run` for dotfile parsing. Phase 3 discovery must stay read-only and must not execute shell content.

**Bounded home dotfile scan pattern** (`src/capture/scanner.ts` lines 16-25):
```typescript
const RC_FILE_NAMES = ['.zshrc', '.zshprofile', '.gitconfig'];

export async function scanDotfiles(homeDir: string): Promise<string[]> {
  const paths = await fg([`${homeDir}/.*`], {
    onlyFiles: true,
    deep: 1,
    dot: true,
  });
  return paths;
}
```

Use this shape for shallow home scans and adapt it for workspace allowlists. Keep `onlyFiles`, `dot`, and low `deep`; do not introduce broad recursive crawling.

**Safe rc-file read pattern** (`src/capture/scanner.ts` lines 36-47):
```typescript
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

For the new mapper, wrap each read so missing/unreadable files become dotfile warnings/skipped findings rather than rejecting the whole scan.

**Small line parser pattern** (`src/capture/parser.ts` lines 12-24, 38-47):
```typescript
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  // Parse aliases: alias foo='bar' or alias foo=bar
  const aliasMatch = trimmed.match(/^alias\s+([^=\s]+)=(.+)$/);
  if (aliasMatch) {
    const key = aliasMatch[1].trim();
    let value = aliasMatch[2].trim();
    value = value.replace(/^(['"])(.*)\1$/, '$2');
    aliases[key] = value;
    continue;
  }

  // Parse source / . lines
  const sourceMatch = trimmed.match(/^(?:source|\.)\s+(.+)$/);
  if (sourceMatch) {
    let src = sourceMatch[1].trim();
    src = src.replace(/^(['"])(.*)\1$/, '$2');
    sourcedFiles.push(src);
  }
}
```

Copy the simple line-oriented approach for aliases, functions, exports, PATH edits, source lines, and known init hooks. Do not copy the export value persistence from lines 26-35; Phase 3 should record env var names and value kinds only.

**Metadata path matching pattern** (`src/tools/registry.ts` lines 57-63, 95-105):
```typescript
export function getToolsByConfigPath(path: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.configPaths?.some(configPath => pathMatches(configPath, path)));
}

export function getToolsByDotfilePath(path: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.dotfilePaths?.some(dotfilePath => pathMatches(dotfilePath, path)));
}

function pathMatches(knownPath: string, queryPath: string): boolean {
  const normalizedKnownPath = normalizePath(knownPath);
  const normalizedQueryPath = normalizePath(queryPath);

  return normalizedQueryPath === normalizedKnownPath ||
    normalizedQueryPath.startsWith(`${normalizedKnownPath}/`);
}

function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '');
}
```

Use these helpers directly for known path findings. Do not reimplement per-tool matching.

**Warning instead of throw pattern** (`src/inventory/scan.ts` lines 167-176):
```typescript
async function scanEnvironmentRcFiles(homeDir: string, warnings: InventoryWarning[]): Promise<Record<string, string>> {
  try {
    const filter = createCaptureFilter();
    const dotfiles = await scanDotfiles(homeDir);
    const { included } = filterDotfiles(dotfiles, filter);
    return await scanRcFiles(included);
  } catch {
    warnings.push(createWarning('environment', 'Shell and git rc files could not be read; related wizard defaults may be unavailable.'));
    return {};
  }
}
```

The new dotfile scan should follow this soft-failure contract, preferably with per-path warnings when possible.

---

### `src/inventory/report.ts` (model, transform)

**Analog:** `src/inventory/report.ts`

**Typed evidence pattern** (lines 9-19):
```typescript
export type InventoryWarningSeverity = 'info' | 'warning' | 'error';

export type InventoryWarningSource = 'homebrew' | 'environment' | 'app-path' | 'scanner';

export type InventoryEvidence =
  | { type: 'homebrew-formula'; id: string; requestStatus: HomebrewRequestStatus }
  | { type: 'homebrew-cask'; id: string; requestStatus: Extract<HomebrewRequestStatus, 'direct'> }
  | { type: 'app-path'; path: string; exists: boolean }
  | { type: 'command'; command: string; outcome: 'succeeded' | 'failed' | 'unknown'; version?: string }
  | { type: 'shell'; name: string; source: 'process-env' | 'scanner' }
  | { type: 'inconclusive'; source: InventoryWarningSource; reason: string; warningId?: string };
```

Add dotfile-specific union types rather than loose objects. Extend `InventoryWarningSource` with a dotfile-oriented source such as `'dotfiles'` if dotfile warnings need their own bucket.

**Report section pattern** (lines 55-69):
```typescript
export interface InventoryEnvironmentSnapshot {
  homeDir: string;
  shell?: string;
  rcFiles: Record<string, string>;
  detectedLanguages: DetectedLanguage[];
  detectedVersionManagers: DetectedVersionManager[];
}

export interface InventoryReport {
  tools: InventoryToolFact[];
  unmatchedHomebrew: InventoryHomebrewAudit;
  homebrew: InventoryHomebrewSummary;
  warnings: InventoryWarning[];
  environment: InventoryEnvironmentSnapshot;
}
```

Add a top-level `dotfiles` or `dotfileMap` section to `InventoryReport`, not a UI-only structure. Keep raw rc content confined to the existing environment snapshot; new dotfile findings must use safe details.

**Empty report defaults pattern** (lines 78-104):
```typescript
export function createEmptyInventoryReport(homeDir = process.env.HOME ?? '~'): InventoryReport {
  return {
    tools: [],
    unmatchedHomebrew: {
      formulae: [],
      casks: [],
    },
    homebrew: {
      installedFormulaeCount: 0,
      installedCasksCount: 0,
      matchedFormulaeCount: 0,
      matchedCasksCount: 0,
      unmatchedFormulaeCount: 0,
      unmatchedCasksCount: 0,
      directFormulaeCount: 0,
      dependencyFormulaeCount: 0,
      unknownFormulaeCount: 0,
    },
    warnings: [],
    environment: {
      homeDir,
      shell: process.env.SHELL,
      rcFiles: {},
      detectedLanguages: [],
      detectedVersionManagers: [],
    },
  };
}
```

Add an empty dotfile map here so failed/loading inventory surfaces can render deterministically.

---

### `src/inventory/scan.ts` (service, batch + file-I/O)

**Analog:** `src/inventory/scan.ts`

**Orchestration pattern** (lines 33-51):
```typescript
export async function scanInventory(homeDir?: string): Promise<InventoryReport> {
  const resolvedHome = homeDir ?? process.env.HOME ?? '~';
  const report = createEmptyInventoryReport(resolvedHome);
  const warnings = report.warnings;
  const homebrew = await scanHomebrew(warnings);
  const formulaMap = homebrew.formulae === null
    ? null
    : new Map(homebrew.formulae.map(formula => [formula.id, formula]));
  const caskMap = homebrew.casks === null
    ? null
    : new Map(homebrew.casks.map(cask => [cask.id, cask]));

  report.environment = {
    homeDir: resolvedHome,
    shell: process.env.SHELL,
    rcFiles: await scanEnvironmentRcFiles(resolvedHome, warnings),
    detectedLanguages: await scanDetectedLanguages(warnings),
    detectedVersionManagers: await scanDetectedVersionManagers(warnings),
  };
```

Attach dotfile mapping inside `scanInventory()` after resolving `homeDir` and before return. Pass the shared `warnings` array so failures appear in the existing summary channel.

**Report completion pattern** (lines 77-99):
```typescript
report.tools.push(...createShellFacts(report.environment.shell));
report.tools.push(...createCoreToolFacts(report.environment.detectedLanguages, report.environment.detectedVersionManagers));

report.unmatchedHomebrew = {
  formulae: homebrew.formulae?.filter(formula => !matchedFormulae.has(formula.id)) ?? [],
  casks: homebrew.casks?.filter(cask => !matchedCasks.has(cask.id)) ?? [],
};

const requestStatusCounts = countFormulaRequestStatuses(homebrew.formulae ?? []);

report.homebrew = {
  installedFormulaeCount: homebrew.formulae?.length ?? 0,
  installedCasksCount: homebrew.casks?.length ?? 0,
  matchedFormulaeCount: matchedFormulae.size,
  matchedCasksCount: matchedCasks.size,
  unmatchedFormulaeCount: report.unmatchedHomebrew.formulae.length,
  unmatchedCasksCount: report.unmatchedHomebrew.casks.length,
  directFormulaeCount: requestStatusCounts.direct,
  dependencyFormulaeCount: requestStatusCounts.dependency,
  unknownFormulaeCount: requestStatusCounts.unknown,
};

return report;
```

Keep dotfile summary counts derived from structured findings in the report, not recomputed in UI components.

**Path check soft-failure pattern** (lines 296-327):
```typescript
async function checkAppPath(
  toolId: string,
  appPath: string,
  warnings: InventoryWarning[]
): Promise<{ evidence: InventoryEvidence; warningIds: string[] }> {
  try {
    await access(appPath);
    return {
      evidence: { type: 'app-path', path: appPath, exists: true },
      warningIds: [],
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        evidence: { type: 'app-path', path: appPath, exists: false },
        warningIds: [],
      };
    }

    const warning = createWarning('app-path', `Could not check app path for ${toolId}; app bundle state is unknown.`, toolId);
    warnings.push(warning);
    return {
      evidence: {
        type: 'inconclusive',
        source: 'app-path',
        reason: `Could not check app path ${appPath}.`,
        warningId: warning.id,
      },
      warningIds: [warning.id],
    };
  }
}
```

Use the same distinction for missing dotfiles versus unreadable/failed dotfiles: missing candidates can be skipped or marked absent; unexpected read failures should become warnings.

---

### `src/inventory/summary.ts` (utility, transform)

**Analog:** `src/inventory/summary.ts`

**Concise summary pattern** (lines 7-25):
```typescript
export function summarizeInventory(report: InventoryReport): string[] {
  const installedKnownTools = getInstalledKnownToolFacts(report);
  const installedKnownToolSummary = installedKnownTools.length > 0
    ? installedKnownTools.map(tool => tool.label).join(', ')
    : 'none';
  const lines = [
    `Known installed tools: ${installedKnownToolSummary}`,
    `Homebrew formulae: ${report.homebrew.directFormulaeCount} direct, ${report.homebrew.dependencyFormulaeCount} dependencies, ${report.homebrew.unknownFormulaeCount} unknown`,
    `Homebrew casks: ${report.homebrew.installedCasksCount} installed, ${report.homebrew.unmatchedCasksCount} unmatched`,
  ];

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      lines.push(`Warning: ${warning.message}`);
    }
  }

  return lines;
}
```

Add one or two dotfile lines before warnings, using counts/grouped labels only. Do not list every unknown path in default output.

**UI consumption pattern** (`src/steps/inventory.tsx` lines 39-50):
```typescript
return (
  <Box flexDirection="column">
    <Text bold>{heading}</Text>
    <Box marginTop={1} flexDirection="column">
      {summarizeInventory(report).map(line => (
        <Text
          key={line}
          color={line.startsWith('Warning') ? 'yellow' : 'green'}
        >
          {line}
        </Text>
      ))}
    </Box>
```

Because wizard and config-first both call `summarizeInventory()`, keep dotfile wording centralized here.

---

### `src/tools/metadata.ts` and `src/tools/registry.ts` (model/config + utility, transform)

**Analogs:** same files

**Metadata fields pattern** (`src/tools/metadata.ts` lines 47-58):
```typescript
export const ToolMetadataSchema = z.object({
  id: NonBlankStringSchema,
  label: NonBlankStringSchema,
  category: ToolCategorySchema,
  supportedPlatforms: z.array(PlatformSchema).min(1),
  source: z.enum(['first-party', 'community', 'local']).default('first-party'),
  install: ToolInstallSchema,
  externalIds: ToolExternalIdsSchema,
  configPaths: z.array(NonBlankStringSchema).optional(),
  dotfilePaths: z.array(NonBlankStringSchema).optional(),
  variants: z.array(NonBlankStringSchema).optional(),
});
```

Reuse these existing fields for known file matching. If adding metadata rows, keep path strings nonblank and control-character-free through the existing schema.

**Validation error pattern** (`src/tools/metadata.ts` lines 80-90):
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

Prefer schema-backed metadata expansion over ad hoc validation in the scanner.

**Lookup test pattern** (`tests/unit/tool-metadata.test.ts` lines 223-229):
```typescript
it('META-04/D-14 matches exact and child config and dotfile paths', () => {
  expect(getToolsByConfigPath('~/Library/Application Support/obsidian').map(tool => tool.id)).toEqual(['obsidian']);
  expect(getToolsByConfigPath('~/Library/Application Support/obsidian/plugins').map(tool => tool.id)).toEqual(['obsidian']);
  expect(getToolsByDotfilePath('~/.obsidian').map(tool => tool.id)).toEqual(['obsidian']);
  expect(getToolsByDotfilePath('~/.obsidian/snippets/theme.css').map(tool => tool.id)).toEqual(['obsidian']);
  expect(getToolsByConfigPath('~/Library/Application Support/missing')).toEqual([]);
});
```

Extend this when adding or adjusting metadata paths.

---

### Tests (unit and integration)

**Analogs:** `tests/unit/inventory-scanner.test.ts`, `tests/unit/capture-scanner.test.ts`, `tests/unit/tool-metadata.test.ts`, `tests/integration/wizard-flow.test.tsx`, `tests/integration/config-first.test.ts`

**Temp filesystem fixture pattern** (`tests/unit/capture-scanner.test.ts` lines 14-24):
```typescript
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

Use temp dirs for `inventory-dotfiles.test.ts`; include rc files, metadata-matched files, unknown files, unreadable/missing cases, and shallow workspace fixtures.

**Scanner mock pattern** (`tests/unit/inventory-scanner.test.ts` lines 7-35, 93-99):
```typescript
const {
  mockListInstalledFormulae,
  mockListInstalledCasks,
  mockListInstalledOnRequestFormulae,
  mockDetectLanguages,
  mockDetectVersionManagers,
  mockAccess,
} = vi.hoisted(() => ({
  mockListInstalledFormulae: vi.fn(),
  mockListInstalledCasks: vi.fn(),
  mockListInstalledOnRequestFormulae: vi.fn(),
  mockDetectLanguages: vi.fn(),
  mockDetectVersionManagers: vi.fn(),
  mockAccess: vi.fn(),
}));

vi.mock('../../src/tools/registry.js', () => ({
  allToolMetadata: [
    {
      id: 'homebrew',
      label: 'Homebrew',
      category: 'package-manager',
      supportedPlatforms: ['darwin'],
      source: 'first-party',
      install: {
        manualNote: 'Install from https://brew.sh',
      },
    },
  ],
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: mockAccess,
  };
});
```

Use `vi.hoisted()` and module mocks when scanner behavior depends on registry metadata or filesystem edge cases.

**Evidence assertion pattern** (`tests/unit/inventory-scanner.test.ts` lines 140-175):
```typescript
const report = await scanInventory(tmpHome);

expect(report).toEqual(expect.objectContaining({
  tools: expect.any(Array),
  unmatchedHomebrew: expect.any(Object),
  homebrew: expect.any(Object),
  warnings: expect.any(Array),
  environment: expect.any(Object),
}));

const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
expect(formulaFact).toEqual(expect.objectContaining({
  installed: 'installed',
  evidence: expect.arrayContaining([
    expect.objectContaining({ type: 'homebrew-formula', id: 'test-cli' }),
  ]),
}));
```

Assert dotfile report shape and nested findings with `expect.objectContaining()` / `expect.arrayContaining()` so tests stay focused on behavior.

**Wizard summary assertion pattern** (`tests/integration/wizard-flow.test.tsx` lines 320-347):
```typescript
it('inventory wizard step summarizes Homebrew counts and warnings without unmatched names', async () => {
  const { Wizard } = await import('../../src/modes/wizard.js');
  const inventory = createInventoryFixture({
    warnings: [
      {
        id: 'homebrew-request-state-unavailable',
        source: 'homebrew',
        severity: 'warning',
        message: 'Homebrew direct/dependency status is unavailable.',
      },
    ],
  });

  const { lastFrame } = render(
    React.createElement(Wizard, {
      initialStep: 1,
      inventory,
    } as React.ComponentProps<typeof Wizard> & { inventory: InventoryReport })
  );

  await new Promise(resolve => setTimeout(resolve, 100));
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Inventory scan complete');
  expect(frame).toContain('Known installed tools:');
  expect(frame).toContain('Homebrew formulae: 1 direct, 1 dependencies, 0 unknown');
  expect(frame).toContain('Warnings:');
  expect(frame).toContain('Warning: Homebrew direct/dependency status is unavailable.');
  expect(frame).not.toContain('ripgrep');
});
```

Extend this test with dotfile summary lines and negative assertions that detailed unknown paths do not flood the default UI.

**Config-first summary assertion pattern** (`tests/integration/config-first.test.ts` lines 103-128):
```typescript
it('renders inventory summary before configuration summary', async () => {
  const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
  const onComplete = vi.fn();
  const inventoryState: InventoryScanState = {
    status: 'ready',
    report: createInventoryFixture(),
  };
  const { lastFrame } = render(
    React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete, inventoryState })
  );

  await new Promise((r) => setTimeout(r, 300));

  const frame = lastFrame() ?? '';
  const inventoryIndex = frame.indexOf('Inventory scan complete');
  const configIndex = frame.indexOf('Configuration Summary');
  expect(inventoryIndex).toBeGreaterThanOrEqual(0);
  expect(configIndex).toBeGreaterThanOrEqual(0);
  expect(inventoryIndex).toBeLessThan(configIndex);
  const inventoryBlock = frame.slice(inventoryIndex, configIndex);
  expect(inventoryBlock).toContain('Known installed tools: Homebrew');
  expect(inventoryBlock).toContain('Homebrew formulae: 1 direct, 1 dependencies, 0 unknown');
  expect(inventoryBlock).toContain('Warnings:');
  expect(inventoryBlock).toContain('Warning: Homebrew direct/dependency status is unavailable.');
  expect(inventoryBlock).not.toContain('ripgrep');
});
```

Mirror wizard assertions here so both surfaces stay aligned through `summarizeInventory()`.

## Shared Patterns

### NodeNext Imports
**Source:** `src/inventory/scan.ts` lines 1-22  
**Apply to:** all new/modified TypeScript source files
```typescript
import { access } from 'node:fs/promises';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import { scanDotfiles, scanRcFiles } from '../capture/scanner.js';
import { allToolMetadata } from '../tools/registry.js';
import type { ToolMetadata } from '../tools/metadata.js';
```

Use relative imports with `.js` extensions and `import type` for type-only imports.

### Secret and Dotfile Filtering
**Source:** `src/capture/filter.ts` lines 5-16  
**Apply to:** `src/inventory/dotfiles.ts`, scanner integration tests
```typescript
export function createCaptureFilter(extraPatterns?: string[]) {
  const filter = ignore().add(defaultSecretPatterns);
  if (extraPatterns) {
    filter.add(extraPatterns);
  }
  return filter;
}

export function filterDotfiles(
  paths: string[],
  filter: ReturnType<typeof createCaptureFilter>
): { included: string[]; excluded: string[] } {
```

Reuse this existing filter or its pattern for sensitive files. Do not persist raw env values from rc exports.

### Soft Failure Warnings
**Source:** `src/inventory/scan.ts` lines 131-155, 379-386  
**Apply to:** scan orchestration and dotfile read failures
```typescript
async function scanHomebrewList(
  name: 'formulae' | 'casks',
  helper: () => Promise<string[]>,
  warnings: InventoryWarning[]
): Promise<string[] | null> {
  try {
    return await helper();
  } catch {
    warnings.push(createWarning('homebrew', `Homebrew ${name} could not be read; related inventory facts are unknown.`));
    return null;
  }
}

function createWarning(source: InventoryWarningSource, message: string, toolId?: string, id?: string): InventoryWarning {
  return {
    id: id ?? `${source}:${message}`,
    source,
    severity: 'warning',
    message,
    toolId,
  };
}
```

Unknown files are evidence, not failures. Missing/unreadable/parse-failed paths should be warnings or skipped findings that leave the report usable.

### Centralized Summary Rendering
**Source:** `src/modes/config-first.tsx` lines 185-193 and `src/steps/inventory.tsx` lines 39-50  
**Apply to:** summary changes only through `src/inventory/summary.ts`
```typescript
{inventoryReport && (
  <Box flexDirection="column">
    <Text bold>{inventoryHeading}</Text>
    <Box marginTop={1} flexDirection="column">
      {summarizeInventory(inventoryReport).map(line => (
        <Text
          key={line}
          color={line.startsWith('Warning') ? 'yellow' : 'green'}
```

Do not duplicate dotfile summary wording inside Ink components.

## No Analog Found

No planned file lacks an analog. The only partial gap is the exact Phase 3 dotfile map shape; use the existing inventory report/evidence patterns plus the locked decisions from `03-CONTEXT.md`.

## Metadata

**Analog search scope:** `src/inventory/`, `src/capture/`, `src/tools/`, `src/steps/`, `src/modes/`, `tests/unit/`, `tests/integration/`  
**Files scanned:** 15  
**Pattern extraction date:** 2026-06-19
