# Phase 04: Provenance Summary - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/inventory/provenance.ts` | utility | transform | `src/inventory/scan.ts` + current partial `src/inventory/provenance.ts` | exact |
| `src/inventory/summary.ts` | utility | transform | `src/inventory/summary.ts` current summary formatter | exact |
| `src/modes/config-first.tsx` | component | event-driven | `src/modes/config-first.tsx` current confirmation rendering | exact |
| `tests/unit/inventory-provenance.test.ts` | test | transform | `tests/unit/inventory-scanner.test.ts` | role-match |
| `tests/integration/config-first.test.ts` / `tests/integration/wizard-flow.test.tsx` | test | event-driven | existing config-first and wizard inventory tests | exact |

## Pattern Assignments

### `src/inventory/provenance.ts` (utility, transform)

**Analog:** `src/inventory/scan.ts` and current partial `src/inventory/provenance.ts`

**Imports pattern** (`src/inventory/provenance.ts` lines 1-3):

```typescript
import type { TildeConfig } from '../config/schema.js';
import { getToolMetadata } from '../tools/registry.js';
import type { InventoryEvidence, InventoryReport, InventoryToolCategory, InventoryToolFact } from './report.js';
```

Copy the relative import style with `.js` extensions. Keep provenance under `src/inventory/` and depend on `InventoryReport`, `TildeConfig`, and metadata registry helpers rather than UI components.

**Report contract pattern** (`src/inventory/report.ts` lines 14-29, 64-70):

```typescript
export type InventoryEvidence =
  | { type: 'homebrew-formula'; id: string; requestStatus: HomebrewRequestStatus }
  | { type: 'homebrew-cask'; id: string; requestStatus: Extract<HomebrewRequestStatus, 'direct'> }
  | { type: 'app-path'; path: string; exists: boolean }
  | { type: 'command'; command: string; outcome: 'succeeded' | 'failed' | 'unknown'; version?: string }
  | { type: 'shell'; name: string; source: 'process-env' | 'scanner' }
  | { type: 'inconclusive'; source: InventoryWarningSource; reason: string; warningId?: string };

export interface InventoryToolFact {
  toolId: string;
  label: string;
  category: InventoryToolCategory;
  installed: InventoryInstallState;
  evidence: InventoryEvidence[];
  warningIds: string[];
}

export interface InventoryReport {
  tools: InventoryToolFact[];
  unmatchedHomebrew: InventoryHomebrewAudit;
  homebrew: InventoryHomebrewSummary;
  dotfiles: DotfileMap;
  warnings: InventoryWarning[];
  environment: InventoryEnvironmentSnapshot;
}
```

Provenance should classify these existing facts only. Do not add a new scanner or call external commands.

**Metadata lookup pattern** (`src/tools/registry.ts` lines 18-32):

```typescript
export const allToolMetadata = validateToolMetadata([
  ...browserToolMetadata,
  ...noteTakingToolMetadata,
  ...homebrewToolMetadata,
  ...vfoxToolMetadata,
  ...vscodeToolMetadata,
  ...neovimToolMetadata,
  ...jetbrainsToolMetadata,
  ...cursorToolMetadata,
  ...zedToolMetadata,
]);

export function getToolMetadata(id: string): ToolMetadata | undefined {
  return allToolMetadata.find(tool => tool.id === id);
}
```

Use `getToolMetadata()` for labels, categories, app paths, Homebrew ids, and manual notes. Do not duplicate registry maps inside UI steps.

**Core transform pattern** (`src/inventory/provenance.ts` lines 54-91):

```typescript
export function deriveInventoryProvenance(
  report: InventoryReport,
  config?: TildeConfig
): ToolProvenance[] {
  const selectedToolIds = getSelectedToolIds(config);
  const factsById = new Map(report.tools.map(tool => [tool.toolId, tool]));

  for (const selectedToolId of selectedToolIds) {
    if (!factsById.has(selectedToolId)) {
      const metadata = getToolMetadata(selectedToolId);
      factsById.set(selectedToolId, {
        toolId: selectedToolId,
        label: metadata?.label ?? selectedToolId,
        category: metadata?.category ?? 'core-tool',
        installed: 'unknown',
        evidence: [{ type: 'inconclusive', source: 'scanner', reason: 'No inventory fact was collected for this selected tool.' }],
        warningIds: [],
      });
    }
  }

  return [...factsById.values()].map(tool => {
    const selected = selectedToolIds.has(tool.toolId);
    const provenance = classifyToolProvenance(tool, selected);

    return {
      toolId: tool.toolId,
      label: tool.label,
      category: tool.category,
      installed: tool.installed,
      selected,
      provenance,
      detail: buildDetail(tool, provenance, selected),
      action: buildAction(tool, provenance, selected),
      evidence: tool.evidence,
      warningIds: tool.warningIds,
    };
  });
}
```

Keep this shape, but align the user-facing labels with Phase 04 semantics: selected tools first become `tilde-managed`; installed unselected tools should display as already installed/unmanaged as appropriate; Homebrew dependency remains explicit; OS-provided only applies to scanner-owned shell/core ids.

**Scanner-owned OS evidence pattern** (`src/inventory/scan.ts` lines 341-377):

```typescript
function createShellFacts(activeShell?: string): InventoryToolFact[] {
  return SHELL_IDS.map(shell => {
    const isActive = activeShell?.split('/').pop() === shell;
    return {
      toolId: `shell:${shell}`,
      label: shell,
      category: 'shell',
      installed: isActive ? 'installed' : 'unknown',
      evidence: isActive
        ? [{ type: 'shell', name: shell, source: 'process-env' }]
        : [{ type: 'inconclusive', source: 'environment', reason: `Shell ${shell} was not the active process shell.` }],
      warningIds: [],
    };
  });
}

function createCoreToolFacts(
  languages: DetectedLanguage[],
  versionManagers: DetectedVersionManager[]
): InventoryToolFact[] {
  return CORE_TOOL_IDS.map(toolId => {
    const language = languages.find(detected => detected.name === toolId);
    const versionManager = versionManagers.find(detected => detected.name === toolId);
    const version = language?.version;
    const installed = language || versionManager;

    return {
      toolId: `core-tool:${toolId}`,
      label: toolId,
      category: 'core-tool',
      installed: installed ? 'installed' : 'unknown',
      evidence: installed
        ? [{ type: 'command', command: toolId, outcome: 'succeeded', version }]
        : [{ type: 'inconclusive', source: 'environment', reason: `Core tool ${toolId} was not detected.` }],
      warningIds: [],
    };
  });
}
```

Classify `os-provided` only for these scanner-owned ids/categories with scanner evidence. Do not classify arbitrary selected metadata ids as OS-provided.

**Error/warning pattern** (`src/inventory/scan.ts` lines 143-167, 391-398):

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

Provenance should preserve `warningIds` and use inconclusive evidence/action text. Unknown selected tools must not block apply.

---

### `src/inventory/summary.ts` (utility, transform)

**Analog:** current `src/inventory/summary.ts`

**Imports pattern** (`src/inventory/summary.ts` lines 1-3):

```typescript
import type { InventoryReport, InventoryToolFact } from './report.js';
import type { TildeConfig } from '../config/schema.js';
import { formatProvenanceSummaryLine } from './provenance.js';
```

Use type imports for report/config and a normal import for the provenance formatter.

**Core summary pattern** (`src/inventory/summary.ts` lines 9-35):

```typescript
export function summarizeInventory(report: InventoryReport, config?: TildeConfig): string[] {
  const installedKnownTools = getInstalledKnownToolFacts(report);
  const installedKnownToolSummary = installedKnownTools.length > 0
    ? installedKnownTools.map(tool => tool.label).join(', ')
    : 'none';
  const lines = [
    `Known installed tools: ${installedKnownToolSummary}`,
    formatProvenanceSummaryLine(report, config),
    `Homebrew formulae: ${report.homebrew.directFormulaeCount} direct, ${report.homebrew.dependencyFormulaeCount} dependencies, ${report.homebrew.unknownFormulaeCount} unknown`,
    `Homebrew casks: ${report.homebrew.installedCasksCount} installed, ${report.homebrew.unmatchedCasksCount} unmatched`,
    `Dotfiles: ${report.dotfiles.counts.knownFiles} known, ${report.dotfiles.counts.unknownFiles} unknown, ${report.dotfiles.counts.warnings} warnings`,
  ];

  if (report.dotfiles.counts.knownFindingsCount > 0 || report.dotfiles.counts.unknownFindingsCount > 0) {
    lines.push(
      `Dotfile findings: ${report.dotfiles.counts.knownFindingsCount} known hooks, ${report.dotfiles.counts.unknownFindingsCount} unknown rc findings`
    );
  }

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      lines.push(`Warning: ${warning.message}`);
    }
  }

  return lines;
}
```

Keep one concise provenance line inside `summarizeInventory(report, config?)`. UI should continue rendering returned strings and should not duplicate provenance grouping.

**Group formatting pattern** (`src/inventory/provenance.ts` lines 94-118):

```typescript
export function summarizeProvenanceGroups(
  provenance: ToolProvenance[],
  maxExamples = 3
): ProvenanceGroupSummary[] {
  return PROVENANCE_ORDER.map(label => {
    const tools = provenance.filter(tool => tool.provenance === label);
    return {
      provenance: label,
      count: tools.length,
      examples: tools.slice(0, maxExamples).map(tool => tool.label),
      remaining: Math.max(0, tools.length - maxExamples),
    };
  }).filter(group => group.count > 0);
}

export function formatProvenanceSummaryLine(report: InventoryReport, config?: TildeConfig): string {
  const groups = summarizeProvenanceGroups(deriveInventoryProvenance(report, config));
  const formattedGroups = groups.map(group => {
    const examples = group.examples.join(', ');
    const more = group.remaining > 0 ? `, +${group.remaining} more` : '';
    return `${PROVENANCE_LABELS[group.provenance]} ${group.count}${examples ? ` (${examples}${more})` : ''}`;
  });

  return `Provenance: ${formattedGroups.length > 0 ? formattedGroups.join('; ') : 'none'}`;
}
```

Retain the `maxExamples = 3` behavior and `+N more` grouping required by Phase 04.

---

### `src/modes/config-first.tsx` (component, event-driven)

**Analog:** current `src/modes/config-first.tsx`

**Imports pattern** (`src/modes/config-first.tsx` lines 1-20):

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
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { atomicWriteConfig } from '../config/writer.js';
import { installAll } from '../installer/index.js';
import { writeAll } from '../dotfiles/writer.js';
import { pluginRegistry } from '../plugins/registry.js';
import { ConfigSummary } from '../ui/config-summary.js';
import { ContextsStep } from '../steps/contexts.js';
import { ShellStep } from '../steps/shell.js';
import type { InventoryReport, InventoryScanState } from '../inventory/report.js';
import { summarizeInventory } from '../inventory/summary.js';
```

Preserve the existing Ink/React import style and `.js` extensions.

**Confirm rendering pattern** (`src/modes/config-first.tsx` lines 163-199):

```typescript
if (phase.type === 'confirm') {
  if (inventoryState?.status === 'loading') {
    return (
      <Box flexDirection="column">
        <Text bold>Scanning inventory...</Text>
        <Text dimColor>Apply choices will be available after the scan finishes.</Text>
      </Box>
    );
  }

  const inventoryReport = inventoryState?.report ?? inventory;
  const inventoryHeading = inventoryState?.status === 'failed'
    ? 'Inventory scan failed'
    : 'Inventory scan complete';
  const items = [
    { label: 'Apply this configuration', value: 'apply' },
    ...(onEdit ? [{ label: 'Edit configuration', value: 'edit' }] : []),
    ...(onStartOver ? [{ label: 'Start over (run wizard)', value: 'start-over' }] : []),
    { label: 'Cancel', value: 'cancel' },
  ];
  return (
    <Box flexDirection="column">
      {inventoryReport && (
        <Box flexDirection="column">
          <Text bold>{inventoryHeading}</Text>
          <Box marginTop={1} flexDirection="column">
            {summarizeInventory(inventoryReport, phase.config).map(line => (
              <Text
                key={line}
                color={line.startsWith('Warning') ? 'yellow' : 'green'}
              >
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )}
```

Config-first has complete `TildeConfig`; pass `phase.config` into `summarizeInventory()` here so selected tools can be labeled `tilde-managed`.

**Wizard inventory rendering pattern** (`src/steps/inventory.tsx` lines 39-66):

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
    <Box marginTop={1}>
      <SelectInput
        items={confirmItems}
        onSelect={(item) => {
          if (item.value === 'back' && onBack) {
            onBack();
            return;
          }

          onComplete({ inventory: report });
        }}
      />
    </Box>
  </Box>
);
```

Early wizard inventory does not have final config intent. Keep it evidence-oriented unless a later wizard confirmation path has complete `TildeConfig`.

---

### `tests/unit/inventory-provenance.test.ts` (test, transform)

**Analog:** `tests/unit/inventory-scanner.test.ts`

**Imports and mock pattern** (`tests/unit/inventory-scanner.test.ts` lines 1-27, 34-108):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

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

vi.mock('../../src/utils/package-manager.js', () => ({
  listInstalledFormulae: mockListInstalledFormulae,
  listInstalledCasks: mockListInstalledCasks,
  listInstalledOnRequestFormulae: mockListInstalledOnRequestFormulae,
}));
```

For provenance unit tests, prefer direct `InventoryReport` fixtures and mock `../../src/tools/registry.js` only if metadata-specific branches need isolation.

**Evidence assertion pattern** (`tests/unit/inventory-scanner.test.ts` lines 174-188, 220-247):

```typescript
const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
expect(formulaFact).toEqual(expect.objectContaining({
  installed: 'installed',
  evidence: expect.arrayContaining([
    expect.objectContaining({ type: 'homebrew-formula', id: 'test-cli' }),
  ]),
}));

const installedEditor = report.tools.find(tool => tool.toolId === 'test-editor-installed');
expect(installedEditor).toEqual(expect.objectContaining({
  installed: 'installed',
  evidence: expect.arrayContaining([
    expect.objectContaining({
      type: 'app-path',
      path: '/Applications/Installed Test Editor.app',
      exists: true,
    }),
  ]),
}));
```

Copy this assertion style for derivation precedence: selected installed direct, selected dependency, selected missing, manual/app-path, scanner-owned OS, unselected unmanaged, and unknown.

**Unknown/warning pattern** (`tests/unit/inventory-scanner.test.ts` lines 281-335):

```typescript
it('keeps the report usable with warnings and unknown facts when Homebrew helpers fail', async () => {
  mockListInstalledFormulae.mockRejectedValueOnce(new Error('brew not found'));

  const { scanInventory } = await import('../../src/inventory/scan.js');

  const report = await scanInventory(tmpHome);

  expect(report.warnings).toEqual(expect.arrayContaining([
    expect.objectContaining({
      source: 'homebrew',
      severity: 'warning',
    }),
  ]));

  const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
  expect(formulaFact).toEqual(expect.objectContaining({
    installed: 'unknown',
    evidence: expect.arrayContaining([
      expect.objectContaining({ type: 'inconclusive', source: 'homebrew' }),
    ]),
  }));

  expect(report.unmatchedHomebrew.formulae).toEqual([]);
});
```

Add provenance tests for unknown selected tools and scanner failure warnings. Assert cautious action text but no blocking/error behavior.

---

### `tests/integration/config-first.test.ts` and `tests/integration/wizard-flow.test.tsx` (test, event-driven)

**Analog:** existing config-first and wizard flow integration tests

**Config-first fixture pattern** (`tests/integration/config-first.test.ts` lines 27-125):

```typescript
describe('ConfigFirstMode integration', () => {
  function createInventoryFixture(): InventoryReport {
    const dotfiles = {
      ...createEmptyInventoryReport().dotfiles,
      files: [
        {
          path: '/Users/test/.zshrc',
          scope: 'home' as const,
          state: 'mixed' as const,
          toolIds: ['direnv'],
          warningIds: [],
          findings: [
            {
              kind: 'tool-init-hook' as const,
              classification: 'known' as const,
              toolIds: ['direnv'],
              reason: 'rc-file-content',
              confidence: 'high' as const,
              safeDetails: { toolId: 'direnv', sourceLine: 'eval "$(direnv hook zsh)"' },
            },
```

Use fixture reports rather than real scans. Extend this fixture with selected direct/dependency/manual/unknown tool facts for provenance line assertions.

**Config-first summary assertion pattern** (`tests/integration/config-first.test.ts` lines 163-193):

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
  expect(inventoryBlock).toContain('Dotfiles:');
  expect(inventoryBlock).toContain('Dotfile findings: 1 known hooks, 2 unknown rc findings');
  expect(inventoryBlock).toContain('Warnings:');
  expect(inventoryBlock).toContain('Warning: Homebrew direct/dependency status is unavailable.');
  expect(inventoryBlock).not.toContain('ripgrep');
  expect(inventoryBlock).not.toContain('alias gs=');
  expect(inventoryBlock).not.toContain('eval "$(direnv hook zsh)"');
  expect(inventoryBlock).not.toContain('~/.private-aliases');
});
```

Add assertions for one shared `Provenance:` line before `Configuration Summary`. Keep negative assertions that raw rc details and unmatched Homebrew names do not leak.

**Wizard summary assertion pattern** (`tests/integration/wizard-flow.test.tsx` lines 362-413):

```typescript
it('inventory wizard step uses inventory label and summarizes known installed tools', async () => {
  const { Wizard } = await import('../../src/modes/wizard.js');

  const { lastFrame } = render(
    React.createElement(Wizard, {
      initialStep: 1,
      inventory: createInventoryFixture(),
    } as React.ComponentProps<typeof Wizard> & { inventory: InventoryReport })
  );

  await new Promise(resolve => setTimeout(resolve, 100));
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Inventory');
  expect(frame).not.toContain('Environment Capture');
  expect(frame).toContain('Inventory scan complete');
  expect(frame).toContain('Known installed tools:');
  expect(frame).toContain('Dotfiles:');
});

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
```

Use the same provenance formatter in wizard inventory, but remember early wizard has no final config. Assert evidence-based groups there, and put `tilde-managed` selected assertions in config-first or final wizard confirmation where a config is available.

## Shared Patterns

### ESM Imports

**Source:** `src/inventory/provenance.ts`, `src/modes/config-first.tsx`  
**Apply to:** all new/modified TypeScript files

Use relative imports with `.js` extensions and `import type` for type-only imports.

### Evidence-First Classification

**Source:** `src/inventory/report.ts`, `src/inventory/scan.ts`  
**Apply to:** `src/inventory/provenance.ts`, unit tests

Classify from `InventoryToolFact.evidence`, `InventoryToolFact.installed`, metadata install fields, and optional `TildeConfig`. Do not inspect the machine or call `brew`, `gh`, `op`, `vfox`, or `defaultbrowser` from provenance code.

### Selected Config Precedence

**Source:** Phase 04 context and current `src/inventory/provenance.ts` selected branch  
**Apply to:** `deriveInventoryProvenance()`

Selected ids from `packageManagers`, `versionManagers[].name`, `tools`, browser selections/default, editors, and `aiTools[].name` take primary `tilde-managed` precedence. Preserve direct/dependency/manual/app evidence in `detail` and `action`.

### Concise Terminal Output

**Source:** `src/inventory/summary.ts`, `src/steps/inventory.tsx`, `src/modes/config-first.tsx`  
**Apply to:** UI rendering paths and integration tests

All normal rendering should go through `summarizeInventory(report, config?)` and produce one grouped `Provenance:` line with counts, up to 3 examples per group, and `+N more`.

### Test Isolation

**Source:** `tests/unit/inventory-scanner.test.ts`, `tests/integration/config-first.test.ts`, `tests/integration/wizard-flow.test.tsx`  
**Apply to:** new provenance tests

Use Vitest, direct fixtures, `vi.mock`, and `ink-testing-library`. External command behavior stays mocked or bypassed through fixture reports.

## No Analog Found

All identified files have close analogs in the existing codebase.

## Metadata

**Analog search scope:** `src/inventory/`, `src/modes/`, `src/steps/`, `src/tools/`, `tests/unit/`, `tests/integration/`  
**Files scanned:** 14 targeted files from phase context and research  
**Pattern extraction date:** 2026-06-20
